// Service Worker placeholder
// This file exists to prevent 404 errors

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

