import * as THREE from '../vendor/three.module.min.js';
import {createKnowledgeSDKGrip} from './knowledgeSDKGrip.js';
import {xrInputRuntime} from './xrInputRuntime.js';
import {handTrackingState} from './xrPointer.js';

// Preserve the Note renderer's precise card hit and manual rotation/depth
// controls. SDK owns controller grips and near-hand pinches.
export function createNoteSDKGrip(session,space){
    let grip=null,source=null,ended=false;
    const abort=new AbortController();
    const reset=()=>{grip?.reset();source=null;};
    session.addEventListener('visibilitychange',()=>{if(session.visibilityState!=='visible')reset();},{signal:abort.signal});
    session.addEventListener('inputsourceschange',event=>{if([...event.removed].includes(source))reset();},{signal:abort.signal});
    session.addEventListener('end',()=>{ended=true;reset();grip?.dispose();},{signal:abort.signal});
    function sample(frame,input){
        if(ended || session.visibilityState!=='visible' || ![...session.inputSources].includes(input))return null;
        try{
            if(input.hand){
                const state=handTrackingState(frame,input,space),wrist=state?.rawJoints.get('wrist'),index=state?.rawJoints.get('index-finger-tip'),thumb=state?.rawJoints.get('thumb-tip');
                if(!state?.tracked || !state.pinch || !wrist || !index || !thumb)return null;
                const matrix=new THREE.Matrix4().fromArray(wrist.matrix);matrix.setPosition(new THREE.Vector3((index.x+thumb.x)/2,(index.y+thumb.y)/2,(index.z+thumb.z)/2));
                return {matrix,ray:null};
            }
            const hand=frame?.getPose(input.gripSpace || input.targetRaySpace,space),ray=frame?.getPose(input.targetRaySpace,space);
            return hand && ray?{matrix:new THREE.Matrix4().fromArray(hand.transform.matrix),ray:new THREE.Matrix4().fromArray(ray.transform.matrix)}:null;
        }catch{return null;}
    }
    return {
        begin(surface,input,frame){
            if(ended)return false;
            const runtime=xrInputRuntime(session);
            if(!runtime?.createDemoInteractions)return null;
            const state=sample(frame,input);if(!state)return false;
            grip ||= createKnowledgeSDKGrip(runtime,{scope:'note'});
            if(source)return false;
            const normal=new THREE.Vector3().crossVectors(surface.right,surface.up),world=new THREE.Matrix4().makeBasis(new THREE.Vector3().copy(surface.right),new THREE.Vector3().copy(surface.up),normal).setPosition(new THREE.Vector3().copy(surface.center));
            const acquired=grip.begin(input,{id:surface.card.id,halfSize:{x:surface.width/2,y:surface.height/2,z:.015}},world,state.matrix,state.ray);
            if(acquired)source=input;return acquired;
        },
        update(frame){const state=source && sample(frame,source);if(!state){reset();return null;}const world=grip.update(state.matrix,state.ray,.016);if(!world)reset();return world;},
        reset,
        get active(){return Boolean(source);},
        dispose(){ended=true;reset();grip?.dispose();abort.abort();}
    };
}
