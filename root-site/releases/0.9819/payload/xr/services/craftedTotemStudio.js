import * as THREE from "../vendor/three.module.min.js?v=0.9819";
import {createTotemSculptureGeometry} from "./spatialTotemSculpture.js?v=0.9819";
import {createCraftedSignGeometry} from "./craftedTotemGeometry.js?v=0.9819";
import {createCraftedTimberCanvas,createCraftedStoneCanvas} from "./craftedSurfaceTextures.js?v=0.9819";
import {totemCardSurfaces} from "./spatialTotemCards.js?v=0.9819";
import {totemSignMount} from "./totemSignMounts.js?v=0.9819";
import {CRAFTED_TOTEM_SIGNS,craftedTotemSignStyle,paintCraftedTotemSign} from "./craftedTotemSigns.js?v=0.9819";
export {TOTEM_MODEL_CHOICES} from "./totemAppearance.js?v=0.9819";

export const TOTEM_STUDIO_CARDS=Object.freeze([
 {id:'home',title:'Platform'},
 {id:'creator',title:'Creator',boardSide:'left',navigation:{reliable:true}},
 {id:'explorer',title:'Explorer',boardSide:'right',navigation:{reliable:true}},
 {id:'field',title:'Field tools',boardSide:'left',navigation:{reliable:true}}
]);

function surfaceCanvas(kind,size=512){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,hash=(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
  const broad=Math.sin(u*31+Math.sin(v*23)*1.6)*.28+Math.cos(v*41+u*18)*.17;
  const fine=Math.sin(x*2.93+y*1.76)*Math.cos(y*2.31-x*.47)*.16+hash*.17;
  const grain=kind==='stone'?broad+fine:fine*.8+Math.sin(u*730+v*4)*.09;
  const tone=Math.max(0,Math.min(255,148+grain*91)),i=(y*size+x)*4;
  image.data[i]=image.data[i+1]=image.data[i+2]=tone;image.data[i+3]=255;
 }
 ctx.putImageData(image,0,0);return canvas;
}

export function createTotemStudioMaterials({textures=true}={}){
 const tex=(canvas,colour=false)=>{const t=new THREE.CanvasTexture(canvas);t.colorSpace=colour?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=8;return t;};
 const wood=textures?tex(createCraftedTimberCanvas({width:1024,height:2048}),true):null;
 const pale=textures?tex(createCraftedTimberCanvas({width:1024,height:256,pale:true,horizontal:true}),true):null;
 const woodBump=wood?.clone()||null;if(woodBump){woodBump.colorSpace=THREE.NoColorSpace;woodBump.needsUpdate=true;}
 const grain=textures?tex(surfaceCanvas('ceramic')):null,stone=textures?tex(surfaceCanvas('stone')):null;
 const stoneColour=textures?tex(createCraftedStoneCanvas({width:1024,height:2048}),true):null;
 const woodMaterial=new THREE.MeshStandardMaterial({color:textures?'#ffffff':'#9d6435',map:wood,bumpMap:woodBump,bumpScale:.0015,roughness:.42,metalness:.02,envMapIntensity:.65});
 const ceramic=(colour)=>new THREE.MeshPhysicalMaterial({color:colour,roughness:.52,bumpMap:grain,bumpScale:.00065,clearcoat:.18,clearcoatRoughness:.46,sheen:.18,sheenColor:new THREE.Color('#e7e0c9'),envMapIntensity:.72});
 const bronze=new THREE.MeshStandardMaterial({color:'#b78a46',metalness:.84,roughness:.29,bumpMap:grain,bumpScale:.00012,envMapIntensity:1.15});
 const dark=new THREE.MeshStandardMaterial({color:'#30261a',roughness:.44,metalness:.15});
 const inlay=woodMaterial.clone();inlay.color.set('#dbb078');inlay.roughness=.44;
 const board=new THREE.MeshStandardMaterial({color:textures?'#ffffff':'#d8b789',map:pale,bumpMap:pale,bumpScale:.0008,roughness:.52,envMapIntensity:.55});
 const stoneMaterial=new THREE.MeshStandardMaterial({color:textures?'#ffffff':'#777b72',map:stoneColour,bumpMap:stone,bumpScale:.004,roughnessMap:stone,roughness:.94,envMapIntensity:.45});
 const materials={wood:woodMaterial,ceramic:ceramic('#7b8964'),bronze,dark,inlay,sage:ceramic('#6d845b'),porcelain:ceramic('#e6ddc4'),board,stone:stoneMaterial,
  terracotta:ceramic('#ac6d4d'),moon:ceramic('#cdd3d6'),sun:ceramic('#d6b267'),leaf:ceramic('#7d9870'),mineral:new THREE.MeshStandardMaterial({color:'#83b7b0',roughness:.52,emissive:'#315f5b',emissiveIntensity:.16})};
 for(const [style,profile]of Object.entries(CRAFTED_TOTEM_SIGNS)){
  const sign=new THREE.MeshPhysicalMaterial({color:profile.colour,roughness:profile.roughness,clearcoat:profile.material==='stone'?0:.13,clearcoatRoughness:.45,metalness:0,envMapIntensity:.6});
  if(profile.material==='timber'){sign.map=pale;sign.color.set(textures?(style==='carved'?'#95613e':'#ffffff'):profile.colour);sign.bumpMap=pale;sign.bumpScale=.0008;}
  else{sign.bumpMap=profile.material==='stone'?stone:grain;sign.bumpScale=profile.material==='stone'?.0016:.0005;}
  if(profile.material==='glass'){sign.clearcoat=.45;sign.clearcoatRoughness=.32;sign.transmission=.12;sign.thickness=.018;}
  materials['sign_'+style]=sign;
  const mount=bronze.clone();mount.color.set(profile.mount);mount.metalness=profile.material==='stone'?.65:.82;materials['mount_'+style]=mount;
 }
 return materials;
}

