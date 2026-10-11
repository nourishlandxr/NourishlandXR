import {createWelcomePracticeVoice} from './welcomePracticeVoice.js';
import {PROJECT_NARRATION_CATALOG} from './projectNarrationCatalog.js';
import {currentNxrLanguage} from './i18n.js';
export const normalizeNarrationText=value=>String(value || '').replace(/[’‘]/g,"'").replace(/[–—]/g,', ').replace(/\s+/g,' ').trim();
const recordings=Object.entries(PROJECT_NARRATION_CATALOG).sort((a,b)=>b[1].text.length-a[1].text.length);
export function projectNarrationClips(text){
 let remaining=normalizeNarrationText(Array.isArray(text)?text.join(' '):text),queue=[];
 while(remaining){const match=recordings.find(([,clip])=>remaining===clip.text || remaining.startsWith(clip.text+' '));
  if(match){queue.push(match[0]);remaining=remaining.slice(match[1].text.length).trim();}
  else {const end=remaining.search(/[.!?](?:\s|$)/);remaining=end<0?'':remaining.slice(end+1).trim();}
 }return queue;
}
export function createProjectNarration({onChange=()=>{}}={}){
 let queue=[],lastText='',disposed=false,visibilityPaused=false;
 const voice=createWelcomePracticeVoice({assetBase:new URL('../assets/project-narration/',import.meta.url),initialId:'z-84c48915',maxCached:4,fetchCache:'force-cache',onChange,onEnded:next});
 function next(){if(disposed || !queue.length)return;const id=queue.shift();void voice.speak({id});if(queue[0])void voice.preload(queue[0]);}
 function stop(){queue=[];visibilityPaused=false;voice.stop({forget:true});}
 function speak(text){stop();lastText=text;if(currentNxrLanguage()!=='en')return;queue=projectNarrationClips(text);voice.unlock();next();}
 const visibility=()=>{if(document.hidden){visibilityPaused=voice.status().playing;voice.pause();}else if(visibilityPaused){visibilityPaused=false;voice.resume();}};
 const unlock=()=>voice.unlock();
 const replay=()=>speak(lastText);globalThis.addEventListener('nlxr-narration-replay',replay);
 document.addEventListener('visibilitychange',visibility);document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 return {speak,stop,unlock,pause:voice.pause,resume:voice.resume,status:voice.status,preload:voice.preload,replay:()=>speak(lastText),destroy(){disposed=true;stop();globalThis.removeEventListener('nlxr-narration-replay',replay);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);voice.destroy();}};
}
