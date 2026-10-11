import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {createLivingMapGripInput,limitLivingMapTilt,LIVING_MAP_MAX_TILT,livingMapGripContact} from '../app/services/demoLivingMapGrip.js';
import {livingMapWorldPoint,livingMapRayPoint,livingMapWorldDropAccepted,livingMapTotemRayHit} from '../app/services/demoLivingMapReveal.js';
const origin={x:0,y:1,z:-1},identity=new THREE.Quaternion(),left={},right={};
test('missing plate pose cannot capture a grip while the map is loading',()=>{
    assert.equal(livingMapGripContact({x:0,y:1,z:-1},null,identity),null);
    assert.equal(livingMapGripContact({x:NaN,y:1,z:-1},origin,identity),null);
});
test('a distant grip carries by hand translation without a wrist lever or behind-plate occlusion',()=>{
    const session=new EventTarget(),sources=['left','right'].map(handedness=>({handedness,gripSpace:{},targetRaySpace:{},gamepad:{buttons:[{},{pressed:true}]}}));session.inputSources=[sources[0]];
    let wrist=0,shift=0,position={...origin},rotation=identity.clone();const contacts=[];
    const frame={getPose:key=>{const s=sources.find(s=>s.gripSpace===key || s.targetRaySpace===key),x=0;
        const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(key===s.targetRaySpace?-Math.PI/4:wrist,0,0));
        return {transform:{matrix:new THREE.Matrix4().compose(new THREE.Vector3(x,1.5,-.13+shift),q,new THREE.Vector3(1,1,1)).elements}};}};
    const input=createLivingMapGripInput({enabled:()=>true,origin:()=>position,rotation:()=>rotation,onMove:p=>position={...p},onRotate:q=>rotation=q,canUse:(_s,c)=>{if(c){contacts.push(c.distance);return c.distance<1;}return true;}});input.bind(session,{});
    try{input.update(frame);assert.equal(input.active,true);assert.ok(contacts.every(d=>Number.isFinite(d) && d<1));
        wrist=.2;input.update(frame);assert.ok(Math.abs(position.z-origin.z)<.02,'wrist tilt pivots at the raised handles, without a distant ray-length lever');
        const tilted={...position};shift=.25;input.update(frame);assert.ok(Math.abs(position.z-(tilted.z+.25))<1e-8,'hands carry the tray naturally');
        sources[0].gamepad.buttons[1].pressed=false;input.update(frame);const stopped={...position};shift=.4;input.update(frame);assert.deepEqual(position,stopped);
    }finally{input.destroy();}
});
test('loose Totem can be grabbed from front, side and above without a facing-plane miss',()=>{
    for(const offset of [{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}]){
        const hit=livingMapTotemRayHit({origin:{x:origin.x+offset.x,y:origin.y+offset.y,z:origin.z+offset.z},direction:{x:-offset.x,y:-offset.y,z:-offset.z}},origin);
        assert.ok(hit);assert.ok(Math.abs(hit.distance-(offset.y? .855:.93))<1e-6);
    }
    assert.equal(livingMapTotemRayHit({origin:{x:1,y:1,z:-1},direction:{x:0,y:0,z:-1}},origin),null);
});
test('laser contact stays on the miniature while grip pickup has a forgiving area',()=>{
    const ray={origin:{x:origin.x,y:origin.y,z:origin.z+1},direction:{x:0,y:0,z:-1}};
    const visible=livingMapTotemRayHit(ray,origin),pickup=livingMapTotemRayHit(ray,origin,.20);
    assert.ok(Math.abs(visible.point.z-(origin.z+.07))<1e-6);
    assert.ok(Math.abs(pickup.distance-.8)<1e-6);
    const tip={...ray,origin:{...ray.origin,y:origin.y+.09}};assert.ok(livingMapTotemRayHit(tip,origin),'tip remains aimable');
});
test('map grip capture yields to a loose Totem even when controller touches the rim',()=>{
    const session=new EventTarget(),source={targetRaySpace:{},gripSpace:{},gamepad:{buttons:[{},{pressed:true}]}},frame={getPose:()=>({transform:{matrix:new THREE.Matrix4().makeTranslation(.5,1,-1).elements}})};
    const input=createLivingMapGripInput({enabled:()=>true,origin:()=>origin,rotation:()=>identity,onRotate:()=>{},canUse:(_source,contact)=>!contact});
    input.bind(session,{});const event=new Event('squeezestart',{cancelable:true});event.inputSource=source;event.frame=frame;session.dispatchEvent(event);
    assert.equal(event.defaultPrevented,false);assert.equal(input.owns(source),false);input.destroy();
});
test('tilt is limited in every direction while yaw stays free',()=>{
    for(let angle=0;angle<Math.PI*2;angle+=.3){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(1,angle,.8,'YXZ')),bounded=limitLivingMapTilt(q);assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(bounded).angleTo(new THREE.Vector3(0,1,0))<=LIVING_MAP_MAX_TILT+1e-7);}
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.15,.9,.1,'YXZ'));assert.ok(q.angleTo(limitLivingMapTilt(q))<1e-6);
});
test('Totem drop ray follows tilted plate and rejects a stale horizontal target',()=>{
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.35,.7,.1,'YXZ')),target=livingMapWorldPoint({x:4,z:2},origin,q),normal=new THREE.Vector3(0,1,0).applyQuaternion(q);
    const start=new THREE.Vector3(target.x,target.y,target.z).addScaledVector(normal,.5),point=livingMapRayPoint({origin:start,direction:normal.negate()},origin,q);
    assert.equal(livingMapWorldDropAccepted(point,target),true);assert.equal(livingMapWorldDropAccepted(point,livingMapWorldPoint({x:4,z:2},origin)),false);
});
test('placement rays outside the finite plate do not create distant phantom hits',()=>{
    const sideRay={origin:{x:1,y:1.5,z:-1},direction:{x:0,y:-1,z:0}};
    assert.equal(livingMapRayPoint(sideRay,origin),null);
    const onPlate={origin:{x:.2,y:1.5,z:-1},direction:{x:0,y:-1,z:0}};
    assert.ok(livingMapRayPoint(onPlate,origin));
});
function fixture(){
    const session=new EventTarget(),sources=['left','right'].map(handedness=>({handedness,gripSpace:{},gamepad:{buttons:[{}, {pressed:false}],axes:[0,0,0,0]}}));session.inputSources=sources;
    let position=new THREE.Vector3(0,1,-1),rotation=identity.clone(),tracked=true;
    const controller=new THREE.Vector3(0,1.03,-.63025),orientation=identity.clone();
    const frame={getPose:()=>tracked?{transform:{matrix:new THREE.Matrix4().compose(controller,orientation,new THREE.Vector3(1,1,1)).elements}}:null};
    const input=createLivingMapGripInput({enabled:()=>true,origin:()=>position,rotation:()=>rotation,onMove:p=>position=p,onRotate:q=>rotation=q});input.bind(session,{});
    const event=(type,source)=>{const e=new Event(type,{cancelable:true});e.inputSource=source;e.frame=frame;session.dispatchEvent(e);return e;};
    return {session,sources,controller,orientation,frame,input,event,get position(){return position;},get rotation(){return rotation;},loseTracking(){tracked=false;}};
}
test('one central grip carries and rotates, reserves its input and prevents a second owner',()=>{
    const f=fixture(),[a,b]=f.sources;
    try{
        a.gamepad.buttons[1].pressed=true;assert.equal(f.event('squeezestart',a).defaultPrevented,true);f.input.update(f.frame);assert.equal(f.input.active,true);
        assert.equal(f.event('select',a).defaultPrevented,true);assert.equal(f.event('squeezestart',b).defaultPrevented,false);assert.equal(f.input.owns(b),false);
        for(let angle=.1;angle<Math.PI*4;angle+=.1){f.orientation.setFromAxisAngle(new THREE.Vector3(0,1,0),angle);f.input.update(f.frame);assert.ok(f.rotation.angleTo(f.orientation)<1e-6);}
        f.controller.add(new THREE.Vector3(.15,.3,.65));f.input.update(f.frame);assert.ok(f.position.distanceTo(new THREE.Vector3(.15,1.3,-.35))<1e-6);
        a.gamepad.buttons[1].pressed=false;f.event('squeezeend',a);assert.equal(f.input.active,false);const stopped=f.position.clone();f.controller.z+=.2;f.input.update(f.frame);assert.ok(f.position.equals(stopped));
    }finally{f.input.destroy();}
});
test('tracking loss and source removal release the central grip',()=>{
    for(const remove of [false,true]){const f=fixture();try{f.sources[0].gamepad.buttons[1].pressed=true;f.input.update(f.frame);assert.equal(f.input.active,true);if(remove)f.session.inputSources=[];else f.loseTracking();f.input.update(f.frame);assert.equal(f.input.active,false);}finally{f.input.destroy();}}
});
test('re-gripping preserves the current map pose without a jump',()=>{
    const f=fixture(),a=f.sources[0];try{a.gamepad.buttons[1].pressed=true;f.input.update(f.frame);f.orientation.setFromEuler(new THREE.Euler(.15,.7,.1,'YXZ'));f.input.update(f.frame);const rotation=f.rotation.clone(),position=f.position.clone();a.gamepad.buttons[1].pressed=false;f.input.update(f.frame);f.controller.copy(new THREE.Vector3(0,.03,.36975).applyQuaternion(rotation).add(position));a.gamepad.buttons[1].pressed=true;f.input.update(f.frame);assert.equal(f.input.active,true);assert.ok(f.rotation.angleTo(rotation)<1e-6);assert.ok(f.position.equals(position));}finally{f.input.destroy();}
});
test('single controller stick rotates and adjusts distance while carrying',()=>{
    const f=fixture();try{f.sources[0].gamepad.buttons[1].pressed=true;f.input.update(f.frame);f.sources[0].gamepad.axes=[0,0,1,-1];f.input.update(f.frame);assert.ok(f.rotation.angleTo(identity)>0);assert.ok(f.position.z<-1);}finally{f.input.destroy();}
});
test('one tracked hand pinch captures the central grip and release stops carrying',()=>{
    const session=new EventTarget(),states=new Map(),hand=new Map();for(const name of ['wrist','index-finger-tip','thumb-tip']){const key={};hand.set(name,key);states.set(key,{x:0,y:1.03,z:-.63025});}
    const source={handedness:'right',hand};session.inputSources=[source];let rotations=0;
    const frame=()=>({getJointPose:key=>{const p=states.get(key);return p?{transform:{matrix:new THREE.Matrix4().makeTranslation(p.x,p.y,p.z).elements}}:null;}});
    const input=createLivingMapGripInput({enabled:()=>true,origin:()=>origin,rotation:()=>identity,onRotate:()=>rotations++});input.bind(session,{});
    try{input.update(frame());assert.equal(input.active,true);assert.equal(rotations,1);states.get(hand.get('thumb-tip')).x-=.1;input.update(frame());assert.equal(input.active,false);assert.equal(rotations,1);}finally{input.destroy();}
});
