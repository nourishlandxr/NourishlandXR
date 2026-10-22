import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let page;const errors=[];
try{
 page=await browser.newPage({viewport:{width:960,height:640},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.goto('http://127.0.0.1:8010/app/v2/full-3d/Nourishland-Hero-Living-v17.html?central=1&revision=knowledge-mesh-03-quiet-reveal-01',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.heroNourishland?.report.version==='quiet-reveal-01'&&window.heroPuzzle?.ready(),null,{timeout:150000});
 assert.equal(await page.locator('.nd-marker,.nd-card,.nd-picker,.nl-layer-card,.nl-layer-switch').count(),0);
 const report=await page.evaluate(()=>({welcomes:heroNourishland.report.welcomeAreas,routes:heroNourishland.routes.map(r=>({id:r.id,complete:r.complete})),state:heroNourishland.state,inner:heroInnerBiomes.report}));
 console.log(JSON.stringify({welcomes:report.welcomes,routes:report.routes,innerVersion:report.inner?.version}));
 assert.equal(report.welcomes,5);assert.equal(report.state.playing,false);assert.equal(report.state.pose.alpha,0);
 await page.screenshot({path:'artifacts/biome-showcase-current-master.png',timeout:60000});
 const camera=await page.evaluate(()=>heroPuzzle.camera.position.toArray());await page.evaluate(()=>heroNourishland.setPresentation(21));
 assert.deepEqual(await page.evaluate(()=>heroPuzzle.camera.position.toArray()),camera);assert.equal(await page.locator('[data-biome-stage]').getAttribute('data-showcase-open'),'1.000');
 await page.screenshot({path:'artifacts/biome-showcase-reveal.png',timeout:60000});
 await page.evaluate(()=>{heroInspection.setUnlocked(true);const p=heroNourishland.report.points.find(p=>p.id==='F-1').position,c=heroPuzzle.camera;c.up.set(0,1,0);c.position.set(p[0]+.07,p[1]+.13,p[2]+.18);c.lookAt(p[0],p[1]+.025,p[2]);c.updateMatrixWorld(true);heroNourishland.setPresentation(21);heroMetrics.renderSteadyFrame();});
 await page.screenshot({path:'artifacts/biome-showcase-orb-opening.png',timeout:60000});
 await page.evaluate(()=>heroNourishland.setPresentation(30));assert.equal(await page.locator('[data-biome-stage]').getAttribute('data-showcase-open'),'0.000');
 await page.getByRole('button',{name:'Replay knowledge animation'}).click();assert.equal(await page.evaluate(()=>heroNourishland.state.time),0);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>heroInspection.setCentral());
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const play=page.getByRole('button',{name:'Play knowledge animation',exact:true});await play.click();await page.getByRole('button',{name:'Pause knowledge animation',exact:true}).click();
 assert.equal(await page.evaluate(()=>heroNourishland.state.playing),false);assert.deepEqual(errors,[]);
 const result={masterRevision:'knowledge-mesh-03',showcaseRevision:'quiet-reveal-01',welcomeAreas:report.welcomes,routes:report.routes,accessStyleUI:false,revealChangesCamera:false,reducedMotionRespected:true,automaticOrbOpening:true,returnsToQuiet:true,phoneControls:true,physicalXR:false,errors};fs.writeFileSync('artifacts/biome-showcase-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){console.log(JSON.stringify({errors,body:await page?.locator('body').innerText({timeout:5000}).catch(()=>''),runtime:await page?.evaluate(()=>({ready:window.heroPuzzle?.ready(),layer:window.heroNourishland?.report?.version,status:document.querySelector('[data-biome-status]')?.textContent})).catch(()=>null)}));throw error;}finally{await browser.close();}
