import * as THREE from '../vendor/three.module.min.js';
import {mergeGeometries} from '../assets/fruit-window/vendor/BufferGeometryUtils.js';
import {createOpening} from './peekOpening.js';

// An original spatial garden: every leaf, petal and branch has its own silhouette.
export function createSunGardenPeekStudy({radius=.89,allowEntry=true}={}){
 const world=new THREE.Group(),plane=new THREE.Plane(new THREE.Vector3(0,0,-1),0);
 const ownedGeometry=new Set(),ownedMaterials=new Set(),textures=new Set(),buckets=new Map();
 let seed=417,time=0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const palette={bark:0x6e6346,leaf:0x1d5142,lightLeaf:0x557952,vein:0x92a879,cream:0xffdfae,pink:0xb97279,blue:0x73939e,pollen:0xb98a35,grass:0x203f34,path:0xb8a58c,water:0x709e98,gold:0xffd18c};
 const material=(color,basic=false)=>{const m=new (basic?THREE.MeshBasicMaterial:THREE.MeshLambertMaterial)({color,side:THREE.DoubleSide,stencilWrite:true,stencilRef:1,stencilFunc:THREE.EqualStencilFunc,stencilWriteMask:0,clippingPlanes:[plane]});ownedMaterials.add(m);return m;};
 function add(key,g,p=[0,0,0],r=[0,0,0],s=[1,1,1]){g=g.index?g.toNonIndexed():g;g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new THREE.Vector3(...s)));if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(g);}
 function stem(a,b,width,key='bark'){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),g=new THREE.CylinderGeometry(width*.55,width,d.length(),7);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate(...va.add(vb).multiplyScalar(.5).toArray());add(key,g);}
 function leaf(length=.4,width=.13){const vertices=[],uv=[];const rows=12;for(let i=0;i<rows;i++){const a=i/rows,b=(i+1)/rows;const at=(t,side)=>[side*Math.pow(Math.sin(Math.PI*t),.85)*width,t*length,Math.sin(Math.PI*t)*length*.16];for(const [t,side] of [[a,-1],[a,1],[b,-1],[b,-1],[a,1],[b,1]]){vertices.push(...at(t,side));uv.push((side+1)/2,t);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;}
 function foliage(p,angle,length,key='leaf',tilt=.4){add(key,leaf(length,length*.23),p,[tilt,random()*.8-.4,angle]);const end=[p[0]-Math.sin(angle)*length*.9,p[1]+Math.cos(angle)*length*.9,p[2]+Math.sin(tilt)*length*.5];stem(p,end,.003,'vein');}
 // Uneven painted floor, with a path that continues beyond the frame's visible cone.
 const ground=new THREE.PlaneGeometry(24,32,32,40);ground.rotateX(-Math.PI/2);ground.translate(0,-1.08,-13);const pos=ground.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,-1.08+.10*Math.sin(pos.getX(i)*.5+pos.getZ(i)*.3));ground.computeVertexNormals();add('grass',ground);
 const path=[];for(let i=0;i<70;i++){const z=-.1-i*.15,z2=z-.15,x=.42*Math.sin(z*.5),x2=.42*Math.sin(z2*.5),w=.28+i*.004;for(const p of [[x-w,-1.045,z],[x+w,-1.045,z],[x2-w,-1.045,z2],[x2-w,-1.045,z2],[x+w,-1.045,z],[x2+w,-1.045,z2]])path.push(...p);}const pathG=new THREE.BufferGeometry();pathG.setAttribute('position',new THREE.Float32BufferAttribute(path,3));pathG.computeVertexNormals();add('path',pathG);
 // Slender trees: visible trunks, forked branches and pointed leaves, no canopy balls.
 for(const [x,z,h] of [[-1.25,-2.4,2.8],[1.45,-3.1,3.1],[-3.1,-6.8,3.8],[3.6,-8,4.4],[-5.4,-12,5.2],[6,-14,5.4]]){
  const y=-1.05;stem([x,y,z],[x+.12,y+h,z-.12],.075);
  for(let j=0;j<8;j++){const level=.35+j*.075,side=j%2?-1:1,origin=[x+.12*level,y+h*level,z-.12*level],tip=[x+side*(.4+random()*.6),origin[1]+.4+random()*.35,z+(random()-.5)*.9];stem(origin,tip,.022);
   for(let k=0;k<7;k++){const t=.2+k*.12,p=origin.map((v,i)=>v+(tip[i]-v)*t);foliage(p,side*(.5+random()*1.3),.28+random()*.18,k%3?'leaf':'lightLeaf',random()-.3);}
  }
 }
 // Foreground fronds deliberately reach beside and behind the viewer on entry.
 for(let j=0;j<24;j++){const side=j%2?-1:1,z=-.35-Math.floor(j/2)*.35,x=side*(.75+random()*.65),base=[x,-1.05,z],top=[x+side*.15,-.1+random()*.5,z-.22];stem(base,top,.012,'leaf');for(let k=1;k<7;k++){const t=k/7,p=base.map((v,i)=>v+(top[i]-v)*t);foliage(p,(k%2?-1:1)*(.75+t*.6),.22+(1-t)*.18,k%3?'leaf':'lightLeaf');}}
 function flower(x,z,height,key){const base=[x,-1.05,z],head=[x+.08,-1.05+height,z];stem(base,head,.009,'leaf');foliage([x,-.82,z],-.9,.28);foliage([x+.03,-.65,z],1.1,.24);const pitch=.38;
  for(let k=0;k<9;k++)add(key,leaf(.17,.055),head,[pitch,0,k*Math.PI*2/9]);add('pollen',new THREE.SphereGeometry(.055,10,7),head,[0,0,0],[1,1,.5]);for(let k=0;k<9;k++){const a=k*2.4,r=.035*Math.sqrt(k/9);add('cream',new THREE.SphereGeometry(.008,5,4),[head[0]+Math.cos(a)*r,head[1]+Math.sin(a)*r,head[2]+.031]);}}
 for(let j=0;j<70;j++){const z=-.5-random()*8.5,side=j%2?-1:1,x=side*(.55+random()*(.55-z*.22));flower(x,z,.35+random()*.7,['cream','pink','blue'][j%3]);}
 // Fine grass blades, each with a tapered tip.
 for(let j=0;j<240;j++){const z=-random()*12,x=(j%2?-1:1)*(.7+random()*4);add(j%3?'leaf':'lightLeaf',leaf(.17+random()*.45,.012),[x,-1.04,z],[random()*.3,0,random()*.6-.3]);}
 add('water',new THREE.CircleGeometry(1.5,80),[.2,-1.06,-9],[-Math.PI/2,0,0],[1.8,1,1]);
 // Smooth mountain profiles instead of cones or faceted blobs.
 for(let layer=0;layer<3;layer++){const shape=new THREE.Shape();shape.moveTo(-25,-3);for(let i=0;i<=80;i++){const x=-25+i*.625;shape.lineTo(x,-.1+Math.sin(x*.23+layer)*.8+Math.sin(x*.5)*.23+layer*.15);}shape.lineTo(25,-3);shape.closePath();add('ridge'+layer,new THREE.ShapeGeometry(shape),[0,0,-18-layer*4]);palette['ridge'+layer]=[0x426951,0x6b8460,0xa5a078][layer];}
 const brushCanvas=document.createElement('canvas');brushCanvas.width=brushCanvas.height=512;const bc=brushCanvas.getContext('2d');bc.fillStyle='#deded0';bc.fillRect(0,0,512,512);for(let i=0;i<1500;i++){const x=random()*512,y=random()*512;bc.strokeStyle=i%3?'#afb9a5':'#f4ebcf';bc.globalAlpha=.22+random()*.24;bc.lineWidth=2+random()*9;bc.beginPath();bc.moveTo(x,y);bc.lineTo(x+random()*8-4,y+12+random()*45);bc.stroke();}const brush=new THREE.CanvasTexture(brushCanvas);brush.colorSpace=THREE.SRGBColorSpace;brush.anisotropy=4;textures.add(brush);
 for(const [key,list] of buckets){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());ownedGeometry.add(geometry);const m=material(palette[key]);if(['leaf','lightLeaf','cream','pink','blue','bark','grass'].includes(key)&&geometry.attributes.uv)m.map=brush;const mesh=new THREE.Mesh(geometry,m);mesh.renderOrder=1;world.add(mesh);}
 // Painted sky gradient: distant, never enlarged as the foreground artwork.
 const skyCanvas=document.createElement('canvas');skyCanvas.width=32;skyCanvas.height=1024;const ctx=skyCanvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,1024);gradient.addColorStop(0,'#b76656');gradient.addColorStop(.45,'#e5a56c');gradient.addColorStop(1,'#efe2a7');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,1024);const skyTexture=new THREE.CanvasTexture(skyCanvas);skyTexture.colorSpace=THREE.SRGBColorSpace;textures.add(skyTexture);const skyM=material(0xffffff,true);skyM.map=skyTexture;skyM.side=THREE.BackSide;skyM.depthWrite=false;const skyG=new THREE.SphereGeometry(48,64,40);ownedGeometry.add(skyG);const sky=new THREE.Mesh(skyG,skyM);sky.position.set(0,0,-7);sky.renderOrder=.5;world.add(sky);
 const sun=new THREE.Group();sun.position.set(0,3.35,-20);world.add(sun);
 function sunMesh(g,color){ownedGeometry.add(g);const m=new THREE.Mesh(g,material(color,true));m.renderOrder=1;sun.add(m);return m;}
 sunMesh(new THREE.CircleGeometry(1.55,128),0xffdf9c);
 for(let i=0;i<4;i++)sunMesh(new THREE.TorusGeometry(1.55+i*.025,.008,4,128),0xfff0c7).position.z=.018;
 const linePoints=[];for(let i=0;i<78;i++){const a=i*Math.PI*2/78,r1=1.7,r2=2.6+(i%3)*.45;linePoints.push(Math.cos(a)*r1,Math.sin(a)*r1,0,Math.cos(a+.012)*r2,Math.sin(a+.012)*r2,0);}
 for(let j=0;j<14;j++){const y=-1.3+j*.2,w=Math.sqrt(Math.max(0,1.48**2-y*y));for(let k=0;k<20;k++){const x=-w+2*w*k/20,x2=-w+2*w*(k+1)/20;linePoints.push(x,y+Math.sin(x*7+j)*.035,.025,x2,y+Math.sin(x2*7+j)*.035,.025);}}for(let j=0;j<12;j++){const x=-1.25+j*.22,h=Math.sqrt(Math.max(0,1.48**2-x*x));for(let k=0;k<20;k++){const y=-h+2*h*k/20,y2=-h+2*h*(k+1)/20;linePoints.push(x+Math.sin(y*6+j)*.05,y,.03,x+Math.sin(y2*6+j)*.05,y2,.03);}}
 const raysG=new THREE.BufferGeometry();raysG.setAttribute('position',new THREE.Float32BufferAttribute(linePoints,3));ownedGeometry.add(raysG);const raysM=new THREE.LineBasicMaterial({color:0xfff2d2,stencilWrite:true,stencilRef:1,stencilFunc:THREE.EqualStencilFunc,stencilWriteMask:0,clippingPlanes:[plane]});ownedMaterials.add(raysM);const rays=new THREE.LineSegments(raysG,raysM);rays.renderOrder=1;sun.add(rays);
 // Lettering is separate from the sky so head movement reveals its spatial placement.
 const titleCanvas=document.createElement('canvas');titleCanvas.width=2048;titleCanvas.height=512;const tc=titleCanvas.getContext('2d'),titleTexture=new THREE.CanvasTexture(titleCanvas);titleTexture.colorSpace=THREE.SRGBColorSpace;textures.add(titleTexture);const titleM=material(0xffffff,true);titleM.map=titleTexture;titleM.transparent=true;titleM.depthWrite=false;const titleG=new THREE.PlaneGeometry(7.8,1.95);ownedGeometry.add(titleG);const title=new THREE.Mesh(titleG,titleM);title.position.set(0,6.5,-22);title.renderOrder=2;world.add(title);
 function drawTitle(){tc.clearRect(0,0,2048,512);tc.textAlign='center';tc.fillStyle='#fff2cd';tc.strokeStyle='#5b5136';tc.lineWidth=6;tc.font='bold 240px Georgia';tc.textBaseline='middle';tc.strokeText('Nourishland XR',1024,256,1950);tc.fillText('Nourishland XR',1024,256,1950);titleTexture.needsUpdate=true;}
 drawTitle();const ready=Promise.resolve();
 const portal=createOpening({world,plane,ownedGeometry,ownedMaterials,allowEntry,radius,release:()=>textures.forEach(t=>t.dispose())});
 return {...portal,ready,advanceAnimation(dt){time+=Math.min(dt,.05);sun.rotation.z=Math.sin(time*.07)*.006;},get inside(){return portal.inside;}};
}
