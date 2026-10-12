import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {guidedDemoStep} from '../app/features/ar-demo/demoJourneyContent.js';
import {projectNarrationSegments} from '../app/services/projectNarration.js';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createZinniaFramePerch} from '../app/services/zinniaFramePerch.js';
import {LIVING_FRAME_CONTACT} from '../app/services/livingFramePlacement.js';
const main=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');

test('hidden DOM does not pause audible narration while the XR session is visible',()=>{
    const source=fs.readFileSync(new URL('../app/services/projectNarration.js',import.meta.url),'utf8');
    let visible=true,pauses=0,resumes=0,unlocks=0;
    const doc=new EventTarget();doc.hidden=true;
    const voice={status:()=>({playing:true,available:true}),unlock(){unlocks++;},pause(){pauses++;},resume(){resumes++;},stop(){},destroy(){}};
    const scope={document:doc,DEMO_NARRATION_BANK:null,createWelcomePracticeVoice:()=>voice,projectNarrationSegments:()=>[],URL};
    const factory=vm.runInNewContext(source.slice(source.indexOf('export function createProjectNarration')).replace('export function','function').replaceAll('import.meta.url', "'https://example.test/app/services/projectNarration.js'")+';createProjectNarration',scope);
    const narration=factory({demo:true,isVisible:()=>visible});
    try{doc.dispatchEvent(new Event('visibilitychange'));assert.equal(pauses,0);visible=false;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(pauses,1);visible=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(resumes,1);assert.equal(unlocks,1,'resuming XR also resumes AudioContext');}finally{narration.destroy();}
});

test('main welcome uses saved professional narration instead of a live flower greeting',()=>{
    const a=main.indexOf('function showDemoCalmWelcome('),b=main.indexOf('function showArWelcomeShowcase',a);let displayed;
    const scope={welcomePracticeCompleted:false,clearDemoNarration(){},clearTimeout(){},arWelcomeUnlockTimer:null,arWelcomeOpeningActive:true,arWelcomeIntroPending:false,limMeshVisible:true,guidedDemoStep,showIntroBoard:(...args)=>displayed=args};
    vm.runInNewContext(main.slice(a,b)+';showDemoCalmWelcome({returning:false});',scope);
    assert.doesNotMatch(displayed[1],/flower|face|keep you company/i);
    for(const paragraph of displayed[1].split('\n\n'))assert.ok(projectNarrationSegments(paragraph,{demo:true}).every(clip=>clip.recorded),paragraph);
});

test('physical controller rays and panel selection survive outline hand mode',()=>{
    const a=main.indexOf('function drawDemoInputPointer('),b=main.indexOf('    const { origin, direction }',a);
    const scope=vm.createContext({tetherRenderer:{},demoHandMode:'outline',latestControllerRay:{}});
    const pointer=vm.runInContext(main.slice(a,b)+'return true;} drawDemoInputPointer',scope);
    assert.equal(pointer({}, {targetRayMode:'tracked-pointer'}),true);
    assert.equal(pointer({}, {hand:{}}),undefined);
    assert.match(main,/directInteractionOnly:\(\)=>false/);
    assert.doesNotMatch(main,/const loadBees=\(\)=>import/);
});

test('perch branch physically starts inside the native rim volume',async()=>{
    const character=new THREE.Group();character.userData.zinnia={ready:Promise.resolve(false)};
    const perch=createZinniaFramePerch({character});
    const branch=perch.characterMount.parent.children.find(node=>node.geometry?.type==='TubeGeometry');
    const point=branch.geometry.parameters.path.getPoint(0).add(perch.characterMount.parent.position);
    assert.ok(Math.hypot(point.x,point.y)>LIVING_FRAME_CONTACT.inner);
    assert.ok(Math.hypot(point.x,point.y)<LIVING_FRAME_CONTACT.outer);
    assert.ok(point.z>LIVING_FRAME_CONTACT.back && point.z<LIVING_FRAME_CONTACT.front);
    perch.destroy();
});
