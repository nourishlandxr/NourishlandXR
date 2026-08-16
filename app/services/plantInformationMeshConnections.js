/*
 * Parent/child connection geometry for the shared Plant Information Mesh.
 *
 * This module deliberately knows nothing about the DOM or canvas. Both PIM
 * renderers consume the same relationship list and edge geometry so a branch
 * cannot acquire a different set of lines just because it is being viewed in
 * Demo or Creator AR.
 */

const HEXAGON_VERTICES = Object.freeze([
    { x: .25, y: 0 },
    { x: .75, y: 0 },
    { x: 1, y: .5 },
    { x: .75, y: 1 },
    { x: .25, y: 1 },
    { x: 0, y: .5 }
]);

const EPSILON = 0.000001;

function numeric(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function pointAlongRay(origin, direction, distance) {
    return {
        x: origin.x + direction.x * distance,
        y: origin.y + direction.y * distance
    };
}

function raySegmentIntersection(origin, direction, start, end) {
    const segment = { x: end.x - start.x, y: end.y - start.y };
    const denominator = direction.x * segment.y - direction.y * segment.x;
    if (Math.abs(denominator) <= EPSILON) return null;
    const offset = { x: start.x - origin.x, y: start.y - origin.y };
    const distance = (offset.x * segment.y - offset.y * segment.x) / denominator;
    const segmentPosition = (offset.x * direction.y - offset.y * direction.x) / denominator;
    if (distance < -EPSILON || segmentPosition < -EPSILON || segmentPosition > 1 + EPSILON) return null;
    return { distance: Math.max(0, distance), point: pointAlongRay(origin, direction, Math.max(0, distance)) };
}

function normalizedDirection(start, end) {
    const vector = { x: numeric(end?.x) - numeric(start?.x), y: numeric(end?.y) - numeric(start?.y) };
    const length = Math.hypot(vector.x, vector.y);
    return length > EPSILON ? { x: vector.x / length, y: vector.y / length } : { x: 1, y: 0 };
}

/**
 * Return the point where a line from the centre of a regular flat-top hex
 * meets that hex's nearest edge. `bounds` may be in CSS pixels or canvas
 * pixels; the calculation is unit agnostic.
 */
export function pimHexEdgePoint(center, target, bounds = {}) {
    const origin = { x: numeric(center?.x), y: numeric(center?.y) };
    const direction = normalizedDirection(origin, target);
    const left = numeric(bounds.left, origin.x - numeric(bounds.width, 0) / 2);
    const top = numeric(bounds.top, origin.y - numeric(bounds.height, 0) / 2);
    const width = Math.max(EPSILON, numeric(bounds.width, 0));
    const height = Math.max(EPSILON, numeric(bounds.height, 0));
    const vertices = HEXAGON_VERTICES.map(vertex => ({
        x: left + vertex.x * width,
        y: top + vertex.y * height
    }));
    const intersections = vertices.map((vertex, index) => raySegmentIntersection(
        origin,
        direction,
        vertex,
        vertices[(index + 1) % vertices.length]
    )).filter(Boolean).sort((first, second) => first.distance - second.distance);
    return intersections[0]?.point || pointAlongRay(origin, direction, Math.min(width, height) / 2);
}

/** Return the direct relationships present in one complete visible mesh. */
export function pimConnectionPairs(nodes = [], { coreId = 'core' } = {}) {
    const source = Array.isArray(nodes) ? nodes : [];
    const byId = new Map(source
        .map(node => [String(node?.nodeId || node?.id || node?.path || ''), node])
        .filter(([id]) => id));
    return source.map(node => {
        const childId = String(node?.nodeId || node?.id || node?.path || '');
        if (!childId) return null;
        const isPrimary = Number(node?.depth) <= 0;
        const parentId = isPrimary ? String(coreId) : String(node.parentId);
        if (!parentId || parentId === childId || (parentId !== String(coreId) && !byId.has(parentId))) return null;
        return {
            id: `${parentId}->${childId}`,
            parentId,
            childId,
            parentPath: parentId === String(coreId) ? '' : String(byId.get(parentId)?.path || ''),
            childPath: String(node.path || childId),
            branchId: String(node.rootDirection || node.direction || node.path || childId),
            hue: numeric(node.hue, 112),
            depth: Math.max(0, numeric(node.depth, 0))
        };
    }).filter(Boolean);
}

/**
 * Make a small quadratic curve between two already edge-clipped endpoints.
 * The endpoints are never moved back to cell centres, so the curve remains
 * behind the cells and cannot cover their labels or borders.
 */
export function pimConnectionCurve(start, end, { bend = .12, sign = 1 } = {}) {
    const from = { x: numeric(start?.x), y: numeric(start?.y) };
    const to = { x: numeric(end?.x), y: numeric(end?.y) };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= EPSILON) {
        return { start: from, end: to, control: from, distance: 0, d: `M ${from.x} ${from.y} L ${to.x} ${to.y}` };
    }
    const normal = { x: -dy / distance, y: dx / distance };
    const offset = Math.max(3, Math.min(28, distance * Math.abs(numeric(bend, .12)))) * (numeric(sign, 1) < 0 ? -1 : 1);
    const control = {
        x: (from.x + to.x) / 2 + normal.x * offset,
        y: (from.y + to.y) / 2 + normal.y * offset
    };
    return {
        start: from,
        end: to,
        control,
        distance,
        d: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`
    };
}

export function pimConnectionCurveSign(parentId = '', childId = '') {
    let hash = 0;
    for (const character of `${parentId}:${childId}`) hash = (hash * 31 + character.charCodeAt(0)) | 0;
    return hash % 2 ? 1 : -1;
}

export function pimConnectionPathIsSelected(pair, selectedPath = '') {
    const selected = String(selectedPath || '');
    if (!selected) return false;
    const contains = (ancestor, descendant) => Boolean(ancestor)
        && (ancestor === descendant
            || descendant.startsWith(`${ancestor}.`)
            || descendant.startsWith(`${ancestor}/`));
    return selected === String(pair?.parentPath || '') || contains(pair?.childPath, selected);
}

export { HEXAGON_VERTICES };
