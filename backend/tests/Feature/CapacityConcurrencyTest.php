<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Registration;
use App\Modules\Registration\RegistrationService;
use App\Modules\Tickets\TicketService;
use App\Modules\Waitlist\WaitlistService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CapacityConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_capacity_limits_and_waitlist_assignment_are_strictly_enforced(): void
    {
        $event = Event::create([
            'title' => 'Test Capacity Event',
            'slug' => 'test-capacity-event',
            'event_code' => 'TEST',
            'start_at' => now()->addDays(7),
            'end_at' => now()->addDays(7)->addHours(2),
            'capacity' => 3,
            'waitlist_enabled' => true,
            'waitlist_capacity' => 5,
            'approval_mode' => 'automatic',
            'duplicate_rule' => 'email',
            'status' => 'registration_open',
        ]);

        $regService = app(RegistrationService::class);

        // Register 5 participants for 3 capacity event
        $p1 = $regService->register($event->id, ['name' => 'Alice', 'email' => 'alice@test.com']);
        $p2 = $regService->register($event->id, ['name' => 'Bob', 'email' => 'bob@test.com']);
        $p3 = $regService->register($event->id, ['name' => 'Charlie', 'email' => 'charlie@test.com']);
        $p4 = $regService->register($event->id, ['name' => 'David', 'email' => 'david@test.com']);
        $p5 = $regService->register($event->id, ['name' => 'Eve', 'email' => 'eve@test.com']);

        // Assert first 3 are confirmed
        $this->assertEquals('confirmed', $p1['registration']->status);
        $this->assertEquals('confirmed', $p2['registration']->status);
        $this->assertEquals('confirmed', $p3['registration']->status);

        // Assert 4th and 5th are waitlisted with proper FIFO queue positions
        $this->assertEquals('waitlisted', $p4['registration']->status);
        $this->assertEquals(1, $p4['queue_position']);

        $this->assertEquals('waitlisted', $p5['registration']->status);
        $this->assertEquals(2, $p5['queue_position']);

        // Assert confirmed count never exceeds 3
        $confirmedCount = Registration::where('event_id', $event->id)->where('status', 'confirmed')->count();
        $this->assertEquals(3, $confirmedCount);

        // Assert registration numbers follow permanent scheme
        $this->assertStringStartsWith('EVT-TEST-', $p1['registration']->registration_number);
        $this->assertEquals('EVT-TEST-' . date('Y') . '-000001', $p1['registration']->registration_number);
        $this->assertEquals('EVT-TEST-' . date('Y') . '-000004', $p4['registration']->registration_number);
    }
}
