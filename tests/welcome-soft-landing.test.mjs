import {WELCOME_NARRATION_BANK} from '../app/services/welcomeNarrationBank.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GLTFLoader} from '../app/assets/fruit-window/vendor/GLTFLoader.js';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {WELCOME_PRACTICE_LESSONS as lessons,WELCOME_PRACTICE_RESPONSES as responses} from '../app/services/welcomePracticeContent.js';
import {createWelcomePracticeScene} from '../app/services/welcomePracticeScene.js';
import {createWelcomeInputRouting} from '../app/services/welcomeInputRouting.js';
import {welcomeComfortPanelPose} from '../app/services/pimInfoPanel.js';
import {welcomePracticeVisualGuide} from '../app/services/welcomeComfortOptions.js';
import {createWelcomeObjectReveal} from '../app/services/welcomeObjectReveal.js';
import {createWelcomePracticeVoice} from '../app/services/welcomePracticeVoice.js';

test('arrival reveals the table and Zinnia before controllers, then laser, settings, virtual hands and fruit',()=>{
    const before=(a,b)=>assert.ok(lessons.findIndex(l=>l.id===a)<lessons.findIndex(l=>l.id===b),`${a} precedes ${b}`);
    before('arrival','table');before('table-reveal','face');before('zinnia','living-frame');before('visitor-intro','conversation-bridge');before('conversation-bridge','controls-trigger');before('zinnia','controls-grip');before('controls-face-second','laser-intro');before('settings-close','laser-intro');before('laser-zinnia','comfort');before('settings-close','interaction-methods');before('interaction-methods','virtual-hands-reveal');before('virtual-hands-reveal','gloves');before('gloves','basket-reveal');before('grab','brush');before('brush','fruit');
    assert.equal(lessons.some(l=>l.id==='point'),false);
    assert.equal(welcomePracticeVisualGuide({phase:'grab'}).image,'');
    for(const clip of [...lessons,...responses].filter(c=>c.spoken && !c.liveVoice))assert.ok(fs.statSync(new URL('../app/'+(WELCOME_NARRATION_BANK?.base || 'assets/welcome-practice/voice/')+clip.id+'.mp3',import.meta.url)).size>1000,clip.id);
});

test('white silhouette precedes the solid object and follows adjusted geometry',()=>{
    const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());root.add(mesh);
    const reveal=createWelcomeObjectReveal(root);reveal.update(-1);assert.equal(root.visible,false);
    mesh.position.y=.4;reveal.update(.7);assert.equal(root.visible,true);assert.equal(mesh.material.opacity,0);
    const shell=root.children.find(c=>c.name.endsWith('white arrival glow'));assert.ok(shell.children[0].material.opacity>.4);assert.equal(shell.children[0].matrix.elements[13],.4);
    reveal.update(4);assert.equal(shell.visible,false);assert.equal(mesh.material.opacity,1);assert.equal(mesh.material.depthWrite,true);
});

test('comfort panel begins to the side and panel gestures retain input ownership through release',()=>{
    const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements,pose=welcomeComfortPanelPose(viewer);
    assert.equal(pose.center.x,-1.05);assert.equal(pose.center.z,-1.08);assert.ok(pose.normal.x>.5);
    const source={},other={};let time=0,owned=false,holding=false,hit=true;
    const routing=createWelcomeInputRouting({now:()=>time,ownsPanel:s=>s===source && owned,holdsObject:s=>s===source && holding,hitPanel:()=>hit});
    assert.equal(routing.routeToPanel(source,{}),true); // squeeze start reaches the normal panel listener
    hit=false;time=100;assert.equal(routing.occupied(source),true);
    owned=true;time=2000;assert.equal(routing.routeToPanel(source,{}),true); // hold continues after moving away from its initial ray
    owned=false;time=2100;assert.equal(routing.routeToPanel(source,{}),true); // squeeze end also reaches the panel
    time=2900;assert.equal(routing.occupied(source),false);assert.equal(routing.occupied(other),false);
    holding=true;hit=true;assert.equal(routing.routeToPanel(source,{}),false); // a held orange stays with its controller
});

function canvasDocument(){const context=new Proxy({measureText:text=>({width:text.length*18}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key] || (()=>{})});return {createElement:()=>({getContext:()=>context})};}

