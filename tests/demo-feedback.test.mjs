import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoFeedback,DEMO_FEEDBACK} from '../app/services/demoFeedback.js';
test('demo music streams, touch tones release resources, haptics throttle and stop on exit',()=>{
    const originalAudio=globalThis.Audio,originalContext=globalThis.AudioContext;
    let audio,plays=0,paused=0,closed=0,tones=0;
    globalThis.Audio=class {constructor(src){this.src=src;audio=this;}play(){plays++;return Promise.resolve();}pause(){paused++;}removeAttribute(){this.src='';}load(){}};
    globalThis.AudioContext=class {state='running';currentTime=1;destination={};resume(){return Promise.resolve();}close(){closed++;return Promise.resolve();}createOscillator(){tones++;return {frequency:{},connect(){},disconnect(){},start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}};
    try{
        const feedback=createDemoFeedback();feedback.start();assert.equal(plays,1);assert.equal(audio.preload,'metadata');assert.equal(audio.loop,true);assert.equal(audio.volume,DEMO_FEEDBACK.musicVolume);
        feedback.sound('cell');assert.equal(tones,2);feedback.sound('menu');assert.equal(tones,2);
        const pulses=[],source={gamepad:{hapticActuators:[{pulse:(...args)=>{pulses.push(args);return Promise.resolve();}}]}};
        feedback.pulse(source,DEMO_FEEDBACK.holdStrength,100);
        feedback.tick(120,{sources:[source],heldSource:source});assert.equal(pulses.length,1);assert.equal(pulses[0][0],DEMO_FEEDBACK.holdStrength);
        feedback.tick(121,{sources:[source],beeClose:true});assert.equal(pulses.length,1);
        feedback.tick(240,{sources:[source],beeClose:true});assert.equal(pulses[1][0],0,'proximity must never vibrate');
        feedback.tick(360,{sources:[source],beeContactSources:[source]});assert.deepEqual(pulses[2],[DEMO_FEEDBACK.beeStrength,45]);
        feedback.tick(480,{sources:[source],beeContactSources:[source]});assert.equal(pulses[3][0],0,'sustained contact has a quiet cooldown');
        feedback.tick(1440,{sources:[source],beeContactSources:[source]});assert.deepEqual(pulses[4],[DEMO_FEEDBACK.beeStrength,45]);
        feedback.destroy();assert.equal(paused,1);assert.equal(closed,1);assert.equal(audio.src,'');feedback.start();assert.equal(plays,1);
    }finally{globalThis.Audio=originalAudio;globalThis.AudioContext=originalContext;}
});
