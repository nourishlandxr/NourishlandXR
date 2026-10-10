import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {livingFramePose,avoidLivingFrameDisk} from '../app/services/livingFramePlacement.js';
import {fruitWindowFit,fruitWindowVisibleBounds,fruitHandPose} from '../app/services/fruitWindowExperience.js';
import {handTrackingState,beginHandTrackingFrame} from '../app/services/xrPointer.js';
import {createXRPerformanceSettings} from '../app/services/xrPerformanceSettings.js';
import {getSpatialVisualSettings,setSpatialVisualSettings,currentRainQuality,currentLivingFrameQuality,setAdaptiveGraphicsQuality} from '../app/services/spatialVisualSettings.js';
import {createFruitWindowXR} from '../app/services/fruitWindowXR.js';

test('native frame matches the offset reading disk and its facing angle in both eye views',()=>{
 const matrix=new THREE.Matrix4().makeRotationY(.55);matrix.scale(new THREE.Vector3(10,21,1));matrix.setPosition(.42,1.5,-2.8);
 const pose=livingFramePose(matrix.elements),right=new THREE.Vector3(...[pose.right.x,pose.right.y,pose.right.z]);
 assert.ok(Math.abs(pose.center.y-1.484)<1e-6);assert.ok(Math.abs(pose.radius-.832)<1e-6);
 assert.ok(right.distanceTo(new THREE.Vector3(Math.cos(.55),0,-Math.sin(.55)))<1e-6);
 for(const eye of [-.032,.032]){const camera=new THREE.PerspectiveCamera(60,1,.01,20);camera.position.x=eye;camera.updateMatrixWorld();
  const rimCenter=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(pose.matrix)).project(camera);
  const diskCenter=new THREE.Vector3(0,-.16*21*10/2100,0).applyMatrix4(new THREE.Matrix4().makeRotationY(.55).setPosition(.42,1.5,-2.8)).project(camera);
  assert.ok(rimCenter.distanceTo(diskCenter)<1e-6);
 }
});

test('bees cannot penetrate or tunnel through a rotated Living Frame disk',()=>{
 const matrix=new THREE.Matrix4().makeRotationY(.7);matrix.scale(new THREE.Vector3(10,21,1));matrix.setPosition(2,1,-3);
 const pose=livingFramePose(matrix.elements),center=new THREE.Vector3(pose.center.x,pose.center.y,pose.center.z),normal=new THREE.Vector3(pose.normal.x,pose.normal.y,pose.normal.z);
 const front=center.clone().addScaledVector(normal,.3),behind=center.clone().addScaledVector(normal,-.3);
 const kept=avoidLivingFrameDisk(behind,pose,0,front),relative=new THREE.Vector3(kept.x,kept.y,kept.z).sub(center);
 assert.ok(relative.dot(normal)>=.159);
 const outside=center.clone().add(new THREE.Vector3(pose.right.x,pose.right.y,pose.right.z).multiplyScalar(1.4));assert.equal(avoidLivingFrameDisk(outside,pose),outside);
 const flower=center.clone().add(new THREE.Vector3(pose.right.x,pose.right.y,pose.right.z).multiplyScalar(.89)).addScaledVector(normal,.09);assert.equal(avoidLivingFrameDisk(flower,pose),flower);
 const intrusion=center.clone().addScaledVector(normal,.01),safe=avoidLivingFrameDisk(intrusion,pose);assert.ok(new THREE.Vector3(safe.x,safe.y,safe.z).sub(center).dot(normal)>=.159);
});

test('hidden cutaways do not shrink the displayed plant and the deeper box fits a large branch',()=>{
 const root=new THREE.Group(),visible=new THREE.Mesh(new THREE.BoxGeometry(1,.6,.3),new THREE.MeshBasicMaterial()),hidden=new THREE.Mesh(new THREE.BoxGeometry(40,40,40),visible.material);hidden.visible=false;root.add(visible,hidden);root.updateMatrixWorld(true);
 const size=fruitWindowVisibleBounds(root).getSize(new THREE.Vector3());assert.ok(size.distanceTo(new THREE.Vector3(1,.6,.3))<1e-6);
 const scale=fruitWindowFit(size);assert.equal(scale,.57);assert.ok(size.z*scale<=.26);assert.ok(scale>.09/size.z*1.8);
});