test('actual tutorial scene waits for the rim, hides early props, reveals Zinnia, pauses, and lets a peach be observed and placed on the plate',async()=>{
    const oldDocument=globalThis.document,oldFetch=globalThis.fetch,oldWarn=console.warn,oldImage=globalThis.Image;
    globalThis.Image=class {set src(value){this.onerror?.();}};globalThis.document=canvasDocument();globalThis.fetch=async()=>{throw Error('Test intentionally uses geometry placeholders');};console.warn=()=>{};
    let stage;
    try{
        const spoken=[],voice={status:()=>({playing:false,paused:false,muted:true}),speak:clip=>{if(clip)spoken.push(clip);},stop(){},unlock(){},pause(){},resume(){}};
        stage=createWelcomePracticeScene({voice,embedded:true,loadFruit:async()=>({scene:new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial())}),loadZinnia:async()=>{const bytes=fs.readFileSync(new URL('../app/assets/welcome-practice/zinnia.glb',import.meta.url));return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}});await stage.loading;
        const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;
        const tick=(seconds,extra={})=>{for(let i=0;i<Math.ceil(seconds/.05);i++)stage.update(.05,{viewer,floor:0,...extra});};
        stage.start(viewer,0);tick(10,{frameReady:false});assert.equal(stage.phase,'frame');assert.equal(stage.objects.get('peach').visible,false);assert.equal(stage.snapshot().comfortVisible,false);
        assert.equal(stage.zinniaMount.parent.visible,false);
        tick(.1,{frameReady:true});assert.equal(stage.phase,'frame');assert.ok(stage.snapshot().frameOpacity<1);tick(1.3,{frameReady:true});assert.equal(stage.phase,'title');assert.equal(spoken.length,0);
        tick(6);assert.equal(stage.phase,'arrival');assert.match(spoken.at(-1).spoken,/This hands tutorial/);assert.equal(spoken.at(-1).recorded,false);
        stage.previewLesson('table-reveal');tick(.1);assert.equal(stage.objects.get('peach').visible,false);assert.equal(stage.zinniaMount.parent.visible,false);
        stage.previewLesson('zinnia-reveal');tick(4);assert.equal(stage.zinniaMount.parent.visible,true);assert.equal(stage.zinniaMount.children[0].userData.zinnia.status,'ready');assert.ok(stage.zinniaMount.getObjectByName('Eye_L_expression'));assert.ok(stage.zinniaMount.getObjectByName('Pot'));
        stage.previewLesson('comfort');assert.equal(stage.snapshot().comfortVisible,true);stage.button('pause');tick(60);assert.equal(stage.phase,'comfort');assert.equal(stage.snapshot().voice.paused,true);stage.button('pause');
        stage.previewLesson('grab');await stage.loadPracticeAssets();tick(2);
        const orange=stage.bodies.filter(b=>b.fruit).sort((a,b)=>(b.position.y+b.support)-(a.position.y+a.support))[0],source={handedness:'right'},position=new THREE.Vector3(orange.position.x,orange.position.y,orange.position.z).applyMatrix4(stage.root.matrixWorld);
        const ray={origin:{x:position.x,y:position.y,z:position.z+.2},direction:{x:0,y:0,z:-1}},before={...orange.velocity};assert.equal(stage.select(ray,source),false);assert.deepEqual(orange.velocity,before);
        const pose=new THREE.Matrix4().makeTranslation(position.x,position.y,position.z).elements;
        tick(.05,{inputs:[{source,matrix:pose,down:false}]});tick(.1,{inputs:[{source,matrix:pose,down:true}]});assert.equal(stage.isHolding(source),true);
        const lifted=[...pose];lifted[13]+=.5;tick(1.6,{inputs:[{source,matrix:lifted,down:true}]});const plateAbove=stage.root.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(-.27,.65,.19)).elements;tick(.2,{inputs:[{source,matrix:plateAbove,down:true}]});const platePose=stage.root.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(-.27,.18,.19)).elements;tick(.1,{inputs:[{source,matrix:platePose,down:true}]});tick(.1,{inputs:[{source,matrix:platePose,down:false}]});assert.equal(stage.snapshot().completed,true,JSON.stringify({held:stage.snapshot().held,fruit:orange.position,basket:stage.snapshot().basket}));
        tick(3);assert.equal(stage.phase,'brush');
        for(const hand of [false,true]){
            stage.previewLesson('water');tick(.1);
            const can=stage.bodies.find(b=>b.id==='watering-can'),source=hand?{handedness:'right',hand:{}}:{handedness:'right'};
            const grip=new THREE.Vector3(can.gripPoint.x,can.gripPoint.y,can.gripPoint.z);
            const start=grip.clone().applyQuaternion(new THREE.Quaternion(can.rotation.x,can.rotation.y,can.rotation.z,can.rotation.w)).add(new THREE.Vector3(can.position.x,can.position.y,can.position.z));
            const worldPose=(p,q=new THREE.Quaternion())=>stage.root.matrixWorld.clone().multiply(new THREE.Matrix4().compose(p,q,new THREE.Vector3(1,1,1))).elements;
            tick(.1,{inputs:[{source,matrix:worldPose(start,new THREE.Quaternion(can.rotation.x,can.rotation.y,can.rotation.z,can.rotation.w)),down:true}]});assert.equal(stage.isHolding(source),true);
            const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-1.1),tip=new THREE.Vector3(.101,.037,0).multiplyScalar(1.18).applyQuaternion(q);
            const centre=new THREE.Vector3(-tip.x-.009,.24,-.08),hold=centre.clone().add(grip.clone().applyQuaternion(q));
            tick(1.35,{inputs:[{source,matrix:worldPose(hold,q),down:true}]});
            const attached=new THREE.Vector3(can.position.x,can.position.y,can.position.z).add(grip.clone().applyQuaternion(new THREE.Quaternion(can.rotation.x,can.rotation.y,can.rotation.z,can.rotation.w)));
            assert.ok(attached.distanceTo(hold)<1e-6,'handle remains attached while pouring');assert.equal(stage.snapshot().completed,true);
            tick(.1,{inputs:[{source,matrix:worldPose(hold,q),down:false}]});assert.equal(stage.isHolding(source),false);
        }
        stage.previewLesson('fly');tick(.1);assert.equal(stage.snapshot().insectControllerAvailable,true);assert.equal(stage.setControllerTool('insect'),true);
        const remote=stage.bodies.find(b=>b.id==='remote');assert.equal(remote.visible,false);assert.equal(stage.objects.get('remote').parent,null);
        const remotePose=new THREE.Matrix4().makeTranslation(.2,1.1,-.4);tick(.5,{inputs:[{source,matrix:remotePose.elements,down:false,trigger:true}]});assert.equal(stage.isHolding(source),false);assert.equal(stage.snapshot().flight.airborne,true);
        stage.releaseAll(false);stage.resetObjects();stage.previewLesson('water');tick(.1);
        const can=stage.bodies.find(b=>b.id==='watering-can'),hand={hand:{},handedness:'right'};
        const canPoint=new THREE.Vector3(can.position.x,can.position.y,can.position.z).applyMatrix4(stage.root.matrixWorld);
        tick(.05,{inputs:[{source:hand,matrix:new THREE.Matrix4().makeTranslation(canPoint.x,canPoint.y,canPoint.z).elements,down:true}]});assert.equal(stage.isHolding(hand),true);
        const pourRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-1.1),pourGrip=new THREE.Vector3(can.gripPoint.x,can.gripPoint.y,can.gripPoint.z).applyQuaternion(pourRotation).add(new THREE.Vector3(-.079,.36,-.08));const pourPose=new THREE.Matrix4().compose(pourGrip,pourRotation,new THREE.Vector3(1,1,1)).premultiply(stage.root.matrixWorld);
        tick(.6,{inputs:[{source:hand,matrix:pourPose.elements,down:true}]});assert.equal(stage.snapshot().garden.pouring,true);assert.ok(stage.snapshot().garden.water>.4);
        const canMesh=stage.objects.get('watering-can');assert.equal(canMesh.scale.x,1.18);assert.ok(canMesh.children.some(mesh=>mesh.material?.metalness>.8));
        const segments=stage.root.children.filter(mesh=>mesh.name==='Water stream segment');assert.equal(segments.length,12);assert.equal(segments.every(mesh=>mesh.visible && mesh.scale.y>0),true);assert.equal(new Set(segments.map(mesh=>mesh.geometry)).size,1);assert.ok(stage.root.children.some(mesh=>mesh.name==='Water soil ripple' && mesh.visible));
        tick(.7,{inputs:[{source:hand,matrix:pourPose.elements,down:true}]});assert.equal(stage.snapshot().garden.water,1);
        assert.ok(Object.values(can.position).every(Number.isFinite));
        let disposed=false;const character=stage.takeZinniaCharacter();character.getObjectByName('Pot').geometry.addEventListener('dispose',()=>disposed=true);stage.destroy();stage=null;assert.equal(disposed,false);
    }finally{stage?.destroy();globalThis.document=oldDocument;globalThis.fetch=oldFetch;globalThis.Image=oldImage;console.warn=oldWarn;}
});

