# From internal tool to multi-tenant SaaS — what it would take

_Written 2026-09-10. Answers: "how big a change is it to let other
organizations sign up and run their own events, self-service?" No code was
changed for this document — it's an assessment of the current codebase._

## The one-line answer

**Medium-to-large.** The app already has the one piece that's hardest to
retrofit later — every row of event data is reachable back to an
`organization_id` — so this is not a rewrite. But "another company can sign
up and run their own events" needs four things that don't exist in any form
today: **tenant signup, billing, hardened tenant isolation, and self-service
admin/onboarding.** None of those are small. Ballpark: a small team,
low-to-mid single-digit months to a genuinely sellable multi-tenant product,
not weeks — see the phased breakdown below for why.

## What's already there and would carry over largely as-is

- **`organizations` table + `organization_id`** on `users` and `events`.
  Everything else (registrations, tickets, check-ins, forms, audit logs,
  waitlist, notifications) is scoped indirectly through `event_id →
  events.organization_id`. This is the right shape for multi-tenancy — it's
  just not yet *enforced* the way multi-tenant systems need it to be (more
  below).
- **`User::scopedOrgId()`** — one method, already the org-confinement
  convention used almost everywhere: `null` for `super_admin` (cross-tenant),
  the user's own `organization_id` for everyone else.
- **6-role RBAC hierarchy**, already event-scoped via `event_staff` +
  `EventScopeMiddleware` — a tenant admin assigning their own staff to their
  own events is close to how `event_admin`/`event_organizer` already work
  today; it wouldn't need reinventing, just a tenant-signup path that lands a
  new user as that tenant's first `event_admin`.
- **Per-organization branding fields** already on the `Organization` model
  (`primary_color`, `secondary_color`, `logo_url`, `timezone`, `country`) —
  a start on white-labeling, though thin (see gaps).
- **Session-cookie SPA auth (Sanctum)**, security headers, rate limiting,
  audit logging, password policy — this security baseline is
  tenant-agnostic and needs no rework to support more tenants.

## What's completely missing

### 1. Tenant isolation is enforced by convention, not by the framework
Every query that touches registrations/tickets/audit logs/etc. has to
*manually* remember to join through to `events.organization_id` — there's no
global scope, no query-builder macro, no middleware that does it once. This
works when one team of developers who all know the convention are the only
ones touching the code. It stops working safely once:
- the team grows,
- feature velocity increases, or
- you can no longer manually audit every new query for a missed `whereHas`.

This isn't hypothetical: the RBAC audit done alongside this document
[see [`RBAC-MATRIX.md`](RBAC-MATRIX.md)] found **six aggregate queries in the
main dashboard that had silently skipped org-scoping entirely** — a
`checkin_staff` in one organization could see registration and audit data
from every other organization on the platform. That was in a single-tenant
deployment where the mistake was low-stakes (there weren't really other
tenants to leak to yet). In a real multi-tenant SaaS, this class of bug *is*
the business risk: it's a customer's data appearing on a different
customer's screen.

**What real multi-tenancy needs here:** a structural guarantee, not
discipline — e.g. a `BelongsToOrganization` model trait + Eloquent global
scope that auto-injects the org filter on every query unless explicitly
bypassed by a `super_admin` context, plus a lint/test rule that fails CI if
a new tenant-scoped model query doesn't go through it. This is the single
biggest piece of engineering work on this list, because it means touching
most of the query layer, not adding a new module.

### 2. No tenant signup or provisioning
There is no `POST /organizations` endpoint. `OrganizationController::show()`
today literally falls back to "whichever `Organization` row exists" when the
caller has no `organization_id` — it assumes there's essentially one tenant.
Public self-registration (`POST /auth/register`) always creates a
`participant` (an event attendee), never a new tenant. To let a company sign
up on their own, you'd need:
- a signup flow that creates an `Organization` + its first `event_admin` in
  one transaction,
- email verification (there currently is no email-sending capability at
  all — notifications are explicitly out of scope per the existing
  `NotificationService`, which is dormant by design),
