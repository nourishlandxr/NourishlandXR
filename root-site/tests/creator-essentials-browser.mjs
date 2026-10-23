import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {PIGEON_PEA_PIM} from '../../app/services/pigeonPeaPim.js';
import {revision as version} from '../tools/assemble-website.mjs';
const live=process.argv.includes('--public'),candidate=process.argv.includes('--candidate'),origin=live||candidate?'https://nourishland.org':'http://127.0.0.1:8010';
const label=live?'live':candidate?'candidate':'local',folder=`.tmp/creator-${version}`,payload=path.resolve(`root-site/releases/${version}/payload`),errors=[],results=[];
fs.mkdirSync(folder,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
const android='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const types={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
async function context(options={}){
 const c=await browser.newContext(options);
 if(candidate)await c.route(origin+'/**',async route=>{let name=new URL(route.request().url()).pathname;if(name.endsWith('/'))name+='index.html';const file=path.resolve(payload,'.'+name);if(file.startsWith(payload+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())await route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});else await route.continue();});
 return c;
}
async function inspect(page,name){page.on('pageerror',error=>errors.push(name+': '+error.message));}
try{
 for(const [name,viewport]of [['desktop',{width:1440,height:900}],['phone',{width:390,height:844}]]){
  const c=await context({viewport,isMobile:name==='phone',hasTouch:name==='phone',...(name==='phone'?{userAgent:android,deviceScaleFactor:2}:{})}),p=await c.newPage();await inspect(p,name);
  await p.goto(origin+'/hillyards/?review=animations-'+version,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>{const host=document.querySelector('[data-hillyards-animations]'),v=host?.querySelector('video');return host?.dataset.playback==='playing'&&v&&!v.paused&&v.currentTime>.2;},null,{timeout:90000});
  assert.equal(await p.locator('[data-hillyards-animations] video[controls]').count(),0);assert.equal(await p.locator('[data-play-hillyards]').count(),0);
  const frame=await p.locator('[data-hillyards-animations]').boundingBox();assert(Math.abs(frame.width/frame.height-16/9)<.03,'Animation frame must retain its landscape proportions');
  await p.screenshot({path:`${folder}/${label}-hillyards-${name}.png`});
  await p.locator('[data-hillyards-animations] video').first().evaluate(video=>video.dispatchEvent(new Event('ended')));
  await p.waitForFunction(()=>{const h=document.querySelector('[data-hillyards-animations]'),v=h?.querySelectorAll('video')[1];return h?.dataset.animation==='1'&&v&&!v.paused&&v.currentTime>.1;},null,{timeout:60000});
  await p.locator('.menu-toggle').click();await p.waitForFunction(()=>[...document.querySelectorAll('[data-hillyards-animations] video')].every(v=>v.paused));await p.locator('.menu-toggle').click();
  await p.locator('.header-pathways a[href="/education/"]').click();await p.waitForFunction(()=>document.body.dataset.page==='education');assert(await p.locator('[data-hillyards-animations] video').evaluateAll(videos=>videos.every(v=>v.paused)));
  await p.goto(origin+'/demos/?tool=pimo',{waitUntil:'domcontentloaded'});await p.locator('[data-cell="uses"]').waitFor();assert.equal(await p.locator('[data-cell]').count(),7);
  await p.locator('[data-cell="uses"]').click();const body=p.locator('[data-inspector] [data-field=body]');await body.fill('A field observation added in the honeycomb editor.');await body.press('Tab');
  await p.locator('[data-action=preview]').click();const preview=p.getByRole('dialog',{name:'Preview your PIMO'});await preview.waitFor();await p.waitForFunction(()=>getComputedStyle(document.querySelector('.pimo-reader-preview')).backgroundColor==='rgb(238, 234, 222)');await preview.locator('[data-preview-node=uses]').click();await preview.locator('[data-preview-reading]').getByText('A field observation added in the honeycomb editor.',{exact:true}).waitFor();
  assert.equal(await preview.locator('[data-preview-families] button').count(),6);await p.screenshot({path:`${folder}/${label}-pimo-${name}.png`});
  await preview.getByRole('button',{name:'Close preview',exact:true}).click();assert.equal(await body.inputValue(),'A field observation added in the honeycomb editor.');
  await p.locator('[data-action=delete-cell]').click();assert.equal(await p.locator('[data-cell]').count(),7);
  results.push({device:name,hillyardsAutoplay:true,automaticSceneChange:true,pausesOffPage:true,originalHoneycomb:true,previewShowsEdits:true,coreProtected:true});await c.close();
 }
 // All project requests below are fixtures. No real project is read or written.
 for(const linkedDevice of ['desktop','phone']){
 const c=await context(linkedDevice==='phone'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:android,deviceScaleFactor:2}:{viewport:{width:1440,height:1000}}),p=await c.newPage();await inspect(p,'linked plant '+linkedDevice);let writes=[];
 const marker={id:'qa-plant',name:'QA pigeon pea',type:'plant',plantId:'qa-plant',modified:'marker-revision-1'},profile={revision:12,common_name:'QA pigeon pea',pim_document:structuredClone(PIGEON_PEA_PIM)};
 await c.route(origin+'/xr-api/**',async route=>{
  const u=new URL(route.request().url()),name=u.pathname;let data;
  if(name.includes('/workspace-record/')){const body=route.request().postDataJSON();writes.push(body);if(writes.length===2){await route.fulfill({status:409,json:{error:'The plant changed in another editor. Reload before saving.'}});return;}data={marker:{...marker,modified:'marker-revision-2'},profile:{...profile,revision:13,...body.profileChanges},placeId:'qa-area'};}
  else if(name.endsWith('/auth/session'))data={authenticated:true,identity:{status:'approved',creatorEnabled:true}};
  else if(name.endsWith('/plant-profile'))data=profile;
  else if(name.endsWith('/markers'))data=[marker];
  else if(name.endsWith('/places'))data=[{id:'qa-area',name:'QA area'}];
  else if(name.endsWith('/sites'))data=[{id:'qa-site',name:'QA site'}];
  else if(name.endsWith('/projects/qa-project'))data={id:'qa-project',name:'QA project'};
  else {await route.fulfill({status:404,json:{error:'Unknown fixture endpoint'}});return;}
  await route.fulfill({json:data});
 });
 await p.goto(origin+'/creator/?editor=pimo&project=qa-project&workspace=desktop&site=qa-site&record=qa-site%2Fqa-area%2Fqa-plant',{waitUntil:'domcontentloaded'});
 await p.locator('[data-cell="uses"]').waitFor({timeout:60000});assert.equal(await p.locator('[data-cell]').count(),7,'A plant must open as the original flower, not an exploded tree');assert.equal(writes.length,0,'Opening an editor must not write a project');assert(await p.locator('[data-action=save-project]').isDisabled());
 await p.locator('[data-cell="uses"]').click();await p.locator('[data-inspector] [data-field=body]').fill('A saved plant draft.');await p.locator('[data-inspector] [data-field=body]').press('Tab');await p.locator('[data-action=save-project]').click();await p.waitForFunction(()=>document.querySelector('[data-status]')?.textContent.includes('Saved to the plant'));
 assert.equal(writes.length,1);assert.equal(writes[0].expectedProfileRevision,12);const saved=writes[0].profileChanges.pim_document;assert.equal(saved.nodes.find(n=>n.id==='uses').body,'A saved plant draft.');assert.equal(saved.nodes.find(n=>n.id==='uses').status,'draft');assert.equal(saved.nodes.length,PIGEON_PEA_PIM.nodes.length);
 await p.locator('[data-inspector] [data-field=body]').fill('Keep this draft if saving conflicts.');await p.locator('[data-inspector] [data-field=body]').press('Tab');await p.locator('[data-action=save-project]').click();await p.waitForFunction(()=>document.querySelector('[data-status]')?.textContent.includes('changed in another editor'));assert.equal(await p.locator('[data-inspector] [data-field=body]').inputValue(),'Keep this draft if saving conflicts.');
 assert.equal(writes[1].expectedProfileRevision,13);await p.screenshot({path:`${folder}/${label}-linked-${linkedDevice}.png`});results.push({device:linkedDevice,linkedPlant:true,saveIsExplicit:true,originalIdsPreserved:true,editedTopicsAreDrafts:true,conflictRetainsWork:true});await c.close();
 }
 assert.deepEqual(errors,[]);const result={version,label,results,errors,physicalXR:false};fs.writeFileSync(`${folder}/${label}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error);throw error;}finally{await browser.close();}
