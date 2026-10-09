import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {FruitDiscoveryAsset} from '../app/assets/fruit-window/discovery-runtime.js';
test('Fruit Window laser contacts follow translated and rotated geometry and reject misses',()=>{
 const source=readFileSync(new URL('../app/services/fruitWindowExperience.js',import.meta.url),'utf8');
 const method=source.slice(source.indexOf('        hit(ray){'),source.indexOf('        canAction(name)'));
 const anchor={position:new THREE.Vector3(.7,1.2,-1.4),quaternion:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.55)};
 const content=new THREE.Group(),mesh=new THREE.Mesh(new THREE.SphereGeometry(.06,16,12),new THREE.MeshBasicMaterial());content.add(mesh);content.updateMatrixWorld(true);
 const vector=p=>new THREE.Vector3(p.x,p.y,p.z),caster=new THREE.Raycaster();
 const localRay=ray=>({origin:vector(ray.origin).sub(anchor.position).applyQuaternion(anchor.quaternion.clone().invert()),direction:vector(ray.direction).applyQuaternion(anchor.quaternion.clone().invert()).normalize()});
 const cast=ray=>{caster.set(ray.origin,ray.direction);return caster.intersectObjects(content.children,true);};
 const api=vm.runInNewContext('({'+method+'})',{shown:true,xrGl:{},THREE,anchor,vector,localRay,cast,botanicalHit:()=> 'fruit'});
 const normal=new THREE.Vector3(0,0,1).applyQuaternion(anchor.quaternion),origin=anchor.position.clone().addScaledVector(normal,1),direction=normal.clone().negate();
 const contact=api.hit({origin,direction});assert.equal(contact.kind,'fruit-window');assert.ok(Math.abs(contact.distance-.94)<.002);
 const point=vector(contact.point);assert.ok(point.distanceTo(anchor.position.clone().addScaledVector(normal,.06))<.002);
 assert.equal(api.hit({origin:origin.clone().add(new THREE.Vector3(3,0,0)),direction}),null);
 assert.equal(api.hit({origin,direction:normal}),null);
});
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
