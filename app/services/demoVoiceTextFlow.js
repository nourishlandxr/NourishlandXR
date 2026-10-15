import {setZinniaVoiceContext} from './zinniaVoiceCoordinator.js';
import {DEMO_NARRATION_BANK} from './demoNarrationBank.js';
import {PROJECT_NARRATION_CATALOG} from './projectNarrationCatalog.js';

// Legacy previews can use a spoken lead; the demo opts into complete narration.
export function spokenFrameLead(text){
    // Preserve a short bundled introduction rather than synthesizing a fragment.
    const normalized=String(text || '').replace(/[’‘]/g,"'").replace(/[–—]/g,', ').replace(/\s+/g,' ').trim();
    const demo=Object.values(DEMO_NARRATION_BANK?.catalog || {}).find(clip=>normalized===clip.text);
    if(demo)return demo.text;
    const recorded=Object.values(PROJECT_NARRATION_CATALOG).filter(clip=>clip.text.split(/\s+/).length<=55 && (normalized===clip.text || normalized.startsWith(clip.text+' '))).sort((a,b)=>b.text.length-a.text.length)[0];
    if(recorded)return recorded.text;
    const sentences=String(text || '').match(/[^.!?]+[.!?](?:\s|$)|[^.!?]+$/g) || [];
    let result='';for(const sentence of sentences.slice(0,2)){if(result && (result+sentence).split(/\s+/).length>55)break;result+=sentence;}
    return result.trim();
}

// One paragraph owns its recording, text reveal, read interval and replay cursor.
export function createDemoVoiceTextFlow({paragraphs,voice,spokenSummary,completeNarration=false,readingTime=text=>Math.max(2200,text.split(/\s+/).length*250),paragraphGapMs=700,cueForParagraph=()=>null,onChange=()=>{},onComplete=()=>{},isReady=()=>true,now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}={}){
    const items=paragraphs.flatMap(text=>String(text || '').split(/\n\n+/)).map(p=>p.trim()).filter(Boolean);
    let index=-1,paused=false,cancelled=false,completed=false,timer=null,deadline=0,remaining=0,duration=0,readDone=false,audioDone=false,interrupted=false,revision=0,startedAt=0,waiting=false,waitingSince=0,releaseContext=null,presented=false,loading=false,between=false,gapRemaining=0,gapDeadline=0;
    const status=()=>({playing:!paused && !cancelled && !completed && index>=0,paused,listening:false});
    function clear(){if(timer!==null)clearTimer(timer);timer=null;}
    function advance(){if(cancelled || completed || paused || between || !readDone || !audioDone)return;if(index===items.length-1){completed=true;onComplete();return;}between=true;gapRemaining=Math.max(0,paragraphGapMs);scheduleGap();}
    function scheduleGap(){if(!between || paused || cancelled)return;gapDeadline=now()+gapRemaining;timer=setTimer(()=>{timer=null;between=false;show(index+1);},gapRemaining);}
    function schedule(){if(readDone || !presented || paused)return;deadline=now()+remaining;timer=setTimer(()=>{timer=null;if(cancelled)return;readDone=true;advance();},remaining);}
    function beginReading(){if(presented || cancelled || paused)return;presented=true;loading=false;startedAt=now();duration=remaining=readingTime(items[index]);onChange({index,paragraph:items[index],phase:'reading',startedAt});schedule();advance();}
    function pauseText(){if(paused || cancelled || completed)return;paused=true;if(timer!==null){if(between)gapRemaining=Math.max(0,gapDeadline-now());else remaining=Math.max(0,deadline-now());}clear();}
    function resumeText(){if(!paused || cancelled || completed)return;paused=false;if(between){scheduleGap();return;}if(waiting)show(index);else{if(!presented && audioDone)beginReading();else schedule();advance();}}
    function narrate(){audioDone=false;loading=true;const token=++revision;
        const text=completeNarration?items[index]:spokenSummary?(index===0?spokenSummary:''):spokenFrameLead(items[index]);
        if(!voice || !text){audioDone=true;beginReading();return;}
        // Simple preview voices have no playback-state API; production waits for decoded audio.
        if(typeof voice.status!=='function')beginReading();
        voice.speak(text,{onComplete(){if(token!==revision || cancelled)return;audioDone=true;beginReading();advance();},onState(state){
            if(token!==revision || cancelled)return;
            if(state.paused)pauseText();else if(state.playing && paused && !interrupted)resumeText();
            if(!state.loading && (state.playing || state.muted || state.available===false))beginReading();
        },onInterrupt(){if(token!==revision || cancelled)return;interrupted=true;pauseText();},onReplay:replay});
    }
    function show(next){clear();if(!waiting || next!==index){waitingSince=now();index=next;}if(!isReady(items[next],waitingSince)){waiting=true;timer=setTimer(()=>{timer=null;if(!cancelled && !paused)show(next);},100);return;}
        waiting=false;between=false;index=next;paused=false;completed=false;interrupted=false;readDone=audioDone=presented=false;startedAt=0;duration=remaining=0;
        voice?.prepare?.(items[index]);if(items[index+1])voice?.prepare?.(items[index+1]);narrate();
    }
    function replay(){if(cancelled || !items.length)return;const current=Math.max(0,index);voice?.stop();revision++;show(current);}
    function pause(){pauseText();voice?.pause();}
    function resume(){if(interrupted){interrupted=false;resumeText();narrate();}else{resumeText();voice?.resume();}}
    const api={speechLevel:()=>voice?.speechLevel?.() || 0,get characterCue(){return {...cueForParagraph(items[index] || '',index),id:items[index]+':'+revision+':'+index,focused:!completed};},start(){if(index>=0 || cancelled)return;if(!items.length){completed=true;onComplete();return;}releaseContext=setZinniaVoiceContext(api);show(0);},pause,resume,replay,status,
        cancel(){cancelled=true;revision++;clear();releaseContext?.();},
        finish(){if(cancelled)return;revision++;clear();voice?.stop();index=items.length-1;readDone=audioDone=presented=true;paused=false;completed=true;onChange({index,paragraph:items[index],phase:'reading',startedAt:-Infinity});onComplete();},
        snapshot:()=>({index,paragraph:presented?items[index] || '':'',phase:completed?'complete':waiting?'waiting':between?'gap':loading?'loading':'reading',startedAt,opacity:1,active:!cancelled && !completed,completed,cancelled,paused,waiting,loading})};return api;
}
