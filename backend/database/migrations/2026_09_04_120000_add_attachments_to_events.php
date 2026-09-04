<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            // Array of { label, url } — supporting documents such as route maps,
            // agendas, consent forms, floor plans, etc. (URL/link based).
            $table->json('attachments')->nullable()->after('banner_image_url');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('attachments');
        });
    }
};
