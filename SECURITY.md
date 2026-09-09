# Security Overview — RHB Events

_Internal application handling employee and event data. Last updated 2026-09-09._

This document describes the current security posture and the extension points
for MFA and corporate SSO. See `RBAC-MATRIX.md` for the full endpoint × role
table and `TODO-MASTER.md` for outstanding work.

---

## Authentication

- **Mechanism:** Laravel Sanctum personal access tokens (`Authorization:
  Bearer`). Token TTL 480 min (`SANCTUM_TOKEN_EXPIRATION`).
- **Login endpoint:** `POST /api/auth/login`, throttled `10/min` per IP.
  - Per **email + IP** lockout: 5 failed attempts → 15-minute lockout returning
    **429**; a correct password during the lockout is still refused; the counter
    clears on a successful login.
  - One generic error (`"Invalid credentials."`) for unknown email, wrong
    password, and deactivated account — no account enumeration.
  - Every failed attempt and every lockout is written to `audit_logs`
    (`user_login_failed`, `user_login_locked_out`).
  - Successful login stamps `users.last_login_at`.
- **Logout:** `POST /api/auth/logout` deletes the current token; audited.

### Known gap — session/cookie auth (TODO-MASTER #4)

The SPA still stores the bearer token in `localStorage` (XSS-exfiltratable).
The planned target is Sanctum **stateful cookie** auth (HttpOnly + Secure +
SameSite + CSRF, session regeneration on login). This is a cross-cutting change
(every frontend request, CORS, session config) and is tracked but not yet done.

---

## Passwords

- Policy (`App\Modules\Auth\PasswordRules`, wired as `Password::defaults()`):
  **min 12 chars, mixed case, numbers, symbols**; HaveIBeenPwned
  "uncompromised" check **in production only** (keeps tests/offline dev
  deterministic).
- **Self-service change:** `POST /api/auth/password` — verifies the current
  password, forbids reusing it, clears `must_change_password`, and revokes all
  of that user's *other* tokens. Audited (`user_password_changed`).
- **Admin-provisioned accounts** (`POST /api/users`) default to
  `must_change_password = true`.
- **Force reset:** `POST /api/users/{id}/force-password-reset` (governance) sets
  the flag and drops the target's live sessions. An `event_admin` cannot target
  a `super_admin`. Audited (`user_password_reset_forced`).
- Demo seeders (`DatabaseSeeder`, `FreshProjectSeeder`) **refuse to run in
  production** — they plant `password123` accounts.
- **Not yet built:** the email "forgot password" reset-link flow — it depends on
  the notification layer, which is out of scope for this phase.

---

## Authorization

Two layers, both backend-enforced (`routes/api.php`):

1. **Role tier** — `role:` middleware (`App\Modules\Auth\RoleMiddleware`).
   `super_admin` passes unconditionally.
2. **Event scope** — `event.scope` middleware
   (`App\Modules\Auth\EventScopeMiddleware`) on the STAFF / EVENT_MANAGER /
   REGISTRATION / CHECKIN route groups:
   - `super_admin`, `event_admin` → org-wide (all events).
   - `event_organizer`, `registration_officer`, `checkin_staff`, `viewer` →
     only events they hold an `event_staff` row for; **403** otherwise.
   - `GET /events` is filtered to assigned events for these roles.
   - Registration-scoped routes (`/registrations/{id}`,
     `/waitlist/{registrationId}/priority`) resolve the parent event and apply
     the same check (IDOR protection).

Privilege-escalation guard: only a `super_admin` can create another
`super_admin` (`POST /users`).

