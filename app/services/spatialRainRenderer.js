import {RAIN_QUALITIES,currentRainQuality} from './spatialVisualSettings.js';

// Local, depth-tested ribbons; no fullscreen filter or bloom. All working
// storage belongs to the GL context and is reused across frames and eyes.
export const RAIN_RENDER_BUDGETS=Object.freeze({off:0,low:60,high:220,hq:480});
const random=(i,s)=>{const n=Math.sin(i*12.9898+s*78.233)*43758.5453;return n-Math.floor(n);};
export function rainDropSample(i,time,quality='hq'){
 const near=i%5===0,radius=(near?.85:2)+random(i,1)*(near?1.5:6),angle=random(i,2)*Math.PI*2;
 return {x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,y:2.4-((time*(near?.00048:.00036)+random(i,3))%1)*4,
 length:(near?.22:.12)*(quality==='hq'?1.25:1),width:quality==='hq'?(near?.007:.004):.0025,alpha:near?.38:.24};
}
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(error);}return s;}
export function createSpatialRainRenderer(gl){
 const vertex=shader(gl,gl.VERTEX_SHADER,`attribute vec3 position;attribute vec2 uv;attribute float opacity;
 uniform mat4 projection;uniform mat4 viewMatrix;varying vec2 tex;varying float alpha;
 void main(){tex=uv;alpha=opacity;gl_Position=projection*viewMatrix*vec4(position,1.);}`);
 const fragment=shader(gl,gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 tex;varying float alpha;
 void main(){float edge=1.-smoothstep(.18,1.,abs(tex.x));float end=smoothstep(0.,.14,tex.y)*(1.-smoothstep(.65,1.,tex.y));
 gl_FragColor=vec4(mix(vec3(.61,.74,.73),vec3(.9,.97,.96),edge*.65),alpha*edge*end);}`);
 const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const error=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw new Error(error);}
 const buffer=gl.createBuffer(),data=new Float32Array((480+24*16)*36);
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);
 // Seed the permanent samples once; update only positions and alpha per frame.
 const seeds=Array.from({length:480},(_,i)=>({angle:random(i,2)*Math.PI*2,radius:(i%5===0?.85:2)+random(i,1)*(i%5===0?1.5:6),phase:random(i,3),near:i%5===0}));
 return {program,buffer,data,seeds,count:0,time:NaN,key:'',attributes:['position','uv','opacity'].map(n=>gl.getAttribLocation(program,n)),projection:gl.getUniformLocation(program,'projection'),view:gl.getUniformLocation(program,'viewMatrix')};
}
const QUAD_ENDS=[0,1,0,0,1,1],QUAD_SIDES=[-1,-1,1,1,-1,1];
function ribbon(renderer,ax,ay,az,bx,by,bz,rx,ry,rz,width,alpha){
 const values=renderer.data;let index=renderer.count*6;
 // Two triangles share a soft transverse profile and tapered ends.
 for(let corner=0;corner<6;corner++){const end=QUAD_ENDS[corner],side=QUAD_SIDES[corner];
  values[index++]=(end?bx:ax)+rx*width*side;values[index++]=(end?by:ay)+ry*width*side;values[index++]=(end?bz:az)+rz*width*side;
  values[index++]=side;values[index++]=end;values[index++]=alpha;
 }
 renderer.count+=6;
}
export function drawSpatialRainField(gl,renderer,view,time,{quality=currentRainQuality(),progress=1,origin=view?.transform?.matrix,groundY=origin?.[13]-1.6}={}){
 if(!renderer || !view?.projectionMatrix || !origin || !RAIN_QUALITIES[quality] || quality==='off' || progress<=0)return;
 const camera=view.transform.matrix, data=renderer.data, count=Math.round(RAIN_RENDER_BUDGETS[quality]*Math.min(1,progress));
 // Both eyes share the same world field; viewer orientation is effectively
 // equal between eyes. Keep the first eye's ribbon orientation for this frame.
 const key=quality+':'+progress;
 if(renderer.time!==time || renderer.key!==key){
  renderer.time=time;renderer.key=key;renderer.count=0;
  const ox=origin[12],oy=origin[13],oz=origin[14],rx=camera[0],ry=camera[1],rz=camera[2];
  const gust=Math.sin(time*.00014)*.032;
  for(let i=0;i<count;i++){
   const seed=renderer.seeds[i],x=ox+Math.cos(seed.angle)*seed.radius,z=oz+Math.sin(seed.angle)*seed.radius,
    y=oy+2.4-((time*(seed.near?.00048:.00036)+seed.phase)%1)*4,
    length=(seed.near?.22:.12)*(quality==='hq'?1.25:1),width=quality==='hq'?(seed.near?.007:.004):.0025,
    glint=quality==='hq'?.82+.18*Math.sin(time*.006+i):1;
   ribbon(renderer,x,y,z,x+gust,y-length,z,rx,ry,rz,width,(seed.near?.38:.24)*glint*Math.min(1,progress));
  }
  if(quality==='hq' && Number.isFinite(groundY))for(let i=0;i<24;i++){
   const phase=(time*.00075+random(i,41))%1,radius=.025+phase*.115,alpha=(1-phase)*(1-phase)*.28*progress,
    a=random(i,42)*Math.PI*2,distance=1+random(i,43)*4,cx=ox+Math.cos(a)*distance,cz=oz+Math.sin(a)*distance;
   for(let part=0;part<16;part++){
    const turn=part*Math.PI*2/16,next=(part+1)*Math.PI*2/16,mid=(turn+next)/2;
    ribbon(renderer,cx+Math.cos(turn)*radius,groundY+.014,cz+Math.sin(turn)*radius,cx+Math.cos(next)*radius,groundY+.014,cz+Math.sin(next)*radius,Math.cos(mid),0,Math.sin(mid),.0035,alpha);
   }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,renderer.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,renderer.count*6));
 }
 gl.useProgram(renderer.program);gl.bindBuffer(gl.ARRAY_BUFFER,renderer.buffer);
 for(let i=0;i<3;i++){gl.enableVertexAttribArray(renderer.attributes[i]);gl.vertexAttribPointer(renderer.attributes[i],i===0?3:i===1?2:1,gl.FLOAT,false,24,i===0?0:i===1?12:20);}
 gl.uniformMatrix4fv(renderer.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(renderer.view,false,view.transform.inverse.matrix);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
 gl.drawArrays(gl.TRIANGLES,0,renderer.count);gl.depthMask(true);
}
export function destroySpatialRainRenderer(gl,renderer){if(!gl || !renderer)return;gl.deleteBuffer(renderer.buffer);gl.deleteProgram(renderer.program);}
