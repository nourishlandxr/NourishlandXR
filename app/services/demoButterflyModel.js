import * as THREE from '../vendor/three.module.min.js';
import {parseGlb,accessorData} from './demoBeeModel.js';
import {currentGraphicsQuality} from './spatialVisualSettings.js';
// Artistic_side, Animated Butterfly, CC BY 4.0. Full attribution accompanies
// the original, unchanged GLB. Geometry/materials are shared by all phases.
const URL=new globalThis.URL('../assets/animated_butterfly.glb',import.meta.url);
export const BUTTERFLY_RENDER_BUDGETS=Object.freeze({low:{pixels:192,interval:50},medium:{pixels:256,interval:42},high:{pixels:384,interval:33}});
let prepared=null;
export function prepareDemoButterflyModel(){
    if(!prepared)prepared=fetch(URL,{signal:AbortSignal.timeout(30000)}).then(response=>{if(!response.ok)throw Error('Butterfly could not be loaded');return response.arrayBuffer();}).then(parseGlb).then(async gltf=>{
        const image=gltf.json.images[0],view=gltf.json.bufferViews[image.bufferView];
        const bitmap=await createImageBitmap(new Blob([gltf.binary.slice(view.byteOffset||0,(view.byteOffset||0)+view.byteLength)],{type:image.mimeType}));
        return {gltf,bitmap};
    }).catch(error=>{prepared=null;throw error;});
    return prepared;
}
function buildButterfly({gltf,bitmap}){
    const texture=new THREE.Texture(bitmap);texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
    const materials=gltf.json.materials.map(data=>{const pbr=data.pbrMetallicRoughness || {},colour=pbr.baseColorFactor || [1,1,1,1];return new THREE.MeshStandardMaterial({map:pbr.baseColorTexture?texture:null,color:new THREE.Color().fromArray(colour),roughness:.72,metalness:0,side:THREE.DoubleSide,transparent:true,depthWrite:true});});
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
    idle.play();flying.play();flying.setEffectiveWeight(0);idle.setEffectiveTimeScale(.55);flying.setEffectiveTimeScale(1.1);
    const bounds=new THREE.Box3(),center=new THREE.Vector3(),size=new THREE.Vector3();
    // Find a genuinely folded Idle pose from the asset rather than guessing
    // bone axes. Only the four wing hinges are constrained while perched.
    const hinges=[52,55,58,61],closed=[];let narrowest=Infinity;
    for(let i=0;i<32;i++){
        mixer.setTime(i/32*idle.getClip().duration/.55);root.updateMatrixWorld(true);meshes.forEach(mesh=>{mesh.skeleton.update();mesh.computeBoundingBox();});bounds.setFromObject(root);bounds.getSize(size);
        if(size.x<narrowest){narrowest=size.x;closed.splice(0,closed.length,...hinges.map(index=>nodes[index].quaternion.clone()));}
    }
    mixer.setTime(0);idle.setEffectiveWeight(0);flying.setEffectiveWeight(1);mixer.update(.2);root.updateMatrixWorld(true);meshes.forEach(mesh=>{mesh.skeleton.update();mesh.computeBoundingBox();});bounds.setFromObject(root);bounds.getCenter(center);bounds.getSize(size);
    const centered=new THREE.Group();centered.add(root);root.position.sub(center);const wrapper=new THREE.Group();wrapper.add(centered);wrapper.scale.setScalar(1/Math.max(size.x,size.y,size.z));
    idle.setEffectiveWeight(1);flying.setEffectiveWeight(0);mixer.setTime(0);
    return {wrapper,mixer,idle,flying,nodes,hinges,closed,texture,materials,geometries};
}
export function mountDemoButterflyModel(canvas){
    if(!canvas)return null;
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,15);camera.position.set(0,.08,2.7);camera.lookAt(0,0,0);
    scene.add(new THREE.HemisphereLight(0xfff3dc,0x405a56,2));const sun=new THREE.DirectionalLight(0xffedcc,2.1);sun.position.set(-2,3,4);scene.add(sun);
    let model=null,disposed=false,lastElapsed=NaN,lastPaint=-Infinity;
    prepareDemoButterflyModel().then(value=>{if(disposed)return;model=buildButterfly(value);scene.add(model.wrapper);canvas.dataset.modelReady='true';}).catch(error=>{if(!disposed){canvas.dataset.modelReady='error';console.warn('Butterfly model:',error);}});
    return {get ready(){return Boolean(model);},get interval(){return BUTTERFLY_RENDER_BUDGETS[currentGraphicsQuality()].interval;},
        renderSprite(elapsed,pose){
            if(!model || !pose)return null;const budget=BUTTERFLY_RENDER_BUDGETS[currentGraphicsQuality()];if(canvas.dataset.insectState!==pose.state)canvas.dataset.insectState=pose.state;
            if(elapsed>=lastPaint && elapsed-lastPaint<budget.interval)return canvas;
            renderer.setSize(budget.pixels,budget.pixels,false);
            const delta=Number.isFinite(lastElapsed)?Math.min(.15,Math.max(0,(elapsed-lastElapsed)/1000)):0;lastElapsed=elapsed;
            model.idle.setEffectiveWeight(1-pose.flight);model.flying.setEffectiveWeight(pose.flight);model.mixer.update(delta);
            for(const [i,index] of model.hinges.entries())model.nodes[index].quaternion.slerp(model.closed[i],(1-pose.flight)*.96);
            model.wrapper.rotation.set(0,pose.state==='landed'?.85:pose.yaw,pose.bank);model.wrapper.updateMatrixWorld(true);
            renderer.render(scene,camera);lastPaint=elapsed;return canvas;
        },destroy(){disposed=true;if(model){model.mixer.stopAllAction();model.mixer.uncacheRoot(model.wrapper.children[0].children[0]);model.geometries.forEach(geometry=>geometry.dispose());model.materials.forEach(material=>material.dispose());model.texture.dispose();}renderer.dispose();renderer.forceContextLoss();}
    };
}
