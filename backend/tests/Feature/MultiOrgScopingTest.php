<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Organization;
use App\Models\User;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MultiOrgScopingTest extends TestCase
{
    use RefreshDatabase;

    private function org(string $name): Organization
    {
        return Organization::create(['name' => $name, 'slug' => \Str::slug($name), 'timezone' => 'UTC']);
    }

    private function admin(Organization $org): User
    {
        return User::create([
            'name' => 'Admin', 'email' => 'a-'.uniqid().'@x.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active', 'organization_id' => $org->id,
        ]);
    }

    private function event(Organization $org, string $code): Event
    {
        return Event::create([
            'organization_id' => $org->id,
            'title' => "Event {$code}", 'slug' => 'ev-'.strtolower($code), 'event_code' => $code,
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 20, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);
    }

    public function test_event_admin_only_sees_and_reaches_their_own_orgs_events(): void
    {
        $orgA = $this->org('Alpha');
        $orgB = $this->org('Beta');
        $eventA = $this->event($orgA, 'AAA');
        $eventB = $this->event($orgB, 'BBB');

        Sanctum::actingAs($this->admin($orgA));

        $list = $this->getJson('/api/events')->assertOk();
        $ids = collect($list->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($eventA->id));
        $this->assertFalse($ids->contains($eventB->id));

        $this->getJson("/api/events/{$eventA->id}")->assertOk();
        $this->getJson("/api/events/{$eventB->id}")->assertForbidden();
    }

    public function test_search_and_participants_are_org_confined(): void
    {
        $orgA = $this->org('Alpha');
        $orgB = $this->org('Beta');
        $svc = app(RegistrationService::class);
        $svc->register($this->event($orgA, 'AAA')->id, ['name' => 'Anna Own', 'email' => 'anna@x.com']);
        $svc->register($this->event($orgB, 'BBB')->id, ['name' => 'Ben Other', 'email' => 'ben@x.com']);

        Sanctum::actingAs($this->admin($orgA));

        $this->assertCount(0, $this->getJson('/api/search?q=Ben Other')->json('participants'));
        $this->assertCount(1, $this->getJson('/api/search?q=Anna Own')->json('participants'));

        $dir = $this->getJson('/api/participants')->assertOk();
        $this->assertSame(1, $dir->json('total'));
    }

    public function test_new_event_inherits_the_creators_org(): void
    {
        $orgA = $this->org('Alpha');
        Sanctum::actingAs($this->admin($orgA));

        $res = $this->postJson('/api/events', [
            'title' => 'Fresh', 'event_type' => 'physical', 'visibility' => 'public', 'status' => 'draft',
            'start_at' => now()->addDays(5)->toISOString(), 'end_at' => now()->addDays(5)->addHours(2)->toISOString(),
            'capacity' => 10, 'approval_mode' => 'automatic', 'duplicate_rule' => 'email',
        ])->assertCreated();

        $this->assertSame($orgA->id, Event::find($res->json('id'))->organization_id);
    }
}
