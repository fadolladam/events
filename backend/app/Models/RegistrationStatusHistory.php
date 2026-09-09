<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistrationStatusHistory extends Model
{
    public $timestamps = false;

    protected $table = 'registration_status_history';

    protected $fillable = [
        'registration_id',
        'event_id',
        'from_status',
        'to_status',
        'changed_by_user_id',
        'reason',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function registration()
    {
        return $this->belongsTo(Registration::class);
    }
}
