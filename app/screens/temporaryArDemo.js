/**
 * TRY IT NOW — a deliberately small, self-contained AR placement demo.
 * It never opens a dashboard or a draggable window before placement.
 */
import { spatialPosition } from '../services/spatialPlacement.js';
import { createMinimalMarkerDraft, relateMinimalMarkers } from '../services/markerWorkflow.js';
import { placementPointerMarkup } from '../services/placementPointer.js';
import { spatialMoveControlMarkup } from '../services/spatialMoveControl.js';
import { createSpatialSphereRenderer, destroySpatialSphereRenderer, drawSpatialOrb } from '../services/spatialSphereRenderer.js';
import { createSpatialTetherRenderer, destroySpatialTetherRenderer, drawSpatialTether } from '../services/spatialTetherRenderer.js';
import { createSpatialPrismRenderer, destroySpatialPrismRenderer, drawSpatialPrism } from '../services/spatialPrismRenderer.js';
import { createSpatialTriangleRenderer, destroySpatialTriangleRenderer, drawSpatialTriangle } from '../services/spatialTriangleRenderer.js';
import { AR_EXPERIENCE_CONFIG } from '../services/arExperienceConfig.js';
import { PIGEON_PEA_AR_KNOWLEDGE, PIGEON_PEA_EXAMPLE } from '../services/pigeonPeaExample.js';
import { currentNxrLanguage, translateNxrText } from '../services/i18n.js';
import { requestImmersiveArSession } from '../services/webxrSession.js';
import { controllerRayEnd, controllerRayFromPose, XR_LASER_POINTER_CONFIG } from '../services/xrPointer.js';
import { PIM_SPATIAL_CONFIG, pimConnectorPath, pimFocusedView, pimNodeChildren, pimNodeHue, pimSpatialPanel, pimSpatialPoseAboveAnchor, pimToggleExpandedPaths, pimVisibleNodes } from '../services/plantInformationMesh.js';
import { PIM_BLOOM_DURATION_MS, PIM_TEXTURE_SIZE, drawPlantInformationHoneycomb, pimHoneycombTargetAtPercent } from '../services/plantInformationMeshCanvas.js';
import { resolvePlantPim } from '../services/pimLegacyAdapter.js';
import { pimToArKnowledge } from '../services/pimModel.js';
import { mountPlantInformationWeb } from '../components/plantInformationWeb.js';
import { PIGEON_PEA_PIM } from '../services/pigeonPeaPim.js';

let appRoot = null;
let session = null;
let sessionMode = 'immersive-ar';
let domOverlayEnabled = false;
let canvas = null;
let gl = null;
let referenceSpace = null;
let hitTestSource = null;
let viewerMatrix = null;
let latestDemoView = null;
let hitMatrix = null;
let latestControllerRay = null;
let marker = null;
let markerType = 'marker';
let markers = [];
let simulatedMode = false;
let program = null;
let buffer = null;
let sphereRenderer = null;
let tetherRenderer = null;
let prismRenderer = null;
let triangleRenderer = null;
let ending = false;
let demoStage = 'plant';
let boardTypingTimer = null;
let aimRevealTimer = null;
let pointerPressTimer = null;
let demoHoldTimer = null;
let introNarrationTimer = null;
let introSceneStartedAt = 0;
let introSceneActive = true;
let introBoardVisible = true;
let introBoardHasEntered = false;
let introWorldAnchor = null;
let introNoteTexture = null;
let introNoteCanvas = null;
let introBoardVisibleBody = '';
let introBoardTextureDirty = true;
let introTextureUploadedAt = 0;
let introFrameToken = 0;
let introTextureFrameToken = -1;
let introKnowledgeTexture = null;
let introControlTexture = null;
let introControlTextureLabel = '';
let introPointerTexture = null;
let introTaglineVisible = true;
let introKnowledgeVisible = false;
let introBoardTitle = 'NourishlandXR';
let introBoardBody = 'A short guided demo of Plant Live Tags and Notes.';
let placementReady = false;
let demoHeldIndex = -1;
let suppressDemoMarkerClick = false;
let suppressSessionSelectUntil = 0;
let demoWebModeOpen = false;
let demoPimWebController = null;
let groundYEstimate = null;
const AR_PHONE_COMFORT = Object.freeze({
    pointerOffsetCss: '3.5cm',
    pointerOffsetPixels: 132.3,
    boardPosition: [0, 0.82, -2.8],
    boardScale: [5.6, 10.8]
});
// The shared demo quad is .4 m by .16 m before model scaling. These values
// produce the configured 1.44 m by 1.08 m transparent PIM interaction wall.
const DEMO_PIM_IMMERSIVE_SCALE = Object.freeze({
    x: PIM_SPATIAL_CONFIG.expandedSurfaceWidthMetres / .4,
    y: PIM_SPATIAL_CONFIG.expandedSurfaceHeightMetres / .16
});
// Creator Mode's medium Note is 1.88 m x .69 m on the shared quad. The demo
// keeps the same real-world proportions at 88% so it reads as a nearby Note,
// without turning into a flyaway presentation board.
const DEMO_NOTE_IMMERSIVE_SCALE = Object.freeze({ x: 4.14, y: 3.8 });
const DEMO_TOTEM_HALF_HEIGHT_METRES = .9;
const DEMO_STABLE_EYE_HEIGHT_METRES = 1.55;
const WELCOME_BOARD_PARAGRAPHS = Object.freeze([
    'Welcome to the NourishlandXR demo interface.',
    'Augmented reality(AR) & Mixed reality(XR) are technologies that can help us better understand and interact with the world around us by connecting virtual information to real places.',
    'NourishLandXR is a portal for plant-related information, a plant mapping tool and a experience editor for visitors and students. This demo shows a few examples of how information can be mapped real places.'
]);
const WELCOME_BOARD_PARAGRAPHS_PT = Object.freeze([
    'Bem-vindo à interface de demonstração do NourishlandXR.',
    'A realidade aumentada (RA) e a realidade mista (XR) são tecnologias que nos ajudam a compreender e interagir melhor com o mundo à nossa volta, ligando informação virtual a lugares reais.',
    'O Nourishland XR é um portal de informação sobre plantas, uma ferramenta de mapeamento de ecosistemas e um editor de experiências para visitantes e estudantes. Esta demonstração mostra algumas formas de ligar informação sobre plantas a lugares reais.'
]);
const demoLocalizedText = value => translateNxrText(value);
const welcomeBoardParagraphs = () => currentNxrLanguage() === 'pt-PT'
    ? WELCOME_BOARD_PARAGRAPHS_PT
    : currentNxrLanguage() === 'nl-NL'
        ? WELCOME_BOARD_PARAGRAPHS.map(demoLocalizedText)
        : WELCOME_BOARD_PARAGRAPHS;
