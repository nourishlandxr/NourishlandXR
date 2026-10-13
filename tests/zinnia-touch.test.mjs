import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../app/assets/fruit-window/vendor/GLTFLoader.js';
import {createZinniaTouchReactions,zinniaContacts} from '../app/services/zinniaTouchReactions.js';
import {createZinniaCharacter,animateZinniaCharacter,disposeZinniaCharacter} from '../app/services/zinniaCharacter.js';

test('contact distinguishes tickles, gentle head pats, abrupt touches and tracking jumps',()=>{
    const source={},touch=createZinniaTouchReactions();
    const move=(x,head=false,dt=.03)=>touch.update(dt,[{source,point:{x,y:.3,z:0},head}]);
    for(let i=0;i<20;i++)move(Math.sin(i*1.3)*.006);
    assert.equal(touch.snapshot().reaction,'tickle');
    const before=touch.snapshot();touch.update(0,[]);assert.deepEqual(touch.snapshot(),before);
    touch.reset();for(let i=0;i<15;i++)move(i*.001,true);
    assert.equal(touch.snapshot().reaction,'pat');
    move(.07,true);assert.equal(touch.snapshot().reaction,'pat');
    for(let i=0;i<90;i++)touch.update(.03,[]);assert.equal(touch.snapshot().reaction,null);
    touch.reset();move(0);move(.5);assert.equal(touch.snapshot().reaction,null);
    touch.reset();for(let i=0;i<20;i++){move(i%2*.008);touch.update(.03,[]);}assert.equal(touch.snapshot().reaction,null);
});

test('real bundled character receives transformed hand/pointer contact and recovers its face',async()=>{
    const bytes=fs.readFileSync(new URL('../app/assets/welcome-practice/zinnia.glb',import.meta.url));
    const root=createZinniaCharacter({load:()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')});await root.userData.zinnia.ready;
    const mount=new THREE.Group();mount.position.set(2,1,-3);mount.rotation.y=.8;mount.add(root);root.scale.setScalar(.75);mount.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(root),point=box.getCenter(new THREE.Vector3()),source={};
    try{
        assert.equal(zinniaContacts(root,[{source,tip:point}]).length,1);
        root.visible=false;assert.equal(zinniaContacts(root,[{source,tip:point}]).length,0);root.visible=true;
        const eye=root.getObjectByName('Eye_L_expression'),world=eye.getWorldPosition(new THREE.Vector3()),origin=world.clone().add(new THREE.Vector3(0,0,1)),direction=world.clone().sub(origin).normalize();
        const ray={origin,direction};assert.equal(zinniaContacts(root,[{source,ray,trigger:false}]).length,0);assert.equal(zinniaContacts(root,[{source,ray,trigger:true}]).length,1);
        let time=0;animateZinniaCharacter(root,time+=.03,false,{inputs:[{source,tip:point}]});animateZinniaCharacter(root,time+=.03,false,{inputs:[{source,tip:point}]});
        animateZinniaCharacter(root,time+=.03,false,{inputs:[{source,tip:point.clone().add(new THREE.Vector3(.04,0,0))}]});
        assert.notEqual(root.userData.zinnia.touch.snapshot().reaction,'sad');assert.equal(eye.morphTargetInfluences[eye.morphTargetDictionary.Sad],0);
        for(let i=0;i<95;i++)animateZinniaCharacter(root,time+=.03,false,{});
        assert.equal(root.userData.zinnia.touch.snapshot().reaction,null);assert.equal(eye.morphTargetInfluences[eye.morphTargetDictionary.Sad],0);
    }finally{disposeZinniaCharacter(root);}
});
