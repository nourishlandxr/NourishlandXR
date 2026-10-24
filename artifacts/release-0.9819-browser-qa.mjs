import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const live=process.argv.includes('--public'),version='0.9819',payload=path.resolve(`root-site/releases/${version}/payload`),origin='https://nourishland.org';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1512,height:982},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 if(!live)await context.route(origin+'/**',async route=>{let name=new URL(route.request().url()).pathname;if(name.endsWith('/'))name+='index.html';const file=path.resolve(payload,'.'+name);if(file.startsWith(payload+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file,contentType:({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'})[path.extname(file)]||'application/octet-stream'});return route.continue();});
 await page.goto(origin+'/demos/?review='+version,{waitUntil:'domcontentloaded'});
 await page.locator('.welcome-version-badge').first().waitFor({timeout:60000});
 assert.ok((await page.locator('.welcome-version-badge').first().textContent()).includes(version));
 await page.getByRole('link',{name:'Open Food Forest Table',exact:true}).click();
 await page.waitForFunction(()=>!!window.foodForestTable,{},{timeout:60000});
 const state=await page.evaluate(()=>window.foodForestTable.getState());assert.equal(state.catalogReady,true);assert.ok(state.underground);
 await page.goto(origin+'/xr/v2/food-forest-foundations-v7.html?review='+version,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.foodForestFoundationPreview,{},{timeout:60000});
 await page.locator('[data-action=collection]').click();
 assert.equal((await page.evaluate(()=>window.foodForestFoundationPreview.getState())).pieces,20);
 await page.locator('[data-action=planted]').click();
 assert.equal((await page.evaluate(()=>window.foodForestFoundationPreview.getState())).planted,true);
 await page.screenshot({path:`artifacts/foundations-v7-${live?'live':'candidate'}.png`});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({version,live,welcome:true,table:true,foundations:20,mobile:true,errors}));
}finally{await browser.close();}
