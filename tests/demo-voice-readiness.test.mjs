import {demoVoiceDetectionState} from '../app/services/demoVoiceDetectionBar.js';
import {clearDaleysPlantSearchCache} from '../app/services/daleysPlantSearch.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createZinniaPlantDiscovery,zinniaPlantButtons,zinniaDiscoveryInstruction} from '../app/services/zinniaPlantDiscovery.js';
import {ZINNIA_HEARS_YOU_LINE} from '../app/services/zinniaConversationInput.js';
import {createWelcomeComfortOptions} from '../app/services/welcomeComfortOptions.js';
import {panelSettingsControls} from '../app/services/pimInfoPanel.js';
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
test('both demo voice questions show exactly the words Zinnia speaks before listening',async()=>{
 for(const mode of ['plant','note']){
  const spoken=[],dialog=createZinniaPlantDiscovery({mode,microphoneReady:()=>false,createVoice:()=>({speak:async value=>{spoken.push(value);return true;},listen(){throw Error('unexpected listening');},cancel(){},destroy(){}})});
  try{dialog.begin();await flush();assert.equal(spoken.length,1);assert.equal(dialog.state().message,spoken[0]);assert.ok(spoken[0].startsWith(`${ZINNIA_HEARS_YOU_LINE} `));}
  finally{dialog.destroy();}
 }
});
test('only a nonempty microphone transcript removes the Moringa fallback for this demo session',async()=>{
 const saved=globalThis.sessionStorage,values=new Map();globalThis.sessionStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};let callbacks;
 const voice=handlers=>(callbacks=handlers,{speak:async()=>false,listen(){},cancel(){},destroy(){}});const discovery=createZinniaPlantDiscovery({mode:'note',createVoice:voice});
 try{const first=createZinniaPlantDiscovery({createVoice:voice});assert.equal(first.state().voiceConfirmed,false);first.destroy();discovery.begin();callbacks=null;let notes;const note=createZinniaPlantDiscovery({mode:'note',createVoice:h=>(notes=h,{speak:async()=>false,listen(){},cancel(){},destroy(){}})});notes.onText('');assert.equal(note.state().voiceConfirmed,false);notes.onStatus('Microphone denied',{error:'microphone'});assert.equal(note.state().voiceConfirmed,false);notes.onText('Water the strawberry bed.');assert.equal(note.state().voiceConfirmed,true);assert.equal(note.state().query,'Water the strawberry bed.');const plant=createZinniaPlantDiscovery({createVoice:voice});assert.equal(plant.state().voiceConfirmed,true);assert.equal(zinniaPlantButtons(plant.state()).some(b=>b.action==='sample'),false);plant.activate('sample');assert.equal(plant.state().phase,'idle');plant.destroy();note.destroy();}finally{discovery.destroy();globalThis.sessionStorage=saved;}
});
test('Note prompts display exactly the text sent to narration through confirmation and colour choice',async()=>{
 let callbacks,ready,dialog;const spoken=[];dialog=createZinniaPlantDiscovery({mode:'note',microphoneReady:()=>true,onReady:value=>{ready=value;return true;},createVoice:h=>(callbacks=h,{speak:async text=>{spoken.push(text);assert.equal(dialog.state().message,text);return true;},listen(){},cancel(){},destroy(){}})});
 try{dialog.begin();await flush();for(const reply of ['Please write a note saying Water on Friday.','yes','blue','yes']){callbacks.onText(reply);await flush();}assert.deepEqual(ready,{text:'Water on Friday.',color:'blue'});assert.ok(spoken.length>=4);}finally{dialog.destroy();}
});
test('Note and custom Orb have compact, named microphone and finish controls with valid disabled states',()=>{for(const mode of ['note','plant']){const idle=zinniaPlantButtons({mode,phase:'idle',listening:false},{voiceControls:true}),listening=zinniaPlantButtons({mode,phase:'idle',listening:true},{voiceControls:true});for(const controls of [idle,listening])for(const name of ['voice','done','cancel']){const button=controls.find(b=>b.action===name);assert.ok(button.icon);assert.ok(button.label);assert.ok(button.width>=48 && button.width<=72);}assert.equal(idle.find(b=>b.action==='done').disabled,true);assert.equal(listening.find(b=>b.action==='voice').disabled,true);assert.equal(listening.find(b=>b.action==='done').disabled,false);}});
test('tutorial has no floating or wrist pause button, while main demo retains pause',()=>{
 const source=fs.readFileSync(new URL('../app/services/welcomePracticeScene.js',import.meta.url),'utf8');assert.doesNotMatch(source,/pauseControl|Living Frame pause and play/);
 const stage={trials:{active:null},snapshot:()=>({settingsAvailable:true,voice:{},trials:{}})};const menu=createWelcomeComfortOptions({stage});menu.act('audio');assert.equal(menu.context().items.some(b=>b.action==='Comfort:pause'),false);
 const params={soundOpen:true,demoSound:{},voiceControls:{allowPause:false}};assert.equal(panelSettingsControls(params).some(b=>b.action==='VoicePause'),false);assert.ok(panelSettingsControls({...params,voiceControls:{allowPause:true}}).some(b=>b.action==='VoicePause'));
});

