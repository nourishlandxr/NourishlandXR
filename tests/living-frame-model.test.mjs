import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createLivingFrameModel,prepareLivingFrameModel,LIVING_FRAME_GROWTH_DURATION_MS} from '../app/services/livingFrameModel.js';
import {createLivingFrameXR} from '../app/services/livingFrameXR.js';
import {getSpatialVisualSettings,setSpatialVisualSettings} from '../app/services/spatialVisualSettings.js';
import {panelSettingsControls} from '../app/services/pimInfoPanel.js';
import {livingFrameSurfaceKind,refineLivingFrameMaterials} from '../app/services/livingFrameSurface.js';
import {taprootGeometry} from '../tools/living-frame-botany.mjs';

function scene(){const root=new THREE.Group(),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([1,0,0,1,1,0,2,0,0],3));g.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));g.setIndex([0,1,2]);g.morphTargetsRelative=true;g.morphAttributes.position=[new THREE.Float32BufferAttribute([0,0,0,0,0,.1,0,0,0],3),new THREE.Float32BufferAttribute([0,0,0,.1,0,0,0,0,0],3)];const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#657e46'}));mesh.name='leaves';mesh.morphTargetInfluences=[.3,.7];root.add(mesh);return root;}
const entry=()=>({asset:{scene:scene(),animations:[]},users:0});

test('close detail adds leaf veins and physical bump without mutating the cached materials',()=>{
 const root=scene(),original=root.children[0].material;original.name='Dark small oval leaves';const dispose=refineLivingFrameMaterials(root);const material=root.children[0].material;assert.notEqual(material,original);assert.equal(livingFrameSurfaceKind(material.name),1);assert.equal(livingFrameSurfaceKind('Ivory daisy petals'),2);assert.equal(livingFrameSurfaceKind('Quiet moss cushion tone 0'),5);
 const shader={uniforms:{},vertexShader:'#include <uv_vertex>\n#include <project_vertex>',fragmentShader:'#include <color_fragment>\n#include <normal_fragment_maps>'};material.onBeforeCompile(shader);assert.equal(shader.uniforms.lfSurface.value,1);assert.match(shader.vertexShader,/lfUv=uv/);assert.match(shader.fragmentShader,/diffuseColor.rgb\*=lfDetailColour/);assert.match(shader.fragmentShader,/normal=lfBump/);dispose();
});

test('SD and HD stretch the growth sequence to three minutes and hold the finished frame',async()=>{
 const previous=getSpatialVisualSettings();
 try{assert.equal(LIVING_FRAME_GROWTH_DURATION_MS,180000);for(const tier of ['sd','hd']){
  setSpatialVisualSettings({livingFrameQuality:tier});const asset=entry();asset.asset.animations=[new THREE.AnimationClip('growth',60,[new THREE.NumberKeyframeTrack('leaves.morphTargetInfluences[0]',[0,60],[0,1])])];
  const model=createLivingFrameModel({load:async()=>asset});await model.select(tier);
  for(const [elapsed,weight] of [[0,0],[60000,1/3],[90000,.5],[180000,1],[300000,1]]){model.update(elapsed);assert.ok(Math.abs(model.scene.children[0].morphTargetInfluences[0]-weight)<1e-6);assert.equal(model.growthTime,Math.min(elapsed/1000,180));}
  model.update(0,{reduced:true});assert.equal(model.growthTime,180);assert.equal(model.scene.children[0].morphTargetInfluences[0],1);model.destroy();
 }}finally{setSpatialVisualSettings(previous);}
});

test('startup preparation is shared and reused when the demo is reopened',async()=>{
 const previous=getSpatialVisualSettings(),originalFetch=globalThis.fetch;let requests=0,resolve;
 globalThis.fetch=()=>{requests++;return new Promise(done=>resolve=done);};setSpatialVisualSettings({livingFrameQuality:'sd'});
 try{const first=prepareLivingFrameModel('sd'),second=prepareLivingFrameModel('sd');assert.equal(first,second);resolve({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify({asset:{version:'2.0'},scenes:[{nodes:[]}],scene:0})).buffer});await first;const model=createLivingFrameModel();await model.select('sd');model.destroy();const reopened=createLivingFrameModel();await reopened.select('sd');assert.equal(requests,1);await reopened.select('off');reopened.destroy();}
 finally{globalThis.fetch=originalFetch;setSpatialVisualSettings(previous);}
});

