import { PIM_COMPASS } from './pimCompass.js';

const HONEYCOMB_DIRECTIONS = Object.freeze([
    'top',
    'upper-right',
    'lower-right',
    'bottom',
    'lower-left',
    'upper-left'
]);

const DIRECTION_AXIAL = Object.freeze({
    top: Object.freeze({ q: 0, r: -1 }),
    'upper-right': Object.freeze({ q: 1, r: -1 }),
    'lower-right': Object.freeze({ q: 1, r: 0 }),
    bottom: Object.freeze({ q: 0, r: 1 }),
    'lower-left': Object.freeze({ q: -1, r: 1 }),
    'upper-left': Object.freeze({ q: -1, r: 0 })
});

const ROOT_HUES = Object.freeze({
    top: 132,
    'upper-left': 42,
    'lower-left': 184,
    'upper-right': 212,
    'lower-right': 270,
    bottom: 25
});

// All world-space measurements are metres. The texture surface includes
// transparent expansion room around the connected cells; the cells themselves
// remain approximately 24 cm wide and therefore larger than a user's hand.
export const PIM_SPATIAL_CONFIG = Object.freeze({
    cellWidthMetres: .24,
    closedSurfaceWidthMetres: 1.02,
    expandedSurfaceWidthMetres: 1.44,
    expandedSurfaceHeightMetres: 1.08,
    placementDistanceMetres: 1.5,
    overheadLiftMetres: .72,
    overheadClearanceMetres: .09,
    gazeDropDegrees: 5,
    selectedDepthMetres: .018,
    colliderScale: 1.2
});

const clampHorizontalPercentage = value => Math.max(4, Math.min(96, value));
const clampVerticalPercentage = value => Math.max(4, Math.min(96, value));
const addAxial = (left, right) => ({ q: left.q + right.q, r: left.r + right.r });
const scaleAxial = (point, amount) => ({ q: point.q * amount, r: point.r * amount });

function axialVisual(point = { q: 0, r: 0 }) {
    return {
        x: Number(point.q) * .75,
        y: Number(point.r) + Number(point.q) * .5
    };
}

function positionedAxial(point) {
    const visual = axialVisual(point);
    return {
        x: clampHorizontalPercentage(50 + visual.x * 13.9),
        y: clampVerticalPercentage(50 + visual.y * 16.04),
        gridX: visual.x,
        gridY: visual.y,
        axial: { q: point.q, r: point.r }
    };
}

function splitKnowledgeDetails(value) {
    return String(value || '')
        .split(/\s*[\u00b7\u2022]\s*|\.\s+(?=[A-Z])|;\s*/)
        .map(part => part.trim())
        .filter(Boolean)
        .slice(0, 6);
}

function slug(value, fallback = 'information') {
    return String(value || fallback)
        .trim()
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || fallback;
}

function detailLabel(parentLabel, detail, index) {
    const namedDetail = String(detail || '').match(/^([^:]{2,40}):/);
    return (namedDetail?.[1] || `${parentLabel} ${index + 1}`).trim().toUpperCase();
}

function normalizeNode(item, path, parentPath = 'core', defaults = {}) {
    const [arrayLabel, arrayValue, arrayChildren] = Array.isArray(item) ? item : [];
    const label = Array.isArray(item) ? arrayLabel : item?.label;
    const value = Array.isArray(item) ? arrayValue : item?.description ?? item?.value;
    const children = Array.isArray(item) ? arrayChildren : item?.children;
    return {
        path: String(item?.path || path),
        id: String(item?.id || defaults.id || path),
        parentPath: String(item?.parentPath || parentPath),
        // `path` is the stable, document-wide node key used by the AR
        // interaction state. Keep an explicit parentId relationship beside
        // the legacy parentPath field so renderers never need to infer a
        // focused subtree from the clicked node.
        parentId: item?.parentId === null || item?.parentId === undefined || item?.parentId === ''
            ? (String(item?.parentPath || parentPath) === 'core' ? null : String(item?.parentPath || parentPath))
            : String(item.parentId),
        label: String(label || 'Information'),
        value: String(value || ''),
        direction: String(item?.direction || defaults.direction || ''),
        children: Array.isArray(children) ? children : null
    };
}

