import test from 'node:test';
import assert from 'node:assert/strict';
import {createImapV2DiscModel,createCreatorImapV2DiscModel,IMAP_V2_DISC_RADIUS,toImapV2LandscapeInput,updateCreatorImapPlacement} from '../app/services/imapV2DiscModel.js';
import {createCreatorPlanningMapV2Model,planningMapAreaKey,planningMapRecordKey} from '../app/services/creatorPlanningMapV2Model.js';

const projectId='garden';
const site=(id)=>({id,name:id,description:'',projectId});
const area=(siteId,id)=>({id,name:`${siteId} ${id}`,description:'',projectId,siteId});
const record=(siteId,areaId,recordId,kind,title)=>({id:JSON.stringify([projectId,siteId,areaId,recordId]),recordId,markerId:recordId,title,kind,knowledgeId:'',description:'',scientificName:'',profile:{},projectId,siteId,areaId});
const snapshot={schemaVersion:1,contract:'nourishland.shared-project',revision:'sha256:'+'0'.repeat(64),project:{id:projectId,name:'Garden',description:''},
    sites:[site('east'),site('west')],
    areas:[...Array.from({length:6},(_,i)=>area('east','a'+i)),area('west','a0')],
    records:[record('east','a0','totem','area_checkpoint','Entrance Totem'),record('east','a0','plant','plant','Finger Lime'),record('west','a0','plant','plant','Finger Lime')]};

test('IMAP V2 uses the circular disc grammar and pages Areas without losing project counts',()=>{
    const first=createImapV2DiscModel(snapshot,{siteId:'east'});
    const second=createImapV2DiscModel(snapshot,{siteId:'east',page:1});
    assert.equal(first.kind,'imap-v2-disc');
    assert.equal(first.disc.shape,'circular');
    assert.equal(first.disc.radius,IMAP_V2_DISC_RADIUS);
    assert.equal(first.pageCount,2);
    assert.equal(first.areas.length,5);
    assert.equal(second.areas.length,1);
    assert.equal(first.summary.areas,6);
    assert.equal(first.summary.totems,1);
    assert.deepEqual(first.links,[]);
    assert.ok(first.areas.every(area=>Math.hypot(area.center.x,area.center.z)+area.radius<IMAP_V2_DISC_RADIUS));
});

test('records retain canonical identities and Totems are never fabricated',()=>{
    const east=createImapV2DiscModel(snapshot,{siteId:'east'});
    const west=createImapV2DiscModel(snapshot,{siteId:'west'});
    assert.equal(east.areas[0].totem.name,'Entrance Totem');
    assert.equal(west.areas[0].totem,null);
    assert.equal(west.areas[0].nodes[0].name,'Finger Lime');
    assert.notEqual(east.areas[0].key,west.areas[0].key);
    assert.notEqual(east.areas[0].nodes[0].key,west.areas[0].nodes[0].key);
});

test('layout overrides stay conceptual and removed records disappear on regeneration',()=>{
    const key=JSON.stringify(['area','garden','east','a0']);
    const recordKey=JSON.stringify(['garden','east','a0','plant']);
    const overrides={terrainStyle:'water-sketch',positions:{[key]:{x:20,z:0},[recordKey]:{dx:3,dz:0}}};
    const model=createImapV2DiscModel(snapshot,{siteId:'east',overrides});
    assert.equal(model.areas[0].center.x,4.5);
    assert.equal(model.areas[0].nodes[0].x,5.4);
    assert.equal(model.disc.terrain.verified,false);
    assert.equal(model.disc.terrain.style,'water-sketch');
    const changed={...snapshot,records:snapshot.records.filter(item=>item.id!==recordKey)};
    assert.equal(createImapV2DiscModel(changed,{siteId:'east',overrides}).areas[0].nodes.length,0);
});

test('dense Area records remain counted while miniature markers stay bounded',()=>{
    const extra=Array.from({length:8},(_,i)=>record('east','a0','orb-'+i,'plant','Orb '+i));
    const dense={...snapshot,records:[...snapshot.records,...extra]};
    const model=createImapV2DiscModel(dense,{siteId:'east'});
    const entrance=model.areas[0];
    assert.equal(entrance.counts.orbs,9);
    assert.equal(entrance.nodes.length,4);
    assert.equal(entrance.hiddenCount,5);
    assert.equal(model.summary.orbs,9);
});

