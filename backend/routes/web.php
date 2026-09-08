<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SPA hosting
|--------------------------------------------------------------------------
| The React app is built into public/ (see frontend/vite.config.ts). The web
| server serves its static assets (public/assets/*, images) directly; every
| other non-API path is handed the SPA's index.html so client-side routing
| works on deep links and page refreshes.
*/

$spa = function () {
    $index = public_path('index.html');

    abort_unless(
        is_file($index),
        503,
        'Frontend not built yet. Run: cd frontend && npm install && npm run build',
    );

    return response()->file($index);
};

// Uploaded event images (GET /storage/{path}) are served by a middleware-free
// route registered in bootstrap/app.php — works with or without the
// public/storage symlink and skips session/CSRF cost per image.

Route::get('/', $spa);

Route::fallback(function (Request $request) use ($spa) {
    // Unknown API and storage paths stay real 404s, not the SPA shell.
    abort_if($request->is('api/*') || $request->is('storage/*'), 404);

    return $spa();
});
