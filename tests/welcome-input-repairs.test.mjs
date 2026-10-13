import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/vendor/three.module.min.js';
import {parseGlb,accessorData} from '../app/services/demoBeeModel.js';
import {controllerHandParents,controllerHandFlexAxes,controllerHandJointPoses,controllerHandGripMatrix} from '../app/services/xrControllerHandPose.js';
import {projectNarrationSegments} from '../app/services/projectNarration.js';
import {PROJECT_NARRATION_CATALOG} from '../app/services/projectNarrationCatalog.js';
import {claimZinniaVoice,forgetZinniaVoice,zinniaVoiceState,zinniaSpeechLevel,pauseZinniaVoice,resumeZinniaVoice} from '../app/services/zinniaVoiceCoordinator.js';
import {zinniaVoiceBarPose,zinniaVoiceBarButtons} from '../app/services/spatialZinniaVoiceBar.js';
import {zinniaPlantButtons} from '../app/services/zinniaPlantDiscovery.js';
import {createProjectNarration} from '../app/services/projectNarration.js';
import {nearestWelcomePointerHit} from '../app/services/welcomePointerTarget.js';
import {createZinniaVoice} from '../app/services/zinniaVoice.js';

function rigFor(side){
    const bytes=fs.readFileSync(new URL('../app/assets/meta-hand-'+side+'.glb',import.meta.url));
    const gltf=parseGlb(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),skin=gltf.json.skins[0];
    const inverse=accessorData(gltf,skin.inverseBindMatrices).data;
    const names=skin.joints.map(id=>gltf.json.nodes[id].name),parents=controllerHandParents(names);
    const bind=names.map((name,i)=>new THREE.Matrix4().fromArray(inverse,i*16).invert()),wristIndex=names.indexOf('wrist');
    return {names,parents,bind,wristIndex,flexAxes:controllerHandFlexAxes(names,parents,bind,wristIndex,side)};
}
const position=(poses,rig,name)=>new THREE.Vector3().setFromMatrixPosition(poses[rig.names.indexOf(name)]);
const input=(trigger,grip)=>({source:{gamepad:{buttons:[{value:trigger},{value:grip}]}}});

test('both authored thumbs oppose toward the palm instead of bending away sideways',()=>{
    for(const side of ['left','right']){
        const rig=rigFor(side),open=controllerHandJointPoses(rig,input(0,0)),closed=controllerHandJointPoses(rig,input(1,1)),centre=new THREE.Vector3();
        for(const finger of ['index','middle','ring','pinky'])for(const joint of ['metacarpal','phalanx-proximal'])centre.add(position(open,rig,finger+'-finger-'+joint));
        centre.multiplyScalar(1/8);
        assert.ok(position(closed,rig,'thumb-tip').distanceTo(centre)<position(open,rig,'thumb-tip').distanceTo(centre)-.008,side);
        for(const name of ['thumb-metacarpal','thumb-phalanx-proximal','thumb-phalanx-distal','thumb-tip']){
            const i=rig.names.indexOf(name),parent=rig.parents[i];
            assert.ok(Math.abs(position(open,rig,name).distanceTo(new THREE.Vector3().setFromMatrixPosition(open[parent]))-position(closed,rig,name).distanceTo(new THREE.Vector3().setFromMatrixPosition(closed[parent])))<1e-7);
        }
    }
});

test('released virtual fingers return to open despite touch and residual button values',()=>{
    for(const side of ['left','right']){
        const rig=rigFor(side),open=controllerHandJointPoses(rig,input(0,0));
        const released={source:{gamepad:{buttons:[{value:.25,pressed:false,touched:true},{value:.35,pressed:false,touched:true},{},{value:1,pressed:false,touched:true}]}}};
        controllerHandJointPoses(rig,{source:{gamepad:{buttons:[{value:1,pressed:true},{value:1,pressed:true}]}}});
        const poses=controllerHandJointPoses(rig,released);
        poses.forEach((pose,i)=>assert.ok(pose.elements.every((value,j)=>Math.abs(value-open[i].elements[j])<1e-8),rig.names[i]));
    }
});

