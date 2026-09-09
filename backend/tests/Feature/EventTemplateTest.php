<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventTemplate;
use App\Models\FormField;
use App\Models\RegistrationForm;
use App\Models\User;
use Database\Seeders\EventTemplateSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventTemplateTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'A', 'email' => 'a@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]));
    }

    public function test_seeder_is_idempotent_and_templates_carry_structure(): void
    {
        (new EventTemplateSeeder)->run();
        (new EventTemplateSeeder)->run();

        $count = EventTemplate::count();
        $this->assertGreaterThanOrEqual(8, $count);

        $t = EventTemplate::where('name', 'Blood Donation Drive')->firstOrFail();
        $this->assertSame('manual', $t->structure['defaults']['approval_mode']);
        $this->assertNotEmpty($t->structure['form_fields']);
    }

    public function test_show_returns_a_single_template(): void
    {
        $this->admin();
        (new EventTemplateSeeder)->run();
        $id = EventTemplate::first()->id;

        $this->getJson("/api/templates/{$id}")->assertOk()->assertJsonPath('id', $id);
    }

    public function test_save_as_template_snapshots_an_event_and_its_form(): void
    {
        $this->admin();
        $event = Event::create([
            'title' => 'Snap Event', 'slug' => 'snap-event', 'event_code' => 'SNAP',
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 42, 'approval_mode' => 'manual', 'duplicate_rule' => 'employee_id',
            'status' => 'draft',
        ]);
        $form = RegistrationForm::create(['event_id' => $event->id, 'title' => 'F']);
        FormField::create(['form_id' => $form->id, 'field_key' => 'shirt', 'label' => 'Shirt', 'type' => 'select', 'options' => ['S', 'M'], 'field_order' => 5]);

        $res = $this->postJson("/api/events/{$event->id}/save-as-template", ['name' => 'My Snapshot'])
            ->assertCreated();

        $tpl = EventTemplate::find($res->json('id'));
        $this->assertSame(42, $tpl->structure['defaults']['capacity']);
        $this->assertSame('manual', $tpl->structure['defaults']['approval_mode']);
        $this->assertContains('shirt', array_column($tpl->structure['form_fields'], 'field_key'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'event_template_created']);
    }

    public function test_registration_officer_cannot_save_a_template(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'O', 'email' => 'o@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'registration_officer', 'status' => 'active',
        ]));
        $event = Event::create([
            'title' => 'X', 'slug' => 'x-ev', 'event_code' => 'XEV',
            'start_at' => now()->addDay(), 'end_at' => now()->addDays(2),
            'capacity' => 5, 'approval_mode' => 'automatic', 'status' => 'draft',
        ]);

        $this->postJson("/api/events/{$event->id}/save-as-template", ['name' => 'Nope'])->assertForbidden();
    }
}
