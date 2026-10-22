import test from 'node:test';import assert from 'node:assert/strict';
import {craftedTotemRadius,craftedTotemPoint,craftedCrownPoint,createCraftedSignGeometry} from '../app/services/craftedTotemGeometry.js';
import {totemCardSurfaces} from '../app/services/spatialTotemCards.js';
import {TOTEM_MODEL_CHOICES} from '../app/services/totemAppearance.js';
import {readFileSync} from 'node:fs';
import {createTotemSculptureGeometry} from '../app/services/spatialTotemSculpture.js';
import {createSpatialPrismRenderer,drawSpatialPrism,destroySpatialPrismRenderer} from '../app/services/spatialPrismRenderer.js';

test('crafted profile has a wide turned foot, slender shaft and sixteen physical crown flutes',()=>{
 assert.ok(craftedTotemRadius(0)>craftedTotemRadius(.5)*1.7);
 assert.ok(craftedTotemRadius(1)<craftedTotemRadius(0)*.6);
 assert.ok(Math.hypot(...craftedCrownPoint(.6,0).filter((_,i)=>i!==1))>Math.hypot(...craftedCrownPoint(.6,Math.PI/16).filter((_,i)=>i!==1)));
 for(const style of ['basic','carved','botanical','organic'])for(const [r,v] of [[24,16],[48,32],[72,48]]){
  const mesh=createTotemSculptureGeometry(r,v,style);assert.ok(mesh.vertices.every(Number.isFinite));assert.ok(mesh.indices.every(index=>index<mesh.vertices.length/8));assert.ok(mesh.vertices.length/8<65536);
 }
});
test('both arrow directions and the title board have closed, bevelled solids with finite unit normals',()=>{
 for(const style of ['left','right','header']){
  const mesh=createCraftedSignGeometry(style);assert.equal(mesh.length%18,0);assert.ok(mesh.every(Number.isFinite));
  let front=0,back=0,edge=0;
  for(let i=0;i<mesh.length;i+=18){const n=mesh.slice(i+3,i+6);assert.ok(Math.abs(Math.hypot(...n)-1)<1e-5);const z=mesh[i+2];if(z>.99&&n[2]>.99)front++;else if(z<-.99&&n[2]<-.99)back++;else edge++;}
  assert.ok(front&&back&&edge);
 }
});
test('board buffers are cached per shape and existing prism drawing remains independent',()=>{
 const calls=[];let id=0;const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>0,createBuffer:()=>++id,createProgram:()=>++id,createShader:()=>++id}, {get:(target,key)=>target[key]??((...args)=>calls.push([key,...args]))});
 const renderer=createSpatialPrismRenderer(gl),identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),view={projectionMatrix:identity,transform:{inverse:{matrix:identity}}};
 drawSpatialPrism(gl,renderer,view,{x:0,y:0,z:0},{signBoard:'left'});const count=calls.filter(c=>c[0]==='bufferData').length;
 drawSpatialPrism(gl,renderer,view,{x:0,y:0,z:0},{signBoard:'left'});assert.equal(calls.filter(c=>c[0]==='bufferData').length,count);
 drawSpatialPrism(gl,renderer,view,{x:0,y:0,z:0},{});assert.equal(Object.keys(renderer.signMeshes).length,1);
 destroySpatialPrismRenderer(gl,renderer);assert.ok(calls.some(c=>c[0]==='deleteBuffer'&&c[1]===renderer.signMeshes.left.buffer));
});

test('preview covers the full Totem catalogue, including all four landscape markers',()=>{
 assert.deepEqual(TOTEM_MODEL_CHOICES.map(item=>item.id),['basic','carved','botanical','organic','sun','leaf','rock','moon']);
 const preview=readFileSync(new URL('../tools/preview-totem.html',import.meta.url),'utf8');
 assert.match(preview,/for\(const choice of TOTEM_MODEL_CHOICES\)/);
 for(const id of ['sun','leaf','rock','moon']){
  const geometry=createTotemSculptureGeometry(24,16,id);
  assert.ok(geometry.vertices.length>0);assert.ok(geometry.vertices.every(Number.isFinite));assert.ok(geometry.indices.every(index=>index<geometry.vertices.length/8));
 }
});

