import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeControlOrb} from '../app/services/welcomeControlOrb.js';
import {WELCOME_PRACTICE_LESSONS} from '../app/services/welcomePracticeContent.js';

test('the Orbs are introduced first, keys follow, then Orb activities',()=>{
 const ids=WELCOME_PRACTICE_LESSONS.map(lesson=>lesson.id);
 assert.ok(ids.indexOf('controls-orb-intro')<ids.indexOf('controls-trigger'));
 assert.ok(ids.indexOf('controls-orb-intro')<ids.indexOf('controls-grip'));
 assert.ok(ids.indexOf('controls-trigger')<ids.indexOf('controls-orb-grab'));
 assert.ok(ids.indexOf('controls-grip')<ids.indexOf('controls-orb-grab'));
 assert.ok(ids.indexOf('controls-orb-open')<ids.indexOf('controls-face'));
});

test('either hand can grab either practice Orb while collisions keep the pair apart',()=>{
 const root=new THREE.Group(),practice=createWelcomeControlOrb(root),rightHand={handedness:'right',gamepad:{axes:[0,0,0,0],buttons:[]}};
 const input={source:rightHand,matrix:new THREE.Matrix4().makeTranslation(-.29,.2,.14).toArray(),down:false,trigger:false};
 root.updateMatrixWorld(true);
 try{
  practice.update(.016,'controls-orb-grab',[input],[],{visible:true});
  input.down=true;practice.update(.016,'controls-orb-grab',[input],[],{visible:true});
  assert.equal(practice.isHolding(rightHand),true,'right hand may grab the left Orb');
  input.matrix=new THREE.Matrix4().makeTranslation(.28,.2,.14).toArray();
  practice.update(.016,'controls-orb-grab',[input],[],{visible:true});
  const {left,right}=practice.snapshot().orbs;
  assert.ok(Math.hypot(left.position[0]-right.position[0],left.position[1]-right.position[1],left.position[2]-right.position[2])>=.143,'the Orbs do not pass through each other');
 }finally{practice.destroy();}
});

test('Orb interactions unlock during key practice so users can learn while holding one',()=>{
 const root=new THREE.Group(),practice=createWelcomeControlOrb(root),hand={handedness:'right',gamepad:{axes:[0,0,0,0],buttons:[]}};
 const input={source:hand,matrix:new THREE.Matrix4().makeTranslation(-.29,.2,.14).toArray(),down:false,trigger:false};
 root.updateMatrixWorld(true);
 try{
  practice.update(.016,'controls-orb-intro',[input],[],{visible:true});
  practice.update(.016,'controls-trigger',[input],[],{visible:true});
  input.down=true;practice.update(.016,'controls-trigger',[input],[],{visible:true});
  assert.equal(practice.isHolding(hand),true,'grabbing is already available during trigger practice');
  input.trigger=true;practice.update(.016,'controls-trigger',[input],[],{visible:true});
  assert.equal(practice.snapshot().orbs.left.opened,true,'trigger practice can open the held Orb');
 }finally{practice.destroy();}
});