const demoIsPortuguese = () => currentNxrLanguage() === 'pt-PT';
const demoIsDutch = () => currentNxrLanguage() === 'nl-NL';
const demoIntroLabel = () => demoIsPortuguese() ? 'UMA INTRODUÇÃO VIVA' : demoIsDutch() ? 'EEN LEVENDE INTRODUCTIE' : 'A LIVING INTRODUCTION';
// The board is updated only when a new character is ready, so there is no
// reason to wait for another frame before uploading that character to WebGL.
// Keeping this at zero prevents Quest refresh rates from making the copy
// appear in word-sized chunks.
const DEMO_TEXT_TEXTURE_INTERVAL_MS = 0;
const DEMO_SEQUENCE = ['plant', 'plant2', 'note', 'totem'];
const DEMO_ORB_MATERIALS = Object.freeze({
    brown: {
        shell: [0.34, 0.23, 0.14],
        core: [0.67, 0.48, 0.27],
        radius: 0.07,
        style: '--demo-orb-size:56px;--demo-orb-light:#ead7ba;--demo-orb-mid:#8a6946;--demo-orb-dark:#3e2a1c;--demo-orb-core-light:#f1dfbd;--demo-orb-core-mid:#a77b48;--demo-orb-core-dark:#4d321e'
    },
    pigeonPea: {
        shell: [0.08, 0.24, 0.14],
        core: [0.22, 0.48, 0.27],
        radius: 0.09,
        style: '--demo-orb-size:78px;--demo-orb-light:#c3e0b1;--demo-orb-mid:#427d4f;--demo-orb-dark:#112f1e;--demo-orb-core-light:#dcefc5;--demo-orb-core-mid:#5a9a5b;--demo-orb-core-dark:#1d5331'
    },
    green: {
        shell: [0.34, 0.72, 0.28],
        core: [0.75, 0.95, 0.42],
        radius: 0.074,
        style: '--demo-orb-size:62px;--demo-orb-light:#efffd8;--demo-orb-mid:#79ad65;--demo-orb-dark:#315d3c;--demo-orb-core-light:#f2ffd9;--demo-orb-core-mid:#b9e66f;--demo-orb-core-dark:#3f7f38'
    }
});
const BIOMAP_CATEGORIES = Object.freeze({
    FOOD: [],
    FOREST: [],
    'PLANT LITERACY': ['DWARF', 'DECIDUOUS', 'EVERGREEN', 'ANNUAL', 'PERENNIAL'],
    RELATIONSHIPS: [],
    FRUIT: [],
    FLOWER: [],
    SEED: [],
    GUILD: [],
    'MICRO CLIMATE': ['TROPICAL', 'SUBTROPICAL', 'WARM TEMPERATE', 'COOL TEMPERATE', 'MEDITERRANEAN', 'ARID'],
    USES: ['CULINARY', 'MEDICINAL', 'INDUSTRIAL'],
    PROPAGATION: ['GRAFTING', 'GERMINATION', 'MARCOTTS', 'CUTTINGS', 'CLONING'],
    LAYERS: ['CANOPY', 'LOW TREE', 'SHRUB', 'HERBACEOUS', 'GROUNDCOVER', 'RHIZOSPHERE', 'VERTICAL']
});
const INTRO_KNOWLEDGE_KEYWORDS = Object.keys(BIOMAP_CATEGORIES);
const DEMO_CONTENT = Object.freeze({
    plant: { title: 'Plant · Pigeon Pea', accent: '#b7e895', lines: ['CLIMATE  Tropical · subtropical', 'USES  Food · soil · biomass', 'RELATIONSHIPS  Pollinators · intercropping'] },
    note: { title: 'Focus Point · Seasonal observation', accent: '#f0cf70', lines: ['STORY  New growth after summer rain', 'MEDIA  Sound · animation · images', 'ACTION  Revisit · compare · update'] },
    zone: {
        title: 'Food Forest Totem',
        accent: '#75c9b6',
        bubbles: [
            'FOOD FOREST AREA',
            'Pigeon Pea + Moringa guild',
            'Warm sheltered microclimate',
            'Pollinator activity',
            'Seasonal garden observations'
        ]
    }
});
const MORINGA_PROFILE = Object.freeze({
    common_name: 'Moringa Tree',
    scientific_name: 'Moringa oleifera',
    pim: Object.freeze({
        schemaVersion: 1,
        plantId: 'moringa-oleifera',
        identity: Object.freeze({
            commonName: 'Moringa Tree',
            scientificName: 'Moringa oleifera',
            identityStatement: 'A fast-growing food and support tree for tropical and subtropical gardens.'
        }),
        nodes: Object.freeze([
            { id: 'moringa-forest-layer', parentId: 'food-forest', title: 'Canopy / low tree layer', preview: 'Light canopy role', body: 'A fast-growing low tree within a layered food forest.', informationType: 'fact', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-relationships', parentId: 'food-forest', title: 'Garden relationships', preview: 'Shade and mulch', body: 'Light shade and pruned biomass can support nearby garden plants.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-culinary', parentId: 'uses', title: 'Culinary', preview: 'Leaves and pods', body: 'Nutritious leaves and long seed pods are used as food.', informationType: 'practice', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'medicinal', parentId: 'uses', title: 'Medicinal', preview: 'Attributed traditions', body: 'Traditional uses must record their source and cultural context.', informationType: 'traditional_knowledge', evidenceStatus: 'needs_review', safetyNote: 'Traditional knowledge only; not medical advice.', status: 'published' },
            { id: 'craft', parentId: 'uses', title: 'Craft', preview: 'Dry stems', body: 'Dry stems and other garden material can be used in simple crafts.', informationType: 'practice', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-seed', parentId: 'propagation', title: 'Seed', preview: 'Direct sowing', body: 'Seed and direct sowing are common starting methods.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-cuttings', parentId: 'propagation', title: 'Cuttings', preview: 'Vegetative start', body: 'Cuttings are another propagation pathway.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-botanical-name', parentId: 'scientific-information', title: 'Botanical name', preview: 'Moringa oleifera', body: 'Moringa oleifera', informationType: 'fact', evidenceStatus: 'verified', status: 'published' },
            { id: 'moringa-family', parentId: 'scientific-information', title: 'Family', preview: 'Moringaceae', body: 'Moringaceae', informationType: 'fact', evidenceStatus: 'verified', status: 'published' },
            { id: 'moringa-growth-form', parentId: 'scientific-information', title: 'Growth form', preview: 'Fast-growing small tree', body: 'A fast-growing small tree.', informationType: 'fact', evidenceStatus: 'sourced', status: 'published' },
            { id: 'moringa-origin', parentId: 'historical-data', title: 'Origin', preview: 'South Asia', body: 'Documented origin in South Asia.', informationType: 'historical_record', evidenceStatus: 'sourced', status: 'published' },
            { id: 'moringa-food-cultures', parentId: 'historical-data', title: 'Food cultures', preview: 'Tropical cultivation', body: 'Cultivated through many tropical regions.', informationType: 'historical_record', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-climate', parentId: 'cultivation', title: 'Climate', preview: 'Tropical and subtropical', body: 'Adapted to tropical and subtropical growing conditions.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-care', parentId: 'cultivation', title: 'Growing care', preview: 'Sun, drainage, pruning', body: 'Grow in full sun and free-draining soil, with regular pruning where appropriate.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' }
        ])
    })
});
const MORINGA_KNOWLEDGE = Object.freeze(pimToArKnowledge(resolvePlantPim(MORINGA_PROFILE, {
    id: 'moringa-oleifera',
    plantId: 'moringa-oleifera',
    name: 'Moringa Tree',
    commonName: 'Moringa Tree',
    title: 'Moringa Tree',
    scientificName: 'Moringa oleifera'
})));
const knowledgeFor = record => record.demoPlantPreset === 'moringa' ? MORINGA_KNOWLEDGE : PIGEON_PEA_AR_KNOWLEDGE;
const NOTE_TEMPLATES = Object.freeze({
    poi: { title: 'Point of Interest · Seasonal observation', accent: '#f0cf70', lines: ['PURPOSE  Draw attention to this place', 'MEDIA  Sound · animation · images', 'ACTION  Revisit · compare · update'] },
    plaque: { title: 'Garden plaque · Grow gently', accent: '#f2d997', lines: ['“A garden teaches us to care for what comes next.”', 'Pause · notice · return', 'A small thought anchored to this living place'] },
    warning: { title: 'Warning Note · DON’T GO HERE', accent: '#ef9b78', lines: ['WARNING  Do not enter this place', 'GUIDANCE  Explain the risk or boundary', 'FUTURE  Sound · alerts · animation'] }
});
const DEMO_NOTE_TEMPLATE_KEYS = Object.freeze(Object.keys(NOTE_TEMPLATES));

function clearSessionState() {
    hitTestSource?.cancel?.();
    hitTestSource = null;
    referenceSpace = null;
    viewerMatrix = null;
    latestDemoView = null;
    hitMatrix = null;
    latestControllerRay = null;
    groundYEstimate = null;
    marker = null;
    markerType = 'marker';
    demoStage = 'plant';
    placementReady = false;
    demoHeldIndex = -1;
    suppressSessionSelectUntil = 0;
    demoWebModeOpen = false;
    clearTimeout(boardTypingTimer);
    clearTimeout(aimRevealTimer);
    clearTimeout(pointerPressTimer);
    clearTimeout(demoHoldTimer);
    clearTimeout(introNarrationTimer);
    boardTypingTimer = null;
    aimRevealTimer = null;
    pointerPressTimer = null;
    demoHoldTimer = null;
    introNarrationTimer = null;
    introSceneStartedAt = 0;
    introSceneActive = true;
    introBoardVisible = true;
    introBoardHasEntered = false;
    introWorldAnchor = null;
    if (introNoteTexture) gl?.deleteTexture(introNoteTexture);
    if (introKnowledgeTexture) gl?.deleteTexture(introKnowledgeTexture);
    if (introControlTexture) gl?.deleteTexture(introControlTexture);
    if (introPointerTexture) gl?.deleteTexture(introPointerTexture);
    introNoteTexture = null;
    introNoteCanvas = null;
    introBoardVisibleBody = '';
    introBoardTextureDirty = true;
    introTextureUploadedAt = 0;
    introFrameToken = 0;
    introTextureFrameToken = -1;
    introKnowledgeTexture = null;
    introControlTexture = null;
    introControlTextureLabel = '';
    introPointerTexture = null;
    demoPimWebController?.destroy();
    demoPimWebController = null;
    introTaglineVisible = true;
    introKnowledgeVisible = false;
    markers.forEach(record => {
        if (record.texture) gl?.deleteTexture(record.texture);
        if (record.boundaryTexture) gl?.deleteTexture(record.boundaryTexture);
    });
    destroySpatialSphereRenderer(gl, sphereRenderer);
    destroySpatialTetherRenderer(gl, tetherRenderer);
    destroySpatialPrismRenderer(gl, prismRenderer);
    destroySpatialTriangleRenderer(gl, triangleRenderer);
    sphereRenderer = null;
    tetherRenderer = null;
    prismRenderer = null;
    triangleRenderer = null;
    markers = [];
    program = null;
    buffer = null;
    canvas?.remove();
    canvas = null;
    gl = null;
    sessionMode = 'immersive-ar';
    domOverlayEnabled = false;
}

function returnToWelcome() {
    const active = session;
    ending = true;
    session = null;
    clearSessionState();
    active?.end().catch(() => {});
    window.renderLaunchScreen();
}

function setGuide(message) {
    const guide = appRoot?.querySelector('[data-tryit-guide]');
    if (guide) guide.textContent = message;
}

function nextDemoTextLength(text, currentLength) {
    return Math.min(text.length, currentLength + 1);
}

function demoTextTypingDelay(text, visibleLength) {
    const lastVisibleCharacter = text[visibleLength - 1] || '';
    if (/\n/.test(lastVisibleCharacter)) return 260;
    if (/[.!?]/.test(lastVisibleCharacter)) return 240;
    if (/[,;]/.test(lastVisibleCharacter)) return 130;
    if (/\s/.test(lastVisibleCharacter)) return 24;
    return 34;
}

function showDemoAction(nextStage) {
    const messages = {
        plant2: ['A living Plant Profile', 'The first orb now carries a hub of information in real space. Continue, then let’s try Moringa.'],
        note: ['Two living profiles', 'Both Plants now carry their own spatial knowledge.']
    };
    const [title, text] = messages[nextStage] || ['Continue the journey', 'Move to the next tutorial step.'];
    showGuidedChoice(`<h2>${title}</h2><p>${text}</p><button type="button" data-demo-choice="continue">Continue</button>`, choice => {
        if (choice === 'continue') armDemoPlacement(nextStage);
    });
}

function virtualTagProfileMarkup(profile = PIGEON_PEA_EXAMPLE) {
    return `<div class="tryit-virtual-tag-shell">
        <header class="tryit-virtual-tag-header">
          <span>WEB MODE · PLANT LIVE TAG</span>
          <strong>FULL PLANT PROFILE</strong>
        </header>
        <main class="tryit-virtual-tag-profile" aria-labelledby="tryitVirtualTagTitle">
          <section class="tryit-virtual-tag-identity">
            <span class="tryit-virtual-tag-orb" aria-hidden="true"></span>
            <div><small>${profile.name} · COMPLETE PLANT FILE</small><h2 id="tryitVirtualTagTitle">${profile.commonName}</h2><p><i>${profile.scientificName}</i> · ${profile.family}</p><p>${profile.plantType}</p></div>
          </section>
          <section class="tryit-virtual-tag-tutorial">
            <small>TUTORIAL · WEB MODE</small>
            <strong>The same Plant Profile can be read outside AR.</strong>
            <p>${profile.shortProfile}</p>
            <p>A Plant Live Tag can open this full, view-only plant file. Close Web Mode to return to the same AR scene and continue with Moringa.</p>
          </section>
          <section class="tryit-virtual-tag-pim" aria-label="Pigeon Pea Plant Information Mesh"><div data-demo-pim-web-mount></div></section>
        </main>
        <button type="button" class="tryit-virtual-tag-close" data-demo-close-web-mode>CLOSE WEB MODE · RETURN TO AR</button>
      </div>`;
}

function closeDemoVirtualTag(record) {
    const webMode = appRoot?.querySelector('[data-demo-virtual-tag]');
    if (!webMode || !demoWebModeOpen) return;
    webMode.classList.add('is-closing');
    suppressSessionSelectUntil = performance.now() + 900;
    setTimeout(() => {
        demoPimWebController?.destroy();
        demoPimWebController = null;
        webMode.hidden = true;
        webMode.classList.remove('is-closing');
        appRoot?.querySelector('.tryit-demo')?.classList.remove('is-web-mode');
        const stage = appRoot?.querySelector('.tryit-stage');
        if (stage) {
            stage.inert = false;
            stage.removeAttribute('aria-hidden');
        }
        demoWebModeOpen = false;
        record.demoExpanded = false;
        refreshDemoRecord(record);
        armDemoPlacement('plant2');
    }, 320);
}

function openDemoVirtualTag(record) {
    const webMode = appRoot?.querySelector('[data-demo-virtual-tag]');
    if (!webMode || demoWebModeOpen) return;
    demoWebModeOpen = true;
    placementReady = false;
    suppressSessionSelectUntil = Number.POSITIVE_INFINITY;
    hideGuidedChoice({ hideBoard: true });
    appRoot?.querySelector('[data-tryit-place]')?.setAttribute('hidden', '');
    appRoot?.querySelector('.tryit-demo')?.classList.add('is-web-mode');
    const stage = appRoot?.querySelector('.tryit-stage');
    if (stage) {
        stage.inert = true;
        stage.setAttribute('aria-hidden', 'true');
    }
    webMode.innerHTML = virtualTagProfileMarkup();
    webMode.hidden = false;
    demoPimWebController = mountPlantInformationWeb(webMode.querySelector('[data-demo-pim-web-mount]'), {
        document: PIGEON_PEA_PIM,
        editable: false
    });
    webMode.querySelector('[data-demo-close-web-mode]')?.addEventListener('click', () => closeDemoVirtualTag(record));
    setGuide('Web Mode is showing the complete Pigeon Pea Plant Profile.');
}

function inviteVirtualTag(record) {
        showGuidedChoice('<h2>Live Tags</h2><p>This Plant Profile also has a full, view-only page in Web Mode. You will be able to place a real tag on your plant to Open the plant profile.</p><button type="button" data-demo-choice="virtual-tag">OPEN PLANT LIVE TAG</button>', choice => {
        if (choice === 'virtual-tag') openDemoVirtualTag(record);
    });
}

function demoContentFor(record) {
    return record.demoContent || DEMO_CONTENT[record.demoType || record.type];
}

function hideGuidedChoice({ hideBoard = false } = {}) {
    const panel = appRoot?.querySelector('[data-tryit-guided-choice]');
    if (hideBoard) {
        panel?.setAttribute('hidden', '');
        panel?.classList.remove('is-persistent-demo-board');
    } else {
        // Keep the large instruction board as the stable demo surface. It is
        // made click-through while it is only carrying the previous message,
        // so placed markers and controls remain reachable underneath it.
        panel?.removeAttribute('hidden');
        panel?.classList.add('is-persistent-demo-board');
    }
    appRoot?.querySelector('[data-tryit-intro-continue]')?.setAttribute('hidden', '');
    appRoot?.querySelector('[data-tryit-final-actions]')?.setAttribute('hidden', '');
    introBoardVisible = !hideBoard;
}

function activateImmersiveDemoControl() {
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    if (continueButton && !continueButton.hidden) {
        continueButton.click();
        return true;
    }
    const choiceButton = appRoot?.querySelector('[data-tryit-guided-choice]:not([hidden]) [data-demo-choice]:not([hidden])');
    if (choiceButton) {
        choiceButton.click();
        return true;
    }
    return false;
}

function prepareTutorialBoard(panel) {
    const firstArrival = !introBoardHasEntered;
    panel.classList.add('is-welcome-board');
    panel.classList.remove('is-persistent-demo-board');
    introBoardVisible = true;
    panel.classList.remove('is-leaving');
    panel.hidden = false;
    if (firstArrival) {
        introBoardHasEntered = true;
        panel.classList.add('is-entering');
    } else {
        panel.classList.remove('is-entering');
    }
    return firstArrival;
}

function showGuidedChoice(html, onClick = () => {}, options = {}) {
    const panel = appRoot?.querySelector('[data-tryit-guided-choice]');
    if (!panel) return;
    panel.innerHTML = html;
    panel.classList.remove('is-persistent-demo-board');
    const title = panel.querySelector('h2');
    const paragraph = panel.querySelector('p');
    if (title) title.textContent = demoLocalizedText(title.textContent);
    if (paragraph) paragraph.textContent = demoLocalizedText(paragraph.textContent);
    panel.querySelectorAll('button').forEach(button => {
        if (button.children.length === 0) button.textContent = demoLocalizedText(button.textContent);
    });
    const controls = [...panel.children].filter(child => child !== title && child !== paragraph);
    const boardLabel = document.createElement('small');
    const textWindow = document.createElement('div');
    boardLabel.textContent = demoIntroLabel();
    textWindow.className = 'tryit-board-text-window';
    panel.replaceChildren(boardLabel);
    if (title) panel.append(title);
    if (paragraph) {
        textWindow.append(paragraph);
        panel.append(textWindow);
    }
    controls.forEach(control => panel.append(control));
    prepareTutorialBoard(panel);
    clearTimeout(boardTypingTimer);
    const fullText = paragraph?.textContent || '';
    const revealTargets = [...panel.querySelectorAll('button, label, .tryit-guided-grid')];
    const choiceButtons = [...panel.querySelectorAll('[data-demo-choice]')];
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    const finalActions = appRoot?.querySelector('[data-tryit-final-actions]');
    introSceneActive = true;
    introBoardTitle = title?.textContent || 'NourishLand XR';
    introBoardBody = fullText;
    introBoardVisibleBody = '';
    introBoardTextureDirty = true;
    continueButton?.setAttribute('hidden', '');
    finalActions?.setAttribute('hidden', '');
    choiceButtons.forEach(button => button.setAttribute('hidden', ''));
    revealTargets.forEach(target => target.classList.add('is-awaiting-text'));
    let typedLength = 0;
    let typing = Boolean(paragraph && fullText);
    let completionNotified = false;
    const revealControls = () => {
        if (choiceButtons.length === 1 && continueButton) {
            const choiceButton = choiceButtons[0];
            continueButton.textContent = choiceButton.dataset.demoChoice === 'continue' ? 'Continue' : choiceButton.textContent.trim();
            continueButton.onclick = () => {
                suppressSessionSelectUntil = performance.now() + 700;
                onClick(choiceButton.dataset.demoChoice);
            };
            continueButton.hidden = false;
        } else if (choiceButtons.length > 1 && finalActions) {
            finalActions.hidden = false;
        }
    };
    const finishTyping = () => {
        clearTimeout(boardTypingTimer);
        if (paragraph) paragraph.textContent = fullText;
        introBoardVisibleBody = fullText;
        introBoardTextureDirty = true;
        typing = false;
        revealTargets.forEach(target => target.classList.remove('is-awaiting-text'));
        panel.classList.remove('is-typing');
        revealControls();
        if (!completionNotified) {
            completionNotified = true;
            options.onTextComplete?.();
        }
    };
    const typeNextCharacter = () => {
        if (!typing || !paragraph) return;
        typedLength = nextDemoTextLength(fullText, typedLength);
        paragraph.textContent = fullText.slice(0, typedLength);
        introBoardVisibleBody = fullText.slice(0, typedLength);
        introBoardTextureDirty = true;
        if (typedLength >= fullText.length) return finishTyping();
        const typingDelay = demoTextTypingDelay(fullText, typedLength);
        boardTypingTimer = setTimeout(typeNextCharacter, typingDelay);
    };
    if (typing) {
        paragraph.textContent = '';
        panel.classList.add('is-typing');
        boardTypingTimer = setTimeout(typeNextCharacter, 180);
    } else {
        finishTyping();
    }
    panel.onclick = () => {
        if (typing) {
            finishTyping();
        }
    };
    setGuide(`${introBoardTitle}. ${fullText}`);
}

function showIntroBoard(title, body, buttonLabel, onContinue, options = {}) {
    const localizedTitle = demoLocalizedText(title);
    const paragraphs = (Array.isArray(body) ? body : [body])
        .map(value => demoLocalizedText(String(value || '').trim()))
        .filter(Boolean);
    const bodyText = paragraphs.join('\n\n');
    introSceneActive = true;
    introBoardTitle = localizedTitle;
    introBoardBody = bodyText;
    introBoardVisibleBody = '';
    introBoardTextureDirty = true;
    clearTimeout(boardTypingTimer);
    const board = appRoot?.querySelector('[data-tryit-guided-choice]');
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    const finalActions = appRoot?.querySelector('[data-tryit-final-actions]');
    let typingStartDelay = 220;
    let typedLength = 0;
    let typing = true;
    let completionNotified = false;
    const paintBoardParagraphs = visibleText => {
        const paragraphElements = [...(board?.querySelectorAll('.tryit-board-text-window p') || [])];
        let start = 0;
        paragraphs.forEach((paragraph, index) => {
            const end = start + paragraph.length;
            if (paragraphElements[index]) {
                paragraphElements[index].textContent = visibleText.slice(start, end);
                paragraphElements[index].classList.toggle('is-current', visibleText.length >= start && visibleText.length <= end);
            }
            start = end + 2;
        });
    };
    const finishTyping = () => {
        clearTimeout(boardTypingTimer);
        introBoardVisibleBody = bodyText;
        introBoardTextureDirty = true;
        paintBoardParagraphs(bodyText);
        board?.classList.add('is-copy-ready');
        board?.classList.remove('is-typing');
        typing = false;
        if (continueButton && buttonLabel) continueButton.hidden = false;
        if (!completionNotified) {
            completionNotified = true;
            options.onTextComplete?.();
        }
    };
    const typeNextCharacter = () => {
        if (!typing) return;
        board?.classList.add('is-copy-ready');
        typedLength = nextDemoTextLength(bodyText, typedLength);
        introBoardVisibleBody = bodyText.slice(0, typedLength);
        introBoardTextureDirty = true;
        paintBoardParagraphs(introBoardVisibleBody);
        if (typedLength >= bodyText.length) return finishTyping();
        const typingDelay = demoTextTypingDelay(bodyText, typedLength);
        boardTypingTimer = setTimeout(typeNextCharacter, typingDelay);
    };
    if (board) {
        board.classList.add('is-typing');
        board.classList.remove('is-copy-ready');
        board.innerHTML = `<small>${demoIntroLabel()}</small><h2>${localizedTitle}</h2><div class="tryit-board-text-window">${paragraphs.map(() => '<p></p>').join('')}</div>`;
        const firstArrival = prepareTutorialBoard(board);
        if (firstArrival) {
            introSceneStartedAt = performance.now();
            typingStartDelay = 1800;
        }
        board.onclick = () => {
            if (typing) finishTyping();
        };
    }
    finalActions?.setAttribute('hidden', '');
    if (continueButton && buttonLabel) {
        continueButton.textContent = demoLocalizedText(buttonLabel);
        continueButton.hidden = true;
        continueButton.onclick = () => {
            suppressSessionSelectUntil = performance.now() + 700;
            onContinue();
        };
    } else if (continueButton) {
        continueButton.hidden = true;
        continueButton.onclick = null;
    }
    boardTypingTimer = setTimeout(typeNextCharacter, typingStartDelay);
    setGuide(`${localizedTitle}. ${bodyText}`);
}

function finishIntroBoard() {
    clearTimeout(boardTypingTimer);
    // The large welcome/instruction board stays present for the entire demo.
    // The old small spatial welcome card is intentionally never restored.
    appRoot?.querySelector('[data-tryit-intro]')?.setAttribute('hidden', '');
    const panel = appRoot?.querySelector('[data-tryit-guided-choice]');
    panel?.removeAttribute('hidden');
    panel?.classList.add('is-persistent-demo-board');
    appRoot?.querySelector('[data-tryit-intro-continue]')?.setAttribute('hidden', '');
    appRoot?.querySelector('[data-tryit-final-actions]')?.setAttribute('hidden', '');
    introBoardVisible = true;
}

function runArWelcomeTutorial() {
    showIntroBoard(
        'Nourishland XR',
        welcomeBoardParagraphs(),
        demoLocalizedText('Continue'),
        () => {
            finishIntroBoard();
            clearTimeout(aimRevealTimer);
            // Do not let the WebXR select generated by pressing Continue carry
            // through into placement. The next deliberate aim press places it.
            suppressSessionSelectUntil = performance.now() + 700;
            armDemoPlacement('plant');
        }
    );
}

function guidePlantConversion(record) {
    const moringa = record.tutorialStage === 'plant2';
    const plantName = moringa ? 'Moringa Tree' : PIGEON_PEA_EXAMPLE.commonName;
    setGuide(`${moringa ? 'Your second' : 'Your first'} Plant orb is placed.`);
    const completeConversion = () => {
        record.type = 'plant';
        record.demoType = 'plant';
        record.name = plantName;
        record.demoPlantPreset = moringa ? 'moringa' : PIGEON_PEA_EXAMPLE.slug;
        if (!moringa) {
            record.demoExampleId = PIGEON_PEA_EXAMPLE.id;
            record.demoExampleName = PIGEON_PEA_EXAMPLE.name;
        }
        record.demoExpanded = false;
        record.demoActiveBranch = '';
        record.demoExpandedBranches = [];
        record.informationPosition = plantInformationPosition(record);
        record.demoAlive = true;
        record.demoInteractive = true;
        record.revealTitle = true;
        record.revealLines = 3;
        record.awaitingProfileReveal = true;
        const pointer = appRoot?.querySelector('[data-tryit-place]');
        pointer?.setAttribute('hidden', '');
        pointer?.classList.remove('is-revealing', 'is-ready');
        refreshDemoRecord(record);
        setGuide(`Press the ${plantName} orb to reveal its connected Plant Profile.`);
    };
    showIntroBoard(
        moringa ? 'A SECOND PLANT ORB' : 'What is A plant Orb ?',
        moringa
            ? 'This Moringa orb can carry its own Plant Profile as well and can be linked to other plants. Press the Moringa orb to explore its information tree.'
            : [
                'A plant Orb is  knowledge stays connected to where a plant grows. A simple Plant orb can become a extended hub of information, part of a garden guild or linked into a ecosystem.',
                'Lets pick a sample plant. A pigeon pea.  its one of the best plants to have in a garden. A highly productive support plant that provides food, replenished soil and biodiversity within the garden. Adjust its position if needed.',
                'Press Continue to explore its information tree.'
            ],
        'Continue',
        () => {
            suppressSessionSelectUntil = performance.now() + 700;
            finishIntroBoard();
            completeConversion();
        }
    );
}

function showSceneContinue(label, onContinue) {
    hideGuidedChoice();
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    if (!continueButton) return;
    continueButton.textContent = demoLocalizedText(label);
    continueButton.onclick = () => {
        suppressSessionSelectUntil = performance.now() + 700;
        continueButton.hidden = true;
        onContinue();
    };
    continueButton.hidden = false;
}

function cycleDemoNoteTemplate(record) {
    if (!record || record.demoType !== 'note') return false;
    const current = Math.max(0, Number(record.demoNoteTemplateIndex) || 0);
    record.demoNoteTemplateIndex = (current + 1) % DEMO_NOTE_TEMPLATE_KEYS.length;
    const templateKey = DEMO_NOTE_TEMPLATE_KEYS[record.demoNoteTemplateIndex];
    record.demoContent = NOTE_TEMPLATES[templateKey];
    record.name = record.demoContent.title;
    refreshDemoRecord(record);
    setGuide(`${record.demoContent.title} is using the same Note template and remains anchored in the same place.`);
    return true;
}

function showDemoClosingMessage() {
    showIntroBoard(
        'NourishlandXR',
        [
            'We hope NourishlandXR gives teachers and educators an engaging way to share knowledge, inspire curiosity, and help people reconnect with nature and the systems that produce our food.',
            'Together, we can create new ways to explore, learn from, share, and care for the living world around us.'
        ],
        'Finish demo',
        returnToWelcome
    );
}

function createDemoTotemExample() {
    const source = [...markers].reverse().find(record => record.demoType === 'note') || markers.at(-1);
    const sourcePosition = source?.position || placementPosition() || { x: 0, y: 0, z: -1.4 };
    const sourceAnchor = source?.simulatedAnchor || { x: 50, y: 56 };
    const groundBaseY = demoGroundBaseY(hitMatrix, viewerMatrix, groundYEstimate);
    groundYEstimate = groundBaseY;
    const totem = {
        ...createMinimalMarkerDraft('area_checkpoint', {
            name: 'Food Forest Totem',
            description: 'An example of Area information attached to a Totem Marker.'
        }),
        // Spatial prisms are positioned from their centre. Raising the centre
        // by one half-height keeps the Totem's base exactly on the detected or
        // estimated ground plane, upright from the ground rather than at gaze.
        position: {
            x: sourcePosition.x + .72,
            y: groundBaseY + DEMO_TOTEM_HALF_HEIGHT_METRES,
            z: sourcePosition.z + .12
        },
        groundBaseY,
        type: 'area_checkpoint',
        demoType: 'zone',
        tutorialStage: 'totem',
        demoExpanded: true,
        demoInteractive: true,
        demoPanelOffset: { x: 0, y: 0 },
        simulatedAnchor: {
            x: Math.max(16, Math.min(84, sourceAnchor.x + 24)),
            y: Math.max(64, Math.min(80, sourceAnchor.y + 14))
        },
        revealTitle: true,
        revealLines: 5,
        demoContent: DEMO_CONTENT.zone,
        texture: null
    };
    totem.texture = createMarkerTexture(totem);
    markers.push(totem);
    updateSimulatedMarkers();
    setGuide('This Totem keeps Area knowledge anchored to its real place. Press Continue when you are ready.');
    showSceneContinue('Continue', showDemoClosingMessage);
}

function showTotemIntroduction() {
    showIntroBoard(
        'Totem Markers',
        [
            'Totems are the epicenters of each area where plant orbs live.',
            'They carry information about guilds and microclimates and curiosities about a specific area',
            'They also Help anchor virtual information into real spaces.',
            'Press continue and see one example of information attached to a totem.'
        ],
        'Continue',
        () => {
            finishIntroBoard();
            createDemoTotemExample();
        }
    );
}

function showSpatialGardenSummary() {
    showIntroBoard(
        'Your spatial garden information  is starting to become alive.',
        'You placed two Plant Live Tags, opened their Plant Profiles, and added a Note.',
        'Continue',
        showTotemIntroduction
    );
}

function guideNoteConversion(record) {
    const pointer = appRoot?.querySelector('[data-tryit-place]');
    pointer?.setAttribute('hidden', '');
    pointer?.classList.remove('is-revealing', 'is-ready', 'is-pressed');
    setGuide('Your Note is placed.');
    showIntroBoard(
        'Add a Note',
        'A Note is a soft, flat information bubble attached to its place. Use it for an observation, guidance, memory, or anything worth noticing again.',
        'Continue',
        () => {
            finishIntroBoard();
            record.demoExpanded = false;
            record.revealTitle = true;
            record.revealLines = 3;
            refreshDemoRecord(record);
            setGuide('The Note remains at Creator Mode size and in its placed position. Tap it to preview another Note type, or press Continue.');
            showSceneContinue('Continue', showSpatialGardenSummary);
        }
    );
}

export function preservePlacedDemoPlants(records = markers) {
    records.forEach(record => {
        if (!['plant', 'plant2'].includes(record?.tutorialStage) || record.demoType !== 'plant') return;
        record.demoAlive = true;
        record.demoInteractive = true;
    });
    return records;
}

function shiftSimulatedSceneForStage(type) {
    // Stage changes must not rewrite placed spatial anchors. Each new simulated
    // aim gets its own position instead, so Plants and Notes remain where the
    // user placed them and stay available for interaction.
    preservePlacedDemoPlants();
    if (simulatedMode) updateSimulatedMarkers();
}

function armDemoPlacement(type) {
    if (markers.some(record => record.tutorialStage === type)) return;
    demoStage = type;
    placementReady = false;
    shiftSimulatedSceneForStage(type);
    const place = appRoot?.querySelector('[data-tryit-place]');
    if (place && simulatedMode) {
        const comfortOffsetPercent = AR_PHONE_COMFORT.pointerOffsetPixels / Math.max(320, window.innerHeight || 640) * 100;
        const stageAim = {
            plant: { x: 34, y: Math.min(78, 50 + comfortOffsetPercent) },
            plant2: { x: 66, y: Math.min(78, 50 + comfortOffsetPercent) },
            note: { x: 50, y: Math.min(86, 58 + comfortOffsetPercent) }
        }[type] || { x: 50, y: Math.min(86, 50 + comfortOffsetPercent) };
        place.dataset.aimX = String(stageAim.x);
        place.dataset.aimY = String(stageAim.y);
        place.style.setProperty('--aim-x', `${stageAim.x}%`);
        place.style.setProperty('--aim-y', `${stageAim.y}%`);
    } else if (place) {
        place.style.setProperty('--aim-x', '50%');
        place.style.setProperty('--aim-y', `calc(50% + ${AR_PHONE_COMFORT.pointerOffsetCss})`);
    }
    clearTimeout(aimRevealTimer);
    place?.setAttribute('hidden', '');
    place?.classList.remove('is-revealing', 'is-ready');
    const label = place?.querySelector('strong');
    if (label) label.textContent = '';
    setGuide(['plant', 'plant2'].includes(type)
        ? 'Look around slowly. The centre aim will appear when you are ready.'
        : 'Take in the space before choosing the next position.');
    const introductions = {
        plant: ['Virtual markers for Plants', [
            'Let’s start with placing a simple marker.',
            'To do so ,use the round pointer that will appear on your screen. Position it where you’d like your marker to appear, then tap it to create what we call a Plant Orb. Please press Continue..'
        ]],
        plant2: ['Let’s try another plant . A Moringa plant orb', 'Press Continue to load the aim. Then choose another nearby position and press the aim yourself to place the Moringa orb.'],
        note: ['Next, place a simple Note nearby.', 'Move to a different nearby spot. Let the scene settle before the aiming circle appears again.']
    };
    const [title, introduction] = introductions[type];
    showIntroBoard(title, introduction, 'Continue', () => {
        suppressSessionSelectUntil = performance.now() + 700;
        finishIntroBoard();
        setGuide(type === 'plant'
            ? 'Press the aiming circle to place the example Plant orb.'
            : type === 'plant2'
                ? 'Press the aiming circle to place the Moringa orb.'
                : 'Tap the circle to place a Note.');
        placementReady = true;
        place?.removeAttribute('hidden');
        requestAnimationFrame(() => place?.classList.add('is-revealing', 'is-ready'));
    });
}

function advanceDemo() {
    const nextStage = appRoot?.querySelector('[data-tryit-action]')?.dataset.nextStage;
    appRoot?.querySelector('[data-tryit-action]')?.setAttribute('hidden', '');
    if (nextStage === 'finish') return returnToWelcome();
    if (nextStage === 'reset') {
        markers.forEach(record => record.texture && gl?.deleteTexture(record.texture));
        markers = [];
        marker = null;
        markerType = 'marker';
        demoStage = 'plant';
        renderInterface(simulatedMode);
        if (simulatedMode) viewerMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
        return;
    }
    armDemoPlacement(nextStage || 'plant');
}

function simulatedAnchorStyle(anchor) {
    return `--marker-x:${Number(anchor.x).toFixed(2)}%;--marker-y:${Number(anchor.y).toFixed(2)}%`;
}

function tetherMetrics(offset) {
    return {
        length: Math.max(8, Math.hypot(offset.x, offset.y)),
        angle: Math.atan2(offset.y, offset.x) * 180 / Math.PI
    };
}

function clampPlantPanelOffset(anchor, offset) {
    const viewportWidth = Math.max(320, window.innerWidth || 320);
    const viewportHeight = Math.max(320, window.innerHeight || 640);
    const profileWidth = Math.min(viewportWidth - 24, 960);
    const profileHeight = Math.min(viewportHeight * 0.62, 620);
    const anchorX = viewportWidth * anchor.x / 100;
    const anchorY = viewportHeight * anchor.y / 100;
    const minimumX = 12 + profileWidth / 2 - anchorX;
    const maximumX = viewportWidth - 12 - profileWidth / 2 - anchorX;
    const minimumY = 12 + profileHeight / 2 - anchorY;
    const maximumY = viewportHeight - 12 - profileHeight / 2 - anchorY;
    return {
        x: Math.min(maximumX, Math.max(minimumX, offset.x)),
        y: Math.min(maximumY, Math.max(minimumY, offset.y))
    };
}

function defaultPlantPanelOffset(anchor) {
    const viewportWidth = Math.max(320, window.innerWidth || 320);
    const viewportHeight = Math.max(320, window.innerHeight || 640);
    const profileHeight = Math.min(viewportHeight * 0.62, 620);
    const anchorY = viewportHeight * anchor.y / 100;
    const margin = 28;
    const aboveOffset = -(profileHeight / 2 + margin);
    const belowOffset = profileHeight / 2 + margin;
    const belowBottom = anchorY + belowOffset + profileHeight / 2;
    const fitsBelow = belowBottom <= viewportHeight - 12;
    const preferAbove = anchorY >= viewportHeight * .42 || !fitsBelow;
    return clampPlantPanelOffset(anchor, {
        x: 0,
        y: preferAbove ? aboveOffset : belowOffset
    });
}

function capturedSimulatedAnchor() {
    const place = appRoot?.querySelector('[data-tryit-place]');
    const x = Number(place?.dataset.aimX);
    const y = Number(place?.dataset.aimY);
    return {
        x: Number.isFinite(x) ? x : 50,
        y: Number.isFinite(y) ? y : 50
    };
}

function demoOrbStyle(record) {
    return DEMO_ORB_MATERIALS[record?.demoOrbColor]?.style || '';
}

function renderSimulatedPlant(record, index, anchor, offset) {
    const anchorVariables = simulatedAnchorStyle(anchor);
    const orbAppearance = demoOrbStyle(record);
    const orbLabel = record.demoExpanded ? `Hide ${record.name || 'Plant'} profile` : `Open ${record.name || 'Plant'} profile`;
    const anchoredOrb = `<span class="tryit-sim-marker tryit-sim-marker-plant is-demo-orb is-demo-${record.demoOrbShape || 'orb'} has-plant-profile${record.demoExpanded ? ' has-information' : ''}${demoHeldIndex === index ? ' is-held' : ''}${record.demoInteractive === false ? ' is-arriving' : ''}" data-demo-marker-index="${index}" style="${anchorVariables};${orbAppearance};--depth-scale:${record.demoDepthScale || 1}" role="button" tabindex="0" aria-label="${orbLabel}"><span class="tryit-sim-orb is-plant" style="${orbAppearance}" aria-hidden="true"></span></span>`;
    if (!record.demoExpanded) return anchoredOrb;
    const tether = tetherMetrics(offset);
    const profileVariables = `${anchorVariables};--panel-x:${offset.x}px;--panel-y:${offset.y}px`;
    return `${anchoredOrb}<svg class="tryit-sim-plant-tether" data-demo-plant-tether="${index}" style="${anchorVariables};--tether-length:${tether.length.toFixed(2)}px;--tether-angle:${tether.angle.toFixed(2)}deg" viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true"><path d="M 0 9 C 28 2, 70 16, 100 9"></path></svg><span class="tryit-sim-plant-profile" data-demo-plant-profile="${index}" style="${profileVariables}" role="group" aria-label="${record.name || 'Plant'} information">${plantKnowledgeMarkup(knowledgeFor(record), record.demoExpandedBranches)}</span>`;
}

function renderSimulatedTotem(record, index, anchor) {
    const content = demoContentFor(record);
    const bubbles = (content?.bubbles || content?.lines || []).filter(Boolean).slice(0, 5);
    return `<span class="tryit-sim-marker tryit-sim-marker-zone tryit-sim-totem-system${demoHeldIndex === index ? ' is-held' : ''}" data-demo-marker-index="${index}" style="${simulatedAnchorStyle(anchor)};--depth-scale:${record.demoDepthScale || 1}" role="button" tabindex="0" aria-label="${record.name || 'Area'} Totem Marker information"><svg class="tryit-sim-totem-branches" viewBox="0 0 360 430" preserveAspectRatio="none" aria-hidden="true"><path d="M174 166 C124 142 84 106 66 72"/><path d="M180 162 C194 124 218 92 254 70"/><path d="M188 180 C230 182 260 165 298 144"/><path d="M171 225 C128 226 92 247 48 255"/><path d="M189 225 C228 226 254 250 286 264"/></svg><span class="tryit-sim-totem-pillar" aria-hidden="true"></span>${bubbles.map((text, cardIndex) => `<span class="tryit-sim-totem-card tryit-sim-totem-card-${cardIndex + 1}">${text}</span>`).join('')}</span>`;
}

function toggleDemoPlantProfile(record) {
    if (!record || record.demoType !== 'plant') return;
    record.demoExpanded = !record.demoExpanded;
    if (record.demoExpanded) {
        record.profileRevealStarted = performance.now();
        record.demoActiveBranch = '';
        record.demoExpandedBranches = [];
        record.demoProfileInteracted = false;
        record.demoProfileInteractionCount = 0;
        record.informationPose = plantInformationPose(record);
        record.informationPosition = record.informationPose?.position || record.informationPosition || null;
    }
    refreshDemoRecord(record);
    if (record.demoExpanded && record.awaitingProfileReveal) {
        record.awaitingProfileReveal = false;
        navigator.vibrate?.([45, 40, 75]);
    }
    setGuide(record.demoExpanded
        ? `${record.name || 'Plant'} profile opened. Press a cell to reveal its information.`
        : `${record.name || 'Plant'} profile hidden. The living orb remains anchored in place.`);
}

export function selectGuidedDemoOrb(records = markers, reveal = toggleDemoPlantProfile) {
    const record = [...records].reverse().find(candidate =>
        candidate?.demoType === 'plant'
        && candidate.demoInteractive !== false
        && candidate.awaitingProfileReveal
    );
    if (!record) return false;
    reveal(record);
    return true;
}

export function selectDemoPlantRecord(target, reveal = toggleDemoPlantProfile) {
    const record = target?.record || target;
    if (!record
        || record.demoType !== 'plant'
        || record.demoInteractive === false
        || record.demoAlive === false) return false;
    reveal(record);
    return true;
}

function selectDemoPlantAtPointer() {
    return selectDemoPlantRecord(demoRecordAtPointer());
}

function selectDemoProfileCell() {
    const selection = [...markers]
        .reverse()
        .filter(candidate => candidate?.demoType === 'plant' && candidate.demoExpanded)
        .map(record => ({ record, target: demoPimPointerTarget(record) }))
        .find(candidate => candidate.target);
    if (!selection) return false;
    const { record, target } = selection;
    const knowledge = knowledgeFor(record);
    const focus = pimFocusedView(knowledge, record.demoExpandedBranches);
    const visibleNodes = focus?.nodes || pimVisibleNodes(knowledge, record.demoExpandedBranches);
    // Keep a forgiving Quest-sized target only after the ray has actually hit
    // this PIM surface. A gap between large cells advances to another visible
    // branch; a select elsewhere remains free to operate either Plant orb.
    const node = target.node || visibleNodes.find(candidate =>
        !record.demoExpandedBranches?.includes(candidate.path)
        && pimNodeChildren(candidate).length
    ) || visibleNodes[0];
    if (!node) return true;
    if (node.pimRecenter) {
        record.informationPose = plantInformationPose(record);
        record.informationPosition = record.informationPose?.position || record.informationPosition;
        setGuide(`${record.name || 'Plant'} PIM recentered and world-locked in front of you.`);
        return true;
    }
    if (node.pimBack) {
        record.demoExpandedBranches = pimToggleExpandedPaths(record.demoExpandedBranches, node.path);
        record.demoActiveBranch = node.parentPath === 'core' ? '' : node.parentPath;
        refreshDemoRecord(record);
        setGuide(`Returned to the previous ${node.label} bloom.`);
        return true;
    }
    record.demoActiveBranch = node.path;
    record.demoExpandedBranches = pimToggleExpandedPaths(record.demoExpandedBranches, node.path);
    record.pimBloomStarted = performance.now();
    if (record.texture) gl?.deleteTexture(record.texture);
    record.texture = createMarkerTexture(record);
    const opened = record.demoExpandedBranches.includes(node.path);
    const remaining = advanceAfterDemoProfileInteraction(record);
    setGuide(opened
        ? `${node.label} opened into its connected information cells.${remaining ? ` Open ${remaining} more ${remaining === 1 ? 'cell' : 'cells'} to keep exploring the PIM.` : ''}`
        : `${node.label} collapsed.`);
    return true;
}

function advanceAfterDemoProfileInteraction(record) {
    if (!record || record.demoProfileInteracted) return 0;
    const opened = record.demoExpandedBranches?.includes(record.demoActiveBranch);
    const explorationGoal = record.tutorialStage === 'plant' ? 3 : 2;
    if (opened) record.demoProfileInteractionCount = (Number(record.demoProfileInteractionCount) || 0) + 1;
    const remaining = Math.max(0, explorationGoal - (Number(record.demoProfileInteractionCount) || 0));
    if (remaining) return remaining;
    record.demoProfileInteracted = true;
    if (record.tutorialStage === 'plant2') showDemoAction('note');
    else if (record.tutorialStage === 'plant') inviteVirtualTag(record);
    return 0;
}

function demoPimPointerTarget(record) {
    const origin = demoPointerWorldOrigin();
    const direction = demoPointerWorldRay();
    if (!origin || !direction || !record) return null;
    record.informationPose ||= plantInformationPose(record);
    const panel = pimSpatialPanel(record.informationPose);
    if (!panel) return null;
    record.informationPosition = panel.center;
    const numerator = (panel.center.x - origin.x) * panel.normal.x
        + (panel.center.y - origin.y) * panel.normal.y
        + (panel.center.z - origin.z) * panel.normal.z;
    const denominator = direction.x * panel.normal.x + direction.y * panel.normal.y + direction.z * panel.normal.z;
    if (Math.abs(denominator) < .0001) return null;
    const distance = numerator / denominator;
    if (!Number.isFinite(distance) || distance <= 0) return null;
    const hit = {
        x: origin.x + direction.x * distance,
        y: origin.y + direction.y * distance,
        z: origin.z + direction.z * distance
    };
    const offset = { x: hit.x - panel.center.x, y: hit.y - panel.center.y, z: hit.z - panel.center.z };
    const localX = offset.x * panel.right.x + offset.y * panel.right.y + offset.z * panel.right.z;
    const localY = offset.x * panel.up.x + offset.y * panel.up.y + offset.z * panel.up.z;
    const xPercent = (localX / panel.width + .5) * 100;
    const yPercent = (.5 - localY / panel.height) * 100;
    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return null;
    const knowledge = knowledgeFor(record);
    return {
        xPercent,
        yPercent,
        node: pimHoneycombTargetAtPercent(knowledge, record.demoExpandedBranches || [], xPercent, yPercent)
    };
}

function demoPimNodeAtPointer(record) {
    return demoPimPointerTarget(record)?.node || null;
}

function updateSimulatedMarkers() {
    const layer = appRoot?.querySelector('[data-tryit-sim-markers]');
    if (!layer || !simulatedMode) return;
    layer.innerHTML = markers.map((record, index) => {
        const content = demoContentFor(record);
        const lines = content?.lines?.slice(0, record.revealLines ?? content.lines.length) || [];
        const anchor = record.simulatedAnchor || { x: 50, y: 50 };
        if (record.demoType === 'plant') {
            const offset = record.demoPanelOffset || (record.demoPanelOffset = defaultPlantPanelOffset(anchor));
            return renderSimulatedPlant(record, index, anchor, offset);
        }
        if (record.demoType === 'zone' && record.demoExpanded) return renderSimulatedTotem(record, index, anchor);
        const defaultOffsets = { note: { x: 0, y: 0 }, zone: { x: 0, y: 0 } };
        const offset = record.demoPanelOffset || (record.demoPanelOffset = defaultOffsets[record.demoType] || { x: 0, y: 0 });
        const collapsible = record.demoExpanded ? ' role="button" tabindex="0" aria-label="Move this information panel. Tap to hide."' : '';
        const compactContent = record.demoType === 'note' && content
            ? `<strong>${content.title}</strong>${lines.map(line => `<small>${line}</small>`).join('')}`
            : '';
        const orbProjection = record.demoType === 'marker' ? '<span class="tryit-sim-orb" aria-hidden="true"></span>' : '';
        return `<span class="tryit-sim-marker tryit-sim-marker-${record.demoType || record.type}${record.demoType === 'note' ? ' nourishland-spatial-note-surface' : ''}${record.demoOrbColor ? ' is-demo-orb' : ''}${record.demoExpanded ? ' is-expanded' : ''}${demoHeldIndex === index ? ' is-held' : ''}${record.demoInteractive === false ? ' is-arriving' : ''}" data-demo-marker-index="${index}" style="${simulatedAnchorStyle(anchor)};${demoOrbStyle(record)};--panel-x:${offset.x}px;--panel-y:${offset.y}px;--depth-scale:${record.demoDepthScale || 1}"${collapsible}>${orbProjection}${content && record.demoExpanded ? `<strong>${record.revealTitle === false ? '' : content.title}</strong>${lines.map(line => `<small>${line}</small>`).join('')}` : compactContent}</span>`;
    }).join('');
    bindSimulatedInformationPanels(layer);
}

function applyPlantPanelOffset(profile, tether, offset) {
    const metrics = tetherMetrics(offset);
    profile.style.setProperty('--panel-x', `${offset.x}px`);
    profile.style.setProperty('--panel-y', `${offset.y}px`);
    tether?.style.setProperty('--tether-length', `${metrics.length}px`);
    tether?.style.setProperty('--tether-angle', `${metrics.angle}deg`);
}

function bindSimulatedInformationPanels(layer) {
    layer.querySelectorAll('.tryit-sim-marker').forEach(compactMarker => {
        const index = Number(compactMarker.dataset.demoMarkerIndex);
        const record = markers[index];
        if (!record || record.demoInteractive === false) return;
        let holdTimer = null;
        let holdGesture = null;
        compactMarker.addEventListener('pointerdown', event => {
            if (demoHeldIndex === index) return;
            holdGesture = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
            compactMarker.setPointerCapture?.(event.pointerId);
            compactMarker.classList.add('is-drag-ready');
            holdTimer = setTimeout(() => {
                demoHeldIndex = index;
                suppressDemoMarkerClick = true;
                record.simulatedAnchor = { x: 50, y: 50 };
                compactMarker.style.setProperty('--marker-x', '50%');
                compactMarker.style.setProperty('--marker-y', '50%');
                layer.querySelector(`[data-demo-plant-tether="${index}"]`)?.style.setProperty('--marker-x', '50%');
                layer.querySelector(`[data-demo-plant-tether="${index}"]`)?.style.setProperty('--marker-y', '50%');
                layer.querySelector(`[data-demo-plant-profile="${index}"]`)?.style.setProperty('--marker-x', '50%');
                layer.querySelector(`[data-demo-plant-profile="${index}"]`)?.style.setProperty('--marker-y', '50%');
                compactMarker.classList.add('is-held');
                const joystick = appRoot.querySelector('[data-demo-depth-joystick]');
                joystick.hidden = false;
                joystick.style.setProperty('--move-control-x', `${holdGesture.startX}px`);
                joystick.style.setProperty('--move-control-y', `${holdGesture.startY}px`);
                joystick.querySelector('strong').textContent = record.name || 'Held element';
                const readout = joystick.querySelector('[data-demo-depth-readout]');
                if (readout) readout.textContent = `${(record.demoDistance || 1).toFixed(1)} m`;
                joystick.style.setProperty('--depth-shift', '0px');
                setGuide(`Holding ${record.name || 'this element'} at the aim. Keep this finger down: slide up to push away or down to pull closer.`);
            }, 420);
        });
        compactMarker.addEventListener('pointermove', event => {
            if (demoHeldIndex !== index || event.pointerId !== holdGesture?.pointerId) return;
            const verticalTravel = holdGesture.startY - event.clientY;
            record.demoDistance = Math.max(.4, Math.min(4, 1 + verticalTravel / 120));
            record.demoDepthScale = Math.max(.55, Math.min(1.8, 1 / record.demoDistance));
            compactMarker.style.setProperty('--depth-scale', record.demoDepthScale);
            const joystick = appRoot.querySelector('[data-demo-depth-joystick]');
            const visualMotion = Math.max(-1, Math.min(1, verticalTravel / 180));
            joystick.style.setProperty('--depth-shift', `${(-visualMotion * 38).toFixed(1)}px`);
            const readout = joystick.querySelector('[data-demo-depth-readout]');
            if (readout) readout.textContent = `${record.demoDistance.toFixed(1)} m`;
        });
        const cancelHoldTimer = () => {
            clearTimeout(holdTimer);
            holdTimer = null;
            compactMarker.classList.remove('is-drag-ready');
        };
        compactMarker.addEventListener('pointerup', () => {
            cancelHoldTimer();
            if (demoHeldIndex === index) releaseHeldDemoRecord();
        });
        compactMarker.addEventListener('pointercancel', cancelHoldTimer);
        compactMarker.addEventListener('click', event => {
            if (suppressDemoMarkerClick) {
                suppressDemoMarkerClick = false;
                event.stopImmediatePropagation();
                return;
            }
            if (demoHeldIndex === index) {
                demoHeldIndex = -1;
                compactMarker.classList.remove('is-held');
                appRoot.querySelector('[data-demo-depth-joystick]').hidden = true;
                setGuide(`${record.name || 'Element'} released in its refined position.`);
                event.stopImmediatePropagation();
            }
        });
        if (record.demoType === 'plant') {
            compactMarker.addEventListener('click', () => toggleDemoPlantProfile(record));
            compactMarker.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                compactMarker.click();
            });
            return;
        }
        if (record.demoType !== 'note') return;
        compactMarker.setAttribute('role', 'button');
        compactMarker.setAttribute('tabindex', '0');
        compactMarker.setAttribute('aria-label', `Change Note type. Current ${record.demoContent?.title || record.name || 'Note'}`);
        compactMarker.addEventListener('click', () => cycleDemoNoteTemplate(record));
        compactMarker.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            cycleDemoNoteTemplate(record);
        });
    });
    layer.querySelectorAll('.tryit-sim-marker.is-expanded').forEach(panel => {
        const record = markers[Number(panel.dataset.demoMarkerIndex)];
        if (!record) return;
        let start = null;
        let moved = false;
        panel.addEventListener('pointerdown', event => {
            start = { x: event.clientX, y: event.clientY, offset: record.demoPanelOffset || { x: 0, y: 0 } };
            moved = false;
            panel.setPointerCapture?.(event.pointerId);
            panel.classList.add('is-dragging');
        });
        panel.addEventListener('pointermove', event => {
            if (!start) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            moved ||= Math.hypot(dx, dy) > 5;
            record.demoPanelOffset = { x: start.offset.x + dx, y: start.offset.y + dy };
            panel.style.setProperty('--panel-x', `${record.demoPanelOffset.x}px`);
            panel.style.setProperty('--panel-y', `${record.demoPanelOffset.y}px`);
        });
        const finish = () => { start = null; panel.classList.remove('is-dragging'); };
        panel.addEventListener('pointerup', () => {
            finish();
            if (!moved) {
                record.demoExpanded = false;
                refreshDemoRecord(record);
            }
        });
        panel.addEventListener('pointercancel', finish);
        panel.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                record.demoExpanded = false;
                refreshDemoRecord(record);
            }
        });
    });
    layer.querySelectorAll('[data-demo-plant-profile]').forEach(profile => {
        const index = Number(profile.dataset.demoPlantProfile);
        const record = markers[index];
        const tether = layer.querySelector(`[data-demo-plant-tether="${index}"]`);
        const handle = profile.querySelector('[data-plant-profile-handle]');
        if (!record || !handle) return;
        const back = profile.querySelector('[data-pim-back]');
        back?.addEventListener('pointerdown', event => {
            event.stopPropagation();
            suppressSessionSelectUntil = performance.now() + 500;
        });
        back?.addEventListener('click', event => {
            event.stopPropagation();
            const focusPath = back.dataset.pimBack;
            record.demoExpandedBranches = pimToggleExpandedPaths(record.demoExpandedBranches, focusPath);
            record.demoActiveBranch = focusPath.split('.').slice(0, -1).join('.');
            refreshDemoRecord(record);
            setGuide('Returned to the previous PIM bloom.');
        });
        const recenter = profile.querySelector('[data-pim-recenter]');
        recenter?.addEventListener('pointerdown', event => {
            event.stopPropagation();
            suppressSessionSelectUntil = performance.now() + 500;
        });
        recenter?.addEventListener('click', event => {
            event.stopPropagation();
            if (viewerMatrix) {
                record.informationPose = plantInformationPose(record);
                record.informationPosition = record.informationPose?.position || record.informationPosition;
            } else {
                record.demoPanelOffset = defaultPlantPanelOffset(record.simulatedAnchor || { x: 50, y: 50 });
            }
            refreshDemoRecord(record);
            setGuide(`${record.name || 'Plant'} PIM recentered.`);
        });
        const cells = [...profile.querySelectorAll('[data-pim-node]')];
        cells.forEach(cell => {
            cell.addEventListener('pointerdown', event => {
                event.stopPropagation();
                suppressSessionSelectUntil = performance.now() + 500;
            });
            cell.addEventListener('click', event => {
                event.stopPropagation();
                const nodePath = cell.dataset.pimNode;
                const wasOpen = record.demoExpandedBranches?.includes(nodePath);
                record.demoExpandedBranches = pimToggleExpandedPaths(record.demoExpandedBranches, nodePath);
                record.demoActiveBranch = nodePath;
                record.pimBloomStarted = performance.now();
                const remaining = advanceAfterDemoProfileInteraction(record);
                refreshDemoRecord(record);
                setGuide(wasOpen
                    ? `${cell.querySelector('b')?.textContent || 'Cell'} collapsed.`
                    : `${cell.querySelector('b')?.textContent || 'Cell'} opened into its information petals.${remaining ? ` Open ${remaining} more ${remaining === 1 ? 'cell' : 'cells'} to keep exploring the PIM.` : ''}`);
            });
        });
        let start = null;
        handle.addEventListener('pointerdown', event => {
            event.preventDefault();
            start = { x: event.clientX, y: event.clientY, offset: record.demoPanelOffset || { x: 0, y: 0 } };
            handle.setPointerCapture?.(event.pointerId);
            profile.classList.add('is-dragging');
        });
        handle.addEventListener('pointermove', event => {
            if (!start) return;
            record.demoPanelOffset = clampPlantPanelOffset(record.simulatedAnchor || { x: 50, y: 50 }, {
                x: start.offset.x + event.clientX - start.x,
                y: start.offset.y + event.clientY - start.y
            });
            applyPlantPanelOffset(profile, tether, record.demoPanelOffset);
        });
        const finish = () => {
            start = null;
            profile.classList.remove('is-dragging');
        };
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
        handle.addEventListener('keydown', event => {
            const movement = {
                ArrowLeft: { x: -12, y: 0 },
                ArrowRight: { x: 12, y: 0 },
                ArrowUp: { x: 0, y: -12 },
                ArrowDown: { x: 0, y: 12 }
            }[event.key];
            if (!movement) return;
            event.preventDefault();
            const offset = record.demoPanelOffset || { x: 0, y: 0 };
            record.demoPanelOffset = clampPlantPanelOffset(record.simulatedAnchor || { x: 50, y: 50 }, {
                x: offset.x + movement.x,
                y: offset.y + movement.y
            });
            applyPlantPanelOffset(profile, tether, record.demoPanelOffset);
        });
    });
}

