import { WELCOME_SHAPE } from './arWelcomePanel.js';

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
export const WELCOME_ROOT_REFRESH_MS = 80;
export const WELCOME_ROOTS_SETTLED_MS = WELCOME_ROOT_GROWTH_MS;

const clamp = value => Math.max(0, Math.min(1, value));
const fract = value => value - Math.floor(value);
const hash = (value, salt = 0) => fract(Math.sin((value + salt) * 127.1 + 23.7) * 43758.5453);
const mix = (a, b, amount) => a + (b - a) * amount;
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const stageEase = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
};

const ROOT_PALETTE = Object.freeze({
    copper: Object.freeze({ body: '#956a45', light: '#d1a16b', shade: '#4f392e' }),
    olive: Object.freeze({ body: '#7b8061', light: '#adb18a', shade: '#3c473e' }),
    bark: Object.freeze({ body: '#806148', light: '#b58c65', shade: '#43332c' })
});

const polarPoint = (angle, radius) => ({
    x: WELCOME_SHAPE.cx + Math.cos(angle) * radius,
    y: WELCOME_SHAPE.cy + Math.sin(angle) * radius
});
const rootAngle = point => Math.atan2(point.y - WELCOME_SHAPE.cy, point.x - WELCOME_SHAPE.cx);
const rootRadius = point => Math.hypot(point.x - WELCOME_SHAPE.cx, point.y - WELCOME_SHAPE.cy);
const readingRadius = angle => 1 / Math.hypot(Math.cos(angle) / 430, Math.sin(angle) / 315);
function safeRootPoint(point) {
    const angle = rootAngle(point);
    const radius = Math.min(532, Math.max(readingRadius(angle) + 27, rootRadius(point)));
    return polarPoint(angle, radius);
}
const cubic = (a, b, c, d, t) => {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};
function branchPoints(parent, attach, side, seed, fine = false) {
    const index = Math.round(attach * (parent.points.length - 1));
    const start = parent.points[index];
    const before = parent.points[Math.max(0, index - 2)];
    const after = parent.points[Math.min(parent.points.length - 1, index + 2)];
    const tangentLength = distance(before, after) || 1;
    const tangent = { x: (after.x - before.x) / tangentLength, y: (after.y - before.y) / tangentLength };
    const angle = rootAngle(start);
    const targetAngle = angle + side * (fine ? .13 : .27 + hash(seed, 7) * .17);
    const targetRadius = Math.max(readingRadius(targetAngle) + (fine ? 27 : 34), rootRadius(start) - (fine ? 55 : 125) - hash(seed, 11) * (fine ? 24 : 42));
    const end = safeRootPoint(polarPoint(targetAngle, targetRadius));
    const reach = fine ? 25 : 54;
    const inward = { x: -Math.cos(angle), y: -Math.sin(angle) };
    const control1 = { x: start.x + tangent.x * reach + inward.x * reach * .42,
        y: start.y + tangent.y * reach + inward.y * reach * .42 };
    const control2 = { x: end.x + Math.cos(targetAngle) * reach * .72 - tangent.x * reach * .25,
        y: end.y + Math.sin(targetAngle) * reach * .72 - tangent.y * reach * .25 };
    const samples = fine ? 24 : 42;
    return Array.from({ length: samples + 1 }, (_, index) => {
        const t = index / samples;
        return safeRootPoint({
            x: cubic(start.x, control1.x, control2.x, end.x, t),
            y: cubic(start.y, control1.y, control2.y, end.y, t)
        });
    });
}
function trunkPoints({ angle, sweep, direction, tipRadius, seed }) {
    const samples = 78;
    const phase = hash(seed, 19) * Math.PI * 2;
    return Array.from({ length: samples + 1 }, (_, index) => {
        const t = index / samples;
        const theta = angle + direction * sweep * t
            + Math.sin(Math.PI * t) * (.030 * Math.sin(phase + t * 5.2) + .014 * Math.sin(phase * .6 + t * 10));
        const radius = mix(526, tipRadius, t)
            + Math.sin(Math.PI * t) * (18 * Math.sin(phase + t * 7.1) + 7 * Math.sin(phase * .7 + t * 15));
        return safeRootPoint(polarPoint(theta, radius));
    });
}
function createRootNetwork() {
    const paths = [];
    let seed = 0;
    const add = ({ id, stage, kind, width, palette, points, parentId = '' }) => {
        const number = ++seed;
        const path = {
            id, stage, kind, width, palette, points, parentId, seed: number,
            delay: hash(number, 59) * 420,
            duration: WELCOME_ROOT_GROWTH_MS * (.82 + hash(number, 61) * .3)
        };
        paths.push(path);
        return path;
    };
    // Each trunk has a distinct origin, direction and length. The branches
    // inherit exact points on their parent so the network reads as growth.
    const trunks = [
        { angle: Math.PI / 2, sweep: 2.13, direction: 1, tipRadius: 464, width: 19, stage: 0, palette: 'bark' },
        { angle: Math.PI / 2, sweep: 1.70, direction: -1, tipRadius: 452, width: 15, stage: 0, palette: 'copper' }
    ];
    trunks.forEach((spec, trunkIndex) => {
        const trunk = add({
            id: `structural-${trunkIndex}`, stage: spec.stage, kind: 'structural',
            width: spec.width, palette: spec.palette, points: trunkPoints({ ...spec, seed: trunkIndex + 1 })
        });
        const attachments = trunkIndex === 0 ? [.16, .33, .49, .67, .82] : [.20, .49, .78];
        attachments.forEach((attach, branchIndex) => {
            const branchStage = Math.min(WELCOME_ROOT_MAX_MILESTONE - 1,
                1 + trunkIndex + branchIndex * 2);
            const side = branchIndex % 2 ? -1 : 1;
            const branch = add({
                id: `branch-${trunkIndex}-${branchIndex}`, stage: branchStage,
                kind: 'medium', width: 5.8 + hash(trunkIndex * 7 + branchIndex, 31) * 3,
                palette: spec.palette, parentId: trunk.id,
                points: branchPoints(trunk, attach, side, trunkIndex * 11 + branchIndex)
            });
            add({
                id: `feeder-${trunkIndex}-${branchIndex}`,
                stage: Math.min(WELCOME_ROOT_MAX_MILESTONE, branchStage + 1),
                kind: 'feeder', width: 2.1 + hash(trunkIndex * 13 + branchIndex, 41) * .85,
                palette: spec.palette, parentId: branch.id,
                points: branchPoints(branch, .58, -side, trunkIndex * 19 + branchIndex, true)
            });
        });
    });
    const kindOrder = { structural: 0, medium: 1, feeder: 2 };
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

function fillRootRibbon(ctx, points, width, offset = 0) {
    if (points.length < 2) return false;
    const sides = [[], []], last = points.length - 1;
    for (let index = 0; index <= last; index++) {
        const before = points[Math.max(0, index - 1)], after = points[Math.min(last, index + 1)];
        const dx = after.x - before.x, dy = after.y - before.y, length = Math.hypot(dx, dy) || 1;
        const fraction = index / last;
        const base = .72 + .28 * stageEase(fraction / .13);
        const tip = .025 + .975 * stageEase((1 - fraction) / .25);
        const radius = width * .5 * base * tip;
        const normalX = -dy / length, normalY = dx / length;
        const centerX = points[index].x + normalX * width * offset * tip;
        const centerY = points[index].y + normalY * width * offset * tip;
        sides[0].push({ x: centerX + normalX * radius, y: centerY + normalY * radius });
        sides[1].push({ x: centerX - normalX * radius, y: centerY - normalY * radius });
    }
    ctx.beginPath();
    ctx.moveTo(sides[0][0].x, sides[0][0].y);
    for (const point of sides[0].slice(1)) ctx.lineTo(point.x, point.y);
    for (const point of sides[1].reverse()) ctx.lineTo(point.x, point.y);
    ctx.closePath();
    ctx.fill();
    return true;
}

function strokeRoot(ctx, path, points, alpha) {
    const palette = ROOT_PALETTE[path.palette] || ROOT_PALETTE.copper;
    const inheritedAlpha = Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1;
    ctx.globalAlpha = inheritedAlpha * alpha * .46;
    ctx.fillStyle = palette.shade;
    ctx.shadowColor = 'rgba(2, 9, 9, .55)';
    ctx.shadowBlur = path.kind === 'structural' ? 12 : 5;
    fillRootRibbon(ctx, points, path.width * 1.34);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = inheritedAlpha * alpha * (path.kind === 'structural' ? .94 : .86);
    ctx.fillStyle = palette.body;
    fillRootRibbon(ctx, points, path.width);
    if (path.kind !== 'feeder') {
        ctx.globalAlpha = inheritedAlpha * alpha * .36;
        ctx.fillStyle = palette.light;
        fillRootRibbon(ctx, points, path.width * .23, -.25);
    }
    if (path.kind === 'structural' && points.length > 25) {
        ctx.globalAlpha = inheritedAlpha * alpha * .27;
        ctx.strokeStyle = palette.shade;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        for (let index = 7; index < points.length * .84; index += 8) {
            const point = points[index];
            const before = points[index - 2], after = points[index + 2];
            const length = distance(before, after) || 1;
            const tangentX = (after.x - before.x) / length, tangentY = (after.y - before.y) / length;
            const side = hash(path.seed * 17 + index, 73) > .5 ? 1 : -1;
            const normalX = -tangentY * side, normalY = tangentX * side;
            const offset = path.width * (.10 + hash(index, 79) * .18);
            const span = 4 + hash(index, 83) * 7;
            ctx.beginPath();
            ctx.moveTo(point.x + normalX * offset, point.y + normalY * offset);
            ctx.quadraticCurveTo(point.x + tangentX * span * .45,
                point.y + tangentY * span * .45,
                point.x + tangentX * span + normalX * offset * .5,
                point.y + tangentY * span + normalY * offset * .5);
            ctx.stroke();
        }
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

    const currentMilestone = Math.max(0, Math.min(WELCOME_ROOT_MAX_MILESTONE, Math.floor(Number(milestone) || 0)));
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