test('LF tiers are independent from Graphics quality, retain legacy Off and fit both settings surfaces',()=>{
 const previous=getSpatialVisualSettings();try{
  setSpatialVisualSettings({livingFrameQuality:'hd',graphicsQuality:'low'});assert.equal(getSpatialVisualSettings().livingFrameQuality,'hd');setSpatialVisualSettings({livingFrame:false});assert.equal(getSpatialVisualSettings().livingFrameQuality,'off');setSpatialVisualSettings({livingFrameQuality:'sd'});assert.equal(getSpatialVisualSettings().livingFrame,true);
  for(const context of [{simpleDesktop:true},{graphicsOpen:true,headset:true}]){const controls=panelSettingsControls(context).filter(c=>c.action.startsWith('LivingFrame:'));assert.deepEqual(controls.map(c=>c.label),['No Living Frame','LF SD','LF HD']);assert.deepEqual(controls.map(c=>c.selected),[false,true,false]);for(const [i,a] of controls.entries())for(const b of controls.slice(i+1))assert.ok(a.x+a.width<=b.x);}
 }finally{setSpatialVisualSettings(previous);}
});
test('No Living Frame skips preparation and a delayed load cannot resurrect an Off or destroyed model',async()=>{
 assert.equal(await prepareLivingFrameModel('off'),null);let resolve,count=0;const asset=entry(),model=createLivingFrameModel({load:()=>{count++;return new Promise(done=>resolve=done);}});
 const loading=model.select('sd');assert.equal(model.ready,false);await model.select('off');resolve(asset);await loading;assert.equal(model.ready,false);assert.equal(asset.users,0);assert.equal(count,1);
 const loadingAgain=model.select('hd');model.destroy();resolve(asset);await loadingAgain;assert.equal(model.ready,false);assert.equal(asset.users,0);
});
test('newer quality wins load races; failed upgrades retain the drawable model and can retry',async()=>{
 const waiting=new Map(),model=createLivingFrameModel({load:quality=>new Promise((resolve,reject)=>waiting.set(quality,{resolve,reject}))}),sd=entry(),hd=entry();
 const first=model.select('sd'),second=model.select('hd');waiting.get('hd').resolve(hd);await second;waiting.get('sd').resolve(sd);await first;assert.equal(model.quality,'hd');assert.equal(model.ready,true);assert.equal(hd.users,1);assert.equal(sd.users,0);
 const failed=model.select('sd');waiting.get('sd').reject(Error('offline'));await failed;assert.equal(model.ready,true);assert.equal(model.error.message,'offline');const retry=model.retry();waiting.get('sd').resolve(sd);await retry;assert.equal(sd.users,1);assert.equal(hd.users,0);model.destroy();assert.equal(sd.users,0);
});
function mockGL(){
 const calls=[],state=new Map(),enabled=new Set();let id=0;const gl={};for(const key of ['ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','ARRAY_BUFFER_BINDING','CURRENT_PROGRAM','ACTIVE_TEXTURE','TEXTURE0','TEXTURE_2D','TEXTURE_BINDING_2D','UNPACK_FLIP_Y_WEBGL','UNPACK_PREMULTIPLY_ALPHA_WEBGL','DEPTH_WRITEMASK','BLEND','DEPTH_TEST','CULL_FACE','BLEND_SRC_RGB','BLEND_DST_RGB','BLEND_SRC_ALPHA','BLEND_DST_ALPHA','VERTEX_ARRAY_BINDING','VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','STATIC_DRAW','FLOAT','UNSIGNED_INT','UNSIGNED_SHORT','RGBA','UNSIGNED_BYTE','TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER','LINEAR','TEXTURE_WRAP_S','TEXTURE_WRAP_T','CLAMP_TO_EDGE','SRC_ALPHA','ONE_MINUS_SRC_ALPHA','TRIANGLES'])gl[key]=++id;
 for(const method of ['createProgram','createShader','createBuffer','createTexture','createVertexArray'])gl[method]=()=>({id:++id});
 const boundTextures=new Map();state.set(gl.ACTIVE_TEXTURE,gl.TEXTURE0);
 gl.getShaderParameter=gl.getProgramParameter=()=>true;gl.getAttribLocation=(_p,k)=>['position','normal','uv','morph0','morph1','normalMorph0','normalMorph1','growthIndex'].indexOf(k);gl.getUniformLocation=(_p,k)=>k;gl.getParameter=k=>k===gl.TEXTURE_BINDING_2D?boundTextures.get(state.get(gl.ACTIVE_TEXTURE))??null:state.get(k)??0;gl.isEnabled=k=>enabled.has(k);gl.getExtension=()=>null;
 gl.bindVertexArray=v=>state.set(gl.VERTEX_ARRAY_BINDING,v);gl.bindBuffer=(target,v)=>{if(target===gl.ARRAY_BUFFER)state.set(gl.ARRAY_BUFFER_BINDING,v);};gl.useProgram=v=>state.set(gl.CURRENT_PROGRAM,v);gl.activeTexture=v=>state.set(gl.ACTIVE_TEXTURE,v);gl.bindTexture=(_t,v)=>boundTextures.set(state.get(gl.ACTIVE_TEXTURE),v);gl.pixelStorei=(k,v)=>state.set(k,v);gl.depthMask=v=>state.set(gl.DEPTH_WRITEMASK,v);gl.enable=k=>enabled.add(k);gl.disable=k=>enabled.delete(k);
 for(const method of ['shaderSource','compileShader','attachShader','linkProgram','bufferData','texImage2D','texParameteri','generateMipmap','enableVertexAttribArray','disableVertexAttribArray','vertexAttribPointer','uniformMatrix4fv','uniform2fv','uniform3f','uniform1f','uniform1i','blendFunc','blendFuncSeparate','drawElements','drawArrays','deleteVertexArray','deleteBuffer','deleteShader','deleteProgram','deleteTexture'])gl[method]=(...args)=>calls.push([method,...args.map(a=>ArrayBuffer.isView(a)?Array.from(a):a)]);
 return {gl,calls,state,enabled,boundTextures};
}
test('native surface detail uploads normal maps with mipmaps and restores both texture units',()=>{
 const saved=getSpatialVisualSettings();setSpatialVisualSettings({graphicsQuality:'high'});try{
 const {gl,calls,state,boundTextures}=mockGL(),root=scene(),m=root.children[0].material;m.name='Brown lower soil';m.map=new THREE.Texture({width:2,height:2});m.normalMap=new THREE.Texture({width:2,height:2});m.normalScale.set(.36,.36);const originalColour={id:'colour'},originalNormal={id:'normal'};boundTextures.set(gl.TEXTURE0,originalColour);boundTextures.set(gl.TEXTURE0+1,originalNormal);state.set(gl.ACTIVE_TEXTURE,gl.TEXTURE0+3);
 const renderer=createLivingFrameXR(gl,root);renderer.prepareNext();const matrix=new THREE.Matrix4();renderer.draw({projectionMatrix:matrix.elements,transform:{inverse:{matrix:matrix.elements}}},matrix);assert.equal(calls.filter(c=>c[0]==='texImage2D').length,2);assert.equal(calls.filter(c=>c[0]==='generateMipmap').length,2);assert.ok(calls.some(c=>c[0]==='uniform1f'&&c[1]==='normalMapped'&&c[2]===1));assert.ok(calls.some(c=>c[0]==='uniform1f'&&c[1]==='surfaceKind'&&c[2]===4));assert.equal(boundTextures.get(gl.TEXTURE0),originalColour);assert.equal(boundTextures.get(gl.TEXTURE0+1),originalNormal);assert.equal(state.get(gl.ACTIVE_TEXTURE),gl.TEXTURE0+3);renderer.destroy();
 }finally{setSpatialVisualSettings(saved);}
});
test('native stereo batches shared materials, uploads once, uses independent eye matrices and restores GL state',()=>{
 const {gl,calls,state}=mockGL(),root=scene(),other=root.children[0].clone();other.position.x=1;root.add(other);const previous={id:'other renderer'};state.set(gl.CURRENT_PROGRAM,previous);state.set(gl.ACTIVE_TEXTURE,gl.TEXTURE0+3);state.set(gl.DEPTH_WRITEMASK,false);
 const renderer=createLivingFrameXR(gl,root);assert.equal(renderer.prepareNext(),true);assert.deepEqual(renderer.stats,{drawCalls:1,triangles:2});const uploads=calls.filter(c=>c[0]==='bufferData').length;
 const matrix=new THREE.Matrix4(),left=matrix.clone().makeTranslation(-.032,0,0),right=matrix.clone().makeTranslation(.032,0,0);
 for(const eye of [left,right])renderer.draw({projectionMatrix:matrix.elements,transform:{inverse:{matrix:eye.elements}}},matrix);
 assert.equal(calls.filter(c=>c[0]==='bufferData').length,uploads);assert.equal(calls.filter(c=>c[0]==='drawElements').length,2);const views=calls.filter(c=>c[0]==='uniformMatrix4fv'&&c[1]==='view');assert.notDeepEqual(views[0][3],views[1][3]);const weights=calls.find(c=>c[0]==='uniform2fv')[2];assert.ok(Math.abs(weights[0]-.3)<1e-6&&Math.abs(weights[2]-.3)<1e-6);assert.equal(state.get(gl.CURRENT_PROGRAM),previous);assert.equal(state.get(gl.ACTIVE_TEXTURE),gl.TEXTURE0+3);assert.equal(state.get(gl.DEPTH_WRITEMASK),false);renderer.destroy();assert.ok(calls.some(c=>c[0]==='deleteBuffer'));
});
test('packaged tiers diversify rainforest foliage and reduce the previous detail-pass budgets',()=>{
 const read=name=>{const bytes=fs.readFileSync(new URL('../app/assets/living-frame/living-frame-'+name+'.glb',import.meta.url));assert.equal(bytes.readUInt32LE(8),bytes.length);return {bytes,json:JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)))};};const sd=read('sd'),hd=read('hd'),triangles=j=>j.meshes.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+j.accessors[p.indices??p.attributes.POSITION].count/3,0),0);
 assert.ok(triangles(sd.json)<triangles(hd.json)*.7);assert.ok(sd.bytes.length<hd.bytes.length*.75);assert.equal(sd.json.animations.length,1);assert.equal(sd.json.images.length,hd.json.images.length);for(const mesh of hd.json.meshes.filter(m=>/Groundcover growth|Outer side groundcover|flowers|moss|Central taproot/i.test(m.name)))assert.ok(sd.json.meshes.some(m=>m.name===mesh.name),mesh.name);
 const tiers=JSON.parse(fs.readFileSync(new URL('../app/assets/living-frame/tiers.json',import.meta.url),'utf8'));assert.ok(tiers.hd.refinedLeaves>4000);assert.equal(tiers.hd.refinedLeafMeshes,42);assert.equal(tiers.hd.triangles,triangles(hd.json));assert.equal(tiers.hd.bytes,hd.bytes.length);assert.ok(tiers.sd.triangles<140552);assert.ok(tiers.sd.bytes<13876024);assert.ok(tiers.hd.triangles<440420*.6);assert.ok(tiers.hd.bytes<33870000*.6);
 for(const tier of ['sd','hd']){assert.equal(tiers[tier].leafVarieties.length,8);assert.ok(tiers[tier].leafVarieties.every(v=>v.count>0));assert.ok(tiers[tier].refinedLeaves<tiers[tier].sourceLeaves);assert.equal(tiers[tier].taproot.primaryAxes,1);assert.equal(tiers[tier].taproot.thickSplits,0);}
 for(const j of [sd.json,hd.json]){assert.ok(!j.meshes.some(m=>/Taproot splitting lateral/.test(m.name)));for(const m of j.materials.filter(m=>/leaves|foliage|herbs|leaf mats/.test(m.name)))assert.ok(m.pbrMetallicRoughness.baseColorFactor[1]<=.11);}
 for(const j of [sd.json,hd.json])for(const channel of j.animations[0].channels)if(channel.target.path==='weights')assert.ok(j.nodes[channel.target.node].mesh!==undefined);
});