const demoProfileEscape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function plantKnowledgeMarkup(knowledge = PIGEON_PEA_AR_KNOWLEDGE, expandedPaths = []) {
    const expanded = new Set(expandedPaths);
    const focus = pimFocusedView(knowledge, expandedPaths);
    const nodes = focus?.nodes || pimVisibleNodes(knowledge, expandedPaths);
    const connectors = nodes.map(node => `<path class="plant-knowledge-connector plant-knowledge-connector-depth-${node.depth}${node.depth > 0 ? ' is-parent-link' : ' is-core-link'}" d="${pimConnectorPath(node)}" pathLength="1" style="--pim-hue:${pimNodeHue(node)}"/>`).join('');
    const cells = nodes.map(node => {
        const hasChildren = pimNodeChildren(node).length > 0;
        const open = expanded.has(node.path);
        const detailsVisible = node.depth > 0;
        const visualDepth = focus ? 1 : node.depth;
        const depthClass = visualDepth ? ` plant-knowledge-child plant-knowledge-child-depth-${Math.min(visualDepth, 3)}` : '';
        const parentPosition = node.parentPosition || { x: 50, y: 50, gridX: 0, gridY: 0 };
        const style = `--pim-node-x:${node.position.x}%;--pim-node-y:${node.position.y}%;--pim-grid-x:${node.position.gridX};--pim-grid-y:${node.position.gridY};--pim-parent-x:${parentPosition.x}%;--pim-parent-y:${parentPosition.y}%;--pim-parent-grid-x:${parentPosition.gridX || 0};--pim-parent-grid-y:${parentPosition.gridY || 0};--pim-node-scale:1;--pim-hue:${pimNodeHue(node)}`;
        return `<button type="button" class="plant-knowledge-cell${depthClass}${open ? ' is-open' : ''}${detailsVisible ? ' is-detail-visible' : ''}" data-pim-node="${node.path}" data-pim-direction="${demoProfileEscape(node.rootDirection || node.direction)}" data-plant-branch="${node.path}" style="${style}" aria-label="${demoProfileEscape(node.label)}${hasChildren ? ' information cell' : ''}" aria-expanded="${hasChildren ? open : false}"><b>${demoProfileEscape(node.label)}</b><small aria-hidden="${!detailsVisible}">${demoProfileEscape(node.value)}</small></button>`;
    }).join('');
    const focusTrail = focus?.trail.map(node => node.label).join(' › ') || '';
    const back = focus ? `<button type="button" class="plant-knowledge-back" data-pim-back="${demoProfileEscape(focus.focusNode.path)}" aria-label="Return from ${demoProfileEscape(focus.focusNode.label)} to the previous PIM bloom">← ${demoProfileEscape(knowledge.title)} · ${demoProfileEscape(focusTrail)}</button>` : '';
    const core = focus
        ? `<span class="plant-knowledge-core is-fractal-focus" data-plant-profile-handle tabindex="0" aria-label="Drag the ${demoProfileEscape(knowledge.title)} Plant Information Mesh"><small>SELECTED TOPIC</small><strong>${demoProfileEscape(focus.focusNode.label)}</strong><i>${demoProfileEscape(focus.focusNode.value)}</i></span>`
        : `<span class="plant-knowledge-core" data-plant-profile-handle tabindex="0" aria-label="Drag the ${demoProfileEscape(knowledge.title)} Plant Information Mesh"><strong>${demoProfileEscape(knowledge.title)}</strong></span>`;
    const recenter = '<button type="button" class="plant-knowledge-recenter" data-pim-recenter aria-label="Recenter this Plant Information Mesh in front of me">&#8595;</button>';
    return `<span class="plant-knowledge-map${focus ? ' is-fractal-focus' : ''}${expandedPaths.length ? ' is-expanded' : ''}" data-pim-layout="honeycomb" aria-label="Plant Information Mesh">${back}<svg class="plant-knowledge-connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${connectors}</svg>${cells}${core}${recenter}</span>`;
}

