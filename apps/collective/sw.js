const VERSION="tranch-collective-003-v1";
const ASSETS=["./","./index.html","./app.mjs","./kernel.mjs","./store.mjs","./styles.css","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith("tranch-collective-")&&n!==VERSION).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=="GET"||u.origin!==self.location.origin)return;
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
