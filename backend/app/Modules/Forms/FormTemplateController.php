<?php

namespace App\Modules\Forms;

use App\Http\Controllers\Controller;
use App\Models\FormTemplate;
use App\Models\RegistrationForm;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Reusable registration-form templates. Build a form once, save it here, then
 * load it into any event's Form Builder.
 */
class FormTemplateController extends Controller
{
    private const FIELD_RULES = [
        'fields' => 'required|array|min:1',
        'fields.*.field_key' => 'required|string|max:100',
        'fields.*.label' => 'required|string|max:255',
        'fields.*.type' => 'required|string|in:text,textarea,email,phone,number,date,time,select,radio,checkbox',
        'fields.*.placeholder' => 'nullable|string|max:255',
        'fields.*.help_text' => 'nullable|string|max:255',
        'fields.*.is_required' => 'boolean',
        'fields.*.is_hidden' => 'boolean',
        'fields.*.options' => 'nullable|array',
        'fields.*.options.*' => 'string|max:255',
        'fields.*.validation_rules' => 'nullable|array',
        'fields.*.conditional_logic' => 'nullable|array',
    ];

    public function index(): JsonResponse
    {
        $templates = FormTemplate::query()
            ->with('creator:id,name')
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get()
            ->map(fn (FormTemplate $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'field_count' => $t->field_count,
                'is_system' => $t->is_system,
                'created_by_name' => $t->creator?->name,
                'updated_at' => $t->updated_at?->toIso8601String(),
            ]);

        return response()->json($templates);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(FormTemplate::findOrFail($id));
    }

    /**
     * Create a template from an explicit `fields` array, or from an existing
     * event's current form (`from_event_id`).
     */
    public function store(Request $request): JsonResponse
    {
        $base = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'from_event_id' => 'nullable|uuid|exists:events,id',
        ]);

        if (! empty($base['from_event_id'])) {
            $fields = $this->fieldsFromEvent($base['from_event_id']);
        } else {
            $fields = $this->normaliseFields(
                $request->validate(self::FIELD_RULES)['fields']
            );
        }

        $template = FormTemplate::create([
            'name' => $base['name'],
            'description' => $base['description'] ?? null,
            'fields' => $fields,
            'created_by' => $request->user()?->id,
            'is_system' => false,
        ]);

        AuditService::log(
            action: 'form_template_created',
            entityType: 'FormTemplate',
            entityId: (string) $template->id,
            newValue: ['name' => $template->name, 'field_count' => count($fields)],
        );

        return response()->json($template, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $template = FormTemplate::findOrFail($id);

        if ($template->is_system) {
            throw ValidationException::withMessages([
                'name' => 'Built-in templates cannot be edited. Duplicate it with "Save as reusable form" instead.',
            ]);
        }

        $base = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        if ($request->has('fields')) {
            $base['fields'] = $this->normaliseFields(
                $request->validate(self::FIELD_RULES)['fields']
            );
        }

        $template->update($base);

        AuditService::log(
            action: 'form_template_updated',
            entityType: 'FormTemplate',
            entityId: (string) $template->id,
            newValue: ['name' => $template->name],
        );

        return response()->json($template->fresh());
    }

    public function destroy(string $id): JsonResponse
    {
        $template = FormTemplate::findOrFail($id);

        if ($template->is_system) {
            throw ValidationException::withMessages([
                'id' => 'Built-in templates cannot be deleted.',
            ]);
        }

        $name = $template->name;
        $template->delete();

        AuditService::log(
            action: 'form_template_deleted',
            entityType: 'FormTemplate',
            entityId: (string) $id,
            previousValue: ['name' => $name],
        );

        return response()->json(['message' => 'Template deleted.']);
    }

    /** @return array<int, array<string, mixed>> */
    private function fieldsFromEvent(string $eventId): array
    {
        $form = RegistrationForm::where('event_id', $eventId)
            ->with(['fields' => fn ($q) => $q->where('is_hidden', false)->orderBy('field_order')])
            ->first();

        $fields = $form
            ? $form->fields->map(fn ($f) => [
                'field_key' => $f->field_key,
                'label' => $f->label,
                'type' => $f->type,
                'placeholder' => $f->placeholder,
                'help_text' => $f->help_text,
                'is_required' => (bool) $f->is_required,
                'is_hidden' => false,
                'field_order' => $f->field_order,
                'options' => $f->options,
                'validation_rules' => $f->validation_rules,
                'conditional_logic' => $f->conditional_logic,
            ])->all()
            : [];

        if (empty($fields)) {
            throw ValidationException::withMessages([
                'from_event_id' => 'That event has no registration fields to save.',
            ]);
        }

        return $fields;
    }

    /** Keep only known keys and re-number field_order. */
    private function normaliseFields(array $fields): array
    {
        return array_values(array_map(function ($f, $i) {
            return [
                'field_key' => $f['field_key'],
                'label' => $f['label'],
                'type' => $f['type'],
                'placeholder' => $f['placeholder'] ?? null,
                'help_text' => $f['help_text'] ?? null,
                'is_required' => (bool) ($f['is_required'] ?? false),
                'is_hidden' => (bool) ($f['is_hidden'] ?? false),
                'field_order' => $i + 1,
                'options' => $f['options'] ?? null,
                'validation_rules' => $f['validation_rules'] ?? null,
                'conditional_logic' => $f['conditional_logic'] ?? null,
            ];
        }, $fields, array_keys($fields)));
    }
}
