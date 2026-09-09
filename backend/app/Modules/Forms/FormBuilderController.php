<?php

namespace App\Modules\Forms;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FormBuilderController extends Controller
{
    public function __construct(
        protected FormBuilderService $formService
    ) {}

    public function show(string $eventId): JsonResponse
    {
        // 404 only for an unknown event — every real event must resolve to its
        // OWN registration form. Events created outside EventService (seeded
        // fixtures, imports, legacy rows) may not have a form row yet; return a
        // freshly scaffolded one for this event rather than failing, so the
        // builder never falls back to showing another event's form.
        Event::findOrFail($eventId);

        $form = $this->formService->getOrCreateForm($eventId);

        return response()->json($form);
    }

    public function update(Request $request, string $eventId): JsonResponse
    {
        Event::findOrFail($eventId);

        $validated = $request->validate([
            'fields' => 'required|array|min:1',
            'fields.*.field_key' => 'required|string',
            'fields.*.label' => 'required|string',
            'fields.*.type' => 'required|string|in:text,textarea,email,phone,employee_id,number,date,time,select,radio,checkbox,multi_select,consent,info',
            'fields.*.placeholder' => 'nullable|string',
            'fields.*.help_text' => 'nullable|string',
            'fields.*.is_required' => 'boolean',
            'fields.*.is_hidden' => 'boolean',
            'fields.*.options' => 'nullable|array',
            'fields.*.validation_rules' => 'nullable|array',
            'fields.*.conditional_logic' => 'nullable|array',
        ]);

        $form = $this->formService->saveFormStructure($eventId, $validated['fields']);

        return response()->json($form);
    }
}
