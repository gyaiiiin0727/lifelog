// ===== lifelog service worker (v3 - Network First for all app assets) =====
const CACHE_NAME = 'lifelog-cache-v3';
const CORE_ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve())))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 外部ドメインへのリクエスト（API等）はService Workerを通さない
  if (url.origin !== self.location.origin) {
    return; // ブラウザのデフォルト処理に任せる
  }

  // LP・コミュニティはService Workerを通さない
  if (url.pathname.endsWith('/lp.html') || url.pathname.endsWith('/community.html')) return;

  // 画像ファイルのみキャッシュ優先（変更頻度が低い）
  if (/\.(png|jpg|jpeg|gif|ico|svg|webp)$/i.test(url.pathname)) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
      return res;
    })));
    return;
  }

  // HTML・JS・CSS・その他: Network First（オフライン時のみキャッシュ）
  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
