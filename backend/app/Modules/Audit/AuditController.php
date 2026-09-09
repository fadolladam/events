<?php

namespace App\Modules\Audit;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query()->with('user');

        if ($request->filled('event_id')) {
            $query->where('event_id', $request->input('event_id'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->input('entity_type'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('user_name', 'like', "%{$search}%")
                    ->orWhere('entity_type', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 25);
        $logs = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($logs);
    }

    /** Per-event audit trail — visible to that event's managers (route is event-scoped). */
    public function forEvent(Request $request, string $eventId): JsonResponse
    {
        $query = AuditLog::query()->with('user')->where('event_id', $eventId);

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q->where('action', 'like', "%{$search}%")
                ->orWhere('user_name', 'like', "%{$search}%")
                ->orWhere('entity_type', 'like', "%{$search}%"));
        }

        $perPage = min(100, max(1, (int) $request->input('per_page', 30)));

        return response()->json(
            $query->orderByDesc('created_at')->paginate($perPage)
        );
    }
}
