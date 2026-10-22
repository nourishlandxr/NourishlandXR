import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {allowedFrontendFile} from './frontend-boundary.mjs';
const version=process.argv[2]||'0.9774';if(!/^0\.[0-9]{4}$/.test(version))throw Error('Invalid release version');
const root=path.resolve('root-site/releases',version),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const routes=new Set(Object.values(JSON.parse(fs.readFileSync('root-site/routes.json','utf8'))).map(route=>(route.path==='/'?'':route.path.slice(1))+'index.html'));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');const seen=new Set();
if(manifest.version!==version||manifest.managedBy!=='root-site-release'||manifest.backendChanged||manifest.routingChanged||manifest.wordPressChanged)throw Error('Invalid release boundary');
for(const item of manifest.files){
 const name=item.file;
 if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.startsWith('/')||name.split('/').some(part=>part==='..'||part.startsWith('.'))||seen.has(name))throw Error('Unsafe or duplicate path: '+name);seen.add(name);
 if(!allowedFrontendFile(name,routes))throw Error('Unexpected frontend file: '+name);
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
  for(let attempt=0;attempt<3;attempt++){
   const response=await fetch('https://nourishland.org/'+item.file+'?release='+version+'-'+item.sha256.slice(0,10),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
   if(response.ok&&digest(Buffer.from(await response.arrayBuffer()))===item.sha256){success=true;break}
   await new Promise(resolve=>setTimeout(resolve,2000));
  }
  if(!success)throw Error('Public hash mismatch: '+item.file);
 }
 console.log('All '+manifest.files.length+' public file hashes match V'+version);
}else console.log('Verified V'+version+': '+manifest.files.length+' explicitly scoped frontend files');
