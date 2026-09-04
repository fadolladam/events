<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormField extends Model
{
    protected $fillable = [
        'form_id',
        'field_key',
        'label',
        'placeholder',
        'help_text',
        'type',
        'is_required',
        'is_hidden',
        'field_order',
        'validation_rules',
        'options',
        'conditional_logic',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'is_hidden' => 'boolean',
        'field_order' => 'integer',
        'validation_rules' => 'array',
        'options' => 'array',
        'conditional_logic' => 'array',
    ];

    public function form()
    {
        return $this->belongsTo(RegistrationForm::class, 'form_id');
    }
}
