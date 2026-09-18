import {LIM_ALL_CELLS,LIM_CELL_BY_ID,LIM_PATHWAYS,limLearningContent} from '../services/limLearning.js';
import { createPimInfoPanel } from '../services/pimInfoPanel.js';
import { createLimActivationController } from '../services/limActivation.js';
import { advanceLimPathway, backLimPathway, completeLimPathway, idleLimPathwayState, loadLimPathwayState, pauseLimPathway, resumeLimPathway, saveLimPathwayState, startLimPathway, visitLimPathwayCell } from '../services/limPathwayState.js';
import { bindSpatialPimHold } from '../services/pimActivationHold.js';
import { createPlantKnowledgeResolver, totemKnowledgeCards, totemCardsMarkup, liveOrbCrownMarkup } from '../services/spatialKnowledgePresentation.js';
import { createSpatialTotemCards } from '../services/spatialTotemCards.js';
const resolveOrbKnowledge = createPlantKnowledgeResolver();
import {drawArWelcomePanel} from '../services/arWelcomePanel.js';
import {createWelcomePresentationClock,AR_WELCOME_SHOWCASE_DURATION,drawArWelcomeShowcase,createArWelcomeClusters,welcomeCanContinue,welcomeExperienceFrames,welcomeCellAtPoint} from '../services/arWelcomeShowcase.js';
/**
 * TRY IT NOW — a deliberately small, self-contained AR placement demo.
 * It never opens a dashboard or a draggable window before placement.
 */
import { spatialPosition } from '../services/spatialPlacement.js';
import { createMinimalMarkerDraft, relateMinimalMarkers } from '../services/markerWorkflow.js';
import { placementPointerMarkup } from '../services/placementPointer.js';
import { spatialMoveControlMarkup } from '../services/spatialMoveControl.js';
import { createSpatialSphereRenderer, destroySpatialSphereRenderer, drawSpatialOrb, drawSpatialSphere } from '../services/spatialSphereRenderer.js';
import { createSpatialTetherRenderer, destroySpatialTetherRenderer, drawSpatialTether } from '../services/spatialTetherRenderer.js';
import { createSpatialPrismRenderer, destroySpatialPrismRenderer, drawSpatialPrism } from '../services/spatialPrismRenderer.js';
import { createSpatialTriangleRenderer, destroySpatialTriangleRenderer, drawSpatialTriangle } from '../services/spatialTriangleRenderer.js';
import { AR_EXPERIENCE_CONFIG } from '../services/arExperienceConfig.js';
import { PIGEON_PEA_AR_KNOWLEDGE, PIGEON_PEA_EXAMPLE } from '../services/pigeonPeaExample.js';
import { currentNxrLanguage, translateNxrText } from '../services/i18n.js';
import { requestImmersiveArSession } from '../services/webxrSession.js';
import { allowArScreenRotation, releaseArScreenRotation } from '../services/arScreenOrientation.js';
import { showArSafetyDialog } from '../services/arOnboarding.js';
import { recordArDiagnostic, recordArFailure } from '../services/arNote.js';
import { controllerRayEnd, controllerRayFromPose, XR_LASER_POINTER_CONFIG } from '../services/xrPointer.js';
import { PIM_SPATIAL_CONFIG, PIM_SPATIAL_LAYOUT_OPTIONS, pimClosingNodePaths, pimCreateInteractionState, pimExpandedNodeIds, pimNodeAtPath, pimNodeChildren, pimResetInteractionState, pimSpatialPanel, pimSpatialPoseAboveAnchor, pimToggleNodeState, pimViewportSafeArea } from '../services/plantInformationMesh.js';
import { PIM_BLOOM_DURATION_MS, PIM_TEXTURE_SIZE, createPlantInformationHoneycombTexture, pimHoneycombTargetAtPercent, pimHoneycombTextureSize } from '../services/plantInformationMeshCanvas.js?v=0.9001';
import { resolvePlantPim } from '../services/pimLegacyAdapter.js';
import { pimToArKnowledge } from '../services/pimModel.js';
import { mountCreatorArKnowledge } from '../services/creatorArKnowledge.js';
import { createSpatialDashboardMirror, spatialDashboardPanelFromViewer, spatialDashboardPanelMatrix, spatialDashboardRayHit } from '../services/spatialDashboardMirror.js';
import { mountPlantInformationWeb } from '../components/plantInformationWeb.js';
import { PIGEON_PEA_PIM } from '../services/pigeonPeaPim.js';
import { bindPlantInformationMeshPress, plantInformationMeshMarkup, reconcilePlantInformationMesh } from '../services/plantInformationMeshView.js';
import { bindHoldToConfirmButton } from '../services/holdToConfirm.js';
import { DEMO_TUTORIAL_STEPS, demoTutorialControlsForStep } from '../services/demoTutorialControls.js';
import { plantInformationMeshSurfaceLayout } from '../services/plantInformationMeshSurfaceLayout.js';

