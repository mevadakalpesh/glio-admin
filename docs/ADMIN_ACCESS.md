# Gilo Admin — staff access foundation

## Delivered in phase 1

Dedicated `/api/admin/v1` staff APIs, separate from consumer JWTs; password plus
RFC 6238 authenticator verification; first-sign-in enrollment; ten one-use recovery
codes; hashed opaque session tokens in HttpOnly SameSite=Strict cookies; same-origin
and CSRF enforcement; staff invitations; role/disable controls; transactional access
audit; sign out current/all sessions; last active MFA-enrolled owner protection.

Sessions have an eight-hour absolute lifetime and a 30-minute idle lifetime.
Changing staff access requires sign-in within 15 minutes and revokes that account's
sessions/challenges. Password verification alone never creates a session. Each
accepted authenticator time step can be used once. Recovery requires the password
and a saved recovery code, and revokes previous sessions. Codes are displayed once
and stored hashed. Authenticator secrets use AES-256-GCM with staff ID as AAD.
Five failed password/MFA attempts lock the account for 15 minutes. HTTP authentication
also has a per-process IP limit of 15 requests per 15 minutes.

The owner can manage staff and view audit; the auditor can only view audit. Other
role names are reserved and have no operational permissions yet. No consumer,
financial, document or live tracking data is exposed by this phase.

## Local setup (operator actions; not automatically executed)

1. Back up the database. Run pending migrations with `npx sequelize-cli db:migrate`
   from the backend. Migration `145-create-admin-access.js` creates new tables only.
   Do not reset your database to install admin access. On an existing installation,
   inspect migration status first because this command applies all pending migrations.
2. Add server-only environment values using `.env.admin.example` as a reference.
   Generate a unique 32-byte key with `openssl rand -hex 32`, store it securely as
   `ADMIN_MFA_ENCRYPTION_KEY`, set `ADMIN_ENABLED=true`, and set
   `ADMIN_PUBLIC_ORIGIN=http://127.0.0.1:5173` for local development.
   Keep the key stable and backed up: replacing it makes enrolled secrets unreadable.
3. Run `npm run admin:provision-owner` in an interactive backend terminal. Enter the
   owner's name/email and a unique password (14+ characters, maximum 72 UTF-8 bytes).
   It refuses to provision when any staff account exists. No default credentials.
4. Start the backend on port 5432. Start `/home/kalpesh/gilo-admin` with `npm run dev`.
   Open `http://127.0.0.1:5173` (not localhost: it is a different origin).
5. Sign in, enter the setup key in an authenticator as a time-based Gilo Admin
   account, verify its code, and save the recovery codes in a password manager.
6. Invite staff from Team & access. Share the one-time activation link privately;
   this phase does not send email. Links expire in 24 hours; the token is in the URL
   fragment and removed from browser history on activation-page load.

Frontend `/api/admin/v1` requests are same-origin. The local Vite proxy uses
`ADMIN_API_TARGET` (default `http://127.0.0.1:5432`). No secret uses a VITE_ prefix.

## Production deployment prerequisites

Use a dedicated HTTPS admin origin and same-origin API reverse proxy. Set
NODE_ENV=production and the exact HTTPS ADMIN_PUBLIC_ORIGIN; cookies become Secure.
Preserve the browser Origin header. Configure proxy trust narrowly in Express and
verify actual client IPs before relying on the IP limiter. Multi-instance deployment
needs a shared rate-limit store / edge protection. Keep server clocks synchronized.
Protect database backups and the encryption key separately. Retain access audit
according to the approved retention policy; do not expose audit-write APIs.
Do not enable admin traffic until migration, secret storage, reverse proxy,
restore and authentication checks have been run in staging.

## Verification and remaining work

`npm run test:admin`: crypto vectors, MFA replay, failure persistence, recovery
reuse/revocation, session expiration, invitations, role checks, last-owner checks,
and HTTP origin/cookie/CSRF boundary. Service tests use an in-memory repository;
PostgreSQL transaction/locking and migration execution need staging integration
validation. HTTP tests bind a temporary loopback port. Frontend has build/lint and
login/recovery rendering tests. No real account was provisioned by this change.

Still planned: invitation renewal, password change/reset, MFA device replacement
and recovery-code regeneration, recovery requiring operator identity verification,
session list/individual revocation, region scopes, audited evidence reads/exports,
audit filters and retention jobs. Never recover accounts by editing a consumer role
or disabling MFA globally. If all recovery methods are lost, stop and use a reviewed
operator recovery procedure; no unauthenticated reset endpoint is provided.

Operational modules (rides/trips, cancellations, disputes, payments, master data,
verification and tracking) remain separate planned phases. This is a secure-access
foundation, not a complete or launch-certified admin release.

## References

- https://www.rfc-editor.org/rfc/rfc6238 — TOTP and test vectors.
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html

## Read-only journey inspection — 18 October 2026

Owner now has `journeys.read` for `/api/admin/v1/journeys/trips` and `/rides`,
with `/:id` detail endpoints. Other roles remain denied until operational scopes
are implemented. Each successful list/detail read is audited before responding.
No new migration is needed for this module.

Reference, status, from/to dates and page filters are server-validated. Page size
is 25 with stable created_at/id ordering. Trip date boundaries are interpreted in
Asia/Kolkata; ride filters use the requested ride_date, not rescheduled pickup.
Trips include ride_only/both and exclude package_only, including direct detail
access. Details use bounded activity pages and exclude unstructured metadata.
Only city/state, journey state/times/capacity and recorded ride fare/escrow fields
are exposed. No full addresses, participant contacts, documents, GPS coordinates,
payment references, pickup codes or free-text evidence are returned.

This adds trip/ride inspection, not the full phase 2. Overview metrics, users,
verification inspection, scoped staff access, related-record navigation and
operational controls remain planned. Live database verification still requires
the earlier admin configuration and owner provisioning.

## Overview and people inspection — 18 October 2026

Owner now also has `overview.read` and `people.read`. GET `/overview` reports
current status counts across all dates, using a repeatable-read database snapshot.
Trip counts exclude package-only trips. It is not a live tracking, revenue or
conversion report. Unknown status values are shown explicitly, not dropped.
GET `/people` supports name/exact-ID search, account-state filter and bounded
pagination; GET `/people/:id` shows safe account fields and linked journey counts.
Phone and email masking occurs on the server. Name search terms are not copied
into audit metadata. Read events are audited, and audit failure fails the read.

People includes all customer accounts, since legacy account roles do not reliably
identify ride participation. Linked trip lists use user_id; linked ride lists use
passenger_id. They are not lists of every ride carried by that traveler. The
journey list supports a validated `person` UUID filter for these links.

Wallet values, PIN hashes, push/device tokens, full contacts, document URLs and
verification flags are excluded. Legacy KYC/eKYC defaults currently include
approved/true, so the people view deliberately does not claim verified identity.
Verification evidence review, restrictions and contact reveal remain unimplemented.
All views remain owner-only until scoped operational access is introduced.
No migration or customer-record modification is required for this delivery.

## Verification evidence inspection — 18 October 2026

Owner-only `verification.read` and `verification.evidence.read` permissions expose
paginated KYC document, selfie and passenger-trip vehicle/licence upload queues.
GET `/verification/:kind` accepts documents/selfies/vehicles, account UUID, recorded
status (documents/selfies only), and page. No document numbers or media paths are
returned; metadata includes evidence availability and an opaque file revision.

POST `/verification/:kind/:id/media/:side` requires the staff session, CSRF token,
review reason (5–500 characters) and revision from the queue. A changed upload
returns 409 and must be refreshed. The read is audited before bytes are sent.
Responses are no-store WebP images, processed to strip image metadata and bound
resolution. The reader supports only local uploads/kyc, uploads/selfie and
uploads/trip image files (10 MiB input, 20 megapixel decode limit). Remote URLs,
traversal, symlink escape, unsupported formats and unavailable files fail closed.
The browser uses an in-memory object URL and revokes it on close/unmount. This
cannot prevent an authorized operator from taking screenshots or saving content.

This is inspection, not approval: no approve/reject endpoint, identity validation,
licence eligibility decision or vehicle review state is introduced. Recorded
statuses and timestamps are displayed as stored; trip creation time is not claimed
as the actual upload time. The existing user model verification defaults remain
excluded from the admin people screen.

### Storage limitation requiring follow-up before launch

The existing shared saveMedia service requests S3 ACL public-read. This delivery
DOES NOT change existing bucket/object ACLs, fetch arbitrary remote URLs or expose
those storage URLs to admin users. S3 evidence viewing is deliberately unsupported
until private-object upload, existing-object remediation and authenticated access
for affected clients are implemented and verified. Existing trip upload access is
also consumer-token gated rather than per-record scoped; review it before rollout.
Do not describe the overall evidence storage system as private on this basis.

No migration or database reset is required. Tests cover path safety, actual image
processing with generated fixtures, revision checks, audit failures, permissions,
reason capture, unavailable storage and browser image cleanup. Actual uploaded
records, deployed storage and staff sessions still need staging validation.

## Private verification storage — 18 October 2026

This supersedes the local-only viewer limitation above. New S3 KYC, selfie and
licence uploads use a separate S3_PRIVATE_BUCKET_NAME with all four bucket-level
Block Public Access controls enabled. The service checks these controls before
upload/read, requests AES256 encryption and omits ACLs. It stores an opaque
s3-private reference, not a public URL. Missing configuration fails closed; configure
the bucket before deploying this change to an S3 environment. Existing vehicle
photos retain their current delivery path. New local licences use
uploads/verification-license, which is not mounted as public static content.

The admin viewer reads private objects through the server SDK, checks input size,
uses a conditional bounded object read, strips metadata and applies the same image
limits as local files. Existing session, reason, revision and audit requirements
still apply. No presigned URLs or storage credentials are sent to the browser.
The server identity needs s3:GetBucketPublicAccessBlock on the private bucket and
s3:PutObject, s3:GetObject and s3:DeleteObject on its kyc/, selfie/ and
verification-license/ prefixes. Keep bucket policy restricted to the backend
identity. This change does not create/configure the bucket or alter IAM.

### Existing files and rollout

Run `node scripts/inventory-verification-media.js` with the configured database
for a read-only inventory. It uses bounded pages and prints model/record ID/field
and storage classifications, never image bytes, document numbers or raw URLs.
Protect any saved report as operational data. This is a migration planning tool,
not an apply command; concurrent uploads may change the inventory while it runs.

Legacy remote files and licences in the shared trip folder are NOT migrated by
this change. Next remediation must copy each file into protected storage, verify
its content, conditionally update an unchanged database reference, verify app and
admin access, then revoke/remove its original public copy. Copying alone does not
make the old object private. Do not disable the whole trip asset folder: legitimate
vehicle photos share it. Inventory private references also require deployed bucket
validation; their prefix alone does not prove privacy. No cloud changes, database
updates or deletions were executed in this implementation step.

Staging checks still required: private bucket permissions and fail-closed behavior,
new KYC/selfie/licence upload, existing vehicle photo rendering, licence reuse,
authorized admin viewing, and unauthenticated access denial. No approval decisions
or verification-team role grants have been added.

## Existing evidence migration tool — 18 October 2026

`node scripts/migrate-verification-media.js` now supports a single-record preview
(default) and explicit `--apply`. Run from the backend directory with its server
configuration. Example preview (replace the UUID with an inventory record):

```sh
node scripts/migrate-verification-media.js --model Trip --field driver_license_pic --id RECORD_UUID
```

