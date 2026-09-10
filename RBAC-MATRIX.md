# RBAC Matrix — RHB Events API

_Authoritative source: `backend/routes/api.php` + `App\Modules\Auth\RoleMiddleware`
+ `App\Modules\Auth\EventScopeMiddleware`. The React UI mirrors this in
`frontend/src/services/api.ts` (`ROLE_TIERS`) for convenience only — the backend
is authoritative. Last reviewed 2026-09-10._

## Two-layer model

1. **Role tier** (`role:` middleware) — does the caller hold a role that may
   perform this *kind* of action? `super_admin` passes every tier
   unconditionally.
2. **Event scope** (`event.scope` middleware) — may they apply it to *this*
   event?
   - `super_admin`, `event_admin` → **org-wide** (every event).
   - `event_organizer`, `registration_officer`, `checkin_staff`, `viewer` →
     only events where they hold an `event_staff` row. Otherwise **403**.
   - `GET /events` (list) is filtered to assigned events for these roles.
   - Registration-scoped routes (`/registrations/{id}`, `/waitlist/{id}/priority`)
     resolve the parent event and apply the same rule.

Unauthenticated → **401** on every protected route.

## Roles

`super_admin` ⊃ `event_admin` ⊃ `event_organizer` ⊃ `registration_officer` ⊃
`checkin_staff` ⊃ `viewer`; `participant` = public self-service only.

## Public (no auth)

| Method | Path |
|---|---|
| POST | `/auth/login` (throttle 10/min, 5 fails ⇒ 15-min lockout) |
| POST | `/auth/register` (throttle 5/min — role forced to `participant`) |
| GET | `/public/events`, `/public/events/{slug}`, `/public/categories` |
| POST | `/public/events/{id}/register` (15/min), `/public/registration/lookup` (10/min) |
| GET/POST | `/public/registration/{token}` · `/public/registration/{token}/cancel` (10/min) |
| GET | `/public/ticket/{token}` (30/min) · `/public/ticket/{token}/qr` (60/min) |

## Authenticated — any account

| Method | Path | Notes |
|---|---|---|
| GET | `/auth/me` | incl. `participant` |
| POST | `/auth/logout` | audited |

## Protected — tier × event-scope

Legend: ✔ = allowed (subject to event scope where the path has an event/registration id) · ✘ = 403 · — = n/a

| Endpoint | super_admin | event_admin | event_organizer | registration_officer | checkin_staff | viewer | event-scoped |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `GET /dashboard/stats` · `/dashboard/overview` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | no |
| `GET /events` (list) | ✔ all | ✔ all | ✔ assigned | ✔ assigned | ✔ assigned | ✔ assigned | filtered |
| `GET /events/{id}` · `/events/{id}/analytics` · `/events/{id}/form` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | **yes** |
| `GET /categories` · `/templates` · `/forms/templates[/{id}]` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | no |
| `POST /events` | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | no |
| `PUT /events/{id}` · `POST /events/{id}/duplicate` · `PATCH /events/{id}/status` | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | **yes** |
| `PUT /events/{id}/form` | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | **yes** |
| `POST /categories` · `POST /templates` | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | no |
| `POST /media/upload` (30/min) | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | no |
| `POST/PUT/DELETE /forms/templates[/{id}]` | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | no |
| `GET /events/{id}/export/{csv,pdf}` (20/min, audited) | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | **yes** |
| `GET/POST /notifications/templates` · `GET /notifications/logs` | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | no |
| `GET /events/{id}/registrations` | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | **yes** |
| `POST /events/{id}/registrations` (manual, 60/min, audited) | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | **yes** |
| `GET /registrations/{id}` · `POST …/approve` `…/reject` `…/cancel` | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | **yes** (via parent event) |
| `GET /events/{id}/waitlist[/history]` · `POST …/waitlist/promote` | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | **yes** |
| `PATCH /waitlist/{registrationId}/priority` | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | **yes** (via parent event) |
| `POST /events/{id}/checkin/{scan,,undo}` (240/240/120/min) | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | **yes** |
| `GET /events/{id}/checkin/{search,recent}` | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | **yes** |
| `GET /events/{id}/attendance` · `POST …/attendance/mark` | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | **yes** |
| `DELETE /events/{id}` | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | no (org-wide only) |
| `GET /audit-logs` | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | no |
| `GET /users` · `POST /users` (20/min) | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | no |

`POST /users`: an `event_admin` may create any role **except** `super_admin`
(only a `super_admin` mints another).

## Tests

`RbacMatrixTest` (every protected endpoint × all 6 roles + unauthenticated —
the exhaustive matrix; #11), `EventScopeAuthorizationTest` (org-wide vs
assigned vs unassigned vs 401), `ManualRegistrationTest` (registration-officer
tier + event scope), `AuditTrailTest`, `TicketSecurityTest`,
`LoginThrottleTest`, `UploadSecurityTest`, `LeastPrivilegeApiResourcesTest`
(field-level widening by role on the check-in/attendance endpoints — #12),
`DashboardOverviewScopeTest` (cross-organization isolation on
`/dashboard/overview`).

## Known residual gaps

- #12 (API Resources): only `checkin/*` and `attendance` responses are
  wrapped in least-privilege resources — the fields those two endpoints
  needed hidden from `checkin_staff` (phone/country/organization).
  `RegistrationController`/`ParticipantController`/`WaitlistController`
  (registration_officer+ only — no privilege differential there) and
  `SearchController` (already shows email/employee_id to `viewer` via an
  existing UI, same reasoning) still return raw models; revisit only if a
  broader role gets routed to either.
- Reviewed 2026-09-10: `DashboardService::getOverview()` had six aggregates
  (`kpis.total_registrations`, `registration_trend`,
  `registration_status_breakdown`, `recent_registrations`,
  `recent_activity`, `notification_health`, `waitlist.recent_promotions`)
  that skipped `User::scopedOrgId()` entirely — every other query in the app
  applies it, these simply didn't, so any staff role (down to `viewer`) saw
  registration/audit/notification data from every organization, not just
  their own. Fixed; the per-event lists on the same response
  (`active_events`, `capacity_utilization`, etc.) are still deliberately
  org-wide rather than limited to the caller's assigned events — that part
  is intentional (see the `GET /dashboard/*` row above) and unchanged.
  `DashboardOverviewScopeTest` covers the regression.
- `viewer` is fully wired (`RoleMiddleware`, `EventScopeMiddleware`,
  `EventStaffController::ROLES`, both the Users and Team-tab role
  dropdowns) but had no seeded demo account anywhere, so nobody could log
  in and see the read-only experience without creating one by hand. Added
  `viewer@rhbgroup.com` to `DatabaseSeeder`/`FreshProjectSeeder`, on the
  team for every seeded event.
