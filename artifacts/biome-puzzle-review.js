import * as THREE from 'nl-three';
import { loadBirdFlights } from 'nl-birds';
import { livingEffects } from 'nl-effects';
const payload=window.HERO_PUZZLE,lock=Object.freeze(payload.lock),plan=payload.plan,stage=document.querySelector('[data-biome-stage]'),status=document.querySelector('[data-biome-status]');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;stage.append(renderer.domElement);
const gl=renderer.getContext(),debugGPU=gl.getExtension('WEBGL_debug_renderer_info'),gpuName=debugGPU?gl.getParameter(debugGPU.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),softwareGPU=/swiftshader|llvmpipe|software/i.test(gpuName);stage.dataset.renderer=gpuName;stage.dataset.shadowSize=softwareGPU?'768':'2048';
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(lock.fovDeg,1,.003,100),target=new THREE.Vector3(),state={rollDeg:lock.rollDeg,distance:lock.landingDistance,base:lock.baseDistance,zoomAnchor:payload.reviewAnchor};
scene.add(new THREE.HemisphereLight(0xf7f9ee,0x70806b,1.62));scene.add(new THREE.AmbientLight(0xb9c8cf,.24));const sun=new THREE.DirectionalLight(0xfff2d6,2.08);sun.position.set(-3.8,6.8,4.6);scene.add(sun);const fill=new THREE.DirectionalLight(0xc8e3da,.64);fill.position.set(3.5,2.8,-4.8);scene.add(fill);const rim=new THREE.DirectionalLight(0x8fb8c9,.48);rim.position.set(-4,1.2,-5);scene.add(rim);
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
const foodEarthworks={version:'mountain-production-03',placementBasis:'owner colour markup: ponds left, paddies right, guilds centre, windbreaks flanks and rear',modifiedVertices:0,paddyCells:0,ponds:3,connections:[],paths:[],maxDisplacement:0};
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
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color,roughness:role==='water'?.28:.96,metalness:role==='water'?.04:0,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(g,material);mesh.name=name;mesh.userData={role,piece_id:'F-designed-production'};mesh.receiveShadow=true;scene.add(mesh);if(role==='water')effects.registerWater(mesh);return mesh;
}

