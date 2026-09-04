<?php

namespace App\Modules\Reports;

use App\Models\Checkin;
use App\Models\Event;
use App\Models\Participant;
use App\Models\Registration;
use Barryvdh\DomPDF\Facade\Pdf;
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

        $availableCapacity = max(0, $event->capacity - $confirmed);
        $attendanceRate = $confirmed > 0 ? round(($checkedIn / $confirmed) * 100, 1) : 0;
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

        return [
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
