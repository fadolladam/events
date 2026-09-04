<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventTemplate extends Model
{
    protected $fillable = [
        'name',
        'description',
        'category_id',
        'structure',
    ];

    protected $casts = [
        'structure' => 'array',
    ];

    public function category()
    {
        return $this->belongsTo(EventCategory::class, 'category_id');
    }
}
