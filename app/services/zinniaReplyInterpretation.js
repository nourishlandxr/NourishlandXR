import {zinniaApiBase} from './zinniaVoice.js';
export async function interpretVisitorReply(text,context,{signal}={}){
    try{const response=await fetch(zinniaApiBase()+'/zinnia/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:String(text).slice(0,600),context}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(7000)]):AbortSignal.timeout(7000)});if(response.ok)return await response.json();}catch{/* Local parsing and manual retry remain available. */}
    return null;
}
