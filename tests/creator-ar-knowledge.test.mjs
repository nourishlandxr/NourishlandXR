import test from 'node:test';
import assert from 'node:assert/strict';
import {createPimDocument,pimAddNode,pimAddTopLevelNode,pimToArKnowledge} from '../app/services/pimModel.js';
import {createCreatorPimSave,creatorKnowledgeState} from '../app/services/creatorArKnowledge.js';
import {PIGEON_PEA_PIM} from '../app/services/pigeonPeaPim.js';
import {pimVisibleNodes,pimReaderControl,PIM_SPATIAL_LAYOUT_OPTIONS} from '../app/services/plantInformationMesh.js';
import {pimHoneycombTargetAtPercent,pimHoneycombTextureSize,fitPimTextBlock} from '../app/services/plantInformationMeshCanvas.js';

const fixture=()=>pimAddNode(createPimDocument({plantId:'specimen-a',identity:{commonName:'Example'}}),{id:'observed',parentId:'food-forest',title:'New growth',body:'Seen here',knowledgeScope:'specimen',specimenId:'project/site/area/specimen-a',observedAt:'2026-09-09',sourceIds:['evidence'],media:[{url:'photo.jpg'}],status:'draft',evidenceStatus:'needs_review'});
test('AR projection retains specimen, evidence, publication and custom root identity without mutating knowledge',()=>{
 const doc=pimAddTopLevelNode(fixture(),{id:'custom-notebook',title:'Notebook',primaryCategory:'custom',status:'draft'}),before=JSON.stringify(doc);
 const projected=pimToArKnowledge(doc),node=projected.categories.find(n=>n.id==='food-forest').children[0];
 assert.equal(node.specimenId,'project/site/area/specimen-a');assert.equal(node.knowledgeScope,'specimen');assert.equal(node.observedAt,'2026-09-09');assert.deepEqual(node.sourceIds,['evidence']);assert.equal(node.media.length,1);assert.equal(node.status,'draft');assert.equal(node.evidenceStatus,'needs_review');
 assert.equal(projected.categories.length,6);assert.equal(projected.customCategories[0].id,'custom-notebook');assert.equal(JSON.stringify(doc),before);
 assert.equal(pimToArKnowledge(doc,{includeDraft:false}).categories.flatMap(n=>n.children).some(n=>n.id==='observed'),false);
});
test('creator AR saves retain fresh profile fields and reject a detected competing knowledge edit',async()=>{
 let fresh={pim_document:fixture(),notes:'original'},writes=0;const profile=structuredClone(fresh);
 const save=createCreatorPimSave({context:['p','s','a','m'],profile,load:async()=>fresh,save:async(...args)=>{fresh=args.at(-1);writes++;}});
 fresh.notes='updated elsewhere';const changed=pimAddNode(profile.pim_document,{id:'new',parentId:'uses',title:'New draft'});await save(changed);
 assert.equal(fresh.notes,'updated elsewhere');assert.equal(fresh.pim_document.nodes.find(n=>n.id==='observed').specimenId,'project/site/area/specimen-a');assert.equal(writes,1);
 fresh.pim_document=pimAddNode(fresh.pim_document,{id:'other',parentId:'uses',title:'Competing edit'});
 await assert.rejects(()=>save(changed),/changed elsewhere/);assert.equal(writes,1);
});
test('reader opens the selected deep topic and observations inherit its category without changing geometry',()=>{
 const doc=PIGEON_PEA_PIM,node=doc.nodes.find(n=>n.id==='chop-and-drop-cycle');const before=JSON.stringify(doc);
 const state=creatorKnowledgeState(doc,{path:node.path});assert.equal(state.detailNodeId,node.id);assert.equal(state.outlineBranchId,'cultivation');assert.ok(state.openNodeIds.includes('pruning'));
 const add=creatorKnowledgeState(doc,{path:node.path,observation:true});assert.equal(add.editorSeed.knowledgeScope,'specimen');assert.equal(add.editorSeed.status,'draft');assert.equal(add.editorParentId,'cultivation');assert.equal(JSON.stringify(doc),before);
});
function polygons(nodes) {
 const first=nodes[0],all=[{position:first.layoutCenterPosition,layoutCellWidthPercent:first.layoutCellWidthPercent,layoutCellHeightPercent:first.layoutCellHeightPercent},...nodes];
 return all.map(n=>[[.5,0],[.25,.5],[-.25,.5],[-.5,0],[-.25,-.5],[.25,-.5]].map(([x,y])=>[n.position.x+x*n.layoutCellWidthPercent,n.position.y+y*n.layoutCellHeightPercent]));
}
function overlaps(a,b) {
 for(const polygon of [a,b]) for(let i=0;i<polygon.length;i++) {
 const p=polygon[i],q=polygon[(i+1)%polygon.length],axis=[-(q[1]-p[1]),q[0]-p[0]];
 const left=a.map(p=>p[0]*axis[0]+p[1]*axis[1]),right=b.map(p=>p[0]*axis[0]+p[1]*axis[1]);
 if(Math.max(...left)<=Math.min(...right)+1e-7 || Math.max(...right)<=Math.min(...left)+1e-7)return false;
 } return true;
}
test('deep and adjacent expanded branches have no overlapping hexagon interiors at phone and spatial sizes',()=>{
 const knowledge=pimToArKnowledge(PIGEON_PEA_PIM),expanded=PIGEON_PEA_PIM.nodes.map(n=>n.path);
 for(const [width,height] of [[320,568],[390,844],[1440,1080]]) for(const includeAllChildren of [false,true]){
 const nodes=pimVisibleNodes(knowledge,expanded,{layoutWidth:width,layoutHeight:height,includeAllChildren});const cells=polygons(nodes);
 for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++)assert.equal(overlaps(cells[i],cells[j]),false,`${width}: cells ${i}/${j} overlap`);
 const partial=pimVisibleNodes(knowledge,['cultivation'],{layoutWidth:width,layoutHeight:height,includeAllChildren});
 for(const node of partial)assert.deepEqual(nodes.find(n=>n.path===node.path).position,node.position,'opening another branch must not move an existing cell');
 }
});
test('spatial PIM no longer renders an all-topics bar below the mesh',()=>{
 const knowledge=pimToArKnowledge(PIGEON_PEA_PIM),expanded=['cultivation','scientific-information'];
 const size=pimHoneycombTextureSize(knowledge,expanded,PIM_SPATIAL_LAYOUT_OPTIONS);
 const options={...size,...PIM_SPATIAL_LAYOUT_OPTIONS,cellWidthPixels:200};
 const nodes=pimVisibleNodes(knowledge,expanded,options);
 assert.equal(options.readerControl,false);
 assert.equal(pimHoneycombTargetAtPercent(knowledge,expanded,50,98,options),null);
 assert.equal(pimHoneycombTargetAtPercent(knowledge,expanded,nodes[0].position.x,nodes[0].position.y,options).path,nodes[0].path);
});
test('spatial compact labels do not shrink below the readable font floor',()=>{
 const context={font:'',measureText(text){return {width:text.length*(parseFloat(this.font.match(/([0-9.]+)px/)?.[1]) || 14)*.65};}};
 const fitted=fitPimTextBlock(context,{title:'A very long title '.repeat(30),radius:42,strictMinimum:true});
 assert.ok(fitted.titleFontSize>=14);assert.ok(fitted.titleLines.length<=3);
});
