import {getWelcomeNarrationSettings} from './welcomePracticeVoice.js';

export function zinniaApiBase(){return globalThis.NOURISHLAND_CONFIG?.apiBase || (globalThis.location?.pathname.startsWith('/xr/')?'/xr-api':'/api');}
let activeVoice=null;
// One microphone owner across Orbs and Notes. Audio stays in memory only.
export function createZinniaVoice({onText=()=>{},onStatus=()=>{},onSpeak=()=>{}}={}){
    let stream,recorder,recognition,timer,disposed=false,epoch=0,audio,audioUrl,request,capabilities;
    const status=message=>{if(!disposed)onStatus(message);};
    function release(){clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());stream=null;recorder=null;}
    function cancel(){epoch++;request?.abort();if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}release();recognition?.abort();recognition=null;audio?.pause();audio=null;if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=null;globalThis.speechSynthesis?.cancel();if(activeVoice===api)activeVoice=null;}
    async function capability(){if(capabilities)return capabilities;try{const response=await fetch(zinniaApiBase()+'/zinnia/capabilities',{signal:AbortSignal.timeout(4000)});capabilities=response.ok?await response.json():{enabled:false};}catch{capabilities={enabled:false};}return capabilities;}
    async function listen(){
        if(disposed)return;activeVoice?.cancel();cancel();activeVoice=api;onSpeak();const token=epoch;status('Starting microphone…');
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
                    const blob=new Blob(chunks,{type:recorder?.mimeType || mime || 'audio/webm'});release();if(disposed || token!==epoch)return;status('Understanding your words…');
                    try{
                        const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
                        request=new AbortController();const timeout=setTimeout(()=>request.abort(),25000);
                        let response;try{response=await fetch(zinniaApiBase()+'/zinnia/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:btoa(binary),mime:blob.type}),signal:request.signal});}finally{clearTimeout(timeout);}
                        const data=await response.json();if(!response.ok)throw new Error(data.error || 'Voice service unavailable.');if(!disposed && token===epoch){if(data.text?.trim())onText(data.text.trim());else status('I did not catch that. Tap Speak and try again.');}
                    }catch(error){if(!disposed && token===epoch)status(error.name==='AbortError'?'Voice request timed out. Please retry.':error.message);}
                };
                recorder.start();timer=setTimeout(()=>finish(),20000);status('Listening… Tap Done when you finish (20 seconds maximum).');
            }catch{release();status('Microphone access was not granted. Tap Speak to retry.');}
            return;
        }
        const Recognition=globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
        if(!Recognition){status('Voice needs the Zinnia server connection on this device. Microphone setup is not ready yet.');return;}
        recognition=new Recognition();recognition.lang='en-AU';recognition.interimResults=false;
        recognition.onresult=event=>{if(!disposed && token===epoch)onText(event.results[0][0].transcript);};
        recognition.onerror=()=>{if(token===epoch)status('I did not catch that. Check microphone permission and tap Speak again.');};
        recognition.onend=()=>{clearTimeout(timer);recognition=null;};
        try{recognition.start();status('Listening… Say your choice.');timer=setTimeout(()=>finish(),20000);}catch{status('Could not start the microphone. Tap Speak to retry.');}
    }
    function finish(){clearTimeout(timer);if(recorder?.state==='recording')recorder.stop();recognition?.stop();}
    async function speak(text){
        if(!getWelcomeNarrationSettings().enabled || disposed)return;
        cancel();activeVoice=api;onSpeak();const token=epoch,cap=await capability();if(disposed || token!==epoch)return;
        if(cap.enabled){
            try{request=new AbortController();const timeout=setTimeout(()=>request.abort(),20000);let response;try{response=await fetch(zinniaApiBase()+'/zinnia/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:String(text).slice(0,1200)}),signal:request.signal});}finally{clearTimeout(timeout);}if(!response.ok)throw new Error();const blob=await response.blob();if(disposed || token!==epoch)return;audioUrl=URL.createObjectURL(blob);audio=new Audio(audioUrl);audio.volume=Math.max(0,Math.min(1,Number(getWelcomeNarrationSettings().volume)||0));await audio.play();return;}catch{if(disposed || token!==epoch)return;}
        }
        if(globalThis.SpeechSynthesisUtterance && globalThis.speechSynthesis){const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-AU';utterance.rate=.98;utterance.volume=Math.max(0,Math.min(1,Number(getWelcomeNarrationSettings().volume)||0));speechSynthesis.speak(utterance);}
    }
    const api={listen,finish,speak,cancel,destroy(){disposed=true;cancel();}};return api;
}
