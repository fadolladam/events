<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistrationAnswer extends Model
{
    protected $fillable = [
        'registration_id',
        'field_key',
        'field_label',
        'value_text',
        'value_json',
    ];

    protected $casts = [
        'value_json' => 'array',
    ];

    public function registration()
    {
        return $this->belongsTo(Registration::class);
    }
}