let demoKnowledgeWorkspace=null, demoKnowledgeRoot=null, demoKnowledgeMirror=null, demoKnowledgePanel=null;
let demoKnowledgeScrollAt=0;
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
let totemCardsRenderer = null;
let infoPanel = null;
let pimHold = null;
function showDemoInfo(record,path) { clearLimSelection(); infoPanel?.select(record,demoOrbKnowledge(record).document,path); }
function demoInfoTarget() { return [...markers].reverse().filter(r=>r.demoType==='plant' && r.demoExpanded).map(record=>({record,target:demoPimPointerTarget(record)})).find(t=>t.target?.node || t.target?.pimBack) || null; }
let tetherRenderer = null;
let prismRenderer = null;
let triangleRenderer = null;
let ending = false;
let demoStage = 'plant';
let boardTypingTimer = null;
let boardTypingWatchdogTimer = null;
let skipDemoNarration = null;
let aimRevealTimer = null;
let pointerPressTimer = null;
let demoHoldTimer = null;
let introNarrationTimer = null;
let arWelcomeShowcaseActive=false, arWelcomeShowcaseFrame=0, arWelcomeClusters=[];
let arWelcomeClock=createWelcomePresentationClock();
let arWelcomeStartedAt=0, arWelcomeIntroPending=false, arWelcomeSharedBoard=false;
let arWelcomeVisionActivated=false, arWelcomeVisionActivatedAt=NaN;
let arWelcomeUnlockTimer=null, arWelcomeLayer=null, arWelcomeCanvas=null;
let limHiddenCells=new Set();
// Deeper LIM branches open only after their parent cell is explored. Keeping
// these IDs separate from selection lets the visitor wander without a full
// catalogue dumping onto the spatial board.
let limExpandedCells=new Set(),limExpandedAt=new Map();
let limMeshVisible=true;
let limActivation=null, limActivationFrame=0, limInteractionCleanup=()=>{}, limSessionCleanup=()=>{}, limPointerKey='', limPointerId=null, limInputSource=null, limActivationSessionSuppressUntil=0;
let limPathwayState=idleLimPathwayState(), pathwayNotePlacementPending=false, learningModule=null, learningModuleStep=0;
let limPanelDiagnosticRecorded=false;
const limRequestFrame=callback=>typeof requestAnimationFrame==='function'?requestAnimationFrame(callback):setTimeout(()=>callback(performance.now()),16);
const limCancelFrame=handle=>{if(typeof cancelAnimationFrame==='function')cancelAnimationFrame(handle);else clearTimeout(handle);};
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
let introBoardStep = '';
let introBoardTitle = 'NourishlandXR';
let introBoardBody = 'A short guided demo of Plant Live Tags and Notes.';
let placementReady = false;
let demoHeldIndex = -1;
let suppressDemoMarkerClick = false;
let suppressSessionSelectUntil = 0;
let demoWebModeOpen = false;
let demoPimWebController = null;
let demoHoldButtonCleanup = null;
let demoViewportCleanup = null;
let groundYEstimate = null;
let demoTutorialStep = DEMO_TUTORIAL_STEPS.WELCOME;
let demoOrientationStep=-1,demoPanelControlsCleanup=()=>{},demoPanelActionSignature='';
const limDiagnostic = (stage, details = {}) => recordArDiagnostic(`LIM ${stage}`, details);
function limDeviceContext(pointerType = 'unknown') {
    const viewport = demoViewportDimensions();
    return {
        device: navigator.userAgentData?.platform || navigator.platform || 'unknown',
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        orientation: viewport.width >= viewport.height ? 'landscape' : 'portrait',
        pointerType,
        userAgent: navigator.userAgent
    };
}
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
const demoIntroLabel = () => introBoardStep || (demoIsPortuguese() ? 'UMA INTRODUÇÃO VIVA' : demoIsDutch() ? 'EEN LEVENDE INTRODUCTIE' : 'A LIVING INTRODUCTION');
// Canvas texture uploads are expensive on phones. Coalesce the continuously
// changing welcome copy/mesh into a modest cadence so typing and input stay
// responsive while the XR frame loop remains free to render at 60fps.
const DEMO_TEXT_TEXTURE_INTERVAL_MS = 48;
const DEMO_LIM_TEXTURE_INTERVAL_MS = 96;
const AR_WELCOME_SETTLED_MS = 64000;
const DEMO_PLANT_ORB_HOLD_DELAY_MS = 800;
// A paused XR/browser timer must never leave the demo waiting forever for
// the last character. The copy still types in normally, then completes within
// this bounded window so Continue remains available on every runtime.
// Only a suspended/background tab should need the safety timeout. A normal
// narration must finish character-by-character without snapping its tail in.
const DEMO_BOARD_TYPING_SAFETY_MS = 30000;
const DEMO_SEQUENCE = ['plant', 'plant2', 'note', 'totem'];
const DEMO_TOTEM_STYLES = Object.freeze([
    { id: 'basic', label: 'Simple Totem' },
    { id: 'organic', label: 'Light Bulb' },
    { id: 'flat-disc', label: 'Disk Totem' }
]);
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
        shell: [0.58, 0.38, 0.12],
        core: [0.87, 0.68, 0.25],
        radius: 0.074,
        style: '--demo-orb-size:62px;--demo-orb-light:#fff0b5;--demo-orb-mid:#b47a27;--demo-orb-dark:#5b3612;--demo-orb-core-light:#fff5c9;--demo-orb-core-mid:#d6a83c;--demo-orb-core-dark:#76501b'
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
        accent: '#8fa56a',
        bubbles: [
            'FOOD FOREST AREA',
            'Pigeon Pea + Moringa guild',
            'Warm sheltered microclimate',
            'Pollinator activity',
            'Seasonal garden observations'
        ]
    },
    zoneTwo: {
        title: 'Kitchen Garden Totem',
        accent: '#b58a5e',
        bubbles: [
            'KITCHEN GARDEN AREA',
            'Seed-to-table plants',
            'Warm growing space',
            'Kitchen observations',
            'LINKED TO FOOD FOREST'
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
const knowledgeFor = record => record.demoKnowledgeProjection || (record.demoPlantPreset === 'moringa' ? MORINGA_KNOWLEDGE : PIGEON_PEA_AR_KNOWLEDGE);
const demoSpatialPimLayoutOptions = () => ({ ...PIM_SPATIAL_LAYOUT_OPTIONS });
function demoPimSurfaceSize(record) {
    const knowledge=knowledgeFor(record), expanded=demoPimExpandedNodeIds(record), key=JSON.stringify(expanded);
    if(record.pimSurfaceCache?.knowledge===knowledge && record.pimSurfaceCache.key===key) return record.pimSurfaceCache.size;
    const size=pimHoneycombTextureSize(knowledge, expanded, {
        ...demoSpatialPimLayoutOptions(),
        width: PIM_TEXTURE_SIZE.width,
        height: PIM_TEXTURE_SIZE.height
    });
    record.pimSurfaceCache={knowledge,key,size};
    return size;
}

function demoPimPanel(record, pose = record?.informationPose) {
    const size = record?.pimTextureSize || demoPimSurfaceSize(record);
    return pimSpatialPanel(orientDemoPimPoseToViewer(pose), {
        width: PIM_SPATIAL_CONFIG.expandedSurfaceWidthMetres * size.width / PIM_TEXTURE_SIZE.width,
        height: PIM_SPATIAL_CONFIG.expandedSurfaceHeightMetres * size.height / PIM_TEXTURE_SIZE.height
    });
}
const NOTE_TEMPLATES = Object.freeze({
    poi: { title: 'Point of Interest · Seasonal observation', accent: '#f0cf70', lines: ['PURPOSE  Draw attention to this place', 'MEDIA  Sound · animation · images', 'ACTION  Revisit · compare · update'] },
    plaque: { title: 'Garden plaque · Grow gently', accent: '#f2d997', lines: ['“A garden teaches us to care for what comes next.”', 'Pause · notice · return', 'A small thought anchored to this living place'] },
    warning: { title: 'Warning Note · DON’T GO HERE', accent: '#ef9b78', lines: ['WARNING  Do not enter this place', 'GUIDANCE  Explain the risk or boundary', 'FUTURE  Sound · alerts · animation'] }
});
const DEMO_NOTE_TEMPLATE_KEYS = Object.freeze(Object.keys(NOTE_TEMPLATES));

function clearSessionState() {
    closeDemoKnowledge(true);
    demoPanelControlsCleanup();demoPanelControlsCleanup=()=>{};demoPanelActionSignature='';demoOrientationStep=-1;limMeshVisible=true;learningModule=null;learningModuleStep=0;
    limInteractionCleanup();limSessionCleanup();limInteractionCleanup=()=>{};limSessionCleanup=()=>{};limActivation=null;limActivationSessionSuppressUntil=0;
    releaseArScreenRotation();
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
    demoTutorialStep = DEMO_TUTORIAL_STEPS.WELCOME;
    clearTimeout(boardTypingTimer);
    clearTimeout(boardTypingWatchdogTimer);
    skipDemoNarration = null;
    clearTimeout(aimRevealTimer);
    clearTimeout(pointerPressTimer);
    clearTimeout(demoHoldTimer);
    clearTimeout(introNarrationTimer);
    cancelAnimationFrame(arWelcomeShowcaseFrame);arWelcomeShowcaseFrame=0;arWelcomeShowcaseActive=false;
    clearTimeout(arWelcomeUnlockTimer);arWelcomeUnlockTimer=null;arWelcomeStartedAt=0;arWelcomeIntroPending=false;arWelcomeSharedBoard=false;arWelcomeVisionActivated=false;arWelcomeVisionActivatedAt=NaN;
    arWelcomeLayer?.remove();arWelcomeLayer=null;arWelcomeCanvas=null;limHiddenCells=new Set();limExpandedCells=new Set();limExpandedAt=new Map();limPointerKey='';limPointerId=null;limInputSource=null;
    limPanelDiagnosticRecorded=false;
    boardTypingTimer = null;
    boardTypingWatchdogTimer = null;
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
    demoHoldButtonCleanup?.();
    demoHoldButtonCleanup = null;
    demoViewportCleanup?.();
    demoViewportCleanup = null;
    introTaglineVisible = true;
    introKnowledgeVisible = false;
    markers.forEach(record => {
        if (record.texture) gl?.deleteTexture(record.texture);
        if (record.boundaryTexture) gl?.deleteTexture(record.boundaryTexture);
    });
    destroySpatialSphereRenderer(gl, sphereRenderer);
    totemCardsRenderer?.destroy(); totemCardsRenderer = null;
    pimHold?.destroy(); pimHold = null; infoPanel?.destroy(); infoPanel = null;
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

function demoControlIsVisible(selector) {
    const element=appRoot?.querySelector(selector);
    return Boolean(element && !element.hidden && !element.disabled);
}

function demoPanelActions() {
    const actions=[];
    if(demoControlIsVisible('[data-tryit-open-live-tag]'))actions.push({id:'live-tag',label:'Open Plant Live Tag'});
    if(demoOrientationStep>0 && demoTutorialStep===DEMO_TUTORIAL_STEPS.WELCOME)actions.push({id:'back',label:'Previous'});
    if(arWelcomeShowcaseActive)actions.push({id:'lim-visibility',label:limMeshVisible?'Hide learning cells':'Show learning cells'});
    actions.push({id:'close',label:'Close demo'});
    if(demoControlIsVisible('[data-tryit-intro-continue]'))actions.push({id:'continue',label:appRoot.querySelector('[data-tryit-intro-continue]').textContent.trim() || 'Continue',primary:true});
    return actions.slice(-8);
}

function syncDemoPanelActions() {
    if(!infoPanel)return;
    const actions=demoPanelActions(),signature=JSON.stringify(actions);
    if(signature===demoPanelActionSignature)return;
    demoPanelActionSignature=signature;
    infoPanel.setUtilityActions(actions);
    appRoot?.querySelector('.tryit-demo')?.classList.add('has-companion-actions');
}

function setLimMeshVisible(visible) {
    limMeshVisible=Boolean(visible);
    introBoardTextureDirty=true;
    paintWelcomeLayer(performance.now());
    syncDemoPanelActions();
}

function handleDemoPanelAction(action) {
    if(action==='continue'){appRoot?.querySelector('[data-tryit-intro-continue]:not([hidden])')?.click();return;}
    if(action==='live-tag'){appRoot?.querySelector('[data-tryit-open-live-tag]:not([hidden])')?.click();return;}
    if(action==='back' && demoOrientationStep>0){runArWelcomeTutorial(demoOrientationStep-1);return;}
    if(action==='skip'){skipDemoNarration?.();return;}
    if(action==='lim-visibility'){setLimMeshVisible(!limMeshVisible);return;}
    if(action==='recenter'){infoPanel?.recenter();return;}
    if(action==='close')returnToWelcome();
}

function bindDemoPanelActions() {
    demoPanelControlsCleanup();
    const taskbar=appRoot?.querySelector('.tryit-demo-taskbar');
    if(!taskbar)return;
    const observer=new MutationObserver(()=>queueMicrotask(syncDemoPanelActions));
    observer.observe(taskbar,{subtree:true,attributes:true,attributeFilter:['hidden','disabled'],childList:true,characterData:true});
    demoPanelControlsCleanup=()=>observer.disconnect();
    syncDemoPanelActions();
}

function setDemoTutorialStep(step) {
    const controls = demoTutorialControlsForStep(step);
    demoTutorialStep = controls.step;
    const root = appRoot?.querySelector('.tryit-demo');
    if (root) root.dataset.demoTutorialStep = controls.step;
    const liveTagButton = appRoot?.querySelector('[data-tryit-open-live-tag]');
    if (liveTagButton) {
        liveTagButton.hidden = !controls.showOpenPlantLiveTag;
        if (!controls.showOpenPlantLiveTag) liveTagButton.onclick = null;
    }
    const footer = appRoot?.querySelector('.tryit-demo-footer');
    if (footer) footer.hidden = !controls.showPersistentControls;
    queueMicrotask(syncDemoPanelActions);
    return controls;
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
    if(nextStage==='note' && markers.some(record=>record.demoType==='note')){showSpatialGardenSummary();return;}
    const messages = {
        plant2: ['A living Plant Profile', 'The first orb now carries a hub of information in real space. Continue, then let’s try Moringa.'],
        note: ['Add one observation', 'Both plants now carry their own knowledge. Add a Note beside them to remember what you saw in this place.']
    };
    const [title, text] = messages[nextStage] || ['Continue the journey', 'Move to the next tutorial step.'];
    showGuidedChoice(`<h2>${title}</h2><p>${text}</p><button type="button" data-demo-choice="continue">Continue</button>`, choice => {
        if (choice === 'continue') armDemoPlacement(nextStage,{explained:nextStage==='note'});
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
        if (record.tutorialStage === 'plant2') showDemoAction('note');
        else armDemoPlacement('plant2');
    }, 320);
}

function openDemoVirtualTag(record) {
    openDemoKnowledge(record);
}

function advancePastVirtualTag(record) {
    if (!record) return;
    setDemoTutorialStep(DEMO_TUTORIAL_STEPS.PLACEMENT);
    record.demoExpanded = false;
    refreshDemoRecord(record);
    if (record.tutorialStage === 'plant2') showDemoAction('note');
    else armDemoPlacement('plant2');
}

function inviteVirtualTag(record) {
    showGuidedChoice('<h2>Live Tags</h2><p>This Plant Profile also has a full, view-only page in Web Mode. You will be able to place a real tag on your plant to open the plant profile.</p>', () => {}, {
        persistent: true,
        tutorialStep: DEMO_TUTORIAL_STEPS.LIVE_TAG
    });
    setDemoTutorialStep(DEMO_TUTORIAL_STEPS.LIVE_TAG);
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    if (continueButton) {
        continueButton.textContent = demoLocalizedText('Continue');
        continueButton.hidden = false;
        continueButton.onclick = () => {
            suppressSessionSelectUntil = performance.now() + 700;
            advancePastVirtualTag(record);
        };
    }
    const liveTagButton = appRoot?.querySelector('[data-tryit-open-live-tag]');
    if (!liveTagButton) return;
    liveTagButton.onclick = () => {
        openDemoVirtualTag(record);
    };
}

function continueAfterDemoPim(record) {
    if (!record || record.demoProfileInteracted) return false;
    record.demoProfileInteracted = true;
    if (record.tutorialStage === 'plant2') showDemoAction('note');
    else if (record.tutorialStage === 'plant') inviteVirtualTag(record);
    return true;
}

function demoOrbKnowledge(record) {
    const profile=record.demoKnowledgeProfile || (record.demoPlantPreset==='moringa' ? MORINGA_PROFILE : PIGEON_PEA_PROFILE_FOR_ORB);
    return resolveOrbKnowledge(profile,{expanded:record.demoExpanded});
}
const PIGEON_PEA_PROFILE_FOR_ORB={pim_document:PIGEON_PEA_PIM};
function demoTotemCards(record) {
    const content=demoContentFor(record);
    return totemKnowledgeCards({title:record.name || content?.title,introduction:record.description,
        bubbles:content?.bubbles || [],
        plants:markers.filter(item=>item.demoType==='plant').map(item=>({id:item.id,name:item.name,knowledge:demoOrbKnowledge(item)})),
        notes:markers.filter(item=>item.demoType==='note').map(item=>({id:item.id,title:item.name,body:(demoContentFor(item)?.lines || []).join(' · ')}))
    });
}
function activateDemoTotemCard(hit) {
    if(!hit)return false;
    hit.record.totemSelectedCard=hit.detail || hit.record.totemSelectedCard===hit.card.id ? '' : hit.card.id;
    updateSimulatedMarkers();return true;
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
    setDemoTutorialStep(hideBoard ? DEMO_TUTORIAL_STEPS.HIDDEN : DEMO_TUTORIAL_STEPS.GUIDED);
    introBoardVisible = !hideBoard;
}

function activateImmersiveDemoControl() {
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    if (continueButton && !continueButton.hidden && !continueButton.disabled) {
        if(arWelcomeShowcaseActive){
            if(arWelcomeIntroPending && !welcomeSequenceCanContinue())return false;
            // DOM-overlay buttons handle their own clicks. Controller-only AR
            // must hit the drawn Continue control instead of accepting any tap.
            if(domOverlayEnabled || !introWorldAnchor || !welcomeSurfaceHit(introLocalPosition(introWorldAnchor,[0,-.16,-2.8]),1.85,.78,900,220))return false;
        }
        continueButton.click();
        return true;
    }
    const choiceButton = appRoot?.querySelector('[data-tryit-guided-choice]:not([hidden]) [data-demo-choice]:not([hidden])');
    if (choiceButton) {
        choiceButton.click();
        return true;
    }
    const liveTagButton = appRoot?.querySelector('[data-tryit-open-live-tag]:not([hidden])');
    if (liveTagButton) {
        liveTagButton.click();
        return true;
    }
    // Never let a controller select finish narration or steal a marker grab.
    // The board continues typing naturally; only an exposed action button
    // advances the tutorial.
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
    useSharedWelcomeBoard(false);
    const panel = appRoot?.querySelector('[data-tryit-guided-choice]');
    if (!panel) return;
    setDemoTutorialStep(options.tutorialStep || DEMO_TUTORIAL_STEPS.GUIDED);
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
    if (options.persistent) panel.classList.add('is-persistent-demo-board');
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
    // Persistent boards sit alongside the live PIM. Their action must be
    // available immediately so a long narration cannot make the demo appear
    // stalled after the mesh opens.
    let typing = Boolean(paragraph && fullText && !options.persistent);
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
        clearTimeout(boardTypingWatchdogTimer);
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
    skipDemoNarration = finishTyping;
    if (typing) {
        paragraph.textContent = '';
        panel.classList.add('is-typing');
        boardTypingTimer = setTimeout(typeNextCharacter, 180);
    } else {
        finishTyping();
    }
    if (typing) {
        boardTypingWatchdogTimer = setTimeout(
            finishTyping,
            Math.max(DEMO_BOARD_TYPING_SAFETY_MS, 1200 + fullText.length * 60)
        );
    }
    // The board is display-only while it types. Clicking it must not snap the
    // remaining copy into place or consume a marker gesture.
    panel.onclick = null;
    setGuide(`${introBoardTitle}. ${fullText}`);
}

function showIntroBoard(title, body, buttonLabel, onContinue, options = {}) {
    useSharedWelcomeBoard(true);
    setDemoTutorialStep(options.tutorialStep || DEMO_TUTORIAL_STEPS.GUIDED);
    const localizedTitle = demoLocalizedText(title);
    const paragraphs = (Array.isArray(body) ? body : [body])
        .map(value => demoLocalizedText(String(value || '').trim()))
        .filter(Boolean);
    const bodyText = paragraphs.join('\n\n');
    introSceneActive = true;
    introBoardStep = options.stepLabel || '';
    introBoardTitle = localizedTitle;
    introBoardBody = bodyText;
    introBoardVisibleBody = '';
    introBoardTextureDirty = true;
    clearTimeout(boardTypingTimer);
    clearTimeout(boardTypingWatchdogTimer);
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
        clearTimeout(boardTypingWatchdogTimer);
        introBoardVisibleBody = bodyText;
        introBoardTextureDirty = true;
        paintBoardParagraphs(bodyText);
        board?.classList.add('is-copy-ready');
        board?.classList.remove('is-typing');
        typing = false;
        if (continueButton && buttonLabel) {continueButton.hidden = false;syncDemoPanelActions();}
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
    skipDemoNarration = finishTyping;
    if (board) {
        board.classList.add('is-typing');
        board.classList.remove('is-copy-ready');
        board.innerHTML = `<small>${demoIntroLabel()}</small><h2>${localizedTitle}</h2><div class="tryit-board-text-window">${paragraphs.map(() => '<p></p>').join('')}</div>`;
        const firstArrival = prepareTutorialBoard(board);
        // Keep the large instruction surface visible without blocking the orb
        // underneath. The fixed Continue button remains interactive.
        board.classList.add('is-persistent-demo-board');
        if (firstArrival) {
            introSceneStartedAt = performance.now();
            typingStartDelay = 1800;
        }
    }
    finalActions?.setAttribute('hidden', '');
    if (continueButton && buttonLabel) {
        continueButton.textContent = demoLocalizedText(buttonLabel);
        // The next step is a choice, not a typing-speed gate. The narration
        // continues while the Control panel already offers a real Continue.
        continueButton.hidden = false;
        continueButton.disabled = false;
        continueButton.onclick = () => {
            suppressSessionSelectUntil = performance.now() + 700;
            onContinue();
        };
    } else if (continueButton) {
        continueButton.hidden = true;
        continueButton.onclick = null;
    }
    syncDemoPanelActions();
    boardTypingTimer = setTimeout(typeNextCharacter, typingStartDelay);
    boardTypingWatchdogTimer = setTimeout(
        finishTyping,
        Math.max(DEMO_BOARD_TYPING_SAFETY_MS, typingStartDelay + bodyText.length * 60)
    );
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
    setDemoTutorialStep(DEMO_TUTORIAL_STEPS.PLACEMENT);
}

function showPersistentPimPrompt(record) {
    useSharedWelcomeBoard(false);
    setDemoTutorialStep(DEMO_TUTORIAL_STEPS.PIM);
    const panel = appRoot?.querySelector('[data-tryit-guided-choice]');
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    if (!panel || !continueButton) return;
    if (record?.demoProfileInteracted) {
        setGuide(`${record.name || 'Plant'} Plant Information Mesh is ready. Continue with the next demo step.`);
        return;
    }
    const plantName = record?.name || 'Plant';
    const title = demoLocalizedText('Plant Information Mesh');
    const body = demoLocalizedText(`The ${plantName} orb is now open. Select a cell to expand its connected knowledge. Press Continue after you have explored the Plant Information Mesh.`);
    panel.innerHTML = `<small>${demoIntroLabel()}</small><h2>${title}</h2><div class="tryit-board-text-window"><p>${body}</p></div>`;
    panel.hidden = false;
    panel.classList.add('is-welcome-board', 'is-copy-ready', 'is-persistent-demo-board');
    panel.classList.remove('is-entering', 'is-typing', 'is-leaving');
    panel.onclick = null;
    introSceneActive = true;
    introBoardTitle = title;
    introBoardBody = body;
    introBoardVisibleBody = body;
    introBoardTextureDirty = true;
    introBoardVisible = true;
    continueButton.textContent = demoLocalizedText('Continue');
    continueButton.onclick = () => {
        suppressSessionSelectUntil = performance.now() + 700;
        continueButton.hidden = true;
        continueAfterDemoPim(record);
    };
    continueButton.hidden = false;
    skipDemoNarration = () => {
        continueButton.click();
    };
    setGuide(`${plantName} profile opened. Select cells to explore the Plant Information Mesh.`);
}

function useSharedWelcomeBoard(visible) {
    if(!arWelcomeShowcaseActive)return;
    arWelcomeSharedBoard=visible;introBoardTextureDirty=true;
    // Simulated preview has a CSS-sized DOM card so copy remains readable on
    // narrow screens. Immersive sessions keep the accessible DOM copy hidden
    // while the anchored canvas supplies the spatial surface.
    appRoot?.querySelector('[data-tryit-guided-choice]')?.classList.toggle('is-live-welcome-copy',visible && !simulatedMode);
}

function welcomeFrames() {
    if(!limMeshVisible)return [];
    return welcomeExperienceFrames(arWelcomeClock.elapsed,window.matchMedia('(prefers-reduced-motion: reduce)').matches,arWelcomeClusters,limHiddenCells,{visionActivated:arWelcomeVisionActivated,visionActivatedAt:arWelcomeVisionActivatedAt,expandedLimIds:[...limExpandedCells],expandedAt:Object.fromEntries(limExpandedAt)});
}
const welcomeSequenceCanContinue=()=>welcomeCanContinue(arWelcomeClock.elapsed,arWelcomeVisionActivated?arWelcomeVisionActivatedAt:NaN);

let selectedLimCell='';
function limNodeByKey(key) { return welcomeFrames().flatMap(frame=>frame.nodes).find(node=>node.key===key) || null; }
const understandPlacePathway=()=>LIM_PATHWAYS.find(pathway=>pathway.id==='lim-path-understand-place');
const currentPathwayCellId=()=>understandPlacePathway()?.orderedCellIds[limPathwayState.currentStepIndex] || '';
const currentPathwayNode=()=>welcomeFrames().flatMap(frame=>frame.nodes).find(node=>(node.limId || node.label)===currentPathwayCellId()) || null;
function persistLimPathway(){saveLimPathwayState(window.localStorage,limPathwayState);}
function updateLimPathway(next){limPathwayState=next;persistLimPathway();introBoardTextureDirty=true;}
function pathwayContext(selectedId=''){
    const pathway=understandPlacePathway();if(!pathway)return null;
    const stepId=currentPathwayCellId(),step=LIM_CELL_BY_ID[stepId],number=limPathwayState.currentStepIndex+1;
    if(limPathwayState.status==='completed')return {mode:'completed',title:pathway.title,progress:'Path completed',explanation:`You’ve completed this learning path. ${limPathwayState.observationNoteStatus==='placed'?'Your observation Note was placed.':'Continue exploring, revisit a topic or record something you noticed about this place.'}`,actions:[{action:'PathContinue',label:'Explore freely',primary:true},{action:'PathRestart',label:'Restart path'},{action:'PathClose',label:'Close LIM'}]};
    if(limPathwayState.status==='paused')return {mode:'paused',title:pathway.title,progress:`Step ${number} of ${pathway.orderedCellIds.length}`,explanation:'Your place is saved. Resume when you choose, restart this path, or continue exploring freely.',actions:[{action:'PathResume',label:'Resume',primary:true},{action:'PathRestart',label:'Restart'},{action:'PathExplore',label:'Explore freely'}]};
    if(limPathwayState.status!=='active')return {mode:'landing',title:'Learning Paths',preview:true,progress:'Optional guided exploration',explanation:'Follow a gentle sequence of connected topics, or continue exploring freely. More paths are being developed.',actions:[{action:'PathExplore',label:'Explore freely',primary:true},{action:'PathPreview',label:'Try Understand This Place'}]};
    if(selectedId && selectedId!==stepId)return {mode:'off-path',title:pathway.title,progress:`Step ${number} of ${pathway.orderedCellIds.length}`,explanation:'You’re exploring beyond the path.',actions:[{action:'PathReturn',label:'Return to path',primary:true},{action:'PathLeave',label:'Leave path'}]};
    const final=number===pathway.orderedCellIds.length && limPathwayState.completedStepIds.includes(stepId);
    if(final)return {mode:'final',title:pathway.title,progress:`Step ${number} of ${pathway.orderedCellIds.length}`,explanation:'Take a moment to record something you noticed about this place. Your observation can become a Note that you return to later.',actions:[{action:'PathBack',label:'Back'},{action:'PathPlaceNote',label:'Place observation Note',primary:true},{action:'PathComplete',label:'Complete without Note'}]};
    return {mode:'active',title:pathway.title,progress:`Step ${number} of ${pathway.orderedCellIds.length} · ${step?.title || 'Topic'}`,explanation:pathway.suggestedBranches[number-1],actions:[{action:'PathBack',label:'Back',disabled:number===1},{action:'PathNext',label:'Next',primary:true,disabled:!limPathwayState.completedStepIds.includes(stepId)},{action:'PathLeave',label:'Leave path'}]};
}
function showLearningPathLanding(){infoPanel?.setPathwayContext(pathwayContext());}
function selectCurrentPathwayCell(){const node=currentPathwayNode();if(node)activateLimCell(node.key);}
function completeLearningPath(noteStatus){updateLimPathway(completeLimPathway(limPathwayState,noteStatus));infoPanel?.setPathwayContext(pathwayContext());}
function handlePathwayAction(action){
    const pathway=understandPlacePathway();if(!pathway)return;
    if(action==='PathExplore'){if(limPathwayState.status==='active')updateLimPathway(pauseLimPathway(limPathwayState));infoPanel?.setPathwayContext(null);return;}
    if(action==='PathPreview'){infoPanel?.setPathwayContext({mode:'introduction',title:pathway.title,progress:'Optional guided exploration',explanation:'Understand This Place offers an optional route through seven connected LIM topics. You can leave the path, explore any other cell and return whenever you choose.',actions:[{action:'PathBegin',label:'Begin path',primary:true},{action:'PathExplore',label:'Explore freely'}]});return;}
    if(action==='PathBegin' || action==='PathRestart'){updateLimPathway(startLimPathway(pathway));selectCurrentPathwayCell();return;}
    if(action==='PathResume'){updateLimPathway(resumeLimPathway(limPathwayState));selectCurrentPathwayCell();return;}
    if(action==='PathLeave'){updateLimPathway(pauseLimPathway(limPathwayState));infoPanel?.setPathwayContext(pathwayContext());return;}
    if(action==='PathReturn'){selectCurrentPathwayCell();return;}
    if(action==='PathBack'){updateLimPathway(backLimPathway(limPathwayState));selectCurrentPathwayCell();return;}
    if(action==='PathNext'){const next=advanceLimPathway(limPathwayState,pathway);if(next!==limPathwayState){updateLimPathway(next);selectCurrentPathwayCell();}return;}
    if(action==='PathComplete'){completeLearningPath('skipped');return;}
    if(action==='PathPlaceNote'){
        if(markers.some(record=>record.demoType==='note')){completeLearningPath('placed');return;}
        pathwayNotePlacementPending=true;
        infoPanel?.setPathwayContext({mode:'note-placement',title:pathway.title,progress:'Final observation',explanation:'Aim beside the place and press the circle once. You can cancel and return to the path.',actions:[{action:'PathCancelNote',label:'Cancel Note'}]});
        armDemoPlacement('note',{explained:true});return;
    }
    if(action==='PathCancelNote'){
        pathwayNotePlacementPending=false;placementReady=false;clearTimeout(aimRevealTimer);
        const pointer=appRoot?.querySelector('[data-tryit-place]');pointer?.setAttribute('hidden','');pointer?.classList.remove('is-revealing','is-ready','is-pressed');
        infoPanel?.setPathwayContext(pathwayContext(currentPathwayCellId()));return;
    }
    if(action==='PathContinue'){infoPanel?.setPathwayContext(null);return;}
    if(action==='PathClose')returnToWelcome();
}
function clearLimSelection() {
    if(!selectedLimCell)return;
    selectedLimCell='';introBoardTextureDirty=true;
}
const LEARNING_MODULES=Object.freeze({
    'food-forest':Object.freeze({title:'Create a food forest',intro:'A short demonstration of how a learning package can guide exploration without taking over the main demo.',steps:Object.freeze([
        Object.freeze({title:'Read the place',cellId:'lim-intro-analysis-landscape',message:'Begin with the landscape. Notice sun, slope, water, access and what already grows here.'}),
        Object.freeze({title:'Choose functions',cellId:'lim-intro-food-function',message:'Decide which functions matter: food, shade, habitat, shelter, access or soil care.'}),
        Object.freeze({title:'Design for change',cellId:'lim-intro-food-succession',message:'Arrange the first stages with succession in mind. Leave room for plants and relationships to change.'})
    ])}),
    'native-forest':Object.freeze({title:'Identify a native forest',intro:'A brief field-learning package for reading a forest through place, plants and relationships.',steps:Object.freeze([
        Object.freeze({title:'Read the landscape',cellId:'lim-intro-analysis-landscape',message:'Start with landform, water, exposure and the broad structure of the forest.'}),
        Object.freeze({title:'Notice plant identity',cellId:'lim-intro-literacy-plants',message:'Observe plant form, leaves, bark and growth habit. Keep uncertain identification marked as uncertain.'}),
        Object.freeze({title:'Follow relationships',cellId:'lim-intro-literacy-guilds',message:'Look for habitat, pollinators, fungi, litter and other connections before describing the forest.'})
    ])})
});
function learningModuleBoard(module=learningModule,stepIndex=learningModuleStep){
    if(!module)return {title:'Learning modules',body:arWelcomeIntroPending?'Complete the opening introduction to unlock these optional packages.':'Choose a brief demonstration package. It runs separately from the main tutorial.',actions:[{id:'food-forest',label:'Create a food forest',disabled:arWelcomeIntroPending},{id:'native-forest',label:'Identify a native forest',disabled:arWelcomeIntroPending}]};
    const step=module.steps[stepIndex],complete=stepIndex>=module.steps.length;
    return complete
        ? {title:module.title,body:'Package complete. This short cycle connected a goal, a few learning cells and guidance in the Control panel.',actions:[{id:'end',label:'End learning',primary:true}]}
        : {title:module.title,body:`Micro step ${stepIndex+1} of ${module.steps.length} · ${step.title}\n\n${step.message}\n\nSelect the highlighted ${limLearningContent(step.cellId).title} cell to continue.`,actions:[{id:'end',label:'End learning'}]};
}
function paintLearningModuleBoard(){
    if(!learningModule)return;
    clearTimeout(boardTypingTimer);clearTimeout(boardTypingWatchdogTimer);skipDemoNarration=null;
    const board=learningModuleBoard(),step=learningModule.steps[learningModuleStep];
    introBoardStep=`Learning module · ${learningModuleStep>=learningModule.steps.length?'Complete':`Micro step ${learningModuleStep+1} of ${learningModule.steps.length}`}`;
    introBoardTitle=board.title;introBoardBody=board.body;introBoardVisibleBody=board.body;introBoardVisible=true;arWelcomeSharedBoard=true;introBoardTextureDirty=true;
    const panel=appRoot?.querySelector('[data-tryit-guided-choice]');if(panel){panel.innerHTML=`<small>${introBoardStep}</small><h2>${board.title}</h2><div class="tryit-board-text-window"><p>${board.body.replace(/\n\n/g,'</p><p>')}</p></div>`;prepareTutorialBoard(panel);panel.classList.remove('is-typing');panel.classList.add('is-copy-ready','is-persistent-demo-board');}
    infoPanel?.setLearningModules(board,{open:true});
    selectedLimCell='';
    if(step){const node=welcomeFrames().flatMap(frame=>frame.nodes).find(item=>item.limId===step.cellId);if(node)selectedLimCell=node.key;}
    paintWelcomeLayer(performance.now());
}
function endLearningModule(){
    learningModule=null;learningModuleStep=0;selectedLimCell='';infoPanel?.setLearningModules(null);introBoardStep='';
    if(demoOrientationStep>=0)runArWelcomeTutorial(demoOrientationStep);else{introBoardVisible=false;arWelcomeSharedBoard=false;introBoardTextureDirty=true;}
}
function handleLearningModuleAction(action){
    if(action==='end'){endLearningModule();return;}
    if(arWelcomeIntroPending)return;
    const module=LEARNING_MODULES[action];if(!module)return;
    infoPanel?.setPathwayContext(null);learningModule=module;learningModuleStep=0;paintLearningModuleBoard();
}
function activateLimCell(key) {
    const node=limNodeByKey(key);if(!node)return false;
    selectedLimCell=key;
    const content=limLearningContent(node.limId || node.label);
    // A selected cell becomes a doorway to its own descendants. Other
    // archetypes remain quiet until the visitor chooses to open them.
    if(!limExpandedCells.has(content.id))limExpandedAt.set(content.id,arWelcomeClock.elapsed);
    limExpandedCells.add(content.id);
    if(content.id==='lim-intro-vision' && !arWelcomeVisionActivated){
        arWelcomeVisionActivated=true;arWelcomeVisionActivatedAt=arWelcomeClock.elapsed;
        appRoot?.querySelector('.tryit-demo')?.setAttribute('data-welcome-vision','true');
        setGuide('Vision selected. Place, Life, Forest and Purpose are now unfolding around the welcome panel.');
    }
    infoPanel?.showLearning({...content,mesh:'lim'});
    if(learningModule){
        const step=learningModule.steps[learningModuleStep];
        if(step?.cellId===content.id){learningModuleStep+=1;paintLearningModuleBoard();}
        else infoPanel?.setLearningModules(learningModuleBoard());
        introBoardTextureDirty=true;suppressSessionSelectUntil=performance.now()+700;return true;
    }
    const pathway=understandPlacePathway();
    if(limPathwayState.status==='active' && pathway){
        const next=visitLimPathwayCell(limPathwayState,pathway,content.id);
        if(next!==limPathwayState)updateLimPathway(next);
        infoPanel?.setPathwayContext(pathwayContext(content.id));
    }
    limDiagnostic('selected-cell',{cellId:content.id,title:content.title,primaryFaceId:content.primaryFaceId,accent:content.accent});
    limDiagnostic('companion-panel-position',infoPanel?.getPosition?.() || {status:'not-yet-positioned'});
    introBoardTextureDirty=true;suppressSessionSelectUntil=performance.now()+700;
    return true;
}
function currentLimPointerCell() {
    if(!arWelcomeShowcaseActive || !limMeshVisible || !introWorldAnchor)return null;
    const hit=welcomeSurfaceHit(introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition),AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080);
    return hit && welcomeCellAtPoint(welcomeFrames(),hit.pixelX,hit.pixelY);
}
function tickLimActivation(timestamp) {
    if(!limActivation?.active)return;
    const key=limInputSource ? currentLimPointerCell()?.key : limPointerKey;
    limActivation.tick(key,timestamp);
}
function startLimActivationFrame() {
    if(limActivationFrame || !limActivation?.active)return;
    const loop=timestamp=>{
        limActivationFrame=0;
        if(!limActivation?.active)return;
        tickLimActivation(timestamp);paintWelcomeLayer(timestamp);
        if(limActivation.active)limActivationFrame=limRequestFrame(loop);
    };
    limActivationFrame=limRequestFrame(loop);
}
function toggleLimCell(key) { return activateLimCell(key); }

function bindLimCellInteractions() {
    if(!arWelcomeLayer || !limActivation)return;
    const cleanups=[];
    const cancel=reason=>{limActivation.cancel(reason);limPointerKey='';limPointerId=null;paintWelcomeLayer(performance.now());};
    arWelcomeLayer.querySelectorAll('[data-welcome-cell]').forEach(button=>{
        const key=button.dataset.welcomeCell;
        const pointerDown=event=>{
            if(event.pointerType==='mouse' && event.button!==0)return;
            event.preventDefault();event.stopPropagation();limPointerKey=key;limPointerId=event.pointerId;
            limDiagnostic('pointer',{type:event.pointerType || 'unknown',cellId:key});
            button.setPointerCapture?.(event.pointerId);limActivation.start(key,performance.now(),'pointer');startLimActivationFrame();paintWelcomeLayer(performance.now());
        };
        const pointerMove=event=>{
            if(!limActivation.active || limPointerId!==event.pointerId)return;
            const rect=button.getBoundingClientRect();
            if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)cancel('pointer-left');
        };
        const pointerUp=event=>{
            if(limPointerId!==null && event.pointerId!==limPointerId)return;
            event.preventDefault();event.stopPropagation();limActivation.end(key,performance.now());limPointerKey='';limPointerId=null;paintWelcomeLayer(performance.now());
        };
        const pointerCancel=event=>{if(limPointerId===null || event.pointerId===limPointerId)cancel('pointer-cancelled');};
        const pointerLeave=event=>{if(limPointerId===event.pointerId && limActivation.active)cancel('pointer-left');};
        const keyDown=event=>{
            if(!['Enter',' '].includes(event.key) || event.repeat)return;
            event.preventDefault();event.stopPropagation();limPointerKey=key;limActivation.activateNow(key,performance.now(),'keyboard');paintWelcomeLayer(performance.now());
        };
        const keyUp=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();}};
        const click=event=>{
            event.preventDefault();event.stopPropagation();
            if(limActivation.consumeSyntheticClick(key,performance.now()))return;
            limActivation.activateNow(key,performance.now(),event.detail===0?'assistive-click':'click');
        };
        const blur=()=>{if(limPointerId!==null && limPointerKey===key)cancel('blur');};
        for(const [type,handler] of [['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',pointerCancel],['pointerleave',pointerLeave],['keydown',keyDown],['keyup',keyUp],['click',click],['blur',blur]]){button.addEventListener(type,handler);cleanups.push(()=>button.removeEventListener(type,handler));}
    });
    const visibility=()=>{if(document.visibilityState!=='visible')cancel('hidden');};
    const windowBlur=()=>cancel('window-blur');
    document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',windowBlur);
    cleanups.push(()=>document.removeEventListener('visibilitychange',visibility),()=>window.removeEventListener('blur',windowBlur));
    limInteractionCleanup=()=>{cleanups.splice(0).forEach(remove=>remove());limActivation?.cancel('unmount');limCancelFrame(limActivationFrame);limActivationFrame=0;limPointerKey='';limPointerId=null;};
}

