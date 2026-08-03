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
    top: 96,
    'upper-left': 42,
    'lower-left': 184,
    'upper-right': 24,
    'lower-right': 144,
    bottom: 278
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
        path,
        id: String(item?.id || defaults.id || path),
        parentPath,
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
    const categories = Array.isArray(knowledge.categories)
        ? knowledge.categories.slice(0, 6).map((item, index) => ({
            item,
            direction: HONEYCOMB_DIRECTIONS.includes(item?.direction) ? item.direction : HONEYCOMB_DIRECTIONS[index]
        }))
        : legacyCategories(knowledge);
    return categories.map(({ item, direction }, index) => {
        const id = slug(item?.id || (Array.isArray(item) ? item[0] : item?.label), `category-${index + 1}`);
        return normalizeNode(item, id, 'core', { id, direction });
    });
}

export function pimNodeChildren(node) {
    const explicitChildren = Array.isArray(node?.children) ? node.children : [];
    const details = explicitChildren.length ? explicitChildren : splitKnowledgeDetails(node?.value);
    if (!details.length || /^add in web mode$/i.test(String(node?.value || '').trim())) return [];
    if (!explicitChildren.length && node?.depth > 0 && details.length === 1) return [];
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

export function pimNodeAtPath(knowledge = {}, path = '') {
    const targetPath = String(path || '');
    const rootPath = targetPath.split('.')[0];
    let node = pimKnowledgeNodes(knowledge).find(candidate => candidate.path === rootPath);
    if (!node) return null;
    let depth = 0;
    const segments = targetPath.split('.').slice(1);
    for (const segment of segments) {
        const childPath = `${node.path}.${segment}`;
        node = pimNodeChildren({ ...node, depth }).find(candidate => candidate.path === childPath);
        if (!node) return null;
        depth += 1;
    }
    return { ...node, depth, rootDirection: pimKnowledgeNodes(knowledge).find(candidate => candidate.path === rootPath)?.direction || node.direction };
}

// Deeper selections become the centre of the next connected honeycomb. This
// keeps the information graph effectively unbounded while showing only one
// clean generation at a time.
export function pimFocusedView(knowledge = {}, expandedPaths = []) {
    const candidates = (Array.isArray(expandedPaths) ? expandedPaths : [])
        .filter(path => String(path).includes('.'))
        .reverse();
    const focusNode = candidates.map(path => pimNodeAtPath(knowledge, path)).find(node => node && pimNodeChildren(node).length);
    if (!focusNode) return null;
    const children = pimNodeChildren(focusNode).slice(0, 6);
    const nodes = children.map((node, index) => {
        const direction = HONEYCOMB_DIRECTIONS[index];
        return {
            ...node,
            direction,
            rootDirection: direction,
            depth: focusNode.depth + 1,
            position: positionedAxial(DIRECTION_AXIAL[direction]),
            parentPosition: positionedAxial({ q: 0, r: 0 }),
            childIndex: index,
            childCount: children.length
        };
    });
    const trail = [];
    const segments = focusNode.path.split('.');
    for (let index = 1; index <= segments.length; index += 1) {
        const ancestor = pimNodeAtPath(knowledge, segments.slice(0, index).join('.'));
        if (ancestor) trail.push(ancestor);
    }
    return { focusNode, nodes, trail };
}

export function pimVisibleNodes(knowledge = {}, expandedPaths = []) {
    const expanded = new Set(Array.isArray(expandedPaths) ? expandedPaths : []);
    const roots = pimKnowledgeNodes(knowledge).map(node => {
        const position = pimRootPosition(node);
        return {
            ...node,
            depth: 0,
            rootDirection: node.direction,
            position,
            parentPosition: positionedAxial({ q: 0, r: 0 }),
            childIndex: 0,
            childCount: 1
        };
    });
    const activeRoot = roots.find(node => expanded.has(node.path));
    if (!activeRoot) return roots;
    const children = pimNodeChildren(activeRoot).slice(0, 8);
    return [
        ...roots,
        ...children.map((child, index) => ({
            ...child,
            depth: 1,
            rootDirection: activeRoot.direction,
            position: pimChildPosition(activeRoot, index, children.length),
            parentPosition: activeRoot.position,
            childIndex: index,
            childCount: children.length
        }))
    ];
}

export function pimToggleExpandedPaths(expandedPaths, path) {
    const target = String(path || '');
    if (!target) return [];
    const current = Array.isArray(expandedPaths) ? expandedPaths.map(String) : [];
    const isOpen = current.includes(target);
    if (isOpen) return current.filter(candidate => candidate !== target && !candidate.startsWith(`${target}.`));
    const segments = target.split('.');
    const ancestors = segments.map((_, index) => segments.slice(0, index + 1).join('.'));
    return ancestors;
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
    return {
        center: { ...pose.position },
        right: { ...pose.right },
        up: { ...pose.up },
        normal: { ...pose.normal },
        width: (Number(options.width) || PIM_SPATIAL_CONFIG.expandedSurfaceWidthMetres) * scale,
        height: (Number(options.height) || PIM_SPATIAL_CONFIG.expandedSurfaceHeightMetres) * scale
    };
}