test('actual hand skeletons curl toward mirrored palms and preserve finger lengths',()=>{
    const movements=[];
    for(const side of ['left','right']){
        const rig=rigFor(side),open=controllerHandJointPoses(rig,input(0,0)),trigger=controllerHandJointPoses(rig,input(1,0)),grip=controllerHandJointPoses(rig,input(0,1));
        const indexOpen=position(open,rig,'index-finger-tip'),indexClosed=position(trigger,rig,'index-finger-tip');
        assert.ok(indexOpen.distanceTo(indexClosed)>.055,'trigger alone bends the index finger');
        assert.ok(position(open,rig,'middle-finger-tip').distanceTo(position(trigger,rig,'middle-finger-tip'))<1e-8);
        assert.ok(indexOpen.distanceTo(position(grip,rig,'index-finger-tip'))<1e-8,'grip leaves the index available for trigger');
        movements.push(position(grip,rig,'middle-finger-tip').x-position(open,rig,'middle-finger-tip').x);
        for(let i=0;i<rig.names.length;i++)if(rig.parents[i]>=0){const parent=rig.parents[i],distance=poses=>new THREE.Vector3().setFromMatrixPosition(poses[i]).distanceTo(new THREE.Vector3().setFromMatrixPosition(poses[parent]));assert.ok(Math.abs(distance(open)-distance(grip))<1e-7);}
    }
    assert.ok(movements[0]*movements[1]<0,'left and right fingers bend in mirrored directions');
});

test('tutorial ray chooses the nearest world surface and reconstructs the exact endpoint',()=>{
    const ray={origin:{x:1,y:2,z:3},direction:{x:0,y:0,z:-1}};
    assert.equal(nearestWelcomePointerHit(ray,{kind:'panel',distance:3},{kind:'table',distance:.6}).kind,'table');
    const frame=nearestWelcomePointerHit(ray,{kind:'living-frame-rim',distance:1.8},{kind:'table',distance:2.4});
    assert.deepEqual(frame.worldPoint,{x:1,y:2,z:1.2});
    assert.equal(nearestWelcomePointerHit(ray,null,{distance:-1}),null);
});

test('voice retries capability discovery after a temporary disconnect',async()=>{
    const oldFetch=globalThis.fetch,oldRecognition=globalThis.SpeechRecognition,oldWebkit=globalThis.webkitSpeechRecognition;let calls=0;
    globalThis.SpeechRecognition=undefined;globalThis.webkitSpeechRecognition=undefined;
    globalThis.fetch=async()=>{calls++;throw Error('Connection interrupted');};
    const voice=createZinniaVoice();
    try{await voice.listen();await voice.listen();assert.equal(calls,2);}finally{voice.destroy();globalThis.fetch=oldFetch;globalThis.SpeechRecognition=oldRecognition;globalThis.webkitSpeechRecognition=oldWebkit;}
});

test('hand palm follows a mirrored holding offset while the index finger lifts',()=>{
    for(const side of ['left','right']){
        const rig=rigFor(side),controller=new THREE.Matrix4().makeRotationY(.9);controller.setPosition(.4,1.4,-.3);
        const base=controllerHandGripMatrix(rig,controller.elements),palm=new THREE.Vector3();
        for(const finger of ['index','middle','ring','pinky'])for(const joint of ['metacarpal','phalanx-proximal'])palm.add(position(rig.bind,rig,finger+'-finger-'+joint));
        palm.multiplyScalar(1/8).applyMatrix4(base);
        assert.ok(palm.distanceTo(new THREE.Vector3(side==='left'?-.025:.025,-.012,.035).applyMatrix4(controller))<1e-7);
        const raised=controllerHandJointPoses(rig,input(0,1)),closed=controllerHandJointPoses(rig,input(1,1));
        assert.ok(position(raised,rig,'wrist').distanceTo(position(closed,rig,'wrist'))<1e-8);
    }
});

test('full project narration preserves all recordings and unmatched guidance in sequence',()=>{
    const entries=Object.entries(PROJECT_NARRATION_CATALOG).slice(0,3),extra='This new guidance stays in the narration.';
    const queue=projectNarrationSegments(entries[0][1].text+' '+extra+' '+entries[1][1].text+' '+entries[2][1].text);
    assert.deepEqual(queue.map(clip=>clip.recorded?clip.id:clip.spoken),[entries[0][0],extra,entries[1][0],entries[2][0]]);
});

