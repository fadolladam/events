<?php

namespace App\Modules\CheckIn;

use App\Http\Controllers\Controller;
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

        return response()->json($result);
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
            'registration' => $registration,
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

        return response()->json($results);
    }

    public function recentCheckins(string $eventId): JsonResponse
    {
        $checkins = Checkin::where('event_id', $eventId)
            ->with(['registration.participant', 'checkedInBy'])
            ->orderBy('checked_in_at', 'desc')
            ->limit(30)
            ->get();

        return response()->json($checkins);
    }
}
