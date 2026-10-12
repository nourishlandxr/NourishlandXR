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

test('Creator brushes retain their purpose, styles and animation through save and undo',()=>{
 const p=createSpatialPaintV2();for(const brush of ['earth','water','vine','firefly']){p.setBrush(brush);p.begin(brush,point(0));for(let i=1;i<25;i++)p.add(brush,point(i*.005));p.end(brush);}const saved=p.serialize();assert.deepEqual(saved.strokes.map(s=>s.brush),['earth','water','vine','firefly']);assert.ok(p.snapshot().effects.leaves>0);assert.ok(p.snapshot().effects.lights>0);p.update(10);const light=p.root.children.at(-1),before=light.instanceMatrix.array.slice();p.update(11);assert.notDeepEqual(light.instanceMatrix.array,before);p.setMotion(false);const version=light.instanceMatrix.version;p.update(12);assert.equal(light.instanceMatrix.version,version);p.undo();assert.equal(p.serialize().strokes.at(-1).brush,'vine');p.redo();assert.deepEqual(p.serialize().strokes,saved.strokes);const q=createSpatialPaintV2();q.restore(p.serialize());assert.equal(q.snapshot().motion,false);assert.deepEqual(q.serialize(),p.serialize());assert.throws(()=>q.restore({...saved,strokes:[{...saved.strokes[0],brush:'unknown'}]}));assert.deepEqual(q.serialize(),p.serialize());p.destroy();q.destroy();
});
