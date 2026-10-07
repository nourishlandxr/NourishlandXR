import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../app/vendor/three.module.min.js';
import {createLivingMapTwoGrip} from '../app/services/demoLivingMapGrip.js';
import {noteSurfaceFacing,noteCardButtonLayout} from '../app/services/noteSpatialRenderer.js';
import {createDemoLivingMapXR} from '../app/services/demoLivingMapXR.js';
import {livingMapPlacementCopy,resetDemoPlantForMap} from '../app/services/demoLivingMapPresentation.js';

test('two hands carry the plate toward the viewer without scaling; release freezes its pose',()=>{
 const origin={x:0,y:1,z:-1.2},rotation=new THREE.Quaternion(),gesture=createLivingMapTwoGrip();
 const samples=['left','right'].map((handedness,i)=>({source:{},handedness,tracked:true,pressed:true,position:{x:i?.5:-.5,y:1,z:-1.2},up:{x:0,y:1,z:0}}));
 gesture.update(samples,origin,rotation);
 for(const hand of samples){hand.position.y+=.3;hand.position.z+=.65;}
 assert.ok(gesture.update(samples,origin,rotation).angleTo(rotation)<1e-6);
 assert.ok(gesture.position.distanceTo(new THREE.Vector3(0,1.3,-.55))<1e-6);
 samples[0].pressed=false;assert.equal(gesture.update(samples,origin,rotation),null);assert.equal(gesture.active,false);
});
test('each offset widget faces the user, and sparse options occupy the card',()=>{
 const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;
 for(const x of [-.98,.98]){const center={x,y:1.4,z:-1.6},face=noteSurfaceFacing(center,viewer),normal=new THREE.Vector3(-face.right.z,0,face.right.x),toward=new THREE.Vector3(-x,0,1.6).normalize();assert.ok(normal.dot(toward)>.99999);}
 const sparse=noteCardButtonLayout(3,false);assert.ok(sparse[0].height>100);assert.equal(sparse[2].width,942);
 for(const count of [1,3,4,7,8])for(const button of noteCardButtonLayout(count,count>4)){assert.ok(button.y+button.height<=390);assert.ok(button.x+button.width<=988);}
});
test('XR skips painting the hidden desktop Living Frame canvas from startup',()=>{
 const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8'),body=source.slice(source.indexOf('function paintWelcomeLayer(now) {'),source.indexOf('function paintWelcomeLayer(now) {')+source.slice(source.indexOf('function paintWelcomeLayer(now) {')).indexOf('const spatialState='));
 vm.runInNewContext(body+'}',{arWelcomeCanvas:{getContext(){throw Error('Hidden canvas must not paint');}},simulatedMode:false});
 const context=vm.createContext({arWelcomeCanvas:{},simulatedMode:false});vm.runInContext(body+'}',context);vm.runInContext('paintWelcomeLayer(0)',context);
});
test('native map redraws every XR view while reusing mesh uploads and cached material colours',()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0})};
 const calls=[],gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:(_p,name)=>name},{get:(target,key)=>key in target?target[key]:key.startsWith('create')?()=>({}):key===key.toUpperCase()?key:(...args)=>calls.push([key,...args])});
 const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshBasicMaterial({color:'#456b38'}),cluster=new THREE.InstancedMesh(geometry,material,65);
 let colourConversions=0;const clone=material.color.clone.bind(material.color);material.color.clone=()=>{colourConversions++;return clone();};
 for(let i=0;i<65;i++)cluster.setMatrixAt(i,new THREE.Matrix4().makeTranslation(i,0,0));scene.add(cluster);scene.updateMatrixWorld();
 const renderer=createDemoLivingMapXR(gl,scene),matrix=new THREE.Matrix4().elements,view={projectionMatrix:matrix,transform:{inverse:{matrix}}};
 try{renderer.draw(view,{x:0,y:1,z:-1},0,1);const uploads=calls.filter(c=>c[0]==='bufferData').length;renderer.draw(view,{x:0,y:1,z:-1},0,1);assert.equal(calls.filter(c=>c[0]==='drawArrays').length,2,'a cleared XR framebuffer is redrawn');const otherEye={projectionMatrix:new THREE.Matrix4().makeRotationY(.02).elements,transform:{inverse:{matrix:new THREE.Matrix4().elements}}};renderer.draw(otherEye,{x:0,y:1,z:-1},0,1);assert.equal(calls.filter(c=>c[0]==='drawArrays').length,3,'the other eye receives its own draw');assert.equal(calls.filter(c=>c[0]==='bufferData').length,uploads);assert.equal(colourConversions,1,'static colour conversion is cached');assert.equal(calls.find(c=>c[0]==='drawArrays')[3],65*36);}
 finally{renderer.destroy();geometry.dispose();material.dispose();globalThis.document=previous;}
});
test('map placements explain entrance, local information and swales; PIMO reopens from its initial view',()=>{
 assert.match(livingMapPlacementCopy(1),/starting point/);assert.match(livingMapPlacementCopy(2),/information about this Area/);assert.match(livingMapPlacementCopy(3),/swale/);
 const record={id:'plant-1',demoType:'plant',name:'Pigeon Pea',demoExpanded:true,demoExpandedNodeIds:['Uses'],demoSelectedNodeId:'Uses.food',knowledgeExplorer:{mode:'explore',pages:{Uses:3}},explorerMolecule:{expanded:['Uses']}};
 assert.equal(resetDemoPlantForMap(record),true);assert.equal(record.demoExpanded,false);assert.deepEqual(record.demoExpandedNodeIds,[]);assert.equal(record.demoSelectedNodeId,'');assert.equal(record.knowledgeExplorer,undefined);assert.equal(record.id,'plant-1');assert.equal(record.name,'Pigeon Pea');
});