function bindLimSessionInteractions(arSession) {
    if(!arSession || !limActivation)return;
    const start=event=>{
        if(!arWelcomeShowcaseActive || event.inputSource?.targetRayMode!=='tracked-pointer')return;
        const node=currentLimPointerCell();if(!node)return;
        event.preventDefault?.();event.stopImmediatePropagation?.();limInputSource=event.inputSource;limActivation.start(node.key,performance.now(),'xr');startLimActivationFrame();
    };
    const end=event=>{
        if(event.inputSource!==limInputSource)return;
        event.preventDefault?.();event.stopImmediatePropagation?.();limActivation.end(limActivation.activeKey,performance.now());limInputSource=null;limActivationSessionSuppressUntil=performance.now()+450;
    };
    const select=event=>{
        if(event.inputSource?.targetRayMode==='screen' && arWelcomeShowcaseActive){
            const node=currentLimPointerCell();
            if(node){event.preventDefault?.();event.stopImmediatePropagation?.();activateLimCell(node.key);limActivationSessionSuppressUntil=performance.now()+450;return;}
        }
        if(event.inputSource===limInputSource || performance.now()<limActivationSessionSuppressUntil || (arWelcomeShowcaseActive && currentLimPointerCell())){event.stopImmediatePropagation?.();}
    };
    const visibility=()=>{if(arSession.visibilityState!=='visible')limActivation.cancel('session-hidden');};
    arSession.addEventListener('selectstart',start,true);arSession.addEventListener('selectend',end,true);arSession.addEventListener('select',select,true);arSession.addEventListener('visibilitychange',visibility);
    limSessionCleanup=()=>{arSession.removeEventListener('selectstart',start,true);arSession.removeEventListener('selectend',end,true);arSession.removeEventListener('select',select,true);arSession.removeEventListener('visibilitychange',visibility);limInputSource=null;};
}

