import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../app/assets/fruit-window/vendor/GLTFLoader.js';
import {createZinniaCharacter,animateZinniaCharacter,disposeZinniaCharacter} from '../app/services/zinniaCharacter.js';
import {createWelcomeObjectReveal} from '../app/services/welcomeObjectReveal.js';
import {createZinniaFramePerch,ZINNIA_FRAME_PERCH} from '../app/services/zinniaFramePerch.js';

test('demo character resets a previous lesson clock and uploads facial morphs through the XR renderer',async(t)=>{
    let frameTime=0;t.mock.method(performance,'now',()=>frameTime);
    const bytes=fs.readFileSync(new URL('../app/assets/welcome-practice/zinnia.glb',import.meta.url));
    const character=createZinniaCharacter({load:()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')});await character.userData.zinnia.ready;
    character.userData.zinnia.time=10000;character.userData.zinnia.paused=true;character.userData.zinnia.guide.holder.visible=false;
    const oldDocument=globalThis.document,calls=[],attributes=['p','n','uv','c','i0','i1','i2','i3','ic'];globalThis.document={createElement:()=>({})};
    const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getExtension:()=>null,getParameter:()=>1024,getAttribLocation:(_p,name)=>attributes.indexOf(name),getUniformLocation:(_p,name)=>name},{get(target,key){if(key in target)return target[key];if(key===key.toUpperCase())return key;if(key.startsWith('create'))return ()=>({});return (...args)=>calls.push([key]);}});
    const perch=createZinniaFramePerch({character,getVoice:()=>({status:()=>({playing:true,paused:false}),speechLevel:()=>.4})});
    try{
        assert.equal(character.userData.zinnia.time,null);assert.equal(character.userData.zinnia.guide.holder.visible,true);
        perch.attach(gl);perch.show(0,{immediate:true});
        const identity=new THREE.Matrix4().elements,pose=new THREE.Matrix4().makeTranslation(0,1.4,-2).elements,viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;
        const view={projectionMatrix:identity,transform:{matrix:viewer,inverse:{matrix:new THREE.Matrix4().fromArray(viewer).invert().elements}}};
        for(frameTime=0;frameTime<1000;frameTime+=30){perch.draw(view,pose,frameTime,[],viewer);perch.draw(view,pose,frameTime,[],viewer);}
        assert.ok(character.userData.zinnia.guide.snapshot().mouthOpen>.5);
        assert.ok(character.userData.zinnia.guide.snapshot().visibleAge>.8);
        assert.ok(calls.some(call=>call[0]==='bufferSubData'),'animated face reaches GPU buffers');
        assert.ok(calls.some(call=>call[0]==='drawArrays'),'character is drawn in XR');
        const ray={origin:{x:ZINNIA_FRAME_PERCH.x,y:1.4+ZINNIA_FRAME_PERCH.y+.15,z:0},direction:{x:0,y:0,z:-1}};assert.equal(perch.hit(ray,pose)?.kind,'zinnia');
        const moved=new THREE.Matrix4().makeTranslation(.5,1.4,-2).elements;let boundsPasses=0;const update=perch.characterMount.updateWorldMatrix.bind(perch.characterMount);perch.characterMount.updateWorldMatrix=(...args)=>{boundsPasses++;return update(...args);};
        assert.equal(perch.hit({...ray,origin:{...ray.origin,x:ray.origin.x+.5}},moved)?.kind,'zinnia');assert.equal(boundsPasses,0,'following frame motion reuses the local collider');
    }finally{perch.destroy();globalThis.document=oldDocument;}
});

