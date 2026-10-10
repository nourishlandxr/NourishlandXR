// GPU morph playback in the demo's shared XR context. Upload once; both eyes
// use their own view matrices without rebuilding animated vertices on the CPU.
import * as THREE from '../assets/fruit-window/vendor/three.module.js';
const vertex=`attribute vec3 position,normal,morph0,morph1;attribute vec2 uv;attribute float growthIndex;
uniform mat4 projection,view,model;uniform vec2 weights[64];varying vec2 v;varying vec3 n,p;
void main(){vec2 w=weights[int(growthIndex)];vec4 point=model*vec4(position+morph0*w.x+morph1*w.y,1.);p=(view*point).xyz;n=normalize(mat3(view*model)*normal);v=uv;gl_Position=projection*view*point;}`;
const fragment=`precision mediump float;uniform vec3 colour;uniform float opacity,textured,roughness;uniform sampler2D image;varying vec2 v;varying vec3 n,p;
void main(){vec4 texel=textured>.5?texture2D(image,v):vec4(1.);if(texel.a*opacity<.015)discard;vec3 N=normalize(n)*(gl_FrontFacing?1.:-1.);vec3 L=normalize(vec3(-.45,.72,.65));float light=.65+.5*max(0.,dot(N,L));vec3 albedo=colour*pow(max(texel.rgb,vec3(0.)),vec3(2.2));float spec=pow(max(0.,dot(N,normalize(L+normalize(-p)))),mix(120.,8.,roughness))*.12*(1.-roughness);gl_FragColor=vec4(pow(max(albedo*light+vec3(spec),vec3(0.)),vec3(.4545)),texel.a*opacity);}`;

