import test from 'node:test';import assert from 'node:assert/strict';
import {createPracticeBody,stepPracticeBodies} from '../app/services/welcomePracticePhysics.js';
import {constrainFruitNeighbours,fruitOverlaps} from '../app/services/welcomeFruitCollision.js';
const fruit=(id,x=0)=>Object.assign(createPracticeBody(id,{x,radius:.05}),{visible:true,fruit:true,position:{x,y:.06,z:0}});
test('fruit stops at another fruit even across one large held movement',()=>{
 const a=fruit('a',-.3),b=fruit('b');b.basketed=true;const next={x:.3,y:.06,z:0};constrainFruitNeighbours(a,next,a.position,[a,b]);assert.ok(next.x<-.1);assert.equal(fruitOverlaps(a,next,b),false);
});
test('resting fruit separates from plated fruit and coincident fruit centres',()=>{
 const a=fruit('a'),b=fruit('b');a.anchored=true;stepPracticeBodies([a,b],.01);assert.equal(fruitOverlaps(a,a.position,b),false);assert.deepEqual(a.position,{x:0,y:.06,z:0});
 const c=fruit('c'),d=fruit('d');stepPracticeBodies([c,d],.01);assert.equal(fruitOverlaps(c,c.position,d),false);
});
