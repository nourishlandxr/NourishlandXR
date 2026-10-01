import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createPimDocument, pimToArKnowledge, validatePimDocument } from '../app/services/pimModel.js';
import { pimInfoContent } from '../app/services/pimInfoPanel.js';
import { DEMO_CONTENT, DEMO_ORB_MATERIALS, WELCOME_BOARD_PARAGRAPHS, WELCOME_BOARD_PARAGRAPHS_PT } from '../app/features/ar-demo/demoContent.js';
import { DEMO_ARCHETYPE_START_MS } from '../app/features/ar-demo/demoConfig.js';
import { MORINGA_PIM, MORINGA_PROFILE_IMAGE } from '../app/features/ar-demo/demoPlantContent.js';
import { LIM_INTRO_BRANCHES, limLearningContent } from '../app/services/limLearning.js';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('guided narrative explains the place map, proves one Plant Orb, then introduces Areas and Totems', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const guide = demo.slice(demo.indexOf('const DEMO_ORIENTATION_STEPS'), demo.indexOf('const POST_PLACEMENT_AREA_STEP'));
    const area = demo.slice(demo.indexOf('const POST_PLACEMENT_AREA_STEP'), demo.indexOf('function runArWelcomeTutorial'));
    const conversion = demo.slice(demo.indexOf('function guidePlantConversion'), demo.indexOf('function showSceneContinue'));
    const placement = demo.slice(demo.indexOf('function placeMarker'), demo.indexOf('function pressPlacementPointer'));
    const closing = demo.slice(demo.indexOf('function showDemoClosingMessage'), demo.indexOf('function pairedDemoTotemPosition'));
    assert.match(guide, /A Plant Orb attaches information to a real-world location/);
    assert.match(guide, /Areas organise one part of a place/);
    assert.match(guide, /Begin with one plant/);
    assert.match(area, /This is the Plant Orb/);
    assert.ok(guide.indexOf('Areas and Totems guide you') < guide.indexOf('Begin with one plant'));
    assert.match(placement, /markers\.push\(marker\);[\s\S]*if \(type === 'plant'\) guidePlantConversion\(placedRecord\)/);
    assert.match(conversion, /POST_PLACEMENT_AREA_STEP/);
    assert.match(closing, /school grounds, botanical gardens, parks, community gardens, farms, forests and small home projects/);
});

test('post-LIMO discovery connects the authored Pigeon Pea and Living Landscapes cells', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const connections = read('app/services/demoNativeConnection.js');
    const guide = demo.slice(demo.indexOf('const DEMO_ORIENTATION_STEPS'), demo.indexOf('function runArWelcomeTutorial'));
    assert.match(demo, /showNativeConnectionIntroduction/);
    assert.match(demo, /meshRelationships\.resolve\(\[source,target\]\)/);
    assert.match(connections, /DEMO_NATIVE_SOURCE_ID = 'food-forest'/);
    assert.match(connections, /DEMO_NATIVE_TARGET_ID = 'lim-food-forest'/);
    assert.doesNotMatch(demo, /knowledge-combination|Choose one plant characteristic to begin/);
    assert.match(demo, /welcomeAutoAdvanceReady\(arWelcomeClock\.elapsed/);
    assert.match(demo, /limMeshActivatedAt=arWelcomeClock\.elapsed-AR_WELCOME_SETTLED_MS/);
    assert.match(demo, /runArWelcomeTutorial\(0\)/);
    assert.doesNotMatch(guide, /Four ways to explore/);
    assert.match(guide, /Begin with one plant/);
    assert.match(guide, /Place Pigeon Pea/);
    assert.match(demo, /limMeshVisible=false/);
    assert.match(demo, /deferContinueUntilCopyReady:index===0/);
    assert.match(demo, /stepLabel:'LEARNING 1\.9'[\s\S]*Select \$\{nativeConnectionState\.sourceTitle\} in Pigeon Pea to continue/);
    assert.match(demo, /stepLabel:'LEARNING 1\.10'[\s\S]*Select \$\{state\.targetTitle\} in LIMO to continue/);
    assert.doesNotMatch(demo, /stepLabel:'LEARNING 1\.9',nextGuide:''/);
    assert.deepEqual(LIM_INTRO_BRANCHES.map(branch => branch.title),
        ['Read Nature', 'Understand the Land', 'Design the Forest', 'Shape the Outcome']);
});