Allowed fields: UserKycDocument.document_front_url/document_back_url,
UserSelfieVerification.selfie_url, and Trip.driver_license_pic. Vehicle photos
are deliberately excluded. Preview reads and validates the image and returns
reference revision, content SHA256, byte size and storage class. It does not write
storage, database or audit entries. Retain the output securely for review.

After review, repeat the same model/field/id with:

```sh
--apply --revision PREVIEW_REVISION --sha256 PREVIEW_SHA256 --operator 'operator-name' --reason 'Protect legacy verification evidence'
```

The command requires backend database/storage privileges; it is an operator CLI,
not an HTTP endpoint or staff-session replacement. The operator label is
self-declared and recorded with a null staff actor; restrict host access and retain
operator execution logs. This tool does not grant any admin role permissions.

Cloud sources must match S3_BASE_URL exactly by origin and path prefix and resolve
to allowed image keys in S3_BUCKET_NAME. Source bytes are read via the SDK with
ETag preconditions and size limits, never by fetching an arbitrary URL. Cloud
copies use the configured private bucket. Local copies stay local, move licences
out of uploads/trip, reject root escapes and write new files with mode 0600. Both
paths verify destination content before updating a row. Images retain original
bytes for evidence integrity; the admin viewer strips metadata on display.

Apply rechecks the preview revision and content, then locks the database row and
rechecks the reference after copying. The reference update and audit entry share
one transaction. Changed evidence, corrupt images, unavailable storage and audit
failures stop the migration. Retrying a successful apply with its old revision
fails safely. A failed/interrupted operation may leave a private orphan copy;
inspect audit records before retrying after uncertain commit outcomes. Original
objects are never deleted or made public by this tool.

**Migration is not complete privacy remediation until originals are removed or
access is revoked.** Several trips may share a licence reference. Migrate every
reference before cleanup, verify mobile licence reuse/admin viewing, address CDN
caches and object versions, and confirm unauthenticated access to old URLs fails.
The tool intentionally does not perform deletion, bucket policy changes or cache
purges. No live migration was run during development. Postgres transaction and
real S3/IAM checks remain staging requirements; automated tests use fixtures and
mocked database/cloud operations.

## Staff session self-service — 18 October 2026

The admin navigation now includes **Your sessions**, available to every signed-in
staff role. GET `/auth/sessions?page=1` returns only that staff member's active,
non-revoked sessions (25 per page), with sign-in/last-activity/absolute-expiry times,
network address, browser user agent and a current-session marker. Token hashes and
CSRF hashes are excluded. Browser/IP values are untrusted indicators, not proof of
a physical device. Times display in Asia/Kolkata. The list is a snapshot; refresh
is explicit and there is no background polling to prolong an idle login.

POST `/auth/sessions/:id/revoke` requires the existing staff cookie, allowed origin
and CSRF protection. It rechecks the active staff/current session under locks and
can revoke only a session owned by the caller. Revocation and its audit entry are
transactional. Already revoked own sessions return success; foreign/missing IDs
return 404 without exposing ownership. Revoking the current session clears the
cookie and the frontend reloads authentication. Other sessions remain unchanged.
Revoked sessions fail subsequent authentication; requests already authenticated
and in flight are not globally interrupted by this feature.

The screen uses an inline confirmation, disables duplicate submissions, displays
request failures and refreshes the list after success. List access is audited.
Existing global sign-out and role-change session revocation remain available.
No new table or migration is required. Automated coverage includes staff scope,
expiry, idle timeout, audit rollback, CSRF, cookie handling and browser interaction.
Live multi-browser/Postgres validation remains pending. Password/MFA replacement,
invitation renewal, operational record scopes and customer-data actions are still
separate roadmap items.

## Staff invitation renewal and revocation — 18 October 2026

Team & access now shows invitation pending/expired, no active invitation, MFA
setup pending and MFA enrolled states. Select Edit access on a staff row to manage
an unused invitation. Renewal generates a new 24-hour private link, shown only in
the response; the old token is replaced. Revocation clears the unused token and
expiry. Share links privately using the existing manual process; no email is sent.

POST `/staff/:id/invitation` accepts action renew/revoke, reason (5–500 characters)
and the invitation_revision from the staff list. It requires staff.manage,
existing origin/CSRF protection and a sign-in within 15 minutes. The transaction
rechecks the owner and session, locks the target, compares its revision and writes
the state change plus audit together. Repeated/stale requests return 409 rather
than silently replacing a newer invitation. If a response is lost, refresh and
explicitly renew again; the previously issued link then becomes invalid.

Renewal is blocked for disabled accounts. Unused links can still be revoked for
disabled staff. Accepted invitations (password set or MFA enabled) cannot be
renewed/revoked through this endpoint. This is not password or authenticator
recovery. No account role, password, MFA secret or session is changed by invitation
management. Audit entries record the actor, target, action and reason without the
raw token or link. Staff lists expose derived state/revision, not stored hashes.

No schema change or database reset is required. Automated tests cover old-link
activation rejection, stale revisions, disabled/accepted accounts, owner/session
checks, transactional audit failure and UI confirmation/error handling. Actual
multi-owner concurrency on Postgres and end-to-end onboarding remain staging
checks. Controlled password/MFA replacement and operational scopes are still pending.

## Authenticated staff password change — 18 October 2026

Account security (the existing `/sessions` route) now includes a password-change
form. It requires the current password, a different new password (14 characters
minimum, 72 UTF-8 bytes maximum), confirmation and a fresh six-digit authenticator
code. The user acknowledges that all sessions will end. Recovery codes cannot
authorize this action; lost-password or lost-authenticator recovery is separate.

POST `/auth/change-password` uses the staff session/origin/CSRF boundary and the
existing authentication IP limiter. Under staff/session locks it rechecks account
and session validity, verifies the current password and a non-replayed TOTP step,
then updates the bcrypt password hash and consumed TOTP step. The same transaction
revokes all staff sessions, invalidates unused login challenges, and records
`auth.password_changed`. Failed credential/code checks increment the existing
account failure counter; five failures lock verification for 15 minutes. Secrets
are absent from audit metadata. No target staff ID is accepted: this is self-service.

On success the cookie is cleared, fields are reset and authentication reloads to
the sign-in page. The next sign-in needs the new password and an unused MFA code.
If the response is lost after commit, the old session will be invalid; try signing
in with the new password before attempting another change. In-flight requests
already authenticated are not retroactively interrupted.

No database migration is needed. Automated tests cover credentials, replayed codes,
lockout, disabled/revoked sessions, old-password rejection, challenge/session
revocation, audit rollback, CSRF/cookie behavior and frontend confirmation/errors.
Tests use fixture databases; live Postgres and multi-browser validation remain
pending. Password-reset recovery, authenticator replacement and operational role
scopes remain roadmap items, alongside the documented storage deployment work.

## Recovery-code renewal — 18 October 2026

Account security now allows staff to replace their own recovery codes while they
still have their password and authenticator. POST `/auth/renew-recovery` requires
the current password and fresh six-digit TOTP, together with the existing staff
cookie/origin/CSRF boundary and authentication IP limiter. It shares the locked
credential-verification path and account failure limits with password changes.
A backup code cannot substitute for TOTP in this flow.

Success replaces all recovery hashes with ten new codes, consumes the TOTP step,
revokes other sessions and unused login challenges, and audits the renewal in one
transaction. The current session stays active to save the codes. No password,
role or authenticator secret changes. Raw codes are returned once with no-store
headers; database and audit storage never receive raw codes. The existing
in-memory save-codes screen requires acknowledgement before opening the workspace.
It does not persist codes in browser storage or automatically copy/download them.

Old codes stop working immediately. New codes retain the existing one-use login
behavior and still require the password. A lost response may mean renewal already
committed: retain access to the authenticator and explicitly renew again using a
fresh code. The UI states this limitation and labels the remaining-code count as
a snapshot rather than a live value. Another successful renewal invalidates the
unseen batch. Page reload cannot recover raw codes from the server.

No migration is required. Tests cover old-code rejection, one-use replacement
codes, other/current-session handling, audit failure, MFA replay, CSRF, no-store
responses and frontend acknowledgement/error states. Live database and multi-browser
checks remain pending. Lost-authenticator replacement and forgotten-password
recovery are separate pending workflows; this feature does not bypass either factor.

## Master-data inspection — 18 October 2026

Owner-only `master-data.read` now permits GET `/catalog/vehicles` and
`/catalog/luggage`. Queries accept page (25 rows per page), state active/inactive,
and search (2–80 characters, escaped label/key matching). Stable display-order/ID
sorting supports pagination. Every successful read is audited before responding;
audit failure prevents the response. Search text is not copied into audit metadata.

Vehicle results expose passenger seat capacity excluding the traveler, display
order, active state, icon presence and recorded timestamps. Zero capacity is
preserved. Package capacity fields are excluded from this ride/trip admin view.
Luggage results expose description and stored surcharge percentages without fare
recalculation or rounding. Icon presence means a reference is configured, not that
an image has been fetched or verified; raw asset URLs are not exposed by this API.
Vehicle camel-case timestamp attributes and luggage snake-case attributes are
mapped explicitly to common response fields.

The Master data screen includes vehicle/luggage tabs, URL-backed search/status
filters, pagination, refresh, empty/error states and IST timestamps. It is explicitly
read-only: create/edit, activate/archive, image upload and pricing writes remain
pending. This module grants no access to non-owner roles and has no mutation API.
No schema changes or database writes beyond read auditing were introduced.

Automated checks cover parameter validation, field projection, ordering, audit
failure, permission enforcement, filter interactions, zero capacity and decimal
percentage display. Sequelize attribute names were checked against loaded models.
Live Postgres catalog validation remains pending; tests use fixture query results.

## Catalog display editing — 18 October 2026

This extends the read-only catalog delivery above. Owners now have
`master-data.write` for vehicle labels/display order and luggage labels,
descriptions/display order. Keys, capacity, active state, icon references and
surcharge/pricing fields are rejected by the server. Labels are trimmed and bounded
to their model lengths; order must be an integer 0–10000; luggage descriptions can
be cleared and have a 255-character limit. No-op changes are rejected.

POST `/catalog/:kind/:id/preview` takes the list revision, changes and a reason
(5–500 characters). It returns before/after values and a five-minute signed preview
bound to the actor, record, full catalog revision, normalized changes and reason.
POST `/catalog/:kind/:id/apply` takes only preview_token. Apply rechecks active staff,
permission and session under locks, then locks/rechecks the record. Changes and a
before/after audit entry commit together. Previews are audited too. There is no
unsigned direct write endpoint. The signature uses a domain-separated HMAC with
the existing server admin key; key rotation invalidates outstanding previews.

The list revision covers all projected source fields, including capacity and pricing
metadata, so changes outside this editor also invalidate a preview. Already-applied
previews fail the revision check; after an uncertain response, refresh and inspect
the record/audit before retrying. These are version-checked writes, not a persistent
idempotency-key command system. Luggage updated_at is set explicitly because its
model disables automatic timestamps.

The screen shows before/after changes, requires confirmation and retains the draft
when returning to edit. Display changes may appear wherever the app reads the
shared catalog, including labels shown for existing records; no booking money or
capacity is recalculated. No new records, archive/activation, icon uploads or fare
changes are implemented. No database migration is needed.

Tests cover signed/expired/stale/altered previews, actor and session loss, field
restrictions, no-op edits, audit rollback and browser confirmation/conflict handling.
Live Postgres concurrency and mobile catalog rendering still need staging validation.
No live catalog record was modified during this implementation step.

## Catalog usage inspection — 18 October 2026

