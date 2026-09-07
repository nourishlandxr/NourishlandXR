import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPimDocument, pimAddNode, pimAddTopLevelNode, pimReadingDocument, pimKnowledgeScope, pimPublishedDocument, pimNodeById } from '../app/services/pimModel.js';
import { stagePimImport, reviewPimImport } from '../app/services/pimImportReview.js';
import { resolvePlantPim } from '../app/services/pimLegacyAdapter.js';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';
import { plantInformationWebMarkup, createPlantInformationWebState, searchPlantInformationWeb, selectPlantInformationSearchResult, applyPlantInformationWebEdit } from '../app/components/plantInformationWeb.js';

test('existing deep reference search presents all matches before opening a topic',()=>{
 const state=searchPlantInformationWeb(PIGEON_PEA_PIM,{},'soil');
 assert.equal(state.detailNodeId,'');
 const markup=plantInformationWebMarkup(PIGEON_PEA_PIM,state);
 assert.equal((markup.match(/data-pim-search-result=/g)||[]).length,9);
 const selected=selectPlantInformationSearchResult(PIGEON_PEA_PIM,state,'root-nodule-symbiosis');
 assert.ok(selected.openNodeIds.includes('ecological-functions'));
 assert.ok(selected.openNodeIds.includes('nitrogen-fixation'));
 assert.equal(selected.outlineBranchId,'food-forest');
 assert.equal(selected.searchQuery,'soil');
 assert.equal(selected.searchReturn.viewMode,'list');
 assert.match(plantInformationWebMarkup(PIGEON_PEA_PIM,selected),/Back to search results/);
});
test('visitor rendering itself enforces publication including private ancestors',()=>{
 let d=createPimDocument('test');
 d=pimAddNode(d,{id:'private',parentId:'uses',title:'Private',status:'draft'});
 d=pimAddNode(d,{id:'child',parentId:'private',title:'Hidden child',body:'PRIVATE-CONTENT',status:'published'});
 const markup=plantInformationWebMarkup(d,{detailNodeId:'child'});
 assert.ok(!markup.includes('PRIVATE-CONTENT'));
 assert.ok(!markup.includes('data-pim-node-id="child"'));
});
test('species and specimen knowledge coexist without category or identity migration',()=>{
 let d=createPimDocument('test');
 d=pimAddNode(d,{id:'general',parentId:'cultivation',title:'General soil',body:'Species claim',status:'published',knowledgeScope:'species'});
 d=pimAddNode(d,{id:'local',parentId:'general',title:'Here',body:'Local claim',status:'published',informationType:'local_observation',specimenId:'tag-42'});
 const local=pimReadingDocument(d,{scope:'specimen'});
 assert.equal(pimNodeById(local,'general').body,'');
 assert.equal(pimNodeById(local,'local').body,'Local claim');
 assert.equal(pimNodeById(local,'local').path,'cultivation/general/local');
 assert.ok(!pimNodeById(pimReadingDocument(d,{scope:'species'}),'local'));
 assert.equal(pimKnowledgeScope({informationType:'fact'}),'unspecified');
});
test('published custom root branches survive visitor projection',()=>{
 let d=pimAddTopLevelNode(createPimDocument('test'),{id:'custom',title:'Our learning trail',body:'Context',status:'published'});
 d=pimAddNode(d,{id:'trail-note',parentId:'custom',title:'Trail note',body:'Published',status:'published'});
 assert.ok(pimNodeById(pimPublishedDocument(d),'trail-note'));
 assert.match(plantInformationWebMarkup(d,createPlantInformationWebState(d,{outlineBranchId:'custom'})),/Trail note/);
});
test('editing preserves IDs, multiple source records and structured photo metadata',()=>{
 let d=pimAddNode(createPimDocument('test'),{id:'known',parentId:'uses',title:'Known',provenance:[{sourceDatabase:'A',originalValue:'original'},{sourceDatabase:'B',licence:'CC0'}],media:[{url:'photo.jpg',alt:'Observed leaf',licence:'CC0'}]});
 d=applyPlantInformationWebEdit(d,'edit','known',{title:'Updated',provenance:[{sourceDatabase:'A revised'}],media:['photo.jpg']});
 const node=pimNodeById(d,'known');
 assert.equal(node.id,'known');assert.equal(node.parentId,'uses');
 assert.equal(node.provenance.length,2);assert.equal(node.provenance[0].originalValue,'original');
 assert.equal(node.provenance[1].licence,'CC0');assert.equal(node.media[0].alt,'Observed leaf');
});
test('raw fields remain source data and modifications become species drafts',()=>{
 const raw={sourceDatabase:'Fixture source',sourceRecordId:'42',fields:{family:'Fabaceae',unmapped:{raw:'retained'}}};
 const staged=stagePimImport(createPimDocument('test'),raw);
 assert.deepEqual(staged.sourceRecord,raw);assert.equal(staged.unmapped.length,1);
 assert.equal(staged.document.nodes.length,6);
 const updated=pimAddNode(staged.document,{id:'local-note',parentId:'food-forest',title:'Local',body:'Keep this',status:'draft',knowledgeScope:'specimen',specimenId:'tag-1'});
 const reviewed=reviewPimImport({...staged,document:updated},staged.items[0].id,{decision:'modify',changes:{body:'The source records Fabaceae.'}});
 assert.ok(pimNodeById(reviewed.document,'local-note'));
 const node=pimNodeById(reviewed.document,reviewed.items[0].proposedNode.id);
 assert.equal(node.status,'draft');assert.equal(node.knowledgeScope,'species');
 assert.equal(reviewed.items[0].originalValue,'Fabaceae');
 assert.throws(()=>reviewPimImport(reviewed,staged.items[0].id,'approve'),/already been reviewed/);
 assert.throws(()=>reviewPimImport(staged,staged.items[0].id,{decision:'modify',changes:{knowledgeScope:'specimen'}}),/cannot become a local observation/);
});
test('local knowledge requires a specimen reference when authored',()=>{
 assert.throws(()=>applyPlantInformationWebEdit(createPimDocument('test'),'add','',{id:'obs',parentId:'food-forest',title:'Observation',knowledgeScope:'specimen'}),/specimen or site reference/);
});
test('actual sparse orchard record adapts without changing its stored fields',()=>{
 const path=new URL('../workspace/hilyards_food_forest/sites/main_food_forest/places/1l1/markers/jackfruit/plant_profile.json',import.meta.url);
 let profile;try{profile=JSON.parse(readFileSync(path,'utf8'));}catch{return;}
 const before=JSON.stringify(profile);const d=resolvePlantPim(profile,{}, {plantId:'jackfruit'});
 assert.equal(d.identity.scientificName,'Artocarpus heterophyllus');
 assert.equal(JSON.stringify(profile),before);
 assert.equal(d.nodes.filter(n=>!n.parentId).length,6);
});
