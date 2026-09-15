import * as THREE from '../vendor/three.module.min.js';
import {scrollTurn,gestureIntent,wheelGestureVelocity,decayWheelVelocity,WHEEL_DRAG_RADIANS_PER_PIXEL,discoveryOrientation,discoveryMomentumFactor} from './wheel-model.js';

export async function mountLandingWheel(hero){
if(!hero?.isConnected)return;
const abort=new AbortController();let disposed=false;
const listen=(target,type,handler,options={})=>target?.addEventListener(type,handler,{...options,signal:abort.signal});
const removal=new MutationObserver(()=>{if(!hero.isConnected)destroy();});removal.observe(document.body,{childList:true,subtree:true});
function destroy(){if(disposed)return;disposed=true;abort.abort();removal.disconnect();cancelAnimationFrame(frame);resizeObserver?.disconnect();intersectionObserver?.disconnect();for(const resource of resources)resource.dispose();renderer?.dispose();renderer?.forceContextLoss();}

const host=hero.querySelector('[data-canvas]');
const status=hero.querySelector('[data-status]');
const media=matchMedia('(prefers-reduced-motion: reduce)');
const forcedReduce=new URLSearchParams(location.search).get('motion')==='reduce';
const start=discoveryOrientation(Math.random());
let reduced=media.matches||forcedReduce,visible=true,frame=0,previous=0,time=0;
let velocity=0,pitchVelocity=0;
let roll=0,yaw=start.yaw,pitch=start.pitch,pointerX=0,pointerY=0,scroll=0,scrollOrigin=0,gesture=null;
let renderer,resizeObserver,intersectionObserver,renderedFrames=0;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,1,.1,40);
const wheel=new THREE.Group();scene.add(wheel);
const resources=new Set();
const keep=resource=>(resources.add(resource),resource);
function fallback(){hero.dataset.ready='error';hero.querySelector('#nl-instructions').textContent='A 120-faced botanical discovery die.';host.removeAttribute('tabindex');cancelAnimationFrame(frame);}
function requestDraw(){if(!disposed&&!frame&&visible&&!document.hidden&&hero.dataset.ready==='true')frame=requestAnimationFrame(draw);}
function readScroll(){const box=hero.getBoundingClientRect();scroll=scrollTurn(box.top,box.height,innerHeight);requestDraw();}
function setMotion(){reduced=media.matches||forcedReduce;hero.dataset.motion=reduced?'reduce':'full';hero.querySelector('#nl-instructions').textContent='Drag in any direction to discover another face of living knowledge.';scrollOrigin=scroll;if(reduced){velocity=0;pitchVelocity=0;}requestDraw();}
function reset(){roll=0;yaw=start.yaw;pitch=start.pitch;velocity=0;pitchVelocity=0;pointerX=0;pointerY=0;scrollOrigin=scroll;status.textContent='Discovery die returned to its starting view.';requestDraw();}

try{
 if(new URLSearchParams(location.search).get('renderer')==='fallback')throw new Error('Local fallback preview');
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);

 scene.add(new THREE.HemisphereLight(0xfffbef,0x354737,1.55));
 const keyLight=new THREE.DirectionalLight(0xfff2d9,2.25);keyLight.position.set(-4,6,7);scene.add(keyLight);
 const fillLight=new THREE.DirectionalLight(0xbed5bf,.72);fillLight.position.set(5,1,3);scene.add(fillLight);
 const rimLight=new THREE.DirectionalLight(0x7e947c,.85);rimLight.position.set(3,2,-5);scene.add(rimLight);

 const texture=await new THREE.TextureLoader().loadAsync(new URL('../assets/living-knowledge-seed-atlas.png',import.meta.url).href);
 if(disposed){texture.dispose();return;}
 keep(texture);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());

 const indexed=new THREE.SphereGeometry(1.72,12,6);
 const polyhedron=keep(indexed.toNonIndexed());indexed.dispose();polyhedron.computeVertexNormals();
 const skin=keep(new THREE.MeshStandardMaterial({map:texture,color:0xffffff,roughness:.78,metalness:.025}));
 wheel.add(new THREE.Mesh(polyhedron,skin));
 const faceEdges=keep(new THREE.EdgesGeometry(polyhedron,4));
 const edgeMaterial=keep(new THREE.LineBasicMaterial({color:0x304534,transparent:true,opacity:.2,depthWrite:false}));
 wheel.add(new THREE.LineSegments(faceEdges,edgeMaterial));
 host.dataset.faceCount=String(polyhedron.attributes.position.count/3);

 const shadowMaterial=keep(new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){vec2 p=(vUv-.5)*vec2(5.,8.);float a=exp(-dot(p,p))*.24;gl_FragColor=vec4(.12,.18,.10,a);}'}));
 const shadow=new THREE.Mesh(keep(new THREE.PlaneGeometry(4.8,2)),shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-2.08,.15);scene.add(shadow);

 function resize(){const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.set(0,.12,Math.max(6.8,2.52/(Math.tan(Math.PI/10)*Math.min(1,camera.aspect))));camera.lookAt(0,0,0);camera.updateProjectionMatrix();requestDraw();}
 resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
 intersectionObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){previous=0;requestDraw();}else{cancelAnimationFrame(frame);frame=0;}},{threshold:0});intersectionObserver.observe(host);
 hero.dataset.ready='true';setMotion();resize();readScroll();
}catch(error){console.warn('Living discovery die fallback:',error);fallback();}

