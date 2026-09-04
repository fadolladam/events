<?php

namespace App\Modules\Audit;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public static function log(
        string $action,
        string $entityType,
        ?string $entityId = null,
        ?string $eventId = null,
        ?array $previousValue = null,
        ?array $newValue = null
    ): AuditLog {
        $user = Auth::user();

        return AuditLog::create([
            'user_id' => $user?->id,
            'user_name' => $user?->name ?? 'System',
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId ? (string) $entityId : null,
            'event_id' => $eventId,
            'previous_value' => $previousValue,
            'new_value' => $newValue,
            'ip_address' => Request::ip(),
            'created_at' => now(),
        ]);
    }
}
