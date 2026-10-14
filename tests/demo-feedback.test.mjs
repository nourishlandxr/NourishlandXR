import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoFeedback,DEMO_FEEDBACK} from '../app/services/demoFeedback.js';
test('demo music streams, touch tones release resources, haptics throttle and stop on exit',t=>{
    const originalAudio=globalThis.Audio,originalContext=globalThis.AudioContext;
    let audio,context,plays=0,paused=0,closed=0,tones=0,now=0;t.mock.method(performance,'now',()=>now);
    globalThis.Audio=class {constructor(src){this.src=src;audio=this;}play(){plays++;return Promise.resolve();}pause(){paused++;}removeAttribute(){this.src='';}load(){}};
    globalThis.AudioContext=class {constructor(){context=this;}state='running';currentTime=1;destination={};resume(){return Promise.resolve();}close(){closed++;return Promise.resolve();}createOscillator(){tones++;return {frequency:{},connect(){},disconnect(){},start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}};
    try{
        const feedback=createDemoFeedback(),tick=(time,options)=>{now=time;feedback.tick(time,options);};feedback.start();assert.equal(plays,1);assert.equal(audio.preload,'metadata');assert.equal(audio.loop,true);assert.equal(audio.volume,DEMO_FEEDBACK.musicVolume);
        feedback.sound('cell');assert.equal(tones,2);feedback.sound('menu');assert.equal(tones,2);context.currentTime+=.1;feedback.sound('practice-press');assert.equal(tones,3);feedback.sound('practice-reward');assert.equal(tones,6,'success chord is never swallowed by the final button tap');feedback.sound('practice-reward');assert.equal(tones,6,'both controllers share one success chord');
        const pulses=[],source={gamepad:{hapticActuators:[{pulse:(...args)=>{pulses.push(args);return Promise.resolve();}}]}};
        feedback.pulse(source,DEMO_FEEDBACK.holdStrength,100);
        tick(120,{sources:[source],heldSource:source});assert.equal(pulses.length,1);assert.equal(pulses[0][0],DEMO_FEEDBACK.holdStrength);
        tick(121,{sources:[source],beeClose:true});assert.equal(pulses.length,1);
        tick(240,{sources:[source],beeClose:true});assert.equal(pulses.length,1,'bounded grab confirmation finishes without truncation or restart');
        assert.equal(pulses.length,1,'ordinary proximity must not vibrate');
        tick(360,{sources:[source],beeEncounters:['bee-1']});
        assert.ok(pulses[1][0]>=.15 && pulses[1][0]<=.32 && pulses[1][1]>=30 && pulses[1][1]<=75,'close bees give a brief randomized greeting');
        tick(480,{sources:[source],beeEncounters:['bee-1'],beeAround:true});assert.equal(pulses.filter(([strength])=>strength>0).length,2,'ambient proximity stays quiet during the shared cooldown');
        tick(720,{sources:[source],beeEncounters:['bee-1']});assert.equal(pulses.length,2,'a bounded encounter finishes without extra vibration commands');
        tick(1440,{sources:[source],beeEncounters:['bee-1']});assert.equal(pulses.filter(([strength])=>strength>0).length,2,'the same bee encounter never restarts buzzing');
        feedback.pulse(source,.2,500);tick(1560,{sources:[]});assert.deepEqual(pulses.at(-1),[0,1],'disconnect immediately stops an active pulse');feedback.destroy();assert.equal(paused,1);assert.equal(closed,1);assert.equal(audio.src,'');feedback.start();assert.equal(plays,1);
    }finally{globalThis.Audio=originalAudio;globalThis.AudioContext=originalContext;}
});


test('painting sustains a quiet tone and low haptic level until release',t=>{
 const saved={Audio:globalThis.Audio,AudioContext:globalThis.AudioContext};let now=0,tones=0;const gains=[],pulses=[];t.mock.method(performance,'now',()=>now);
 globalThis.Audio=class{play(){return Promise.resolve();}pause(){}removeAttribute(){}load(){}};globalThis.AudioContext=class{state='running';currentTime=0;destination={};resume(){return Promise.resolve();}close(){return Promise.resolve();}createGain(){return {connect(){},disconnect(){},gain:{value:0,setTargetAtTime:value=>gains.push(value)}};}createOscillator(){tones++;return {frequency:{},connect(){},disconnect(){},start(){},stop(){}};}};
 const source={gamepad:{hapticActuators:[{pulse:(...args)=>{pulses.push(args);return Promise.resolve();}}]}},feedback=createDemoFeedback();
 try{feedback.start();for(let i=0;i<20;i++){now=i*20;feedback.painting(source,true);}assert.equal(tones,1,'one continuous oscillator, no repeated notes');assert.ok(pulses.every(([strength,duration])=>strength<=.05 && duration>=120));feedback.painting(source,false);assert.deepEqual(pulses.at(-1),[0,1]);assert.equal(gains.at(-1),0);}
 finally{feedback.destroy();Object.assign(globalThis,saved);}
});
