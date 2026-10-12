import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../app/assets/fruit-window/vendor/GLTFLoader.js';
import {WELCOME_FRUIT_ASSETS,WELCOME_INITIAL_FRUITS} from '../app/services/welcomePracticeFruitAssets.js';
import {createPracticeBody,practiceSupport} from '../app/services/welcomePracticePhysics.js';
import {createWelcomePracticeProps} from '../app/services/welcomePracticeProps.js';
import {welcomeWaterStream,welcomeWaterDrop} from '../app/services/welcomeWaterStream.js';

test('real fruit dimensions fit inside the basket, rest on its base and settle after removal',async()=>{
    const oldDocument=globalThis.document;
    const ctx=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};
    try{
        const bodies=[];
        for(const id of WELCOME_INITIAL_FRUITS){const info=WELCOME_FRUIT_ASSETS[id],bytes=fs.readFileSync(new URL(info.url,new URL('../app/services/welcomePracticeFruitAssets.js',import.meta.url)));
            const loader=new GLTFLoader();loader.register(parser=>{parser.loadTexture=async()=>null;return {name:'test-geometry-only'};});const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
            const size=new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()),factor=info.extent/Math.max(size.x,size.y,size.z);
            bodies.push(createPracticeBody(id,{halfSize:{x:Math.max(.01,size.x*factor/2),y:Math.max(.012,size.y*factor/2),z:Math.max(.01,size.z*factor/2)}}));
        }
        const props=createWelcomePracticeProps(new THREE.Group(),bodies);
        for(const body of bodies){Object.assign(body.position,{x:.51,y:.3,z:-.16});assert.equal(props.place(body),true);}
        const restingHalf=body=>{const h=body.halfSize,q=body.rotation,box=new THREE.Box3(new THREE.Vector3(-h.x,-h.y,-h.z),new THREE.Vector3(h.x,h.y,h.z));return box.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w))).getSize(new THREE.Vector3()).multiplyScalar(.5);};
        for(const body of bodies){const p=body.position,h=restingHalf(body);
            assert.ok(Math.hypot(Math.abs(p.x-.51)+h.x,Math.abs(p.z+.16)+h.z)<=.215+1e-9);
            assert.ok(p.y-h.y>=.012-1e-9);
            for(const other of bodies){if(body===other)continue;const k=restingHalf(other),q=other.position;
                assert.ok(Math.abs(p.x-q.x)>=h.x+k.x || Math.abs(p.z-q.z)>=h.z+k.z || Math.abs(p.y-q.y)>=h.y+k.y-1e-9,body.id+' overlaps '+other.id);
            }
        }
        assert.ok(bodies.some(b=>Math.abs(b.position.y-restingHalf(b).y-.012)<1e-9));
        const prior=bodies.slice(1).map(b=>b.position.y);props.remove(bodies[0]);
        bodies.slice(1).forEach((b,i)=>assert.ok(b.position.y<=prior[i]+1e-9));
        assert.equal(props.full,false);
    }finally{globalThis.document=oldDocument;}
});

test('watering follows nozzle to soil, tolerates edge jitter and rejects invalid poses',()=>{
    const origin={x:0,y:.3,z:-.08},direction={x:.1,y:-.5,z:0},pot={x:0,z:-.08};
    const stream=welcomeWaterStream(origin,direction,pot);assert.ok(stream);
    assert.deepEqual(welcomeWaterDrop(stream,0),origin);
    const end=welcomeWaterDrop(stream,1);assert.ok(Math.abs(end.y-.086)<1e-9);assert.ok(end.x>origin.x);
    assert.equal(welcomeWaterStream(origin,{x:0,y:.1,z:0},pot),null);
    assert.equal(welcomeWaterStream({...origin,x:NaN},direction,pot),null);
    assert.equal(welcomeWaterStream({...origin,x:.5},direction,pot),null);
    assert.equal(welcomeWaterStream(origin,{x:0,y:-.05,z:0},pot),null);
    assert.ok(welcomeWaterStream(origin,{x:0,y:-.05,z:0},pot,true));
    const can=createPracticeBody('watering-can',{halfSize:{x:.111,y:.05,z:.041}});
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-1.1);Object.assign(can.rotation,{x:q.x,y:q.y,z:q.z,w:q.w});
    assert.ok(practiceSupport(can)>.12); // long spout cannot penetrate the table when tilted
});
