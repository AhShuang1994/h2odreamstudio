/* 小帐本 Service Worker — 让 App 完全离线可用。
   改版时把 CACHE 的版号 +1，使用者下次连线就会自动更新。 */
const CACHE = 'moneybook-v7';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './ledger.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// cache.addAll() 用的是一般 fetch，会吃浏览器自己的 HTTP 快取 —— 结果是
// 部署了新版，新 SW 却把「浏览器手上的旧档」抄进新快取，使用者永远看不到改动。
// cache:'reload' 强制回源。仍然是全有全无：少抓到一个就让 install 失败，
// 宁可维持旧版可用，也不要留下抓了一半的快取。
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(url =>
        fetch(new Request(url, { cache: 'reload' })).then(res => {
          if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
          return c.put(url, res);
        })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // 导览请求：先试网络（拿最新版），失败就用缓存 → 离线也开得起来
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.open(CACHE).then(c => c.match('./index.html', { ignoreSearch: true })))
    );
    return;
  }

  // 其他静态资源：stale-while-revalidate —— 先用快取秒开，同时回源更新，
  // 下一次打开就是新版。原本写的是 `hit || fetch()`，注释说「背景补抓」但其实
  // 只有 miss 才会抓，一旦进了快取就永远不再更新，改版因此送不到使用者手上。
  // 另外这里只查当前版本的快取（原本用全域 caches.match，会跨版本命中旧档）。
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(req).then(hit => {
        const fresh = fetch(req)
          .then(res => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);          // 离线：回落到快取
        return hit || fresh;          // 有快取就先给快取，更新在背景进行
      })
    )
  );
});
