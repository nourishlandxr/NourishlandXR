import {WELCOME_NARRATION_BANK} from './welcomeNarrationBank.js';
// Recorded Zinnia narration; pause keeps the decoded clip and its position.
import {claimZinniaVoice,releaseZinniaVoice,forgetZinniaVoice,isLastZinniaVoice} from './zinniaVoiceCoordinator.js';
const settingsKey='nlxr.welcome-narration.v1';
export function getWelcomeNarrationSettings(){try{return {enabled:true,volume:1.24,...JSON.parse(globalThis.localStorage?.getItem(settingsKey) || '{}'),echo:0};}catch{return {enabled:true,volume:1.24,echo:0};}}
export function setWelcomeNarrationSettings(change){const next={...getWelcomeNarrationSettings(),...change};next.enabled=next.enabled!==false;next.volume=Math.max(0,Math.min(2,Number(next.volume)||0));next.echo=0;try{globalThis.localStorage?.setItem(settingsKey,JSON.stringify(next));}catch{}globalThis.dispatchEvent?.(new Event('nlxr-narration-change'));return next;}
export function createWelcomePracticeVoice({enabled=true,onChange=()=>{},onEnded=()=>{},onInterrupt=()=>{},onReplay,assetBase=new URL(WELCOME_NARRATION_BANK?'../'+WELCOME_NARRATION_BANK.base:'../assets/welcome-practice/voice/',import.meta.url),initialId='arrival',maxCached=8,fetchCache='no-cache'}={}){
    const Context=globalThis.AudioContext || globalThis.webkitAudioContext;
    let context=null,gain=null,liveRequest=null,current=null,buffer=null,offset=0,startedAt=0,generation=0,muted=!getWelcomeNarrationSettings().enabled,playing=false,paused=false,disposed=false,lesson=null;
    let analyser=null,wave=null,fallbackSpeaking=false,fallbackQueued=false,awaitingAudioUnlock=false;
    const cache=new Map(),abort=new AbortController();
    const status=()=>({muted,playing,paused,available:Boolean(context),lesson:lesson?.id || null});
    const changed=()=>onChange(status());
    function unlock(){
        if(!enabled || disposed || !Context)return;
        try{if(!context){context=new Context();gain=context.createGain();const limiter=context.createDynamicsCompressor();limiter.threshold.value=-2;limiter.knee.value=0;limiter.ratio.value=20;gain.connect(limiter);limiter.connect(context.destination);syncSettings();}const unlocking=context.resume();unlocking?.then(()=>{if(awaitingAudioUnlock && !disposed && !muted && buffer && context?.state==='running'){awaitingAudioUnlock=false;paused=false;playBuffer(generation);}}).catch(()=>{});}catch{context=null;}
    }
    function detach(){if(!current)return;current.onended=null;try{current.stop();}catch{}current.disconnect();current=null;}
    function stop({forget=false}={}){awaitingAudioUnlock=false;if(forget)lesson=null;generation++;liveRequest?.abort();liveRequest=null;detach();if(fallbackQueued)globalThis.speechSynthesis?.cancel();fallbackSpeaking=false;fallbackQueued=false;buffer=null;offset=0;playing=false;paused=false;releaseZinniaVoice(owner);changed();}
    function pause(){awaitingAudioUnlock=false;if(disposed || paused || !playing)return;if(current && buffer)offset=Math.min(buffer.duration,offset+Math.max(0,(context.currentTime-startedAt)));else globalThis.speechSynthesis?.pause();detach();playing=false;paused=true;changed();}
    function playBuffer(token){
        if(token!==generation || disposed || muted || paused || !buffer)return;
        if(context.state!=='running'){awaitingAudioUnlock=true;playing=false;paused=true;changed();return;}
        if(offset>=buffer.duration){playing=false;buffer=null;changed();return;}
        if(!analyser && context.createAnalyser){analyser=context.createAnalyser();analyser.fftSize=1024;wave=new Float32Array(analyser.fftSize);analyser.connect(gain);}
        current=context.createBufferSource();current.buffer=buffer;current.playbackRate.value=1;current.connect(analyser || gain);startedAt=context.currentTime;
        const source=current;source.onended=()=>{if(token!==generation || current!==source)return;source.disconnect();current=null;buffer=null;offset=0;playing=false;releaseZinniaVoice(owner);changed();onEnded();};
        playing=true;source.start(0,offset);changed();
    }
    function resume(){awaitingAudioUnlock=false;if(disposed || muted || !paused)return;paused=false;playing=true;const token=generation;changed();unlock();if(buffer)Promise.resolve(context.resume()).then(()=>playBuffer(token)).catch(()=>{playing=false;paused=true;changed();});else globalThis.speechSynthesis?.resume();}
    async function load(id){
        if(!context)return null;
        if(!cache.has(id)){
            if(cache.size>=maxCached)cache.delete(cache.keys().next().value);
            const request=new AbortController(),cancel=()=>request.abort(),timer=setTimeout(cancel,20000);abort.signal.addEventListener('abort',cancel,{once:true});
            const url=new URL(id+'.mp3',assetBase);
            cache.set(id,fetch(url,{signal:request.signal,cache:fetchCache}).then(r=>{if(!r.ok)throw Error('Welcome audio unavailable');return r.arrayBuffer();}).then(bytes=>context?.decodeAudioData(bytes)).catch(()=>{cache.delete(id);return null;}).finally(()=>{clearTimeout(timer);abort.signal.removeEventListener('abort',cancel);}));
        }
        return cache.get(id);
    }
    async function speak(value){
        stop();lesson=value;if(!value || muted || disposed || !context){changed();return;}claimZinniaVoice(owner);
        if(!value.recorded && (value.spokenOverride || value.id?.startsWith('fruit-name-'))){
            const token=generation,text=value.spoken;playing=true;changed();
            // Live replies use the hosted profile matching the saved OpenAI bank.
            // Never fall back to a device voice or mix it with the old Ava bank.
            if(WELCOME_NARRATION_BANK?.provider==='OpenAI'){
                const base=globalThis.NOURISHLAND_CONFIG?.apiBase || (globalThis.location?.pathname.startsWith('/xr/')?'/xr-api':'/api');
                const request=new AbortController(),timer=setTimeout(()=>request.abort(),120000);liveRequest=request;
                try{const response=await fetch(base+'/zinnia/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:request.signal});if(!response.ok)throw Error('Speech unavailable');const bytes=await response.arrayBuffer();if(token!==generation || disposed)return;const decoded=await context.decodeAudioData(bytes);if(token===generation){buffer=decoded;playBuffer(token);}return;}catch{}
            }
            if(token!==generation || disposed)return;
            playing=false;releaseZinniaVoice(owner);changed();onEnded();return;
        }
        const token=generation;playing=true;changed();const loaded=await load(value.id);
        if(token!==generation || disposed || muted)return;buffer=loaded;
        if(!buffer){playing=false;paused=false;releaseZinniaVoice(owner);changed();onEnded();return;}if(paused){changed();return;}playBuffer(token);
    }
    function syncSettings(){const settings=getWelcomeNarrationSettings(),wasMuted=muted;muted=!settings.enabled;if(gain){gain.gain.setTargetAtTime(settings.volume,context.currentTime,.025);}if(muted)stop();else if(wasMuted && lesson && isLastZinniaVoice(owner)){unlock();void speak(lesson);}changed();}
    globalThis.addEventListener?.('nlxr-narration-change',syncSettings);
    function speechLevel(){if(!playing || paused || muted)return 0;if(fallbackSpeaking)return .2;if(!current || !analyser || context?.state!=='running')return 0;analyser.getFloatTimeDomainData(wave);let energy=0;for(const value of wave)energy+=value*value;return Math.min(1,Math.max(0,(Math.sqrt(energy/wave.length)-.003)*12));}
    const owner={status,speechLevel,pause,resume,cancel(){onInterrupt();stop();},replay(){if(onReplay)onReplay();else {unlock();if(lesson)void speak(lesson);}}};
    return {unlock,speak,stop,pause,resume,status,speechLevel,preload:(id=initialId)=>muted?null:load(id),replay:owner.replay,toggleMute(){setWelcomeNarrationSettings({enabled:muted});},destroy(){disposed=true;globalThis.removeEventListener?.('nlxr-narration-change',syncSettings);stop();forgetZinniaVoice(owner);abort.abort();cache.clear();analyser?.disconnect();context?.close()?.catch(()=>{});context=null;}};
}
