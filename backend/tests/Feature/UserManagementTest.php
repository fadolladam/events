<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role, array $o = []): User
    {
        return User::create(array_merge([
            'name' => ucfirst($role), 'email' => $role.'-'.uniqid().'@rhbgroup.com',
            'password' => Hash::make('x'), 'role' => $role, 'status' => 'active',
        ], $o));
    }

    public function test_event_admin_can_edit_name_role_and_status(): void
    {
        Sanctum::actingAs($this->user('event_admin'));
        $target = $this->user('checkin_staff');

        $this->patchJson("/api/users/{$target->id}", ['name' => 'Renamed', 'role' => 'registration_officer', 'status' => 'inactive'])
            ->assertOk();

        $target->refresh();
        $this->assertSame('Renamed', $target->name);
        $this->assertSame('registration_officer', $target->role);
        $this->assertSame('inactive', $target->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user_updated']);
    }

    public function test_deactivating_a_user_drops_their_tokens(): void
    {
        Sanctum::actingAs($this->user('event_admin'));
        $target = $this->user('viewer');
        $target->createToken('live');

        $this->patchJson("/api/users/{$target->id}", ['status' => 'inactive'])->assertOk();
        $this->assertSame(0, $target->tokens()->count());
    }

    public function test_event_admin_cannot_touch_a_super_admin_or_grant_super_admin(): void
    {
        Sanctum::actingAs($this->user('event_admin'));
        $super = $this->user('super_admin');
        $other = $this->user('viewer');

        $this->patchJson("/api/users/{$super->id}", ['name' => 'x'])->assertStatus(403);
        $this->patchJson("/api/users/{$other->id}", ['role' => 'super_admin'])->assertStatus(403);
    }

    public function test_cannot_deactivate_or_re_role_yourself(): void
    {
        $me = $this->user('event_admin');
        Sanctum::actingAs($me);

        $this->patchJson("/api/users/{$me->id}", ['status' => 'inactive'])->assertStatus(422);
        $this->patchJson("/api/users/{$me->id}", ['role' => 'viewer'])->assertStatus(422);
        $this->patchJson("/api/users/{$me->id}", ['name' => 'Fine'])->assertOk();
    }

    public function test_organizer_cannot_reach_user_management(): void
    {
        Sanctum::actingAs($this->user('event_organizer'));
        $this->patchJson('/api/users/1', ['name' => 'x'])->assertForbidden();
    }
}