test('IMAP consumes the shared project map package as sourced terrain without replacing map edits',()=>{
    const mapData={schemaVersion:1,status:'sourced',originKey:'-28.4,153.04',source:'NSW contours',quality:'contour-interpolated',limited:false,
        bounds:{xmin:153.03,ymin:-28.41,xmax:153.05,ymax:-28.39,spatialReference:4326},
        features:[{attributes:{elevation:250},geometry:{paths:[[[153.031,-28.4],[153.04,-28.4],[153.049,-28.4]]]}}]};
    const geographicMap={projectId:'garden',geographicOrigin:{latitude:-28.4,longitude:153.04,source:'manual'},mapData};
    const model=createImapV2DiscModel(snapshot,{siteId:'east',overrides:{terrainEdits:[{id:'retained',kind:'hill',points:[{x:0,z:0}],width:1,strength:.5}]},geographicMap});
    assert.equal(model.geographicMap,geographicMap);
    assert.equal(model.disc.terrain.mode,'contour-interpolated');
    assert.equal(model.disc.terrain.source,'NSW contours');
    assert.ok(model.elevationGrid.heights.length>0);
    assert.ok(model.terrainFeatures.length>0);
    const repeated=createImapV2DiscModel(snapshot,{siteId:'east',geographicMap});
    assert.equal(repeated.elevationGrid,model.elevationGrid,'the same saved map package reuses its generated terrain grid');
    assert.equal(model.disc.terrain.edits.length,1);
    assert.equal(model.disc.terrain.edits[0].kind,'hill');
    const renderInput=toImapV2LandscapeInput(model);
    assert.equal(renderInput.elevationGrid,model.elevationGrid);
    assert.ok(renderInput.elements.some(element=>element.type==='totem'&&element.name==='Entrance Totem'));
    assert.ok(renderInput.elements.some(element=>element.type==='orb'&&element.name==='Finger Lime'));
    assert.ok(renderInput.elements.some(element=>element.type==='area-boundary'));
    assert.equal(renderInput.elements.at(-1),model.terrainFeatures.at(-1));
});

test('Creator IMAP projects draft workspace records and the saved project geography without publishing them',()=>{
    const project={id:'garden',name:'Garden',description:'',modified:'m1',siteMap:{geographicOrigin:{latitude:-28.4,longitude:153.04,source:'manual'},mapData:{status:'unavailable',originKey:'-28.4,153.04',features:[],message:'Outside provider coverage.'}}};
    const workspace={project,sites:[{id:'east',name:'East'}],areas:[{id:'home',siteId:'east',name:'Home',systemKey:'home'},{id:'bed',siteId:'east',name:'Food garden'}],
        entries:[{siteId:'east',place:{id:'bed'},marker:{id:'totem',name:'Food garden',type:'area_checkpoint'}},{siteId:'east',place:{id:'bed'},marker:{id:'orb',name:'Finger Lime',type:'plant'}}]};
    const model=createCreatorImapV2DiscModel(workspace,{siteId:'east'});
    assert.equal(model.geographicMap.mapData,project.siteMap.mapData);
    assert.equal(model.areas.length,1);
    const renderInput=toImapV2LandscapeInput(model);
    assert.ok(renderInput.elements.some(element=>element.type==='totem'&&element.name==='Food garden'));
    assert.ok(renderInput.elements.some(element=>element.type==='orb'&&element.name==='Finger Lime'));
    assert.match(model.revision,/^local:m1$/);
});

test('flat and disc Creator layouts keep the selected Site and stable record identities aligned',()=>{
    const project={id:'garden',name:'Garden',description:'',modified:'m2'};
    const workspace={project,sites:[{id:'east',name:'East'},{id:'west',name:'West'}],
        areas:[{id:'bed',siteId:'east',name:'East Bed'},{id:'shade',siteId:'west',name:'West Shade'}],
        entries:[
            {siteId:'east',place:{id:'bed'},marker:{id:'totem-east',name:'East Totem',type:'area_checkpoint'}},
            {siteId:'east',place:{id:'bed'},marker:{id:'plant-east',name:'East Orb',type:'plant'}},
            {siteId:'west',place:{id:'shade'},marker:{id:'totem-west',name:'West Totem',type:'area_checkpoint'}}
        ]};
    const flat=createCreatorPlanningMapV2Model(workspace,'east');
    const disc=createCreatorImapV2DiscModel(workspace,{siteId:'east'});
    const flatRecords=new Set(flat.records.map(record=>JSON.stringify([record.siteId,record.areaId,record.id])));
    const discRecords=new Set(disc.areas.flatMap(area=>[...(area.totem?[area.totem]:[]),...area.nodes].map(record=>JSON.stringify([record.siteId||'east',record.areaId||area.id,record.recordId]))));
    assert.deepEqual([...flat.areas].map(area=>area.id),disc.areas.map(area=>area.id));
    assert.deepEqual(disc.areas.map(area=>area.siteId),['east']);
    assert.deepEqual([...flatRecords].sort(),[...discRecords].sort());
});

