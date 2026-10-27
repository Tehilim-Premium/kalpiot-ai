// קלפיות AI — service worker: the app shell works offline, data pages are refreshed when online.
const V='kai-v2-'+'202610271633';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET')return;
  // page itself: network first (fresh numbers), cache fallback (offline)
  if(u.origin===location.origin&&(u.pathname.endsWith('/')||u.pathname.endsWith('index.html'))){e.respondWith(fetch(e.request).then(r=>{caches.open(V).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));return}
  // everything else (fonts, three.js, icons): cache first
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok&&(u.origin===location.origin||/fonts.g|cdnjs/.test(u.host)))caches.open(V).then(c=>c.put(e.request,res.clone()));return res})))});
