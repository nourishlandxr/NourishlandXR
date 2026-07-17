import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { renderLaunchScreen } from '../app/screens/launch.js';

const root = path.resolve(import.meta.dirname, '..');

test('welcome keeps Create and Explore and adds the account-free AR demo', () => {
    const app = { innerHTML: '' };
    renderLaunchScreen(app);
    assert.match(app.innerHTML, /Create an Experience/);
    assert.match(app.innerHTML, /Explore a Place/);
    assert.match(app.innerHTML, /TRY IT NOW/);
    assert.match(app.innerHTML, /No account or project setup required/);
    assert.match(app.innerHTML, /openTemporaryArDemoWindow/);
    assert.match(app.innerHTML, /assets\/herov2\.png/);
});

test('visitor project selection opens the welcome page without a repeated card action', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/explorer.js'), 'utf8');
    assert.doesNotMatch(source, /<span>Explore this location<\/span>/i);
    assert.match(source, /renderVisitorLocationIntro/);
    assert.match(source, /Explore in AR/);
    assert.match(source, /Browse Content/);
});

test('AR entry is gated by preparation and only Start AR Mode launches AR', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/explorer.js'), 'utf8');
    assert.match(source, /NourishlandXR uses your phone’s camera/);
    assert.match(source, /When prompted, please allow access to your camera and location/);
    assert.match(source, />Start AR Mode</);
    assert.match(source, />Go Back</);
});

test('creator dashboard exposes quick add, browse, V2 stories and project settings', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/projectDashboard.js'), 'utf8');
    assert.match(source, /Dive straight into AR/);
    assert.match(source, /Add without AR/);
    assert.match(source, /Stories and Focus Elements/);
    assert.match(source, /Project Settings/);
    assert.match(source, /Manage entrances and experience starting points/);
});

test('temporary AR demo is in-memory and supports placement, profile and exit', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/temporaryArDemo.js'), 'utf8');
    assert.match(source, /Open My Location Dashboard/);
    assert.match(source, /My Location/);
    assert.match(source, /Tag a Nearby Plant/);
    assert.match(source, /Plant List/);
    assert.match(source, /Banana Cavendish/);
    assert.match(source, /Lemon Drop Garcinia/);
    assert.match(source, /Myoga Ginger/);
    assert.match(source, /Jackfruit/);
    assert.match(source, /This is the end of the demo/);
    assert.match(source, /Finish Demo/);
    assert.match(source, /AUGMENTED REALITY/);
    assert.match(source, /temporary-demo-launcher/);
    assert.match(source, /isSessionSupported\('immersive-ar'\)/);
    assert.match(source, /makeXRCompatible/);
    assert.match(source, /new XRWebGLLayer/);
    assert.match(source, /requestAnimationFrame\(draw\)/);
    assert.match(source, /requiredFeatures: \['dom-overlay', 'hit-test'\]/);
    assert.match(source, /requestHitTestSource/);
    assert.match(source, /placedMarker = \{ x: latestHitMatrix/);
    assert.doesNotMatch(source, /persistence|apiFetch|fetch\(/);
});
