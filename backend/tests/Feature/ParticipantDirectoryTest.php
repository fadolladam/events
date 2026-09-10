<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ParticipantDirectoryTest extends TestCase
{
    use RefreshDatabase;

    private function officer(string $role = 'registration_officer'): User
    {
        $u = User::create([
            'name' => ucfirst($role), 'email' => $role.'-'.uniqid().'@rhbgroup.com',
            'password' => Hash::make('x'), 'role' => $role, 'status' => 'active',
        ]);
        Sanctum::actingAs($u);

        return $u;
    }

    private function event(string $code): Event
    {
        return Event::create([
            'title' => "Event {$code}", 'slug' => 'ev-'.strtolower($code), 'event_code' => $code,
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 50, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);
    }

    private function seedPeople(): void
    {
        $svc = app(RegistrationService::class);
        $a = $this->event('AAA');
        $b = $this->event('BBB');
        // Same person registers for two events -> one participant, two registrations.
        $svc->register($a->id, ['name' => 'Nadia Rahman', 'email' => 'nadia@rhb.com', 'employee_id' => 'E-500', 'department' => 'Treasury']);
        $svc->register($b->id, ['name' => 'Nadia Rahman', 'email' => 'nadia@rhb.com', 'employee_id' => 'E-500', 'department' => 'Treasury']);
        $svc->register($a->id, ['name' => 'Omar Yusof', 'email' => 'omar@rhb.com', 'employee_id' => 'E-999', 'department' => 'Retail']);
    }

    public function test_index_lists_deduped_participants_with_registration_counts(): void
    {
        $this->officer();
        $this->seedPeople();

        $res = $this->getJson('/api/participants')->assertOk();
        $this->assertSame(2, $res->json('total'));

        $nadia = collect($res->json('data'))->firstWhere('email', 'nadia@rhb.com');
        $this->assertSame(2, $nadia['registrations_count']);
    }

    public function test_search_matches_name_email_employee_id_and_department(): void
    {
        $this->officer();
        $this->seedPeople();

        $this->assertCount(1, $this->getJson('/api/participants?search=E-999')->json('data'));
        $this->assertCount(1, $this->getJson('/api/participants?search=Treasury')->json('data'));
        $this->assertCount(1, $this->getJson('/api/participants?search=nadia@rhb')->json('data'));
    }

    public function test_filters_by_department(): void
    {
        $this->officer();
        $this->seedPeople();

        $rows = $this->getJson('/api/participants?department=Treasury')->json('data');
        $this->assertCount(1, $rows);
        $this->assertSame('nadia@rhb.com', $rows[0]['email']);
    }

    public function test_filters_by_event_id_to_only_participants_registered_for_that_event(): void
    {
        $this->officer();
        $this->seedPeople();

        $eventB = Event::where('event_code', 'BBB')->firstOrFail();

        // Nadia registered for both AAA and BBB; Omar only for AAA — filtering
        // by BBB's id must return Nadia alone even though the directory is
        // deduped across all her registrations.
        $rows = $this->getJson("/api/participants?event_id={$eventB->id}")->json('data');
        $this->assertCount(1, $rows);
        $this->assertSame('nadia@rhb.com', $rows[0]['email']);
    }

    public function test_lookup_is_a_lean_typeahead_needing_two_chars(): void
    {
        $this->officer();
        $this->seedPeople();

        $this->assertSame([], $this->getJson('/api/participants/lookup?q=n')->json('data'));

        $hit = $this->getJson('/api/participants/lookup?q=nad')->json('data');
        $this->assertCount(1, $hit);
        $this->assertSame('E-500', $hit[0]['employee_id']);
        $this->assertArrayNotHasKey('metadata', $hit[0]);
    }

    public function test_show_returns_the_full_cross_event_history(): void
    {
        $this->officer();
        $this->seedPeople();

        $id = $this->getJson('/api/participants?search=nadia')->json('data.0.id');
        $res = $this->getJson("/api/participants/{$id}")->assertOk();

        $this->assertSame(2, $res->json('registrations_count'));
        $this->assertCount(2, $res->json('registrations'));
        $this->assertNotNull($res->json('registrations.0.event.title'));
    }

    public function test_checkin_staff_cannot_reach_the_directory(): void
    {
        $this->officer('checkin_staff');

        $this->getJson('/api/participants')->assertForbidden();
    }
}
