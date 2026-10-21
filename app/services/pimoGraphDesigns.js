// Design is presentation only: changing it never rewrites cells, sources or semantic links.
export const PIMO_DESIGNS = [
    { id: 'classic', title: 'Classic flower', detail: 'Hexagon flower', icon: 'flower', shape: 'hexagon', width: 200, height: Math.sqrt(3) * 100 },
    { id: 'notes', title: 'Notes mesh', detail: 'Simple square cells', icon: 'notes', shape: 'square', width: 174, height: 174 },
    { id: 'organic', title: 'Organic', detail: 'Soft, roundish cells', icon: 'organic', shape: 'organic', width: 176, height: 126 }
];
const clone = value => structuredClone(value);
const hexSteps = [[0, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [0, 1]];
const hexPoint = ([q, r]) => ({ x: q * 165, y: Math.sqrt(3) * 110 * (r + q / 2) });
const key = ([q, r]) => `${q},${r}`;

function children(graph, id) { return graph.edges.filter(edge => edge.kind === 'branch' && edge.from === id).map(edge => edge.to); }
function roots(graph) { const parented = new Set(graph.edges.filter(edge => edge.kind === 'branch').map(edge => edge.to)); return graph.nodes.filter(node => !parented.has(node.id)); }

function classicPositions(graph) {
    const positions = {}, axial = new Map(), occupied = new Set(), queue = [];
    function reserve(id, value) { axial.set(id, value); occupied.add(key(value)); positions[id] = hexPoint(value); queue.push(id); }
    roots(graph).forEach((node, i) => reserve(node.id, [i * 8, 0]));
    for (let index = 0; index < queue.length; index++) {
        const id = queue[index], origin = axial.get(id);
        for (const child of children(graph, id)) {
            if (axial.has(child)) continue;
            let available;
            for (let radius = 1; radius <= graph.nodes.length + 1 && !available; radius++) {
                const candidates = [];
                for (const [dq, dr] of hexSteps) { const at = [origin[0] + dq * radius, origin[1] + dr * radius]; if (!occupied.has(key(at))) candidates.push(at); }
                if (!candidates.length) for (let q = -radius; q <= radius; q++) for (let r = -radius; r <= radius; r++) {
                    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) !== radius) continue;
                    const at = [origin[0] + q, origin[1] + r]; if (!occupied.has(key(at))) candidates.push(at);
                }
                // Keep six first-level petals in compass order; deeper growth opens outward.
                if (graph.edges.some(edge => edge.kind === 'branch' && edge.to === id)) {
                    const p = hexPoint(origin); candidates.sort((a, b) => { const pa = hexPoint(a), pb = hexPoint(b); return (pb.x - p.x) * p.x + (pb.y - p.y) * p.y - ((pa.x - p.x) * p.x + (pa.y - p.y) * p.y); });
                }
                available = candidates[0];
            }
            reserve(child, available);
        }
    }
    return positions;
}

function notesPositions(graph) {
    const columns = Math.max(1, Math.ceil(Math.sqrt(graph.nodes.length))), rows = Math.ceil(graph.nodes.length / columns);
    return Object.fromEntries(graph.nodes.map((node, i) => [node.id, { x: (i % columns - (columns - 1) / 2) * 245, y: (Math.floor(i / columns) - (rows - 1) / 2) * 245 }]));
}

function freshLayout(graph, design) {
    const config = PIMO_DESIGNS.find(item => item.id === design), positions = design === 'classic' ? classicPositions(graph) : design === 'notes' ? notesPositions(graph) : graph.layout.nodes;
    return Object.fromEntries(graph.nodes.map(node => [node.id, {
        ...graph.layout.nodes[node.id], ...positions[node.id], shape: config.shape, width: config.width, height: config.height,
        ...(design === 'classic' ? { hexOrientation: 'flat' } : {})
    }]));
}

export function applyPimoDesign(graph, design) {
    if (!PIMO_DESIGNS.some(item => item.id === design)) throw Error('Choose Classic flower, Notes mesh or Organic.');
    const next = clone(graph), previous = next.layout.design || 'organic';
    next.layout.designLayouts ||= {};
    next.layout.designLayouts[previous] = { nodes: clone(next.layout.nodes), routes: Object.fromEntries(next.edges.map(edge => [edge.id, clone(edge.waypoints || [])])) };
    if (design === previous) { next.layout.design = design; return next; }
    const saved = next.layout.designLayouts[design], generated = freshLayout(next, design);
    const newPositions = [];
    next.layout.nodes = Object.fromEntries(next.nodes.map(node => {
        const current = next.layout.nodes[node.id], target = clone(saved?.nodes?.[node.id] || generated[node.id]);
        // Color and drawn outlines travel with the cell even when its displayed silhouette changes.
        target.color = current.color; if (current.outline) target.outline = clone(current.outline);
        if (!saved?.nodes?.[node.id] && saved) {
            const occupied = [...Object.entries(saved.nodes).filter(([id]) => next.nodes.some(item => item.id === id)).map(([, value]) => value), ...newPositions];
            for (let attempt = 0; attempt < 100 && occupied.some(p => Math.abs(p.x - target.x) < (p.width + target.width) / 2 + 12 && Math.abs(p.y - target.y) < (p.height + target.height) / 2 + 12); attempt++) target.y += target.height + 42;
        }
        newPositions.push(target);
        return [node.id, target];
    }));
    next.edges.forEach(edge => { edge.waypoints = clone(saved?.routes?.[edge.id] || []); });
    next.layout.design = design;
    return next;
}

export function arrangePimoDesign(graph) {
    const next = clone(graph); next.layout.nodes = freshLayout(next, next.layout.design || 'organic'); next.edges.forEach(edge => { edge.waypoints = []; }); return next;
}

export function pimoDesignCellDefaults(graph) {
    const config = PIMO_DESIGNS.find(item => item.id === graph.layout.design) || PIMO_DESIGNS[2];
    return { shape: config.shape, width: config.width, height: config.height, ...(config.id === 'classic' ? { hexOrientation: 'flat' } : {}) };
}

export function pimoCellAppearance(graph, layout) {
    if (graph.layout.design !== 'notes') return { fill: layout.color, text: '#fffdf3', stroke: '#ffffff75' };
    const color = layout.color.slice(1), pale = [0, 2, 4].map((i, index) => Math.round(parseInt(color.slice(i, i + 2), 16) * .13 + [255, 253, 245][index] * .87).toString(16).padStart(2, '0')).join('');
    return { fill: `#${pale}`, text: '#294439', stroke: layout.color };
}
