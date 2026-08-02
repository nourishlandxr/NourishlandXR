import assert from 'node:assert/strict';
import test from 'node:test';

import { isTrackedHeadsetInputSource, QUEST_SPATIAL_BELT_ACTIONS, questSpatialBeltLayout, questSpatialBeltRayTarget } from '../app/services/questSpatialBelt.js';

test('tracked headset input identifies Quest controls without classifying phone touch input', () => {
    assert.equal(isTrackedHeadsetInputSource({ targetRayMode: 'tracked-pointer' }), true);
    assert.equal(isTrackedHeadsetInputSource({ targetRayMode: 'screen' }), false);
    assert.equal(isTrackedHeadsetInputSource({ hand: new Map() }), true);
    assert.equal(isTrackedHeadsetInputSource(null), false);
});

test('Quest spatial belt stays in a shallow waist-level arc in front of the viewer', () => {
    const viewer = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 1.6, 0, 1
    ]);
    const layout = questSpatialBeltLayout(viewer);
    assert.equal(layout.length, QUEST_SPATIAL_BELT_ACTIONS.length);
    assert.equal(layout[3].id, 'view');
    assert.ok(Math.abs(layout[3].position.y - 1.02) < .0001);
    assert.ok(layout[0].position.x < layout[3].position.x);
    assert.ok(layout[6].position.x > layout[3].position.x);
    assert.ok(layout[0].position.z > layout[3].position.z);
});

test('Quest spatial belt resolves the first laser-hit action', () => {
    const viewer = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 1.6, 0, 1
    ]);
    const layout = questSpatialBeltLayout(viewer);
    const button = layout[3];
    const origin = { x: button.position.x, y: button.position.y, z: 0 };
    const target = questSpatialBeltRayTarget({ origin, direction: { x: 0, y: 0, z: -1 } }, layout);
    assert.equal(target?.id, 'view');
    assert.equal(target?.index, 3);
});
