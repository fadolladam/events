<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Registration extends Model
{
    use HasUuids;

    protected $fillable = [
        'event_id',
        'participant_id',
        'registration_number',
        'registration_sequence',
        'status',
        'attendance_status',
        'waitlist_priority',
        'queue_position_cache',
        'source',
        'secure_access_token',
        'notes',
        'registered_at',
        'confirmed_at',
        'waitlisted_at',
        'promoted_at',
        'approved_at',
        'rejected_at',
        'cancelled_at',
        'checked_in_at',
    ];

    protected $casts = [
        'registration_sequence' => 'integer',
        'waitlist_priority' => 'integer',
        'queue_position_cache' => 'integer',
        'registered_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'waitlisted_at' => 'datetime',
        'promoted_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'checked_in_at' => 'datetime',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function participant()
    {
        return $this->belongsTo(Participant::class, 'participant_id');
    }

    public function answers()
    {
        return $this->hasMany(RegistrationAnswer::class, 'registration_id');
    }

    public function statusHistory()
    {
        return $this->hasMany(RegistrationStatusHistory::class, 'registration_id');
    }

    public function ticket()
    {
        return $this->hasOne(Ticket::class, 'registration_id');
    }

    public function checkins()
    {
        return $this->hasMany(Checkin::class, 'registration_id');
    }

    public function attendance()
    {
        return $this->hasOne(Attendance::class, 'registration_id');
    }

    /**
     * Calculate current dynamic queue position if waitlisted
     */
    public function getQueuePosition(): ?int
    {
        if ($this->status !== 'waitlisted') {
            return null;
        }

        $priority = (int) ($this->waitlist_priority ?? 0);
        $waitlistedAt = $this->waitlisted_at ? $this->waitlisted_at->format('Y-m-d H:i:s') : ($this->created_at ? $this->created_at->format('Y-m-d H:i:s') : now()->format('Y-m-d H:i:s'));
        $seq = (int) ($this->registration_sequence ?? 0);

        $earlierWaitlistedCount = Registration::where('event_id', $this->event_id)
            ->where('status', 'waitlisted')
            ->where('id', '!=', $this->id)
            ->where(function ($query) use ($priority, $waitlistedAt, $seq) {
                $query->where('waitlist_priority', '>', $priority)
                    ->orWhere(function ($q) use ($priority, $waitlistedAt, $seq) {
                        $q->where('waitlist_priority', '=', $priority)
                            ->where(function ($sub) use ($waitlistedAt, $seq) {
                                $sub->where('waitlisted_at', '<', $waitlistedAt)
                                    ->orWhere(function ($sub2) use ($waitlistedAt, $seq) {
                                        $sub2->where('waitlisted_at', '=', $waitlistedAt)
                                            ->where('registration_sequence', '<', $seq);
                                    });
                            });
                    });
            })
            ->count();

        return $earlierWaitlistedCount + 1;
    }
}
