<?php

return [

    /*
    |--------------------------------------------------------------------------
    | HTTP security headers
    |--------------------------------------------------------------------------
    |
    | Consumed by App\Http\Middleware\SecurityHeaders. Leave the defaults for a
    | same-origin SPA deployment; override per environment when a CDN, external
    | font host, analytics endpoint, etc. is introduced.
    |
    */

    'headers_enabled' => (bool) env('SECURITY_HEADERS_ENABLED', true),

    'hsts' => (bool) env('SECURITY_HSTS', true),

    // Set SECURITY_CSP in the environment to replace the built-in policy
    // wholesale. Empty string / null keeps the middleware default.
    'csp' => env('SECURITY_CSP') ?: null,

    'permissions_policy' => env(
        'SECURITY_PERMISSIONS_POLICY',
        'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
    ),

];
