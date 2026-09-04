<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventStaff extends Model
{
    protected $table = 'event_staff';

    protected $fillable = [
        'event_id',
        'user_id',
        'role',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
