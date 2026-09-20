// Permission helpers for the client.
//
// The authoritative mapping of role -> permissions lives in the database and
// is served by the API (/role-permissions/, and the signed-in user's own set
// on /users/me/). This file deliberately holds no copy of it: the previous
// version mirrored the backend's matrix by hand, which meant every permission
// edit had to be made twice and the screen could quietly disagree with what
// the server enforced.
//
// What stays here is the part that is genuinely code: which permission a nav
// tab needs, and the row-level scoping notes the UI explains to the user.
// Demo mode has no server, so it also keeps a seeded copy of the defaults -
// see DEMO_ROLE_PERMISSIONS, which is only ever consulted when
// NEXT_PUBLIC_DEMO_MODE is on.

export const ROLES = [
  'Super Admin',
  'General Manager',
  'Head of Operations',
  'Branch Manager',
  'Sales Closer',
  'Inspection Officer',
  'Admin/Doc Officer',
  'Relationship Manager',
];

const SA = 'Super Admin';
const GM = 'General Manager';
const HO = 'Head of Operations';
const BM = 'Branch Manager';
const SC = 'Sales Closer';
const IO = 'Inspection Officer';
const DO = 'Admin/Doc Officer';
const RM = 'Relationship Manager';

/** Roles whose permissions are fixed and cannot be edited in the app. */
export const LOCKED_ROLES = [SA, BM];

/** True if this user holds `permission` (e.g. 'leads.manage'). */
export function can(user, permission) {
  if (!user) return false;
  if (user.role === SA) return true;
  return (user.permissions || []).includes(permission);
}

// Which permission each nav tab needs. A tab may be narrower than the
// permission - an Inspection Officer reads the leads behind their own
// inspections without getting a Lead Management tab - but never wider.
export const TAB_REQUIREMENTS = {
  dashboard: null,
  settings: null,
  leads: 'leads.manage',
  followup: 'leads.manage',
  pipeline: 'leads.manage',
  inspections: 'inspections.view',
  properties: 'properties.view',
  docHub: 'finance.view',
  reports: 'leads.view',
  users: 'users.manage',
  roles: 'users.view',
  audit: 'audit.view',
};

/** Can this user open this tab? */
export function canAccessTab(user, tab) {
  const required = TAB_REQUIREMENTS[tab];
  if (required === undefined) return true; // unmapped route - don't block
  if (required === null) return true; // open to every signed-in user
  return can(user, required);
}

// Presentation only: the colour and one-line description the Roles &
// Permissions screen shows for each role. What a role may *do* comes from the
// server; this is how it is introduced to the reader.
export const ROLE_PROFILES = {
  [SA]: {
    color: '#D4262A',
    description: 'Full system access, including staff accounts, settings and permissions.',
  },
  [GM]: {
    color: '#101828',
    description: 'Company-wide oversight: every module, reporting and administration.',
  },
  [HO]: {
    color: '#E67E22',
    description: 'Pipeline health, inspections and allocation verification across branches.',
  },
  [BM]: {
    color: '#1ABC9C',
    description: 'Closer performance, inspections and revenue tracking for their branch.',
  },
  [SC]: {
    color: '#0066CC',
    description: 'Core sales team member working an assigned lead portfolio.',
  },
  [IO]: {
    color: '#059669',
    description: 'Field inspections and site visit outcomes.',
  },
  [DO]: {
    color: '#7C3AED',
    description: 'Post-sale documentation, allocation and payment verification.',
  },
  [RM]: {
    color: '#3498DB',
    description: 'Client relationships, referrals and repeat purchase engagement.',
  },
};

