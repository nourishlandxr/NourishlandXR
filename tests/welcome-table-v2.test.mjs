import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeControlOrb,CONTROL_ORB_DEFAULTS} from '../app/services/welcomeControlOrb.js';
import {createWelcomePracticeTable} from '../app/services/welcomePracticeTable.js';

test('Orb starts beside Zinnia and resets to its forest-green shell and purple core',()=>{
 const root=new THREE.Group(),orb=createWelcomeControlOrb(root);root.updateMatrixWorld(true);
 try{for(const reset of [false,true]){
  if(reset){orb.group.position.set(0,1,0);orb.group.children[0].children[0].material.color.set('#ffffff');orb.reset();}
  orb.update(.05,'controls-orb-grab',[]);
  assert.ok(orb.group.position.x<-.25);assert.ok(Math.hypot(orb.group.position.x-.02,orb.group.position.z+.28)>.45,'clear of Zinnia centre');
  assert.equal(orb.group.children[0].children[0].material.color.getHexString(),CONTROL_ORB_DEFAULTS.shell.slice(1));
  assert.equal(orb.group.children[1].material.color.getHexString(),CONTROL_ORB_DEFAULTS.core.slice(1));
 }}finally{orb.destroy();}
});

test('Table V2 preserves its support plane and bounded geometry at adjustable heights',()=>{
 const saved=globalThis.document,ctx=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const root=new THREE.Group();let table;
 try{
  table=createWelcomePracticeTable(root);const top=root.getObjectByName('Table V2 rounded timber top'),rim=root.getObjectByName('Table V2 continuous rounded retaining rim');root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(top);assert.ok(Math.abs(bounds.max.y)<.0001);assert.ok(bounds.min.y>-.036);
  assert.ok(bounds.max.x<=.951 && bounds.min.x>=-.951);assert.ok(bounds.max.z<=.451 && bounds.min.z>=-.451);
  assert.ok(new THREE.Box3().setFromObject(rim).max.y>=.044);
  assert.equal(top.material.map.image.width,1024);assert.equal(top.material.map.image.height,512);
  let triangles=0;table.group.traverse(node=>{if(node.isMesh)triangles+=(node.geometry.index?.count || node.geometry.attributes.position.count)/3;});assert.ok(triangles<6000,'rounded table stays within a small standalone XR budget');
  for(const height of [.5,.8,1.1]){table.setHeight(height);root.updateMatrixWorld(true);const stand=new THREE.Box3().setFromObject(table.stand),foot=new THREE.Box3().setFromObject(table.foot);assert.ok(stand.max.y<bounds.min.y);assert.ok(foot.max.y<=stand.min.y+.001);}
 }finally{globalThis.document=saved;root.traverse(node=>{node.geometry?.dispose();node.material?.map?.dispose();node.material?.dispose();});}
});
