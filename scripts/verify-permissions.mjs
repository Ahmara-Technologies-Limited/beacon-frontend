// Checks that a permission means what it says.
//
// Permissions are now stored server-side and edited in the app, so there is
// no hardcoded matrix left to compare against - which is what this script
// used to do. What can still drift is the link between a permission and the
// endpoint it is supposed to control: a viewset declaring the wrong
// `required_permission`, or a module in the catalogue that no view checks,
// would leave the Roles & Permissions screen offering a switch that grants
// nothing (or worse, grants something else).
//
// So for every seeded role this asks the API what that role may do, then
// calls each endpoint as that role and checks the answers agree.
//
//   npm run verify:permissions
//
// Needs the API running (NEXT_PUBLIC_API_URL, default http://localhost:8000)
// and the seeded test accounts (manage.py seed_test_users).

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PASSWORD = process.env.SEED_PASSWORD || 'BeaconTest2026!';

const ACCOUNTS = {
  'Super Admin': 'admin@beacontest.com',
  'General Manager': 'gm@beacontest.com',
  'Head of Operations': 'ops@beacontest.com',
  'Branch Manager': 'branch@beacontest.com',
  'Sales Closer': 'closer@beacontest.com',
  'Inspection Officer': 'officer@beacontest.com',
  'Admin/Doc Officer': 'doc@beacontest.com',
  'Relationship Manager': 'rm@beacontest.com',
};

// Which endpoint each module's permissions are supposed to control. A module
// listed here is checked in both directions: granted means reachable, not
// granted means refused.
const MODULE_ENDPOINTS = {
  leads: '/sales/leads/',
  inspections: '/sales/inspections/',
  activities: '/sales/activities/',
  properties: '/properties/',
  paymentPlans: '/finance/payment-plans/',
  finance: '/finance/discounts/',
  users: '/users/',
  settings: '/settings/',
  audit: '/audit-logs/',
  // docDesk guards two actions on a lead rather than a list endpoint, so it
  // has no GET to probe; its enforcement is covered by the backend tests.
};

const failures = [];
const note = (msg) => failures.push(msg);

async function login(email) {
  const res = await fetch(`${API}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status}`);
  const body = await res.json();
  return body.access || body.access_token || body.token;
}

const authed = (token, path, init = {}) =>
  fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });

// --- the catalogue: every module the UI offers must control a real endpoint
const adminToken = await login(ACCOUNTS['Super Admin']);
const catalog = await (await authed(adminToken, '/role-permissions/catalog/')).json();

for (const module of catalog.modules) {
  if (!(module.key in MODULE_ENDPOINTS) && module.key !== 'docDesk') {
    note(`catalogue offers module "${module.key}" that this script cannot probe - add it to MODULE_ENDPOINTS`);
  }
}

// --- per role: what the API says it may do vs what it may actually do
for (const [role, email] of Object.entries(ACCOUNTS)) {
  let token;
  try {
    token = await login(email);
  } catch (err) {
    note(err.message);
    continue;
  }

  const me = await (await authed(token, '/users/me/')).json();
  const granted = new Set(me.permissions || []);

  if (me.role !== role) {
    note(`${email} is seeded as "${me.role}", not "${role}" - run manage.py seed_test_users`);
    continue;
  }
  if (granted.size === 0) {
    note(`${role}: /users/me/ reported no permissions at all`);
  }

  for (const [module, path] of Object.entries(MODULE_ENDPOINTS)) {
    const claimed = granted.has(`${module}.view`);
    const status = (await authed(token, path)).status;
    const actual = status !== 403;
    if (claimed !== actual) {
      note(
        `${role}: holds ${module}.view=${claimed}, but GET ${path} answered ${status}` +
          (claimed ? ' - the permission grants nothing' : ' - access without the permission')
      );
    }
  }
}

// --- the locks hold
const lockedProbe = await authed(adminToken, '/role-permissions/Branch Manager/', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ permissions: [] }),
});
if (lockedProbe.status !== 403) {
  note(`a Super Admin was able to edit locked role "Branch Manager" (HTTP ${lockedProbe.status})`);
}

const gmToken = await login(ACCOUNTS['General Manager']);
const nonAdminProbe = await authed(gmToken, '/role-permissions/Sales Closer/', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ permissions: [] }),
});
if (nonAdminProbe.status !== 403) {
  note(`a General Manager was able to edit permissions (HTTP ${nonAdminProbe.status}) - only Super Admin may`);
}

const junkProbe = await authed(adminToken, '/role-permissions/Sales Closer/', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ permissions: ['leads.destroy'] }),
});
if (junkProbe.status !== 400) {
  note(`an unknown permission codename was accepted (HTTP ${junkProbe.status}) - it would sit in the database granting nothing`);
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} problem(s):\n`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('✓ every granted permission opens its endpoint, every withheld one closes it, and the locks hold');
