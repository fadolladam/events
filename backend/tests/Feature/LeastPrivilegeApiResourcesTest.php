<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventStaff;
use App\Models\User;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * TODO #12 — API Resources / DTOs. Registration/participant responses on the
 * check-in and attendance endpoints (the ones checkin_staff shares with
 * higher roles) must not leak contact fields the check-in UI never shows:
 * phone / country / organization. name / email / employee_id / department
 * stay visible everywhere — the QR scanner card and Attendance Roster tab
 * display them on purpose for identity verification at the door.
 */
class LeastPrivilegeApiResourcesTest extends TestCase
{
    use RefreshDatabase;

    private Event $event;

    private array $ticket;

    protected function setUp(): void
    {
        parent::setUp();

        $this->event = Event::create([
            'title' => 'Least Privilege Event', 'slug' => 'least-privilege-event', 'event_code' => 'LPEV',
            'start_at' => now()->addDay(), 'end_at' => now()->addDay()->addHours(3),
            'capacity' => 50, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);

        $result = app(RegistrationService::class)->register($this->event->id, [
            'name' => 'Priya Nair',
            'email' => 'priya@t.com',
            'phone' => '+60 12-345 6789',
            'country' => 'Malaysia',
            'employee_id' => 'EMP-001',
            'department' => 'Finance',
            'organization' => 'RHB Bank',
        ]);

        $this->ticket = ['registration' => $result['registration'], 'secure_token' => $result['ticket']->secure_token];
    }

    private function actingAsStaff(string $role): User
    {
        $user = User::create([
            'name' => $role, 'email' => "{$role}@rhbgroup.com", 'password' => Hash::make('x'),
            'role' => $role, 'status' => 'active',
        ]);

        if (! in_array($role, ['super_admin', 'event_admin'], true)) {
            EventStaff::create(['event_id' => $this->event->id, 'user_id' => $user->id, 'role' => 'organizer']);
        }

        Sanctum::actingAs($user);

        return $user;
    }

    public static function pciFields(): array
    {
        return [
            'checkin_staff' => ['checkin_staff', false],
            'registration_officer' => ['registration_officer', true],
            'event_admin' => ['event_admin', true],
        ];
    }

    #[DataProvider('pciFields')]
    public function test_scan_result_widens_participant_contact_fields_by_role(string $role, bool $expectContactFields): void
    {
        $this->actingAsStaff($role);

        $res = $this->postJson("/api/events/{$this->event->id}/checkin/scan", [
            'qr_data' => $this->ticket['secure_token'],
        ])->assertOk();

        $res->assertJsonPath('participant.name', 'Priya Nair')
            ->assertJsonPath('participant.email', 'priya@t.com')
            ->assertJsonPath('participant.employee_id', 'EMP-001')
            ->assertJsonPath('participant.department', 'Finance');

        if ($expectContactFields) {
            $res->assertJsonPath('participant.phone', '+60 12-345 6789')
                ->assertJsonPath('participant.country', 'Malaysia')
                ->assertJsonPath('participant.organization', 'RHB Bank');
        } else {
            $res->assertJsonMissingPath('participant.phone')
                ->assertJsonMissingPath('participant.country')
                ->assertJsonMissingPath('participant.organization');
        }
    }

    #[DataProvider('pciFields')]
    public function test_attendance_roster_widens_participant_contact_fields_by_role(string $role, bool $expectContactFields): void
    {
        $this->actingAsStaff($role);

        $res = $this->getJson("/api/events/{$this->event->id}/attendance")->assertOk();

        $res->assertJsonPath('data.0.participant.name', 'Priya Nair')
            ->assertJsonPath('data.0.participant.email', 'priya@t.com');

        if ($expectContactFields) {
            $res->assertJsonPath('data.0.participant.phone', '+60 12-345 6789');
        } else {
            $res->assertJsonMissingPath('data.0.participant.phone');
        }

        // Flat pagination envelope is unchanged by the switch to a resource.
        $res->assertJsonPath('total', 1)->assertJsonPath('current_page', 1);
    }

    public function test_checkin_staff_never_receives_free_text_form_answers_via_checkin_endpoints(): void
    {
        $this->actingAsStaff('checkin_staff');

        $res = $this->postJson("/api/events/{$this->event->id}/checkin/scan", [
            'qr_data' => $this->ticket['secure_token'],
        ])->assertOk();

        $res->assertJsonMissingPath('registration.answers');
    }
}
