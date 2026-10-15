import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeButterflyBucket} from '../app/services/welcomeButterflyBucket.js';
import {butterflyOpenHand,butterflyOutlineTargets} from '../app/services/welcomeButterflyHands.js';
import {WELCOME_BUTTERFLY_COUNT} from '../app/services/welcomeTrialButterflies.js';
import {createButterflySparkles,BUTTERFLY_SPARKLE_BUDGET} from '../app/services/welcomeButterflySparkles.js';

test('cup sparkles have one bounded instanced burst, respect reduced motion, and clean up',()=>{
    const root=new THREE.Group(),effect=createButterflySparkles(root);try{
        effect.burst(new THREE.Vector3(.1,.2,.3));effect.update(.05);assert.equal(effect.snapshot().active,BUTTERFLY_SPARKLE_BUDGET);assert.equal(root.children.length,1);assert.ok(root.children[0].isInstancedMesh);
        for(let i=0;i<40;i++)effect.update(.05);assert.equal(effect.snapshot().active,0);
        effect.burst(new THREE.Vector3());effect.update(.05,{reducedMotion:true});assert.equal(effect.snapshot().active,10);
        effect.reset();assert.equal(effect.snapshot().active,0);
    }finally{effect.destroy();effect.destroy();assert.equal(root.children.length,0);}
});

export function butterflyTestHand(root,position=new THREE.Vector3(0,.35,.1)){
    const source={handedness:'left',hand:{}},input={source,trigger:false,fist:false,joints:new Map()};
    function move(x=0){const local=position.clone();local.x+=x;const world=root.localToWorld(local.clone());input.matrix=new THREE.Matrix4().setPosition(world).elements;
        const joint=(name,x,y)=>{const p=root.localToWorld(local.clone().add(new THREE.Vector3(x,y,0)));input.joints.set(name,{x:p.x,y:p.y,z:p.z,matrix:new THREE.Matrix4().setPosition(p).elements});};
        joint('wrist',0,0);joint('thumb-tip',.065,.07);joint('thumb-phalanx-distal',.052,.055);
        for(const [i,finger]of ['index','middle','ring','pinky'].entries()){const x=.03-i*.02;joint(finger+'-finger-tip',x,.14);joint(finger+'-finger-phalanx-proximal',x,.05);joint(finger+'-finger-phalanx-intermediate',x,.10);joint(finger+'-finger-metacarpal',x,.025);}
    }move();return {input,move};
}
async function fixture(options={}){
    const root=new THREE.Group();root.updateMatrixWorld(true);const viewer=new THREE.Matrix4().makeTranslation(0,.65,.4).elements,cues=[],zinnia=[];
    const bucket=createWelcomeButterflyBucket(root,{load:async()=>Array.from({length:WELCOME_BUTTERFLY_COUNT},()=>new THREE.Mesh(new THREE.SphereGeometry(1,4,3),new THREE.MeshBasicMaterial())),getContext:()=>({viewer,ready:true,...options.context}),onCue:text=>{cues.push(text);return options.cue;},onZinnia:stage=>zinnia.push(stage)});
    await bucket.loading;const hand=butterflyTestHand(root);return {root,viewer,bucket,cues,zinnia,...hand};
}
function liftHiddenCup(bucket){const source={handedness:'right',hand:{}},point=bucket.bucket.position.clone().add(new THREE.Vector3(0,.073,0)),input={source,trigger:false,matrix:new THREE.Matrix4().setPosition(point).elements};bucket.update(.05,[input]);input.trigger=true;bucket.update(.05,[input]);point.y+=.2;input.matrix=new THREE.Matrix4().setPosition(point).elements;bucket.update(.05,[input]);input.trigger=false;bucket.update(.05,[input]);assert.equal(bucket.snapshot().burst,true);}

test('hidden butterflies fly only after a cup lifts, land on live hand outlines, then release after a shake',async()=>{
    const f=await fixture();const {bucket,input}=f;try{
        assert.equal(bucket.snapshot().cups.length,3);assert.equal(bucket.snapshot().burst,false);assert.equal(bucket.snapshot().insects.length,WELCOME_BUTTERFLY_COUNT);liftHiddenCup(bucket);
        for(let i=0;i<40;i++)bucket.update(.05,[input]);assert.ok(bucket.snapshot().insects.every(i=>i.state==='flying'),'brief flight precedes landing');
        for(let i=0;i<180;i++)bucket.update(.05,[input]);await Promise.resolve();
        const snap=bucket.snapshot(),landed=snap.insects.filter(i=>i.state==='landed');assert.ok(landed.length>=3);assert.equal(snap.complete,false,'landing must not skip the shake lesson');
        assert.equal(f.cues.length,1);assert.match(f.cues[0],/gentle little shake/);
        const targets=butterflyOutlineTargets(input,new THREE.Matrix4());
        for(const insect of landed)assert.ok(targets.some(t=>new THREE.Vector3(...insect.position).distanceTo(t.point)<1e-5),'feet match actual joint outline');
        assert.equal(new Set(landed.map(i=>i.position.join(','))).size,landed.length,'seeded distribution does not stack insects');
        for(const x of [.02,-.02,.02,-.02]){f.move(x);bucket.update(.05,[input]);}
        assert.equal(bucket.snapshot().shaken,1);assert.ok(bucket.snapshot().insects.every(i=>i.state==='flying'));
        for(let i=0;i<44;i++)bucket.update(.05,[]);assert.equal(bucket.snapshot().complete,true);
    }finally{bucket.destroy();}
});

test('curled, far-away, moving or incomplete tracked hands cannot invite perches',async()=>{
    const f=await fixture();try{
        assert.equal(butterflyOpenHand(f.input),true);f.input.joints.delete('ring-finger-tip');assert.equal(butterflyOpenHand(f.input),false);
        liftHiddenCup(f.bucket);
        for(let i=0;i<150;i++)f.bucket.update(.05,[f.input]);assert.ok(f.bucket.snapshot().insects.every(i=>i.state==='flying'));
        f.move(1);for(let i=0;i<150;i++)f.bucket.update(.05,[f.input]);assert.equal(f.bucket.snapshot().landed,0);
        for(let i=0;i<100;i++){f.move(i%2?.04:-.04);f.bucket.update(.05,[f.input]);}assert.equal(f.bucket.snapshot().landed,0);
        f.bucket.reset();assert.equal(f.bucket.snapshot().shaken,0);assert.equal(f.bucket.snapshot().cueStarted,false);
    }finally{f.bucket.destroy();}
});

test('Zinnia butterfly lands before the prompt, remains during speech, and flies after her shake',async()=>{
    let finish;const cue=new Promise(resolve=>finish=resolve),f=await fixture({cue,context:{zinniaPerch:{point:new THREE.Vector3(-.3,.4,0),q:new THREE.Quaternion()}}});
    try{
        liftHiddenCup(f.bucket);
        for(let i=0;i<230;i++)f.bucket.update(.05,[f.input]);
        assert.equal(f.cues.length,1);assert.equal(f.bucket.snapshot().insects.at(-1).perch?.hand,'zinnia');assert.equal(f.bucket.snapshot().cueDone,false);
        finish();await Promise.resolve();for(let i=0;i<25;i++)f.bucket.update(.05,[f.input]);assert.ok(f.zinnia.includes('shake'));assert.equal(f.bucket.snapshot().insects.at(-1).state,'landed');
        for(let i=0;i<16;i++)f.bucket.update(.05,[f.input]);assert.equal(f.bucket.snapshot().insects.at(-1).state,'flying');
    }finally{f.bucket.destroy();}
});
