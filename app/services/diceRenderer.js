import * as THREE from '../vendor/three.module.min.js';
import {createHeroDiceGeometry} from './heroDiceGeometry.js';

// Shared shape; the learning die is clear glass and the floor toy keeps its art.
export function createDiceRenderer(gl,{radius=.12,appearance='glass'}={}){
    const geometry=createHeroDiceGeometry(radius),edges=new THREE.EdgesGeometry(geometry,4),buffers=[];
    const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const vertex=compile(gl.VERTEX_SHADER,'attribute vec3 position,normal;attribute vec2 uv;uniform mat4 mvp,model;uniform vec3 camera;varying vec3 n,eye;varying vec2 t;void main(){vec3 p=(model*vec4(position,1.)).xyz;n=normalize(mat3(model)*normal);eye=normalize(camera-p);t=uv;gl_Position=mvp*vec4(position,1.);}');
    const fragment=compile(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 n,eye;varying vec2 t;uniform sampler2D atlas;uniform float hero,lineMode,opacity;void main(){float facing=abs(dot(normalize(n),normalize(eye)));float rim=pow(1.-facing,3.);float key=max(dot(normalize(n),normalize(vec3(-.4,.7,.8))),0.);vec3 glass=vec3(.72,.9,.94)+vec3(.15)*pow(key,24.);vec3 art=texture2D(atlas,t).rgb*(.6+key*.5);vec3 colour=mix(glass,art,hero);colour=mix(colour,mix(vec3(.76,.94,.98),vec3(.19,.28,.20),hero),lineMode);float alpha=mix(.08+rim*.32,1.,hero);alpha=mix(alpha,mix(.35,.3,hero),lineMode);gl_FragColor=vec4(colour,alpha*opacity);}');
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const attrs=Object.fromEntries(['position','normal','uv'].map(n=>[n,gl.getAttribLocation(program,n)])),u=Object.fromEntries(['mvp','model','camera','atlas','hero','lineMode','opacity'].map(n=>[n,gl.getUniformLocation(program,n)]));
    const buffer=data=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);buffers.push(b);return b;};
    const positions=buffer(geometry.attributes.position.array),normals=buffer(geometry.attributes.normal.array),uvs=buffer(geometry.attributes.uv.array),edgePositions=buffer(edges.attributes.position.array);
    const atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,atlas);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([105,139,112,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    let destroyed=false,image=null;
    if(appearance==='hero'){image=new Image();image.onload=()=>{if(destroyed)return;const active=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE0);const prior=gl.getParameter(gl.TEXTURE_BINDING_2D);gl.bindTexture(gl.TEXTURE_2D,atlas);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.bindTexture(gl.TEXTURE_2D,prior);gl.activeTexture(active);};image.src=new URL('../assets/living-knowledge-seed-atlas.png',import.meta.url).href;}
    const attribute=(name,b,size)=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(attrs[name]);gl.vertexAttribPointer(attrs[name],size,gl.FLOAT,false,0,0);};
    return {geometry,
        draw(view,model,opacity=1){
            const depth=gl.isEnabled(gl.DEPTH_TEST),cull=gl.isEnabled(gl.CULL_FACE),blend=gl.isEnabled(gl.BLEND),mask=gl.getParameter(gl.DEPTH_WRITEMASK),active=gl.getParameter(gl.ACTIVE_TEXTURE);
            const vp=new THREE.Matrix4().fromArray(view.projectionMatrix).multiply(new THREE.Matrix4().fromArray(view.transform.inverse.matrix)),camera=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(view.transform.inverse.matrix).invert());
            gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(appearance==='hero');gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);const texture=gl.getParameter(gl.TEXTURE_BINDING_2D);gl.bindTexture(gl.TEXTURE_2D,atlas);
            gl.uniformMatrix4fv(u.model,false,model.elements);gl.uniformMatrix4fv(u.mvp,false,vp.multiply(model).elements);gl.uniform3f(u.camera,camera.x,camera.y,camera.z);gl.uniform1i(u.atlas,0);gl.uniform1f(u.hero,appearance==='hero'?1:0);gl.uniform1f(u.opacity,opacity);gl.uniform1f(u.lineMode,0);
            attribute('position',positions,3);attribute('normal',normals,3);attribute('uv',uvs,2);gl.drawArrays(gl.TRIANGLES,0,geometry.attributes.position.count);
            attribute('position',edgePositions,3);gl.disableVertexAttribArray(attrs.normal);gl.vertexAttrib3f(attrs.normal,0,1,0);gl.disableVertexAttribArray(attrs.uv);gl.vertexAttrib2f(attrs.uv,0,0);gl.uniform1f(u.lineMode,1);gl.depthMask(false);gl.drawArrays(gl.LINES,0,edges.attributes.position.count);
            gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(active);gl.depthMask(mask);if(!depth)gl.disable(gl.DEPTH_TEST);if(!cull)gl.disable(gl.CULL_FACE);if(!blend)gl.disable(gl.BLEND);
        },
        destroy(){destroyed=true;if(image)image.onload=null;geometry.dispose();edges.dispose();buffers.forEach(b=>gl.deleteBuffer(b));gl.deleteTexture(atlas);gl.deleteProgram(program);}
    };
}
