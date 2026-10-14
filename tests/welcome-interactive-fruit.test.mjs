import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../app/assets/fruit-window/vendor/GLTFLoader.js';
import {createFruitWindowXR} from '../app/services/fruitWindowXR.js';
import {prepareTutorialFruit} from '../app/services/tutorialFruitInteraction.js';
import {setBananaPeel,resetInteractiveFruit,tryAppleBite} from '../app/services/welcomeInteractiveFruit.js';
import {playWelcomePracticeFeedback} from '../app/services/welcomePracticeFeedback.js';
const directory=new URL('../app/assets/welcome-practice/interactive-fruit/',import.meta.url);
async function model(id){const bytes=fs.readFileSync(new URL(id+'.glb',directory)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));delete json.images;delete json.textures;for(const material of json.materials)delete material.pbrMetallicRoughness.baseColorTexture;const raw=Buffer.from(JSON.stringify(json)),text=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(text);const header=Buffer.from(bytes.subarray(0,20)),tail=bytes.subarray(20+length);header.writeUInt32LE(20+text.length+tail.length,8);header.writeUInt32LE(text.length,12);const buffer=Buffer.concat([header,text,tail]);return (await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.length),'')).scene;}

test('supplied peel changes actual vertices in native XR, preserves progress and resets to the closed mesh',async()=>{
    const originalDocument=globalThis.document,calls=[];globalThis.document={createElement:()=>({})};
    const attributes=['p','n','uv','c','i0','i1','i2','i3','ic'];
    const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getExtension:()=>null,getParameter:()=>16,getAttribLocation:(_p,name)=>attributes.indexOf(name),getUniformLocation:(_p,name)=>name},{get(target,key){if(key in target)return target[key];if(key===key.toUpperCase())return key;if(key.startsWith('create'))return ()=>({});return (...args)=>calls.push([key,...args.map(value=>ArrayBuffer.isView(value)?Array.from(value):value)]);}});
    let renderer;
    try{
        const prepared=prepareTutorialFruit(await model('banana-peel'),.19,{normalized:true}),variant={whole:prepared.group};
        assert.ok(Math.abs(prepared.halfSize.y-.095)<.001,'closed collision size excludes all future peel poses');
        const root=new THREE.Group();root.add(prepared.group);renderer=createFruitWindowXR(gl,root);
        const identity=new THREE.Matrix4().elements,view={projectionMatrix:identity,transform:{inverse:{matrix:identity}}},anchor={position:new THREE.Vector3(),quaternion:new THREE.Quaternion()};
        while(!renderer.prepareNext()){}renderer.update();renderer.draw(view,anchor);
        const closed=calls.filter(call=>call[0]==='bufferData').map(call=>call[2]).filter(Array.isArray);calls.length=0;
        setBananaPeel(variant,.4);assert.equal(setBananaPeel(variant,.2),false);assert.equal(variant.peel,.4);
        setBananaPeel(variant,1);renderer.update();renderer.draw(view,anchor);
        const open=calls.filter(call=>call[0]==='bufferSubData').map(call=>call[3]).filter(Array.isArray);assert.ok(open.some(values=>!closed.some(before=>JSON.stringify(values)===JSON.stringify(before))),'native position/normal buffers deform');
        const changed=open.map(values=>JSON.stringify(values));calls.length=0;resetInteractiveFruit(variant);renderer.update();renderer.draw(view,anchor);
        const reset=calls.filter(call=>call[0]==='bufferSubData').map(call=>call[3]).filter(Array.isArray);assert.equal(variant.peel,0);assert.ok(reset.some(values=>closed.some(before=>JSON.stringify(values)===JSON.stringify(before))));assert.ok(reset.some(values=>!changed.includes(JSON.stringify(values))));
    }finally{renderer?.destroy();globalThis.document=originalDocument;}
});

test('apple mouth approach is armed outside the zone and emits one crunch/tap with matching model scale',async()=>{
    const whole=prepareTutorialFruit(await model('apple-whole'),.1,{normalized:true}),bitten=prepareTutorialFruit(await model('apple-bitten'),.1,{normalized:true}),variant={whole:whole.group,bite:bitten.group,biteStates:[bitten.group,prepareTutorialFruit(await model('apple-eaten-2'),.1,{normalized:true}).group,prepareTutorialFruit(await model('apple-eaten-3'),.1,{normalized:true}).group]},body={position:{x:0,y:0,z:0}},source={},sounds=[],pulses=[];
    const feedback=(kind,input)=>playWelcomePracticeFeedback({sound:value=>sounds.push(value),pulse:(...args)=>pulses.push(args)},kind,input);
    assert.equal(whole.group.scale.x,bitten.group.scale.x);assert.ok(Math.abs(whole.halfSize.y-bitten.halfSize.y)<.001);
    assert.equal(tryAppleBite(variant,body,new THREE.Vector3(),source,feedback),false,'initial mouth contact cannot bite');
    tryAppleBite(variant,body,new THREE.Vector3(0,.3,0),source,feedback);assert.equal(tryAppleBite(variant,body,new THREE.Vector3(0,.08,0),source,feedback),true);assert.equal(tryAppleBite(variant,body,new THREE.Vector3(),source,feedback),false);
    for(let i=2;i<=3;i++){tryAppleBite(variant,body,new THREE.Vector3(0,.3,0),source,feedback);assert.equal(tryAppleBite(variant,body,new THREE.Vector3(0,.08,0),source,feedback),true);assert.equal(variant.bites,i);assert.equal(tryAppleBite(variant,body,new THREE.Vector3(),source,feedback),false,'holding at the mouth cannot repeat a bite');assert.deepEqual(variant.biteStates.map(state=>state.visible),[1,2,3].map(step=>step===i));}tryAppleBite(variant,body,new THREE.Vector3(0,.3,0),source,feedback);assert.equal(tryAppleBite(variant,body,new THREE.Vector3(),source,feedback),false,'last state is bounded');assert.deepEqual(sounds,['crunch','crunch','crunch']);assert.deepEqual(pulses,Array.from({length:3},()=>[source,.32,75]));resetInteractiveFruit(variant);assert.equal(variant.bitten,false);assert.equal(variant.bite.visible,false);
});

test('interactive runtime fruit budget stays small and keeps original attribution',()=>{
    const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',directory)));assert.equal(manifest.length,6);assert.ok(manifest.reduce((sum,item)=>sum+item.bytes,0)<1200000);
    for(const item of manifest){const bytes=fs.readFileSync(new URL(item.file,directory)),json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.equal(bytes.length,item.bytes);assert.equal(item.textureEdge,512);assert.ok(json.asset.extras.author);assert.ok(json.asset.extras.license);assert.equal(json.images.length,1);assert.ok(json.materials.length<=2);}
});
