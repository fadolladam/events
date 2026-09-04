<?php

namespace App\Modules\Auth;

use App\Models\User;
use App\Modules\Audit\AuditService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated.'],
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        AuditService::log(
            action: 'user_login',
            entityType: 'User',
            entityId: (string) $user->id,
            newValue: ['email' => $user->email, 'role' => $user->role]
        );

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    public function register(array $data): array
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'] ?? 'participant',
            'phone' => $data['phone'] ?? null,
            'organization_id' => $data['organization_id'] ?? null,
            'status' => 'active',
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        AuditService::log(
            action: 'user_registered',
            entityType: 'User',
            entityId: (string) $user->id,
            newValue: ['email' => $user->email, 'role' => $user->role]
        );

        return [
            'user' => $user,
            'token' => $token,
        ];
    }
}
