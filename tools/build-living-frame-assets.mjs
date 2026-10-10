// Derive the runtime tiers from the approved artwork, preserving the source GLB.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'docs/living-frame-blender/moss-ring.glb'));
const length=source.readUInt32LE(12),original=JSON.parse(source.toString('utf8',20,20+length));
const binary=source.subarray(28+length),widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
const sizes={5126:4,5125:4,5123:2,5121:1},methods={5126:'readFloatLE',5125:'readUInt32LE',5123:'readUInt16LE',5121:'readUInt8'},cache=new Map();
function values(index){
 if(cache.has(index))return cache.get(index);
 const a=original.accessors[index],view=original.bufferViews[a.bufferView],w=widths[a.type],s=sizes[a.componentType],out=new Array(a.count*w).fill(0);
 if(view)for(let i=0;i<a.count;i++)for(let j=0;j<w;j++)out[i*w+j]=binary[methods[a.componentType]]((view.byteOffset||0)+(a.byteOffset||0)+i*(view.byteStride||w*s)+j*s);
 if(a.sparse){const p=a.sparse,iv=original.bufferViews[p.indices.bufferView],vv=original.bufferViews[p.values.bufferView];for(let i=0;i<p.count;i++){const k=binary[methods[p.indices.componentType]]((iv.byteOffset||0)+(p.indices.byteOffset||0)+i*sizes[p.indices.componentType]);for(let j=0;j<w;j++)out[k*w+j]=binary[methods[a.componentType]]((vv.byteOffset||0)+(p.values.byteOffset||0)+(i*w+j)*s);}}
 cache.set(index,out);return out;
}
// Leaf blades are authored as three columns of UVs. Keep all leaves and their
// silhouette, using three longitudinal rows instead of four or five in SD.
function leafIndices(p){
 const indices=p.indices===undefined?Array.from({length:original.accessors[p.attributes.POSITION].count},(_,i)=>i):values(p.indices);
 if(p.attributes.TEXCOORD_0===undefined)return indices;
 const positions=values(p.attributes.POSITION),uv=values(p.attributes.TEXCOORD_0),targets=(p.targets||[]).map(t=>values(t.POSITION));
 const parent=new Map(),representatives=new Map();
 const find=x=>{let r=x;while(parent.get(r)!==r)r=parent.get(r);while(parent.get(x)!==x){const n=parent.get(x);parent.set(x,r);x=n;}return r;};
 for(const i of indices){if(parent.has(i))continue;parent.set(i,i);const point=[0,1,2].map(c=>Math.round((positions[i*3+c]+targets.reduce((s,t)=>s+(t?.[i*3+c]||0),0))*1e7)).join(',');if(representatives.has(point))parent.set(i,find(representatives.get(point)));else representatives.set(point,i);}
 for(let i=0;i<indices.length;i+=3){const r=find(indices[i]);parent.set(find(indices[i+1]),r);parent.set(find(indices[i+2]),r);}
 const components=new Map();for(let i=0;i<indices.length;i+=3){const r=find(indices[i]);if(!components.has(r))components.set(r,[]);components.get(r).push(...indices.slice(i,i+3));}
 const out=[];
 for(const tris of components.values()){
  const grid=new Map(),rows=new Set(),cols=new Set();for(const i of tris){const u=uv[i*2],v=uv[i*2+1];grid.set(u.toFixed(5)+','+v.toFixed(5),i);rows.add(v.toFixed(5));cols.add(u.toFixed(5));}
  const sortedRows=[...rows].sort((a,b)=>Number(a)-Number(b)),sortedCols=[...cols].sort((a,b)=>Number(a)-Number(b));
  if(sortedCols.length!==3||sortedRows.length<4||grid.size!==sortedRows.length*3){out.push(...tris);continue;}
  const selected=[sortedRows[0],sortedRows[Math.floor((sortedRows.length-1)/2)],sortedRows.at(-1)];
  const first=tris.slice(0,3),area=first.reduce((s,i,k)=>s+uv[i*2]*uv[first[(k+1)%3]*2+1]-uv[first[(k+1)%3]*2]*uv[i*2+1],0);
  for(let r=0;r<2;r++)for(let c=0;c<2;c++){
   const a=grid.get(sortedCols[c]+','+selected[r]),b=grid.get(sortedCols[c+1]+','+selected[r]),d=grid.get(sortedCols[c]+','+selected[r+1]),e=grid.get(sortedCols[c+1]+','+selected[r+1]);
   out.push(...(area>0?[a,b,e,a,e,d]:[a,e,b,a,d,e]));
  }
 }
 return out;
}
const asset=structuredClone(original),chunks=[],views=[],accessors=[],accessorMap=new Map();let byteLength=0;
function bufferView(data,target){const padding=(4-byteLength%4)%4;if(padding){chunks.push(Buffer.alloc(padding));byteLength+=padding;}const index=views.length;views.push({buffer:0,byteOffset:byteLength,byteLength:data.length,...(target?{target}:{})});chunks.push(data);byteLength+=data.length;return index;}
function accessor(a,data){const w=widths[a.type],out=Buffer.alloc(data.length*sizes[a.componentType]),write={5126:'writeFloatLE',5125:'writeUInt32LE',5123:'writeUInt16LE',5121:'writeUInt8'}[a.componentType];data.forEach((v,i)=>out[write](v,i*sizes[a.componentType]));const item={...a,bufferView:bufferView(out),byteOffset:0,count:data.length/w};delete item.sparse;if(a.min){item.min=Array(w).fill(Infinity);item.max=Array(w).fill(-Infinity);data.forEach((v,i)=>{item.min[i%w]=Math.min(item.min[i%w],v);item.max[i%w]=Math.max(item.max[i%w],v);});}accessors.push(item);return accessors.length-1;}
function copyAccessor(i){if(!accessorMap.has(i))accessorMap.set(i,accessor(original.accessors[i],values(i)));return accessorMap.get(i);}
let triangles=0;const meshes=[],meshMap=new Map(),omitted=[];
for(const [i,m] of original.meshes.entries()){
 if(/Plant attached roots|Aerial root fine branching/.test(m.name)){omitted.push(m.name);continue;}
 const copy=structuredClone(m);for(const p of copy.primitives){
  const old=structuredClone(p),indices=/Groundcover growth|Outer side groundcover/.test(m.name)?leafIndices(old):(old.indices===undefined?Array.from({length:original.accessors[old.attributes.POSITION].count},(_,j)=>j):values(old.indices));
  const selected=[...new Set(indices)],remap=new Map(selected.map((v,j)=>[v,j]));
  const compact=index=>{const a=original.accessors[index],w=widths[a.type],data=values(index);return accessor(a,selected.flatMap(v=>data.slice(v*w,(v+1)*w)));};
  for(const name of Object.keys(p.attributes))p.attributes[name]=compact(old.attributes[name]);
  p.indices=accessor({componentType:5125,type:'SCALAR'},indices.map(v=>remap.get(v)));
  for(let j=0;j<(p.targets||[]).length;j++)for(const name of Object.keys(p.targets[j]))p.targets[j][name]=compact(old.targets[j][name]);
  triangles+=indices.length/3;
 }meshMap.set(i,meshes.length);meshes.push(copy);
}
for(const node of asset.nodes)if(node.mesh!==undefined){if(meshMap.has(node.mesh))node.mesh=meshMap.get(node.mesh);else{delete node.mesh;delete node.weights;}}
for(const clip of asset.animations||[]){clip.channels=clip.channels.filter(c=>c.target.path!=='weights'||asset.nodes[c.target.node].mesh!==undefined);for(const sampler of clip.samplers){sampler.input=copyAccessor(sampler.input);sampler.output=copyAccessor(sampler.output);}}
for(const image of asset.images){const v=original.bufferViews[image.bufferView];image.bufferView=bufferView(binary.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength));}
asset.meshes=meshes;asset.accessors=accessors;asset.bufferViews=views;asset.buffers=[{byteLength}];asset.asset.generator='NourishlandXR SD leaf topology reduction';
const json=Buffer.from(JSON.stringify(asset)),jsonPad=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),bin=Buffer.concat([...chunks,Buffer.alloc((4-byteLength%4)%4)]),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonPad.length+bin.length,8);header.writeUInt32LE(jsonPad.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(bin.length);binHeader.writeUInt32LE(0x004e4942,4);
const output=path.join(root,'app/assets/living-frame');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'living-frame-sd.glb'),Buffer.concat([header,jsonPad,binHeader,bin]));fs.copyFileSync(path.join(root,'docs/living-frame-blender/moss-ring.glb'),path.join(output,'living-frame-hd.glb'));
const report={sd:{triangles,meshes:meshes.length,bytes:28+jsonPad.length+bin.length,omitted},hd:{triangles:255964,meshes:112,bytes:source.length},source:'docs/living-frame-blender/moss-ring.glb'};fs.writeFileSync(path.join(output,'tiers.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({sd:report.sd.triangles,sdBytes:report.sd.bytes,hdBytes:source.length}));
