// Small shared registry: bounded decoded images, concurrent request deduplication,
// retryable failures, and real settled-asset progress. Project/API data is never cached here.
const images=new Map(),pendingImages=new Map();
const imageLimit=8;
export function loadPreparedImage(source,{timeoutMs=30000}={}){
 if(images.has(source)){const promise=images.get(source);images.delete(source);images.set(source,promise);return promise;}
 if(pendingImages.has(source))return pendingImages.get(source);
 let promise;
 promise=new Promise((resolve,reject)=>{
  const image=new Image();image.decoding='async';let settled=false;
  const timer=setTimeout(()=>finish(new Error('Image preparation timed out.')),timeoutMs);
  function finish(error){if(settled)return;settled=true;clearTimeout(timer);image.onload=null;image.onerror=null;if(error){image.src='';reject(error);}else resolve(image);}
  image.onload=async()=>{try{await image.decode?.();finish();}catch(error){finish(error);}};
  image.onerror=()=>finish(new Error('Image could not be prepared.'));image.src=source;
 }).then(image=>{pendingImages.delete(source);images.set(source,promise);while(images.size>imageLimit)images.delete(images.keys().next().value);return image;})
   .catch(error=>{pendingImages.delete(source);throw error;});
 pendingImages.set(source,promise);
 return promise;
}
export async function prepareAssetGroup(assets,{onProgress=()=>{},concurrency=2}={}){
 let next=0,loaded=0;const failures=[];onProgress({loaded,total:assets.length,failures:[]});
 async function worker(){while(next<assets.length){const asset=assets[next++];try{await asset.load();}catch(error){failures.push({id:asset.id,critical:Boolean(asset.critical),error});}loaded++;onProgress({loaded,total:assets.length,failures:[...failures]});}}
 await Promise.all(Array.from({length:Math.min(Math.max(1,concurrency),assets.length)},worker));
 return {loaded,total:assets.length,failures};
}
const assetURL=path=>new URL('../assets/'+path,import.meta.url).href;
export const AR_PRELOAD_ASSETS=Object.freeze({
 critical:['living-knowledge-seed-atlas.png'],
 nearFuture:['demo-tutorial-art/01-plant-curiosity.png','pigeon-pea-cajanus-cajan.png'],
 // Remaining tutorial/LIMO illustrations, project media and optional audio stay on demand.
});
const sessions=new Map();
function stateFor(experience){if(!sessions.has(experience))sessions.set(experience,{prepared:false,active:null,progress:{loaded:0,total:0,failures:[]},listeners:new Set()});return sessions.get(experience);}
export function arAssetsReady(experience='demo'){return stateFor(experience).prepared;}
export function prepareArAssets({onProgress=()=>{},retry=false,experience='demo'}={}){
 const state=stateFor(experience);state.listeners.add(onProgress);onProgress(state.progress);
 if(retry && !state.active)state.prepared=false;
 if(!state.active && !state.prepared){
  const assets=(experience==='demo'?AR_PRELOAD_ASSETS.critical:[]).map(path=>({id:path,critical:true,load:()=>loadPreparedImage(assetURL(path))}));
  // Fonts can fall back to system faces when offline. No audio autoplay.
  for(const face of ['600 24px Fraunces','500 24px Manrope','400 24px Marcellus'])assets.push({id:face,critical:false,load:()=>new Promise(resolve=>{
   const timer=setTimeout(resolve,4000);Promise.resolve(globalThis.document?.fonts?.load(face)).catch(()=>{}).finally(()=>{clearTimeout(timer);resolve();});
  })});
  state.active=prepareAssetGroup(assets,{onProgress:value=>{state.progress=value;for(const notify of state.listeners)notify(value);}}).then(result=>{state.prepared=!result.failures.some(item=>item.critical);return result;}).finally(()=>{state.active=null;});
 }
 const result=state.active || Promise.resolve(state.progress);
 return result.finally(()=>state.listeners.delete(onProgress));
}
let secondaryStarted=false;
export function prepareNearFutureArAssets(){
 if(secondaryStarted || globalThis.navigator?.connection?.saveData)return;
 secondaryStarted=true;
 const run=()=>prepareAssetGroup(AR_PRELOAD_ASSETS.nearFuture.map(path=>({id:path,load:()=>loadPreparedImage(assetURL(path))})),{concurrency:1})
  .then(()=>import('./demoBeeModel.js')).then(module=>module.prepareDemoBeeModel()).catch(error=>console.warn('Optional AR preparation:',error));
 if(globalThis.requestIdleCallback)requestIdleCallback(run,{timeout:2500});else setTimeout(run,0);
}
