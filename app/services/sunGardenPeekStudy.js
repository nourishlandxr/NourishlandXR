import * as THREE from '../vendor/three.module.min.js';
import {mergeGeometries} from '../assets/fruit-window/vendor/BufferGeometryUtils.js';
import {createOpening} from './peekOpening.js';

// An original spatial garden: every leaf, petal and branch has its own silhouette.
export function createSunGardenPeekStudy({radius=.89,allowEntry=true}={}){
 const world=new THREE.Group(),plane=new THREE.Plane(new THREE.Vector3(0,0,-1),0);
 const ownedGeometry=new Set(),ownedMaterials=new Set(),textures=new Set(),buckets=new Map();
 let seed=417,time=0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const palette={bark:0x82725d,leaf:0x386454,lightLeaf:0x829477,vein:0x92a879,cream:0xffe4c0,pink:0xd69ca5,blue:0x9eb8c2,pollen:0xb98a35,grass:0x476653,path:0xcbbb9e,water:0x709e98,gold:0xffd18c,fruitApricot:0xe5ad73,fruitRose:0xc77e85};
 const material=(color,basic=false)=>{const m=new (basic?THREE.MeshBasicMaterial:THREE.MeshLambertMaterial)({color,side:THREE.DoubleSide,stencilWrite:true,stencilRef:1,stencilFunc:THREE.EqualStencilFunc,stencilWriteMask:0,clippingPlanes:[plane]});ownedMaterials.add(m);return m;};
 function add(key,g,p=[0,0,0],r=[0,0,0],s=[1,1,1]){g=g.index?g.toNonIndexed():g;g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new THREE.Vector3(...s)));if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(g);}
 function stem(a,b,width,key='bark'){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),g=new THREE.CylinderGeometry(width*.55,width,d.length(),7);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate(...va.add(vb).multiplyScalar(.5).toArray());add(key,g);}
 function leaf(length=.4,width=.13){const vertices=[],uv=[];const rows=12;for(let i=0;i<rows;i++){const a=i/rows,b=(i+1)/rows;const at=(t,side)=>[side*Math.pow(Math.sin(Math.PI*t),.85)*width,t*length,Math.sin(Math.PI*t)*length*.16];for(const [t,side] of [[a,-1],[a,1],[b,-1],[b,-1],[a,1],[b,1]]){vertices.push(...at(t,side));uv.push((side+1)/2,t);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;}
 function foliage(p,angle,length,key='leaf',tilt=.4){add(key,leaf(length,length*.23),p,[tilt,random()*.8-.4,angle]);const end=[p[0]-Math.sin(angle)*length*.9,p[1]+Math.cos(angle)*length*.9,p[2]+Math.sin(tilt)*length*.5];stem(p,end,.003,'vein');}
 // Uneven painted floor, with a path that continues beyond the frame's visible cone.
 const ground=new THREE.PlaneGeometry(24,32,32,40);ground.rotateX(-Math.PI/2);ground.translate(0,-1.08,-13);const pos=ground.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,-1.08+.10*Math.sin(pos.getX(i)*.5+pos.getZ(i)*.3));ground.computeVertexNormals();add('grass',ground);
 const path=[];for(let i=0;i<70;i++){const z=-.1-i*.15,z2=z-.15,x=.42*Math.sin(z*.5),x2=.42*Math.sin(z2*.5),w=.28+i*.004;for(const p of [[x-w,-1.045,z],[x+w,-1.045,z],[x2-w,-1.045,z2],[x2-w,-1.045,z2],[x+w,-1.045,z],[x2+w,-1.045,z2]])path.push(...p);}const pathG=new THREE.BufferGeometry();pathG.setAttribute('position',new THREE.Float32BufferAttribute(path,3));pathG.computeVertexNormals();add('path',pathG);
 // Slender trees: visible trunks, forked branches and pointed leaves, no canopy balls.
 for(const [x,z,h] of [[-1.25,-2.4,2.8],[1.45,-3.1,3.1],[-3.1,-6.8,3.8],[3.6,-8,4.4],[-5.4,-12,5.2],[6,-14,5.4],[-3.8,-.6,3.2],[4.2,-.3,3.5],[-5.8,-3,4.2],[6.4,-3.4,4.6],[-3.4,1.2,3.1],[3.7,1.5,3.4]]){
  const y=-1.05;stem([x,y,z],[x+.12,y+h,z-.12],.075);
  for(let j=0;j<8;j++){const level=.35+j*.075,side=j%2?-1:1,origin=[x+.12*level,y+h*level,z-.12*level],tip=[x+side*(.4+random()*.6),origin[1]+.4+random()*.35,z+(random()-.5)*.9];stem(origin,tip,.022);
   for(let k=0;k<7;k++){const t=.2+k*.12,p=origin.map((v,i)=>v+(tip[i]-v)*t);foliage(p,side*(.5+random()*1.3),.28+random()*.18,k%3?'leaf':'lightLeaf',random()-.3);}
  }
 }
 // Weeping fruit boughs frame the upper opening without crossing its centre.
 for(const side of [-1,1]){
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*1.55,1.12,-2.05),new THREE.Vector3(side*1.14,1.4,-1.8),new THREE.Vector3(side*.72,1.32,-1.65),new THREE.Vector3(side*.48,.96,-1.6)]);
  let previous=curve.getPoint(0).toArray();
  for(let k=1;k<=16;k++){const next=curve.getPoint(k/16).toArray();stem(previous,next,.019*(1-k/22));previous=next;}
  for(let j=0;j<6;j++){
   const origin=curve.getPoint(.16+j*.14),length=.28+random()*.23,twig=new THREE.CatmullRomCurve3([origin,origin.clone().add(new THREE.Vector3(side*.045,-length*.4,.05)),origin.clone().add(new THREE.Vector3(side*.07,-length,.085))]);
   let last=twig.getPoint(0).toArray();for(let k=1;k<=7;k++){const next=twig.getPoint(k/7).toArray();stem(last,next,.005);last=next;if(k%2===0)foliage(next,Math.PI+(k%4?-.5:.5),.15+random()*.06,k%4?'leaf':'lightLeaf',.15);}
   const tip=twig.getPoint(.86),fruitTip=tip.clone().add(new THREE.Vector3(-side*.035,-.105,.018));stem(tip.toArray(),fruitTip.toArray(),.003);
   const fruit=new THREE.SphereGeometry(.065+random()*.018,16,12);add(j%2?'fruitApricot':'fruitRose',fruit,fruitTip.toArray(),[0,0,0],[.92,1.13,.92]);
   const calyx=fruitTip.clone().add(new THREE.Vector3(0,.07,0));foliage(calyx,side*.7,.065,'lightLeaf',.7);
  }
 }
 // Foreground fronds deliberately reach beside and behind the viewer on entry.
 for(let j=0;j<24;j++){const side=j%2?-1:1,z=-.35-Math.floor(j/2)*.35,x=side*(.75+random()*.65),base=[x,-1.05,z],top=[x+side*.15,-.1+random()*.5,z-.22];stem(base,top,.012,'leaf');for(let k=1;k<7;k++){const t=k/7,p=base.map((v,i)=>v+(top[i]-v)*t);foliage(p,(k%2?-1:1)*(.75+t*.6),.22+(1-t)*.18,k%3?'leaf':'lightLeaf');}}
 // Flower faces point toward the centre of the entry path, with varied silhouettes.
 function flower(x,z,height,key,kind=0){
  const base=[x,-1.05,z],head=[x+.08,-1.05+height,z];stem(base,head,.009,'leaf');foliage([x,-.82,z],-.9,.28);foliage([x+.03,-.65,z],1.1,.24);
  const yaw=Math.atan2(-head[0],-1.3-z),turn=new THREE.Matrix4().makeRotationY(yaw);
  const face=(g,offset=[0,0,0])=>{g.translate(...offset);g.applyMatrix4(turn);add(key,g,head);};
  const petals=kind===2?8:7,length=.16,width=kind===2?.025:.038;
  for(let k=0;k<petals;k++){const g=leaf(length,width);g.translate(0,.022,0);g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler( .16,0,k*Math.PI*2/petals)));face(g);}
  const centre=new THREE.SphereGeometry(kind===2?.065:.045,10,7);centre.scale(1,1,.5);centre.applyMatrix4(turn);add('pollen',centre,head);
  const normal=new THREE.Vector3(0,0,.035).applyMatrix4(turn);for(let k=0;k<7;k++){const a=k*2.4,r=.03*Math.sqrt(k/7),local=new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0).applyMatrix4(turn);add('cream',new THREE.SphereGeometry(.007,5,4),[head[0]+local.x+normal.x,head[1]+local.y,head[2]+local.z+normal.z]);}
 }
 function floweringSpire(x,z,height){
  stem([x,-1.05,z],[x,-1.05+height,z],.008,'leaf');
  for(let k=0;k<8;k++){const y=-1.05+height*(.5+k*.06),a=k*2.4;add('blue',leaf(.09,.045),[x+Math.cos(a)*.025,y,z+Math.sin(a)*.025],[.5,a,a*.4]);}
  for(let k=0;k<5;k++)foliage([x,-1+k*.07,z],(k%2?-1:1)*1.1,.3-k*.025,'lightLeaf');
 }
 function fern(x,z){
  for(let j=0;j<5;j++){const angle=(j-2)*.4,base=[x,-1.04,z],top=[x+Math.sin(angle)*.55,-.35,z-.2];stem(base,top,.006,'leaf');for(let k=1;k<7;k++){const t=k/7,p=base.map((v,i)=>v+(top[i]-v)*t);foliage(p,(k%2?-1:1)*1.15,.22*(1-t)+.08,'lightLeaf',.2);}}
 }
 // Keep individual flower heads readable with space between planting centres.
 const planted=[];
 function reservePlant(x,z){if(planted.some(p=>Math.hypot(p[0]-x,p[1]-z)<.48))return false;planted.push([x,z]);return true;}
 for(let j=0;j<60;j++){
  let x,z,placed=false;for(let attempt=0;attempt<12;attempt++){z=-.5-random()*8.5;x=(j%2?-1:1)*(.6+random()*(.55-z*.22));if(reservePlant(x,z)){placed=true;break;}}
  if(!placed)continue;if(j%7===0)floweringSpire(x,z,.65+random()*.35);else flower(x,z,.35+random()*.6,['cream','pink','blue'][j%3],j%3);
 }
 // Sparse side beds retain parallax without becoming a wall of flower heads.
 for(let side of [-1,1])for(let j=0;j<12;j++){
  const x=side*(2.4+random()*4.4),z=2.4-random()*8;if(!reservePlant(x,z))continue;
  if(j%3===0)fern(x,z);else if(j%3===1)floweringSpire(x,z,.7+random()*.4);else flower(x,z,.45+random()*.55,j%2?'pink':'cream',2);
 }
 // Fine grass blades, each with a tapered tip.
 for(let j=0;j<240;j++){const z=-random()*12,x=(j%2?-1:1)*(.7+random()*4);add(j%3?'leaf':'lightLeaf',leaf(.17+random()*.45,.012),[x,-1.04,z],[random()*.3,0,random()*.6-.3]);}
 add('water',new THREE.CircleGeometry(1.5,80),[.2,-1.06,-9],[-Math.PI/2,0,0],[1.8,1,1]);
 // Smooth mountain profiles instead of cones or faceted blobs.
 for(let layer=0;layer<3;layer++){const shape=new THREE.Shape();shape.moveTo(-25,-3);for(let i=0;i<=80;i++){const x=-25+i*.625;shape.lineTo(x,-.1+Math.sin(x*.23+layer)*.8+Math.sin(x*.5)*.23+layer*.15);}shape.lineTo(25,-3);shape.closePath();add('ridge'+layer,new THREE.ShapeGeometry(shape),[0,0,-18-layer*4]);palette['ridge'+layer]=[0x426951,0x6b8460,0xa5a078][layer];}
 const brushCanvas=document.createElement('canvas');brushCanvas.width=brushCanvas.height=512;const bc=brushCanvas.getContext('2d');bc.fillStyle='#eee7dd';bc.fillRect(0,0,512,512);for(let i=0;i<1500;i++){const x=random()*512,y=random()*512;bc.strokeStyle=['#bfc9bd','#f9efdd','#dcc9c5','#c7d6d4'][i%4];bc.globalAlpha=.22+random()*.24;bc.lineWidth=3+random()*12;bc.beginPath();bc.moveTo(x,y);bc.lineTo(x+random()*8-4,y+12+random()*45);bc.stroke();}const brush=new THREE.CanvasTexture(brushCanvas);brush.colorSpace=THREE.SRGBColorSpace;brush.anisotropy=4;textures.add(brush);
 for(const [key,list] of buckets){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());ownedGeometry.add(geometry);const m=material(palette[key]);if(['leaf','lightLeaf','cream','pink','blue','bark','grass'].includes(key)&&geometry.attributes.uv)m.map=brush;const mesh=new THREE.Mesh(geometry,m);mesh.renderOrder=1;world.add(mesh);}
 // Painted sky gradient: distant, never enlarged as the foreground artwork.
 const skyCanvas=document.createElement('canvas');skyCanvas.width=32;skyCanvas.height=1024;const ctx=skyCanvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,1024);gradient.addColorStop(0,'#c48f85');gradient.addColorStop(.45,'#e9b98f');gradient.addColorStop(1,'#f1e4bd');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,1024);const skyTexture=new THREE.CanvasTexture(skyCanvas);skyTexture.colorSpace=THREE.SRGBColorSpace;textures.add(skyTexture);const skyM=material(0xffffff,true);skyM.map=skyTexture;skyM.side=THREE.BackSide;skyM.depthWrite=false;const skyG=new THREE.SphereGeometry(48,64,40);ownedGeometry.add(skyG);const sky=new THREE.Mesh(skyG,skyM);sky.position.set(0,0,-7);sky.renderOrder=.5;world.add(sky);
 const sun=new THREE.Group();sun.position.set(0,3.35,-20);world.add(sun);
 function sunMesh(g,color){ownedGeometry.add(g);const m=new THREE.Mesh(g,material(color,true));m.renderOrder=1;sun.add(m);return m;}
 const sunDisk=sunMesh(new THREE.CircleGeometry(1.55,128),0xffe1ac);
 for(let i=0;i<4;i++)sunMesh(new THREE.TorusGeometry(1.55+i*.025,.008,4,128),0xfff0c7).position.z=.018;
 const linePoints=[];for(let i=0;i<78;i++){const a=i*Math.PI*2/78,r1=1.7,r2=2.6+(i%3)*.45;linePoints.push(Math.cos(a)*r1,Math.sin(a)*r1,0,Math.cos(a+.012)*r2,Math.sin(a+.012)*r2,0);}
 for(let j=0;j<14;j++){const y=-1.3+j*.2,w=Math.sqrt(Math.max(0,1.48**2-y*y));for(let k=0;k<20;k++){const x=-w+2*w*k/20,x2=-w+2*w*(k+1)/20;linePoints.push(x,y+Math.sin(x*7+j)*.035,.025,x2,y+Math.sin(x2*7+j)*.035,.025);}}for(let j=0;j<12;j++){const x=-1.25+j*.22,h=Math.sqrt(Math.max(0,1.48**2-x*x));for(let k=0;k<20;k++){const y=-h+2*h*k/20,y2=-h+2*h*(k+1)/20;linePoints.push(x+Math.sin(y*6+j)*.05,y,.03,x+Math.sin(y2*6+j)*.05,y2,.03);}}
 const raysG=new THREE.BufferGeometry();raysG.setAttribute('position',new THREE.Float32BufferAttribute(linePoints,3));ownedGeometry.add(raysG);const coreG=new THREE.BufferGeometry();coreG.setAttribute('position',new THREE.Float32BufferAttribute(linePoints.slice(78*6),3));raysG.setAttribute('position',new THREE.Float32BufferAttribute(linePoints.slice(0,78*6),3));ownedGeometry.add(coreG);const raysM=new THREE.LineBasicMaterial({color:0xfff2d2,stencilWrite:true,stencilRef:1,stencilFunc:THREE.EqualStencilFunc,stencilWriteMask:0,clippingPlanes:[plane]});ownedMaterials.add(raysM);const rays=new THREE.LineSegments(raysG,raysM);rays.renderOrder=1;sun.add(rays);
 const coreM=raysM.clone();coreM.color.setHex(0xd4b880);ownedMaterials.add(coreM);const core=new THREE.LineSegments(coreG,coreM);core.renderOrder=1;sun.add(core);
 // Three light stroke layers move independently; long rays remain steady.
 const shimmer=[];
 for(let layer=0;layer<3;layer++){
  const points=[];
  for(let j=0;j<32;j++){
   const angle=j*Math.PI*2/32+layer*.065,base=1.8+random()*.6,length=.35+random()*.8;
   for(let k=0;k<9;k++){
    const sample=t=>{const r=base+t*length,a=angle+Math.sin(t*7+j)*.025;return [Math.cos(a)*r,Math.sin(a)*r,.04+layer*.004];};
    points.push(...sample(k/9),...sample((k+1)/9));
   }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));ownedGeometry.add(g);
  const m=raysM.clone();m.color.setHex(0xf7cd8b);ownedMaterials.add(m);
  const strokes=new THREE.LineSegments(g,m);strokes.renderOrder=1;sun.add(strokes);shimmer.push(strokes);
 }
 // Lettering is separate from the sky so head movement reveals its spatial placement.
 const titleCanvas=document.createElement('canvas');titleCanvas.width=2048;titleCanvas.height=512;const tc=titleCanvas.getContext('2d'),titleTexture=new THREE.CanvasTexture(titleCanvas);titleTexture.colorSpace=THREE.SRGBColorSpace;textures.add(titleTexture);
 const titleG=new THREE.PlaneGeometry(9.8,2.45);ownedGeometry.add(titleG);
 const titleM=material(0xffffff,true);titleM.map=titleTexture;titleM.transparent=true;titleM.depthWrite=false;
 const title=new THREE.Mesh(titleG,titleM);title.position.set(0,8.1,-22);title.renderOrder=3;world.add(title);
 function drawTitle(){tc.clearRect(0,0,2048,512);tc.textAlign='center';tc.fillStyle='#245c63';tc.font='240px Georgia';tc.textBaseline='middle';tc.fillText('Nourishland XR',1024,256,1950);titleTexture.needsUpdate=true;}
 drawTitle();const ready=Promise.resolve();
 const portal=createOpening({world,plane,ownedGeometry,ownedMaterials,allowEntry,radius,release:()=>textures.forEach(t=>t.dispose())});
 return {...portal,ready,advanceAnimation(dt){time+=Math.min(dt,.05);core.rotation.z=time*.025;core.scale.setScalar(1+Math.sin(time*.45)*.008);
 sunDisk.material.color.setRGB(1,.87+Math.sin(time*.6)*.018,.65+Math.sin(time*.6)*.025);
 shimmer.forEach((strokes,i)=>{strokes.rotation.z=time*(i%2?-.018:.012)*(1+i*.3);strokes.scale.setScalar(1+Math.sin(time*.55+i*2)*.022);strokes.material.color.setHSL(.105,.65,.77+Math.sin(time*.8+i*2)*.055);});},get inside(){return portal.inside;}};
}
