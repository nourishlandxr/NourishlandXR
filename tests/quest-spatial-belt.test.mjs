import assert from 'node:assert/strict';
import test from 'node:test';

import { isTrackedHeadsetInputSource, QUEST_SPATIAL_BELT_ACTIONS, QUEST_SPECIAL_PALETTE_ACTIONS, questSpatialBeltLayout, questSpatialBeltRayTarget, questSpatialPaletteLayout } from '../app/services/questSpatialBelt.js';
import { spatialDashboardPanelFromViewer, spatialDashboardPanelMatrix, spatialDashboardRayHit } from '../app/services/spatialDashboardMirror.js';

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
    assert.deepEqual(QUEST_SPATIAL_BELT_ACTIONS.map(action => action.id), ['plant', 'note', 'special', 'web']);
    assert.equal(layout[1].id, 'note');
    assert.ok(Math.abs(layout[1].position.y - 1.02) < .002);
    assert.ok(layout[0].position.x < layout[1].position.x);
    assert.ok(layout[3].position.x > layout[1].position.x);
    assert.ok(layout[0].position.z > layout[1].position.z);
    assert.ok(layout[0].yaw < layout[1].yaw);
    assert.ok(layout[3].yaw > layout[1].yaw);
});

test('Quest spatial belt accepts compact panel hit radii for the 3D renderer', () => {
    const viewer = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 1.6, 0, 1
    ]);
    const layout = questSpatialBeltLayout(viewer, { radius: .09, spacing: .135, curve: .035 });
    assert.equal(layout[0].radius, .09);
    assert.equal(layout[1].radius, .09);
    assert.ok(layout[0].position.z > layout[1].position.z);
});

test('Quest spatial belt resolves the first laser-hit action', () => {
    const viewer = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 1.6, 0, 1
    ]);
    const layout = questSpatialBeltLayout(viewer);
    const button = layout[1];
    const origin = { x: button.position.x, y: button.position.y, z: 0 };
    const target = questSpatialBeltRayTarget({ origin, direction: { x: 0, y: 0, z: -1 } }, layout);
    assert.equal(target?.id, 'note');
    assert.equal(target?.index, 1);
});

test('Quest special palette is a compact side surface with controller hit targets', () => {
    const viewer = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 1.6, 0, 1
    ]);
    const layout = questSpatialPaletteLayout(viewer);
    assert.equal(layout.length, QUEST_SPECIAL_PALETTE_ACTIONS.length);
    assert.equal(layout[0].id, 'totem');
    assert.equal(layout[0].position.x > 0, true);
    assert.ok(layout[1].position.y > layout[3].position.y);
    const button = layout[0];
    const target = questSpatialBeltRayTarget({
        origin: { x: button.position.x, y: button.position.y, z: 0 },
        direction: { x: 0, y: 0, z: -1 }
    }, layout);
    assert.equal(target?.id, 'totem');
});

test('Quest dashboard mirror is world locked and maps controller rays to dashboard pixels', () => {
    const viewer = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 1.6, 0, 1
    ]);
    const panel = spatialDashboardPanelFromViewer(viewer);
    assert.equal(panel.center.x, 0);
    assert.ok(Math.abs(panel.center.y - 1.57) < .0001);
    assert.equal(panel.center.z, -1.18);
    const hit = spatialDashboardRayHit({
        origin: { x: 0, y: 1.57, z: 0 },
        direction: { x: 0, y: 0, z: -1 }
    }, panel, { width: 1280, height: 900 });
    assert.ok(hit);
    assert.ok(Math.abs(hit.distance - 1.18) < .0001);
    assert.ok(Math.abs(hit.pixelX - 640) < .001);
    assert.ok(Math.abs(hit.pixelY - 450) < .001);
    const miss = spatialDashboardRayHit({
        origin: { x: 2, y: 1.57, z: 0 },
        direction: { x: 0, y: 0, z: -1 }
    }, panel, { width: 1280, height: 900 });
    assert.equal(miss, null);
    const matrix = spatialDashboardPanelMatrix(panel);
    assert.ok(Math.abs(matrix[12] - panel.center.x) < .0001);
    assert.ok(Math.abs(matrix[13] - panel.center.y) < .0001);
    assert.ok(Math.abs(matrix[14] - panel.center.z) < .0001);
});
