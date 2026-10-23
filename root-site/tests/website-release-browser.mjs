// Exercise the exact overlay before publishing, then repeat against public files.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const version=process.argv.find(a=>/^0\.[0-9]{4}$/.test(a))||'0.9789',live=process.argv.includes('--public'),local=process.argv.includes('--local');
const payload=path.resolve('root-site/releases',version,'payload'),origin=local?'http://127.0.0.1:8010':'https://nourishland.org',errors=[],results=[];
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
async function overlay(context){
 if(live||local)return;
 await context.route(origin+'/**',async route=>{
  let name=decodeURIComponent(new URL(route.request().url()).pathname);if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(payload,'.'+name);
  if(file.startsWith(payload+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())await route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});else await route.continue();
 });
}
async function motion(page,selector){
 const frames=await page.evaluate(selector=>new Promise(resolve=>{
  const start=performance.now(),frames=[],actor=document.querySelector('.journey-parent'),stage=document.querySelector('[data-totem-journey]');
  function sample(now){const matrix=new DOMMatrixReadOnly(getComputedStyle(actor).transform);frames.push({t:now-start,scale:matrix.a,x:matrix.e,state:stage.dataset.motion});if(now-start<1350||stage.dataset.motion!=='idle'&&now-start<8000)requestAnimationFrame(sample);else resolve(frames);}
  requestAnimationFrame(sample);document.querySelector(selector).click();
 }),selector);
 const intermediate=frames.filter(f=>f.scale>.31&&f.scale<.97);
 assert(intermediate.length>=8,'Totem snapped instead of showing intermediate movement frames');
 assert(intermediate[0].t<300,'First movement was delayed by preparation on the browser thread');
 const gaps=frames.slice(1).map((f,i)=>f.t-frames[i].t);const steps=frames.slice(1).map((f,i)=>Math.abs(f.scale-frames[i].scale));assert(Math.max(...steps)<.2,'Totem skipped a visible part of its journey');
 return {frames:frames.length,intermediate:intermediate.length,firstMovementMs:Math.round(intermediate[0].t),largestFrameGapMs:Math.round(Math.max(...gaps))};
}
async function screenFit(page,label){
 const outside=await page.evaluate(()=>[...document.querySelectorAll('[data-route]:not([hidden]) :is(button,a,h1,h2,h3,p)')].filter(e=>e.getClientRects().length&&!e.closest('[hidden],[inert],.sr-only,.story-portrait-idea,.story-hover-quote,.story-full-text')&&!e.matches('.sr-only,[aria-hidden=true]')).map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent.trim().slice(0,45),top:r.top,bottom:r.bottom,left:r.left,right:r.right};}).filter(r=>r.bottom>innerHeight+3||r.top< -3||r.left< -3||r.right>innerWidth+3));
 assert.deepEqual(outside,[],label+' has content outside its screen');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' has horizontal overflow');
}
try{
 for(const [name,viewport]of Object.entries({desktop:{width:1440,height:1000},phone:{width:390,height:844}})){
  const context=await browser.newContext({viewport,isMobile:name==='phone',hasTouch:name==='phone',reducedMotion:'no-preference'});
  await overlay(context);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
  const go=async name=>{await page.goto(origin+name+'?review=release-'+version,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-route]:not([hidden])')?.dataset.entrance==='ready',null,{timeout:60000});};
  await go('/');await page.waitForFunction(()=>{const v=document.querySelector('.nl-hero-video');return v?.autoplay&&!v.paused&&v.currentTime>.1;},null,{timeout:60000});
  assert.equal(await page.locator('[data-biome-hero] button,.nl-hero-controls').count(),0);
  assert(await page.locator('.nl-hero-video').evaluate(v=>v.muted&&v.playsInline&&v.loop&&!v.controls));
  await page.getByRole('button',{name:'Open menu',exact:true}).click();assert(await page.locator('.nl-hero-video').evaluate(v=>v.paused));
  await page.getByRole('button',{name:'Close menu',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.nl-hero-video').paused);
  await go('/education/');await page.waitForFunction(()=>!!document.querySelector('.knowledge-flower canvas'),null,{timeout:60000});
  assert.match(await page.locator('[data-site-version]').first().innerText(),new RegExp(version.replace('.','\\.')));
  await page.locator('[data-open-orb]').click();
  for(const key of ['food-forests','immersive-learning','hillyards','collaborate']){
   await page.locator('[data-education-choice='+key+']').click();await page.locator('[data-education-summary]').waitFor();await page.waitForTimeout(800);
   assert.equal(await page.locator('[data-summary-children]').count(),0);await screenFit(page,'Education '+key);
   const action=await page.locator('[data-summary-more]').evaluate(a=>{const r=a.getBoundingClientRect(),p=a.parentElement.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom+1;});assert(action,'Education primary action was clipped');
   assert(await page.locator('[data-education-summary]').evaluate(e=>getComputedStyle(e).backgroundImage.includes('gradient')));
   if(key==='hillyards')await page.screenshot({path:`artifacts/website-balloon-${version}-${live?'public':'candidate'}-${name}.png`});
   await page.getByRole('button',{name:'Close learning connection',exact:true}).click();await page.waitForTimeout(650);
  }
  await go('/platform/');await page.waitForFunction(()=>!!document.querySelector('.journey-parent')?.dataset.portraitStyle,null,{timeout:60000});
  const outward=await motion(page,'[data-journey-branch=creator]');
  assert(await page.locator('.journey-detail').isVisible());assert.match(await page.locator('[data-detail-copy]').innerText(),/Add plant knowledge/);
  assert.equal(await page.locator('.journey-parent [data-journey-branch=creator]').getAttribute('aria-label'),'Creator');
  const returnToOverview=await motion(page,'[data-journey-home]');
  await page.locator('[data-journey-branch=creator]').click();await page.waitForTimeout(180);await page.locator('[data-journey-branch=explorer]').click();
  await page.waitForFunction(()=>document.querySelector('[data-totem-journey]').dataset.motion==='idle'&&document.querySelector('.journey-child').dataset.portraitStyle==='organic');
  await page.locator('[data-journey-branch=creator]').click();await page.waitForFunction(()=>document.querySelector('[data-totem-journey]').dataset.motion==='idle'&&document.querySelector('.journey-child').dataset.portraitStyle==='botanical');
  assert.equal(await page.locator('[data-totem-journey]').getAttribute('data-connector-alive'),'true');
  assert.doesNotMatch(await page.locator('[data-totem-journey]').innerText(),/Choose Creator or Explorer|Inside Creator|Device demos/);
  await page.locator('[data-journey-item=field]').click();await page.locator('[data-detail-link]').click();await page.locator('.phone-preview[open]').waitFor();assert.equal(new URL(page.url()).pathname,'/platform/');
  await page.getByRole('button',{name:'Close phone preview',exact:true}).click();
  await go('/food-forests/');await page.waitForFunction(()=>document.querySelector('[data-forest-wheel]')?.dataset.wheelReady==='true',null,{timeout:60000});
  const initialAngle=await page.locator('[data-forest-wheel]').getAttribute('data-wheel-angle');await page.waitForTimeout(300);assert.notEqual(await page.locator('[data-forest-wheel]').getAttribute('data-wheel-angle'),initialAngle);
  assert.equal(await page.locator('[data-forest-wheel] canvas[tabindex]').count(),0);
  if(name==='desktop')await page.locator('[data-forest-menu]').hover();else await page.locator('[data-forest-menu]').tap();
  await page.waitForFunction(()=>document.querySelector('[data-forest-orbit]').dataset.menuOpen==='true');
  assert.equal(await page.locator('#food-forests h1').innerText(),'A new way to grow.');
  assert.deepEqual(await page.locator('.forest-connections a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))),['/food-forests/story/','/food-forests/guide/','/hillyards/']);
  assert.equal(await page.locator('.forest-entry-guide svg').count(),1);
  await page.waitForTimeout(700);await screenFit(page,'Food Forests introduction');
  await page.screenshot({path:`artifacts/website-wheel-${version}-${live?'public':'candidate'}-${name}.png`});
  await page.locator('.forest-entry-guide').click();await page.waitForFunction(()=>document.body.dataset.page==='food-forest-guide');
  await go('/food-forests/story/');if(name==='desktop')await page.locator('[data-story-tab="1"]').click();else await page.locator('[data-story-select]').selectOption('1');await page.waitForTimeout(250);
  await page.locator('#story-chapter-2 img').evaluate(image=>image.decode());
  if(name==='desktop')await page.locator('#story-chapter-2 figure').hover();else await page.locator('#story-chapter-2 .story-full-text').focus();
  if(name==='desktop')assert.equal(await page.locator('#story-chapter-2').getAttribute('data-idea-highlighted'),'true');
  assert.equal(await page.locator('#food-forest-story .story-portrait-toggle').count(),0);
  assert.equal(await page.locator('#food-forest-story .story-portrait-idea').count(),0);
  assert(await page.locator('#story-chapter-2 .story-full-text').isVisible());
  assert.equal(await page.locator('#story-chapter-2 figure').evaluate(e=>getComputedStyle(e).borderTopLeftRadius),'4px');
  await screenFit(page,'Food forest story');
  await page.screenshot({path:`artifacts/website-story-${version}-${live?'public':'candidate'}-${name}.png`});
  await go('/food-forests/guide/');for(const key of ['system','layers','decisions','people','system']){await page.locator(`[data-guide-view=${key}]`).click();assert(await page.locator(`[data-guide-scene=${key}]`).isVisible());await screenFit(page,'Guide '+key);}
  assert((await page.locator('[data-system-topic]').allTextContents()).every(text=>text===''));
  await page.locator('[data-system-topic="2"]').click();assert.equal(await page.locator('[data-system-title]:not(button)').innerText(),'Flowers and pollinators');
  await page.locator('[data-guide-view=layers]').click();
  for(const key of ['canopy','primary','shrub','herbaceous','surface','root','climber']){
   const button=page.locator(`[data-guide-layer=${key}]`);if(name==='desktop')await button.hover();else await button.tap();
   assert.equal(await button.getAttribute('aria-selected'),'true');assert((await page.locator('[data-layer-copy]').innerText()).length>35);await screenFit(page,'Layer '+key);
  }
  await page.locator('[data-guide-view=decisions]').click();
  for(const key of ['efficient','productive','ornamental','blend']){await page.locator(`[data-design-choice=${key}]`).click();assert.equal(await page.locator('[data-design-triangle]').getAttribute('data-design'),key);await screenFit(page,'Design '+key);}
  await page.locator('[data-guide-view=people]').click();
  for(const key of ['rest','connect','discover']){await page.locator(`[data-people-choice=${key}]`).click();assert.equal(await page.locator('[data-people-picture]').getAttribute('data-focus'),key);await screenFit(page,'People '+key);}
  await go('/places/');await page.waitForFunction(()=>document.querySelector('#places [data-places-showcase]')?.dataset.placeReady==='true',null,{timeout:60000});
  await page.locator('#places [data-place-step="1"]').click();await page.waitForFunction(()=>document.querySelector('#places [data-places-showcase]').dataset.place==='uki'&&document.querySelector('#places [data-places-showcase]').dataset.placeReady==='true');
  await go('/collaborate/');await page.waitForFunction(()=>document.querySelector('[data-discovery-die]')?.dataset.ready==='true',null,{timeout:60000});
  await page.locator('[data-partner=educator]').click();assert.match(await page.locator('[data-partner-answer]').innerText(),/learning experience/);
  await screenFit(page,'Collaborate');for(const route of ['/about/','/contact/','/hillyards/','/immersive-learning/']){await go(route);await screenFit(page,route);}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`artifacts/website-release-${version}-${live?'public':'candidate'}-${name}.png`});
  results.push({name,heroAutoplay:true,noHeroControls:true,educationBalloon:true,totemJourney:true,outward,returnToOverview,rapidSwitch:true,phonePreview:true,wheelAutospin:true,wheelHoverOrTapMenu:true,threeIntroDestinations:true,storyHoverReveal:true,rectangularPortraits:true,unobscuredSystem:true,fourGuideScenes:true,layerPicture:true,designTriangle:true,peopleExperience:true,singleScreen:true,places:true,die:true,version:true});await context.close();
 }
 const accessible=await browser.newContext({reducedMotion:'reduce'});await overlay(accessible);const still=await accessible.newPage();still.on('pageerror',e=>errors.push(e.message));
 await still.goto(origin+'/?review=release-'+version);await still.waitForFunction(()=>window.nourishlandBiomeHero?.metrics.reducedMotion);
 assert.equal(await still.locator('.nl-hero-video,[data-biome-hero] button').count(),0);assert(await still.locator('.nl-video-poster').evaluate(i=>i.complete&&i.naturalWidth>0));
 await accessible.close();
 const unavailablePoster=await browser.newContext({reducedMotion:'no-preference'});await overlay(unavailablePoster);await unavailablePoster.route('**/hero-clean-hq/*poster*',r=>r.abort());
 const autoplay=await unavailablePoster.newPage();autoplay.on('pageerror',e=>errors.push(e.message));await autoplay.goto(origin+'/?review=release-'+version);
 await autoplay.waitForFunction(()=>{const v=document.querySelector('.nl-hero-video');return v&&!v.paused&&v.currentTime>.1;},null,{timeout:60000});await unavailablePoster.close();
 assert.deepEqual(errors,[]);
 const result={version,public:live,results,reducedMotion:true,autoplayWithoutPoster:true,errors,physicalDevice:false,heroCrevice:'Known issue: retained video predates food-area repair'};
 fs.writeFileSync(`artifacts/website-release-${version}-${live?'public':'candidate'}.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
