import * as THREE from '../vendor/three.module.min.js';
import { BEE_COUNT, demoBeePose } from './demoAmbientLife.js';
import {currentGraphicsQuality} from './spatialVisualSettings.js';

export const BEE_ANIMATION_SPEED=1.35;
export const BEE_SPRITE_INTERVAL_MS=1000/60;

// Bee by etro313 (Sketchfab), CC BY 4.0. Source and licence are also stored in the GLB asset metadata.
const BEE_URL=new URL('../assets/bee.glb',import.meta.url);
const COMPONENTS={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
const ARRAY_TYPES={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};

export function parseGlb(buffer){
    const view=new DataView(buffer);
    if(view.getUint32(0,true)!==0x46546c67 || view.getUint32(4,true)!==2 || view.getUint32(8,true)!==buffer.byteLength)throw Error('Invalid insect GLB');
    let offset=12,json=null,binary=null;
    while(offset<buffer.byteLength){
        const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true);offset+=8;
        if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset,length)));
        if(type===0x004e4942)binary=buffer.slice(offset,offset+length);
        offset+=length;
    }
    if(!json || !binary)throw Error('Insect GLB is missing geometry');
    return {json,binary};
}

export function accessorData(gltf,index){
    const accessor=gltf.json.accessors[index],view=gltf.json.bufferViews[accessor.bufferView],Type=ARRAY_TYPES[accessor.componentType];
    if(!Type || accessor.sparse)throw Error('Unsupported insect geometry accessor');
    const count=accessor.count,components=COMPONENTS[accessor.type],length=count*components;
    const source=new DataView(gltf.binary,(view.byteOffset||0)+(accessor.byteOffset||0));
    const stride=view.byteStride || components*Type.BYTES_PER_ELEMENT;
    const data=new Type(length);
    for(let item=0;item<count;item++)for(let component=0;component<components;component++){
        const offset=item*stride+component*Type.BYTES_PER_ELEMENT;
        data[item*components+component]=Type===Float32Array?source.getFloat32(offset,true):Type===Uint32Array?source.getUint32(offset,true):Type===Uint16Array?source.getUint16(offset,true):source.getUint8(offset);
    }
    return {data,components};
}

async function beeResources(gltf){
    const primitive=gltf.json.meshes[0]?.primitives[0];
    if(primitive?.attributes?.POSITION===undefined || !gltf.json.skins?.length)throw Error('Bee GLB has no skinned mesh');
    const geometry=new THREE.BufferGeometry();
    for(const [semantic,name] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',JOINTS_0:'skinIndex',WEIGHTS_0:'skinWeight'})){
        const index=primitive.attributes[semantic];if(index===undefined)continue;
        const {data,components}=accessorData(gltf,index);geometry.setAttribute(name,new THREE.BufferAttribute(data,components));
    }
    geometry.setIndex(new THREE.BufferAttribute(accessorData(gltf,primitive.indices).data,1));
    geometry.computeBoundingSphere();
    const materialData=gltf.json.materials[primitive.material];
    const diffuseIndex=materialData?.extensions?.KHR_materials_pbrSpecularGlossiness?.diffuseTexture?.index;
    const imageIndex=gltf.json.textures[diffuseIndex]?.source;
    const imageData=gltf.json.images[imageIndex];
    const imageView=gltf.json.bufferViews[imageData?.bufferView];
    if(!imageView)throw Error('Bee GLB is missing its colour texture');
    const blob=new Blob([gltf.binary.slice(imageView.byteOffset,imageView.byteOffset+imageView.byteLength)],{type:imageData.mimeType});
    const bitmap=await createImageBitmap(blob);
    const texture=new THREE.Texture(bitmap);texture.needsUpdate=true;texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshStandardMaterial({map:texture,roughness:.86,metalness:0,side:THREE.DoubleSide,transparent:true});
    return {geometry,texture,material,bitmap};
}

