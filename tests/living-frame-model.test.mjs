import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createLivingFrameModel,prepareLivingFrameModel} from '../app/services/livingFrameModel.js';
import {createLivingFrameXR} from '../app/services/livingFrameXR.js';
import {getSpatialVisualSettings,setSpatialVisualSettings} from '../app/services/spatialVisualSettings.js';
import {panelSettingsControls} from '../app/services/pimInfoPanel.js';

function scene(){const root=new THREE.Group(),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([1,0,0,1,1,0,2,0,0],3));g.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));g.setIndex([0,1,2]);g.morphTargetsRelative=true;g.morphAttributes.position=[new THREE.Float32BufferAttribute([0,0,0,0,0,.1,0,0,0],3),new THREE.Float32BufferAttribute([0,0,0,.1,0,0,0,0,0],3)];const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#657e46'}));mesh.name='leaves';mesh.morphTargetInfluences=[.3,.7];root.add(mesh);return root;}
const entry=()=>({asset:{scene:scene(),animations:[]},users:0});

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
 gl.getShaderParameter=gl.getProgramParameter=()=>true;gl.getAttribLocation=(_p,k)=>['position','normal','uv','morph0','morph1','growthIndex'].indexOf(k);gl.getUniformLocation=(_p,k)=>k;gl.getParameter=k=>state.get(k)??0;gl.isEnabled=k=>enabled.has(k);gl.getExtension=()=>null;
 gl.bindVertexArray=v=>state.set(gl.VERTEX_ARRAY_BINDING,v);gl.bindBuffer=(target,v)=>{if(target===gl.ARRAY_BUFFER)state.set(gl.ARRAY_BUFFER_BINDING,v);};gl.useProgram=v=>state.set(gl.CURRENT_PROGRAM,v);gl.activeTexture=v=>state.set(gl.ACTIVE_TEXTURE,v);gl.bindTexture=(_t,v)=>state.set(gl.TEXTURE_BINDING_2D,v);gl.pixelStorei=(k,v)=>state.set(k,v);gl.depthMask=v=>state.set(gl.DEPTH_WRITEMASK,v);gl.enable=k=>enabled.add(k);gl.disable=k=>enabled.delete(k);
 for(const method of ['shaderSource','compileShader','attachShader','linkProgram','bufferData','texImage2D','texParameteri','enableVertexAttribArray','disableVertexAttribArray','vertexAttribPointer','uniformMatrix4fv','uniform2fv','uniform3f','uniform1f','uniform1i','blendFunc','blendFuncSeparate','drawElements','drawArrays','deleteVertexArray','deleteBuffer','deleteShader','deleteProgram','deleteTexture'])gl[method]=(...args)=>calls.push([method,...args.map(a=>ArrayBuffer.isView(a)?Array.from(a):a)]);
 return {gl,calls,state,enabled};
}
test('native stereo batches shared materials, uploads once, uses independent eye matrices and restores GL state',()=>{
 const {gl,calls,state}=mockGL(),root=scene(),other=root.children[0].clone();other.position.x=1;root.add(other);const previous={id:'other renderer'};state.set(gl.CURRENT_PROGRAM,previous);state.set(gl.ACTIVE_TEXTURE,gl.TEXTURE0+3);state.set(gl.DEPTH_WRITEMASK,false);
 const renderer=createLivingFrameXR(gl,root);assert.equal(renderer.prepareNext(),true);assert.deepEqual(renderer.stats,{drawCalls:1,triangles:2});const uploads=calls.filter(c=>c[0]==='bufferData').length;
 const matrix=new THREE.Matrix4(),left=matrix.clone().makeTranslation(-.032,0,0),right=matrix.clone().makeTranslation(.032,0,0);
 for(const eye of [left,right])renderer.draw({projectionMatrix:matrix.elements,transform:{inverse:{matrix:eye.elements}}},matrix);
 assert.equal(calls.filter(c=>c[0]==='bufferData').length,uploads);assert.equal(calls.filter(c=>c[0]==='drawElements').length,2);const views=calls.filter(c=>c[0]==='uniformMatrix4fv'&&c[1]==='view');assert.notDeepEqual(views[0][3],views[1][3]);const weights=calls.find(c=>c[0]==='uniform2fv')[2];assert.ok(Math.abs(weights[0]-.3)<1e-6&&Math.abs(weights[2]-.3)<1e-6);assert.equal(state.get(gl.CURRENT_PROGRAM),previous);assert.equal(state.get(gl.ACTIVE_TEXTURE),gl.TEXTURE0+3);assert.equal(state.get(gl.DEPTH_WRITEMASK),false);renderer.destroy();assert.ok(calls.some(c=>c[0]==='deleteBuffer'));
});
test('packaged SD preserves the animation and all canopy groups while reducing runtime geometry',()=>{
 const read=name=>{const bytes=fs.readFileSync(new URL('../app/assets/living-frame/living-frame-'+name+'.glb',import.meta.url));assert.equal(bytes.readUInt32LE(8),bytes.length);return {bytes,json:JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)))};};const sd=read('sd'),hd=read('hd'),triangles=j=>j.meshes.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+j.accessors[p.indices??p.attributes.POSITION].count/3,0),0);
 assert.ok(triangles(sd.json)<triangles(hd.json)*.6);assert.ok(sd.bytes.length<hd.bytes.length*.75);assert.equal(sd.json.animations.length,1);assert.equal(sd.json.images.length,hd.json.images.length);for(const mesh of hd.json.meshes.filter(m=>/Groundcover growth|Outer side groundcover|flowers|moss|Central taproot/i.test(m.name)))assert.ok(sd.json.meshes.some(m=>m.name===mesh.name),mesh.name);
 for(const j of [sd.json,hd.json])for(const channel of j.animations[0].channels)if(channel.target.path==='weights')assert.ok(j.nodes[channel.target.node].mesh!==undefined);
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
