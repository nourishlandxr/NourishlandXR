// Small, provider-neutral Area-link foundation.
//
// Existing projects store links as `totem_links` with `target_area_id` and
// optional calibration data. New code can use the clearer `links` shape below;
// readers accept both forms so single-Area projects and older saves continue
// to work unchanged.

export const AREA_LINK_NAVIGATION_STATES = Object.freeze([
    'AREA_ACTIVE',
    'LINK_GUIDANCE',
    'TARGET_ACQUISITION',
    'ALIGNING'
]);

const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const text = value => String(value ?? '').trim();

function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function finitePosition(value) {
    if (!value || !['x', 'y', 'z'].every(axis => finiteNumber(value[axis]) !== null)) return null;
    return { x: Number(value.x), y: Number(value.y), z: Number(value.z) };
}

function markerIds(value) {
    const values = Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
    return [...new Set(values.map(item => text(item)).filter(Boolean))];
}

function linkId(sourceAreaId, targetAreaId, value = '') {
    return text(value) || `${text(sourceAreaId) || 'area'}-to-${text(targetAreaId) || 'area'}`;
}

export function normalizeAreaLink(link = {}, options = {}) {
    const sourceAreaId = text(options.sourceAreaId || link.sourceAreaId || link.source_area_id);
    const toAreaId = text(link.toAreaId || link.to_area_id || link.targetAreaId || link.target_area_id);
    const targetTotemId = text(link.targetTotemId || link.target_totem_id || link.targetMarkerId || link.target_marker_id);
    const distance = finiteNumber(link.distanceMetres ?? link.distance_metres ?? link.distanceM ?? link.distance_m);
    const bearing = finiteNumber(link.bearingDegrees ?? link.bearing_degrees ?? link.bearing);
    const offset = finitePosition(link.approximateOffset || link.approximate_offset || link.offset);
    const normalized = {
        ...clone(link),
        id: linkId(sourceAreaId, toAreaId, link.id),
        toAreaId,
        targetTotemId,
        targetMarkerIds: markerIds(link.targetMarkerIds || link.target_marker_ids || link.markerIds || link.marker_ids || targetTotemId),
        distanceMetres: distance,
        bearingDegrees: bearing,
        approximateOffset: offset,
        bidirectional: link.bidirectional !== false,
        enabled: link.enabled !== false,
        sourceAreaId
    };
    // Keep the deployed field names available for the current AR renderer and
    // older saved records. These aliases are intentionally deterministic.
    normalized.target_area_id = toAreaId;
    normalized.target_totem_id = targetTotemId;
    normalized.distance_m = distance;
    normalized.bearing_degrees = bearing;
    normalized.approximate_offset = offset;
    return normalized;
}