test('one voice owner coordinates speech, microphone handover and pause',()=>{
    let cancelled=0,paused=false;const narration={cancel(){cancelled++;},status:()=>({playing:!paused,paused}),speechLevel:()=>paused?0:.6,pause(){paused=true;},resume(){paused=false;}};
    const microphone={cancel(){},status:()=>({listening:true}),speechLevel:()=>0};
    try{claimZinniaVoice(narration);assert.equal(zinniaSpeechLevel(),.6);pauseZinniaVoice();assert.equal(zinniaSpeechLevel(),0);resumeZinniaVoice();assert.equal(zinniaVoiceState().playing,true);claimZinniaVoice(microphone);assert.equal(cancelled,1);assert.equal(zinniaVoiceState().listening,true);assert.equal(zinniaSpeechLevel(),0);}finally{forgetZinniaVoice(narration);forgetZinniaVoice(microphone);}
});

test('voice controls live below and left of the viewer, outside Living Frame choices',()=>{
    const pose=zinniaVoiceBarPose(new THREE.Matrix4().makeTranslation(0,1.6,0).elements);
    assert.ok(pose.center.x<-.4 && pose.center.y<1.3 && pose.center.z<-.8);
    assert.ok(zinniaVoiceBarButtons({conversation:true}).some(button=>button.id==='voice'));
    assert.deepEqual(zinniaPlantButtons({phase:'idle'}).map(button=>button.action),['sample']);
    assert.deepEqual(zinniaPlantButtons({phase:'confirm'}).map(button=>button.action),['sample','confirm','back']);
});

test('real narration playback finishes every clip and a new narrator cancels the old sequence',async()=>{
    const oldDocument=globalThis.document,oldFetch=globalThis.fetch,oldContext=globalThis.AudioContext;const started=[];let audioContext;
    globalThis.document=new EventTarget();globalThis.document.hidden=false;
    class Context{constructor(){audioContext=this;this.state='running';this.currentTime=0;this.destination={};}resume(){return Promise.resolve();}close(){return Promise.resolve();}createGain(){return {connect(){},gain:{setTargetAtTime(){}}};}createDelay(){return {connect(){},delayTime:{}};}createDynamicsCompressor(){return {connect(){},threshold:{},knee:{},ratio:{}};}decodeAudioData(){return Promise.resolve({duration:2});}createBufferSource(){const source={playbackRate:{},connect(){},disconnect(){},stop(){source.stopped=true;},start(){started.push(source);}};return source;}createAnalyser(){return {connect(){},disconnect(){},fftSize:256,getFloatTimeDomainData(wave){wave.fill(.05);}};}}
    globalThis.AudioContext=Context;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
    const voice=createProjectNarration(),other=createProjectNarration(),clips=Object.values(PROJECT_NARRATION_CATALOG).slice(0,3);let finished=0,interrupted=0;const states=[];
    const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
    try{
        voice.speak(clips.map(clip=>clip.text).join(' '),{onComplete:()=>finished++,onState:state=>states.push(state),onInterrupt:()=>interrupted++});await flush();assert.equal(started.length,1);assert.ok(zinniaSpeechLevel()>.2);
        started[0].onended();await flush();assert.equal(started.length,2);
        started[1].onended();await flush();assert.equal(started.length,3);
        assert.equal(finished,0);voice.pause();assert.equal(zinniaSpeechLevel(),0);assert.equal(states.at(-1).paused,true);voice.resume();await flush();assert.equal(started.length,4);
        other.speak(clips[0].text);await flush();assert.equal(started[3].stopped,true);assert.equal(voice.status().playing,false);assert.equal(other.status().playing,true);assert.equal(interrupted,1);assert.equal(finished,0);
        let otherFinished=0;other.speak(clips[0].text,{onComplete:()=>otherFinished++});await flush();started.at(-1).onended();await flush();assert.equal(otherFinished,1);
    }finally{voice.destroy();other.destroy();globalThis.document=oldDocument;globalThis.fetch=oldFetch;globalThis.AudioContext=oldContext;}
});
