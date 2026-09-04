<?php

namespace App\Modules\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService
    ) {}

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $result = $this->authService->login($validated['email'], $validated['password']);

        return response()->json([
            'message' => 'Login successful',
            'user' => $result['user'],
            'token' => $result['token'],
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
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
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:50',
            'role' => 'required|string|in:super_admin,event_admin,event_organizer,registration_officer,checkin_staff,viewer,participant',
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
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $user->currentAccessToken()->delete();
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
