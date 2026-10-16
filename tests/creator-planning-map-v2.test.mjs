import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreatorPlanningMapV2Model,planningMapAreaKey,planningMapRecordKey} from '../app/services/creatorPlanningMapV2Model.js';

const workspace={
    project:{id:'garden',name:'Garden',siteMap:{areaPoints:{'east/bed':{x:40,y:30}}}},
    sites:[{id:'east',name:'East'},{id:'west',name:'West'}],
    areas:[{id:'home',siteId:'east',name:'Unassigned',systemKey:'home'},{id:'bed',siteId:'east',name:'East bed'},{id:'bed',siteId:'west',name:'West bed'}],
    entries:[
        {siteId:'east',place:{id:'bed'},marker:{id:'same',name:'East Totem',type:'area_checkpoint'}},
        {siteId:'west',place:{id:'bed'},marker:{id:'same',name:'West Orb',type:'plant'}}
    ],offline:false
};

test('flat Creator planning map keeps Site and record identities separate',()=>{
    const east=createCreatorPlanningMapV2Model(workspace,'east');
    const west=createCreatorPlanningMapV2Model(workspace,'west');
    assert.deepEqual(east.areas.map(area=>area.name),['East bed']);
    assert.deepEqual(west.records.map(record=>record.name),['West Orb']);
    assert.notEqual(east.areas[0].key,west.areas[0].key);
    assert.notEqual(east.records[0].key,west.records[0].key);
    assert.equal(east.areas[0].positionSource,'site plan');
});

test('flat planning layout overrides survive regeneration without changing records',()=>{
    const areaKey=planningMapAreaKey('garden','east','bed');
    const recordKey=planningMapRecordKey('garden','east','bed','same');
    const positions={[areaKey]:{x:700,y:360},[recordKey]:{dx:35,dy:-20}};
    const model=createCreatorPlanningMapV2Model(workspace,'east',positions);
    assert.equal(model.areas[0].x,700);
    assert.equal(model.records[0].dx,35);
    const changed={...workspace,entries:workspace.entries.slice(1)};
    assert.equal(createCreatorPlanningMapV2Model(changed,'east',positions).records.length,0);
    assert.deepEqual(workspace.project.siteMap.areaPoints['east/bed'],{x:40,y:30});
});

test('flat map receives the persisted project geography package without changing its layout edits',()=>{
    const mapData={schemaVersion:1,status:'unavailable',originKey:'-28.4,153.04',features:[],source:'',bounds:{xmin:153.03,ymin:-28.41,xmax:153.05,ymax:-28.39,spatialReference:4326}};
    const project={...workspace.project,siteMap:{...workspace.project.siteMap,geographicOrigin:{latitude:-28.4,longitude:153.04,source:'manual',accuracyMetres:null,capturedAt:'2026-10-16T00:00:00.000Z'},mapData}};
    const model=createCreatorPlanningMapV2Model({...workspace,project},'east',{[planningMapAreaKey('garden','east','bed')]:{x:640,y:300}});
    assert.equal(model.geographicMap.mapData,mapData);
    assert.deepEqual(model.project.siteMap.areaPoints,workspace.project.siteMap.areaPoints);
    assert.equal(model.areas[0].x,640);
});
