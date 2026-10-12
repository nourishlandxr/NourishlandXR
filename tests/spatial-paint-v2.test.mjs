import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialPaintV2} from '../app/services/spatialPaintV2.js';
const point=(x,y=0,z=0)=>({x,y,z});
test('fine movements create rounded geometry and end at the actual released tip',()=>{
 const p=createSpatialPaintV2();p.begin('hand',point(0));p.add('hand',point(.004,.002));p.end('hand');const data=p.serialize();assert.ok(p.snapshot().segments>1);assert.deepEqual(data.strokes[0].points.at(-1),point(.004,.002));assert.equal(p.root.children.length,2);assert.ok(p.root.children.every(n=>n.isInstancedMesh));p.destroy();
});
test('long same-colour drawings exceed the old 100 segments and undo/redo restores all styles',()=>{
 const p=createSpatialPaintV2();p.begin('a',point(0));for(let i=1;i<150;i++)p.add('a',point(i*.004,Math.sin(i/10)*.02));p.end('a');assert.ok(p.snapshot().segments>100);const first=p.serialize();p.setWidth(.01);p.setColour(3);p.begin('b',point(0,.1));p.add('b',point(.05,.1));p.end('b');const all=p.serialize();p.undo();assert.deepEqual(p.serialize(),first);p.redo();assert.deepEqual(p.serialize(),all);const restored=createSpatialPaintV2();restored.restore(all);assert.deepEqual(restored.serialize(),all);all.strokes[0].points[0].x=99;assert.equal(restored.serialize().strokes[0].points[0].x,0);restored.destroy();p.destroy();
});
test('tracking jumps do not bridge across space and invalid imports preserve existing work',()=>{
 const p=createSpatialPaintV2();p.begin('a',point(0));p.add('a',point(.4));p.endAll();assert.equal(p.snapshot().strokes,2);assert.equal(p.snapshot().segments,0);const original=p.serialize();assert.throws(()=>p.restore({version:2,strokes:[{colour:'bad',width:.005,points:[point(0)]}]}));assert.deepEqual(p.serialize(),original);p.destroy();
});
test('capacity is explicit and undo recovers space',()=>{
 const p=createSpatialPaintV2({capacity:20});p.begin('a',point(0));p.add('a',point(.1));p.endAll();assert.equal(p.snapshot().limited,true);assert.equal(p.snapshot().points,20);p.undo();assert.equal(p.snapshot().limited,false);p.begin('b',point(0));assert.equal(p.snapshot().points,1);p.destroy();
});
