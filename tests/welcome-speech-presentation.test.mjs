import test from 'node:test';
import assert from 'node:assert/strict';
import {welcomeSpeechCaption,welcomePracticeTablePose,welcomeLessonCaption,drawWelcomeText} from '../app/services/welcomeSpeechPresentation.js';
import {WELCOME_PRACTICE_LESSONS} from '../app/services/welcomePracticeContent.js';
import {WELCOME_NARRATION_BANK} from '../app/services/welcomeNarrationBank.js';

test('opening slides have exact saved Zinnia audio, including the welcome',()=>{
 for(const id of ['title','arrival','table','face','living-frame','controls-intro']){
  const lesson=WELCOME_PRACTICE_LESSONS.find(l=>l.id===id);
  assert.equal(WELCOME_NARRATION_BANK.catalog[id].text,lesson.spoken,id);
  for(const paragraph of lesson.paragraphs || [])assert.ok(lesson.spoken.includes(paragraph),id+' paragraph matches speech');
 }
 const removed=WELCOME_PRACTICE_LESSONS.find(l=>l.id==='zinnia');assert.equal(removed.silent,true);assert.equal(removed.spoken,'');assert.doesNotMatch(removed.caption,/Here I am/i);
});
test('opening paragraph reveal follows playback and holds its position while paused',()=>{
 const lesson=WELCOME_PRACTICE_LESSONS.find(l=>l.id==='title');
 const state={loading:false,hasPlayed:true,elapsed:0,duration:20};
 assert.equal(welcomeLessonCaption(lesson,30,state),lesson.paragraphs[0]);
 state.elapsed=15;state.paused=true;const paused=welcomeLessonCaption(lesson,30,state);
 assert.equal(paused,lesson.paragraphs.join('\n\n'));
 assert.equal(welcomeLessonCaption(lesson,50,state),paused);
 state.elapsed=0;assert.equal(welcomeLessonCaption(lesson,50,state),lesson.paragraphs[0]);
});
test('opening layout keeps font size and paragraph positions stable during reveal',()=>{
 for(const lesson of WELCOME_PRACTICE_LESSONS.filter(l=>l.paragraphs)){
  const render=caption=>{const drawn=[],ctx={font:'',measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.55};},fillText(text,x,y){drawn.push({text,y,font:this.font});}};
   drawWelcomeText(ctx,{title:lesson.title,caption,layoutCaption:lesson.paragraphs.join('\n\n'),width:900,top:260,bottom:850,titleSize:88,bodySize:40});return drawn;};
  const partial=render(lesson.paragraphs[0]),full=render(lesson.paragraphs.join('\n\n'));
  assert.deepEqual(full.slice(0,partial.length),partial,lesson.id);
  assert.ok(full.at(-1).y<850,lesson.id+' stays within body window');
 }
});
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
