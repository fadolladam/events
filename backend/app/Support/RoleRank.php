<?php

namespace App\Support;

use App\Models\User;

/**
 * Ordinal rank of the staff role hierarchy (see RBAC-MATRIX.md):
 * super_admin > event_admin > event_organizer > registration_officer >
 * checkin_staff > viewer. Higher number = more trusted.
 *
 * Used by least-privilege API resources (TODO #12) to decide which fields a
 * given caller's role may see, independent of whether they may hit the
 * endpoint at all (that's still RoleMiddleware's job).
 */
final class RoleRank
{
    public const VIEWER = 0;

    public const CHECKIN_STAFF = 1;

    public const REGISTRATION_OFFICER = 2;

    public const EVENT_ORGANIZER = 3;

    public const EVENT_ADMIN = 4;

    public const SUPER_ADMIN = 5;

    private const RANKS = [
        'viewer' => self::VIEWER,
        'checkin_staff' => self::CHECKIN_STAFF,
        'registration_officer' => self::REGISTRATION_OFFICER,
        'event_organizer' => self::EVENT_ORGANIZER,
        'event_admin' => self::EVENT_ADMIN,
        'super_admin' => self::SUPER_ADMIN,
    ];

    /** Unknown/absent role (e.g. no authenticated user) ranks as the lowest tier. */
    public static function of(?User $user): int
    {
        if (! $user) {
            return self::VIEWER;
        }

        return self::RANKS[$user->role] ?? self::VIEWER;
    }

    public static function atLeast(?User $user, int $minRank): bool
    {
        return self::of($user) >= $minRank;
    }
}
