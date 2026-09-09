<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventStaff;
use App\Models\Registration;
use App\Models\User;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Endpoint × role authorization matrix (E§48). Every protected endpoint is
 * exercised as each staff role and unauthenticated.
 *
 * The assertion is deliberately about *authorization only*: an allowed role
 * must not be blocked with 401/403 (a downstream 404/409/422 from business
 * rules or from an earlier row in the same loop mutating state is fine); a
 * disallowed authenticated role must get exactly 403; no auth must get 401.
 *
 * Scope (event.scope) is satisfied for the non-org-wide roles by giving them
 * an event_staff row — EventScopeAuthorizationTest owns the scope edge cases.
 */
class RbacMatrixTest extends TestCase
{
    use RefreshDatabase;

    private const ROLES = [
        'super_admin', 'event_admin', 'event_organizer',
        'registration_officer', 'checkin_staff', 'viewer',
    ];

    private Event $event;

    private Registration $registration;

    /** @var array<string, User> */
    private array $users = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->event = Event::create([
            'title' => 'Matrix Event', 'slug' => 'matrix-event', 'event_code' => 'MTRX',
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 20, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);
        $this->registration = app(RegistrationService::class)
            ->register($this->event->id, ['name' => 'Row', 'email' => 'row@t.com'])['registration'];

        foreach (self::ROLES as $role) {
            $this->users[$role] = User::create([
                'name' => $role, 'email' => "{$role}@rhbgroup.com",
                'password' => Hash::make('x'), 'role' => $role, 'status' => 'active',
            ]);
        }
        $this->seedStaff();
    }

    private function seedStaff(): void
    {
        foreach (self::ROLES as $role) {
            if (in_array($role, ['super_admin', 'event_admin'], true)) {
                continue;
            }
            EventStaff::updateOrCreate(
                ['event_id' => $this->event->id, 'user_id' => $this->users[$role]->id],
                ['role' => 'organizer'],
            );
        }
    }

    #[DataProvider('matrix')]
    public function test_matrix(string $method, string $path, array $allow, array $body = []): void
    {
        $path = strtr($path, [
            '{event}' => $this->event->id,
            '{registration}' => $this->registration->id,
        ]);

        $this->json($method, $path, $body)->assertUnauthorized();

        foreach (self::ROLES as $role) {
            // Re-assert staff rows each iteration so a destructive endpoint run
            // by an earlier role (e.g. a full-team replace) can't strip the
            // scope grant out from under a later role.
            $this->seedStaff();

            Sanctum::actingAs($this->users[$role]);
            $status = $this->json($method, $path, $body)->getStatusCode();

            if (in_array($role, $allow, true)) {
                $this->assertNotContains(
                    $status, [401, 403],
                    "{$role} must not be authz-blocked on {$method} {$path}, got {$status}"
                );
            } else {
                $this->assertSame(
                    403, $status,
                    "{$role} must be forbidden on {$method} {$path}, got {$status}"
                );
            }
        }
    }

    public static function matrix(): array
    {
        $STAFF = ['super_admin', 'event_admin', 'event_organizer', 'registration_officer', 'checkin_staff', 'viewer'];
        $MANAGER = ['super_admin', 'event_admin', 'event_organizer'];
        $REG = ['super_admin', 'event_admin', 'event_organizer', 'registration_officer'];
        $CHECKIN = ['super_admin', 'event_admin', 'event_organizer', 'registration_officer', 'checkin_staff'];
        $GOV = ['super_admin', 'event_admin'];

        return [
            'dashboard overview' => ['GET', '/api/dashboard/overview', $STAFF],
            'events list' => ['GET', '/api/events', $STAFF],
            'event show' => ['GET', '/api/events/{event}', $STAFF],
            'templates list' => ['GET', '/api/templates', $STAFF],
            'form show' => ['GET', '/api/events/{event}/form', $STAFF],
            'event update' => ['PUT', '/api/events/{event}', $MANAGER, ['title' => 'Renamed']],
            'event status' => ['PATCH', '/api/events/{event}/status', $MANAGER, ['status' => 'registration_closed']],
            'form update' => ['PUT', '/api/events/{event}/form', $MANAGER, ['fields' => []]],
            'staff list' => ['GET', '/api/events/{event}/staff', $MANAGER],
            'staff sync' => ['PUT', '/api/events/{event}/staff', $MANAGER, ['staff' => []]],
            'save as template' => ['POST', '/api/events/{event}/save-as-template', $MANAGER, ['name' => 'T']],
            'csv export' => ['GET', '/api/events/{event}/export/csv', $MANAGER],
            'registrations list' => ['GET', '/api/events/{event}/registrations', $REG],
            'manual registration' => ['POST', '/api/events/{event}/registrations', $REG, ['name' => 'M', 'email' => 'matrix-manual@t.com']],
            'approve registration' => ['POST', '/api/registrations/{registration}/approve', $REG],
            'waitlist list' => ['GET', '/api/events/{event}/waitlist', $REG],
            'participants list' => ['GET', '/api/participants', $REG],
            'checkin search' => ['GET', '/api/events/{event}/checkin/search?q=row', $CHECKIN],
            'attendance list' => ['GET', '/api/events/{event}/attendance', $CHECKIN],
            'attendance bulk' => ['POST', '/api/events/{event}/attendance/bulk', $CHECKIN, ['registration_ids' => [], 'status' => 'attended']],
            'event delete' => ['DELETE', '/api/events/{event}', $GOV],
            'audit logs' => ['GET', '/api/audit-logs', $GOV],
            'users list' => ['GET', '/api/users', $GOV],
            'health' => ['GET', '/api/health', $GOV],
            'organization' => ['GET', '/api/organization', $GOV],
        ];
    }
}
