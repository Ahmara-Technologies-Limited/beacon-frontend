# Backend Integration Status

## CRITICAL FIX (this pass): Live Mode login was completely broken

`app/login/page.tsx`'s `handleLoginSubmit` previously **always** validated
against the mock `db.getUsers()` and called `login(userMatch)` with a
pre-matched mock user object -- regardless of Demo/Live mode. In Live Mode
this meant real credentials were never sent to the backend: `AuthContext
.login()` branches on `isDemoMode()`, and since the login page always passed
a user object (not an email string), even the live branch would have
received garbage input. **Live Mode login has been non-functional until this
pass.**

Fixed: the login page now checks `useDemoMode()` and branches:
- **Demo Mode** — unchanged. Same client-side mock validation, failed-attempt
  lockout counter, and "Developer Quick Access" quick-fill buttons as before.
- **Live Mode** — skips local mock validation entirely and calls
  `login(loginEmail, loginPassword)`, which routes through `AuthContext` to
  `dataService.login()` → `POST /auth/login/`. Errors are handled via
  `ApiError`'s `.status` (401 → "Incorrect email or password", `0` → network/
  cold-start message, other → server message) instead of the old client-side
  password comparison. The failed-attempt lockout counter still increments on
  failed live logins (it's a UX nicety, not a security control -- real rate
  limiting is server-side and out of scope). The "Developer Quick Access"
  panel (which pre-fills demo-only credentials) is now hidden entirely in
  Live Mode via `useDemoMode()`, matching the conditional-rendering pattern
  already used in `Settings.jsx`. `db.getUsers()` is now only referenced
  inside the demo-mode branch.

## New feature (this pass): real password reset flow

Both "forgot password" entry points were pure UI simulations before this
pass (`alert()`, no email ever sent). Built a standard token-based flow:

**Backend (`apps/core`):**
- `POST /auth/password-reset/` (`PasswordResetRequestView`, `AllowAny`) —
  body `{email}`. Looks up the user; if found, generates a token via
  `django.contrib.auth.tokens.default_token_generator` + `urlsafe_base64_encode`
  of the user's pk, and emails a link to
  `{FRONTEND_URL}/reset-password?uid=...&token=...`. Always returns the same
  generic `{"message": "If an account exists for this email, a reset link
  has been sent."}` regardless of whether the email matched, to avoid user
  enumeration.
