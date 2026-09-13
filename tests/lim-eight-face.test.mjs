import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
 LIM_ALL_CELLS,LIM_CELLS,LIM_CELL_BY_ID,LIM_FACES,LIM_FACE_CELLS,LIM_FACE_MEMBERS,LIM_GRAPHS,
 LIM_MAPPING_REVIEW,LIM_PATHWAYS,LIM_PATHWAY_SCHEMA,migrateLegacyLimState,limLearningContent
} from '../app/services/limLearning.js';

const FACE_IDS=[
 'lim-climate','lim-food-forest','lim-plant','lim-pin','lim-uses-making',
 'lim-origins-culture','lim-wildlife-relationships','lim-discovery-pathways'
];

test('the public LIM uses eight canonical parents while retaining all 93 source cells',()=>{
 assert.deepEqual(LIM_FACES.map(face=>face.id),FACE_IDS);
 assert.equal(LIM_FACE_CELLS.length,8);
 assert.equal(LIM_CELLS.length,93);
 assert.equal(LIM_ALL_CELLS.length,97);
 assert.equal(new Set(LIM_ALL_CELLS.map(cell=>cell.id)).size,97);
 assert.deepEqual(LIM_FACES.map(face=>face.title),[
  'Climate and Place','Living Landscapes','Plants and Life','Place and Observation',
  'Uses and Making','Origins and Culture','Wildlife and Relationships','Discovery and Pathways'
 ]);
 for(const id of FACE_IDS)assert.equal(LIM_FACE_CELLS.filter(cell=>cell.id===id).length,1);
});

test('the 93 stable IDs and companion texts remain unchanged through face mapping',()=>{
 const digest=crypto.createHash('sha256').update(JSON.stringify(LIM_CELLS.map(({id,content})=>[id,content]))).digest('hex');
 assert.equal(digest,'0a248673870ef12c09ec120be8ff3769a9347019668cb87b47a4dac5adf5da15');
 const faceIds=new Set(FACE_IDS),reviewIds=new Set(LIM_MAPPING_REVIEW.map(item=>item.cellId));
 const counts={};
 for(const cell of LIM_CELLS){
  assert.equal(LIM_CELL_BY_ID[cell.id],cell);
  assert.ok(faceIds.has(cell.primaryFaceId),`${cell.id} has one known primary face`);
  assert.equal(cell.parentId,cell.legacyParentId,`${cell.id} retains its source parent`);
  assert.equal(cell.legacyGroupId,cell.groupId);
  assert.equal(cell.faceParentId,cell.id===cell.primaryFaceId?null:cell.primaryFaceId);
  assert.equal(cell.faceMappingStatus,reviewIds.has(cell.id)?'review':'approved');
  assert.ok(cell.relatedFaceIds.every(id=>faceIds.has(id) && id!==cell.primaryFaceId));
  assert.equal(new Set(cell.relatedFaceIds).size,cell.relatedFaceIds.length);
  counts[cell.primaryFaceId]=(counts[cell.primaryFaceId]||0)+1;
 }
 assert.deepEqual(counts,{
  'lim-climate':25,'lim-food-forest':20,'lim-wildlife-relationships':7,'lim-uses-making':4,
  'lim-plant':13,'lim-origins-culture':5,'lim-pin':11,'lim-discovery-pathways':8
 });
 assert.equal(Object.values(LIM_FACE_MEMBERS).flat().length,93);
 assert.equal(LIM_CELLS.filter(cell=>cell.relatedFaceIds.length).length,64);
 assert.equal(LIM_CELLS.reduce((total,cell)=>total+cell.relatedFaceIds.length,0),84);
});

test('Phase 8 confirms all six editorial mappings and clears the review queue',()=>{
 assert.deepEqual(LIM_MAPPING_REVIEW,[]);
 const expected={
  'lim-climate-subtropical-suitable-plants':['lim-climate',['lim-plant','lim-food-forest']],
  'lim-climate-subtropical-planting-conditions':['lim-climate',['lim-food-forest','lim-plant']],
  'lim-food-forest-function-yield':['lim-food-forest',['lim-uses-making']],
  'lim-plant-harvest-flower':['lim-uses-making',['lim-plant','lim-wildlife-relationships']],
  'lim-pin-specimen-canopy-layer':['lim-food-forest',['lim-pin','lim-plant']],
  'lim-pin-specimen-method':['lim-discovery-pathways',['lim-pin','lim-plant']]
 };
 for(const [id,[primary,related]] of Object.entries(expected)){
  const cell=LIM_CELL_BY_ID[id];
  assert.equal(cell.primaryFaceId,primary,id);
  assert.deepEqual(cell.relatedFaceIds,related,id);
  assert.equal(cell.faceMappingStatus,'approved',id);
 }
});

test('each showcase cell appears once under its primary face',()=>{
 const shown=[];
 for(const graph of LIM_GRAPHS){
  assert.equal(graph.limId,graph.id);
  assert.equal(LIM_CELL_BY_ID[graph.limId]?.layoutRole,'face');
  assert.ok(graph.children.length>=2);
  shown.push(graph.limId);
  for(const branch of graph.children){
   assert.equal(branch.primaryFaceId,graph.id);shown.push(branch.limId);
   for(const child of branch.children){assert.equal(child.primaryFaceId,graph.id);shown.push(child.limId);}
  }
  const content=limLearningContent(graph.limId);
  assert.equal(content.title,graph.label);
  assert.equal(content.primaryFaceId,graph.id);
 }
 assert.equal(new Set(shown).size,shown.length);
});

test('parent and child selections carry complete companion-panel metadata',()=>{
 for(const id of ['lim-climate','lim-food-forest-layers-canopy','lim-food-forest-function-yield']){
  const content=limLearningContent(id),cell=LIM_CELL_BY_ID[id];
  assert.equal(content.id,id);
  assert.equal(content.title,cell.title);
  assert.equal(content.body,cell.content);
  assert.equal(content.primaryFaceId,cell.primaryFaceId);
  assert.deepEqual(content.relatedFaceIds,cell.relatedFaceIds);
  assert.equal(content.accent,cell.accent);
  assert.equal(content.accessibilityLabel,cell.accessibilityLabel);
 }
});

test('legacy four-group and interim face state adapts without mutating saved data',()=>{
 const legacy={groupId:'climate',activeFaceId:'climate-place',selectedCellId:'lim-face-uses-making',expandedFaceIds:['food-forest','lim-face-uses-making']};
 const snapshot=structuredClone(legacy);
 const migrated=migrateLegacyLimState(legacy);
 assert.deepEqual(legacy,snapshot);
 assert.equal(migrated.activeFaceId,'lim-climate');
 assert.equal(migrated.selectedCellId,'lim-uses-making');
 assert.deepEqual(migrated.expandedFaceIds,['lim-food-forest','lim-uses-making']);
 assert.deepEqual(migrateLegacyLimState(migrated),migrated);
});

test('future pathways have a versioned empty model without imposing progression',()=>{
 assert.equal(LIM_PATHWAY_SCHEMA.version,1);
 assert.deepEqual(LIM_PATHWAYS,[]);
 for(const field of ['id','title','learningGoal','description','orderedCellIds','suggestedBranches','completionState','version'])assert.ok(LIM_PATHWAY_SCHEMA.fields.includes(field));
 assert.ok(LIM_CELLS.every(cell=>Array.isArray(cell.pathwayRefs) && cell.pathwayRefs.length===0));
});
