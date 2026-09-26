import test from 'node:test';
import assert from 'node:assert/strict';
import { createPimDocument } from '../app/services/pimModel.js';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';
import { createMeshRepository } from '../app/services/meshRepository.js';
import { canonicalMeshRef, createMeshSourceResolver, derivedMeshRef, limMeshRef, meshRefKey, pimMeshRef } from '../app/services/meshReferences.js';
import { createPlaceholderKnowledgeGenerator } from '../app/services/meshGenerator.js';
import { createMeshRelationshipService, meshHash } from '../app/services/meshRelationships.js';
import { createMeshCompositionState } from '../app/services/meshCompositionState.js';

function fixture(){
    const repository=createMeshRepository(),resolver=createMeshSourceResolver({repository}),generator=createPlaceholderKnowledgeGenerator();
    resolver.registerPimDocument(PIGEON_PEA_PIM,{ownerId:'demo-pigeon-pea'});
    return {repository,resolver,generator,service:createMeshRelationshipService({repository,resolver,generator,now:()=> '2026-09-26T00:00:00.000Z'}),
        living:limMeshRef('lim-food-forest'),place:limMeshRef('lim-pin'),wildlife:limMeshRef('lim-wildlife-relationships'),
        pruning:pimMeshRef(PIGEON_PEA_PIM,'pruning',{ownerId:'demo-pigeon-pea'})};
}