function legacyCategories(knowledge = {}) {
    const legacy = [
        ...(Array.isArray(knowledge.left) ? knowledge.left : []),
        ...(Array.isArray(knowledge.right) ? knowledge.right : [])
    ].slice(0, 6);
    return legacy.map((item, index) => ({
        item,
        direction: HONEYCOMB_DIRECTIONS[index]
    }));
}

export function pimKnowledgeNodes(knowledge = {}) {
    const supplied = Array.isArray(knowledge.categories)
        ? knowledge.categories
        : legacyCategories(knowledge).map(({ item, direction }) => ({ item, direction }));
    const byId = new Map();
    supplied.forEach(entry => {
        const item = entry.item || entry;
        const id = slug(item?.id || item?.primaryCategory || (Array.isArray(item) ? item[0] : item?.label));
        if (id) byId.set(id, { item, direction: entry.direction });
    });
    return PIM_COMPASS.map(compass => {
        const match = byId.get(compass.id)
            || [...byId.values()].find(entry => entry.direction === compass.direction)
            || { item: null, direction: compass.direction };
        const item = match.item || {
            id: compass.id,
            label: compass.title,
            description: '',
            value: '',
            children: []
        };
        const node = normalizeNode(item, compass.id, 'core', { id: compass.id, direction: compass.direction });
        return {
            ...node,
            id: compass.id,
            path: String(node.path || compass.id),
            parentId: null,
            direction: compass.direction
        };
    });
}

export function pimNodeChildren(node) {
    const hasExplicitChildren = Array.isArray(node?.children);
    const explicitChildren = hasExplicitChildren ? node.children : [];
    const details = hasExplicitChildren ? explicitChildren : splitKnowledgeDetails(node?.value);
    if (!details.length || /^add in web mode$/i.test(String(node?.value || '').trim())) return [];
    if (!hasExplicitChildren && node?.depth > 0 && details.length === 1) return [];
    return details.map((detail, index) => {
        const child = Array.isArray(detail) || typeof detail === 'object'
            ? detail
            : [detailLabel(node.label, detail, index), detail];
        return normalizeNode(child, `${node.path}.${index + 1}`, node.path);
    });
}

export function pimRootPosition(node) {
    return positionedAxial(DIRECTION_AXIAL[node?.direction] || { q: 0, r: 0 });
}

export function pimNodeHue(node) {
    const direction = node?.rootDirection || node?.direction;
    return ROOT_HUES[direction] || 112;
}

function directionIndex(direction) {
    const index = HONEYCOMB_DIRECTIONS.indexOf(direction);
    return index >= 0 ? index : 0;
}

function outwardChildAxials(parent, childCount) {
    const index = directionIndex(parent.rootDirection || parent.direction);
    const outward = DIRECTION_AXIAL[HONEYCOMB_DIRECTIONS[index]];
    const previous = DIRECTION_AXIAL[HONEYCOMB_DIRECTIONS[(index + HONEYCOMB_DIRECTIONS.length - 1) % HONEYCOMB_DIRECTIONS.length]];
    const next = DIRECTION_AXIAL[HONEYCOMB_DIRECTIONS[(index + 1) % HONEYCOMB_DIRECTIONS.length]];
    const offsets = [
        outward,
        previous,
        next,
        addAxial(outward, previous),
        addAxial(outward, next),
        scaleAxial(outward, 2),
        addAxial(scaleAxial(outward, 2), previous),
        addAxial(scaleAxial(outward, 2), next)
    ];
    return offsets.slice(0, childCount).map(offset => addAxial(parent.position.axial, offset));
}

export function pimChildPosition(parent, childIndex, childCount) {
    const axials = outwardChildAxials(parent, childCount);
    return positionedAxial(axials[childIndex] || parent?.position?.axial || { q: 0, r: 0 });
}

export function pimConnectorCurve(node) {
    const parent = node?.parentPosition || { x: 50, y: 50 };
    const point = node?.position || parent;
    const dx = point.x - parent.x;
    const dy = point.y - parent.y;
    return {
        start: parent,
        control1: { x: parent.x + dx * .36, y: parent.y + dy * .36 },
        control2: { x: parent.x + dx * .72, y: parent.y + dy * .72 },
        end: point
    };
}

