<?php

namespace App\Modules\Auth;

use Illuminate\Validation\Rules\Password;

/**
 * One place for the local-account password policy so every entry point
 * (self-registration, admin-created staff, change-password) agrees.
 *
 * The concrete policy is registered as Password::defaults() in
 * AppServiceProvider; the HaveIBeenPwned "uncompromised" check is only added
 * in production so tests and offline dev stay deterministic.
 */
class PasswordRules
{
    /** Self-service / change-password: the client must confirm the entry. */
    /** @return array<int, mixed> */
    public static function forCreate(): array
    {
        return ['required', 'string', 'confirmed', Password::defaults()];
    }

    /**
     * Admin setting another account's initial password. No confirmation field
     * (the account is flagged must_change_password anyway).
     *
     * @return array<int, mixed>
     */
    public static function forAdminSet(): array
    {
        return ['required', 'string', Password::defaults()];
    }

    public static function policy(): Password
    {
        $rule = Password::min(12)->mixedCase()->numbers()->symbols();

        return app()->isProduction() ? $rule->uncompromised() : $rule;
    }
}
