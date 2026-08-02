import assert from 'node:assert/strict';
import test from 'node:test';

import { pimKnowledgeNodes, pimNodeChildren, pimToggleExpandedPaths, pimVisibleNodes } from '../app/services/plantInformationMesh.js';

const knowledge = {
    title: 'Pigeon Pea',
    left: [
        ['USES', 'Food · soil · biomass'],
        ['ORIGIN', 'South Asia · tropical regions'],
        ['STORY', 'Food · habitat · resilience']
    ],
    right: [
        ['CLIMATE', 'Tropical · subtropical'],
        ['SOIL', 'Nitrogen fixing · mulch'],
        ['ROLE', 'Support species · living hedge']
    ]
};

test('PIM creates stable root cells and deterministic child petals', () => {
    const roots = pimKnowledgeNodes(knowledge);
    assert.deepEqual(roots.map(node => node.path), ['left-0', 'left-1', 'left-2', 'right-0', 'right-1', 'right-2']);
    assert.deepEqual(pimNodeChildren(roots[0]).map(node => node.label), ['USES 1', 'USES 2', 'USES 3']);
    const firstOpen = pimVisibleNodes(knowledge, ['left-0']);
    const secondOpen = pimVisibleNodes(knowledge, ['left-0']);
    assert.deepEqual(firstOpen.map(node => node.path), secondOpen.map(node => node.path));
    assert.ok(firstOpen.some(node => node.path === 'left-0.1'));
    assert.ok(!firstOpen.some(node => node.path === 'right-0.1'));
});

test('PIM expansion preserves independent branches and collapses descendants only', () => {
    let expanded = pimToggleExpandedPaths([], 'left-0');
    expanded = pimToggleExpandedPaths(expanded, 'right-0');
    assert.deepEqual(new Set(expanded), new Set(['left-0', 'right-0']));
    expanded = pimToggleExpandedPaths(expanded, 'left-0.1');
    assert.ok(expanded.includes('right-0'));
    expanded = pimToggleExpandedPaths(expanded, 'left-0');
    assert.ok(!expanded.some(path => path === 'left-0' || path.startsWith('left-0.')));
    assert.ok(expanded.includes('right-0'));
});
