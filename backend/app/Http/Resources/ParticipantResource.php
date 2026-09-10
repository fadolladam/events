<?php

namespace App\Http\Resources;

use App\Support\RoleRank;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Least-privilege participant view (TODO #12).
 *
 * name / employee_id / department stay visible to checkin_staff and viewer —
 * the QR scanner card and Attendance Roster tab already show these on
 * purpose, for identity verification at the door. phone / country /
 * organization aren't used by any check-in-tier screen, so they're reserved
 * for registration_officer and above, who actually process registrations.
 */
class ParticipantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'employee_id' => $this->employee_id,
            'department' => $this->department,
        ];

        if (RoleRank::atLeast($request->user(), RoleRank::REGISTRATION_OFFICER)) {
            $data['phone'] = $this->phone;
            $data['country'] = $this->country;
            $data['organization'] = $this->organization;
        }

        return $data;
    }
}
