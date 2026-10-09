import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const bytes=fs.readFileSync(path.join(root,'botanical-section.glb'));
const jsonLength=bytes.readUInt32LE(12),asset=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
const binaryOffset=20+jsonLength+8;
assert.equal(asset.animations.length,1);
assert.equal(asset.images.length,4);
assert.ok(asset.images.every(image=>Number.isInteger(image.bufferView)));
assert.ok(!asset.cameras?.length);
assert.ok(asset.nodes.every(node=>!(/REFERENCE|Take a moment|look around|clearance/i.test(node.name||''))));
function value(index,last=false){
 const accessor=asset.accessors[index],view=asset.bufferViews[accessor.bufferView];
 assert.equal(accessor.componentType,5126);
 const components={SCALAR:1,VEC3:3,VEC4:4}[accessor.type],stride=view.byteStride||components*4;
 const offset=binaryOffset+(view.byteOffset||0)+(accessor.byteOffset||0)+(last?accessor.count-1:0)*stride;
 return Array.from({length:components},(_,i)=>bytes.readFloatLE(offset+i*4));
}
const clip=asset.animations[0],hinges=[],stems=[];
for(const channel of clip.channels){
 const name=asset.nodes[channel.target.node].name||'',sampler=clip.samplers[channel.sampler];
 if(name.startsWith('Unfolding leaf')&&channel.target.path==='rotation'){
  const first=value(sampler.output),last=value(sampler.output,true);
  assert.ok(first.some((v,i)=>Math.abs(v-last[i])>.15),'A hinged leaf must change orientation');
  hinges.push({name,first,last});
 }
 if(name.startsWith('New shoot stem')&&channel.target.path==='scale'){
  const first=value(sampler.output),last=value(sampler.output,true);
  // Blender's local Z stem axis becomes local Y in glTF. Check the
  // contracted axis independently of the exporter's coordinate convention.
  assert.ok(Math.min(...first)<.03&&last.every(v=>v>.99));
  stems.push({name,first,last});
 }
}
assert.equal(hinges.length,6);assert.equal(stems.length,3);
const report={assetBytes:bytes.length,meshes:asset.meshes.length,textures:asset.images.length,
 animations:asset.animations.length,channels:clip.channels.length,hinges,stems,
 checks:['one growth clip','four embedded textures','reference and cameras excluded','six leaves change hinge orientation','three stems extend from 2.5 percent to full height'],
 visibleBrowserChecks:['model loads at 50219 triangles','growth starts and advances','pause freezes timeline','mature reset reaches 36 seconds','close detail visible'],
 verifiedLocalWelcomeVersion:'0.9435',headsetVerified:false};
fs.writeFileSync(path.join(root,'botanical-hinge-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({meshes:report.meshes,channels:report.channels,leafHinges:hinges.length,stems:stems.length,checks:'passed'}));
