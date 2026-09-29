import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    WELCOME_ROOT_GROWTH_MS,
    WELCOME_ROOT_MILESTONES,
    WELCOME_ROOT_MAX_MILESTONE,
    advanceWelcomeRootProgress,
    drawArWelcomeRoots,
    welcomeRootFrame,
    welcomeRootsAreGrowing,
    welcomeRootsNeedRefresh
} from '../app/services/arWelcomeRoots.js';
import { WELCOME_SHAPE, WELCOME_SHAPE_POINTS } from '../app/services/arWelcomePanel.js';

const length = points => points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
const radius = point => Math.hypot(point.x - WELCOME_SHAPE.cx, point.y - WELCOME_SHAPE.cy);
const inReadingArea = point => ((point.x - WELCOME_SHAPE.cx) / 430) ** 2 + ((point.y - WELCOME_SHAPE.cy) / 315) ** 2 < 1;

function insidePolygon(point) {
    let inside = false;
    for (let i = 0, j = WELCOME_SHAPE_POINTS.length - 1; i < WELCOME_SHAPE_POINTS.length; j = i++) {
        const a = WELCOME_SHAPE_POINTS[i], b = WELCOME_SHAPE_POINTS[j];
        const crosses = (a.y > point.y) !== (b.y > point.y)
            && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || 1e-9) + a.x;
        if (crosses) inside = !inside;
    }
    return inside;
}

test('arrival grows two tapered trunks before later branches appear', () => {
    const early = welcomeRootFrame({ milestone: WELCOME_ROOT_MILESTONES.arrival, elapsed: 2600 });
    const visible = early.filter(root => root.stage === WELCOME_ROOT_MILESTONES.arrival && root.points.length > 1);
    assert.equal(visible.length, 2);
    assert.ok(visible.every(root => root.kind === 'structural' && root.width > 10));

    const later = welcomeRootFrame({ milestone: WELCOME_ROOT_MILESTONES.arrival, elapsed: 4500 });
    assert.ok(visible.every(root => length(later.find(item => item.id === root.id).points) > length(root.points)));
    assert.ok(visible.every(root => length(root.points) > Math.abs(radius(root.points.at(-1)) - radius(root.points[0])) * 2));
    assert.equal(welcomeRootsAreGrowing({ milestone: 0, elapsed: 1200 }), true);
    assert.equal(welcomeRootsAreGrowing({ milestone: 0, elapsed: 9000 }), false);
});

test('real demo milestones accumulate and rapid progress completes older phases', () => {
    const initial = { milestone: 0, milestoneStartedAt: 0 };
    const first = advanceWelcomeRootProgress(initial, WELCOME_ROOT_MILESTONES.firstPlantPlaced, 9000);
    const second = advanceWelcomeRootProgress(first, WELCOME_ROOT_MILESTONES.plantProfileOpened, 12000);
    const backwards = advanceWelcomeRootProgress(second, WELCOME_ROOT_MILESTONES.firstPlantPlaced, 15000);
    assert.equal(backwards.changed, false);
    assert.equal(backwards.milestone, WELCOME_ROOT_MILESTONES.plantProfileOpened);
    assert.equal(backwards.milestoneStartedAt, second.milestoneStartedAt);

    const rapid = advanceWelcomeRootProgress(initial, WELCOME_ROOT_MILESTONES.areasConnected, 18000);
    assert.equal(rapid.milestone, WELCOME_ROOT_MILESTONES.areasConnected);
    assert.equal(rapid.milestoneStartedAt, 18000);
    const frame = welcomeRootFrame({ milestone: rapid.milestone, elapsed: 21000, milestoneStartedAt: rapid.milestoneStartedAt });
    assert.ok(frame.filter(root => root.stage < rapid.milestone).every(root => root.progress === 1));
    assert.ok(frame.filter(root => root.stage === rapid.milestone).some(root => root.progress > 0 && root.progress < 1));
    assert.ok(frame.filter(root => root.stage > rapid.milestone).every(root => root.progress === 0));
    assert.equal(WELCOME_ROOT_MAX_MILESTONE, WELCOME_ROOT_MILESTONES.demoClosing);
    assert.ok(WELCOME_ROOT_GROWTH_MS >= 5000);
});

test('mature roots branch from parents, cross the glass rim and preserve the reading area', () => {
    const mature = welcomeRootFrame({ milestone: WELCOME_ROOT_MAX_MILESTONE, elapsed: 100000, milestoneStartedAt: 0 });
    const visible = mature.filter(root => root.progress === 1 && root.points.length > 1);
    assert.ok(visible.length >= 18 && visible.length <= 25);
    assert.ok(visible.some(root => root.kind === 'structural' && root.width > 10));
    assert.ok(visible.some(root => root.kind === 'medium'));
    assert.ok(visible.some(root => root.kind === 'feeder'));
    for (const root of visible) {
        assert.ok(root.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
        assert.ok(root.points.every(point => !inReadingArea(point)));
        assert.ok(root.points.every(point => radius(point) <= 532.001));
        if (root.parentId) {
            const parent = visible.find(item => item.id === root.parentId);
            assert.ok(parent);
            assert.ok(parent.points.some(point => Math.hypot(point.x - root.points[0].x, point.y - root.points[0].y) < .001));
        }
    }
    assert.ok(visible.some(root => root.points.some(point => !insidePolygon(point))));
    const structural = visible.find(root => root.id === 'structural-0');
    assert.ok(length(structural.points) > Math.abs(radius(structural.points.at(-1)) - radius(structural.points[0])) * 2);
});

test('reduced motion renders current progress as a static state without glimmers', () => {
    const first = welcomeRootFrame({ milestone: 4, elapsed: 0, milestoneStartedAt: 0, reducedMotion: true });
    const later = welcomeRootFrame({ milestone: 4, elapsed: 100000, milestoneStartedAt: 0, reducedMotion: true });
    assert.deepEqual(first, later);
    assert.ok(first.filter(root => root.stage <= 4).every(root => root.progress === 1));
    assert.ok(first.filter(root => root.stage > 4).every(root => root.progress === 0));
    assert.equal(welcomeRootsAreGrowing({ milestone: 4, elapsed: 0, reducedMotion: true }), false);
    assert.equal(welcomeRootsNeedRefresh({ milestone: 4, elapsed: 500, reducedMotion: true }), false);

    let amberPoints = 0;
    const context = {
        save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {},
        closePath() {}, clip() {}, stroke() {}, arc() { amberPoints++; }, fill() {}
    };
    drawArWelcomeRoots(context, { milestone: 4, elapsed: 500, reducedMotion: true });
    assert.equal(amberPoints, 0);
});

test('demo reset clears accumulated roots while screen redraws preserve them', () => {
    const screen = readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    assert.match(screen, /arWelcomeRootMilestone=WELCOME_ROOT_MILESTONES\.arrival;arWelcomeRootMilestoneStartedAt=0/);
    assert.match(screen, /if\(!next\.changed\)return/);
    assert.match(screen, /rootMilestone:arWelcomeRootMilestone,rootMilestoneStartedAt:arWelcomeRootMilestoneStartedAt/);
});
