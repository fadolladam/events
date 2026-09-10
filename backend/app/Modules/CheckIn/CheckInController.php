<?php

namespace App\Modules\CheckIn;

use App\Http\Controllers\Controller;
use App\Http\Resources\ParticipantResource;
use App\Http\Resources\RegistrationResource;
use App\Models\Checkin;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckInController extends Controller
{
    public function __construct(
        protected CheckInService $checkInService
    ) {}

    public function scan(Request $request, string $eventId): JsonResponse
    {
        Event::findOrFail($eventId);

        $validated = $request->validate([
            'qr_data' => 'required|string',
        ]);

        $result = $this->checkInService->scanQr($eventId, $validated['qr_data']);

        // The ticket carries its own eager-loaded registration.participant
        // (same rows RegistrationResource already serializes below, least-
        // privilege). Drop that copy so it isn't re-exposed raw underneath
        // 'ticket' in the response.
        $ticket = $result['ticket'];
        if ($ticket->relationLoaded('registration')) {
            $ticket->unsetRelation('registration');
        }

        return response()->json([
            'ticket' => $ticket,
            'registration' => new RegistrationResource($result['registration']),
            'participant' => new ParticipantResource($result['participant']),
            'already_checked_in' => $result['already_checked_in'],
            'last_checkin' => $result['last_checkin'],
        ]);
    }

    public function process(Request $request, string $eventId): JsonResponse
    {
        Event::findOrFail($eventId);

        $validated = $request->validate([
            'registration_id' => 'required|uuid',
            'type' => 'nullable|string|in:qr_scan,manual_search',
            'gate' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $checkin = $this->checkInService->performCheckIn(
            $validated['registration_id'],
            $eventId,
            $request->user()?->id,
            $validated['type'] ?? 'qr_scan',
            $validated['gate'] ?? null,
            $validated['notes'] ?? null
        );

        return response()->json([
            'message' => 'Check-in successful!',
            'checkin' => $checkin,
        ]);
    }

    public function undo(Request $request, string $eventId): JsonResponse
    {
        Event::findOrFail($eventId);

        $validated = $request->validate([
            'registration_id' => 'required|uuid',
            'reason' => 'nullable|string',
        ]);

        $registration = $this->checkInService->undoCheckIn(
            $validated['registration_id'],
            $request->user()?->id,
            $validated['reason'] ?? 'Manual undo by staff'
        );

        return response()->json([
            'message' => 'Check-in undone successfully.',
            'registration' => new RegistrationResource($registration),
        ]);
    }

    public function search(Request $request, string $eventId): JsonResponse
    {
        Event::findOrFail($eventId);

        $keyword = $request->input('q', '');
        if (strlen(trim($keyword)) < 1) {
            return response()->json([]);
        }

        $results = $this->checkInService->searchForCheckIn($eventId, $keyword);

        return response()->json(RegistrationResource::collection($results));
    }

    public function recentCheckins(string $eventId): JsonResponse
    {
        $checkins = Checkin::where('event_id', $eventId)
            ->with(['registration.participant', 'checkedInBy'])
            ->orderBy('checked_in_at', 'desc')
            ->limit(30)
            ->get()
            ->map(fn (Checkin $checkin) => [
                'id' => $checkin->id,
                'registration_id' => $checkin->registration_id,
                'event_id' => $checkin->event_id,
                'checkin_type' => $checkin->checkin_type,
                'gate' => $checkin->gate,
                'notes' => $checkin->notes,
                'checked_in_at' => $checkin->checked_in_at,
                'checked_in_by' => $checkin->checkedInBy,
                'registration' => $checkin->relationLoaded('registration')
                    ? new RegistrationResource($checkin->registration)
                    : null,
            ]);

        return response()->json($checkins);
    }
}