test('Creator IMAP projects saved flat-map layout positions both ways',()=>{
    const areaKey=planningMapAreaKey('garden','east','bed');
    const recordKey=planningMapRecordKey('garden','east','bed','totem-east');
    const project={id:'garden',name:'Garden',description:'',modified:'m3',creatorPlanningMapV2:{schemaVersion:2,positions:{
        [areaKey]:{x:735,y:280},[recordKey]:{dx:30,dy:-10}
    },terrain:'clean',waterSketch:false}};
    const workspace={project,sites:[{id:'east',name:'East'}],areas:[{id:'bed',siteId:'east',name:'Bed'}],entries:[
        {key:'east/bed/totem-east',siteId:'east',place:{id:'bed'},marker:{id:'totem-east',name:'Bed Totem',type:'area_checkpoint'}}
    ]};
    const flat=createCreatorPlanningMapV2Model(workspace,'east',project.creatorPlanningMapV2.positions);
    const disc=createCreatorImapV2DiscModel(workspace,{siteId:'east'});
    assert.equal(disc.areas[0].center.x,Number(((flat.areas[0].x-disc.placementTransform.centerX)*disc.placementTransform.scale).toFixed(3)));
    assert.equal(disc.areas[0].totem.x,Number((disc.areas[0].center.x+30/86.667).toFixed(3)));
    const next=updateCreatorImapPlacement(workspace,disc,disc.areas[0].totem.key,{x:disc.areas[0].center.x+.4,z:disc.areas[0].center.z-.2});
    assert.ok(Math.abs(next[recordKey].dx-34.6668)<1e-6);
    assert.ok(Math.abs(next[recordKey].dy-17.3334)<1e-6);
    assert.deepEqual(next[areaKey],project.creatorPlanningMapV2.positions[areaKey]);
});

test('Creator IMAP shows genuine GPS anchors and leaves out-of-bounds anchors unclamped',()=>{
    const project={id:'garden',name:'Garden',description:'',modified:'m4',siteMap:{
        geographicOrigin:{latitude:-28.4,longitude:153.04,source:'manual'},
        mapData:{status:'sourced',originKey:'-28.4,153.04',source:'NSW',quality:'contour-interpolated',
            bounds:{xmin:153.03,ymin:-28.41,xmax:153.05,ymax:-28.39,spatialReference:4326},features:[]}
    }};
    const entry={key:'east/bed/totem',siteId:'east',place:{id:'bed'},marker:{id:'totem',name:'GPS Totem',type:'area_checkpoint'}};
    const workspace={project,sites:[{id:'east',name:'East'}],areas:[{id:'bed',siteId:'east',name:'Bed'}],entries:[entry],anchors:{
        [entry.key]:{type:'gps',latitude:-28.4,longitude:153.041}
    }};
    const placed=createCreatorImapV2DiscModel(workspace,{siteId:'east'}).areas[0].totem;
    assert.equal(placed.source,'GPS anchor');
    assert.deepEqual(placed.geographicAnchor,{type:'gps',latitude:-28.4,longitude:153.041});
    workspace.anchors[entry.key]={type:'gps',latitude:-28.4,longitude:153.08};
    const outside=createCreatorImapV2DiscModel(workspace,{siteId:'east'}).areas[0].totem;
    assert.equal(outside.source,'generated');
    assert.deepEqual(outside.geographicAnchor,{type:'gps',latitude:-28.4,longitude:153.08});
});

test('Creator IMAP draws only saved Area links as schematic Totem paths',()=>{
    const project={id:'garden',name:'Garden',description:'',modified:'m5'};
    const workspace={project,sites:[{id:'east',name:'East'}],areas:[
        {id:'north',siteId:'east',name:'North Bed',totem_links:[{target_area_id:'south',target_totem_id:'totem-south',distance_m:18}]},
        {id:'south',siteId:'east',name:'South Bed',totem_links:[{target_area_id:'north',target_totem_id:'totem-north',distance_m:18}]}
    ],entries:[
        {key:'east/north/totem-north',siteId:'east',place:{id:'north'},marker:{id:'totem-north',name:'North Totem',type:'area_checkpoint'}},
        {key:'east/south/totem-south',siteId:'east',place:{id:'south'},marker:{id:'totem-south',name:'South Totem',type:'area_checkpoint'}}
    ]};
    const model=createCreatorImapV2DiscModel(workspace,{siteId:'east'});
    assert.equal(model.links.length,1,'reciprocal saved links display once');
    assert.equal(model.links[0].mode,'schematic-guidance');
    assert.equal(model.links[0].fromName,'North Bed');
    const path=toImapV2LandscapeInput(model).elements.find(element=>element.id===model.links[0].id);
    assert.equal(path.type,'path');
    assert.deepEqual(path.points,[model.links[0].from,model.links[0].to]);
});

