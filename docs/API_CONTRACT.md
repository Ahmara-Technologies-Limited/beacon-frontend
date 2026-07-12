# Beacon CRM — Frontend API Requirements

The frontend currently runs against a mock data layer (`src/data/mockData.js`) that
persists everything to `localStorage`. That file is the source of truth for
everything below — it's the exact shape and behavior the UI already expects, so
it doubles as a spec. This document translates it into the API contract the
frontend needs from the real backend.

**Frontend routing update:** the app now has real URLs (Next.js routing) —
`/login`, `/dashboard`, `/leads`, `/leads/:id`, `/properties`, `/doc-hub`,
`/users`, `/roles`, `/followup`, `/inspections`, `/pipeline`, `/reports`,
`/settings`, `/audit` — with a route guard that redirects unauthenticated
visitors to `/login`. This doesn't change the API shape below, but it does
mean `/leads/:id` is now a real, linkable path (see the Notification section).

## Auth

There is currently **no real authentication** — login checks email against a
seeded user list and compares a plaintext `password` field (defaulting to the
literal string `"password"` if unset). This needs a real implementation:

- `POST /auth/login` — `{ email, password }` → `{ token, user }`
- `POST /auth/logout`
- `GET /auth/me` → current user (session/token restore on page reload)

Frontend expects standard credential-not-found vs account-inactive vs
wrong-password distinctions (see lockout behavior below).

**Business rule to preserve:** 5 failed login attempts locks the account for
15 minutes. Fine to enforce this server-side instead of client-side.

## Core entities

### User
```ts
{
  id: string;
  name: string;
  email: string;
  role: "Super Admin" | "Sales Closer" | "Inspection Officer" | "Admin/Doc Officer"
      | "Relationship Manager" | "Head of Operations" | "Branch Manager" | "General Manager";
  status: "Active" | "Inactive";
  phone: string;
  dateAdded: string;       // ISO date
  branch?: "Lekki Branch" | "Maitama Branch" | "Airport Residential Branch";
}
```
Branch is only meaningful for Sales Closer / Branch Manager roles.

### Lead
```ts
{
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  location: string;
  source: string;            // see Enums
  category: string;          // see Enums
  stage: string;              // one of the 14 pipeline stages, see Enums
  temperature: "Hot" | "Warm" | "Cold";
  assignedCloserId: string | null;
  branch: string | null;
  budget: string;             // currently a formatted display string e.g. "₦150,000,000" — recommend storing as a number and formatting client-side
  propertyInterest: string;
  nextAction: string;
  followUpDate: string;       // ISO datetime, or "" if unset
  lastActivityDate: string;   // ISO datetime, server-updated on any activity/inspection/lead write
  dateCreated: string;        // ISO datetime
  status: "Active" | "Archived";
  applicationFormStatus?: "Not Started" | "Sent to Lead" | "Submitted" | "Approved";
  paymentPlan?: PaymentPlan;

  // Relationship Manager fields (clients/referrals only)
  relationshipStatus?: "Active" | "Warm" | "Dormant" | "Cold" | "At Risk";
  referralStatus?: "None" | "Requested" | "Generated Referral" | "N/A";
  satisfactionScore?: 1 | 2 | 3 | 4 | 5;
  referralCount?: number;
  lastContactDate?: string;    // ISO date
  referredById?: string;       // Lead.id of the referring client
}

type PaymentPlan = {
  regularPrice: number;
  discountAmount: number;
  authCode: string;            // discount authorization code, free text
  netPrice: number;
  depositPaid: number;
  balance: number;
  durationMonths: number;
  installmentVal: number;
  installmentsList: Installment[];
  dateCreated: string;          // ISO date
};

type Installment = {
  index: number;
  amount: number;
  dueDate: string;               // ISO date
  status: "Pending" | "Paid";
};
```

### Inspection
```ts
{
  id: string;
  leadId: string;
  estate: string;
  date: string;                  // ISO date
  time: string;                  // "HH:mm"
  meetingPoint: string;
  assignedCloserId: string;
  inspectionOfficerId: string;
  status: "Scheduled" | "Confirmed" | "Completed" | "No-Show" | "Cancelled" | "Rescheduled";
  internalNotes: string;
  createdBy: string;             // user name, snapshotted at creation — consider createdById instead
  createdDate: string;           // ISO datetime

  // populated when status becomes "Completed"
  report?: string;
  feedback?: string;
  nextStepRecommendation?: string;
  photos?: string[];             // currently unused/empty — needs real file upload if kept

  // populated when status becomes "No-Show"
  noShowNote?: string;
}
```

