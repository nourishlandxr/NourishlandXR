import {WELCOME_NARRATION_BANK} from "./welcomeNarrationBank.js?v=0.9819";
// Recorded Zinnia narration; pause keeps the decoded clip and its position.
import {claimZinniaVoice,releaseZinniaVoice,forgetZinniaVoice,isLastZinniaVoice} from "./zinniaVoiceCoordinator.js?v=0.9819";
const settingsKey='nlxr.welcome-narration.v1';
export function getWelcomeNarrationSettings(){try{return {enabled:true,volume:1.24,...JSON.parse(globalThis.localStorage?.getItem(settingsKey) || '{}'),echo:0};}catch{return {enabled:true,volume:1.24,echo:0};}}
export function setWelcomeNarrationSettings(change){const next={...getWelcomeNarrationSettings(),...change};next.enabled=next.enabled!==false;next.volume=Math.max(0,Math.min(2,Number(next.volume)||0));next.echo=0;try{globalThis.localStorage?.setItem(settingsKey,JSON.stringify(next));}catch{}globalThis.dispatchEvent?.(new Event('nlxr-narration-change'));return next;}
export function createWelcomePracticeVoice({enabled=true,onChange=()=>{},onEnded=()=>{},onInterrupt=()=>{},onReplay,assetBase=new URL(WELCOME_NARRATION_BANK?'../'+WELCOME_NARRATION_BANK.base:'../assets/welcome-practice/voice/',import.meta.url),initialId='title',maxCached=8,fetchCache='no-cache',normalizeLoudness=false,recordedFallbackToLive=false}={}){
    const Context=globalThis.AudioContext || globalThis.webkitAudioContext;
    let context=null,gain=null,limiter=null,spatialOutput=null,current=null,currentGain=null,buffer=null,offset=0,startedAt=0,generation=0,muted=!getWelcomeNarrationSettings().enabled,playing=false,paused=false,disposed=false,lesson=null,loading=false,hasPlayed=false,playbackDuration=0;
    let analyser=null,wave=null,fallbackSpeaking=false,fallbackQueued=false,awaitingAudioUnlock=false;
    const cache=new Map(),liveCache=new Map(),abort=new AbortController();
    const status=()=>({muted,playing,paused,available:Boolean(context),lesson:lesson?.id || null,loading,audible:Boolean(current && playing && !paused && context?.state==='running'),hasPlayed,text:lesson?.spoken || '',elapsed:current && playing?offset+Math.max(0,context.currentTime-startedAt):offset,duration:playbackDuration});
    const changed=()=>onChange(status());
    function unlock(){
        if(!enabled || disposed || !Context)return;
        try{if(!context){context=new Context();context.onstatechange=()=>{if(awaitingAudioUnlock && buffer && context?.state==='running' && !disposed && !muted){awaitingAudioUnlock=false;paused=false;playBuffer(generation);}};gain=context.createGain();limiter=context.createDynamicsCompressor();limiter.threshold.value=-2;limiter.knee.value=0;limiter.ratio.value=20;gain.connect(limiter);limiter.connect(context.destination);syncSettings();}const unlocking=context.resume();unlocking?.then(()=>{if(awaitingAudioUnlock && !disposed && !muted && buffer && context?.state==='running'){awaitingAudioUnlock=false;paused=false;playBuffer(generation);}}).catch(()=>{});}catch{context=null;}
    }
    function detach(){if(!current)return;current.onended=null;try{current.stop();}catch{}current.disconnect();currentGain?.disconnect?.();currentGain=null;current=null;}
    function clipGain(audio){if(!normalizeLoudness || !audio?.getChannelData)return 1;let energy=0,count=0;const stride=Math.max(1,Math.floor(audio.sampleRate/4000));for(let channel=0;channel<audio.numberOfChannels;channel++){const samples=audio.getChannelData(channel);for(let i=0;i<samples.length;i+=stride){const value=samples[i];if(Math.abs(value)>.012){energy+=value*value;count++;}}}return count?Math.max(.72,Math.min(1.45,.105/Math.sqrt(energy/count))):1;}
    function stop({forget=false}={}){awaitingAudioUnlock=false;if(forget)lesson=null;generation++;detach();if(fallbackQueued)globalThis.speechSynthesis?.cancel();fallbackSpeaking=false;fallbackQueued=false;buffer=null;offset=0;playing=false;paused=false;loading=false;hasPlayed=false;playbackDuration=0;releaseZinniaVoice(owner);changed();}
    function pause(){awaitingAudioUnlock=false;if(disposed || paused || !playing)return;if(current && buffer)offset=Math.min(buffer.duration,offset+Math.max(0,(context.currentTime-startedAt)));else globalThis.speechSynthesis?.pause();detach();playing=false;paused=true;changed();}
    function playBuffer(token){
        if(token!==generation || disposed || muted || paused || !buffer)return;
        if(context.state!=='running'){awaitingAudioUnlock=true;playing=false;paused=true;changed();return;}
        if(offset>=buffer.duration){playing=false;buffer=null;changed();return;}
        if(!analyser && context.createAnalyser){analyser=context.createAnalyser();analyser.fftSize=1024;wave=new Float32Array(analyser.fftSize);analyser.connect(gain);}
        current=context.createBufferSource();current.buffer=buffer;current.playbackRate.value=1;currentGain=context.createGain();currentGain.gain.value=clipGain(buffer);current.connect(currentGain);currentGain.connect(analyser || gain);startedAt=context.currentTime;
        const source=current;source.onended=()=>{if(token!==generation || current!==source)return;source.disconnect();currentGain?.disconnect?.();currentGain=null;current=null;buffer=null;offset=playbackDuration;playing=false;loading=false;releaseZinniaVoice(owner);changed();onEnded();};
        playbackDuration=buffer.duration;loading=false;playing=true;source.start(0,offset);hasPlayed=true;changed();
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
    function loadLive(text){
        if(!context || WELCOME_NARRATION_BANK?.provider!=='OpenAI')return Promise.resolve(null);
        if(!liveCache.has(text)){
            if(liveCache.size>=maxCached)liveCache.delete(liveCache.keys().next().value);
            const request=new AbortController(),cancel=()=>request.abort(),timer=setTimeout(cancel,15000);abort.signal.addEventListener('abort',cancel,{once:true});
            const base=globalThis.NOURISHLAND_CONFIG?.apiBase || (globalThis.location?.pathname.startsWith('/xr/')?'/xr-api':'/api');
            liveCache.set(text,fetch(base+'/zinnia/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:request.signal}).then(response=>{if(!response.ok)throw Error('Speech unavailable');return response.arrayBuffer();}).then(bytes=>context?.decodeAudioData(bytes)).catch(()=>{liveCache.delete(text);return null;}).finally(()=>{clearTimeout(timer);abort.signal.removeEventListener('abort',cancel);}));
        }
        return liveCache.get(text);
    }
    async function prepare(value){if(!context)unlock();if(!value || muted || disposed || !context)return null;const exactClip=WELCOME_NARRATION_BANK.catalog?.[value.id]?.text===value.spoken;const request=()=>!value.recorded && !exactClip && (value.spokenOverride || value.id?.startsWith('fruit-name-'))?loadLive(value.spoken):load(value.id);const loaded=await request();if(loaded)return loaded;if(value.recorded && recordedFallbackToLive && !disposed && !muted)return loadLive(value.spoken);return value.recorded && !disposed && !muted?request():null;}
    async function speak(value){
        stop();lesson=value;unlock();if(!value || muted || disposed || !context){changed();return;}claimZinniaVoice(owner);
        const token=generation;loading=true;playing=true;changed();const loaded=await prepare(value);
        if(token!==generation || disposed || muted)return;loading=false;buffer=loaded;
        if(!buffer){playing=false;paused=false;releaseZinniaVoice(owner);changed();onEnded();return;}
        playbackDuration=buffer.duration;if(paused){changed();return;}playBuffer(token);
    }
    function syncSettings(){const settings=getWelcomeNarrationSettings(),wasMuted=muted;muted=!settings.enabled;if(gain){gain.gain.setTargetAtTime(settings.volume,context.currentTime,.025);}if(muted)stop();else if(wasMuted && lesson && isLastZinniaVoice(owner)){unlock();void speak(lesson);}changed();}
    globalThis.addEventListener?.('nlxr-narration-change',syncSettings);
    function setSpatialOutput(output){if(!limiter || !context || disposed)return;spatialOutput=output;limiter.disconnect();if(output)output.connect(limiter);else limiter.connect(context.destination);return ()=>{if(spatialOutput===output)setSpatialOutput(null);};}
    function speechLevel(){if(!playing || paused || muted)return 0;if(fallbackSpeaking)return .2;if(!current || !analyser || context?.state!=='running')return 0;analyser.getFloatTimeDomainData(wave);let energy=0;for(const value of wave)energy+=value*value;return Math.min(1,Math.max(0,(Math.sqrt(energy/wave.length)-.003)*12));}
    const owner={status,speechLevel,pause,resume,cancel(){onInterrupt();stop();},replay(){if(onReplay)onReplay();else {unlock();if(lesson)void speak(lesson);}}};
    return {get context(){return context;},setSpatialOutput,unlock,speak,prepare,stop,pause,resume,status,speechLevel,preload:(id=initialId)=>muted?null:load(id),replay:owner.replay,toggleMute(){setWelcomeNarrationSettings({enabled:muted});},destroy(){disposed=true;globalThis.removeEventListener?.('nlxr-narration-change',syncSettings);stop();forgetZinniaVoice(owner);abort.abort();cache.clear();liveCache.clear();analyser?.disconnect();context?.close()?.catch(()=>{});context=null;}};
}
