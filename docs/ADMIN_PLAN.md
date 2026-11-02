# Gilo Admin Implementation Plan

Gilo Admin will operate the ride and trip marketplace: travelers publish journeys,
riders book compatible segments, and staff handle verification, exceptions and
money movement. Release one covers rides and trips. Packages remain a later,
separately gated release. The frontend lives at `/home/kalpesh/gilo-admin`, uses
`boxwatch-admin` for server APIs, and uses `boxwatch-socket` for authorized live
updates. This plan separates planned functionality from delivered code.

## Product and architecture decisions

- Dedicated React and TypeScript frontend, Vite, Tailwind and shadcn/ui. Use the
  official free component foundation and a Gilo emerald/slate theme. shadcn.io is
  a useful visual reference, but individual third-party blocks need license checks.
- Reuse existing Express services and PostgreSQL/PostGIS data. Do not create a
  second payment engine, duplicate business database or frontend fare calculator.
- Add a dedicated `/api/admin/v1` API boundary. Consumer authentication must never
  imply staff authorization. No admin permission is granted by editing browser state.
- Same-origin production reverse proxy for `/api/admin/v1`; secure HttpOnly staff
  session cookies, CSRF protection, strict origin validation and session revocation.
  Vite development proxy is local-only. Existing mobile bearer sessions remain separate.
- TanStack Query for remote state, router for deep links, schema-validated forms,
  reusable tables, custom confirmation dialogs and Lucide icons. Add dependencies
  when their first module is implemented, rather than preinstalling every library.
- INR money is stored/calculated as integer paise or validated backend decimals;
  timestamps stored in UTC and displayed explicitly in Asia/Kolkata. Search accepts
  friendly references such as R0002/T0013 while APIs retain immutable IDs.
- No live API integration until admin authorization exists. Initial scaffold has
  explicit unconnected states, not fake operational KPIs or dummy payments.

## Existing system inventory

| Area            | Existing foundation                                                               | Admin work required                                                                    |
| --------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Identity        | User model, consumer auth, refresh tokens, login history                          | Staff accounts, roles, granular permissions, MFA, revocation and staff sessions        |
| Trips and rides | Trip, RideRequest, responses, discovery, activities, tracking and service methods | Staff-scoped search/details, action previews, protected operations and audit           |
| Payments        | Cashfree orders, wallet/ledger, escrow, withdrawals and reconciliation services   | Finance queues, approved refund commands, reconciliation views and controls            |
| Exceptions      | RideResolutionCase and SupportTicket                                              | Assignment, evidence, decisions, approvals, partial refunds, appeal and SLA queues     |
| Verification    | KYC documents, selfies, vehicles and verification media                           | Review queues, protected media access, expiry and decision history                     |
| Master data     | Vehicle, luggage, pricing/rules, platform settings, sliders and agreements        | Typed CRUD, validation, safe archive, effective dates and change history               |
| Safety          | Risk flags, GPS health, safety incidents, investigations                          | Restricted workflows, escalation and evidence access                                   |
| Auditing        | AuditLog plus trip/ride activity histories                                        | Transactional staff audit, before/after changes, read/export audit and access controls |
| Notifications   | Persisted events and delivery/retry services                                      | Templates, delivery inspection, bounded retries and approval for bulk sends            |
| Real time       | Consumer socket access rules                                                      | Explicit staff channel authorization; never reuse owner-only room access blindly       |

Inventory is based on source inspection, not proof that every existing endpoint is
safe for staff reuse. In particular, user settings APIs are not platform-settings
APIs, package dispute models are not the ride resolution workflow, and a `role`
column alone is not an admin authorization system. Review uploaded-media exposure
before giving staff access to identity documents. Preserve existing uncommitted
work and legacy identifiers.

## Navigation and module specification

| Module                     | Screens and functionality                                                                                                                                                                                     | Initial priority |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Overview                   | Action-required queue; active trips; ride funnel; payment exceptions; unresolved disputes; GPS freshness; verification backlog; filter by date/region; drill into source records                              | P1               |
| People                     | Rider/traveler search; masked contact; profile; linked rides/trips; ratings; account restrictions; document status; consent history; suspension with reason and active-trip impact preview                    | P1               |
| Verification               | Identity/license/vehicle queues; protected images; approve/reject/request correction; expiry; ownership checks; decision history; provider results distinct from manual decisions                             | P1               |
| Trips                      | Lists by state; route, capacity, passengers, invitations, timeline, vehicle, cancellation/early-end reason; inspect overdue trips; safe action previews; physical completion separate from payment settlement | P1               |
| Rides                      | Search, matching, request/acceptance, pickup, onboard, dropped, payment review; actual vs estimated fare; linked traveler/trip; no-match diagnostics; reschedule/cancel previews; audit                       | P1               |
| Live operations            | Map and list; pickup/drop colors; freshness, age and accuracy; last-known vs live; route progress; delay, lost GPS, stranded/onboard flags; bounded history playback; region/status filters                   | P1               |
| Support                    | Ticket inbox, priority, assignment, internal notes, participant messages, attachments, due dates, links to ride/trip/payment, handover and reopen                                                             | P1               |
| Ride disputes              | Interrupted ride, missing code, delayed/no-show, incorrect drop, fare, conduct and safety; evidence timeline; exit confirmation intervention; resolution proposal; approval; appeal                           | P1               |
| Payments                   | Order and attempt timelines; provider/local state comparison; unknown/pending/failed/success; signed webhook delivery; status recheck; sandbox labels; immutable amount references                            | P1               |
| Refunds                    | Full/partial proposal; reason and preview; prior refunds; approve/reject; original-method execution; provider-pending/failed/success; retry same refund identity; customer notification                       | P1               |
| Wallet and settlement      | Spendable/held/released balances, immutable ledger, earnings, blocked settlements, payouts/withdrawals, mismatches, reconciliation export; no direct balance textbox                                          | P1               |
| Safety and risk            | Incident triage, restricted evidence, risk/GPS flags, repeated abuse, account action, trusted-contact context where authorized, escalation record; not automatic emergency dispatch                           | P1               |
| Master data                | Vehicle types/icons/capacity, luggage types/limits, pickup service types, cancellation reasons, support categories/priorities, cities/regions/service availability                                            | P1               |
| Pricing and policies       | Base/min/per-km fare, commission, rounding, cancellation windows, grace/wait settings, matching limits, rule simulation and future activation; preserve booking snapshots                                     | P1               |
| Content and communications | Banners/sliders, FAQs, agreements/privacy versions, notification templates, localization, maintenance notices; targeted/bulk campaigns later                                                                  | P2               |
| Reports                    | Booking funnel, route demand/supply, cancellations by actor/reason, pickup reliability, payout/refund aging, disputes, verification times, net revenue definition, export jobs                                | P2               |
| Team and access            | Staff invitations, roles, permissions, region scope, MFA, disabled staff, active sessions, access reviews, recovery and emergency access audit                                                                | P0               |
| Audit                      | Staff actions, before/after, reason, linked approval, request ID, timestamp, evidence access/export; searchable read-only history                                                                             | P0               |
| System health              | API/socket/worker/Redis health, failed queues, webhook retries, notification failures, map-provider errors/quota signals, backup status and release version                                                   | P1               |
| Settings                   | Environment, timezone, supported regions, feature flags, integration health and masked configuration metadata; secrets remain server-managed                                                                  | P1               |

P0 is required before live data; P1 is required for an operable ride launch; P2 is
operational improvement after core workflows. Navigation should group these into
Operations, People, Finance, Configuration and Administration rather than show
20 equally prominent sidebar entries.

## Staff roles and permission model

| Role         | Default scope                                                       | Exclusions                                                          |
| ------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Owner        | Staff/security configuration and policy approval                    | Still subject to audit, reauthentication and financial invariants   |
| Operations   | Trips, rides, tracking and operational intervention proposals       | No refund approval, wallet editing or unrestricted identity exports |
| Support      | Assigned cases, contact reveal with reason, customer communications | No independent settlement release or role administration            |
| Verification | Assigned identity/license/vehicle reviews                           | No financial actions or unrelated journey tracking                  |
| Finance      | Payments, ledger, reconciliation and refund/payout approvals        | No staff-role changes or unnecessary safety narratives              |
| Safety lead  | Safety evidence, interventions and restrictions                     | No arbitrary wallet edits                                           |
| Analyst      | Aggregated or masked reports                                        | No sensitive evidence, precise live GPS or mutations                |
| Auditor      | Scoped read-only histories                                          | No approval or execution                                            |

Permissions name explicit actions, for example `rides.read`, `tracking.live.read`,
`cases.assign`, `cases.resolve.propose`, `refunds.approve`, `refunds.execute`,
`verification.decide`, `pii.reveal`, `exports.create`, `staff.manage`.
Evaluate role plus record scope on every server request and socket subscription.
Use deny-by-default. A hidden button is only a UX choice, not a security control.
Financial decisions above a configured limit and exceptional safety overrides use
separate proposer and approver identities. Thresholds must be decided before
those actions are enabled; small teams still need a documented controlled path.

## Operational workflows and exceptional scenarios

### Ride completion and trip early ending

Normal passenger drop, traveler reaching their own endpoint, payment settlement
and case resolution remain separate events. For Chuli to Shaktinagar within a
Dhrangadhra to Halvad trip, preserve the completed passenger ride if the traveler
returns home. Show Ended early for the trip. Waiting riders receive cancellation
and original-method refund handling; never mark an onboard passenger dropped
because the traveler clicked a trip action.

### Interrupted journey and unavailable passenger phone

Open case -> collect participant statements and location evidence -> establish
safe exit or continued travel -> preview financial outcome -> approve if needed
-> execute settlement/refund -> notify -> retain appeal trail. Support-assisted
exit requires identity checks, recorded contact/evidence, reason and appropriate
approval. Missing GPS or a switched-off phone alone is not proof of no-show,
arrival, passenger exit or traveler fault. A safety case cannot be cleared by
ordinary trip resumption. Escalation never claims emergency services were contacted
unless an authorized person actually recorded that action.

### Partial refund and compensation

Show original collected fare, completed segment evidence, fees, previous refunds,
held/released money, proposed passenger refund and traveler amount. All figures
must balance and stay within refundable funds. Do not use straight-line GPS
percentage as an automatic final fare. Decide fault, minimum fare, commission and
compensation policy before enabling automatic calculations. After payout, a refund
may require Gilo-funded compensation/recovery; do not pretend released money is
still held. Preview expires or becomes invalid when the underlying payment changes.

### Payment races and recovery

A provider timeout is unknown, not failed. Reconcile before allowing another
charge. A duplicate click/webhook/job retries the same operation identity. A late
payment after cancellation follows the persisted refund path. If two admins act,
only a valid current version can execute; the other receives a conflict and refresh.
Approval does not mean provider refund completion. Reversals and chargebacks are
separate from Gilo-initiated refunds. A reversal entry corrects a ledger mistake;
never edit or delete the original financial transaction.

### Automatic cancellation and delayed travel

Expose policy version, triggering facts, event time, grace period and outcomes.
Unstarted expiry must not affect a started trip or an onboard rider. Accepted
requests use live pickup feasibility, not a static 10/15-minute payment hold.
Preserve stale-GPS waiting. Operators can inspect/reconcile exceptions through
service commands, not change numeric status fields manually. Existing Gilo
5-minute pickup reminder and 15-minute delayed-pickup rules must appear as distinct
policies, not be confused with accepted-request expiry.

### Master data and policy publishing

Draft -> validate -> preview impact -> approve high-impact changes -> activate at
an effective time -> audit. Archive referenced records instead of deleting them.
Changing a luggage type, vehicle or pricing rule must not alter old booking terms.
Reject negative money, invalid capacity, overlapping policy schedules and duplicate
keys. Store rules with typed schemas; do not expose a generic key/value editor for
payment secrets or executable settings.

## Screen and interaction standards

Use a restrained emerald brand, slate text, pale background, readable numeric
columns and consistent icons. Desktop-first but usable on tablet and phone.
Tables have server-side pagination, debounced search, stable sorting, URL filters,
empty/error/loading/stale states and permission-aware actions. Details use a
summary, tabs, timeline and contextual action drawer. Critical financial actions
use a dedicated preview/confirmation view with the exact amount and consequences.

Show information freshness and environment on live operations and payments.
Zero is not the same as unavailable. Never use fabricated KPI charts. Preserve
filters on return, invalidate affected queries after actions, deduplicate socket
events, refetch after reconnect, and retain pagination/selection intentionally.
Accessible labels, keyboard navigation, visible focus, sufficient contrast and
screen-reader status announcements are acceptance requirements. Sensitive fields
start masked; revealing/exporting requires explicit permissions and audit.

## API and data contract work

Proposed routes, not existing endpoints:

| Group                                    | Contract                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `/admin/v1/auth`                         | login, MFA challenge, session, logout, recovery, revoke sessions             |
| `/admin/v1/staff`                        | invitations, role/scope assignment, disable, session review                  |
| `/admin/v1/users`                        | scoped search, detail, masked contact reveal, account action preview/execute |
| `/admin/v1/trips` and `/rides`           | filtered lists, detail timelines, permitted actions, action previews         |
| `/admin/v1/tracking`                     | current snapshots, scoped history, short-lived staff subscriptions           |
| `/admin/v1/cases`                        | assignment, notes/evidence, resolution proposals, approvals, appeals         |
| `/admin/v1/payments` and `/refunds`      | reconciliation, proposed/refundable amounts, execute/retry, status           |
| `/admin/v1/ledger` and `/settlements`    | read-only entries, reconciliation exceptions, controlled payout actions      |
| `/admin/v1/master-data`                  | typed per-resource operations, archive and versioned publication             |
| `/admin/v1/audit`, `/reports`, `/health` | scoped history, asynchronous exports and sanitized health                    |

List responses include pagination, applied filters and data freshness. Error
responses distinguish unauthenticated, forbidden, invalid input, conflict,
provider-unknown, retryable outage and rate limit. Mutations use server validation,
record version guards and idempotency keys. Export jobs are scoped at creation and
download, have expiring links, CSV-formula escaping and volume limits.

Likely new entities: staff accounts, staff sessions/MFA recovery records, roles,
permissions/scopes, case notes/evidence, resolution proposals and approvals,
financial operation records, configuration versions and export jobs. Decide exact
schema after service review; reuse appropriate audit/support models. Add new-table
migrations; amend original creation migrations for existing-table changes during
this prelaunch phase per repository instructions. Never reset existing data as
part of UI setup. Before production, switch to an agreed forward-only migration
policy and backups rather than the development reset routine.

## Delivery sequence and completion gates

| Phase | Deliverable                                                                | Exit condition                                                                           |
| ----- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 0     | This plan, API inventory, free UI choice, new frontend scaffold            | Build/typecheck/lint pass; roadmap and environment state visible                         |
| 1     | Staff auth, MFA, roles/scopes, CSRF/session handling, audit foundation     | Consumer tokens rejected; revoked staff lose access; permission tests pass               |
| 2     | Read-only overview, users, verification detail, trips/rides and history    | Real API data, paging, filters, PII masking, permission-aware details                    |
| 3     | Typed master data, verification decisions and policy publishing            | Validation, history, archive and effective-date tests; old bookings unchanged            |
| 4     | Live operations, operational support and notifications                     | GPS freshness/reconnect tests, scoped sockets, action conflict handling                  |
| 5     | Case assignment, evidence, safe-exit intervention and approved resolutions | Permission/dual-approval tests, participant notices, no onboard abandonment              |
| 6     | Refunds, partial refunds, settlements, withdrawals and reconciliation      | Sandbox end-to-end money invariants, retry/crash tests and finance sign-off              |
| 7     | Reports/exports, content, health, recovery and access review               | Masked exports, audit completeness, restore drill and operational runbooks               |
| 8     | Staging acceptance and production rollout                                  | Real-device scenarios, security review, monitoring, backups, rollback and staff training |

Each phase delivers backend services, permission checks, frontend states and tests
together. Do not enable a dangerous UI action just because its button is finished.
Start phase 1 after the foundation; no production staff credentials are seeded
into source code. First owner provisioning must be a controlled one-time operation.

## Test and release checklist

- Role matrix: every action denied to wrong roles, regions and ordinary app users;
  revoked sessions and expired MFA challenges; CSRF and direct URL/API bypasses.
- Ride matrix: no matches, declined requests, pickup passed, stopped traveler,
  stale GPS, missing OTP, multiple riders, cancellation during payment, emergency
  early ending and passenger phone unavailable.
- Financial matrix: duplicate requests, concurrent approvals, provider 502/504,
  webhook before/after response, partial refund retries, refund after settlement,
  insufficient holds, rounding, legacy history and reconciliation mismatch.
- Master data: duplicate keys, invalid uploads, referenced deletion, archived
  options, overlapping effective dates and policy snapshots.
- UI: accessibility/keyboard, compact screens, long Gujarati/English names,
  timezone boundaries, slow/offline requests, permission removal while screen open.
- Deployment: separate development/staging/production, explicit Cashfree sandbox,
  frontend public variables only, server-managed credentials, HTTPS and security
  headers, bounded sockets/map usage, monitoring, encrypted backups and restore drill.
- Select retention/deletion periods, tax/reporting treatment and privacy/operating
  obligations with qualified local review before launch. This is not a legal or
  regulatory compliance certification.

## Decisions needed before their implementation phase

Not blockers for setup: public admin/API domains and hosting; initial staff and
role assignments; MFA delivery/recovery approach; refund and compensation policy;
second-approver thresholds; support operating hours/SLA; map-provider budget;
retention/export limits; verification provider/manual review process. Proposed
safe defaults: no automatic disputed partial refunds, no account impersonation,
no anonymous tracking, no browser-stored provider secrets, and no direct wallet
balance modification. Packages, fleet management and growth campaigns stay outside
release one.

## Research references

