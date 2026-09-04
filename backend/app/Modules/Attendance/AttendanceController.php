<?php

namespace App\Modules\Attendance;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Event;
use App\Models\Registration;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request, string $eventId): JsonResponse
    {
        Event::findOrFail($eventId);

        $query = Registration::where('event_id', $eventId)
            ->whereIn('status', ['confirmed', 'approved'])
            ->with(['participant', 'attendance', 'checkins']);

        if ($request->filled('status')) {
            $query->where('attendance_status', $request->input('status'));
        }

        $perPage = (int) $request->input('per_page', 25);
        $records = $query->orderBy('registered_at', 'asc')->paginate($perPage);

        return response()->json($records);
    }

    public function markAttendance(Request $request, string $eventId): JsonResponse
    {
        $validated = $request->validate([
            'registration_id' => 'required|uuid',
            'status' => 'required|string|in:not_checked_in,checked_in,attended,no_show',
            'notes' => 'nullable|string',
        ]);

        $registration = Registration::where('id', $validated['registration_id'])
            ->where('event_id', $eventId)
            ->firstOrFail();

        $oldStatus = $registration->attendance_status;

        $registration->update([
            'attendance_status' => $validated['status'],
        ]);

        Attendance::updateOrCreate(
            ['registration_id' => $registration->id],
            [
                'event_id' => $eventId,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
                'updated_by_user_id' => $request->user()?->id,
            ]
        );

        AuditService::log(
            action: 'attendance_status_updated',
            entityType: 'Attendance',
            entityId: (string) $registration->id,
            eventId: $eventId,
            previousValue: ['status' => $oldStatus],
            newValue: ['status' => $validated['status'], 'notes' => $validated['notes'] ?? null]
        );

        return response()->json([
            'message' => 'Attendance status updated successfully.',
            'registration' => $registration->fresh(['participant', 'attendance']),
        ]);
    }
}
