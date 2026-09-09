<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use App\Modules\Auth\AuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditTrailTest extends TestCase
{
    use RefreshDatabase;

    public function test_failed_login_is_audited_and_message_is_generic(): void
    {
        User::create([
            'name' => 'Real User',
            'email' => 'real@rhbgroup.com',
            'password' => Hash::make('correct-horse'),
            'role' => 'event_admin',
            'status' => 'active',
        ]);

        try {
            app(AuthService::class)->login('real@rhbgroup.com', 'wrong-password');
            $this->fail('Expected ValidationException');
        } catch (ValidationException $e) {
            $this->assertSame('Invalid credentials.', $e->errors()['email'][0]);
        }

        $this->assertDatabaseHas('audit_logs', ['action' => 'user_login_failed']);
    }

    public function test_unknown_email_login_is_audited_without_leaking_existence(): void
    {
        try {
            app(AuthService::class)->login('nobody@rhbgroup.com', 'whatever');
            $this->fail('Expected ValidationException');
        } catch (ValidationException $e) {
            $this->assertSame('Invalid credentials.', $e->errors()['email'][0]);
        }

        $this->assertDatabaseHas('audit_logs', ['action' => 'user_login_failed']);
    }

    public function test_event_hard_delete_is_audited(): void
    {
        $admin = User::create([
            'name' => 'Governor',
            'email' => 'gov@rhbgroup.com',
            'password' => Hash::make('x'),
            'role' => 'event_admin',
            'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $event = Event::create([
            'title' => 'Disposable',
            'slug' => 'disposable',
            'event_code' => 'DISP',
            'start_at' => now()->addDays(3),
            'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 5,
            'approval_mode' => 'automatic',
            'status' => 'draft',
        ]);

        $this->deleteJson("/api/events/{$event->id}")->assertOk();

        $this->assertDatabaseMissing('events', ['id' => $event->id]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'event_deleted',
            'entity_id' => $event->id,
        ]);
    }

    public function test_csv_export_is_audited(): void
    {
        $admin = User::create([
            'name' => 'Reporter',
            'email' => 'rep@rhbgroup.com',
            'password' => Hash::make('x'),
            'role' => 'event_admin',
            'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $event = Event::create([
            'title' => 'Reportable',
            'slug' => 'reportable',
            'event_code' => 'RPT',
            'start_at' => now()->addDays(3),
            'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 5,
            'approval_mode' => 'automatic',
            'status' => 'registration_open',
        ]);

        $this->get("/api/events/{$event->id}/export/csv")->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'report_exported',
            'entity_id' => $event->id,
        ]);
    }
}
