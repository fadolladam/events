<?php

namespace App\Modules\Dashboard;

use App\Models\AuditLog;
use App\Models\Event;
use App\Models\EventStaff;
use App\Models\NotificationLog;
use App\Models\NotificationTemplate;
use App\Models\Registration;
use App\Models\RegistrationForm;
use App\Models\WaitlistHistory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Builds the global "Event Operations" dashboard payload from authoritative
 * database aggregates. Every per-event figure is derived from a handful of
 * GROUPed queries (never a per-row COUNT loop), so the whole overview costs a
 * fixed, small number of queries regardless of how many events exist.
 */
class DashboardService
{
    /** Registration statuses that occupy a confirmed seat. */
    private const CONFIRMED_STATUSES = ['confirmed'];

    /** Attendance statuses that count as "showed up". */
    private const PRESENT_STATUSES = ['checked_in', 'attended'];

    /** event_staff roles that can run onsite check-in. */
    private const CHECKIN_ROLES = ['checkin_staff', 'registration_officer', 'owner', 'event_admin', 'event_organizer'];

    public function getOverview(array $filters = []): array
    {
        [$from, $to, $range] = $this->resolveRange($filters);

        // Organization confinement — null for super_admin / unscoped accounts.
        $orgId = auth()->user()?->scopedOrgId();

        $events = Event::query()
            ->when($orgId !== null, fn ($q) => $q->where('organization_id', $orgId))
            ->with('category:id,name,color')
            ->get();

        // ---- grouped aggregates (fixed query count) --------------------------
        $statusCounts = $this->groupedCounts('status');            // [event_id][status] => n
        $attendanceCounts = $this->groupedCounts('attendance_status'); // [event_id][attendance_status] => n
        $formFieldCounts = RegistrationForm::query()
            ->withCount(['fields as active_fields_count' => fn ($q) => $q->where('is_hidden', false)])
            ->withCount('fields as total_fields_count')
            ->get()
            ->keyBy('event_id');
        $checkinStaffEventIds = EventStaff::query()
            ->whereIn('role', self::CHECKIN_ROLES)
            ->distinct()
            ->pluck('event_id')
            ->flip();
        $notificationTemplateTriggers = NotificationTemplate::query()
            ->where('is_active', true)
            ->get(['event_id'])
            ->groupBy('event_id');
        $hasGlobalTemplate = NotificationTemplate::query()->where('is_active', true)->whereNull('event_id')->exists();

        // Decorate every event with its resolved counts + dynamic status once.
        $rows = $events->map(function (Event $event) use ($statusCounts, $attendanceCounts) {
            $s = $statusCounts[$event->id] ?? [];
            $a = $attendanceCounts[$event->id] ?? [];

            $confirmed = (int) ($s['confirmed'] ?? 0);
            $pending = (int) ($s['pending'] ?? 0);
            $waitlisted = (int) ($s['waitlisted'] ?? 0);
            $cancelled = (int) ($s['cancelled'] ?? 0);
            $rejected = (int) ($s['rejected'] ?? 0);
            $present = (int) ($a['checked_in'] ?? 0) + (int) ($a['attended'] ?? 0);

            return (object) [
                'event' => $event,
                'confirmed' => $confirmed,
                'pending' => $pending,
                'waitlisted' => $waitlisted,
                'cancelled' => $cancelled,
                'rejected' => $rejected,
                'checked_in' => (int) ($a['checked_in'] ?? 0),
                'attended' => (int) ($a['attended'] ?? 0),
                'no_show' => (int) ($a['no_show'] ?? 0),
                'not_checked_in' => (int) ($a['not_checked_in'] ?? 0),
                'present' => $present,
                'total' => array_sum($s),
                'available' => max(0, $event->capacity - $confirmed),
                'attendance_pct' => $confirmed > 0 ? round($present / $confirmed * 100, 1) : 0.0,
                'utilization_pct' => $event->capacity > 0 ? round($confirmed / $event->capacity * 100, 1) : 0.0,
                'dynamic_status' => $event->calculateDynamicStatus($confirmed, $waitlisted),
            ];
        });

        return [
            'filters' => ['range' => $range, 'from' => $from?->toIso8601String(), 'to' => $to?->toIso8601String()],
            'generated_at' => now()->toIso8601String(),
            'kpis' => $this->kpis($rows, $from, $to, $orgId),
            'event_status_breakdown' => $this->statusBreakdown($rows),
            'action_required' => $this->actionRequired($rows, $formFieldCounts, $checkinStaffEventIds),
            'active_events' => $this->activeEvents($rows),
            'capacity_utilization' => $this->capacityUtilization($rows),
            'waitlist' => $this->waitlist($rows, $orgId),
            'pending_approvals' => $this->pendingApprovals($rows),
            'upcoming_events' => $this->upcomingEvents($rows),
            'today_operations' => $this->todayOperations($rows),
            'attendance_performance' => $this->attendancePerformance($rows),
            'registration_trend' => $this->registrationTrend($from, $to, $orgId),
            'registration_status_breakdown' => $this->registrationStatusBreakdown($orgId),
            'recent_registrations' => $this->recentRegistrations($orgId),
            'recent_activity' => $this->recentActivity($orgId),
            'notification_health' => $this->notificationHealth($orgId),
            'readiness' => $this->readiness($rows, $formFieldCounts, $checkinStaffEventIds, $notificationTemplateTriggers, $hasGlobalTemplate),
        ];
    }

