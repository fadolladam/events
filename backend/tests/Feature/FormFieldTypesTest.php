<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\FormField;
use App\Models\RegistrationForm;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class FormFieldTypesTest extends TestCase
{
    use RefreshDatabase;

    private function eventWithFields(array $fields): Event
    {
        $event = Event::create([
            'title' => 'Typed Form Event',
            'slug' => 'typed-form-event',
            'event_code' => 'TYPED',
            'start_at' => now()->addDays(3),
            'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 20,
            'approval_mode' => 'automatic',
            'status' => 'registration_open',
        ]);
        $form = RegistrationForm::create(['event_id' => $event->id, 'title' => 'F']);
        foreach ($fields as $i => $f) {
            FormField::create(array_merge(['form_id' => $form->id, 'field_order' => $i + 10], $f));
        }

        return $event;
    }

    private function submit(Event $event, array $answers): array
    {
        return app(RegistrationService::class)->register(
            $event->id,
            ['name' => 'Typed '.uniqid(), 'email' => uniqid().'@t.com'],
            $answers,
        );
    }

    public function test_required_consent_must_be_ticked(): void
    {
        $e = $this->eventWithFields([
            ['field_key' => 'terms', 'label' => 'Accept the terms', 'type' => 'consent', 'is_required' => true],
        ]);

        try {
            $this->submit($e, ['terms' => ['label' => 'Accept the terms', 'value' => false]]);
            $this->fail('Expected ValidationException');
        } catch (ValidationException $ex) {
            $this->assertArrayHasKey('terms', $ex->errors());
        }

        $ok = $this->submit($e, ['terms' => ['label' => 'Accept the terms', 'value' => true]]);
        $this->assertSame('confirmed', $ok['registration']->status);
    }

    public function test_info_field_never_requires_an_answer(): void
    {
        $e = $this->eventWithFields([
            ['field_key' => 'notice', 'label' => 'Bring your staff pass.', 'type' => 'info', 'is_required' => true],
        ]);

        $ok = $this->submit($e, []);
        $this->assertSame('confirmed', $ok['registration']->status);
    }

    public function test_date_and_time_are_format_checked(): void
    {
        $e = $this->eventWithFields([
            ['field_key' => 'dob', 'label' => 'Date of birth', 'type' => 'date', 'is_required' => false],
            ['field_key' => 'slot', 'label' => 'Preferred slot', 'type' => 'time', 'is_required' => false],
        ]);

        try {
            $this->submit($e, [
                'dob' => ['label' => 'Date of birth', 'value' => 'not-a-date'],
                'slot' => ['label' => 'Preferred slot', 'value' => '99:99'],
            ]);
            $this->fail('Expected ValidationException');
        } catch (ValidationException $ex) {
            $this->assertArrayHasKey('dob', $ex->errors());
            $this->assertArrayHasKey('slot', $ex->errors());
        }

        $ok = $this->submit($e, [
            'dob' => ['label' => 'Date of birth', 'value' => '1990-05-01'],
            'slot' => ['label' => 'Preferred slot', 'value' => '14:30'],
        ]);
        $this->assertSame('confirmed', $ok['registration']->status);
    }

    public function test_multi_select_values_must_be_in_the_options(): void
    {
        $e = $this->eventWithFields([
            ['field_key' => 'diet', 'label' => 'Dietary', 'type' => 'multi_select', 'is_required' => false,
                'options' => ['Halal', 'Vegetarian', 'Nut allergy']],
        ]);

        try {
            $this->submit($e, ['diet' => ['label' => 'Dietary', 'value' => ['Halal', 'Pescatarian']]]);
            $this->fail('Expected ValidationException');
        } catch (ValidationException $ex) {
            $this->assertArrayHasKey('diet', $ex->errors());
        }

        $ok = $this->submit($e, ['diet' => ['label' => 'Dietary', 'value' => ['Halal', 'Nut allergy']]]);
        $this->assertSame('confirmed', $ok['registration']->status);
    }
}
