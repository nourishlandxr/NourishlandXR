import {createBiomeClouds,installCloudControls} from 'nl-clouds';
import {createLivingSphereGeometry} from 'nl-layer-orb';
import {createTotemSculptureGeometry} from 'nl-layer-totem';
import * as THREE from 'nl-three';
import { loadBirdFlights } from 'nl-birds';
import { livingEffects } from 'nl-effects';
const payload=window.HERO_PUZZLE,lock=Object.freeze(payload.lock),plan=payload.plan,stage=document.querySelector('[data-biome-stage]'),status=document.querySelector('[data-biome-status]');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;stage.append(renderer.domElement);
const gl=renderer.getContext(),debugGPU=gl.getExtension('WEBGL_debug_renderer_info'),gpuName=debugGPU?gl.getParameter(debugGPU.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),softwareGPU=/swiftshader|llvmpipe|software/i.test(gpuName);stage.dataset.renderer=gpuName;stage.dataset.shadowSize=softwareGPU?'768':'2048';
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(lock.fovDeg,1,.003,100),target=new THREE.Vector3(),state={rollDeg:lock.rollDeg,distance:lock.landingDistance,base:lock.baseDistance,zoomAnchor:payload.reviewAnchor};
scene.add(new THREE.HemisphereLight(0xf7f9ee,0x70806b,1.62));scene.add(new THREE.AmbientLight(0x94a78d,.24));const sun=new THREE.DirectionalLight(0xfff2d6,2.08);sun.position.set(-3.8,6.8,4.6);scene.add(sun);const fill=new THREE.DirectionalLight(0xc8e3da,.64);fill.position.set(3.5,2.8,-4.8);scene.add(fill);const rim=new THREE.DirectionalLight(0x8fb8c9,.48);rim.position.set(-4,1.2,-5);scene.add(rim);
const pieces=new Map(),labels=[],forestAnchors=[],labelGroup=new THREE.Group(),myceliumGroup=new THREE.Group(),foodSwaleGroup=new THREE.Group();scene.add(labelGroup,myceliumGroup,foodSwaleGroup);let queued=false,loaded=false,drag=null,selected=null,lastSpin=0;
const pick=new THREE.Raycaster(),pointer=new THREE.Vector2();
const hoverName=document.createElement('div');hoverName.className='biome-hover-name';hoverName.setAttribute('aria-live','polite');document.querySelector('.hero-controls')?.append(hoverName);
const effects=livingEffects({scene,renderer,stage,sun,fill,requestRender});window.heroEffects=effects;
const waterfallDrops=[];
function requestRender(){queued=true}
function cameraUpdate(){
 if(inspection.unlocked){inspectionRender();return}
 const r=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(lock.pitchDeg),THREE.MathUtils.degToRad(lock.yawDeg),THREE.MathUtils.degToRad(state.rollDeg),'XYZ'));
 const orientation=new THREE.Matrix4().makeRotationX(-Math.PI/2).multiply(r.invert());const [x,y,z]=lock.openingPivotOriginal;target.set(x,z,-y);camera.position.set(0,0,state.distance*state.base/lock.referenceDistance).applyMatrix4(orientation).add(target);camera.up.set(0,1,0).transformDirection(orientation);camera.lookAt(target);camera.clearViewOffset();camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 if(payload.openingGuide){const center=openingScreenCenter();camera.setViewOffset(stage.clientWidth,stage.clientHeight,center[0]*stage.clientWidth/2,-center[1]*stage.clientHeight/2,stage.clientWidth,stage.clientHeight);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);const after=openingScreenCenter();stage.dataset.openingCenterX=String((after[0]+1)/2);stage.dataset.openingCenterY=String((1-after[1])/2)}
 const close=state.distance<lock.legacyNearDistance;document.body.dataset.biomeClose=String(close);stage.dataset.pitch=String(lock.pitchDeg);stage.dataset.yaw=String(lock.yawDeg);stage.dataset.roll=String(state.rollDeg);stage.dataset.distance=String(state.distance);requestRender();
}
const openingPoints=(payload.openingGuide?.top||[]).map(p=>new THREE.Vector3(...p));
const projectedOpening=openingPoints.map(()=>new THREE.Vector3());
function openingScreenCenter(){
 const points=openingPoints.map((point,i)=>projectedOpening[i].copy(point).project(camera));let area=0,x=0,y=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],cross=a.x*b.y-b.x*a.y;area+=cross;x+=(a.x+b.x)*cross;y+=(a.y+b.y)*cross}return Math.abs(area)>1e-9?[x/(3*area),y/(3*area)]:[0,0];
}
function resize(){const rect=stage.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();state.base=Math.max(lock.baseDistance,lock.responsiveWidth/(2*Math.tan(THREE.MathUtils.degToRad(lock.fovDeg/2))*camera.aspect));cameraUpdate()}
new ResizeObserver(resize).observe(stage);
function reset(){state.rollDeg=lock.rollDeg;state.distance=lock.landingDistance;select(null);cameraUpdate()}
function zoom(delta,mode=0){const pixels=delta*(mode===1?16:mode===2?stage.clientHeight:1);state.distance=THREE.MathUtils.clamp(state.distance*Math.exp(-THREE.MathUtils.clamp(pixels,-1000,1000)*lock.zoomExponent),Math.max(2.24,lock.nearDistance),lock.farDistance);cameraUpdate()}
function attr(doc,buffer,bin,id){const a=doc.accessors[id],v=doc.bufferViews[a.bufferView],Type={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array}[a.componentType],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],offset=bin+(v.byteOffset||0)+(a.byteOffset||0),stride=(v.byteStride||size*Type.BYTES_PER_ELEMENT)/Type.BYTES_PER_ELEMENT;let data;if(stride===size)data=new Type(buffer,offset,a.count*size);else{data=new Type(a.count*size);const raw=new Type(buffer,offset,(a.count-1)*stride+size);for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)data[i*size+j]=raw[i*stride+j]}return new THREE.BufferAttribute(data,size,!!a.normalized)}
function addWaterfallDrop(position,width=.055,alpha=.62){const center=new THREE.Vector3(.125,0,-.2416666783),radial=new THREE.Vector2(position.x-center.x,position.z-center.z);if(radial.length()>.9)return;const inward=new THREE.Vector3(center.x-position.x,0,center.z-position.z).normalize(),side=new THREE.Vector3(-inward.z,0,inward.x),levels=34,positions=[],indices=[];for(let i=0;i<=levels;i++){const t=i/levels,y=position.y+.018-t*.92,flow=inward.clone().multiplyScalar(.015+.075*t*t),w=width*(1+.2*Math.sin(t*Math.PI)),wave=Math.sin(t*31+position.x*17)*.004;const c=position.clone().add(flow).addScaledVector(side,wave);positions.push(...c.clone().addScaledVector(side,-w).setY(y).toArray(),...c.clone().addScaledVector(side,w).setY(y).toArray())}for(let i=0;i<levels;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);const flowUV=[];for(let i=0;i<=levels;i++)flowUV.push(0,i/levels,1,i/levels);geometry.setAttribute('uv',new THREE.Float32BufferAttribute(flowUV,2));geometry.computeVertexNormals();const material=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uLoop:{value:heroMode?1:0},uTime:{value:0},uNight:{value:0},uAlpha:{value:alpha}},vertexShader:'varying vec3 vP; varying vec2 vFlow; void main(){vFlow=uv;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform float uLoop; uniform float uTime; uniform float uNight; uniform float uAlpha; varying vec3 vP; varying vec2 vFlow; void main(){float stream=.58+.34*sin(vP.y*185.0-uTime*mix(5.4,5.49778714,uLoop))+.08*sin(vP.x*310.0+uTime*mix(3.0,2.87979327,uLoop));float edge=smoothstep(.05,.28,stream);vec3 c=mix(vec3(.02,.35,.72),vec3(.12,.78,1.0),edge+uNight*.25);float sides=smoothstep(0.0,.15,vFlow.x)*smoothstep(0.0,.15,1.0-vFlow.x);float tail=1.0-smoothstep(.58,1.0,vFlow.y);float rivulets=.55+.45*sin(vFlow.x*47.0+vFlow.y*8.0-uTime*mix(3.0,2.87979327,uLoop));gl_FragColor=vec4(c,(uAlpha+.22*edge)*sides*tail*(.55+.45*rivulets));}' });const drop=new THREE.Mesh(geometry,material);drop.userData.role='waterfall-extension';drop.renderOrder=7;scene.add(drop);waterfallDrops.push(drop);const foamPoints=[];for(let i=0;i<38;i++){const t=i/37,p=position.clone().addScaledVector(inward,.018+.07*t*t).addScaledVector(side,(Math.random()-.5)*width*1.7);p.y=position.y-.03-t*.88;foamPoints.push(p)}const foamGeometry=new THREE.BufferGeometry().setFromPoints(foamPoints),foam=new THREE.Points(foamGeometry,new THREE.PointsMaterial({color:0xb9efff,size:.006,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));foam.userData.role='waterfall-foam-extension';scene.add(foam);waterfallDrops.push(foam)}
function addWetlandBasin(position){const center=new THREE.Vector3(.125,0,-.2416666783),outward=new THREE.Vector3(position.x-center.x,0,position.z-center.z).normalize(),basinCenter=position.clone().addScaledVector(outward,.14);basinCenter.y+=.004;const geometry=new THREE.CircleGeometry(.19,64);geometry.rotateX(-Math.PI/2);const material=new THREE.MeshStandardMaterial({color:0x168ba2,roughness:.26,metalness:.06,transparent:true,opacity:.72,emissive:0x07465b,emissiveIntensity:.12,side:THREE.DoubleSide});const basin=new THREE.Mesh(geometry,material);basin.position.copy(basinCenter);basin.scale.set(1.42,.68,1);basin.userData={role:'water',piece_id:'W-wetland-basin'};basin.renderOrder=3;scene.add(basin);effects.registerWater(basin);for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.07+i*.04,.0025,5,46),new THREE.MeshBasicMaterial({color:0xc8f4f4,transparent:true,opacity:.34-i*.06,blending:THREE.AdditiveBlending,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.copy(basinCenter).add(new THREE.Vector3((i-1)*.025,.004,(1-i)*.018));ring.scale.set(1.45,1,.72);ring.userData={role:'wetland_pool_foam'};scene.add(ring);waterfallDrops.push(ring)}stage.dataset.wetlandHeadwaterBasin='large';}
function waterfallOrigin(mesh){mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox,local=new THREE.Vector3((box.min.x+box.max.x)/2,box.max.y,(box.min.z+box.max.z)/2);return local.applyMatrix4(mesh.matrix)}
function smoothNormals(geometry){const position=geometry.getAttribute('position');if(!position)return;geometry.computeVertexNormals();const normal=geometry.getAttribute('normal'),groups=new Map();for(let i=0;i<position.count;i++){const key=`${position.getX(i).toFixed(4)},${position.getY(i).toFixed(4)},${position.getZ(i).toFixed(4)}`,sum=groups.get(key)||new THREE.Vector3();sum.x+=normal.getX(i);sum.y+=normal.getY(i);sum.z+=normal.getZ(i);groups.set(key,sum)}for(let i=0;i<position.count;i++){const key=`${position.getX(i).toFixed(4)},${position.getY(i).toFixed(4)},${position.getZ(i).toFixed(4)}`,n=groups.get(key).clone().normalize();normal.setXYZ(i,n.x,n.y,n.z)}normal.needsUpdate=true}
// Master-scene earthworks: positions use the existing glTF coordinates.
// Scene convention is north=-Z, east=+X; the model had no surveyed north tag.
const foodEarthworks={version:'mountain-production-05',placementBasis:'owner colour markup: productive dam slopes left, diverse forest centre, grapes above enclosed rice fields right, dense contour guilds below',modifiedVertices:0,paddyCells:0,ponds:3,connections:[],paths:[],maxDisplacement:0};
const foodPonds=[
 {id:'lower-storage',x:.465,z:1.203,y:.2769,rx:.124,rz:.080},
 {id:'middle-storage',x:.426,z:1.438,y:.3061,rx:.139,rz:.084},
 {id:'upper-storage',x:.595,z:1.661,y:.3361,rx:.143,rz:.089}
];
let foodOriginalSampler,foodWorkFade;
let riceSlope;
function ricePatchWeight(x,z){return THREE.MathUtils.smoothstep(x,-1.02,-.91)*(1-THREE.MathUtils.smoothstep(x,-.34,-.23))*THREE.MathUtils.smoothstep(z,.73,.84)*(1-THREE.MathUtils.smoothstep(z,1.64,1.75))}
function riceReferenceHeight(x,z){
 const base=.148+.245*(z-.78)+.064*Math.cos((x+.62)*5.8)+.018*Math.sin(z*7+x*4)+.012*Math.sin(x*12+z*3);
 return THREE.MathUtils.lerp(foodOriginalSampler(x,z,base),base,ricePatchWeight(x,z));
}
const foodFootprintBins=new Map();
function foodOwnerAt(x,z){
 for(const t of foodFootprintBins.get(Math.floor(x/.08)+','+Math.floor(z/.08))||[]){const [a,b,c,id]=t,den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z),u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)return id}return null;
}
const foodChannels=[];
function foodChannelDistance(x,z){
 let best={distance:Infinity,height:0};
 for(const channel of foodChannels)for(let i=1;i<channel.length;i++){
  const a=channel[i-1],b=channel[i],dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),d=Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
  if(d<best.distance)best={distance:d,height:THREE.MathUtils.lerp(a.y,b.y,t)};
 }
 return best;
}
function foodPondDistance(x,z){
 let nearest={distance:Infinity,pond:null};for(const pond of foodPonds){const a=Math.atan2((z-pond.z)/pond.rz,(x-pond.x)/pond.rx),shape=1+.07*Math.sin(a*3+.7)+.04*Math.sin(a*5);const d=Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz)/shape;if(d<nearest.distance)nearest={distance:d,pond}}
 return nearest;
}
function isNorthwestPaddy(x,z){return x<-.23&&x>-1.02&&z>.73&&z<1.75}
function foodTerraceHeight(h){const step=.022,level=.10+Math.floor((h-.10)/step)*step,t=((h-.10)/step)%1;return level+.0015+.0205*THREE.MathUtils.smoothstep(t,.72,1)}
// Curved cross-bunds divide the lower contour terraces into enclosed fields.
// The upper terraces remain continuous and are planted with trained grapes.
function foodPaddyPartition(x,z){return x+.025*Math.sin((z-.8)*8)}
const foodPaddyIntervals=[[-1.02,-.756],[-.744,-.516],[-.504,-.23]];
const foodRiceCeiling=.32;

function prepareFoodEarthworks(){
 if(biomeBaseline)return;
 foodOriginalSampler=terrainSampler;
 riceSlope={low:terrainSampler(-.62,.82,.17),high:terrainSampler(-.62,1.60,.25),cross:(terrainSampler(-.35,1.20,.21)-terrainSampler(-.90,1.20,.21))/.55};
 // Take the original F boundary, cancelling shared triangle and piece edges.
 const edges=new Map(),waterSamples=[],point=new THREE.Vector3();
 for(const mesh of pieces.values()){
  if(!String(mesh.userData.piece_id).startsWith('F'))continue;
  const g=mesh.geometry,p=g.attributes.position,idx=g.index;
  for(let i=0;i<idx.count;i+=3){const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+j)).applyMatrix4(mesh.matrixWorld));for(let x=Math.floor(Math.min(...vertices.map(p=>p.x))/.08);x<=Math.floor(Math.max(...vertices.map(p=>p.x))/.08);x++)for(let z=Math.floor(Math.min(...vertices.map(p=>p.z))/.08);z<=Math.floor(Math.max(...vertices.map(p=>p.z))/.08);z++){const key=x+','+z;if(!foodFootprintBins.has(key))foodFootprintBins.set(key,[]);foodFootprintBins.get(key).push([...vertices,mesh.userData.piece_id])}}
  for(let i=0;i<idx.count;i+=3)for(let j=0;j<3;j++){
   const a=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+j)).applyMatrix4(mesh.matrixWorld),b=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+(j+1)%3)).applyMatrix4(mesh.matrixWorld);
   const ka=a.x.toFixed(5)+','+a.z.toFixed(5),kb=b.x.toFixed(5)+','+b.z.toFixed(5),key=ka<kb?ka+'|'+kb:kb+'|'+ka;
   const entry=edges.get(key);if(entry)entry.count++;else edges.set(key,{a,b,count:1});
  }
 }
 const boundaries=[...edges.values()].filter(e=>e.count===1);
 for(const mesh of scene.children){
  if(mesh.userData.role!=='water'||!/^F3/.test(mesh.userData.piece_id||''))continue;
  const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);waterSamples.push([point.x,point.z])}
 }
 foodWorkFade=(x,z)=>{
  let distance=Infinity;for(const {a,b}of boundaries){const dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);distance=Math.min(distance,Math.hypot(x-a.x-dx*t,z-a.z-dz*t))}
  return THREE.MathUtils.smoothstep(distance,.015,.065);
 };
 // Closely spaced contours below the lake chain. Each row drains gently;
 // alternating ends are linked by short descending overflow channels.
 payload.foodContours=[];
 for(let row=0;row<10;row++){
  const points=[];for(let j=0;j<=48;j++){const t=j/48,x=-.19+t*.62,z=.78+row*.061+.035*Math.sin(t*Math.PI*1.4)+.014*Math.sin(t*7+row*.35),y=.172+row*.009+(row%2?t:1-t)*.002;points.push([x,y,z])}
  payload.foodContours.push(points);foodChannels.push(points.map(p=>new THREE.Vector3(p[0],p[1],p[2]-.019)));
 }
 for(let row=9;row>0;row--){const a=foodChannels[row][row%2?0:48],b=foodChannels[row-1][row%2?0:48];foodChannels.push([a.clone(),b.clone()]);foodEarthworks.connections.push({from:'swale-'+row,to:'swale-'+(row-1),startHeight:a.y,endHeight:b.y,descending:a.y>=b.y})}
 const inletStart=new THREE.Vector3(foodPonds[0].x,foodPonds[0].y,foodPonds[0].z),inletEnd=foodChannels[9][48].clone();
 foodChannels.push([inletStart,new THREE.Vector3(.46,.269,1.33),inletEnd]);
 foodEarthworks.connections.push({from:'lower-storage',to:'swale-9',startHeight:inletStart.y,endHeight:inletEnd.y,descending:inletStart.y>=.269&&.269>=inletEnd.y});
 // Gravity-driven chain, from upper to lower storage. Curves descend throughout.
 for(let i=2;i>0;i--){const a=foodPonds[i],b=foodPonds[i-1],points=[];for(let j=0;j<=32;j++){const t=j/32;points.push(new THREE.Vector3(THREE.MathUtils.lerp(a.x,b.x,t)+Math.sin(t*Math.PI)*.035,THREE.MathUtils.lerp(a.y,b.y,t),THREE.MathUtils.lerp(a.z,b.z,t)))}foodChannels.push(points);foodEarthworks.connections.push({from:a.id,to:b.id,startHeight:a.y,endHeight:b.y,descending:points.every((p,j)=>!j||p.y<=points[j-1].y)})}
 for(const mesh of pieces.values()){
  if(!/^F/.test(mesh.userData.piece_id||''))continue;
  const g=mesh.geometry.clone(),p=g.attributes.position,inverse=mesh.matrixWorld.clone().invert();
  // Small existing triangle facets are subdivided once to round terrace risers.
  const vertices=[],indices=[],old=p;const idx=g.index,cache=new Map();
  for(let i=0;i<old.count;i++)vertices.push(old.getX(i),old.getY(i),old.getZ(i));
  const middle=(a,b)=>{const key=a<b?a+':'+b:b+':'+a;if(cache.has(key))return cache.get(key);const id=vertices.length/3;for(let k=0;k<3;k++)vertices.push((vertices[a*3+k]+vertices[b*3+k])*.5);cache.set(key,id);return id};
  for(let i=0;i<idx.count;i+=3){const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2),ab=middle(a,b),bc=middle(b,c),ca=middle(c,a);indices.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca)}
  for(const key of Object.keys(g.attributes))g.deleteAttribute(key);
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);const pos=g.attributes.position;
  for(let i=0;i<pos.count;i++){
   point.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);const before=point.y,fade=foodWorkFade(point.x,point.z);
   let waterDistance=Infinity;if(!isNorthwestPaddy(point.x,point.z))for(const q of waterSamples)waterDistance=Math.min(waterDistance,Math.hypot(point.x-q[0],point.z-q[1]));
   const terraceFade=fade*THREE.MathUtils.smoothstep(waterDistance,.018,.05);
   const riceWeight=ricePatchWeight(point.x,point.z);
   point.y=THREE.MathUtils.lerp(before,foodTerraceHeight(riceReferenceHeight(point.x,point.z)),terraceFade*riceWeight);
   if(riceWeight>.90&&riceReferenceHeight(point.x,point.z)<foodRiceCeiling+.012){
    const cross=foodPaddyPartition(point.x,point.z),d=Math.min(Math.abs(cross+.75),Math.abs(cross+.51));
    point.y+=.010*(1-THREE.MathUtils.smoothstep(d,.004,.012))*terraceFade;
   }
   // Smooth productive hillside, with explicit raised lake shelves to its left.
   const central=THREE.MathUtils.smoothstep(point.x,-.30,-.19)*(1-THREE.MathUtils.smoothstep(point.x,.43,.56))*THREE.MathUtils.smoothstep(point.z,.65,.77)*(1-THREE.MathUtils.smoothstep(point.z,1.43,1.54));
   point.y=THREE.MathUtils.lerp(point.y,.172+(point.z-.78)*(.009/.061)+.007,central);
   for(const pond of foodPonds){const d=Math.hypot((point.x-pond.x)/(pond.rx*2.2),(point.z-pond.z)/(pond.rz*2.3)),w=1-THREE.MathUtils.smoothstep(d,.48,1.1);point.y=THREE.MathUtils.lerp(point.y,pond.y+.014,w)}
   const pool=foodPondDistance(point.x,point.z);
   if(pool.distance<1.32){const bank=THREE.MathUtils.smoothstep(pool.distance,.80,1.32);point.y=THREE.MathUtils.lerp(pool.pond.y-.014,point.y,bank)}
   const channel=foodChannelDistance(point.x,point.z);
   if(channel.distance<.025){const weight=1-THREE.MathUtils.smoothstep(channel.distance,.008,.025);point.y=THREE.MathUtils.lerp(point.y,channel.height-.006,weight)}
   // Original outer boundary and opening stay exact, including pond/channel edits.
   point.y=THREE.MathUtils.lerp(before,point.y,fade);const delta=point.y-before;
   if(Math.abs(delta)>1e-6)foodEarthworks.modifiedVertices++;foodEarthworks.maxDisplacement=Math.max(foodEarthworks.maxDisplacement,Math.abs(delta));
   point.applyMatrix4(inverse);pos.setXYZ(i,point.x,point.y,point.z);
  }
  g.computeVertexNormals();g.computeBoundingSphere();mesh.geometry=g;
  mesh.material=mesh.material.clone();mesh.material.vertexColors=false;mesh.material.color.set(0x657044);mesh.material.needsUpdate=true;
 }
 // Retire the old additive food-water fragments and swale overlays. The new
 // water surfaces are built against excavated terrain, at declared elevations.
 for(const mesh of scene.children)if(/^F/.test(mesh.userData.piece_id||'')&&['water','foam','contour_swale'].includes(mesh.userData.role)){
  if(mesh.userData.role==='water'){mesh.geometry.setDrawRange(0,0);mesh.userData.retiredFoodWater=true}else mesh.visible=false;
 }
 buildTerrainSampler();
 // Shift each rooted component by the local ground delta, maintaining its pose.
 const matrix=new THREE.Matrix4(),origin=new THREE.Vector3();
 for(const mesh of scene.children){
  if(!/^F/.test(mesh.userData.piece_id||'')||mesh.userData.role!=='vegetation')continue;
  for(let i=0;i<(mesh.isInstancedMesh?mesh.count:1);i++){
   if(mesh.isInstancedMesh)mesh.getMatrixAt(i,matrix);else matrix.copy(mesh.matrix);
   origin.setFromMatrixPosition(matrix);const old=foodOriginalSampler(origin.x,origin.z,NaN),now=terrainSampler(origin.x,origin.z,NaN),pool=foodPondDistance(origin.x,origin.z),channel=foodChannelDistance(origin.x,origin.z);
   if(pool.distance<1.14||channel.distance<.02||(isNorthwestPaddy(origin.x,origin.z)&&foodWorkFade(origin.x,origin.z)>.95))matrix.makeScale(0,0,0);
   else if(Number.isFinite(old)&&Number.isFinite(now)){matrix.elements[13]+=now-old;matrix.multiply(new THREE.Matrix4().makeScale(.86,.76,.86))}
   if(mesh.isInstancedMesh)mesh.setMatrixAt(i,matrix);else{mesh.matrix.copy(matrix);mesh.matrixAutoUpdate=false}
  }
  if(mesh.isInstancedMesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
 }
 stage.dataset.foodEarthworks=foodEarthworks.version;
}

function foodSurface(name,positions,indices,role='water',color=0x1e7184){
 if(!indices.length)return null;
 const g=new THREE.BufferGeometry(),attribute=new THREE.Float32BufferAttribute(positions,3),clean=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 // Clipping can collapse a sliver after conversion to Float32 positions.
 for(let i=0;i<indices.length;i+=3){a.fromBufferAttribute(attribute,indices[i]);b.fromBufferAttribute(attribute,indices[i+1]);c.fromBufferAttribute(attribute,indices[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-22)clean.push(indices[i],indices[i+1],indices[i+2])}
 if(!clean.length){g.dispose();return null}g.setAttribute('position',attribute);g.setIndex(clean);g.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color,roughness:role==='water'?.28:.96,metalness:role==='water'?.04:0,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(g,material);mesh.name=name;mesh.userData={role,piece_id:'F-designed-production'};mesh.receiveShadow=true;scene.add(mesh);if(role==='water')effects.registerWater(mesh);return mesh;
}

function ricePlantGeometry(){
 // Narrow, arched rice blades; shared by the entire planted terrace system.
 const positions=[],colors=[],indices=[];
 for(let blade=0;blade<9;blade++){
  const angle=blade*2.39996323,dx=Math.cos(angle),dz=Math.sin(angle),height=.70+(blade%4)*.075,start=positions.length/3;
  const tint=new THREE.Color([0x6f983b,0x83a548,0x507a36][blade%3]);
  for(const [t,side]of [[0,-1],[0,1],[.58,1],[1,0],[.58,-1]]){
   const bend=.18*t*t,width=.021*(1-t*.82),x=dx*bend-dz*width*side,z=dz*bend+dx*width*side;
   positions.push(x,height*t-.11*t*t,z);colors.push(tint.r,tint.g,tint.b);
  }
  indices.push(start,start+1,start+2,start,start+2,start+4,start+4,start+2,start+3);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}

function buildProductionWater(){
 if(biomeBaseline)return;
 const rice=[],riceCells=new Set(),riceSpacing=.0072;
 // Sample planted area, rather than triangle centres. The latter concentrated
 // tiny tufts on tessellation edges and left most terrace water visibly bare.
 const plantRice=(poly,level)=>{
  const minX=Math.min(...poly.map(p=>p.x)),maxX=Math.max(...poly.map(p=>p.x)),minZ=Math.min(...poly.map(p=>p.z)),maxZ=Math.max(...poly.map(p=>p.z));
  for(let gx=Math.ceil(minX/riceSpacing);gx<=Math.floor(maxX/riceSpacing);gx++)for(let gz=Math.ceil(minZ/riceSpacing);gz<=Math.floor(maxZ/riceSpacing);gz++){
   const key=level.toFixed(3)+','+gx+','+gz;if(riceCells.has(key))continue;
   // Fixed lattice points keep plants inside the clipped polygon even at its
   // edge. Scale, heading and colour variation avoid a repeated tuft pattern.
   const x=gx*riceSpacing,z=gz*riceSpacing;let positive=false,negative=false;
   for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],cross=(b.x-a.x)*(z-a.z)-(b.z-a.z)*(x-a.x);positive ||= cross>1e-10;negative ||= cross< -1e-10}
   if(positive&&negative)continue;riceCells.add(key);
   const u=biomeHash(x,z,27),v=biomeHash(x,z,28);rice.push({p:new THREE.Vector3(x,level+.0039,z),q:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),u*Math.PI*2),scale:new THREE.Vector3(.018+v*.005,.037+u*.010,.018+v*.005)});
  }
 };
 // Clip original slope triangles to iso-elevation bands. Each cell's water is
 // horizontal; banks and narrow gaps separate neighbouring terraces.
 const clip=(poly,test,value)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],va=test(a)-value,vb=test(b)-value;if(va>=0)out.push(a);if((va>=0)!==(vb>=0)){const t=va/(va-vb);out.push({x:THREE.MathUtils.lerp(a.x,b.x,t),z:THREE.MathUtils.lerp(a.z,b.z,t),h:THREE.MathUtils.lerp(a.h,b.h,t),y:THREE.MathUtils.lerp(a.y,b.y,t)})}}return out};
 foodEarthworks.paddyFields=[];
 for(let level=.144;level<foodRiceCeiling;level+=.022)for(const [field,interval]of foodPaddyIntervals.entries()){
  const positions=[],indices=[];
  for(const mesh of pieces.values()){
   if(!/^F/.test(mesh.userData.piece_id||''))continue;const p=mesh.geometry.attributes.position,idx=mesh.geometry.index;
   for(let i=0;i<idx.count;i+=3){
    let poly=[];for(let j=0;j<3;j++){const v=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+j)).applyMatrix4(mesh.matrixWorld);poly.push({x:v.x,z:v.z,y:v.y,h:riceReferenceHeight(v.x,v.z)})}
    if(poly.some(p=>!Number.isFinite(p.h)))continue;
    for(const [test,value]of [[p=>p.h,level+.003],[p=>-p.h,-level-.014],[p=>foodPaddyPartition(p.x,p.z),interval[0]],[p=>-foodPaddyPartition(p.x,p.z),-interval[1]],[p=>p.z,.84],[p=>-p.z,-1.64],[p=>-p.y,-level-.0045]]){if(!poly.length)break;poly=clip(poly,test,value)}
    if(poly.length<3)continue;const center={x:poly.reduce((s,p)=>s+p.x,0)/poly.length,z:poly.reduce((s,p)=>s+p.z,0)/poly.length};
    if(foodWorkFade(center.x,center.z)<.99||ricePatchWeight(center.x,center.z)<.95)continue;
    const start=positions.length/3;for(const p of poly)positions.push(p.x,level+.0045,p.z);for(let j=1;j<poly.length-1;j++)indices.push(start,start+j,start+j+1);
    plantRice(poly,level);
   }
  }
  if(foodSurface('Rice paddy / level '+level.toFixed(3)+' / enclosed field '+(field+1),positions,indices)){
   foodEarthworks.paddyCells++;foodEarthworks.paddyFields.push({level,field:field+1,interval,triangles:indices.length/3});
  }
 }
 const riceMesh=biomePlantBatch('Food production / rice tillers',ricePlantGeometry(),new THREE.MeshStandardMaterial({name:'Mountain rice / matte green blades',vertexColors:true,roughness:1,side:THREE.DoubleSide}),rice);
 if(riceMesh){riceMesh.userData.piece_id='F-mountain-rice';riceMesh.userData.planting='lower-enclosed-mountain-paddies'}
 foodEarthworks.ricePlants=rice.length;foodEarthworks.ricePlanting={distribution:'lower-enclosed-mountain-paddies',upperUse:'continuous grape terraces',spacing:riceSpacing,trianglesPerTuft:27,triangles:rice.length*27};
 for(const boundary of [-.75,-.51]){
  const positions=[],indices=[];let previous=false;
  for(let i=0;i<=180;i++){
   const z=.84+i/180*.73,x=boundary-.025*Math.sin((z-.8)*8),ref=riceReferenceHeight(x,z);
   if(ref>foodRiceCeiling+.014||foodWorkFade(x,z)<.98||ricePatchWeight(x,z)<.95){previous=false;continue}
   const at=positions.length/3;let valid=true;const points=[];
   for(const dx of [-.006,0,.006]){const h=terrainSampler(x+dx,z,NaN);if(!Number.isFinite(h))valid=false;points.push(x+dx,h+(dx===0?.0045:.0015),z)}
   if(!valid){previous=false;continue}positions.push(...points);
   if(previous)for(let j=0;j<2;j++)indices.push(at-3+j,at-2+j,at+j,at-2+j,at+1+j,at+j);previous=true;
  }
  foodSurface('Rice paddy / planted cross-bund '+boundary,positions,indices,'paddy_bund',0x73834b);
 }
 for(const pond of foodPonds){
  const positions=[pond.x,pond.y,pond.z],indices=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,shape=1+.07*Math.sin(a*3+.7)+.04*Math.sin(a*5);positions.push(pond.x+Math.cos(a)*pond.rx*shape*.94,pond.y,pond.z+Math.sin(a)*pond.rz*shape*.94);if(i)indices.push(0,i,i+1)}
  foodSurface('Linked lake / '+pond.id,positions,indices);
 }
 for(const [id,points]of foodChannels.entries()){
  const positions=[],indices=[];for(let i=0;i<points.length;i++){const p=points[i],t=points[Math.min(i+1,points.length-1)].clone().sub(points[Math.max(0,i-1)]).setY(0).normalize(),side=new THREE.Vector3(-t.z,0,t.x);for(const sign of [-1,1])positions.push(...p.clone().addScaledVector(side,sign*.007).toArray());if(i){const a=(i-1)*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}}foodSurface('Gravity spillway / '+id,positions,indices);
 }
 window.heroFoodEarthworks=foodEarthworks;stage.dataset.ricePaddyCells=String(foodEarthworks.paddyCells);stage.dataset.linkedLakes='3';
}

