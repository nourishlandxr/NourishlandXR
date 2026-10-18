import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import { GLTFLoader } from '../assets/fruit-window/vendor/GLTFLoader.js';

const ASSETS=['assets/biome-wheel/wheel-body.glb','assets/biome-wheel/living-biomes.glb','assets/biome-wheel/windbreaks.glb'];

export function renderBiomeWheelXR(app,{onExit=()=>globalThis.renderLaunchScreen?.()}={}){
 let session=null,renderer=null,scene=null,wheel=null,mycelium=null,animationStarted=false,disposed=false;
 app.innerHTML=`<main class="biome-xr" data-biome-xr><div class="biome-xr__sky" aria-hidden="true"></div><header class="biome-xr__bar"><strong>Biome wheel</strong><div class="biome-xr__controls"><fieldset data-xr-modes disabled><legend class="sr-only">Immersive mode</legend><button type="button" data-xr-mode="immersive-vr" aria-pressed="true">VR</button><button type="button" data-xr-mode="immersive-ar" aria-pressed="false">AR</button></fieldset><label class="biome-xr__light"><span>Day</span><input data-xr-light type="range" min="0" max="2" step="1" value="0" aria-label="Wheel lighting" aria-valuetext="Day"><span>Mycelium</span></label><button type="button" data-xr-exit aria-label="Exit biome wheel">Exit</button></div></header><section class="biome-xr__entry"><p class="v2-eyebrow">Living systems · spatial study</p><h1>Stand within the living wheel.</h1><p data-xr-status role="status">Checking this device for immersive VR and AR…</p><button type="button" class="v2-primary" data-xr-enter disabled>Enter immersive view</button><small>The landscape downloads only after a compatible immersive session starts. Movement is disabled.</small></section><div class="biome-xr__stage" data-xr-stage aria-label="Immersive biome wheel stage"></div></main>`;
 const root=app.querySelector('[data-biome-xr]'),stage=root.querySelector('[data-xr-stage]'),status=root.querySelector('[data-xr-status]'),enter=root.querySelector('[data-xr-enter]'),modes=root.querySelector('[data-xr-modes]'),light=root.querySelector('[data-xr-light]'),exit=root.querySelector('[data-xr-exit]');
 const support={'immersive-vr':false,'immersive-ar':false};let selected='immersive-vr',lighting=0;
 const setStatus=text=>{status.textContent=text};
 const setMode=mode=>{if(session||!support[mode])return;selected=mode;for(const button of modes.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.xrMode===mode));enter.textContent=`Enter ${mode==='immersive-ar'?'AR':'VR'}`};
 async function detect(){
  if(!globalThis.navigator?.xr){setStatus('This browser does not expose an immersive XR device. The biome model has not been loaded.');return}
  const results=await Promise.allSettled(Object.keys(support).map(mode=>navigator.xr.isSessionSupported(mode)));Object.keys(support).forEach((mode,i)=>support[mode]=results[i].status==='fulfilled'&&results[i].value);
  for(const button of modes.querySelectorAll('button'))button.disabled=!support[button.dataset.xrMode];modes.disabled=false;
  selected=support['immersive-vr']?'immersive-vr':support['immersive-ar']?'immersive-ar':selected;if(!support[selected]){setStatus('No compatible immersive VR or AR device was detected. The biome model has not been loaded.');return}
  setMode(selected);enter.disabled=false;setStatus(`${support['immersive-vr']?'VR':''}${support['immersive-vr']&&support['immersive-ar']?' and ':''}${support['immersive-ar']?'AR':''} detected. Choose a mode, then enter the central circle.`)
 }
 function initRenderer(){
  if(renderer)return;scene=new THREE.Scene();scene.background=new THREE.Color(0xdcecf5);const camera=new THREE.PerspectiveCamera(62,1,.02,80);camera.position.set(0,1.64,0);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.xr.enabled=true;renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.outputEncoding=THREE.sRGBEncoding;stage.append(renderer.domElement);
  const hemi=new THREE.HemisphereLight(0xe8f4ff,0x597356,1.25),sun=new THREE.DirectionalLight(0xfff3d7,1.4);sun.position.set(-4,7,3);scene.add(hemi,sun);scene.userData.hemi=hemi;scene.userData.sun=sun;wheel=new THREE.Group();wheel.position.set(-.125,0,.2416666783);scene.add(wheel);mycelium=new THREE.Group();wheel.add(mycelium);mycelium.visible=false;
  renderer.setAnimationLoop((time)=>{if(disposed)return;if(wheel)wheel.rotation.y=(time*.000025)%(Math.PI*2);renderer.render(scene,camera)});animationStarted=true;
 }
 function collectForest(root,anchors){root.updateMatrixWorld(true);root.traverse(object=>{const piece=String(object.userData?.piece_id||''),role=object.userData?.role;if(role==='vegetation'&&/^[RCW]/.test(piece)){const p=new THREE.Vector3();object.getWorldPosition(p);anchors.push(p)}})}
 function createMycelium(anchors){
  const cell=.22,bins=new Map();for(const p of anchors){const key=`${Math.round(p.x/cell)},${Math.round(p.z/cell)}`,bin=bins.get(key)||{p:new THREE.Vector3(),n:0};bin.p.add(p);bin.n++;bins.set(key,bin)}
  const nodes=[...bins.values()].filter(b=>b.n>=3).map(b=>b.p.multiplyScalar(1/b.n).add(new THREE.Vector3(0,.012,0))),positions=[];const used=new Set();
  nodes.forEach((p,i)=>nodes.map((q,j)=>({j,d:i===j?Infinity:p.distanceTo(q)})).filter(e=>e.d<.46).sort((a,b)=>a.d-b.d).slice(0,2).forEach(e=>{const key=i<e.j?`${i}:${e.j}`:`${e.j}:${i}`;if(used.has(key))return;used.add(key);positions.push(...p.toArray(),...nodes[e.j].toArray())}));
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x3dffd0,transparent:true,opacity:.94,blending:THREE.AdditiveBlending,depthWrite:false}));mycelium.add(lines);root.dataset.myceliumLinks=String(used.size);root.dataset.myceliumSource='dense-forest-tree-placement';
 }
 async function loadWheel(){
  setStatus('Loading the five biome families around the central circle…');const loader=new GLTFLoader(),anchors=[];
  const models=await Promise.all(ASSETS.map(url=>loader.loadAsync(new URL(url,document.baseURI).href)));for(const gltf of models){collectForest(gltf.scene,anchors);wheel.add(gltf.scene)}createMycelium(anchors);root.dataset.modelLoaded='true';setLighting(lighting);setStatus('Biome wheel loaded. You are fixed at the central opening.');
 }
 function setLighting(value){
  lighting=Number(value);if(!scene)return;const mode=lighting===2?'mycelium':lighting===1?'night':'day',hemi=scene.userData.hemi,sun=scene.userData.sun;scene.background.set(mode==='day'?0xdcecf5:mode==='night'?0x071326:0x010207);hemi.intensity=mode==='day'?1.25:mode==='night'?.36:.035;sun.intensity=mode==='day'?1.4:mode==='night'?.55:.025;mycelium.visible=mode==='mycelium';light.setAttribute('aria-valuetext',mode[0].toUpperCase()+mode.slice(1));root.dataset.lighting=mode;
 }
 async function enterXR(){
  if(!support[selected]||session)return;enter.disabled=true;try{session=await navigator.xr.requestSession(selected,{requiredFeatures:['local-floor'],optionalFeatures:['dom-overlay'],domOverlay:{root}});initRenderer();await renderer.xr.setSession(session);session.addEventListener('end',()=>{session=null;enter.disabled=false;enter.textContent=`Enter ${selected==='immersive-ar'?'AR':'VR'}`;setStatus('Immersive session ended. The loaded wheel remains ready on this page.')},{once:true});await loadWheel()}catch(error){session=null;enter.disabled=false;setStatus(`The immersive session could not start: ${error.message}`)}
 }
 modes.addEventListener('click',event=>event.target.dataset.xrMode&&setMode(event.target.dataset.xrMode));light.addEventListener('input',()=>setLighting(light.value));enter.addEventListener('click',enterXR);exit.addEventListener('click',async()=>{disposed=true;if(session)await session.end();if(animationStarted)renderer?.setAnimationLoop(null);onExit()});detect().catch(error=>setStatus(`XR detection failed: ${error.message}`));
 return {get session(){return session},support};
}
