import test from 'node:test';import assert from 'node:assert/strict';
import {createPimoTemplate} from '../app/services/pimoGraphTemplates.js';
import {addPimoCell,validatePimoGraph,pimoVisibleCells} from '../app/services/pimoGraph.js';
import {pimoGraphDocument,pimoGraphForPlant} from '../app/services/pimoGraphDocument.js';
import {PIM_COMPASS} from '../app/services/pimCompass.js';
import {PIGEON_PEA_PIM} from '../app/services/pigeonPeaPim.js';
import {validatePimDocument} from '../app/services/pimModel.js';
import {simulatedTotemMarkup} from '../app/features/ar-demo/demoPreviewMarkup.js';
import {setSpatialVisualSettings} from '../app/services/spatialVisualSettings.js';
test('the default editor honeycomb uses the original reader IDs and compass families',()=>{
 const graph=createPimoTemplate(),document=pimoGraphDocument(graph);
 assert.equal(graph.layout.design,'classic');assert.deepEqual(document.nodes.map(n=>n.id),PIM_COMPASS.map(f=>f.id));
 for(const family of PIM_COMPASS){const node=document.nodes.find(n=>n.id===family.id);assert.equal(node.parentId,null);assert.equal(node.direction,family.direction);}
 assert(validatePimDocument(document).valid);const invalid=structuredClone(graph);invalid.edges=invalid.edges.filter(e=>e.to!=='uses');assert(!validatePimoGraph(invalid).valid);
});
test('original plant content round-trips through the canvas without losing parent links, sources or provenance',()=>{
 const graph=pimoGraphForPlant(PIGEON_PEA_PIM),document=pimoGraphDocument(graph);
 assert.deepEqual(new Set(document.nodes.map(n=>n.id)),new Set(PIGEON_PEA_PIM.nodes.map(n=>n.id)));
 for(const original of PIGEON_PEA_PIM.nodes){const n=document.nodes.find(n=>n.id===original.id);assert.equal(n.parentId,original.parentId);assert.equal(n.body,original.body);assert.deepEqual(n.provenance,original.provenance);assert.deepEqual(n.sourceIds,original.sourceIds);}
 assert.deepEqual(document.sources,PIGEON_PEA_PIM.sources);assert(validatePimDocument(document).valid);
 const family=graph.layout.nodes.uses;family.x+=16;const restored=pimoGraphForPlant(pimoGraphDocument(graph));assert.equal(restored.layout.nodes.uses.x,family.x);
 graph.nodes.find(n=>n.id===graph.metadata.identityNodeId).body='Updated plant introduction.';assert.equal(pimoGraphDocument(graph).identity.identityStatement,'Updated plant introduction.');
 graph.nodes.find(n=>n.id===graph.metadata.identityNodeId).body='';assert.equal(pimoGraphDocument(graph).identity.identityStatement,'');
});
test('edited draft text and attributed references reach the real reader projection without mutating the editor',()=>{
 let graph=createPimoTemplate();graph=addPimoCell(graph,{title:'Harvest observation',parentId:'uses',body:'The first pods were ready today.',sourceUrl:'https://example.org/garden',attribution:'Garden journal'}).graph;
 const before=structuredClone(graph),document=pimoGraphDocument(graph),node=document.nodes.find(n=>n.title==='Harvest observation');
 assert.equal(node.parentId,'uses');assert.equal(node.body,'The first pods were ready today.');assert.equal(node.status,'draft');assert(document.sources.some(s=>s.url==='https://example.org/garden'&&node.sourceIds.includes(s.id)));assert.deepEqual(graph,before);
});
test('a full plant opens as six families, revealing the selected branch without losing hidden content',()=>{
 const graph=pimoGraphForPlant(PIGEON_PEA_PIM),before=structuredClone(graph),closed=pimoVisibleCells(graph,graph.metadata.identityNodeId);
 assert.equal(closed.size,7);const open=pimoVisibleCells(graph,'uses');assert(open.size>7);assert(open.size<graph.nodes.length);
 const child=graph.edges.find(e=>e.from==='uses').to;assert(open.has(child));assert(pimoVisibleCells(graph,'',graph.nodes.find(n=>n.id===child).title).has(child));assert.deepEqual(graph,before);
});
test('screen and XR Totems resolve the same selected design rather than hard-coding the old post',()=>{
 setSpatialVisualSettings({totemModel:'botanical'});
 for(const style of ['basic','carved','botanical','organic','sun','leaf','rock','moon']){
  const html=simulatedTotemMarkup({appearance:{totemStyle:style,totemStyleExplicit:true},demoArriveAt:0},0,{x:50,y:50});assert(html.includes('is-totem-'+style));assert(html.includes('is-totem-style-'+style));
 }
 assert(simulatedTotemMarkup({demoArriveAt:0},0,{x:50,y:50}).includes('is-totem-botanical'));
});