export function pimConnectorPath(node) {
    const curve = pimConnectorCurve(node);
    return `M${curve.start.x} ${curve.start.y} C${curve.control1.x} ${curve.control1.y} ${curve.control2.x} ${curve.control2.y} ${curve.end.x} ${curve.end.y}`;
}

// The spatial canvas and its ray-hit map must use the same position while a
// child generation blooms out of its parent. Keeping this calculation here
// prevents the renderer and the interaction layer from drifting apart.
export function pimNodeVisualPosition(node, bloomProgress = 1) {
    const target = node?.position || { x: 50, y: 50 };
    if (Number(node?.depth) <= 0) return { x: Number(target.x), y: Number(target.y) };
    const parent = node?.parentPosition || { x: 50, y: 50 };
    const progress = Math.max(0, Math.min(1, Number(bloomProgress)));
    return {
        x: Number(parent.x) + (Number(target.x) - Number(parent.x)) * progress,
        y: Number(parent.y) + (Number(target.y) - Number(parent.y)) * progress
    };
}

export function pimNodeAtPath(knowledge = {}, path = '') {
    const targetPath = String(path || '');
    if (!targetPath) return null;
    const visit = (node, depth, rootDirection) => {
        if (node.path === targetPath) return { ...node, depth, rootDirection };
        for (const child of pimNodeChildren({ ...node, depth })) {
            const match = visit(child, depth + 1, rootDirection);
            if (match) return match;
        }
        return null;
    };
    for (const root of pimKnowledgeNodes(knowledge)) {
        const match = visit(root, 0, root.direction);
        if (match) return match;
    }
    return null;
}

function expandedIdSet(expandedNodeIds = []) {
    if (expandedNodeIds instanceof Set) return new Set([...expandedNodeIds].map(String).filter(Boolean));
    return new Set((Array.isArray(expandedNodeIds) ? expandedNodeIds : []).map(String).filter(Boolean));
}

function ancestorPaths(path) {
    const target = String(path || '');
    if (!target) return [];
    const separator = target.includes('/') ? '/' : '.';
    const segments = target.split(separator).filter(Boolean);
    return segments.map((_, index) => segments.slice(0, index + 1).join(separator));
}

/**
 * The AR PIM keeps selection and expansion as two different pieces of state.
 * `selectedNodeId` is only for highlighting/status; `expandedNodeIds` controls
 * which descendants are present in the complete mesh.
 */
export function pimCreateInteractionState(expandedNodeIds = [], selectedNodeId = '', focusedPlantId = '') {
    return {
        selectedNodeId: String(selectedNodeId || ''),
        expandedNodeIds: expandedIdSet(expandedNodeIds),
        focusedPlantId: String(focusedPlantId || '')
    };
}

export function pimToggleNodeState(knowledge = {}, state = {}, nodeId = '') {
    const targetId = String(nodeId || '');
    const node = pimNodeAtPath(knowledge, targetId);
    const next = pimCreateInteractionState(
        state?.expandedNodeIds,
        targetId || state?.selectedNodeId,
        state?.focusedPlantId
    );
    if (!node) return next;
    const children = pimNodeChildren(node);
    if (!children.length) return next;
    if (next.expandedNodeIds.has(targetId)) {
        next.expandedNodeIds = new Set([...next.expandedNodeIds]
            .filter(candidate => candidate !== targetId
                && !candidate.startsWith(`${targetId}.`)
                && !candidate.startsWith(`${targetId}/`)));
        return next;
    }
    ancestorPaths(targetId).forEach(ancestor => next.expandedNodeIds.add(ancestor));
    return next;
}

export function pimExpandedNodeIds(state = {}) {
    return [...expandedIdSet(state?.expandedNodeIds)];
}