function buildMarkedWindbreaks(){
 if(biomeBaseline)return;
 const paths=[
  {id:'left-flank-tall-low',mixed:false,points:[[-.47,.53],[-.90,.98],[-1.30,1.55]]},
  {id:'right-flank-tall-low',mixed:false,points:[[.48,.62],[.83,1.10],[1.00,1.69]]},
  {id:'left-rear-mixed',mixed:true,points:[[-1.27,1.60],[-1.05,1.72],[-.70,1.81]]},
  {id:'right-rear-mixed',mixed:true,points:[[.31,1.84],[.64,1.86],[.93,1.79]]}
 ];
 const trees=[],olives=[],shrubs=[],palms=[];
 for(const path of paths){
  const curve=new THREE.CatmullRomCurve3(path.points.map(([x,z])=>new THREE.Vector3(x,0,z))),length=curve.getLength(),count=Math.ceil(length/.052);
  for(let i=0;i<count;i++){
   const t=(i+.5)/count,p=curve.getPoint(t),tangent=curve.getTangent(t),side=new THREE.Vector3(-tangent.z,0,tangent.x),u=biomeHash(p.x,p.z,19);
   for(let layer=0;layer<3;layer++){
    const q=p.clone().addScaledVector(side,(layer-1)*.028).addScaledVector(tangent,(u-.5)*.015),h=terrainSampler(q.x,q.z,NaN);
    if(!foodOwnerAt(q.x,q.z)||!Number.isFinite(h)||foodPondDistance(q.x,q.z).distance<1.25||foodChannelDistance(q.x,q.z).distance<.026)continue;
    const height=(layer===0?.15:layer===1?.085:.032)*(.84+u*.32),record={p:new THREE.Vector3(q.x,h,q.z),q:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),u*Math.PI*2),scale:new THREE.Vector3(height,height,height)};
    if(layer===2){record.scale.x*=1.4;record.scale.z*=1.4;shrubs.push(record)}
    else if(path.mixed&&layer===0&&i%3===1){palms.push(record)}
    else if(path.mixed)olives.push(record);else trees.push(record);
   }
  }
  foodEarthworks.paths.push({id:path.id,strata:3,placement:path.points});
 }
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,side:THREE.DoubleSide});
 biomePlantBatch('Food production / flank shelter canopy',biomeTreeGeometry(0),material,trees);
 const olive=biomeTreeGeometry(1),color=olive.attributes.color;
 for(let i=0;i<color.count;i++){const c=new THREE.Color().fromBufferAttribute(color,i);if(c.g>c.r*1.1){c.lerp(new THREE.Color(0x6c8063),.6);color.setXYZ(i,c.r,c.g,c.b)}}
 biomePlantBatch('Food production / olive-form rear shelter',olive,material,olives);
 biomePlantBatch('Food production / low shelter shrubs',biomeTreeGeometry(1),material,shrubs);
 biomePlantBatch('Food production / mixed rear palm layer',shelterPalmGeometry(),material,palms);
 foodEarthworks.windbreaks={canopy:trees.length,oliveForms:olives.length,shrubs:shrubs.length,palms:palms.length,frontCrossRows:0};
 stage.dataset.foodBeltDesign='owner-marked-flank-and-rear-three-strata';
}

function shelterPalmGeometry(){
 const positions=[],colors=[],indices=[];
 const vertex=(x,y,z,color)=>{positions.push(x,y,z);const c=new THREE.Color(color);colors.push(c.r,c.g,c.b);return positions.length/3-1};
 for(let j=0;j<7;j++){const a=j/7*Math.PI*2,b=(j+1)/7*Math.PI*2;const v=[vertex(Math.cos(a)*.025,0,Math.sin(a)*.025,0x766343),vertex(Math.cos(b)*.025,0,Math.sin(b)*.025,0x766343),vertex(Math.cos(a)*.017,.78,Math.sin(a)*.017,0x766343),vertex(Math.cos(b)*.017,.78,Math.sin(b)*.017,0x766343)];indices.push(v[0],v[1],v[2],v[1],v[3],v[2])}
 for(let f=0;f<9;f++){
  const a=f*2.39996,d=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),side=new THREE.Vector3(-d.z,0,d.x);
  for(let j=1;j<=12;j++){
   const t=j/12,p=d.clone().multiplyScalar(.55*t);p.y=.78+.30*Math.sin(t*Math.PI*.9)-.13*t;
   for(const sign of [-1,1]){const length=.14*Math.sin(t*Math.PI)+.025,tip=p.clone().addScaledVector(side,sign*length).addScaledVector(d,.025);tip.y-=.045;const v=[vertex(p.x-d.x*.012,p.y,p.z-d.z*.012,0x466d38),vertex(tip.x,tip.y,tip.z,0x5f7c41),vertex(p.x+d.x*.017,p.y+.005,p.z+d.z*.017,0x466d38)];indices.push(...v)}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

// Authored rainforest proportions, shared by every primitive of a tree.
// Keep root positions and ecological corridors fixed; vary crowns around them.
const biomeDesign={version:'biomes-02',trees:0,emergents:0,broadCrowns:0,temperateSources:0,temperateTrees:0,orchardTrees:0,wetlandTufts:0,foodHerbs:0};
const temperateSources=new Map();
const biomeBaseline=new URLSearchParams(location.search).has('baselineBiome');
function biomeHash(x,z,salt=0){const n=Math.sin(x*127.1+z*311.7+salt*74.7)*43758.5453;return n-Math.floor(n)}
function refineBiomeInstances(items){
 if(biomeBaseline)return;
 for(const item of items)if(['vegetation','rim_vegetation'].includes(item.extras?.role)){const p=new THREE.Vector3().setFromMatrixPosition(item.matrix);item.matrix.elements[13]+=rimHeightDeltaAt(p.x,p.z)}
 for(let i=items.length-1;i>=0;i--)if(/^F/.test(items[i].extras?.piece_id||'')&&items[i].extras?.windbreak_id!==undefined){items.splice(i,1);biomeDesign.removedFoodBeltPlants=(biomeDesign.removedFoodBeltPlants||0)+1}
 for(let i=items.length-1;i>=0;i--){
  const item=items[i],e=item.extras||{};if(e.role!=='vegetation'||!/^M[1-5]$/.test(e.piece_id||''))continue;
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();item.matrix.decompose(p,q,s);
  const community=String(e.community||''),u=biomeHash(p.x,p.z);
  if(/canopy_layered|rain_fine|fan_crown/.test(community)){
   const key=p.x.toFixed(6)+','+p.z.toFixed(6);
   temperateSources.set(key,{p,q,height:Math.max(.035,Math.min(.22,s.y*1.22)),piece:e.piece_id,u});
   items.splice(i,1);
  }else if(/understory|dense_understory|spearleaf/.test(community)&&u>.45){
   // Keep irregular low groups while opening views between deciduous trunks.
   items.splice(i,1);
  }
 }
 for(const item of items){
  const e=item.extras||{};if(e.role!=='vegetation'||!/^R[1-5]$/.test(e.piece_id||''))continue;
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();item.matrix.decompose(p,q,s);
  const hash=Math.sin(p.x*127.1+p.z*311.7)*43758.5453,u=hash-Math.floor(hash);
  const cluster=.5+.5*Math.sin(p.x*8.7+p.z*5.3);
  const community=String(e.community||'');
  let wide=.91+.22*u,tall=.87+.22*cluster+.13*u;
  if(/fig|spread|broad/.test(community)){wide*=1.13;tall*=.96;}
  if(/emergent|column/.test(community)&&u>.84){tall*=1.19;wide*=.97;}
  if(/understory|shrub|fern/.test(community)){tall=.86+.22*u;wide=.95+.12*cluster;}
  if(/palm/.test(community)){wide=.94+.12*u;tall=.93+.17*cluster;}
  s.multiply(new THREE.Vector3(wide,tall,wide));item.matrix.compose(p,q,s);
  item.biomeTint=new THREE.Color().setHSL(.28+.055*cluster,.16+.055*u,.77+.11*u);
  biomeDesign.trees++;
  if(tall>1.2)biomeDesign.emergents++;
  if(wide>1.18)biomeDesign.broadCrowns++;
 }
}

function biomeTreeGeometry(variant=0){
 const positions=[],colors=[],indices=[];let seed=721+variant*173;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 function vertex(p,c){positions.push(p.x,p.y,p.z);colors.push(c.r,c.g,c.b);return positions.length/3-1}
 function branch(a,b,r1,r2){
  const axis=b.clone().sub(a).normalize(),side=new THREE.Vector3(0,0,1).cross(axis).normalize(),up=axis.clone().cross(side),start=positions.length/3;
  const bark=new THREE.Color(variant===2?0x655b49:0x70634f);
  for(const [p,r]of [[a,r1],[b,r2]])for(let j=0;j<6;j++){const angle=j/6*Math.PI*2;vertex(p.clone().addScaledVector(side,Math.cos(angle)*r).addScaledVector(up,Math.sin(angle)*r),bark)}
  for(let j=0;j<6;j++){const a=start+j,b=start+(j+1)%6,c=start+6+j,d=start+6+(j+1)%6;indices.push(a,b,c,b,d,c)}
 }
 const origin=new THREE.Vector3(),fork=new THREE.Vector3(.025,.48,0);branch(origin,fork,.026,.015);
 for(let lobe=0;lobe<9;lobe++){
  const angle=lobe*2.39996+variant,reach=.20+random()*.17;
  const tip=new THREE.Vector3(Math.cos(angle)*reach,.62+random()*.28,Math.sin(angle)*reach);
  const start=fork.clone().multiplyScalar(.8+random()*.3),joint=start.clone().lerp(tip,.55);joint.y+=.035;
  branch(start,joint,.012,.007);branch(joint,tip,.007,.0018);
  for(let leaf=0;leaf<46;leaf++){
   const theta=random()*Math.PI*2,y=random()*2-1,r=Math.sqrt(1-y*y),radius=.7+.3*random();
   const p=tip.clone().add(new THREE.Vector3(Math.cos(theta)*r*.19*radius,y*.18*radius,Math.sin(theta)*r*.19*radius));
   const palette=variant===2?[0x688443,0x7d8541,0x577943]:variant===1?[0x3c693b,0x527f43,0x65884b]:[0x37663b,0x47763d,0x5b8542];
   const color=new THREE.Color(palette[Math.floor(random()*palette.length)]).multiplyScalar(.8+random()*.35);
   const length=.028+random()*.023,width=length*(variant===1?.34:.44),a=random()*Math.PI*2;
   const along=new THREE.Vector3(Math.cos(a),.15,Math.sin(a)),across=new THREE.Vector3(-Math.sin(a),.12,Math.cos(a));
   const v=[vertex(p.clone().addScaledVector(along,length),color),vertex(p.clone().addScaledVector(across,width),color),vertex(p.clone().addScaledVector(along,-length),color),vertex(p.clone().addScaledVector(across,-width),color),vertex(p.clone().add(new THREE.Vector3(0,.009,0)),color)];
   indices.push(v[0],v[1],v[4],v[1],v[2],v[4],v[2],v[3],v[4],v[3],v[0],v[4]);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

function biomePlantBatch(name,geometry,material,records){
 if(!records.length){geometry.dispose();return null}
 if(name.startsWith('Food forest /'))for(const r of records)forestAnchors.push({p:r.p.clone(),piece:'F-food-forest'});
 const mesh=new THREE.InstancedMesh(geometry,material,records.length),matrix=new THREE.Matrix4();
 records.forEach((r,i)=>{matrix.compose(r.p,r.q||new THREE.Quaternion(),r.scale);mesh.setMatrixAt(i,matrix)});
 mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;mesh.userData={role:name.includes('reed')?'wetland_reed':'vegetation',biomeDesign:true};scene.add(mesh);return mesh;
}

function buildTemperateWoodland(){
 const variants=[[],[],[]],material=new THREE.MeshStandardMaterial({name:'Temperate deciduous leaves and grey-brown bark',vertexColors:true,roughness:.94,side:THREE.DoubleSide});
 const sources=[...temperateSources.values()];biomeDesign.temperateSources=sources.length;
 // A genuine orchard opening beside the food-producing sector; retain the
 // woodland elsewhere. A spacing rule creates readable ground between trees.
 const orchard=[];
 for(const item of sources){
  const {p,q,u}=item,h=terrainSampler(p.x,p.z,NaN);if(!Number.isFinite(h))continue;
  const productiveEdge=p.z>.55&&p.x<1.10;
  if(productiveEdge){if(orchard.some(o=>Math.hypot(o.x-p.x,o.z-p.z)<.12))continue;orchard.push(p.clone());}
  const height=productiveEdge?Math.min(.115,Math.max(.065,item.height)):item.height;
  const seasonal=!productiveEdge&&u>.88,variant=seasonal?2:u>.45?1:0;
  variants[variant].push({p:new THREE.Vector3(p.x,h,p.z),q,scale:new THREE.Vector3(height*(productiveEdge?1.12:1),height,height*(productiveEdge?1.12:1))});
  biomeDesign.temperateTrees++;if(productiveEdge)biomeDesign.orchardTrees++;
  forestAnchors.push({p:new THREE.Vector3(p.x,h,p.z),piece:item.piece});
 }
 variants.forEach((records,i)=>biomePlantBatch('Temperate woodland / deciduous family '+i,biomeTreeGeometry(i),material,records));
 stage.dataset.temperateDesign='deciduous-woodland-to-open-orchard';
}

function wetlandReedGeometry(){
 const positions=[],colors=[],indices=[];
 for(let i=0;i<11;i++){
  const a=i*2.39996,r=.10+.12*(i%3),x=Math.cos(a)*r,z=Math.sin(a)*r,height=.54+(i%5)*.105,w=.021;
  const start=positions.length/3,color=new THREE.Color(i%4===0?0x7b8045:0x4d7544);
  for(const p of [[x-w,0,z],[x+w,0,z],[x+w*.45,height*.58,z+.08],[x+w*.22,height,z+.19],[x-w*.45,height*.58,z+.08]]){positions.push(...p);colors.push(color.r,color.g,color.b)}
  indices.push(start,start+1,start+2,start,start+2,start+4,start+4,start+2,start+3);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

function buildWetlandMargins(){
 const records=[],occupied=new Set(),edges=new Map(),a=new THREE.Vector3(),b=new THREE.Vector3();scene.updateMatrixWorld(true);
 for(const mesh of [...scene.children]){
  if(mesh.userData.role!=='water'||!/^W[1-5]$/.test(mesh.userData.piece_id||''))continue;
  const g=mesh.geometry,p=g.attributes.position,index=g.index;if(!index)continue;
  const local=new Map();
  for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){
   a.fromBufferAttribute(p,index.getX(i+j)).applyMatrix4(mesh.matrixWorld);b.fromBufferAttribute(p,index.getX(i+(j+1)%3)).applyMatrix4(mesh.matrixWorld);
   const ka=a.toArray().map(v=>v.toFixed(5)).join(','),kb=b.toArray().map(v=>v.toFixed(5)).join(','),key=ka<kb?ka+'|'+kb:kb+'|'+ka;
   const edge=local.get(key);if(edge)edge.count++;else local.set(key,{a:a.clone(),b:b.clone(),count:1,piece:mesh.userData.piece_id});
  }
  for(const [key,edge]of local)if(edge.count===1)edges.set(key,edge);
 }
 for(const edge of edges.values()){
  const length=edge.a.distanceTo(edge.b),steps=Math.max(1,Math.ceil(length/.019));if(length>.16)continue;
  for(let i=0;i<steps;i++){
   const p=edge.a.clone().lerp(edge.b,(i+.5)/steps),u=biomeHash(p.x,p.z);if(u<.34)continue;
   const tangent=edge.b.clone().sub(edge.a).setY(0).normalize(),side=new THREE.Vector3(-tangent.z,0,tangent.x);
   for(const sign of [-1,1]){
    const q=p.clone().addScaledVector(side,sign*(.008+u*.012)),h=terrainSampler(q.x,q.z,NaN);
    if(!Number.isFinite(h)||h<p.y+.0005||h>p.y+.018)continue;
    const key=Math.round(q.x/.018)+','+Math.round(q.z/.018);if(occupied.has(key))continue;occupied.add(key);
    const height=.014+u*.020;records.push({p:new THREE.Vector3(q.x,h+.001,q.z),q:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),u*Math.PI*2),scale:new THREE.Vector3(height,height,height)});
   }
  }
 }
 biomePlantBatch('Wetland reed and sedge shelves',wetlandReedGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),records);
 biomeDesign.wetlandTufts=records.length;stage.dataset.wetlandDesign='depth-checked-irregular-reed-margins';
}

function buildFoodBankHerbs(){
 const records=[];
 for(const bank of foodSwaleGroup.children){
  if(bank.userData.role!=='swale_berm')continue;
  const p=bank.geometry.attributes.position,cross=7;
  for(let i=2;i<Math.floor(p.count/cross)-2;i+=3){
   const at=i*cross+3,x=p.getX(at),z=p.getZ(at),u=biomeHash(x,z,3);if(u<.2||foodPondDistance(x,z).distance<1.2||isNorthwestPaddy(x,z))continue;
   const qz=z+.025+(u-.5)*.012,h=terrainSampler(x,qz,NaN);if(!Number.isFinite(h))continue;
   const size=.011+.008*u;records.push({p:new THREE.Vector3(x,h+.001,qz),scale:new THREE.Vector3(size*1.15,size*.64,size*1.15)});
  }
 }
 biomePlantBatch('Food forest / herb and groundcover bank layer',biomeHerbGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),records);
 biomeDesign.foodHerbs=records.length;stage.dataset.foodForestDesign='fruit-shrub-herb-bank-layers';
}

function biomeHerbGeometry(){
 const positions=[],colors=[],indices=[],color=new THREE.Color(0x638348);
 for(let i=0;i<9;i++){
  const angle=i*2.39996,length=.55+(i%3)*.13,width=.12,start=positions.length/3;
  const along=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)),side=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));
  for(const [t,w,y]of [[0,0,0],[.45,width,.18],[1,0,.32],[.45,-width,.18],[.45,0,.23]]){
   const p=along.clone().multiplyScalar(t*length).addScaledVector(side,w);p.y=y;positions.push(...p.toArray());colors.push(color.r,color.g,color.b);
  }
  indices.push(start,start+1,start+4,start+1,start+2,start+4,start+2,start+3,start+4,start+3,start,start+4);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

function refineFoodSwalePlants(){
 const fruit=[],shrubs=[],matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
 for(const mesh of [...foodSwaleGroup.children]){
  if(!mesh.isInstancedMesh||!['swale_fruit_tree','swale_guild_shrub'].includes(mesh.userData.role))continue;
  const shrub=mesh.userData.role==='swale_guild_shrub';
  // Each fruit tree previously had a separate cylinder and a solid crown.
  // Read crown instances only, then replace both batches with branched trees.
  if(shrub||mesh.geometry.type!=='CylinderGeometry')for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);matrix.decompose(p,q,s);const h=terrainSampler(p.x,p.z,NaN);if(!Number.isFinite(h)||foodPondDistance(p.x,p.z).distance<1.2||isNorthwestPaddy(p.x,p.z))continue;
   const height=(shrub?.042:.115)*s.y;
   (shrub?shrubs:fruit).push({p:new THREE.Vector3(p.x,h,p.z),q:q.clone(),scale:new THREE.Vector3(height*(shrub?1.6:1.02),height,height*(shrub?1.6:1.02))});
  }
  foodSwaleGroup.remove(mesh);
 }
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,side:THREE.DoubleSide});
 biomePlantBatch('Food forest / branched fruit trees',biomeTreeGeometry(0),material,fruit);
 biomePlantBatch('Food forest / leafy guild shrubs',biomeTreeGeometry(1),material,shrubs);
 biomeDesign.foodFruitTrees=fruit.length;biomeDesign.foodShrubs=shrubs.length;
}

function buildOtherBiomeDesign(){
 if(biomeBaseline)return;
 buildTemperateWoodland();buildWetlandMargins();buildFoodBankHerbs();refineFoodSwalePlants();buildCultivatedBeds();buildMarkedWindbreaks();
}

function buildCultivatedBeds(){
 const cropGroups=[[],[],[]];let beds=0;
 for(let row=0;row<payload.foodContours.length;row++){
  const points=payload.foodContours[row].map(p=>new THREE.Vector3(p[0],0,p[2]+.040));
  const curve=new THREE.CatmullRomCurve3(points),geometry=groundedSwaleGeometry(curve,.014,0,false);
  const material=new THREE.MeshStandardMaterial({name:'Cultivated mulch bed',color:row%2?0x655638:0x74613e,roughness:1,side:THREE.DoubleSide});
  const bed=new THREE.Mesh(geometry,material);bed.name='Food production / curved cultivated bed '+(row+1);bed.userData={role:'cultivated_bed',piece_id:'F-food-forest'};bed.receiveShadow=true;scene.add(bed);beds++;
  for(let i=0;i<90;i++){
   const t=(i+.4)/90,p=curve.getPoint(t),tangent=curve.getTangent(t),u=biomeHash(p.x,p.z,8);
   for(const side of [-1,1]){const x=p.x-tangent.z*.006*side,z=p.z+tangent.x*.006*side,h=terrainSampler(x,z,NaN);if(!Number.isFinite(h)||foodPondDistance(x,z).distance<1.2||(isNorthwestPaddy(x,z)&&foodWorkFade(x,z)>.95))continue;const size=.007+u*.006;cropGroups[row%3].push({p:new THREE.Vector3(x,h+.004,z),scale:new THREE.Vector3(size,size*(row%3===1?1.6:.7),size)})}
  }
 }
 cropGroups.forEach((records,i)=>biomePlantBatch('Food production / crop family '+i,biomeHerbGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,color:[0x99af74,0x87a16a,0xb1a57a][i],roughness:1,side:THREE.DoubleSide}),records));
 biomeDesign.cultivatedBeds=beds;biomeDesign.cropPlants=cropGroups.reduce((n,g)=>n+g.length,0);stage.dataset.foodBeltDesign='front-and-cross-field-tree-belts-removed';
}
function tintBiomeInstances(mesh,items,material){
 // Leaf materials only: trunks, fruit, roots and water retain authored colours.
 if(!mesh.isInstancedMesh||!/leaf|foliage|frond|canopy/i.test(material.name||''))return;
 items.forEach((item,i)=>mesh.setColorAt(i,item.biomeTint||new THREE.Color(1,1,1)));
 if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
}

function createKnowledgeRoutePlanner(api){
 const {THREE:T,scene,pieces,payload,terrainSampler}=api;
  const began=performance.now(),step=.024,x0=-2.04,z0=-2.10,nx=171,nz=180,count=nx*nz,heights=new Float32Array(count),wet=new Float32Array(count),valid=new Uint8Array(count),cost=new Float32Array(count),waterBins=new Map(),bedBins=new Map(),cell=.055,guide=payload.openingGuide.top.filter((_,i)=>i%6===0),v=new T.Vector3();
  wet.fill(-100);heights.fill(NaN);scene.updateMatrixWorld(true);
  scene.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh||!['water','inner_food_bed','cultivated_bed'].includes(mesh.userData.role)||mesh.geometry.drawRange.count===0)return;const bins=mesh.userData.role==='water'?waterBins:bedBins,p=mesh.geometry.attributes.position,ix=mesh.geometry.index;if(!ix)return;for(let i=0;i<ix.count;i+=3){const q=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix.getX(i+j)).applyMatrix4(mesh.matrixWorld)),[a,b,c]=q,den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-12)continue;for(let x=Math.floor(Math.min(a.x,b.x,c.x)/cell);x<=Math.floor(Math.max(a.x,b.x,c.x)/cell);x++)for(let z=Math.floor(Math.min(a.z,b.z,c.z)/cell);z<=Math.floor(Math.max(a.z,b.z,c.z)/cell);z++){const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push({q,den})}}});
  const waterAt=(x,z)=>{let h=-100;for(const {q:[a,b,c],den}of waterBins.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,w=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;if(u>=-1e-6&&w>=-1e-6&&u+w<=1.000001)h=Math.max(h,u*a.y+w*b.y+(1-u-w)*c.y)}return h};
  const bedAt=(x,z)=>{for(const {q:[a,b,c],den}of bedBins.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,w=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;if(u>=-1e-6&&w>=-1e-6&&u+w<=1.000001)return true}return false};
  function openingDistance(x,z){let d=Infinity;for(let i=0;i<guide.length;i++){const a=guide[i],b=guide[(i+1)%guide.length],dx=b[0]-a[0],dz=b[2]-a[2],length=dx*dx+dz*dz;if(!length)continue;const t=T.MathUtils.clamp(((x-a[0])*dx+(z-a[2])*dz)/length,0,1);d=Math.min(d,Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t))}return d}
  const index=(x,z)=>{const ix=Math.round((x-x0)/step),iz=Math.round((z-z0)/step);return ix<0||ix>=nx||iz<0||iz>=nz?-1:iz*nx+ix},coord=id=>({x:x0+(id%nx)*step,z:z0+Math.floor(id/nx)*step});
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const id=iz*nx+ix,x=x0+ix*step,z=z0+iz*step,h=terrainSampler(x,z,NaN),edge=openingDistance(x,z);if(!Number.isFinite(h)||edge<.07||edge>1.45||api.ricePatchWeight(x,z)>.01||api.foodPondDistance(x,z).distance<1.13||[[0,0],[.007,0],[-.007,0],[0,.007],[0,-.007]].some(([dx,dz])=>bedAt(x+dx,z+dz)))continue;const margin=[[.008,0],[-.008,0],[0,.008],[0,-.008]].map(([dx,dz])=>terrainSampler(x+dx,z+dz,NaN));if(margin.some(y=>!Number.isFinite(y)||Math.abs(y-h)>.018))continue;heights[id]=h;wet[id]=waterAt(x,z);valid[id]=1;cost[id]=1+Math.max(0,.15-edge)*18+(wet[id]>h-.001?35:0);if(api.foodChannelDistance(x,z).distance<.016)cost[id]+=40}
  // Prefer clear ground, while allowing a foot trail beneath forest crowns.
  const roots=new Set();scene.traverse(mesh=>{if(!mesh.isInstancedMesh||!['vegetation','rim_vegetation','inner_biome_planting'].includes(mesh.userData.role))return;const m=new T.Matrix4();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);v.setFromMatrixPosition(m).applyMatrix4(mesh.matrixWorld);const id=index(v.x,v.z);if(id<0||id>=count||!valid[id])continue;const key=Math.round(v.x/.012)+','+Math.round(v.z/.012);if(roots.has(key))continue;roots.add(key);cost[id]+=5}});
  const nearest=(seed,dry=true)=>{let best=-1,score=Infinity;for(let id=0;id<count;id++){if(!valid[id]||(dry&&wet[id]>heights[id]-.001))continue;const p=coord(id),d=Math.hypot(p.x-seed[0],p.z-seed[1]);if(d>.45)continue;const s=d+cost[id]*.0007;if(s<score){score=s;best=id}}if(best<0)throw Error('No supported route stop near '+seed);return best};
  function segmentSafe(a,b){const distance=Math.hypot(a.x-b.x,a.z-b.z),n=Math.max(2,Math.ceil(distance/.003));let h=terrainSampler(a.x,a.z,NaN);for(let j=1;j<=n;j++){const t=j/n,x=T.MathUtils.lerp(a.x,b.x,t),z=T.MathUtils.lerp(a.z,b.z,t),next=terrainSampler(x,z,NaN);if(!Number.isFinite(next)||Math.abs(next-h)/(distance/n)>.75||bedAt(x,z))return false;h=next}return true}
  const edgeCache=new Map();
  class Heap{constructor(){this.a=[]}push(id,score){const a=this.a;let i=a.length;a.push({id,score});while(i){const p=(i-1)>>1;if(a[p].score<=score)break;a[i]=a[p];i=p}a[i]={id,score}}pop(){const a=this.a,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].score<a[c].score)c++;if(a[c].score>=last.score)break;a[i]=a[c];i=c}a[i]=last}return first}get length(){return this.a.length}}
  function search(start,end){const distances=new Float32Array(count),previous=new Int32Array(count),done=new Uint8Array(count),heap=new Heap(),goal=coord(end);distances.fill(Infinity);previous.fill(-1);distances[start]=0;heap.push(start,0);while(heap.length){const {id}=heap.pop();if(done[id])continue;if(id===end){const path=[];for(let at=end;at>=0;at=previous[at]){path.push(at);if(at===start)break}return path.reverse()}done[id]=1;const x=id%nx,z=Math.floor(id/nx),p=coord(id);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if((!dx&&!dz)||x+dx<0||x+dx>=nx||z+dz<0||z+dz>=nz)continue;const next=id+dx+dz*nx;if(!valid[next]||done[next])continue;if(dx&&dz&&(!valid[id+dx]||!valid[id+dz*nx]))continue;const length=step*Math.hypot(dx,dz),grade=Math.abs(heights[next]-heights[id])/length;if(grade>.50)continue;const q=coord(next),key=id<next?id+','+next:next+','+id;let safe=edgeCache.get(key);if(safe===undefined){safe=segmentSafe(p,q);edgeCache.set(key,safe)}if(!safe)continue;const distance=distances[id]+length*((cost[id]+cost[next])/2+grade*grade*16);if(distance<distances[next]){distances[next]=distance;previous[next]=id;heap.push(next,distance+Math.hypot(q.x-goal.x,q.z-goal.z))}}}throw Error('No walkable connection between mapping stops')}

 return {search,nearest,coord,index,valid,heights,wet,waterAt,bedAt,openingDistance,segmentSafe,step,buildMilliseconds:performance.now()-began};
}

