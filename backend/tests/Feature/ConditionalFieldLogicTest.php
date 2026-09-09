<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\FormField;
use App\Models\RegistrationForm;
use App\Modules\Forms\ConditionalLogic;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ConditionalFieldLogicTest extends TestCase
{
    use RefreshDatabase;

    public function test_condition_helper_operators(): void
    {
        $this->assertTrue(ConditionalLogic::passes(null, []));
        $this->assertTrue(ConditionalLogic::passes(['field' => 'a', 'operator' => 'equals', 'value' => 'Yes'], ['a' => 'Yes']));
        $this->assertFalse(ConditionalLogic::passes(['field' => 'a', 'operator' => 'equals', 'value' => 'Yes'], ['a' => 'No']));
        $this->assertTrue(ConditionalLogic::passes(['field' => 'a', 'operator' => 'not_equals', 'value' => 'Yes'], ['a' => 'No']));
        $this->assertTrue(ConditionalLogic::passes(['field' => 'a', 'operator' => 'in', 'value' => ['X', 'Y']], ['a' => 'Y']));
        $this->assertTrue(ConditionalLogic::passes(['field' => 'a', 'operator' => 'contains', 'value' => 'Halal'], ['a' => ['Halal', 'Nut allergy']]));
    }

    private function eventWithConditionalField(): Event
    {
        $event = Event::create([
            'title' => 'Conditional Event', 'slug' => 'conditional-event', 'event_code' => 'COND',
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 20, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);
        $form = RegistrationForm::create(['event_id' => $event->id, 'title' => 'F']);
        FormField::create(['form_id' => $form->id, 'field_key' => 'attending_dinner', 'label' => 'Attending dinner?', 'type' => 'radio', 'options' => ['Yes', 'No'], 'is_required' => true, 'field_order' => 5]);
        FormField::create(['form_id' => $form->id, 'field_key' => 'meal', 'label' => 'Meal choice', 'type' => 'select', 'options' => ['Chicken', 'Fish', 'Vegan'], 'is_required' => true, 'field_order' => 6,
            'conditional_logic' => ['field' => 'attending_dinner', 'operator' => 'equals', 'value' => 'Yes']]);

        return $event;
    }

    public function test_hidden_required_field_does_not_block_submission(): void
    {
        $event = $this->eventWithConditionalField();

        // "attending_dinner = No" -> "meal" is hidden -> its required rule is skipped.
        $result = app(RegistrationService::class)->register(
            $event->id,
            ['name' => 'Skipper', 'email' => 'skip@t.com'],
            ['attending_dinner' => ['label' => 'Attending dinner?', 'value' => 'No']],
        );

        $this->assertSame('confirmed', $result['registration']->status);
    }

    public function test_visible_required_field_is_still_enforced(): void
    {
        $event = $this->eventWithConditionalField();

        $this->expectException(ValidationException::class);
        app(RegistrationService::class)->register(
            $event->id,
            ['name' => 'Needs Meal', 'email' => 'meal@t.com'],
            ['attending_dinner' => ['label' => 'Attending dinner?', 'value' => 'Yes']], // meal missing
        );
    }
}