export function createLivingFrameXR(gl,source){
 const resources=[],entries=[],textures=new Map(),groups=new Map(),nodes=[];source.updateMatrixWorld(true);source.traverse(node=>{if(node.isMesh){const key=node.material.uuid+(/Slow earthworm/.test(node.name)?'|'+node.uuid:'');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(node);}});
 for(const group of groups.values())for(let i=0;i<group.length;i+=64)nodes.push(group.slice(i,i+64));nodes.sort((a,b)=>Number(a[0].material.transparent)-Number(b[0].material.transparent));
 const vaoExt=gl.createVertexArray?null:gl.getExtension('OES_vertex_array_object');
 const vaoApi=gl.createVertexArray?{create:()=>gl.createVertexArray(),bind:v=>gl.bindVertexArray(v),remove:v=>gl.deleteVertexArray(v),binding:gl.VERTEX_ARRAY_BINDING}:vaoExt?{create:()=>vaoExt.createVertexArrayOES(),bind:v=>vaoExt.bindVertexArrayOES(v),remove:v=>vaoExt.deleteVertexArrayOES(v),binding:vaoExt.VERTEX_ARRAY_BINDING_OES}:null;
 if(!vaoApi)throw Error('Living Frame requires vertex array support.');
 const vao=vaoApi.create();
 const shader=(type,text)=>{const s=gl.createShader(type);resources.push(['Shader',s]);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const program=gl.createProgram();resources.push(['Program',program]);gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 const attributes=Object.fromEntries(['position','normal','uv','morph0','morph1','growthIndex'].map(k=>[k,gl.getAttribLocation(program,k)])),uniforms=Object.fromEntries(['projection','view','model','weights','colour','opacity','textured','roughness','image'].map(k=>[k,gl.getUniformLocation(program,k==='weights'?'weights[0]':k)]));
 let prepared=0;
 function upload(array,target){const b=gl.createBuffer();resources.push(['Buffer',b]);gl.bindBuffer(target,b);gl.bufferData(target,array,gl.STATIC_DRAW);return b;}
 function prepareNode(parts){
  const node=parts[0],moving=parts.length===1&&/Slow earthworm/.test(node.name),count=parts.reduce((n,p)=>n+p.geometry.attributes.position.count,0),indexCount=parts.reduce((n,p)=>n+(p.geometry.index?.count||p.geometry.attributes.position.count),0),arrays=Object.fromEntries(['position','normal','uv','morph0','morph1','growthIndex'].map(k=>[k,new Float32Array(count*(k==='growthIndex'?1:k==='uv'?2:3))])),indices=new (count>65535?Uint32Array:Uint16Array)(indexCount),point=new THREE.Vector3(),normalMatrix=new THREE.Matrix3(),buffers={};let offset=0,indexOffset=0;
  for(const [partIndex,part] of parts.entries()){
   const g=part.geometry,matrix=moving?new THREE.Matrix4():part.matrixWorld;normalMatrix.getNormalMatrix(matrix);
   if(g.morphAttributes.position?.length&&!g.morphTargetsRelative)throw Error('Living Frame morphs must be relative.');
   for(let i=0;i<g.attributes.position.count;i++){
    point.fromBufferAttribute(g.attributes.position,i).applyMatrix4(matrix).toArray(arrays.position,(offset+i)*3);
    if(g.attributes.normal)point.fromBufferAttribute(g.attributes.normal,i).applyMatrix3(normalMatrix).normalize().toArray(arrays.normal,(offset+i)*3);
    for(let j=0;j<2;j++)if(g.morphAttributes.position?.[j]){point.fromBufferAttribute(g.morphAttributes.position[j],i);const e=matrix.elements,x=point.x,y=point.y,z=point.z;point.set(e[0]*x+e[4]*y+e[8]*z,e[1]*x+e[5]*y+e[9]*z,e[2]*x+e[6]*y+e[10]*z).toArray(arrays['morph'+j],(offset+i)*3);}
    if(g.attributes.uv){arrays.uv[(offset+i)*2]=g.attributes.uv.getX(i);arrays.uv[(offset+i)*2+1]=g.attributes.uv.getY(i);}arrays.growthIndex[offset+i]=partIndex;
   }
   for(let i=0;i<(g.index?.count||g.attributes.position.count);i++)indices[indexOffset++]=offset+(g.index?g.index.getX(i):i);offset+=g.attributes.position.count;
  }
  for(const [key,array] of Object.entries(arrays))buffers[key]=upload(array,gl.ARRAY_BUFFER);
  const index=upload(indices,gl.ELEMENT_ARRAY_BUFFER),indexType=indices instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT;
  if(indexType===gl.UNSIGNED_INT&&!gl.createVertexArray&&!gl.getExtension('OES_element_index_uint'))throw Error('32-bit Living Frame indices unavailable.');
  let texture=null;const map=node.material.map;
  if(map){texture=textures.get(map);if(!texture){texture=gl.createTexture();resources.push(['Texture',texture]);textures.set(map,texture);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,map.flipY);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,map.image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}}
  entries.push({node,parts,moving,buffers,index,indexType,count:indexCount,texture,palette:new Float32Array(128)});
 }
 function preservingState(run){
  const saved={vao:gl.getParameter(vaoApi.binding),program:gl.getParameter(gl.CURRENT_PROGRAM),array:gl.getParameter(gl.ARRAY_BUFFER_BINDING),active:gl.getParameter(gl.ACTIVE_TEXTURE),flip:gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),premultiply:gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL),mask:gl.getParameter(gl.DEPTH_WRITEMASK),blend:gl.isEnabled(gl.BLEND),depth:gl.isEnabled(gl.DEPTH_TEST),cull:gl.isEnabled(gl.CULL_FACE),srcRGB:gl.getParameter(gl.BLEND_SRC_RGB),dstRGB:gl.getParameter(gl.BLEND_DST_RGB),srcA:gl.getParameter(gl.BLEND_SRC_ALPHA),dstA:gl.getParameter(gl.BLEND_DST_ALPHA)};
  gl.activeTexture(gl.TEXTURE0);saved.texture=gl.getParameter(gl.TEXTURE_BINDING_2D);vaoApi.bind(vao);
  try{return run();}finally{vaoApi.bind(saved.vao);gl.bindBuffer(gl.ARRAY_BUFFER,saved.array);gl.useProgram(saved.program);gl.bindTexture(gl.TEXTURE_2D,saved.texture);gl.activeTexture(saved.active);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,saved.flip);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,saved.premultiply);gl.depthMask(saved.mask);gl.blendFuncSeparate(saved.srcRGB,saved.dstRGB,saved.srcA,saved.dstA);for(const [cap,enabled] of [[gl.BLEND,saved.blend],[gl.DEPTH_TEST,saved.depth],[gl.CULL_FACE,saved.cull]])enabled?gl.enable(cap):gl.disable(cap);}
 }
 return {
  get ready(){return prepared===nodes.length;},
  get stats(){return {drawCalls:entries.length,triangles:entries.reduce((n,e)=>n+e.count/3,0)};},
  prepareNext(){return preservingState(()=>{if(prepared<nodes.length)prepareNode(nodes[prepared++]);return prepared===nodes.length;});},
  draw(view,worldMatrix){if(prepared!==nodes.length)return;preservingState(()=>{
   gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.uniformMatrix4fv(uniforms.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(uniforms.view,false,view.transform.inverse.matrix);gl.uniform1i(uniforms.image,0);source.updateMatrixWorld(true);
   for(const entry of entries){const {node,buffers,index,indexType,count,texture}=entry;if(!node.visible&&entry.parts.length===1)continue;
    for(const [name,location] of Object.entries(attributes)){if(location<0)continue;gl.bindBuffer(gl.ARRAY_BUFFER,buffers[name]);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,name==='growthIndex'?1:name==='uv'?2:3,gl.FLOAT,false,0,0);}
    const m=node.material;entry.parts.forEach((part,i)=>{entry.palette[i*2]=part.morphTargetInfluences?.[0]||0;entry.palette[i*2+1]=part.morphTargetInfluences?.[1]||0;});gl.uniform2fv(uniforms.weights,entry.palette);gl.uniform3f(uniforms.colour,m.color.r,m.color.g,m.color.b);gl.uniform1f(uniforms.opacity,m.opacity);gl.uniform1f(uniforms.roughness,m.roughness??.8);gl.uniform1f(uniforms.textured,texture?1:0);gl.bindTexture(gl.TEXTURE_2D,texture);
    const matrix=entry.moving?worldMatrix.clone().multiply(node.matrixWorld):worldMatrix;gl.uniformMatrix4fv(uniforms.model,false,matrix.elements);
    if(m.transparent){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);}else gl.disable(gl.BLEND);gl.depthMask(!m.transparent&&m.depthWrite!==false);
    if(index){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.drawElements(gl.TRIANGLES,count,indexType,0);}else gl.drawArrays(gl.TRIANGLES,0,count);
   }
  });},
  destroy(){vaoApi.remove(vao);for(const [type,value] of resources)gl['delete'+type](value);textures.clear();entries.length=0;}
 };
}