test('canonicalizes a LIM reference by stable node ID',async()=>{
    assert.equal(meshRefKey(limMeshRef('lim-food-forest')),'mesh:v1:lim:lim-food-forest');
    assert.equal(await meshHash('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('qualifies unclassified PIM knowledge to document scope',()=>{
    const {pruning}=fixture();
    assert.deepEqual(pruning,{version:1,kind:'pim',scope:'document',plantId:'cajanus-cajan',nodeId:'pruning',documentId:'cajanus-cajan-pim',ownerId:'demo-pigeon-pea'});
});

test('canonicalizes a derived reference by node ID',()=>{
    assert.equal(meshRefKey(derivedMeshRef('knowledge-1')),'mesh:v1:derived:knowledge-1');
});

test('deduplicates repeated sources when at least two unique sources remain',async()=>{
    const f=fixture(),result=await f.service.resolve([f.living,f.place,f.living]);
    assert.equal(result.relationship.sources.length,2);
});

test('requires at least two unique sources',async()=>{
    const f=fixture();
    await assert.rejects(f.service.resolve([f.living,f.living]),/at least two unique sources/);
    await assert.rejects(f.service.resolve([f.living]),/at least two unique sources/);
});

test('relationship identity is independent of source order',async()=>{
    const f=fixture(),first=await f.service.resolve([f.living,f.place]),second=await f.service.resolve([f.place,f.living]);
    assert.equal(first.relationship.signature,second.relationship.signature);
    assert.equal(first.relationship.id,second.relationship.id);
});

test('three sources create one semantic relationship',async()=>{
    const f=fixture(),result=await f.service.resolve([f.pruning,f.living,f.place]);
    assert.equal(f.repository.listRelationships().length,1);
    assert.equal(result.relationship.sources.length,3);
    assert.equal(result.derivedNode.title,'Observing the Effects of Pruning');
});

test('general context has stable variant identity',async()=>{
    const f=fixture(),first=await f.service.resolve([f.pruning,f.living]),second=await f.service.resolve([f.living,f.pruning],{context:{mode:'general'}});
    assert.equal(first.variant.id,second.variant.id);
});

test('contextual selectors create a distinct variant identity',async()=>{
    const f=fixture(),general=await f.service.resolve([f.pruning,f.living]),contextual=await f.service.resolve([f.pruning,f.living],{context:{mode:'contextual',scope:{projectId:'Banyula',areaId:'Finger Lime Row'},material:{goalIds:[],observationRefs:[]}}});
    assert.notEqual(general.variant.id,contextual.variant.id);
});

test('general and contextual variants share one base relationship',async()=>{
    const f=fixture(),general=await f.service.resolve([f.pruning,f.living]),contextual=await f.service.resolve([f.living,f.pruning],{context:{mode:'contextual',scope:{projectId:'Banyula',areaId:'Finger Lime Row'}}});
    assert.equal(general.relationship.id,contextual.relationship.id);
    assert.equal(f.repository.listRelationships().length,1);
    assert.equal(f.repository.listVariants().length,2);
    assert.equal(f.repository.listDerivedNodes().length,2);
});

test('repeated resolution reuses the cached derived node',async()=>{
    const f=fixture(),first=await f.service.resolve([f.pruning,f.living]),second=await f.service.resolve([f.living,f.pruning]);
    assert.equal(first.cached,false);assert.equal(second.cached,true);assert.equal(first.derivedNode,second.derivedNode);
});

test('placeholder generator is invoked once for repeated resolution',async()=>{
    const f=fixture();await f.service.resolve([f.pruning,f.living]);await f.service.resolve([f.living,f.pruning]);
    assert.equal(f.generator.callCount,1);
});

test('derived knowledge resolves as a neutral source',async()=>{
    const f=fixture(),first=await f.service.resolve([f.pruning,f.living]),resolved=f.resolver.resolve(first.derivedRef);
    assert.equal(resolved.title,'Pruning as Biomass Cycling');
    assert.equal(resolved.scope,'derived');
});

test('derived knowledge can be chained into a new relationship',async()=>{
    const f=fixture(),first=await f.service.resolve([f.pruning,f.living]),second=await f.service.resolve([first.derivedRef,f.wildlife]);
    assert.equal(second.derivedNode.title,'Biomass Cycling as Wildlife Habitat');
    assert.equal(second.derivedNode.provenance.depth,2);
});

test('curated pruning relationship chains into Watch What Changes',async()=>{
    const f=fixture(),first=await f.service.resolve([f.pruning,f.living]),second=await f.service.resolve([first.derivedRef,f.place]);
    assert.equal(second.derivedNode.title,'Watch What Changes');
    assert.match(second.derivedNode.summary,/regrowth/);
    assert.equal(second.derivedNode.provenance.depth,2);
});

test('rejects a circular derived dependency',async()=>{
    const f=fixture(),id='circular-derived';
    f.repository.putDerivedNode(Object.freeze({id,title:'Circular',summary:'Invalid cycle',revision:1,provenance:{depth:1,sourceRefs:[derivedMeshRef(id)]}}));
    await assert.rejects(f.service.resolve([derivedMeshRef(id),f.living]),/Circular derived dependency/);
});

test('rejects derivation deeper than three generations',async()=>{
    const f=fixture();
    const first=await f.service.resolve([f.pruning,f.living]);
    const second=await f.service.resolve([first.derivedRef,f.place]);
    const third=await f.service.resolve([second.derivedRef,f.wildlife]);
    await assert.rejects(f.service.resolve([third.derivedRef,limMeshRef('lim-climate')]),/cannot exceed 3/);
});

test('PIM node IDs cannot collide across document and plant identity',()=>{
    const f=fixture(),other=createPimDocument({id:'other-pruning-pim',plantId:'other-plant',identity:{commonName:'Other Plant'},nodes:[{id:'pruning',title:'Pruning',informationType:'guidance'}],now:'2026-09-26T00:00:00.000Z'});
    f.resolver.registerPimDocument(other,{ownerId:'other-owner'});
    const otherRef=pimMeshRef(other,'pruning',{ownerId:'other-owner'});
    assert.notEqual(meshRefKey(f.pruning),meshRefKey(otherRef));
    assert.equal(f.resolver.resolve(otherRef).title,'Other Plant — Pruning');
    const mismatched=canonicalMeshRef({...f.pruning,documentId:'other-pruning-pim'});
    assert.throws(()=>f.resolver.resolve(mismatched),/Unresolved PIM reference/);
});

test('navigation focus stays separate from explicit composition state',()=>{
    const state=createMeshCompositionState(),living=limMeshRef('lim-food-forest'),place=limMeshRef('lim-pin');
    state.setActiveRef(living);
    assert.equal(state.get().compositionRefs.length,0);
    assert.equal(state.get().mode,'idle');
    state.add();state.setActiveRef(place);state.add();
    assert.equal(state.get().compositionRefs.length,2);
    assert.equal(state.get().mode,'composing');
    state.remove(living);assert.deepEqual(state.get().compositionRefs,[place]);
    state.clear();assert.equal(state.get().compositionRefs.length,0);
});
