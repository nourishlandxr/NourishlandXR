import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {revision as version} from '../tools/assemble-website.mjs';
const candidate=process.argv.includes('--candidate'),live=process.argv.includes('--public'),label=candidate?'candidate':live?'live':'local',origin=candidate||live?'https://nourishland.org':process.env.NL_REVIEW_ORIGIN||'http://127.0.0.1:8017',folder='.tmp/expert-quotes-'+version,payload=path.resolve('root-site/releases/'+version+'/payload');fs.mkdirSync(folder,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
 for(const [device,viewport]of [['desktop',{width:1440,height:900}],['short-laptop',{width:1365,height:640}],['phone',{width:390,height:844}],['compact',{width:375,height:667}]]){
  const touch=viewport.width<700,c=await b.newContext({viewport,isMobile:touch,hasTouch:touch});
  if(candidate)await c.route(origin+'/**',async route=>{let n=new URL(route.request().url()).pathname;if(n.endsWith('/'))n+='index.html';const f=path.resolve(payload,'.'+n);if(f.startsWith(payload+path.sep)&&fs.existsSync(f)&&fs.statSync(f).isFile())await route.fulfill({body:fs.readFileSync(f),contentType:({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});else await route.continue();});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(device+': '+e.message));await p.goto(origin+'/food-forests/story/?review=quotes-'+version);await p.waitForFunction(()=>document.querySelector('#food-forest-story').dataset.entrance==='ready');
  assert.equal(await p.locator('.story-photo-quote').count(),5);assert.equal(await p.locator('.story-hover-quote').count(),0);
  for(let i=1;i<=5;i++){
   if(touch)await p.locator('[data-story-select]').selectOption(String(i));else await p.locator(`[data-story-tab="${i}"]`).click();
   const chapter=p.locator('#story-chapter-'+(i+1)),figure=chapter.locator('figure'),caption=figure.locator('.story-photo-quote');await figure.locator('img').evaluate(i=>i.decode());await p.waitForTimeout(120);
   if(touch)await figure.tap();else await figure.hover();await p.waitForTimeout(750);
   assert.equal(await figure.getAttribute('aria-expanded'),'true');assert.equal(await caption.getAttribute('aria-hidden'),'false');
   const measured=await chapter.evaluate(n=>{const f=n.querySelector('figure'),q=f.querySelector('blockquote'),r=f.getBoundingClientRect(),image=f.querySelector('img');return{name:n.querySelector('.story-person').textContent,clone:q.textContent,original:n.querySelector('.story-full-text blockquote').textContent,leftOpacity:getComputedStyle(n.querySelector('.story-full-text')).opacity,pictureRatio:r.width/r.height,naturalRatio:image.naturalWidth/image.naturalHeight,font:parseFloat(getComputedStyle(q.querySelector('p')).fontSize),picture:r.toJSON(),parts:[...q.children].map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON()}))};});
   assert.equal(measured.clone,measured.original);assert.equal(measured.leftOpacity,'1');assert(Math.abs(measured.pictureRatio-measured.naturalRatio)<.015);assert(measured.font>=14);
   const placement=await caption.evaluate(e=>{const r=e.getBoundingClientRect(),f=e.parentElement.getBoundingClientRect(),style=getComputedStyle(e);e.scrollTop=e.scrollHeight;const last=e.querySelector('small').getBoundingClientRect();const reachable=last.bottom<=r.bottom+2;e.scrollTop=0;return {transparent:style.backgroundColor==='rgba(0, 0, 0, 0)'&&style.backgroundImage==='none',besidePerson:r.width<=f.width*.49,inside:r.left>=f.left&&r.right<=f.right&&r.top>=f.top&&r.bottom<=f.bottom,reachable};});
   assert(placement.transparent&&placement.besidePerson&&placement.inside&&placement.reachable,device+' transparent quote placement '+JSON.stringify(placement));
   await p.screenshot({path:folder+'/'+label+'-'+device+'-'+i+'.png'});
   if(touch)await figure.tap();else await p.mouse.move(0,0);await p.waitForTimeout(600);assert.equal(await figure.getAttribute('aria-expanded'),'false');
   if(!touch){await figure.focus();assert.equal(await figure.getAttribute('aria-expanded'),'true');await p.keyboard.press('Escape');assert.equal(await figure.getAttribute('aria-expanded'),'false');}
   results.push({device,expert:measured.name,quoteOnPhoto:true,quoteAndAttributionComplete:true,rectangularPhoto:true,leftStoryVisible:true,interactionCloses:true});
  }
  await c.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(folder+'/'+label+'.json',JSON.stringify({version,label,results,errors,physicalPhone:false},null,2));console.log(JSON.stringify({version,label,checks:results.length,results,errors},null,2));
}finally{await b.close();}
