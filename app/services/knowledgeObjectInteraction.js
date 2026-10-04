import * as THREE from '../vendor/three.module.min.js';
import {knowledgePoseMatrix,localObjectMatrix} from './knowledgeObjectModel.js';

// Object grabs and face presses have separate owners. An explicit Move action
// also works on devices that expose a trigger/pinch but no grip button.
export function bindKnowledgeObjectInteraction(session,space,{hit,near,canGrab=()=>true}={}){
    const abort=new AbortController(),suppressed=new WeakMap();let active=null;const inputMatrices=new Map(),rayMatrices=new Map();
    const listen=(type,handler)=>session.addEventListener(type,handler,{capture:true,signal:abort.signal});
    function inputMatrix(source){return inputMatrices.get(source)?.clone() || null;}
    function targetFor(source){const m=rayMatrices.get(source);if(!m)return hit(source),inputRay={origin:new THREE.Vector3().setFromMatrixPosition(m),direction:new THREE.Vector3(0,0,-1).transformDirection(m)};const target=hit(source,inputRay);if(target)target.inputRay=inputRay;return target;}
    function begin(source,target,matrix,kind){
        if(active || !target || !matrix || !canGrab(target))return false;
        const basis=knowledgePoseMatrix(target.pose),world=basis.clone().multiply(localObjectMatrix(target.object));
        active={source,target,kind,offset:matrix.clone().invert().multiply(world)};target.record.knowledgeExplorer.objects.selectedObjectId=target.object.id;return true;
    }
    function finish(source){if(!active || active.source!==source)return false;suppressed.set(source,performance.now()+450);active=null;return true;}
    listen('squeezestart',event=>{const target=targetFor(event.inputSource);if(begin(event.inputSource,target,inputMatrix(event.inputSource),'grip')){event.stopImmediatePropagation();event.preventDefault();}});
    listen('squeezeend',event=>{if(finish(event.inputSource))event.stopImmediatePropagation();});
    listen('selectstart',event=>{const target=targetFor(event.inputSource);if(target?.record.knowledgeExplorer.objects?.interaction==='move' && begin(event.inputSource,target,inputMatrix(event.inputSource),'select')){event.stopImmediatePropagation();event.preventDefault();}});
    listen('selectend',event=>{if(active?.kind==='select' && finish(event.inputSource))event.stopImmediatePropagation();});
    listen('select',event=>{if(active?.source===event.inputSource || performance.now()<(suppressed.get(event.inputSource)||0)){event.stopImmediatePropagation();event.preventDefault();}});
    listen('inputsourceschange',event=>{if([...event.removed].includes(active?.source))finish(active.source);for(const source of event.removed){inputMatrices.delete(source);rayMatrices.delete(source);}});
    listen('end',()=>{active=null;inputMatrices.clear();rayMatrices.clear();});
    return {
        update(value){
            for(const source of session.inputSources || []){
                const grip=value.getPose(source.gripSpace || source.targetRaySpace,space),rayPose=value.getPose(source.targetRaySpace,space);
                const wrist=source.hand?.get('wrist'),handPose=wrist?value.getJointPose(wrist,space):null;
                if(handPose || grip)inputMatrices.set(source,new THREE.Matrix4().fromArray((handPose || grip).transform.matrix));else inputMatrices.delete(source);
                if(rayPose)rayMatrices.set(source,new THREE.Matrix4().fromArray(rayPose.transform.matrix));else rayMatrices.delete(source);
                if(!source.hand)continue;
                const index=value.getJointPose(source.hand.get('index-finger-tip'),space),thumb=value.getJointPose(source.hand.get('thumb-tip'),space);
                if(!index || !thumb){if(active?.source===source)finish(source);continue;}
                const a=index.transform.position,b=thumb.transform.position,distance=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),pinch=distance<.022;
                // Hysteresis prevents a held pinch from chattering at its boundary.
                if(active?.source===source){if(distance>.038)finish(source);}
                else if(pinch){const target=near(a);if(target?.record.knowledgeExplorer.objects?.interaction==='move')begin(source,target,inputMatrix(source),'hand');}
            }
            if(!active)return;
            const matrix=inputMatrix(active.source);if(!matrix){finish(active.source);return;}
            const {record,object,pose}=active.target,world=matrix.multiply(active.offset),local=knowledgePoseMatrix(pose).invert().multiply(world),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();local.decompose(position,rotation,scale);
            object.position={x:position.x,y:position.y,z:position.z};object.rotation={x:rotation.x,y:rotation.y,z:rotation.z,w:rotation.w};object.userPositioned=true;record.knowledgeExplorer.saved=false;
        },
        get active(){return active;},
        destroy(){abort.abort();active=null;inputMatrices.clear();rayMatrices.clear();}
    };
}
