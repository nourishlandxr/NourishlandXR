import { WELCOME_SHAPE, WELCOME_SHAPE_POINTS } from './arWelcomePanel.js';

// These values are raised only by real actions in the guided demo. Keeping the
// highest reached milestone makes the network cumulative when visitors go back.
export const WELCOME_ROOT_MILESTONES = Object.freeze({
    arrival: 0,
    firstPlantPlaced: 1,
    plantProfileOpened: 2,
    secondPlantPlaced: 3,
    notePlaced: 4,
    firstAreaShown: 5,
    secondAreaShown: 6,
    areasConnected: 7,
    knowledgeConnected: 8,
    demoClosing: 9
});
export const WELCOME_ROOT_MAX_MILESTONE = WELCOME_ROOT_MILESTONES.demoClosing;
export const WELCOME_ROOT_GROWTH_MS = 5600;
export const WELCOME_ROOT_REFRESH_MS = 300;
export const WELCOME_ROOTS_SETTLED_MS = WELCOME_ROOT_GROWTH_MS;

const clamp = value => Math.max(0, Math.min(1, value));
const fract = value => value - Math.floor(value);
const hash = (value, salt = 0) => fract(Math.sin((value + salt) * 127.1 + 23.7) * 43758.5453);
const mix = (a, b, amount) => a + (b - a) * amount;
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const wrap = value => ((value % 1) + 1) % 1;
const inReadingArea = point => ((point.x - WELCOME_SHAPE.cx) / 430) ** 2 + ((point.y - WELCOME_SHAPE.cy) / 315) ** 2 < 1;
function insideWelcomePolygon(point) {
    let inside = false;
    for (let i = 0, j = WELCOME_SHAPE_POINTS.length - 1; i < WELCOME_SHAPE_POINTS.length; j = i++) {
        const a = WELCOME_SHAPE_POINTS[i], b = WELCOME_SHAPE_POINTS[j];
        const crosses = (a.y > point.y) !== (b.y > point.y)
            && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || 1e-9) + a.x;
        if (crosses) inside = !inside;
    }
    return inside;
}
const stageEase = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
};

const ROOT_PALETTE = Object.freeze({
    copper: Object.freeze({ body: 'rgba(181, 116, 66, .94)', highlight: 'rgba(241, 190, 120, .66)' }),
    olive: Object.freeze({ body: 'rgba(139, 145, 82, .91)', highlight: 'rgba(208, 207, 135, .60)' }),
    bark: Object.freeze({ body: 'rgba(137, 91, 53, .92)', highlight: 'rgba(222, 165, 102, .60)' })
});

function perimeterPoint(position, inset, tangentDrift = 0) {
    const count = WELCOME_SHAPE_POINTS.length;
    const scaled = wrap(position) * count;
    const edge = Math.floor(scaled);
    const amount = scaled - edge;
    const from = WELCOME_SHAPE_POINTS[edge];
    const to = WELCOME_SHAPE_POINTS[(edge + 1) % count];
    const boundary = { x: mix(from.x, to.x, amount), y: mix(from.y, to.y, amount) };
    const tangentLength = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const tangentX = (to.x - from.x) / tangentLength;
    const tangentY = (to.y - from.y) / tangentLength;
    const inwardX = WELCOME_SHAPE.cx - boundary.x;
    const inwardY = WELCOME_SHAPE.cy - boundary.y;
    const inwardLength = Math.hypot(inwardX, inwardY) || 1;
    return {
        x: boundary.x + inwardX / inwardLength * inset + tangentX * tangentDrift,
        y: boundary.y + inwardY / inwardLength * inset + tangentY * tangentDrift
    };
}

function perimeterPointInside(position, inset, tangentDrift) {
    const point = perimeterPoint(position, inset, tangentDrift);
    if (insideWelcomePolygon(point)) return point;
    let low = 0, high = 1;
    for (let iteration = 0; iteration < 8; iteration++) {
        const amount = (low + high) * .5;
        if (insideWelcomePolygon(perimeterPoint(position, inset, tangentDrift * amount))) low = amount;
        else high = amount;
    }
    return perimeterPoint(position, inset, tangentDrift * low);
}

