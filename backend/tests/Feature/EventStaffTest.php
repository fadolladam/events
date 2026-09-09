<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventStaff;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventStaffTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        return User::create([
            'name' => ucfirst($role), 'email' => $role.'-'.uniqid().'@rhbgroup.com',
            'password' => Hash::make('x'), 'role' => $role, 'status' => 'active',
        ]);
    }

    private function event(): Event
    {
        return Event::create([
            'title' => 'Staff Event', 'slug' => 'staff-event', 'event_code' => 'STFEV',
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 10, 'approval_mode' => 'automatic', 'status' => 'draft',
        ]);
    }

    public function test_sync_replaces_the_whole_team_and_ignores_participants(): void
    {
        Sanctum::actingAs($this->user('event_admin'));
        $e = $this->event();
        $organizer = $this->user('event_organizer');
        $officer = $this->user('registration_officer');
        $participant = $this->user('participant');
        EventStaff::create(['event_id' => $e->id, 'user_id' => $this->user('checkin_staff')->id, 'role' => 'checkin_staff']);

        $res = $this->putJson("/api/events/{$e->id}/staff", ['staff' => [
            ['user_id' => $organizer->id, 'role' => 'organizer'],
            ['user_id' => $officer->id, 'role' => 'registration_officer'],
            ['user_id' => $participant->id, 'role' => 'viewer'],
        ]])->assertOk();

        $ids = collect($res->json())->pluck('user_id');
        $this->assertCount(2, $ids); // participant dropped, old checkin_staff replaced
        $this->assertTrue($ids->contains($organizer->id));
        $this->assertDatabaseHas('audit_logs', ['action' => 'event_staff_updated']);
    }

    public function test_assigned_organizer_can_then_reach_the_event(): void
    {
        Sanctum::actingAs($this->user('event_admin'));
        $e = $this->event();
        $organizer = $this->user('event_organizer');

        // Before assignment: organizer is blocked by event.scope.
        Sanctum::actingAs($organizer);
        $this->getJson("/api/events/{$e->id}")->assertForbidden();

        Sanctum::actingAs($this->user('event_admin'));
        $this->putJson("/api/events/{$e->id}/staff", ['staff' => [['user_id' => $organizer->id, 'role' => 'organizer']]])->assertOk();

        Sanctum::actingAs($organizer);
        $this->getJson("/api/events/{$e->id}")->assertOk();
    }

    public function test_assignable_users_lists_only_active_staff(): void
    {
        Sanctum::actingAs($this->user('event_organizer'));
        $this->user('participant');

        $res = $this->getJson('/api/users/assignable')->assertOk();
        foreach ($res->json('data') as $u) {
            $this->assertNotSame('participant', $u['role']);
        }
    }
}
