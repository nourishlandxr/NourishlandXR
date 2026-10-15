import * as THREE from '../vendor/three.module.min.js';
import {createKnowledgeSDKGrip} from './knowledgeSDKGrip.js';
import {xrInputRuntime} from './xrInputRuntime.js';
import {handTrackingState} from './xrPointer.js';

// Keep native flight/perch behaviour; the shared SDK owns capture and motion.
export function createButterflySDKGrip(session,space,{onCancel=()=>{}}={}){
    const holds=new Map(),abort=new AbortController();let disposed=false;
    function release(insect,notify=false){const hold=holds.get(insect);if(!hold)return;holds.delete(insect);hold.owner.dispose();if(notify)onCancel(insect);}
    const cancelAll=()=>{for(const insect of [...holds.keys()])release(insect,true);};
    session.addEventListener('visibilitychange',()=>{if(session.visibilityState!=='visible')cancelAll();},{signal:abort.signal});
    session.addEventListener('inputsourceschange',event=>{for(const [insect,hold]of holds)if([...event.removed].includes(hold.source))release(insect,true);},{signal:abort.signal});
    session.addEventListener('end',()=>{disposed=true;cancelAll();abort.abort();},{signal:abort.signal});
    function sample(source,frame){
        if(disposed || session.visibilityState!=='visible' || ![...session.inputSources].includes(source))return null;
        try{
            if(source.hand){const state=handTrackingState(frame,source,space),wrist=state?.rawJoints.get('wrist'),index=state?.rawJoints.get('index-finger-tip'),thumb=state?.rawJoints.get('thumb-tip');
                if(!state?.tracked || !state.pinch || !wrist || !index || !thumb)return null;
                const matrix=new THREE.Matrix4().fromArray(wrist.matrix).setPosition(new THREE.Vector3((index.x+thumb.x)/2,(index.y+thumb.y)/2,(index.z+thumb.z)/2));return {matrix,ray:null};
            }
            const grip=frame?.getPose(source.gripSpace || source.targetRaySpace,space),ray=frame?.getPose(source.targetRaySpace,space);
            return grip && ray?{matrix:new THREE.Matrix4().fromArray(grip.transform.matrix),ray:new THREE.Matrix4().fromArray(ray.transform.matrix)}:null;
        }catch{return null;}
    }
    return {
        begin(insect,source,frame){
            if(disposed)return false;const runtime=xrInputRuntime(session);if(!runtime?.createDemoInteractions)return null;
            if(holds.has(insect) || [...holds.values()].some(hold=>hold.source===source))return false;
            const input=sample(source,frame);if(!input || !insect.position)return false;
            const owner=createKnowledgeSDKGrip(runtime,{scope:'butterfly'}),world=new THREE.Matrix4().setPosition(new THREE.Vector3().copy(insect.position));
            if(!owner.begin(source,{id:'butterfly-'+insect.seed,radius:.08},world,input.matrix,input.ray)){owner.dispose();return false;}
            holds.set(insect,{source,owner});return true;
        },
        update(insect,frame){const hold=holds.get(insect);if(!hold)return null;const input=sample(hold.source,frame),world=input?hold.owner.update(input.matrix,input.ray,.016):null;
            if(!world){release(insect,true);return null;}return {x:world.elements[12],y:world.elements[13],z:world.elements[14]};
        },
        release,
        owns:insect=>holds.has(insect),
        dispose(){if(disposed)return;disposed=true;cancelAll();abort.abort();}
    };
}
