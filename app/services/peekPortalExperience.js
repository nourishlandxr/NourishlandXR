import * as THREE from '../vendor/three.module.min.js';
import {createPortalPlantStudy} from './portalPlantStudy.js';
import {createDemoLivingMapXR} from './demoLivingMapXR.js';
import {prepareLivingFrameModel} from './livingFrameModel.js';

// Preloaded test scene, shared by desktop and the existing native XR session.
export function createPeekPortalExperience(){
 const portal=createPortalPlantStudy(),scene=new THREE.Scene();scene.add(portal.root,new THREE.HemisphereLight(0xe6f4ff,0x283320,3));
 const key=new THREE.PointLight(0xa8d7ff,18,10);key.position.set(0,2,-3);scene.add(key);
 let frame,entry,materials=[],native,maskRenderer,fadeRenderer,desktop,mount,raf=0,active=false,start=0,onExit=()=>{},destroyed=false,anchor=new THREE.Matrix4();
 const camera=new THREE.PerspectiveCamera(65,1,.02,40),eye=new THREE.PerspectiveCamera(),maskScene=new THREE.Scene(),fadeScene=new THREE.Scene();
 const maskGeometry=new THREE.CircleGeometry(.89,128),maskMaterial=new THREE.MeshBasicMaterial({color:0xffffff}),mask=new THREE.Mesh(maskGeometry,maskMaterial);maskScene.add(mask);
 const fadeGeometry=new THREE.PlaneGeometry(4,4),fadeMaterial=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,depthWrite:false}),fadeMesh=new THREE.Mesh(fadeGeometry,fadeMaterial);fadeMesh.position.z=-.1;fadeScene.add(fadeMesh);fadeScene.updateMatrixWorld(true);
 const ready=prepareLivingFrameModel('sd').then(value=>{if(destroyed)return false;entry=value;entry.users++;frame=value.asset.scene.clone(true);frame.traverse(o=>{if(o.isMesh){o.renderOrder=3;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const m of Array.isArray(o.material)?o.material:[o.material]){m.stencilWrite=false;materials.push(m);}}});frame.position.set(0,-.016,.012);portal.root.add(frame);const mixer=new THREE.AnimationMixer(frame);for(const clip of value.asset.animations){const a=mixer.clipAction(clip);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();}mixer.setTime(60);portal.rim.visible=false;return true;}).catch(()=>false);
 function setContext(gl){native?.destroy();maskRenderer?.destroy();fadeRenderer?.destroy();portal.root.position.set(0,0,0);portal.root.updateMatrixWorld(true);native=createDemoLivingMapXR(gl,portal.world,{worldScale:1,surfaceDetail:true,fadeTransform:false});maskRenderer=createDemoLivingMapXR(gl,maskScene,{worldScale:1,fadeTransform:false});fadeRenderer=createDemoLivingMapXR(gl,fadeScene,{worldScale:1,fadeTransform:false});}
 const poseFromMatrix=matrix=>{const m=new THREE.Matrix4().fromArray(matrix),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();m.decompose(p,q,s);return {p,q};};
 function begin(matrix,exit){anchor.fromArray(matrix);portal.resetEntry();active=true;start=performance.now();onExit=exit;}
 function close(){active=false;cancelAnimationFrame(raf);desktop?.dispose();desktop=null;mount?.remove();mount=null;onExit();}
 function drawNative(gl,view,frameModel,viewerMatrix){if(!active||!native)return;const elapsed=performance.now()-start,{p,q}=poseFromMatrix(anchor.elements);
  if(elapsed<350){const viewer=poseFromMatrix(view.transform.matrix);fadeRenderer.draw(view,viewer.p,viewer.q,elapsed/350);return;}
  portal.root.matrixAutoUpdate=false;portal.root.matrix.copy(anchor);portal.root.updateMatrixWorld(true);eye.matrixAutoUpdate=false;eye.matrixWorld.fromArray(viewerMatrix||view.transform.matrix);portal.update(eye);
  // World matrices already include the portal anchor; submit with identity pose.
  const zero={x:0,y:0,z:0},identity={x:0,y:0,z:0,w:1},opacity=Math.min(1,(elapsed-350)/500);
  const stencilEnabled=gl.isEnabled(gl.STENCIL_TEST);gl.enable(gl.STENCIL_TEST);gl.stencilMask(255);gl.clearStencil(0);gl.clear(gl.STENCIL_BUFFER_BIT);
  if(!portal.inside){mask.matrixAutoUpdate=false;mask.matrix.copy(anchor);maskScene.updateMatrixWorld(true);gl.stencilFunc(gl.ALWAYS,1,255);gl.stencilOp(gl.KEEP,gl.KEEP,gl.REPLACE);gl.colorMask(false,false,false,false);maskRenderer.draw(view,zero,identity,1);gl.colorMask(true,true,true,true);gl.clear(gl.DEPTH_BUFFER_BIT);gl.stencilFunc(gl.EQUAL,1,255);}else gl.stencilFunc(gl.ALWAYS,1,255);
  gl.stencilMask(0);gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);native.draw(view,zero,identity,opacity);
  gl.disable(gl.STENCIL_TEST);gl.stencilMask(255);frameModel?.drawXR(view,anchor.elements);if(stencilEnabled)gl.enable(gl.STENCIL_TEST);
 }
 async function openDesktop(container,exit){await ready;if(destroyed)return;begin(new THREE.Matrix4().makeTranslation(0,1.6,-1.8).elements,exit);mount=document.createElement('div');mount.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#172126;opacity:0;transition:opacity .5s';mount.innerHTML='<button style="position:absolute;top:14px;left:14px;z-index:2;padding:12px">Back to scene</button>';container.append(mount);mount.querySelector('button').onclick=close;
  desktop=new THREE.WebGLRenderer({antialias:true,alpha:true,stencil:true});desktop.localClippingEnabled=true;desktop.setClearColor(0x172126,1);desktop.setPixelRatio(Math.min(devicePixelRatio,1.5));mount.append(desktop.domElement);portal.root.matrixAutoUpdate=true;portal.root.position.set(0,1.6,-1.8);portal.root.rotation.set(0,0,0);let depth=0,yaw=0,pitch=0;
  desktop.domElement.onwheel=e=>{e.preventDefault();depth=Math.max(0,Math.min(4.3,depth-e.deltaY*.004));};let drag=null;desktop.domElement.onpointerdown=e=>{drag=[e.clientX,e.clientY];desktop.domElement.setPointerCapture(e.pointerId);};desktop.domElement.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.004;pitch=Math.max(-1.3,Math.min(1.3,pitch-(e.clientY-drag[1])*.004));drag=[e.clientX,e.clientY];};desktop.domElement.onpointerup=()=>drag=null;
  const hint=document.createElement('p');hint.style.cssText='position:absolute;bottom:8px;left:20px;color:white';hint.textContent='Scroll to move through the frame · drag to look around';mount.append(hint);
  function tick(){if(!active||!desktop)return;raf=requestAnimationFrame(tick);const w=innerWidth,h=innerHeight;desktop.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();camera.position.set(0,1.6,1.4-depth);camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld(true);portal.update(camera);desktop.render(scene,camera);}tick();requestAnimationFrame(()=>mount.style.opacity='1');
 }
 return {ready,setContext,begin,close,openDesktop,drawNative,get inside(){return portal.inside;},get active(){return active;},get replacesScene(){return active&&performance.now()-start>=350;},destroy(){if(destroyed)return;destroyed=true;active=false;cancelAnimationFrame(raf);desktop?.dispose();mount?.remove();native?.destroy();maskRenderer?.destroy();fadeRenderer?.destroy();portal.dispose();for(const m of materials)m.dispose();if(entry)entry.users--;maskGeometry.dispose();maskMaterial.dispose();fadeGeometry.dispose();fadeMaterial.dispose();}};
}
