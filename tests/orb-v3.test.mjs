import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrganicOrbGeometry} from '../app/services/organicOrbGeometry.js';
import {createSpatialSphereRenderer,drawSpatialOrb,destroySpatialSphereRenderer} from '../app/services/spatialSphereRenderer.js';
import {ORB_MODELS,spatialVisualDefaults,setSpatialVisualSettings,getSpatialVisualSettings} from '../app/services/spatialVisualSettings.js';
import {panelSettingsControls} from '../app/services/pimInfoPanel.js';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeControlOrb} from '../app/services/welcomeControlOrb.js';
import {readFileSync} from 'node:fs';

test('Orb V3 is opt-in through the shared XR and phone graphics controls',()=>{
    assert.equal(spatialVisualDefaults().orbModel,'living');assert.equal(ORB_MODELS.v3.label,'Orb V3 · test');
    const saved=getSpatialVisualSettings();
    try{setSpatialVisualSettings({orbModel:'v3'});assert.equal(getSpatialVisualSettings().orbModel,'v3');
        const control=panelSettingsControls({graphicsOpen:true,orbModel:'v3'}).find(control=>control.action==='OrbModel');
        assert.equal(control.label,'Orb V3 · test');assert.equal(control.ariaLabel,'Plant Orb');
    }finally{setSpatialVisualSettings(saved);}
});

test('organic cells have varied outlines, shared mating corners and stable topology across budgets',()=>{
    let previous=0,reference;
    for(const quality of ['low','medium','high']){
        const shape=createOrganicOrbGeometry(quality);assert.equal(shape.stride,10);assert.equal(shape.cells.length,18);
        assert.ok(new Set(shape.cells.map(cell=>cell.sides)).size>=3);assert.ok(shape.vertices.every(Number.isFinite));
        assert.ok(shape.vertices.length>previous);previous=shape.vertices.length;assert.ok(Math.max(...shape.indices)<65536);
        const topology=shape.cells.map(({id,sides,axis,corners})=>({id,sides,axis,corners}));
        if(reference)assert.deepEqual(topology,reference);else reference=topology;
        const corners=new Map();
        for(const cell of shape.cells)for(const corner of cell.corners){const key=corner.map(value=>value.toFixed(7)).join(',');corners.set(key,(corners.get(key)||0)+1);}
        assert.ok([...corners.values()].every(count=>count===3),'each mating junction is shared by three cells');
        for(let i=0;i<shape.vertices.length;i+=10){const radius=Math.hypot(...shape.vertices.slice(i,i+3));assert.ok(radius>=.9999 && radius<=1.0181,'closed outline stays spherical');}
        for(let i=0;i<shape.indices.length;i+=3){
            const points=[0,1,2].map(j=>shape.vertices.slice(shape.indices[i+j]*10,shape.indices[i+j]*10+3));
            const a=points[1].map((value,j)=>value-points[0][j]),b=points[2].map((value,j)=>value-points[0][j]);
            const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
            assert.ok(n.reduce((sum,value,j)=>sum+value*points[0][j],0)>0,'all shell triangles face outward');
        }
    }
});

test('optional shell buffers are lazy, reused between eyes and deleted once; closing docks exactly',()=>{
    const calls=[];let id=0;
    const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:(_program,name)=>['position','normal','cellAxis','cellId'].indexOf(name),getUniformLocation:(_program,name)=>name,createBuffer:()=>++id,createProgram:()=>++id,createShader:()=>++id},{get:(target,key)=>target[key] ?? ((...args)=>calls.push([key,...args]))});
    const saved=getSpatialVisualSettings();setSpatialVisualSettings({graphicsQuality:'medium'});
    const renderer=createSpatialSphereRenderer(gl),matrix=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),view={projectionMatrix:matrix,transform:{inverse:{matrix}}},position={x:0,y:0,z:-1},key={};
    try{
        assert.equal(Object.keys(renderer.modelBuffers).some(key=>key.startsWith('v3:')),false);
        const draw=(time,open)=>drawSpatialOrb(gl,renderer,view,position,.16,{type:'plant',model:'v3',pimoOpen:open,animationKey:key,time});
        draw(0,false);const count=id,shell=renderer.modelBuffers['v3:medium'];assert.equal(shell.stride,10);
        draw(0,false);assert.equal(id,count,'second eye does not allocate');assert.equal(renderer.livingStates.get(key).opening,0);
        for(let i=1;i<=25;i++)draw(i*.1,true);assert.equal(renderer.livingStates.get(key).opening,1);
        for(let i=26;i<=55;i++)draw(i*.1,false);assert.equal(renderer.livingStates.get(key).opening,0);
        assert.equal(id,count,'opening only changes a uniform');
        destroySpatialSphereRenderer(gl,renderer);const deleted=calls.filter(call=>call[0]==='deleteBuffer').map(call=>call[1]);
        assert.equal(new Set(deleted).size,deleted.length,'shared rim buffers deleted once');
    }finally{setSpatialVisualSettings(saved);}
});

test('tutorial V3 uses the same compact opening and returns every cell exactly home',()=>{
    const root=new THREE.Group(),orb=createWelcomeControlOrb(root),shell=orb.orbs.right.group.children[0];root.updateMatrixWorld(true);
    const input={source:{handedness:'right',gamepad:{buttons:[]}},matrix:new THREE.Matrix4().makeTranslation(...orb.orbs.right.group.position.toArray()).elements,trigger:false,down:false};
    const tick=()=>orb.update(.05,'controls-orb-open',[input]);
    try{
        assert.equal(orb.snapshot().model,'v3');assert.equal(orb.snapshot().cells,18);assert.equal(shell.children.length,18);
        tick();input.trigger=true;tick();input.trigger=false;
        for(let i=0;i<100;i++)tick();assert.equal(orb.orbs.right.snapshot().opening,1);
        for(const mesh of shell.children)assert.ok(Math.abs(mesh.position.length()-.22*.72*orb.orbs.right.snapshot().radius)<1e-7);
        input.trigger=true;tick();input.trigger=false;for(let i=0;i<100;i++)tick();
        assert.equal(orb.orbs.right.snapshot().opening,0);for(const mesh of shell.children)assert.equal(mesh.position.lengthSq(),0);
        input.trigger=true;tick();for(let i=0;i<15;i++)tick();orb.reset();
        for(const mesh of shell.children)assert.equal(mesh.position.lengthSq(),0);
    }finally{orb.destroy();}
});

test('fresh demo entry selects V3 while the global default remains Living sphere',()=>{
    const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    assert.match(source,/if\(!livingMapPreviewRecords && !refinementPreview\)\{resetSpatialVisualSettings\(\);setSpatialVisualSettings\(\{orbModel:'v3'\}\);\}/);
    assert.equal(spatialVisualDefaults().orbModel,'living');
});
