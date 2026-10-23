// Package the reviewed interface over V0.9798, retaining canonical routing.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {allowedFrontendFile} from './frontend-boundary.mjs';
import {versionModuleImports,versionCssImports} from './release-module-urls.mjs';
import {revision as version} from './assemble-website.mjs';
import {releaseHtmlFiles,auxiliaryFiles,LEGACY_ENTRY_FILES} from './canonical-pages.mjs';
import {writeRoutingPlan} from './routing-plan.mjs';
const previousVersion='0.9798',release=`root-site/releases/${version}`,candidate='dist/website';
const previousManifest=JSON.parse(fs.readFileSync(`root-site/releases/${previousVersion}/manifest.json`));
const history=fs.readdirSync('root-site/releases').filter(v=>/^0\.\d{4}$/.test(v)&&v<=previousVersion&&fs.existsSync(`root-site/releases/${v}/manifest.json`)).sort().reverse().map(v=>JSON.parse(fs.readFileSync(`root-site/releases/${v}/manifest.json`)));
const previousFile=file=>history.flatMap(m=>m.files||[]).find(item=>item.file===file);
if(fs.existsSync(release))throw Error('Release already exists; preserve published payloads.');
const routes=releaseHtmlFiles;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),candidates=new Map();
for(const file of routes)candidates.set(file,fs.readFileSync(path.join(candidate,file)));
for(const file of auxiliaryFiles)candidates.set(file,fs.readFileSync(path.join(candidate,file)));
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
for(const name of ['homepage-hero.js','hero-preview.css','food-forest-story.js','creator-links.js'])candidates.set('xr/v2/'+name,fs.readFileSync('dist/xr/v2/'+name));
for(const name of ["screens/biomeWheelXR.js","services/biomeWheelPresentation.js","entry.js","screens/accessPortal.js","services/portalRoutes.js","services/siteRoutes.js","screens/pimoEditor.js","screens/temporaryArDemo.js","screens/projectDashboard.js","screens/creatorHubWorkspace.js","screens/creatorDesktopWorkspace.js","features/ar-demo/demoPreviewMarkup.js","services/pimoGraph.js","services/pimoGraphTemplates.js","services/pimoGraphDocument.js","services/pimoReaderPreview.js","services/pimoProjectEditor.js","services/pimoXRWorkbench.js","services/pimoEditorIcons.js","services/creatorQuickStart.js"])candidates.set('xr/'+name,Buffer.from(versionModuleImports(fs.readFileSync('dist/xr/'+name,'utf8'),version)));
for(const file of ['pimo-editor.css','pimo-reader-preview.css','biome-wheel-xr.css'])candidates.set('xr/'+file,fs.readFileSync('dist/xr/'+file));
for(const file of ['current-landscape.bin','current-landscape.json'])candidates.set('xr/assets/biome-wheel/'+file,fs.readFileSync('dist/xr/assets/biome-wheel/'+file));
const build=fs.readFileSync('dist/xr/services/buildInfo.js');if(!build.toString().includes(version))throw Error('Build version does not match website.');
candidates.set('xr/services/buildInfo.js',build);
candidates.set('site/root-release.json',Buffer.from(JSON.stringify({managedBy:'root-site-release',version,publishedAt:new Date().toISOString(),legacyXrAutoDeployMustNotOverwrite:true,backendChanged:false},null,2)+'\n'));
const marker=await fetch('https://nourishland.org/site/root-release.json?baseline='+Date.now(),{signal:AbortSignal.timeout(30000)});
if(!marker.ok||(await marker.json()).version!==previousVersion)throw Error('Production baseline changed; reconcile before packaging.');
const probes={};for(const prefix of ['xr','site']){
 const response=await fetch(`https://nourishland.org/${prefix}/__experience_missing_${version}__.json?baseline=${Date.now()}`,{signal:AbortSignal.timeout(30000)});
 if(response.status===404){probes[prefix]=null;continue;}
 const bytes=Buffer.from(await response.arrayBuffer());
 const knownBridge=Object.keys(LEGACY_ENTRY_FILES).some(file=>previousFile(file)?.sha256===sha(bytes));
 if(!response.ok||!response.headers.get('content-type')?.includes('text/html')||!knownBridge)throw Error('Unexpected missing-file response: '+prefix);
 probes[prefix]=sha(bytes);
}
const files=[],queue=[...candidates];let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<queue.length){
 const [file,bytes]=queue[cursor++];if(!allowedFrontendFile(file,routes))throw Error('Unreviewed path: '+file);
 // Canonical entry URLs now redirect, so their HTTP body is not a file inventory.
 // Keep identical, already published bridges out of this unrelated interface update.
 if(Object.hasOwn(LEGACY_ENTRY_FILES,file)){
  if(previousFile(file)?.sha256===sha(bytes))continue;
  throw Error('Entry bridge changed: obtain its private file baseline before packaging '+file);
 }
 const response=await fetch('https://nourishland.org/'+file+'?baseline='+version+'-'+Date.now(),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(60000)});
 if(!response.ok&&response.status!==404)throw Error('Baseline HTTP '+response.status+': '+file);
 let previousSha256=response.ok?sha(Buffer.from(await response.arrayBuffer())):null;
 // Known entry bridges can legitimately equal the host's missing-file fallback.
 // They are existing files, so retain their prior hash rather than marking them new.
 if(previousSha256&&previousSha256===probes[file.split('/')[0]]&&!Object.hasOwn(LEGACY_ENTRY_FILES,file))previousSha256=null;
 const sha256=sha(bytes);if(previousSha256===sha256&&!routes.has(file)&&file!=='xr/services/buildInfo.js')continue;
 const out=path.join(release,'payload',file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,bytes);
 files.push({file,bytes:bytes.length,sha256,previousSha256,mode:'0644',...(LEGACY_ENTRY_FILES[file]?{redirectTarget:LEGACY_ENTRY_FILES[file]}:{})});console.log(file+(previousSha256?' replace':' new'));
}}));
files.sort((a,b)=>a.file.localeCompare(b.file));
const routing=process.argv.includes('--update-routing')?writeRoutingPlan(release,version):null;
fs.writeFileSync(release+'/manifest.json',JSON.stringify({schema:'nourishland.root-overlay.v1',version,managedBy:'root-site-release',files,backendChanged:false,routingChanged:!!routing,...(routing?{routing}:{}),wordPressChanged:false},null,2)+'\n');
console.log(`Prepared V${version}: ${files.length} explicit files; hero video and world geometry preserved.`);
