<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Models\Registration;
use App\Models\WaitlistHistory;
use App\Modules\Registration\RegistrationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
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
        // CSV columns that describe the person, not a form answer.
        $participantCols = ['staff_id' => 'employee_id', 'employee_id' => 'employee_id', 'department' => 'department', 'country' => 'country', 'organization' => 'organization'];
        $dryRun = (bool) $this->option('dry-run');
        $emailDomain = strtolower($event->event_code).'.import';

        $this->line("Event   : <info>{$event->title}</info>  ({$event->event_code})");
        $this->line('Capacity: '.$event->capacity.($event->waitlist_enabled ? " + waitlist {$event->waitlist_capacity}" : ' (no waitlist)'));
        $this->line('Rows    : '.count($rows).($dryRun ? '   [DRY RUN — nothing will be written]' : ''));
        $this->newLine();

        $confirmed = $waitlisted = 0;
        $failures = [];
        $seenEmails = [];

        foreach ($rows as $i => $row) {
            $line = $i + 2; // header is line 1
            $name = trim((string) ($row['full_name'] ?? ''));
            if ($name === '') {
                $failures[] = "row {$line}: full_name is required";

                continue;
            }

            $employeeId = trim((string) ($row['staff_id'] ?? $row['employee_id'] ?? ''));

            // No real email in the file → synthesise a placeholder keyed on the
            // row's own `queue` number (or the line number) so it's always
            // unique, even when two rows share a staff_id. The real staff_id is
            // still stored on the participant as employee_id.
            $email = trim((string) ($row['email'] ?? ''));
            if ($email === '') {
                $rowKey = trim((string) ($row['queue'] ?? '')) ?: (string) $line;
                $email = strtolower($event->event_code).'-'.preg_replace('/[^a-z0-9]+/i', '', $rowKey).'@'.$emailDomain;
            }
            if (isset($seenEmails[$email])) {
                $failures[] = "row {$line}: duplicate registration key of row {$seenEmails[$email]}";

                continue;
            }
            $seenEmails[$email] = $line;

            $participant = [
                'name' => $name,
                'email' => $email,
                'phone' => trim((string) ($row['phone'] ?? '')) ?: null,
            ];
            foreach ($participantCols as $col => $field) {
                if (($v = trim((string) ($row[$col] ?? ''))) !== '') {
                    $participant[$field] = $v;
                }
            }

            $answers = [];
            $rowErrors = [];
            foreach ($formFields as $key => $field) {
                if (in_array($key, $coreKeys, true)) {
                    continue;
                }
                $raw = array_key_exists($key, $row) ? trim((string) $row[$key]) : '';
                $isCheckbox = $field->type === 'checkbox' && ! empty($field->options);
                $isChoice = in_array($field->type, ['select', 'radio'], true) && ! empty($field->options);

                if ($isCheckbox) {
                    // Historical import: treat a checkbox as accepted unless the
                    // cell explicitly says otherwise.
                    $accepted = ! in_array(strtolower($raw), ['0', 'n', 'no', 'false', 'declined', 'unchecked'], true);
                    if ($accepted) {
                        $answers[$key] = ['label' => $field->label, 'value' => $field->options[0]];
                    } elseif ($field->is_required) {
                        $rowErrors[] = "\"{$field->label}\" not accepted";
                    }

                    continue;
                }

                if ($raw === '') {
                    if ($field->is_required) {
                        $rowErrors[] = "\"{$field->label}\" is required but blank";
                    }

                    continue;
                }

                if ($isChoice && ! in_array($raw, $field->options, true)) {
                    $mapped = $this->matchOption($raw, $field->options);
                    if ($mapped === null) {
                        $rowErrors[] = "\"{$field->label}\" = \"{$raw}\" not in [".implode(' | ', $field->options).']';

                        continue;
                    }
                    $raw = $mapped;
                }
                $answers[$key] = ['label' => $field->label, 'value' => $raw];
            }

            if ($rowErrors) {
                $failures[] = "row {$line} ({$name}): ".implode('; ', $rowErrors);

                continue;
            }

            if ($dryRun) {
                continue;
            }

            try {
                $result = $registrations->register($event->id, $participant, $answers, $this->option('source'));
                $reg = $result['registration'];
                $this->backdate($reg, trim((string) ($row['registered_at'] ?? '')));

                if ($reg->status === 'confirmed') {
                    $confirmed++;
                } elseif ($reg->status === 'waitlisted') {
                    $waitlisted++;
                    $this->line("  <comment>waitlist #{$result['queue_position']}</comment>  {$name}");
                } else {
                    $failures[] = "row {$line}: unexpected status \"{$reg->status}\"";
                }
            } catch (ValidationException $e) {
                $failures[] = "row {$line} ({$name}): ".implode('; ', array_map(fn ($m) => is_array($m) ? implode(', ', $m) : $m, $e->errors()));
            } catch (\Throwable $e) {
                $failures[] = "row {$line} ({$name}): ".$e->getMessage();
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
            $this->warn(count($failures).' row(s) skipped:');
            foreach ($failures as $f) {
                $this->line("  - {$f}");
            }

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /** Loosely match a CSV value to one of a choice field's options. */
    private function matchOption(string $raw, array $options): ?string
    {
        $norm = fn (string $s) => strtoupper(preg_replace('/[^a-z0-9]+/i', '', $s));
        $aliases = ['2XL' => 'XXL', 'XXLARGE' => 'XXL', 'XXXL' => '3XL', '3XLARGE' => '3XL', 'XLARGE' => 'XL', 'LARGE' => 'L', 'MEDIUM' => 'M', 'SMALL' => 'S', 'XSMALL' => 'XS'];

        $r = $norm($raw);
        $r = $aliases[$r] ?? $r;

        foreach ($options as $opt) {
            $o = $norm($opt);
            if ($r === $o || $r === ($aliases[$o] ?? $o)) {
                return $opt;
            }
        }
        // last resort: substring either way
        foreach ($options as $opt) {
            if (str_contains($norm($opt), $r) || str_contains($r, $norm($opt))) {
                return $opt;
            }
        }

        return null;
    }

    /** Overwrite registered_at (+ the matching status timestamp) from the CSV. */
    private function backdate(Registration $reg, string $dateStr): void
    {
        if ($dateStr === '') {
            return;
        }
        try {
            $d = Carbon::parse($dateStr);
        } catch (\Throwable) {
            return;
        }

        $reg->registered_at = $d;
        if ($reg->status === 'confirmed' && $reg->confirmed_at) {
            $reg->confirmed_at = $d;
        } elseif ($reg->status === 'waitlisted' && $reg->waitlisted_at) {
            $reg->waitlisted_at = $d;
        }
        $reg->saveQuietly();

        if ($reg->status === 'waitlisted') {
            WaitlistHistory::where('registration_id', $reg->id)
                ->where('action', 'joined_queue')
                ->update(['created_at' => $d]);
        }
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