### Activity (the lead's interaction/timeline log)
```ts
{
  id: string;
  leadId: string;
  date: string;                  // ISO datetime
  type: "Call" | "WhatsApp" | "SMS" | "Email" | "Voice Note" | "Meeting"
      | "Internal Note" | "Site Inspection Report" | "Site Inspection No-Show";
  summary: string;
  objections: string;
  feedback: string;
  nextStep: string;
  loggedBy: string;               // user name — consider loggedById instead
}
```
**Write-time side effects to preserve:** creating an activity can optionally
carry `updateFollowUp`/`followUpDate` and `updateStage`/`pipelineStage` flags,
which should patch the parent lead's `followUpDate`/`stage` as part of the
same write (currently two client-side writes; should be one transaction
server-side).

### Notification
```ts
{
  id: string;
  type: string;                  // e.g. "New Lead Unassigned", "Missed Follow-up", "Dormant Lead", "Payment Plan Due", "Payment Plan Overdue"
  message: string;
  timestamp: string;              // ISO datetime
  read: boolean;
  link?: string;                  // "/leads/:id" or the literal string "/follow-ups"
}
```
**On `link`:** the frontend now has real routes (see below), and `/leads/:id`
links already match the actual route path 1:1. `/follow-ups` is a special
case though — it's matched as an exact literal string in the click handler
and translated to the `/followup` route, it isn't a real path itself. Keep
using these same two forms; don't start emitting arbitrary paths without
frontend coordination.

**Important:** payment due/overdue notifications are currently *computed
client-side* on every page load by scanning every lead's
`paymentPlan.installmentsList` for anything due within 14 days. Recommend the
backend generate these (scheduled job or computed-on-read) instead of the
frontend looping every lead on every poll.

### Property
```ts
{
  id: string;
  name: string;
  type: string;                   // e.g. "Estate Plot", "5 Bedroom Duplex" — free text in practice
  location: string;
  totalUnits: number;
  availableUnits: number;
  price: number;
  status: "Selling" | "Sold Out" | "Planned";
  description: string;
  amenities: string[];
}
```

### Settings (single record, not a list)
```ts
{
  contactHoursLimit: number;          // hours
  dormancyDaysThreshold: number;      // days
  inspectionConfirmationHours: number;
  remindersTiming: string;            // e.g. "1 hour before" — free text in practice
}
```

### AuditLog (read-mostly; see note below on how entries are created)
```ts
{
  id: string;
  timestamp: string;      // ISO datetime
  user: string;            // "Name (Role)" — consider separate userId + role fields
  action: string;          // free-text description of what happened
  ipAddress: string;
}
```

### Role / Permission
```ts
{
  id: string;
  name: string;
  description: string;
  color: string;            // hex, for the UI badge
  isSystem: boolean;        // system roles can't be deleted
  permissions: string[];    // flat list of permission keys, see Enums
}
```
**Update:** the Roles & Permissions screen previously only defined 5 of the
8 roles (Branch Manager, Relationship Manager, and Head of Operations were
missing). This has been fixed on the frontend — all 8 roles now have a
default permission set. Backend should support all 8 as first-class role
records.

### Financial ledgers (currently separate `localStorage` keys, not part of the
mock `db` object at all — these need to become first-class backend resources)

```ts
// Discount
{
  id: string;
  clientName: string;
  propertyName: string;
  regularPrice: number;
  discountAmount: number;
  netPrice: number;
  authCode: string;
  dateIssued: string;        // ISO date
}

// Commission
{
  id: string;
  closerName: string;         // consider closerId instead
  clientName: string;
  propertyName: string;
  totalSaleVal: number;
  paidAmount: number;
  commissionVal: number;      // currently hardcoded 5% of paidAmount
  scheduledDate: string;      // ISO date
  status: "Scheduled" | "Paid";
}

// Refund
{
  id: string;
  leadId: string;
  clientName: string;
  propertyInterest: string;
  amount: number;
  reason: string;
  letterText: string;
  fileName: string;           // currently a simulated upload — no real file storage exists yet
  fileSize: number;
  dateRequested: string;      // ISO date
  status: "Pending Review" | "Approved" | "Paid";
}
```
**Needed:** real file upload/storage for the refund supporting letter — right
now the frontend only fakes it by storing a filename and size, not the file.

## Enums reference