- [Official shadcn free dashboard blocks](https://ui.shadcn.com/blocks?category=dashboard)
  and [MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md): free base,
  adapted to Gilo rather than copied as a generic sales dashboard.
- [shadcn.io admin sidebar](https://www.shadcn.io/blocks/sidebar-admin-panel): visual
  organization reference; not a claim that its entire block catalog is free.
- [shadcn Vite setup](https://ui.shadcn.com/docs/installation/vite) and
  [Vite requirements](https://vite.dev/guide/): supported frontend setup.
- [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html):
  server-enforced, least-privilege authorization for admin actions.
- [OWASP transaction authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html):
  bind approval to exact transaction data and validate again at execution.
- [Cashfree webhook idempotency](https://www.cashfree.com/docs/payments/online/webhooks/webhook-indempotency):
  distinguish orders from attempts, validate success and deduplicate events.
- [Cashfree Easy Split overview](https://www.cashfree.com/docs/api-reference/payments/latest/split/easy-split-overview):
  provider capabilities must be checked against actual merchant configuration.

## Phase 1 delivery update — 18 October 2026

Implemented: dedicated staff authentication with password + authenticator MFA,
one-use recovery codes, server sessions, CSRF/origin checks, invitation activation,
team access controls, last-owner protection and paginated access audit. Login,
Team & access and Audit now use the dedicated APIs; operational modules remain
planned. Staff access requires backend setup; it is not enabled automatically.

See `ADMIN_ACCESS.md` for configuration, migration/provisioning instructions,
verification limits and remaining access-lifecycle work. Phase 1 is not declared
launch-complete: invitation renewal, credential/device replacement, session listing,
regional scope and staging database/proxy validation remain pending.

## Phase 2 first module — 18 October 2026

Delivered owner-only read-only Trips & rides: reference/status/date filters,
pagination, city/state route summaries, recorded times/capacity and fare values,
bounded activity history, detail links and audit of reads. Passenger-only/mixed
trips are included; package-only trips are excluded. Sensitive fields and raw
activity metadata are omitted. The API has no journey mutation endpoints.

Phase 2 remains in progress: overview metrics, people, verification detail,
scoped operational roles and related-record navigation are not yet delivered.
Backend configuration, first-owner provisioning and live database integration
checks remain necessary; tests use repository and HTTP mocks, not production data.

## Phase 2 overview and people — 18 October 2026

Delivered owner-only read-only overview status counts with drill-down links, and
people search/details with server-masked phone/email, account state, linked trip
and passenger-ride counts. Overview and person counters use consistent database
snapshots. All reads are audited. Search text is excluded from audit metadata.
Counts are all-date recorded statuses, not live activity or revenue metrics.

People includes all customer accounts; linked journeys establish participation.
Verification defaults are not presented as verified identity. No restriction,
contact-reveal or financial actions have been added. Remaining phase 2 work:
verification evidence inspection, operational role scopes and broader related
records. Backend setup and real database/staging validation are still required.

## Phase 2 verification inspection — 18 October 2026

Delivered owner-only queues for identity documents, selfies and vehicle/licence
uploads on passenger-capable trips. Local image inspection requires a recorded
reason, CSRF-protected staff session and matching file revision; each view is
audited. Storage URLs and identity numbers are not exposed in queue responses.
No verification decisions or account eligibility changes have been implemented.

Important remaining storage work: the shared uploader requests public-read S3
objects. S3 evidence viewing is therefore unsupported in this viewer. Private
upload/access and remediation of existing objects must be implemented and verified
before rollout; details are in ADMIN_ACCESS.md. Scoped verification-team access
must follow the protected-media work rather than widening access prematurely.
Phase 2 is still not declared launch-complete; live integration checks remain.

## Private verification storage — 18 October 2026

New KYC/selfie/licence uploads now use a separate private bucket in S3 mode.
All four Block Public Access settings are required; missing configuration fails
closed. The authenticated admin viewer supports these private objects with bounded
reads and metadata stripping. New local licences use a non-public folder.
Vehicle photo delivery remains compatible. This supersedes the local-only
limitation above.

Remaining before rollout: configure the private bucket/IAM, run the read-only
verification-media inventory, migrate legacy public objects and shared-folder
licences, revoke their old access, and validate deployed mobile/admin flows.
No existing files or database rows were migrated. The inventory is planning-only.
See ADMIN_ACCESS.md for setup and migration safeguards. Scoped operational roles
and verification decisions remain future work.

## Existing verification media migration — 18 October 2026

Implemented a backend operator CLI with read-only preview and explicit single-record
apply. Local legacy licences and configured legacy S3 evidence can be copied into
protected storage. Preview revision/content hashes, destination verification,
row-lock rechecks and transactional audits protect against stale plans and concurrent
uploads. No originals are deleted; shared references and cached public copies require
separate cleanup after validation. See ADMIN_ACCESS.md for commands and limitations.

No live records/cloud objects were migrated. Deployment configuration, live storage
and Postgres validation, original-access revocation, scoped staff permissions and
verification decisions remain pending.

## Staff session self-service — 18 October 2026

Delivered Your sessions for all authenticated staff roles: paginated own active
sign-ins, current-session identification, IST timestamps, network/browser context,
explicit refresh and confirmed individual sign-out. The server scopes every
operation to the caller, rechecks active credentials, and commits revocation with
an audit entry. Revoking this session returns to sign-in; other-session revocation
keeps the current session active. No customer-data permissions were expanded.

Backend/frontend regression checks cover scope, expiry, audit failure, CSRF and
interaction outcomes. Live Postgres/multi-browser checks remain pending. Remaining
access work includes invitation renewal, controlled password/MFA replacement and
operational record scopes. Storage deployment and old-public-copy cleanup remain
pending as documented above; this step does not resolve those requirements.

## Invitation lifecycle controls — 18 October 2026

Delivered owner-only renewal and revocation of unused staff invitations, with
explicit confirmation/reason, recent sign-in, revision checks, target locking and
transactional audit. Team & access distinguishes invitation states from accepted
accounts awaiting MFA. Renewal replaces old links with a new 24-hour invitation;
revocation invalidates unused links. Accepted accounts cannot be reset this way.
No email delivery or database migration was introduced.

Automated coverage includes activation attempts using superseded/revoked links,
concurrent-change detection, authorization, audit failure and frontend interactions.
Live Postgres concurrency/onboarding validation remains pending. Remaining access
work: controlled password/MFA replacement and operational record scopes. Storage
configuration, migration and revocation of original public copies remain deployment
requirements; no live storage changes were made in this step.

## Authenticated password change — 18 October 2026

Delivered password change under Account security (existing sessions route). Staff
must prove their current password and a fresh authenticator code, confirm the new
password and acknowledge global sign-out. The backend rechecks the active account
and session, applies attempt limits, rejects replayed codes, hashes the new password,
revokes all sessions/unfinished challenges and commits the audit transactionally.
The frontend clears fields and returns to sign-in after success. No schema change.

Automated tests cover positive and negative paths, including audit rollback and
old-password rejection. Live Postgres/multi-browser checks remain pending. This is
self-service for a staff member who still has both factors; forgotten-password
recovery, authenticator replacement and scoped operational roles remain pending.
Existing private-storage deployment/remediation requirements are unchanged.

## Recovery-code renewal — 18 October 2026

Delivered self-service backup-code replacement under Account security. Password and
fresh TOTP proof, account/IP attempt limits and transaction locks protect renewal.
All old codes are invalidated, other sessions and login challenges are revoked,
and the current session remains active for the existing save-once code screen.
Only hashes are stored; audits exclude raw codes. No schema change was required.

Automated backend/frontend tests and build checks cover renewal, old/new code use,
current/other sessions, audit failure and ambiguous response guidance. Actual
Postgres/multi-browser validation remains pending. Forgotten-password recovery,
authenticator replacement and operational record scopes remain separate future
work; the documented storage deployment/remediation requirements still apply.

## Master-data catalog inspection — 18 October 2026

Delivered owner-only vehicle/luggage catalogs under Master data, with audited
read APIs, label/key search, active/inactive filtering, bounded pagination and
stable ordering. Passenger seat capacity, stored luggage surcharge percentages,
icon configuration and recorded IST timestamps are displayed without changing
fare calculations or customer bookings. Empty/error/unauthorized states are covered.

This is read-only inspection. Create/edit, activation/archive, icon upload and
pricing changes remain pending and require separate validation, conflict checks
and audit safeguards. No package operations or non-owner permissions were added.
Automated tests and production build passed; actual database validation remains
pending. Prior account recovery and storage deployment items are unchanged.

## Catalog display editing — 18 October 2026

Delivered owner-only label/display-order edits for vehicle types and
label/description/display-order edits for luggage. Every edit requires a reason,
a server-signed five-minute preview, explicit confirmation and a matching record
revision. Apply rechecks staff/session permissions, locks the record and commits
before/after audit history with the update. Stale/tampered previews and forbidden
fields are rejected. The UI supports preview, back-to-edit, cancellation and errors.

This supersedes the fully read-only status for these display fields only. Catalog
creation, activation/archive, capacity, pricing and icon changes remain pending.
No booking financial/capacity values are recalculated. No migration or live record
change was performed. Automated tests/build pass; live Postgres concurrency and
mobile display validation remain deployment checks.

## Catalog usage inspection — 18 October 2026

Added owner-only View usage reports for vehicle/luggage records. Status-grouped
trip/request/booking counts are read in a consistent database snapshot and audited.
The UI distinguishes reference groups, unknown statuses and zero usage, includes
IST snapshot time and explicitly avoids treating overlapping counts as unique rides.
Vehicle reports exclude package-only trips and Any vehicle preferences.

Activation remains pending: investigation found inconsistent active-option checks
in trip creation and luggage fare selection. Complete new-selection/draft-publish
validation and concurrency handling while preserving existing journeys before
adding status changes. The shared package catalog impact also needs accounting;
usage inspection alone is not a deactivation authorization check. No statuses or
booking behavior were changed in this step. Live database validation remains pending.

## Catalog selection prerequisites — 18 October 2026

Implemented consumer validation for unavailable luggage on new ride quotes/previews/
searches and unavailable vehicles on trip selection, pricing and draft publication.
Active luggage pricing and optional no-luggage requests remain supported. Existing
checkout/completion/history paths are unchanged; restarting searches revalidates
catalog selections. Eighteen focused controller tests and existing lifecycle/admin
regressions pass. No migration or live catalog record change was performed.

Activation controls remain disabled until publication concurrency, reselection UX
for existing searches, and shared package catalog impacts are covered. Live database
and mobile validation remain pending. This is a prerequisite step, not release-ready
catalog activation.

## Existing search luggage recovery — 18 October 2026

Implemented explicit luggage reselection in the mobile pickup-time restart sheet
when the stored option is unavailable. Riders can choose a current option or no
luggage; availability is rechecked and the replacement search is repriced. Catalog
load failures support retry, and repeated availability changes require reselection.
Route, passenger count and payment method cannot be overridden by this request.
The existing ride is preserved when replacement fails. Controller and mobile tests
cover these cases; device validation remains pending.

Catalog activation remains disabled. Next prerequisites: publication concurrency,
vehicle reselection and shared catalog impact safeguards. No live data or schema
changes were performed in this step.

## Existing search vehicle recovery — 18 October 2026

Implemented vehicle reselection for pickup-time restarts when the saved preference
is unavailable. Riders explicitly choose an available vehicle or Any vehicle; the
server preserves source data, validates passenger capacity and recalculates pricing.
Luggage selections survive subsequent vehicle recovery. Loading failures offer
retry. Transactional ride creation now holds the selected vehicle under a SHARE
lock. Focused backend/mobile tests cover recovery, pricing, capacity and errors.

Activation remains disabled pending trip-publication concurrency and shared catalog
cache/package effects. Device and live database concurrency checks remain pending.
No database migration or live catalog change was performed.

## Consumer catalog freshness — 18 October 2026

Vehicle lists now read active database records on each request rather than returning
ten-minute Redis data. Configured vehicle display order is honored with a stable id
tiebreaker. Both vehicle and luggage endpoints use no-store headers and deterministic
ordering. Existing API response shapes and shared package capacity fields are retained.
Already open screens still rely on submission-time availability validation; no live
push refresh is claimed. Database failures return errors rather than stale options.

Four freshness tests plus selection/recovery regressions pass. No migration, Redis
key deletion or live record change was performed. Activation remains disabled; next
is atomic trip-publication validation, including conflict-check failure behavior,
and the remaining shared-package selection impact review.

## Atomic trip publication guard — 18 October 2026

Both publication paths now use a shared transaction guard: traveler serialization,
locked trip snapshot comparison, KYC/future-time checks, active vehicle SHARE lock,
and a final schedule query in the same transaction before live status is committed.
Failed schedule queries no longer permit auto-publication. Publication failure is
returned to the client instead of being swallowed as a successful save. Countdown
and matching work follows commit.

Eleven focused guard tests and catalog/cancellation/start/verification regressions
pass. Live PostgreSQL contention testing remains pending. Catalog activation remains
disabled while shared package selection impacts and other trip-edit writer races
are reviewed. No schema migration or live record changes were performed.

## Trip edit concurrency — 18 October 2026

Added early ownership validation and transaction-guarded trip edits using the same
traveler/trip lock order as publication. Stale snapshots and changed lifecycle states
are rejected. Main edits, verification reuse/uploads and publication-failure reverts
use the guard. Replacement vehicles are rechecked under lock. Ten focused tests and
existing publication/catalog/start/cancellation/verification regressions pass.

This does not make the whole multi-step request atomic. Review published-trip edits
with bookings and remaining auxiliary writers next. Reference-aware orphan media
cleanup and live PostgreSQL contention testing remain pending. Catalog activation
stays disabled; no schema or live record changes were performed.

## Published journey terms — 18 October 2026

Published route/time/vehicle/seats/fare and other journey terms can no longer be
rewritten by general trip edits, even before a booking is visible: riders may already
have quotes or pending requests. The locked service blocks status demotion and uses
published_at to protect legacy reverted drafts. A display-name-only change remains
allowed; started/terminal trips remain frozen. Trip Details hides and guards the
general editor for published trips. Draft editing and explicit cancellation continue.
No rider re-consent/change-negotiation flow is claimed.

Twenty backend edit tests, two mobile policy tests and existing publication,
cancellation and verification regressions pass. Device/live database race validation
remains pending. No schema or live data change. Catalog activation remains disabled
while shared-catalog impact work remains outstanding.

## Direct-booking luggage validation — 18 October 2026

Closed the older reachable booking-draft endpoint's unchecked luggage selection.
A shared service now validates luggage IDs/availability for both booking drafts and
ride searches, with transaction SHARE locks and consistent recoverable errors.
Recorded checkout/payment selections and existing fare formulas are unchanged.
Eight focused tests plus selection/recovery/estimate/wallet regressions pass.

No migration or live data changes. Status controls remain disabled. Next, separate
luggage availability controls from globally shared vehicle activation so the latter
does not block the ride-specific catalog unnecessarily. Device and real database
contention verification remain pending.

## Luggage availability controls — 18 October 2026

Implemented owner luggage activation/deactivation using the existing signed preview,
reason, revision, confirmation, locked apply and audit flow. UI clearly distinguishes
new selection availability from existing bookings and requires explicit selection
for unknown status. Deactivation never cancels or refunds rides. Status previews
use Active/Inactive labels and preserve choices when returning to edit.

This supersedes prior blanket deferral for luggage only. Vehicle activation remains
disabled; pricing/capacity edits remain unavailable. Backend/frontend and consumer
regressions pass. No live catalog record or schema change was performed. Device and
real database contention checks remain pending.

## Read-only ride case queue — 18 October 2026

Support & disputes now has an owner-only RideResolutionCase queue: status/type URL
filters, pagination, refresh, IST timestamps and related ride/trip links. Server
reads are audited in a repeatable-read snapshot and project only case metadata.
Descriptions, evidence, participant identity and payment/resolution payloads are
not returned. Unknown stored statuses remain visible. No cases are changed and no
messages or money movements occur.

Assignment, general support tickets, restricted evidence, proposals, approvals and
resolution/refund actions remain pending. Added three service tests, HTTP permission
coverage and four frontend tests; full suites/lint/build pass. No migration or live
case mutation. Live database validation remains pending.

## Read-only case details — 18 October 2026

Added an owner-only, audited detail API and screen with case timestamps, related
journey links and paginated whole-ride activity. Queue filters survive back navigation.
Status transitions use readable labels with unknown-state fallbacks. No actor IDs,
metadata, descriptions, evidence or financial decision payloads are exposed. Exit
confirmation remains distinct from settlement/fault. Missing cases and loading/error
states are handled. Full admin suite and 47 frontend tests, lint/build pass.

Restricted descriptions/evidence, assignment and resolution proposals remain next
steps. No schema change or live case mutation. Live database validation pending.

## Restricted case description access — 18 October 2026

Implemented a separate owner-only permission and reason-gated, CSRF-protected access
endpoint for case descriptions. Audit commits before disclosure; only bounded plain
text and timestamps are returned, never raw evidence/resolution data. The UI requires
explicit reveal, escapes markup, identifies statements as unverified, offers hide/
cancel and ignores late cancelled responses. Queue/detail reads remain description-free.

Full admin suite and 51 frontend tests, lint/build pass. No live case read or mutation.
Restricted evidence and assignment remain pending; no resolution/refund actions were
introduced. Live database and operational validation remain pending.

## Restricted evidence summary — 18 October 2026

Implemented separately permissioned, reason-gated evidence-summary access with audit
before disclosure. A strict field projection exposes recorded ride state, review
action and valid pickup/wait/escalation timestamps, omitting raw JSON, coordinates,
financial identifiers, private previous statements and resolution payloads. The UI
provides explicit reveal/hide/cancel and IST snapshot context; recorded facts are not
presented as proof of fault or current money state.

Full admin suite and 55 frontend tests, lint/build pass. No live evidence was read or
changed. Attachments, assignment and resolution actions remain pending. Real database
and operational validation remain pending.

## Case self-assignment — 18 October 2026

Added audited assignment reads and owner-only claim/release with required reason,
explicit review/confirmation and current-version checks. Open/waiting cases can be
claimed; staff can release only their own assignment. Transactional case locking
serializes claims, permissions/session are rechecked on writes and audit failure
rolls back the change. Ride, payment and case resolution remain unchanged.

Backend admin suite and 58 frontend tests pass. New migration
146-create-admin-case-assignments.js was created but NOT applied; deployment is
required before live assignment works. Real database contention validation remains
pending. Reassignment, queue assignment filters and inactive-assignee recovery are
still pending, along with resolution proposals and approvals.

## Case assignment queue filters — 18 October 2026

Implemented All assignments / Assigned to me / Unassigned / Assigned to anyone filters,
combined with status and issue type. Server-side filtering happens before pagination;
released assignments count as unassigned. Queue labels do not expose staff identity.
Filters survive case inspection/back navigation and changing one resets pagination.
Updated outdated queue copy to reflect existing evidence and assignment capabilities.

Backend admin suite, SQL-generation checks and 59 frontend tests pass; lint/build pass.
The queue now requires the previously created migration 146, which remains unapplied.
No live cases or payments changed. Live database validation, reassignment and recovery
of inactive staff assignments remain pending, followed by resolution proposals/approvals.

## Inactive staff assignment recovery — 18 October 2026

Implemented owner-only recovery of assignments belonging to inactive staff. The UI
requires a reason and explicit confirmation. The server rechecks actor/session,
assignment version and locked assignee state; active staff assignments cannot be
recovered. Recovery releases to the unassigned queue, with transactional audit and
no ride/payment/resolution changes. It does not automatically claim or reopen cases.

Backend admin suite and 61 frontend tests, lint/build pass. Tested stale/repeated
requests, active/missing assignees, confirmation and audit rollback. No migration or
live mutation performed. Existing migration 146 is still required and unapplied;
live PostgreSQL concurrency validation remains pending. General reassignment and
resolution proposals/approval workflows remain next steps.

## Case assignment history — 18 October 2026

Added a separately permissioned assignment history panel with explicit open/hide,
25-event pagination, refresh, IST times and escaped assignment reasons. The API
returns only case-scoped assignment changes and audits history access before response;
raw audit metadata, IPs and staff IDs are excluded. Assignment changes/refresh reset
the panel to prevent stale history display.

Backend admin suite and 64 frontend tests pass. No migration or live case operations.
Existing migration 146 remains unapplied; live database validation remains pending.
General reassignment and case resolution proposal/approval workflows are still pending.

## Case reassignment — 18 October 2026

Implemented an owner-only eligible staff picker and reviewed case reassignment.
Recipient eligibility requires active status, MFA and cases.assign (currently owners
only). The server rechecks actor/session, target, case state and assignment version
under transactional locks; audit failure rolls back the transfer. Existing assignments
can be transferred and unassigned open/waiting cases assigned directly. Closed cases,
stale requests and same-recipient transfers are rejected. History labels transfers.

The UI requires recipient, reason and confirmation and refreshes assignment/history
on success or conflict. Staff listing is paginated and audited without credentials or
email disclosure. Backend admin suite and 68 frontend tests pass, with lint/build.
No live mutation or migration run. Migration 146 remains required and unapplied;
live database contention testing remains pending. Next: resolution proposals and
approval workflows, with financial execution separately protected.

## Resolution proposal foundation — 18 October 2026

Implemented owner-only proposal read/write controls with reviewed submission and
reasoned withdrawal. Assigned reviewers can recommend further investigation, payment
review or closure without financial adjustment. Proposals are not approved or applied:
no ride, case status, money movement or notifications change. No amounts are accepted.

Case/assignment revisions reject stale submissions; one pending proposal per case is
enforced in service and by a partial unique database index. Client submission UUIDs
make identical retries idempotent. The author or current assigned reviewer can withdraw
pending proposals with audit, retaining history. The UI shows IST times, context-change
warnings, permission checks, confirmation, pagination, empty/error states and safe text.

Backend admin suite and 73 frontend tests, lint/build pass. New migration 147 creates
proposal storage; neither 147 nor the previously required 146 was applied. No live
mutations. Live database concurrency validation remains pending. Next steps are
independent approval/rejection and guarded execution, with fresh financial previews
and existing business services required before any refund/settlement capability.

## Independent proposal approval/rejection — 18 October 2026

Implemented separately permissioned, reasoned approval and rejection by a reviewer
other than the proposal author. The server checks fresh case revision, active actor
permission/session and pending proposal state; approval also requires open/waiting and
unchanged proposal context. Refreshed stale/closed proposals can be rejected. Decision
UUIDs make retries idempotent, while conflicting decisions and withdrawal races fail.
Audit failure rolls back the decision. The UI confirms intent and shows IST decision
history, with Approved · Not applied explicitly distinguishing review from execution.

Approved recommendations block another active proposal until withdrawn or eventually
executed. The author/current assignee can withdraw before execution, preserving the
recorded review. Original migration 147 was updated with decision columns and the active
proposal index; no new alteration migration and no migration run. Migrations 146–147
remain deployment prerequisites. Backend admin suite, 77 frontend tests, lint/build pass.
Live database contention testing remains pending. No case/ride/payment/notification
mutation is triggered by decisions. Next: guarded outcome execution with current
business-state validation; payment execution requires dedicated financial previews.

## Apply approved further investigation — 18 October 2026

Implemented separately permissioned execution for further_investigation only. It
requires the current assigned reviewer, an independent approval, unchanged proposal/
decision/case context and an open/waiting case. Execution atomically marks the case
waiting, marks the proposal executed and records audit plus execution metadata.
Identical retries are idempotent; withdrawal, stale approval and unsupported outcomes
are rejected. Audit failure rolls back case and proposal. No money, ride state or
notifications change. Existing dispute/escrow holds are preserved.

UI includes reason, review/confirmation, recorded execution history and parent case
refresh. Original migration 147 was updated, not run. Backend admin suite, 82 frontend
tests, lint/build pass; live database validation remains pending. Payment review and
case closure execution remain blocked pending server financial previews and guarded
business-service integration. Deployment still requires migrations 146–147.

## Recorded financial review — 18 October 2026

Added a separately permissioned, reason-gated financial snapshot in case details.
It reads ride fare, linked escrow allocations/status and provider payment attempts
with refund/settlement state and recorded check times. Ownership inconsistencies are
withheld; missing links, invalid amounts, allocation mismatches and oversized refunds
are flagged. Provider attempts remain separate and paginated. No wallet balances,
provider secrets/IDs or customer phone numbers are disclosed. Access is audited before
returning data; the viewer supports refresh, hide, cancellation and IST timestamps.

Backend admin suite and six targeted service tests, 86 frontend tests, lint/build pass.
No migration or live provider/data operations. This is database evidence only: it does
not refresh the provider, determine a refundable amount or authorize money movement.
Next: reconciliation-aware financial previews and guarded outcome execution. Previous
migration deployment and live database validation remain pending.

## Conservative wallet refund assessment — 18 October 2026

Added a separately permissioned, reason-gated read-only assessment for cancelled/no-show
wallet rides. It checks record ownership, escrow/fare allocation, held obligations,
active wallet and exactly one matching booking debit. Missing/conflicting evidence,
frozen or previously released funds and other ride/payment types block the amount.
A passing snapshot shows an illustrative full refund only, explicitly not approved
or executable. It does not determine entitlement or deductions and reserves no funds.
Mixed-source aggregate obligations may need reconciliation. Audit precedes disclosure;
private wallet balances/identifiers are not returned. UI supports refresh/hide/cancel.

Fixed financial review withholding valid ride escrow without trip_id: existing booking
writes omit it. Ride/participant linkage still must match, and explicit mismatches or
package escrow are rejected. Backend admin suite, 90 frontend tests, lint/build pass.
No migration or live money/provider operations. Financial approval/execution still
requires an explicit action-specific preview, fresh locked revalidation and integration
with business services; this assessment cannot authorize it. Existing deployment and
live database validation remain pending.

## Action-specific full wallet refund preview — 18 October 2026

Implemented a separate owner permission and assigned-reviewer preview for the conservative
cancelled/no-show wallet scope. The server supplies the full amount without deductions;
client amounts are rejected. Current active MFA session, assignment, no active proposal,
case/financial consistency and audit are required. An encrypted authenticated reference
binds reason, amount, actor/session and case/assignment/financial evidence. It expires
within five minutes; a recheck detects changed evidence and never extends expiry.

Case details includes an explicit reason form, INR amount, IST expiry, recheck and hide/
cancel controls. Failed rechecks discard the old amount; expired previews require a new
preview. No balance/internal financial identifiers are disclosed. Assessment and preview
share the same backend snapshot reader. No refund approval, execution, reservation,
provider call, case mutation or migration occurs. Financial entitlement review and a
separate independent financial proposal/approval with locked, idempotent business-service
execution remain next. Existing investigation proposals do not authorize refunds.

Backend admin suite, four targeted preview tests, 94 frontend tests, lint and build pass.
Live database validation and prior migration deployment remain pending.

## Independent review of full wallet refund proposals — 18 October 2026

Added a dedicated proposal action from a valid refund preview. The assigned reviewer
confirms the server-provided INR amount and full-refund reason; the browser cannot set
an amount. The server rechecks the preview's session, expiry, evidence and assignment,
locks case/assignment context and records an audited pending proposal. A stable UUID
supports exact retry after uncertain responses; active competing proposals are blocked.

Proposal history now shows financial amount and changed-evidence warnings. A separate
wallet-refund decision permission and a different reviewer are required; approval
validates current financial evidence and the displayed immutable revision. Stale refunds
can be rejected or withdrawn. General proposal submissions cannot create refunds, and
approved refunds cannot execute through the investigation action. No money moves.

Updated the original migration 147 with amount, financial revision and preview hash,
without running it. Existing database schema must be updated before deployment. Next:
locked, idempotent refund execution through shared business services. Real database
contention tests and deployment validation remain pending.

## Guarded full wallet refund execution — 18 October 2026

Added a dedicated execution permission/action for independently approved full wallet
refund proposals. The current assigned reviewer confirms the server-recorded INR amount,
reason and case/financial revision. Execution locks the ride and financial records in a
serializable transaction, rechecks the approved evidence and invokes the shared wallet
refund service. Exact execution retries return the previous result without another
credit. Unsupported payment/state, stale evidence and conflicting executions fail.

Wallet credit, held-fund reduction, user balance mirror, refund ledger, escrow/ride refund
state, activity, queued notification, proposal execution and audit commit together. Any
write failure rolls back. Case and cancelled/no-show ride status remain unchanged;
execution does not close a safety/support investigation. UI confirmation and history
identify wallet refunds separately from further investigation. Unknown outcomes retain
the same execution payload for retry. No live refund, provider call or migration ran.

Backend admin suite, cancellation/resolution/settlement regressions, 98 frontend tests,
lint and build passed. Real PostgreSQL contention tests, deployed migration 147 schema
and notification delivery still need validation. This enables the conservative full
wallet refund scope only; partial/external refunds and guarded case closure remain
separate work.

## Restricted case closure after refund — 18 October 2026

Implemented separately permissioned execution of independently approved closure proposals
for cancelled/no-show wallet rides with a verified full refund previously executed through
this case. Current assignment, approval/context revision, refunded escrow and an exact
matching refund ledger/balance delta are required under serializable transaction and row
locks. The UI requires reason and confirmation; identical retries are idempotent. Closure
resolves the case and records execution/audit without altering the ride, transferring
money or sending another notification. Audit failures roll back. Consumer resolved_by is
not used for a staff identity; the staff reference is recorded in resolution JSON.

The action checks refund eligibility at execution. Active/arrived rides, held/inconsistent
funds, external payments or missing admin refund evidence stay blocked. Broader closure
policies remain separate work. No migration or live case action ran; prior schema deployment
and real database concurrency validation remain pending.

## Closure for ended rides with no payment evidence — 18 October 2026

Extended guarded closure to cancelled or expired rides with no payment confirmation,
order, transaction or escrow reference, and no related escrow/provider attempt/wallet
ledger entry. Any recorded attempt blocks closure regardless of state. Payment method
must be unset or wallet; active rides and unpaid no-shows remain blocked. A quoted fare
is not treated as a payment. The server records no_recorded_payment versus
verified_full_wallet_refund in the case resolution, keeping the eligibility basis clear.

Existing independent approval, current assignment, separate permission, serializable
transaction, execution retry and audit safeguards still apply. Failed evidence reads
or audit writes leave the case unresolved. No money, ride state or notification changes;
no migration or live case mutation. Real concurrent payment/closure validation remains
pending along with previous deployment prerequisites.

## Closure readiness guidance — 18 October 2026

Added a permissioned, audited, reason-gated readiness check in case details. It shares
closure eligibility logic with execution while using a read-only consistent snapshot.
Staff see whether the current ended-ride/payment evidence fits a supported closure
path, or whether journey/payment/refund evidence needs review. Closed cases do not pass.
No wallet identifiers or balances are disclosed. Approval and current assignment are
separate execution requirements, explicitly not granted by a successful readiness check.

The panel supports refresh, hide and cancellation; stale results are discarded after a
failed refresh and late cancelled responses are ignored. No money, case or ride mutation,
notification, provider request or migration. Existing deployment and real database
concurrency validation remain pending.

## Recorded case resolution viewer — 18 October 2026

Resolved case details now include a separately permissioned, reason-gated audited
resolution viewer. It presents known outcome and closure-basis labels, recorded reason,
IST closure time and whether the current staff member recorded it. Raw JSON, provider
responses and internal financial/staff identifiers are withheld. Unknown outcomes have a
safe history-review fallback; unresolved cases do not disclose stale resolution content.
The viewer supports hide/cancel and does not claim current payment confirmation.

No case/payment mutation, provider request or migration. Existing database deployment
and concurrency validation remain pending.

## Notification delivery inspection — 18 October 2026

Added a read-only Notification delivery module for persisted ride-request/trip events.
Separate owner permission and server audit protect access. Staff can filter recorded
status, paginate, refresh and open the related journey. IST timestamps show created,
updated, sent, delivered and read evidence separately. Sent is explicitly not proof of
device delivery; absent timestamps are not inferred. Unknown states/invalid links have
safe fallbacks. Packages, message content, recipients, raw errors and provider IDs are
not disclosed. No resend or bulk operation is enabled and no notifications were sent.

No migration or live mutation. Worker retries, provider delivery acknowledgements,
restricted failure diagnosis and live deployment validation remain separate work.

## Notification search by ride/trip reference — 18 October 2026

Delivery inspection now supports R0002/T0013-style references with server validation,
normalization and exact journey scoping. Unknown references return no matching records
instead of broadening the queue. The URL preserves search/filter state; applying or
clearing a reference resets pagination while retaining the status filter. Reference
access is included in audit metadata. No send, mutation, provider request or migration.

## Notification investigation date range — 18 October 2026

Added India-local creation-date filters with inclusive end dates, optional single bounds
and server validation of calendar dates/order. Applying or clearing dates preserves the
journey/status filters and resets pagination. URL state remains shareable within the
permissioned admin app. Boundary and leap-day tests verify UTC conversion; no sent/delivered
state is inferred from the date range. No sends, mutations or migrations.

## Restricted notification investigation — 18 October 2026

Added a separately permissioned, audited reason-gated Inspect action in notification
delivery. It presents safe recorded-evidence guidance, provider-reference presence and
IST sent/delivered/read times. Raw provider errors, IDs, messages and recipients stay
withheld. Mixed sent timestamps with failed/queued status are flagged. The current sender
usually records only a generic push-unavailable error, so the UI does not invent a network
or device-token diagnosis. Sent without a reference is not claimed as provider acceptance.

Hide/cancel and late-response protection are included. No resend, provider check, message
send, database mutation or migration. Structured delivery outcomes and real worker/device
validation remain further work.

### Implemented: accurate push outcomes

Sender records now distinguish provider-accepted, failed and skipped pushes.
Admin staff can filter skipped events and inspect restricted explanations with
an audited access reason. Missing devices and disabled preferences no longer
appear as sent. In-app events remain available; historical data is unchanged.
No live push or database operation was performed. Real worker/device validation
and broader direct-send retry orchestration remain pending.

### Implemented: independent notification read state

Consumer single/bulk read actions now preserve push delivery status and provider
evidence. Queued cancellation work remains eligible after an in-app read, and
failed deliveries can still recover. The first read timestamp is preserved by a
conditional update scoped to the recipient. Admin read timestamps remain separate
from push status; legacy read-status records are unchanged. Mocked regression
coverage includes ownership, tab scope, repeat reads and worker retry after read.
Real device/worker validation remains pending. No live sends or migrations.

### Implemented: cancellation worker retry isolation

Successful rider-search enqueue is checkpointed separately from push completion,
so committed push failures can retry without repeatedly enqueueing the search.
Queue failures remain retryable. One event's transaction failure no longer aborts
the remaining batch; logs omit raw provider/database text. Mocked regression tests
cover these cases and the local concurrent-sweep guard.

Cross-system exactly-once delivery is not claimed: rollback/crash replay relies
on the existing retained BullMQ job ID and live ride checks. Real Redis/PostgreSQL
failure testing remains pending. No live sends, queue jobs or migrations ran.

### Implemented: notification retry and rider-search evidence

Audited notification inspection now shows automatic cancellation-worker retry
eligibility and a validated rider-search enqueue checkpoint in IST. It distinguishes
queue acceptance from successful matching and marks absent historical checkpoints
as inconclusive. Only projected evidence is exposed; raw metadata stays restricted.
No resend or live worker-health claims are added. Real worker/device validation
remains pending; no notifications, queue jobs or migrations were executed.

### Implemented: automatic retry queue filter

The delivery queue now offers an automatic-retry eligibility checkbox backed by
server filtering of cancellation-worker queued/failed events. It preserves other
filters, resets pagination and persists in the URL. Server validation and auditing
cover the new filter; contradictory status filters do not broaden results.
Eligibility is explicitly not a worker-health check or retry-time guarantee.
No sends, queue jobs or migrations were run. Live worker validation remains pending.

### Implemented: audit history action and staff filters

Audit history supports exact action and staff actor UUID filters, combined on the
server. Filters persist in the URL, apply/clear resets pagination, and existing
permission and stable-order pagination remain in place. Copy now reflects case
and operational events as well as staff security. Service validation and frontend
apply/clear tests cover the change. No live data mutations or migrations ran.
Broader date/entity audit investigation and exports remain future work.

### Implemented: first online payment operations queue

Payments & refunds now opens a real, permission-gated read-only online order queue
instead of its planned-module page. Staff can filter by recorded local state and
payment environment, distinguish test payments, inspect recorded INR amounts and
IST timestamps, refresh and navigate to a linked ride. Filters persist in the URL
and reset pagination. The backend audits access and excludes customer phone,
checkout credentials, raw errors and provider references.

This is only the first payment module slice. Wallet payments, order/attempt detail,
provider reconciliation, recheck actions and external/partial refunds remain pending.
No live provider requests, payments, refunds, migrations or queue sends ran. Real
PostgreSQL/provider validation remains pending.

### Implemented: restricted payment record inspection

Payment queue rows offer a separately permissioned, reason-gated inspection panel
with audited access. Recorded payment, refund and settlement states are shown
separately, alongside INR allocations and IST timestamps. Sandbox-only checkout
is distinguished from actual traveler settlement. Hide/cancel and late-response
protection follow the existing restricted-inspection pattern. Existing refunded
orders are now recognized by the queue/filter rather than shown as unknown.

This is stored evidence, not a complete attempt timeline or provider reconciliation.
Live rechecks, refund execution and wallet coverage remain pending. No live provider
calls, financial mutations or migrations were performed.

### Implemented: payment search by ride reference

Staff can find online payment records using an exact R-number. Server validation,
bigint-safe lookup and an empty result for unknown rides prevent accidental broad
searches. Apply/clear resets pagination, preserves state/environment filters and
keeps the reference in the URL; changing the ride search closes open inspection.
Normalized searches are audited. No provider calls, money changes or migrations.
Live reconciliation, wallet coverage and financial execution remain pending.

### Implemented: local payment/ride consistency comparison

Payment inspection now compares the order with its linked ride inside the same
snapshot. Historical orders are distinguished before comparing current participant,
trip, method, confirmed fare and confirmation state. Discrepancies are flagged;
missing evidence is unavailable/incomplete. Only safe findings are displayed.
This remains read-only local evidence, not provider reconciliation, and does not
repair records or execute payments/refunds. Live provider validation remains pending.

### Implemented: India-local payment investigation dates

Payment records can be filtered by creation date or recorded-paid date, with
inclusive end dates interpreted in IST. Apply/clear preserves ride, state and
environment filters, resets pagination and closes the old inspection. URL state
retains date choices. Backend validates calendar dates and audits the selected
basis/range. Tests cover boundaries, leap days, invalid/reversed dates and UI filter
preservation. No provider calls, financial writes or migrations were performed.

### Implemented: recorded payment-check diagnostics

Audited payment inspection shows safe explanations of recognized stored provider,
network and booking-retry errors and the check age at inspection. Invalid/future
check times are explicit. Raw errors stay restricted, and no successful provider
check is inferred from checked_at or absence of error. This does not add live
reconciliation or retry controls. No provider requests, financial writes or migrations.

### Implemented: payment reconciliation batch failure isolation

A reconciliation error followed by a failed retry-marker write no longer aborts
remaining orders. Recognized error codes are retained; arbitrary provider text is
not persisted/logged. No financial state is changed by retry-marker handling.
Mocked tests cover batch continuation, local concurrency, guard recovery and error
privacy. Existing Cashfree regressions pass. Real PostgreSQL/provider outage and
multi-process validation remain pending; no live provider calls or migrations ran.

### Implemented: recorded-error payment queue filter

Staff can filter online orders with a non-empty recorded error without opening
each inspection. Existing filters persist, pagination resets and the previous
inspection closes. The backend validates and audits the filter and keeps raw error
content restricted. UI copy distinguishes stored errors from failed payments or
ongoing outages. No provider requests, payment changes or migrations were made.

### Implemented: payment sweep environment isolation

Automatic reconciliation selects only the configured gateway environment and
skips any mismatched/missing-environment row without updating it. Invalid gateway
configuration fails before querying. This keeps old sandbox records out of production
batches; it does not resolve or discard those records. Mocked SANDBOX/PRODUCTION,
invalid-configuration and existing Cashfree regressions pass. Real environment-switch
validation remains pending. No live requests, credentials or migrations were changed.

### Implemented: recorded refund queue visibility

Payment operations now includes a recorded refund-state column and independent
filter, with validated/audited server filtering. Other filters persist and pagination
resets. Missing/unknown values are distinct from success or failure. This provides
refund investigation visibility only; provider rechecks, refund submission and
external refund retry actions remain pending. No provider calls or migrations ran.

### Implemented: refund recovery validation

The existing provider-refund processor no longer treats null/invalid amounts as
zero. Validated refund amounts cannot exceed the order amount. Only explicit 404
lookup results permit refund creation with the existing identity; empty responses,
outages and incomplete/mismatched evidence do not confirm completion. Explicit zero
refund policy remains supported without a provider call. Cashfree mocked regressions
pass. No live refunds/provider requests or migrations ran; live failure tests remain.

### Implemented: refund request ownership and repeat safeguards

Online refund intents now verify ride/passenger ownership and validate requested
amounts even for pending or completed repeats. Different amounts are rejected;
exact repeats remain idempotent. Trip cancellation supplies the required identity
context for each selected order. Cashfree, trip cancellation and ride-resolution
mocked regressions cover the change. Real database/provider validation remains
pending; no live refunds or migrations were executed.

### Implemented: recorded refund request/completion timeline

Added nullable request and local-completion timestamps across current refund paths
and the audited inspection panel. Exact repeats preserve timestamps; zero-refund
closure does not record a completed transfer. Historical timestamps remain absent.
The original cashfree-payments creation migration 142 was updated (not executed).
Schema deployment is required before running this change against an existing database;
migrate alone does not alter a previously applied creation migration. No reset,
provider calls or live refunds ran. Live schema/transaction validation remains pending.

### Implemented: refund-specific date investigation

Payment date basis now includes refund requested and local refund completion,
using dedicated timestamps and inclusive IST bounds. Existing refund/payment/ride
filters remain combined, pagination resets, and missing historical timestamps are
not substituted with order age. These controls require the prior nullable timestamp
schema update, still unapplied. No provider calls, refunds or migrations ran.

### Implemented: refund timeline consistency evidence

Restricted inspection flags future/invalid/reversed refund dates and conflicting
completion states, while missing historical dates stay inconclusive. Recorded elapsed
time is shown only for valid dates and is explicitly not a deadline or bank-credit
confirmation. Uses the prior unapplied refund timestamp schema update. No provider
checks, automatic repairs or migrations were run.

### Implemented: stored payment amount consistency evidence

Payment inspection checks allocation totals and refund bounds with integer paise,
separates missing from invalid evidence and flags contradictory zero-refund states.
Results are read-only and never presented as available funds or provider confirmation.
No provider requests, balance changes or migrations. Prior timestamp-schema deployment
and live integration validation remain pending.

### Implemented: settlement evidence safeguards and recorded diagnostics

Settlement processing now validates timing and allocation totals before provider
calls, rejects malformed/conflicting split lookups, and requires usable bank-reference
evidence before release. Recovery of matching allocations remains supported.
Specific safe codes distinguish timing, allocation, provider-evidence and unavailable
settlement-reference blockers in the existing audited payment inspection. Historical
generic errors remain unchanged; raw provider responses are not exposed.

Eight payment/admin unit-test files pass. No live provider requests, financial actions
or migrations ran. Mocked tests do not establish real bank credit, transaction rollback
or production readiness. Provider/database integration validation remains pending.

### Implemented: settlement escrow binding

Settlement verifies the linked held-funds record belongs to the same ride,
passenger and traveler and has matching total, fee and traveler amounts. Missing
or conflicting records block provider calls with a safe admin diagnostic. Optional
trip IDs are checked when present; frozen or disposed funds remain excluded.
Eight payment/admin unit-test files pass. No live financial calls or migrations ran;
real database/provider integration validation remains pending.

### Implemented: refund escrow binding

Current-booking refunds validate and lock linked held funds before provider calls
or zero-value closure. Ownership, amounts and state must agree; inconsistent or
frozen/allocated records require review through a safe admin diagnostic. Replaced
payment refunds do not alter the new booking's escrow. Payments never booked may
have no escrow link. Eight payment/admin test files pass. No live refunds or
migrations ran; database/provider integration validation remains pending.

### Implemented: refund response identity and status validation

Refund lookup/submission responses must match the order, refund identity, INR
currency, amount and known status before progress is recorded. Unknown evidence
produces a safe diagnostic without confirming completion. Admin filters and
inspection now recognize Pending approval and Rejected; legacy Failed remains
supported. No automatic resubmission of non-success refunds was added. Current
provider documentation was checked; configured-version sandbox validation remains
pending. No live refunds, migrations or gateway version changes were made.

### Implemented: full and partial refund notification clarity

Online refund notifications distinguish full and partial returns, with exact
refunded/retained amounts. Sandbox messages include the simulated amount and
no-real-money label. Event metadata records scope and amounts; repeated completion
retains the existing single-notification behavior. Refund policy, accounting and
execution controls are unchanged. Eight payment/admin test files pass. No live
notifications, refunds or migrations ran.

### Implemented: rider refund status alignment

Mobile Ride Details distinguishes approval, hold, attention and unknown confirmation
states. Retained money is not automatically called a cancellation fee; failure does
not assert cancellation. Test labels persist, and invalid amounts show unavailable.
Eight focused mobile tests pass; lint has no errors and one existing warning.
Device visual validation remains pending. No refund execution rules changed.

### Implemented: ride payment status refresh isolation

Mobile payment results are scoped to the ride and refresh attempt. Previous evidence
is hidden while checking, late responses are ignored, repeated taps are blocked,
and errors/malformed responses remain retryable. Eleven focused mobile tests pass;
targeted lint and whitespace checks pass. Device validation remains pending.

### Implemented: payment summary amount integrity

Payment-status APIs preserve missing/invalid amounts as unavailable instead of
coercing them to zero. Excessive refund amounts cannot produce negative retained
funds; valid partial/full/zero refunds use integer-paise arithmetic. Traveler copy
handles unavailable earnings and fees. Eight backend test files and twelve focused
mobile tests pass. No financial writes or migrations; device validation remains.

### Implemented: Ride Details foreground fallback refresh

The fallback refresh pauses when hidden/backgrounded and resumes immediately on
app foreground. Slow fallback requests do not overlap, and cleanup prevents polling
from restarting after unmount. Existing socket and focus paths remain unchanged.
Sixteen focused mobile tests pass, with hook lint and screen syntax checks.
Device lifecycle validation remains pending.

### Implemented: Ride Details response ordering

Latest-request and identity checks protect ride data, traveler offers, errors and
loading state from older responses. Navigation resets prior details; failed offer
refreshes clear stale offers. Nineteen focused mobile tests pass, with hook lint and
screen syntax checks. Requests are not aborted or serialized; full-screen device
race/navigation validation remains pending.

### Implemented: Ride Details traveler offer identity

The accepted-offer fallback requires a unique candidate matching recorded traveler
and trip IDs. Legacy records without those IDs use only a single eligible offer;
ambiguous lists no longer choose the first item. Previous fallback details clear
before replacement offers load. Twenty-three focused mobile tests pass, with
helper lint and screen syntax checks. Device multi-offer validation remains pending.

### Implemented: accepted-offer read compatibility

Accepted offers are no longer hidden by legacy expiration timestamps and expose
no static countdown. Ownership/status filtering and checkout live-feasibility
checks remain; pending invitation deadlines are unchanged. Ten backend test files
pass. No migrations, provider calls or notifications ran; device validation remains.

### Implemented: accepted-offer seat visibility

Accepted-offer counts deduct other unpaid holds as well as booked seats and exclude
the current rider. Invalid capacity is unavailable; zero never becomes demo seats
in the traveler screen. Checkout remains the authoritative capacity gate. Four
backend test files and two mobile tests pass; live concurrency/device checks remain.

### Implemented: traveler-offer presentation without demo data

Missing traveler, route, fare, timing and reputation values now stay unavailable.
Review counts use ratings, unsupported performance claims are removed, India time
is explicit, and accepted offers no longer have a local expiry countdown.
Incomplete offer identity/fare blocks confirmation. Six focused presenter/seat
tests pass with helper lint and screen parsing; device confirmation tests remain.

### Implemented: accepted-offer action isolation

Confirm/Decline share a tap guard and visible busy states. Confirmation goes to
Ride Details, without prematurely creating a payment order or defaulting to wallet.
Late action completion is ignored after navigation/offer replacement. Eleven focused
mobile tests pass; test lint and screen parsing pass. Device checkout/navigation
validation remains pending; no live financial actions ran.

### Implemented: declined-offer navigation freshness

Successful decline replaces the old offer with Ride Details, which reloads current
server status instead of promoting cached alternatives or assuming search resumed.
Missing identity, failed requests and late responses are handled without false
success navigation. Fifteen focused mobile tests pass with lint/syntax checks.
Device navigation validation remains pending; no live actions were performed.

### Implemented: traveler-offer photos and honest verification display

The offer screen displays supplied profile/vehicle photos with current backend
image authentication and failure placeholders. Tokens are not sent to third-party
origins. Removed the unconditional verification tick; verification workflow remains
separate. Twenty-five focused tests pass with lint/syntax checks. Device protected
image delivery validation remains pending.

### Implemented: protected image URL token renewal

Shared image URLs replace stale backend tokens, preserve query/fragment data and
keep authentication before fragments. Missing credentials remove stale tokens;
third-party/lookalike origins receive no account token. Twenty-four focused tests
pass with lint/whitespace checks. Live protected-image validation remains pending.

### Implemented: matching traveler drawer photo reliability

The matching drawer uses shared protected-photo token renewal, neutral profile
fallbacks and explicit unavailable vehicle photos. Photo/token changes reset image
failures. Twenty-one focused drawer/image-helper tests pass with lint and whitespace
checks. Device image delivery remains pending; no admin verification workflow added.

### Implemented: matching drawer submission lifecycle

Late submission responses cannot affect a different ride or a reopened/closed
drawer. Old failures cannot unlock newer submissions, and refresh is guarded while
sending. Twelve drawer tests pass with lint/whitespace checks. Device/network
validation remains pending; server requests are not cancelled by closing the UI.

### Implemented: matching drawer fare validation

Invalid fares display as unavailable and cannot be selected or submitted; explicit
zero and valid decimal fares remain accurate and are submitted unchanged.
Forty-eight focused fare/drawer tests pass with lint/whitespace checks. Device/live
API validation remains pending. Backend pricing and fare policy are unchanged.

### Implemented: matching drawer response validation

Invalid response envelopes/list identities/pending counts show refresh guidance;
failed loads no longer show the empty-search success message. Per-card pending
requests block selection even when the total is inconsistent. Fifty-seven focused
drawer/fare tests pass with lint/whitespace checks. Device/live API validation remains
pending; backend concurrency rules are unchanged.

### Implemented: matching request retry reconciliation

Submission errors now require refresh before another traveler can be selected.
Pending requests remain blocked and refreshed fares require a new selection.
Thirty-three drawer tests pass with lint/whitespace checks; device/network validation
remains pending. Existing backend concurrency protections remain unchanged.

### Implemented: matching traveler metadata labels

Ratings, pickup estimates and seat counts now distinguish unavailable data from
confirmed zero values. Invalid ratings/counts are not presented as confirmed facts;
fractional pickup minutes round up. Fifty-four focused label/drawer tests pass with
lint/whitespace checks. Device/live API validation remains pending; backend matching
and capacity decisions are unchanged.

### Implemented: matching drawer foreground refresh

Returning to an open traveler drawer refreshes availability, fares and pending
requests and requires fresh selection. Older loads cannot overwrite the result;
ongoing submissions are preserved. Thirty-seven drawer tests pass with lint and
whitespace checks. Real-device lifecycle/network validation remains pending.

### Implemented: matching drawer detail text safety

Malformed traveler/vehicle/location/service text now shows safe fallbacks instead
of crashing expanded details. Standalone plus codes remain visible and missing
endpoints are explicit. Sixty-six focused tests pass with lint/whitespace checks.
Device/live API validation remains pending; route geometry is unchanged.

### Implemented: server validation of reviewed alternative fares

New traveler requests require the reviewed amount and compare it exactly in paise
with a valid server quote. Pending retries remain idempotent. Updated the older
mobile selection caller to supply the fare. Alternative-request and marketplace
unit files pass (22 cases in the alternative suite), with syntax/whitespace checks.
Live database/device validation remains pending; clients omitting expected_amount
must refresh/upgrade before creating new invitations.

### Implemented: operational inspection and manual document decisions

Owner-only screens now cover recorded system-health evidence, ride escrow queues,
linked wallet ledger entries and live-operation GPS/heartbeat freshness. Reads are
audited and permission checked. Unavailable data is distinct from zero; payment
health separates sandbox and production. Tracking polls only while visible and
is not yet a precise live map. Settlement inspection does not release money.

Manual document review is the selected first-release approach. Staff may record
approval, rejection or correction with an audit reason. Current evidence viewing,
expiry, evidence revisions, session checks and idempotency protect approval.
Provider verification remains separate. Migration 148 creates the new decision
table and has not been run. Consumer enforcement and correction notifications remain pending; uploaded images alone are not approval.

Disputed partial refunds will use a manual amount and independent approval, as
confirmed by the user. The user confirmed that the remainder stays held for a separate settlement
decision. Partial execution remains pending conserved-balance accounting. Existing cancellation penalties are not that policy.

Current verification: 319 backend regression cases passed. Browser authenticated
validation is pending because the local admin API was unreachable. No database
reset or real financial operation was performed. Continue the outstanding roadmap;
these additions do not mean all modules or launch acceptance are complete.

### Implemented: manual review history and legacy refund safeguards

Per-record manual review history is paginated, audited and separate from current
approval. Feature screens now load on demand, reducing initial JavaScript from
about 504 KB to 301 KB. Legacy ride refunds now respect dispute/frozen states,
validate linked ownership and wallet balances, and keep provider funds out of
wallet credit. This does not enable disputed partial refunds or remainder payout.

Next financial work: persist partial-refund amounts and remaining obligations;
reconcile previews, independent approvals, execution, replay, ledger, case closure
and settlement against those balances. Keep the remainder held until a separate
approved decision. Do not reuse cancellation penalties for this policy.

Latest automated validation: 327 backend cases and 143 frontend cases passed;
frontend lint and production build passed. Migration 148 and authenticated staging
validation have not been run. Partial-refund execution remains unfinished.

### Implemented: partial-refund accounting foundation

Original escrow migration 028 and model now record partial refunds separately
from the original fare. The settlement screen displays original total, partial
credits and remaining hold, including a partial-refund review filter. Invalid
remaining amounts are unavailable, not zero. Existing full-refund/cancellation
and automatic-settlement paths refuse previously partially credited funds.
Aggregate wallet assessments subtract partial credits on other held escrows.

Migration was not run. An existing database needs a controlled schema upgrade;
`db:migrate` does not replay migration 028. Do not reset populated data. Manual
amount preview, independent approval, atomic partial execution and separate
remainder disposition remain pending. No partial-refund action is enabled yet.
Validation: 335 admin/payment regression cases passed, followed by a passing
20-case cancellation suite with one additional guard case. Four settlement UI
tests, lint and production build passed.

### Implemented: manual partial-refund preview

Assigned reviewers can enter a partial wallet refund and inspect the exact
remaining hold. Current case ownership, session, frozen-fund ownership, passenger
exit where required, original debit, wallet reconciliation and preview expiry are
checked. Separate partial-preview tokens cannot enter the full-refund flow.

This is preview only. Partial proposal submission, independent approval and
execution are still unavailable; no money moves. Validation: 340 backend tests,
five focused preview UI tests, lint and production build passed. No migration or
real financial operation was run. Next: persist and independently review partial
proposals before adding atomic execution and remainder settlement.


### Implemented: partial-refund proposals and independent review

Assigned reviewers can submit the reviewed partial wallet-refund amount and
remaining hold for a different authorized staff member to approve or reject.
The confirmation and review screens show both amounts. Submission retries reuse
the same request identity, and approvals bind the amount and remaining hold to
the financial revision. Changed balances and self-approval are refused.

The frontend patch is now applied. Validation: all 148 frontend tests across 38
files passed, along with lint, TypeScript and the real-workspace production
build. Nine backend preview, proposal and HTTP-boundary tests passed.

These actions move no funds. Partial-refund execution remains disabled, including
through the full-refund execution endpoint. Next: atomic wallet credit, ledger
and notification outbox with retry/concurrency protection; then a separate
independently reviewed decision for the remaining held balance. Original schema
changes have not been run; existing databases need a controlled schema upgrade.

### Implemented: approved partial wallet-refund execution

The assigned authorized reviewer can execute an independently approved partial
wallet refund after fresh case and financial checks. The confirmation shows the
refund and remaining hold. Wallet credit, ledger, activity, audit, notification
outbox and execution identity share a serializable transaction; identical retries
reuse the recorded result. The original fare and allocations are unchanged. The
case remains open and the remainder stays held for a separate decision.

Validation: 217 admin backend tests passed. The 148-test frontend regression run
passed, followed by the additional execution-confirmation test. Final focused UI checks, lint, TypeScript and production build passed. No migrations or real refunds were run.
PostgreSQL concurrency and authenticated staging verification remain pending.
Next: independently reviewed disposition of the remaining held balance.

### Implemented: remaining-balance assessment

Confirmed policy: staff may propose returning the remainder to the rider or
settling with the traveler using the original booking fee percentage. Both will
require separate independent approval. The original rate is now snapshotted for
new wallet bookings; absent historical rates block traveler settlement instead
of using today's settings or guessing from a rounded fee.

The case screen now assesses either outcome using audited server calculations.
It verifies the executed partial proposal, original debit, refund credit,
remaining hold and case/ride eligibility before showing allocations. Invalid
records show blockers. The assessment does not approve or execute a settlement;
funds remain held. All 221 admin backend tests passed. No migrations or actual
fund transfers ran. Next: separate remainder proposal, approval and execution,
with staging/database checks still required.

### Implemented: remainder preview, proposal and independent decision

Assigned staff can prepare a five-minute preview for rider remainder refund or
traveler settlement, review all allocations, and submit a separate proposal.
Submission rechecks financial evidence and supports identical retries. Another
authorized staff member can approve or reject; changed allocations or balances
block approval. The UI displays rider refund, traveler payout and platform fee.

Approval does not move money. All remainder execution paths remain disabled
pending dedicated accounting and outcome verification. Original proposal migration
147 adds nullable remainder_allocation; it has not been run. Backend regression:
225 cases passed, followed by the additional passing expiry/session/tamper case.
Next: atomic remainder execution, reconciled case closure, schema deployment and
PostgreSQL/staging validation.

### Implemented: approved remainder execution

Authorized assigned staff can execute an independently approved rider remainder
refund or traveler settlement. The UI shows the complete allocation and requires
an execution reason/confirmation. Identical retries reuse the recorded execution.
Backend locks and rechecks evidence, then commits wallet changes, ledger, audit,
activity and recipient notification together. Other held funds and original fare
allocations are preserved. Financial completion does not change journey status or
close the dispute.

All 229 admin backend tests passed, covering both outcomes, replay, invalid
approvals and simulated write-failure rollback. No real funds moved or migrations
ran. Schema deployment and PostgreSQL/staging verification remain pending.
Next: verify completed remainder ledger chains before allowing separate case
closure; current closure checks continue to refuse these cases.

### Implemented: verified remainder case closure

Eligible ended disputes can now be closed after a verified partial-plus-remainder
refund or traveler settlement. The verifier reconciles independent executed
approvals, exact allocation, original debit, refund credits and payout/hold-release
ledger entries. Missing, duplicated, reversed or altered evidence blocks closure.
Interrupted rides require a recorded passenger exit. Closure still needs its own
independent proposal approval and rechecks evidence when executed.

Closure changes only the case and its audit/proposal record, never wallet balances
or journey status. Readiness and resolved-case labels distinguish remainder
outcomes. 233 admin regression cases passed, plus an added passing end-to-end
closure case covering both outcomes and stale evidence. No migrations or real
financial operations ran; PostgreSQL concurrency and staging validation remain.

### Implemented: distinguish remainder wallet ledger entries

Settlement ledger rows now distinguish remaining-balance refunds, traveler
remainder payouts and payer hold releases with no additional debit. Backend
allowlisting checks participant, type and amount (plus unchanged balances for
hold releases). Unknown contexts remain generic; internal context values are
never returned. Original entry type and pending/reversed/failed status remain
visible. This read-only change does not move funds or certify bank receipt.

Focused backend ledger tests and all four frontend ledger tests passed, along
with frontend lint and production build. Schema deployment and real PostgreSQL
concurrency/staging checks remain pending.

### Implemented: durable manual-review notifications

Manual identity, selfie and vehicle decisions now queue an owner notification in
the same transaction as the review and audit. Identical retries do not duplicate
notices; failed notification persistence rolls back the decision. Generic copy
excludes internal reasons, document paths and reviewer identities. Rejected and
correction-requested outcomes direct users to support for specific help.

The existing notification sweep processes the dedicated verification-review
channel and retries failed delivery without starting ride matching. Successful
entries are not resent. All 245 admin and notification-sweep regression tests
passed, including notification rollback, idempotency and all evidence categories.
No migrations, live pushes or financial operations ran. Consumer eligibility
enforcement, dedicated document correction UX and device delivery checks remain
pending; existing admin delivery inspection remains scoped to journeys.

### Implemented: manual vehicle-review gate at publication and start

Both ride-trip publication paths now share a locked manual-review check. Trip
start rechecks the current locked trip. An approved decision must match the
current vehicle/licence evidence and have a valid expiry after now and the
scheduled departure. Changed uploads, rejected/correction decisions, missing
approval and flagged evidence block these transitions. Review storage failure
fails closed. Reusing uploads does not inherit another trip's approval.

All 319 admin/trip regression tests passed, including publish/start integration,
changed evidence, unavailable review storage, expiry, cancellation races and
rollback. Existing KYC and package-only policy remain unchanged. No migrations
ran: the manual-decision table must be deployed before using these gates.
Remaining: matching/checkout checks for published trips, manual identity/selfie
eligibility, correction UX, and PostgreSQL/device staging validation. Active
journeys are not cancelled and no financial state is changed by these checks.

### Implemented: manual review in matching, acceptance and payment

Discovery excludes trips without current manual vehicle approval using two batch
reads. Acceptance, checkout and final booking check the latest review while the
trip is locked. Invalid approval blocks a new commitment; review storage outages
remain retryable. Final confirmation checks before wallet/escrow writes. The
legacy wallet payment endpoint also enforces the gate. Rider copy does not expose
review details. Existing booked rides and active-journey resolution are unchanged.

Verified provider payments blocked from booking follow existing refund
reconciliation; transient failures remain retryable. 559 related regression tests
passed, plus five legacy-wallet tests after its gate was added and focused
sanitized-error checks. No migrations, live provider calls or refunds ran.
Remaining: manual identity/selfie eligibility, correction UX, schema deployment
and PostgreSQL/device staging verification.

### Implemented: current manual identity and selfie status APIs

Profile and KYC responses expose a safe manual_identity_review summary for the
latest identity and selfie submissions. Both must have current approvals for its
approved flag. Replaced evidence, corrections, expiry and unavailable review data
cannot appear approved. The profile verified badge now uses this combined result
plus its existing trip-count threshold. Legacy provider fields are preserved for
compatibility; this does not synchronize or overwrite them.

Seven new service/API test cases plus existing admin verification tests passed
across five files; syntax and whitespace checks passed. No schema or live-account
changes ran. Remaining: mobile review-status/correction UX and transactional
identity eligibility enforcement. Vehicle approval gates remain as implemented.

### Implemented: mobile identity review-status drawer

The Profile identity-review action now opens the existing custom drawer and reads
the authenticated manual review API. Document and selfie statuses are separate;
missing/malformed responses never fall back to legacy verified flags. Opening,
returning to the foreground and manual refresh recheck status. Stale results are
cleared and superseded requests cannot overwrite newer responses. Closing or
leaving removes listeners and aborts the request. Support opens from the drawer
for submission/correction guidance; a dedicated resubmission flow is not built.

Three component tests passed for malformed status, failed refresh and background
request races, with component lint and profile syntax/whitespace checks. Device
layout/network validation remains pending. No migration or live submission ran.
Next: secure correction uploads and transactional identity eligibility checks.

### Implemented: preserve evidence during identity resubmission

KYC/selfie submission now appends a fresh pending record instead of overwriting
or deleting old reviewed images. Existing verified flags do not block corrections.
New submission and reset of legacy user verification flags commit together under
a user lock. Both images stay private; masked-number validation rejects full ID
numbers in that field. The response exposes only safe pending-submission metadata.

Five new tests cover evidence preservation, atomic rollback, storage failure,
validation and private front/back submission. Existing identity/admin verification
suites also passed (six files), with syntax/whitespace checks. No live uploads or
migrations ran. Orphan media cleanup and submission retry deduplication remain
unimplemented; failures never delete potentially referenced private objects.
Next: mobile correction upload form and transactional identity eligibility.

### Implemented: mobile identity correction uploads

The identity drawer now supports private document and selfie submissions, with
Aadhaar/PAN/licence/passport selection, required front photo, optional back photo,
and local previews. Gallery photos are validated for supported type and a 5 MB
limit. Changing document type clears selected photos. Submissions use the existing
authenticated private endpoints; confirmation requires a returned pending record.
Repeated taps are guarded, and uncertain network outcomes require returning to
review status before another attempt. No native alerts or automatic upload retry
were added. Closing the drawer does not assert that server work was cancelled.

Seven component tests passed for payloads, repeated taps, invalid files, picker
cancellation, uncertain outcomes, refresh and stale reads; component lint passed.
Physical-device picker/layout and multipart integration validation remain pending.
Submission deduplication, orphan-object cleanup and identity eligibility enforcement
remain outstanding. No real documents or migrations were submitted/run.

### Implemented: manual identity eligibility for ride travelers

Current manual identity-document and selfie approval now joins vehicle approval
at ride-trip publication/start and new-booking gates. The latest submissions win;
changed, missing, corrected, rejected or expired reviews block new commitments.
Scheduled departure is included in expiry checks. Legacy KYC flags no longer
exclude manually approved ride travelers; account-active checks remain.

Uploads, identity decisions and transactional gates coordinate on the owner row.
NOWAIT handles conflicting lock order with a retryable response, avoiding waiting
against existing trip locks. Discovery adds two batched identity/selfie reads and
uses the shared validator. Package-only policy and already-booked/active-journey
resolution remain unchanged. No migrations or live payments ran.

577 related regression tests passed, followed by passing focused checks including
an added missing-selfie discovery case and approval despite legacy KYC=false.
Syntax/whitespace checks passed. PostgreSQL concurrency, provider and device
staging validation remain pending. Submission retry deduplication and safe orphan
media cleanup remain outstanding.

### Implemented: latest-content upload replay and safe partial cleanup

Identical image bytes/document details now reuse the latest identity/selfie
submission under the owner lock, without more storage writes or verification
resets. Changed content still requires a new review. Mobile copy distinguishes
reused submissions. Original migrations 023/024 and models add nullable
submission_fingerprint; nothing was migrated. Existing databases require a
controlled upgrade before deploying this code.

If saving a later image fails before any DB insert, fresh files already saved in
that attempt are cleaned best-effort. No historical files or uncertain commit
outcomes are deleted. Seven backend test files and eight mobile tests passed,
plus syntax, lint and whitespace checks. Modeled concurrency is not a PostgreSQL
concurrency test. Protection applies to the latest identical content; durable
request-id replay across intervening submissions and crash-orphan inventory/
cleanup remain outstanding. No real files were deleted or documents uploaded.

### Implemented: durable identity submission replay references

A new identity_submission_requests table binds each supplied request ID to owner,
category, content and record. Replays remain stable after newer submissions;
changed payloads cannot reuse an ID. Alias requests matching latest content are
also recorded. Mapping and submission share a transaction. Migration 149 creates
this new table; it has not been run. Earlier fingerprint fields are still required.

The mobile form reuses its request ID for explicit retry after uncertain network
outcomes; changes to photos/type use a new ID. It does not automatically retry.
Seven related backend test files and eight mobile tests passed, plus lint/syntax
checks. Real PostgreSQL concurrency and device validation remain outstanding.
Request IDs are retained within the form session, not across closure/app restart;
older clients without IDs retain latest-content deduplication. Safe crash-orphan
inventory/cleanup and deployment validation remain pending. No live uploads ran.


### Active module: Staff Access — 20 October 2026

Work is now organized by full module. Keep Staff Access active until its remaining
flows are covered; do not switch to isolated work in other modules.

Implemented owner-assisted recovery with identity confirmation, reason, recent
owner login, locked revision checks, atomic credential/session/challenge revocation
and audited 30-minute activation links. New password and MFA enrollment are required.
An interactive server-console recovery procedure exists solely for the one active
owner; it is not exposed over HTTP and has not been executed.

User approved assigned-state access requiring BOTH journey endpoints, with owners
retaining all-India access. Team forms now assign states/union territories. Original
migration 145 and staff model add assigned_states; this schema change is NOT applied.
Operations staff can inspect scoped trip/ride lists and direct IDs; missing/unknown
location country/state data fails closed. Other operational permissions remain
ungranted until their linked-record scope enforcement is implemented.

Still required within this module: support/finance/verification/safety/analyst
permission coverage with linked-record scopes, self-service authenticator replacement,
and PostgreSQL/authenticated acceptance. Staff Access is not complete. Recovery,
region and auth regression tests plus frontend lint/build pass; no live reset ran.

The prior local identity orphan inventory is also implemented and tested read-only;
cloud inventory and any separately authorized cleanup remain outstanding.

### Staff Access continuation — authenticator replacement

Self-service replacement is implemented: fresh current password/TOTP proof, a
five-minute session-bound challenge, then proof from the new authenticator before
switching. Confirmation rotates backup codes and revokes other sessions atomically
with audit. Setup cannot be used as a login challenge. Original migration 145 adds
AdminChallenge purpose; not applied. This supersedes the self-service replacement
pending item above. 54 backend and 18 frontend cases passed; lint/build passed.

Next work remains within Staff Access: apply regional permissions and linked-record
enforcement to support, finance, verification, safety and analyst workflows before
enabling those roles. Live PostgreSQL and authenticated acceptance are still needed.

### Staff Access continuation — scoped finance reads and tracking

Finance can now inspect recorded payment queues/details and journeys within assigned
states. Both ride endpoints and Indian country metadata are checked before payment
pagination/counts or direct-record disclosure; other filters cannot replace scope.
Operations can inspect the existing live-trip freshness queue with both trip endpoints
scoped before location reads. Owners retain global access. Refund execution, settlement
and staff-management access remain denied to finance. No provider call or live action.

32 targeted backend tests passed, covering query generation and HTTP role boundaries.
Live PostgreSQL validation remains outstanding. Continue Staff Access: scoped case,
verification, analyst and financial-action permissions are still pending.

### Staff Access continuation — regional case visibility

Support now reads scoped case queues/activity/descriptions/outcomes; safety also
reads audited evidence summaries. Scope requires all four endpoints of the case's
ride and linked passenger/mixed trip to fall within assigned Indian states, with
known country metadata. Lists/counts and all direct case reads enforce scope before
returning records. Owner access is unchanged. Read-only case users no longer issue
assignment requests or see assignment controls.

21 backend and 16 frontend tests passed; lint/build passed. No database migration,
live case action or financial operation ran. Staff Access remains in progress:
regional assignment/mutations, verification, analyst and financial-action coverage
still need implementation, followed by live database/authenticated validation.

### Staff Access continuation — regional case assignment

Support/safety can claim and release their own in-scope cases and inspect scoped
assignment history. Mutations recheck locked staff permissions, session and current
states. Owner-only reassignment/recovery is enforced server-side. Owner candidate
lists filter recipients' region eligibility before counting/pagination, and transfer
execution rechecks the locked recipient's current access. Existing version/reason,
audit and rollback safeguards remain. Losing regional access requires owner handling
of an outstanding assignment; it does not permit out-of-scope release/read access.

21 backend tests and 13 frontend assignment tests passed. No live case, migration or
payment operation ran. Staff Access is not complete: regional verification, analyst,
financial-action access and live PostgreSQL/authenticated acceptance remain.

### Staff Access continuation — regional vehicle/licence verification

Confirmed policy: identity documents/selfies remain owner-only, explicitly forbidden
for regional reviewers at list/media/history/decision APIs. Verification staff now
review vehicle/licence evidence for passenger/mixed trips whose two endpoints are
within their assigned Indian states. List pagination, images, history and decisions
share the scope; decisions recheck locked staff access. Existing viewed-evidence,
revision/expiry/fraud and transactional audit/outbox safeguards remain.

Regional UI defaults to vehicles, hides identity tabs, avoids inaccessible People
links and removes incompatible identity-status filters. 28 backend and 10 frontend
tests passed; lint/build passed. No live review, storage, notification or migration
operation ran. Staff Access remains active: analyst and scoped financial-action
permissions and live database/authenticated validation are still pending.

### Staff Access — implementation complete; rollout acceptance pending

Completed the remaining analyst and regional financial permissions. Analysts receive
scoped overview totals/journey reads; both endpoints are filtered before aggregation,
and the frontend labels the scope and resets old snapshots when assignments change.
Finance receives scoped case assignment, financial review, assessments, signed
previews, proposals, independent approval, wallet full/partial refund, separate
remainder decisions and closure. All related financial reads check case scope;
mutations recheck current locked staff/session permissions before linked money reads.
Existing money conservation, assignment, approval, version, idempotency and rollback
rules remain. Losing regional access also denies retries of prior actions.

Role boundaries: owner global; operations scoped journeys/tracking; support scoped
cases/assignment; safety additionally evidence summaries; verification scoped vehicle
and licence review; finance scoped payment/case workflows; analyst scoped overview
and journeys; auditor audit history. Identity/selfies, People, global wallet ledgers,
settlement queues, master-data writes and reassignment remain owner-only. Regional
finance permissions do not add provider-refund capabilities or bypass original
booking fee/remainder policies. See backend docs/admin-access.md for the full matrix.

Validation: 284 backend admin tests and 165 frontend tests passed. Frontend lint,
TypeScript and production build passed. No migration, live PostgreSQL, provider,
account recovery or financial operation was executed. Prepared original-migration
changes are still unapplied. Staff Access implementation is complete for the agreed
first-release scope; launch acceptance still requires schema rollout, authenticated
role/MFA/recovery checks, real PostgreSQL scope and concurrent revocation tests.
Do not interpret this entry as all admin modules or launch readiness being complete.

### Audit History module — 20 October 2026

Implemented the first-release read-only investigation flow: exact action/actor/event
filters; related subject, case, ride, trip, proposal, escrow, execution, decision and
request UUID search; inclusive India-local date ranges; stable newest-first paging;
filter preservation and reset; empty/error states; event identities and expandable
recorded reasons/before-after/approval metadata. No new historical values are invented.

Admin HTTP requests receive server-generated X-Request-ID values, isolated across
async work. New audit rows created through the model attach that ID in metadata;
legacy and server-console records may have none. Request references are searchable.
Displayed audit metadata redacts credential fields and bounds unusually large/deep
values; IP addresses are excluded from the response. Stored evidence is unchanged.
Normal ORM update/delete paths reject audit modification. There are no audit mutation
or export endpoints. Owners and auditors retain access; other roles cannot read it.

This completes the first-release audit browsing/search implementation. Validation
and deployment limits: fixture/HTTP/model-hook tests do not establish PostgreSQL
permissions, tamper-proof retention, backups, or historical audit completeness.
Privileged SQL can bypass ORM safeguards. Production database grants and retention/
backup policy require deployment validation. Bulk exports remain outside this release;
no live audit events, schema changes, or production operations were performed.

Audit validation: 291 backend admin tests and 168 frontend tests passed; every staff
role's HTTP audit boundary was checked. Frontend lint, TypeScript and production
build passed. Live PostgreSQL/authenticated acceptance remains outstanding.

### Journey Overview reporting module — 20 October 2026

Implemented scheduled-date and state filtering with consistent trip/ride drill-downs.
Overview reuses journey date predicates: scheduled trip departure in IST and requested
ride date. Counts describe current recorded status, not status at a historical date.
State choices are limited to accessible states, both endpoints must qualify, and
server checks prevent query filters from widening a staff member's access. The
journey list preserves the applied state filter and exposes an explicit clear action.

Linked summaries cover searching rides, payment-pending rides, disputed rides and
flagged trips, alongside full status distributions. Unknown statuses remain visible;
errors remain unavailable rather than becoming zero. Every summary/list link retains
dates and state. Empty results and filter reset are handled. This is journey overview
reporting; combined financial exception, case backlog, verification and GPS metrics
remain sourced from their own modules and are not inferred from journey status.

Validation: 294 backend admin tests and 170 frontend tests pass; lint, TypeScript and
production build pass. No database migration or live mutation ran. Real PostgreSQL
and authenticated browser acceptance remain outstanding.

### Live Operations — recorded evidence inspection (20 October 2026)

Implemented an audited inspection workflow for owner/operations staff. A reason is
required before reading precise samples. The backend checks both journey endpoints
and passenger/mixed-trip scope first; unknown/out-of-scope references disclose no
coordinates. Server-time presets cover30 minutes,2 hours or6 hours; fixed UTC bounds
and25-row pagination prevent unbounded history reads. Invalid positions/headings are
unavailable, genuine zero coordinates/headings remain valid, and GPS freshness stays
separate from app heartbeat. Accuracy is explicitly unavailable in stored samples.

UI supports inspect/close, fixed-window paging, clear errors and no-data states;
pending/late responses cannot repopulate a closed inspector. Precise evidence is not
automatically polled. Every successful page is audited before returning data. Only
owners/operations receive tracking.evidence.read. No external map/provider call,
schema change or trip mutation was introduced.

Validation:299 backend admin tests and174 frontend tests pass; lint, TypeScript and
production build pass. Live PostgreSQL/authenticated acceptance is outstanding.
This completes recorded-evidence inspection, not the whole Live Operations roadmap:
live map, route playback and operational intervention workflows remain pending.

### Live Operations — recorded-sample playback

Added chronological playback to the reason-gated location inspection. The loaded
page has play/pause, restart, previous/next and timeline scrubbing with IST timestamps.
A local coordinate preview plots actual samples; it is not a road map or a claimed
traveled route. Invalid samples are omitted with a count, zero/stationary coordinates
remain valid, and recording gaps or implausible jumps are not connected. No external
map request or interpolation of missing GPS positions occurs. Display discontinuity
rules do not alter backend GPS safety, matching or financial decisions.

Playback advances one record per second, pauses in hidden tabs, stops at the end,
and cleans up on close/unmount. Paging starts a new player for that bounded page;
this is not full-trip history playback. Precise evidence remains behind existing
region/permission/reason/audit checks. Live street-map integration and operational
intervention workflows remain pending.

Validation:183 frontend tests across44 files pass, including chronological ordering,
zero/invalid coordinates, gaps, date-line/polar bounds, scrubbing, end/restart behavior,
background pause and timer cleanup. Lint, TypeScript and production build pass.
No backend behavior, database data or provider configuration changed. Authenticated
browser and live PostgreSQL acceptance remain outstanding.

### Live Operations — full-window playback

The evidence inspector can now load every sample in the already-selected time window
for continuous playback without page boundaries. It retains permission, regional
scope, reason and transactional audit checks. Complete-window mode is limited to
1,000 records and six hours; oversized recordings return an explicit error with no
partial payload. Staff can choose new 5/15-minute presets or use paged inspection.
The player labels the complete selected window, hides page controls and allows a
return to paged inspection. Failed loads remove prior evidence. No samples are
silently dropped and no missing positions are interpolated.

Validation: 301 backend admin tests and 185 frontend tests passed; lint, TypeScript
and production build passed. No schema, live data or provider changes were made.
A complete selected window is not necessarily a whole trip. Live street maps,
longer historical journey selection and intervention workflows remain outstanding,
along with real PostgreSQL/authenticated acceptance.

### Live Operations — historical journey inspection

Authorized staff can open recorded-location inspection from trip details, including
completed trips. Evidence permission is required and opening the form never fetches
coordinates automatically. The backend still checks passenger/mixed trip type and
both endpoints before disclosure. Historical date/time inputs explicitly use IST,
independent of browser timezone, with strict calendar and six-hour-window validation.
Server checks still reject future windows and oversized complete-playback requests.
Staff can inspect adjacent windows for longer trips; no full-trip completeness is
implied by a selected window. Latest GPS/heartbeat labels describe current snapshots,
while the sample table and playback use the selected historical bounds.

Validation: 302 backend admin tests and 191 frontend tests pass; frontend lint,
TypeScript and production build pass. No migration, live GPS read or trip mutation
was performed. Live street maps, intervention workflows and live authenticated/
PostgreSQL acceptance remain pending.

### Live Operations — recorded street-map playback

Authorized recorded-location inspection now offers an explicitly opened Google
street map alongside the coordinate preview. The selected recorded sample updates
without recreating the map; staff can center it explicitly. Recording gaps remain
unconnected. Blue lines represent recorded samples, not verified road directions,
and the marker is not described as a live traveler position. Closing the view
removes overlays and ignores late loader responses. Missing configuration,
authorization errors, provider failures and a 15-second loading timeout retain
the coordinate preview.

Configuration uses a separate public VITE_GOOGLE_MAPS_BROWSER_KEY restricted to
admin website origins and Maps JavaScript API. No server key was copied, no cloud
configuration changed, and no actual Google request was verified. Deployment must
configure the key, API/billing access and any hosting CSP needed for Google Maps.

Validation: 197 frontend tests across 46 files pass, including map initialization,
gaps, marker changes, centering, teardown, authorization failure and timeout cases.
Frontend lint, TypeScript and production build pass. Backend behavior is unchanged;
its prior 302-test result was not rerun for this frontend-only change. Live location
polling on a map, intervention workflows and authenticated/PostgreSQL/provider
acceptance remain pending. This completes recorded street-map integration only.

### Live Operations — opt-in active-trip location viewing

Live operations now offers a separate reason-gated live view for active passenger
trips. Each 30-second refresh uses the existing server-scoped, permission-checked,
transactionally audited inspection endpoint. There is no automatic coordinate read
when opening the form. One request runs at a time with a 15-second network timeout.
Hidden tabs abort pending reads and clear precise evidence; returning refreshes it.
Explicit stop, close, permission loss and terminal trip status stop polling. A failed
read clears evidence and requires an explicit restart rather than retrying forever.

Only the newest sample is considered; missing, invalid, future or over-60-second
positions do not show a current marker. Freshness ages locally between snapshots.
The map is labelled as a periodically refreshed reported location, not continuous
tracking or proof of presence. Map marker changes preserve the staff viewport;
centering is explicit. Without the browser map key, authorized reported coordinates
remain available. Existing historical inspection/playback stays separate.

Validation: 205 frontend tests across 47 files pass, including explicit start,
permission denial, polling, failure, terminal status, stale GPS, visibility pause,
abort/late response and map viewport preservation. Lint, TypeScript and production
build pass. No backend or schema changes; prior backend tests were not rerun.
Restricted Google browser-key setup and real authenticated/provider/PostgreSQL
acceptance remain pending. Intervention workflows remain the next Live Operations
work item; the complete module is not yet declared launch-ready.

### Live Operations — journey-to-case handoff (21 October 2026)

Staff with case-read permission can open cases for a selected active trip from Live
Operations, or for a trip/ride from journey details. Support and safety staff can
use journey details without receiving live-location permissions. No roles were
expanded. Case search now accepts exact T/R public references, normalizes them,
validates numeric bounds and combines them with status/assignment filters before
pagination. Regional case restrictions remain mandatory; unknown or inaccessible
references do not fall back to an unfiltered queue. Case inspection/back navigation
retains journey filters. Clearing journey filters preserves other queue filters.

Existing assignment, evidence and resolution services remain responsible for case
actions. No journey status, passenger-exit confirmation, payment or notification
is changed by this handoff. Missing GPS alone is not grounds for intervention.
This completes navigation into existing case workflows, not new intervention
creation, forced cancellation or safe-exit actions. Those remain pending along
with live authenticated/PostgreSQL acceptance and Maps provider setup.

Validation: 306 backend admin tests and 210 frontend tests across 47 files passed.
Lint, TypeScript, production build and backend diff whitespace checks passed.
No migration or live database operation was performed.

### Case operations — assigned-staff follow-up notes (21 October 2026)

Case details now provide explicit reason-gated reading and append-only staff
follow-ups for contact attempts, reported observations and next steps. Notes are
stored as case-linked audit events; no new schema is required. Writes recheck
active MFA staff/session, regional case scope, open/waiting status and assignment
to the writer under locks. Identical retries replay using an operation UUID;
conflicting reuse is rejected. Reads are paginated and audited before disclosure.
The general audit projection redacts note bodies so it cannot bypass case scope.

The UI retains the same request ID on failed-save retries, clears drafts only on
success, hides failed reads and aborts pending work on close. Notes do not send
participant messages, confirm safe exit, change trip/ride status, freeze/release
money or imply verified facts. Passenger safe-exit confirmation remains unchanged.
Resolved cases permit history reading but reject new notes. Staff must claim the
case before writing; existing assignment controls handle that process.

Validation: 312 backend admin tests and 214 frontend tests pass, including HTTP
permission boundaries, regional predicate retention, invalid input, inactive
sessions, assignment/status rejection, retries, audit failure, audit redaction,
UI failure and unmount behavior. Lint, TypeScript, production build and diff
whitespace checks pass. No migration or live database operation was performed.
New staff-created incident cases and exceptional safe-exit interventions remain
pending; this completes internal follow-up recording for existing cases only.
Authenticated database acceptance remains outstanding.

### Case operations — staff incident intake (21 October 2026)

Owners, support and safety staff can report a booked ride issue from ride details.
The server rechecks active MFA session and role, locks the ride and trip, and scopes
both ride endpoints and both trip endpoints. Package-only trips are excluded.
A server preview binds the report kind/text to journey status/update/payment-reference
state; confirmation rejects changed context. Audited request IDs prevent duplicate
confirmation retries and reject conflicting reuse. The existing incident service
is reused for eligibility, existing-case reuse/escalation, eligible escrow holds,
matching visibility restrictions and queued participant notices. Staff narrative
is also retained as an internal follow-up, including when an existing case is reused.

Staff actors are attributed through admin audit events, never impersonated as users.
The original migration 144 and model now permit null raised_by for staff-originated
cases; source is recorded in case evidence. Participant API responses use generic
copy for staff-originated descriptions. Passenger safe-exit confirmation and ride
completion/refund actions are unchanged. No direct emergency bypass was added.

Validation: 330 backend admin plus ride-resolution tests and 217 frontend tests
pass; lint, TypeScript, production build and diff whitespace checks pass. These
cover permissions, region predicates, eligibility, preview/stale rejection,
idempotency, existing incident regression behavior and UI confirmation/retry.
Migration 144 was edited in place as requested; no database reset or migration was
run. Existing databases require the nullable-author schema change before this
feature can save staff-originated cases. Authenticated PostgreSQL, participant
notification delivery and device acceptance remain outstanding. Exceptional
staff-assisted safe-exit intervention remains pending.

### Case operations — passenger-exit evidence review (21 October 2026)

Case details now offer explicit, reason-gated passenger-exit review under existing
case-description permission and regional scope. A repeatable-read snapshot checks
the linked ride and recorded exit timestamp; the audit write must succeed before
returning evidence. The UI distinguishes awaiting passenger confirmation, confirmed
exit, non-applicable cases, review-required non-onboard states and inconsistent
records. Mismatched trip links, future/invalid timestamps and an onboard ride with
an exit timestamp require investigation. No missing GPS inference is used.

This is a read-only review: no seat release, status change, trip completion or
payment mutation. Failed refreshes clear prior evidence; access remains explicit.
The outstanding product-policy question is whether direct passenger confirmation
outside the app may be recorded by safety staff and approved by a different owner
or safety staff member. The user subsequently approved this policy; see the assisted-exit implementation
record below.

Validation: 322 backend admin tests and 220 frontend tests pass; lint, TypeScript,
production build and diff whitespace checks pass. No schema or live data changes.
Live authenticated/database acceptance remains pending. Earlier backend totals
including ride-resolution tests used a broader test set and are not comparable
as counts; this turn ran the admin suite.

### Case operations — independently approved assisted exit (21 October 2026)

User policy accepted: direct passenger confirmation outside the app may be recorded
and independently approved. Owners/safety staff can propose phone or in-person
confirmation only for an assigned open/waiting safety/interruption case with an
onboard ride. The proposer must attest to direct passenger contact; GPS/traveler
statements are not valid methods. A different owner/safety staff member approves or
rejects with a reason. The UI displays the consequences before approval.

Implementation freshness default: direct confirmation must be within 30 minutes
both at proposal and approval. Proposals bind the case, ride state and seat counts;
changed records require a new confirmation. Each request rechecks active MFA session,
role and regional case scope. Approval locks ride, trip and case in participant
transition order, validates seat counts, records a durable decision and replays
identical retries without a second seat release. Rejected proposals cannot later be
approved. Proposal reads are audited; the UI shows the latest 25, own/stale proposals
cannot be approved, and internal narrative is redacted from general audit listings.

The shared passenger-exit transition records exit, changes the ride to disputed,
releases its seats once and queues notices to both participants for staff-assisted
confirmation. It neither completes the trip nor settles/refunds frozen funds. Staff
proposal/approval provenance is retained in case evidence and audit records. Pending
proposals become stale if the passenger confirms exit independently. No extra schema
was required for this workflow; prior staff-intake migration prerequisites remain.

Validation: 340 backend admin/ride-resolution tests and 224 frontend tests pass.
Lint, TypeScript, production build and whitespace checks pass. A test-file editing
mistake was restored from its recorded creation/subsequent edits before the final
backend pass. No live DB or participant messages were executed. Authenticated
PostgreSQL concurrency, queued-notification delivery and device acceptance are still
required before launch; fixture tests do not establish those results.

### Assisted-exit proposal withdrawal (21 October 2026)

Completed proposer-only withdrawal of pending exit confirmations with a required
reason and immutable audit decision. Retries are safe; approved/rejected proposals
cannot be withdrawn, and withdrawn proposals cannot be approved. Withdrawal leaves
ride state, seats and funds unchanged. The server prevents duplicate current
undecided proposals while allowing replacement after withdrawal, rejection or stale
confirmation/context. The UI shows withdrawal only for the author's pending entries.

Validation: 343 backend admin/ride-resolution tests, 226 frontend tests, lint and
TypeScript/production build pass. Live PostgreSQL concurrency and notification
delivery remain acceptance work; no live financial or participant actions ran.

### Assisted-exit history and decision evidence (21 October 2026)

Implemented paginated proposal history, replacing the latest-25-only limitation.
Older pages use validated timestamp/ID cursors with deterministic ordering and
repeat scoped, reason-gated audited access. Reviewers see decision reasons and IST
timestamps without raw staff identifiers. Failed reads clear prior evidence and
paging controls; completed proposals remain non-actionable.

Validation: 345 backend admin/ride-resolution tests, 228 frontend tests, lint and
TypeScript/production build pass. No live database or participant actions ran.
Database concurrency and notification delivery acceptance remain outstanding.

### Assisted-exit review queue (21 October 2026)

Completed owner/safety-only case filters for undecided exit proposals and proposals
by other staff. Filtering occurs before count/pagination and retains regional,
journey, status and assignment constraints. Every read is audited. UI filters
reset pagination and persist through case inspection. Old undecided proposals are
visible for cleanup; the queue explicitly does not imply approval eligibility.
Current journey/freshness checks remain at decision time.

Validation: 348 backend admin/ride-resolution tests, 229 frontend tests, lint and
TypeScript/production build pass. No schema or live data changes. Production query
performance, database concurrency and actual notification delivery require live
acceptance.

### Passenger-exit confirmation source and refreshed review (21 October 2026)

Implemented recorded-source verification in exit review: passenger-linked activity
for app confirmation, or staff-source activity plus distinct staff identities and
matching proposal/approval audit records for assisted confirmation. Missing source
evidence stays explicitly unverified; no raw identities are exposed. Successful
assisted-exit actions now refresh the case and clear older evidence snapshots with
a persistent outcome notice. Failed writes never display a success refresh.

Validation: 349 backend admin/ride-resolution tests, 231 frontend tests, lint and
TypeScript/production build pass. No live data or schema operations. Live database
concurrency, authenticated acceptance and notification delivery remain outstanding.

### Case operations — scheduled staff follow-ups (21 October 2026)

Completed reason-gated review, set and clear of staff follow-up due times, plus
scheduled/overdue queue filters. Open/waiting cases require the current assignee,
active MFA session, server permission and regional scope. Version checks and
operation IDs protect concurrent updates/retries. Append-only schedule history
preserves cleared entries. Due dates are entered in IST and must be future within
30 days; this bound is not an automatic expiry/SLA policy. Closed cases and latest
cleared schedules do not appear in reminder queues. No automatic notifications,
ride changes or financial actions are attached to a deadline.

Validation: 355 backend admin/ride-resolution tests, 235 frontend tests, lint and
TypeScript/production build pass. No schema or live data changes. Live PostgreSQL
concurrency/query performance and authenticated acceptance remain outstanding.

### Ride and trip activity reporting — complete implementation (21 October 2026)

Delivered the activity reporting module end to end:

- Dedicated backend aggregate service and GET report / POST export endpoints.
- Owner/analyst permissions; regional endpoint scope; audited reads and reason-gated
  CSRF-protected exports. No participant details in report/export results.
- Inclusive IST created-date filters, 1–93-day bound, optional state narrowing,
  daily zero-filled counts and current-status breakdowns.
- Completed/cancelled summaries with explicit definitions; expired/no-show/refunded/
  ended-early records remain separate. No conversion/revenue inference.
- Functional Activity reports navigation with URL filters, refresh, empty/error/
  access states and CSV download. A new export snapshot can differ from the screen.
- CSV scope/date/basis/timestamp metadata, aggregate daily/status rows, proper
  quoting and no names, contacts, precise positions or journey IDs.

Validation: 361 backend admin/ride-resolution tests, 240 frontend tests, lint and
TypeScript/production build pass. An additional HTTP test rerun checks export CSRF.
No schema/live data changes. Staging PostgreSQL timezone/count/performance checks
and authenticated browser-download acceptance remain.

Module boundary: activity reporting is implemented. Historical conversion funnels,
route-demand analysis, financial aging/reconciliation, large asynchronous row exports
and content management remain separate planned work, not delivered by this module.

### Directional route activity — complete implementation (21 October 2026)

Delivered scoped backend aggregation, report screen, filters, pagination and audited
page CSV exports. Ride-request routes and passenger-capable trip endpoints are
separate views. Origin/destination direction is retained; only normalized recorded
city/state/country labels are used. Unknown labels stay visible. Street addresses,
coordinates and participant details are excluded. Alternate spellings are not
automatically merged. Counts include all statuses in the created-date window.

The UI explains that endpoint counts cannot infer availability or unmet demand
because Gilo matches intermediate route segments. Report/export use the existing
owner/analyst permissions, regional endpoint constraints, IST 1–93-day window,
reason-gated export and transaction audit. CSV contains at most the current 25-row
page, clearly labeled with page/scope/snapshot; ranking may change between snapshots.
Navigation links daily and route reports, and handles empty/failure/access states.

Validation: 367 backend admin/ride-resolution tests, 245 frontend tests, lint and
TypeScript/production build pass. No schema or live data operations. Real PostgreSQL
count/performance and authenticated browser acceptance remain staging tasks.
Segment-level demand/supply analysis and historical conversion are not implemented
by endpoint activity reporting; financial analytics remain separate.

### Recorded ride lifecycle — complete implementation (21 October 2026)

Delivered historical event reporting end to end: scoped SQL aggregation, API,
owner/analyst permissions, URL date/state/event filters, daily/category tables,
window totals and audited reason-gated CSV export. IST dates refer to stored event
time, not ride creation or scheduled pickup. Repeated events and distinct ride
counts are displayed separately. Distinct rides are independently deduplicated
per day, event and window; row counts must not be added into a window total.

The report reads only accessible modern ride-request activity, excludes legacy
booking/missing-parent records, zero-fills empty dates and collapses unknown action
text into a curated Other category. No participant details, raw event metadata or
journey IDs are returned. UI handles loading, denied, empty, refresh-failure and
export-failure states, and describes fresh-export snapshots.

Validation: 373 backend admin/ride-resolution tests, 250 frontend tests, lint and
TypeScript/production build pass. No schema/live data operations. Staging PostgreSQL
count/performance validation, logging coverage and authenticated browser acceptance
remain. This completes stored-event reporting; historical cohort conversion and
financial reconciliation are distinct work and are not inferred from these counts.

### Recorded ride cohort conversion — complete implementation (21 October 2026)

Delivered end-to-end cohort reporting: protected aggregate API, scoped IST
creation-date filters, 1/7/30-day observation choices, daily cohorts, milestone
counts/rates, data-gap guidance and audited CSV export. Only rides with a completed
observation window enter percentages; recent rides show awaiting observation.
Recorded booking → start → completion must occur in order inside each ride's
window. Retries do not inflate counts. Zero denominators display unavailable.
Creation cohorts include drafts and the UI states this definition.

Owner/analyst permission and both-endpoint regional rules remain in force. SQL
parameters are bound, response/export contain aggregates only, and failed reads/
exports never present success or stale metrics. Missing histories are not inferred
from current status. All-absent logs cannot be diagnosed; this remains recorded
conversion rather than guaranteed real-world completion or payment reconciliation.

Validation: 378 backend admin/ride-resolution tests, 255 frontend tests, lint and
TypeScript/production build pass. A separate isolated PostgreSQL integration test
with synthetic records verified chronological stages, deduplication, observation
windows, recent cohorts and regional scope; the temporary cluster was removed.
Application databases and user/provider actions were untouched. Representative
volume/performance, real logging coverage and authenticated browser acceptance
remain staging work. Financial reconciliation remains a separate roadmap module.

### Recorded payment/refund aging — complete implementation (21 October 2026)

Payments now links to a finance/owner-only report for local payment attempts:
unconfirmed orders, paid bookings still unresolved, requested refunds and
settlements in progress. Sandbox and production are always separate. Both-endpoint
regional filtering, explicit age/amount definitions, missing-clock buckets,
invalid-amount suppression and refund-attention counts prevent misleading totals.
Audited reads and reason-required CSRF-protected CSV exports return aggregates only.
This does not execute financial actions or claim provider reconciliation; there is
no combined revenue, liability or payout total. Orphan payments are excluded.

Validation: 383 backend admin/ride-resolution tests and 260 frontend tests; lint
and production build pass. Isolated synthetic PostgreSQL testing covers category
selection, age buckets, invalid values, environments and regional scopes. No
application database or provider actions. Production-volume/performance testing
and authenticated browser acceptance remain. Full financial reconciliation remains
separate work; this completes recorded exception aging only.

### Local payment consistency review — complete implementation (21 October 2026)

Delivered the owner/finance review screen, protected API, environment/state filters,
25-row pagination with lookahead, page-only classification counts, and integration
with the existing reason-required evidence inspector. Reuses the existing backend
comparison logic for current order references, participants, method, confirmed fare
and selected confirmation/state conflicts. Historical orders are identified without
comparing them to the ride's current fare; incomplete and missing records are not
reported as healthy. This is a browseable local review, not an exceptions-only
search or provider reconciliation. No financial mutations or provider calls.

Both-endpoint regional restrictions and read auditing apply before disclosure.
Owners alone can inspect orphan orders through their unfiltered scope. Responses
omit raw participant/order references. Refresh errors clear prior comparisons and
inspection; page/filter changes unmount pending reads. Counts describe the current
page, and pagination may shift when new orders arrive.

Validation: 388 backend admin/ride-resolution tests, 265 frontend tests, lint and
production build pass. Disposable PostgreSQL validation exercised paging, historical
orders, amount mismatch, orphan records, environment separation and regional scope.
The temporary cluster was removed; application databases were untouched. Live
provider reconciliation, representative production performance and authenticated
browser acceptance remain separate work.

### Payment review financial evidence — complete implementation (21 October 2026)

Completed the financial evidence layer of the local review queue: amount allocation
checks, refund state/timeline consistency and recorded provider-check diagnostics.
Uses the same backend helpers as the audited inspector. Ride/order comparison
stays separate; historical orders still receive their own financial evidence checks.
Page counts clearly overlap and are not unique-order totals. Expandable sections
explain each finding without raw errors, names or provider/participant references.
Missing evidence is unavailable/incomplete, not zero or healthy. Zero-refund closure,
refund completion and provider availability errors retain their distinct meanings.

Validation: 391 backend admin/ride-resolution tests, 267 frontend tests, lint and
production build pass. Expanded isolated PostgreSQL test checks real amount/refund
fields, overlapping findings, future check time and raw-error suppression along
with existing regional/pagination cases. Temporary cluster removed; no application
DB, provider or financial actions. Local financial evidence review is complete for
these stored fields. Provider reconciliation and release acceptance remain separate.

### Customer support inbox and restricted inspection — implemented (21 October 2026)

Added Support & disputes → Customer support tickets, covering customer-submitted
non-package tickets that were absent from the ride-case inbox. Owner/support have
server-enforced list and inspection permissions. Status/priority/type filtering,
25-row paging, empty/failure states, IST dates and customer-priority qualification
are included. Subject/description/resolution notes require a reason and audited
CSRF-protected inspection; queue responses contain metadata only. Content is bounded
plain text, and pending inspection is aborted/discarded on close or refresh.

Regional staff need both trip endpoints in scope and verified submitter participation
(trip owner or a linked ride with both endpoints in scope). A user-supplied trip ID
alone is not trusted. Unlinked tickets remain owner-only; packages, delivery tickets
and missing-trip references are excluded. No schema changes, provider calls, replies
or customer notifications. Existing ride disputes remain separate.

Validation: 396 backend admin/ride-resolution tests, 272 frontend tests, lint and
production build pass. Disposable PostgreSQL test verifies participant constraints,
trip/ride regional restrictions, owner-only unlinked records and package exclusion.
No application database changes. Ticket assignment, replies and resolution actions
remain separate workflow work; this delivery completes inbox/inspection only.
Production performance and authenticated browser acceptance remain release checks.

### Support ticket ownership — implemented (21 October 2026)

Added claim, own-release and owner return-to-queue with required reasons, fresh
active-MFA/session checks, existing regional scope, row locks, assignment version
checks and atomic audit. Open/in-progress tickets only; another staff member cannot
steal an assignment. Owner return supports recovering inactive/legacy ownership.
Queue supports mine/unassigned/other filters, ownership labels, fresh capabilities,
conflict refresh and success-triggered list refresh. Shared-queue handover is
supported; direct transfer to named staff is not part of this delivery.

Validation: 401 backend admin/ride-resolution tests, 276 frontend tests, lint and
production build pass. Isolated PostgreSQL verified concurrent claims, stale writes,
owner return and complete rollback when auditing fails, plus regional access tests.
No application database, notifications or customer status changes were performed.

Schema deployment required: assignment_version added in the original
061-create-support-tickets.js migration and model per the user's pre-launch policy.
No migration/reset ran; existing databases do not gain the column merely from this
file change. Ticket replies and resolution remain pending workflow work. Browser
acceptance and production deployment remain separate checks.

### Support replies, resolution and customer history — implemented (21 October 2026)

Assigned support staff can publish a customer-visible reply or reply and resolve.
Owners can reopen a resolved ticket and return it to the shared queue. Every action
requires current version, operation UUID, internal reason and public message.
Fresh staff/session/region/ownership checks, row locks and atomic append-only
history/audit protect retries and concurrent actions. Identical retries replay the
recorded result, conflicting reuse is rejected. Resolution concerns only the support
ticket; it does not settle money or resolve a ride dispute/safety case.

Admin content inspection now shows recent public history and eligible response
controls. Customer ticket APIs return public projections with paginated updates,
never staff identities or internal reasons. Mobile Help Center → My support tickets
shows the customer's list, ticket details and Gilo replies, with refresh, focus
reload, paging, empty/errors and stale-response protection. Replies are available
in ticket history; push/email/SMS delivery and customer follow-up messages are not
implemented by this delivery. No real messages were sent during testing.

Validation: 406 backend admin/ride-resolution tests, 279 frontend tests, two focused
mobile inbox tests, admin lint/build and targeted mobile lint pass. Expanded isolated
PostgreSQL tests verify simultaneous response retries, audit rollback, resolve/reopen
state and public-field privacy. No application database was touched. Deployment
requires new migration 150-create-support-ticket-updates.js and the previously
updated assignment_version schema. No migrations/reset ran. Authenticated-browser
and real-device acceptance remain; two-way replies and notification delivery remain
separate follow-up work.

### Two-way support conversations — implemented (21 October 2026)

Customers can follow up in Help Center → My support tickets. Ownership is checked
on every request, messages are bounded, and shared ticket versions plus operation
identity protect stale/duplicate submissions. Resolved-ticket replies reopen into
the shared queue, preserving prior resolution history. Active tickets retain their
assignee; closed tickets reject follow-ups. No ride/payment/dispute state changes.

Public history distinguishes customer and Gilo messages without exposing actor IDs
or internal reasons. Admin gains a Customer follow-up filter and visible indicator,
with most recently updated tickets first. Staff reply/resolution clears that flag;
assignment changes do not. It is not an unread or notification-delivery indicator.
Mobile reuses the same operation after uncertain failures and refreshes on success.

Validation: 410 backend tests, 280 frontend tests, 3 focused mobile tests, admin
lint/build and targeted mobile lint pass. Isolated PostgreSQL covers concurrent
customer retries, wrong-owner denial, reopening and clearing the follow-up filter.
The temporary cluster was removed; application data and external messaging untouched.

Deployment requires updated migration 150 author fields (nullable admin actor plus
customer_id, exactly-one-author constraint), edited in the original creation file
per project policy. No migration ran. Push delivery and real-device/browser release
acceptance remain outstanding; implementation of two-way stored conversation is done.

### Support-update notifications — implemented (21 October 2026)

Staff replies/resolutions/reopen notices now enqueue a generic customer notification
atomically with the update and audit. The existing persisted-event worker retries
queued/failed support updates without creating another in-app record or triggering
ride matching. Recipient is the ticket owner; raw public message content, internal
reason and staff identity stay out of the lock-screen payload. Customer replies do
not send a notification to themselves; admin follow-up filtering remains available.

Notification taps (push and in-app list) open the requested support conversation.
Help Center validates the route ID and refreshes when another notice is opened;
customer API ownership checks continue to gate content. Stable notification IDs
reduce duplicate display. Push is at-least-once across crash boundaries, not
exactly-once; provider acceptance is not proof of device receipt or reading. Push
preferences/no-device skips and delivery failures retain their existing meanings.

Validation: 427 backend/admin/notification tests, 280 frontend tests, 4 mobile inbox
tests, admin lint/build and targeted mobile lint pass. Isolated PostgreSQL verified
atomic outbox creation, recipient, duplicate replay and audit rollback. No real push,
SMS/email, application migration or provider request ran. No new schema changes;
prior support schema, automation worker and FCM configuration must be deployed.
Physical-device foreground/background/terminated notification acceptance remains.

### Named support-ticket handover — implemented (21 October 2026)

Owners can assign or transfer an active support ticket directly to an eligible
named owner/support staff member. The paged picker excludes the current assignee
and applies the ticket’s participant and endpoint scope; an empty page can still
have later eligible staff. Staff names/roles are returned without email or regions.

Save rechecks active staff, MFA, owner role, session, ticket state/version and target
scope. Actor/target locks use stable ID order before the ticket lock. A reason and
atomic audit record are required. Concurrent/stale transfers cannot overwrite a
new assignment, and audit failure rolls back ownership. Conversations, ticket
status, payment and customer notifications are unchanged. Claim/release/return
remain available under their existing permissions. No schema changes are needed.

Validation: 431 backend/admin/notification tests, 282 frontend tests, admin lint and
production build passed. Isolated PostgreSQL covered simultaneous transfers,
owner-only unlinked tickets, eligible candidate scope and audit rollback. No
application database or real messaging/provider was used. Browser acceptance and
deployment remain pending; internal staff notes and escalation scheduling remain
separate support backlog work.

### Private support investigation notes — implemented (21 October 2026)

Authorized owners and assigned support staff can append internal notes to active
ride/trip support tickets after inspecting their content. Notes appear in a
separate, clearly private section; they never enter customer update history,
resolution text, notification payloads or public ticket APIs. Inspection retains
its reason/audit requirement and regional/participant scope. The latest 50 notes
are shown with timestamps; older notes remain stored. Notes are immutable through
the API: corrections require a new note. Author identity is retained server-side.

Writes recheck active staff, MFA/session, permissions, ticket scope, ownership and
version under locks. Operation IDs make uncertain-outcome retries idempotent;
changed payloads cannot reuse an ID. Ticket version, note and audit commit together.
Adding a note preserves customer status and customer-follow-up indicators and does
not send a notification, resolve a dispute or change money. Public replies and
private notes have visibly separate composers and endpoints.

Validation: 435 backend/admin/notification tests and 285 frontend tests pass;
admin lint/build and disposable PostgreSQL concurrency, privacy and audit rollback
checks pass. New migration 151 creates a separate support_ticket_notes table;
no existing-table alteration or application migration was run. Deploy this table
before enabling the updated inspection API. Browser acceptance and deployment
remain pending. Older-note pagination and staff escalation scheduling remain
backlog work; this does not claim automated support SLA escalation.

### Complete support history navigation — implemented (22 October 2026)

Admin ticket inspection now offers separately labelled older-history controls for
customer-visible updates and private staff notes. Each request retains the recorded
inspection reason, requires inspection permission/CSRF, rechecks ticket scope and
writes an audit event before returning content. The chosen cursor must belong to
the same ticket and history type. Staff identities and internal operation metadata
are excluded from returned history entries.

Initial inspection and continuation use descending ticket versions. Batches are
limited to 50 with a lookahead, so identical timestamps and concurrent new entries
do not shift older pages. The browser appends plain-text entries, guards repeated
clicks, aborts on close, and clears additionally loaded content after a failed
continuation. Existing customer APIs and notifications are unchanged.

Validation: 438 backend regression tests, 288 frontend tests, lint/build and isolated
PostgreSQL checks passed. PostgreSQL retrieved 105 same-timestamp notes exactly once
while a new note arrived, and rejected foreign-ticket/type cursors and regional
access. No application migration or provider request ran. No additional schema is
needed beyond the existing support tables (including pending migration 151).
Browser acceptance/deployment remain pending; staff escalation scheduling remains
separate backlog work. Older-note navigation is no longer pending.

### Scheduled internal support follow-up — implemented (22 October 2026)

Owners and assigned support staff can schedule, reschedule or clear an internal
follow-up deadline on active tickets after inspection. The date/time input explicitly
uses IST regardless of browser timezone; timestamps are persisted in UTC. Each
change needs a reason, current version, fresh staff/session permission and scoped
ticket access. Atomic audit records preserve previous/new deadlines. Concurrent or
stale changes conflict; an uncertain response requires refreshing before retry.

Queue filters now include overdue, upcoming and unscheduled active tickets, with
deadline queues ordered earliest first. Deadlines are evaluated when the queue is
read/refreshed. Resolution/reopening clears them; transfer and normal replies keep
them. Customer status, notifications, payments and journey state are unchanged.
This is manual follow-up scheduling and overdue visibility; automatic escalation
notifications and policy-driven SLA assignment remain separate backlog work.

Validation: 442 backend tests, 291 frontend tests, admin lint/build and isolated
PostgreSQL checks passed. Checks cover IST conversion, clearing, stale/concurrent
writes, regional overdue filtering, audit rollback and resolution cleanup. The
nullable followup_due_at field was added to original migration 061, per policy.
No application migration or reset ran. Existing databases must receive that schema
change before deployment; changing an applied migration alone does not apply it.
Browser acceptance and deployment remain pending.

### Staff priority triage — implemented (22 October 2026)

Owners and assigned support staff can review priority on active tickets after
inspection, with a mandatory reason. Customer priority is preserved separately.
Admin display and priority filtering use staff_priority when set, otherwise the
customer report. Resetting the override restores the customer value. The UI marks
staff-reviewed vs customer-reported values and displays the original report.

Writes recheck fresh staff/session permission, regional scope, assignment, active
status and ticket version under locks. Before/after priority, customer priority and
reason are audited atomically with the change. Stale or concurrent reviews cannot
overwrite newer work. Deadlines, customer status, public messages, notifications,
journeys and money are unchanged. Urgent priority alone does not open a safety case
or trigger escalation; automatic escalation notifications remain pending.

Validation: 446 backend tests, 294 frontend tests, admin lint/build and disposable
PostgreSQL checks passed, covering override/reset filters, preserved customer
priority, region restrictions, concurrent reviews, audit rollback and UI errors.
The nullable staff_priority column was added to original migration 061 per policy;
no application migration/reset ran. Existing databases require schema deployment
before enabling this code. Browser acceptance and deployment remain pending.

### In-app overdue support alerts and acknowledgement — implemented (22 October 2026)

The support queue now displays a scoped count of unacknowledged overdue follow-ups
and links to the corresponding queue. It refreshes every minute while the page is
visible and on focus/visibility return. Failed refresh removes stale counts and
shows an unavailable state. This is in-app polling while support is open, not an
email/push delivery service or background notification guarantee.

Owners or assigned support staff may acknowledge an overdue active ticket after
inspection, providing a reason and current version. The action rechecks live
session/staff/scope, assignment, deadline and previous acknowledgement under locks.
Acknowledgement/version/audit commit together; concurrent/stale attempts conflict.
Acknowledged tickets stay overdue and open, but leave the unacknowledged alert
count. Rescheduling/clearing and resolve/reopen reset acknowledgement. Future and
terminal tickets do not alert. No customer message or money/journey change occurs.

Validation: 451 backend tests, 297 frontend tests, admin lint/build and isolated
PostgreSQL checks pass. Coverage includes regional counts, audit rollback,
concurrent acknowledgement, filter agreement, reschedule recurrence, resolve
exclusion, refresh failure and UI acknowledgement errors. Nullable
followup_acknowledged_at was added to original migration 061 per policy. No
application migration/reset or real notification was run. Schema deployment and
browser acceptance remain pending. External staff notification channels and
policy-driven automatic escalation remain separate backlog work.

### Support operational action history — implemented (22 October 2026)

Ticket inspection now includes an on-demand staff action history covering ownership,
customer responses, internal note creation, deadline changes, acknowledgement and
priority reviews. It displays action/time/reason plus relevant before/after values,
separately from customer messages and private note text. Actor display distinguishes
"you" from Gilo staff; raw staff identities and unfiltered audit metadata are not
exposed. This is recorded staff activity, not a reconstruction of unaudited legacy
changes or a replacement for customer conversation history.

History requests require inspection permission, CSRF, a reason and scoped ticket
access. Each read is audited before disclosure. Batches of 25 use numeric ticket
version cursors, starting at the inspected version; newer actions cannot shift
older pages. Malformed legacy JSON versions are excluded safely. Read audits do not
appear as staff mutations. Closing the inspection aborts pending requests; failed
continuation clears loaded operational history and offers a fresh retry.

Validation: 454 backend tests, 300 frontend tests, admin lint/build and isolated
PostgreSQL checks pass. Database coverage retrieved 55 actions exactly once across
pages while a new action arrived, checked regional denial, malformed versions and
metadata projection. No new schema, application database change or real provider
request occurred. Browser acceptance/deployment remain pending; external staff
notification channels and automatic escalation policies are still separate work.

### Verified support-to-journey navigation — implemented (22 October 2026)

After ticket inspection, authorized staff can request verified trip and customer
booking links. Both support inspection and journey-read permissions are required.
A submitted trip ID is not trusted alone: the customer must be its traveler or a
passenger on that trip. Trip and passenger endpoints are independently scoped.
Only this customer's bookings are listed; other passengers are not enumerated.

The response exposes public references, status labels and navigation IDs, not
contacts, amounts or full journey data. Missing/unverified links have an explicit
empty state. Reads require a reason and audit before disclosure. Booking links
paginate in bounded batches by ID; this is not a chronological order. Following a
link uses the existing journey page and its independent access checks. No booking,
payment or ticket state changes occur. General tickets without trip associations
remain unlinked; this does not infer a trip from names, phone numbers or text.

Validation: 458 backend tests, 303 frontend tests, admin lint/build and disposable
PostgreSQL checks passed. Coverage includes traveler/passenger association,
unrelated submitted trip IDs, cross-region passenger endpoints, restricted field
projection, CSRF, failed pagination and safe links. No schema change, application
migration or real provider request ran. Browser acceptance/deployment remain
pending. Ticket attachments and external staff notification channels remain
separate work; existing journey/payment access rules have not been broadened.

### Scoped support workload overview — implemented (22 October 2026)

The support queue now offers an on-demand workload overview with current status
counts, reviewed/customer urgent priority, latest customer follow-ups, unassigned
work, overdue deadlines and unacknowledged overdue work. Cards link to the exact
matching queue filters. Labels distinguish all-status counts from active overdue
counts and explain that categories overlap. Unknown statuses are counted explicitly
rather than silently classified as open. The snapshot covers all accessible tickets,
independent of queue filters; it does not claim historical SLA or response times.

A single aggregate query uses existing ticket region/participant scope in a
repeatable-read transaction. Reads are audited before returning aggregate-only
results. No customer text or contact data is included. Failed refresh clears stale
metrics and shows an unavailable state. No background notification or mutation is
triggered by viewing the report.

Validation: 461 backend tests, 306 frontend tests, admin lint/build and isolated
PostgreSQL checks passed. Real database tests compare report counts with queue
filters, validate status totals, regional/empty scope and unknown status handling.
UI tests cover queue links and failed refresh. No schema or application database
changes were made. Browser acceptance and deployment remain pending. Attachments,
external staff notification delivery and historical support SLA instrumentation
remain separate work.

### Validated customer support intake — implemented (22 October 2026)

The mobile support inbox now offers New support request, with category, priority,
subject and details. Successful submission opens the saved conversation. Required
lengths, pending-state controls, inline errors and request identity make normal
retries safe. The same unchanged form reuses its operation UUID after an uncertain
response; double taps cannot dispatch twice. Draft/request identity is in memory,
not persisted across app restarts, so after leaving the form users should inspect
My support tickets before creating another request. General inbox requests are
unlinked; no journey is inferred from text.

A dedicated backend intake service validates types, priorities, UUID references,
lengths and control characters, rejects staff-controlled/unknown fields, and checks
trip traveler/passenger association. Existing package references are accepted only
for their sender or assigned traveler; no package UI was added. Creation returns
an explicit public projection instead of the complete ORM model. Optional operation
IDs preserve compatibility for older clients; only clients supplying an ID receive
idempotent creation. A user-row lock and unique user/operation index serialize
concurrent retries, and changed content cannot reuse the same ID.

Validation: 465 backend tests, 7 mobile support tests, targeted mobile ESLint and
isolated PostgreSQL checks pass, including simultaneous duplicate creation,
reference ownership, changed-payload conflicts, lost-response retry and unmount.
The original migration 061 now includes nullable creation_operation_id and
creation_request_hash plus a unique user/operation index. No application migration
or reset ran. Schema deployment is required before this backend code. Device
acceptance, persistent drafts, attachments and external staff delivery remain
separate work. The admin frontend was unchanged by this intake implementation.

### Mobile support submission recovery — implemented (22 October 2026)

Submitted support requests now persist in account-specific device-only Keychain
storage before the network call. Reopening restores the same operation ID and
payload; retry recovers the existing ticket without automatic sending. Uncertain
submissions cannot be edited into another request. Definite validation rejection
unlocks correction. Storage failures prevent sending and confirmation clears the
record. Pending records survive sign-out for the same account; other accounts
cannot access them through the form. Unsubmitted drafts and reply drafts remain
in memory. No schema changes or application database operations were needed.

Validation: 11 mobile support/storage tests and targeted ESLint pass. Native
Keychain behavior and actual device restart still need device acceptance. The
admin frontend and backend were unchanged; their suites were not rerun here.

### Mobile support reply recovery — implemented (22 October 2026)

Submitted replies persist securely per account and ticket before networking.
Reopening restores the exact message, version and operation ID without automatic
sending. Uncertain replies stay unchanged for safe retry, even if staff have
closed the ticket since submission. Definite validation/version rejection clears
the operation, refreshes the conversation and preserves text for review. Storage
failures block sends. Confirmed replies clear the saved entry. The inbox remounts
on account changes to isolate conversation state. Pending submissions survive
sign-out for the same account; ordinary unsent drafts remain in memory.

Validation: 16 mobile support tests and targeted ESLint pass. Physical-device
restart and native Keychain acceptance remain pending. No backend/schema changes
or application database operations; backend/admin suites were not rerun.

### Customer support inbox freshness — implemented (22 October 2026)

The mobile support inbox refreshes every 30 seconds while focused, active and
idle, and refreshes on return from the background. Creation, reply composition,
submission and existing reads pause automatic refresh. Navigation/unmount removes
timers and listeners; obsolete reads are discarded. In-flight reply confirmation
can finish when backgrounded so recovery records can be cleared. Manual refresh
remains available. This is visible-screen polling, not external staff delivery or
a guaranteed background notification channel.

Validation: 18 mobile support tests and targeted inbox ESLint pass. Real-device
navigation/background acceptance remains pending. No backend, schema or database
changes were made; backend/admin suites were not rerun.

### Customer Help Center guidance — implemented (22 October 2026)

Removed inert legacy Ordering/Kaou placeholder topics and added eight expandable
Gilo ride/trip support answers: matching, pending requests, unconfirmed payments,
estimated fares, cancellation previews, interrupted tracking, changed trip plans
and support follow-up. Search matches question and answer text, combines with
category filtering and has a clear empty state. Buttons expose accessible
expanded/selected states. Existing ticket entry and notification links remain.
Copy relies on booking-specific statuses/previews rather than fixed refund claims.

Validation: 20 mobile Help Center/support tests and targeted ESLint pass.
Content is app-bundled; admin FAQ publishing/localization remains separate work.
Physical-device visual acceptance is pending. No schema/backend/database changes.

### Help-topic support intake — implemented (22 October 2026)

Expanded mobile help answers offer Contact Gilo, opening intake directly with an
editable subject/category derived from a known topic. Customer details and an
explicit submit are still required; opening help does not send a request. Saved
uncertain submissions take precedence, protecting their original identity and
payload. Unknown topic references leave an empty form; notification ticket entry
wins over topic creation. Returning to help clears the contextual entry.

Validation: 25 mobile help/support tests and targeted ESLint pass. No backend,
schema or database changes. Device visual/navigation acceptance remains pending.

### Customer support live refresh hints — implemented (22 October 2026)

The mobile inbox now consumes existing authenticated socket support_tickets refresh
hints and reconnect events. Relevant events are debounced and trigger protected
API reads; payloads never become displayed conversation content. Detail screens
ignore events for other tickets. Active/idle guards protect drafts and submissions.
Focus cleanup removes screen listeners/timers without disconnecting the shared
socket. Existing manual refresh and 30-second polling survive socket setup failure.

Validation: 27 mobile help/support tests and targeted inbox ESLint pass, including
filtering, coalescing, reconnect, cleanup, draft protection and setup failure.
No backend/schema changes or real notification sends. Device socket acceptance
remains pending; external staff notification channels remain separate backlog.

### Admin support creation-date review — implemented (22 October 2026)

Support staff can filter customer ticket intake by Created from / Created through
in IST, combined with the existing status, priority, ownership and follow-up
filters. Either date can be omitted; the entire selected end day is included.
Server validation rejects invalid calendar dates, malformed types and reversed
ranges before reads. Date conditions remain inside existing regional scope and
requested boundaries are audited. Pagination retains filters; applying filters
resets the page and Clear ticket filters restores the unfiltered scoped queue.
This is creation-date review, not historical SLA or response-time reporting.

Validation: 468 backend tests, 307 admin frontend tests, lint/build and disposable
PostgreSQL checks passed. Database checks covered IST midnight boundaries and
regional restrictions. No application database migration/reset or external
operation ran. Browser acceptance and deployment remain pending.

### Exact support ticket lookup — implemented (22 October 2026)

Customers can select/copy the existing ticket reference from mobile ticket details.
Staff can paste that reference into the support queue and inspect the matching
metadata within their scope. Server validation rejects malformed references,
normalizes hex case, and combines exact ID with regional and selected filters.
Missing and inaccessible IDs both yield an empty queue. The lookup is audited;
restricted content still requires an access reason. Clear filters resets lookup.
Existing UUIDs are preserved; no alternate numbering or schema change was added.

Validation: 470 backend tests, 308 admin tests and 28 mobile tests passed. Admin
lint/build, targeted mobile lint and disposable PostgreSQL lookup/scope checks
also passed. No application migration/reset or external operation. Browser and
physical-device acceptance remain pending.

### Support performance reporting module — implemented (22 October 2026)

A complete on-demand Support performance panel is available in the customer ticket
queue: choose a 1–93 day creation cohort in IST, run/refresh, review intake and
response/resolution metrics, then open a day's intake queue. Includes explicit
loading/error/empty timing states and request abort on close. Queue filters do not
silently constrain the report; selected report dates and scope are displayed.

The backend applies existing ticket permissions and verified regional scope,
aggregates in repeatable-read and audits access. Reports contain no ticket text,
customer identity or staff ranking. Counts cover recorded responses, no recorded
response, first resolutions, reopened tickets, currently active tickets and
terminal tickets missing resolution history. Average first response/resolution
uses elapsed calendar minutes and explicit denominators. Customer messages and
private notes are not responses. Events before creation/in the future are
excluded; events after the cohort's end still count through report time.
Reopening preserves first-resolution timing. Missing history is not proof of no
response; null timing is not zero. Daily intake is zero-filled. This is operational
cohort reporting, not SLA compliance or historical status reconstruction.

Validation: 474 backend tests, 312 admin tests, lint/build and disposable PostgreSQL
checks passed. Added HTTP permission coverage and SQL cases for later responses,
reopenings, customer-only messages, invalid timestamps, missing history and region
isolation. No schema/application database changes or external sends. Export,
scheduled delivery and configured SLA targets are not part of this module.
Authenticated browser acceptance and deployment remain pending.

### Support report export workflow — implemented (22 October 2026)

Completed the pending on-demand export workflow for support performance reporting.
The displayed creation period can be exported as a fresh scoped snapshot by staff
with both support read and report export permissions (currently owners). Each
export requires a reason, session/CSRF authorization and transactional audit;
invalid requests or failed audit return no export. Existing role permissions are
unchanged. The shared report aggregation prevents a separate export calculation.

The UTF-8 CSV includes dates/scope/generated time, aggregate counts, timing sample
sizes, missing-history and reopened-ticket definitions, limitations and daily
intake. Cells are quoted/escaped and spreadsheet formula prefixes neutralized.
No customer messages, names, ticket IDs or export reasons appear in the file.
The admin interface handles reason validation, duplicate clicks, failures/retry,
abort on close, late responses, malformed output and download resource cleanup.
Success says download requested, not that saving to disk was verified. Counts may
differ from the earlier displayed snapshot, as explicitly stated in the UI.

Validation: 478 backend tests, 317 admin tests, lint/build and disposable PostgreSQL
checks passed, covering export permission/CSRF, audit failure, CSV formatting,
snapshot data and interrupted downloads. No schema/application DB operations or
external sends. Browser acceptance was attempted but localhost:5173 refused the
connection; authenticated browser download acceptance remains pending. Scheduled
report delivery and stored export jobs remain separate functionality.

### Admin-managed Help Center content module — implemented (22 October 2026)

Delivered owner content management, publication service and mobile integration.
Owners can create stable topic references, edit category/question/answer/order as
drafts, review plain-text draft vs current publication, publish explicitly and
unpublish. Changes require reasons, current versions, active owner/MFA/session,
CSRF and transactional before/after audits. Concurrency/stale writes conflict;
uncertain writes require refresh. Draft edits never change the live snapshot.
A serialized capacity check limits published topics to 500. No destructive delete.

Mobile Help Center now fetches only published content, including new topics,
on focus or refresh. Search/category/expand and contextual support intake remain.
Empty catalogs stay empty; unavailable content provides retry and ticket access,
not a silently stale bundled fallback. Unpublishing affects the next successful
fetch. Consumer responses exclude drafts, staff and audit metadata. Admin navigation
is /support/help-topics, linked from the customer ticket queue for owners.

New table migration 152 and an optional repeat-safe seed import the eight existing
curated English topics; existing topic references are not overwritten. Apply the
migration before enabling new APIs/mobile, and seed if initial content is wanted.
Neither ran against the application database. Translation, scheduled publication
and independent editorial approval are separate future functionality.

Validation: 483 backend tests, 322 admin tests, 31 mobile tests, admin lint/build,
targeted mobile lint and syntax checks passed. Disposable PostgreSQL verified
migration up/down, seed repeat safety, concurrent publication, unpublish, draft
privacy, owner access, audit rollback and independent before/after snapshots.
Application schema deployment and authenticated browser/device acceptance remain
pending; this is implemented and automated-tested, not a launch certification.

### Help Center revision history and recovery — implemented (22 October 2026)

Completed editorial recovery for the Help Center module. Owners can open a topic's
history, provide an inspection reason, paginate saved revisions and compare an
earlier draft against the current draft and current publication. The history shows
the action, timestamp in IST, staff reference and change reason. Initial seeded
content may have no recorded revision; the interface states that limitation.
New revisions can shift pagination; reloading starts from the latest page.

Restore requires a separate reason and current topic version. The backend loads
immutable evidence belonging to this topic, validates the earlier content and
restores draft fields only. It preserves the published snapshot and creates a
new version with before/after audit and source revision reference. Publication
remains a separate explicit action. Owner/MFA/session, permissions and CSRF are
checked server-side. Invalid/foreign revisions, unchanged content and stale writes
are rejected. Audit failures roll back the restore; concurrent restores yield one
success. The interface blocks duplicate submits, aborts closed views, ignores late
responses and requires a topic refresh after uncertain restore outcomes.

Validation: full backend regression passed (486 tests); full admin regression
passed (327 tests), followed by 11 targeted tests including additional interrupted
restore coverage. Admin lint/build and disposable PostgreSQL integration passed.
SQL checks cover scoped JSON audit queries, publication preservation, concurrent
restore, wrong-topic rejection and audit rollback. No new migration or application
database changes. Existing migration 152 still needs deployment. Authenticated
browser acceptance remains pending.

### Customer-confirmed support closure — implemented (24 October 2026)

Completed the customer confirmation step in the support lifecycle. After staff
resolution, the customer may reply to reopen or explicitly confirm resolution
through the existing Gilo custom popup. Confirmation closes only the support
conversation, preserves its history and resolution timestamp/notes, and removes
active assignment/follow-up scheduling. Closed tickets offer a new support request
for further help. No automatic timeout/closure or staff force-close policy was
introduced. Journey, payment, dispute and safety states are unaffected.

The authenticated endpoint checks customer ownership, ride/trip ticket scope,
resolved status and the inspected version under a row lock. A customer-authored
confirmation update and notification outbox event commit atomically. The original
operation UUID/hash recovers lost responses without duplicate updates or sends.
Concurrent customer replies and confirmation cannot overwrite each other.
Failed notification writes roll back the operation. Staff history labels this
as customer confirmation rather than a staff response.

Mobile pending actions use account/ticket secure storage, persist before sending
and require explicit retry after uncertainty. Draft/pending replies block closure;
a pending confirmation cannot become a reply. Recovery also works after refreshing
a now-closed ticket. Confirmation success refreshes current data, while definite
conflicts require reviewing the latest ticket. Device storage failure prevents
submission. The API exposes eligibility rather than trusting the screen status.

Validation: 491 backend regression tests, 329 admin tests, 36 targeted mobile tests,
admin lint/build, mobile lint and disposable PostgreSQL integration passed. The
first mobile run had a cold-start timeout; the unchanged full targeted suite passed
on rerun. SQL coverage includes duplicate concurrent confirmation, cross-customer
denial, notification rollback, reply-versus-closure conflict, preserved resolution,
read eligibility and staff inspection. No new schema or application DB operation.
Existing support schema deployment, authenticated browser and real-device popup,
restart recovery and notification delivery acceptance remain pending.

Still separate support backlog: private attachments, configured automatic
escalation policy and external staff notification channels.

### Private support photo attachments — implemented (24 October 2026)

Delivered customer photo selection, preview, explicit upload, saved-photo viewing
and staff evidence inspection as a complete first attachment workflow. Supports
JPG/PNG/WebP screenshots/photos only, one per upload and at most five per ticket.
Inputs are bounded at 5 MiB/20 million pixels, metadata removed, orientation applied
and converted to WebP inside 1600px/512 KiB. Animated images/PDF/video are excluded.
Customer upload rate limiting runs after authentication.

The server checks customer ownership and ticket scope, locks the ticket, requires
the current version and active status, and atomically records photo metadata,
customer conversation event and ticket version. Adding a photo flags customer
follow-up in queue/workload counts. Exact same-byte retries deduplicate before
status/version checks, including after closure. Deterministic private object keys
allow retry after database rollback without creating a second object. A failed DB
commit may leave an unreferenced private object; safe orphan reconciliation and
retention automation remain separate operational work. No unsafe rollback deletion.

Customer and staff views never receive raw storage references/public URLs. Staff
viewing requires current permission/session/MFA/regional access, CSRF, a reason and
committed read audit. Stored byte counts/checksums verify served images. Private
S3 requires all Block Public Access flags and server-side encryption; no public
fallback. Provider failures show retryable errors without internal details.

Mobile pauses inbox refresh/reply/closure during photo review, handles uncertain
same-photo retry and rejects stale writes. Restart does not auto-resubmit: users
can refresh saved photos. Admin preview loads on demand and is cleared on
failure/hide/unmount, with late responses ignored. Resolved tickets must first be
reopened through customer reply; closed ticket evidence remains readable.

Validation: 496 backend tests, 332 admin tests, 40 targeted mobile tests, admin
lint/build, mobile lint and disposable PostgreSQL passed. Tests cover image
validation, ownership/region denial, stale versions, repeated/concurrent uploads,
five-photo cap races, DB/audit rollback, object integrity and UI retry/cleanup.
Storage was mocked; no real provider upload occurred.

Deployment requires new migration 153 (not run on the application DB) and verified
existing private bucket/IAM configuration. Authenticated browser, real-device
image picker/readability and real storage acceptance remain pending. PDFs/video,
attachment deletion/retention automation, automatic escalation policies and
external staff notification delivery remain separate work.

### Automatic support follow-up escalation module — implemented (24 October 2026)

Completed owner policy configuration, scheduled evaluation, scoped escalated queue,
alert count and scan-health visibility. The policy starts disabled; owners explicitly
choose enablement and 1–10080 minutes after a staff-set deadline. Saving requires
reason, expected version, permission/CSRF and fresh active owner/MFA/session checks.
Policy changes have transactional before/after audit. Concurrent/stale or uncertain
changes require refresh, and the UI explains effects on existing overdue tickets.

The automation service scans every minute, up to 100 locked eligible tickets per
batch. PostgreSQL advisory locking prevents overlapping scans and serializes policy
changes. Active, unacknowledged ride/trip support deadlines qualify only after the
configured interval. Unscheduled, future, acknowledged, resolved/closed and excluded
package tickets do not escalate. Each ticket/deadline receives one durable event
with policy snapshot and system audit; repeat scans cannot duplicate it. Failed
audits roll back the batch and successful-scan metadata.

The queue supports due=escalated and displays escalation time. The periodically
refreshed alert links to that exact scoped queue. Acknowledgement, rescheduling or
resolution removes an event from active display but preserves its history; a new
overdue deadline can escalate again. Disabling stops future events while retaining
existing active escalations. No automatic priority changes, reassignment, ticket
closure, customer messages, money or journey changes are performed.

Owners can inspect the last successful scan time/count, with an explicit stale
snapshot warning when no recent scan exists. This is a bounded internal review
workflow, not an exact-time SLA guarantee, email/SMS delivery or emergency dispatch.
External staff notification channels and first-response SLA policy remain separate.

Validation: 500 backend tests, 337 admin tests, targeted UI rerun, lint/build and
disposable PostgreSQL passed. Database coverage includes concurrent scans/policy
edits, audit rollback, eligibility/thresholds, regional isolation, acknowledgement,
rescheduling, disabled behavior and matching queue/alert counts. No mobile changes.

Deployment requires migration 154 before updated queue/automation code. It has not
run against the application database; no policy was activated and no real messages
were sent. Authenticated browser and deployed scheduler acceptance remain pending.

### First-response monitoring module — implemented (24 October 2026)

Implemented the approved continuous-time policy with owner-configured target
(1–10080 minutes), disabled by default. Configuration requires a reason, current
version, dedicated permissions/CSRF and fresh active owner/MFA/session checks.
Changes and before/after audit commit together; competing writes cannot silently
overwrite each other. Failed/uncertain browser saves require a refreshed policy.

The support queue now offers first-response waiting/overdue filters, oldest first,
with IST deadlines and clear badges. Scoped alert links refresh every visible
minute and on focus. First response means a recorded customer-visible staff reply
or resolution after ticket creation and no later than the current DB time.
Assignment, private notes, customer replies/photos and acknowledgement do not stop
the timer. Resolved/closed or future-dated tickets are excluded; reopened previously
answered tickets retain their first response and use the customer follow-up flow.
Existing verified journey/region permissions and read audits apply throughout.

The current policy also applies to existing unanswered tickets. Disabling hides
current deadlines/overdue flags while leaving the waiting queue available. Reports
continue to show actual recorded response durations; they now share the same
first-response definition. This module does not claim historical SLA compliance,
send external messages, change priority/assignment or alter journeys/payments.

Validation: 502 backend tests, 342 admin tests in the full run, then 19 targeted UI
tests including an additional queue/refresh test; lint/build and disposable
PostgreSQL passed. Real SQL tests include concurrency, rollback, disabled policy,
changed targets, region denial, timestamps, oldest-first ordering and response vs
customer follow-up behavior. Authenticated browser acceptance remains pending.

Deploy migration 155 before updated support queue/alert code. It was not applied to
the application database and no target was enabled. External staff notification
delivery and safe attachment retention/orphan reconciliation remain separate work.

### Support-photo storage audit module — implemented (24 October 2026)

Added a read-only server-operator inventory covering every saved support attachment
and current objects in the private support-photo folder. It identifies missing
objects, size mismatches and old objects with no saved reference, while protecting
recent uploads from the old-unreferenced category. Closed/resolved-ticket evidence
remains referenced. The 24-hour grace is a review classification, not retention.

The command verifies private-bucket public-access controls, uses bounded paginated
DB/storage reads and prints only category counts and hashed reference identifiers.
Unknown metadata, duplicate/repeated pagination, provider/DB failures or scan limits
suppress findings entirely. Bounded result truncation is explicit. Exit codes
separate complete clean scans, review findings and incomplete scans. It neither
reads photo bodies nor writes/deletes evidence. Content checksum verification is
explicitly outside this metadata audit; normal authorized photo reads retain it.

Runbook and access requirements are in backend docs/admin-access.md. The CLI is
scripts/inventory-support-attachments.js; no browser surface or migration is added.
It has not been run against live storage/application data. Storage was mocked in
validation: 511 backend tests and disposable PostgreSQL passed, including retained
closed-ticket evidence, pagination, privacy, missing/mismatched files, failure
suppression, scan limits and no record/file mutation.

Remaining: live-storage acceptance, retention/deletion policy with evidence holds,
noncurrent-version recovery and controlled repair/deletion. A completed inventory
is advisory because DB/storage reads are not one atomic snapshot; it never grants
deletion authority. External staff notification delivery also remains separate.

### In-admin staff alerts module — implemented (24 October 2026)

Product decision: keep staff alerts inside Gilo Admin for the first release.
External email/SMS delivery is deferred, not an unfinished launch requirement for
this module. Added a workspace-wide alerts button for authorized support staff,
with scoped queue counts and links to first-response waiting/overdue work,
unacknowledged follow-ups and escalations. Badge counts represent nonempty queues,
not unique tickets; overlapping eligibility is explained. Opening an alert does
not acknowledge, assign, resolve or otherwise change a ticket.

The header replaces the support screen's separate poller. Refresh occurs while
visible/online, on navigation/focus/open/manual refresh, and immediately following
successful support mutations or policy changes. Hidden/offline state, failures and
timeouts clear old counts. In-flight requests are cancelled on invalidation,
account/scope changes and unmount; stale responses are ignored. Accessible links,
Escape/close focus return, outside dismissal and a bounded responsive panel are
implemented. The API continues to enforce regional access and read auditing.

Fixed passive-session activity: alert GETs retain all authentication checks but do
not extend last_seen_at. Leaving an alerts-enabled page unattended cannot keep a
staff session alive indefinitely. This behavior is selected by the server for the
alert route only; normal operations retain activity updates. No new migration,
external provider configuration, notification delivery or business-state mutation
is introduced. Existing alert migrations 154/155 remain deployment prerequisites.

Automated validation covers permissions, count validation and overlap, exact queue
links, failures/retry, hidden/offline/online behavior, polling/timeout cleanup,
account changes, successful mutation invalidation, keyboard controls, passive idle
expiry and revoked sessions. Authenticated real-browser acceptance remains pending.

### Scheduled ride/support automation monitoring — implemented (24 October 2026)

System Health now shows latest execution observations for ten existing ride/support
schedules: support escalation, wallet settlement, upcoming trip reminders,
unstarted trip cancellation, persisted notification retries, matching retries,
search extension/expiry, traveler-response expiry and payment eligibility.
Current cadence is unchanged; this module adds no automatic business action.

New migration 156 stores one latest heartbeat per job with database start/finish
times and a run identifier. Completion matches that identifier so an older run
cannot overwrite a later run. Monitoring failures are sanitized and do not stop the
existing job. No customer/result/provider payload is persisted in the heartbeat.
This is observation, not distributed locking or a change to job concurrency.

The audited, permission-protected health page distinguishes missing records,
unavailable monitoring, running, returned, thrown and stale executions. Overdue
means no newer start for three configured intervals. Returned is explicitly not
proof of business success: functions can skip/disable work or internally handle
individual failures. Existing payment/notification queues retain outcome authority.
Multi-instance observations describe the latest run, not every server. Other
workers, package schedules, provider services, Redis/socket/API uptime, quotas and
backup verification remain outside this monitoring module.

Validation: 517 backend tests, 356 admin tests, lint/build and disposable PostgreSQL
passed, including overlapping runs, malformed/future/stale records, missing schema,
continued job execution, scheduler registration and schema constraints. Deployment
requires migration 156 and the updated scheduler; neither application migration
nor service restart was performed. Authenticated browser/deployed cadence checks
remain pending. No external staff messages are introduced.

### Completed: controlled audit-summary export (2026-10-24)

Owners can download an audited CSV from Audit history using the applied action,
actor, related-record, event and IST date filters. Both dates and a meaningful
reason are required. Limit: 31 inclusive days and 1,000 events across all pages;
excess results must be narrowed rather than silently truncated. Ticket references
are now searchable alongside journey/case references. Auditor access remains read-only.

Exports contain event/action, actor/subject IDs and UTC/IST timestamps, excluding
metadata, reasons, IP addresses and customer details. Repeatable-read queries and
an export audit record precede delivery; audit failure prevents success. CSV quoting
and formula neutralization protect spreadsheet opening. UI handles permission
absence, missing dates, duplicate clicks, aborted filter changes, malformed responses
and download failures; success says download requested, not saved.

Validation: 524 backend and 362 admin tests passed; final export UI tests, lint,
production build and disposable PostgreSQL checks passed. No schema change or live
data/service changes. Authenticated browser download acceptance remains pending.
This completes summary export, not bulk detailed-evidence export or retention/deletion.
External staff alerts remain deferred in favor of in-admin alerts, as requested.

### Completed: ride-matching queue monitoring (2026-10-24)

System health now includes an owner-only audited, read-only Redis snapshot of the
ride-matching queue. Staff can see waiting, prioritized, active, delayed, paused,
waiting-for-children, retained failed and retained completed counts, with a pause
indicator and IST check time. Missing queue data is distinguished from an empty
observed queue and an unavailable check. No job payloads/customer details appear.

A dedicated bounded connection reads only existing BullMQ keys atomically and
closes after each check. Connection errors, invalid counts, wrong Redis types and
timeouts fail closed. Late connections cannot trigger reads after timeout. No
worker imports, metadata writes, queue actions, job retries or external staff
messages are introduced. The UI explains that job counts are not rider counts,
retention limits totals and Redis readability does not establish worker liveness.

Validation: 529 backend regression tests, 366 admin tests, six focused queue tests
including an additional late-connection case, lint and production build passed.
Disposable real Redis/BullMQ checks passed for queue states and unchanged stored
data. No migration or live Redis/database/service changes. Authenticated browser
and deployed Redis configuration acceptance remain pending. Worker liveness,
throughput/oldest-job age, other queues and general Redis uptime remain separate
planned work; this module completes ride-matching queue state inspection only.

### Completed: customer account controls — approved first-release scope (2026-10-24)

The user confirmed that restriction blocks new journeys/bookings while preserving
existing rides, tracking, refunds and support. Implemented owner-only restriction
and restoration with an audited impact preview, current owner/MFA/session checks,
five-minute preview expiry, account version and activity checks, serialized updates,
reason and retry identity. Existing bans/deactivation are not reversed through this
workflow. Audit failure rolls back changes; account audit history is linked from
People. The list identifies new-journey restrictions separately from disabled access.

Backend guards cover publication, ride creation/restarts, new booking actions,
legacy wallet debit and new online-order creation. Restricted travelers are excluded
from matching. Existing online payments remain recoverable/reconcilable, as payment
may already be underway. The restriction does not cancel or settle a journey, log
someone out, mark safe exit, or block existing trip start/pickup/drop and support.
Restoration removes only this restriction. Full bans/emergency intervention remain
separate safety-policy work, not implied by this first-release module.

Also completed explicit owner contact reveal: required reason, fresh authorization,
audit-before-disclosure, no contact values in audit metadata, clear unavailable
states, abort/discard of late requests and automatic hiding after one minute,
backgrounding, navigation or account/session change. General People views remain
masked. No external customer/staff messages are sent by these controls.

Validation: 702 backend tests, 372 admin tests, lint and production build passed.
Disposable PostgreSQL checked concurrency/replay, audit rollback, restoration,
account guard and preservation of an onboard ride. Original users migration 001
and User model now contain new_journeys_restricted/restriction_version, per the
pre-launch migration policy. No app database changes/reset, live funds, live Redis
operations or service restarts occurred. Existing databases require a controlled
schema upgrade before deployment. Browser/mobile and deployed-query acceptance
remain pending. Next development workstream: pricing and policy management.

### Completed: versioned ride-pricing controls (2026-10-24)

Implemented the full proposal-to-activation workflow for minimum passenger fare,
detour rate/km, maximum combined detour and ride platform commission. Owners can
preview a one-passenger example through the backend fare engine, submit a reasoned
proposal, review history and approve/reject another owner's proposal. Proposers
can withdraw their own pending proposal. Preview expiry, baseline versions/hashes,
idempotent submission/decisions, current owner/MFA/session checks, CSRF and
transactional audit cover stale inputs, retries, concurrent decisions and failures.
Only one proposal can remain pending. Approved versions cannot be edited.

Scheduled activation uses explicit India-time input and database-effective reads,
bypassing old settings caches. Each segment fare uses one consistent snapshot.
Decimal wallet commission is preserved; booked fares and recorded online-payment
allocations remain unchanged. Online payment confirmation does not depend on
live pricing availability. History includes the submitted illustrative journey.
No policy was published and no live payment or application database was changed.

Validation: 709 backend regression tests plus focused cache/snapshot checks,
378 admin tests, lint and production build passed. Disposable PostgreSQL verifies
concurrent replay/decisions, separate-owner approval, audit rollback, exact-time
activation, decimal values and missing-schema refusal. Deploy new-table migration
157 before this code; review baseline values and provision two active MFA owners.
Authenticated browser acceptance and controlled deployment remain pending.

Remaining within the broader Pricing & Policies workstream: vehicle-specific
base/per-km pricing, cancellation-policy publishing and matching/time-rule
management. These were not exposed as unrestricted generic settings. The next
implementation should begin with vehicle-specific fare configuration and its
impact on unmatched ride estimates and traveler trip pricing.

### Completed: passenger vehicle pricing workflow (2026-10-24)

Implemented owner-controlled base/per-km passenger vehicle rates with server
examples, immutable version history, proposals, proposer withdrawal, independent
owner approval/rejection and scheduled activation. The workflow reuses the tested
ride-pricing approval protocol with separate storage and audit actions. Current
owner/MFA/session/CSRF checks, reasons, preview expiry, baseline hash/version,
idempotency and transactional audit protect financial configuration changes.
Active passenger vehicle keys are rechecked at preview, submission and approval.

Selected-vehicle ride estimates, trip suggestions and publication price bands read
the effective passenger policy. A zero base fare remains zero. Invalid, missing or
duplicate rates fail explicitly. Existing saved trip prices, booked/paid amounts
and package pricing are not rewritten. Any-vehicle platform estimates remain
separate. The admin preview labels raw base + distance versus the suggested trip
seat range; it does not claim to be a checkout quote. Current rates, historical
rates (including removed catalog vehicles), examples and reasons are visible.

Validation: 721 backend tests, 386 admin tests, lint and production build passed.
Both pricing workflows passed isolated PostgreSQL concurrency, rollback, replay,
independent-approval and exact activation tests; package source rates remained
unchanged. UI checks include India time, zero rates, retry identity and aborts.
New-table migration 158 is pending controlled deployment; no application database
changes, live prices, funds, notifications or service restarts occurred. Browser
and mobile acceptance remain pending. At least two active MFA owners are required.

Next full module: cancellation-policy management. Trace current fees, refunds,
actor/status eligibility and booking snapshots before exposing policy publishing.
Matching/time-rule management remains pending after cancellation policies.

### Completed: ride cancellation-policy management (2026-10-24)

Implemented versioned modern RideRequest cancellation terms: pre-payment wallet
fee and passenger/traveler percentage/minimum/maximum after booking and at pickup.
The admin previews six fee/refund scenarios using the execution calculator, submits
reasoned proposals, permits proposer withdrawal and requires another active MFA
owner to approve/reject. Scheduled activation, immutable history, baseline hashes,
preview expiry, replay protection, current permissions/session/CSRF and atomic audit
protect publication. Policy categories now separate ride pricing, vehicle pricing
and cancellation terms; successful actions show confirmation feedback.

New ride creation atomically saves the effective terms. Existing rides retain their
stored terms or original defaults when their historical snapshot is null. Corrupt
snapshots fail explicitly. Later versions do not change fees for existing requests.
Replacement searches receive new terms as new requests. Passenger fees stay within
the paid amount; traveler cancellation refunds the passenger in full. Current
onboard safety resolution, automatic trip cancellation refunds, online-payment
recovery and penalty-collection behavior are preserved. This is policy management
for the existing cancellation flow, not a new debt-collection or safety policy.
Legacy RideBooking terms are outside this modern RideRequest configuration.

Validation: 756 backend regression tests plus an additional actual cancellation
controller test (14 focused booking tests passed), 392 admin tests, final focused
UI checks, lint/build passed. All three policy workflows passed disposable
PostgreSQL concurrency, rollback, replay, independent approval and activation tests.
Creation tests verify snapshot capture and policy-read failure before any new ride
is saved. Actual cancellation verifies stored-fee retention, wallet refund amount
and no duplicate refund. Browser/mobile acceptance remains pending.

New-table migration 159 and the cancellation_policy_snapshot column added to
original migration 127 require controlled rollout; editing 127 does not upgrade
an existing database. No application schema, live rates, funds or services were
changed. Next pending policy module: matching and time-rule management, including
its effects on new searches while preserving accepted live-pickup feasibility.

### Completed: matching and search-time policy management (2026-10-24)

Implemented owner-controlled search grace, route radius, pickup-time tolerance,
maximum travel before pickup, score threshold, expansion count and default candidate
limit. Server examples show the fixed ride class and expanded limits. Proposals,
withdrawal, separate-owner approval/rejection, scheduled activation and immutable
history use current authorization, reasons, preview expiry, baseline hashing,
idempotency and transactional audit. The Matching rules category is available
alongside the pricing and cancellation categories.

New searches save the effective matching policy and deadline atomically. Current
previews use current policies; saved searches/worker retries use their snapshots.
Historical null-snapshot rides retain legacy configuration and saved deadlines.
Every expansion round uses the same saved values, and requested expansion is capped
by that policy. Trip-publication wake-up scans cover the maximum expanded policy
radius before final eligibility checks. Existing wake-up count limits remain.

Accepted rides retain live pickup feasibility without fixed reservation expiry.
GPS freshness/spoofing checks, route direction/order, capacity, identity/vehicle
review, trust/safety, speed assumptions, fare detour gates and invitation/payment
lifetimes remain outside this configuration. This does not expose unrestricted
matching internals or change package flows. Defaults retain ten-minute search grace;
no live policy was published.

Validation: 786 backend tests, 398 admin tests, lint/build and isolated PostgreSQL
policy approval/concurrency/rollback/activation checks passed. Coverage includes
new-search snapshot/deadline consistency, failed reads, preview version selection,
saved expansion bounds, ongoing GPS matching, worker behavior, expiry and payment/
cancellation regression. New-table migration 160 and matching_policy_snapshot in
original migration 127 require controlled deployment. No application DB, Redis jobs,
notifications, funds or services were changed. Browser/mobile, PostGIS and broader
wake-up scan load acceptance remain pending.

Next planned development workstream: remaining typed master-data management,
starting by auditing existing vehicle/luggage inspection and safe-edit capabilities
before adding the missing creation/publication workflows.

### Completed: luggage option onboarding and history — 24 October 2026

The next master-data slice is implemented end to end: owner creates a luggage
option with permanent key, customer label/description, built-in icon, initial
surcharge and display order; reviews an audited five-minute preview and confirms
with a required reason. New options start inactive, then use the existing reviewed
activation flow. History exposes creation and subsequent edits with staff, reason,
timestamp and before/after values. Older seeded entries may have no creation event.

Server checks current owner/MFA/session state, validates all fields and serializes
creation with luggage renames. Duplicate keys and case-insensitive labels are
rejected, including inactive records. Transactional audit failure rolls back
creation; retries recover the original result using the same operation identity.
Consumer selection rejects inactive entries and accepts them after activation.
Existing prices and bookings are unchanged; no schema changes are required.

Validation passed: 567 targeted backend/admin regression tests, 404 frontend tests,
lint, production build and isolated PostgreSQL replay/concurrent collision/audit
rollback/activation checks. No application database changes or live publication.
Authenticated browser and real-mobile acceptance remain pending.

Remaining master-data scope: vehicle onboarding, global availability/capacity
controls, custom icon uploads and revisions to existing luggage surcharges. This
completes luggage onboarding and history, not the entire master-data workstream.

### Completed: vehicle availability and history — 24 October 2026

Owners can now change existing vehicle type availability using a server preview,
required reason, revision check and explicit confirmation. A repeated operation
recovers its committed result; audit failure rolls back the availability update.
Paginated vehicle history includes availability and existing display edits.

Deactivation is blocked by open trips (including drafts/reviews), ride requests
with this preference or matched trips, and unresolved legacy bookings/disputes.
This protects existing obligations rather than cancelling them. Activation checks
valid passenger capacity plus current and scheduled passenger pricing coverage;
without a current approved policy it requires a valid unique baseline rate.
Confirmation rechecks all conditions under vehicle and pricing-policy locks.

Validation passed: 577 backend/admin regression tests, 409 frontend tests, lint,
production build, focused post-review tests and disposable PostgreSQL publication
concurrency, replay, audit rollback, pricing and unresolved booking checks. No
schema changes or application data changes. Browser/mobile acceptance is pending.

Remaining master-data work: vehicle creation/onboarding, capacity revisions,
custom icon uploads and existing luggage surcharge revisions. Vehicle availability
is complete as a bounded workflow; the wider master-data workstream is not yet
complete.

### Completed: passenger vehicle capacity management — 24 October 2026

Owners can preview and confirm passenger capacity changes for inactive supported
vehicle types after resolving open trips, requests and bookings. Seats exclude the
traveler and must be within the existing supported profile's ceiling. This does
not convert package-only/unknown types or establish a specific vehicle's legal
seating approval. Mandatory reason, revision, fresh authorization, expiring preview,
retry identity and transactional audit protect each change. History includes seat
changes. Reactivation remains a separate reviewed action.

Trip validation returns the configured capacity; publication checks it under the
vehicle lock before committing. Existing trips, bookings, fare rates and package
weight/size profiles are not rewritten. No database migration is required.

Validation passed: 653 backend/admin/trip regression tests, 411 frontend tests,
lint/build and isolated PostgreSQL persistence/concurrent replay/history/rollback
checks. No live application database or catalog changes. Browser/mobile acceptance
remains pending.

Remaining master-data scope: new vehicle onboarding, custom icon uploads and
existing luggage surcharge revisions. Capacity management is now implemented for
the supported passenger profiles; expanding those profiles is separate work.

### Completed: vehicle catalog icon management — 24 October 2026

Owners can view the current image, select a replacement, review a server-normalized
preview, and confirm with a required reason. PNG/JPEG/WebP input is limited to
384 KB, 16-pixel minimum dimensions and 4 megapixels; animations/SVGs are rejected.
Output is metadata-free PNG within 256 × 256. Revision checks, actor-bound expiring
previews, fresh authorization, operation replay and transactional audit protect
replacement. Vehicle history includes old/new image references and reasons.

Immutable content-based filenames preserve cached/history assets. Files are fully
written before publication; database/audit failure preserves the active reference.
Unreferenced files from a failed transaction are retained for safe retry, not
silently deleted. Existing public vehicle storage must be durable and shared across
API instances. No live icon or schema changes were made.

Validation passed: 660 backend/admin/trip tests, 416 frontend tests, lint/build and
isolated database/filesystem concurrency, rollback/retry and image viewer/history
checks. Authenticated browser/mobile and deployed storage acceptance remain pending.

Remaining master-data work: new vehicle onboarding, luggage image upload/display
support, and existing luggage surcharge revisions. Vehicle icon replacement is
complete; this entry does not mark all master-data or release gates complete.

### Completed: luggage catalog image management — 24 October 2026

Owners can view existing luggage artwork or its built-in emoji, upload and preview
a server-normalized image, then confirm with a reason. Permissions, CSRF, current
session/MFA, stale-revision protection, expiring actor-bound previews, safe replay
and transactional audit reuse the vehicle image workflow. Catalog histories and
storage folders remain separate; a vehicle preview cannot update a luggage option.
Luggage surcharge, availability and fallback emoji are preserved.

The ride-booking luggage selector displays managed uploaded illustrations and
falls back to the built-in icon after a missing/failed image. A changed image URL
resets that fallback. Public catalog artwork is served from /uploads/luggage;
personal photos/evidence and external URLs are not used in this selector.

Validation passed: 662 backend/admin/trip tests, 417 admin UI tests, 18 focused
mobile tests, admin lint/build, targeted mobile lint and changed JSX syntax checks.
Disposable PostgreSQL/filesystem tests verified persistence, replay, isolation,
history and unchanged pricing/fallback. No application data or live assets changed.
No migration is required. Browser/device and deployed shared-storage acceptance
remain pending.

Remaining master-data development: new vehicle onboarding and existing luggage
surcharge revisions. Icon replacement is now implemented for vehicles and luggage;
release acceptance and the other planned admin workstreams remain separate.

### Completed: luggage surcharge revisions — 24 October 2026

Owners can preview and propose a percentage revision with a reason and fare example.
A different owner must approve/reject; the proposer can withdraw. Changes require
an inactive option with no unresolved rides/bookings. Revision and eligibility are
rechecked at approval, and approval leaves availability inactive for a separate
reactivation. Existing quoted/paid fares are preserved. The no-luggage option must
remain free. Examples do not represent checkout quotes.

Server-side fresh authorization, shared catalog/record locks, expiring previews,
operation replay, one pending proposal per option and immutable proposal/decision
history protect the process. Catalog changes invalidate approval, but not rejection
or withdrawal. Price and both audit records roll back together if confirmation fails.
No new table/migration is required; audit history is retained for workflow/replay.

Validation passed: 596 targeted backend/admin/pricing tests, 421 admin UI tests,
lint/build and disposable PostgreSQL independent-review/concurrent-replay/rollback
checks. No live pricing or application data changed. Browser/mobile acceptance
remains pending.

Remaining master-data development: new vehicle onboarding, including supported
profile and pricing compatibility. Existing catalog inspection, controlled edits,
luggage creation, vehicle availability/capacity, image replacement and luggage
surcharge revisions are implemented; release gates and other admin workstreams
remain separate.

## Vehicle type onboarding implemented — 2026-10-24

The remaining vehicle onboarding development slice now connects creation to
activation: owner preview/reason → inactive passenger variant → catalog image →
independently approved passenger pricing → effective rates → availability preview
and activation. Keys/profiles are immutable; capacity is bounded by a supported
profile (bus/train excluded). Duplicate keys/labels, stale previews, unauthorized
sessions, uncertain retries and audit failures are covered. Creation is recorded
in the existing history; later capacity/icon/availability edits use existing flows.

Pricing proposals can now include inactive types without requiring premature
activation. All active passenger types remain mandatory. Both fields of any
included rate are required; unknown types are rejected. Activation requires an
uploaded icon and coverage by current and all scheduled approved rates. Existing
journey prices are not recalculated. Newly onboarded variants have no package
capacity, and mobile/server publication enforce passenger-only use.

Validation: 601 backend regression tests passed; 425 admin tests passed, with the
additional inactive-pricing scenario included in a subsequent 13-test focused
run. Admin lint/build passed. Mobile trip creation tests passed (3), and the trip
setup screen transpiled. Disposable PostgreSQL exercised concurrent creation,
retry recovery, duplicate labels, image save, second-owner pricing approval,
activation before/after rate effectiveness, runtime capacity/rates and rollback.

Deployment requirement: `vehicles.profile_key` was added to the original vehicle
creation migration/model. Application databases were not reset or migrated.
Authenticated browser/device acceptance remains pending. These checks do not
constitute a launch-readiness claim.

This completes the currently listed master-data development scope: inspection,
controlled edits, luggage creation/pricing, vehicle creation/pricing/availability/
capacity, catalog images and history. Other admin workstreams and release gates
remain tracked separately; they are not marked complete by this module.

## Persisted notification retry controls implemented — 2026-10-24

Completed the persisted transactional-notification retry module for trip
cancellations, support updates and document reviews. Five total automatic attempts
use persisted 1/2/4/8-minute backoff; exhausted events stop consuming worker batches.
Worker row locks and rechecks coordinate multiple instances. Existing sent/delivered
or provider-success evidence prevents replay even if a row also says failed.
The original notification ID and matching enqueue checkpoint remain unchanged.

Owner-only inspection now shows attempt limits, next eligible time and extra-attempt
usage. The queue includes support/review events without exposing message bodies,
recipient identifiers or provider secrets; eligibility and exhausted filters help
find recovery work. System health retry counts use the same scope and limits.
Owners can preview one extra attempt with a reason, then confirm with an operation
identity. Current owner/MFA/session checks, five-minute actor-bound previews, stale
revision checks, transactional audit and replay protection enforce at most one
extra attempt per event. Read, skipped, sent and unsupported direct-channel events
cannot be manually replayed. Reading an in-app queued event does not itself discard
its outstanding worker work.

Authorization is not delivery confirmation. The worker must be running, and an
uncertain provider outcome can still cause a duplicate push; stable IDs reduce
that risk without guaranteeing exactly-once delivery. Failed attempts before this
schema are not included in the new counters. No real notifications were sent during
verification; provider calls were mocked.

Validation: full admin UI suite passed (431 tests), followed by focused delivery/
retry (14 tests) and system-health checks (4 tests). Backend regression and focused
retry checks passed, including stale preview, revoked access, unsupported status,
exhaustion and audit rollback. Disposable PostgreSQL verified concurrent owner
replay, two-worker locking, backoff, exhaustion, batch fairness and all supported
recovery channels. Admin lint and production build passed.

Deployment requirement: the original notification_events creation migration and
model now contain delivery_attempts, manual_retry_count and next_retry_at. The
application database was not migrated/reset and running services were not restarted.
Browser/device delivery acceptance remains pending. Notification templates, bulk
campaigns and provider delivery monitoring remain separate planned work; this entry
does not mark the entire communications workstream or launch gates complete.

## Homepage banner management implemented — 2026-10-24

Completed the informational homepage banner workflow: owner uploads normalized
artwork, saves a draft, previews saved content, confirms publication or withdrawal,
and reviews paginated audit history. Edits preserve currently published content;
versions prevent stale writes. Publication/withdrawal previews expire after five
minutes and require a reason. Fresh owner/MFA/session checks, dedicated permission,
CSRF, transactional audit and durable operation replay protect changes. At most ten
banners may be active; withdrawal preserves history rather than deleting records.

Image uploads use bounded PNG/JPEG/WebP decoding, metadata removal, immutable
hashed PNG files and no-follow file access. Publication checks artwork integrity.
These are public assets, not private evidence. The customer feed excludes draft
metadata, reads current active content without Redis caching and respects display
order. Mobile focus refresh reflects updates/withdrawals, ignores late responses
after blur and uses accessible image descriptions with uncropped artwork.

Validation passed: 567 backend/admin tests, 435 admin UI tests, three focused mobile
banner tests, lint/build and disposable PostgreSQL/file integration checks for
concurrent replay, draft/live separation, stale preview, audit rollback, withdrawal,
history and the publication cap. No real banners, application data or services
were changed/restarted during verification.

Deployment: title, version and draft were added to the original sliders creation
migration and model. The application database was not migrated/reset. Durable/shared
public image storage and authenticated browser/real-device acceptance remain release
checks. This completes informational banners, not scheduled/localized campaigns,
external links, notification templates, agreements or remaining admin modules.

## Support notification template module implemented — 2026-10-24

Completed owner management for the two generic support notices: conversation updates
(staff reply/resolve/reopen) and customer-confirmed closure. Owners can edit a draft,
review a server preview, publish, restore built-in Gilo wording and inspect paginated
revision history. Drafts preserve the currently published wording. Five-minute
actor-bound previews, persisted owner/MFA/session validation, CSRF, version checks,
transactional audit and durable operation replay protect changes. The UI preserves
operation identity after uncertain responses and requires saving edits before preview.

The existing support workflows resolve copy during the conversation/outbox transaction.
Queued notifications retain their text and recorded template key/version through later
publications and retries. Default wording remains available without seeding; restoring
it does not disable notifications. Generic English plain text only, with length limits
and no links, markup, interpolation, customer conversation text or test-send action.

Validation: 577 backend/admin and customer-closure tests passed, followed by 16 focused
checks after final validation/access adjustments; all 440 admin UI tests passed, plus
lint and production build. Disposable PostgreSQL verified migration up/down, concurrent
save/publication replay, audit rollback, stale previews, draft/live separation, reset,
history and existing support actions with recorded template snapshots. No live messages
were sent, published wording changed, services restarted or application database reset.

Deployment requires the new-table migration 161 before deploying the backend. No seed
is required. Authenticated browser and actual-device notification acceptance remain
release checks. This completes the support notice template module, not all notification
templates: ride/trip/payment/verification copy, localization, scheduled campaigns and
agreement/acceptance management remain separate planned work. Existing mobile delivery
continues to use its saved notification title/body; no mobile code change was needed.

## Verification notification guidance module implemented — 2026-10-24

Completed owner template management for approval, rejection and correction-request
notices across identity documents, profile photos and vehicle/licence evidence. The
server keeps the title and outcome/category sentence fixed. Owners edit generic
follow-up guidance, save a draft, review complete examples for all categories, publish
or restore defaults, and inspect revision history. Guidance must remain consistent with
the outcome; no private review reasons or dynamic customer fields are inserted.

Publication uses fresh owner/MFA/session checks, CSRF, actor-bound expiring previews,
current revisions, transactional audit and durable replay protection. The reusable
backend template engine and admin editor also serve the existing support module while
retaining separate permissions, storage and audit namespaces. Existing regional review
permissions, required evidence views, expiry checks and fraud checks are preserved.

Verification decisions save the rendered notice and template key/version atomically
with their audit/outbox records. Duplicate decisions enqueue one notification. Later
publications/reset preserve queued messages; outbox failure rolls back the decision.
Restoring defaults does not disable review notifications. Three guidance templates cover
nine decision/category combinations. No actual notifications or publications were sent.

Validation: 583 backend/admin/customer-closure tests, all 444 admin UI tests, lint and
production build passed. Disposable PostgreSQL verified the new migration up/down,
concurrent template save/publication replay, audit rollback, stale preview, draft/live
separation, reset/history and all three vehicle review outcomes with concurrent replay
and outbox rollback. Existing support template PostgreSQL regression was also checked
against the shared engine.

Deploy the new-table migration 162 before the new backend; application migrations and
service restarts were not run. No seed or mobile code change is required. Authenticated
browser and actual-device notification acceptance remain release checks. This completes
verification notification guidance, not ride/trip/payment templates, localization,
agreements/acceptance records or all remaining admin workstreams.

## Ride agreement evidence module implemented — 2026-10-24

Completed owner-only agreement evidence browsing and reason-required inspection, with
account/journey UUID, agreement-type and acceptance-state filters, pagination, IST dates,
source labels and explicit evidence limitations. Reads require current persisted owner/
MFA/session access and transactional audit. Inspection verifies the referenced journey
belongs to the recorded passenger. IP/device fields and package records are excluded;
no regional permissions, evidence editing, deletion or export were introduced.

Corrected the older ride booking confirmation path's agreement_version/model-version
mismatch and missing accepted flag. Ride acceptance writes share a recorder inside the
existing journey transaction and include journey references. Explicit true is required
instead of accepting truthy strings. Rescheduling is labelled carried-forward consent.
The generic agreement upsert rejects ride agreement types, preventing it from overwriting
ride evidence. Historical rows remain unchanged and may be unlinked.

Validation: 632 backend/admin/ride checks, all 448 admin UI tests, lint and production
build passed. Disposable PostgreSQL verified original migration up/down, real acceptance
writes, verified/foreign journey references, legacy limitations, package exclusion,
pagination and journey-transaction rollback. Rescheduling regression tests exercise the
real acceptance recorder and assert carried-forward provenance.

Deployment: nullable reference_type/reference_id/source fields and query indexes were
added to ORIGINAL creation migration 025 as requested; no alteration migration was added.
Application data was not migrated/reset and services were not restarted. Authenticated
browser and actual-device acceptance remain release checks.

This completes the ride acceptance evidence module, not the entire legal-content
workstream. Exact displayed terms/privacy text is still not captured; versioned terms
publication, version negotiation and immutable text snapshots remain pending. The UI
states this limitation rather than presenting a version as proof of displayed text.
No historical evidence was backfilled or legal content invented.

## Versioned ride terms and exact acceptance snapshots implemented — 2026-10-24

Completed the English rider terms/privacy publication and new-ride acceptance module.
Owners save drafts, preview the full document, publish explicitly, restore the labelled
testing baseline and inspect version history. The existing guarded content engine
provides owner/MFA/session checks, CSRF, stale revision protection, reason, audit and
operation replay. The original mobile testing summary is preserved as the baseline,
including its testing notice; production legal wording has not been authored or approved.

Review Ride now fetches the authoritative bundle on focus and displays its text. Loading
failure blocks new acceptance/creation and offers retry. Changed content clears consent;
a stale submission receives a version-conflict response, reloads text and asks for fresh
acceptance. New requests submit the reviewed bundle token. Existing payment-mode review
continues through its existing flow. Request creation and legacy booking confirmation
require the current token; older clients need the coordinated mobile update.

The server validates the bundle inside the journey transaction, using shared acceptance
locks against exclusive publication. Parallel riders do not serialize behind one another.
A successful acceptance stores the exact terms/privacy text, individual versions and
canonical hash. Later publication/reset cannot rewrite it. Rescheduling carries its old
snapshot, original acceptance time and parent record ID without accepting new terms.
Legacy evidence stays limited; missing historical text is not invented. Admin inspection
verifies snapshot integrity and displays the recorded documents with their limitations.

Validation: 599 backend/admin/ride tests passed, followed by focused checks after stricter
recorder and endpoint validation; all 452 admin UI tests and four mobile hook tests passed.
Admin lint/build and mobile Babel parsing passed. Disposable PostgreSQL verified migration
up/down, publication concurrency/replay, audit rollback, acceptance/publication locking,
stale token rejection, exact snapshot preservation, inherited acceptance, evidence
inspection and journey rollback. The prior agreement-evidence PostgreSQL suite also passed.

Deployment requires new-table migration 163 and the additional snapshot/hash/origin fields
in ORIGINAL agreement migration 025, plus the updated mobile client. No application
migration/reset, publication or service restart was performed. Production legal wording,
authenticated browser/real-device acceptance and coordinated rollout remain release checks.
This completes the English new-ride legal-content mechanism; traveler-specific terms,
translations and wider legal-content/retention work remain separate scope. It is not a
claim of legal compliance or full launch readiness.

### Traveler terms and publication evidence — implemented 2026-10-24

Completed the English traveler terms module for passenger-carrying trips:
owner draft/preview/publish/baseline/history controls, current-text customer API,
mobile display and explicit acceptance, transactional publication evidence and
owner inspection linked to the correct traveler account and trip. Both publish
entry points use the same consent gate. Draft saves and existing journey duties
remain available; package-only publication is unchanged.

The existing document table stores a distinct traveler_terms key. Owner-only
controls retain MFA/session, CSRF, audit, reason, revision, preview expiry and
operation replay protections. Publishing revised terms cannot race a trip's
acceptance transaction or rewrite its saved evidence. Missing/stale consent is
rejected; mobile reloads changed text and clears the checkbox. Trip or evidence
write failures roll back publication and acceptance together. Published-trip
status/edit protections prevent repeat acceptance through publication retries.

Validation passed: 620 backend/admin/ride/publication tests, 456 admin UI tests,
four mobile hook tests, lint/build and Babel parsing. A disposable PostgreSQL
suite covered schema up/down, shared/exclusive content locks, stale/absent
consent, publication retries, exact snapshots, evidence/trip-write rollback,
admin trip ownership inspection and content operation replay.

No new migration is needed beyond the prior 025 snapshot fields and 163 document
table. No application database reset, migration, content publication or service
restart was performed. Deploy backend and updated mobile together; old clients
cannot publish passenger trips without current consent. Baseline is the existing
traveler testing summary with corrected Gilo branding, not reviewed production
policy. Production wording/classification review, translations and real-device /
authenticated browser acceptance remain open. Wider legal retention/governance
and other pending workstreams remain separate; this does not mark launch ready.

### Trip cancellation notification guidance — implemented 2026-10-24

Completed owner management of separate rider and traveler follow-up guidance for
trip cancellation, expiry and early ending: draft, complete-scenario preview,
publication, default restoration and audited history. The title and backend-derived
search/cancellation/refund facts remain fixed. Guidance allows 5–160 plain-text
characters without links, markup or placeholders. Owners must avoid personal data
and financial promises. Seven rider and three traveler previews explain the actual
contexts; example wallet amounts are explicitly illustrative.

Cancellation renders and stores the final body and template version inside its
existing refund/notification transaction. Future edits do not alter queued retries.
Duplicate cancellation preserves the original notice. Corrupt editorial data falls
back to default guidance with a metadata flag; storage failure rolls back the
operation. Owner permission, fresh MFA/session, CSRF, reason, version, expiring
preview, audit and operation replay safeguards apply. Package and resume messages
remain outside this module.

Validation passed: 632 backend tests, 460 admin UI tests, focused UI checks after
scenario-label refinement, lint and build. Disposable PostgreSQL covered schema
up/down, concurrent publication/replay, audit rollback, stale previews, restoration,
persisted-message immutability and transaction rollback. Actual cancellation service
tests cover wallet refund facts, duplicate notices and template-storage failure.

Deployment requires new-table migration 164 before backend rollout. No application
migration/reset, service restart, publication or real notification was performed.
Authenticated browser and real-device delivery checks remain pending. Other ride,
payment and resume templates, bulk communications and provider delivery monitoring
remain separate pending workstreams; this does not mark communications or launch
readiness complete.

### Trip resumption notification guidance — implemented 2026-10-24

Completed the owner-managed English resumption guidance module: draft, full notice
preview, publish, restore defaults and audit history. The title and resumption
statement remain fixed. Guidance is limited to 5–160 plain-text characters with no
links/markup/placeholders; owners are instructed not to add private information or
safety, arrival, dispute closure and payment promises. Dedicated permission,
fresh MFA/session, CSRF, reason, version, preview expiry, transactional audit and
operation replay use the shared editor/service.

The existing resume workflow resolves one template after safety, exit, route/GPS,
capacity and remaining-pickup checks. Active riders receive versioned text with a
ride-details destination; completed/disputed rides do not. Visibility, timeline and
notices commit together. Concurrent or repeated resumption creates no duplicate
notice. Cases remain open and held funds are untouched. Corrupt editorial data uses
recorded default fallback; storage failures roll back the operation. Already queued
notice text stays unchanged after subsequent publication.

Validation passed: 619 backend/admin/resumption/notification tests, 464 admin UI
tests, lint/build and diff checks. Disposable PostgreSQL exercised migration
up/down, concurrent publication/replay, audit rollback, stale previews, concurrent
resume, outbox rollback, recipient filtering, saved-message immutability and the
safety-case guard. Geometry/pickup eligibility were fixtures for those transaction
checks; this is not a real GPS or provider-delivery test.

Deploy new-table migration 165 before the backend update. No application migration,
reset, publication, service restart or real notification was performed. Authenticated
browser and real-device delivery acceptance remain pending. Other ride/payment
notification templates, provider delivery monitoring and campaigns remain separate
workstreams; this module does not mark the entire communications plan launch-ready.

### Ride issue and pickup-exception notification guidance — implemented 2026-10-24

Completed owner draft/preview/publish/default/history controls for seven notice
contexts: issue reported, passenger exit, support-recorded exit, waiting at pickup,
failed pickup, delayed cancellation and the traveler cancellation update. Titles,
recorded outcomes and refund facts are fixed. Generic English follow-up guidance
is limited to 5–160 plain-text characters without links/markup/placeholders. The
editor warns against private case text, pickup codes and safety/payment promises;
refund examples clearly use illustrative amounts.

The existing resolution service saves rendered text and template revision in its
business transaction. Notification storage failure rolls back case/hold changes;
corrupt editorial data uses recorded default fallback. Private reports stay out of
notifications. Exit confirmation leaves financial review open and funds held.
Existing actor, independent approval, timing/proximity and duplicate-action guards
remain intact. Owner permission, fresh MFA/session, CSRF, reason, version, expiring
preview, audit and operation replay protections apply to editorial changes.

Validation: 634 backend/admin/resolution/notification tests, 468 admin UI tests,
lint/build and diff checks passed. Disposable PostgreSQL covered schema up/down,
publication concurrency/replay, audit rollback, stale previews, concurrent reports
and exit confirmation, outbox rollback, private-text exclusion, immutable saved
notices and retained financial review.

Deploy new-table migration 166 before the backend update. No application database
migration/reset, service restart, publication or real message occurred. Authenticated
browser and real-device notification acceptance remain pending. Other ride/payment
templates, campaigns and provider-delivery monitoring remain separate pending
workstreams; this module does not complete all communications or launch gates.

### Confirmed provider-refund notification guidance — implemented 2026-10-24

Completed owner draft/preview/publish/default/history controls for generic English
follow-up guidance on confirmed provider refunds. Four illustrative previews cover
full/partial and test/live refunds. Actual notification titles, amounts, retained
amounts, destination, outcome and test-payment disclaimer remain backend-controlled.
The editor never issues a refund or changes payment state. Guidance allows 5–160
plain-text characters without links/markup/placeholders; owners are instructed not
to add money amounts, personal details or bank-credit timing promises.

The existing Cashfree reconciliation service renders and persists copy only after
its refund-evidence validation succeeds. Pending, failed, unconfirmed and zero
refunds do not create completion messages. Template version/fallback are saved in
the same local transaction as completion and its notice. Repeated/concurrent
reconciliation retains one notice, and queued text survives later publication.
Invalid editorial data uses default guidance; storage/outbox failure rolls back
local completion for recovery using the same provider refund identity. Dedicated
owner permission, fresh MFA/session, CSRF, reason, revision, preview expiry, audit
and replay protection apply to publication.

Validation passed: 719 backend/admin/Cashfree/notification tests, 472 admin UI
tests, lint/build and diff checks. Disposable PostgreSQL exercised schema up/down,
publication concurrency/replay, audit rollback, stale previews, refund completion
rollback/retry, one persisted notice and immutable refund facts. Provider calls
were mocked; no external payment was made.

Deploy new-table migration 167 before backend rollout. No application migration,
reset, content publication, restart or real notification occurred. Authenticated
browser, real-device and provider-delivery acceptance remain pending. Wallet and
dispute-specific notices, other payment templates, campaigns and provider delivery
monitoring remain separate pending workstreams; this is not launch certification.

### Dispute wallet-credit notification guidance — implemented 2026-10-24

Completed owner draft/preview/publish/default/history management for follow-up
notices after approved full wallet refunds, partial refunds and remainder credits.
The editor shows three illustrative scenarios and cannot issue money or close cases.
Amounts, recipients, wallet destination, titles and continued-review statements stay
backend-controlled. Guidance is 5–160 plain-text characters without markup, links
or placeholders; owners are instructed against private details, money amounts,
bank-transfer promises and case-closure claims.

The existing independently approved financial execution saves rendered copy and
template revision in the same serializable wallet/ledger/proposal transaction.
Storage failure rolls back the execution; corrupt editorial content uses recorded
default fallback. Retry protections remain intact. Partial-refund notices retain
the review statement, and traveler earnings retain the correct recipient and trip
destination. Queued notices keep their original text across later publications.
Owner permission, fresh MFA/session, CSRF, reason, version, expiring preview, audit
and operation replay protect content changes.

Validation passed: 639 backend/admin/wallet/notification tests, 11 focused financial
execution checks, 476 admin UI tests, lint/build and diff checks. Disposable
PostgreSQL verified schema up/down, concurrent publication/replay, audit rollback,
stale previews, restoration and persisted-notice immutability/rollback. Financial
service unit tests covered amounts, traveler recipient, held remainder, open case,
duplicate execution and template-storage rollback.

Deploy new-table migration 168 before the backend update. No application migration,
reset, publication, restart, actual wallet credit or notification occurred. Browser
and device delivery acceptance remain pending. Other wallet/payment notifications,
campaigns and provider monitoring remain separate workstreams; this module does
not complete all communications or certify launch readiness.

### Automatic ride wallet-credit notifications — implemented 2026-10-24

Completed normal traveler settlement and eligible wallet-refund recovery integration
with the existing wallet-credit guidance module. Renamed the admin screen to Ride
wallet-credit notifications and documented that the same guidance applies to both
automatic and dispute credit paths. Existing owner authorization, preview/publication,
audit, history and replay controls are reused. No new table or migration is needed;
previously published guidance should be reviewed for generic applicability.

The settlement/refund services preserve their eligibility, review-window, dispute,
partial-refund, provider-routing and money checks. They render guidance after those
checks and persist the final text/version in the same financial transaction. Failed
storage/outbox writes roll back balances, ledger and ride updates. Repeated/concurrent
calls credit once. Correct recipients and ride/trip destinations are preserved.
The editor does not execute credits, release disputed funds or change financial rules.

Validation passed: 647 backend/admin/wallet/notification tests, 476 admin UI tests,
lint/build and diff checks. Disposable PostgreSQL exercised the actual automatic
settlement and refund services with real wallets/ledger/outbox: concurrent credit
once, outbox rollback of balances and ride state, correct recipient/amount/version,
and retained dispute hold.

Existing migration 168 is required if not deployed; no additional schema change.
No application database reset/migration, content publication, restart, actual credit
or notification occurred. Authenticated browser and real-device navigation/delivery
checks remain pending. Other communications, provider monitoring and launch gates
remain separate; this does not certify full payment or production readiness.

### Completed: notification health module — 24 October 2026

Added owner-only Notification health navigation and dashboard with rolling 24-hour
and 7-day event-creation periods, manual refresh, loading/error/empty states and IST
timestamps. Recent events expose current failed/skipped counts and separate
provider-reference, delivery and read evidence. All-age backlog shows retryable,
due, overdue and exhausted events for ride/trip updates, document reviews and
support updates, with links to the existing inspection queue.

The backend rechecks active owner/MFA/session access and audits each view in a
repeatable-read transaction. Counts are bounded safe integers, response fields are
allowlisted, and no customer/message/provider-reference details are exposed.
Provider acceptance is not labeled delivery. Overdue means due now and created at
least 15 minutes ago; no contractual SLA or provider uptime is inferred. Other
channels, external provider monitoring and real-device delivery remain separate.

Validation passed: 626 admin backend tests, 480 frontend tests, lint and production
build, plus disposable PostgreSQL aggregate checks for cohorts, old backlog, retry
limits, provider evidence and excluded channels/entities. No migration, application
data change, provider call or notification occurred. Authenticated browser acceptance
and production-volume query performance remain deployment checks.

### Completed: map-service monitoring — 24 October 2026

Added owner-only Map services dashboard and a System health link. Five server
services expose cumulative recorded request/accepted-HTTP-response/429/other-error
counts, first/latest observation and latest outcome timestamps in IST. Explicit
loading, error and unrecorded states, refresh and investigation guidance are included.
Fresh owner/MFA/session authorization and read audit protect the API. Coordinates,
customer identity, keys, provider URLs and raw error payloads are excluded.

Server Google/Mapbox HTTP attempts feed atomic PostgreSQL counters asynchronously.
Four outstanding recording writes per process bound workload; local statement/lock
timeouts and swallowed storage failures keep telemetry independent from location
selection. Counts are best effort, with possible gaps during saturation or restarts.
Fallback and cooldown logic remain unchanged. HTTP acceptance does not prove usable
routes. Direct device requests, map tiles, remaining quota, billing totals, provider
uptime and active probes are outside this module. Reading the dashboard consumes no
provider quota. This completes recorded server-map evidence, not all external
integration monitoring or launch validation.

Deploy new-table migration 169 before the updated backend. Validation passed:
649 backend tests, 484 frontend tests, lint, production build, diff checks, and
isolated PostgreSQL concurrency/migration tests. Provider mocks covered rate limits,
fallback/cooldown and slow/failed nonblocking monitoring. No application migration,
reset, external provider call or production data change occurred. Authenticated
browser acceptance and production-volume performance remain deployment checks.

### Completed: payment webhook monitoring — 24 October 2026

Added owner-only Payment webhooks navigation/dashboard with recorded signature
rejection, signed payload parsing failure, missing order reference, reconciliation
return and reconciliation failure outcomes. First/latest observations display in
IST, with cumulative counts, refresh, loading/error/unrecorded states and permission-
guarded links to live/test payment inspection. Backend rechecks active owner/MFA/
session and audits the read; no private callback or customer evidence is exposed.

The callback handler preserves existing signature verification, reconciliation and
HTTP responses. It records asynchronously into a bounded, atomic aggregate table.
Duplicate callbacks count separately; reconciliation returning does not establish
payment success or booking. Environment labels refer to receiving server configuration,
not verified callback origin. Monitoring is best effort and can miss observations
under load/storage failure/restarts. Calls rejected before the handler are excluded.
There is no replay control, provider probe, charge, refund or money action here.

Deploy new-table migration 170 before rollout. Passed 733 backend tests (732 combined
admin/payment tests plus one telemetry-capacity check), 488 frontend tests, lint,
production build and diff checks. Disposable PostgreSQL verified concurrent counts,
environment separation, audited projection, catalog filtering, missing records,
storage-failure isolation and up/down/up migration. No application database change,
provider request, real webhook replay or financial operation was performed.
Authenticated browser, staging provider callback and production-volume acceptance
remain pending. This completes recorded callback monitoring, not payment-provider
uptime monitoring, backup verification or all release gates.

### Completed: integration configuration module — 24 October 2026

Added owner-only Configuration navigation and read-only server settings evidence
for payments, server maps, login OTP and admin security. The backend projects only
presence, recognized mode and narrow format results; it never returns secret values,
identifiers, domains or arbitrary environment variables. Fresh owner/MFA/session
checks and transactional read audit protect access. No configuration changes or
provider calls are exposed.

The UI distinguishes sandbox/live mode, missing/invalid settings, development
defaults and presence without verification. Loading, errors, manual refresh, IST
snapshot time and links to existing map/webhook/system evidence are implemented.
Documentation explains current-instance scope, startup-cached SMS configuration and
separate provider/workflow validation. Presence does not establish merchant approval,
quota, delivery, Redis reachability or production readiness. Device settings, push
credentials, backup verification and fleet-wide configuration remain outside scope.

Passed 638 admin backend tests, 491 frontend tests, lint, production build and diff
checks. Tests cover redaction, invalid values/defaults, query manipulation, permission
loss, revoked sessions and audit failure. No new migration, application data change,
provider request, OTP send, key rotation or configuration mutation occurred.
Authenticated browser and multi-instance deployment acceptance remain pending.

### Completed: wallet withdrawal oversight — 24 October 2026

Added owner-only Withdrawal oversight in Finance, with a dedicated withdrawals.read
permission, fresh owner/MFA/session checks and transactional audit. The queue defaults
to pending and supports status, age and bounded pagination. It reads explicit and
legacy withdrawal records, excludes package-linked entries and shows INR request
amounts, status, IST creation time, age, request/wallet IDs and legacy markers.
Invalid money/status/date evidence remains unknown. No customer contact, bank details,
provider references or raw failure messages are disclosed.

Wallet requests are not region-scoped journeys and can draw from mixed wallet sources;
regional staff are excluded. Recorded success does not prove bank receipt. There is
no provider probe, payout execution, approval, rejection or reserve adjustment in this
module. Existing consumer request behaviour is preserved. Bank payout execution and
independently approved reserve correction/rejection are explicitly still pending;
this does not complete the full wallet withdrawal lifecycle.

Passed 643 backend tests, 495 frontend tests, lint, production build and diff checks.
Disposable PostgreSQL covered legacy/explicit request scope, package exclusion,
status/age filtering, exact decimal presentation and stable ordering/page lookahead.
No migration, application wallet mutation, provider call or transfer occurred.
Authenticated browser and production-volume acceptance remain pending. Refresh/login
may be required for existing owner sessions to receive withdrawals.read.

### Completed: withdrawal reserve reconciliation — 24 October 2026

Added reasoned reserve inspection to the owner withdrawal queue. A dedicated
withdrawals.inspect permission, CSRF, fresh owner/MFA/session checks and audit protect
one repeatable-read snapshot of the selected request, wallet reserve and pending
requests. Exact paise comparison reports matches, signed mismatches or incomplete
evidence. Invalid amounts/reserves, legacy/package-linked entries and the 1000-entry
inspection bound prevent an inferred total or match. Frozen/restricted wallet state
is shown without changing it. The panel clears evidence on close, aborts obsolete
requests and explains that local matching is not bank evidence or release authority.

Passed 647 backend tests, 498 frontend tests, lint/build and diff checks. Disposable
PostgreSQL verified exact comparison, wallet/status isolation, frozen wallet evidence,
mismatches and legacy incomplete data. No schema change, application financial change
or provider call occurred. Browser and production-volume acceptance remain pending.
This completes the read-only reconciliation module; independently approved rejection,
reserve release and bank payout execution are still separate pending workflows.

### Completed: independently approved withdrawal rejection — 24 October 2026

Implemented the user-approved policy: no bank payout process has started; one owner
proposes rejection and a different owner approves; uncertain records stay blocked.
Owners get withdrawals.manage with fresh owner/MFA/session/CSRF enforcement, reasoned
history, five-minute actor-bound previews, proposals, independent approval/decline,
proposer withdrawal, stale-context detection and durable operation replay.

Eligibility requires an active wallet, exact reserve reconciliation and supported
modern reservation records with no payout/receipt/processed/refund evidence. Each
owner explicitly confirms no payout attempt, including outside Gilo. All pending
wallet requests must be supported and within the 1000-record bound. Proposer access
is rechecked on approval. Changed evidence, legacy data, mismatches and frozen or
restricted wallets block execution. Future manual/provider payouts must integrate
with these locks and attempt-evidence rules before being enabled.

Approval changes only the selected withdrawal reserve and request status, atomically
with proposal decision, before/after audit and an in-app customer payment notice.
Wallet balance, ride holds, minimum reserve and other pending withdrawal amounts are
preserved. Audit/notice failures roll back; concurrent retries release once. Customer
copy excludes internal staff reasons and links to WithdrawScreen. This is an in-app
record, not a promised push delivery or bank refund. Existing reserve inspection's
CSRF/body contract was also corrected and covered by UI tests.

Passed 658 backend tests, 503 frontend tests, lint/build and diff checks. Disposable
PostgreSQL validated independent approval, revoked proposer, payout/frozen/mismatch
blocks, preview expiry, concurrent replay, rollback, exact reserve-only release,
other-request reserves, financial audit, customer record, history and up/down schema.
Deploy new-table migration 171 before backend rollout. No application migration,
real wallet change, provider call or payout occurred. Browser/device and production-
volume acceptance remain pending. Bank payout execution and ambiguous historical
transfer resolution remain separate pending work; rejection/release is now implemented.

### Cashfree Payouts sandbox integration — 24 October 2026

User selected sandbox-first Cashfree Payouts with live transfers disabled. Implemented
an isolated backend adapter and CLI test runner with separate credentials, fixed
sandbox endpoint, INR validation, verified transfer/beneficiary/amount response,
no automatic submission retry, pending vs completed bank-credit distinction, and
sanitized unknown outcomes. A durable private local journal precedes each submission;
per-ID locks and recorded-ID rejection prevent repeated creation after timeout or
restart. Status checks reuse the original transfer. The owner configuration page
renders a new payout-presence section through its existing generic response view.

671 backend tests passed, including 12 dedicated gateway/runner cases and payout
configuration projection. Syntax/diff checks passed. No real wallets, reserves,
customer notices or provider accounts were changed. No migration required. Separate
sandbox credentials are absent locally, so provider-connected testing remains pending.
Runbook: /home/kalpesh/boxwatch-admin/docs/payout-sandbox.md.

Scope is the isolated sandbox integration, not the full withdrawal execution module.
Still pending: beneficiary ownership verification, independent admin payout approval,
durable database attempt evidence protecting reserves from concurrent rejection,
webhook/status reconciliation, exact-once financial posting, reversal handling and
customer notices. Live activation/funding and operational acceptance remain separate.

### Sandbox payout beneficiary review — 24 October 2026

Implemented the complete sandbox beneficiary review module in Finance: masked provider
lookup, explicit test-data confirmation, server preview, pending proposal, independent
owner approval, decline, approval revocation and paginated review records. Fresh owner/
MFA/session/CSRF enforcement and a dedicated permission protect the API. Each proposal
and approval re-fetches provider evidence; changed details, expired previews and revoked
proposer access block approval. Durable operation replay, version checks, audit rollback
and database serialization protect repeated/concurrent actions. Revocation works without
provider availability. UI preserves the same operation ID after an uncertain response.

Full account/contact data is discarded at the gateway boundary. New-table migration 172
stores only masked account details and a keyed fingerprint, with no customer/wallet link.
Provider verification and sandbox approval do not prove customer account ownership or
authorize customer withdrawals. Live transfer capability remains disabled; the operator
CLI remains separate from admin review. This is the sandbox beneficiary-review module,
not the bank withdrawal execution module.

675 backend and 509 frontend tests passed; six targeted UI tests passed again after
loading-state cleanup. Lint/build, syntax and diff checks passed. Disposable PostgreSQL
validated migration up/down, independent approval, concurrency/replay, rollback, stale
provider data/version, expired preview, proposer/session revocation, offline revocation
and masked history. No application migration, wallet change or real provider call ran.
Deploy migration 172 and refresh staff sessions before use. Provider-connected sandbox
and authenticated browser acceptance remain pending because sandbox keys are absent.

Next: durable admin payout-attempt/approval and reconciliation workflow, with strict
sandbox isolation, before connecting customer withdrawal balances. Real beneficiary
ownership verification, webhook/reversal posting and production activation remain open.

### Admin sandbox payout execution and reconciliation — 24 October 2026

Completed the manual admin sandbox payout module: approved beneficiary reference,
exact-INR amount, test confirmation, server preview, proposal, independent owner
approval/submission, pre-submission decline, paginated status list and reasoned provider
status checks. UI labels approval as submission and keeps the same operation ID on
uncertain responses. No customer wallet or withdrawal is connected.

Backend checks fresh owner/MFA/session/CSRF, current beneficiary approval/version and
provider fingerprint, active proposer and independent approver. Single-use five-minute
previews cannot create duplicate proposals. New migration 173 gives each proposal a
stable transfer ID and durable attempt record. The attempt and audit commit before
external POST; only the committing request sends. Retries never send again. Provider
observation writes are separate so post-send DB/audit failures leave a recoverable
unknown attempt. Check uses the original account context and transfer identity;
revoked beneficiary approval cannot block reconciliation of an existing attempt.

Reconciliation preserves terminal evidence against stale pending results, handles late
reversal and marks conflicting terminal observations for investigation. No force-state
or resend endpoint exists. Unknown/error states never release reserves or debit wallets.
Automatic scheduled reconciliation and payout webhooks remain pending, along with real
customer beneficiary ownership, withdrawal accounting and production activation.

Validation passed: 677 backend tests, 515 frontend tests, lint/build, syntax/diff checks.
Disposable PostgreSQL verified migration up/down, independently approved single send,
committed attempt before provider call, concurrent replay, audit failure before/after
send, timeout recovery, terminal conflicts/reversal, stale/revoked evidence, expired
single-use previews and provider account isolation. No live application migration,
customer mutation or provider-connected test occurred. Apply 173 after 172 for rollout;
sandbox credentials and authenticated browser acceptance remain pending.

### Automatic sandbox payout reconciliation and V2 webhooks — 24 October 2026

Implemented the next complete sandbox module: opt-in minute scheduler with cross-process
PostgreSQL exclusion, three-record batches, shared manual/automatic observation logic,
exponential failure backoff, daily terminal checks for reversals, and sticky conflict
review. No automated POST or customer wallet accounting is introduced.

V2 raw-body webhook intake verifies HMAC with an explicitly configured oldest-active
sandbox signing secret. Valid known transfer events create deduplicated receipt hashes
and advance scheduled GET verification; callback status/bank details are never trusted
as financial outcomes or stored. Unknown/unattempted transfers are ignored. Coalescing,
row locking, provider account scope checks and atomic audit rollback protect retries,
out-of-order events and worker failures. Sandbox keys and opt-in switches remain needed.

Original migration 173 now includes reconciliation scheduling/retry columns and index;
new table migration 174 stores minimal callback receipts. Already-migrated databases
need the added 173 schema as well as 174; no reset or migration was performed. Admin
integration settings expose switch/secret presence only. The payout list polls every
30 seconds while visible and pauses during commands or uncertain retries.

Passed 682 backend tests, full 515-test UI suite, then seven targeted payout UI tests
including visibility-aware polling; lint/build, syntax/diff checks and disposable
PostgreSQL lifecycle tests passed. PostgreSQL covered overlapping workers, callback
receipt deduplication, non-authoritative callback status, verified late reversal and
worker audit rollback. Provider traffic was mocked. Public HTTPS webhook registration,
actual signed delivery and sandbox acceptance remain pending. Customer beneficiary
ownership, real withdrawal accounting and live payout rollout remain separate work.

### Manual customer bank ownership review — implemented 2026-10-24

Customer Wallet → Withdraw now supports a private bank document submission, account
holder, repeated account number, IFSC and explicit consent. Full bank details and the
bounded document image are encrypted with a dedicated backend key; customer/admin lists
show only the last four account digits. Replacement submissions supersede earlier
approval. No documents are put in public uploads.

Finance → Bank ownership is owner-only. A current manually approved identity document
is required, and each owner must open bank and identity evidence, give a reason, and
explicitly attest ownership. One owner proposes; a different active owner approves.
Evidence previews expire and bind the current identity, profile name, record version
and submission. Changed evidence blocks approval. Rejection, revocation, duplicate
operation recovery, transactional audit and in-app decision notices are included.
Private previews clear on tab hiding and expiry. Customer status shows review needed
when approved identity no longer matches the bank review.

Required setup: new-table migration 175 and protected `BANK_ACCOUNT_ENCRYPTION_KEY`.
No database reset/migration or live bank operation was performed. Dedicated encrypted
bank records require a documented key backup/rotation and retention process before
production. See backend `docs/bank-ownership-review.md` for the integration contract.

Passed 684 backend regression/security tests, 522 admin UI tests, 8 targeted mobile
tests, admin lint/build and disposable PostgreSQL lifecycle checks. PostgreSQL verifies
independent approval, concurrency/replay, stale/changed evidence, missing identity/media,
replacement/revocation/rejection and audit/notification failure rollback. Device and
authenticated browser acceptance remain pending.

This completes the manual ownership-review module. Real withdrawal-to-beneficiary
binding, payout accounting/reversal handling, real provider acceptance and live rollout
remain separate pending work. Manual approval does not activate withdrawals, establish
bank account creditability, or authorize using real customer details in sandbox payouts.

### Withdrawal request → approved bank binding — implemented 2026-10-25

New requests use independently approved customer bank evidence, replacing the legacy
Easy Split vendor dependency for reservation. Wallet overview shows the verified account
suffix; mobile sends the exact review ID/version and persists it with an interrupted
request. A changed account requires refresh and renewed review before reservation.
Gilo custom popups replace native alerts in the withdrawal submit/result flow.

New-table migration 176 records the immutable bank approval/version and evidence hashes
alongside each request. Customer/wallet/bank/identity locks and one transaction protect
fund reservation plus binding creation. Duplicate/retried requests return the original
record, including after account replacement/revocation, and never reserve twice or
redirect to new bank details. Missing/corrupt evidence and stale identity block new
requests; verification outages preserve wallet viewing and prior-request recovery.

Owner oversight displays masked historical account/version and marks old requests with
no approved snapshot. Existing independently approved rejection releases eligible
unattempted new requests without changing wallet balance. Provider-attempt evidence
still blocks release. No provider request, application database migration/reset, or
feature-flag change was made. Withdrawal requests remain opt-in; live execution remains
separate. See backend docs/withdrawal-bank-binding.md for the execution boundary.

Passed 685 backend tests, 523 admin UI tests, 9 targeted mobile tests, admin lint/build,
and disposable PostgreSQL binding and rejection lifecycle checks. Tests cover duplicate
and competing requests, changed bank/identity, stale approval, encryption failure,
transaction rollback, original-request recovery after replacement, and exact reserve
release. Physical-device and authenticated-browser acceptance remain pending.

Next pending module: provider beneficiary validation and transfer execution/accounting,
including unknown outcomes, final wallet posting and reversals. Real customer accounts
must not be sent to the sandbox pipeline. Live activation remains disabled pending its
own configuration and acceptance checks.

### Withdrawal payout accounting and recovery — implemented 2026-10-25

Accepted policy: automatically release the reserve after a verified failure; restore a
previous debit after a verified reversal. Unknown/conflicting evidence does not authorize
new money movement. New attempt/posting tables (177–178) and the internal reconciler
record completion debit, reserve release or reversal credit once, with atomic audit and
in-app notice. Reversal retains the successful debit and adds a separate credit; the
customer-facing withdrawal outcome combines these records correctly.

Concurrency/version safeguards, provider-scope/identity/amount matching, exact reserve
checks and unique posting records cover duplicate, stale and out-of-order observations.
Frozen wallets remain frozen during recovery. Post-dispatch bank revocation does not
hide money movement. Contradictions after an earlier release/credit preserve that prior
accounting and require investigation rather than silently re-debiting a customer.
Independent rejection also checks the payout journal so an attempt cannot be overlooked
because a legacy external-reference marker is missing.

Owners can open Inspect payout accounting with a reason and see verified status,
accounting state, and before/after balance/reserve entries. Read access is audited and
excludes private bank/provider fields. The inspector cannot submit transfers, change
balances or override outcomes.

Passed 689 backend tests, 528 admin UI tests, admin lint/build, and isolated PostgreSQL
accounting/binding/rejection lifecycle checks. All provider results were mocked against
synthetic wallets. No application migration or bank transfer was performed.

Explicit scope: accounting/recovery and oversight are implemented; live payout dispatch
is NOT complete. There is no production adapter, public outcome-write API, scheduled
production reconciler or caller that creates/sends production attempts. New tables are
not populated by normal application activity yet. Remaining work is beneficiary
verification, two-owner payout approval, durable pre-POST registration/dispatch, provider
GET/webhook/worker integration and real sandbox/production acceptance. Keep live payout
activation disabled. See backend docs/withdrawal-payout-accounting.md for the contract.

### Production payout bank links — implemented 2026-10-25

New Finance > Payout bank links module verifies an existing production beneficiary
against a customer's current manually approved bank ownership and identity evidence.
The server compares the full account number, IFSC and normalized holder name. One owner
proposes; another active MFA-enabled owner independently previews and approves.
Versioned five-minute previews bind bank evidence, identity and provider credential
scope; stale evidence cannot be confirmed. Revocation works without provider access.
Exact operation retries and atomic audits prevent duplicate review changes.

The provider adapter is GET-only, uses separate production credentials, and is disabled
by default. It cannot create beneficiaries or send transfers. Real customer bank details
are never sent to sandbox. The frontend displays masked account details and historical
approval; future dispatch must independently recheck current eligibility.

Validation: 695 backend tests, 534 admin UI tests, lint/build and disposable PostgreSQL
lifecycle checks passed. Provider responses were mocked. No production API calls,
application database migrations or bank transfers were made. Migration 179 awaits
normal deployment. See /home/kalpesh/boxwatch-admin/docs/payout-beneficiary-links.md.

Next pending full module: independently approved withdrawal execution with durable
attempt registration and dispatch safeguards. Production reconciliation GET/webhooks/
worker wiring and provider acceptance remain pending. Live transfers stay disabled.

### Withdrawal approval and dispatch — implemented 2026-10-25

Finance > Withdrawal payouts now supports original-request previews, independent owner
approval, immutable bank binding verification, durable attempt registration before POST,
and immediate/manual verified GET reconciliation into wallet accounting. Amounts are
server-derived; staff cannot redirect the destination or edit the withdrawal amount.
Declining a payout proposal does not release reserved funds; the existing independent
withdrawal rejection process remains separate.

Unknown responses and process interruptions consume the one recorded attempt and keep
funds held. Retrying approval cannot submit twice. Provider GET verifies completion,
failure and reversal before debit/release/restoration. Active-wallet, exact reserve,
identity/bank/link, pending rejection, current owner/session, preview and credential-scope
checks prevent stale approvals. The owner UI shows provider status and wallet accounting.

Added migration 180 for payout approvals; no application migration was run. Production
read and dispatch flags remain false, and all provider testing used mocks. No actual
provider calls or bank transfers were made. Passed 700 backend tests, 541 admin UI tests,
lint/build and disposable PostgreSQL lifecycle tests, including committed journal before
POST, audit rollback, duplicate/concurrent approval, timeout hold and verified recovery.

Next full module: scheduled production reconciliation and signed production webhook
handling, including recovery when the owner is offline and post-completion reversals.
Provider configuration/acceptance and authenticated-browser acceptance remain pending.
Keep production dispatch disabled until operational recovery and acceptance are ready.
Implementation contract: /home/kalpesh/boxwatch-admin/docs/withdrawal-payout-dispatch.md.

### Automatic production payout recovery — implemented 2026-10-25

Recorded withdrawals now have scheduled GET reconciliation and a signed production
V2 webhook receiver. Neither path can submit transfers. Short row-lock claims and
expiring leases coordinate multiple application instances; retry backoff preserves
funds during outages. Daily terminal-state checks detect late reversals; contradictory
evidence pauses automation for investigation. Verified GET outcomes reuse existing
idempotent wallet postings and notices.

Webhook receipts deduplicate signed raw payloads without storing bank information.
Callbacks only advance/coalesce checks; they never authorize wallet movement.
The separately authenticated dashboard low-balance test is acknowledged without effects.
Admin payout cards expose next check, recovery errors and paused states. Configuration
inspection reports switches without exposing secrets.

Original migration 177 contains new scheduling/lease fields; new migration 181 stores
receipts. No application database reset or migration was run. All live flags remain
disabled. Passed 706 backend tests, 542 admin UI tests, lint/build, and disposable
PostgreSQL recovery tests using mocked provider responses. No bank transfer was made.

Remaining: deployment/provider acceptance (credentials, public HTTPS, V2 delivery,
restart recovery and real sandbox results), authenticated browser acceptance, and
operator monitoring/escalation for overdue or investigation-required payouts. These
are not established by passing local tests. Keep production dispatch disabled until
acceptance is complete. Contract: /home/kalpesh/boxwatch-admin/docs/withdrawal-payout-recovery.md.

### Payout recovery investigation inbox — implemented 2026-10-25

Finance > Payout recovery now provides a database-filtered queue for overdue checks,
expired worker leases, repeated failures, long-running unknown/pending transfers and
conflicting evidence. Open/escalated cases stay visible when a signal clears; new
adverse evidence resurfaces a resolved payout.

Owners inspect current evidence with a reason, take ownership, add notes, escalate
inside Admin or close after verification. Closure is assigned-owner only and requires
a recent verified terminal outcome, matching wallet accounting and clear signals.
Case actions cannot move funds, override provider status or resume paused automation.
Strict versions, session/role checks, operation replay and atomic audits protect updates.

Added migration 182 for recovery case ownership/status; no application migration/reset.
Passed 708 backend tests, 546 admin UI tests, lint/build, and disposable PostgreSQL
lifecycle checks including concurrent/replayed claims, stale versions, audit rollback,
escalation, closure gating and resurfacing new evidence. No provider calls or transfers.

Remaining payout work: actual provider/deployment acceptance and operating procedures
for evidence conflicts that cannot be cleared by verified status checks. No financial
override was added. Production flags remain disabled; authenticated-browser and real
provider testing remain pending. See backend docs/payout-recovery-inbox.md.

### Payout operations health — implemented 2026-10-25

Finance > Payout operations health now combines production switch states, recorded
backlog counts, oldest unconfirmed attempt, latest matching authenticated callback
receipt and worker invocation evidence. The recovery sweep records activity through
the existing automation heartbeat service. Disabled, missing, stale and unavailable
observations remain distinct. A returned invocation is not presented as proof of bank
credit or successful reconciliation of every record.

The owner-only audited page links to the recovery inbox and payout checks. Refreshing
makes no provider call and cannot move money. Secrets, bank fields and raw callback
data are excluded. No new schema or application migration/reset was required.

Passed 713 backend tests, 550 admin UI tests, lint/build and disposable PostgreSQL
checks for persisted heartbeat states, backlog aggregation and receipt evidence.
All provider responses were mocked; no transfer was made.

Remaining: provider/deployment acceptance, real callback delivery, restart verification
and authenticated browser acceptance. Flags remain disabled. Monitoring now exposes
recorded evidence for these checks; it does not establish live readiness by itself.
See backend docs/payout-operations-health.md.

### Payout release acceptance tooling — implemented 2026-10-25

Added backend `test:payouts:acceptance`: repeatable unit coverage and nine independent
Unix-socket-only disposable PostgreSQL suites, sanitized child environments, command
timeouts, cleanup and a private JSON report with per-suite logs. It never loads the
application environment or calls a real provider. Added `payouts:preflight` for explicit
runtime environment consistency without exposing secrets or changing flags.

Passed 719 unit tests and all nine database suites. No frontend behavior/schema change,
application migration/reset or live activation. The report explicitly distinguishes
local coverage from unperformed provider and deployment acceptance.

Phase 8 remains externally pending: real sandbox provider evidence, public webhook
delivery, deployment/restart/restore drills, authenticated browser acceptance and
finance/operations signoff. These are not completed by passing local mocks. See
backend docs/payout-release-acceptance.md for commands and the acceptance checklist.

### Local payout backup/restore drill — implemented 2026-10-25

Added a tenth disposable PostgreSQL acceptance suite: pg_dump custom archive restored
into a separate empty database, exact comparison of all fixture tables, corrupt-archive
rejection, encrypted evidence recovery/key-loss checks, concurrent debit/reversal replay,
unknown holds, sticky conflicts and expired worker-lease recovery through GET only.
The source snapshot must remain unchanged. No application database or real provider used.

The recovery runbook explicitly requires dispatch to remain disabled until the backup's
possible data-loss window is reconciled against external provider evidence. Missing
journals after an old backup cannot be protected by local idempotency alone.

Local acceptance passed 719 unit tests and ten database suites. No UI/schema change or
live activation. Actual full-schema deployment backups, key/object-storage recovery,
retention/RPO/RTO decisions and provider reconciliation remain external acceptance work.
See backend docs/payout-disaster-recovery.md. This is a local payout drill, not a claim
that production disaster recovery or all Phase 8 gates are complete.

### Cross-module admin database acceptance — implemented 2026-10-25

Added backend `test:admin:acceptance` with an explicitly reviewed manifest of all 41
current PostgreSQL integration suites. Each gets its own isolated temporary cluster;
application database/provider environment is not inherited. Unit coverage enforces
manifest completeness and rejects unsafe paths/duplicate suite names. Reports list
planned suites separately from executed results and stop on failure. The existing
payout-only runner remains supported through the same implementation.

Coverage now runs together across support, restrictions, catalogs, pricing/policies,
legal consent, guidance, notifications, reports, payments and withdrawal workflows,
including backup/restore. This aggregates existing workflow tests; it does not imply
that every production scenario or the full application schema is covered.

Passed 721 backend unit tests, 41 database suites, 550 frontend tests, frontend lint
and production build. No feature flags, application migrations or real transfers were
changed. Redis/socket, authenticated-browser, real-device, real-provider and deployment
acceptance remain separate gates. See backend docs/admin-release-acceptance.md.

### Payment/refund acceptance — in progress, 2026-10-25

Read-only provider probe confirms Payment Gateway sandbox credentials and required
local payment schema. Current configuration is sandbox checkout-only; traveler
settlement is disabled. The database contains no sandbox payment records, so actual
checkout/paid-order/refund/webhook acceptance has not been established. A test ride
reference was requested; none was supplied. Do not count this gate as complete.

Passed 204 payment-related backend tests and nine mobile checkout tests. Expanded the
regular acceptance unit selection to include all Cashfree/payment/refund tests, rather
than only the earlier admin/payout subset. Separate Cashfree Payouts sandbox keys are
absent and its enablement is off. No financial transactions or live flags changed.

Next provider evidence needed: a completed sandbox ride payment and callback receipt,
then controlled original-source refund verification. Payout provider acceptance needs
its separately configured sandbox credentials. See backend docs/cashfree-launch.md.

### Admin session lifecycle hardening / browser acceptance — 25 October 2026

Authenticated browser acceptance is in progress. The frontend runs locally, but the
browser shows API-unavailable on the staff sign-in page and has no authenticated
session. Backend availability and staff sign-in were requested; no credential or role
changes were made. Do not count the multi-role walkthrough as passed.

Fixed an auth UI race found during review: delayed session checks can no longer
restore a workspace after expiry/logout or overwrite a newer sign-in. Async transitions
use generation guards, obsolete responses are ignored, and failed logout preserves
current state while reporting failure. Five regression cases cover these transitions.
Server-enforced authentication/permissions remain authoritative and unchanged.

See backend docs/admin-browser-acceptance.md for observed evidence and the outstanding
role, regional-access, stale approval, session and accessibility walkthrough matrix.

### Local admin bootstrap and configurable development MFA — 25 October 2026

User authorized a staff seeder, login and environment-controlled MFA. Fixed the Vite
API default from PostgreSQL port 5432 to backend HTTP port 3000. Configured local admin
secrets, applied pending migrations 145–182 and created the first development owner
through an opt-in, development-only, non-overwriting transactional seeder.

After a private backup, repaired 29 missing existing-table columns from their original
migration definitions, without reset/deletion or adding alteration migrations. This
was necessary because earlier original migrations had changed after local application.
A repeat inspection found no missing persisted model columns.

ADMIN_MFA_REQUIRED defaults true; false works only in development/test. Production and
unknown environments remain mandatory-MFA. Password-only tokens are distinctly marked,
rejected when MFA is re-enabled, and do not fabricate enrollment. Admin service checks,
assignee selection, password changes and UI labels honor the policy while preserving
role/scope/session/CSRF/independent-approval/audit requirements. Recovery operations
still require an enrolled authenticator. Development mode is visibly labelled.

Browser evidence: owner login succeeded, overview showed real records, staff alerts
reported zero queues instead of unavailable, team list showed the seeded owner, and
account security opened. No money action or staff access mutation was submitted in
browser. Full multi-role/device/provider acceptance remains separate.
See backend docs/admin-development-setup.md for configuration and seed instructions.

Validation for the development bootstrap: 849 backend tests and 41 disposable database
suites passed; 556 frontend tests passed, followed by five password-form tests after
removing residual MFA-only instructions. Final lint/build passed. Browser owner sign-in,
team status and account-security reads verified. The signed-in tab remains available.

### Local matching queue outage/restart acceptance — 25 October 2026

Added `npm run test:queue:acceptance` in the backend with disposable socket-only
Redis instances, bounded fixtures and cleanup. Verified read-only health counts,
no payload disclosure, paused/persisted jobs across restart, bounded unavailable
status during outage, recovery afterward, duplicate job IDs, retry/exhaustion, and
reconnection of an existing producer/worker. Registered matching queue/worker error
listeners and corrected retry logging that previously labelled every failure permanent.
Targeted matching-worker and Admin-health regressions passed.

This closes the local Redis restart sub-process, not the entire real-time deployment
acceptance group. Synthetic worker tests do not establish business-side-effect
idempotency. Active-job crash/replay, actual multi-instance sockets, mobile reconnect
and deployment failover/restore remain pending. See backend
`docs/queue-release-acceptance.md` for the repeatable command and exact scope.

### Active worker crash recovery and invitation retry — 25 October 2026

Extended the isolated queue acceptance command with a separate worker process killed
by SIGKILL while holding an active job. A replacement worker detects the expired
lock, reclaims the stalled job and completes it. The existing Redis outage/restart
checks also passed. Production lock timings and application Redis are unchanged.

Fixed transient invitation database errors being swallowed: they now fail the job
attempt so BullMQ can retry. Targeted worker, discovery and search-recovery tests
passed, covering insert retry, duplicate invitation replay, cancelled/expired search
state and rider-choice behavior. These use mocked business dependencies; the actual
process-crash test uses a synthetic handler and real isolated Redis.

Remaining gap discovered: match/discovery persistence and notification persistence
are separate; a crash between them can lose a notification. A transactional outbox
and real database crash/replay checks remain pending. Do not count this as full
notification durability or real-time module deployment acceptance. Multi-instance
sockets, device reconnect and deployment failover also remain pending.

### Transactional matching notifications — 25 October 2026

Closed the saved-match/missing-notification persistence gap for discovery, worker
invitations, inline development matching and direct rider traveler selection. Each
new match/invitation and queued notification commit together. Ride locks and existing
uniqueness protect replay; notification insertion failure rolls back new match state.
Reused NotificationEvent and the existing retry sweeper, with immediate post-commit
kick and minute-scheduler recovery. No new table or migration required.

Added ride_matching to automatic retry/health and owner-authorized audited one-extra-
attempt recovery. Admin health labels this channel Ride matching. Persisted delivery
emits matching socket events without re-persisting them and retains stable push IDs.

Validation passed: 82 targeted ride/controller/notification tests, 849 backend
regressions, two disposable PostgreSQL suites (notification retry/outbox and health),
and four Admin notification-health UI tests. Database checks cover atomic rollback,
concurrent discovery, invitation replay and fresh competing sweepers after commit.
Report: /tmp/gilo-matching-outbox-VTkecH/report.json.

This closes matching outbox persistence/retry implementation. Provider/device delivery
and multi-instance socket acceptance remain pending. External delivery is at-least-once,
not exactly-once; a provider-success/database-commit crash may repeat a push with the
same ID. Historical missing notices are not backfilled. Backend restart is required
for an already-running process to load the updated code.

### Local multi-instance socket recovery — 25 October 2026

Implemented and verified the local transport recovery step in boxwatch-socket.
Shutdown now disconnects only its own clients, awaits Socket.IO closure, suppresses
late offline broadcasts and closes adapter connections without hanging on QUIT.
A pending presence write no longer blocks connection setup. Redis subscriber recovery
signals connected local clients to refresh authoritative state. Redis reconnect delay
remains capped while retries continue after extended outages.

`npm run test:cluster` uses the actual attachSocket module, three ephemeral local
Socket.IO instances and disposable Unix-socket Redis. Verified cross-instance delivery,
user-room isolation, healthy-node continuity during shutdown, Redis recovery refresh,
new-instance delivery and startup with a pending presence write. Authentication and
business handlers are fixture replacements. All 16 socket unit regressions passed.
See /home/kalpesh/boxwatch-socket/docs/socket-cluster-acceptance.md.

Physical-device recovery and deployed JWT/database/load-balancer/API-emitter end-to-end
acceptance remain pending. This is not whole-deployment sign-off. Restart the socket
service to load changes in an already-running process; application Redis was untouched.

### Mobile My Activity missed-event recovery — 25 October 2026

Implemented recovery for My Activity while the screen stays open. Previously it only
reloaded on navigation focus/manual refresh. It now uses the existing foreground
polling hook (30 seconds while visible/active, immediate foreground return) and a
focused authenticated socket subscription for reconnect, relevant ride/trip events,
matching refresh hints and journey notifications. Hints trigger API reload; payloads
never directly replace journey status.

The new activity realtime hook coalesces event bursts, serializes its event-triggered
loads with one follow-up when needed, ignores unrelated support updates, pauses in
background and detaches its own listeners on blur, logout/token change and unmount.
The screen retains its version guard against older API results after navigation.
Polling/manual loads retain that version guard; no claim is made that all refresh
sources share a single request queue.

Validation: 17 tests passed across activity realtime recovery, screen focus/stale
response handling, foreground polling and socket-session tests. New hook lint and
diff whitespace checks passed. Evidence: /tmp/gilo-activity-recovery-final.log.
No backend/schema/deployment changes. Reload the mobile bundle to load the change.
Physical Android/iOS background and network-loss checks remain device acceptance.

### Full application-schema migration and restore acceptance — 25 October 2026

Added `npm run test:schema:acceptance` and registered the full-schema suite in the
reviewed Admin acceptance manifest. All 159 actual migration modules apply, reverse
and reapply in a disposable PostgreSQL cluster. A full custom-format dump restores
into a separate empty database. Every public table's data and logical schema,
constraints/index predicates, enums, migration metadata and sequence states compare.
Restored foreign keys reject invalid references; sequence allocation advances;
a damaged archive fails without modifying the restored state. Application DB untouched.

PostgreSQL restore compacts dropped-column slots and reparses equivalent literal-array
casts: comparisons normalize just those forms, preserving CHECK/index expressions.
No migration changes were necessary. 849 unit regressions and the full-schema suite
passed. Report: /tmp/gilo-schema-acceptance-cTdQuB/report.json.

The full-schema local recovery gate is complete. This is not seed-all/CLI-env acceptance
or production backup provisioning. Production roles, file/object storage, encryption
keys, offsite backups, retention and actual deployment RPO/RTO restore evidence remain
pending. See backend docs/admin-release-acceptance.md for the precise scope.

### Safe clean-install and repeatable default seeding — 25 October 2026

Verified all 20 seeders against the complete migrated disposable schema. Found and
fixed destructive category/luggage reseeding and duplicate default rows. Master-data
up paths now insert missing logical keys under transaction-scoped locks, preserving
existing IDs and administrator edits. Singleton rules initialize only empty tables.
Help-topic insertion also uses this mechanism. No application database was modified.

Demo travelers with test PINs/approved KYC/test balances are no longer created by
normal seed-all. GILO_DEMO_SEED_ENABLED=true explicitly enables them only when
NODE_ENV is development/test; production/unknown environments reject opt-in before
writes. Existing demo data is not automatically removed. Owner seeding retains its
separate opt-in guard. Setup flags documented in .env.admin.example and release docs.

Validation passed: 849 selected backend tests, six demo-fixture tests, all 159
migration up/down/up steps, 20 seeders, repeat/concurrent seed preservation (including
edited settings and a concurrent missing-key insert), opt-in demo FK checks and full
seeded database backup/restore. Report: /tmp/gilo-schema-acceptance-BrI0zc/report.json.

This completes seed-up/bootstrap acceptance. Legacy master-data seed-down remains
destructive and is not an admin-data rollback workflow. Deployment-specific CLI/env
configuration, production backups and external provider/device gates remain separate.


### Payment and refund verification — 25 October 2026

Local acceptance expanded and passed: 849 selected backend unit tests, six
isolated PostgreSQL suites, and 32 mobile tests across four suites. New command:
`npm run test:payments:acceptance` in the backend. Report:
`/tmp/gilo-payment-acceptance-3ZaLpJ/report.json`.

The new actual-service/PostgreSQL lifecycle suite verifies eight concurrent refund
workers, lost provider responses, local rollback after provider success, held/failed
refund states, escrow ownership mismatch and successful payment after cancellation.
Provider responses are simulated; this does not establish real provider acceptance.
The admin acceptance manifest also includes this suite.

The read-only sandbox credential probe passed. A fresh aggregate inventory still
found zero payment records. Actual SDK checkout, original-source full/partial refund
and deployed public webhook delivery remain pending a normal sandbox test payment.
No payment, refund, production flag or application database record was fabricated or
changed. Traveler marketplace settlement remains disabled in checkout-only mode.

Evidence matrix and exact remaining steps:
`/home/kalpesh/boxwatch-admin/docs/payment-refund-acceptance.md`.


### Bank payout verification — 25 October 2026

Local verification passed: 856 backend regression tests, ten disposable PostgreSQL
suites, 59 admin tests across eleven suites and 11 mobile tests across three suites.
Report: /tmp/gilo-payout-acceptance-i2Ye6v/report.json.

Fixed the standalone sandbox CLI journal account-binding gap: credential changes
and legacy journals with no account evidence block lookup without rewriting history.
Added payouts:sandbox:check for configuration checks and an optional read-only test
beneficiary lookup. The example env now includes disabled sandbox settings.

Provider acceptance remains pending: actual Payouts sandbox credentials are absent;
existing checkout credentials were not repurposed. Production dispatch stays disabled.
No provider transfer or application wallet mutation was performed. Full evidence and
remaining provider/webhook steps: /home/kalpesh/boxwatch-admin/docs/bank-payout-verification.md.


### Admin browser acceptance — 25 October 2026

Authenticated local browser checks now cover owner, operations, support, finance,
verification and a second owner. Maharashtra endpoint filtering returned eight
in-state trips versus nine for owner; regional identity/selfie views stayed hidden.
Direct unauthorized page/API requests were denied. Revoked finance sessions returned
to sign-in on refresh. Empty results, invalid date ranges, reason-required tracking
inspection and invalid payout preview were verified without financial mutations.

Fixed two browser findings: failed lazy modules now show a recoverable workspace
screen instead of blanking the app; navigation now filters by server permissions,
including compact navigation and a permitted landing page. Refreshed the local Vite
cache to restore failed module downloads. Backend permissions were not weakened.

Validation: full 560-test admin suite, build and lint passed; four additional
navigation tests passed after matching the project test filename convention.
All five authorized temporary staff accounts were deactivated, their sessions revoked,
password hashes cleared and temporary credential file removed. Original owner restored.

Still pending: mandatory-MFA staging checks, populated financial/case/evidence approval
and stale-preview browser workflows, complete viewport/keyboard matrix and remaining
safety/analyst/auditor roles. These are not implied complete by empty-page navigation.
Evidence: /home/kalpesh/boxwatch-admin/docs/admin-browser-acceptance.md.


### Real-device ride/trip acceptance — 25 October 2026

Physical execution is deferred at the user's request until phones are connected.
ADB is available, but no devices were attached. Android offline debug assembly
passed; all 81 mobile Jest suites (443 tests) passed after fixing two native-test
boundaries. These are preparation checks, not physical-device acceptance.

The 22-case device matrix and evidence template cover matching, request updates,
payments, OTP, tracking interruptions, cancellation, early trip ending, disputes,
auth recovery and notifications: /home/kalpesh/BoxWatch/docs/real-device-acceptance.md.
All physical cases remain NOT RUN, including release-like build behavior and
real sandbox payment recovery. No device installation or financial action occurred.


### Real-time recovery local follow-up — 25 October 2026

User chose local environment. Fixed API emitter Redis URL precedence, socket Redis
URL retry consistency, bounded readiness with adapter health, and shutdown timeout.
21 unit checks and isolated cluster/emitter recovery passed. Local socket health,
readiness and invalid JWT rejection passed. API port 3000 was stopped. Valid-user
API recovery, deployed failover/load balancer and phone testing remain pending.
Details: /home/kalpesh/boxwatch-socket/docs/socket-cluster-acceptance.md.


### Admin visual refresh — 25 October 2026

Applied the supplied shadcn dashboard reference to the shared workspace and journey
overview: inset white surface, neutral searchable/collapsible sidebar, compact toolbar
with Base UI account dropdown, reusable input component, shadcn metric cards and
status distribution indicators. Existing permissions, real counts and filtered links
are preserved. This is a shared-shell/dashboard pass, not a claim that every module's
forms and tables have been individually redesigned. No third-party paid template was
installed. Desktop sidebar search/empty results/collapse, account menu Escape behavior
and narrow-screen stacking were checked in the authenticated local browser.

### Verification settings — implemented

Policies includes environment-independent identity, selfie and paired vehicle/licence
approval requirements. The existing policy workspace provides switches, activation
picker, modal preview, direct owner save and audit history.
Strict defaults remain enabled. Waiving a requirement does not mark evidence approved.
Backend matching, publication/start and new booking checks consume the effective policy.
Local migration 183 adds only the verification policy history table. Focused backend
and frontend tests pass; physical-device verification remains a separate check.

### Dedicated System Settings workspace

`/system-settings` now has its own Configuration sidebar entry. Verification
requirements have moved from Pricing & policies into this workspace. The settings
directory groups existing journey policies, master data, banners, legal content,
notification templates, integrations and access controls by purpose and permission.
Deep links select verification, journey policies or integrations; existing routes
remain compatible. Integration secrets and deployment-only settings remain managed
through protected server configuration, with read-only inspection in Admin.

Verification settings support one owner: apply immediately by default or schedule with the shared calendar/time picker. Existing pending proposals can be approved by their owner. Financial and other policy approval workflows retain their existing checks.
