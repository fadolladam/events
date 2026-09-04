<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Registration;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaitlistPromotionTest extends TestCase
{
    use RefreshDatabase;

    public function test_waitlisted_participant_is_automatically_promoted_when_confirmed_participant_cancels(): void
    {
        $event = Event::create([
            'title' => 'Waitlist Test Event',
            'slug' => 'waitlist-test-event',
            'event_code' => 'WLTEST',
            'start_at' => now()->addDays(5),
            'end_at' => now()->addDays(5)->addHours(3),
            'capacity' => 2,
            'waitlist_enabled' => true,
            'approval_mode' => 'automatic',
            'duplicate_rule' => 'email',
            'status' => 'registration_open',
        ]);

        $regService = app(RegistrationService::class);

        // Register A (confirmed), B (confirmed), C (waitlisted #1), D (waitlisted #2)
        $a = $regService->register($event->id, ['name' => 'User A', 'email' => 'a@test.com'])['registration'];
        $b = $regService->register($event->id, ['name' => 'User B', 'email' => 'b@test.com'])['registration'];
        $c = $regService->register($event->id, ['name' => 'User C', 'email' => 'c@test.com'])['registration'];
        $d = $regService->register($event->id, ['name' => 'User D', 'email' => 'd@test.com'])['registration'];

        $this->assertEquals('confirmed', $a->status);
        $this->assertEquals('confirmed', $b->status);
        $this->assertEquals('waitlisted', $c->status);
        $this->assertEquals('waitlisted', $d->status);

        $initialCNumber = $c->registration_number;

        // Cancel B
        $regService->cancelRegistration($b);

        // Check B is cancelled
        $bFresh = Registration::find($b->id);
        $this->assertEquals('cancelled', $bFresh->status);

        // Check C is now auto-promoted to Confirmed
        $cFresh = Registration::find($c->id);
        $this->assertEquals('confirmed', $cFresh->status);
        $this->assertNotNull($cFresh->confirmed_at);
        // Registration number must remain permanent and unchanged
        $this->assertEquals($initialCNumber, $cFresh->registration_number);

        // Check D is now Queue #1
        $dFresh = Registration::find($d->id);
        $this->assertEquals('waitlisted', $dFresh->status);
        $this->assertEquals(1, $dFresh->getQueuePosition());
    }
}
