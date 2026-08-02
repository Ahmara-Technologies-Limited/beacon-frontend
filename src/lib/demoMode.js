// Manages the global "demo mode" flag. Defaults to true so the app keeps
// working out of the box against the mock in-browser database with no
// backend configured. When flipped to false (Live Mode), the data layer
// (see src/data/dataService.js) starts calling the real Django API for the
// entities that have live endpoints.

import { useEffect, useState, useCallback } from 'react';

const DEMO_MODE_KEY = 'beacon_demo_mode';
const DEMO_MODE_EVENT = 'beacon-demo-mode-change';

export const isDemoMode = () => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(DEMO_MODE_KEY);
  if (stored === null) return true; // default true
  return stored === 'true';
};

export const setDemoMode = (value) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_MODE_KEY, value ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent(DEMO_MODE_EVENT, { detail: !!value }));
};

export function useDemoMode() {
  const [demoMode, setDemoModeState] = useState(true);

  useEffect(() => {
    setDemoModeState(isDemoMode());

    const handleChange = () => setDemoModeState(isDemoMode());
    window.addEventListener(DEMO_MODE_EVENT, handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      window.removeEventListener(DEMO_MODE_EVENT, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  const update = useCallback((value) => {
    setDemoMode(value);
    setDemoModeState(!!value);
  }, []);

  return [demoMode, update];
}
