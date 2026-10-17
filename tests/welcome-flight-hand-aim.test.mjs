import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeFlightLesson} from '../app/services/welcomeFlightLesson.js';

function flight(){
    const root=new THREE.Group(),dragon={group:new THREE.Group(),wings:[]},landing={material:{opacity:0}};
    root.add(dragon.group);
    return createWelcomeFlightLesson(root,dragon,landing);
}

test('RC flight follows the aimed hand while the stick remains a fine steering control',()=>{
    const lesson=flight(),source={gamepad:{axes:[0,0,0,0]}},pilot={source,trigger:true,reverse:false,aim:new THREE.Vector3(0,0,-1),up:new THREE.Vector3(0,1,0)};
    for(let i=0;i<20;i++)lesson.update(.05,'fly',pilot);
    const forward=lesson.snapshot().position;
    assert.ok(forward.z<-.3);
    pilot.aim.set(1,0,0);
    for(let i=0;i<20;i++)lesson.update(.05,'fly',pilot);
    const turned=lesson.snapshot().position;
    assert.ok(turned.x>forward.x+.15,'pointing the right hand right steers the companion right');
    const height=turned.y;
    pilot.aim.set(0,.65,-.76);
    for(let i=0;i<20;i++)lesson.update(.05,'fly',pilot);
    assert.ok(lesson.snapshot().position.y>height+.08,'raising the aim climbs');
    assert.ok(lesson.snapshot().position.x<3.5,'orientation remains bounded and smoothed');
});

test('hand lift and lower control altitude without throttle, and wrist turns steer freely',()=>{
    const lesson=flight(),source={gamepad:{axes:[0,0,0,0]}},pilot={source,trigger:false,reverse:false,aim:new THREE.Vector3(0,.65,-.76),up:new THREE.Vector3(0,1,0)};
    for(let i=0;i<24;i++)lesson.update(.05,'fly',pilot);
    const high=lesson.snapshot().position.y;
    assert.ok(high>.12,'lifting the controller climbs even after forward throttle is released');
    pilot.aim.set(0,-.65,-.76);
    for(let i=0;i<24;i++)lesson.update(.05,'fly',pilot);
    assert.ok(lesson.snapshot().position.y<high-.12,'lowering the controller descends without requiring throttle');
    const heading=lesson.snapshot().position;
    pilot.aim.set(1,0,0);
    for(let i=0;i<20;i++)lesson.update(.05,'fly',pilot);
    assert.ok(Math.abs(lesson.snapshot().position.y-heading.y)<.08,'turning the wrist does not create unintended climb');
});
