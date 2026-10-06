import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoLivingMapConcept,createDemoLivingMapPlayback,createDemoLivingMapModel,createDemoLivingMapPlacement,createDemoLivingMapSchedule,demoLivingMapAreaProgress,demoLivingMapItemProgress,demoLivingMapProgress,demoLivingMapStage,LIVING_MAP_DURATION_MS,LIVING_MAP_ORB_SETTLE_MS} from '../app/services/demoLivingMapModel.js';
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
    assert.equal(schedule.duration,13000); // The original record-based map stays unchanged.
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

test('concept keeps two distinct gardens, centered Totems and just six Orbs',()=>{
    const model=createDemoLivingMapConcept();
    assert.equal(model.items.length,8);
    assert.equal(model.items.filter(item=>item.type==='plant').length,6);
    assert.equal(model.items.filter(item=>item.type==='note').length,0);
    assert.deepEqual(model.areas.map(area=>area.name),['Area 1','Area 2']);
    assert.deepEqual(model.areas.map(area=>area.totem.name),['Totem 1','Totem 2']);
    for(const area of model.areas){
        assert.equal(area.totem.x,(area.left+area.right)/2);
        assert.ok(Math.abs(area.totem.z-(area.far+area.near)/2)<.1);
        assert.equal(area.members.filter(item=>item.type==='plant').length,3);
        for(const item of area.members)assert.ok(item.x>area.left && item.x<area.right && item.z>area.far && item.z<area.near);
    }
    assert.equal(model.links.length,1);
    assert.equal(model.landscape.swales.length,3);
    for(const row of model.landscape.swales){assert.ok(row.every(point=>point.x<-.8));assert.ok(new Set(row.map(point=>point.z)).size>10);}
    for(const tree of model.landscape.trees)assert.ok(Math.hypot(tree.x-2.85,tree.z)>1.7);
    assert.ok(model.items.filter(item=>item.type==='plant').every(item=>item.name===''));
});

test('interactive map stages three Totems and reveals forest Orbs before the swale placement',()=>{
    const model=createDemoLivingMapConcept({interactive:true}),placement=createDemoLivingMapPlacement(model);
    assert.deepEqual(model.areas.map(area=>area.totem.name),['Totem 1','Totem 2','Totem 3']);
    assert.deepEqual(model.items.filter(item=>item.type==='plant').map(item=>item.areaId),Array(3).fill('map-forest'));
    assert.equal(model.landscape.swales.length,3);
    assert.equal(model.landscape.trees.length>0,true);
    assert.equal(placement.current(0).id,'map-entry');
    assert.equal(placement.place('map-entry',500),true);
    assert.equal(placement.current(500).id,'map-forest');
    assert.equal(placement.place('map-forest',1800),true);
    assert.equal(placement.current(1800),null);
    assert.equal(placement.place('map-swales',1800),false);
    assert.equal(placement.current(1800+LIVING_MAP_ORB_SETTLE_MS).id,'map-swales');
    assert.equal(placement.place('map-swales',1800+LIVING_MAP_ORB_SETTLE_MS),true);
    assert.deepEqual(placement.snapshot().map(item=>item.id),['map-entry','map-forest','map-swales']);
});

test('approved order: landscape, Totem 1, Orbs 1, Totem 2, curved link, Orbs 2',()=>{
    const model=createDemoLivingMapConcept(),schedule=createDemoLivingMapSchedule(model);
    const [first,second]=model.areas;
    assert.equal(schedule.duration,LIVING_MAP_DURATION_MS);
    assert.equal(demoLivingMapProgress(0,false,schedule).scenery,1);
    assert.equal(demoLivingMapStage(0),'Swale garden and open tree garden');
    for(const item of model.items)assert.equal(demoLivingMapItemProgress(schedule,item.id,0),0);
    const end=id=>schedule.items[id].startAt+schedule.items[id].duration;
    const firstOrbs=first.members.filter(item=>item.type==='plant'),secondOrbs=second.members.filter(item=>item.type==='plant');
    for(const orb of firstOrbs){assert.ok(schedule.items[orb.id].startAt>end(first.id));assert.ok(end(orb.id)<schedule.items[second.id].startAt);}
    assert.ok(end(second.id)<schedule.pathStartedAt);
    for(const orb of secondOrbs)assert.ok(schedule.items[orb.id].startAt>=schedule.pathStartedAt+schedule.pathDuration);
    assert.equal(demoLivingMapProgress(10800,false,schedule).path,0);
    assert.equal(demoLivingMapProgress(14000,false,schedule).path,1);
    assert.equal(demoLivingMapStage(14000),'Three Orbs appear in Area 2');
    for(const item of model.items)assert.equal(demoLivingMapItemProgress(schedule,item.id,LIVING_MAP_DURATION_MS),1);
});

test('concept replay and reduced motion reveal the same final scene',()=>{
    const model=createDemoLivingMapConcept(),schedule=createDemoLivingMapSchedule(model);
    for(const item of model.items){assert.equal(demoLivingMapItemProgress(schedule,item.id,0,true),1);assert.equal(demoLivingMapItemProgress(schedule,item.id,0),0);}
    assert.equal(demoLivingMapProgress(0,true,schedule).settled,true);
    assert.equal(demoLivingMapStage(0,true),'Two connected areas');
    assert.equal(demoLivingMapProgress(0,false,schedule).path,0);
});

test('playback begins paused, resumes without jumps and cleanly replays',()=>{
    const playback=createDemoLivingMapPlayback();
    assert.equal(playback.elapsed(99999),0);assert.equal(playback.playing(99999),false);
    playback.play(100000);assert.equal(playback.elapsed(102700),2700);
    playback.pause(103000);assert.equal(playback.elapsed(110000),3000);assert.equal(playback.playing(110000),false);
    playback.play(120000);assert.equal(playback.elapsed(121000),4000);
    assert.equal(playback.elapsed(150000),LIVING_MAP_DURATION_MS);assert.equal(playback.playing(150000),false);
    playback.play(160000);assert.equal(playback.elapsed(160000),0);
    playback.reset(170000,true);assert.equal(playback.elapsed(170500),500);
    playback.reset(180000);assert.equal(playback.elapsed(190000),0);assert.equal(playback.playing(190000),false);
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