    // =====================================================================
    // Sections
    // =====================================================================

    private function kpis(Collection $rows, ?Carbon $from, ?Carbon $to, ?int $orgId): array
    {
        $confirmed = $rows->sum('confirmed');
        $present = $rows->sum('present');

        $trendQuery = Registration::query()
            ->when($orgId !== null, fn ($q) => $q->whereHas('event', fn ($e) => $e->where('organization_id', $orgId)));
        if ($from) {
            $trendQuery->where('registered_at', '>=', $from);
        }
        if ($to) {
            $trendQuery->where('registered_at', '<=', $to);
        }

        return [
            'total_events' => $rows->count(),
            'open_registration' => $rows->where('dynamic_status', 'registration_open')->count(),
            'upcoming_events' => $rows->where('dynamic_status', 'upcoming')->count(),
            'ongoing_events' => $rows->where('dynamic_status', 'ongoing')->count(),
            'total_registrations' => (clone $trendQuery)->count(),
            'confirmed' => $confirmed,
            'waitlisted' => $rows->sum('waitlisted'),
            'checked_in' => $present,
            'attendance_rate' => $confirmed > 0 ? round($present / $confirmed * 100, 1) : 0.0,
        ];
    }

    private function statusBreakdown(Collection $rows): array
    {
        $keys = ['draft', 'upcoming', 'registration_open', 'full', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'archived'];
        $out = array_fill_keys($keys, 0);
        foreach ($rows as $r) {
            $out[$r->dynamic_status] = ($out[$r->dynamic_status] ?? 0) + 1;
        }

        return $out;
    }

