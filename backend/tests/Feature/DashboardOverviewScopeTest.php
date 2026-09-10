<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Event;
use App\Models\NotificationLog;
use App\Models\Organization;
use App\Models\User;
use App\Models\WaitlistHistory;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * GET /dashboard/overview (and the legacy /dashboard/stats) must never leak
 * another organization's data to an org-bound staff member — every other
 * controller in the app enforces this baseline via User::scopedOrgId(), and
 * this endpoint had six aggregates that quietly skipped it (they read
 * straight off Registration/AuditLog/NotificationLog/WaitlistHistory with no
 * scope at all), even though the per-event lists elsewhere on the same
 * response were correctly org-scoped.
 */
class DashboardOverviewScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_overview_never_leaks_another_organizations_registrations_or_activity(): void
    {
        $orgA = Organization::create(['name' => 'Org A', 'slug' => 'org-a']);
        $orgB = Organization::create(['name' => 'Org B', 'slug' => 'org-b']);

        $eventA = Event::create([
            'organization_id' => $orgA->id,
            'title' => 'Org A Event', 'slug' => 'org-a-event', 'event_code' => 'ORGA',
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 20, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);
        $eventB = Event::create([
            'organization_id' => $orgB->id,
            'title' => 'Org B Secret Event', 'slug' => 'org-b-event', 'event_code' => 'ORGB',
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 20, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);

        $regService = app(RegistrationService::class);
        $regA = $regService->register($eventA->id, ['name' => 'Alice A', 'email' => 'alice@a.com'])['registration'];
        $regB = $regService->register($eventB->id, ['name' => 'Bob B (Secret)', 'email' => 'bob@b.com'])['registration'];

        AuditLog::create(['action' => 'registration_manual_created', 'entity_type' => 'Registration', 'entity_id' => (string) $regA->id, 'event_id' => $eventA->id, 'created_at' => now()]);
        AuditLog::create(['action' => 'registration_manual_created', 'entity_type' => 'Registration', 'entity_id' => (string) $regB->id, 'event_id' => $eventB->id, 'created_at' => now()]);

        NotificationLog::create(['event_id' => $eventA->id, 'recipient_email' => 'alice@a.com', 'trigger_event' => 'confirmed', 'subject' => 'Confirmed', 'status' => 'sent']);
        NotificationLog::create(['event_id' => $eventB->id, 'recipient_email' => 'bob@b.com', 'trigger_event' => 'confirmed', 'subject' => 'Confirmed', 'status' => 'failed']);

        WaitlistHistory::create(['event_id' => $eventA->id, 'registration_id' => $regA->id, 'action' => 'promoted', 'notes' => 'x']);
        WaitlistHistory::create(['event_id' => $eventB->id, 'registration_id' => $regB->id, 'action' => 'promoted', 'notes' => 'x']);

        $staffA = User::create([
            'name' => 'Staff A', 'email' => 'staffa@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'organization_id' => $orgA->id, 'status' => 'active',
        ]);
        Sanctum::actingAs($staffA);

        $res = $this->getJson('/api/dashboard/overview')->assertOk();

        $registrationEmails = collect($res->json('recent_registrations'))->pluck('participant');
        $this->assertTrue($registrationEmails->contains('Alice A'));
        $this->assertFalse($registrationEmails->contains('Bob B (Secret)'), 'Org B participant leaked into Org A dashboard.');

        $activityEventTitles = collect($res->json('recent_activity'))->pluck('event_title');
        $this->assertFalse($activityEventTitles->contains('Org B Secret Event'), 'Org B audit activity leaked into Org A dashboard.');

        $promotionParticipants = collect($res->json('waitlist.recent_promotions'))->pluck('participant');
        $this->assertFalse($promotionParticipants->contains('Bob B (Secret)'), 'Org B waitlist promotion leaked into Org A dashboard.');

        // Aggregate counts must reflect Org A alone (1 registration), not both orgs' 2.
        $this->assertSame(1, $res->json('kpis.total_registrations'));
        $this->assertSame(1, array_sum($res->json('registration_status_breakdown')));

        $trendTotal = collect($res->json('registration_trend'))->sum('total');
        $this->assertSame(1, $trendTotal);

        $this->assertSame(1, $res->json('notification_health.sent_today') + $res->json('notification_health.failed'));
    }

    public function test_super_admin_sees_every_organizations_activity(): void
    {
        $orgA = Organization::create(['name' => 'Org A', 'slug' => 'org-a2']);
        $orgB = Organization::create(['name' => 'Org B', 'slug' => 'org-b2']);

        $eventA = Event::create([
            'organization_id' => $orgA->id,
            'title' => 'A', 'slug' => 'a2', 'event_code' => 'A2',
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 20, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);
        $eventB = Event::create([
            'organization_id' => $orgB->id,
            'title' => 'B', 'slug' => 'b2', 'event_code' => 'B2',
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 20, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);

        $regService = app(RegistrationService::class);
        $regService->register($eventA->id, ['name' => 'P1', 'email' => 'p1@t.com']);
        $regService->register($eventB->id, ['name' => 'P2', 'email' => 'p2@t.com']);

        Sanctum::actingAs(User::create([
            'name' => 'Super', 'email' => 'super@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'super_admin', 'status' => 'active',
        ]));

        $res = $this->getJson('/api/dashboard/overview')->assertOk();

        $this->assertSame(2, $res->json('kpis.total_registrations'));
    }
}
