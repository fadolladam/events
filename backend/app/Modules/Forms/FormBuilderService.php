<?php

namespace App\Modules\Forms;

use App\Models\RegistrationForm;
use App\Models\FormField;
use App\Modules\Audit\AuditService;
use Illuminate\Support\Facades\DB;

class FormBuilderService
{
    public function saveFormStructure(string $eventId, array $fields): RegistrationForm
    {
        return DB::transaction(function () use ($eventId, $fields) {
            $form = RegistrationForm::firstOrCreate(['event_id' => $eventId]);
            
            // Collect existing fields
            $existingFieldKeys = $form->fields()->pluck('field_key')->toArray();
            $newFieldKeys = array_column($fields, 'field_key');

            // Soft delete/update: Do not remove fields if registrations already exist, deactivate them instead
            $hasRegistrations = DB::table('registrations')->where('event_id', $eventId)->exists();

            if (!$hasRegistrations) {
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