Master data now offers View usage on each record. Owner-only GET
`/catalog/:kind/:id/usage` returns all-date status-grouped references in one
REPEATABLE READ snapshot, with an audit entry in the same transaction. Vehicle
usage includes passenger-capable Trip.vehicle_id references and explicit
RideRequest.vehicle_type_id preferences. It excludes package-only trips and does
not count an Any vehicle request as a reference to every vehicle. Luggage usage
separates RideRequest.luggage_type_id and RideBooking.luggage_type_id references.
These groups overlap and must not be summed as unique journeys or people.

The response contains catalog identity, status counts, scope and snapshot time,
not rider identities, locations, payment data or pickup codes. Unknown statuses
remain visible. Empty groups report zero; failed queries/auditing produce errors
rather than invented zero counts. The UI supports refresh and close and explains
that stored statuses are not live activity.

### Activation prerequisites found during implementation

Activation/deactivation remains unavailable. The trip create/update path currently
checks Vehicle existence without consistently enforcing is_active, while ride fare
calculation looks up luggage without enforcing active selection. Before enabling
status edits, complete selection validation for new rides/trips and draft publish,
handle concurrent configuration changes, define treatment of unchanged selections
on existing rides/trips, and preserve historical/payment resolution. Also account
for the shared package use of these catalogs before any global status change.
The current usage counts are inspection data, not a complete deactivation safety
check. A zero count does not authorize deactivation.

No catalog status or booking behavior was changed in this delivery. No migration
was required. Tests cover record scope, repeatable-read propagation, invalid counts,
missing records, audit failure, permission gates and UI empty/error/unknown states.
Live database snapshot validation remains pending.

## Catalog selection validation — 18 October 2026

New ride estimates, traveler previews and ride searches now reject nonexistent,
inactive or malformed luggage selections with HTTP 400. No-luggage requests remain
valid, and active luggage retains the existing surcharge calculation. Ride creation
reads the selected luggage under a transaction SHARE lock and rolls back rejection.
Trip selection, vehicle rules, price estimates and both draft-publication paths now
require an active vehicle. A saved draft cannot bypass that publication check.

Existing checkout, cancellation, completion and history endpoints are unchanged.
Restarting a search validates selections again; a retired luggage selection requires
reselection rather than silently dropping its surcharge. Admin activation remains
disabled: trip-publication concurrency, existing-selection UX and shared package
catalog impacts still need completion before exposing status edits. This delivery
changes consumer selection validation only, not catalog records or database schema.

Validation: 18 focused controller tests cover rejected selections, transactional
rollback/lock propagation, active/no-luggage fares and saved-draft publication.
Existing ride estimate, marketplace, recovery, vehicle verification, trip start,
cancellation and auto-completion regressions also pass. Live database concurrency
and device interaction checks remain pending.

## Existing search reselection — 18 October 2026

Pickup-time restart now accepts an explicit luggage_type_id replacement (including
null for no luggage), while preserving saved route, seats and payment method.
Availability errors include a stable code and field. The mobile pickup-time sheet
uses that signal to load current luggage options, require a deliberate selection,
and retry through the normal transactional creation/repricing path. It does not
silently discard unavailable luggage. Catalog load failures offer retry; an option
retired between selection and submission triggers reselection again. Ordinary
server failures do not trigger this catalog flow. Old rides/invitations are changed
only by successful replacement creation, as before.

Tests cover omission vs explicit replacement, protected fields, loading failure,
repeat availability changes and successful no-luggage/active-option recovery.
Activation controls remain disabled pending publication concurrency and the shared
catalog impact review. This step resolves luggage reselection, not vehicle reselection
or all activation prerequisites. No migration or live data mutation was performed.

## Existing search vehicle recovery — 18 October 2026

Unavailable ride vehicle preferences now return the same structured catalog error
with vehicle_type_id as the field. Pickup-time restart accepts an explicit vehicle
replacement or null for Any vehicle, preserving the source ride and protected route,
passenger count and payment fields. The mobile sheet requires explicit selection,
retries failed option loading, and retains an already selected luggage replacement
if both preferences need recovery. Server capacity checks and vehicle-specific fare
calculation still apply. Ride creation holds a SHARE lock on the selected vehicle
through transactional validation and fare lookup.

This does not enable catalog activation: trip-publication concurrency and shared
package/catalog cache effects still need safeguards. Tests cover structured errors,
transaction lock/rollback, protected fields, vehicle pricing/capacity, explicit Any
vehicle, catalog loading failures and combined luggage/vehicle recovery. Mobile
device and live database concurrency tests remain pending. No migration or live
catalog changes were made.

## Consumer catalog freshness — 18 October 2026

The authenticated vehicle list now reads the small active catalog directly from the
database instead of the ten-minute Redis cache. Simple cache deletion was deliberately
avoided: an older in-flight read could otherwise repopulate stale values after an
admin update. Vehicle ordering now uses configured order then id, so Admin display
order edits reach clients. Vehicle and luggage lists send Cache-Control: no-store;
luggage ordering now uses sort_order then id for deterministic ties. Existing
response shapes and vehicle capacity/package fields remain intact for all consumers.

Requests started after an edit commits see current database values. Already open
mobile screens are not pushed updates by this change; server-side selection checks
still enforce availability when submitting. Database failures produce an error,
not a stale fallback or invented empty catalog. This trades one small database read
per list request for predictable catalog freshness. No Redis keys were deleted.

Four focused tests cover fresh reads, availability filters, order, no-store headers
and failure handling. Selection/recovery regressions pass. Catalog activation stays
disabled pending atomic trip-publication checks and the remaining shared-package
selection impact review. The auto-publish conflict-check failure path also needs
attention during that transaction work. No migration or live record change occurred.

## Atomic publication guard — 18 October 2026

Both traveler publication paths now call one transaction guard before committing
live status. It locks the traveler (serializing publications of different drafts),
locks the candidate trip, compares the previously validated trip fields/timestamps,
and rechecks KYC, future departure, active vehicle and schedule overlap. Vehicle
availability is held with a SHARE lock until commit. Schedule queries use the same
transaction. Changed trips require refresh/revalidation. Downstream countdown and
matching work runs only after this publication commit.

Auto-publication no longer continues after a failed schedule query or reports a
successful save after publication fails. Expected validation races return 409;
unavailable checks return a retryable error. Existing saved trip data is retained.
The guard complements the existing full route/photo/seat validation; it does not
replace it or modify fare/settlement behavior.

Eleven focused tests cover lock order and propagation, transaction commit/rollback,
concurrent changes to validated data, KYC/availability/time/schedule rejection and
query failure. Catalog and trip cancellation/start/verification regressions pass.
Live PostgreSQL contention testing remains pending. Catalog activation stays off:
shared package selection impacts and other trip-edit writers still require review
before claiming complete cross-operation concurrency protection.

## Trip edit concurrency — 18 October 2026

The main trip-edit endpoint now checks ownership before resolving locations or
pricing. A shared edit service locks the traveler then trip (the publication lock
order), rechecks ownership/state, compares the complete loaded record snapshot and
updates inside the transaction. Concurrent publication, start, cancellation or
another edit causes a conflict response instead of overwriting newer values.
Replacement vehicles are revalidated under a SHARE lock.

The main edit, reused verification, uploaded verification and failed-publication
revert paths use this guard. Verification reuse failures are no longer swallowed.
Existing historical/shared images are not deleted. A media upload that loses a race
may leave an unreferenced stored asset; reference-aware cleanup remains separate.
This protects stale writes, not the entire multi-step create/edit request as one
transaction. Published-trip edits with existing bookings and auxiliary writers
(such as delay reporting) require further policy/concurrency review.

Ten new tests cover ownership, stale fields/timestamps, terminal/started states,
publication races, lock propagation and replacement vehicle availability. Existing
publication/catalog/start/cancellation/verification regressions pass. No schema or
live database changes were made; live PostgreSQL contention testing remains pending.
Catalog activation remains disabled.

## Published journey terms — 18 October 2026

Published journey terms are now immutable through the general trip editor, including
before a booking exists: a rider may already be reviewing a quote or sending a
request. The locked edit service rejects changed fields other than trip_name on
published/non-draft records. This covers route, departure, seats, fare, vehicle,
verification assets, preferences and status demotion. A publication timestamp also
protects legacy records whose status was reverted to draft. Started/terminal trips
remain uneditable under the existing state guard. Unchanged values and a display-name
change do not rewrite journey terms.

Trip Details exposes the general edit action only for unpublished draft/review
states and rechecks that condition in the press handler. Cancellation remains the
existing explicit flow with its notification/refund behavior; this change never
cancels a ride or payment automatically. It does not implement a negotiated change
or rider re-consent flow. Auxiliary operations such as delay reporting remain separate.

Twenty edit-policy/service tests, two mobile policy tests and existing publication,
cancellation and verification tests pass. Device interaction and live database race
testing remain pending. No schema or live data changes. Catalog activation remains
disabled pending the remaining shared-catalog impact work.

## Direct-booking catalog validation — 18 October 2026

The older /book-ride draft endpoint remained reachable and accepted unchecked
luggage IDs. It now shares luggageSelectionService with ride-search pricing and
creation. New selections require a positive integer ID resolving to an active option;
transactional callers hold a SHARE lock through creation. Errors use the existing
CATALOG_OPTION_UNAVAILABLE / luggage_type_id response so clients can identify the
selection problem. Missing optional luggage is still allowed.

Eight focused tests cover inactive/missing/malformed IDs, boolean/zero rejection,
active options and no-luggage draft creation. Existing selection, search recovery,
estimate and wallet payment regressions pass. This does not change the older
booking flow's fare formula or rewrite recorded selections during checkout/payment.
No migration or live data change. Admin status toggles remain disabled; separating
luggage status controls from globally shared vehicle activation is the next step.

## Luggage availability controls — 18 October 2026

Owners with master-data.write can now activate/deactivate luggage through the
existing Edit → signed preview → confirmation flow. Boolean validation, reason,
record revision, session/permission recheck, row UPDATE lock and transactional
before/after audit apply. Replayed/stale previews are rejected; audit failure rolls
back the change. Vehicle is_active, capacity and pricing remain forbidden.

Inactive luggage is hidden from new selections. Existing requests and bookings keep
their stored selections and financial records; restarting a search validates a new
selection. Deactivation does not cancel/refund rides. New transactional selections
use SHARE locks and availability is read without the former vehicle cache dependency.
The UI explains the effect both when editing and confirming. Unknown availability
requires an explicit choice. Usage inspection reports luggage controls available;
vehicle activation remains disabled due to shared-trip/package implications.

Admin and consumer regression tests pass, including deactivation/reactivation,
strict input types, replay, audit rollback, preview-only behavior and back-to-edit
state preservation. No live catalog mutation or migration was performed. Device
and real PostgreSQL lock-contention checks remain pending.

## Read-only ride case queue — 18 October 2026

GET /api/admin/v1/ride-cases requires the new owner-only cases.read permission.
It lists RideResolutionCase metadata with exact status/kind filters, bounded 25-row
pagination and deterministic newest-first ordering. Reads and audit run in one
repeatable-read snapshot. Related ride/trip public references are projected without
participant details. Descriptions, evidence, raised-by identity, resolution payloads
and payment data are excluded. Unknown stored types/statuses remain visible in the
unfiltered queue. Failed auditing prevents the response.

Support & disputes now renders this queue with IST timestamps, related journey
links, refresh, URL filters, empty/error/loading states and pagination. Exit
confirmation is explicitly not settlement. This is not the general support-ticket
inbox; assignment, restricted evidence, resolution and money actions remain pending.
No messages, refunds or case mutations are performed. Owner API access is tested;
other staff roles remain denied until their workflows/permissions are approved.
Three queue tests plus HTTP boundary coverage and four UI tests were added. Full
admin/frontend suites, lint and build pass. Live database/device validation pending.

