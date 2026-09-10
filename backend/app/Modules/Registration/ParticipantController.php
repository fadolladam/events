<?php

namespace App\Modules\Registration;

use App\Http\Controllers\Controller;
use App\Models\Participant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Cross-event participant directory. A participant is one person (deduped by
 * email); this is where staff find someone's whole event history and where the
 * manual-registration form's autocomplete comes from.
 *
 * Not event-scoped by nature — available to the registration-officer tier.
 */
class ParticipantController extends Controller
{
    private function orgScope(Request $request): ?int
    {
        return $request->user()->scopedOrgId();
    }

    public function index(Request $request): JsonResponse
    {
        $query = Participant::query()->withCount('registrations')
            ->when($this->orgScope($request), fn ($q, $org) => $q->whereHas('registrations.event', fn ($e) => $e->where('organization_id', $org)));

        if ($request->filled('search')) {
            $s = trim($request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('employee_id', 'like', "%{$s}%")
                    ->orWhere('department', 'like', "%{$s}%");
            });
        }

        if ($request->filled('department')) {
            $query->where('department', 'like', '%'.$request->input('department').'%');
        }

        if ($request->filled('event_id')) {
            $eventId = $request->input('event_id');
            $query->whereHas('registrations', fn ($q) => $q->where('event_id', $eventId));
        }

        $perPage = min(200, max(1, (int) $request->input('per_page', 25)));

        return response()->json(
            $query->orderBy('name')->paginate($perPage)
        );
    }

    /** Lean payload for type-ahead in the manual-registration form. */
    public function lookup(Request $request): JsonResponse
    {
        $q = trim((string) $request->input('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['data' => []]);
        }

        $rows = Participant::query()
            ->when($this->orgScope($request), fn ($b, $org) => $b->whereHas('registrations.event', fn ($e) => $e->where('organization_id', $org)))
            ->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('employee_id', 'like', "%{$q}%");
            })
            ->orderBy('name')
            ->limit(10)
            ->get(['id', 'name', 'email', 'phone', 'employee_id', 'department']);

        return response()->json(['data' => $rows]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $participant = Participant::withCount('registrations')
            ->when($this->orgScope($request), fn ($b, $org) => $b->whereHas('registrations.event', fn ($e) => $e->where('organization_id', $org)))
            ->findOrFail($id);

        $participant->setRelation(
            'registrations',
            $participant->registrations()
                ->with('event:id,title,slug,event_code,start_at')
                ->orderByDesc('registered_at')
                ->get(['id', 'event_id', 'participant_id', 'registration_number', 'status', 'attendance_status', 'registered_at'])
        );

        return response()->json($participant);
    }
}