export function pimVisibleNodes(knowledge = {}, expandedPaths = [], options = {}) {
    const expanded = expandedIdSet(expandedPaths);
    const selectedNodeId = String(options.selectedNodeId || '');
    // The selected node itself is visible as a node, but selection alone must
    // not open its children. Only its complete ancestor path is implicit.
    const selectedPathParts = ancestorPaths(selectedNodeId);
    const selectedAncestors = new Set(selectedPathParts.slice(0, -1));
    const visible = [];
    const corePosition = positionedAxial({ q: 0, r: 0 });

    const visit = (node, depth, rootDirection, parentRecord, childIndex, childCount) => {
        const position = depth === 0
            ? pimRootPosition(node)
            : pimChildPosition(parentRecord, childIndex, childCount);
        const record = {
            ...node,
            nodeId: node.path,
            parentId: node.parentId === 'core' ? null : node.parentId,
            depth,
            rootDirection,
            position,
            parentPosition: parentRecord?.position || corePosition,
            childIndex,
            childCount
        };
        visible.push(record);

        const children = pimNodeChildren(node);
        const open = expanded.has(node.path) || selectedAncestors.has(node.path);
        if (!open || !children.length) return;
        children.forEach((child, index) => visit(child, depth + 1, rootDirection, record, index, children.length));
    };

    pimKnowledgeNodes(knowledge).forEach(root => visit(root, 0, root.direction, null, 0, 1));
    return visible;
}

export function pimToggleExpandedPaths(expandedPaths, path) {
    const target = String(path || '');
    if (!target) return [];
    const current = expandedIdSet(expandedPaths);
    if (current.has(target)) {
        return [...current].filter(candidate => candidate !== target
            && !candidate.startsWith(`${target}.`)
            && !candidate.startsWith(`${target}/`));
    }
    ancestorPaths(target).forEach(ancestor => current.add(ancestor));
    return [...current];
}

export function pimEnsureExpandedPaths(expandedPaths, path) {
    const target = String(path || '');
    const current = expandedIdSet(expandedPaths);
    if (!target) return [...current];
    ancestorPaths(target).forEach(ancestor => current.add(ancestor));
    return [...current];
}

function normalizedHorizontal(vector, fallback) {
    const length = Math.hypot(vector.x, vector.z);
    return length > .0001 ? { x: vector.x / length, y: 0, z: vector.z / length } : fallback;
}

// Capture an upright panel pose once. It faces the user at placement time but
// does not continue rotating with the user's head. The quaternion and scale
// are serializable for marker/totem persistence and future spatial anchors.
export function pimSpatialPoseFromViewer(viewerMatrix, options = {}) {
    if (!viewerMatrix || viewerMatrix.length < 16) return null;
    const distance = Number(options.distance) || PIM_SPATIAL_CONFIG.placementDistanceMetres;
    const dropDegrees = Number.isFinite(Number(options.dropDegrees)) ? Number(options.dropDegrees) : PIM_SPATIAL_CONFIG.gazeDropDegrees;
    const forward = normalizedHorizontal({ x: -viewerMatrix[8], z: -viewerMatrix[10] }, { x: 0, y: 0, z: -1 });
    const normal = { x: -forward.x, y: 0, z: -forward.z };
    const right = { x: normal.z, y: 0, z: -normal.x };
    const drop = Math.tan(dropDegrees * Math.PI / 180) * distance;
    const yaw = Math.atan2(normal.x, normal.z);
    return {
        position: {
            x: viewerMatrix[12] + forward.x * distance,
            y: viewerMatrix[13] - drop,
            z: viewerMatrix[14] + forward.z * distance
        },
        rotation: {
            x: 0,
            y: Math.sin(yaw / 2),
            z: 0,
            w: Math.cos(yaw / 2)
        },
        scale: Number(options.scale) || 1,
        right,
        up: { x: 0, y: 1, z: 0 },
        normal,
        plantId: String(options.plantId || ''),
        anchorId: String(options.anchorId || options.totemId || ''),
        coordinateSpace: String(options.coordinateSpace || 'session-local')
    };
}

// Attach plant information to the orb, rather than to the user's current
// gaze point. The mesh therefore opens overhead and slightly toward the
// viewer instead of appearing behind the plant marker.
export function pimSpatialPoseAboveAnchor(viewerMatrix, anchorPosition, options = {}) {
    const pose = pimSpatialPoseFromViewer(viewerMatrix, options);
    if (!pose || !anchorPosition) return pose;
    const lift = Number.isFinite(Number(options.liftMetres))
        ? Number(options.liftMetres)
        : PIM_SPATIAL_CONFIG.overheadLiftMetres;
    const clearance = Number.isFinite(Number(options.clearanceMetres))
        ? Number(options.clearanceMetres)
        : PIM_SPATIAL_CONFIG.overheadClearanceMetres;
    const anchor = {
        x: Number(anchorPosition.x) || 0,
        y: Number(anchorPosition.y) || 0,
        z: Number(anchorPosition.z) || 0
    };
    return {
        ...pose,
        position: {
            x: anchor.x + pose.normal.x * clearance,
            y: anchor.y + lift,
            z: anchor.z + pose.normal.z * clearance
        }
    };
}