function refreshDemoRecord(record) {
    if (record.texture) gl?.deleteTexture(record.texture);
    record.texture = createMarkerTexture(record);
    updateSimulatedMarkers();
}

function demoPointerWorldRay() {
    if (latestControllerRay) return latestControllerRay.direction;
    if (!viewerMatrix || !latestDemoView?.projectionMatrix) return null;
    const pointer = appRoot?.querySelector('[data-tryit-place]');
    const rect = pointer?.getBoundingClientRect();
    const screenX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const screenY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const projection = latestDemoView.projectionMatrix;
    let x = (screenX / window.innerWidth * 2 - 1 + projection[8]) / projection[0];
    let y = (1 - screenY / window.innerHeight * 2 + projection[9]) / projection[5];
    let z = -1;
    const viewLength = Math.hypot(x, y, z) || 1;
    x /= viewLength;
    y /= viewLength;
    z /= viewLength;
    const worldX = viewerMatrix[0] * x + viewerMatrix[4] * y + viewerMatrix[8] * z;
    const worldY = viewerMatrix[1] * x + viewerMatrix[5] * y + viewerMatrix[9] * z;
    const worldZ = viewerMatrix[2] * x + viewerMatrix[6] * y + viewerMatrix[10] * z;
    const worldLength = Math.hypot(worldX, worldY, worldZ) || 1;
    return { x: worldX / worldLength, y: worldY / worldLength, z: worldZ / worldLength };
}