function createPath({ id, stage, kind, start, direction, span, insetStart, insetEnd, width, seed, palette, anchor = null }) {
    const phase = hash(seed, 19) * Math.PI * 2;
    const waves = 1.2 + hash(seed, 23) * 1.7;
    const amplitude = kind === 'structural' ? 28 + hash(seed, 29) * 22
        : kind === 'feeder' ? 24 + hash(seed, 29) * 34
            : 22 + hash(seed, 29) * 23;
    const pointAt = amount => {
        const t = clamp(amount);
        const edgeWave = Math.sin(t * Math.PI * 2 * waves + phase) * amplitude * Math.sin(Math.PI * t);
        const smallWave = Math.sin(t * Math.PI * 5 + phase * .71) * amplitude * .24 * Math.sin(Math.PI * t);
        const inset = mix(insetStart, insetEnd, t) + edgeWave * .42;
        const point = perimeterPointInside(start + direction * span * t, inset, edgeWave + smallWave);
        if (!anchor || t > .0001) return point;
        return anchor;
    };
    const samples = Math.max(9, Math.ceil(span * WELCOME_SHAPE_POINTS.length * 2.6));
    const points = [];
    for (let index = 0; index <= samples; index++) {
        const point = pointAt(index / samples);
        if (inReadingArea(point)) break;
        points.push(point);
    }
    const attach = .24 + hash(seed, 47) * .56;
    const delay = hash(seed, 59) * 520;
    const duration = WELCOME_ROOT_GROWTH_MS * (.78 + hash(seed, 61) * .44);
    return { id, stage, kind, start, direction, span, insetStart, insetEnd, width, seed, palette, points, attach, delay, duration };
}

function createRootNetwork() {
    const paths = [];
    let sequence = 0;
    const add = options => {
        const seed = ++sequence;
        const path = createPath({ seed, palette: seed % 3 === 0 ? 'olive' : seed % 3 === 1 ? 'copper' : 'bark', ...options });
        paths.push(path);
        return path;
    };

    // Arrival is intentionally sparse: a few fine tips, separated around the edge.
    const opening = [
        { start: .04, direction: 1 }, { start: .29, direction: -1 },
        { start: .56, direction: 1 }, { start: .82, direction: -1 }
    ];
    opening.forEach((item, index) => add({
        id: `arrival-${index}`, stage: WELCOME_ROOT_MILESTONES.arrival, kind: 'fine',
        ...item, span: .064 + hash(index, 3) * .025,
        insetStart: 5, insetEnd: 29 + hash(index, 5) * 26,
        width: 1.7 + hash(index, 7) * .55
    }));

    const stems = [...paths];
    for (let stage = 1; stage <= WELCOME_ROOT_MAX_MILESTONE; stage++) {
        if (stage % 2 === 1) {
            const id = `structural-${stage}`;
            const index = sequence + 1;
            stems.push(add({
                id, stage, kind: 'structural', start: hash(stage, 101), direction: stage % 4 === 1 ? 1 : -1,
                span: .28 + hash(stage, 107) * .16, insetStart: 15 + hash(stage, 109) * 22,
                insetEnd: 28 + hash(stage, 113) * 34, width: 9.5 + hash(stage, 127) * 3.2, seed: index
            }));
        }
        const mediumCount = 1 + Math.ceil(stage * .56);
        for (let index = 0; index < mediumCount; index++) {
            const seed = stage * 13 + index * 3;
            stems.push(add({
                id: `medium-${stage}-${index}`, stage, kind: 'medium',
                start: hash(seed, 137), direction: hash(seed, 139) > .5 ? 1 : -1,
                span: .09 + hash(seed, 149) * .12,
                insetStart: 20 + hash(seed, 151) * 38, insetEnd: 36 + hash(seed, 157) * 56,
                width: 4.2 + hash(seed, 163) * 2.4, seed
            }));
        }
    }

    // Feeder roots branch from established stems one milestone later. That keeps
    // early growth delicate while later progress adds the visible woven mesh.
    for (const parent of stems) {
        if (parent.stage >= WELCOME_ROOT_MAX_MILESTONE) continue;
        const count = parent.kind === 'structural' ? 4 : parent.kind === 'medium' ? 3 : 0;
        for (let index = 0; index < count; index++) {
            const seed = parent.seed * 17 + index * 5 + 1;
            const attach = .16 + hash(seed, 173) * .7;
            const start = parent.start + parent.direction * parent.span * attach;
            const inset = mix(parent.insetStart, parent.insetEnd, attach);
            const anchor = parent.points[Math.round(attach * (parent.points.length - 1))];
            if(!anchor)continue;
            add({
                id: `feeder-${parent.id}-${index}`, stage: parent.stage + 1, kind: 'feeder',
                start, direction: hash(seed, 179) > .44 ? parent.direction : -parent.direction,
                span: .04 + hash(seed, 181) * .07,
                insetStart: inset, insetEnd: Math.min(240, inset + 46 + hash(seed, 191) * 92),
                width: 1.8 + hash(seed, 193) * 1.35, seed, anchor
            });
        }
    }
    const kindOrder = { structural: 0, medium: 1, fine: 2, feeder: 3 };
    return paths.sort((a, b) => a.stage - b.stage || kindOrder[a.kind] - kindOrder[b.kind] || a.seed - b.seed);
}

