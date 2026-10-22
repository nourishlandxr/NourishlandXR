import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeButterflyBucket} from '../app/services/welcomeButterflyBucket.js';
import {createWelcomeGameReplay} from '../app/services/welcomeGameReplay.js';
import {createWelcomePlacementGrab} from '../app/services/welcomePlacementGrab.js';
import {unlockWelcomeInputChoice,welcomeInputChoiceUnlocked} from '../app/services/welcomeExperienceUnlock.js';
import {prepareBananaHalf,tryBananaBite} from '../app/services/welcomeBananaBite.js';
import {panelSettingsControls} from '../app/services/pimInfoPanel.js';
import {stepPracticeBodies} from '../app/services/welcomePracticePhysics.js';

test('butterfly pinch releases to brief flight without inventing missing hand perches',async()=>{
 const root=new THREE.Group();root.position.set(1,.8,-2);root.rotation.y=.7;root.updateMatrixWorld(true);
 const bucket=createWelcomeButterflyBucket(root,{load:async()=>Array.from({length:4},()=>new THREE.Mesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial()))});await bucket.loading;
 const source={handedness:'left',hand:{}},input={source,trigger:false};
 const move=(point,down)=>{input.matrix=root.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(...point.toArray())).elements;input.trigger=down;bucket.update(.05,[input]);};
 try{assert.equal(bucket.snapshot().cups.length,3);assert.equal(bucket.snapshot().burst,false);const cup=bucket.bucket.position.clone().add(new THREE.Vector3(0,.073,0));move(cup,false);move(cup,true);move(cup.clone().add(new THREE.Vector3(0,.2,0)),true);move(cup,false);assert.equal(bucket.snapshot().burst,true);const first=new THREE.Vector3(...bucket.snapshot().insects[0].position);move(first,false);move(first,true);assert.equal(bucket.snapshot().insects[0].state,'held');move(first.clone().add(new THREE.Vector3(0,.15,0)),true);move(first,false);assert.equal(bucket.snapshot().released,1);assert.equal(bucket.snapshot().insects[0].state,'flying');
 const p=root.localToWorld(new THREE.Vector3(.10,.35,.10));input.joints=new Map([['index-finger-phalanx-proximal',p]]);
 for(let i=0;i<30;i++)bucket.update(.05,[input]);assert.equal(bucket.snapshot().insects[0].state,'flying','flight is visible before landing');
 for(let i=0;i<100;i++)bucket.update(.05,[input]);assert.equal(bucket.snapshot().insects[0].state,'flying');assert.equal(bucket.snapshot().complete,false,'one joint is not a tracked open hand');bucket.update(.05,[]);assert.equal(bucket.snapshot().insects[0].state,'flying');
 move(new THREE.Vector3(...bucket.snapshot().insects[0].position),true);assert.equal(bucket.snapshot().insects[0].state,'flying','tracking recovery requires a released pinch first');
 }finally{bucket.destroy();}
});
test('three upside-down cups hide butterflies until the correct one is lifted',async()=>{
 const root=new THREE.Group(),bucket=createWelcomeButterflyBucket(root,{load:async()=>Array.from({length:3},()=>new THREE.Mesh(new THREE.SphereGeometry(1,4,3),new THREE.MeshBasicMaterial()))});await bucket.loading;
 const source={handedness:'right',hand:{}},input={source,trigger:false,matrix:new THREE.Matrix4().elements};
 const move=(point,down)=>{input.matrix=new THREE.Matrix4().setPosition(point).elements;input.trigger=down;bucket.update(.05,[input]);};
 const lift=cup=>{const point=cup.position.clone().add(new THREE.Vector3(0,.073,0));move(point,false);move(point,true);move(point.add(new THREE.Vector3(0,.2,0)),true);move(point,false);};
 try{assert.equal(bucket.cups.length,3);assert.ok(bucket.cups.every(cup=>Math.abs(cup.rotation.x-Math.PI)<1e-6));for(let i=0;i<30;i++)bucket.update(.05,[]);assert.equal(bucket.snapshot().burst,false,'time alone cannot reveal the surprise');lift(bucket.cups[1]);assert.equal(bucket.snapshot().burst,false,'empty cup must not release butterflies');lift(bucket.bucket);assert.equal(bucket.snapshot().burst,true);assert.equal(bucket.snapshot().insects.length,3);}finally{bucket.destroy();}
});
test('butterfly cups are physical, reusable table props that settle after release',async()=>{
 const root=new THREE.Group(),game=createWelcomeButterflyBucket(root,{load:async()=>[]}),source={handedness:'right',hand:{}},input={source,trigger:false};await game.loading;
 const body=game.physicsBodies()[0],cup=game.cups[0],bottom=cup.position.clone().add(new THREE.Vector3(0,-.073,0).applyQuaternion(cup.quaternion));
 const move=(point,down)=>{input.matrix=new THREE.Matrix4().setPosition(point).elements;input.trigger=down;game.update(.05,[input]);};
 try{assert.equal(game.physicsBodies().length,3);assert.equal(body.visible,true);move(bottom,false);move(bottom,true);assert.equal(body.held,true);move(bottom.clone().add(new THREE.Vector3(0,.12,0)),true);move(bottom.clone().add(new THREE.Vector3(0,.12,0)),false);assert.equal(body.held,false,'release gives physics ownership back to the scene');
  body.position.y=.4;for(let i=0;i<90;i++)stepPracticeBodies([body],1/60,{floor:-.6});game.syncPhysics();assert.ok(Math.abs(cup.position.y-body.position.y)<1e-8);assert.ok(Math.abs(body.position.y-body.halfSize.y)<.015,'released cup settles on the table surface');
 }finally{game.destroy();}
});

