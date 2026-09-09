<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * The first-party SPA authenticates with the Sanctum session cookie. A request
 * is treated as "from the frontend" when its Origin/Referer matches a configured
 * stateful domain — these tests set that header explicitly.
 */
class SpaSessionAuthTest extends TestCase
{
    use RefreshDatabase;

    private const PASS = 'Str0ng-Passw0rd!42';

    private function fromSpa(): static
    {
        return $this->withHeaders([
            'Origin' => 'http://localhost',
            'Referer' => 'http://localhost/login',
        ]);
    }

    private function user(): User
    {
        return User::create([
            'name' => 'SPA User',
            'email' => 'spa@rhbgroup.com',
            'password' => Hash::make(self::PASS),
            'role' => 'event_admin',
            'status' => 'active',
        ]);
    }

    public function test_spa_login_sets_a_session_and_returns_no_token(): void
    {
        $this->user();

        $res = $this->fromSpa()->postJson('/api/auth/login', [
            'email' => 'spa@rhbgroup.com',
            'password' => self::PASS,
        ]);

        $res->assertOk();
        $this->assertNull($res->json('token'), 'SPA login must not hand back a bearer token');
        $res->assertJsonPath('user.email', 'spa@rhbgroup.com');

        // The session cookie the login set now authenticates /auth/me.
        $this->fromSpa()->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.email', 'spa@rhbgroup.com');
    }

    public function test_logout_ends_the_session(): void
    {
        $this->user();
        $this->fromSpa()->postJson('/api/auth/login', ['email' => 'spa@rhbgroup.com', 'password' => self::PASS])->assertOk();
        $this->assertAuthenticated('web');

        $this->fromSpa()->postJson('/api/auth/logout')->assertOk();

        $this->assertGuest('web');
    }

    public function test_non_browser_client_still_gets_a_bearer_token(): void
    {
        $this->user();

        // No Origin/Referer -> not a frontend request -> token path, unchanged.
        $res = $this->postJson('/api/auth/login', ['email' => 'spa@rhbgroup.com', 'password' => self::PASS]);

        $res->assertOk();
        $this->assertNotNull($res->json('token'));
    }
}
