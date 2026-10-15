import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeControlOrb} from '../app/services/welcomeControlOrb.js';
import {welcomeWristPose} from '../app/services/welcomeWristMenu.js';
import {createTutorialMagicBrush} from '../app/services/tutorialMagicBrush.js';
test('Orb hides during fruit and keeps learned skills when the controller experience returns',()=>{
 const root=new THREE.Group(),orb=createWelcomeControlOrb(root),source={handedness:'right',gamepad:{axes:[0,0,1,0],buttons:[]}},matrix=new THREE.Matrix4().makeTranslation(...orb.orbs.right.group.position.toArray()).elements;
 const input={source,matrix,down:false,trigger:false};root.updateMatrixWorld(true);
 try{orb.update(.05,'controls-stick',[input]);assert.equal(orb.snapshot().radius,.072);orb.update(.05,'fruit',[input]);assert.equal(orb.snapshot().visible,false);orb.update(.05,'controls-stick',[input]);orb.update(.05,'controls-stick',[{...input,down:true}]);assert.equal(orb.isHolding(source),true);orb.update(.05,'controls-stick',[{...input,down:true,trigger:true}]);assert.equal(orb.snapshot().opened,true);assert.ok(orb.snapshot().rotation>0);orb.update(.05,'fruit',[input]);assert.equal(orb.isHolding(source),false);orb.reset({keepSkills:true});orb.update(.05,'controls-stick',[input]);assert.equal(orb.snapshot().visible,true);assert.ok(orb.snapshot().skills.includes('controls-orb-open'));}
 finally{orb.destroy();}
});
test('paint palette clears the controller on its side and starts with one fine line',()=>{
 const pose=welcomeWristPose(new THREE.Matrix4().elements,{controllerMounted:true,width:.16,height:900,centerOffset:{x:.12,y:0}});assert.ok(pose.center.dot(pose.right)>.22);
 const root=new THREE.Group(),brush=createTutorialMagicBrush(root,{controllerOnly:true});try{assert.equal(brush.paint.snapshot().width,.001);assert.equal(brush.paint.snapshot().brush,'plain');assert.equal(brush.paint.snapshot().motion,false);}finally{brush.destroy();}
});
