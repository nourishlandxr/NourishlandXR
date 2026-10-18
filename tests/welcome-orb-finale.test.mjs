import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeOrbCoinTrail,ORB_COIN_PHASE} from '../app/services/welcomeOrbCoinTrail.js';
import {CONTROL_ORB_PHASES,createWelcomeControlOrb} from '../app/services/welcomeControlOrb.js';
import {WELCOME_PRACTICE_LESSONS} from '../app/services/welcomePracticeContent.js';
import {playWelcomePracticeFeedback} from '../app/services/welcomePracticeFeedback.js';

test('Orb controls finish with a compact yellow-dot collection game',()=>{
    const ids=WELCOME_PRACTICE_LESSONS.map(lesson=>lesson.id),finale=WELCOME_PRACTICE_LESSONS.find(lesson=>lesson.id===ORB_COIN_PHASE);
    assert.equal(ids[ids.indexOf('settings-close')+1],ORB_COIN_PHASE);
    assert.equal(ids[ids.indexOf(ORB_COIN_PHASE)+1],'laser-intro');
    assert.ok(CONTROL_ORB_PHASES.includes(ORB_COIN_PHASE));
    assert.equal(finale.spoken,'Collect them all.');
    assert.match(finale.caption,/Roll either Orb through every yellow dot/);
});

test('either Orb can collect every tiny mesh coin and each contact reports feedback',()=>{
    const root=new THREE.Group(),events=[],trail=createWelcomeOrbCoinTrail(root,{onCollect:(source,count,total)=>events.push({source,count,total})}),source={handedness:'right'},target={position:new THREE.Vector3(),source};
    try{
        trail.update(.016,true,[target]);
        const coins=trail.group.children;assert.equal(coins.length,18);assert.ok(coins.every(coin=>coin.geometry.type==='IcosahedronGeometry'));
        for(const coin of coins){target.position.copy(coin.position);trail.update(.016,true,[target]);}
        assert.equal(trail.complete,true);assert.equal(events.length,18);assert.equal(events.at(-1).source,source);assert.equal(events.at(-1).count,events.at(-1).total);
        assert.ok(coins.every(coin=>coin.scale.lengthSq()===0));
    }finally{trail.destroy();}
});

test('the finale keeps each thumbstick assigned to its own Orb from a distance',()=>{
    const root=new THREE.Group(),orbs=createWelcomeControlOrb(root),buttons=Array.from({length:6},()=>({pressed:false})),source={handedness:'left',gamepad:{axes:[0,0,.9,0],buttons}},input={source,matrix:new THREE.Matrix4().makeTranslation(0,1,0).elements,down:false,trigger:false};root.updateMatrixWorld(true);
    try{orbs.update(.05,ORB_COIN_PHASE,[input]);const before=orbs.orbs.left.group.position.x;for(let i=0;i<10;i++)orbs.update(.05,ORB_COIN_PHASE,[input]);assert.ok(orbs.orbs.left.group.position.x>before);assert.equal(orbs.orbs.right.group.position.x,.29);}finally{orbs.destroy();}
});

test('coin feedback is a short sound and light haptic tap',()=>{
    const sounds=[],pulses=[],source={};playWelcomePracticeFeedback({sound:value=>sounds.push(value),pulse:(...value)=>pulses.push(value)},'coin',source,.5);
    assert.deepEqual(sounds,['practice-press']);assert.deepEqual(pulses,[[source,.16,35]]);
});

test('Living Frame exposes a working Skip step action throughout the tutorial',()=>{
    const source=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    assert.match(source,/next\.textContent='Skip step'/);
    assert.match(source,/next\.onclick=\(\)=>welcomePractice\?\.stage\.button\('skip-step'\)/);
    assert.match(source,/if\(practice\?\.active\)\{practice\.stage\.button\('skip-step'\);return true;\}/);
});
