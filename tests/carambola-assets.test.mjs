import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const folder=new URL('../app/assets/fruit-window/carambola-bayberry/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('runtime-manifest.json',folder),'utf8'));
function load(name){const data=fs.readFileSync(new URL(name,folder));assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(8),data.length);const length=data.readUInt32LE(12);const json=JSON.parse(data.subarray(20,20+length).toString());const bin=data.subarray(20+length+8);return {json,bin,bytes:data.length};}
function values(asset,index){const a=asset.json.accessors[index],view=asset.json.bufferViews[a.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];assert.equal(a.componentType,5126);const values=[];for(let i=0;i<a.count;i++){const row=[];for(let k=0;k<width;k++)row.push(asset.bin.readFloatLE((view.byteOffset||0)+(a.byteOffset||0)+i*(view.byteStride||width*4)+k*4));values.push(row);}return values;}
test('Refined carambola preserves the Fruit Window stage, pick and cutaway contract',()=>{
 const asset=load('carambola_scene.glb'),cfg=manifest.species.carambola,names=new Set(asset.json.nodes.map(n=>n.name));
 for(const name of [cfg.species_root,cfg.content_root,cfg.fruit_root,cfg.collision_proxy,cfg.closed_exterior,cfg.cutaway_assembly,...cfg.pivots,...Object.values(cfg.stages).map(s=>s.root),...cfg.supporting_fruits])assert.ok(names.has(name),name);
 assert.deepEqual(new Set(asset.json.animations.map(a=>a.name)),new Set(['Development','Open','Close','Pick_Demo','Return_Demo']));
 assert.ok(asset.bytes<16*1024*1024,'XR download budget');assert.equal(cfg.fruit_count,8);assert.deepEqual(cfg.fruits_per_branch,[4,4]);
 for(const clip of asset.json.animations){for(const channel of clip.channels){assert.ok(asset.json.nodes[channel.target.node]);const times=values(asset,clip.samplers[channel.sampler].input).flat();assert.ok(times.at(-1)>times[0],clip.name+' has actual animation');}}
 const ripe=load('carambola_ripe.glb');assert.deepEqual(new Set(ripe.json.animations.map(a=>a.name)),new Set(['Open','Close']));assert.ok(ripe.json.nodes.some(n=>n.name===cfg.closed_exterior));
});
test('The exported fruit has five broad longitudinal wings and embedded surface maps',()=>{
 const asset=load('carambola_scene.glb');const node=asset.json.nodes.find(n=>n.name==='CS_Ripe_Whole_Five_Ribs');const primitive=asset.json.meshes[node.mesh].primitives[0];const points=values(asset,primitive.attributes.POSITION);
 // Blender Z becomes glTF Y. Compare the equator with the narrow attachment.
 const equator=points.filter(p=>Math.abs(p[1]+.0575)<.002);assert.ok(equator.length>70);
 const radii=new Map();for(const p of equator){const a=(Math.atan2(-p[2],p[0])+Math.PI*2)%(Math.PI*2);const bin=Math.round(a/(Math.PI*2)*120)%120;const r=Math.hypot(p[0],p[2]);radii.set(bin,Math.max(radii.get(bin)||0,r));}
 const angles=equator.map(p=>({angle:Math.atan2(-p[2],p[0]),r:Math.hypot(p[0],p[2])})).sort((a,b)=>a.angle-b.angle);
 const wings=angles.filter((p,i)=>p.r>.034&&angles[(i+angles.length-1)%angles.length].r<=.034);
 assert.equal(wings.length,5,'A star cross-section, not a round fruit');const max=Math.max(...radii.values()),min=Math.min(...radii.values());assert.ok(max/min>2.1);
 const m=asset.json.materials[primitive.material];assert.ok(m.normalTexture);assert.ok(m.pbrMetallicRoughness.baseColorTexture);assert.ok(m.pbrMetallicRoughness.metallicRoughnessTexture);
 for(const im of asset.json.images)assert.ok(im.bufferView!==undefined && !im.uri,'No missing external image dependencies');
});
test('Compound leaves retain distinct curved leaflets and their underside materials',()=>{
 const {json}=load('carambola_scene.glb');const leaves=json.nodes.filter(n=>n.name?.startsWith('CS_Compound_Leaf_')&&n.name.endsWith('_Natural_Leaflets'));
 assert.equal(leaves.length,14);assert.ok(leaves.reduce((n,l)=>n+l.extras.leaflet_count,0)>=100);
 for(const leaf of leaves){const mats=json.meshes[leaf.mesh].primitives.map(p=>json.materials[p.material].name);assert.ok(mats.includes('CS_Photo_Leaf_Upper'));assert.ok(mats.includes('CS_Photo_Leaf_Underside'));}
});
