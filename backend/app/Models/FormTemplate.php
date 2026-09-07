<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormTemplate extends Model
{
    protected $fillable = [
        'name',
        'description',
        'fields',
        'created_by',
        'is_system',
    ];

    protected $casts = [
        'fields' => 'array',
        'is_system' => 'boolean',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Number of active (non-hidden) fields in the template. */
    public function getFieldCountAttribute(): int
    {
        return collect($this->fields ?? [])->reject(fn ($f) => (bool) ($f['is_hidden'] ?? false))->count();
    }
}