function buildProductionWater(){
 if(biomeBaseline)return;
 const rice=[],riceCells=new Set();
 // Clip original slope triangles to iso-elevation bands. Each cell's water is
 // horizontal; banks and narrow gaps separate neighbouring terraces.
 const clip=(poly,test,value)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],va=test(a)-value,vb=test(b)-value;if(va>=0)out.push(a);if((va>=0)!==(vb>=0)){const t=va/(va-vb);out.push({x:THREE.MathUtils.lerp(a.x,b.x,t),z:THREE.MathUtils.lerp(a.z,b.z,t),h:THREE.MathUtils.lerp(a.h,b.h,t),y:THREE.MathUtils.lerp(a.y,b.y,t)})}}return out};
 for(let level=.144;level<.50;level+=.022)for(const interval of [[-1.02,-.23]]){
  const positions=[],indices=[];
  for(const mesh of pieces.values()){
   if(!/^F/.test(mesh.userData.piece_id||''))continue;const p=mesh.geometry.attributes.position,idx=mesh.geometry.index;
   for(let i=0;i<idx.count;i+=3){
    let poly=[];for(let j=0;j<3;j++){const v=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+j)).applyMatrix4(mesh.matrixWorld);poly.push({x:v.x,z:v.z,y:v.y,h:riceReferenceHeight(v.x,v.z)})}
    if(poly.some(p=>!Number.isFinite(p.h)))continue;
    for(const [test,value]of [[p=>p.h,level+.003],[p=>-p.h,-level-.014],[p=>p.x,interval[0]],[p=>-p.x,-interval[1]],[p=>p.z,.84],[p=>-p.z,-1.64],[p=>-p.y,-level-.0045]]){if(!poly.length)break;poly=clip(poly,test,value)}
    if(poly.length<3)continue;const center={x:poly.reduce((s,p)=>s+p.x,0)/poly.length,z:poly.reduce((s,p)=>s+p.z,0)/poly.length};
    if(foodWorkFade(center.x,center.z)<.99||ricePatchWeight(center.x,center.z)<.95)continue;
    const start=positions.length/3;for(const p of poly)positions.push(p.x,level+.0045,p.z);for(let j=1;j<poly.length-1;j++)indices.push(start,start+j,start+j+1);
    const cell=Math.round(center.x/.012)+','+Math.round(center.z/.012);
    if(!riceCells.has(cell)&&biomeHash(center.x,center.z)>.08){riceCells.add(cell);rice.push({p:new THREE.Vector3(center.x,level+.004,center.z),scale:new THREE.Vector3(.009,.025,.009)})}
   }
  }
  if(foodSurface('Rice paddy / contour level '+level.toFixed(3)+' / mountain contour',positions,indices))foodEarthworks.paddyCells++;
 }
 biomePlantBatch('Food production / rice tillers',wetlandReedGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,color:0x91ae59,roughness:1,side:THREE.DoubleSide}),rice);foodEarthworks.ricePlants=rice.length;
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
  const bottom=Math.min(top.y-.045,-.12+.14*arch);
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
  const desired=lodPolicy==='original'?0:lodPolicy==='compact'?1:state.distance<2.6&&!payload.centralHero?0:worst<(lod.level?1.15:.85)?1:0;
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
     vec3 graded=max(vec3(0.0),(gl_FragColor.rgb-vec3(.18))*1.045+vec3(.18));
     float depthHaze=smoothstep(2.2,5.4,length(vViewPosition))*.045;
     graded=mix(graded,uWorldHaze,depthHaze);
     gl_FragColor.rgb=mix(gl_FragColor.rgb,graded,uWorldGrade);`);
   };
   mat.customProgramCacheKey=()=>cache()+'|world-grade-02|'+tint.join(',');mat.needsUpdate=true;materials++;
  }
 });
 const update=()=>{const day=effects.state.day;strength.value=(window.heroGrade.enabled?1:0)*(1-THREE.MathUtils.smoothstep(day,.65,1))*(1-THREE.MathUtils.smoothstep(day,1.08,2));hazeColor.value.set('#'+stage.dataset.sky).lerp(new THREE.Color('#a4bac3'),.65);stage.dataset.colourGrade=window.heroGrade.enabled?'natural-depth-02':'off';requestRender()};
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
function placeLabels(){
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
async function load(){
 const buffer=await(await fetch(payload.model)).arrayBuffer(),dv=new DataView(buffer);let doc,bin;for(let c=12;c<buffer.byteLength;){const n=dv.getUint32(c,true),t=dv.getUint32(c+4,true);if(t===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,c+8,n)));if(t===0x004e4942)bin=c+8;c+=n+8}
 if(!doc||bin===undefined)throw Error('Incomplete wheel model');
 const mats=doc.materials.map(m=>{const p=m.pbrMetallicRoughness;return new THREE.MeshStandardMaterial({name:m.name,color:new THREE.Color().setRGB(...p.baseColorFactor.slice(0,3)),roughness:1,side:m.doubleSided?THREE.DoubleSide:THREE.FrontSide})});
 for(const node of doc.nodes){if(payload.presentation?.greenInnerWall&&node.name==='Reserved inner drop')continue;const p=doc.meshes[node.mesh].primitives[0],g=new THREE.BufferGeometry();g.setAttribute('position',attr(doc,buffer,bin,p.attributes.POSITION));g.setAttribute('normal',attr(doc,buffer,bin,p.attributes.NORMAL));g.setIndex(attr(doc,buffer,bin,p.indices));const mesh=new THREE.Mesh(g,mats[p.material].clone());mesh.userData=node.extras||{};mountMesh(mesh);if(mesh.userData.piece_id)pieces.set(mesh.userData.piece_id,mesh)}
 if(payload.presentation?.showPuzzleBorders!==false){
  for(const b of plan.borders){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));g.setIndex(b.indices);const lines=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x6e7f64,transparent:true,opacity:.36}));lines.renderOrder=2;scene.add(lines)}
  for(const edge of plan.family_edges){const g=new THREE.BufferGeometry().setFromPoints(edge.map(p=>new THREE.Vector3(...p)));scene.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0x4b634a,transparent:true,opacity:.78})))}
 }
 if(payload.contentModel)await loadBiomeContent();
 if(payload.edgeModel)await loadSupplementalModel(payload.edgeModel);
 if(payload.windbreakModel)await loadSupplementalModel(payload.windbreakModel);
 finalizeCliffCrests();
 for(const fall of pendingWaterfallSources)mountConnectedWaterfall(fall);
 buildTerrainSampler();
 prepareFoodEarthworks();
 repairWetlandBank();
 buildProductionWater();
 buildFoodForestSwales();
 batchSwalePlants();
 buildOtherBiomeDesign();
 buildMycelium();
 installWorldGrade();
 if(payload.birdModels)window.heroBirds=await loadBirdFlights({scene,camera,stage,requestRender,models:payload.birdModels,onTick:t=>effects.tick(t)});
 renderer.shadowMap.needsUpdate=true;
 const finalTerrain=[...pieces].filter(([id,mesh])=>mesh.userData.role==='terrain'&&mesh.visible).map(([id])=>id).sort();if(finalTerrain.length!==25)throw Error('A terrain replacement is hidden or missing');stage.dataset.loadedTerrainPieces=finalTerrain.join(',');
 if(payload.presentation?.showPieceLabels!==false)plan.pieces.forEach(makeLabel);
 loaded=true;status.hidden=true;stage.dataset.biomeDesign=biomeDesign.version;window.heroBiomeDesign=biomeDesign;stage.dataset.ready='true';configureHero();installInspection();installBiomeWeather();configureCentral();stage.dataset.layoutLocked='true';stage.dataset.pieces='25';stage.dataset.families='5';stage.dataset.pieceLabelCount=String(labels.length);stage.dataset.puzzleBordersVisible=String(payload.presentation?.showPuzzleBorders!==false);requestRender();
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
const heroConfig={duration:24,landingDistance:2.24,revealDistance:2.50,cropZoom:1.35,rollDeg:lock.rollDeg,rollReveal:1.1};
let heroManual=false;
const heroWindTime={value:0};
function heroFrame(seconds){
 const t=((seconds%heroConfig.duration)+heroConfig.duration)%heroConfig.duration,phase=t/heroConfig.duration*Math.PI*2,reveal=.5-.5*Math.cos(phase);
 state.distance=THREE.MathUtils.lerp(heroConfig.landingDistance,heroConfig.revealDistance,reveal);
 state.rollDeg=heroConfig.rollDeg+heroConfig.rollReveal*reveal;
 camera.zoom=heroConfig.cropZoom;cameraUpdate();
 heroWindTime.value=t;
 effects.tick(t);window.heroBirds?.setTime(t);
 for(const drop of waterfallDrops)if(drop.material.uniforms?.uTime)drop.material.uniforms.uTime.value=t;
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
 centralIntro(0);centralPresentation.initialRadius=camera.position.distanceTo(inspection.focus);inspection.unlocked=false;
 inspection.button.hidden=false;inspection.button.textContent='Unlock camera';inspection.button.setAttribute('aria-pressed','false');inspection.hint.textContent='Central view locked';
 const bar=inspection.button.parentElement;bar.style.left='10px';bar.style.right='auto';bar.dataset.centralControls='true';
 if(!document.querySelector('[data-central-style]')){const style=document.createElement('style');style.dataset.centralStyle='true';style.textContent='.masthead,header,#site-header,.skip,.nl-biome-navigation{display:none!important}@media(max-width:700px){.inspection-controls[data-central-controls] [data-unlock-camera]{display:none}}';document.head.append(style)}
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
function applyBiomeWeather(){
 const base=weatherState.base;if(!base)return;
 const rain=weatherState.value,mycelium=THREE.MathUtils.smoothstep(base.day,1.08,2);
 sun.intensity=base.sun*(1-.67*rain);fill.intensity=base.fill*(1+.15*rain);
 const skyLight=scene.children.find(o=>o.isHemisphereLight);skyLight.intensity=base.sky*(1-.23*rain);
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
 // Cloud and rain placeholders removed; authored cloud mesh is the next art pass.
 const capture=()=>{const light=scene.children.find(o=>o.isHemisphereLight);weatherState.base={sun:sun.intensity,fill:fill.intensity,sky:light.intensity,color:stage.dataset.sky,day:effects.state.day};applyBiomeWeather()};
 window.addEventListener('nl-lighting-change',capture);effects.setDaylight(effects.state.day);
 window.heroWeather={set(value){weatherState.value=THREE.MathUtils.clamp(Number(value),0,1);label.querySelector('input').value=weatherState.value;applyBiomeWeather()},get state(){return {value:weatherState.value,label:stage.dataset.weather,cloudGroups:0}}};
}
function tickBiomeWeather(time){if(weatherState.rain?.visible)weatherState.rain.position.y=-(time*.35%.55)}

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
 stage.addEventListener('pointerdown',e=>{if(!inspection.unlocked){if(centralPresentation.active)consume(e);return}centralPresentation.manual=true;consume(e);inspection.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button,type:e.pointerType});stage.setPointerCapture?.(e.pointerId)},true);
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

resize();load().catch(e=>{stage.dataset.ready='error';status.hidden=false;status.textContent='The wheel roadmap could not load.';console.error(e)});
requestAnimationFrame(spin);