## Read-only case details — 18 October 2026

GET /api/admin/v1/ride-cases/:id requires cases.read and validates UUID/activity
pagination. It returns case timestamps and a paginated related-ride timeline in an
audited repeatable-read snapshot. Timeline records are scoped to the case's stored
ride_request_id; only action, status transition and timestamp fields are projected.
Actor IDs, metadata, pickup codes, descriptions, evidence and resolution payloads
are excluded. Unknown status numbers receive explicit fallback labels.

The queue links to a dedicated URL-addressable detail view. Back navigation keeps
queue filters; activity pages and refresh have loading/error states. The UI states
that events belong to the whole ride, not solely this case, and that exit confirmation
is not a fault/settlement finding. No resolution or payment actions are provided.
Added detail validation/projection tests, HTTP permission coverage and navigation/
pagination/error UI tests. Full admin suite, 47 frontend tests, lint/build pass.
No migration or live case mutation; live database validation remains pending.

## Restricted case descriptions — 18 October 2026

POST /api/admin/v1/ride-cases/:id/description requires separate owner-only
cases.description.read permission, staff cookie authentication, CSRF and a reason
of 5–500 characters. Validated UUID access reads only description/update time and
commits a reason-bearing audit before returning text. Audit failure blocks disclosure.
Evidence, resolution payloads and participant identity are not projected. Descriptions
are capped at 20,000 characters with an explicit truncation flag; audit entries do
not copy the description. Inherited admin no-store response headers apply.

The detail screen reveals text only on explicit access, escapes markup, distinguishes
a participant statement from a verified finding, supports hide/cancel and discards
late cancelled responses. Navigation/refresh unmounts the viewer. No description is
saved to browser storage. General cases.read alone does not enable the control/API.
Tests cover access reasons, audit failure, bounds, missing records, HTTP permissions,
text rendering, hiding and cancellation. Full admin suite and 51 frontend tests,
lint/build pass. No live case was read or changed. Evidence and assignment remain
pending; this is not a case resolution capability.

## Restricted evidence summary — 18 October 2026

POST /ride-cases/:id/evidence requires separate owner-only cases.evidence.read,
a validated access reason, staff authentication and CSRF. Audited snapshot reads
return a strict projection of supported evidence: valid recorded/pickup/wait/escalation
timestamps, ride-state labels, recognized review-action labels and bounded wait seconds.
Unsupported or malformed fields are omitted. Raw JSON, coordinates, payment/escrow
identifiers, settlement payloads and prior private statements never leave this API.
Audit metadata records reason/case only; audit failure blocks disclosure.

The detail viewer requires explicit reveal, shows IST dates and snapshot access time,
and distinguishes recorded facts from current financial state or fault findings.
Hide/cancel and refresh/navigation clear the viewer; cancelled late responses are
ignored. No attachments or resolution outcomes are exposed. Assignment and case
resolution remain pending. Full admin suite, 55 frontend tests, lint/build pass.
No live case evidence was accessed or changed; real database validation is pending.

## Case self-assignment — 18 October 2026

GET /ride-cases/:id/assignment requires cases.read and audits the read. POST requires
owner-only cases.assign, CSRF, a reason and the current assignment version. Open or
waiting cases can be claimed; staff can release only their own assignment, including
on a closed case. Staff permissions and session validity are rechecked inside the
write transaction. Case-row locking serializes competing claims, and version checks
reject stale requests. Assignment and audit commit together; released rows retain
their version to prevent stale claims after claim/release cycles.

The detail screen has explicit review/confirm, loading/error/refresh feedback and
prevents duplicate submissions. No ride, case outcome, payment or notification changes.
Other staff identities are not disclosed. Reassignment, assignment queue filters and
recovery of assignments belonging to inactive staff remain pending.

New migration 146-create-admin-case-assignments.js must be deployed before this feature
can work against the database. It has NOT been run here. Service tests cover stale
claims, ownership, closed cases, session/permission checks and audit rollback using
fixtures; real PostgreSQL concurrency and operational validation remain pending.

## Case assignment queue filters — 18 October 2026

The case list now accepts assignment=mine|unassigned|assigned, combined with existing
status/type filters and pagination. Mine is scoped to the authenticated staff ID;
clients cannot choose another staff ID. A one-to-one left join filters before LIMIT
and counts in the same repeatable-read snapshot. Missing assignment rows and released
assignments both count as unassigned. Returned labels are mine/other/unassigned;
assignee IDs and versions are not exposed. Audits record the selected filter names.

The queue shows assignment labels and preserves filters through details/back navigation;
changing a filter resets pagination. Queue copy reflects the implemented restricted
evidence and assignment controls. No case or payment is changed by these reads.
The queue now depends on migration 146 as well as the assignment controls. Migration
146 has NOT been applied here; deploy it before deploying these APIs. All backend
admin checks, 59 frontend tests, lint and build pass. SQL-generation tests verify the
join/filter shape, but live PostgreSQL data validation remains pending.

## Inactive staff assignment recovery — 18 October 2026

Owner-only cases.assign now permits action=recover on the existing assignment POST.
It releases an assignment only when its other assignee exists and is explicitly
inactive. Active, missing and own assignees cannot be recovered. The required reason,
confirmation, assignment version, current actor/session checks and transactional audit
are retained. The inactive staff row is locked during recovery so reactivation cannot
race the decision. Recovery does not assign the case to the actor; it becomes
unassigned and can subsequently be claimed if open/waiting. Closed-case cleanup is
allowed without reopening the case or changing payment, ride or resolution data.

The detail UI identifies inactive assignments and provides review/confirmation with
refresh on success or conflict. No staff identity is returned. No messages are sent.
Backend admin suite and 61 frontend tests, lint/build pass. Coverage includes active
assignee protection, stale versions, repeated recovery, missing staff and rollback
on audit failure. No schema changes this step; migration 146 remains unapplied and
required for assignments. Live database concurrency validation remains pending.
General reassignment to another active staff member remains unimplemented.

## Case assignment history — 18 October 2026

GET /ride-cases/:id/assignment/history requires the separate owner-only
cases.assignment-history.read permission. It validates case ID/page and reads only
assignment-change audit events for that case, using a repeatable-read transaction,
25-row pages and deterministic date/ID order. History access is itself audited before
disclosure; history-view audit events are excluded from the returned history.

Projection returns action labels, bounded plain-text reason, time, version and whether
the current staff member performed the action. It does not expose raw metadata, IPs,
staff IDs or unrelated audit records. The UI fetches only on explicit opening and
supports hide, pagination, refresh, empty and error states. Assignment refresh or
mutation resets the history panel. Reasons render as text, never HTML.

Backend admin suite and 64 frontend tests pass. No schema changes or live data
operations occurred. Existing migration 146 remains required for assignment controls
and queue, and has not been run. Live database validation remains pending.

## Case reassignment — 18 October 2026

Owner-only cases.reassign permits a paginated, audited GET /ride-cases/:id/assignees
and action=reassign on the existing assignment POST (which also requires cases.assign).
The picker returns only staff ID/name/role and a current-actor flag; email, credentials
and MFA secrets are excluded. Eligible staff must be active, MFA-enabled and have
cases.assign. Under the current role policy, only owners qualify.

Writes recheck actor permissions/session, recipient eligibility, open/waiting case
state and the assignment version inside a transaction. Actor/recipient staff rows
are locked in stable ID order before the case/assignment rows. Same-recipient no-ops
and stale requests are rejected. Audit records include reason and previous/new staff
IDs; scoped history exposes the reassignment label without raw metadata. Audit failure
rolls back the transfer. Assignment does not change rides, money or case resolution,
and no notification is sent.

The UI loads eligible staff only when opened, requires a recipient and reason, then
shows explicit confirmation. Completion/conflict refreshes assignment and clears
stale history. Empty/error/retry and pagination are supported. Backend admin suite,
68 frontend tests, lint and build pass. No migration or live data mutation performed.
Existing migration 146 remains unapplied and required. Live PostgreSQL concurrency
validation remains pending; resolution proposal/approval workflows are not implemented.

## Resolution proposals, without execution — 18 October 2026

New owner-only cases.proposals.read/write permissions protect proposal list, submission
and withdrawal endpoints under /ride-cases/:id/proposals. Supported recommendations
are further investigation, payment review and closure without financial adjustment.
These are recommendations only: no approval endpoint, case closure, refund, settlement,
ride mutation or notification is performed. Amounts and other unsupported input fields
are rejected; this is not a financial quote or executable payment instruction.

Submission requires the current assigned reviewer, an open/waiting case, a 20–2000
character rationale and the context revision returned by the audited list. The hash
covers case contents and assignment identity/version. Changed evidence, case state or
assignment invalidates submission. Actor permissions and session are rechecked inside
the transaction; case/assignment locks serialize submissions. A partial unique index
also permits only one pending proposal per case. A client UUID acts as the idempotency
key: identical retries return the saved result, while changed payloads conflict. The
frontend retains that ID on failure and requires review before submission.

Proposals remain immutable apart from pending_review -> withdrawn. The author or
current assigned reviewer may withdraw with a reason and confirmation, including
after reassignment or case closure. Withdrawal does not reopen cases or release funds.
Every read/write is audited; failed audits prevent disclosure or roll back writes.
Read projection excludes author IDs and raw case evidence. History is paginated and
flags changed case/assignment context. Rationales render as plain text.

New table migration 147-create-admin-case-proposals.js was created, NOT applied.
It and existing migration 146 must be deployed before this workflow works live.
Backend admin suite, 73 frontend tests, lint/build pass. No live cases were changed.
Real PostgreSQL concurrency checks, independent approval/rejection and guarded execution
remain pending. Payment review must later use current server payment/ledger evidence;
the present case-context hash is not a financial execution safeguard.

## Independent proposal decisions — 18 October 2026

POST /ride-cases/:id/proposals/:proposalId/decision requires separate owner-only
cases.proposals.decide permission. Both approval and rejection require a different
staff member from the proposal author, a reason of 10–1000 characters, current case
revision and a client decision UUID. Actor permission/MFA/session are rechecked inside
the transaction before locking case, assignment and proposal. Identical retries return
the recorded decision; mismatched or conflicting decisions fail. Audit failure rolls
back all decision fields. No case status, ride, money or notification changes occur.

Approval requires pending_review, open/waiting case, unchanged proposal context and a
supported recommendation. A refreshed independent reviewer can reject stale or closed
case proposals, clearing obsolete pending work. Approved recommendations are explicitly
not applied and block another active proposal. Authors/current assigned reviewers may
withdraw pending or approved recommendations before execution; recorded decision
metadata remains available. The same case/proposal locks serialize withdrawal and
review decisions. Actual execution is still unavailable and must later recheck these
states and current business/financial evidence under the appropriate locks.

Original migration 147 was updated with decision fields and a unique pending/approved
case index; no alteration migration was added and no migration was run. Frontend shows
reasoned confirmation, recorded decisions with IST times, retry feedback and the label
Approved · Not applied. No staff IDs are returned in the scoped decision projection.
Backend admin suite, 77 frontend tests, lint/build pass. Deployment of migrations 146–147
and live PostgreSQL contention validation remain pending. At least two authorized owner
accounts are needed for independent review; there is no self-approval bypass.

## Apply approved further investigation — 18 October 2026