// A visual reveal of the knowledge in a landscape. It deliberately has no
// reading card, record chooser or information-browser interaction.
function installNourishlandLayer(api){
 const {THREE:T,scene,camera,stage,pieces,payload,terrainSampler,renderer,requestRender,createLivingSphereGeometry,createTotemSculptureGeometry}=api;
 window.heroNourishland?.dispose();
 const root=new T.Group();root.name='Nourishland / living knowledge mesh';root.userData.role='nl_mapping_layer';root.visible=false;scene.add(root);
 const report={version:'knowledge-mesh-03',purpose:'animated hidden information',informationBrowser:false,stations:[],points:[],network:[],route:[],routeRanges:[],unconnected:[],swales:[],growthSeconds:15,orbModel:'actual Living shell / twelve cells',orbScale:.0048,styles:['botanical','carved','organic'],batches:0,triangles:0,hiddenGroundPlants:0,paths:0,knowledgeLinks:0,microPimoPanels:0};
 const state={visible:false,built:false,busy:false,growth:0,alpha:0,time:0,error:null,highlight:null};
 const uniforms={uNLGrowth:{value:0},uNLTime:{value:0},uNLAlpha:{value:0},uNLFocus:{value:0}},materials=[],geometries=[],textures=[],handlers=[],clearance=[],worldPatches=[];
 const families={R:{name:'Rainforest',color:0x8adbc3,categories:[0,2,3,10,4,12]},C:{name:'Temperate woodland',color:0xd8be8d,categories:[0,2,9,12,3,10]},W:{name:'Wetland',color:0x90d9e8,categories:[1,3,9,4,12,15]},F:{name:'Food systems',color:0xe6d283,categories:[8,6,2,1,14,12]},M:{name:'Meadow',color:0xc5d99b,categories:[3,0,9,4,10,15]}};
 const categoryNames=['Plants','Water','Root systems','Biodiversity','Microclimate','Observations','Nutrition','Relationships','Fruit & harvest','Living soil','Species','Stories','Seasons','Connections','Planting guilds','Habitat'];
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ownGeometry=g=>(geometries.push(g),g),ownTexture=t=>(textures.push(t),t),ownMaterial=m=>{materials.push(m);return m};
 const ui=document.createElement('div');ui.className='nl-layer-ui';ui.innerHTML='<button class="nl-layer-switch" type="button" role="switch" aria-checked="false" aria-label="Nourishland layer"><span class="nl-switch-track" aria-hidden="true"><i></i></span><span>Nourishland layer</span></button><p class="nl-layer-status" role="status" aria-live="polite"></p>';
 const css=document.createElement('style');css.textContent='.nl-layer-switch{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:72;display:flex;align-items:center;gap:9px;padding:9px 15px;border:1px solid #e7ebce88;border-radius:28px;background:#143a30e8;color:#f2f4df;font:12px system-ui;cursor:pointer;backdrop-filter:blur(8px)}.nl-layer-switch:focus-visible{outline:2px solid #e6d283;outline-offset:3px}.nl-switch-track{width:27px;height:15px;border:1px solid #e2e9d3aa;border-radius:12px;position:relative}.nl-switch-track i{position:absolute;left:2px;top:2px;width:9px;height:9px;border-radius:50%;background:#a8b9ac;transition:transform .25s,background .25s}.nl-layer-switch[aria-checked=true] .nl-switch-track i{transform:translateX(12px);background:#e6d283}.nl-layer-switch[disabled]{cursor:wait}.nl-layer-status{position:fixed;z-index:72;left:50%;top:49px;transform:translateX(-50%);margin:0;padding:6px 12px;border-radius:20px;background:#143a30e8;color:#e8edd7;font:11px system-ui;pointer-events:none}.nl-layer-status:empty{display:none}@media(max-width:700px){.nl-layer-switch{top:51px}.nl-layer-status{top:87px}}';document.head.append(css);document.body.append(ui);
 const toggle=ui.querySelector('button'),status=ui.querySelector('p');toggle.hidden=new URLSearchParams(location.search).has('hero');
 const yieldFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 function growthMaterial(material){
  const previous=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=function(shader,r){previous.call(this,shader,r);shader.uniforms.uNLGrowth=uniforms.uNLGrowth;shader.uniforms.uNLAlpha=uniforms.uNLAlpha;shader.vertexShader='attribute float aNLGrow;varying float vNLGrow;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNLGrow=aNLGrow;');shader.fragmentShader='uniform float uNLGrowth;uniform float uNLAlpha;varying float vNLGrow;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\ndiffuseColor.a*=uNLAlpha*smoothstep(vNLGrow,vNLGrow+.035,uNLGrowth);if(diffuseColor.a<.001)discard;')};material.customProgramCacheKey=()=>cache()+'|nl-knowledge-growth-03';return ownMaterial(material);
 }
 function focusLandscape(){
  const seen=new Set();scene.traverse(mesh=>{if(!mesh.isMesh)return;for(let p=mesh;p;p=p.parent)if(p===root)return;for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material])){if(!material||seen.has(material)||!material.isMeshStandardMaterial)continue;seen.add(material);const previous=material.onBeforeCompile,cache=material.customProgramCacheKey;worldPatches.push({material,previous,cache});material.onBeforeCompile=function(shader,r){previous.call(this,shader,r);shader.uniforms.uNLFocus=uniforms.uNLFocus;shader.fragmentShader='uniform float uNLFocus;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\nfloat nlLuma=dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));gl_FragColor.rgb=mix(gl_FragColor.rgb,(gl_FragColor.rgb*.72+vec3(nlLuma)*.10),uNLFocus);')};material.customProgramCacheKey=()=>cache.call(material)+'|nl-knowledge-focus-03';material.needsUpdate=true}});
 }
 function knowledgeAtlas(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const x=canvas.getContext('2d');
  for(let tile=0;tile<16;tile++){x.save();x.translate(tile%4*256,Math.floor(tile/4)*256);x.fillStyle='#e9e8d8';x.beginPath();x.roundRect(4,4,248,248,18);x.fill();x.fillStyle='#214c3e';x.beginPath();x.roundRect(4,4,248,51,[18,18,0,0]);x.fill();x.fillStyle='#e8ecd7';x.font='500 17px system-ui';x.fillText(categoryNames[tile].toUpperCase(),18,37,220);x.strokeStyle='#547d60';x.lineWidth=5;x.lineCap='round';
   if([0,8,10,14].includes(tile)){x.beginPath();x.moveTo(128,169);x.lineTo(128,90);x.stroke();for(const side of [-1,1]){x.fillStyle=side<0?'#5c895a':'#8fa66c';x.beginPath();x.ellipse(128+side*22,118,17,34,side*.7,0,Math.PI*2);x.fill()}if(tile===8){x.fillStyle='#d3a05b';for(let j=0;j<3;j++){x.beginPath();x.arc(95+j*30,158,10,0,Math.PI*2);x.fill()}}}
   else if(tile===1){for(let j=0;j<3;j++){x.beginPath();x.moveTo(32,100+j*25);for(let i=0;i<9;i++)x.lineTo(32+i*24,100+j*25+Math.sin(i*1.4)*9);x.stroke()}}
   else if([2,9].includes(tile)){x.beginPath();x.moveTo(128,77);x.lineTo(128,160);for(let j=0;j<6;j++){x.moveTo(128,105+j*9);x.lineTo(128+(j%2?-1:1)*(24+j*4),140+j*5)}x.stroke();x.strokeStyle='#b49b71';for(let j=0;j<3;j++){x.beginPath();x.moveTo(28,180+j*13);x.lineTo(228,180+j*13);x.stroke()}}
   else{for(let j=0;j<7;j++){const a=j/7*Math.PI*2,px=128+Math.cos(a)*57,py=128+Math.sin(a)*48;x.beginPath();x.moveTo(128,128);x.lineTo(px,py);x.stroke();x.fillStyle=['#84ab8f','#bbbf83','#83b8ba'][j%3];x.beginPath();x.arc(px,py,11,0,Math.PI*2);x.fill()}}
   x.fillStyle='#83977b';for(let j=0;j<3;j++){x.fillRect(23,206+j*11,166-j*22,4)}x.fillStyle='#c7ad73';x.fillRect(209,207,17,25);x.restore();
  }const texture=ownTexture(new T.CanvasTexture(canvas));texture.colorSpace=T.SRGBColorSpace;return texture;
 }
 let planner,orbMesh,microMesh,readyPromise,selectedUntil=0,disposed=false,presentationManual=false;const routes=[],signalCurves=[];
 async function build(){
  const began=performance.now();status.textContent='Tracing the living landscape…';await yieldFrame();planner=createKnowledgeRoutePlanner(api);await yieldFrame();
  const {coord,nearest,waterAt,bedAt,openingDistance,search}=planner,stations=[],seeded=new Set(),center=new T.Vector3(.125,0,-.2416666783);
  const addStation=(record)=>{const id=record.id;if(seeded.has(id))return;let grid;try{grid=nearest(record.seed)}catch{return}const q=coord(grid);seeded.add(id);stations.push({...record,grid,position:[q.x,terrainSampler(q.x,q.z,0),q.z],start:record.start??.15,style:report.styles[stations.length%3]})};
  const areaNames={R3:'Canopy ridge',R4:'Fern forest',R5:'Forest regeneration',C3:'Broadleaf canopy',C4:'Seasonal woodland',C5:'Woodland soil',W3:'Reed margin',W4:'Shallow lagoon',W5:'Floodplain habitat',F3:'Rice & vine terraces',F4:'Mature food forest',F5:'Storage lakes',M3:'Pollinator meadow',M4:'Grassland habitat',M5:'Sheltered meadow'};
  // Twenty readable inner-ring places. Data threads connect across the landscape;
  // physical walking paths still take supported, terrain-following routes.
  const ring=[];for(let n=0;n<20;n++){const i=Math.floor(n/20*720),q=new T.Vector3(...payload.openingGuide.top[i]),out=q.clone().sub(center).setY(0).normalize(),seed=q.clone().addScaledVector(out,.13),family=['R','C','W','F','M'][Math.floor(i/144)],id='inner-'+n;addStation({id,family,kind:'inner-ring',name:families[family].name+' · '+['Canopy','Water edge','Living soil','Plant community'][n%4],seed:[seed.x,seed.z],start:.035+n/20*.20,guideIndex:i});if(stations.at(-1)?.id===id)ring.push(id)}
  for(const mesh of pieces.values()){const id=mesh.userData.piece_id;if(!areaNames[id])continue;const box=new T.Box3().setFromObject(mesh),p=box.getCenter(new T.Vector3());addStation({id:'area-'+id,family:id[0],kind:'biome-area',name:areaNames[id],seed:[p.x,p.z],start:.25+stations.length*.003})}
  // A walkable side of every swale, with its own Totem and seven small plant,
  // soil and water orbs. Their curves are the actual production contours.
  for(let row=0;row<payload.foodContours.length;row++){const curve=new T.CatmullRomCurve3(payload.foodContours[row].map(p=>new T.Vector3(...p))),points=[];for(let j=0;j<=90;j++){const t=j/90,p=curve.getPoint(t),d=curve.getTangent(t),side=new T.Vector3(-d.z,0,d.x).normalize();p.addScaledVector(side,.043);p.y=terrainSampler(p.x,p.z,NaN);if(Number.isFinite(p.y))points.push(p)}if(points.length<20)continue;const id='swale-'+row,p=points[Math.floor(points.length*.82)];addStation({id,family:'F',kind:'swale',name:'Swale '+String(row+1).padStart(2,'0')+' · edible guilds',seed:[p.x,p.z],start:.10+row*.022,row});const station=stations.find(s=>s.id===id);if(station){station.position=p.toArray();routes.push({id:'walk-'+id,from:id,to:id,kind:'swale-contour',points,start:station.start});report.swales.push({row,station:id,path:'walk-'+id});}}
  for(const [i,p]of [{x:.465,z:1.203},{x:.426,z:1.438},{x:.595,z:1.661}].entries())addStation({id:'lake-'+i,family:'F',kind:'lake-edge',name:['Lower storage · productive slopes','Middle lake · water & habitat','Upper storage · catchment'][i],seed:[p.x+.15,p.z+.015],start:.34+i*.025});
  report.stations=stations;
  const byId=new Map(stations.map(s=>[s.id,s])),edges=new Set(),wanted=[];
  const want=(a,b,kind)=>{if(a===b||!byId.has(a)||!byId.has(b))return;const key=[a,b].sort().join('|');if(edges.has(key))return;edges.add(key);wanted.push({a,b,kind})};
  for(let i=0;i<ring.length;i++)want(ring[i],ring[(i+1)%ring.length],'inner-ring');
  for(const station of stations){const others=stations.filter(s=>s!==station).map(s=>({s,d:Math.hypot(s.position[0]-station.position[0],s.position[2]-station.position[2])})).sort((a,b)=>a.d-b.d);for(const {s}of others.slice(0,station.kind==='inner-ring'?3:2))want(station.id,s.id,'branch')}
  for(let row=1;row<payload.foodContours.length;row++)want('swale-'+row,'swale-'+(row-1),'swale-access');
  // Build in batches so preparation paints and camera/wildlife keep updating.
  for(let n=0;n<wanted.length;n++){const {a,b,kind}=wanted[n],from=byId.get(a),to=byId.get(b);try{const ids=search(from.grid,to.grid),points=[];for(let i=0;i<ids.length;i++){const q=coord(ids[i]),p=new T.Vector3(q.x,terrainSampler(q.x,q.z,0),q.z);if(i){const prev=points.at(-1),count=Math.ceil(prev.clone().setY(0).distanceTo(p.clone().setY(0))/.007);for(let j=1;j<count;j++){const q=prev.clone().lerp(p,j/count);q.y=terrainSampler(q.x,q.z,q.y);points.push(q)}}points.push(p)}routes.push({id:a+'--'+b,from:a,to:b,kind,points,start:Math.min(from.start,to.start)});report.network.push({from:a,to:b,kind,walking:true})}catch{report.network.push({from:a,to:b,kind,walking:false});report.unconnected.push({from:a,to:b,physicalPath:false,knowledgeLink:true})}if(n%5===0){status.textContent='Connecting places · '+Math.round(n/wanted.length*100)+'%';await yieldFrame()}}
  // Local side lanes link every row at both ends, yielding a visibly layered
  // productive walking network rather than a single line beside the food area.
  const swaleRoutes=routes.filter(r=>r.kind==='swale-contour');for(let i=1;i<swaleRoutes.length;i++)for(const end of [0,1]){const a=swaleRoutes[i-1],b=swaleRoutes[i],p=end?a.points.at(-1):a.points[0],q=end?b.points.at(-1):b.points[0],points=[];for(let j=0;j<=20;j++){const v=p.clone().lerp(q,j/20);v.y=terrainSampler(v.x,v.z,NaN);if(Number.isFinite(v.y))points.push(v)}if(points.length===21)routes.push({id:'swale-side-'+i+'-'+end,from:a.from,to:b.from,kind:'swale-side-access',points,start:Math.min(a.start,b.start)})}
  const pointCandidates=[];for(const station of stations){const family=families[station.family],count=station.kind==='swale'?7:station.kind==='inner-ring'?5:station.kind==='lake-edge'?5:3,swale=routes.find(r=>r.id==='walk-'+station.id);for(let i=0;i<count;i++){
   let p;if(swale){const at=Math.floor((.08+i/(count-1)*.84)*(swale.points.length-1)),q=swale.points[at],t=swale.points[Math.min(swale.points.length-1,at+2)].clone().sub(swale.points[Math.max(0,at-2)]).normalize();p=q.clone().add(new T.Vector3(-t.z,0,t.x).multiplyScalar(i%2?.018:-.020))}else{const angle=i/count*Math.PI*2+station.grid*.01,radius=station.kind==='inner-ring'?.044:.061;p=new T.Vector3(station.position[0]+Math.cos(angle)*radius,0,station.position[2]+Math.sin(angle)*radius)}
   const h=terrainSampler(p.x,p.z,NaN);if(!Number.isFinite(h)||openingDistance(p.x,p.z)<.025)continue;p.y=Math.max(h,waterAt(p.x,p.z))+(.028+(i%3)*.008);const id=station.id+'-knowledge-'+i,category=family.categories[i%family.categories.length],record={id,station:station.id,family:station.family,position:p.toArray(),ground:h,category:categoryNames[category],categoryIndex:category,start:station.start+.035+i*.008,phase:(pointCandidates.length*.381966)%1,size:station.kind==='inner-ring'?.0052:.0043};pointCandidates.push(record);
  }}report.points=pointCandidates;
  status.textContent='Preparing the knowledge mesh…';await yieldFrame();
  buildPaths();buildTotems();buildOrbs();buildMicroPimos();buildSignals();prepareClearance();focusLandscape();
  report.paths=routes.length;report.buildMilliseconds=Math.round(performance.now()-began);root.traverse(o=>{if(!o.isMesh)return;report.batches++;report.triangles+=(o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3)*(o.isInstancedMesh?o.count:1)});state.built=true;
 }
 function buildPaths(){
  const positions=[],indices=[],starts=[],drawn=new Set();for(const route of routes){const begin=positions.length/3,points=route.points;report.routeRanges.push([report.route.length,report.route.length+points.length-1]);report.route.push(...points.map(p=>p.toArray()));for(let i=0;i<points.length;i++){const p=points[i],t=points[Math.min(i+1,points.length-1)].clone().sub(points[Math.max(i-1,0)]).setY(0).normalize(),side=new T.Vector3(-t.z,0,t.x),half=route.kind==='swale-contour'?.005:.006;for(const sign of [-1,1]){const q=p.clone().addScaledVector(side,half*sign);q.y=terrainSampler(q.x,q.z,p.y)+.0016;positions.push(...q.toArray());starts.push(route.start+i/points.length*.14)}if(i){const a=points[i-1],key=[a.x.toFixed(4)+','+a.z.toFixed(4),p.x.toFixed(4)+','+p.z.toFixed(4)].sort().join('|');if(drawn.has(key))continue;drawn.add(key);const k=begin+(i-1)*2;indices.push(k,k+2,k+1,k+1,k+2,k+3)}}}
  const g=ownGeometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('aNLGrow',new T.Float32BufferAttribute(starts,1));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();const material=growthMaterial(new T.MeshStandardMaterial({name:'NL / connected natural footpaths',color:0xb0a37a,roughness:1,transparent:true,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})),mesh=new T.Mesh(g,material);mesh.name='Nourishland / paths through every swale and biome area';mesh.userData.role='nl_path';mesh.receiveShadow=true;root.add(mesh);
 }
 function labelAtlas(){const c=document.createElement('canvas');c.width=c.height=2048;const x=c.getContext('2d');report.stations.forEach((s,i)=>{const col=i%4,row=Math.floor(i/4),family=families[s.family];x.save();x.translate(col*512,row*128);x.fillStyle='#dfdfc7';x.fillRect(0,0,512,128);x.fillStyle='#214c3e';x.fillRect(0,0,512,34);x.fillStyle='#e9ecd7';x.font='17px system-ui';x.fillText('NOURISHLAND · '+family.name.toUpperCase(),15,24,480);x.fillStyle='#244e3f';x.font='500 27px system-ui';x.fillText(s.name.split(' · ')[0],15,76,480);x.fillStyle='#718066';x.font='17px system-ui';x.fillText('Plants · Soil · Water · Habitat',15,110,480);x.restore()});const t=ownTexture(new T.CanvasTexture(c));t.colorSpace=T.SRGBColorSpace;return t}
 function buildTotems(){
  const atlas=labelAtlas(),q=new T.Quaternion(),axis=new T.Vector3(0,1,0),m=new T.Matrix4();
  for(const style of report.styles){const data=createTotemSculptureGeometry(14,12,style),g=ownGeometry(new T.BufferGeometry()),p=[],n=[];for(let i=0;i<data.vertices.length;i+=8){p.push(...data.vertices.slice(i,i+3));n.push(...data.vertices.slice(i+3,i+6))}g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setIndex(Array.from(data.indices));const stations=report.stations.filter(s=>s.style===style);g.setAttribute('aNLGrow',new T.InstancedBufferAttribute(new Float32Array(stations.map(s=>s.start+.05)),1));const mesh=new T.InstancedMesh(g,growthMaterial(new T.MeshStandardMaterial({name:'NL / '+style+' natural Totems',color:0xbda374,roughness:.93,transparent:true})),stations.length);stations.forEach((s,i)=>{const [x,y,z]=s.position,q=new T.Quaternion().setFromAxisAngle(axis,Math.atan2(camera.position.x-x,camera.position.z-z));m.compose(new T.Vector3(x,y+.036,z),q,new T.Vector3(.0065,.036,.0065));mesh.setMatrixAt(i,m)});mesh.computeBoundingSphere();mesh.userData={role:'nl_totem',style};mesh.name='Nourishland / '+style+' Totems';mesh.castShadow=true;root.add(mesh)}
  const boards=[];report.stations.forEach((s,i)=>{const [x,y,z]=s.position,yaw=Math.atan2(camera.position.x-x,camera.position.z-z);boards.push({station:s,index:i,p:new T.Vector3(x+.011*Math.cos(yaw),y+.056,z-.011*Math.sin(yaw)),yaw,scale:new T.Vector3(.038,.014,.0018)});const neighbors=report.network.filter(r=>r.from===s.id||r.to===s.id).map(r=>report.stations.find(t=>t.id===(r.from===s.id?r.to:r.from))).filter(Boolean).slice(0,2);for(const [j,to]of neighbors.entries()){const d=new T.Vector3(to.position[0]-x,0,to.position[2]-z).normalize(),yaw=Math.atan2(d.x,d.z);boards.push({station:s,index:report.stations.indexOf(to),p:new T.Vector3(x+d.x*.012,y+.038-j*.011,z+d.z*.012),yaw,scale:new T.Vector3(.032,.009,.0015)})}});
  const g=ownGeometry(new T.BoxGeometry(1,1,1));g.setAttribute('aNLGrow',new T.InstancedBufferAttribute(new Float32Array(boards.map(b=>b.station.start+.07)),1));g.setAttribute('aNLLabel',new T.InstancedBufferAttribute(new Float32Array(boards.map(b=>b.index)),1));const mat=new T.MeshBasicMaterial({name:'NL / attached place & path signs',map:atlas,transparent:true}),previous=mat.onBeforeCompile;mat.onBeforeCompile=function(shader,r){previous.call(this,shader,r);shader.vertexShader='attribute float aNLLabel;varying float vNLLabel;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNLLabel=aNLLabel;');shader.fragmentShader='varying float vNLLabel;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','vec2 nlUV=vec2((mod(vNLLabel,4.0)+vMapUv.x)/4.0,1.0-(floor(vNLLabel/4.0)+1.0-vMapUv.y)/16.0);diffuseColor*=texture2D(map,nlUV);')};mat.customProgramCacheKey=()=> 'nl-place-sign-atlas-03';const material=growthMaterial(mat),mesh=new T.InstancedMesh(g,material,boards.length);boards.forEach((b,i)=>mesh.setMatrixAt(i,m.compose(b.p,q.setFromAxisAngle(axis,b.yaw),b.scale)));mesh.computeBoundingSphere();mesh.userData.role='nl_direction_sign';mesh.name='Nourishland / place plaques and wayfinding';root.add(mesh);report.directionSigns=boards.length;
 }
 const pulseGLSL='float nlOpen(float phase){return smoothstep(.06,.18,phase)*(1.0-smoothstep(.36,.49,phase));}\n';
 function buildOrbs(){
  const source=createLivingSphereGeometry('low'),pos=[],norm=[],axis=[],colors=[],indices=[],sourcePerCell=source.vertices.length/10/12,n=sourcePerCell/8;
  // Keep the actual twelve-cell silhouette. Small distant orbs need only three
  // radial rings and ten perimeter samples instead of the full close-up mesh.
  for(let cell=0;cell<12;cell++){const base=pos.length/3;for(const r of [0,3,5,7])for(let j=0;j<n;j+=4){const at=(cell*sourcePerCell+r*n+j)*10;pos.push(...source.vertices.slice(at,at+3));norm.push(...source.vertices.slice(at+3,at+6));axis.push(...source.vertices.slice(at+6,at+9));const c=new T.Color([0xf2ead1,0xdcd1ad,0xb8c49a][cell%3]);colors.push(c.r,c.g,c.b)}const count=n/4;for(let r=0;r<3;r++)for(let j=0;j<count;j++){const a=base+r*count+j,b=base+r*count+(j+1)%count,c=a+count,d=b+count;if(r)indices.push(a,c,b);indices.push(b,c,d)}}
  const g=ownGeometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('aNLCellAxis',new T.Float32BufferAttribute(axis,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('aNLStart',new T.InstancedBufferAttribute(new Float32Array(report.points.map(p=>p.start)),1));g.setAttribute('aNLPhase',new T.InstancedBufferAttribute(new Float32Array(report.points.map(p=>p.phase)),1));g.setIndex(indices);g.computeBoundingSphere();g.boundingSphere.radius*=2.4;
  const mat=ownMaterial(new T.MeshStandardMaterial({name:'NL / diverse porcelain Living orbs',vertexColors:true,roughness:.85,metalness:0,emissive:0x5e7753,emissiveIntensity:.36,transparent:true,depthTest:false,depthWrite:false}));mat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='attribute vec3 aNLCellAxis;attribute float aNLStart;attribute float aNLPhase;uniform float uNLGrowth;uniform float uNLTime;varying float vNLShow;\n'+pulseGLSL+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNLShow=smoothstep(aNLStart,aNLStart+.10,uNLGrowth);transformed+=aNLCellAxis*nlOpen(fract(uNLTime/12.0+aNLPhase))*1.25;transformed*=vNLShow;');shader.fragmentShader='uniform float uNLAlpha;varying float vNLShow;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\ndiffuseColor.a*=uNLAlpha*vNLShow;')};mat.customProgramCacheKey=()=> 'nl-knowledge-living-orbs-03';orbMesh=new T.InstancedMesh(g,mat,report.points.length);orbMesh.name='Nourishland / distributed plant & place orbs';orbMesh.userData={role:'nl_orb',ids:report.points.map(p=>p.id)};orbMesh.renderOrder=32;const m=new T.Matrix4();report.points.forEach((p,i)=>{m.compose(new T.Vector3(...p.position),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),i*.9),new T.Vector3().setScalar(p.size));orbMesh.setMatrixAt(i,m);const c=new T.Color(families[p.family].color).offsetHSL((i%3-1)*.025,0,(i%2)*.035);orbMesh.setColorAt(i,c);p.color='#'+c.getHexString()});orbMesh.computeBoundingSphere();root.add(orbMesh);report.orbTriangles=indices.length/3;report.orbCount=report.points.length;
 }
 function buildMicroPimos(){
  const g=ownGeometry(new T.InstancedBufferGeometry()),base=new T.PlaneGeometry(1,1);g.index=base.index.clone();g.setAttribute('position',base.attributes.position.clone());g.setAttribute('uv',base.attributes.uv.clone());base.dispose();const origins=[],offsets=[],sizes=[],phases=[],starts=[],tiles=[],colors=[];
  for(const point of report.points)for(let cell=0;cell<7;cell++){const category=cell?families[point.family].categories[(cell-1)%6]:point.categoryIndex,angle=(cell-1)/6*Math.PI*2,offset=cell?[Math.cos(angle)*.020,Math.sin(angle)*.014]:[0,0];origins.push(...point.position);offsets.push(...offset);sizes.push(...(cell?[.013,.0095]:[.020,.015]));phases.push(point.phase);starts.push(point.start+.07);tiles.push(category);const c=new T.Color(families[point.family].color);colors.push(c.r,c.g,c.b)}
  const attr=(name,array,size)=>g.setAttribute(name,new T.InstancedBufferAttribute(new Float32Array(array),size));attr('aNLOrigin',origins,3);attr('aNLOffset',offsets,2);attr('aNLSize',sizes,2);attr('aNLPhase',phases,1);attr('aNLStart',starts,1);attr('aNLTile',tiles,1);attr('aNLColor',colors,3);g.instanceCount=tiles.length;
  const mat=ownMaterial(new T.ShaderMaterial({name:'NL / micro PIMO knowledge constellations',uniforms:{...uniforms,uAtlas:{value:knowledgeAtlas()}},transparent:true,depthTest:false,depthWrite:false,vertexShader:`attribute vec3 aNLOrigin;attribute vec2 aNLOffset;attribute vec2 aNLSize;attribute float aNLPhase;attribute float aNLStart;attribute float aNLTile;attribute vec3 aNLColor;uniform float uNLGrowth;uniform float uNLTime;varying vec2 vUV;varying float vTile;varying float vShow;varying vec3 vColor;${pulseGLSL}void main(){float open=nlOpen(fract(uNLTime/12.0+aNLPhase)),grown=smoothstep(aNLStart,aNLStart+.10,uNLGrowth);vShow=open*grown;vUV=uv;vTile=aNLTile;vColor=aNLColor;vec4 p=modelViewMatrix*vec4(aNLOrigin,1.0);p.xy+=vec2(0.0,.035+open*.006)+(aNLOffset+position.xy*aNLSize)*open;p.z+=.001;gl_Position=projectionMatrix*p;}`,fragmentShader:'uniform sampler2D uAtlas;uniform float uNLAlpha;varying vec2 vUV;varying float vTile;varying float vShow;varying vec3 vColor;void main(){if(vShow<.005)discard;vec2 at=vec2((mod(vTile,4.0)+vUV.x)/4.0,1.0-(floor(vTile/4.0)+1.0-vUV.y)/4.0);vec4 color=texture2D(uAtlas,at);gl_FragColor=vec4(color.rgb*mix(vec3(1.0),vColor,.09),color.a*vShow*uNLAlpha*.90);}' }));microMesh=new T.Mesh(g,mat);microMesh.name='Nourishland / micro PIMOs above the orbs';microMesh.userData.role='nl_micro_pimo';microMesh.frustumCulled=false;microMesh.renderOrder=34;root.add(microMesh);report.microPimoPanels=tiles.length;
 }
 function buildSignals(){
  const positions=[],indices=[],colors=[],starts=[],progress=[];
  function tube(points,color,start,radius=.0010){if(points.length<2)return;const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,Math.max(8,Math.min(72,Math.ceil(curve.getLength()/.018))),radius,3,false),p=g.attributes.position,uv=g.attributes.uv,ix=g.index,offset=positions.length/3,c=new T.Color(color);for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));progress.push(uv.getX(i));starts.push(start+uv.getX(i)*.12);colors.push(c.r,c.g,c.b)}for(const i of ix.array)indices.push(i+offset);g.dispose();report.knowledgeLinks++}
  for(const route of routes){const points=route.points.filter((_,i)=>i%4===0).map(p=>p.clone().add(new T.Vector3(0,.007,0)));if(points.length>1)tube(points,0xddd6a5,route.start,.0011)}
  const stations=new Map(report.stations.map(s=>[s.id,s]));for(const link of report.network){const a=stations.get(link.from),b=stations.get(link.to),p=new T.Vector3(...a.position).add(new T.Vector3(0,.052,0)),q=new T.Vector3(...b.position).add(new T.Vector3(0,.052,0));if(!link.walking||link.kind==='inner-ring'){const mid=p.clone().lerp(q,.5);mid.y+=Math.min(.10,p.distanceTo(q)*.14);tube([p,mid,q],families[a.family].color,Math.min(a.start,b.start)+.06,.0008)}}
  for(const point of report.points){const station=stations.get(point.station),from=new T.Vector3(...station.position).add(new T.Vector3(0,.048,0)),to=new T.Vector3(...point.position),mid=from.clone().lerp(to,.5);mid.y+=.02;tube([from,mid,to],families[point.family].color,point.start,.00065);const group=report.points.filter(p=>p.station===point.station),at=group.indexOf(point),next=group[(at+1)%group.length];if(at%2===0&&next!==point){const q=new T.Vector3(...next.position),mid=to.clone().lerp(q,.5);mid.y+=.018;tube([to,mid,q],families[point.family].color,point.start+.03,.00055)}}
  const g=ownGeometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('aNLStart',new T.Float32BufferAttribute(starts,1));g.setAttribute('aNLProgress',new T.Float32BufferAttribute(progress,1));g.setIndex(indices);g.computeBoundingSphere();const material=ownMaterial(new T.ShaderMaterial({name:'NL / growing knowledge filaments',uniforms,transparent:true,depthWrite:false,depthTest:false,vertexShader:'attribute vec3 color;attribute float aNLStart;attribute float aNLProgress;varying vec3 vColor;varying float vStart;varying float vProgress;void main(){vColor=color;vStart=aNLStart;vProgress=aNLProgress;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform float uNLGrowth;uniform float uNLTime;uniform float uNLAlpha;varying vec3 vColor;varying float vStart;varying float vProgress;void main(){float grow=smoothstep(vStart,vStart+.04,uNLGrowth),wave=pow(.5+.5*sin((vProgress*4.0-uNLTime/6.0)*6.2831853),12.0);float alpha=grow*uNLAlpha*(.30+wave*.50);if(alpha<.002)discard;gl_FragColor=vec4(mix(vColor,vec3(1.0),wave*.25),alpha);}'})),mesh=new T.Mesh(g,material);mesh.name='Nourishland / visible hidden-knowledge mesh';mesh.userData.role='nl_knowledge_mesh';mesh.renderOrder=31;root.add(mesh);report.signalTriangles=indices.length/3;
 }
 function prepareClearance(){
  const bins=new Map();for(const r of routes)for(const p of r.points){const key=Math.floor(p.x/.04)+','+Math.floor(p.z/.04);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(p)}const matrix=new T.Matrix4(),p=new T.Vector3(),scale=new T.Vector3();scene.traverse(mesh=>{if(!mesh.isInstancedMesh||!['vegetation','inner_biome_planting','wetland_reed'].includes(mesh.userData.role)||/rice|grape/.test(mesh.name))return;mesh.geometry.computeBoundingBox();const height=mesh.geometry.boundingBox.max.y-mesh.geometry.boundingBox.min.y,records=[];for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);if(Math.abs(matrix.determinant())<1e-18)continue;scale.setFromMatrixScale(matrix);if(height*Math.abs(scale.y)>.055)continue;p.setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld);const x=Math.floor(p.x/.04),z=Math.floor(p.z/.04);let near=false;for(let dx=-1;dx<=1&&!near;dx++)for(let dz=-1;dz<=1&&!near;dz++)for(const q of bins.get(x+dx+','+(z+dz))||[])if(Math.hypot(q.x-p.x,q.z-p.z)<.010){near=true;break}if(near)records.push({i,matrix:matrix.clone()})}if(records.length){clearance.push({mesh,records});report.hiddenGroundPlants+=records.length}});
 }
 let previousClear=-1;function clearPlants(alpha){const value=T.MathUtils.smoothstep(alpha,0,.24);if(Math.abs(value-previousClear)<.0001)return;previousClear=value;const m=new T.Matrix4(),s=new T.Vector3().setScalar(1-value);for(const {mesh,records}of clearance){for(const r of records)mesh.setMatrixAt(r.i,m.copy(r.matrix).scale(s));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}}
 async function setVisible(on){presentationManual=false;state.visible=!!on;toggle.setAttribute('aria-checked',String(state.visible));if(on&&!state.built){if(!readyPromise){state.busy=true;toggle.disabled=true;readyPromise=build().catch(error=>{state.error=error.message;state.visible=false;toggle.setAttribute('aria-checked','false');status.textContent='Could not prepare the layer.';throw error}).finally(()=>{state.busy=false;toggle.disabled=false})}await readyPromise}if(disposed||!state.built)return;if(state.visible){state.growth=0;root.visible=true;status.textContent='Revealing the hidden knowledge…'}else status.textContent='';if(reduced()){state.growth=on?1:0;state.alpha=on?1:0;updateUniforms();clearPlants(state.alpha);root.visible=on;status.textContent=''}requestRender();return report}
 function updateUniforms(){uniforms.uNLGrowth.value=state.growth;uniforms.uNLAlpha.value=state.alpha;uniforms.uNLFocus.value=state.alpha;uniforms.uNLTime.value=state.time}
 function tick(dt){if(disposed||!state.built||presentationManual)return false;dt=Math.min(.1,Math.max(0,dt));const target=state.visible?1:0;state.alpha=T.MathUtils.clamp(state.alpha+(target>state.alpha?dt/.85:target<state.alpha?-dt/.85:0),0,1);if(state.visible){state.growth=reduced()?1:Math.min(1,state.growth+dt/report.growthSeconds);if(!reduced())state.time=(state.time+dt)%24;status.textContent=state.growth<1?'Knowledge mesh · '+Math.round(state.growth*100)+'%':''}root.visible=state.alpha>.001;clearPlants(Math.min(state.alpha,state.growth*5));updateUniforms();if(state.highlight&&state.time>selectedUntil)state.highlight=null;return root.visible}
 function select(id){const point=report.points.find(p=>p.id===id);if(!point||!state.visible)return false;state.highlight=id;selectedUntil=state.time+2;point.phase=.15-state.time/12;orbMesh.geometry.attributes.aNLPhase.setX(report.points.indexOf(point),point.phase);orbMesh.geometry.attributes.aNLPhase.needsUpdate=true;return true}
 toggle.onclick=()=>setVisible(!state.visible).catch(()=>{});
 const controller={root,report,setVisible,select,tick,get state(){return {...state}},setTime(t,growth=1){state.time=((Number(t)%24)+24)%24;state.growth=T.MathUtils.clamp(growth,0,1);updateUniforms();requestRender()},setPresentation(t,growth=1,alpha=1){presentationManual=true;state.time=((Number(t)%24)+24)%24;state.growth=T.MathUtils.clamp(growth,0,1);state.alpha=T.MathUtils.clamp(alpha,0,1);root.visible=state.alpha>.001;clearPlants(Math.min(state.alpha,state.growth*5));updateUniforms();requestRender()},exportLayout(){return {version:report.version,purpose:report.purpose,stations:report.stations,points:report.points,network:report.network,swales:report.swales,route:report.route,routeRanges:report.routeRanges}},dispose(){disposed=true;clearPlants(0);uniforms.uNLFocus.value=0;for(const {material,previous,cache}of worldPatches){material.onBeforeCompile=previous;material.customProgramCacheKey=cache;material.needsUpdate=true}handlers.forEach(fn=>fn());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());scene.remove(root);ui.remove();css.remove();if(window.heroNourishland===controller)delete window.heroNourishland;requestRender()}};window.heroNourishland=controller;
 if(new URLSearchParams(location.search).get('nl')==='1')setVisible(true).catch(()=>{});return controller;
}

