import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../app/vendor/three.module.min.js';
import {livingMapHandleContact,livingMapHandleRayHit,createLivingMapHandles,LIVING_MAP_HANDLE_X} from '../app/services/demoLivingMapHandles.js';
import {createLivingMapGripInput} from '../app/services/demoLivingMapGrip.js';
import {LIVING_MAP_WORLD_SCALE as SCALE} from '../app/services/demoLivingMapReveal.js';

const origin=new THREE.Vector3(0,1,-1),identity=new THREE.Quaternion();
test('only raised side handles accept contact, including a turned and tilted tray',()=>{
 const turn=new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,.8,.1,'YXZ'));
 for(const side of [-1,1])for(const rotation of [identity,turn]){
  const point=new THREE.Vector3(side*LIVING_MAP_HANDLE_X*SCALE,.03,0).applyQuaternion(rotation).add(origin);
  assert.ok(livingMapHandleContact(point,origin,rotation));
 }
 for(const point of [[0,0,0],[.3,0,0],[0,0,.3],[.5,0,.2],[.5,.2,0]]){
  assert.equal(livingMapHandleContact(new THREE.Vector3(...point).add(origin),origin,identity),null,'map interior and former broad rim band cannot capture');
 }
});
test('rays can grab raised handles from the side without intersecting the plate plane',()=>{
 const turn=new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,.8,.1,'YXZ'));
 for(const rotation of [identity,turn]){
  const start=new THREE.Vector3(1,.035,0).applyQuaternion(rotation).add(origin),direction=new THREE.Vector3(-1,0,0).applyQuaternion(rotation);
  const hit=livingMapHandleRayHit({origin:start,direction},origin,rotation);
  assert.equal(hit.side,1);assert.ok(hit.distance<.6);
  assert.ok(hit.local.y>0);assert.ok(hit.point.distanceTo(hit.local.clone().applyQuaternion(rotation).add(origin))<1e-8);
 }
 assert.equal(livingMapHandleRayHit({origin:origin.clone().add(new THREE.Vector3(0,.5,0)),direction:{x:0,y:-1,z:0}},origin,identity),null);
 assert.equal(livingMapHandleRayHit({origin:origin.clone().add(new THREE.Vector3(4,.035,0)),direction:{x:-1,y:0,z:0}},origin,identity),null);
});
test('raised ribbed hooks share geometry and keep a visibly open space underneath',()=>{
 const geometries=new Set(),materials=new Map();
 const handles=createLivingMapHandles({geometry:value=>{geometries.add(value);return value;},mesh:(geo,color,x,y,z,sx,sy,sz,parent)=>{
  if(!materials.has(color))materials.set(color,new THREE.MeshBasicMaterial({color}));
  const node=new THREE.Mesh(geo,materials.get(color));node.position.set(x,y,z);node.scale.set(sx,sy,sz);parent.add(node);return node;
 }});
 assert.equal(geometries.size,3);assert.equal(handles.length,2);
 assert.equal(handles[0].children[0].geometry,handles[1].children[0].geometry);
 assert.equal(handles[0].children.length,8,'one raised bar, two feet and five ribs');
 const bar=handles[0].children[0];bar.geometry.computeBoundingBox();assert.ok(bar.geometry.boundingBox.max.y>.45);
 geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());
});
test('held laser contacts stay on the same handle through aim changes, carrying and release',()=>{
 const session=new EventTarget(),source={handedness:'right',gripSpace:{},targetRaySpace:{},gamepad:{buttons:[{},{pressed:true}]}},space={};session.inputSources=[source];
 let position=origin.clone(),rotation=identity.clone(),yaw=0,shift=0;
 const frame={getPose:key=>{
  const q=key===source.targetRaySpace?new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/4,yaw,0)):identity;
  const p=new THREE.Vector3(.5,1.5,-.5+shift);
  return {transform:{matrix:new THREE.Matrix4().compose(p,q,new THREE.Vector3(1,1,1)).elements}};
 }};
 const input=createLivingMapGripInput({enabled:()=>true,origin:()=>position,rotation:()=>rotation,onRotate:()=>{}});input.bind(session,space);
 try{
  input.update(frame);assert.equal(input.owns(source),true);assert.equal(input.active,false);
  const anchor=input.contact(source).sub(position);yaw=1.2;shift=.2;input.update(frame);
  assert.ok(input.contact(source).sub(position).distanceTo(anchor)<1e-8,'aiming elsewhere does not replace the held contact');
  position.add(new THREE.Vector3(.15,.1,.2));rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),.7);
  assert.ok(input.contact(source).distanceTo(anchor.clone().applyQuaternion(rotation).add(position))<1e-8);
  source.gamepad.buttons[1].pressed=false;input.update(frame);assert.equal(input.contact(source),null);assert.deepEqual(input.heldHandles,[]);
 }finally{input.destroy();}
});
test('production pointer draws the held hook beam instead of hiding it or retargeting another surface',()=>{
 const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function drawDemoInputPointer('),source.indexOf('async function startImmersive()'));
 const endpoint={x:.5,y:1,z:-1},draws=[],scope=vm.createContext({tetherRenderer:{},latestControllerRay:{origin:{x:0,y:1.5,z:0},direction:{x:0,y:0,z:-1}},demoHandMode:'controllers',latestTrackedHandStates:[],demoLivingMapGrip:{contact:()=>endpoint},XR_LASER_POINTER_CONFIG:{startOffset:.03},gl:{},view:{},pointerSource:{},drawSpatialTether:(_gl,_r,_v,start,end,options)=>draws.push({start,end,options}),drawSpatialPointerContact:(_gl,_r,_v,end)=>draws.push({end})});
 vm.runInContext(fn+';drawDemoInputPointer(view,pointerSource);',scope);
 assert.equal(draws.length,2);assert.equal(draws[0].end,endpoint);assert.equal(draws[0].options.segments,4);assert.equal(draws[1].end,endpoint);
});
