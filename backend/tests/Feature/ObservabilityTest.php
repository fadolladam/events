<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Audit\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ObservabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_response_carries_a_request_id_header(): void
    {
        $res = $this->getJson('/api/public/events')->assertOk();
        $this->assertNotEmpty($res->headers->get('X-Request-Id'));
    }

    public function test_incoming_request_id_is_echoed_back(): void
    {
        $res = $this->withHeader('X-Request-Id', 'abc-123')->getJson('/api/public/events');
        $this->assertSame('abc-123', $res->headers->get('X-Request-Id'));
    }

    public function test_audit_entries_mirror_to_the_audit_and_security_logs(): void
    {
        $sink = \Mockery::mock();
        $sink->shouldReceive('info')->atLeast()->once();
        $sink->shouldReceive('warning')->atLeast()->once();

        Log::shouldReceive('shareContext')->andReturnNull();
        Log::shouldReceive('channel')->with('audit')->andReturn($sink);
        Log::shouldReceive('channel')->with('security')->andReturn($sink);
        Log::shouldReceive('channel')->andReturn($sink); // any other channel

        AuditService::log(action: 'user_login_failed', entityType: 'User', newValue: ['email' => 'x@y.com']);

        $this->assertDatabaseHas('audit_logs', ['action' => 'user_login_failed']);
    }

    public function test_health_endpoint_reports_dependencies_for_governance(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'A', 'email' => 'a@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]));

        $res = $this->getJson('/api/health')->assertOk();
        $res->assertJsonPath('status', 'ok');
        $res->assertJsonPath('checks.database.ok', true);
        $res->assertJsonStructure(['status', 'checks' => ['database', 'cache'], 'signals' => ['login_failures_1h', 'lockouts_1h']]);
    }

    public function test_health_endpoint_is_governance_only(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'O', 'email' => 'o@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_organizer', 'status' => 'active',
        ]));

        $this->getJson('/api/health')->assertForbidden();
    }
}
