<?php

namespace App\Modules\Dashboard;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardService $dashboardService
    ) {}

    /**
     * Global "Event Operations" overview. Read-only; available to every staff
     * role (same tier as /dashboard/stats). Optional query params:
     *   range = today|7d|30d|90d|this_month|this_year|custom
     *   from, to = ISO dates (only used when range=custom)
     */
    public function overview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'range' => 'nullable|string|in:today,7d,30d,90d,this_month,this_year,custom',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        return response()->json($this->dashboardService->getOverview($validated));
    }
}
