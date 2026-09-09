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

class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        return User::create([
            'name' => ucfirst($role), 'email' => $role.'-'.uniqid().'@rhbgroup.com',
            'password' => Hash::make('x'), 'role' => $role, 'status' => 'active',
        ]);
    }

    private function event(string $code, string $title): Event
    {
        return Event::create([
            'title' => $title, 'slug' => 'ev-'.strtolower($code), 'event_code' => $code,
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 20, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);
    }

    private function seedData(): array
    {
        $svc = app(RegistrationService::class);
        $a = $this->event('BADM01', 'Badminton Open');
        $b = $this->event('BLOOD1', 'Blood Drive');
        $svc->register($a->id, ['name' => 'Zara Idris', 'email' => 'zara@rhb.com', 'employee_id' => 'E-777']);
        $svc->register($b->id, ['name' => 'Ken Lee', 'email' => 'ken@rhb.com', 'employee_id' => 'E-888']);

        return [$a, $b];
    }

    public function test_org_wide_admin_searches_everything(): void
    {
        Sanctum::actingAs($this->user('event_admin'));
        $this->seedData();

        $res = $this->getJson('/api/search?q=Badminton')->assertOk();
        $this->assertCount(1, $res->json('events'));

        $res = $this->getJson('/api/search?q=E-777')->assertOk();
        $this->assertNotEmpty($res->json('registrations'));
        $this->assertNotEmpty($res->json('participants'));
    }

    public function test_scoped_role_only_sees_assigned_events_and_their_people(): void
    {
        [$a, $b] = $this->seedData();
        $organizer = $this->user('event_organizer');
        EventStaff::create(['event_id' => $a->id, 'user_id' => $organizer->id, 'role' => 'organizer']);
        Sanctum::actingAs($organizer);

        // "Blood Drive" is on an event the organizer is NOT assigned to.
        $this->assertCount(0, $this->getJson('/api/search?q=Blood')->json('events'));
        // Ken Lee only registered for the blood drive -> not visible.
        $this->assertCount(0, $this->getJson('/api/search?q=Ken Lee')->json('participants'));
        // Zara is on the badminton event -> visible.
        $this->assertCount(1, $this->getJson('/api/search?q=Zara')->json('participants'));
        $this->assertCount(1, $this->getJson('/api/search?q=Badminton')->json('events'));
    }

    public function test_short_query_returns_empty(): void
    {
        Sanctum::actingAs($this->user('event_admin'));
        $this->getJson('/api/search?q=a')->assertOk()->assertJson(['events' => [], 'registrations' => [], 'participants' => []]);
    }
}
