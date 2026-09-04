<?php

namespace App\Modules\Registration;

use App\Models\Event;
use App\Models\Participant;
use App\Models\Registration;
use App\Models\RegistrationAnswer;
use App\Models\RegistrationStatusHistory;
use App\Models\WaitlistHistory;
use App\Modules\Audit\AuditService;
use App\Modules\Tickets\TicketService;
use App\Modules\Waitlist\WaitlistService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RegistrationService
{
    public function __construct(
        protected TicketService $ticketService,
        protected WaitlistService $waitlistService
    ) {}

    /**
     * Concurrency-safe atomic participant registration.
     * Enforces strict capacity boundaries with row-level locking.
     */
    public function register(string $eventId, array $participantData, array $formAnswers = [], ?string $source = null): array
    {
        return DB::transaction(function () use ($eventId, $participantData, $formAnswers, $source) {
            // Lock event row
            $event = Event::where('id', $eventId)->lockForUpdate()->firstOrFail();

            // 1. Verify Event Registration Availability
            $dynamicStatus = $event->calculateDynamicStatus();
            if (in_array($dynamicStatus, ['draft', 'registration_closed', 'completed', 'cancelled', 'archived'])) {
                throw ValidationException::withMessages([
                    'event' => ["Registration is currently closed for this event ({$dynamicStatus})."],
                ]);
            }

            // 2. Duplicate Detection
            $this->checkDuplicateRegistration($event, $participantData);

            // 3. Find or Create Participant
            $participant = Participant::where('email', $participantData['email'])->first();
            if (!$participant) {
                $participant = Participant::create([
                    'name' => $participantData['name'],
                    'email' => $participantData['email'],
                    'phone' => $participantData['phone'] ?? null,
                    'country' => $participantData['country'] ?? null,
                    'employee_id' => $participantData['employee_id'] ?? null,
                    'department' => $participantData['department'] ?? null,
                    'organization' => $participantData['organization'] ?? null,
                ]);
            } else {
                $participant->update(array_filter([
                    'name' => $participantData['name'],
                    'phone' => $participantData['phone'] ?? $participant->phone,
                    'employee_id' => $participantData['employee_id'] ?? $participant->employee_id,
                    'department' => $participantData['department'] ?? $participant->department,
                ]));
            }

            // 4. Atomic Registration Sequence Generation
            $lastSequence = Registration::where('event_id', $eventId)
                ->lockForUpdate()
                ->max('registration_sequence') ?? 0;
            $sequence = $lastSequence + 1;

            $year = date('Y', strtotime($event->start_at ?? now()));
            $eventCode = $event->event_code;
            $seqFormatted = str_pad((string) $sequence, 6, '0', STR_PAD_LEFT);
            $registrationNumber = "EVT-{$eventCode}-{$year}-{$seqFormatted}";

            // 5. Concurrency-Safe Capacity & Status Calculation
            $confirmedCount = Registration::where('event_id', $eventId)
                ->where('status', 'confirmed')
                ->lockForUpdate()
                ->count();

            $status = 'pending';
            $confirmedAt = null;
            $waitlistedAt = null;

            if ($event->approval_mode === 'manual') {
                $status = 'pending';
            } else {
                if ($confirmedCount < $event->capacity) {
                    $status = 'confirmed';
                    $confirmedAt = now();
                } elseif ($event->waitlist_enabled) {
                    $waitlistedCount = Registration::where('event_id', $eventId)
                        ->where('status', 'waitlisted')
                        ->lockForUpdate()
                        ->count();

                    if ($event->waitlist_capacity !== null && $waitlistedCount >= $event->waitlist_capacity) {
                        throw ValidationException::withMessages([
                            'capacity' => ['This event and its waitlist have reached maximum capacity.'],
                        ]);
                    }

                    $status = 'waitlisted';
                    $waitlistedAt = now();
                } else {
                    throw ValidationException::withMessages([
                        'capacity' => ['This event is fully booked.'],
                    ]);
                }
            }

            $secureAccessToken = Str::random(48);

            // 6. Create Registration
            $registration = Registration::create([
                'event_id' => $eventId,
                'participant_id' => $participant->id,
                'registration_number' => $registrationNumber,
                'registration_sequence' => $sequence,
                'status' => $status,
                'attendance_status' => 'not_checked_in',
                'source' => $source ?? 'direct',
                'secure_access_token' => $secureAccessToken,
                'registered_at' => now(),
                'confirmed_at' => $confirmedAt,
                'waitlisted_at' => $waitlistedAt,
            ]);

            // 7. Store Dynamic Form Answers
            foreach ($formAnswers as $key => $val) {
                RegistrationAnswer::create([
                    'registration_id' => $registration->id,
                    'field_key' => $key,
                    'field_label' => $val['label'] ?? $key,
                    'value_text' => is_string($val['value'] ?? null) ? $val['value'] : (is_scalar($val['value'] ?? null) ? (string) $val['value'] : null),
                    'value_json' => is_array($val['value'] ?? null) ? $val['value'] : null,
                ]);
            }

            // 8. Record Initial History
            RegistrationStatusHistory::create([
                'registration_id' => $registration->id,
                'event_id' => $eventId,
                'to_status' => $status,
                'reason' => 'Initial registration submission.',
                'created_at' => now(),
            ]);

            if ($status === 'waitlisted') {
                $queuePos = $registration->getQueuePosition();
                WaitlistHistory::create([
                    'event_id' => $eventId,
                    'registration_id' => $registration->id,
                    'action' => 'joined_queue',
                    'new_position' => $queuePos,
                    'notes' => "Joined waitlist at position #{$queuePos}.",
                    'created_at' => now(),
                ]);
            }

            // 9. Issue Ticket if Confirmed
            $ticket = null;
            if ($status === 'confirmed') {
                $ticket = $this->ticketService->issueTicket($registration);
            }

            AuditService::log(
                action: 'registration_created',
                entityType: 'Registration',
                entityId: (string) $registration->id,
                eventId: $eventId,
                newValue: [
                    'registration_number' => $registrationNumber,
                    'status' => $status,
                    'participant_email' => $participant->email,
                ]
            );

            return [
                'registration' => $registration->fresh(['participant', 'ticket', 'answers']),
                'queue_position' => $status === 'waitlisted' ? $registration->getQueuePosition() : null,
                'ticket' => $ticket,
            ];
        });
    }

    /**
     * Cancel a registration (by participant or admin).
     * Automatically promotes the next waitlisted person in FIFO order.
     */
    public function cancelRegistration(Registration $registration, string $reason = 'Participant requested cancellation'): Registration
    {
        return DB::transaction(function () use ($registration, $reason) {
            $registration = Registration::where('id', $registration->id)->lockForUpdate()->firstOrFail();
            $oldStatus = $registration->status;

            if ($oldStatus === 'cancelled') {
                return $registration;
            }

            $registration->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ]);

            RegistrationStatusHistory::create([
                'registration_id' => $registration->id,
                'event_id' => $registration->event_id,
                'from_status' => $oldStatus,
                'to_status' => 'cancelled',
                'reason' => $reason,
                'created_at' => now(),
            ]);

            if ($oldStatus === 'waitlisted') {
                WaitlistHistory::create([
                    'event_id' => $registration->event_id,
                    'registration_id' => $registration->id,
                    'action' => 'cancelled',
                    'notes' => 'Left waiting list.',
                    'created_at' => now(),
                ]);
            }

            AuditService::log(
                action: 'registration_cancelled',
                entityType: 'Registration',
                entityId: (string) $registration->id,
                eventId: $registration->event_id,
                previousValue: ['status' => $oldStatus],
                newValue: ['status' => 'cancelled', 'reason' => $reason]
            );

            // If a confirmed registration cancelled, immediately trigger waitlist auto-promotion
            if ($oldStatus === 'confirmed') {
                $this->waitlistService->promoteWaitlistedParticipants($registration->event_id);
            }

            return $registration->fresh(['participant', 'ticket']);
        });
    }

    /**
     * Check duplicate registration according to event configuration
     */
    protected function checkDuplicateRegistration(Event $event, array $data): void
    {
        if ($event->duplicate_rule === 'none') {
            return;
        }

        $query = Registration::where('event_id', $event->id)
            ->whereNotIn('status', ['cancelled', 'rejected']);

        if ($event->duplicate_rule === 'email') {
            $email = $data['email'];
            $exists = $query->whereHas('participant', fn($q) => $q->where('email', $email))->exists();
            if ($exists) {
                throw ValidationException::withMessages([
                    'email' => ['You have already registered for this event with this email address.'],
                ]);
            }
        }

        if ($event->duplicate_rule === 'phone' && !empty($data['phone'])) {
            $phone = $data['phone'];
            $exists = $query->whereHas('participant', fn($q) => $q->where('phone', $phone))->exists();
            if ($exists) {
                throw ValidationException::withMessages([
                    'phone' => ['You have already registered for this event with this phone number.'],
                ]);
            }
        }

        if ($event->duplicate_rule === 'employee_id' && !empty($data['employee_id'])) {
            $empId = $data['employee_id'];
            $exists = $query->whereHas('participant', fn($q) => $q->where('employee_id', $empId))->exists();
            if ($exists) {
                throw ValidationException::withMessages([
                    'employee_id' => ['You have already registered for this event with this Employee ID.'],
                ]);
            }
        }
    }
}
