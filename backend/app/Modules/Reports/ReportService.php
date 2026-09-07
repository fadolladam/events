<?php

namespace App\Modules\Reports;

use App\Models\AuditLog;
use App\Models\Checkin;
use App\Models\Event;
use App\Models\NotificationLog;
use App\Models\Participant;
use App\Models\Registration;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportService
{
    public function getGlobalDashboardStats(): array
    {
        $totalEvents = Event::count();
        $totalParticipants = Participant::count();
        $totalRegistrations = Registration::count();
        $confirmedCount = Registration::where('status', 'confirmed')->count();
        $waitlistedCount = Registration::where('status', 'waitlisted')->count();
        $checkedInCount = Registration::where('attendance_status', 'checked_in')->count();

        $upcomingEvents = Event::where('start_at', '>', now())->where('status', '!=', 'cancelled')->count();
        $openEvents = Event::where('status', 'registration_open')->count();
        $ongoingEvents = Event::where('status', 'ongoing')->count();
        $completedEvents = Event::where('status', 'completed')->count();

        $recentEvents = Event::with('category')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($event) {
                $event->confirmed_count = $event->confirmedRegistrations()->count();
                $event->waitlist_count = $event->waitlistedRegistrations()->count();
                $event->checked_in_count = $event->checkins()->count();
                return $event;
            });

        $recentRegistrations = Registration::with(['event', 'participant'])
            ->orderBy('registered_at', 'desc')
            ->limit(10)
            ->get();

        return [
            'total_events' => $totalEvents,
            'upcoming_events' => $upcomingEvents,
            'open_events' => $openEvents,
            'ongoing_events' => $ongoingEvents,
            'completed_events' => $completedEvents,
            'total_participants' => $totalParticipants,
            'total_registrations' => $totalRegistrations,
            'total_confirmed' => $confirmedCount,
            'total_waitlisted' => $waitlistedCount,
            'total_checked_in' => $checkedInCount,
            'overall_attendance_rate' => $confirmedCount > 0 ? round(($checkedInCount / $confirmedCount) * 100, 1) : 0,
            'recent_events' => $recentEvents,
            'recent_registrations' => $recentRegistrations,
        ];
    }

    public function getEventAnalytics(string $eventId): array
    {
        $event = Event::findOrFail($eventId);

        $confirmed = Registration::where('event_id', $eventId)->where('status', 'confirmed')->count();
        $pending = Registration::where('event_id', $eventId)->where('status', 'pending')->count();
        $waitlisted = Registration::where('event_id', $eventId)->where('status', 'waitlisted')->count();
        $cancelled = Registration::where('event_id', $eventId)->where('status', 'cancelled')->count();
        $rejected = Registration::where('event_id', $eventId)->where('status', 'rejected')->count();
        $checkedIn = Registration::where('event_id', $eventId)->where('attendance_status', 'checked_in')->count();
        $noShow = Registration::where('event_id', $eventId)->where('attendance_status', 'no_show')->count();

        $attended = Registration::where('event_id', $eventId)->where('attendance_status', 'attended')->count();
        $notCheckedIn = Registration::where('event_id', $eventId)
            ->where('status', 'confirmed')
            ->where('attendance_status', 'not_checked_in')
            ->count();
        $present = $checkedIn + $attended;

        $availableCapacity = max(0, $event->capacity - $confirmed);
        $attendanceRate = $confirmed > 0 ? round(($present / $confirmed) * 100, 1) : 0;
        $capacityUtilization = $event->capacity > 0 ? round(($confirmed / $event->capacity) * 100, 1) : 0;

        // Registrations grouped by date
        $registrationsByDate = Registration::where('event_id', $eventId)
            ->select(DB::raw('DATE(registered_at) as date'), DB::raw('count(*) as count'))
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get();

        // Registration sources breakdown
        $sources = Registration::where('event_id', $eventId)
            ->select('source', DB::raw('count(*) as count'))
            ->groupBy('source')
            ->get();

        return array_merge([
            'event' => $event,
            'capacity' => $event->capacity,
            'confirmed' => $confirmed,
            'pending' => $pending,
            'waitlisted' => $waitlisted,
            'cancelled' => $cancelled,
            'rejected' => $rejected,
            'checked_in' => $checkedIn,
            'no_show' => $noShow,
            'available_capacity' => $availableCapacity,
            'attendance_rate' => $attendanceRate,
            'capacity_utilization' => $capacityUtilization,
            'registrations_by_date' => $registrationsByDate,
            'sources' => $sources,
        ], $this->eventOperationsDetail($event, [
            'confirmed' => $confirmed,
            'waitlisted' => $waitlisted,
            'checked_in' => $checkedIn,
            'attended' => $attended,
            'not_checked_in' => $notCheckedIn,
            'no_show' => $noShow,
            'present' => $present,
            'attendance_rate' => $attendanceRate,
        ]));
    }

    /**
     * Operational detail blocks for the per-event dashboard (form readiness,
     * queue head, attendance, notifications, activity, status-split trend).
     * Additive — the legacy keys above are untouched.
     */
    private function eventOperationsDetail(Event $event, array $c): array
    {
        $now = now();
        $eventId = $event->id;

        // ---- registration state ---------------------------------------------
        $dynamicStatus = $event->calculateDynamicStatus($c['confirmed'], $c['waitlisted']);
        if (in_array($dynamicStatus, ['registration_closed', 'completed', 'cancelled', 'archived', 'full'], true)) {
            $registrationState = 'closed';
        } elseif ($event->registration_close_at && $event->registration_close_at->isBetween($now, $now->copy()->addDay())) {
            $registrationState = 'closing_soon';
        } else {
            $registrationState = 'open';
        }

        // ---- form summary (read-only; uses the event's own form relation) ---
        $form = $event->form()->with('fields')->first();
        $activeFields = $form ? $form->fields->where('is_hidden', false) : collect();
        $formSummary = [
            'status' => $form ? ($activeFields->isEmpty() ? 'empty' : 'ready') : 'missing',
            'active_fields' => $activeFields->count(),
            'required_fields' => $activeFields->where('is_required', true)->count(),
            'optional_fields' => $activeFields->where('is_required', false)->count(),
            'updated_at' => $form?->updated_at?->toIso8601String(),
        ];

        // ---- queue summary -------------------------------------------------
        $queueHead = Registration::where('event_id', $eventId)
            ->where('status', 'waitlisted')
            ->with('participant:id,name')
            ->orderBy('waitlist_priority', 'desc')
            ->orderBy('waitlisted_at', 'asc')
            ->orderBy('registration_sequence', 'asc')
            ->limit(5)
            ->get();

        $promotedToday = Registration::where('event_id', $eventId)
            ->whereNotNull('promoted_at')
            ->where('promoted_at', '>=', $now->copy()->startOfDay())
            ->count();

        $queueSummary = [
            'count' => $c['waitlisted'],
            'oldest_wait_at' => optional($queueHead->first())->waitlisted_at?->toIso8601String(),
            'promoted_today' => $promotedToday,
            'head_registration' => $queueHead->first() ? [
                'registration_number' => $queueHead->first()->registration_number,
                'participant' => $queueHead->first()->participant?->name,
                'waitlisted_at' => $queueHead->first()->waitlisted_at?->toIso8601String(),
            ] : null,
            'first_five' => $queueHead->values()->map(fn ($reg, $i) => [
                'position' => $i + 1,
                'registration_number' => $reg->registration_number,
                'participant' => $reg->participant?->name,
                'waitlisted_at' => $reg->waitlisted_at?->toIso8601String(),
            ])->all(),
        ];

        // ---- attendance ---------------------------------------------------
        $lastCheckIn = Checkin::where('event_id', $eventId)->max('checked_in_at');
        $attendance = [
            'confirmed' => $c['confirmed'],
            'checked_in' => $c['checked_in'],
            'attended' => $c['attended'],
            'not_checked_in' => $c['not_checked_in'],
            'no_show' => $c['no_show'],
            'present' => $c['present'],
            'attendance_rate' => $c['attendance_rate'],
            'last_check_in_at' => $lastCheckIn ? Carbon::parse($lastCheckIn)->toIso8601String() : null,
        ];

        // ---- notifications (send path is NOTIF-1; currently all zero) ------
        $notifCounts = NotificationLog::where('event_id', $eventId)
            ->selectRaw('status, count(*) c')
            ->groupBy('status')
            ->pluck('c', 'status');
        $notifications = [
            'sent' => (int) ($notifCounts['sent'] ?? 0),
            'scheduled' => 0,
            'pending' => (int) ($notifCounts['queued'] ?? 0),
            'failed' => (int) ($notifCounts['failed'] ?? 0),
            'last_at' => optional(NotificationLog::where('event_id', $eventId)->max('created_at'), fn ($v) => Carbon::parse($v)->toIso8601String()),
        ];

        // ---- activity feed ----------------------------------------------
        $activity = AuditLog::where('event_id', $eventId)
            ->orderByDesc('created_at')
            ->limit(15)
            ->get()
            ->map(fn ($log) => [
                'created_at' => $log->created_at?->toIso8601String(),
                'actor' => $log->user_name ?? 'System',
                'action' => $log->action,
                'summary' => ucfirst(str_replace('_', ' ', $log->action)),
            ])
            ->all();

        // ---- status-split trend --------------------------------------------
        $trendRaw = Registration::where('event_id', $eventId)
            ->selectRaw('DATE(registered_at) d, status, count(*) c')
            ->groupBy('d', 'status')
            ->get();
        $trendByDate = [];
        foreach ($trendRaw as $g) {
            $trendByDate[$g->d] ??= ['total' => 0, 'confirmed' => 0, 'waitlisted' => 0, 'cancelled' => 0];
            $trendByDate[$g->d]['total'] += $g->c;
            if (isset($trendByDate[$g->d][$g->status])) {
                $trendByDate[$g->d][$g->status] += $g->c;
            }
        }
        ksort($trendByDate);
        $trend = [];
        foreach ($trendByDate as $date => $vals) {
            $trend[] = array_merge(['date' => $date], $vals);
        }

        return [
            'dynamic_status' => $dynamicStatus,
            'registration_state' => $registrationState,
            'registration_close_at' => $event->registration_close_at?->toIso8601String(),
            'form_summary' => $formSummary,
            'queue_summary' => $queueSummary,
            'attendance' => $attendance,
            'notifications' => $notifications,
            'activity' => $activity,
            'trend' => $trend,
        ];
    }

    public function exportCsv(string $eventId): StreamedResponse
    {
        $event = Event::findOrFail($eventId);
        $filename = 'RHB_Events_' . $event->event_code . '_Attendees_' . date('Ymd_His') . '.csv';

        $registrations = Registration::where('event_id', $eventId)
            ->with(['participant', 'answers'])
            ->orderBy('registration_sequence', 'asc')
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        return new StreamedResponse(function () use ($registrations) {
            $handle = fopen('php://output', 'w');
            
            // Header row
            fputcsv($handle, [
                'Registration Number',
                'Participant Name',
                'Email',
                'Phone',
                'Status',
                'Attendance Status',
                'Queue Position',
                'Registered At',
                'Confirmed At',
                'Checked In At',
            ]);

            foreach ($registrations as $reg) {
                fputcsv($handle, [
                    $reg->registration_number,
                    $reg->participant->name,
                    $reg->participant->email,
                    $reg->participant->phone ?? '',
                    strtoupper($reg->status),
                    strtoupper(str_replace('_', ' ', $reg->attendance_status)),
                    $reg->status === 'waitlisted' ? $reg->getQueuePosition() : '',
                    $reg->registered_at ? $reg->registered_at->format('Y-m-d H:i:s') : '',
                    $reg->confirmed_at ? $reg->confirmed_at->format('Y-m-d H:i:s') : '',
                    $reg->checked_in_at ? $reg->checked_in_at->format('Y-m-d H:i:s') : '',
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }

    public function exportPdfReport(string $eventId): \Illuminate\Http\Response
    {
        $event = Event::findOrFail($eventId);
        $analytics = $this->getEventAnalytics($eventId);
        $registrations = Registration::where('event_id', $eventId)
            ->with('participant')
            ->orderBy('registration_sequence', 'asc')
            ->limit(100)
            ->get();

        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <title>Event Summary: {$event->title}</title>
            <style>
                body { font-family: sans-serif; color: #1e293b; line-height: 1.5; padding: 20px; }
                h1 { color: #0f172a; margin-bottom: 4px; }
                .subtitle { color: #64748b; font-size: 14px; margin-bottom: 20px; }
                .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                .kpi-table td { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: center; }
                .kpi-val { font-size: 20px; font-weight: bold; color: #0f172a; }
                .kpi-lbl { font-size: 11px; text-transform: uppercase; color: #64748b; margin-top: 4px; }
                .table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
                .table th { background: #0f172a; color: #ffffff; text-align: left; padding: 8px; }
                .table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            </style>
        </head>
        <body>
            <h1>{$event->title} ({$event->event_code})</h1>
            <div class='subtitle'>Generated on " . date('d M Y, H:i') . " | Status: " . strtoupper($event->calculateDynamicStatus()) . "</div>

            <table class='kpi-table'>
                <tr>
                    <td><div class='kpi-val'>{$event->capacity}</div><div class='kpi-lbl'>Capacity</div></td>
                    <td><div class='kpi-val'>{$analytics['confirmed']}</div><div class='kpi-lbl'>Confirmed</div></td>
                    <td><div class='kpi-val'>{$analytics['waitlisted']}</div><div class='kpi-lbl'>Waitlist</div></td>
                    <td><div class='kpi-val'>{$analytics['checked_in']}</div><div class='kpi-lbl'>Checked In</div></td>
                    <td><div class='kpi-val'>{$analytics['attendance_rate']}%</div><div class='kpi-lbl'>Attendance Rate</div></td>
                </tr>
            </table>

            <h3>Attendee Summary (Top Registrations)</h3>
            <table class='table'>
                <thead>
                    <tr>
                        <th>Reg #</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Attendance</th>
                    </tr>
                </thead>
                <tbody>";

        foreach ($registrations as $r) {
            $html .= "
                    <tr>
                        <td>{$r->registration_number}</td>
                        <td>{$r->participant->name}</td>
                        <td>{$r->participant->email}</td>
                        <td>" . strtoupper($r->status) . "</td>
                        <td>" . strtoupper(str_replace('_', ' ', $r->attendance_status)) . "</td>
                    </tr>";
        }

        $html .= "
                </tbody>
            </table>
        </body>
        </html>";

        $pdf = Pdf::loadHTML($html);
        return $pdf->download("RHB_Events_{$event->event_code}_Summary.pdf");
    }
}
