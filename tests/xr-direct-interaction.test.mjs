import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {fruitInsidePalm,trackedPalmPoint,directPanelPress} from '../app/services/xrDirectInteraction.js';
import {handIndexCanPoke,createHandPokeTracker} from '../app/services/handPoke.js';

test('palm contact follows wrist rotation, and ignores fingertip motion',()=>{
    const palm=new THREE.Matrix4().makeRotationY(.8).setPosition(.4,1.2,-.6);
    const world=p=>new THREE.Vector3(...p).applyMatrix4(palm);
    assert.equal(fruitInsidePalm(palm,world([.02,.02,0])),true);
    for(const p of [[.08,0,0],[0,.08,0],[0,0,.09]])assert.equal(fruitInsidePalm(palm,world(p)),false);
    const joints=new Map();for(const f of ['index','middle','ring','pinky'])for(const j of ['metacarpal','phalanx-proximal'])joints.set(f+'-finger-'+j,{x:.4,y:1.2,z:-.6});
    const before=trackedPalmPoint(joints);joints.set('index-finger-tip',{x:20,y:30,z:40});assert.ok(before.equals(trackedPalmPoint(joints)));
    joints.delete('ring-finger-metacarpal');assert.equal(trackedPalmPoint(joints),null);
});

test('panel accepts nearby controller buttons, rejects distant rays, hands, grips and background',()=>{
    const source={},ray={},target={distance:.08,button:{action:'Pause'}};
    assert.equal(directPanelPress(source,ray,target),true);
    for(const [s,t,type] of [[source,{...target,distance:1},'selectstart'],[{hand:{}},target,'selectstart'],[source,target,'squeezestart'],[source,{distance:.08},'selectstart'],[source,{...target,button:{disabled:true}},'selectstart']])assert.equal(directPanelPress(s,ray,t,type),false);
});

test('open hands cannot poke; pointing with the other fingers curled can',()=>{
    const rawJoints=new Map([['wrist',{x:0,y:0,z:0}],['index-finger-phalanx-proximal',{x:0,y:.06,z:0}],['index-finger-phalanx-intermediate',{x:0,y:.1,z:0}],['index-finger-tip',{x:0,y:.15,z:0}]]);
    for(const f of ['middle','ring','pinky']){rawJoints.set(f+'-finger-phalanx-proximal',{x:.02,y:.06,z:0});rawJoints.set(f+'-finger-tip',{x:.02,y:.15,z:0});}
    const state={tracked:true,pinch:false,rawJoints};assert.equal(handIndexCanPoke(state),false);
    for(const f of ['middle','ring'])rawJoints.set(f+'-finger-tip',{x:.02,y:.045,z:.015});assert.equal(handIndexCanPoke(state),true);
    state.pinch=true;assert.equal(handIndexCanPoke(state),false);
});

test('deliberate front approach presses once; quick and sideways brushes do not',()=>{
    const tracker=createHandPokeTracker(),sample=(z,time,action='Pause')=>tracker.update({x:0,y:0,z,radius:.008},{signedDistance:z,card:{id:'control'},button:{action}},time);
    assert.equal(sample(.03,0),false);assert.equal(sample(.006,40),false,'fast brush');tracker.reset();
    for(const t of [100,140,180,220])assert.equal(sample(.03,t),false);
    assert.equal(sample(.006,260),true);assert.equal(sample(.005,300),false);
    assert.equal(sample(.005,340,'Next'),false,'sliding onto another button');
    sample(.03,380,'Next');sample(.03,420,'Next');sample(.03,460,'Next');sample(.03,500,'Next');assert.equal(sample(.006,540,'Next'),true);
});
