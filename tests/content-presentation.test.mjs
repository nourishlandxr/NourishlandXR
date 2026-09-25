import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createPimDocument, pimToArKnowledge } from '../app/services/pimModel.js';
import { LIM_INTRO_BRANCHES, limLearningContent } from '../app/services/limLearning.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('guided narrative explains the place map, proves one Plant Orb, then introduces Areas and Totems', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const guide = demo.slice(demo.indexOf('const DEMO_ORIENTATION_STEPS'), demo.indexOf('const POST_PLACEMENT_AREA_STEP'));
    const area = demo.slice(demo.indexOf('const POST_PLACEMENT_AREA_STEP'), demo.indexOf('function runArWelcomeTutorial'));
    const conversion = demo.slice(demo.indexOf('function guidePlantConversion'), demo.indexOf('function showSceneContinue'));
    const placement = demo.slice(demo.indexOf('function placeMarker'), demo.indexOf('function pressPlacementPointer'));
    const closing = demo.slice(demo.indexOf('function showDemoClosingMessage'), demo.indexOf('function createDemoTotemExample'));
    assert.match(guide, /A Plant Orb is an information access point attached to a real plant\./);
    assert.doesNotMatch(guide, /Areas and Totems/);
    assert.match(guide, /A Project represents the whole place/);
    assert.match(guide, /Areas organise meaningful parts of it/);
    assert.match(area, /first point on the map/);
    assert.ok(guide.indexOf('One place, one clear structure') < guide.indexOf('Begin with one plant'));
    assert.match(placement, /markers\.push\(marker\);[\s\S]*if \(type === 'plant'\) guidePlantConversion\(placedRecord\)/);
    assert.match(conversion, /POST_PLACEMENT_AREA_STEP/);
    assert.match(closing, /school grounds, botanical gardens, parks, community gardens, farms, forests and small home projects/);
});

test('LIM appears after PIM as the bridge from information to purpose and application', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const guide = demo.slice(demo.indexOf('const DEMO_ORIENTATION_STEPS'), demo.indexOf('function runArWelcomeTutorial'));
    assert.match(demo, /openPimLimBridge/);
    assert.match(demo, /The bridge from PIM to LIM/);
    assert.match(demo, /what is this\?” to “what could I do with this here/);
    assert.match(demo, /welcomeAutoAdvanceReady\(arWelcomeClock\.elapsed/);
    assert.match(demo, /limMeshActivatedAt=arWelcomeClock\.elapsed-AR_WELCOME_SETTLED_MS/);
    assert.match(demo, /runArWelcomeTutorial\(0\)/);
    assert.doesNotMatch(guide, /Four ways to explore/);
    assert.match(guide, /Meet a Plant Orb/);
    assert.match(guide, /Place Pigeon Pea/);
    assert.match(demo, /limMeshVisible=false/);
    assert.match(demo, /deferContinueUntilCopyReady:index===1/);
    assert.deepEqual(LIM_INTRO_BRANCHES.map(branch => branch.title),
        ['Read Nature', 'Understand the Land', 'Design the Forest', 'Shape the Outcome']);
});

test('demo opens with the knowledge problem before defining the product', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const opening = demo.slice(demo.indexOf('const WELCOME_NARRATIVE'), demo.indexOf('const welcomeNarrative'));
    assert.ok(opening.indexOf('Every living place holds knowledge') < opening.indexOf('living, explorable map'));
    assert.ok(opening.indexOf('knowledge is often scattered') < opening.indexOf('Plants, observations, stories and guidance'));
    assert.match(demo, /introBoardBody=demoLocalizedText\('Every garden, school ground, park and forest holds useful knowledge/);
});

test('the beginner journey introduces the guide first and the four LIM lenses after PIM', () => {
    const demo=read('app/screens/temporaryArDemo.js');
    const panel=read('app/services/pimInfoPanel.js');
    const styles=read('app/living-objects.css');
    assert.match(demo,/at:18000,text:demoLocalizedText\('Explore one plant/);
    assert.match(demo,/const DEMO_ARCHETYPE_START_MS=20500/);
    assert.match(demo,/const alpha=Math\.max\(0,Math\.min\(1,/);
    assert.match(demo,/title:'Your guide'[\s\S]*do not need prior plant, farming or technology knowledge/);
    assert.match(demo,/Read what is here[\s\S]*Understand how it works[\s\S]*Connect information to purpose[\s\S]*Choose, observe and learn/);
    assert.match(demo,/Why does this matter\?/);
    assert.match(demo,/ctx\.fillStyle = '#ffffff'/);
    assert.doesNotMatch(demo,/body:'On your left: your interactive companion/);
    assert.match(panel,/const spatialHeight=\(\)=>phoneAR\?960:headset\?1250:height\(\)/);
    assert.match(styles,/\.nlxr-info-panel:is\(\.is-demo-panel,\.is-creator-panel\)\.is-intro-reveal/);
    assert.match(styles,/@keyframes nlxr-intro-copy-fade/);
});

test('demo progress belongs to the dynamic Control panel header, not the scene', () => {
    const demo=read('app/screens/temporaryArDemo.js');
    const panel=read('app/services/pimInfoPanel.js');
    const demoStyles=read('app/style.css');
    const panelStyles=read('app/living-objects.css');
    assert.match(demo,/infoPanel\?\.setHeaderProgress\(\{label:'Demo journey',steps:DEMO_JOURNEY_STAGES,activeId:stageId\}\)/);
    assert.doesNotMatch(demo,/data-demo-journey|tryit-journey/);
    assert.match(panel,/setHeaderProgress\(value\)/);
    assert.match(panel,/progress:progressState\(\)/);
    assert.match(panelStyles,/\.nlxr-panel-progress-heading/);
    assert.doesNotMatch(demoStyles,/\.tryit-journey/);
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
