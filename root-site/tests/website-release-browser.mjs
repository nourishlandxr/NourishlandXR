// Exercise the exact overlay before publishing, then repeat against public files.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const version=process.argv.find(a=>/^0\.[0-9]{4}$/.test(a))||'0.9782',live=process.argv.includes('--public');
const payload=path.resolve('root-site/releases',version,'payload'),origin='https://nourishland.org',errors=[],results=[];
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const [name,viewport]of Object.entries({desktop:{width:1440,height:1000},phone:{width:390,height:844}})){
  const context=await browser.newContext({viewport,isMobile:name==='phone',hasTouch:name==='phone'});
  if(!live)await context.route(origin+'/**',async route=>{
   let name=decodeURIComponent(new URL(route.request().url()).pathname);if(name.endsWith('/'))name+='index.html';
   const file=path.resolve(payload,'.'+name);
   if(file.startsWith(payload+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())await route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});else await route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
  const go=async name=>{await page.goto(origin+name+'?review=release-'+version,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-route]:not([hidden])')?.dataset.entrance==='ready',null,{timeout:60000});};
  await go('/education/');await page.waitForFunction(()=>!!document.querySelector('.knowledge-flower canvas'),null,{timeout:60000});
  assert.match(await page.locator('[data-site-version]').first().innerText(),new RegExp(version.replace('.','\\.')));
  await page.locator('[data-open-orb]').click();
  await go('/platform/');await page.waitForFunction(()=>!!document.querySelector('.journey-parent')?.dataset.portraitStyle,null,{timeout:60000});
  await page.locator('[data-journey-branch=creator]').click();await page.waitForFunction(()=>document.querySelector('[data-platform-totem]').dataset.motion==='idle');
  await page.locator('[data-journey-item=field]').click();await page.locator('[data-detail-link]').click();await page.locator('.phone-preview[open]').waitFor();assert.equal(new URL(page.url()).pathname,'/platform/');
  await page.getByRole('button',{name:'Close phone preview',exact:true}).click();
  await go('/food-forests/');await page.waitForFunction(()=>document.querySelector('[data-forest-wheel]')?.dataset.wheelReady==='true',null,{timeout:60000});
  await page.locator('[data-forest-topic=layers]').click();assert.match(await page.locator('[data-forest-answer]').innerText(),/Canopy trees/);
  await go('/places/');await page.waitForFunction(()=>document.querySelector('#places [data-places-showcase]')?.dataset.placeReady==='true',null,{timeout:60000});
  await page.locator('#places [data-place-step="1"]').click();await page.waitForFunction(()=>document.querySelector('#places [data-places-showcase]').dataset.place==='uki'&&document.querySelector('#places [data-places-showcase]').dataset.placeReady==='true');
  await go('/collaborate/');await page.waitForFunction(()=>document.querySelector('[data-discovery-die]')?.dataset.ready==='true',null,{timeout:60000});
  await page.locator('[data-partner=educator]').click();assert.match(await page.locator('[data-partner-answer]').innerText(),/learning experience/);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`artifacts/website-release-${version}-${live?'public':'candidate'}-${name}.png`});
  results.push({name,education:true,totemJourney:true,phonePreview:true,wheel:true,places:true,die:true,version:true});await context.close();
 }
 assert.deepEqual(errors,[]);
 const result={version,public:live,results,errors,physicalDevice:false,heroCrevice:'Known issue: retained video predates food-area repair'};
 fs.writeFileSync(`artifacts/website-release-${version}-${live?'public':'candidate'}.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