// Convert the same indexed mesh used by XR; only the presentation material
// changes. The sign mounts and the native post stay the single source of truth.
export function totemStudioBodyGeometry(style='basic',halfHeight=.6){
 const source=createTotemSculptureGeometry(72,48,style),position=[],normal=[],uv=[],categories=[];
 const width=.095,depth=.075,secondary=['sun','leaf','rock','moon'].includes(style);
 for(let i=0;i<source.vertices.length;i+=8){
  const v=source.vertices;
  position.push(v[i]*width,(v[i+1]+1)*halfHeight,v[i+2]*depth);
  const n=new THREE.Vector3(v[i+3]/width,v[i+4]/halfHeight,v[i+5]/depth).normalize();normal.push(n.x,n.y,n.z);
  uv.push(v[i+6],v[i+7]<=1?v[i+7]:(v[i+7]-1)*1.25);
  const category=v[i+7]>2?Math.floor(v[i+7]):v[i+7]>1?1:0;categories.push(category);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 // Groups remain contiguous per material so a close preview does not create
 // one draw call per leaf, ring, vein or individual triangle.
 const index=[];
 for(let material=0;material<=6;material++){
  const start=index.length;
  for(let i=0;i<source.indices.length;i+=3)if(categories[source.indices[i]]===material)index.push(source.indices[i],source.indices[i+1],source.indices[i+2]);
  if(index.length>start)geometry.addGroup(start,index.length-start,material);
 }
 geometry.setIndex(index);geometry.computeBoundingBox();
 // Stone is intentionally faceted; the material supplies its finer grain.
 geometry.userData={style,secondary,sourceVertices:source.vertices.length/8};return geometry;
}

function signGeometry(side,width,height,depth,style){
 const source=createCraftedSignGeometry(side,style),position=[],normal=[],uv=[];
 for(let i=0;i<source.length;i+=6){
  position.push(source[i]*width/2,source[i+1]*height/2,source[i+2]*depth);
  const n=new THREE.Vector3(source[i+3]/(width/2),source[i+4]/(height/2),source[i+5]/depth).normalize();normal.push(n.x,n.y,n.z);
  uv.push((source[i]+1)/2,(source[i+1]+1)/2);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return geometry;
}

function lettering(card,style){
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=512;
 const ctx=canvas.getContext('2d');ctx.scale(2,2);paintCraftedTotemSign(ctx,{...card,signStyle:style});
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
 return new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
}

export function createCraftedTotemStudioModel({style='basic',halfHeight=.6,materials,textures=true,cards=TOTEM_STUDIO_CARDS}={}){
 const m=materials||createTotemStudioMaterials({textures}),group=new THREE.Group(),signs=new THREE.Group();group.name=style;signs.name='attached signs';
 const crown=style==='carved'?m.terracotta:style==='botanical'?m.sage:style==='sun'?m.sun:style==='leaf'?m.leaf:style==='moon'?m.moon:style==='rock'?m.mineral:m.ceramic;
 const palette=[style==='rock'?m.stone:m.wood,crown,m.bronze,m.dark,m.inlay,m.sage,m.porcelain];
 const body=new THREE.Mesh(totemStudioBodyGeometry(style,halfHeight),palette);body.name='shared native sculpture';body.castShadow=body.receiveShadow=true;group.add(body);
 const surfaces=totemCardSurfaces({x:0,y:0,z:0},{x:1,z:0},cards,'',{style,signsVisible:true,demoZone:true,bodyHalfWidth:.095,bodyHalfDepth:.075,bodyHalfHeight:halfHeight});
 const add=(geometry,material,parent=group)=>{const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 for(const surface of surfaces.filter(item=>item.mount)){
  const {mount,width,height,card}=surface,b=mount.bracket,boardDepth=mount.boardHalfDepth;
  const bracket=add(new THREE.BoxGeometry(b.halfWidth*2,b.halfHeight*2,b.halfDepth*2),m['mount_'+style]||m.bronze,signs);bracket.position.set(b.x,b.y,b.z);
  const board=add(signGeometry(card.timberHeader?'header':card.boardSide||'header',width,height,boardDepth,style),m['sign_'+style]||m.board,signs);
  board.position.set(mount.x,surface.center.y,mount.boardBack+boardDepth);board.userData={signId:card.id,title:card.title};
  if(textures){
   const label=add(new THREE.PlaneGeometry(width*.94,height*.94),lettering(card,style),signs);label.castShadow=false;label.receiveShadow=false;
   label.position.set(mount.x,surface.center.y,mount.front+.0002);label.userData={signId:card.id,title:card.title,ownMaterial:true};
  }
  if(!card.timberHeader){
   const pin=add(new THREE.CylinderGeometry(.0032,.0032,.0025,20),m['mount_'+style]||m.bronze,signs);pin.rotation.x=Math.PI/2;pin.position.set(b.x,b.y,mount.front-.0004);
   const slot=add(new THREE.BoxGeometry(.0038,.00055,.0004),m.dark,signs);slot.position.set(b.x,b.y,mount.front+.001);
  }
 }
 group.add(signs);
 // Inset controls use the same surface intersection as the sign joinery.
 if(['basic','carved','botanical','organic'].includes(style))for(const [i,y]of [Math.min(1.35,halfHeight*1.50),Math.min(1.16,halfHeight*1.26)].entries()){
  const mount=totemSignMount({style,y,width:.05,height:.05,halfWidth:.095,halfDepth:.075,halfHeight,side:0}),x=mount.postContact.x,z=mount.postContact.z;
  const rim=add(new THREE.TorusGeometry(.0215,.0023,12,48),m.bronze);rim.position.set(x,y,z+.0018);rim.userData={control:i===0?'signs':'light'};
  const inset=add(new THREE.CylinderGeometry(.0195,.0195,.003,48),m.dark);inset.rotation.x=Math.PI/2;inset.position.set(x,y,z+.0007);inset.userData={control:i===0?'signs':'light'};
  if(i===1){const crescent=add(new THREE.TorusGeometry(.008,.0014,8,28,Math.PI*1.55),m.porcelain);crescent.position.set(x,y,z+.003);crescent.rotation.z=-.75;}
  else{const bar=add(new THREE.BoxGeometry(.014,.0018,.001),m.porcelain);bar.position.set(x,y,z+.0025);}
 }
 group.userData={style,signs,halfHeight,materials:m};return group;
}

export function disposeTotemStudioModel(group){
 group.traverse(mesh=>{mesh.geometry?.dispose();if(mesh.userData.ownMaterial){mesh.material.map?.dispose();mesh.material.dispose();}});
 group.removeFromParent();
}

export function createTotemStudio(canvas,{onSign=()=>{},onReady=()=>{},cards=TOTEM_STUDIO_CARDS,pixelRatio=2}={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,pixelRatio));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#ece7dc');scene.fog=new THREE.Fog('#ece7dc',5,12);
 const camera=new THREE.PerspectiveCamera(32,1,.01,30),materials=createTotemStudioMaterials();
 const fill=new THREE.HemisphereLight('#f8f2df','#87775a',2.2);scene.add(fill);
 const key=new THREE.DirectionalLight('#fff1d6',3.6);key.position.set(-2.5,4.5,3);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-2;key.shadow.camera.right=2;key.shadow.camera.top=3;key.shadow.camera.bottom=-1;key.shadow.camera.near=.1;key.shadow.camera.far=12;key.shadow.normalBias=.008;key.shadow.bias=-.00015;key.shadow.radius=4;scene.add(key);
 const rim=new THREE.DirectionalLight('#dce9ec',2.1);rim.position.set(2,2.8,-1.5);scene.add(rim);
 // Local softbox environment; no remote HDR, image downloads or asset wait.
 const room=new THREE.Scene();room.background=new THREE.Color('#9c9a92');
 for(const [p,size,intensity] of [[[-3,3,3],[3,5],3.2],[[3,2,1],[2,4],1.4],[[0,4,-2],[4,2],2.6]]){
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity,intensity),side:THREE.DoubleSide}));plane.position.set(...p);plane.lookAt(0,1,0);room.add(plane);
 }
 const generator=new THREE.PMREMGenerator(renderer),environment=generator.fromScene(room,.045,.1,30);scene.environment=environment.texture;generator.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#e5dfd2',roughness:.87}));floor.rotation.x=-Math.PI/2;floor.position.y=-.003;floor.receiveShadow=true;scene.add(floor);
 let model=null,style='basic',halfHeight=.6,targetYaw=-.10,yaw=-.10,pitch=0,targetPitch=0,zoom=1,signsVisible=true,dark=false,active=true,last=performance.now(),dirty=true,frame=0,modelWidth=1;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,raycaster=new THREE.Raycaster();
 function select(id){style=id;if(model)disposeTotemStudioModel(model);model=createCraftedTotemStudioModel({style,halfHeight,materials,cards});scene.add(model);model.userData.signs.visible=signsVisible;const bounds=new THREE.Box3().setFromObject(model);modelWidth=Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))*2+.08;canvas.dataset.currentModel=style;dirty=true;}
 function size(){const r=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();dirty=true;}
 const observer=new ResizeObserver(size);observer.observe(canvas);
 function render(now){
  frame=requestAnimationFrame(render);if(!active){last=now;return;}
  const dt=Math.min(.06,(now-last)/1000);last=now;
  const easing=reduced?1:1-Math.exp(-14*dt),moving=Math.abs(targetYaw-yaw)+Math.abs(targetPitch-pitch)>.0001;
  if(!dirty&&!moving)return;
  yaw+=(targetYaw-yaw)*easing;pitch+=(targetPitch-pitch)*easing;model.rotation.set(pitch,yaw,0);
  const height=(2.5*halfHeight),tan=Math.tan(camera.fov*Math.PI/360),distance=Math.max(height*1.30,height/(2*tan)*1.16,modelWidth/(2*tan*camera.aspect)*1.10)/zoom;
  camera.position.set(0,height*.56,distance);camera.lookAt(0,height*.49,0);renderer.render(scene,camera);
  canvas.dataset.rendered='true';canvas.dataset.triangles=String(renderer.info.render.triangles);canvas.dataset.drawCalls=String(renderer.info.render.calls);dirty=false;
 }
 let drag=null,suppressClick=false;
 canvas.style.touchAction='pan-y';canvas.style.cursor='grab';
 const pointerDown=e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};suppressClick=false;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';};
 const pointerMove=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)suppressClick=true;
  if(suppressClick){targetYaw+=(e.clientX-drag.x)*.009;targetPitch=Math.max(-.13,Math.min(.13,targetPitch+(e.clientY-drag.y)*.002));dirty=true;}
  drag.x=e.clientX;drag.y=e.clientY;
 };
 const pointerUp=e=>{
  if(!drag)return;drag=null;canvas.style.cursor='grab';if(suppressClick)return;
  const rect=canvas.getBoundingClientRect();raycaster.setFromCamera({x:(e.clientX-rect.left)/rect.width*2-1,y:1-(e.clientY-rect.top)/rect.height*2},camera);
  const hit=raycaster.intersectObject(model,true).find(item=>item.object.userData.signId||item.object.userData.control);
  if(hit?.object.userData.signId)onSign(hit.object.userData);
  if(hit?.object.userData.control==='signs')api.signs();if(hit?.object.userData.control==='light')api.light();
 };
 const cancel=()=>{drag=null;canvas.style.cursor='grab';};
 canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',cancel);
 let requestedActive=true;
 const setActive=value=>{requestedActive=Boolean(value);active=requestedActive&&!document.hidden;dirty=true;if(active&&!frame){last=performance.now();frame=requestAnimationFrame(render);}else if(!active){cancelAnimationFrame(frame);frame=0;}};
 const visibility=()=>setActive(requestedActive);document.addEventListener('visibilitychange',visibility);
 const api={
  select,
  front:()=>{targetYaw=0;targetPitch=0;dirty=true;},side:()=>{targetYaw=Math.PI/2;targetPitch=0;dirty=true;},
  turn:amount=>{targetYaw+=amount;dirty=true;},zoom:amount=>{zoom=Math.max(.75,Math.min(1.8,zoom+amount));dirty=true;},
  height:value=>{halfHeight=value;select(style);},
  setActive,
  signs:()=>{signsVisible=!signsVisible;model.userData.signs.visible=signsVisible;dirty=true;return signsVisible;},
  light:()=>{dark=!dark;scene.background.set(dark?'#243a32':'#ece7dc');scene.fog.color.copy(scene.background);floor.material.color.set(dark?'#30463b':'#e5dfd2');fill.intensity=dark?1.4:2.2;key.intensity=dark?2.9:3.6;dirty=true;return dark;},
  destroy:()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',cancel);disposeTotemStudioModel(model);environment.dispose();const textures=new Set();Object.values(materials).forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();});textures.forEach(t=>t.dispose());floor.geometry.dispose();floor.material.dispose();renderer.dispose();}
 };
 select(style);size();frame=requestAnimationFrame(render);onReady();return api;
}
