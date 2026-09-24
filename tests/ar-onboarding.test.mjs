import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    renderArIntroductionPreparation,
    shouldSkipArIntroductionPreparation,
    skipArIntroductionPreparation
} from '../app/services/arOnboarding.js';

function memoryStorage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value))
    };
}

test('AR introduction preparation can be dismissed on a device', () => {
    const storage = memoryStorage();
    assert.equal(shouldSkipArIntroductionPreparation(storage), false);
    skipArIntroductionPreparation(storage);
    assert.equal(shouldSkipArIntroductionPreparation(storage), true);
});

test('AR introduction preparation explains supported devices and the limited desktop preview', () => {
    const app = { innerHTML: '', querySelector: () => null };
    renderArIntroductionPreparation(app);
    assert.match(app.innerHTML, /designed for spatial devices and mobile phones/);
    assert.match(app.innerHTML, /limited desktop preview/);
    assert.match(app.innerHTML, /Desktop preview does not need a camera/);
    assert.match(app.innerHTML, /Camera and tracking/);
    assert.match(app.innerHTML, /Begin introduction/);
    assert.doesNotMatch(app.innerHTML, /Quest/);
    assert.match(app.innerHTML, /Don’t show this preparation next time/);
    assert.match(app.innerHTML, /data-ar-introduction-continue/);
});

test('homepage AR introduction checks the remembered preference before starting WebXR', () => {
    const source = fs.readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    const entry = source.slice(source.indexOf('export function openTemporaryArDemoWindow'), source.indexOf('export async function startTemporaryArDemo'));
    assert.match(entry, /shouldSkipArIntroductionPreparation\(\)/);
    assert.match(entry, /renderArIntroductionPreparation/);
    assert.ok(entry.indexOf('shouldSkipArIntroductionPreparation()') < entry.indexOf('startTemporaryArDemo(app)'));
});