- `POST /auth/password-reset/confirm/` (`PasswordResetConfirmView`,
  `AllowAny`) — body `{uid, token, new_password}` (`min_length=6`, matching
  `ChangePasswordSerializer`'s convention). Decodes `uid`, validates the
  token via `default_token_generator.check_token()`, and on success calls
  `set_password()` + audit-logs via `log_audit()` against the *affected*
  user (there's no authenticated `request.user` in this unauthenticated
  flow). Returns a 400 with a clear message if the token/uid is invalid or
  expired.
- New serializers `PasswordResetRequestSerializer` /
  `PasswordResetConfirmSerializer` in `apps/core/serializers.py`; both new
  views registered in `apps/core/urls.py` as `auth/password-reset/` and
  `auth/password-reset/confirm/`, alongside the existing `auth/login/` /
  `auth/refresh/` pattern.
- **No new admin-only endpoint** — `UserManagement.jsx`'s admin "trigger
  reset" button now calls the same public `POST /auth/password-reset/` with
  the target user's email; requesting a reset link for any address is
  safe/anonymous by design.
- **Email delivery**: new `EMAIL_BACKEND` env var in `crm/settings.py`,
  defaulting to Django's console backend
  (`django.core.mail.backends.console.EmailBackend`) — logs the email to
  stdout instead of sending it, so this works out of the box in any
  environment with zero SMTP config. **Deployment TODO**: set
  `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` plus
  `EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD`/
  `EMAIL_USE_TLS`/`DEFAULT_FROM_EMAIL` env vars in the real deployment (e.g.
  Render) for password reset emails to actually be delivered — not solved in
  this pass, console backend is a dev-only stand-in.
- New `FRONTEND_URL` env var (default `http://localhost:3000`), used to
  build the reset link embedded in the email.
- No model changes — `python manage.py check` (0 issues) and
  `python manage.py makemigrations --check --dry-run` ("No changes
  detected") both verified after this pass.

**Frontend:**
- `dataService.requestPasswordReset(email)` / `dataService
  .confirmPasswordReset(uid, token, newPassword)` added to
  `src/data/dataService.js`, following the established `isDemoMode()`
  branch-per-method pattern: live mode calls the new endpoints; demo mode
  simulates success immediately (no real email system exists there).
  `confirmPasswordReset` in demo mode also just resolves successfully rather
  than throwing, since that path shouldn't realistically be reachable in
  demo mode (no real link is ever issued) but is handled defensively anyway.
- `app/login/page.tsx`'s "Forgot password?" link now opens an inline panel
  (not a separate modal component, to stay consistent with this page's
  existing single-card layout) collecting an email and calling
  `dataService.requestPasswordReset(email)`, then showing the same generic
  "if that account exists, check your email" confirmation the backend
  returns.
- New `app/reset-password/page.tsx` — reads `uid`/`token` from the query
  string via `useSearchParams` (wrapped in `Suspense` per Next.js
  requirements), collects new-password + confirm-password with the same
  min-length/confirm-match validation style as `Settings.jsx`'s change-
  password form, calls `dataService.confirmPasswordReset()`, and redirects
  to `/login?reset=success` on success or shows an inline error (invalid/
  expired token, mismatch, etc.) otherwise.
- `UserManagement.jsx`'s `handleTriggerResetPassword(user)` now branches on
  `isDemoMode()`: demo mode keeps the exact previous `alert()` +
  `db.logAudit()` simulation; live mode awaits `dataService
  .requestPasswordReset(user.email)` for real and alerts on success/failure.
- `npx eslint` run on every file touched/created this pass (`app/login
  /page.tsx`, `app/reset-password/page.tsx`, `src/data/dataService.js`,
  `src/views/UserManagement.jsx`) — all clean except one pre-existing,
  untouched-logic issue in `UserManagement.jsx`
  (`react-hooks/set-state-in-effect` on the existing 2-second polling
  `useEffect`, already flagged in a prior pass's verification notes; not
  introduced by this change).


## Audit pass — bugs found and fixed

Went back through both repos looking for anything still bypassing the
demo/live split. Found and fixed:

- **`PropertyManagement.jsx` read leads via `db.getLeads()` directly**,
  bypassing `dataService` entirely — the Properties page's client-name
  lookups would always show demo leads even in Live Mode. Now calls
  `dataService.getLeads()` like everywhere else.
- **Settings → Change Password did nothing server-side.** It compared
  `passwordData.currentPassword` against a plaintext `currentUser.password`
  field (which doesn't exist on the real backend/serializer) and called
  `db.saveUser()` — a no-op in Live Mode. Added a real
  `POST /users/change-password/` endpoint (`ChangePasswordSerializer` +
  `UserViewSet.change_password`, self-service, `IsAuthenticated`, validates
  `current_password` via `check_password()`, audit-logged), and
  `dataService.changePassword(currentPassword, newPassword)` wired into
  `Settings.jsx`. Demo mode keeps its previous plaintext-compare behavior.
- **JWT refresh-token rotation bug.** `SIMPLE_JWT` has
  `ROTATE_REFRESH_TOKENS=True` + `BLACKLIST_AFTER_ROTATION=True`, so every
  `/auth/refresh/` call issues a new refresh token and blacklists the old
  one — but `apiClient.js` was only saving the new access token, so the
  *second* silent refresh would always fail (using an already-blacklisted
  refresh token), silently logging the user out. Now saves both tokens from
  the refresh response.
- **Logout didn't invalidate anything server-side.** `LogoutView` just
  returned a message without touching the token; the blacklist app
  (`rest_framework_simplejwt.token_blacklist`) was installed but unused.
  `LogoutView` now accepts `refresh` in the body and blacklists it;
  `dataService.logout` now sends the stored refresh token.
- **No route-level authorization on the frontend.** `Sidebar.jsx` hid nav
  links per role, but a user could still navigate directly to a restricted
  URL (e.g. `/users`) and the page would render client-side. Extracted the
  role matrix into a single source of truth (`src/lib/routes.js`:
  `TAB_ROLES` / `isRouteAllowed`), used by both `Sidebar.jsx` (nav hiding)
  and `app/(protected)/layout.tsx` (actual guard — redirects to `/dashboard`
  on a disallowed route). This sits on top of the backend's `IsRolePermission`
  enforcement, which remains the real security boundary.

Left as-is (low risk, documented rather than fixed): `db.logAudit(...)`
calls in `LeadManagement.jsx` (CSV export/import) and `Inspections.jsx`
(CSV export) fire unconditionally regardless of mode — these are
client-only actions with no corresponding backend mutation, so there's
nothing to call live; they just keep writing to the demo audit trail,
which is harmless. `UserManagement.jsx`'s "trigger password reset" button
is still a pure UI simulation (`alert()` + local audit log) — no
password-reset-email flow exists on the backend; flagging as a real Phase 3
gap if that feature is wanted (would need an email-sending endpoint,
distinct from the new self-service change-password endpoint above).

## Code review fixes (previous pass)

Addressed 5 review comments from `ahmadtechie` on `crm-be`:

- **Property soft-delete.** `apps.core.Property` gained `is_active`
  (default `True`). `PropertyViewSet.destroy()` (`apps/core/views.py`) now
  fully overrides `destroy()` — sets `is_active=False`, saves, and calls
  `log_audit()` explicitly (mirroring the pre-existing `UserViewSet.destroy`
  pattern) instead of hard-deleting the row. `get_queryset()` filters
  `is_active=True`. `DELETE /properties/{id}/` still returns 204 with no body
  change — `dataService.deleteProperty` needed no changes.
- **Audit logs are now archivable, not erasable.** `apps.core.AuditLog`
  gained `is_active` (default `True`). `AuditLogViewSet.get_queryset()`
  filters `is_active=True`; the `clear` action does a bulk
  `.update(is_active=False)` instead of `.delete()`. Same
  `DELETE /audit-logs/clear/` URL/response (204) —
  `dataService.clearAuditLogs` needed no changes.
- **Notifications are dismissed, not deleted.** `apps.notifications
  .Notification` gained `dismissed` (default `False`).
  `NotificationViewSet.get_queryset()` filters `dismissed=False` (in addition
  to the existing `user=request.user` filter); `dismiss` sets
  `dismissed=True` and saves; `dismiss_all` bulk-updates the queryset.  Same
  URLs/methods/204 responses — `dataService.dismissNotification`/
  `dismissAllNotifications` needed no changes.
- **`SettingsView` refactored** from a hand-written `APIView` (manual
  `get`/`patch`) to `generics.RetrieveUpdateAPIView`, keeping `get_object()`
  overridden for the get-or-create singleton row and moving the
  `log_audit()` call into an overridden `perform_update(self, serializer)`.
  Same `GET`/`PATCH /settings/` behavior and response shape —
  `dataService.getSettings`/`saveSettings` needed no changes.
- **Removed redundant `permission_classes = [IsAuthenticated]`** across
  `apps/core/views.py`, `apps/finance/views.py`, `apps/notifications
  /views.py`, `apps/sales/views.py` (including the `UserViewSet.me` action
  and `LogoutView`), since `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES` in
  `crm/settings.py` already enforces `IsAuthenticated` globally. Unused
  `IsAuthenticated`/`permissions` imports removed alongside; views using
  something stricter (e.g. `IsRolePermission`) were left untouched (none
  were found in scope).

New migrations: `apps/core/migrations/0003_auditlog_is_active_property_is_active.py`,
`apps/notifications/migrations/0002_notification_dismissed.py`.

## Verification (this pass)

- `python manage.py check` → `System check identified no issues (0 silenced).`
- `python manage.py makemigrations --check --dry-run` → `No changes detected`
  (ran against a pip-installed Django 5.2 + DRF + simplejwt + django-filter +
  django-cors-headers/-environ/-phonenumber-field, phonenumberslite,
  drf-standardized-errors/-spectacular set, network access was available in
  this sandbox unlike the prior pass).
- `npx eslint` on every file touched in this pass — `src/lib/apiClient.js`,
  `src/lib/format.js`, `src/data/dataService.js` came back completely clean;
  `src/views/LeadProfile.jsx`, `src/views/DocOfficerHub.jsx`,
  `src/views/UserManagement.jsx`, `src/views/PropertyManagement.jsx`,
  `src/views/Inspections.jsx`, `src/views/Dashboard.jsx` came back with 27
  pre-existing problems (`react-hooks/set-state-in-effect` on the existing
  2-second polling `setInterval`s, `react/no-unescaped-entities`,
  `react-hooks/purity` on pre-existing `Date.now()` calls) — all in code this
  pass did not touch the surrounding logic of; none newly introduced.

## Authorization (this pass)

Authorization was `IsAuthenticated`-only across the whole API until now (any
logged-in user, any role, could hit any endpoint). This pass wires
`apps/core/permissions.py:IsRolePermission` (already existed, was unused) onto
the viewsets that correspond to role-gated modules in
`src/components/Sidebar.jsx`'s nav config, using its `roles:` arrays as the
source of truth. `.env.local` was also updated this pass to point
`NEXT_PUBLIC_API_URL` at the real deployed backend
(`https://crm-st0z.onrender.com`, Render free tier — cold starts, first
request after idle can take ~30s).

### Role matrix applied (viewset → required_roles)

- `UserViewSet` (Users module) — Super Admin, General Manager. Exception:
  `me` action explicitly overrides to `permission_classes=[IsAuthenticated]`
  (no role check) since every role needs to read its own profile.
- `PropertyViewSet` (Properties module) — all roles except Branch Manager:
  Super Admin, Sales Closer, Admin/Doc Officer, Inspection Officer,
  Relationship Manager, Head of Operations, General Manager.
- `SettingsView` (Settings module) — GET/PATCH asymmetry (see below).
- `AuditLogViewSet` (Audit Logs module) — Super Admin, General Manager.
- `LeadViewSet` (Leads module, incl. `archive`/`restore` actions, which have
  no permission override so they inherit the viewset-level role check per
  normal DRF behavior) — all roles except Inspection Officer: Super Admin,
  Sales Closer, Admin/Doc Officer, Relationship Manager, Head of Operations,
  Branch Manager, General Manager.
- `InspectionViewSet` (Inspections module) — Super Admin, Sales Closer,
  Inspection Officer, Head of Operations, Branch Manager, General Manager.
- `ActivityListCreateView` — not a distinct Sidebar module; gated identically
  to Leads since activities are always logged against a lead the user can
  already see.
- `PaymentPlanViewSet`, `InstallmentViewSet`, `DiscountRecordViewSet`,
  `CommissionViewSet`, `RefundRequestViewSet` (Legal & Finance Hub /
  `DocOfficerHub.jsx`) — Super Admin, Admin/Doc Officer, Head of Operations,
  General Manager.
- Follow Up and Pipelines (Sidebar `followup`/`pipeline`) have no dedicated
  backend endpoints — both views read/write through `LeadViewSet`, so they're
  already covered by the Leads role gate.

### Left as IsAuthenticated-only (no role gate)

- `NotificationViewSet` — the sidebar doesn't role-gate the notification
  bell (every role sees its own notifications), and `get_queryset` already
  scopes to `Notification.objects.filter(user=request.user, ...)`, so a role
  check would add nothing; confirmed correct as-is.
- `Dashboard`/`me`-style personal-data reads generally stay IsAuthenticated
  since Sidebar.jsx opens Dashboard to all 8 roles.

### `SettingsView` GET/PATCH decision

Sidebar.jsx opens the `settings` nav item to all 8 roles, but that reflects a
user viewing/self-servicing settings, not necessarily being trusted to
rewrite global system config. Decision: **GET stays `IsAuthenticated`**
(matches the sidebar exactly — every role can read current settings). **PATCH
is tightened to Super Admin / General Manager** — the same two roles trusted
elsewhere with User Management and Audit Logs ("System Administration"
section of the sidebar) — via `SettingsView.get_permissions()` branching on
`request.method`. This is a judgment call flagged as such in code comments:
a lower-privileged role being able to view thresholds shouldn't imply it can
silently change system-wide config.

### Sidebar.jsx vs backend consistency check

Compared every `roles:` array in `Sidebar.jsx` against `RoleManagement.jsx`'s
`DEFAULT_ROLES` permission descriptions (e.g. Branch Manager's description
covers leads/pipeline/inspections/reports but not properties) to sanity-check
intent. No mismatches found — the sidebar's per-module role arrays were
transcribed directly into `required_roles` with no gaps, so `Sidebar.jsx` did
not need any edits this pass. Since the sidebar already hides nav items a
role can't access, and now the backend enforces exactly the same matrix, a
logged-in user should never see a nav link that yields a 403 in normal use.
`src/lib/apiClient.js`'s `ApiError` already carries `.status`/`.body` from any
non-2xx response, which is sufficient for callers to special-case 403s if
ever needed — no new frontend error-handling UI was added this pass.

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

1. **RESOLVED.** `apps/core/serializers.py` now has `UserCreateSerializer`
   (first_name/last_name/password, `create()` delegates to
   `User.objects.create_user` for proper hashing) and
   `UserViewSet.get_serializer_class()` (`apps/core/views.py`) returns it for
   `POST`, falling back to the read/patch `UserSerializer` otherwise. On the
   frontend, `dataService.saveUser`/`userToApi` (`src/data/dataService.js`)
   now split `name` into `first_name`/`last_name` and send `password` only on
   create (`isCreate` flag; PATCH still omits both, since the update
   serializer has no write field for either). `src/views/UserManagement.jsx`'s
   add-user form now collects a required password (min 8 chars, create mode
   only) and submits it through the existing `handleSaveUser` flow.
2. **RESOLVED.** The backend already had `/auth/refresh/` wired to SimpleJWT's
   `TokenRefreshView` (`apps/core/urls.py`). `src/lib/apiClient.js`'s
   `request()` now retries exactly once on a 401: it POSTs the stored refresh
   token to `/auth/refresh/`, stores the new access token, and replays the
   original request (`_isRetry` guard prevents loops; `/auth/login`/`/auth/
   refresh` themselves are excluded from the retry path). Concurrent 401s
   share one in-flight refresh call. If refresh fails (no/expired refresh
   token), tokens are cleared and the original `ApiError` propagates as
   before — no change to how the rest of the app reacts to that.
3. **Budget field type mismatch — display-formatting half RESOLVED; the
   data-type half (backend expects a decimal) is unchanged/out of scope.**
   Added `src/lib/format.js` (`formatCurrency`, `parseBudgetNumber`,
   `formatBudget`) as the shared helper. Applied it at every render site that
   was printing `lead.budget` (or a value parsed from it) directly, which
   would otherwise show `NaN`/garbage once `budget` is a raw number from the
   API instead of the mock's pre-formatted string:
   `src/views/PropertyManagement.jsx` (lead budget column),
   `src/views/Inspections.jsx` (lead budget in the inspection card),
   `src/views/LeadProfile.jsx` (header budget meta item), and
   `src/views/Dashboard.jsx` (lead budget column, "at-risk" opportunity
   budget line, and every `parseInt(l.budget.replace(...))` revenue/forecast
   calculation, now `parseBudgetNumber(l.budget)`, which handles both a
   formatted string and a raw number safely). `LeadProfile.jsx`'s existing
   local `formatPrice` — used only for payment-plan-derived numeric
   values that are never a pre-formatted string — was left as-is rather than
   forced onto the new helper, to minimize risk.
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
6. **RESOLVED.** `handleCreatePlan` and `handleLogPayment` in
   `src/views/LeadProfile.jsx` now call `dataService.savePaymentPlan`/
   `dataService.updateInstallment` (not `dataService.saveLead`) for the
   `PaymentPlan`/`Installment` records themselves — this was already the
   state of the code found at the start of this pass. What was still missing
   and has now been fixed: `loadLeadData()` never populated `lead.paymentPlan`
   for live mode (only demo mode's `db.getLeads()` embeds it), so the JSX
   reading `lead.paymentPlan` (the payment plan tab, receipts, etc.) would
   have silently been `undefined` against a real backend. `loadLeadData` now
   does `if (foundLead.paymentPlan === undefined) foundLead.paymentPlan =
   await dataService.getPaymentPlan(foundLead.id)`, mirroring the same
   attach-on-read pattern already used by `DocOfficerHub.jsx`'s
   `loadHubData`. Demo mode is unaffected (the `undefined` check is a no-op
   there). This was not tested against a live backend (none available in
   this sandbox) — verify the finance flow end-to-end once
   `NEXT_PUBLIC_API_URL` points at a real instance.
7. **RESOLVED — turned out to already be fixed.** `apps/sales/migrations/
   0002_alter_inspection_options.py` was found already present and already
   committed (part of commit `0651cbb`, which predates this pass) — it
   contains only an `AlterModelOptions` (`Meta.ordering`) change, no
   column/schema changes. Re-ran `makemigrations --check --dry-run` in this
   pass to confirm: "No changes detected" (see Verification below). No code
   change was needed for this gap.
