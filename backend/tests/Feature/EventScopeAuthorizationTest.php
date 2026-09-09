<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventStaff;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventScopeAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        return User::create([
            'name' => ucfirst($role),
            'email' => $role.'-'.uniqid().'@rhbgroup.com',
            'password' => Hash::make('x'),
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function event(string $code): Event
    {
        return Event::create([
            'title' => "Event {$code}",
            'slug' => 'event-'.strtolower($code),
            'event_code' => $code,
            'start_at' => now()->addDays(3),
            'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 10,
            'approval_mode' => 'automatic',
            'status' => 'registration_open',
        ]);
    }

    public function test_event_admin_is_org_wide(): void
    {
        Sanctum::actingAs($this->user('event_admin'));
        $a = $this->event('AAA');
        $b = $this->event('BBB');

        $this->getJson("/api/events/{$a->id}")->assertOk();
        $this->getJson("/api/events/{$b->id}")->assertOk();
    }

    public function test_organizer_is_confined_to_assigned_events(): void
    {
        $organizer = $this->user('event_organizer');
        $mine = $this->event('MINE');
        $other = $this->event('OTHR');
        EventStaff::create(['event_id' => $mine->id, 'user_id' => $organizer->id, 'role' => 'organizer']);

        Sanctum::actingAs($organizer);

        $this->getJson("/api/events/{$mine->id}")->assertOk();
        $this->getJson("/api/events/{$other->id}")->assertForbidden();
        $this->putJson("/api/events/{$other->id}", ['title' => 'Hijacked'])->assertForbidden();
    }

    public function test_registration_officer_cannot_touch_an_unassigned_events_registrations(): void
    {
        $officer = $this->user('registration_officer');
        $mine = $this->event('RMINE');
        $other = $this->event('ROTHER');
        EventStaff::create(['event_id' => $mine->id, 'user_id' => $officer->id, 'role' => 'registration_officer']);

        Sanctum::actingAs($officer);

        $this->postJson("/api/events/{$mine->id}/registrations", ['name' => 'Ok', 'email' => 'ok@t.com'])->assertCreated();
        $this->postJson("/api/events/{$other->id}/registrations", ['name' => 'No', 'email' => 'no@t.com'])->assertForbidden();
        $this->getJson("/api/events/{$other->id}/registrations")->assertForbidden();
    }

    public function test_registration_id_routes_are_scoped_via_the_parent_event(): void
    {
        $officer = $this->user('registration_officer');
        $mine = $this->event('SMINE');
        $other = $this->event('SOTHER');
        EventStaff::create(['event_id' => $mine->id, 'user_id' => $officer->id, 'role' => 'registration_officer']);

        // A registration that belongs to the event the officer is NOT on.
        Sanctum::actingAs($this->user('event_admin'));
        $regId = $this->postJson("/api/events/{$other->id}/registrations", ['name' => 'Foreign', 'email' => 'f@t.com'])
            ->json('registration.id');

        Sanctum::actingAs($officer);
        $this->getJson("/api/registrations/{$regId}")->assertForbidden();
        $this->postJson("/api/registrations/{$regId}/cancel")->assertForbidden();
    }

    public function test_checkin_staff_confined_to_assigned_events(): void
    {
        $staff = $this->user('checkin_staff');
        $mine = $this->event('CMINE');
        $other = $this->event('COTHER');
        EventStaff::create(['event_id' => $mine->id, 'user_id' => $staff->id, 'role' => 'checkin_staff']);

        Sanctum::actingAs($staff);

        $this->getJson("/api/events/{$mine->id}/attendance")->assertOk();
        $this->getJson("/api/events/{$other->id}/attendance")->assertForbidden();
    }

    public function test_event_list_only_returns_assigned_events_for_scoped_roles(): void
    {
        $organizer = $this->user('event_organizer');
        $mine = $this->event('LMINE');
        $this->event('LHIDDEN');
        EventStaff::create(['event_id' => $mine->id, 'user_id' => $organizer->id, 'role' => 'organizer']);

        Sanctum::actingAs($organizer);
        $res = $this->getJson('/api/events')->assertOk();

        $ids = collect($res->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($mine->id));
        $this->assertCount(1, $ids);
    }

    public function test_unauthenticated_is_401(): void
    {
        $e = $this->event('NOAUTH');
        $this->getJson("/api/events/{$e->id}")->assertUnauthorized();
    }
}
