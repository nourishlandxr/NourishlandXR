import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {FruitDiscoveryAsset} from '../app/assets/fruit-window/discovery-runtime.js';
test('Stage changes and return preserve the placement applied by the Fruit Window',()=>{
 const scene=new THREE.Group(),species=new THREE.Group(),fruit=new THREE.Group();fruit.name='fruit';species.add(fruit);scene.add(species);
 const stages={};for(const [i,name] of ['BUD','RIPE'].entries()){const group=new THREE.Group();group.name=name;fruit.add(group);stages[name]={root:name,position:i};}
 const asset=new FruitDiscoveryAsset({scene,animations:[]},{fruit_root:'fruit',stages});
 scene.position.set(.15,-.4,.07);scene.rotation.set(.05,.14,.03);scene.scale.setScalar(.92);const matrix=scene.matrix.clone();scene.updateMatrix();matrix.copy(scene.matrix);
 asset.showStage('BUD');scene.updateMatrix();assert.deepEqual(scene.matrix.elements,matrix.elements);
 asset.showStage('RIPE');scene.updateMatrix();assert.deepEqual(scene.matrix.elements,matrix.elements);
 asset.restore();scene.updateMatrix();assert.deepEqual(scene.matrix.elements,matrix.elements);
 assert.equal(fruit.parent,species);assert.equal(scene.position.y,-.4);
});
