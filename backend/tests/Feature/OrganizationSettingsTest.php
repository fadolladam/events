<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrganizationSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_governance_can_read_and_update_the_organization(): void
    {
        $org = Organization::create(['name' => 'RHB', 'slug' => 'rhb', 'timezone' => 'UTC']);
        Sanctum::actingAs(User::create([
            'name' => 'A', 'email' => 'a@x.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active', 'organization_id' => $org->id,
        ]));

        $this->getJson('/api/organization')->assertOk()->assertJsonPath('name', 'RHB');

        $this->putJson('/api/organization', [
            'name' => 'RHB Bank Berhad', 'timezone' => 'Asia/Kuala_Lumpur', 'contact_email' => 'events@rhb.com',
            'settings' => ['primary_color' => '#0067b1'],
        ])->assertOk()->assertJsonPath('name', 'RHB Bank Berhad');

        $this->assertSame('Asia/Kuala_Lumpur', $org->fresh()->timezone);
        $this->assertDatabaseHas('audit_logs', ['action' => 'organization_updated']);
    }

    public function test_organizer_cannot_update_the_organization(): void
    {
        Organization::create(['name' => 'RHB', 'slug' => 'rhb', 'timezone' => 'UTC']);
        Sanctum::actingAs(User::create([
            'name' => 'O', 'email' => 'o@x.com', 'password' => Hash::make('x'),
            'role' => 'event_organizer', 'status' => 'active',
        ]));

        $this->putJson('/api/organization', ['name' => 'Hacked'])->assertForbidden();
    }
}
