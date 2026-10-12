import {createWelcomePracticeVoice,getWelcomeNarrationSettings} from './welcomePracticeVoice.js';
import {claimZinniaVoice,releaseZinniaVoice,forgetZinniaVoice} from './zinniaVoiceCoordinator.js';

export function zinniaApiBase(){return globalThis.NOURISHLAND_CONFIG?.apiBase || (globalThis.location?.pathname.startsWith('/xr/')?'/xr-api':'/api');}
// One microphone owner across Orbs and Notes. Audio stays in memory only.
export function createZinniaVoice({onText=()=>{},onStatus=()=>{},onSpeak=()=>{}}={}){
    let stream,recorder,recognition,timer,disposed=false,epoch=0,request,capabilities,listening=false;
    const narrator=createWelcomePracticeVoice({onInterrupt:()=>{listening=false;}});
    const status=message=>{if(!disposed)onStatus(message);};
    function release({keepOwner=false}={}){clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());stream=null;recorder=null;listening=false;if(!keepOwner)releaseZinniaVoice(owner);}
    function cancel(){epoch++;request?.abort();if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}release();recognition?.abort();recognition=null;narrator.stop();}
    async function capability(){if(capabilities?.enabled)return capabilities;try{const response=await fetch(zinniaApiBase()+'/zinnia/capabilities',{signal:AbortSignal.timeout(4000),cache:'no-store'});const data=response.ok?await response.json():{enabled:false};if(data.enabled)capabilities=data;return data;}catch{return {enabled:false};}}
    async function listen(){
        if(disposed)return;cancel();claimZinniaVoice(owner);listening=true;onSpeak();const token=epoch;status('Starting microphone…');
        const cap=await capability();if(disposed || token!==epoch)return;
        if(cap.enabled && globalThis.MediaRecorder && navigator.mediaDevices?.getUserMedia){
            try{
                const capturedStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
                if(disposed || token!==epoch){capturedStream.getTracks().forEach(track=>track.stop());return;}
                stream=capturedStream;
                const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(value=>MediaRecorder.isTypeSupported(value));
                recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:32000});const chunks=[];
                recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
                recorder.onerror=()=>{release();status('Microphone stopped. Tap Speak to retry.');};
                recorder.onstop=async()=>{
                    const blob=new Blob(chunks,{type:recorder?.mimeType || mime || 'audio/webm'});release({keepOwner:true});if(disposed || token!==epoch)return;status('Understanding your words…');
                    try{
                        const bytes=new Uint8Array(await blob.arrayBuffer());if(disposed || token!==epoch)return;let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
                        request=new AbortController();const timeout=setTimeout(()=>request.abort(),25000);
                        let response;try{response=await fetch(zinniaApiBase()+'/zinnia/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:btoa(binary),mime:blob.type}),signal:request.signal});}finally{clearTimeout(timeout);}
                        const data=await response.json();if(!response.ok)throw new Error(data.error || 'Voice service unavailable.');if(!disposed && token===epoch){if(data.text?.trim())onText(data.text.trim());else status('I did not catch that. Tap Speak and try again.');}
                    }catch(error){capabilities=null;if(!disposed && token===epoch)status(error.name==='AbortError'?'Voice request timed out. Tap Speak to reconnect.':'Zinnia could not finish that recording. Tap Speak to reconnect and try again.');}finally{if(token===epoch)releaseZinniaVoice(owner);}
                };
                recorder.start();timer=setTimeout(()=>finish(),20000);status('Listening… Tap Done when you finish (20 seconds maximum).');
            }catch{release();status('Microphone access was not granted. Tap Speak to retry.');}
            return;
        }
        const Recognition=globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
        if(!Recognition){release();status('Voice needs the Zinnia server connection on this device. Tap Speak to reconnect.');return;}
        recognition=new Recognition();recognition.lang='en-AU';recognition.interimResults=false;
        recognition.onresult=event=>{if(!disposed && token===epoch)onText(event.results[0][0].transcript);};
        recognition.onerror=()=>{if(token===epoch)status('I did not catch that. Check microphone permission and tap Speak again.');};
        recognition.onend=()=>{if(token!==epoch)return;release();recognition=null;};
        try{recognition.start();status('Listening… Say your choice.');timer=setTimeout(()=>finish(),20000);}catch{release();status('Could not start the microphone. Tap Speak to retry.');}
    }
    function finish(){clearTimeout(timer);if(recorder?.state==='recording')recorder.stop();recognition?.stop();}
    async function speak(text){
        if(!getWelcomeNarrationSettings().enabled || disposed)return;
        cancel();onSpeak();narrator.unlock();await narrator.speak({id:'zinnia-dialogue',spoken:String(text).slice(0,1200),spokenOverride:true});
    }
    const owner={cancel,status:()=>({playing:false,paused:false,listening}),speechLevel:()=>0};
    const api={listen,finish,speak,cancel,status:()=>listening?owner.status():narrator.status(),speechLevel:narrator.speechLevel,pause:narrator.pause,resume:narrator.resume,destroy(){disposed=true;cancel();forgetZinniaVoice(owner);narrator.destroy();}};return api;
}
