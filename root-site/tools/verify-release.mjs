import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {allowedFrontendFile} from './frontend-boundary.mjs';
import {releaseHtmlFiles,LEGACY_ENTRY_FILES} from './canonical-pages.mjs';
import {verifyRoutingPlan} from './routing-plan.mjs';
const version=process.argv[2]||'0.9774';if(!/^0\.[0-9]{4}$/.test(version))throw Error('Invalid release version');
const root=path.resolve('root-site/releases',version),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const routes=releaseHtmlFiles;
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');const seen=new Set();
if(manifest.version!==version||manifest.managedBy!=='root-site-release'||manifest.backendChanged||manifest.wordPressChanged)throw Error('Invalid release boundary');
verifyRoutingPlan(root,manifest);
for(const item of manifest.files){
 const name=item.file;
 if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.startsWith('/')||name.split('/').some(part=>part==='..'||part.startsWith('.'))||seen.has(name))throw Error('Unsafe or duplicate path: '+name);seen.add(name);
 if(!allowedFrontendFile(name,routes))throw Error('Unexpected frontend file: '+name);
 if(item.redirectTarget&&LEGACY_ENTRY_FILES[name]!==item.redirectTarget)throw Error('Unreviewed redirect target: '+name);
 if(!/^[a-f0-9]{64}$/.test(item.sha256)||item.previousSha256&&!/^[a-f0-9]{64}$/.test(item.previousSha256))throw Error('Invalid hash');
 const file=path.join(root,'payload',name);if(fs.lstatSync(file).isSymbolicLink())throw Error('Symlink in release');const bytes=fs.readFileSync(file);if(bytes.length!==item.bytes||digest(bytes)!==item.sha256)throw Error('Artifact hash mismatch: '+name);
}
for(const name of ['index.html','education/index.html','platform/index.html','site/root-release.json','xr/services/buildInfo.js'])if(!seen.has(name))throw Error('Missing release file: '+name);
const rank=name=>name==='site/root-release.json'?4:name==='xr/services/buildInfo.js'?3:name==='index.html'?2:name.endsWith('index.html')||name.endsWith('world-manifest.json')?1:0;
manifest.files.sort((a,b)=>rank(a.file)-rank(b.file)||a.file.localeCompare(b.file));
fs.writeFileSync(path.join(root,'files.tsv'),manifest.files.map(item=>[item.file,item.sha256,item.previousSha256||'-'].join('\t')).join('\n')+'\n');
if(process.argv.includes('--public')){
 for(const item of manifest.files){
  let success=false;
  for(let attempt=0;attempt<5;attempt++){
   const response=await fetch('https://nourishland.org/'+item.file+(item.redirectTarget?'':'?release='+version+'-'+item.sha256.slice(0,10)+(attempt?'&retry='+attempt+'-'+Date.now():'')),{redirect:item.redirectTarget?'manual':'follow',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
   if(item.redirectTarget&&[301,302,307,308].includes(response.status)){const destination=new URL(response.headers.get('location'),'https://nourishland.org');if(destination.origin==='https://nourishland.org'&&destination.pathname===item.redirectTarget){success=true;break;}}
   if(response.ok&&digest(Buffer.from(await response.arrayBuffer()))===item.sha256){success=true;break}
   if(attempt<4)await new Promise(resolve=>setTimeout(resolve,5000));
  }
  if(!success)throw Error('Public hash mismatch: '+item.file);
 }
 console.log('All '+manifest.files.length+' public files / canonical entry redirects match V'+version);
}else console.log('Verified V'+version+': '+manifest.files.length+' explicitly scoped frontend files');
