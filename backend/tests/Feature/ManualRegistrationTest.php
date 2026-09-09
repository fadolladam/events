<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Registration;
use App\Models\User;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ManualRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private function actingOfficer(): User
    {
        $user = User::create([
            'name' => 'Reg Officer',
            'email' => 'officer@rhbgroup.com',
            'password' => Hash::make('x'),
            'role' => 'registration_officer',
            'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function makeEvent(array $overrides = []): Event
    {
        return Event::create(array_merge([
            'title' => 'Manual Reg Event',
            'slug' => 'manual-reg-event',
            'event_code' => 'MANUAL',
            'start_at' => now()->addDays(4),
            'end_at' => now()->addDays(4)->addHours(3),
            'capacity' => 2,
            'waitlist_enabled' => true,
            'approval_mode' => 'automatic',
            'duplicate_rule' => 'email',
            'status' => 'registration_open',
        ], $overrides));
    }

    public function test_officer_can_manually_register_a_participant_and_a_ticket_is_issued(): void
    {
        $this->actingOfficer();
        $event = $this->makeEvent();

        $res = $this->postJson("/api/events/{$event->id}/registrations", [
            'name' => 'Walk In',
            'email' => 'walkin@example.com',
            'employee_id' => 'E-99',
            'notes' => 'Registered at the door',
        ]);

        $res->assertCreated();
        $res->assertJsonPath('registration.status', 'confirmed');
        $this->assertNotNull($res->json('ticket'));

        $reg = Registration::first();
        $this->assertSame('manual', $reg->source);
        $this->assertSame('Registered at the door', $reg->notes);
        $this->assertMatchesRegularExpression('/^EVT-MANUAL-\d{4}-\d{6}$/', $reg->registration_number);

        $this->assertDatabaseHas('audit_logs', ['action' => 'registration_manual_created']);
    }

    public function test_manual_registration_respects_capacity_and_falls_through_to_the_waitlist(): void
    {
        $this->actingOfficer();
        $event = $this->makeEvent(['capacity' => 1]);

        $this->postJson("/api/events/{$event->id}/registrations", ['name' => 'A', 'email' => 'a@example.com'])
            ->assertCreated()->assertJsonPath('registration.status', 'confirmed');

        $this->postJson("/api/events/{$event->id}/registrations", ['name' => 'B', 'email' => 'b@example.com'])
            ->assertCreated()->assertJsonPath('registration.status', 'waitlisted');
    }

    public function test_manual_registration_enforces_the_duplicate_rule(): void
    {
        $this->actingOfficer();
        $event = $this->makeEvent();

        app(RegistrationService::class)->register($event->id, ['name' => 'Dup', 'email' => 'dup@example.com']);

        $this->postJson("/api/events/{$event->id}/registrations", ['name' => 'Dup Again', 'email' => 'dup@example.com'])
            ->assertStatus(422);
    }

    public function test_checkin_staff_cannot_manually_register(): void
    {
        $user = User::create([
            'name' => 'Gate Staff',
            'email' => 'gate@rhbgroup.com',
            'password' => Hash::make('x'),
            'role' => 'checkin_staff',
            'status' => 'active',
        ]);
        Sanctum::actingAs($user);
        $event = $this->makeEvent();

        $this->postJson("/api/events/{$event->id}/registrations", ['name' => 'X', 'email' => 'x@example.com'])
            ->assertForbidden();
    }
}
