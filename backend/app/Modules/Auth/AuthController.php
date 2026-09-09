<?php

namespace App\Modules\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\TransientToken;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService
    ) {}

    /** Failed attempts before a per-account/IP lockout, and the lockout window. */
    private const LOGIN_MAX_ATTEMPTS = 5;

    private const LOGIN_DECAY_SECONDS = 900;

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $throttleKey = 'login:'.Str::lower($validated['email']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, self::LOGIN_MAX_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            AuditService::log(
                action: 'user_login_locked_out',
                entityType: 'User',
                newValue: ['email' => $validated['email'], 'retry_after' => $seconds],
            );

            throw ValidationException::withMessages([
                'email' => ['Too many failed attempts. Try again in '.ceil($seconds / 60).' minute(s).'],
            ])->status(429);
        }

        // A request from the first-party SPA carries a session (Sanctum's
        // stateful middleware started one); it authenticates by cookie and
        // needs no token. Other API clients get a bearer token.
        $stateful = $request->hasSession();

        try {
            $result = $this->authService->login(
                $validated['email'],
                $validated['password'],
                withToken: ! $stateful,
            );
        } catch (ValidationException $e) {
            // Count the failure; the limiter's own decay gives the backoff.
            RateLimiter::hit($throttleKey, self::LOGIN_DECAY_SECONDS);

            throw $e;
        }

        RateLimiter::clear($throttleKey);

        if ($stateful) {
            Auth::guard('web')->login($result['user']);
            $request->session()->regenerate();
        }

        return response()->json([
            'message' => 'Login successful',
            'user' => $result['user'],
            'must_change_password' => (bool) $result['user']->must_change_password,
            'token' => $result['token'],
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => PasswordRules::forCreate(),
            'phone' => 'nullable|string|max:50',
        ]);

        // Public self-service accounts are ALWAYS participants. Staff accounts
        // (any privileged role) are created only via storeUser() by an admin.
        $validated['role'] = 'participant';

        $result = $this->authService->register($validated);

        return response()->json([
            'message' => 'Registration successful',
            'user' => $result['user'],
            'token' => $result['token'],
        ], 201);
    }

    /**
     * Admin-only creation of staff accounts with an explicit role.
     * Route-guarded to super_admin / event_admin.
     */
    public function storeUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => PasswordRules::forAdminSet(),
            'phone' => 'nullable|string|max:50',
            'role' => 'required|string|in:super_admin,event_admin,event_organizer,registration_officer,checkin_staff,viewer,participant',
            'must_change_password' => 'sometimes|boolean',
        ]);

        // Only a super_admin may mint another super_admin.
        if ($validated['role'] === 'super_admin' && $request->user()->role !== 'super_admin') {
            return response()->json([
                'message' => 'Only a super admin can create another super admin.',
            ], 403);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'status' => 'active',
            // Admin-provisioned accounts must rotate the password on first login
            // unless the creator explicitly opts out.
            'must_change_password' => $validated['must_change_password'] ?? true,
            'password_changed_at' => now(),
        ]);

        AuditService::log(
            action: 'user_created',
            entityType: 'User',
            entityId: (string) $user->id,
            newValue: ['email' => $user->email, 'role' => $user->role]
        );

        return response()->json(['user' => $user], 201);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('organization');

        return response()->json([
            'user' => $user,
            'must_change_password' => (bool) $user->must_change_password,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        // Bearer-token clients: drop just the token that made this call.
        $token = $user?->currentAccessToken();
        if ($token && ! $token instanceof TransientToken) {
            $token->delete();
        }

        // SPA cookie session: log out and tear the session down.
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        if ($user) {
            AuditService::log(
                action: 'user_logout',
                entityType: 'User',
                entityId: (string) $user->id
            );
        }

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Change the authenticated user's own password. Requires the current
     * password, enforces the policy, clears must_change_password, and revokes
     * every other session token.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => PasswordRules::forCreate(),
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Your current password is incorrect.'],
            ]);
        }

        if (Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['The new password must be different from the current one.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
            'password_changed_at' => now(),
        ])->save();

        // Invalidate all other bearer tokens; keep the one making this call
        // (a session-authed request has no real token, so all are dropped).
        $token = $user->currentAccessToken();
        $currentId = $token instanceof TransientToken ? null : $token?->id;
        $user->tokens()->when($currentId, fn ($q) => $q->where('id', '!=', $currentId))->delete();

        // Session-authed request: rotate the session id but keep this one alive.
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        AuditService::log(
            action: 'user_password_changed',
            entityType: 'User',
            entityId: (string) $user->id,
        );

        return response()->json(['message' => 'Password updated.']);
    }

    /**
     * Governance action: flag another account so it must set a new password on
     * next login, and drop its live sessions immediately.
     */
    public function forcePasswordReset(Request $request, string $id): JsonResponse
    {
        $target = User::findOrFail($id);

        if ($target->role === 'super_admin' && $request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Only a super admin can do this to a super admin.'], 403);
        }

        $target->forceFill(['must_change_password' => true])->save();
        $target->tokens()->delete();

        AuditService::log(
            action: 'user_password_reset_forced',
            entityType: 'User',
            entityId: (string) $target->id,
            newValue: ['by' => $request->user()?->email],
        );

        return response()->json(['message' => 'The user must set a new password on next sign-in.']);
    }

    /** Lean list of staff-eligible accounts for event-team pickers. */
    public function assignable(Request $request): JsonResponse
    {
        $rows = User::where('role', '!=', 'participant')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return response()->json(['data' => $rows]);
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('name')->paginate(25);

        return response()->json($users);
    }
}