POST /ride-cases/:id/proposals/:proposalId/execute requires owner-only
cases.proposals.execute, current assigned reviewer, a reason and execution UUID.
Only further_investigation is supported. A pending, rejected, withdrawn, already
executed, stale or non-independently-approved proposal is rejected. Case must be
open/waiting and both proposal/decision revisions must match current case/assignment.
Actor permission and session are rechecked under transaction locks. Identical retries
return the stored result; mismatched reuse fails.

Execution sets the case to waiting and the proposal to executed, writes execution
identity/time/reason and audit in one transaction. Audit failure rolls back both.
Existing evidence, resolution and financial records remain untouched; no ride action
or notification is emitted. Wallet settlement already treats open and waiting disputes
as review-blocking. No refund, settlement or case closure path is enabled here.
Execution result revision distinguishes changes caused by execution from later edits.
The UI requires explicit review/confirmation, records IST execution history and
refreshes the parent case. Replay confirmations refer to the recorded action rather
than claiming the case still has its original post-execution status.

Original migration 147 now contains execution fields; no new alteration migration
and no migration was run. Migrations 146–147 remain prerequisites. Backend admin
suite, 82 frontend tests, lint/build pass. Live PostgreSQL concurrency and end-to-end
validation remain pending. Financial preview and outcome execution are still pending.

## Recorded financial review — 18 October 2026

POST /ride-cases/:id/financial-review requires owner-only cases.financial-review.read,
CSRF and an access reason. Audited repeatable-read snapshots show recorded ride fare,
confirmation time, linked escrow status/amounts, and paginated provider payment attempts
(10 per page). Each attempt retains separate order/refund/settlement states and recorded
provider-check time. No aggregation implies how much was paid or remains refundable.
No live provider calls, wallet balances, secrets, phone numbers or provider IDs are
returned. This is recorded evidence, not a refund/settlement preview or execution grant.

Related ride/trip and financial record ownership are checked. Mismatched records are
withheld; missing links, unknown states, invalid monetary values, allocation mismatches,
refund amounts exceeding order amount and ride/escrow status discrepancies are explicit.
Refund amount is labelled as not proof of refund. The existing paise helper validates
money. Audit failure blocks disclosure. The UI requires explicit reasoned access,
provides pagination/refresh/hide, clears hidden data and ignores cancelled late responses.
Times use IST. Case refresh/navigation unmount the viewer.

Backend admin suite plus six targeted financial review tests, 86 frontend tests,
lint/build pass. No schema changes, migration, provider call, live financial disclosure
or money movement performed. Existing migration deployment and live database validation
remain pending. Financial execution still requires current provider/ledger reconciliation,
server previews and guarded business-service integration.

## Wallet refund assessment — 18 October 2026

Owner-only cases.wallet-refund.assess protects reason-gated, CSRF-protected POST
/ride-cases/:id/wallet-refund-assessment. A repeatable-read snapshot checks cancelled
or no-show wallet rides, linked ride/participants, held escrow/fare/allocation agreement,
active payer wallet, aggregate held-obligation coverage, supported balance precision
and exactly one matching successful negative booking debit with correct before/after
balances. Frozen/released/refunded funds, additional ledger activity, missing evidence,
invalid amounts and non-wallet or other ride states block the illustrative amount.
Audit must commit before disclosure. No service that moves money is invoked.

Successful checks return an illustrative full refund in paise, not entitlement, an
approved deduction policy, a provider confirmation or execution authorization. Wallet
balances, user/ledger IDs and private records are not returned. Aggregate escrow
comparison is conservative (including recorded held/frozen/review obligations); mixed
funding sources may require reconciliation rather than producing an amount. The
snapshot is not reserved or signed for execution and must never be consumed as a
future refund authorization. UI explicitly says Not approved and has no refund button.

Also corrected financial review to accept ride escrow with null trip_id when ride and
both participants match, reflecting current booking writes. Explicit wrong trip IDs
and package escrow remain withheld. Backend admin suite, 90 frontend tests, lint/build
pass. No schema changes, migration, live provider call or financial mutation performed.
Deployment/live database validation and guarded financial execution remain pending.

## Full wallet refund preview — 18 October 2026

POST `/ride-cases/:id/wallet-refund-preview` accepts only a 10–500 character reason;
POST `/ride-cases/:id/wallet-refund-preview/check` accepts only its opaque preview_token.
Both require `cases.wallet-refund.preview` (owner only), a current active MFA staff
session and current case assignment. An existing pending/approved proposal blocks the
preview. They reuse the conservative wallet assessment snapshot in repeatable-read
transactions; blocked or mismatched financial evidence returns no amount or token.

The preview proposes a full refund without deductions. Its encrypted authenticated
reference binds the actor/session, case, reason, amount, assignment version and a hash
of selected case/ride/escrow/wallet/ledger/aggregate-obligation evidence. It expires in
five minutes or at session expiry, whichever is sooner. Rechecks validate current
authorization and evidence without extending the lifetime. Successful access is audited
before disclosure; no wallet balances or internal financial identifiers are returned.
Assessment and preview share one snapshot reader to avoid divergent checks.

This is not entitlement approval, a reservation, or execution authorization. It creates
no proposal, changes no case/ride/payment state, and invokes no payment provider. Future
financial proposal/independent approval and execution must consume and revalidate the
preview, lock current business records and enforce idempotency in the same transaction
as business-service execution. The existing investigation approval cannot authorize
refunds. Live database contention validation remains pending; no migration was run.

## Independently reviewed wallet refund proposals — 18 October 2026

POST `/ride-cases/:id/wallet-refund-proposals` accepts a client UUID `id` and opaque
`preview_token`, requiring `cases.wallet-refund.propose` (owner only). It validates the
preview's actor/session/case/action, expiry, assigned reviewer and current financial
snapshot inside a repeatable-read transaction. Case/assignment locks and the existing
one-active-proposal index serialize competing submissions. Amount and reason come only
from the preview. Exact retries return the recorded proposal, including after preview
expiry; reused IDs with another payload fail. Audit failure rolls back the proposal.

The original migration 147 and model now include refund_amount_paise, financial_revision
and preview_hash. No migration was run. Existing databases need the schema change before
using this code; a migration reset is not performed automatically.

Proposal history displays the immutable INR amount/reason and flags changed financial
evidence. Full-refund decisions require both cases.proposals.decide and the new
cases.wallet-refund.decide permission (owner only), a different active MFA staff member,
a reason and the displayed financial_revision. Approval rechecks the snapshot and amount;
stale proposals may be rejected or withdrawn. General recommendation submission cannot
create financial proposals. Decision UUIDs preserve exact retry semantics. Approved
refunds remain not applied and cannot use the investigation execution endpoint.

No financial entitlement is inferred by passing reconciliation checks: the proposing
and independent reviewing staff must assess the case evidence. No money, notifications,
case or ride states change. Next is separately guarded, idempotent execution using current
locked business records and shared refund services. Database concurrency/deployment
validation remains pending; unit tests use mocked transactions.

## Approved full wallet refund execution — 18 October 2026

POST `/ride-cases/:id/proposals/:proposalId/refund` requires the dedicated owner-only
`cases.wallet-refund.execute` permission. Body: execution UUID `id`, reason (10–1000
characters), current case `revision`, and the approved `financial_revision`. Only the
current assigned reviewer can execute an independently approved wallet_full_refund.
The general investigation endpoint continues to reject financial proposals.

Execution uses a serializable transaction and locks current staff/session, ride, case,
assignment, proposal, escrow and payer wallet. The shared conservative assessment must
still match the approved evidence and amount before money is touched. Current active
wallet, held funds, matching booking debit, supported cancelled/no-show state and all
existing ownership checks apply. Serialization/deadlock failures abort the transaction;
retry with the same execution UUID. No stale snapshot is automatically accepted.

The existing cancellation refund service is exposed as an injectable factory while
preserving its original entry point. It credits the payer wallet, reduces held funds,
updates the consumer balance mirror and writes the refund ledger/escrow state. Admin
execution additionally requires the payer update to affect exactly one user. Ride
escrow status, ride activity, a queued refund notification, proposal execution metadata
and audit commit in the same transaction. An unexpected service result or any write
failure rolls everything back. A repeated identical execution returns the recorded
result without another credit or notification; conflicting execution IDs fail.

The cancelled/no-show ride status and case status remain unchanged. Financial execution
does not close the safety/support investigation or refund external-provider payments.
The admin UI shows the actual INR amount, requires reason and confirmation, and retains
the same execution payload for retries after an uncertain response. Execution history
labels the completed wallet refund correctly. No live refund or migration was run.
Real PostgreSQL contention, deployed schema, and notification delivery validation remain
pending; transaction rollback and failure-path tests use model fixtures.

## Closure after an executed full wallet refund — 18 October 2026

POST `/ride-cases/:id/proposals/:proposalId/close` requires owner-only `cases.close`,
current assignment, an independently approved close_without_adjustment proposal, a
reason, execution UUID and current case revision. It uses serializable isolation and
ride-before-case locking. The initial supported scope is cancelled/no-show wallet rides
whose full refund was executed by this case's admin workflow. Linked escrow must be
refunded and an exact successful refund ledger entry must match the ride amount,
recorded executed refund amount and wallet balance delta. Active/arrived rides, held or
inconsistent funds, external payments and missing refund execution evidence are blocked.

Successful execution marks the case resolved and stores its closure outcome, proposal,
reason and staff reference in resolution JSON. It preserves ride/payment state and
creates no additional credit or notification. The consumer resolved_by foreign key is
not populated with a staff ID. Proposal execution and audit are atomic; identical retries
return the recorded result, while audit failure rolls back closure. UI execution history
labels closure separately. The action button checks eligibility on execution; an approved
closure recommendation alone does not prove that its financial preconditions are met.

No migration or live case mutation ran. Broader closure policies for settled rides,
unfunded bookings and external payments remain deferred. Existing migration deployment
and real PostgreSQL concurrency validation remain pending.

## Closure with no recorded payment — 18 October 2026

The existing approved-case closure endpoint now also supports cancelled (10/11) or
expired (12) rides with no recorded payment evidence. Payment method must be unset or
wallet, escrow status unset/pending, and all order/transaction/escrow/confirmation
references absent. Queries check for any linked escrow, provider attempt or wallet
ledger entry, regardless of success/failure status. Any record or unavailable query
blocks this path. A quoted final fare is not interpreted as a payment. Unpaid no-show,
active/arrived rides and externally funded flows remain outside this path.

The checks run in the existing serializable closure transaction after the ride lock;
independent approval, assignment, permission, context revision, reason, execution UUID
and audit requirements remain unchanged. Resolution records financial_basis as either
no_recorded_payment or verified_full_wallet_refund. No ride/payment/notification writes
are added. No migration or live case action was run. Real database concurrent payment
and closure behavior remains a deployment validation requirement.

## Read-only closure readiness — 18 October 2026

POST `/ride-cases/:id/closure-readiness` requires cases.close and a 5–500 character
review reason. It reads a consistent repeatable-read snapshot using the same closure
eligibility helper as execution, with row locks disabled for this read-only check.
It returns eligibility, a limited financial basis, blocker guidance and a timestamp,
without wallet balances or internal financial identifiers. Closed cases cannot pass.
Access is audited before disclosure; unavailable evidence fails rather than passing.

Readiness is not an approval or execution authorization. It does not check whether a
particular proposal has been independently approved or whether the caller is assigned;
those remain required when applying closure. No case, ride, money or notification is
changed. The UI requires an explicit reason and supports refresh/hide/cancel; failed
refreshes discard the previous result and late cancelled responses are ignored.
No migration or live case action was performed.

## Recorded resolution viewer — 18 October 2026