const ROOT_NETWORK = Object.freeze(createRootNetwork());

function rootProgress(path, { milestone, elapsed, milestoneStartedAt, reducedMotion }) {
    if (path.stage > milestone) return 0;
    if (reducedMotion || path.stage < milestone) return 1;
    return stageEase((elapsed - milestoneStartedAt - path.delay) / path.duration);
}

function visiblePath(points, progress) {
    if (progress <= 0 || points.length < 2) return [];
    if (progress >= 1) return points;
    let remaining = points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0) * progress;
    const visible = [points[0]];
    for (let index = 1; index < points.length; index++) {
        const segment = distance(points[index - 1], points[index]);
        if (remaining >= segment) {
            visible.push(points[index]);
            remaining -= segment;
            continue;
        }
        if (remaining > 0) {
            const ratio = remaining / segment;
            visible.push({ x: mix(points[index - 1].x, points[index].x, ratio), y: mix(points[index - 1].y, points[index].y, ratio) });
        }
        break;
    }
    return visible;
}

export function welcomeRootFrame({ milestone = 0, elapsed = 0, milestoneStartedAt = 0, reducedMotion = false } = {}) {
    const state = {
        milestone: Math.max(0, Math.min(WELCOME_ROOT_MAX_MILESTONE, Math.floor(Number(milestone) || 0))),
        elapsed: Math.max(0, Number(elapsed) || 0),
        milestoneStartedAt: Math.max(0, Number(milestoneStartedAt) || 0),
        reducedMotion: Boolean(reducedMotion)
    };
    return ROOT_NETWORK.map(path => {
        const progress = rootProgress(path, state);
        return { ...path, progress, points: visiblePath(path.points, progress) };
    });
}

export function advanceWelcomeRootProgress(current = {}, requestedMilestone = 0, elapsed = 0) {
    const milestone = Math.max(0, Math.min(WELCOME_ROOT_MAX_MILESTONE, Math.floor(Number(current.milestone) || 0)));
    const requested = Math.max(0, Math.min(WELCOME_ROOT_MAX_MILESTONE, Math.floor(Number(requestedMilestone) || 0)));
    const changed = requested > milestone;
    return {
        milestone: changed ? requested : milestone,
        milestoneStartedAt: changed ? Math.max(0, Number(elapsed) || 0) : Math.max(0, Number(current.milestoneStartedAt) || 0),
        changed
    };
}

function rootStageIsGrowing(state) {
    if (state.reducedMotion) return false;
    return ROOT_NETWORK.some(path => path.stage === state.milestone && rootProgress(path, state) < 1);
}

function glimmerIsActive(elapsed) {
    const phase = ((elapsed % 22000) + 22000) % 22000;
    return phase < 1150;
}

