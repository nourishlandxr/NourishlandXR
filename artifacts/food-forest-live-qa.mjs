import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
const version=fs.readFileSync('app/services/buildInfo.js','utf8').match(/const VERSION = '([^']+)'/)[1],candidate=process.argv.includes('--candidate'),payload=path.resolve('root-site/releases/'+version+'/payload');
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1512,height:982},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
if(candidate)await context.route('https://nourishland.org/**',async route=>{let name=new URL(route.request().url()).pathname;if(name.endsWith('/'))name+='index.html';const file=path.resolve(payload,'.'+name);if(file.startsWith(payload+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())await route.fulfill({body:fs.readFileSync(file),contentType:({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});else await route.continue();});
try{
    await page.goto('https://nourishland.org/demos/?release='+version,{waitUntil:'domcontentloaded'});
    const link=page.getByRole('link',{name:'Open Food Forest Table',exact:true});await link.waitFor({timeout:60000});
    assert.ok((await page.locator('.welcome-version-badge').textContent()).includes(version));await page.screenshot({path:'artifacts/food-forest-live-demo-list.png'});
    await link.click();await page.waitForFunction(()=>!!window.foodForestTable,{},{timeout:60000});
    const state=await page.evaluate(()=>window.foodForestTable.getState());assert.equal(state.catalogReady,true);assert.equal(state.pieces.length,7);assert.equal(state.underground.roots,7);assert.equal(state.underground.board,'transparent-glass');
    assert.equal(await page.locator('[data-action=enter-xr]').count(),1);await page.waitForTimeout(900);await page.screenshot({path:'artifacts/food-forest-live-board.png'});
    await page.locator('[data-action=add]').click();assert.equal((await page.evaluate(()=>window.foodForestTable.getState())).pieces.length,8);
    await page.locator('[data-action=undo]').click();assert.equal((await page.evaluate(()=>window.foodForestTable.getState())).pieces.length,7);
    await page.locator('[data-action=back-to-demos]').click();await page.getByRole('heading',{name:'Choose one thing to test.'}).waitFor();assert.deepEqual(errors,[]);
    console.log(JSON.stringify({version,candidate,liveDemoEntry:true,glassAndRoots:true,catalogueLoaded:true,addUndo:true,returnToDemos:true,physicalXR:false,errors},null,2));
}finally{await browser.close();}
