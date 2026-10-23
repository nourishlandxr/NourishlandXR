// Read-only public checks. Does not sign in, create accounts or modify projects.
import assert from 'node:assert/strict';
import {WEBSITE_ROUTES,LEGACY_WEBSITE_PAGES,RETIRED_WEBSITE_PAGES,LEGACY_ENTRY_FILES} from '../../app/services/siteRoutes.js';
const origin=process.argv.includes('--local')?'http://127.0.0.1:8010':'https://nourishland.org';
const checks=[];let cursor=0;
async function request(path){return fetch(origin+path,{redirect:'manual',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(30000)});}
for(const [old,target]of Object.entries(LEGACY_WEBSITE_PAGES))checks.push(async()=>{
 const response=await request(old);assert.equal(response.status,301,old);assert.equal(new URL(response.headers.get('location'),origin).pathname,target,old);
});
for(const old of RETIRED_WEBSITE_PAGES)checks.push(async()=>{const r=await request(old);assert.equal(r.status,410,old);assert((await r.text()).includes('data-current-website-error'),old);});
for(const [file,target]of Object.entries(LEGACY_ENTRY_FILES))checks.push(async()=>{
 const r=await request('/'+file);if([301,302,307,308].includes(r.status))assert.equal(new URL(r.headers.get('location'),origin).pathname,target,file);
 else {assert.equal(r.status,200,file);const text=await r.text();assert(text.includes('location.replace')&&text.includes('noindex,follow')&&!text.includes('route-block'),file);}
});
for(const path of [...Object.values(WEBSITE_ROUTES),'/creator/','/explorer/','/field/','/demos/','/account/','/admin/','/experience/','/app/?mode=welcome','/app/?editor=pimo','/app/?workspace=desktop&project=route-read-only'])checks.push(async()=>{
 const r=await request(path);assert.equal(r.status,200,path);assert(r.headers.get('content-type')?.includes('text/html'),path);
});
checks.push(async()=>{const r=await request('/__retired_page_check__');assert.equal(r.status,404);assert((await r.text()).includes('data-current-website-error'));});
checks.push(async()=>{const r=await request('/sitemap.xml');assert.equal(r.status,200);const xml=await r.text();assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).sort(),Object.values(WEBSITE_ROUTES).map(p=>'https://nourishland.org'+p).sort());});
checks.push(async()=>{const r=await request('/wp-sitemap.xml');assert.equal(r.status,301);assert.equal(new URL(r.headers.get('location'),origin).pathname,'/sitemap.xml');});
checks.push(async()=>{const r=await request('/robots.txt');assert.equal(r.status,200);assert(!(await r.text()).includes('wp-sitemap'));});
for(const path of ['/xr/entry.js','/xr/services/siteRoutes.js','/xr/v2/homepage-hero.js','/xr/v2/full-3d/Nourishland-Hero-Living-v17.html'])checks.push(async()=>{
 const r=await request(path);assert.equal(r.status,200,path);if(path.endsWith('.js'))assert(r.headers.get('content-type')?.includes('javascript'),path);await r.body?.cancel();
});
checks.push(async()=>{const r=await request('/xr-api/auth/session');assert.equal(r.status,200);assert(r.headers.get('content-type')?.includes('application/json'));assert.equal(typeof(await r.json()).authenticated,'boolean');});
await Promise.all(Array.from({length:4},async()=>{while(cursor<checks.length)await checks[cursor++]();}));
console.log(JSON.stringify({origin,checks:checks.length,legacyPagesRedirect:true,retiredPagesGone:true,currentPages:true,runtimeAndApiPreserved:true}));
