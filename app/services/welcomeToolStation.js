import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {createPracticeBody} from './welcomePracticePhysics.js';
import {createBrushControllerV2} from './brushControllerV2.js';

// Table props use the same official Touch Plus controller model/profile as
// the hand renderer. Picking one switches the tracked hand to its tool skin;
// the physical table prop remains a separate rigid body that can be returned.
export function createWelcomeToolStation(root,{onFeedback=()=>{},onAssets=()=>{}}={}){
    const bodies=[],objects=new Map(),loader=new GLTFLoader(),tools=new Map();let disposed=false;
    for(const [id,tool,x] of [['paint-controller','paint',-.46],['rc-controller','insect',-.70]]){
        const body=createPracticeBody(id,{x,z:.10,radius:.072,halfSize:{x:.045,y:.022,z:.072},bounce:.12});
        body.visible=false;body.tool=tool;bodies.push(body);
        const object=new THREE.Group();object.name=tool==='paint'?'Meta Touch Plus paint controller table prop':'Meta Touch Plus RC bug controller table prop';
        object.visible=false;object.userData.welcomeAlwaysConvert=true;root.add(object);objects.set(id,object);
        const base=new URL('../assets/welcome-practice/controllers/meta-quest-touch-plus/right.glb',import.meta.url);
        const record={body,object,ready:false};tools.set(id,record);
        record.loading=loader.loadAsync(base.href).then(gltf=>{
            if(disposed){disposeTree(gltf.scene);return;}
            const model=gltf.scene;object.add(model);record.model=model;
            if(tool==='paint'){record.brush=createBrushControllerV2(model);object.add(record.brush.group);record.brush.update(true,'#86e7d0');}
            // Measure the native grip-space model, then lay it on the table.
            // Its physics body follows the complete pose when picked up.
            object.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3());
            body.halfSize={x:Math.max(.025,size.x*.55),y:Math.max(.016,size.y*.55),z:Math.max(.04,size.z*.55)};
            body.radius=Math.max(...Object.values(body.halfSize));body.support=body.halfSize.y;
            body.position.y=body.halfSize.y+.012;body.home={x:body.position.x,y:body.position.y,z:body.position.z};
            object.rotation.x=-Math.PI/2;
            const q=new THREE.Quaternion().setFromEuler(object.rotation);Object.assign(body.rotation,{x:q.x,y:q.y,z:q.z,w:q.w});
            body.initialRotation={x:q.x,y:q.y,z:q.z,w:q.w};
            object.position.set(body.position.x,body.position.y,body.position.z);object.quaternion.copy(q);record.ready=true;onAssets();
        }).catch(error=>{record.failed=true;console.warn('Welcome tool controller:',error.message);onAssets();});
    }
    function disposeTree(node){const geometries=new Set(),materials=new Set(),textures=new Set();node.traverse(child=>{if(child.geometry)geometries.add(child.geometry);for(const material of [child.material].flat().filter(Boolean)){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
    function update(_dt,_inputs,{phase=''}={}){for(const record of tools.values())record.body.visible=record.ready && (record.body.tool==='paint'?['brush','hands','explore'].includes(phase):['fly','explore'].includes(phase));}
    function sync(){for(const {body,object} of tools.values()){object.visible=body.visible;object.position.set(body.position.x,body.position.y,body.position.z);object.quaternion.set(body.rotation.x,body.rotation.y,body.rotation.z,body.rotation.w);}}
    return {bodies,objects,loading:Promise.all([...tools.values()].map(tool=>tool.loading)),update,sync,activate(body){return tools.has(body?.id)?body.tool:false;},snapshot:()=>Object.fromEntries([...tools].map(([id,{body,ready,failed}])=>[id,{ready,failed,visible:body.visible,position:{...body.position},physics:'shared-havok'}])),reset(){for(const {body} of tools.values()){body.visible=false;body.held=false;Object.assign(body.position,body.home);Object.assign(body.rotation,body.initialRotation || {x:0,y:0,z:0,w:1});Object.assign(body.velocity,{x:0,y:0,z:0});Object.assign(body.angular,{x:0,y:0,z:0});}},destroy(){disposed=true;for(const {object,brush} of tools.values()){brush?.destroy();object.removeFromParent();disposeTree(object);}tools.clear();objects.clear();}};
}
