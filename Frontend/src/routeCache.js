/**
 * Background route prefetcher.
 *
 * Fires a single request on import (app startup) and exposes
 * the result via `getPrefetchedRoutes()`.  ExplorePage checks
 * this cache on mount so the first render is instant.
 */

const API_BASE = 'http://127.0.0.1:8000';
const PREFETCH_LIMIT = 24;

let _cache = null;   // { items, total }
let _promise = null;  // in-flight fetch

function startPrefetch() {
  if (_promise) return _promise;

  _promise = fetch(
    `${API_BASE}/routes?limit=${PREFETCH_LIMIT}&page=1&sort=-send_count`
  )
    .then((res) => {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then((data) => {
      _cache = { items: data.items || [], total: data.total ?? 0 };
      return _cache;
    })
    .catch((err) => {
      console.warn('[prefetch] failed, will fetch on demand:', err.message);
      _cache = null;
      return null;
    });

  return _promise;
}

// Fire immediately on import (app boot)
startPrefetch();

/**
 * Returns the cached result synchronously if available,
 * otherwise null (ExplorePage falls back to its own fetch).
 */
export function getPrefetchedRoutes() {
  return _cache;
}

/**
 * Clears the cache (e.g. after the consumer has consumed it,
 * or when a fresh fetch is triggered).
 */
export function clearPrefetchedRoutes() {
  _cache = null;
  _promise = null;
}
