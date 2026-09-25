import test from 'node:test';
import assert from 'node:assert/strict';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';
import { LIM_INTRO_CELL_BY_ID } from '../app/services/limLearning.js';
import { PIM_LIM_BRIDGE_GROUPS, defaultPimLimBridge, pimLimBridgeFor } from '../app/services/pimLimBridge.js';

test('seed knowledge bridges from a PIM fact into place, growth, purpose and decision cells', () => {
    const bridge = pimLimBridgeFor(PIGEON_PEA_PIM, 'seed-saving');
    assert.equal(bridge.id, 'seed-purpose');
    assert.equal(bridge.sourceTitle, 'Seed saving');
    assert.match(bridge.question, /What good could that do in this place/);
    assert.deepEqual(bridge.limIds, [
        'lim-intro-analysis-landscape',
        'lim-intro-literacy-grow',
        'lim-intro-food-function',
        'lim-intro-smart-decisions'
    ]);
});

test('a child PIM fact inherits the nearest useful bridge from its parent branch', () => {
    const bridge = pimLimBridgeFor(PIGEON_PEA_PIM, 'storage-check');
    assert.equal(bridge.id, 'seed-purpose');
    assert.equal(bridge.sourceTitle, 'Storage check');
});

test('every authored PIM to LIM bridge points to a real introductory learning cell', () => {
    for (const bridge of PIM_LIM_BRIDGE_GROUPS) {
        assert.equal(bridge.limIds.length, 4);
        for (const id of bridge.limIds) assert.ok(LIM_INTRO_CELL_BY_ID[id], `${bridge.id} references missing ${id}`);
    }
});

test('the guided demo has a stable seed-purpose bridge and leaves unrelated facts unforced', () => {
    assert.equal(defaultPimLimBridge(PIGEON_PEA_PIM)?.id, 'seed-purpose');
    assert.equal(pimLimBridgeFor(PIGEON_PEA_PIM, 'accepted-botanical-name'), null);
});
