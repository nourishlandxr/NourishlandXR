const PREFIX='nlxr-field-app-';
let currentCache;
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function cacheName() {
    if(currentCache)return currentCache;
    const names=(await caches.keys()).filter(name=>name.startsWith(PREFIX));
    return names.at(-1);
}
self.addEventListener('message',event=>{
    if(event.data?.type!=='prepare-field')return;
    event.waitUntil((async()=>{
        try {
            const name=PREFIX+event.data.version,cache=await caches.open(name);
            for(const file of event.data.files) {
                const url=new URL(file);if(url.origin!==self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname))throw new Error('Invalid field application asset.');
                const response=await fetch(url.href,{cache:'reload'});if(!response.ok)throw new Error('Application download failed. Text records remain prepared; try again while connected.');
                await cache.put(url.href,response);
            }
            currentCache=name;
            for(const previous of await caches.keys())if(previous.startsWith(PREFIX)&&previous!==name)await caches.delete(previous);
            event.ports[0]?.postMessage({ok:true});
        }catch(error){event.ports[0]?.postMessage({ok:false,error:error.message});}
    })());
});
self.addEventListener('fetch',event=>{
    const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
    if(request.method!=='GET')return;
    const detector=url.origin==='https://cdn.jsdelivr.net'&&url.pathname.startsWith('/npm/js-aruco2@2.0.0/src/');
    const fieldNavigation=request.mode==='navigate'&&url.origin===scope.origin&&url.pathname.startsWith(scope.pathname)&&url.searchParams.get('workspace')==='field';
    const applicationAsset=url.origin===scope.origin&&url.pathname.startsWith(scope.pathname)&&/\.(?:js|css)$/.test(url.pathname);
    if(!detector&&!fieldNavigation&&!applicationAsset)return;
    event.respondWith((async()=>{
        const name=await cacheName();
        try {
            const response=await fetch(request);
            if(detector&&name&&(response.ok||response.type==='opaque')) {const cache=await caches.open(name);await cache.put(request,response.clone());}
            return response;
        }catch(error){
            if(!name)throw error;
            const cache=await caches.open(name),key=fieldNavigation?new URL('index.html',scope).href:request;
            const cached=await cache.match(key,{ignoreSearch:true});if(cached)return cached;throw error;
        }
    })());
});
