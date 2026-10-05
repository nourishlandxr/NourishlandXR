import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoLivingMapModel,createDemoLivingMapSchedule,demoLivingMapAreaProgress,demoLivingMapItemProgress,demoLivingMapProgress,LIVING_MAP_DURATION_MS} from '../app/services/demoLivingMapModel.js';
import {livingMapPreviewRecords} from '../tools/demo-living-map-fixture.js';

test('complete sample preserves identities, ownership, links and source records',()=>{
    const records=livingMapPreviewRecords(),before=structuredClone(records);
    for(const simulated of [false,true]){
        const model=createDemoLivingMapModel(records,{simulated});
        assert.equal(model.items.filter(item=>item.type==='plant').length,6);
        assert.equal(model.items.filter(item=>item.type==='note').length,2);
        assert.deepEqual(model.areas.map(area=>area.members.length),[4,6]);
        assert.equal(model.links.length,1);
        for(const area of model.areas)for(const item of area.members){assert.ok(item.x>area.left && item.x<area.right && item.z>area.far && item.z<area.near);}
        assert.deepEqual(model.items.map(item=>item.id),records.map(item=>item.id));
    }
    assert.deepEqual(records,before);
});

test('XR layout preserves relative ground distances with one scale and ignores object height',()=>{
    const records=[{id:'a',demoType:'plant',position:{x:2,y:99,z:3}},{id:'b',demoType:'plant',position:{x:4,y:-4,z:3}},{id:'c',demoType:'plant',position:{x:4,y:8,z:7}}];
    const [a,b,c]=createDemoLivingMapModel(records).items;
    assert.equal(a.z,b.z);assert.equal(b.x,c.x);assert.ok(Math.abs((c.z-b.z)/(b.x-a.x)-2)<1e-10);
    records[0].position.y=-900;assert.deepEqual(createDemoLivingMapModel(records).items[0],a);
});

test('empty and invalid placements do not corrupt map geometry',()=>{
    assert.deepEqual(createDemoLivingMapModel([]),{items:[],areas:[],links:[]});
    const model=createDemoLivingMapModel([{id:'bad',demoType:'plant',position:{x:NaN,z:1}},{id:'good',demoType:'plant',position:{x:0,z:0}}]);
    assert.equal(model.items.length,1);assert.equal(model.items[0].x,0);assert.equal(model.items[0].z,0);
});

test('reduced motion and replay retain the complete spatial payoff',()=>{
    assert.deepEqual(demoLivingMapProgress(0,true),{camera:1,markers:1,boundary:1,path:1,scenery:1,wide:1,settled:true});
    assert.equal(demoLivingMapProgress(LIVING_MAP_DURATION_MS).settled,true);
    assert.equal(demoLivingMapProgress(0).camera,0);
    assert.ok(demoLivingMapProgress(5000).camera>demoLivingMapProgress(2500).camera);
    assert.equal(demoLivingMapProgress(2000).boundary,0);
});

test('land begins empty and every plant appears after its own Totem, before its Area boundary',()=>{
    const model=createDemoLivingMapModel(livingMapPreviewRecords()),schedule=createDemoLivingMapSchedule(model);
    assert.equal(schedule.duration,LIVING_MAP_DURATION_MS);
    for(const item of model.items)assert.equal(demoLivingMapItemProgress(schedule,item.id,0),0);
    for(const area of model.areas){
        const totem=schedule.items[area.id],boundary=schedule.areas[area.id];
        for(const plant of area.members.filter(item=>item.type==='plant')){
            assert.ok(schedule.items[plant.id].startAt>=totem.startAt+totem.duration);
            assert.ok(schedule.items[plant.id].startAt+schedule.items[plant.id].duration<boundary.startAt);
            assert.equal(demoLivingMapItemProgress(schedule,plant.id,totem.startAt+totem.duration),0);
        }
        assert.equal(demoLivingMapAreaProgress(schedule,area.id,totem.startAt),0);
    }
    const first=model.areas[0],second=model.areas[1];
    assert.ok(schedule.items[second.id].startAt>schedule.areas[first.id].startAt+schedule.areas[first.id].duration);
    assert.ok(schedule.pathStartedAt>schedule.areas[second.id].startAt+schedule.areas[second.id].duration);
    assert.equal(demoLivingMapProgress(0,false,schedule).scenery,0);
});

test('replay resets every object and reduced motion reveals the complete sample immediately',()=>{
    const model=createDemoLivingMapModel(livingMapPreviewRecords()),schedule=createDemoLivingMapSchedule(model);
    for(const item of model.items){
        assert.equal(demoLivingMapItemProgress(schedule,item.id,schedule.duration),1);
        assert.equal(demoLivingMapItemProgress(schedule,item.id,0),0);
        assert.equal(demoLivingMapItemProgress(schedule,item.id,0,true),1);
    }
    for(const area of model.areas)assert.equal(demoLivingMapAreaProgress(schedule,area.id,0,true),1);
    assert.equal(demoLivingMapItemProgress(schedule,'missing',schedule.duration),0);
});
