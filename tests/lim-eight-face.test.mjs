import test from 'node:test';
import assert from 'node:assert/strict';
import {LIM_ALL_CELLS,LIM_CELLS,LIM_CELL_BY_ID,LIM_FACES,LIM_FACE_CELLS,LIM_GRAPHS,limLearningContent} from '../app/services/limLearning.js';

test('the public LIM has eight authored faces while retaining all 93 legacy cells',()=>{
 assert.equal(LIM_FACES.length,8);
 assert.equal(LIM_FACE_CELLS.length,8);
 assert.equal(LIM_CELLS.length,93);
 assert.equal(LIM_ALL_CELLS.length,101);
 assert.deepEqual(LIM_FACES.map(face=>face.title),[
  'Climate and Place','Living Landscapes','Plants and Life','Place and Observation',
  'Uses and Making','Origins and Culture','Wildlife and Relationships','Discovery and Pathways'
 ]);
});

test('every retained cell has a stable provisional face mapping and legacy metadata',()=>{
 const faceIds=new Set(LIM_FACES.map(face=>face.id));
 for(const cell of LIM_CELLS){
  assert.equal(LIM_CELL_BY_ID[cell.id],cell);
  assert.ok(faceIds.has(cell.primaryFaceId),`${cell.id} has a known primary face`);
  assert.equal(cell.faceParentId,`lim-face-${cell.primaryFaceId}`);
  assert.equal(cell.legacyGroupId,cell.groupId);
  assert.equal(cell.legacyParentId,cell.parentId);
  assert.ok(Array.isArray(cell.relatedFaceIds));
  assert.ok(cell.relatedFaceIds.every(id=>faceIds.has(id) && id!==cell.primaryFaceId));
 }
});

test('each octagonal showcase face points only to preserved LIM content',()=>{
 assert.equal(LIM_GRAPHS.length,8);
 for(const graph of LIM_GRAPHS){
  assert.equal(LIM_CELL_BY_ID[graph.limId]?.layoutRole,'face');
  assert.ok(graph.children.length>=2);
  for(const branch of graph.children){
   assert.ok(LIM_CELL_BY_ID[branch.limId]);
   for(const child of branch.children)assert.ok(LIM_CELL_BY_ID[child.limId]);
  }
  assert.equal(limLearningContent(graph.limId).title,graph.label);
 }
});
