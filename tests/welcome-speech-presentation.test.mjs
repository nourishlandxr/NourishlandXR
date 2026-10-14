import test from 'node:test';
import assert from 'node:assert/strict';
import {welcomeSpeechCaption,welcomePracticeTablePose} from '../app/services/welcomeSpeechPresentation.js';
test('subtitles wait for playback and use the pauseable audio clock',()=>{
 const state={loading:true,hasPlayed:false,text:'Nice to meet you, Andre. What is your favourite fruit?',duration:10,elapsed:0};
 assert.equal(welcomeSpeechCaption(state,'Fallback'), '');state.loading=false;state.hasPlayed=true;
 assert.equal(welcomeSpeechCaption(state),'Nice to meet you, Andre.');state.elapsed=9;assert.equal(welcomeSpeechCaption(state),'Nice to meet you, Andre.\n\nWhat is your favourite fruit?');state.paused=true;assert.equal(welcomeSpeechCaption(state),'Nice to meet you, Andre.\n\nWhat is your favourite fruit?');
});
test('table is reachable in front of the visitor, separated from the frame',()=>{
 const viewer=[1,0,0,0,0,1,0,0,0,0,1,0,2,1.6,3,1],frame={center:{x:2,y:1.6,z:1}};
 const pose=welcomePracticeTablePose(viewer,frame,.8);assert.equal(pose.x,2);assert.equal(pose.y,.8);assert.ok(Math.abs(pose.z-2.15)<1e-8);
});


test('an early narration call creates audio and retries a transient clip failure',async()=>{
 const {createWelcomePracticeVoice}=await import('../app/services/welcomePracticeVoice.js');const saved={AudioContext:globalThis.AudioContext,fetch:globalThis.fetch};let attempts=0,starts=0;
 class Context{constructor(){this.currentTime=0;this.state='running';this.destination={};}resume(){return Promise.resolve();}close(){return Promise.resolve();}decodeAudioData(){return Promise.resolve({duration:8});}createGain(){return {connect(){},gain:{setTargetAtTime(){}}};}createDynamicsCompressor(){return {connect(){},threshold:{},knee:{},ratio:{}};}createBufferSource(){return {connect(){},disconnect(){},stop(){},playbackRate:{},start(){starts++;}};}}
 globalThis.AudioContext=Context;globalThis.fetch=async()=>{attempts++;if(attempts===1)throw Error('Transient network failure');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};};const voice=createWelcomePracticeVoice();
 try{await voice.speak({id:'arrival',recorded:true,spoken:'Welcome.'});assert.equal(attempts,2);assert.equal(starts,1);assert.equal(voice.status().audible,true);assert.equal(voice.status().hasPlayed,true);assert.equal(welcomeSpeechCaption(voice.status()),'Welcome.');}finally{voice.destroy();Object.assign(globalThis,saved);}
});
