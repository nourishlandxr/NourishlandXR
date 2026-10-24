import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../app/vendor/three.module.min.js';
import {foodForestBoundary,foodForestArea,validFoodForestBoundary,boardPointInside,foodForestFootprintOverlaps} from '../app/services/foodForestBoardModel.js';
import {FOOD_FOREST_LAYERS,FOOD_FOREST_VARIANTS,createFoodForestPiece} from '../app/services/foodForestPieces.js';
import {createFoodForestRoots} from '../app/services/foodForestRoots.js';

test('board dimensions retain schematic area and concave boundaries remain usable',()=>{
    const rectangle=foodForestBoundary();assert.equal(foodForestArea(rectangle),240);assert.equal(foodForestArea(rectangle,30,12),360);
    const round=foodForestBoundary('round');assert.ok(validFoodForestBoundary(round));assert.ok(Math.abs(foodForestArea(round)-Math.PI*10*6)<1);
    const notch=[{x:-3,z:-2},{x:3,z:-2},{x:3,z:2},{x:0,z:0},{x:-3,z:2}];assert.ok(validFoodForestBoundary(notch));assert.equal(boardPointInside({x:0,z:1.5},notch),false);assert.equal(boardPointInside({x:0,z:-1},notch),true);
    assert.equal(boardPointInside({x:3,z:2},rectangle),true);
});
test('invalid outlines cannot be saved as a board',()=>{
    for(const boundary of [[],[{x:0,z:0},{x:1,z:0},{x:1,z:0}], [{x:-3,z:-2},{x:3,z:2},{x:3,z:-2},{x:-3,z:2}], [{x:-3,z:-2},{x:3,z:-2},{x:0,z:-2},{x:3,z:2},{x:-3,z:2}], [{x:4,z:0},{x:0,z:1},{x:0,z:-1}]])assert.equal(validFoodForestBoundary(boundary),false);
});
test('footprint overlaps use real board dimensions and skip unknown spreads',()=>{
    const pieces=[{id:'a',x:0,z:0,canopyDiameterM:4},{id:'b',x:1,z:0,canopyDiameterM:4},{id:'unknown',x:0,z:0}];
    assert.equal(foodForestFootprintOverlaps(pieces,18,12).length,1);
    assert.equal(foodForestFootprintOverlaps(pieces,30,12).length,0);
    pieces[1].x=0;pieces[1].z=1;assert.equal(foodForestFootprintOverlaps(pieces,30,20).length,0);
    assert.equal(foodForestFootprintOverlaps(pieces,30,8)[0].distanceM,2);
});
test('all 28 original symbols are finite, distinct, and bounded for the loading bay',()=>{
    let count=0;
    for(const layer of FOOD_FOREST_LAYERS){const signatures=new Set();assert.equal(FOOD_FOREST_VARIANTS[layer.id].length,4);
        for(let variant=0;variant<4;variant++){
            const piece=createFoodForestPiece(layer.id,{variant,marks:false}),box=new THREE.Box3().setFromObject(piece.group),size=box.getSize(new THREE.Vector3());
            assert.ok([size.x,size.y,size.z].every(Number.isFinite));assert.ok(size.y>.04&&size.y<1.2);assert.ok(size.x<1.1&&size.z<1.1);
            const vertices=[];let meshes=0,triangles=0;piece.group.traverse(object=>{if(object.geometry){meshes++;const positions=object.geometry.attributes.position.array;assert.ok(positions.every(Number.isFinite));triangles+=(object.geometry.index?.count||positions.length/3)/3;vertices.push(createHash('sha256').update(Buffer.from(positions.buffer)).digest('hex'));}});assert.equal(meshes,1,'opaque token parts share one draw call');assert.ok(triangles<5000,'each token stays within the XR geometry budget');signatures.add(JSON.stringify(vertices));piece.dispose();count++;
        }
        assert.equal(signatures.size,4,`${layer.id} variants differ in geometry`);
    }
    assert.equal(count,28);
});
test('illustrative roots stay beneath the planting surface and use one mesh per plant',()=>{
    for(const layer of FOOD_FOREST_LAYERS)for(let variant=0;variant<4;variant++){
        const roots=createFoodForestRoots(layer.id,variant),bounds=new THREE.Box3().setFromObject(roots.group);
        assert.equal(roots.group.children.length,1);assert.ok(bounds.min.y<-.15&&bounds.min.y>-1.2);assert.ok(bounds.max.y<.025);
        assert.ok(roots.group.children[0].geometry.attributes.position.array.every(Number.isFinite));roots.dispose();assert.equal(roots.group.parent,null);
    }
});
