# Gilo Admin form components

Updated 28 October 2026. Follow the existing shadcn base-nova configuration and Gilo emerald theme.

- Use `Input` for text, search, email, password and numeric fields. Retain labels, names and validation.
- Use `NativeSelect` for simple filter and form choices. It preserves FormData, option values and native keyboard behavior.
- Use `Textarea` for reasons and longer staff notes.
- Use `DatePicker` for date-only filters: a typed date field plus shadcn Calendar and Popover. Keep YYYY-MM-DD values without UTC conversion. Place a separate label with a unique htmlFor/id pair above the control; mapped controls need distinct IDs.
- Use `Switch` for boolean settings. Policy changes still require their existing reviewed save and reason. A switch interaction alone does not persist policy.
- Keep consent and financial attestations as explicit checkboxes. Do not turn them into immediate-action switches.
- Keep file uploads, hidden fields and radio semantics appropriate to their functions.

The official shadcn Calendar, Popover, Native Select, Switch, Checkbox and Textarea were added using the configured registry. Existing Button customization was preserved. Calendar button variants live in a separate module for Fast Refresh compatibility.

The migration replaces repeated raw text/select/textarea/date controls in root admin modules. Existing permission, preview, CSRF, required-field and API logic remains in its module. Shared Input is used in 68 root screens/components, NativeSelect in 42, Textarea in 36, DatePicker in 12 and Switch in two policy editors.

Regression checks cover controlled calendar selection, submitted form values, required/disabled dates, min/max date bounds and the existing filter/payment/support-policy interactions. The browser check selected 19 October 2026 and confirmed `/trips?from=2026-10-19`, then verified Escape dismissal without losing the date.

References: https://ui.shadcn.com/docs/components/base/date-picker and https://ui.shadcn.com/docs/components/base/native-select

## Compact list filters

Trips & rides and People now use a shared `FilterSelect` toolbar control inspired by the supplied Shadcn Admin tasks reference: dashed trigger, selected-value badge, searchable options and clear action. Hidden form values preserve existing server queries and URL filters. Selection remains single-value because these APIs accept one status/state; this UI does not pretend to support multi-status queries or fabricate facet counts. Other list modules retain their existing controls pending migration.

## Range calendars and column controls

Overview and Trips & rides use DateRangeFilter (shared shadcn Calendar/Popover) for one compact date range. Presets use the current India date, inclusive last-7/28-day windows, Monday-start weeks and calendar months. The form submits YYYY-MM-DD values to existing scheduled-date filters. Typed ranges are kept ordered; the current India date refreshes whenever the picker opens.

Journey listings use ColumnPicker for route, scheduled date and status visibility. Reference and the View action stay visible. Column changes are display-only and do not change server filtering or permissions. Bulk deletion and exports are not added to read-only journey records by imitation of the reference.
