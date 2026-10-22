import http from 'node:http';
import {readFile,stat,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=resolve('.'),mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.startsWith('/xr/'))pathname='/dist'+pathname;let file=resolve(root,'.'+pathname);if(!file.startsWith(root+sep))throw new Error();if((await stat(file)).isDirectory())file=resolve(file,'index.html');res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
const origin=`http://127.0.0.1:${server.address().port}`,errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error' && /shader|WebGL|GL_INVALID/.test(msg.text()))errors.push(msg.text());});
 await page.goto(origin+'/tools/preview-crafted-materials.html');await page.waitForFunction(()=>window.materialReview?.zinnia.userData.zinnia.status==='ready',{timeout:60000});
 await page.locator('#table').screenshot({path:'artifacts/crafted-table-orbs.png'});assert.equal(await page.locator('#error').textContent(),'');
 const frame=page.frameLocator('iframe');await frame.locator('[data-model="botanical"]').click();await page.waitForTimeout(800);assert.equal(await frame.locator('#errors').textContent(),'');await frame.locator('#totem').screenshot({path:'artifacts/crafted-totem.png'});
 await page.locator('#open').click();await page.waitForTimeout(300);await page.locator('#table').screenshot({path:'artifacts/crafted-table-orbs-open.png'});
 const welcome=await browser.newPage({viewport:{width:1440,height:1000}});await welcome.goto(origin+'/xr/');await welcome.locator('.welcome-version-badge').waitFor({timeout:60000});const version=await welcome.locator('.welcome-version-badge').first().textContent();assert.match(version,/0\.9763/);await welcome.screenshot({path:'artifacts/crafted-welcome-version.png'});
 assert.deepEqual(errors,[]);const result={version,shaderErrors:errors,standaloneQuestVerified:false};await writeFile('artifacts/crafted-materials-result.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();server.close();}
