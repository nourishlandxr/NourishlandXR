import test from 'node:test';
import assert from 'node:assert/strict';
import {LIMO_ROOTS,LIMO_CELLS,LIMO_CELL_BY_ID,limoEntryKey,limoRouteId,queryLimoContext} from '../app/services/limoProjectLearning.js';
import {loadLimoProjectContext,publishLimoRecord} from '../app/services/limoProjectContext.js';
import {createLimoSpatialExperience} from '../app/services/limoSpatialExperience.js';
import {limoSpatialControls} from '../app/services/limoSpatialPresentation.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};};
const entry=(id,areaId,layer='',status='published',extra={})=>({projectId:'p',siteId:'s',areaId,areaName:areaId,profile:{layer},marker:{id,name:id,type:'plant',status,...extra}});
const context={projectId:'p',name:'Project',sites:[{id:'s',name:'Site'}],areas:[{id:'a',siteId:'s',name:'Area A'},{id:'b',siteId:'s',name:'Area B'}],warnings:[],entries:[entry('same','a','Canopy'),entry('same','b','Shrub'),entry('unknown','a'),entry('plan','a','Canopy','draft'),entry('template','a','Canopy','published',{is_template:true}),{...entry('foreign','a','Canopy'),projectId:'another'}]};
function experience(storage=memory(),overrides={}){let last;return {model:createLimoSpatialExperience({storage,panel:{showLearning:value=>{last=value;},setExplorerOpen(){},suspend(){},setCompact(){}},...overrides}),content:()=>last};}
test('six spatial questions each have five focused, actionable branches and stable legacy routes',()=>{
 assert.equal(LIMO_ROOTS.length,6);assert.equal(LIMO_CELLS.length,41);assert.equal(new Set(LIMO_CELLS.map(item=>item.id)).size,LIMO_CELLS.length);
 for(const root of LIMO_ROOTS){const children=LIMO_CELLS.filter(cell=>cell.parentId===root.id);assert.equal(children.length,5);assert.ok(children.every(cell=>cell.question && cell.next && cell.choices.length===3));}
 const focused=LIMO_CELLS.filter(cell=>cell.parentId && !LIMO_ROOTS.some(root=>root.id===cell.parentId));assert.equal(focused.length,5);
 for(const cell of focused){assert.ok(LIMO_CELL_BY_ID[cell.parentId],cell.id+' must have a real parent');assert.ok(cell.question && cell.next && cell.choices.length===3);}
 assert.equal(limoRouteId('lim-intro-vision'),'limo-vision-purpose');
});
test('query respects Project and Area, keeps duplicate marker IDs distinct, excludes proposed/template inventory, and retains gaps',()=>{
 const result=queryLimoContext(context,{siteId:'s',areaId:'a'},'layers');
 assert.equal(result.recordedCount,2);assert.equal(result.proposedCount,1);assert.equal(result.templateCount,1);assert.equal(result.unknownCount,1);
 assert.deepEqual(result.results.map(item=>item.marker.id),['same','unknown']);
 assert.equal(queryLimoContext(context,{},'plants','Canopy').results.length,1);
 assert.notEqual(limoEntryKey(context.entries[0]),limoEntryKey(context.entries[1]));
 assert.equal(queryLimoContext(context,{},'unknown').results[0].marker.id,'unknown');
});
test('whole Project adapter covers every Site, keeps failure coverage explicit, and bounds parallel profile loading',async()=>{
 let current=0,max=0;const visited=[];
 const api={loadProject:async id=>({id,name:'Project'}),loadProjectSites:async()=>[{id:'s1'},{id:'s2'},{id:'broken'}],loadSitePlaces:async(p,s)=>{if(s==='broken')throw Error('offline');return [{id:'same',name:s}];},loadPlaceMarkers:async(p,s,a)=>{visited.push([p,s,a]);return Array.from({length:8},(_,index)=>({id:String(index),type:'plant'}));},loadPlantProfile:async()=>{current++;max=Math.max(max,current);await new Promise(resolve=>setTimeout(resolve,1));current--;return {layer:'Shrub'};}};
 const loaded=await loadLimoProjectContext('p',{api});assert.equal(loaded.areas.length,2);assert.equal(loaded.entries.length,16);assert.equal(loaded.warnings.length,1);assert.equal(visited.length,2);assert.ok(max<=6);assert.ok(loaded.entries.every(item=>item.projectId==='p'&&item.profile.layer==='Shrub'));
});
test('native field loop finds a canonical plant, saves a dated observation, and reopens its target and history',async()=>{
 const storage=memory();let inspected;
 const first=experience(storage,{onInspect:item=>{inspected=item;}});
 await first.model.open({context,siteId:'s',areaId:'a'});first.model.select('limo-life-layers');
 await first.model.handle('results');await first.model.handle('record:'+limoEntryKey(context.entries[0]));await first.model.handle('inspect');assert.equal(inspected,context.entries[0]);
 await first.model.handle('observe');await first.model.handle('answer:0');await first.model.handle('due:7');await first.model.handle('save');
 const snapshot=first.model.snapshot();assert.equal(snapshot.records.length,1);assert.equal(snapshot.records[0].targetKey,limoEntryKey(context.entries[0]));assert.equal(snapshot.records[0].state,'recorded');
 const second=experience(storage);await second.model.open({context,siteId:'s',areaId:'a'});assert.equal(second.model.snapshot().state.view,'saved');
 await second.model.handle('review');await second.model.handle('answer:1');await second.model.handle('due:30');await second.model.handle('save');
 assert.equal(second.model.snapshot().records.length,1);assert.equal(second.model.snapshot().records[0].history.length,1);assert.equal(second.model.snapshot().records[0].state,'reviewed');second.model.close();assert.equal(second.model.select('limo-life-layers'),true);assert.equal(second.content().title,'Plants & forest layers');
});
test('pause and resume retain the question but changing Project cannot expose its records or target',async()=>{
 const storage=memory(),item=experience(storage);await item.model.open({context,siteId:'s',areaId:'a'});item.model.select('limo-place-sun');await item.model.handle('pause');
 const resumed=experience(storage);await resumed.model.open({context,siteId:'s',areaId:'a'});assert.equal(resumed.model.snapshot().state.paused,true);await resumed.model.handle('resume');assert.equal(resumed.model.snapshot().state.cellId,'limo-place-sun');
 await resumed.model.open({context:{...context,projectId:'other',entries:[]},siteId:'s',areaId:'b'});assert.equal(resumed.model.snapshot().records.length,0);assert.equal(resumed.model.snapshot().state.targetKey,'');
});
test('editable scenarios stay draft and leave inventory unchanged; trials only become tried on deliberate action',async()=>{
 const item=experience();await item.model.open({context,siteId:'s',areaId:'a'});const inventory=JSON.stringify(context.entries);item.model.select('limo-vision-options');
 await item.model.handle('compare');await item.model.handle('answer:0');await item.model.handle('due:30');await item.model.handle('option-a');await item.model.handle('option-choice:1');await item.model.handle('care');await item.model.handle('care-choice:0');await item.model.handle('save');
 let saved=item.model.snapshot().records[0];assert.equal(saved.kind,'scenario');assert.equal(saved.state,'draft');assert.equal(saved.options.a,'Improve an existing patch');assert.equal(saved.care,'Weekly check possible');assert.equal(JSON.stringify(context.entries),inventory);
 item.model.select('limo-action-trial');await item.model.handle('trial');await item.model.handle('answer:0');await item.model.handle('due:7');await item.model.handle('save');assert.equal(item.model.snapshot().records[0].state,'draft');await item.model.handle('tried');assert.equal(item.model.snapshot().records[0].state,'tried');
});
test('storage errors keep the draft reviewable and do not claim a saved observation',async()=>{
 const item=experience({getItem(){return null;},setItem(){throw Error('Storage full');}});await item.model.open({context});item.model.select('limo-action-record');await item.model.handle('observe');await item.model.handle('answer:unknown');await item.model.handle('due:7');await item.model.handle('save');assert.equal(item.model.snapshot().records.length,0);assert.equal(item.model.snapshot().state.view,'draft');assert.match(item.content().body,/Storage full/);
});
test('Project publication is explicit, scoped and draft, while personal saves never call its API',async()=>{
 let calls=0,payload;const item=experience(memory(),{publishRecord:async record=>{calls++;return publishLimoRecord(record,{api:{createPlaceMarker:async(p,s,a,note)=>{payload={p,s,a,note};return {id:'note-id'};}}});}});
 await item.model.open({context,siteId:'s',areaId:'a'});item.model.select('limo-action-record');await item.model.handle('observe');await item.model.handle('answer:0');await item.model.handle('due:7');await item.model.handle('save');assert.equal(calls,0);await item.model.handle('publish');assert.equal(calls,1);assert.equal(payload.p,'p');assert.equal(payload.a,'a');assert.equal(payload.note.status,'draft');assert.equal(payload.note.appearance.limo.cellId,'limo-action-record');await item.model.handle('publish');assert.equal(calls,1);
 await assert.rejects(publishLimoRecord({projectId:'p'}),/specific Area/);
});
test('native controls paginate and carry role and shape cues within distinct hit rectangles',async()=>{
 const item=experience();await item.model.open({context});const controls=limoSpatialControls(item.content().limo);assert.equal(controls.length,1+item.content().limo.actions.length);assert.ok(controls.every(button=>button.action.startsWith('Limo:')));
 for(const [i,a] of controls.entries())for(const b of controls.slice(i+1))assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y);
});
