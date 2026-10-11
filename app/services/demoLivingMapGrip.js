import * as THREE from '../vendor/three.module.min.js';
import {handTrackingState} from './xrPointer.js';
import {livingMapHandleContact,livingMapHandleRayHit,livingMapHandleAnchor} from './demoLivingMapHandles.js';

export const LIVING_MAP_MAX_TILT=Math.PI*25/180;
const vector=p=>new THREE.Vector3(p.x,p.y,p.z);
const quaternion=q=>new THREE.Quaternion(q?.x || 0,q?.y || 0,q?.z || 0,q?.w ?? 1);
const stickAxis=value=>{const v=Math.max(-1,Math.min(1,Number(value)||0)),amount=Math.max(0,(Math.abs(v)-.18)/.82);return Math.sign(v)*amount*(.25+.75*amount);};
export function limitLivingMapTilt(rotation){
    const q=quaternion(rotation).normalize();
    const twist=new THREE.Quaternion(0,q.y,0,q.w);
    if(twist.lengthSq()<1e-8)twist.identity();else twist.normalize();
    const swing=q.clone().multiply(twist.clone().invert());
    const angle=2*Math.acos(Math.min(1,Math.abs(swing.w)));
    if(angle>LIVING_MAP_MAX_TILT)swing.identity().slerp(q.clone().multiply(twist.clone().invert()),LIVING_MAP_MAX_TILT/angle);
    return swing.multiply(twist).normalize();
}
export function livingMapGripContact(point,origin,rotation){
    return livingMapHandleContact(point,origin,rotation);
}
export function createLivingMapGripInput({enabled,origin,rotation,onRotate,onMove=()=>{},canUse=()=>true,onGrab=()=>{},responseMs=0}){
    const held=new Map(),suppressed=new Map();let session=null,space=null,abort=null,lastUpdate=null;
    function sample(source,frame){
        try{
            if(source.hand){const state=handTrackingState(frame,source,space),index=state?.joints.get('index-finger-tip'),thumb=state?.joints.get('thumb-tip'),wrist=state?.joints.get('wrist');if(!state?.tracked || !index || !thumb || !wrist)return null;return {position:{x:(index.x+thumb.x)/2,y:(index.y+thumb.y)/2,z:(index.z+thumb.z)/2},up:{x:wrist.matrix[4],y:wrist.matrix[5],z:wrist.matrix[6]},pressed:state.pinch,tracked:true};}
            const pose=frame?.getPose(source.gripSpace || source.targetRaySpace,space);if(!pose || pose.emulatedPosition)return null;
            const m=pose.transform.matrix,aim=frame?.getPose(source.targetRaySpace || source.gripSpace,space)?.transform.matrix || m;return {position:{x:m[12],y:m[13],z:m[14]},orientation:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(m)),up:{x:m[4],y:m[5],z:m[6]},forward:{x:-aim[8],y:-aim[9],z:-aim[10]},pressed:source.gamepad?.buttons?.[1]?.pressed ?? held.has(source),tracked:true};
        }catch{return null;}
    }
    function begin(source,frame){
        if(!enabled() || !canUse(source) || held.has(source))return held.has(source);
        if(held.size)return false; // One owner carries the map; a second hand cannot steal it.
        const value=sample(source,frame);if(!value)return false;let contact=value.position,remote=false,anchor=null;
        if(!livingMapGripContact(contact,origin(),rotation()) && !source.hand){
            const pose=frame?.getPose(source.targetRaySpace,space);if(!pose)return false;
            const m=pose.transform.matrix,ray=new THREE.Ray(new THREE.Vector3(m[12],m[13],m[14]),new THREE.Vector3(-m[8],-m[9],-m[10]).normalize());
            const hit=livingMapHandleRayHit(ray,origin(),rotation());
            if(!hit || !canUse(source,{ray:{origin:ray.origin,direction:ray.direction},distance:hit.distance}))return false;
            contact=hit.point;anchor=hit.local;remote=true;
        }
        if(!livingMapGripContact(contact,origin(),rotation()))return false;
        if(!source.hand && !remote && source.targetRaySpace){
            const aim=frame?.getPose(source.targetRaySpace,space)?.transform.matrix;
            if(aim && !canUse(source,{ray:{origin:{x:aim[12],y:aim[13],z:aim[14]},direction:{x:-aim[8],y:-aim[9],z:-aim[10]}},distance:0}))return false;
        }
        const offset=vector(contact).sub(vector(value.position));
        // Translation carries the contact. Wrist rotation must not swing a
        // distant ray-length offset around the controller like a lever.
        const local=anchor || livingMapHandleAnchor(livingMapGripContact(contact,origin(),rotation()));
        held.set(source,{offset,anchor:local,side:0,position:vector(value.position),origin:vector(origin()),rotation:quaternion(rotation()),orientation:value.orientation?.clone(),turn:0,depth:0});onGrab(source);return true;
    }
    function release(source){if(!held.has(source))return false;held.delete(source);suppressed.set(source,performance.now()+400);return true;}
    function reset(){held.clear();lastUpdate=null;}
    return {
        get active(){return held.size>0;},owns:source=>held.has(source),
        get heldHandles(){return [...held.values()].map(grip=>grip.side);},
        contact(source){const grip=held.get(source),center=origin();return grip && center?grip.anchor.clone().applyQuaternion(quaternion(rotation())).add(vector(center)):null;},
        reset,
        bind(value,referenceSpace){abort?.abort();reset();session=value;space=referenceSpace;abort=new AbortController();
            for(const type of ['squeezestart','selectstart','squeezeend','selectend','select'])session.addEventListener(type,event=>{
                const source=event.inputSource;
                if((type.startsWith('select') && !source.hand) || (type.startsWith('squeeze') && source.hand)){if(held.has(source) || (suppressed.get(source) || 0)>performance.now()){event.stopImmediatePropagation();event.preventDefault();}return;}
                const consumed=type.endsWith('start')?begin(source,event.frame):type.endsWith('end')?release(source):held.has(source) || (suppressed.get(source) || 0)>performance.now();
                if(consumed){event.stopImmediatePropagation();event.preventDefault();}
            },{capture:true,signal:abort.signal});
        },
        update(frame){
            if(!enabled()){reset();return;}
            const samples=[];
            for(const source of session?.inputSources || []){
                const value=sample(source,frame);
                if(!value || !canUse(source)){release(source);continue;}
                if(value.pressed && !held.has(source))begin(source,frame);
                if(!value.pressed){release(source);continue;}
                const grip=held.get(source);if(!grip)continue;
                const position=vector(value.position).add(grip.offset);
                samples.push({...value,position,source,handedness:source.handedness});
            }
            for(const source of held.keys())if(!samples.some(s=>s.source===source))release(source);
            const now=frame.predictedDisplayTime ?? performance.now(),dt=lastUpdate===null?16:Math.max(1,now-lastUpdate);lastUpdate=now;
            const carrying=samples[0],grip=carrying && held.get(carrying.source);
            if(grip){
                const axes=carrying.source.gamepad?.axes || [],start=axes.length>=4?2:0,seconds=Math.min(50,dt)/1000;
                grip.turn+=stickAxis(axes[start])*seconds*1.1;grip.depth-=stickAxis(axes[start+1])*seconds*.55;
                const next=grip.rotation.clone();
                if(grip.orientation && carrying.orientation)next.premultiply(carrying.orientation.clone().multiply(grip.orientation.clone().invert()));
                next.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),grip.turn));
                const bounded=limitLivingMapTilt(next);
                const carried=grip.origin.clone().add(vector(carrying.position).sub(grip.offset).sub(grip.position)).addScaledVector(vector(carrying.forward || {x:0,y:0,z:-1}),grip.depth);
                const blend=responseMs>0?1-Math.exp(-dt/responseMs):1;
                onMove(vector(origin()).lerp(carried,blend));onRotate(quaternion(rotation()).slerp(bounded,blend));
            }
        },
        destroy(){abort?.abort();reset();suppressed.clear();session=null;}
    };
}
