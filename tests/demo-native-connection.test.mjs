import test from 'node:test';
import assert from 'node:assert/strict';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';
import { LIM_CELL_BY_ID } from '../app/services/limLearning.js';
import { demoNativeConnectionSpec, demoNativeTargetLineage, createDemoNativeConnection, acceptDemoNativeSource, beginDemoNativeTarget, finishDemoNativeConnection, retryDemoNativeTarget } from '../app/services/demoNativeConnection.js';
import { welcomeExperienceFrames, welcomeCellAtPoint } from '../app/services/arWelcomeShowcase.js';
import { demoWelcomeSurfaceHit } from '../app/services/demoWelcomeHit.js';
import { demoBillboardTextureLocalPoint } from '../app/features/ar-demo/demoGeometry.js';
import { createMeshRepository } from '../app/services/meshRepository.js';
import { createMeshSourceResolver, limMeshRef, pimMeshRef } from '../app/services/meshReferences.js';
import { createPlaceholderKnowledgeGenerator } from '../app/services/meshGenerator.js';
import { createMeshRelationshipService } from '../app/services/meshRelationships.js';

test('guided connection names and IDs come from authored PIMO and LIMO cells', () => {
    const spec = demoNativeConnectionSpec(PIGEON_PEA_PIM, LIM_CELL_BY_ID);
    assert.equal(spec.sourceTitle, 'Food Forest');
    assert.equal(spec.targetTitle, 'Living Landscapes');
    assert.equal(PIGEON_PEA_PIM.nodes.find(node => node.id === spec.sourceId)?.path || spec.sourceId, spec.sourcePath);
    assert.equal(LIM_CELL_BY_ID[spec.targetId]?.title, spec.targetTitle);
});

test('guided LIMO target becomes visible and ray-selectable after opening its authored ancestors',()=>{
    const spec=demoNativeConnectionSpec(PIGEON_PEA_PIM,LIM_CELL_BY_ID);
    const raw=welcomeExperienceFrames(64000,false);
    const lineage=demoNativeTargetLineage(raw,spec.targetId);
    assert.ok(lineage);
    assert.equal(raw.flatMap(frame=>frame.nodes).find(node=>node.key===lineage.key)?.opacity,0,'old target was invisible');
    const frames=welcomeExperienceFrames(64000,false,undefined,undefined,{
        cellsActivatedAt:0,
        expandedLimIds:lineage.ancestors,
        expandedAt:Object.fromEntries(lineage.ancestors.map(id=>[id,0]))
    });
    const target=frames.flatMap(frame=>frame.nodes).find(node=>node.key===lineage.key);
    assert.ok(target.opacity>.5);
    const local=demoBillboardTextureLocalPoint(target.x,target.y,2500,2100);
    const hit=demoWelcomeSurfaceHit({origin:{x:local.x*10,y:local.y*21,z:1},direction:{x:0,y:0,z:-1}},
        {center:{x:0,y:0,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1},width:4,height:3.36});
    assert.equal(welcomeCellAtPoint(frames,hit.pixelX,hit.pixelY)?.key,lineage.key);
});

test('connection requires the real source then the real target, and retries a failed resolution', () => {
    const state = createDemoNativeConnection(demoNativeConnectionSpec(PIGEON_PEA_PIM, LIM_CELL_BY_ID));
    assert.equal(beginDemoNativeTarget(state, state.targetId), false);
    assert.equal(acceptDemoNativeSource(state, 'uses'), false);
    assert.equal(acceptDemoNativeSource(state, state.sourcePath), true);
    assert.equal(acceptDemoNativeSource(state, state.sourcePath), false);
    assert.equal(beginDemoNativeTarget(state, 'lim-plant'), false);
    assert.equal(beginDemoNativeTarget(state, state.targetId), true);
    assert.equal(retryDemoNativeTarget(state, 'Try again'), true);
    assert.equal(state.phase, 'target');
    assert.equal(beginDemoNativeTarget(state, state.targetId), true);
    assert.equal(finishDemoNativeConnection(state, { relationship: { id: 'one-link' } }), true);
    assert.equal(beginDemoNativeTarget(state, state.targetId), false);
    assert.equal(state.result.relationship.id, 'one-link');
});

test('the authored cells resolve to one stable relationship without altering either mesh', async () => {
    const spec = demoNativeConnectionSpec(PIGEON_PEA_PIM, LIM_CELL_BY_ID);
    const repository = createMeshRepository();
    const resolver = createMeshSourceResolver({ repository });
    resolver.registerPimDocument(PIGEON_PEA_PIM, { ownerId: 'guided-pigeon-pea' });
    const service = createMeshRelationshipService({ repository, resolver, generator: createPlaceholderKnowledgeGenerator() });
    const source = pimMeshRef(PIGEON_PEA_PIM, spec.sourceId, { ownerId: 'guided-pigeon-pea' });
    const target = limMeshRef(spec.targetId);
    const first = await service.resolve([source, target]);
    const second = await service.resolve([source, target]);
    assert.equal(first.relationship.id, second.relationship.id);
    assert.equal(repository.listRelationships().length, 1);
    assert.equal(PIGEON_PEA_PIM.nodes.find(node => node.id === spec.sourceId)?.title, spec.sourceTitle);
    assert.equal(LIM_CELL_BY_ID[spec.targetId]?.title, spec.targetTitle);
});