POST `/ride-cases/:id/resolution` requires owner-only cases.resolution.read and an
access reason. A repeatable-read snapshot projects only known outcome/financial-basis
labels, a bounded recorded reason, valid resolved time and a by-you indicator. Raw
resolution JSON, provider responses, payment references, proposal/staff identifiers and
unknown outcome text are withheld. Unresolved cases do not disclose stale resolution
content. Unknown resolved outcomes direct staff to case history; they do not imply a
refund or approval. Audit must succeed before data is returned.

Resolved case details include an explicit reveal/hide viewer with IST times. No automatic
private-data fetch or case/payment mutation occurs. The viewer does not establish the
current payment state. No migration or live case action ran.

## Notification delivery inspection — 18 October 2026

GET `/notification-delivery` requires owner-only notifications.delivery.read. It supports
page (25 rows, maximum page 10000) and known recorded-status filters, scoped to ride_request
and trip entities. Repeatable-read results and audit commit before disclosure. Selection
and response exclude message content, recipient/actor identity, metadata, raw provider
errors and provider message IDs. Unknown stored statuses map to unknown; invalid entity
IDs and timestamps are withheld. No missing delivery/read acknowledgement is inferred
from a sent state. The frontend adds navigation, filters, pagination, refresh and links
to existing journey details, whose own permissions still apply.

This is database inspection only, not worker health or provider reconciliation. No send,
resend, retry mutation or migration is performed. Future failure-diagnosis and bounded
retry workflows require separate permissions and safeguards.

## Journey-scoped delivery search — 18 October 2026

Notification delivery accepts an optional R/T public reference. Input is validated and
normalized without floating-point conversion, bounded to PostgreSQL BIGINT and resolved
inside the same read snapshot. The resulting notification query fixes both entity type
and ID; a nonexistent reference uses an empty ID predicate, never an unfiltered fallback.
Status filtering and pagination remain available; normalized references are audited.
No recipient/message/provider content, send operation or schema change is added.

## Notification date filters — 18 October 2026

Delivery inspection accepts optional from/to calendar dates (YYYY-MM-DD), interpreted
as Asia/Kolkata days. Queries use created_at >= start and < the day after the selected
end date. Impossible dates, reversed ranges and non-string inputs are rejected. Single
bounds are supported; timezone conversion is independent of server timezone and does
not round away end-of-day precision. Validated dates are recorded in the access audit.
No send, mutation or migration is added.

## Restricted notification evidence inspection — 18 October 2026

POST `/notification-delivery/:id/inspection` requires notifications.delivery.inspect
(owner only), a valid UUID and an access reason. Only ride/trip events are inspectable.
A consistent snapshot returns known status, presence (not value) of a provider reference,
valid recorded timestamps and fixed diagnostic guidance. Exact locally emitted
Push delivery unavailable is recognized without guessing its underlying cause; other
failures remain unclassified. Sent-without-provider-reference and mixed sent timestamps
with failed/queued states are explicitly qualified. No raw failure text, recipient,
message content, metadata or provider identifier is returned. Audit failure withholds
results. No provider/device call, resend, mutation or migration occurs.

### Push outcome accuracy

The unified sender now records `sent` only when at least one device receives a
provider acceptance reference. Queued events start without a sent timestamp.
Disabled preferences, missing recipients and absent registered devices record
`skipped`, with a restricted reason code, while the in-app event remains stored.
The cancellation worker does not retry skipped pushes. Provider failures remain
failed/retryable in that worker; a device lookup failure without a legacy fallback
is a failure, not evidence of no registered device. Ordinary direct-send failures
are recorded but do not acquire a new retry worker in this change.
Admin delivery filtering and audited inspection recognize skipped events.
Historical records are unchanged. Mocked sender/worker regressions cover success,
partial device acceptance, preferences, missing devices, legacy fallback and
provider/lookup failure. No live pushes or database migrations were run; real
worker/device delivery remains a release validation task.

### In-app read state is independent of push state

Single and bulk consumer read actions now set only `read_at`, preserving the
queued/failed/skipped/sent delivery state and provider evidence. Single reads use
an ownership-scoped conditional update so a repeated request cannot replace the
first recorded read timestamp. Bulk reads retain recipient and tab scoping.
This prevents a read action from removing queued cancellation work, including
its rider-search restart, from the worker's eligible states. Admin read timestamps
remain independent evidence: reading in-app does not establish push delivery.
Legacy `read` statuses remain visible and are not rewritten or re-enqueued.
Mocked read-controller and worker regression tests pass; real device/worker
validation is still pending. No migration or live delivery was performed.

### Cancellation worker isolation and search checkpoint

A successful rider-search enqueue is now checkpointed in the event metadata
before push delivery. If the push fails and the transaction commits its failed
state, later push retries do not re-enqueue the search. Queue failures leave the
checkpoint absent and retryable. Per-event transaction failures are logged without
raw database/provider text and no longer stop remaining events in the batch.

This is not an exactly-once guarantee across Redis and PostgreSQL: a rollback or
process crash after enqueue can still replay it. The existing stable BullMQ job ID
deduplicates while retained; the matching worker also rechecks live ride eligibility.
Checkpointing means enqueue accepted, not matching completed. Automated mocked
regressions cover retry, checkpoint preservation, queue failure, batch isolation
and local concurrent sweeps. Real Redis/PostgreSQL failure testing remains pending.
No live notifications, queue jobs or migrations were run.

### Retry and search evidence in notification inspection

The existing reason-gated, audited inspection now projects cancellation-worker
retry eligibility and rider-search enqueue evidence. Eligibility is derived from
channel and queued/failed status; it is not worker health or a promised retry time.
Search checkpoint time is validated and shown separately from matching completion.
Missing checkpoints are explicitly inconclusive for historical events. Raw metadata
and channel identifiers are not returned, and no resend action is introduced.

### Automatic retry queue filter

Notification delivery accepts `retry=eligible` to restrict results to the
cancellation worker's queued/failed events. It intersects existing status,
ride/trip reference and IST date filters; contradictory filters return no rows.
The filter is validated and audited. Raw channel identifiers remain withheld.
Eligibility is not worker health, a promised retry time or a resend operation.

### Audit history investigation filters

The existing audit.read endpoint now supports exact action and staff actor UUID
filters with server-side validation. Filters combine using AND and retain stable
created-at/ID ordering and 25-row pagination. The admin form keeps filters in the
URL and resets pagination on apply/clear; team listing is unaffected. Existing
permissions remain required. No event edits, deletes or exports are introduced.

### Online payment queue (read-only)

GET /api/admin/v1/payments requires dedicated payments.read permission (owner only
for this initial scope). The audited, repeatable-read queue reads CashfreePayment
records with stable pagination, exact local state and SANDBOX/PRODUCTION filters.
It projects recorded order amount and created/paid/checked timestamps, plus a safe
ride link. Invalid money is unavailable, not zero. Unknown stored states remain
unknown. Phone numbers, checkout sessions, provider identifiers and raw errors
are excluded. This queue does not represent wallet payments, live provider status,
refund confirmation or financial reconciliation. No provider calls or money-changing
commands are exposed. Detailed timelines, reconciliation and refund controls remain
pending. Automated tests use mocks; real database/provider validation remains required.

### Restricted payment-record inspection

POST /payments/:id/inspection requires payments.inspect (initially owner only),
CSRF and a 5–500 character access reason. A repeatable-read snapshot projects
recorded order/fee/traveler/refund amounts, local payment/refund/settlement states,
environment/mode and timestamps. Missing or malformed money is unavailable;
unknown states are not interpreted as success or failure. Access is audited before
returning evidence. Provider IDs, checkout sessions, phone numbers and raw errors
are excluded. No live provider request, reconciliation or financial mutation occurs.
The queue also now recognizes the existing refunded state. Sandbox-only settlement
limitations and allocation-versus-payout distinctions are explicit in the panel.

### Payment queue ride-reference search

The payment queue accepts an exact ride public reference (for example R0002).
The server validates PostgreSQL bigint bounds, resolves the ride inside the same
read snapshot, and intersects its ID with existing payment/environment filters.
An absent ride yields an empty ID predicate rather than broadening the query.
Normalized references are included in access audits; no customer contact search
or provider calls are introduced.

### Local order/ride consistency evidence

Restricted payment inspection reads the linked ride in the same repeatable-read
snapshot and compares only the current order. Historical/different orders and
missing references are explicitly separated from current-order discrepancies.
Participant/trip references, method, confirmed fare and confirmation-state conflicts
are checked without returning customer/provider identifiers. Missing or invalid
fields are inconclusive. No-difference-found is not provider reconciliation or
proof that funds moved. Access uses the existing inspection permission and audit.

### Payment date investigation filters

Payment queue from/to dates are strict India-local calendar dates. date_field is
created (default) or paid. Inclusive end dates use an exclusive next-day bound;
missing paid timestamps naturally fall outside paid-date ranges. One-sided ranges
are allowed. Invalid calendar dates, reversed ranges and unsupported bases reject
before reading data. Existing filters intersect, and access audits retain the basis
and dates. This does not refresh or confirm provider payment status.

### Recorded payment-check evidence

Restricted inspection now safely classifies recognized stored availability,
network and booking-retry errors. Unrecognized errors remain unclassified and raw
content is withheld. Check age is computed at inspection; missing, invalid and
future timestamps are distinct. checked_at can record a failed attempt, so neither
its presence nor an empty last_error proves successful reconciliation. The panel
makes no worker-health or retry-time guarantee and performs no provider request.

### Reconciliation worker batch isolation

A failed retry-evidence write no longer stops reconciliation of remaining orders
in the batch. The local running guard is still released after query or processing
failures. Only recognized provider/network error codes are persisted and logged;
unclassified external codes become RECONCILIATION_REQUIRED. This catch path updates
only retry evidence, not payment state or financial amounts. Mocked worker tests
cover write failure, sanitized errors, concurrent sweeps, query failure recovery and
missing configuration. Real database/provider failure testing remains pending.

### Recorded-error payment queue filter

The payment queue accepts issue=recorded_error, selecting non-null, non-empty
last_error records without projecting raw errors. Existing ride/state/environment/
date filters still intersect. The validated filter is recorded in the access audit.
A stored error does not establish failed payment, current provider health or whether
the original issue is still occurring. Detailed safe evidence remains behind the
separate inspection permission and access reason.

### Payment reconciliation environment isolation

The automatic sweep resolves the gateway's configured environment before querying
orders and restricts its batch to that environment. A defensive row check also
skips mismatched/missing environments without changing retry evidence. Invalid
configuration fails before reading orders. Sandbox records therefore do not consume
production sweep slots after a configuration switch. Other-environment unresolved
orders remain stored and require their matching configured environment; they are
not silently expired or repaired. Gateway request safeguards remain in place.
Mocked environment and Cashfree regression tests pass; live deployment validation
remains pending. No credentials, provider state or database records were changed.

### Recorded refund state in payment queue

The read-only payment queue projects a safe refund-status label and accepts exact
known refund states as an independent, audited filter. It intersects payment state,
environment, ride, dates and recorded-error filters. Missing and unknown stored
values remain explicit; successful status is presented as recorded evidence, not
fresh provider confirmation. No refund submission, retry or financial mutation
is exposed by this change.

### Refund recovery validation

Refund execution now validates the persisted refund amount in integer paise and
rejects missing/invalid/excessive values before provider calls or zero-refund closure.
Only explicit provider 404 permits creating the already-identified refund; an empty
lookup response or outage does not. Missing refund identity and incomplete responses
remain unresolved. Identity/amount checks still gate success and completion notices.
Mocked regressions cover zero, malformed/excessive amounts, outages, incomplete and
mismatched responses, pending status and repeat processing after success. Real
provider/database crash and rollback validation remains pending.

