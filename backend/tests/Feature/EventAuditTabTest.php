<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventStaff;
use App\Models\User;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventAuditTabTest extends TestCase
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
            'title' => 'Audit Tab Event', 'slug' => 'audit-tab-event', 'event_code' => 'ATE',
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 10, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);
    }

    public function test_per_event_audit_only_returns_that_events_entries(): void
    {
        Sanctum::actingAs($this->user('event_admin'));
        $a = $this->event();
        $b = Event::create([
            'title' => 'Other', 'slug' => 'other-ate', 'event_code' => 'ATE2',
            'start_at' => now()->addDays(2), 'end_at' => now()->addDays(2)->addHours(1),
            'capacity' => 5, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);

        app(RegistrationService::class)->register($a->id, ['name' => 'A', 'email' => 'a@t.com']);
        app(RegistrationService::class)->register($b->id, ['name' => 'B', 'email' => 'b@t.com']);

        $res = $this->getJson("/api/events/{$a->id}/audit-logs")->assertOk();
        foreach ($res->json('data') as $row) {
            $this->assertSame($a->id, $row['event_id']);
        }
        $this->assertNotEmpty($res->json('data'));
    }

    public function test_assigned_organizer_can_see_their_events_audit_but_not_anothers(): void
    {
        $organizer = $this->user('event_organizer');
        $mine = $this->event();
        $other = Event::create([
            'title' => 'NotMine', 'slug' => 'notmine-ate', 'event_code' => 'ATE3',
            'start_at' => now()->addDays(2), 'end_at' => now()->addDays(2)->addHours(1),
            'capacity' => 5, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);
        EventStaff::create(['event_id' => $mine->id, 'user_id' => $organizer->id, 'role' => 'organizer']);

        Sanctum::actingAs($organizer);
        $this->getJson("/api/events/{$mine->id}/audit-logs")->assertOk();
        $this->getJson("/api/events/{$other->id}/audit-logs")->assertForbidden();
    }

    public function test_checkin_staff_cannot_open_the_event_audit(): void
    {
        $staff = $this->user('checkin_staff');
        $e = $this->event();
        EventStaff::create(['event_id' => $e->id, 'user_id' => $staff->id, 'role' => 'checkin_staff']);
        Sanctum::actingAs($staff);

        $this->getJson("/api/events/{$e->id}/audit-logs")->assertForbidden();
    }
}
