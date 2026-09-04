<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WaitlistHistory extends Model
{
    public $timestamps = false;
    protected $table = 'waitlist_history';

    protected $fillable = [
        'event_id',
        'registration_id',
        'action',
        'previous_position',
        'new_position',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function registration()
    {
        return $this->belongsTo(Registration::class);
    }
}
