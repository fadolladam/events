<?php

namespace App\Modules\Reports;

use App\Models\AuditLog;
use App\Models\Checkin;
use App\Models\Event;
use App\Models\NotificationLog;
use App\Models\Participant;
use App\Models\Registration;
use App\Models\RegistrationAnswer;
use App\Modules\Registration\RegistrationFilters;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportService
{
    public function getGlobalDashboardStats(): array
    {
        // Organization confinement — null for super_admin / unscoped accounts.
        $orgId = auth()->user()?->scopedOrgId();
        $eventQ = fn () => Event::query()->when($orgId !== null, fn ($q) => $q->where('organization_id', $orgId));
        $regQ = fn () => Registration::query()->when($orgId !== null, fn ($q) => $q->whereHas('event', fn ($e) => $e->where('organization_id', $orgId)));

        $totalEvents = $eventQ()->count();
        $totalParticipants = $orgId !== null
            ? Participant::whereHas('registrations.event', fn ($e) => $e->where('organization_id', $orgId))->count()
            : Participant::count();
        $totalRegistrations = $regQ()->count();
        $confirmedCount = $regQ()->where('status', 'confirmed')->count();
        $waitlistedCount = $regQ()->where('status', 'waitlisted')->count();
        $checkedInCount = $regQ()->where('attendance_status', 'checked_in')->count();

        $upcomingEvents = $eventQ()->where('start_at', '>', now())->where('status', '!=', 'cancelled')->count();
        $openEvents = $eventQ()->where('status', 'registration_open')->count();
        $ongoingEvents = $eventQ()->where('status', 'ongoing')->count();
        $completedEvents = $eventQ()->where('status', 'completed')->count();

        $recentEvents = $eventQ()->with('category')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($event) {
                $event->confirmed_count = $event->confirmedRegistrations()->count();
                $event->waitlist_count = $event->waitlistedRegistrations()->count();
                $event->checked_in_count = $event->checkins()->count();

                return $event;
            });

        $recentRegistrations = $regQ()->with(['event', 'participant'])
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

    /**
     * Per-option counts for every choice field on the event's form, over
     * non-cancelled registrations. Feeds the "Form Answers" report.
     *
     * @return array<int, array{field_key:string, label:string, type:string, options:array<int, array{value:string, count:int}>}>
     */
    private function formAnswerSummary(Event $event): array
    {
        $form = $event->form()->with('fields')->first();
        if (! $form) {
            return [];
        }

        $choiceFields = $form->fields
            ->whereIn('type', ['select', 'radio', 'checkbox', 'multi_select'])
            ->where('is_hidden', false);

        if ($choiceFields->isEmpty()) {
            return [];
        }

        $liveRegIds = Registration::where('event_id', $event->id)
            ->whereNotIn('status', ['cancelled', 'rejected'])
            ->pluck('id');

        $out = [];
        foreach ($choiceFields as $field) {
            $answers = RegistrationAnswer::whereIn('registration_id', $liveRegIds)
                ->where('field_key', $field->field_key)
                ->get(['value_text', 'value_json']);

            $counts = [];
            foreach ((array) $field->options as $opt) {
                $counts[$opt] = 0;
            }
            foreach ($answers as $a) {
                $vals = is_array($a->value_json) ? $a->value_json : [$a->value_text];
                foreach (array_filter($vals, fn ($v) => $v !== null && $v !== '') as $v) {
                    $counts[$v] = ($counts[$v] ?? 0) + 1;
                }
            }

            $out[] = [
                'field_key' => $field->field_key,
                'label' => $field->label,
                'type' => $field->type,
                'options' => collect($counts)->map(fn ($c, $v) => ['value' => (string) $v, 'count' => $c])->values()->all(),
            ];
        }

        return $out;
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

        // Department breakdown (from participants, non-cancelled registrations)
        $departments = Registration::where('event_id', $eventId)
            ->whereNotIn('status', ['cancelled', 'rejected'])
            ->join('participants', 'registrations.participant_id', '=', 'participants.id')
            ->select(DB::raw("COALESCE(NULLIF(participants.department, ''), 'Unspecified') as department"), DB::raw('count(*) as count'))
            ->groupBy('department')
            ->orderByDesc('count')
            ->get();

        // Form-answers summary: option counts for every choice field.
        $answerSummary = $this->formAnswerSummary($event);

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
            'departments' => $departments,
            'answer_summary' => $answerSummary,
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

    public function exportCsv(string $eventId, ?Request $request = null): StreamedResponse
    {
        $request ??= request();
        $event = Event::with('form.fields')->findOrFail($eventId);
        $tz = $event->timezone ?: config('app.timezone');
        $filename = 'RHB_Events_'.$event->event_code.'_Attendees_'.date('Ymd_His').'.csv';

        // One column per non-hidden, non-core form field (in field order).
        $answerFields = $event->form
            ? $event->form->fields
                ->where('is_hidden', false)
                ->whereNotIn('field_key', ['full_name', 'email', 'phone'])
                ->where('type', '!=', 'info')
                ->sortBy('field_order')
                ->values()
            : collect();

        $query = Registration::where('event_id', $eventId)->with(['participant', 'answers']);
        RegistrationFilters::apply($query, $request);
        $registrations = $query->orderBy('registration_sequence', 'asc')->get();

        $fmt = fn ($d) => $d ? Carbon::parse($d)->timezone($tz)->format('Y-m-d H:i:s') : '';

        return new StreamedResponse(function () use ($registrations, $answerFields, $fmt, $tz) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, array_merge([
                'Registration Number', 'Participant Name', 'Email', 'Phone', 'Employee ID', 'Department',
                'Status', 'Attendance Status', 'Queue Position',
                "Registered At ({$tz})", "Confirmed At ({$tz})", "Checked In At ({$tz})",
            ], $answerFields->pluck('label')->all()));

            foreach ($registrations as $reg) {
                $byKey = $reg->answers->keyBy('field_key');
                $row = [
                    $reg->registration_number,
                    $reg->participant->name,
                    $reg->participant->email,
                    $reg->participant->phone ?? '',
                    $reg->participant->employee_id ?? '',
                    $reg->participant->department ?? '',
                    strtoupper($reg->status),
                    strtoupper(str_replace('_', ' ', $reg->attendance_status)),
                    $reg->status === 'waitlisted' ? $reg->getQueuePosition() : '',
                    $fmt($reg->registered_at),
                    $fmt($reg->confirmed_at),
                    $fmt($reg->checked_in_at),
                ];
                foreach ($answerFields as $field) {
                    $a = $byKey->get($field->field_key);
                    $row[] = $a
                        ? (is_array($a->value_json) ? implode(' | ', $a->value_json) : ($a->value_text ?? ''))
                        : '';
                }
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function exportPdfReport(string $eventId, ?Request $request = null): Response
    {
        $request ??= request();
        $event = Event::findOrFail($eventId);
        $tz = $event->timezone ?: config('app.timezone');
        $analytics = $this->getEventAnalytics($eventId);

        $regQuery = Registration::where('event_id', $eventId)->with(['participant', 'answers']);
        RegistrationFilters::apply($regQuery, $request);
        $registrations = $regQuery->orderBy('registration_sequence', 'asc')->limit(500)->get();

        $filterNote = collect($request->only(['status', 'attendance_status', 'checked_in', 'department', 'date_from', 'date_to', 'search']))
            ->filter()
            ->map(fn ($v, $k) => "{$k}={$v}")
            ->implode(', ');

        $deptRows = '';
        foreach ($analytics['departments'] as $d) {
            $deptRows .= "<tr><td>{$d['department']}</td><td style='text-align:right'>{$d['count']}</td></tr>";
        }

        $answerBlocks = '';
        foreach ($analytics['answer_summary'] as $f) {
            $opts = '';
            foreach ($f['options'] as $o) {
                $opts .= "<tr><td>{$o['value']}</td><td style='text-align:right'>{$o['count']}</td></tr>";
            }
            $answerBlocks .= "<h4>{$f['label']}</h4><table class='table'><tbody>{$opts}</tbody></table>";
        }

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
            <div class='subtitle'>Generated ".Carbon::now($tz)->format('d M Y, H:i')." ({$tz}) | Status: ".strtoupper($event->calculateDynamicStatus()).'</div>
            '.($filterNote ? "<div class='subtitle'>Filtered: {$filterNote}</div>" : '')."

            <table class='kpi-table'>
                <tr>
                    <td><div class='kpi-val'>{$event->capacity}</div><div class='kpi-lbl'>Capacity</div></td>
                    <td><div class='kpi-val'>{$analytics['confirmed']}</div><div class='kpi-lbl'>Confirmed</div></td>
                    <td><div class='kpi-val'>{$analytics['waitlisted']}</div><div class='kpi-lbl'>Waitlist</div></td>
                    <td><div class='kpi-val'>{$analytics['checked_in']}</div><div class='kpi-lbl'>Checked In</div></td>
                    <td><div class='kpi-val'>{$analytics['no_show']}</div><div class='kpi-lbl'>No-show</div></td>
                    <td><div class='kpi-val'>{$analytics['attendance_rate']}%</div><div class='kpi-lbl'>Attendance Rate</div></td>
                </tr>
            </table>

            ".($deptRows ? "<h3>Department Breakdown</h3><table class='table'><tbody>{$deptRows}</tbody></table>" : '').'
            '.($answerBlocks ? "<h3>Form Answers</h3>{$answerBlocks}" : '').'

            <h3>Attendee List ('.count($registrations).")</h3>
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
                        <td>".strtoupper($r->status).'</td>
                        <td>'.strtoupper(str_replace('_', ' ', $r->attendance_status)).'</td>
                    </tr>';
        }

        $html .= '
                </tbody>
            </table>
        </body>
        </html>';

        $pdf = Pdf::loadHTML($html);

        return $pdf->download("RHB_Events_{$event->event_code}_Summary.pdf");
    }
}
