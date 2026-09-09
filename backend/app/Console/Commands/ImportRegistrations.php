<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Modules\Registration\RegistrationImportService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

/**
 * Bulk-import registrations from a CSV into an event's registration form.
 *
 *   php artisan registrations:import <event-slug-or-id> <path/to/file.csv>
 *
 * The row parsing + import loop live in RegistrationImportService, shared with
 * the admin HTTP endpoint (POST /events/{id}/registrations/import).
 */
class ImportRegistrations extends Command
{
    protected $signature = 'registrations:import
        {event : Event slug or UUID}
        {file : Path to the CSV file}
        {--source=import : Value stored in registrations.source}
        {--dry-run : Parse and validate only; write nothing}';

    protected $description = 'Bulk-import event registrations from a CSV file';

    public function handle(RegistrationImportService $importer): int
    {
        $event = Event::query()
            ->where('id', $this->argument('event'))
            ->orWhere('slug', $this->argument('event'))
            ->first();

        if (! $event) {
            $this->error("No event matches \"{$this->argument('event')}\".");

            return self::FAILURE;
        }

        $path = $this->argument('file');
        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        try {
            $rows = $importer->parse((string) file_get_contents($path));
        } catch (ValidationException $e) {
            $this->error(implode(' ', $e->errors()['file'] ?? ['Invalid CSV.']));

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');

        $this->line("Event   : <info>{$event->title}</info>  ({$event->event_code})");
        $this->line('Capacity: '.$event->capacity.($event->waitlist_enabled ? " + waitlist {$event->waitlist_capacity}" : ' (no waitlist)'));
        $this->line('Rows    : '.count($rows).($dryRun ? '   [DRY RUN — nothing will be written]' : ''));
        $this->newLine();

        $result = $importer->import($event, $rows, (string) $this->option('source'), $dryRun);

        if ($dryRun) {
            $this->info('Dry run complete — '.count($rows).' row(s) parsed.');
        } else {
            $this->info("Imported: {$result['confirmed']} confirmed, {$result['waitlisted']} waitlisted.");
        }

        if ($result['failures']) {
            $this->newLine();
            $this->warn(count($result['failures']).' row(s) skipped:');
            foreach ($result['failures'] as $f) {
                $this->line("  - {$f}");
            }

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