function draw(now){
 frame=0;if(!visible||document.hidden||hero.dataset.ready!=='true')return;
 const dt=previous?Math.min((now-previous)/1000,.05):.016;previous=now;
 const live=!reduced;
 if(live){time+=dt;if(!gesture){roll+=dt*.24;yaw+=velocity*dt;velocity=decayWheelVelocity(velocity,dt,false);pitch+=pitchVelocity*dt;pitchVelocity=decayWheelVelocity(pitchVelocity,dt,false);}}
 const scrollDelta=live?scroll-scrollOrigin:0;
 const targetZ=roll+scrollDelta;
 const targetY=yaw+(live?pointerX*.12+Math.sin(time*.35)*.08+Math.sin(scrollDelta)*.36:0);
 const targetX=pitch+(live?pointerY*.08:0);
 const blend=reduced?1:1-Math.exp(-dt*4.2);
 wheel.rotation.x+=(targetX-wheel.rotation.x)*blend;wheel.rotation.y+=(targetY-wheel.rotation.y)*blend;wheel.rotation.z+=(targetZ-wheel.rotation.z)*blend;
 wheel.position.y=live?Math.sin(time*.65)*.045:0;
 renderer.render(scene,camera);
 const settling=Math.abs(targetX-wheel.rotation.x)+Math.abs(targetY-wheel.rotation.y)+Math.abs(targetZ-wheel.rotation.z)>.0005;
 host.dataset.rotation=[wheel.rotation.x,wheel.rotation.y,wheel.rotation.z].map(value=>value.toFixed(3)).join(',');
 host.dataset.drawCalls=renderer.info.render.calls;host.dataset.frameCount=String(++renderedFrames);
 if(live||settling)requestDraw();
}

listen(window,'scroll',readScroll,{passive:true});
listen(document,'visibilitychange',()=>{previous=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else requestDraw();});
listen(media,'change',setMotion);
listen(host,'pointermove',event=>{
 if(gesture&&event.pointerId===gesture.id){const now=performance.now(),dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(gesture.intent==='pending')gesture.intent=gestureIntent(dx,dy,{allowVertical:true});if(gesture.intent==='rotate'){event.preventDefault();if(!host.hasPointerCapture(event.pointerId))host.setPointerCapture(event.pointerId);const stepX=event.clientX-gesture.lastX,stepY=event.clientY-gesture.lastY;yaw+=stepX*WHEEL_DRAG_RADIANS_PER_PIXEL;roll+=stepX*.004;pitch+=stepY*WHEEL_DRAG_RADIANS_PER_PIXEL*.7;gesture.lastX=event.clientX;gesture.lastY=event.clientY;gesture.lastAt=now;gesture.samples.push({x:event.clientX,y:event.clientY,at:now});gesture.samples=gesture.samples.filter(sample=>now-sample.at<=140).slice(-8);velocity=wheelGestureVelocity(gesture.samples,gesture.inheritedVelocity,reduced,'x');pitchVelocity=wheelGestureVelocity(gesture.samples,gesture.inheritedPitchVelocity,reduced,'y');requestDraw();}return;}
 if(event.pointerType==='mouse'){const bounds=host.getBoundingClientRect();pointerX=(event.clientX-bounds.left)/bounds.width*2-1;pointerY=(event.clientY-bounds.top)/bounds.height*2-1;requestDraw();}
});
listen(host,'pointerleave',event=>{pointerX=0;pointerY=0;if(gesture&&event.pointerId===gesture.id&&!host.hasPointerCapture(event.pointerId))endGesture({type:'pointercancel',timeStamp:event.timeStamp});requestDraw();});
listen(host,'pointerdown',event=>{
 if(event.pointerType==='mouse' && event.button!==0)return;
 if(gesture)return;
 event.preventDefault?.();host.setPointerCapture?.(event.pointerId);
 const now=performance.now();gesture={lastX:event.clientX,lastY:event.clientY,lastAt:now,id:event.pointerId,x:event.clientX,y:event.clientY,intent:'pending',inheritedVelocity:velocity,inheritedPitchVelocity:pitchVelocity,samples:[{x:event.clientX,y:event.clientY,at:now}]};
});
function endGesture(event){
 if(!gesture)return;
 const active=gesture,now=performance.now();
 if(event?.type==='pointercancel'){velocity=0;pitchVelocity=0;}
 else if(active.intent==='rotate'&&(now-active.lastAt)<=160){velocity=wheelGestureVelocity(active.samples,active.inheritedVelocity,reduced,'x');pitchVelocity=wheelGestureVelocity(active.samples,active.inheritedPitchVelocity,reduced,'y');const variation=discoveryMomentumFactor(Math.random());velocity*=variation;pitchVelocity*=2-variation;}
 else{velocity=active.inheritedVelocity;pitchVelocity=active.inheritedPitchVelocity;}
 gesture=null;requestDraw();
}
listen(host,'pointerup',endGesture);listen(host,'pointercancel',endGesture);listen(host,'lostpointercapture',endGesture);
listen(window,'pointerup',endGesture);listen(window,'pointercancel',endGesture);

