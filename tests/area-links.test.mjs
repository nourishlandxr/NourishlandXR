import test from 'node:test';
import assert from 'node:assert/strict';
import {
    AREA_LINK_NAVIGATION_STATES,
    areaLinkGuidance,
    areaRootTransformFromMarker,
    createAreaLink,
    createAreaLinkNavigationState,
    normalizeAreaLinks,
    transformAreaPoint,
    transitionAreaLinkState,
    validateAreaLinks
} from '../app/services/areaLinks.js';

test('Area links default safely and normalize the legacy Totem-link shape', () => {
    assert.deepEqual(normalizeAreaLinks({ id: 'home' }), []);
    const links = normalizeAreaLinks({
        id: 'living-room',
        totem_links: [{ target_area_id: 'kitchen', target_totem_id: 'kitchen-totem', distance_m: '6.5', bearing_degrees: 90 }]
    }, [{ id: 'living-room' }, { id: 'kitchen' }]);
    assert.equal(links.length, 1);
    assert.equal(links[0].id, 'living-room-to-kitchen');
    assert.equal(links[0].toAreaId, 'kitchen');
    assert.equal(links[0].targetTotemId, 'kitchen-totem');
    assert.equal(links[0].distanceMetres, 6.5);
    assert.equal(links[0].destinationExists, true);
});

test('Area link validation reports broken destinations without rejecting the project', () => {
    const result = validateAreaLinks([
        { id: 'living-room', links: [createAreaLink('living-room', 'missing-area')] },
        { id: 'kitchen' }
    ]);
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].reason, 'missing-destination');
    assert.equal(result.areas[0].links[0].destinationExists, false);
});

test('Area link navigation has an explicit, simulated transition state machine', () => {
    assert.deepEqual(AREA_LINK_NAVIGATION_STATES, ['AREA_ACTIVE', 'LINK_GUIDANCE', 'TARGET_ACQUISITION', 'ALIGNING']);
    let state = createAreaLinkNavigationState({ activeAreaId: 'living-room', activeTotemId: 'living-totem' });
    state = transitionAreaLinkState(state, { type: 'BEGIN_LINK', link: createAreaLink('living-room', 'kitchen', { targetTotemId: 'kitchen-totem' }) });
    assert.equal(state.navigationState, 'LINK_GUIDANCE');
    assert.equal(state.destinationAreaId, 'kitchen');
    assert.match(areaLinkGuidance({ toAreaId: 'kitchen', distanceMetres: 6 }).instruction, /Continue to kitchen/);
    state = transitionAreaLinkState(state, { type: 'TARGET_READY' });
    state = transitionAreaLinkState(state, { type: 'TARGET_DETECTED', markerId: 'kitchen-marker' });
    assert.equal(state.navigationState, 'ALIGNING');
    state = transitionAreaLinkState(state, { type: 'ALIGNMENT_COMPLETE', areaId: 'kitchen', totemId: 'kitchen-totem' });
    assert.equal(state.navigationState, 'AREA_ACTIVE');
    assert.equal(state.lastConfirmedMarkerId, 'kitchen-marker');
    assert.equal(state.lastConfirmedAreaId, 'kitchen');
    state = transitionAreaLinkState(state, { type: 'BEGIN_LINK', link: createAreaLink('kitchen', 'living-room') });
    state = transitionAreaLinkState(state, { type: 'TRACKING_LOST' });
    assert.equal(state.alignmentStatus, 'uncertain');
    state = transitionAreaLinkState(state, { type: 'CANCEL_LINK' });
    assert.equal(state.navigationState, 'AREA_ACTIVE');
});

test('AreaRoot alignment transforms the root without rewriting child coordinates', () => {
    const root = areaRootTransformFromMarker(
        { position: { x: 10, y: 0, z: 5 }, yawDegrees: 90 },
        { position: { x: 1, y: 0, z: 0 }, yawDegrees: 0 }
    );
    assert.deepEqual(root.position, { x: 10, y: 0, z: 4 });
    assert.deepEqual(transformAreaPoint({ x: 0, y: 0, z: 2 }, root), { x: 8, y: 0, z: 4 });
});
