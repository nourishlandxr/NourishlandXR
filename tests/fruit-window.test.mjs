import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {FruitWindowGripPair,FruitWindowTriggerHold,fruitWindowSpecies,fruitWindowModes,fruitWindowCanPick} from '../app/services/fruitWindowInteraction.js';
import {FruitDiscoveryAsset} from '../app/assets/fruit-window/discovery-runtime.js';
const anchor=()=>({position:new THREE.Vector3(0,1,-1),quaternion:new THREE.Quaternion()});
test('Species identity matches botanical and common names; unsupported PIMO stays explicit',()=>{
    assert.equal(fruitWindowSpecies({scientific:'Cajanus cajan'}).id,'pigeon_pea_fresh');
    assert.equal(fruitWindowSpecies({plant:'African peach'}).id,'african_peach');
    assert.equal(fruitWindowSpecies({scientific:'Morella rubra'}).id,'chinese_bayberry');
    assert.equal(fruitWindowSpecies({plant:'Moringa'}),null);
    assert.deepEqual(fruitWindowModes(['tag','curiosity','explore']),['tag','curiosity']);
    assert.deepEqual(fruitWindowModes(['tag','curiosity','explore'],true),['tag','curiosity','explore']);
});
test('One grip cannot move; the second joins without a jump; either release freezes movement',()=>{
    const grips=new FruitWindowGripPair(),left={},right={},model=anchor();
    grips.press(left,'left',{x:-.3,y:1,z:-.5});
    grips.update(new Map([[left,{x:5,y:4,z:1}]]),model);assert.deepEqual(model.position.toArray(),[0,1,-1]);
    grips.press(right,'right',{x:5.6,y:4,z:1});
    grips.update(new Map([[left,{x:5,y:4,z:1}],[right,{x:5.6,y:4,z:1}]]),model);assert.deepEqual(model.position.toArray(),[0,1,-1]);
    assert.equal(grips.update(new Map([[left,{x:6,y:4,z:1}],[right,{x:6.6,y:4,z:1}]]),model),true);assert.ok(model.position.distanceTo(new THREE.Vector3(1,1,-1))<1e-10);
    grips.release(left);const frozen=model.position.clone();grips.update(new Map([[right,{x:8,y:3,z:1}]]),model);assert.ok(model.position.equals(frozen));
});
test('Lost tracking, duplicate handles and crossed short grip pairs cannot move the window',()=>{
    const grips=new FruitWindowGripPair(),left={},right={},model=anchor();
    assert.equal(grips.press(left,'left',{x:-.3,y:1,z:0}),true);assert.equal(grips.press(right,'left',{x:.3,y:1,z:0}),false);
    grips.press(right,'right',{x:.3,y:1,z:0});grips.update(new Map([[left,{x:-.3,y:1,z:0}],[right,{x:.3,y:1,z:0}]]),model);
    assert.equal(grips.update(new Map([[right,{x:9,y:1,z:0}]]),model),false);assert.equal(grips.owns(left),false);assert.deepEqual(model.position.toArray(),[0,1,-1]);
    grips.reset();assert.equal(grips.press(left,'left',{x:NaN,y:1,z:0}),false);
    grips.press(left,'left',{x:-.01,y:1,z:0});grips.press(right,'right',{x:.01,y:1,z:0});assert.equal(grips.update(new Map([[left,{x:-.01,y:1,z:0}],[right,{x:.01,y:1,z:0}]]),model),false);
});
test('Moving two grips rotates a rigid window without changing its size',()=>{
    const grips=new FruitWindowGripPair(),left={},right={},model=anchor();grips.press(left,'left',{x:-.3,y:1,z:0});grips.press(right,'right',{x:.3,y:1,z:0});
    grips.update(new Map([[left,{x:-.3,y:1,z:0}],[right,{x:.3,y:1,z:0}]]),model);
    grips.update(new Map([[left,{x:0,y:1,z:.6}],[right,{x:0,y:1,z:-.6}]]),model);
    assert.ok(Math.abs(model.position.length()-Math.sqrt(2))<1e-10);assert.ok(Math.abs(model.quaternion.length()-1)<1e-10);
    assert.ok(new THREE.Vector3(1,0,0).applyQuaternion(model.quaternion).distanceTo(new THREE.Vector3(0,0,-1))<1e-10);
});
test('The harvest arrow and picking exclude immature, picked and returning fruit',()=>{
    assert.equal(fruitWindowCanPick({canPick:false}),false);assert.equal(fruitWindowCanPick({canPick:true}),true);assert.equal(fruitWindowCanPick({canPick:true,picked:true}),false);assert.equal(fruitWindowCanPick({canPick:true,motion:{}}),false);
});

