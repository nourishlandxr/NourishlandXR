const ROOT_POSITIONS = Object.freeze({
    'left-0': Object.freeze({ x: 35, y: 25 }),
    'left-1': Object.freeze({ x: 22, y: 50 }),
    'left-2': Object.freeze({ x: 35, y: 75 }),
    'right-0': Object.freeze({ x: 65, y: 25 }),
    'right-1': Object.freeze({ x: 78, y: 50 }),
    'right-2': Object.freeze({ x: 65, y: 75 })
});

const clampPercentage = value => Math.max(6, Math.min(94, value));

function splitKnowledgeDetails(value) {
    return String(value || '')
        .split(/\s*[\u00b7\u2022]\s*|\.\s+(?=[A-Z])|;\s*/)
        .map(part => part.trim())
        .filter(Boolean)
        .slice(0, 3);
}

function detailLabel(parentLabel, detail, index) {
    const namedDetail = String(detail || '').match(/^([^:]{2,32}):/);
    return (namedDetail?.[1] || `${parentLabel} ${index + 1}`).trim().toUpperCase();
}

function normalizeNode(item, path, parentPath = 'core') {
    const [label, value, children] = Array.isArray(item)
        ? item
        : [item?.label, item?.value, item?.children];
    return {
        path,
        id: path,
        parentPath,
        label: String(label || 'Information'),
        value: String(value || ''),
        children: Array.isArray(children) ? children : null
    };
}

export function pimKnowledgeNodes(knowledge = {}) {
    return ['left', 'right'].flatMap(side => (Array.isArray(knowledge[side]) ? knowledge[side] : [])
        .slice(0, 3)
        .map((item, index) => normalizeNode(item, `${side}-${index}`)));
}

export function pimNodeChildren(node) {
    const explicitChildren = Array.isArray(node?.children) ? node.children : [];
    const details = explicitChildren.length
        ? explicitChildren
        : splitKnowledgeDetails(node?.value);
    if (!details.length || /^add in web mode$/i.test(String(node?.value || '').trim())) return [];
    // A single leaf fact is already the terminal information petal. Do not
    // manufacture an endless chain of duplicate cells from that same fact.
    if (!explicitChildren.length && node?.depth > 0 && details.length === 1) return [];
    return details.map((detail, index) => {
        const child = Array.isArray(detail)
            ? detail
            : [detailLabel(node.label, detail, index), detail];
        return normalizeNode(child, `${node.path}.${index + 1}`, node.path);
    });
}

export function pimRootPosition(node) {
    return ROOT_POSITIONS[node?.path] || Object.freeze({ x: 50, y: 50 });
}

export function pimChildPosition(parent, childIndex, childCount) {
    const parentPosition = parent?.position || { x: 50, y: 50 };
    const outwardAngle = Math.atan2(parentPosition.y - 50, parentPosition.x - 50);
    const spread = childCount > 1 ? .62 : 0;
    const angle = outwardAngle + (childIndex - (childCount - 1) / 2) * spread;
    const distance = parent?.depth ? 10 : 12;
    return {
        x: clampPercentage(parentPosition.x + Math.cos(angle) * distance),
        y: clampPercentage(parentPosition.y + Math.sin(angle) * distance)
    };
}

export function pimVisibleNodes(knowledge = {}, expandedPaths = []) {
    const expanded = new Set(Array.isArray(expandedPaths) ? expandedPaths : []);
    const visible = [];
    const visit = (node, depth, position, parentPosition, childIndex = 0, childCount = 1) => {
        const positionedNode = {
            ...node,
            depth,
            position,
            parentPosition,
            childIndex,
            childCount
        };
        visible.push(positionedNode);
        if (!expanded.has(node.path)) return;
        const children = pimNodeChildren(node);
        children.forEach((child, index) => visit(
            child,
            depth + 1,
            pimChildPosition(positionedNode, index, children.length),
            position,
            index,
            children.length
        ));
    };
    pimKnowledgeNodes(knowledge).forEach(node => visit(
        node,
        0,
        pimRootPosition(node),
        { x: 50, y: 50 }
    ));
    return visible;
}

export function pimToggleExpandedPaths(expandedPaths, path) {
    const expanded = new Set(Array.isArray(expandedPaths) ? expandedPaths : []);
    if ([...expanded].some(candidate => candidate === path || candidate.startsWith(`${path}.`))) {
        [...expanded].filter(candidate => candidate === path || candidate.startsWith(`${path}.`)).forEach(candidate => expanded.delete(candidate));
    } else {
        expanded.add(path);
    }
    return [...expanded];
}
