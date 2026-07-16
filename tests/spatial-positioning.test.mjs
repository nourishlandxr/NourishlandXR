import assert from 'node:assert/strict';
import test from 'node:test';
import { reconstructGpsMarker } from '../app/services/spatialPositioning.js';

test('reconstructs a saved GPS marker in front when the user faces its true bearing', () => {
    const start = { latitude: -28.6912, longitude: 153.0029, accuracy: 4 };
    const current = { ...start, accuracy: 3 };
    const marker = { latitude: -28.6911053, longitude: 153.003029, accuracy: 3.5 };
    const northFacing = reconstructGpsMarker(start, current, marker, 0);
    const aligned = reconstructGpsMarker(start, current, marker, northFacing.bearing);
    assert.ok(aligned.distance > 10 && aligned.distance < 20);
    assert.ok(Math.abs(aligned.x) < 0.05);
    assert.ok(aligned.z < -10);
    assert.ok(aligned.uncertainty > 5);
});