test('fixed narration uses its bundled recording at natural speed and resumes at the same offset',async()=>{
    const oldContext=globalThis.AudioContext,oldFetch=globalThis.fetch;let context,source,requested;
    class Context{constructor(){context=this;this.currentTime=0;this.state='running';this.destination={};}resume(){return Promise.resolve();}close(){return Promise.resolve();}decodeAudioData(){return Promise.resolve({duration:20});}createGain(){return {connect(){},gain:{setTargetAtTime(){}}};}createDelay(){return {connect(){},delayTime:{}};}createDynamicsCompressor(){return {connect(){},threshold:{},knee:{},ratio:{}};}createBufferSource(){source={connect(){},disconnect(){},stop(){},playbackRate:{},start:(_when,offset)=>{source.offset=offset;}};return source;}}
    globalThis.AudioContext=Context;globalThis.fetch=async url=>{requested=String(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};};
    const voice=createWelcomePracticeVoice();
    try{voice.unlock();await voice.speak({...lessons.find(l=>l.id==='visitor-intro'),recorded:true});assert.match(requested,/visitor-intro\.mp3$/);assert.equal(source.playbackRate.value,1);context.currentTime=3;voice.pause();voice.resume();await Promise.resolve();await Promise.resolve();assert.equal(source.offset,3);assert.equal(source.playbackRate.value,1);}finally{voice.destroy();globalThis.AudioContext=oldContext;globalThis.fetch=oldFetch;}
});

