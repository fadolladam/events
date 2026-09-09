<?php

namespace App\Modules\System;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Vendor-neutral operational snapshot for a monitoring probe (governance-only).
 * `/up` remains the plain liveness check; this adds dependency + signal detail.
 */
class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->timed(fn () => DB::select('select 1')),
            'cache' => $this->timed(function () {
                Cache::put('health:ping', 1, 5);

                return Cache::get('health:ping') === 1;
            }),
        ];

        $path = storage_path();
        $free = @disk_free_space($path);
        $total = @disk_total_space($path);
        $diskPct = ($free && $total) ? (int) round(($total - $free) / $total * 100) : null;

        $signals = [
            'login_failures_1h' => AuditLog::where('action', 'user_login_failed')->where('created_at', '>=', now()->subHour())->count(),
            'lockouts_1h' => AuditLog::where('action', 'user_login_locked_out')->where('created_at', '>=', now()->subHour())->count(),
            'disk_used_pct' => $diskPct,
        ];

        $ok = collect($checks)->every(fn ($c) => $c['ok'])
            && ($diskPct === null || $diskPct < 95);

        return response()->json([
            'status' => $ok ? 'ok' : 'degraded',
            'time' => now()->toIso8601String(),
            'checks' => $checks,
            'signals' => $signals,
        ], $ok ? 200 : 503);
    }

    /** @return array{ok:bool, ms:int} */
    private function timed(callable $fn): array
    {
        $t = microtime(true);
        try {
            $fn();
            $ok = true;
        } catch (\Throwable $e) {
            $ok = false;
        }

        return ['ok' => $ok, 'ms' => (int) round((microtime(true) - $t) * 1000)];
    }
}
