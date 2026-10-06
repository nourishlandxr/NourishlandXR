// Share the session context. Never render a WebGL canvas and copy it into XR.
// Geometry and colour are uploaded once; both eyes and all bees share one rig.
export function beeRenderYaw(pose={},origin={x:0,z:0}){
    const flight=Number.isFinite(pose.worldYaw)?pose.worldYaw:pose.heading || 0;
    if(!pose.viewer || !(pose.flyby>0))return flight+(pose.headTurn || 0);
    const facing=Math.atan2(pose.viewer[12]-origin.x,pose.viewer[14]-origin.z);
    const t=Math.max(0,Math.min(1,pose.flyby/.65)),engagement=t*t*(3-2*t);
    const turn=Math.atan2(Math.sin(facing-flight),Math.cos(facing-flight));
    return flight+turn*engagement+(pose.headTurn || 0);
}
export function createBeeXRRenderer(gl,model,bitmap){
    if(!gl.getExtension('OES_texture_float') || gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)<1)return null;
    const shaders=[],buffers=[],textures=[];
    let program;
    const cleanup=()=>{buffers.forEach(b=>gl.deleteBuffer(b));textures.forEach(t=>gl.deleteTexture(t));shaders.forEach(s=>gl.deleteShader(s));if(program)gl.deleteProgram(program);};
    try{
        const compile=(type,source)=>{const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
        const count=model.mesh.skeleton.bones.length;
        const vertex=compile(gl.VERTEX_SHADER,`
            precision highp float;
            attribute vec3 p,n;attribute vec2 uv;attribute vec4 joints,weights;
            uniform sampler2D bones;uniform mat4 projection,view,bind,normalise;
            uniform vec3 origin;uniform float size,yaw,pitch,bank;
            varying vec2 v;varying float light;
            mat4 bone(float id){float y=(id+.5)/${count}.;
                return mat4(texture2D(bones,vec2(.125,y)),texture2D(bones,vec2(.375,y)),texture2D(bones,vec2(.625,y)),texture2D(bones,vec2(.875,y)));}
            void main(){mat4 skin=bone(joints.x)*weights.x+bone(joints.y)*weights.y+bone(joints.z)*weights.z+bone(joints.w)*weights.w;
                vec3 local=(normalise*skin*bind*vec4(p,1.)).xyz;
                float cp=cos(pitch),sp=sin(pitch),cb=cos(bank),sb=sin(bank);
                local=vec3(local.x,cp*local.y-sp*local.z,sp*local.y+cp*local.z);
                local=vec3(cb*local.x-sb*local.y,sb*local.x+cb*local.y,local.z);
                float c=cos(yaw),s=sin(yaw);vec3 turned=vec3(c*local.x+s*local.z,local.y,-s*local.x+c*local.z);
                vec3 norm=normalize(mat3(normalise*skin*bind)*n);
                light=.68+.32*abs(dot(norm,normalize(vec3(-.3,.65,.7))));v=uv;
                gl_Position=projection*view*vec4(origin+turned*size,1.);}`);
        const fragment=compile(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D colour;uniform float opacity,solid;varying vec2 v;varying float light;void main(){vec4 c=texture2D(colour,v);if(solid<.5 && c.a<.08)discard;gl_FragColor=vec4(c.rgb*light,mix(c.a*opacity,1.,solid));}');
        program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
        const attributes=Object.entries({p:'position',n:'normal',uv:'uv',joints:'skinIndex',weights:'skinWeight'}).map(([name,source])=>{
            const attribute=model.mesh.geometry.attributes[source],buffer=gl.createBuffer();buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(attribute.array),gl.STATIC_DRAW);
            return {buffer,location:gl.getAttribLocation(program,name),size:attribute.itemSize};
        });
        const index=gl.createBuffer();buffers.push(index);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);
        const indices=model.mesh.geometry.index.array;
        const bodyIndexCount=model.mesh.geometry.groups.find(group=>group.materialIndex===0)?.count ?? indices.length;
        const wingIndexCount=model.mesh.geometry.groups.find(group=>group.materialIndex===1)?.count ?? 0;
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
        const uniforms=Object.fromEntries(['projection','view','bind','normalise','origin','size','yaw','pitch','bank','bones','colour','opacity','solid'].map(name=>[name,gl.getUniformLocation(program,name)]));
        const colour=gl.createTexture(),bones=gl.createTexture();textures.push(colour,bones);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,colour);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D,bones);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,4,count,0,gl.RGBA,gl.FLOAT,null);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        let lastElapsed=NaN,lastNectar=false,lastOffset=NaN;
        const normalise=model.mesh.matrixWorld.clone();
        return {draw(view,origin,elapsed,pose){
            const offset=pose.animationOffset || 0;
            if(lastElapsed!==elapsed || lastNectar!==Boolean(pose.nectar) || lastOffset!==offset){
                // One shared rig must be re-evaluated for each bee. Updating it
                // with delta=0 can retain another bee's manually rested wings.
                model.mixer.setTime(elapsed/1000+offset);
                if(pose.nectar)for(const rest of model.wingRest || []){rest.bone.quaternion.copy(rest.rotation);rest.bone.position.copy(rest.position);rest.bone.scale.copy(rest.scale);}
                model.wrapper.updateMatrixWorld(true);model.mesh.skeleton.update();
                normalise.copy(model.mesh.matrixWorld).multiply(model.mesh.bindMatrixInverse);
                gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,bones);
                gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,4,count,gl.RGBA,gl.FLOAT,model.mesh.skeleton.boneMatrices);
                lastElapsed=elapsed;
                lastNectar=Boolean(pose.nectar);
                lastOffset=offset;
            }
            gl.useProgram(program);
            for(const a of attributes){if(a.location<0)continue;gl.bindBuffer(gl.ARRAY_BUFFER,a.buffer);gl.enableVertexAttribArray(a.location);gl.vertexAttribPointer(a.location,a.size,gl.FLOAT,false,0,0);}
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);
            gl.uniformMatrix4fv(uniforms.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(uniforms.view,false,view.transform.inverse.matrix);
            gl.uniformMatrix4fv(uniforms.bind,false,model.mesh.bindMatrix.elements);gl.uniformMatrix4fv(uniforms.normalise,false,normalise.elements);
            gl.uniform3f(uniforms.origin,origin.x,origin.y,origin.z);gl.uniform1f(uniforms.size,.095*(pose.bodyScale || 1)*(1+pose.flyby*.3));
            gl.uniform1f(uniforms.yaw,beeRenderYaw(pose,origin));
            gl.uniform1f(uniforms.pitch,pose.pitch || 0);gl.uniform1f(uniforms.bank,pose.bank || 0);
            gl.uniform1f(uniforms.opacity,pose.opacity);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,colour);gl.uniform1i(uniforms.colour,0);
            gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,bones);gl.uniform1i(uniforms.bones,1);
            gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.depthMask(true);
            gl.uniform1f(uniforms.solid,1);gl.drawElements(gl.TRIANGLES,bodyIndexCount,gl.UNSIGNED_SHORT,0);
            if(wingIndexCount){
                gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.uniform1f(uniforms.solid,0);
                gl.drawElements(gl.TRIANGLES,wingIndexCount,gl.UNSIGNED_SHORT,bodyIndexCount*Uint16Array.BYTES_PER_ELEMENT);
            }
            gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.activeTexture(gl.TEXTURE0);
        },destroy:cleanup};
    }catch(error){cleanup();console.warn('Native bee unavailable; bees remain hidden:',error);return null;}
}
