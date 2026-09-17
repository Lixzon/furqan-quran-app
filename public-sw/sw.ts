import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Furqan service worker (injectManifest build — bundled by Vite).

declare let self: ServiceWorkerGlobalScope;

// Auto-update handling (registerType: 'autoUpdate')
self.skipWaiting();
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Precache the app shell (JS/CSS/HTML/icons/fonts) injected via __WB_MANIFEST.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA navigation fallback → index.html
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Bundled Qur’an JSON (large, immutable) — cache first after the first visit.
registerRoute(
  ({ url }) => url.pathname.startsWith('/data/'),
  new CacheFirst({
    cacheName: 'quran-data',
    plugins: [
      new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

export {};