function makeBee(gltf,resources){
    const skin=gltf.json.skins[0],joints=new Set(skin.joints);
    const nodes=gltf.json.nodes.map((node,index)=>{
        const object=joints.has(index)?new THREE.Bone():new THREE.Group();object.name='bee-node-'+index;
        if(node.matrix){object.matrix.fromArray(node.matrix);object.matrix.decompose(object.position,object.quaternion,object.scale);}
        else{if(node.translation)object.position.fromArray(node.translation);if(node.rotation)object.quaternion.fromArray(node.rotation);if(node.scale)object.scale.fromArray(node.scale);}
        return object;
    });
    gltf.json.nodes.forEach((node,index)=>node.children?.forEach(child=>nodes[index].add(nodes[child])));
    const root=nodes[gltf.json.scenes[gltf.json.scene||0].nodes[0]];
    const meshNode=gltf.json.nodes.findIndex(node=>node.mesh!==undefined);
    const mesh=new THREE.SkinnedMesh(resources.geometry,resources.material);
    mesh.name=nodes[meshNode].name;mesh.frustumCulled=false;
    nodes[meshNode].add(mesh);
    root.updateMatrixWorld(true);
    const inverse=accessorData(gltf,skin.inverseBindMatrices).data;
    const boneInverses=skin.joints.map((_,index)=>new THREE.Matrix4().fromArray(inverse,index*16));
    mesh.bind(new THREE.Skeleton(skin.joints.map(index=>nodes[index]),boneInverses));
    const centered=new THREE.Group();centered.add(root);
    const bounds=new THREE.Box3().setFromObject(centered),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
    centered.position.copy(center).multiplyScalar(-1);
    const wrapper=new THREE.Group();wrapper.add(centered);wrapper.scale.setScalar(1/Math.max(size.x,size.y,size.z));
    const animation=gltf.json.animations.find(item=>item.name==='hover') || gltf.json.animations[0];
    const tracks=[];
    animation.channels.forEach(channel=>{
        const sampler=animation.samplers[channel.sampler],path=channel.target.path;
        const times=accessorData(gltf,sampler.input).data,values=accessorData(gltf,sampler.output).data;
        const name='bee-node-'+channel.target.node+'.'+({translation:'position',rotation:'quaternion',scale:'scale'}[path]||path);
        tracks.push(path==='rotation'?new THREE.QuaternionKeyframeTrack(name,times,values):new THREE.VectorKeyframeTrack(name,times,values));
    });
    const mixer=new THREE.AnimationMixer(root);mixer.clipAction(new THREE.AnimationClip('hover',-1,tracks)).setEffectiveTimeScale(BEE_ANIMATION_SPEED).play();
    return {wrapper,mixer,root,mesh,baseScale:wrapper.scale.x};
}

let preparedModel=null;
export function prepareDemoBeeModel(){
 if(!preparedModel)preparedModel=fetch(BEE_URL,{signal:AbortSignal.timeout(30000)}).then(response=>{if(!response.ok)throw Error('Bee model could not be loaded');return response.arrayBuffer();}).then(parseGlb).catch(error=>{preparedModel=null;throw error;});
 return preparedModel;
}

