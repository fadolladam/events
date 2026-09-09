<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Event;
use App\Models\FormField;
use App\Models\RegistrationForm;
use App\Models\User;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportExportTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'A', 'email' => 'a@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]));
    }

    private function event(): Event
    {
        $e = Event::create([
            'title' => 'Export Event', 'slug' => 'export-event', 'event_code' => 'EXPEV',
            'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
            'capacity' => 50, 'approval_mode' => 'automatic', 'timezone' => 'Asia/Kuala_Lumpur',
            'status' => 'registration_open',
        ]);
        $form = RegistrationForm::create(['event_id' => $e->id, 'title' => 'F']);
        FormField::create(['form_id' => $form->id, 'field_key' => 'tshirt', 'label' => 'T-shirt', 'type' => 'select', 'options' => ['S', 'M', 'L'], 'field_order' => 5]);

        return $e;
    }

    public function test_csv_has_answer_columns_and_respects_filters(): void
    {
        $this->admin();
        $e = $this->event();
        $svc = app(RegistrationService::class);
        $svc->register($e->id, ['name' => 'Alice', 'email' => 'alice@t.com', 'department' => 'Treasury'], ['tshirt' => ['label' => 'T-shirt', 'value' => 'M']]);
        $svc->register($e->id, ['name' => 'Bob', 'email' => 'bob@t.com', 'department' => 'Retail'], ['tshirt' => ['label' => 'T-shirt', 'value' => 'L']]);

        $all = $this->get("/api/events/{$e->id}/export/csv");
        $all->assertOk();
        $body = $all->streamedContent();
        $this->assertStringContainsString('T-shirt', $body);   // answer column header
        $this->assertStringContainsString('Kuala_Lumpur', $body); // tz in the date headers
        $this->assertStringContainsString(',M', $body);
        $this->assertStringContainsString(',L', $body);

        $filtered = $this->get("/api/events/{$e->id}/export/csv?department=Treasury");
        $body2 = $filtered->streamedContent();
        $this->assertStringContainsString('Alice', $body2);
        $this->assertStringNotContainsString('Bob', $body2);

        $this->assertDatabaseHas('audit_logs', ['action' => 'report_exported']);
    }

    public function test_pdf_export_renders_and_records_the_filters(): void
    {
        $this->admin();
        $e = $this->event();
        app(RegistrationService::class)->register($e->id, ['name' => 'Alice', 'email' => 'alice@t.com', 'department' => 'Treasury'], ['tshirt' => ['label' => 'T-shirt', 'value' => 'M']]);

        $res = $this->get("/api/events/{$e->id}/export/pdf?department=Treasury");
        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('content-type'));

        $log = AuditLog::where('action', 'report_exported')->latest()->first();
        $this->assertSame('pdf', $log->new_value['format']);
        $this->assertSame('Treasury', $log->new_value['filters']['department']);
    }

    public function test_event_analytics_include_department_and_answer_summary(): void
    {
        $this->admin();
        $e = $this->event();
        $svc = app(RegistrationService::class);
        $svc->register($e->id, ['name' => 'A', 'email' => 'a1@t.com', 'department' => 'Treasury'], ['tshirt' => ['label' => 'T-shirt', 'value' => 'M']]);
        $svc->register($e->id, ['name' => 'B', 'email' => 'b1@t.com', 'department' => 'Treasury'], ['tshirt' => ['label' => 'T-shirt', 'value' => 'M']]);

        $res = $this->getJson("/api/events/{$e->id}/analytics")->assertOk();

        $dept = collect($res->json('departments'))->firstWhere('department', 'Treasury');
        $this->assertSame(2, $dept['count']);

        $summary = collect($res->json('answer_summary'))->firstWhere('field_key', 'tshirt');
        $m = collect($summary['options'])->firstWhere('value', 'M');
        $this->assertSame(2, $m['count']);
    }
}