function demoPointerWorldOrigin() {
    if (latestControllerRay?.origin) return latestControllerRay.origin;
    return viewerMatrix
        ? { x: viewerMatrix[12], y: viewerMatrix[13], z: viewerMatrix[14] }
        : null;
}

export function demoPlacementPosition(matrix, ray, origin = null) {
    const base = origin || (matrix ? { x: matrix[12], y: matrix[13], z: matrix[14] } : null);
    if (!base) return null;
    if (!ray) return spatialPosition(null, matrix, 0);
    const distance = AR_EXPERIENCE_CONFIG.placementDistanceMetres;
    return {
        x: base.x + ray.x * distance,
        y: base.y + ray.y * distance,
        z: base.z + ray.z * distance
    };
}

export function demoGroundBaseY(hitPoseMatrix, cameraMatrix, previousGroundY = null) {
    const hitY = Number(hitPoseMatrix?.[13]);
    const hitNormalY = Math.abs(Number(hitPoseMatrix?.[5]));
    const cameraY = Number(cameraMatrix?.[13]);
    const hasCameraY = Number.isFinite(cameraY);
    const floorLikeHit = Number.isFinite(hitY)
        && Number.isFinite(hitNormalY)
        && hitNormalY >= .65
        && (!hasCameraY || cameraY - hitY >= .7);
    if (floorLikeHit) return hitY;
    if (previousGroundY !== null && previousGroundY !== undefined && Number.isFinite(Number(previousGroundY))) return Number(previousGroundY);
    if (hasCameraY) return cameraY - DEMO_STABLE_EYE_HEIGHT_METRES;
    return 0;
}

function placementPosition() {
    return demoPlacementPosition(viewerMatrix, demoPointerWorldRay(), demoPointerWorldOrigin());
}

function pointerDistanceToRecord(record) {
    const ray = demoPointerWorldRay();
    const origin = demoPointerWorldOrigin();
    if (!origin || !ray || !record?.position) return Infinity;
    const offset = {
        x: record.position.x - origin.x,
        y: record.position.y - origin.y,
        z: record.position.z - origin.z
    };
    const alongRay = offset.x * ray.x + offset.y * ray.y + offset.z * ray.z;
    if (alongRay <= 0) return Infinity;
    const closest = {
        x: origin.x + ray.x * alongRay,
        y: origin.y + ray.y * alongRay,
        z: origin.z + ray.z * alongRay
    };
    return Math.hypot(record.position.x - closest.x, record.position.y - closest.y, record.position.z - closest.z);
}

function demoRecordAtPointer() {
    const adjustable = markers
        .map((record, index) => ({ record, index, distance: pointerDistanceToRecord(record) }))
        .filter(item => item.record.demoInteractive !== false && item.distance <= .24)
        .sort((left, right) => left.distance - right.distance);
    return adjustable[0] || null;
}

function updateHeldDemoRecordPosition() {
    if (simulatedMode || demoHeldIndex < 0) return;
    const record = markers[demoHeldIndex];
    const ray = demoPointerWorldRay();
    const origin = demoPointerWorldOrigin();
    if (!record || !origin || !ray) return;
    const distance = Math.max(.4, Math.min(4, Number(record.demoDistance) || AR_EXPERIENCE_CONFIG.placementDistanceMetres));
    record.position = {
        x: origin.x + ray.x * distance,
        y: record.demoType === 'zone'
            ? demoGroundBaseY(hitMatrix, viewerMatrix, record.groundBaseY ?? groundYEstimate) + DEMO_TOTEM_HALF_HEIGHT_METRES
            : origin.y + ray.y * distance,
        z: origin.z + ray.z * distance
    };
    if (record.demoType === 'zone') record.groundBaseY = record.position.y - DEMO_TOTEM_HALF_HEIGHT_METRES;
    record.informationPosition = null;
}

