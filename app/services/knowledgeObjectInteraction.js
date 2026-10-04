import * as THREE from '../vendor/three.module.min.js';
import {knowledgePoseMatrix,localObjectMatrix} from './knowledgeObjectModel.js';
import {handTrackingState} from './xrPointer.js';

// Object grabs and face presses have separate owners. An explicit Move action
// also works on devices that expose a trigger/pinch but no grip button.
export function bindKnowledgeObjectInteraction(session,space,{hit,near,canGrab=()=>true}={}){
    const abort=new AbortController(),suppressed=new WeakMap(),handPinches=new WeakMap();let active=null;const inputMatrices=new Map(),rayMatrices=new Map();
    const listen=(type,handler)=>session.addEventListener(type,handler,{capture:true,signal:abort.signal});
    function inputMatrix(source){return inputMatrices.get(source)?.clone() || null;}
    function targetFor(source){const m=rayMatrices.get(source);if(!m)return null;const inputRay={origin:new THREE.Vector3().setFromMatrixPosition(m),direction:new THREE.Vector3(0,0,-1).transformDirection(m)};const target=hit(source,inputRay);if(target)target.inputRay=inputRay;return target;}
    function begin(source,target,matrix,kind){
        if(active || !target || !matrix || !canGrab({...target,source}))return false;
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
            if(active && active.target.record.knowledgeExplorer.mode!=='explore')finish(active.source);
            for(const source of session.inputSources || []){
                const grip=value.getPose(source.gripSpace || source.targetRaySpace,space),rayPose=value.getPose(source.targetRaySpace,space);
                const handState=source.hand?handTrackingState(value,source,space):null,wrist=handState?.joints.get('wrist'),index=handState?.joints.get('index-finger-tip'),thumb=handState?.joints.get('thumb-tip');
                if(handState?.tracked && wrist && index && thumb)inputMatrices.set(source,new THREE.Matrix4().compose(new THREE.Vector3((index.x+thumb.x)/2,(index.y+thumb.y)/2,(index.z+thumb.z)/2),wrist.rotation,new THREE.Vector3(1,1,1)));
                else if(!source.hand && grip)inputMatrices.set(source,new THREE.Matrix4().fromArray(grip.transform.matrix));else inputMatrices.delete(source);
                if(rayPose)rayMatrices.set(source,new THREE.Matrix4().fromArray(rayPose.transform.matrix));else rayMatrices.delete(source);
                if(!source.hand)continue;
                if(!handState?.tracked){if(active?.source===source)finish(source);handPinches.delete(source);continue;}
                const pinch=handState.pinch,wasPinching=handPinches.get(source);handPinches.set(source,pinch);
                if(active?.source===source){if(!pinch)finish(source);}
                else if(pinch && wasPinching===false && performance.now()>=(suppressed.get(source)||0)){
                    const contactPoint={x:(index.x+thumb.x)/2,y:(index.y+thumb.y)/2,z:(index.z+thumb.z)/2},target=near(contactPoint);
                    if(target)target.contactPoint=contactPoint;
                    if(target)begin(source,target,inputMatrix(source),'hand');
                }
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