test('joint-only hands supply a fingertip pickup pose, retain pinch hysteresis and release',()=>{
 const points=new Map([['wrist',{x:0,y:1,z:0}],['thumb-tip',{x:.01,y:1,z:-.3}],['index-finger-tip',{x:0,y:1,z:-.3}]]),source={hand:points,handedness:'left'};
 const space={},frame={getJointPose(point){return {transform:{matrix:new THREE.Matrix4().makeTranslation(point.x,point.y,point.z).elements},radius:.008};}};
 beginHandTrackingFrame(frame,100);let state=handTrackingState(frame,source,space),pose=fruitHandPose(state);assert.equal(state.pinch,true);assert.ok(pose.position.distanceTo(new THREE.Vector3(.005,1,-.3))<1e-6);
 points.get('thumb-tip').x=.035;beginHandTrackingFrame(frame,116);state=handTrackingState(frame,source,space);assert.equal(state.pinch,true);
 points.get('thumb-tip').x=.06;beginHandTrackingFrame(frame,132);state=handTrackingState(frame,source,space);assert.equal(state.pinch,false);
 points.delete('index-finger-tip');beginHandTrackingFrame(frame,148);assert.equal(fruitHandPose(handTrackingState(frame,source,space)),null);
});

test('persistent 90 Hz misses reduce scene cost and recover to supported 72 Hz without requiring FPS display',async()=>{
 const saved=getSpatialVisualSettings(),calls=[],layer={fixedFoveation:0},session={frameRate:90,supportedFrameRates:[72,90],visibilityState:'visible',renderState:{baseLayer:layer},updateTargetFrameRate(){}};
 try{
  setSpatialVisualSettings({graphicsQuality:'auto',showFps:false,rainQuality:'high',livingFrameQuality:'hd'});
  const perf=createXRPerformanceSettings({getSession:()=>session,publish(){},configure:async(_session,rate)=>{calls.push(rate);session.frameRate=rate;return {requested:rate};}});
  for(let time=0;time<=12000;time+=25)perf.tick(time);await Promise.resolve();
  assert.deepEqual(calls,[72]);assert.equal(layer.fixedFoveation,.65);assert.equal(currentRainQuality(),'off');assert.equal(getSpatialVisualSettings().rainQuality,'high');
  assert.equal(currentLivingFrameQuality(),'sd');assert.equal(getSpatialVisualSettings().livingFrameQuality,'hd');
 }finally{setAdaptiveGraphicsQuality(null);setSpatialVisualSettings(saved);}
});

test('repeated fruit leaves draw together while hidden leaves stay collapsed and both eyes share pose uploads',()=>{
 const oldDocument=globalThis.document,calls=[],attributes=['p','n','uv','c','i0','i1','i2','i3','ic'];
 globalThis.document={createElement:()=>({})};
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getExtension:()=>null,getParameter:()=>16,getAttribLocation:(_p,name)=>attributes.indexOf(name),getUniformLocation:(_p,name)=>name},{get(target,key){if(key in target)return target[key];if(key===key.toUpperCase())return key;if(key.startsWith('create'))return ()=>({});return (...args)=>calls.push([key,...args.map(value=>ArrayBuffer.isView(value)?Array.from(value):value)]);}});
 try{
  const geometry=new THREE.BoxGeometry(.02,.06,.002),material=new THREE.MeshStandardMaterial(),root=new THREE.Group(),leaf=new THREE.Mesh(geometry,material),hidden=new THREE.Mesh(geometry,material);leaf.position.x=.1;hidden.position.x=.2;hidden.visible=false;root.add(leaf,hidden);
  const renderer=createFruitWindowXR(gl,root),identity=new THREE.Matrix4().elements,view={projectionMatrix:identity,transform:{inverse:{matrix:identity}}},anchor={position:new THREE.Vector3(0,1,-1),quaternion:new THREE.Quaternion()};renderer.update();
  assert.equal(renderer.stats.drawCalls,1);assert.equal(renderer.stats.instanceBatches,1);
  renderer.draw(view,anchor);renderer.draw(view,anchor);
  assert.equal(calls.filter(call=>call[0]==='drawArraysInstanced').length,2);
  const poseUpload=calls.find(call=>call[0]==='bufferData'&&call[2]?.length===32);assert.ok(poseUpload,'instance poses uploaded');assert.equal(poseUpload[2][16],0);assert.equal(poseUpload[2][21],0);assert.equal(poseUpload[2][26],0);
  hidden.visible=true;renderer.update();renderer.draw(view,anchor);renderer.draw(view,anchor);assert.equal(calls.filter(call=>call[0]==='bufferSubData'&&call[3]?.length===32).length,1);
  renderer.destroy();
 }finally{globalThis.document=oldDocument;}
});