function paintWelcomeLayer(now) {
    if(!arWelcomeCanvas)return;
    arWelcomeClock.tick(now,!document.hidden);
    const activeKey=limActivation?.activeKey||'';
    const activeProgress=limActivation?.progress||0;
    const frames=drawArWelcomeShowcase(arWelcomeCanvas.getContext('2d'),arWelcomeClock.elapsed,
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,arWelcomeClusters,{
            hidden:limHiddenCells,drawCells:limMeshVisible,drawPanel:arWelcomeSharedBoard && introBoardVisible && !simulatedMode,
            drawContent:drawIntroNoteContent,progression:{visionActivated:arWelcomeVisionActivated,visionActivatedAt:arWelcomeVisionActivatedAt,expandedLimIds:[...limExpandedCells],expandedAt:Object.fromEntries(limExpandedAt)},
            drawCellLabels:!(simulatedMode && window.innerWidth<=620),activeKey,activeProgress,selectedKey:selectedLimCell,pathwayKey:['active','paused'].includes(limPathwayState.status)?currentPathwayNode()?.key || '':''
        });
    for(const frame of frames)for(const node of frame.nodes){
        const button=arWelcomeLayer.querySelector(`[data-welcome-cell="${node.key}"]`);
        if(button){
            const pathwayCurrent=(node.limId || node.label)===currentPathwayCellId() && ['active','paused'].includes(limPathwayState.status);
            button.hidden=!limMeshVisible || (node.opacity<=.5 && !pathwayCurrent);
            const progress=activeKey===node.key?activeProgress:selectedLimCell===node.key?1:0;
            button.style.setProperty('--lim-accent',node.accent||'#719b62');
            button.style.setProperty('--lim-progress',String(progress));
            button.classList.toggle('is-lim-holding',progress>0 && progress<1);
            button.classList.toggle('is-lim-selected',selectedLimCell===node.key);
            button.classList.toggle('is-lim-pathway-current',pathwayCurrent);
            button.setAttribute('aria-pressed',String(selectedLimCell===node.key));
            button.setAttribute('aria-valuenow',String(Math.round(progress*100)));
            button.dataset.welcomeHollow=node.hollow?'true':'false';
            button.setAttribute('aria-label',`${node.hollow?'Reopen and explore':'Explore'} ${node.label} cell`);
        }
    }
}

function showArWelcomeShowcase() {
    selectedLimCell='';
    introBoardStep='';
    const panel=appRoot?.querySelector('[data-tryit-guided-choice]');
    const button=appRoot?.querySelector('[data-tryit-intro-continue]');
    const skip=appRoot?.querySelector('[data-tryit-skip]');
    if(!panel || !button)return;
    arWelcomeClusters=createArWelcomeClusters();limHiddenCells=new Set();limExpandedCells=new Set();limExpandedAt=new Map();limMeshVisible=true;arWelcomeClock=createWelcomePresentationClock();arWelcomeVisionActivated=false;arWelcomeVisionActivatedAt=NaN;
    appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-welcome-vision');
    limPathwayState=loadLimPathwayState(window.localStorage,LIM_PATHWAYS,LIM_CELL_BY_ID);
    if(limPathwayState.status==='active')updateLimPathway(pauseLimPathway(limPathwayState));
    const reservedCells=welcomeExperienceFrames(64000,false,arWelcomeClusters).flatMap(frame=>frame.nodes);
    limDiagnostic('rendered-cells',{count:reservedCells.length,uniqueIds:new Set(reservedCells.map(node=>node.limId || node.key)).size,reservedCount:LIM_ALL_CELLS.length});
    limInteractionCleanup();limSessionCleanup();limActivationSessionSuppressUntil=0;
    limActivation=createLimActivationController({
        onProgress:()=>{introBoardTextureDirty=true;},
        onStart:()=>{introBoardTextureDirty=true;},
        onCancel:()=>{introBoardTextureDirty=true;},
        onComplete:key=>{activateLimCell(key);introBoardTextureDirty=true;}
    });
    // The XR session is created before the showcase controller. Bind the
    // session interactions here, once the controller exists, so tracked
    // pointer holds can reach the companion panel.
    bindLimSessionInteractions(session);
    arWelcomeShowcaseActive=true;arWelcomeIntroPending=true;arWelcomeSharedBoard=true;
    syncDemoPanelActions();
    introSceneActive=true;introBoardVisible=true;introKnowledgeVisible=false;introBoardHasEntered=true;
    arWelcomeStartedAt=performance.now();introSceneStartedAt=arWelcomeStartedAt;introBoardTextureDirty=true;
    introBoardStep='A LIVING INTRODUCTION';
    introBoardTitle='Welcome to NourishlandXR';
    introBoardBody='NourishlandXR is a learning platform and spatial information hub connecting plants, knowledge and place.\n\nExplore at your own pace. Your Control panel holds guidance and details. Press Continue there when you are ready.';
    introBoardVisibleBody=introBoardBody;
    infoPanel?.setLearningModules(null);
    infoPanel?.showLearning({id:'welcome-control-guide',title:'Your Control panel',body:'Read guidance and selected cell details here. Press Continue below to begin. Vision is an optional doorway into four ways of seeing a place.',accent:'#dcef95',mesh:'lim',editable:false});
    panel.innerHTML=`<small>${introBoardStep}</small><h2>${introBoardTitle}</h2><div class="tryit-board-text-window">${introBoardBody.split('\n\n').map(paragraph=>`<p>${paragraph}</p>`).join('')}</div>`;
    prepareTutorialBoard(panel);
    panel.classList.add('is-copy-ready','is-persistent-demo-board');
    panel.classList.remove('is-live-welcome-copy','is-typing');
    const layer=document.createElement('div');layer.className='tryit-live-welcome';arWelcomeLayer=layer;
    layer.innerHTML='<canvas width="2500" height="2100" role="img" aria-label="NourishlandXR learning cells. Vision appears first; selecting it reveals four optional paths around the welcome panel."></canvas>';
    arWelcomeCanvas=layer.querySelector('canvas');
    // Native buttons provide touch, keyboard and screen-reader access to cells.
    for(const frame of welcomeExperienceFrames(64000,false,arWelcomeClusters))for(const node of frame.nodes){
        const cell=document.createElement('button');cell.type='button';cell.dataset.welcomeCell=node.key;cell.dataset.label=node.label;cell.textContent=node.label;
        cell.setAttribute('aria-label',node.accessibilityLabel || `Explore ${node.label} learning cell`);cell.setAttribute('aria-pressed','false');cell.setAttribute('aria-valuemin','0');cell.setAttribute('aria-valuemax','100');cell.setAttribute('aria-valuenow','0');cell.hidden=true;
        cell.style.cssText=`left:${node.x/25}%;top:${node.y/21}%;width:${node.baseRadius*2/25}%;height:${node.baseRadius*2/21}%;`;
        cell.addEventListener('beforexrselect',event=>event.preventDefault());
        layer.append(cell);
    }
    appRoot.querySelector('.tryit-stage').append(layer);
    bindLimCellInteractions();
    let last=-Infinity,lastState='';
    const frame=now=>{
        if(!arWelcomeShowcaseActive)return;
        const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const state=[introBoardTitle,introBoardVisibleBody,introBoardVisible,arWelcomeSharedBoard,arWelcomeIntroPending,arWelcomeVisionActivated,limHiddenCells.size,welcomeSequenceCanContinue()].join('|');
        if(simulatedMode && now-last>=50 && (!reduced || arWelcomeClock.elapsed<AR_WELCOME_SHOWCASE_DURATION || state!==lastState)){
            paintWelcomeLayer(now);introBoardTextureDirty=true;last=now;lastState=state;
        }
        // XRSession frames drive immersive textures; a hidden DOM canvas need
        // not render a second copy. Reduced motion repaints only changed copy.
        // The DOM preview and XR overlay both need the same reveal clock. Use
        // the safe frame fallback even when a host omits window rAF.
        if(simulatedMode && arWelcomeLayer)arWelcomeShowcaseFrame=limRequestFrame(frame);
    };
    frame(performance.now());
    button.textContent=demoLocalizedText('Continue');button.hidden=true;button.disabled=true;syncDemoPanelActions();
    if(skip)skip.hidden=true;
    const unlockWelcome=()=>{
        if(!arWelcomeShowcaseActive || !arWelcomeIntroPending)return;
        if(!welcomeSequenceCanContinue()){arWelcomeUnlockTimer=setTimeout(unlockWelcome,180);return;}
        button.disabled=false;button.hidden=false;
        syncDemoPanelActions();
        setGuide('Press Continue in the Control panel when ready. You may also select Vision to open four optional learning paths.');
    };
    arWelcomeUnlockTimer=setTimeout(unlockWelcome,180);
    button.onclick=()=>{
        if(!arWelcomeIntroPending || !welcomeSequenceCanContinue())return;
        arWelcomeIntroPending=false;introBoardTextureDirty=true;
        infoPanel?.setLearningModules(learningModuleBoard());
        if(skip)skip.hidden=false;
        suppressSessionSelectUntil=performance.now()+700;
        runArWelcomeTutorial();
    };
    // Only the explicit Continue action advances the opening animation.
    skipDemoNarration=()=>{};
    setGuide('Welcome to NourishlandXR. Continue is in the Control panel; Vision is available for optional exploration.');
}

// Use the same billboard geometry for ray hits and texture drawing.
function welcomeSurfaceHit(position,scaleX,scaleY,width=2500,height=2100) {
    if(!introWorldAnchor)return null;
    const matrix=billboardMatrix(position,scaleX,scaleY,introWorldAnchor);
    const origin=demoPointerWorldOrigin(),direction=demoPointerWorldRay();
    if(!origin || !direction)return null;
    return spatialDashboardRayHit({origin,direction},{center:position,
        right:{x:matrix[0]/scaleX,y:0,z:matrix[2]/scaleX},up:{x:0,y:1,z:0},
        normal:{x:matrix[8],y:0,z:matrix[10]},width:.4*scaleX,height:.16*scaleY},{width,height});
}

function selectWelcomeCell() {
    if(!arWelcomeShowcaseActive || !introWorldAnchor)return false;
    const hit=welcomeSurfaceHit(introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition),AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080);
    const cell=hit && welcomeCellAtPoint(welcomeFrames(),hit.pixelX,hit.pixelY);
    if(!cell)return false;
    limDiagnostic('hit-target',{cellId:cell.limId || cell.key,pixelX:hit?.pixelX ?? null,pixelY:hit?.pixelY ?? null});
    toggleLimCell(cell.key);return true;
}

const DEMO_ORIENTATION_STEPS = [
    {title:'Meet your Control panel',button:'Continue',paragraphs:[
        'The green panel introduces each part of the experience. Your Control panel stays beside you for guidance, selected details and useful actions.',
        'Try its Help or Settings tabs at any time. Use Continue below to move on when you are ready.'
    ]},
    {title:'Read a living place',button:'Continue',paragraphs:[
        'The Vision cell below is an invitation, not a required step. Select it and four paths gradually unfold: Place, Life, Forest and Purpose.',
        'Select any visible cell to read more in your Control panel. You can keep exploring while this introduction moves forward.'
    ]},
    {title:'Knowledge in the landscape',button:'Continue',paragraphs:[
        'NourishlandXR connects ideas to the places and plants they describe. A cell offers a quick doorway; the Control panel gives you the deeper explanation.',
        'Free exploration remains available at every point. The learning cells can stay open as you move ahead, or you can hide them. Guided learning modules are available separately when you choose them.'
    ]},
    {title:'Meet your first plant',button:'Place a plant orb',paragraphs:[
        'A plant orb connects knowledge to a plant in this place. Start with a Pigeon Pea and explore its relationships, cultivation and uses.',
        'Choose Place a plant orb. Aim at a comfortable location, then press to place it. You can hold the orb to reposition it.'
    ]}
];

function runArWelcomeTutorial(index=0) {
    demoOrientationStep=index;
    syncDemoPanelActions();
    infoPanel?.setGuided(index===1 || index===2);
    const step=DEMO_ORIENTATION_STEPS[index];
    showIntroBoard(step.title,step.paragraphs,step.button,()=>{
        suppressSessionSelectUntil=performance.now()+700;
        if(index<DEMO_ORIENTATION_STEPS.length-1){runArWelcomeTutorial(index+1);return;}
        demoOrientationStep=-1;syncDemoPanelActions();finishIntroBoard();clearTimeout(aimRevealTimer);armDemoPlacement('plant',{explained:true});
    },{tutorialStep:DEMO_TUTORIAL_STEPS.WELCOME,stepLabel:'Tutorial stage '+(index+1)+' of 4 · '+['Control panel','Explore','Place','Plant'][index]});
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
        record.demoExpandedNodeIds = [];
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
        moringa ? 'Your second plant' : 'Knowledge connected to this place',
        moringa
            ? 'This Moringa orb can carry its own Plant Profile as well and can be linked to other plants. Press the Moringa orb to explore its information tree.'
            : [
                'This orb keeps plant knowledge connected to a place. Open its honeycomb to explore topics and relationships, then read the detail in your Control panel.',
                'Our example is Pigeon Pea. Explore its food-forest role, cultivation and uses, and discover how individual topics connect.',
                'You can grab and hold the Pigeon Pea orb or any Plant marker to position it. Release it when you are ready.',
                'Press Continue after positioning. Press the orb to open or close its Plant Information Mesh.'
            ],
        'Continue',
        () => {
            suppressSessionSelectUntil = performance.now() + 700;
            finishIntroBoard();
            setGuide(`The ${plantName} orb is ready. Hold it to move it, or press it to open or close its Plant Information Mesh.`);
        }
    );
    // The sample plant is interactive while the large instruction board is
    // still visible, so the suggested grab can be tried immediately.
    completeConversion();
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
        demoTotemStyle: 'basic',
        demoLinkVisible: false,
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
    setGuide('This Totem is the home marker for the Food Forest Area. Add a second Totem to see how visitors move between Areas.');
    showSceneContinue('Add second Totem', createDemoSecondTotem);
}