test('the taproot has one tapered primary axis and fine feeders attached directly to it',()=>{
 const main=taprootGeometry(),feeders=taprootGeometry(true);assert.equal(main.primaryAxes,1);assert.equal(feeders.feederRoots,16);assert.ok(feeders.maxFeederDiameter<.0022);const final=data=>data.positions.map((p,i)=>p+data.morphs[0].position[i]+data.morphs[1].position[i]);const primary=final(main),fine=final(feeders);
 assert.equal(primary.length/3,25*8);assert.ok(Math.max(...primary.filter((v,i)=>i%3===1))<-.92);assert.ok(Math.min(...primary.filter((v,i)=>i%3===1))<=-1.599);const tipRadius=Math.hypot(primary.at(-3),primary.at(-1)-.01);assert.ok(tipRadius<.008);
 for(let root=0;root<16;root++){const offset=root*9*4*3,t=.15+root*.046,centre=[0,0,0];for(let side=0;side<4;side++)for(let c=0;c<3;c++)centre[c]+=fine[offset+side*3+c]/4;assert.ok(Math.abs(centre[0]-.008*Math.sin(t*4)*t)<1e-6);assert.ok(Math.abs(centre[1]-(-.946-.654*t))<1e-6);assert.ok(Math.abs(centre[2]-(.055-.045*t))<1e-6);}
});

