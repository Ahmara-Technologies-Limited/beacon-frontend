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

// Demo mode polls a cheap in-memory/localStorage read, so a short interval
// (demoMs) is fine. Live mode hits a real API - never poll faster than 30s,
// regardless of what a caller asks for.
export const getPollInterval = (demoMs) => (isDemoMode() ? demoMs : Math.max(demoMs, 30000));
