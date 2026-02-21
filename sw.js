// ===== lifelog service worker (v2 - API bypass) =====
const CACHE_NAME = 'lifelog-cache-v20260209010000';
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

  // HTMLナビゲーション: ネットワーク優先、失敗時はキャッシュ
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // その他の同一ドメインリソース: キャッシュ優先
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