### Refund intent ownership and repeat validation

The shared online refund queue now requires the payment order to belong to the
supplied ride and passenger before any transition, including repeated requests.
Amounts are validated before repeat handling; pending/completed/zero-closed refund
retries must match the persisted amount. Trip cancellation passes explicit ride
and passenger context while retaining the selected order reference for older orders.
Missing legacy ownership/amount evidence requires review rather than silent success.
Tests cover mismatches, missing identity, completed-repeat amount conflicts and
trip-cancellation context. No provider calls or live financial writes were run.

### Refund timeline timestamps — schema deployment required

Nullable refund_requested_at and refund_completed_at were added to the existing
142-create-cashfree-payments creation migration and model per the prelaunch migration
policy. No migration was executed. The running database must gain these columns
before deploying this model/service; rerunning migrate alone will not amend an
already-applied creation migration. Do not reset a data-bearing database blindly.

All current refund-intent paths record the first request time; exact retries preserve
it. Confirmed success records the first local completion time; zero-refund closure
does not claim a completed transfer. Admin inspection shows these as IST evidence.
Completion means when Gilo persisted success, not the bank's credit time. Historical
rows are not backfilled from creation/update time, so refund age is not fabricated.

### Refund-specific date filters

Payment queue date_field additionally accepts refund_requested and refund_completed.
These map only to the dedicated nullable timestamps, using the existing inclusive
IST date bounds. No fallback to order creation/update or payment time is used.
Records without the chosen timestamp are excluded by a date range. Access audits
retain the selected basis. This depends on the previously documented, unapplied
migration-142 schema update; no additional schema changes were made here.

### Refund timeline evidence

Audited inspection now reports contradictory refund times/states separately from
missing historical evidence. Elapsed duration is derived only from valid recorded
request/completion times and never from order age. Future/invalid dates and reversed
times suppress duration. Missing legacy dates do not imply failed refunds. Open
elapsed time is not a processing deadline; completion duration is local recording,
not recipient-bank credit time. No provider check or correction is performed.

### Stored payment amount consistency

Audited inspection compares stored fee plus traveler allocation with order amount
using integer paise, checks refund bounds, and flags contradictory zero/not-applicable
refund evidence. Missing required values are incomplete; malformed/negative amounts
require review. Balanced local amounts do not prove collection, payout, refund
completion or remaining refundable funds. No monetary repair/calculation command
or provider call is introduced.

### Settlement timing and amount guards (18 October 2026)

Before initiating traveler settlement, the payment worker now requires valid, non-future payment and ride-update timestamps. Missing or malformed dates cannot bypass the existing waiting periods. It also validates stored monetary values in integer paise and requires a positive payment total equal to the platform fee plus traveler payout. Invalid evidence leaves earnings held and raises an error before any provider request. A valid zero traveler allocation still does not initiate a transfer.

Regression coverage includes missing/invalid/future dates, both waiting periods, malformed and inconsistent amounts, zero allocation, and the existing successful allocation/bank-confirmation flows. All seven Cashfree unit-test files passed. These mocked tests do not verify real database rollback, provider settlement, or production configuration. The existing ride updated_at waiting-period basis remains unchanged; this is not a dedicated drop-off timestamp migration.

### Settlement lookup recovery guards (18 October 2026)

A successful split lookup must contain a vendors array. Missing/malformed response bodies no longer count as evidence that no split exists. For Gilo's single-traveler payment allocation, unexpected or duplicate vendors, mismatched amounts, and a contradictory returned order ID stop processing before a new allocation is submitted. Missing local vendor IDs also block provider calls. Post-submission lookup evidence is checked by the same validator before settlement reconciliation proceeds.

The existing explicit-404 recovery path and valid empty-vendors response remain supported. A locally recorded split submission is not resubmitted on an empty lookup. Valid matching allocations are recovered without another split request. No change to provider idempotency keys, schema, or payout amounts.

Verified the response shape against Cashfree's official documentation:
https://www.cashfree.com/docs/api-reference/payments/latest/easy-split/get-split-and-settlement-details-by-orderid

Validation: all seven Cashfree unit-test files pass, including malformed/empty lookups, outages, contradictory allocations, missing recipients, post-submission failures, explicit-404 recovery, and existing settlement success tests. Syntax and whitespace checks pass. No live provider requests or database changes were made. Mocked tests do not establish database rollback behavior or exactly-once provider settlement; real integration testing remains required.

### Bank settlement confirmation validation (18 October 2026)

Final settlement confirmation now requires a nonempty text bank reference after trimming whitespace. Case-insensitive NA and N/A placeholders cannot release earnings. Malformed reconciliation pages and malformed row objects raise an error rather than being treated as usable settlement evidence. Existing exact order, vendor, INR, amount, and boolean settled checks remain required.

Regression tests cover missing/blank/non-text/placeholder references, wrong identity/currency/amount/settled flag, malformed pages, and a valid confirmation found on a later page with the settlement filter preserved. Repeated reconciliation after completion makes no additional vendor reconciliation calls. All seven Cashfree unit-test files, JavaScript syntax, and diff whitespace checks passed. No provider calls, database changes, or UI changes were made. Tests use mocks and do not demonstrate real transaction rollback, bank credit, or production readiness.

### Recorded settlement blocker diagnostics (18 October 2026)

Settlement timing, allocation, response-evidence and unavailable-reference guards now emit specific safe codes. The worker's allowlist persists those codes for the existing recorded-error payment queue and audited inspection. Restricted inspection explains each code without exposing raw provider payloads or equating missing confirmation with a failed transfer. Existing historical generic errors are not reclassified. No new permissions or financial actions are introduced.

Validation: eight payment/admin unit-test files pass, covering emitted guard codes, worker allowlisting, restricted explanations and existing payment flows. JavaScript syntax and whitespace checks pass. No live provider calls, migrations or financial changes were performed. Real provider/database integration testing remains pending.

### Settlement escrow binding (18 October 2026)

Automatic online settlement now verifies the linked escrow ID, ride identity, passenger and traveler ownership, absence of a package link, and exact total/fee/traveler amounts against the booked payment. Optional escrow trip IDs must match when present; current ride booking does not populate that field, so absence remains supported. Missing escrow and conflicting evidence produce SETTLEMENT_ESCROW_MISMATCH, allowlisted by the worker and explained in restricted payment inspection. Frozen and already disposed escrow records remain excluded without mutation.

Eight Cashfree/admin payment test files pass, including missing escrow, wrong ownership, malformed/different amounts, optional trip compatibility, changed passenger, and frozen/refunded/released/retained exclusions. Syntax and whitespace checks pass. No live financial calls or migrations were made. Real transaction/provider integration validation remains pending.

### Refund escrow binding (18 October 2026)

Before refund processing calls the provider or closes a zero-value refund, a current booking's linked escrow is locked and checked for matching ride, passenger, traveler, amounts, optional trip and no package linkage. The escrow must still be held. Missing, mismatched, frozen or allocated records raise REFUND_ESCROW_MISMATCH; the worker stores this safe diagnostic and restricted inspection explains that review is required. This blocks automatic processing rather than repairing balances or overriding a freeze.

Payments that never booked may legitimately have no escrow link. Replaced payment orders continue through their original refund path without altering the current booking's escrow. Regression tests cover positive and zero-value guards, missing escrow, frozen/released/settlement-pending records, and replaced-payment isolation. Eight Cashfree/admin test files, syntax and whitespace checks pass. No live refunds, migrations or provider calls were made. Real transaction and provider integration tests remain pending.

### Refund response identity and status validation (18 October 2026)

Refund progress now requires a matching order ID, refund ID, INR currency, exact amount and recognized provider status. Unknown/malformed responses do not update refund status or completion timestamps, including responses after submission. A safe REFUND_EVIDENCE_INVALID worker diagnostic explains the need to investigate without creating a second refund. The documented PENDING_APPROVAL and REJECTED states are now supported by payment queue filtering, inspection, timeline interpretation and case financial review. Legacy FAILED remains readable for compatibility. Non-success states do not complete or automatically resubmit refunds.

Reference: https://www.cashfree.com/docs/api-reference/payments/latest/refunds/get-refund
The gateway API version remains 2025-01-01; no version/configuration change was made. The current documentation was checked; real configured-version sandbox validation remains pending. Eight backend unit-test files pass, covering lookup and submission responses, wrong/missing order/currency, unknown statuses and supported non-success states. No live refunds or migrations ran.

### Full and partial refund notification clarity (18 October 2026)

Successful online refund notifications now distinguish full and partial returns. Partial messages state both the refunded amount and retained amount using integer-paise arithmetic; no unsupported explanation of the retention reason is invented. Sandbox messages include the simulated amount and explicit no-real-money wording. Structured event metadata records refund amount, retained amount, scope and environment. Existing event identity and completion idempotency remain unchanged. This does not add partial refund execution controls or change refund policy/accounting.

Eight payment/admin test files, syntax and whitespace checks pass. New tests cover full and partial messages in both environments, decimal precision and repeated reconciliation producing only one notification. No live messages, provider calls, refunds or migrations were executed.

### Rider refund status alignment (18 October 2026)

Ride Details payment status now distinguishes refund pending approval, on hold, needs attention and unknown/awaiting confirmation states. Retained amounts are labeled retained rather than assumed to be cancellation fees. Refund failure does not claim the ride was cancelled. Sandbox labels persist across all refund states, including partial refunds; missing/invalid refund amounts are unavailable instead of coerced to zero. This is presentation only and does not change refund eligibility or execution.

Eight focused mobile refund-status tests passed with Watchman disabled (the default invocation could not start Watchman in this environment). Targeted lint has zero errors and one pre-existing inline-style warning. Device visual validation remains pending. No live financial or notification actions were taken.

### Ride payment status refresh isolation (18 October 2026)

The mobile payment-status panel now associates results with ride ID, refresh key and retry attempt. Loading hides previous payment evidence; late responses from previous requests are ignored. Refresh is disabled while checking with an immediate tap guard. Missing ride IDs do not fetch, malformed responses show retryable unavailability, and not-started payments hide the panel after loading. No financial action or polling loop was added.

Eleven focused mobile tests passed across refund copy and request-refresh behavior. Targeted ESLint and whitespace checks pass. Device navigation/network visual validation remains pending.

### Payment summary amount integrity (18 October 2026)

Payment-status summaries now parse money through integer-paise validation. Missing or invalid payment/fee/payout values serialize as null, not coerced zero or nonfinite numbers. Refund-required records with missing/invalid/excessive refund amounts expose unavailable refund and retained amounts; explicit zero remains distinct. Retained amounts use integer subtraction. Valid non-refund records preserve zero refund/retention defaults. Traveler UI displays unavailable earnings/fees rather than coercing null to zero.

Eight backend payment/admin test files and twelve focused mobile tests pass. Targeted syntax, lint and whitespace checks pass. This changes status projection only, not stored amounts or financial policy. No live payments, migrations or notifications ran; device validation remains pending.

### Ride Details foreground refresh (18 October 2026)

Ride Details' 30-second fallback polling now runs only while the screen is focused and AppState is active, and refreshes immediately on background-to-active transitions. Each fallback request completes before the next timer is scheduled; failed requests retry on the next interval. Cleanup removes timers/listeners and prevents a late completion from restarting polling. Existing focus loading and socket updates are unchanged; this does not serialize socket/manual refresh requests or cancel an in-flight network request.

