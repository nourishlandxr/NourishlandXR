import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const version=fs.readFileSync('app/services/buildInfo.js','utf8').match(/const VERSION\s*=\s*'([^']+)'/)[1];
const root=path.resolve('dist'),errors=[],requests=[],results=[];
const server=http.createServer((req,res)=>{
 try{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error();if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const size=fs.statSync(file).size;
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp4':'video/mp4'})[path.extname(file)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');
  const range=req.headers.range?.match(/bytes=(\d+)-(\d*)/);if(range){const start=Number(range[1]),end=Math.min(size-1,range[2]?Number(range[2]):size-1);res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}else{res.setHeader('Content-Length',size);fs.createReadStream(file).pipe(res);}
 }catch{res.writeHead(404);res.end('{}');}
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const [name,viewport]of Object.entries({desktop:{width:1440,height:900},phone:{width:390,height:844}})){
  const page=await browser.newPage({viewport,isMobile:name==='phone',hasTouch:name==='phone'});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(origin+'/xr/v2/');await page.waitForFunction(()=>document.querySelector('[data-biome-hero]')?.dataset.biomeReady==='video');
  const v=page.locator('.nl-hero-video');const dimensions=await v.evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,loop:v.loop,muted:v.muted,inline:v.playsInline,src:v.currentSrc}));
  assert.equal(dimensions.width,name==='desktop'?2560:1080);assert.equal(dimensions.height,name==='desktop'?1440:1920);assert.equal(dimensions.duration,24);assert(dimensions.loop&&dimensions.muted&&dimensions.inline);
  assert.match(dimensions.src,new RegExp('/hero-clean-hq/'+name+'\\.mp4\\?v=inner-rock-02$'));assert.equal(await page.locator('iframe,.nl-showcase-controls,.nl-layer-ui,.nd-marker,.nd-card').count(),0);
  await page.getByRole('button',{name:'Pause landscape animation',exact:true}).click();assert(await v.evaluate(v=>v.paused));
  await page.getByRole('button',{name:'Play landscape animation',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.nl-hero-video').paused);
  await page.getByRole('button',{name:'Open menu',exact:true}).click();assert(await v.evaluate(v=>v.paused));await page.getByRole('button',{name:'Close menu',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.nl-hero-video').paused);
  await page.locator('.header-pathways a').filter({hasText:'Learn'}).click();await page.waitForFunction(()=>document.querySelector('.nl-hero-video').paused);await page.locator('.brand').click();await page.waitForFunction(()=>!document.querySelector('.nl-hero-video').paused);
  await v.evaluate(v=>v.currentTime=23.8);await page.waitForFunction(()=>document.querySelector('.nl-hero-video').currentTime<1,null,{timeout:15000});
  await page.getByRole('button',{name:'Pause landscape animation',exact:true}).click();await v.evaluate(v=>v.currentTime=3);await page.waitForFunction(()=>!document.querySelector('.nl-hero-video').seeking);
  await page.screenshot({path:`artifacts/hero-video-${name}.png`,timeout:60000});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'Replay landscape animation',exact:true}).click();assert((await v.evaluate(v=>v.currentTime))<2);
  results.push({name,dimensions,loopVerified:true,menuAndRoutePause:true,controls:true});await page.close();
 }
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});reduced.on('pageerror',e=>errors.push(e.message));await reduced.goto(origin+'/xr/v2/');await reduced.locator('.nl-video-poster').waitFor();await reduced.waitForTimeout(250);assert.equal(await reduced.locator('.nl-hero-video').count(),0);assert(await reduced.locator('.nl-video-poster').evaluate(i=>i.complete&&i.naturalWidth===1080));await reduced.getByRole('button',{name:'Play landscape animation',exact:true}).click();await reduced.waitForFunction(()=>document.querySelector('.nl-hero-video')?.videoWidth===1080);await reduced.close();
 const imageOnly=await browser.newPage({viewport:{width:1440,height:900}});await imageOnly.route('**/hero-clean-hq/*.mp4*',route=>route.abort());await imageOnly.goto(origin+'/xr/v2/');await imageOnly.locator('[data-hero-status]').filter({hasText:'Video playback could not start'}).waitFor();assert(await imageOnly.locator('.nl-video-poster').evaluate(i=>i.complete&&i.naturalWidth===2560));assert.equal(await imageOnly.locator('.nl-video-plane.is-playing').count(),0);await imageOnly.close();
 const welcome=await browser.newPage();await welcome.goto(origin+'/xr/');await welcome.locator('.welcome-version-badge').waitFor();assert.ok((await welcome.locator('.welcome-version-badge').innerText()).includes('V'+version));await welcome.close();
 assert(!requests.some(url=>url.includes('/full-3d/')),'Intro downloaded the 3D world');assert.deepEqual(errors,[]);
 const result={version,results,reducedMotion:true,posterOnVideoFailure:true,noNLlayer:true,noFullWorldRequest:true,welcomeVersion:true,physicalPhone:false,errors};fs.writeFileSync('artifacts/hero-video-repair-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
