import http from 'node:http';
import fs from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=resolve('dist'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.glb':'model/gltf-binary'};
const server=http.createServer(async(req,res)=>{try{let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep))throw Error();if((await fs.stat(file)).isDirectory())file=resolve(file,'index.html');res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end('{}');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/xr/',{waitUntil:'domcontentloaded'});await page.locator('.welcome-version-badge').waitFor({timeout:60000});
 const badge=await page.locator('.welcome-version-badge').textContent();assert.match(badge,/V0\.9747/);
 await page.screenshot({path:'artifacts/creator-parity-welcome.png'});
 await page.goto(origin+'/xr/?chapters=1',{waitUntil:'domcontentloaded'});
 await page.locator('[data-chapter="creator"]').click();
 const place=page.locator('[data-tryit-place]');await place.waitFor({state:'visible',timeout:60000});
 const wrist=page.getByRole('button',{name:'Open wrist menu',exact:true});await wrist.waitFor({state:'visible'});
 assert.ok((await page.locator('.is-runtime-wrist').boundingBox()).width<100);
 await wrist.click();await page.getByRole('button',{name:'Creator quick start',exact:true}).waitFor({state:'visible'});
 assert.ok((await page.locator('.is-runtime-wrist').boundingBox()).width<=240);
 await page.getByRole('button',{name:'Close wrist menu',exact:true}).click();
 assert.match(await page.locator('[data-tryit-guide]').textContent(),/1 \/ Place an Orb/);
 await place.click();await page.waitForFunction(()=>document.querySelector('[data-tryit-place]')?.dataset.placementKind==='note');
 await place.click();await page.waitForFunction(()=>document.querySelector('[data-tryit-place]')?.dataset.placementKind==='totem');
 await place.click();await page.waitForFunction(()=>document.querySelector('[data-tryit-guide]')?.textContent.startsWith('Complete.'));
 assert.equal(await place.isVisible(),false);await page.screenshot({path:'artifacts/creator-parity-complete.png'});
 assert.deepEqual(errors,[]);
 const mobileContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto(origin+'/xr/?chapters=1',{waitUntil:'domcontentloaded'});await mobile.locator('[data-chapter="creator"]').click();
 const mobilePlace=mobile.locator('[data-tryit-place]');await mobilePlace.waitFor({state:'visible',timeout:60000});
 await mobile.getByRole('button',{name:'Open wrist menu',exact:true}).tap();await mobile.getByRole('button',{name:'Creator quick start',exact:true}).waitFor({state:'visible'});
 await mobile.getByRole('button',{name:'Close wrist menu',exact:true}).tap();
 for(const next of ['note','totem']){await mobilePlace.tap();await mobile.waitForFunction(next=>document.querySelector('[data-tryit-place]')?.dataset.placementKind===next,next);}
 await mobilePlace.tap();await mobile.waitForFunction(()=>document.querySelector('[data-tryit-guide]')?.textContent.startsWith('Complete.'));
 await mobile.screenshot({path:'artifacts/creator-parity-mobile-complete.png'});await mobileContext.close();assert.deepEqual(errors,[]);
 const preview=await browser.newPage({viewport:{width:800,height:650}});await preview.goto(origin+'/');
 await preview.setContent('<style>body{margin:0;background:#eeebe3}canvas{display:block;width:800px;height:600px}p{font:16px system-ui;margin:12px 24px}</style><canvas width="800" height="600"></canvas><p>Mapping controller · survey ring · trigger marks points · wrist menu saves or undoes</p>');
 const controllerPixels=await preview.evaluate(async()=>{
    const {createMappingController}=await import('/xr/services/mappingController.js'),THREE=await import('/xr/assets/fruit-window/vendor/three.module.js');
    const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});if(!gl)throw Error('WebGL unavailable');
    const controller=createMappingController(gl),camera=new THREE.PerspectiveCamera(42,800/600,.01,10);camera.position.set(.18,.09,.27);camera.lookAt(0,-.01,0);camera.updateMatrixWorld();
    const source={handedness:'right',gripSpace:{},gamepad:{buttons:[]}},frame={session:{inputSources:[source]},getPose:()=>({transform:{matrix:new THREE.Matrix4().elements}})};
    const view={projectionMatrix:camera.projectionMatrix.elements,transform:{matrix:camera.matrixWorld.elements,inverse:{matrix:camera.matrixWorldInverse.elements}}};
    for(let i=0;i<80;i++){controller.update(frame,{});gl.viewport(0,0,800,600);gl.clearColor(.93,.92,.89,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);controller.draw(view);await new Promise(requestAnimationFrame);}
    const pixels=new Uint8Array(800*600*4);gl.readPixels(0,0,800,600,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<180)count++;
    return count;
 });assert.ok(controllerPixels>100,'mapping controller mesh renders');await preview.screenshot({path:'artifacts/mapping-controller-preview.png'});
 console.log(JSON.stringify({welcome:badge,creatorPractice:'Orb → Note → Totem complete',errors},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