const touchPoint=event=>event?.changedTouches?.[0]||event?.touches?.[0];
listen(host,'touchstart',event=>{const point=touchPoint(event);if(!point||gesture)return;event.preventDefault();const now=performance.now();gesture={lastX:point.clientX,lastY:point.clientY,lastAt:now,id:point.identifier,x:point.clientX,y:point.clientY,intent:'pending',inheritedVelocity:velocity,inheritedPitchVelocity:pitchVelocity,samples:[{x:point.clientX,y:point.clientY,at:now}],touch:true};requestDraw();},{passive:false});
listen(host,'touchmove',event=>{
 if(!gesture?.touch)return;const point=[...event.touches].find(item=>item.identifier===gesture.id);if(!point)return;
 const now=performance.now(),dx=point.clientX-gesture.x,dy=point.clientY-gesture.y;
 if(gesture.intent==='pending')gesture.intent=gestureIntent(dx,dy,{allowVertical:true});
 if(gesture.intent==='rotate'){event.preventDefault();const stepX=point.clientX-gesture.lastX,stepY=point.clientY-gesture.lastY;yaw+=stepX*WHEEL_DRAG_RADIANS_PER_PIXEL;roll+=stepX*.004;pitch+=stepY*WHEEL_DRAG_RADIANS_PER_PIXEL*.7;gesture.lastX=point.clientX;gesture.lastY=point.clientY;gesture.lastAt=now;gesture.samples.push({x:point.clientX,y:point.clientY,at:now});gesture.samples=gesture.samples.filter(sample=>now-sample.at<=140).slice(-8);velocity=wheelGestureVelocity(gesture.samples,gesture.inheritedVelocity,reduced,'x');pitchVelocity=wheelGestureVelocity(gesture.samples,gesture.inheritedPitchVelocity,reduced,'y');requestDraw();}
},{passive:false});
listen(host,'touchend',()=>{if(gesture?.touch)endGesture({type:'touchend'});},{passive:false});
listen(host,'touchcancel',()=>{if(gesture?.touch)endGesture({type:'pointercancel'});},{passive:false});
function turn(direction){yaw+=direction*Math.PI/6;status.textContent=direction>0?'Discovery die turned right.':'Discovery die turned left.';requestDraw();}
listen(host,'keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();if(event.key==='Home')reset();else if(event.key==='ArrowLeft'||event.key==='ArrowRight')turn(event.key==='ArrowRight'?1:-1);else{pitch+=event.key==='ArrowDown'?.18:-.18;requestDraw();}});
listen(renderer?.domElement,'webglcontextlost',event=>{event.preventDefault();fallback();});
listen(window,'pagehide',event=>{cancelAnimationFrame(frame);frame=0;if(event.persisted)return;resizeObserver?.disconnect();intersectionObserver?.disconnect();for(const resource of resources)resource.dispose();renderer?.dispose();});
listen(window,'pageshow',()=>{previous=0;requestDraw();});

return destroy;
}