export function welcomeRootsAreGrowing(options = {}) {
    return rootStageIsGrowing({
        milestone: Math.max(0, Math.floor(Number(options.milestone) || 0)),
        elapsed: Math.max(0, Number(options.elapsed) || 0),
        milestoneStartedAt: Math.max(0, Number(options.milestoneStartedAt) || 0),
        reducedMotion: Boolean(options.reducedMotion)
    });
}

export function welcomeRootsNeedRefresh(options = {}) {
    if (options.reducedMotion) return false;
    return welcomeRootsAreGrowing(options) || glimmerIsActive(Math.max(0, Number(options.elapsed) || 0));
}

function traceSmoothPath(ctx, points) {
    if (points.length < 2) return false;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
        ctx.lineTo(points[1].x, points[1].y);
        return true;
    }
    for (let index = 1; index < points.length - 1; index++) {
        const midpoint = { x: (points[index].x + points[index + 1].x) * .5, y: (points[index].y + points[index + 1].y) * .5 };
        ctx.quadraticCurveTo(points[index].x, points[index].y, midpoint.x, midpoint.y);
    }
    ctx.lineTo(points.at(-1).x, points.at(-1).y);
    return true;
}

function strokeRoot(ctx, path, points, alpha) {
    if (!traceSmoothPath(ctx, points)) return;
    const palette = ROOT_PALETTE[path.palette] || ROOT_PALETTE.copper;
    const width = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(9, 15, 10, ${alpha * .66})`;
    ctx.lineWidth = width * (path.kind === 'structural' ? 2.05 : 1.7);
    ctx.stroke();
    ctx.strokeStyle = palette.body;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    ctx.stroke();
    if (width > 1.35) {
        ctx.strokeStyle = palette.highlight;
        ctx.globalAlpha *= .75;
        ctx.lineWidth = Math.max(.55, width * (path.kind === 'structural' ? .22 : .29));
        ctx.stroke();
    }
}

function drawAmberPoint(ctx, point, radius, alpha) {
    if (alpha <= .015) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = 'rgba(233, 163, 77, .9)';
    ctx.shadowColor = 'rgba(229, 145, 48, .62)';
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

export function drawArWelcomeRoots(ctx, { milestone = 0, elapsed = 0, milestoneStartedAt = 0, reducedMotion = false } = {}) {
    const frame = welcomeRootFrame({ milestone, elapsed, milestoneStartedAt, reducedMotion });
    ctx.save();
    ctx.beginPath();
    WELCOME_SHAPE_POINTS.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
    ctx.clip();

    const currentMilestone = Math.max(0, Math.min(WELCOME_ROOT_MAX_MILESTONE, Math.floor(Number(milestone) || 0)));
    const stageElapsed = Math.max(0, Number(elapsed) - (Number(milestoneStartedAt) || 0));
    const glimmerPhase = ((Number(elapsed) % 22000) + 22000) % 22000;
    frame.forEach((path, index) => {
        if (path.points.length < 2) return;
        ctx.save();
        strokeRoot(ctx, path, path.points, path.stage === currentMilestone ? .9 : .76);

        // A few new roots carry a tiny warm tip while their current phase grows.
        if (!reducedMotion && path.stage === currentMilestone && path.progress < 1 && index % 5 === 0) {
            drawAmberPoint(ctx, path.points.at(-1), path.kind === 'structural' ? 2.1 : 1.45, .28 + path.progress * .22);
        }

        // Glints occur briefly at selected crossings; established roots remain still.
        if (!reducedMotion && index % 11 === 3 && path.stage <= currentMilestone && path.points.length > 5 && glimmerPhase < 1150) {
            const pulse = Math.sin(Math.PI * glimmerPhase / 1150);
            const point = path.points[Math.floor((.27 + hash(index, 211) * .53) * (path.points.length - 1))];
            drawAmberPoint(ctx, point, 1.25 + pulse * .7, pulse * .35);
        }
        ctx.restore();
    });
    ctx.restore();
    return frame;
}
