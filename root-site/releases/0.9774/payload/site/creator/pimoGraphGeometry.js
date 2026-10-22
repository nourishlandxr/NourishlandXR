export function pimoCellOutline(layout = {}) {
    if (layout.shape === 'drawn' && layout.outline?.length >= 3) return layout.outline;
    if (layout.shape === 'square') return [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
    const count = layout.shape === 'hexagon' ? 6 : 32;
    return Array.from({ length: count }, (_, i) => {
        const a = i / count * Math.PI * 2 - (layout.shape === 'hexagon' && layout.hexOrientation === 'flat' ? 0 : Math.PI / 2);
        const radius = layout.shape === 'organic' ? 1 + .055 * Math.sin(3 * a + .8) + .025 * Math.cos(5 * a) : 1;
        return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
    });
}
export function pimoCellPath(layout) {
    return pimoCellOutline(layout).map((p, i) => `${i ? 'L' : 'M'}${(p.x * layout.width / 2).toFixed(2)},${(p.y * layout.height / 2).toFixed(2)}`).join(' ') + ' Z';
}
export function pimoConnectionPoints(graph, edge) {
    const a = graph.layout.nodes[edge.from], b = graph.layout.nodes[edge.to]; if (!a || !b) return [];
    const waypoints = edge.waypoints || [];
    const boundary = (node, toward) => {
        const dx = toward.x - node.x, dy = toward.y - node.y, outline = pimoCellOutline(node).map(p => ({ x: p.x * node.width / 2, y: p.y * node.height / 2 })); let distance = Infinity;
        for (let i = 0; i < outline.length; i++) {
            const p = outline[i], q = outline[(i + 1) % outline.length], sx = q.x - p.x, sy = q.y - p.y, cross = dx * sy - dy * sx;
            if (Math.abs(cross) < 1e-9) continue;
            const t = (p.x * sy - p.y * sx) / cross, u = (p.x * dy - p.y * dx) / cross;
            if (t >= 0 && u >= 0 && u <= 1) distance = Math.min(distance, t);
        }
        if (!Number.isFinite(distance)) distance = 0;
        return { x: node.x + dx * distance, y: node.y + dy * distance };
    };
    const start = boundary(a, waypoints[0] || b), end = boundary(b, waypoints.at(-1) || a);
    if (!waypoints.length && graph.layout.design === 'notes' && Math.abs(end.x - start.x) > 1 && Math.abs(end.y - start.y) > 1) {
        const mid = (start.x + end.x) / 2; return [start, { x: mid, y: start.y }, { x: mid, y: end.y }, end];
    }
    return [start, ...waypoints, end];
}
export function pimoConnectionPath(points, design = 'organic') {
    if (points.length < 2) return '';
    if (points.length === 2 && design === 'organic') { const [a, b] = points, dx = (b.x - a.x) * .4; return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`; }
    return `M${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L${p.x},${p.y}`).join(' ');
}
