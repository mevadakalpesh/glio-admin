# Shared admin presentation

Admin lists use the existing shadcn controls, neutral table surfaces, Gilo accents and Lucide icons. Workspace typography, table spacing, cards and form-control surfaces are scoped to `#main` in `src/index.css` so authentication screens are unaffected.

`components/ui/admin-table.tsx` adds a column picker to ordinary tables. Keep the first identity column and action columns visible. Grouped headers retain their original structure without column controls. Column choices are display-only component state; they never change API queries, exported data, permissions or financial values. Existing row elements and their handlers remain intact.

The shared table is used in verification, access/audit, catalog, withdrawals, settlements and ledger, notifications, payment webhook health, reports, tracking inspection and pricing-policy tables. Lists already using explicit ColumnPicker controls retain those implementations.

Wallets & settlement uses a compact search toolbar, empty state, expandable record guidance and a three-dot menu for permitted ride/ledger inspection. Financial approvals, evidence attestation and other consequential forms remain explicit in their existing workflows. Do not invent Edit/Delete/Refund menu entries merely to match a design reference.

Validation: build, lint, the frontend regression suite and shared-table tests. Live payment/settlement rows are verified with test fixtures when the local database has no such records; this is not bank/provider transaction verification.
