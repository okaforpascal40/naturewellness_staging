/**
 * NatureWellness service worker.
 *
 * Three caches, three strategies:
 *   - precache      static shell, installed up front so the app opens offline
 *   - runtime       hashed build assets, cache-first (their names change on
 *                   every deploy, so a stale entry can never be served)
 *   - api           condition results, network-first with a 1 hour freshness
 *                   window, so a returning user sees data immediately but
 *                   never reads a day-old evidence set as if it were current
 *
 * Bump CACHE_VERSION on any change here — old caches are dropped on activate.
 */
const CACHE_VERSION = "v1";
const PRECACHE = `nw-precache-${CACHE_VERSION}`;
const RUNTIME = `nw-runtime-${CACHE_VERSION}`;
const API_CACHE = `nw-api-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

/** How long an API response may be replayed from cache. */
const API_MAX_AGE_MS = 60 * 60 * 1000;
/** Header we stamp on cached API responses, since Response has no writable date. */
const CACHED_AT_HEADER = "x-nw-cached-at";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      // Individual failures must not abort the install, or a single 404 leaves
      // the app with no service worker at all.
      .then((cache) =>
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([PRECACHE, RUNTIME, API_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** True for our own build output: /assets/index-A1b2C3.js and friends. */
function isBuildAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/assets/");
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || /\/api\/v\d+\//.test(url.pathname);
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstWithTtl(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      // Re-wrap so we can stamp the time; Response headers are immutable.
      const body = await response.clone().blob();
      const headers = new Headers(response.headers);
      headers.set(CACHED_AT_HEADER, String(Date.now()));
      await cache.put(
        request,
        new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        }),
      );
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (!cached) throw error;

    const cachedAt = Number(cached.headers.get(CACHED_AT_HEADER) || 0);
    if (cachedAt && Date.now() - cachedAt > API_MAX_AGE_MS) {
      // Expired and we are offline: better to fail than to present stale
      // evidence counts as current.
      throw error;
    }
    return cached;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (isApiRequest(url)) {
    event.respondWith(networkFirstWithTtl(request));
    return;
  }

  if (isBuildAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME));
    return;
  }

  // Navigations: try the network, fall back to the offline page. The SPA is
  // one HTML document, so any route resolves to the same shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(PRECACHE);
        const offline = await cache.match(OFFLINE_URL);
        return (
          offline ||
          new Response("You are offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }),
    );
    return;
  }

  // Same-origin static files (icons, manifest). Cross-origin requests such as
  // the Unsplash photos are left to the browser's own HTTP cache.
  if (url.origin === self.location.origin) {
    event.respondWith(
      staleWhileRevalidate(request, RUNTIME).catch(() => fetch(request)),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
