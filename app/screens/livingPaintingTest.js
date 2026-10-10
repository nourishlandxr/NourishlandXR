import * as THREE from '../vendor/three.module.min.js';
import {BUILD_INFO} from '../services/buildInfo.js';
import {createAnimatedPropertyPeekWorld} from '../services/animatedPropertyPainting.js';
import {OPENING_RADIUS} from '../services/peekOpening.js';
import {prepareLivingFrameModel} from '../services/livingFrameModel.js';

// Explicit experiment: separate renderer/session; never changes the demo timeline.
export async function renderLivingPaintingTest(app,{onBack}={}){
 app.innerHTML=`<section class="screen" data-living-painting-test data-ready="loading">
 <style>
 #app:has(>[data-living-painting-test]){width:100%;max-width:none;padding:0}
 #app [data-living-painting-test].screen{display:block;padding:18px!important;max-width:1500px;margin:auto;color:#e1e8df;background:#172126;min-height:100vh;box-sizing:border-box}
 [data-living-painting-test] .v2-masthead{display:none!important}
 #app [data-living-painting-test] :is(h1,p,label,summary,output,pre){color:#e1e8df}
 [data-living-painting-test] h1{font-size:clamp(24px,3vw,36px);margin:6px 0 12px}
 [data-living-painting-test] .painting-layout{display:grid;grid-template-columns:minmax(0,1fr) 285px;gap:18px}
 [data-living-painting-test] .painting-view{height:min(680px,calc(100vh - 148px));min-height:460px;position:relative;overflow:hidden;border-radius:16px;background:#172126}
 [data-living-painting-test] canvas{width:100%;height:100%;display:block}
 [data-living-painting-test] button,[data-living-painting-test] select{background:#2d403c;border:1px solid #62746a;color:#edf2e9;border-radius:8px;padding:9px;margin:3px 0;cursor:pointer}
 [data-living-painting-test] button:disabled{opacity:.45;cursor:default}
 [data-living-painting-test] label{display:block;margin:12px 0;font-size:14px}
 [data-living-painting-test] input[type=range]{width:100%;accent-color:#a5bf8c}
 #app [data-living-painting-test] input[type=checkbox]{display:inline-block;width:16px;height:16px;margin-right:6px;vertical-align:middle;accent-color:#a5bf8c}
 [data-living-painting-test] p,[data-living-painting-test] output{font-size:14px;line-height:1.5;display:block}
 [data-living-painting-test] pre{font-size:11px;white-space:pre-wrap;max-height:220px;overflow:auto}
 [data-living-painting-test] .painting-overlay{position:absolute;bottom:12px;left:12px;right:12px;background:#172126d9;border-radius:10px;padding:10px;font-size:13px}
 [data-living-painting-test].painting-xr .painting-desktop-controls{display:none}
 @media(max-width:800px){[data-living-painting-test] .painting-layout{grid-template-columns:1fr}[data-living-painting-test] .painting-view{height:60vh;min-height:380px}}
 </style>
 <button data-back>← Return to welcome</button> <small>App experiment · V${BUILD_INFO.version}</small>
 <h1>A familiar place. Quietly alive.</h1>
 <div class="painting-layout"><div class="painting-view" data-view><div class="painting-overlay" data-overlay>
 <span data-frame-status>Loading the Living Frame…</span><br><button data-recenter disabled>Recenter in XR</button> <button data-leave disabled>Leave XR</button>
 </div></div><aside>
 <p>Your property painting inside the Living Frame. Lean or look closer to explore its gentle depth.</p>
 <div class="painting-desktop-controls"><button data-centre>Whole frame</button> <button data-near>Look closer</button>
 <label>Lean sideways<input data-lean aria-label="Lean sideways" type="range" min="-.6" max=".6" step=".01" value="0"></label>
 <label>Move closer<input data-approach aria-label="Move closer" type="range" min="0" max="2.8" step=".01" value="0"></label>
 <label>Frame quality <select data-quality aria-label="Frame quality"><option value="sd">SD</option><option value="hd">HD</option><option value="off">Test rim only</option></select></label>
 <label>Frame growth<input data-growth aria-label="Frame growth" type="range" min="0" max="60" step=".1" value="60"></label><button data-grow>Replay frame growth</button>
 <label><input data-stereo type="checkbox"> Simulated stereo (64 mm)</label></div>
 <button data-motion disabled>Pause painting</button>
 <label>Painting motion<input data-strength aria-label="Painting motion" type="range" min="0" max="1" step=".05" value=".65"></label>
 <label><input data-peek type="checkbox" checked> Show painting</label>
 <button data-ar disabled>Test mixed reality</button> <button data-vr disabled>Test VR</button>
 <output data-xr-status>Checking WebXR availability…</output>
 <details class="painting-desktop-controls"><summary>Desktop verification</summary><button data-check disabled>Check rendering</button><output data-check-summary>Checks have not run.</output><pre data-report></pre></details>
 <pre data-metrics></pre><p>Painted depth relief, with approximate geometry. This is an app test; headset comfort and performance still need review.</p>
 </aside></div></section>`;
 const root=app.querySelector('[data-living-painting-test]'),get=name=>root.querySelector(`[data-${name}]`),mount=get('view');
 let disposed=false,renderer=null,peek=null,entry=null,frameScene=null,mixer=null,frameMaterials=[],session=null,xrBusy=false,frameGeneration=0;
 let resizeObserver=null,removalObserver=null,previous=0,metricAt=0,placementPending=false,growing=false,checking=false,stereo=false;
 const disposeFrame=()=>{mixer?.stopAllAction();if(frameScene)mixer?.uncacheRoot(frameScene);frameScene?.removeFromParent();for(const m of frameMaterials)m.dispose();frameMaterials=[];frameScene=null;mixer=null;if(entry)entry.users--;entry=null;};
 function destroy(){if(disposed)return;disposed=true;frameGeneration++;renderer?.setAnimationLoop(null);resizeObserver?.disconnect();removalObserver?.disconnect();window.removeEventListener('pagehide',destroy);session?.end().catch(()=>{});disposeFrame();peek?.dispose();renderer?.dispose();renderer?.domElement.remove();}
 get('back').onclick=async()=>{if(xrBusy)return;if(session)await session.end().catch(()=>{});destroy();onBack?.();};
 removalObserver=new MutationObserver(()=>{if(!root.isConnected)destroy();});removalObserver.observe(app,{childList:true});window.addEventListener('pagehide',destroy);
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,stencil:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.localClippingEnabled=true;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.setClearColor(0x172126,1);
  if(!renderer.getContext().getContextAttributes().stencil)throw Error('A stencil buffer is required for this experiment.');
  mount.prepend(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.025,120),eyePair=new THREE.StereoCamera();eyePair.eyeSep=.064;
  scene.add(new THREE.HemisphereLight(0xdce9f4,0x303820,3),new THREE.AmbientLight(0xe4e9df,.9));const key=new THREE.DirectionalLight(0xffedcf,4.2);key.position.set(-2,3,4);scene.add(key);
  const texture=await new THREE.TextureLoader().loadAsync(new URL('../assets/peek-world/property-painting-v2.png',import.meta.url).href);
  if(disposed){texture.dispose();return;}
  texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  peek=createAnimatedPropertyPeekWorld(texture,{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  peek.world.traverse(obj=>{if(obj.material)obj.material.toneMapped=false;});peek.root.position.set(0,1.6,-1.8);scene.add(peek.root);
  function pose(){camera.position.set(Number(get('lean').value),1.6,1.4-Number(get('approach').value));camera.rotation.set(0,0,0);camera.updateMatrixWorld(true);}
  function resize(){if(session||disposed)return;const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  pose();resizeObserver=new ResizeObserver(resize);resizeObserver.observe(mount);resize();
  function syncMotion(){get('motion').textContent=peek.playing?'Pause painting':'Resume painting';}
  get('lean').oninput=get('approach').oninput=pose;
  get('centre').onclick=()=>{get('lean').value=get('approach').value=0;pose();};get('near').onclick=()=>{get('lean').value=0;get('approach').value=1.4;pose();};
  get('motion').disabled=false;get('motion').onclick=()=>{peek.setPlaying(!peek.playing);syncMotion();};syncMotion();
  get('strength').oninput=()=>peek.setMotionStrength(Number(get('strength').value));get('peek').onchange=()=>peek.setEnabled(get('peek').checked);
  get('stereo').onchange=()=>stereo=get('stereo').checked;get('growth').oninput=()=>{growing=false;mixer?.setTime(Number(get('growth').value));};
  get('grow').onclick=()=>{get('growth').value=0;mixer?.setTime(0);growing=true;};
  async function selectFrame(quality){
   const token=++frameGeneration;disposeFrame();peek.rim.visible=true;root.dataset.frameReady='loading';get('check').disabled=true;
   delete root.dataset.checksPassed;get('report').textContent='';get('check-summary').textContent='Checks have not run for this frame selection.';
   if(quality==='off'){get('frame-status').textContent='Temporary test rim · frame disabled';root.dataset.frameReady='off';get('check').disabled=false;return;}
   get('frame-status').textContent=`Loading Living Frame ${quality.toUpperCase()}…`;
   try{
    const loaded=await prepareLivingFrameModel(quality);if(disposed||token!==frameGeneration)return;
    entry=loaded;entry.users++;frameScene=entry.asset.scene.clone(true);
    // The cache owns geometry/textures; this view owns only its material clones.
    const clones=new Map();frameScene.traverse(obj=>{if(obj.isMesh){obj.renderOrder=3;const copy=m=>{if(!clones.has(m)){const clone=m.clone();clone.stencilWrite=false;clones.set(m,clone);frameMaterials.push(clone);}return clones.get(m);};obj.material=Array.isArray(obj.material)?obj.material.map(copy):copy(obj.material);}});
    frameScene.position.set(0,-.016,.012);peek.root.add(frameScene);mixer=new THREE.AnimationMixer(frameScene);
    for(const clip of entry.asset.animations){const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();}
    mixer.setTime(Number(get('growth').value));peek.rim.visible=false;root.dataset.frameReady=quality;
    get('frame-status').textContent=`Living Frame ${quality.toUpperCase()} · painting loads independently`;get('check').disabled=false;
   }catch(error){if(disposed||token!==frameGeneration)return;disposeFrame();root.dataset.frameReady='fallback';get('frame-status').textContent='Frame unavailable; test rim remains. '+error.message;get('check').disabled=false;}
  }
  get('quality').onchange=()=>void selectFrame(get('quality').value);void selectFrame('sd');
  function eyes(){eyePair.aspect=.5;eyePair.update(camera);for(const eye of [eyePair.cameraL,eyePair.cameraR])eye.projectionMatrixInverse.copy(eye.projectionMatrix).invert();}
  function draw(){
   camera.updateMatrixWorld(true);renderer.info.autoReset=false;renderer.info.reset();
   if(stereo&&!session){eyes();renderer.setScissorTest(true);const size=renderer.getSize(new THREE.Vector2()),half=Math.floor(size.x/2);
    for(const [eye,x,w] of [[eyePair.cameraL,0,half],[eyePair.cameraR,half,size.x-half]]){renderer.setViewport(x,0,w,size.y);renderer.setScissor(x,0,w,size.y);peek.update(eye);renderer.render(scene,eye);}
    renderer.setScissorTest(false);renderer.setViewport(0,0,size.x,size.y);
   }else{peek.update(camera);renderer.render(scene,camera);}
  }
  function readPixels(){const gl=renderer.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;}
  function difference(a,b){let count=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>1)count++;return count;}
  get('check').onclick=()=>{
   if(session||checking)return;checking=true;get('check').disabled=true;
   const savedPosition=camera.position.clone(),enabled=peek.enabled,moment=peek.moment,strength=peek.motionStrength,playing=peek.playing,oldStereo=stereo;
   const size=renderer.getSize(new THREE.Vector2()),gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,results=[];
   function inspect(c){
    // Use the renderer's actual integer device-pixel viewport, including DPR
    // rounding at the stereo boundary, rather than a reconstructed CSS width.
    const actual=gl.getParameter(gl.VIEWPORT),viewport={x:actual[0],y:actual[1],w:actual[2],h:actual[3]};
    peek.setEnabled(false);peek.update(c);renderer.render(scene,c);const before=readPixels();peek.setEnabled(true);peek.update(c);renderer.render(scene,c);const after=readPixels();
    const inverse=peek.root.matrixWorld.clone().invert(),origin=new THREE.Vector3().setFromMatrixPosition(c.matrixWorld).applyMatrix4(inverse),far=new THREE.Vector3();let changed=0,leaks=0;const leakSamples=[];
    // An odd-sized drawing buffer can clip the last column of the rounded
    // right-eye viewport. Inspect only pixels that actually exist in the buffer.
    for(let y=Math.max(0,viewport.y);y<Math.min(h,viewport.y+viewport.h);y++)for(let x=Math.max(0,viewport.x);x<Math.min(w,viewport.x+viewport.w);x++){
     const i=(y*w+x)*4;if(Math.max(Math.abs(after[i]-before[i]),Math.abs(after[i+1]-before[i+1]),Math.abs(after[i+2]-before[i+2]))<8)continue;
     changed++;far.set((x+.5-viewport.x)/viewport.w*2-1,(y+.5-viewport.y)/viewport.h*2-1,.5).unproject(c).applyMatrix4(inverse).sub(origin);
     const t=-origin.z/far.z,px=origin.x+far.x*t,py=origin.y+far.y*t;if(!(t>0&&px*px+py*py<(OPENING_RADIUS+.035)**2)){leaks++;if(leakSamples.length<3)leakSamples.push({x,y,radius:Math.hypot(px,py),before:[...before.slice(i,i+4)],after:[...after.slice(i,i+4)]});}
    }
    return {changedPixels:changed,outsideOpeningPixels:leaks,...(leaks?{viewport,leakSamples}:{}),passed:changed>300&&leaks===0};
   }
   try{
    stereo=false;peek.setPlaying(false);peek.setMoment(0);
    for(const [name,x,z] of [['whole frame',0,1.4],['left',-.42,0],['right',.42,0],['closer',0,-.6]]){camera.position.set(x,1.6,z);camera.updateMatrixWorld(true);results.push({view:name,...inspect(camera)});}
    camera.position.set(0,1.6,0);camera.updateMatrixWorld(true);eyes();renderer.setScissorTest(true);const half=Math.floor(size.x/2);
    for(const [name,c,x,width] of [['left eye',eyePair.cameraL,0,half],['right eye',eyePair.cameraR,half,size.x-half]]){renderer.setViewport(x,0,width,size.y);renderer.setScissor(x,0,width,size.y);results.push({view:name,...inspect(c)});}
    renderer.setScissorTest(false);renderer.setViewport(0,0,size.x,size.y);camera.position.set(0,1.6,0);peek.setEnabled(true);
    const read=(t,s)=>{peek.setMoment(t);peek.setMotionStrength(s);draw();return readPixels();};const a=read(0,.65),b=read(36,.65),end=read(120,.65),stillA=read(0,0),stillB=read(36,0);const paused=read(36,.65);draw();
    const motion={changedPixels:difference(a,b),loopSeamPixels:difference(a,end),zeroStrengthPixels:difference(stillA,stillB),pausedChangePixels:difference(paused,readPixels())};
    const report={version:BUILD_INFO.version,frame:root.dataset.frameReady,passed:results.every(r=>r.passed)&&motion.changedPixels>300&&motion.loopSeamPixels===0&&motion.zeroStrengthPixels===0&&motion.pausedChangePixels===0&&gl.getError()===gl.NO_ERROR,results,motion,headsetVerified:false};
    root.dataset.checksPassed=String(report.passed);get('report').textContent=JSON.stringify(report,null,2);get('check-summary').textContent=report.passed?'6/6 aperture views + animation checks pass':'Rendering checks failed; inspect report';
   }catch(error){get('check-summary').textContent='Checks failed: '+error.message;root.dataset.checksPassed='false';}
   finally{renderer.setScissorTest(false);renderer.setViewport(0,0,size.x,size.y);camera.position.copy(savedPosition);peek.setEnabled(enabled);peek.setMoment(moment);peek.setMotionStrength(strength);peek.setPlaying(playing);stereo=oldStereo;checking=false;get('check').disabled=false;previous=0;draw();}
  };
  function xrButtons(){get('ar').disabled=xrBusy||Boolean(session)||!get('ar').dataset.supported;get('vr').disabled=xrBusy||Boolean(session)||!get('vr').dataset.supported;get('recenter').disabled=get('leave').disabled=!session;get('back').disabled=xrBusy;}
  async function enter(mode){
   if(xrBusy||session||disposed)return;xrBusy=true;xrButtons();let requested=null;
   try{
    requested=await navigator.xr.requestSession(mode,{requiredFeatures:['local-floor'],optionalFeatures:['dom-overlay'],domOverlay:{root}});
    if(disposed){await requested.end();return;}
    session=requested;placementPending=true;
    session.addEventListener('end',()=>{session=null;if(disposed)return;root.classList.remove('painting-xr');renderer.setClearColor(0x172126,1);peek.root.position.set(0,1.6,-1.8);peek.root.rotation.set(0,0,0);pose();resize();previous=0;xrButtons();get('xr-status').textContent='XR ended. Desktop review restored.';},{once:true});
    await renderer.xr.setSession(session);if(disposed){await requested.end();return;}
    root.classList.add('painting-xr');renderer.setClearColor(0x172126,mode==='immersive-ar'?0:1);get('xr-status').textContent='Headset test active · select pauses painting · squeeze recenters';
   }catch(error){await requested?.end().catch(()=>{});session=null;if(!disposed)get('xr-status').textContent='XR could not start: '+error.message;}
   finally{xrBusy=false;if(!disposed)xrButtons();}
  }
  get('ar').onclick=()=>void enter('immersive-ar');get('vr').onclick=()=>void enter('immersive-vr');get('leave').onclick=()=>void session?.end();get('recenter').onclick=()=>placementPending=true;
  for(let i=0;i<2;i++){renderer.xr.getController(i).addEventListener('select',()=>{peek.setPlaying(!peek.playing);syncMotion();});renderer.xr.getController(i).addEventListener('squeeze',()=>placementPending=true);}
  if(navigator.xr&&isSecureContext){for(const [mode,name] of [['immersive-ar','ar'],['immersive-vr','vr']])if(await navigator.xr.isSessionSupported(mode).catch(()=>false))get(name).dataset.supported='true';}
  if(disposed)return;xrButtons();get('xr-status').textContent=get('ar').dataset.supported?'Mixed reality available; ready for your headset test.':get('vr').dataset.supported?'VR available; mixed reality unavailable here.':'No immersive WebXR device in this browser. Desktop review is available.';
  renderer.setAnimationLoop((time,frame)=>{
   if(disposed||checking)return;const delta=previous&&!document.hidden?Math.min(.1,(time-previous)/1000):0;previous=time;peek.advanceAnimation(delta);
   if(growing&&mixer){const growth=Math.min(60,Number(get('growth').value)+delta);get('growth').value=growth;mixer.setTime(growth);if(growth>=60)growing=false;}
   if(session&&frame){const pose=frame.getViewerPose(renderer.xr.getReferenceSpace());if(pose){const head=pose.transform.position,q=pose.transform.orientation;
    if(placementPending){const forward=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w));forward.y=0;if(forward.lengthSq()>.001){forward.normalize();peek.root.position.set(head.x+forward.x*1.8,head.y,head.z+forward.z*1.8);peek.root.rotation.y=Math.atan2(-forward.x,-forward.z);placementPending=false;}}
    camera.position.set(head.x,head.y,head.z);camera.updateMatrixWorld(true);
   }}
   draw();if(time-metricAt>900){metricAt=time;get('metrics').textContent=`${session?'XR session':stereo?'Simulated stereo':'Desktop'} · ${renderer.info.render.calls} draw calls\n${renderer.info.render.triangles.toLocaleString()} triangles\n${renderer.info.memory.geometries} geometries · ${renderer.info.memory.textures} textures\nPainting ${peek.playing?'playing':'paused'} · ${peek.moment.toFixed(1)}s\nFrame growth ${Number(get('growth').value).toFixed(1)} / 60s`;}
  });root.dataset.ready='true';
 }catch(error){if(disposed)return;destroy();root.dataset.ready='error';get('frame-status').textContent='App test unavailable: '+error.message;get('xr-status').textContent='Use Return to welcome to leave this test.';console.error(error);}
}
