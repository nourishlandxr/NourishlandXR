import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../app/assets/fruit-window/vendor/GLTFLoader.js';
import {createWelcomePracticeTrials,trialTerrainHeight} from '../app/services/welcomePracticeTrials.js';
import {createWelcomePracticeScene} from '../app/services/welcomePracticeScene.js';
import {loadTrialButterflies} from '../app/services/welcomeTrialButterflies.js';

function canvasDocument(){const ctx=new Proxy({measureText:text=>({width:text.length*18}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key] || (()=>{})});return {createElement:()=>({getContext:()=>ctx})};}
function withCanvas(run){const previous=globalThis.document;globalThis.document=canvasDocument();try{return run();}finally{globalThis.document=previous;}}
function inputAt(root,source,x,y,z,down=false,trigger=false,fist=false){root.updateMatrixWorld(true);return {source,matrix:new THREE.Matrix4().makeTranslation(x,y,z).premultiply(root.matrixWorld).elements,down,trigger,fist};}

for(const mode of ['controllers','gloves','hands'])test(mode+': cloud pieces merge, cards become plantable seeds and local rain grows only nearby plants',()=>withCanvas(()=>{
    const root=new THREE.Group();root.position.set(1,.8,-2);root.rotation.y=.7;root.updateMatrixWorld(true);
    const trial=createWelcomePracticeTrials(root),source={handedness:'left',hand:mode==='hands'?{}:null};trial.open('garden');trial.command('mode:'+mode);
    const tick=(x,y,z,down=false,trigger=false,fist=false,seconds=.05)=>{for(let i=0;i<Math.ceil(seconds/.05);i++){root.updateMatrixWorld(true);trial.update(.05,{visible:true,inputs:[inputAt(root,source,x,y,z,down,trigger,fist)]});}};
    tick(-.30,.22,.22);tick(-.30,.22,.22,true);tick(-.04,.39,.06,true);assert.equal(trial.snapshot().cloudPieces,2);tick(-.04,.39,.06);
    // A tracked hand opens a held card with the other hand's pinch.
    tick(-.28,.095,.36);tick(-.28,.095,.36,true);
    if(mode==='hands'){const other={hand:{},handedness:'right'};trial.update(.05,{visible:true,inputs:[inputAt(root,source,-.28,.095,.36,true,true),inputAt(root,other,-.28,.095,.36,true,true)]});}
    else tick(-.28,.095,.36,true,true);
    const x=.12,z=.11,y=.06+trialTerrainHeight(x,z)+.045;
    tick(.08+x,y,.02+z,true,mode==='hands');tick(.08+x,y,.02+z);
    assert.equal(trial.snapshot().plants.length,1);const initial=trial.snapshot().plants[0].growth;
    // Water outside the garden consumes water but does not grow the plant.
    tick(-.04,.39,.06,true);tick(-.25,.35,-.2,true,true,mode==='hands',1);
    assert.equal(trial.snapshot().plants[0].growth,initial);
    tick(.08+x,.35,.02+z,true,true,mode==='hands',2);
    assert.ok(trial.snapshot().plants[0].growth>initial+.5);
    const snapshot=trial.snapshot();trial.close();trial.open('garden');assert.deepEqual(trial.snapshot().plants,snapshot.plants);assert.equal(trial.snapshot().cloudPieces,2);
    trial.command('reset');assert.equal(trial.snapshot().plants.length,0);assert.equal(trial.snapshot().cloudPieces,1);trial.destroy();
}));

test('paint gestures produce persistent spatial strokes, ignore wrong input modes, and support undo/clear',()=>withCanvas(()=>{
    const root=new THREE.Group(),trial=createWelcomePracticeTrials(root),source={handedness:'right'};trial.open('painting');
    const tick=(x,trigger=true)=>trial.update(.05,{visible:true,inputs:[inputAt(root,source,x,.3,.03,false,trigger)]});
    tick(0);tick(.02);tick(.04);tick(.04,false);assert.equal(trial.snapshot().strokes,1);assert.equal(trial.snapshot().paintSegments,2);
    trial.close();trial.open('painting');assert.equal(trial.snapshot().paintSegments,2);
    trial.command('colour');tick(.04);tick(.06);tick(.06,false);assert.equal(trial.snapshot().strokes,2);trial.command('undo');assert.equal(trial.snapshot().paintSegments,2);
    trial.command('mode:hands');tick(.08);tick(.1);assert.equal(trial.snapshot().paintSegments,2);
    trial.command('clear');assert.equal(trial.snapshot().paintSegments,0);assert.equal(trial.snapshot().strokes,0);trial.destroy();
}));

test('opening, switching and closing trials preserves the guided lesson, props and clock',async()=>{
    const oldDocument=globalThis.document,oldFetch=globalThis.fetch,oldWarn=console.warn,oldImage=globalThis.Image;globalThis.document=canvasDocument();globalThis.Image=class {set src(value){this.onerror?.();}};globalThis.fetch=async()=>{throw Error('Use local fixture');};console.warn=()=>{};let stage;
    const voice={status:()=>({playing:false,paused:false,muted:true}),speak(){},pause(){},resume(){},stop(){},unlock(){}};
    try{
        stage=createWelcomePracticeScene({voice,embedded:true,loadZinnia:async()=>{const bytes=fs.readFileSync(new URL('../app/assets/welcome-practice/zinnia.glb',import.meta.url));return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}});await stage.loading;
        const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('grab');stage.update(.05,{viewer,floor:0});
        const orange=stage.objects.get('orange'),position=orange.position.clone();assert.equal(orange.visible,true);
        stage.trials.open('garden');assert.equal(orange.visible,false);for(let i=0;i<800;i++)stage.update(.05,{viewer,floor:0});assert.equal(stage.phase,'grab');assert.equal(stage.snapshot().completed,false);
        stage.trials.command('mode:gloves');assert.equal(stage.controllerHandsVisible,true);assert.equal(stage.handsEnabled,false);
        stage.trials.command('mode:hands');assert.equal(stage.handsEnabled,true);assert.equal(stage.trackedHandOpacity,1);
        stage.trials.open('painting');stage.trials.close();assert.equal(stage.phase,'grab');assert.equal(orange.visible,true);assert.deepEqual(orange.position,position);
        assert.equal(stage.controllerHandsVisible,false);assert.equal(stage.handsEnabled,false);
    }finally{stage?.destroy();globalThis.document=oldDocument;globalThis.fetch=oldFetch;globalThis.Image=oldImage;console.warn=oldWarn;}
});

test('the actual demo butterfly rig bakes finite independent wing morphs for both-eye rendering',async()=>{
    const oldDocument=globalThis.document,oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap;
    globalThis.document=canvasDocument();globalThis.createImageBitmap=async()=>({width:64,height:64});
    const bytes=fs.readFileSync(new URL('../app/assets/animated_butterfly.glb',import.meta.url));globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
    try{const insects=await loadTrialButterflies();assert.equal(insects.length,4);assert.notEqual(insects[0].children[0].morphTargetInfluences,insects[1].children[0].morphTargetInfluences);
        let moved=false;for(const mesh of insects[0].children){const base=mesh.geometry.attributes.position.array,morph=mesh.geometry.morphAttributes.position[0].array;assert.equal(base.length,morph.length);assert.ok(base.every(Number.isFinite));assert.ok(morph.every(Number.isFinite));moved ||= base.some((n,i)=>Math.abs(n-morph[i])>.001);}assert.equal(moved,true);
    }finally{globalThis.document=oldDocument;globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});
