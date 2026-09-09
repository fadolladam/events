<?php

namespace App\Modules\Reports;

use App\Http\Controllers\Controller;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ReportController extends Controller
{
    public function __construct(
        protected ReportService $reportService
    ) {}

    public function globalStats(): JsonResponse
    {
        $stats = $this->reportService->getGlobalDashboardStats();

        return response()->json($stats);
    }

    public function eventStats(string $eventId): JsonResponse
    {
        $analytics = $this->reportService->getEventAnalytics($eventId);

        return response()->json($analytics);
    }

    public function exportCsv(Request $request, string $eventId): Response
    {
        AuditService::log(
            action: 'report_exported',
            entityType: 'Event',
            entityId: $eventId,
            eventId: $eventId,
            newValue: ['format' => 'csv', 'filters' => $request->only(['status', 'attendance_status', 'checked_in', 'department', 'date_from', 'date_to', 'search'])],
        );

        return $this->reportService->exportCsv($eventId, $request);
    }

    public function exportPdf(string $eventId): Response
    {
        AuditService::log(
            action: 'report_exported',
            entityType: 'Event',
            entityId: $eventId,
            eventId: $eventId,
            newValue: ['format' => 'pdf'],
        );

        return $this->reportService->exportPdfReport($eventId);
    }
}
