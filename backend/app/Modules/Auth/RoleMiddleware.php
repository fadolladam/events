<?php

namespace App\Modules\Auth;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        // Super Admin has access to all roles
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        if (empty($roles)) {
            return $next($request);
        }

        if (in_array($user->role, $roles, true)) {
            return $next($request);
        }

        abort(403, 'You do not have permission for this action.');
    }
}
