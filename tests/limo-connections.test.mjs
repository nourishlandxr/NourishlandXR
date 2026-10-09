import test from 'node:test';
import assert from 'node:assert/strict';
import {LIMO_CELLS,LIMO_CELL_BY_ID,limoEntryKey} from '../app/services/limoProjectLearning.js';
import {LIMO_CONNECTION_RULES,connectionRuleFor} from '../app/services/limoConnectionRules.js';
import {createLimoConnections} from '../app/services/limoConnections.js';
import {createLimoSpatialExperience} from '../app/services/limoSpatialExperience.js';
import {welcomeExperienceFrames,welcomeCellAtPoint,drawArWelcomeShowcase} from '../app/services/arWelcomeShowcase.js';
import {limoOrbitString,limoConnectionIsAnimating} from '../app/services/limoConnectionLayout.js';
import {limoSpatialControls} from '../app/services/limoSpatialPresentation.js';
import {demoWelcomeSurfaceHit} from '../app/services/demoWelcomeHit.js';
import {demoBillboardTextureLocalPoint} from '../app/features/ar-demo/demoGeometry.js';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};};
const scope={projectId:'p',siteId:'s',areaId:'a'};
test('connection textures keep refreshing through the reveal and stop for reduced motion',()=>{
 const now=Date.parse('2026-10-10T12:00:00Z'),snapshot={cells:[{createdAt:new Date(now).toISOString()}]};
 for(const age of [0,450,1100,2199])assert.equal(limoConnectionIsAnimating(snapshot,now+age),true);
 for(const age of [-1,2200,5000])assert.equal(limoConnectionIsAnimating(snapshot,now+age),false);
 assert.equal(limoConnectionIsAnimating(snapshot,now,true),false);assert.equal(limoConnectionIsAnimating(null,now),false);
});
const context={projectId:'p',name:'Garden',sites:[{id:'s',name:'Site'}],areas:[{id:'a',siteId:'s',name:'Area A'},{id:'b',siteId:'s',name:'Area B'}],warnings:[],entries:[{...scope,areaName:'Area A',marker:{id:'one',name:'Tree one',type:'plant'}},{...scope,areaName:'Area A',marker:{id:'two',name:'Tree two',type:'plant'}}]};
function graph(saved=storage()){const value=createLimoConnections({storage:saved});value.setScope(scope);return value;}
async function allCombinations(value){for(const rule of LIMO_CONNECTION_RULES){const inputs=value.recipeSources(rule);assert.equal(inputs.length,2,rule.id);await value.connect(inputs[0].id,inputs[1].id);}return value.snapshot();}
test('five focused cells preserve the six original roots and thirty topic identities',()=>{
 assert.equal(LIMO_CELLS.length,41);
 for(const id of ['limo-place-soil-conditions','limo-life-flowering','limo-life-ripening','limo-vision-care-capacity','limo-relationships-habitat']){const cell=LIMO_CELL_BY_ID[id];assert.ok(LIMO_CELL_BY_ID[cell.parentId].parentId);assert.equal(cell.choices.length,3);}
});
test('ten authored combinations have useful learning content and six initial recipes',()=>{
 assert.equal(LIMO_CONNECTION_RULES.length,10);assert.equal(LIMO_CONNECTION_RULES.filter(rule=>rule.sources.every(id=>!id.startsWith('@'))).length,6);
 for(const rule of LIMO_CONNECTION_RULES)for(const field of ['question','explanation','example','lookFor','next'])assert.ok(rule[field].length>30,rule.id+' '+field);
 assert.equal(connectionRuleFor([LIMO_CELL_BY_ID['limo-life-layers'],LIMO_CELL_BY_ID['limo-place-sun']]).id,'shade');
});
test('all ten discoveries resolve, preserve two parents and can be recombined',async()=>{
 const snapshot=await allCombinations(graph());assert.equal(snapshot.cells.length,10);
 for(const cell of snapshot.cells){assert.equal(cell.sourceIds.length,2);assert.ok(cell.example && cell.explanation);assert.ok(cell.depth<=2);}
 assert.equal(snapshot.cells.find(cell=>cell.ruleId==='adjust-plan').depth,2);
});
test('same combination in reversed order reopens the same saved discovery',async()=>{
 const value=graph(),one=await value.connect('limo-place-sun','limo-life-layers'),two=await value.connect('limo-life-layers','limo-place-sun');assert.equal(one.id,two.id);assert.equal(value.cells().length,1);
});
test('reload restores discoveries, dependencies, targets and stable layout slots',async()=>{
 const saved=storage(),value=graph(saved),one=await value.connect('limo-place-sun','limo-life-layers');value.attach(one.id,limoEntryKey(context.entries[0]));value.attach(one.id,limoEntryKey(context.entries[1]));
 const two=await value.connect(one.id,'limo-vision-phases'),reloaded=graph(saved);assert.equal(reloaded.cells().length,2);assert.deepEqual(reloaded.cell(two.id).targetKeys,[limoEntryKey(context.entries[0]),limoEntryKey(context.entries[1])]);assert.equal(reloaded.cell(two.id).slot,two.slot);
 assert.equal((await reloaded.connect('limo-vision-phases',one.id)).id,two.id);
});
test('Project, Site and Area scopes cannot leak another discovery or its targets',async()=>{
 const value=graph(),one=await value.connect('limo-place-sun','limo-life-layers');
 for(const altered of [{...scope,areaId:'b'},{...scope,siteId:'other'},{...scope,projectId:'other'}]){value.setScope(altered);assert.equal(value.cells().length,0);assert.equal(value.cell(one.id),null);const other=await value.connect('limo-place-sun','limo-life-layers');assert.notEqual(other.id,one.id);}
 value.setScope(scope);assert.equal(value.cells()[0].id,one.id);
});
test('cancel and scope change prevent an in-flight connection from saving',async()=>{
 const value=graph();value.begin('limo-place-sun');let pending=value.connect('limo-place-sun','limo-life-layers');value.cancel();await assert.rejects(pending,/cancelled/);assert.equal(value.cells().length,0);
 pending=value.connect('limo-place-sun','limo-life-layers');value.setScope({...scope,areaId:'b'});await assert.rejects(pending,/cancelled/);assert.equal(value.cells().length,0);
});
test('unsupported combinations and failed storage do not claim a saved discovery',async()=>{
 const value=graph();await assert.rejects(value.connect('limo-place-sun','limo-place-water'),/not authored/);assert.equal(value.cells().length,0);
 const broken=graph({getItem(){return null;},setItem(){throw Error('Storage full');}});await assert.rejects(broken.connect('limo-place-sun','limo-life-layers'),/Storage full/);assert.equal(broken.cells().length,0);
});
test('removing a parent archives its dependent discoveries; recreating reuses identity',async()=>{
 const value=graph(),first=await value.connect('limo-place-sun','limo-life-layers'),second=await value.connect(first.id,'limo-vision-phases');
 assert.equal(value.remove(first.id).length,2);assert.equal(value.cells().length,0);assert.equal(value.cell(second.id).archived,true);
 assert.equal((await value.connect('limo-place-sun','limo-life-layers')).id,first.id);assert.equal(value.cells().length,1);
});
test('all discoveries fit the shared surface without overlapping static or generated cells',async()=>{
 const snapshot=await allCombinations(graph()),frames=welcomeExperienceFrames(64000,false,undefined,new Set(),{connectionGraph:snapshot}),nodes=frames.flatMap(frame=>frame.nodes),derived=nodes.filter(node=>node.derived);
 assert.equal(derived.length,10);
 for(const node of derived){assert.ok(node.x>62 && node.x<2438 && node.y>62 && node.y<2038);for(const other of nodes.filter(other=>other!==node))assert.ok(Math.hypot(node.x-other.x,node.y-other.y)>node.radius+other.radius+8,node.id+' overlaps '+other.id);}
});
test('pending cross-branch endpoints stay visible and share native XR hit geometry',async()=>{
 const model=createLimoSpatialExperience({storage:storage()});await model.open({context,...scope});model.select('limo-place-sun');await model.handle('connect');
 const frames=welcomeExperienceFrames(64000,true,undefined,new Set(),{expandedLimIds:['limo-place'],connectionGraph:model.graph()}),target=frames.flatMap(frame=>frame.nodes).find(node=>node.limId==='limo-life-layers');assert.equal(target.opacity,1);
 assert.equal(welcomeCellAtPoint(frames,target.x,target.y).limId,target.limId);
 await model.handle('connect-target:'+target.limId);const discovery=model.graph().cells[0],rendered=welcomeExperienceFrames(64000,true,undefined,new Set(),{connectionGraph:model.graph()}),node=rendered.flatMap(frame=>frame.nodes).find(node=>node.limId===discovery.id),local=demoBillboardTextureLocalPoint(node.x,node.y,2500,2100);
 const hit=demoWelcomeSurfaceHit({origin:{x:local.x*10,y:local.y*21,z:1},direction:{x:0,y:0,z:-1}},{center:{x:0,y:0,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1},width:4,height:3.36});assert.equal(welcomeCellAtPoint(rendered,hit.pixelX,hit.pixelY).limId,discovery.id);
});
test('catalogue, preview, repeated combination, notebook and multi-target controls work end to end',async()=>{
 const saved=storage(),model=createLimoSpatialExperience({storage:saved});await model.open({context,...scope});await model.handle('connections');assert.equal(model.content().limo.actions.find(item=>item.id==='recipe:shade').disabled,false);
 await model.handle('recipe:shade');assert.ok(model.graph().pinnedIds.includes('limo-life-layers'));assert.equal(model.content().title,'Who shades whom?');await model.handle('connect-target:limo-life-layers');
 assert.match(model.content().body,/WHY THESE CONNECT/);assert.match(model.content().image,/^data:image\/svg/);assert.ok(limoSpatialControls(model.content().limo).some(item=>item.action==='Limo:connect'));
 const id=model.snapshot().state.cellId;await model.handle('target-links');for(const item of context.entries)await model.handle('attach-target:'+limoEntryKey(item));await model.handle('back');assert.equal(model.cell(id).targetKeys.length,2);
 await model.handle('observe');await model.handle('answer:0');await model.handle('due:7');await model.handle('save');assert.equal(model.snapshot().records[0].cellId,id);assert.equal(model.snapshot().records[0].targetKeys.length,2);
 await model.handle('connections');await model.handle('next');assert.equal(model.content().limo.actions.find(item=>item.id==='recipe:changing-shade').disabled,false);
 await model.handle('recipe:changing-shade');await model.handle('connect-target:limo-vision-phases');assert.equal(model.graph().cells.length,2);
});
test('orbit strings stay outside the reading frame and use actual cell rim endpoints',()=>{
 const a={x:1900,y:1060,radius:70},b={x:700,y:1500,radius:62},points=limoOrbitString(a,b,[a,b]);
 assert.ok(points.every(point=>Math.hypot(point.x-1250,point.y-1060)>=540));assert.ok(Math.abs(Math.hypot(points[0].x-a.x,points[0].y-a.y)-a.radius*.96)<.001);assert.ok(Math.abs(Math.hypot(points.at(-1).x-b.x,points.at(-1).y-b.y)-b.radius*.96)<.001);
});
