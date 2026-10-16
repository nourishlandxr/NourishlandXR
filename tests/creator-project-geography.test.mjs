import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProjectGeographicOrigin, normalizeProjectGeographicOriginInputs, projectOriginKey, projectMapBounds, withProjectGeographicOrigin,
    loadProjectMapInformation, withProjectMapInformation, projectGeographicMapContext } from '../app/services/creatorProjectGeography.js';

const origin = { latitude: -33.8, longitude: 151.1, source: 'manual' };
const sample = { features: [{ attributes: { elevation: 120 }, geometry: { paths: [[[151.09, -33.8], [151.11, -33.8]]] } }], source: 'https://example.test/contours' };

test('one geographic origin validates coordinates without rejecting zero or accepting empty/coerced inputs', () => {
    assert.equal(projectOriginKey({ latitude: 0, longitude: '0' }), '0,0');
    for (const value of ['', ' ', null, undefined, NaN, Infinity, true, []]) {
        assert.throws(() => normalizeProjectGeographicOrigin({ latitude: value, longitude: 0 }));
    }
    assert.throws(() => normalizeProjectGeographicOrigin({ latitude: 91, longitude: 0 }));
    assert.throws(() => normalizeProjectGeographicOrigin({ latitude: 0, longitude: -181 }));
    assert.throws(() => normalizeProjectGeographicOrigin({ ...origin, accuracyMetres: -1 }));
});

test('origin form inputs reject blanks before numeric coercion and preserve device metadata only when unchanged', () => {
    assert.throws(() => normalizeProjectGeographicOriginInputs('', '0'), /Enter both latitude and longitude/);
    assert.throws(() => normalizeProjectGeographicOriginInputs('  ', '-1'), /Enter both latitude and longitude/);
    assert.deepEqual(normalizeProjectGeographicOriginInputs('0', '0'), {
        latitude: 0, longitude: 0, source: 'manual', accuracyMetres: null,
        capturedAt: assert.match.any
    });
    const previous = { latitude: -28.4, longitude: 153.05, source: 'device', accuracyMetres: 18,
        capturedAt: '2026-10-16T00:00:00.000Z' };
    assert.deepEqual(normalizeProjectGeographicOriginInputs('-28.4', '153.05', previous), {
        ...previous
    });
});

test('changing origin invalidates sourced geography and preserves manual authoring and map overrides', () => {
    const oldMap = { originKey: projectOriginKey(origin), status: 'sourced' };
    const project = { id: 'garden', siteMap: { image: 'plan.png', areaPoints: { 'site/bed': { x: 20, y: 30 } }, mapData: oldMap }, notes: ['keep'] };
    const same = withProjectGeographicOrigin(project, origin);
    assert.equal(same.siteMap.mapData, oldMap);
    const moved = withProjectGeographicOrigin(same, { ...origin, latitude: -34 });
    assert.equal(moved.siteMap.mapData, null);
    assert.deepEqual(moved.siteMap.areaPoints, project.siteMap.areaPoints);
    assert.equal(moved.siteMap.image, 'plan.png');
    assert.deepEqual(moved.notes, ['keep']);
    assert.equal(project.siteMap.geographicOrigin, undefined);
});

test('map coverage prevents unsupported requests while retaining a usable project context', async () => {
    let requests = 0;
    const result = await loadProjectMapInformation({ latitude: 0, longitude: 0 }, { fetchContours: async () => { requests++; } });
    assert.equal(requests, 0);
    assert.equal(result.status, 'unavailable');
    assert.match(result.message, /NSW/);
    assert.throws(() => projectMapBounds(origin, 10000));
});

test('flat and IMAP consume the same saved sourced package and reject stale responses', async () => {
    const mapData = await loadProjectMapInformation(origin, { fetchContours: async () => sample });
    const project = withProjectMapInformation(withProjectGeographicOrigin({ id: 'garden', siteMap: { image: 'keep.png' } }, origin), mapData);
    const flat = projectGeographicMapContext(project), imap = projectGeographicMapContext(project);
    assert.equal(flat.mapData, imap.mapData);
    assert.equal(flat.mapData.status, 'sourced');
    assert.equal(flat.mapData.source, sample.source);
    assert.equal(flat.mapData.quality, 'contour-interpolated');
    assert.deepEqual(JSON.parse(JSON.stringify(project)).siteMap.mapData.features, sample.features);
    const moved = withProjectGeographicOrigin(project, { ...origin, latitude: -34 });
    assert.throws(() => withProjectMapInformation(moved, mapData), /location changed/);
    assert.equal(projectGeographicMapContext({ ...moved, siteMap: { ...moved.siteMap, mapData } }).mapData, null);
});

test('provider failure and empty responses expose retryable unavailable state; cancellation propagates', async () => {
    for (const fetchContours of [async () => { throw new Error('Network offline'); }, async () => ({ features: [] })]) {
        const result = await loadProjectMapInformation(origin, { fetchContours });
        assert.equal(result.status, 'unavailable');
        assert.equal(result.originKey, projectOriginKey(origin));
        assert.match(result.message, /still be edited/);
    }
    const controller = new AbortController(); controller.abort();
    await assert.rejects(loadProjectMapInformation(origin, { signal: controller.signal, fetchContours: async () => sample }), { name: 'AbortError' });
});

test('map packages bound contour size and identify simplified source data explicitly', async () => {
    const dense = Array.from({ length: 150 }, () => ({ attributes: { elevation: 12 }, geometry: { paths: [Array.from({ length: 200 }, (_, n) => [151 + n / 100000, -33.8])] } }));
    const result = await loadProjectMapInformation(origin, { fetchContours: async () => ({ features: dense, source: sample.source }) });
    assert.equal(result.status, 'sourced');
    assert.equal(result.limited, true);
    assert.ok(result.features.flatMap(feature => feature.geometry.paths).flat().length <= 3200);
});
