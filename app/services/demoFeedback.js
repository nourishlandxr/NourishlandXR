// Demo-only streamed music and lightweight, original touch tones.
export const DEMO_FEEDBACK = Object.freeze({ musicVolume: .16, touchVolume: .035, selectionStrength: .12, holdStrength: .42, beeStrength: .075 });
export function createDemoFeedback() {
    let music=null, context=null, lastSound=-Infinity, lastTick=-Infinity, destroyed=false;
    const pulsing=new Set();
    function pulse(source,strength=DEMO_FEEDBACK.selectionStrength,duration=35) {
        if(destroyed || !source?.gamepad)return;
        try {
            const actuator=source.gamepad.hapticActuators?.[0] || source.gamepad.vibrationActuator;
            const result=actuator?.pulse ? actuator.pulse(strength,duration) : actuator?.playEffect?.('dual-rumble',{duration,strongMagnitude:strength,weakMagnitude:strength*.7});
            result?.catch?.(()=>{});
            if(strength)pulsing.add(source);else pulsing.delete(source);
        } catch {}
    }
    function start() {
        if(destroyed)return;
        // HTMLAudio streams the album; never decode its full duration into RAM.
        if(!music){music=new Audio(new URL('../assets/demo-wet-land.mp3',import.meta.url).href);music.preload='metadata';music.loop=true;music.volume=DEMO_FEEDBACK.musicVolume;}
        music.play()?.catch(()=>{});
        const AudioContext=globalThis.AudioContext || globalThis.webkitAudioContext;
        try {if(!context && AudioContext)context=new AudioContext();context?.resume()?.catch(()=>{});}catch{}
    }
    function sound(kind='menu') {
        if(destroyed || !context || context.state!=='running')return;
        const now=context.currentTime;
        if(now-lastSound<.065)return;
        lastSound=now;
        const notes=kind==='cell'?[1174,1761]:kind==='placement'?[330,660]:kind==='totem'?[440,660]:[620];
        const duration=kind==='menu'?.085:kind==='cell'?.28:.20;
        notes.forEach((frequency,index)=>{
            const oscillator=context.createOscillator(),gain=context.createGain(),start=now+index*.025;
            oscillator.type='sine';oscillator.frequency.value=frequency;
            gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(DEMO_FEEDBACK.touchVolume/notes.length,start+.008);
            gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
            oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+duration+.01);
            oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
        });
    }
    function tick(time,{sources=[],heldSource=null,beeClose=false}={}) {
        if(destroyed || time-lastTick<120)return;
        lastTick=time;
        for(const source of sources){
            if(source===heldSource)pulse(source,DEMO_FEEDBACK.holdStrength,95);
            else if(beeClose)pulse(source,DEMO_FEEDBACK.beeStrength,115);
            else if(pulsing.has(source))pulse(source,0,1);
        }
    }
    function destroy() {
        for(const source of pulsing)pulse(source,0,1);
        destroyed=true;music?.pause();if(music){music.removeAttribute('src');music.load();}music=null;
        context?.close()?.catch(()=>{});context=null;
    }
    const status=()=>({playing:Boolean(music && !music.paused),ready:music?.readyState || 0,error:music?.error?.code || 0,touchReady:context?.state==='running'});
    return {start,sound,pulse,tick,destroy,status};
}