test('demo narration recovers an audio-blocked clip on unlock but preserves an intentional pause',async()=>{
 const oldContext=globalThis.AudioContext,oldFetch=globalThis.fetch;let context,starts=0,allowResume=false;
 class Context{constructor(){context=this;this.currentTime=0;this.state='suspended';this.destination={};}resume(){if(allowResume)this.state='running';return Promise.resolve();}close(){return Promise.resolve();}decodeAudioData(){return Promise.resolve({duration:20});}createGain(){return {connect(){},gain:{setTargetAtTime(){}}};}createDelay(){return {connect(){},delayTime:{}};}createDynamicsCompressor(){return {connect(){},threshold:{},knee:{},ratio:{}};}createBufferSource(){return {connect(){},disconnect(){},stop(){},playbackRate:{},start(){starts++;}};}}
 globalThis.AudioContext=Context;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});const voice=createWelcomePracticeVoice();
 try{voice.unlock();await voice.speak({id:'arrival',recorded:true});assert.equal(voice.status().paused,true);assert.equal(starts,0);allowResume=true;voice.unlock();await Promise.resolve();assert.equal(voice.status().playing,true);assert.equal(voice.status().paused,false);assert.equal(starts,1);context.currentTime=3;voice.pause();voice.unlock();await Promise.resolve();assert.equal(voice.status().paused,true);assert.equal(starts,1);voice.resume();await Promise.resolve();await Promise.resolve();assert.equal(starts,2);}finally{voice.destroy();globalThis.AudioContext=oldContext;globalThis.fetch=oldFetch;}
});


test('right thumbstick opens and closes tutorial settings once per fresh press and rewards each completed step',async()=>{
 const oldDocument=globalThis.document,oldFetch=globalThis.fetch,oldImage=globalThis.Image,oldWarn=console.warn;
 globalThis.document=canvasDocument();globalThis.Image=class {set src(value){this.onerror?.();}};globalThis.fetch=async()=>{throw Error('local fixture');};console.warn=()=>{};
 let stage,opened=false;const toggles=[],feedback=[],voice={status:()=>({playing:false,paused:false}),speak(){},pause(){},resume(){},stop(){},unlock(){}};
 try{
  stage=createWelcomePracticeScene({voice,embedded:true,onToolMenu:()=>{opened=!opened;toggles.push(opened);},onFeedback:(kind,source)=>feedback.push({kind,source}),loadZinnia:async()=>{const bytes=fs.readFileSync(new URL('../app/assets/welcome-practice/zinnia.glb',import.meta.url));return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}});await stage.loading;
  const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements,source={handedness:'right',profiles:[],gamepad:{buttons:Array.from({length:6},()=>({pressed:false})),axes:[]}},input={source,matrix:viewer,down:false,trigger:false};
  const tick=()=>stage.update(.05,{viewer,floor:0,controllers:[input],inputs:[input]});stage.start(viewer,0);stage.previewLesson('settings-open');tick();source.gamepad.buttons[3].pressed=true;tick();assert.equal(opened,true);for(let i=0;i<8;i++)tick();assert.deepEqual(toggles,[true]);
  source.gamepad.buttons[3].pressed=false;for(let i=0;i<50 && stage.phase!=='settings-close';i++)tick();assert.equal(stage.phase,'settings-close');source.gamepad.buttons[3].pressed=true;tick();assert.equal(opened,false);assert.deepEqual(toggles,[true,false]);assert.equal(feedback.filter(f=>f.kind==='lesson' && f.source===source).length,2);
 }finally{stage?.destroy();globalThis.document=oldDocument;globalThis.fetch=oldFetch;globalThis.Image=oldImage;console.warn=oldWarn;}
});
