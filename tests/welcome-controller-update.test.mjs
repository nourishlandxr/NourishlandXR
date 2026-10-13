import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {prepareZinniaMicrophone} from '../app/services/prepareZinniaMicrophone.js';
import {createWelcomeControllerSkin} from '../app/services/welcomeControllerSkin.js';
import {getWelcomeNarrationSettings,setWelcomeNarrationSettings} from '../app/services/welcomePracticeVoice.js';

test('microphone preflight requests permission and releases every track before XR',async()=>{
    let stopped=0,saved=false;
    const storage={setItem:key=>{assert.equal(key,'nlxr.mic.ready');saved=true;},removeItem:()=>{saved=false;}};
    const mediaDevices={getUserMedia:async options=>{assert.equal(options.video,false);assert.equal(options.audio.echoCancellation,true);return {getTracks:()=>[{stop:()=>stopped++},{stop:()=>stopped++}]};}};
    assert.equal(await prepareZinniaMicrophone({mediaDevices,storage}),true);assert.equal(stopped,2);assert.equal(saved,true);
    assert.equal(await prepareZinniaMicrophone({mediaDevices:{getUserMedia:async()=>{throw Error('Denied');}},storage}),false);assert.equal(saved,false);
});

test('special controller finishes preserve hardware controls and restore the original skin',()=>{
    const oldDocument=globalThis.document;
    globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
    const model=new THREE.Group(),texture=new THREE.Texture(),original=new THREE.MeshStandardMaterial({color:'#adadad',map:texture,roughness:.42});
    const shell=new THREE.Mesh(new THREE.BoxGeometry(),original);shell.name='controller';model.add(shell);
    const button=new THREE.Mesh(new THREE.BoxGeometry(),original);button.name='a_button';model.add(button);
    let skin;
    try{
        skin=createWelcomeControllerSkin(model);skin.update(2,'standard');assert.equal(shell.material.map,texture);
        skin.update(.2,'paint');const paintMap=shell.material.map;assert.notEqual(paintMap,texture);assert.equal(button.material,original);
        skin.update(.2,'insect');assert.notEqual(shell.material.map,paintMap);
        skin.update(2,'standard');assert.equal(shell.material.map,texture);assert.equal(shell.material.roughness,.42);assert.equal(shell.material.color.getHex(),original.color.getHex());
    }finally{skin?.destroy();globalThis.document=oldDocument;}
});

test('old echo preferences do not add delayed copies to the new narration',()=>{
    const oldStorage=globalThis.localStorage;let saved;
    globalThis.localStorage={getItem:()=>JSON.stringify({echo:.03,volume:.8}),setItem:(_key,value)=>{saved=JSON.parse(value);}};
    try{assert.equal(getWelcomeNarrationSettings().echo,0);assert.equal(getWelcomeNarrationSettings().volume,.8);assert.equal(setWelcomeNarrationSettings({echo:.1}).echo,0);assert.equal(saved.echo,0);}finally{globalThis.localStorage=oldStorage;}
});
