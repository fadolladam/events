import type { FormField } from '../../services/api';

export interface FieldCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'contains';
  value: string | string[];
}

/**
 * Mirrors App\Modules\Forms\ConditionalLogic. A field with no `conditional_logic`
 * (or no `field` in it) is always shown.
 */
export const fieldConditionPasses = (
  logic: FieldCondition | null | undefined,
  answers: Record<string, unknown>,
): boolean => {
  if (!logic || !logic.field) return true;

  const source = answers[logic.field];
  const sourceList = (Array.isArray(source) ? source : source == null ? [] : [source]).map(String);
  const targetList = (Array.isArray(logic.value) ? logic.value : logic.value == null ? [] : [logic.value]).map(String);
  const targetOne = targetList[0] ?? '';

  switch (logic.operator) {
    case 'not_equals':
      return !sourceList.includes(targetOne);
    case 'in':
      return sourceList.some((s) => targetList.includes(s));
    case 'contains':
      return sourceList.includes(targetOne) || (typeof source === 'string' && targetOne !== '' && source.includes(targetOne));
    default:
      return sourceList.includes(targetOne); // equals
  }
};

/** Filter a field list to the ones visible given the current answers. */
export const visibleFields = (fields: FormField[], answers: Record<string, unknown>): FormField[] =>
  fields.filter((f) => fieldConditionPasses(f.conditional_logic as FieldCondition | undefined, answers));
