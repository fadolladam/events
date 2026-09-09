<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\FormField;
use App\Models\Registration;
use App\Models\RegistrationForm;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegistrationImportTest extends TestCase
{
    use RefreshDatabase;

    private function officer(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'Officer', 'email' => 'o-'.uniqid().'@rhbgroup.com',
            'password' => Hash::make('x'), 'role' => 'event_admin', 'status' => 'active',
        ]));
    }

    private function event(): Event
    {
        $e = Event::create([
            'title' => 'Import Event', 'slug' => 'import-event', 'event_code' => 'IMPEV',
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 2, 'waitlist_enabled' => true, 'approval_mode' => 'automatic',
            'duplicate_rule' => 'email', 'status' => 'registration_open',
        ]);
        $form = RegistrationForm::create(['event_id' => $e->id, 'title' => 'F']);
        FormField::create(['form_id' => $form->id, 'field_key' => 'tshirt', 'label' => 'T-shirt', 'type' => 'select', 'options' => ['S', 'M', 'L'], 'is_required' => true, 'field_order' => 5]);

        return $e;
    }

    private function csv(string $body): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('import.csv', $body);
    }

    public function test_imports_rows_filling_seats_then_the_waitlist(): void
    {
        $this->officer();
        $e = $this->event();

        $res = $this->postJson("/api/events/{$e->id}/registrations/import", [
            'file' => $this->csv(
                "full_name,email,tshirt\n".
                "Alice,alice@t.com,M\n".
                "Bob,bob@t.com,large\n".      // loose option match -> L
                "Carol,carol@t.com,S\n"
            ),
        ])->assertOk();

        $res->assertJsonPath('confirmed', 2);
        $res->assertJsonPath('waitlisted', 1);
        $res->assertJsonPath('failures', []);
        $this->assertSame(3, Registration::where('event_id', $e->id)->count());
        $this->assertSame('csv_import', Registration::where('event_id', $e->id)->first()->source);
        $this->assertDatabaseHas('audit_logs', ['action' => 'registrations_imported']);
    }

    public function test_dry_run_validates_without_writing(): void
    {
        $this->officer();
        $e = $this->event();

        $res = $this->postJson("/api/events/{$e->id}/registrations/import", [
            // second row omits the required "tshirt" answer
            'file' => $this->csv("full_name,email,tshirt\nDana,dana@t.com,M\nEli,eli@t.com,\n"),
            'dry_run' => true,
        ])->assertOk();

        $res->assertJsonPath('dry_run', true);
        $this->assertNotEmpty($res->json('failures')); // Eli is missing the required t-shirt answer
        $this->assertStringContainsString('T-shirt', $res->json('failures.0'));
        $this->assertSame(0, Registration::where('event_id', $e->id)->count());
    }

    public function test_rejects_a_csv_without_full_name(): void
    {
        $this->officer();
        $e = $this->event();

        $this->postJson("/api/events/{$e->id}/registrations/import", [
            'file' => $this->csv("name,email\nX,x@t.com\n"),
        ])->assertStatus(422);
    }

    public function test_checkin_staff_cannot_import(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'Gate', 'email' => 'g-'.uniqid().'@rhbgroup.com',
            'password' => Hash::make('x'), 'role' => 'checkin_staff', 'status' => 'active',
        ]));
        $e = $this->event();

        $this->postJson("/api/events/{$e->id}/registrations/import", [
            'file' => $this->csv("full_name,email\nX,x@t.com\n"),
        ])->assertForbidden();
    }
}
