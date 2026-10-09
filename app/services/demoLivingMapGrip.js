import * as THREE from '../vendor/three.module.min.js';
import {handTrackingState} from './xrPointer.js';
import {livingMapHandleContact,livingMapHandleRayHit,livingMapHandleAnchor} from './demoLivingMapHandles.js';

export const LIVING_MAP_MAX_TILT=Math.PI*25/180;
const vector=p=>new THREE.Vector3(p.x,p.y,p.z);
const quaternion=q=>new THREE.Quaternion(q?.x || 0,q?.y || 0,q?.z || 0,q?.w ?? 1);
const stickAxis=value=>{const v=Math.max(-1,Math.min(1,Number(value)||0)),amount=Math.max(0,(Math.abs(v)-.18)/.82);return Math.sign(v)*amount*(.25+.75*amount);};
function joystickAdjustment(samples,elapsed){
    const controllers=samples.filter(sample=>!sample.source.hand),left=controllers.find(sample=>sample.handedness==='left'),right=controllers.find(sample=>sample.handedness==='right');
    const axes=sample=>{const values=sample?.source.gamepad?.axes || [],start=values.length>=4?2:0;return [stickAxis(values[start]),stickAxis(values[start+1])];};
    const [lx,ly]=axes(left),[rx,ry]=axes(right),dt=Math.min(50,Math.max(0,elapsed))/1000;
    return {turn:-lx*dt*1.1,tilt:-ly*dt*.85,roll:-rx*dt*.85,depth:-ry*dt*.55,forward:right?.forward || {x:0,y:0,z:-1},allowFullTilt:controllers.length===2};
}
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
function pairFrame(a,b,fallbackUp={x:0,y:1,z:0}){
    const x=vector(b.position).sub(vector(a.position));if(x.length()<.2)return null;x.normalize();
    const up=vector(a.up).add(vector(b.up));up.addScaledVector(x,-up.dot(x));
    if(up.length()<.25){up.copy(vector(fallbackUp));up.addScaledVector(x,-up.dot(x));}
    if(up.length()<.1)return null;up.normalize();
    if(up.y<0)up.negate();
    const z=new THREE.Vector3().crossVectors(x,up).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,up,z));
}
// Two opposite contacts carry and rotate a plate without scaling. Losing
// either source ends the pair, so a later re-grip starts without a jump.
export function createLivingMapTwoGrip(){
    let pair=null,position=null;
    return {
        get active(){return Boolean(pair);},get position(){return position;},reset(){pair=null;position=null;},
        update(samples,origin,rotation,adjustment={}){
            const held=samples.filter(s=>s.pressed && s.tracked);
            if(pair){
                const a=held.find(s=>s.source===pair.a),b=held.find(s=>s.source===pair.b);
                if(!a || !b){pair=null;return null;}
                const current=pairFrame(a,b,pair.up);if(!current)return null;
                pair.up.set(0,1,0).applyQuaternion(current);
                const carried=current.multiply(pair.frame.clone().invert()).multiply(pair.rotation).normalize();
                const base=adjustment.allowFullTilt?carried:limitLivingMapTilt(carried);
                pair.turn+=adjustment.turn || 0;
                pair.adjustment.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),adjustment.tilt || 0)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),adjustment.roll || 0)).normalize();
                const next=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),pair.turn).multiply(base).multiply(pair.adjustment).normalize();
                pair.translation.addScaledVector(vector(adjustment.forward || {x:0,y:0,z:-1}),adjustment.depth || 0);
                const applied=base.clone().multiply(pair.rotation.clone().invert());
                position=vector(a.position).add(vector(b.position)).multiplyScalar(.5)
                    .add(pair.origin.clone().sub(pair.midpoint).applyQuaternion(applied)).add(pair.translation);
                return next;
            }
            for(let i=0;i<held.length;i++)for(let j=i+1;j<held.length;j++){
                const a=held[i],b=held[j];
                if(a.handedness===b.handedness || !['left','right'].includes(a.handedness) || !['left','right'].includes(b.handedness))continue;
                const ca=livingMapGripContact(a.position,origin,rotation),cb=livingMapGripContact(b.position,origin,rotation);
                if(!ca || !cb || ca.x*cb.x>=0)continue;
                const ordered=[a,b].sort((left,right)=>left.handedness==='left'?-1:right.handedness==='left'?1:0);
                const frame=pairFrame(ordered[0],ordered[1]);if(!frame)continue;
                pair={a:ordered[0].source,b:ordered[1].source,frame,up:new THREE.Vector3(0,1,0).applyQuaternion(frame),rotation:quaternion(rotation),midpoint:vector(a.position).add(vector(b.position)).multiplyScalar(.5),origin:vector(origin),turn:0,adjustment:new THREE.Quaternion(),translation:new THREE.Vector3()};position=vector(origin);return null;
            }
            return null;
        }
    };
}

