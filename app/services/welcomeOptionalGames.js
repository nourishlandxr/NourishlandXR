import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {prepareWelcomeDragonfly} from './welcomeDragonflyModel.js';
import {createWelcomeFlightLesson} from './welcomeFlightLesson.js';
import {createWelcomePlantPractice} from './welcomePlantPractice.js';
import {createWelcomePracticeProps} from './welcomePracticeProps.js';
import {createPracticeBody,resetPracticeBody,stepPracticeBodies} from './welcomePracticePhysics.js';

// Built only after choosing a game. These bodies never share guided progress.
export function createWelcomeOptionalGame(id,root,{onAssets=()=>{},onFeedback=()=>{}}={}){
    let disposed=false,asset='loading';
    const bodies=[],objects=new Map();
    let dragon,flight,garden,props,manualPosition=null;
    if(id==='dragonfly'){
        dragon={group:new THREE.Group(),wings:[]};root.add(dragon.group);
        const landing=new THREE.Mesh(new THREE.TorusGeometry(.07,.003,6,32),new THREE.MeshBasicMaterial({color:'#c4d9ab',transparent:true,opacity:.3}));
        landing.rotation.x=-Math.PI/2;landing.position.set(-.43,.005,-.20);root.add(landing);
        flight=createWelcomeFlightLesson(root,dragon,landing,{onFeedback});
        new GLTFLoader().loadAsync(new URL('../assets/welcome-practice/dragonfly.glb',import.meta.url).href).then(gltf=>{
            if(disposed){disposeModel(gltf.scene);return;}
            const prepared=prepareWelcomeDragonfly(gltf.scene);dragon.group.add(prepared.model);dragon.wings=prepared.wings;asset='ready';onAssets();
        }).catch(error=>{if(!disposed){asset='error';console.warn('Optional dragonfly:',error.message);onAssets();}});
    }else if(id==='strawberry'){
        garden=createWelcomePlantPractice(root,{onAssets});bodies.push(...garden.bodies);for(const [key,mesh] of garden.objects)objects.set(key,mesh);
        props=createWelcomePracticeProps(root,[]);props.addHarvest(garden.harvestBodies);
    }
    function phase(){return !garden.opened?'packet':!garden.planted?'seed':!garden.watered?'water':!garden.grown?'grow':'harvest';}
    function sync(){for(const body of bodies){const mesh=objects.get(body.id);mesh.position.set(body.position.x,body.position.y,body.position.z);mesh.quaternion.set(body.rotation.x,body.rotation.y,body.rotation.z,body.rotation.w);mesh.visible=body.visible;}}
    function reset(){
        for(const body of bodies){resetPracticeBody(body);body.held=false;body.anchored=false;body.basketed=false;}
        manualPosition=null;flight?.reset();garden?.reset({station:true});props?.reset();
        if(garden)bodies.find(body=>body.id==='strawberry-pot').anchored=true;
        update(0,[],[]);
    }
    function targets(){
        const available=bodies.filter(b=>b.visible && b.id!=='strawberry-pot' && b.id!=='pot-spray');
        return [...available.map(body=>({id:body.id,body,mesh:objects.get(body.id),radius:body.radius})),...(dragon && asset==='ready'?[{id:'dragonfly',mesh:dragon.group,radius:.10,manual:true}]:[])];
    }
    function picked(target){if(target.body){target.body.held=true;target.body.anchored=false;props?.remove(target.body);garden?.picked(target.body);Object.assign(target.body.velocity,{x:0,y:0,z:0});}}
    function moved(target,position,quaternion){
        if(target.manual){manualPosition=position.clone();return;}
        if(!target.body)return;
        Object.assign(target.body.position,{x:position.x,y:position.y,z:position.z});Object.assign(target.body.rotation,{x:quaternion.x,y:quaternion.y,z:quaternion.z,w:quaternion.w});
    }
    function released(target,apply=true,source){
        if(target.manual){manualPosition=null;return;}
        if(!target.body)return;const body=target.body;body.held=false;
        if(apply && garden?.plant(body)){onFeedback('plant',source);}
        if(apply && body.id.startsWith('strawberry-') && props?.place(body))onFeedback('collect',source);
    }
    function act(input,held,previous,inputs,inverse){
        if(!garden || garden.opened)return;
        const otherPinch=inputs.some(other=>other.source!==input.source && other.trigger && new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(other.matrix).premultiply(inverse)).distanceTo(garden.sealPoint())<.1);
        if(held?.target.id==='seed-packet' && (input.trigger && !previous.trigger || otherPinch)){if(garden.openPacket())onFeedback('open',input.source);}
    }
    function update(dt,inputs,holds,controllerTool='standard'){
        if(flight){
            const input=controllerTool==='insect'?inputs.find(i=>!i.uiBlocked && !i.source.hand && i.source.handedness==='right'):null;
            const hand=holds.find(([,h])=>h.target.manual)?.[0];
            const pilot=manualPosition?{source:hand,position:manualPosition}:input?{...input,reverse:Boolean(input.down)}:null;
            flight.update(dt,'fly',pilot);
            dragon.group.visible=asset==='ready';
        }
        if(garden){
            garden.update(dt,phase());
            // Spray is a brush option; never add its old bottle to this activity.
            bodies.find(b=>b.id==='pot-spray').visible=false;
            props.update('harvest',null,dt);props.remote.visible=false;props.plate.visible=false;
        }
        stepPracticeBodies(bodies,dt);sync();
    }
    function hints(){
        if(flight)return asset==='loading'?['Loading the dragonfly…']:asset==='error'?['Dragonfly model could not load. Reload to retry.']:[flight.cue,'Wrist → Change controllers → Insect flight. Lift to rise; lower to descend; turn wrist to steer. Trigger: forward · Grip: back · Stick: fine tune.','With hands, hold and guide the dragonfly through rings.'];
        const instruction={packet:'Hold the packet; trigger or pinch its seal to open.',seed:'Pick up the tiny seed and release it onto the soil.',water:'Hold the watering can by its handle and tilt over the pot.',grow:'Watch the strawberry plant grow and ripen.',harvest:'Pick the ripe strawberries and put them in the basket.'};
        return [instruction[phase()],phase()==='grow'?`Growth ${Math.round(garden.snapshot().growth*100)}%`:`Collected ${props.snapshot().harvestCount} of 3 strawberries.`];
    }
    reset();
    return {targets,picked,moved,released,act,update,reset,hints,snapshot:()=>flight?{...flight.snapshot(),asset}: {...garden.snapshot(),phase:phase(),collected:props.snapshot().harvestCount},destroy(){disposed=true;garden?.destroy();}};
}
function disposeModel(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [node.material].flat().filter(Boolean)){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.image?.close?.();t.dispose();});}
