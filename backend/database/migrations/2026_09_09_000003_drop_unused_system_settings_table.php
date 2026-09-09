<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `system_settings` shipped in the initial schema as a generic key/value store
 * but was never read or written — organisation-level configuration lives on the
 * `organizations` row (see OrganizationController). Drop the dead table.
 *
 * Reversible: down() recreates the original structure so an older checkout of
 * the app still migrates cleanly.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('system_settings');
    }

    public function down(): void
    {
        if (Schema::hasTable('system_settings')) {
            return;
        }

        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->timestamps();
        });
    }
};
