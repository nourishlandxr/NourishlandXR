import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {FruitDiscoveryAsset} from '../app/assets/fruit-window/discovery-runtime.js';
import {fruitWindowVisibleBounds,fruitHandPose} from '../app/services/fruitWindowExperience.js';
import {fruitInsidePalm} from '../app/services/xrDirectInteraction.js';

test('Fruit Window XR pickup uses palm contact with real mesh bounds, without a ray fallback',()=>{
 const source=readFileSync(new URL('../app/services/fruitWindowExperience.js',import.meta.url),'utf8');
 const start=source.indexOf('    function handFruitHit('),end=source.indexOf('    function beginHandFruit(',start);
 const content=new THREE.Group(),fruit=new THREE.Mesh(new THREE.SphereGeometry(.04),new THREE.MeshBasicMaterial());content.add(fruit);content.updateMatrixWorld(true);
 const context={THREE,fruitInsidePalm,fruitWindowVisibleBounds,visible:()=>true,content,asset:{canPick:true,detachedParts:[],pickableRigs:new Map([[fruit,{}]])},localSourcePose:t=>({position:new THREE.Vector3(...t.position),quaternion:new THREE.Quaternion()})};
 const hit=vm.runInNewContext(source.slice(start,end)+';handFruitHit',context);
 assert.equal(hit({position:[.13,0,0]}),null);assert.equal(hit({position:[.02,0,0]}).object,fruit);
 const joints=new Map([['wrist',{matrix:new THREE.Matrix4().elements}]]);for(const f of ['index','middle','ring','pinky'])for(const j of ['metacarpal','phalanx-proximal'])joints.set(f+'-finger-'+j,{x:.1,y:.2,z:.3});
 const pose=fruitHandPose({tracked:true,rawJoints:joints});assert.ok(pose.position.distanceTo(new THREE.Vector3(.1,.2,.3))<1e-8);
 const begin=source.slice(end,source.indexOf('\n    ',end+35));assert.doesNotMatch(begin,/state\.pointer|cast\(/);
});
test('Fruit Window laser contacts follow translated and rotated geometry and reject misses',()=>{
 const source=readFileSync(new URL('../app/services/fruitWindowExperience.js',import.meta.url),'utf8');
 const method=source.slice(source.indexOf('        hit(ray){'),source.indexOf('        canAction(name)'));
 const anchor={position:new THREE.Vector3(.7,1.2,-1.4),quaternion:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.55)};
 const content=new THREE.Group(),mesh=new THREE.Mesh(new THREE.SphereGeometry(.06,16,12),new THREE.MeshBasicMaterial());content.add(mesh);content.updateMatrixWorld(true);
 const vector=p=>new THREE.Vector3(p.x,p.y,p.z),caster=new THREE.Raycaster();
 const localRay=ray=>({origin:vector(ray.origin).sub(anchor.position).applyQuaternion(anchor.quaternion.clone().invert()),direction:vector(ray.direction).applyQuaternion(anchor.quaternion.clone().invert()).normalize()});
 const cast=ray=>{caster.set(ray.origin,ray.direction);return caster.intersectObjects(content.children,true);};
 const observationBounds=new THREE.Box3(new THREE.Vector3(-.06,-.06,-.06),new THREE.Vector3(.06,.06,.06));
 const context={shown:true,fadeStartedAt:null,xrGl:{},THREE,anchor,vector,localRay,observationBounds,cast,botanicalHit:()=> 'fruit'};
 const api=vm.runInNewContext('({'+method+'})',context);
 const normal=new THREE.Vector3(0,0,1).applyQuaternion(anchor.quaternion),origin=anchor.position.clone().addScaledVector(normal,1),direction=normal.clone().negate();
 const contact=api.hit({origin,direction});assert.equal(contact.kind,'fruit-window');assert.ok(Math.abs(contact.distance-.94)<.002);
 const point=vector(contact.point);assert.ok(point.distanceTo(anchor.position.clone().addScaledVector(normal,.06))<.002);
 assert.equal(api.hit({origin:origin.clone().add(new THREE.Vector3(3,0,0)),direction}),null);
 assert.equal(api.hit({origin,direction:normal}),null);
 context.fadeStartedAt=100;assert.equal(api.hit({origin,direction}),null);
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