**Outstanding:** exhaustive endpoint × 7-role automated test matrix
(TODO-MASTER #11); API Resources to stop returning raw models (#12).

---

## Tokens & QR tickets

- `registrations.secure_access_token` — `Str::random(48)`.
- `tickets.secure_token` — `Str::random(64)`; `qr_payload` is a URL containing
  only that token — **no participant PII**.
- Cancelling a registration **revokes its ticket** (`status = revoked`), so the
  QR stops scanning.
- Check-in (`CheckInService::scanQr`) rejects: unknown token, a ticket for a
  different event, and a revoked ticket. Duplicate check-in is blocked under a
  row lock.
- **Minor:** `tickets.ticket_code` (8 random chars) is also accepted as a scan
  key and is weaker than `secure_token`; candidate for removal.

---

## Uploads

`POST /api/media/upload` (event-manager tier, throttle 30/min):

- `getimagesize()` reads the real image header — it is authoritative for the
  type and the **written file extension**; the client filename is ignored.
- Allow-list: `image/jpeg`, `image/png`, `image/webp`, `image/gif` only.
- Dimensions capped at 6000 px per side.
- Stored under a fresh UUID filename on the `public` disk (no overwrite, no
  traversal). Constrained to `event-covers` / `event-banners` folders.
- Audited (`media_uploaded`).
- **Optional follow-up:** re-encode / strip EXIF.

---

## Transport & headers

`App\Http\Middleware\SecurityHeaders` (global), configurable via
`config/security.php` (env-backed), disable with `SECURITY_HEADERS_ENABLED=false`:

| Header | Value |
|---|---|
| Content-Security-Policy | same-origin; `img-src 'self' data: blob:`; `style-src 'self' 'unsafe-inline'`; `frame-ancestors 'none'`; `object-src 'none'` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(self), microphone=(), geolocation=(), …` (camera for the QR scanner) |
| Cross-Origin-Opener-Policy | `same-origin` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` — **HTTPS requests only** |

CORS: env allowlist (`config/cors.php`), not `*`.

---

## Rate limiting

| Route | Limit |
|---|---|
| `POST /auth/login` | 10/min + lockout (above) |
| `POST /auth/register` | 5/min |
| `POST /auth/password` | 10/min |
| `POST /public/events/{id}/register` | 15/min |
| `POST /public/registration/lookup` · `…/cancel` | 10/min |
| `GET /public/ticket/{token}` · `…/qr` | 30 / 60 per min |
| `POST /media/upload` | 30/min |
| check-in scan / process · undo / search | 240 / 120 per min (generous for event day) |
| CSV / PDF export | 20/min |
| `POST /users` · force-password-reset | 20/min |

---

## Audit trail

`audit_logs` (append-only via `AuditService::log`), records acting user, action,
entity, event, before/after JSON, IP, timestamp. Read-only at `GET
/api/audit-logs` (governance).

Logged today: `user_login`, `user_login_failed`, `user_login_locked_out`,
`user_logout`, `user_registered`, `user_created`, `user_password_changed`,
`user_password_reset_forced`, `event_created/updated/status_changed/duplicated/
deleted`, `registration_created`, `registration_manual_created`,
`registration_cancelled/approved/rejected`, `participant_promoted`,
`waitlist_priority_changed`, `ticket_issued/revoked`, `checkin_created`,
`checkin_reversed`, `media_uploaded`, `report_exported`.

**Outstanding:** user updated / role changed / disabled (need the user-edit
endpoints), attendance changes, and a DB-level guard so normal admins cannot
mutate `audit_logs`.

---

## MFA-readiness (TODO-MASTER #7)

Not implemented. The integration point is `App\Modules\Auth\AuthService::login`:
after `Hash::check` succeeds and before `createToken`, a confirmed second factor
would gate the token issue (return an `mfa_required` challenge instead). Adding
it needs: `two_factor_secret` / `two_factor_confirmed_at` columns on `users`, a
TOTP verify endpoint, and enrolment UI. Recommended to require it for
`super_admin` / `event_admin` / `event_organizer`.

## SSO-readiness (TODO-MASTER #8)

Not implemented. Local authentication is isolated in `AuthService` /
`RoleMiddleware`; application **authorization** (role tier + event scope) is
already independent of *how* the user authenticated. A future Microsoft Entra ID
integration would add an OIDC callback that resolves/creates the `User` and
issues the same Sanctum token — no change to the authorization layer. Keep
provider config out of code (env only).

---

## Deployment notes

- `APP_ENV=production`, `APP_DEBUG=false` (Docker compose sets these).
- Only `backend/public` should be web-accessible.
- Use a dedicated least-privilege MySQL account (not `root`) — Docker compose
  already provisions `events_user`; `.env.xampp` still uses `root` for local
  only.
- Never commit a real `.env`; `docker-compose.yml` still carries a default
  `APP_KEY` / DB passwords as literals for local convenience — override them in
  any real deployment (TODO-MASTER #47).
