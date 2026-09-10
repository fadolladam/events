<?php

namespace App\Modules\CheckIn;

use App\Models\Attendance;
use App\Models\Checkin;
use App\Models\Event;
use App\Models\Registration;
use App\Models\Ticket;
use App\Modules\Audit\AuditService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckInService
{
    /**
     * Verify QR ticket code or secure token and return participant details for check-in
     */
    public function scanQr(string $eventId, string $qrData): array
    {
        // qrData can be a full ticket URL (https://domain.com/ticket/{token}) or direct token / ticket code
        $token = $qrData;
        if (str_contains($qrData, '/ticket/')) {
            $parts = explode('/ticket/', $qrData);
            $token = end($parts);
        }

        $ticket = Ticket::where(function ($q) use ($token) {
            $q->where('secure_token', $token)
                ->orWhere('ticket_code', $token);
        })->with(['registration.participant', 'registration.event'])->first();

        if (! $ticket) {
            throw ValidationException::withMessages([
                'qr' => ['Invalid ticket or QR code.'],
            ]);
        }

        if ($ticket->event_id !== $eventId) {
            throw ValidationException::withMessages([
                'qr' => ["Ticket is registered for '{$ticket->event->title}', not this event."],
            ]);
        }

        if ($ticket->status === 'revoked') {
            throw ValidationException::withMessages([
                'qr' => ['This ticket has been revoked.'],
            ]);
        }

        $registration = $ticket->registration;

        // Check if already checked in
        $lastCheckin = Checkin::where('registration_id', $registration->id)->latest()->first();

        return [
            'ticket' => $ticket,
            'registration' => $registration,
            'participant' => $registration->participant,
            'already_checked_in' => $registration->attendance_status === 'checked_in',
            'last_checkin' => $lastCheckin,
        ];
    }

    /**
     * Perform Check-In
     */
    public function performCheckIn(
        string $registrationId,
        string $eventId,
        ?int $userId = null,
        string $type = 'qr_scan',
        ?string $gate = null,
        ?string $notes = null
    ): Checkin {
        return DB::transaction(function () use ($registrationId, $eventId, $userId, $type, $gate, $notes) {
            $registration = Registration::where('id', $registrationId)->lockForUpdate()->firstOrFail();

            if ($registration->status !== 'confirmed') {
                throw ValidationException::withMessages([
                    'status' => ["Cannot check in participant with status: {$registration->status}. Participant must be Confirmed."],
                ]);
            }

            if ($registration->attendance_status === 'checked_in') {
                throw ValidationException::withMessages([
                    'checkin' => ['Participant is ALREADY checked in.'],
                ]);
            }

            // Create Checkin record
            $checkin = Checkin::create([
                'registration_id' => $registration->id,
                'event_id' => $eventId,
                'checked_in_by_user_id' => $userId,
                'checkin_type' => $type,
                'gate' => $gate,
                'notes' => $notes,
                'checked_in_at' => now(),
            ]);

            // Update registration attendance status
            $registration->update([
                'attendance_status' => 'checked_in',
                'checked_in_at' => now(),
            ]);

            // Upsert Attendance record
            Attendance::updateOrCreate(
                ['registration_id' => $registration->id],
                [
                    'event_id' => $eventId,
                    'status' => 'checked_in',
                    'notes' => $notes,
                    'updated_by_user_id' => $userId,
                ]
            );

            AuditService::log(
                action: 'checkin_created',
                entityType: 'Checkin',
                entityId: (string) $checkin->id,
                eventId: $eventId,
                newValue: [
                    'registration_number' => $registration->registration_number,
                    'checkin_type' => $type,
                    'gate' => $gate,
                ]
            );

            return $checkin->fresh(['registration.participant']);
        });
    }

    /**
     * Undo Check-In
     */
    public function undoCheckIn(string $registrationId, ?int $userId = null, string $reason = ''): Registration
    {
        return DB::transaction(function () use ($registrationId, $userId, $reason) {
            $registration = Registration::where('id', $registrationId)->lockForUpdate()->firstOrFail();

            if ($registration->attendance_status !== 'checked_in') {
                return $registration;
            }

            $registration->update([
                'attendance_status' => 'not_checked_in',
                'checked_in_at' => null,
            ]);

            // Update Attendance
            Attendance::where('registration_id', $registration->id)->update([
                'status' => 'not_checked_in',
                'notes' => 'Check-in reversed: '.$reason,
                'updated_by_user_id' => $userId,
            ]);

            AuditService::log(
                action: 'checkin_reversed',
                entityType: 'Registration',
                entityId: (string) $registration->id,
                eventId: $registration->event_id,
                newValue: ['reason' => $reason]
            );

            return $registration->fresh(['participant']);
        });
    }

    /**
     * Search participants in event for manual check-in. Returns Eloquent
     * models (not arrays) so the controller can serialize them through
     * RegistrationResource for least-privilege field filtering.
     *
     * @return Collection<int, Registration>
     */
    public function searchForCheckIn(string $eventId, string $keyword): Collection
    {
        return Registration::where('event_id', $eventId)
            ->where(function ($q) use ($keyword) {
                $q->where('registration_number', 'like', "%{$keyword}%")
                    ->orWhereHas('participant', function ($pq) use ($keyword) {
                        $pq->where('name', 'like', "%{$keyword}%")
                            ->orWhere('email', 'like', "%{$keyword}%")
                            ->orWhere('phone', 'like', "%{$keyword}%")
                            ->orWhere('employee_id', 'like', "%{$keyword}%");
                    });
            })
            ->with(['participant', 'ticket'])
            ->limit(20)
            ->get();
    }
}
