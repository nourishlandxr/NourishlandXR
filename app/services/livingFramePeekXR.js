import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {propertyDepth} from './propertyPainting.js';

// Project the existing painting onto its authored depth relief. Clip each eye's
// ray at the opening, so leaning reveals depth without leaking past the rim.
export function peekAperturePoint(point,eye){
 const t=eye.z/(eye.z-point.z);
 return {x:eye.x+(point.x-eye.x)*t,y:eye.y+(point.y-eye.y)*t};
}
export async function createLivingFramePeekXR(gl){
 const response=await fetch(new URL('../assets/peek-world/property-painting-v2.png',import.meta.url));
 if(!response.ok)throw Error('Painting could not load.');
 const image=await createImageBitmap(await response.blob(),{imageOrientation:'flipY'});
 let program,buffer,texture;const shaders=[];
 try{
  const shader=(type,source)=>{const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 p;attribute vec2 uv;uniform mat4 projection,view,anchor;varying vec3 local;varying vec2 v;void main(){local=p;v=uv;gl_Position=projection*view*anchor*vec4(p,1.);}'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision highp float;uniform sampler2D painting;uniform vec3 eye;uniform float radius;varying vec3 local;varying vec2 v;void main(){if(eye.z<=.04)discard;float t=eye.z/(eye.z-local.z);vec2 opening=mix(eye.xy,local.xy,t);if(length(opening)>radius)discard;gl_FragColor=vec4(texture2D(painting,v).rgb,1.);}'));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  const data=[],width=96,height=54,aspect=image.width/image.height;
  const vertex=(column,row)=>{const u=column/width,v=row/height,d=propertyDepth(u,v),perspective=(1.8+d)/1.8;data.push((u-.46)*1.88*aspect*perspective,(v-.5)*1.88*perspective,-d,u,v);};
  for(let row=0;row<height;row++)for(let column=0;column<width;column++){vertex(column,row);vertex(column+1,row);vertex(column+1,row+1);vertex(column,row);vertex(column+1,row+1);vertex(column,row+1);}
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const locations=Object.fromEntries(['projection','view','anchor','painting','eye','radius'].map(name=>[name,gl.getUniformLocation(program,name)])),p=gl.getAttribLocation(program,'p'),uv=gl.getAttribLocation(program,'uv');
  const matrix=new THREE.Matrix4(),inverse=new THREE.Matrix4(),eye=new THREE.Vector3();
  return {draw(view,pose){matrix.fromArray(pose.matrix);const scale=pose.radius/.832;matrix.scale(new THREE.Vector3(scale,scale,scale));inverse.copy(matrix).invert();eye.setFromMatrixPosition(new THREE.Matrix4().fromArray(view.transform.matrix)).applyMatrix4(inverse);
   gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
   gl.uniformMatrix4fv(locations.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(locations.view,false,view.transform.inverse.matrix);gl.uniformMatrix4fv(locations.anchor,false,matrix.elements);gl.uniform3f(locations.eye,eye.x,eye.y,eye.z);gl.uniform1f(locations.radius,.832);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(locations.painting,0);
   gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.drawArrays(gl.TRIANGLES,0,data.length/5);
  },destroy(){gl.deleteBuffer(buffer);gl.deleteTexture(texture);gl.deleteProgram(program);}};
 }catch(error){if(buffer)gl.deleteBuffer(buffer);if(texture)gl.deleteTexture(texture);if(program)gl.deleteProgram(program);throw error;}
 finally{image.close();for(const shader of shaders)gl.deleteShader(shader);}
}
