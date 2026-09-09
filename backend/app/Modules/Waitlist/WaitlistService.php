<?php

namespace App\Modules\Waitlist;

use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationStatusHistory;
use App\Models\WaitlistHistory;
use App\Modules\Audit\AuditService;
use App\Modules\Tickets\TicketService;
use Illuminate\Support\Facades\DB;

class WaitlistService
{
    /**
     * Promotes waitlisted participants in FIFO order (by priority desc, waitlisted_at asc, seq asc)
     * when confirmed capacity becomes available.
     * Must be called inside or as an atomic database transaction.
     */
    public function promoteWaitlistedParticipants(string $eventId): array
    {
        return DB::transaction(function () use ($eventId) {
            // Lock event row
            $event = Event::where('id', $eventId)->lockForUpdate()->firstOrFail();

            $confirmedCount = Registration::where('event_id', $eventId)
                ->where('status', 'confirmed')
                ->lockForUpdate()
                ->count();

            $availableSeats = max(0, $event->capacity - $confirmedCount);

            if ($availableSeats <= 0) {
                return [];
            }

            // Retrieve eligible waitlisted registrations in strict FIFO / priority order
            $waitlistedToPromote = Registration::where('event_id', $eventId)
                ->where('status', 'waitlisted')
                ->orderBy('waitlist_priority', 'desc')
                ->orderBy('waitlisted_at', 'asc')
                ->orderBy('registration_sequence', 'asc')
                ->limit($availableSeats)
                ->lockForUpdate()
                ->get();

            $promoted = [];

            foreach ($waitlistedToPromote as $reg) {
                $oldPosition = $reg->getQueuePosition();

                $reg->update([
                    'status' => 'confirmed',
                    'confirmed_at' => now(),
                    'promoted_at' => now(),
                    'queue_position_cache' => null,
                ]);

                // Record status history
                RegistrationStatusHistory::create([
                    'registration_id' => $reg->id,
                    'event_id' => $eventId,
                    'from_status' => 'waitlisted',
                    'to_status' => 'confirmed',
                    'reason' => 'Auto-promoted from queue due to available capacity.',
                    'created_at' => now(),
                ]);

                // Record waitlist history
                WaitlistHistory::create([
                    'event_id' => $eventId,
                    'registration_id' => $reg->id,
                    'action' => 'promoted',
                    'previous_position' => $oldPosition,
                    'new_position' => null,
                    'notes' => 'Promoted to confirmed seat.',
                    'created_at' => now(),
                ]);

                // Generate QR ticket for promoted participant
                app(TicketService::class)->issueTicket($reg);

                AuditService::log(
                    action: 'participant_promoted',
                    entityType: 'Registration',
                    entityId: (string) $reg->id,
                    eventId: $eventId,
                    previousValue: ['status' => 'waitlisted', 'queue_position' => $oldPosition],
                    newValue: ['status' => 'confirmed']
                );

                $promoted[] = $reg;
            }

            return $promoted;
        });
    }

    /**
     * Update manual priority of a waitlisted registration with audit logging
     */
    public function updatePriority(string $registrationId, int $newPriority, ?string $reason = null): Registration
    {
        return DB::transaction(function () use ($registrationId, $newPriority, $reason) {
            $registration = Registration::where('id', $registrationId)->lockForUpdate()->firstOrFail();
            $oldPriority = $registration->waitlist_priority;

            $registration->update([
                'waitlist_priority' => $newPriority,
            ]);

            WaitlistHistory::create([
                'event_id' => $registration->event_id,
                'registration_id' => $registration->id,
                'action' => 'priority_updated',
                'notes' => "Priority changed from {$oldPriority} to {$newPriority}. Reason: ".($reason ?? 'Admin manual adjustment'),
                'created_at' => now(),
            ]);

            AuditService::log(
                action: 'waitlist_priority_changed',
                entityType: 'Registration',
                entityId: (string) $registration->id,
                eventId: $registration->event_id,
                previousValue: ['priority' => $oldPriority],
                newValue: ['priority' => $newPriority, 'reason' => $reason]
            );

            return $registration;
        });
    }
}
