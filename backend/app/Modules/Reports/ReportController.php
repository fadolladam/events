<?php

namespace App\Modules\Reports;

use App\Http\Controllers\Controller;
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
        return $this->reportService->exportCsv($eventId);
    }

    public function exportPdf(string $eventId): Response
    {
        return $this->reportService->exportPdfReport($eventId);
    }
}