test('Bionic, carved and botanical forms have distinct body silhouettes and crown profiles',()=>{
 const extent=style=>{
  const points=Array.from({length:96},(_,i)=>craftedTotemPoint(.48,i/96*Math.PI*2,style));
  return Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]));
 };
 assert.ok(extent('botanical')<extent('basic')*.82,'botanical stem is visibly slimmer');
 assert.ok(extent('carved')>extent('basic')*1.1,'carved trunk is visibly broader');
 const height=style=>Math.max(...Array.from({length:101},(_,i)=>craftedCrownPoint(i/100,0,style)[1]));
 assert.ok(height('basic')-height('carved')>.12,'the low clay bowl is distinct from the fluted cup');
 assert.ok(height('botanical')-height('basic')>.04,'the closed bud rises above the cup');
 for(const style of ['basic','carved','botanical']){
  const geometry=createTotemSculptureGeometry(24,16,style);assert.ok(geometry.vertices.every(Number.isFinite));
 }
 const a=craftedTotemPoint(.28,0,'carved'),b=craftedTotemPoint(.28,Math.PI,'carved');
 assert.ok(Math.abs(a[0]+b[0])>.08,'carved form retains a clear asymmetric centreline');
});

test('every physical sign is joined to the actual post and the brackets rotate with it',()=>{
 const cards=[{id:'title',title:'Food Forest'},...['right','left','right'].map((side,i)=>({id:'sign-'+i,title:'Path '+i,boardSide:side}))];
 function frontAt(style,x,y,halfWidth,halfHeight,halfDepth){
  const mesh=createTotemSculptureGeometry(48,32,style),v=mesh.vertices,hits=[];
  for(let i=0;i<mesh.indices.length;i+=3){
   const p=[0,1,2].map(k=>{const j=mesh.indices[i+k]*8;return [v[j]*halfWidth,(v[j+1]+1)*halfHeight,v[j+2]*halfDepth]});
   const [a,b,c]=p,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-10)continue;
   const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den,w=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den,t=1-u-w;
   if(u>=-1e-6&&w>=-1e-6&&t>=-1e-6)hits.push(a[2]*u+b[2]*w+c[2]*t);
  }
  assert.ok(hits.length,'attachment has a real mesh surface');return Math.max(...hits);
 }
 for(const style of TOTEM_MODEL_CHOICES.map(item=>item.id))for(const halfHeight of [.46,.6,1]){
  const position={x:2,y:.2,z:-3},base={style,signsVisible:true,bodyHalfWidth:.095,bodyHalfDepth:.075,bodyHalfHeight:halfHeight,demoZone:true};
  for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.6]){
   const right={x:Math.cos(yaw),z:-Math.sin(yaw)},front={x:-right.z,z:right.x};
   const boards=totemCardSurfaces(position,right,cards,'',base).filter(s=>s.mount);
   assert.equal(boards.length,['basic','carved','botanical'].includes(style)?4:3);
   for(const board of boards){
    const {mount}=board,b=mount.bracket,contact=frontAt(style,b.x,b.y,.095,halfHeight,.075);
    assert.ok(Math.abs(contact-mount.postContact.z)<1e-5,`${style} ${halfHeight} ${board.card.id}: expected ${contact}, got ${mount.postContact.z}`);
    assert.ok(b.z-b.halfDepth<contact-.004,'bracket overlaps the post');
    assert.ok(b.z+b.halfDepth>mount.boardBack+.004,'bracket overlaps the board');
    const dx=board.center.x-position.x,dz=board.center.z-position.z;
    assert.ok(Math.abs(dx*right.x+dz*right.z-mount.x)<1e-8);
    assert.ok(Math.abs(dx*front.x+dz*front.z-mount.front)<1e-8);
    assert.ok(Math.abs(b.x-mount.x)<board.width/2,'mount remains inside the sign root');
   }
  }
 }
});
