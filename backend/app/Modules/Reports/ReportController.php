<?php

namespace App\Modules\Reports;

use App\Http\Controllers\Controller;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
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

    public function exportCsv(string $eventId): Response
    {
        AuditService::log(
            action: 'report_exported',
            entityType: 'Event',
            entityId: $eventId,
            eventId: $eventId,
            newValue: ['format' => 'csv'],
        );

        return $this->reportService->exportCsv($eventId);
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