// Local geometry and botanical refinement of the one master world.
// Waterfalls, authored food earthworks and opening coordinates are unchanged.
function createRefinementMarshMaterial(old,ends){
 const mat=old.clone();
 // Keep this small shader closure outside the terrain builder, so a material
 // cannot retain its temporary topology maps and geometry working arrays.
 mat.onBeforeCompile=function(shader,renderer){old.onBeforeCompile.call(this,shader,renderer);shader.vertexShader='varying vec3 vMarshEdge;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMarshEdge=(modelMatrix*vec4(transformed,1.0)).xyz;');shader.fragmentShader='varying vec3 vMarshEdge;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat terminalDistance=min(distance(vMarshEdge.xz,vec2(${ends[0].x},${ends[0].z})),distance(vMarshEdge.xz,vec2(${ends[1].x},${ends[1].z})));diffuseColor.a*=smoothstep(.002,.033,terminalDistance);`)};
 mat.customProgramCacheKey=()=>old.customProgramCacheKey()+'|marsh-end-02';return mat;
}
function clipRefinementBasin(T,mesh,sample){
 const source=mesh.geometry,p=source.attributes.position,ix=source.index,positions=[],indices=[],inverse=mesh.matrixWorld.clone().invert();let clipped=0;
 const clearance=v=>v.y-sample(v.x,v.z,Infinity)-.0004;
 function emit(vertices){let poly=vertices.map(p=>({p,d:clearance(p)})),out=[];if(poly.some(p=>!Number.isFinite(p.d))){clipped++;return}
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if(a.d>=0)out.push(a.p);if((a.d>=0)!==(b.d>=0))out.push(a.p.clone().lerp(b.p,a.d/(a.d-b.d)))}
  if(out.length<3){clipped++;return}const start=positions.length/3;for(const p of out)positions.push(...p.clone().applyMatrix4(inverse).toArray());
  for(let j=1;j<out.length-1;j++){const normal=out[j].clone().sub(out[0]).cross(out[j+1].clone().sub(out[0]));if(normal.lengthSq()<1e-22)continue;indices.push(start,normal.y>=0?start+j:start+j+1,normal.y>=0?start+j+1:start+j)}
 }
 for(let i=0;i<ix.count;i+=3){const [a,b,c]=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix.getX(i+j)).applyMatrix4(mesh.matrixWorld)),ab=a.clone().lerp(b,.5),bc=b.clone().lerp(c,.5),ca=c.clone().lerp(a,.5);emit([a,ab,ca]);emit([ab,b,bc]);emit([ca,bc,c]);emit([ab,bc,ca])}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();mesh.geometry=g;return {old:source,triangles:indices.length/3,clippedSubfaces:clipped};
}
function refineLivingMap(api){
 const started=performance.now();
 const {THREE:T,scene,pieces,payload,requestRender}=api;
 if(window.heroMapRefinement?.undo)window.heroMapRefinement.undo();
 if(window.refinementMaterialTest){window.refinementMaterialTest.forEach(r=>{r.mesh.material.dispose();r.mesh.material=r.mat});delete window.refinementMaterialTest}
 const preview=!!window.heroPuzzle?.inspectionAPI,originalSampler=api.terrainSampler,bin=.04,waterBins=new Map(),nodes=[],byPosition=new Map(),records=[],waterMeshes=[];
 const report={version:'whole-map-refinement-02',terrain:{pieces:0,verticesChanged:0,maxSmoothing:0,maxBedCut:0,addedTriangles:0},water:{meadowConnector:false},planting:{instancesVaried:0,rootsAdjusted:0,bankTufts:0},openingPreserved:true,foodEarthworksPreserved:true};
 const saved=[],added=[],matrix=new T.Matrix4(),point=new T.Vector3(),inverse=new T.Matrix4();
 const hash=(x,z,s=0)=>{const n=Math.sin(x*127.1+z*311.7+s*74.7)*43758.5453;return n-Math.floor(n)};
 function indexWater(mesh){
  const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,n=ix?ix.count:p.count;
  for(let i=0;i<n;i+=3){const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld)),[a,b,c]=vs,den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-12)continue;const tri={vs,den};for(let x=Math.floor((Math.min(a.x,b.x,c.x)-.022)/bin);x<=Math.floor((Math.max(a.x,b.x,c.x)+.022)/bin);x++)for(let z=Math.floor((Math.min(a.z,b.z,c.z)-.022)/bin);z<=Math.floor((Math.max(a.z,b.z,c.z)+.022)/bin);z++){const key=x+','+z;if(!waterBins.has(key))waterBins.set(key,[]);waterBins.get(key).push(tri)}}
 }
 function waterAt(x,z,margin=.022){
  let best=null;for(const {vs:[a,b,c],den}of waterBins.get(Math.floor(x/bin)+','+Math.floor(z/bin))||[]){const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;
   if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001){const h=u*a.y+v*b.y+(1-u-v)*c.y;if(!best||best.distance>0||h<best.h)best={h,distance:0};continue}
   if(best?.distance===0)continue;
   for(const [p,q]of [[a,b],[b,c],[c,a]]){const dx=q.x-p.x,dz=q.z-p.z,length=dx*dx+dz*dz;if(!length)continue;const t=T.MathUtils.clamp(((x-p.x)*dx+(z-p.z)*dz)/length,0,1),d=Math.hypot(x-p.x-dx*t,z-p.z-dz*t);if(d<=margin&&(!best||d<best.distance))best={h:T.MathUtils.lerp(p.y,q.y,t),distance:d}}
  }return best;
 }
 scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.userData.role==='water'&&o.geometry.drawRange.count!==0&&!/^F/.test(o.userData.piece_id||''))waterMeshes.push(o)});
 // Close the measured gap between the two original meadow stream ribbons.
 const upper=waterMeshes.find(o=>o.userData.piece_id==='M4'),lower=waterMeshes.find(o=>o.userData.piece_id==='M2');
 if(upper&&lower){
  const end=(mesh,first)=>{const p=mesh.geometry.attributes.position,n=p.count;return new T.Vector3().fromBufferAttribute(p,first?0:n-2).add(new T.Vector3().fromBufferAttribute(p,first?1:n-1)).multiplyScalar(.5).applyMatrix4(mesh.matrixWorld)};
  const a=end(upper,true),b=end(lower,false),control=[a,a.clone().lerp(b,.30).add(new T.Vector3(-.013,0,.006)),a.clone().lerp(b,.68).add(new T.Vector3(.012,0,-.007)),b],curve=new T.CatmullRomCurve3(control),positions=[],indices=[],steps=48;
  for(let i=0;i<=steps;i++){const t=i/steps,p=curve.getPoint(t),tangent=curve.getTangent(t),side=new T.Vector3(-tangent.z,0,tangent.x).normalize(),halfWidth=T.MathUtils.lerp(.0050,.0057,t);p.y=T.MathUtils.lerp(a.y,b.y,t);for(const sign of [-1,1])positions.push(...p.clone().addScaledVector(side,sign*halfWidth).toArray());if(i){const k=(i-1)*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();const mesh=new T.Mesh(g,upper.material.clone());mesh.name='Meadow / continuous descending stream';mesh.userData={role:'water',piece_id:'M-connected-stream'};mesh.receiveShadow=true;scene.add(mesh);added.push(mesh);waterMeshes.push(mesh);if(api.registerWater)api.registerWater(mesh);else{mesh.material.onBeforeCompile=upper.material.onBeforeCompile;mesh.material.customProgramCacheKey=upper.material.customProgramCacheKey;mesh.material.needsUpdate=true}report.water={meadowConnector:true,length:curve.getLength(),upstream:a.toArray(),downstream:b.toArray(),descending:a.y>b.y,triangles:indices.length/3};
 }
 waterMeshes.forEach(indexWater);
 const guide=payload.openingGuide.top;
 function openingDistance(x,z){let best=Infinity;for(let i=0;i<guide.length;i+=3){const a=guide[i],b=guide[(i+3)%guide.length],dx=b[0]-a[0],dz=b[2]-a[2],den=dx*dx+dz*dz;if(!den)continue;const t=T.MathUtils.clamp(((x-a[0])*dx+(z-a[2])*dz)/den,0,1);best=Math.min(best,Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t))}return best}
 const nodeAt=(p,family)=>{const key=Math.round(p.x*1e6)+','+Math.round(p.z*1e6);let n=byPosition.get(key);if(n===undefined){n=nodes.length;nodes.push({x:p.x,y:p.y,z:p.z,old:p.y,adj:new Set(),locked:false,food:family==='F'});byPosition.set(key,n)}else if(family==='F')nodes[n].food=true;return n};
 // Canonical world-space nodes keep coincident piece boundaries identical.
 for(const mesh of pieces.values()){
  const g=mesh.geometry,p=g.attributes.position,ix=g.index,family=mesh.userData.piece_id[0],map=[],triangles=[],attributes={};for(const [name,a]of Object.entries(g.attributes))attributes[name]={size:a.itemSize,values:Array.from(a.array)};
  for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);map.push(nodeAt(point,family))}
  for(let i=0;i<ix.count;i+=3)triangles.push([ix.getX(i),ix.getX(i+1),ix.getX(i+2)]);records.push({mesh,g,map,triangles,attributes,family,originalCount:ix.count/3});
 }
 const edges=new Map(),keyFor=(a,b)=>a<b?a+','+b:b+','+a;
 for(const r of records)for(const tri of r.triangles)for(let j=0;j<3;j++){const a=r.map[tri[j]],b=r.map[tri[(j+1)%3]],key=keyFor(a,b);if(!edges.has(key))edges.set(key,{a,b,count:0});edges.get(key).count++;nodes[a].adj.add(b);nodes[b].adj.add(a)}
 for(const {a,b,count}of edges.values())if(count===1){const p=nodes[a],q=nodes[b],dx=q.x-p.x,dz=q.z-p.z,length=Math.hypot(dx,dz)||1,x=(p.x+q.x)/2,z=(p.z+q.z)/2,offset=.0035;if(!Number.isFinite(originalSampler(x-dz/length*offset,z+dx/length*offset,NaN))||!Number.isFinite(originalSampler(x+dz/length*offset,z-dx/length*offset,NaN))){nodes[a].locked=true;nodes[b].locked=true}}
 for(const n of nodes)if(n.food||openingDistance(n.x,n.z)<.028)n.locked=true;
 // Subdivide only faces near water. Shared edge midpoints also split adjacent
 // faces, so river-bed repairs do not introduce T-junctions inside a piece.
 const marked=new Set();for(const r of records){if(r.family==='F')continue;for(const tri of r.triangles){const ns=tri.map(i=>nodes[r.map[i]]),x=ns.reduce((s,p)=>s+p.x,0)/3,z=ns.reduce((s,p)=>s+p.z,0)/3;if(waterAt(x,z,.022)||ns.some(p=>waterAt(p.x,p.z,.022)))for(let j=0;j<3;j++)marked.add(keyFor(r.map[tri[j]],r.map[tri[(j+1)%3]]))}}
 const midNodes=new Map();
 for(const r of records){if(r.family==='F')continue;const mids=new Map();
  const middle=(a,b)=>{const key=keyFor(r.map[a],r.map[b]);if(!marked.has(key))return null;if(mids.has(key))return mids.get(key);const p=nodes[r.map[a]],q=nodes[r.map[b]];let global=midNodes.get(key);if(global===undefined){global=nodeAt({x:(p.x+q.x)/2,y:(p.y+q.y)/2,z:(p.z+q.z)/2},r.family);nodes[global].locked=p.locked&&q.locked;nodes[global].food=p.food&&q.food;midNodes.set(key,global)}const local=r.map.length;r.map.push(global);for(const attr of Object.values(r.attributes))for(let k=0;k<attr.size;k++)attr.values.push((attr.values[a*attr.size+k]+attr.values[b*attr.size+k])*.5);mids.set(key,local);return local};
  const refined=[];for(const [a,b,c]of r.triangles){const ab=middle(a,b),bc=middle(b,c),ca=middle(c,a),n=[ab,bc,ca].filter(v=>v!==null).length;if(n===0)refined.push([a,b,c]);else if(n===3)refined.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);else if(n===1){if(ab!==null)refined.push([a,ab,c],[ab,b,c]);else if(bc!==null)refined.push([b,bc,a],[bc,c,a]);else refined.push([c,ca,b],[ca,a,b])}else if(ab===null)refined.push([c,ca,bc],[ca,a,b],[ca,b,bc]);else if(bc===null)refined.push([a,ab,ca],[ab,b,c],[ab,c,ca]);else refined.push([b,bc,ab],[bc,c,a],[bc,a,ab])}r.triangles=refined;
 }
 // Very small height relaxation removes stair noise without flattening hills.
 for(let pass=0;pass<3;pass++){const next=nodes.map(n=>n.y);nodes.forEach((n,i)=>{if(n.locked||n.adj.size<3||waterAt(n.x,n.z,.025))return;let sum=0,w=0;for(const j of n.adj){const q=nodes[j],d=Math.hypot(n.x-q.x,n.z-q.z);if(d<1e-6||Math.abs(q.y-n.y)/d>1.3)continue;const weight=1/d;sum+=q.y*weight;w+=weight}if(w)next[i]=T.MathUtils.clamp(n.y+(sum/w-n.y)*.34,n.old-.0024,n.old+.0024)});nodes.forEach((n,i)=>n.y=next[i])}
 for(const n of nodes){report.terrain.maxSmoothing=Math.max(report.terrain.maxSmoothing,Math.abs(n.y-n.old));if(n.locked)continue;const w=waterAt(n.x,n.z);if(w){const weight=1-T.MathUtils.smoothstep(w.distance,.001,.022),target=w.h-.004;if(n.y>target){const before=n.y;n.y=Math.max(n.old-.038,T.MathUtils.lerp(n.y,target,weight));report.terrain.maxBedCut=Math.max(report.terrain.maxBedCut,before-n.y)}}if(Math.abs(n.y-n.old)>1e-7)report.terrain.verticesChanged++}
 const normalSums=nodes.map(()=>new T.Vector3()),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(const r of records)for(const tri of r.triangles){const ns=tri.map(i=>nodes[r.map[i]]);a.set(ns[0].x,ns[0].y,ns[0].z);b.set(ns[1].x,ns[1].y,ns[1].z);c.set(ns[2].x,ns[2].y,ns[2].z);const normal=b.sub(a).cross(c.sub(a));tri.forEach(i=>normalSums[r.map[i]].add(normal))}normalSums.forEach(n=>n.normalize());
 nodes.forEach(n=>n.adj.clear());for(const r of records)for(const tri of r.triangles)for(let j=0;j<3;j++){const a=r.map[tri[j]],b=r.map[tri[(j+1)%3]];nodes[a].adj.add(b);nodes[b].adj.add(a)}
 // Suppress fine lighting bands while retaining deliberate steep rock faces.
 for(let pass=0;pass<3;pass++){const next=normalSums.map(n=>n.clone());nodes.forEach((n,i)=>{if(n.food||n.locked)return;const sum=normalSums[i].clone().multiplyScalar(2);for(const j of n.adj)if(normalSums[i].dot(normalSums[j])>.90)sum.add(normalSums[j]);next[i].copy(sum).normalize()});next.forEach((n,i)=>normalSums[i].copy(n))}
 for(const r of records){if(r.family==='F')continue;const g=new T.BufferGeometry();inverse.copy(r.mesh.matrixWorld).invert();for(const [name,attr]of Object.entries(r.attributes)){if(name==='normal'||name==='position')continue;g.setAttribute(name,new T.Float32BufferAttribute(attr.values,attr.size))}const positions=[],normals=[],normalMatrix=new T.Matrix3().getNormalMatrix(inverse);for(const id of r.map){const n=nodes[id];point.set(n.x,n.y,n.z).applyMatrix4(inverse);positions.push(...point.toArray());normals.push(...normalSums[id].clone().applyMatrix3(normalMatrix).normalize().toArray())}g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setIndex(r.triangles.flat());g.computeBoundingSphere();g.computeBoundingBox();saved.push({mesh:r.mesh,geometry:r.g});r.mesh.geometry=g;report.terrain.pieces++;report.terrain.addedTriangles+=g.index.count/3-r.originalCount}
 // Rebuild a small sampling index for root alignment and validation.
 const groundBins=new Map(),cell=.06;for(const r of records)for(const tri of r.triangles){const ns=tri.map(i=>nodes[r.map[i]]),[a,b,c]=ns,den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-12)continue;const t={ns,den};for(let x=Math.floor(Math.min(a.x,b.x,c.x)/cell);x<=Math.floor(Math.max(a.x,b.x,c.x)/cell);x++)for(let z=Math.floor(Math.min(a.z,b.z,c.z)/cell);z<=Math.floor(Math.max(a.z,b.z,c.z)/cell);z++){const key=x+','+z;if(!groundBins.has(key))groundBins.set(key,[]);groundBins.get(key).push(t)}}
 function sample(x,z,fallback=NaN){let y=-Infinity;for(const {ns:[a,b,c],den}of groundBins.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)y=Math.max(y,u*a.y+v*b.y+(1-u-v)*c.y)}return Number.isFinite(y)?y:fallback}
 // Coherent root-based variation keeps trunks, crowns and fruit together.
 scene.traverse(mesh=>{if(!mesh.isInstancedMesh||!['vegetation','rim_vegetation','wetland_reed'].includes(mesh.userData.role)||mesh.name.includes('rice tillers'))return;const original=preview?mesh.instanceMatrix.array.slice():null,oldColor=preview?mesh.instanceColor?.array.slice():null;let changed=false;const family=String(mesh.userData.piece_id||'')[0];
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);const old=originalSampler(point.x,point.z,NaN),now=sample(point.x,point.z,NaN),u=hash(point.x,point.z,18),cluster=.5+.5*Math.sin(point.x*11+Math.sin(point.z*9)*1.4);if(Number.isFinite(old)&&Number.isFinite(now)&&Math.abs(now-old)>.00001&&Math.abs(point.y-old)<.04){matrix.elements[13]+=now-old;report.planting.rootsAdjusted++;changed=true}
   if(['R','C','F','M','W'].includes(family)&&mesh.userData.biomeDesign!==true){const h=.92+.16*u,w=.94+.12*cluster;matrix.multiply(new T.Matrix4().makeScale(w,h,w));if(/leaf|foliage|frond|canopy/i.test(mesh.material?.name||'')){const tint=new T.Color().setHSL(.26+.07*cluster,.11+.035*u,.88+.06*u);if(mesh.instanceColor){const existing=new T.Color().fromBufferAttribute(mesh.instanceColor,i);tint.multiply(existing)}mesh.setColorAt(i,tint)}report.planting.instancesVaried++;changed=true}mesh.setMatrixAt(i,matrix)}
  if(changed){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();if(preview)saved.push({mesh,instances:original,color:oldColor})}
 });
 // Let the old oxbow terminate in vegetation, with a shallow soft water edge.
 const oxbow=waterMeshes.find(o=>o.userData.piece_id==='W4'),reedSource=scene.getObjectByName('Wetland reed and sedge shelves');
 if(oxbow&&reedSource){const p=oxbow.geometry.attributes.position,ends=[new T.Vector3().fromBufferAttribute(p,0).add(new T.Vector3().fromBufferAttribute(p,1)).multiplyScalar(.5),new T.Vector3().fromBufferAttribute(p,p.count-2).add(new T.Vector3().fromBufferAttribute(p,p.count-1)).multiplyScalar(.5)].map(p=>p.applyMatrix4(oxbow.matrixWorld));const old=oxbow.material;oxbow.material=createRefinementMarshMaterial(old,ends);saved.push({mesh:oxbow,material:old});
  const plants=[];for(const end of ends)for(let j=0;j<28;j++){const angle=j*2.39996,r=.010+Math.sqrt((j+.5)/28)*.039,x=end.x+Math.cos(angle)*r,z=end.z+Math.sin(angle)*r,h=sample(x,z,NaN);if(!Number.isFinite(h)||Math.abs(h-end.y)>.025)continue;const size=.027+hash(x,z,47)*.020,m=new T.Matrix4().compose(new T.Vector3(x,h,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle),new T.Vector3(size,size,size));plants.push(m)}if(plants.length){const mesh=new T.InstancedMesh(reedSource.geometry.clone(),reedSource.material.clone(),plants.length);plants.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingSphere();mesh.name='Wetlands / softened oxbow reed endings';mesh.userData={role:'wetland_reed',piece_id:'W-oxbow-margins'};mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);added.push(mesh);report.planting.bankTufts=plants.length}
 }
 const basin=waterMeshes.find(o=>o.userData.piece_id==='W-wetland-basin');if(basin){const clipped=clipRefinementBasin(T,basin,sample);saved.push({mesh:basin,geometry:clipped.old});report.water.basinTriangles=clipped.triangles;report.water.shorelineClippedSubfaces=clipped.clippedSubfaces}
 report.terrain.nodeCount=nodes.length;report.terrain.boundaryNodesLocked=nodes.filter(n=>n.locked).length;
 report.buildMilliseconds=Math.round(performance.now()-started);
 const result=preview?{report,sample}:{report};if(preview)result.undo=()=>{for(const r of saved){if(r.geometry){r.mesh.geometry.dispose();r.mesh.geometry=r.geometry}else if(r.material){r.mesh.material.dispose();r.mesh.material=r.material}else if(r.instances){r.mesh.instanceMatrix.array.set(r.instances);r.mesh.instanceMatrix.needsUpdate=true;if(r.color){r.mesh.instanceColor.array.set(r.color);r.mesh.instanceColor.needsUpdate=true}else r.mesh.instanceColor=null;r.mesh.computeBoundingSphere()}}for(const mesh of added){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose()}delete window.heroMapRefinement;requestRender()};else saved.forEach(r=>r.geometry?.dispose());window.heroMapRefinement=result;requestRender();return report;
}

function finishInnerLandscape(api){
 const {THREE:T,scene,pieces,terrainSampler,payload,requestRender,rockWallMesh}=api;if(window.heroInnerFinish)return window.heroInnerFinish;
 const report={version:'inner-rock-02',foodVertices:0,maximumFoodSmoothing:0,wallBottom:-1.04,floorTriangles:0,rootsSettled:0};
 const roots=[],matrix=new T.Matrix4(),origin=new T.Vector3();scene.traverse(mesh=>{if(!mesh.isInstancedMesh||!['vegetation','rim_vegetation'].includes(mesh.userData.role))return;for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);if(Math.abs(matrix.determinant())<1e-18)continue;origin.setFromMatrixPosition(matrix);if(origin.x<-.15||origin.x>.84||origin.z<.15||origin.z>.77)continue;const h=terrainSampler(origin.x,origin.z,NaN);if(Number.isFinite(h)&&Math.abs(h-origin.y)<.05)roots.push({mesh,i,matrix:matrix.clone(),x:origin.x,z:origin.z,ground:h})}});
 // Relax the food/meadow shoulder across shared world-coordinate vertices.
 // The opening lip, water and cultivated earthworks farther uphill are fixed.
 const nodes=new Map(),entries=[],quant=p=>p.x.toFixed(5)+','+p.z.toFixed(5),guides=payload.openingGuide.top;
 function edgeDistance(x,z){let best=Infinity;for(let i=0;i<guides.length;i+=3){const a=guides[i],b=guides[(i+3)%guides.length],dx=b[0]-a[0],dz=b[2]-a[2],n=dx*dx+dz*dz,t=n?T.MathUtils.clamp(((x-a[0])*dx+(z-a[2])*dz)/n,0,1):0;best=Math.min(best,Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz))}return best}
 for(const mesh of pieces.values()){
  if(mesh.userData.role!=='terrain')continue;const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,map=[];
  for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),key=quant(v);let n=nodes.get(key);if(!n){n={x:v.x,z:v.z,y:v.y,next:v.y,neighbours:new Set(),refs:[],weight:0};nodes.set(key,n)}n.refs.push({mesh,at:i});map.push(n);if((/^[FM]/.test(mesh.userData.piece_id||''))&&v.z>.15&&v.z<.77&&v.x>-.15&&v.x<.84){const d=edgeDistance(v.x,v.z),h=Math.min(v.x+.15,.84-v.x,v.z-.15,.77-v.z);n.weight=Math.max(n.weight,T.MathUtils.smoothstep(h,0,.05)*T.MathUtils.smoothstep(d,.008,.035)*(1-T.MathUtils.smoothstep(d,.30,.46)))}}
  for(let i=0;i<ix.count;i+=3){const a=map[ix.getX(i)],b=map[ix.getX(i+1)],c=map[ix.getX(i+2)];for(const [u,v]of [[a,b],[b,c],[c,a]]){if(Math.hypot(u.x-v.x,u.z-v.z)<.07){u.neighbours.add(v);v.neighbours.add(u)}}}entries.push({mesh,map});
 }
 const original=api.terrainSampler;
 for(let pass=0;pass<14;pass++){
  for(const n of nodes.values()){if(!n.weight||n.neighbours.size<3)continue;let y=0,w=0;for(const q of n.neighbours){const d=Math.hypot(n.x-q.x,n.z-q.z);if(d<1e-6)continue;const ww=1/(d+.003);y+=q.y*ww;w+=ww}const base=original(n.x,n.z,n.y);n.next=T.MathUtils.clamp(T.MathUtils.lerp(n.y,y/w,.31*n.weight),base-.018*n.weight,base+.025*n.weight)}
  for(const n of nodes.values())if(n.weight)n.y=n.next;
 }
 const changed=[];for(const n of nodes.values()){if(!n.weight)continue;const old=original(n.x,n.z,n.y),delta=n.y-old;if(Math.abs(delta)<1e-6)continue;changed.push({x:n.x,z:n.z,delta});report.foodVertices+=n.refs.length;report.maximumFoodSmoothing=Math.max(report.maximumFoodSmoothing,Math.abs(delta));for(const {mesh,at}of n.refs){const local=new T.Vector3(n.x,n.y,n.z).applyMatrix4(mesh.matrixWorld.clone().invert());mesh.geometry.attributes.position.setXYZ(at,local.x,local.y,local.z)}}
 for(const {mesh}of entries){mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere()}
 if(api.buildTerrainSampler&&api.getTerrainSampler){api.buildTerrainSampler();const sample=api.getTerrainSampler();for(const r of roots){const now=sample(r.x,r.z,r.ground);r.matrix.elements[13]+=now-r.ground;r.mesh.setMatrixAt(r.i,r.matrix);r.mesh.instanceMatrix.needsUpdate=true;report.rootsSettled++}for(const mesh of new Set(roots.map(r=>r.mesh)))mesh.computeBoundingSphere()}
 // The wall extends below every central-view ray. A closed recessed stone
 // basin prevents the background sky appearing through the bottom of the ring.
 const top=payload.openingGuide.top,centre=new T.Vector3(.125,0,-.2416666783),positions=[],indices=[],depth=[],segments=240,rings=12;
 for(let r=0;r<=rings;r++){const t=.025+r/rings*.975;for(let i=0;i<=segments;i++){const q=top[Math.floor(i/segments*(top.length-1))],x=T.MathUtils.lerp(centre.x,q[0],t*1.18),z=T.MathUtils.lerp(centre.z,q[2],t*1.18),y=-1.08+.08*t*t+.008*Math.sin(x*17)*Math.sin(z*19)*(1-t);positions.push(x,y,z);depth.push(1)}}
 for(let r=0;r<rings;r++)for(let i=0;i<segments;i++){const a=r*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1;indices.push(a,c,b,b,c,d)}
 // Close the tiny central fan without duplicate zero-area pole triangles.
 const center=positions.length/3;positions.push(centre.x,-1.08,centre.z);depth.push(1);for(let i=0;i<segments;i++)indices.push(center,i,i+1);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('aCliffDepth',new T.Float32BufferAttribute(depth,1));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();const floorMaterial=rockWallMesh.material.clone();floorMaterial.onBeforeCompile=rockWallMesh.material.onBeforeCompile;floorMaterial.customProgramCacheKey=rockWallMesh.material.customProgramCacheKey;const floor=new T.Mesh(g,floorMaterial);floor.name='Inner ring / closed eroded rock basin';floor.userData={role:'interior_rock_floor'};floor.receiveShadow=true;scene.add(floor);report.floorTriangles=indices.length/3;
 window.heroInnerFinish=report;requestRender();return report;
}

// Fill the narrow food-sector intrusion in the opening, rather than smoothing
// an unchanged hole. The rest of the opening and all waterfall crests stay fixed.
function repairFoodNotch(api){
 const {THREE:T,scene,pieces,payload,rockWallMesh,requestRender}=api;
 if(window.heroFoodNotch)return window.heroFoodNotch;
 const sample=api.getTerrainSampler(),oldSample=sample,wp=rockWallMesh.geometry.attributes.position,rows=57,start=508,end=544,old=[],edge=[];
 const report={version:'food-notch-01',wallColumns:end-start+1,filledTriangles:0,terrainVertices:0,settledPlants:0};
 const roots=[],matrix=new T.Matrix4(),point=new T.Vector3();
 scene.traverse(mesh=>{if(!mesh.isInstancedMesh||!['vegetation','rim_vegetation','inner_biome_planting'].includes(mesh.userData.role))return;for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);if(Math.abs(matrix.determinant())<1e-18)continue;point.setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld);if(point.x<.03||point.x>.24||point.z<.10||point.z>.48)continue;const h=sample(point.x,point.z,NaN);if(Number.isFinite(h)&&Math.abs(point.y-h)<.06)roots.push({mesh,i,matrix:matrix.clone(),p:point.clone(),h})}});
 for(let i=start;i<=end;i++)old.push(new T.Vector3().fromBufferAttribute(wp,i*rows));
 const a=old[0],b=old.at(-1);
 const smooth=(t)=>t*t*(3-2*t);
 for(let i=0;i<old.length;i++){
  const t=i/(old.length-1),q=old[i],z=T.MathUtils.lerp(a.z,b.z,t)+.004*Math.sin(t*Math.PI),y=T.MathUtils.lerp(a.y,b.y,smooth(t));
  edge.push(new T.Vector3(q.x,y,z));
 }
 function edgeAt(x){let best=0,d=Infinity;for(let i=0;i<edge.length-1;i++){const u=edge[i],v=edge[i+1],t=T.MathUtils.clamp((x-u.x)/(v.x-u.x||1e-9),0,1),dx=Math.abs(x-T.MathUtils.lerp(u.x,v.x,t));if(dx<d){d=dx;best=i}}const u=edge[best],v=edge[best+1],t=T.MathUtils.clamp((x-u.x)/(v.x-u.x||1e-9),0,1);return {y:T.MathUtils.lerp(u.y,v.y,t),z:T.MathUtils.lerp(u.z,v.z,t)}}
 function height(x,z){const e=edgeAt(x),left=sample(.055,z,.11+(z-.15)*.12),right=sample(.215,z,left),soil=T.MathUtils.lerp(left,right,T.MathUtils.clamp((x-.055)/.16,0,1));return T.MathUtils.lerp(e.y,soil,smooth(T.MathUtils.clamp((z-e.z)/.070,0,1)))}
 // Relax only the shoulders adjoining this one intrusion. This applies to all
 // shared references, including the adjacent production piece.
 for(const mesh of pieces.values()){
  if(mesh.userData.role!=='terrain')continue;const p=mesh.geometry.attributes.position,inverse=mesh.matrixWorld.clone().invert();let changed=false;
  for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);const e=edgeAt(point.x),wx=T.MathUtils.smoothstep(point.x,.035,.080)*(1-T.MathUtils.smoothstep(point.x,.175,.225)),wz=T.MathUtils.smoothstep(point.z,e.z-.015,e.z+.012)*(1-T.MathUtils.smoothstep(point.z,.38,.46)),w=wx*wz;if(w<=0)continue;point.y=T.MathUtils.lerp(point.y,height(point.x,point.z),w);point.applyMatrix4(inverse);p.setXYZ(i,point.x,point.y,point.z);report.terrainVertices++;changed=true}
  if(changed){p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere()}
 }
 // Move the complete vertical wall columns, and their crest collar, to the
 // rounded replacement boundary. Filling only the top would leave the old slit.
 for(let i=0;i<old.length;i++){
  const column=start+i,delta=edge[i].clone().sub(old[i]);
  for(let j=0;j<rows;j++){const at=column*rows+j,t=j/(rows-1);wp.setXYZ(at,wp.getX(at)+delta.x,T.MathUtils.lerp(edge[i].y,-1.04,t),wp.getZ(at)+delta.z)}
  const guide=payload.openingGuide.top[column];if(guide){guide[0]+=delta.x;guide[1]+=delta.y;guide[2]+=delta.z}
  for(const collar of scene.children.filter(o=>o.userData.role==='green_rim_collar')){const p=collar.geometry.attributes.position,inward=new T.Vector3(.125-edge[i].x,0,-.2416666783-edge[i].z).normalize();for(let j=0;j<11;j++){const at=column*11+j,t=j/10,offset=T.MathUtils.lerp(-.012,.009,t);if(at>=p.count)continue;p.setXYZ(at,edge[i].x+inward.x*offset,edge[i].y+.002*Math.sin(t*Math.PI)-.010*T.MathUtils.smoothstep(t,.35,1),edge[i].z+inward.z*offset)}p.needsUpdate=true;collar.geometry.computeVertexNormals();collar.geometry.computeBoundingSphere()}
 }
 wp.needsUpdate=true;rockWallMesh.geometry.computeVertexNormals();rockWallMesh.geometry.computeBoundingSphere();
 scene.traverse(mesh=>{if(mesh.userData.role==='puzzle_top'&&mesh.userData.piece_id==='F2')mesh.visible=false});
 const positions=[],indices=[],bands=20;
 for(let i=0;i<old.length;i++)for(let j=0;j<=bands;j++){const t=j/bands,p=edge[i].clone().lerp(old[i],t);p.y=height(p.x,p.z)+.00025;positions.push(...p.toArray())}
 const v0=new T.Vector3(),v1=new T.Vector3(),v2=new T.Vector3();
 function tri(a,b,c){v0.fromArray(positions,a*3);v1.fromArray(positions,b*3).sub(v0);v2.fromArray(positions,c*3).sub(v0);const n=v1.cross(v2);if(n.lengthSq()<1e-20)return;indices.push(a,...(n.y>0?[b,c]:[c,b]))}
 for(let i=0;i<old.length-1;i++)for(let j=0;j<bands;j++){const a=i*(bands+1)+j,b=a+bands+1;tri(a,b,a+1);tri(a+1,b,b+1)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();const source=[...pieces.values()].find(m=>m.userData.piece_id==='F2'&&m.userData.role==='terrain'),material=source.material.clone();material.onBeforeCompile=source.material.onBeforeCompile;material.customProgramCacheKey=source.material.customProgramCacheKey;material.side=T.DoubleSide;
 const cap=new T.Mesh(g,material);cap.name='Food section / continuous rounded ground across former notch';cap.userData={role:'terrain_repair',piece_id:'F2-notch-repair'};cap.receiveShadow=true;scene.add(cap);pieces.set('F2-notch-repair',cap);report.filledTriangles=indices.length/3;report.oldTip=Math.max(...old.map(p=>p.z));report.newTip=Math.max(...edge.map(p=>p.z));
 api.buildTerrainSampler();const updated=api.getTerrainSampler();
 for(const r of roots){const h=updated(r.p.x,r.p.z,r.h);r.matrix.elements[13]+=h-r.h;r.mesh.setMatrixAt(r.i,r.matrix);r.mesh.instanceMatrix.needsUpdate=true;report.settledPlants++}for(const mesh of new Set(roots.map(r=>r.mesh)))mesh.computeBoundingSphere();
 const checks=[];for(let z=.16;z<=.32;z+=.02)for(let x=.108;x<=.138;x+=.01)checks.push({x,z,before:oldSample(x,z,NaN),after:updated(x,z,NaN)});report.samples=checks;report.holesRemaining=checks.filter(p=>!Number.isFinite(p.after)).length;
 window.heroFoodNotch=report;requestRender();return report;
}