| Field | Values |
|---|---|
| `Lead.stage` (14, ordered) | New Lead, Contact Attempted, Conversation Started, Qualified Prospect, Inspection Booked, Inspection Completed, Negotiation, Reservation, Payment, Allocation, Documentation, Client/Investor, Referral, Repeat Purchase |
| `Lead.source` | Paid Ads, Facebook, Instagram, Google, TikTok, Referral, Field Marketing, Webinar, Waitlist, Cold Calling, Walk-in, Existing Client |
| `Lead.category` | Incoming Wealth, Active Wealth, Investor Wealth, Revival Wealth, Reserved Wealth, Market Wealth, Untapped Wealth |
| `Lead.temperature` | Hot, Warm, Cold |
| `Inspection.status` | Scheduled, Confirmed, Completed, No-Show, Cancelled, Rescheduled |
| `Activity.type` | Call, WhatsApp, SMS, Email, Voice Note, Meeting, Internal Note (+ system-generated: Site Inspection Report, Site Inspection No-Show) |
| Permission keys | view_leads, create_leads, edit_leads, delete_leads, reassign_leads, archive_leads, view_followups, manage_followups, view_inspections, create_inspections, edit_inspections, cancel_inspections, complete_inspections, view_pipeline, update_pipeline_stage, view_reports, export_reports, view_users, create_users, edit_users, delete_users, view_roles, manage_roles, view_settings, edit_settings |

**Resolved:** the seed data and the lead edit form's category dropdown used to
disagree (`"Investor Wealth"` vs `"Investor"`, etc.) — the form has been
aligned to the `"X Wealth"` convention shown above, so this is now the one
canonical set of values to validate against server-side.

## Endpoints needed

| Method | Path | Notes |
|---|---|---|
| `POST` | `/auth/login` | see Auth above |
| `POST` | `/auth/logout` | |
| `GET` | `/auth/me` | |
| `GET` | `/users` | |
| `POST` | `/users` | |
| `PATCH` | `/users/:id` | |
| `DELETE` | `/users/:id?reassignTo=<userId>` | must reject with a list of affected lead count if the user has active leads and no `reassignTo` given |
| `GET` | `/leads?status=Active` | default view |
| `GET` | `/leads?status=Archived` | |
| `GET` | `/leads/:id` | |
| `POST` | `/leads` | |
| `PATCH` | `/leads/:id` | covers stage/paymentPlan/applicationFormStatus updates too |
| `POST` | `/leads/:id/archive` | must reject if an active (Scheduled/Confirmed) inspection exists |
| `POST` | `/leads/:id/restore` | if the previously-assigned closer is now Inactive, auto-unassign and emit a notification |
| `GET` | `/inspections?leadId=` | |
| `POST` | `/inspections` | on `status: "Completed"`, auto-advance the lead's stage to "Inspection Completed"; on create from an early stage, auto-advance to "Inspection Booked" |
| `PATCH` | `/inspections/:id` | |
| `GET` | `/activities?leadId=` | |
| `POST` | `/activities` | must also patch the parent lead per the side effects noted above |
| `GET` | `/notifications` | should include computed payment due/overdue entries, see note above |
| `POST` | `/notifications` | |
| `PATCH` | `/notifications/:id/read` | |
| `DELETE` | `/notifications/:id` | |
| `POST` | `/notifications/mark-all-read` | |
| `POST` | `/notifications/dismiss-all` | |
| `GET` | `/properties` | |
| `POST` | `/properties` | |
| `PATCH` | `/properties/:id` | |
| `DELETE` | `/properties/:id` | |
| `GET` | `/settings` | single record |
| `PUT` | `/settings` | |
| `GET` | `/audit-logs` | |
| `DELETE` | `/audit-logs` | Super Admin only |
| `GET` | `/roles` | |
| `POST` | `/roles` | |
| `PATCH` | `/roles/:id` | reject if `isSystem: true` |
| `DELETE` | `/roles/:id` | reject if `isSystem: true` |
| `GET` | `/discounts` | |
| `POST` | `/discounts` | |
| `GET` | `/commissions` | |
| `POST` | `/commissions` | |
| `PATCH` | `/commissions/:id` | status transitions (Scheduled → Paid) |
| `GET` | `/refunds` | |
| `POST` | `/refunds` (multipart, with file) | needs real file storage |
| `PATCH` | `/refunds/:id` | status transitions (Pending Review → Approved → Paid) |

## Cross-cutting: audit logging

Nearly every mutation above (user save/delete, lead save, property save,
settings save, role change, current-user switch) triggers an audit log entry
as a side effect on the frontend today. Recommend the backend auto-logs these
server-side per write (with real `userId`/`ipAddress` from the request)
rather than the frontend making a second explicit call per action.
