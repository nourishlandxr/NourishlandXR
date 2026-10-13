import test from 'node:test';
import assert from 'node:assert/strict';
import {handleZinniaPreview} from '../tools/zinniaPreviewProxy.mjs';

test('hosted preview bridge is opt-in, loopback only and limited to voice routes',async()=>{
 const requests=[],responses=[],req={method:'POST',headers:{host:'127.0.0.1:8000',origin:'http://127.0.0.1:8000'},socket:{remoteAddress:'127.0.0.1'}},res={writeHead:status=>responses.push(status),end:()=>{}};
 const options={enabled:true,readRequestJson:(_req,done)=>done(null,{audio:'test',mime:'audio/webm'}),sendJson:(_res,status)=>responses.push(status),fetchImpl:async(url,init)=>{requests.push({url,init});return {status:200,headers:new Headers({'content-type':'application/json'}),arrayBuffer:async()=>new ArrayBuffer(0)};}};
 assert.equal(handleZinniaPreview(req,res,'/api/zinnia/transcribe',{...options,enabled:false}),false);
 assert.equal(handleZinniaPreview(req,res,'/api/zinnia/transcribe',{...options,production:true}),false);
 assert.equal(handleZinniaPreview({...req,socket:{remoteAddress:'192.0.2.1'}},res,'/api/zinnia/transcribe',options),true);assert.equal(responses.pop(),403);
 handleZinniaPreview({...req,headers:{...req.headers,origin:'https://example.test'}},res,'/api/zinnia/transcribe',options);assert.equal(responses.pop(),403);
 handleZinniaPreview(req,res,'/api/zinnia/arbitrary',options);assert.equal(responses.pop(),404);assert.equal(requests.length,0);
 handleZinniaPreview(req,res,'/api/zinnia/transcribe',options);await new Promise(resolve=>setImmediate(resolve));assert.equal(requests.length,1);assert.equal(requests[0].url,'https://nourishland.org/xr-api/zinnia/transcribe');assert.deepEqual(JSON.parse(requests[0].init.body),{audio:'test',mime:'audio/webm'});assert.equal(responses.pop(),200);
});