    private function actionRequired(
        Collection $rows,
        Collection $formFieldCounts,
        Collection $checkinStaffEventIds
    ): array {
        $now = now();
        $items = [];

        $failed24h = NotificationLog::query()
            ->where('status', 'failed')
            ->where('created_at', '>=', $now->copy()->subDay())
            ->selectRaw('event_id, count(*) c')
            ->groupBy('event_id')
            ->pluck('c', 'event_id');

        foreach ($rows as $r) {
            $e = $r->event;
            $status = $r->dynamic_status;
            $isLive = in_array($status, ['registration_open', 'full', 'upcoming', 'ongoing'], true);
            $startsIn24h = $e->start_at && $e->start_at->isBetween($now, $now->copy()->addDay());
            $closesIn24h = $e->registration_close_at && $e->registration_close_at->isBetween($now, $now->copy()->addDay());
            $form = $formFieldCounts->get($e->id);
            $activeFields = (int) ($form->active_fields_count ?? 0);

            $push = function (string $priority, string $type, string $issue, string $detail, string $action, string $tab) use (&$items, $e) {
                $items[] = [
                    'priority' => $priority,
                    'type' => $type,
                    'event_id' => $e->id,
                    'event_slug' => $e->slug,
                    'event_title' => $e->title,
                    'event_code' => $e->event_code,
                    'issue' => $issue,
                    'detail' => $detail,
                    'recommended_action' => $action,
                    'action_target' => ['tab' => $tab],
                ];
            };

            if ($r->confirmed > $e->capacity) {
                $push('CRITICAL', 'over_capacity', 'Confirmed participants exceed capacity',
                    "{$r->confirmed} confirmed against a capacity of {$e->capacity}.",
                    'Increase capacity or move the overflow back to the waitlist.', 'settings');
            } elseif ($e->capacity > 0 && $r->confirmed >= $e->capacity * 0.95) {
                $push('HIGH', 'near_capacity', 'Event is at or near capacity',
                    "{$r->confirmed} / {$e->capacity} confirmed ({$r->utilization_pct}%).",
                    'Review capacity and waitlist settings before registration fills.', 'settings');
            }

            if ($r->waitlisted > 0) {
                $push('HIGH', 'active_waitlist', 'Event has an active waitlist',
                    "{$r->confirmed} / {$e->capacity} confirmed with {$r->waitlisted} waiting.",
                    'Open the queue to promote participants or raise capacity.', 'queue');
            }

            if ($r->pending > 0 && $e->approval_mode === 'manual') {
                $push('HIGH', 'pending_approvals', 'Registrations are awaiting approval',
                    "{$r->pending} pending registration(s) need a decision.",
                    'Review and approve or reject the pending registrations.', 'registrations');
            }

            if ($isLive && $activeFields === 0) {
                $push('HIGH', 'form_incomplete',
                    $form ? 'Registration form has no active fields' : 'Registration is enabled but no form exists',
                    'Participants cannot submit a meaningful registration.',
                    'Open the Form Builder and add the questions to collect.', 'form');
            }

            if ($startsIn24h && ! $checkinStaffEventIds->has($e->id)) {
                $push('HIGH', 'no_checkin_staff', 'Event starts soon with no check-in staff assigned',
                    'Starts '.$e->start_at->diffForHumans().' — nobody can run the door.',
                    'Assign check-in staff on the event team.', 'settings');
            }

            if ($closesIn24h) {
                $push('MEDIUM', 'registration_closing', 'Registration closes within 24 hours',
                    'Closes '.$e->registration_close_at->diffForHumans().'.',
                    'Confirm capacity and promote any waitlist you intend to admit.', 'queue');
            }

            if ($startsIn24h && $checkinStaffEventIds->has($e->id)) {
                $push('MEDIUM', 'starts_soon', 'Event starts within 24 hours',
                    'Starts '.$e->start_at->diffForHumans().'.',
                    'Do a final readiness check and open the check-in console.', 'checkin');
            }

            $failCount = (int) $failed24h->get($e->id, 0);
            if ($failCount > 0) {
                $push('MEDIUM', 'notification_failures', 'Notifications are failing',
                    "{$failCount} failed notification(s) in the last 24 hours.",
                    'Review the notification logs and retry the failures.', 'reports');
            }

            if ($status === 'completed' && $r->not_checked_in > 0 && $r->confirmed > 0) {
                $push('LOW', 'attendance_open', 'Completed event still has attendance open',
                    "{$r->not_checked_in} confirmed participant(s) never marked present or no-show.",
                    'Finalise the attendance roster for accurate reporting.', 'attendance');
            }
        }

        $order = ['CRITICAL' => 0, 'HIGH' => 1, 'MEDIUM' => 2, 'LOW' => 3];
        usort($items, fn ($a, $b) => $order[$a['priority']] <=> $order[$b['priority']]);

        return $items;
    }

    private function activeEvents(Collection $rows): array
    {
        return $rows
            ->reject(fn ($r) => in_array($r->dynamic_status, ['draft', 'archived', 'cancelled', 'completed'], true))
            ->sortBy(fn ($r) => $r->event->start_at?->timestamp ?? PHP_INT_MAX)
            ->values()
            ->map(fn ($r) => $this->eventRow($r))
            ->all();
    }

