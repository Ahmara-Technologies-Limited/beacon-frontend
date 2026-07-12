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
