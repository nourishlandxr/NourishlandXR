// Adaptive end-of-turn detection: a steady room sound must not keep a reply open.
export function createVoiceEndpoint({silenceMs=550}={}){
    let floor=.002,peak=0,started=null,lastSpeech=null;
    return {sample(level,time){
        if(!Number.isFinite(level) || !Number.isFinite(time))return false;
        const threshold=started===null?Math.max(.006,floor*2.8):Math.max(.004,floor*2,peak*.2);
        if(level>threshold){started ??=time;lastSpeech=time;peak=Math.max(peak,level);}
        else if(started===null)floor=Math.min(.02,floor*.9+level*.1);
        return started!==null && time-lastSpeech>=silenceMs && time-started>=650;
    },get heard(){return started!==null;}};
}