test('Trigger pickup preserves the contact pose, follows its owner and freezes on release',()=>{
    const hold=new FruitWindowTriggerHold(),source={},other={},fruit=new THREE.Object3D();fruit.position.set(.2,.8,-1);
    const pose={position:new THREE.Vector3(0,.8,0),quaternion:new THREE.Quaternion()};
    assert.equal(hold.begin(source,fruit,pose,10),true);const before=fruit.position.clone();
    hold.update(source,pose);assert.ok(fruit.position.equals(before),'no pickup teleport');
    assert.equal(hold.update(other,{...pose,position:new THREE.Vector3(10,10,10)}),false);
    hold.update(source,{...pose,position:pose.position.clone().add(new THREE.Vector3(.4,0,0))});assert.ok(fruit.position.distanceTo(before.clone().add(new THREE.Vector3(.4,0,0)))<1e-10);
    assert.equal(hold.release(other),false);assert.equal(hold.release(source),true);assert.equal(hold.owns(source),false);const frozen=fruit.position.clone();hold.update(source,pose);assert.ok(fruit.position.equals(frozen));
});

test('Green and brown supporting pods can be held, opened and restored without moving their stems',()=>{
    const scene=new THREE.Group(),parent=new THREE.Group();scene.add(parent);
    const fruit=new THREE.Group();fruit.name='PF_FRUIT_ROOT';fruit.position.set(.05,.4,0);parent.add(fruit);
    const ripe=new THREE.Group();ripe.name='ripe';fruit.add(ripe);
    const exterior=new THREE.Group();exterior.name='closed';ripe.add(exterior);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.02,.08,.02),new THREE.MeshStandardMaterial({color:'#7a9d48'}));mesh.material.name='fresh pod exterior';exterior.add(mesh);
    const cut=new THREE.Group();cut.name='cut';ripe.add(cut);
    for(let i=0;i<9;i++){const pod=new THREE.Group();pod.name='pod'+i;pod.position.set(i*.03,.5,0);pod.add(mesh.clone());parent.add(pod);}
    const config={prefix:'PF',fruit_root:fruit.name,stages:{RIPE:{root:'ripe',position:1}},closed_exterior:'closed',cutaway_assembly:'cut',supporting_fruits:Array.from({length:9},(_,i)=>'pod'+i),inspection_offset_glTF:[0,0,.3]};
    const clip=new THREE.AnimationClip('Open',1,[new THREE.VectorKeyframeTrack('cut.scale',[0,1],[.001,.001,.001,1,1,1])]);
    const asset=new FruitDiscoveryAsset({scene,animations:[clip]},config),host=new THREE.Group();host.add(scene);
    assert.deepEqual(new Set(asset.supporting.map(p=>p.userData.harvestMaturity)),new Set(['fresh','dry']));
    for(const maturity of ['fresh','dry']){
        const pod=asset.supporting.find(p=>p.userData.harvestMaturity===maturity),point=pod.getWorldPosition(new THREE.Vector3());
        assert.equal(asset.selectFruit(pod),true);assert.equal(asset.pick(host,{hold:true}),true);assert.equal(asset.motion,null);assert.ok(pod.getWorldPosition(new THREE.Vector3()).equals(point));
        asset.open();asset.update(1.5);assert.equal(asset.opening,1);assert.equal(asset.cut.visible,true);
        asset.showStage('RIPE');assert.equal(pod.parent,parent);assert.ok(pod.getWorldPosition(new THREE.Vector3()).equals(point));
    }
    asset.dispose();
});
