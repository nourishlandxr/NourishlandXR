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
import { demoPimExpandedNodeIds, demoPimState, setDemoPimState } from '../app/features/ar-demo/demoState.js';
import { demoOrbStyle, simulatedAnchorFromPointer, simulatedAnchorStyle } from '../app/features/ar-demo/demoSimulation.js';
import {
    demoContentFor,
    demoPlantMedia,
    simulatedAreaLinkMarkup,
    simulatedPlantMarkup,
    virtualTagProfileMarkup
} from '../app/features/ar-demo/demoPreviewMarkup.js';
import { pimCreateInteractionState } from '../app/services/plantInformationMesh.js';

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('AR demo screen consumes the feature package instead of redeclaring static content', () => {
    const source = read('app/screens/temporaryArDemo.js');
    const hostedBuildSource = read('tools/build-hosted.mjs');
    const deploymentSource = read('.github/workflows/deploy-xr-production.yml');

    assert.match(source, /from '\.\.\/features\/ar-demo\/demoConfig\.js'/);
    assert.match(source, /from '\.\.\/features\/ar-demo\/demoContent\.js'/);
    assert.match(source, /from '\.\.\/features\/ar-demo\/demoPlantContent\.js'/);
    assert.match(source, /from '\.\.\/features\/ar-demo\/demoGeometry\.js'/);
    assert.match(source, /from '\.\.\/features\/ar-demo\/demoSelection\.js'/);
    assert.match(source, /from '\.\.\/features\/ar-demo\/demoState\.js'/);
    assert.match(source, /from '\.\.\/features\/ar-demo\/demoSimulation\.js'/);
    assert.match(source, /from '\.\.\/features\/ar-demo\/demoPreviewMarkup\.js'/);
    assert.doesNotMatch(source, /const AR_PHONE_COMFORT\s*=/);
    assert.doesNotMatch(source, /const DEMO_CONTENT\s*=/);
    assert.doesNotMatch(source, /const MORINGA_PROFILE\s*=/);
    assert.doesNotMatch(source, /(?:export )?function demoPlacementPosition\(/);
    assert.doesNotMatch(source, /(?:export )?function preservePlacedDemoPlants\(/);
    assert.doesNotMatch(source, /function demoPimState\(/);
    assert.doesNotMatch(source, /function simulatedAnchorStyle\(/);
    assert.doesNotMatch(source, /function virtualTagProfileMarkup\(/);
    assert.match(hostedBuildSource, /'features'/);
    assert.match(deploymentSource, /test -f dist\/xr\/features\/ar-demo\/demoConfig\.js/);
    assert.match(deploymentSource, /test -f dist\/xr\/features\/ar-demo\/demoContent\.js/);
    assert.match(deploymentSource, /test -f dist\/xr\/features\/ar-demo\/demoGeometry\.js/);
    assert.match(deploymentSource, /test -f dist\/xr\/features\/ar-demo\/demoPlantContent\.js/);
    assert.match(deploymentSource, /test -f dist\/xr\/features\/ar-demo\/demoSelection\.js/);
    assert.match(deploymentSource, /test -f dist\/xr\/features\/ar-demo\/demoState\.js/);
    assert.match(deploymentSource, /test -f dist\/xr\/features\/ar-demo\/demoSimulation\.js/);
    assert.match(deploymentSource, /test -f dist\/xr\/features\/ar-demo\/demoPreviewMarkup\.js/);
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

test('AR demo PIM state round-trips through a record without losing compatibility fields', () => {
    const record = { id: 'pigeon-pea', demoExpandedBranches: ['uses'] };
    const initial = demoPimState(record);
    assert.deepEqual([...initial.expandedNodeIds], ['uses']);

    const next = pimCreateInteractionState(['uses', 'cultivation'], 'cultivation', 'pigeon-pea');
    assert.equal(setDemoPimState(record, next), next);
    assert.deepEqual(demoPimExpandedNodeIds(record), ['uses', 'cultivation']);
    assert.deepEqual(record.demoExpandedBranches, ['uses', 'cultivation']);
    assert.equal(record.demoSelectedNodeId, 'cultivation');
    assert.equal(record.demoFocusedPlantId, 'pigeon-pea');
});

test('simulated AR helpers keep anchors bounded and presentation deterministic', () => {
    const observed = [];
    const anchor = simulatedAnchorFromPointer(
        { x: 50, y: 50 },
        100,
        100,
        { clientX: 500, clientY: -500 },
        { width: 400, height: 800 },
        (candidate, radius) => { observed.push({ candidate, radius }); return candidate; },
        44
    );
    assert.deepEqual(anchor, { x: 92, y: 12 });
    assert.deepEqual(observed, [{ candidate: { x: 92, y: 12 }, radius: 44 }]);
    assert.equal(simulatedAnchorStyle({ x: 12.345, y: 67.891 }), '--marker-x:12.35%;--marker-y:67.89%');
    assert.match(demoOrbStyle({ demoOrbColor: 'green' }), /--demo-orb/);
    assert.equal(demoOrbStyle({ demoOrbColor: 'unknown' }), '');
});

test('preview markup renders plants, links and Web Mode without runtime ownership', () => {
    const pigeon = { name: 'Pigeon Pea', demoType: 'plant', demoOrbColor: 'pigeonPea', demoExpanded: false, demoInteractive: true };
    assert.equal(demoContentFor({ demoType: 'note' }).title, 'Leave a discovery for someone else');
    assert.deepEqual(demoContentFor({ demoType: 'note' }).lines, [
        'A Note gives this place a voice.',
        'Leave an observation, a question or a reminder for the next visitor.'
    ]);
    assert.ok(demoPlantMedia(pigeon).image.endsWith('/assets/pigeon-pea-cajanus-cajan.png'));
    assert.equal(demoPlantMedia({ ...pigeon, demoAmbientNeighbour: true }), null);
    assert.match(virtualTagProfileMarkup(), /data-demo-pim-web-mount/);
    assert.match(simulatedPlantMarkup(pigeon, 2, { x: 40, y: 60 }, { x: 0, y: 0 }), /data-demo-marker-index="2"/);
    const link = simulatedAreaLinkMarkup([
        { demoType: 'zone', demoLinkVisible: true, simulatedAnchor: { x: 20, y: 30 }, demoTotemFaded: false },
        { demoType: 'zone', demoLinkVisible: true, simulatedAnchor: { x: 60, y: 50 }, demoTotemFaded: false }
    ]);
    assert.match(link, /tryit-sim-area-link-line/);
    assert.match(link, /LINKED AREAS/);
});
