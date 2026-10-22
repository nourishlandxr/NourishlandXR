import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const expectedVersion=JSON.parse(fs.readFileSync('dist/xr/services/buildInfo.js','utf8').match(/Object.freeze\(([\s\S]*?)\);/)[1]).version;
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nl-tour-browser-'));
function write(file,value){const target=path.join(directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value));}
write('garden/project.json',{id:'garden',name:'Tour pilot garden',visibility:'public',projectStatus:'ready'});
write('garden/sites/s/site.json',{id:'s',name:'Learning garden',visibility:'public'});
write('garden/sites/s/places/a/place.json',{id:'a',name:'Herb bed',type:'Bed or Plot',visibility:'public'});
for(const [id,name,type] of [['ginger','Ginger','plant'],['thyme','Thyme','plant'],['totem','Garden entrance','area_checkpoint']]){
 write(`garden/sites/s/places/a/markers/${id}/marker.json`,{id,name,type,description:'A real feature in the pilot garden.',visibility:'public',status:'draft'});
 if(type==='plant')write(`garden/sites/s/places/a/markers/${id}/plant_profile.json`,{common_name:name,overview:`Local ${name} record.`,revision:0});
}
const child=spawn(process.execPath,['dist/xr-api/server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:'0',HOST:'127.0.0.1',NODE_ENV:'development',NOURISHLAND_ACCESS_FILE:'',NOURISHLAND_CREATOR_PASSWORD:'',NOURISHLAND_WORKSPACE_DIR:directory},stdio:['ignore','pipe','pipe']});
let logs='',browser,server;const errors=[];let page;child.stderr.on('data',chunk=>logs+=chunk);
try{
 const api=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs||'API timeout')),15000);child.stdout.on('data',chunk=>{logs+=chunk;const match=logs.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timer);resolve(match[0]);}});child.once('exit',()=>{clearTimeout(timer);reject(Error(logs));});});
 const root=path.resolve('dist'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.glb':'model/gltf-binary'};
 server=http.createServer(async(req,res)=>{
  if(req.url.startsWith('/xr-api/')){const proxy=http.request(api+req.url.replace(/^\/xr-api/,'/api'),{method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});proxy.on('error',error=>{res.writeHead(502);res.end(error.message);});req.pipe(proxy);return;}
  try{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))throw Error();if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end('{}');}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/xr/',{waitUntil:'domcontentloaded'});await page.locator('.welcome-version-badge').waitFor({timeout:60000});assert.ok((await page.locator('.welcome-version-badge').textContent()).includes('V'+expectedVersion));await page.screenshot({path:'artifacts/tour-foundation-welcome.png'});
 await page.goto(origin+'/xr/?workspace=desktop&project=garden&site=s&view=records',{waitUntil:'domcontentloaded'});
 await page.locator('[data-record="s/a/ginger"]').click();await page.locator('[name="featureKind"]').selectOption('clump');
 await page.getByText('Filter tags',{exact:true}).click();await page.locator('[name="use-edible"]').check();await page.locator('[name="forestLayer"]').selectOption('4');await page.locator('[name="featureSource"]').fill('Reviewed garden plant record.');
 await page.getByRole('button',{name:'Save record',exact:true}).click();await page.locator('[data-status]').filter({hasText:'Record saved.'}).waitFor();
 await page.locator('[data-feature-use]').selectOption('edible');assert.equal(await page.locator('[data-center] [data-record]').count(),1);
 await page.locator('[data-view="tours"]').click();await page.locator('[data-tour-new]').waitFor();await page.locator('[data-tour-new]').click();await page.locator('[data-tour-field="title"]').fill('Discover the herb bed');
 await page.locator('[data-tour-field="description"]').fill('A short walk with three different ways to learn.');
 await page.locator('[data-tour-add-target]').selectOption(JSON.stringify({siteId:'s',areaId:'a',recordId:'ginger'}));await page.locator('[data-tour-add]').click();
 let stop=page.locator('[data-tour-stop]').nth(0);await stop.locator('[data-stop-field="directions"]').fill('Start beside the entrance Totem. Find the ginger clump.');await stop.locator('[data-stop-field="instructions"]').fill('Look at the ginger leaves. Describe what you notice.');
 await page.locator('[data-tour-add-target]').selectOption(JSON.stringify({siteId:'s',areaId:'a',recordId:'thyme'}));await page.locator('[data-tour-template]').selectOption('compare');await page.locator('[data-tour-add]').click();
 stop=page.locator('[data-tour-stop]').nth(1);await stop.locator('[data-tour-target="1"]').selectOption(JSON.stringify({siteId:'s',areaId:'a',recordId:'ginger'}));await stop.locator('[data-stop-field="directions"]').fill('Continue along the bed to the thyme.');
 await page.locator('[data-tour-add-target]').selectOption(JSON.stringify({siteId:'s',areaId:'a',recordId:'totem'}));await page.locator('[data-tour-template]').selectOption('record');await page.locator('[data-tour-add]').click();
 stop=page.locator('[data-tour-stop]').nth(2);await stop.locator('[data-stop-field="directions"]').fill('Return to the entrance Totem.');await stop.locator('summary').click();await stop.locator('[data-stop-field="facilitatorNotes"]').fill('PRIVATE FACILITATOR NOTE');
 await page.locator('[data-tour-check]').click();await page.getByRole('heading',{name:'Content checks passed'}).waitFor();
 await page.locator('[data-tour-save]').click();await page.locator('[data-tour-status]').filter({hasText:'Draft saved.'}).waitFor();
 await page.screenshot({path:'artifacts/tour-foundation-desktop-builder.png',fullPage:true});
 await page.reload();await page.locator('[data-tour-select] option').nth(1).waitFor({state:'attached'});const tourId=await page.locator('[data-tour-select] option').nth(1).getAttribute('value');await page.locator('[data-tour-select]').selectOption(tourId);assert.equal(await page.locator('[data-tour-stop]').count(),3);
 await page.locator('[data-tour-preview]').click();await page.locator('[data-next]').click();await page.locator('[data-answer]').fill('The two plants have different leaves.');await page.locator('[data-next]').click();await page.locator('[data-answer]').fill('My observation.');await page.locator('[data-next]').click();await page.getByRole('heading',{name:'You completed the tour.'}).waitFor();await page.getByRole('button',{name:'Close tour',exact:true}).click();
 assert.equal((await (await page.request.get(origin+'/xr-api/projects/garden/tours?view=visitor')).json()).tours.length,0);
 await page.locator('.tour-publication summary').click();await page.locator('[data-tour-publish]').click();await page.locator('[data-tour-status]').filter({hasText:'Tour published.'}).waitFor();
 const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobile=await mobileContext.newPage();mobile.on('pageerror',error=>errors.push(error.message));
 await mobile.goto(origin+`/xr/?tour=${tourId}&project=garden`,{waitUntil:'domcontentloaded'});await mobile.getByRole('heading',{name:'Ginger',exact:true}).waitFor();await mobile.locator('[data-next]').tap();await mobile.locator('[data-answer]').fill('Different leaf shapes.');await mobile.reload();await mobile.locator('[data-answer]').waitFor();assert.equal(await mobile.locator('[data-answer]').inputValue(),'Different leaf shapes.');
 const dimensions=await mobile.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(dimensions.content<=dimensions.viewport+1,JSON.stringify(dimensions));await mobile.screenshot({path:'artifacts/tour-foundation-mobile-player.png',fullPage:true});
 const packet=await (await page.request.get(origin+`/xr-api/projects/garden/tours/${tourId}?view=visitor`)).json();assert.doesNotMatch(JSON.stringify(packet),/PRIVATE|facilitatorNotes/);
 await mobile.locator('[data-next]').tap();await mobile.locator('[data-answer]').fill('Final observation.');await mobile.locator('[data-next]').tap();await mobile.getByRole('heading',{name:'You completed the tour.'}).waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({version:expectedVersion,featureClassification:'saved; edible filter passed',tour:'draft saved and reloaded; three templates; creator preview complete',publication:'draft hidden, explicit publication, facilitator notes excluded',mobile:'progress resumed; tour completed; no overflow',errors},null,2));
}catch(error){console.log(JSON.stringify({errors,body:await page?.locator('body').innerText().catch(()=>''),logs:logs.slice(-1000)},null,2));if(page)await page.screenshot({path:'artifacts/tour-foundation-error.png',fullPage:true}).catch(()=>{});throw error;}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));if(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(directory).startsWith('nl-tour-browser-'))fs.rmSync(directory,{recursive:true,force:true});}
