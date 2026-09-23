import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('Phase 8 physical-device checklist covers the required LIM checks', () => {
    const checklist = read('docs/LIM_PHYSICAL_DEVICE_TEST.md');
    for (const phrase of [
        'portrait', 'landscape', 'bright hover outline', 'stable accent tint',
        'Selected topic and Plant views', 'Reposition', 'hero-wheel',
        'Samsung S25', 'Xiaomi device', 'Meta Quest 3', 'exact reproduction steps'
    ]) assert.match(checklist, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
});

test('temporary demo reuses opt-in AR diagnostics for LIM physical reports', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const arNote = read('app/services/arNote.js');
    for (const phrase of [
        'device-context', 'AR session start', 'root-placement', 'rendered-cells',
        'selected-cell', 'hit-target', 'companion-panel-position', 'recordArFailure'
    ]) assert.match(demo, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(arNote, /export function recordArDiagnostic/);
    assert.match(arNote, /developerDiagnostics/);
});

test('Phase 8 leaves later-phase UI out of the implementation', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    assert.doesNotMatch(demo, /Spin Sculpture|Pause Spin/);
    assert.doesNotMatch(demo, /pathway.*quiz|achievement/i);
});
