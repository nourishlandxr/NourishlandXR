import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {revision as version} from '../tools/assemble-website.mjs';
const candidate=process.argv.includes('--candidate'),live=process.argv.includes('--public'),label=candidate?'candidate':live?'live':'local',origin=candidate||live?'https://nourishland.org':process.env.NL_REVIEW_ORIGIN||'http://127.0.0.1:8015',folder='.tmp/discovery-focus-'+version,payload=path.resolve('root-site/releases/'+version+'/payload');
fs.mkdirSync(folder,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];
const shape=()=>[...document.querySelectorAll('.learning-orb,[data-education-choice]')].map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
const outline=()=>{const n=document.querySelector('[data-forest-wheel]'),r=n.getBoundingClientRect(),b=JSON.parse(n.dataset.wheelBounds);return{fill:+n.dataset.wheelFill,angle:+n.dataset.wheelAngle,view:n.dataset.wheelView,bounds:b,width:(b.right-b.left)*r.width/2,height:(b.top-b.bottom)*r.height/2};};
function fixed(before,after,label){for(let i=0;i<before.length;i++)for(const key of ['x','y','w','h'])assert(Math.abs(before[i][key]-after[i][key])<1,label+' moved '+i+' '+key+' '+JSON.stringify({before:before[i],after:after[i]}));}
function contained(s,label){assert(s.bounds.left>-.99&&s.bounds.right<.99&&s.bounds.top<.99&&s.bounds.bottom>-.99,label+' cropped artwork');}
try{
 for(const [device,viewport]of [['wide',{width:1886,height:850}],['desktop',{width:1440,height:900}],['tablet',{width:820,height:1180}],['phone',{width:390,height:844}],['compact',{width:375,height:667}]].filter(([device])=>!process.env.NL_REVIEW_DEVICES||process.env.NL_REVIEW_DEVICES.split(',').includes(device))){
  const context=await browser.newContext({viewport,isMobile:['phone','compact'].includes(device),hasTouch:['phone','compact'].includes(device)});
  if(candidate)await context.route(origin+'/**',async route=>{let name=new URL(route.request().url()).pathname;if(name.endsWith('/'))name+='index.html';const file=path.resolve(payload,'.'+name);if(file.startsWith(payload+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())await route.fulfill({body:fs.readFileSync(file),contentType:({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'})[path.extname(file)]||'application/octet-stream'});else await route.continue();});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(device+': '+e.message));
  await p.goto(origin+'/education/',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelector('#education').dataset.entrance==='ready');
  await p.evaluate(()=>document.fonts.ready);await p.locator('[data-open-orb]').click();await p.waitForTimeout(1200);await p.locator('[data-education-orb]').evaluate(async n=>{await Promise.all(n.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});const before=await p.evaluate(shape);
  for(const key of ['food-forests','immersive-learning','hillyards','collaborate']){
   await p.locator(`[data-education-choice="${key}"]`).click();
   const samples=await p.evaluate(async()=>{const read=()=>[...document.querySelectorAll('.learning-orb,[data-education-choice]')].map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}),rows=[];for(let i=0;i<18;i++){await new Promise(requestAnimationFrame);rows.push(read());}return rows;});for(const sample of samples)fixed(before,sample,device+' '+key);
   const panel=await p.locator('[data-education-summary]').boundingBox();assert(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=viewport.width+1&&panel.y+panel.height<=viewport.height+1);
   assert(await p.locator('[data-summary-more]').isVisible());
   if(key==='food-forests')await p.screenshot({path:folder+'/'+label+'-'+device+'-education-detail.png'});
   await p.locator('[data-close-education]').click();fixed(before,await p.evaluate(shape),device+' close');
  }
  await p.goto(origin+'/food-forests/',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelector('[data-forest-wheel]').dataset.wheelReady==='true',null,{timeout:60000});await p.waitForFunction(()=>document.querySelector('#food-forests').dataset.entrance==='ready');
  await p.locator('[data-forest-menu]').click();await p.waitForTimeout(700);const overview=await p.evaluate(outline);contained(overview,device+' overview');
  await p.locator('[data-forest-topic=story]').hover();await p.waitForTimeout(400);assert.equal((await p.evaluate(outline)).view,'overview');
  const choices=await p.locator('[data-forest-topic]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));
  for(const [key,href]of [['story','/food-forests/story/'],['guide','/food-forests/guide/'],['hillyards','/hillyards/']]){
   await p.locator(`[data-forest-topic=${key}]`).click();assert.equal(new URL(p.url()).pathname,'/food-forests/');
   await p.waitForFunction(()=>+document.querySelector('[data-forest-wheel]').dataset.wheelFill>.938);await p.waitForTimeout(1600);
   const close=await p.evaluate(outline);contained(close,device+' '+key);await p.screenshot({path:folder+'/'+label+'-'+device+'-'+key+'.png'});assert(Math.max(close.width,close.height)>Math.max(overview.width,overview.height)*1.08,device+' zoom is not visible '+JSON.stringify({overview,close}));
   const positions=await p.locator('[data-forest-topic]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));fixed(choices,positions,device+' wheel choices');
   assert.equal(await p.locator('[data-forest-more]').getAttribute('href'),href);assert.equal(await p.locator('[data-forest-topic][aria-expanded=true]').count(),1);
   const box=await p.locator('[data-forest-answer]').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1);
   assert(await p.locator('[data-forest-more]').evaluate(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.top>=b.top&&a.bottom<=b.bottom+1;}),'Continue action needs scrolling');
  }
  const angle=(await p.evaluate(outline)).angle;await p.waitForTimeout(500);assert((await p.evaluate(outline)).angle>angle,'Slow spin stopped');
  await p.keyboard.press('Escape');await p.waitForFunction(()=>+document.querySelector('[data-forest-wheel]').dataset.wheelFill<.642);contained(await p.evaluate(outline),device+' returned overview');assert(await p.locator('[data-forest-answer]').isHidden());
  await p.locator('[data-forest-topic=guide]').click();await p.locator('[data-forest-more]').click();await p.waitForFunction(()=>document.body.dataset.page==='food-forest-guide');assert.equal(new URL(p.url()).pathname,'/food-forests/guide/');
  results.push({device,orbAndCellsFixed:true,previewBeforeNavigation:true,visibleContainedZoom:true,choicesFixed:true,continuousSpin:true,escapeZoomsOut:true,continueWorks:true});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(folder+'/'+label+'.json',JSON.stringify({version,label,origin,results,errors,physicalPhone:false},null,2));console.log(JSON.stringify({version,label,results,errors},null,2));
}finally{await browser.close();}
