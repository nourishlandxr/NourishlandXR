// One Zinnia voice across pages, the tutorial and microphone conversations.
let active=null,last=null,context=null;
export function setZinniaVoiceContext(value){context=value;return ()=>{if(context===value)context=null;};}
export function claimZinniaVoice(owner){
    if(active && active!==owner)active.cancel();
    active=owner;last=owner;
}
export function releaseZinniaVoice(owner){if(active===owner)active=null;}
export function forgetZinniaVoice(owner){releaseZinniaVoice(owner);if(last===owner)last=null;}
export function isLastZinniaVoice(owner){return last===owner;}
export function zinniaVoiceState(){return active?.status() || context?.status?.() || {playing:false,paused:false,listening:false};}
export function zinniaCharacterCue(){return {...context?.characterCue,paused:Boolean(context?.status?.().paused)};}
export function zinniaSpeechLevel(){return (active || context)?.speechLevel?.() || 0;}
export function replayZinniaVoice(){if(context)context.replay();else last?.replay?.();}
export function pauseZinniaVoice(){if(active?.pause)active.pause();else context?.pause?.();}
export function resumeZinniaVoice(){if(active?.resume)active.resume();else context?.resume?.();}
export function stopZinniaVoice(){active?.cancel();}
globalThis.addEventListener?.('nlxr-narration-replay',replayZinniaVoice);
