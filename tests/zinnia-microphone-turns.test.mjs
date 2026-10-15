import test from 'node:test';
import assert from 'node:assert/strict';
import {createZinniaVoice} from '../app/services/zinniaVoice.js';
import {createZinniaPlantDiscovery} from '../app/services/zinniaPlantDiscovery.js';
import {createWelcomeVisitorIntroduction} from '../app/services/welcomeVisitorIntroduction.js';

const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function narratorFixture(){let handlers,playing=false;return {factory(options){handlers=options;return {unlock(){},stop(){playing=false;},speak(){playing=true;},status:()=>({playing,paused:false}),pause(){},resume(){},speechLevel:()=>0,destroy(){}};},end(){playing=false;handlers.onEnded();}};}

test('Quest recorder keeps final Opus chunks, posts them to transcription and passes the heard words to the caller',async()=>{
    const saved={fetch:globalThis.fetch,MediaRecorder:globalThis.MediaRecorder,AudioContext:globalThis.AudioContext},navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
    let capture,trackStopped=false,payload;const track={readyState:'live',stop(){trackStopped=true;this.readyState='ended';}},messages=[],heard=[];
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track],getAudioTracks:()=>[track]})}}});
    globalThis.AudioContext=undefined;
    globalThis.MediaRecorder=class {static isTypeSupported(value){return value==='audio/webm;codecs=opus';}constructor(stream,options){capture=this;this.mimeType=options.mimeType;this.state='inactive';}start(interval){this.interval=interval;this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob([new Uint8Array(256)],{type:this.mimeType})});this.stopped=this.onstop?.();}};
    globalThis.fetch=async(url,options)=>{if(url.endsWith('/capabilities'))return {ok:true,json:async()=>({enabled:true,maximumSeconds:20})};assert.match(url,/\/zinnia\/transcribe$/);payload=JSON.parse(options.body);return {ok:true,json:async()=>({text:'Please water the strawberry bed.'})};};
    const narrator=narratorFixture(),voice=createZinniaVoice({createNarrator:narrator.factory,onText:text=>heard.push(text),onStatus:(message,info)=>messages.push({message,...info})});
    try{await voice.listen();assert.equal(capture.interval,250);assert.equal(voice.status().listening,true);voice.finish();await capture.stopped;assert.equal(payload.mime,'audio/webm;codecs=opus');assert.equal(Buffer.from(payload.audio,'base64').length,256);assert.deepEqual(heard,['Please water the strawberry bed.']);assert.equal(trackStopped,true);assert.equal(voice.status().listening,undefined);assert.ok(messages.some(item=>item.message==='' && item.listening));}
    finally{voice.destroy();Object.assign(globalThis,saved);if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;}
});

test('voice.speak completes after actual playback, not when speech bytes arrive',async()=>{
    const fixture=narratorFixture(),voice=createZinniaVoice({createNarrator:fixture.factory});let resolved=false;
    try{const spoken=voice.speak('Which plant would you like?').then(()=>{resolved=true;});await flush();assert.equal(resolved,false);fixture.end();await spoken;assert.equal(resolved,true);const cancelled=voice.speak('Another prompt');await flush();voice.cancel();assert.equal(await cancelled,false);}
    finally{voice.destroy();}
});

test('Note conversation listens after each finished prompt and creates exactly the dictated text and chosen colour',async()=>{
    let callbacks,pending,listens=0,ready;
    const discovery=createZinniaPlantDiscovery({mode:'note',microphoneReady:()=>true,onReady:draft=>{ready=draft;return true;},createVoice:handlers=>{callbacks=handlers;return {speak:()=>new Promise(resolve=>{pending=resolve;}),listen(){listens++;handlers.onStatus('Listening…',{listening:true});},cancel(){pending?.(false);},finish(){},destroy(){pending?.(false);}};}});
    const promptDone=async()=>{pending(true);await flush();};
    try{
        discovery.begin();await flush();assert.equal(listens,0);await promptDone();assert.equal(listens,1);assert.equal(discovery.state().listening,true);
        callbacks.onText('Water the strawberries on Friday.');assert.equal(discovery.state().phase,'confirm-note');await promptDone();assert.equal(listens,2);
        callbacks.onText('yes');assert.equal(discovery.state().phase,'color');await promptDone();assert.equal(listens,3);
        callbacks.onText('blue');assert.equal(discovery.state().phase,'confirm-color');await promptDone();assert.equal(listens,4);
        callbacks.onText('yes');assert.deepEqual(ready,{text:'Water the strawberries on Friday.',color:'blue'});assert.equal(discovery.state().phase,'ready');
    }finally{discovery.destroy();}
});

