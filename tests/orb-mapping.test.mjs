import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrbMappingDraft,mappingGroundPoint,mappedOrbPoints} from '../app/services/orbMapping.js';
import {createCreatorQuickStart} from '../app/services/creatorQuickStart.js';

const record=()=>({marker:{id:'ginger',type:'plant'},position:{x:10,y:1,z:20}});
test('a ginger clump saves relative to its Orb and restores with the anchor',()=>{
    const draft=createOrbMappingDraft(),orb=record();draft.begin(orb,'area');
    for(const p of [{x:9,y:0,z:19},{x:11,y:0,z:19},{x:11,y:0,z:21}])draft.add(p);
    orb.marker.spatial_mapping=JSON.parse(JSON.stringify(draft.serialize()));
    orb.position={x:100,y:2,z:200};
    assert.deepEqual(mappedOrbPoints(orb),[{x:99,y:1,z:199},{x:101,y:1,z:199},{x:101,y:1,z:201}]);
});
test('invalid areas, duplicate points, undo and cancel cannot persist a broken boundary',()=>{
    const draft=createOrbMappingDraft();assert.throws(()=>draft.begin({marker:{id:'note',type:'note'}}));
    draft.begin(record(),'area');assert.equal(draft.add({x:NaN,y:0,z:0}),false);
    for(let x=0;x<3;x++)draft.add({x,y:0,z:0});assert.throws(()=>draft.serialize(),/distinct/);
    draft.undo();assert.throws(()=>draft.serialize(),/three/);assert.equal(draft.add({x:1,y:0,z:0}),false);
    draft.cancel();assert.equal(draft.snapshot().target,null);assert.throws(()=>draft.serialize(),/Select/);
});
test('line marking uses two points and only valid forward ground intersections',()=>{
    const draft=createOrbMappingDraft();draft.begin(record(),'line');draft.add({x:0,y:0,z:0});assert.throws(()=>draft.serialize(),/two/);
    draft.add({x:2,y:0,z:2});assert.equal(draft.serialize().type,'line');
    assert.deepEqual(mappingGroundPoint({origin:{x:0,y:1,z:0},direction:{x:0,y:-1,z:-1}},0),{x:0,y:0,z:-1});
    assert.equal(mappingGroundPoint({origin:{x:0,y:1,z:0},direction:{x:0,y:1,z:0}},0),null);
    assert.equal(mappingGroundPoint({origin:{x:0,y:10,z:0},direction:{x:0,y:-.03,z:-1}},0),null);
});
test('quick start only advances when the requested object is placed',()=>{
    const flow=createCreatorQuickStart();flow.start();assert.equal(flow.placed('note'),false);assert.equal(flow.snapshot().index,0);
    for(const type of ['plant','note','area_checkpoint'])assert.equal(flow.placed(type),true);
    assert.equal(flow.snapshot().complete,true);flow.start();assert.equal(flow.snapshot().index,0);flow.close();assert.equal(flow.snapshot().active,false);
});
