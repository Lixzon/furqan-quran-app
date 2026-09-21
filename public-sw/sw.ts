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

// Optional server-triggered notifications. The app remains fully usable without
// a subscription; browsers that support Push can deliver a payload here.
self.addEventListener('push', (event) => {
  const data = event.data?.json() as { title?: string; body?: string; url?: string } | undefined;
  event.waitUntil(
    self.registration.showNotification(data?.title ?? 'A moment with the Qur’an', {
      body: data?.body ?? 'Return to your reading when you have a moment.',
      data: { url: data?.url ?? '/' },
      icon: '/icons/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing && 'navigate' in existing) {
        void existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

export {};
