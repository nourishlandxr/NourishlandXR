// Opt-in bridge for localhost testing against the existing hosted voice service.
// No credentials are copied into the preview or forwarded from the browser.
export function handleZinniaPreview(req,res,pathname,{enabled=false,production=false,readRequestJson,sendJson,fetchImpl=fetch}={}){
    if(!enabled || production || !pathname.startsWith('/api/zinnia/'))return false;
    const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    const origin=req.headers.origin;
    if(!local || origin && origin!==`http://${req.headers.host}`){sendJson(res,403,{error:'Voice preview is limited to this local preview.'});return true;}
    const route=pathname.slice('/api/zinnia/'.length);
    if(!(route==='capabilities' && req.method==='GET' || ['transcribe','speech','interpret'].includes(route) && req.method==='POST')){sendJson(res,404,{error:'Voice route not found.'});return true;}
    async function forward(body){
        try{
            const upstream=await fetchImpl('https://nourishland.org/xr-api/zinnia/'+route,{method:req.method,headers:{Origin:'https://nourishland.org',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(route==='speech'?95000:40000)});
            res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type') || 'application/json','Cache-Control':'no-store'});res.end(Buffer.from(await upstream.arrayBuffer()));
        }catch{sendJson(res,502,{error:'The hosted voice service could not be reached. Retry or continue without voice.'});}
    }
    if(req.method==='GET')void forward();else if(!origin)sendJson(res,403,{error:'A local preview origin is required.'});else readRequestJson(req,(error,data)=>{if(error)sendJson(res,error.statusCode || 400,{error:error.message});else void forward(data);});
    return true;
}
