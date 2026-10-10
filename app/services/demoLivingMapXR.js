import * as THREE from '../vendor/three.module.min.js';
import {LIVING_MAP_WORLD_SCALE,livingMapRotation} from './demoLivingMapReveal.js';
import {localizedCanvasContext,translateNxrText} from './i18n.js';

// Upload the actual miniature meshes to the session's context: each eye sees
// its own perspective, depth and occlusion, including the land's solid sides.
export function createDemoLivingMapXR(gl,scene,{worldScale=LIVING_MAP_WORLD_SCALE,surfaceDetail=false,fadeTransform=true}={}){
    const resources=[],cache=new Map(),textures=new Map(),textureVersions=new Map(),instanceGeometry=new Map(),instanceBuffers=new WeakMap();
    // This renderer shares the XR context with every panel and object. Keep
    // its attribute pointers in a private VAO so deleting map buffers cannot
    // invalidate the next slide's draws on the default VAO.
    const vaoExtension=gl.createVertexArray?null:gl.getExtension?.('OES_vertex_array_object');
    const vaoApi=gl.createVertexArray?{create:()=>gl.createVertexArray(),bind:value=>gl.bindVertexArray(value),remove:value=>gl.deleteVertexArray(value),binding:gl.VERTEX_ARRAY_BINDING}:vaoExtension?{create:()=>vaoExtension.createVertexArrayOES(),bind:value=>vaoExtension.bindVertexArrayOES(value),remove:value=>vaoExtension.deleteVertexArrayOES(value),binding:vaoExtension.VERTEX_ARRAY_BINDING_OES}:null;
    const vao=vaoApi?.create();
    function saveAttributes(){
        if(vaoApi){const previous=gl.getParameter(vaoApi.binding);vaoApi.bind(vao);return ()=>vaoApi.bind(previous);}
        const previous=Array.from({length:gl.getParameter(gl.MAX_VERTEX_ATTRIBS)},(_,index)=>({index,enabled:gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_ENABLED),buffer:gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),size:gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_SIZE),type:gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_TYPE),normalized:gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),stride:gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_STRIDE),offset:gl.getVertexAttribOffset(index,gl.VERTEX_ATTRIB_ARRAY_POINTER)}));
        return ()=>{for(const state of previous){if(state.buffer){gl.bindBuffer(gl.ARRAY_BUFFER,state.buffer);gl.vertexAttribPointer(state.index,state.size,state.type,state.normalized,state.stride,state.offset);}if(state.enabled && state.buffer)gl.enableVertexAttribArray(state.index);else gl.disableVertexAttribArray(state.index);}};
    }
    const extension=gl.drawArraysInstanced?null:gl.getExtension?.('ANGLE_instanced_arrays');
    const instancing=gl.drawArraysInstanced?{divisor:(...args)=>gl.vertexAttribDivisor(...args),draw:(...args)=>gl.drawArraysInstanced(...args)}:extension?{divisor:(...args)=>extension.vertexAttribDivisorANGLE(...args),draw:(...args)=>extension.drawArraysInstancedANGLE(...args)}:null;
    const cloudCanvas=document.createElement('canvas');cloudCanvas.width=1024;cloudCanvas.height=160;
    const cloudTexture=new THREE.CanvasTexture(cloudCanvas),cloudGeometry=new THREE.PlaneGeometry(1,1),cloudMaterial=new THREE.MeshBasicMaterial({map:cloudTexture,transparent:true});
    const cloud=new THREE.Mesh(cloudGeometry,cloudMaterial);let lastGuidance='';
    const compile=(type,source)=>{const shader=gl.createShader(type);resources.push(['Shader',shader]);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
    // Fruit Window opts into material detail; the map retains its established shader.
    const detailed=surfaceDetail && Boolean(gl.createVertexArray || gl.getExtension?.('OES_standard_derivatives'));
    const surfaceShader=(source,fragment=false)=>gl.createVertexArray?
        '#version 300 es\n'+source.replace(/\battribute\b/g,'in').replace(/\bvarying\b/g,fragment?'in':'out').replace(/\btexture2D\b/g,'texture').replace(/\bgl_FragColor\b/g,'surfaceOutput').replace('precision highp float;','precision highp float;\nout vec4 surfaceOutput;'):
        (fragment?'#extension GL_OES_standard_derivatives : enable\n':'')+source;
    const program=gl.createProgram();resources.push(['Program',program]);
    gl.attachShader(program,compile(gl.VERTEX_SHADER,detailed?surfaceShader(FRUIT_SURFACE_VERTEX):`attribute vec3 p,n,c,ic;attribute vec2 uv;attribute vec4 i0,i1,i2,i3;uniform mat4 projection,view,model;uniform float instanced;varying float light;varying vec2 v;varying vec3 tint;void main(){vec4 point=vec4(p,1.);vec3 norm=n;if(instanced>.5){mat4 pose=mat4(i0,i1,i2,i3);point=pose*point;norm=mat3(pose)*n;}vec3 normal=normalize(mat3(model)*norm);light=.68+.32*max(0.,dot(normal,normalize(vec3(-.3,.8,.5))));v=uv;tint=pow(max(c*(instanced>.5?ic:vec3(1.)),vec3(0.)),vec3(.4545));gl_Position=projection*view*model*point;}`));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,detailed?surfaceShader(FRUIT_SURFACE_FRAGMENT,true):`precision mediump float;uniform vec3 colour;uniform float alpha,textured;uniform sampler2D image;varying float light;varying vec2 v;varying vec3 tint;void main(){vec4 c=vec4(colour*tint,1.);if(textured>.5)c*=texture2D(image,v);if(c.a*alpha<.01)discard;gl_FragColor=vec4(c.rgb*light,c.a*alpha);}`));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const uniforms=Object.fromEntries(['projection','view','model','colour','alpha','textured','image','instanced','normalView','normalImage','normalMapped','normalScale','roughImage','roughMapped','roughness','unlit'].map(k=>[k,gl.getUniformLocation(program,k)]));
    const attributes=['p','n','uv','c'].map(k=>gl.getAttribLocation(program,k));
    const matrixAttributes=['i0','i1','i2','i3'].map(k=>gl.getAttribLocation(program,k));
    const instanceColourAttribute=gl.getAttribLocation(program,'ic');
    const surfaceMatrix=new THREE.Matrix4(),surfaceNormal=new THREE.Matrix3(),eyeMatrix=new THREE.Matrix4();
    const root=new THREE.Matrix4(),world=new THREE.Matrix4(),instance=new THREE.Matrix4(),materialColours=new WeakMap(),renderNodes=[];
    scene.traverse(node=>{if(node.isMesh || node.isLine)renderNodes.push(node);});if(detailed)renderNodes.sort((a,b)=>Number(Boolean(a.material?.transparent))-Number(Boolean(b.material?.transparent)));let prepareIndex=0;
    function geometry(source){
        if(cache.has(source)){
            const entry=cache.get(source);
            ['position','normal','uv','color'].forEach((key,i)=>{const attribute=source.attributes[key];if(attribute && entry.versions[i]!==attribute.version){gl.bindBuffer(gl.ARRAY_BUFFER,entry.buffers[i]);gl.bufferSubData(gl.ARRAY_BUFFER,0,attribute.array);entry.versions[i]=attribute.version;}});
            return entry;
        }
        const data=source.index?source.toNonIndexed():source;
        const count=data.attributes.position.count;
        const arrays=[data.attributes.position.array,data.attributes.normal?.array || new Float32Array(count*3).fill(1),data.attributes.uv?.array || new Float32Array(count*2),data.attributes.color?.array || new Float32Array(count*3).fill(1)];
        const buffers=arrays.map(array=>{const b=gl.createBuffer();resources.push(['Buffer',b]);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,array,gl.STATIC_DRAW);return b;});
        const entry={buffers,count,versions:['position','normal','uv','color'].map(key=>source.attributes[key]?.version)};cache.set(source,entry);if(data!==source)data.dispose();return entry;
    }
    function batchInstances(node){
        let result=instanceGeometry.get(node);
        if(result && result.version===node.instanceMatrix.version)return result;
        const data=result?.source || (node.geometry.index?node.geometry.toNonIndexed():node.geometry),count=data.attributes.position.count;
        const positions=result?.geometry.attributes.position.array || new Float32Array(count*node.instanceMatrix.count*3),normals=result?.geometry.attributes.normal.array || new Float32Array(positions.length),uvs=result?.geometry.attributes.uv.array || new Float32Array(count*node.instanceMatrix.count*2),colours=result?.geometry.attributes.color.array || new Float32Array(positions.length).fill(1),point=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3(),colour=new THREE.Color();
        for(let i=0;i<node.instanceMatrix.count;i++){
            node.getMatrixAt(i,instance);normalMatrix.getNormalMatrix(instance);if(node.instanceColor)node.getColorAt(i,colour);else colour.setRGB(1,1,1);
            for(let j=0;j<count;j++){
                const k=i*count+j;point.fromBufferAttribute(data.attributes.position,j).applyMatrix4(instance);positions[k*3]=point.x;positions[k*3+1]=point.y;positions[k*3+2]=point.z;
                if(data.attributes.normal){normal.fromBufferAttribute(data.attributes.normal,j).applyMatrix3(normalMatrix).normalize();normals[k*3]=normal.x;normals[k*3+1]=normal.y;normals[k*3+2]=normal.z;}
                if(data.attributes.uv){uvs[k*2]=data.attributes.uv.getX(j);uvs[k*2+1]=data.attributes.uv.getY(j);}
                colours[k*3]=colour.r*(data.attributes.color?.getX(j) ?? 1);colours[k*3+1]=colour.g*(data.attributes.color?.getY(j) ?? 1);colours[k*3+2]=colour.b*(data.attributes.color?.getZ(j) ?? 1);
            }
        }
        if(!result){const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.BufferAttribute(positions,3));merged.setAttribute('normal',new THREE.BufferAttribute(normals,3));merged.setAttribute('uv',new THREE.BufferAttribute(uvs,2));merged.setAttribute('color',new THREE.BufferAttribute(colours,3));result={geometry:merged,source:data,verticesPerInstance:count};instanceGeometry.set(node,result);}
        else {result.geometry.attributes.position.needsUpdate=true;result.geometry.attributes.normal.needsUpdate=true;}
        result.version=node.instanceMatrix.version;return result;
    }
    function bindSurfaceMap(map,unit,uniform){
        if(!map)return;
        let texture=textures.get(map);gl.activeTexture(gl.TEXTURE0+unit);
        if(!texture){texture=gl.createTexture();resources.push(['Texture',texture]);textures.set(map,texture);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
        gl.bindTexture(gl.TEXTURE_2D,texture);
        if(textureVersions.get(map)!==map.version){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,map.flipY);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,map.image);textureVersions.set(map,map.version);}
        gl.uniform1i(uniform,unit);
    }
    function drawNode(node,matrix,opacity,batch=null){
        const material=node.material;if(Array.isArray(material))return;
        const entry=geometry(batch?.geometry || node.geometry);
        entry.buffers.forEach((buffer,i)=>{if(attributes[i]<0)return;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(attributes[i]);gl.vertexAttribPointer(attributes[i],i===2?2:3,gl.FLOAT,false,0,0);});
        // Quest supports GPU instancing. Moving pegs upload only five poses,
        // once per frame across both eyes, instead of rebuilding all vertices.
        const gpu=instancing && node.isInstancedMesh && node.userData.livingMapDynamic;
        gl.uniform1f(uniforms.instanced,gpu?1:0);
        if(gpu){
            let buffers=instanceBuffers.get(node);
            if(!buffers){buffers={matrix:gl.createBuffer(),colour:gl.createBuffer(),version:-1,colourVersion:-1};resources.push(['Buffer',buffers.matrix],['Buffer',buffers.colour]);instanceBuffers.set(node,buffers);}
            gl.bindBuffer(gl.ARRAY_BUFFER,buffers.matrix);
            if(buffers.version!==node.instanceMatrix.version){if(buffers.version<0)gl.bufferData(gl.ARRAY_BUFFER,node.instanceMatrix.array,gl.DYNAMIC_DRAW);else gl.bufferSubData(gl.ARRAY_BUFFER,0,node.instanceMatrix.array);buffers.version=node.instanceMatrix.version;}
            matrixAttributes.forEach((attribute,i)=>{gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,4,gl.FLOAT,false,64,i*16);instancing.divisor(attribute,1);});
            gl.bindBuffer(gl.ARRAY_BUFFER,buffers.colour);
            const colourVersion=node.instanceColor?.version ?? 0;
            if(buffers.colourVersion!==colourVersion){gl.bufferData(gl.ARRAY_BUFFER,node.instanceColor?.array || new Float32Array(node.instanceMatrix.count*3).fill(1),gl.STATIC_DRAW);buffers.colourVersion=colourVersion;}
            gl.enableVertexAttribArray(instanceColourAttribute);gl.vertexAttribPointer(instanceColourAttribute,3,gl.FLOAT,false,0,0);instancing.divisor(instanceColourAttribute,1);
        }
        let c=materialColours.get(material);if(!c){const colour=material.color.clone();if(!detailed)colour.convertLinearToSRGB();c=[colour.r,colour.g,colour.b];materialColours.set(material,c);}gl.uniform3f(uniforms.colour,c[0],c[1],c[2]);gl.uniform1f(uniforms.alpha,opacity*material.opacity);
        gl.uniformMatrix4fv(uniforms.model,false,matrix.elements);
        gl.uniform1f(uniforms.textured,material.map?1:0);
        if(material.map){
            let texture=textures.get(material.map);
            if(!texture){texture=gl.createTexture();resources.push(['Texture',texture]);textures.set(material.map,texture);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
            if(textureVersions.get(material.map)!==material.map.version){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,detailed?material.map.flipY:true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,material.map.image);textureVersions.set(material.map,material.map.version);}
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(uniforms.image,0);
        }
        if(detailed){
            surfaceMatrix.multiplyMatrices(eyeMatrix,matrix);surfaceNormal.getNormalMatrix(surfaceMatrix);
            gl.uniformMatrix3fv(uniforms.normalView,false,surfaceNormal.elements);
            gl.uniform1f(uniforms.normalMapped,material.normalMap?1:0);gl.uniform2f(uniforms.normalScale,material.normalScale?.x ?? 1,material.normalScale?.y ?? 1);
            gl.uniform1f(uniforms.roughMapped,material.roughnessMap?1:0);gl.uniform1f(uniforms.roughness,material.roughness ?? .7);gl.uniform1f(uniforms.unlit,material.isMeshBasicMaterial?1:0);
            bindSurfaceMap(material.normalMap,1,uniforms.normalImage);bindSurfaceMap(material.roughnessMap,2,uniforms.roughImage);
            gl.activeTexture(gl.TEXTURE0);
        }
        const transparent=material.transparent || opacity<.999;
        if(transparent){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);}else gl.disable(gl.BLEND);
        gl.depthMask(detailed ? material.depthWrite!==false && !material.transparent : !transparent);gl.disable(gl.CULL_FACE);
        const start=batch?0:node.geometry.drawRange.start,count=batch?node.count*batch.verticesPerInstance:Math.min(entry.count-start,node.geometry.drawRange.count);
        if(count>0){if(gpu)instancing.draw(gl.TRIANGLES,start,count,node.count);else gl.drawArrays(node.isLine?gl.LINE_STRIP:gl.TRIANGLES,start,count);}
        if(gpu){for(const attribute of matrixAttributes){instancing.divisor(attribute,0);gl.disableVertexAttribArray(attribute);}instancing.divisor(instanceColourAttribute,0);gl.disableVertexAttribArray(instanceColourAttribute);instancing.divisor(attributes[3],0);}
    }
    return {
        prepareNext(){
            // One mesh per frame during the reading interval, including meshes
            // that appear only after placement. Both eyes share these buffers.
            if(prepareIndex>=renderNodes.length)return true;
            const node=renderNodes[prepareIndex++],batch=node.isInstancedMesh && !(instancing && node.userData.livingMapDynamic)?batchInstances(node):null;
            geometry(batch?.geometry || node.geometry);return prepareIndex>=renderNodes.length;
        },
        draw(view,origin,rotation,opacity,guidance=''){
            if(detailed)eyeMatrix.fromArray(view.transform.inverse.matrix);
            if(opacity<=0)return;
            const previousBuffer=gl.getParameter(gl.ARRAY_BUFFER_BINDING),restoreAttributes=saveAttributes();
            try{
            root.compose(new THREE.Vector3(origin.x,origin.y-(fadeTransform ? .10*(1-opacity) : 0),origin.z),livingMapRotation(rotation),new THREE.Vector3().setScalar(worldScale*(fadeTransform ? .78+.22*opacity : 1)));
            gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.uniformMatrix4fv(uniforms.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(uniforms.view,false,view.transform.inverse.matrix);
            for(const node of renderNodes){let visible=true;for(let parent=node;parent;parent=parent.parent)if(!parent.visible){visible=false;break;}if(!visible)continue;world.multiplyMatrices(root,node.matrixWorld);drawNode(node,world,opacity,node.isInstancedMesh && !(instancing && node.userData.livingMapDynamic)?batchInstances(node):null);}
            if(guidance){
                const text=translateNxrText(guidance);
                if(text!==lastGuidance){const ctx=localizedCanvasContext(cloudCanvas.getContext('2d'));ctx.clearRect(0,0,1024,160);ctx.fillStyle='rgba(19,48,37,.95)';ctx.beginPath();ctx.roundRect(4,4,1016,152,76);ctx.fill();ctx.strokeStyle='#b8d7a4';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#fff8e4';ctx.font='600 44px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,80,950);cloudTexture.needsUpdate=true;lastGuidance=text;}
                // Guidance belongs to the landscape plate. It no longer billboards
                // toward the headset, so head turns do not make it feel locked on.
                world.compose(new THREE.Vector3(origin.x,origin.y+.32,origin.z),livingMapRotation(rotation),new THREE.Vector3(.30,.047,1));drawNode(cloud,world,opacity);
            }
            gl.depthMask(true);gl.disable(gl.BLEND);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.activeTexture(gl.TEXTURE0);
            }finally{restoreAttributes();gl.bindBuffer(gl.ARRAY_BUFFER,previousBuffer);}
        },
        destroy(){if(vao)vaoApi.remove(vao);for(const [kind,value] of resources)gl['delete'+kind](value);for(const [node,batch] of instanceGeometry){batch.geometry.dispose();if(batch.source!==node.geometry)batch.source.dispose();}instanceGeometry.clear();cache.clear();textures.clear();textureVersions.clear();cloudGeometry.dispose();cloudMaterial.dispose();cloudTexture.dispose();}
    };
}

// Portable WebGL material shading for the Fruit Window's baked glTF maps.
const FRUIT_SURFACE_VERTEX=`attribute vec3 p,n,c,ic;attribute vec2 uv;attribute vec4 i0,i1,i2,i3;
uniform mat4 projection,view,model;uniform mat3 normalView;uniform float instanced;
varying vec3 pointView,normalV,tint;varying vec2 v;
void main(){vec4 point=vec4(p,1.);vec3 norm=n;if(instanced>.5){mat4 pose=mat4(i0,i1,i2,i3);point=pose*point;norm=mat3(pose)*n;}
vec4 pv=view*model*point;pointView=pv.xyz;normalV=normalize(normalView*norm);v=uv;tint=c*(instanced>.5?ic:vec3(1.));gl_Position=projection*pv;}`;
const FRUIT_SURFACE_FRAGMENT=`precision highp float;
uniform vec3 colour;uniform vec2 normalScale;uniform float alpha,textured,normalMapped,roughMapped,roughness,unlit;
uniform sampler2D image,normalImage,roughImage;varying vec3 pointView,normalV,tint;varying vec2 v;
void main(){vec4 texel=vec4(1.);if(textured>.5)texel=texture2D(image,v);if(texel.a*alpha<.01)discard;
vec3 albedo=colour*tint*pow(max(texel.rgb,vec3(0.)),vec3(2.2));vec3 N=normalize(normalV)*(gl_FrontFacing?1.:-1.);
if(normalMapped>.5){vec3 q0=dFdx(pointView),q1=dFdy(pointView);vec2 st0=dFdx(v),st1=dFdy(v);
vec3 q1p=cross(q1,N),q0p=cross(N,q0);vec3 T=q1p*st0.x+q0p*st1.x,B=q1p*st0.y+q0p*st1.y;
float inv=inversesqrt(max(max(dot(T,T),dot(B,B)),.0000001));vec3 bump=texture2D(normalImage,v).xyz*2.-1.;bump.xy*=normalScale;N=normalize(mat3(T*inv,B*inv,N)*bump);}
float r=roughness;if(roughMapped>.5)r*=texture2D(roughImage,v).g;r=clamp(r,.18,1.);
vec3 L=normalize(vec3(-.45,.72,.55)),V=normalize(-pointView),H=normalize(L+V);
float diffuse=max(dot(N,L),0.),fill=max(dot(N,normalize(vec3(.6,.1,.7))),0.);
float shininess=mix(150.,8.,r*r);float spec=pow(max(dot(N,H),0.),shininess)*(.055+.13*(1.-r))*diffuse;
vec3 lit=albedo*(.44+.58*diffuse+.14*fill)+vec3(spec);if(unlit>.5)lit=albedo;
gl_FragColor=vec4(pow(max(lit,vec3(0.)),vec3(1./2.2)),texel.a*alpha);}`;
