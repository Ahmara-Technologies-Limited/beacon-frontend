// Demo/Live mode is controlled entirely by the NEXT_PUBLIC_DEMO_MODE env var
// (set in .env.local, requires a rebuild/restart to change - Next.js inlines
// NEXT_PUBLIC_* vars at build time). There is no in-app runtime toggle.
const envValue = process.env.NEXT_PUBLIC_DEMO_MODE;

export const isDemoMode = () => {
  if (envValue === undefined || envValue === '') return true;
  return envValue !== 'false';
};

export function useDemoMode() {
  return [isDemoMode()];
}