function createDemoSecondTotem() {
    const first = [...markers].reverse().find(record => record.demoType === 'zone');
    const source = [...markers].reverse().find(record => record.demoType === 'note') || markers.at(-1);
    const sourcePosition = first?.position || source?.position || placementPosition() || { x: 0, y: 0, z: -1.4 };
    const sourceAnchor = first?.simulatedAnchor || source?.simulatedAnchor || { x: 50, y: 56 };
    const groundBaseY = first?.groundBaseY ?? demoGroundBaseY(hitMatrix, viewerMatrix, groundYEstimate);
    groundYEstimate = groundBaseY;
    const totem = {
        ...createMinimalMarkerDraft('area_checkpoint', {
            name: 'Kitchen Garden Totem',
            description: 'A second Area Totem linked to the Food Forest Area.'
        }),
        position: {
            x: sourcePosition.x - 1.15,
            y: groundBaseY + DEMO_TOTEM_HALF_HEIGHT_METRES,
            z: sourcePosition.z + .1
        },
        groundBaseY,
        type: 'area_checkpoint',
        demoType: 'zone',
        tutorialStage: 'totem2',
        demoTotemStyle: 'basic',
        demoLinkVisible: true,
        demoLinkDirection: 'left',
        demoLinkDestination: 'Food Forest Area',
        demoExpanded: true,
        demoInteractive: true,
        demoPanelOffset: { x: 0, y: 0 },
        simulatedAnchor: {
            x: Math.max(18, Math.min(38, sourceAnchor.x - 38)),
            y: Math.max(64, Math.min(80, sourceAnchor.y))
        },
        revealTitle: true,
        revealLines: 5,
        demoContent: DEMO_CONTENT.zoneTwo,
        texture: null
    };
    if (first) {
        first.demoLinkVisible = true;
        first.demoLinkDirection = 'right';
        first.demoLinkDestination = 'Kitchen Garden Area';
        first.demoLinkPartner = totem.id;
        first.demoContent = {
            ...first.demoContent,
            bubbles: [...(first.demoContent?.bubbles || []), 'LINKED TO KITCHEN GARDEN'].slice(0, 5)
        };
        totem.demoLinkPartner = first.id;
        if (first.texture) gl?.deleteTexture(first.texture);
        first.texture = createMarkerTexture(first);
    }
    totem.texture = createMarkerTexture(totem);
    markers.push(totem);
    updateSimulatedMarkers();
    setGuide('Each Totem keeps its own Area information. The link is a route between them; it does not merge their content.');
    showSceneContinue('Why link Areas?', showLinkedTotemsIntroduction);
}

function cycleDemoTotemStyle(record) {
    if (!record || record.demoType !== 'zone' || record.tutorialStage !== 'totem2') return false;
    const currentIndex = DEMO_TOTEM_STYLES.findIndex(style => style.id === (record.demoTotemStyle || 'basic'));
    const next = DEMO_TOTEM_STYLES[(currentIndex + 1 + DEMO_TOTEM_STYLES.length) % DEMO_TOTEM_STYLES.length];
    record.demoTotemStyle = next.id;
    record.demoTotemStyleCycles = (Number(record.demoTotemStyleCycles) || 0) + 1;
    refreshDemoRecord(record);
    setGuide(`Second Totem model: ${next.label}. Cycle again to compare all three Totem forms.`);
    return true;
}

function showLinkedTotemsIntroduction() {
    showIntroBoard(
        'Why link Areas?',
        [
            'Each Totem is the home marker for one Area. Its plants, Notes and local information remain attached to that Area.',
            'A link creates a visitor route between Areas. Here it connects the Food Forest with the Kitchen Garden without mixing their information.',
            'In a project, the destination sign helps visitors understand where the route leads before they move to the next Area.'
        ],
        'Continue',
        showDemoClosingMessage
    );
}

function showTotemIntroduction() {
    showIntroBoard(
        'Area Totems',
        [
            'A Totem is an Area’s home marker. It gathers the plants, Notes and local knowledge that belong to that part of a project.',
            'We will place one for the Food Forest and one for the Kitchen Garden, then show the route between them.'
        ],
        'Place first Totem',
        () => {
            finishIntroBoard();
            createDemoTotemExample();
        }
    );
}

function showSpatialGardenSummary() {
    showIntroBoard(
        'Your place is becoming connected',
        'Two different Plant orbs now hold their own profiles, and one Note records an observation beside them. Next, see how Area Totems organise this information across a larger place.',
        'Meet Area Totems',
        showTotemIntroduction
    );
}

