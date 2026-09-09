<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventCapacitySnapshotTest extends TestCase
{
    use RefreshDatabase;

    public function test_show_reports_available_seats_utilisation_and_over_capacity(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'A', 'email' => 'a@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]));

        $event = Event::create([
            'title' => 'Cap Event', 'slug' => 'cap-event', 'event_code' => 'CAPEV',
            'start_at' => now()->addDays(2), 'end_at' => now()->addDays(2)->addHours(2),
            'capacity' => 4, 'approval_mode' => 'automatic', 'status' => 'registration_open',
        ]);

        $svc = app(RegistrationService::class);
        foreach (['a', 'b', 'c'] as $n) {
            $svc->register($event->id, ['name' => "P{$n}", 'email' => "{$n}@t.com"]);
        }

        $res = $this->getJson("/api/events/{$event->id}")->assertOk();
        $res->assertJsonPath('available_seats', 1);
        $res->assertJsonPath('over_capacity', false);
        $res->assertJsonPath('utilisation_pct', 75);

        // Drop capacity below the confirmed count.
        $event->update(['capacity' => 2]);
        $res = $this->getJson("/api/events/{$event->id}")->assertOk();
        $res->assertJsonPath('available_seats', 0);
        $res->assertJsonPath('over_capacity', true);
        $res->assertJsonPath('utilisation_pct', 100);
    }
}
