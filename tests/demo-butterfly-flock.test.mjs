import test from 'node:test';
import assert from 'node:assert/strict';
import {BUTTERFLY_VARIANTS,butterflySocialOffset,butterflyPanelPerch,butterflySocialPoint} from '../app/services/demoButterflyFlock.js';
import {butterflyPoseCacheKey,BUTTERFLY_FLIGHT_SPEED} from '../app/services/demoButterflyModel.js';
import {demoButterflyPose,BUTTERFLY_MOVEMENT_SPEED} from '../app/services/demoButterflyPose.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../app/vendor/three.module.min.js';
import {BUTTERFLY_RENDER_BUDGETS} from '../app/services/demoButterflyModel.js';

test('six new colours join the original two 30% smaller, with distinct panel perches',()=>{
 assert.deepEqual(BUTTERFLY_VARIANTS.map(v=>v.id),['blue','red','yellow','green','white','transparent','purple','orange']);
 assert.equal(BUTTERFLY_VARIANTS[0].size,.13/2*.7);assert.equal(BUTTERFLY_VARIANTS[1].size,.11/2*.7);
 assert.ok(BUTTERFLY_VARIANTS.some(v=>v.surface==='image'));
 const perch={center:{x:0,y:1,z:-1},right:{x:1,y:0,z:0}};
 const points=BUTTERFLY_VARIANTS.map(v=>butterflyPanelPerch({...perch,center:{...perch.center,x:v.side==='left'?-.3:.3}},v).center.x);
 assert.equal(new Set(points).size,8);assert.ok(points.every(x=>Math.abs(x)<=.3));
 assert.equal(BUTTERFLY_VARIANTS.find(v=>v.id==='transparent').wingOpacity,.28);
 for(const v of BUTTERFLY_VARIANTS)assert.equal(demoButterflyPose(2000,0,{perchMs:v.perchMs,seed:v.seed}).flight,0);
});
test('flight speeds increase without user close approaches; resting remains calm',()=>{
 assert.equal(BUTTERFLY_MOVEMENT_SPEED,1.55);assert.equal(BUTTERFLY_FLIGHT_SPEED,4.2);
 for(const v of BUTTERFLY_VARIANTS)for(let t=0;t<180000;t+=777){const pose=demoButterflyPose(t,0,{seed:v.seed,perchMs:v.perchMs});assert.equal(pose.close,0);assert.ok(Number.isFinite(pose.x+pose.y+pose.z));}
 assert.equal(demoButterflyPose(120000,0,{reducedMotion:true}).flight,0);
});
test('paired interactions are brief, continuous, bounded and limited to nearby companions',()=>{
 for(let t=0;t<150000;t+=33){
  const a=butterflySocialOffset(t,0),b=butterflySocialOffset(t+1,0),partner=butterflySocialOffset(t,2);
  assert.ok(Math.hypot(a.x,a.y,a.z)<.12);assert.ok(Math.abs(a.amount-b.amount)<.001);
  assert.ok(Math.abs(a.x+partner.x)<1e-8);assert.equal(a.amount,partner.amount);
 }
 assert.equal(butterflySocialOffset(31000,0,{reduced:true}).amount,0);
 assert.equal(butterflySocialOffset(31000,0,{enabled:false}).amount,0);
 const p={x:0,y:1,z:0},social=butterflySocialOffset(31000,0);
 assert.equal(butterflySocialPoint(p,{x:2,y:1,z:0},social),p);
 assert.ok(butterflySocialPoint(p,{x:.2,y:1,z:0},social).x>0);
});
test('eight flying butterflies and both eyes reuse three animation phases; perched work is bounded to three phases',()=>{
 const flight=new Set(),rest=new Set();
 for(let eye=0;eye<2;eye++)for(const v of BUTTERFLY_VARIANTS){
  flight.add(butterflyPoseCacheKey({flight:1,wingPhase:v.seed*1.9}).key);
  rest.add(butterflyPoseCacheKey({flight:0,wingPhase:v.seed*1.9}).key);
 }
 assert.equal(flight.size,3);assert.equal(rest.size,3);
});
test('native flock uploads three shared flying phases across all colours and eyes and releases every resource',()=>{
 const text=readFileSync(new URL('../app/services/demoButterflyModel.js',import.meta.url),'utf8');
 const fn=text.slice(text.indexOf('function butterflyXRRenderer('),text.indexOf('export function mountDemoButterflyModel('));
 const calls=[],gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:(_p,name)=>name},{get(target,key){return key in target?target[key]:key.startsWith('create')?()=>({}):key===key.toUpperCase()?key:(...args)=>calls.push([key,...args]);}});
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));geo.setIndex([0,1,2]);
 const mesh={geometry:geo,matrixWorld:new THREE.Matrix4(),skeleton:{update(){}},applyBoneTransform(){},material:{map:{},color:new THREE.Color('#ffffff')}};
 let animations=0;
 const scope=vm.createContext({THREE,gl,model:{meshes:[mesh],bitmap:{},nodes:Array.from({length:62},()=>({getWorldPosition:p=>p.set(0,-.2,0)}))},butterflyPoseCacheKey,BUTTERFLY_RENDER_BUDGETS,currentGraphicsQuality:()=> 'high',animateButterfly:()=>animations++});
 const renderer=vm.runInContext(fn+';butterflyXRRenderer(gl,model);',scope),view={projectionMatrix:new THREE.Matrix4().elements,transform:{inverse:{matrix:new THREE.Matrix4().elements}}};
 for(let eye=0;eye<2;eye++)for(const v of BUTTERFLY_VARIANTS)renderer.draw(view,{x:0,y:0,z:-1},1000,{flight:1,wingPhase:v.seed*1.9,opacity:1,yaw:v.seed,size:v.size},v);
 assert.equal(animations,3);assert.equal(calls.filter(c=>c[0]==='bufferData').length,3);assert.equal(calls.filter(c=>c[0]==='drawArrays').length,16);
 for(let eye=0;eye<2;eye++)for(const v of BUTTERFLY_VARIANTS)renderer.draw(view,{x:0,y:0,z:-1},1010,{flight:0,wingPhase:v.seed*1.9,opacity:1},v);
 assert.equal(animations,6,'rest adds only three cached phases');
 renderer.destroy();assert.equal(calls.filter(c=>c[0]==='deleteBuffer').length,6);assert.equal(calls.filter(c=>c[0]==='deleteTexture').length,1);assert.equal(calls.filter(c=>c[0]==='deleteProgram').length,1);geo.dispose();
});
