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

test('visitor project selection proceeds directly to the location experience', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/explorer.js'), 'utf8');
    assert.doesNotMatch(source, /<span>Open visitor welcome<\/span>/);
    assert.match(source, /renderVisitorLocationExperience/);
});

test('temporary AR demo is in-memory and supports placement, profile and exit', () => {
    const source = fs.readFileSync(path.join(root, 'app/screens/temporaryArDemo.js'), 'utf8');
    assert.match(source, /Lemon Drop Garcinia/);
    assert.match(source, /Place Sample Plant/);
    assert.match(source, /View Plant Profile/);
    assert.match(source, /Finish Demo/);
    assert.match(source, /Launch AR Demo/);
    assert.match(source, /temporary-demo-launcher/);
    assert.match(source, /isSessionSupported\('immersive-ar'\)/);
    assert.match(source, /makeXRCompatible/);
    assert.match(source, /new XRWebGLLayer/);
    assert.match(source, /requestAnimationFrame\(draw\)/);
    assert.doesNotMatch(source, /persistence|apiFetch|fetch\(/);
});
