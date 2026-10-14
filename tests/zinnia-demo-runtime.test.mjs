import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../app/assets/fruit-window/vendor/GLTFLoader.js';
import {createZinniaCharacter} from '../app/services/zinniaCharacter.js';
import {createZinniaFramePerch} from '../app/services/zinniaFramePerch.js';

const bytes=name=>{const data=fs.readFileSync(new URL('../app/assets/'+name,import.meta.url));return data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);};

test('branch intersects the actual SD and HD brown rim through its growth poses',async()=>{
    const saved={self:globalThis.self,createImageBitmap:globalThis.createImageBitmap};globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:64,height:64,close(){}});
    const character=new THREE.Group();character.userData.zinnia={ready:Promise.resolve(false)};
    const perch=createZinniaFramePerch({character}),home=perch.characterMount.parent,branches=home.children.filter(node=>node.geometry?.type==='TubeGeometry');
    try{for(const quality of ['sd','hd']){
        const asset=await new GLTFLoader().parseAsync(bytes('living-frame/living-frame-'+quality+'.glb'),'');
        const mixer=new THREE.AnimationMixer(asset.scene);for(const clip of asset.animations){const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();}
        for(const time of [0,43,60]){
            mixer.setTime(time);asset.scene.updateMatrixWorld(true);
            for(const branch of branches){
                const point=branch.geometry.parameters.path.getPoint(0).add(home.position);point.z-=.012;
                const triangle=new THREE.Triangle(),closest=new THREE.Vector3();let distance=Infinity;
                asset.scene.traverse(node=>{if(!node.isMesh || node.material.name!=='Brown lower soil')return;
                    const index=node.geometry.index,count=index?.count || node.geometry.attributes.position.count;
                    for(let i=0;i<count;i+=3){for(const [offset,p] of [[0,triangle.a],[1,triangle.b],[2,triangle.c]])node.getVertexPosition(index?index.getX(i+offset):i+offset,p).applyMatrix4(node.matrixWorld);triangle.closestPointToPoint(point,closest);distance=Math.min(distance,point.distanceTo(closest));}
                });
                assert.ok(distance<branch.geometry.parameters.radius,`${quality} at ${time}s: branch must intersect actual wood, gap ${distance}`);
            }
        }
    }}finally{perch.destroy();Object.assign(globalThis,saved);}
});

test('demo selection consumes Zinnia ahead of intro actions and respects a nearer panel',()=>{
    const source=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const start=source.indexOf('function activateDemoZinniaAtPointer('),end=source.indexOf('function resolveDemoCellTarget(',start);
    let target={kind:'zinnia',worldPoint:{x:0,y:0,z:0}},reactions=0,pulses=0;
    const context=vm.createContext({resolveDemoCellTarget:()=>target,zinniaFramePerch:{react:hit=>{assert.equal(hit,target);reactions++;return true;}},demoFeedback:{pulse:()=>pulses++}});vm.runInContext(source.slice(start,end),context);
    assert.equal(context.activateDemoZinniaAtPointer({}),true);assert.equal(reactions,1);assert.equal(pulses,1);
    target={kind:'panel'};assert.equal(context.activateDemoZinniaAtPointer({}),false);assert.equal(reactions,1);
    const route=source.slice(source.indexOf("session.addEventListener('select', event => {"),source.indexOf('heroDiceToy?.bindSession'));
    assert.ok(route.indexOf('activateDemoZinniaAtPointer(event.inputSource)')<route.indexOf('if(arWelcomeIntroPending)'));
});

test('bundled demo character responds to a selection and freezes with paused narration',async()=>{
    const character=createZinniaCharacter({load:()=>new GLTFLoader().parseAsync(bytes('welcome-practice/zinnia.glb'),'')});await character.userData.zinnia.ready;
    let paused=false;const perch=createZinniaFramePerch({character,getVoice:()=>({status:()=>({playing:true,audible:!paused,paused}),speechLevel:()=>.45})});
    const matrix=new THREE.Matrix4().makeTranslation(.4,1.2,-2).elements,view={transform:{matrix:new THREE.Matrix4().makeTranslation(0,1.6,0).elements}};
    try{
        for(let i=0;i<40;i++)perch.update(view,matrix,i*30);assert.ok(perch.snapshot().animation.mouthOpen>.5);assert.equal(perch.snapshot().voice.audible,true);
        character.updateMatrixWorld(true);const point=character.localToWorld(new THREE.Vector3(0,.2,0));assert.equal(perch.react({worldPoint:point}),true);assert.equal(perch.snapshot().reaction,'tickle');
        paused=true;const before=perch.snapshot().animation.visibleAge;perch.update(view,matrix,1230);assert.equal(perch.snapshot().animation.visibleAge,before);assert.equal(perch.snapshot().voice.speechLevel,0);assert.equal(perch.snapshot().voice.audible,false);
    }finally{perch.destroy();}
});
