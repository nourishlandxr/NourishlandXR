import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const expectedVersion=JSON.parse(fs.readFileSync('dist/xr/services/buildInfo.js','utf8').match(/Object.freeze\(([\s\S]*?)\);/)[1]).version;
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nl-hub-browser-'));
function write(file,value){const target=path.join(directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value));}
write('garden/project.json',{id:'garden',name:'Learning garden',visibility:'public',projectStatus:'ready'});
write('garden/sites/s/site.json',{id:'s',name:'North garden',visibility:'public'});
write('garden/sites/s/places/a/place.json',{id:'a',name:'Herb bed',type:'Bed or Plot',visibility:'public'});
write('empty/project.json',{id:'empty',name:'New garden',visibility:'draft'});
write('empty/sites/main/site.json',{id:'main',name:'First Site',visibility:'draft'});
for(const [id,name,type] of [['ginger','Ginger clump','plant'],['thyme','Thyme','plant'],['totem','Entrance Totem','area_checkpoint']]){
 write(`garden/sites/s/places/a/markers/${id}/marker.json`,{id,name,type,description:'Pilot garden feature.',visibility:'public',status:'draft'});
 if(type==='plant')write(`garden/sites/s/places/a/markers/${id}/plant_profile.json`,{common_name:name,overview:`Local ${name} record.`,revision:0});
}
const child=spawn(process.execPath,['dist/xr-api/server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:'0',HOST:'127.0.0.1',NODE_ENV:'development',NOURISHLAND_ACCESS_FILE:'',NOURISHLAND_CREATOR_PASSWORD:'',NOURISHLAND_WORKSPACE_DIR:directory},stdio:['ignore','pipe','pipe']});
let logs='',browser,server,page;const errors=[];child.stderr.on('data',chunk=>logs+=chunk);
try{
 const api=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs||'API timeout')),20000);child.stdout.on('data',chunk=>{logs+=chunk;const match=logs.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timer);resolve(match[0]);}});child.once('exit',()=>{clearTimeout(timer);reject(Error(logs));});});
 const root=path.resolve('dist'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.glb':'model/gltf-binary'};
 server=http.createServer((req,res)=>{
  if(req.url.startsWith('/xr-api/')){const proxy=http.request(api+req.url.replace(/^\/xr-api/,'/api'),{method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});proxy.on('error',error=>{res.writeHead(502);res.end(error.message);});req.pipe(proxy);return;}
  if(req.url==='/xr/_hub-menu-fixture'){res.setHeader('Content-Type','text/html');res.end('<div id="app"></div><script type="module">import {mountCreatorXrWorklist} from "/xr/services/creatorXrWorklist.js";window.fixtureActions=[];mountCreatorXrWorklist(document.getElementById("app"),{projectName:"Garden",areaName:"Herb bed",getRecords:()=>[{marker:{id:"ginger",name:"Ginger",type:"plant"}}],onInspect:r=>window.fixtureActions.push(r.marker.id),onPlace:()=>{},onKnowledge:()=>{},onClose:()=>{},onOpenTool:t=>window.fixtureActions.push(t)});</script>');return;}
  try{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))throw Error();if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end('{}');}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const desktop=await browser.newContext({viewport:{width:1440,height:1000}});page=await desktop.newPage();page.on('pageerror',error=>errors.push(error.message));

 await page.goto(origin+'/xr/?workspace=desktop&project=garden&site=s&view=project-tools');
 await page.locator('[data-hub-action=settings]').click();await page.locator('.creator-settings #projectSettingsName').waitFor({timeout:60000});
 await page.evaluate(async()=>{const {renderPlatformHome}=await import('/xr/screens/projectDashboard.js');await renderPlatformHome(document.getElementById('app'));});await page.locator('.creator-project-menu').waitFor();
 assert.equal(await page.locator('.creator-project-menu .v2-masthead').count(),1);assert.equal(await page.locator('.creator-project-menu.v2-unified').count(),0);await page.screenshot({path:'artifacts/creator-workbench-projects.png',fullPage:true});
 await page.locator('.create-project-action').click();await page.locator('.creator-project-form').waitFor();assert.equal(await page.locator('.creator-project-form .v2-masthead').count(),1);await page.screenshot({path:'artifacts/creator-workbench-create.png',fullPage:true});
 const maps=[];
 for (const view of ['planning-map','imap','placement']) {
   await page.goto(origin+'/xr/?workspace=desktop&project=garden&site=s&view='+view);
   const selector={ 'planning-map':'[data-imap-svg]',imap:'.creator-imap-v2 canvas',placement:'.spatial-entry-hero' }[view];
   await page.locator(selector).waitFor({timeout:60000});
   if(view==='imap') await page.locator('[data-map-status]').filter({hasText:/Schematic terrain|Nearby NSW|origin/}).waitFor({timeout:60000});
   if(view==='placement') assert(await page.locator('[data-enter]').isDisabled());
   await page.screenshot({path:'artifacts/creator-workbench-'+view+'.png',fullPage:true});
   maps.push(view);
 }
 await page.setViewportSize({width:390,height:844});
 for (const view of ['planning-map','imap','placement']) {
   await page.goto(origin+'/xr/?workspace=field&project=garden&site=s&view='+view);
   await page.locator({ 'planning-map':'[data-imap-svg]',imap:'.creator-imap-v2 canvas',placement:'.spatial-entry-hero' }[view]).waitFor({timeout:60000});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Phone map overflow: '+view);
   await page.screenshot({path:'artifacts/creator-workbench-phone-'+view+'.png',fullPage:true});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({maps,phone:'all three fit',errors},null,2));
}catch(error){console.log(JSON.stringify({errors,body:await page?.locator('body').innerText().catch(()=>''),logs:logs.slice(-1200)},null,2));throw error;}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));if(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(directory).startsWith('nl-hub-browser-'))fs.rmSync(directory,{recursive:true,force:true});}
