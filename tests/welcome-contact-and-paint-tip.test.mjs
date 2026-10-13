import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createMeshPointerContact} from '../app/services/xrMeshPointerContact.js';
import {createWelcomePracticeTrials} from '../app/services/welcomePracticeTrials.js';
import {PAINT_V2_COLOURS} from '../app/services/spatialPaintV2.js';

test('visible table edges, rotated Zinnia geometry and the native rim transform determine exact contact',()=>{
    const contact=createMeshPointerContact(),root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.4),new THREE.MeshBasicMaterial());root.add(mesh);root.position.set(1,.8,-2);root.rotation.y=.65;root.updateMatrixWorld(true);
    const origin=root.localToWorld(new THREE.Vector3(.1,.5,0)),ray={origin,direction:{x:0,y:-1,z:0}},hit=contact(ray,root,{kind:'table'});assert.ok(Math.abs(hit.worldPoint.y-.84)<1e-6);assert.ok(Math.abs(hit.distance-.46)<1e-6);
    mesh.visible=false;assert.equal(contact(ray,root),null);mesh.visible=true;root.visible=false;assert.equal(contact(ray,root),null);root.visible=true;
    const rim=new THREE.Group();rim.add(new THREE.Mesh(new THREE.BoxGeometry(.15,.2,.06),new THREE.MeshBasicMaterial()));const matrix=new THREE.Matrix4().makeTranslation(0,1,-1).multiply(new THREE.Matrix4().makeTranslation(0,0,.012));
    const rimHit=contact({origin:{x:0,y:1,z:0},direction:{x:0,y:0,z:-2}},rim,{matrix:matrix.elements,kind:'living-frame-rim'});assert.ok(Math.abs(rimHit.worldPoint.z-(-.958))<1e-6);assert.ok(Math.abs(rimHit.distance-.958)<1e-6);
});

test('paint tip stays on the right controller through colour changes and left menu presses, while spray uses a patterned sphere',()=>{
    const saved=globalThis.document,ctx=new Proxy({measureText:text=>({width:text.length*18})},{get:(target,key)=>target[key] || (()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
    let trials;try{
        const root=new THREE.Group();trials=createWelcomePracticeTrials(root,{wristControls:true});trials.open('painting');
        const right={handedness:'right'},left={handedness:'left'},input=(source,x,trigger=false,uiBlocked=false)=>({source,matrix:new THREE.Matrix4().makeTranslation(x,.3,0).elements,trigger,uiBlocked});
        trials.update(.016,{visible:true,inputs:[input(right,.2),input(left,-.2)]});const tip=root.getObjectByName('Selected paint tip');assert.equal(tip.position.x,.2);
        trials.command('colour:6');trials.update(.016,{visible:true,inputs:[input(right,.2,false,true),input(left,-.2,true)]});assert.equal(tip.position.x,.2);assert.equal(trials.snapshot().strokes,0);assert.equal(tip.children[0].material.color.getHexString(),PAINT_V2_COLOURS[6].slice(1));
        trials.command('brush:spray');trials.update(.016,{visible:true,inputs:[input(right,.2),input(left,-.2,true)]});assert.equal(tip.children[0].visible,false);assert.equal(tip.children[1].visible,true);assert.equal(tip.children[2].children.length,12);
        trials.update(.016,{visible:true,inputs:[input(right,.2,true,true),input(left,-.2)]});trials.update(.016,{visible:true,inputs:[input(right,.2,true),input(left,-.2)]});assert.equal(trials.snapshot().strokes,0,'release the menu trigger before painting resumes');trials.update(.016,{visible:true,inputs:[input(right,.2),input(left,-.2)]});
        trials.update(.016,{visible:true,inputs:[input(right,.2,true),input(left,-.2)]});trials.update(.016,{visible:true,inputs:[input(right,.22,true),input(left,-.2)]});assert.equal(trials.snapshot().strokes,1);
    }finally{trials?.destroy();globalThis.document=saved;}
});