function beginPointerDemoHold(event) {
    if (placementReady || demoHeldIndex >= 0 || demoHoldTimer) return false;
    if (simulatedMode) {
        const index = markers.findIndex(record => record.demoInteractive !== false);
        if (index < 0) return false;
        event.preventDefault();
        event.stopPropagation();
        suppressSessionSelectUntil = performance.now() + 1200;
        demoHoldTimer = setTimeout(() => {
            demoHoldTimer = null;
            demoHeldIndex = index;
            markers[index].simulatedAnchor = capturedSimulatedAnchor();
            setGuide(`Holding ${markers[index].name || 'the orb'}. Move the pointer, then release.`);
            updateSimulatedMarkers();
        }, 420);
        return true;
    }
    const target = demoRecordAtPointer();
    if (!target) return false;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    suppressSessionSelectUntil = performance.now() + 1200;
    demoHoldTimer = setTimeout(() => {
        demoHoldTimer = null;
        demoHeldIndex = target.index;
        const origin = demoPointerWorldOrigin();
        if (!origin) return;
        const offset = {
            x: target.record.position.x - origin.x,
            y: target.record.position.y - origin.y,
            z: target.record.position.z - origin.z
        };
        target.record.demoDistance = Math.max(.4, Math.min(4, Math.hypot(offset.x, offset.y, offset.z)));
        setGuide(`Holding ${target.record.name || 'the orb'}. Move your phone, then release.`);
    }, 420);
    return true;
}

function beginControllerDemoHold() {
    if (placementReady || demoHeldIndex >= 0 || demoHoldTimer) return false;
    const target = demoRecordAtPointer();
    if (!target || target.record.demoInteractive === false) return false;
    const origin = demoPointerWorldOrigin();
    if (!origin) return false;
    const offset = {
        x: target.record.position.x - origin.x,
        y: target.record.position.y - origin.y,
        z: target.record.position.z - origin.z
    };
    target.record.demoDistance = Math.max(.4, Math.min(4, Math.hypot(offset.x, offset.y, offset.z)));
    demoHeldIndex = target.index;
    suppressSessionSelectUntil = performance.now() + 1200;
    setGuide(`Holding ${target.record.name || 'the orb'}. Move the controller, then release.`);
    return true;
}

function selectDemoNoteTemplateAtPointer() {
    const target = demoRecordAtPointer();
    if (!target || target.record?.demoType !== 'note') return false;
    return cycleDemoNoteTemplate(target.record);
}

function releaseHeldDemoRecord() {
    clearTimeout(demoHoldTimer);
    demoHoldTimer = null;
    if (demoHeldIndex < 0) return false;
    const record = markers[demoHeldIndex];
    demoHeldIndex = -1;
    appRoot?.querySelector('[data-demo-depth-joystick]')?.setAttribute('hidden', '');
    updateSimulatedMarkers();
    setGuide(`${record?.name || 'Element'} released in its adjusted position.`);
    return true;
}

function plantInformationPosition(record) {
    if (record?.informationPose?.position) return record.informationPose.position;
    if (viewerMatrix) {
        record.informationPose = plantInformationPose(record);
        if (record.informationPose?.position) return record.informationPose.position;
    }
    const position = record?.position || { x: 0, y: 0, z: -1.2 };
    const cameraX = Number(viewerMatrix?.[12]);
    const cameraY = Number(viewerMatrix?.[13]);
    const cameraZ = Number(viewerMatrix?.[14]);
    const towardViewerX = Number.isFinite(cameraX) ? cameraX - position.x : 0;
    const towardViewerZ = Number.isFinite(cameraZ) ? cameraZ - position.z : 1;
    const horizontalDistance = Math.hypot(towardViewerX, towardViewerZ) || 1;
    const eyeLevelY = Number.isFinite(cameraY) ? cameraY - .12 : position.y + .45;
    return {
        x: position.x + towardViewerX / horizontalDistance * 0.14,
        y: Math.max(position.y + .34, eyeLevelY),
        z: position.z + towardViewerZ / horizontalDistance * 0.14
    };
}

function plantInformationPose(record) {
    if (!viewerMatrix) return null;
    return pimSpatialPoseAboveAnchor(viewerMatrix, record?.position, {
        plantId: record?.id || record?.name,
        anchorId: record?.demoAnchorId || '',
        coordinateSpace: 'session-local'
    });
}

function placeMarker() {
    if (!placementReady || marker || markers.length >= DEMO_SEQUENCE.length || markers.some(record => record.tutorialStage === demoStage)) return;
    const position = placementPosition();
    if (!position) {
        setGuide('Move your phone briefly, then tap the circle again.');
        return;
    }
    placementReady = false;
    const type = demoStage;
    const directType = type === 'note' ? 'note' : 'sub_checkpoint';
    const sample = createMinimalMarkerDraft(directType, {
        name: ['plant', 'plant2'].includes(type) ? 'A living plant' : 'A small observation',
        description: type === 'note' ? 'A small observation can become useful knowledge over time.' : ''
    });
    const simulatedAnchor = simulatedMode ? capturedSimulatedAnchor() : null;
    const panelOffsets = {
        plant: simulatedAnchor ? defaultPlantPanelOffset(simulatedAnchor) : { x: 0, y: 0 },
        plant2: simulatedAnchor ? defaultPlantPanelOffset(simulatedAnchor) : { x: 0, y: 0 },
        note: { x: 0, y: 0 }
    };
    marker = {
        ...sample,
        position,
        type: type === 'note' ? 'note' : 'plant',
        demoType: type === 'note' ? 'note' : 'plant',
        tutorialStage: type,
        demoOrbColor: type === 'plant' ? 'pigeonPea' : type === 'plant2' ? 'green' : '',
        demoOrbShape: type === 'plant' ? 'orb' : type === 'plant2' ? 'orb' : '',
        demoAlive: type !== 'note',
        demoExpanded: false,
        demoInteractive: !['plant', 'plant2'].includes(type),
        demoPanelOffset: panelOffsets[type],
        simulatedAnchor,
        informationPosition: null,
        revealTitle: true,
        revealLines: 3,
        texture: null,
        ...(type === 'note' ? {
            name: NOTE_TEMPLATES.poi.title,
            demoContent: NOTE_TEMPLATES.poi,
            demoNoteTemplateIndex: 0,
            appearance: { color: '#9a6b50', size: 'medium', opacity: 1, surface: 'filled' }
        } : {})
    };
    if (markers.length) marker = relateMinimalMarkers(marker, markers[0]?.id || 'demo-plant', 'part-of-story');
    marker.texture = createMarkerTexture(marker);
    markers.push(marker);
    const placedRecord = marker;
    const pointer = appRoot?.querySelector('[data-tryit-place]');
    pointer?.removeAttribute('hidden');
    pointer?.classList.add('is-revealing', 'is-ready');
    updateSimulatedMarkers();
    marker = null;
    if (type === 'plant') guidePlantConversion(placedRecord);
    else if (type === 'plant2') guidePlantConversion(placedRecord);
    else guideNoteConversion(placedRecord);
}

function pressPlacementPointer(event) {
    if (demoWebModeOpen || !placementReady || marker || pointerPressTimer) return;
    event?.preventDefault();
    event?.stopPropagation();
    suppressSessionSelectUntil = performance.now() + 1000;
    const place = event?.currentTarget || appRoot?.querySelector('[data-tryit-place]');
    place?.classList.add('is-pressed');
    setGuide('Placing Plant orb…');
    pointerPressTimer = setTimeout(() => {
        place?.classList.remove('is-pressed');
        pointerPressTimer = null;
        placeMarker();
    }, 360);
}

function renderInterface(simulated) {
    simulatedMode = simulated;
    const webglControlFallback = Boolean(!simulated && session && !domOverlayEnabled);
    const questImmersiveMode = Boolean(!simulated && session && sessionMode === 'immersive-vr');
    introSceneStartedAt = performance.now();
    introSceneActive = true;
    introBoardHasEntered = false;
    appRoot.innerHTML = `<div class="tryit-demo ${simulated ? 'is-simulated' : 'is-immersive'}"><div class="tryit-stage"><div class="tryit-spatial-intro" data-tryit-intro><div class="tryit-intro-knowledge" aria-label="BIOMAP interactive plant attributes">${INTRO_KNOWLEDGE_KEYWORDS.map((keyword, index) => `<span class="biomap-branch" style="--knowledge-index:${index}"><button type="button" data-biomap-category="${keyword}" aria-expanded="false">${keyword}</button>${BIOMAP_CATEGORIES[keyword].length ? `<span class="biomap-children" aria-label="${keyword} filters">${BIOMAP_CATEGORIES[keyword].map(child => `<span>${child}</span>`).join('')}</span>` : ''}</span>`).join('')}</div></div><button class="tryit-place creator-ar-placement-guide" type="button" data-tryit-place aria-label="Place item" hidden>${placementPointerMarkup('')}</button>${spatialMoveControlMarkup('demo')}<button class="tryit-demo-action" type="button" data-tryit-action hidden></button><section class="tryit-guided-choice tryit-tutorial-board" data-tryit-guided-choice aria-live="polite" hidden></section><div class="tryit-final-actions" data-tryit-final-actions hidden><button type="button" data-tryit-reset>Try again</button><button type="button" data-tryit-finish>Finish demo</button></div><p class="tryit-guide" data-tryit-guide aria-live="polite">NourishlandXR demo.</p><div data-tryit-sim-markers></div><div class="tryit-demo-footer"><p class="tryit-drag-hint">Hold and drag any element to reposition it.</p><nav class="tryit-demo-taskbar" aria-label="Demo controls"><button type="button" data-tryit-exit><strong>CLOSE DEMO</strong></button></nav></div></div><section class="tryit-virtual-tag-mode" data-demo-virtual-tag aria-live="polite" hidden></section></div>`;
    appRoot.querySelector('.tryit-demo')?.classList.toggle('uses-webgl-controls', webglControlFallback);
    appRoot.querySelector('.tryit-demo')?.classList.toggle('is-quest-vr', questImmersiveMode);
    const introContinue = document.createElement('button');
    introContinue.className = 'tryit-intro-continue';
    introContinue.dataset.tryitIntroContinue = '';
    introContinue.type = 'button';
    introContinue.hidden = true;
    appRoot.querySelector('.tryit-demo')?.append(introContinue);
    appRoot.querySelector('[data-tryit-intro]')?.removeAttribute('hidden');
    appRoot.querySelector('.tryit-drag-hint')?.remove();
    const exitButton = appRoot.querySelector('[data-tryit-exit]');
    exitButton.textContent = 'Close';
    exitButton.setAttribute('aria-label', 'Close demo');
    appRoot.querySelectorAll('[data-biomap-category]').forEach(button => {
        const expand = () => {
            button.closest('.biomap-branch')?.classList.add('is-expanded');
            button.setAttribute('aria-expanded', 'true');
        };
        button.addEventListener('mouseenter', expand);
        button.addEventListener('focus', expand);
        button.addEventListener('click', expand);
    });
    exitButton.addEventListener('click', returnToWelcome);
    const placementPointer = appRoot.querySelector('[data-tryit-place]');
    appRoot.querySelector('.tryit-demo')?.append(placementPointer);
    introContinue.addEventListener('beforexrselect', event => event.preventDefault());
    placementPointer.addEventListener('beforexrselect', event => event.preventDefault());
    placementPointer.addEventListener('pointerdown', event => {
        if (!placementReady) {
            beginPointerDemoHold(event);
            return;
        }
        event.stopPropagation();
        suppressSessionSelectUntil = performance.now() + 1000;
    });
    placementPointer.addEventListener('pointerup', event => {
        if (releaseHeldDemoRecord()) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        clearTimeout(demoHoldTimer);
        demoHoldTimer = null;
        pressPlacementPointer(event);
    });
    placementPointer.addEventListener('pointercancel', () => {
        clearTimeout(demoHoldTimer);
        demoHoldTimer = null;
        releaseHeldDemoRecord();
    });
    placementPointer.addEventListener('mousedown', event => {
        if (!placementReady) beginPointerDemoHold(event);
    });
    placementPointer.addEventListener('mouseup', event => {
        if (releaseHeldDemoRecord()) {
            event.preventDefault();
            event.stopPropagation();
        }
    });
    placementPointer.addEventListener('click', pressPlacementPointer);
    appRoot.querySelector('[data-demo-move-release]').addEventListener('click', () => {
        releaseHeldDemoRecord();
    });
    appRoot.querySelector('[data-tryit-action]').addEventListener('click', advanceDemo);
    appRoot.querySelector('[data-tryit-reset]').addEventListener('click', () => { appRoot.querySelector('[data-tryit-action]').dataset.nextStage = 'reset'; advanceDemo(); });
    appRoot.querySelector('[data-tryit-finish]').addEventListener('click', returnToWelcome);
    clearTimeout(introNarrationTimer);
    introNarrationTimer = setTimeout(runArWelcomeTutorial, 700);
}

function multiply(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
        out[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
    }
    return out;
}

function billboardMatrix(position, scaleX = 1, scaleY = 1, cameraMatrix = viewerMatrix) {
    const camera = cameraMatrix || new Float32Array(16);
    let x = camera[12] - position.x;
    let z = camera[14] - position.z;
    const length = Math.hypot(x, z) || 1;
    x /= length; z /= length;
    return new Float32Array([z * scaleX, 0, -x * scaleX, 0, 0, scaleY, 0, 0, x, 0, z, 0, position.x, position.y, position.z, 1]);
}

function fixedPimPanelMatrix(pose, scaleX = DEMO_PIM_IMMERSIVE_SCALE.x, scaleY = DEMO_PIM_IMMERSIVE_SCALE.y) {
    if (!pose?.position || !pose?.right || !pose?.up || !pose?.normal) return null;
    const scale = Number(pose.scale) || 1;
    return new Float32Array([
        pose.right.x * scaleX * scale, pose.right.y * scaleX * scale, pose.right.z * scaleX * scale, 0,
        pose.up.x * scaleY * scale, pose.up.y * scaleY * scale, pose.up.z * scaleY * scale, 0,
        pose.normal.x, pose.normal.y, pose.normal.z, 0,
        pose.position.x, pose.position.y, pose.position.z, 1
    ]);
}

function groundMatrix(position, scale = 1) {
    return new Float32Array([scale, 0, 0, 0, 0, 0, -scale, 0, 0, scale, 0, 0, position.x, position.y - .12, position.z, 1]);
}

function setupRenderer() {
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex, 'attribute vec3 p;attribute vec2 uv;uniform mat4 mvp;varying vec2 v;void main(){gl_Position=mvp*vec4(p,1.);v=uv;}');
    gl.compileShader(vertex);
    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment, 'precision mediump float;varying vec2 v;uniform sampler2D t;uniform float opacity;void main(){vec4 sampleColor=texture2D(t,v);gl_FragColor=vec4(sampleColor.rgb,sampleColor.a*opacity);}');
    gl.compileShader(fragment);
    program = gl.createProgram();
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.20,-.08,0,0,1, .20,-.08,0,1,1, .20,.08,0,1,0, -.20,-.08,0,0,1, .20,.08,0,1,0, -.20,.08,0,0,0]), gl.STATIC_DRAW);
    sphereRenderer = createSpatialSphereRenderer(gl);
    tetherRenderer = createSpatialTetherRenderer(gl);
    prismRenderer = createSpatialPrismRenderer(gl);
    triangleRenderer = createSpatialTriangleRenderer(gl);
}

function demoControllerInputSource() {
    const sources = [...(session?.inputSources || [])];
    const trackedControllers = sources.filter(source => source.targetRayMode === 'tracked-pointer');
    return trackedControllers.find(source => source.handedness === 'right' && source.gamepad)
        || trackedControllers.find(source => source.handedness === 'right')
        || trackedControllers.find(source => source.gamepad)
        || trackedControllers[0]
        || null;
}

