import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {createLivingFrameXR} from './livingFrameXR.js';
import {getSpatialVisualSettings} from './spatialVisualSettings.js';

export const LIVING_FRAME_GROWTH_DURATION_MS=180000;
const SOURCE_GROWTH_SECONDS=60;

const assets=new Map(),pending=new Map();
const url=quality=>new URL('../assets/living-frame/living-frame-'+quality+'.glb',import.meta.url).href;
function disposeAsset(asset){const geometries=new Set(),materials=new Set(),textures=new Set();asset.scene.traverse(node=>{if(node.isMesh){geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.dispose();t.image?.close?.();}}
function trim(keep){for(const [quality,entry] of assets)if(quality!==keep&&!entry.users){disposeAsset(entry.asset);assets.delete(quality);}}
export function prepareLivingFrameModel(quality=getSpatialVisualSettings().livingFrameQuality){
 if(quality==='off')return Promise.resolve(null);
 if(!['sd','hd'].includes(quality))return Promise.reject(Error('Unknown Living Frame quality.'));
 if(assets.has(quality))return Promise.resolve(assets.get(quality));
 if(pending.has(quality))return pending.get(quality);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 const promise=fetch(url(quality),{signal:controller.signal}).then(response=>{if(!response.ok)throw Error('Living Frame download failed ('+response.status+').');return response.arrayBuffer();}).then(bytes=>new GLTFLoader().parseAsync(bytes,new URL('.',url(quality)).href)).then(asset=>{const entry={asset,users:0};assets.set(quality,entry);trim(quality);return entry;}).finally(()=>{clearTimeout(timeout);pending.delete(quality);});pending.set(quality,promise);return promise;
}

// Text never waits for this controller. Its ready flag swaps the canvas rim
// only when the selected model can draw; failures leave the fallback usable.
export function createLivingFrameModel({load=prepareLivingFrameModel,onChange=()=>{}}={}){
 let quality='off',entry=null,scene=null,mixer=null,xr=null,gl=null,desktop=null,generation=0,destroyed=false,lastTime=-1,lastDraw=-Infinity,visible=false,error=null,failedQuality=null;
 const drop=(keep=quality)=>{xr?.destroy();xr=null;if(scene){mixer?.stopAllAction();mixer?.uncacheRoot(scene);}if(entry)entry.users--;entry=null;scene=null;mixer=null;lastTime=-1;trim(keep);};
 async function select(next){
  if(destroyed||next===quality)return;
  quality=next;const token=++generation;error=null;failedQuality=null;
  if(next==='off'){drop();if(desktop){desktop.renderer.clear();desktop.canvas.hidden=true;}onChange();return;}
  try{const loaded=await load(next);if(destroyed||token!==generation)return;drop();entry=loaded;entry.users++;scene=entry.asset.scene.clone(true);mixer=new THREE.AnimationMixer(scene);for(const clip of entry.asset.animations){const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();}if(gl)xr=createLivingFrameXR(gl,scene);if(desktop){desktop.group.clear();desktop.group.add(scene);}onChange();}
  catch(cause){if(token===generation&&!destroyed){error=cause;failedQuality=next;onChange();console.warn('Living Frame artwork fallback:',cause.message);}}
 }
 function attachDesktop(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;
  const world=new THREE.Scene(),group=new THREE.Group(),camera=new THREE.OrthographicCamera(-2,2,1.68,-1.68,.01,12);camera.position.z=4;group.position.y=-.016;world.add(group);if(scene)group.add(scene);world.add(new THREE.HemisphereLight(0xdce9f4,0x303820,3),new THREE.AmbientLight(0xe4e9df,.9));const key=new THREE.DirectionalLight(0xffedcf,4.2);key.position.set(-2,3,4);world.add(key);desktop={renderer,canvas,world,group,camera,width:0,height:0};
 }
 const api={select,attachDesktop,
  get ready(){return Boolean(scene&&quality!=='off'&&(!gl||xr?.ready));},get quality(){return quality;},get error(){return error;},get scene(){return scene;},get growthTime(){return lastTime;},get renderStats(){return xr?.stats||null;},
  setContext(context){if(gl===context)return;xr?.destroy();gl=context;xr=gl&&scene?createLivingFrameXR(gl,scene):null;onChange();},
  update(elapsed,{show=true,reduced=false,frameToken=elapsed}={}){
   const next=getSpatialVisualSettings().livingFrameQuality;if(next!==quality)void select(next);visible=show;
   if(!scene)return;
   const duration=LIVING_FRAME_GROWTH_DURATION_MS/1000,seconds=reduced?duration:Math.max(0,Math.min(duration,elapsed/1000)),time=quality==='sd'?Math.floor(seconds*15)/15:Math.floor(seconds*30)/30;
   const changed=time!==lastTime;if(changed){mixer.setTime(time*SOURCE_GROWTH_SECONDS/duration);lastTime=time;}
   if(xr&&!xr.ready&&lastDraw!==frameToken){const finished=xr.prepareNext();lastDraw=frameToken;if(finished)onChange();}
   if(!desktop)return;
   desktop.canvas.hidden=!show||quality==='off';if(!show)return;
   const width=Math.max(1,desktop.canvas.clientWidth),height=Math.max(1,desktop.canvas.clientHeight),resized=width!==desktop.width||height!==desktop.height;
   if(resized){desktop.width=width;desktop.height=height;desktop.renderer.setSize(width,height,false);}
   if(changed||resized||lastDraw<0){desktop.renderer.render(desktop.world,desktop.camera);lastDraw=frameToken;}
  },
  drawXR(view,anchorMatrix){if(!visible||!api.ready||!xr)return;const matrix=new THREE.Matrix4().fromArray(anchorMatrix);matrix.multiply(new THREE.Matrix4().makeTranslation(0,-.016,.012));xr.draw(view,matrix);},
  retry(){if(!failedQuality)return Promise.resolve();const next=quality;quality='off';return select(next);},
  destroy(){if(destroyed)return;destroyed=true;++generation;quality='off';drop(getSpatialVisualSettings().livingFrameQuality);if(desktop){desktop.renderer.dispose();desktop.canvas.remove();desktop=null;}}
 };
 return api;
}
