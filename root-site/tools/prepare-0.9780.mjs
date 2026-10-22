// Package the reviewed Totem candidate over the current protected root release.
// Usage: node root-site/tools/prepare-0.9780.mjs <reviewed-candidate-directory>
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {allowedFrontendFile} from './frontend-boundary.mjs';
const version='0.9780',previousVersion='0.9775',candidate=path.resolve(process.argv[2]||'__missing_candidate__'),release='root-site/releases/'+version;
if(!fs.existsSync(path.join(candidate,'site/root-release.json'))||JSON.parse(fs.readFileSync(path.join(candidate,'site/root-release.json'))).version!==version)throw Error('A reviewed V0.9780 candidate is required');
const routes=new Set(Object.values(JSON.parse(fs.readFileSync('root-site/routes.json'))).map(r=>(r.path==='/'?'':r.path.slice(1))+'index.html'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),candidates=new Map();
for(const file of [...routes,'site/creator-features.js','site/platform-totem.js','site/platform-totem.css','site/creator/totem-basic-09780.webp','site/root-release.json','xr/v2/full-3d/Nourishland-Hero-Living-v17.html','xr/v2/full-3d/world-manifest.json'])candidates.set(file,fs.readFileSync(path.join(candidate,file)));
for(const name of ['buildInfo','craftedSurfaceTextures','secondaryTotemGeometry','spatialObjectVisuals','spatialPrismRenderer','spatialTotemCards','spatialTotemSculpture','totemAppearance','craftedTotemGeometry','craftedTotemDetails','craftedTotemSigns','craftedTotemStudio','totemSignMounts'])candidates.set('xr/services/'+name+'.js',fs.readFileSync('dist/xr/services/'+name+'.js'));
candidates.set('xr/living-objects.css',fs.readFileSync('dist/xr/living-objects.css'));
for(const file of candidates.keys())if(!allowedFrontendFile(file,routes))throw Error('Unreviewed path: '+file);
const marker=await fetch('https://nourishland.org/site/root-release.json?baseline='+Date.now(),{signal:AbortSignal.timeout(30000)});
if(!marker.ok||(await marker.json()).version!==previousVersion)throw Error('Production baseline changed; reconcile before packaging');
const missing=await fetch('https://nourishland.org/xr/__crafted_totem_missing__.json?baseline='+Date.now(),{signal:AbortSignal.timeout(30000)});
const missingBytes=Buffer.from(await missing.arrayBuffer());
if(!missing.headers.get('content-type')?.includes('text/html')||!missingBytes.toString().includes('https://nourishland.org/app/'))throw Error('Unexpected XR missing-file sentinel');
const missingHash=sha(missingBytes),queue=[...candidates],files=[];let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<queue.length){
 const [file,bytes]=queue[cursor++];const response=await fetch('https://nourishland.org/'+file+'?baseline='+version+'-'+Date.now(),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(120000)});
 if(!response.ok&&response.status!==404)throw Error('Baseline HTTP '+response.status+': '+file);
 let previousSha256=null;
 if(response.ok){const digest=crypto.createHash('sha256');for await(const chunk of response.body)digest.update(chunk);previousSha256=digest.digest('hex');}
 if(file.startsWith('xr/')&&previousSha256===missingHash)previousSha256=null;
 const sha256=sha(bytes);if(previousSha256===sha256&&!routes.has(file)&&file!=='xr/services/buildInfo.js')continue;
 const out=path.join(release,'payload',file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,bytes);
 files.push({file,bytes:bytes.length,sha256,previousSha256,mode:'0644'});console.log(file+' '+bytes.length+(previousSha256?' replace':' new'));
}}));
files.sort((a,b)=>a.file.localeCompare(b.file));
fs.writeFileSync(release+'/manifest.json',JSON.stringify({schema:'nourishland.root-overlay.v1',version,managedBy:'root-site-release',files,backendChanged:false,routingChanged:false,wordPressChanged:false},null,2)+'\n');
console.log('Prepared '+files.length+' explicit frontend files, preserving the current hero, routing and user data.');
