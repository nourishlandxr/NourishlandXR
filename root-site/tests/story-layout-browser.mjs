// Regression coverage for the crowded short-screen story layout.
import {revision} from '../tools/assemble-website.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const version=process.argv.find(a=>/^0\.[0-9]{4}$/.test(a))||revision,origin=process.argv.includes('--public')?'https://nourishland.org':'http://127.0.0.1:8010';
const folder='.tmp/story-layout-'+version;fs.mkdirSync(folder,{recursive:true});const b=await chromium.launch({channel:'chrome',headless:true});const errors=[],results=[];
try{
 for(const [name,viewport,scale] of [['wide',{width:1894,height:836},1],['screenshot-scale',{width:1263,height:557},1.5],['desktop',{width:1440,height:1000},1],['short-laptop',{width:1365,height:640},1],['tablet',{width:820,height:1180},1],['phone',{width:390,height:844},1],['compact',{width:375,height:667},1]]){
  const context=await b.newContext({viewport,deviceScaleFactor:scale,isMobile:['phone','compact'].includes(name),hasTouch:['phone','compact'].includes(name)});const p=await context.newPage();p.on('pageerror',e=>errors.push(name+': '+e.message));
  await p.goto(origin+'/food-forests/story/?review=story-'+version,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelector('#food-forest-story').dataset.entrance==='ready');
  assert.equal(await p.locator('#food-forest-story .story-portrait-toggle').count(),0);assert.equal(await p.locator('.story-person.story-key-idea').count(),0);assert.equal(await p.locator('#story-chapter-1 .story-key-idea').evaluate(e=>e.tagName),'P');assert.equal(await p.locator('.story-continuation a').count(),1);
  for(let i=0;i<5;i++){
   await p.locator(`[data-story-tab="${i}"]`).click();await p.locator(`#story-chapter-${i+1} img`).evaluate(img=>img.decode());await p.waitForTimeout(80);
   const measured=await p.locator('#story-chapter-'+(i+1)).evaluate(chapter=>{
    const rect=el=>el.getBoundingClientRect().toJSON(),picture=chapter.querySelector('figure'),img=picture.querySelector('img');
    const visible=[...document.querySelectorAll('#food-forest-story :is(h1,h2,p,a,button)')].filter(e=>e.getClientRects().length&&!e.closest('[hidden],[inert],.sr-only')).map(e=>({text:e.textContent.trim().slice(0,40),...rect(e)}));
    return {header:rect(document.querySelector('.story-heading')),copy:rect(chapter.querySelector('.story-chapter-copy')),picture:rect(picture),nav:rect(document.querySelector('.story-navigation')),outside:visible.filter(r=>r.top< -2||r.left< -2||r.right>innerWidth+2||r.bottom>innerHeight+2),naturalRatio:img.naturalWidth/img.naturalHeight};
   });
   assert.deepEqual(measured.outside,[],name+' chapter '+i+' overflows');
   assert(measured.copy.top>=measured.header.bottom+5,name+' text overlaps heading');
   assert(measured.nav.top-measured.copy.bottom>=12,name+' text is crowded against navigation');
   assert(measured.nav.top-measured.picture.bottom>=12,name+' picture is crowded against navigation');
   assert(Math.abs(measured.picture.width/measured.picture.height-measured.naturalRatio)<.015,name+' photograph is distorted or cropped');
   assert(measured.picture.height>=85,name+' photograph is too small');
   assert.equal(await p.locator('[data-story-count]').innerText(),`${i+1} / 5`);
   if(i===0||i===2)await p.screenshot({path:folder+'/'+name+'-chapter-'+(i+1)+'.png'});
  }
  await p.locator('[data-story-tab="4"]').focus();await p.keyboard.press('Home');assert.equal(await p.locator('[data-story-tab="0"]').getAttribute('aria-selected'),'true');await p.keyboard.press('ArrowRight');assert.equal(await p.locator('[data-story-tab="1"]').getAttribute('aria-selected'),'true');
  if(viewport.width>700){await p.locator('#story-chapter-2 figure').hover();assert.equal(await p.locator('#story-chapter-2').getAttribute('data-idea-highlighted'),'true');await p.locator('[data-story-step="1"]').click();assert.equal(await p.locator('[data-story-tab="2"]').getAttribute('aria-selected'),'true');}
  await p.locator('.story-guide-link').click();await p.waitForFunction(()=>document.body.dataset.page==='food-forest-guide');assert.equal(await p.locator('[data-guide-view]').count(),4);
  results.push({name,allFiveChapters:true,noOverlap:true,originalImageProportions:true,chapterKeyboard:true,guideLink:true});await context.close();
 }
 const welcome=await b.newPage();await welcome.goto(origin+'/xr/index.html');await welcome.waitForFunction(version=>document.body.innerText.includes('V'+version),version);await welcome.screenshot({path:folder+'/welcome.png'});
 assert.deepEqual(errors,[]);const result={version,local:!process.argv.includes('--public'),results,welcomeVersion:true,errors};fs.writeFileSync(folder+'/checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await b.close();}
