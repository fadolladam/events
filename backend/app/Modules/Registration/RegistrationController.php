<?php

namespace App\Modules\Registration;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Registration;
use App\Modules\Audit\AuditService;
use App\Modules\Tickets\TicketService;
use App\Modules\Waitlist\WaitlistService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegistrationController extends Controller
{
    public function __construct(
        protected RegistrationService $registrationService,
        protected TicketService $ticketService,
        protected WaitlistService $waitlistService,
        protected RegistrationImportService $importService,
    ) {}

    public function registerPublic(Request $request, string $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'nullable|string|max:50',
            'country' => 'nullable|string|max:100',
            'employee_id' => 'nullable|string|max:100',
            'department' => 'nullable|string|max:100',
            'organization' => 'nullable|string|max:100',
            'answers' => 'nullable|array',
            'source' => 'nullable|string|max:50',
        ]);

        $participantData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'country' => $validated['country'] ?? null,
            'employee_id' => $validated['employee_id'] ?? null,
            'department' => $validated['department'] ?? null,
            'organization' => $validated['organization'] ?? null,
        ];

        $formAnswers = $validated['answers'] ?? [];
        $source = $validated['source'] ?? $request->query('source', 'web_direct');

        $result = $this->registrationService->register($event->id, $participantData, $formAnswers, $source);

        return response()->json([
            'message' => $result['registration']->status === 'confirmed'
                ? 'Registration confirmed successfully!'
                : 'Registration received and added to waiting list.',
            'registration' => $result['registration'],
            'queue_position' => $result['queue_position'],
            'ticket' => $result['ticket'],
        ], 201);
    }

    /**
     * Admin-side manual registration (walk-in / phone / assisted sign-up).
     * Routed behind the registration-officer tier. Deliberately funnels through
     * the SAME RegistrationService::register() as the public form so capacity,
     * duplicate rules, approval mode, waitlist, sequence allocation, the
     * permanent registration number, QR ticket issuance, status history and the
     * audit log all behave identically.
     */
    public function storeManual(Request $request, string $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'nullable|string|max:50',
            'country' => 'nullable|string|max:100',
            'employee_id' => 'nullable|string|max:100',
            'department' => 'nullable|string|max:100',
            'organization' => 'nullable|string|max:100',
            'answers' => 'nullable|array',
            'notes' => 'nullable|string|max:2000',
        ]);

        $participantData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'country' => $validated['country'] ?? null,
            'employee_id' => $validated['employee_id'] ?? null,
            'department' => $validated['department'] ?? null,
            'organization' => $validated['organization'] ?? null,
        ];

        $result = $this->registrationService->register(
            $event->id,
            $participantData,
            $validated['answers'] ?? [],
            'manual'
        );

        $registration = $result['registration'];

        if (! empty($validated['notes'])) {
            $registration->update(['notes' => $validated['notes']]);
        }

        AuditService::log(
            action: 'registration_manual_created',
            entityType: 'Registration',
            entityId: (string) $registration->id,
            eventId: $event->id,
            newValue: [
                'registration_number' => $registration->registration_number,
                'status' => $registration->status,
                'participant_email' => $validated['email'],
                'created_by' => $request->user()?->email,
            ]
        );

        return response()->json([
            'message' => $registration->status === 'confirmed'
                ? 'Participant registered and confirmed.'
                : ($registration->status === 'waitlisted'
                    ? 'Participant added to the waiting list.'
                    : 'Participant registered — pending approval.'),
            'registration' => $registration->fresh(['participant', 'ticket', 'answers']),
            'queue_position' => $result['queue_position'],
            'ticket' => $result['ticket'],
        ], 201);
    }

    /**
     * Bulk-import registrations from an uploaded CSV. Same engine as the manual
     * form and the artisan command (RegistrationImportService). Pass dry_run=1
     * to validate without writing.
     */
    public function import(Request $request, string $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
            'dry_run' => ['sometimes', 'boolean'],
        ]);

        $rows = $this->importService->parse(
            (string) file_get_contents($request->file('file')->getRealPath())
        );

        if (count($rows) > 2000) {
            return response()->json(['message' => 'Import is capped at 2000 rows per file.'], 422);
        }

        $dryRun = (bool) ($validated['dry_run'] ?? false);
        $result = $this->importService->import($event, $rows, 'csv_import', $dryRun);

        if (! $dryRun) {
            AuditService::log(
                action: 'registrations_imported',
                entityType: 'Event',
                entityId: (string) $event->id,
                eventId: $event->id,
                newValue: [
                    'rows' => count($rows),
                    'confirmed' => $result['confirmed'],
                    'waitlisted' => $result['waitlisted'],
                    'failed' => count($result['failures']),
                    'by' => $request->user()?->email,
                ],
            );
        }

        return response()->json(array_merge($result, ['rows' => count($rows)]));
    }

    public function lookup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'registration_number' => 'required|string',
            'email' => 'required|email',
        ]);

        $registration = Registration::where('registration_number', $validated['registration_number'])
            ->whereHas('participant', fn ($q) => $q->where('email', $validated['email']))
            ->with(['event', 'participant', 'ticket', 'answers'])
            ->first();

        if (! $registration) {
            return response()->json(['message' => 'No matching registration found with provided details.'], 404);
        }

        return response()->json([
            'registration' => $registration,
            'queue_position' => $registration->getQueuePosition(),
        ]);
    }

    public function showPublicBySecureToken(string $token): JsonResponse
    {
        $registration = Registration::where('secure_access_token', $token)
            ->with(['event', 'participant', 'ticket', 'answers'])
            ->firstOrFail();

        return response()->json([
            'registration' => $registration,
            'queue_position' => $registration->getQueuePosition(),
        ]);
    }

    public function cancelPublic(Request $request, string $token): JsonResponse
    {
        $registration = Registration::where('secure_access_token', $token)->firstOrFail();

        if (! $registration->event->allow_cancellation) {
            return response()->json(['message' => 'Cancellations are not enabled for this event.'], 403);
        }

        if ($registration->event->cancellation_deadline && now()->isAfter($registration->event->cancellation_deadline)) {
            return response()->json(['message' => 'Cancellation deadline has passed.'], 403);
        }

        $cancelled = $this->registrationService->cancelRegistration($registration, 'Cancelled by participant via self-service portal.');

        return response()->json([
            'message' => 'Registration cancelled successfully.',
            'registration' => $cancelled,
        ]);
    }

    public function indexForEvent(Request $request, string $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);

        $query = Registration::where('event_id', $event->id)
            ->with(['participant', 'ticket', 'answers']);

        RegistrationFilters::apply($query, $request);

        $perPage = min(500, max(1, (int) $request->input('per_page', 25)));
        // registration_sequence is atomic + monotonic, so it gives a stable
        // order even when many people register in the same second.
        $registrations = $query
            ->orderBy('registered_at', 'desc')
            ->orderBy('registration_sequence', 'desc')
            ->paginate($perPage);

        $registrations->getCollection()->transform(function ($reg) {
            $reg->queue_position = $reg->getQueuePosition();

            return $reg;
        });

        return response()->json($registrations);
    }

    public function show(string $id): JsonResponse
    {
        $registration = Registration::with([
            'event',
            'participant',
            'ticket',
            'answers',
            'statusHistory',
            'checkins',
            'attendance',
        ])->findOrFail($id);

        $registration->queue_position = $registration->getQueuePosition();

        return response()->json($registration);
    }

    public function approve(string $id): JsonResponse
    {
        $registration = $this->registrationService->approveRegistration(Registration::findOrFail($id));

        return response()->json($registration);
    }

    public function reject(Request $request, string $id): JsonResponse
    {
        $registration = $this->registrationService->rejectRegistration(
            Registration::findOrFail($id),
            $request->input('reason', 'Administrative rejection'),
        );

        return response()->json($registration);
    }

    /**
     * Bulk approve / reject / cancel over a set of registration ids for one
     * event. Each id runs through the same service method as the single-row
     * action; unknown or out-of-event ids are reported, not fatal.
     */
    public function bulk(Request $request, string $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $validated = $request->validate([
            'action' => 'required|string|in:approve,reject,cancel',
            'ids' => 'required|array|min:1|max:500',
            'ids.*' => 'string',
            'reason' => 'nullable|string|max:500',
        ]);

        $rows = Registration::where('event_id', $event->id)->whereIn('id', $validated['ids'])->get();
        $found = $rows->pluck('id')->all();
        $skipped = collect($validated['ids'])->diff($found)
            ->map(fn ($id) => ['id' => $id, 'reason' => 'not found for this event'])
            ->values()
            ->all();

        $processed = 0;
        foreach ($rows as $reg) {
            try {
                match ($validated['action']) {
                    'approve' => $this->registrationService->approveRegistration($reg),
                    'reject' => $this->registrationService->rejectRegistration($reg, $validated['reason'] ?? 'Bulk rejection'),
                    'cancel' => $this->registrationService->cancelRegistration($reg, $validated['reason'] ?? 'Bulk cancellation by administrator'),
                };
                $processed++;
            } catch (\Throwable $e) {
                $skipped[] = ['id' => $reg->id, 'reason' => $e->getMessage()];
            }
        }

        AuditService::log(
            action: 'registrations_bulk_'.$validated['action'],
            entityType: 'Event',
            entityId: (string) $event->id,
            eventId: $event->id,
            newValue: ['requested' => count($validated['ids']), 'processed' => $processed, 'skipped' => count($skipped)],
        );

        return response()->json(['processed' => $processed, 'skipped' => $skipped]);
    }

    /**
     * Revoke the current ticket and issue a fresh one (e.g. the old QR leaked).
     * Only meaningful for a confirmed registration.
     */
    public function reissueTicket(string $id): JsonResponse
    {
        $registration = Registration::findOrFail($id);

        if ($registration->status !== 'confirmed') {
            return response()->json(['message' => 'Only a confirmed registration has a ticket.'], 422);
        }

        $old = $registration->ticket()->first();
        if ($old && $old->status === 'active') {
            $this->ticketService->revokeTicket($old, 'Reissued by administrator');
        }
        $old?->delete();

        $ticket = $this->ticketService->issueTicket($registration->fresh());

        AuditService::log(
            action: 'ticket_reissued',
            entityType: 'Registration',
            entityId: (string) $registration->id,
            eventId: $registration->event_id,
        );

        return response()->json(['ticket' => $ticket]);
    }

    /** Edit the internal note on a registration. */
    public function updateNotes(Request $request, string $id): JsonResponse
    {
        $registration = Registration::findOrFail($id);
        $validated = $request->validate(['notes' => 'nullable|string|max:2000']);

        $registration->update(['notes' => $validated['notes']]);

        AuditService::log(
            action: 'registration_notes_updated',
            entityType: 'Registration',
            entityId: (string) $registration->id,
            eventId: $registration->event_id,
        );

        return response()->json($registration->fresh(['participant']));
    }

    public function cancelByAdmin(Request $request, string $id): JsonResponse
    {
        $registration = Registration::findOrFail($id);
        $reason = $request->input('reason', 'Cancelled by administrator');

        $cancelled = $this->registrationService->cancelRegistration($registration, $reason);

        return response()->json($cancelled);
    }
}
