import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {createLivingMapTwoGrip,createLivingMapGripInput,limitLivingMapTilt,LIVING_MAP_MAX_TILT} from '../app/services/demoLivingMapGrip.js';
import {livingMapWorldPoint,livingMapRayPoint,livingMapWorldDropAccepted} from '../app/services/demoLivingMapReveal.js';
const origin={x:0,y:1,z:-1},identity=new THREE.Quaternion(),left={},right={};
function samples(q=identity){return [left,right].map((source,i)=>{const p=new THREE.Vector3(i?.5:-.5,0,0).applyQuaternion(q).add(new THREE.Vector3(0,1,-1)),up=new THREE.Vector3(0,1,0).applyQuaternion(q);return {source,handedness:i?'right':'left',position:p,up,pressed:true,tracked:true};});}
test('one grip cannot rotate; two opposite grips allow a continuous complete turn',()=>{
    const state=createLivingMapTwoGrip();assert.equal(state.update(samples().slice(0,1),origin,identity),null);assert.equal(state.active,false);
    assert.equal(state.update(samples(),origin,identity),null);assert.equal(state.active,true);
    for(let angle=.1;angle<Math.PI*4;angle+=.1){const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),result=state.update(samples(q),origin,identity);assert.ok(result.angleTo(q)<1e-6);}
});
test('same-side grips do not engage; losing either tracking or grip stops movement',()=>{
    const state=createLivingMapTwoGrip(),same=samples();same[0].position.x=.4;assert.equal(state.update(same,origin,identity),null);assert.equal(state.active,false);
    state.update(samples(),origin,identity);const lost=samples();lost[0].tracked=false;assert.equal(state.update(lost,origin,identity),null);assert.equal(state.active,false);
    state.update(samples(),origin,identity);const released=samples();released[1].pressed=false;state.update(released,origin,identity);assert.equal(state.active,false);
});
test('tilt is limited in every direction while yaw stays free',()=>{
    for(let angle=0;angle<Math.PI*2;angle+=.3){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(1,angle,.8,'YXZ')),bounded=limitLivingMapTilt(q);assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(bounded).angleTo(new THREE.Vector3(0,1,0))<=LIVING_MAP_MAX_TILT+1e-7);}
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.15,.9,.1,'YXZ'));assert.ok(q.angleTo(limitLivingMapTilt(q))<1e-6);
});
test('re-gripping preserves current orientation without jumping',()=>{
    const state=createLivingMapTwoGrip(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,.7,0,'YXZ'));
    state.update(samples(),origin,identity);const rotated=state.update(samples(q),origin,identity);state.update(samples(q).slice(0,1),origin,rotated);
    assert.equal(state.update(samples(q),origin,rotated),null);assert.ok(state.update(samples(q),origin,rotated).angleTo(rotated)<1e-6);
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
test('XR grip events reserve inputs, require both controller grips and recover from loss',()=>{
    const session=new EventTarget(),space={},a={handedness:'left',gripSpace:{},gamepad:{buttons:[{}, {pressed:false}]}},b={handedness:'right',gripSpace:{},gamepad:{buttons:[{}, {pressed:false}]}};session.inputSources=[a,b];
    let pose=identity.clone(),rotation=identity.clone(),calls=0;
    const frame={getPose:sourceSpace=>{const source=sourceSpace===a.gripSpace?a:b,p=new THREE.Vector3(source===a?-.5:.5,0,0).applyQuaternion(pose).add(new THREE.Vector3(0,1,-1));return {transform:{matrix:new THREE.Matrix4().compose(p,pose,new THREE.Vector3(1,1,1)).elements}};}};
    const input=createLivingMapGripInput({enabled:()=>true,origin:()=>origin,rotation:()=>rotation,onRotate:q=>{rotation=q;calls++;}});input.bind(session,space);
    const event=(type,source)=>{const e=new Event(type,{cancelable:true});e.inputSource=source;e.frame=frame;session.dispatchEvent(e);return e;};
    a.gamepad.buttons[1].pressed=true;assert.equal(event('squeezestart',a).defaultPrevented,true);input.update(frame);assert.equal(calls,0);
    b.gamepad.buttons[1].pressed=true;event('squeezestart',b);input.update(frame);assert.equal(input.active,true);
    pose.setFromEuler(new THREE.Euler(.3,1.8,.1,'YXZ'));input.update(frame);assert.ok(rotation.angleTo(pose)<1e-6);assert.equal(event('select',a).defaultPrevented,true);
    a.gamepad.buttons[1].pressed=false;event('squeezeend',a);input.update(frame);assert.equal(input.active,false);
    const before=calls;pose.setFromAxisAngle(new THREE.Vector3(0,1,0),2);input.update(frame);assert.equal(calls,before);
    session.inputSources=[];input.update(frame);assert.equal(input.owns(b),false);input.destroy();
});
test('tracked hand pinches also require both opposite rim contacts',()=>{
    const session=new EventTarget(),space={},states=new Map();let rotations=0;
    const sources=['left','right'].map((handedness,i)=>{const hand=new Map();for(const name of ['wrist','index-finger-tip','thumb-tip']){const key={};hand.set(name,key);states.set(key,{x:i?.5:-.5,y:1,z:-1});}return {handedness,hand};});session.inputSources=sources;
    const frame={getJointPose:key=>{const p=states.get(key);return p?{transform:{matrix:new THREE.Matrix4().makeTranslation(p.x,p.y,p.z).elements}}:null;}};
    const input=createLivingMapGripInput({enabled:()=>true,origin:()=>origin,rotation:()=>identity,onRotate:()=>rotations++});input.bind(session,space);input.update(frame);assert.equal(input.active,true);assert.equal(rotations,0);
    states.get(sources[0].hand.get('thumb-tip')).x-=.1;input.update(frame);assert.equal(input.active,false);assert.equal(input.owns(sources[0]),false);assert.equal(rotations,0);input.destroy();
});

test('off-centre grips rotate around the held midpoint and retain left/right order',()=>{
    const state=createLivingMapTwoGrip(),initial=samples();initial.forEach(s=>s.position.z+=.1);
    state.update([...initial].reverse(),origin,identity);
    const turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2),midpoint=new THREE.Vector3(0,1,-.9),translation=new THREE.Vector3(.15,.1,.2);
    const moved=initial.map(s=>({...s,position:s.position.clone().sub(midpoint).applyQuaternion(turn).add(midpoint).add(translation),up:s.up.clone().applyQuaternion(turn)}));
    const result=state.update(moved,origin,identity);assert.ok(result.angleTo(turn)<1e-6);
    const expected=new THREE.Vector3(origin.x,origin.y,origin.z).sub(midpoint).applyQuaternion(turn).add(midpoint).add(translation);
    assert.ok(state.position.distanceTo(expected)<1e-6);
    // Controller wrist roll can cancel the two up vectors; the last plate up
    // keeps the tray stable instead of dropping the gesture.
    moved[0].up.set(0,1,0);moved[1].up.set(0,-1,0);
    assert.ok(state.update(moved,origin,identity).angleTo(turn)<1e-6);assert.equal(state.active,true);
});
