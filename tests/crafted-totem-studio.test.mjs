import test from 'node:test';
import assert from 'node:assert/strict';
import {createTotemStudioMaterials,createCraftedTotemStudioModel,disposeTotemStudioModel,totemStudioBodyGeometry} from '../app/services/craftedTotemStudio.js';
import {createTotemSculptureGeometry,createTotemMaterialCanvas} from '../app/services/spatialTotemSculpture.js';
import {createCraftedStoneCanvas} from '../app/services/craftedSurfaceTextures.js';
import {TOTEM_MODEL_CHOICES} from '../app/services/totemAppearance.js';
import {CRAFTED_TOTEM_SIGNS,craftedSignOutline} from '../app/services/craftedTotemSigns.js';
import {createCraftedSignGeometry} from '../app/services/craftedTotemGeometry.js';

test('every Totem has its own directional outline and a material appropriate to its body',()=>{
 const shapes=new Set();
 for(const {id}of TOTEM_MODEL_CHOICES){
  shapes.add(JSON.stringify(craftedSignOutline('left',id)));
  for(const side of ['left','right']){
   const v=createCraftedSignGeometry(side,id);assert.ok(v.every(Number.isFinite));
   for(let i=0;i<v.length;i+=6)assert.ok(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<1e-5);
  }
 }
 assert.equal(shapes.size,8);
 assert.equal(CRAFTED_TOTEM_SIGNS.rock.material,'stone');
 assert.equal(CRAFTED_TOTEM_SIGNS.moon.material,'ceramic');
 assert.equal(CRAFTED_TOTEM_SIGNS.organic.material,'glass');
});

test('all eight shared sculptures convert to complete studio meshes within the index budget',()=>{
 for(const {id} of TOTEM_MODEL_CHOICES){
  const source=createTotemSculptureGeometry(72,48,id),geometry=totemStudioBodyGeometry(id);
  assert.equal(geometry.index.count,source.indices.length);
  assert.equal(geometry.getAttribute('position').count,source.vertices.length/8);
  assert.ok(geometry.index.array.every(i=>i<geometry.getAttribute('position').count));
  assert.ok(geometry.getAttribute('position').array.every(Number.isFinite));
  assert.ok(geometry.getAttribute('normal').array.every(Number.isFinite));
  assert.equal(geometry.groups.reduce((n,g)=>n+g.count,0),geometry.index.count);
  assert.ok(geometry.groups.every(g=>g.materialIndex<7));
  assert.ok(geometry.boundingBox.max.y>1.1&&geometry.boundingBox.max.y<1.6);
  geometry.dispose();
 }
});

test('new stone has a broad footing, a narrowing monolith and separate mineral, quartz and lichen inlays',()=>{
 const mesh=createTotemSculptureGeometry(48,32,'rock'),v=mesh.vertices;
 const widths=[];
 for(const [lo,hi] of [[-.99,-.83],[-.45,-.15],[.75,.92]]){
  const xs=[];for(let i=0;i<v.length;i+=8)if(v[i+1]>=lo&&v[i+1]<=hi&&v[i+7]<1)xs.push(v[i]);
  widths.push(Math.max(...xs)-Math.min(...xs));
 }
 assert.ok(widths[0]>widths[1]*1.3,'footing is broader than the shaft');
 assert.ok(widths[1]>widths[2]*1.15,'standing stone narrows towards its broken crown');
 for(const category of [1,5,6])assert.ok(Array.from({length:v.length/8},(_,i)=>v[i*8+7]).some(value=>Math.floor(value)===category));
 for(let i=0;i<v.length;i+=8)assert.ok(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<1e-4,'all stone faces have usable unit normals');
});

test('the native Rock material uses the dedicated cached stone atlas',()=>{
 const original=globalThis.document;
 globalThis.document={createElement:()=>{const canvas={width:0,height:0};canvas.getContext=()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:image=>canvas.pixels=image.data});return canvas;}};
 try{
  const canvas=createTotemMaterialCanvas(.125,'rock');
  assert.equal(canvas,createCraftedStoneCanvas({width:64,height:128}));
  assert.equal(canvas.pixels.length,64*128*4);
  let low=255,high=0;for(let i=0;i<canvas.pixels.length;i+=4){low=Math.min(low,canvas.pixels[i]);high=Math.max(high,canvas.pixels[i]);}
  assert.ok(high-low>30,'stone retains fine mineral variation');
 }finally{globalThis.document=original;}
});

test('studio signs retain real boards and mounting hardware on every model, with disposable geometry',()=>{
 const materials=createTotemStudioMaterials({textures:false});
 for(const {id} of TOTEM_MODEL_CHOICES){
  const model=createCraftedTotemStudioModel({style:id,materials,textures:false}),signs=model.userData.signs;
  const boards=signs.children.filter(item=>item.userData.signId),pins=signs.children.filter(item=>item.geometry.type==='CylinderGeometry');
  assert.equal(boards.length,['basic','carved','botanical'].includes(id)?4:3);
  assert.equal(pins.length,3);
  for(const board of boards)assert.ok(board.position.z>0,'signs sit on the front of the real sculpture');
  for(const board of boards)assert.equal(board.material,materials['sign_'+id]);
  let disposals=0;model.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposals++));
  disposeTotemStudioModel(model);assert.ok(disposals>=boards.length+4);
 }
 Object.values(materials).forEach(m=>m.dispose());
});
