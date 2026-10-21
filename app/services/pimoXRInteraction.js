import { pimoCellOutline } from './pimoGraphGeometry.js';

export function pimoPointInCell(layout, point) {
    const points = pimoCellOutline(layout); let inside = false;
    const x = (point.x - layout.x) / (layout.width / 2), y = (point.y - layout.y) / (layout.height / 2);
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j];
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
}

function overlap(a, b) {
    if (Math.abs(a.x - b.x) > (a.width + b.width) / 2 + 12 || Math.abs(a.y - b.y) > (a.height + b.height) / 2 + 12) return false;
    const polygon = cell => pimoCellOutline(cell).map(p => ({ x: cell.x + p.x * cell.width / 2, y: cell.y + p.y * cell.height / 2 }));
    const pa = polygon(a), pb = polygon(b);
    for (const points of [pa, pb]) for (let i = 0; i < points.length; i++) {
        const p = points[i], q = points[(i + 1) % points.length], axis = { x: q.y - p.y, y: p.x - q.x };
        const av = pa.map(v => v.x * axis.x + v.y * axis.y), bv = pb.map(v => v.x * axis.x + v.y * axis.y);
        if (Math.max(...av) <= Math.min(...bv) || Math.max(...bv) <= Math.min(...av)) return false;
    }
    return true;
}

// Magnetic placement is visual only until release. It never adds a semantic link.
export function pimoPlacement(graph, id, point, { enabled = true } = {}) {
    const own = graph.layout.nodes[id], free = { x: point.x, y: point.y, snapped: false };
    if (!enabled || !own) return free;
    const others = Object.entries(graph.layout.nodes).filter(([other]) => other !== id).map(([, cell]) => cell);
    const threshold = Math.min(32, Math.min(own.width, own.height) * .18), candidates = [];
    if (graph.layout.design === 'classic' && own.shape === 'hexagon') {
        const stepY = Math.sqrt(3) * 110;
        for (const cell of others) for (const [x, y] of [[0, -stepY], [0, stepY], [-165, -stepY / 2], [-165, stepY / 2], [165, -stepY / 2], [165, stepY / 2]]) candidates.push({ x: cell.x + x, y: cell.y + y, snapKey: `hex:${cell.x + x},${cell.y + y}` });
    } else {
        const closest = (axis, value) => others.map(cell => cell[axis]).filter(at => Math.abs(at - value) <= threshold).sort((a, b) => Math.abs(a - value) - Math.abs(b - value))[0];
        const x = closest('x', point.x), y = closest('y', point.y);
        if (x !== undefined || y !== undefined) candidates.push({ x: x ?? point.x, y: y ?? point.y, snapKey: `align:${x ?? '*'},${y ?? '*'}` });
        if (graph.layout.design === 'notes') for (const cell of others) for (const [x, y] of [[245, 0], [-245, 0], [0, 245], [0, -245]]) candidates.push({ x: cell.x + x, y: cell.y + y, snapKey: `grid:${cell.x + x},${cell.y + y}` });
    }
    candidates.sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y));
    const target = candidates.find(p => Math.hypot(p.x - point.x, p.y - point.y) <= threshold && !others.some(cell => overlap({ ...own, ...p }, cell)));
    return target ? { ...target, snapped: true } : free;
}

// Trigger, grip and hand pinch all acquire the same cell lock.
export function createPimoGrabOwnership() {
    const held = new Map();
    return {
        acquire(cell, source) { if (held.has(cell)) return held.get(cell) === source; held.set(cell, source); return true; },
        release(source) { for (const [cell, owner] of held) if (owner === source) held.delete(cell); },
        owner: cell => held.get(cell), clear: () => held.clear()
    };
}
