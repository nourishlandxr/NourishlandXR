import {DEMO_NARRATION_BANK} from './demoNarrationBank.js';
import {createWelcomePracticeVoice} from './welcomePracticeVoice.js';
import {PROJECT_NARRATION_CATALOG} from './projectNarrationCatalog.js';
export const normalizeNarrationText=value=>String(value || '').replace(/[’‘]/g,"'").replace(/[–—]/g,', ').replace(/\s+/g,' ').trim();
const recordings=Object.entries(PROJECT_NARRATION_CATALOG).sort((a,b)=>b[1].text.length-a[1].text.length);
export function projectNarrationClips(text){
 let remaining=normalizeNarrationText(Array.isArray(text)?text.join(' '):text),queue=[];
 while(remaining){const match=recordings.find(([,clip])=>remaining===clip.text || remaining.startsWith(clip.text+' '));
  if(match){queue.push(match[0]);remaining=remaining.slice(match[1].text.length).trim();}
  else {const end=remaining.search(/[.!?](?:\s|$)/);remaining=end<0?'':remaining.slice(end+1).trim();}
 }return queue;
}
export function projectNarrationSegments(text,{demo=false}={}){
 const available=demo?Object.entries(DEMO_NARRATION_BANK?.catalog || {}).sort((a,b)=>b[1].text.length-a[1].text.length):recordings;
 let remaining=normalizeNarrationText(Array.isArray(text)?text.join(' '):text),queue=[];
 while(remaining){const match=available.find(([,clip])=>remaining===clip.text || remaining.startsWith(clip.text+' '));
  if(match){queue.push({id:match[0],recorded:true,spoken:match[1].text});remaining=remaining.slice(match[1].text.length).trim();}
  else {const end=remaining.search(/[.!?](?:\s|$)/),spoken=end<0?remaining:remaining.slice(0,end+1);queue.push({id:'project-guidance',spoken,spokenOverride:true});remaining=end<0?'':remaining.slice(end+1).trim();}
 }return queue;
}
export function createProjectNarration({onChange=()=>{},demo=false,isVisible=()=>!document.hidden}={}){
 let queue=[],lastText='',disposed=false,visibilityPaused=false,controls={};
 const voice=createWelcomePracticeVoice({assetBase:new URL(demo && DEMO_NARRATION_BANK?'../'+DEMO_NARRATION_BANK.base:'../assets/project-narration/',import.meta.url),initialId:demo?DEMO_NARRATION_BANK?.clips?.[0] || 'demo-opening':'z-84c48915',maxCached:4,fetchCache:'force-cache',normalizeLoudness:demo,onChange:state=>{onChange(state);controls.onState?.(state);if(state.muted && controls.onComplete){queue=[];const done=controls.onComplete;controls={};done();}},onEnded:next,onInterrupt:()=>{queue=[];controls.onInterrupt?.();},onReplay:()=>controls.onReplay?controls.onReplay():speak(lastText)});
 function next(){if(disposed)return;if(!queue.length){controls.onComplete?.();return;}if(voice.status().muted || !voice.status().available){queue=[];controls.onComplete?.();return;}const clip=queue.shift();void voice.speak(clip);if(queue[0]?.recorded)void voice.preload(queue[0].id);}
 function stop(){controls={};queue=[];visibilityPaused=false;voice.stop({forget:true});}
 function speak(text,options={}){stop();controls=options;lastText=text;voice.unlock();queue=projectNarrationSegments(text,{demo});next();}
 const resume=()=>{voice.unlock();voice.resume();};
 const visibility=()=>{if(!isVisible()){visibilityPaused=voice.status().playing;voice.pause();}else if(visibilityPaused){visibilityPaused=false;resume();}};
 const unlock=()=>voice.unlock();
 document.addEventListener('visibilitychange',visibility);document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 return {get context(){return voice.context;},setSpatialOutput:voice.setSpatialOutput,speak,stop,unlock,pause:voice.pause,resume,status:voice.status,speechLevel:voice.speechLevel,prepare:text=>Promise.all(projectNarrationSegments(text,{demo}).filter(clip=>clip.recorded).slice(0,2).map(clip=>voice.prepare(clip))),preload:voice.preload,replay:()=>speak(lastText),destroy(){disposed=true;stop();document.removeEventListener('visibilitychange',visibility);document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);voice.destroy();}};
}
