<?php

namespace App\Modules\Registration;

use App\Models\Event;
use App\Models\Registration;
use App\Models\WaitlistHistory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Shared CSV → registration import used by both the `registrations:import`
 * artisan command and the admin HTTP endpoint. Every row still goes through
 * RegistrationService::register(), so capacity, duplicate rules, approval
 * mode, waitlist, sequence, ticket, history and audit all apply.
 *
 * Core columns: full_name, email, phone. Other columns either describe the
 * person (staff_id/employee_id, department, country, organization) or match a
 * form field's `field_key`. Required form fields must have a value.
 */
class RegistrationImportService
{
    /** CSV columns that describe the participant rather than a form answer. */
    private const PARTICIPANT_COLS = [
        'staff_id' => 'employee_id',
        'employee_id' => 'employee_id',
        'department' => 'department',
        'country' => 'country',
        'organization' => 'organization',
    ];

    public function __construct(private RegistrationService $registrations) {}

    /**
     * Parse raw CSV text into rows keyed by (lower-cased) header.
     *
     * @return array<int, array<string, string>>
     */
    public function parse(string $csv): array
    {
        $csv = preg_replace('/^\xEF\xBB\xBF/', '', $csv); // strip UTF-8 BOM
        $fh = fopen('php://temp', 'r+');
        fwrite($fh, $csv);
        rewind($fh);

        $header = fgetcsv($fh);
        if (! $header) {
            fclose($fh);
            throw ValidationException::withMessages(['file' => ['The CSV appears to be empty.']]);
        }
        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);

        if (! in_array('full_name', $header, true)) {
            fclose($fh);
            throw ValidationException::withMessages(['file' => ['The CSV must have a "full_name" column.']]);
        }

        $rows = [];
        while (($data = fgetcsv($fh)) !== false) {
            if (count(array_filter($data, fn ($c) => trim((string) $c) !== '')) === 0) {
                continue;
            }
            $rows[] = array_combine(
                $header,
                array_pad(array_slice($data, 0, count($header)), count($header), '')
            );
        }
        fclose($fh);

        return $rows;
    }

    /**
     * Import parsed rows into an event.
     *
     * @param  array<int, array<string, string>>  $rows
     * @return array{processed:int, confirmed:int, waitlisted:int, failures:array<int,string>, dry_run:bool}
     */
    public function import(Event $event, array $rows, string $source = 'import', bool $dryRun = false): array
    {
        $form = $event->form()->with('fields')->first();
        $formFields = $form
            ? $form->fields->where('is_hidden', false)->where('type', '!=', 'info')->keyBy('field_key')
            : collect();
        $coreKeys = ['full_name', 'email', 'phone'];
        $emailDomain = strtolower($event->event_code).'.import';

        $confirmed = 0;
        $waitlisted = 0;
        $failures = [];
        $seenEmails = [];

        foreach ($rows as $i => $row) {
            $line = $i + 2; // header is line 1
            $name = trim((string) ($row['full_name'] ?? ''));
            if ($name === '') {
                $failures[] = "row {$line}: full_name is required";

                continue;
            }

            // Synthesise a unique placeholder email when the file has none.
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
            foreach (self::PARTICIPANT_COLS as $col => $field) {
                if (($v = trim((string) ($row[$col] ?? ''))) !== '') {
                    $participant[$field] = $v;
                }
            }

            [$answers, $rowErrors] = $this->buildAnswers($formFields, $coreKeys, $row);
            if ($rowErrors) {
                $failures[] = "row {$line} ({$name}): ".implode('; ', $rowErrors);

                continue;
            }

            if ($dryRun) {
                continue;
            }

            try {
                $result = $this->registrations->register($event->id, $participant, $answers, $source);
                $reg = $result['registration'];
                $this->backdate($reg, trim((string) ($row['registered_at'] ?? '')));

                if ($reg->status === 'confirmed') {
                    $confirmed++;
                } elseif ($reg->status === 'waitlisted') {
                    $waitlisted++;
                } else {
                    $failures[] = "row {$line}: unexpected status \"{$reg->status}\"";
                }
            } catch (ValidationException $e) {
                $failures[] = "row {$line} ({$name}): ".implode('; ', array_map(
                    fn ($m) => is_array($m) ? implode(', ', $m) : $m,
                    $e->errors()
                ));
            } catch (\Throwable $e) {
                $failures[] = "row {$line} ({$name}): ".$e->getMessage();
            }
        }

        return [
            'processed' => $confirmed + $waitlisted,
            'confirmed' => $confirmed,
            'waitlisted' => $waitlisted,
            'failures' => $failures,
            'dry_run' => $dryRun,
        ];
    }

    /**
     * @return array{0: array<string, array{label:string, value:mixed}>, 1: array<int, string>}
     */
    private function buildAnswers(Collection $formFields, array $coreKeys, array $row): array
    {
        $answers = [];
        $errors = [];

        foreach ($formFields as $key => $field) {
            if (in_array($key, $coreKeys, true)) {
                continue;
            }
            $raw = array_key_exists($key, $row) ? trim((string) $row[$key]) : '';
            $isMulti = in_array($field->type, ['checkbox', 'multi_select'], true) && ! empty($field->options);
            $isConsent = $field->type === 'consent';
            $isChoice = in_array($field->type, ['select', 'radio'], true) && ! empty($field->options);

            if ($isConsent) {
                $accepted = ! in_array(strtolower($raw), ['0', 'n', 'no', 'false', 'declined', 'unchecked', ''], true) || ! array_key_exists($key, $row);
                if ($accepted) {
                    $answers[$key] = ['label' => $field->label, 'value' => true];
                } elseif ($field->is_required) {
                    $errors[] = "\"{$field->label}\" not accepted";
                }

                continue;
            }

            if ($isMulti) {
                $vals = array_values(array_filter(array_map('trim', explode('|', $raw)), fn ($v) => $v !== ''));
                $invalid = array_diff($vals, $field->options);
                if ($invalid) {
                    $errors[] = "\"{$field->label}\" has an invalid selection";
                } elseif ($vals) {
                    $answers[$key] = ['label' => $field->label, 'value' => $vals];
                } elseif ($field->is_required) {
                    $errors[] = "\"{$field->label}\" is required but blank";
                }

                continue;
            }

            if ($raw === '') {
                if ($field->is_required) {
                    $errors[] = "\"{$field->label}\" is required but blank";
                }

                continue;
            }

            if ($isChoice && ! in_array($raw, $field->options, true)) {
                $mapped = $this->matchOption($raw, $field->options);
                if ($mapped === null) {
                    $errors[] = "\"{$field->label}\" = \"{$raw}\" not in [".implode(' | ', $field->options).']';

                    continue;
                }
                $raw = $mapped;
            }
            $answers[$key] = ['label' => $field->label, 'value' => $raw];
        }

        return [$answers, $errors];
    }

    /** Loosely match a CSV value to one of a choice field's options. */
    public function matchOption(string $raw, array $options): ?string
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
}
