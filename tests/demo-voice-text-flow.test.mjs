import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoVoiceTextFlow,spokenFrameLead} from '../app/services/demoVoiceTextFlow.js';
import {claimZinniaVoice,forgetZinniaVoice,replayZinniaVoice} from '../app/services/zinniaVoiceCoordinator.js';
import {PROJECT_NARRATION_CATALOG} from '../app/services/projectNarrationCatalog.js';
import {createProjectNarration} from '../app/services/projectNarration.js';

function harness(){let time=0,id=0,current,done=0;const timers=new Map(),events=[],spoken=[];
    const voice={speak(text,options){current=options;spoken.push(text);},stop(){},pause(){current.onState({paused:true});},resume(){current.onState({playing:true,paused:false});}};
    const flow=createDemoVoiceTextFlow({paragraphs:['First explanation. Additional reference stays visible.','Second explanation.'],voice,readingTime:()=>1000,onChange:e=>events.push(e),onComplete:()=>done++,now:()=>time,setTimer:(f,delay)=>{timers.set(++id,{f,at:time+delay});return id;},clearTimer:id=>timers.delete(id)});
    return {flow,events,spoken,get done(){return done;},finishAudio:()=>current.onComplete(),interrupt:()=>current.onInterrupt(),tick(ms){time+=ms;for(const [id,t]of [...timers])if(t.at<=time){timers.delete(id);t.f();}}};
}
test('text waits for both narration and reading time, including slow speech loading',()=>{const h=harness();try{h.flow.start();h.tick(20000);assert.equal(h.events.length,1);h.finishAudio();assert.equal(h.events.length,2);h.finishAudio();assert.equal(h.done,0);h.tick(1000);assert.equal(h.done,1);h.finishAudio();assert.equal(h.done,1);}finally{h.flow.cancel();}});
test('pause holds text after audio ends; replay resets text and speech to the current explanation',()=>{const h=harness();try{h.flow.start();h.tick(300);h.flow.pause();h.finishAudio();h.tick(10000);assert.equal(h.events.length,1);h.flow.resume();h.tick(699);assert.equal(h.events.length,1);h.tick(1);assert.equal(h.events.length,2);h.flow.replay();assert.equal(h.events.at(-1).index,0);assert.equal(h.spoken.at(-1),h.spoken[0]);}finally{h.flow.cancel();}});
test('microphone handover holds the paragraph and global replay stays with the Frame',()=>{const h=harness(),incidental={cancel(){},status:()=>({playing:true}),replay(){throw Error('Wrong replay target');}};try{h.flow.start();h.interrupt();h.tick(10000);assert.equal(h.events.length,1);claimZinniaVoice(incidental);replayZinniaVoice();assert.equal(h.events.at(-1).index,0);assert.equal(h.spoken.length,2);h.flow.cancel();h.tick(10000);assert.equal(h.done,0);}finally{h.flow.cancel();forgetZinniaVoice(incidental);}});
test('voice leads with a bounded explanation while the Frame retains supporting detail',()=>{const text='Here is the main idea. Here is how you can try it. Detailed references remain in the Frame. More supporting information.';assert.equal(spokenFrameLead(text),'Here is the main idea. Here is how you can try it.');});

test('a short bundled opening keeps its approved recording without synthesis',()=>{const opening=Object.values(PROJECT_NARRATION_CATALOG)[0].text;assert.equal(spokenFrameLead(opening+' Supporting detail belongs in the Frame.'),opening);});

test('an unavailable audio device leaves the Frame readable and able to continue',()=>{
    const previous=globalThis.document,previousContext=globalThis.AudioContext;globalThis.document=new EventTarget();globalThis.AudioContext=undefined;
    const voice=createProjectNarration();let timeout,completed=0;
    const flow=createDemoVoiceTextFlow({paragraphs:['A readable explanation.'],voice,readingTime:()=>1000,setTimer:callback=>{timeout=callback;return 1;},clearTimer(){},onComplete:()=>completed++});
    try{flow.start();assert.equal(flow.snapshot().paragraph,'A readable explanation.');assert.equal(completed,0);timeout();assert.equal(completed,1);}finally{flow.cancel();voice.destroy();globalThis.document=previous;globalThis.AudioContext=previousContext;}
});

test('demo audio and reading time wait for visual readiness, and cancelling removes the wait',()=>{
    let time=0,ready=false,id=0,completed=0,played=0;const timers=new Map(),changes=[];
    const create=()=>createDemoVoiceTextFlow({paragraphs:['Look at this loaded object.'],voice:{speak(_text,options){played++;options.onComplete();}},isReady:()=>ready,readingTime:()=>500,now:()=>time,setTimer:(f,delay)=>{timers.set(++id,{f,at:time+delay});return id;},clearTimer:id=>timers.delete(id),onChange:event=>changes.push(event),onComplete:()=>completed++});
    const tick=ms=>{time+=ms;for(const [key,timer]of [...timers])if(timer.at<=time){timers.delete(key);timer.f();}};
    const first=create();first.start();tick(10000);assert.equal(played,0);assert.equal(changes.length,0);assert.equal(completed,0);first.cancel();ready=true;tick(1000);assert.equal(played,0);assert.equal(timers.size,0);
    const second=create();ready=false;second.start();tick(10000);assert.equal(played,0);ready=true;tick(100);assert.equal(played,1);assert.equal(completed,0);tick(500);assert.equal(completed,1);second.cancel();
});