test('placement instructions remain in slide history and describe the object that exists', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    assert.match(demo, /kind:'placement'/);
    assert.match(demo, /slide\.kind==='welcome' \|\| slide\.kind==='placement'/);
    assert.match(demo, /Moringa is the second Plant Orb in this map/);
    assert.doesNotMatch(demo, /Totem 2 is a sample PIMO layout/);
});

test('demo introduces the Control panel before explaining scattered plant information', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const opening = [...WELCOME_BOARD_PARAGRAPHS,...WELCOME_BOARD_PARAGRAPHS_PT].join(' ');
    const orientation = demo.slice(demo.indexOf('const DEMO_ORIENTATION_STEPS'), demo.indexOf('const POST_PLACEMENT_AREA_STEP'));
    assert.doesNotMatch(opening, /scattered/);
    assert.ok(orientation.indexOf("title:'Meet your Control panel'") < orientation.indexOf("title:'Every plant holds information'"));
    assert.ok(orientation.indexOf('NourishlandXR brings those layers together') < orientation.indexOf("title:'A Project holds information'"));
    assert.match(demo, /'Welcome to the NourishlandXR demo'[\s\S]*NLXR is an immersive information hub for living landscapes/);
});

test('demo uses one continuous welcome before beginning the Why stage', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const greeting = demo.slice(demo.indexOf('function showArWelcomeShowcase'), demo.indexOf('function runArWelcomeTutorial'));
    assert.doesNotMatch(demo, /runArWelcomeGreeting/);
    assert.match(greeting, /introBoardTitle=demoLocalizedText\('Welcome to the NourishlandXR demo'\)/);
    assert.match(greeting, /NLXR is an immersive information hub for living landscapes/);
    assert.match(greeting, /Take a moment to settle in\. This place is ready to explore\./);
    assert.match(greeting, /arWelcomeSettleStage=true[\s\S]*introBoardTitle=demoLocalizedText\('EXTENDED REALITY, ROOTED IN PLACE'\)/);
    assert.match(greeting, /See the landscape come to life\.[\s\S]*digital plant stories and place-based knowledge appear within the real landscape around you/);
    assert.doesNotMatch(greeting, /Follow one plant to see how it connects to this place/);
    assert.match(greeting, /!openingTyping && welcomeAutoAdvanceReady/);
    assert.match(greeting, /panel\.querySelector\('h2'\)\.textContent=introBoardTitle/);
    assert.match(greeting, /continueButton\.textContent=demoLocalizedText\('Continue'\)/);
    assert.match(greeting, /setHeaderProgress\(null\)/);
    assert.match(greeting, /continueButton\.hidden=true;\s*runArWelcomeTutorial\(0\)/);
    assert.match(demo, /if\(index<=2\)setDemoJourneyStage\('why'\)/);
});

test('plant exploration no longer auto-opens LIM or forces the old cell script',()=>{
    const demo=read('app/screens/temporaryArDemo.js');
    const continuation=demo.slice(demo.indexOf('function continueAfterDemoPim'),demo.indexOf('const LIM_APPLICATION_LENSES'));
    assert.doesNotMatch(continuation,/openPimLimBridge|prepareLimPitchCell|runLimApplicationStory/);
    assert.match(continuation,/clearLimSelection\(\);[\s\S]*limMeshVisible=false;[\s\S]*showDemoAction\('plant2'\)/);
    assert.doesNotMatch(demo,/Add current knowledge|Clear selected knowledge|Connect selected ideas/);
});

