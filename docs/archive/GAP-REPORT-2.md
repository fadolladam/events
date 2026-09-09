# RHB Events — Status Report against `implementations-2.md`

_Reviewed 2026-09-09 · branch `security/admin-rbac-and-branding` · verified against live code_

## What `implementations-2.md` is

It is **not a status document** — it is a **work brief / prompt** for a full
"production-readiness upgrade" (52 numbered requirements across 4 priorities).
As of this review **almost none of it has been carried out**: the codebase has
no `app/Policies/`, no `app/Http/Resources/`, no custom `app/Http/Middleware/`,
no security-header layer, no cookie/CSRF auth, no MFA/SSO scaffolding, no
password-reset flow, no login lockout, no CI, and the test suite is unchanged
(4 feature tests).

A handful of requirements were **already satisfied by earlier work** on this
branch (RBAC route tiers, partial rate limiting, concurrency-safe registration,
consolidated dashboard payload, form builder, registration pagination+search,
`POST /users` privilege guard, symlink-free `/storage`, XAMPP kit, backup guide,
dedicated Docker DB user).

## Notifications — explicitly out of scope of BOTH documents

- `implementation.md` (the 2026-09-04 audit) names email notifications as its
  **#1 missing gap** but implements nothing — it is only a report.
- `implementations-2.md` line 10: **"DO NOT implement email/SMS/notification
  functionality as part of this task."**

So the notification engine (`NotificationService` wired to `Mail`, confirmation /
promotion / reminder emails, queue worker, scheduler) is **not addressed by
either document** and remains completely unbuilt (`NotificationService` is
referenced nowhere outside its own file; no `app/Mail/`, no `Mailable`, no
`Mail::` call, `routes/console.php` has only `inspire`).

---

## PRIORITY 1 — Security hardening (§1–§15)

| § | Requirement | Status | Evidence / gap |
|---|---|---|---|
| 1 | Cookie/session SPA auth (HttpOnly, SameSite, CSRF), session regen on login, invalidate on logout | **Not started** | Still Sanctum **bearer token in `localStorage`** (`services/api.ts`, `sanctum.guard = ['web']` but API group is token-based; no `EnsureFrontendRequestsAreStateful`, no CSRF). |
| 2 | Password policy, change, force-reset, first-login reset, reset-token expiry | **Not started** | Only `min:8` on `storeUser` / `register`. No change/reset routes; `password_reset_tokens` table is the untouched Laravel default. |
| 3 | Brute-force protection, progressive lockout, generic errors, security logging | **Partial** | `throttle:10,1` on `/auth/login` only. Credential errors are generic, **but** `"Your account has been deactivated."` reveals account existence. No lockout/backoff. Only **successful** logins are audited — failures are not. |
| 4 | MFA-ready architecture (TOTP for privileged roles) | **Not started** | No `mfa` / `two_factor` / `totp` anywhere. |
| 5 | SSO-ready architecture (Entra ID), clean auth/idp/authz separation | **Not started** | No `socialite` / `oauth` / driver seam. Auth logic sits directly in `AuthService`. |
| 6 | Audit every endpoint + permission matrix, backend authoritative | **Partial** | Route-level RBAC tiers exist (`routes/api.php`), frontend mirrors them. **No written permission matrix**; no automated RBAC tests. |
| 7 | Event-level authorization (role + event assignment + action) via Policies/Gates | **Not started** | `event_staff` populated by seeder; `User::canManageEvent()` exists but is **called nowhere**. No `app/Policies/`, no `Gate::`. Any `event_admin`/`event_organizer` manages any event. |
| 8 | IDOR / object-level authorization audit | **Not started** | `GET /registrations/{id}`, waitlist, attendance, reports scope by **role only**, not by event membership. Public token routes (`secure_access_token`, ticket `secure_token`) are the only object-level checks. |
| 9 | Public secure tokens — CSPRNG, length, no PII, revoke, anti-enumeration | **Mostly OK (pre-existing)** | `Str::random(48)` registration token, `Str::random(64)` ticket token, QR payload carries URL/token only. No explicit revoke-on-cancel, no enumeration lockout. |
| 10 | QR ticket validation — forged/revoked/cross-event/race | **Partial (pre-existing)** | `CheckInService` guards duplicate scans and validates the token↔event; ticket `status` (active/used/revoked) exists. No formal test for cross-event / revoked reuse / race. |
| 11 | Upload security — content sniffing, random names, block double-ext/scripts/traversal | **Partial** | `MediaController` uses Laravel `image` + size rule + throttle 30/min. No content sniffing, no image re-encode/EXIF strip, no explicit double-extension / traversal hardening. |
| 12 | Rate limiting on every sensitive endpoint | **Partial** | Throttled: login, register, public register, lookup, cancel, media upload. **Not throttled:** ticket lookup, QR image, check-in scan, check-in search, CSV/PDF export, `POST /users`. |
| 13 | Security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors) | **Not started** | No header middleware anywhere (`bootstrap/app.php` only aliases `role`). |
| 14 | Sensitive-data least-privilege, API Resources/DTOs | **Not started** | No `app/Http/Resources/`. Controllers return raw Eloquent models (participant email/phone/employee_id/department/answers exposed wherever a registration is returned). |
| 15 | Expand audit trail (login fail, logout, user updated, role changed, user disabled, event deleted, exports, attendance) + tamper-proofing | **Partial** | Logged today: user_login, user_created, event create/update/status, registration_created/cancelled, participant_promoted, check-in. **Missing:** login failure, logout, user updated / role changed / disabled, **event deleted** (`EventController::destroy` writes no audit), CSV export, PDF export. No DB-level immutability guard. |

