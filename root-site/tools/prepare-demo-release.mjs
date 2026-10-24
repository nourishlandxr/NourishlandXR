import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {versionModuleImports} from './release-module-urls.mjs';
import {allowedFrontendFile} from './frontend-boundary.mjs';
import {releaseHtmlFiles} from './canonical-pages.mjs';

const version='0.9817',baseline='0.9813',release=`root-site/releases/${version}`;
if(fs.existsSync(release))throw Error('Release already exists; inspect it before preparing again.');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function readLive(file){
    const response=await fetch(`https://nourishland.org/${file}?demoBaseline=${version}-${Date.now()}`,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(30000)});
    if(!response.ok && response.status!==404)throw Error(`Baseline HTTP ${response.status}: ${file}`);
    return {bytes:Buffer.from(await response.arrayBuffer()),exists:response.ok};
}
const liveMarker=await readLive('site/root-release.json'),marker=JSON.parse(liveMarker.bytes);
if(marker.version!==baseline || marker.managedBy!=='root-site-release')throw Error('Production baseline changed.');
const candidates=new Map();
// The publisher requires these website files in every overlay. Preserve their
// exact live bytes; no platform or website content is rebuilt for this release.
for(const file of ['index.html','education/index.html','platform/index.html']){
    const live=await readLive(file);if(!live.exists)throw Error('Missing website baseline');candidates.set(file,{bytes:live.bytes,live});
}
for(const file of ['entry.js','main.js','screens/temporaryArDemo.js','features/ar-demo/demoJourneyContent.js',
    'services/buildInfo.js','services/demoChapters.js','services/demoLivingMapModel.js','services/demoLivingMapScene.js',
    'services/demoBorderRangesSeed.js','services/demoBorderRangesTerrain.js']){
    const bytes=Buffer.from(versionModuleImports(fs.readFileSync(path.join('app',file),'utf8'),version));
    candidates.set('xr/'+file,{bytes});
}
candidates.set('site/root-release.json',{bytes:Buffer.from(JSON.stringify({...marker,version,publishedAt:new Date().toISOString(),scope:'Demo: Border Ranges IMAP, crafted Totems and deferred LIMO'},null,2)+'\n'),live:liveMarker});
const files=[];
for(const [file,candidate] of candidates){
    if(!allowedFrontendFile(file,releaseHtmlFiles))throw Error('Unreviewed target: '+file);
    const live=candidate.live || await readLive(file),bytes=candidate.bytes;
    fs.mkdirSync(path.dirname(path.join(release,'payload',file)),{recursive:true});fs.writeFileSync(path.join(release,'payload',file),bytes);
    files.push({file,bytes:bytes.length,sha256:hash(bytes),previousSha256:live.exists?hash(live.bytes):null,mode:'0644'});
}
fs.writeFileSync(path.join(release,'manifest.json'),JSON.stringify({schema:'nourishland.root-overlay.v1',version,managedBy:'root-site-release',files,backendChanged:false,routingChanged:false,wordPressChanged:false},null,2)+'\n');
console.log(`Prepared Demo-only V${version}: ${files.length} files; website HTML preserved byte for byte.`);