const cliffArt={version:'weathered-rock-01',surfaces:0,wallVertices:0,wallTriangles:0};
let rockWallMesh;
let rimProfile;
function getRimProfile(){
 if(rimProfile)return rimProfile;
 const data=atob(payload.cliffRepair.positions),bytes=Uint8Array.from(data,c=>c.charCodeAt(0)),source=new Float32Array(bytes.buffer),points=Array.from({length:720},(_,i)=>new THREE.Vector3().fromArray(source,i*30)),bins=new Map();
 const delta=points.map((p,i)=>{let total=0,weight=0;for(let j=-12;j<=12;j++){const w=Math.exp(-((j/6)**2));total+=points[(i+j+720)%720].y*w;weight+=w}const distance=Math.min(...payload.waterfallOutlets.map(o=>Math.min(Math.abs(i-o.index),720-Math.abs(i-o.index))));return THREE.MathUtils.clamp(total/weight-p.y,-.014,.014)*THREE.MathUtils.smoothstep(distance,5,18)});
 points.forEach((p,i)=>{const key=Math.floor(p.x/.035)+','+Math.floor(p.z/.035);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i)});
 rimProfile={source,points,bins,delta};cliffArt.maximumRimRounding=Math.max(...delta.map(Math.abs));return rimProfile;
}
function rimHeightDeltaAt(x,z){
 const {points,bins,delta}=getRimProfile(),ix=Math.floor(x/.035),iz=Math.floor(z/.035);let distance=.05,index=-1;
 for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const at of bins.get((ix+i)+','+(iz+j))||[]){const p=points[at],d=Math.hypot(x-p.x,z-p.z);if(d<distance){distance=d;index=at}}
 return index<0?0:delta[index]*(1-THREE.MathUtils.smoothstep(distance,.012,.05));
}
const rockGLSL=`
float nlRockHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float nlRockNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(nlRockHash(i),nlRockHash(i+vec3(1,0,0)),f.x),mix(nlRockHash(i+vec3(0,1,0)),nlRockHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(nlRockHash(i+vec3(0,0,1)),nlRockHash(i+vec3(1,0,1)),f.x),mix(nlRockHash(i+vec3(0,1,1)),nlRockHash(i+vec3(1)),f.x),f.y),f.z);}
float nlRockFbm(vec3 p){return .57*nlRockNoise(p)+.28*nlRockNoise(p*2.07+4.1)+.15*nlRockNoise(p*4.13+9.7);}
float nlRockHeight(vec3 p){return .00085*nlRockFbm(p*116.0)+.00025*nlRockNoise(p*470.0);}
vec3 nlRockBump(vec3 p,vec3 n,float h){vec3 px=dFdx(p),py=dFdy(p),r1=cross(py,n),r2=cross(n,px);float det=dot(px,r1);vec3 gradient=sign(det)*(dFdx(h)*r1+dFdy(h)*r2);return normalize(abs(det)*n-gradient);}
`;
function rebuildRockWall(mesh){
 const profile=getRimProfile();
 const old=mesh.geometry.attributes.position,sourceRows=10,columns=old.count/sourceRows-1,rows=57,positions=[],depth=[],indices=[];
 const noise=(a,b)=>{const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)},x=Math.floor(a),y=Math.floor(b),u=THREE.MathUtils.smoothstep(a-x,0,1),v=THREE.MathUtils.smoothstep(b-y,0,1);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(x,y),hash(x+1,y),u),THREE.MathUtils.lerp(hash(x,y+1),hash(x+1,y+1),u),v)};
 for(let i=0;i<=columns;i++)for(let j=0;j<rows;j++){
  const t=j/(rows-1),r=t*(sourceRows-1),a=Math.floor(r),b=Math.min(sourceRows-1,a+1),p=new THREE.Vector3().fromBufferAttribute(old,i*sourceRows+a).lerp(new THREE.Vector3().fromBufferAttribute(old,i*sourceRows+b),r-a);
  const top=new THREE.Vector3().fromBufferAttribute(old,i*sourceRows),column=i%columns,wetland=payload.waterfallOutlets.find(o=>o.piece==='W1').index;
  const arcDistance=(a,b)=>Math.min(Math.abs(a-b),720-Math.abs(a-b)),arch=Math.max(...[-26,26].map(offset=>Math.exp(-((arcDistance(column,(wetland+offset+720)%720)/17)**2))));
  const bottom=-1.04;
  p.y=THREE.MathUtils.lerp(top.y+profile.delta[column],bottom,t);
  const inward=new THREE.Vector3(.125-p.x,0,-.2416666783-p.z).normalize();
  // Rock relief fades to zero at the terrain seam and at the existing lower rim.
  const envelope=THREE.MathUtils.smoothstep(t,0,.10)*(1-THREE.MathUtils.smoothstep(t,.88,1));
  const angle=i/columns*Math.PI*2,relief=((noise(Math.cos(angle)*24+24,t*6+Math.sin(angle)*24)-.5)*.009+(noise(Math.cos(angle)*59+59,t*17+Math.sin(angle)*59)-.5)*.0025)*envelope;
  p.addScaledVector(inward,relief-.003*Math.sin(t*Math.PI));positions.push(...p.toArray());depth.push(t);
 }
 for(let i=0;i<columns;i++)for(let j=0;j<rows-1;j++){const a=i*rows+j;indices.push(a,a+rows,a+1,a+1,a+rows,a+rows+1)}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aCliffDepth',new THREE.Float32BufferAttribute(depth,1));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const normals=geometry.attributes.normal;
 for(let j=0;j<rows;j++){const normal=new THREE.Vector3().fromBufferAttribute(normals,j).add(new THREE.Vector3().fromBufferAttribute(normals,columns*rows+j)).normalize();normals.setXYZ(j,normal.x,normal.y,normal.z);normals.setXYZ(columns*rows+j,normal.x,normal.y,normal.z)}
 let windingReversals=0,degenerateTriangles=0,topSeamError=0;
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),centre=new THREE.Vector3();
 for(let i=0;i<indices.length;i+=3){a.fromArray(positions,indices[i]*3);b.fromArray(positions,indices[i+1]*3);c.fromArray(positions,indices[i+2]*3);normal.copy(b).sub(a).cross(c.clone().sub(a));centre.copy(a).add(b).add(c).multiplyScalar(1/3);if(normal.lengthSq()<1e-22)degenerateTriangles++;if(normal.x*(centre.x-.125)+normal.z*(centre.z+.2416666783)>1e-9)windingReversals++}
 for(let i=0;i<=columns;i++){const expected=new THREE.Vector3().fromBufferAttribute(old,i*sourceRows);expected.y+=profile.delta[i%columns];topSeamError=Math.max(topSeamError,new THREE.Vector3().fromArray(positions,i*rows*3).distanceTo(expected))}
 mesh.geometry=geometry;Object.assign(cliffArt,{wallVertices:positions.length/3,wallTriangles:indices.length/3,windingReversals,degenerateTriangles,topSeamError});
}
function styleGeologicalSurface(mesh){
 const wall=mesh.userData.role==='green_inner_wall',terrain=mesh.userData.role==='terrain',collar=mesh.userData.role==='green_rim_collar';if(!wall&&!terrain&&!collar)return;
 if(wall){rebuildRockWall(mesh);rockWallMesh=mesh}
 if(terrain){const p=mesh.geometry.attributes.position,point=new THREE.Vector3(),inverse=mesh.matrix.clone().invert();let edited=false;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrix);const delta=rimHeightDeltaAt(point.x,point.z);if(delta){point.y+=delta;point.applyMatrix4(inverse);p.setXYZ(i,point.x,point.y,point.z);edited=true}}if(edited){p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere()}}
 if(collar){roundRockCrest(mesh);smoothNormals(mesh.geometry)}
 if(wall||collar)mesh.material=new THREE.MeshStandardMaterial({name:'Weathered stone with moss pockets',roughness:.96,side:THREE.DoubleSide});
 const material=mesh.material;material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vRockWorld;varying vec3 vRockWorldNormal;'+(wall?'attribute float aCliffDepth;varying float vCliffDepth;':'')+'\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRockWorld=(modelMatrix*vec4(transformed,1.0)).xyz;vRockWorldNormal=normalize(mat3(modelMatrix)*objectNormal);'+(wall?'vCliffDepth=aCliffDepth;':''));
  shader.fragmentShader='varying vec3 vRockWorld;varying vec3 vRockWorldNormal;'+(wall?'varying float vCliffDepth;':'')+'\n'+rockGLSL+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float broad=nlRockFbm(vRockWorld*29.0),grain=nlRockFbm(vRockWorld*137.0);
   float joints=nlRockNoise(vec3(vRockWorld.x*118.0,vRockWorld.y*15.0,vRockWorld.z*118.0));
   float seams=smoothstep(.69,.79,joints)*(.30+.70*nlRockNoise(vRockWorld*71.0));
   float strata=nlRockNoise(vec3(vRockWorld.x*21.0,vRockWorld.y*145.0,vRockWorld.z*21.0));
   vec3 stone=mix(vec3(.105,.119,.113),vec3(.245,.237,.207),broad);
   stone=mix(stone,vec3(.29,.239,.175),smoothstep(.63,.88,broad)*.45);
   stone*=.78+.40*grain;stone*=1.0-seams*.48;stone*=.87+.18*strata;
   float damp=smoothstep(.58,.82,nlRockNoise(vec3(vRockWorld.x*48.0,vRockWorld.y*4.0,vRockWorld.z*48.0)));
   stone=mix(stone,stone*vec3(.56,.69,.68),damp*.5);
   float mossPatch=smoothstep(.42,.71,nlRockFbm(vRockWorld*54.0));
   float moss=${wall?'(.12+.62*(1.0-smoothstep(.04,.30,vCliffDepth)))':'smoothstep(.55,.88,abs(vRockWorldNormal.y))*.35'}*mossPatch;
   stone=mix(stone,vec3(.08,.14,.045),moss);
   float rockMask=${wall||collar?'1.0':'(1.0-smoothstep(.36,.72,abs(vRockWorldNormal.y)))*(1.0-smoothstep(.78,1.13,length(vRockWorld.xz-vec2(.125,-.2416666783))))'};
   diffuseColor.rgb=mix(diffuseColor.rgb,stone,rockMask);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=nlRockBump(-vViewPosition,normal,nlRockHeight(vRockWorld)*'+(wall?'1.0':'(1.0-smoothstep(.36,.72,abs(vRockWorldNormal.y)))')+');');
 };
 material.customProgramCacheKey=()=>wall?'nl-weathered-cliff-01':collar?'nl-rounded-rock-lip-01':'nl-steep-terrain-rock-01';material.needsUpdate=true;cliffArt.surfaces++;
 window.heroCliffArt=cliffArt;stage.dataset.cliffArt=cliffArt.version;
}

function roundRockCrest(mesh){
 const data=atob(payload.cliffRepair.positions),bytes=Uint8Array.from(data,c=>c.charCodeAt(0)),p=new Float32Array(bytes.buffer);
 const positions=[],indices=[],columns=721,rows=11;
 for(let i=0;i<columns;i++){
  const top=new THREE.Vector3().fromArray(p,i*30),inward=new THREE.Vector3(.125-top.x,0,-.2416666783-top.z).normalize();top.y+=getRimProfile().delta[i%720];
  for(let j=0;j<rows;j++){const t=j/(rows-1),point=top.clone().addScaledVector(inward,THREE.MathUtils.lerp(-.012,.009,t));point.y+=.002*Math.sin(t*Math.PI)-.010*THREE.MathUtils.smoothstep(t,.35,1);positions.push(...point.toArray())}
 }
 for(let i=0;i<columns-1;i++)for(let j=0;j<rows-1;j++){const a=i*rows+j;indices.push(a,a+rows,a+1,a+1,a+rows,a+rows+1)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();mesh.geometry=g;cliffArt.roundedCrestVertices=positions.length/3;
}

function finalizeCliffCrests(){
 let changed=0,maxCut=0;
 const outlets=payload.waterfallOutlets.map(o=>{const p=wallPositionAt(o,Infinity),up=new THREE.Vector3(...o.waterpoint),into=new THREE.Vector3(.125-p.x,0,-.2416666783-p.z).normalize();return {p,up,end:p.clone().addScaledVector(into,.015),level:Math.min(p.y,up.y),width:/^W/.test(o.piece)?.068:.022}});
 scene.updateMatrixWorld(true);
 for(const mesh of scene.children){
  if(!['terrain','green_inner_wall','green_rim_collar'].includes(mesh.userData.role))continue;
  const p=mesh.geometry.attributes.position,inverse=mesh.matrixWorld.clone().invert();let edited=false;
  for(let i=0;i<p.count;i++){
   const point=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),originalY=point.y;
   for(const outlet of outlets){
    const a=outlet.up,b=outlet.end,dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz,t=((point.x-a.x)*dx+(point.z-a.z)*dz)/length;
    if(t<-.2||t>1.35)continue;
    const distance=Math.hypot(point.x-a.x-dx*THREE.MathUtils.clamp(t,0,1),point.z-a.z-dz*THREE.MathUtils.clamp(t,0,1));
    if(distance>outlet.width||point.y<outlet.level-.012||point.y>outlet.level+.04)continue;
    const weight=1-THREE.MathUtils.smoothstep(distance,outlet.width*.7,outlet.width),target=outlet.level-.003;
    if(point.y>target)point.y=THREE.MathUtils.lerp(point.y,target,weight);
   }
   if(point.y!==originalY){maxCut=Math.max(maxCut,originalY-point.y);changed++;edited=true;point.applyMatrix4(inverse);p.setXYZ(i,point.x,point.y,point.z)}
  }
  if(edited){p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere()}
 }
 cliffArt.crestNotchVertices=changed;cliffArt.maximumCrestCut=maxCut;cliffArt.openingFootprintChanged=false;
 const p=rockWallMesh.geometry.attributes.position,index=rockWallMesh.geometry.index,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),n=new THREE.Vector3();let invalid=0,degenerate=0;
 for(let i=0;i<p.count;i++)if(![p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite))invalid++;
 for(let i=0;i<index.count;i+=3){a.fromBufferAttribute(p,index.getX(i));b.fromBufferAttribute(p,index.getX(i+1));c.fromBufferAttribute(p,index.getX(i+2));n.copy(b).sub(a).cross(c.clone().sub(a));if(n.lengthSq()<1e-22)degenerate++}
 cliffArt.finalInvalidVertices=invalid;cliffArt.finalDegenerateTriangles=degenerate;
}

const leafLodMeshes=[],lodPoint=new THREE.Vector3(),lodScale=new THREE.Vector3(),lodMatrix=new THREE.Matrix4();
let lodLastUpdate=-Infinity,lodPolicy='auto';
function attachLeafLod(geometry,record){
 if(!record)return;
 const binary=atob(record.indices),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 geometry.userData.leafLod={full:geometry.index,compact:new THREE.BufferAttribute(new Uint32Array(bytes.buffer),1),error:record.maxDeviation,level:0};
}
function registerLeafLod(mesh){
 const lod=mesh.geometry.userData.leafLod;if(!lod)return;
 mesh.geometry.computeBoundingSphere();const sphere=mesh.geometry.boundingSphere,centres=[];
 for(let i=0;i<(mesh.isInstancedMesh?mesh.count:1);i++){
  if(mesh.isInstancedMesh)mesh.getMatrixAt(i,lodMatrix);else lodMatrix.copy(mesh.matrix);
  lodPoint.copy(sphere.center).applyMatrix4(lodMatrix);lodScale.setFromMatrixScale(lodMatrix);
  const scale=Math.max(Math.abs(lodScale.x),Math.abs(lodScale.y),Math.abs(lodScale.z));
  centres.push({p:lodPoint.clone(),radius:sphere.radius*scale,error:lod.error*scale});
 }
 leafLodMeshes.push({mesh,centres});
}
function updateLeafLods(time=0,force=false){
 if(!force&&time-lodLastUpdate<.25)return;lodLastUpdate=time;
 const pixels=stage.clientHeight*camera.zoom/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));let compact=0;
 for(const {mesh,centres}of leafLodMeshes){
  const lod=mesh.geometry.userData.leafLod;let worst=0;
  for(const c of centres)worst=Math.max(worst,c.error*pixels/Math.max(.01,camera.position.distanceTo(c.p)-c.radius));
  const desired=lodPolicy==='original'?0:lodPolicy==='compact'?1:worst<(lod.level?1.15:.85)?1:0;
  if(desired!==lod.level){mesh.geometry.setIndex(desired?lod.compact:lod.full);lod.level=desired}
  compact+=desired;
 }
 stage.dataset.leafLodCompact=String(compact);stage.dataset.leafLodBatches=String(leafLodMeshes.length);
}

const waterfallArt={version:'aerated-cascade-03',falls:[],obsoleteThreadsRemoved:0};
const pendingWaterfallSources=[];
const cascadeNoiseGLSL=`
float nlFallHash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float nlFallNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(nlFallHash(i),nlFallHash(i+vec2(1,0)),f.x),mix(nlFallHash(i+vec2(0,1)),nlFallHash(i+vec2(1)),f.x),f.y);}
float nlFallFbm(vec2 p){return .57*nlFallNoise(p)+.28*nlFallNoise(p*2.03+3.7)+.15*nlFallNoise(p*4.11+7.3);}
`;
let cliffOriginalPositions;
function wallPositionAt(outlet,height){
 if(!cliffOriginalPositions){const data=atob(payload.cliffRepair.positions),bytes=Uint8Array.from(data,c=>c.charCodeAt(0));cliffOriginalPositions=new Float32Array(bytes.buffer)}
 const col=outlet.index,positions=cliffOriginalPositions,rows=rockWallMesh?57:10,point=j=>rockWallMesh?new THREE.Vector3().fromBufferAttribute(rockWallMesh.geometry.attributes.position,col*rows+j):new THREE.Vector3().fromArray(positions,(col*rows+j)*3);
 for(let j=0;j<rows-1;j++){const a=point(j),b=point(j+1);if(height<=a.y&&height>=b.y)return Math.abs(a.y-b.y)<1e-9?a:a.lerp(b,(a.y-height)/(a.y-b.y))}
 return height>point(0).y?point(0):point(rows-1);
}
function mountConnectedWaterfall(source){
 const piece=source.userData.piece_id,outlet=payload.waterfallOutlets.find(o=>o.piece===piece);if(!outlet)throw Error('Missing cascade outlet '+piece);
 const lip=wallPositionAt(outlet,Infinity),upstream=new THREE.Vector3(...outlet.waterpoint);lip.y=Math.min(lip.y+.003,upstream.y);
 const inward=new THREE.Vector3(.125-lip.x,0,-.2416666783-lip.z).normalize(),side=new THREE.Vector3(-inward.z,0,inward.x),wetland=/^W/.test(piece),halfWidth=wetland?.061:piece==='R1'?.013:.011;
 const height=.86,rows=112,cols=20,positions=[],uv=[],indices=[];
 const columnForU=u=>{
  const desired=lip.clone().addScaledVector(side,(u-.5)*halfWidth*2);let best=Infinity,index=outlet.index;
  for(let offset=-32;offset<=32;offset++){const candidate={index:(outlet.index+offset+720)%720},p=wallPositionAt(candidate,Infinity),d=Math.hypot(p.x-desired.x,p.z-desired.z);if(d<best){best=d;index=candidate.index}}
  return {index};
 };
 const columns=Array.from({length:cols+1},(_,c)=>columnForU(c/cols));
 const centreAt=t=>{
  if(t<0)return upstream.clone().lerp(lip.clone().addScaledVector(inward,.004),(t+.10)/.10);
  const y=lip.y-t*height,wall=wallPositionAt(outlet,y),center=lip.clone();center.y=y;
  if(y>=wallPositionAt(outlet,-Infinity).y){center.x=wall.x;center.z=wall.z}
  const push=.005+.013*(1-Math.exp(-t*20))+.046*t*t;center.addScaledVector(inward,push);return center;
 };
 const sheetCentres=Array.from({length:rows+1},(_,r)=>{
  const t=-.10+r/rows*1.10;if(t<0)return centreAt(t);
  const y=lip.y-t*height;let clearance=-Infinity;
  for(const column of columns){const boundary=wallPositionAt(column,y);clearance=Math.max(clearance,(boundary.x-lip.x)*inward.x+(boundary.z-lip.z)*inward.z)}
  const p=lip.clone().addScaledVector(inward,clearance+.009+.012*(1-Math.exp(-t*20))+.046*t*t);p.y=y;return p;
 });
 for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){
  const t=-.10+r/rows*1.10,u=c/cols,fall=Math.max(0,t),width=halfWidth*(t<0?THREE.MathUtils.lerp(.65,1,(t+.1)/.1):1+.55*fall+.10*Math.sin(fall*37)*fall),p=sheetCentres[r].clone().addScaledVector(side,(u-.5)*2*width);
  if(t>=0)p.addScaledVector(inward,Math.sin(u*9.4+fall*23)*.0012*Math.min(1,fall*12));positions.push(...p.toArray());uv.push(u,t);
 }
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const i=r*(cols+1)+c;indices.push(i,i+1,i+cols+1,i+1,i+cols+2,i+cols+1)}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({name:'Aerated white water over river teal',color:0xb6d0c9,emissive:0x152a29,emissiveIntensity:.08,roughness:.42,metalness:0,transparent:true,opacity:.94,side:THREE.DoubleSide,depthWrite:false});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Connected cascade / '+piece;mesh.userData={role:'waterfall',piece_id:piece,waterfallPart:'sheet'};
 material.onBeforeCompile=shader=>{
  shader.uniforms.uFallTime={value:0};shader.uniforms.uFallNight={value:0};material.userData.flowShader=shader;
  shader.vertexShader='varying vec2 vFallUV;uniform float uFallTime;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvFallUV=uv;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float flutter=smoothstep(0.0,.26,uv.y)*(1.0-smoothstep(.8,1.0,uv.y));
   transformed.x+=sin(uv.y*31.0-uFallTime*3.7+uv.x*11.0)*.0012*flutter;
   transformed.z+=sin(uv.y*23.0-uFallTime*4.3+uv.x*7.0)*.0011*flutter;`);
  shader.fragmentShader='uniform float uFallTime;uniform float uFallNight;varying vec2 vFallUV;\n'+cascadeNoiseGLSL+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float t=max(0.0,vFallUV.y),u=vFallUV.x;
   float acceleration=pow(t+.025,.63);
   float breakup=nlFallFbm(vec2(u*18.0+nlFallNoise(vec2(t*6.0,uFallTime*.33))*1.7,acceleration*10.0-uFallTime*2.3));
   float froth=nlFallFbm(vec2(u*84.0+breakup*4.0,acceleration*110.0-uFallTime*13.0));
   float strands=nlFallFbm(vec2(u*39.0+nlFallNoise(vec2(t*9.0,uFallTime*.5))*2.0,t*7.0-uFallTime*2.9));
   float aeration=smoothstep(-.025,.18,vFallUV.y)*(.60+.35*breakup+.15*froth);
   vec3 river=vec3(.035,.19,.205),whitewater=mix(vec3(.47,.61,.58),vec3(.91,.96,.92),froth*.68+strands*.32);
   diffuseColor.rgb=mix(river,whitewater,clamp(aeration,0.0,.96));
   float edgeWidth=.055+(.5-nlFallNoise(vec2(t*67.0-uFallTime*4.0,u*5.0)))*.035;
   float edge=smoothstep(0.0,edgeWidth,u)*smoothstep(0.0,edgeWidth,1.0-u);
   diffuseColor.a*=edge*(1.0-smoothstep(.80,1.0,t))*(.80+.20*strands);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec2 turbulence=vec2(nlFallNoise(vec2(vFallUV.x*53.0,vFallUV.y*43.0-uFallTime*6.0)),nlFallNoise(vec2(vFallUV.x*71.0,vFallUV.y*57.0-uFallTime*8.0)))-.5;
   normal=normalize(normal+vec3(turbulence*.14,0.0));`);
 };
 material.customProgramCacheKey=()=> 'nl-aerated-cascade-03';scene.add(mesh);waterfallDrops.push(mesh);
 const sprayPositions=[],seeds=[];for(let i=0;i<180;i++){const t=(i*.61803398875)%1,p=centreAt(t);sprayPositions.push(...p.toArray());seeds.push(t,((i*.41421356237)%1)*2-1,(i*.73205080757)%1)}
 const sprayGeometry=new THREE.BufferGeometry();sprayGeometry.setAttribute('position',new THREE.Float32BufferAttribute(sprayPositions,3));sprayGeometry.setAttribute('aSpray',new THREE.Float32BufferAttribute(seeds,3));
 const sprayMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uFallTime:{value:0},uOpacity:{value:.22},uWidth:{value:halfWidth},uSide:{value:side}},vertexShader:`attribute vec3 aSpray;uniform float uFallTime;uniform float uWidth;uniform vec3 uSide;varying float vAlpha;void main(){float phase=fract(aSpray.x+uFallTime*.19);vec3 p=position;p.y+=(aSpray.x-phase)*.38;p+=uSide*aSpray.y*uWidth*(1.0+phase*2.7);vAlpha=sin(phase*3.14159265)*(.25+.75*phase);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((2.0+phase*5.0)/max(.3,-mv.z),1.0,14.0);}`,fragmentShader:`uniform float uOpacity;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.0;float alpha=(1.0-smoothstep(.12,1.0,r))*vAlpha*uOpacity;gl_FragColor=vec4(.77,.87,.83,alpha);}`});
 const spray=new THREE.Points(sprayGeometry,sprayMaterial);spray.userData={role:'waterfall-spray',piece_id:piece,waterfallPart:'spray'};spray.name='Aerated spray / '+piece;scene.add(spray);waterfallDrops.push(spray);
 if(wetland&&!stage.dataset.wetlandHeadwaterBasin)addWetlandBasin(lip);
 waterfallArt.falls.push({piece,lip:lip.toArray(),upstream:upstream.toArray(),width:halfWidth*2,height,vertices:positions.length/3,sprayParticles:180});
 stage.dataset.waterfallDesign=waterfallArt.version;window.heroWaterfallArt=waterfallArt;
 waterfallArt.setTime=t=>{for(const drop of waterfallDrops){if(drop.material.userData.flowShader)drop.material.userData.flowShader.uniforms.uFallTime.value=t;if(drop.material.uniforms?.uFallTime)drop.material.uniforms.uFallTime.value=t}requestRender()};
}
function updateMyceliumBlend(value){
 const blend=THREE.MathUtils.smoothstep(value,1.08,2);myceliumGroup.visible=blend>0;
 myceliumGroup.traverse(o=>{if(!o.material)return;const m=o.material;if(m.userData.baseMyceliumOpacity===undefined)m.userData.baseMyceliumOpacity=m.opacity;m.opacity=m.userData.baseMyceliumOpacity*blend});
 for(const mesh of waterfallDrops){
  mesh.visible=blend<.999;
  if(mesh.material.uniforms?.uOpacity)mesh.material.uniforms.uOpacity.value=.22*(1-blend);
  else{mesh.material.opacity=.94*(1-blend);mesh.material.emissiveIntensity=.08+.10*Math.min(value,1)}
 }
 stage.dataset.myceliumBlend=blend.toFixed(4);requestRender();
}

function mountMesh(mesh){if(mesh.userData.role==='wall_vegetation')return;if(mesh.userData.role==='foam'&&/v13 fine foam/i.test(mesh.material.name)){waterfallArt.obsoleteThreadsRemoved++;return}if(mesh.userData.role==='waterfall'){pendingWaterfallSources.push(mesh);return}registerLeafLod(mesh);const role=mesh.userData.role;if(role==='green_inner_wall'){
 const data=atob(payload.cliffRepair.positions),bytes=new Uint8Array(data.length);for(let i=0;i<data.length;i++)bytes[i]=data.charCodeAt(i);
 const positions=new Float32Array(bytes.buffer);if(positions.length!==mesh.geometry.attributes.position.count*3)throw Error('Cliff repair vertex mismatch');
 mesh.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));mesh.geometry.computeBoundingSphere();
 stage.dataset.cliffRepair='bounded-profile-smoothing';stage.dataset.rimComposition='level-shelf-wetland-recesses';
 }if(role==='wall_vegetation'){
 const record=payload.cliffRepair.attachments?.find(a=>a.role===role);if(record){const data=atob(record.positions),bytes=new Uint8Array(data.length);for(let i=0;i<data.length;i++)bytes[i]=data.charCodeAt(i);mesh.geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(bytes.buffer),3));mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere()}
 }if(role==='terrain'||role==='green_inner_wall')smoothNormals(mesh.geometry);if(mesh.material){mesh.material.flatShading=false;mesh.material.roughness=Math.max(.82,mesh.material.roughness??1);mesh.material.needsUpdate=true}if(role==='green_inner_wall'){mesh.material=new THREE.MeshStandardMaterial({color:0x18461f,roughness:1,metalness:0,emissive:0x0a1d0c,emissiveIntensity:.13,side:THREE.DoubleSide})}styleGeologicalSurface(mesh);scene.add(mesh);effects.registerWater(mesh);const piece=String(mesh.userData.piece_id||'');if(role==='waterfall'){const origin=waterfallOrigin(mesh),wetland=/^W/.test(piece);if(wetland){const center=new THREE.Vector3(.125,0,-.2416666783),inward=center.clone().sub(origin).setY(0).normalize(),side=new THREE.Vector3(-inward.z,0,inward.x);[-.062,0,.062].forEach((offset,index)=>addWaterfallDrop(origin.clone().addScaledVector(side,offset),index===1?.034:.028,.30));if(!stage.dataset.wetlandHeadwaterBasin)addWetlandBasin(origin)}else addWaterfallDrop(origin,.052,.56)}if(role==='vegetation'&&/^[RCW]/.test(piece)){if(mesh.isInstancedMesh){const matrix=new THREE.Matrix4();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);forestAnchors.push({p:new THREE.Vector3().setFromMatrixPosition(matrix),piece})}}else forestAnchors.push({p:new THREE.Vector3().setFromMatrixPosition(mesh.matrix),piece})}if(role==='terrain'){const id=mesh.userData.piece_id,previous=pieces.get(id);if(previous)previous.visible=false;pieces.set(id,mesh)}}
function captureForest(items){
 const data=items[0]?.extras||{},piece=String(data.piece_id||'');
 if(data.role!=='vegetation'||!/^[RCW]/.test(piece))return;
 for(const item of items){const p=new THREE.Vector3().setFromMatrixPosition(item.matrix);forestAnchors.push({p,piece})}
}
// Spatial bins avoid raycasting against the entire wheel for every filament.
let terrainSampler;
function buildTerrainSampler(){
 const bins=new Map(),seamSamples=new Map(),cell=.08,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 scene.updateMatrixWorld(true);
 for(const mesh of pieces.values()){
  if(!mesh.visible)continue;
  const g=mesh.geometry,p=g.attributes.position,idx=g.index,n=idx?idx.count:p.count;
  for(let i=0;i<p.count;i++){
   a.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
   const key=a.x.toFixed(5)+','+a.z.toFixed(5);if(!seamSamples.has(key))seamSamples.set(key,new Map());
   seamSamples.get(key).set(mesh.userData.piece_id,a.y);
  }
  for(let i=0;i<n;i+=3){
   a.fromBufferAttribute(p,idx?idx.getX(i):i).applyMatrix4(mesh.matrixWorld);
   b.fromBufferAttribute(p,idx?idx.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);
   c.fromBufferAttribute(p,idx?idx.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
   const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
   if(Math.abs(den)<1e-12)continue;
   const tri=[a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z,den];
   for(let x=Math.floor(Math.min(a.x,b.x,c.x)/cell);x<=Math.floor(Math.max(a.x,b.x,c.x)/cell);x++)
    for(let z=Math.floor(Math.min(a.z,b.z,c.z)/cell);z<=Math.floor(Math.max(a.z,b.z,c.z)/cell);z++){
     const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(tri);
    }
  }
 }
 const mismatches=[];let shared=0;
 for(const [position,heights]of seamSamples){
  if(heights.size<2)continue;shared++;
  const spread=Math.max(...heights.values())-Math.min(...heights.values());
  if(spread>1e-4)mismatches.push({position,spread,pieces:Object.fromEntries(heights)});
 }
 mismatches.sort((a,b)=>b.spread-a.spread);
 window.heroTerrainAudit={sharedSamples:shared,mismatchCount:mismatches.length,maxMismatch:mismatches[0]?.spread||0,worst:mismatches.slice(0,12),units:'scene units',tolerance:1e-4};
 seamSamples.clear();
 terrainSampler=(x,z,fallback)=>{
  let height=-Infinity;
  for(const t of bins.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){
   const u=((t[5]-t[8])*(x-t[6])+(t[6]-t[3])*(z-t[8]))/t[9];
   const v=((t[8]-t[2])*(x-t[6])+(t[0]-t[6])*(z-t[8]))/t[9];
   if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)height=Math.max(height,u*t[1]+v*t[4]+(1-u-v)*t[7]);
  }
  return Number.isFinite(height)?height:fallback;
 };
 stage.dataset.terrainSampling='triangle-barycentric';
}
function groundPoint(p,offset=0){p.y=terrainSampler(p.x,p.z,p.y)+offset;return p}

