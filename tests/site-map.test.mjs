import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('dashboard Site Map renders a visual plan with areas and placed content', () => {
    const dashboard = read('app/screens/projectDashboard.js');
    const entry = read('app/components/projectEntry.js');
    const styles = read('app/style.css');

    assert.match(entry, /Site Map/);
    assert.match(dashboard, /function buildSiteMapLayout/);
    assert.match(dashboard, /site-map-canvas/);
    assert.match(dashboard, /terrace-marking\.png/);
    assert.match(dashboard, /site-map-area/);
    assert.match(dashboard, /onclick="window\.renderProjectAreaDashboard/);
    assert.match(dashboard, /window\.renderProjectDashboard/);
    assert.match(dashboard, /site-map-pin/);
    assert.match(dashboard, /site-map-pin-\$\{escapeHtml\(entry\.marker\.type\)\}/);
    assert.match(dashboard, /GPS positions are shown relative to one another/);
    assert.match(styles, /\.site-map-canvas/);
    assert.match(styles, /\.site-map-area/);
    assert.match(styles, /\.site-map-pin/);
    assert.match(styles, /\.site-map-pin::after/);
    assert.equal(fs.existsSync(path.join(root, 'app/assets/terrace-marking.png')), true);
});
