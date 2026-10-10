import * as THREE from '../vendor/three.module.min.js';
import {parseGlb,accessorData} from './demoBeeModel.js';
import {currentGraphicsQuality} from './spatialVisualSettings.js';
// Artistic_side, Animated Butterfly, CC BY 4.0. Full attribution accompanies
// the original, unchanged GLB. Geometry/materials are shared by all phases.
const URL=new globalThis.URL('../assets/animated_butterfly.glb',import.meta.url);
export const BUTTERFLY_RENDER_BUDGETS=Object.freeze({low:{pixels:192,interval:50},medium:{pixels:256,interval:42},high:{pixels:384,interval:33}});
export const BUTTERFLY_FLIGHT_SPEED=7.2;
const nativeFlocks=new WeakMap();
export function butterflyPoseCacheKey(pose){
    const flight=Math.round(Math.max(0,Math.min(1,pose.flight || 0))*8)/8;
    const phase=Math.round((pose.wingPhase || 0)/1.9)%3;
    return {key:`${flight}:${phase}`,flight,wingPhase:phase*1.9};
}
function butterflyWingOpening(elapsed,pose,reduced){
    const phase=pose.wingPhase || 0,time=elapsed/1000;
    const cycle=((time*8.0+.22*Math.sin(time*.7+phase)+phase)%1+1)%1;
    const stroke=cycle<.40?cycle/.40:1-(cycle-.40)/.60;
    const smooth=stroke*stroke*(3-2*stroke),flightOpening=.12+.84*smooth;
    const resting=1-butterflyRestingFold(elapsed,phase,reduced);
    return resting+(flightOpening-resting)*Math.max(0,Math.min(1,pose.flight || 0));
}
function animateButterfly(model,elapsed,pose){
    model.idle.setEffectiveWeight(1-pose.flight);model.flying.setEffectiveWeight(pose.flight);
    model.mixer.setTime(elapsed/1000);
    const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    for(const [i,index] of model.hinges.entries()){
        model.nodes[index].quaternion.copy(model.closed[i]).slerp(model.open[i],butterflyWingOpening(elapsed,pose,reduced));
    }
    model.wrapper.rotation.set(0,0,0);model.wrapper.updateMatrixWorld(true);
}
export function butterflyRestingFold(elapsed,phase=0,reduced=false){
    if(reduced)return .96;
    // One occasional opening per window, with different pauses and durations
    // for each insect. Folded wings stay still between these resting gestures.
    const time=elapsed/1000+phase*3,window=Math.floor(time/14),local=time-window*14;
    const random=salt=>{const value=Math.sin(window*127.1+phase*311.7+salt*74.7)*43758.5453;return value-Math.floor(value);};
    const start=2+random(1)*5,duration=1.8+random(2)*1.8,progress=(local-start)/duration;
    if(progress<=0 || progress>=1)return .96;
    const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
    const opening=smooth(progress/.45)*(1-smooth((progress-.60)/.40));
    return .96-(.55+random(3)*.20)*opening;
}
let prepared=null;
const foldedPoseCache=new WeakMap();
export function prepareDemoButterflyModel(){
    if(!prepared)prepared=fetch(URL,{signal:AbortSignal.timeout(30000)}).then(response=>{if(!response.ok)throw Error('Butterfly could not be loaded');return response.arrayBuffer();}).then(parseGlb).then(async gltf=>{
        const image=gltf.json.images[0],view=gltf.json.bufferViews[image.bufferView];
        const bitmap=await createImageBitmap(new Blob([gltf.binary.slice(view.byteOffset||0,(view.byteOffset||0)+view.byteLength)],{type:image.mimeType}));
        return {gltf,bitmap};
    }).catch(error=>{prepared=null;throw error;});
    return prepared;
}
function buildButterfly({gltf,bitmap},red=false){
    const texture=new THREE.Texture(bitmap);texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
    const materials=gltf.json.materials.map(data=>{const pbr=data.pbrMetallicRoughness || {},colour=pbr.baseColorFactor || [1,1,1,1];return new THREE.MeshStandardMaterial({map:pbr.baseColorTexture?texture:null,color:new THREE.Color().fromArray(colour),roughness:.72,metalness:0,side:THREE.DoubleSide,transparent:false,alphaTest:.45,depthWrite:true});});
    if(red)for(const material of materials){material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(diffuseColor.b>diffuseColor.r*1.15 && diffuseColor.b>diffuseColor.g*.82)diffuseColor.rgb=vec3(diffuseColor.b*1.12,diffuseColor.r*.55,diffuseColor.g*.22);');};material.customProgramCacheKey=()=> 'red-butterfly';}
    // The supplied wing material has full white emissive. Use restrained,
    // light-reactive pigment so it does not become a flat glowing cutout.
    const joints=new Set(gltf.json.skins.flatMap(skin=>skin.joints));
    const nodes=gltf.json.nodes.map((data,index)=>{const object=joints.has(index)?new THREE.Bone():new THREE.Group();object.name='butterfly-node-'+index;
        if(data.matrix){object.matrix.fromArray(data.matrix);object.matrix.decompose(object.position,object.quaternion,object.scale);}else{if(data.translation)object.position.fromArray(data.translation);if(data.rotation)object.quaternion.fromArray(data.rotation);if(data.scale)object.scale.fromArray(data.scale);}return object;});
    gltf.json.nodes.forEach((data,index)=>data.children?.forEach(child=>nodes[index].add(nodes[child])));
    const root=new THREE.Group();gltf.json.scenes[gltf.json.scene||0].nodes.forEach(index=>root.add(nodes[index]));root.updateMatrixWorld(true);
    const meshes=[],geometries=[];
    gltf.json.nodes.forEach((data,index)=>{if(data.mesh===undefined)return;for(const primitive of gltf.json.meshes[data.mesh].primitives){
        const geometry=new THREE.BufferGeometry();geometries.push(geometry);
        for(const [semantic,name] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',JOINTS_0:'skinIndex',WEIGHTS_0:'skinWeight'}))if(primitive.attributes[semantic]!==undefined){const {data:values,components}=accessorData(gltf,primitive.attributes[semantic]);geometry.setAttribute(name,new THREE.BufferAttribute(values,components));}
        geometry.setIndex(new THREE.BufferAttribute(accessorData(gltf,primitive.indices).data,1));
        const mesh=new THREE.SkinnedMesh(geometry,materials[primitive.material]);mesh.frustumCulled=false;nodes[index].add(mesh);root.updateMatrixWorld(true);
        const skin=gltf.json.skins[data.skin],inverse=accessorData(gltf,skin.inverseBindMatrices).data;
        mesh.bind(new THREE.Skeleton(skin.joints.map(joint=>nodes[joint]),skin.joints.map((_,i)=>new THREE.Matrix4().fromArray(inverse,i*16))));meshes.push(mesh);
    }});
    const clips=gltf.json.animations.map(animation=>new THREE.AnimationClip(animation.name,-1,animation.channels.map(channel=>{
        const sampler=animation.samplers[channel.sampler],path=channel.target.path;
        const times=accessorData(gltf,sampler.input).data,values=accessorData(gltf,sampler.output).data;
        const name='butterfly-node-'+channel.target.node+'.'+({translation:'position',rotation:'quaternion',scale:'scale'}[path]);
        return path==='rotation'?new THREE.QuaternionKeyframeTrack(name,times,values):new THREE.VectorKeyframeTrack(name,times,values);
    })));
    const mixer=new THREE.AnimationMixer(root),idle=mixer.clipAction(clips.find(clip=>clip.name==='Idle')),flying=mixer.clipAction(clips.find(clip=>clip.name==='Flying'));
    idle.play();flying.play();flying.setEffectiveWeight(0);idle.setEffectiveTimeScale(1.6);flying.setEffectiveTimeScale(BUTTERFLY_FLIGHT_SPEED);
    const bounds=new THREE.Box3(),center=new THREE.Vector3(),size=new THREE.Vector3();
    // Find a genuinely folded Idle pose from the asset rather than guessing
    // bone axes. Only the four wing hinges are constrained while perched.
    const hinges=[52,55,58,61],closed=[],open=[];let narrowest=Infinity,widest=-Infinity;
    const cached=foldedPoseCache.get(gltf);
    if(cached){closed.push(...cached.closed);open.push(...cached.open);center.copy(cached.center);size.copy(cached.size);}else{
    for(let i=0;i<32;i++){
        mixer.setTime(i/32*idle.getClip().duration/1.6);root.updateMatrixWorld(true);meshes.forEach(mesh=>{mesh.skeleton.update();mesh.computeBoundingBox();});bounds.setFromObject(root);bounds.getSize(size);
        if(size.x<narrowest){narrowest=size.x;closed.splice(0,closed.length,...hinges.map(index=>nodes[index].quaternion.clone()));}
    }
    idle.setEffectiveWeight(0);flying.setEffectiveWeight(1);
    for(let i=0;i<32;i++){
        mixer.setTime(i/32*flying.getClip().duration/BUTTERFLY_FLIGHT_SPEED);root.updateMatrixWorld(true);meshes.forEach(mesh=>{mesh.skeleton.update();mesh.computeBoundingBox();});bounds.setFromObject(root);bounds.getSize(size);
        if(size.x>widest){widest=size.x;open.splice(0,open.length,...hinges.map(index=>nodes[index].quaternion.clone()));}
    }
    mixer.setTime(0);idle.setEffectiveWeight(0);flying.setEffectiveWeight(1);mixer.update(.2);root.updateMatrixWorld(true);meshes.forEach(mesh=>{mesh.skeleton.update();mesh.computeBoundingBox();});bounds.setFromObject(root);bounds.getCenter(center);bounds.getSize(size);
    foldedPoseCache.set(gltf,{closed:closed.map(q=>q.clone()),open:open.map(q=>q.clone()),center:center.clone(),size:size.clone()});}
    const centered=new THREE.Group();centered.add(root);root.position.sub(center);const wrapper=new THREE.Group();wrapper.add(centered);wrapper.scale.setScalar(1/Math.max(size.x,size.y,size.z));
    idle.setEffectiveWeight(1);flying.setEffectiveWeight(0);mixer.setTime(0);idle.setEffectiveTimeScale(0);
    return {wrapper,mixer,idle,flying,nodes,hinges,closed,open,texture,materials,geometries,meshes,bitmap};
}
// Bake the small animated mesh at the existing quality cadence. The same
// vertices are reused by both eyes; no offscreen sprite or extra XR context.
function butterflyXRRenderer(gl,model){
    const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const vertex=compile(gl.VERTEX_SHADER,'attribute vec3 p,n;attribute vec2 uv;uniform mat4 projection,view;uniform vec3 origin;uniform float scale,foot,yaw,pitch,bank;varying vec2 v;varying float light;void main(){vec3 local=p;local.y-=foot;float cp=cos(pitch),sp=sin(pitch),cb=cos(bank),sb=sin(bank),cy=cos(yaw),sy=sin(yaw);local=vec3(local.x,cp*local.y-sp*local.z,sp*local.y+cp*local.z);local=vec3(cb*local.x-sb*local.y,sb*local.x+cb*local.y,local.z);local=vec3(cy*local.x+sy*local.z,local.y,-sy*local.x+cy*local.z);v=uv;light=.58+.42*abs(dot(normalize(n),normalize(vec3(-.3,.65,.7))));gl_Position=projection*view*vec4(origin+local*scale,1.);}');
    const fragment=compile(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D wing;uniform vec3 colour,tint;uniform float mapped,opacity,red,tinted,wingOpacity;varying vec2 v;varying float light;void main(){vec4 c=mix(vec4(colour,1.),texture2D(wing,v),mapped);if(red>.5 && mapped>.5 && c.b>c.r*1.15 && c.b>c.g*.82)c.rgb=vec3(c.b*1.12,c.r*.55,c.g*.22);if(tinted>.5 && mapped>.5 && c.b>c.r*1.15 && c.b>c.g*.82)c.rgb=tint*max(c.b,.35);if(mapped>.5)c.a*=wingOpacity;if(c.a<.45)discard;gl_FragColor=vec4(c.rgb*light,opacity);}');
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const texture=gl.createTexture(),slots=new Map(),attributes=['p','n','uv'].map(name=>gl.getAttribLocation(program,name)),uniforms=Object.fromEntries(['projection','view','origin','scale','foot','wing','colour','mapped','opacity','red','tint','tinted','wingOpacity','yaw','pitch','bank'].map(name=>[name,gl.getUniformLocation(program,name)]));
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,model.bitmap);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const parts=model.meshes.map(mesh=>({mesh,positions:new Float32Array(mesh.geometry.attributes.position.count*3),vertices:new Float32Array(mesh.geometry.index.count*8),start:0}));
    const packed=new Float32Array(parts.reduce((sum,part)=>sum+part.vertices.length,0));
    const point=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3(),ids=new Uint32Array(3);
    function update(elapsed,pose){
        const key=butterflyPoseCacheKey(pose);let slot=slots.get(key.key);
        if(slot)slots.delete(key.key);
        else if(slots.size>=12){const [oldKey,value]=slots.entries().next().value;slots.delete(oldKey);slot=value;slot.at=-Infinity;}
        else slot={buffer:gl.createBuffer(),at:-Infinity,foot:0};
        slots.set(key.key,slot);
        const interval=key.flight===0?180:BUTTERFLY_RENDER_BUDGETS[currentGraphicsQuality()].interval;
        if(elapsed>=slot.at && elapsed-slot.at<interval)return slot;
        animateButterfly(model,elapsed,key);
        const foot=Math.min(...[26,31,36,41,46,51].map(index=>model.nodes[index].getWorldPosition(point).y));let offset=0;
        for(const part of parts){const {mesh,positions,vertices}=part,g=mesh.geometry;mesh.skeleton.update();
            for(let i=0;i<g.attributes.position.count;i++){point.fromBufferAttribute(g.attributes.position,i);mesh.applyBoneTransform(i,point);point.applyMatrix4(mesh.matrixWorld);positions[i*3]=point.x;positions[i*3+1]=point.y;positions[i*3+2]=point.z;}
            for(let i=0;i<g.index.count;i+=3){ids[0]=g.index.getX(i);ids[1]=g.index.getX(i+1);ids[2]=g.index.getX(i+2);a.fromArray(positions,ids[0]*3);b.fromArray(positions,ids[1]*3);c.fromArray(positions,ids[2]*3);normal.crossVectors(ab.subVectors(b,a),ac.subVectors(c,a)).normalize();
                for(let j=0;j<3;j++){const id=ids[j],k=(i+j)*8;vertices[k]=positions[id*3];vertices[k+1]=positions[id*3+1];vertices[k+2]=positions[id*3+2];vertices[k+3]=normal.x;vertices[k+4]=normal.y;vertices[k+5]=normal.z;vertices[k+6]=g.attributes.uv?.getX(id)||0;vertices[k+7]=g.attributes.uv?.getY(id)||0;}
            }part.start=offset/8;packed.set(vertices,offset);offset+=vertices.length;
        }
        slot.foot=foot*(1-key.flight);gl.bindBuffer(gl.ARRAY_BUFFER,slot.buffer);if(slot.at===-Infinity)gl.bufferData(gl.ARRAY_BUFFER,packed,gl.DYNAMIC_DRAW);else gl.bufferSubData(gl.ARRAY_BUFFER,0,packed);slot.at=elapsed;return slot;
    }
    return {draw(view,origin,elapsed,pose,variant={}){const slot=update(elapsed,pose);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,slot.buffer);attributes.forEach((location,i)=>{gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,i===2?2:3,gl.FLOAT,false,32,[0,12,24][i]);});gl.uniformMatrix4fv(uniforms.projection,false,view.projectionMatrix);gl.uniformMatrix4fv(uniforms.view,false,view.transform.inverse.matrix);gl.uniform3f(uniforms.origin,origin.x,origin.y,origin.z);gl.uniform1f(uniforms.scale,pose.size || .065);gl.uniform1f(uniforms.red,variant.red && !variant.colour?1:0);gl.uniform3fv(uniforms.tint,variant.tint || [1,1,1]);gl.uniform1f(uniforms.tinted,variant.colour?1:0);gl.uniform1f(uniforms.wingOpacity,variant.wingOpacity ?? 1);gl.uniform1f(uniforms.yaw,pose.yaw || 0);gl.uniform1f(uniforms.pitch,(pose.pitch || 0)*pose.flight);gl.uniform1f(uniforms.bank,pose.bank || 0);gl.uniform1f(uniforms.foot,slot.foot);gl.uniform1f(uniforms.opacity,pose.opacity);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(uniforms.wing,0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);
        for(const part of parts){gl.uniform1f(uniforms.mapped,part.mesh.material.map?1:0);gl.uniform3f(uniforms.colour,part.mesh.material.color.r,part.mesh.material.color.g,part.mesh.material.color.b);gl.drawArrays(gl.TRIANGLES,part.start,part.vertices.length/8);}gl.depthMask(true);gl.enable(gl.DEPTH_TEST);},destroy(){slots.forEach(slot=>gl.deleteBuffer(slot.buffer));slots.clear();gl.deleteTexture(texture);gl.deleteProgram(program);}};
}
export function mountDemoButterflyModel(canvas,{gl=null,red=false,colour=null,wingOpacity=1}={}){
    if(!canvas)return null;
    const renderer=gl?null:new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer?.setPixelRatio(1);if(renderer)renderer.outputColorSpace=THREE.SRGBColorSpace;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,15);camera.position.set(0,.08,2.7);camera.lookAt(0,0,0);
    scene.add(new THREE.HemisphereLight(0xfff3dc,0x405a56,2));const sun=new THREE.DirectionalLight(0xffedcc,2.1);sun.position.set(-2,3,4);scene.add(sun);
    let model=null,xr=null,flock=null,disposed=false,lastElapsed=NaN,lastPaint=-Infinity;
    const tint=colour?new THREE.Color(colour).convertLinearToSRGB().toArray():[1,1,1],variant={red,colour,wingOpacity,tint};
    prepareDemoButterflyModel().then(value=>{
        if(disposed)return;
        if(gl){
            flock=nativeFlocks.get(gl);
            if(!flock){const shared=buildButterfly(value);flock={model:shared,xr:butterflyXRRenderer(gl,shared),references:0};nativeFlocks.set(gl,flock);}
            flock.references++;model=flock.model;xr=flock.xr;
        }else{model=buildButterfly(value,red);scene.add(model.wrapper);
            if(colour)for(const material of model.materials){material.onBeforeCompile=shader=>{shader.uniforms.butterflyTint={value:new THREE.Color(colour)};shader.uniforms.butterflyWingOpacity={value:wingOpacity};shader.fragmentShader='uniform vec3 butterflyTint;uniform float butterflyWingOpacity;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n#ifdef USE_MAP\nif(diffuseColor.b>diffuseColor.r*1.15 && diffuseColor.b>diffuseColor.g*.82)diffuseColor.rgb=butterflyTint*max(diffuseColor.b,.35);diffuseColor.a*=butterflyWingOpacity;\n#endif');};material.customProgramCacheKey=()=> 'tinted-butterfly';}
        }
        canvas.dataset.modelReady='true';
    }).catch(error=>{if(!disposed){canvas.dataset.modelReady='error';console.warn('Butterfly model:',error);}});
    function updatePose(elapsed,pose){
        if(elapsed===lastElapsed)return;const delta=Number.isFinite(lastElapsed)?Math.min(.15,Math.max(0,(elapsed-lastElapsed)/1000)):0;lastElapsed=elapsed;
        model.idle.setEffectiveWeight(1-pose.flight);model.flying.setEffectiveWeight(pose.flight);model.mixer.update(delta);
        // Keep the feet still while the resting wings occasionally open.
        // The flight clip runs faster independently of this resting movement.
        const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        for(const [i,index] of model.hinges.entries())model.nodes[index].quaternion.copy(model.closed[i]).slerp(model.open[i],butterflyWingOpening(elapsed,pose,reduced));
        model.wrapper.rotation.set((pose.pitch || 0)*pose.flight,pose.yaw || 0,pose.bank);model.wrapper.updateMatrixWorld(true);
    }
    return {get ready(){return Boolean(model);},get interval(){return BUTTERFLY_RENDER_BUDGETS[currentGraphicsQuality()].interval;},
        renderSprite(elapsed,pose){
            if(!model || !pose || !renderer)return null;const budget=BUTTERFLY_RENDER_BUDGETS[currentGraphicsQuality()];if(canvas.dataset.insectState!==pose.state)canvas.dataset.insectState=pose.state;
            if(elapsed>=lastPaint && elapsed-lastPaint<(pose.flight>0?budget.interval:100))return canvas;
            renderer.setSize(budget.pixels,budget.pixels,false);
            updatePose(elapsed,pose);
            renderer.render(scene,camera);lastPaint=elapsed;return canvas;
        },drawXR(view,origin,elapsed,pose){if(!model || !xr || !pose)return;xr.draw(view,origin,elapsed,pose,variant);},destroy(){if(disposed)return;disposed=true;const release=!flock || --flock.references===0;if(release){xr?.destroy();if(flock)nativeFlocks.delete(gl);if(model){model.mixer.stopAllAction();model.mixer.uncacheRoot(model.wrapper.children[0].children[0]);model.geometries.forEach(geometry=>geometry.dispose());model.materials.forEach(material=>material.dispose());model.texture.dispose();}}renderer?.dispose();renderer?.forceContextLoss();}
    };
}
