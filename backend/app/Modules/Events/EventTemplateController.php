<?php

namespace App\Modules\Events;

use App\Http\Controllers\Controller;
use App\Models\EventTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventTemplateController extends Controller
{
    public function index(): JsonResponse
    {
        $templates = EventTemplate::with('category')->orderBy('name')->get();

        return response()->json($templates);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:event_categories,id',
            'structure' => 'required|array',
        ]);

        $template = EventTemplate::create($validated);

        return response()->json($template, 201);
    }
}
