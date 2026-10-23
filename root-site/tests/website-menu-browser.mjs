// Verify the open menu over the real hero, including short and narrow phones.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {revision as version} from '../tools/assemble-website.mjs';
const live=process.argv.includes('--public'),candidate=process.argv.includes('--candidate'),origin=live||candidate?'https://nourishland.org':'http://127.0.0.1:8010';
const label=live?'live':candidate?'candidate':'local',folder=`.tmp/menu-${version}`,payload=path.resolve(`root-site/releases/${version}/payload`);
fs.mkdirSync(folder,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'};
try{
 for(const [name,viewport]of [['desktop',{width:1440,height:900}],['phone',{width:390,height:844}],['compact',{width:375,height:667}],['narrow',{width:320,height:568}],['landscape',{width:667,height:375}]]){
  const context=await browser.newContext({viewport,isMobile:name!=='desktop',hasTouch:name!=='desktop'});
  if(candidate)await context.route(origin+'/**',async route=>{
   let file=new URL(route.request().url()).pathname;if(file.endsWith('/'))file+='index.html';file=path.resolve(payload,'.'+file);
   if(file.startsWith(payload+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())await route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});else await route.continue();
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(name+': '+error.message));
  await page.goto(origin+'/?review=menu-'+version,{waitUntil:'domcontentloaded'});
  const toggle=page.locator('.menu-toggle'),nav=page.getByRole('navigation',{name:'Website',exact:true});
  await toggle.click();await nav.waitFor();await page.waitForTimeout(240);
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('main').evaluate(e=>e.inert),true);
  assert.deepEqual(await nav.locator('a').evaluateAll(links=>links.map(a=>new URL(a.href).pathname)),['/education/','/platform/','/food-forests/','/places/','/collaborate/','/about/','/contact/']);
  assert.equal(await nav.locator('button,p').count(),0,'Obsolete controls or category copy remain');
  const measured=await nav.evaluate(nav=>{
   const rgba=c=>c.match(/[\d.]+/g).map(Number),background=rgba(getComputedStyle(nav).backgroundColor);
   const base=background.slice(0,3).map(v=>v*(background[3]??1)+255*(1-(background[3]??1)));
   const lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   const b=lum(base),rect=nav.getBoundingClientRect();return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,background:base,
    links:[...nav.querySelectorAll('a')].map(a=>{const s=getComputedStyle(a),r=a.getBoundingClientRect(),f=lum(rgba(s.color).slice(0,3));return {text:a.textContent.trim(),contrast:(Math.max(f,b)+.05)/(Math.min(f,b)+.05),size:parseFloat(s.fontSize),height:r.height,width:r.width};}),
    scrolls:nav.scrollHeight>nav.clientHeight+2};
  });
  assert(measured.left>=8&&measured.right<=viewport.width-8,name+' horizontal clipping');assert(measured.top>=0&&measured.bottom<=viewport.height-8,name+' vertical clipping');
  assert(measured.width<=360);assert(measured.background.every(v=>v<65),'The menu surface is too bright');
  for(const link of measured.links){assert(link.contrast>=4.5,name+' low contrast: '+link.text);assert(link.size>=16,name+' small text: '+link.text);assert(link.height>=44&&link.width>=44,name+' small target: '+link.text);}
  if(name!=='landscape')assert.equal(measured.scrolls,false,name+' unnecessary menu scrolling');
  await page.screenshot({path:`${folder}/${label}-${name}.png`});
  await nav.locator('a').last().focus();await page.keyboard.press('Tab');assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Shift+Tab');assert.equal(await nav.locator('a').last().evaluate(e=>e===document.activeElement),true);
  assert(await nav.locator('a').last().evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('nav').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom+1;}),'Last link cannot be reached');
  await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);assert.equal(await page.locator('main').evaluate(e=>e.inert),false);
  await toggle.click();await nav.getByRole('link',{name:'Education',exact:false}).click();await page.waitForFunction(()=>document.body.dataset.page==='education');assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await toggle.click();assert.equal(await nav.locator('a[href="/education/"]').getAttribute('aria-current'),'page');
  await page.mouse.click(2,viewport.height-5);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  results.push({name,minContrast:Math.min(...measured.links.map(l=>l.contrast)),allTargets44px:true,insideViewport:true,scrolls:measured.scrolls,keyboardAndDismissal:true});await context.close();
 }
 assert.deepEqual(errors,[]);const result={version,origin,label,results,errors,physicalPhone:false};fs.writeFileSync(`${folder}/${label}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
