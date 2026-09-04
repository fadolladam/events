<?php

namespace App\Modules\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\NotificationLog;
use App\Models\NotificationTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function templates(Request $request): JsonResponse
    {
        $query = NotificationTemplate::query();

        if ($request->filled('event_id')) {
            $query->where('event_id', $request->input('event_id'));
        }

        $templates = $query->orderBy('trigger_event')->get();
        return response()->json($templates);
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_id' => 'nullable|uuid|exists:events,id',
            'trigger_event' => 'required|string',
            'name' => 'required|string|max:255',
            'subject' => 'required|string|max:255',
            'body_template' => 'required|string',
            'is_active' => 'boolean',
        ]);

        $template = NotificationTemplate::create($validated);
        return response()->json($template, 201);
    }

    public function logs(Request $request): JsonResponse
    {
        $query = NotificationLog::query()->with('registration.participant');

        if ($request->filled('event_id')) {
            $query->where('event_id', $request->input('event_id'));
        }

        $perPage = (int) $request->input('per_page', 25);
        $logs = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($logs);
    }
}
