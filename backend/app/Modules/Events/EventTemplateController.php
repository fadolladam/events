<?php

namespace App\Modules\Events;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventTemplate;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventTemplateController extends Controller
{
    /** Event fields a template carries as defaults (never the event-specific ones). */
    private const DEFAULT_KEYS = [
        'event_type', 'visibility', 'capacity', 'waitlist_enabled', 'waitlist_capacity',
        'approval_mode', 'allow_cancellation', 'duplicate_rule', 'short_description',
        'primary_color', 'secondary_color', 'terms_and_conditions', 'category_id',
    ];

    public function index(): JsonResponse
    {
        $templates = EventTemplate::with('category')->orderBy('name')->get();

        return response()->json($templates);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(EventTemplate::with('category')->findOrFail($id));
    }

    /** Snapshot an existing event (its settings + registration form) as a template. */
    public function storeFromEvent(Request $request, string $eventId): JsonResponse
    {
        $event = Event::with('form.fields')->findOrFail($eventId);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        $defaults = collect(self::DEFAULT_KEYS)
            ->mapWithKeys(fn ($k) => [$k => $event->{$k}])
            ->filter(fn ($v) => $v !== null)
            ->all();

        $formFields = $event->form
            ? $event->form->fields->where('is_hidden', false)->sortBy('field_order')->map(fn ($f) => [
                'field_key' => $f->field_key, 'label' => $f->label, 'type' => $f->type,
                'is_required' => (bool) $f->is_required, 'is_hidden' => false,
                'options' => $f->options, 'help_text' => $f->help_text,
                'conditional_logic' => $f->conditional_logic,
            ])->values()->all()
            : [];

        $template = EventTemplate::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'category_id' => $event->category_id,
            'structure' => ['defaults' => $defaults, 'form_fields' => $formFields],
        ]);

        AuditService::log(
            action: 'event_template_created',
            entityType: 'EventTemplate',
            entityId: (string) $template->id,
            eventId: $event->id,
            newValue: ['name' => $template->name, 'from_event' => $event->event_code],
        );

        return response()->json($template, 201);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:event_categories,id',
            'structure' => 'required|array',
        ]);

        $template = EventTemplate::create($validated);

        return response()->json($template, 201);
    }
}