test('both exported runtime tiers protect the reading opening throughout growth',()=>{
 for(const tier of ['sd','hd']){
  const bytes=fs.readFileSync(new URL('../app/assets/living-frame/living-frame-'+tier+'.glb',import.meta.url)),jsonLength=bytes.readUInt32LE(12),j=JSON.parse(bytes.toString('utf8',20,20+jsonLength)),offset=28+jsonLength,cache=new Map(),widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},sizes={5126:4,5125:4,5123:2,5121:1},read={5126:'readFloatLE',5125:'readUInt32LE',5123:'readUInt16LE',5121:'readUInt8'};
  function values(index){if(cache.has(index))return cache.get(index);const a=j.accessors[index],v=j.bufferViews[a.bufferView],w=widths[a.type],s=sizes[a.componentType],out=new Float32Array(a.count*w);if(v)for(let i=0;i<a.count;i++)for(let c=0;c<w;c++)out[i*w+c]=bytes[read[a.componentType]](offset+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||w*s)+c*s);if(a.sparse){const sparse=a.sparse,iv=j.bufferViews[sparse.indices.bufferView],vv=j.bufferViews[sparse.values.bufferView];for(let i=0;i<sparse.count;i++){const k=bytes[read[sparse.indices.componentType]](offset+(iv.byteOffset||0)+(sparse.indices.byteOffset||0)+i*sizes[sparse.indices.componentType]);for(let c=0;c<w;c++)out[k*w+c]=bytes[read[a.componentType]](offset+(vv.byteOffset||0)+(sparse.values.byteOffset||0)+(i*w+c)*s);}}cache.set(index,out);return out;}
  const parents=new Map();j.nodes.forEach((node,i)=>(node.children||[]).forEach(child=>parents.set(child,i)));
  for(const time of [0,15,30,42,60]){
   const poses=j.nodes.map(node=>({translation:node.translation||[0,0,0],rotation:node.rotation||[0,0,0,1],scale:node.scale||[1,1,1],weights:node.weights||j.meshes[node.mesh]?.weights||[]}));
   for(const channel of j.animations[0].channels){const s=j.animations[0].samplers[channel.sampler],times=values(s.input),data=values(s.output),width=data.length/times.length;let left=0;while(left<times.length-1&&times[left+1]<=time)left++;const right=Math.min(left+1,times.length-1),f=right===left||s.interpolation==='STEP'?0:Math.max(0,Math.min(1,(time-times[left])/(times[right]-times[left])));poses[channel.target.node][channel.target.path]=Array.from({length:width},(_,i)=>data[left*width+i]*(1-f)+data[right*width+i]*f);}
   const matrices=new Map();function world(i){if(matrices.has(i))return matrices.get(i);const p=poses[i],m=j.nodes[i].matrix?new THREE.Matrix4().fromArray(j.nodes[i].matrix):new THREE.Matrix4().compose(new THREE.Vector3(...p.translation),new THREE.Quaternion(...p.rotation),new THREE.Vector3(...p.scale));if(parents.has(i))m.premultiply(world(parents.get(i)));matrices.set(i,m);return m;}
   let minimum=Infinity;const point=new THREE.Vector3();for(const [i,node] of j.nodes.entries()){if(node.mesh===undefined)continue;for(const primitive of j.meshes[node.mesh].primitives){const positions=values(primitive.attributes.POSITION),targets=(primitive.targets||[]).map(t=>values(t.POSITION));for(let v=0;v<positions.length;v+=3){const coords=[0,1,2].map(c=>positions[v+c]+targets.reduce((n,t,k)=>n+t[v+c]*(poses[i].weights[k]||0),0));point.set(...coords).applyMatrix4(world(i));minimum=Math.min(minimum,Math.hypot(point.x,point.y));}}}assert.ok(minimum>=.8-1e-5,`${tier} reading clearance at ${time}s: ${minimum}`);
  }
 }
});
