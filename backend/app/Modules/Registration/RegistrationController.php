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
        protected WaitlistService $waitlistService
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

    public function lookup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'registration_number' => 'required|string',
            'email' => 'required|email',
        ]);

        $registration = Registration::where('registration_number', $validated['registration_number'])
            ->whereHas('participant', fn($q) => $q->where('email', $validated['email']))
            ->with(['event', 'participant', 'ticket', 'answers'])
            ->first();

        if (!$registration) {
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

        if (!$registration->event->allow_cancellation) {
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

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('attendance_status')) {
            $query->where('attendance_status', $request->input('attendance_status'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('registration_number', 'like', "%{$search}%")
                    ->orWhereHas('participant', function ($pq) use ($search) {
                        $pq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('employee_id', 'like', "%{$search}%");
                    });
            });
        }

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
        $registration = Registration::findOrFail($id);
        $event = $registration->event;

        $confirmedCount = Registration::where('event_id', $event->id)->where('status', 'confirmed')->count();
        $targetStatus = ($confirmedCount < $event->capacity) ? 'confirmed' : 'waitlisted';

        $registration->update([
            'status' => $targetStatus,
            'approved_at' => now(),
            'confirmed_at' => $targetStatus === 'confirmed' ? now() : null,
            'waitlisted_at' => $targetStatus === 'waitlisted' ? now() : null,
        ]);

        if ($targetStatus === 'confirmed') {
            $this->ticketService->issueTicket($registration);
        }

        AuditService::log(
            action: 'registration_approved',
            entityType: 'Registration',
            entityId: (string) $registration->id,
            eventId: $event->id,
            newValue: ['status' => $targetStatus]
        );

        return response()->json($registration->fresh(['participant', 'ticket']));
    }

    public function reject(Request $request, string $id): JsonResponse
    {
        $registration = Registration::findOrFail($id);
        $reason = $request->input('reason', 'Administrative rejection');

        $registration->update([
            'status' => 'rejected',
            'rejected_at' => now(),
        ]);

        AuditService::log(
            action: 'registration_rejected',
            entityType: 'Registration',
            entityId: (string) $registration->id,
            eventId: $registration->event_id,
            newValue: ['reason' => $reason]
        );

        return response()->json($registration->fresh());
    }

    public function cancelByAdmin(Request $request, string $id): JsonResponse
    {
        $registration = Registration::findOrFail($id);
        $reason = $request->input('reason', 'Cancelled by administrator');

        $cancelled = $this->registrationService->cancelRegistration($registration, $reason);

        return response()->json($cancelled);
    }
}
