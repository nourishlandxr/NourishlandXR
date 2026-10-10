import { BUILD_INFO } from './buildInfo.js';

export async function prepareFieldApplication() {
    if (!navigator.serviceWorker || !window.isSecureContext) throw new Error('Records are prepared, but this browser cannot prepare the offline application. Use HTTPS on the field device.');
    const registration = await navigator.serviceWorker.register(new URL('../creator-field-worker.js',import.meta.url),{scope:new URL('../',import.meta.url).pathname});
    await navigator.serviceWorker.ready;
    const files = new Set([new URL('../index.html',import.meta.url).href]);
    const visited = new Set();
    // Follow the field shell's static module graph. XR renderers and desktop
    // authoring modules are deliberately absent from this local package.
    async function collect(url) {
        if(visited.has(url))return;visited.add(url);files.add(url);
        const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('An application file could not be prepared.');
        const source=await response.text();
        const imports=[...source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g)].map(match=>match[1]).filter(name=>name.startsWith('.'));
        for(const name of imports)await collect(new URL(name,url).href);
    }
    for(const name of ['entry.js','services/creatorWorkspaceRouting.js','screens/creatorFieldWorkspace.js','services/creatorFieldOffline.js'])await collect(new URL(`../${name}`,import.meta.url).href);
    document.querySelectorAll('link[rel=stylesheet]').forEach(link=>{if(new URL(link.href).origin===location.origin)files.add(link.href);});
    await new Promise((resolve,reject)=>{
        const channel=new MessageChannel();const timer=setTimeout(()=>reject(new Error('Records are prepared, but application caching timed out. Try Prepare again while connected.')),30000);
        channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();event.data.ok?resolve():reject(new Error(event.data.error));};
        (registration.active || registration.waiting).postMessage({type:'prepare-field',version:BUILD_INFO.version,files:[...files]},[channel.port2]);
    });
}
