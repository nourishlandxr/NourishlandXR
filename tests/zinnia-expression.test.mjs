import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../app/assets/fruit-window/vendor/GLTFLoader.js';
import {createZinniaCharacter,animateZinniaCharacter,disposeZinniaCharacter} from '../app/services/zinniaCharacter.js';
import {createWelcomeObjectReveal} from '../app/services/welcomeObjectReveal.js';
import {createZinniaFramePerch,ZINNIA_FRAME_PERCH} from '../app/services/zinniaFramePerch.js';

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
        tick({speechLevel:.65});assert.ok(mouth.morphTargetInfluences[map.Round]>.7);
        tick({speechLevel:0});assert.ok(mouth.morphTargetInfluences[map.Open]<.0001);assert.ok(mouth.morphTargetInfluences[map.Round]<.0001);
        let sawBlink=false;for(let i=0;i<180;i++){time+=.03;animateZinniaCharacter(root,time,false,{focused:true,speechLevel:0});sawBlink ||= eye.morphTargetInfluences[eye.morphTargetDictionary.Blink]>.8;}assert.equal(sawBlink,true);
    }finally{disposeZinniaCharacter(root);}
});
