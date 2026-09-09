<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Modules\Events\EventService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class EventStatusTransitionTest extends TestCase
{
    use RefreshDatabase;

    private function makeEvent(string $status): Event
    {
        return Event::create([
            'title' => 'Lifecycle Event',
            'slug' => 'lifecycle-event-'.$status,
            'event_code' => 'LC'.strtoupper(substr($status, 0, 4)),
            'start_at' => now()->addDays(5),
            'end_at' => now()->addDays(5)->addHours(3),
            'capacity' => 10,
            'approval_mode' => 'automatic',
            'status' => $status,
        ]);
    }

    public function test_valid_transition_is_applied(): void
    {
        $event = $this->makeEvent('registration_open');

        $updated = app(EventService::class)->changeStatus($event, 'registration_closed');

        $this->assertEquals('registration_closed', $updated->status);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'event_status_changed',
            'entity_id' => $event->id,
        ]);
    }

    public function test_invalid_transition_is_rejected(): void
    {
        $event = $this->makeEvent('completed');

        $this->expectException(ValidationException::class);
        app(EventService::class)->changeStatus($event, 'registration_open');
    }

    public function test_no_op_transition_is_allowed(): void
    {
        $event = $this->makeEvent('draft');

        $updated = app(EventService::class)->changeStatus($event, 'draft');

        $this->assertEquals('draft', $updated->status);
    }

    public function test_update_payload_cannot_smuggle_an_invalid_status(): void
    {
        $event = $this->makeEvent('completed');

        $this->expectException(ValidationException::class);
        app(EventService::class)->updateEvent($event, ['status' => 'draft']);
    }
}