// Row-level narrowing, which is enforced in queryset code rather than by a
// permission, so it is described here for the Roles & Permissions screen.
export const SCOPE_NOTES = {
  leads: {
    [IO]: 'Read-only, and only leads they have an inspection for.',
    [SC]: 'Their assigned leads.',
    [BM]: 'Leads in their branch.',
    [RM]: 'Clients, repeat purchases and referrals.',
    [DO]: 'Leads from Reservation stage onward.',
  },
  inspections: {
    [IO]: 'Inspections assigned to them.',
    [SC]: 'Inspections for their own leads.',
  },
  paymentPlans: {
    [SC]: 'Plans on their assigned leads.',
    [BM]: 'Plans on leads in their branch.',
    [RM]: 'Plans on their own clients.',
  },
  users: {
    [SC]: 'Reads the staff list only to resolve names on leads and inspections.',
  },
};

export function scopeNote(role, moduleKey) {
  return SCOPE_NOTES[moduleKey]?.[role] || null;
}

// ---- Demo mode only ----
//
// Mirrors apps/core/permissions_catalog.py so the demo build behaves like the
// real one. Live mode never reads these.

export const DEMO_MODULES = [
  ['leads', 'Leads', 'Client records, pipeline stage, assignment and archiving.'],
  ['inspections', 'Site Inspections', 'Booking, rescheduling and logging the outcome of site tours.'],
  ['activities', 'Activity Log', 'Calls, messages, meetings and internal notes against a lead.'],
  ['properties', 'Properties', 'Estate and unit inventory.'],
  ['paymentPlans', 'Payment Plans', "A lead's payment plan and its installment schedule."],
  ['finance', 'Finance Hub', 'Discounts, sales commissions and refund requests.'],
  ['docDesk', 'Legal & Finance Desk', 'Sending client application forms and offer letters.'],
  ['users', 'Staff Accounts', 'Creating staff logins, assigning roles, activating accounts.'],
  ['settings', 'System Settings', 'Company-wide configuration.'],
  ['audit', 'Audit Logs', 'Record of every privileged action taken in the system.'],
];

const p = (...pairs) => pairs.flatMap(([m, ...actions]) => actions.map(a => `${m}.${a}`));

export const DEMO_ROLE_PERMISSIONS = {
  [GM]: p(['leads', 'view', 'manage'], ['inspections', 'view', 'manage'], ['activities', 'view', 'manage'],
    ['properties', 'view', 'manage'], ['paymentPlans', 'view', 'manage'], ['finance', 'view', 'manage'],
    ['users', 'view', 'manage'], ['settings', 'view', 'manage'], ['audit', 'view', 'manage']),
  [HO]: p(['leads', 'view', 'manage'], ['inspections', 'view', 'manage'], ['activities', 'view', 'manage'],
    ['properties', 'view', 'manage'], ['paymentPlans', 'view', 'manage'], ['finance', 'view', 'manage'],
    ['users', 'view'], ['settings', 'view']),
  [BM]: p(['leads', 'view', 'manage'], ['inspections', 'view', 'manage'], ['activities', 'view', 'manage'],
    ['paymentPlans', 'view'], ['users', 'view'], ['settings', 'view']),
  [SC]: p(['leads', 'view', 'manage'], ['inspections', 'view', 'manage'], ['activities', 'view', 'manage'],
    ['properties', 'view'], ['paymentPlans', 'view'], ['users', 'view'], ['settings', 'view']),
  [IO]: p(['leads', 'view'], ['inspections', 'view', 'manage'], ['activities', 'view'],
    ['properties', 'view'], ['users', 'view'], ['settings', 'view']),
  [DO]: p(['leads', 'view', 'manage'], ['activities', 'view', 'manage'], ['properties', 'view', 'manage'],
    ['paymentPlans', 'view', 'manage'], ['finance', 'view', 'manage'], ['docDesk', 'view', 'manage'],
    ['users', 'view'], ['settings', 'view']),
  [RM]: p(['leads', 'view', 'manage'], ['activities', 'view', 'manage'], ['properties', 'view'],
    ['paymentPlans', 'view'], ['users', 'view'], ['settings', 'view']),
};
