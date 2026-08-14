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

// The canonical renderer uses one true axial hex lattice. The six primary
// cells are the six neighbours of the core; their centres are calculated from
// the same cell dimensions that the DOM and canvas renderers draw. Keeping
// this in axial coordinates is what makes neighbouring hexagons share edges
// instead of drifting apart as the surface is resized.
const DIRECTION_LAYOUT = Object.freeze({
    top: Object.freeze({ x: 0, y: -1, tangentX: 1, tangentY: 0 }),
    'upper-right': Object.freeze({ x: 1, y: -1, tangentX: 1, tangentY: 1 }),
    'lower-right': Object.freeze({ x: 1, y: 0, tangentX: 0, tangentY: 1 }),
    bottom: Object.freeze({ x: 0, y: 1, tangentX: 1, tangentY: 0 }),
    'lower-left': Object.freeze({ x: -1, y: 1, tangentX: 0, tangentY: 1 }),
    'upper-left': Object.freeze({ x: -1, y: 0, tangentX: -1, tangentY: 1 })
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

// AR deliberately shows a compact, readable projection of the full PIM. The
// complete hierarchy remains in the shared document model and Web Hub; this
// limit only controls what blooms into the spatial surface.
export const AR_PIM_MAX_VISIBLE_CHILDREN = 3;
export const PIM_SPATIAL_LAYOUT_OPTIONS = Object.freeze({
    safeArea: Object.freeze({ left: 5, right: 95, top: 6, bottom: 84 }),
    layoutWidth: 1440,
    layoutHeight: 1080
});

const PIM_DEFAULT_SAFE_AREA = Object.freeze({ left: 6, right: 94, top: 6, bottom: 94 });
const PIM_DEFAULT_NODE_RADIUS_PERCENT = 12;
const PIM_DEFAULT_VIEWPORT = Object.freeze({ width: 390, height: 844 });
const PIM_MINIMUM_READABLE_CELL_PIXELS = 44;
const addAxial = (left, right) => ({ q: left.q + right.q, r: left.r + right.r });
const scaleAxial = (point, amount) => ({ q: point.q * amount, r: point.r * amount });

function axialVisual(point = { q: 0, r: 0 }) {
    return {
        x: Number(point.q) * .75,
        y: Number(point.r) + Number(point.q) * .5
    };
}

function positionedAxial(point, metrics = null) {
    const visual = axialVisual(point);
    const stepXPercent = metrics?.stepXPercent ?? 13.9;
    const stepYPercent = metrics?.stepYPercent ?? 16.04;
    return {
        // Keep the authored radial position intact until the complete visible
        // mesh is known. Clamping each cell here created the invisible
        // rectangular boundary that made deep branches overlap at the edge.
        x: 50 + visual.x * stepXPercent,
        y: 50 + visual.y * stepYPercent,
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

export function pimArVisibleChildren(node) {
    return pimNodeChildren(node).slice(0, AR_PIM_MAX_VISIBLE_CHILDREN);
}

export function pimRootPosition(node, options = {}) {
    return positionedAxial(
        DIRECTION_AXIAL[node?.direction] || { q: 0, r: 0 },
        pimLayoutMetrics(options)
    );
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

export function pimChildPosition(parent, childIndex, childCount, options = {}) {
    const axials = outwardChildAxials(parent, childCount);
    return positionedAxial(
        axials[childIndex] || parent?.position?.axial || { q: 0, r: 0 },
        pimLayoutMetrics(options)
    );
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
    const selected = String(selectedNodeId || '');
    const expanded = expandedIdSet(expandedNodeIds);
    const activeBranch = primaryPath(selected) || primaryPath([...expanded][0]);
    return {
        selectedNodeId: selected,
        expandedNodeIds: new Set([...expanded].filter(path => !activeBranch || primaryPath(path) === activeBranch)),
        focusedPlantId: String(focusedPlantId || '')
    };
}

function primaryPath(path) {
    return ancestorPaths(path)[0] || String(path || '');
}

function removePathAndDescendants(paths, targetPath) {
    return new Set([...paths].filter(candidate => candidate !== targetPath
        && !candidate.startsWith(`${targetPath}.`)
        && !candidate.startsWith(`${targetPath}/`)));
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
        next.expandedNodeIds = removePathAndDescendants(next.expandedNodeIds, targetId);
        return next;
    }
    // AR has one open branch at a time. Switching to another primary parent
    // closes only the old bloom; the source document and Web Hub hierarchy are
    // never mutated or filtered.
    const branch = primaryPath(targetId);
    next.expandedNodeIds = new Set([...next.expandedNodeIds]
        .filter(candidate => primaryPath(candidate) === branch));
    ancestorPaths(targetId).forEach(ancestor => next.expandedNodeIds.add(ancestor));
    return next;
}

export function pimResetInteractionState(state = {}) {
    return pimCreateInteractionState([], '', state?.focusedPlantId || '');
}

export function pimExpandedNodeIds(state = {}) {
    return [...expandedIdSet(state?.expandedNodeIds)];
}

function safeNumber(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function clampNumber(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, Number(value)));
}

/**
 * Pixel-aware geometry shared by the DOM, WebGL texture and hit-test paths.
 * Percentages are derived from the actual surface dimensions instead of from
 * hard-coded viewport percentages, which is what previously collapsed cells
 * together on narrow portrait phones.
 */
export function pimLayoutMetrics(options = {}) {
    const viewportWidth = Math.max(240, safeNumber(options.viewportWidth, PIM_DEFAULT_VIEWPORT.width));
    const viewportHeight = Math.max(240, safeNumber(options.viewportHeight, PIM_DEFAULT_VIEWPORT.height));
    const layoutWidth = Math.max(220, safeNumber(
        options.layoutWidth,
        Math.min(Math.max(240, viewportWidth - 24), 960)
    ));
    const layoutHeight = Math.max(220, safeNumber(
        options.layoutHeight,
        Math.min(viewportHeight * .62, 620)
    ));
    const responsiveCellWidth = viewportWidth <= 430
        ? clampNumber(viewportWidth * .25, 84, 108)
        : clampNumber(viewportWidth * .11, 76, 124);
    const cellWidthPixels = Math.max(44, safeNumber(options.cellWidthPixels, responsiveCellWidth));
    const cellHeightPixels = Math.max(38, safeNumber(options.cellHeightPixels, cellWidthPixels * .8660254));
    // `axialVisual` converts q into .75 cell widths and r into one cell
    // height. A non-zero gap here turns the flower into a disconnected set of
    // cards, so keep the value as metadata only and never add it to a lattice
    // step.
    const gapPixels = Math.max(0, safeNumber(options.gapPixels, 0));
    return {
        viewportWidth,
        viewportHeight,
        layoutWidth,
        layoutHeight,
        cellWidthPixels,
        cellHeightPixels,
        gapPixels,
        cellWidthPercent: cellWidthPixels / layoutWidth * 100,
        cellHeightPercent: cellHeightPixels / layoutHeight * 100,
        stepXPercent: cellWidthPixels / layoutWidth * 100,
        stepYPercent: cellHeightPixels / layoutHeight * 100,
        minimumReadableScale: Math.min(1, PIM_MINIMUM_READABLE_CELL_PIXELS / cellWidthPixels)
    };
}

function normalizeSafeArea(area = PIM_DEFAULT_SAFE_AREA) {
    const left = Math.max(0, Math.min(45, safeNumber(area.left, PIM_DEFAULT_SAFE_AREA.left)));
    const right = Math.max(left + 10, Math.min(100, safeNumber(area.right, PIM_DEFAULT_SAFE_AREA.right)));
    const top = Math.max(0, Math.min(45, safeNumber(area.top, PIM_DEFAULT_SAFE_AREA.top)));
    const bottom = Math.max(top + 10, Math.min(100, safeNumber(area.bottom, PIM_DEFAULT_SAFE_AREA.bottom)));
    return { left, right, top, bottom };
}

/**
 * Convert real viewport insets into the percentage coordinate space shared by
 * the DOM and texture renderers. Callers can pass the visual viewport and the
 * bottom action/dock inset after a resize or orientation change.
 */
export function pimViewportSafeArea(width, height, options = {}) {
    const viewportWidth = Math.max(1, safeNumber(width, 390));
    const viewportHeight = Math.max(1, safeNumber(height, 844));
    const horizontalInset = Math.max(0, safeNumber(options.horizontalInset, 24));
    const topInset = Math.max(0, safeNumber(options.topInset, 24));
    const bottomInset = Math.max(0, safeNumber(options.bottomInset, 24));
    return normalizeSafeArea({
        left: horizontalInset / viewportWidth * 100,
        right: 100 - horizontalInset / viewportWidth * 100,
        top: topInset / viewportHeight * 100,
        bottom: 100 - bottomInset / viewportHeight * 100
    });
}

function pimSafeAreaFromOptions(options = {}) {
    if (options.safeArea) return normalizeSafeArea(options.safeArea);
    if (Number.isFinite(Number(options.viewportWidth)) && Number.isFinite(Number(options.viewportHeight))) {
        return pimViewportSafeArea(options.viewportWidth, options.viewportHeight, options);
    }
    return PIM_DEFAULT_SAFE_AREA;
}

function pimCellDimensions(node, options = {}) {
    const fallbackRadius = Math.max(0, safeNumber(options.nodeRadiusPercent, PIM_DEFAULT_NODE_RADIUS_PERCENT));
    if (Number.isFinite(Number(node?.layoutCellWidthPercent)) && Number.isFinite(Number(node?.layoutCellHeightPercent))) {
        return {
            width: Number(node.layoutCellWidthPercent),
            height: Number(node.layoutCellHeightPercent)
        };
    }
    const scale = options.nodeRadiusPercent === undefined
        ? Math.max(.01, safeNumber(node?.layoutScale, 1))
        : 1;
    return { width: fallbackRadius * 2 * scale, height: fallbackRadius * 2 * scale };
}

function pimCellRectangle(id, point, dimensions, role = 'node') {
    const halfWidth = dimensions.width / 2;
    const halfHeight = dimensions.height / 2;
    return {
        id,
        role,
        left: Number(point.x) - halfWidth,
        right: Number(point.x) + halfWidth,
        top: Number(point.y) - halfHeight,
        bottom: Number(point.y) + halfHeight,
        width: dimensions.width,
        height: dimensions.height
    };
}

/** Return axis-aligned rendered cell rectangles, including the plant core. */
export function pimVisibleCellBounds(nodes = [], options = {}) {
    const source = Array.isArray(nodes) ? nodes : [];
    const reference = source[0];
    const dimensions = pimCellDimensions(reference, options);
    const center = reference?.layoutCenterPosition || { x: 50, y: 50 };
    return [
        pimCellRectangle('core', center, dimensions, 'center'),
        ...source.map(node => pimCellRectangle(
            node.nodeId || node.path,
            node.position || center,
            pimCellDimensions(node, options)
        ))
    ];
}

function rawBounds(nodes, options = {}) {
    return pimVisibleCellBounds(nodes, options).reduce((bounds, rectangle) => ({
        left: Math.min(bounds.left, rectangle.left),
        right: Math.max(bounds.right, rectangle.right),
        top: Math.min(bounds.top, rectangle.top),
        bottom: Math.max(bounds.bottom, rectangle.bottom)
    }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
}

/** Return the complete visible mesh bounds, including the central plant cell. */
export function pimVisibleNodeBounds(nodes = [], options = {}) {
    return rawBounds(nodes, options);
}

function transformPimPoint(point, scale, translation) {
    if (!point) return point;
    return {
        ...point,
        x: 50 + (Number(point.x) - 50) * scale + translation.x,
        y: 50 + (Number(point.y) - 50) * scale + translation.y
    };
}

/**
 * Fit the complete visible tree as one rigid mesh. The authored axial layout
 * is scaled uniformly only when required; translation is then applied to the
 * whole mesh, so parent/child direction and spacing remain intact.
 */
export function pimCorrectVisibleNodeBounds(nodes = [], options = {}) {
    const source = Array.isArray(nodes) ? nodes : [];
    const safeArea = pimSafeAreaFromOptions(options);
    const preferredMinimumScale = Math.max(.4, Math.min(1, safeNumber(
        options.minimumScale,
        source[0]?.layoutMinimumReadableScale || .56
    )));
    // `fixedLayoutBounds` is the closed seven-cell flower measured before a
    // bloom. Expansion uses this same reference forever, so adding children
    // can never zoom, recenter, or resize the existing flower.
    const sourceBounds = options.fixedLayoutBounds || rawBounds(source, options);
    const availableWidth = Math.max(1, safeArea.right - safeArea.left);
    const availableHeight = Math.max(1, safeArea.bottom - safeArea.top);
    const sourceWidth = Math.max(1, sourceBounds.right - sourceBounds.left);
    const sourceHeight = Math.max(1, sourceBounds.bottom - sourceBounds.top);
    // Fitting the complete mesh is mandatory. `preferredMinimumScale` remains
    // diagnostic metadata; text is protected separately by CSS/canvas font
    // floors when an unusually dense tree needs a smaller geometric scale.
    const scale = Math.max(.05, Math.min(1, availableWidth / sourceWidth, availableHeight / sourceHeight));
    const scaledBounds = {
        left: 50 + (sourceBounds.left - 50) * scale,
        right: 50 + (sourceBounds.right - 50) * scale,
        top: 50 + (sourceBounds.top - 50) * scale,
        bottom: 50 + (sourceBounds.bottom - 50) * scale
    };
    const translation = { x: 0, y: 0 };
    if (scaledBounds.left < safeArea.left) translation.x = safeArea.left - scaledBounds.left;
    if (scaledBounds.right + translation.x > safeArea.right) translation.x = safeArea.right - scaledBounds.right;
    if (scaledBounds.top < safeArea.top) translation.y = safeArea.top - scaledBounds.top;
    if (scaledBounds.bottom + translation.y > safeArea.bottom) translation.y = safeArea.bottom - scaledBounds.bottom;
    const centerPosition = transformPimPoint(source[0]?.layoutCenterPosition || { x: 50, y: 50 }, scale, translation);
    return source.map(node => ({
        ...node,
        position: transformPimPoint(node.position, scale, translation),
        parentPosition: node.parentPosition
            ? transformPimPoint(node.parentPosition, scale, translation)
            : node.parentPosition,
        layoutScale: Math.max(.01, safeNumber(node.layoutScale, 1)) * scale,
        layoutCellWidthPercent: pimCellDimensions(node, options).width * scale,
        layoutCellHeightPercent: pimCellDimensions(node, options).height * scale,
        layoutCellWidthPixels: Math.max(1, safeNumber(node.layoutCellWidthPixels, 0) * scale),
        layoutCellHeightPixels: Math.max(1, safeNumber(node.layoutCellHeightPixels, 0) * scale),
        layoutCenterPosition: centerPosition,
        layoutTranslation: { ...translation },
        layoutSafeArea: { ...safeArea },
        layoutPreferredMinimumScale: preferredMinimumScale,
        layoutBelowPreferredScale: scale < preferredMinimumScale
    }));
}

function layoutPosition(grid, metrics) {
    const point = positionedAxial({ q: Number(grid.x), r: Number(grid.y) }, metrics);
    return {
        x: point.x,
        y: point.y,
        gridX: Number(grid.x),
        gridY: Number(grid.y),
        axial: { q: Number(grid.x), r: Number(grid.y) }
    };
}

function rectanglesOverlap(left, right, epsilon = .0001) {
    return left.left < right.right - epsilon
        && left.right > right.left + epsilon
        && left.top < right.bottom - epsilon
        && left.bottom > right.top + epsilon;
}

function siblingTarget(childIndex, childCount) {
    const count = Math.max(1, Number(childCount) || 1);
    const index = Math.max(0, Number(childIndex) || 0);
    if (count === 1) return { radial: 1, tangent: 0 };
    const rowStart = Math.floor(index / 3) * 3;
    const rowCount = Math.min(3, count - rowStart);
    const indexInRow = index - rowStart;
    return {
        radial: 1 + Math.floor(index / 3),
        tangent: indexInRow - (rowCount - 1) / 2
    };
}

function placePimRecord(record, parent, occupied, metrics) {
    const direction = DIRECTION_LAYOUT[record.rootDirection] || DIRECTION_LAYOUT.top;
    const sibling = siblingTarget(record.childIndex, record.childCount);
    const target = {
        x: parent.layoutGrid.x + direction.x * sibling.radial + direction.tangentX * sibling.tangent,
        y: parent.layoutGrid.y + direction.y * sibling.radial + direction.tangentY * sibling.tangent
    };
    // Prefer the authored three-cell outward cluster around the real parent.
    // The fallback below is only for an actual collision with another branch.
    const preferred = pimChildPosition(parent, record.childIndex, record.childCount, metrics);
    const preferredGrid = { x: preferred.axial.q, y: preferred.axial.r };
    const preferredKey = `${preferredGrid.x}:${preferredGrid.y}`;
    if (!occupied.has(preferredKey)) {
        occupied.add(preferredKey);
        record.layoutGrid = preferredGrid;
        record.position = layoutPosition(preferredGrid, metrics);
        return;
    }
    const directionLength = Math.max(.001, Math.hypot(direction.x, direction.y));
    const candidates = [];
    for (let radius = 1; radius <= 12; radius += 1) {
        for (let y = -radius; y <= radius; y += 1) {
            for (let x = -radius; x <= radius; x += 1) {
                if (Math.max(Math.abs(x), Math.abs(y)) !== radius) continue;
                const fromParent = { x: x - parent.layoutGrid.x, y: y - parent.layoutGrid.y };
                const outward = (fromParent.x * direction.x + fromParent.y * direction.y) / directionLength;
                // First-generation petals preserve the branch's authored
                // radial direction. Deeper generations may turn along that
                // branch's tangent when the straight continuation would
                // force the entire phone mesh to shrink below readable size.
                // They still attach to their real parent and never fold back
                // toward the plant core.
                const minimumOutward = record.depth > 1 ? -.05 : .45;
                if (outward < minimumOutward) continue;
                const gridKey = `${x}:${y}`;
                // AABB rectangles overlap for every pair of neighbouring
                // regular hexagons, including the intended shared edge. The
                // axial cell itself is therefore the collision primitive.
                if (occupied.has(gridKey)) continue;
                const point = layoutPosition({ x, y }, metrics);
                const rectangle = pimCellRectangle(record.path, point, {
                    width: metrics.cellWidthPercent,
                    height: metrics.cellHeightPercent
                });
                const distanceToTarget = Math.hypot(x - target.x, y - target.y);
                const distanceToParent = Math.hypot(fromParent.x, fromParent.y);
                const portraitPackingPenalty = metrics.viewportWidth < metrics.viewportHeight
                    ? Math.max(0, Math.abs(x) - 2) * 300
                        + Math.max(0, Math.abs(y) - 3) * 300
                    : 0;
                candidates.push({
                    grid: { x, y },
                    point,
                    rectangle,
                    score: distanceToTarget * 100 + distanceToParent * 4 + portraitPackingPenalty + radius * .01
                });
            }
        }
        if (candidates.length) break;
    }
    candidates.sort((left, right) => left.score - right.score
        || Math.abs(left.grid.x) - Math.abs(right.grid.x)
        || Math.abs(left.grid.y) - Math.abs(right.grid.y)
        || left.grid.y - right.grid.y
        || left.grid.x - right.grid.x);
    const chosen = candidates[0] || (() => {
        const grid = { x: Math.round(target.x), y: Math.round(target.y) };
        const point = layoutPosition(grid, metrics);
        return {
            grid,
            point,
            rectangle: pimCellRectangle(record.path, point, {
                width: metrics.cellWidthPercent,
                height: metrics.cellHeightPercent
            })
        };
    })();
    occupied.add(`${chosen.grid.x}:${chosen.grid.y}`);
    record.layoutGrid = chosen.grid;
    record.position = chosen.point;
}

/**
 * Rebuild the complete visible tree on a single collision lattice. Existing
 * generations are placed before new descendants, so a deeper expansion can
 * never replace or push an already-rendered sibling into a duplicate slot.
 */
export function pimVisibleNodes(knowledge = {}, expandedPaths = [], options = {}) {
    const expanded = expandedIdSet(expandedPaths);
    const selectedNodeId = String(options.selectedNodeId || '');
    const selectedPathParts = ancestorPaths(selectedNodeId);
    const selectedAncestors = new Set(selectedPathParts.slice(0, -1));
    const metrics = pimLayoutMetrics(options);
    const layoutRecords = [];
    let order = 0;

    const makeRecord = (node, depth, rootDirection, parentRecord, childIndex, childCount) => {
        const record = {
            ...node,
            nodeId: node.path,
            parentId: node.parentId === 'core' ? null : node.parentId,
            depth,
            rootDirection,
            childIndex,
            childCount,
            layoutCellWidthPercent: metrics.cellWidthPercent,
            layoutCellHeightPercent: metrics.cellHeightPercent,
            layoutCellWidthPixels: metrics.cellWidthPixels,
            layoutCellHeightPixels: metrics.cellHeightPixels,
            layoutMinimumReadableScale: metrics.minimumReadableScale,
            _pimOrder: order++,
            _pimParentPath: parentRecord?.path || ''
        };
        layoutRecords.push(record);
        return record;
    };

    const visit = (node, depth, rootDirection, parentRecord, childIndex, childCount) => {
        const record = makeRecord(node, depth, rootDirection, parentRecord, childIndex, childCount);
        const children = pimArVisibleChildren({ ...node, depth });
        const open = expanded.has(node.path) || selectedAncestors.has(node.path);
        if (open && children.length) {
            children.forEach((child, index) => visit(child, depth + 1, rootDirection, record, index, children.length));
        }
    };

    pimKnowledgeNodes(knowledge).forEach(root => visit(root, 0, root.direction, null, 0, 1));

    const occupied = new Set();
    const byPath = new Map(layoutRecords.map(record => [record.path, record]));
    const corePosition = layoutPosition({ x: 0, y: 0 }, metrics);
    occupied.add('0:0');
    layoutRecords.filter(record => record.depth === 0).forEach(record => {
        const direction = DIRECTION_LAYOUT[record.rootDirection] || DIRECTION_LAYOUT.top;
        record.layoutGrid = { x: direction.x, y: direction.y };
        record.position = layoutPosition(record.layoutGrid, metrics);
        occupied.add(`${record.layoutGrid.x}:${record.layoutGrid.y}`);
    });
    const closedFlowerBounds = rawBounds(layoutRecords.filter(record => record.depth === 0), options);
    layoutRecords
        .filter(record => record.depth > 0)
        .sort((left, right) => left.depth - right.depth || left._pimOrder - right._pimOrder)
        .forEach(record => {
            const parent = byPath.get(record._pimParentPath);
            placePimRecord(record, parent, occupied, metrics);
        });
    layoutRecords.forEach(record => {
        const parent = byPath.get(record._pimParentPath);
        record.parentPosition = parent?.position || corePosition;
    });

    return pimCorrectVisibleNodeBounds(layoutRecords, {
        ...options,
        fixedLayoutBounds: closedFlowerBounds
    })
        .sort((left, right) => left._pimOrder - right._pimOrder)
        .map(record => {
            const { _pimOrder, _pimParentPath, ...publicRecord } = record;
            return publicRecord;
        });
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
