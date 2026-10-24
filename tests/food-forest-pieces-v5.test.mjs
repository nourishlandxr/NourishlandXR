import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {createForestSculpture,sculptedLeafGeometry} from '../app/services/foodForestSculpture.js';
import {createFoodForestPiece,FOOD_FOREST_LAYERS} from '../app/services/foodForestPieces.js';

test('folded leaves have thickness, a lifted midrib and finite surface normals',()=>{
    for(const heart of[false,true]){const g=sculptedLeafGeometry(heart),p=g.attributes.position,n=g.attributes.normal;assert.ok(p.array.every(Number.isFinite));assert.ok(n.array.every(Number.isFinite));assert.ok(p.getZ(10)>p.getZ(9),'midrib lifts above the edge');const count=p.count/2;assert.ok(p.getZ(10)>p.getZ(count+10),'leaf has closed thickness');g.dispose();}
});
test('all 28 planted miniatures support a finite bud-to-open transition without extra meshes',()=>{
    for(const layer of FOOD_FOREST_LAYERS)for(let variant=0;variant<4;variant++){
        const p=createFoodForestPiece(layer.id,{variant,planted:true,marks:false}),mesh=p.group.children[0],g=mesh.geometry;assert.equal(p.group.children.length,1);assert.equal(g.morphAttributes.position[0].count,g.attributes.position.count);assert.ok(g.morphAttributes.position[0].array.every(Number.isFinite));assert.ok(g.attributes.color.array.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
        p.reveal(0);assert.equal(mesh.morphTargetInfluences[0],1);p.reveal(1);assert.equal(mesh.morphTargetInfluences[0],0);assert.ok(g.attributes.position.count/3<6000);p.dispose();
    }
});
test('ray picking follows the unfolding geometry instead of invisible full-size leaves',()=>{
    const kit=createForestSculpture();kit.leaf([0,0,0],[0,1,0],.3,'#71934d');const p=kit.finish({planted:true}),ray=new THREE.Raycaster(new THREE.Vector3(.2,.5,2),new THREE.Vector3(0,0,-1));p.group.updateMatrixWorld(true);p.reveal(1);assert.ok(ray.intersectObject(p.group,true).length>0);p.reveal(0);assert.equal(ray.intersectObject(p.group,true).length,0);p.dispose();
});
