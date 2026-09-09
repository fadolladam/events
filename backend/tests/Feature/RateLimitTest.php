<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Route-level `throttle:` middleware trips with a 429 once the per-minute
 * budget is spent (E§48). These are the named-route limits, distinct from the
 * application-level login lockout in LoginThrottleTest.
 */
class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('');
        app('cache')->flush();
    }

    public function test_public_registration_endpoint_is_capped_at_five_per_minute(): void
    {
        // throttle:5,1 — the 6th call in the window is rejected before the
        // controller runs, regardless of the (invalid) body.
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/register', [])->assertStatus(422);
        }

        $this->postJson('/api/auth/register', [])->assertStatus(429);
    }

    public function test_csv_export_is_capped_at_twenty_per_minute_per_user(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'Admin', 'email' => 'admin@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]));

        $event = Event::create([
            'title' => 'Export Event', 'slug' => 'export-event', 'event_code' => 'EXPT',
            'start_at' => now()->addDay(), 'end_at' => now()->addDay()->addHour(),
            'capacity' => 10, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);

        for ($i = 0; $i < 20; $i++) {
            $this->get("/api/events/{$event->id}/export/csv")->assertOk();
        }

        $this->get("/api/events/{$event->id}/export/csv")->assertStatus(429);
    }

    public function test_the_limit_is_scoped_per_user_not_global(): void
    {
        $event = Event::create([
            'title' => 'Shared Event', 'slug' => 'shared-event', 'event_code' => 'SHRD',
            'start_at' => now()->addDay(), 'end_at' => now()->addDay()->addHour(),
            'capacity' => 10, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);

        $one = User::create([
            'name' => 'One', 'email' => 'one@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]);
        $two = User::create([
            'name' => 'Two', 'email' => 'two@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]);

        Sanctum::actingAs($one);
        for ($i = 0; $i < 20; $i++) {
            $this->get("/api/events/{$event->id}/export/csv")->assertOk();
        }
        $this->get("/api/events/{$event->id}/export/csv")->assertStatus(429);

        // A different user still has a full budget.
        Sanctum::actingAs($two);
        $this->get("/api/events/{$event->id}/export/csv")->assertOk();
    }
}
