# Gilo Admin

- Brand: Gilo. First release covers rides and trips; packages are deferred.
- Read docs/ADMIN_PLAN.md before adding a module. Mark planned vs implemented clearly.
- Reuse business services in /home/kalpesh/boxwatch-admin; do not duplicate fare or settlement calculations in the browser.
- Never grant staff access from a consumer token or frontend role check. Require dedicated server-enforced permissions before connecting live data.
- Use the existing shadcn/ui components, Lucide icons and Gilo emerald/slate tokens.
- Display INR and Asia/Kolkata times. Keep provider secrets and customer identity documents out of frontend source and public assets.
- Financial actions require a server preview, permission check, reason, version/idempotency safeguards and audit.
- Do not fabricate live metrics or customer data; use explicit unavailable/planned states.
- Preserve uncommitted work. Do not reset databases or run destructive migrations during frontend setup.
- Verify build and lint for changes; test meaningful behavior when adding real operations.

- Admin visual direction: use the user's shadcnuikit.com/dashboard reference for an inset white workspace, neutral sidebar, compact toolbar, consistent shadcn cards and clear typography. Preserve Gilo emerald accents and actual operations data. Reuse components/ui primitives; do not fabricate trend/revenue metrics to imitate the example.

- Use shared shadcn components for admin forms: Input for text/search/numeric fields, NativeSelect for simple form filters, Textarea for reasons, DatePicker (Calendar + Popover) for date-only values, and Switch for boolean settings. Keep explicit consent/attestation as checkboxes. Date labels must be separate labels with unique htmlFor/id pairs, including repeated fields. Preserve form names, validation, disabled/read-only states, date-only YYYY-MM-DD values and existing server authorization. Do not duplicate raw control styling in new modules.

- Date-range filters must use the shared DateRangeFilter: a non-editable button displaying the selected range, calendar range selection and preset shortcuts. Do not reintroduce separate editable From/To date inputs, including inside the popover. Preserve form field names (including created_from/created_to), IST date-only semantics, required ranges and endpoint limits. Single document-expiry dates and time-specific operational schedules are separate controls, not range filters.

- Show filter Clear/Reset controls only when their scoped filters or draft values are nonempty. Pagination alone is not a filter. Clearing must reset both applied parameters and draft controls; use FilterClearButton for form-based draft tracking. Hide Clear dates on empty ranges and Reset columns when no columns are hidden.
