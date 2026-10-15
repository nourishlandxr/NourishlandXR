import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeButterflyBucket} from '../app/services/welcomeButterflyBucket.js';
import {createWelcomeGameReplay} from '../app/services/welcomeGameReplay.js';
import {createWelcomePlacementGrab} from '../app/services/welcomePlacementGrab.js';
import {unlockWelcomeInputChoice,welcomeInputChoiceUnlocked} from '../app/services/welcomeExperienceUnlock.js';
import {prepareBananaHalf,tryBananaBite} from '../app/services/welcomeBananaBite.js';
import {panelSettingsControls} from '../app/services/pimInfoPanel.js';

test('butterfly pinch releases to brief flight without inventing missing hand perches',async()=>{
 const root=new THREE.Group();root.position.set(1,.8,-2);root.rotation.y=.7;root.updateMatrixWorld(true);
 const bucket=createWelcomeButterflyBucket(root,{load:async()=>Array.from({length:4},()=>new THREE.Mesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial()))});await bucket.loading;
 const source={handedness:'left',hand:{}},input={source,trigger:false};
 const move=(point,down)=>{input.matrix=root.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(...point.toArray())).elements;input.trigger=down;bucket.update(.05,[input]);};
 try{const first=new THREE.Vector3(...bucket.snapshot().insects[0].position);move(first,false);move(first,true);assert.equal(bucket.snapshot().insects[0].state,'held');move(first.clone().add(new THREE.Vector3(0,.15,0)),true);move(first,false);assert.equal(bucket.snapshot().released,1);assert.equal(bucket.snapshot().insects[0].state,'flying');
 const p=root.localToWorld(new THREE.Vector3(.10,.35,.10));input.joints=new Map([['index-finger-phalanx-proximal',p]]);
 for(let i=0;i<30;i++)bucket.update(.05,[input]);assert.equal(bucket.snapshot().insects[0].state,'flying','flight is visible before landing');
 for(let i=0;i<100;i++)bucket.update(.05,[input]);assert.equal(bucket.snapshot().insects[0].state,'flying');assert.equal(bucket.snapshot().complete,false,'one joint is not a tracked open hand');bucket.update(.05,[]);assert.equal(bucket.snapshot().insects[0].state,'flying');
 move(new THREE.Vector3(...bucket.snapshot().insects[0].position),true);assert.equal(bucket.snapshot().insects[0].state,'flying','tracking recovery requires a released pinch first');
 }finally{bucket.destroy();}
});
test('only a completed tic-tac-toe outcome unlocks the free input choice',()=>{
 const saved=globalThis.sessionStorage,values=new Map();globalThis.sessionStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 try{assert.equal(unlockWelcomeInputChoice({finished:false,winner:null}),false);assert.equal(welcomeInputChoiceUnlocked(),false);assert.equal(unlockWelcomeInputChoice({finished:true,draw:true}),true);assert.equal(welcomeInputChoiceUnlocked(),true);}finally{globalThis.sessionStorage=saved;}
});
test('the main demo settings expose three distinct compact input controls after unlocking',()=>{
 const locked=panelSettingsControls({headset:true});assert.equal(locked.some(c=>c.action.startsWith('WelcomeInput:')),true);
 const controls=panelSettingsControls({headset:true,inputChoiceAvailable:true}),switches=controls.filter(c=>c.action.startsWith('WelcomeInput:'));
 assert.deepEqual(switches.map(c=>c.action),['WelcomeInput:controllers','WelcomeInput:gloves','WelcomeInput:hands']);assert.equal(new Set(switches.map(c=>c.icon)).size,3);
 for(const control of switches){assert.ok(control.ariaLabel.length>10);assert.ok(control.width>=58 && control.height>=58);assert.equal(controls.some(other=>other!==control && control.x<other.x+other.width && control.x+control.width>other.x && control.y<other.y+other.height && control.y+control.height>other.y),false);}
});
test('placement follows the full controller pose and only commits on release',()=>{
 const table=new THREE.Group();table.position.set(.2,.8,-1);const grab=createWelcomePlacementGrab(table),source={handedness:'right'};
 grab.begin(source,new THREE.Matrix4().makeTranslation(0,1,0).elements);const matrix=new THREE.Matrix4().makeRotationY(Math.PI/2).setPosition(.3,1.2,.1).elements;
 assert.equal(grab.update([{source,matrix,down:true}]),false);assert.ok(Math.abs(table.position.y-1)<1e-6);assert.ok(Math.abs(table.rotation.y-Math.PI/2)<1e-6);const position=table.position.clone();assert.equal(grab.update([{source,matrix,down:false}]),true);assert.equal(grab.owner,null);grab.update([{source,matrix:new THREE.Matrix4().elements,down:true}]);assert.deepEqual(table.position,position);
});
test('peeled banana keeps a geometrically smaller half and requires a deliberate mouth approach',()=>{
 const holder=new THREE.Group(),whole=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(.06,.24,.04),new THREE.MeshBasicMaterial());whole.add(mesh);holder.add(whole);holder.updateMatrixWorld(true);
 const half=prepareBananaHalf(whole);assert.ok(half.halfSize.y<.061);for(const n of half.group.children)n.geometry.dispose();
 const variant={whole,peel:1},body={position:{x:0,y:0,z:0}},mouth=new THREE.Vector3(0,0,.3);assert.equal(tryBananaBite(variant,body,mouth,null,()=>{}),false);mouth.z=.08;assert.equal(tryBananaBite(variant,body,mouth,null,()=>{}),true);assert.ok(body.halfSize.y<.061);assert.equal(tryBananaBite(variant,body,mouth,null,()=>{}),false);variant.eaten.traverse(n=>n.geometry?.dispose());mesh.geometry.dispose();mesh.material.dispose();
});
test('replay waits until speech ends, accepts voice yes/no, and releases its microphone',()=>{
 let handlers,yes=0,no=0,listens=0,cancels=0;const saved=globalThis.sessionStorage;globalThis.sessionStorage={getItem:()=> 'true'};
 const replay=createWelcomeGameReplay({createVoice:options=>(handlers=options,{listen(){listens++;},cancel(){cancels++;},destroy(){}}),onYes:()=>yes++,onNo:()=>no++});
 try{replay.begin();replay.update(1,false);assert.equal(listens,0);replay.update(.3,true);assert.equal(listens,1);handlers.onText('yes please');assert.equal(yes,1);replay.begin();replay.update(.3,true);handlers.onText('no thanks');assert.equal(no,1);assert.equal(replay.state().active,false);assert.ok(cancels>=2);}finally{replay.destroy();globalThis.sessionStorage=saved;}
});

test('Games lists practice activities independently of input unlock',()=>{const controls=panelSettingsControls({headset:true,gamesAvailable:true});assert.ok(controls.some(c=>c.action==='WelcomeGames'));assert.equal(controls.some(c=>c.action.startsWith('WelcomeInput:')),true);const games=panelSettingsControls({headset:true,gamesOpen:true});for(const id of ['orb-dance','fruit-brush','hand-play','tic-tac-toe'])assert.ok(games.some(c=>c.action==='WelcomeGame:'+id));});
