import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {createDemoLivingMapXR} from '../app/services/demoLivingMapXR.js';
import {createDemoLivingMapConcept} from '../app/services/demoLivingMapModel.js';
import {livingMapObstacles,livingMapRoutes,routeSegmentClear} from '../app/services/demoLivingMapRoute.js';
import {createLivingMapVisitors} from '../app/services/demoLivingMapVisitors.js';

test('larger swale tree canopies stay clear of every visitor throughout the complete journey',()=>{
    const model=createDemoLivingMapConcept({interactive:true}),trees=model.landscape.trees.filter(t=>t.habitat==='swale');
    assert.ok(trees.length>=5 && trees.some(t=>t.size>1.1));
    assert.equal(new Set(trees.map(t=>t.habit)).size,5,'swales use five distinct growth habits');
    assert.ok(trees.every(t=>Number.isFinite(t.canopyRadius)));
    const obstacles=livingMapObstacles(model),routes=livingMapRoutes(model),visitors=createLivingMapVisitors(model,routes);
    assert.ok(trees.every(t=>obstacles.some(o=>o.x===t.x && o.z===t.z && o.radius>=t.canopyRadius+.15)));
    const placed=model.areas.map((a,i)=>({id:a.id,at:[0,300,2600][i]}));let previous=[];
    for(let t=0;t<210000;t+=40){const states=visitors.update(t,placed.filter(p=>p.at<=t));
        for(const s of states){if(!s.scale)continue;assert.ok(routeSegmentClear(s,s,obstacles));if(previous[s.index]?.scale)assert.ok(routeSegmentClear(previous[s.index],s,obstacles),'travel segment stays outside canopies');}
        previous=states.map(s=>({...s}));
    }
});

function colourScene(){
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));geo.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));geo.setAttribute('color',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1],3));
    const mat=new THREE.MeshLambertMaterial({vertexColors:true}),node=new THREE.InstancedMesh(geo,mat,1);node.userData.livingMapDynamic=true;node.setMatrixAt(0,new THREE.Matrix4());node.setColorAt(0,new THREE.Color(.6,.4,.2));node.instanceMatrix.needsUpdate=true;const scene=new THREE.Scene();scene.add(node);scene.updateMatrixWorld();return {scene,geo,mat};
}
for(const gpu of [true,false])test(`native XR keeps face vertex colours and shirt instance tint with ${gpu?'GPU instancing':'fallback batching'}`,()=>{
    const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0})};
    const calls=[],locations={p:0,n:1,uv:2,c:3,i0:4,i1:5,i2:6,i3:7,ic:8};let bound,serial=0;
    const base={getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:(_p,k)=>locations[k],getUniformLocation:(_p,k)=>k,getExtension:()=>null,createBuffer:()=>++serial,bindBuffer:(_t,b)=>bound=b,bufferData:(_t,a)=>calls.push(['data',bound,Array.from(a)]),vertexAttribPointer:(i)=>calls.push(['attribute',i,bound]),shaderSource:(_s,source)=>calls.push(['shader',source])};
    if(gpu){base.drawArraysInstanced=()=>{};base.vertexAttribDivisor=(i,d)=>calls.push(['divisor',i,d]);}
    const gl=new Proxy(base,{get:(target,key)=>key in target?target[key]:key==='drawArraysInstanced'||key==='createVertexArray'?undefined:key.startsWith('create')?()=>({}):key===key.toUpperCase()?key:(...args)=>calls.push([key,...args])});
    const {scene,geo,mat}=colourScene();const renderer=createDemoLivingMapXR(gl,scene),matrix=new THREE.Matrix4().elements;
    try{renderer.draw({projectionMatrix:matrix,transform:{inverse:{matrix}}},{x:0,y:1,z:-1},0,1);
        if(gpu){assert.ok(calls.some(c=>c[0]==='shader'&&c[1].includes('c*(instanced>.5?ic:vec3(1.))')));const vertex=calls.find(c=>c[0]==='attribute'&&c[1]===3),instance=calls.find(c=>c[0]==='attribute'&&c[1]===8);assert.notEqual(vertex[2],instance[2]);assert.ok(!calls.some(c=>c[0]==='divisor'&&c[1]===3&&c[2]===1));assert.deepEqual(calls.filter(c=>c[0]==='divisor'&&c[1]===8).at(-1),['divisor',8,0]);}
        else{const colours=calls.filter(c=>c[0]==='data')[3][2];assert.ok(Math.abs(colours[0]-.6)<1e-6);assert.equal(colours[1],0);assert.ok(Math.abs(colours[4]-.4)<1e-6);assert.equal(colours[6],0);assert.ok(Math.abs(colours[8]-.2)<1e-6);}
    }finally{renderer.destroy();geo.dispose();mat.dispose();globalThis.document=previous;}
});
