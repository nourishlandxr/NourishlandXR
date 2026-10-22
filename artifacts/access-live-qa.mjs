import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='https://nourishland.org',errors=[],checks=[];
let browser;
try {
  const infoResponse=await fetch(origin+'/xr/services/buildInfo.js?live=0.9759',{headers:{'Cache-Control':'no-cache'}});
  assert.equal(infoResponse.status,200);
  const info=await infoResponse.text();
  assert.match(info,/"version": "0\.9759"/);
  assert.match(info,/"commit": "10e330ec46b0"/);
  checks.push('Live build V0.9759 / 10e330ec46b0');
  const health=await (await fetch(origin+'/xr-api/health')).json();assert.equal(health.ok,true);
  const session=await (await fetch(origin+'/xr-api/auth/session')).json();
  assert.equal(session.authenticated,false);assert.equal(session.required,true);assert.equal(session.authDisabled,false);
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const desktop=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await desktop.newPage();page.on('pageerror',e=>errors.push(e.message));
  const go=async url=>{const response=await page.goto(origin+url,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);};
  await go('/xr/v2/');await page.locator('#homepage-biome').waitFor();
  assert.equal(await page.locator('#home').isVisible(),true);
  for(const [label,path] of [['Demos','/xr/demos/'],['Creator','/xr/creator/'],['Account','/xr/account/']]){
    const href=await page.locator('.header-pathways a').filter({hasText:label}).getAttribute('href');assert.equal(new URL(href,page.url()).pathname,path);
  }
  await page.locator('.header-pathways a').filter({hasText:'Learn'}).click();
  await page.locator('[data-route=education]:not([hidden])').waitFor();
  assert.match(await page.locator('[data-route=education]').innerText(),/Choose a plant/);
  checks.push('Website hero retained; Learn, Demos, Creator and Account navigation');
  await go('/xr/demos/');await page.locator('.demos-grid>.access-card').first().waitFor();
  await page.locator('[data-start-demo=main]:not([disabled])').waitFor({timeout:60000});
  assert.equal(await page.locator('.demos-grid>.access-card').count(),4);
  assert.match(await page.locator('.welcome-version-badge').textContent(),/V0\.9759.*Live/);
  await page.screenshot({path:'artifacts/access-live-demos-desktop.png',fullPage:true});
  checks.push('Four public demo entries and visible V0.9759 Live badge');
  await go('/xr/demos/?tool=pimo');await page.locator('[data-cell]').first().waitFor();
  assert(await page.getByRole('link',{name:'Back to demos'}).isVisible());checks.push('Public PIMO editor opens');
  await go('/xr/demos/?tool=paths');await page.locator('[data-tour-new]').waitFor();
  await page.locator('[data-tour-new]').click();
  await page.locator('[data-tour-field=title]').fill('Live browser practice');
  await page.locator('[data-tour-add-target]').selectOption({label:'Ginger clump · Practice garden'});
  await page.locator('[data-tour-add]').click();assert.equal(await page.locator('[data-tour-stop]').count(),1);
  await page.locator('[data-tour-save]').click();await page.locator('[data-tour-status]').filter({hasText:'Draft saved.'}).waitFor();
  checks.push('Discovery Path practice creates and saves a browser-local draft');
  await go('/xr/creator/');await page.getByRole('link',{name:'Sign in',exact:true}).waitFor();checks.push('Creator requires sign-in');
  await go('/xr/account/');await page.locator('[data-sign-in]').waitFor();
  await go('/xr/account/?tab=register');await page.locator('.access-account-layout').waitFor();
  if(!session.registrationAvailable)assert.match(await page.locator('.access-main').innerText(),/private storage configured/);
  checks.push('Account and registration availability match deployed server configuration');
  const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'});
  const mobile=await phone.newPage();mobile.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/xr/v2/#education','/xr/demos/','/xr/account/','/xr/creator/']){
    const response=await mobile.goto(origin+route,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    await mobile.locator(route.includes('/v2/')?'[data-route=education]:not([hidden])':'.access-portal').waitFor();
    if(route==='/xr/demos/')await mobile.locator('[data-start-demo=main]:not([disabled])').waitFor({timeout:60000});
    assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Phone overflow: '+route);
  }
  await mobile.goto(origin+'/xr/demos/');await mobile.locator('.demos-grid>.access-card').first().waitFor();
  await mobile.locator('[data-start-demo=main]:not([disabled])').waitFor({timeout:60000});await mobile.evaluate(()=>document.fonts.ready);
  await mobile.screenshot({path:'artifacts/access-live-demos-phone.png',fullPage:true});
  checks.push('390px phone layout: website, demos, account and Creator');
  assert.deepEqual(errors,[]);
  const result={origin,version:'0.9759',commit:'10e330ec46b0',checks,registrationAvailable:session.registrationAvailable,physicalDevice:false,errors};
  fs.writeFileSync('artifacts/access-live-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();}
