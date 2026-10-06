import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDesktopLearningBookTarget } from '../app/services/desktopLearningBookTarget.js';
import { bookChildren, bookLearningChildren, bookLearningPath, bookNodePath, renderDesktopLearningBook } from '../app/screens/desktopLearningBook.js';
import { LIM_ALL_CELLS, LIM_INTRO_CELLS } from '../app/services/limLearning.js';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';
import { openTemporaryArDemoWindow } from '../app/screens/temporaryArDemo.js';
import {launchCreatorArFromPage} from '../app/services/creatorArNavigation.js';
import {startArNote} from '../app/services/arNote.js';

test('desktop creator and visitor gates never attempt a spatial session',async()=>{
    const previous=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:true});let launches=0;
    try{
        assert.equal(await launchCreatorArFromPage(null,()=>{launches++;return true;}),false);
        assert.equal(launches,0);
        await assert.rejects(startArNote(null,null),/AR is not available on desktop/);
    }finally{globalThis.matchMedia=previous;}
});

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

test('desktop entry offers the existing book and removes simulated AR access', () => {
    const demo = readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    const launch = readFileSync(new URL('../app/screens/launch.js', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../app/living-objects.css', import.meta.url), 'utf8');
    assert.match(launch, /Try the AR introduction →/);
    assert.match(demo, /data-desktop-learning-book/);
    assert.doesNotMatch(demo, /data-desktop-plain-ar/);
    assert.match(demo, /The AR demo is not designed for desktop use/);
    assert.doesNotMatch(demo.slice(demo.indexOf('export async function startTemporaryArDemo')), /return renderDesktopLearningBook/);
    assert.match(css, /\.nxr-desktop-ar-options/);
});

test('desktop entry explains device compatibility and opens the original book prototype', () => {
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
        assert.match(app.innerHTML, /compatible phone or headset/);
        assert.doesNotMatch(app.innerHTML, /Open AR introduction/);
        handlers.get('[data-desktop-learning-book]')();
        assert.match(app.innerHTML, /Project, Areas and Totem map/);
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
    assert.match(app.innerHTML, /Project, Areas and Totem map/);
    assert.match(app.innerHTML, /nxr-guide-reading/);
    const next = () => click({ target: { closest: () => ({ dataset: {}, hasAttribute: name => name === 'data-guide-next' }) } });
    next();
    assert.match(app.innerHTML, /data-pim-renderer="canonical"/);
    assert.match(app.innerHTML, /data-pim-node-id="food-forest"/);
    next();
    assert.match(app.innerHTML, /data-guide-lim="lim-food-forest/);
    click({ target: { closest: () => ({ dataset: { guideLim: 'lim-food-forest-function' }, hasAttribute: () => false }) } });
    assert.match(app.innerHTML, /Function/);
    assert.match(app.innerHTML, /Follow this idea/);
    const css = readFileSync(new URL('../app/living-objects.css', import.meta.url), 'utf8');
    assert.match(css, /\.nxr-guide-lim-cell/);
    assert.match(css, /clip-path:polygon\(50% 0,69% 4%/);
});
