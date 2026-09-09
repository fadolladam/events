<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add extra fields to users
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('viewer')->after('password'); // super_admin, event_admin, event_organizer, registration_officer, checkin_staff, viewer, participant
            $table->unsignedBigInteger('organization_id')->nullable()->after('role');
            $table->string('phone')->nullable()->after('email');
            $table->string('status')->default('active')->after('phone');
        });

        // Organizations
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('logo_url')->nullable();
            $table->string('timezone')->default('UTC');
            $table->string('country')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        // Event Categories
        Schema::create('event_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('color')->default('#2563eb');
            $table->string('icon')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Events Table
        Schema::create('events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('organization_id')->nullable()->index();
            $table->string('title');
            $table->string('short_title')->nullable();
            $table->string('slug')->unique();
            $table->string('event_code')->unique();
            $table->longText('description')->nullable();
            $table->text('short_description')->nullable();
            $table->foreignId('category_id')->nullable()->constrained('event_categories')->nullOnDelete();
            $table->string('event_type')->default('physical'); // physical, virtual, hybrid
            $table->string('visibility')->default('public'); // public, private, invitation_only, internal_only, hidden_link
            $table->string('status')->default('draft')->index(); // draft, upcoming, registration_open, full, registration_closed, ongoing, completed, cancelled, archived
            $table->string('cover_image_url')->nullable();
            $table->string('banner_image_url')->nullable();
            $table->string('organizer_name')->nullable();
            $table->unsignedBigInteger('owner_user_id')->nullable()->index();
            $table->string('contact_name')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('contact_email')->nullable();

            // Dates & Times
            $table->dateTime('start_at')->index();
            $table->dateTime('end_at');
            $table->string('timezone')->default('UTC');
            $table->dateTime('registration_open_at')->nullable();
            $table->dateTime('registration_close_at')->nullable();

            // Capacity & Queue Rules
            $table->integer('capacity')->default(100);
            $table->boolean('waitlist_enabled')->default(true);
            $table->integer('waitlist_capacity')->nullable(); // null means unlimited
            $table->string('approval_mode')->default('automatic'); // automatic, manual
            $table->boolean('allow_cancellation')->default(true);
            $table->dateTime('cancellation_deadline')->nullable();
            $table->string('duplicate_rule')->default('email'); // email, phone, employee_id, none

            // Location
            $table->string('venue_name')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('province')->nullable();
            $table->string('country')->nullable();
            $table->string('postal_code')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('map_url')->nullable();
            $table->string('meeting_url')->nullable();

            // Branding & Terms
            $table->string('primary_color')->default('#0f172a');
            $table->string('secondary_color')->default('#2563eb');
            $table->longText('terms_and_conditions')->nullable();

            // Meta
            $table->unsignedBigInteger('created_by')->nullable();
            $table->dateTime('published_at')->nullable();
            $table->dateTime('archived_at')->nullable();
            $table->timestamps();
        });

        // Event Staff
        Schema::create('event_staff', function (Blueprint $table) {
            $table->id();
            $table->uuid('event_id')->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('role')->default('organizer'); // owner, manager, organizer, registration_officer, checkin_staff, viewer
            $table->timestamps();

            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        // Event Templates
        Schema::create('event_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('category_id')->nullable()->constrained('event_categories')->nullOnDelete();
            $table->json('structure'); // default settings, form fields, notification templates
            $table->timestamps();
        });

        // Registration Forms
        Schema::create('registration_forms', function (Blueprint $table) {
            $table->id();
            $table->uuid('event_id')->unique();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
        });

        // Form Fields
        Schema::create('form_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained('registration_forms')->cascadeOnDelete();
            $table->string('field_key'); // stable identifier
            $table->string('label');
            $table->string('placeholder')->nullable();
            $table->string('help_text')->nullable();
            $table->string('type'); // text, textarea, email, phone, number, date, time, select, radio, checkbox, file, terms, etc.
            $table->boolean('is_required')->default(false);
            $table->boolean('is_hidden')->default(false);
            $table->integer('field_order')->default(0);
            $table->json('validation_rules')->nullable(); // min, max, regex, etc.
            $table->json('options')->nullable(); // for dropdown, radio, multi-select
            $table->json('conditional_logic')->nullable();
            $table->timestamps();
        });

        // Participants (Person Identity)
        Schema::create('participants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email')->index();
            $table->string('phone')->nullable()->index();
            $table->string('country')->nullable();
            $table->string('employee_id')->nullable()->index();
            $table->string('department')->nullable();
            $table->string('organization')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // Registrations (Event Participation)
        Schema::create('registrations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('event_id')->index();
            $table->uuid('participant_id')->index();
            $table->string('registration_number')->unique();
            $table->integer('registration_sequence');
            $table->string('status')->default('pending')->index(); // pending, confirmed, waitlisted, approved, rejected, cancelled
            $table->string('attendance_status')->default('not_checked_in')->index(); // not_checked_in, checked_in, attended, no_show
            $table->integer('waitlist_priority')->default(0); // higher = higher priority
            $table->integer('queue_position_cache')->nullable();
            $table->string('source')->nullable(); // direct, qr, facebook, email, etc.
            $table->string('secure_access_token')->unique();
            $table->text('notes')->nullable();

            // Timestamps
            $table->dateTime('registered_at')->index();
            $table->dateTime('confirmed_at')->nullable();
            $table->dateTime('waitlisted_at')->nullable();
            $table->dateTime('promoted_at')->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->dateTime('rejected_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->dateTime('checked_in_at')->nullable();
            $table->timestamps();

            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('participant_id')->references('id')->on('participants')->cascadeOnDelete();
        });

        // Registration Dynamic Answers
        Schema::create('registration_answers', function (Blueprint $table) {
            $table->id();
            $table->uuid('registration_id')->index();
            $table->string('field_key');
            $table->string('field_label');
            $table->longText('value_text')->nullable();
            $table->json('value_json')->nullable();
            $table->timestamps();

            $table->foreign('registration_id')->references('id')->on('registrations')->cascadeOnDelete();
        });

        // Registration Status History
        Schema::create('registration_status_history', function (Blueprint $table) {
            $table->id();
            $table->uuid('registration_id')->index();
            $table->uuid('event_id')->index();
            $table->string('from_status')->nullable();
            $table->string('to_status');
            $table->unsignedBigInteger('changed_by_user_id')->nullable();
            $table->text('reason')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('registration_id')->references('id')->on('registrations')->cascadeOnDelete();
        });

        // Waitlist History
        Schema::create('waitlist_history', function (Blueprint $table) {
            $table->id();
            $table->uuid('event_id')->index();
            $table->uuid('registration_id')->index();
            $table->string('action'); // joined_queue, promoted, position_shifted, priority_updated, cancelled
            $table->integer('previous_position')->nullable();
            $table->integer('new_position')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('registration_id')->references('id')->on('registrations')->cascadeOnDelete();
        });

        // Tickets (QR Tickets)
        Schema::create('tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('registration_id')->unique();
            $table->uuid('event_id')->index();
            $table->string('ticket_code')->unique();
            $table->string('secure_token')->unique();
            $table->string('status')->default('active'); // active, used, revoked
            $table->text('qr_payload'); // URL or cryptographically secure token only (no PII)
            $table->dateTime('issued_at');
            $table->dateTime('revoked_at')->nullable();
            $table->timestamps();

            $table->foreign('registration_id')->references('id')->on('registrations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
        });

        // Check-Ins
        Schema::create('checkins', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('registration_id')->index();
            $table->uuid('event_id')->index();
            $table->unsignedBigInteger('checked_in_by_user_id')->nullable();
            $table->string('checkin_type')->default('qr_scan'); // qr_scan, manual_search
            $table->string('gate')->nullable();
            $table->text('notes')->nullable();
            $table->dateTime('checked_in_at')->index();
            $table->timestamps();

            $table->foreign('registration_id')->references('id')->on('registrations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
        });

        // Attendance Table
        Schema::create('attendance', function (Blueprint $table) {
            $table->id();
            $table->uuid('event_id')->index();
            $table->uuid('registration_id')->unique();
            $table->string('status')->default('not_checked_in'); // not_checked_in, checked_in, attended, no_show
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('updated_by_user_id')->nullable();
            $table->timestamps();

            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('registration_id')->references('id')->on('registrations')->cascadeOnDelete();
        });

        // Notification Templates
        Schema::create('notification_templates', function (Blueprint $table) {
            $table->id();
            $table->uuid('event_id')->nullable()->index(); // null = global default template
            $table->string('trigger_event'); // registration_received, registration_confirmed, waitlist_confirmation, waitlist_promotion, registration_cancelled, event_reminder, etc.
            $table->string('name');
            $table->string('subject');
            $table->longText('body_template');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Notification Logs
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('event_id')->nullable()->index();
            $table->uuid('registration_id')->nullable()->index();
            $table->string('recipient_email');
            $table->string('trigger_event');
            $table->string('subject');
            $table->string('status')->default('sent'); // sent, queued, failed
            $table->text('error_message')->nullable();
            $table->timestamps();
        });

        // Audit Logs (Immutable)
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('user_name')->nullable();
            $table->string('action'); // event_created, capacity_changed, participant_promoted, checkin_created, checkin_reversed, etc.
            $table->string('entity_type');
            $table->string('entity_id')->nullable();
            $table->uuid('event_id')->nullable()->index();
            $table->json('previous_value')->nullable();
            $table->json('new_value')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        // System Settings
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('notification_logs');
        Schema::dropIfExists('notification_templates');
        Schema::dropIfExists('attendance');
        Schema::dropIfExists('checkins');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('waitlist_history');
        Schema::dropIfExists('registration_status_history');
        Schema::dropIfExists('registration_answers');
        Schema::dropIfExists('registrations');
        Schema::dropIfExists('participants');
        Schema::dropIfExists('form_fields');
        Schema::dropIfExists('registration_forms');
        Schema::dropIfExists('event_templates');
        Schema::dropIfExists('event_staff');
        Schema::dropIfExists('events');
        Schema::dropIfExists('event_categories');
        Schema::dropIfExists('organizations');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'organization_id', 'phone', 'status']);
        });
    }
};
