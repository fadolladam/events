<?php

namespace App\Modules\Events;

use App\Models\Event;
use App\Models\EventStaff;
use App\Models\FormField;
use App\Models\RegistrationForm;
use App\Modules\Audit\AuditService;
use App\Modules\Waitlist\WaitlistService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EventService
{
    /**
     * Allowed status transitions. A status may always stay unchanged; any other
     * move must appear in this map. Keeps the lifecycle consistent everywhere
     * (admin console, dashboard, registration validation, reports).
     */
    private const STATUS_TRANSITIONS = [
        'draft' => ['upcoming', 'registration_open', 'cancelled', 'archived'],
        'upcoming' => ['draft', 'registration_open', 'registration_closed', 'ongoing', 'cancelled', 'archived'],
        'registration_open' => ['full', 'registration_closed', 'upcoming', 'ongoing', 'cancelled', 'archived'],
        'full' => ['registration_open', 'registration_closed', 'ongoing', 'cancelled', 'archived'],
        'registration_closed' => ['registration_open', 'ongoing', 'completed', 'cancelled', 'archived'],
        'ongoing' => ['registration_closed', 'completed', 'cancelled', 'archived'],
        'completed' => ['archived', 'ongoing'],
        'cancelled' => ['draft', 'archived'],
        'archived' => ['draft'],
    ];

    public function createEvent(array $data, ?int $userId = null): Event
    {
        return DB::transaction(function () use ($data, $userId) {
            $slug = Str::slug($data['title']);
            $originalSlug = $slug;
            $counter = 1;
            while (Event::where('slug', $slug)->exists()) {
                $slug = "{$originalSlug}-{$counter}";
                $counter++;
            }
            $data['slug'] = $slug;

            // Generate uppercase event code if not provided
            if (empty($data['event_code'])) {
                $codePrefix = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $data['title']), 0, 4));
                $codeYear = date('y');
                $eventCode = "{$codePrefix}{$codeYear}";
                $codeCounter = 1;
                while (Event::where('event_code', $eventCode)->exists()) {
                    $eventCode = "{$codePrefix}{$codeYear}-{$codeCounter}";
                    $codeCounter++;
                }
                $data['event_code'] = $eventCode;
            } else {
                $data['event_code'] = strtoupper($data['event_code']);
            }

            $data['created_by'] = $userId;
            $data['owner_user_id'] = $data['owner_user_id'] ?? $userId;

            // An "upcoming" event whose registration window never opens would be
            // reported as already open by calculateDynamicStatus(). Default the
            // opening time to the event start so the status resolves correctly.
            if (($data['status'] ?? null) === 'upcoming' && empty($data['registration_open_at']) && ! empty($data['start_at'])) {
                $data['registration_open_at'] = $data['start_at'];
            }

            $event = Event::create($data);

            // Create default registration form for this event
            $form = RegistrationForm::create([
                'event_id' => $event->id,
                'title' => 'Event Registration',
                'description' => 'Please fill in your details to register.',
                'is_active' => true,
            ]);

            // Add standard default form fields
            $defaultFields = [
                ['field_key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'is_required' => true, 'field_order' => 1],
                ['field_key' => 'email', 'label' => 'Email Address', 'type' => 'email', 'is_required' => true, 'field_order' => 2],
                ['field_key' => 'phone', 'label' => 'Phone Number', 'type' => 'phone', 'is_required' => false, 'field_order' => 3],
            ];

            foreach ($defaultFields as $fieldData) {
                FormField::create(array_merge($fieldData, ['form_id' => $form->id]));
            }

            // Assign creator as event owner in event_staff
            if ($userId) {
                EventStaff::create([
                    'event_id' => $event->id,
                    'user_id' => $userId,
                    'role' => 'owner',
                ]);
            }

            AuditService::log(
                action: 'event_created',
                entityType: 'Event',
                entityId: (string) $event->id,
                eventId: $event->id,
                newValue: ['title' => $event->title, 'code' => $event->event_code, 'capacity' => $event->capacity]
            );

            return $event->fresh(['category', 'form.fields']);
        });
    }

    public function updateEvent(Event $event, array $data): Event
    {
        return DB::transaction(function () use ($event, $data) {
            $previous = $event->toArray();
            $oldCapacity = $event->capacity;

            // A status change slipped in through the generic update payload must
            // obey the same lifecycle rules as the dedicated status endpoint.
            if (array_key_exists('status', $data) && $data['status'] !== $event->status) {
                $allowed = self::STATUS_TRANSITIONS[$event->status] ?? [];
                if (! in_array($data['status'], $allowed, true)) {
                    throw ValidationException::withMessages([
                        'status' => ["An event cannot move from \"{$event->status}\" to \"{$data['status']}\"."],
                    ]);
                }
            }

            $event->update($data);

            AuditService::log(
                action: 'event_updated',
                entityType: 'Event',
                entityId: (string) $event->id,
                eventId: $event->id,
                previousValue: $previous,
                newValue: $event->fresh()->toArray()
            );

            // Check if capacity increased and waitlist promotions are needed
            if (isset($data['capacity']) && $data['capacity'] > $oldCapacity) {
                app(WaitlistService::class)->promoteWaitlistedParticipants($event->id);
            }

            return $event->fresh(['category', 'form.fields']);
        });
    }

    public function duplicateEvent(Event $sourceEvent, ?int $userId = null): Event
    {
        return DB::transaction(function () use ($sourceEvent, $userId) {
            $data = $sourceEvent->replicate(['id', 'slug', 'event_code', 'created_at', 'updated_at', 'published_at', 'archived_at'])->toArray();
            $data['title'] = $sourceEvent->title.' (Copy)';
            $data['status'] = 'draft';

            $newEvent = $this->createEvent($data, $userId);

            // Copy custom form fields from source form
            if ($sourceEvent->form) {
                $newForm = $newEvent->form;
                $newForm->fields()->delete(); // Clear defaults

                foreach ($sourceEvent->form->fields as $field) {
                    $newFieldData = $field->replicate(['id', 'form_id', 'created_at', 'updated_at'])->toArray();
                    $newFieldData['form_id'] = $newForm->id;
                    FormField::create($newFieldData);
                }
            }

            AuditService::log(
                action: 'event_duplicated',
                entityType: 'Event',
                entityId: (string) $newEvent->id,
                eventId: $newEvent->id,
                newValue: ['source_event_id' => $sourceEvent->id, 'new_event_id' => $newEvent->id]
            );

            return $newEvent->fresh(['category', 'form.fields']);
        });
    }

    public function changeStatus(Event $event, string $newStatus): Event
    {
        $oldStatus = $event->status;

        if ($oldStatus !== $newStatus) {
            $allowed = self::STATUS_TRANSITIONS[$oldStatus] ?? [];
            if (! in_array($newStatus, $allowed, true)) {
                throw ValidationException::withMessages([
                    'status' => ["An event cannot move from \"{$oldStatus}\" to \"{$newStatus}\"."],
                ]);
            }
        }

        $event->status = $newStatus;

        if ($newStatus === 'registration_open' && ! $event->published_at) {
            $event->published_at = now();
        }

        if ($newStatus === 'archived') {
            $event->archived_at = now();
        }

        $event->save();

        AuditService::log(
            action: 'event_status_changed',
            entityType: 'Event',
            entityId: (string) $event->id,
            eventId: $event->id,
            previousValue: ['status' => $oldStatus],
            newValue: ['status' => $newStatus]
        );

        return $event;
    }
}
