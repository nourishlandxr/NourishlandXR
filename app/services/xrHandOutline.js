import * as THREE from '../vendor/three.module.min.js';
import {parseGlb,accessorData} from './demoBeeModel.js';
import {controllerHandParents,controllerHandFlexAxes,controllerHandJointPoses,controllerHandGripMatrix} from './xrControllerHandPose.js';

// Meta-contributed generic-hand assets, vendored from WebXR Input Profiles.
// A quiet rim over passthrough, using the same tracked joints as interaction.
const assets=new Map();
function loadHand(side){
    if(!assets.has(side))assets.set(side,fetch(new URL('../assets/meta-hand-'+side+'.glb',import.meta.url)).then(response=>{if(!response.ok)throw Error('Hand model unavailable');return response.arrayBuffer();}).then(parseGlb));
    return assets.get(side);
}
export function createXRHandOutline(gl){
    let disposed=false;const rigs=new Map(),buffers=[];
    const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(error);}return shader;};
    const vertex=compile(gl.VERTEX_SHADER,`precision highp float;
        attribute vec3 p,n;attribute vec4 joints,weights;
        uniform mat4 bones[25],projection,view;uniform vec3 eye;
        varying float rim;
        void main(){mat4 skin=bones[int(joints.x)]*weights.x+bones[int(joints.y)]*weights.y+bones[int(joints.z)]*weights.z+bones[int(joints.w)]*weights.w;
            vec4 world=skin*vec4(p,1.);vec3 normal=normalize(mat3(skin)*n);
            rim=1.-abs(dot(normal,normalize(eye-world.xyz)));
            gl_Position=projection*view*world;}`);
    const fragment=compile(gl.FRAGMENT_SHADER,'precision mediump float;varying float rim;uniform float opacity,filled;uniform vec3 fillColour;void main(){float edge=smoothstep(.48,.87,rim);float alpha=mix(edge,.98+.02*edge,filled);if(alpha<.025)discard;gl_FragColor=vec4(mix(vec3(.93,.96,.96),fillColour*(.82+.18*edge),filled),alpha*opacity);}');
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const error=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw Error(error);}
    const locations=Object.fromEntries(['bones[0]','projection','view','eye','opacity','filled','fillColour'].map(name=>[name,gl.getUniformLocation(program,name)]));
    const attributes=Object.fromEntries(['p','n','joints','weights'].map(name=>[name,gl.getAttribLocation(program,name)]));
    const buffer=(target,data)=>{const value=gl.createBuffer();buffers.push(value);gl.bindBuffer(target,value);gl.bufferData(target,data,gl.STATIC_DRAW);return value;};
    for(const side of ['left','right'])loadHand(side).then(gltf=>{
        if(disposed)return;
        const primitive=gltf.json.meshes[0].primitives[0],skin=gltf.json.skins[0],inverse=accessorData(gltf,skin.inverseBindMatrices).data;
        const geometry=Object.entries({p:'POSITION',n:'NORMAL',joints:'JOINTS_0',weights:'WEIGHTS_0'}).map(([name,key])=>{const data=accessorData(gltf,primitive.attributes[key]);return {location:attributes[name],buffer:buffer(gl.ARRAY_BUFFER,new Float32Array(data.data)),size:data.components};});
        const indices=accessorData(gltf,primitive.indices).data;
        const bind=Array.from({length:25},(_,i)=>new THREE.Matrix4().fromArray(inverse,i*16).invert());
        const names=skin.joints.map(id=>gltf.json.nodes[id].name),wristIndex=names.indexOf('wrist'),parents=controllerHandParents(names);
        const flexAxes=controllerHandFlexAxes(names,parents,bind,wristIndex,side);
        rigs.set(side,{geometry,index:buffer(gl.ELEMENT_ARRAY_BUFFER,indices),count:indices.length,type:indices.BYTES_PER_ELEMENT===4?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,names,wristIndex,parents,flexAxes,inverse:Array.from({length:25},(_,i)=>new THREE.Matrix4().fromArray(inverse,i*16)),bind,matrices:new Float32Array(25*16),matrix:new THREE.Matrix4(),sample:null});
    }).catch(error=>{if(!disposed)console.warn('Hand outline:',error.message);});
    return {
        draw(view,entries,{filled=false,controllers=[],controllerOpacity=1,trackedOpacity=1}={}){
            if(disposed)return false;
            const ready=entries.filter(({source,state})=>state?.tracked && state.visualConfidence>0 && performance.now()-state.time<100 && rigs.has(source.handedness) && rigs.get(source.handedness).names.every(name=>state.rawJoints.has(name)));
            for(const input of controllers)if(input.matrix && rigs.has(input.source.handedness) && !ready.some(entry=>entry.source.handedness===input.source.handedness))ready.push({source:input.source,controller:input});
            if(!ready.length)return false;
            const depth=gl.isEnabled(gl.DEPTH_TEST),blend=gl.isEnabled(gl.BLEND),cull=gl.isEnabled(gl.CULL_FACE),mask=gl.getParameter(gl.DEPTH_WRITEMASK),cullMode=gl.getParameter(gl.CULL_FACE_MODE);
            gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.depthMask(filled);gl.useProgram(program);
            gl.uniformMatrix4fv(locations.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(locations.view,false,view.transform.inverse.matrix);const eye=view.transform.matrix;gl.uniform3f(locations.eye,eye[12],eye[13],eye[14]);
            gl.uniform1f(locations.filled,filled?1:0);
            for(const {source,state,controller} of ready){
                const rig=rigs.get(source.handedness),sample=controller || state;
                if(rig.sample!==sample){
                    if(controller){
                        const base=controllerHandGripMatrix(rig,controller.matrix);
                        const joints=controllerHandJointPoses(rig,controller);
                        rig.names.forEach((name,i)=>rig.matrix.copy(base).multiply(joints[i]).multiply(rig.inverse[i]).toArray(rig.matrices,i*16));
                    }else rig.names.forEach((name,i)=>{rig.matrix.fromArray(state.rawJoints.get(name).matrix).multiply(rig.inverse[i]).toArray(rig.matrices,i*16);});rig.sample=sample;
                }
                gl.uniformMatrix4fv(locations['bones[0]'],false,rig.matrices);gl.uniform1f(locations.opacity,controller?controllerOpacity:(state.pinch?.95:.9)*state.visualConfidence*trackedOpacity);gl.uniform3f(locations.fillColour,...(controller?[.52,.64,.49]:[.93,.91,.84]));
                for(const a of rig.geometry){gl.bindBuffer(gl.ARRAY_BUFFER,a.buffer);gl.enableVertexAttribArray(a.location);gl.vertexAttribPointer(a.location,a.size,gl.FLOAT,false,0,0);}
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,rig.index);gl.drawElements(gl.TRIANGLES,rig.count,rig.type,0);
            }
            gl.depthMask(mask);gl.cullFace(cullMode);if(!depth)gl.disable(gl.DEPTH_TEST);if(!blend)gl.disable(gl.BLEND);if(!cull)gl.disable(gl.CULL_FACE);return true;
        },
        destroy(){disposed=true;buffers.forEach(value=>gl.deleteBuffer(value));gl.deleteProgram(program);rigs.clear();}
    };
}
