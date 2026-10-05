import * as THREE from '../vendor/three.module.min.js';
import {knowledgePoseMatrix,localObjectMatrix,visibleKnowledgeObjects} from './knowledgeObjectModel.js';
import {handTrackingState} from './xrPointer.js';

// Object grabs and face presses have separate owners. An explicit Move action
// also works on devices that expose a trigger/pinch but no grip button.
export function bindKnowledgeObjectInteraction(session,space,{hit,near,canGrab=()=>true,onActivate=()=>{}}={}){
    const abort=new AbortController(),suppressed=new WeakMap(),handPinches=new WeakMap(),holds=new Map();let active=null;const inputMatrices=new Map(),rayMatrices=new Map();
    const faceKey=t=>t?.object?.id+'|'+(t?.face?.faceId || 'context');
    function cancelHold(source){const held=holds.get(source);if(held){held.target.record.pimObjectPressProgress=0;holds.delete(source);}}
    const listen=(type,handler)=>session.addEventListener(type,handler,{capture:true,signal:abort.signal});
    function inputMatrix(source){return inputMatrices.get(source)?.clone() || null;}
    function targetFor(source){const m=rayMatrices.get(source);if(!m)return null;const inputRay={origin:new THREE.Vector3().setFromMatrixPosition(m),direction:new THREE.Vector3(0,0,-1).transformDirection(m)};const target=hit(source,inputRay);if(target)target.inputRay=inputRay;return target;}
    function begin(source,target,matrix,kind){
        if(active || !target || !matrix || !canGrab({...target,source}))return false;
        const basis=knowledgePoseMatrix(target.pose),world=basis.clone().multiply(localObjectMatrix(target.object));
        cancelHold(source);active={source,target,kind,offset:matrix.clone().invert().multiply(world)};target.record.knowledgeExplorer.objects.selectedObjectId=target.object.id;return true;
    }
    function finish(source){if(!active || active.source!==source)return false;suppressed.set(source,performance.now()+450);active=null;return true;}
    listen('squeezestart',event=>{const target=targetFor(event.inputSource);if(begin(event.inputSource,target,inputMatrix(event.inputSource),'grip')){event.stopImmediatePropagation();event.preventDefault();}});
    listen('squeezeend',event=>{if(finish(event.inputSource))event.stopImmediatePropagation();});
    listen('selectstart',event=>{const source=event.inputSource,target=targetFor(source);if(!target || !canGrab({...target,source}))return;
        if(target.record.knowledgeExplorer.objects?.interaction==='move' && begin(source,target,inputMatrix(source),'select') || !source.hand){
            if(!active || active.source!==source){cancelHold(source);holds.set(source,{target,key:faceKey(target),start:performance.now(),done:false});}
            event.stopImmediatePropagation();event.preventDefault();
        }});
    listen('selectend',event=>{if(holds.has(event.inputSource)){cancelHold(event.inputSource);suppressed.set(event.inputSource,performance.now()+450);event.stopImmediatePropagation();}else if(active?.kind==='select' && finish(event.inputSource))event.stopImmediatePropagation();});
    listen('select',event=>{if(holds.has(event.inputSource) || active?.source===event.inputSource || performance.now()<(suppressed.get(event.inputSource)||0)){event.stopImmediatePropagation();event.preventDefault();}});
    listen('inputsourceschange',event=>{if([...event.removed].includes(active?.source))finish(active.source);for(const source of event.removed){cancelHold(source);inputMatrices.delete(source);rayMatrices.delete(source);}});
    listen('visibilitychange',()=>{if(session.visibilityState!=='visible'){for(const source of holds.keys())cancelHold(source);if(active)finish(active.source);}});
    listen('end',()=>{for(const source of holds.keys())cancelHold(source);active=null;inputMatrices.clear();rayMatrices.clear();});
    return {
        update(value){
            if(active && (active.target.record.knowledgeExplorer.mode!=='explore' || !visibleKnowledgeObjects(active.target.record.knowledgeExplorer.objects).includes(active.target.object)))finish(active.source);
            for(const source of session.inputSources || []){
                let grip=null,rayPose=null;try{grip=value.getPose(source.gripSpace || source.targetRaySpace,space);rayPose=value.getPose(source.targetRaySpace,space);}catch{/* Lost input cancels its gesture. */}
                const handState=source.hand?handTrackingState(value,source,space):null,wrist=handState?.rawJoints.get('wrist'),index=handState?.rawJoints.get('index-finger-tip'),thumb=handState?.rawJoints.get('thumb-tip');
                if(handState?.tracked && wrist && index && thumb)inputMatrices.set(source,new THREE.Matrix4().compose(new THREE.Vector3((index.x+thumb.x)/2,(index.y+thumb.y)/2,(index.z+thumb.z)/2),new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(wrist.matrix)),new THREE.Vector3(1,1,1)));
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
            for(const [source,held] of holds){const target=targetFor(source);if(!target || target.record!==held.target.record || faceKey(target)!==held.key || target.record.knowledgeExplorer.mode!=='explore' || !canGrab({...target,source})){cancelHold(source);continue;}if(held.done)continue;
                const amount=Math.min(1,(performance.now()-held.start)/500);target.record.pimObjectPressId=held.key;target.record.pimObjectPressProgress=amount;
                if(amount===1){held.done=true;target.record.pimObjectPressProgress=0;onActivate({...target,inputSource:source,intentionalHold:true});}
            }
            if(!active)return;
            const matrix=inputMatrix(active.source);if(!matrix){finish(active.source);return;}
            const {record,object,pose}=active.target,world=matrix.multiply(active.offset),basis=knowledgePoseMatrix(pose),worldPosition=new THREE.Vector3().setFromMatrixPosition(world);
            if(Number.isFinite(record.knowledgeFloor))worldPosition.y=Math.max(worldPosition.y,record.knowledgeFloor+object.radius*object.scale+.01);world.setPosition(worldPosition);
            const local=basis.invert().multiply(world),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();local.decompose(position,rotation,scale);
            object.position={x:position.x,y:position.y,z:position.z};object.rotation={x:rotation.x,y:rotation.y,z:rotation.z,w:rotation.w};object.userPositioned=true;record.knowledgeExplorer.saved=false;
        },
        get active(){return active;},
        destroy(){abort.abort();for(const source of holds.keys())cancelHold(source);active=null;inputMatrices.clear();rayMatrices.clear();}
    };
}
