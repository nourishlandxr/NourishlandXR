import * as THREE from '../vendor/three.module.min.js';
import {clamp,scrollTurn,gestureIntent} from './wheel-model.js';

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
let reduced=media.matches||forcedReduce, paused=false, visible=true, frame=0, previous=0, time=0;
let roll=0, yaw=0, pitch=0, pointerX=0, pointerY=0, scroll=0, scrollOrigin=0, gesture=null;
let renderer, resizeObserver, intersectionObserver, renderedFrames=0;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,1,.1,40);
const wheel=new THREE.Group();scene.add(wheel);
const resources=new Set();
const keep=o=>(resources.add(o),o);
const material=(color,extra={})=>keep(new THREE.MeshStandardMaterial({color,roughness:1,...extra}));
const mesh=(geometry,mat,parent=wheel)=>{const object=new THREE.Mesh(geometry,mat);parent.add(object);return object;};
const wind={value:0};
function fallback(){hero.dataset.ready='error';hero.querySelector('#nl-instructions').textContent='A living circle of plants, food and connection.';host.removeAttribute('tabindex');cancelAnimationFrame(frame);}
function requestDraw(){if(!disposed&&!frame&&visible&&!document.hidden&&hero.dataset.ready==='true')frame=requestAnimationFrame(draw);}
function readScroll(){const box=hero.getBoundingClientRect();scroll=scrollTurn(box.top,box.height,innerHeight);requestDraw();}
function setMotion(){reduced=media.matches||forcedReduce;hero.dataset.motion=reduced?'reduce':'full';hero.querySelector('#nl-instructions').firstChild.textContent=reduced?'Drag to explore. ':'Drag to explore · Arrow keys to turn. ';scrollOrigin=scroll;requestDraw();}
function reset(){roll=0;yaw=0;pitch=0;pointerX=0;pointerY=0;scrollOrigin=scroll;status.textContent='Wheel returned to its starting view.';requestDraw();}

