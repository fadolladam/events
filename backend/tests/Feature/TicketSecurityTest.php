<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Ticket;
use App\Modules\CheckIn\CheckInService;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class TicketSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function makeEvent(string $code): Event
    {
        return Event::create([
            'title' => "Event {$code}",
            'slug' => 'event-'.strtolower($code),
            'event_code' => $code,
            'start_at' => now()->addDays(2),
            'end_at' => now()->addDays(2)->addHours(3),
            'capacity' => 10,
            'approval_mode' => 'automatic',
            'status' => 'registration_open',
        ]);
    }

    public function test_forged_token_is_rejected(): void
    {
        $event = $this->makeEvent('FORGE');

        $this->expectException(ValidationException::class);
        app(CheckInService::class)->scanQr($event->id, 'not-a-real-token');
    }

    public function test_ticket_from_another_event_is_rejected(): void
    {
        $eventA = $this->makeEvent('AAA');
        $eventB = $this->makeEvent('BBB');

        $reg = app(RegistrationService::class)->register($eventA->id, ['name' => 'A', 'email' => 'a@t.com']);
        $token = $reg['ticket']->secure_token;

        $this->expectException(ValidationException::class);
        app(CheckInService::class)->scanQr($eventB->id, $token);
    }

    public function test_cancelling_a_registration_revokes_its_ticket_and_blocks_the_scan(): void
    {
        $event = $this->makeEvent('REVOKE');

        $result = app(RegistrationService::class)->register($event->id, ['name' => 'C', 'email' => 'c@t.com']);
        $registration = $result['registration'];
        $token = $result['ticket']->secure_token;

        app(RegistrationService::class)->cancelRegistration($registration, 'test');

        $this->assertSame('revoked', Ticket::where('secure_token', $token)->value('status'));

        $this->expectException(ValidationException::class);
        app(CheckInService::class)->scanQr($event->id, $token);
    }

    public function test_qr_payload_contains_no_participant_pii(): void
    {
        $event = $this->makeEvent('PII');

        $result = app(RegistrationService::class)->register(
            $event->id,
            ['name' => 'Secret Person', 'email' => 'secret@t.com', 'phone' => '0123456789']
        );

        $payload = $result['ticket']->qr_payload;
        $this->assertStringNotContainsString('Secret Person', $payload);
        $this->assertStringNotContainsString('secret@t.com', $payload);
        $this->assertStringNotContainsString('0123456789', $payload);
        $this->assertStringContainsString($result['ticket']->secure_token, $payload);
    }
}
