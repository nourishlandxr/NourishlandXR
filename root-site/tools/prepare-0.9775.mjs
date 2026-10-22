// One-off reviewed release: preserve the latest root pages, add the clean hero,
// and reconcile the static XR fixes since its last successful deployment.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {allowedFrontendFile} from './frontend-boundary.mjs';

const version='0.9775',previousVersion='0.9774',release=`root-site/releases/${version}`;
const previous=`root-site/releases/${previousVersion}`;
const routes=new Set(Object.values(JSON.parse(fs.readFileSync('root-site/routes.json')))
  .map(route=>(route.path==='/'?'':route.path.slice(1))+'index.html'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const candidates=new Map();
for(const item of JSON.parse(fs.readFileSync(previous+'/manifest.json')).files){
  let bytes=fs.readFileSync(previous+'/payload/'+item.file);
  if(item.file.endsWith('index.html'))bytes=Buffer.from(bytes.toString()
    .replaceAll('hero-preview.css?v=hero-cycle-03','hero-preview.css?v=clean-hq-video-01')
    .replaceAll('/site/root-router.js"','/site/root-router.js?v=0.9775"')
    .replaceAll('assets/hero-delivery-04/','assets/hero-clean-hq/'));
  if(item.file==='site/root-release.json')bytes=Buffer.from(JSON.stringify({
    managedBy:'root-site-release',version,publishedAt:new Date().toISOString(),
    legacyXrAutoDeployMustNotOverwrite:true,backendChanged:false
  },null,2)+'\n');
  candidates.set(item.file,bytes);
}
candidates.set('site/root-router.js',fs.readFileSync('root-site/source/root-router.js'));
const changed=execFileSync('git',['diff','--name-only','10e330ec','--','app'],{encoding:'utf8'}).trim().split(/\r?\n/);
for(const name of changed){
  if(!name||!fs.existsSync(name))continue;
  const target='xr/'+name.slice(4);
  if(!allowedFrontendFile(target,routes))throw Error('Unreviewed frontend path: '+target);
  candidates.set(target,fs.readFileSync('dist/'+target));
}
function walk(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  const name=path.join(directory,entry.name);if(entry.isDirectory())walk(name);
  else {const target='xr/'+name.replaceAll('\\','/').slice('app/'.length);
    if(allowedFrontendFile(target,routes))candidates.set(target,fs.readFileSync('dist/'+target));}
}}
walk('app/v2/assets/hero-clean-hq');walk('app/vendor/iwsdk-input');
candidates.set('xr/index.html',fs.readFileSync('dist/xr/index.html'));
candidates.set('xr/services/buildInfo.js',fs.readFileSync('dist/xr/services/buildInfo.js'));
const marker=await fetch('https://nourishland.org/site/root-release.json?baseline='+Date.now(),{signal:AbortSignal.timeout(30000)});
if(!marker.ok||(await marker.json()).version!==previousVersion)throw Error('Root baseline changed; reconcile before packaging');
const files=[],queue=[...candidates];let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<queue.length){
  const [file,bytes]=queue[cursor++];
  const response=await fetch('https://nourishland.org/'+file+'?baseline='+version+'-'+Date.now(),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(120000)});
  if(!response.ok&&response.status!==404)throw Error('Unexpected baseline HTTP '+response.status+': '+file);
  let previousSha256=null;
  if(response.ok){const hash=crypto.createHash('sha256');for await(const chunk of response.body)hash.update(chunk);previousSha256=hash.digest('hex');}
  const sha256=sha(bytes);
  // Root pages and the release badge stay explicit even if their content matches.
  if(previousSha256===sha256&&!routes.has(file)&&file!=='xr/services/buildInfo.js')continue;
  const target=release+'/payload/'+file;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  files.push({file,bytes:bytes.length,sha256,previousSha256,mode:'0644'});
  console.log(file+' '+bytes.length+(previousSha256?' replace':' new'));
}}));
files.sort((a,b)=>a.file.localeCompare(b.file));
fs.writeFileSync(release+'/manifest.json',JSON.stringify({schema:'nourishland.root-overlay.v1',version,
  managedBy:'root-site-release',files,backendChanged:false,routingChanged:false,wordPressChanged:false},null,2)+'\n');
console.log(`Prepared ${files.length} explicit frontend files; ${files.reduce((sum,item)=>sum+item.bytes,0)} bytes.`);