    private function capacityUtilization(Collection $rows): array
    {
        return $rows
            ->reject(fn ($r) => in_array($r->dynamic_status, ['draft', 'archived', 'cancelled', 'completed'], true))
            ->sortByDesc('utilization_pct')
            ->values()
            ->map(fn ($r) => [
                'event_id' => $r->event->id,
                'event_slug' => $r->event->slug,
                'event_title' => $r->event->title,
                'event_code' => $r->event->event_code,
                'confirmed' => $r->confirmed,
                'capacity' => $r->event->capacity,
                'available' => $r->available,
                'queue' => $r->waitlisted,
                'pct' => $r->utilization_pct,
                'state' => $this->utilizationState($r),
            ])
            ->all();
    }

    private function utilizationState(object $r): string
    {
        if ($r->confirmed > $r->event->capacity) {
            return 'OVER CAPACITY';
        }
        if ($r->event->capacity > 0 && $r->confirmed >= $r->event->capacity) {
            return 'FULL';
        }
        if ($r->utilization_pct >= 90) {
            return 'NEAR FULL';
        }

        return 'HEALTHY';
    }

    private function waitlist(Collection $rows, ?int $orgId): array
    {
        $withQueue = $rows->filter(fn ($r) => $r->waitlisted > 0)->sortByDesc('waitlisted')->values();

        $oldestByEvent = Registration::query()
            ->where('status', 'waitlisted')
            ->selectRaw('event_id, MIN(waitlisted_at) oldest')
            ->groupBy('event_id')
            ->get()
            ->pluck('oldest', 'event_id');

        $recentPromotions = WaitlistHistory::query()
            ->where('action', 'promoted')
            ->when($orgId !== null, fn ($q) => $q->whereHas('event', fn ($e) => $e->where('organization_id', $orgId)))
            ->with(['event:id,title,event_code', 'registration.participant:id,name'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($h) => [
                'event_title' => $h->event?->title,
                'event_code' => $h->event?->event_code,
                'participant' => $h->registration?->participant?->name,
                'previous_position' => $h->previous_position,
                'promoted_at' => $h->created_at?->toIso8601String(),
            ])
            ->all();

        return [
            'total_waitlisted' => $rows->sum('waitlisted'),
            'events_with_waitlist' => $withQueue->count(),
            'largest_queue' => $withQueue->first()
                ? ['event_title' => $withQueue->first()->event->title, 'count' => $withQueue->first()->waitlisted]
                : null,
            'recent_promotions' => $recentPromotions,
            'table' => $withQueue->map(fn ($r) => [
                'event_id' => $r->event->id,
                'event_slug' => $r->event->slug,
                'event_title' => $r->event->title,
                'event_code' => $r->event->event_code,
                'capacity' => $r->event->capacity,
                'confirmed' => $r->confirmed,
                'queue' => $r->waitlisted,
                'oldest_wait_at' => optional($oldestByEvent->get($r->event->id), fn ($v) => Carbon::parse($v)->toIso8601String()),
                'registration_close_at' => $r->event->registration_close_at?->toIso8601String(),
            ])->all(),
        ];
    }

    private function pendingApprovals(Collection $rows): ?array
    {
        $manualEventIds = $rows->filter(fn ($r) => $r->event->approval_mode === 'manual')->pluck('event.id');
        if ($manualEventIds->isEmpty()) {
            return null;
        }

        $pendingRows = $rows->filter(fn ($r) => $r->pending > 0 && $r->event->approval_mode === 'manual');

        $recent = Registration::query()
            ->whereIn('event_id', $manualEventIds)
            ->where('status', 'pending')
            ->with(['participant:id,name,email', 'event:id,title,event_code,slug'])
            ->orderBy('registered_at')
            ->limit(15)
            ->get()
            ->map(fn ($reg) => [
                'registration_id' => $reg->id,
                'registration_number' => $reg->registration_number,
                'participant' => $reg->participant?->name,
                'email' => $reg->participant?->email,
                'event_title' => $reg->event?->title,
                'event_slug' => $reg->event?->slug,
                'event_id' => $reg->event_id,
                'submitted_at' => $reg->registered_at?->toIso8601String(),
            ])
            ->all();

        $oldest = Registration::query()
            ->whereIn('event_id', $manualEventIds)
            ->where('status', 'pending')
            ->min('registered_at');

        return [
            'total' => $pendingRows->sum('pending'),
            'oldest_at' => $oldest ? Carbon::parse($oldest)->toIso8601String() : null,
            'events' => $pendingRows->map(fn ($r) => [
                'event_id' => $r->event->id,
                'event_title' => $r->event->title,
                'pending' => $r->pending,
            ])->values()->all(),
            'rows' => $recent,
        ];
    }

    private function upcomingEvents(Collection $rows): array
    {
        $now = now();

        return $rows
            ->filter(fn ($r) => $r->event->start_at && $r->event->start_at->isAfter($now)
                && ! in_array($r->dynamic_status, ['cancelled', 'archived', 'draft'], true))
            ->sortBy(fn ($r) => $r->event->start_at->timestamp)
            ->take(8)
            ->values()
            ->map(fn ($r) => array_merge($this->eventRow($r), [
                'days_until' => (int) floor($now->diffInDays($r->event->start_at, false)),
            ]))
            ->all();
    }

    private function todayOperations(Collection $rows): array
    {
        $start = now()->startOfDay();
        $end = now()->endOfDay();

        return $rows
            ->filter(function ($r) use ($start, $end) {
                $e = $r->event;

                return $e->start_at && $e->end_at
                    && $e->start_at->lte($end) && $e->end_at->gte($start)
                    && ! in_array($r->dynamic_status, ['cancelled', 'archived', 'draft'], true);
            })
            ->sortBy(fn ($r) => $r->event->start_at->timestamp)
            ->values()
            ->map(fn ($r) => array_merge($this->eventRow($r), [
                'waitlisted' => $r->waitlisted,
                'not_checked_in' => max(0, $r->confirmed - $r->present),
                'checkin_state' => $r->confirmed === 0
                    ? 'NO CONFIRMED'
                    : ($r->present === 0 ? 'NOT STARTED' : ($r->present >= $r->confirmed ? 'COMPLETE' : 'IN PROGRESS')),
            ]))
            ->all();
    }

    private function attendancePerformance(Collection $rows): array
    {
        return $rows
            ->filter(fn ($r) => in_array($r->dynamic_status, ['ongoing', 'completed'], true))
            ->sortByDesc(fn ($r) => $r->event->start_at?->timestamp ?? 0)
            ->take(8)
            ->values()
            ->map(fn ($r) => [
                'event_id' => $r->event->id,
                'event_slug' => $r->event->slug,
                'event_title' => $r->event->title,
                'event_code' => $r->event->event_code,
                'confirmed' => $r->confirmed,
                'checked_in' => $r->checked_in,
                'attended' => $r->attended,
                'no_show' => $r->no_show,
                'attendance_rate' => $r->attendance_pct,
            ])
            ->all();
    }

    private function registrationTrend(?Carbon $from, ?Carbon $to, ?int $orgId): array
    {
        $from = ($from ?? now()->subDays(30))->copy()->startOfDay();
        $to = ($to ?? now())->copy()->endOfDay();

        $grouped = Registration::query()
            ->whereBetween('registered_at', [$from, $to])
            ->when($orgId !== null, fn ($q) => $q->whereHas('event', fn ($e) => $e->where('organization_id', $orgId)))
            ->selectRaw('DATE(registered_at) d, status, count(*) c')
            ->groupBy('d', 'status')
            ->get();

        $byDate = [];
        foreach ($grouped as $g) {
            $byDate[$g->d] ??= ['total' => 0, 'confirmed' => 0, 'waitlisted' => 0, 'cancelled' => 0];
            $byDate[$g->d]['total'] += $g->c;
            if (isset($byDate[$g->d][$g->status])) {
                $byDate[$g->d][$g->status] += $g->c;
            }
        }

        $series = [];
        for ($day = $from->copy(); $day->lte($to); $day->addDay()) {
            $key = $day->toDateString();
            $series[] = array_merge(['date' => $key], $byDate[$key] ?? ['total' => 0, 'confirmed' => 0, 'waitlisted' => 0, 'cancelled' => 0]);
        }

        return $series;
    }

    private function registrationStatusBreakdown(?int $orgId): array
    {
        $counts = Registration::query()
            ->when($orgId !== null, fn ($q) => $q->whereHas('event', fn ($e) => $e->where('organization_id', $orgId)))
            ->selectRaw('status, count(*) c')
            ->groupBy('status')
            ->pluck('c', 'status');

        return [
            'confirmed' => (int) ($counts['confirmed'] ?? 0),
            'pending' => (int) ($counts['pending'] ?? 0),
            'waitlisted' => (int) ($counts['waitlisted'] ?? 0),
            'rejected' => (int) ($counts['rejected'] ?? 0),
            'cancelled' => (int) ($counts['cancelled'] ?? 0),
        ];
    }

    private function recentRegistrations(?int $orgId): array
    {
        return Registration::query()
            ->when($orgId !== null, fn ($q) => $q->whereHas('event', fn ($e) => $e->where('organization_id', $orgId)))
            ->with(['participant:id,name', 'event:id,title,event_code,slug'])
            ->orderByDesc('registered_at')
            ->limit(12)
            ->get()
            ->map(fn ($reg) => [
                'registration_number' => $reg->registration_number,
                'participant' => $reg->participant?->name,
                'event_title' => $reg->event?->title,
                'event_slug' => $reg->event?->slug,
                'event_id' => $reg->event_id,
                'status' => $reg->status,
                'queue_position' => $reg->status === 'waitlisted' ? $reg->getQueuePosition() : null,
                'registered_at' => $reg->registered_at?->toIso8601String(),
                'source' => $reg->source ?? 'direct',
            ])
            ->all();
    }

    private function recentActivity(?int $orgId): array
    {
        return AuditLog::query()
            ->when($orgId !== null, fn ($q) => $q->whereHas('event', fn ($e) => $e->where('organization_id', $orgId)))
            ->with('event:id,title')
            ->orderByDesc('created_at')
            ->limit(15)
            ->get()
            ->map(fn ($log) => [
                'created_at' => $log->created_at?->toIso8601String(),
                'actor' => $log->user_name ?? 'System',
                'event_title' => $log->event?->title,
                'action' => $log->action,
                'summary' => $this->humaniseAction($log->action),
            ])
            ->all();
    }

    private function notificationHealth(?int $orgId): array
    {
        $startOfDay = now()->startOfDay();
        $scoped = fn () => NotificationLog::query()
            ->when($orgId !== null, fn ($q) => $q->whereHas('event', fn ($e) => $e->where('organization_id', $orgId)));

        $counts = $scoped()
            ->selectRaw('status, count(*) c')
            ->groupBy('status')
            ->pluck('c', 'status');

        return [
            'sent_today' => $scoped()->where('status', 'sent')->where('created_at', '>=', $startOfDay)->count(),
            'pending' => (int) ($counts['queued'] ?? 0),
            'failed' => (int) ($counts['failed'] ?? 0),
            'failed_24h' => $scoped()->where('status', 'failed')->where('created_at', '>=', now()->subDay())->count(),
        ];
    }

    private function readiness(
        Collection $rows,
        Collection $formFieldCounts,
        Collection $checkinStaffEventIds,
        Collection $notificationTemplateTriggers,
        bool $hasGlobalTemplate
    ): array {
        $now = now();

        return $rows
            ->filter(fn ($r) => $r->event->start_at && $r->event->start_at->isAfter($now)
                && ! in_array($r->dynamic_status, ['cancelled', 'archived'], true))
            ->sortBy(fn ($r) => $r->event->start_at->timestamp)
            ->take(5)
            ->values()
            ->map(function ($r) use ($formFieldCounts, $checkinStaffEventIds, $notificationTemplateTriggers, $hasGlobalTemplate) {
                $e = $r->event;
                $form = $formFieldCounts->get($e->id);
                $items = [
                    ['label' => 'Event Details', 'ok' => filled($e->title) && filled($e->description)],
                    ['label' => 'Date & Time', 'ok' => (bool) ($e->start_at && $e->end_at)],
                    ['label' => 'Venue', 'ok' => filled($e->venue_name) || filled($e->meeting_url) || filled($e->address)],
                    ['label' => 'Registration Form', 'ok' => (int) ($form->active_fields_count ?? 0) > 0],
                    ['label' => 'Capacity', 'ok' => (int) $e->capacity > 0],
                    ['label' => 'Notifications', 'ok' => $notificationTemplateTriggers->has($e->id) || $hasGlobalTemplate],
                    ['label' => 'Check-In Staff', 'ok' => $checkinStaffEventIds->has($e->id)],
                    ['label' => 'Public Page', 'ok' => (bool) $e->published_at],
                ];
                $ready = count(array_filter($items, fn ($i) => $i['ok']));

                return [
                    'event_id' => $e->id,
                    'event_slug' => $e->slug,
                    'event_title' => $e->title,
                    'event_code' => $e->event_code,
                    'ready_count' => $ready,
                    'total' => count($items),
                    'items' => $items,
                ];
            })
            ->all();
    }

    // =====================================================================
    // Helpers
    // =====================================================================

    /** @return array<string, array<string,int>> keyed by event_id then column value */
    private function groupedCounts(string $column): array
    {
        $out = [];
        Registration::query()
            ->selectRaw("event_id, {$column} as k, count(*) as c")
            ->groupBy('event_id', 'k')
            ->get()
            ->each(function ($row) use (&$out) {
                $out[$row->event_id][$row->k] = (int) $row->c;
            });

        return $out;
    }

    private function eventRow(object $r): array
    {
        $e = $r->event;

        return [
            'event_id' => $e->id,
            'event_slug' => $e->slug,
            'event_title' => $e->title,
            'event_code' => $e->event_code,
            'dynamic_status' => $r->dynamic_status,
            'start_at' => $e->start_at?->toIso8601String(),
            'end_at' => $e->end_at?->toIso8601String(),
            'venue' => $e->venue_name ?? $e->city ?? ($e->event_type === 'virtual' ? 'Virtual' : null),
            'capacity' => $e->capacity,
            'confirmed' => $r->confirmed,
            'available' => $r->available,
            'waitlist' => $r->waitlisted,
            'pending' => $r->pending,
            'checked_in' => $r->present,
            'attendance_pct' => $r->attendance_pct,
            'registration_close_at' => $e->registration_close_at?->toIso8601String(),
        ];
    }

    /** @return array{0: ?Carbon, 1: ?Carbon, 2: string} */
    private function resolveRange(array $filters): array
    {
        $range = $filters['range'] ?? '30d';
        $now = now();

        return match ($range) {
            'today' => [$now->copy()->startOfDay(), $now->copy()->endOfDay(), 'today'],
            '7d' => [$now->copy()->subDays(7)->startOfDay(), $now->copy()->endOfDay(), '7d'],
            '30d' => [$now->copy()->subDays(30)->startOfDay(), $now->copy()->endOfDay(), '30d'],
            '90d' => [$now->copy()->subDays(90)->startOfDay(), $now->copy()->endOfDay(), '90d'],
            'this_month' => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth(), 'this_month'],
            'this_year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear(), 'this_year'],
            'custom' => [
                isset($filters['from']) ? Carbon::parse($filters['from'])->startOfDay() : $now->copy()->subDays(30)->startOfDay(),
                isset($filters['to']) ? Carbon::parse($filters['to'])->endOfDay() : $now->copy()->endOfDay(),
                'custom',
            ],
            default => [$now->copy()->subDays(30)->startOfDay(), $now->copy()->endOfDay(), '30d'],
        };
    }

    private function humaniseAction(string $action): string
    {
        return ucfirst(str_replace('_', ' ', $action));
    }
}
