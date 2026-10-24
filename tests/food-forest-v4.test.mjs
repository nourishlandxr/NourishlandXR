import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {foodForestBoundary} from '../app/services/foodForestBoardModel.js';
import {normalizeFoodForestStudy} from '../app/services/foodForestV3Model.js';
import {advanceForestLesson,forestSpaceKind,forestSupport,attachForestVine} from '../app/services/foodForestV4Model.js';
import {boardPointInside} from '../app/services/foodForestBoardModel.js';
import {createFoodForestPiece} from '../app/services/foodForestPieces.js';
const tree={id:'tree',layer:'small-tree',variant:0,x:0,z:0,size:1};
const board=(pieces=[])=>normalizeFoodForestStudy({widthM:20,depthM:12,boundary:foodForestBoundary(),pieces});
test('fresh boards invite one discovery; previous designs resume without compulsory lessons',()=>{
    assert.deepEqual(board().learning,{active:true,step:0});const b=board([tree]);assert.equal(b.schemaVersion,4);assert.equal(b.learning.active,false);assert.equal(b.pieces[0].x,0);
    assert.deepEqual(normalizeFoodForestStudy({...b,learning:{active:true,step:3}}).learning,{active:true,step:3});
});
test('lesson progress follows successful new placement rather than arbitrary overlap or existing pieces',()=>{
    let before=board(),after=board([tree]);after.learning={active:true,step:0};assert.ok(advanceForestLesson(before,after));assert.equal(after.learning.step,1);assert.equal(after.growth,0);
    before=structuredClone(after);after.learning.step=2;after.pieces.push({...tree,id:'patch',layer:'groundcover'});assert.ok(advanceForestLesson(before,after));assert.equal(after.learning.step,3);
    before=structuredClone(after);assert.equal(advanceForestLesson(before,after),false);after.pieces.push({...tree,id:'vine',layer:'climber'});assert.ok(advanceForestLesson(before,after));assert.equal(after.learning.step,4);
    before=structuredClone(after);after.scenario='wind';assert.ok(advanceForestLesson(before,after));assert.equal(after.learning.step,5);
});
test('ground patches have independent dimensions; vines retain valid support links through normalization',()=>{
    const b=board([tree,{...tree,id:'patch',layer:'groundcover',groundWidthM:4,groundDepthM:2},{...tree,id:'vine',layer:'climber',supportKind:'plant',supportId:'tree'}]);
    assert.equal(b.pieces[1].canopyDiameterM,0);assert.deepEqual([b.pieces[1].groundWidthM,b.pieces[1].groundDepthM],[4,2]);assert.equal(forestSpaceKind(b.pieces[1]),'ground-patch');assert.equal(forestSpaceKind(b.pieces[2]),'climbing-extent');assert.equal(forestSupport(b,b.pieces[2]).id,'tree');
    const normalized=normalizeFoodForestStudy({...b,pieces:b.pieces.slice(1)});assert.equal(normalized.pieces[1].supportKind,'trellis');assert.equal(normalized.pieces[1].supportId,'');
});
test('attaching a vine at the board edge keeps its planting point inside the outline',()=>{
    const b=board([{...tree,x:2.95,z:1.95},{...tree,id:'vine',layer:'climber',supportKind:'plant',supportId:'tree'}]);attachForestVine(b,b.pieces[1]);assert.ok(boardPointInside(b.pieces[1],b.boundary));assert.doesNotThrow(()=>normalizeFoodForestStudy(b));
});
test('planted root crops sit below glass; groundcovers and vines lose their token plinths',()=>{
    for(const layer of ['root','groundcover','climber','small-tree']){
        const p=createFoodForestPiece(layer,{planted:true,marks:false}),box=new THREE.Box3().setFromObject(p.group);assert.equal(p.group.children.length,1);assert.ok(p.group.children[0].geometry.attributes.position.array.every(Number.isFinite));
        if(layer==='root'){assert.ok(box.min.y<-.15);assert.ok(box.max.y<.2);}if(layer==='groundcover')assert.ok(box.max.y<.1);p.dispose();
    }
    const trailing=createFoodForestPiece('climber',{planted:true,trail:true,marks:false}),box=new THREE.Box3().setFromObject(trailing.group);assert.ok(box.max.y<.2);assert.ok(box.max.x>.5);trailing.dispose();
});
