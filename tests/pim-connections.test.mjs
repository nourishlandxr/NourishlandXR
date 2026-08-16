import assert from 'node:assert/strict';
import test from 'node:test';

import {
    pimConnectionCurve,
    pimConnectionCurveSign,
    pimConnectionPathIsSelected,
    pimConnectionPairs,
    pimHexEdgePoint
} from '../app/services/plantInformationMeshConnections.js';

const visibleMesh = [
    ...['food-forest', 'uses', 'propagation', 'scientific-information', 'historical-data', 'cultivation']
        .map((id, index) => ({ nodeId: id, path: id, depth: 0, direction: `direction-${index}` })),
    { nodeId: 'range-and-movement', path: 'historical-data.1', parentId: 'historical-data', depth: 1, rootDirection: 'lower-right' },
    { nodeId: 'cultural-history', path: 'historical-data.2', parentId: 'historical-data', depth: 1, rootDirection: 'lower-right' },
    { nodeId: 'attributed-traditional-knowledge', path: 'historical-data.2.1', parentId: 'cultural-history', depth: 2, rootDirection: 'lower-right' }
];

test('PIM connections contain only core-to-primary and direct parent-to-child edges', () => {
    const pairs = pimConnectionPairs(visibleMesh);
    assert.equal(pairs.filter(pair => pair.parentId === 'core').length, 6);
    assert.ok(pairs.some(pair => pair.parentId === 'historical-data' && pair.childId === 'range-and-movement'));
    assert.ok(pairs.some(pair => pair.parentId === 'historical-data' && pair.childId === 'cultural-history'));
    assert.ok(pairs.some(pair => pair.parentId === 'cultural-history' && pair.childId === 'attributed-traditional-knowledge'));
    assert.equal(pairs.some(pair => pair.parentId === 'range-and-movement' && pair.childId === 'cultural-history'), false);
    assert.equal(pairs.some(pair => pair.parentId === 'historical-data' && pair.childId === 'attributed-traditional-knowledge'), false);
});

test('PIM connection geometry terminates on cell edges and uses a gentle curve', () => {
    const startCenter = { x: 100, y: 100 };
    const endCenter = { x: 220, y: 100 };
    const start = pimHexEdgePoint(startCenter, endCenter, { left: 50, top: 50, width: 100, height: 100 });
    const end = pimHexEdgePoint(endCenter, startCenter, { left: 170, top: 50, width: 100, height: 100 });
    assert.deepEqual(start, { x: 150, y: 100 });
    assert.deepEqual(end, { x: 170, y: 100 });
    assert.notDeepEqual(start, startCenter);
    assert.notDeepEqual(end, endCenter);
    const curve = pimConnectionCurve(start, end, {
        bend: .12,
        sign: pimConnectionCurveSign('historical-data', 'cultural-history')
    });
    assert.match(curve.d, /^M\s+150\s+100\s+Q/);
    assert.deepEqual(curve.end, end);
    assert.notEqual(curve.control.y, 100);
});

test('missing parents are ignored instead of becoming unrelated connections', () => {
    const pairs = pimConnectionPairs([
        { nodeId: 'known', path: 'known', depth: 0 },
        { nodeId: 'orphan', path: 'known.1', parentId: 'missing', depth: 1 }
    ]);
    assert.deepEqual(pairs.map(pair => `${pair.parentId}->${pair.childId}`), ['core->known']);
});

test('selected descendants activate only their own ancestor connection path', () => {
    const pairs = pimConnectionPairs(visibleMesh);
    const historical = pairs.find(pair => pair.parentId === 'core' && pair.childId === 'historical-data');
    const cultural = pairs.find(pair => pair.childId === 'cultural-history');
    const range = pairs.find(pair => pair.childId === 'range-and-movement');
    assert.equal(pimConnectionPathIsSelected(historical, 'historical-data.2.1'), true);
    assert.equal(pimConnectionPathIsSelected(cultural, 'historical-data.2.1'), true);
    assert.equal(pimConnectionPathIsSelected(range, 'historical-data.2.1'), false);
});
