<?php

namespace App\Modules\Search;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Participant;
use App\Models\Registration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Global admin search. Results are always scoped to what the caller may see:
 * org-wide roles search everything; everyone else only their assigned events
 * and the registrations / participants inside them.
 */
class SearchController extends Controller
{
    private const PER_GROUP = 8;

    public function __invoke(Request $request): JsonResponse
    {
        $q = trim((string) $request->input('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['events' => [], 'registrations' => [], 'participants' => []]);
        }

        $user = $request->user();
        $orgWide = $user->isEventAdmin();
        $eventIds = $orgWide ? null : $user->eventStaff()->pluck('event_id');
        $orgId = $user->scopedOrgId();

        $like = "%{$q}%";

        // Events
        $events = Event::query()
            ->when($orgId !== null, fn ($b) => $b->where('organization_id', $orgId))
            ->when(! $orgWide, fn ($b) => $b->whereIn('id', $eventIds))
            ->where(fn ($b) => $b->where('title', 'like', $like)
                ->orWhere('event_code', 'like', $like)
                ->orWhere('venue_name', 'like', $like))
            ->orderByDesc('start_at')
            ->limit(self::PER_GROUP)
            ->get(['id', 'title', 'slug', 'event_code', 'status', 'start_at']);

        // Registrations
        $registrations = Registration::query()
            ->when($orgId !== null, fn ($b) => $b->whereHas('event', fn ($e) => $e->where('organization_id', $orgId)))
            ->when(! $orgWide, fn ($b) => $b->whereIn('event_id', $eventIds))
            ->where(fn ($b) => $b->where('registration_number', 'like', $like)
                ->orWhereHas('participant', fn ($p) => $p->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('employee_id', 'like', $like)))
            ->with(['participant:id,name,email', 'event:id,title,slug'])
            ->orderByDesc('registered_at')
            ->limit(self::PER_GROUP)
            ->get(['id', 'event_id', 'participant_id', 'registration_number', 'status']);

        // Participants — org-wide within the organization; scoped roles only those
        // with a registration in an allowed event.
        $participants = Participant::query()
            ->when($orgId !== null, fn ($b) => $b->whereHas('registrations.event', fn ($e) => $e->where('organization_id', $orgId)))
            ->when(! $orgWide, fn ($b) => $b->whereHas('registrations', fn ($r) => $r->whereIn('event_id', $eventIds)))
            ->where(fn ($b) => $b->where('name', 'like', $like)
                ->orWhere('email', 'like', $like)
                ->orWhere('phone', 'like', $like)
                ->orWhere('employee_id', 'like', $like))
            ->withCount('registrations')
            ->orderBy('name')
            ->limit(self::PER_GROUP)
            ->get(['id', 'name', 'email', 'employee_id', 'department']);

        return response()->json([
            'events' => $events,
            'registrations' => $registrations,
            'participants' => $participants,
        ]);
    }
}
