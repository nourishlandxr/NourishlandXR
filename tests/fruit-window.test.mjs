import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {FruitWindowGripPair,fruitWindowSpecies,fruitWindowModes,fruitWindowCanPick} from '../app/services/fruitWindowInteraction.js';
const anchor=()=>({position:new THREE.Vector3(0,1,-1),quaternion:new THREE.Quaternion()});
test('Species identity matches botanical and common names; unsupported PIMO stays explicit',()=>{
    assert.equal(fruitWindowSpecies({scientific:'Cajanus cajan'}).id,'pigeon_pea_fresh');
    assert.equal(fruitWindowSpecies({plant:'African peach'}).id,'african_peach');
    assert.equal(fruitWindowSpecies({scientific:'Morella rubra'}).id,'chinese_bayberry');
    assert.equal(fruitWindowSpecies({plant:'Moringa'}),null);
    assert.deepEqual(fruitWindowModes(['tag','curiosity','explore']),['tag','curiosity']);
    assert.deepEqual(fruitWindowModes(['tag','curiosity','explore'],true),['tag','curiosity','explore']);
});
test('One grip cannot move; the second joins without a jump; either release freezes movement',()=>{
    const grips=new FruitWindowGripPair(),left={},right={},model=anchor();
    grips.press(left,'left',{x:-.3,y:1,z:-.5});
    grips.update(new Map([[left,{x:5,y:4,z:1}]]),model);assert.deepEqual(model.position.toArray(),[0,1,-1]);
    grips.press(right,'right',{x:5.6,y:4,z:1});
    grips.update(new Map([[left,{x:5,y:4,z:1}],[right,{x:5.6,y:4,z:1}]]),model);assert.deepEqual(model.position.toArray(),[0,1,-1]);
    assert.equal(grips.update(new Map([[left,{x:6,y:4,z:1}],[right,{x:6.6,y:4,z:1}]]),model),true);assert.ok(model.position.distanceTo(new THREE.Vector3(1,1,-1))<1e-10);
    grips.release(left);const frozen=model.position.clone();grips.update(new Map([[right,{x:8,y:3,z:1}]]),model);assert.ok(model.position.equals(frozen));
});
test('Lost tracking, duplicate handles and crossed short grip pairs cannot move the window',()=>{
    const grips=new FruitWindowGripPair(),left={},right={},model=anchor();
    assert.equal(grips.press(left,'left',{x:-.3,y:1,z:0}),true);assert.equal(grips.press(right,'left',{x:.3,y:1,z:0}),false);
    grips.press(right,'right',{x:.3,y:1,z:0});grips.update(new Map([[left,{x:-.3,y:1,z:0}],[right,{x:.3,y:1,z:0}]]),model);
    assert.equal(grips.update(new Map([[right,{x:9,y:1,z:0}]]),model),false);assert.equal(grips.owns(left),false);assert.deepEqual(model.position.toArray(),[0,1,-1]);
    grips.reset();assert.equal(grips.press(left,'left',{x:NaN,y:1,z:0}),false);
    grips.press(left,'left',{x:-.01,y:1,z:0});grips.press(right,'right',{x:.01,y:1,z:0});assert.equal(grips.update(new Map([[left,{x:-.01,y:1,z:0}],[right,{x:.01,y:1,z:0}]]),model),false);
});
test('Moving two grips rotates a rigid window without changing its size',()=>{
    const grips=new FruitWindowGripPair(),left={},right={},model=anchor();grips.press(left,'left',{x:-.3,y:1,z:0});grips.press(right,'right',{x:.3,y:1,z:0});
    grips.update(new Map([[left,{x:-.3,y:1,z:0}],[right,{x:.3,y:1,z:0}]]),model);
    grips.update(new Map([[left,{x:0,y:1,z:.6}],[right,{x:0,y:1,z:-.6}]]),model);
    assert.ok(Math.abs(model.position.length()-Math.sqrt(2))<1e-10);assert.ok(Math.abs(model.quaternion.length()-1)<1e-10);
    assert.ok(new THREE.Vector3(1,0,0).applyQuaternion(model.quaternion).distanceTo(new THREE.Vector3(0,0,-1))<1e-10);
});
test('The harvest arrow and picking exclude immature, picked and returning fruit',()=>{
    assert.equal(fruitWindowCanPick({canPick:false}),false);assert.equal(fruitWindowCanPick({canPick:true}),true);assert.equal(fruitWindowCanPick({canPick:true,picked:true}),false);assert.equal(fruitWindowCanPick({canPick:true,motion:{}}),false);
});