test('the first-time journey introduces the Control panel before four practical learning lenses', () => {
    const demo=read('app/screens/temporaryArDemo.js');
    const panel=read('app/services/pimInfoPanel.js');
    const styles=read('app/living-objects.css');
    assert.match(demo,/title:'Meet your Control panel'[\s\S]*title:'Every plant holds information'/);
    assert.equal(DEMO_ARCHETYPE_START_MS,20500);
    assert.doesNotMatch(demo,/welcomeNarrative\(openingElapsed/);
    assert.match(demo,/title:'Meet your Control panel'[\s\S]*title:'Every plant holds information',art:'references'[\s\S]*title:'Imagine arriving in a garden',art:'curiosity'/);
    assert.match(demo,/infoPanel\?\.suspend\(true\)/);
    assert.match(demo,/if\(index===0\)\{[\s\S]*infoPanel\?\.setMediaCollapsed\(true\);[\s\S]*infoPanel\?\.suspend\(false\)/);
    assert.doesNotMatch(demo,/do not need prior plant, farming or technology knowledge|For a beginner|beginners can enter/);
    assert.match(demo,/Read what is here[\s\S]*Understand how it works[\s\S]*Connect information to purpose[\s\S]*Choose, observe and learn/);
    assert.match(demo,/Why does this matter\?/);
    assert.match(demo,/ctx\.fillStyle = '#ffffff'/);
    assert.doesNotMatch(demo,/body:'On your left: your interactive companion/);
    assert.match(panel,/const spatialHeight=\(\)=>phoneAR\?900:headset\?600:height\(\)/);
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
    assert.match(demo, /highlighted:signTargets\.has\(record\.id\) \|\| orbType==='plant' && hoveredPlant===record/);
    assert.match(styles, /nlxr-orb-hover-pulse/);
    assert.doesNotMatch(styles, /nlxr-orb-hover-orbit/);
    assert.match(styles, /--demo-orb-ring,#e2cca0/);
    assert.match(styles, /\.tryit-sim-orb\.is-plant::after\s*\{\s*content:none;/);
});

test('each archetype keeps its ordered illustration while plant media retains honest attribution', () => {
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
    assert.match(panel, /selection\?\.mesh==='lim' && \(selection\.sketchImage \|\| selection\.image\)/);
    assert.match(panel, /showLearning\(content\).*mediaCollapsed=true;mediaTouched=false/s);
    assert.match(panel, /focusPlant\(nextRecord,document,media=null\).*mediaCollapsed=!nextMedia\?\.image;mediaTouched=false/s);
    assert.doesNotMatch(panel, /LIMO cell sketch|LIMO CELL SKETCH|PLANT MEDIA/);
    assert.match(panel, /caption:'',plant:false/);
    assert.match(panel, /caption:plantMedia\?\(identity\?\.media\?\.caption \|\| identity\?\.plant \|\| ''\):''/);
});

test('Totem examples stay generic and use short local signs', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const totemCopy=JSON.stringify(DEMO_CONTENT.zone);
    for (const label of ['Welcome to this area', 'NOTES · nearby', 'PLANT ORBS · around this Totem', 'NEIGHBOUR TOTEM · right']) {
        assert.ok(totemCopy.includes(label), `missing Area example ${label}`);
    }
    assert.match(demo, /'Meet the Totem'/);
    assert.doesNotMatch(demo, /Show Botanical Garden Totem|Rainforest Walk Totem|A Botanical Garden can welcome visitors/);
    assert.match(demo, /demoTotemColor:'#785a43'/);
    assert.match(demo, /demoTotemColor:'#526d7a'/);
});

test('Areas hand the journey to public learning pathways and quiet mapped objects', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const styles = read('app/living-objects.css');
    assert.match(demo, /'Connect plant knowledge to learning',\s*showLimoLearningModes/);
    assert.match(demo, /'Learn here or as a standalone experience'/);
    assert.match(demo, /'Show pathway archetypes',\s*showLimoArchetypes/);
    assert.match(demo, /record\.demoTotemFaded=true;[\s\S]*record\.demoNarrativeFaded=true/);
    assert.match(demo, /record\.demoType==='note'[\s\S]*record\.demoNarrativeFaded=true/);
    assert.match(styles, /\.tryit-sim-marker-note\.is-narrative-faded/);
    assert.match(styles, /\.nlxr-totem-system\.is-narrative-faded \.nlxr-totem-controls/);
    assert.match(demo, /Connect plant knowledge to learning/);
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
    const preview = read('app/features/ar-demo/demoPreviewMarkup.js');
    const creator = read('app/screens/arMode.js');
    const styles = read('app/living-objects.css');
    const pimStyles = read('app/pim.css');
    const profileStyles = read('app/product-v2.css');
    const editorStyles = read('app/style.css');
    assert.match(model, /image: source\.identity\.image/);
    assert.match(panel, /identityImage=document\?\.identity\?\.image/);
    assert.match(panel, /imageHeight=Math\.min\(520,Math\.max\(250,card\.height\*\.42\)\)/);
    assert.ok(MORINGA_PROFILE_IMAGE.endsWith('/assets/moringa-oleifera.jpg'));
    assert.match(preview, /export function demoPlantMedia\(record\)/);
    assert.match(demo, /return showDemoPlantPhoto\(record\)/);
    assert.match(demo, /focusPlant\(record,demoOrbKnowledge\(record\)\.document,plantMedia\)/);
    const conversion=demo.slice(demo.indexOf('function guidePlantConversion'),demo.indexOf('function showSceneContinue'));
    assert.doesNotMatch(conversion,/focusPlant\(/);
    assert.match(creator, /infoPanel\?\.focusPlant\(record,creatorKnowledgeDocument\(record\)\)/);
    assert.match(styles, /\.nlxr-plant-preview img\s*\{[^}]*object-fit:contain/);
    assert.match(pimStyles, /\.pim-web-plant-visual\s*\{[^}]*width: min\(100%, 320px\)/);
    assert.match(pimStyles, /@media \(max-width: 480px\)[\s\S]*\.pim-web-plant-visual\s*\{[^}]*height: min\(44svh, 360px\)/);
    assert.match(profileStyles, /\.v2-profile-intro img\s*\{[^}]*height:clamp\(360px,40vw,520px\)/);
    assert.match(editorStyles, /\.plant-photo-space\s*\{[^}]*height: clamp\(320px, 38vw, 480px\)/);
    assert.ok(statSync(new URL('../app/assets/moringa-oleifera.jpg', import.meta.url)).size < 500_000,
        'optimized Moringa asset should remain suitable for a mobile/headset download');
});

test('Pigeon Pea and Moringa provide deep template branches for demonstration', () => {
    const pigeonById=new Map(PIGEON_PEA_PIM.nodes.map(node=>[node.id,node]));
    assert.ok(PIGEON_PEA_PIM.nodes.length>=70);
    for(const id of ['pollinator-resource','culinary-record','germination-check','leaf-identification','local-introduction-record','soil-observation','pruning-response','health-check']){
        assert.ok(pigeonById.get(id)?.body.length>70,`missing enriched Pigeon Pea cell ${id}`);
    }
    const moringaById=new Map(MORINGA_PIM.nodes.map(node=>[node.id,node]));
    for(const id of ['moringa-canopy-management','moringa-biomass-cycle','moringa-leaf-harvest','moringa-food-context','moringa-germination','moringa-leaf-form','moringa-local-names','moringa-pruning-cycle','moringa-health-observation']){
        assert.ok(moringaById.has(id),`missing enriched Moringa cell ${id}`);
    }
});

test('every trial PIM cell opens into populated, sourced Control-panel content', () => {
    for (const document of [PIGEON_PEA_PIM, MORINGA_PIM]) {
        const validation = validatePimDocument(document);
        assert.equal(validation.valid, true, validation.errors.join('; '));
        assert.ok(document.nodes.length >= 50, `${document.plantId} needs a deep template`);
        const projected = pimToArKnowledge(document);
        assert.ok(projected, `${document.plantId} must reach the spatial presentation`);
        for (const cell of document.nodes) {
            const panel = pimInfoContent(document, cell.path);
            assert.ok(panel?.body?.length > 20, `${document.plantId}/${cell.id} has no Control-panel detail`);
            assert.notEqual(panel.body, 'No detailed information has been added to this cell yet.');
            for (const sourceId of cell.sourceIds) {
                assert.ok(document.sources.some(source => source.id === sourceId), `${document.plantId}/${cell.id} has an unresolved source`);
            }
        }
    }
    const pigeon = new Map(PIGEON_PEA_PIM.nodes.map(cell => [cell.id, cell]));
    const moringa = new Map(MORINGA_PIM.nodes.map(cell => [cell.id, cell]));
    for (const id of ['nitrogen-transfer', 'flower-to-pod', 'split-dhal', 'post-harvest-residues']) assert.ok(pigeon.has(id));
    for (const id of ['moringa-flower-resource', 'moringa-not-nitrogen-fixer', 'moringa-tender-pods', 'moringa-roots-boundary']) assert.ok(moringa.has(id));
    assert.match(moringa.get('moringa-roots-boundary').safetyNote, /Do not eat/);
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
    assert.match(DEMO_ORB_MATERIALS.pigeonPea.style,/--demo-orb-size:56px/);
    assert.match(creator, /shape === 4 \? \.72 : 1/);
    assert.match(renderer, /band\(1\.18,\.022,0,Math\.PI\*2,96\)/);
    assert.match(styles, /border:2px solid var\(--demo-orb-ring/);
    assert.match(styles, /content:none;\s*display:none;/);
});
