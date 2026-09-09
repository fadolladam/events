<?php

namespace App\Modules\Forms;

use App\Models\FormField;
use App\Models\RegistrationForm;
use App\Modules\Audit\AuditService;
use Illuminate\Support\Facades\DB;

class FormBuilderService
{
    /**
     * Core fields every event's registration form starts with. Kept in sync
     * with EventService::createEvent so an event that gets its form lazily
     * (seed fixtures, imports, legacy rows) looks identical to one created
     * through the normal flow.
     */
    public const DEFAULT_FIELDS = [
        ['field_key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'is_required' => true, 'field_order' => 1],
        ['field_key' => 'email', 'label' => 'Email Address', 'type' => 'email', 'is_required' => true, 'field_order' => 2],
        ['field_key' => 'phone', 'label' => 'Phone Number', 'type' => 'phone', 'is_required' => false, 'field_order' => 3],
    ];

    /**
     * Return the registration form that belongs to this event, creating an
     * empty scaffold (title + core fields) the first time it is requested.
     * Scoped strictly by event_id so the builder always loads that event's
     * own form and never falls back to another event's structure.
     */
    public function getOrCreateForm(string $eventId): RegistrationForm
    {
        $form = RegistrationForm::firstOrCreate(
            ['event_id' => $eventId],
            [
                'title' => 'Event Registration',
                'description' => 'Please fill in your details to register.',
                'is_active' => true,
            ]
        );

        if ($form->fields()->count() === 0) {
            foreach (self::DEFAULT_FIELDS as $fieldData) {
                FormField::create(array_merge($fieldData, ['form_id' => $form->id]));
            }
        }

        return $form->load(['fields' => fn ($q) => $q->orderBy('field_order', 'asc')]);
    }

    public function saveFormStructure(string $eventId, array $fields): RegistrationForm
    {
        return DB::transaction(function () use ($eventId, $fields) {
            $form = RegistrationForm::firstOrCreate(
                ['event_id' => $eventId],
                [
                    'title' => 'Event Registration',
                    'description' => 'Please fill in your details to register.',
                    'is_active' => true,
                ]
            );

            // Collect existing fields
            $existingFieldKeys = $form->fields()->pluck('field_key')->toArray();
            $newFieldKeys = array_column($fields, 'field_key');

            // Soft delete/update: Do not remove fields if registrations already exist, deactivate them instead
            $hasRegistrations = DB::table('registrations')->where('event_id', $eventId)->exists();

            if (! $hasRegistrations) {
                $form->fields()->whereNotIn('field_key', $newFieldKeys)->delete();
            } else {
                // If registrations exist, hide fields not in new list instead of hard deleting
                $form->fields()->whereNotIn('field_key', $newFieldKeys)->update(['is_hidden' => true]);
            }

            foreach ($fields as $index => $fieldData) {
                FormField::updateOrCreate(
                    [
                        'form_id' => $form->id,
                        'field_key' => $fieldData['field_key'],
                    ],
                    [
                        'label' => $fieldData['label'],
                        'placeholder' => $fieldData['placeholder'] ?? null,
                        'help_text' => $fieldData['help_text'] ?? null,
                        'type' => $fieldData['type'],
                        'is_required' => $fieldData['is_required'] ?? false,
                        'is_hidden' => $fieldData['is_hidden'] ?? false,
                        'field_order' => $index + 1,
                        'validation_rules' => $fieldData['validation_rules'] ?? null,
                        'options' => $fieldData['options'] ?? null,
                        'conditional_logic' => $fieldData['conditional_logic'] ?? null,
                    ]
                );
            }

            AuditService::log(
                action: 'form_updated',
                entityType: 'RegistrationForm',
                entityId: (string) $form->id,
                eventId: $eventId,
                newValue: ['field_count' => count($fields)]
            );

            return $form->fresh('fields');
        });
    }
}
