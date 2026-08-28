import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateConceptualLayout, SAFE_BOUNDS } from '../app/services/livingMapLayout.js';

const area = (name, systemKey = '') => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, systemKey });

test('Project Map keeps Home inside the lower safe region', () => {
    const points = calculateConceptualLayout([area('Home', 'home')]);
    assert.deepEqual(points[0], { x: 50, y: 78, positionSource: 'auto', locked: false });
    assert.ok(points[0].x > SAFE_BOUNDS.left && points[0].x < SAFE_BOUNDS.right);
    assert.ok(points[0].y > SAFE_BOUNDS.top && points[0].y < SAFE_BOUNDS.bottom);
});

test('Project Map places the first area centrally and two areas beside one another', () => {
    const one = calculateConceptualLayout([area('Home', 'home'), area('Orchard')]);
    assert.deepEqual(one[1], { x: 50, y: 40, positionSource: 'auto', locked: false });

    const two = calculateConceptualLayout([area('Home', 'home'), area('Orchard'), area('Nursery')]);
    assert.deepEqual(two[1].x, 35);
    assert.deepEqual(two[2].x, 65);
    assert.equal(two[1].y, two[2].y);
});

test('Project Map layouts are deterministic and bounded at larger counts', () => {
    const areas = [area('Home', 'home'), ...Array.from({ length: 12 }, (_, index) => area(`Area ${index + 1}`))];
    const first = calculateConceptualLayout(areas);
    const second = calculateConceptualLayout(areas);
    assert.deepEqual(first, second);
    first.forEach(point => {
        assert.ok(point.x >= SAFE_BOUNDS.left && point.x <= SAFE_BOUNDS.right);
        assert.ok(point.y >= SAFE_BOUNDS.top && point.y <= SAFE_BOUNDS.bottom);
    });
});

test('Project Dashboard keeps conceptual mapping honest and relationship-driven', async () => {
    const [modelSource, screenSource] = await Promise.all([
        import('node:fs/promises').then(fs => fs.readFile(new URL('../app/services/projectDashboardV2Model.js', import.meta.url), 'utf8')),
        import('node:fs/promises').then(fs => fs.readFile(new URL('../app/screens/projectDashboardV2.js', import.meta.url), 'utf8'))
    ]);
    assert.match(modelSource, /confirmedConnections/);
    assert.match(modelSource, /conceptualLayout: true/);
    assert.match(modelSource, /geographicCoordinates: false/);
    assert.match(modelSource, /totalPlants \? Math\.round/);
    assert.match(screenSource, /Project Status/);
    assert.match(screenSource, /data-v2-status-action/);
    assert.doesNotMatch(screenSource, /Reset automatic layout/);
    assert.doesNotMatch(screenSource, /Totem alignment/);
    assert.match(screenSource, /Print and Export/);
    assert.match(screenSource, /Close Project/);
    assert.doesNotMatch(screenSource, /Conceptual layout|Spatial Readiness|SPATIAL ORGANISATION|Spatial Organization/);
    assert.doesNotMatch(screenSource, /Add Area/);
    assert.match(screenSource, /Project Map/);
    assert.match(screenSource, /data-v2-mode="content"/);
    assert.match(screenSource, /panel\.classList\.add\('field-guide-hub-redesign'\)/);
    assert.match(screenSource, /panel\.classList\.remove\('field-guide-hub-redesign'\)/);
    assert.doesNotMatch(screenSource, /data-v2-mode="activity"/);
    assert.match(screenSource, /Recent activity/);
    assert.doesNotMatch(screenSource, /Living Dashboard|Classic Dashboard|NourishlandXR V1/);
});