test('bucket activity itself runs gravity and blocks held cups at the tabletop',async()=>{
 const root=new THREE.Group(),feedback=[],game=createWelcomeButterflyBucket(root,{load:async()=>[],onFeedback:(kind,source)=>feedback.push([kind,source])});await game.loading;
 const source={handedness:'right',hand:{}},cup=game.bucket,input={source,trigger:false,matrix:new THREE.Matrix4().setPosition(cup.position).elements};
 const move=(y,pressed)=>{input.matrix=new THREE.Matrix4().setPosition(cup.position.x,y,cup.position.z).elements;input.trigger=pressed;game.update(1/60,[input]);};
 try{
  move(.08,false);move(.08,true);move(-.3,true);root.updateMatrixWorld(true);
  assert.ok(new THREE.Box3().setFromObject(cup).min.y>=-.001,'body and folded handle cannot pass through the table');
  assert.ok(feedback.some(([kind])=>kind==='impact'));
  move(.4,true);move(.4,false);const start=cup.position.y;for(let i=0;i<150;i++)game.update(1/60,[]);
  assert.ok(cup.position.y<start-.15);assert.ok(Math.abs(cup.position.y-.08)<.015,'no external physics loop is needed');
  assert.ok(feedback.some(([kind,owner])=>kind==='release' && owner===source));
 }finally{game.destroy();}
});

test('lifting before model loading finishes still reveals the arriving butterfly groups',async()=>{
 let finish;const root=new THREE.Group(),game=createWelcomeButterflyBucket(root,{load:()=>new Promise(resolve=>finish=resolve)});await Promise.resolve();
 const source={handedness:'left',hand:{}},point=game.bucket.position.clone(),input={source,trigger:false,matrix:new THREE.Matrix4().setPosition(point).elements};
 try{
  game.update(.05,[input]);input.trigger=true;game.update(.05,[input]);input.matrix=new THREE.Matrix4().setPosition(point.clone().add(new THREE.Vector3(0,.2,0))).elements;game.update(.05,[input]);assert.equal(game.snapshot().burst,true);
  const group=new THREE.Group();group.add(new THREE.Mesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial()));finish([group]);await game.loading;game.update(.05,[]);
  assert.equal(group.visible,true);assert.equal(group.userData.welcomeAlwaysConvert,true,'native converter must include hidden group descendants before reveal');assert.equal(game.snapshot().insects[0].state,'flying');
 }finally{game.destroy();}
});

