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

        // One generic message for every failure mode (bad email, bad password,
        // deactivated account) so the endpoint cannot be used to enumerate which
        // addresses have accounts.
        $genericFailure = ValidationException::withMessages([
            'email' => ['Invalid credentials.'],
        ]);

        if (! $user || ! Hash::check($password, $user->password)) {
            AuditService::log(
                action: 'user_login_failed',
                entityType: 'User',
                entityId: $user?->id ? (string) $user->id : null,
                newValue: ['email' => $email, 'reason' => $user ? 'bad_password' : 'unknown_email'],
            );

            throw $genericFailure;
        }

        if ($user->status !== 'active') {
            AuditService::log(
                action: 'user_login_failed',
                entityType: 'User',
                entityId: (string) $user->id,
                newValue: ['email' => $email, 'reason' => 'inactive_account'],
            );

            throw $genericFailure;
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        $user->forceFill(['last_login_at' => now()])->save();

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
            // Self-service registration can never assign a privileged role.
            'role' => 'participant',
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
