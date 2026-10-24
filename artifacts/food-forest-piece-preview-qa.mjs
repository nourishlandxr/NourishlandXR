import {checkLivingPieces} from './food-forest-pieces-v5-browser-qa.mjs';
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
try{await checkLivingPieces(page,origin);assert.deepEqual(errors,[]);console.log('Gallery: zero browser errors.');}finally{await browser.close();}
