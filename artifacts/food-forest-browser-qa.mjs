import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='http://127.0.0.1:8093',root=path.resolve('.'),errors=[];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1512,height:982},serviceWorkers:'block'});
const mimes={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp3':'audio/mpeg'};
await context.route('**/*',async route=>{
    const url=new URL(route.request().url());if(url.origin!==origin)return route.fulfill({status:204,body:''});
    let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))return route.fulfill({status:403,body:''});
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    if(!fs.existsSync(file))return route.fulfill({status:404,contentType:'application/json',body:'{}'});
    return route.fulfill({path:file,contentType:mimes[path.extname(file)]||'application/octet-stream'});
});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
const read=()=>page.evaluate(()=>window.foodForestTable.getState());
const targets=()=>page.evaluate(()=>window.foodForestTable.getPreviewTargets());
const target=async id=>{const t=(await targets()).find(t=>t.id===id);assert.ok(t,`target ${id}`);return t;};
async function drag(id,to,cancel=false){const from=await target(id);await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:9});if(cancel)await page.evaluate(()=>dispatchEvent(new Event('blur')));await page.mouse.up();}
try{
    await page.addInitScript(()=>{if(new URLSearchParams(location.search).get('editor')==='food-forest'){window.xrRequests=0;Object.defineProperty(navigator,'xr',{configurable:true,value:{isSessionSupported:async()=>true,requestSession:async()=>{window.xrRequests++;throw Error('Headset fixture: session requires physical device');}}});}});
    await page.goto(`${origin}/app/demos/`);await page.getByRole('link',{name:'Open Food Forest Table',exact:true}).click();await page.waitForFunction(()=>!!window.foodForestTable);
    assert.equal(new URL(page.url()).searchParams.get('mode'),'xr');assert.equal(await page.evaluate(()=>window.xrRequests),0);
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>{const header=document.querySelector('.ff-workbench header').getBoundingClientRect(),toolbar=document.querySelector('.ff-toolbar').getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth+1&&toolbar.bottom<=header.bottom;}),'Demo return button fits the mobile header');
    await page.setViewportSize({width:1512,height:982});
    await page.locator('[data-action=enter-xr]').click();assert.equal(await page.evaluate(()=>window.xrRequests),1);assert.match(await page.locator('[data-caption]').textContent(),/Headset fixture/);
    await page.locator('[data-action=back-to-demos]').click();await page.getByRole('heading',{name:'Choose one thing to test.'}).waitFor();
    await page.goto(`${origin}/app/?chapters=1`);await page.getByRole('link',{name:'Open Food Forest Table',exact:true}).click();await page.waitForFunction(()=>!!window.foodForestTable);await page.locator('[data-action=back-to-demos]').click();await page.getByRole('heading',{name:'Demo chapters',exact:true}).waitFor();
    await page.goto(`${origin}/tools/preview-food-forest-kit.html`);await page.waitForFunction(()=>!!window.foodForestTable);await page.waitForTimeout(300);
    assert.equal((await read()).pieces.length,7);assert.equal(await page.locator('[data-layer]').count(),7);
    assert.deepEqual((await read()).underground,{board:'transparent-glass',roots:7});await page.waitForTimeout(850);
    await page.screenshot({path:'artifacts/food-forest-table.png'});
    const before=await read(),center=await target('board:center');await drag('bay:0',center);assert.equal((await read()).pieces.length,8);
    assert.equal((await read()).underground.roots,8);
    await page.locator('[data-action=undo]').click();assert.deepEqual((await read()).pieces,before.pieces);
    assert.equal((await read()).underground.roots,7);
    await page.locator('[data-action=redo]').click();assert.equal((await read()).pieces.length,8);
    const placed=(await read()).pieces.at(-1);await drag(placed.id,{x:center.x+65,y:center.y+25},true);assert.deepEqual((await read()).pieces.at(-1),placed);
    const canvas=await page.locator('canvas').first().boundingBox();await drag('bay:1',{x:canvas.x+3,y:canvas.y+3});assert.equal((await read()).pieces.length,8);
    await page.locator('[data-action=kit]').click();let kit=await read();assert.equal(kit.pieces.length,28);assert.equal(new Set(kit.pieces.map(p=>`${p.layer}:${p.variant}`)).size,28);
    await page.locator('[data-action=labels]').click();await page.waitForTimeout(250);await page.screenshot({path:'artifacts/food-forest-28-pieces.png'});
    await page.locator('[data-action=undo]').click();assert.equal((await read()).pieces.length,8);
    await page.locator('[data-tab=board]').click();await page.locator('[data-dimension=widthM]').fill('30');await page.locator('[data-dimension=widthM]').press('Tab');assert.equal((await read()).widthM,30);
    const chosen=(await read()).pieces.at(-1),spot=await target(chosen.id);await page.mouse.click(spot.x,spot.y);await page.locator('[data-canopy]').fill('5');await page.locator('[data-canopy]').press('Tab');assert.equal((await read()).pieces.at(-1).canopyDiameterM,5);
    await page.locator('[data-goal=lower-input]').click();assert.equal((await read()).goal,'lower-input');
    await page.locator('[data-action=boundary]').click();const corners=(await targets()).filter(t=>t.id.startsWith('corner:'));const mid=await target('board:center');for(const p of corners)await page.mouse.click(mid.x+(p.x-mid.x)*.75,mid.y+(p.y-mid.y)*.75);await page.locator('[data-action=finish-boundary]').click();assert.equal((await read()).shape,'custom');
    await page.locator('[data-shape=round]').click();assert.equal((await read()).shape,'round');await page.locator('[data-challenge=wind]').click();assert.equal((await read()).challenge,'wind');
    await page.locator('[data-action=grid]').click();assert.equal((await read()).grid,true);
    await page.locator('[data-tab=plants]').click();await page.locator('[data-filter=query]').fill('Sheoak');await page.locator('[data-plant]').first().click();
    const selectedName=await page.locator('.ff-selected-plant h3').textContent();await page.locator('[data-wish]').click();assert.equal((await read()).wishlist.length,1);await page.locator('[data-load-plant]').click();
    await page.locator('[data-action=add]').click();assert.equal((await read()).pieces.at(-1).label,selectedName);
    await page.locator('[data-action=undo]').click();assert.equal((await read()).wishlist.length,1);
    await page.locator('[data-action=spatial-panel]').click();await page.waitForTimeout(200);await page.screenshot({path:'artifacts/food-forest-spatial-controls.png'});
    async function worldClick(id){const t=await target(`control:${id}`);assert.ok(t.x>0&&t.x<1512&&t.y>78&&t.y<982,`${id} is in view`);await page.mouse.click(t.x,t.y);}
    await worldClick('page:pieces');await worldClick('layer:climber');assert.equal((await read()).layer,'climber');await worldClick('variant:3');assert.equal((await read()).variant,3);
    const count=(await read()).pieces.length;await worldClick('add');assert.equal((await read()).pieces.length,count+1);assert.equal((await read()).pieces.at(-1).layer,'climber');
    await worldClick('page:board');await worldClick('challenge:pests');assert.equal((await read()).challenge,'pests');await worldClick('width:plus');assert.equal((await read()).widthM,32);
    await worldClick('undo');assert.equal((await read()).widthM,30);
    const feedback=(await read()).feedback;assert.ok(feedback.grab>=1&&feedback.grow>=1&&feedback.tap>=1);
    await page.reload();await page.waitForFunction(()=>!!window.foodForestTable);assert.equal((await read()).widthM,30);assert.equal((await read()).wishlist.length,1);assert.equal((await read()).goal,'lower-input');
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'artifacts/food-forest-mobile.png',fullPage:true});
    await page.setViewportSize({width:1512,height:982});await page.goto(`${origin}/app/?editor=food-forest`);await page.waitForFunction(()=>!!window.foodForestTable);assert.equal((await read()).wishlist.length,1);
    await page.goto(`${origin}/app/`);await page.locator('.welcome-version-badge').first().waitFor({timeout:60000});const version=fs.readFileSync('app/services/buildInfo.js','utf8').match(/const VERSION = '([^']+)'/)[1];assert.ok((await page.locator('.welcome-version-badge').first().textContent()).includes(version));await page.screenshot({path:'artifacts/food-forest-welcome-version.png'});
    assert.deepEqual(errors,[]);console.log(JSON.stringify({version,fixture:'repository files, network intercepted',kit:28,dragUndoCancel:'passed',collection:'passed',spatialControls:'passed',mobile:'passed',welcomeBadge:'visible',feedback,errors},null,2));
}catch(error){await page.screenshot({path:'artifacts/food-forest-error.png'}).catch(()=>{});console.log(JSON.stringify({errors,state:await read().catch(()=>null)}));throw error;}
finally{await browser.close();}
