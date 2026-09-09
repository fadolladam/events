<?php

namespace App\Modules\Events;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventStaff;
use App\Models\User;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Per-event team. The assignments here are what EventScopeMiddleware checks:
 * a non-org-wide user only reaches an event they hold a row for.
 */
class EventStaffController extends Controller
{
    private const ROLES = ['owner', 'manager', 'organizer', 'registration_officer', 'checkin_staff', 'viewer'];

    public function index(string $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);

        $rows = EventStaff::where('event_id', $event->id)
            ->with('user:id,name,email,role')
            ->get(['id', 'event_id', 'user_id', 'role']);

        return response()->json($rows);
    }

    /** Replace the whole team in one call. */
    public function sync(Request $request, string $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);

        $validated = $request->validate([
            'staff' => 'present|array',
            'staff.*.user_id' => 'required|integer|exists:users,id',
            'staff.*.role' => 'required|string|in:'.implode(',', self::ROLES),
        ]);

        // De-dupe on user_id (last role wins).
        $wanted = collect($validated['staff'])
            ->keyBy('user_id')
            ->map(fn ($r) => $r['role']);

        // Only staff-eligible users (never a participant).
        $eligible = User::whereIn('id', $wanted->keys())
            ->where('role', '!=', 'participant')
            ->pluck('id');
        $wanted = $wanted->only($eligible->all());

        EventStaff::where('event_id', $event->id)->whereNotIn('user_id', $wanted->keys())->delete();
        foreach ($wanted as $userId => $role) {
            EventStaff::updateOrCreate(
                ['event_id' => $event->id, 'user_id' => $userId],
                ['role' => $role],
            );
        }

        AuditService::log(
            action: 'event_staff_updated',
            entityType: 'Event',
            entityId: (string) $event->id,
            eventId: $event->id,
            newValue: ['count' => $wanted->count()],
        );

        return $this->index($event->id);
    }
}
