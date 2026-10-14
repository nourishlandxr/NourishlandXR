import test from 'node:test';
import assert from 'node:assert/strict';
import {handleZinniaVoice,isZinniaVoiceOriginAllowed} from '../tools/zinniaVoiceServer.mjs';

async function inProduction(run){
 const names=['NODE_ENV','NOURISHLAND_PUBLIC_ORIGIN','NOURISHLAND_ZINNIA_VOICE_ENABLED','OPENAI_API_KEY'],saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 Object.assign(process.env,{NODE_ENV:'production',NOURISHLAND_PUBLIC_ORIGIN:'https://nourishland.org',NOURISHLAND_ZINNIA_VOICE_ENABLED:'true',OPENAI_API_KEY:'test-only-key'});
 try{await run();}finally{for(const name of names)if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}
}
const allowed=req=>req.headers.origin==='https://nourishland.org';
const request=(origin,route,body)=>new Promise(resolve=>{const req={method:'POST',headers:{origin,host:'nourishland.org'},socket:{remoteAddress:'test-'+route}};
 assert.equal(handleZinniaVoice(req,{setHeader(){},writeHead(status,headers){this.status=status;this.headers=headers;},end(bytes){resolve({status:this.status,headers:this.headers,bytes});}},'/api/zinnia/'+route,{isAllowedOrigin:allowed,readRequestJson(_req,callback){void callback(null,body);},sendJson(_res,status,data){resolve({status,data});}}),true);});

test('public tutorial voice accepts root and www origins while rejecting unrelated sites and insecure variants',()=>inProduction(async()=>{
 for(const origin of ['https://nourishland.org','https://www.nourishland.org'])assert.equal(isZinniaVoiceOriginAllowed({headers:{origin}},allowed),true,origin);
 for(const origin of ['','http://www.nourishland.org','https://nourishland.org:444','https://nourishland.org.example','https://other.org','https://www.nourishland.org/path'])assert.equal(isZinniaVoiceOriginAllowed({headers:{origin}},allowed),false,origin);
}));
test('logged-out tutorial recordings work on both website addresses without Creator authentication',()=>inProduction(async()=>{
 const saved=globalThis.fetch;let calls=0;globalThis.fetch=async url=>{assert.ok(String(url).endsWith('/audio/transcriptions'));calls++;return {ok:true,json:async()=>({text:'This is a synthetic test.'})};};
 try{for(const origin of ['https://nourishland.org','https://www.nourishland.org']){const result=await request(origin,'transcribe',{audio:Buffer.alloc(128,1).toString('base64'),mime:'audio/webm;codecs=opus'});assert.equal(result.status,200);assert.equal(result.data.text,'This is a synthetic test.');}assert.equal(calls,2);
 const rejected=await request('https://unrelated.org','transcribe',{});assert.equal(rejected.status,403);assert.equal(calls,2);
 }finally{globalThis.fetch=saved;}
}));
test('visitor interpretation returns grounded JSON rather than synthesized audio',()=>inProduction(async()=>{
 const saved=globalThis.fetch;let calls=0;globalThis.fetch=async(url,options)=>{assert.ok(String(url).endsWith('/chat/completions'));const body=JSON.parse(options.body);assert.equal(body.response_format.type,'json_schema');calls++;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({name:'Test Sample',fruit:null})}}]})};};
 try{const result=await request('https://www.nourishland.org','interpret',{text:'Call me Test Sample',context:'name'});assert.equal(result.status,200);assert.deepEqual(result.data,{name:'Test Sample',fruit:null});assert.equal(calls,1);
 const invalid=await request('https://nourishland.org','interpret',{text:'Example',context:'admin'});assert.equal(invalid.status,400);assert.equal(calls,1);
 }finally{globalThis.fetch=saved;}
}));
