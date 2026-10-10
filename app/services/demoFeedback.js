// Demo-only streamed music and lightweight, original touch tones.
export const DEMO_FEEDBACK = Object.freeze({ musicVolume: .16, touchVolume: .035, selectionStrength: .12, holdStrength: .42, beeApproachStrength:.82, beeApproachDuration:260 });
export function createDemoFeedback() {
    let music=null, context=null,fxGain=null, lastSound=-Infinity, lastTick=-Infinity, destroyed=false;
    const encounters=new WeakMap(),encounterPulseUntil=new WeakMap();
    const levels={music:DEMO_FEEDBACK.musicVolume,fx:.35,haptics:true};
    try{const saved=JSON.parse(globalThis.localStorage?.getItem('nxr-demo-sound') || '{}');for(const key of ['music','fx'])if(Number.isFinite(saved[key]))levels[key]=Math.max(0,Math.min(1,saved[key]));if(typeof saved.haptics==='boolean')levels.haptics=saved.haptics;}catch{}
    const save=()=>{try{globalThis.localStorage?.setItem('nxr-demo-sound',JSON.stringify(levels));}catch{}};
    function setHaptics(enabled){
        levels.haptics=Boolean(enabled);
        if(!levels.haptics)for(const source of pulsing)pulse(source,0,1);
        save();
    }
    function setVolume(kind,value){
        if(!['music','fx'].includes(kind) || !Number.isFinite(value))return;
        levels[kind]=Math.max(0,Math.min(1,value));
        if(music)music.volume=levels.music;
        if(fxGain)fxGain.gain.setTargetAtTime(levels.fx,context.currentTime,.025);
        save();
    }
    const pulsing=new Set();
    function pulse(source,strength=DEMO_FEEDBACK.selectionStrength,duration=35) {
        if(destroyed || !source?.gamepad || !levels.haptics && strength>0)return;
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
        if(!music){music=new Audio(new URL('../assets/demo-wet-land.mp3',import.meta.url).href);music.preload='metadata';music.loop=true;music.volume=levels.music;}
        music.play()?.catch(()=>{});
        const AudioContext=globalThis.AudioContext || globalThis.webkitAudioContext;
        try {if(!context && AudioContext){context=new AudioContext();fxGain=context.createGain();fxGain.gain.value=levels.fx;fxGain.connect(context.destination);}context?.resume()?.catch(()=>{});}catch{}
    }
    function sound(kind='menu') {
        if(destroyed || !context || context.state!=='running' || levels.fx===0)return;
        const now=context.currentTime;
        if(now-lastSound<.065)return;
        lastSound=now;
        const notes=kind==='dice'?[130,196]:kind==='cell'?[1174,1761]:kind==='placement'?[330,660]:kind==='totem'?[440,660]:[620];
        const duration=kind==='menu'?.085:kind==='cell'?.28:.20;
        notes.forEach((frequency,index)=>{
            const oscillator=context.createOscillator(),gain=context.createGain(),start=now+index*.025;
            oscillator.type=kind==='dice'?'triangle':'sine';oscillator.frequency.value=frequency;
            gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.1/notes.length,start+.008);
            gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
            oscillator.connect(gain);gain.connect(fxGain);oscillator.start(start);oscillator.stop(start+duration+.01);
            oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
        });
    }
    function tick(time,{sources=[],heldSource=null,beeEncounters=[],beeAround=false}={}) {
        if(destroyed || time-lastTick<120)return;
        lastTick=time;
        for(const previous of pulsing)if(!sources.includes(previous))pulse(previous,0,1);
        for(const source of sources){
            // Grab entry already sends one 100 ms confirmation. Let it finish;
            // holding an object must never restart that vibration every frame.
            if(source===heldSource)continue;
            else if(beeEncounters.some(id=>!(encounters.get(source) || []).includes(id))){
                // One short pulse per bee encounter, only when a bee comes
                // within the near-field radius supplied by the XR scene.
                encounters.set(source,[...(encounters.get(source) || []),...beeEncounters].slice(-16));pulse(source,DEMO_FEEDBACK.beeApproachStrength,DEMO_FEEDBACK.beeApproachDuration);encounterPulseUntil.set(source,time+DEMO_FEEDBACK.beeApproachDuration);
            }
            else if(time<(encounterPulseUntil.get(source) || 0))continue;
            else if(beeAround)pulse(source,.055,150);
            else if(pulsing.has(source))pulse(source,0,1);
        }
    }
    function destroy() {
        for(const source of pulsing)pulse(source,0,1);
        destroyed=true;music?.pause();if(music){music.removeAttribute('src');music.load();}music=null;
        context?.close()?.catch(()=>{});context=null;
    }
    const status=()=>({playing:Boolean(music && !music.paused),ready:music?.readyState || 0,error:music?.error?.code || 0,touchReady:context?.state==='running'});
    return {start,sound,pulse,tick,destroy,status,setVolume,setHaptics,volumes:()=>({...levels})};
}
