import test from 'node:test';
import assert from 'node:assert/strict';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';
import { LIM_CELL_BY_ID } from '../app/services/limLearning.js';
import { demoNativeConnectionSpec, createDemoNativeConnection, acceptDemoNativeSource, beginDemoNativeTarget, finishDemoNativeConnection, retryDemoNativeTarget } from '../app/services/demoNativeConnection.js';
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
