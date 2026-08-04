// Maps the app's old tab-id vocabulary (used throughout the view components'
// props) to real Next.js routes, so the route pages can stay thin adapters
// around the existing views without having to rewrite their internals.
export const TAB_ROUTES = {
  dashboard: '/dashboard',
  leads: '/leads',
  properties: '/properties',
  docHub: '/doc-hub',
  users: '/users',
  roles: '/roles',
  followup: '/followup',
  inspections: '/inspections',
  pipeline: '/pipeline',
  reports: '/reports',
  settings: '/settings',
  audit: '/audit',
};

export function routeForTab(tab) {
  return TAB_ROUTES[tab] || '/dashboard';
}

// Single source of truth for which roles can access which module. Mirrors
// the backend's IsRolePermission.required_roles per viewset. Used both to
// hide nav links (Sidebar.jsx) and to guard direct URL access
// (app/(protected)/layout.tsx).
const ALL_ROLES = [
  'Super Admin', 'Sales Closer', 'Inspection Officer', 'Admin/Doc Officer',
  'Relationship Manager', 'Head of Operations', 'Branch Manager', 'General Manager',
];

export const TAB_ROLES = {
  dashboard: ALL_ROLES,
  settings: ALL_ROLES,
  leads: ['Super Admin', 'Sales Closer', 'Admin/Doc Officer', 'Relationship Manager', 'Head of Operations', 'Branch Manager', 'General Manager'],
  followup: ['Super Admin', 'Sales Closer', 'Relationship Manager', 'General Manager'],
  properties: ['Super Admin', 'Sales Closer', 'Admin/Doc Officer', 'Inspection Officer', 'Relationship Manager', 'Head of Operations', 'General Manager'],
  inspections: ['Super Admin', 'Sales Closer', 'Inspection Officer', 'Head of Operations', 'Branch Manager', 'General Manager'],
  pipeline: ['Super Admin', 'Sales Closer', 'Relationship Manager', 'Head of Operations', 'Branch Manager', 'General Manager'],
  docHub: ['Super Admin', 'Admin/Doc Officer', 'Head of Operations', 'General Manager'],
  reports: ['Super Admin', 'Head of Operations', 'Branch Manager', 'General Manager'],
  users: ['Super Admin', 'General Manager'],
  roles: ['Super Admin', 'General Manager'],
  audit: ['Super Admin', 'General Manager'],
};

// Reverse-map real paths (e.g. '/leads') to their tab id so a route guard
// can look up the allowed roles from a Next.js pathname.
export function tabForRoute(pathname) {
  const clean = pathname.split('?')[0].replace(/\/$/, '') || '/';
  const entry = Object.entries(TAB_ROUTES).find(([, route]) => route === clean || clean.startsWith(route + '/'));
  return entry ? entry[0] : null;
}

export function isRouteAllowed(pathname, role) {
  const tab = tabForRoute(pathname);
  if (!tab) return true; // unknown/unmapped route - don't block
  const allowed = TAB_ROLES[tab];
  return !allowed || allowed.includes(role);
}
