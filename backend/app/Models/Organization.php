<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'logo_url',
        'timezone',
        'country',
        'contact_email',
        'contact_phone',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    public function events()
    {
        return $this->hasMany(Event::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
