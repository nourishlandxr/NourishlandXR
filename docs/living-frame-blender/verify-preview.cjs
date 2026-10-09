// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8769/docs/living-frame-blender/preview.html');
  await page.waitForSelector('body[data-model-ready="true"]',{timeout:20000});
  const stats=await page.evaluate(()=>window.ringReview);
  assert.equal(stats.meshes,1);assert.equal(stats.referenceExported,false);
  assert.ok(Math.abs(stats.dimensions[0]-1.824)<.002);
  assert.ok(Math.abs(stats.dimensions[1]-1.824)<.002);
  assert.ok(Math.abs(stats.dimensions[2]-.18)<.001);
  assert.ok(stats.triangles>0 && stats.triangles<10000);
  const canvas=page.locator('#view canvas');
  const beforeOrbit=await canvas.screenshot();
  await page.mouse.move(800,480);await page.mouse.down();await page.mouse.move(970,560,{steps:12});await page.mouse.up();
  await page.waitForTimeout(400);
  const afterOrbit=await canvas.screenshot();assert.ok(!beforeOrbit.equals(afterOrbit),'Orbit must visibly change the view');
  await page.mouse.wheel(0,-350);await page.waitForTimeout(400);
  const afterZoom=await canvas.screenshot();assert.ok(!afterOrbit.equals(afterZoom),'Zoom must visibly change the view');
  await page.locator('#reset').click();await page.waitForTimeout(500);
  await page.screenshot({path:path.join(__dirname,'preview-perspective.png')});
  for(const view of ['front','side']){
   await page.locator(`[data-view="${view}"]`).click();await page.waitForTimeout(500);
   assert.equal(await page.locator(`[data-view="${view}"]`).getAttribute('aria-pressed'),'true');
   await page.screenshot({path:path.join(__dirname,`preview-${view}.png`)});
  }
  await page.locator('[data-view="front"]').click();await page.waitForTimeout(400);
  const withReference=await canvas.screenshot();await page.locator('#reference').uncheck();await page.waitForTimeout(200);
  const withoutReference=await canvas.screenshot();assert.ok(!withReference.equals(withoutReference));
  await page.screenshot({path:path.join(__dirname,'preview-ring-only.png')});
  await page.locator('#wireframe').check();await page.waitForTimeout(200);
  assert.ok(!withoutReference.equals(await canvas.screenshot()));
  assert.deepEqual(errors,[]);
  const welcome=await browser.newPage();
  await welcome.goto('http://127.0.0.1:8769/dist/xr/');
  await welcome.waitForSelector('.welcome-version-badge',{timeout:20000});
  const badge=await welcome.locator('.welcome-version-badge').textContent();assert.ok(badge.includes('0.9429'));
  await welcome.screenshot({path:path.join(__dirname,'welcome-0.9429.png')});
  fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify({stats,checks:['GLB loads','one ring mesh only','dimensions match','orbit visibly works','zoom visibly works','named views work','reference toggle works','wireframe works','no preview page errors','built welcome version visible'],welcomeBadge:badge,headsetVerified:false},null,2));
  console.log(JSON.stringify({stats,welcomeBadge:badge,previewErrors:errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
