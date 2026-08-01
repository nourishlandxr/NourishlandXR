import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { selectWebXRSessionMode } from '../app/services/webxrSession.js';
import { controllerRayFromPose, XR_LASER_POINTER_CONFIG } from '../app/services/xrPointer.js';

test('WebXR prefers passthrough AR and falls back to native 6DoF immersive mode', () => {
    assert.equal(selectWebXRSessionMode({ 'immersive-ar': true, 'immersive-vr': true }), 'immersive-ar');
    assert.equal(selectWebXRSessionMode({ 'immersive-ar': false, 'immersive-vr': true }), 'immersive-vr');
    assert.equal(selectWebXRSessionMode({ 'immersive-ar': false, 'immersive-vr': false }), '');
});

test('shared WebXR session service retains both Quest and phone modes', async () => {
    const source = readFileSync(new URL('../app/services/webxrSession.js', import.meta.url), 'utf8');
    assert.match(source, /isSessionSupported\('immersive-ar'\)/);
    assert.match(source, /isSessionSupported\('immersive-vr'\)/);
    assert.match(source, /requestSession\('immersive-ar'/);
    assert.match(source, /requestSession\('immersive-vr'/);
    assert.match(source, /requiredFeatures: \['hit-test'\], optionalFeatures: \['dom-overlay', 'local-floor'\]/);
    assert.match(source, /requiredFeatures: \[\], optionalFeatures: \[\]/);
    assert.match(source, /requireDomOverlay = false/);
    assert.match(source, /session\.domOverlayState/);
    assert.match(source, /passthrough: mode === 'immersive-ar' && blendMode !== 'opaque'/);
});

test('Quest laser pointer configuration is shared by immersive modes', () => {
    const arSource = readFileSync(new URL('../app/screens/arMode.js', import.meta.url), 'utf8');
    const demoSource = readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    assert.match(arSource, /from '\.\.\/services\/xrPointer\.js'/);
    assert.match(demoSource, /from '\.\.\/services\/xrPointer\.js'/);
    const ray = controllerRayFromPose({ transform: { matrix: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        1, 2, 3, 1
    ] } }, 'right');
    assert.deepEqual(ray.origin, { x: 1, y: 2, z: 3 });
    assert.deepEqual(ray.direction, { x: -0, y: -0, z: -1 });
    assert.equal(ray.handedness, 'right');
    assert.equal(XR_LASER_POINTER_CONFIG.length, 5);
    assert.equal(XR_LASER_POINTER_CONFIG.dotRadius, 0.07);
});
