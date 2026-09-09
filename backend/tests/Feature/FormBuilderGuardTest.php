<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FormBuilderGuardTest extends TestCase
{
    use RefreshDatabase;

    private function event(): Event
    {
        Sanctum::actingAs(User::create([
            'name' => 'A', 'email' => 'a@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]));

        return Event::create([
            'title' => 'FB Event', 'slug' => 'fb-event', 'event_code' => 'FBEV',
            'start_at' => now()->addDays(2), 'end_at' => now()->addDays(2)->addHours(2),
            'capacity' => 10, 'approval_mode' => 'automatic', 'status' => 'draft',
        ]);
    }

    public function test_duplicate_field_keys_are_rejected(): void
    {
        $e = $this->event();

        $this->putJson("/api/events/{$e->id}/form", ['fields' => [
            ['field_key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'is_required' => true],
            ['field_key' => 'email', 'label' => 'Email', 'type' => 'email', 'is_required' => true],
            ['field_key' => 'size', 'label' => 'Shirt size', 'type' => 'text'],
            ['field_key' => 'Size', 'label' => 'Duplicate', 'type' => 'text'],
        ]])->assertStatus(422);
    }

    public function test_a_clean_form_saves(): void
    {
        $e = $this->event();

        $this->putJson("/api/events/{$e->id}/form", ['fields' => [
            ['field_key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'is_required' => true],
            ['field_key' => 'email', 'label' => 'Email', 'type' => 'email', 'is_required' => true],
            ['field_key' => 'size', 'label' => 'Shirt size', 'type' => 'select', 'options' => ['S', 'M', 'L']],
        ]])->assertOk();

        $this->assertDatabaseHas('form_fields', ['field_key' => 'size', 'type' => 'select']);
    }
}