test('controllers can discover, grab and release a butterfly to complete without tracked joints',async()=>{
 const root=new THREE.Group(),feedback=[],game=createWelcomeButterflyBucket(root,{load:async()=>Array.from({length:3},()=>new THREE.Mesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial())),onFeedback:(kind,source)=>feedback.push([kind,source])});await game.loading;
 const source={handedness:'right'},input={source,down:false,trigger:false};
 const move=(point,down)=>{input.matrix=new THREE.Matrix4().setPosition(point).elements;input.down=down;game.update(.05,[input]);};
 try{
  const p=game.bucket.position.clone();move(p,false);move(p,true);move(p.clone().add(new THREE.Vector3(0,.2,0)),true);move(p,false);assert.equal(game.snapshot().burst,true);assert.equal(game.snapshot().complete,false,'lifting a cup alone does not finish the activity');
  let insect=new THREE.Vector3(...game.snapshot().insects[0].position);move(insect,false);insect=new THREE.Vector3(...game.snapshot().insects[0].position);move(insect,true);assert.equal(game.isHolding(source),true);move(insect,false);assert.equal(game.snapshot().released,1);
  for(let i=0;i<50;i++)game.update(.05,[]);assert.equal(game.snapshot().complete,true);assert.equal(game.snapshot().shaken,0);assert.ok(feedback.some(([kind,owner])=>kind==='release' && owner===source));
  game.reset();assert.equal(game.snapshot().complete,false);
 }finally{game.destroy();}
});
test('an idle tracked hand cannot mask a controller grip on the same side at the SDK boundary',async()=>{
 let selected;const interactionOwner={step:inputs=>{selected=inputs.find(input=>input.source.handedness==='right')?.source;},held:()=>null,reset(){}};
 const game=createWelcomeButterflyBucket(new THREE.Group(),{load:async()=>[],getContext:()=>({interactionOwner})});await game.loading;
 const controller={handedness:'right'},tracked={handedness:'right',hand:{}},matrix=new THREE.Matrix4().elements;
 try{game.update(.05,[{source:tracked,matrix,trigger:false},{source:controller,matrix,down:true}]);assert.equal(selected,controller);game.update(.05,[{source:controller,matrix,down:false},{source:tracked,matrix,trigger:true}]);assert.equal(selected,tracked);}finally{game.destroy();}
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
test('table stays level while a tilted controller positions it',()=>{
 const table=new THREE.Group(),grab=createWelcomePlacementGrab(table),source={handedness:'right'};grab.begin(source,new THREE.Matrix4().elements);
 const matrix=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.65,.4,-.5,'YXZ')).setPosition(.2,1.1,-.4).elements;
 grab.update([{source,matrix,down:true}]);assert.ok(Math.abs(table.rotation.x)<1e-6);assert.ok(Math.abs(table.rotation.z)<1e-6);assert.ok(Math.abs(table.rotation.y)>.1);grab.cancel();
});
test('tutorial table follows the holding hand vertically and keeps its foot on the floor',()=>{
 const source=readFileSync(new URL('../app/services/welcomePracticeScene.js',import.meta.url),'utf8');
 const start=source.indexOf("if(dt>0 && phase()==='table'"),end=source.indexOf("if(table.visible && !tableOutline.visible",start),placement=source.slice(start,end);
 assert.match(placement,/placementGrab\.update\(inputs\)/);
 assert.match(placement,/tableHeight=root\.position\.y-practiceFloorY/);
 assert.doesNotMatch(placement,/root\.position\.y=practiceFloorY\+tableHeight/);
 assert.match(placement,/tableParts\.alignFootToFloor\(practiceFloorY\)/);
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
