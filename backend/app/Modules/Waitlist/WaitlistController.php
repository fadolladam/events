<?php

namespace App\Modules\Waitlist;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Registration;
use App\Models\WaitlistHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaitlistController extends Controller
{
    public function __construct(
        protected WaitlistService $waitlistService
    ) {}

    public function indexForEvent(Request $request, string $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);

        $waitlisted = Registration::where('event_id', $event->id)
            ->where('status', 'waitlisted')
            ->with(['participant', 'answers'])
            ->orderBy('waitlist_priority', 'desc')
            ->orderBy('waitlisted_at', 'asc')
            ->orderBy('registration_sequence', 'asc')
            ->get();

        $ranked = $waitlisted->map(function ($reg, $index) {
            $reg->queue_position = $index + 1;
            return $reg;
        });

        return response()->json($ranked);
    }

    public function history(string $eventId): JsonResponse
    {
        $history = WaitlistHistory::where('event_id', $eventId)
            ->with(['registration.participant'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($history);
    }

    public function promoteManual(string $eventId): JsonResponse
    {
        $promoted = $this->waitlistService->promoteWaitlistedParticipants($eventId);

        return response()->json([
            'message' => count($promoted) . ' participant(s) promoted successfully.',
            'promoted' => $promoted,
        ]);
    }

    public function updatePriority(Request $request, string $registrationId): JsonResponse
    {
        $validated = $request->validate([
            'priority' => 'required|integer',
            'reason' => 'nullable|string',
        ]);

        $updated = $this->waitlistService->updatePriority(
            $registrationId,
            $validated['priority'],
            $validated['reason'] ?? null
        );

        return response()->json($updated);
    }
}
