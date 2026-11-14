/* KHAYR Admin app helper (only the Admin page uses it).
   - Shows new-order notifications on the phone (Web Push from the Edge Function).
   - Tapping a notification opens that order.
   - Keeps a copy of admin.html so the app still opens with a weak connection.
   It never stores passwords, keys or order data. */
const CACHE = 'khayr-admin-v5';
const BADGE = 'khayr-admin-badge';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['admin.html', 'admin-icon-192.png'])).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('khayr-admin-v') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* Only the page itself: always try the internet first, use the saved copy when offline. */
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.mode !== 'navigate') return;
  e.respondWith((async () => {
    try {
      const res = await fetch(r);
      if (res.ok && res.type === 'basic') { const c = await caches.open(CACHE); c.put('admin.html', res.clone()); }
      return res;
    } catch (err) {
      const c = await caches.open(CACHE);
      return (await c.match('admin.html')) || Response.error();
    }
  })());
});

async function setBadge(n) {
  try {
    n = Math.max(0, Number(n) || 0);
    const c = await caches.open(BADGE);
    await c.put('count', new Response(String(n)));
    if (self.navigator.setAppBadge) { if (n) await self.navigator.setAppBadge(n); else await self.navigator.clearAppBadge(); }
  } catch (e) { /* badges are optional */ }
}
async function addBadge(k) {
  try {
    const c = await caches.open(BADGE), r = await c.match('count');
    await setBadge((r ? Number(await r.text()) || 0 : 0) + k);
  } catch (e) {}
}

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const title = String(d.title || 'KHAYR Admin').slice(0, 120);
  const options = {
    body: String(d.body || 'You have a new order.').slice(0, 300),
    tag: d.tag ? String(d.tag).slice(0, 64) : undefined,
    data: { url: String(d.url || 'admin.html#orders') },
    icon: 'admin-icon-192.png',
    badge: 'admin-icon-192.png',
  };
  e.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    if (d.tag !== 'test') await addBadge(1);
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const rel = (e.notification.data && e.notification.data.url) || 'admin.html#orders';
  const url = new URL(rel, self.location.href);
  if (url.origin !== self.location.origin) return;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find(x => new URL(x.url).pathname === url.pathname);
    if (w) { await w.focus(); w.postMessage({ type: 'open', url: url.href }); return; }
    await self.clients.openWindow(url.href);
  })());
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'badge') e.waitUntil ? e.waitUntil(setBadge(e.data.n)) : setBadge(e.data.n);
});
