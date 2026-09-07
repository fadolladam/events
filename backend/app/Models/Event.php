<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasUuids;

    protected $fillable = [
        'organization_id',
        'title',
        'short_title',
        'slug',
        'event_code',
        'description',
        'short_description',
        'category_id',
        'event_type',
        'visibility',
        'status',
        'cover_image_url',
        'banner_image_url',
        'attachments',
        'organizer_name',
        'owner_user_id',
        'contact_name',
        'contact_phone',
        'contact_email',
        'start_at',
        'end_at',
        'timezone',
        'registration_open_at',
        'registration_close_at',
        'capacity',
        'waitlist_enabled',
        'waitlist_capacity',
        'approval_mode',
        'allow_cancellation',
        'cancellation_deadline',
        'duplicate_rule',
        'venue_name',
        'address',
        'city',
        'province',
        'country',
        'postal_code',
        'latitude',
        'longitude',
        'map_url',
        'meeting_url',
        'primary_color',
        'secondary_color',
        'terms_and_conditions',
        'created_by',
        'published_at',
        'archived_at',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'registration_open_at' => 'datetime',
        'registration_close_at' => 'datetime',
        'cancellation_deadline' => 'datetime',
        'published_at' => 'datetime',
        'archived_at' => 'datetime',
        'capacity' => 'integer',
        'waitlist_capacity' => 'integer',
        'waitlist_enabled' => 'boolean',
        'allow_cancellation' => 'boolean',
        'latitude' => 'float',
        'longitude' => 'float',
        'attachments' => 'array',
    ];

    public function category()
    {
        return $this->belongsTo(EventCategory::class, 'category_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function staff()
    {
        return $this->hasMany(EventStaff::class);
    }

    public function form()
    {
        return $this->hasOne(RegistrationForm::class, 'event_id');
    }

    public function registrations()
    {
        return $this->hasMany(Registration::class, 'event_id');
    }

    public function confirmedRegistrations()
    {
        return $this->registrations()->where('status', 'confirmed');
    }

    public function waitlistedRegistrations()
    {
        return $this->registrations()
            ->where('status', 'waitlisted')
            ->orderBy('waitlist_priority', 'desc')
            ->orderBy('waitlisted_at', 'asc')
            ->orderBy('registration_sequence', 'asc');
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'event_id');
    }

    public function checkins()
    {
        return $this->hasMany(Checkin::class, 'event_id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'event_id');
    }

    /**
     * Resolve the event's real-time status from its dates and registration
     * volume. Pass pre-computed counts (e.g. from a grouped dashboard query)
     * to avoid the two per-event COUNT queries; omit them and they are
     * fetched on demand as before.
     */
    public function calculateDynamicStatus(?int $confirmedCount = null, ?int $waitlistCount = null): string
    {
        $now = now();

        if ($this->archived_at) {
            return 'archived';
        }

        if ($this->status === 'cancelled') {
            return 'cancelled';
        }

        if ($this->status === 'draft') {
            return 'draft';
        }

        if ($this->end_at && $now->isAfter($this->end_at)) {
            return 'completed';
        }

        if ($this->start_at && $this->end_at && $now->isBetween($this->start_at, $this->end_at)) {
            return 'ongoing';
        }

        if ($this->registration_close_at && $now->isAfter($this->registration_close_at)) {
            return 'registration_closed';
        }

        $confirmedCount ??= $this->confirmedRegistrations()->count();
        $waitlistCount ??= $this->waitlistedRegistrations()->count();

        if ($confirmedCount >= $this->capacity) {
            if (!$this->waitlist_enabled) {
                return 'full';
            }

            if ($this->waitlist_capacity !== null && $waitlistCount >= $this->waitlist_capacity) {
                return 'full';
            }
        }

        if ($this->registration_open_at && $now->isBefore($this->registration_open_at)) {
            return 'upcoming';
        }

        return 'registration_open';
    }
}
