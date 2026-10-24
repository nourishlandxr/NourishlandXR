import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parse} from 'acorn';
import {allowedFrontendFile} from '../root-site/tools/frontend-boundary.mjs';
import {releaseHtmlFiles,auxiliaryFiles,LEGACY_ENTRY_FILES} from '../root-site/tools/canonical-pages.mjs';
import {versionModuleImports} from '../root-site/tools/release-module-urls.mjs';

const version=fs.readFileSync('app/services/buildInfo.js','utf8').match(/const VERSION = '([^']+)'/)[1];
const release=`root-site/releases/${version}`,origin='https://nourishland.org/',expected=process.env.FOOD_FOREST_BASELINE;
if(!/^0\.[0-9]{4}$/.test(expected||''))throw Error('Set FOOD_FOREST_BASELINE to the reviewed live release version.');
if(fs.existsSync(release))throw Error('Preserve existing release payload: '+release);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function read(file){for(let attempt=0;attempt<3;attempt++){
    try{const response=await fetch(origin+file+'?baseline='+version+'-'+Date.now(),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});return {status:response.status,bytes:Buffer.from(await response.arrayBuffer())};}
    catch(error){if(attempt===2)throw new Error(`Cannot baseline ${file}: ${error.message}`,{cause:error});console.log(`Retrying baseline ${file}`);}
}}
const marker=await read('site/root-release.json');if(marker.status!==200||JSON.parse(marker.bytes).version!==expected)throw Error('Live baseline changed');
const missing=await read(`xr/services/__missing_food_forest_${version}.js`),missingHash=sha(missing.bytes),candidates=new Map(),modules=new Set();
if(missing.status!==404&&(missing.status!==200||!/^\s*<!doctype html>/i.test(missing.bytes.toString())))throw Error('Unexpected missing-module baseline response.');
function graph(file){
    // Asset-local third-party libraries are already deployed and outside this overlay.
    if(file.startsWith('assets/'))return;
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
graph('services/foodForestFoundations.js');
// Retain every previously released XR component, including lazy-loaded Demo modules.
for(const releaseName of fs.readdirSync('root-site/releases').filter(name=>/^0\.\d{4}$/.test(name)&&name<=expected)){
    const manifestPath=`root-site/releases/${releaseName}/manifest.json`;
    if(!fs.existsSync(manifestPath))continue;
    for(const {file} of JSON.parse(fs.readFileSync(manifestPath)).files){
        if(file.startsWith('xr/')&&/\.(js|mjs|css)$/.test(file)&&!file.startsWith('xr/v2/full-3d/')&&fs.existsSync('dist/'+file)){
            const bytes=fs.readFileSync('dist/'+file);
            candidates.set(file,/\.m?js$/.test(file)&&!file.startsWith('xr/vendor/')?Buffer.from(versionModuleImports(bytes.toString(),version)):bytes);
        }
    }
}
for(const file of ['entry.js','main.js','screens/accessPortal.js','screens/demoChapters.js','services/buildInfo.js'])modules.add(file);
for(const file of modules){const bytes=fs.readFileSync('dist/xr/'+file);candidates.set('xr/'+file,file.startsWith('vendor/')?bytes:Buffer.from(versionModuleImports(bytes.toString(),version)));}
for(const file of ['food-forest-workbench.css',...['plants.json','daleys-codebook.json','data-quality.json','overrides.json'].map(name=>'assets/food-forest/'+name)])candidates.set('xr/'+file,fs.readFileSync('dist/xr/'+file));
for(const file of [...releaseHtmlFiles,...auxiliaryFiles]){
    if(Object.hasOwn(LEGACY_ENTRY_FILES,file))continue;
    candidates.set(file,fs.readFileSync(path.join('dist/website',file)));
}
function websiteFiles(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const source=path.join(directory,entry.name);if(entry.isDirectory()){websiteFiles(source);continue;}
    const file='site/'+path.relative('dist/website/site',source).replaceAll('\\','/');
    if(!/\.(js|mjs|css|json|webp)$/.test(file))continue;
    const bytes=fs.readFileSync(source);candidates.set(file,/\.m?js$/.test(file)?Buffer.from(versionModuleImports(bytes.toString(),version)):bytes);
}}
websiteFiles('dist/website/site');
for(const extension of ['html','js'])candidates.set(`xr/v2/food-forest-foundations-v7.${extension}`,Buffer.from(fs.readFileSync(`tools/preview-food-forest-foundations-v7.${extension}`,'utf8').replaceAll('../app/','../').replaceAll('preview-food-forest-foundations-v7.js','food-forest-foundations-v7.js')));
candidates.set('site/root-release.json',Buffer.from(JSON.stringify({...JSON.parse(marker.bytes),version,publishedAt:new Date().toISOString(),scope:'Complete local website, menu animations, Demo and Food Forest table; foundational pieces preview'},null,2)+'\n'));
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
fs.writeFileSync(release+'/manifest.json',JSON.stringify({schema:'nourishland.root-overlay.v1',version,managedBy:'root-site-release',baselineVersion:expected,scope:'Complete local website, menus, Demo and Food Forest table with foundations preview',files,backendChanged:false,routingChanged:false,wordPressChanged:false},null,2)+'\n');
console.log(`Prepared V${version}: ${files.length} explicit frontend files; website, Demo and Food Forest previews included.`);
