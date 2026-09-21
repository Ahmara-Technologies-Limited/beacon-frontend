import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest, and linked automatically by Next - see
// node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md.
//
// start_url is /dashboard rather than /: an installed CRM should open on work,
// and an unauthenticated visitor is redirected to /login by the protected
// layout anyway.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Beacon CRM - Beacon Corporate Realty Ltd',
    short_name: 'Beacon CRM',
    description:
      'Leads, site inspections and documentation for Beacon Corporate Realty.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#FFFFFF',
    theme_color: '#D4262A',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      // Android crops icons to its own shape; these carry the safe-area
      // padding so the mark is not clipped.
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Site Inspections',
        short_name: 'Inspections',
        description: "Today's site tours and their outcomes",
        url: '/inspections',
      },
      {
        name: 'Follow Ups',
        short_name: 'Follow Ups',
        description: 'Leads due for contact',
        url: '/followup',
      },
    ],
  };
}
