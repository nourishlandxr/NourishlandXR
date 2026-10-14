import {createWelcomePracticeVoice,getWelcomeNarrationSettings} from './welcomePracticeVoice.js';
import {claimZinniaVoice,releaseZinniaVoice,forgetZinniaVoice} from './zinniaVoiceCoordinator.js';

export function zinniaApiBase(){return globalThis.NOURISHLAND_CONFIG?.apiBase || (globalThis.location?.pathname.startsWith('/xr/')?'/xr-api':'/api');}
// One microphone owner across Orbs and Notes. Audio stays in memory only.
export function createZinniaVoice({onText=()=>{},onStatus=()=>{},onSpeak=()=>{},createNarrator=createWelcomePracticeVoice}={}){
    let stream,recorder,recognition,timer,meter,meterTimer,disposed=false,epoch=0,request,capabilities,listening=false,processing=false,speechDone=null,recordingStarted=0,heard=false,level=0;
    const narrator=createNarrator({onInterrupt:()=>{listening=false;completeSpeech(false);},onEnded:()=>completeSpeech(true)});
    function completeSpeech(completed){const resolve=speechDone;speechDone=null;resolve?.(completed);}
    const status=(message,error=null)=>{if(!disposed)onStatus(message,{listening,processing,level,error});};
    function release({keepOwner=false}={}){clearTimeout(timer);clearInterval(meterTimer);meterTimer=null;void meter?.close().catch(()=>{});meter=null;stream?.getTracks().forEach(track=>track.stop());stream=null;recorder=null;listening=false;level=0;if(!keepOwner)releaseZinniaVoice(owner);}
    function cancel(){epoch++;completeSpeech(false);processing=false;request?.abort();request=null;if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}release();recognition?.abort();recognition=null;narrator.stop();}
    async function capability(){if(capabilities?.enabled)return capabilities;try{const response=await fetch(zinniaApiBase()+'/zinnia/capabilities',{signal:AbortSignal.timeout(4000),cache:'no-store'});const data=response.ok?await response.json():{enabled:false};if(data.enabled)capabilities=data;return data;}catch{return {enabled:false};}}
    async function listen(){
        if(disposed)return;cancel();claimZinniaVoice(owner);listening=true;onSpeak();const token=epoch;status('');
        const cap=await capability();if(disposed || token!==epoch)return;
        if(cap.enabled && globalThis.MediaRecorder && navigator.mediaDevices?.getUserMedia){
            try{
                const capturedStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
                if(disposed || token!==epoch){capturedStream.getTracks().forEach(track=>track.stop());return;}
                try{globalThis.sessionStorage?.setItem('nlxr.mic.ready','true');}catch{}
                stream=capturedStream;if(!stream.getAudioTracks?.().some(track=>track.readyState!=='ended'))throw new Error('No active microphone track.');
                const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'].find(value=>MediaRecorder.isTypeSupported(value));
                recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:32000});const chunks=[];
                const capture=recorder;recordingStarted=performance.now();heard=false;level=0;
                recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
                recorder.onerror=()=>{if(token!==epoch)return;release();status('The microphone stopped. Open Audio on your wrist and choose Listen again.','recording');};
                recorder.onstop=async()=>{
                    if(disposed || token!==epoch)return;const silence=meter?.state==='running' && !heard,blob=new Blob(chunks,{type:capture.mimeType || mime || 'audio/webm'});release({keepOwner:true});
                    if(silence){releaseZinniaVoice(owner);status('I couldn’t hear a voice from the microphone. Check Quest’s microphone setting, then choose Listen again in Audio.','silence');return;}
                    if(blob.size<100){releaseZinniaVoice(owner);status('The microphone captured no audio. Check Quest microphone permission, then choose Listen again in Audio.','empty');return;}
                    processing=true;status('');
                    try{
                        const bytes=new Uint8Array(await blob.arrayBuffer());if(disposed || token!==epoch)return;let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
                        const transcription=new AbortController();request=transcription;const timeout=setTimeout(()=>transcription.abort(),35000);
                        let response;try{response=await fetch(zinniaApiBase()+'/zinnia/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:btoa(binary),mime:blob.type}),signal:request.signal});}finally{clearTimeout(timeout);}
                        const data=await response.json();if(!response.ok)throw new Error(data.error || 'Voice service unavailable.');if(!disposed && token===epoch){processing=false;if(data.text?.trim()){status('');onText(data.text.trim());}else status('I did not catch any words. Open Audio and choose Listen again.','no-speech');}
                    }catch(error){capabilities=null;if(!disposed && token===epoch){processing=false;status(error.name==='AbortError'?'Voice request timed out. Open Audio and choose Listen again.':error.message || 'The voice service could not finish the recording. Choose Listen again.','transcription');}}finally{if(token===epoch){processing=false;releaseZinniaVoice(owner);}}
                };
                // Frequent chunks preserve short replies and tolerate Quest stop timing.
                recorder.start(250);timer=setTimeout(()=>finish(),Math.min(8,Number(cap.maximumSeconds)||8)*1000);
                const AudioContext=globalThis.AudioContext || globalThis.webkitAudioContext;
                if(AudioContext){try{meter=new AudioContext();const analyser=meter.createAnalyser();analyser.fftSize=512;meter.createMediaStreamSource(stream).connect(analyser);const samples=new Uint8Array(analyser.fftSize);let lastSound=performance.now(),noise=.002;void meter.resume().catch(()=>{});meterTimer=setInterval(()=>{analyser.getByteTimeDomainData(samples);level=Math.sqrt(samples.reduce((sum,x)=>sum+((x-128)/128)**2,0)/samples.length);if(!heard)noise=Math.min(.012,noise*.97+level*.03);if(level>Math.max(.0035,noise*1.8)){heard=true;lastSound=performance.now();}if(heard && performance.now()-lastSound>700 && performance.now()-recordingStarted>700){clearInterval(meterTimer);finish();}},100);}catch{/* Recording still works when the XR browser cannot start a meter. */}}
                status('');
            }catch(error){release();status(error.name==='NotAllowedError'?'Microphone permission was denied. Enable it for nourishland.org in Quest Browser settings.':error.name==='NotFoundError'?'Quest Browser could not find a microphone.':error.name==='NotReadableError'?'The microphone is busy. Close another app using it and choose Listen again.':error.message || 'Could not start the microphone. Choose Listen again.','microphone');}
            return;
        }
        const Recognition=globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
        if(!Recognition){release();status('Voice needs the Zinnia server connection on this device. Tap Speak to reconnect.');return;}
        recognition=new Recognition();recognition.lang='en-AU';recognition.interimResults=false;
        recognition.onresult=event=>{if(!disposed && token===epoch)onText(event.results[0][0].transcript);};
        recognition.onerror=()=>{if(token===epoch)status('I did not catch that. Check microphone permission and tap Speak again.');};
        recognition.onend=()=>{if(token!==epoch)return;release();recognition=null;};
        try{recognition.start();status('');timer=setTimeout(()=>finish(),8000);}catch{release();status('Could not start the microphone. Tap Speak to retry.');}
    }
    function finish(){clearTimeout(timer);if(recorder?.state==='recording')recorder.stop();else if(recognition)recognition.stop();else if(listening){cancel();status('Listening stopped. Choose the microphone when you’re ready.');}}
    async function speak(text){
        if(!getWelcomeNarrationSettings().enabled || disposed)return;
        cancel();onSpeak();narrator.unlock();const completed=new Promise(resolve=>{speechDone=resolve;});await narrator.speak({id:'zinnia-dialogue',spoken:String(text).slice(0,1200),spokenOverride:true});if(!narrator.status().playing && !narrator.status().paused)completeSpeech(true);return completed;
    }
    const owner={cancel,status:()=>({playing:false,paused:false,listening,processing,level}),speechLevel:()=>0};
    const api={listen,finish,speak,audioLevel:()=>level,cancel,status:()=>listening || processing?owner.status():narrator.status(),speechLevel:narrator.speechLevel,pause:narrator.pause,resume:narrator.resume,destroy(){disposed=true;cancel();forgetZinniaVoice(owner);narrator.destroy();}};return api;
}
