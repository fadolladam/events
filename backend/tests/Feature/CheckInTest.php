<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Registration;
use App\Modules\CheckIn\CheckInService;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CheckInTest extends TestCase
{
    use RefreshDatabase;

    public function test_qr_scan_and_checkin_flow_with_duplicate_prevention(): void
    {
        $event = Event::create([
            'title' => 'CheckIn Test Event',
            'slug' => 'checkin-test-event',
            'event_code' => 'CKTEST',
            'start_at' => now()->addDays(2),
            'end_at' => now()->addDays(2)->addHours(4),
            'capacity' => 10,
            'approval_mode' => 'automatic',
            'status' => 'registration_open',
        ]);

        $regService = app(RegistrationService::class);
        $checkInService = app(CheckInService::class);

        $regResult = $regService->register($event->id, ['name' => 'John Doe', 'email' => 'john@test.com']);
        $registration = $regResult['registration'];
        $ticket = $regResult['ticket'];

        $this->assertNotNull($ticket);

        // 1. Scan QR Code
        $scanResult = $checkInService->scanQr($event->id, $ticket->secure_token);
        $this->assertFalse($scanResult['already_checked_in']);
        $this->assertEquals('John Doe', $scanResult['participant']->name);

        // 2. Perform Check-In
        $checkin = $checkInService->performCheckIn($registration->id, $event->id, null, 'qr_scan', 'Gate A');
        $this->assertEquals('Gate A', $checkin->gate);

        $registrationFresh = Registration::find($registration->id);
        $this->assertEquals('checked_in', $registrationFresh->attendance_status);

        // 3. Attempt Duplicate Check-In -> must throw validation exception
        $this->expectException(ValidationException::class);
        $checkInService->performCheckIn($registration->id, $event->id);
    }
}
