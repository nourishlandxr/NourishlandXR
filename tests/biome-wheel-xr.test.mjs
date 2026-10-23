import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {biomeWheelSupport,wholeWheelPose} from '../app/services/biomeWheelPresentation.js';
const source=fs.readFileSync(new URL('../app/screens/biomeWheelXR.js',import.meta.url),'utf8');
test('biome access checks actual XR capabilities, independently handling rejected modes',async()=>{
 assert.deepEqual(await biomeWheelSupport(undefined,false),{'immersive-vr':false,'immersive-ar':false});
 assert.deepEqual(await biomeWheelSupport({isSessionSupported:async mode=>{if(mode==='immersive-vr')throw Error('unsupported');return true;}},true),{'immersive-vr':false,'immersive-ar':true});
 assert.deepEqual(await biomeWheelSupport({isSessionSupported:async()=>false},true),{'immersive-vr':false,'immersive-ar':false});
});
test('both modes place the entire wheel ahead of the visitor rather than putting them inside',()=>{
 for(const mode of ['immersive-ar','immersive-vr']){const p=wholeWheelPose({x:4,y:1.7,z:8},{x:0,y:0,z:0,w:1},mode);assert.equal(p.position[0],4);assert(p.position[2]<7);assert(Math.abs(p.position[1]-1.35)<1e-8);assert(p.width<2);}
 const turned=wholeWheelPose({x:0,y:1.7,z:0},{x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2},'immersive-vr');assert(Math.abs(turned.position[0]+2)<1e-8);assert(Math.abs(turned.position[2])<1e-8);
 const lookingUp=wholeWheelPose({x:0,y:1.7,z:0},{x:Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2},'immersive-ar');assert(lookingUp.position.every(Number.isFinite));
});
test('XR entry is linked from Demos, prepares current geometry first, and disposes its session',()=>{
 const portal=fs.readFileSync(new URL('../app/screens/accessPortal.js',import.meta.url),'utf8');assert(portal.includes("tool==='biome'"));assert(portal.includes("tool:'biome'"));
 assert(source.includes('current-landscape.bin'));assert(source.includes('if(!prepared){await prepare();return;}'));assert(source.includes('renderer.compile(scene,camera)'));assert(source.includes('renderer.render(scene,camera)'));assert(source.includes('scene.background=selected'));assert(source.includes("setReferenceSpaceType('local')"));assert(source.includes('observer?.disconnect()'));assert(source.includes('forceContextLoss()'));assert(!source.includes('wheel.rotation.y=(time'));
});
