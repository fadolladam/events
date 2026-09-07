<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Additive covering indexes for the Event Operations dashboard aggregate
 * queries (grouped counts by event + status / attendance_status, status &
 * date filters on events, notification and audit recency scans).
 *
 * Index-only: no columns are added, changed or dropped and no rows are
 * touched. Every index is created only if absent so the migration is safe to
 * re-run, and down() removes exactly what up() added.
 */
return new class extends Migration
{
    /**
     * table => [ [column(s), index name], ... ]
     */
    private array $indexes = [
        'registrations' => [
            [['event_id', 'status'], 'registrations_event_status_idx'],
            [['event_id', 'attendance_status'], 'registrations_event_attendance_idx'],
            [['confirmed_at'], 'registrations_confirmed_at_idx'],
            [['waitlisted_at'], 'registrations_waitlisted_at_idx'],
            [['promoted_at'], 'registrations_promoted_at_idx'],
        ],
        'events' => [
            [['status'], 'events_status_idx'],
            [['start_at'], 'events_start_at_idx'],
            [['registration_close_at'], 'events_registration_close_at_idx'],
        ],
        'notification_logs' => [
            [['status', 'created_at'], 'notification_logs_status_created_idx'],
        ],
        'audit_logs' => [
            [['created_at'], 'audit_logs_created_at_idx'],
        ],
        'waitlist_history' => [
            [['event_id', 'action'], 'waitlist_history_event_action_idx'],
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
