import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDesktopLearningBookTarget } from '../app/services/desktopLearningBookTarget.js';
import { bookChildren, bookLearningChildren, bookLearningPath, bookNodePath, renderDesktopLearningBook } from '../app/screens/desktopLearningBook.js';
import { LIM_ALL_CELLS, LIM_INTRO_CELLS } from '../app/services/limLearning.js';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';
import { openTemporaryArDemoWindow } from '../app/screens/temporaryArDemo.js';

test('desktop book never intercepts touch-first or headset AR', () => {
    assert.equal(isDesktopLearningBookTarget({ finePointer: true, mobileBrowser: false, headset: false }), true);
    assert.equal(isDesktopLearningBookTarget({ finePointer: false, mobileBrowser: false, headset: false }), false);
    assert.equal(isDesktopLearningBookTarget({ finePointer: true, mobileBrowser: true, headset: false }), false);
    assert.equal(isDesktopLearningBookTarget({ finePointer: true, mobileBrowser: false, headset: true }), false);
});

test('book branches use the authored LIM and PIM parent-child identities', () => {
    assert.deepEqual(bookNodePath(LIM_ALL_CELLS, 'lim-food-forest-layers-canopy').map(node => node.id), [
        'lim-food-forest', 'lim-food-forest-layers', 'lim-food-forest-layers-canopy'
    ]);
    assert.ok(bookChildren(LIM_ALL_CELLS, 'lim-food-forest').some(node => node.id === 'lim-food-forest-layers'));
    assert.ok(bookLearningChildren('lim-uses-making').some(node => node.id === 'lim-plant-harvest'));
    assert.ok(bookLearningChildren('lim-wildlife-relationships').some(node => node.id === 'lim-food-forest-ecology'));
    assert.deepEqual(bookLearningPath('lim-plant-harvest', 'lim-uses-making').map(node => node.id), ['lim-uses-making', 'lim-plant-harvest']);
    assert.deepEqual(bookNodePath(PIGEON_PEA_PIM.nodes, 'root-nodule-symbiosis').map(node => node.id), [
        'food-forest', 'ecological-functions', 'nitrogen-fixation', 'root-nodule-symbiosis'
    ]);
    assert.ok(bookChildren(PIGEON_PEA_PIM.nodes, 'uses').some(node => node.id === 'culinary'));
    assert.ok(bookChildren(LIM_INTRO_CELLS, 'lim-intro-analysis').some(node => node.id === 'lim-intro-analysis-climate'));
});

test('desktop AR choice recommends the practical guide and leaves AR available', () => {
    const demo = readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    const launch = readFileSync(new URL('../app/screens/launch.js', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../app/living-objects.css', import.meta.url), 'utf8');
    assert.match(launch, /Try the AR introduction →/);
    assert.match(demo, /data-desktop-learning-book/);
    assert.match(demo, /data-desktop-plain-ar/);
    assert.match(demo, /we do not recommend this route for ordinary desktop use/);
    assert.doesNotMatch(demo.slice(demo.indexOf('export async function startTemporaryArDemo')), /return renderDesktopLearningBook/);
    assert.match(css, /\.nxr-desktop-ar-options/);
});

test('desktop AR entry opens the choice and its recommended guide', () => {
    const previousMatchMedia = globalThis.matchMedia;
    const handlers = new Map();
    const app = {
        innerHTML: '',
        querySelector: selector => ({ addEventListener: (_event, handler) => handlers.set(selector, handler) }),
        addEventListener: () => {},
        contains: () => true
    };
    globalThis.matchMedia = () => ({ matches: true });
    try {
        openTemporaryArDemoWindow(app);
        assert.match(app.innerHTML, /RECOMMENDED ON DESKTOP/);
        assert.match(app.innerHTML, /Continue to AR introduction/);
        handlers.get('[data-desktop-learning-book]')();
        assert.match(app.innerHTML, /data-pim-renderer="canonical"/);
    } finally {
        globalThis.matchMedia = previousMatchMedia;
    }
});

test('desktop tutorial opens canonical PIMO cells and LIMO information in a side panel', () => {
    let click;
    const app = {
        innerHTML: '',
        addEventListener: (event, handler) => { if (event === 'click') click = handler; },
        querySelector: () => null,
        contains: () => true
    };
    renderDesktopLearningBook(app, { moringaDocument: PIGEON_PEA_PIM, onExit: () => {} });
    assert.match(app.innerHTML, /data-pim-renderer="canonical"/);
    assert.match(app.innerHTML, /data-pim-node-id="food-forest"/);
    assert.match(app.innerHTML, /nxr-guide-reading/);
    assert.match(app.innerHTML, /Choose a mesh/);
    click({ target: { closest: () => ({ dataset: { guideMode: 'limo' }, hasAttribute: () => false }) } });
    assert.match(app.innerHTML, /data-guide-lim="lim-climate"/);
    assert.match(app.innerHTML, /Choose a learning theme/);
    click({ target: { closest: () => ({ dataset: { guideLim: 'lim-climate' }, hasAttribute: () => false }) } });
    assert.match(app.innerHTML, /Climate and Place/);
    assert.match(app.innerHTML, /Follow this idea/);
    const css = readFileSync(new URL('../app/living-objects.css', import.meta.url), 'utf8');
    assert.match(css, /\.nxr-guide-lim-cell/);
    assert.match(css, /clip-path:polygon\(50% 0,69% 4%/);
});