export function mountDemoBeeModel(canvas,{sprite=false}={}){
    if(!canvas)return null;
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:sprite,powerPreference:'low-power'});
    renderer.setPixelRatio(sprite?1:Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,30);
    camera.position.z=6;
    scene.add(new THREE.HemisphereLight(0xfff7db,0x566c67,2.2));
    const sun=new THREE.DirectionalLight(0xffe2aa,2.4);sun.position.set(-3,5,6);scene.add(sun);
    const fill=new THREE.DirectionalLight(0xc9eaff,1.1);fill.position.set(4,-1,-2);scene.add(fill);
    let bees=[],bee=null,resources=null,lastElapsed=NaN,lastSpritePaint=-Infinity,disposed=false,ready=false;
    prepareDemoBeeModel().then(async gltf=>{
        const loaded=await beeResources(gltf);if(disposed){loaded.geometry.dispose();loaded.texture.dispose();loaded.material.dispose();loaded.bitmap.close();return;}
        resources=loaded;bees=Array.from({length:sprite?1:BEE_COUNT},()=>makeBee(gltf,loaded));bee=bees[0];bees.forEach(item=>scene.add(item.wrapper));ready=true;canvas.dataset.modelReady='true';
    }).catch(error=>{if(!disposed){console.warn('Bee model fallback:',error);canvas.dataset.modelReady='error';}});
    return {
        get ready(){return ready;},
        renderSprite(elapsed,startedAt){
            if(!sprite || !ready || !Number.isFinite(startedAt))return null;
            if(elapsed>=lastSpritePaint && elapsed-lastSpritePaint<BEE_SPRITE_INTERVAL_MS)return canvas;
            const pixels=currentGraphicsQuality()==='high'?512:currentGraphicsQuality()==='low'?256:384;
            if(canvas.width!==pixels || canvas.height!==pixels)renderer.setSize(pixels,pixels,false);
            bee.wrapper.position.set(0,0,0);
            bee.wrapper.scale.setScalar(bee.baseScale*2.1);
            bee.wrapper.rotation.y=.08;
            bee.wrapper.rotation.z=0;
            bee.mixer.update(Number.isFinite(lastElapsed)?Math.max(0,Math.min(.15,(elapsed-lastElapsed)/1000)):0);
            lastElapsed=elapsed;
            bee.wrapper.updateMatrixWorld(true);
            // Fixed generous framing prevents camera pumping. No CPU reskinning
            // of the 29,653-vertex bee just to measure its bounds on every paint.
            lastSpritePaint=elapsed;
            renderer.render(scene,camera);
            return canvas;
        },
        draw(elapsed,startedAt,reducedMotion=false,{attention='screen',encounterSeed=0}={}){
            if(!ready || !Number.isFinite(startedAt)){canvas.style.visibility='hidden';return;}
            const delta=Number.isFinite(lastElapsed)?Math.max(0,Math.min(.15,(elapsed-lastElapsed)/1000)):0;
            let nearestDepth=-1,anyFlyby=false;
            for(const [index,item] of bees.entries()){
            const bee=item,pose=demoBeePose(elapsed,startedAt,index,{attention,encounters:!reducedMotion,encounterSeed});if(!pose){bee.wrapper.visible=false;continue;}bee.wrapper.visible=true;
            const width=window.innerWidth,height=window.innerHeight;if(!width||!height)return;
            if(canvas.width!==Math.round(width*renderer.getPixelRatio()) || canvas.height!==Math.round(height*renderer.getPixelRatio())){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
            canvas.style.visibility='visible';nearestDepth=Math.max(nearestDepth,pose.depth);anyFlyby ||= pose.flyby>.08;
            const distance=6.5-pose.depth*1.3-pose.flyby*.75;
            const visibleHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*distance;
            bee.wrapper.position.set((pose.x-.5)*visibleHeight*camera.aspect,(.5-pose.y)*visibleHeight,6-distance);
            bee.wrapper.scale.setScalar(bee.baseScale*(.52+pose.depth*.16)*(1+pose.flyby*.28)*Math.min(1.35,Math.max(.7,width/1000)));
            bee.wrapper.rotation.y=pose.heading;bee.wrapper.rotation.z=Math.sin(elapsed*.0009)*.13;
            bee.mixer.update(delta);}
            lastElapsed=elapsed;canvas.classList.toggle('is-behind',nearestDepth<0);canvas.classList.toggle('is-flyby',anyFlyby);
            renderer.render(scene,camera);
        },
        destroy(){disposed=true;ready=false;canvas.classList.remove('is-behind','is-flyby');resources?.geometry.dispose();resources?.texture.dispose();resources?.material.dispose();resources?.bitmap.close();renderer.dispose();renderer.forceContextLoss();}
    };
}
