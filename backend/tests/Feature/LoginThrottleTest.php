<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class LoginThrottleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('login:victim@rhbgroup.com|127.0.0.1');
    }

    public function test_repeated_failures_lock_the_account_out_with_429(): void
    {
        User::create([
            'name' => 'Victim',
            'email' => 'victim@rhbgroup.com',
            'password' => Hash::make('the-real-password'),
            'role' => 'event_admin',
            'status' => 'active',
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'victim@rhbgroup.com',
                'password' => 'wrong',
            ])->assertStatus(422);
        }

        // 6th attempt — even with the CORRECT password — is locked out.
        $this->postJson('/api/auth/login', [
            'email' => 'victim@rhbgroup.com',
            'password' => 'the-real-password',
        ])->assertStatus(429);

        $this->assertDatabaseHas('audit_logs', ['action' => 'user_login_locked_out']);
    }

    public function test_a_successful_login_clears_the_counter(): void
    {
        User::create([
            'name' => 'Victim',
            'email' => 'victim@rhbgroup.com',
            'password' => Hash::make('the-real-password'),
            'role' => 'event_admin',
            'status' => 'active',
        ]);

        $this->postJson('/api/auth/login', ['email' => 'victim@rhbgroup.com', 'password' => 'wrong'])->assertStatus(422);
        $this->postJson('/api/auth/login', ['email' => 'victim@rhbgroup.com', 'password' => 'the-real-password'])->assertOk();

        $this->assertSame(0, RateLimiter::attempts('login:victim@rhbgroup.com|127.0.0.1'));
    }
}