// Restore a saved upright PIM pose without making it follow the current
// viewer. Marker-local positions survive Area recentering and marker moves.
export function pimSpatialPoseFromStored(storedPose, markerPosition = null) {
    const storedPosition = storedPose?.position;
    const storedRotation = storedPose?.rotation;
    if (!storedPosition || !storedRotation) return null;
    if (![storedPosition.x, storedPosition.y, storedPosition.z, storedRotation.x, storedRotation.y, storedRotation.z, storedRotation.w]
        .every(value => Number.isFinite(Number(value)))) return null;
    const coordinateSpace = String(storedPose.coordinate_space || storedPose.coordinateSpace || 'session-local');
    const markerOrigin = coordinateSpace === 'marker-local' && markerPosition
        ? markerPosition
        : { x: 0, y: 0, z: 0 };
    const rotation = {
        x: Number(storedRotation.x),
        y: Number(storedRotation.y),
        z: Number(storedRotation.z),
        w: Number(storedRotation.w)
    };
    const yaw = Math.atan2(
        2 * (rotation.w * rotation.y + rotation.x * rotation.z),
        1 - 2 * (rotation.y * rotation.y + rotation.z * rotation.z)
    );
    const normal = { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) };
    return {
        position: {
            x: Number(markerOrigin.x || 0) + Number(storedPosition.x),
            y: Number(markerOrigin.y || 0) + Number(storedPosition.y),
            z: Number(markerOrigin.z || 0) + Number(storedPosition.z)
        },
        rotation,
        scale: Number(storedPose.scale) || 1,
        right: { x: normal.z, y: 0, z: -normal.x },
        up: { x: 0, y: 1, z: 0 },
        normal,
        plantId: String(storedPose.plant_id || storedPose.plantId || ''),
        anchorId: String(storedPose.anchor_id || storedPose.anchorId || ''),
        coordinateSpace
    };
}

export function pimSpatialPanel(pose, options = {}) {
    if (!pose?.position || !pose?.right || !pose?.up || !pose?.normal) return null;
    const scale = Number(pose.scale) || 1;
    // The PIM texture and its ray-hit map must share one deterministic basis.
    // Rebuild the upright horizontal basis from the panel normal instead of
    // trusting a stale persisted right vector.
    const normalLength = Math.hypot(Number(pose.normal.x) || 0, Number(pose.normal.z) || 0);
    if (normalLength < .0001) return null;
    const normal = {
        x: Number(pose.normal.x) / normalLength,
        y: 0,
        z: Number(pose.normal.z) / normalLength
    };
    let right = { x: normal.z, y: 0, z: -normal.x };
    const viewerPosition = options.viewerPosition;
    if (viewerPosition && Number.isFinite(Number(viewerPosition.x)) && Number.isFinite(Number(viewerPosition.z))) {
        const towardViewer = {
            x: Number(viewerPosition.x) - Number(pose.position.x),
            y: Number(viewerPosition.y || 0) - Number(pose.position.y || 0),
            z: Number(viewerPosition.z) - Number(pose.position.z)
        };
        const facing = normal.x * towardViewer.x + normal.y * towardViewer.y + normal.z * towardViewer.z;
        if (facing < 0) {
            normal.x *= -1;
            normal.z *= -1;
            right = { x: normal.z, y: 0, z: -normal.x };
        }
    }
    return {
        center: { ...pose.position },
        right,
        up: { x: 0, y: 1, z: 0 },
        normal,
        width: (Number(options.width) || PIM_SPATIAL_CONFIG.expandedSurfaceWidthMetres) * scale,
        height: (Number(options.height) || PIM_SPATIAL_CONFIG.expandedSurfaceHeightMetres) * scale
    };
}
