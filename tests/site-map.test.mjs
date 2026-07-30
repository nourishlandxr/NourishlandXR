import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Field Guide Map renders a site map with areas and placed content', () => {
    const dashboard = read('app/screens/projectDashboard.js');
    const fieldGuide = read('app/screens/fieldGuide.js');
    const styles = read('app/style.css');

    assert.match(fieldGuide, /<strong>Map<\/strong>/);
    assert.match(dashboard, /function buildSiteMapLayout/);
    assert.match(dashboard, /site-map-canvas/);
    assert.match(dashboard, /terrace-marking\.png/);
    assert.match(dashboard, /project\.id === 'Hillyards'/);
    assert.match(dashboard, /test loaded data/i);
    assert.match(dashboard, /buildSiteMapLayout\(visiblePlaces, mapEntries, usesHillyardsPlan, siteMap\.areaPoints \|\| \{\}\)/);
    assert.match(dashboard, /site-map-generic-surface/);
    assert.match(dashboard, /Upload map photo/);
    assert.match(dashboard, /beginSiteMapAreaLink/);
    assert.match(dashboard, /placeLinkedAreaOnSiteMap/);
    assert.match(dashboard, /compressedMapImage/);
    assert.match(dashboard, /siteMap: \{/);
    assert.match(dashboard, /site-map-area/);
    assert.match(dashboard, /onclick="window\.renderProjectAreaDashboard/);
    assert.match(dashboard, /window\.renderProjectDashboard/);
    assert.match(dashboard, /site-map-pin/);
    assert.match(dashboard, /TERRACE_PLAN_POINTS/);
    assert.match(dashboard, /'1R1': \{ x: 12, y: 89 \}/);
    assert.match(dashboard, /is-plan-linked/);
    assert.match(dashboard, /site-map-pin-\$\{escapeHtml\(entry\.marker\.type\)\}/);
    assert.match(dashboard, /GPS positions are shown relative to one another/);
    assert.match(styles, /\.site-map-canvas/);
    assert.match(styles, /\.site-map-generic-surface/);
    assert.match(styles, /\.site-map-canvas\.is-linking-area/);
    assert.match(styles, /\.site-map-area/);
    assert.match(styles, /\.site-map-pin/);
    assert.match(styles, /\.site-map-pin::after/);
    assert.match(styles, /\.site-map-pin \{[\s\S]*width: 3px; height: 3px/);
    assert.match(styles, /\.site-map-area \{[\s\S]*background: rgba\(11,45,25,.26\)/);
    assert.equal(fs.existsSync(path.join(root, 'app/assets/terrace-marking.png')), true);
});
