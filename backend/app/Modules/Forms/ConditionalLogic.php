<?php

namespace App\Modules\Forms;

/**
 * A form field can carry a single show-condition in `form_fields.conditional_logic`:
 *
 *   { "field": "<other_field_key>", "operator": "equals|not_equals|in|contains", "value": <string|string[]> }
 *
 * The field is shown only when the condition passes against the current answers.
 * No condition (null / missing "field") means always shown. Mirrored on the
 * frontend by src/modules/forms/conditionalLogic.ts.
 */
class ConditionalLogic
{
    /**
     * @param  array<string, mixed>|null  $logic
     * @param  array<string, mixed>  $answers  field_key => submitted value
     */
    public static function passes(?array $logic, array $answers): bool
    {
        if (! is_array($logic) || empty($logic['field'])) {
            return true;
        }

        $source = $answers[$logic['field']] ?? null;
        $operator = $logic['operator'] ?? 'equals';
        $target = $logic['value'] ?? null;

        $sourceList = array_map('strval', is_array($source) ? $source : ($source === null ? [] : [$source]));
        $targetList = array_map('strval', is_array($target) ? $target : ($target === null ? [] : [$target]));
        $targetOne = $targetList[0] ?? '';

        return match ($operator) {
            'not_equals' => ! in_array($targetOne, $sourceList, true),
            'in' => (bool) array_intersect($sourceList, $targetList),
            'contains' => in_array($targetOne, $sourceList, true)
                || (is_string($source) && $targetOne !== '' && str_contains($source, $targetOne)),
            default => in_array($targetOne, $sourceList, true), // equals
        };
    }
}
