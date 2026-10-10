import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../app/vendor/three.module.min.js';
import {createPeekWorld,OPENING_RADIUS,HOUSE_POSITION,groundHeight,rayThroughOpening} from './peek-world.mjs';
import {createPropertyPeekWorld,propertyDepth} from './property-world.mjs';
import {createHilltopPeekWorld} from './hilltop-world.mjs';
import {GLTFLoader} from '../../app/assets/fruit-window/vendor/GLTFLoader.js';
import {readFile} from 'node:fs/promises';
import {createAnimatedPropertyPeekWorld,MOTION_LOOP_SECONDS} from './animated-property.mjs';

test('Animated artwork freezes, loops, respects reduced motion and releases its source',()=>{
 const texture=new THREE.Texture({width:1672,height:941});let released=0;texture.addEventListener('dispose',()=>released++);
 const study=createAnimatedPropertyPeekWorld(texture,{reducedMotion:true});
 study.advanceAnimation(.05);assert.equal(study.moment,0);assert.equal(study.playing,false);
 study.setPlaying(true);study.advanceAnimation(.05);assert.equal(study.moment,.05);
 study.setPlaying(false);study.advanceAnimation(.05);assert.equal(study.moment,.05);
 study.setMoment(MOTION_LOOP_SECONDS);assert.equal(study.moment,0);
 study.setMoment(-1);assert.equal(study.moment,119);
 study.setMotionStrength(0);assert.equal(study.animationUniforms.nlMotion.value,0);
 study.setMotionStrength(2);assert.equal(study.motionStrength,1);
 study.setPlaying(true);study.setEnabled(false);study.advanceAnimation(.05);assert.equal(study.moment,119);
 study.dispose();study.advanceAnimation(.05);study.dispose();assert.equal(released,1);assert.equal(study.moment,119);
});

test('The Blender property is true geometry with the dam below and nearer than the house',async()=>{
 const bytes=await readFile(new URL('./hilltop-property-v1.glb',import.meta.url));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.equal(json.images?.length||0,0,'Reference photos must not be exported as landscape planes');
 assert.equal(json.cameras?.length||0,0);assert.equal(json.animations?.length||0,0);
 assert.ok(json.meshes.length<16,'Runtime objects must stay batched');
 const meta=JSON.parse(await readFile(new URL('./hilltop-property-v1.json',import.meta.url),'utf8'));
 assert.ok(meta.pond_gltf[1]<meta.house_gltf[1]-3);
 assert.ok(meta.pond_gltf[2]>meta.house_gltf[2]);
 const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const bounds=new THREE.Box3().setFromObject(asset.scene),size=bounds.getSize(new THREE.Vector3());
 assert.ok(size.x>50&&size.z>50&&size.y>10,'The world must occupy a full 3D volume');
 const study=createHilltopPeekWorld(asset),geometries=new Set(),materials=new Set();
 study.root.traverse(obj=>{if(obj.geometry)geometries.add(obj.geometry);if(obj.material)materials.add(obj.material);});
 let released=0;for(const g of geometries)g.addEventListener('dispose',()=>released++);
 study.dispose();study.dispose();assert.equal(released,geometries.size);
});

test('The opening rejects rays beyond its edge and views from behind it',()=>{
 assert.ok(rayThroughOpening({x:0,y:0,z:1.8},{x:0,y:0,z:-1}));
 assert.equal(rayThroughOpening({x:1,y:0,z:1.8},{x:0,y:0,z:-1}),null);
 assert.equal(rayThroughOpening({x:0,y:0,z:-.1},{x:0,y:0,z:-1}),null);
 assert.equal(rayThroughOpening({x:0,y:0,z:1.8},{x:1,y:0,z:0}),null);
 assert.equal(rayThroughOpening({x:0,y:0,z:1.8},{x:0,y:0,z:1}),null);
});
test('Property relief retains image projection while giving foreground and horizon different depth',()=>{
 const texture=new THREE.Texture({width:1672,height:941});let textureReleased=0;texture.addEventListener('dispose',()=>textureReleased++);
 const study=createPropertyPeekWorld(texture),geometry=study.world.children[0].geometry,p=geometry.attributes.position,uv=geometry.attributes.uv;
 assert.equal(study.paintingTriangles,10368);assert.ok(propertyDepth(.5,.95)>propertyDepth(.5,.1)+20);
 for(let i=0;i<p.count;i+=37){
  const factor=1.8/(1.8-p.getZ(i));
  assert.ok(Math.abs(p.getX(i)*factor-(uv.getX(i)-.46)*1.88*1672/941)<.00001);
  assert.ok(Math.abs(p.getY(i)*factor-(uv.getY(i)-.5)*1.88)<.00001);
  assert.ok(p.getZ(i)<-2.9,'The whole relief must remain behind the opening');
 }
 study.dispose();study.dispose();assert.equal(textureReleased,1);
});
test('Leaning changes foreground alignment more than the distant house',()=>{
 const shift=(point,x)=>{
  const zEye=1.8,t=(0-zEye)/(point.z-zEye);
  return x+t*(point.x-x);
 };
 const near={x:-1.8,z:-4},far=HOUSE_POSITION;
 const foreground=Math.abs(shift(near,.42)-shift(near,-.42));
 const house=Math.abs(shift(far,.42)-shift(far,-.42));
 assert.ok(foreground<house,'The aperture-plane intersection shifts more for the distant point, changing the relative view');
 const angularShift=point=>Math.abs(Math.atan2(point.x-.42,1.8-point.z)-Math.atan2(point.x+.42,1.8-point.z));
 assert.ok(angularShift(near)>angularShift(far),'Near objects move more in the viewer image');
 assert.ok(Math.abs(foreground-house)>.10,'Leaning must shift foreground/house alignment by more than 10 cm at the aperture');
});
test('The independent scene is bounded, has a raised hill and supports release/reload',()=>{
 const study=createPeekWorld(),camera=new THREE.PerspectiveCamera();
 assert.ok(groundHeight(.9,-10)>groundHeight(0,-.1)+1);
 assert.ok(study.world.children.length<=10);
 let triangles=0;study.world.traverse(obj=>{if(obj.isMesh)triangles+=(obj.geometry.index?.count||obj.geometry.attributes.position.count)/3;});
 assert.ok(triangles<9000,'Keep the mock world much cheaper than the frame artwork');
 study.root.position.set(0,1.6,-1.8);camera.position.set(0,1.6,0);camera.updateMatrixWorld(true);study.update(camera);
 assert.equal(study.world.visible,true);
 study.setEnabled(false);study.update(camera);assert.equal(study.world.visible,false);assert.equal(study.closed.visible,true);
 study.setEnabled(true);camera.position.z=-1.85;camera.updateMatrixWorld(true);study.update(camera);assert.equal(study.world.visible,false);
 let released=0;const geometries=new Set();study.root.traverse(obj=>{if(obj.geometry)geometries.add(obj.geometry);});
 for(const geometry of geometries)geometry.addEventListener('dispose',()=>released++);
 study.dispose();study.dispose();assert.equal(released,geometries.size);assert.equal(study.disposed,true);assert.equal(study.root.children.length,0);
});