Sixteen focused mobile tests pass across foreground refresh, payment refresh isolation and refund copy. Hook/test lint, Ride Details JSX parsing and whitespace checks pass. Device lifecycle validation remains pending; no financial actions or notifications were sent.

### Ride Details response ordering (18 October 2026)

Ride Details now guards data, offer, error and loading writes by request generation and ride/booking identity. New refreshes supersede older responses; navigation and unmount invalidate outstanding checks. Switching identity resets previous details and offers. A failed current offer refresh clears the old offer rather than continuing to show it. This does not abort network requests or serialize socket/manual traffic.

Nineteen focused mobile tests passed across request guards, foreground refresh and payment/refund behavior; the guard tests were rerun after lint cleanup. New hook/test lint, screen JSX parsing and whitespace checks pass. Full-screen device race/navigation tests remain pending.

### Ride Details traveler offer identity (18 October 2026)

The mobile accepted-offers fallback no longer selects the first array element. It requires a unique eligible offer consistent with any recorded traveler and trip IDs. For legacy records without assignment IDs, the accepted-offers endpoint may supply exactly one eligible offer; multiple candidates remain unresolved. Malformed or explicitly inactive offers are excluded. Previous fallback data is cleared when new ride details arrive so it cannot override the fresh ride while offers load.

Twenty-three focused mobile tests pass across selection, request ordering, lifecycle refresh and payment/refund copy. New helper/test lint, screen JSX parsing and whitespace checks pass. Real-device multiple-offer flow validation remains pending. This does not send requests, select a traveler server-side or change fares.

### Accepted-offer read compatibility (18 October 2026)

Removed the legacy expiry predicate from the rider-owned accepted-offers read API. Accepted responses expose no countdown regardless of stored legacy timestamps. Pending invitations retain their deadline filtering; checkout/booking live feasibility gates are unchanged. Ten backend test files pass across accepted-offer ownership/visibility, Cashfree flows, pickup eligibility and expiry, plus syntax/whitespace checks. No migrations, provider calls or notifications ran; device flow validation remains pending.

### Accepted-offer seat visibility (18 October 2026)

Accepted-offer availability now deducts booked seats and other rides' accepted/payment-pending/payment-failed holds, excluding the current ride and preserving accepted holds regardless of old timers. Invalid counts return null; oversubscribed snapshots show zero rather than negative seats. This remains an informational snapshot; locked checkout/booking validation is authoritative.

FoundTravelerScreen no longer replaces zero/missing seats with demo availability or claims an unsupported total capacity. Four relevant backend test files and two mobile label tests pass, with syntax/lint/whitespace checks. No seat reservations, database migrations or live financial actions ran. Device display and concurrent database validation remain pending.

### Traveler-offer presentation without demo data (18 October 2026)

FoundTravelerScreen now derives display values through a tested presenter instead of invented route, traveler, fare, rating, journey count and timing defaults. Ratings use total_ratings rather than ride count. Unsupported friendliness/on-time claims are removed. Missing values are unavailable; explicit zero values remain distinct. Departure dates/times use Asia/Kolkata and are no longer passed off as confirmed pickup times. The local accepted-offer countdown and expiry navigation are removed, consistent with live-feasibility accepted holds. Incomplete offer identity/fare blocks confirmation with existing toast guidance.

Six focused presenter/seat tests, helper lint, screen JSX parsing and whitespace checks pass. These do not replace device navigation/confirmation tests. No server financial policy or provider configuration changed.

### Accepted-offer action isolation (18 October 2026)

FoundTravelerScreen now shares an immediate in-flight guard across Confirm and Decline, exposes disabled/busy button states and displays action progress. Successful compatibility confirmation routes to Ride Details instead of creating a payment order and defaulting to wallet before opening an older review route. Review & Pay remains the checkout entry point. Request identity checks prevent late action completion from navigating after unmount or offer replacement; failures restore actions. Offered-fare copy no longer promises a guaranteed price.

Eleven focused mobile action/presenter/request-guard tests pass, including duplicate/conflicting taps, failure retry, unmount and decline completion. Test lint, screen parsing and whitespace checks pass. Real-device navigation/payment validation remains pending. No provider calls or live financial actions ran.

### Declined-offer navigation freshness (18 October 2026)

After a successful decline, FoundTravelerScreen replaces itself with Ride Details to load current server state. It no longer promotes cached allOffers entries or assumes the ride returned to searching. Existing toast feedback confirms the decline. Missing identity blocks submission/navigation; failures keep the screen retryable, and late completion after leaving the screen is ignored.

Fifteen focused action/presenter/request-guard tests pass, including cached alternatives, missing IDs, failed decline, late completion and conflicting actions. Test lint, screen parsing and whitespace checks pass. No live requests or notifications were sent; device navigation validation remains pending.

### Traveler-offer photos and verification claims (18 October 2026)

FoundTravelerScreen now uses supplied traveler and vehicle photos with a freshly obtained access token and the existing origin-aware image URI helper. Account tokens are not appended to third-party origins. Missing authentication or failed image loading leaves neutral asset placeholders; changed image/token remounts the fallback. Removed the unconditional verification tick because the offers response supplies no verification evidence. This does not implement identity or vehicle verification decisions.

Twenty-five focused photo/action/presenter/image-helper tests pass, with targeted helper/test lint, screen parsing and whitespace checks. Real-device protected-image delivery remains pending. No verification records or credentials were changed.

### Protected image URL token renewal (18 October 2026)

The shared request-image URI helper replaces existing backend token query parameters (including duplicate/encoded names) with the current token, preserving unrelated parameters and fragments. Without a current token, old backend tokens are removed. Authentication is inserted before fragments. Origin matching does not add credentials to third-party, different-port or different-scheme URLs; userinfo/control-character/backslash URLs are rejected. No credentials are logged.

Twenty-four focused image-helper/offer-screen tests, targeted lint and whitespace checks pass. Live protected-image/network validation remains pending. This only changes URI construction, not token issuance or server authorization.

### Matching traveler drawer photos (18 October 2026)

The mobile matching drawer now uses the shared origin-aware image URI helper, replacing stale backend photo tokens before URL fragments. Failed/missing profile photos use the neutral avatar; failed/missing vehicle photos show “Vehicle photo unavailable”. Changing the photo or token resets failure state. Missing credentials do not initiate protected photo requests. Request selection and submission remain unchanged.

Twenty-one focused drawer/image-helper tests pass, including request selection, pending-request blocking, authenticated photos, image failures, missing credentials and token renewal. Targeted lint and whitespace checks pass. Real-device image delivery remains pending.

### Matching drawer submission lifecycle (18 October 2026)

Matching traveler submissions now check the active ride/drawer session before applying success, failure or cleanup. Closing, unmounting, switching rides or reopening the same ride invalidates old response handlers. A stale failure cannot unlock a newer submission. The immediate in-flight guard also prevents refresh from competing with submission; existing duplicate-tap protection is regression tested. New drawer sessions reset local submission state and fetch current matches.

Twelve drawer tests pass, covering normal selection, pending requests, photos, rapid taps, refresh during submission, late success, late failure and reopening. Targeted lint and whitespace checks pass. These are mocked mobile component checks; real-device/network validation remains pending. This does not cancel a server-side request or replace backend concurrency controls.

### Matching drawer fare validation (18 October 2026)

Matching cards now reject missing, blank, boolean, array, negative, non-finite, over-precision and unsafe monetary values. Invalid values display “Fare unavailable” and disable selection with matching accessibility state. Selection and submission handlers also reject these fares; valid reviewed values are sent unchanged. Explicit zero remains distinct from missing data. This is client validation, not a fare-policy or backend pricing change.

Forty-eight focused fare/drawer tests pass, covering malformed values, explicit zero, decimal fares and existing submission/photo behavior. Targeted lint and whitespace checks pass. Real-device and live API validation remain pending.

### Matching drawer response validation (18 October 2026)

Matching responses require a matches array, a non-negative integer pending count and unique nonempty trip IDs; invalid entries/pending flags fail with refresh guidance. A card marked pending blocks further selection even if the aggregate count is zero. Failed refreshes clear the list and no longer simultaneously claim there are no matches and the ride is still searching. A successful refresh restores selection; an actual empty successful response retains the empty-search message.

Fifty-seven focused drawer/fare tests pass, including malformed response recovery, failed refresh and inconsistent pending counts, with targeted lint and whitespace checks. Real-device/live API validation remains pending. No backend booking, matching or concurrency rules changed.

### Matching request retry reconciliation (19 October 2026)

After a submission error, the mobile drawer discards old choices and requires a fresh matching response before another selection. A lost response may mean the server already committed the request, so network-error copy describes an unconfirmed outcome. Refresh shows any pending request; if no request exists, the rider must select again and review the refreshed fare. Failed refreshes keep selection unavailable. The existing backend ride lock and pending-request guard remain unchanged.

Thirty-three drawer tests pass, including lost submission responses, committed pending requests, failed refreshes and changed-fare retries. Targeted lint and whitespace checks pass. These are mocked component checks; device/network validation remains pending.

### Matching traveler metadata labels (19 October 2026)

The matching drawer validates ratings, review counts, pickup estimates and seat counts before displaying them. Missing/invalid ratings no longer become a zero-star score; unknown review counts no longer claim “No ratings yet”. Pickup estimates must be finite and non-negative, with fractional minutes rounded up. Missing/invalid seats display an unavailable label; explicit zero remains zero seats available. These presentation checks do not replace server capacity or pickup-feasibility decisions.

Fifty-four focused label/drawer tests pass, including missing/zero distinctions, invalid types, fractional counts, rating bounds and rendered fallback labels. Targeted lint and whitespace checks pass. Real-device/live API validation remains pending.

### Matching drawer foreground refresh (19 October 2026)

An open matching drawer clears selection and invalidates outstanding list loads when the app leaves the foreground. Returning triggers a fresh list load before selection, so old fares/pending states cannot be reused. Loads and submissions are guarded while backgrounded; an existing submission is not interrupted or overlapped by a foreground refresh. List refresh is event-driven, not continuous polling. Existing server fare/availability validation remains authoritative.

Thirty-seven drawer tests pass, including return with changed fare, an older load resolving after return and foreground return during submission. Targeted lint and whitespace checks pass. Real-device app lifecycle/network testing remains pending.

### Matching drawer detail text safety (19 October 2026)

Traveler names, vehicle labels, route labels and pickup-service text now use string-aware presentation. Non-text values cannot crash expanded details through split/replace or object rendering. Missing endpoints show explicit unavailable labels. Route arrows tolerate surrounding whitespace; plus-code prefixes are removed only when readable location text remains, preserving standalone codes. Card labels are computed once per rendered card.

Sixty-six focused drawer/presentation tests pass, including malformed detail expansion, missing endpoints and standalone plus codes. Targeted lint and whitespace checks pass. Device/live API validation remains pending; no route geometry or server matching changed.

### Server validation of reviewed alternative fares (19 October 2026)

New alternative-traveler requests now require a valid reviewed amount with at most two decimal places and safe integer paise. Missing, coercible, negative or over-precision amounts fail before matching/writes. Invalid server quotes fail without creating/notifying a request; valid amounts must exactly match the current quote in paise. Existing pending-request handling remains ahead of validation, preserving idempotent retries. The legacy mobile selection caller now supplies its displayed estimated amount, as the drawer already does. Clients omitting expected_amount must refresh/upgrade before creating a new invitation.

Both alternative-request and ride-marketplace unit test files pass; the alternative suite includes 22 cases covering malformed amounts, changed fares, valid creation, invalid quotes and pending retries. Controller/mobile syntax and whitespace checks pass. These mocked tests do not establish live database/provider/device readiness. No migration or pricing policy changed.