try{
 if(new URLSearchParams(location.search).get('renderer')==='fallback')throw new Error('Local fallback preview');
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
 renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 // Broad, neutral fill keeps the botanical forms softly shaded like matte pigment.
 scene.add(new THREE.HemisphereLight(0xfffaf0,0xa0a38d,3));
 const sun=new THREE.DirectionalLight(0xfff3e2,1.65);sun.position.set(-3,5,6);scene.add(sun);
 const rim=new THREE.DirectionalLight(0xe4ead9,1.1);rim.position.set(4,1,-4);scene.add(rim);
 const texture=await new THREE.TextureLoader().loadAsync(new URL('../assets/living-wheel.png',import.meta.url).href);if(disposed){texture.dispose();return;}keep(texture);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 // The original illustration becomes the skin of a solid, irregular torus.
 const core=keep(new THREE.TorusGeometry(1.48,.61,32,160));
 const points=core.attributes.position,uv=core.attributes.uv;
 for(let i=0;i<points.count;i++){const x=points.getX(i),y=points.getY(i),z=points.getZ(i),a=Math.atan2(y,x);const wave=1+.025*Math.sin(a*7)+.018*Math.sin(a*11);points.setXYZ(i,x*wave,y*wave,z*.8);uv.setXY(i,x/5.7+.5,y/5.7+.5);}
 core.computeVertexNormals();
 const skin=material(0xffffff,{map:texture});
 skin.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   // A small mip bias softens the illustration's high-frequency detail without
   // blurring the object's silhouette or adding a post-processing pass.
   vec4 botanical = texture2D(map, vMapUv, 1.6);
   vec3 pigment = mix(vec3(0.25, 0.31, 0.19), botanical.rgb, botanical.a);
   float lightness = dot(pigment, vec3(0.2126, 0.7152, 0.0722));
   pigment = mix(vec3(lightness), pigment, 0.68);
   diffuseColor.rgb *= mix(pigment, vec3(0.70, 0.70, 0.58), 0.22);
 `);};
 mesh(core,skin);
 const bark=[material(0x93987b),material(0xb0a58b),material(0x7f927c)];
 for(let j=0;j<10;j++){const points=[];for(let i=0;i<100;i++){const a=i/100*Math.PI*2,r=1.46+.43*Math.sin(a*3+j*.68);points.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,.47*Math.cos(a*3+j*.68)));}mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),160,.023+(j%3)*.012,5,true)),bark[j%3]);}
 // Curved leaf blades and a raised central vein, not image planes.
 const leaf=keep(new THREE.BufferGeometry()),positions=[],indices=[];
 for(let i=0;i<=10;i++){const t=i/10,w=Math.sin(Math.PI*t)*.18,z=Math.sin(Math.PI*t)*.13;positions.push(-w,t*.75,z*.2,0,t*.75,z,w,t*.75,z*.2);}
 for(let i=0;i<10;i++){const a=i*3,b=a+3;indices.push(a,b,a+1,a+1,b,b+1,a+1,b+1,a+2,a+2,b+1,b+2);}
 leaf.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));leaf.setIndex(indices);leaf.computeVertexNormals();
 const leafMats=[0x91a58d,0xb1bd98,0x7f9a88,0xc1c4a2,0x9caf9e].map(c=>material(c,{side:THREE.DoubleSide}));
 for(const mat of leafMats)mat.onBeforeCompile=shader=>{shader.uniforms.uWind=wind;shader.vertexShader='uniform float uWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.z += sin(uWind + position.y * 4.0 + instanceMatrix[3].x * 3.0) * 0.024 * position.y;');};
 const stem=keep(new THREE.CylinderGeometry(.008,.014,.53,4));
 for(let i=0;i<62;i++){const a=i*2.39996323,r=1.48+(i%6)*.082;const sprig=new THREE.Group();sprig.position.set(Math.cos(a)*r,Math.sin(a)*r,Math.sin(i*2.13)*.37);sprig.rotation.set(Math.sin(i)*.65,Math.cos(i*1.2)*.45,a-Math.PI/2);const scale=.7+(i%5)*.1;sprig.scale.setScalar(scale);wheel.add(sprig);const stalk=mesh(stem,bark[0],sprig);stalk.position.y=.22;
 for(let k=0;k<3;k++){const blade=mesh(leaf,leafMats[(i+k)%5],sprig);blade.position.y=k*.13;blade.rotation.z=(k===2?0:k===0?-.6:.7);blade.rotation.y=Math.sin(i+k)*.5;blade.scale.setScalar(k===2?.75:.65);}
 }
 const fruitGeo=keep(new THREE.SphereGeometry(1,20,14));const fruits=[0xc3c69a,0xe0c69c,0xd4ac96,0xa8b59a,0xca9e99].map(c=>material(c));
 for(let i=0;i<32;i++){const a=i*2.39996,r=1.6+Math.sin(i)*.24;const fruit=mesh(fruitGeo,fruits[i%5]);fruit.position.set(Math.cos(a)*r,Math.sin(a)*r,.48+Math.cos(i)*.1);fruit.scale.set(.085+(i%4)*.016,.10+(i%4)*.02,.085+(i%4)*.016);}
 // Batch repeated leaves, stems and fruit into GPU instances.
 wheel.updateMatrixWorld(true);
 const batches=new Map();wheel.traverse(object=>{if(!object.isMesh)return;const key=object.geometry.uuid+object.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(object);});
 for(const objects of batches.values()){if(objects.length<2)continue;const batch=new THREE.InstancedMesh(objects[0].geometry,objects[0].material,objects.length);objects.forEach((object,i)=>{batch.setMatrixAt(i,object.matrixWorld);object.removeFromParent();});wheel.add(batch);}
 // A soft analytic shadow grounds the object without an expensive shadow pass.
 const shadowMat=keep(new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){float a=exp(-dot((vUv-.5)*5.,(vUv-.5)*5.))*.16;gl_FragColor=vec4(.22,.28,.13,a);}'}));
 const shadow=mesh(keep(new THREE.PlaneGeometry(5,2)),shadowMat,scene);shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-2.65,0);
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(0,.25,Math.max(8,2.85/(Math.tan(Math.PI/10)*Math.min(1,camera.aspect))));camera.lookAt(0,0,0);camera.updateProjectionMatrix();requestDraw();}
 resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
 intersectionObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){previous=0;requestDraw();}else{cancelAnimationFrame(frame);frame=0;}},{threshold:0});intersectionObserver.observe(host);
 hero.dataset.ready='true';setMotion();resize();readScroll();
}catch(error){console.warn('Living wheel fallback:',error);fallback();}

function draw(now){
 frame=0;if(!visible||document.hidden||hero.dataset.ready!=='true')return;
 const dt=previous?Math.min((now-previous)/1000,.05):.016;previous=now;
 const live=!paused&&!reduced;if(live)time+=dt;
 const scrollDelta=live?scroll-scrollOrigin:0;
 const targetZ=roll+scrollDelta;
 const targetY=.28+yaw+(live?pointerX*.18+Math.sin(time*.35)*.045+Math.sin(scrollDelta)*.42:0);
 const targetX=-.12+pitch+(live?pointerY*.10:0);
 // Frame-rate-independent easing gives each gesture a soft, unhurried settle.
 const blend=reduced?1:1-Math.exp(-dt*4.2);
 wheel.rotation.x+=(targetX-wheel.rotation.x)*blend;wheel.rotation.y+=(targetY-wheel.rotation.y)*blend;wheel.rotation.z+=(targetZ-wheel.rotation.z)*blend;
 wheel.position.y=live?Math.sin(time*.65)*.035:wheel.position.y;
 if(live)wind.value=time*.8;
 renderer.render(scene,camera);
 const settling=Math.abs(targetX-wheel.rotation.x)+Math.abs(targetY-wheel.rotation.y)+Math.abs(targetZ-wheel.rotation.z)>.0005;
 // Inspectable state also supports local browser verification without exposing renderer internals.
 host.dataset.rotation=[wheel.rotation.x,wheel.rotation.y,wheel.rotation.z].map(v=>v.toFixed(3)).join(',');
 host.dataset.drawCalls=renderer.info.render.calls;
 host.dataset.frameCount=String(++renderedFrames);
 if((live&&time<5)||settling)requestDraw();
}

listen(window,'scroll',readScroll,{passive:true});
listen(document,'visibilitychange',()=>{previous=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else requestDraw();});
listen(media,'change',setMotion);
listen(host,'pointermove',event=>{
 if(gesture&&event.pointerId===gesture.id){const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(gesture.intent==='pending')gesture.intent=gestureIntent(dx,dy);if(gesture.intent==='rotate'){if(!host.hasPointerCapture(event.pointerId))host.setPointerCapture(event.pointerId);yaw=clamp(gesture.yaw+dx*.009,-1.5,1.5);roll=gesture.roll+dx*.003;requestDraw();}return;}
 if(event.pointerType==='mouse'){const r=host.getBoundingClientRect();pointerX=(event.clientX-r.left)/r.width*2-1;pointerY=(event.clientY-r.top)/r.height*2-1;requestDraw();}
});
listen(host,'pointerleave',()=>{pointerX=0;pointerY=0;requestDraw();});
listen(host,'pointerdown',event=>{if(event.button!==0)return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,roll,intent:'pending'};});
function endGesture(){gesture=null;}
listen(host,'pointerup',endGesture);listen(host,'pointercancel',endGesture);listen(host,'lostpointercapture',endGesture);
function turn(direction){roll+=direction*Math.PI/6;status.textContent=direction>0?'Wheel turned right.':'Wheel turned left.';requestDraw();}
listen(host,'keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();if(event.key==='Home')reset();else if(event.key==='ArrowLeft'||event.key==='ArrowRight')turn(event.key==='ArrowRight'?1:-1);else{pitch=clamp(pitch+(event.key==='ArrowDown'?.18:-.18),-.65,.65);requestDraw();}});
listen(renderer?.domElement,'webglcontextlost',event=>{event.preventDefault();fallback();});
listen(window,'pagehide',event=>{cancelAnimationFrame(frame);frame=0;if(event.persisted)return;resizeObserver?.disconnect();intersectionObserver?.disconnect();for(const resource of resources)resource.dispose();renderer?.dispose();});
listen(window,'pageshow',()=>{previous=0;requestDraw();});

return destroy;
}
