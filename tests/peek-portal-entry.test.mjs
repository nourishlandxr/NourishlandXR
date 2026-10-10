import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {createPortalPlantStudy} from '../app/services/portalPlantStudy.js';

test('portal head crossing opens surrounding space and retreat restores aperture without moving scene',()=>{
 const study=createPortalPlantStudy(),camera=new THREE.PerspectiveCamera();
 const move=(x,z)=>{camera.position.set(x,0,z);camera.updateMatrixWorld(true);study.update(camera);};
 move(0,1);assert.equal(study.inside,false);assert.equal(study.aperture.visible,true);
 move(1.2,-.1);assert.equal(study.inside,false);assert.equal(study.world.visible,false);
 move(0,1);move(0,-.1);assert.equal(study.inside,true);assert.equal(study.aperture.visible,false);assert.equal(study.world.visible,true);
 for(const node of study.world.children)assert.equal(node.material.stencilFunc,THREE.AlwaysStencilFunc);
 move(1.2,-.3);assert.equal(study.inside,true);assert.deepEqual(study.root.position.toArray(),[0,0,0]);
 move(0,.1);assert.equal(study.inside,false);assert.equal(study.aperture.visible,true);
 for(const node of study.world.children)assert.equal(node.material.stencilFunc,THREE.EqualStencilFunc);
 study.dispose();assert.equal(study.disposed,true);
});
