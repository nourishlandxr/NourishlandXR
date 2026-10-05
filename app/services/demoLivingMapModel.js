const finite = value => Number.isFinite(Number(value));
const ease = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
export const LIVING_MAP_DURATION_MS = 13000;

// One common transform preserves relative locations. Screen anchors are the
// placement coordinates of the flat demo; XR uses session-local ground x/z.
export function createDemoLivingMapModel(records, { simulated = false } = {}) {
    const placed = records.filter(record => ['plant', 'note', 'zone'].includes(record.demoType)).flatMap(record => {
        const anchor = simulated && record.simulatedAnchor;
        const x = anchor ? anchor.x : record.position?.x;
        const z = anchor ? anchor.y : record.position?.z;
        if (!finite(x) || !finite(z)) return [];
        return [{ id: record.id, type: record.demoType, areaId: record.demoAreaId,
            name: record.demoType === 'zone' ? record.demoZoneName : record.name,
            x: Number(x), z: Number(z), linked: Boolean(record.demoLinkVisible) }];
    });
    if (!placed.length) return { items: [], areas: [], links: [] };
    const xs = placed.map(item => item.x), zs = placed.map(item => item.z);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    const scale = Math.min(8 / Math.max(1, Math.max(...xs) - Math.min(...xs)), 4.8 / Math.max(1, Math.max(...zs) - Math.min(...zs)));
    const items = placed.map(item => ({ ...item, x: (item.x - centerX) * scale, z: (item.z - centerZ) * scale }));
    const areas = items.filter(item => item.type === 'zone').map(totem => {
        const members = items.filter(item => item.id === totem.id || item.areaId === totem.id);
        return { id: totem.id, name: totem.name, totem, members,
            left: Math.min(...members.map(item => item.x)) - .65, right: Math.max(...members.map(item => item.x)) + .65,
            near: Math.max(...members.map(item => item.z)) + .65, far: Math.min(...members.map(item => item.z)) - .65 };
    });
    const linked = areas.filter(area => area.totem.linked);
    return { items, areas, links: linked.length === 2 ? [[linked[0].totem, linked[1].totem]] : [] };
}

// Each Area starts with its own Totem. Its plants follow in order, then Notes
// and a boundary. Positions remain unchanged throughout the demonstration.
export function createDemoLivingMapSchedule(model) {
    const items = {}, areas = {};
    let cursor = 800;
    const add = (item, startAt, duration = 650) => { items[item.id] = { startAt, duration }; };
    for (const area of model.areas) {
        add(area.totem, cursor);
        cursor += 1050;
        const plants = area.members.filter(item => item.type === 'plant');
        plants.forEach((item, index) => add(item, cursor + index * 400));
        if (plants.length) cursor += (plants.length - 1) * 400 + 900;
        const notes = area.members.filter(item => item.type === 'note');
        notes.forEach((item, index) => add(item, cursor + index * 300, 450));
        if (notes.length) cursor += (notes.length - 1) * 300 + 700;
        areas[area.id] = { startAt: cursor, duration: 1000 };
        cursor += 1600;
    }
    // Incomplete samples can still show records without an Area assignment.
    for (const item of model.items) if (!items[item.id]) { add(item, cursor); cursor += 400; }
    const pathStartedAt = Math.max(800, cursor - 200);
    const sceneryStartedAt = pathStartedAt + 1000;
    return { items, areas, pathStartedAt, sceneryStartedAt,
        boundaryStartedAt: Math.max(0, ...Object.values(areas).map(area => area.startAt)),
        duration: sceneryStartedAt + 1300 };
}

export function demoLivingMapItemProgress(schedule, id, elapsed, reducedMotion = false) {
    const entry = schedule.items[id];
    return entry ? (reducedMotion ? 1 : ease((elapsed - entry.startAt) / entry.duration)) : 0;
}

export function demoLivingMapAreaProgress(schedule, id, elapsed, reducedMotion = false) {
    const entry = schedule.areas[id];
    return entry ? (reducedMotion ? 1 : ease((elapsed - entry.startAt) / entry.duration)) : 0;
}

export function demoLivingMapProgress(elapsed, reducedMotion = false, schedule = null) {
    const timing = schedule || { boundaryStartedAt: 9300, pathStartedAt: 10700, sceneryStartedAt: 11700, duration: LIVING_MAP_DURATION_MS };
    return { camera: reducedMotion ? 1 : ease((elapsed - 800) / 5000),
        markers: reducedMotion ? 1 : ease((elapsed - 1850) / 650),
        boundary: reducedMotion ? 1 : ease((elapsed - timing.boundaryStartedAt) / 1000),
        path: reducedMotion ? 1 : ease((elapsed - timing.pathStartedAt) / 1000),
        scenery: reducedMotion ? 1 : ease((elapsed - timing.sceneryStartedAt) / 1200),
        wide: reducedMotion ? 1 : ease((elapsed - timing.pathStartedAt) / 1600),
        settled: reducedMotion || elapsed >= timing.duration };
}
