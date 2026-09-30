import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    BIOMAP_CATEGORIES,
    DEMO_CONTENT,
    DEMO_JOURNEY_STAGES,
    DEMO_NOTE_TEMPLATE_KEYS,
    DEMO_ORB_MATERIALS,
    DEMO_TUTORIAL_ART,
    NOTE_TEMPLATES
} from '../app/features/ar-demo/demoContent.js';
import {
    AR_PHONE_COMFORT,
    DEMO_SEQUENCE,
    DEMO_WELCOME_CONTINUE_MS,
    demoRainProgress,
    welcomeAutoAdvanceReady
} from '../app/features/ar-demo/demoConfig.js';
import {
    MORINGA_KNOWLEDGE,
    MORINGA_PIM,
    MORINGA_PROFILE
} from '../app/features/ar-demo/demoPlantContent.js';

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('AR demo screen consumes the feature package instead of redeclaring static content', () => {
    const source = read('app/screens/temporaryArDemo.js');
    const hostedBuildSource = read('tools/build-hosted.mjs');
    const deploymentSource = read('.github/workflows/deploy-xr-production.yml');

    assert.match(source, /from '\.\.\/features\/ar-demo\/demoConfig\.js'/);
    assert.match(source, /from '\.\.\/features\/ar-demo\/demoContent\.js'/);
    assert.match(source, /from '\.\.\/features\/ar-demo\/demoPlantContent\.js'/);
    assert.doesNotMatch(source, /const AR_PHONE_COMFORT\s*=/);
    assert.doesNotMatch(source, /const DEMO_CONTENT\s*=/);
    assert.doesNotMatch(source, /const MORINGA_PROFILE\s*=/);
    assert.match(hostedBuildSource, /'features'/);
    assert.match(deploymentSource, /test -f dist\/xr\/features\/ar-demo\/demoConfig\.js/);
    assert.match(deploymentSource, /test -f dist\/xr\/features\/ar-demo\/demoContent\.js/);
    assert.match(deploymentSource, /test -f dist\/xr\/features\/ar-demo\/demoPlantContent\.js/);
});

test('AR demo configuration exports stable behavior contracts', () => {
    assert.ok(Object.isFrozen(AR_PHONE_COMFORT));
    assert.ok(Object.isFrozen(DEMO_SEQUENCE));
    assert.deepEqual(DEMO_SEQUENCE, ['plant', 'plant2', 'note', 'totem']);
    assert.equal(welcomeAutoAdvanceReady(DEMO_WELCOME_CONTINUE_MS + 2499), false);
    assert.equal(welcomeAutoAdvanceReady(DEMO_WELCOME_CONTINUE_MS + 2500), true);
    assert.equal(demoRainProgress(DEMO_WELCOME_CONTINUE_MS), 0);
    assert.equal(demoRainProgress(DEMO_WELCOME_CONTINUE_MS + 5000), 1);
});

test('AR demo presentation content remains complete after extraction', () => {
    assert.ok(Object.isFrozen(DEMO_CONTENT));
    assert.ok(Object.isFrozen(DEMO_JOURNEY_STAGES));
    assert.ok(Object.isFrozen(DEMO_ORB_MATERIALS));
    assert.ok(Object.isFrozen(BIOMAP_CATEGORIES));
    assert.ok(DEMO_TUTORIAL_ART.structure.image.endsWith('/assets/demo-tutorial-art/04b-one-place-clear-structure.png'));
    assert.deepEqual(DEMO_NOTE_TEMPLATE_KEYS, Object.keys(NOTE_TEMPLATES));
});

test('Moringa demo knowledge remains a resolved PIM document', () => {
    assert.ok(Object.isFrozen(MORINGA_PROFILE));
    assert.equal(MORINGA_PIM.plantId, 'moringa-oleifera');
    assert.equal(MORINGA_KNOWLEDGE.plantId, MORINGA_PIM.plantId);
    assert.ok(MORINGA_PIM.nodes.length >= 50);
    assert.equal(MORINGA_PIM.nodes.find(node => node.id === 'medicinal')?.parentId, 'uses');
    assert.equal(MORINGA_PIM.nodes.find(node => node.id === 'craft')?.parentId, 'uses');
});
