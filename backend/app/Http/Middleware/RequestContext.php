<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gives every request a stable id, shares it into the log context (so every
 * line for that request carries it) and echoes it back as `X-Request-Id`.
 * Also flags slow requests to the `performance` channel.
 */
class RequestContext
{
    private const SLOW_MS = 1500;

    public function handle(Request $request, Closure $next): Response
    {
        $id = $request->headers->get('X-Request-Id') ?: (string) Str::uuid();
        $request->attributes->set('request_id', $id);

        Log::shareContext([
            'request_id' => $id,
            'ip' => $request->ip(),
            'user_id' => optional($request->user())->id,
        ]);

        $start = microtime(true);
        $response = $next($request);
        $ms = (int) round((microtime(true) - $start) * 1000);

        $response->headers->set('X-Request-Id', $id);

        if ($ms >= self::SLOW_MS) {
            Log::channel('performance')->warning('slow request', [
                'method' => $request->method(),
                'path' => $request->path(),
                'ms' => $ms,
                'status' => $response->getStatusCode(),
            ]);
        }

        return $response;
    }
}
