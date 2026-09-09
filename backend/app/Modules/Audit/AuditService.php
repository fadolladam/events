<?php

namespace App\Modules\Audit;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /** Actions that also belong in the security log. */
    private const SECURITY_ACTIONS = [
        'user_login', 'user_login_failed', 'user_login_locked_out', 'user_logout',
        'user_created', 'user_updated', 'user_registered',
        'user_password_changed', 'user_password_reset_forced',
        'event_staff_updated', 'organization_updated',
    ];

    public static function log(
        string $action,
        string $entityType,
        ?string $entityId = null,
        ?string $eventId = null,
        ?array $previousValue = null,
        ?array $newValue = null
    ): AuditLog {
        $user = Auth::user();

        $row = AuditLog::create([
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

        // Mirror to the append-only audit log file, and security-relevant
        // actions to the security channel too.
        $context = [
            'action' => $action,
            'actor' => $user?->email ?? 'system',
            'entity' => $entityType.($entityId ? ":{$entityId}" : ''),
            'event_id' => $eventId,
        ];
        Log::channel('audit')->info($action, $context);
        if (in_array($action, self::SECURITY_ACTIONS, true)) {
            $level = str_contains($action, 'fail') || str_contains($action, 'locked') ? 'warning' : 'info';
            Log::channel('security')->{$level}($action, $context);
        }

        return $row;
    }
}