// A camera-readable inner landscape, built from terrain ownership, water levels
// and the unchanged opening guide. All additional plants are shared instances.
const innerBiomeRoot=new THREE.Group();innerBiomeRoot.name='Inner ring / five living biome signatures';scene.add(innerBiomeRoot);
const innerBiomeDesign={version:'inner-biome-signatures-02',families:{},instances:0,batches:0,triangles:0,foodBeds:0,minOpeningClearance:Infinity,rejected:{steep:0,water:0,unsupported:0,outlet:0},landmarks:[],sourceOpeningUnchanged:true};
const innerBiomeNames={R:'Rainforest',C:'Layered canopy',W:'Wetlands',F:'Food forest',M:'Forest meadow'};
const innerBiomeDescriptions={R:'Palms · tree ferns · broad-leaf understory',C:'Emergent crowns · layered shade · fern floor',W:'Reeds · sedges · lily margins · wet woodland',F:'Fruit trees · banana guilds · compact herb beds',M:'Deciduous groves · flowering glades · meadow grass'};
function innerGeometry(kind,variant=0){
 if(kind==='crop')return biomeHerbGeometry();
 const pos=[],col=[],ix=[];let seed=1731+variant*913+kind.length*71;
 const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const vertex=(p,color)=>{pos.push(...p.toArray());const c=new THREE.Color(color);col.push(c.r,c.g,c.b);return pos.length/3-1};
 function stem(a,b,r,color=0x766548){const d=b.clone().sub(a).normalize(),ref=Math.abs(d.y)<.96?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),u=d.clone().cross(ref).normalize(),v=d.clone().cross(u),base=pos.length/3;for(const [p,size]of [[a,r],[b,r*.54]])for(let i=0;i<6;i++){const t=i*Math.PI/3;vertex(p.clone().addScaledVector(u,Math.cos(t)*size).addScaledVector(v,Math.sin(t)*size),color)}for(let i=0;i<6;i++){const a=base+i,b=base+(i+1)%6;ix.push(a,b,a+6,b,b+6,a+6)}}
 function leaf(base,tip,width,color,bend=.04){const d=tip.clone().sub(base),side=new THREE.Vector3(-d.z,.07,d.x).normalize().multiplyScalar(width),mid=base.clone().lerp(tip,.48),ridge=mid.clone();ridge.y+=bend;const q=[vertex(base,color),vertex(mid.clone().add(side),color),vertex(tip,color),vertex(mid.clone().sub(side),color),vertex(ridge,new THREE.Color(color).multiplyScalar(1.1))];ix.push(q[0],q[1],q[4],q[1],q[2],q[4],q[2],q[3],q[4],q[3],q[0],q[4])}
 function broadLeaf(base,tip,width,color,rise=.23){
  const d=tip.clone().sub(base),side=new THREE.Vector3(-d.z,0,d.x).normalize(),start=pos.length/3;
  for(let j=0;j<=10;j++){const t=j/10,p=base.clone().lerp(tip,t);p.y+=Math.sin(t*Math.PI)*rise;const w=Math.pow(Math.sin(t*Math.PI),.8)*width*(1+.05*Math.sin(t*37+variant));for(const sign of [-1,0,1]){const q=p.clone().addScaledVector(side,w*sign);q.y+=sign===0?.015*Math.sin(t*Math.PI):-.018*Math.sin(t*Math.PI);vertex(q,new THREE.Color(color).multiplyScalar(sign===0?1.06:1))}}
  for(let j=0;j<10;j++)for(let k=0;k<2;k++){const a=start+j*3+k,b=a+1,c=a+3,d=c+1;if(j>0)ix.push(a,b,c);if(j<9)ix.push(b,d,c)}
 }
 if(kind==='fern'||kind==='banana'){
  const banana=kind==='banana',base=new THREE.Vector3(0,banana?.54:.03,0);if(banana)stem(new THREE.Vector3(),base,.043,0x717748);
  for(let i=0;i<(banana?7:9);i++){const a=i*2.39996+variant,d=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),length=banana?.65+rnd()*.25:.48+rnd()*.2,tip=d.clone().multiplyScalar(length);tip.y=banana?.28+rnd()*.28:.12+rnd()*.2;if(banana)broadLeaf(base,tip,.12+rnd()*.055,[0x497540,0x5f8746,0x385e35][i%3],.20+rnd()*.17);else{for(let j=1;j<=9;j++){const t=j/10,p=base.clone().lerp(tip,t);p.y+=.20*Math.sin(t*Math.PI);const side=new THREE.Vector3(-d.z,0,d.x);for(const sign of [-1,1])leaf(p,p.clone().addScaledVector(side,sign*.20*Math.sin(t*Math.PI)).addScaledVector(d,.10),.022,0x4b7943,.01)}}}
 }else if(kind==='palm'){
  const top=new THREE.Vector3(.06,.92,0);stem(new THREE.Vector3(),top,.032,0x806c4e);
  for(let i=0;i<10;i++){const a=i*2.39996,d=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),side=new THREE.Vector3(-d.z,0,d.x);for(let j=1;j<=10;j++){const t=j/10,p=top.clone().addScaledVector(d,.67*t);p.y+=.29*Math.sin(t*Math.PI)-.18*t;for(const sign of [-1,1])leaf(p,p.clone().addScaledVector(side,sign*(.04+.16*Math.sin(t*Math.PI))).addScaledVector(d,.045),.017,[0x396c42,0x5a8247][i%2],.012)}}
 }else if(kind==='grass'||kind==='flower'){
  for(let i=0;i<14;i++){const a=i*2.39996,x=Math.cos(a)*rnd()*.28,z=Math.sin(a)*rnd()*.28,b=new THREE.Vector3(x,0,z),tip=new THREE.Vector3(x+Math.cos(a)*.11,.30+rnd()*.47,z+Math.sin(a)*.11);leaf(b,tip,.016,[0x748a4a,0x8a985a,0x526e3f][i%3],.01);if(kind==='flower'&&i%2===0){const c=variant%3===0?0xe9d7ac:variant%3===1?0xb3a0c3:0xe5e3ce;for(let k=0;k<5;k++){const t=k*Math.PI*.4;leaf(tip,tip.clone().add(new THREE.Vector3(Math.cos(t)*.065,.01,Math.sin(t)*.065)),.037,c,.009)}}}
 }else if(kind==='lily'){
  for(let i=0;i<6;i++){const a=i*2.39996,p=new THREE.Vector3(Math.cos(a)*(.14+i*.05),0,Math.sin(a)*(.14+i*.05)),base=pos.length/3;vertex(p,0x5e8152);for(let j=0;j<11;j++){const t=.16+j/10*5.85;vertex(p.clone().add(new THREE.Vector3(Math.cos(t)*.12,.006*Math.sin(t*3),Math.sin(t)*.12)),0x658a58)}for(let j=1;j<11;j++)ix.push(base,base+j,base+j+1);if(i%3===0)for(let k=0;k<6;k++){const t=k*Math.PI/3;leaf(p.clone().add(new THREE.Vector3(0,.025,0)),p.clone().add(new THREE.Vector3(Math.cos(t)*.075,.05,Math.sin(t)*.075)),.029,0xe8dfb7,.02)}}
 }else if(kind==='treefern'){
  const top=new THREE.Vector3(0,.55,0);stem(new THREE.Vector3(),top,.038,0x635e42);
  for(let i=0;i<10;i++){const a=i*2.39996,d=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),s=new THREE.Vector3(-d.z,0,d.x);for(let j=1;j<=8;j++){const t=j/8,p=top.clone().addScaledVector(d,.61*t);p.y+=.24*Math.sin(t*Math.PI)-.08*t;for(const sign of [-1,1])leaf(p,p.clone().addScaledVector(s,sign*.16*Math.sin(t*Math.PI)).addScaledVector(d,.06),.021,0x527e44,.014)}}
 }else{
  const g=biomeTreeGeometry(variant%3),p=g.attributes.position,c=g.attributes.color,indices=g.index;
  const broad=kind==='canopy',fruit=kind==='fruit',rain=kind==='rain';
  for(let i=0;i<p.count;i++){const h=p.getY(i),spread=broad?1.38:rain?1.14:fruit?1.05:1;pos.push(p.getX(i)*spread,h*(broad?.90:rain?1.18:1),p.getZ(i)*spread);let color=new THREE.Color(c.getX(i),c.getY(i),c.getZ(i));if(h>.44)color.lerp(new THREE.Color(rain?0x1f6547:broad?0x376749:fruit?0x6a8c43:0x71864b),.24);col.push(color.r,color.g,color.b)}ix.push(...indices.array);g.dispose();
  if(fruit)for(let i=0;i<11;i++){const a=i*2.39996,p=new THREE.Vector3(Math.cos(a)*(.17+rnd()*.22),.57+rnd()*.20,Math.sin(a)*(.17+rnd()*.22)),color=variant%2?0xd6b657:0xc37b43;const center=vertex(p,color),q=[];for(let j=0;j<6;j++){const t=j*Math.PI/3;q.push(vertex(p.clone().add(new THREE.Vector3(Math.cos(t)*.026,.014,Math.sin(t)*.026)),color))}for(let j=0;j<6;j++)ix.push(center,q[j],q[(j+1)%6])}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(ix);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function buildInnerBiomes(){
 if(new URLSearchParams(location.search).has('baselineInner'))return;
 const groundBins=new Map(),waterBins=new Map(),binSize=.07,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 function indexSurface(mesh,bins,family){
  const g=mesh.geometry,p=g.attributes.position,index=g.index,n=index?index.count:p.count;
  for(let i=0;i<n;i+=3){a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-10)continue;const t=[a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z,den,family];for(let x=Math.floor(Math.min(a.x,b.x,c.x)/binSize);x<=Math.floor(Math.max(a.x,b.x,c.x)/binSize);x++)for(let z=Math.floor(Math.min(a.z,b.z,c.z)/binSize);z<=Math.floor(Math.max(a.z,b.z,c.z)/binSize);z++){const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(t)}}
 }
 scene.updateMatrixWorld(true);for(const mesh of pieces.values())indexSurface(mesh,groundBins,mesh.userData.piece_id[0]);
 scene.traverse(mesh=>{if(mesh.isMesh&&!mesh.isInstancedMesh&&/^(water|paddy_water|production_water)$/.test(mesh.userData.role||''))indexSurface(mesh,waterBins,'water')});
 function surfaceAt(bins,x,z){let best=null;for(const t of bins.get(Math.floor(x/binSize)+','+Math.floor(z/binSize))||[]){const u=((t[5]-t[8])*(x-t[6])+(t[6]-t[3])*(z-t[8]))/t[9],v=((t[8]-t[2])*(x-t[6])+(t[0]-t[6])*(z-t[8]))/t[9];if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001){const h=u*t[1]+v*t[4]+(1-u-v)*t[7];if(!best||h>best.h)best={h,family:t[10]}}}return best}
 const guide=payload.openingGuide.top.filter((_,i)=>i%3===0),batches=new Map(),locations={R:[],C:[],W:[],F:[],M:[]};
 const gardenArea=(x,z)=>x>-.20&&x<.35&&z>.29&&z<.66;
 function edgeDistance(x,z){let best=Infinity;for(let i=0;i<guide.length;i++){const a=guide[i],b=guide[(i+1)%guide.length],dx=b[0]-a[0],dz=b[2]-a[2],den=dx*dx+dz*dz;if(den<1e-12)continue;const t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[2])*dz)/den,0,1);best=Math.min(best,Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t))}return best}
 function safePoint(x,z,minimum=.042,maximum=.52){const owner=surfaceAt(groundBins,x,z);if(!owner){innerBiomeDesign.rejected.unsupported++;return null}const edge=edgeDistance(x,z);if(edge<minimum||edge>maximum)return null;
  const h=terrainSampler(x,z,NaN),heights=[[.014,0],[-.014,0],[0,.014],[0,-.014]].map(([dx,dz])=>terrainSampler(x+dx,z+dz,NaN));if(!Number.isFinite(h)||heights.some(v=>!Number.isFinite(v))){innerBiomeDesign.rejected.unsupported++;return null}
  if(heights.some(v=>Math.abs(v-h)>.031)){innerBiomeDesign.rejected.steep++;return null}
  if(payload.waterfallOutlets.some(o=>Math.hypot(x-o.waterpoint[0],z-o.waterpoint[2])<.055)){innerBiomeDesign.rejected.outlet++;return null}
  const water=surfaceAt(waterBins,x,z);if(water&&h<water.h+.006){innerBiomeDesign.rejected.water++;return null}
  // Keep the actual water supply and established earthworks clear.
  if(owner.family==='F'&&(foodPondDistance(x,z).distance<1.16||foodChannelDistance(x,z).distance<.014||isNorthwestPaddy(x,z)))return null;
  return {p:new THREE.Vector3(x,h+.001,z),family:owner.family,edge};
 }
 function add(site,kind,size,salt=0){
  const key=site.family+' / '+kind+' / '+salt%3;if(!batches.has(key))batches.set(key,{family:site.family,kind,variant:salt%3,records:[]});
  const u=biomeHash(site.p.x,site.p.z,salt+72);batches.get(key).records.push({p:site.p.clone(),q:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),u*Math.PI*2),s:new THREE.Vector3(size*(.85+.25*u),size,size*(.85+.25*u))});
  innerBiomeDesign.minOpeningClearance=Math.min(innerBiomeDesign.minOpeningClearance,site.edge);innerBiomeDesign.families[site.family]??={name:innerBiomeNames[site.family],plants:0,types:{},trees:0};const f=innerBiomeDesign.families[site.family];f.plants++;f.types[kind]=(f.types[kind]||0)+1;locations[site.family].push(site.p.clone());if(['rain','canopy','fruit','deciduous','palm','treefern'].includes(kind))f.trees++;
  if(['rain','canopy','fruit','deciduous'].includes(kind))forestAnchors.push({p:site.p.clone(),piece:site.family+'-inner-signature'});
 }
 // Irregular planting communities: low at the lip, bigger silhouettes behind.
 for(let x=-1.45;x<1.65;x+=.064)for(let z=-1.65;z<1.35;z+=.064){const u=biomeHash(x,z,10),v=biomeHash(x,z,11),site=safePoint(x+(u-.5)*.035,z+(v-.5)*.035,.075,.57);if(!site)continue;const patch=.5+.5*Math.sin(x*20+Math.sin(z*13)*2.4),back=THREE.MathUtils.smoothstep(site.edge,.08,.43);if(u>.40+patch*.53)continue;const h=(.065+.095*back)*(.78+.42*v);
  if(site.family==='R')add(site,u<.17?'palm':u<.35?'treefern':'rain',u<.35?h*1.04:h,Math.floor(v*3));
  if(site.family==='C')add(site,'canopy',h*(u>.75?1.35:1.02),Math.floor(v*3));
  if(site.family==='F'&&!gardenArea(site.p.x,site.p.z))add(site,u<.17?'banana':'fruit',h*.75,Math.floor(v*3));
  if(site.family==='M'&&patch>.40&&u<.56)add(site,'deciduous',h*.88,Math.floor(v*3));
  if(site.family==='W'&&u<.29&&site.edge>.13)add(site,'deciduous',h*.73,Math.floor(v*3));
 }
 for(let x=-1.45;x<1.65;x+=.027)for(let z=-1.65;z<1.35;z+=.027){const u=biomeHash(x,z,33),v=biomeHash(x,z,34),site=safePoint(x+(u-.5)*.015,z+(v-.5)*.015,.038,.49);if(!site)continue;const patch=.5+.5*Math.sin(x*31+Math.sin(z*25)*2);if(u>.48+patch*.49)continue;
  const size=.014+.018*v;
  if(site.family==='R')add(site,u<.68?'fern':'banana',u<.68?size*1.4:size*1.7,Math.floor(v*3));
  if(site.family==='C')add(site,u<.67?'fern':'grass',size*1.2,Math.floor(v*3));
  if(site.family==='F'&&!gardenArea(site.p.x,site.p.z))add(site,u<.28?'flower':u<.44?'banana':'crop',u<.44?size*1.3:size,Math.floor(v*3));
  if(site.family==='M')add(site,u<.56?'flower':'grass',size*(.9+patch*.5),Math.floor(v*3));
  if(site.family==='W')add(site,'grass',size*1.35,Math.floor(v*3));
 }
 // Low curved beds provide a recognisably cultivated inner food-forest window.
 // These are mulch/crop beds; the upstream hydrology remains the master system.
 for(let row=0;row<5;row++){
  const positions=[],indices=[];let previous=false;
  for(let i=0;i<=64;i++){const x=-.19+i/64*.53,z=.32+row*.064+.026*Math.sin(x*8+row*.23),site=safePoint(x,z,.045,.51);if(!site||site.family!=='F'){previous=false;continue}
   const l=terrainSampler(x,z-.010,NaN),r=terrainSampler(x,z+.010,NaN);if(!Number.isFinite(l)||!Number.isFinite(r)||Math.abs(l-r)>.025){previous=false;continue}
   const start=positions.length/3;positions.push(x,l+.002,z-.010,x,r+.002,z+.010);if(previous)indices.push(start-2,start-1,start,start-1,start+1,start);previous=true;
   if(i%2===0)for(const side of [-1,1]){const crop=safePoint(x,z+side*.005,.045,.51);if(crop?.family==='F')add(crop,row%3===0?'flower':'crop',.014+biomeHash(x,z,81)*.008,row%3)}
  }
  if(indices.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();const bed=new THREE.Mesh(g,new THREE.MeshStandardMaterial({name:'Inner productive contour bed / mulch',color:row%2?0x68563a:0x796342,roughness:1,side:THREE.DoubleSide}));bed.name='Food forest inner cultivated bed '+row;bed.userData={role:'inner_food_bed',piece_id:'F-inner'};bed.receiveShadow=true;innerBiomeRoot.add(bed);innerBiomeDesign.foodBeds++;innerBiomeDesign.batches++;innerBiomeDesign.triangles+=indices.length/3}
 }
 // Water plants sit on the actual surface, never on elevated meadow terrain.
 for(let x=-1.55;x<.75;x+=.033)for(let z=-1.35;z<.8;z+=.033){const u=biomeHash(x,z,47),w=surfaceAt(waterBins,x,z),owner=surfaceAt(groundBins,x,z);if(!w||owner?.family!=='W'||u>.48)continue;const edge=edgeDistance(x,z);if(edge<.055||edge>.52)continue;const margin=[[.025,0],[-.025,0],[0,.025],[0,-.025]].some(([dx,dz])=>!surfaceAt(waterBins,x+dx,z+dz));if(!margin&&u>.17)continue;add({family:'W',p:new THREE.Vector3(x,w.h+.0015,z),edge},'lily',.036+u*.027,0)}
 const material=new THREE.MeshStandardMaterial({name:'Inner biome botanical leaf and bark',vertexColors:true,roughness:.95,side:THREE.DoubleSide});
 for(const [name,batch]of batches){const {family,kind,records,variant}=batch,g=innerGeometry(kind,variant),mesh=new THREE.InstancedMesh(g,material,records.length),m=new THREE.Matrix4();records.forEach((r,i)=>{m.compose(r.p,r.q,r.s);mesh.setMatrixAt(i,m);mesh.setColorAt(i,new THREE.Color().setHSL(.25+.05*biomeHash(r.p.x,r.p.z,51),.06,.83+.11*biomeHash(r.p.x,r.p.z,52)))});mesh.name=innerBiomeNames[family]+' inner signature / '+kind+' '+variant;mesh.userData={role:'inner_biome_planting',piece_id:family+'-inner',family,kind};mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();innerBiomeRoot.add(mesh);innerBiomeDesign.instances+=records.length;innerBiomeDesign.batches++;innerBiomeDesign.triangles+=g.index.count/3*records.length}
 // The wetland signature also uses the established reed geometry.
 const reedRecords=[];for(const batch of batches.values())if(batch.family==='W'&&batch.kind==='grass')reedRecords.push(...batch.records.filter((_,i)=>i%3===0));
 if(reedRecords.length){const g=wetlandReedGeometry(),mesh=new THREE.InstancedMesh(g,material,reedRecords.length),m=new THREE.Matrix4();reedRecords.forEach((r,i)=>{m.compose(r.p,r.q,r.s.clone().multiplyScalar(1.5));mesh.setMatrixAt(i,m)});mesh.name='Wetlands inner signature / reeds and sedges';mesh.userData={role:'inner_biome_planting',family:'W',piece_id:'W-inner',kind:'reed'};mesh.computeBoundingSphere();innerBiomeRoot.add(mesh);innerBiomeDesign.instances+=reedRecords.length;innerBiomeDesign.batches++;innerBiomeDesign.triangles+=g.index.count/3*reedRecords.length;innerBiomeDesign.families.W.types.reed=reedRecords.length}
 for(const family of Object.keys(innerBiomeNames)){
  const candidates=locations[family],center=candidates.reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(1/Math.max(1,candidates.length));const point=candidates.slice().sort((a,b)=>a.distanceTo(center)-b.distanceTo(center))[0];if(point)innerBiomeDesign.landmarks.push({family,name:innerBiomeNames[family],description:innerBiomeDescriptions[family],position:point.clone().add(new THREE.Vector3(0,.04,0)).toArray(),candidates:candidates.filter((_,i)=>i%Math.max(1,Math.floor(candidates.length/180))===0).map(p=>p.toArray())});
 }
 stage.dataset.innerBiomeDesign=innerBiomeDesign.version;window.heroInnerBiomes={report:innerBiomeDesign,setVisible(value){innerBiomeRoot.visible=!!value;renderer.shadowMap.needsUpdate=true;requestRender()},get visible(){return innerBiomeRoot.visible}};
}
function installInnerBiomeGuide(){
 // Identification now belongs to the optional Nourishland mapping layer.
 if(!new URLSearchParams(location.search).has('debugGuide'))return;
 if(!window.heroInnerBiomes)return;
 const guideTargets={R:[.72,.18],C:[.30,.20],W:[.12,.57],F:[.55,.82],M:[.88,.46]};
 for(const mark of innerBiomeDesign.landmarks){const target=guideTargets[mark.family],candidates=mark.candidates.map(p=>{const world=new THREE.Vector3(...p).add(new THREE.Vector3(0,.035,0)),v=world.clone().project(camera),x=v.x*.5+.5,y=-v.y*.5+.5;return {world,x,y,z:v.z,score:Math.hypot(x-target[0],y-target[1])}}).filter(p=>p.x>.04&&p.x<.96&&p.y>.09&&p.y<.90&&p.z<1).sort((a,b)=>a.score-b.score);if(candidates[0])mark.position=candidates[0].world.toArray();delete mark.candidates}
 const root=document.createElement('div');root.className='inner-biome-guide';root.hidden=new URLSearchParams(location.search).has('hero');
 const style=document.createElement('style');style.textContent='.inner-biome-guide{position:absolute;inset:0;pointer-events:none;z-index:9}.inner-biome-guide button{position:absolute;pointer-events:auto;transform:translate(-50%,-100%);border:1px solid #eaf1df66;border-radius:20px;padding:6px 10px;background:#132c25d9;color:#f0f3e3;font:11px system-ui;white-space:nowrap;box-shadow:0 2px 10px #07190a25;cursor:pointer}.inner-biome-guide button:after{content:"";position:absolute;top:100%;left:50%;height:18px;width:1px;background:#f1efd2aa}.inner-biome-guide button span{display:none;font-size:9px;opacity:.85;padding-top:4px;white-space:normal;max-width:190px}.inner-biome-guide button:hover span,.inner-biome-guide button:focus span{display:block}.inner-guide-toggle{position:fixed;top:14px;left:14px;z-index:70;color:#eff4e3;background:#142d25dc;border:1px solid #eaf1df66;border-radius:6px;padding:9px 12px;font:11px system-ui;cursor:pointer}@media(max-width:650px){.inner-biome-guide button{font-size:8px;padding:4px 7px}.inner-guide-toggle{top:10px;left:10px}}';document.head.append(style);
 const extra=document.createElement('style');extra.textContent='.inner-biome-guide button.expanded span{display:block}';document.head.append(extra);
 const entries=innerBiomeDesign.landmarks.map(mark=>{const button=document.createElement('button');button.textContent=mark.name;button.setAttribute('aria-label',mark.name+': '+mark.description);const detail=document.createElement('span');detail.textContent=mark.description;button.append(detail);button.onclick=()=>{const expanded=button.classList.toggle('expanded');button.setAttribute('aria-expanded',String(expanded))};root.append(button);return {button,point:new THREE.Vector3(...mark.position)}});
 const toggle=document.createElement('button');toggle.className='inner-guide-toggle';toggle.textContent='Hide biome guide';toggle.onclick=()=>{root.hidden=!root.hidden;toggle.textContent=root.hidden?'Show biome guide':'Hide biome guide';requestRender()};toggle.hidden=new URLSearchParams(location.search).has('hero');
 stage.append(root);document.body.append(toggle);
 function update(){if(root.hidden)return;const w=stage.clientWidth,h=stage.clientHeight;for(const {button,point}of entries){const p=point.clone().project(camera);button.hidden=Math.abs(p.x)>.95||Math.abs(p.y)>.93||p.z>1;button.style.left=(p.x*.5+.5)*w+'px';button.style.top=(-p.y*.5+.5)*h-18+'px'}}
 window.heroInnerBiomes.guide={setVisible(value){root.hidden=!value;toggle.textContent=value?'Hide biome guide':'Show biome guide';update()},update};update();
}

