import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parse} from 'acorn';
import {allowedFrontendFile} from '../root-site/tools/frontend-boundary.mjs';
import {releaseHtmlFiles} from '../root-site/tools/canonical-pages.mjs';
import {versionModuleImports} from '../root-site/tools/release-module-urls.mjs';

const version=fs.readFileSync('app/services/buildInfo.js','utf8').match(/const VERSION = '([^']+)'/)[1];
const release=`root-site/releases/${version}`,origin='https://nourishland.org/',expected=process.env.FOOD_FOREST_BASELINE;
if(!/^0\.[0-9]{4}$/.test(expected||''))throw Error('Set FOOD_FOREST_BASELINE to the reviewed live release version.');
if(fs.existsSync(release))throw Error('Preserve existing release payload: '+release);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function read(file){const response=await fetch(origin+file+'?baseline='+version+'-'+Date.now(),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(45000)});return {status:response.status,bytes:Buffer.from(await response.arrayBuffer())};}
const marker=await read('site/root-release.json');if(marker.status!==200||JSON.parse(marker.bytes).version!==expected)throw Error('Live baseline changed');
const missing=await read(`xr/services/__missing_food_forest_${version}.js`),missingHash=sha(missing.bytes),candidates=new Map(),modules=new Set();
if(missing.status!==404&&(missing.status!==200||!/^\s*<!doctype html>/i.test(missing.bytes.toString())))throw Error('Unexpected missing-module baseline response.');
function graph(file){
    if(modules.has(file))return;modules.add(file);
    const source=fs.readFileSync('dist/xr/'+file,'utf8');
    if(file.startsWith('vendor/'))return;
    const ast=parse(source,{sourceType:'module',ecmaVersion:'latest'});
    for(const node of ast.body)if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type)&&typeof node.source?.value==='string'&&node.source.value.startsWith('.')){
        const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),node.source.value.split('?')[0]));
        if(/\.m?js$/.test(target))graph(target);
    }
}
graph('screens/foodForestWorkbench.js');
for(const file of ['entry.js','main.js','screens/accessPortal.js','screens/demoChapters.js','services/buildInfo.js'])modules.add(file);
for(const file of modules){const bytes=fs.readFileSync('dist/xr/'+file);candidates.set('xr/'+file,file.startsWith('vendor/')?bytes:Buffer.from(versionModuleImports(bytes.toString(),version)));}
for(const file of ['food-forest-workbench.css',...['plants.json','daleys-codebook.json','data-quality.json','overrides.json'].map(name=>'assets/food-forest/'+name)])candidates.set('xr/'+file,fs.readFileSync('dist/xr/'+file));
for(const file of ['index.html','education/index.html','platform/index.html']){const live=await read(file);if(live.status!==200)throw Error('Cannot preserve '+file);candidates.set(file,live.bytes);}
candidates.set('site/root-release.json',Buffer.from(JSON.stringify({...JSON.parse(marker.bytes),version,publishedAt:new Date().toISOString(),scope:'Food Forest V6: organic pieces, root-space planning and simplified learning; website and Demo preserved'},null,2)+'\n'));
const files=[],queue=[...candidates];let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<queue.length){
    const[file,bytes]=queue[cursor++];if(!allowedFrontendFile(file,releaseHtmlFiles))throw Error('Outside frontend boundary: '+file);
    const prior=await read(file);if(prior.status!==200&&prior.status!==404)throw Error(`Baseline HTTP ${prior.status}: ${file}`);
    const previousSha256=prior.status===404||file.startsWith('xr/')&&sha(prior.bytes)===missingHash?null:sha(prior.bytes);
    if(sha(bytes)===previousSha256&&!['index.html','education/index.html','platform/index.html'].includes(file))continue;
    files.push({file,bytes:bytes.length,sha256:sha(bytes),previousSha256,mode:'0644'});
}}));
const after=await read('site/root-release.json');if(sha(after.bytes)!==sha(marker.bytes))throw Error('Live release changed during preparation');
for(const item of files){const destination=path.join(release,'payload',item.file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,candidates.get(item.file));}
files.sort((a,b)=>a.file.localeCompare(b.file));
fs.writeFileSync(release+'/manifest.json',JSON.stringify({schema:'nourishland.root-overlay.v1',version,managedBy:'root-site-release',baselineVersion:expected,scope:'Food Forest V6 organic pieces and root-space planning',files,backendChanged:false,routingChanged:false,wordPressChanged:false},null,2)+'\n');
console.log(`Prepared V${version}: ${files.length} explicit frontend files; existing website HTML preserved.`);
