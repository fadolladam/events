<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * RegistrationService::checkDuplicateRegistration honours the per-event
 * duplicate_rule (E§48). A cancelled/rejected prior registration never counts.
 */
class DuplicateRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private function event(string $rule): Event
    {
        return Event::create([
            'title' => "Dup {$rule}", 'slug' => 'dup-'.$rule, 'event_code' => strtoupper('D'.substr(md5($rule), 0, 4)),
            'start_at' => now()->addDays(5), 'end_at' => now()->addDays(5)->addHours(2),
            'capacity' => 50, 'approval_mode' => 'automatic', 'status' => 'registration_open',
            'duplicate_rule' => $rule,
        ]);
    }

    private function register(Event $event, array $data): void
    {
        app(RegistrationService::class)->register($event->id, $data);
    }

    public function test_email_rule_blocks_a_second_registration_with_the_same_email(): void
    {
        $event = $this->event('email');
        $this->register($event, ['name' => 'A', 'email' => 'same@t.com', 'phone' => '111']);

        $this->expectException(ValidationException::class);
        $this->register($event, ['name' => 'B', 'email' => 'same@t.com', 'phone' => '222']);
    }

    public function test_email_rule_allows_a_different_email(): void
    {
        $event = $this->event('email');
        $this->register($event, ['name' => 'A', 'email' => 'a@t.com']);
        $this->register($event, ['name' => 'B', 'email' => 'b@t.com']);

        $this->assertDatabaseCount('registrations', 2);
    }

    public function test_phone_rule_blocks_the_same_phone_across_different_people(): void
    {
        $event = $this->event('phone');
        $this->register($event, ['name' => 'A', 'email' => 'a@t.com', 'phone' => '555-1']);

        // Different person, different phone -> allowed.
        $this->register($event, ['name' => 'C', 'email' => 'c@t.com', 'phone' => '555-9']);
        $this->assertDatabaseCount('registrations', 2);

        // Different person, same phone -> blocked.
        $this->expectException(ValidationException::class);
        $this->register($event, ['name' => 'B', 'email' => 'b@t.com', 'phone' => '555-1']);
    }

    public function test_phone_rule_ignores_a_missing_phone(): void
    {
        $event = $this->event('phone');
        $this->register($event, ['name' => 'A', 'email' => 'a@t.com']);
        $this->register($event, ['name' => 'B', 'email' => 'b@t.com']);

        $this->assertDatabaseCount('registrations', 2);
    }

    public function test_employee_id_rule_blocks_the_same_employee_id(): void
    {
        $event = $this->event('employee_id');
        $this->register($event, ['name' => 'A', 'email' => 'a@t.com', 'employee_id' => 'E1001']);

        $this->expectException(ValidationException::class);
        $this->register($event, ['name' => 'B', 'email' => 'b@t.com', 'employee_id' => 'E1001']);
    }

    public function test_none_rule_permits_identical_repeat_registrations(): void
    {
        $event = $this->event('none');
        $this->register($event, ['name' => 'A', 'email' => 'same@t.com', 'phone' => '999', 'employee_id' => 'E9']);
        $this->register($event, ['name' => 'A', 'email' => 'same@t.com', 'phone' => '999', 'employee_id' => 'E9']);

        $this->assertDatabaseCount('registrations', 2);
    }

    public function test_a_cancelled_prior_registration_does_not_trigger_the_duplicate_rule(): void
    {
        $event = $this->event('email');
        $first = app(RegistrationService::class)
            ->register($event->id, ['name' => 'A', 'email' => 'again@t.com'])['registration'];

        $first->update(['status' => 'cancelled']);

        // Re-registering the freed email is allowed.
        $this->register($event, ['name' => 'A', 'email' => 'again@t.com']);
        $this->assertSame(1, $event->registrations()->where('status', '!=', 'cancelled')->count());
    }
}
