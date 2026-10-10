// Validate exported geometry, growth sequencing and reading clearance.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Matrix4,Vector3,Quaternion} from '../../app/assets/fruit-window/vendor/three.module.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const moss=process.argv.includes('--moss');
const wrapped=moss||process.argv.includes('--wrap');
const diverse=wrapped||process.argv.includes('--diverse');
const name=moss?'moss-ring':wrapped?'wrap-ring':diverse?'diverse-ring':'full-ring';
const metadata=diverse?JSON.parse(fs.readFileSync(path.join(root,name+'-dimensions.json'))):null;
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
assert.ok(primitives<=(moss?115:wrapped?110:diverse?80:35),'Geometry must be batched into a limited number of growth groups');
// The dense three-row study increases planting from 95 to 189 pockets. Its
// review ceiling is 160k after simplifying tiny leaf and root tubes; this is
// a draft geometry ceiling, not a headset performance certification.
// Full-depth planting is a separate art review candidate with a 260k ceiling.
assert.ok(triangles<(wrapped?260000:diverse?160000:125000),'Keep this review draft below its provisional geometry budget');
let rootAttachmentEvidence=null;
let sideCoverageEvidence=null,taprootEvidence=null;
function geometryAt(time){
 const local=asset.nodes.map(n=>({translation:n.translation||[0,0,0],rotation:n.rotation||[0,0,0,1],scale:n.scale||[1,1,1],weights:n.weights||(n.mesh===undefined?[]:asset.meshes[n.mesh].weights)||[]}));
 for(const t of tracks)local[t.node][t.path]=sample(t,time);
 let minRadius=Infinity,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 const rootPoints=[],stemPoints=[],sidePoints=[],tapPoints=[],tapForkPoints=[];
 function visit(index,parent){
  const n=asset.nodes[index],s=local[index];
  const matrix=new Matrix4().multiplyMatrices(parent,n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...s.translation),new Quaternion(...s.rotation),new Vector3(...s.scale)));
  if(n.mesh!==undefined)for(const primitive of asset.meshes[n.mesh].primitives){
   const positions=values(primitive.attributes.POSITION),targets=(primitive.targets||[]).map(target=>values(target.POSITION));
   for(let vertex=0;vertex<positions.length;vertex++){
   const p=positions[vertex].slice();
   for(let target=0;target<targets.length;target++)for(let axis=0;axis<3;axis++)p[axis]+=targets[target][vertex][axis]*(s.weights[target]||0);
   const point=new Vector3(...p).applyMatrix4(matrix),v=point.toArray();
   if(diverse&&time===60){
    if(n.name.startsWith('Plant attached roots'))rootPoints.push(v);
    if(n.name.startsWith('Branching shoots')||n.name.startsWith('Outer side supporting stems')||n.name==='Large leaf supporting stems')stemPoints.push(v);
    if(n.name.startsWith('Outer side groundcover'))sidePoints.push(v);
    if(n.name==='Central taproot to preview floor')tapPoints.push(v);
    if(n.name==='Taproot splitting lateral branches')tapForkPoints.push(v);
   }
   minRadius=Math.min(minRadius,Math.hypot(point.x,point.y));
   for(let i=0;i<3;i++){min[i]=Math.min(min[i],v[i]);max[i]=Math.max(max[i],v[i]);}
  }}
  for(const child of n.children||[])visit(child,matrix);
 }
 for(const index of asset.scenes[asset.scene||0].nodes)visit(index,new Matrix4());
 assert.ok(minRadius>.8,`Reading clearance breached at ${time} seconds`);
 if(diverse&&time===60){
  const nearest=(origin,points)=>{let best=Infinity;for(const p of points){const distance=(p[0]-origin[0])**2+(p[1]-origin[1])**2+(p[2]-origin[2])**2;if(distance<best)best=distance;}return Math.sqrt(best);};
  const roots=metadata.plant_root_origins_gltf.map(p=>nearest(p,rootPoints));
  const stems=metadata.plant_root_origins_gltf.map(p=>nearest(p,stemPoints));
  assert.ok(roots.every(d=>d<.003),'Each plant origin must touch actual exported root geometry');
  assert.ok(stems.every(d=>d<.003),'Each root origin must touch actual exported supporting stem geometry');
  rootAttachmentEvidence={originsChecked:roots.length,maxRootDistanceM:Math.max(...roots),maxStemDistanceM:Math.max(...stems)};
  if(wrapped){
   const columns=metadata.outer_side_columns,occupied=new Set();
   for(const p of sidePoints){
    const angle=(Math.atan2(p[1],p[0])+Math.PI*2)%(Math.PI*2);
    const column=Math.floor(angle/(Math.PI*2)*columns);
    const depth=-p[2];let row=0;
    for(let i=1;i<metadata.outer_side_depth_rows_m.length;i++)if(Math.abs(depth-metadata.outer_side_depth_rows_m[i])<Math.abs(depth-metadata.outer_side_depth_rows_m[row]))row=i;
    occupied.add(`${column}:${row}`);
   }
   sideCoverageEvidence={occupiedAngleDepthBins:occupied.size,totalBins:columns*4,minDepthM:Math.min(...sidePoints.map(p=>p[2])),maxDepthM:Math.max(...sidePoints.map(p=>p[2]))};
   assert.equal(occupied.size,columns*4,'Side foliage must occupy every angular/depth bin');
   assert.ok(sideCoverageEvidence.minDepthM<-.09&&sideCoverageEvidence.maxDepthM>.09,'Side leaves must reach both rim shoulders');
   const minTapY=Math.min(...tapPoints.map(p=>p[1]));
   assert.ok(Math.abs(minTapY-metadata.preview_floor_y_m)<.012,'Actual taproot must reach the preview floor');
   assert.ok(min[1]>=metadata.preview_floor_y_m-.012,'Root geometry must remain at or above the floor tolerance');
   assert.ok(Math.min(...tapForkPoints.map(p=>p[0]))<-.10&&Math.max(...tapForkPoints.map(p=>p[0]))>.10,'Taproot must split to both sides');
   taprootEvidence={floorYM:metadata.preview_floor_y_m,lowestTapVertexYM:minTapY,lowestModelVertexYM:min[1],lateralForks:metadata.taproot_lateral_branches};
  }
 }
 return {time,minRadius,dimensionsM:max.map((value,i)=>value-min[i])};
}
const geometrySamples=(diverse?Array.from({length:21},(_,i)=>i*3):[0,6,12,18,24,30,36]).map(geometryAt);
const bloomTracks=tracks.filter(t=>asset.nodes[t.node].name.startsWith('Blooming flowers')&&t.path==='weights');
if(diverse){
 assert.equal(bloomTracks.length,12);
 for(const t of bloomTracks){
  if(t.node!==undefined&&asset.nodes[t.node].name.endsWith('wave 3'))assert.ok(sample(t,38)[1]>.99,'The few early blooms must open ahead of the finale');
  else assert.equal(sample(t,38)[1],0,'Most flowers must remain closed before the finale');
  assert.ok(sample(t,60)[1]>.99,'All flowers must finish opening');
 }
 assert.ok(bloomTracks.some(t=>sample(t,46)[1]>.05));
 assert.ok(tracks.filter(t=>asset.nodes[t.node].name.startsWith('Winding and cascading vines')).length===3);
 assert.equal(tracks.filter(t=>asset.nodes[t.node].name.startsWith('Hanging aerial roots')).length,3);
 assert.equal(tracks.filter(t=>asset.nodes[t.node].name.startsWith('Plant attached roots')).length,wrapped?15:12);
 assert.equal(metadata.root_systems,metadata.plant_clusters);
 assert.equal(metadata.plant_root_origins_gltf.length,metadata.plant_clusters);
 assert.ok(metadata.root_depths_m.some(v=>v>.12)&&metadata.root_depths_m.some(v=>v<.025),'Root depths must include shallow and deep systems');
 assert.ok(metadata.early_flowers<metadata.late_flowers/4,'Keep early flowers a small minority');
 const worms=tracks.filter(t=>asset.nodes[t.node].name.startsWith('Slow earthworm')&&t.path==='scale');
 assert.equal(worms.length,3);for(const t of worms){assert.ok(Math.max(...sample(t,0))<.02);assert.ok(Math.min(...sample(t,32))>.99);}
 const soil=tracks.filter(t=>['Brown soil section','Dark topsoil section'].includes(asset.nodes[t.node].name)&&t.path==='weights');
 assert.equal(soil.length,2);for(const t of soil){assert.equal(sample(t,18)[0],0);assert.ok(sample(t,48)[0]>.99);}
 const foliage=tracks.filter(t=>asset.nodes[t.node].name.startsWith('Groundcover growth'));
 assert.ok(foliage.length>=20);
 assert.ok(foliage.every(t=>sample(t,0).every(v=>v===0)),'All foliage must begin in its seedling state');
 assert.ok(new Set(foliage.map(t=>sample(t,15).map(v=>v.toFixed(2)).join(','))).size>=5,'Growth groups must visibly have different maturity at the same time');
 if(wrapped){
  const side=tracks.filter(t=>asset.nodes[t.node].name.startsWith('Outer side groundcover'));
  assert.equal(side.length,12);assert.ok(side.every(t=>sample(t,0).every(v=>v===0)&&sample(t,60).every(v=>v>.99)));
  for(const name of ['Aerial root secondary branches','Aerial root fine branching']){
   const splits=tracks.filter(t=>asset.nodes[t.node].name.startsWith(name));assert.equal(splits.length,3);
   assert.ok(splits.every(t=>sample(t,20).every(v=>v===0)&&sample(t,60).every(v=>v>.99)),'Root splits must develop later than their primary roots');
  }
  assert.ok(metadata.aerial_secondary_branches>80&&metadata.aerial_fine_branches>160);
 }
}
let mossEvidence=null;
if(moss){
 const tufts=tracks.filter(t=>asset.nodes[t.node].name.startsWith('Inner right moss buildup'));
 const dew=tracks.filter(t=>asset.nodes[t.node].name.startsWith('Late water microdroplets'));
 const highlights=tracks.filter(t=>asset.nodes[t.node].name==='Quiet condensation highlights');
 assert.equal(tufts.length,3);assert.equal(dew.length,2);assert.equal(highlights.length,1);
 assert.ok(tufts.every(t=>sample(t,26).every(v=>v===0)&&sample(t,60).every(v=>v>.99)),'Moss must build progressively after the initial planting');
 assert.ok(new Set(tufts.map(t=>sample(t,40).join(','))).size>1,'Moss buildup waves must have different maturity');
 assert.ok([...dew,...highlights].every(t=>sample(t,49).every(v=>v===0)&&sample(t,60).every(v=>v>.99)),'Condensation must be a late finish');
 assert.equal(metadata.microdroplets,24);
 assert.ok(metadata.microdroplet_diameters_m.every(v=>v>=.0013&&v<=.0032));
 assert.ok(metadata.microdroplet_origins_gltf.every(p=>p[0]>.7&&Math.hypot(p[0],p[1])>=.826),'Droplets must stay on the inner right, clear of text');
 const water=asset.materials.find(m=>m.name==='Water microdroplets');
 assert.equal(water.alphaMode,'BLEND');assert.ok(water.pbrMetallicRoughness.roughnessFactor<=.11);
 assert.ok(water.pbrMetallicRoughness.baseColorFactor[3]<.5);
 assert.ok(!water.extensions?.KHR_materials_transmission?.transmissionFactor,'Avoid an extra transmission render pass in this candidate');
 mossEvidence={tufts:metadata.moss_tufts,innerWallTufts:metadata.moss_inner_wall_tufts,mossGrowthSeconds:metadata.moss_growth_seconds,droplets:metadata.microdroplets,diameterRangeM:[Math.min(...metadata.microdroplet_diameters_m),Math.max(...metadata.microdroplet_diameters_m)],dewGrowthSeconds:metadata.dew_growth_seconds,waterAlpha:water.pbrMetallicRoughness.baseColorFactor[3],transmission:false};
}
const report={stage:moss?6:wrapped?5:diverse?4:3,assetBytes:bytes.length,meshes:asset.meshes.length,primitives,triangles,...(moss?{mossEvidence}:{}),
 textures:4,animations:1,channels:tracks.length,...(diverse?{morphGrowthGroups:tracks.filter(t=>t.path==='weights').length}:{leafHinges:hinges.length,newShoots:stems.length}),
 bloomGroups:bloomTracks.length,...(diverse?{plantClusters:metadata.plant_clusters,attachedRootSystems:metadata.root_systems,rootAttachmentEvidence,earlyFlowers:metadata.early_flowers,lateFlowers:metadata.late_flowers,worms:metadata.worms}:{}),...(wrapped?{sideCoverageEvidence,taprootEvidence}:{}),geometrySamples,checks:diverse?['four embedded textures','reference and cameras excluded','single growth clip','different foliage maturity at the same time','few early flowers and mostly late blooms','exported roots meet each planting origin and stem','shallow and deep root depths','worms emerge before the organic layer completes','soil accumulation morphs','winding vines and aerial root tracks','reading clearance including morph geometry at 21 times','provisional geometry budget',...(wrapped?['side foliage occupies all 384 angle-depth bins and both shoulders','taproot reaches preview floor and splits sideways','secondary and fine roots grow after primary roots']:[])]:['four embedded textures','reference and cameras excluded','single growth clip','six hinge rotations','three extending stems','batched geometry budget','reading clearance at seven animation times'],headsetVerified:false};
if(moss)report.checks.push('three staggered inner-right moss waves','24 microdroplets in the late finish','water alpha blending without transmission');
if(moss)report.checks.push('three staggered inner-right moss waves','24 microdroplets in the late finish','water alpha blending without transmission');
fs.writeFileSync(path.join(root,name+'-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
