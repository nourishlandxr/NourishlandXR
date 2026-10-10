import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {FruitWindowTriggerHold} from '../app/services/fruitWindowInteraction.js';
import {translateNxrText} from '../app/services/i18n.js';
test('second controller can join the held fruit but cannot play while it is carried',()=>{
 const text=readFileSync(new URL('../app/services/fruitWindowExperience.js',import.meta.url),'utf8'),a=text.indexOf('handleEvent(event){'),b=text.indexOf('        activate(ray)',a);
 const first={},second={},fruit=new THREE.Object3D(),hold=new FruitWindowTriggerHold();hold.begin(first,fruit,{position:new THREE.Vector3(),quaternion:new THREE.Quaternion()},0);
 let picks=0,plays=0,kind='fruit';
 const ctx=vm.createContext({performance,fadeStartedAt:null,hitFruit:()=>fruit,localSourcePose:()=>({position:new THREE.Vector3(),quaternion:new THREE.Quaternion()}),shown:true,xrGl:{},space:{},fruitHold:hold,grips:{owns:()=>false},selections:new Set(),syncButtons(){},cast:()=>[{}],localRay:ray=>ray,botanicalHit:()=>kind,pickHit:()=>{picks++;return true;},action:()=>plays++});
 vm.runInContext('globalThis.api=({'+text.slice(a,b)+'})',ctx);
 const event={type:'selectstart',inputSource:second,frame:{getPose:()=>({transform:{matrix:new THREE.Matrix4().elements}})}};
 assert.equal(ctx.api.handleEvent(event),true);assert.equal(hold.holds.size,2);assert.equal(hold.pair.fruit,fruit);
 kind='play';ctx.selections.clear();assert.equal(ctx.api.handleEvent(event),true);
 assert.equal(picks,1);assert.equal(plays,0);assert.equal(hold.source,first);
});
test('discovery labels and dynamic message parts have Portuguese and Dutch translations',()=>{
 for(const language of ['pt-PT','nl-NL'])for(const label of ['Fruit Window','Return fruit','Plant example','Loading','Visual example for','PIMO information remains','Ready. The arrow marks the fruit you can pick.','Pigeon pea · fresh','Pigeon pea · dry'])assert.notEqual(translateNxrText(label,language),label,language+': '+label);
});
test('Notes visibility toggles without creating a note',()=>{
 const text=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8'),a=text.indexOf("    if(action.startsWith('visibility:')){"),b=text.indexOf("    if(action==='notes')",a);
 let created=0;const ctx=vm.createContext({markers:[],demoHiddenElements:new Set(['note']),createDemoNote:()=>created++,syncDemoPanelActions(){},updateSimulatedMarkers(){},demoPlacedNoteDomViews:new Map(),demoPlacedNoteViews:new Map()});
 vm.runInContext('function run(action){'+text.slice(a,b)+'} run("visibility:note")',ctx);
 assert.equal(created,0);assert.equal(ctx.demoHiddenElements.has('note'),false);
});
