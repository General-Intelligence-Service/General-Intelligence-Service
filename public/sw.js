// Minimal service worker to satisfy installability (no heavy precache).
// Keep behavior conservative: network-first, no offline guarantees.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch (no caching). This is enough for install prompt criteria in many browsers.
self.addEventListener("fetch", () => {});