test('custom Orb microphone turns search, confirm the chosen plant and deliver the profile without a Moringa step',async()=>{
 const saved={fetch:globalThis.fetch,Image:globalThis.Image,sessionStorage:globalThis.sessionStorage};const values=new Map();globalThis.sessionStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};globalThis.Image=class {set src(value){if(value)queueMicrotask(()=>this.onload?.());}};globalThis.fetch=async url=>{assert.match(String(url),/plant-search\/daleys/);return {ok:true,json:async()=>({results:[{source:'daleys',externalId:'daleys-lime',commonName:'Finger Lime',scientificName:'Citrus australasica',thumbnailUrl:'https://example.test/lime.jpg',sourceUrl:'https://example.test/lime',description:'A citrus plant.'}]})};};clearDaleysPlantSearchCache();
 let callbacks,ready,listens=0;const dialog=createZinniaPlantDiscovery({microphoneReady:()=>true,onReady:profile=>{ready=profile;return true;},createVoice:h=>(callbacks=h,{speak:async text=>{assert.equal(dialog.state().message,text);return true;},listen(){listens++;},cancel(){},destroy(){}})});
 try{dialog.begin();await flush();assert.equal(listens,1);callbacks.onText('Please find finger lime');await new Promise(setImmediate);assert.equal(dialog.state().phase,'results');assert.equal(dialog.state().voiceConfirmed,true);assert.equal(zinniaPlantButtons(dialog.state()).some(b=>b.action==='sample'),false);callbacks.onText('first');await flush();assert.equal(dialog.state().phase,'confirm');callbacks.onText('yes');await new Promise(setImmediate);assert.equal(dialog.state().phase,'ready');assert.equal(ready.common_name,'Finger Lime');assert.ok(listens>=3);}finally{dialog.destroy();clearDaleysPlantSearchCache();Object.assign(globalThis,saved);}
});

test('voice detection bar keeps its coloured level meter without announcing detection',()=>{const silent=demoVoiceDetectionState({listening:true,voiceLevel:0}),heard=demoVoiceDetectionState({listening:true,voiceLevel:.04}),processing=demoVoiceDetectionState({processing:true,voiceLevel:1}),error=demoVoiceDetectionState({voiceError:'microphone'}),source=fs.readFileSync(new URL('../app/services/demoVoiceDetectionBar.js',import.meta.url),'utf8');assert.equal(silent.percent,0);assert.equal(heard.percent,50);assert.equal(silent.label,heard.label);assert.doesNotMatch(heard.label,/detected|waiting|percent/i);assert.equal(processing.percent,0);assert.match(processing.label,/Processing/);assert.match(error.label,/unavailable/);assert.match(source,/createLinearGradient/);assert.match(source,/linear-gradient\(90deg/);});
test('demo discovery keeps Zinnia subtitles separate from short action instructions',async()=>{
 let present;const spoken=[];const discovery=createZinniaPlantDiscovery({microphoneReady:()=>false,waitForPresentation:()=>new Promise(resolve=>present=resolve),createVoice:()=>({speak:async value=>{spoken.push(value);return true;},listen(){},cancel(){},destroy(){}})});
 try{discovery.begin();assert.equal(spoken.length,0);assert.match(discovery.state().message,/actually hear you/);assert.match(zinniaDiscoveryInstruction(discovery.state()),/microphone/);present();await flush();assert.deepEqual(spoken,[discovery.state().message]);assert.doesNotMatch(zinniaDiscoveryInstruction({mode:'plant',phase:'results',listening:true}),/detected/i);}
 finally{discovery.destroy();}
});
