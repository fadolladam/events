<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PasswordManagementTest extends TestCase
{
    use RefreshDatabase;

    private const GOOD = 'Str0ng-Passw0rd!42';

    private const GOOD2 = 'An0ther-G00d-Pass!77';

    private function user(array $overrides = []): User
    {
        return User::create(array_merge([
            'name' => 'Person',
            'email' => 'person-'.uniqid().'@rhbgroup.com',
            'password' => Hash::make(self::GOOD),
            'role' => 'event_admin',
            'status' => 'active',
        ], $overrides));
    }

    public function test_self_registration_rejects_a_weak_password(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Weak',
            'email' => 'weak@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertStatus(422);
    }

    public function test_change_password_requires_the_correct_current_password(): void
    {
        Sanctum::actingAs($this->user());

        $this->postJson('/api/auth/password', [
            'current_password' => 'not-it',
            'password' => self::GOOD2,
            'password_confirmation' => self::GOOD2,
        ])->assertStatus(422);
    }

    public function test_change_password_rejects_reusing_the_current_password(): void
    {
        Sanctum::actingAs($this->user());

        $this->postJson('/api/auth/password', [
            'current_password' => self::GOOD,
            'password' => self::GOOD,
            'password_confirmation' => self::GOOD,
        ])->assertStatus(422);
    }

    public function test_change_password_succeeds_clears_the_flag_and_revokes_other_tokens(): void
    {
        $user = $this->user(['must_change_password' => true]);
        $stale = $user->createToken('old')->accessToken;
        Sanctum::actingAs($user);

        $this->postJson('/api/auth/password', [
            'current_password' => self::GOOD,
            'password' => self::GOOD2,
            'password_confirmation' => self::GOOD2,
        ])->assertOk();

        $user->refresh();
        $this->assertTrue(Hash::check(self::GOOD2, $user->password));
        $this->assertFalse($user->must_change_password);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $stale->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user_password_changed']);
    }

    public function test_admin_created_accounts_must_change_password_by_default(): void
    {
        Sanctum::actingAs($this->user(['role' => 'super_admin']));

        $res = $this->postJson('/api/users', [
            'name' => 'New Staff',
            'email' => 'newstaff@rhbgroup.com',
            'password' => self::GOOD,
            'role' => 'checkin_staff',
        ])->assertCreated();

        $this->assertTrue(User::find($res->json('user.id'))->must_change_password);
    }

    public function test_force_password_reset_flags_the_user_and_kills_their_sessions(): void
    {
        $admin = $this->user(['role' => 'event_admin']);
        $target = $this->user(['role' => 'checkin_staff']);
        $target->createToken('live');
        Sanctum::actingAs($admin);

        $this->postJson("/api/users/{$target->id}/force-password-reset")->assertOk();

        $target->refresh();
        $this->assertTrue($target->must_change_password);
        $this->assertSame(0, $target->tokens()->count());
    }

    public function test_event_admin_cannot_force_reset_a_super_admin(): void
    {
        Sanctum::actingAs($this->user(['role' => 'event_admin']));
        $super = $this->user(['role' => 'super_admin']);

        $this->postJson("/api/users/{$super->id}/force-password-reset")->assertForbidden();
    }

    public function test_login_stamps_last_login_at(): void
    {
        $this->user(['email' => 'stamp@rhbgroup.com', 'password' => Hash::make(self::GOOD)]);

        $this->postJson('/api/auth/login', ['email' => 'stamp@rhbgroup.com', 'password' => self::GOOD])->assertOk();

        $this->assertNotNull(User::where('email', 'stamp@rhbgroup.com')->value('last_login_at'));
    }
}
