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

class RegistrationOpsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $u = User::create([
            'name' => 'Admin', 'email' => 'a-'.uniqid().'@rhbgroup.com',
            'password' => Hash::make('x'), 'role' => 'event_admin', 'status' => 'active',
        ]);
        Sanctum::actingAs($u);

        return $u;
    }

    private function event(array $o = []): Event
    {
        return Event::create(array_merge([
            'title' => 'Ops Event', 'slug' => 'ops-'.uniqid(), 'event_code' => 'OPS'.strtoupper(substr(uniqid(), -4)),
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 50, 'approval_mode' => 'manual', 'status' => 'registration_open',
        ], $o));
    }

    private function register(Event $e, string $name, string $email, array $extra = []): Registration
    {
        return app(RegistrationService::class)->register($e->id, array_merge([
            'name' => $name, 'email' => $email,
        ], $extra))['registration'];
    }

    public function test_filters_by_department_and_registration_date(): void
    {
        $this->admin();
        $e = $this->event();
        $this->register($e, 'Ops Alice', 'a@t.com', ['department' => 'Treasury']);
        $this->register($e, 'Ops Bob', 'b@t.com', ['department' => 'Retail']);
        Registration::where('event_id', $e->id)->update(['registered_at' => now()->subDays(10)]);
        $recent = $this->register($e, 'Ops Carl', 'c@t.com', ['department' => 'Treasury']);

        $byDept = $this->getJson("/api/events/{$e->id}/registrations?department=Treas")->assertOk();
        $this->assertCount(2, $byDept->json('data'));

        $byDate = $this->getJson('/api/events/'.$e->id.'/registrations?date_from='.now()->subDay()->toDateString())->assertOk();
        $this->assertCount(1, $byDate->json('data'));
        $this->assertSame($recent->id, $byDate->json('data.0.id'));
    }

    public function test_bulk_approve_confirms_pending_rows_and_reports_unknown_ids(): void
    {
        $this->admin();
        $e = $this->event(['capacity' => 2]);
        $r1 = $this->register($e, 'P1', 'p1@t.com');
        $r2 = $this->register($e, 'P2', 'p2@t.com');
        $this->assertSame('pending', $r1->status);

        $res = $this->postJson("/api/events/{$e->id}/registrations/bulk", [
            'action' => 'approve',
            'ids' => [$r1->id, $r2->id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
        ])->assertOk();

        $this->assertSame(2, $res->json('processed'));
        $this->assertCount(1, $res->json('skipped'));
        $this->assertSame('confirmed', $r1->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'registrations_bulk_approve']);
    }

    public function test_bulk_cancel_frees_seats_and_promotes_the_waitlist(): void
    {
        $this->admin();
        $e = $this->event(['approval_mode' => 'automatic', 'capacity' => 1, 'waitlist_enabled' => true]);
        $confirmed = $this->register($e, 'Seated', 's@t.com');
        $queued = $this->register($e, 'Queued', 'q@t.com');
        $this->assertSame('waitlisted', $queued->fresh()->status);

        $this->postJson("/api/events/{$e->id}/registrations/bulk", ['action' => 'cancel', 'ids' => [$confirmed->id]])
            ->assertOk()->assertJsonPath('processed', 1);

        $this->assertSame('confirmed', $queued->fresh()->status);
    }

    public function test_reissue_ticket_revokes_the_old_one_and_issues_a_new_token(): void
    {
        $this->admin();
        $e = $this->event(['approval_mode' => 'automatic']);
        $reg = $this->register($e, 'Ticketed', 't@t.com');
        $oldToken = $reg->fresh()->ticket->secure_token;

        $res = $this->postJson("/api/registrations/{$reg->id}/reissue-ticket")->assertOk();

        $newToken = $res->json('ticket.secure_token');
        $this->assertNotSame($oldToken, $newToken);
        $this->assertDatabaseMissing('tickets', ['secure_token' => $oldToken]);
        $this->assertDatabaseHas('tickets', ['secure_token' => $newToken, 'status' => 'active']);
    }

    public function test_reissue_ticket_rejects_a_non_confirmed_registration(): void
    {
        $this->admin();
        $e = $this->event(); // manual approval -> pending
        $reg = $this->register($e, 'Pending', 'pd@t.com');

        $this->postJson("/api/registrations/{$reg->id}/reissue-ticket")->assertStatus(422);
    }

    public function test_notes_can_be_edited(): void
    {
        $this->admin();
        $e = $this->event();
        $reg = $this->register($e, 'Noted', 'n@t.com');

        $this->patchJson("/api/registrations/{$reg->id}", ['notes' => 'Called to confirm dietary needs'])->assertOk();

        $this->assertSame('Called to confirm dietary needs', $reg->fresh()->notes);
        $this->assertDatabaseHas('audit_logs', ['action' => 'registration_notes_updated']);
    }

    public function test_bulk_attendance_marks_many_rows(): void
    {
        $this->admin();
        $e = $this->event(['approval_mode' => 'automatic']);
        $a = $this->register($e, 'AttA', 'aa@t.com');
        $b = $this->register($e, 'AttB', 'bb@t.com');

        $this->postJson("/api/events/{$e->id}/attendance/bulk", [
            'registration_ids' => [$a->id, $b->id],
            'status' => 'attended',
        ])->assertOk()->assertJsonPath('processed', 2);

        $this->assertSame('attended', $a->fresh()->attendance_status);
        $this->assertSame('attended', $b->fresh()->attendance_status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'attendance_bulk_updated']);
    }

    public function test_checkin_staff_cannot_run_registration_bulk_actions(): void
    {
        $u = User::create([
            'name' => 'Gate', 'email' => 'g-'.uniqid().'@rhbgroup.com',
            'password' => Hash::make('x'), 'role' => 'checkin_staff', 'status' => 'active',
        ]);
        Sanctum::actingAs($u);
        $e = $this->event();

        $this->postJson("/api/events/{$e->id}/registrations/bulk", ['action' => 'approve', 'ids' => ['x']])
            ->assertForbidden();
    }
}
