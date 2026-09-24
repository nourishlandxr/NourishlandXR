import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createPimDocument, pimToArKnowledge } from '../app/services/pimModel.js';
import { LIM_INTRO_BRANCHES, limLearningContent } from '../app/services/limLearning.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('guided narrative places the first Orb before introducing mapped Areas and Totems', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const guide = demo.slice(demo.indexOf('const DEMO_ORIENTATION_STEPS'), demo.indexOf('const POST_PLACEMENT_AREA_STEP'));
    const area = demo.slice(demo.indexOf('const POST_PLACEMENT_AREA_STEP'), demo.indexOf('function runArWelcomeTutorial'));
    const conversion = demo.slice(demo.indexOf('function guidePlantConversion'), demo.indexOf('function showSceneContinue'));
    const placement = demo.slice(demo.indexOf('function placeMarker'), demo.indexOf('function pressPlacementPointer'));
    const closing = demo.slice(demo.indexOf('function showDemoClosingMessage'), demo.indexOf('function createDemoTotemExample'));
    assert.match(guide, /A Plant Orb belongs at a real plant and opens that plant’s information there\./);
    assert.doesNotMatch(guide, /Areas and Totems/);
    assert.match(area, /maps a larger landscape as Areas/);
    assert.match(area, /Each Area receives a welcoming Totem/);
    assert.ok(guide.indexOf('A Plant Orb belongs') < guide.indexOf('Begin with Pigeon Pea'));
    assert.match(placement, /markers\.push\(marker\);[\s\S]*if \(type === 'plant'\) guidePlantConversion\(placedRecord\)/);
    assert.match(conversion, /POST_PLACEMENT_AREA_STEP/);
    assert.match(closing, /NourishlandXR aims to bring information to botanical gardens, public parks, community gardens, native forests and food forests, helping people discover the wonders of plants\./);
});

test('XR introduction holds four explorable archetypes before Orb and placement stages', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const guide = demo.slice(demo.indexOf('const DEMO_ORIENTATION_STEPS'), demo.indexOf('function runArWelcomeTutorial'));
    assert.match(demo, /XR connects digital information to the real world around you/);
    assert.doesNotMatch(demo, /Meet the Control Panel/);
    assert.match(demo, /welcomeAutoAdvanceReady\(arWelcomeClock\.elapsed/);
    assert.match(demo, /limMeshActivatedAt=arWelcomeClock\.elapsed/);
    assert.match(demo, /runArWelcomeTutorial\(0\)/);
    assert.ok(guide.indexOf('Four ways to explore') < guide.indexOf('Meet the Plant Orb'));
    assert.ok(guide.indexOf('Meet the Plant Orb') < guide.indexOf('Begin with Pigeon Pea'));
    assert.doesNotMatch(guide, /button:'Explore Areas'/);
    assert.match(guide, /button:'Meet Pigeon Pea'/);
    assert.match(demo, /limMeshVisible=index>0/);
    assert.match(demo, /deferContinueUntilCopyReady:index===2/);
    assert.deepEqual(LIM_INTRO_BRANCHES.map(branch => branch.title),
        ['Read Nature', 'Understand the Land', 'Design the Forest', 'Shape the Outcome']);
});

test('demo welcomes visitors and invites imagination before defining XR', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const opening = demo.slice(demo.indexOf('const WELCOME_NARRATIVE'), demo.indexOf('const welcomeNarrative'));
    assert.ok(opening.indexOf('Welcome to NourishlandXR') < opening.indexOf('XR connects digital information'));
    assert.ok(opening.indexOf('What if those stories') < opening.indexOf('XR connects digital information'));
    assert.match(demo, /introBoardBody=demoLocalizedText\('Welcome to NourishlandXR/);
});

test('pathways follow their spoken invitation, copy fades, and the companion panel is introduced', () => {
    const demo=read('app/screens/temporaryArDemo.js');
    const panel=read('app/services/pimInfoPanel.js');
    const styles=read('app/living-objects.css');
    assert.match(demo,/at:18000,text:demoLocalizedText\('Four pathways invite/);
    assert.match(demo,/const DEMO_ARCHETYPE_START_MS=20500/);
    assert.match(demo,/const alpha=Math\.max\(0,Math\.min\(1,/);
    assert.match(demo,/Your Control Panel[\s\S]*The Control Panel is on your left/);
    assert.match(demo,/Thousands of plants can be researched, connected and mapped into real-world places/);
    assert.match(demo,/ctx\.fillStyle = '#ffffff'/);
    assert.doesNotMatch(demo,/body:'On your left: your interactive companion/);
    assert.match(panel,/const spatialHeight=\(\)=>phoneAR\?960:headset\?1250:height\(\)/);
    assert.match(styles,/\.nlxr-info-panel:is\(\.is-demo-panel,\.is-creator-panel\)\.is-intro-reveal/);
    assert.match(styles,/@keyframes nlxr-intro-copy-fade/);
});

test('Plant Orb responds to pointer contact in preview and immersive mode', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const styles = read('app/living-objects.css');
    assert.match(demo, /compactMarker\.addEventListener\('pointerenter'.*is-pointer-hover/);
    assert.match(demo, /highlighted:orbType==='plant' && hoveredPlant===record/);
    assert.match(styles, /nlxr-orb-hover-pulse/);
    assert.match(styles, /nlxr-orb-hover-orbit/);
    assert.match(styles, /Restore the richer, clearly visible Plant Orb/);
});

test('each archetype opens its ordered illustration in the shared control panel', () => {
    const ordered = [
        ['lim-intro-analysis', 'archetype-read-nature.jpg'],
        ['lim-intro-literacy', 'archetype-understand-land.jpg'],
        ['lim-intro-food-forest', 'archetype-design-forest.jpg'],
        ['lim-intro-smart', 'archetype-shape-outcome.jpg']
    ];
    for (const [id, file] of ordered) {
        const content = limLearningContent(id);
        assert.ok(content.image.endsWith(file), `${id} should use ${file}`);
        assert.ok(content.imageAlt.length > 20);
        assert.ok(statSync(new URL(`../app/assets/${file}`, import.meta.url)).size < 500_000);
    }
    const panel = read('app/services/pimInfoPanel.js');
    assert.match(panel, /selection\?\.mesh==='lim' && selection\.image/);
    assert.match(panel, /if\(content\?\.image && !mediaTouched\)mediaCollapsed=false/);
    assert.match(panel, /Pathway illustration/);
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
    assert.match(demo, /ctx\.globalAlpha\*=\.72\+\.28\*\(\.5\+\.5\*Math\.sin\(elapsed\/2400\)\)/);
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
    assert.match(demo, /--demo-orb-size:50px/);
    assert.match(creator, /shape === 4 \? \.72 : 1/);
    assert.match(renderer, /band\(1\.16,\.013,-Math\.PI\*\.16,Math\.PI\*1\.3,72\)/);
    assert.match(styles, /@keyframes nlxr-orb-witness/);
});
