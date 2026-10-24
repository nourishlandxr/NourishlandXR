import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {normalizeForestRootFields,forestRootDimensions,forestRootOverlaps} from '../app/services/foodForestRootModel.js';
import {normalizeFoodForestStudy} from '../app/services/foodForestV3Model.js';
import {foodForestBoundary} from '../app/services/foodForestBoardModel.js';
import {createFoodForestRoots} from '../app/services/foodForestRoots.js';
import {createFoodForestPiece} from '../app/services/foodForestPieces.js';
const item={id:'tree',layer:'small-tree',variant:0,x:0,z:0,size:1,rootSpreadM:6,rootDepthM:.8,rootBasis:'user-assumption'};
const board=()=>normalizeFoodForestStudy({widthM:20,depthM:12,boundary:foodForestBoundary(),pieces:[item]});
test('root space uses project metres and stays independent of token size and canopy pruning',()=>{
    const s=board(),d=forestRootDimensions(s,s.pieces[0]);assert.deepEqual(d,{spreadM:6,depthM:.8,x:1.8,z:2,y:.24000000000000005});
    s.pruning=60;s.pieces[0].size=1.8;s.pieces[0].canopyDiameterM=12;assert.deepEqual(forestRootDimensions(s,s.pieces[0]),d);
    s.widthM=40;assert.equal(forestRootDimensions(s,s.pieces[0]).x,.9);assert.equal(forestRootDimensions(s,s.pieces[0]).z,2);assert.equal(forestRootDimensions(s,s.pieces[0],.5).spreadM,3);
});
test('root mesh is calibrated to a half-unit radius and unit depth before metre scaling',()=>{
    for(const layer of['canopy','small-tree','herb','groundcover']){
        const p=createFoodForestRoots(layer,2),g=p.group.children[0].geometry,position=g.attributes.position;let radius=0,minY=0,maxY=-Infinity;for(let i=0;i<position.count;i++){radius=Math.max(radius,Math.hypot(position.getX(i),position.getZ(i)));minY=Math.min(minY,position.getY(i));maxY=Math.max(maxY,position.getY(i));}assert.ok(Math.abs(radius-.5)<1e-6);assert.equal(minY,-1);assert.ok(Math.abs(maxY)<1e-6);p.dispose();
    }
});
test('practice presets are labelled; supplied references need evidence; root settings survive migration',()=>{
    assert.equal(normalizeForestRootFields({layer:'small-tree'}).rootBasis,'practice-preset');assert.equal(normalizeForestRootFields({...item,rootBasis:'reference'}).rootBasis,'user-assumption');
    const s=board();s.pieces[0]={...s.pieces[0],rootBasis:'reference',rootSourceUrl:'https://example.com/root-study',rootEvidence:'Fixture supplied dimension'};const restored=normalizeFoodForestStudy(JSON.parse(JSON.stringify(s)));assert.equal(restored.pieces[0].rootSpreadM,6);assert.equal(restored.pieces[0].rootBasis,'reference');assert.equal(normalizeForestRootFields({...item,rootSpreadM:0}).rootBasis,'unknown');
});
test('overlap uses actual metre distance and reports shared root space without a yield score',()=>{
    const s=board();s.pieces.push({...s.pieces[0],id:'other',x:1});assert.equal(forestRootOverlaps(s).length,1);s.widthM=60;assert.equal(forestRootOverlaps(s).length,0);assert.equal(Object.hasOwn(forestRootOverlaps(board()),'yield'),false);
});
test('organic character is stable per saved identity and varies across separate plant pieces',()=>{
    const a=createFoodForestPiece('small-tree',{variant:0,seed:'a',marks:false}),again=createFoodForestPiece('small-tree',{variant:0,seed:'a',marks:false}),b=createFoodForestPiece('small-tree',{variant:0,seed:'b',marks:false});
    assert.deepEqual(a.group.children[0].geometry.attributes.position.array,again.group.children[0].geometry.attributes.position.array);assert.notDeepEqual(a.group.children[0].geometry.attributes.position.array,b.group.children[0].geometry.attributes.position.array);assert.equal(a.group.children[0].material.bumpMap,again.group.children[0].material.bumpMap);for(const p of[a,again,b])p.dispose();
});
