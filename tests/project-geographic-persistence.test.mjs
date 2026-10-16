import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePersistedProjectSiteMap } from '../app/services/projectGeographicPersistence.js';

const origin = { latitude: -28.4, longitude: 153.04, source: 'manual', accuracyMetres: null, capturedAt: '2026-10-16T00:00:00.000Z' };
const mapData = { schemaVersion: 1, status: 'sourced', originKey: '-28.4,153.04',
    bounds: { xmin: 153.03, ymin: -28.41, xmax: 153.05, ymax: -28.39, spatialReference: 4326 },
    features: [{ attributes: { elevation: 250, ignored: 'not persisted' }, geometry: { paths: [[[153.031, -28.4], [153.049, -28.4]]] } }],
    source: 'NSW contours', retrievedAt: '2026-10-16T00:00:00.000Z', quality: 'contour-interpolated', limited: false, message: 'Sourced contours.' };

test('project persistence validates source data and merges it with existing authoring settings', () => {
    const existing = { image: 'plan.png', areaPoints: { 'site/bed': { x: 20, y: 30 } }, creatorLayout: { shape: 'square' } };
    const saved = normalizePersistedProjectSiteMap({ ...existing, geographicOrigin: origin, mapData }, existing);
    assert.equal(saved.geographicOrigin.longitude, 153.04);
    assert.equal(saved.mapData.status, 'sourced');
    assert.equal(saved.mapData.bounds.spatialReference, 4326);
    assert.deepEqual(saved.mapData.features[0].attributes, { elevation: 250 });
    assert.deepEqual(saved.areaPoints, existing.areaPoints);
    assert.deepEqual(saved.creatorLayout, existing.creatorLayout);
});

test('changing the origin clears old contours while preserving hand placed map content', () => {
    const existing = { geographicOrigin: origin, mapData, areaPoints: { 'site/bed': { x: 20, y: 30 } }, image: 'plan.png' };
    const moved = normalizePersistedProjectSiteMap({ geographicOrigin: { ...origin, longitude: 153.05 } }, existing);
    assert.equal(moved.mapData, null);
    assert.equal(moved.areaPoints['site/bed'].x, 20);
    assert.equal(moved.image, 'plan.png');
});

test('project persistence rejects invalid origins, stale packages and excessive bounds', () => {
    assert.throws(() => normalizePersistedProjectSiteMap({ geographicOrigin: { ...origin, latitude: 92 } }), /Latitude/);
    assert.throws(() => normalizePersistedProjectSiteMap({ geographicOrigin: origin, mapData: { ...mapData, originKey: 'other' } }), /match the saved project origin/);
    assert.throws(() => normalizePersistedProjectSiteMap({ geographicOrigin: origin, mapData: { ...mapData, bounds: { ...mapData.bounds, xmax: 153.3 } } }), /bounds are invalid/);
});
