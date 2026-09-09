<?php

namespace App\Modules\Organization;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The acting user's organization. Governance-tier. In a single-org install this
 * is the one row; the user's organization_id (or the sole Organization) selects
 * which record.
 */
class OrganizationController extends Controller
{
    private function resolve(Request $request): Organization
    {
        $id = $request->user()->organization_id;

        return $id
            ? Organization::findOrFail($id)
            : Organization::query()->firstOrFail();
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json($this->resolve($request));
    }

    public function update(Request $request): JsonResponse
    {
        $org = $this->resolve($request);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'logo_url' => 'sometimes|nullable|string|max:2048',
            'timezone' => 'sometimes|required|string|max:64',
            'country' => 'sometimes|nullable|string|max:100',
            'contact_email' => 'sometimes|nullable|email|max:255',
            'contact_phone' => 'sometimes|nullable|string|max:50',
            'settings' => 'sometimes|nullable|array',
            'settings.primary_color' => 'sometimes|nullable|string|max:9',
            'settings.secondary_color' => 'sometimes|nullable|string|max:9',
        ]);

        $before = $org->only(array_keys($validated));
        $org->fill($validated)->save();

        AuditService::log(
            action: 'organization_updated',
            entityType: 'Organization',
            entityId: (string) $org->id,
            previousValue: $before,
            newValue: $org->only(array_keys($validated)),
        );

        return response()->json($org->fresh());
    }
}
