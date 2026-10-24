import test from 'node:test';
import assert from 'node:assert/strict';
import {foodForestBoundary} from '../app/services/foodForestBoardModel.js';
import {normalizeFoodForestStudy,sculptForestTerrain,sampleForestTerrain,forestDisplayDiameter,makeForestComparison,compareForestStudies,forestConnections,importImapForest,forestMissionSteps} from '../app/services/foodForestV3Model.js';
import {handleProjectForestBoards} from '../tools/projectForestBoards.mjs';
const board=()=>normalizeFoodForestStudy({widthM:20,depthM:12,boundary:foodForestBoundary(),pieces:[{id:'tree',layer:'small-tree',variant:0,x:0,z:0,size:1,plantId:'daleys:1',canopyDiameterM:6}],wishlist:['daleys:1']});
test('V1 studies upgrade without changing placements or personal collections',()=>{
    const b=board();assert.equal(b.schemaVersion,4);assert.equal(b.pieces[0].x,0);assert.equal(b.pieces[0].plannedHeightM,6);assert.equal(b.terrain.heights.length,425);assert.deepEqual(b.wishlist,['daleys:1']);assert.equal(b.growth,2);
    assert.throws(()=>normalizeFoodForestStudy({...b,pieces:[b.pieces[0],b.pieces[0]]}),/duplicate/);assert.throws(()=>normalizeFoodForestStudy({...b,terrain:{...b.terrain,heights:[NaN]}}),/terrain/);
});
test('terrain brush is local, bounded, reversible and accepts no outside strokes',()=>{
    const b=board();for(let i=0;i<30;i++)sculptForestTerrain(b,{x:0,z:0},'raise');assert.equal(sampleForestTerrain(b,0,0),6);assert.equal(sampleForestTerrain(b,2,1),0);
    assert.equal(sculptForestTerrain(b,{x:9,z:9},'lower'),false);const before=sampleForestTerrain(b,0,0);sculptForestTerrain(b,{x:0,z:0},'smooth');assert.ok(sampleForestTerrain(b,0,0)<before);for(let i=0;i<40;i++)sculptForestTerrain(b,{x:0,z:0},'lower');assert.equal(sampleForestTerrain(b,0,0),-3);
});
test('growth, pruning and comparisons change assumptions without inventing yield',()=>{
    const b=board(),saved=makeForestComparison(b,'Older');b.growth=0;b.pruning=50;assert.ok(Math.abs(forestDisplayDiameter(b,b.pieces[0])-.84)<1e-6);assert.equal(saved.board.growth,2);assert.equal(saved.board.pruning,0);const result=compareForestStudies(saved.board,b);assert.deepEqual(result.stage,['Older forest','Newly planted']);assert.equal(Object.hasOwn(result,'yield'),false);
});
test('connections expose explicit supplier links and labelled design hypotheses',()=>{
    const b=board();b.pieces.push({...b.pieces[0],id:'other',plantId:'daleys:2',x:1});b.links.push({from:'tree',to:'other',kind:'shelter',basis:'design-hypothesis',evidence:''});
    const links=forestConnections(b,'tree',{records:[{id:'daleys:1',pollinisers:[{ids:['daleys:2']}],sourceUrl:'https://example.com/plant'}]});assert.deepEqual(links.map(l=>l.basis),['design-hypothesis','supplier-link']);assert.equal(forestConnections(b,'missing',{}).length,0);
});
test('IMAP imports retain source sketch and identify the height conversion assumption',()=>{
    const sketch={shape:'square',terrainEdits:[{kind:'hill',width:1,strength:.6,points:[{x:0,z:0}]}],elements:[{type:'tree-fruit',x:0,z:0,name:'My tree'},{type:'house',x:2,z:1}]},b=importImapForest(sketch);assert.equal(b.pieces[0].label,'My tree');assert.equal(b.mapImport.original.elements.length,2);assert.match(b.terrain.basis,/assumption/);assert.ok(sampleForestTerrain(b,0,0)>1);b.mapImport.original.elements.pop();assert.equal(sketch.elements.length,2);
});
test('mission progress tracks investigation actions, not ecological health',()=>{const b=board();b.mission='shelter';b.pieces[0].roles=['shelter'];b.scenario='wind';const steps=forestMissionSteps(b);assert.equal(steps.filter(s=>s.done).length,3);assert.equal(steps[3].done,false);});
function harness({identity={id:'teacher',projects:{garden:'editor'}},visitor=false}={}){
    const files=new Map([['/garden/project.json',{id:'garden'}]]),context={visitor,access:{identity:()=>identity},getProjectPath:id=>'/'+id,readJson:(file,fallback)=>structuredClone(files.get(file.replaceAll('\\','/'))??fallback),writeJson:(file,data)=>files.set(file.replaceAll('\\','/'),structuredClone(data)),readRequestJson:(req,done)=>done(null,req.body),sendJson:(res,status,data)=>{res.status=status;res.data=data;return true;}};
    return {context,files,request(method,body){const res={};assert.equal(handleProjectForestBoards({method,body},res,'/api/projects/garden/forest-boards/classroom',context),true);return res;}};
}
test('classroom boards persist across clients and reject stale saves',()=>{
    const h=harness(),first=h.request('PUT',{board:board(),expectedVersion:0});assert.equal(first.status,201);assert.equal(first.data.version,1);assert.deepEqual(first.data.board.wishlist,[]);
    assert.equal(h.request('PUT',{board:board(),expectedVersion:0}).status,409);const other=h.request('GET');assert.equal(other.data.version,1);other.data.board.pieces[0].x=1;assert.equal(h.request('PUT',{board:other.data.board,expectedVersion:1}).data.version,2);assert.equal(h.request('GET').data.board.pieces[0].x,1);
});
test('classroom access is private and validates geometry before writing',()=>{
    for(const config of [{identity:null},{identity:{id:'outsider',projects:{}}},{visitor:true}]){const h=harness(config);assert.ok([401,403].includes(h.request('GET').status));assert.equal(h.files.has('/garden/forest-boards.json'),false);}
    const h=harness();assert.equal(h.request('PUT',{board:{...board(),terrain:{heights:['bad']}},expectedVersion:0}).status,400);assert.equal(h.files.has('/garden/forest-boards.json'),false);assert.equal(h.request('DELETE').status,405);
});
