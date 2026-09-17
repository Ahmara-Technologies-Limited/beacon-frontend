// In-flight deduplication + a very short freshness window for GET requests.
//
// The app is built out of independent views that each own their own copy of a
// list and each poll for it (Dashboard alone wants leads + inspections +
// activities + users, the Header wants notifications, and every list view
// re-requests on mount). Nothing coordinated those, so the same table was
// being fetched several times over within the same second - once by the
// view's own mount effect, again by its poll tick, again by a sibling
// component that needs the same list. On a free-tier backend each of those is
// a full table walk, which is why the dashboard felt like it hung.
//
// This does two things and nothing more:
//   1. Dedupe: identical concurrent requests share ONE promise/HTTP call.
//   2. Freshness window: a completed result is reused for `ttlMs` (small,
//      seconds) so a remount right after a fetch doesn't refetch.
//
// It deliberately does NOT act as a long-lived cache. Polling intervals are
// 30s and the TTL is a fraction of that, so polls still reach the network and
// data still goes stale on schedule. Mutations call invalidate() through
// dataEvents, so a write is never served a pre-write snapshot.

const inFlight = new Map();
const settled = new Map();

const keyOf = (path, params) => `${path}::${JSON.stringify(params ?? {})}`;

/**
 * @param {string} path      request path, used only as part of the cache key
 * @param {object} params    query params, used only as part of the cache key
 * @param {Function} fetcher zero-arg function performing the actual request
 * @param {number} ttlMs     how long a completed result may be reused
 */
export function dedupedFetch(path, params, fetcher, ttlMs = 5000) {
  const key = keyOf(path, params);

  const hit = settled.get(key);
  if (hit && Date.now() - hit.at < ttlMs) {
    return Promise.resolve(hit.value);
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = fetcher()
    .then((value) => {
      settled.set(key, { value, at: Date.now() });
      return value;
    })
    .finally(() => {
      // Always clear the in-flight entry, including on rejection, so a failed
      // request never wedges the key and every later caller retries for real.
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

// Drop cached results whose key starts with any of the given path prefixes
// (e.g. '/sales/leads/'). In-flight promises are left alone: their callers are
// already waiting on them, and the next call after they settle re-reads from
// the network because their settled entry is dropped below.
export function invalidate(prefixes) {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  for (const key of settled.keys()) {
    if (list.some((p) => key.startsWith(p))) settled.delete(key);
  }
}

export function invalidateAll() {
  settled.clear();
}