function updateDemoControllerRay(frame) {
    latestControllerRay = null;
    const source = demoControllerInputSource();
    if (!source || !referenceSpace) return;
    const controllerSpace = source.targetRaySpace || source.gripSpace;
    const pose = controllerSpace ? frame.getPose(controllerSpace, referenceSpace) : null;
    latestControllerRay = controllerRayFromPose(pose, source.handedness || 'right');
}

function unusedLegacyMarkerTexture() {
    if (!gl) return;
    const label = document.createElement('canvas');
    label.width = 360; label.height = 112;
    const ctx = label.getContext('2d');
    const type = { plant: 'Plant', note: 'Note', poi: 'Point of interest', marker: 'Marker' }[markerType];
    ctx.fillStyle = 'rgba(17,58,32,.92)'; ctx.beginPath(); ctx.roundRect(0, 0, 360, 112, 18); ctx.fill();
    ctx.fillStyle = '#dcef95'; ctx.beginPath(); ctx.arc(36, 56, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#173522'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('•', 36, 64);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(markerName, 68, 48);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '14px sans-serif'; ctx.fillText(type, 68, 75);
    texture ||= gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function drawWrappedTextureText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
    const lines = wrappedTextureLines(ctx, text, maxWidth);
    lines.slice(0, maxLines).forEach((value, index) => {
        const lastVisibleLine = index === maxLines - 1 && lines.length > maxLines;
        let visible = value;
        if (lastVisibleLine) {
            while (visible && ctx.measureText(`${visible}…`).width > maxWidth) visible = visible.slice(0, -1);
            visible += '…';
        }
        ctx.fillText(visible, x, y + index * lineHeight);
    });
}

function wrappedTextureLines(ctx, text, maxWidth) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach(word => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(candidate).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    });
    if (line) lines.push(line);
    return lines;
}

function fitIntroBodyLayout(ctx, text, maxWidth, maxHeight) {
    const paragraphs = String(text || '').split(/\n\n/);
    for (let fontSize = 52; fontSize >= 26; fontSize -= 2) {
        const lineHeight = Math.round(fontSize * 1.22);
        const paragraphGap = Math.round(fontSize * .5);
        ctx.font = `650 ${fontSize}px system-ui, sans-serif`;
        const paragraphLines = paragraphs.map(paragraph => wrappedTextureLines(ctx, paragraph, maxWidth));
        const totalHeight = paragraphLines.reduce((height, lines) => height + lines.length * lineHeight, 0)
            + Math.max(0, paragraphLines.length - 1) * paragraphGap;
        if (totalHeight <= maxHeight || fontSize === 26) {
            return { fontSize, lineHeight, paragraphGap, paragraphLines };
        }
    }
    return { fontSize: 26, lineHeight: 32, paragraphGap: 13, paragraphLines: [] };
}

