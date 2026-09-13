import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {decayWheelVelocity,gestureIntent,wheelGestureVelocity} from '../app/services/wheel-model.js';

const root=path.resolve(import.meta.dirname,'..');

test('horizontal wheel gestures preserve scrolling intent and calculate flick velocity',()=>{
 assert.equal(gestureIntent(6,5),'pending');
 assert.equal(gestureIntent(20,4),'rotate');
 assert.equal(gestureIntent(4,20),'scroll');
 assert.equal(wheelGestureVelocity([{x:10,at:0},{x:70,at:60}]),8);
 assert.ok(Math.abs(wheelGestureVelocity([{x:10,at:0},{x:15,at:100}])-.6)<.0001);
 assert.equal(wheelGestureVelocity([{x:10,at:0},{x:70,at:60}],2),8);
 assert.equal(wheelGestureVelocity([{x:70,at:0},{x:10,at:60}],2),-8);
 assert.equal(wheelGestureVelocity([{x:10,at:0},{x:70,at:60}],2,true),0);
});

test('vertical and diagonal wheel drags feed the bounded X rotation axis',()=>{
 assert.equal(gestureIntent(4,20,{allowVertical:true}),'rotate');
 assert.equal(wheelGestureVelocity([{x:10,y:20,at:0},{x:10,y:80,at:60}],0,false,'y'),8);
 assert.equal(wheelGestureVelocity([{x:10,y:20,at:0},{x:70,y:80,at:60}],0,false,'x'),8);
 assert.equal(wheelGestureVelocity([{x:10,y:20,at:0},{x:70,y:80,at:60}],0,false,'y'),8);
});

test('wheel momentum decelerates gradually and stops for reduced motion',()=>{
 const first=decayWheelVelocity(5,1/60),second=decayWheelVelocity(first,1/60);
 assert.ok(first<5&&first>4.8);
 assert.ok(second<first);
 assert.equal(decayWheelVelocity(.01,1/60),0);
 assert.equal(decayWheelVelocity(5,1/60,true),0);
});

test('landing wheel uses one pointer path and removes obsolete spin controls',()=>{
 const wheel=fs.readFileSync(path.join(root,'app/services/landingWheel.js'),'utf8');
 const launch=fs.readFileSync(path.join(root,'app/screens/launch.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'app/product-v2.css'),'utf8');
 assert.match(wheel,/pointerdown/);
 assert.match(wheel,/pointermove/);
 assert.match(wheel,/pointercancel/);
 assert.match(wheel,/event\.preventDefault\(\)/);
 assert.match(wheel,/requestAnimationFrame\(draw\)/);
 assert.match(wheel,/event\.pointerType==='mouse' && event\.button!==0/);
 assert.match(wheel,/host\.setPointerCapture\?\.\(event\.pointerId\)/);
 assert.match(wheel,/stepY/);
 assert.match(wheel,/pitchVelocity/);
 assert.match(wheel,/wheelGestureVelocity\(gesture\.samples,gesture\.inheritedPitchVelocity,reduced,'y'\)/);
 assert.match(css,/touch-action:none/);
 assert.match(wheel,/event\?\.type==='pointercancel'\)\{velocity=0;pitchVelocity=0/);
 assert.match(wheel,/roll\+=dt\*\.24/);
 assert.doesNotMatch(css,/body[^{}]*touch-action\s*:\s*none/);
 assert.doesNotMatch(wheel+launch+css,/Spin sculpture|Pause spin|data-wheel-motion|v2-wheel-motion/);
 assert.doesNotMatch(wheel,/Space pauses|toggleMotion|syncMotionButton/);
});
