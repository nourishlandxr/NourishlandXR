// Package the assembled website as an explicit additive overlay over V0.9784.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {allowedFrontendFile} from './frontend-boundary.mjs';
import {versionModuleImports,versionCssImports} from './release-module-urls.mjs';
import {revision as version} from './assemble-website.mjs';
const previousVersion='0.9784',release=`root-site/releases/${version}`,candidate='dist/website';
if(fs.existsSync(release))throw Error('Release already exists; preserve published payloads.');
const routes=new Set(Object.values(JSON.parse(fs.readFileSync('root-site/routes.json'))).map(r=>(r.path==='/'?'':r.path.slice(1))+'index.html'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),candidates=new Map();
for(const file of routes)candidates.set(file,fs.readFileSync(path.join(candidate,file)));
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const name=path.join(dir,entry.name);if(entry.isDirectory()){walk(name);continue;}
 const file='site/'+path.relative(path.join(candidate,'site'),name).replaceAll('\\','/');
 if(!/\.(?:js|mjs|css|json|webp)$/.test(file))continue;
 if(!allowedFrontendFile(file,routes))throw Error('Unreviewed website path: '+file);
 let bytes=fs.readFileSync(name);
 if(/\.(?:js|mjs)$/.test(file))bytes=Buffer.from(versionModuleImports(bytes.toString(),version));
 if(file.endsWith('.css'))bytes=Buffer.from(versionCssImports(bytes.toString(),version));
 candidates.set(file,bytes);
}}
walk(path.join(candidate,'site'));
for(const name of ['homepage-hero.js','hero-preview.css','index.html'])candidates.set('xr/v2/'+name,fs.readFileSync('dist/xr/v2/'+name));
const build=fs.readFileSync('dist/xr/services/buildInfo.js');if(!build.toString().includes(version))throw Error('Build version does not match website.');
candidates.set('xr/services/buildInfo.js',build);
candidates.set('site/root-release.json',Buffer.from(JSON.stringify({managedBy:'root-site-release',version,publishedAt:new Date().toISOString(),legacyXrAutoDeployMustNotOverwrite:true,backendChanged:false},null,2)+'\n'));
const marker=await fetch('https://nourishland.org/site/root-release.json?baseline='+Date.now(),{signal:AbortSignal.timeout(30000)});
if(!marker.ok||(await marker.json()).version!==previousVersion)throw Error('Production baseline changed; reconcile before packaging.');
const probes={};for(const prefix of ['xr','site']){
 const response=await fetch(`https://nourishland.org/${prefix}/__experience_missing_${version}__.json?baseline=${Date.now()}`,{signal:AbortSignal.timeout(30000)});
 if(response.status===404){probes[prefix]=null;continue;}
 const bytes=Buffer.from(await response.arrayBuffer());
 if(!response.ok||!response.headers.get('content-type')?.includes('text/html')||!bytes.toString().includes('https://nourishland.org/app/'))throw Error('Unexpected missing-file response: '+prefix);
 probes[prefix]=sha(bytes);
}
const files=[],queue=[...candidates];let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<queue.length){
 const [file,bytes]=queue[cursor++];if(!allowedFrontendFile(file,routes))throw Error('Unreviewed path: '+file);
 const response=await fetch('https://nourishland.org/'+file+'?baseline='+version+'-'+Date.now(),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(60000)});
 if(!response.ok&&response.status!==404)throw Error('Baseline HTTP '+response.status+': '+file);
 let previousSha256=response.ok?sha(Buffer.from(await response.arrayBuffer())):null;
 if(previousSha256&&previousSha256===probes[file.split('/')[0]])previousSha256=null;
 const sha256=sha(bytes);if(previousSha256===sha256&&!routes.has(file)&&file!=='xr/services/buildInfo.js')continue;
 const out=path.join(release,'payload',file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,bytes);
 files.push({file,bytes:bytes.length,sha256,previousSha256,mode:'0644'});console.log(file+(previousSha256?' replace':' new'));
}}));
files.sort((a,b)=>a.file.localeCompare(b.file));
fs.writeFileSync(release+'/manifest.json',JSON.stringify({schema:'nourishland.root-overlay.v1',version,managedBy:'root-site-release',files,backendChanged:false,routingChanged:false,wordPressChanged:false},null,2)+'\n');
console.log(`Prepared V${version}: ${files.length} explicit files; hero video and world geometry preserved.`);