// Productive landscape art direction, using the existing master terrain.
// This pass adds botanical identities and replaces repetitive crown groups.
function refineFoodIdentity(api){
 const {THREE:T,scene,camera,payload,terrainSampler,requestRender,foodOwnerAt,foodPondDistance,foodChannelDistance,riceReferenceHeight,forestAnchors,innerGeometry,biomeHash:hash}=api;
 window.heroFoodIdentity?.undo();
 const root=new T.Group();root.name='Food production / diverse edible systems';root.userData={role:'food_identity'};scene.add(root);
 const report={version:'food-identity-01',zones:{forest:{trees:0,shrubs:0},damSlopes:{plants:0},swales:{plants:0,rows:0},grapes:{vines:0,rows:0}},types:{},fruit:{jackfruit:0,carambola:0,citrus:0,grapes:0},removedComponents:0,removedRootPositions:0,batches:0,triangles:0,plants:[],terrainEdited:false};
 const saved=[],bankSaved=[],materials=new Set(),geometries=new Set(),batches=new Map(),m=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3(),suppressed=new Set(),anchors=[];
 const material=new T.MeshStandardMaterial({name:'Food forest / diverse matte leaves and bark',vertexColors:true,roughness:.92,side:T.DoubleSide});materials.add(material);
 const scalar=(v,a,b)=>T.MathUtils.clamp(v,a,b),zero=new T.Matrix4().makeScale(0,0,0),axis=new T.Vector3(0,1,0);
 const forestZone=(x,z)=>x>-.31&&x<.42&&z>1.08&&z<1.80;
 const damZone=(x,z)=>x>.34&&x<.81&&z>1.03&&z<1.81;
 // Decisions are keyed to the root, so all leaf/bark primitives agree.
 scene.traverse(mesh=>{
  if(!mesh.isInstancedMesh||mesh.parent===root||mesh.userData.role!=='vegetation')return;
  const replacement=/^Food forest \/ (branched fruit trees|leafy guild shrubs)$/.test(mesh.name),source=/^F[1-5]$/.test(mesh.userData.piece_id||'');if(!replacement&&!source)return;
  const records=[];
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,m);if(Math.abs(m.determinant())<1e-18)continue;p.setFromMatrixPosition(m);
   if(!replacement&&!(forestZone(p.x,p.z)&&hash(p.x,p.z,702)<.76||damZone(p.x,p.z)&&hash(p.x,p.z,703)<.73))continue;
   records.push({id:i,matrix:m.clone()});mesh.setMatrixAt(i,zero);suppressed.add(p.x.toFixed(5)+','+p.z.toFixed(5));report.removedComponents++;
  }
  if(records.length){saved.push({mesh,records});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
 });
 report.removedRootPositions=suppressed.size;
 // Vegetated bank faces soften the old dark vertical mulch strips. The
 // horizontal crest remains a readable narrow cultivated contour line.
 scene.traverse(mesh=>{if(mesh.userData.role!=='swale_berm')return;const g=mesh.geometry,pos=g.attributes.position,n=g.attributes.normal,colors=[];bankSaved.push({mesh,material:mesh.material,color:g.attributes.color});mesh.material=mesh.material.clone();materials.add(mesh.material);mesh.material.color.set(0xffffff);mesh.material.vertexColors=true;mesh.material.needsUpdate=true;
  for(let i=0;i<pos.count;i++){const up=Math.abs(n.getY(i)),u=hash(pos.getX(i),pos.getZ(i),661),c=new T.Color(up<.7?0x516c3e:0x79663e);c.multiplyScalar(.90+u*.15);colors.push(c.r,c.g,c.b)}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 });
 function site(x,z,channel=.018,maxGrade=1.55){
  if(!foodOwnerAt(x,z)||x<-.28||x>.84||z<.73||z>1.83||foodPondDistance(x,z).distance<1.15||foodChannelDistance(x,z).distance<channel)return null;
  const h=terrainSampler(x,z,NaN),hx=terrainSampler(x+.009,z,NaN),hz=terrainSampler(x,z+.009,NaN);if(![h,hx,hz].every(Number.isFinite)||Math.max(Math.abs(hx-h),Math.abs(hz-h))/.009>maxGrade)return null;
  return new T.Vector3(x,h+.0007,z);
 }
 function add(kind,point,size,zone,salt=0){
  const key=kind+' / '+salt%2;if(!batches.has(key))batches.set(key,{kind,variant:salt%2,records:[]});
  const u=hash(point.x,point.z,81+salt),rec={p:point.clone(),q:new T.Quaternion().setFromAxisAngle(axis,u*Math.PI*2),scale:new T.Vector3(size*(.90+.18*u),size,size*(.90+.18*u)),kind,zone};
  batches.get(key).records.push(rec);report.types[kind]=(report.types[kind]||0)+1;report.plants.push({kind,zone,position:point.toArray(),height:size});
  if(zone==='forest')report.zones.forest[/shrub/.test(kind)?'shrubs':'trees']++;else if(zone==='damSlopes')report.zones.damSlopes.plants++;else if(zone==='swales')report.zones.swales.plants++;
  if(['jackfruit','mango','avocado','citrus','cacao'].includes(kind))anchors.push({p:point.clone(),piece:'F-diverse-food-forest'});
  return rec;
 }
 const occupied=[];
 // An irregular mature canopy, with gaps between species and staggered strata.
 for(let z=1.13;z<1.78;z+=.083)for(let x=-.25;x<.40;x+=.084){
  const u=hash(x,z,718),v=hash(x,z,719),xx=x+(u-.5)*.036,zz=z+(v-.5)*.035,at=site(xx,zz,.022);if(!at||u<.20)continue;
  const species=hash(x,z,714),kind=species<.27?'jackfruit':species<.51?'mango':species<.68?'avocado':species<.82?'citrus':species<.92?'cacao':'banana',size=(kind==='jackfruit'?.205:kind==='mango'?.181:kind==='avocado'?.185:kind==='citrus'?.115:kind==='cacao'?.139:.105)*(.87+.24*v);
  if(occupied.some(o=>Math.hypot(o.x-xx,o.z-zz)<(kind==='jackfruit'?.09:.071)))continue;
  occupied.push({x:xx,z:zz});add(kind,at,size,'forest',Math.floor(v*2));
 }
 // Smaller trees/shrubs sit in canopy gaps, not under every mature crown.
 for(let z=1.08;z<1.78;z+=.048)for(let x=-.24;x<.40;x+=.049){const u=hash(x,z,720),v=hash(x,z,721),xx=x+(u-.5)*.025,zz=z+(v-.5)*.023;if(u>.65||occupied.some(o=>Math.hypot(o.x-xx,o.z-zz)<.041))continue;const at=site(xx,zz,.018);if(at)add(u<.38?'carambola_shrub':u<.52?'citrus_shrub':'banana',at,(u<.52?.038:.057)*(.86+.3*v),'forest',Math.floor(v*2))}
 // Productive spillway slopes: many edible plants, with clear water margins.
 for(let z=1.035;z<1.80;z+=.026)for(let x=.34;x<.82;x+=.027){const u=hash(x,z,727),v=hash(x,z,728),at=site(x+(u-.5)*.015,z+(v-.5)*.015,.016,3.6);if(!at||u>.90)continue;const slope=Math.max(Math.abs(terrainSampler(at.x+.009,at.z,at.y)-at.y),Math.abs(terrainSampler(at.x,at.z+.009,at.y)-at.y))/.009,kind=slope>1.8?(u<.65?'carambola_shrub':'herb'):u<.14?'banana':u<.28?'papaya':u<.61?'carambola_shrub':u<.77?'citrus_shrub':'herb';add(kind,at,(kind==='banana'?.062:kind==='papaya'?.075:/shrub/.test(kind)?.030:.023)*(.84+.32*v),'damSlopes',Math.floor(v*2))}
 // Thick contour guilds on the lower swales. Narrow water and mulch lines
 // remain open so the human-designed contour pattern is still legible.
 for(let row=0;row<payload.foodContours.length;row++){
  const points=payload.foodContours[row].map(p=>new T.Vector3(...p)),curve=new T.CatmullRomCurve3(points);report.zones.swales.rows++;
  for(let i=0;i<37;i++){
   const t=(i+.45)/37,c=curve.getPoint(t),tangent=curve.getTangent(t),side=new T.Vector3(-tangent.z,0,tangent.x).normalize(),u=hash(c.x,c.z,741+row);
   // The upper part blends into the mature forest, rather than duplicate it.
   if(c.z>1.11&&i%3!==0)continue;
   for(const offset of [.006,.021,.037]){const pp=c.clone().addScaledVector(side,offset+(u-.5)*.004),at=site(pp.x,pp.z,.011);if(!at)continue;const kind=i%8===2&&offset<.02?'citrus':i%9===5&&offset<.02?'banana':u<.62&&offset<.03?'carambola_shrub':'herb',size=kind==='citrus'?.066:kind==='banana'?.050:kind==='herb'?.020:.028;add(kind,at,size*(.86+.25*u),'swales',row%2)}
  }
 }
 function treeGeometry(kind,variant){
  if(kind==='banana')return innerGeometry('banana',variant);
  if(kind==='herb')return innerGeometry('crop',variant);
  const positions=[],colors=[],indices=[],grape=kind==='grape',shrub=/shrub/.test(kind),papaya=kind==='papaya';let seed=3271+variant*971+kind.length*913;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const palette={grape:[0x607f3b,0x7f984b,0x4e743c],jackfruit:[0x35663a,0x52834a,0x698e4a],mango:[0x4a713b,0x6b8b43,0x8b9747],avocado:[0x335c3a,0x4c7746,0x658b52],citrus:[0x507c34,0x6a8b3e,0x7f9b48],cacao:[0x3e6b40,0x7a8d4b,0x7e7145],carambola_shrub:[0x679345,0x8ba34e,0x537d3d],citrus_shrub:[0x477c3c,0x669746,0x7da24a],papaya:[0x53843d,0x76a04b,0x4c7837]}[kind];
  const vertex=(v,color)=>{positions.push(...v.toArray());const c=new T.Color(color);colors.push(c.r,c.g,c.b);return positions.length/3-1};
  function branch(a,b,r){const d=b.clone().sub(a).normalize(),u=new T.Vector3(0,0,1).cross(d).normalize(),v=d.clone().cross(u),start=positions.length/3;for(const [at,rr]of [[a,r],[b,r*.52]])for(let i=0;i<6;i++){const angle=i*Math.PI/3;vertex(at.clone().addScaledVector(u,Math.cos(angle)*rr).addScaledVector(v,Math.sin(angle)*rr),kind==='papaya'?0x838453:0x786047)}for(let i=0;i<6;i++){const a=start+i,b=start+(i+1)%6;indices.push(a,b,a+6,b,b+6,a+6)}}
  function leaf(at,length,width,angle,color,tilt=.15){const along=new T.Vector3(Math.cos(angle),tilt,Math.sin(angle)),side=new T.Vector3(-Math.sin(angle),.04,Math.cos(angle)),ids=[vertex(at.clone().addScaledVector(along,length),color),vertex(at.clone().addScaledVector(side,width),color),vertex(at.clone().addScaledVector(along,-length*.68),color),vertex(at.clone().addScaledVector(side,-width),color),vertex(at.clone().add(new T.Vector3(0,.019,0)),new T.Color(color).multiplyScalar(1.08))];indices.push(ids[0],ids[1],ids[4],ids[1],ids[2],ids[4],ids[2],ids[3],ids[4],ids[3],ids[0],ids[4])}
  const fork=new T.Vector3(.018,papaya?.82:shrub?.22:.47,0);branch(new T.Vector3(),fork,papaya?.031:shrub?.025:kind==='jackfruit'?.047:.033);
  const lobes=papaya?8:kind==='mango'?10:shrub?6:8;
  for(let l=0;l<lobes;l++){
   const angle=l*2.399963+variant,reach=(shrub?.22:kind==='mango'?.35:kind==='jackfruit'?.27:.26)*(.73+rnd()*.36),tip=grape?new T.Vector3((l-3.5)*.13,.64+rnd()*.16,(l%2-.5)*.16):new T.Vector3(Math.cos(angle)*reach,papaya?.87:shrub?.39+rnd()*.24:.64+rnd()*.30,Math.sin(angle)*reach);branch(fork,tip,papaya?.008:shrub?.010:.014);
   if(papaya){for(let k=0;k<7;k++){const a=angle+k*.82;leaf(tip.clone().add(new T.Vector3(Math.cos(a)*.12,0,Math.sin(a)*.12)),.16,.045,a,palette[k%3],.18)}continue}
   const leaves=grape?22:shrub?25:kind==='jackfruit'?37:kind==='mango'?34:32;
   for(let i=0;i<leaves;i++){const a=rnd()*Math.PI*2,y=rnd()*2-1,r=Math.sqrt(1-y*y),span=grape?.13:shrub?.16:kind==='mango'?.20:.17,at=tip.clone().add(new T.Vector3(Math.cos(a)*r*span,y*(grape?.11:shrub?.12:.16),Math.sin(a)*r*span)),len=grape?.11:kind==='jackfruit'?.070:kind==='mango'?.064:kind==='avocado'?.061:kind==='cacao'?.079:shrub?.042:.045;leaf(at,len*(.73+rnd()*.4),len*(grape?.70:kind==='mango'?.20:kind==='jackfruit'?.46:kind==='cacao'?.39:.31),rnd()*Math.PI*2,palette[i%3],rnd()*.35-.12)}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
 }
 const fruitRecords={jackfruit:[],carambola:[],citrus:[],grapes:[]};
 function fruits(rec){const {kind,p,q,scale}=rec,count=kind==='jackfruit'?4:kind==='carambola_shrub'?5:kind==='citrus'||kind==='citrus_shrub'?5:0;
  for(let i=0;i<count;i++){const a=i*2.39996+hash(p.x,p.z,832)*6.28,u=hash(p.x+i,p.z,831),local=kind==='jackfruit'?new T.Vector3(Math.cos(a)*(.051+i*.009),.31+i*.13,Math.sin(a)*(.051+i*.009)):new T.Vector3(Math.cos(a)*(.18+u*.12),.38+(i%3)*.11,Math.sin(a)*(.18+u*.12));local.multiply(scale).applyQuaternion(q).add(p);const fruit=kind==='jackfruit'?'jackfruit':kind==='carambola_shrub'?'carambola':'citrus',size=fruit==='jackfruit'?.0058+u*.0017:fruit==='carambola'?.0011+u*.0005:.0018+u*.0008;
   fruitRecords[fruit].push({p:local,q:new T.Quaternion().setFromAxisAngle(axis,a),scale:new T.Vector3(size,fruit==='jackfruit'?size*2.05:size,fruit==='jackfruit'?size*.93:size)});report.fruit[fruit]++;
  }
 }
 function batch(name,g,mat,records,role='vegetation'){
  if(!records.length){g.dispose();return null}geometries.add(g);materials.add(mat);const mesh=new T.InstancedMesh(g,mat,records.length);for(let i=0;i<records.length;i++){const r=records[i];m.compose(r.p,r.q||new T.Quaternion(),r.scale);mesh.setMatrixAt(i,m)}mesh.name=name;mesh.userData={role,piece_id:'F-diverse-production',foodIdentity:true};mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);report.batches++;report.triangles+=(g.index?g.index.count:g.attributes.position.count)/3*records.length;return mesh;
 }
 for(const {kind,variant,records}of batches.values()){batch('Food forest / '+kind+' family '+variant,treeGeometry(kind,variant),material,records);for(const r of records)fruits(r)}
 // Fruit is intentionally a little oversized at the hero's landscape scale.
 for(const [kind,records]of Object.entries(fruitRecords)){
  if(kind==='grapes')continue;const g=new T.SphereGeometry(1,kind==='jackfruit'?10:7,kind==='jackfruit'?8:5);
  if(kind==='jackfruit'){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),bump=1+.055*Math.sin(Math.atan2(z,x)*19+y*25)*Math.sin(y*33);p.setXYZ(i,x*bump,y,z*bump)}g.computeVertexNormals()}
  batch('Food forest / visible '+kind+' fruit',g,new T.MeshStandardMaterial({name:'Edible fruit / '+kind,color:kind==='jackfruit'?0x9ba747:kind==='carambola'?0xf3ce46:0xe7ad37,roughness:.85}),records,'edible_fruit');
 }
 // The upper hillside has complete narrow grape terraces, trained on timber
 // posts, while the lower fields retain rice and their individual boundaries.
 const vines=[],posts=[],grapes=[],wirePositions=[];
 for(let row=0;row<5;row++){
  const target=.10+(11+row)*.022+.008;let previous=null,n=0;
  for(let i=0;i<=39;i++){
   const x=-.93+i/39*.61;let low=.90,high=1.65;for(let j=0;j<18;j++){const mid=(low+high)/2;if(riceReferenceHeight(x,mid)<target)low=mid;else high=mid}const z=(low+high)/2,h=terrainSampler(x,z,NaN);if(!Number.isFinite(h)||!foodOwnerAt(x,z)||Math.abs(riceReferenceHeight(x,z)-target)>.004){previous=null;continue}
   const at=new T.Vector3(x,h+.001,z),post=at.clone().add(new T.Vector3(0,.038,0));if(previous&&previous.distanceTo(post)<.038)wirePositions.push(...previous.toArray(),...post.toArray());previous=post;n++;
   if(i%4===0)posts.push({p:at.clone().add(new T.Vector3(0,.025,0)),scale:new T.Vector3(.0024,.050,.0024)});
   if(i%2===0){vines.push({p:at.clone().add(new T.Vector3(0,.004,0)),q:new T.Quaternion(),scale:new T.Vector3(.060,.055,.038)});for(let k=0;k<3;k++){grapes.push({p:at.clone().add(new T.Vector3((k-1)*.003,.025+(k%2)*.003,-.009)),scale:new T.Vector3(.0019,.0030,.0019)});report.fruit.grapes++}}
  }
  if(n>0)report.zones.grapes.rows++;
 }
 batch('Food production / upper terrace grape vines',treeGeometry('grape',0),material,vines);batch('Food production / grape trellis posts',new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0x927450,roughness:1}),posts,'grape_trellis');batch('Food production / purple grape clusters',new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0x786097,roughness:.85}),grapes,'edible_fruit');
 const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(wirePositions,3));const wm=new T.LineBasicMaterial({color:0x8c8d79,transparent:true,opacity:.65}),wire=new T.LineSegments(wg,wm);wire.name='Grape terrace / continuous trellis wires';root.add(wire);geometries.add(wg);materials.add(wm);report.zones.grapes.vines=vines.length;
 for(const a of anchors)forestAnchors.push(a);
 // Remove stale mycelium anchors at roots whose complete plant was retired.
 const retired=[];for(let i=forestAnchors.length-1;i>=0;i--){const a=forestAnchors[i];if(!anchors.includes(a)&&suppressed.has(a.p.x.toFixed(5)+','+a.p.z.toFixed(5))){retired.push({at:i,anchor:a});forestAnchors.splice(i,1)}}
 scene.updateMatrixWorld(true);if(api.renderer)api.renderer.shadowMap.needsUpdate=true;requestRender();
 const control={root,report,focus(){window.heroInspection?.setUnlocked(true);api.inspection?.focus.set(0,.24,1.25);camera.clearViewOffset();camera.zoom=1.35;camera.up.set(0,1,0);camera.position.set(-.35,1.40,-1.0);camera.lookAt(0,.24,1.25);camera.updateProjectionMatrix();window.heroInnerBiomes?.guide?.setVisible(false);requestRender()},undo(){for(const {mesh,records}of saved){for(const r of records)mesh.setMatrixAt(r.id,r.matrix);mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}for(const r of bankSaved){r.mesh.material=r.material;if(r.color)r.mesh.geometry.setAttribute('color',r.color);else r.mesh.geometry.deleteAttribute('color')}for(const a of anchors){const i=forestAnchors.indexOf(a);if(i>=0)forestAnchors.splice(i,1)}for(const r of retired.reverse())forestAnchors.splice(r.at,0,r.anchor);root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();requestRender()}};window.heroFoodIdentity=control;return report;
}

// Integrated material grading: no screen filter, extra framebuffer or texture.
// Preserve the waterfall and surface-water shaders, UI and fluorescent network.
function installWorldGrade(){
 const enabled=new URLSearchParams(location.search).get('grade')!=='off';
 const strength={value:enabled?1:0},hazeColor={value:new THREE.Color('#a4bac3')},seen=new Set();
 let materials=0;
 scene.traverse(mesh=>{
  if(!mesh.isMesh||/water|foam|spray|mycelium/i.test(mesh.userData.role||''))return;
  for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(!mat?.isMeshStandardMaterial||seen.has(mat)||mat.userData.nlWater)continue;seen.add(mat);
   const previous=mat.onBeforeCompile,cache=mat.customProgramCacheKey.bind(mat);
   const family=String(mesh.userData.piece_id||'');
   const tint=/^R/.test(family)?[.94,1.015,1.035]:/^F/.test(family)?[1.035,1.005,.945]:/^W/.test(family)?[.96,1.02,1.015]:[1,1,1];
   mat.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    shader.uniforms.uWorldGrade=strength;shader.uniforms.uWorldHaze=hazeColor;
    shader.fragmentShader='uniform float uWorldGrade; uniform vec3 uWorldHaze;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     vec3 biomeTint=vec3(${tint.join(',')});
     float botanicalLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
     diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(botanicalLuma),diffuseColor.rgb,.92)*biomeTint,uWorldGrade);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`#include <tonemapping_fragment>
     // Gentle contrast pivot retains texture in shade and rolls off highlights.
     vec3 graded=max(vec3(0.0),(gl_FragColor.rgb-vec3(.18))*1.075+vec3(.18));
     float depthHaze=smoothstep(2.2,5.4,length(vViewPosition))*.065;
     graded=mix(graded,uWorldHaze,depthHaze);
     gl_FragColor.rgb=mix(gl_FragColor.rgb,graded,uWorldGrade);`);
   };
   mat.customProgramCacheKey=()=>cache()+'|world-grade-01|'+tint.join(',');mat.needsUpdate=true;materials++;
  }
 });
 const update=()=>{const day=effects.state.day;strength.value=(window.heroGrade.enabled?1:0)*(1-THREE.MathUtils.smoothstep(day,.65,1))*(1-THREE.MathUtils.smoothstep(day,1.08,2));hazeColor.value.set('#'+stage.dataset.sky).lerp(new THREE.Color('#a4bac3'),.65);stage.dataset.colourGrade=window.heroGrade.enabled?'natural-depth-01':'off';requestRender()};
 window.heroGrade={enabled,materials,set(value){this.enabled=!!value;effects.setDaylight(effects.state.day);update()}};
 window.addEventListener('nl-lighting-change',update);update();
}

function buildMycelium(){
 const cell=.095,bins=new Map();
 for(const anchor of forestAnchors){const key=`${Math.round(anchor.p.x/cell)},${Math.round(anchor.p.z/cell)}`,bin=bins.get(key)||{sum:new THREE.Vector3(),count:0};bin.sum.add(anchor.p);bin.count++;bins.set(key,bin)}
 const nodes=[...bins.values()].filter(bin=>bin.count>=3).map(bin=>({p:groundPoint(bin.sum.multiplyScalar(1/bin.count),.006),density:bin.count}));
 const primary=[],fine=[],linked=new Set();
 const add=(out,a,b,wobble=0)=>{
 const d=b.clone().sub(a),side=new THREE.Vector3(-d.z,0,d.x).normalize(),steps=Math.max(3,Math.ceil(Math.hypot(d.x,d.z)/.008));
 let prev=a.clone();prev.y=terrainSampler(prev.x,prev.z,NaN)+.004;
 for(let s=1;s<=steps;s++){
  const t=s/steps,next=a.clone().lerp(b,t);if(s<steps)next.addScaledVector(side,Math.sin((a.x+a.z+b.x+b.z)*91+t*6.9)*wobble);
  next.y=terrainSampler(next.x,next.z,NaN)+.004;
  const horizontal=Math.hypot(next.x-prev.x,next.z-prev.z);
  if(Number.isFinite(prev.y)&&Number.isFinite(next.y)&&Math.abs(next.y-prev.y)<=Math.max(.008,horizontal*1.5))out.push(...prev.toArray(),...next.toArray());
  prev=next;
 }
 };
 for(let i=0;i<nodes.length;i++){const near=nodes.map((node,j)=>({j,d:j===i?Infinity:nodes[i].p.distanceTo(node.p)})).filter(x=>x.d<.31).sort((a,b)=>a.d-b.d).slice(0,Math.min(4,2+Math.floor(nodes[i].density/8)));for(const edge of near){const key=i<edge.j?`${i}:${edge.j}`:`${edge.j}:${i}`;if(linked.has(key))continue;linked.add(key);add(primary,nodes[i].p,nodes[edge.j].p,.006)}}
 for(let i=0;i<nodes.length;i++){const a=nodes[i].p,branches=3+Math.min(4,Math.floor(nodes[i].density/4));for(let k=0;k<branches;k++){const angle=(i*2.399+k*6.283/branches)%6.283,length=.035+.055*((i*17+k*23)%13)/13,b=a.clone().add(new THREE.Vector3(Math.cos(angle)*length,.0005,Math.sin(angle)*length));add(fine,a,b,.004);for(let t=0;t<2;t++){const q=b.clone().lerp(a,.23+t*.25),tip=q.clone().add(new THREE.Vector3(Math.cos(angle+(t?1:-1)*.8)*length*.38,0,Math.sin(angle+(t?1:-1)*.8)*length*.38));add(fine,q,tip,.002)}}}
 const line=(positions,color,opacity)=>new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)),new THREE.LineBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true}));
 const halo=line(primary,0x00ff48,.22),core=line(primary,0x00b83a,.88),filaments=line(fine,0x00d84a,.62);halo.scale.set(1,1,1);
 const pointGeometry=new THREE.BufferGeometry().setFromPoints(nodes.map(n=>n.p));const spores=new THREE.Points(pointGeometry,new THREE.PointsMaterial({color:0x52ff85,size:.005,transparent:true,opacity:.82,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));
 myceliumGroup.add(halo,core,filaments,spores);myceliumGroup.visible=false;stage.dataset.myceliumNodes=String(nodes.length);stage.dataset.myceliumLinks=String(linked.size);stage.dataset.myceliumFilaments=String(fine.length/6);stage.dataset.myceliumSource='dense-forest-tree-placement';
}
function repairWetlandBank(){
 const basin=scene.children.find(o=>o.userData?.piece_id==='W-wetland-basin');if(!basin)return;
 const positions=[],indices=[],valid=[],rings=16,steps=96;
 // Rebuild the same ellipse with enough surface samples to clip against the bank.
 for(let r=0;r<=rings;r++)for(let j=0;j<=steps;j++){
  const theta=j/steps*Math.PI*2,x=basin.position.x+Math.cos(theta)*.19*basin.scale.x*r/rings,z=basin.position.z+Math.sin(theta)*.19*r/rings;
  const y=basin.position.y,h=terrainSampler(x,z,NaN);
  positions.push(x,y,z);valid.push(Number.isFinite(h)&&h<=y+.012);
 }
 let clipped=0;
 for(let r=0;r<rings;r++)for(let j=0;j<steps;j++){
  const a=r*(steps+1)+j,b=a+1,c=a+steps+1,d=c+1;
  for(const tri of [[a,c,b],[b,c,d]]){
   if(r===0&&tri[0]===a)continue; // The first ring collapses to one centre point.
   const x=tri.reduce((s,i)=>s+positions[i*3],0)/3,z=tri.reduce((s,i)=>s+positions[i*3+2],0)/3;
   if(tri.every(i=>valid[i])&&Number.isFinite(terrainSampler(x,z,NaN)))indices.push(...tri);else clipped++;
  }
 }
 if(!indices.length){basin.visible=false;stage.dataset.wetlandBankStatus='no-supported-surface';return}
 const old=basin.geometry,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();basin.geometry=g;basin.position.set(0,0,0);basin.scale.set(1,1,1);basin.updateMatrix();old.dispose();
 // The concentric torus foam projected beyond the terrain and looked like a water ring.
 for(const mesh of [...waterfallDrops])if(mesh.userData.role==='wetland_pool_foam'){scene.remove(mesh);waterfallDrops.splice(waterfallDrops.indexOf(mesh),1);mesh.geometry.dispose();mesh.material.dispose()}
 stage.dataset.wetlandBankStatus='terrain-clipped';stage.dataset.wetlandTrianglesClipped=String(clipped);stage.dataset.wetlandTriangles=String(indices.length/3);
}

