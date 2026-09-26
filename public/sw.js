self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || data.notification?.title || 'إشعار جديد';
  const body = data.body || data.notification?.body || '';
  const icon = data.icon || data.notification?.icon || '/icon-192x192.png';
  const badge = data.badge || '/icon-192x192.png';
  const url = data.url || data.click_action || data.notification?.click_action || '/dashboard';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
      dir: 'rtl',
      lang: 'ar'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            const current = new URL(client.url);
            const target = new URL(url, self.location.origin);
            if (current.origin === target.origin && current.pathname === target.pathname) {
              return client.focus();
            }
          } catch {
            // Ignore malformed URLs and continue to open the target below.
          }
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(new URL(url, self.location.origin).href);
      }
      return undefined;
    })
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
