import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlantKnowledgeResolver, plantKnowledgeState, totemKnowledgeCards, totemCardsMarkup } from '../app/services/spatialKnowledgePresentation.js';
import { createPimDocument, pimAddNode, pimUpdateNode } from '../app/services/pimModel.js';
import { createOrbCrownGeometry } from '../app/services/spatialSphereRenderer.js';
import { createBeveledPrismGeometry } from '../app/services/spatialPrismRenderer.js';
import { totemCardSurfaces, hitTotemSurface } from '../app/services/spatialTotemCards.js';

test('Live availability ignores empty category shells and separates draft/visitor states',()=>{
    const resolve=createPlantKnowledgeResolver();
    const empty=createPimDocument('plant');
    assert.equal(plantKnowledgeState(empty).state,'basic');
    let document=pimAddNode(empty,{id:'care',parentId:'cultivation',title:'Care',body:'Local care',status:'draft'});
    const profile={pim_document:document};
    assert.equal(resolve(profile).label,'Draft PIM');
    assert.equal(resolve(profile,{includeDraft:false}).state,'basic');
    document=pimUpdateNode(document,'care',{status:'published'});
    profile.pim_document=document;
    assert.equal(resolve(profile,{includeDraft:false}).state,'live');
    assert.equal(resolve(profile,{expanded:true}).state,'expanded');
    assert.equal(resolve(profile,{unavailable:true}).live,false);
    assert.equal(resolve(profile,{loading:true}).state,'loading');
    assert.equal(resolve({...profile,spm_enabled:false}).live,false);
});

test('Totem cards derive current knowledge without changing node identity or source records',()=>{
    const document=pimAddNode(createPimDocument('plant'),{id:'observed',parentId:'food-forest',title:'New shoots',body:'Observed beside the path',informationType:'local_observation',status:'draft'});
    const source=JSON.stringify(document);
    const plants=[{id:'plant-1',name:'Pigeon Pea',knowledge:{...plantKnowledgeState(document),document}}];
    const first=totemKnowledgeCards({title:'Garden',plants});
    assert.equal(first[1].title,'1 Live / 1 plant');
    assert.deepEqual(first[1].references,['plant-1']);
    assert.equal(first[2].eyebrow,'LOCAL OBSERVATION');
    assert.match(first[2].body,/Pigeon Pea/);
    const next=totemKnowledgeCards({title:'Garden',plants,notes:[{id:'note',title:'Rain',body:'New observation'}]});
    assert.equal(next[2].title,'Rain');
    assert.equal(JSON.stringify(document),source);
    assert.ok(!totemCardsMarkup(totemKnowledgeCards({title:'<script>bad</script>'}),'area').includes('<script>'));
});

test('Beveled geometry has outward unit normals and no degenerate faces',()=>{
    const geometry=createBeveledPrismGeometry();
    for(let i=0;i<geometry.length;i+=18) {
        const a=geometry.slice(i,i+3),b=geometry.slice(i+6,i+9),c=geometry.slice(i+12,i+15),n=geometry.slice(i+3,i+6);
        const u=b.map((x,k)=>x-a[k]),v=c.map((x,k)=>x-a[k]);
        const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        assert.ok(Math.hypot(...cross)>1e-6);
        assert.ok(Math.abs(Math.hypot(...n)-1)<1e-5);
        assert.ok(n.reduce((sum,x,k)=>sum+x*(a[k]+b[k]+c[k])/3,0)>0);
    }
    const crown=createOrbCrownGeometry();
    assert.ok(crown.indices.every(i=>i<crown.vertices.length/6));
    assert.ok(crown.vertices.every(Number.isFinite));
});

test('Spatial card hit regions stay separate and detail closes independently',()=>{
    const cards=totemKnowledgeCards(),right={x:1,z:0};
    const surfaces=totemCardSurfaces({x:0,y:0,z:-2},right,cards,'plants');
    for(const surface of surfaces) {
        const hit=hitTotemSurface({origin:{x:surface.center.x,y:surface.center.y,z:0},direction:{x:0,y:0,z:-1}},surfaces);
        assert.equal(hit.card.id,surface.card.id);
        assert.equal(hit.detail,surface.detail);
    }
    assert.equal(hitTotemSurface({origin:{x:0,y:0,z:0},direction:{x:0,y:0,z:1}},surfaces),null);
});