function guideNoteConversion(record) {
    const pointer = appRoot?.querySelector('[data-tryit-place]');
    pointer?.setAttribute('hidden', '');
    pointer?.classList.remove('is-revealing', 'is-ready', 'is-pressed');
    record.demoExpanded = false;
    record.revealTitle = true;
    record.revealLines = 3;
    refreshDemoRecord(record);
    if(pathwayNotePlacementPending){
        pathwayNotePlacementPending=false;placementReady=false;
        setGuide('Your observation Note is anchored to this place.');
        completeLearningPath('placed');
        return;
    }
    setGuide('Your observation is anchored beside the plants.');
    showIntroBoard(
        'Your Note is in place',
        'Notes keep a short observation, image, memory or task connected to the place where it matters. This example records a seasonal change beside the two plants.',
        'Continue to Areas',
        () => {
            finishIntroBoard();
            showSpatialGardenSummary();
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

function armDemoPlacement(type, {explained=false}={}) {
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
        note: ['Add one observation', 'Aim beside the plants and press the circle once to anchor a seasonal Note in this place.']
    };
    const [title, introduction] = introductions[type];
    const startPlacement = () => {
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
    };
    if(explained){startPlacement();return;}
    showIntroBoard(title, introduction, 'Continue', startPlacement);
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

function simulatedAnchorFromPointer(startAnchor, startX, startY, event) {
    const { width: viewportWidth, height: viewportHeight } = demoViewportDimensions();
    return {
        x: Math.max(8, Math.min(92, Number(startAnchor?.x) + ((event.clientX - startX) / viewportWidth) * 100)),
        y: Math.max(12, Math.min(88, Number(startAnchor?.y) + ((event.clientY - startY) / viewportHeight) * 100))
    };
}

function applySimulatedMarkerAnchor(layer, index, anchor) {
    const markerX = `${Number(anchor.x).toFixed(2)}%`;
    const markerY = `${Number(anchor.y).toFixed(2)}%`;
    layer.querySelectorAll(`[data-demo-marker-index="${index}"], [data-demo-plant-profile="${index}"]`).forEach(element => {
        element.style.setProperty('--marker-x', markerX);
        element.style.setProperty('--marker-y', markerY);
    });
}

function clampPlantPanelOffset(anchor, offset) {
    const { width: viewportWidth, height: viewportHeight } = demoViewportDimensions();
    const anchorX = viewportWidth * anchor.x / 100;
    const anchorY = viewportHeight * anchor.y / 100;
    const surface = demoPimSurfaceLayout(anchor);
    const minimumX = 12 + surface.panelWidth / 2 - anchorX;
    const maximumX = viewportWidth - 12 - surface.panelWidth / 2 - anchorX;
    const minimumY = surface.topInset + surface.panelHeight / 2 - anchorY;
    const maximumY = viewportHeight - surface.bottomInset - surface.panelHeight / 2 - anchorY;
    return {
        x: Math.min(maximumX, Math.max(minimumX, offset.x)),
        y: Math.min(maximumY, Math.max(minimumY, offset.y))
    };
}

function defaultPlantPanelOffset(anchor) {
    const { width: viewportWidth, height: viewportHeight } = demoViewportDimensions();
    const surface = demoPimSurfaceLayout(anchor);
    const anchorX = viewportWidth * anchor.x / 100;
    const anchorY = viewportHeight * anchor.y / 100;
    return clampPlantPanelOffset(anchor, {
        x: surface.panelX - anchorX,
        y: surface.panelY - anchorY
    });
}

function demoViewportDimensions() {
    const visualViewport = window.visualViewport;
    return {
        width: Math.max(320, Number(visualViewport?.width) || window.innerWidth || 320),
        height: Math.max(320, Number(visualViewport?.height) || window.innerHeight || 640)
    };
}

function demoPimViewportInsets() {
    const { height } = demoViewportDimensions();
    const visualViewport = window.visualViewport;
    const viewportTop = Number(visualViewport?.offsetTop) || 0;
    const footer = appRoot?.querySelector('.tryit-demo-footer:not([hidden])');
    const footerRect = footer?.getBoundingClientRect();
    const board = appRoot?.querySelector('[data-tryit-guided-choice]:not([hidden])');
    const boardRect = board?.getBoundingClientRect();
    const compactTutorial = [DEMO_TUTORIAL_STEPS.PIM, DEMO_TUTORIAL_STEPS.LIVE_TAG].includes(demoTutorialStep);
    const measuredTop = compactTutorial && boardRect
        ? boardRect.bottom - viewportTop + 10
        : 0;
    return {
        topInset: compactTutorial
            ? Math.max(80, Math.min(height * .21, measuredTop || height * .18))
            : 12,
        bottomInset: Math.max(12, (footerRect?.height || 104) + 16)
    };
}

function demoPimSurfaceLayout(anchor = { x: 50, y: 50 }) {
    const { width, height } = demoViewportDimensions();
    const insets = demoPimViewportInsets();
    return plantInformationMeshSurfaceLayout(
        width,
        height,
        width * Number(anchor.x || 50) / 100,
        height * Number(anchor.y || 50) / 100,
        insets
    );
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

function demoPlantKnowledgeMarkup(record, anchor = record?.simulatedAnchor || { x: 50, y: 50 }) {
    const viewport = demoViewportDimensions();
    const surface = demoPimSurfaceLayout(anchor);
    const markerY = viewport.height * Number(anchor.y || 50) / 100;
    const markerClearance = 24;
    const markerReservedInset = surface.profileAbove
        ? Math.max(8, surface.panelTop + surface.panelHeight - (markerY - markerClearance))
        : 8;
    return plantInformationMeshMarkup(knowledgeFor(record), demoPimExpandedNodeIds(record), {
        ...demoSpatialPimLayoutOptions(),
        selectedNodeId: record.demoSelectedNodeId,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        layoutWidth: surface.panelWidth,
        layoutHeight: surface.panelHeight,
        safeArea: pimViewportSafeArea(surface.panelWidth, surface.panelHeight, {
            horizontalInset: 8,
            topInset: 8,
            bottomInset: markerReservedInset
        })
    });
}

function renderSimulatedPlant(record, index, anchor, offset) {
    const anchorVariables = simulatedAnchorStyle(anchor);
    const orbAppearance = demoOrbStyle(record);
    const orbLabel = record.demoExpanded ? `Hide ${record.name || 'Plant'} profile` : `Open ${record.name || 'Plant'} profile`;
    const anchoredOrb = `<span class="tryit-sim-marker tryit-sim-marker-plant is-demo-orb is-demo-${record.demoOrbShape || 'orb'} has-plant-profile${record.demoExpanded ? ' has-information' : ''}${demoHeldIndex === index ? ' is-held' : ''}${record.demoInteractive === false ? ' is-arriving' : ''}" data-demo-marker-index="${index}" style="${anchorVariables};${orbAppearance};--depth-scale:${record.demoDepthScale || 1}" role="button" tabindex="0" aria-label="${orbLabel}"><span class="tryit-sim-orb is-plant" style="${orbAppearance}" aria-hidden="true"></span></span>`;
    if (!record.demoExpanded) return anchoredOrb;
    const surface = demoPimSurfaceLayout(anchor);
    const profileVariables = `${anchorVariables};--panel-x:${offset.x}px;--panel-y:${offset.y}px;width:${surface.panelWidth}px;height:${surface.panelHeight}px`;
    return `${anchoredOrb}<span class="tryit-sim-plant-profile" data-demo-plant-profile="${index}" style="${profileVariables}" role="group" aria-label="${record.name || 'Plant'} information">${demoPlantKnowledgeMarkup(record, anchor)}</span>`;
}

function renderSimulatedTotem(record, index, anchor) {
    const content = demoContentFor(record);
    const cards = demoTotemCards(record);
    const style = DEMO_TOTEM_STYLES.find(item => item.id === (record.demoTotemStyle || 'basic')) || DEMO_TOTEM_STYLES[0];
    const styleControl = record.tutorialStage === 'totem2'
        ? `<button type="button" class="tryit-sim-totem-model-toggle" data-demo-totem-style-toggle aria-label="Change second Totem model">Model: ${style.label}<small>Tap to change</small></button>`
        : '';
    const linkLabel = record.demoLinkVisible
        ? `<span class="tryit-sim-totem-link-label" aria-hidden="true">${record.demoLinkDirection === 'left' ? '←' : '→'} ${record.demoLinkDestination || 'Linked Area'}</span>`
        : '';
    return `<span class="tryit-sim-marker tryit-sim-marker-zone tryit-sim-totem-system nlxr-totem-system is-totem-style-${style.id}${demoHeldIndex === index ? ' is-held' : ''}" data-demo-marker-index="${index}" style="${simulatedAnchorStyle(anchor)};--depth-scale:${record.demoDepthScale || 1}" role="group" aria-label="${record.name || 'Area'} Totem Marker information"><span class="tryit-sim-totem-pillar" aria-hidden="true"></span>${totemCardsMarkup(cards,record.totemSelectedCard)}${linkLabel}${styleControl}</span>`;
}

function toggleDemoPlantProfile(record) {
    if(demoKnowledgeWorkspace) return;
    if (!record || record.demoType !== 'plant') return;
    const recordIndex = markers.indexOf(record);
    if (demoHeldIndex === recordIndex) releaseHeldDemoRecord();
    record.demoExpanded = !record.demoExpanded;
    if (record.demoExpanded) {
        clearLimSelection();
        infoPanel?.focusPlant(record,demoOrbKnowledge(record).document);
        setDemoTutorialStep(DEMO_TUTORIAL_STEPS.PIM);
        setDemoPimState(record, pimCreateInteractionState(demoPimExpandedNodeIds(record), record.demoSelectedNodeId || '', record.id || record.name || ''));
        record.profileRevealStarted = performance.now();
        const firstOpen = !record.demoProfileOpened;
        record.demoProfileOpened = true;
        record.demoActiveBranch ||= '';
        record.demoExpandedBranches ||= [];
        if (firstOpen) {
            record.demoProfileInteracted = false;
            record.demoProfileInteractionCount = 0;
        }
        record.informationPose ||= plantInformationPose(record);
        record.informationPosition = record.informationPose?.position || record.informationPosition || null;
        // Establish the compact tutorial board before sizing the canonical
        // mesh so its first frame already respects the true top safe inset.
        showPersistentPimPrompt(record);
    }
    refreshDemoRecord(record);
    if (record.demoExpanded && record.awaitingProfileReveal) {
        record.awaitingProfileReveal = false;
        navigator.vibrate?.([45, 40, 75]);
    }
    if (!record.demoExpanded) {
        setDemoTutorialStep(DEMO_TUTORIAL_STEPS.GUIDED);
        setGuide(`${record.name || 'Plant'} profile hidden. The living orb remains anchored in place.`);
    }
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

function selectDemoTotemStyleAtPointer() {
    const target = demoRecordAtPointer();
    if (!target || target.record.demoType !== 'zone' || target.record.tutorialStage !== 'totem2') return false;
    return cycleDemoTotemStyle(target.record);
}

function selectDemoProfileCell() {
    const selection = [...markers]
        .reverse()
        .filter(candidate => candidate?.demoType === 'plant' && candidate.demoExpanded)
        .map(record => ({ record, target: demoPimPointerTarget(record) }))
        .find(candidate => candidate.target);
    if (!selection) return false;
    const { record, target } = selection;
    const node = target.node || (target.pimBack ? target : null);
    // Only consume a selection when it lands on an actual cell. Transparent
    // space must fall through so the orb can still close the PIM or open the
    // Live Tag action at any stage of the demo.
    if (!node) {
        setGuide('Aim at a visible Plant Information Mesh cell to explore it.');
        return false;
    }
    if (node.pimRead) {openDemoKnowledge(record);return true;}
    if (node.pimCore) {
        setDemoPimState(record, pimResetInteractionState(demoPimState(record)));
        record.demoActiveBranch = '';
        record.pimBloomStarted = 0;
        refreshDemoPimProfile(record);
        setGuide('Pigeon Pea flower reset.');
        return true;
    }
    if (node.pimBack) {
        setDemoPimState(record, pimToggleNodeState(knowledgeFor(record), demoPimState(record), node.path));
        record.demoActiveBranch = node.parentPath === 'core' ? '' : node.parentPath;
        refreshDemoPimProfile(record);
        setGuide(`Returned to the previous ${node.label} bloom.`);
        return true;
    }
    showDemoInfo(record,node.path);
    if (!pimNodeChildren(node).length) {
        setDemoPimState(record, pimToggleNodeState(knowledgeFor(record), demoPimState(record), node.path));
        refreshDemoPimProfile(record);

        return true;
    }
    const wasOpen = demoPimState(record).expandedNodeIds.has(node.path);
    setDemoPimState(record, pimToggleNodeState(knowledgeFor(record), demoPimState(record), node.path));
    record.demoActiveBranch = wasOpen
        ? (node.parentPath === 'core' ? '' : node.parentPath)
        : node.path;
    record.pimBloomStarted = performance.now();
    refreshDemoPimProfile(record);
    const opened = demoPimState(record).expandedNodeIds.has(node.path);
    const remaining = advanceAfterDemoProfileInteraction(record);
    setGuide(opened
        ? `${node.label} ${wasOpen ? 'remains open.' : 'opened into its connected information cells.'}${remaining ? ` Open ${remaining} more ${remaining === 1 ? 'cell' : 'cells'} to keep exploring the PIM.` : ''}`
        : `${node.label} remains closed.`);
    return true;
}

function advanceAfterDemoProfileInteraction(record) {
    if (!record || record.demoProfileInteracted) return 0;
    const opened = demoPimState(record).expandedNodeIds.has(record.demoActiveBranch);
    const explorationGoal = record.tutorialStage === 'plant' ? 3 : 2;
    if (opened) record.demoProfileInteractionCount = (Number(record.demoProfileInteractionCount) || 0) + 1;
    const remaining = Math.max(0, explorationGoal - (Number(record.demoProfileInteractionCount) || 0));
    if (remaining) return remaining;
    continueAfterDemoPim(record);
    return 0;
}

function orientDemoPimPoseToViewer(pose) {
    if (!pose?.position || !pose?.normal || !pose?.right || !viewerMatrix) return pose;
    const towardViewer = {
        x: Number(viewerMatrix[12]) - pose.position.x,
        z: Number(viewerMatrix[14]) - pose.position.z
    };
    const facing = pose.normal.x * towardViewer.x + pose.normal.z * towardViewer.z;
    const normal = facing >= 0
        ? { ...pose.normal }
        : { x: -pose.normal.x, y: -pose.normal.y, z: -pose.normal.z };
    // Rebuild the horizontal axis from the viewer-facing normal. A stale
    // stored right vector can otherwise show the whole canvas from its back,
    // mirroring the PIM labels and reversing touch targets.
    const right = { x: normal.z, y: 0, z: -normal.x };
    return { ...pose, normal, right };
}

function demoPimPointerTarget(record) {
    const origin = demoPointerWorldOrigin();
    const direction = demoPointerWorldRay();
    if (!origin || !direction || !record) return null;
    record.informationPose ||= plantInformationPose(record);
    const defaultPimPanel = pimSpatialPanel(orientDemoPimPoseToViewer(record.informationPose));
    const panel = demoPimPanel(record) || defaultPimPanel;
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
    const bloomProgress = record.pimBloomStarted
        ? Math.max(0, Math.min(1, (performance.now() - record.pimBloomStarted) / PIM_BLOOM_DURATION_MS))
        : 1;
    const size = record.pimTextureSize || demoPimSurfaceSize(record);
    return {
        panelHit: true,
        xPercent,
        yPercent,
        node: pimHoneycombTargetAtPercent(knowledge, demoPimExpandedNodeIds(record), xPercent, yPercent, {
            ...demoSpatialPimLayoutOptions(),
            readerControl:false,
            softSurface:false,
            layoutWidth: size.layoutWidth,
            layoutHeight: size.layoutHeight,
            bloomProgress,
            selectedNodeId: record.demoSelectedNodeId
        })
    };
}

function demoPimNodeAtPointer(record) {
    return demoPimPointerTarget(record)?.node || null;
}

function renderSimulatedAreaLink() {
    const linked = markers.filter(record => record.demoType === 'zone' && record.demoLinkVisible && record.simulatedAnchor);
    if (linked.length < 2) return '';
    const [first, second] = linked;
    const start = first.simulatedAnchor;
    const end = second.simulatedAnchor;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const width = Math.max(2, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    return `<span class="tryit-sim-area-link-line" aria-hidden="true" style="left:${start.x}%;top:${start.y}%;width:${width}%;transform:rotate(${angle}deg)"></span><span class="tryit-sim-area-link-label" aria-hidden="true" style="left:${midpoint.x}%;top:${midpoint.y}%">↔ LINKED AREAS</span>`;
}

function updateSimulatedMarkers() {
    appRoot?.querySelectorAll(':scope > .nlxr-totem-detail').forEach(note=>note.remove());
    const layer = appRoot?.querySelector('[data-tryit-sim-markers]');
    if (!layer || !simulatedMode) return;
    layer.innerHTML = `${renderSimulatedAreaLink()}${markers.map((record, index) => {
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
    }).join('')}`;
    bindSimulatedInformationPanels(layer);
}

function applyPlantPanelOffset(profile, offset) {
    profile.style.setProperty('--panel-x', `${offset.x}px`);
    profile.style.setProperty('--panel-y', `${offset.y}px`);
}

function bindSimulatedInformationPanels(layer) {
    layer.querySelectorAll('.tryit-sim-marker').forEach(compactMarker => {
        const index = Number(compactMarker.dataset.demoMarkerIndex);
        const record = markers[index];
        if (!record || record.demoInteractive === false) return;
        let holdTimer = null;
        let holdGesture = null;
        compactMarker.addEventListener('pointerdown', event => {
            // A plant is intentionally locked while its mesh is visible.
            // Press the orb again to close the mesh, then hold to move it.
            if (record.demoType === 'plant' && record.demoExpanded) return;
            if (demoHeldIndex === index) return;
            holdGesture = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startAnchor: { ...(record.simulatedAnchor || { x: 50, y: 50 }) }
            };
            compactMarker.setPointerCapture?.(event.pointerId);
            compactMarker.classList.add('is-drag-ready');
            holdTimer = setTimeout(() => {
                demoHeldIndex = index;
                suppressDemoMarkerClick = true;
                record.simulatedAnchor = { ...holdGesture.startAnchor };
                applySimulatedMarkerAnchor(layer, index, record.simulatedAnchor);
                compactMarker.classList.add('is-held');
                const joystick = appRoot.querySelector('[data-demo-depth-joystick]');
                joystick.hidden = false;
                joystick.style.setProperty('--move-control-x', `${holdGesture.startX}px`);
                joystick.style.setProperty('--move-control-y', `${holdGesture.startY}px`);
                joystick.querySelector('strong').textContent = record.name || 'Held element';
                const readout = joystick.querySelector('[data-demo-depth-readout]');
                if (readout) readout.textContent = `${(record.demoDistance || 1).toFixed(1)} m`;
                joystick.style.setProperty('--depth-shift', '0px');
                setGuide(`Holding ${record.name || 'this element'}. Move the orb, then release.`);
            }, DEMO_PLANT_ORB_HOLD_DELAY_MS);
        });
        compactMarker.addEventListener('pointermove', event => {
            if (demoHeldIndex !== index || event.pointerId !== holdGesture?.pointerId) return;
            if (simulatedMode) {
                record.simulatedAnchor = simulatedAnchorFromPointer(holdGesture.startAnchor, holdGesture.startX, holdGesture.startY, event);
                applySimulatedMarkerAnchor(layer, index, record.simulatedAnchor);
            }
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
        compactMarker.addEventListener('pointercancel', () => {
            cancelHoldTimer();
            if (demoHeldIndex === index) releaseHeldDemoRecord();
        });
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
            const knowledge=demoOrbKnowledge(record);
            compactMarker.dataset.knowledgeState=knowledge.state;
            compactMarker.insertAdjacentHTML('beforeend',liveOrbCrownMarkup(knowledge)+'<small class="nlxr-orb-label">'+knowledge.label+'</small>');
            compactMarker.setAttribute('aria-label',(record.name || 'Plant')+' · '+knowledge.label);
            compactMarker.addEventListener('click', () => toggleDemoPlantProfile(record));
            compactMarker.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                compactMarker.click();
            });
            return;
        }
        if (record.demoType === 'zone') {
            compactMarker.querySelectorAll('[data-totem-card]').forEach(button=>{
                button.addEventListener('pointerdown',event=>event.stopPropagation());
                button.addEventListener('click',event=>{
                    event.stopPropagation();record.totemSelectedCard=record.totemSelectedCard===button.dataset.totemCard ? '' : button.dataset.totemCard;updateSimulatedMarkers();
                });
            });
            compactMarker.querySelector('[data-totem-close]')?.addEventListener('pointerdown',event=>event.stopPropagation());
            compactMarker.querySelector('[data-totem-close]')?.addEventListener('click',event=>{
                event.stopPropagation();const previous=record.totemSelectedCard;record.totemSelectedCard='';updateSimulatedMarkers();
                appRoot.querySelector('[data-demo-marker-index="'+index+'"] [data-totem-card="'+previous+'"]')?.focus();
            });
            const detail=compactMarker.querySelector('.nlxr-totem-detail');
            if(detail) appRoot.append(detail);
            const cycle = event => {
                event?.preventDefault();
                event?.stopPropagation();
                cycleDemoTotemStyle(record);
            };
            compactMarker.querySelector('[data-demo-totem-style-toggle]')?.addEventListener('pointerdown', event => {
                event.stopPropagation();
                suppressSessionSelectUntil = performance.now() + 500;
            });
            compactMarker.querySelector('[data-demo-totem-style-toggle]')?.addEventListener('click', cycle);
            compactMarker.querySelector('[data-demo-totem-style-toggle]')?.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                cycle(event);
            });
            compactMarker.addEventListener('click', event => {
                if (record.tutorialStage !== 'totem2' || event.target?.closest?.('[data-demo-totem-style-toggle]')) return;
                cycle(event);
            });
            compactMarker.addEventListener('keydown', event => {
                if (record.tutorialStage !== 'totem2' || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                cycle(event);
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
        const handle = profile.querySelector('[data-plant-profile-handle]');
        if (!record || !handle) return;
        const pimTarget = event => event.target.closest?.('[data-pim-node],[data-pim-back],[data-pim-read-all]');
        profile.addEventListener('pointerdown', event => {
            if (!pimTarget(event)) return;
            event.stopPropagation();
            suppressSessionSelectUntil = performance.now() + 500;
        });
        profile.addEventListener('pointerup', event => {
            // Keep a cell tap inside the mesh. If this reaches the draggable
            // profile surface it is mistaken for a blank tap and closes PIM.
            if (pimTarget(event)) event.stopPropagation();
        });
        profile.addEventListener('pointercancel', event => {
            if (pimTarget(event)) event.stopPropagation();
        });
        profile.addEventListener('click', event => {
            if(event.target.closest('[data-pim-read-all]')) {event.stopPropagation();openDemoKnowledge(record);return;}
            const core = event.target.closest?.('[data-pim-role="center"]');
            if (core && profile.contains(core)) {
                event.stopPropagation();
                setDemoPimState(record, pimResetInteractionState(demoPimState(record)));
                record.demoActiveBranch = '';
                record.pimBloomStarted = 0;
                refreshDemoPimProfile(record, profile);
                setGuide('Pigeon Pea flower reset.');
                return;
            }
            const back = event.target.closest?.('[data-pim-back]');
            if (back) {
                event.stopPropagation();
                const focusPath = back.dataset.pimBack;
                setDemoPimState(record, pimToggleNodeState(knowledgeFor(record), demoPimState(record), focusPath));
                const separator = focusPath.includes('/') ? '/' : '.';
                record.demoActiveBranch = focusPath.split(separator).slice(0, -1).join(separator);
                refreshDemoPimProfile(record, profile);
                setGuide('Returned to the previous PIM bloom.');
                return;
            }
            const cell = event.target.closest?.('[data-pim-node]');
            if (!cell || !profile.contains(cell)) return;
            event.stopPropagation();
            const nodePath = cell.dataset.pimNode;
            const node = pimNodeAtPath(knowledgeFor(record), nodePath);
            if(node) showDemoInfo(record,node.path);
            const cellLabel = cell.querySelector('b')?.textContent || 'Cell';
            if (!node || !pimNodeChildren(node).length) {

                setDemoPimState(record, pimToggleNodeState(knowledgeFor(record), demoPimState(record), nodePath));
                refreshDemoPimProfile(record, profile);
                setGuide(`${cellLabel}: ${node?.value || 'Information cell'}`);
                return;
            }
            const wasOpen = demoPimState(record).expandedNodeIds.has(nodePath);
            setDemoPimState(record, pimToggleNodeState(knowledgeFor(record), demoPimState(record), nodePath));
            record.demoActiveBranch = wasOpen
                ? (node.parentPath === 'core' ? '' : node.parentPath)
                : nodePath;
            record.pimBloomStarted = performance.now();
            const remaining = advanceAfterDemoProfileInteraction(record);
            refreshDemoPimProfile(record, profile);
            setGuide(wasOpen
                ? `${cellLabel} remains open.`
                : `${cellLabel} opened into its information petals.${remaining ? ` Open ${remaining} more ${remaining === 1 ? 'cell' : 'cells'} to keep exploring the PIM.` : ''}`);
        });
        bindPlantInformationMeshPress(profile);
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
            applyPlantPanelOffset(profile, record.demoPanelOffset);
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
            applyPlantPanelOffset(profile, record.demoPanelOffset);
        });
    });
}

function demoPimState(record) {
    return pimCreateInteractionState(
        record?.demoExpandedNodeIds || record?.demoExpandedBranches || [],
        record?.demoSelectedNodeId || '',
        record?.demoFocusedPlantId || record?.id || record?.name || '',
        record?.pimClosingNodePaths || []
    );
}

function demoPimExpandedNodeIds(record) {
    return record?.demoExpandedNodeIds || record?.demoExpandedBranches || [];
}

function setDemoPimState(record, state) {
    if (!record) return state;
    record.demoSelectedNodeId = state.selectedNodeId;
    record.demoExpandedNodeIds = pimExpandedNodeIds(state);
    record.pimClosingNodePaths = pimClosingNodePaths(state);
    record.demoExpandedBranches = [...record.demoExpandedNodeIds];
    record.demoFocusedPlantId = state.focusedPlantId || record.id || record.name || '';
    return state;
}

function refreshDemoRecord(record) {
    if (record.texture) gl?.deleteTexture(record.texture);
    record.texture = createMarkerTexture(record);
    updateSimulatedMarkers();
}

function refreshDemoPimProfile(record, profile = null) {
    if (!record) return null;
    if (record.texture) gl?.deleteTexture(record.texture);
    record.texture = createMarkerTexture(record);
    const recordIndex = markers.indexOf(record);
    const liveProfile = profile
        || appRoot?.querySelector(`[data-demo-plant-profile="${recordIndex}"]`);
    if (!liveProfile) return null;
    return reconcilePlantInformationMesh(liveProfile, demoPlantKnowledgeMarkup(record));
}

export function demoPointerScreenPoint(rect, viewportWidth = globalThis.innerWidth, viewportHeight = globalThis.innerHeight) {
    const width = Number(rect?.width);
    const height = Number(rect?.height);
    const hasVisibleRect = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
    return hasVisibleRect
        ? { x: Number(rect.left) + width / 2, y: Number(rect.top) + height / 2 }
        : { x: Number(viewportWidth) / 2, y: Number(viewportHeight) / 2 };
}

function demoPointerWorldRay() {
    if (latestControllerRay) return latestControllerRay.direction;
    if (!viewerMatrix || !latestDemoView?.projectionMatrix) return null;
    const pointer = appRoot?.querySelector('[data-tryit-place]');
    const rect = pointer?.getBoundingClientRect();
    const screenPoint = demoPointerScreenPoint(rect, window.innerWidth, window.innerHeight);
    const screenX = screenPoint.x;
    const screenY = screenPoint.y;
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
    const distance = Math.max(.4, Math.min(4, Number(record.demoGrabDepth) || Number(record.demoDistance) || AR_EXPERIENCE_CONFIG.placementDistanceMetres));
    const lateral = record.demoGrabLateral || { x: 0, y: 0, z: 0 };
    record.position = {
        x: origin.x + ray.x * distance + lateral.x,
        y: record.demoType === 'zone'
            ? demoGroundBaseY(hitMatrix, viewerMatrix, record.groundBaseY ?? groundYEstimate) + DEMO_TOTEM_HALF_HEIGHT_METRES
            : origin.y + ray.y * distance + lateral.y,
        z: origin.z + ray.z * distance + lateral.z
    };
    if (record.demoType === 'zone') record.groundBaseY = record.position.y - DEMO_TOTEM_HALF_HEIGHT_METRES;
    record.informationPosition = null;
    record.informationPose = null;
}

function captureDemoGrabPose(record, origin, ray) {
    if (!record || !origin || !ray) return false;
    const rayLength = Math.hypot(ray.x, ray.y, ray.z) || 1;
    const direction = { x: ray.x / rayLength, y: ray.y / rayLength, z: ray.z / rayLength };
    const offset = {
        x: Number(record.position?.x || 0) - origin.x,
        y: Number(record.position?.y || 0) - origin.y,
        z: Number(record.position?.z || 0) - origin.z
    };
    const projectedDepth = offset.x * direction.x + offset.y * direction.y + offset.z * direction.z;
    const depth = Math.max(.4, Math.min(4, projectedDepth > .1 ? projectedDepth : Math.hypot(offset.x, offset.y, offset.z)));
    record.demoGrabDepth = depth;
    record.demoGrabLateral = {
        x: offset.x - direction.x * depth,
        y: offset.y - direction.y * depth,
        z: offset.z - direction.z * depth
    };
    record.demoDistance = depth;
    return true;
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
        }, DEMO_PLANT_ORB_HOLD_DELAY_MS);
        return true;
    }
    const target = demoRecordAtPointer();
    if (!target) return false;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    suppressSessionSelectUntil = performance.now() + 1200;
    captureDemoGrabPose(target.record, demoPointerWorldOrigin(), demoPointerWorldRay());
    demoHoldTimer = setTimeout(() => {
        demoHoldTimer = null;
        demoHeldIndex = target.index;
        setGuide(`Holding ${target.record.name || 'the orb'}. Move your phone, then release.`);
    }, DEMO_PLANT_ORB_HOLD_DELAY_MS);
    return true;
}

function beginControllerDemoHold() {
    if (placementReady || demoHeldIndex >= 0 || demoHoldTimer) return false;
    const target = demoRecordAtPointer();
    if (!target || target.record.demoInteractive === false) return false;
    const origin = demoPointerWorldOrigin();
    if (!origin) return false;
    captureDemoGrabPose(target.record, origin, demoPointerWorldRay());
    demoHoldTimer = setTimeout(() => {
        demoHoldTimer = null;
        demoHeldIndex = target.index;
        suppressSessionSelectUntil = performance.now() + 420;
        setGuide(`Holding ${target.record.name || 'the orb'}. Move the controller, then release.`);
    }, DEMO_PLANT_ORB_HOLD_DELAY_MS);
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
    if (record) {
        record.demoGrabDepth = null;
        record.demoGrabLateral = null;
    }
    appRoot?.querySelector('[data-demo-depth-joystick]')?.setAttribute('hidden', '');
    updateSimulatedMarkers();
    setGuide(`${record?.name || 'Element'} released in its adjusted position.`);
    return true;
}

function plantInformationPosition(record) {
    if (record?.informationPose?.position) return record.informationPose.position;
    if (viewerMatrix) {
        record.informationPose ||= plantInformationPose(record);
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
    setGuide(demoStage === 'note' ? 'Placing Note…' : 'Placing Plant orb…');
    const placementDelay = demoStage === 'note' ? 120 : 360;
    pointerPressTimer = setTimeout(() => {
        place?.classList.remove('is-pressed');
        pointerPressTimer = null;
        placeMarker();
    }, placementDelay);
}

function closeDemoKnowledge(force=false) {
    if(!demoKnowledgeWorkspace) return;
    if(!force) {demoKnowledgeWorkspace.close();return;}
    demoKnowledgeMirror?.destroy();demoKnowledgeMirror=null;demoKnowledgePanel=null;
    demoKnowledgeWorkspace.destroy();demoKnowledgeWorkspace=null;demoKnowledgeRoot?.remove();demoKnowledgeRoot=null;
    const stage=appRoot?.querySelector('.tryit-stage'); if(stage) stage.inert=false;
    infoPanel?.suspend(false);
    suppressSessionSelectUntil=performance.now()+350;
}

function openDemoKnowledge(record,path='',edit=false) {
    if(demoKnowledgeWorkspace || demoWebModeOpen || placementReady) return;
    const profile=record.demoKnowledgeProfile || (record.demoPlantPreset==='moringa' ? structuredClone(MORINGA_PROFILE) : {common_name:'Pigeon Pea',pim_document:structuredClone(PIGEON_PEA_PIM)});
    record.demoKnowledgeProfile=profile;
    const proxy={marker:{id:record.id || record.demoPlantPreset || 'pigeon-pea',name:record.name || profile.common_name},plantProfile:profile,areaName:'Try It Now · changes stay in this demo',arKnowledgeState:record.arKnowledgeState};
    const root=document.createElement('section');demoKnowledgeRoot=root;appRoot.append(root);
    const stage=appRoot.querySelector('.tryit-stage');if(stage) stage.inert=true;
    infoPanel?.suspend(true);
    demoKnowledgeWorkspace=mountCreatorArKnowledge(root,{
        record:proxy,context:['demo','session','practice',proxy.marker.id],path,edit,
        persistence:{load:async()=>record.demoKnowledgeProfile,save:async(...args)=>{record.demoKnowledgeProfile=args.at(-1);}},
        onSaved:profile=>{record.demoKnowledgeProfile=profile;record.demoKnowledgeProjection=pimToArKnowledge(resolvePlantPim(profile));infoPanel?.refresh(record,resolvePlantPim(profile));refreshDemoPimProfile(record);},
        onClose:()=>{record.arKnowledgeState=demoKnowledgeWorkspace.controller.getState();closeDemoKnowledge(true);}
    });
    root.classList.add('demo-knowledge-workspace','is-ar-pim-side-note');
    if(session && !domOverlayEnabled && gl) {
        demoKnowledgePanel=spatialPimSidePanelFromViewer(viewerMatrix);
        demoKnowledgeMirror=createSpatialDashboardMirror({gl,root,width:720,height:620,title:'DEMO · PLANT KNOWLEDGE',onStatus:setGuide,onError:error=>setGuide(error.message)});
    }
}

function spatialPimSidePanelFromViewer(viewerMatrix) {
    const panel=spatialDashboardPanelFromViewer(viewerMatrix,{width:.78,height:.68,distance:1.12,drop:.02});
    if(!panel)return panel;
    const sideOffset=-.66;
    panel.center={x:panel.center.x+panel.right.x*sideOffset,y:panel.center.y+.04,z:panel.center.z+panel.right.z*sideOffset};
    return panel;
}

function drawDemoKnowledge(view) {
    if(!demoKnowledgeMirror || !demoKnowledgePanel) return;
    const model=spatialDashboardPanelMatrix(demoKnowledgePanel);
    // Existing demo quad spans ±.20 by ±.08 and has top-down texture UVs.
    for(let i=0;i<4;i++){model[i]*=5;model[4+i]*=-12.5;}
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    const p=gl.getAttribLocation(program,'p'),uv=gl.getAttribLocation(program,'uv');
    gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,'mvp'),false,multiply(view.projectionMatrix,multiply(view.transform.inverse.matrix,model)));
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,demoKnowledgeMirror.texture);gl.uniform1i(gl.getUniformLocation(program,'t'),0);gl.uniform1f(gl.getUniformLocation(program,'opacity'),1);
    gl.disable(gl.CULL_FACE);gl.drawArrays(gl.TRIANGLES,0,6);
    const axes=demoControllerInputSource()?.gamepad?.axes || [];const vertical=axes[3] ?? axes[1] ?? 0;
    if(Math.abs(vertical)>.4 && performance.now()-demoKnowledgeScrollAt>150){demoKnowledgeMirror.scrollBy(vertical*120);demoKnowledgeScrollAt=performance.now();}
}

