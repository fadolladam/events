<?php

namespace App\Modules\Notifications;

use App\Models\Event;
use App\Models\NotificationLog;
use App\Models\NotificationTemplate;
use App\Models\Registration;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Dispatch notification with variable interpolation
     */
    public function send(string $triggerEvent, Registration $registration): NotificationLog
    {
        $event = $registration->event;
        $participant = $registration->participant;

        // Find specific event template or global fallback template
        $template = NotificationTemplate::where('trigger_event', $triggerEvent)
            ->where(function ($q) use ($event) {
                $q->where('event_id', $event->id)->orWhereNull('event_id');
            })
            ->where('is_active', true)
            ->orderByRaw('event_id IS NULL ASC') // prioritize event-specific
            ->first();

        $subject = $template ? $template->subject : "Update regarding {$event->title}";
        $body = $template ? $template->body_template : "Hello {{participant_name}}, your registration status for {{event_name}} is {{registration_status}}.";

        $variables = [
            '{{participant_name}}' => $participant->name,
            '{{registration_number}}' => $registration->registration_number,
            '{{event_name}}' => $event->title,
            '{{event_date}}' => $event->start_at ? $event->start_at->format('d M Y') : '',
            '{{event_time}}' => $event->start_at ? $event->start_at->format('h:i A') : '',
            '{{event_location}}' => $event->venue_name ?? $event->address ?? 'TBD',
            '{{registration_status}}' => strtoupper($registration->status),
            '{{queue_position}}' => $registration->getQueuePosition() ? "#{$registration->getQueuePosition()}" : 'N/A',
            '{{ticket_url}}' => config('app.url') . "/ticket/{$registration->ticket?->secure_token}",
            '{{organizer_name}}' => $event->organizer_name ?? 'Event Team',
            '{{contact_email}}' => $event->contact_email ?? '',
            '{{contact_phone}}' => $event->contact_phone ?? '',
        ];

        $interpolatedSubject = str_replace(array_keys($variables), array_values($variables), $subject);
        $interpolatedBody = str_replace(array_keys($variables), array_values($variables), $body);

        $log = NotificationLog::create([
            'event_id' => $event->id,
            'registration_id' => $registration->id,
            'recipient_email' => $participant->email,
            'trigger_event' => $triggerEvent,
            'subject' => $interpolatedSubject,
            'status' => 'sent',
        ]);

        Log::info("Notification [{$triggerEvent}] dispatched to {$participant->email} for event {$event->title}");

        return $log;
    }
}
