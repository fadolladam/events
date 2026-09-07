<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Modules\Registration\RegistrationService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

/**
 * Bulk-import registrations from a CSV into an event's registration form.
 *
 *   php artisan registrations:import <event-slug-or-id> <path/to/file.csv>
 *
 * Rows fill confirmed seats up to the event capacity; any extra rows go onto
 * the waitlist in file order. Core columns: full_name, email, phone. Every
 * other column must match a form field's `field_key`. Required form fields
 * must have a value; `waiver`-type checkboxes are accepted on any truthy cell
 * (or if the column is omitted entirely).
 */
class ImportRegistrations extends Command
{
    protected $signature = 'registrations:import
        {event : Event slug or UUID}
        {file : Path to the CSV file (inside the container)}
        {--source=import : Value stored in registrations.source}
        {--dry-run : Parse and validate only; write nothing}';

    protected $description = 'Bulk-import event registrations from a CSV file';

    public function handle(RegistrationService $registrations): int
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

        $rows = $this->readCsv($path);
        if ($rows === null) {
            return self::FAILURE;
        }

        $form = $event->form()->with('fields')->first();
        $formFields = $form
            ? $form->fields->where('is_hidden', false)->keyBy('field_key')
            : collect();
        $coreKeys = ['full_name', 'email', 'phone'];
        $dryRun = (bool) $this->option('dry-run');

        $this->line("Event   : <info>{$event->title}</info>  ({$event->event_code})");
        $this->line('Capacity: ' . $event->capacity . ($event->waitlist_enabled ? " + waitlist {$event->waitlist_capacity}" : ' (no waitlist)'));
        $this->line('Rows    : ' . count($rows) . ($dryRun ? '   [DRY RUN — nothing will be written]' : ''));
        $this->newLine();

        $confirmed = $waitlisted = 0;
        $failures = [];

        foreach ($rows as $i => $row) {
            $line = $i + 2; // header is line 1
            $email = trim((string) ($row['email'] ?? ''));
            $name = trim((string) ($row['full_name'] ?? ''));

            if ($name === '' || $email === '') {
                $failures[] = "row {$line}: full_name and email are required";
                continue;
            }

            $participant = [
                'name' => $name,
                'email' => $email,
                'phone' => trim((string) ($row['phone'] ?? '')) ?: null,
            ];

            $answers = [];
            foreach ($formFields as $key => $field) {
                if (in_array($key, $coreKeys, true)) {
                    continue;
                }
                $raw = array_key_exists($key, $row) ? trim((string) $row[$key]) : '';
                $isCheckbox = $field->type === 'checkbox' && ! empty($field->options);

                if ($isCheckbox) {
                    // Accept on any truthy cell, or when the column is missing.
                    $accepted = ! array_key_exists($key, $row)
                        || in_array(strtolower($raw), ['1', 'y', 'yes', 'true', 'accept', 'accepted', 'agree', 'agreed', strtolower((string) $field->options[0])], true);
                    if ($accepted) {
                        $answers[$key] = ['label' => $field->label, 'value' => $field->options[0]];
                    }
                    continue;
                }

                if ($raw === '') {
                    continue;
                }
                $answers[$key] = ['label' => $field->label, 'value' => $raw];
            }

            if ($dryRun) {
                // Surface obvious problems without touching the DB.
                foreach ($formFields as $key => $field) {
                    if (in_array($key, $coreKeys, true) || ! $field->is_required) {
                        continue;
                    }
                    $v = $answers[$key]['value'] ?? null;
                    if ($v === null || $v === '') {
                        $failures[] = "row {$line}: \"{$field->label}\" is required";
                    } elseif (in_array($field->type, ['select', 'radio'], true) && ! empty($field->options) && ! in_array($v, $field->options, true)) {
                        $failures[] = "row {$line}: \"{$field->label}\" = \"{$v}\" is not one of [" . implode(' | ', $field->options) . ']';
                    }
                }
                continue;
            }

            try {
                $result = $registrations->register($event->id, $participant, $answers, $this->option('source'));
                $status = $result['registration']->status;
                if ($status === 'confirmed') {
                    $confirmed++;
                } elseif ($status === 'waitlisted') {
                    $waitlisted++;
                    $this->line("  <comment>waitlist #{$result['queue_position']}</comment>  {$name} <{$email}>");
                } else {
                    $failures[] = "row {$line}: created with unexpected status \"{$status}\"";
                }
            } catch (ValidationException $e) {
                $failures[] = "row {$line} ({$email}): " . implode('; ', array_map(fn ($m) => is_array($m) ? implode(', ', $m) : $m, $e->errors()));
            } catch (\Throwable $e) {
                $failures[] = "row {$line} ({$email}): " . $e->getMessage();
            }
        }

        $this->newLine();
        if ($dryRun) {
            $this->info('Dry run complete.');
        } else {
            $this->info("Imported: {$confirmed} confirmed, {$waitlisted} waitlisted.");
        }

        if ($failures) {
            $this->newLine();
            $this->warn(count($failures) . ' row(s) skipped:');
            foreach ($failures as $f) {
                $this->line("  - {$f}");
            }
            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /** @return array<int, array<string,string>>|null  rows keyed by header (or null on a header error) */
    private function readCsv(string $path): ?array
    {
        $fh = fopen($path, 'r');
        if (! $fh) {
            $this->error("Could not open {$path}");
            return null;
        }

        $header = fgetcsv($fh);
        if (! $header) {
            $this->error('The CSV appears to be empty.');
            fclose($fh);
            return null;
        }
        // Strip UTF-8 BOM + normalise header keys.
        $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]);
        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);

        $rows = [];
        while (($data = fgetcsv($fh)) !== false) {
            if (count(array_filter($data, fn ($c) => trim((string) $c) !== '')) === 0) {
                continue; // blank line
            }
            $rows[] = array_combine($header, array_pad(array_slice($data, 0, count($header)), count($header), ''));
        }
        fclose($fh);

        return $rows;
    }
}
