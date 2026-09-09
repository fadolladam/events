<?php

namespace App\Modules\Events;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function __construct(
        protected EventService $eventService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Event::query()->with(['category', 'owner']);

        // Non org-wide roles only see events they are assigned to.
        $user = $request->user();
        if ($user && ! $user->isEventAdmin()) {
            $query->whereIn('id', $user->eventStaff()->pluck('event_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->filled('event_type')) {
            $query->where('event_type', $request->input('event_type'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('event_code', 'like', "%{$search}%")
                    ->orWhere('venue_name', 'like', "%{$search}%")
                    ->orWhere('organizer_name', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 25);
        // Chronological: the event that happens next sits at the top.
        $events = $query->orderBy('start_at', 'asc')->orderBy('end_at', 'asc')->paginate($perPage);

        // Append counts
        $events->getCollection()->transform(function ($event) {
            $event->confirmed_count = $event->confirmedRegistrations()->count();
            $event->waitlist_count = $event->waitlistedRegistrations()->count();
            $event->checked_in_count = $event->checkins()->count();
            $event->dynamic_status = $event->calculateDynamicStatus();

            return $event;
        });

        return response()->json($events);
    }

    public function publicEvents(Request $request): JsonResponse
    {
        $query = Event::query()
            ->whereIn('visibility', ['public', 'hidden_link'])
            ->whereNotIn('status', ['draft', 'archived'])
            ->with(['category']);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('short_description', 'like', "%{$search}%")
                    ->orWhere('venue_name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $events = $query->orderBy('start_at', 'asc')->paginate(12);

        $events->getCollection()->transform(function ($event) {
            $event->confirmed_count = $event->confirmedRegistrations()->count();
            $event->waitlist_count = $event->waitlistedRegistrations()->count();
            $event->dynamic_status = $event->calculateDynamicStatus();

            return $event;
        });

        return response()->json($events);
    }

    public function showPublicBySlug(string $slug): JsonResponse
    {
        $event = Event::where('slug', $slug)
            ->whereNotIn('status', ['draft', 'archived'])
            ->with(['category', 'form.fields'])
            ->firstOrFail();

        $event->confirmed_count = $event->confirmedRegistrations()->count();
        $event->waitlist_count = $event->waitlistedRegistrations()->count();
        $event->dynamic_status = $event->calculateDynamicStatus();

        return response()->json($event);
    }

    public function show(string $id): JsonResponse
    {
        // Accept either the UUID or the URL slug so the admin console can be
        // addressed as /admin/events/{slug}. Slugs are unique (events.slug).
        $event = Event::with(['category', 'owner', 'staff.user', 'form.fields'])
            ->where(fn ($q) => $q->where('id', $id)->orWhere('slug', $id))
            ->firstOrFail();

        $event->confirmed_count = $event->confirmedRegistrations()->count();
        $event->waitlist_count = $event->waitlistedRegistrations()->count();
        $event->pending_count = $event->registrations()->where('status', 'pending')->count();
        $event->checked_in_count = $event->checkins()->count();
        $event->dynamic_status = $event->calculateDynamicStatus();

        // Capacity snapshot for the console (avoids the UI re-deriving it).
        $capacity = (int) $event->capacity;
        $event->available_seats = max(0, $capacity - $event->confirmed_count);
        $event->over_capacity = $event->confirmed_count > $capacity;
        $event->utilisation_pct = $capacity > 0
            ? (int) round(min(100, $event->confirmed_count / $capacity * 100))
            : 0;

        $event->readiness = $this->readiness($event);

        return response()->json($event);
    }

    /**
     * Per-event go-live checklist. Each item is honest — nothing is marked
     * ready when the underlying config is actually missing.
     *
     * @return array{ready_count:int, total:int, items:array<int, array{label:string, ok:bool, hint:string}>}
     */
    private function readiness(Event $event): array
    {
        $hasCheckinStaff = $event->staff()->where('role', 'checkin_staff')->exists()
            || $event->staff()->where('role', 'owner')->exists();
        $formFields = $event->form ? $event->form->fields->where('is_hidden', false)->count() : 0;

        $items = [
            ['label' => 'Event details', 'ok' => filled($event->title) && filled($event->description), 'hint' => 'Add a title and a description.'],
            ['label' => 'Schedule', 'ok' => (bool) ($event->start_at && $event->end_at && $event->end_at->gt($event->start_at)), 'hint' => 'Set a start and end time.'],
            ['label' => 'Registration window', 'ok' => (bool) $event->registration_close_at, 'hint' => 'Set when registration closes.'],
            ['label' => 'Registration form', 'ok' => $formFields > 0, 'hint' => 'Add at least one form field.'],
            ['label' => 'Capacity', 'ok' => (int) $event->capacity > 0, 'hint' => 'Set a capacity above zero.'],
            ['label' => 'Venue / link', 'ok' => filled($event->venue_name) || filled($event->address) || filled($event->meeting_url), 'hint' => 'Add a venue, address, or meeting link.'],
            ['label' => 'Event team', 'ok' => $event->staff()->exists(), 'hint' => 'Assign at least one team member.'],
            ['label' => 'Check-in staff', 'ok' => $hasCheckinStaff, 'hint' => 'Assign someone to run the door.'],
            ['label' => 'Branding', 'ok' => filled($event->cover_image_url), 'hint' => 'Upload a cover image.'],
            ['label' => 'Published', 'ok' => (bool) $event->published_at, 'hint' => 'Move the event out of draft.'],
        ];

        return [
            'ready_count' => count(array_filter($items, fn ($i) => $i['ok'])),
            'total' => count($items),
            'items' => $items,
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'short_title' => 'nullable|string|max:100',
            'event_code' => 'nullable|string|max:20|unique:events,event_code',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string',
            'category_id' => 'nullable|exists:event_categories,id',
            'cover_image_url' => 'nullable|string|max:2048',
            'banner_image_url' => 'nullable|string|max:2048',
            'attachments' => 'nullable|array',
            'attachments.*.label' => 'required_with:attachments|string|max:150',
            'attachments.*.url' => 'required_with:attachments|string|max:2048',
            'event_type' => 'required|string|in:physical,virtual,hybrid',
            'visibility' => 'required|string|in:public,private,invitation_only,internal_only,hidden_link',
            'status' => 'required|string|in:draft,upcoming,registration_open,full,registration_closed,ongoing,completed,cancelled,archived',
            'start_at' => 'required|date',
            'end_at' => 'required|date|after:start_at',
            'timezone' => 'nullable|string',
            'registration_open_at' => 'nullable|date',
            'registration_close_at' => 'nullable|date',
            'capacity' => 'required|integer|min:1',
            'waitlist_enabled' => 'boolean',
            'waitlist_capacity' => 'nullable|integer|min:1',
            'approval_mode' => 'required|string|in:automatic,manual',
            'allow_cancellation' => 'boolean',
            'cancellation_deadline' => 'nullable|date',
            'duplicate_rule' => 'required|string|in:email,phone,employee_id,none',
            'venue_name' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'province' => 'nullable|string',
            'country' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'map_url' => 'nullable|string|max:2048',
            'meeting_url' => 'nullable|url',
            'organizer_name' => 'nullable|string',
            'contact_name' => 'nullable|string',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string',
            'primary_color' => 'nullable|string',
            'secondary_color' => 'nullable|string',
            'terms_and_conditions' => 'nullable|string',
        ]);

        $event = $this->eventService->createEvent($validated, $request->user()?->id);

        return response()->json($event, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $event = Event::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'short_title' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string',
            'category_id' => 'nullable|exists:event_categories,id',
            'cover_image_url' => 'nullable|string|max:2048',
            'banner_image_url' => 'nullable|string|max:2048',
            'attachments' => 'nullable|array',
            'attachments.*.label' => 'required_with:attachments|string|max:150',
            'attachments.*.url' => 'required_with:attachments|string|max:2048',
            'event_type' => 'sometimes|required|string|in:physical,virtual,hybrid',
            'visibility' => 'sometimes|required|string|in:public,private,invitation_only,internal_only,hidden_link',
            'status' => 'sometimes|required|string|in:draft,upcoming,registration_open,full,registration_closed,ongoing,completed,cancelled,archived',
            'start_at' => 'sometimes|required|date',
            'end_at' => 'sometimes|required|date',
            'timezone' => 'nullable|string',
            'registration_open_at' => 'nullable|date',
            'registration_close_at' => 'nullable|date',
            'capacity' => 'sometimes|required|integer|min:1',
            'waitlist_enabled' => 'boolean',
            'waitlist_capacity' => 'nullable|integer|min:1',
            'approval_mode' => 'sometimes|required|string|in:automatic,manual',
            'allow_cancellation' => 'boolean',
            'cancellation_deadline' => 'nullable|date',
            'duplicate_rule' => 'sometimes|required|string|in:email,phone,employee_id,none',
            'venue_name' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'province' => 'nullable|string',
            'country' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'map_url' => 'nullable|string|max:2048',
            'meeting_url' => 'nullable|url',
            'organizer_name' => 'nullable|string',
            'contact_name' => 'nullable|string',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string',
            'primary_color' => 'nullable|string',
            'secondary_color' => 'nullable|string',
            'terms_and_conditions' => 'nullable|string',
        ]);

        $updated = $this->eventService->updateEvent($event, $validated);

        return response()->json($updated);
    }

    public function duplicate(Request $request, string $id): JsonResponse
    {
        $event = Event::findOrFail($id);
        $duplicated = $this->eventService->duplicateEvent($event, $request->user()?->id);

        return response()->json($duplicated, 201);
    }

    public function setStatus(Request $request, string $id): JsonResponse
    {
        $event = Event::findOrFail($id);
        $validated = $request->validate([
            'status' => 'required|string|in:draft,upcoming,registration_open,full,registration_closed,ongoing,completed,cancelled,archived',
        ]);

        $updated = $this->eventService->changeStatus($event, $validated['status']);

        return response()->json($updated);
    }

    public function destroy(string $id): JsonResponse
    {
        $event = Event::findOrFail($id);

        // If event has registrations, soft-archive instead of hard deleting
        if ($event->registrations()->exists()) {
            $this->eventService->changeStatus($event, 'archived');

            return response()->json(['message' => 'Event has active registrations and was moved to archive.']);
        }

        AuditService::log(
            action: 'event_deleted',
            entityType: 'Event',
            entityId: (string) $event->id,
            eventId: $event->id,
            previousValue: ['title' => $event->title, 'code' => $event->event_code, 'status' => $event->status],
        );

        $event->delete();

        return response()->json(['message' => 'Event deleted successfully.']);
    }
}
