import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'file:///C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const root=process.cwd();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
try{
    const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.hostname!=='127.0.0.1')return route.abort();
        const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname));
        if(!filename.startsWith(root+path.sep))return route.abort();
        const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
        try{await route.fulfill({body:await fs.readFile(filename),contentType:types[path.extname(filename)] || 'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}
    });
    await page.goto('http://127.0.0.1:8795/tools/preview-knowledge-star.html');
    await page.waitForTimeout(1200);
    await page.screenshot({path:'tmp/explorer-seed.png'});
    console.log('Seed:',await page.locator('#status').innerText());
    await page.locator('#hub').click();await page.waitForTimeout(1200);
    await page.screenshot({path:'tmp/explorer-hub.png'});
    console.log('Hub:',await page.locator('#status').innerText());
    console.log('Objects:',await page.locator('#field canvas').getAttribute('data-objects'));
    console.log('Errors:',errors,await page.locator('#error').innerText());
    await page.locator('#reset').click();
    await page.evaluate(()=>{const study=window.knowledgeStarStudy;for(const domain of study.knowledge.categories)study.select(domain.id);});
    await page.waitForTimeout(1200);await page.screenshot({path:'tmp/explorer-star.png'});
    if(process.argv.includes('--welcome')){
        await page.goto('http://127.0.0.1:8795/dist/xr/index.html');
        console.log('Welcome:',await page.locator('.welcome-version-badge').innerText({timeout:15000}));
        await page.screenshot({path:'tmp/explorer-build-welcome.png'});
    }
}finally{await browser.close();}