test('actual demo perch faces outward and follows its narration without a coordinator owner',async()=>{
    const bytes=fs.readFileSync(new URL('../app/assets/welcome-practice/zinnia.glb',import.meta.url));
    const character=createZinniaCharacter({load:()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')});await character.userData.zinnia.ready;
    let paused=false,playing=true;
    const perch=createZinniaFramePerch({character,getVoice:()=>({status:()=>({playing,paused}),speechLevel:()=>playing?.4:0})});
    const pose=new THREE.Matrix4().makeTranslation(0,1.4,-2).elements,view={transform:{matrix:new THREE.Matrix4().makeTranslation(0,1.6,0).elements}};
    try{
        assert.equal(perch.characterMount.rotation.y,0);assert.ok(ZINNIA_FRAME_PERCH.z>.215);
        for(let t=0;t<1200;t+=30)perch.update(view,pose,t);
        assert.ok(character.userData.zinnia.guide.snapshot().mouthOpen>.5);
        assert.ok(character.userData.zinnia.guide.snapshot().eyeSmile<.1);
        const head=character.getObjectByName('Head_nod_root');const facing=new THREE.Vector3(0,0,1).transformDirection(head.matrixWorld);assert.ok(facing.z>.8);
        paused=true;playing=false;perch.update(view,pose,1230);assert.equal(character.userData.zinnia.speechLevel,0);
    }finally{perch.destroy();}
});

test('Zinnia points at a world target through a rotated mount, holds on pause and reacts once per cue',async()=>{
    const bytes=fs.readFileSync(new URL('../app/assets/welcome-practice/zinnia.glb',import.meta.url));
    const root=createZinniaCharacter({load:()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')});await root.userData.zinnia.ready;
    const mount=new THREE.Group();mount.position.set(2,1,-3);mount.rotation.y=.8;mount.add(root);root.scale.setScalar(.75);mount.updateMatrixWorld(true);
    const targetWorld=root.localToWorld(new THREE.Vector3(.3,.2,.2));let time=0;
    const tick=options=>{for(let i=0;i<90;i++){time+=.03;animateZinniaCharacter(root,time,false,options);}};
    try{
        tick({cue:{id:'point',intent:'explain'},targetWorld,focused:true});
        const right=root.getObjectByName('Leaf_arm_R').userData.guidePivot,left=root.getObjectByName('Leaf_arm_L').userData.guidePivot;
        assert.ok(right.quaternion.angleTo(new THREE.Quaternion())>.1);assert.ok(left.quaternion.angleTo(new THREE.Quaternion())<.01);
        right.updateWorldMatrix(true,false);const desired=right.parent.worldToLocal(targetWorld.clone()).sub(right.position).normalize();
        const actual=new THREE.Vector3(1,.1,.2).normalize().applyQuaternion(right.quaternion);assert.ok(actual.dot(desired)>.99);
        const head=root.getObjectByName('Head_nod_root').userData.guidePivot,pose=head.quaternion.clone(),arm=right.quaternion.clone(),age=root.userData.zinnia.guide.snapshot().visibleAge;
        tick({paused:true,cue:{id:'point',intent:'explain'},targetWorld});assert.ok(head.quaternion.angleTo(pose)<.000001);assert.ok(right.quaternion.angleTo(arm)<.000001);assert.equal(root.userData.zinnia.guide.snapshot().visibleAge,age);
        animateZinniaCharacter(root,time+=.03,false,{cue:{id:'success',intent:'celebrate'}});assert.equal(root.userData.zinnia.guide.snapshot().celebrating,true);
        tick({cue:{id:'success',intent:'celebrate'}});assert.equal(root.userData.zinnia.guide.snapshot().celebrating,false);
        animateZinniaCharacter(root,time+=.03,false,{cue:{id:'success-replay',intent:'celebrate'}});assert.equal(root.userData.zinnia.guide.snapshot().celebrating,true);
    }finally{disposeZinniaCharacter(root);}
});

test('table fades in promptly without a bright silhouette; Zinnia retains her slow reveal',()=>{
    const table=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),character=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());
    const fast=createWelcomeObjectReveal(table,{duration:.9,glowStrength:0}),slow=createWelcomeObjectReveal(character);
    fast.update(.45);assert.ok(table.material.opacity>.5);assert.equal(table.children[0].visible,false);
    slow.update(.45);assert.equal(character.material.opacity,0);assert.equal(character.children[0].visible,true);
    fast.update(.9);assert.equal(table.material.opacity,1);assert.equal(table.material.transparent,false);
    fast.removeGlow();slow.removeGlow();table.geometry.dispose();table.material.dispose();character.geometry.dispose();character.material.dispose();
});

test('actual Zinnia opens focused eyes and speech morphs open across the face rather than into depth',async()=>{
    const bytes=fs.readFileSync(new URL('../app/assets/welcome-practice/zinnia.glb',import.meta.url));
    const root=createZinniaCharacter({load:()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')});await root.userData.zinnia.ready;
    let time=0;const tick=options=>{for(let i=0;i<30;i++){time+=.03;animateZinniaCharacter(root,time,false,options);}};
    try{
        tick({speechLevel:0});const eye=root.getObjectByName('Eye_L_expression'),mouth=root.getObjectByName('Mouth_speech'),smile=eye.morphTargetDictionary.Smile;
        const idle=eye.morphTargetInfluences[smile];assert.ok(idle>.6);
        tick({focused:true,speechLevel:0});assert.ok(eye.morphTargetInfluences[smile]<.01);assert.equal(eye.userData.catchlight.visible,true);
        tick({speechLevel:.35});const map=mouth.morphTargetDictionary;assert.ok(mouth.morphTargetInfluences[map.Open]>.4);assert.ok(mouth.morphTargetInfluences[map.Round]>.05);
        const delta=mouth.geometry.morphAttributes.position[map.Open],rotation=new THREE.Matrix4().makeRotationFromQuaternion(mouth.quaternion);let vertical=0,depth=0;
        for(let i=0;i<delta.count;i++){const p=new THREE.Vector3(delta.getX(i),delta.getY(i),delta.getZ(i)).applyMatrix4(rotation);vertical=Math.max(vertical,Math.abs(p.y));depth=Math.max(depth,Math.abs(p.z));}
        assert.ok(vertical>.04);assert.ok(depth<.00001);
        assert.ok(mouth.morphTargetInfluences[map.Wide]>.05);assert.ok(Number.isInteger(map.Narrow));assert.ok(Number.isInteger(map.Closed));
        const wide=mouth.morphTargetInfluences[map.Wide];tick({speechLevel:.35});assert.ok(Math.abs(mouth.morphTargetInfluences[map.Wide]-wide)>.01,'constant audio energy still varies the vowel shape');
        tick({speechLevel:.65});assert.ok(mouth.morphTargetInfluences[map.Round]>.3);
        tick({speechLevel:0});assert.ok(mouth.morphTargetInfluences[map.Open]<.0001);assert.ok(mouth.morphTargetInfluences[map.Round]<.0001);assert.equal(mouth.morphTargetInfluences[map.Wide],0);assert.equal(mouth.morphTargetInfluences[map.Narrow],0);
        let sawBlink=false;for(let i=0;i<180;i++){time+=.03;animateZinniaCharacter(root,time,false,{focused:true,speechLevel:0});sawBlink ||= eye.morphTargetInfluences[eye.morphTargetDictionary.Blink]>.8;}assert.equal(sawBlink,true);
    }finally{disposeZinniaCharacter(root);}
});


test('bundled Zinnia batches every petal and separates the saucer while keeping elastic gaze',async()=>{
 const bytes=fs.readFileSync(new URL('../app/assets/welcome-practice/zinnia.glb',import.meta.url));
 const root=createZinniaCharacter({load:()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')});await root.userData.zinnia.ready;
 try{let meshes=0,morphs=0,unbatched=0;root.traverse(n=>{if(n.isMesh){meshes++;if(n.morphTargetInfluences?.length)morphs++;if(/(?:^|_)petal_\d/i.test(n.name))unbatched++;}});assert.equal(meshes,31);assert.equal(morphs,5);assert.equal(unbatched,0);assert.equal(root.userData.zinnia.guide.snapshot().petalBatches,5);
 root.updateMatrixWorld(true);const pot=new THREE.Box3().setFromObject(root.getObjectByName('Pot')),dish=new THREE.Box3().setFromObject(root.getObjectByName('Saucer'));assert.ok(dish.max.y<pot.min.y,'saucer no longer intersects the pot');
 let boundsCalls=0;const update=root.updateWorldMatrix.bind(root);root.updateWorldMatrix=(...args)=>{boundsCalls++;return update(...args);};
 // An idle controller pointer must not traverse the animated mesh hierarchy.
 const {zinniaContacts}=await import('../app/services/zinniaTouchReactions.js');assert.deepEqual(zinniaContacts(root,[{source:{},trigger:false,down:false}]),[]);assert.equal(boundsCalls,0);
 const targetWorld=new THREE.Vector3(.7,.4,.3);for(let i=0;i<90;i++)animateZinniaCharacter(root,i*.03,false,{targetWorld});const state=root.userData.zinnia.guide.snapshot();assert.ok(Math.abs(state.bodyYaw)>.03);assert.ok(Math.abs(state.bodyLean)>.02);
 }finally{disposeZinniaCharacter(root);}
});

test('centred fruit cradle stays clear of both leaves and both hands support it',async()=>{
 const bytes=fs.readFileSync(new URL('../app/assets/welcome-practice/zinnia.glb',import.meta.url));
 const root=createZinniaCharacter({load:()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')});await root.userData.zinnia.ready;
 const guide=root.userData.zinnia.guide;guide.presentFruit();
 try{
  const viewer=new THREE.Matrix4().makeTranslation(0,.42,1).elements;
  for(let i=0;i<120;i++)animateZinniaCharacter(root,i*.03,false,{viewer,contacts:[]});root.updateMatrixWorld(true);
  const socket=guide.fruitSocket(),fruit=socket.getWorldPosition(new THREE.Vector3());
  assert.equal(socket,guide.fruitSocket('L'));assert.equal(socket,guide.fruitSocket('R'));assert.equal(socket.parent,root);
  const leaves=['L','R'].map(side=>new THREE.Box3().setFromObject(guide.leaf(side))),centres=leaves.map(box=>box.getCenter(new THREE.Vector3()));
  assert.ok(centres[0].x<fruit.x && centres[1].x>fruit.x,'leaves flank the fruit');
  for(let i=0;i<2;i++){assert.ok(centres[i].y<fruit.y-.04);assert.ok(leaves[i].max.y<fruit.y-.025,'most of the 8.5 cm fruit clears the leaves');assert.ok(centres[i].distanceTo(fruit)<.13);}
  guide.releaseFruit();assert.equal(guide.snapshot().presentingFruit,false);
 }finally{disposeZinniaCharacter(root);}
});

test('greeting and farewell wave once, freeze on pause and return to rest',async()=>{
 const bytes=fs.readFileSync(new URL('../app/assets/welcome-practice/zinnia.glb',import.meta.url));
 const root=createZinniaCharacter({load:()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')});await root.userData.zinnia.ready;
 let time=0;const guide=root.userData.zinnia.guide,viewer=new THREE.Matrix4().makeTranslation(0,.42,1).elements;
 try{for(const intent of ['greet','farewell']){
  const cue={id:intent,intent};for(let i=0;i<30;i++)animateZinniaCharacter(root,time+=.03,false,{cue,viewer,contacts:[]});
  assert.equal(guide.snapshot().gesture,intent);const right=guide.leaf('R').userData.guidePivot,left=guide.leaf('L').userData.guidePivot;
  assert.ok(right.quaternion.angleTo(new THREE.Quaternion())>.5);if(intent==='farewell')assert.ok(left.quaternion.angleTo(new THREE.Quaternion())>.5);
  const pose=right.quaternion.clone(),age=guide.snapshot().gestureAge;for(let i=0;i<10;i++)animateZinniaCharacter(root,time+=.03,false,{cue,viewer,paused:true,contacts:[]});
  assert.equal(guide.snapshot().gestureAge,age);assert.ok(right.quaternion.angleTo(pose)<.000001);
  for(let i=0;i<170;i++)animateZinniaCharacter(root,time+=.03,false,{cue,viewer,contacts:[]});assert.equal(guide.snapshot().gesture,null);assert.ok(right.quaternion.angleTo(new THREE.Quaternion())<.01);
 }}finally{disposeZinniaCharacter(root);}
});