- a decision on how new tenants get approved (instant self-serve vs.
  sales-assisted) and how a tenant's slug/subdomain is chosen and kept
  unique.

### 3. No billing
Zero billing/subscription/plan code exists anywhere in the codebase — no
Stripe integration, no plan model, no usage metering, no invoicing, no
trial/grace-period logic, no seat or event-count limits. This is a full new
subsystem, not an extension of anything present today.

### 4. No self-service tenant administration beyond what one org already has
Today, `event_admin`/`super_admin` can manage users and settings *within*
one organization (`/admin/users`, `/admin/settings`) — that part transfers.
What's missing is everything *about* being a tenant rather than a user:
- inviting a teammate by email (today an admin creates accounts directly
  with a password — there's no invite/accept flow, which matters a lot more
  once tenants are onboarding themselves rather than IT provisioning
  accounts by hand),
- a tenant-level "danger zone" (export all our data, close our account,
  see our own usage against plan limits),
- custom domain or subdomain support (`acme.events.example.com`) — today
  it's one app, one origin, one set of Sanctum stateful domains configured
  by an env var at deploy time, not per-tenant.

### 5. Shared infrastructure has no per-tenant ceiling
Cache, session, and queue all run on the `database` driver against the one
MySQL instance (no Redis, no separate queue workers configured). Uploaded
images live in one local disk path (`storage/app/public`), organized by
random filename, not partitioned per tenant. Fine for one org's traffic;
with N independent paying tenants you'd want:
- per-tenant rate limits (today's `throttle:` rules are global, not
  tenant-aware),
- object storage (S3-compatible) instead of local disk, so uploads scale
  and can be access-controlled/deleted per tenant,
- a real cache layer once dashboard queries run for many tenants
  concurrently (today's dashboard recomputes every aggregate from scratch
  on every request — fine at today's scale, not at fleet scale).

### 6. No compliance/offboarding story
No data export tool, no account-deletion/right-to-be-forgotten flow, no
per-tenant audit-log retention policy distinct from the platform's own.
Whether this matters depends entirely on who the customers are, but it's
worth deciding early rather than retrofitting once tenants exist.

## Sizing, phased

Rough relative sizing (not calendar time — depends entirely on team size),
in the order that unblocks the most:

| Phase | Scope | Size |
|---|---|---|
| 1. Harden isolation | Global-scope trait/enforcement for every tenant-scoped model + query; audit and fix any other silent scope gaps like the dashboard one found here; add a standing test policy (a "two organizations, assert no bleed" test for every list/aggregate endpoint) | **Large** — touches the whole query layer, and it's the one piece you cannot ship multi-tenant without, so it has to come first |
| 2. Tenant signup + onboarding | `Organization` self-signup, first-admin bootstrap, slug/subdomain handling, teammate invite-by-email (which also means finally standing up outbound email — currently nonexistent) | **Medium-Large** |
| 3. Billing | Plan model, Stripe (or similar) integration, usage limits enforced server-side, trial/grace handling, invoicing | **Large** — this is a whole subsystem with its own edge cases (failed payments, downgrades, proration) |
| 4. Per-tenant admin surface | Usage/plan visibility, data export, account closure, white-label depth (custom domain, deeper branding than two colors) | **Medium** |
| 5. Infra scale-out | Object storage for uploads, Redis for cache/queue, per-tenant rate limits, dashboard caching | **Medium** — mostly config/infra work, lower risk than 1–3 |

Phases 2–5 can run partly in parallel once phase 1 is solid; phase 1 is a
hard prerequisite for onboarding a second real tenant safely, so it isn't
optional groundwork — it's the gate.

## Bottom line

The RBAC/event/org data model was clearly designed with multi-tenancy in
mind — that's real, load-bearing groundwork, not a coincidence. What's
missing is everything that turns "one organization's internal events tool"
into "a product other organizations can sign up for and trust with their
data": enforced (not conventional) tenant isolation, signup, billing, and
self-service tenant administration. None of those four are a quick add —
each is closer to its own mini-project — which is why this reads as a
medium-to-large initiative rather than an incremental feature.
