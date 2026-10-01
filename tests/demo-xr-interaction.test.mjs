import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoGestureRouter, nearestDemoXrTarget } from '../app/services/demoXrInteraction.js';

test('nearest visible spatial target wins instead of fixed LIMO-before-PIMO ordering',()=>{
    assert.equal(nearestDemoXrTarget([
        {kind:'lim-cell',id:'pathway',distance:2.8},
        {kind:'pim-cell',id:'pigeon-root',distance:1.1}
    ]).id,'pigeon-root');
    assert.equal(nearestDemoXrTarget([
        {kind:'pim-cell',id:'root',distance:1.1},
        {kind:'panel',id:'close',distance:.8}
    ]).id,'close');
});

test('nearest PIMO wins regardless of marker array order',()=>{
    const a={kind:'pim-cell',id:'first',distance:2.2},b={kind:'pim-cell',id:'second',distance:1.2};
    assert.equal(nearestDemoXrTarget([a,b]).id,'second');
    assert.equal(nearestDemoXrTarget([b,a]).id,'second');
});

test('gesture remains owned by its PIMO when the ray drifts across LIMO',()=>{
    const actions=[],cancellations=[];
    const router=createDemoGestureRouter({activate:target=>actions.push(target.id),cancel:(target,reason)=>cancellations.push(`${target.id}:${reason}`)});
    const source={handedness:'right'};
    assert.equal(router.begin(source,{kind:'pim-cell',id:'pigeon-root',distance:1}),true);
    assert.equal(router.select(source),true);
    assert.equal(router.select(source),false);
    assert.equal(router.end(source),true);
    assert.deepEqual(actions,['pigeon-root']);
    assert.deepEqual(cancellations,['pigeon-root:end']);
});

test('foreign controller cannot activate or end another controller gesture',()=>{
    const actions=[];const right={id:'right'},left={id:'left'};
    const router=createDemoGestureRouter({activate:target=>actions.push(target.id)});
    router.begin(left,{kind:'lim-cell',id:'uses',distance:2});
    assert.equal(router.select(right),false);
    assert.equal(router.end(right),false);
    assert.equal(router.select(left),true);
    assert.equal(router.end(left),true);
    assert.deepEqual(actions,['uses']);
});

test('visibility or confirmation reset clears ownership for the next PIMO/LIMO action',()=>{
    const cancellations=[];const source={};
    const router=createDemoGestureRouter({cancel:(target,reason)=>cancellations.push(`${target.id}:${reason}`)});
    router.begin(source,{kind:'pim-cell',id:'pigeon-child',distance:1});
    assert.equal(router.reset('visibility-hidden'),true);
    assert.equal(router.owner,null);
    assert.equal(router.begin(source,{kind:'lim-cell',id:'food-forest',distance:2}),true);
    assert.equal(router.reset('close-confirmation'),true);
    assert.equal(router.begin(source,{kind:'pim-cell',id:'pigeon-root',distance:1}),true);
    assert.deepEqual(cancellations,['pigeon-child:visibility-hidden','food-forest:close-confirmation']);
});

test('shared regression sequence opens Pigeon PIMO, four LIMO pathways and Pigeon PIMO again',()=>{
    const actions=[],source={};
    const router=createDemoGestureRouter({activate:target=>actions.push(target.id)});
    const press=(kind,id,distance)=>{assert.equal(router.begin(source,{kind,id,distance}),true);assert.equal(router.select(source),true);assert.equal(router.end(source),true);};
    press('pim-cell','pigeon-root',1);
    press('pim-cell','pigeon-child',1);
    for(const [root,child] of [['climate','subtropical'],['food-forest','layers'],['plant','identity'],['pin','observation']]){press('lim-cell',root,2);press('lim-cell',child,2);}
    press('pim-cell','pigeon-root-return',1);
    press('pim-cell','pigeon-child-return',1);
    assert.deepEqual(actions,['pigeon-root','pigeon-child','climate','subtropical','food-forest','layers','plant','identity','pin','observation','pigeon-root-return','pigeon-child-return']);
});
