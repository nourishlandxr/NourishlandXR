import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {createHeroDicePhysics,createHeroDiceVisibility} from '../app/services/heroDiceToy.js';
import {createDemoLivingMapXR} from '../app/services/demoLivingMapXR.js';
test('reading preloads hidden map meshes one at a time, with no reveal upload burst',()=>{
    const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0})};
    const calls=[],gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:(_p,k)=>k,getExtension:()=>null},{get:(target,key)=>key in target?target[key]:key.startsWith('create')?()=>({}):key===key.toUpperCase()?key:(...args)=>calls.push([key,...args])});
    const scene=new THREE.Scene(),mat=new THREE.MeshBasicMaterial(),geometries=[new THREE.BoxGeometry(),new THREE.SphereGeometry(1,8,6)];
    const nodes=geometries.map(geo=>new THREE.Mesh(geo,mat));nodes.forEach(node=>{node.visible=false;scene.add(node);});scene.updateMatrixWorld();
    const renderer=createDemoLivingMapXR(gl,scene),matrix=new THREE.Matrix4().elements,view={projectionMatrix:matrix,transform:{inverse:{matrix}}};
    try{
        assert.equal(renderer.prepareNext(),false);assert.equal(calls.filter(c=>c[0]==='bufferData').length,4);
        assert.equal(renderer.prepareNext(),true);const uploads=calls.filter(c=>c[0]==='bufferData').length;assert.equal(uploads,8);
        nodes.forEach(node=>node.visible=true);renderer.draw(view,{x:0,y:1,z:-1},0,1);renderer.draw(view,{x:0,y:1,z:-1},0,1);
        assert.equal(calls.filter(c=>c[0]==='bufferData').length,uploads);assert.equal(calls.filter(c=>c[0]==='drawArrays').length,4);
    }finally{renderer.destroy();geometries.forEach(geo=>geo.dispose());mat.dispose();globalThis.document=previous;}
});

test('Dice visibility fades both ways, including an interrupted fade',()=>{
    const fade=createHeroDiceVisibility();assert.equal(fade.update(true,0),0);assert.equal(fade.update(true,800),1);
    assert.equal(fade.update(false,900),1);assert.equal(fade.update(false,1300),.5);
    assert.equal(fade.update(true,1300),.5);assert.ok(fade.update(true,1700)>.5);assert.equal(fade.update(true,2100),1);
    fade.update(false,2200);assert.equal(fade.update(false,3000),0);assert.equal(fade.update(false,6000),0);
});

test('settled Dice sleeps and wakes for a touch or floor change',()=>{
    const physics=createHeroDicePhysics({x:0,y:0,z:0});physics.step(1/90);
    const rest=physics.state.rotation;for(let i=0;i<300;i++)physics.step(1/90);
    assert.equal(physics.state.rotation,rest,'resting frames skip collision/rotation work');
    physics.state.velocity.x=.6;physics.step(1/90);assert.ok(physics.state.position.x>0);
    for(let i=0;i<1000;i++)physics.step(1/90);
    physics.state.home.y=.2;physics.step(1/90);assert.ok(physics.state.position.y>=.39-1e-8);
});

test('five moving pegs upload five GPU poses once across both eyes, preserving static buffers',()=>{
    const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0})};
    const calls=[],locations={p:0,n:1,uv:2,c:3,i0:4,i1:5,i2:6,i3:7};
    const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:(_p,name)=>locations[name],getUniformLocation:(_p,name)=>name,drawArraysInstanced:(...args)=>calls.push(['instances',...args]),vertexAttribDivisor:(...args)=>calls.push(['divisor',...args])},{get:(target,key)=>key in target?target[key]:key.startsWith('create')?()=>({}):key===key.toUpperCase()?key:(...args)=>calls.push([key,...args])});
    const scene=new THREE.Scene(),geo=new THREE.SphereGeometry(1,16,10),mat=new THREE.MeshBasicMaterial({color:'#fff'}),pegs=new THREE.InstancedMesh(geo,mat,5);
    pegs.userData.livingMapDynamic=true;for(let i=0;i<5;i++){pegs.setMatrixAt(i,new THREE.Matrix4().makeTranslation(i,0,0));pegs.setColorAt(i,new THREE.Color('#62afa4'));}pegs.instanceMatrix.needsUpdate=true;
    scene.add(pegs);scene.updateMatrixWorld();const renderer=createDemoLivingMapXR(gl,scene),matrix=new THREE.Matrix4().elements,view={projectionMatrix:matrix,transform:{inverse:{matrix}}};
    try{
        renderer.draw(view,{x:0,y:1,z:-1},0,1);const initial=calls.filter(c=>c[0]==='bufferData').length;
        pegs.setMatrixAt(0,new THREE.Matrix4().makeTranslation(.2,0,0));pegs.instanceMatrix.needsUpdate=true;
        renderer.draw(view,{x:0,y:1,z:-1},0,1);renderer.draw(view,{x:0,y:1,z:-1},0,1);
        assert.equal(calls.filter(c=>c[0]==='bufferData').length,initial);
        const updates=calls.filter(c=>c[0]==='bufferSubData');assert.equal(updates.length,1);assert.equal(updates[0][3].length,5*16);
        assert.equal(calls.filter(c=>c[0]==='instances').length,3);assert.ok(calls.filter(c=>c[0]==='instances').every(c=>c[4]===5));
        for(const location of [3,4,5,6,7])assert.deepEqual(calls.filter(c=>c[0]==='divisor' && c[1]===location).at(-1),['divisor',location,0],'restore shared XR attribute state');
    }finally{renderer.destroy();geo.dispose();mat.dispose();globalThis.document=previous;}
});
