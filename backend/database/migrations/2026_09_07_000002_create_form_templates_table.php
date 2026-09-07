<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reusable registration-form templates. A template is a named, standalone set
 * of form-field definitions (same shape as form_fields) that can be applied to
 * any event's registration form.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('fields'); // array of field defs (field_key,label,type,options,…)
            $table->unsignedBigInteger('created_by')->nullable();
            $table->boolean('is_system')->default(false); // seeded/built-in, not user-deletable
            $table->timestamps();

            $table->index('is_system');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_templates');
    }
};
