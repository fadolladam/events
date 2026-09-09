<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Second pass of covering indexes for the query hot paths surfaced since the
 * dashboard build: the FIFO waitlist order, per-field answer lookups (report +
 * CSV), the per-event audit tab, health signals, and the event_staff access
 * check. Index-only, idempotent, reversible — same shape as
 * 2026_09_07_000001_add_dashboard_indexes.
 */
return new class extends Migration
{
    /** table => [ [column(s), index name], ... ] */
    private array $indexes = [
        // WaitlistService orders by (event_id, status, waitlist_priority desc,
        // waitlisted_at asc, registration_sequence asc).
        'registrations' => [
            [['event_id', 'status', 'waitlist_priority', 'waitlisted_at'], 'registrations_waitlist_order_idx'],
        ],
        // ReportService::formAnswerSummary + CSV export look up answers by
        // (registration_id, field_key).
        'registration_answers' => [
            [['registration_id', 'field_key'], 'registration_answers_reg_field_idx'],
        ],
        // Per-event audit tab (where event_id order by created_at desc) and
        // the action filter / health counts.
        'audit_logs' => [
            [['event_id', 'created_at'], 'audit_logs_event_created_idx'],
            [['action', 'created_at'], 'audit_logs_action_created_idx'],
        ],
        // EventScopeMiddleware / canManageEvent: where user_id + event_id.
        'event_staff' => [
            [['user_id', 'event_id'], 'event_staff_user_event_idx'],
        ],
        // recentCheckins() orders by checked_in_at within an event.
        'checkins' => [
            [['event_id', 'checked_in_at'], 'checkins_event_time_idx'],
        ],
    ];

    public function up(): void
    {
        foreach ($this->indexes as $table => $defs) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            Schema::table($table, function (Blueprint $blueprint) use ($table, $defs) {
                foreach ($defs as [$columns, $name]) {
                    if (! Schema::hasIndex($table, $name)) {
                        $blueprint->index($columns, $name);
                    }
                }
            });
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as $table => $defs) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            Schema::table($table, function (Blueprint $blueprint) use ($table, $defs) {
                foreach ($defs as [, $name]) {
                    if (Schema::hasIndex($table, $name)) {
                        $blueprint->dropIndex($name);
                    }
                }
            });
        }
    }
};
