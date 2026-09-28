import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDesktopLearningBookTarget } from '../app/services/desktopLearningBookTarget.js';
import { bookChildren, bookLearningChildren, bookLearningPath, bookNodePath } from '../app/screens/desktopLearningBook.js';
import { LIM_ALL_CELLS, LIM_INTRO_CELLS } from '../app/services/limLearning.js';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';

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

test('desktop book is a separate route and keeps its styles scoped', () => {
    const demo = readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../app/living-objects.css', import.meta.url), 'utf8');
    assert.match(demo, /if \(isDesktopLearningBookTarget\(\)\) return renderDesktopLearningBook/);
    assert.match(css, /\.nlxr-book-spread/);
    assert.match(css, /\.nlxr-book-pim-margin/);
    assert.match(css, /\.nlxr-book-inspector/);
});