export function normalizeAreaLinks(area = {}, areas = []) {
    const sourceAreaId = text(area.id || area.areaId);
    const rawLinks = [
        ...(Array.isArray(area.links) ? area.links : []),
        ...(Array.isArray(area.totem_links) ? area.totem_links : [])
    ];
    const knownAreas = new Set((Array.isArray(areas) ? areas : []).map(candidate => text(candidate?.id)).filter(Boolean));
    const seen = new Set();
    return rawLinks.map(link => normalizeAreaLink(link, { sourceAreaId })).filter(link => {
        if (!link.toAreaId || link.toAreaId === sourceAreaId) return false;
        const key = `${link.toAreaId}:${link.targetTotemId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).map(link => ({
        ...link,
        destinationExists: !knownAreas.size || knownAreas.has(link.toAreaId)
    }));
}

export function createAreaLink(sourceAreaId, targetAreaId, overrides = {}) {
    return normalizeAreaLink({ ...clone(overrides), toAreaId: targetAreaId }, { sourceAreaId });
}

export function validateAreaLinks(areas = []) {
    const sourceAreas = Array.isArray(areas) ? areas : [];
    const areaIds = new Set(sourceAreas.map(area => text(area?.id)).filter(Boolean));
    const errors = [];
    const normalized = sourceAreas.map(area => {
        const links = normalizeAreaLinks(area, sourceAreas);
        links.forEach(link => {
            if (!areaIds.has(link.toAreaId)) errors.push({ areaId: area.id, linkId: link.id, reason: 'missing-destination', destinationAreaId: link.toAreaId });
            if (!link.enabled) return;
            if (link.toAreaId === area.id) errors.push({ areaId: area.id, linkId: link.id, reason: 'self-link', destinationAreaId: link.toAreaId });
        });
        return { ...clone(area), links };
    });
    return { areas: normalized, errors, valid: errors.length === 0 };
}

export function areaLinkGuidance(link = {}) {
    const normalized = normalizeAreaLink(link);
    const destination = normalized.toAreaId || 'the linked Area';
    const distance = normalized.distanceMetres !== null ? ` · about ${normalized.distanceMetres} m` : '';
    const bearing = normalized.bearingDegrees !== null ? ` · bearing ${Math.round(normalized.bearingDegrees)}°` : '';
    return {
        destinationAreaId: destination === 'the linked Area' ? '' : destination,
        label: `Walk to ${destination}`,
        instruction: normalized.bearingDegrees !== null
            ? `Continue to ${destination} and look toward its Totem.${distance}${bearing}`
            : `Continue to ${destination} and look toward its Totem.${distance}`
    };
}

export function createAreaLinkNavigationState(overrides = {}) {
    const state = {
        activeAreaId: text(overrides.activeAreaId),
        activeTotemId: text(overrides.activeTotemId),
        selectedLinkId: text(overrides.selectedLinkId),
        destinationAreaId: text(overrides.destinationAreaId),
        navigationState: AREA_LINK_NAVIGATION_STATES.includes(overrides.navigationState) ? overrides.navigationState : 'AREA_ACTIVE',
        alignmentStatus: text(overrides.alignmentStatus || 'aligned'),
        lastConfirmedMarkerId: text(overrides.lastConfirmedMarkerId),
        lastConfirmedAreaId: text(overrides.lastConfirmedAreaId || overrides.activeAreaId)
    };
    return state;
}

export function transitionAreaLinkState(current, event = {}) {
    const state = createAreaLinkNavigationState(current);
    const type = text(event.type).toUpperCase();
    if (type === 'BEGIN_LINK') {
        const link = normalizeAreaLink(event.link, { sourceAreaId: state.activeAreaId });
        if (!link.enabled || !link.toAreaId) return { ...state, error: 'This Area link is not available.' };
        return {
            ...state,
            selectedLinkId: link.id,
            destinationAreaId: link.toAreaId,
            navigationState: 'LINK_GUIDANCE',
            alignmentStatus: 'source-confirmed',
            error: ''
        };
    }
    if (type === 'TARGET_READY') return { ...state, navigationState: 'TARGET_ACQUISITION', alignmentStatus: 'awaiting-target-marker', error: '' };
    if (type === 'TARGET_DETECTED') {
        return {
            ...state,
            navigationState: 'ALIGNING',
            alignmentStatus: 'target-marker-confirmed',
            lastConfirmedMarkerId: text(event.markerId || state.lastConfirmedMarkerId),
            error: ''
        };
    }
    if (type === 'ALIGNMENT_COMPLETE') {
        const areaId = text(event.areaId || state.destinationAreaId);
        return {
            ...state,
            activeAreaId: areaId,
            activeTotemId: text(event.totemId || state.activeTotemId),
            destinationAreaId: '',
            selectedLinkId: '',
            navigationState: 'AREA_ACTIVE',
            alignmentStatus: 'aligned',
            lastConfirmedAreaId: areaId,
            lastConfirmedMarkerId: text(event.markerId || state.lastConfirmedMarkerId),
            error: ''
        };
    }
    if (type === 'CANCEL_LINK') return { ...state, selectedLinkId: '', destinationAreaId: '', navigationState: 'AREA_ACTIVE', alignmentStatus: 'aligned', error: '' };
    if (type === 'TRACKING_LOST') return { ...state, navigationState: state.navigationState === 'AREA_ACTIVE' ? 'AREA_ACTIVE' : state.navigationState, alignmentStatus: 'uncertain', error: 'Area alignment is uncertain. Re-align with the current Totem.' };
    if (type === 'TRACKING_RECOVERED') return { ...state, alignmentStatus: state.navigationState === 'AREA_ACTIVE' ? 'aligned' : state.alignmentStatus, error: '' };
    return state;
}

// Named boundaries keep future AR providers from reaching into the reducer
// or the persisted record shape. They are intentionally data-only today.
export function beginAreaLink(state, link) {
    return transitionAreaLinkState(state, { type: 'BEGIN_LINK', link });
}

export function preloadArea(areas, areaId) {
    const targetId = text(areaId);
    return (Array.isArray(areas) ? areas : []).find(area => text(area?.id) === targetId) || null;
}

export function alignAreaFromMarker(areaId, markerPose, storedMarkerOffset = {}) {
    const root = areaRootTransformFromMarker(markerPose, storedMarkerOffset);
    return root ? { areaId: text(areaId), root, alignmentStatus: 'aligned' } : null;
}

export function activateArea(state, areaId, totemId = '', markerId = '') {
    return transitionAreaLinkState(state, { type: 'ALIGNMENT_COMPLETE', areaId, totemId, markerId });
}

export function cancelAreaLink(state) {
    return transitionAreaLinkState(state, { type: 'CANCEL_LINK' });
}

function rotateY(point, yawDegrees) {
    const radians = Number(yawDegrees || 0) * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return { x: point.x * cos - point.z * sin, y: point.y, z: point.x * sin + point.z * cos };
}

export function areaRootTransformFromMarker(markerPose, storedMarkerOffset = {}) {
    const markerPosition = finitePosition(markerPose?.position || markerPose);
    if (!markerPosition) return null;
    const offset = finitePosition(storedMarkerOffset.position || storedMarkerOffset) || { x: 0, y: 0, z: 0 };
    const yawDegrees = finiteNumber(markerPose?.yawDegrees ?? markerPose?.yaw ?? 0) || 0;
    const storedYaw = finiteNumber(storedMarkerOffset.yawDegrees ?? storedMarkerOffset.yaw ?? 0) || 0;
    const rotatedOffset = rotateY(offset, yawDegrees);
    return {
        position: { x: markerPosition.x - rotatedOffset.x, y: markerPosition.y - rotatedOffset.y, z: markerPosition.z - rotatedOffset.z },
        yawDegrees: yawDegrees - storedYaw,
        coordinateSpace: 'area-root'
    };
}

export function transformAreaPoint(localPosition, areaRoot) {
    const local = finitePosition(localPosition);
    const root = finitePosition(areaRoot?.position);
    if (!local || !root) return null;
    const rotated = rotateY(local, areaRoot.yawDegrees || 0);
    return { x: root.x + rotated.x, y: root.y + rotated.y, z: root.z + rotated.z };
}