function createSpatialKnowledgeTexture(record) {
    const content = demoContentFor(record);
    if (!gl || !content) return null;
    const label = document.createElement('canvas');
    label.width = record.demoType === 'zone' ? 720 : PIM_TEXTURE_SIZE.width;
    label.height = record.demoType === 'zone' ? 1120 : PIM_TEXTURE_SIZE.height;
    const ctx = label.getContext('2d');
    if (record.demoType === 'plant') {
        const bloomProgress = record.pimBloomStarted
            ? (performance.now() - record.pimBloomStarted) / PIM_BLOOM_DURATION_MS
            : 1;
        drawPlantKnowledgeTexture(ctx, label, knowledgeFor(record), record.demoExpandedBranches || [], { bloomProgress });
        return canvasTexture(label);
    }
    if (record.demoType === 'zone') {
        drawTotemKnowledgeTexture(ctx, label, content);
        return canvasTexture(label);
    }
    const gradient = ctx.createLinearGradient(0, 0, label.width, label.height);
    gradient.addColorStop(0, 'rgba(10,32,21,.72)');
    gradient.addColorStop(1, 'rgba(16,42,30,.40)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(18, 18, 1084, 684, 52);
    ctx.fill();
    ctx.strokeStyle = `${content.accent}b8`;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = content.accent;
    ctx.beginPath();
    ctx.arc(82, 88, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    if (record.revealTitle !== false) {
        ctx.fillStyle = '#fff';
        ctx.font = '650 43px system-ui, sans-serif';
        drawWrappedTextureText(ctx, content.title, 130, 102, 900, 50, 2);
    }
    content.lines.slice(0, record.revealLines ?? content.lines.length).forEach((line, index) => {
        const split = line.indexOf('  ');
        const rowY = 232 + index * 150;
        ctx.fillStyle = content.accent;
        ctx.font = '750 27px system-ui, sans-serif';
        ctx.fillText(line.slice(0, split), 62, rowY);
        ctx.fillStyle = 'rgba(255,255,255,.88)';
        ctx.font = '31px system-ui, sans-serif';
        drawWrappedTextureText(ctx, line.slice(split + 2), 62, rowY + 42, 990, 38, 2);
    });
    return canvasTexture(label);
}

function drawTotemKnowledgeTexture(ctx, label, content) {
    const cards = (content.bubbles || content.lines).filter(Boolean).slice(0, 5);
    const cardLayouts = [
        [24, 90, 190, 142],
        [388, 52, 292, 160],
        [476, 300, 220, 140],
        [20, 506, 172, 150],
        [392, 528, 250, 140]
    ];
    const branchEnds = [[118, 232], [534, 212], [586, 370], [106, 576], [516, 598]];
    ctx.strokeStyle = 'rgba(221,246,238,.72)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    branchEnds.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(360, 408);
        ctx.bezierCurveTo(360 + (x - 360) * .34, 386, 360 + (x - 360) * .68, y, x, y);
        ctx.stroke();
    });
    cards.forEach((text, index) => {
        const [x, y, width, height] = cardLayouts[index];
        const balloonLight = ctx.createRadialGradient(x + width * .25, y + height * .18, 8, x + width * .5, y + height * .5, width * .7);
        balloonLight.addColorStop(0, 'rgba(73,121,104,.96)');
        balloonLight.addColorStop(.46, 'rgba(19,62,51,.94)');
        balloonLight.addColorStop(1, 'rgba(8,35,30,.94)');
        ctx.fillStyle = balloonLight;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, [34, 23, 37, 27]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(226,255,249,.8)';
        ctx.lineWidth = 5;
        ctx.stroke();
        const [attachmentX, attachmentY] = branchEnds[index];
        ctx.fillStyle = 'rgba(218,250,241,.9)';
        ctx.beginPath();
        ctx.arc(attachmentX, attachmentY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = `${index === 1 ? '850 27px' : '800 24px'} system-ui, sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,.95)';
        ctx.shadowBlur = 5;
        drawWrappedTextureText(ctx, text, x + width / 2, y + height / 2 - 16, width - 30, 30, 3);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    });
}

function canvasTexture(label, texture = null) {
    texture ||= gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function createIntroNoteTexture(texture = null) {
    const label = introNoteCanvas ||= document.createElement('canvas');
    label.width = 1400;
    label.height = 1080;
    const ctx = label.getContext('2d');
    ctx.clearRect(0, 0, label.width, label.height);
    const noteGradient = ctx.createLinearGradient(70, 90, 1330, 1000);
    noteGradient.addColorStop(0, 'rgba(74,122,91,.64)');
    noteGradient.addColorStop(.48, 'rgba(24,70,48,.54)');
    noteGradient.addColorStop(1, 'rgba(8,32,21,.42)');
    ctx.fillStyle = noteGradient;
    ctx.strokeStyle = 'rgba(239,255,229,.82)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(48, 50, 1304, 980, [62, 48, 68, 52]);
    ctx.fill();
    ctx.stroke();
    const glassLight = ctx.createRadialGradient(280, 130, 20, 350, 190, 520);
    glassLight.addColorStop(0, 'rgba(255,255,255,.2)');
    glassLight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glassLight;
    ctx.beginPath();
    ctx.roundRect(54, 56, 1292, 968, [58, 44, 64, 48]);
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 18;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#dcef95';
    ctx.font = '750 38px system-ui, sans-serif';
    ctx.fillText(demoIntroLabel(), 700, 165);
    ctx.fillStyle = '#fff';
    let titleSize = 94;
    do {
        ctx.font = `760 ${titleSize}px system-ui, sans-serif`;
        titleSize -= 4;
    } while (titleSize > 58 && ctx.measureText(introBoardTitle).width > 1120);
    drawWrappedTextureText(ctx, introBoardTitle, 700, 300, 1120, titleSize + 14, 2);
    if (introBoardVisibleBody) {
    ctx.strokeStyle = 'rgba(220,239,149,.56)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(150, 430);
    ctx.lineTo(1250, 430);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    const typedBody = introBoardVisibleBody
        ? `${introBoardVisibleBody}${introBoardVisibleBody.length < introBoardBody.length ? '▌' : ''}`
        : '▌';
    const visibleParagraphs = typedBody.split(/\n\n/);
    const bodyLayout = fitIntroBodyLayout(ctx, introBoardBody, 1100, 530);
    ctx.font = `650 ${bodyLayout.fontSize}px system-ui, sans-serif`;
    let paragraphY = 500;
    bodyLayout.paragraphLines.forEach((completeLines, paragraphIndex) => {
        const visibleLines = wrappedTextureLines(ctx, visibleParagraphs[paragraphIndex] || '', 1100);
        visibleLines.forEach((line, lineIndex) => {
            ctx.fillText(line, 150, paragraphY + lineIndex * bodyLayout.lineHeight);
        });
        paragraphY += completeLines.length * bodyLayout.lineHeight + bodyLayout.paragraphGap;
    });
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    return canvasTexture(label, texture);
}

function createIntroControlTexture(labelText, texture = null) {
    const label = document.createElement('canvas');
    label.width = 900;
    label.height = 220;
    const ctx = label.getContext('2d');
    const panel = ctx.createLinearGradient(50, 24, 850, 196);
    panel.addColorStop(0, 'rgba(113,157,91,.96)');
    panel.addColorStop(1, 'rgba(32,77,49,.96)');
    ctx.fillStyle = panel;
    ctx.strokeStyle = 'rgba(240,255,224,.94)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(12, 12, 876, 196, 78);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.7)';
    ctx.shadowBlur = 7;
    ctx.font = '800 58px system-ui, sans-serif';
    ctx.fillText(String(labelText || 'Continue'), 450, 110);
    ctx.shadowBlur = 0;
    return canvasTexture(label, texture);
}

function createIntroPointerTexture(texture = null) {
    const label = document.createElement('canvas');
    label.width = 256;
    label.height = 256;
    const ctx = label.getContext('2d');
    const glow = ctx.createRadialGradient(128, 128, 32, 128, 128, 120);
    glow.addColorStop(0, 'rgba(226,244,181,.42)');
    glow.addColorStop(.58, 'rgba(154,211,122,.16)');
    glow.addColorStop(1, 'rgba(154,211,122,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(246,255,231,.98)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(128, 128, 72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,239,149,.88)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(128, 128, 96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#dcef95';
    ctx.beginPath();
    ctx.arc(128, 128, 8, 0, Math.PI * 2);
    ctx.fill();
    return canvasTexture(label, texture);
}

function createIntroKnowledgeTexture() {
    const label = document.createElement('canvas');
    label.width = 1400;
    label.height = 900;
    const ctx = label.getContext('2d');
    const cells = [
        [490, 285], [630, 285], [770, 285], [910, 285],
        [490, 615], [630, 615], [770, 615], [910, 615],
        [405, 370], [995, 370], [405, 530], [995, 530]
    ];
    cells.forEach(([x, y], index) => {
        const keyword = INTRO_KNOWLEDGE_KEYWORDS[index];
        const longLabel = keyword.length > 10;
        drawHexagon(ctx, x, y, 78, 'rgba(34,69,47,.36)', 'rgba(241,251,234,.58)', 3);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,12,5,.72)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.font = `${longLabel ? '650 21px' : '650 27px'} system-ui, sans-serif`;
        drawWrappedTextureText(ctx, keyword, x, y - (longLabel ? 18 : 14), 118, longLabel ? 24 : 28, 2);
    });
    return canvasTexture(label);
}

function introLocalPosition(matrix, [x, y, z]) {
    return {
        x: matrix[12] + matrix[0] * x + matrix[4] * y + matrix[8] * z,
        y: matrix[13] + matrix[1] * x + matrix[5] * y + matrix[9] * z,
        z: matrix[14] + matrix[2] * x + matrix[6] * y + matrix[10] * z
    };
}

function drawIntroSpatial(view) {
    if (!introSceneActive || !viewerMatrix || !program || !buffer) return;
    introWorldAnchor ||= Float32Array.from(viewerMatrix);
    const now = performance.now();
    if (introBoardVisible && (!introNoteTexture || (introBoardTextureDirty && now - introTextureUploadedAt >= DEMO_TEXT_TEXTURE_INTERVAL_MS && introTextureFrameToken !== introFrameToken))) {
        introNoteTexture = createIntroNoteTexture(introNoteTexture);
        introBoardTextureDirty = false;
        introTextureUploadedAt = now;
        introTextureFrameToken = introFrameToken;
    }
    if (introBoardVisible) introKnowledgeTexture ||= createIntroKnowledgeTexture();
    const elapsed = performance.now() - introSceneStartedAt;
    const drawTexture = (texture, position, scaleX, scaleY, opacity) => {
        const model = billboardMatrix(position, scaleX, scaleY, introWorldAnchor);
        const mvp = multiply(view.projectionMatrix, multiply(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mvp'), false, mvp);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(program, 't'), 0);
        gl.uniform1f(gl.getUniformLocation(program, 'opacity'), opacity);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const noteProgress = Math.min(1, Math.max(0, (elapsed - 80) / 1200));
    const easedNote = 1 - Math.pow(1 - noteProgress, 3);
    const knowledgeProgress = Math.min(1, Math.max(0, (elapsed - 1900) / 2800));
    const easedKnowledge = 1 - Math.pow(1 - knowledgeProgress, 3);
    if (introBoardVisible && introKnowledgeVisible) {
        drawTexture(
            introKnowledgeTexture,
            introLocalPosition(introWorldAnchor, AR_PHONE_COMFORT.boardPosition),
            AR_PHONE_COMFORT.boardScale[0],
            AR_PHONE_COMFORT.boardScale[1],
            easedKnowledge * .9
        );
    }
    if (introBoardVisible && introNoteTexture) {
        drawTexture(
            introNoteTexture,
            introLocalPosition(introWorldAnchor, AR_PHONE_COMFORT.boardPosition),
            AR_PHONE_COMFORT.boardScale[0],
            AR_PHONE_COMFORT.boardScale[1],
            easedNote
        );
    }
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    const controlLabel = session && !domOverlayEnabled && continueButton && !continueButton.hidden
        ? (continueButton.textContent || 'Continue').trim()
        : '';
    if (controlLabel) {
        if (!introControlTexture || introControlTextureLabel !== controlLabel) {
            introControlTexture = createIntroControlTexture(controlLabel, introControlTexture);
            introControlTextureLabel = controlLabel;
        }
        drawTexture(
            introControlTexture,
            introLocalPosition(introWorldAnchor, [0, -0.16, -2.8]),
            1.85,
            .78,
            1
        );
    } else if (introControlTexture) {
        gl.deleteTexture(introControlTexture);
        introControlTexture = null;
        introControlTextureLabel = '';
    }
    if (placementReady) {
        introPointerTexture ||= createIntroPointerTexture();
        const pointerPosition = placementPosition();
        if (pointerPosition) drawTexture(introPointerTexture, pointerPosition, .32, .8, 1);
    }
}

function drawHexagon(ctx, x, y, radius, fill, stroke, lineWidth = 2) {
    ctx.beginPath();
    for (let point = 0; point < 6; point++) {
        const angle = Math.PI / 3 * point;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (!point) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

function drawPlantKnowledgeTexture(ctx, label, knowledge, expandedPaths = [], options = {}) {
    drawPlantInformationHoneycomb(ctx, label, knowledge, expandedPaths, options);
    const focus = pimFocusedView(knowledge, expandedPaths);
    const children = (focus?.nodes || pimVisibleNodes(knowledge, expandedPaths)).filter(node => node.depth > 0);
    if (!children.length) return;
    // The shared renderer owns the cells. Add only their parent links behind
    // the rendered pixels so every new bloom is visibly connected to the
    // topic that produced it in immersive AR as well as the DOM fallback.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.lineCap = 'round';
    children.forEach(node => {
        const parent = node.parentPosition || { x: 50, y: 50 };
        const point = node.position || parent;
        const start = { x: parent.x / 100 * label.width, y: parent.y / 100 * label.height };
        const end = { x: point.x / 100 * label.width, y: point.y / 100 * label.height };
        const hue = pimNodeHue(node);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(
            start.x + (end.x - start.x) * .36,
            start.y + (end.y - start.y) * .36,
            start.x + (end.x - start.x) * .72,
            start.y + (end.y - start.y) * .72,
            end.x,
            end.y
        );
        ctx.strokeStyle = `hsla(${hue}, 68%, 78%, .82)`;
        ctx.lineWidth = 7;
        ctx.stroke();
    });
    ctx.restore();
}

function createBoundaryTexture() {
    if (!gl) return null;
    const label = document.createElement('canvas');
    label.width = 512; label.height = 512;
    const ctx = label.getContext('2d');
    ctx.strokeStyle = 'rgba(137,200,239,.78)';
    ctx.lineWidth = 9;
    ctx.setLineDash([22, 14]);
    ctx.beginPath();
    ctx.ellipse(256, 256, 218, 142, 0, 0, Math.PI * 2);
    ctx.stroke();
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function createDemoNoteTexture(record) {
    const content = demoContentFor(record) || NOTE_TEMPLATES.poi;
    const label = document.createElement('canvas');
    label.width = 1024;
    label.height = 384;
    const ctx = label.getContext('2d');
    const noteColor = record?.appearance?.color || '#9a6b50';
    ctx.clearRect(0, 0, label.width, label.height);
    ctx.fillStyle = noteColor;
    ctx.globalAlpha = Number(record?.appearance?.opacity ?? 1);
    ctx.beginPath();
    ctx.roundRect(12, 12, 1000, 360, 58);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(239,255,235,.88)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    ctx.font = '800 50px system-ui, sans-serif';
    drawWrappedTextureText(ctx, content.title || record.name || 'Note', 62, 56, 900, 58, 2);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '650 27px system-ui, sans-serif';
    (content.lines || []).slice(0, 3).forEach((line, index) => {
        drawWrappedTextureText(ctx, line, 62, 184 + index * 54, 900, 34, 1);
    });
    return canvasTexture(label);
}

function createMarkerTexture(record) {
    if (!gl) return null;
    if (record.demoExpanded) return createSpatialKnowledgeTexture(record);
    if (record.demoType === 'note') return createDemoNoteTexture(record);
    const label = document.createElement('canvas');
    label.width = 256;
    label.height = 256;
    const ctx = label.getContext('2d');
    if (record.type === 'plant') {
        const life = ctx.createRadialGradient(102, 94, 10, 128, 128, 94);
        life.addColorStop(0, '#f5ffe8');
        life.addColorStop(.2, '#b7e895');
        life.addColorStop(.52, '#5fa34d');
        life.addColorStop(.78, 'rgba(43,112,54,.88)');
        life.addColorStop(1, 'rgba(25,75,39,.2)');
        ctx.fillStyle = life;
        ctx.beginPath();
        ctx.arc(128, 128, 88, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(239,255,226,.88)';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.fillStyle = 'rgba(241,255,225,.82)';
        ctx.beginPath();
        ctx.arc(108, 105, 18, 0, Math.PI * 2);
        ctx.fill();
    } else if (record.demoType === 'zone') {
        ctx.fillStyle = 'rgba(77,174,174,.98)';
        ctx.beginPath();
        ctx.moveTo(68, 30); ctx.lineTo(158, 42); ctx.lineTo(158, 238); ctx.lineTo(68, 226); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(22,91,108,.98)';
        ctx.beginPath();
        ctx.moveTo(158, 42); ctx.lineTo(194, 24); ctx.lineTo(194, 218); ctx.lineTo(158, 238); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(132,226,215,.98)';
        ctx.beginPath();
        ctx.moveTo(68, 30); ctx.lineTo(104, 12); ctx.lineTo(194, 24); ctx.lineTo(158, 42); ctx.closePath();
        ctx.fill();
    } else if (record.type === 'marker' || record.type === 'sub_checkpoint') {
        const glow = ctx.createRadialGradient(128, 128, 18, 128, 128, 118);
        glow.addColorStop(0, 'rgba(226,244,181,.7)');
        glow.addColorStop(.58, 'rgba(146,201,122,.48)');
        glow.addColorStop(.82, 'rgba(104,164,91,.18)');
        glow.addColorStop(1, 'rgba(104,164,91,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(128, 128, 118, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(226,244,181,.92)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(128, 128, 78, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        ctx.fillStyle = '#357fc4';
        ctx.beginPath();
        ctx.roundRect(8, 42, 240, 172, 28);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('◆  Area', 128, 139);
    }
    const markerTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, markerTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return markerTexture;
}

function drawMarker(view) {
    if (!program || !buffer || !sphereRenderer || !tetherRenderer || !prismRenderer || !triangleRenderer) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    markers.forEach(record => {
        const orbType = record.demoType === 'plant' ? 'plant' : record.demoType === 'marker' ? 'marker' : '';
        if (!orbType) return;
        const material = DEMO_ORB_MATERIALS[record.demoOrbColor];
        if (record.demoOrbShape === 'triangle') {
            drawSpatialTriangle(gl, triangleRenderer, view, record.position, {
                halfWidth: .075,
                halfHeight: .075,
                halfDepth: .046,
                color: material?.shell || [.34, .23, .14],
                topColor: material?.core || [.67, .48, .27],
                alpha: .98,
                rotationY: Math.PI / 7
            });
            return;
        }
        drawSpatialOrb(
            gl,
            sphereRenderer,
            view,
            record.position,
            material?.radius || (orbType === 'plant' ? .068 : .05),
            { type: orbType, color: material?.shell, coreColor: material?.core }
        );
    });
    markers.forEach(record => {
        if (record.demoType !== 'zone') return;
        drawSpatialPrism(gl, prismRenderer, view, record.position, {
            halfWidth: .16,
            halfHeight: .9,
            halfDepth: .16,
            color: [.3, .7, .69],
            topColor: [.62, .92, .84],
            rotationY: Math.PI / 7
        });
    });

    markers.forEach(record => {
        if (record.demoType !== 'plant' || !record.demoExpanded) return;
        const informationPosition = record.informationPosition || (record.informationPosition = plantInformationPosition(record));
        drawSpatialTether(
            gl,
            tetherRenderer,
            view,
            { ...record.position, y: record.position.y + 0.07 },
            { ...informationPosition, y: informationPosition.y - 0.22 },
            { width: 0.003, color: [0.84, 0.93, 0.76, 0.25], curve: 0.035, lift: 0.05 }
        );
    });

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const p = gl.getAttribLocation(program, 'p'); const uv = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
    drawIntroSpatial(view);
    markers.forEach(record => {
        if (record.demoType === 'plant' && record.demoExpanded && record.pimBloomStarted) {
            const elapsed = performance.now() - record.pimBloomStarted;
            if (elapsed <= PIM_BLOOM_DURATION_MS) {
                if (record.texture) gl.deleteTexture(record.texture);
                record.texture = createMarkerTexture(record);
            } else {
                record.pimBloomStarted = 0;
            }
        }
        if (!record.texture) return;
        const orbOnly = ['marker', 'plant'].includes(record.demoType) && !record.demoExpanded;
        if (orbOnly) return;
        const compact = !record.demoExpanded;
        const totem = record.demoType === 'zone';
        if (totem && compact) return;
        const noteSign = record.demoType === 'note';
        const plantProfile = record.demoType === 'plant' && record.demoExpanded;
        const displayPosition = plantProfile
            ? record.informationPosition || (record.informationPosition = plantInformationPosition(record))
            : totem
            ? { ...record.position, y: record.position.y + 1 }
            : record.position;
        const noteScale = noteSign ? DEMO_NOTE_IMMERSIVE_SCALE : null;
        const model = plantProfile
            ? fixedPimPanelMatrix(record.informationPose)
            : billboardMatrix(
                displayPosition,
                totem ? 1.9 : noteScale?.x || (compact ? .38 : 2.35),
                totem ? 3 : noteScale?.y || (compact ? .38 : 3.45)
            );
        if (!model) return;
        const mvp = multiply(view.projectionMatrix, multiply(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mvp'), false, mvp);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, record.texture);
        gl.uniform1i(gl.getUniformLocation(program, 't'), 0);
        const profileOpacity = plantProfile ? Math.min(1, Math.max(0, (performance.now() - (record.profileRevealStarted || 0)) / 1050)) : 1;
        gl.uniform1f(gl.getUniformLocation(program, 'opacity'), profileOpacity);
        if (plantProfile) gl.depthMask(false);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (plantProfile) gl.depthMask(true);
        if (record.isBoundary) {
            record.boundaryTexture ||= createBoundaryTexture();
            const boundaryMvp = multiply(view.projectionMatrix, multiply(view.transform.inverse.matrix, groundMatrix(record.position, 4.6)));
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mvp'), false, boundaryMvp);
            gl.bindTexture(gl.TEXTURE_2D, record.boundaryTexture);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    });
    drawDemoControllerPointer(view);
}

function demoLaserSubjects() {
    const subjects = markers.flatMap(record => [
        {
            position: record.position,
            radius: record.demoType === 'note' ? .62 : record.demoType === 'zone' ? .42 : .3
        },
        ...(record.demoExpanded && record.informationPosition
            ? [{ position: record.informationPosition, radius: .96 }]
            : [])
    ]);
    if (placementReady) {
        const point = placementPosition();
        if (point) subjects.push({ position: point, radius: .38 });
    }
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    const controlLabel = session && !domOverlayEnabled && continueButton && !continueButton.hidden
        ? (continueButton.textContent || 'Continue').trim()
        : '';
    if (controlLabel && introWorldAnchor) {
        subjects.push({
            position: introLocalPosition(introWorldAnchor, [0, -.16, -2.8]),
            radius: .64
        });
    }
    return subjects;
}

function drawDemoControllerPointer(view) {
    if (!latestControllerRay || !tetherRenderer) return;
    const { origin, direction } = latestControllerRay;
    const start = {
        x: origin.x + direction.x * XR_LASER_POINTER_CONFIG.startOffset,
        y: origin.y + direction.y * XR_LASER_POINTER_CONFIG.startOffset,
        z: origin.z + direction.z * XR_LASER_POINTER_CONFIG.startOffset
    };
    const end = controllerRayEnd(latestControllerRay, demoLaserSubjects(), XR_LASER_POINTER_CONFIG.length);
    if (!end) return;
    drawSpatialTether(gl, tetherRenderer, view, start, end, {
        segments: XR_LASER_POINTER_CONFIG.segments,
        width: XR_LASER_POINTER_CONFIG.width,
        curve: .001,
        lift: .001,
        color: [...XR_LASER_POINTER_CONFIG.color, XR_LASER_POINTER_CONFIG.alpha]
    });
}

async function startImmersive() {
    if (!navigator.xr || !window.isSecureContext) return false;
    try {
        const arSession = await requestImmersiveArSession(appRoot);
        session = arSession.session;
        sessionMode = arSession.mode || 'immersive-ar';
        domOverlayEnabled = Boolean(arSession.domOverlay);
        const transparentSession = arSession.passthrough !== false;
        canvas = document.createElement('canvas'); canvas.className = 'tryit-xr-canvas'; document.body.append(canvas);
        gl = canvas.getContext('webgl', { alpha: transparentSession, antialias: true });
        if (!gl) throw new Error('WebGL unavailable');
        await gl.makeXRCompatible();
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl, { alpha: transparentSession, antialias: true }) });
        try { referenceSpace = await session.requestReferenceSpace('local-floor'); } catch { referenceSpace = await session.requestReferenceSpace('local'); }
        try {
            const viewerSpace = await session.requestReferenceSpace('viewer');
            hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
        } catch (error) {
            hitTestSource = null;
            setGuide(`${sessionMode === 'immersive-vr' ? 'Quest immersive mode' : 'Passthrough AR'} is active. Surface detection unavailable; placement uses your view direction. (${error.message})`);
        }
        setupRenderer();
        session.addEventListener('select', () => {
            if (demoWebModeOpen || performance.now() < suppressSessionSelectUntil) return;
            if (demoHeldIndex >= 0) return;
            // Quest controllers do not reliably generate DOM click events for
            // the optional overlay. Map one deliberate select to the same
            // tutorial control a phone user sees, then to the live aim.
            if (activateImmersiveDemoControl()) return;
            if (placementReady) return pressPlacementPointer();
            if (selectDemoProfileCell()) return;
            if (selectDemoNoteTemplateAtPointer()) return;
            if (selectDemoPlantAtPointer()) return;
            selectGuidedDemoOrb();
        });
        session.addEventListener('selectstart', () => {
            if (demoWebModeOpen || performance.now() < suppressSessionSelectUntil) return;
            if (placementReady || activateImmersiveDemoControl()) return;
            const actionTarget = demoRecordAtPointer()?.record;
            if (markers.some(record => record.demoType === 'plant' && record.demoExpanded)
                || actionTarget?.awaitingProfileReveal
                || actionTarget?.demoType === 'note') return;
            beginControllerDemoHold();
        });
        session.addEventListener('selectend', () => {
            if (demoHeldIndex < 0) return;
            releaseHeldDemoRecord();
            suppressSessionSelectUntil = performance.now() + 280;
        });
        session.addEventListener('end', () => { const shouldReturn = !ending; session = null; clearSessionState(); if (shouldReturn) window.renderLaunchScreen(); ending = false; });
        const draw = (_time, frame) => {
            if (!session || frame.session !== session || !gl) return;
            session.requestAnimationFrame(draw);
            introFrameToken = _time;
            const pose = frame.getViewerPose(referenceSpace);
            viewerMatrix = pose ? Float32Array.from(pose.transform.matrix) : null;
            latestDemoView = pose?.views?.[0] || null;
            const hit = hitTestSource && frame.getHitTestResults(hitTestSource)[0];
            const hitPose = hit?.getPose(referenceSpace);
            hitMatrix = hitPose ? Float32Array.from(hitPose.transform.matrix) : null;
            groundYEstimate = demoGroundBaseY(hitMatrix, viewerMatrix, groundYEstimate);
            updateDemoControllerRay(frame);
            updateHeldDemoRecordPosition();
            const layer = frame.session.renderState.baseLayer;
            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.clearColor(0, 0, 0, transparentSession ? 0 : 1);
            gl.enable(gl.SCISSOR_TEST);
            for (const view of pose?.views || []) {
                const viewport = layer.getViewport(view);
                if (!viewport) continue;
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                drawMarker(view);
            }
            gl.disable(gl.SCISSOR_TEST);
        };
        session.requestAnimationFrame(draw);
        return true;
    } catch {
        const active = session; session = null; clearSessionState(); active?.end().catch(() => {});
        return false;
    }
}

export function openTemporaryArDemoWindow(app) {
    return startTemporaryArDemo(app);
}

export async function startTemporaryArDemo(app) {
    appRoot = app;
    clearSessionState();
    const immersive = await startImmersive();
    renderInterface(!immersive);
    if (!immersive) viewerMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