export function createLivingMapGripInput({enabled,origin,rotation,onRotate,onMove=()=>{},canUse=()=>true,onGrab=()=>{},responseMs=0}){
    const gesture=createLivingMapTwoGrip(),held=new Map(),suppressed=new Map();let session=null,space=null,abort=null,lastUpdate=null;
    function sample(source,frame){
        try{
            if(source.hand){const state=handTrackingState(frame,source,space),index=state?.joints.get('index-finger-tip'),thumb=state?.joints.get('thumb-tip'),wrist=state?.joints.get('wrist');if(!state?.tracked || !index || !thumb || !wrist)return null;return {position:{x:(index.x+thumb.x)/2,y:(index.y+thumb.y)/2,z:(index.z+thumb.z)/2},up:{x:wrist.matrix[4],y:wrist.matrix[5],z:wrist.matrix[6]},pressed:state.pinch,tracked:true};}
            const pose=frame?.getPose(source.gripSpace || source.targetRaySpace,space);if(!pose || pose.emulatedPosition)return null;
            const m=pose.transform.matrix,aim=frame?.getPose(source.targetRaySpace || source.gripSpace,space)?.transform.matrix || m;return {position:{x:m[12],y:m[13],z:m[14]},orientation:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(m)),up:{x:m[4],y:m[5],z:m[6]},forward:{x:-aim[8],y:-aim[9],z:-aim[10]},pressed:source.gamepad?.buttons?.[1]?.pressed ?? held.has(source),tracked:true};
        }catch{return null;}
    }
    function begin(source,frame){
        if(!enabled() || !canUse(source) || held.has(source))return held.has(source);
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
        held.set(source,{offset,anchor:local,side:Math.sign(local.x)});onGrab(source);return true;
    }
    function release(source){if(!held.has(source))return false;held.delete(source);gesture.reset();suppressed.set(source,performance.now()+400);return true;}
    function reset(){gesture.reset();held.clear();lastUpdate=null;}
    return {
        get active(){return gesture.active;},owns:source=>held.has(source),
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
                if(!gesture.active && position.distanceTo(vector(origin()))>1.1){release(source);continue;}
                samples.push({...value,position,source,handedness:source.handedness});
            }
            for(const source of held.keys())if(!samples.some(s=>s.source===source))release(source);
            const now=frame.predictedDisplayTime ?? performance.now(),dt=lastUpdate===null?16:Math.max(1,now-lastUpdate);lastUpdate=now;
            const next=gesture.update(samples,origin(),rotation(),joystickAdjustment(samples,dt));if(next){
                const blend=responseMs>0?1-Math.exp(-dt/responseMs):1;
                onMove(vector(origin()).lerp(gesture.position,blend));onRotate(quaternion(rotation()).slerp(next,blend));
            }
        },
        destroy(){abort?.abort();reset();suppressed.clear();session=null;}
    };
}
