// Validate the exported asset, including animated geometry clearance at seven times.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Matrix4,Vector3,Quaternion} from '../../app/assets/fruit-window/vendor/three.module.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const diverse=process.argv.includes('--diverse');
const name=diverse?'diverse-ring':'full-ring';
const bytes=fs.readFileSync(path.join(root,name+'.glb'));
assert.equal(bytes.toString('ascii',0,4),'glTF');
const jsonLength=bytes.readUInt32LE(12),asset=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
const binaryOffset=20+jsonLength+8;
assert.equal(asset.animations.length,1);
assert.equal(asset.images.length,4);
assert.ok(asset.images.every(image=>Number.isInteger(image.bufferView)));
assert.ok(!asset.cameras?.length);
assert.ok(asset.nodes.every(node=>!(/REFERENCE|Take a moment|look around|clearance/i.test(node.name||''))));
const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
const cache=new Map();
function values(index){
 if(cache.has(index))return cache.get(index);
 const a=asset.accessors[index],v=asset.bufferViews[a.bufferView],width=widths[a.type];
 const sizes={5126:4,5125:4,5123:2,5121:1},size=sizes[a.componentType],stride=v?.byteStride||width*size;
 const offset=binaryOffset+(v?.byteOffset||0)+(a.byteOffset||0);
 const read=a.componentType===5126?'readFloatLE':a.componentType===5125?'readUInt32LE':a.componentType===5123?'readUInt16LE':'readUInt8';
 const result=Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,j)=>v?bytes[read](offset+i*stride+j*size):0));
 if(a.sparse){
  const sparse=a.sparse,iv=asset.bufferViews[sparse.indices.bufferView],vv=asset.bufferViews[sparse.values.bufferView];
  const indexSize=sizes[sparse.indices.componentType],indexRead=sparse.indices.componentType===5125?'readUInt32LE':sparse.indices.componentType===5123?'readUInt16LE':'readUInt8';
  const io=binaryOffset+(iv.byteOffset||0)+(sparse.indices.byteOffset||0),vo=binaryOffset+(vv.byteOffset||0)+(sparse.values.byteOffset||0);
  for(let i=0;i<sparse.count;i++){const index=bytes[indexRead](io+i*indexSize);for(let j=0;j<width;j++)result[index][j]=bytes[read](vo+(i*width+j)*size);}
 }
 cache.set(index,result);return result;
}
const clip=asset.animations[0];
const tracks=clip.channels.map(channel=>{
 const sampler=clip.samplers[channel.sampler];
 assert.ok(!sampler.interpolation||sampler.interpolation==='LINEAR'||sampler.interpolation==='STEP');
 const times=values(sampler.input).map(v=>v[0]);
 let outputs=values(sampler.output);
 if(channel.target.path==='weights'){
  const width=asset.meshes[asset.nodes[channel.target.node].mesh].primitives[0].targets.length;
  const flat=outputs.flat();assert.equal(flat.length,times.length*width);
  outputs=times.map((_,i)=>flat.slice(i*width,(i+1)*width));
 }
 return {node:channel.target.node,path:channel.target.path,times,outputs,interpolation:sampler.interpolation};
});
const hinges=tracks.filter(t=>asset.nodes[t.node].name.startsWith('Unfolding leaf')&&t.path==='rotation');
const stems=tracks.filter(t=>asset.nodes[t.node].name.startsWith('New shoot stem')&&t.path==='scale');
if(!diverse){assert.equal(hinges.length,6);assert.equal(stems.length,3);}
for(const t of hinges)assert.ok(t.outputs[0].some((v,i)=>Math.abs(v-t.outputs.at(-1)[i])>.15));
for(const t of stems){assert.ok(Math.min(...t.outputs[0])<.03);assert.ok(t.outputs.at(-1).every(v=>v>.99));}
function sample(track,time){
 let left=0;while(left<track.times.length-1&&track.times[left+1]<=time)left++;
 const right=Math.min(left+1,track.times.length-1);
 const f=right===left||track.interpolation==='STEP'?0:Math.max(0,Math.min(1,(time-track.times[left])/(track.times[right]-track.times[left])));
 const a=track.outputs[left],b=track.outputs[right];
 if(track.path==='rotation')return new Quaternion(...a).slerp(new Quaternion(...b),f).toArray();
 return a.map((value,i)=>value+(b[i]-value)*f);
}
let triangles=0,primitives=0;
for(const node of asset.nodes){if(node.mesh===undefined)continue;
 for(const primitive of asset.meshes[node.mesh].primitives){
  primitives++;triangles+=(primitive.indices===undefined?asset.accessors[primitive.attributes.POSITION].count:asset.accessors[primitive.indices].count)/3;
 }
}
assert.ok(primitives<=(diverse?80:35),'Geometry must be batched into a limited number of growth groups');
assert.ok(triangles<125000,'Keep this review draft below its provisional geometry budget');
function geometryAt(time){
 const local=asset.nodes.map(n=>({translation:n.translation||[0,0,0],rotation:n.rotation||[0,0,0,1],scale:n.scale||[1,1,1],weights:n.weights||(n.mesh===undefined?[]:asset.meshes[n.mesh].weights)||[]}));
 for(const t of tracks)local[t.node][t.path]=sample(t,time);
 let minRadius=Infinity,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 function visit(index,parent){
  const n=asset.nodes[index],s=local[index];
  const matrix=new Matrix4().multiplyMatrices(parent,n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...s.translation),new Quaternion(...s.rotation),new Vector3(...s.scale)));
  if(n.mesh!==undefined)for(const primitive of asset.meshes[n.mesh].primitives){
   const positions=values(primitive.attributes.POSITION),targets=(primitive.targets||[]).map(target=>values(target.POSITION));
   for(let vertex=0;vertex<positions.length;vertex++){
   const p=positions[vertex].slice();
   for(let target=0;target<targets.length;target++)for(let axis=0;axis<3;axis++)p[axis]+=targets[target][vertex][axis]*(s.weights[target]||0);
   const point=new Vector3(...p).applyMatrix4(matrix),v=point.toArray();
   minRadius=Math.min(minRadius,Math.hypot(point.x,point.y));
   for(let i=0;i<3;i++){min[i]=Math.min(min[i],v[i]);max[i]=Math.max(max[i],v[i]);}
  }}
  for(const child of n.children||[])visit(child,matrix);
 }
 for(const index of asset.scenes[asset.scene||0].nodes)visit(index,new Matrix4());
 assert.ok(minRadius>.8,`Reading clearance breached at ${time} seconds`);
 return {time,minRadius,dimensionsM:max.map((value,i)=>value-min[i])};
}
const geometrySamples=(diverse?Array.from({length:21},(_,i)=>i*3):[0,6,12,18,24,30,36]).map(geometryAt);
const bloomTracks=tracks.filter(t=>asset.nodes[t.node].name.startsWith('Blooming flowers')&&t.path==='weights');
if(diverse){
 assert.equal(bloomTracks.length,9);
 for(const t of bloomTracks){assert.equal(sample(t,38)[1],0,'Petals must remain closed before the finale');assert.ok(sample(t,60)[1]>.99,'All flowers must finish opening');}
 assert.ok(bloomTracks.some(t=>sample(t,46)[1]>.05));
 assert.ok(tracks.filter(t=>asset.nodes[t.node].name.startsWith('Winding and cascading vines')).length===3);
 assert.equal(tracks.filter(t=>asset.nodes[t.node].name.startsWith('Hanging aerial roots')).length,3);
 assert.equal(tracks.filter(t=>asset.nodes[t.node].name.startsWith('Unique roots')).length,3);
 const foliage=tracks.filter(t=>asset.nodes[t.node].name.startsWith('Groundcover growth'));
 assert.ok(foliage.length>=20);
 assert.ok(foliage.every(t=>sample(t,0).every(v=>v===0)),'All foliage must begin in its seedling state');
 assert.ok(new Set(foliage.map(t=>sample(t,15).map(v=>v.toFixed(2)).join(','))).size>=5,'Growth groups must visibly have different maturity at the same time');
}
const report={stage:diverse?4:3,assetBytes:bytes.length,meshes:asset.meshes.length,primitives,triangles,
 textures:4,animations:1,channels:tracks.length,...(diverse?{morphGrowthGroups:tracks.filter(t=>t.path==='weights').length}:{leafHinges:hinges.length,newShoots:stems.length}),
 bloomGroups:bloomTracks.length,geometrySamples,checks:diverse?['four embedded textures','reference and cameras excluded','single growth clip','different foliage maturity at the same time','flowers closed before finale and open at finish','winding vines and aerial root tracks','reading clearance including morph geometry at 21 times','provisional geometry budget']:['four embedded textures','reference and cameras excluded','single growth clip','six hinge rotations','three extending stems','batched geometry budget','reading clearance at seven animation times'],headsetVerified:false};
fs.writeFileSync(path.join(root,name+'-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
