// Three spatial layers built around the original house-on-a-hill study.
import * as THREE from '../vendor/three.module.min.js';
import {createPeekWorld,groundHeight} from './peekForestBase.js';
import {mergeGeometries} from '../assets/fruit-window/vendor/BufferGeometryUtils.js';

export function createFoodForestWorld(options={}){
 const peek=createPeekWorld(options),geometries=new Set(),materials=new Set(),textures=new Set();
 const moving=[],birds=[],insects=[];let elapsed=0;
 function brushTexture(kind,colors,repeat=1){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const c=canvas.getContext('2d');let seed=37;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  c.fillStyle=colors[0];c.fillRect(0,0,1024,1024);
  for(let i=0;i<1900;i++){
   const x=random()*1024,y=random()*1024,length=18+random()*85,width=4+random()*17;
   c.save();c.translate(x,y);c.rotate(kind==='wood'?Math.PI/2:kind==='water'?0:(random()-.5)*1.3);
   c.strokeStyle=colors[1+Math.floor(random()*(colors.length-1))];c.globalAlpha=.22+random()*.48;c.lineWidth=width;c.lineCap='round';
   c.beginPath();c.moveTo(-length/2,0);c.quadraticCurveTo(0,-width*.4,length/2,width*.15);c.stroke();
   // Dry bristle lines leave uneven edges and visible paint grain.
   c.globalAlpha=.2;c.lineWidth=.8;
   for(let b=0;b<4;b++){const dy=(random()-.5)*width;c.beginPath();c.moveTo(-length*.45,dy);c.lineTo(length*(.2+random()*.25),dy);c.stroke();}
   c.restore();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,repeat);texture.anisotropy=4;textures.add(texture);return texture;
 }
 const painted={
  leaf:brushTexture('leaf',['#244936','#456649','#6c8056','#193b30','#859365']),
  shrub:brushTexture('leaf',['#56724b','#839263','#a0a979','#355a43','#658d5b']),
  wood:brushTexture('wood',['#79654d','#af9270','#544b3d','#ccb18b']),
  ground:brushTexture('ground',['#647d57','#98a477','#445f47','#bbaf80','#759564'],5),
  wall:brushTexture('wood',['#c8b58d','#e8d5a8','#aa9571','#f1e4bf']),
  roof:brushTexture('water',['#956b56','#c18c69','#775647','#bba084']),
  cloud:brushTexture('water',['#e9e6d8','#fff9e8','#c3d0ca','#d8ded1']),
  water:brushTexture('water',['#78a7a4','#b6cbc0','#507c7b','#d9ddbe'],2)
 };
 for(const mesh of peek.world.children){
  const kind={'Mock terrain':'ground','Mock leaf':'leaf','Mock trunk':'wood','Mock wall':'wall','Mock roof':'roof'}[mesh.name];
  if(kind&&mesh.geometry.attributes.uv){mesh.material.map=painted[kind];mesh.material.color.set(0xffffff);mesh.material.needsUpdate=true;}
 }
 const material=(color,extra={},unlit=false)=>{
  const Material=unlit?THREE.MeshBasicMaterial:THREE.MeshLambertMaterial;
  const m=new Material({color,side:THREE.DoubleSide,stencilWrite:true,stencilRef:1,
   stencilFunc:THREE.EqualStencilFunc,stencilWriteMask:0,clippingPlanes:peek.world.children[0].material.clippingPlanes,...extra});
  materials.add(m);return m;
 };
 const trunk=material(0x614a36),leaf=material(0x244c37),lightLeaf=material(0x53794a),fruit=material(0xeeb75b),berry=material(0x853f66);
 const cloud=material(0xf5f3e6),water=material(0x70afb2,{transparent:true,opacity:.88}),bank=material(0x7b9162),birdMat=material(0xefe4cc);
 for(const [m,kind] of [[trunk,'wood'],[leaf,'leaf'],[lightLeaf,'shrub'],[cloud,'cloud'],[water,'water'],[bank,'ground']]){m.map=painted[kind];m.color.set(0xffffff);}
 function shape(g,m,p,s=[1,1,1],parent=peek.world){geometries.add(g);const mesh=new THREE.Mesh(g,m);mesh.position.set(...p);mesh.scale.set(...s);mesh.renderOrder=1;parent.add(mesh);return mesh;}
 const sphere=new THREE.SphereGeometry(1,14,10),stem=new THREE.CylinderGeometry(.08,.13,1,7);geometries.add(sphere);geometries.add(stem);
 function tree(x,z,h,width,edible=false){
  const y=groundHeight(x,z),group=new THREE.Group();group.position.set(x,y,z);peek.world.add(group);
  shape(stem,trunk,[0,h*.42,0],[1,h*.84,1],group);
  const crown=new THREE.Group();crown.position.y=h*.76;group.add(crown);
  for(let j=0;j<3;j++)shape(sphere,edible?lightLeaf:leaf,[(j-1)*width*.38,j===1?h*.22:0,Math.sin(j*2)*width*.15],[width*.66,h*.33,width*.58],crown);
  if(edible)for(let j=0;j<8;j++){const a=j*2.399;shape(sphere,fruit,[Math.cos(a)*width*.69,-.12+(j%3)*.25,Math.sin(a)*width*.65],[.12,.15,.12],crown);}
  moving.push({object:crown,phase:x+z,amount:.022});
 }
 // Layer one: near trunks and overhead crowns slide past the opening as you lean.
 for(const row of [[-2.1,-1.5,3.3,.95],[2.35,-1.9,3.7,1.1],[-3.7,-3.4,4.1,1.35],[4,-3.9,4.4,1.5],[-4.5,-7,4.6,1.6],[4.7,-8,4.8,1.6]])tree(...row);
 // Layer two: orchard forms and low berry shrubs frame the dam and clearing.
 for(const row of [[-2.5,-5,2.1,.85],[2.4,-6.5,2.4,.9],[-3.5,-8.5,2.6,1],[3.8,-9,2.8,1]])tree(...row,true);
 for(let i=0;i<12;i++){
  const x=(i%2?1:-1)*(1.1+(i%3)*.55),z=-3.1-Math.floor(i/2)*.8,y=groundHeight(x,z);
  shape(sphere,lightLeaf,[x,y+.28,z],[.48,.38,.46]);
  for(let j=0;j<5;j++){const a=j*2.4;shape(sphere,berry,[x+Math.cos(a)*.39,y+.4+(j%2)*.12,z+Math.sin(a)*.39],[.055,.055,.055]);}
 }
 const pondY=-.1;
 // Scoop out a basin so the dam remains visible within the rising landscape.
 const terrain=peek.world.children.find(o=>o.name==='Mock terrain');
 const tp=terrain.geometry.attributes.position;
 for(let i=0;i<tp.count;i++){
  const d=Math.hypot((tp.getX(i)+.5)/2.1,(tp.getZ(i)+6.8)/1.55);
  if(d<1.4){const blend=1-Math.min(1,Math.max(0,(d-.8)/.6));tp.setY(i,THREE.MathUtils.lerp(tp.getY(i),pondY-.22,blend));}
 }
 tp.needsUpdate=true;terrain.geometry.computeVertexNormals();
 shape(sphere,bank,[-.5,pondY-.08,-6.8],[1.8,.15,1.25]);
 shape(sphere,water,[-.5,pondY,-6.8],[1.57,.045,1.05]);
 const rippleMat=material(0xc4e1d6,{transparent:true,opacity:.4});
 for(let i=0;i<3;i++){
  const ring=shape(new THREE.TorusGeometry(.32+i*.24,.008,4,40),rippleMat,[-.5,pondY+.046,-6.8],[1,.65,1]);ring.rotation.x=-Math.PI/2;
  moving.push({object:ring,phase:i,amount:0,ripple:true});
 }
 // Layer three: cloud shapes and lettering float above the existing house.
 for(let i=0;i<5;i++){
  const group=new THREE.Group();group.position.set(-5+i*2.6,4.95+(i%2)*.3,-14-i%2*3);peek.world.add(group);
  for(let j=0;j<3;j++)shape(sphere,cloud,[(j-1)*.65,j===1?.15:0,0],[.9,.32,.38],group);
  moving.push({object:group,phase:i,amount:0,cloud:true,baseX:group.position.x});
 }
 const canvas=document.createElement('canvas');canvas.width=3072;canvas.height=512;
 const ctx=canvas.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 260px Georgia';
 ctx.lineJoin='round';ctx.strokeStyle='#243b35';ctx.lineWidth=12;ctx.strokeText('NOURISHLAND XR',1536,250);
 const gold=ctx.createLinearGradient(0,110,0,380);gold.addColorStop(0,'#fffce6');gold.addColorStop(.55,'#ffeab0');gold.addColorStop(1,'#d2a75b');ctx.fillStyle=gold;ctx.fillText('NOURISHLAND XR',1536,250);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
 const labelMat=material(0xffffff,{map:texture,transparent:true,alphaTest:.05,depthWrite:false},true);
 const label=shape(new THREE.PlaneGeometry(7.6,1.5),labelMat,[.1,6.4,-16]);
 const blossoms=[material(0xf295b1),material(0xe8c96b),material(0xb99bd9),material(0xf2ece0)];
 // Flower beds wrap the house; each stem sways from its base.
 for(let i=0;i<28;i++){
  const a=i*2.399,x=.9+Math.cos(a)*(1.6+(i%3)*.25),z=-10+Math.sin(a)*1.8,y=groundHeight(x,z);
  const flower=new THREE.Group();flower.position.set(x,y,z);peek.world.add(flower);
  const h=.28+(i%4)*.08;shape(stem,lightLeaf,[0,h/2,0],[.17,h,.17],flower);
  for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;shape(sphere,blossoms[i%4],[Math.cos(angle)*.075,h+Math.sin(angle)*.075,0],[.065,.07,.035],flower);}
  shape(sphere,fruit,[0,h,.025],[.04,.04,.035],flower);
  moving.push({object:flower,phase:a,amount:.065});
 }
 const insectGold=material(0xe7be58),insectDark=material(0x453b32),wingMat=material(0xe9eee1,{transparent:true,opacity:.75});
 for(let i=0;i<6;i++){
  const group=new THREE.Group();peek.world.add(group);const butterfly=i%2===0,wingList=[];
  shape(sphere,butterfly?insectDark:insectGold,[0,0,0],[.035,.025,.065],group);
  for(const side of [-1,1]){
   const wing=shape(sphere,butterfly?blossoms[i%4]:wingMat,[side*.06,.025,0],butterfly?[.09,.012,.07]:[.055,.009,.035],group);wingList.push(wing);
  }
  insects.push({group,wings:wingList,phase:i*1.9,butterfly});
 }
 for(let i=0;i<4;i++){
  const group=new THREE.Group();peek.world.add(group);
  const wings=[];
  for(const side of [-1,1]){const wing=shape(new THREE.ConeGeometry(.16,.5,3),birdMat,[side*.2,0,0],[1,.65,.3],group);wing.rotation.z=side*Math.PI/2;wings.push(wing);}
  birds.push({group,wings,phase:i*1.7});
 }
 // Combine still shrub/fruit geometry into material batches for a lighter scene.
 const dynamic=new Set([label,...moving.map(m=>m.object),...birds.map(b=>b.group),...insects.map(b=>b.group)]),batches=new Map();
 peek.world.updateMatrixWorld(true);
 for(const {object} of moving){
  if(!object.isGroup)continue;
  const localBatches=new Map(),inverse=new THREE.Matrix4().copy(object.matrixWorld).invert();
  for(const child of object.children){if(!child.isMesh)continue;if(!localBatches.has(child.material))localBatches.set(child.material,[]);localBatches.get(child.material).push(child);}
  for(const [m,meshes] of localBatches){
   if(meshes.length<2)continue;
   const copies=meshes.map(o=>o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));
   const g=mergeGeometries(copies,false);copies.forEach(c=>c.dispose());
   if(g){shape(g,m,[0,0,0],[1,1,1],object);meshes.forEach(o=>o.removeFromParent());}
  }
 }
 peek.world.traverse(o=>{
  if(!o.isMesh||!materials.has(o.material))return;
  for(let p=o;p&&p!==peek.world;p=p.parent)if(dynamic.has(p))return;
  if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(o);
 });
 for(const [m,meshes] of batches){
  const copies=meshes.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld));
  const g=mergeGeometries(copies,false);copies.forEach(c=>c.dispose());
  if(g){shape(g,m,[0,0,0]);meshes.forEach(o=>o.removeFromParent());}
 }
 const dispose=peek.dispose.bind(peek);
 return Object.assign(peek,{advanceAnimation(dt){
  elapsed+=Math.min(dt,.05);
  for(const m of moving){
   if(m.cloud)m.object.position.x=m.baseX+Math.sin(elapsed*.08+m.phase)*.5;
   else if(m.ripple)m.object.scale.setScalar(1+Math.sin(elapsed*.7+m.phase)*.08);
   else m.object.rotation.z=Math.sin(elapsed*.65+m.phase)*m.amount;
  }
  label.position.y=6.4+Math.sin(elapsed*.35)*.045;
  for(const b of birds){const t=elapsed*.18+b.phase;b.group.position.set(Math.sin(t)*3,2.2+Math.sin(t*1.4)*.3,-4.8+Math.cos(t)*1.3);b.group.rotation.y=t;for(let i=0;i<2;i++)b.wings[i].rotation.z=(i?1:-1)*(Math.PI/2+Math.sin(elapsed*3+b.phase)*.35);}
  for(const b of insects){const t=elapsed*(b.butterfly?.25:.4)+b.phase,x=Math.sin(t)*2,z=-5.7+Math.cos(t*.8)*1.5;b.group.position.set(x,groundHeight(x,z)+.8+Math.sin(t*2)*.25,z);b.group.rotation.y=-t;for(let i=0;i<2;i++)b.wings[i].rotation.z=(i?1:-1)*Math.sin(elapsed*(b.butterfly?3:12)+b.phase)*.65;}
 },dispose(){dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}});
}