function renderInterface(simulated) {
    simulatedMode = simulated;
    limDiagnostic('layout-recalculation',{reason:'interface-render',simulated,step:demoTutorialStep,...limDeviceContext(simulated && navigator.maxTouchPoints ? 'touch-capable' : simulated ? 'mouse' : 'xr-pointer')});
    const webglControlFallback = Boolean(!simulated && session && !domOverlayEnabled);
    const questImmersiveMode = Boolean(!simulated && session && sessionMode === 'immersive-vr');
    introSceneStartedAt = performance.now();
    introSceneActive = true;
    introBoardHasEntered = false;
    appRoot.innerHTML = `<div class="tryit-demo ${simulated ? 'is-simulated' : 'is-immersive'}"><div class="tryit-stage"><div class="tryit-spatial-intro" data-tryit-intro><div class="tryit-intro-knowledge" aria-label="BIOMAP interactive plant attributes">${INTRO_KNOWLEDGE_KEYWORDS.map((keyword, index) => `<span class="biomap-branch" style="--knowledge-index:${index}"><button type="button" data-biomap-category="${keyword}" aria-expanded="false">${keyword}</button>${BIOMAP_CATEGORIES[keyword].length ? `<span class="biomap-children" aria-label="${keyword} filters">${BIOMAP_CATEGORIES[keyword].map(child => `<span>${child}</span>`).join('')}</span>` : ''}</span>`).join('')}</div></div><button class="tryit-place creator-ar-placement-guide" type="button" data-tryit-place aria-label="Place item" hidden>${placementPointerMarkup('')}</button>${spatialMoveControlMarkup('demo')}<button class="tryit-demo-action" type="button" data-tryit-action hidden></button><section class="tryit-guided-choice tryit-tutorial-board" data-tryit-guided-choice aria-live="polite" hidden></section><div class="tryit-final-actions" data-tryit-final-actions hidden><button type="button" data-tryit-reset>Try again</button><button type="button" data-tryit-finish>Finish demo</button></div><p class="tryit-guide" data-tryit-guide aria-live="polite">NourishlandXR demo.</p><div data-tryit-sim-markers></div><button type="button" class="tryit-ar-safety-control" data-tryit-safety-help aria-label="Show AR safety">Safety</button><div class="tryit-demo-footer"><p class="tryit-drag-hint">Hold and drag any element to reposition it.</p><nav class="tryit-demo-taskbar" aria-label="Demo controls"><button type="button" class="tryit-intro-continue" data-tryit-intro-continue hidden>Continue</button><button type="button" data-tryit-open-live-tag hidden>Open Plant Live Tag</button><button type="button" data-tryit-skip>Skip</button><button type="button" data-tryit-exit>Close</button></nav></div></div><section class="tryit-virtual-tag-mode" data-demo-virtual-tag aria-live="polite" hidden></section></div>`;
    infoPanel?.destroy(); demoPanelActionSignature=''; infoPanel = createPimInfoPanel({root:appRoot,onEdit:(record,path)=>openDemoKnowledge(record,path,true),onPathwayAction:handlePathwayAction,onModuleAction:handleLearningModuleAction,onUtilityAction:handleDemoPanelAction});
    infoPanel.element?.classList.toggle('is-demo-panel',simulated);
    infoPanel.setLearningModules(null);
    if(!simulated && gl) {infoPanel.attach(gl);infoPanel.bindSession(session,referenceSpace);}
    appRoot.querySelector('.tryit-demo')?.classList.toggle('uses-webgl-controls', webglControlFallback);
    appRoot.querySelector('.tryit-demo')?.classList.toggle('is-quest-vr', questImmersiveMode);
    const introContinue = appRoot.querySelector('[data-tryit-intro-continue]');
    setDemoTutorialStep(DEMO_TUTORIAL_STEPS.WELCOME);
    appRoot.querySelector('[data-tryit-intro]')?.removeAttribute('hidden');
    appRoot.querySelector('.tryit-drag-hint')?.remove();
    const exitButton = appRoot.querySelector('[data-tryit-exit]');
    exitButton.textContent = 'Close';
    exitButton.setAttribute('aria-label', 'Close demo');
    const skipButton = appRoot.querySelector('[data-tryit-skip]');
    skipButton.setAttribute('aria-label', 'Skip the current narration');
    const liveTagButton = appRoot.querySelector('[data-tryit-open-live-tag]');
    liveTagButton.setAttribute('aria-label', 'Open Plant Live Tag');
    bindDemoPanelActions();
    appRoot.querySelector('[data-tryit-safety-help]')?.addEventListener('click', () => showArSafetyDialog(appRoot.querySelector('.tryit-demo')));
    appRoot.querySelectorAll('[data-biomap-category]').forEach(button => {
        const expand = () => {
            button.closest('.biomap-branch')?.classList.add('is-expanded');
            button.setAttribute('aria-expanded', 'true');
        };
        button.addEventListener('mouseenter', expand);
        button.addEventListener('focus', expand);
        button.addEventListener('click', expand);
    });
    liveTagButton.addEventListener('click', event => event.stopPropagation());
    const holdCleanups = [
        bindHoldToConfirmButton(skipButton, { duration: DEMO_PLANT_ORB_HOLD_DELAY_MS, onComplete: () => skipDemoNarration?.() }),
        bindHoldToConfirmButton(exitButton, { duration: DEMO_PLANT_ORB_HOLD_DELAY_MS, onComplete: returnToWelcome })
    ];
    demoHoldButtonCleanup = () => holdCleanups.forEach(cleanup => cleanup());
    const reflowDemoViewport = () => {
        markers.filter(record => record.demoType === 'plant' && record.demoExpanded).forEach(record => {
            record.demoPanelOffset = clampPlantPanelOffset(record.simulatedAnchor || { x: 50, y: 50 }, record.demoPanelOffset || { x: 0, y: 0 });
        });
        updateSimulatedMarkers();
    };
    window.addEventListener('resize', reflowDemoViewport, { passive: true });
    window.visualViewport?.addEventListener('resize', reflowDemoViewport, { passive: true });
    demoViewportCleanup = () => {
        window.removeEventListener('resize', reflowDemoViewport);
        window.visualViewport?.removeEventListener('resize', reflowDemoViewport);
    };
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
    introNarrationTimer = setTimeout(showArWelcomeShowcase, 120);
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
    totemCardsRenderer = createSpatialTotemCards(gl);
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
        || sources.find(source => source.targetRayMode === 'screen' && source.targetRaySpace)
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
        if (bloomProgress >= 1) record.pimClosingNodePaths = [];
        const closingPaths = record.pimClosingNodePaths || [];
        const size = demoPimSurfaceSize(record);
        record.pimTextureSize = size;
        return createPlantInformationHoneycombTexture(gl, knowledgeFor(record), demoPimExpandedNodeIds(record), {
            ...demoSpatialPimLayoutOptions(),
            width: size.width,
            height: size.height,
            layoutWidth: size.layoutWidth,
            layoutHeight: size.layoutHeight,
            bloomProgress,
            pressPath:record.pimPressPath, pressProgress:record.pimPressProgress,
            selectedNodeId: record.demoSelectedNodeId,
            closingPaths
        });
    }
    if (record.demoType === 'zone') {
        return null; // Native Totems use independent shared card textures.
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

function canvasTexture(label, texture = null, flipY = false) {
    texture ||= gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // The PIM and other demo boards use explicit top-left UVs in the quad.
    // Callers opt into upload flipping only when a texture needs it.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, Boolean(flipY));
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function createIntroNoteTexture(texture = null) {
    const label = introNoteCanvas ||= document.createElement('canvas');
    const width=arWelcomeShowcaseActive?2500:1400,height=arWelcomeShowcaseActive?2100:1080;
    if(label.width!==width)label.width=width;
    if(label.height!==height)label.height=height;
    const ctx = label.getContext('2d');
    ctx.clearRect(0, 0, label.width, label.height);
    if(arWelcomeShowcaseActive){drawArWelcomeShowcase(ctx,arWelcomeClock.elapsed,window.matchMedia('(prefers-reduced-motion: reduce)').matches,arWelcomeClusters,{hidden:limHiddenCells,drawCells:limMeshVisible,drawPanel:introBoardVisible,drawContent:drawIntroNoteContent,progression:{visionActivated:arWelcomeVisionActivated,visionActivatedAt:arWelcomeVisionActivatedAt,expandedLimIds:[...limExpandedCells],expandedAt:Object.fromEntries(limExpandedAt)},activeKey:limActivation?.activeKey||'',activeProgress:limActivation?.progress||0,selectedKey:selectedLimCell,pathwayKey:['active','paused'].includes(limPathwayState.status)?currentPathwayNode()?.key || '':''});return canvasTexture(label,texture);}
    drawArWelcomePanel(ctx);
    drawIntroNoteContent(ctx);
    return canvasTexture(label, texture);
}

function drawIntroNoteContent(ctx) {
    // The note is a 900x500 surface at (250,300). Keep every piece of copy
    // inside that surface; the previous 1,100px text box extended beyond both
    // edges after the welcome panel was compacted.
    const contentLeft = 320;
    const contentWidth = 760;
    const contentCenter = contentLeft + contentWidth / 2;
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 18;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#dcef95';
    ctx.font = '750 38px system-ui, sans-serif';
    ctx.fillText(demoIntroLabel(), contentCenter, 350, contentWidth);
    ctx.fillStyle = '#fff';
    let titleSize = 72;
    do {
        ctx.font = `760 ${titleSize}px system-ui, sans-serif`;
        titleSize -= 4;
    } while (titleSize > 52 && ctx.measureText(introBoardTitle).width > contentWidth);
    drawWrappedTextureText(ctx, introBoardTitle, contentCenter, 410, contentWidth, titleSize + 10, 2);
    if (introBoardVisibleBody) {
    ctx.strokeStyle = 'rgba(220,239,149,.56)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(contentLeft, 500);
    ctx.lineTo(contentLeft + contentWidth, 500);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    const typedBody = introBoardVisibleBody
        ? `${introBoardVisibleBody}${introBoardVisibleBody.length < introBoardBody.length ? '▌' : ''}`
        : '▌';
    const visibleParagraphs = typedBody.split(/\n\n/);
    // Keep the first body line clear of the divider and the clipping edge;
    // its ascenders were previously being cut because the baseline sat too
    // close to the clip rectangle.
    const bodyTop = 535;
    const bodyBottom = 775;
    const bodyLayout = fitIntroBodyLayout(ctx, introBoardBody, contentWidth, bodyBottom - bodyTop);
    ctx.font = `650 ${bodyLayout.fontSize}px system-ui, sans-serif`;
    let paragraphY = bodyTop;
    let clipped = false;
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentLeft, bodyTop - 8, contentWidth, bodyBottom - bodyTop + 12);
    ctx.clip();
    ctx.textBaseline = 'top';
    outer: for (const [paragraphIndex, completeLines] of bodyLayout.paragraphLines.entries()) {
        const visibleLines = wrappedTextureLines(ctx, visibleParagraphs[paragraphIndex] || '', contentWidth);
        for (const [lineIndex, line] of visibleLines.entries()) {
            const lineY = paragraphY + lineIndex * bodyLayout.lineHeight;
            if (lineY > bodyBottom) { clipped = true; break outer; }
            ctx.fillText(line, contentLeft, lineY);
        }
        paragraphY += completeLines.length * bodyLayout.lineHeight + bodyLayout.paragraphGap;
    }
    if (clipped) ctx.fillText('…', contentLeft, bodyBottom);
    ctx.restore();
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
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

function introWorldAnchorFromViewer(matrix) {
    if (!matrix || matrix.length < 16) return null;
    const forwardLength = Math.hypot(Number(matrix[8]) || 0, Number(matrix[10]) || 0);
    const forward = forwardLength > .0001
        ? { x: -(Number(matrix[8]) || 0) / forwardLength, z: -(Number(matrix[10]) || 0) / forwardLength }
        : { x: 0, z: -1 };
    const right = { x: -forward.z, z: forward.x };
    // Lock the welcome surface to horizontal heading and world-up. If the
    // phone starts pointed at the floor, its pitch must not rotate the board
    // out of view or pin it to the camera's screen plane.
    return new Float32Array([
        right.x, 0, right.z, 0,
        0, 1, 0, 0,
        -forward.x, 0, -forward.z, 0,
        Number(matrix[12]) || 0, Number(matrix[13]) || 0, Number(matrix[14]) || 0, 1
    ]);
}

function drawIntroSpatial(view) {
    if ((!introSceneActive && !arWelcomeShowcaseActive) || !viewerMatrix || !program || !buffer) return;
    if(!introWorldAnchor){
        introWorldAnchor ||= introWorldAnchorFromViewer(viewerMatrix);
        limDiagnostic('root-placement',{anchor: introWorldAnchor ? Array.from(introWorldAnchor.slice(12,15)) : null,mode:sessionMode});
    }
    const now = performance.now();
    if(arWelcomeShowcaseActive){
        arWelcomeClock.tick(now,session?.visibilityState==='visible');
        if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches && arWelcomeClock.elapsed<AR_WELCOME_SETTLED_MS)introBoardTextureDirty=true;
    }
    const textIsTyping=Boolean(introBoardBody && introBoardVisibleBody.length<introBoardBody.length);
    const textureInterval=limActivation?.active || textIsTyping ? DEMO_TEXT_TEXTURE_INTERVAL_MS : DEMO_LIM_TEXTURE_INTERVAL_MS;
    if ((introBoardVisible || arWelcomeShowcaseActive) && (!introNoteTexture || (introBoardTextureDirty && now - introTextureUploadedAt >= textureInterval && introTextureFrameToken !== introFrameToken))) {
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
    if ((introBoardVisible || arWelcomeShowcaseActive) && introNoteTexture) {
        drawTexture(
            introNoteTexture,
            introLocalPosition(introWorldAnchor, AR_PHONE_COMFORT.boardPosition),
            AR_PHONE_COMFORT.boardScale[0] * (arWelcomeShowcaseActive ? 2500/1400 : 1),
            AR_PHONE_COMFORT.boardScale[1] * (arWelcomeShowcaseActive ? 2100/1080 : 1),
            arWelcomeShowcaseActive ? 1 : easedNote
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
        ctx.fillStyle = 'rgba(112,135,91,.98)';
        ctx.beginPath();
        ctx.moveTo(68, 30); ctx.lineTo(158, 42); ctx.lineTo(158, 238); ctx.lineTo(68, 226); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(61,82,56,.98)';
        ctx.beginPath();
        ctx.moveTo(158, 42); ctx.lineTo(194, 24); ctx.lineTo(194, 218); ctx.lineTo(158, 238); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(183,200,148,.98)';
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
            { type: orbType, color: material?.shell, coreColor: material?.core, knowledge:orbType==='plant' ? demoOrbKnowledge(record) : null }
        );
    });
    markers.forEach(record => {
        if (record.demoType !== 'zone') return;
        const style = record.demoTotemStyle || 'basic';
        const groundBaseY = Number.isFinite(Number(record.groundBaseY))
            ? Number(record.groundBaseY)
            : Number(record.position?.y || 0) - DEMO_TOTEM_HALF_HEIGHT_METRES;
        if (style === 'organic') {
            drawSpatialSphere(gl, sphereRenderer, view.projectionMatrix, view.transform.inverse.matrix, {
                ...record.position,
                y: groundBaseY + .44
            }, .44, {
                color: [.06, .24, .12],
                alpha: .98,
                emissive: .2
            });
            return;
        }
        if (style === 'flat-disc') {
            drawSpatialSphere(gl, sphereRenderer, view.projectionMatrix, view.transform.inverse.matrix, {
                ...record.position,
                y: groundBaseY + .06
            }, .48, {
                color: [.16, .43, .22],
                alpha: .98,
                emissive: .2,
                scale: { x: 1, y: .16, z: 1 }
            });
            return;
        }
        drawSpatialPrism(gl, prismRenderer, view, { ...record.position, y:groundBaseY }, {
            halfWidth: .16,
            halfHeight: .9,
            halfDepth: .16,
            color: [.45, .55, .4],
            topColor: [.68, .76, .58],
            rotationY: Math.PI / 7
        });
    });
    const linkedTotems = markers.filter(record => record.demoType === 'zone' && record.demoLinkVisible);
    if (linkedTotems.length >= 2) {
        const [first, second] = linkedTotems;
        const firstGround = Number(first.groundBaseY ?? (first.position?.y || 0) - DEMO_TOTEM_HALF_HEIGHT_METRES);
        const secondGround = Number(second.groundBaseY ?? (second.position?.y || 0) - DEMO_TOTEM_HALF_HEIGHT_METRES);
        drawSpatialTether(
            gl,
            tetherRenderer,
            view,
            { ...first.position, y: firstGround + .52 },
            { ...second.position, y: secondGround + .52 },
            { width: .012, color: [.4, .9, .72, .82], curve: .02, lift: .04 }
        );
    }

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
        if(demoKnowledgeWorkspace && record.demoType === 'plant' && record.demoExpanded) return;
        if (record.demoType === 'zone') return;
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
        const defaultPimModel = fixedPimPanelMatrix(orientDemoPimPoseToViewer(record.informationPose));
        const model = plantProfile
            ? (() => {
                const size = record.pimTextureSize || demoPimSurfaceSize(record);
                if (size.width === PIM_TEXTURE_SIZE.width && size.height === PIM_TEXTURE_SIZE.height) return defaultPimModel;
                return fixedPimPanelMatrix(
                    orientDemoPimPoseToViewer(record.informationPose),
                    DEMO_PIM_IMMERSIVE_SCALE.x * size.width / PIM_TEXTURE_SIZE.width,
                    DEMO_PIM_IMMERSIVE_SCALE.y * size.height / PIM_TEXTURE_SIZE.height
                );
            })()
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
    if(totemCardsRenderer) {
        totemCardsRenderer.begin();
        markers.filter(record=>record.demoType==='zone' && record.demoExpanded).forEach(record=>{
            if(!record.totemCardsRefreshed || performance.now()-record.totemCardsRefreshed>500) {
                record.liveTotemCards=demoTotemCards(record);record.totemCardsRefreshed=performance.now();
            }
            totemCardsRenderer.draw(view,record,{...record.position,y:record.groundBaseY ?? record.position.y-DEMO_TOTEM_HALF_HEIGHT_METRES},record.liveTotemCards,record.totemSelectedCard);
        });
        totemCardsRenderer.end();
    }
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
    const surface = [infoPanel?.hit(latestControllerRay),totemCardsRenderer?.hit(latestControllerRay)].filter(Boolean).sort((a,b)=>a.distance-b.distance)[0];
    const end = surface?.point || controllerRayEnd(latestControllerRay, demoLaserSubjects(), XR_LASER_POINTER_CONFIG.length);
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
        allowArScreenRotation();
        const arSession = await requestImmersiveArSession(appRoot);
        session = arSession.session;
        limDiagnostic('AR session start',{mode:arSession.mode || 'immersive-ar',domOverlay:Boolean(arSession.domOverlay),...limDeviceContext('xr-pointer')});
        bindLimSessionInteractions(session);
        allowArScreenRotation();
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
            if(demoKnowledgeWorkspace) {const hit=spatialDashboardRayHit(latestControllerRay,demoKnowledgePanel,demoKnowledgeMirror || {});if(hit) demoKnowledgeMirror?.activateAt(hit.pixelX,hit.pixelY);return;}
            if (demoWebModeOpen || performance.now() < suppressSessionSelectUntil) return;
            if (demoHeldIndex >= 0) return;
            if(arWelcomeIntroPending){activateImmersiveDemoControl();return;}
            if (placementReady) return pressPlacementPointer();
            if (activateDemoTotemCard(totemCardsRenderer?.hit(latestControllerRay))) return;
            if (selectDemoProfileCell()) return;
            if (selectDemoNoteTemplateAtPointer()) return;
            if (selectDemoPlantAtPointer()) return;
            if (selectDemoTotemStyleAtPointer()) return;
            // Quest controllers do not reliably generate DOM click events for
            // the optional overlay. Only after spatial targets decline the
            // select do we activate an exposed tutorial action.
            if (activateImmersiveDemoControl()) return;
            selectGuidedDemoOrb();
        });
        pimHold=bindSpatialPimHold({session,enabled:()=>!demoKnowledgeWorkspace && !demoWebModeOpen && !arWelcomeIntroPending && !placementReady && !infoPanel?.hit(latestControllerRay),
            getTarget:demoInfoTarget,activate:()=>selectDemoProfileCell(),
            progress:({record,target},amount)=>{record.pimPressPath=(target.node || target).path;record.pimPressProgress=amount;if(gl){if(record.texture)gl.deleteTexture(record.texture);record.texture=createMarkerTexture(record);}}
        });
        session.addEventListener('selectstart', () => {
            if(demoKnowledgeWorkspace) return;
            if(totemCardsRenderer?.hit(latestControllerRay)) return;
            if (demoWebModeOpen || performance.now() < suppressSessionSelectUntil) return;
            if (arWelcomeIntroPending || placementReady) return;
            const actionTarget = demoRecordAtPointer()?.record;
            if (actionTarget?.demoType === 'note') return;
            beginControllerDemoHold();
        });
        session.addEventListener('selectend', () => {
            if (demoHeldIndex < 0) {
                clearTimeout(demoHoldTimer);
                demoHoldTimer = null;
                return;
            }
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
            tickLimActivation(_time);
            infoPanel?.update(viewerMatrix, _time);
            if(!limPanelDiagnosticRecorded && infoPanel?.getPosition?.()){
                limDiagnostic('companion-panel-position',infoPanel.getPosition());
                limPanelDiagnosticRecorded=true;
            }
            pimHold?.tick(_time);
            if(!demoKnowledgeWorkspace) updateHeldDemoRecordPosition();
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
                drawDemoKnowledge(view);
                infoPanel?.draw(view);
            }
            gl.disable(gl.SCISSOR_TEST);
        };
        session.requestAnimationFrame(draw);
        return true;
    } catch (error) {
        recordArFailure(error,'Temporary demo');
        const active = session; session = null; clearSessionState(); active?.end().catch(() => {});
        return false;
    }
}

export function openTemporaryArDemoWindow(app) {
    return startTemporaryArDemo(app);
}

export async function startTemporaryArDemo(app) {
    appRoot = app;
    limDiagnostic('device-context',limDeviceContext(navigator.maxTouchPoints ? 'touch-capable' : 'mouse'));
    clearSessionState();
    const immersive = await startImmersive();
    renderInterface(!immersive);
    if (!immersive) viewerMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
