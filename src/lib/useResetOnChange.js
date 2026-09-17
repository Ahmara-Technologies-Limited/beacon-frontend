import { useState } from 'react';

// React's documented alternative to resetting state from inside an effect.
//
// The pattern this replaces - `useEffect(() => setPage(1), [filters])` - works,
// but it renders the stale value first, commits it, then fires the effect and
// renders again. That second pass is the "cascading render" the
// set-state-in-effect lint rule objects to, and on a big table it's a visible
// flash of the wrong page before the reset lands.
//
// Adjusting state during render instead is the sanctioned way to say "when X
// changes, Y goes back to its starting value": React throws away the
// in-progress render and immediately re-renders with the corrected value,
// before anything reaches the DOM. No extra commit, no flash, no effect.
// https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
//
// `token` must be a primitive, since it's compared with !==. For several
// values, join them into one string at the call site.
export function useResetOnChange(token, reset) {
  const [seen, setSeen] = useState(token);

  if (token !== seen) {
    setSeen(token);
    reset();
  }
}
