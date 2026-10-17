import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createRcBugControllerV2} from '../app/services/rcBugControllerV2.js';

test('RC Bug V2 attaches flight details to the original controller without replacing it',()=>{
    const model=new THREE.Group();
    for(const name of ['controller_mesh','a_button','b_button','thumbstick']){const face=new THREE.Mesh(new THREE.BoxGeometry(.018,.004,.018),new THREE.MeshStandardMaterial());face.name=name;model.add(face);}
    model.updateMatrixWorld(true);
    const v2=createRcBugControllerV2(model);
    try{
        assert.equal(v2.group.parent,model);
        assert.ok(model.getObjectByName('controller_mesh'));
        assert.ok(model.getObjectByName('Flight pod base'));
        assert.ok(model.getObjectByName('RC Bug V2 bezel · a_button'));
        assert.ok(model.getObjectByName('RC Bug V2 bezel · thumbstick'));
        assert.equal(v2.group.visible,false);
        v2.update(true,{flying:true,speed:.7,companion:'firefly'});
        assert.equal(v2.group.visible,true);
        assert.equal(model.visible,true);
        v2.update(false);
        assert.equal(v2.group.visible,false);
    }finally{v2.destroy();model.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});}
});
