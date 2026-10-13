import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {fruitInsidePalm,trackedPalmPoint,directPanelPress,createDirectPanelGesture} from '../app/services/xrDirectInteraction.js';
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

test('nearby panel activation requires pressing and releasing the same button',()=>{
    let time=0;const gesture=createDirectPanelGesture({now:()=>time}),source={},ray={},target={distance:.08,card:{id:'control'},button:{action:'Pause'}};
    const fire=(type,t=target)=>gesture.update(source,ray,t,type);
    assert.equal(fire('select').activate,false);
    fire('selectstart');assert.equal(fire('select').activate,false,'no release');
    fire('selectstart');fire('selectend',{...target,button:{action:'Next'}});assert.equal(fire('select').activate,false,'different button');
    fire('selectstart');fire('selectend');assert.equal(fire('select').activate,true);assert.equal(fire('select').activate,false,'duplicate');
    fire('selectstart');time=2000;fire('selectend');assert.equal(fire('select').activate,false,'stale gesture');
});

test('actual panel XR handler ignores grip, distant selection and hand pinch; nearby button presses once',()=>{
    const source=fs.readFileSync(new URL('../app/services/pimInfoPanel.js',import.meta.url),'utf8');
    const start=source.indexOf('const handle=event=>{',source.indexOf('bindSession(session,referenceSpace)'));
    const handler=source.slice(start,source.indexOf(';const visibility=',start));
    const actions=[],controller={targetRaySpace:{}},target={distance:.08,card:{id:'control'},button:{action:'Pause'}},matrix=new THREE.Matrix4().makeTranslation(0,1.2,-.9).elements;
    const scope=vm.createContext({directInteractionOnly:()=>true,fruitWindow:null,inputOccupied:()=>false,referenceSpace:{},directPanelGesture:createDirectPanelGesture(),rayFilter:()=>true,hit:()=>scope.target,target,targetButtonAtRay:t=>t?.button || null,act:a=>actions.push(a),slideAtTarget(){},sliderGrab:null,spatialMove:null,spatialGrabPending:null,panelGestureSource:null,finishingMoveSource:null,finishingSliderSource:null,event:null});
    const handle=vm.runInContext(handler+';handle',scope);
    const fire=(type,inputSource=controller)=>handle({type,inputSource,frame:{getPose:()=>({transform:{matrix}})},stopImmediatePropagation(){}});
    fire('squeezestart');fire('selectstart',{hand:{}});fire('select');assert.deepEqual(actions,[]);
    scope.target={...target,distance:1};fire('selectstart');fire('selectend');fire('select');assert.deepEqual(actions,[]);
    scope.target=target;fire('selectstart');fire('selectend');fire('select');fire('select');assert.deepEqual(actions,['Pause']);
    assert.equal(scope.spatialMove,null);assert.equal(scope.spatialGrabPending,null);
});

test('controller lasers are absent before the taught reveal, then render normally; virtual hands retain settings contact feedback',()=>{
    const source=fs.readFileSync(new URL('../app/services/welcomePracticeXR.js',import.meta.url),'utf8'),start=source.indexOf('draw(view,handRenderer){'),end=source.indexOf('        },destroy',start);
    let lines=0,contacts=0;const stage={active:true,exitOpacity:1,controllerLaserProgress:.5,controllerLasersVisible:false,controllerHandsVisible:false,trials:{active:null},phase:'controls-trigger',snapshot:()=>({settingsAvailable:stage.phase==='fruit'}),isBrushHeld:()=>false,hit:()=>null};
    const controller={source:{handedness:'left',gamepad:{buttons:Array.from({length:6},()=>({pressed:false}))}},ray:{origin:{x:0,y:1,z:0},direction:{x:0,y:0,z:-1}}};
    const context={stage,revealTime:2,renderer:null,anchor:{},hands:[],controllers:[],inputs:[controller],onHit:()=>null,nearestWelcomePointerHit:()=>null,drawWelcomeControllerLaser:()=>lines++,drawSpatialPointerContact:()=>contacts++,gl:{},pointer:{}};
    const draw=vm.runInNewContext('({'+source.slice(start,end)+'}}).draw',context);
    draw({});assert.equal(lines,0);controller.source.gamepad.buttons[4].pressed=true;draw({});assert.equal(lines,0,'A/X never secretly enables a laser');
    stage.phase='laser-intro';stage.controllerLasersVisible=true;draw({});assert.equal(lines,1);
    stage.phase='fruit';stage.controllerLasersVisible=false;context.nearestWelcomePointerHit=()=>({kind:'panel',worldPoint:{x:0,y:1,z:-.6}});draw({});assert.equal(lines,1);assert.equal(contacts,1);
    stage.phase='controls-trigger';draw({});assert.equal(contacts,1,'early button practice has no pointer');
    stage.phase='fruit';controller.source.hand={};draw({});assert.equal(lines,1);assert.equal(contacts,1);
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
