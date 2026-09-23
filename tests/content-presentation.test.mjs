import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createPimDocument, pimToArKnowledge } from '../app/services/pimModel.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('guided narrative introduces Orbs, Areas and Totems before placement, then closes with the requested mission', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const guide = demo.slice(demo.indexOf('const DEMO_ORIENTATION_STEPS'), demo.indexOf('function runArWelcomeTutorial'));
    const closing = demo.slice(demo.indexOf('function showDemoClosingMessage'), demo.indexOf('function createDemoTotemExample'));
    assert.match(guide, /A Plant Orb belongs at a real plant and opens that plant’s information there\./);
    assert.match(guide, /maps a landscape as Areas\. Each Area receives a welcoming Totem/);
    assert.ok(guide.indexOf('A Plant Orb belongs') < guide.indexOf('Begin with Pigeon Pea'));
    assert.match(closing, /NourishlandXR aims to bring information to botanical gardens, public parks, community gardens, native forests and food forests, helping people discover the wonders of plants\./);
});

test('Area Totem examples show distinct colours and welcoming, orientation, interpretation and safety roles', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    for (const label of ['My Food Forest', 'Rainforest Walk', 'Botanical Collection', 'Community Garden']) {
        assert.ok(demo.includes(label), `missing Area example ${label}`);
    }
    assert.match(demo, /My Food Forest can welcome visitors; Rainforest Walk can orient them; Botanical Collection can interpret plants; Community Garden can share safety information and care guidance\./);
    assert.match(demo, /demoTotemColor:'#50865c'/);
    assert.match(demo, /demoTotemColor:'#438f99'/);
});

test('main intro gently fades while it narrates and the green welcome board has no old tagline', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const showcase = read('app/services/arWelcomeShowcase.js');
    assert.match(demo, /ctx\.globalAlpha\*=\.34\+\.66\*\(\.5\+\.5\*Math\.sin\(elapsed\/1750\)\)/);
    assert.match(showcase, /openingOpacity=reducedMotion\?1:1-smooth\(time,duration-3000,2600\)/);
    assert.doesNotMatch(showcase, /Explore the wonders of plants and ecosystems in an immersive, interactive way/);
});

test('Continue and guided example presentation reserve room for readable copy', () => {
    const styles = read('app/living-objects.css');
    const appStyles = read('app/style.css');
    assert.match(styles, /\.tryit-intro-continue:not\(\[hidden\]\)\s*\{[^}]*min-height:60px/);
    assert.match(styles, /\.tryit-demo\.is-simulated \.tryit-guided-choice\.is-welcome-board\.is-persistent-demo-board\s*\{[^}]*max-height:calc\(100dvh - 180px\)/);
    assert.match(styles, /\.tryit-guided-choice\.is-welcome-board \.tryit-board-text-window\s*\{[^}]*overflow-y:auto/);
    assert.match(appStyles, /\.tryit-demo\.is-simulated \.tryit-guided-choice\.is-welcome-board \.tryit-board-text-window\s*\{[^}]*scrollbar-width:thin/);
});

test('plant identity imagery flows through PIM into both shared Demo and Creator panels', () => {
    const image = '/assets/moringa-oleifera.jpg';
    const document = createPimDocument('plant');
    document.identity.commonName = 'Moringa Tree';
    document.identity.scientificName = 'Moringa oleifera';
    document.identity.image = image;
    assert.equal(pimToArKnowledge(document).image, image);

    const model = read('app/services/pimModel.js');
    const panel = read('app/services/pimInfoPanel.js');
    const demo = read('app/screens/temporaryArDemo.js');
    const creator = read('app/screens/arMode.js');
    const styles = read('app/living-objects.css');
    const pimStyles = read('app/pim.css');
    const profileStyles = read('app/product-v2.css');
    const editorStyles = read('app/style.css');
    assert.match(model, /image: source\.identity\.image/);
    assert.match(panel, /identityImage=document\?\.identity\?\.image/);
    assert.match(panel, /imageHeight=Math\.min\(520,Math\.max\(250,card\.height\*\.42\)\)/);
    assert.match(demo, /new URL\('\.\.\/assets\/moringa-oleifera\.jpg', import\.meta\.url\)/);
    assert.match(demo, /focusPlant\(record,moringa \? MORINGA_PIM/);
    assert.match(creator, /infoPanel\?\.focusPlant\(record,creatorKnowledgeDocument\(record\)\)/);
    assert.match(styles, /\.nlxr-plant-preview img\s*\{[^}]*object-fit:contain/);
    assert.match(pimStyles, /\.pim-web-plant-visual\s*\{[^}]*width: min\(100%, 320px\)/);
    assert.match(pimStyles, /@media \(max-width: 480px\)[\s\S]*\.pim-web-plant-visual\s*\{[^}]*height: min\(44svh, 360px\)/);
    assert.match(profileStyles, /\.v2-profile-intro img\s*\{[^}]*height:clamp\(360px,40vw,520px\)/);
    assert.match(editorStyles, /\.plant-photo-space\s*\{[^}]*height: clamp\(320px, 38vw, 480px\)/);
    assert.ok(statSync(new URL('../app/assets/moringa-oleifera.jpg', import.meta.url)).size < 500_000,
        'optimized Moringa asset should remain suitable for a mobile/headset download');
});

test('Spatial device wording is used in preparation and runtime status while Quest stays technical', () => {
    const onboarding = read('app/services/arOnboarding.js');
    const creator = read('app/screens/arMode.js');
    const demo = read('app/screens/temporaryArDemo.js');
    const translations = read('app/services/i18n.js');
    assert.match(onboarding, /On a Spatial device/);
    assert.match(creator, /Right Spatial device controller active/);
    assert.match(demo, /Spatial device immersive mode/);
    assert.match(creator, /isQuestHeadsetBrowser\(\)/);
    assert.equal((translations.match(/'A place full of stories':/g) || []).length, 2,
        'the changed guided narrative is represented in Portuguese and Dutch');
    assert.equal((translations.match(/'SPATIAL DEVICE CONTROLS':/g) || []).length, 2);
});

test('simulated and immersive plant orbs use the shared crowned renderer', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const creator = read('app/screens/arMode.js');
    const renderer = read('app/services/spatialSphereRenderer.js');
    const styles = read('app/living-objects.css');
    assert.match(demo, /drawSpatialOrb\(/);
    assert.match(creator, /drawSpatialOrb\(/);
    assert.match(renderer, /export function drawSpatialOrb\(/);
    assert.match(renderer, /export function createOrbCrownGeometry\(/);
    assert.match(styles, /\.tryit-sim-orb\.is-plant::before/);
});
