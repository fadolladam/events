<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'organization_id',
        'phone',
        'status',
        'must_change_password',
        'password_changed_at',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'password_changed_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function eventStaff()
    {
        return $this->hasMany(EventStaff::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isEventAdmin(): bool
    {
        return in_array($this->role, ['super_admin', 'event_admin']);
    }

    public function canManageEvent(string $eventId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->role === 'event_admin') {
            return true;
        }

        return $this->eventStaff()->where('event_id', $eventId)->exists();
    }

    /**
     * The organization this user's queries are confined to, or null for no
     * confinement (super_admin, or an account with no organization_id — which
     * includes test fixtures). Consumed by list endpoints, search and the
     * dashboard to keep one org's data out of another's.
     */
    public function scopedOrgId(): ?int
    {
        return $this->isSuperAdmin() ? null : $this->organization_id;
    }
}
