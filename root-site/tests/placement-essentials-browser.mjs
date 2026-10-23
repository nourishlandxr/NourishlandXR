// Uses the existing internal development-preview entry, never a public hardware bypass.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {revision as version} from '../tools/assemble-website.mjs';
const live=process.argv.includes('--public'),candidate=process.argv.includes('--candidate'),origin=live||candidate?'https://nourishland.org':'http://127.0.0.1:8010',label=live?'live':candidate?'candidate':'local',folder=`.tmp/creator-${version}`,payload=path.resolve(`root-site/releases/${version}/payload`);
fs.mkdirSync(folder,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 if(candidate)await context.route(origin+'/**',async route=>{let name=new URL(route.request().url()).pathname;if(name.endsWith('/'))name+='index.html';const f=path.resolve(payload,'.'+name);if(f.startsWith(payload+path.sep)&&fs.existsSync(f)&&fs.statSync(f).isFile())await route.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream'});else await route.continue();});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/app/?mode=welcome',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1000);
 await p.evaluate(async()=>{
  window.__practiceMediaRequests=0;window.__practiceSpeechRequests=0;
  if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{window.__practiceMediaRequests++;throw Error('Microphone not allowed in placement QA');};
  window.SpeechRecognition=window.webkitSpeechRecognition=class{constructor(){window.__practiceSpeechRequests++;throw Error('Speech not allowed in placement QA');}};
  const {startTemporaryArDemo}=await import('/xr/screens/temporaryArDemo.js');await startTemporaryArDemo(document.getElementById('app'),{chapter:'creator',refinementPreview:'placement-qa'});
 });
 const place=p.locator('[data-tryit-place]');await place.waitFor();await place.click();const orb=p.locator('.tryit-sim-marker-plant').first();await orb.waitFor();assert.equal(await orb.getAttribute('role'),'button');
 await orb.click();const profile=p.locator('.tryit-sim-plant-profile').first();await profile.waitFor();await profile.locator('[data-pim-node-id]').first().waitFor();assert((await profile.locator('[data-pim-node-id]').count())>=6);
 const cell=profile.locator('[data-pim-node-id]').first();await cell.hover();await p.mouse.down();await p.waitForTimeout(950);await p.mouse.up();
 await p.screenshot({path:`${folder}/${label}-practice-orb.png`});await orb.click();
 await place.click();const note=p.locator('.tryit-sim-marker-note').first();await note.waitFor();await note.click();assert.equal(await p.getByRole('button',{name:'Speak to Zinnia',exact:true}).count(),0);
 await p.getByRole('button',{name:'Edit Note',exact:true}).click();const form=p.locator('.note-edit-workspace form');await form.locator('[name=title]').fill('A practice observation');await form.locator('[name=content]').fill('New buds beside the path.');await form.getByRole('button',{name:'Save Note',exact:true}).click();
 await place.click();const totem=p.locator('.tryit-sim-totem-system').first();await totem.waitFor();await totem.locator('[data-totem-card]').first().click();
 assert.equal(await p.evaluate(()=>window.__practiceMediaRequests),0);assert.equal(await p.evaluate(()=>window.__practiceSpeechRequests),0);
 await p.screenshot({path:`${folder}/${label}-practice-complete.png`});assert.deepEqual(errors,[]);
 const result={version,label,orbOpensHoneycomb:true,noteEditsWithoutVoice:true,totemSignsWork:true,microphoneRequests:0,speechRequests:0,errors,physicalXR:false};fs.writeFileSync(`${folder}/${label}-placement.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error);throw error;}finally{await browser.close();}
