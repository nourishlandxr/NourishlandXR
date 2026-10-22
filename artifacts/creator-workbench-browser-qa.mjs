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
 await page.goto(origin+'/xr/');await page.locator('.welcome-version-badge').waitFor({timeout:60000});assert.match(await page.locator('.welcome-version-badge').textContent(),new RegExp('V'+expectedVersion.replaceAll('.','\\.')));await page.screenshot({path:'artifacts/creator-workbench-welcome.png'});
 let releaseAuth;
 await page.route('**/xr-api/auth/session',async route=>{await new Promise(resolve=>{releaseAuth=resolve;});await route.continue();});
 const opening=page.goto(origin+'/xr/?workspace=desktop&project=garden&site=s',{waitUntil:'domcontentloaded'});
 await page.locator('.creator-loading-orbit img').waitFor();
 await page.locator('.creator-loading-orbit img').evaluate(img=>img.decode());
 assert.notEqual(await page.locator('.creator-loading-ring').first().evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.screenshot({path:'artifacts/creator-workbench-loading.png',animations:'disabled'});
 assert(releaseAuth,'Loading did not request authentication');releaseAuth();await opening;await page.unroute('**/xr-api/auth/session');
 await page.locator('[data-hub-tool]').first().waitFor();
 await page.locator('.hub-hero-logo img').evaluate(img=>img.decode());
 assert.equal(await page.locator('button[data-hub-tool]').count(),6);
 await page.getByRole('link',{name:'Android Field',exact:true}).focus();
 assert.equal(await page.locator('[aria-label="Android Field"] .workspace-control-hint').evaluate(el=>getComputedStyle(el).visibility),'visible');
 await page.locator('[data-hub-tool=content]').focus();
 assert.match(await page.locator('[data-hub-command-hint]').textContent(),/knowledge/);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.hub-hero-logo').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
assert.equal(await page.locator('[data-hub-tool]').count(),6);const contrast=await page.locator('button.hub-tool').first().evaluate(button=>{
 const fg=getComputedStyle(button.querySelector('strong')).color.match(/[0-9.]+/g).slice(0,3).map(Number);
 const bgs=[...getComputedStyle(button).backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)].map(m=>m[1].split(',').slice(0,3).map(Number));
 const l=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
 return Math.min(...bgs.map(bg=>(Math.max(l(fg),l(bg))+.05)/(Math.min(l(fg),l(bg))+.05)));
 });assert(contrast>=4.5,'Creator tool labels fail normal text contrast');
 await page.screenshot({path:'artifacts/creator-workbench-desktop.png',fullPage:true,animations:'disabled'});
 await page.locator('[data-hub-tool=content]').press('Enter');await page.locator('.hub-tool-links a').first().waitFor();assert.equal(await page.locator('.hub-tool-links a').count(),3);await page.getByRole('link',{name:/^PIMO canvas/}).click();await page.locator('[data-cell]').first().waitFor();assert.equal(new URL(page.url()).searchParams.get('project'),'garden');assert.match(await page.locator('.pimo-project-context').textContent(),/not attached/);await page.locator('.pimo-context-line a').click();assert.match(page.url(),/view=content/);

 // Test real navigation with a selected record, dirty changes and saved data.
 await page.goto(origin+'/xr/?workspace=desktop&project=garden&site=s&view=records');
 await page.locator('[data-record="s/a/ginger"]').click();await page.locator('[data-record-form]').waitFor();
 assert.equal(await page.locator('.creator-tool-nav a').count(),6);
 assert.equal(await page.locator('.creator-tool-nav [aria-current=page]').getAttribute('data-creator-tool'),'records');
 for(const href of await page.locator('.creator-tool-nav a').evaluateAll(links=>links.map(a=>a.href))){const u=new URL(href);assert.equal(u.searchParams.get('record'),'s/a/ginger');assert.equal(u.searchParams.get('site'),'s');}
 await page.locator('[name=overview]').fill('A saved observation from the modern Creator workbench.');
 await page.locator('[data-creator-tool=paths]').click();assert.match(page.url(),/view=records/);assert.match(await page.locator('[data-status]').textContent(),/Save or discard/);
 await page.locator('[data-record-form] [type=submit]').click();await page.locator('[data-save-status]').filter({hasText:'Saved'}).waitFor();
 assert.equal(await page.locator('[data-creator-workbench]').count(),1);await page.screenshot({path:'artifacts/creator-workbench-records.png',fullPage:true});
 await page.locator('[data-creator-tool=content]').click();await page.locator('.hub-tool-links').waitFor();await page.screenshot({path:'artifacts/creator-workbench-content.png',fullPage:true});
 await page.getByRole('link',{name:/^Project knowledge/}).click();await page.locator('[data-topic]').waitFor();await page.screenshot({path:'artifacts/creator-workbench-knowledge.png',fullPage:true});
 await page.locator('[data-creator-tool=map-tools]').click();await page.locator('.hub-tool-links').waitFor();await page.screenshot({path:'artifacts/creator-workbench-map-menu.png',fullPage:true});
 await page.getByRole('link',{name:/^Site plan/}).click();await page.locator('[data-plan]').waitFor();await page.screenshot({path:'artifacts/creator-workbench-site-plan.png',fullPage:true});
 await page.locator('[data-creator-tool=paths]').click();await page.locator('[data-tour-new]').waitFor();await page.screenshot({path:'artifacts/creator-workbench-paths.png',fullPage:true});
 await page.locator('[data-creator-tool=project-tools]').click();await page.locator('[data-hub-action=settings]').click();await page.locator('.creator-settings #projectSettingsName').waitFor({timeout:60000});
 assert.equal(await page.locator('.creator-tool-nav a').count(),6);await page.screenshot({path:'artifacts/creator-workbench-settings.png'});
 await page.evaluate(async()=>{const {renderPlatformHome}=await import('/xr/screens/projectDashboard.js');await renderPlatformHome(document.getElementById('app'));});await page.locator('.creator-project-menu').waitFor();await page.screenshot({path:'artifacts/creator-workbench-projects.png',fullPage:true});
 await page.locator('.create-project-action').click();await page.locator('.creator-project-form').waitFor();await page.screenshot({path:'artifacts/creator-workbench-create.png',fullPage:true});
 await page.goto(origin+'/xr/?workspace=desktop&project=empty&onboarding=1&step=project-identity');await page.locator('.cpt-step-panel [name=name]').waitFor();await page.screenshot({path:'artifacts/creator-workbench-setup.png',fullPage:true});
 const ratio=await page.locator('.cpt-header h1').evaluate(el=>{const rgb=s=>s.match(/[0-9.]+/g).slice(0,3).map(Number),lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);const a=lum(rgb(getComputedStyle(el).color)),b=lum(rgb(getComputedStyle(el.parentElement).backgroundColor));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});assert(ratio>=4.5,'Setup title contrast');
 await page.goto(origin+'/xr/?workspace=desktop&project=garden&site=s&view=content');await page.locator('.hub-tool-links').waitFor();
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'});
 await phone.addInitScript(()=>{window.xrSessionRequests=0;Object.defineProperty(navigator,'xr',{value:{isSessionSupported:async()=>true,requestSession:async()=>{window.xrSessionRequests++;throw Error('No synthetic session');}},configurable:true});});
 const mobile=await phone.newPage();mobile.on('pageerror',error=>errors.push(error.message));
 await mobile.goto(origin+'/xr/?workspace=field&project=garden&site=s');await mobile.locator('[data-hub-tool]').first().waitFor();assert.equal(await mobile.locator('[data-hub-tool]').count(),6);await mobile.screenshot({path:'artifacts/creator-workbench-phone.png',fullPage:true});await mobile.setViewportSize({width:320,height:740});assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));await mobile.screenshot({path:'artifacts/creator-workbench-phone-320.png',fullPage:true});await mobile.setViewportSize({width:390,height:844});
 await mobile.locator('[data-hub-tool=content]').tap();await mobile.locator('.hub-tool-links a').first().waitFor();assert.equal(await mobile.locator('.hub-tool-links a').count(),2);await mobile.getByRole('link',{name:/^PIMO canvas/}).tap();await mobile.locator('[data-cell]').first().waitFor();assert.equal(await mobile.locator('[data-action=spatial]').count(),0);assert.equal(await mobile.evaluate(()=>window.xrSessionRequests),0);assert(await mobile.locator('.pimo-workspace').evaluate(el=>el.getBoundingClientRect().width<=innerWidth));assert(await mobile.locator('.pimo-tools').evaluate(el=>el.getBoundingClientRect().left>=0 && el.getBoundingClientRect().right<=innerWidth));await mobile.screenshot({path:'artifacts/creator-workbench-phone-pimo.png'});
 await mobile.goto(origin+'/xr/?editor=pimo&mode=xr&workspace=field&project=garden&site=s');await mobile.locator('[data-cell]').first().waitFor();assert.equal(await mobile.locator('.pimo-spatial,[data-action=spatial]').count(),0);assert.equal(await mobile.evaluate(()=>window.xrSessionRequests),0);
 await mobile.goto(origin+'/xr/?workspace=field&project=garden&site=s&view=paths');await mobile.locator('[data-tour-new]').waitFor();await mobile.locator('[data-tour-new]').tap();await mobile.locator('[data-tour-field=title]').fill('Observe the herb bed');
 await mobile.locator('[data-creator-hub-link]').tap();assert.match(page.url(),/view=content/);assert.match(mobile.url(),/view=paths/);assert.match(await mobile.locator('[data-hub-status]').textContent(),/Save or discard/);
 await mobile.locator('[data-tour-add-target]').selectOption(JSON.stringify({siteId:'s',areaId:'a',recordId:'ginger'}));await mobile.locator('[data-tour-add]').tap();await mobile.locator('[data-stop-field=directions]').fill('Start at the ginger bed.');
 await mobile.locator('[data-tour-save]').tap();await mobile.locator('[data-tour-status]').filter({hasText:'Draft saved.'}).waitFor();await mobile.screenshot({path:'artifacts/creator-workbench-phone-paths.png',fullPage:true});
 await mobile.reload();await mobile.locator('[data-tour-select] option').nth(1).waitFor({state:'attached'});await mobile.locator('[data-tour-select]').selectOption(await mobile.locator('[data-tour-select] option').nth(1).getAttribute('value'));assert.equal(await mobile.locator('[data-tour-stop]').count(),1);
 await mobile.locator('[data-creator-hub-link]').tap();await mobile.locator('[data-hub-tool=records]').waitFor();await mobile.locator('[data-hub-tool=records]').tap();await mobile.locator('[data-record="s/a/ginger"]').tap();await mobile.locator('[data-record-form]').waitFor();await mobile.screenshot({path:'artifacts/creator-workbench-phone-record.png',fullPage:true});
 for(const view of ['hub','content','paths','records','map-tools','preview-tools','project-tools','work','capture','project','map','knowledge','placement']){await mobile.goto(origin+`/xr/?workspace=field&project=garden&site=s&view=${view}`);await mobile.locator('[data-creator-hub-link]').waitFor();const size=await mobile.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert(size.scroll<=size.client,`Phone overflow in ${view}: ${JSON.stringify(size)}`);}

 await mobile.goto(origin+'/xr/?workspace=field&project=garden&site=s&view=work');await mobile.locator('.field-launcher').waitFor();await mobile.screenshot({path:'artifacts/creator-workbench-field-work.png',fullPage:true});await mobile.getByRole('link',{name:'Desktop Studio',exact:true}).click();await mobile.locator('.field-launcher').waitFor();assert.equal(new URL(mobile.url()).searchParams.get('workspace'),'desktop');assert.equal(new URL(mobile.url()).searchParams.get('view'),'work');assert.equal(await mobile.getByRole('link',{name:'Desktop Studio',exact:true}).getAttribute('aria-current'),'page');
 await mobile.goto(origin+'/xr/?workspace=field&project=empty&onboarding=1&step=project-identity');await mobile.locator('.cpt-step-panel [name=name]').waitFor();assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:'artifacts/creator-workbench-phone-setup.png',fullPage:true});
 for (const width of [320,390,768]) {await mobile.setViewportSize({width,height:844});await mobile.goto(origin+'/xr/?workspace=field&project=garden&site=s&view=records&record=s%2Fa%2Fginger');await mobile.locator('[data-record-form]').waitFor();assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Record editor overflows at '+width);assert(await mobile.locator('.studio-inspector').evaluate(e=>e.getBoundingClientRect().top<document.querySelector('.studio-main').getBoundingClientRect().top));}
 await mobile.setViewportSize({width:390,height:844});
 await mobile.goto(origin+'/xr/?workspace=field&project=empty');await mobile.locator('[data-hub-tool=records]').tap();await mobile.getByRole('button',{name:'+ Add Area',exact:true}).waitFor();
 const headset=await browser.newContext({viewport:{width:1024,height:900},userAgent:'Mozilla/5.0 (Linux; Android 12; Quest 3) OculusBrowser/35.0'}),xr=await headset.newPage();xr.on('pageerror',error=>errors.push(error.message));await xr.goto(origin+'/xr/?workspace=spatial&project=garden&site=s');await xr.locator('[data-hub-tool]').first().waitFor();assert.equal(await xr.locator('[data-hub-tool]').count(),6);await xr.screenshot({path:'artifacts/creator-workbench-headset-browser.png',fullPage:true});await xr.locator('[data-hub-tool=content]').click();await xr.locator('.hub-tool-links a').first().waitFor();assert.equal(await xr.locator('.hub-tool-links a').count(),3);
 await xr.goto(origin+'/xr/_hub-menu-fixture');await xr.locator('[data-xr-tool=records]').waitFor();await xr.locator('.creator-brand-mark img').evaluate(img=>img.decode());await xr.screenshot({path:'artifacts/creator-workbench-xr-menu.png',fullPage:true});
 await xr.locator('[data-xr-tool=project-tools]').click();await xr.locator('[data-xr-screen=project-tools]').click();assert.deepEqual(await xr.evaluate(()=>window.fixtureActions),[]);await xr.locator('[data-xr-action=leave]').click();assert.deepEqual(await xr.evaluate(()=>window.fixtureActions),['project-tools']);
 await xr.locator('[data-xr-action=back]').click();await xr.locator('[data-xr-tool=records]').click();await xr.screenshot({path:'artifacts/creator-workbench-xr-objects.png'});await xr.locator('[data-inspect=ginger]').click();await xr.locator('[data-xr-action=back]').click();assert.deepEqual(await xr.evaluate(()=>window.fixtureActions),['project-tools','ginger']);assert.equal(await xr.locator('[data-xr-tool]').count(),6);
 assert.deepEqual(errors,[]);const result={version:expectedVersion,desktop:'records save, dirty cross-tool navigation guard, selected record context, knowledge, site plan, paths, settings, projects and creation checked',phone:'touch editor; no spatial PIMO even with navigator.xr/direct XR URL; six tool groups',paths:'mobile draft saved/reopened; unsaved navigation blocked',responsive:'13 routes fit at 390px; record inspector fits at 320, 390 and 768px',headset:'browser hub and XR menu callback fixture passed',welcomeVersion:true,logoLoading:'real auth wait; decoded original logo; animated orbit',menu:'six keyboard-operable buttons; icon focus labels',reducedMotion:'animation disabled',physicalXR:false,errors};fs.writeFileSync('artifacts/creator-workbench-browser-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){console.log(JSON.stringify({errors,body:await page?.locator('body').innerText().catch(()=>''),logs:logs.slice(-1200)},null,2));throw error;}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));if(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(directory).startsWith('nl-hub-browser-'))fs.rmSync(directory,{recursive:true,force:true});}
