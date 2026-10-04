import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareAssetGroup,loadPreparedImage,AR_PRELOAD_ASSETS,prepareArAssets,arAssetsReady} from '../app/services/arAssetPreparation.js';

test('real preload progress follows settled assets and reports critical failures',async()=>{
 const progress=[],gates=[];let active=0,max=0;
 const assets=Array.from({length:4},(_,i)=>({id:String(i),critical:i===2,load:()=>{active++;max=Math.max(max,active);return new Promise((resolve,reject)=>gates.push(()=>{active--;i===2?reject(new Error('offline')):resolve();}));}}));
 const result=prepareAssetGroup(assets,{concurrency:2,onProgress:p=>progress.push(p.loaded)});
 assert.deepEqual(progress,[0]);assert.equal(gates.length,2);
 gates.shift()();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(progress,[0,1]);
 while(gates.length){gates.shift()();await new Promise(resolve=>setImmediate(resolve));}
 const finished=await result;assert.equal(max,2);assert.deepEqual(progress,[0,1,2,3,4]);assert.equal(finished.failures[0].critical,true);
});
test('image requests and decoding are reused; timeout failures can retry',async t=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'Image');let requests=0,decodes=0,fail=true;
 class ImageMock{set src(value){if(!value)return;requests++;if(value==='timeout' && fail)return;queueMicrotask(()=>this.onload?.());}decode(){decodes++;return Promise.resolve();}}
 Object.defineProperty(globalThis,'Image',{value:ImageMock,configurable:true});t.after(()=>{if(original)Object.defineProperty(globalThis,'Image',original);else delete globalThis.Image;});
 const first=loadPreparedImage('shared');assert.equal(first,loadPreparedImage('shared'));await first;assert.equal(first,loadPreparedImage('shared'));assert.equal(requests,1);assert.equal(decodes,1);
 await assert.rejects(loadPreparedImage('timeout',{timeoutMs:5}),/timed out/);fail=false;await loadPreparedImage('timeout');assert.equal(decodes,2);
});
test('Creator preparation avoids all demo downloads; fonts settle before readiness',async()=>{
 assert.ok(AR_PRELOAD_ASSETS.critical.length<3);assert.ok(AR_PRELOAD_ASSETS.nearFuture.length<4);
 const result=await prepareArAssets({experience:'creator'});assert.equal(result.total,3);assert.equal(arAssetsReady('creator'),true);
});
