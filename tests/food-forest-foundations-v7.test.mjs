import test from 'node:test';
import assert from 'node:assert/strict';
import {createFoodForestFoundationPiece,FOOD_FOREST_FOUNDATIONS,FOOD_FOREST_FOUNDATION_VARIANTS} from '../app/services/foodForestFoundations.js';

test('the foundation kit covers the five requested plant roles with four named forms each',()=>{
    assert.deepEqual(FOOD_FOREST_FOUNDATIONS.map(group=>group.id),['edge-control','nitrogen-fixer','perennial-food','fruit-and-shrub','herb-spice']);
    for(const group of FOOD_FOREST_FOUNDATIONS){assert.equal(FOOD_FOREST_FOUNDATION_VARIANTS[group.id].length,4);assert.ok(group.examples.length>=3);}
});

test('all twenty foundational pieces render as finite, compact, unfolding single meshes',()=>{
    for(const group of FOOD_FOREST_FOUNDATIONS)for(let variant=0;variant<4;variant++){
        const piece=createFoodForestFoundationPiece(group.id,{variant,planted:true,seed:`${group.id}:${variant}`});
        assert.equal(piece.group.children.length,1,`${group.id} ${variant} stays one mesh`);
        const geometry=piece.group.children[0].geometry;
        assert.ok(geometry.attributes.position.array.every(Number.isFinite));
        assert.ok(geometry.attributes.color.array.every(value=>Number.isFinite(value)&&value>=0&&value<=1));
        assert.ok(geometry.morphAttributes.position[0].array.every(Number.isFinite));
        assert.ok(geometry.attributes.position.count/3<6000,`${group.id} ${variant} remains a light miniature`);
        piece.reveal(0);assert.equal(piece.group.children[0].morphTargetInfluences[0],1);
        piece.reveal(1);assert.equal(piece.group.children[0].morphTargetInfluences[0],0);
        piece.dispose();
    }
});

test('the five foundational silhouettes remain distinct instead of aliasing one generic layer piece',()=>{
    const signatures=new Set();
    for(const group of FOOD_FOREST_FOUNDATIONS){
        const piece=createFoodForestFoundationPiece(group.id,{variant:0,planted:false,seed:`signature:${group.id}`});
        const geometry=piece.group.children[0].geometry,position=geometry.attributes.position;
        const box=geometry.boundingBox??(geometry.computeBoundingBox(),geometry.boundingBox);
        signatures.add([position.count,box.max.x-box.min.x,box.max.y-box.min.y,box.max.z-box.min.z].map(n=>Number(n).toFixed(4)).join(':'));
        piece.dispose();
    }
    assert.equal(signatures.size,FOOD_FOREST_FOUNDATIONS.length);
});
