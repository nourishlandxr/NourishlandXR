import http from 'node:http';
import {readFile, stat, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{
  try{
    let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+sep))throw new Error('Path outside root');
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const results=[];
try{
  for(const [name,viewport]of Object.entries({desktop:{width:1440,height:1000},mobile:{width:390,height:844}})){
    const context=await browser.newContext({viewport,reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    // The world model is owned by the hero task; this QA targets website routes and preserves its loader URL.
    await page.route('**/v2/full-3d/**',route=>route.abort());
    await page.goto(`${origin}/xr/v2/#education`,{waitUntil:'domcontentloaded'});
    await page.locator('body[data-page="education"]').waitFor();
    await page.locator('[data-site-version]').waitFor({state:'attached'});
    assert.equal(await page.locator('[data-site-version]').textContent(),'Preview 0.9742');
    assert.equal(await page.locator('#education .simple-choices a').count(),2);
    assert.equal(await page.locator('main [data-media-slot]').count(),0);
    for(const route of ['education','food-forests','nature-learning','platform','collaborate','demos']){
      await page.evaluate(route=>location.hash=route,route);
      await page.locator(`body[data-page="${route}"]`).waitFor();
      assert.equal(await page.locator('.route-block:visible').count(),1);
      const width=await page.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth}));
      assert.ok(width.content<=width.viewport+1,`${name} ${route} horizontal overflow: ${JSON.stringify(width)}`);
    }
    for(const [alias,target]of Object.entries({creator:'platform',explorer:'platform',pilot:'collaborate',about:'collaborate'})){
      await page.evaluate(alias=>location.hash=alias,alias);
      await page.locator(`body[data-page="${target}"]`).waitFor();
    }
    await page.locator('.menu-toggle').click();
    await page.locator('#main-nav:visible').waitFor();
    await page.locator('#main-nav a[href="#education"]').click();
    await page.locator('body[data-page="education"]').waitFor();
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
    await page.screenshot({path:`artifacts/website-simple-${name}-education.png`,fullPage:true});
    await page.locator('.brand').click();
    await page.locator('body[data-page="home"]').waitFor();
    assert.equal(await page.locator('#home > section').count(),1);
    assert.match(await page.locator('.nl-cinematic-iframe').getAttribute('src'),/revision=natural-depth-01/);
    await page.screenshot({path:`artifacts/website-simple-${name}-home.png`});
    assert.deepEqual(errors,[],`${name} browser errors`);
    results.push({viewport:name,routes:6,menu:'passed',overflow:'none',version:'0.9742',heroLoader:'natural-depth-01 preserved; model rendering excluded'});
    await context.close();
  }
  const page=await browser.newPage();
  await page.goto(`${origin}/xr/`,{waitUntil:'domcontentloaded'});
  await page.locator('.welcome-version-badge').waitFor({timeout:60000});
  const badge=await page.locator('.welcome-version-badge').textContent();
  assert.match(badge,/V0\.9742/);
  await page.screenshot({path:'artifacts/website-simple-welcome.png'});
  results.push({welcomeVersion:badge});
  await writeFile('artifacts/website-simple-qa.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
