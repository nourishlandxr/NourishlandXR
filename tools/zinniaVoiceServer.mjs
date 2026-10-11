// Paid voice routes are explicitly enabled on the server, never with a browser key.
const clients=new Map();let daily={day:'',count:0};
export function handleZinniaVoice(req,res,pathname,{sendJson,readRequestJson,isAllowedOrigin}){
    if(!pathname.startsWith('/api/zinnia/'))return false;
    const enabled=process.env.NOURISHLAND_ZINNIA_VOICE_ENABLED==='true' && Boolean(process.env.OPENAI_API_KEY);
    res.setHeader('Cache-Control','no-store');
    if(pathname==='/api/zinnia/capabilities' && req.method==='GET'){sendJson(res,200,{enabled,voice:'AI-generated',maximumSeconds:20});return true;}
    if(!['/api/zinnia/transcribe','/api/zinnia/speech'].includes(pathname) || req.method!=='POST'){sendJson(res,404,{error:'Voice route not found.'});return true;}
    if(!enabled){sendJson(res,503,{error:'Zinnia voice is not configured on the server.'});return true;}
    const origin=String(req.headers.origin || '');
    const localOrigin=origin===`http://${req.headers.host}` || origin===`https://${req.headers.host}`;
    if(!origin || !isAllowedOrigin(req) || (process.env.NODE_ENV!=='production' && !localOrigin)){sendJson(res,403,{error:'Request origin is not allowed.'});return true;}
    const now=Date.now(),day=new Date(now).toISOString().slice(0,10),id=req.socket.remoteAddress || 'unknown';
    if(daily.day!==day){daily={day,count:0};clients.clear();}
    const bucket=clients.get(id) || {start:now,count:0};if(now-bucket.start>60000){bucket.start=now;bucket.count=0;}
    if(bucket.count>=12 || daily.count>=Math.max(1,Number(process.env.NOURISHLAND_ZINNIA_DAILY_REQUESTS)||300)){sendJson(res,429,{error:'Voice allowance reached. Please try again later.'});return true;}
    if(clients.size>2000)clients.clear();bucket.count++;clients.set(id,bucket);daily.count++;
    readRequestJson(req,async(error,data)=>{
        if(error){sendJson(res,error.statusCode || 400,{error:error.message});return;}
        try{
            let body,endpoint,headers={Authorization:'Bearer '+process.env.OPENAI_API_KEY};
            if(pathname.endsWith('/transcribe')){
                const mime=String(data.mime || '').split(';')[0],extension={'audio/webm':'webm','audio/mp4':'mp4','audio/ogg':'ogg','audio/wav':'wav'}[mime];
                if(!extension || typeof data.audio!=='string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(data.audio))return sendJson(res,400,{error:'Unsupported recording.'});
                const buffer=Buffer.from(data.audio,'base64');if(buffer.length<100 || buffer.length>600000)return sendJson(res,413,{error:'Please keep recordings under 20 seconds.'});
                body=new FormData();body.append('file',new Blob([buffer],{type:mime}),'voice.'+extension);body.append('model','gpt-4o-mini-transcribe');body.append('language','en');body.append('prompt','Plant names, cultivars, Zinnia, Daleys.');endpoint='transcriptions';
            }else{
                const text=String(data.text || '').trim();if(!text || text.length>1200)return sendJson(res,400,{error:'Speech text is too long or empty.'});
                headers['Content-Type']='application/json';body=JSON.stringify({model:'gpt-4o-mini-tts',voice:'coral',input:text,instructions:'Warm, concise garden guide. Speak clearly in Australian English.',response_format:'mp3'});endpoint='speech';
            }
            const response=await fetch('https://api.openai.com/v1/audio/'+endpoint,{method:'POST',headers,body,signal:AbortSignal.timeout(25000)});
            if(!response.ok)return sendJson(res,response.status===429?429:502,{error:'Voice provider unavailable. Please retry.'});
            if(endpoint==='transcriptions'){const payload=await response.json();sendJson(res,200,{text:String(payload.text || '').slice(0,2000)});}
            else{res.writeHead(200,{'Content-Type':'audio/mpeg'});res.end(Buffer.from(await response.arrayBuffer()));}
        }catch{sendJson(res,502,{error:'Voice request timed out or could not complete.'});}
    });return true;
}
