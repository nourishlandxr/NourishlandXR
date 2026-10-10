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
        feedback.tick(240,{sources:[source],beeClose:true});assert.deepEqual(pulses[1],[0,1],'the grab confirmation ends without restarting');
        assert.equal(pulses.length,2,'ordinary proximity must not vibrate');
        feedback.tick(360,{sources:[source],beeEncounters:['bee-1']});assert.deepEqual(pulses[2],[DEMO_FEEDBACK.beeApproachStrength,DEMO_FEEDBACK.beeApproachDuration]);
        assert.ok(pulses[2][0]>=.35 && pulses[2][1]>=100,'close bees give a clearly perceptible bounded pulse');
        feedback.tick(480,{sources:[source],beeEncounters:['bee-1'],beeAround:true});assert.equal(pulses.length,3,'ambient buzzing cannot interrupt the strong encounter pulse');
        feedback.tick(720,{sources:[source],beeEncounters:['bee-1']});assert.equal(pulses[3][0],0,'a close encounter ends after its bounded pulse');
        feedback.tick(1440,{sources:[source],beeEncounters:['bee-1']});assert.equal(pulses.filter(([strength])=>strength>0).length,2,'the same bee encounter never restarts buzzing');
        feedback.destroy();assert.equal(paused,1);assert.equal(closed,1);assert.equal(audio.src,'');feedback.start();assert.equal(plays,1);
    }finally{globalThis.Audio=originalAudio;globalThis.AudioContext=originalContext;}
});
