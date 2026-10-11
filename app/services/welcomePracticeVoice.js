// Recorded Zinnia narration; pause keeps the decoded clip and its position.
const settingsKey='nlxr.welcome-narration.v1';
export function getWelcomeNarrationSettings(){try{return {enabled:true,volume:1.24,echo:.03,...JSON.parse(globalThis.localStorage?.getItem(settingsKey) || '{}')};}catch{return {enabled:true,volume:1.24,echo:.03};}}
export function setWelcomeNarrationSettings(change){const next={...getWelcomeNarrationSettings(),...change};next.enabled=next.enabled!==false;next.volume=Math.max(0,Math.min(2,Number(next.volume)||0));next.echo=Math.max(0,Math.min(.1,Number(next.echo)||0));try{globalThis.localStorage?.setItem(settingsKey,JSON.stringify(next));}catch{}globalThis.dispatchEvent?.(new Event('nlxr-narration-change'));return next;}
export function createWelcomePracticeVoice({enabled=true,onChange=()=>{},onEnded=()=>{},assetBase=new URL('../assets/welcome-practice/voice/',import.meta.url),initialId='arrival',maxCached=8,fetchCache='no-cache'}={}){
    const Context=globalThis.AudioContext || globalThis.webkitAudioContext;
    let context=null,gain=null,echoGain=null,current=null,buffer=null,offset=0,startedAt=0,generation=0,muted=!getWelcomeNarrationSettings().enabled,playing=false,paused=false,disposed=false,lesson=null;
    const cache=new Map(),abort=new AbortController();
    const status=()=>({muted,playing,paused,available:Boolean(context),lesson:lesson?.id || null});
    const changed=()=>onChange(status());
    function unlock(){
        if(!enabled || disposed || !Context)return;
        try{if(!context){context=new Context();gain=context.createGain();const delay=context.createDelay(.2),limiter=context.createDynamicsCompressor();echoGain=context.createGain();delay.delayTime.value=.09;limiter.threshold.value=-2;limiter.knee.value=0;limiter.ratio.value=20;gain.connect(limiter);gain.connect(delay);delay.connect(echoGain);echoGain.connect(limiter);limiter.connect(context.destination);syncSettings();}context.resume()?.catch(()=>{});}catch{context=null;}
    }
    function detach(){if(!current)return;current.onended=null;try{current.stop();}catch{}current.disconnect();current=null;}
    function stop({forget=false}={}){if(forget)lesson=null;generation++;detach();buffer=null;offset=0;playing=false;paused=false;changed();}
    function pause(){if(disposed || paused || !playing)return;if(current && buffer)offset=Math.min(buffer.duration,offset+Math.max(0,context.currentTime-startedAt));detach();playing=false;paused=true;changed();}
    function playBuffer(token){
        if(token!==generation || disposed || muted || paused || !buffer)return;
        if(context.state!=='running'){playing=false;paused=true;changed();return;}
        if(offset>=buffer.duration){playing=false;buffer=null;changed();return;}
        current=context.createBufferSource();current.buffer=buffer;current.connect(gain);startedAt=context.currentTime;
        const source=current;source.onended=()=>{if(token!==generation || current!==source)return;source.disconnect();current=null;buffer=null;offset=0;playing=false;changed();onEnded();};
        playing=true;source.start(0,offset);changed();
    }
    function resume(){if(disposed || muted || !paused)return;paused=false;playing=true;const token=generation;changed();unlock();if(buffer)Promise.resolve(context.resume()).then(()=>playBuffer(token)).catch(()=>{playing=false;paused=true;changed();});}
    async function load(id){
        if(!context)return null;
        if(!cache.has(id)){
            if(cache.size>=maxCached)cache.delete(cache.keys().next().value);
            const request=new AbortController(),cancel=()=>request.abort(),timer=setTimeout(cancel,8000);abort.signal.addEventListener('abort',cancel,{once:true});
            cache.set(id,fetch(new URL(id+'.mp3',assetBase),{signal:request.signal,cache:fetchCache}).then(r=>{if(!r.ok)throw Error('Welcome audio unavailable');return r.arrayBuffer();}).then(bytes=>context?.decodeAudioData(bytes)).catch(()=>{cache.delete(id);return null;}).finally(()=>{clearTimeout(timer);abort.signal.removeEventListener('abort',cancel);}));
        }
        return cache.get(id);
    }
    async function speak(value){
        stop();lesson=value;if(!value || muted || disposed || !context){changed();return;}
        const token=generation;playing=true;changed();const loaded=await load(value.id);
        if(token!==generation || disposed || muted)return;buffer=loaded;
        if(!buffer){playing=false;paused=false;changed();onEnded();return;}if(paused){changed();return;}playBuffer(token);
    }
    function syncSettings(){const settings=getWelcomeNarrationSettings(),wasMuted=muted;muted=!settings.enabled;if(gain){gain.gain.setTargetAtTime(settings.volume,context.currentTime,.025);echoGain.gain.setTargetAtTime(settings.echo,context.currentTime,.025);}if(muted)stop();else if(wasMuted && lesson){unlock();void speak(lesson);}changed();}
    globalThis.addEventListener?.('nlxr-narration-change',syncSettings);
    return {unlock,speak,stop,pause,resume,status,preload:(id=initialId)=>muted?null:load(id),replay(){unlock();if(lesson)void speak(lesson);},toggleMute(){setWelcomeNarrationSettings({enabled:muted});},destroy(){disposed=true;globalThis.removeEventListener?.('nlxr-narration-change',syncSettings);stop();abort.abort();cache.clear();context?.close()?.catch(()=>{});context=null;}};
}
