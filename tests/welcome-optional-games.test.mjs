import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomePracticeTrials} from '../app/services/welcomePracticeTrials.js';
import {createWelcomeComfortOptions} from '../app/services/welcomeComfortOptions.js';
import {createWelcomeControllerGuide} from '../app/services/welcomeControllerGuide.js';

async function withAssets(run){
    const saved={document:globalThis.document,Image:globalThis.Image,fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap,self:globalThis.self};
    const ctx=new Proxy({measureText:text=>({width:text.length*18}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key] || (()=>{})});
    globalThis.document={createElement:()=>({getContext:()=>ctx})};globalThis.Image=class {set src(value){}};
    globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:64,height:64,close(){}});
    globalThis.fetch=async request=>{const url=request.url || String(request);if(url.startsWith('blob:'))return saved.fetch(request);const bytes=fs.readFileSync(new URL(url));return {ok:true,status:200,statusText:'OK',url,headers:new Headers(),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json:async()=>JSON.parse(bytes.toString())};};
    try{await run();}finally{await new Promise(resolve=>setTimeout(resolve,50));Object.assign(globalThis,saved);}
}
const settle=async predicate=>{for(let i=0;i<100 && !predicate();i++)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(predicate(),'local asset must load');};
function input(root,source,point,down=false,trigger=false,rotation=new THREE.Quaternion()){
    root.updateMatrixWorld(true);return {source,matrix:new THREE.Matrix4().compose(point,rotation,new THREE.Vector3(1,1,1)).premultiply(root.matrixWorld).elements,down,trigger};
}

test('Games are launched through the wrist, never loaded on startup, and have compact reset/return controls',()=>withAssets(async()=>{
    const root=new THREE.Group(),trials=createWelcomePracticeTrials(root);
    assert.equal(trials.layer.children.length,0);assert.equal(trials.active,null);
    const stage={trials,snapshot:()=>({phase:'grab',voice:{},trials:trials.snapshot()}),button(){},paint:null,setInputMode:mode=>trials.command('mode:'+mode)};
    const menu=createWelcomeComfortOptions({stage});
    assert.equal(menu.context().items.length,0);menu.act('toggle');assert.ok(menu.context().items.some(item=>item.action==='Comfort:games' && item.ariaLabel==='Games'));
    menu.act('games');const choices=menu.context().items;
    for(const id of ['dragonfly','strawberry'])assert.ok(choices.some(item=>item.action==='Comfort:game:'+id));
    menu.act('game:strawberry');trials.update(0,{visible:true});assert.equal(trials.active,'strawberry');assert.equal(trials.panel.visible,false,'new games use the existing wrist controls');
    menu.act('games');assert.ok(menu.context().items.some(item=>item.action==='Comfort:game-close' && item.ariaLabel==='Return to tutorial'));
    menu.act('input:hands');assert.equal(trials.mode,'hands');menu.act('game-reset');assert.equal(trials.snapshot().game.opened,false);menu.act('game-close');assert.equal(trials.active,null);trials.destroy();
}));

for(const mode of ['controllers','gloves','hands'])test(mode+': optional strawberry packet opens, seed plants, progress persists and reset is independent',()=>withAssets(async()=>{
    const root=new THREE.Group();root.position.set(1,.8,-2);root.rotation.y=.7;
    const trials=createWelcomePracticeTrials(root),source={handedness:'right',hand:mode==='hands'?{}:null};trials.open('strawberry');trials.command('mode:'+mode);
    const tick=(point,down=false,trigger=false,rotation)=>trials.update(.05,{visible:true,inputs:[input(root,source,point,down,trigger,rotation)]});
    tick(new THREE.Vector3(0,.4,0));const group=trials.layer.children[0],packet=group.children.find(node=>node.children.some(child=>child.geometry?.type==='BoxGeometry' && child.geometry.parameters.width===.108));
    assert.ok(packet);tick(packet.position.clone());tick(packet.position.clone(),true,true);assert.equal(trials.snapshot().game.opened,true);
    tick(new THREE.Vector3(-.24,.3,.16));
    const seed=group.children.find(node=>node.children.some(child=>child.geometry?.type==='TorusGeometry' && child.geometry.parameters.radius===.009));
    tick(seed.position.clone());tick(seed.position.clone(),true);tick(new THREE.Vector3(0,.12,-.08),true);tick(new THREE.Vector3(0,.12,-.08));
    assert.equal(trials.snapshot().game.planted,true);assert.equal(trials.snapshot().game.phase,'water');
    assert.equal(group.getObjectByName('Metal watering can').visible,true);
    await settle(()=>trials.snapshot().game.strawberry==='ready');const before=trials.snapshot().game;trials.close();trials.open('dragonfly');await settle(()=>trials.snapshot().game.asset==='ready');trials.close();trials.open('strawberry');assert.deepEqual(trials.snapshot().game,before);
    trials.command('reset');assert.equal(trials.snapshot().game.planted,false);assert.equal(trials.snapshot().game.opened,false);trials.destroy();
}));

