import test from 'node:test';
import assert from 'node:assert/strict';
import {livingMapReveal,livingMapWorldPoint,livingMapRayPoint,livingMapWorldDropAccepted,livingMapGreeneryProgress} from '../app/services/demoLivingMapReveal.js';
test('greenery grows smoothly with a stagger, settles before pickup and respects reduced motion',()=>{
 assert.equal(livingMapGreeneryProgress(5700),0);assert.ok(livingMapGreeneryProgress(7000)>.4);assert.ok(livingMapGreeneryProgress(7000,2)<livingMapGreeneryProgress(7000));
 for(let i=0;i<8;i++){assert.equal(livingMapGreeneryProgress(9800,i),1);assert.equal(livingMapGreeneryProgress(0,i,true),1);}
 assert.equal(livingMapGreeneryProgress(5700),0,'replay starts growth again');
});
test('reading precedes dissolve, reveal and enabled placement, including replay and reduced motion',()=>{
    for(const reduced of [false,true]){
        assert.equal(livingMapReveal(4300,reduced).preview,1);
        assert.equal(livingMapReveal(4300,reduced).appear,0);
        assert.equal(livingMapReveal(9799,reduced).ready,false);
        const final=livingMapReveal(9800,reduced);
        assert.equal(final.preview,0);assert.equal(final.appear,1);assert.equal(final.ready,true);
        assert.equal(livingMapReveal(0,reduced).ready,false);
    }
    assert.ok(livingMapReveal(5200).dissolve>0);assert.ok(livingMapReveal(6500).appear>0);
    assert.equal(livingMapReveal(5200,true).magic,0);
});
test('controller releases follow rotated terrain rather than the old frame surface',()=>{
    const origin={x:.4,y:1,z:-1.2},item={x:2.85,z:0};
    const home=livingMapWorldPoint(item,origin),turned=livingMapWorldPoint(item,origin,Math.PI/2);
    assert.ok(Math.abs(turned.x-origin.x)<1e-8);assert.ok(Math.abs(turned.z-(origin.z-2.85*.085))<1e-8);
    const ray={origin:{...turned,y:turned.y+.5},direction:{x:0,y:-1,z:0}},release=livingMapRayPoint(ray,origin);
    assert.equal(livingMapWorldDropAccepted(release,turned),true);
    assert.equal(livingMapWorldDropAccepted(release,home),false);
    assert.equal(livingMapWorldDropAccepted({...turned,y:turned.y+.2},turned),false);
    assert.equal(livingMapWorldDropAccepted(null,turned),false);
    assert.equal(livingMapRayPoint({...ray,direction:{x:0,y:1,z:0}},origin),null);
    assert.equal(livingMapRayPoint({...ray,direction:{x:1,y:0,z:0}},origin),null);
});
