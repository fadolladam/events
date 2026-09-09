<?php

use App\Http\Middleware\SecurityHeaders;
use App\Modules\Auth\RoleMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            // Uploaded event cover/banner images live on the "public" disk
            // (storage/app/public) and are referenced as /storage/<folder>/<uuid>.<ext>.
            // They are normally reached through the public/storage symlink; this
            // route serves them whether or not that symlink exists (creating it
            // needs elevated rights on Windows / XAMPP). Registered here so it
            // carries no web-group middleware — no session, CSRF or cookies per
            // image. Where the symlink is present the web server serves the file
            // first and this route never runs.
            Route::get('/storage/{path}', function (string $path) {
                $path = ltrim(str_replace('\\', '/', $path), '/');

                abort_if($path === '' || str_contains($path, '..'), 404);

                $disk = Storage::disk('public');
                abort_unless($disk->exists($path), 404);

                return $disk->response($path, null, ['Cache-Control' => 'public, max-age=604800']);
            })->where('path', '.+');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);

        // Security headers on every response (SPA HTML, API JSON, /storage).
        $middleware->append(SecurityHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