test('optional dragonfly uses the actual controller in Insect flight; no detached remote is loaded',()=>withAssets(async()=>{
    const root=new THREE.Group(),trials=createWelcomePracticeTrials(root,{getControllerTool:()=> 'insect'}),source={handedness:'right',gamepad:{axes:[0,0,0,-.7],buttons:[]}};
    trials.open('dragonfly');await settle(()=>trials.snapshot().game.asset==='ready');trials.update(0,{visible:true});
    assert.equal(trials.layer.children[0].getObjectByName('Nature controller'),undefined);
    for(let i=0;i<12;i++)trials.update(.05,{visible:true,inputs:[input(root,source,new THREE.Vector3(.27,.3,.14),true,true)]});
    assert.equal(trials.snapshot().game.airborne,true);assert.ok(trials.snapshot().game.position.y>.035);
    trials.open('strawberry');assert.equal(trials.isHolding(source),false);trials.open('dragonfly');assert.equal(trials.snapshot().game.asset,'ready');trials.command('reset');assert.equal(trials.snapshot().game.airborne,false);trials.destroy();
}));

test('optional planting completes watering, real growth and berry collection through rotated grip poses',()=>withAssets(async()=>{
    const root=new THREE.Group(),trials=createWelcomePracticeTrials(root),source={handedness:'right'};trials.open('strawberry');await settle(()=>trials.snapshot().game.strawberry==='ready');
    const tick=(p,down=false,trigger=false,q)=>trials.update(.05,{visible:true,inputs:[input(root,source,p,down,trigger,q)]});tick(new THREE.Vector3(0,.4,0));
    const group=trials.layer.children[0],packet=group.children.find(n=>n.children.some(c=>c.geometry?.parameters.width===.108));
    tick(packet.position.clone(),true,true);tick(new THREE.Vector3(-.24,.3,.16));
    const seed=group.children.find(n=>n.children.some(c=>c.geometry?.type==='TorusGeometry' && c.geometry.parameters.radius===.009));
    tick(seed.position.clone(),true);tick(new THREE.Vector3(0,.12,-.08),true);tick(new THREE.Vector3(0,.12,-.08));
    const can=group.getObjectByName('Metal watering can');tick(can.position.clone());tick(can.position.clone(),true);
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-Math.PI/2),tip=new THREE.Vector3(.101,.037,0).multiplyScalar(1.18).applyQuaternion(q),center=new THREE.Vector3(0,.24,-.08).sub(tip),grip=new THREE.Vector3(-.04,.004,0).multiplyScalar(1.18).applyQuaternion(q).add(center);
    for(let i=0;i<30;i++)tick(grip,true,false,q);assert.equal(trials.snapshot().game.phase,'grow');assert.equal(trials.snapshot().game.water,1);
    for(let i=0;i<900;i++)trials.update(.05,{visible:true});assert.equal(trials.snapshot().game.grown,true);assert.equal(trials.snapshot().game.phase,'harvest');
    // The ray resolver returns the physical berry even though the wrist panel is closed.
    const ray={origin:{x:0,y:.6,z:-.08},direction:{x:0,y:-1,z:0}};assert.ok(trials.hit(ray));
    const berries=group.children.filter(n=>n.visible && n.children[0]?.isGroup && n.children[0].scale.x<.1);
    assert.ok(berries.length>=3);tick(berries[0].position.clone(),true);tick(new THREE.Vector3(.51,.09,-.16),true);tick(new THREE.Vector3(.51,.09,-.16));assert.equal(trials.snapshot().game.collected,1);
    trials.destroy();
}));

test('official controller textures survive loading; models follow grip pose without persistent lesson labels',()=>withAssets(async()=>{
    const scene=new THREE.Scene(),guide=createWelcomeControllerGuide(scene),source={handedness:'right',profiles:['meta-quest-touch-plus'],gamepad:{buttons:[],axes:[]}},matrix=new THREE.Matrix4().makeTranslation(.2,1,-.5).elements;
    guide.update(0,[{source,matrix}],'controls-trigger',matrix);await settle(()=>guide.snapshot()[0]?.ready);
    guide.update(.016,[{source,matrix}],'controls-trigger',matrix);assert.deepEqual(guide.snapshot()[0].highlighted,['trigger']);
    let textured=false;scene.traverse(node=>{for(const material of [node.material].flat().filter(Boolean))textured ||= Boolean(material.map);});assert.equal(textured,true);
    guide.update(.016,[{source,matrix}],'grab',matrix);assert.equal(guide.snapshot()[0].visible,true);assert.deepEqual(guide.snapshot()[0].highlighted,[]);assert.equal(scene.getObjectByName('Controller label connector').visible,false);
    guide.update(.1,[{source,matrix}],'brush',matrix,false,1,'paint');assert.equal(guide.snapshot()[0].tool,'paint');assert.ok(scene.children[0].children.length>2);guide.update(.1,[{source,matrix}],'grab',matrix,false,1,'standard');assert.equal(guide.snapshot()[0].tool,'standard');assert.deepEqual(scene.children[0].matrix.elements,matrix);guide.update(.016,[],'hands',matrix);assert.equal(guide.snapshot()[0].visible,false);guide.destroy();
}));