---

## PRIORITY 2 — Core function improvements (§16–§26)

| § | Requirement | Status | Evidence / gap |
|---|---|---|---|
| 16 | **Admin manual registration** (reusing `RegistrationService`) | **Not started** | No route (registrations API = index/show/approve/reject/cancel only). A CLI `registrations:import` command exists but is not this feature. |
| 17 | Participant / employee search with autocomplete, dup warning, directory-API seam | **Not started** | No participant-search endpoint. Registration table search exists but is per-event only. |
| 18 | 10-step event wizard with per-step validation + draft autosave | **Partial** | `EventWizardModal` is a 4-step create flow. No autosave-between-steps, no staff-assignment step, no 10-step structure. |
| 19 | Richer reusable **event** templates (sports/blood/marathon/townhall/…) + custom | **Not started** | `event_templates` still API-only, no seeded rows, wizard has no "start from template". (Reusable *form* templates were added — different feature.) |
| 20 | Form builder: add textarea, employee-ID, date, time, multi-select, file, info-text, consent; drag/drop; conditional logic; preview; dup detection | **Partial** | Builder offers text/email/phone/number/select/radio/checkbox + reorder + reusable templates. **Missing:** textarea, employee-id, date, time, multi-select, file, info-text, consent types; drag/drop; conditional logic; live preview; duplicate-field detection. Server-side answer validation **does** exist. |
| 21 | Event lifecycle — consistent dynamic status, block invalid transitions | **Partial (pre-existing)** | `Event::calculateDynamicStatus()` used in public + registration paths. No explicit invalid-transition guard on `PATCH /events/{id}/status`. |
| 22 | Capacity visibility (confirmed/pending/waitlisted/available/util %), over-capacity warning, block new confirmations | **Partial** | Concurrency-safe allocation intact; dashboard shows utilisation. Over-capacity (capacity reduced below confirmed) is tolerated silently — no explicit warning banner / confirmation block described in the brief. |
| 23 | Waitlist management — queue, priority, manual+auto promote, history, concurrency-safe | **Done (pre-existing)** | `WaitlistService` covers FIFO order, priority override, manual + auto promotion, `waitlist_history`, row locks. |
| 24 | Registration table — full filter set, pagination, server-side search | **Partial** | `indexForEvent` paginates and filters by status / attendance_status / free-text (reg#, name, email, phone, employee_id). **Missing filters:** department, date range, approval, waitlist-only, checked-in toggle. |
| 25 | Check-in large visual states (SUCCESS/DUPLICATE/INVALID/REVOKED/WRONG EVENT/CANCELLED/NOT ELIGIBLE), rich participant panel | **Partial** | `QrScannerConsole` has scan + duplicate + undo + manual search. Not verified to render all 7 named states or the full participant detail panel (name/employee-id/dept/gate). |
| 26 | Attendance — 4 statuses, authorized bulk operations, audit history | **Partial** | Single-mark endpoint (`attendance/mark`) with the 4 statuses exists. **No bulk operation.** |

---

## PRIORITY 3 — Admin, dashboard & reporting (§27–§35)

| § | Requirement | Status | Evidence / gap |
|---|---|---|---|
| 27 | Consolidated global dashboard (single payload, all listed KPIs) | **Done (pre-existing)** | `GET /dashboard/overview` + `DashboardService` + ~18 widgets deliver the listed KPIs in one call. |
| 28 | Event command-centre with tabs: Overview/Registrations/Waitlist/Check-In/Attendance/Reports/**Form**/**Staff**/Settings/**Audit** | **Partial** | Real tabs today: overview, registrations, queue, checkin, attendance, reports (`EVENT_TABS`); form + settings are `?panel=` modals. **No per-event Staff tab, no per-event Audit tab.** |
| 29 | Event Readiness checklist with % and no misleading readiness | **Partial** | `DashboardService::readiness()` + an `EventReadiness` widget compute a score (form fields, check-in staff, notification templates). Not surfaced as the per-event checklist the brief describes. |
| 30 | Global admin search (events, reg#, participant, employee-id, email, phone), grouped + permission-filtered | **Not started** | No global search endpoint (only `checkin/search` per event). Explicitly deferred in earlier dashboard work. |
| 31 | 11 per-event report types incl. Department Breakdown, No-Show, Form Answers | **Partial** | `ReportService::eventStats` returns status breakdown, capacity utilisation, registrations-by-date, source breakdown. **Missing:** department breakdown, no-show report, form-answers report, dedicated waitlist/check-in report views. |
| 32 | Exports respect filters + permissions + timezone, consistent columns, protect sensitive data, stream large sets, **audited** | **Partial** | CSV is streamed. **Does not respect the registration-table filters, omits dynamic answers, is not audited**, no per-column sensitive-data policy. |
| 33 | User management UI — create/edit/activate/disable/roles/event-roles/force-reset/last-login/status | **Partial (API only, thin)** | `GET /users` (paginated, search) + `POST /users` (privilege-guarded) exist. **No edit / disable / update-role / force-reset endpoints. No `last_login` column. No user-management screen** in the frontend. |
| 34 | Event staff assignment screen + backend enforcement | **Not started** | No staff endpoints beyond the seeder writing `event_staff`. No UI. No enforcement (see §7). |
| 35 | Admin UX — responsive, loading/empty states, confirm dialogs, breadcrumbs, a11y, keyboard nav | **Partial** | `ConfirmDialog` component exists but `alert()`/`confirm()` still used in ~10 modules. No breadcrumbs; a11y/keyboard-nav not addressed. |

---

## PRIORITY 4 — Production readiness (§36–§52)

| § | Requirement | Status | Evidence / gap |
|---|---|---|---|
| 36 | Environment separation (local/testing/staging/production), `APP_DEBUG=false` in prod | **Partial** | `.env.example` (local, debug=true), `.env.xampp`, docker-compose sets `APP_ENV=production`/`APP_DEBUG=false`. No staging/testing env files. |
| 37 | Keep XAMPP for local only (`.env.xampp`, docs, SQL option) | **Done** | `install/INSTALL-XAMPP.md`, `install/events.sql`, `.env.xampp`, `serve.sh`/`serve.bat`. |
| 38 | Production deploy doc (Apache/Nginx, PHP 8.3+, HTTPS, extensions, permissions, only `public/` web-accessible) | **Not started** | No `DEPLOYMENT.md`. README covers Docker/XAMPP/dev only. |
| 39 | Dedicated DB account (not root), MySQL not public | **Partial** | Docker compose uses `events_user` (good). `.env.xampp` uses `root`. No documented least-privilege grant. |
| 40 | phpMyAdmin restricted/removed in production | **N/A / not documented** | Not part of the shipped stack; no guidance written. |
| 41 | Protect secrets, never commit real `.env`, ship `.env.example` only | **Partial** | `.env.example` present and `.gitignore` covers `.env`. **But** `docker-compose.yml` hard-codes a default `APP_KEY` and DB passwords as literals. |
| 42 | Backup: daily, encrypted, retention, restore + verification guide | **Partial** | `backend/database/backups/` folder + a manual dump/restore guide. No schedule, no encryption, no retention, no verification step. |
| 43 | Separate application / security / audit logs; no secrets in logs | **Not started** | Default single Laravel log channel. |
| 44 | Monitoring hooks (500s, slow endpoints, failed jobs, disk, uptime, suspicious logins), vendor-neutral | **Not started** | Nothing beyond Laravel defaults + `/up` health route. |
| 45 | Performance pass — N+1, indexes, dashboard, search, reports, exports, catalogue | **Partial** | Registration list and dashboard eager-load; dashboard index migration added. No systematic N+1 / EXPLAIN pass; exports still load full result sets. |
| 46 | Index review (status, start_at, participant email, employee_id, registration_number, attendance_status, waitlist ordering, ticket token, …) | **Partial** | Base migration indexes many FKs + `status`/`start_at`; `2026_09_07_000001_add_dashboard_indexes` added more. `participants.employee_id` indexed. No documented review vs. this list. |
| 47 | Consistent API error envelope `{message, errors, code}`, proper 403/404/419/422/429/500, no stack traces | **Not started** | No `code` field, no custom exception rendering — Laravel defaults only. `shouldRenderJsonWhen` is set for `api/*`. |
| 48 | Expand tests — 15 named suites (Auth, Authorization, EventPolicy, EventStaffAuthorization, ManualRegistration, TicketSecurity, Attendance, UploadSecurity, ReportPermission, AuditLog, RateLimit, …) | **Not started** | Still 4 feature tests (Capacity, Waitlist, CheckIn, Example) + and they can't run in the shipped `--no-dev` image. |
| 49 | RBAC test matrix — every endpoint × 7 roles + unauthenticated, asserting 200/403/401 | **Not started** | None. |
| 50 | CI pipeline (composer install, npm install, Laravel tests, tsc, lint, build; failing test blocks release) | **Not started** | No `.github/workflows/`. |
| 51 | Production build verification (assets land in `backend/public/`, stale assets removed, SPA catch-all works) | **Done (pre-existing)** | `frontend` `prebuild` wipes `backend/public/assets`; `vite build` outputs there; catch-all web route serves the SPA. |
| 52 | Docs: README, PROJECT.md, SECURITY.md, DEPLOYMENT.md, XAMPP guide, prod install guide, backup guide, RBAC matrix, API summary, testing guide | **Partial** | Present: README, PROJECT.md (this session), INSTALL-XAMPP.md, backup guide, a rough API summary in PROJECT.md. **Missing: SECURITY.md, DEPLOYMENT.md, production install guide, RBAC matrix, testing guide.** |

---

## Roll-up

| Priority | Done | Partial | Not started |
|---|---|---|---|
| P1 Security (15) | 0 fully¹ | 8 | 7 |
| P2 Core (11) | 2 (§23, §27-adjacent) | 7 | 2 (§16, §17, §19, §30 span P2/P3) |
| P3 Admin/Dash (9) | 1 (§27) | 5 | 3 (§30, §33-UI, §34) |
| P4 Production (17) | 3 (§37, §51, and env basics) | 8 | 6 |

¹ §9/§10 are "mostly OK" from pre-existing design but not verified/tested to the brief's bar.

### Biggest untouched blocks

1. **Auth architecture** (§1–§5): still localStorage bearer tokens; no cookie/CSRF, no password-reset, no lockout, no MFA/SSO seam.
2. **Authorization depth** (§7, §8, §14): no Policies/Gates, no per-event authorization, no API Resources — role tier is the only gate.
3. **Manual registration + participant search** (§16, §17): not built.
4. **Testing & CI** (§48–§50): unchanged 4 tests, none runnable in the image, no CI, no RBAC matrix.
5. **Security headers, error envelope, split logging, monitoring** (§13, §43, §44, §47).
6. **Docs** (§38, §52): no SECURITY.md / DEPLOYMENT.md / RBAC matrix / testing guide.
7. **Notifications** — untouched, and explicitly excluded by both documents.

### Production-readiness verdict

**NOT READY.** The brief's Priority 1 (security hardening) is essentially
unstarted, notifications don't exist, and the test suite neither covers the
security surface nor runs in the deployable image.
