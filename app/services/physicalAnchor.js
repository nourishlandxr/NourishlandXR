export const PHYSICAL_ANCHOR_FAMILY = 'aruco-original-5x5';
export const PHYSICAL_ANCHOR_IDS = Object.freeze(Array.from({ length: 10 }, (_, index) => index + 1));
export const PHYSICAL_ANCHOR_DEFAULTS = Object.freeze({
    enabled: false,
    markerFamily: PHYSICAL_ANCHOR_FAMILY,
    markerId: 1,
    markerLabel: 'NL-001',
    markerSizeMm: 140,
    offsetMeters: Object.freeze({ x: 0, y: 0, z: 0 }),
    rotationDegrees: Object.freeze({ yaw: 0, pitch: 0, roll: 0 }),
    scale: 1
});

export function physicalMarkerLabel(markerId) {
    const numericId = Number(markerId);
    if (!Number.isInteger(numericId) || !PHYSICAL_ANCHOR_IDS.includes(numericId)) {
        throw new RangeError('Physical marker ID must be between 1 and 10.');
    }
    return `NL-${String(numericId).padStart(3, '0')}`;
}

export function arucoMarkerMatrix(markerId) {
    const id = Number(markerId);
    if (!Number.isInteger(id) || id < 0 || id > 1023) {
        throw new RangeError('ArUco marker ID must be between 0 and 1023.');
    }
    const rowCodes = [16, 23, 9, 14];
    return Array.from({ length: 5 }, (_, row) => {
        const rowCode = rowCodes[(id >> (2 * (4 - row))) & 3];
        return Array.from({ length: 5 }, (_, column) => (rowCode >> (4 - column)) & 1);
    });
}

export function physicalMarkerSvg(markerId, { includeLabel = true } = {}) {
    const label = physicalMarkerLabel(markerId);
    const matrix = arucoMarkerMatrix(markerId);
    const height = includeLabel ? 10 : 9;
    const cells = matrix.flatMap((row, rowIndex) => row.map((value, columnIndex) => value
        ? `<rect x="${columnIndex + 2}" y="${rowIndex + 2}" width="1" height="1" fill="#fff"/>`
        : '')).join('');
    const text = includeLabel
        ? `<text x="4.5" y="9.45" text-anchor="middle" font-family="Arial,sans-serif" font-size=".72" font-weight="700" fill="#111">${label}</text>`
        : '';
    return `<svg viewBox="0 0 9 ${height}" role="img" aria-label="${label} ArUco marker" xmlns="http://www.w3.org/2000/svg"><rect width="9" height="${height}" fill="#fff"/><rect x="1" y="1" width="7" height="7" fill="#000"/>${cells}${text}</svg>`;
}

