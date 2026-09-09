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

/**
 * Attendance marking — single + bulk, status vocabulary, audit trail (E§48).
 */
class AttendanceTest extends TestCase
{
    use RefreshDatabase;

    private Event $event;

    protected function setUp(): void
    {
        parent::setUp();

        $this->event = Event::create([
            'title' => 'Attendance Event', 'slug' => 'attendance-event', 'event_code' => 'ATND',
            'start_at' => now()->addDay(), 'end_at' => now()->addDay()->addHours(3),
            'capacity' => 100, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);

        Sanctum::actingAs(User::create([
            'name' => 'Gate', 'email' => 'gate@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]));
    }

    private function confirmedRegistration(string $email): Registration
    {
        return app(RegistrationService::class)
            ->register($this->event->id, ['name' => 'P', 'email' => $email])['registration'];
    }

    public function test_index_lists_confirmed_registrations_only(): void
    {
        $this->confirmedRegistration('a@t.com');
        $pending = $this->confirmedRegistration('b@t.com');
        $pending->update(['status' => 'pending']);

        $res = $this->getJson("/api/events/{$this->event->id}/attendance")->assertOk();
        $this->assertSame(1, $res->json('total'));
    }

    public function test_mark_attendance_updates_status_and_writes_an_attendance_row(): void
    {
        $reg = $this->confirmedRegistration('a@t.com');

        $this->postJson("/api/events/{$this->event->id}/attendance/mark", [
            'registration_id' => $reg->id,
            'status' => 'attended',
            'notes' => 'walked in at 9am',
        ])->assertOk()->assertJsonPath('registration.attendance_status', 'attended');

        $this->assertDatabaseHas('attendance', [
            'registration_id' => $reg->id,
            'event_id' => $this->event->id,
            'status' => 'attended',
            'notes' => 'walked in at 9am',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'attendance_status_updated',
            'event_id' => $this->event->id,
        ]);
    }

    public function test_mark_attendance_rejects_an_unknown_status(): void
    {
        $reg = $this->confirmedRegistration('a@t.com');

        $this->postJson("/api/events/{$this->event->id}/attendance/mark", [
            'registration_id' => $reg->id,
            'status' => 'maybe',
        ])->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_mark_attendance_is_scoped_to_the_event(): void
    {
        $other = Event::create([
            'title' => 'Other', 'slug' => 'other-att', 'event_code' => 'OTHR',
            'start_at' => now()->addDay(), 'end_at' => now()->addDay()->addHour(),
            'capacity' => 10, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);
        $foreign = app(RegistrationService::class)
            ->register($other->id, ['name' => 'X', 'email' => 'x@t.com'])['registration'];

        $this->postJson("/api/events/{$this->event->id}/attendance/mark", [
            'registration_id' => $foreign->id,
            'status' => 'attended',
        ])->assertNotFound();
    }

    public function test_bulk_mark_sets_the_status_on_every_listed_registration(): void
    {
        $ids = collect(['a', 'b', 'c'])
            ->map(fn ($k) => $this->confirmedRegistration("{$k}@t.com")->id)
            ->all();

        $this->postJson("/api/events/{$this->event->id}/attendance/bulk", [
            'registration_ids' => $ids,
            'status' => 'no_show',
            'notes' => 'never arrived',
        ])->assertOk()->assertJsonPath('processed', 3)->assertJsonPath('status', 'no_show');

        $this->assertSame(
            3,
            Registration::whereIn('id', $ids)->where('attendance_status', 'no_show')->count()
        );
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'attendance_bulk_updated',
            'event_id' => $this->event->id,
        ]);
    }

    public function test_bulk_mark_requires_a_non_empty_id_list(): void
    {
        $this->postJson("/api/events/{$this->event->id}/attendance/bulk", [
            'registration_ids' => [],
            'status' => 'attended',
        ])->assertStatus(422)->assertJsonValidationErrors('registration_ids');
    }
}