// Drape both banks and channels over the terrain, including their edges.
function groundedSwaleGeometry(curve,width,zOffset,isBerm){
 const positions=[],indices=[],supported=[],segments=128,cross=6;
 for(let i=0;i<=segments;i++){
  const p=curve.getPoint(i/segments),t=curve.getTangent(i/segments),length=Math.hypot(t.x,t.z)||1;
  for(let j=0;j<=cross;j++){
   const u=j/cross*2-1,x=p.x-t.z/length*width*u*Math.pow(Math.sin(Math.PI*i/segments),.25),z=p.z+zOffset+t.x/length*width*u*Math.pow(Math.sin(Math.PI*i/segments),.25),h=terrainSampler(x,z,NaN);
   const clear=biomeBaseline||!foodOriginalSampler||(!isNorthwestPaddy(x,z)&&foodPondDistance(x,z).distance>1.2&&!!foodOwnerAt(x,z));
   supported.push(Number.isFinite(h)&&clear);
   positions.push(x,isBerm?(Number.isFinite(h)?h:p.y)+.001+.004*(1-u*u):zOffset===0?(Number.isFinite(h)?h:0)+.002:p.y,z);
  }
 }
 for(let i=0;i<segments;i++)for(let j=0;j<cross;j++){
  const a=i*(cross+1)+j,b=a+1,c=a+cross+1,d=c+1;
  for(const tri of [[a,b,c],[b,d,c]])if(tri.every(v=>supported[v]))indices.push(...tri);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 stage.dataset.swaleSurface='terrain-conforming-bank-and-channel';return g;
}


function batchSwalePlants(){
 const groups=new Map();
 for(const mesh of foodSwaleGroup.children){
  if(!['swale_fruit_tree','swale_guild_shrub'].includes(mesh.userData.role))continue;
  const key=mesh.geometry.uuid+':'+mesh.material.uuid;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(mesh);
 }
 let instances=0;
 for(const items of groups.values()){
  const first=items[0],batch=new THREE.InstancedMesh(first.geometry,first.material,items.length);
  batch.userData={...first.userData};batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
  items.forEach((item,i)=>{item.updateMatrix();batch.setMatrixAt(i,item.matrix);foodSwaleGroup.remove(item)});
  batch.computeBoundingSphere();foodSwaleGroup.add(batch);instances+=items.length;
 }
 stage.dataset.swalePlantInstances=String(instances);stage.dataset.swalePlantBatches=String(groups.size);
}

function buildFoodForestSwales(){
 const soil=new THREE.MeshStandardMaterial({color:0x694e2f,roughness:1}),water=new THREE.MeshStandardMaterial({color:0x276f68,roughness:.38,metalness:.04,emissive:0x082d25,emissiveIntensity:.12}),trunk=new THREE.MeshStandardMaterial({color:0x4c3422,roughness:1}),fruitMats=[0x6c963e,0x82a845,0x477c3d,0x9aae48].map(color=>new THREE.MeshStandardMaterial({color,roughness:.94})),shrubMats=[0x547f39,0x789a42,0x376c3c].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
 const fruitGeo=new THREE.IcosahedronGeometry(.034,1),shrubGeo=new THREE.IcosahedronGeometry(.018,1),trunkGeo=new THREE.CylinderGeometry(.004,.006,.055,6);let fruitCount=0,shrubCount=0;
 for(let row=0;row<payload.foodContours.length;row++){
  const points=payload.foodContours[row].map(p=>new THREE.Vector3(...p));
  const curve=new THREE.CatmullRomCurve3(points),berm=new THREE.Mesh(groundedSwaleGeometry(curve,.014,0,true),soil),channel=new THREE.Mesh(groundedSwaleGeometry(curve,.0065,-.019,false),water);berm.userData={role:'swale_berm',piece_id:'F-food-forest'};channel.userData={role:'swale_water',piece_id:'F-food-forest'};berm.receiveShadow=true;channel.renderOrder=4;foodSwaleGroup.add(berm);effects.registerWater(channel);
  for(let i=1;i<21;i+=3){const p=curve.getPoint(i/22),scale=.82+((row*7+i*3)%9)/18,stem=new THREE.Mesh(trunkGeo,trunk),crown=new THREE.Mesh(fruitGeo,fruitMats[(row+i)%fruitMats.length]);stem.position.set(p.x,terrainSampler(p.x,p.z+.018,p.y)+.028,p.z+.018);crown.position.set(p.x,terrainSampler(p.x,p.z+.018,p.y)+.068*scale,p.z+.018);stem.scale.set(scale,scale,scale);crown.scale.set(scale,1.05*scale,scale);stem.userData=crown.userData={role:'swale_fruit_tree',piece_id:'F-food-forest'};stem.castShadow=crown.castShadow=true;foodSwaleGroup.add(stem,crown);fruitCount++}
  for(let i=0;i<44;i++){const t=(i+.35)/44,p=curve.getPoint(t),side=(i%2?1:-1)*(.023+.011*((i*7+row)%4)),bush=new THREE.Mesh(shrubGeo,shrubMats[(i+row)%shrubMats.length]);bush.position.set(p.x,terrainSampler(p.x,p.z+side,p.y)+.018,p.z+side);const s=.7+((i*11+row*3)%8)/10;bush.scale.set(s,0.72*s,1.15*s);bush.userData={role:'swale_guild_shrub',piece_id:'F-food-forest'};bush.castShadow=true;foodSwaleGroup.add(bush);shrubCount++}
 }
 stage.dataset.swaleRows='6';stage.dataset.swaleFruitTrees=String(fruitCount);stage.dataset.swaleShrubs=String(shrubCount);stage.dataset.foodForestLayout='contour-swale-guilds';
}
window.addEventListener('nl-lighting-change',event=>updateMyceliumBlend(event.detail?.value||0));
function makeLabel(piece){
 const name=piece.id.endsWith('1')?piece.family:null,text=name?`${piece.id} · ${name}`:piece.id,c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='600 30px Arial';const w=Math.ceil(ctx.measureText(text).width)+26;c.width=w;c.height=58;ctx.font='600 30px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(250,251,246,.85)';ctx.beginPath();ctx.roundRect(0,3,w,50,12);ctx.fill();ctx.fillStyle='#344837';ctx.fillText(text,w/2,29);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));sprite.scale.set(w*.00060,.0348,1);sprite.renderOrder=50;labelGroup.add(sprite);labels.push({piece,sprite,canvas:c});
}
function placeLabels(){window.heroInnerBiomes?.guide?.update();
 if(!loaded)return;camera.updateMatrixWorld(true);const visible=[];
 for(const item of labels){
  let best=null,bestScore=Infinity;const pref=new THREE.Vector3(...item.piece.label_position).project(camera);
  for(const point of item.piece.label_candidates){const projected=new THREE.Vector3(...point).project(camera);if(projected.z>=1||projected.z<=-1||Math.abs(projected.x)>.91||projected.y<-.88||projected.y>.72)continue;const score=(projected.x-pref.x)**2+(projected.y-pref.y)**2;if(score<bestScore){best=point;bestScore=score}}
  item.sprite.visible=!!best;if(best){item.sprite.position.fromArray(best);const depth=-new THREE.Vector3(...best).applyMatrix4(camera.matrixWorldInverse).z,h=26*2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*depth/stage.clientHeight;item.sprite.scale.set(h*item.canvas.width/item.canvas.height,h,1);visible.push(item.piece.id)}
 }
 stage.dataset.visiblePieces=visible.join(',');
}
function select(id){
 selected=id;for(const [pid,mesh] of pieces){mesh.material.emissive.set(pid===id?0x6f7851:0x000000);mesh.material.emissiveIntensity=pid===id?.15:0}stage.dataset.selected=id||'';if(id){const p=plan.pieces.find(p=>p.id===id);stage.setAttribute('aria-label',`${p.id}, ${p.family}, ${p.name}. Drag to roll; scroll to explore.`)}requestRender();
}
// These are completed preparation steps, not invented download percentages.
const worldLoadSteps=['Read terrain','Build biome planting','Attach landscape edges','Build shelter belts','Shape water and food systems','Plant the inner biomes','Prepare living systems','Compile graphics'];
async function worldLoadStep(index){
 let panel=document.querySelector('[data-world-preparation]');
 if(!panel){panel=document.createElement('div');panel.dataset.worldPreparation='';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');panel.style.cssText='position:fixed;inset:0;z-index:9999;background:#10291ff2;color:#f1f2df;display:grid;place-content:center;gap:14px;padding:30px;font:15px/1.5 system-ui;text-align:center';panel.innerHTML='<strong>Preparing your living world</strong><span data-world-phase></span><progress max="8" value="0" aria-label="Completed world preparation steps" style="width:min(320px,80vw);height:5px;accent-color:#d9e7b9"></progress><small>Keep this page open. Detailed planting takes longer on smaller devices.</small>';document.body.append(panel)}
 panel.querySelector('[data-world-phase]').textContent=worldLoadSteps[index]+' · '+(index+1)+' of '+worldLoadSteps.length;
 panel.querySelector('progress').value=index;document.documentElement.dataset.worldLoadStep=String(index);
 await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
}
async function finishWorldLoad(){
 document.documentElement.dataset.worldLoadStep='8';
 // Wait for an actual drawn frame, after materials have compiled.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 document.querySelector('[data-world-preparation]')?.remove();
}

async function load(){
 await worldLoadStep(0);
 const buffer=await(await fetch(payload.model)).arrayBuffer(),dv=new DataView(buffer);let doc,bin;for(let c=12;c<buffer.byteLength;){const n=dv.getUint32(c,true),t=dv.getUint32(c+4,true);if(t===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,c+8,n)));if(t===0x004e4942)bin=c+8;c+=n+8}
 if(!doc||bin===undefined)throw Error('Incomplete wheel model');
 const mats=doc.materials.map(m=>{const p=m.pbrMetallicRoughness;return new THREE.MeshStandardMaterial({name:m.name,color:new THREE.Color().setRGB(...p.baseColorFactor.slice(0,3)),roughness:1,side:m.doubleSided?THREE.DoubleSide:THREE.FrontSide})});
 for(const node of doc.nodes){if(payload.presentation?.greenInnerWall&&node.name==='Reserved inner drop')continue;const p=doc.meshes[node.mesh].primitives[0],g=new THREE.BufferGeometry();g.setAttribute('position',attr(doc,buffer,bin,p.attributes.POSITION));g.setAttribute('normal',attr(doc,buffer,bin,p.attributes.NORMAL));g.setIndex(attr(doc,buffer,bin,p.indices));const mesh=new THREE.Mesh(g,mats[p.material].clone());mesh.userData=node.extras||{};mountMesh(mesh);if(mesh.userData.piece_id)pieces.set(mesh.userData.piece_id,mesh)}
 if(payload.presentation?.showPuzzleBorders!==false){
  for(const b of plan.borders){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));g.setIndex(b.indices);const lines=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x6e7f64,transparent:true,opacity:.36}));lines.renderOrder=2;scene.add(lines)}
  for(const edge of plan.family_edges){const g=new THREE.BufferGeometry().setFromPoints(edge.map(p=>new THREE.Vector3(...p)));scene.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0x4b634a,transparent:true,opacity:.78})))}
 }
 await worldLoadStep(1);if(payload.contentModel)await loadBiomeContent();
 await worldLoadStep(2);if(payload.edgeModel)await loadSupplementalModel(payload.edgeModel);
 await worldLoadStep(3);if(payload.windbreakModel)await loadSupplementalModel(payload.windbreakModel);
 finalizeCliffCrests();
 for(const fall of pendingWaterfallSources)mountConnectedWaterfall(fall);
 buildTerrainSampler();
 await worldLoadStep(4);
 prepareFoodEarthworks();
 repairWetlandBank();
 buildProductionWater();
 buildFoodForestSwales();
 batchSwalePlants();
 buildOtherBiomeDesign();
 refineLivingMap({THREE,scene,pieces,payload,terrainSampler,requestRender,registerWater:mesh=>effects.registerWater(mesh)});
 buildTerrainSampler();
 finishInnerLandscape({THREE,scene,pieces,payload,terrainSampler,requestRender,rockWallMesh,buildTerrainSampler,getTerrainSampler:()=>terrainSampler});
 repairFoodNotch({THREE,scene,pieces,payload,rockWallMesh,requestRender,buildTerrainSampler,getTerrainSampler:()=>terrainSampler});
 await worldLoadStep(5);
 buildInnerBiomes();
 if(!biomeBaseline)refineFoodIdentity({THREE,scene,camera,inspection,payload,terrainSampler,requestRender,foodOwnerAt,foodPondDistance,foodChannelDistance,riceReferenceHeight,forestAnchors,innerGeometry,biomeHash,renderer});
 await worldLoadStep(6);
 buildMycelium();
 installWorldGrade();
 if(payload.birdModels)window.heroBirds=await loadBirdFlights({scene,camera,stage,requestRender,models:payload.birdModels,onTick:t=>effects.tick(t)});
 renderer.shadowMap.needsUpdate=true;
 const finalTerrain=[...pieces].filter(([id,mesh])=>mesh.userData.role==='terrain'&&mesh.visible).map(([id])=>id).sort();if(finalTerrain.length!==25)throw Error('A terrain replacement is hidden or missing');stage.dataset.loadedTerrainPieces=finalTerrain.join(',');
 if(payload.presentation?.showPieceLabels!==false)plan.pieces.forEach(makeLabel);
 await worldLoadStep(7);
 loaded=true;status.hidden=true;stage.dataset.biomeDesign=biomeDesign.version;window.heroBiomeDesign=biomeDesign;stage.dataset.ready='true';configureHero();installInspection();installBiomeWeather();configureCentral();installInnerBiomeGuide();installBiomeClouds();if(new URLSearchParams(location.search).get('foodReview')==='1')window.heroFoodIdentity?.focus();installNourishlandLayer({THREE,scene,camera,stage,pieces,payload,terrainSampler,renderer,requestRender,createLivingSphereGeometry,createTotemSculptureGeometry,foodPondDistance,foodChannelDistance,ricePatchWeight});stage.dataset.layoutLocked='true';stage.dataset.pieces='25';stage.dataset.families='5';stage.dataset.pieceLabelCount=String(labels.length);stage.dataset.puzzleBordersVisible=String(payload.presentation?.showPuzzleBorders!==false);requestRender();await finishWorldLoad();
}
async function loadSupplementalModel(url){
 const response=await fetch(url),buffer=payload.edgeCompression==='gzip'?await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await response.arrayBuffer(),dv=new DataView(buffer);let doc,bin;for(let c=12;c<buffer.byteLength;){const n=dv.getUint32(c,true),t=dv.getUint32(c+4,true);if(t===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,c+8,n)));if(t===0x004e4942)bin=c+8;c+=n+8}if(!doc||bin===undefined||doc.images?.length)throw Error('Vertical faces must be genuine geometry without image materials');
 const materials=(doc.materials||[]).map(m=>{const p=m.pbrMetallicRoughness||{},col=p.baseColorFactor||[1,1,1,1];return new THREE.MeshStandardMaterial({name:m.name,color:new THREE.Color().setRGB(...col.slice(0,3)),roughness:p.roughnessFactor??1,metalness:p.metallicFactor??0,side:m.doubleSided?THREE.DoubleSide:THREE.FrontSide})});
 const refs=new Map();function visit(id,parent){const n=doc.nodes[id],local=new THREE.Matrix4();if(n.matrix)local.fromArray(n.matrix);else local.compose(new THREE.Vector3(...(n.translation||[0,0,0])),new THREE.Quaternion(...(n.rotation||[0,0,0,1])),new THREE.Vector3(...(n.scale||[1,1,1])));const matrix=parent.clone().multiply(local);if(n.mesh!==undefined){if(!refs.has(n.mesh))refs.set(n.mesh,[]);refs.get(n.mesh).push({matrix,extras:n.extras||{},name:n.name||''})}for(const c of n.children||[])visit(c,matrix)}for(const id of doc.scenes[doc.scene||0].nodes)visit(id,new THREE.Matrix4());
 let count=0,waterfalls=0,roots=0,removedWindbreak=0;for(const [id,rawItems]of refs){const items=rawItems.filter(item=>{const e=item.extras||{},p=new THREE.Vector3().setFromMatrixPosition(item.matrix),marked=e.role==='vegetation'&&(Number(e.windbreak_id)===2||(Number(e.windbreak_id)===1&&p.z>1.70&&p.x<.28));if(marked)removedWindbreak++;return !marked});if(!items.length)continue;refineBiomeInstances(items);if(!items.length)continue;for(const [primitiveIndex,p] of doc.meshes[id].primitives.entries()){const g=new THREE.BufferGeometry();g.setAttribute('position',attr(doc,buffer,bin,p.attributes.POSITION));if(p.attributes.NORMAL!==undefined)g.setAttribute('normal',attr(doc,buffer,bin,p.attributes.NORMAL));else g.computeVertexNormals();if(p.attributes.COLOR_0!==undefined)g.setAttribute('color',attr(doc,buffer,bin,p.attributes.COLOR_0));if(p.indices!==undefined)g.setIndex(attr(doc,buffer,bin,p.indices));attachLeafLod(g,payload.leafLods[url===payload.windbreakModel?'windbreakModel':'edgeModel']?.[id+':'+primitiveIndex]);const material=(materials[p.material]||new THREE.MeshStandardMaterial({color:0x6f7358,roughness:1})).clone();material.vertexColors=!!g.getAttribute('color');let mesh;if(items.length>1){mesh=new THREE.InstancedMesh(g,material,items.length);items.forEach((x,i)=>mesh.setMatrixAt(i,x.matrix));mesh.computeBoundingSphere()}else{mesh=new THREE.Mesh(g,material);mesh.matrix.copy(items[0].matrix);mesh.matrixAutoUpdate=false}tintBiomeInstances(mesh,items,material);mesh.userData=items[0].extras;mesh.castShadow=!['waterfall','foam'].includes(mesh.userData.role);mesh.receiveShadow=true;mountMesh(mesh);count+=items.length;if(mesh.userData.role==='waterfall')waterfalls+=items.length;if(mesh.userData.role==='root')roots+=items.length}}
 stage.dataset.removedMarkedWindbreakTrees=String(Number(stage.dataset.removedMarkedWindbreakTrees||0)+removedWindbreak);
 stage.dataset.edgeGeometryObjects=String(Number(stage.dataset.edgeGeometryObjects||0)+count);stage.dataset.waterfallObjects=String(Number(stage.dataset.waterfallObjects||0)+waterfalls);stage.dataset.rootObjects=String(Number(stage.dataset.rootObjects||0)+roots);stage.dataset.verticalFacesLoaded='true';
}
async function loadBiomeContent(){
 const response=await fetch(payload.contentModel),buffer=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(),dv=new DataView(buffer);let doc,bin;for(let c=12;c<buffer.byteLength;){const n=dv.getUint32(c,true),t=dv.getUint32(c+4,true);if(t===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,c+8,n)));if(t===0x004e4942)bin=c+8;c+=n+8}if(!doc||bin===undefined||doc.images?.length)throw Error('The biome must contain genuine geometry without scenic image materials');
 const materials=doc.materials.map(m=>{const p=m.pbrMetallicRoughness||{},col=p.baseColorFactor||[1,1,1,1];return new THREE.MeshStandardMaterial({name:m.name,color:new THREE.Color().setRGB(...col.slice(0,3)),roughness:p.roughnessFactor??1,metalness:p.metallicFactor??0,side:m.doubleSided?THREE.DoubleSide:THREE.FrontSide})});
 const refs=new Map();function visit(id,parent){const n=doc.nodes[id],local=new THREE.Matrix4();if(n.matrix)local.fromArray(n.matrix);else local.compose(new THREE.Vector3(...(n.translation||[0,0,0])),new THREE.Quaternion(...(n.rotation||[0,0,0,1])),new THREE.Vector3(...(n.scale||[1,1,1])));const matrix=parent.clone().multiply(local);const replacedFood=n.extras?.piece_id?.startsWith('F')&&n.extras?.role!=='water';if(n.mesh!==undefined&&!replacedFood){if(!refs.has(n.mesh))refs.set(n.mesh,[]);refs.get(n.mesh).push({matrix,extras:n.extras||{}})}for(const c of n.children||[])visit(c,matrix)}for(const id of doc.scenes[doc.scene||0].nodes)visit(id,new THREE.Matrix4());
 let count=0;for(const [id,items]of refs){refineBiomeInstances(items);if(!items.length)continue;for(const [primitiveIndex,p] of doc.meshes[id].primitives.entries()){const g=new THREE.BufferGeometry();g.setAttribute('position',attr(doc,buffer,bin,p.attributes.POSITION));if(p.attributes.NORMAL!==undefined)g.setAttribute('normal',attr(doc,buffer,bin,p.attributes.NORMAL));else g.computeVertexNormals();if(p.attributes.COLOR_0!==undefined)g.setAttribute('color',attr(doc,buffer,bin,p.attributes.COLOR_0));if(p.indices!==undefined)g.setIndex(attr(doc,buffer,bin,p.indices));attachLeafLod(g,payload.leafLods.contentModel?.[id+':'+primitiveIndex]);const material=materials[p.material].clone();material.vertexColors=!!g.getAttribute('color');let mesh;
  if(items.length>1){mesh=new THREE.InstancedMesh(g,material,items.length);items.forEach((x,i)=>mesh.setMatrixAt(i,x.matrix));mesh.computeBoundingSphere()}else{mesh=new THREE.Mesh(g,material);mesh.matrix.copy(items[0].matrix);mesh.matrixAutoUpdate=false}tintBiomeInstances(mesh,items,material);mesh.userData=items[0].extras;mesh.castShadow=!['water','foam'].includes(mesh.userData.role)&&!/water|stream|thread/i.test(material.name);mesh.receiveShadow=true;mountMesh(mesh);count+=items.length;
  if(items[0].extras.role==='terrain'){const pid=items[0].extras.piece_id;const old=pieces.get(pid);if(old&&old!==mesh)old.visible=false;pieces.set(pid,mesh)}
 }}
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;sun.castShadow=true;sun.shadow.mapSize.set(softwareGPU?768:2048,softwareGPU?768:2048);Object.assign(sun.shadow.camera,{left:-2.8,right:2.8,top:2.8,bottom:-2.8,near:.1,far:15});sun.shadow.normalBias=.0007;sun.shadow.bias=-.00005;
 const actualFilled=[...pieces].filter(([id,mesh])=>mesh.userData.role==='terrain').map(([id])=>id).sort();
 const expectedFilled=[...(payload.filledPieces||[])].filter(id=>!id.startsWith('F')).sort();
 if(JSON.stringify(actualFilled)!==JSON.stringify(expectedFilled))throw Error('Loaded biome slots do not match the assembly');
 stage.dataset.filledPieces=(payload.filledPieces||[]).join(',');stage.dataset.biomeGeometryObjects=String(count);stage.dataset.loadedTerrainPieces=actualFilled.join(',');
}
stage.addEventListener('pointerdown',e=>{if(!loaded||document.body.hasAttribute('data-menu-open'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,axis:null,type:e.pointerType};stage.setPointerCapture(e.pointerId)});
stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y,tx=e.clientX-drag.sx,ty=e.clientY-drag.sy;if(!drag.axis&&Math.max(Math.abs(tx),Math.abs(ty))>4)drag.axis=Math.abs(tx)>Math.abs(ty)?'x':'y';if(drag.axis==='x'){state.rollDeg+=THREE.MathUtils.radToDeg(dx*(drag.type==='touch'?lock.touchRollRadiansPerPixel:lock.mouseRollRadiansPerPixel));cameraUpdate()}else if(drag.axis==='y'&&drag.type!=='touch')zoom(dy);drag.x=e.clientX;drag.y=e.clientY});
stage.addEventListener('pointermove',e=>{if(drag||!loaded)return;const rect=stage.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);pick.setFromCamera(pointer,camera);const hit=pick.intersectObjects([...pieces.values()].filter(mesh=>mesh.visible))[0],piece=hit?.object.userData.piece_id,entry=piece&&plan.pieces.find(item=>item.id===piece);hoverName.textContent=entry?.family||'';hoverName.classList.toggle('is-visible',Boolean(entry));stage.dataset.hoveredFamily=entry?.family||''});
stage.addEventListener('pointerleave',()=>{hoverName.classList.remove('is-visible');hoverName.textContent='';stage.dataset.hoveredFamily=''});
stage.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<5){const rect=stage.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);pick.setFromCamera(pointer,camera);const found=pick.intersectObjects([...pieces.values()])[0];select(found?.object.userData.piece_id||null)}drag=null});for(const event of ['pointercancel','lostpointercapture'])stage.addEventListener(event,()=>drag=null);
stage.addEventListener('wheel',e=>{if(!loaded||e.ctrlKey||e.metaKey||document.body.hasAttribute('data-menu-open'))return;e.preventDefault();zoom(e.deltaY,e.deltaMode)},{passive:false});
stage.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='r'||e.key==='R'){e.preventDefault();reset()}else if(e.key==='Home'||e.key==='End'){e.preventDefault();state.distance=e.key==='Home'?lock.farDistance:Math.max(2.24,lock.nearDistance);cameraUpdate()}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();state.rollDeg+=(e.key==='ArrowLeft'?-2:2);cameraUpdate()}else if(['ArrowUp','ArrowDown','+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='ArrowDown'||e.key==='-'?-64:64)}});
window.heroPuzzle={setLeafLod(policy){if(!['auto','original','compact'].includes(policy))throw Error('Unknown LOD policy');lodPolicy=policy;updateLeafLods(0,true);requestRender()},ready:()=>loaded,reset,select,setDistance(distance){state.distance=THREE.MathUtils.clamp(Number(distance),Math.max(2.24,lock.nearDistance),lock.farDistance);cameraUpdate()},get camera(){return camera},get state(){return {...state}},lock,plan,get visiblePieces(){return stage.dataset.visiblePieces?.split(',')||[]},project(point){camera.updateMatrixWorld(true);return new THREE.Vector3(...point).project(camera).toArray()},setOverview(){camera.up.set(0,0,-1);camera.position.set(.125,8,-.2416666783);camera.lookAt(.125,0,-.2416666783);requestRender()}};
window.heroMetrics={hotspots(){const rows=[];scene.traverseVisible(o=>{if(!o.isMesh)return;const g=o.geometry,n=o.isInstancedMesh?o.count:1;rows.push({role:o.userData.role,piece:o.userData.piece_id,name:o.material?.name,instances:n,triangles:(g.index?g.index.count:g.attributes.position.count)/3*n})});return rows.sort((a,b)=>b.triangles-a.triangles).slice(0,20)},snapshot(){
 const geometries=new Set(),attributes=new Set(),textures=new Set();let instances=0,meshes=0,logicalTriangles=0,geometryBytes=0,textureBytes=0;
 scene.traverse(o=>{if(!o.isMesh||!o.visible)return;meshes++;instances+=o.isInstancedMesh?o.count:1;const g=o.geometry;logicalTriangles+=(g.index?g.index.count:g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);geometries.add(g);if(o.instanceMatrix&&!attributes.has(o.instanceMatrix)){attributes.add(o.instanceMatrix);geometryBytes+=o.instanceMatrix.array.byteLength}for(const mat of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(mat||{}))if(value?.isTexture)textures.add(value)});
 for(const g of geometries)for(const a of [...Object.values(g.attributes),...(g.index?[g.index]:[])])if(!attributes.has(a)){attributes.add(a);geometryBytes+=a.array.byteLength}
 for(const t of textures){const image=t.image;textureBytes+=(image?.width||0)*(image?.height||0)*4*(t.generateMipmaps?4/3:1)}
 return {renderer:gpuName,software_renderer:softwareGPU,viewport:[stage.clientWidth,stage.clientHeight],pixel_ratio:renderer.getPixelRatio(),draw_calls_last_frame:renderer.info.render.calls,triangles_last_frame:renderer.info.render.triangles,visible_mesh_batches:meshes,logical_mesh_instances:instances,logical_triangles:logicalTriangles,geometry_buffer_bytes_estimate:geometryBytes,texture_bytes_estimate:textureBytes,js_heap_used_bytes:performance.memory?.usedJSHeapSize??null,js_heap_total_bytes:performance.memory?.totalJSHeapSize??null,shadow_resolution:Number(stage.dataset.shadowSize),gpu_estimate_excludes:'framebuffer, shadow targets, driver and shader overhead'}
 },renderSteadyFrame(){renderer.shadowMap.needsUpdate=false;renderer.render(scene,camera);return this.snapshot()}};
// This is an art-direction preview using the master scene, independent of site UI.
const heroMode=new URLSearchParams(location.search).has('hero');
const heroConfig={duration:24,landingDistance:2.24,revealDistance:2.37,cropZoom:1.35,rollDeg:lock.rollDeg,rollReveal:4.0};
let heroManual=false;
const heroWindTime={value:0};
// A restrained photographic moon fill keeps the rendered night legible.
// It is exclusive to the cinematic view; the editable world's light stays as authored.
const heroMoonFill=new THREE.HemisphereLight(0x9cb4d9,0x536b77,0),heroMoonAmbient=new THREE.AmbientLight(0x9cafd2,0);
if(heroMode)scene.add(heroMoonFill,heroMoonAmbient);
function heroFrame(seconds){
 const t=((seconds%heroConfig.duration)+heroConfig.duration)%heroConfig.duration,phase=t/heroConfig.duration*Math.PI*2,reveal=.5-.5*Math.cos(phase);
 state.distance=THREE.MathUtils.lerp(heroConfig.landingDistance,heroConfig.revealDistance,reveal);
 state.rollDeg=heroConfig.rollDeg+heroConfig.rollReveal*Math.sin(phase);
 camera.zoom=heroConfig.cropZoom;cameraUpdate();
 heroWindTime.value=t;
 effects.tick(t);tickBiomeWeather(t);window.heroBirds?.setTime(t);
 const moon=THREE.MathUtils.smoothstep(effects.state.day,.55,.82);heroMoonFill.intensity=moon*1.5;heroMoonAmbient.intensity=moon*.38;
 for(const drop of waterfallDrops)if(drop.material.uniforms?.uTime)drop.material.uniforms.uTime.value=t;
 for(const drop of waterfallDrops){const shader=drop.material.userData.flowShader;if(shader)shader.uniforms.uFallTime.value=t;if(drop.material.uniforms?.uFallTime)drop.material.uniforms.uFallTime.value=t}
 if(scene.fog)scene.fog.color.set('#'+stage.dataset.sky);
 updateLeafLods(t,true);renderer.render(scene,camera);queued=false;
 stage.dataset.heroTime=t.toFixed(3);stage.dataset.heroComposition='central-world-window';
}
function configureHero(){
 if(!heroMode)return;
 document.body.dataset.renderHero='true';
 const style=document.createElement('style');style.textContent='.masthead,.site-navigation,.nl-biome-navigation,.hero-hint,[data-biome-status],.piece-label,.biome-hover-name{display:none!important}';document.head.append(style);
 scene.fog=new THREE.Fog('#e5f2fb',4.5,11);
 const prepared=new Set();scene.traverse(mesh=>{
  const mat=mesh.material;if(!mesh.isMesh||!mat||prepared.has(mat)||!/foliage|leaf blade/i.test(mat.name))return;prepared.add(mat);
  mat.onBeforeCompile=shader=>{shader.uniforms.uHeroWind=heroWindTime;shader.vertexShader='uniform float uHeroWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(uHeroWind*0.2617993878+position.y*13.0+position.z*7.0)*0.002;')};mat.customProgramCacheKey=()=> 'nl-hero-gentle-foliage-1';mat.needsUpdate=true;
 });
 // Retain the two individual cranes; flock movement is reserved for the full world.
 scene.children.filter(o=>o.name.startsWith('Nourishland horizontal flight ')).forEach((o,i)=>o.visible=i>=7);
 heroFrame(0);
}
window.heroComposition={config:heroConfig,setFrame(t){heroManual=true;heroFrame(Number(t)||0)},play(){heroManual=false},get manual(){return heroManual},get enabled(){return heroMode}};

const centralPresentation={active:!!payload.centralHero||new URLSearchParams(location.search).has('central'),manual:false,initialRadius:0,orbitX:0,orbitY:0};
window.addEventListener('nl-lighting-change',()=>{if(centralPresentation.active&&scene.fog)scene.fog.color.set('#'+stage.dataset.sky)});
function centralIntro(t){
 if(!centralPresentation.active||centralPresentation.manual)return;
 const unlocked=inspection.unlocked;inspection.unlocked=false;
 state.distance=2.24;state.rollDeg=lock.rollDeg;camera.zoom=1.35;cameraUpdate();inspection.unlocked=unlocked;
 stage.dataset.presentation='live-central-3d';
}
function configureCentral(){
 if(!centralPresentation.active)return;
 if(new URLSearchParams(location.search).get('fullExperience')==='1')document.body.dataset.fullExperience='true';
 centralIntro(0);centralPresentation.initialRadius=camera.position.distanceTo(inspection.focus);inspection.unlocked=false;
 inspection.button.hidden=false;inspection.button.textContent='Unlock camera';inspection.button.setAttribute('aria-pressed','false');inspection.hint.textContent='Central view locked';
 const bar=inspection.button.parentElement;bar.style.left='10px';bar.style.right='auto';bar.dataset.centralControls='true';
 if(!document.querySelector('[data-central-style]')){const style=document.createElement('style');style.dataset.centralStyle='true';style.textContent='.masthead,header,#site-header,.skip,.nl-biome-navigation{display:none!important}@media(max-width:700px){body:not([data-full-experience]) .inspection-controls[data-central-controls] [data-unlock-camera]{display:none}}';document.head.append(style)}
 stage.dataset.cameraUnlocked='false';window.dispatchEvent(new CustomEvent('nl-presentation-change',{detail:{mode:'central'}}));
}

const inspection={unlocked:false,focus:new THREE.Vector3(.125,0,-.2416666783),pointers:new Map(),button:null,hint:null};
function inspectionRender(){
 camera.updateMatrixWorld(true);stage.dataset.cameraUnlocked=String(inspection.unlocked);
 state.distance=camera.position.distanceTo(inspection.focus)*lock.referenceDistance/state.base;
 updateLeafLods(0,true);requestRender();
}
function setInspection(unlocked){
 if(unlocked&&centralPresentation.active){centralPresentation.active=false;centralPresentation.manual=true;const bar=inspection.button?.parentElement;if(bar){delete bar.dataset.centralControls;bar.style.left='auto';bar.style.right='18px'}stage.dataset.presentation='full-world';window.dispatchEvent(new CustomEvent('nl-presentation-change',{detail:{mode:'full'}}))}
 inspection.unlocked=!!unlocked;inspection.pointers.clear();
 if(!unlocked){inspection.focus.set(.125,0,-.2416666783);state.distance=2.24;cameraUpdate()}
 if(inspection.button){inspection.button.textContent=unlocked?'Lock camera':'Unlock camera';inspection.button.setAttribute('aria-pressed',String(unlocked));inspection.hint.textContent=unlocked?'Drag to orbit · right-drag to pan · scroll or pinch to zoom':'Drag to turn · scroll to explore'}
 stage.dataset.cameraUnlocked=String(inspection.unlocked);inspectionRender();
}
function inspectionPan(dx,dy){
 const scale=camera.position.distanceTo(inspection.focus)*2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/(stage.clientHeight*camera.zoom);
 const change=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(-dx*scale).addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),dy*scale);
 if(centralPresentation.active){const next=inspection.focus.clone().add(change),origin=new THREE.Vector3(.125,0,-.2416666783);next.x=THREE.MathUtils.clamp(next.x,origin.x-.08,origin.x+.08);next.y=THREE.MathUtils.clamp(next.y,-.08,.08);next.z=THREE.MathUtils.clamp(next.z,origin.z-.08,origin.z+.08);change.copy(next).sub(inspection.focus)}
 camera.position.add(change);inspection.focus.add(change);
}
function inspectionOrbit(dx,dy){
 if(centralPresentation.active){const x=THREE.MathUtils.clamp(centralPresentation.orbitX+dx,-30,30),y=THREE.MathUtils.clamp(centralPresentation.orbitY+dy,-22,22);dx=x-centralPresentation.orbitX;dy=y-centralPresentation.orbitY;centralPresentation.orbitX=x;centralPresentation.orbitY=y}
 const offset=camera.position.clone().sub(inspection.focus),right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=camera.up.clone().normalize();
 offset.applyAxisAngle(up,-dx*.004).applyAxisAngle(right,-dy*.004);camera.up.applyAxisAngle(right,-dy*.004).normalize();camera.position.copy(inspection.focus).add(offset);camera.lookAt(inspection.focus);
}
function inspectionZoom(factor){
 const offset=camera.position.clone().sub(inspection.focus),radius=THREE.MathUtils.clamp(offset.length()*factor,centralPresentation.active?centralPresentation.initialRadius:.015,centralPresentation.active?centralPresentation.initialRadius*1.12:30);
 camera.position.copy(inspection.focus).add(offset.setLength(radius));
}
function resetInspectionView(){inspection.focus.set(.125,0,-.2416666783);setInspection(false);reset();window.heroPuzzle.setDistance(2.24);if(centralPresentation.active){centralPresentation.manual=false;centralPresentation.orbitX=centralPresentation.orbitY=0;configureCentral()}}
const weatherState={value:0,clouds:[],base:null};
let biomeCloudSystem=null,biomeCloudUI=null;
function installBiomeClouds(){
 biomeCloudSystem=createBiomeClouds({THREE,scene,camera,requestRender,config:{loopSeconds:heroMode?heroConfig.duration:0}});
 // Compose the first cloud bank around the approved camera's upper frame.
 // These are ordinary world-space meshes after placement, not billboards.
 const order=[0,8,4,12,6,2,10,14,1,9,5,13,3,11,7],ray=new THREE.Raycaster(),point=new THREE.Vector3(),extent=new THREE.Vector3(),forward=new THREE.Vector3();
 camera.updateMatrixWorld(true);
 // A distant bank sits behind the wheel. The former horizontal cloud shelf
 // crossed the foreground trees, particularly visibly in warm sunset light.
 camera.getWorldDirection(forward);const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(forward,camera.position.clone().addScaledVector(forward,7));
 biomeCloudSystem.root.children.forEach((mesh,i)=>{
  const cell=order[i],column=cell%5,row=Math.floor(cell/5),x=[-1.15,-.58,0,.58,1.15][column],y=[1.16,.99,.84][row];
  ray.setFromCamera(new THREE.Vector2(x,y),camera);if(!ray.ray.intersectPlane(plane,point))return;
  mesh.geometry.computeBoundingBox();mesh.geometry.boundingBox.getSize(extent);
  const depth=point.clone().applyMatrix4(camera.matrixWorldInverse).z*-1,width=(.46+.12*Math.sin(mesh.userData.phase)**2)*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect/camera.zoom;
  mesh.userData.base=[point.x,point.y,point.z];mesh.userData.size=THREE.MathUtils.clamp(width/(extent.x*mesh.userData.scale*mesh.userData.stretch),.20,1.2);
 });
 biomeCloudSystem.update(0);
 window.heroClouds=biomeCloudSystem;
 biomeCloudUI=installCloudControls({system:biomeCloudSystem,onWeather:value=>window.heroWeather.set(value),onDaylight:value=>effects.setDaylight(value)});
 // The main composition stays free of the unfinished clouds and their editor.
 // Restore the full-world choice when entering the unlocked biome inspection.
 let cloudPresentationIsFull=null,fullWorldCloudEnabled=biomeCloudSystem.settings.enabled;
 const syncCloudPresentation=()=>{
  const full=!heroMode&&!centralPresentation.active;
  if(full===cloudPresentationIsFull)return;
  if(!full){
   if(cloudPresentationIsFull===true)fullWorldCloudEnabled=biomeCloudSystem.settings.enabled;
   biomeCloudSystem.set({enabled:false});biomeCloudUI.panel.hidden=true;biomeCloudUI.toggle.setAttribute('aria-expanded','false');
  }else biomeCloudSystem.set({enabled:fullWorldCloudEnabled});
  biomeCloudUI.toggle.hidden=!full;cloudPresentationIsFull=full;biomeCloudUI.sync();stage.dataset.cloudPresentation=full?'full-world':'main-hidden';requestRender();
 };
 window.addEventListener('nl-presentation-change',syncCloudPresentation);syncCloudPresentation();
 biomeCloudSystem.set({day:effects.state.day,weather:weatherState.value});biomeCloudUI.sync();
 stage.dataset.cloudMeshes=String(biomeCloudSystem.report.clouds.length);stage.dataset.cloudGeometry='closed-implicit-volumes';stage.dataset.cloudFraming='distant-world-bank';requestRender();
}
function applyBiomeWeather(){
 const base=weatherState.base;if(!base)return;
 const rain=weatherState.value,mycelium=THREE.MathUtils.smoothstep(base.day,1.08,2);
 sun.intensity=base.sun*(1-.67*rain);fill.intensity=base.fill*(1+.15*rain);
 const skyLight=scene.children.find(o=>o.isHemisphereLight);skyLight.intensity=base.sky*(1-.23*rain);
 if(biomeCloudSystem){biomeCloudSystem.set({weather:rain,day:base.day});biomeCloudUI?.sync()}
 for(const cloud of weatherState.clouds){cloud.visible=rain>.015&&mycelium<.99;cloud.material.opacity=(.16+.52*rain)*(1-mycelium);cloud.material.color.set(base.day>.73?0x384859:0xd4ddda);}
 if(weatherState.rain){weatherState.rain.visible=rain>.55&&mycelium<.99;weatherState.rain.material.opacity=Math.max(0,(rain-.55)/.45)*.28*(1-mycelium)}
 scene.traverse(o=>{if(o.userData.role==='water'&&o.material?.roughness!==undefined)o.material.roughness=.28-rain*.09});
 stage.dataset.weather=rain<.15?'Sunny':rain<.5?'Partly cloudy':rain<.8?'Overcast':'Rainy';stage.dataset.weatherValue=String(rain);
 stage.dataset.weatherLightFactor=String(1-.67*rain);requestRender();
}
function installBiomeWeather(){
 const bar=document.querySelector('.inspection-controls');if(!bar)return;
 const label=document.createElement('label');label.style.cssText='display:flex;align-items:center;gap:5px';label.innerHTML='SUN <input type="range" min="0" max="1" step="0.01" value="0" aria-label="Weather from sun to rain" style="width:76px;min-height:36px;accent-color:#d4ec9c"> RAIN';
 bar.insertBefore(label,inspection.button);bar.style.flexWrap='wrap';bar.style.maxWidth='calc(100vw - 36px)';
 label.querySelector('input').oninput=e=>{weatherState.value=Number(e.target.value);applyBiomeWeather()};
 // Rainfall particles stay removed. Authored volume meshes react to weather.
 const capture=()=>{const light=scene.children.find(o=>o.isHemisphereLight);weatherState.base={sun:sun.intensity,fill:fill.intensity,sky:light.intensity,color:stage.dataset.sky,day:effects.state.day};applyBiomeWeather()};
 window.addEventListener('nl-lighting-change',capture);effects.setDaylight(effects.state.day);
 window.heroWeather={set(value){weatherState.value=THREE.MathUtils.clamp(Number(value),0,1);label.querySelector('input').value=weatherState.value;applyBiomeWeather()},get state(){return {value:weatherState.value,label:stage.dataset.weather,cloudGroups:biomeCloudSystem?.report.clouds.length||0}}};
}
function tickBiomeWeather(time){biomeCloudSystem?.update(time)}

function installInspection(){
 if(heroMode)return;
 const bar=document.createElement('div');bar.className='inspection-controls';
 bar.innerHTML='<span data-inspection-hint>Drag to turn · scroll to explore</span><label title="Day, night and mycelium">☀ <input data-inspection-light type="range" min="0" max="2" step="0.01" value="0" aria-label="Day, night and mycelium lighting"> ✣</label><button type="button" data-unlock-camera aria-pressed="false" title="Pause the spin and unlock free orbit, pan and zoom">Unlock camera</button><button type="button" data-reset-camera aria-label="Reset camera" title="Reset camera">↺</button>';
 const style=document.createElement('style');style.textContent='.inspection-controls{position:fixed;right:18px;bottom:18px;z-index:60;display:flex;align-items:center;gap:8px;padding:7px;border:1px solid #ffffff66;border-radius:8px;background:#10271ed9;color:white;font:12px system-ui;backdrop-filter:blur(8px)}.inspection-controls button{min-height:40px;padding:0 12px;border:1px solid #ffffff88;background:#e9f1e9;color:#183a29;border-radius:5px;font:600 12px system-ui;cursor:pointer}.inspection-controls button:focus-visible{outline:3px solid #d4ec9c;outline-offset:2px}.inspection-controls button[aria-pressed="true"]{background:#d4ec9c}.inspection-controls span{max-width:300px}@media(max-width:700px){.inspection-controls span{display:none}.inspection-controls{right:10px;bottom:10px}}';
 document.head.append(style);document.body.append(bar);inspection.button=bar.querySelector('[data-unlock-camera]');inspection.hint=bar.querySelector('[data-inspection-hint]');
 const light=bar.querySelector('[data-inspection-light]');light.style.cssText='width:76px;min-height:36px;vertical-align:middle;accent-color:#d4ec9c';light.oninput=()=>effects.setDaylight(Number(light.value));
 inspection.button.onclick=()=>setInspection(!inspection.unlocked);
 bar.querySelector('[data-reset-camera]').onclick=resetInspectionView;
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation()};
 stage.style.touchAction='none';
 const pair=()=>{const [a,b]=[...inspection.pointers.values()];return a&&b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)}:null};
 stage.addEventListener('contextmenu',e=>{if(inspection.unlocked)consume(e)},true);
 stage.addEventListener('pointerdown',e=>{if(!inspection.unlocked){if(centralPresentation.active&&e.button===0){setInspection(true)}else{if(centralPresentation.active)consume(e);return}}centralPresentation.manual=true;consume(e);inspection.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button,type:e.pointerType});stage.setPointerCapture?.(e.pointerId)},true);
 stage.addEventListener('pointermove',e=>{
  if(!inspection.unlocked)return;
  const old=inspection.pointers.get(e.pointerId);if(!old)return;consume(e);const before=pair(),dx=e.clientX-old.x,dy=e.clientY-old.y;
  inspection.pointers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});const after=pair();
  if(before&&after){inspectionPan(after.x-before.x,after.y-before.y);if(after.d>2)inspectionZoom(before.d/after.d)}
  else if(old.button===2||old.button===1||e.shiftKey)inspectionPan(dx,dy);else inspectionOrbit(dx,dy);
  inspectionRender();
 },true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,e=>{if(!inspection.unlocked)return;consume(e);inspection.pointers.delete(e.pointerId)},true);
 stage.addEventListener('wheel',e=>{if(!inspection.unlocked){if(centralPresentation.active)consume(e);return}centralPresentation.manual=true;consume(e);const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1);inspectionZoom(Math.exp(THREE.MathUtils.clamp(delta,-1000,1000)*.001));inspectionRender()},{capture:true,passive:false});
 stage.addEventListener('keydown',e=>{if(!inspection.unlocked)return;if(['r','R','Home','End'].includes(e.key)){consume(e);resetInspectionView()}else if(['+','=','-','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){centralPresentation.manual=true;consume(e);if(['+','=','-'].includes(e.key))inspectionZoom(e.key==='-'?1.12:1/1.12);else inspectionPan(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0,e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0);inspectionRender()}},true);
 stage.addEventListener('keydown',e=>{if(centralPresentation.active&&['r','R','Home','End','+','=','-','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){consume(e)}},true);
 window.heroInspection={setUnlocked:setInspection,setCentral(){centralPresentation.active=true;centralPresentation.manual=false;inspection.focus.set(.125,0,-.2416666783);inspection.unlocked=false;configureCentral();requestRender()},get state(){return {unlocked:inspection.unlocked,central:centralPresentation.active,focus:inspection.focus.toArray(),radius:camera.position.distanceTo(inspection.focus)}}};
}

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let animationSeconds=0;
document.addEventListener('visibilitychange',()=>{lastSpin=0;if(!document.hidden)requestRender()});
function spin(t){
 const dt=lastSpin?Math.max(0,(t-lastSpin)/1000):0;lastSpin=t;
 if(loaded&&!document.hidden){
  if(window.heroNourishland?.tick(dt))requestRender();
  if(heroMode){if(!heroManual&&!reducedMotion.matches){animationSeconds+=dt;heroFrame(animationSeconds)}}
  else if(!reducedMotion.matches){
   animationSeconds+=dt;
   effects.tick(animationSeconds);
   tickBiomeWeather(animationSeconds);
   window.heroBirds?.tick(animationSeconds);
   for(const drop of waterfallDrops)if(drop.material.uniforms?.uTime)drop.material.uniforms.uTime.value=animationSeconds;
   if(centralPresentation.active)centralIntro(animationSeconds);
   else if(!drag&&!inspection.unlocked){state.rollDeg=(state.rollDeg+dt*.42)%360;cameraUpdate()}
   requestRender();
  }
  for(const drop of waterfallDrops){const shader=drop.material.userData.flowShader;if(shader)shader.uniforms.uFallTime.value=animationSeconds;if(drop.material.uniforms?.uFallTime)drop.material.uniforms.uFallTime.value=animationSeconds}
  if(queued){queued=false;updateLeafLods(animationSeconds,reducedMotion.matches);placeLabels();renderer.render(scene,camera)}
 }
 requestAnimationFrame(spin);
}

resize();load().catch(e=>{stage.dataset.ready='error';status.hidden=false;status.textContent='The wheel roadmap could not load.';document.querySelector('[data-world-preparation]')?.remove();console.error(e)});
requestAnimationFrame(spin);
