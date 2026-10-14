import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {controllerHandPointer} from '../app/services/xrControllerHandPose.js';
import {createWelcomeObjectReveal} from '../app/services/welcomeObjectReveal.js';
import {createFruitWindowXR} from '../app/services/fruitWindowXR.js';

test('virtual-hand pointer stays steady while trigger and grip curl the visible fingers',()=>{
 const names=['wrist',...['index','middle','ring','pinky'].flatMap(f=>[f+'-finger-metacarpal',f+'-finger-phalanx-proximal']),'index-finger-tip'];
 for(const side of ['left','right']){
  const rig={side,names,wristIndex:0,bind:names.map((n,i)=>new THREE.Matrix4().makeTranslation(i*.003,n==='index-finger-tip'?.15:.06,0))};
  const input={matrix:new THREE.Matrix4().makeTranslation(1,1,-2).elements,source:{gamepad:{buttons:[{pressed:false,value:0},{pressed:false,value:0}]}},trigger:false,down:false};
  const open=controllerHandPointer(rig,input);input.trigger=input.down=true;input.source.gamepad.buttons.forEach(b=>{b.pressed=true;b.value=1;});
  const closed=controllerHandPointer(rig,input);assert.deepEqual(closed,open);
  input.matrix=new THREE.Matrix4().makeTranslation(1.1,1,-2).multiply(new THREE.Matrix4().makeRotationY(.4)).elements;const moved=controllerHandPointer(rig,input);assert.notDeepEqual(moved.origin,open.origin);assert.ok(moved.direction.distanceTo(open.direction)>.01);
 }
});

test('table reveal keeps depth occlusion and all parts share the fade amount',()=>{
 const table=new THREE.Group(),materials=[new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial()];
 for(const material of materials)table.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
 const reveal=createWelcomeObjectReveal(table,{duration:4.4,glowStrength:0,opaqueFade:true});
 reveal.update(.7);for(const material of materials){assert.ok(material.opacity>0 && material.opacity<1);assert.equal(material.depthWrite,true);assert.equal(material.userData.arrivalDepthWrite,true);}assert.equal(materials[0].opacity,materials[1].opacity);
 reveal.removeGlow();for(const material of materials){assert.equal(material.opacity,1);assert.equal(material.userData.arrivalDepthWrite,undefined);material.dispose();}table.traverse(n=>n.geometry?.dispose());
});

test('native scene cannot draw a partial table before all mesh buffers are prepared',()=>{
 const saved=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}})})};let draws=0;
 const attrs=['p','n','uv','c','i0','i1','i2','i3','ic'],gl=new Proxy({getExtension:()=>null,getShaderParameter:()=>true,getProgramParameter:()=>true,getParameter:()=>1024,getAttribLocation:(_p,n)=>attrs.indexOf(n),getUniformLocation:(_p,n)=>n,drawArrays(){draws++;}},{get:(t,k)=>k in t?t[k]:k===k.toUpperCase()?k:k.startsWith('create')?()=>({}):()=>{}});
 const scene=new THREE.Scene();for(let i=0;i<4;i++)scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));let renderer;
 try{renderer=createFruitWindowXR(gl,scene);assert.equal(renderer.ready,false);const identity=new THREE.Matrix4().elements,view={projectionMatrix:identity,transform:{inverse:{matrix:identity}}},anchor={position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1}};
  renderer.draw(view,anchor);assert.equal(draws,0);while(!renderer.prepareNext()){}assert.equal(renderer.ready,true);renderer.update();renderer.draw(view,anchor);assert.ok(draws>=4);
 }finally{renderer?.destroy();scene.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});globalThis.document=saved;}
});
