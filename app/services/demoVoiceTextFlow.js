import {setZinniaVoiceContext} from './zinniaVoiceCoordinator.js';
import {PROJECT_NARRATION_CATALOG} from './projectNarrationCatalog.js';

// Voice introduces the current idea; the Frame retains its full explanation.
export function spokenFrameLead(text){
    // Preserve a short bundled introduction rather than synthesizing a fragment.
    const normalized=String(text || '').replace(/[’‘]/g,"'").replace(/[–—]/g,', ').replace(/\s+/g,' ').trim();
    const recorded=Object.values(PROJECT_NARRATION_CATALOG).filter(clip=>clip.text.split(/\s+/).length<=55 && (normalized===clip.text || normalized.startsWith(clip.text+' '))).sort((a,b)=>b.text.length-a.text.length)[0];
    if(recorded)return recorded.text;
    const sentences=String(text || '').match(/[^.!?]+[.!?](?:\s|$)|[^.!?]+$/g) || [];
    let result='';for(const sentence of sentences.slice(0,2)){if(result && (result+sentence).split(/\s+/).length>55)break;result+=sentence;}
    return result.trim();
}
export function createDemoVoiceTextFlow({paragraphs,voice,spokenSummary,readingTime=text=>Math.max(2200,text.split(/\s+/).length*250),cueForParagraph=()=>null,onChange=()=>{},onComplete=()=>{},now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}={}){
    const items=paragraphs.filter(Boolean);let index=-1,paused=false,cancelled=false,completed=false,timer=null,deadline=0,remaining=0,duration=0,readDone=false,audioDone=false,interrupted=false,revision=0,startedAt=0,releaseContext=null;
    const status=()=>({playing:!paused && !cancelled && !completed && index>=0,paused,listening:false});
    function clear(){if(timer!==null)clearTimer(timer);timer=null;}
    function advance(){if(cancelled || completed || paused || !readDone || !audioDone)return;if(index===items.length-1){completed=true;onComplete();return;}show(index+1);}
    function schedule(){if(readDone)return;deadline=now()+remaining;timer=setTimer(()=>{timer=null;readDone=true;advance();},remaining);}
    function pauseText(){if(paused || cancelled || completed)return;paused=true;if(timer!==null)remaining=Math.max(0,deadline-now());clear();}
    function resumeText(){if(!paused || cancelled || completed)return;paused=false;schedule();advance();}
    function narrate(){audioDone=false;const token=++revision;
        const text=spokenSummary?(index===0?spokenSummary:''):spokenFrameLead(items[index]);
        if(!voice || !text){audioDone=true;advance();return;}
        voice.speak(text,{onComplete(){if(token!==revision || cancelled)return;audioDone=true;advance();},onState(state){if(token!==revision || cancelled)return;if(state.paused)pauseText();else if(state.playing && paused && !interrupted)resumeText();},onInterrupt(){if(token!==revision || cancelled)return;interrupted=true;pauseText();},onReplay:replay});
    }
    function show(next){clear();index=next;paused=false;completed=false;interrupted=false;readDone=false;audioDone=false;startedAt=now();duration=remaining=readingTime(items[index]);onChange({index,paragraph:items[index],phase:'reading',startedAt});schedule();narrate();}
    function replay(){if(cancelled || !items.length)return;voice?.stop();revision++;show(0);}
    function pause(){pauseText();voice?.pause();}
    function resume(){if(interrupted){interrupted=false;resumeText();narrate();}else{resumeText();voice?.resume();}}
    const api={speechLevel:()=>voice?.speechLevel?.() || 0,get characterCue(){return {...cueForParagraph(items[index] || '',index),id:items[index]+':'+revision+':'+index,focused:!completed};},start(){if(index>=0 || cancelled)return;if(!items.length){completed=true;onComplete();return;}releaseContext=setZinniaVoiceContext(api);show(0);},pause,resume,replay,status,
        cancel(){cancelled=true;revision++;clear();releaseContext?.();},
        finish(){if(cancelled)return;revision++;clear();voice?.stop();index=items.length-1;readDone=audioDone=true;paused=false;completed=true;onChange({index,paragraph:items[index],phase:'reading',startedAt:-Infinity});onComplete();},
        snapshot:()=>{const elapsed=readDone?duration:duration-(paused?remaining:Math.max(0,deadline-now())),reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,amount=completed || reduced?1:Math.max(0,Math.min(1,elapsed/180));return {index,paragraph:items[index] || '',phase:completed?'complete':amount<1?'fade-in':'reading',startedAt,opacity:1,active:!cancelled && !completed,completed,cancelled,paused};}};return api;
}
