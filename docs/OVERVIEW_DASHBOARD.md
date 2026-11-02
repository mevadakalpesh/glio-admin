# Gilo Overview dashboard

Overview uses shadcn Card and Chart components with real, permission-scoped API data.

- Summary cards, attention queues and donut charts use `/overview`. Date filters apply to scheduled trip departure and requested ride pickup, in IST. Counts describe current recorded status.
- The activity chart uses `/reports/journeys`, only for staff with `reports.read`. It shows actual daily creation counts for the last 30 days and the selected region. Its date basis is explicitly separate from the scheduled-date filters.
- Refresh reloads both sources. Region changes clear previous report data. Journey links preserve scheduled-date and state filters.
- Failed requests show unavailable states, not zero counts. Successful empty reports show empty states. Daily counts are also available as an accessible table.
- No revenue, conversion or percentage-growth metrics are inferred from journey status counts. Payment-pending rides are not evidence of a payment failure.

Validation: dashboard permissions, filtered drill-downs, refresh, report failure/empty handling, production build, lint, and browser rendering are checked alongside the admin regression suite.

## Business overview

Owners viewing all regions receive total registered customers, new registrations in the last 30 rolling days, and five latest registrations. Customer detail links contain IDs; contacts are not exposed in these cards. These aggregates use account registration dates, independently of scheduled-journey filters. Regional views do not query or return these global aggregates.

Live payment volume aggregates PRODUCTION payment records with paid_at, before refunds, all time. Missing amounts make the aggregate unavailable. Sandbox and wallet transactions are excluded. It is not revenue. Net revenue remains unavailable because escrow has no authoritative test/live attribution and a verified recognition/reversal report is not implemented.

Active trip statuses are started/picking-up/on-the-way/returning; active rides are pickup/on-the-way. These are recorded status counts, not GPS-confirmed presence. Disputes show ride status 14. Support alerts reuse the authorized support-tickets alerts endpoint, and reflect the staff scope rather than journey filters. Queue counts can overlap.
