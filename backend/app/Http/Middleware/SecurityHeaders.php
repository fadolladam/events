<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds production security headers to every response. The app serves its own
 * React SPA from the same origin, so a fairly strict same-origin CSP works:
 * the only external needs are data:/blob: images (QR codes) and the device
 * camera (QR scanner), both explicitly allowed below.
 *
 * Every value can be overridden from config/security.php (env-backed) and the
 * whole layer can be switched off with SECURITY_HEADERS_ENABLED=false.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! config('security.headers_enabled', true)) {
            return $response;
        }

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => config(
                'security.permissions_policy',
                'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
            ),
            'Cross-Origin-Opener-Policy' => 'same-origin',
            'X-Permitted-Cross-Domain-Policies' => 'none',
        ];

        // config('security.csp') is explicitly null by default (env override
        // slot), so fall back rather than passing it as config()'s default arg.
        $csp = config('security.csp') ?: $this->defaultCsp();
        if ($csp) {
            $headers['Content-Security-Policy'] = $csp;
        }

        // Only advertise HSTS over a genuine HTTPS request so local http dev
        // isn't pinned to https by the browser.
        if ($request->isSecure() && config('security.hsts', true)) {
            $headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
        }

        foreach ($headers as $key => $value) {
            if (! $response->headers->has($key)) {
                $response->headers->set($key, $value);
            }
        }

        return $response;
    }

    private function defaultCsp(): string
    {
        return implode('; ', [
            "default-src 'self'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "object-src 'none'",
            "script-src 'self'",
            // React/Tailwind set inline style attributes at runtime.
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "media-src 'self' blob:",
            "connect-src 'self'",
            "worker-src 'self' blob:",
        ]);
    }
}
