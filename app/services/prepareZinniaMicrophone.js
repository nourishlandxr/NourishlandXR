// Ask outside immersive XR, before any narration invites an answer.
// Only permission is prepared here; the recorder owns the live microphone.
export async function prepareZinniaMicrophone({mediaDevices=globalThis.navigator?.mediaDevices,storage=globalThis.sessionStorage}={}){
    try{
        const stream=await mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
        stream.getTracks().forEach(track=>track.stop());
        storage?.setItem('nlxr.mic.ready','true');return true;
    }catch{
        storage?.removeItem('nlxr.mic.ready');return false;
    }
}
