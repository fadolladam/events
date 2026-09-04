<?php

namespace App\Modules\Forms;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\RegistrationForm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FormBuilderController extends Controller
{
    public function __construct(
        protected FormBuilderService $formService
    ) {}

    public function show(string $eventId): JsonResponse
    {
        $form = RegistrationForm::where('event_id', $eventId)
            ->with(['fields' => fn($q) => $q->orderBy('field_order', 'asc')])
            ->firstOrFail();

        return response()->json($form);
    }

    public function update(Request $request, string $eventId): JsonResponse
    {
        Event::findOrFail($eventId);

        $validated = $request->validate([
            'fields' => 'required|array|min:1',
            'fields.*.field_key' => 'required|string',
            'fields.*.label' => 'required|string',
            'fields.*.type' => 'required|string',
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
