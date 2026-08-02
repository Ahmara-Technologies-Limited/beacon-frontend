# Backend Integration Status

## Environment

- `NEXT_PUBLIC_API_URL` — base URL of the Django backend (no `/api` prefix, no
  trailing slash). Set in `.env.local` (currently a placeholder:
  `http://localhost:8000`, since the ngrok tunnel was offline at the time of
  this work — update it to point at the real backend/tunnel).
- Demo Mode toggle: `src/views/Settings.jsx` → "Data Source" card. Backed by
  `src/lib/demoMode.js` (`localStorage['beacon_demo_mode']`, default `true`).
- Backend: `python manage.py check` and `python manage.py makemigrations
  --check --dry-run` were run from `crm-be/` against a locally-assembled venv
  (Django 5.2, since the pinned `Django==6.0.7` in `requirements.txt` isn't
  yet published to PyPI in this sandbox — install the exact pinned versions
  in a real environment before deploying) with a throwaway SQLite `.env`.
  `check` passed with 0 issues; the only pending migration is pre-existing
  (see gap #8).

## Architecture

- `src/lib/apiClient.js` — fetch wrapper. Reads `NEXT_PUBLIC_API_URL`, attaches
  `Authorization: Bearer <access>` from `localStorage['beacon_access_token']`,
  JSON in/out, throws `ApiError` (with `.status`/`.body`) on non-2xx.
- `src/lib/demoMode.js` — `isDemoMode()` / `setDemoMode()` / `useDemoMode()`
  hook, `localStorage['beacon_demo_mode']`, default `true`.
- `src/data/dataService.js` — facade. All views/components should call this
  instead of `db.*` for the four live-backed entities. Each method checks
  `isDemoMode()`: true → delegates to `db.*` (mock, wrapped in
  `Promise.resolve`); false → calls the real API and translates field names
  both directions (see mapping tables below).
- `src/context/AuthContext.tsx` — `login`/`logout` are now `async`. In demo
  mode `login(userObject)` keeps the old "role switcher" UX. In live mode
  `login(email, password)` POSTs `/auth/login/`, stores JWT tokens, stores the
  returned user.

## Live-wired entities (demo mode by default, real API when Live Mode is on)

- **Leads** — `dataService.getLeads/getArchivedLeads/saveLead/archiveLead/restoreLead`
- **Users** — `dataService.getUsers/saveUser/deleteUser`
- **Inspections** — `dataService.getInspections/saveInspection`
- **Activities** — `dataService.getActivities/saveActivity`
- **Properties** — `dataService.getProperties/saveProperty/deleteProperty` →
  `GET/POST /properties/`, `GET/PATCH/DELETE /properties/{id}/`
  (`apps/core.PropertyViewSet`).
- **Notifications** — `dataService.getNotifications/markNotificationRead/
  dismissNotification/dismissAllNotifications/markAllNotificationsRead` →
  `GET /notifications/`, `POST /notifications/{id}/read/`,
  `POST /notifications/{id}/dismiss/`, `POST /notifications/mark-all-read/`,
  `POST /notifications/dismiss-all/` (`apps/notifications.NotificationViewSet`,
  scoped to `request.user`). `addNotification` stays demo-only — the backend
  creates notifications server-side (see `LeadViewSet.restore` precedent);
  there's no client-facing need to POST one directly yet.
- **Settings** — `dataService.getSettings/saveSettings` → singleton
  `GET/PATCH /settings/` (`apps/core.SettingsView`, an `APIView` that
  get-or-creates the single `Settings` row rather than a full CRUD viewset).
- **Audit log** — `dataService.getAuditLogs/clearAuditLogs` → `GET
  /audit-logs/` (most-recent-first, read-only), `DELETE /audit-logs/clear/`
  (`apps/core.AuditLogViewSet`). `logAudit` stays demo-only — in live mode
  every mutation across the API now writes an `AuditLog` row server-side,
  either automatically via the new `AuditLogMixin` or via an explicit
  `log_audit()` call where the mixin can't reach (see below).

  **`apps/core/mixins.py:AuditLogMixin`** — a DRF view mixin that overrides
  `perform_create`/`perform_update`/`perform_destroy` to call `super()` then
  `log_audit(request.user, message, get_client_ip(request))`. The default
  message is `f"{Created|Updated|Deleted} {model verbose name}: {obj}"`
  (relying on each model's `__str__`); viewsets can override the
  `audit_action_verb` dict or the `get_audit_message(self, obj, verb)` hook
  for a more specific message (used by `CommissionViewSet` and
  `RefundRequestViewSet` to phrase status-update messages naturally). It
  skips logging for anonymous/unauthenticated requests and only fires on
  mutations, never on GET/list/retrieve. It works for both `ModelViewSet`
  and `generics.ListCreateAPIView` subclasses since both share the same
  `perform_*` hooks; views that already override `perform_create`/
  `perform_update` with custom logic (e.g. `InspectionViewSet`,
  `ActivityListCreateView`, `NotificationViewSet.perform_create`) call the
  mixin's `self._log(obj, verb)` helper directly at the end of their custom
  method body instead of relying on the overridden hook, since their own
  `perform_create` shadows the mixin's.

  **Coverage — automatic via the mixin:**
  `UserViewSet` (create/update — not `destroy`, see below), `PropertyViewSet`
  (create/update/delete), `LeadViewSet` (create/update via the default
  `ModelViewSet` flow — not `archive`/`restore`, see below),
  `InspectionViewSet` (create/update, via explicit `self._log()` calls since
  it overrides `perform_create`/`perform_update`), `ActivityListCreateView`
  (create, via explicit `self._log()`), `NotificationViewSet` (create only,
  via explicit `self._log()` in its overridden `perform_create`),
  `PaymentPlanViewSet`, `InstallmentViewSet`, and the three new finance
  viewsets (`DiscountRecordViewSet`, `CommissionViewSet`,
  `RefundRequestViewSet`).

  **Coverage — still manual `log_audit()` calls, and why:** `UserViewSet
  .destroy` (fully overrides `destroy()`, not just `perform_destroy`, so the
  mixin's hook never fires — kept its pre-existing manual call),
  `LeadViewSet.archive` (a custom `@action`, no `perform_*` hook to hang off
  of — kept its pre-existing manual call), `SettingsView.patch` (a plain
  `APIView`, not a `ModelViewSet`/`generics` view, so it has no `perform_*`
  hooks at all — kept its pre-existing manual call). `LeadViewSet.restore`
  and `NotificationViewSet`'s `read`/`dismiss`/`mark_all_read`/`dismiss_all`
  custom actions remain **unlogged** — same category of gap (custom actions
  bypass the mixin) but judged low-value to hand-instrument in this pass
  (notification read/dismiss state is not typically audit-worthy); flagging
  as a follow-up if that changes.
- **Finance (payment plans/installments)** — new `dataService.getPaymentPlan
  (leadId)/savePaymentPlan(leadId, plan)/updateInstallment(installmentId,
  updates)` → `GET/POST /finance/payment-plans/` (filterable by `?lead=`),
  `GET/PATCH /finance/payment-plans/{id}/`, `PATCH
  /finance/installments/{id}/` (`apps/finance.PaymentPlanViewSet` /
  `InstallmentViewSet`; `PaymentPlanSerializer` nests `installments` and
  supports create/update of the whole plan+installments tree in one call).
  **Not yet wired into `LeadProfile.jsx`/`Dashboard.jsx` call sites** — see
  gap #7.
- **Finance (discount / commission / refund ledgers)** — new backend models
  `apps.finance.DiscountRecord`, `apps.finance.Commission`,
  `apps.finance.RefundRequest` (migration
  `apps/finance/migrations/0002_commission_discountrecord_refundrequest.py`),
  all FK'd to `Lead` (and `Commission.closer` FK'd to `User`) rather than
  storing denormalized name strings — serializers expose read-only
  `client_name`/`closer_name`/`property_interest` derived from the relation.
  New endpoints: `GET/POST /finance/discounts/` (filterable by `?lead=`),
  `GET/POST/PATCH /finance/commissions/` (filterable by `?lead=`/`?closer=`),
  `GET/POST/PATCH /finance/refunds/` (filterable by `?lead=`)
  (`apps/finance.DiscountRecordViewSet` / `CommissionViewSet` /
  `RefundRequestViewSet`). `dataService.getDiscounts/createDiscount`,
  `getCommissions/createCommission/updateCommissionStatus`,
  `getRefunds/createRefundRequest/updateRefundStatus` now sit in front of
  these — demo mode keeps the exact same `localStorage['beacon_discounts'
  /'beacon_commissions'/'beacon_refunds']` read/write behavior as before
  (moved into `dataService` rather than touched directly by the views), live
  mode calls the new endpoints. `src/views/LeadProfile.jsx`
  (`handleCreatePlan`, `handleLogPayment`) and `src/views/DocOfficerHub.jsx`
  (`loadHubData`, `handleCreateRefundRequest`, `handleUpdateRefundStatus`,
  `handleUpdateCommissionStatus`) now call these `dataService` methods
  instead of touching `localStorage` directly. `DocOfficerHub.jsx` still
  polls every 2s (`setInterval(loadHubData, 2000)`) to re-fetch — kept for
  demo-mode parity, but in live mode this is a wasteful polling loop; a
  future improvement would replace it with websockets/SSE push updates
  instead of polling on an interval.

Migrated call sites: `src/views/LeadManagement.jsx`, `LeadProfile.jsx`,
`UserManagement.jsx`, `Inspections.jsx`, `PipelineTracker.jsx`, `FollowUp.jsx`,
`Dashboard.jsx` (leads/users/inspections/activities reads only),
`src/components/LeadModal.jsx`, `LogActivityModal.jsx`, `InspectionModal.jsx`,
`src/context/AuthContext.tsx`, `src/views/PropertyManagement.jsx`,
`src/views/AuditLogs.jsx`, `src/views/Settings.jsx` (system thresholds), and
`src/components/Header.jsx` (notification bell).

## Still mock-only (regardless of Demo/Live Mode)

- **Reports.jsx, RoleManagement.jsx** — untouched, as before.
- **Refund request file upload** — `DocOfficerHub.jsx`'s "Supporting
  Document" upload in the refund request modal remains a pure client-side
  simulation (`handleSimulateUpload` fakes a progress bar; only `fileName`/
  `fileSize` metadata is recorded on `RefundRequest`, no actual file bytes
  are stored anywhere). This was already the case before this pass and
  building real file upload/storage infrastructure was out of scope here —
  the new `RefundRequest.file_name`/`file_size` fields just persist the same
  metadata server-side now instead of in `localStorage`.
- `Dashboard.jsx`'s payment-plan-derived reminder notifications (installment
  due/overdue) are still computed client-side from `lead.paymentPlan` in demo
  mode; the live `/notifications/` endpoint does not yet generate these
  server-side.

## Known gaps

1. **No password field on user create/update.** `apps/core/serializers.py`'s
   `UserSerializer` only exposes `full_name` (read-only), `email`,
   `phone_number`, `role`, `is_active`, `date_joined`. There's no write path
   for `first_name`/`last_name` or a password, so `dataService.saveUser` in
   live mode can only patch email/phone/role/active-status — creating a new
   user via the UI won't be able to set their name or password until the
   backend adds a create serializer (or a separate `/users/invite/` endpoint).
2. **No token refresh.** `apiClient.js` has a TODO — a 401 from an expired
   access token just surfaces as an `ApiError`; there's no automatic refresh
   via SimpleJWT's `/auth/refresh/` (or equivalent) yet.
3. **Budget field type mismatch.** Mock data stores `budget` as a formatted
   Naira string (`"₦150,000,000"`); the backend expects a decimal number.
   `dataService`'s `leadToApi` strips non-digits before sending; display
   formatting is left to the UI layer, which mostly still expects the mock's
   pre-formatted string in a few places — worth a follow-up pass to
   consistently format `lead.budget` at render time everywhere.
4. **Lead `status`/`is_active` mismatch.** Mock leads use `status: "Active" |
   "Archived"`; the backend model appears to use a boolean `is_active` (plus
   the `archive`/`restore` actions). `leadFromApi` maps `is_active === false`
   → `status: "Archived"`, but this hasn't been exercised against a live
   backend and should be verified once `NEXT_PUBLIC_API_URL` points at a real
   instance.
5. **`npm run build` could not be run to completion** in this sandbox — no
   network access to download the `@next/swc` binary. `npx eslint` was run
   directly against every file touched in this pass (Phase 1 + Phase 2); it
   completed with only pre-existing issues (`react-hooks/set-state-in-effect`,
   `react/no-unescaped-entities`) that also fire on files this work never
   touched (e.g. `Settings.jsx:183`, unrelated to this change) — none were
   newly introduced. Recommend running `npm run build` in an environment with
   registry access before shipping.
6. **Finance UI not migrated (payment plans themselves).**
   `dataService.getPaymentPlan/savePaymentPlan/updateInstallment` exist and
   are ready to use, but `LeadProfile.jsx` (payment plan creation at
   `handleCreatePlan`, payment logging at `handleLogPayment`) and
   `DocOfficerHub.jsx` (read-only payment plan dashboard) still read/write
   `lead.paymentPlan` embedded on the lead object via `dataService.saveLead`,
   not the new `/finance/payment-plans/` / `/finance/installments/`
   endpoints. This was judged too risky to migrate in this pass without a
   live backend to test against (multi-step flows: plan creation, partial
   payments, auto stage-advance to "Allocation" on payoff) — flagging as a
   follow-up rather than risking half-tested changes to a financial flow.
   Demo mode is completely unaffected either way. Note: the
   discount/commission/refund *ledgers* that are side effects of these same
   handlers (`handleCreatePlan`/`handleLogPayment`) **are** now wired to the
   real backend (see the Finance ledgers entry above) — only the
   `PaymentPlan`/`Installment` records themselves remain demo-embedded.
7. **`makemigrations --check --dry-run` reports one pending, unrelated
   migration.** `apps/sales/migrations/0002_alter_inspection_options.py`
   (an `Inspection` `Meta.ordering` change) is still not generated/committed
   — `git diff apps/sales/models.py` confirms this predates this pass and
   wasn't touched by it. This is separate from the finance migration added
   in this pass (`apps/finance/migrations/0002_commission_discountrecord_refundrequest.py`),
   which **was** generated and confirmed to apply cleanly (`migrate --plan`
   and `migrate` both run clean against a throwaway local SQLite db).