function finiteNumber(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number.`);
    return number;
}

export function normalizePhysicalAnchor(value) {
    if (!value?.enabled) return null;
    const markerId = Number(value.markerId);
    const markerFamily = String(value.markerFamily || PHYSICAL_ANCHOR_FAMILY);
    if (markerFamily !== PHYSICAL_ANCHOR_FAMILY) throw new Error('Unsupported physical marker family.');
    if (!Number.isInteger(markerId) || !PHYSICAL_ANCHOR_IDS.includes(markerId)) {
        throw new Error('Choose a physical marker from NL-001 through NL-010.');
    }
    const markerSizeMm = finiteNumber(value.markerSizeMm, 'Marker size');
    const scale = finiteNumber(value.scale, 'Scale');
    if (markerSizeMm <= 0) throw new Error('Marker size must be greater than zero.');
    if (scale <= 0) throw new Error('Scale must be greater than zero.');
    return {
        enabled: true,
        markerFamily,
        markerId,
        markerLabel: physicalMarkerLabel(markerId),
        markerSizeMm,
        offsetMeters: {
            x: finiteNumber(value.offsetMeters?.x ?? 0, 'Horizontal offset X'),
            y: finiteNumber(value.offsetMeters?.y ?? 0, 'Vertical offset Y'),
            z: finiteNumber(value.offsetMeters?.z ?? 0, 'Depth offset Z')
        },
        rotationDegrees: {
            yaw: finiteNumber(value.rotationDegrees?.yaw ?? 0, 'Heading/yaw'),
            pitch: finiteNumber(value.rotationDegrees?.pitch ?? 0, 'Tilt/pitch'),
            roll: finiteNumber(value.rotationDegrees?.roll ?? 0, 'Roll')
        },
        scale
    };
}

export function physicalAnchorAssignments(entries, currentMarkerId = '') {
    const assignments = new Map();
    for (const entry of Array.isArray(entries) ? entries : []) {
        const anchor = entry?.marker?.physicalAnchor;
        if (!anchor?.enabled || anchor.markerFamily !== PHYSICAL_ANCHOR_FAMILY) continue;
        const markerId = Number(anchor.markerId);
        if (!PHYSICAL_ANCHOR_IDS.includes(markerId)) continue;
        assignments.set(markerId, {
            markerId,
            markerLabel: physicalMarkerLabel(markerId),
            markerRecordId: entry.marker.id,
            markerType: entry.marker.type,
            markerName: entry.marker.name,
            // Keep the old names for existing Totem settings and integrations.
            totemId: entry.marker.id,
            totemName: entry.marker.name,
            placeId: entry.place?.id || '',
            isCurrent: entry.marker.id === currentMarkerId
        });
    }
    return assignments;
}

export function resolvePhysicalAnchorEntry(entries, markerId) {
    const numericId = Number(markerId);
    return (Array.isArray(entries) ? entries : []).find(entry => {
        const anchor = entry?.marker?.physicalAnchor;
        return anchor?.enabled
            && anchor.markerFamily === PHYSICAL_ANCHOR_FAMILY
            && Number(anchor.markerId) === numericId;
    }) || null;
}

export function resolvePhysicalAnchorTotem(entries, markerId) {
    return resolvePhysicalAnchorEntry(entries, markerId);
}

function rotateX(point, radians) {
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return { x: point.x, y: point.y * cosine - point.z * sine, z: point.y * sine + point.z * cosine };
}

function rotateY(point, radians) {
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return { x: point.x * cosine + point.z * sine, y: point.y, z: -point.x * sine + point.z * cosine };
}

function rotateZ(point, radians) {
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine, z: point.z };
}

/**
 * Converts one Totem-local point to detector camera coordinates.
 * NLXR marker axes: +X runs right along the marker's top edge, +Y rises
 * normally above the marker plane, and +Z runs in-plane from the centre
 * toward the marker's top edge (marker-forward).
 * Transform order: scale -> roll(Z) -> pitch(X) -> yaw(Y) -> saved offset ->
 * NLXR-to-POSIT axis conversion -> detector rotation -> detector translation.
 */
export function physicalAnchorPointToDetectorCamera(point, detectorPose, physicalAnchor) {
    const anchor = normalizePhysicalAnchor({ ...PHYSICAL_ANCHOR_DEFAULTS, ...physicalAnchor, enabled: true });
    const radians = Math.PI / 180;
    let transformed = {
        x: finiteNumber(point?.x ?? 0, 'Point X') * anchor.scale,
        y: finiteNumber(point?.y ?? 0, 'Point Y') * anchor.scale,
        z: finiteNumber(point?.z ?? 0, 'Point Z') * anchor.scale
    };
    transformed = rotateZ(transformed, anchor.rotationDegrees.roll * radians);
    transformed = rotateX(transformed, anchor.rotationDegrees.pitch * radians);
    transformed = rotateY(transformed, anchor.rotationDegrees.yaw * radians);
    transformed = {
        x: transformed.x + anchor.offsetMeters.x,
        y: transformed.y + anchor.offsetMeters.y,
        z: transformed.z + anchor.offsetMeters.z
    };

    const modelPointMm = [transformed.x * 1000, transformed.z * 1000, transformed.y * 1000];
    const rotation = detectorPose?.bestRotation;
    const translation = detectorPose?.bestTranslation;
    if (!Array.isArray(rotation) || rotation.length !== 3 || !Array.isArray(translation) || translation.length !== 3) {
        throw new Error('Detector pose is unavailable.');
    }
    return {
        x: rotation[0][0] * modelPointMm[0] + rotation[0][1] * modelPointMm[1] + rotation[0][2] * modelPointMm[2] + translation[0],
        y: rotation[1][0] * modelPointMm[0] + rotation[1][1] * modelPointMm[1] + rotation[1][2] * modelPointMm[2] + translation[1],
        z: rotation[2][0] * modelPointMm[0] + rotation[2][1] * modelPointMm[1] + rotation[2][2] * modelPointMm[2] + translation[2]
    };
}

function projectCameraPoint(point, width, height, focalLength) {
    if (!Number.isFinite(point.z) || point.z <= 0.001) return null;
    return {
        x: width / 2 + focalLength * point.x / point.z,
        y: height / 2 - focalLength * point.y / point.z
    };
}

export function projectPhysicalTotemOverlay(detectorPose, physicalAnchor, viewport, dimensions = {}) {
    const width = finiteNumber(viewport?.width, 'Viewport width');
    const height = finiteNumber(viewport?.height, 'Viewport height');
    const focalLength = finiteNumber(viewport?.focalLength || width, 'Focal length');
    const base = projectCameraPoint(physicalAnchorPointToDetectorCamera({ x: 0, y: 0, z: 0 }, detectorPose, physicalAnchor), width, height, focalLength);
    const heightMetres = Number(dimensions.heightMetres) > 0 ? Number(dimensions.heightMetres) : .82;
    const widthMetres = Number(dimensions.widthMetres) > 0 ? Number(dimensions.widthMetres) : .14;
    const top = projectCameraPoint(physicalAnchorPointToDetectorCamera({ x: 0, y: heightMetres, z: 0 }, detectorPose, physicalAnchor), width, height, focalLength);
    const right = projectCameraPoint(physicalAnchorPointToDetectorCamera({ x: widthMetres, y: 0, z: 0 }, detectorPose, physicalAnchor), width, height, focalLength);
    if (!base || !top || !right) return null;
    return {
        x: base.x,
        y: base.y,
        height: Math.max(18, Math.hypot(top.x - base.x, top.y - base.y)),
        width: Math.max(8, Math.hypot(right.x - base.x, right.y - base.y) * 2),
        rotationDegrees: Math.atan2(top.y - base.y, top.x - base.x) * 180 / Math.PI + 90
    };
}

export function createPhysicalAnchorTrackingState(graceMs = 300) {
    let trackedMarkerId = null;
    let lastSeenAt = -Infinity;
    const loadedMarkerIds = new Set();
    return {
        update(detections, now, resolveAssociation) {
            const detection = (Array.isArray(detections) ? detections : []).find(item => resolveAssociation(item.id));
            if (detection) {
                const association = resolveAssociation(detection.id);
                const loadModel = !loadedMarkerIds.has(detection.id);
                trackedMarkerId = detection.id;
                lastSeenAt = now;
                loadedMarkerIds.add(detection.id);
                return { state: 'tracked', detection, association, loadModel };
            }
            if (trackedMarkerId !== null && now - lastSeenAt <= graceMs) {
                return { state: 'holding', markerId: trackedMarkerId, loadModel: false };
            }
            const lostMarkerId = trackedMarkerId;
            trackedMarkerId = null;
            return { state: lostMarkerId === null ? 'searching' : 'lost', markerId: lostMarkerId, loadModel: false };
        },
        reset() {
            trackedMarkerId = null;
            lastSeenAt = -Infinity;
            loadedMarkerIds.clear();
        }
    };
}
