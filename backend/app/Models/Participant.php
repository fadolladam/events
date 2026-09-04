<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Participant extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'country',
        'employee_id',
        'department',
        'organization',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function registrations()
    {
        return $this->hasMany(Registration::class, 'participant_id');
    }
}
