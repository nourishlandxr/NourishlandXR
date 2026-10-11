// Bundled narration works without speechSynthesis, a network TTS service, or
// an installed headset voice. Unlock the audio context in the launch gesture.
const settingsKey='nlxr.welcome-narration.v1';
export function getWelcomeNarrationSettings(){try{return {enabled:true,volume:1.24,echo:.03,...JSON.parse(globalThis.localStorage?.getItem(settingsKey) || '{}')};}catch{return {enabled:true,volume:1.24,echo:.03};}}
export function setWelcomeNarrationSettings(change){const next={...getWelcomeNarrationSettings(),...change};next.enabled=next.enabled!==false;next.volume=Math.max(0,Math.min(2,Number(next.volume)||0));next.echo=Math.max(0,Math.min(.1,Number(next.echo)||0));try{globalThis.localStorage?.setItem(settingsKey,JSON.stringify(next));}catch{}globalThis.dispatchEvent?.(new Event('nlxr-narration-change'));return next;}
export function createWelcomePracticeVoice({enabled=true,onChange=()=>{}}={}){
    const Context=globalThis.AudioContext || globalThis.webkitAudioContext;
    let context=null,gain=null,echoGain=null,current=null,generation=0,muted=!getWelcomeNarrationSettings().enabled,playing=false,disposed=false,lesson=null;
    const cache=new Map(),abort=new AbortController();
    const status=()=>({muted,playing,available:Boolean(context),lesson:lesson?.id || null});
    const changed=()=>onChange(status());
    function unlock(){
        if(!enabled || disposed || !Context)return;
        try{if(!context){context=new Context();gain=context.createGain();const delay=context.createDelay(.2),limiter=context.createDynamicsCompressor();echoGain=context.createGain();delay.delayTime.value=.09;limiter.threshold.value=-2;limiter.knee.value=0;limiter.ratio.value=20;gain.connect(limiter);gain.connect(delay);delay.connect(echoGain);echoGain.connect(limiter);limiter.connect(context.destination);syncSettings();}context.resume()?.catch(()=>{});}catch{context=null;}
    }
    function stop(){generation++;if(current){current.onended=null;try{current.stop();}catch{}current.disconnect();current=null;}playing=false;changed();}
    async function load(id){
        if(!context)return null;
        if(!cache.has(id)){
            const request=new AbortController(),cancel=()=>request.abort(),timer=setTimeout(cancel,5000);abort.signal.addEventListener('abort',cancel,{once:true});
            cache.set(id,fetch(new URL('../assets/welcome-practice/voice/'+id+'.mp3',import.meta.url),{signal:request.signal,cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Welcome audio unavailable');return r.arrayBuffer();}).then(bytes=>context?.decodeAudioData(bytes)).catch(()=>{cache.delete(id);return null;}).finally(()=>{clearTimeout(timer);abort.signal.removeEventListener('abort',cancel);}));
        }
        return cache.get(id);
    }
    async function speak(value){
        stop();lesson=value;if(!value || muted || disposed || !context){changed();return;}
        const token=generation;playing=true;changed();
        const buffer=await load(value.id);
        if(token!==generation || disposed || muted)return;
        if(!buffer || context.state!=='running'){playing=false;changed();return;}
        current=context.createBufferSource();current.buffer=buffer;current.connect(gain);
        current.onended=()=>{if(token!==generation)return;current?.disconnect();current=null;playing=false;changed();};
        current.start();
    }
    function syncSettings(){const settings=getWelcomeNarrationSettings(),wasMuted=muted;muted=!settings.enabled;if(gain){gain.gain.setTargetAtTime(settings.volume,context.currentTime,.025);echoGain.gain.setTargetAtTime(settings.echo,context.currentTime,.025);}if(muted)stop();else if(wasMuted && lesson){unlock();void speak(lesson);}changed();}
    globalThis.addEventListener?.('nlxr-narration-change',syncSettings);
    return {unlock,speak,stop,status,preload:()=>muted?null:load('arrival'),replay(){unlock();if(lesson)void speak(lesson);},toggleMute(){setWelcomeNarrationSettings({enabled:muted});},destroy(){disposed=true;globalThis.removeEventListener?.('nlxr-narration-change',syncSettings);stop();abort.abort();cache.clear();context?.close()?.catch(()=>{});context=null;}};
}
