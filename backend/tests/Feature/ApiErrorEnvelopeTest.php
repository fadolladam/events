<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiErrorEnvelopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_is_a_clean_envelope(): void
    {
        $this->getJson('/api/events')
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Unauthenticated.', 'code' => 'unauthenticated']);
    }

    public function test_validation_error_keeps_errors_and_adds_a_code(): void
    {
        $res = $this->postJson('/api/auth/login', ['email' => 'not-an-email'])->assertStatus(422);
        $res->assertJsonPath('code', 'validation_error');
        $res->assertJsonStructure(['message', 'code', 'errors' => ['email', 'password']]);
    }

    public function test_not_found_is_generic(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'A', 'email' => 'a@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]));

        $this->getJson('/api/events/00000000-0000-0000-0000-000000000000')
            ->assertNotFound()
            ->assertJsonPath('code', 'not_found')
            ->assertJsonPath('message', 'The requested resource was not found.');
    }

    public function test_forbidden_from_role_tier_has_a_code(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'V', 'email' => 'v@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'checkin_staff', 'status' => 'active',
        ]));
        $e = Event::create([
            'title' => 'X', 'slug' => 'x-ev', 'event_code' => 'XEV',
            'start_at' => now()->addDay(), 'end_at' => now()->addDays(2),
            'capacity' => 5, 'approval_mode' => 'automatic', 'status' => 'draft',
        ]);

        $this->deleteJson("/api/events/{$e->id}")->assertForbidden()->assertJsonStructure(['message', 'code']);
    }

    public function test_a_500_never_leaks_details_in_production_mode(): void
    {
        config(['app.debug' => false]);
        // Force an unexpected throwable from a bound route.
        \Route::get('/api/_boom', fn () => throw new \RuntimeException('secret internal detail'))
            ->middleware('auth:sanctum');

        Sanctum::actingAs(User::create([
            'name' => 'A', 'email' => 'b@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]));

        $res = $this->getJson('/api/_boom')->assertStatus(500);
        $res->assertJsonPath('code', 'server_error');
        $this->assertStringNotContainsString('secret internal detail', $res->getContent());
    }
}
