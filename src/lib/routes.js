import { canAccessTab } from './permissions';

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

// Access is decided by the signed-in user's permissions (served by the API
// from the editable role matrix), not by a hardcoded list of role names - a
// permission granted in Roles & Permissions has to open the matching nav
// entry without a redeploy. lib/permissions.js maps each tab to the
// permission it needs.

export function tabForRoute(pathname) {
  const clean = pathname.split('?')[0].replace(/\/$/, '') || '/';
  const entry = Object.entries(TAB_ROUTES).find(([, route]) => route === clean || clean.startsWith(route + '/'));
  return entry ? entry[0] : null;
}

export function isRouteAllowed(pathname, user) {
  const tab = tabForRoute(pathname);
  if (!tab) return true; // unknown/unmapped route - don't block
  return canAccessTab(user, tab);
}
