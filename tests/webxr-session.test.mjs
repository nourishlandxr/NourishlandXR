import assert from 'node:assert/strict';
import test from 'node:test';

import { selectWebXRSessionMode } from '../app/services/webxrSession.js';

test('WebXR prefers passthrough AR and falls back to native 6DoF immersive mode', () => {
    assert.equal(selectWebXRSessionMode({ 'immersive-ar': true, 'immersive-vr': true }), 'immersive-ar');
    assert.equal(selectWebXRSessionMode({ 'immersive-ar': false, 'immersive-vr': true }), 'immersive-vr');
    assert.equal(selectWebXRSessionMode({ 'immersive-ar': false, 'immersive-vr': false }), '');
});

test('shared WebXR session service retains both Quest and phone modes', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(new URL('../app/services/webxrSession.js', import.meta.url), 'utf8');
    assert.match(source, /isSessionSupported\('immersive-ar'\)/);
    assert.match(source, /isSessionSupported\('immersive-vr'\)/);
    assert.match(source, /requestSession\('immersive-ar'/);
    assert.match(source, /requestSession\('immersive-vr'/);
    assert.match(source, /requiredFeatures: \['hit-test'\], optionalFeatures: \['dom-overlay', 'local-floor'\]/);
    assert.match(source, /requiredFeatures: \[\], optionalFeatures: \[\]/);
    assert.match(source, /passthrough: mode === 'immersive-ar' && blendMode !== 'opaque'/);
});
