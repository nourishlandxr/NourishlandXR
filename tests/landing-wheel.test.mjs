import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {decayWheelVelocity,discoveryMomentumFactor,discoveryOrientation,gestureIntent,wheelGestureVelocity} from '../app/services/wheel-model.js';

const root=path.resolve(import.meta.dirname,'..');

test('horizontal wheel gestures preserve scrolling intent and calculate flick velocity',()=>{
 assert.equal(gestureIntent(6,5),'pending');
 assert.equal(gestureIntent(20,4),'rotate');
 assert.equal(gestureIntent(4,20),'scroll');
 assert.equal(wheelGestureVelocity([{x:10,at:0},{x:70,at:60}]),6);
 assert.ok(Math.abs(wheelGestureVelocity([{x:10,at:0},{x:15,at:100}])-.6)<.0001);
 assert.equal(wheelGestureVelocity([{x:10,at:0},{x:70,at:60}],2),6);
 assert.equal(wheelGestureVelocity([{x:70,at:0},{x:10,at:60}],2),-6);
 assert.equal(wheelGestureVelocity([{x:10,at:0},{x:70,at:60}],2,true),0);
});

test('vertical and diagonal wheel drags feed the bounded X rotation axis',()=>{
 assert.equal(gestureIntent(4,20,{allowVertical:true}),'rotate');
 assert.equal(wheelGestureVelocity([{x:10,y:20,at:0},{x:10,y:80,at:60}],0,false,'y'),6);
 assert.equal(wheelGestureVelocity([{x:10,y:20,at:0},{x:70,y:80,at:60}],0,false,'x'),6);
 assert.equal(wheelGestureVelocity([{x:10,y:20,at:0},{x:70,y:80,at:60}],0,false,'y'),6);
});

test('wheel momentum decelerates gradually and stops for reduced motion',()=>{
 const first=decayWheelVelocity(5,1/60),second=decayWheelVelocity(first,1/60);
 assert.ok(first<5&&first>4.8);
 assert.ok(second<first);
 assert.equal(decayWheelVelocity(.01,1/60),0);
 assert.equal(decayWheelVelocity(5,1/60,true),0);
});

test('discovery die varies its starting face and release without becoming erratic',()=>{
 assert.deepEqual(discoveryOrientation(0),{yaw:0,pitch:-.45});
 assert.deepEqual(discoveryOrientation(1.25),discoveryOrientation(.25));
 assert.ok(discoveryOrientation(.99).yaw<Math.PI*2);
 assert.equal(discoveryMomentumFactor(0),.94);
 assert.equal(discoveryMomentumFactor(.5),1);
 assert.equal(discoveryMomentumFactor(1),.94);
 assert.ok(discoveryMomentumFactor(.999)<1.06);
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
 assert.match(wheel,/event\.pointerType==='touch'\)return/);
 assert.match(wheel,/endPointerGesture/);
 assert.match(wheel,/host\.setPointerCapture\?\.\(event\.pointerId\)/);
 assert.match(wheel,/stepY/);
 assert.match(wheel,/pitchVelocity/);
 assert.match(wheel,/wheelGestureVelocity\(gesture\.samples,gesture\.inheritedPitchVelocity,reduced,'y'\)/);
 assert.match(css,/touch-action:none/);
 assert.match(wheel,/event\?\.type==='pointercancel'\)\{velocity=0;pitchVelocity=0/);
 assert.match(wheel,/roll\+=dt\*\.14/);
 assert.match(wheel,/new THREE\.SphereGeometry\(1\.72,12,6\)/);
 assert.match(wheel,/Math\.max\(5\.9,2\.18\/\(Math\.tan/);
 assert.match(css,/\.v2-living-wheel canvas,\.v2-living-wheel img\{position:absolute;inset:0;width:100%;height:100%/);
 assert.match(wheel,/host\.dataset\.faceCount/);
 assert.match(wheel,/living-knowledge-seed-atlas\.png/);
 assert.match(launch,/Interactive 120-faced botanical discovery die/);
 assert.doesNotMatch(wheel,/TorusGeometry|seed-core|central seedling|central chamber/);
 assert.doesNotMatch(css,/body[^{}]*touch-action\s*:\s*none/);
 assert.doesNotMatch(wheel+launch+css,/Spin sculpture|Pause spin|data-wheel-motion|v2-wheel-motion/);
 assert.doesNotMatch(wheel,/Space pauses|toggleMotion|syncMotionButton/);
});
