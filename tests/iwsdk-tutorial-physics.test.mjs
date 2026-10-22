import test from 'node:test';
import assert from 'node:assert/strict';
import * as sdk from '../iwsdk/grabSdk.js';
import {createTutorialPhysicsOwner} from '../app/services/iwsdkTutorialPhysics.js';
import {createPracticeBody} from '../app/services/welcomePracticePhysics.js';
import {readFile} from 'node:fs/promises';
import * as THREE from '../iwsdk/node_modules/three/build/three.module.js';
import {createFruitWindowSDKPhysics} from '../app/services/fruitWindowSDKPhysics.js';
import {createWelcomeButterflyBucket} from '../app/services/welcomeButterflyBucket.js';

test('actual SDK Havok settles a fruit on the table and retains held/release/reset lifecycle',async()=>{
    const savedFetch=globalThis.fetch;
    // Node cannot fetch file: URLs; provide the real pinned WASM bytes only.
    globalThis.fetch=async url=>String(url).endsWith('HavokPhysics.wasm')?
        new Response(await readFile(new URL('../iwsdk/node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url)),{headers:{'Content-Type':'application/wasm'}}):savedFetch(url);
    const owner=createTutorialPhysicsOwner(sdk,{useWorker:false});
    const body=createPracticeBody('peach',{radius:.05});body.visible=true;body.position.y=.45;
    const options={floor:-1,tableVisible:true};
    const tick=async()=>{owner.physics.prepareDebugFrame(1/60);owner.step([body],1/60,options);await owner.physics.flushDebugFrame();};
    try{
        for(let i=0;i<100;i++)await tick();
        assert.ok(owner.snapshot().ready.includes('peach'),'Havok body has an engine handle');
        assert.ok(body.position.y>.045 && body.position.y<.065,'fruit rests on actual table collider');
        body.held=true;body.position.y=.35;for(let i=0;i<5;i++)await tick();
        assert.ok(Math.abs(body.position.y-.35)<1e-5,'held object stays under hand ownership');
        body.held=false;body.velocity.y=0;for(let i=0;i<100;i++)await tick();
        assert.ok(body.position.y<.065 && body.position.y>.045,'release returns to Havok gravity/contact');
        body.position.y=.4;owner.reset();for(let i=0;i<2;i++)await tick();assert.ok(body.position.y>.3,'reset synchronizes engine and authoring pose');
        body.visible=false;await tick();assert.equal(owner.snapshot().bodies,0);
        owner.dispose();owner.dispose();assert.equal(owner.snapshot().colliders,0);
    }finally{owner.dispose();globalThis.fetch=savedFetch;}
});

test('demo Fruit Window uses real Havok only for harvested/released fruit and removes returned bodies',async()=>{
    const savedFetch=globalThis.fetch;
    globalThis.fetch=async url=>String(url).endsWith('HavokPhysics.wasm')?
        new Response(await readFile(new URL('../iwsdk/node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url)),{headers:{'Content-Type':'application/wasm'}}):savedFetch(url);
    const physics=createTutorialPhysicsOwner(sdk,{useWorker:false}),content=new THREE.Group();
    const fruit=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.06),new THREE.MeshBasicMaterial());content.add(fruit);fruit.position.y=.15;
    const asset={picked:false,fruit,detachedParts:[],motion:null},holds=new Map();let time=0;
    const owner=createFruitWindowSDKPhysics(physics,THREE,{content,visibleBounds:node=>new THREE.Box3().setFromObject(node)});
    const tick=async()=>{physics.physics.prepareDebugFrame(1/60);owner.update(asset,holds,time+=1000/60);await physics.physics.flushDebugFrame();};
    try{
        await tick();assert.equal(owner.snapshot().bodies,0,'attached fruit is not simulated');
        asset.picked=true;holds.set('hand',{fruit});for(let i=0;i<4;i++)await tick();
        assert.ok(Math.abs(fruit.position.y-.15)<.001,'held fruit remains at its authored hand pose');
        holds.clear();for(let i=0;i<100;i++)await tick();
        assert.ok(fruit.position.y>-.32 && fruit.position.y<-.29,'released fruit settles on Fruit Window floor, not an invisible tabletop');
        asset.motion={returning:true};await tick();assert.equal(owner.snapshot().bodies,0,'return animation takes ownership atomically');
        asset.motion=null;asset.picked=false;await tick();assert.equal(owner.snapshot().bodies,0);
        owner.dispose();owner.dispose();assert.equal(physics.snapshot().bodies,0);
    }finally{owner.dispose();fruit.geometry.dispose();fruit.material.dispose();globalThis.fetch=savedFetch;}
});

test('the bucket activity advances actual Havok and settles all three cups without the main scene physics branch',async()=>{
 const savedFetch=globalThis.fetch;globalThis.fetch=async url=>String(url).endsWith('HavokPhysics.wasm')?new Response(await readFile(new URL('../iwsdk/node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url)),{headers:{'Content-Type':'application/wasm'}}):savedFetch(url);
 const physics=createTutorialPhysicsOwner(sdk,{useWorker:false}),game=createWelcomeButterflyBucket(new THREE.Group(),{load:async()=>[],getContext:()=>({physicsOwner:physics,floor:-.8})});await game.loading;
 try{
  for(const body of game.physicsBodies())body.position.y=.4;game.syncPhysics();
  for(let i=0;i<120;i++){physics.physics.prepareDebugFrame(1/60);game.update(1/60,[]);await physics.physics.flushDebugFrame();}
  assert.equal(physics.snapshot().ready.length,3);
  for(const cup of game.cups)assert.ok(cup.position.y>.075 && cup.position.y<.095,'cup rests above the actual table collider');
 }finally{game.destroy();physics.dispose();globalThis.fetch=savedFetch;}
});
