// Exercise redirects in a real browser: URL fragments never reach the server.
import assert from 'node:assert/strict';import fs from 'node:fs';
import {chromium} from 'file:///C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {revision as version} from '../tools/assemble-website.mjs';
const origin=process.argv.includes('--public')?'https://nourishland.org':'http://127.0.0.1:8010',folder='.tmp/canonical-'+version;
fs.mkdirSync(folder,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
 for(const [name,viewport]of [['desktop',{width:1440,height:900}],['phone',{width:390,height:844}]]){
  const context=await browser.newContext({viewport,isMobile:name==='phone',hasTouch:name==='phone'}),page=await context.newPage();page.on('pageerror',error=>errors.push(name+': '+error.message));
  for(const [old,current,key]of [['/xr/v2/#education','/education/','education'],['/xr/v2/index.html#food-forest-story','/food-forests/story/','food-forest-story'],['/v2/#about','/about/','about'],['/xr/','/platform/','platform'],['/food-forests-2/','/food-forests/','food-forests'],['/a-food-forest-story/','/food-forests/story/','food-forest-story'],['/hillyards-food-forest/','/hillyards/','hillyards']]){
   await page.goto(origin+old,{waitUntil:'domcontentloaded'});await page.waitForFunction(key=>document.body.dataset.page===key,key,{timeout:60000});assert.equal(new URL(page.url()).pathname,current,old);results.push({device:name,old,current});
  }
  await page.goto(origin+'/creator/',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Your projects.',exact:true}).waitFor({timeout:60000});assert.equal(await page.title(),'Creator · Nourishland');
  const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>new URL(n.href).pathname));assert(!links.some(path=>/^\/(?:xr|app)\/v2(?:\/|$)/.test(path)),'Creator points back to the retired website');
  await page.screenshot({path:folder+'/'+name+'-'+(process.argv.includes('--public')?'live':'local')+'-creator.png'});
  if(name==='desktop'){
   await page.goto(origin+'/app/?mode=welcome',{waitUntil:'domcontentloaded'});await page.waitForFunction(version=>document.body.innerText.includes('V'+version),version,{timeout:60000});assert.equal(new URL(page.url()).pathname,'/app/');
   await page.screenshot({path:folder+'/welcome-'+(process.argv.includes('--public')?'live':'local')+'.png'});
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);const result={version,origin,bookmarks:results,welcomeVersion:true,creatorLinksCurrent:true,errors};fs.writeFileSync(folder+'/'+(process.argv.includes('--public')?'live':'local')+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