test('permission opt-out, sample selection and disposal never start automatic microphone capture',async()=>{
    for(const action of ['opt-out','sample','destroy']){let resolve,listens=0;const discovery=createZinniaPlantDiscovery({microphoneReady:()=>action!=='opt-out',createVoice:()=>({speak:()=>new Promise(done=>{resolve=done;}),listen(){listens++;},cancel(){resolve?.(false);},destroy(){resolve?.(false);}})});discovery.begin();if(action==='sample')discovery.activate('sample');if(action==='destroy')discovery.destroy();resolve(true);await flush();assert.equal(listens,0);discovery.destroy();}
});

test('tutorial does not cancel a microphone recording or transcription at its 20-second visitor timeout',()=>{
    let handlers,cancelled=0;const dialog=createWelcomeVisitorIntroduction({createVoice:options=>(handlers=options,{listen(){},finish(){},cancel(){cancelled++;},destroy(){}})});
    try{dialog.begin();const baseline=cancelled;handlers.onStatus('Listening…',{listening:true});dialog.update(21,{ready:true});assert.equal(dialog.state().phase,'name');assert.equal(cancelled,baseline);handlers.onStatus('Understanding your words…',{processing:true});dialog.update(10,{ready:true});assert.equal(dialog.state().phase,'name');assert.equal(cancelled,baseline);handlers.onText('My name is Sam');assert.equal(dialog.state().phase,'confirm');assert.equal(dialog.state().candidate,'Sam');}
    finally{dialog.destroy();}
});


test('finish during the connection check cancels capture before microphone access',async()=>{
 const saved=globalThis.fetch,descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let resolve,captures=0;const states=[];globalThis.fetch=()=>new Promise(done=>resolve=done);Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>{captures++;throw Error('must not capture');}}}});
 const voice=createZinniaVoice({createNarrator:()=>({stop(){},destroy(){},status:()=>({playing:false})}),onStatus:(_message,state)=>states.push(state)});
 try{const pending=voice.listen();voice.finish();resolve({ok:true,json:async()=>({enabled:true})});await pending;assert.equal(captures,0);assert.equal(states.at(-1).listening,false);}
 finally{voice.destroy();globalThis.fetch=saved;if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});

test('long dictated Note readback speaks and displays every word without the former 1200-character cut-off',async()=>{
 let callbacks,playing=false;const spoken=[],shown=[],text=Array.from({length:320},(_,i)=>'word'+i).join(' ');
 const voice=createZinniaVoice({onPrompt:part=>shown.push(part),createNarrator:handlers=>(callbacks=handlers,{unlock(){},stop(){playing=false;},status:()=>({playing,paused:false}),async speak(clip){playing=true;spoken.push(clip.spoken);queueMicrotask(()=>{playing=false;callbacks.onEnded();});},destroy(){}})});
 try{assert.equal(await voice.speak(text),true);assert.equal(spoken.join(' '),text);assert.deepEqual(shown,spoken);assert.ok(spoken.every(part=>part.length<=220));}finally{voice.destroy();}
});

test('microphone metering publishes real measured levels while recording',async t=>{
 const saved={fetch:globalThis.fetch,MediaRecorder:globalThis.MediaRecorder,AudioContext:globalThis.AudioContext},descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator'),states=[];const track={readyState:'live',stop(){}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track],getAudioTracks:()=>[track]})}}});
 globalThis.fetch=async()=>({ok:true,json:async()=>({enabled:true})});globalThis.MediaRecorder=class {static isTypeSupported(){return true;}start(){this.state='recording';}stop(){this.state='inactive';}};
 globalThis.AudioContext=class {state='running';createAnalyser(){return {fftSize:512,getByteTimeDomainData:data=>data.fill(144)};}createMediaStreamSource(){return {connect(){}};}resume(){return Promise.resolve();}close(){return Promise.resolve();}};
 t.mock.timers.enable({apis:['setInterval']});const voice=createZinniaVoice({createNarrator:()=>({stop(){},destroy(){},status:()=>({playing:false})}),onStatus:(_message,state)=>states.push(state)});
 try{await voice.listen();t.mock.timers.tick(50);assert.ok(states.some(s=>s.listening && s.level>.1),'meter reports the captured signal instead of a decorative animation');}finally{voice.destroy();t.mock.timers.reset();Object.assign(globalThis,saved);if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
