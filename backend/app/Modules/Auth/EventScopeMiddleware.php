<?php

namespace App\Modules\Auth;

use App\Models\Event;
use App\Models\Registration;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Per-event authorization. The `role:` middleware already decided the caller
 * holds the right *kind* of role for the action; this decides whether they may
 * apply it to *this* event.
 *
 *  - super_admin                → every event.
 *  - event_admin                → every event in their own organization.
 *  - everyone else              → only events they hold an event_staff row for
 *                                 (and, if org-bound, in their organization).
 *
 * The event is resolved from whichever route parameter is present
 * (`eventId`, `registrationId`, or `id` on an events/registrations route).
 * When no event can be resolved (listing routes, bad id) the request passes
 * through untouched and the controller handles it (e.g. a 404).
 */
class EventScopeMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $eventId = $this->resolveEventId($request);

        if ($eventId === null) {
            return $next($request);
        }

        // Organization confinement — applies to everyone except super_admin.
        $orgId = $user->scopedOrgId();
        if ($orgId !== null && Event::whereKey($eventId)->value('organization_id') !== $orgId) {
            return response()->json(['message' => 'You do not have access to this event.'], 403);
        }

        // event_admin: any event in their org (already checked above).
        if ($user->isEventAdmin()) {
            return $next($request);
        }

        if (! $user->canManageEvent($eventId)) {
            return response()->json([
                'message' => 'You do not have access to this event.',
            ], 403);
        }

        return $next($request);
    }

    private function resolveEventId(Request $request): ?string
    {
        $route = $request->route();
        if (! $route) {
            return null;
        }

        if ($eventId = $route->parameter('eventId')) {
            return $this->eventIdFromKey($eventId);
        }

        if ($registrationId = $route->parameter('registrationId')) {
            return Registration::whereKey($registrationId)->value('event_id');
        }

        if ($id = $route->parameter('id')) {
            if (str_contains((string) $route->uri(), 'registrations/{id}')) {
                return Registration::whereKey($id)->value('event_id');
            }

            return $this->eventIdFromKey($id);
        }

        return null;
    }

    /** Route keys for events may be the UUID or the slug. */
    private function eventIdFromKey(string $key): ?string
    {
        return Event::query()
            ->where('id', $key)
            ->orWhere('slug', $key)
            ->value('id');
    }
}
