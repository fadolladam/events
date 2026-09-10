<?php

namespace App\Http\Resources;

use App\Support\RoleRank;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Least-privilege registration view (TODO #12), for the check-in/attendance
 * endpoints checkin_staff and viewer can reach alongside higher roles.
 *
 * Only serializes relations the caller already eager-loaded (mirrors
 * whenLoaded's intent without fighting Eloquent's lazy-loading guard in
 * tests). Free-text form `answers` can contain anything an admin put in a
 * custom field, so — unlike the participant identity fields — they're kept
 * out of every check-in-tier response regardless of what's loaded.
 */
class RegistrationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'event_id' => $this->event_id,
            'registration_number' => $this->registration_number,
            'status' => $this->status,
            'attendance_status' => $this->attendance_status,
            'source' => $this->source,
            'notes' => $this->notes,
            'registered_at' => $this->registered_at,
            'confirmed_at' => $this->confirmed_at,
            'checked_in_at' => $this->checked_in_at,
        ];

        if (isset($this->queue_position)) {
            $data['queue_position'] = $this->queue_position;
        }

        if ($this->relationLoaded('participant') && $this->participant) {
            $data['participant'] = new ParticipantResource($this->participant);
        }

        if ($this->relationLoaded('event') && $this->event) {
            $data['event'] = $this->event;
        }

        if ($this->relationLoaded('ticket')) {
            $data['ticket'] = $this->ticket;
        }

        if ($this->relationLoaded('checkins')) {
            $data['checkins'] = $this->checkins;
        }

        if ($this->relationLoaded('attendance')) {
            $data['attendance'] = $this->attendance;
        }

        if ($this->relationLoaded('answers') && RoleRank::atLeast($request->user(), RoleRank::REGISTRATION_OFFICER)) {
            $data['answers'] = $this->answers;
        }

        return $data;
    }
}
