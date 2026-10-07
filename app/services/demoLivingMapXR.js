import * as THREE from '../vendor/three.module.min.js';
import {LIVING_MAP_WORLD_SCALE,livingMapRotation} from './demoLivingMapReveal.js';
import {localizedCanvasContext,translateNxrText} from './i18n.js';

// Upload the actual miniature meshes to the session's context: each eye sees
// its own perspective, depth and occlusion, including the land's solid sides.
export function createDemoLivingMapXR(gl,scene){
    const resources=[],cache=new Map(),textures=new Map(),textureVersions=new Map(),instanceGeometry=new Map();
    const cloudCanvas=document.createElement('canvas');cloudCanvas.width=1024;cloudCanvas.height=160;
    const cloudTexture=new THREE.CanvasTexture(cloudCanvas),cloudGeometry=new THREE.PlaneGeometry(1,1),cloudMaterial=new THREE.MeshBasicMaterial({map:cloudTexture,transparent:true});
    const cloud=new THREE.Mesh(cloudGeometry,cloudMaterial);let lastGuidance='';
    const compile=(type,source)=>{const shader=gl.createShader(type);resources.push(['Shader',shader]);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
    const program=gl.createProgram();resources.push(['Program',program]);
    gl.attachShader(program,compile(gl.VERTEX_SHADER,`attribute vec3 p,n;attribute vec2 uv;uniform mat4 projection,view,model;varying float light;varying vec2 v;void main(){vec3 normal=normalize(mat3(model)*n);light=.65+.35*abs(dot(normal,normalize(vec3(-.3,.8,.5))));v=uv;gl_Position=projection*view*model*vec4(p,1.);}`));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`precision mediump float;uniform vec3 colour;uniform float alpha,textured;uniform sampler2D image;varying float light;varying vec2 v;void main(){vec4 c=vec4(colour,1.);if(textured>.5)c*=texture2D(image,v);if(c.a*alpha<.01)discard;gl_FragColor=vec4(c.rgb*light,c.a*alpha);}`));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const uniforms=Object.fromEntries(['projection','view','model','colour','alpha','textured','image'].map(k=>[k,gl.getUniformLocation(program,k)]));
    const attributes=['p','n','uv'].map(k=>gl.getAttribLocation(program,k));
    const root=new THREE.Matrix4(),world=new THREE.Matrix4(),instance=new THREE.Matrix4(),painted=new WeakMap();
    function geometry(source){
        if(cache.has(source))return cache.get(source);
        const data=source.index?source.toNonIndexed():source;
        const count=data.attributes.position.count;
        const arrays=[data.attributes.position.array,data.attributes.normal?.array || new Float32Array(count*3).fill(1),data.attributes.uv?.array || new Float32Array(count*2)];
        const buffers=arrays.map(array=>{const b=gl.createBuffer();resources.push(['Buffer',b]);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,array,gl.STATIC_DRAW);return b;});
        const entry={buffers,count};cache.set(source,entry);if(data!==source)data.dispose();return entry;
    }
    function batchInstances(node){
        if(instanceGeometry.has(node))return instanceGeometry.get(node);
        const data=node.geometry.index?node.geometry.toNonIndexed():node.geometry,count=data.attributes.position.count;
        const positions=new Float32Array(count*node.instanceMatrix.count*3),normals=new Float32Array(positions.length),uvs=new Float32Array(count*node.instanceMatrix.count*2),point=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
        for(let i=0;i<node.instanceMatrix.count;i++){
            node.getMatrixAt(i,instance);normalMatrix.getNormalMatrix(instance);
            for(let j=0;j<count;j++){
                const k=i*count+j;point.fromBufferAttribute(data.attributes.position,j).applyMatrix4(instance);positions.set([point.x,point.y,point.z],k*3);
                if(data.attributes.normal){normal.fromBufferAttribute(data.attributes.normal,j).applyMatrix3(normalMatrix).normalize();normals.set([normal.x,normal.y,normal.z],k*3);}
                if(data.attributes.uv)uvs.set([data.attributes.uv.getX(j),data.attributes.uv.getY(j)],k*2);
            }
        }
        const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.BufferAttribute(positions,3));merged.setAttribute('normal',new THREE.BufferAttribute(normals,3));merged.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
        if(data!==node.geometry)data.dispose();const result={geometry:merged,verticesPerInstance:count};instanceGeometry.set(node,result);return result;
    }
    function drawNode(node,matrix,opacity,batch=null){
        const material=node.material;if(Array.isArray(material))return;
        const entry=geometry(batch?.geometry || node.geometry);
        entry.buffers.forEach((buffer,i)=>{if(attributes[i]<0)return;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(attributes[i]);gl.vertexAttribPointer(attributes[i],i===2?2:3,gl.FLOAT,false,0,0);});
        const c=material.color.clone().convertLinearToSRGB();gl.uniform3f(uniforms.colour,c.r,c.g,c.b);gl.uniform1f(uniforms.alpha,opacity*material.opacity);
        gl.uniformMatrix4fv(uniforms.model,false,matrix.elements);
        gl.uniform1f(uniforms.textured,material.map?1:0);
        if(material.map){
            let texture=textures.get(material.map);
            if(!texture){texture=gl.createTexture();resources.push(['Texture',texture]);textures.set(material.map,texture);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
            if(textureVersions.get(material.map)!==material.map.version){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,material.map.image);textureVersions.set(material.map,material.map.version);}
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(uniforms.image,0);
        }
        const transparent=material.transparent || opacity<.999;
        if(transparent){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);}else gl.disable(gl.BLEND);
        gl.depthMask(!transparent);gl.disable(gl.CULL_FACE);
        const start=batch?0:node.geometry.drawRange.start,count=batch?node.count*batch.verticesPerInstance:Math.min(entry.count-start,node.geometry.drawRange.count);
        if(count>0)gl.drawArrays(node.isLine?gl.LINE_STRIP:gl.TRIANGLES,start,count);
    }
    return {
        draw(view,origin,rotation,opacity,guidance=''){
            if(opacity<=0)return;
            const key=[...view.projectionMatrix,...view.transform.inverse.matrix,origin.x,origin.y,origin.z,rotation?.x ?? rotation,rotation?.y ?? 0,rotation?.z ?? 0,rotation?.w ?? 0,opacity,guidance].join(':');
            if(painted.get(view)===key)return;
            painted.set(view,key);
            root.compose(new THREE.Vector3(origin.x,origin.y-.025*(1-opacity),origin.z),livingMapRotation(rotation),new THREE.Vector3().setScalar(LIVING_MAP_WORLD_SCALE*(.94+.06*opacity)));
            gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.uniformMatrix4fv(uniforms.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(uniforms.view,false,view.transform.inverse.matrix);
            scene.traverseVisible(node=>{if(!node.isMesh && !node.isLine)return;world.multiplyMatrices(root,node.matrixWorld);drawNode(node,world,opacity,node.isInstancedMesh?batchInstances(node):null);});
            if(guidance){
                const text=translateNxrText(guidance);
                if(text!==lastGuidance){const ctx=localizedCanvasContext(cloudCanvas.getContext('2d'));ctx.clearRect(0,0,1024,160);ctx.fillStyle='rgba(19,48,37,.95)';ctx.beginPath();ctx.roundRect(4,4,1016,152,76);ctx.fill();ctx.strokeStyle='#b8d7a4';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#fff8e4';ctx.font='600 44px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,80,950);cloudTexture.needsUpdate=true;lastGuidance=text;}
                const eye=new THREE.Matrix4().fromArray(view.transform.inverse.matrix).invert(),facing=new THREE.Quaternion().setFromRotationMatrix(eye);
                world.compose(new THREE.Vector3(origin.x,origin.y+.32,origin.z),facing,new THREE.Vector3(.30,.047,1));drawNode(cloud,world,opacity);
            }
            gl.depthMask(true);gl.disable(gl.BLEND);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.activeTexture(gl.TEXTURE0);
        },
        destroy(){for(const [kind,value] of resources)gl['delete'+kind](value);for(const batch of instanceGeometry.values())batch.geometry.dispose();instanceGeometry.clear();cache.clear();textures.clear();textureVersions.clear();cloudGeometry.dispose();cloudMaterial.dispose();cloudTexture.dispose();}
    };
}
