import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.window = { location: { pathname: '/' } };
const { publishedMarkerTargets, resolvePublishedMarker, visitorPlaceWelcomeMarkup } = await import('../app/screens/visitorExperience.js');

const anchor = markerId => ({ enabled: true, markerFamily: 'aruco-original-5x5', markerId });
const guide = {
    project: { id: 'garden', name: 'Garden', description: 'A living garden', creatorUsername: 'Author One', projectStatus: 'ready' },
    plants: [{ commonName: 'Lemon' }],
    siteGroups: [{ site: { id: 'site', name: 'Site' }, placeGroups: [{
        place: { id: 'orchard', name: 'Orchard' },
        totems: [{ name: 'Orchard guide', physicalAnchor: anchor(1) }],
        plants: [{ commonName: 'Lemon', instanceId: 'lemon', placeId: 'orchard', physicalAnchor: anchor(2) }]
    }] }]
};

test('published NL markers resolve to the Area or exact Plant in the visitor guide', () => {
    assert.deepEqual(publishedMarkerTargets(guide).map(target => target.markerId), [1, 2]);
    assert.deepEqual(resolvePublishedMarker(guide, 1), { markerId: 1, type: 'area', name: 'Orchard', siteId: 'site', placeId: 'orchard' });
    assert.deepEqual(resolvePublishedMarker(guide, 2), { markerId: 2, type: 'plant', name: 'Lemon', specimen: '["site","orchard","lemon"]' });
    assert.equal(resolvePublishedMarker(guide, 3), null);
});

test('duplicate codes cannot silently open the wrong record', () => {
    const duplicate = structuredClone(guide);
    duplicate.siteGroups[0].placeGroups[0].plants[0].physicalAnchor.markerId = 1;
    assert.equal(resolvePublishedMarker(duplicate, 1), null);
});

test('project introduction names its author and offers marker and guide routes', () => {
    const markup = visitorPlaceWelcomeMarkup(guide);
    assert.match(markup, /A project by Author One/);
    assert.match(markup, /data-scan-visitor-marker/);
    assert.match(markup, /data-visitor-marker-form/);
    assert.match(markup, /Browse the guide/);
});
