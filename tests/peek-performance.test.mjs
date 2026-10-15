import test from 'node:test';
import assert from 'node:assert/strict';
import {botanicalLeaf,botanicalBranch,botanicalRoseApple} from '../app/services/peekBotanicalGeometry.js';

test('Peek foliage keeps curved closed geometry within the mobile vertex budget',()=>{
 const leaf=botanicalLeaf(.7,.2,{rows:26});
 const branch=botanicalBranch([[0,0,0],[0,.5,.1],[0,1,0]],.03,{segments:24,sides:12});
 const fruit=botanicalRoseApple(.1);
 try {
  assert.equal(leaf.index.count/3,192); // Was 832 for the same requested leaf.
  assert.ok(branch.index.count/3<=192);
  assert.ok(fruit.index.count/3<=600);
  for(const geometry of [leaf,branch,fruit]){
   geometry.computeBoundingSphere();
   assert.ok(Number.isFinite(geometry.boundingSphere.radius)&&geometry.boundingSphere.radius>0);
   assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
  }
  leaf.computeBoundingBox();
  assert.ok(leaf.boundingBox.max.y>.69);
 } finally { leaf.dispose();branch.dispose();fruit.dispose(); }
});
