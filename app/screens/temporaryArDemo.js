import {LIM_ALL_CELLS,LIM_CELL_BY_ID,LIM_INTRO_CELL_BY_ID,LIM_PATHWAYS,limLearningContent} from '../services/limLearning.js';
import { createPimInfoPanel } from '../services/pimInfoPanel.js';
import { avoidDemoPanelOverlap } from '../services/demoPanelGeometry.js';
import { createLimActivationController } from '../services/limActivation.js';
import { advanceLimPathway, backLimPathway, completeLimPathway, idleLimPathwayState, loadLimPathwayState, pauseLimPathway, resumeLimPathway, saveLimPathwayState, startLimPathway, visitLimPathwayCell } from '../services/limPathwayState.js';
import { bindSpatialPimHold } from '../services/pimActivationHold.js';
import { createPlantKnowledgeResolver, totemKnowledgeCards, totemCardsMarkup, liveOrbCrownMarkup } from '../services/spatialKnowledgePresentation.js';
import { createSpatialTotemCards, drawSpatialTotemButtons } from '../services/spatialTotemCards.js';
const resolveOrbKnowledge = createPlantKnowledgeResolver();
import {drawArWelcomePanel} from '../services/arWelcomePanel.js';
import { WELCOME_ROOT_MILESTONES, WELCOME_ROOT_REFRESH_MS, advanceWelcomeRootProgress, welcomeRootsNeedRefresh } from '../services/arWelcomeRoots.js';
import {createWelcomePresentationClock,AR_WELCOME_SHOWCASE_DURATION,AR_WELCOME_OPENING_MS,AR_WELCOME_REDUCED_OPENING_MS,drawArWelcomeShowcase,createArWelcomeClusters,welcomeExperienceFrames,welcomeCellAtPoint,welcomeRelationshipFor,welcomeRevealIsAnimating} from '../services/arWelcomeShowcase.js';
/**
 * TRY IT NOW — a deliberately small, self-contained AR placement demo.
 * It never opens a dashboard or a draggable window before placement.
 */
import { spatialPosition } from '../services/spatialPlacement.js';
import { createMinimalMarkerDraft, relateMinimalMarkers } from '../services/markerWorkflow.js';
import { placementPointerMarkup } from '../services/placementPointer.js';
import { spatialDepthDelta, spatialMoveControlMarkup } from '../services/spatialMoveControl.js';
import { demoBeePose, drawDemoAmbientLife } from '../services/demoAmbientLife.js';
import { createSpatialSphereRenderer, destroySpatialSphereRenderer, drawSpatialOrb, drawSpatialSphere } from '../services/spatialSphereRenderer.js';
import { createSpatialTetherRenderer, destroySpatialTetherRenderer, drawSpatialTether } from '../services/spatialTetherRenderer.js';
import { createSpatialPrismRenderer, destroySpatialPrismRenderer, drawSpatialPrism } from '../services/spatialPrismRenderer.js';
import { createSpatialTriangleRenderer, destroySpatialTriangleRenderer, drawSpatialTriangle } from '../services/spatialTriangleRenderer.js';
import { AR_EXPERIENCE_CONFIG } from '../services/arExperienceConfig.js';
import { PIGEON_PEA_AR_KNOWLEDGE, PIGEON_PEA_EXAMPLE } from '../services/pigeonPeaExample.js';
import { currentNxrLanguage, translateNxrText } from '../services/i18n.js';
import { isQuestHeadsetBrowser, requestImmersiveArSession } from '../services/webxrSession.js';
import { mountDesktopSpatialPreview } from '../services/desktopSpatialPreview.js';
import { isDesktopLearningBookTarget } from '../services/desktopLearningBookTarget.js';
import { renderDesktopLearningBook } from './desktopLearningBook.js';
import { allowArScreenRotation, releaseArScreenRotation } from '../services/arScreenOrientation.js';
import { renderArIntroductionPreparation, shouldSkipArIntroductionPreparation, showArSafetyDialog } from '../services/arOnboarding.js';
import { recordArDiagnostic, recordArFailure } from '../services/arNote.js';
import { controllerRayEnd, controllerRayFromPose, handTrackingState, XR_HAND_JOINT_CONNECTIONS, XR_LASER_POINTER_CONFIG } from '../services/xrPointer.js';
import { SPATIAL_NOTE_TEMPLATES, spatialNoteTemplate } from '../services/spatialNoteTemplates.js';
import { PIM_SPATIAL_CONFIG, PIM_SPATIAL_LAYOUT_OPTIONS, pimClosingNodePaths, pimCreateInteractionState, pimExpandedNodeIds, pimNodeAtPath, pimNodeChildren, pimResetInteractionState, pimSpatialPanel, pimSpatialPoseAboveAnchor, pimToggleNodeState, pimViewportSafeArea } from '../services/plantInformationMesh.js';
import { PIM_BLOOM_DURATION_MS, PIM_TEXTURE_SIZE, createPlantInformationHoneycombTexture, pimHoneycombTargetAtPercent, pimHoneycombTextureSize } from '../services/plantInformationMeshCanvas.js?v=0.9001';
import { resolvePlantPim } from '../services/pimLegacyAdapter.js';
import { createPimDocument, pimToArKnowledge } from '../services/pimModel.js';
import { mountCreatorArKnowledge } from '../services/creatorArKnowledge.js';
import { createSpatialDashboardMirror, spatialDashboardPanelFromViewer, spatialDashboardPanelMatrix, spatialDashboardRayHit } from '../services/spatialDashboardMirror.js';
const PIGEON_PEA_CONTROL_IMAGE = new URL('../assets/pigeon-pea-cajanus-cajan.png', import.meta.url).href;
const MORINGA_PROFILE_IMAGE = new URL('../assets/moringa-oleifera.jpg', import.meta.url).href;
const DEMO_TUTORIAL_ART = Object.freeze({
    curiosity:{image:new URL('../assets/demo-tutorial-art/01-plant-curiosity.png',import.meta.url).href,alt:'A visitor pauses beside an unfamiliar plant, wondering what it is.'},
    companion:{image:new URL('../assets/demo-tutorial-art/02-companion-control-panel.png',import.meta.url).href,alt:'A visitor explores the NourishlandXR companion Control panel.'},
    references:{image:new URL('../assets/demo-tutorial-art/03-cumbersome-reference-tools.png',import.meta.url).href,alt:'A visitor carries books, a phone, compass and field guides while identifying a plant.'},
    area:{image:new URL('../assets/demo-tutorial-art/04-create-an-area.png',import.meta.url).href,alt:'A garden Area is organised as part of a living place.'},
    structure:{image:new URL('../assets/demo-tutorial-art/04b-one-place-clear-structure.png',import.meta.url).href,alt:'Signs for a food forest, rainforest walk and school garden reveal Areas within one connected place.'},
    totem:{image:new URL('../assets/demo-tutorial-art/05-totem-unfolds-garden-knowledge.png',import.meta.url).href,alt:'A Totem reveals organised plant and garden information in a dense garden.'},
    orb:{image:new URL('../assets/demo-tutorial-art/06-plant-orb-effects.png',import.meta.url).href,alt:'A Plant Orb connects a plant to its information.'},
    note:{image:new URL('../assets/demo-tutorial-art/07-add-a-plant-note.png',import.meta.url).href,alt:'A visitor adds a note beside a plant.'},
    connection:{image:new URL('../assets/demo-tutorial-art/08-connect-pimo-to-limo.png',import.meta.url).href,alt:'Plant information is connected to a learning pathway.'},
    connectedAreas:{image:new URL('../assets/demo-tutorial-art/10-connected-areas-garden.png',import.meta.url).href,alt:'A monochrome panorama of a large garden with several distinct Totems marking connected Areas.'},
    pathways:{image:new URL('../assets/demo-tutorial-art/09-explore-archetype-pathways.png',import.meta.url).href,alt:'A visitor explores connected learning pathway archetypes.'}
});
import { mountPlantInformationWeb } from '../components/plantInformationWeb.js';
import { PIGEON_PEA_PIM } from '../services/pigeonPeaPim.js';
import { enrichTrialNodes, MORINGA_TRIAL } from '../services/plantTrialContent.js';
import { bindPlantInformationMeshPress, plantInformationMeshMarkup, reconcilePlantInformationMesh } from '../services/plantInformationMeshView.js';
import { bindHoldToConfirmButton } from '../services/holdToConfirm.js';
import { DEMO_TUTORIAL_STEPS, demoTutorialControlsForStep } from '../services/demoTutorialControls.js';
import { plantInformationMeshSurfaceLayout } from '../services/plantInformationMeshSurfaceLayout.js';
import { defaultPimLimBridge, pimLimBridgeFor } from '../services/pimLimBridge.js';
import { createMeshRepository } from '../services/meshRepository.js';
import { createMeshSourceResolver, limMeshRef, pimMeshRef } from '../services/meshReferences.js';
import { createPlaceholderKnowledgeGenerator } from '../services/meshGenerator.js';
import { createMeshRelationshipService } from '../services/meshRelationships.js';
import { createMeshCompositionState } from '../services/meshCompositionState.js';
import { DEMO_CONNECTION_CHOICES, DEMO_CONNECTION_HOLD_MS, DEMO_CONNECTION_PHASES, DEMO_CONNECTION_POSITIONS, DEMO_DEEPER_CONNECTION, createDemoConnectionState, demoConnectionChoice, demoConnectionCurve, demoConnectionIsDeeper, demoConnectionSource, demoConnectionTarget, demoConnectionTargetAt, selectDemoConnectionChoice } from '../services/demoKnowledgeConnections.js';

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
let lastViewerPoseAt = 0;
let latestDemoView = null;
let hitMatrix = null;
let latestControllerRay = null;
let latestHandState = null;
let latestTrackedHandStates = [];
let demoHandMode = 'pointer';
let spatialPointerInputSeen = false;
let handPinchActive = false;
let demoControllerDepthAt = 0;
let marker = null;
let markerType = 'marker';
let markers = [];
let simulatedMode = false;
let questLaunchPending = false;
let contextCellKey = '';
let program = null;
let buffer = null;
let sphereRenderer = null;
let totemCardsRenderer = null;
let infoPanel = null;
let pimHold = null;
let demoPimHover={record:null,path:''};
let activePimLimBridge = null;
let demoRenderFailureReported = false;
const meshRepository=createMeshRepository();
const meshSourceResolver=createMeshSourceResolver({repository:meshRepository});
const meshGenerator=createPlaceholderKnowledgeGenerator();
const meshRelationships=createMeshRelationshipService({repository:meshRepository,resolver:meshSourceResolver,generator:meshGenerator});
const meshComposition=createMeshCompositionState();
function demoMeshOwnerId(record,document){return String(record?.id || record?.demoPlantPreset || document?.plantId || 'demo-plant');}
function showDemoInfo(record,path) {
    clearLimSelection();
    const document=demoOrbKnowledge(record).document;
    infoPanel?.select(record,document,path);
    const ownerId=demoMeshOwnerId(record,document);
    meshSourceResolver.registerPimDocument(document,{ownerId});
    const selectedNode=document.nodes?.find(node=>node.id===path || node.path===path);
    try{meshComposition.setActiveRef(pimMeshRef(document,selectedNode?.id,{ownerId,specimenId:String(record?.id || ownerId)}));}catch{meshComposition.setActiveRef(null);}
    const bridge=pimLimBridgeFor(document,path);
    activePimLimBridge=bridge?{bridge,record}:null;
    syncDemoPanelActions();
}
// PIM textures are intentionally large because the canvas keeps authored cell
// size readable as a branch grows. Re-uploading one on every XR hover/hold
// frame can exhaust the browser's WebGL texture budget and stop the whole
// render loop. Coalesce high-frequency feedback and keep the previous texture
// if a replacement cannot be allocated.
function replaceDemoTexture(record) {
    if (!record || !gl) return null;
    if (record.pimTextureRefreshTimer) {
        clearTimeout(record.pimTextureRefreshTimer);
        record.pimTextureRefreshTimer = 0;
    }
    const previous = record.texture || null;
    try {
        const next = createMarkerTexture(record);
        if (next && next !== previous) {
            if (previous) gl.deleteTexture(previous);
            record.texture = next;
        } else if (!next && !previous) {
            record.texture = null;
        }
        record.pimTextureFailureReported = false;
        record.pimTextureLastRefreshAt = performance.now();
        return record.texture;
    } catch (error) {
        record.texture = previous;
        if (!record.pimTextureFailureReported) {
            record.pimTextureFailureReported = true;
            recordArFailure(error, 'PIM texture refresh');
        }
        return previous;
    }
}

function queueDemoPimTextureRefresh(record) {
    if (!record || !gl || record.pimTextureRefreshTimer) return;
    const elapsed = performance.now() - (Number(record.pimTextureLastRefreshAt) || 0);
    const delay = Math.max(0, 70 - elapsed);
    record.pimTextureRefreshTimer = setTimeout(() => {
        record.pimTextureRefreshTimer = 0;
        replaceDemoTexture(record);
    }, delay);
}

function reportDemoRenderFailure(error, phase = 'demo render') {
    if (demoRenderFailureReported) return;
    demoRenderFailureReported = true;
    recordArFailure(error, phase);
    setGuide('The scene is recovering. Your information is still available.');
}
function demoInfoTarget() { return [...markers].reverse().filter(r=>r.demoType==='plant' && r.demoExpanded).map(record=>({record,target:demoPimPointerTarget(record)})).find(t=>t.target?.node || t.target?.pimBack) || null; }
function syncDemoPimHover(){
    const candidate=demoInfoTarget(),nextRecord=candidate?.record || null,nextPath=candidate?.target?.node?.path || candidate?.target?.path || '';
    if(nextRecord===demoPimHover.record && nextPath===demoPimHover.path)return;
    const previous=demoPimHover.record;demoPimHover={record:nextRecord,path:nextPath};
    for(const record of new Set([previous,nextRecord].filter(Boolean))) queueDemoPimTextureRefresh(record);
}
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
let arWelcomeRootMilestone=WELCOME_ROOT_MILESTONES.arrival, arWelcomeRootMilestoneStartedAt=0, arWelcomeRootsLastRefreshAt=-Infinity;
let arWelcomeStartedAt=0, arWelcomeIntroPending=false, arWelcomeSharedBoard=false;
let limMeshActivatedAt=NaN,arWelcomeOpeningActive=false,arWelcomeOpeningDuration=AR_WELCOME_OPENING_MS,arWelcomeOpeningSeed=0;
let arWelcomeRenderedFrames=[];
let arWelcomeUnlockTimer=null, arWelcomeLayer=null, arWelcomeCanvas=null;
let knowledgeCombinationState=null,knowledgeCombinationCleanup=()=>{},knowledgeCombinationHold=null;
let ambientCanvas=null,ambientBeeModel=null,ambientBeeSpriteTexture=null,ambientBeeSpriteUploadedAt=-Infinity,ambientBeesStartedAt=NaN,ambientWorldAnchor=null,ambientLastPaint=0;
let demoRainIntensity=1;
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
let introPointerTexture = null, introPointerTextureKind = '';
let introTaglineVisible = true;
let introKnowledgeVisible = false;
let introBoardStep = '';
let introBoardTitle = 'NourishlandXR';
let introBoardBody = 'A short guided demo of Plant Orbs, Areas and Notes.';
let introBoardNextGuide = '';
let introBoardNextGuideVisible = false;
let placementReady = false, placementDistance = AR_EXPERIENCE_CONFIG.placementDistanceMetres;
let demoHeldIndex = -1;
let suppressDemoMarkerClick = false;
let suppressSessionSelectUntil = 0;
let demoWebModeOpen = false;
let demoPimWebController = null;
let demoHoldButtonCleanup = null;
let demoViewportCleanup = null;
let groundYEstimate = null;
let demoTutorialStep = DEMO_TUTORIAL_STEPS.WELCOME;
let demoOrientationStep=-1,demoPanelControlsCleanup=()=>{},demoPanelActionSignature='',elementPanelActionSignature='';
let desktopSpatialPreviewCleanup=()=>{};
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
    // Give the left-side reading panel room in the spatial view.
    boardPosition: [0.42, 0.82, -2.8],
    boardScale: [5.6, 10.8]
});
// Keep the primary trigger on the central screen rather than floating beneath it.
// It sits slightly in front of the screen so the texture remains crisp and the
// shared ray hit target can still resolve it independently from LIM cells.
const INTRO_CONTROL_POSITION = Object.freeze([0.42, 0.16, -2.755]);
const INTRO_CONTROL_SCALE = Object.freeze([1.05, .72]);
const DEMO_QUEST_ORB_SCALE = 0.62;
// The shared demo quad is .4 m by .16 m before model scaling. These values
// produce the configured 1.44 m by 1.08 m transparent PIM interaction wall.
const DEMO_PIM_IMMERSIVE_SCALE = Object.freeze({
    x: PIM_SPATIAL_CONFIG.expandedSurfaceWidthMetres / .4,
    y: PIM_SPATIAL_CONFIG.expandedSurfaceHeightMetres / .16
});
// Creator Mode's medium Note is 1.88 m x .69 m on the shared quad. The demo
// keeps the same real-world proportions at 88% so it reads as a nearby Note,
// without turning into a flyaway presentation board.
const DEMO_NOTE_IMMERSIVE_SCALE = Object.freeze({ x: 2.15, y: 1.65 });
const DEMO_TOTEM_HALF_HEIGHT_METRES = .82;
const DEMO_STABLE_EYE_HEIGHT_METRES = 1.55;
const WELCOME_BOARD_PARAGRAPHS = Object.freeze([
    'Welcome to NourishlandXR',
    'Explore how plants, places and knowledge connect.',
    'A short guided demonstration will introduce the controls before the journey continues.'
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
const DEMO_WELCOME_OPENING_MS=12000;
const DEMO_WELCOME_TITLE_HOLD_MS=2800;
const DEMO_WELCOME_DESCRIPTION_HOLD_MS=10000;
const DEMO_WELCOME_CONTINUE_MS=12000;
export const welcomeAutoAdvanceReady=(elapsed,reducedMotion=false)=>elapsed>=(reducedMotion?AR_WELCOME_REDUCED_OPENING_MS:DEMO_WELCOME_CONTINUE_MS)+2500;
export const demoRainProgress=elapsed=>Math.max(0,Math.min(1,(elapsed-12000)/5000));
const DEMO_ARCHETYPE_START_MS=20500;
const DEMO_ARCHETYPE_INTERVAL_MS=2500;
const DEMO_ARCHETYPE_REVEAL_MS=1400;
// Canvas texture uploads are expensive on phones. Coalesce the continuously
// changing welcome copy/mesh into a modest cadence so typing and input stay
// responsive while the XR frame loop remains free to render at 60fps.
const DEMO_TEXT_TEXTURE_INTERVAL_MS = 48;
const DEMO_LIM_TEXTURE_INTERVAL_MS = 64;
const DEMO_LIM_SURFACE_CANVAS = Object.freeze({width:1600,height:1344});
const AR_WELCOME_SETTLED_MS = 64000;
const DEMO_PLANT_ORB_HOLD_DELAY_MS = 800;
// A paused XR/browser timer must never leave the demo waiting forever for
// the last character. The copy still types in normally, then completes within
// this bounded window so Continue remains available on every runtime.
// Only a suspended/background tab should need the safety timeout. A normal
// narration must finish character-by-character without snapping its tail in.
const DEMO_BOARD_TYPING_SAFETY_MS = 30000;
const DEMO_SEQUENCE = ['plant', 'plant2', 'note', 'totem'];
const DEMO_JOURNEY_STAGES = Object.freeze([
    Object.freeze({id:'why',label:'Why'}),
    Object.freeze({id:'map',label:'Map'}),
    Object.freeze({id:'know',label:'Know'}),
    Object.freeze({id:'apply',label:'Apply'}),
    Object.freeze({id:'connect',label:'Connect'}),
    Object.freeze({id:'impact',label:'Impact'})
]);
let demoJourneyStage='why';

function setDemoJourneyStage(stageId) {
    if(!DEMO_JOURNEY_STAGES.some(stage=>stage.id===stageId))return;
    demoJourneyStage=stageId;
    infoPanel?.setHeaderProgress({label:'Demo journey',steps:DEMO_JOURNEY_STAGES,activeId:stageId});
}
function advanceWelcomeRootMilestone(milestone) {
    const next=advanceWelcomeRootProgress(
        {milestone:arWelcomeRootMilestone,milestoneStartedAt:arWelcomeRootMilestoneStartedAt},
        milestone,
        arWelcomeClock?.elapsed
    );
    if(!next.changed)return;
    arWelcomeRootMilestone=next.milestone;
    arWelcomeRootMilestoneStartedAt=next.milestoneStartedAt;
    arWelcomeRootsLastRefreshAt=-Infinity;
    introBoardTextureDirty=true;
}
function demoHexColour(value,fallback=[.32,.52,.36]){
    const match=String(value||'').match(/^#?([\da-f]{6})$/i);
    if(!match)return fallback;
    return match[1].match(/[\da-f]{2}/gi).map(part=>parseInt(part,16)/255);
}
const DEMO_ORB_MATERIALS = Object.freeze({
    brown: {
        shell: [0.34, 0.23, 0.14],
        core: [0.67, 0.48, 0.27],
        radius: 0.07,
        style: '--demo-orb-size:56px;--demo-orb-light:#ead7ba;--demo-orb-mid:#8a6946;--demo-orb-dark:#3e2a1c;--demo-orb-core-light:#f1dfbd;--demo-orb-core-mid:#a77b48;--demo-orb-core-dark:#4d321e'
    },
    pigeonPea: {
        shell: [0.05, 0.34, 0.38],
        core: [0.42, 0.9, 0.82],
        ring: [0.55, 0.95, 0.92],
        radius: 0.065,
        style: '--demo-orb-size:56px;--demo-orb-light:#b8f2e9;--demo-orb-mid:#238a8a;--demo-orb-dark:#073a44;--demo-orb-ring:#8ff4e6'
    },
    green: {
        shell: [0.48, 0.18, 0.05],
        core: [0.98, 0.62, 0.14],
        ring: [1, 0.78, 0.25],
        radius: 0.074,
        style: '--demo-orb-size:62px;--demo-orb-light:#ffe0a0;--demo-orb-mid:#d17723;--demo-orb-dark:#6b250c;--demo-orb-ring:#ffc84a'
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
        title: 'Welcome to this area',
        accent: '#785a43',
        bubbles: [
            'NOTES · nearby',
            'PLANT ORBS · around this Totem',
            'NEIGHBOUR TOTEM · right'
        ]
    },
    zoneTwo: {
        title: 'Welcome to this area',
        accent: '#438f99',
        bubbles: [
            'NOTES · nearby',
            'PLANT ORBS · around this Totem',
            'NEIGHBOUR TOTEM · left'
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
            identityStatement: 'A fast-growing food and support tree for tropical and subtropical gardens.',
            image: MORINGA_PROFILE_IMAGE
        }),
        sources: MORINGA_TRIAL.sources,
        nodes: Object.freeze(enrichTrialNodes([
            { id: 'moringa-forest-layer', parentId: 'food-forest', title: 'Canopy / low tree layer', preview: 'Light canopy role', body: 'A fast-growing low tree within a layered food forest.', informationType: 'fact', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-canopy-management', parentId: 'moringa-forest-layer', title: 'Canopy management', preview: 'Prune for light and access', body: 'Regular pruning can keep the canopy low enough for harvest while allowing useful light to reach plants below. Observe regrowth and adjust the cutting cycle to the season and the needs of neighbouring plants.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-layer-observation', parentId: 'moringa-forest-layer', title: 'Layer observation', preview: 'Watch shade through the year', body: 'Record where shade falls in different seasons and times of day. This makes the tree layer a local observation rather than a fixed label.', informationType: 'local_observation', evidenceStatus: 'local_observation', status: 'published' },
            { id: 'moringa-relationships', parentId: 'food-forest', title: 'Garden relationships', preview: 'Shade and mulch', body: 'Light shade and pruned biomass can support nearby garden plants.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-biomass-cycle', parentId: 'moringa-relationships', title: 'Biomass cycle', preview: 'Return suitable prunings', body: 'Clean leaves and soft stems can be cut into manageable pieces and used as surface mulch. Keep material clear of vulnerable stems and exclude diseased material.', informationType: 'practice', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-pollinator-observation', parentId: 'moringa-relationships', title: 'Flower visitors', preview: 'Observe insects at flowers', body: 'When the tree flowers, record which insects visit, the time of day and whether nearby plants are flowering too. This creates a place-based relationship record.', informationType: 'local_observation', evidenceStatus: 'local_observation', status: 'published' },
            { id: 'moringa-culinary', parentId: 'uses', title: 'Culinary', preview: 'Leaves and pods', body: 'Nutritious leaves and long seed pods are used as food.', informationType: 'practice', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-leaf-harvest', parentId: 'moringa-culinary', title: 'Leaf harvest', preview: 'Pick clean young leaflets', body: 'Harvest clean foliage from correctly identified plants and use preparation methods appropriate to the dish and local food practice. Leave enough healthy canopy for continued growth.', informationType: 'practice', evidenceStatus: 'needs_review', safetyNote: 'Confirm plant identity and use an appropriate food preparation method.', status: 'published' },
            { id: 'moringa-pod-harvest', parentId: 'moringa-culinary', title: 'Pod harvest', preview: 'Tender and mature stages differ', body: 'Tender pods and mature seed are distinct harvest stages with different textures and preparation needs. Record the stage rather than treating every pod as the same food.', informationType: 'guidance', evidenceStatus: 'needs_review', safetyNote: 'Use a preparation method suitable for the harvested stage.', status: 'published' },
            { id: 'moringa-food-context', parentId: 'moringa-culinary', title: 'Food context', preview: 'Retain recipe and source', body: 'A useful food record includes the part used, harvest stage, preparation method, recipe tradition and the person or source that supplied the knowledge.', informationType: 'traditional_knowledge', evidenceStatus: 'community_contributed', attribution: 'A named recipe source, knowledge holder or community should accompany a specific food practice.', safetyNote: 'Traditional food records do not replace allergy or dietary advice.', status: 'published' },
            { id: 'medicinal', parentId: 'uses', title: 'Medicinal', preview: 'Attributed traditions', body: 'Traditional uses must record their source and cultural context.', informationType: 'traditional_knowledge', evidenceStatus: 'needs_review', safetyNote: 'Traditional knowledge only; not medical advice.', status: 'published' },
            { id: 'moringa-medicinal-boundary', parentId: 'medicinal', title: 'Knowledge boundary', preview: 'Attribute and limit claims', body: 'Record who shared a practice, where it belongs, which plant part was discussed and any limits on sharing. Do not convert a cultural record into a universal health claim.', informationType: 'traditional_knowledge', evidenceStatus: 'community_contributed', attribution: 'A named knowledge holder or community is required for a specific traditional-use record.', safetyNote: 'This is not medical advice. Seek qualified health guidance where needed.', status: 'published' },
            { id: 'craft', parentId: 'uses', title: 'Craft', preview: 'Dry stems', body: 'Dry stems and other garden material can be used in simple crafts.', informationType: 'practice', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-garden-materials', parentId: 'craft', title: 'Garden materials', preview: 'Use dry pruned stems', body: 'Dry straight stems can be trialled as lightweight garden markers, temporary supports or learning materials. Their durability depends on stem age, preparation and exposure.', informationType: 'practice', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-seed', parentId: 'propagation', title: 'Seed', preview: 'Direct sowing', body: 'Seed and direct sowing are common starting methods.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-seed-selection', parentId: 'moringa-seed', title: 'Seed selection', preview: 'Choose mature labelled seed', body: 'Select mature seed from healthy pods and retain the source, harvest date and parent-plant notes. Labelling lets later growers compare germination and local performance.', informationType: 'practice', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-germination', parentId: 'moringa-seed', title: 'Germination', preview: 'Warmth with careful moisture', body: 'Use warm conditions and a free-draining medium. Keep the medium suitably moist without prolonged saturation, and record emergence time instead of assuming every seed lot behaves alike.', informationType: 'guidance', evidenceStatus: 'needs_review', climateContext: 'Temperature and moisture affect emergence.', status: 'published' },
            { id: 'moringa-cuttings', parentId: 'propagation', title: 'Cuttings', preview: 'Vegetative start', body: 'Cuttings are another propagation pathway.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-cutting-establishment', parentId: 'moringa-cuttings', title: 'Cutting establishment', preview: 'Monitor stability and new growth', body: 'Protect a new cutting from movement while roots establish. Record new growth, water response and stability before treating it as an established tree.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-botanical-name', parentId: 'scientific-information', title: 'Botanical name', preview: 'Moringa oleifera', body: 'Moringa oleifera', informationType: 'fact', evidenceStatus: 'verified', status: 'published' },
            { id: 'moringa-family', parentId: 'scientific-information', title: 'Family', preview: 'Moringaceae', body: 'Moringaceae', informationType: 'fact', evidenceStatus: 'verified', status: 'published' },
            { id: 'moringa-growth-form', parentId: 'scientific-information', title: 'Growth form', preview: 'Fast-growing small tree', body: 'A fast-growing small tree.', informationType: 'fact', evidenceStatus: 'sourced', status: 'published' },
            { id: 'moringa-leaf-form', parentId: 'moringa-growth-form', title: 'Leaf form', preview: 'Compound leaves with small leaflets', body: 'The foliage is made of compound leaves carrying many small leaflets. Use several features together when identifying a plant rather than relying on leaves alone.', informationType: 'fact', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-flowering', parentId: 'moringa-growth-form', title: 'Flowering and pods', preview: 'Flowers followed by long pods', body: 'Flowering and pod development vary with plant age, season, water and management. Dated local observations make this general pattern useful in a real place.', informationType: 'fact', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-origin', parentId: 'historical-data', title: 'Origin', preview: 'South Asia', body: 'Documented origin in South Asia.', informationType: 'historical_record', evidenceStatus: 'sourced', status: 'published' },
            { id: 'moringa-origin-sources', parentId: 'moringa-origin', title: 'Origin sources', preview: 'Keep historical claims traceable', body: 'Retain the publication, date, region and wording used for an origin claim. This allows later reviewers to distinguish evidence from repeated summaries.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-food-cultures', parentId: 'historical-data', title: 'Food cultures', preview: 'Tropical cultivation', body: 'Cultivated through many tropical regions.', informationType: 'historical_record', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-local-names', parentId: 'moringa-food-cultures', title: 'Local names and practices', preview: 'Record language and place', body: 'Record a local name with its language, place, contributor and the plant part or practice it refers to. Similar names can carry different meanings in different regions.', informationType: 'traditional_knowledge', evidenceStatus: 'community_contributed', attribution: 'A named contributor or community should accompany each local record.', status: 'published' },
            { id: 'moringa-climate', parentId: 'cultivation', title: 'Climate', preview: 'Tropical and subtropical', body: 'Adapted to tropical and subtropical growing conditions.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-seasonal-response', parentId: 'moringa-climate', title: 'Seasonal response', preview: 'Observe heat, rain and cool periods', body: 'Track leaf growth, flowering, pod set and stress through local wet, dry, hot and cool periods. The record is more useful than a climate label alone.', informationType: 'local_observation', evidenceStatus: 'local_observation', status: 'published' },
            { id: 'moringa-care', parentId: 'cultivation', title: 'Growing care', preview: 'Sun, drainage, pruning', body: 'Grow in full sun and free-draining soil, with regular pruning where appropriate.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-soil-drainage', parentId: 'moringa-care', title: 'Soil and drainage', preview: 'Avoid prolonged saturation', body: 'Establishment is generally more reliable where excess water can drain. Observe the actual soil after heavy rain before deciding how often to water.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-establishment-water', parentId: 'moringa-care', title: 'Establishment water', preview: 'Support roots, then reassess', body: 'Provide appropriate moisture while roots establish, then adjust watering to rainfall, soil drainage, season and the condition of the plant.', informationType: 'guidance', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-pruning-cycle', parentId: 'moringa-care', title: 'Pruning cycle', preview: 'Height, harvest and regrowth', body: 'Pruning can keep foliage reachable and produce mulch material. Record the cut date, severity and regrowth response so the cycle can be adapted rather than repeated blindly.', informationType: 'practice', evidenceStatus: 'needs_review', status: 'published' },
            { id: 'moringa-health-observation', parentId: 'moringa-care', title: 'Plant health observation', preview: 'Notice change before treatment', body: 'Record where symptoms occur, when they began, recent weather, watering and management changes before choosing a response. Photographs over time can help distinguish damage from normal seasonal change.', informationType: 'local_observation', evidenceStatus: 'local_observation', status: 'published' }
        ], MORINGA_TRIAL, 'moringa-agroforestry'))
    })
});
export const MORINGA_PIM = Object.freeze(resolvePlantPim(MORINGA_PROFILE, {
    id: 'moringa-oleifera',
    plantId: 'moringa-oleifera',
    name: 'Moringa Tree',
    commonName: 'Moringa Tree',
    title: 'Moringa Tree',
    scientificName: 'Moringa oleifera'
}));
const MORINGA_KNOWLEDGE = Object.freeze(pimToArKnowledge(MORINGA_PIM));
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
    return pimSpatialPanel(pose, {
        width: PIM_SPATIAL_CONFIG.expandedSurfaceWidthMetres * size.width / PIM_TEXTURE_SIZE.width,
        height: PIM_SPATIAL_CONFIG.expandedSurfaceHeightMetres * size.height / PIM_TEXTURE_SIZE.height
    });
}
const NOTE_TEMPLATES = Object.freeze(Object.fromEntries(SPATIAL_NOTE_TEMPLATES.map(item => [item.id, Object.freeze({
    title: item.title,
    accent: item.color,
    lines: item.topics.length
        ? item.topics.map(topic => `${topic.title.toUpperCase()}  ${topic.body}`)
        : [item.description]
})])));
const DEMO_NOTE_TEMPLATE_KEYS = Object.freeze(Object.keys(NOTE_TEMPLATES));

function clearSessionState() {
    appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-lim-opening');
    appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-lim-surface');
    closeDemoKnowledge(true);
    demoPanelControlsCleanup();demoPanelControlsCleanup=()=>{};demoPanelActionSignature='';elementPanelActionSignature='';contextCellKey='';demoPimHover={record:null,path:''};demoOrientationStep=-1;limMeshVisible=true;learningModule=null;learningModuleStep=0;activePimLimBridge=null;demoJourneyStage='why';demoRenderFailureReported=false;
    arWelcomeRootMilestone=WELCOME_ROOT_MILESTONES.arrival;arWelcomeRootMilestoneStartedAt=0;arWelcomeRootsLastRefreshAt=-Infinity;
    limInteractionCleanup();limSessionCleanup();limInteractionCleanup=()=>{};limSessionCleanup=()=>{};limActivation=null;limActivationSessionSuppressUntil=0;
    releaseArScreenRotation();
    hitTestSource?.cancel?.();
    hitTestSource = null;
    referenceSpace = null;
    viewerMatrix = null;
    lastViewerPoseAt = 0;
    latestDemoView = null;
    hitMatrix = null;
    latestControllerRay = null;
    latestHandState = null;
    latestTrackedHandStates = [];
    demoHandMode = 'pointer';
    spatialPointerInputSeen = false;
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
    clearTimeout(arWelcomeUnlockTimer);arWelcomeUnlockTimer=null;arWelcomeStartedAt=0;arWelcomeIntroPending=false;arWelcomeSharedBoard=false;limMeshActivatedAt=NaN;arWelcomeOpeningActive=false;arWelcomeOpeningDuration=AR_WELCOME_OPENING_MS;arWelcomeOpeningSeed=0;arWelcomeRenderedFrames=[];
    knowledgeCombinationCleanup();knowledgeCombinationCleanup=()=>{};knowledgeCombinationState=null;knowledgeCombinationHold=null;
    arWelcomeLayer?.remove();arWelcomeLayer=null;arWelcomeCanvas=null;limHiddenCells=new Set();limExpandedCells=new Set();limExpandedAt=new Map();limPointerKey='';limPointerId=null;limInputSource=null;
    ambientBeeModel?.destroy();ambientBeeModel=null;if(ambientBeeSpriteTexture)gl?.deleteTexture(ambientBeeSpriteTexture);ambientBeeSpriteTexture=null;ambientBeeSpriteUploadedAt=-Infinity;ambientCanvas=null;ambientBeesStartedAt=NaN;ambientWorldAnchor=null;ambientLastPaint=0;
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
    introBoardNextGuide = '';
    introBoardNextGuideVisible = false;
    introBoardTextureDirty = true;
    introTextureUploadedAt = 0;
    introFrameToken = 0;
    introTextureFrameToken = -1;
    introKnowledgeTexture = null;
    introControlTexture = null;
    introControlTextureLabel = '';
    introPointerTexture = null;
    introPointerTextureKind = '';
    demoPimWebController?.destroy();
    demoPimWebController = null;
    demoHoldButtonCleanup?.();
    demoHoldButtonCleanup = null;
    demoViewportCleanup?.();
    demoViewportCleanup = null;
    desktopSpatialPreviewCleanup();
    desktopSpatialPreviewCleanup=()=>{};
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
    if (guide) guide.textContent = questControlGuide(message);
}

function questControlGuide(message){
    const copy=String(message||'');
    return sessionMode==='immersive-vr'
        ? copy.replace(/(?:the )?round (Continue|Place a plant orb) trigger(?: at the bottom centre)?/gi,(_match,label)=>`${label} in the Control panel`)
        : copy;
}

function setIntroBoardNextGuide(message,{reveal=true}={}) {
    introBoardNextGuide=questControlGuide(message).trim();
    introBoardNextGuideVisible=Boolean(reveal && introBoardNextGuide);
    introBoardTextureDirty=true;
    const textWindow=appRoot?.querySelector('[data-tryit-guided-choice] .tryit-board-text-window');
    if(!textWindow)return;
    let cue=textWindow.querySelector('.tryit-board-next');
    if(!introBoardNextGuide){cue?.remove();return;}
    if(!cue){cue=document.createElement('p');cue.className='tryit-board-next';textWindow.append(cue);}
    cue.textContent=`Next · ${introBoardNextGuide}`;
    cue.hidden=!reveal;
}
function revealIntroBoardNextGuide(){
    if(!introBoardNextGuide)return;
    introBoardNextGuideVisible=true;introBoardTextureDirty=true;
    appRoot?.querySelector('[data-tryit-guided-choice] .tryit-board-next')?.removeAttribute('hidden');
}

function demoControlIsVisible(selector) {
    const element=appRoot?.querySelector(selector);
    return Boolean(element && !element.hidden && !element.disabled);
}

function demoPanelActions() {
    const actions=[];
    const desktopDemo=Boolean(appRoot?.querySelector('.tryit-demo.is-desktop-spatial-preview'));
    if(simulatedMode && demoControlIsVisible('[data-tryit-open-live-tag]'))actions.push({id:'live-tag',label:'Open Plant Live Tag'});
    if(demoOrientationStep>0 && demoTutorialStep===DEMO_TUTORIAL_STEPS.WELCOME)actions.push({id:'back',label:'Previous'});
    if(activePimLimBridge && demoTutorialStep===DEMO_TUTORIAL_STEPS.PIM)actions.push({id:'pim-lim',label:'Why does this matter?'});
    if(arWelcomeShowcaseActive && ['apply','connect','impact'].includes(demoJourneyStage))actions.push({id:'lim-visibility',label:limMeshVisible?'Hide learning cells':'Show learning cells'});
    if(!desktopDemo)actions.push({id:'safety',label:'Safety guidance'});
    if(simulatedMode && isQuestHeadsetBrowser())actions.push({id:'quest',label:questLaunchPending?'Opening Spatial device…':'Enter Spatial device',disabled:questLaunchPending});
    actions.push({id:'close',label:'Close demo'});
    const continueButton=appRoot?.querySelector('[data-tryit-intro-continue]');
    if(continueButton && !continueButton.hidden)actions.push({id:'continue',label:continueButton.textContent.trim() || 'Continue',primary:true,disabled:continueButton.disabled});
    const priorities=actions.filter(item=>item.id==='close' || item.id==='continue');
    const ordinary=actions.filter(item=>!priorities.includes(item));
    return [...ordinary,...priorities].slice(-8);
}

function syncDemoPanelActions() {
    if(!infoPanel)return;
    const actions=demoPanelActions(),signature=JSON.stringify(actions);
    const primary=actions.find(item=>item.primary || item.id==='continue');
    const externalTrigger=simulatedMode || domOverlayEnabled;
    const trigger=appRoot?.querySelector('[data-tryit-context-trigger]');
    if(trigger){trigger.hidden=!(externalTrigger && primary);trigger.disabled=Boolean(primary?.disabled);trigger.dataset.contextMode=primary?.id || '';trigger.textContent=primary?.label || '';trigger.setAttribute('aria-label',primary?.label || 'Context action');
        const board=appRoot?.querySelector('[data-tryit-guided-choice]');
        const mainScreen=arWelcomeLayer || board;
        // Desktop preview keeps the action on its rendered surface. Phone AR
        // uses the safe-area footer so the action never obscures the scene.
        const desktopPreview=Boolean(appRoot?.querySelector('.tryit-demo.is-desktop-spatial-preview'));
        const phoneFooterAction=simulatedMode && !desktopPreview;
        trigger.classList.toggle('is-phone-footer-action',phoneFooterAction);
        if(simulatedMode && primary?.id==='continue' && mainScreen && desktopPreview)mainScreen.append(trigger);
        else if(trigger.parentElement!==appRoot)appRoot?.append(trigger);
    }
    // Journey progression always belongs to the main experience surface.
    // The Control panel keeps only persistent tools and navigation.
    const panelActions=primary?actions.filter(item=>item!==primary):actions;
    if(signature===demoPanelActionSignature && JSON.stringify(panelActions)===elementPanelActionSignature)return;
    demoPanelActionSignature=signature;
    elementPanelActionSignature=JSON.stringify(panelActions);
    infoPanel.setUtilityActions(panelActions);
    appRoot?.querySelector('.tryit-demo')?.classList.add('has-companion-actions');
}

function setLimMeshVisible(visible) {
    if(visible && !limMeshVisible)limMeshActivatedAt=arWelcomeClock.elapsed;
    limMeshVisible=Boolean(visible);
    if(limMeshVisible)infoPanel?.showLearning({id:'lim-archetype-invitation',title:'Connected learning',body:'This view turns information into useful questions. Read what is here, understand relationships, connect knowledge to purpose, then choose an action and learn from the result.',accent:'#dfff9b',mesh:'lim',editable:false});
    introBoardTextureDirty=true;
    paintWelcomeLayer(performance.now());
    syncDemoPanelActions();
}

function handleDemoPanelAction(action) {
    if(action==='continue'){appRoot?.querySelector('[data-tryit-intro-continue]:not([hidden])')?.click();return;}
    if(action==='live-tag'){appRoot?.querySelector('[data-tryit-open-live-tag]:not([hidden])')?.click();return;}
    if(action==='pim-lim'){openPimLimBridge(activePimLimBridge);return;}
    if(action==='safety'){showArSafetyDialog(appRoot?.querySelector('.tryit-demo'));return;}
    if(action==='back' && demoOrientationStep>0){runArWelcomeTutorial(demoOrientationStep-1);return;}
    if(action==='skip'){skipDemoNarration?.();return;}
    if(action==='lim-visibility'){setLimMeshVisible(!limMeshVisible);return;}
    if(action==='quest'){void retryQuestImmersive();return;}
    if(action==='recenter'){infoPanel?.recenter();return;}
    if(action==='close')returnToWelcome();
}

async function retryQuestImmersive() {
    if(questLaunchPending || !simulatedMode)return;
    questLaunchPending=true;syncDemoPanelActions();setGuide('Opening Spatial device immersive mode…');
    const immersive=await startImmersive();
    questLaunchPending=false;
    renderInterface(!immersive);
    if(!immersive){
        viewerMatrix=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
        setGuide('Spatial device immersive mode is not available here. Preview mode remains open.');
    }
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
        liveTagButton.hidden = !simulatedMode || !controls.showOpenPlantLiveTag;
        if (liveTagButton.hidden) liveTagButton.onclick = null;
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
        plant2: ['Apply the thinking in the place', 'Pigeon Pea can provide food, seed and support. Add Moringa to compare a different plant role and see how more than one plant becomes part of the same living map.'],
        note: ['Turn attention into a record', 'The plants provide reference knowledge. A Note adds what someone actually sees, remembers or needs to do in this place.']
    };
    const [title, text] = messages[nextStage] || ['Continue the journey', 'Move to the next tutorial step.'];
    showGuidedChoice(`<h2>${title}</h2><p>${text}</p><button type="button" data-demo-choice="continue">Continue</button>`, choice => {
        if (choice === 'continue') armDemoPlacement(nextStage,{explained:nextStage==='note'});
    },{nextGuide:nextStage==='note'?'':undefined});
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
          <section class="tryit-virtual-tag-pim" aria-label="Pigeon Pea plant information"><div data-demo-pim-web-mount></div></section>
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
        if (record.tutorialStage === 'plant2') showDemoAction('note');
        else armDemoPlacement('plant2');
    }, 320);
}

function openDemoVirtualTag(record) {
    // Web Mode is a useful flat-screen preview, but opening a DOM workspace in
    // immersive WebXR can become a browser-owned white surface. Keep headset
    // visitors in the spatial scene and advance the same tutorial state.
    if (!simulatedMode || session) {
        advancePastVirtualTag(record);
        return;
    }
    openDemoKnowledge(record);
}

function advancePastVirtualTag(record) {
    if (!record) return;
    setDemoTutorialStep(DEMO_TUTORIAL_STEPS.PLACEMENT);
    if (record.tutorialStage === 'plant2') showDemoAction('note');
    else armDemoPlacement('plant2');
}

function inviteVirtualTag(record) {
    if (!simulatedMode || session) {
        showGuidedChoice('<h2>Knowledge stays available</h2><p>The Orb keeps this plant’s profile in the spatial map. The same published information can also be reached through an ordinary web view, so a headset is never required.</p>', () => {}, {
            persistent: true,
            tutorialStep: DEMO_TUTORIAL_STEPS.PLACEMENT
        });
        setDemoTutorialStep(DEMO_TUTORIAL_STEPS.PLACEMENT);
        const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
        if (continueButton) {
            continueButton.textContent = demoLocalizedText('Continue');
            continueButton.hidden = false;
            continueButton.onclick = () => advancePastVirtualTag(record);
        }
        return;
    }
    showGuidedChoice(`<h2>One map, more than one way to enter</h2><p>${record?.name || 'This plant'} can be explored here in the spatial map or opened as an ordinary Web Mode profile. This keeps the experience accessible to classrooms, visitors and people without XR equipment.</p>`, () => {}, {
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
    record.demoProfileReady = false;
    if (record.tutorialStage === 'plant2') inviteVirtualTag(record);
    else if (record.tutorialStage === 'plant') {
        clearLimSelection();
        limMeshVisible=false;
        activePimLimBridge=null;
        showDemoAction('plant2');
    }
    return true;
}

const LIM_APPLICATION_LENSES = Object.freeze([
    Object.freeze({
        title:'Read what is here',
        explanation:'Begin with what can be observed in this place. General plant information becomes more useful when it is checked against season, light, water, soil and the plant in front of you.'
    }),
    Object.freeze({
        title:'Understand how it works',
        explanation:'Follow the living logic. Ask how the plant grows, what it depends on, what it supports and which parts of the information remain uncertain.'
    }),
    Object.freeze({
        title:'Connect information to purpose',
        explanation:'A fact becomes practical when it serves a purpose. Seed might become food, another plant, a shared resource or part of a wider planting design.'
    }),
    Object.freeze({
        title:'Choose, observe and learn',
        explanation:'Turn the purpose into a small decision. Record what happens, compare it with the intention and adjust when the place gives new feedback.'
    })
]);

function prepareLimPitchCell(cellId) {
    limMeshVisible=true;
    limMeshActivatedAt=arWelcomeClock.elapsed-AR_WELCOME_SETTLED_MS;
    const cell=LIM_INTRO_CELL_BY_ID[cellId];
    if(cell?.parentId){
        limExpandedCells.add(cell.parentId);
        limExpandedAt.set(cell.parentId,arWelcomeClock.elapsed-5000);
    }
    introBoardTextureDirty=true;
    paintWelcomeLayer(performance.now());
    const node=welcomeFrames().flatMap(frame=>frame.nodes).find(candidate=>(candidate.limId || candidate.label)===cellId);
    if(node)activateLimCell(node.key);
    syncDemoPanelActions();
}

function runLimApplicationStory(bridge,index=0) {
    const lens=LIM_APPLICATION_LENSES[index];
    const cellId=bridge?.limIds?.[index];
    if(!lens || !cellId){
        finishIntroBoard();
        clearLimSelection();
        limMeshVisible=false;
        activePimLimBridge=null;
        showDemoAction('plant2');
        return;
    }
    setDemoJourneyStage('apply');
    prepareLimPitchCell(cellId);
    const cellTitle=LIM_INTRO_CELL_BY_ID[cellId]?.title || limLearningContent(cellId).title;
    const final=index===LIM_APPLICATION_LENSES.length-1;
    showIntroBoard(
        lens.title,
        [lens.explanation,`In this example, the connected learning topic is “${cellTitle}”. Select other visible topics whenever you want to explore further.`],
        final?'Apply this to the map':'Continue',
        ()=>{
            suppressSessionSelectUntil=performance.now()+700;
            if(final){
                finishIntroBoard();
                clearLimSelection();
                limMeshVisible=false;
                activePimLimBridge=null;
                showDemoAction('plant2');
                return;
            }
            runLimApplicationStory(bridge,index+1);
        },
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:`Putting information to work · ${index+1} of ${LIM_APPLICATION_LENSES.length}`,nextGuide:final?'Add a second plant to apply the reasoning in the mapped place.':'Continue through the next way of thinking.'}
    );
}

function openPimLimBridge(context) {
    const bridge=context?.bridge;
    const record=context?.record;
    if(!bridge || !record)return false;
    record.demoProfileInteracted=true;
    setDemoJourneyStage('apply');
    activePimLimBridge={bridge,record};
    infoPanel?.setLearningModules(learningModuleBoard());
    prepareLimPitchCell(bridge.limIds[0]);
    showIntroBoard(
        bridge.title,
        [
            `Plant information · ${bridge.sourceTitle}`,
            bridge.question,
            bridge.application,
            'Connected learning moves from “what is this?” to “what could I do with this here?”'
        ],
        'Follow the connection',
        ()=>runLimApplicationStory(bridge,0),
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'From information to practical use',nextGuide:'Follow the connection through observation, understanding, purpose and action.'}
    );
    setGuide(`${bridge.sourceTitle} is connected to questions about purpose and practical use.`);
    return true;
}

function demoOrbKnowledge(record) {
    const profile=record.demoKnowledgeProfile || (record.demoPlantPreset==='moringa' ? MORINGA_PROFILE : PIGEON_PEA_PROFILE_FOR_ORB);
    return resolveOrbKnowledge(profile,{expanded:record.demoExpanded});
}
const PIGEON_PEA_PROFILE_FOR_ORB={pim_document:PIGEON_PEA_PIM};
function demoTotemCards(record) {
    const second=record.tutorialStage==='totem2';
    const plants=markers.filter(item=>item.demoType==='plant' && Boolean(item.demoAmbientNeighbour)===second);
    const notes=markers.filter(item=>item.demoType==='note' && Boolean(item.demoAmbientNeighbour)===second);
    const header=totemKnowledgeCards({title:'Welcome to this area',introduction:'Welcome to this area.',
        plants:plants.map(item=>({id:item.id,name:item.name,knowledge:item.demoAmbientNeighbour?{live:false}:demoOrbKnowledge(item)})),
        notes:notes.map(item=>({id:item.id,title:item.name,body:(demoContentFor(item)?.lines || []).join(' · ')})),compact:true})[0];
    const signHeight=item=>{
        const height=simulatedMode && item?.simulatedAnchor
            ? .82+(76-Number(item.simulatedAnchor.y))*.014
            : Number(item?.position?.y)-Number(record.groundBaseY || 0);
        return Math.max(.46,Math.min(1.22,height));
    };
    const plantSigns=second
        ? [[plants[0],plants[1]],[plants[2],plants[3]]].map((pair,index)=>({id:`plants-${index}`,eyebrow:'PLANT ORBS',title:pair.map(item=>item?.name).filter(Boolean).join(' · '),summary:'',boardSide:index?'left':'right',signHeight:signHeight(pair[0])}))
        : plants.map((item,index)=>({id:`plant-${item.id}`,eyebrow:'PLANT ORB',title:item.name,summary:'',boardSide:index?'left':'right',signHeight:signHeight(item)}));
    const note=notes[0];
    return [header,...plantSigns,
        {id:'area-note',eyebrow:'NOTE',title:note?.name || 'Seasonal observation',summary:'',body:note ? (demoContentFor(note)?.lines || []).join(' · ') : '',boardSide:'right',signHeight:note ? Math.max(.5,Math.min(.78,signHeight(note))) : .62},
        {id:'neighbour',eyebrow:'NEIGHBOUR AREA',title:second?'Area 1 →':'← Area 2',summary:'',body:record.demoLinkVisible?'Follow the linked route.':'The neighbouring Area can be connected next.',boardSide:second?'right':'left',signHeight:.47}
    ];
}
function activateDemoTotemCard(hit) {
    if(!hit)return false;
    infoPanel?.setMediaCollapsed(true);
    if(hit.card?.id==='__signs'){
        hit.record.demoTotemSignsVisible=!hit.record.demoTotemSignsVisible;
        hit.record.demoTotemFaded=false;
        hit.record.totemSelectedCard='';
        hit.record.totemCardsRefreshed=0;
        updateSimulatedMarkers();return true;
    }
    if(hit.card?.id==='__fade'){
        hit.record.demoTotemFaded=!hit.record.demoTotemFaded;
        hit.record.totemSelectedCard='';
        updateSimulatedMarkers();return true;
    }
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
            if(sessionMode==='immersive-vr' || domOverlayEnabled || !introWorldAnchor || !welcomeSurfaceHit(introLocalPosition(introWorldAnchor,INTRO_CONTROL_POSITION),INTRO_CONTROL_SCALE[0],INTRO_CONTROL_SCALE[1],900,360))return false;
        }
        continueButton.click();
        return true;
    }
    const choiceButton = appRoot?.querySelector('[data-tryit-guided-choice]:not([hidden]) [data-demo-choice]:not([hidden])');
    if (choiceButton) {
        choiceButton.click();
        return true;
    }
    const liveTagButton = simulatedMode ? appRoot?.querySelector('[data-tryit-open-live-tag]:not([hidden])') : null;
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
    const choiceLabels=[...panel.querySelectorAll('[data-demo-choice]')].map(button=>button.textContent.trim()).filter(Boolean);
    setIntroBoardNextGuide(options.nextGuide!==undefined?options.nextGuide:(choiceLabels.length===1?`Use ${choiceLabels[0]} below.`:'Choose an option below.'),{reveal:false});
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
        revealIntroBoardNextGuide();
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
    const deferContinueUntilCopyReady = Boolean(options.deferContinueUntilCopyReady);
    let typingStartDelay = 220;
    let typedLength = 0;
    let typing = true;
    let completionNotified = false;
    const paintBoardParagraphs = visibleText => {
        const paragraphElements = [...(board?.querySelectorAll('.tryit-board-text-window p:not(.tryit-board-next)') || [])];
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
        revealIntroBoardNextGuide();
        typing = false;
        if (continueButton && buttonLabel) {continueButton.hidden = false;continueButton.disabled = false;syncDemoPanelActions();}
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
        setIntroBoardNextGuide(options.nextGuide!==undefined?options.nextGuide:(buttonLabel?`Use ${demoLocalizedText(buttonLabel)} below.`:'Explore the visible cells for more detail.'),{reveal:false});
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
        // Keep the Plant Orb introduction on screen until its explanation has
        // appeared; a second press must not jump straight from pathways to Areas.
        continueButton.hidden = false;
        continueButton.disabled = deferContinueUntilCopyReady;
        continueButton.onclick = () => {
            if (deferContinueUntilCopyReady && typing) return;
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
    if (record?.demoProfileInteracted) {setGuide(`${record.name || 'Plant'} information remains open for exploration.`);return;}
    const plantName = record?.name || 'Plant';
    const title = demoLocalizedText('Explore this plant');
    const body = record?.tutorialStage==='plant'
        ? demoLocalizedText(`Open a few plant information cells to see how knowledge branches from the plant. When you find Pruning, it can connect with an idea about the wider landscape.`)
        : demoLocalizedText(`This connected view brings together what is known about ${plantName}. Open any cell to follow a topic such as food, growing, uses or ecological roles.`);
    panel.innerHTML = `<small>${demoIntroLabel()}</small><h2>${title}</h2><div class="tryit-board-text-window"><p>${body}</p></div>`;
    setIntroBoardNextGuide(record?.tutorialStage==='plant'?'Explore a few plant information cells. Continue when you are ready.':'Explore a plant topic, or continue when ready.');
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
    continueButton.hidden = record?.tutorialStage==='plant';
    skipDemoNarration = () => {
        continueButton.click();
    };
    setGuide(record?.tutorialStage==='plant'?`${plantName} information opened. Select any visible cell to explore it.`:`${plantName} information opened. Select topics to explore.`);
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
    if(arWelcomeIntroPending && arWelcomeRenderedFrames.length)return arWelcomeRenderedFrames;
    return welcomeExperienceFrames(arWelcomeClock.elapsed,window.matchMedia('(prefers-reduced-motion: reduce)').matches,arWelcomeClusters,limHiddenCells,{cellsActivatedAt:limMeshActivatedAt,expandedLimIds:[...limExpandedCells],expandedAt:Object.fromEntries(limExpandedAt)});
}
const welcomeSequenceCanContinue=()=>arWelcomeClock.elapsed>=(window.matchMedia('(prefers-reduced-motion: reduce)').matches?AR_WELCOME_REDUCED_OPENING_MS:DEMO_WELCOME_CONTINUE_MS);

let selectedLimCell='',arWelcomeSettleStage=false,arWelcomeSettleStartedAt=NaN;
function limNodeByKey(key) { return welcomeFrames().flatMap(frame=>frame.nodes).find(node=>node.key===key) || null; }
const understandPlacePathway=()=>LIM_PATHWAYS.find(pathway=>pathway.id==='lim-path-understand-place');
const currentPathwayCellId=()=>understandPlacePathway()?.orderedCellIds[limPathwayState.currentStepIndex] || '';
const currentPathwayNode=()=>welcomeFrames().flatMap(frame=>frame.nodes).find(node=>(node.limId || node.label)===currentPathwayCellId()) || null;
function persistLimPathway(){saveLimPathwayState(window.localStorage,limPathwayState);}
function updateLimPathway(next){limPathwayState=next;persistLimPathway();introBoardTextureDirty=true;}
function pathwayContext(selectedId=''){
    const pathway=understandPlacePathway();if(!pathway)return null;
    const stepId=currentPathwayCellId(),step=LIM_CELL_BY_ID[stepId],number=limPathwayState.currentStepIndex+1;
    if(limPathwayState.status==='completed')return {mode:'completed',title:pathway.title,progress:'Path completed',explanation:`You’ve completed this learning path. ${limPathwayState.observationNoteStatus==='placed'?'Your observation Note was placed.':'Continue exploring, revisit a topic or record something you noticed about this place.'}`,actions:[{action:'PathContinue',label:'Explore freely',primary:true},{action:'PathRestart',label:'Restart path'},{action:'PathClose',label:'Close learning view'}]};
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
    if(action==='PathPreview'){infoPanel?.setPathwayContext({mode:'introduction',title:pathway.title,progress:'Optional guided exploration',explanation:'Understand This Place offers an optional route through seven connected topics. You can leave the path, explore any other topic and return whenever you choose.',actions:[{action:'PathBegin',label:'Begin path',primary:true},{action:'PathExplore',label:'Explore freely'}]});return;}
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
    const panel=appRoot?.querySelector('[data-tryit-guided-choice]');if(panel){panel.innerHTML=`<small>${introBoardStep}</small><h2>${board.title}</h2><div class="tryit-board-text-window"><p>${board.body.replace(/\n\n/g,'</p><p>')}</p></div>`;prepareTutorialBoard(panel);panel.classList.remove('is-typing');panel.classList.add('is-copy-ready','is-persistent-demo-board','is-lim-shared-surface');}
    setIntroBoardNextGuide(step?`Select ${limLearningContent(step.cellId).title} to continue. To finish, open Tools in the Control panel and choose End learning.` :'Open Tools in the Control panel and choose End learning to return to the demo.');
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
    appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-intro-pending');
    selectedLimCell=key;
    const content=limLearningContent(node.limId || node.label);
    try{meshComposition.setActiveRef(limMeshRef(content.id));}catch{meshComposition.setActiveRef(null);}
    // A selected cell becomes a doorway to its own descendants. Other
    // archetypes remain quiet until the visitor chooses to open them.
    if(!limExpandedCells.has(content.id))limExpandedAt.set(content.id,arWelcomeClock.elapsed);
    limExpandedCells.add(content.id);
    infoPanel?.showLearning({...content,mesh:'lim'});
    infoPanel?.suspend(false);
    infoPanel?.setCompact(false);
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
function limRevealIsAnimating(){
    return welcomeRevealIsAnimating(arWelcomeClock.elapsed,[limMeshActivatedAt,...limExpandedAt.values()]);
}
function currentLimPointerCell() {
    if(!arWelcomeShowcaseActive || !limMeshVisible || !introWorldAnchor)return null;
    const hit=welcomeSurfaceHit(introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition),AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080);
    return hit && welcomeCellAtPoint(welcomeFrames(),hit.pixelX,hit.pixelY);
}
function knowledgeCombinationSurfacePoint(){
    if(!knowledgeCombinationState || !introWorldAnchor)return null;
    const hit=welcomeSurfaceHit(introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition),AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080);
    return hit?{x:hit.pixelX/25,y:hit.pixelY/21}:null;
}
function knowledgeCombinationHit(point){
    const state=knowledgeCombinationState,choice=demoConnectionChoice(state);if(!state || !point)return null;
    if(!choice){const selected=DEMO_CONNECTION_CHOICES.find(item=>{const p=DEMO_CONNECTION_POSITIONS.sources[item.id];return Math.abs(point.x-p.x)<=12 && Math.abs(point.y-p.y)<=7;});return selected?{type:'choice',choice:selected}:null;}
    const source=demoConnectionSource(state),node=source?{x:source.x+10,y:source.y}:null;
    if(node && Math.hypot(point.x-node.x,point.y-node.y)<=5 && [DEMO_CONNECTION_PHASES.READY,DEMO_CONNECTION_PHASES.DEEPER_READY].includes(state.phase))return {type:'node',deeper:demoConnectionIsDeeper(state)};
    if(state.primaryResult && state.phase===DEMO_CONNECTION_PHASES.RESULT && point.y>=90){if(point.x<50)return {type:'deeper'};return {type:'continue'};}
    if(state.primaryResult && ![DEMO_CONNECTION_PHASES.DEEPER_HOLDING,DEMO_CONNECTION_PHASES.DEEPER_DRAGGING,DEMO_CONNECTION_PHASES.DEEPER_RESOLVING].includes(state.phase) && point.y>=90)return {type:'continue'};
    return null;
}
function selectImmersiveKnowledgeCombination(){
    const action=knowledgeCombinationHit(knowledgeCombinationSurfacePoint());
    if(!action){
        const hit=demoRecordAtPointer()?.record;
        return hit && hit===knowledgeCombinationPlantRecord() ? selectPigeonPeaForCombination() : false;
    }
    if(action.type==='choice'){selectDemoConnectionChoice(knowledgeCombinationState,action.choice.id);syncKnowledgeCombinationOverlay();setGuide(`${action.choice.sourceTitle} selected. Hold its glowing node, then drag toward ${action.choice.targetTitle}.`);}
    if(action.type==='deeper'){knowledgeCombinationState.phase=DEMO_CONNECTION_PHASES.DEEPER_READY;syncKnowledgeCombinationOverlay();setGuide(`Hold the node on the new idea and connect it to ${DEMO_DEEPER_CONNECTION.targetTitle}.`);}
    if(action.type==='continue')finishKnowledgeCombinationExperience();
    return true;
}
function beginImmersiveKnowledgeCombination(){
    const action=knowledgeCombinationHit(knowledgeCombinationSurfacePoint()),state=knowledgeCombinationState;if(action?.type!=='node' || !state)return false;
    knowledgeCombinationHold={deeper:action.deeper,pointerId:'xr',armed:false,startedAt:performance.now(),frame:0};state.holdStartedAt=knowledgeCombinationHold.startedAt;state.holdProgress=0;state.phase=action.deeper?DEMO_CONNECTION_PHASES.DEEPER_HOLDING:DEMO_CONNECTION_PHASES.HOLDING;syncKnowledgeCombinationOverlay();return true;
}
function syncImmersiveKnowledgeCombination(now=performance.now()){
    const hold=knowledgeCombinationHold,state=knowledgeCombinationState;if(!hold || hold.pointerId!=='xr' || !state)return;
    state.holdProgress=Math.min(1,(now-hold.startedAt)/DEMO_CONNECTION_HOLD_MS);
    if(state.holdProgress>=1 && !hold.armed){hold.armed=true;state.dragging=true;state.phase=hold.deeper?DEMO_CONNECTION_PHASES.DEEPER_DRAGGING:DEMO_CONNECTION_PHASES.DRAGGING;navigator.vibrate?.(35);}
    if(hold.armed){state.pointer=knowledgeCombinationSurfacePoint() || state.pointer;state.hoverTarget=Boolean(state.pointer && demoConnectionTargetAt(state,state.pointer.x,state.pointer.y,13));}
    if(!state.paintedAt || now-state.paintedAt>40){state.paintedAt=now;syncKnowledgeCombinationOverlay();}
}
function endImmersiveKnowledgeCombination(cancel=false){
    const hold=knowledgeCombinationHold,state=knowledgeCombinationState;if(!hold || hold.pointerId!=='xr' || !state)return false;
    syncImmersiveKnowledgeCombination();const valid=hold.armed && !cancel && state.hoverTarget;knowledgeCombinationHold=null;state.dragging=false;state.pointer=null;state.hoverTarget=false;state.holdProgress=0;
    if(valid)resolveKnowledgeCombination(hold.deeper);else{state.phase=hold.deeper?DEMO_CONNECTION_PHASES.DEEPER_READY:DEMO_CONNECTION_PHASES.READY;syncKnowledgeCombinationOverlay();setGuide('Hold for a moment, then drag the line all the way to its partner.');}
    suppressSessionSelectUntil=performance.now()+300;return true;
}
function syncImmersiveLimHover() {
    if(!session || !arWelcomeShowcaseActive)return;
    const next=currentLimPointerCell()?.key || '';
    if(next===contextCellKey)return;
    contextCellKey=next;introBoardTextureDirty=true;syncDemoPanelActions();
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
    arWelcomeLayer.querySelectorAll('[data-welcome-cell]').forEach(button=>{
        const key=button.dataset.welcomeCell;
        const point=()=>{contextCellKey=key;syncDemoPanelActions();};
        const unpoint=()=>{if(contextCellKey===key){contextCellKey='';syncDemoPanelActions();}};
        const keyDown=event=>{
            if(!['Enter',' '].includes(event.key) || event.repeat)return;
            event.preventDefault();event.stopPropagation();limActivation.activateNow(key,performance.now(),'keyboard');paintWelcomeLayer(performance.now());
        };
        const keyUp=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();}};
        const click=event=>{
            event.preventDefault();event.stopPropagation();
            limActivation.activateNow(key,performance.now(),event.detail===0?'assistive-click':'click');
        };
        for(const [type,handler] of [['pointerenter',point],['focus',point],['pointerleave',unpoint],['blur',unpoint],['keydown',keyDown],['keyup',keyUp],['click',click]]){button.addEventListener(type,handler);cleanups.push(()=>button.removeEventListener(type,handler));}
    });
    limInteractionCleanup=()=>{cleanups.splice(0).forEach(remove=>remove());limActivation?.cancel('unmount');limCancelFrame(limActivationFrame);limActivationFrame=0;limPointerKey='';limPointerId=null;};
}

function bindLimSessionInteractions(arSession) {
    if(!arSession || !limActivation)return;
    const select=event=>{
        if(!arWelcomeShowcaseActive || !['screen','tracked-pointer'].includes(event.inputSource?.targetRayMode))return;
        if(knowledgeCombinationState){event.preventDefault?.();event.stopImmediatePropagation?.();selectImmersiveKnowledgeCombination();return;}
        const node=currentLimPointerCell();
        if(node){event.preventDefault?.();event.stopImmediatePropagation?.();limActivation.activateNow(node.key,performance.now(),'xr-select');limActivationSessionSuppressUntil=performance.now()+450;return;}
        if(performance.now()<limActivationSessionSuppressUntil)event.stopImmediatePropagation?.();
    };
    const visibility=()=>{if(arSession.visibilityState!=='visible')limActivation.cancel('session-hidden');};
    arSession.addEventListener('select',select,true);arSession.addEventListener('visibilitychange',visibility);
    limSessionCleanup=()=>{arSession.removeEventListener('select',select,true);arSession.removeEventListener('visibilitychange',visibility);limInputSource=null;};
}

function drawKnowledgeCombinationExperience(ctx,now){
    const state=knowledgeCombinationState;if(!state)return;
    const choice=demoConnectionChoice(state),deeper=demoConnectionIsDeeper(state),toPoint=point=>({x:point.x*25,y:point.y*21});
    const card=(point,{title,detail,label,color,muted=false,bloom=false,width=500,height=190})=>{
        const p=toPoint(point),left=p.x-width/2,top=p.y-height/2;ctx.save();ctx.globalAlpha=muted?.26:1;
        if(bloom){ctx.shadowColor=color;ctx.shadowBlur=36+Math.sin(now/180)*8;}
        const fill=ctx.createLinearGradient(left,top,left+width,top+height);fill.addColorStop(0,`${color}ee`);fill.addColorStop(1,'rgba(13,39,31,.96)');ctx.fillStyle=fill;ctx.strokeStyle=bloom?'rgba(255,255,235,.95)':'rgba(235,249,226,.55)';ctx.lineWidth=bloom?6:3;
        ctx.beginPath();ctx.roundRect(left,top,width,height,44);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='rgba(244,255,239,.72)';ctx.font='700 21px system-ui,sans-serif';ctx.fillText(label.toUpperCase(),left+30,top+27);
        ctx.fillStyle='#fff';ctx.font='800 39px system-ui,sans-serif';drawWrappedTextureText(ctx,title,left+30,top+60,width-60,44,2);ctx.fillStyle='rgba(247,255,243,.78)';ctx.font='600 22px system-ui,sans-serif';drawWrappedTextureText(ctx,detail,left+30,top+119,width-60,27,2);ctx.restore();
    };
    const line=(from,to,fromColor,toColor,width=11)=>{const a=toPoint(from),b=toPoint(to),bend=Math.max(100,Math.abs(b.x-a.x)*.28),gradient=ctx.createLinearGradient(a.x,a.y,b.x,b.y);gradient.addColorStop(0,fromColor);gradient.addColorStop(1,toColor);ctx.save();ctx.strokeStyle=gradient;ctx.lineWidth=width;ctx.lineCap='round';ctx.shadowColor=toColor;ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(a.x+bend,a.y,b.x-bend,b.y,b.x,b.y);ctx.stroke();ctx.restore();};
    ctx.save();ctx.fillStyle='rgba(6,27,21,.62)';ctx.beginPath();ctx.roundRect(55,55,2390,1990,82);ctx.fill();
    ctx.textAlign='center';ctx.fillStyle='#eff7e9';ctx.font='800 58px system-ui,sans-serif';ctx.fillText('What can these ideas reveal together?',1250,155);ctx.fillStyle='rgba(230,244,225,.75)';ctx.font='600 27px system-ui,sans-serif';ctx.fillText(knowledgeCombinationStatus(state),1250,210,2100);
    ctx.textAlign='left';ctx.fillStyle='rgba(224,242,216,.58)';ctx.font='800 23px system-ui,sans-serif';ctx.fillText('PLANT CHARACTERISTICS',215,525);ctx.fillText('LEARNING CELLS',1775,525);
    if(state.primaryResult && choice){line(DEMO_CONNECTION_POSITIONS.sources[choice.id],DEMO_CONNECTION_POSITIONS.result,choice.sourceColor,choice.targetColor,8);line(DEMO_CONNECTION_POSITIONS.targets[choice.id],DEMO_CONNECTION_POSITIONS.result,choice.targetColor,choice.sourceColor,8);}
    if(state.deeperResult && choice){line(DEMO_CONNECTION_POSITIONS.result,DEMO_CONNECTION_POSITIONS.deeperResult,choice.targetColor,DEMO_DEEPER_CONNECTION.targetColor,8);line(DEMO_CONNECTION_POSITIONS.deeperTarget,DEMO_CONNECTION_POSITIONS.deeperResult,DEMO_DEEPER_CONNECTION.targetColor,choice.targetColor,8);}
    if(state.dragging && choice){const target=state.hoverTarget?demoConnectionTarget(state):state.pointer;if(target)line(demoConnectionSource(state),target,deeper?choice.targetColor:choice.sourceColor,deeper?DEMO_DEEPER_CONNECTION.targetColor:choice.targetColor,15);}
    for(const item of DEMO_CONNECTION_CHOICES){const selected=item.id===choice?.id;card(DEMO_CONNECTION_POSITIONS.sources[item.id],{title:item.sourceTitle,detail:item.sourceDetail,label:'Pigeon Pea',color:item.sourceColor,muted:Boolean(choice&&!selected)});card(DEMO_CONNECTION_POSITIONS.targets[item.id],{title:item.targetTitle,detail:item.targetDetail,label:'Learning cell',color:item.targetColor,muted:Boolean(choice&&!selected),bloom:selected && [DEMO_CONNECTION_PHASES.DRAGGING,DEMO_CONNECTION_PHASES.RESOLVING].includes(state.phase)});}
    if(state.primaryResult && choice)card(DEMO_CONNECTION_POSITIONS.result,{title:state.primaryResult.derivedNode?.title || choice.resultTitle,detail:state.primaryResult.derivedNode?.summary || choice.resultSummary,label:'New connection',color:choice.targetColor,width:650,height:250,bloom:state.phase===DEMO_CONNECTION_PHASES.RESULT});
    if(deeper)card(DEMO_CONNECTION_POSITIONS.deeperTarget,{title:DEMO_DEEPER_CONNECTION.targetTitle,detail:DEMO_DEEPER_CONNECTION.targetDetail,label:'Go deeper',color:DEMO_DEEPER_CONNECTION.targetColor,bloom:[DEMO_CONNECTION_PHASES.DEEPER_DRAGGING,DEMO_CONNECTION_PHASES.DEEPER_RESOLVING].includes(state.phase),width:500,height:190});
    if(state.deeperResult && choice)card(DEMO_CONNECTION_POSITIONS.deeperResult,{title:state.deeperResult.derivedNode?.title || choice.deeperTitle,detail:state.deeperResult.derivedNode?.summary || choice.deeperSummary,label:'Question for this place',color:DEMO_DEEPER_CONNECTION.targetColor,width:680,height:245,bloom:true});
    const source=demoConnectionSource(state);if(source && [DEMO_CONNECTION_PHASES.READY,DEMO_CONNECTION_PHASES.HOLDING,DEMO_CONNECTION_PHASES.DRAGGING,DEMO_CONNECTION_PHASES.DEEPER_READY,DEMO_CONNECTION_PHASES.DEEPER_HOLDING,DEMO_CONNECTION_PHASES.DEEPER_DRAGGING].includes(state.phase)){const p=toPoint(source),progress=state.holdProgress || 0;ctx.fillStyle='#f4ffd8';ctx.strokeStyle='#173d32';ctx.lineWidth=6;ctx.beginPath();ctx.arc(p.x+245,p.y,20,0,Math.PI*2);ctx.fill();ctx.stroke();if(progress){ctx.strokeStyle='#fff';ctx.lineWidth=9;ctx.beginPath();ctx.arc(p.x+245,p.y,34,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();}}
    if(state.primaryResult){const nav=(x,label,filled)=>{ctx.fillStyle=filled?'#dff0b2':'rgba(22,57,45,.94)';ctx.strokeStyle='rgba(238,255,224,.75)';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x-190,1930,380,78,39);ctx.fill();ctx.stroke();ctx.fillStyle=filled?'#173328':'#eff8e9';ctx.font='800 27px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,1969);};if(state.phase===DEMO_CONNECTION_PHASES.RESULT)nav(1010,'Go deeper',false);nav(state.phase===DEMO_CONNECTION_PHASES.RESULT?1490:1250,'Continue journey',true);}
    ctx.restore();
}

function paintWelcomeLayer(now) {
    if(!arWelcomeCanvas)return;
    arWelcomeClock.tick(Date.now(),!document.hidden);
    const rainStage=demoRainIntensity<=0?'':demoRainProgress(arWelcomeClock.elapsed)>=1?'mist':arWelcomeClock.elapsed>=12000?'first-drops':'';
    const demoRoot=appRoot?.querySelector('.tryit-demo');
    if(demoRoot && demoRoot.dataset.rainStage!==rainStage)demoRoot.dataset.rainStage=rainStage;
    const context=arWelcomeCanvas.getContext('2d');
    context.save();
    context.scale(arWelcomeCanvas.width/2500,arWelcomeCanvas.height/2100);
    const frames=drawArWelcomeShowcase(context,arWelcomeClock.elapsed,
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,arWelcomeClusters,{
            opening:arWelcomeOpeningActive,minimalIntro:arWelcomeIntroPending,openingSeed:arWelcomeOpeningSeed,openingDuration:arWelcomeOpeningDuration,minimalStartAt:DEMO_ARCHETYPE_START_MS,minimalInterval:DEMO_ARCHETYPE_INTERVAL_MS,minimalRevealDuration:DEMO_ARCHETYPE_REVEAL_MS,hidden:limHiddenCells,drawCells:limMeshVisible,drawPanel:arWelcomeSharedBoard && introBoardVisible,
            rootMilestone:arWelcomeRootMilestone,rootMilestoneStartedAt:arWelcomeRootMilestoneStartedAt,
            drawContent:drawIntroNoteContent,progression:{cellsActivatedAt:limMeshActivatedAt,expandedLimIds:[...limExpandedCells],expandedAt:Object.fromEntries(limExpandedAt)},
            drawCellLabels:true,selectedKey:selectedLimCell,hoverKey:contextCellKey,pathwayKey:limPathwayState.status==='active'?currentPathwayNode()?.key || '':''
        });
    arWelcomeRenderedFrames=frames;
    if(knowledgeCombinationState)drawKnowledgeCombinationExperience(context,now);
    context.restore();
    const selectedNode=frames.flatMap(frame=>frame.nodes).find(node=>node.key===selectedLimCell);
    const relationship=welcomeRelationshipFor(selectedNode?.limId);
    const linkedIds=new Set(relationship?.ids || []);
    for(const frame of frames)for(const node of frame.nodes){
        const button=arWelcomeLayer.querySelector(`[data-welcome-cell="${node.key}"]`);
        if(button){
            const pathwayCurrent=(node.limId || node.label)===currentPathwayCellId() && ['active','paused'].includes(limPathwayState.status);
            button.hidden=!limMeshVisible || node.opacity<=.01;
            button.style.opacity=String(node.opacity);
            button.style.pointerEvents=node.opacity>=.85?'':'none';
            const linked=linkedIds.has(node.limId) && node.opacity>.55;
            button.style.setProperty('--lim-accent',linked?relationship.accent:(node.accent||'#719b62'));
            button.classList.toggle('is-lim-selected',selectedLimCell===node.key);
            button.classList.toggle('is-lim-related',linked);
            button.classList.toggle('is-lim-pathway-current',pathwayCurrent);
            button.setAttribute('aria-pressed',String(selectedLimCell===node.key));
            button.dataset.welcomeHollow=node.hollow?'true':'false';
            button.setAttribute('aria-label',`${node.hollow?'Reopen and explore':'Explore'} ${node.label} cell`);
        }
    }
}

function paintDemoAmbientLife(now){
    if(!ambientCanvas || now-ambientLastPaint<33)return;
    ambientLastPaint=now;
    if(!Number.isFinite(ambientBeesStartedAt))return;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ambientBeeModel?.draw(arWelcomeClock.elapsed,ambientBeesStartedAt,reducedMotion);
    ambientCanvas.style.visibility=ambientBeeModel?.ready?'hidden':'visible';
    if(ambientBeeModel?.ready)return;
    const width=window.innerWidth,height=window.innerHeight,ratio=Math.min(window.devicePixelRatio||1,1.5);
    if(ambientCanvas.width!==Math.round(width*ratio))ambientCanvas.width=Math.round(width*ratio);
    if(ambientCanvas.height!==Math.round(height*ratio))ambientCanvas.height=Math.round(height*ratio);
    const context=ambientCanvas.getContext('2d');
    context.setTransform(ratio,0,0,ratio,0,0);
    drawDemoAmbientLife(context,width,height,{elapsed:arWelcomeClock.elapsed,beesStartedAt:ambientBeesStartedAt,reducedMotion});
}

function showArWelcomeShowcase() {
    infoPanel?.setHeaderProgress(null);
    selectedLimCell='';
    introBoardStep='';
    const panel=appRoot?.querySelector('[data-tryit-guided-choice]');
    const skip=appRoot?.querySelector('[data-tryit-skip]');
    if(!panel)return;
    const reducedOpening=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seedBytes=new Uint32Array(1);
    if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(seedBytes);else seedBytes[0]=Math.floor(Math.random()*0xffffffff);
    arWelcomeClusters=createArWelcomeClusters();limHiddenCells=new Set();limExpandedCells=new Set();limExpandedAt=new Map();limMeshVisible=true;limMeshActivatedAt=NaN;arWelcomeOpeningActive=true;arWelcomeOpeningDuration=reducedOpening?AR_WELCOME_REDUCED_OPENING_MS:DEMO_WELCOME_OPENING_MS;arWelcomeOpeningSeed=seedBytes[0];arWelcomeClock=createWelcomePresentationClock();
    arWelcomeRootMilestone=WELCOME_ROOT_MILESTONES.arrival;arWelcomeRootMilestoneStartedAt=0;arWelcomeRootsLastRefreshAt=-Infinity;
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
    arWelcomeShowcaseActive=true;arWelcomeIntroPending=true;arWelcomeSettleStage=false;arWelcomeSettleStartedAt=NaN;arWelcomeSharedBoard=true;
    syncDemoPanelActions();
    introSceneActive=true;introBoardVisible=true;introKnowledgeVisible=false;introBoardHasEntered=true;
    arWelcomeStartedAt=performance.now();introSceneStartedAt=arWelcomeStartedAt;introBoardTextureDirty=true;
    introBoardStep='';
    introBoardTitle='Welcome to NourishlandXR';
    introBoardBody=demoLocalizedText('Explore how plants, places and knowledge connect.');
    introBoardVisibleBody='';
    limMeshVisible=false;
    infoPanel?.setLearningModules(null);
    infoPanel?.setCompact(true);
    infoPanel?.setIntroduction(false);
    infoPanel?.suspend(true);
    let openingParagraphs=introBoardBody.split('\n\n');
    panel.innerHTML=`<h2>${introBoardTitle}</h2><div class="tryit-board-text-window">${openingParagraphs.map(()=>'<p></p>').join('')}</div>`;
    prepareTutorialBoard(panel);
    setIntroBoardNextGuide('');
    panel.classList.add('is-copy-ready','is-persistent-demo-board','is-lim-shared-surface','is-opening-welcome','is-typing');
    panel.classList.remove('is-live-welcome-copy');
    panel.hidden=true;
    appRoot?.querySelector('.tryit-demo')?.setAttribute('data-lim-opening','true');
    appRoot?.querySelector('.tryit-demo')?.setAttribute('data-lim-surface','true');
    appRoot?.querySelector('.tryit-demo')?.setAttribute('data-intro-pending','true');
    clearTimeout(boardTypingTimer);clearTimeout(boardTypingWatchdogTimer);
    let openingTypedLength=0,openingTyping=false;
    const openingTextWindow=panel.querySelector('.tryit-board-text-window');
    const paintOpeningCopy=visibleText=>{
        const paragraphs=[...panel.querySelectorAll('.tryit-board-text-window p:not(.tryit-board-next)')];
        let start=0;
        openingParagraphs.forEach((paragraph,index)=>{
            const end=start+paragraph.length;
            if(paragraphs[index]){
                paragraphs[index].textContent=visibleText.slice(start,end);
                paragraphs[index].classList.toggle('is-current',visibleText.length>=start && visibleText.length<=end);
            }
            start=end+2;
        });
        if(openingTextWindow)openingTextWindow.scrollTop=openingTextWindow.scrollHeight;
    };
    const finishOpeningCopy=()=>{
        if(!openingTyping)return;
        openingTyping=false;clearTimeout(boardTypingTimer);clearTimeout(boardTypingWatchdogTimer);
        introBoardVisibleBody=introBoardBody;paintOpeningCopy(introBoardBody);introBoardTextureDirty=true;
        panel.classList.remove('is-typing');
    };
    const typeOpeningCopy=()=>{
        if(!openingTyping || !arWelcomeShowcaseActive)return;
        openingTypedLength=nextDemoTextLength(introBoardBody,openingTypedLength);
        introBoardVisibleBody=introBoardBody.slice(0,openingTypedLength);paintOpeningCopy(introBoardVisibleBody);introBoardTextureDirty=true;
        if(openingTypedLength>=introBoardBody.length){finishOpeningCopy();return;}
        boardTypingTimer=setTimeout(typeOpeningCopy,demoTextTypingDelay(introBoardBody,openingTypedLength));
    };
    const beginOpeningCopy=()=>{
        if(!arWelcomeShowcaseActive)return;
        arWelcomeOpeningActive=false;arWelcomeSettleStage=true;arWelcomeSettleStartedAt=arWelcomeClock.elapsed;limMeshVisible=false;
        introBoardTitle=demoLocalizedText('Explore a living learning space');
        introBoardBody=demoLocalizedText('Begin with ideas you can open and explore. Then meet a plant and see how its story connects.');
        introBoardVisibleBody='';openingParagraphs=introBoardBody.split('\n\n');openingTypedLength=0;openingTyping=true;
        panel.querySelector('h2').textContent=introBoardTitle;
        panel.querySelector('.tryit-board-text-window').innerHTML=openingParagraphs.map(()=>'<p></p>').join('');
        panel.hidden=false;introBoardVisible=true;introBoardTextureDirty=true;
        appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-lim-opening');
        syncDemoPanelActions();
        panel.classList.add('is-typing');paintOpeningCopy('');
        boardTypingTimer=setTimeout(typeOpeningCopy,320);
    };
    const waitForOpeningCopy=()=>{
        if(!arWelcomeShowcaseActive || !arWelcomeOpeningActive)return;
        if(arWelcomeClock.elapsed>=arWelcomeOpeningDuration){beginOpeningCopy();return;}
        boardTypingTimer=setTimeout(waitForOpeningCopy,100);
    };
    boardTypingTimer=setTimeout(waitForOpeningCopy,100);
    skipDemoNarration=()=>{
        if(arWelcomeOpeningActive){arWelcomeOpeningDuration=arWelcomeClock.elapsed;beginOpeningCopy();return;}
        finishOpeningCopy();
    };
    const layer=document.createElement('div');layer.className='tryit-live-welcome';arWelcomeLayer=layer;
    layer.innerHTML='<canvas width="2500" height="2100" role="img" aria-label="NourishlandXR introduction. Discover how plant knowledge becomes a mapped, understandable and connected place."></canvas>';
    arWelcomeCanvas=layer.querySelector('canvas');
    if(simulatedMode){arWelcomeCanvas.width=DEMO_LIM_SURFACE_CANVAS.width;arWelcomeCanvas.height=DEMO_LIM_SURFACE_CANVAS.height;}
    // Native buttons provide touch, keyboard and screen-reader access to cells.
    for(const frame of welcomeExperienceFrames(64000,false,arWelcomeClusters))for(const node of frame.nodes){
        const cell=document.createElement('button');cell.type='button';cell.dataset.welcomeCell=node.key;cell.dataset.label=node.label;cell.textContent=node.label;
        cell.setAttribute('aria-label',node.accessibilityLabel || `Explore ${node.label} learning cell`);cell.setAttribute('aria-pressed','false');cell.hidden=true;
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
        const state=[introBoardTitle,introBoardVisibleBody,introBoardVisible,arWelcomeSharedBoard,arWelcomeIntroPending,limMeshVisible,limMeshActivatedAt,limExpandedAt.size,limHiddenCells.size,welcomeSequenceCanContinue()].join('|');
        if(simulatedMode && now-last>=50 && (!reduced || arWelcomeOpeningActive || arWelcomeClock.elapsed<AR_WELCOME_SHOWCASE_DURATION || limRevealIsAnimating() || state!==lastState)){
            paintWelcomeLayer(now);introBoardTextureDirty=true;last=now;lastState=state;
        }
        if(simulatedMode)paintDemoAmbientLife(now);
        // XRSession frames drive immersive textures; a hidden DOM canvas need
        // not render a second copy. Reduced motion repaints only changed copy.
        // The DOM preview and XR overlay both need the same reveal clock. Use
        // the safe frame fallback even when a host omits window rAF.
        if(simulatedMode && arWelcomeLayer)arWelcomeShowcaseFrame=limRequestFrame(frame);
    };
    frame(performance.now());
    appRoot?.querySelector('[data-tryit-intro-continue]')?.setAttribute('hidden','');
    syncDemoPanelActions();
    if(skip)skip.hidden=true;
    const advanceWelcome=()=>{
        if(!arWelcomeIntroPending || !welcomeSequenceCanContinue())return;
        clearTimeout(arWelcomeUnlockTimer);arWelcomeUnlockTimer=null;
        arWelcomeIntroPending=false;arWelcomeOpeningActive=false;clearTimeout(boardTypingTimer);introBoardTextureDirty=true;
        infoPanel?.setLearningModules(null);
        if(skip)skip.hidden=false;
        suppressSessionSelectUntil=performance.now()+700;
        limMeshVisible=false;
        infoPanel?.setHeaderProgress(null);
        infoPanel?.setGuided(true);
        setIntroBoardNextGuide('');
        const continueButton=appRoot?.querySelector('[data-tryit-intro-continue]');
        if(continueButton){
            continueButton.textContent=demoLocalizedText('Continue');
            continueButton.hidden=false;
            continueButton.disabled=false;
            continueButton.onclick=()=>{
                suppressSessionSelectUntil=performance.now()+700;
                continueButton.hidden=true;
                runArWelcomeTutorial(0);
            };
        }
        skipDemoNarration=()=>continueButton?.click();
        syncDemoPanelActions();
    };
    const unlockWelcome=()=>{
        if(!arWelcomeShowcaseActive || !arWelcomeIntroPending)return;
        if(!arWelcomeOpeningActive && !openingTyping && welcomeAutoAdvanceReady(arWelcomeClock.elapsed,window.matchMedia('(prefers-reduced-motion: reduce)').matches)){
            advanceWelcome();return;
        }
        arWelcomeUnlockTimer=setTimeout(unlockWelcome,180);
    };
    arWelcomeUnlockTimer=setTimeout(unlockWelcome,180);
    setGuide(`${demoLocalizedText('Welcome to NourishlandXR')}. ${demoLocalizedText('Explore how plants, places and knowledge connect.')}`);
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

function showDemoTutorialMedia(key,title,body) {
    const art=DEMO_TUTORIAL_ART[key];
    if(!art)return;
    infoPanel?.showLearning({id:`demo-tutorial-${key}`,title:'',body:'',image:art.image,imageAlt:art.alt,accent:'#b7cbd0',mesh:'lim',editable:false});
    infoPanel?.suspend(false);
}

const DEMO_ORIENTATION_STEPS = [
    {title:'Meet your Control panel',button:'Continue',nextGuide:'',paragraphs:[
        'This Control panel helps you interact with the demonstration and responds to what you select.'
    ]},
    {title:'Every plant holds information',art:'references',button:'Continue',nextGuide:'',paragraphs:[
        'Every plant holds useful information, but that information is often scattered across books, signs, websites, phones and people.',
        'NourishlandXR brings it together in the place where it becomes useful.'
    ]},
    {title:'Imagine arriving in a garden',art:'curiosity',button:'Continue',nextGuide:'',paragraphs:[
        'Imagine arriving in a garden and noticing a plant you do not recognise.',
        'You pause, look closely and wonder what it is, how it belongs here and what it might teach you.'
    ]},
    {title:'A project represents a whole place',art:'area',button:'Continue',nextGuide:'',paragraphs:[
        'A Project brings the place, its plants, Areas, observations and knowledge into one connected structure.',
        'It keeps useful information connected to the place it describes.'
    ]},
    {title:'Areas help you find your way',art:'structure',button:'Continue',nextGuide:'',paragraphs:[
        'Each Area holds plants, observations and guidance for one part of the place.',
        'We’ll begin with one plant.'
    ]},
    {title:'Begin with one plant',art:'orb',button:'Place Pigeon Pea',nextGuide:'Place the Plant Orb, then open it to discover the plant’s information.',paragraphs:[
        'Plants inside a Nourishland Project can have information connected to their real-world location.',
        'Pigeon Pea is our example. First choose where this plant belongs in the scene.'
    ]}
];

const POST_PLACEMENT_AREA_STEP = {
    title:'This is the Plant Orb',button:'Select the Plant Orb',
    nextGuide:'Aim at the Pigeon Pea Plant Orb and pull the trigger to explore it.',
    paragraphs:[
        'Pigeon Pea now has a location in this scene. This Plant Orb connects information to this plant in the real place.',
        'The Orb is interactive. Select the Plant Orb to explore its information, beginning with simple facts and deeper connected branches.'
    ]
};

function runArWelcomeTutorial(index=0) {
    demoOrientationStep=index;
    if(index<=2)setDemoJourneyStage('why');
    else setDemoJourneyStage('map');
    if(index>=4 && !Number.isFinite(ambientBeesStartedAt))ambientBeesStartedAt=arWelcomeClock.elapsed;
    limMeshVisible=false;
    introBoardTextureDirty=true;
    syncDemoPanelActions();
    infoPanel?.setGuided(index>=1);
    const step=DEMO_ORIENTATION_STEPS[index];
    if(index===0){
        infoPanel?.setCompact(true);
        infoPanel?.setMediaCollapsed(true);
        infoPanel?.setIntroduction(true);
        infoPanel?.suspend(false);
    }
    if(step?.art){
        infoPanel?.setCompact(false);
        showDemoTutorialMedia(step.art,step.title,step.paragraphs.join('\n\n'));
    }
    showIntroBoard(step.title,step.paragraphs,step.button,()=>{
        if(demoOrientationStep!==index)return;
        suppressSessionSelectUntil=performance.now()+700;
        if(index===0)infoPanel?.setIntroduction(false);
        if(index<DEMO_ORIENTATION_STEPS.length-1){runArWelcomeTutorial(index+1);return;}
        appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-intro-pending');
        demoOrientationStep=-1;syncDemoPanelActions();finishIntroBoard();clearTimeout(aimRevealTimer);armDemoPlacement('plant',{explained:true});
    },{tutorialStep:DEMO_TUTORIAL_STEPS.WELCOME,stepLabel:`${index+1} of ${DEMO_ORIENTATION_STEPS.length}`,nextGuide:step.nextGuide,deferContinueUntilCopyReady:index===0});
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
        advanceWelcomeRootMilestone(moringa ? WELCOME_ROOT_MILESTONES.secondPlantPlaced : WELCOME_ROOT_MILESTONES.firstPlantPlaced);
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
        infoPanel?.setContextualHint(`Select the ${plantName} Plant Orb to open its Plant Profile.`);
        infoPanel?.suspend(false);
        setGuide(`Press the ${plantName} orb to reveal its connected Plant Profile.`);
    };
    const afterPlacement=moringa
        ? {title:'The living map can compare',paragraphs:['Moringa now has its own Plant Profile. Continue, then aim at and select the physical Moringa Plant Orb to compare it with the Pigeon Pea support shrub.'],button:'Continue',nextGuide:'Aim at and select the Moringa Plant Orb to read its profile.'}
        : POST_PLACEMENT_AREA_STEP;
    showIntroBoard(
        afterPlacement.title,
        afterPlacement.paragraphs,
        afterPlacement.button,
        () => {
            suppressSessionSelectUntil = performance.now() + 700;
            finishIntroBoard();
            setGuide(`The ${plantName} orb is ready. Hold it to move it, or press it to open or close its plant information.`);
        },
        {stepLabel:moringa?'A second plant':'After placing your first Plant Orb',nextGuide:afterPlacement.nextGuide,deferContinueUntilCopyReady:!moringa}
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
    infoPanel?.setMediaCollapsed(true);
    infoPanel?.setContextualHint('');
    const current = Math.max(0, Number(record.demoNoteTemplateIndex) || 0);
    record.demoNoteTemplateIndex = (current + 1) % DEMO_NOTE_TEMPLATE_KEYS.length;
    const templateKey = DEMO_NOTE_TEMPLATE_KEYS[record.demoNoteTemplateIndex];
    const template = spatialNoteTemplate(templateKey);
    record.demoContent = NOTE_TEMPLATES[templateKey];
    record.name = record.demoContent.title;
    record.description = template.description;
    record.appearance = {
        ...(record.appearance || {}),
        note_template: template.id,
        color: template.color,
        opacity: .64,
        surface: 'outline'
    };
    refreshDemoRecord(record);
    setGuide(`${record.demoContent.title} is using the same Note template and remains anchored in the same place.`);
    return true;
}

function showDemoClosingMessage() {
    setDemoJourneyStage('impact');
    advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.demoClosing);
    showIntroBoard(
        'A place people can understand and return to',
        [
            'You mapped two plants, opened their information, connected a fact with purpose, recorded an observation and linked two Areas.',
            'The result is more than a digital plant label. It is a living information map that can be entered simply and explored in depth.',
            'NourishlandXR can support school grounds, botanical gardens, parks, community gardens, farms, forests and small home projects through the same connected system.'
        ],
        'Finish demo',
        returnToWelcome
    );
}

function pairedDemoTotemPosition(side, groundBaseY) {
    const viewer = viewerMatrix;
    const right = viewer ? {x:Number(viewer[0]),z:Number(viewer[2])} : {x:1,z:0};
    const forward = viewer ? {x:-Number(viewer[8]),z:-Number(viewer[10])} : {x:0,z:-1};
    const rightLength = Math.hypot(right.x,right.z) || 1;
    const forwardLength = Math.hypot(forward.x,forward.z) || 1;
    return {
        x:(Number(viewer?.[12]) || 0)+forward.x/forwardLength*1.9+right.x/rightLength*side*.82,
        y:groundBaseY+DEMO_TOTEM_HALF_HEIGHT_METRES,
        z:(Number(viewer?.[14]) || 0)+forward.z/forwardLength*1.9+right.z/rightLength*side*.82
    };
}

function createDemoTotemExample() {
    const groundBaseY = demoGroundBaseY(hitMatrix, viewerMatrix, groundYEstimate);
    groundYEstimate = groundBaseY;
    const position = pairedDemoTotemPosition(1,groundBaseY);
    const pairRightLength=Math.hypot(Number(viewerMatrix?.[0]) || 1,Number(viewerMatrix?.[2]) || 0) || 1;
    const totem = {
        ...createMinimalMarkerDraft('area_checkpoint', {
            name: 'Totem',
            description: 'Welcome to this area.'
        }),
        // Spatial prisms are positioned from their centre. Raising the centre
        // by one half-height keeps the Totem's base exactly on the detected or
        // estimated ground plane, upright from the ground rather than at gaze.
        position,
        rotationY: demoTotemRotationForPosition(position),
        groundBaseY,
        type: 'area_checkpoint',
        demoType: 'zone',
        tutorialStage: 'totem',
        demoTotemExampleId:'botanical-garden',
        demoTotemColor:'#785a43',
        demoTotemSignsVisible:false,
        demoTotemFaded:false,
        demoArriveAt:performance.now(),
        demoPairRight:{x:(Number(viewerMatrix?.[0]) || 1)/pairRightLength,z:(Number(viewerMatrix?.[2]) || 0)/pairRightLength},
        demoLinkVisible: false,
        demoExpanded: true,
        demoInteractive: true,
        demoPanelOffset: { x: 0, y: 0 },
        simulatedAnchor: { x:76, y:76 },
        revealTitle: true,
        revealLines: 5,
        demoContent: DEMO_CONTENT.zone,
        texture: null
    };
    totem.texture = createMarkerTexture(totem);
    markers.push(totem);
    advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.firstAreaShown);
    updateSimulatedMarkers();
    showDemoTutorialMedia('totem','A Totem unfolds garden knowledge','Two simple physical buttons control the Totem: show or store its attached signs, and fade or restore it when it is not in use.');
    setGuide('The Totem welcomes you to this area. Open its short signs to find Notes, Plant Orbs and the neighbouring Totem.');
    showSceneContinue('Show neighbouring Totem', createDemoSecondTotem);
}

function createDemoSecondTotem() {
    const first = [...markers].reverse().find(record => record.demoType === 'zone');
    const groundBaseY = first?.groundBaseY ?? demoGroundBaseY(hitMatrix, viewerMatrix, groundYEstimate);
    groundYEstimate = groundBaseY;
    const position = first?.demoPairRight
        ? {x:first.position.x-first.demoPairRight.x*1.64,y:groundBaseY+DEMO_TOTEM_HALF_HEIGHT_METRES,z:first.position.z-first.demoPairRight.z*1.64}
        : pairedDemoTotemPosition(-1,groundBaseY);
    const totem = {
        ...createMinimalMarkerDraft('area_checkpoint', {
            name: 'Totem',
            description: 'Welcome to this area.'
        }),
        position,
        rotationY: demoTotemRotationForPosition(position),
        groundBaseY,
        type: 'area_checkpoint',
        demoType: 'zone',
        tutorialStage: 'totem2',
        demoTotemExampleId:'rainforest-walk',
        demoTotemColor:'#526d7a',
        demoTotemSignsVisible:false,
        demoTotemFaded:false,
        demoArriveAt:performance.now(),
        demoLinkVisible: false,
        demoLinkDirection: 'right',
        demoLinkDestination: 'Area 1',
        demoExpanded: true,
        demoInteractive: true,
        demoPanelOffset: { x: 0, y: 0 },
        simulatedAnchor: { x:24, y:76 },
        revealTitle: true,
        revealLines: 5,
        demoContent: DEMO_CONTENT.zoneTwo,
        texture: null
    };
    totem.texture = createMarkerTexture(totem);
    markers.push(totem);
    createDemoNeighbourhood(totem);
    advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.secondAreaShown);
    updateSimulatedMarkers();
    setGuide('A second Area arrives on the left, with its own nearby plants and a Vetiver row Note. Connect the two Totems when you are ready.');
    showSceneContinue('Connect the Totems', connectDemoTotems);
}

function connectDemoTotems() {
    const [first,second]=markers.filter(record=>record.demoType==='zone');
    if(!first || !second)return;
    first.demoLinkVisible=second.demoLinkVisible=true;
    first.demoLinkDirection='left';first.demoLinkDestination='Area 2';first.demoLinkPartner=second.id;
    second.demoLinkDirection='right';second.demoLinkDestination='Area 1';second.demoLinkPartner=first.id;
    first.totemCardsRefreshed=second.totemCardsRefreshed=0;
    updateSimulatedMarkers();
    advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.areasConnected);
    setGuide('The Areas are linked. Each Totem still keeps its own local plants and Notes.');
    showSceneContinue('Why link Areas?',showLinkedTotemsIntroduction);
}

function createDemoNeighbourhood(totem) {
    const right={x:Number(viewerMatrix?.[0]) || 1,z:Number(viewerMatrix?.[2]) || 0};
    const neighbours=[
        {name:'Banana',dx:-.48,dy:.92,anchor:{x:8,y:48},color:'green'},
        {name:'Acacia',dx:.30,dy:1.17,anchor:{x:39,y:46},color:'brown'},
        {name:'Jackfruit',dx:-.61,dy:.55,anchor:{x:9,y:68},color:'pigeonPea'},
        {name:'Lychee',dx:.49,dy:.71,anchor:{x:40,y:67},color:'green'}
    ];
    for(const neighbour of neighbours){
        const plantId=neighbour.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g,'-');
        const profile={common_name:neighbour.name,pim:createPimDocument({
            id:`${plantId}-demo-pim`,plantId,
            identity:{commonName:neighbour.name,identityStatement:`A Plant Information Mesh for ${neighbour.name}, ready for verified identity and observations from this Area.`},
            nodes:[
                {id:`${plantId}-identity-observation`,parentId:'scientific-information',title:'Identity to confirm',preview:'Record observed features and a reliable source',body:'Use several visible features together and keep a reliable identification source with this plant record.',informationType:'local_observation',evidenceStatus:'local_observation',status:'published'},
                {id:`${plantId}-place-observation`,parentId:'cultivation',title:'Growing in this Area',preview:'Record local conditions and response',body:'Add dated notes about light, soil, moisture, season, growth and care in this Area. Let observations guide any local growing advice.',informationType:'local_observation',evidenceStatus:'local_observation',status:'published'}
            ]
        })};
        markers.push({
            ...createMinimalMarkerDraft('plant',{name:neighbour.name}),
            name:neighbour.name,demoType:'plant',demoAmbientNeighbour:true,demoAlive:true,demoInteractive:true,
            demoKnowledgeProfile:profile,demoKnowledgeProjection:pimToArKnowledge(profile.pim),
            demoOrbColor:neighbour.color,demoOrbShape:'orb',demoExpanded:false,demoArriveAt:performance.now(),
            position:{x:totem.position.x+right.x*neighbour.dx,y:totem.groundBaseY+neighbour.dy,z:totem.position.z+right.z*neighbour.dx},
            simulatedAnchor:neighbour.anchor
        });
    }
    const note={...createMinimalMarkerDraft('note',{name:'Vetiver row'}),name:'Vetiver row',demoType:'note',demoAmbientNeighbour:true,
        demoInteractive:false,demoExpanded:true,demoArriveAt:performance.now(),simulatedAnchor:{x:16,y:83},
        position:{x:totem.position.x-right.x*.45,y:totem.groundBaseY+.42,z:totem.position.z-right.z*.45},
        demoContent:{title:'NOTE · Vetiver row',accent:'#d4bd83',lines:['OBSERVATION  Vetiver marks a living edge.']},revealLines:1};
    note.texture=createMarkerTexture(note);
    markers.push(note);
}

function showLinkedTotemsIntroduction() {
    showDemoTutorialMedia('connectedAreas','One larger garden, many Areas','Each Totem welcomes visitors to a different Area. The route connects the place while each Area keeps its own local knowledge.');
    showIntroBoard(
        'Why link Areas?',
        [
            'Each Totem is the welcoming home marker for one Area. Its plants, Notes and local information remain attached to that Area.',
            'A larger garden can contain many Areas, each marked by its own Totem. The monochrome overview shows how those local places fit into one connected landscape.',
            'Short signs point to Notes, Plant Orbs and neighbouring Totems without filling the scene with instructions.',
            'A link creates a visitor route between Areas. The neighbour sign gives its name and direction without mixing the information attached to either place.',
            'The Totem stays simple: welcome here, then choose what nearby information you want to open.'
        ],
        'Connect plant knowledge to learning',
        showLimoLearningModes
    );
}

function fadeMappedSceneForLimo() {
    markers.forEach(record=>{
        if(record.demoType==='zone'){
            record.demoTotemFaded=true;
            record.demoNarrativeFaded=true;
            record.demoInteractive=false;
            record.demoTotemSignsVisible=false;
            record.totemSelectedCard='';
        }
        if(record.demoType==='note'){
            record.demoNarrativeFaded=true;
            record.demoInteractive=false;
        }
    });
    updateSimulatedMarkers();
}

function knowledgeCombinationPlantRecord(){
    return markers.find(record=>record.demoType==='plant' && (record.demoPlantPreset==='pigeon-pea' || /pigeon pea/i.test(record.name || ''))) || markers.find(record=>record.demoType==='plant');
}

function selectPigeonPeaForCombination(){
    if(!knowledgeCombinationState)return false;
    selectDemoConnectionChoice(knowledgeCombinationState,DEMO_CONNECTION_CHOICES[0].id);
    syncKnowledgeCombinationOverlay();
    setGuide('Pigeon Pea selected. Choose Pruning or Nitrogen Fixation, then hold its glowing node and drag to the matching learning cell.');
    return true;
}

function knowledgeCombinationPoint(event,overlay){
    const box=overlay.getBoundingClientRect();
    return {x:100*(event.clientX-box.left)/Math.max(1,box.width),y:100*(event.clientY-box.top)/Math.max(1,box.height)};
}

function knowledgeCombinationStatus(state){
    const choice=demoConnectionChoice(state);
    if(!choice)return 'Choose one plant characteristic to begin.';
    if(state.error)return state.error;
    if(state.phase===DEMO_CONNECTION_PHASES.READY)return `Hold the glowing node on ${choice.sourceTitle} for a moment, then drag it to ${choice.targetTitle}.`;
    if(state.phase===DEMO_CONNECTION_PHASES.HOLDING)return 'Keep holding…';
    if(state.phase===DEMO_CONNECTION_PHASES.DRAGGING)return state.hoverTarget?'These ideas belong together. Release to connect them.':'Guide the living line to the blooming learning cell.';
    if(state.phase===DEMO_CONNECTION_PHASES.RESOLVING)return 'A new idea is forming…';
    if(state.phase===DEMO_CONNECTION_PHASES.RESULT)return 'The original ideas remain visible while a new idea emerges between them.';
    if(state.phase===DEMO_CONNECTION_PHASES.DEEPER_READY)return `Hold the node on ${choice.resultTitle}, then connect it to ${DEMO_DEEPER_CONNECTION.targetTitle}.`;
    if(state.phase===DEMO_CONNECTION_PHASES.DEEPER_HOLDING)return 'Keep holding…';
    if(state.phase===DEMO_CONNECTION_PHASES.DEEPER_DRAGGING)return state.hoverTarget?'Release to ground this idea in observation.':'Guide the line to Place and Observation.';
    if(state.phase===DEMO_CONNECTION_PHASES.DEEPER_RESOLVING)return 'Looking more closely…';
    return 'A deeper question is ready to carry back into the living place.';
}

function ensureKnowledgeCombinationOverlay(){
    if(!arWelcomeLayer)return null;
    let overlay=arWelcomeLayer.querySelector('[data-knowledge-combination]');
    if(overlay)return overlay;
    overlay=document.createElement('section');
    overlay.className='knowledge-combination';overlay.dataset.knowledgeCombination='';
    overlay.setAttribute('aria-label','Combine plant knowledge with learning cells');
    overlay.innerHTML=`<header><small>EVER-GENERATING INFORMATION MESH</small><h2>What can these ideas reveal together?</h2><p data-combination-status aria-live="polite"></p></header>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs>
            <linearGradient id="knowledge-primary-gradient"><stop offset="0" data-gradient-source></stop><stop offset="1" data-gradient-target></stop></linearGradient>
            <linearGradient id="knowledge-deeper-gradient"><stop offset="0" data-gradient-deeper-source></stop><stop offset="1" stop-color="${DEMO_DEEPER_CONNECTION.targetColor}"></stop></linearGradient>
        </defs><path class="is-established is-primary" data-primary-path></path><path class="is-established is-deeper" data-deeper-path></path><path class="is-live" data-live-path></path></svg>
        <div class="knowledge-column-label is-plant">PLANT CHARACTERISTICS</div><div class="knowledge-column-label is-learning">LEARNING CELLS</div>
        ${DEMO_CONNECTION_CHOICES.map(choice=>`<button type="button" class="knowledge-source-cell" data-combination-choice="${choice.id}" style="--cell-x:${DEMO_CONNECTION_POSITIONS.sources[choice.id].x}%;--cell-y:${DEMO_CONNECTION_POSITIONS.sources[choice.id].y}%;--cell-color:${choice.sourceColor}"><small>Pigeon Pea</small><strong>${choice.sourceTitle}</strong><span>${choice.sourceDetail}</span><i class="knowledge-node" data-combination-node="primary" aria-label="Hold and drag ${choice.sourceTitle} to ${choice.targetTitle}" role="button" tabindex="-1"></i></button>`).join('')}
        ${DEMO_CONNECTION_CHOICES.map(choice=>`<div class="knowledge-target-cell" data-combination-target="${choice.id}" style="--cell-x:${DEMO_CONNECTION_POSITIONS.targets[choice.id].x}%;--cell-y:${DEMO_CONNECTION_POSITIONS.targets[choice.id].y}%;--cell-color:${choice.targetColor}"><small>Learning cell</small><strong>${choice.targetTitle}</strong><span>${choice.targetDetail}</span></div>`).join('')}
        <article class="knowledge-derived-cell" data-combination-result style="--cell-x:${DEMO_CONNECTION_POSITIONS.result.x}%;--cell-y:${DEMO_CONNECTION_POSITIONS.result.y}%"><small>NEW CONNECTION</small><strong></strong><p></p><i class="knowledge-node" data-combination-node="deeper" aria-label="Hold and drag this new idea to Place and Observation" role="button" tabindex="0"></i></article>
        <div class="knowledge-target-cell is-deeper" data-combination-deeper-target style="--cell-x:${DEMO_CONNECTION_POSITIONS.deeperTarget.x}%;--cell-y:${DEMO_CONNECTION_POSITIONS.deeperTarget.y}%;--cell-color:${DEMO_DEEPER_CONNECTION.targetColor}"><small>Go deeper</small><strong>${DEMO_DEEPER_CONNECTION.targetTitle}</strong><span>${DEMO_DEEPER_CONNECTION.targetDetail}</span></div>
        <article class="knowledge-derived-cell is-deeper" data-combination-deeper-result style="--cell-x:${DEMO_CONNECTION_POSITIONS.deeperResult.x}%;--cell-y:${DEMO_CONNECTION_POSITIONS.deeperResult.y}%"><small>QUESTION FOR THIS PLACE</small><strong></strong><p></p></article>
        <nav><button type="button" data-combination-deeper>Go deeper</button><button type="button" data-combination-continue>Continue journey</button></nav>`;
    arWelcomeLayer.append(overlay);
    overlay.querySelectorAll('[data-combination-choice]').forEach(button=>button.addEventListener('click',event=>{
        if(event.target.closest('[data-combination-node]'))return;
        selectDemoConnectionChoice(knowledgeCombinationState,button.dataset.combinationChoice);syncKnowledgeCombinationOverlay();
        setGuide(`${demoConnectionChoice(knowledgeCombinationState).sourceTitle} selected. Hold its glowing connection node, then drag toward the matching learning cell.`);
    }));
    overlay.querySelector('[data-combination-deeper]')?.addEventListener('click',()=>{
        if(knowledgeCombinationState?.phase!==DEMO_CONNECTION_PHASES.RESULT)return;
        knowledgeCombinationState.phase=DEMO_CONNECTION_PHASES.DEEPER_READY;syncKnowledgeCombinationOverlay();
        setGuide(`Go deeper: hold the node on the new idea and connect it to ${DEMO_DEEPER_CONNECTION.targetTitle}.`);
    });
    overlay.querySelector('[data-combination-continue]')?.addEventListener('click',finishKnowledgeCombinationExperience);
    overlay.querySelectorAll('[data-combination-node]').forEach(node=>bindKnowledgeCombinationNode(node,overlay));
    return overlay;
}

function bindKnowledgeCombinationNode(node,overlay){
    const deeper=node.dataset.combinationNode==='deeper';
    const begin=(event,keyboard=false)=>{
        const state=knowledgeCombinationState,choice=demoConnectionChoice(state);
        const allowed=deeper?state?.phase===DEMO_CONNECTION_PHASES.DEEPER_READY:state?.phase===DEMO_CONNECTION_PHASES.READY;
        if(!state || !choice || !allowed)return;
        event.preventDefault();event.stopPropagation();
        const pointerId=keyboard?'keyboard':event.pointerId;
        state.phase=deeper?DEMO_CONNECTION_PHASES.DEEPER_HOLDING:DEMO_CONNECTION_PHASES.HOLDING;state.holdStartedAt=performance.now();state.holdProgress=0;state.error='';
        knowledgeCombinationHold={node,overlay,deeper,pointerId,armed:false,timer:0,frame:0};
        if(!keyboard)node.setPointerCapture?.(event.pointerId);
        const tick=now=>{
            if(!knowledgeCombinationHold || knowledgeCombinationHold.node!==node)return;
            state.holdProgress=Math.min(1,(now-state.holdStartedAt)/DEMO_CONNECTION_HOLD_MS);node.style.setProperty('--hold-progress',String(state.holdProgress));
            if(state.holdProgress>=1){
                knowledgeCombinationHold.armed=true;state.dragging=true;state.phase=deeper?DEMO_CONNECTION_PHASES.DEEPER_DRAGGING:DEMO_CONNECTION_PHASES.DRAGGING;state.pointer=demoConnectionSource(state);navigator.vibrate?.(35);syncKnowledgeCombinationOverlay();return;
            }
            knowledgeCombinationHold.frame=limRequestFrame(tick);
        };
        knowledgeCombinationHold.frame=limRequestFrame(tick);syncKnowledgeCombinationOverlay();
    };
    const move=event=>{
        const hold=knowledgeCombinationHold,state=knowledgeCombinationState;if(!hold || hold.node!==node || hold.pointerId!==event.pointerId || !hold.armed)return;
        event.preventDefault();event.stopPropagation();state.pointer=knowledgeCombinationPoint(event,overlay);state.hoverTarget=demoConnectionTargetAt(state,state.pointer.x,state.pointer.y,13);syncKnowledgeCombinationOverlay();
    };
    const finish=(event,cancelled=false)=>{
        const hold=knowledgeCombinationHold,state=knowledgeCombinationState;if(!hold || hold.node!==node || (event?.pointerId!==undefined && hold.pointerId!==event.pointerId))return;
        event?.preventDefault();event?.stopPropagation();limCancelFrame(hold.frame);knowledgeCombinationHold=null;
        const valid=hold.armed && !cancelled && state.hoverTarget;
        state.dragging=false;state.pointer=null;state.hoverTarget=false;state.holdProgress=0;node.style.removeProperty('--hold-progress');
        if(valid)resolveKnowledgeCombination(deeper);
        else{state.phase=deeper?DEMO_CONNECTION_PHASES.DEEPER_READY:DEMO_CONNECTION_PHASES.READY;syncKnowledgeCombinationOverlay();setGuide('Hold the glowing node for a moment, then drag the line all the way to its partner.');}
    };
    node.addEventListener('pointerdown',event=>begin(event));node.addEventListener('pointermove',move);node.addEventListener('pointerup',event=>finish(event));node.addEventListener('pointercancel',event=>finish(event,true));node.addEventListener('lostpointercapture',event=>{if(knowledgeCombinationHold?.node===node)finish(event,true);});
    node.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key) && !event.repeat)begin(event,true);});
    node.addEventListener('keyup',event=>{if(['Enter',' '].includes(event.key) && knowledgeCombinationHold?.node===node){knowledgeCombinationState.hoverTarget=knowledgeCombinationHold.armed;finish(event,false);}});
}

function syncKnowledgeCombinationOverlay(){
    const state=knowledgeCombinationState,overlay=arWelcomeLayer?.querySelector('[data-knowledge-combination]');if(!state || !overlay)return;
    const choice=demoConnectionChoice(state),deeper=demoConnectionIsDeeper(state),activeDrag=state.dragging;
    overlay.dataset.phase=state.phase;overlay.style.setProperty('--source-color',choice?.sourceColor || '#7ea45f');overlay.style.setProperty('--target-color',deeper?DEMO_DEEPER_CONNECTION.targetColor:(choice?.targetColor || '#a06a43'));
    overlay.querySelector('[data-combination-status]').textContent=knowledgeCombinationStatus(state);
    overlay.querySelectorAll('[data-combination-choice]').forEach(cell=>{const selected=cell.dataset.combinationChoice===choice?.id;cell.classList.toggle('is-selected',selected);cell.classList.toggle('is-muted',Boolean(choice && !selected));cell.setAttribute('aria-pressed',String(selected));const node=cell.querySelector('[data-combination-node]');if(node)node.tabIndex=selected && !state.primaryResult?0:-1;});
    overlay.querySelectorAll('[data-combination-target]').forEach(cell=>{const selected=cell.dataset.combinationTarget===choice?.id;cell.classList.toggle('is-matching',selected && [DEMO_CONNECTION_PHASES.DRAGGING,DEMO_CONNECTION_PHASES.RESOLVING].includes(state.phase));cell.classList.toggle('is-magnetic',selected && state.hoverTarget);cell.classList.toggle('is-muted',Boolean(choice && !selected));});
    const result=overlay.querySelector('[data-combination-result]');result.hidden=!state.primaryResult;if(state.primaryResult){result.querySelector('strong').textContent=state.primaryResult.derivedNode?.title || choice.resultTitle;result.querySelector('p').textContent=state.primaryResult.derivedNode?.summary || choice.resultSummary;}
    const deeperTarget=overlay.querySelector('[data-combination-deeper-target]');deeperTarget.hidden=!deeper;deeperTarget.classList.toggle('is-matching',[DEMO_CONNECTION_PHASES.DEEPER_DRAGGING,DEMO_CONNECTION_PHASES.DEEPER_RESOLVING].includes(state.phase));deeperTarget.classList.toggle('is-magnetic',deeper && state.hoverTarget);
    const deeperResult=overlay.querySelector('[data-combination-deeper-result]');deeperResult.hidden=!state.deeperResult;if(state.deeperResult){deeperResult.querySelector('strong').textContent=state.deeperResult.derivedNode?.title || choice.deeperTitle;deeperResult.querySelector('p').textContent=state.deeperResult.derivedNode?.summary || choice.deeperSummary;}
    overlay.querySelector('[data-combination-deeper]').hidden=state.phase!==DEMO_CONNECTION_PHASES.RESULT;
    overlay.querySelector('[data-combination-continue]').hidden=!state.primaryResult || [DEMO_CONNECTION_PHASES.DEEPER_HOLDING,DEMO_CONNECTION_PHASES.DEEPER_DRAGGING,DEMO_CONNECTION_PHASES.DEEPER_RESOLVING].includes(state.phase);
    const primaryPath=overlay.querySelector('[data-primary-path]'),deeperPath=overlay.querySelector('[data-deeper-path]'),livePath=overlay.querySelector('[data-live-path]');
    overlay.querySelector('[data-gradient-source]')?.setAttribute('stop-color',choice?.sourceColor || '#7ea45f');overlay.querySelector('[data-gradient-target]')?.setAttribute('stop-color',choice?.targetColor || '#a06a43');overlay.querySelector('[data-gradient-deeper-source]')?.setAttribute('stop-color',choice?.targetColor || '#a06a43');
    primaryPath.setAttribute('d',state.primaryResult?`${demoConnectionCurve(DEMO_CONNECTION_POSITIONS.sources[choice.id],DEMO_CONNECTION_POSITIONS.result)} ${demoConnectionCurve(DEMO_CONNECTION_POSITIONS.targets[choice.id],DEMO_CONNECTION_POSITIONS.result)}`:'');
    deeperPath.setAttribute('d',state.deeperResult?`${demoConnectionCurve(DEMO_CONNECTION_POSITIONS.result,DEMO_CONNECTION_POSITIONS.deeperResult)} ${demoConnectionCurve(DEMO_CONNECTION_POSITIONS.deeperTarget,DEMO_CONNECTION_POSITIONS.deeperResult)}`:'');
    const endpoint=activeDrag?(state.hoverTarget?demoConnectionTarget(state):state.pointer):null;livePath.setAttribute('d',endpoint?demoConnectionCurve(demoConnectionSource(state),endpoint):'');
    paintWelcomeLayer(performance.now());introBoardTextureDirty=true;
}

async function resolveKnowledgeCombination(deeper=false){
    const state=knowledgeCombinationState,choice=demoConnectionChoice(state);if(!state || !choice)return false;
    state.phase=deeper?DEMO_CONNECTION_PHASES.DEEPER_RESOLVING:DEMO_CONNECTION_PHASES.RESOLVING;syncKnowledgeCombinationOverlay();
    try{
        const record=knowledgeCombinationPlantRecord() || {id:'pigeon-pea-demo',demoPlantPreset:'pigeon-pea',demoExpanded:false};
        const document=demoOrbKnowledge(record).document,ownerId=demoMeshOwnerId(record,document);meshSourceResolver.registerPimDocument(document,{ownerId});
        const refs=deeper?[state.primaryResult.derivedRef,limMeshRef(DEMO_DEEPER_CONNECTION.targetId)]:[pimMeshRef(document,choice.sourceId,{ownerId,specimenId:String(record.id || ownerId)}),limMeshRef(choice.targetId)];
        meshComposition.clear();refs.forEach(ref=>meshComposition.add(ref));meshComposition.resolving();
        const result=await meshRelationships.resolve(refs,{context:{mode:'general'}});meshComposition.display(result);
        if(deeper){state.deeperResult=result;state.phase=DEMO_CONNECTION_PHASES.COMPLETE;setGuide(`${choice.deeperTitle} is ready as a question for this place.`);}
        else{state.primaryResult=result;state.phase=DEMO_CONNECTION_PHASES.RESULT;setGuide(`${choice.resultTitle} emerged. Go deeper with Place and Observation, or continue the journey.`);}
        advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.knowledgeConnected);
        navigator.vibrate?.([35,35,60]);
    }catch(error){meshComposition.fail(error);state.error='The ideas did not connect this time. Try the same gesture again.';state.phase=deeper?DEMO_CONNECTION_PHASES.DEEPER_READY:DEMO_CONNECTION_PHASES.READY;}
    syncKnowledgeCombinationOverlay();return true;
}

function startKnowledgeCombinationExperience(){
    useSharedWelcomeBoard(false);clearLimSelection();knowledgeCombinationState=createDemoConnectionState();knowledgeCombinationCleanup();
    limMeshVisible=true;limMeshActivatedAt=arWelcomeClock.elapsed;introBoardTextureDirty=true;
    const plant=knowledgeCombinationPlantRecord();
    if(plant){plant.demoInteractive=true;plant.demoAlive=true;plant.demoExpanded=false;plant.demoActiveBranch='';plant.demoExpandedNodeIds=[];plant.demoExpandedBranches=[];plant.demoSelectedNodeId='';plant.informationPosition=null;plant.informationPose=null;refreshDemoRecord(plant);}
    const board=appRoot?.querySelector('[data-tryit-guided-choice]');if(board)board.hidden=true;
    appRoot?.querySelector('[data-tryit-intro-continue]')?.setAttribute('hidden','');infoPanel?.suspend(true);
    const overlay=ensureKnowledgeCombinationOverlay();overlay?.removeAttribute('hidden');syncKnowledgeCombinationOverlay();
    setGuide('Tap the Pigeon Pea orb or choose one of its two characteristic cells. Then hold and drag its glowing node.');
    knowledgeCombinationCleanup=()=>{limCancelFrame(knowledgeCombinationHold?.frame);knowledgeCombinationHold=null;overlay?.setAttribute('hidden','');};
}

function finishKnowledgeCombinationExperience(){
    knowledgeCombinationCleanup();knowledgeCombinationState=null;infoPanel?.suspend(false);showAudienceValue();
}

function showKnowledgeCombinationIntroduction(){
    clearLimSelection();
    showIntroBoard(
        'Knowledge grows through connection',
        [
            'A plant characteristic can meet a learning cell to reveal a useful idea that neither cell holds alone.',
            'Choose one of two Pigeon Pea characteristics. Hold its connection node, then draw it toward the learning cell that blooms in response.',
            'The source cells stay visible. A new cell emerges between them, and you can optionally go deeper by connecting it to Place and Observation.'
        ],
        'Combine cells',
        startKnowledgeCombinationExperience,
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'Connect knowledge',nextGuide:'Choose a plant characteristic, then hold and drag its glowing connection node.'}
    );
}

function showLimoLearningModes() {
    setDemoJourneyStage('apply');
    showDemoTutorialMedia('connection','Connect plant knowledge to learning','A Plant Profile explains a plant. Learning pathways turn that knowledge into questions and practical exploration, on site or as a standalone experience.');
    showIntroBoard(
        'Learn here or as a standalone experience',
        [
            'A learning pathway can guide someone on the spot in AR, where questions and actions stay connected to the living place in front of them.',
            'The same pathway can also work as a standalone learning experience before a visit, in a classroom or when reflecting afterwards.',
            'A Plant Profile explains the plant. Connecting that knowledge to learning turns facts into pathways: what to notice, how the plant relates to its place, why it matters and what someone could try next.'
        ],
        'Show pathway archetypes',
        showLimoArchetypes,
        {stepLabel:'From plant information to learning',nextGuide:'Open the pathway archetypes, then select one to explore its questions.'}
    );
}

function showLimoArchetypes() {
    fadeMappedSceneForLimo();
    clearLimSelection();
    limExpandedCells=new Set();
    limExpandedAt=new Map();
    limMeshVisible=true;
    limMeshActivatedAt=arWelcomeClock.elapsed;
    introBoardTextureDirty=true;
    paintWelcomeLayer(performance.now());
    infoPanel?.showLearning({
        id:'limo-pathway-archetypes',
        title:'Choose a learning pathway',
        body:'The four archetypes are starting points for different ways of learning. Select an archetype to open its pathway, then follow the connected cells that become relevant.',
        image:DEMO_TUTORIAL_ART.pathways.image,
        imageAlt:DEMO_TUTORIAL_ART.pathways.alt,
        accent:'#9fdcff',
        mesh:'lim',
        editable:false
    });
    showIntroBoard(
        'Choose a pathway archetype',
        [
            'The scene is quiet now so the learning pathways can take focus. Totems and Notes remain anchored, but fade into the background.',
            'Select any archetype to explore. Each pathway opens a different way to read the place, understand living relationships, design with them or shape an outcome.',
            'A pathway can begin from a Plant Profile, from something observed on site or as a standalone learning journey.'
        ],
        'Continue after exploring',
        showKnowledgeCombinationIntroduction,
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'Learning pathways',nextGuide:'Select an archetype to explore its connected learning cells.'}
    );
    setGuide('Select a pathway archetype to explore its connected learning cells.');
    syncDemoPanelActions();
}

function showAudienceValue() {
    setDemoJourneyStage('impact');
    showIntroBoard(
        'One place, different reasons to care',
        [
            'On a first visit, the map answers immediate questions: What is this? Why is it here? What can I notice or do next?',
            'For a school, the same place becomes a learning environment where students can observe, compare, record and return over time.',
            'For a garden, park or land steward, published knowledge, visitor guidance and local observations remain organised around the real landscape.'
        ],
        'See the connected result',
        showDemoClosingMessage
    );
}

function showTotemIntroduction() {
    setDemoJourneyStage('connect');
    showDemoTutorialMedia('totem','A Totem gathers local information','A welcoming Totem gives each Area a clear, simple place to gather its visitor information.');
    showIntroBoard(
        'Meet the Totem',
        [
            'A Totem welcomes you to an Area and keeps its local information together.',
            'Its short signs point to Notes, Plant Orbs and neighbouring Totems.',
            'Open the Totem to see what is nearby, then choose the information you want to explore.'
        ],
        'Show Totem',
        () => {
            finishIntroBoard();
            createDemoTotemExample();
        }
    );
}

function showSpatialGardenSummary() {
    setDemoJourneyStage('connect');
    showIntroBoard(
        'The information now belongs to a place',
        'This scene now holds two plant profiles and one local observation. NourishlandXR organises them into Areas, so visitors can understand where they are and how each part connects to the wider project.',
        'See Area Totems',
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
    advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.notePlaced);
    infoPanel?.setContextualHint('Select the note to see what changed.');
    if(pathwayNotePlacementPending){
        pathwayNotePlacementPending=false;placementReady=false;
        setGuide('Your observation Note is anchored to this place.');
        completeLearningPath('placed');
        return;
    }
    setGuide('Your observation is anchored beside the plants.');
    showIntroBoard(
        'Your Note is in place',
        'This Note records a seasonal change beside the plants. A Note can also hold an image, memory or task that someone may return to here.',
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

function demoControlPanelRect() {
    const panel = infoPanel?.element;
    if (!simulatedMode || !panel || !panel.getClientRects().length) return null;
    return panel.getBoundingClientRect();
}

function keepDemoAnchorClear(anchor, radius) {
    const { width, height } = demoViewportDimensions();
    return avoidDemoPanelOverlap(anchor, radius, demoControlPanelRect(), width, height);
}

function refreshSimulatedPlacementAim() {
    if (!simulatedMode) return;
    const place = appRoot?.querySelector('[data-tryit-place]');
    if (!place || !place.dataset.preferredAimX) return;
    const preferred = { x: Number(place.dataset.preferredAimX), y: Number(place.dataset.preferredAimY) };
    const radius = place.offsetWidth / 2 || (window.innerWidth <= 620 ? 44 : 58);
    const aim = keepDemoAnchorClear(preferred, radius);
    place.dataset.aimX = String(aim.x);
    place.dataset.aimY = String(aim.y);
    place.style.setProperty('--aim-x', `${aim.x}%`);
    place.style.setProperty('--aim-y', `${aim.y}%`);
}

function armDemoPlacement(type, {explained=false}={}) {
    if (markers.some(record => record.tutorialStage === type)) return;
    setDemoJourneyStage(type==='plant'?'map':'apply');
    demoStage = type;
    placementReady = false;
    placementDistance = AR_EXPERIENCE_CONFIG.placementDistanceMetres;
    shiftSimulatedSceneForStage(type);
    const place = appRoot?.querySelector('[data-tryit-place]');
    if (place && simulatedMode) {
        const comfortOffsetPercent = AR_PHONE_COMFORT.pointerOffsetPixels / Math.max(320, window.innerHeight || 640) * 100;
        const compactAim = window.innerWidth <= 600;
        const stageAim = (compactAim ? {
            plant: { x: 78, y: 43 },
            plant2: { x: 22, y: 43 },
            note: { x: 50, y: 44 },
            totem: { x: 50, y: 58 }
        } : {
            plant: { x: 34, y: Math.min(78, 50 + comfortOffsetPercent) },
            plant2: { x: 66, y: Math.min(78, 50 + comfortOffsetPercent) },
            note: { x: 50, y: Math.min(86, 58 + comfortOffsetPercent) },
            totem: { x: 50, y: Math.min(86, 62 + comfortOffsetPercent) }
        })[type] || { x: 50, y: Math.min(86, 50 + comfortOffsetPercent) };
        place.dataset.preferredAimX = String(stageAim.x);
        place.dataset.preferredAimY = String(stageAim.y);
        refreshSimulatedPlacementAim();
    } else if (place) {
        place.style.setProperty('--aim-x', '50%');
        place.style.setProperty('--aim-y', `calc(50% + ${AR_PHONE_COMFORT.pointerOffsetCss})`);
    }
    clearTimeout(aimRevealTimer);
    place?.setAttribute('hidden', '');
    place?.classList.remove('is-revealing', 'is-ready');
    if(place)place.dataset.placementKind=type;
    const label = place?.querySelector('.creator-ar-placement-guide-label');
    if (label) label.textContent = type === 'plant' ? 'Place Orb' : type === 'plant2' ? 'Place Orb' : type === 'totem' ? 'Place Totem' : 'Place Note';
    place?.setAttribute('aria-label', type === 'plant'
        ? 'Place the Pigeon Pea Plant Orb'
        : type === 'plant2' ? 'Place the Moringa Plant Orb' : type === 'totem' ? 'Place the Botanical Garden Totem' : 'Place a Note');
    setGuide(['plant', 'plant2'].includes(type)
        ? 'Look around slowly. The centre aim will appear when you are ready.'
        : type==='totem'?'Aim the upright preview where the Totem should stand. Use the thumbstick to adjust depth.':'Take in the space before choosing the next position.');
    const introductions = {
        plant: ['A plant story in this place', [
            'A Plant Orb gives a plant’s information a location in the scene.',
            'Pigeon Pea will be our first example. No previous plant knowledge is needed.'
        ]],
        plant2: ['Compare a second plant', 'Moringa will have its own Orb and profile beside Pigeon Pea. Together they show how different plant roles can be compared in one place.'],
        note: ['Add one observation', 'A Note keeps something noticed in this part of the landscape beside the plants it relates to. It can be as simple as flowering, damage, a task or a question.'],
        totem: ['Place Botanical Garden Totem', 'Aim the upright ghost where the Totem should stand. Adjust its distance with the controller thumbstick, then confirm placement.']
    };
    const [title, introduction] = introductions[type];
    const mediaKey=type==='totem'?'totem':type==='note'?'note':'orb';
    showDemoTutorialMedia(mediaKey,title,typeof introduction==='string'?introduction:introduction.join('\n\n'));
    const startPlacement = () => {
        suppressSessionSelectUntil = performance.now() + 700;
        finishIntroBoard();
        const questTriggerPlacement=Boolean(session && demoControllerInputSource()?.targetRayMode!=='screen');
        const placementCopy = type === 'plant'
            ? {title:'Place Pigeon Pea',body:questTriggerPlacement?'Aim at the ground where you want the plant to appear, then pull the Quest controller trigger to place Pigeon Pea.':'Aim at the ground where you want the plant to appear, then tap the aiming circle to place Pigeon Pea.',next:questTriggerPlacement?'Aim at the ground and pull the trigger to place Pigeon Pea.':'Aim at the ground and tap the aiming circle to place Pigeon Pea.'}
            : type === 'plant2'
                ? {title:'Place Moringa',body:'This second orb will show how two distinct plant profiles can share a place.',next:'Press the visible aiming circle to place Moringa.'}
                : type==='totem'
                    ? {title:'Place Botanical Garden Totem',body:'The vertical preview shows where the Totem will stand. Adjust its depth, then confirm placement.',next:'Aim the upright preview and pull the trigger to place the Totem.'}
                    : {title:'Place an observation',body:'A Note gives an observation a location beside the plants.',next:'Press the visible aiming circle to place the Note.'};
        introBoardTitle=placementCopy.title;
        introBoardBody=placementCopy.body;
        introBoardVisibleBody=placementCopy.body;
        introBoardTextureDirty=true;
        const board=appRoot?.querySelector('[data-tryit-guided-choice]');
        if(board){board.innerHTML=`<small>${demoIntroLabel()}</small><h2>${placementCopy.title}</h2><div class="tryit-board-text-window"><p>${placementCopy.body}</p></div>`;board.classList.add('is-copy-ready');board.classList.remove('is-typing');}
        setIntroBoardNextGuide(placementCopy.next);
        setGuide(type === 'plant'
            ? questTriggerPlacement?'Aim at the ground, then pull the Quest controller trigger to place Pigeon Pea.':'Aim at the ground, then tap the aiming circle to place Pigeon Pea.'
            : type === 'plant2'
                ? 'Press the aiming circle to place the Moringa orb.'
                : type==='totem'?'Position the upright Totem preview, then confirm placement.':'Tap the circle to place a Note.');
        placementReady = true;
        place?.removeAttribute('hidden');
        refreshSimulatedPlacementAim();
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
        markers.forEach(record => {if(record.texture)gl?.deleteTexture(record.texture);});
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

function simulatedAnchorFromPointer(startAnchor, startX, startY, event, markerRadius = 32) {
    const { width: viewportWidth, height: viewportHeight } = demoViewportDimensions();
    const anchor = {
        x: Math.max(8, Math.min(92, Number(startAnchor?.x) + ((event.clientX - startX) / viewportWidth) * 100)),
        y: Math.max(12, Math.min(88, Number(startAnchor?.y) + ((event.clientY - startY) / viewportHeight) * 100))
    };
    return keepDemoAnchorClear(anchor, markerRadius);
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
    const desktopConsole = appRoot?.querySelector('.tryit-demo.is-desktop-spatial-preview')
        ? appRoot.querySelector('.nlxr-info-panel.is-demo-panel:not(.is-hidden)')
        : null;
    const desktopSafeLeft = desktopConsole
        ? Math.min(viewportWidth - 12, desktopConsole.getBoundingClientRect().right + 16)
        : 12;
    const minimumX = desktopSafeLeft + surface.panelWidth / 2 - anchorX;
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
    const ambient=Boolean(record.demoAmbientNeighbour && record.demoInteractive===false);
    const anchoredOrb = `<span class="tryit-sim-marker tryit-sim-marker-plant is-demo-orb is-demo-${record.demoOrbShape || 'orb'} has-plant-profile${record.demoExpanded ? ' has-information' : ''}${demoHeldIndex === index ? ' is-held' : ''}${ambient ? ' is-neighbour-orb' : ''}${record.demoInteractive === false ? ' is-arriving' : ''}" data-demo-marker-index="${index}" style="${anchorVariables};${orbAppearance};--depth-scale:${record.demoDepthScale || 1}" role="${record.demoInteractive===false ? 'img' : 'button'}" tabindex="${record.demoInteractive===false ? '-1' : '0'}" aria-label="${record.demoInteractive===false ? `Nearby ${record.name} Plant Orb` : orbLabel}"><span class="tryit-sim-orb is-plant" style="${orbAppearance}" aria-hidden="true"></span></span>`;
    if (!record.demoExpanded) return anchoredOrb;
    const surface = demoPimSurfaceLayout(anchor);
    const profileVariables = `${anchorVariables};--panel-x:${offset.x}px;--panel-y:${offset.y}px;width:${surface.panelWidth}px;height:${surface.panelHeight}px`;
    return `${anchoredOrb}<span class="tryit-sim-plant-profile" data-demo-plant-profile="${index}" style="${profileVariables}" role="group" aria-label="${record.name || 'Plant'} information"><button type="button" class="nlxr-desktop-pim-move" data-desktop-pim-move-handle aria-label="Move plant information"><span aria-hidden="true">Move plant information</span></button>${demoPlantKnowledgeMarkup(record, anchor)}</span>`;
}

function renderSimulatedTotem(record, index, anchor) {
    const cards = demoTotemCards(record);
    const linkLabel = record.demoLinkVisible
        ? `<span class="tryit-sim-totem-link-label" aria-hidden="true">${record.demoLinkDirection === 'left' ? '←' : '→'} ${record.demoLinkDestination || 'Linked Area'}</span>`
        : '';
    const colour=record.demoTotemColor || record.demoContent?.accent || '#715a46';
    return `<span class="tryit-sim-marker tryit-sim-marker-zone tryit-sim-totem-system nlxr-totem-system is-totem-style-basic${performance.now()-record.demoArriveAt<1800?' is-new-arrival':''}${record.demoTotemSignsVisible?' is-signs-open':''}${record.demoTotemFaded?' is-totem-faded':''}${record.demoNarrativeFaded?' is-narrative-faded':''}${demoHeldIndex === index ? ' is-held' : ''}" data-demo-marker-index="${index}" style="${simulatedAnchorStyle(anchor)};--demo-totem-color:${colour};--depth-scale:${record.demoDepthScale || 1}" role="group" aria-label="Totem information"><span class="tryit-sim-totem-pillar" aria-hidden="true"></span><span class="nlxr-totem-controls" aria-label="Totem controls"><button type="button" data-totem-signs aria-pressed="${Boolean(record.demoTotemSignsVisible && !record.demoTotemFaded)}" aria-label="${record.demoTotemSignsVisible?'Store':'Show'} attached signs"><span aria-hidden="true">↔</span><small>Signs</small></button><button type="button" data-totem-fade aria-pressed="${Boolean(record.demoTotemFaded)}" aria-label="${record.demoTotemFaded?'Restore':'Fade'} Totem"><span aria-hidden="true">◐</span><small>${record.demoTotemFaded?'Wake':'Fade'}</small></button></span>${totemCardsMarkup(cards,record.totemSelectedCard)}${linkLabel}</span>`;
}

function toggleDemoPlantProfile(record) {
    if(knowledgeCombinationState && record===knowledgeCombinationPlantRecord())return selectPigeonPeaForCombination();
    if(demoKnowledgeWorkspace) return;
    if (!record || record.demoType !== 'plant') return;
    const recordIndex = markers.indexOf(record);
    if (demoHeldIndex === recordIndex) releaseHeldDemoRecord();
    const opening=!record.demoExpanded;
    record.demoExpanded = opening;
    if (record.demoExpanded) {
        infoPanel?.setContextualHint('');
        activePimLimBridge=null;
        if(record.tutorialStage==='plant'){setDemoJourneyStage('know');advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.plantProfileOpened);}
        clearLimSelection();
        const moringa=record.demoPlantPreset==='moringa';
        infoPanel?.focusPlant(record,demoOrbKnowledge(record).document,moringa
            ? {image:MORINGA_PROFILE_IMAGE,alt:'Moringa tree with compound green leaves'}
            : {image:PIGEON_PEA_CONTROL_IMAGE,alt:'Pigeon Pea with flowers, tender green pods, fresh green peas and whole dry peas',hint:'Select the plant to explore it, or grab it to reposition it.'});
        setDemoTutorialStep(DEMO_TUTORIAL_STEPS.PIM);
        setDemoPimState(record, pimCreateInteractionState(demoPimExpandedNodeIds(record), record.demoSelectedNodeId || '', record.id || record.name || ''));
        record.profileRevealStarted = performance.now();
        const firstOpen = !record.demoProfileOpened;
        record.demoProfileOpened = true;
        record.demoActiveBranch ||= '';
        record.demoExpandedBranches ||= [];
        if (firstOpen) {
            record.demoProfileInteracted = false;
            record.demoProfileReady = false;
            record.demoProfileInteractionCount = 0;
        }
        ensureDemoPimPose(record);
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
        infoPanel?.setMediaCollapsed(true);
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
        setGuide('Aim at a visible plant information cell to explore it.');
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
    record.pimBloomPath = wasOpen ? '' : node.path;
    record.pimBloomStarted = wasOpen ? 0 : performance.now();
    refreshDemoPimProfile(record);
    const opened = demoPimState(record).expandedNodeIds.has(node.path);
    const remaining = advanceAfterDemoProfileInteraction(record);
    setGuide(opened
        ? `${node.label} ${wasOpen ? 'remains open.' : 'opened into its connected information cells.'}${remaining ? ` Open ${remaining} more ${remaining === 1 ? 'cell' : 'cells'} to keep exploring this plant.` : ''}`
        : `${node.label} remains closed.`);
    return true;
}

function advanceAfterDemoProfileInteraction(record) {
    if (!record || record.demoProfileInteracted) return 0;
    if (record.demoProfileReady) return 0;
    const opened = demoPimState(record).expandedNodeIds.has(record.demoActiveBranch);
    const explorationGoal = record.tutorialStage === 'plant' ? 3 : 2;
    if (opened) record.demoProfileInteractionCount = (Number(record.demoProfileInteractionCount) || 0) + 1;
    const remaining = Math.max(0, explorationGoal - (Number(record.demoProfileInteractionCount) || 0));
    if (remaining) return remaining;
    // Exploring information unlocks progression; it never performs it.
    record.demoProfileReady = true;
    const continueButton=appRoot?.querySelector('[data-tryit-intro-continue]');
    if(continueButton){continueButton.textContent=demoLocalizedText('Continue');continueButton.hidden=false;continueButton.disabled=false;}
    setGuide('You have explored this plant information. Continue when you are ready.');
    syncDemoPanelActions();
    return 0;
}

function orientDemoPimPoseToViewer(pose) {
    if (!pose?.position || !pose?.normal || !pose?.right || !viewerMatrix) return pose;
    const towardViewer = {
        x: Number(viewerMatrix[12]) - pose.position.x,
        z: Number(viewerMatrix[14]) - pose.position.z
    };
    const length = Math.hypot(towardViewer.x, towardViewer.z);
    if (length < .001) return pose;
    // Aim the whole PIM face at the viewer when it first opens. Merely flipping
    // a stored normal could leave a Pigeon Pea panel almost edge-on.
    const normal = { x: towardViewer.x / length, y: 0, z: towardViewer.z / length };
    const right = { x: normal.z, y: 0, z: -normal.x };
    return { ...pose, normal, right };
}

function ensureDemoPimPose(record) {
    if (!record) return null;
    // Capture the viewer-facing pose once when the panel opens. Re-evaluating
    // its facing every frame can flip the surface as phone tracking jitters or
    // the viewer crosses its plane, which looks like the whole panel jumped.
    record.informationPose ||= orientDemoPimPoseToViewer(plantInformationPose(record));
    return record.informationPose;
}

function demoPimPointerTarget(record) {
    const origin = demoPointerWorldOrigin();
    const direction = demoPointerWorldRay();
    if (!origin || !direction || !record) return null;
    ensureDemoPimPose(record);
    const defaultPimPanel = pimSpatialPanel(record.informationPose);
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
        point: hit,
        distance,
        xPercent,
        yPercent,
        node: pimHoneycombTargetAtPercent(knowledge, demoPimExpandedNodeIds(record), xPercent, yPercent, {
            ...demoSpatialPimLayoutOptions(),
            readerControl:false,
            softSurface:false,
            layoutWidth: size.layoutWidth,
            layoutHeight: size.layoutHeight,
            bloomProgress,
            bloomPath:record.pimBloomPath || '',
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
    const faded=linked.every(record=>record.demoTotemFaded) ? ' is-narrative-faded' : '';
    return `<span class="tryit-sim-area-link-line${faded}" aria-hidden="true" style="left:${start.x}%;top:${start.y}%;width:${width}%;transform:rotate(${angle}deg)"></span><span class="tryit-sim-area-link-label${faded}" aria-hidden="true" style="left:${midpoint.x}%;top:${midpoint.y}%">↔ LINKED AREAS</span>`;
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
        const collapsible = record.demoExpanded && record.demoInteractive !== false ? ' role="button" tabindex="0" aria-label="Move this information panel. Tap to hide."' : '';
        const compactContent = record.demoType === 'note' && content
            ? `<strong>${content.title}</strong>${lines.map(line => `<small>${line}</small>`).join('')}`
            : '';
        const orbProjection = record.demoType === 'marker' ? '<span class="tryit-sim-orb" aria-hidden="true"></span>' : '';
        return `<span class="tryit-sim-marker tryit-sim-marker-${record.demoType || record.type}${record.demoType === 'note' ? ' nourishland-spatial-note-surface' : ''}${record.demoAmbientNeighbour ? ' is-neighbour-note' : ''}${record.demoNarrativeFaded ? ' is-narrative-faded' : ''}${record.demoOrbColor ? ' is-demo-orb' : ''}${record.demoExpanded ? ' is-expanded' : ''}${demoHeldIndex === index ? ' is-held' : ''}${record.demoInteractive === false ? ' is-arriving' : ''}" data-demo-marker-index="${index}" style="${simulatedAnchorStyle(anchor)};${demoOrbStyle(record)};--panel-x:${offset.x}px;--panel-y:${offset.y}px;--depth-scale:${record.demoDepthScale || 1}"${collapsible}>${orbProjection}${content && record.demoExpanded ? `<strong>${record.revealTitle === false ? '' : content.title}</strong>${lines.map(line => `<small>${line}</small>`).join('')}` : compactContent}</span>`;
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
        if(record.demoType==='plant'){
            compactMarker.addEventListener('pointerenter',()=>compactMarker.classList.add('is-pointer-hover'));
            compactMarker.addEventListener('pointerleave',()=>compactMarker.classList.remove('is-pointer-hover'));
        }
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
                const orbRadius = record.demoType === 'plant'
                    ? Math.max(32, compactMarker.offsetWidth * (record.demoDepthScale || 1) / 2 + 8) : 32;
                record.simulatedAnchor = simulatedAnchorFromPointer(holdGesture.startAnchor, holdGesture.startX, holdGesture.startY, event, orbRadius);
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
            compactMarker.querySelector('[data-totem-signs]')?.addEventListener('pointerdown',event=>event.stopPropagation());
            compactMarker.querySelector('[data-totem-signs]')?.addEventListener('click',event=>{event.stopPropagation();infoPanel?.setMediaCollapsed(true);record.demoTotemSignsVisible=!record.demoTotemSignsVisible;record.demoTotemFaded=false;record.totemSelectedCard='';record.totemCardsRefreshed=0;updateSimulatedMarkers();});
            compactMarker.querySelector('[data-totem-fade]')?.addEventListener('pointerdown',event=>event.stopPropagation());
            compactMarker.querySelector('[data-totem-fade]')?.addEventListener('click',event=>{event.stopPropagation();infoPanel?.setMediaCollapsed(true);record.demoTotemFaded=!record.demoTotemFaded;record.totemSelectedCard='';updateSimulatedMarkers();});
            compactMarker.querySelectorAll('[data-totem-card]').forEach(button=>{
                button.addEventListener('pointerdown',event=>event.stopPropagation());
                button.addEventListener('click',event=>{
                    event.stopPropagation();infoPanel?.setMediaCollapsed(true);record.totemSelectedCard=record.totemSelectedCard===button.dataset.totemCard ? '' : button.dataset.totemCard;updateSimulatedMarkers();
                });
            });
            compactMarker.querySelector('[data-totem-close]')?.addEventListener('pointerdown',event=>event.stopPropagation());
            compactMarker.querySelector('[data-totem-close]')?.addEventListener('click',event=>{
                event.stopPropagation();const previous=record.totemSelectedCard;record.totemSelectedCard='';updateSimulatedMarkers();
                appRoot.querySelector('[data-demo-marker-index="'+index+'"] [data-totem-card="'+previous+'"]')?.focus();
            });
            const detail=compactMarker.querySelector('.nlxr-totem-detail');
            if(detail) appRoot.append(detail);
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
        const handles = profile.querySelectorAll('[data-desktop-pim-move-handle],[data-plant-profile-handle]');
        if (!record || !handles.length) return;
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
                setGuide('Returned to the previous group of plant information.');
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
            record.pimBloomPath = wasOpen ? '' : nodePath;
            record.pimBloomStarted = wasOpen ? 0 : performance.now();
            const remaining = advanceAfterDemoProfileInteraction(record);
            refreshDemoPimProfile(record, profile);
            setGuide(wasOpen
                ? `${cellLabel} remains open.`
                : `${cellLabel} opened into its information petals.${remaining ? ` Open ${remaining} more ${remaining === 1 ? 'cell' : 'cells'} to keep exploring this plant.` : ''}`);
        });
        bindPlantInformationMeshPress(profile);
        handles.forEach(handle => {
            let start = null;
            handle.addEventListener('pointerdown', event => {
                event.preventDefault();
                event.stopPropagation();
                start = { x: event.clientX, y: event.clientY, offset: record.demoPanelOffset || { x: 0, y: 0 } };
                handle.setPointerCapture?.(event.pointerId);
                profile.classList.add('is-dragging');
            });
            handle.addEventListener('pointermove', event => {
                if (!start) return;
                event.preventDefault();
                event.stopPropagation();
                record.demoPanelOffset = clampPlantPanelOffset(record.simulatedAnchor || { x: 50, y: 50 }, {
                    x: start.offset.x + event.clientX - start.x,
                    y: start.offset.y + event.clientY - start.y
                });
                applyPlantPanelOffset(profile, record.demoPanelOffset);
            });
            const finish = event => {
                if (start) event?.stopPropagation();
                start = null;
                profile.classList.remove('is-dragging');
            };
            handle.addEventListener('pointerup', finish);
            handle.addEventListener('pointercancel', finish);
            if(handle.matches('[data-desktop-pim-move-handle]'))handle.addEventListener('click', event => event.stopPropagation());
            handle.addEventListener('keydown', event => {
                const movement = {
                    ArrowLeft: { x: -12, y: 0 },
                    ArrowRight: { x: 12, y: 0 },
                    ArrowUp: { x: 0, y: -12 },
                    ArrowDown: { x: 0, y: 12 }
                }[event.key];
                if (!movement) return;
                event.preventDefault();
                event.stopPropagation();
                const offset = record.demoPanelOffset || { x: 0, y: 0 };
                record.demoPanelOffset = clampPlantPanelOffset(record.simulatedAnchor || { x: 50, y: 50 }, {
                    x: offset.x + movement.x,
                    y: offset.y + movement.y
                });
                applyPlantPanelOffset(profile, record.demoPanelOffset);
            });
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
    replaceDemoTexture(record);
    updateSimulatedMarkers();
}

function refreshDemoPimProfile(record, profile = null) {
    if (!record) return null;
    replaceDemoTexture(record);
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

export function demoViewerPointerFallbackAllowed({ simulated = false, hasScreenInput = false, spatialInputSeen = false, headsetBrowser = false, mode = 'immersive-ar' } = {}) {
    if (simulated || hasScreenInput) return true;
    return !spatialInputSeen && !headsetBrowser && mode !== 'immersive-vr';
}

function demoViewerPointerFallbackActive() {
    const sources = [...(session?.inputSources || [])];
    return demoViewerPointerFallbackAllowed({
        simulated: simulatedMode,
        hasScreenInput: sources.some(source => source.targetRayMode === 'screen'),
        spatialInputSeen: spatialPointerInputSeen,
        headsetBrowser: isQuestHeadsetBrowser(),
        mode: sessionMode
    });
}

function demoPointerWorldRay() {
    if (latestControllerRay) return latestControllerRay.direction;
    if (!demoViewerPointerFallbackActive()) return null;
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
    if (!demoViewerPointerFallbackActive()) return null;
    return viewerMatrix
        ? { x: viewerMatrix[12], y: viewerMatrix[13], z: viewerMatrix[14] }
        : null;
}

export function demoPlacementPosition(matrix, ray, origin = null, distanceMetres = AR_EXPERIENCE_CONFIG.placementDistanceMetres) {
    const base = origin || (matrix ? { x: matrix[12], y: matrix[13], z: matrix[14] } : null);
    if (!base) return null;
    if (!ray) return spatialPosition(null, matrix, 0);
    const distance = Math.max(.55,Math.min(4,Number(distanceMetres)||AR_EXPERIENCE_CONFIG.placementDistanceMetres));
    return {
        x: base.x + ray.x * distance,
        y: base.y + ray.y * distance,
        z: base.z + ray.z * distance
    };
}

function isDemoFloorHit(hitPoseMatrix, cameraMatrix) {
    const hitY = Number(hitPoseMatrix?.[13]);
    const hitNormalY = Math.abs(Number(hitPoseMatrix?.[5]));
    const cameraY = Number(cameraMatrix?.[13]);
    const hasCameraY = Number.isFinite(cameraY);
    return Number.isFinite(hitY)
        && Number.isFinite(hitNormalY)
        && hitNormalY >= .65
        && (!hasCameraY || cameraY - hitY >= .7);
}

export function demoGroundBaseY(hitPoseMatrix, cameraMatrix, previousGroundY = null) {
    const hitY = Number(hitPoseMatrix?.[13]);
    const cameraY = Number(cameraMatrix?.[13]);
    const hasCameraY = Number.isFinite(cameraY);
    const floorLikeHit = isDemoFloorHit(hitPoseMatrix, cameraMatrix);
    if (floorLikeHit) return hitY;
    if (previousGroundY !== null && previousGroundY !== undefined && Number.isFinite(Number(previousGroundY))) return Number(previousGroundY);
    if (hasCameraY) return cameraY - DEMO_STABLE_EYE_HEIGHT_METRES;
    return 0;
}

function placementPosition() {
    return demoPlacementPosition(viewerMatrix, demoPointerWorldRay(), demoPointerWorldOrigin(),placementDistance);
}

function totemPlacementPosition() {
    const position=placementPosition();
    if(!position)return null;
    const floorY=demoGroundBaseY(hitMatrix,viewerMatrix,groundYEstimate);
    const floorHit=isDemoFloorHit(hitMatrix,viewerMatrix);
    return {
        // Only use the hit pose's horizontal position when it is actually a
        // floor hit. A wall/table hit can still help aim placement, but must
        // never pull the Totem off the floor plane.
        x:floorHit ? Number(hitMatrix?.[12]) : position.x,
        y:floorY+DEMO_TOTEM_HALF_HEIGHT_METRES,
        z:floorHit ? Number(hitMatrix?.[14]) : position.z
    };
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

function demoRecordRayHit(record) {
    const ray=demoPointerWorldRay(),origin=demoPointerWorldOrigin();
    if(!origin || !ray || !record?.position)return null;
    if(record.demoType==='note'){
        const matrix=billboardMatrix(record.position,DEMO_NOTE_IMMERSIVE_SCALE.x,DEMO_NOTE_IMMERSIVE_SCALE.y);
        const right={x:matrix[0]/DEMO_NOTE_IMMERSIVE_SCALE.x,y:matrix[1]/DEMO_NOTE_IMMERSIVE_SCALE.x,z:matrix[2]/DEMO_NOTE_IMMERSIVE_SCALE.x};
        const up={x:matrix[4]/DEMO_NOTE_IMMERSIVE_SCALE.y,y:matrix[5]/DEMO_NOTE_IMMERSIVE_SCALE.y,z:matrix[6]/DEMO_NOTE_IMMERSIVE_SCALE.y};
        const normal={x:matrix[8],y:matrix[9],z:matrix[10]};
        return spatialDashboardRayHit({origin,direction:ray},{center:record.position,right,up,normal,width:.4*DEMO_NOTE_IMMERSIVE_SCALE.x,height:.16*DEMO_NOTE_IMMERSIVE_SCALE.y},{width:1024,height:384});
    }
    if(record.demoType==='zone'){
        const rotationY=demoTotemRotationY(record),right={x:Math.cos(rotationY),y:0,z:-Math.sin(rotationY)},front={x:-right.z,y:0,z:right.x};
        const ground=Number(record.groundBaseY ?? record.position.y-DEMO_TOTEM_HALF_HEIGHT_METRES),centerY=ground+DEMO_TOTEM_HALF_HEIGHT_METRES;
        const denominator=ray.x*front.x+ray.y*front.y+ray.z*front.z;
        if(Math.abs(denominator)<1e-6)return null;
        const distance=((record.position.x-origin.x)*front.x+(centerY-origin.y)*front.y+(record.position.z-origin.z)*front.z)/denominator;
        if(distance<=0)return null;
        const point={x:origin.x+ray.x*distance,y:origin.y+ray.y*distance,z:origin.z+ray.z*distance};
        const offset={x:point.x-record.position.x,y:point.y-centerY,z:point.z-record.position.z};
        const localX=offset.x*right.x+offset.z*right.z;
        if(Math.abs(localX)>.28 || point.y<ground-.04 || point.y>ground+DEMO_TOTEM_HALF_HEIGHT_METRES*2+.04)return null;
        return {distance,point,position:point,localX,localY:point.y-centerY,radius:.28};
    }
    const offset={x:record.position.x-origin.x,y:record.position.y-origin.y,z:record.position.z-origin.z};
    const along=offset.x*ray.x+offset.y*ray.y+offset.z*ray.z;
    if(along<=0)return null;
    const perpendicularSquared=Math.max(0,offset.x*offset.x+offset.y*offset.y+offset.z*offset.z-along*along);
    const material=DEMO_ORB_MATERIALS[record.demoOrbColor];
    const visibleRadius=(material?.radius || (record.demoType==='plant' ? .068 : .09))*(sessionMode==='immersive-vr'?DEMO_QUEST_ORB_SCALE:1);
    const interactionRadius=visibleRadius*1.08;
    if(perpendicularSquared>interactionRadius*interactionRadius)return null;
    const distance=along-Math.sqrt(Math.max(0,interactionRadius*interactionRadius-perpendicularSquared));
    return {distance,point:{x:origin.x+ray.x*distance,y:origin.y+ray.y*distance,z:origin.z+ray.z*distance},radius:interactionRadius};
}

function demoTotemRotationForPosition(position, viewer=viewerMatrix){
    if(!position || !viewer)return Math.PI/7;
    const towardViewerX=viewer[12]-position.x,towardViewerZ=viewer[14]-position.z;
    return Math.hypot(towardViewerX,towardViewerZ)>.001?Math.atan2(towardViewerX,towardViewerZ):Math.PI/7;
}

function demoTotemRotationY(record){
    return Number.isFinite(Number(record?.rotationY))
        ? Number(record.rotationY)
        : Math.PI/7;
}

function demoRecordAtPointer() {
    const adjustable = markers
        .map((record, index) => ({ record, index, hit:demoRecordRayHit(record) }))
        .filter(item => item.record.demoInteractive !== false && item.hit)
        .map(item=>({...item,distance:item.hit.distance}))
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
    // Match the phone preview: an open plant-information surface is locked.
    // A cell press must never start moving the orb behind that surface.
    if (target.record.demoType === 'plant' && target.record.demoExpanded) return false;
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

function beginHandDemoGrab() {
    if (placementReady || demoHeldIndex >= 0) return false;
    const target = demoRecordAtPointer();
    const origin = demoPointerWorldOrigin();
    if (!target || !origin || target.record.demoInteractive === false) return false;
    if (target.record.demoType === 'plant' && target.record.demoExpanded) return false;
    if (!captureDemoGrabPose(target.record, origin, demoPointerWorldRay())) return false;
    demoHeldIndex = target.index;
    setGuide(`Holding ${target.record.name || 'the orb'}. Move your hand, then release.`);
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
        ensureDemoPimPose(record);
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
    const type = demoStage;
    const position = type==='totem' ? totemPlacementPosition() : placementPosition();
    if (!position) {
        setGuide('Move your phone briefly, then tap the circle again.');
        return;
    }
    placementReady = false;
    if(type==='totem'){
        const pointer=appRoot?.querySelector('[data-tryit-place]');
        pointer?.setAttribute('hidden','');pointer?.classList.remove('is-revealing','is-ready','is-pressed');
        const anchor=simulatedMode ? capturedSimulatedAnchor() : null;
        createDemoTotemExample(position,anchor);
        return;
    }
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
            name: NOTE_TEMPLATES.observation.title,
            description: spatialNoteTemplate('observation').description,
            demoContent: NOTE_TEMPLATES.observation,
            demoNoteTemplateIndex: Math.max(0,DEMO_NOTE_TEMPLATE_KEYS.indexOf('observation')),
            appearance: { note_template:'observation', color: spatialNoteTemplate('observation').color, size: 'small', opacity: .64, surface: 'outline' }
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
    setGuide(demoStage === 'note' ? 'Placing Note…' : demoStage==='totem'?'Placing Totem…':'Placing Plant orb…');
    const placementDelay = demoStage === 'note' ? 120 : demoStage==='totem'?220:360;
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
    ambientBeeModel?.destroy();ambientBeeModel=null;
    if(ambientBeeSpriteTexture)gl?.deleteTexture(ambientBeeSpriteTexture);ambientBeeSpriteTexture=null;ambientBeeSpriteUploadedAt=-Infinity;
    simulatedMode = simulated;
    limDiagnostic('layout-recalculation',{reason:'interface-render',simulated,step:demoTutorialStep,...limDeviceContext(simulated && navigator.maxTouchPoints ? 'touch-capable' : simulated ? 'mouse' : 'xr-pointer')});
    const webglControlFallback = Boolean(!simulated && session && !domOverlayEnabled);
    const questImmersiveMode = Boolean(!simulated && session && sessionMode === 'immersive-vr');
    introSceneStartedAt = performance.now();
    introSceneActive = true;
    introBoardHasEntered = false;
    const biomapMarkup=INTRO_KNOWLEDGE_KEYWORDS.map((keyword,index)=>`<span class="biomap-branch" style="--knowledge-index:${index}"><button type="button" data-biomap-category="${keyword}" aria-expanded="false">${keyword}</button>${BIOMAP_CATEGORIES[keyword].length?`<span class="biomap-children" aria-label="${keyword} filters">${BIOMAP_CATEGORIES[keyword].map(child=>`<span>${child}</span>`).join('')}</span>`:''}</span>`).join('');
    appRoot.innerHTML = `<div class="tryit-demo ${simulated ? 'is-simulated' : 'is-immersive'}"><div class="tryit-stage"><canvas class="tryit-ambient-life" data-demo-ambient aria-hidden="true"></canvas><div class="tryit-spatial-intro" data-tryit-intro><div class="tryit-intro-knowledge" aria-label="BIOMAP interactive plant attributes">${biomapMarkup}</div></div><button class="tryit-place creator-ar-placement-guide" type="button" data-tryit-place aria-label="Place item" hidden>${placementPointerMarkup('')}</button>${spatialMoveControlMarkup('demo')}<button class="tryit-demo-action" type="button" data-tryit-action hidden></button><section class="tryit-guided-choice tryit-tutorial-board" data-tryit-guided-choice aria-live="polite" hidden></section><div class="tryit-final-actions" data-tryit-final-actions hidden><button type="button" data-tryit-reset>Try again</button><button type="button" data-tryit-finish>Finish demo</button></div><p class="tryit-guide" data-tryit-guide aria-live="polite">NourishlandXR demo.</p><div data-tryit-sim-markers></div><button type="button" class="tryit-ar-safety-control" data-tryit-safety-help aria-label="Show AR safety">Safety</button><div class="tryit-demo-footer"><p class="tryit-drag-hint">Hold and drag any element to reposition it.</p><nav class="tryit-demo-taskbar" aria-label="Demo controls"><button type="button" class="tryit-intro-continue" data-tryit-intro-continue hidden>Continue</button><button type="button" data-tryit-open-live-tag hidden>Open Plant Live Tag</button><button type="button" data-tryit-skip>Skip</button><button type="button" data-tryit-exit>Close</button></nav></div></div><button type="button" class="tryit-context-trigger" data-tryit-context-trigger hidden></button><section class="tryit-virtual-tag-mode" data-demo-virtual-tag aria-live="polite" hidden></section></div>`;
    desktopSpatialPreviewCleanup=mountDesktopSpatialPreview(appRoot,{simulated,quest:isQuestHeadsetBrowser()});
    appRoot.querySelector('[data-tryit-safety-help]')?.remove();
    ambientCanvas=simulated?appRoot.querySelector('[data-demo-ambient]'):null;
    if(simulated || session){
        const modelCanvas=document.createElement('canvas');modelCanvas.className='tryit-ambient-model';modelCanvas.setAttribute('aria-hidden','true');modelCanvas.dataset.demoBeeModel='';
        appRoot.querySelector('.tryit-stage')?.prepend(modelCanvas);
        const credit=document.createElement('a');credit.className='tryit-bee-credit';credit.href='https://sketchfab.com/3d-models/bee-c80f9c2110c847db9375c548f14a0315';credit.target='_blank';credit.rel='noopener noreferrer';credit.textContent='Bee model · etro313 · CC BY 4.0';
        appRoot.querySelector('.tryit-stage')?.append(credit);
        import('../services/demoBeeModel.js').then(({mountDemoBeeModel})=>{if(modelCanvas.isConnected)ambientBeeModel=mountDemoBeeModel(modelCanvas,{sprite:!simulated});}).catch(error=>console.warn('Bee model fallback:',error));
    }
    const hasPhoneScreenInput=Array.from(session?.inputSources || []).some(input=>input.targetRayMode==='screen');
    const phoneArPanel=Boolean(!simulated && sessionMode==='immersive-ar' && (hasPhoneScreenInput || (navigator.maxTouchPoints>0 && window.matchMedia('(pointer: coarse)').matches)));
    infoPanel?.destroy(); demoPanelActionSignature='';elementPanelActionSignature=''; infoPanel = createPimInfoPanel({root:appRoot,headset:!simulated,phoneAR:phoneArPanel,rainIntensity:demoRainIntensity,handMode:demoHandMode,onHandMode:value=>{demoHandMode=value;},onRainIntensity:value=>{demoRainIntensity=value;const demo=appRoot?.querySelector('.tryit-demo');if(demo)demo.dataset.rainIntensity=value<=0?'off':value<1?'light':value>1?'heavy':'normal';},onMove:refreshSimulatedPlacementAim,onEdit:(record,path)=>openDemoKnowledge(record,path,true),onPathwayAction:handlePathwayAction,onModuleAction:handleLearningModuleAction,onUtilityAction:handleDemoPanelAction});
    infoPanel.element?.classList.toggle('is-demo-panel',simulated);
    if(simulated)infoPanel.setCompact(true);
    infoPanel.setLearningModules(null);
    if(!simulated && gl) {infoPanel.attach(gl);infoPanel.bindSession(session,referenceSpace);}
    appRoot.querySelector('.tryit-demo')?.classList.toggle('uses-webgl-controls', webglControlFallback);
    appRoot.querySelector('.tryit-demo')?.classList.toggle('is-quest-vr', questImmersiveMode);
    const introContinue = appRoot.querySelector('[data-tryit-intro-continue]');
    setDemoTutorialStep(DEMO_TUTORIAL_STEPS.WELCOME);
    setDemoJourneyStage('why');
    appRoot.querySelector('[data-tryit-intro]')?.removeAttribute('hidden');
    appRoot.querySelector('.tryit-drag-hint')?.remove();
    const exitButton = appRoot.querySelector('[data-tryit-exit]');
    exitButton.textContent = 'Close';
    exitButton.setAttribute('aria-label', 'Close demo');
    const skipButton = appRoot.querySelector('[data-tryit-skip]');
    skipButton.setAttribute('aria-label', 'Skip the current narration');
    const liveTagButton = appRoot.querySelector('[data-tryit-open-live-tag]');
    liveTagButton.setAttribute('aria-label', 'Open Plant Live Tag');
    const contextTrigger=appRoot.querySelector('[data-tryit-context-trigger]');
    // Keep the immediate trigger outside the transformed AR stage and its
    // stacking context. It remains independent of the movable workstation.
    appRoot.append(contextTrigger);
    contextTrigger.addEventListener('pointerdown',event=>{
        if(contextTrigger.dataset.contextMode!=='hold' || !contextCellKey)return;
        event.preventDefault();event.stopPropagation();limPointerKey=contextCellKey;limPointerId=event.pointerId;contextTrigger.setPointerCapture?.(event.pointerId);limActivation?.start(contextCellKey,performance.now(),'context-trigger');startLimActivationFrame();
    });
    contextTrigger.addEventListener('pointerup',event=>{
        if(contextTrigger.dataset.contextMode!=='hold')return;
        event.preventDefault();event.stopPropagation();limActivation?.end(contextCellKey,performance.now());limPointerKey='';limPointerId=null;paintWelcomeLayer(performance.now());
    });
    contextTrigger.addEventListener('pointercancel',()=>{limActivation?.cancel('context-cancelled');limPointerKey='';limPointerId=null;paintWelcomeLayer(performance.now());});
    contextTrigger.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(contextTrigger.dataset.contextMode!=='hold')handleDemoPanelAction(contextTrigger.dataset.contextMode);});
    bindDemoPanelActions();
    infoPanel?.suspend(true);
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
        refreshSimulatedPlacementAim();
    };
    window.addEventListener('resize', reflowDemoViewport, { passive: true });
    window.visualViewport?.addEventListener('resize', reflowDemoViewport, { passive: true });
    const panelResizeObserver = simulated && typeof ResizeObserver === 'function'
        ? new ResizeObserver(refreshSimulatedPlacementAim) : null;
    if (panelResizeObserver) panelResizeObserver.observe(infoPanel.element);
    demoViewportCleanup = () => {
        window.removeEventListener('resize', reflowDemoViewport);
        window.visualViewport?.removeEventListener('resize', reflowDemoViewport);
        panelResizeObserver?.disconnect();
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
    gl.shaderSource(fragment, 'precision mediump float;varying vec2 v;uniform sampler2D t;uniform float opacity;void main(){vec4 sampleColor=texture2D(t,v);if(sampleColor.a<.02)discard;gl_FragColor=vec4(sampleColor.rgb,sampleColor.a*opacity);}');
    gl.compileShader(fragment);
    program = gl.createProgram();
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.20,-.08,0,0,1, .20,-.08,0,1,1, .20,.08,0,1,0, -.20,-.08,0,0,1, .20,.08,0,1,0, -.20,.08,0,0,0]), gl.STATIC_DRAW);
    sphereRenderer = createSpatialSphereRenderer(gl);
    // Totem cards share the Totem's placement heading. They must not turn with
    // the viewer after the buttons have been aimed during placement.
    totemCardsRenderer = createSpatialTotemCards(gl,{faceTotemToViewer:false});
    tetherRenderer = createSpatialTetherRenderer(gl);
    prismRenderer = createSpatialPrismRenderer(gl);
    triangleRenderer = createSpatialTriangleRenderer(gl);
}

function demoControllerInputSource() {
    const sources = [...(session?.inputSources || [])];
    const trackedControllers = sources.filter(source => source.targetRayMode === 'tracked-pointer' && !source.hand);
    return trackedControllers.find(source => source.handedness === 'right' && source.gamepad)
        || trackedControllers.find(source => source.handedness === 'right')
        || trackedControllers.find(source => source.gamepad)
        || trackedControllers[0]
        || sources.find(source => source.targetRayMode === 'screen' && source.targetRaySpace)
        || null;
}

function updateDemoControllerRay(frame) {
    latestControllerRay = null;
    latestHandState = null;
    latestTrackedHandStates = [];
    const sources = [...(session?.inputSources || [])];
    if (sources.some(source => source.hand || source.targetRayMode === 'tracked-pointer')) spatialPointerInputSeen = true;
    if (!referenceSpace) return;
    latestTrackedHandStates = sources.filter(source => source.hand)
        .map(source => ({ source, state: handTrackingState(frame, source, referenceSpace) }))
        .filter(entry => entry.state?.joints?.size);
    const activeHand = latestTrackedHandStates.find(entry => entry.source.handedness === 'right' && entry.state.pointer)
        || latestTrackedHandStates.find(entry => entry.state.pointer)
        || latestTrackedHandStates.find(entry => entry.source.handedness === 'right')
        || latestTrackedHandStates[0]
        || null;
    if (activeHand) {
        latestHandState = activeHand.state;
        latestControllerRay = activeHand.state.pointer || null;
        return;
    }
    const source = demoControllerInputSource();
    if (!source) return;
    const controllerSpace = source.targetRaySpace || source.gripSpace;
    const pose = controllerSpace ? frame.getPose(controllerSpace, referenceSpace) : null;
    latestControllerRay = controllerRayFromPose(pose, source.handedness || 'right');
}

function demoControllerRayForInputEvent(event) {
    const source = event?.inputSource;
    if (!source || source.hand || !referenceSpace) return null;
    const sourceSpace = source.targetRaySpace || source.gripSpace;
    const pose = sourceSpace ? event.frame?.getPose?.(sourceSpace, referenceSpace) : null;
    return controllerRayFromPose(pose, source.handedness || 'right');
}

function captureDemoInputEventRay(event) {
    const eventRay = demoControllerRayForInputEvent(event);
    if (eventRay) latestControllerRay = eventRay;
    return eventRay;
}

function pollDemoControllerDepth(time = performance.now()) {
    const source = demoControllerInputSource();
    const elapsed = demoControllerDepthAt ? time - demoControllerDepthAt : 16;
    demoControllerDepthAt = time;
    if ((demoHeldIndex < 0 && !placementReady) || source?.hand || !source?.gamepad) return;
    const axes = [Number(source.gamepad.axes?.[3]) || 0, Number(source.gamepad.axes?.[1]) || 0];
    const vertical = axes.sort((a,b)=>Math.abs(b)-Math.abs(a))[0];
    const delta = spatialDepthDelta(vertical, elapsed);
    if(placementReady){
        if(delta)placementDistance=Math.max(.55,Math.min(4,placementDistance+delta));
        return;
    }
    const record = markers[demoHeldIndex];
    if (!delta || !record) return;
    record.demoGrabDepth = Math.max(.4, Math.min(4, (Number(record.demoGrabDepth) || Number(record.demoDistance) || 1) + delta));
    record.demoDistance = record.demoGrabDepth;
}

function pollDemoHandPinch() {
    if (!latestHandState?.pointer) {
        if (handPinchActive && demoHeldIndex >= 0) releaseHeldDemoRecord();
        handPinchActive = false;
        return;
    }
    const pinching = Boolean(latestHandState.pinch);
    if (pinching && !handPinchActive) {
        let handled=Boolean(infoPanel?.activate(latestControllerRay));
        if(!handled && placementReady){pressPlacementPointer();handled=true;}
        if(!handled)handled=Boolean(selectDemoProfileCell());
        if(!handled)handled=Boolean(selectDemoNoteTemplateAtPointer());
        if(!handled)handled=Boolean(activateDemoTotemCard(totemCardsRenderer?.hit(latestControllerRay)));
        if(!handled)handled=Boolean(beginHandDemoGrab());
        if (handled) { handPinchActive = true; return; }
    }
    if (!pinching && handPinchActive && demoHeldIndex >= 0) releaseHeldDemoRecord();
    handPinchActive = pinching;
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
    for (let fontSize = 60; fontSize >= 26; fontSize -= 2) {
        const lineHeight = Math.round(fontSize * 1.22);
        const paragraphGap = Math.round(fontSize * .5);
        ctx.font = `520 ${fontSize}px system-ui, sans-serif`;
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
            bloomPath:record.pimBloomPath || '',
            pressPath:record.pimPressPath, pressProgress:record.pimPressProgress,
            selectedNodeId: record.demoSelectedNodeId,
            hoverPath:demoPimHover.record===record?demoPimHover.path:'',
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
    if(arWelcomeShowcaseActive){arWelcomeRenderedFrames=drawArWelcomeShowcase(ctx,arWelcomeClock.elapsed,window.matchMedia('(prefers-reduced-motion: reduce)').matches,arWelcomeClusters,{opening:arWelcomeOpeningActive,minimalIntro:arWelcomeIntroPending,openingSeed:arWelcomeOpeningSeed,openingDuration:arWelcomeOpeningDuration,minimalStartAt:DEMO_ARCHETYPE_START_MS,minimalInterval:DEMO_ARCHETYPE_INTERVAL_MS,minimalRevealDuration:DEMO_ARCHETYPE_REVEAL_MS,hidden:limHiddenCells,drawCells:limMeshVisible,drawPanel:introBoardVisible,rootMilestone:arWelcomeRootMilestone,rootMilestoneStartedAt:arWelcomeRootMilestoneStartedAt,drawContent:drawIntroNoteContent,progression:{cellsActivatedAt:limMeshActivatedAt,expandedLimIds:[...limExpandedCells],expandedAt:Object.fromEntries(limExpandedAt)},selectedKey:selectedLimCell,hoverKey:contextCellKey,pathwayKey:limPathwayState.status==='active'?currentPathwayNode()?.key || '':''});return canvasTexture(label,texture);}
    drawArWelcomePanel(ctx);
    drawIntroNoteContent(ctx);
    return canvasTexture(label, texture);
}

function drawIntroNoteContent(ctx) {
    // The note is a 900x500 surface at (250,300). Keep every piece of copy
    // inside that surface; the previous 1,100px text box extended beyond both
    // edges after the welcome panel was compacted.
    const contentLeft = 300;
    const contentWidth = 800;
    const contentCenter = contentLeft + contentWidth / 2;
    const titleWidth = 900;
    ctx.save();
    const gentleIntroFade=(arWelcomeIntroPending && !arWelcomeSettleStage) || (arWelcomeShowcaseActive && demoOrientationStep>=0 && demoOrientationStep<=1 && !selectedLimCell);
    if(gentleIntroFade){
        const elapsed=arWelcomeClock?.elapsed || 0;
        ctx.globalAlpha*=.72+.28*(.5+.5*Math.sin(elapsed/2400));
    }
    ctx.shadowColor = 'rgba(0,20,18,.38)';
    ctx.shadowBlur = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if(arWelcomeSettleStage)ctx.globalAlpha*=Math.max(0,Math.min(1,(arWelcomeClock.elapsed-arWelcomeSettleStartedAt)/850));
    if(!arWelcomeIntroPending){
        ctx.fillStyle = 'rgba(232,246,225,.7)';
        ctx.font = '600 29px "Manrope", "Segoe UI Variable", Inter, system-ui, sans-serif';
        ctx.fillText(demoIntroLabel(), contentCenter, 345, contentWidth);
    }
    const openingElapsed=arWelcomeIntroPending && !arWelcomeSettleStage ? (arWelcomeClock?.elapsed || 0) : null;
    if(openingElapsed!==null){
        if(openingElapsed<DEMO_WELCOME_OPENING_MS){
            const fade=openingElapsed<DEMO_WELCOME_DESCRIPTION_HOLD_MS?1:Math.max(0,1-(openingElapsed-DEMO_WELCOME_DESCRIPTION_HOLD_MS)/(DEMO_WELCOME_OPENING_MS-DEMO_WELCOME_DESCRIPTION_HOLD_MS));
            ctx.globalAlpha*=fade;ctx.fillStyle='#f3f0df';ctx.font='400 84px "Marcellus", Georgia, "Times New Roman", serif';ctx.fillText(demoLocalizedText('Welcome to NourishlandXR'),contentCenter,420,titleWidth);
            if(openingElapsed>=DEMO_WELCOME_TITLE_HOLD_MS){ctx.fillStyle='rgba(245,242,225,.9)';ctx.font='500 42px "Manrope", "Segoe UI Variable", Inter, system-ui, sans-serif';drawWrappedTextureText(ctx,demoLocalizedText('Explore how plants, places and knowledge connect.'),contentCenter,570,760,54,3);}
        }
        ctx.restore();return;
    }
    ctx.fillStyle = '#f3f0df';
    // Keep headings on one line so a wrapped second line cannot collide with
    // the divider/body copy on the compact spatial note (notably Pigeon Pea).
    let titleSize = arWelcomeIntroPending ? 78 : 80;
    const titleFont = '"Marcellus", Georgia, "Times New Roman", serif';
    ctx.font = `400 ${titleSize}px ${titleFont}`;
    while (titleSize > 48 && ctx.measureText(introBoardTitle).width > titleWidth) {
        titleSize -= 2;
        ctx.font = `400 ${titleSize}px ${titleFont}`;
    }
    ctx.fillText(introBoardTitle, contentCenter, 420, titleWidth);
    if (introBoardVisibleBody) {
    ctx.strokeStyle = 'rgba(241,249,237,.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(contentLeft, 478);
    ctx.lineTo(contentLeft + contentWidth, 478);
    ctx.stroke();
    const isOpeningStatement = false;
    const narrative = null;
    ctx.textAlign = 'left';
    if(narrative){
        ctx.save();ctx.globalAlpha*=.18*narrative.alpha;
        const glow=ctx.createRadialGradient(contentCenter,610,10,contentCenter,610,360);
        glow.addColorStop(0,narrative.accent);glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(contentLeft,480,contentWidth,290);ctx.restore();
    }
    ctx.save();
    if(narrative)ctx.globalAlpha*=narrative.alpha;
    // Accent colours illuminate the surface, while the copy stays bright and
    // neutral so blue and orange narrative stages remain equally readable.
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,20,17,.52)';
    ctx.shadowBlur = 4;
    const typedBody = narrative?.text || (introBoardVisibleBody
        ? `${introBoardVisibleBody}${introBoardVisibleBody.length < introBoardBody.length ? '▌' : ''}`
        : '▌');
    const visibleParagraphs = typedBody.split(/\n\n/);
    // Keep the first body line clear of the divider and the clipping edge;
    // its ascenders were previously being cut because the baseline sat too
    // close to the clip rectangle.
    const bodyTop = 498;
    const bodyBottom = introBoardNextGuide ? 710 : 775;
    const bodyLayout = fitIntroBodyLayout(ctx, narrative?.text || introBoardBody, contentWidth, bodyBottom - bodyTop);
    ctx.font = `${isOpeningStatement ? 400 : 520} ${bodyLayout.fontSize}px "Manrope", "Segoe UI Variable", Inter, system-ui, sans-serif`;
    const bodyX = isOpeningStatement ? contentCenter : contentLeft;
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
            ctx.fillText(line, bodyX, lineY);
        }
        paragraphY += completeLines.length * bodyLayout.lineHeight + bodyLayout.paragraphGap;
    }
    if (clipped) ctx.fillText('…', bodyX, bodyBottom);
    ctx.restore();
    ctx.restore();
    }
    if(introBoardNextGuideVisible && introBoardNextGuide){
        ctx.strokeStyle='rgba(241,249,237,.23)';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(contentLeft,724);ctx.lineTo(contentLeft+contentWidth,724);ctx.stroke();
        ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#e7f5bb';
        ctx.font='500 30px "Segoe UI Variable", Inter, system-ui, sans-serif';
        const guideLines=wrappedTextureLines(ctx,`Next · ${introBoardNextGuide}`,contentWidth);
        guideLines.slice(0,2).forEach((line,index)=>ctx.fillText(line,contentLeft,736+index*29));
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.restore();
}

function createIntroControlTexture(labelText, texture = null) {
    const label = document.createElement('canvas');
    label.width = 900;
    label.height = 360;
    const ctx = label.getContext('2d');
    const panel = ctx.createLinearGradient(50, 24, 850, 336);
    panel.addColorStop(0, 'rgba(100,137,101,.98)');
    panel.addColorStop(1, 'rgba(54,91,69,.98)');
    ctx.fillStyle = panel;
    ctx.strokeStyle = 'rgba(218,235,207,.68)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(12, 12, 876, 336, 64);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,.38)';
    ctx.shadowBlur = 4;
    let controlFontSize=76;ctx.font=`780 ${controlFontSize}px system-ui, sans-serif`;
    while(controlFontSize>54 && ctx.measureText(String(labelText || 'Continue')).width>800){controlFontSize-=2;ctx.font=`780 ${controlFontSize}px system-ui, sans-serif`;}
    ctx.fillText(String(labelText || 'Continue'), 450, 180,820);
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

function createNotePlacementTexture(texture = null) {
    const label=document.createElement('canvas');label.width=480;label.height=320;const ctx=label.getContext('2d');
    const face=ctx.createLinearGradient(50,35,430,285);face.addColorStop(0,'rgba(117,151,139,.3)');face.addColorStop(1,'rgba(48,86,73,.18)');
    ctx.fillStyle=face;ctx.strokeStyle='rgba(235,250,224,.92)';ctx.lineWidth=7;ctx.setLineDash([18,12]);ctx.beginPath();ctx.roundRect(42,42,396,236,34);ctx.fill();ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(235,250,224,.9)';ctx.font='750 28px system-ui';ctx.textAlign='center';ctx.fillText('NOTE',240,176);
    return canvasTexture(label,texture);
}

function createTotemPlacementTexture(texture = null) {
    const label=document.createElement('canvas');label.width=360;label.height=900;const ctx=label.getContext('2d');
    const glow=ctx.createLinearGradient(0,80,0,860);glow.addColorStop(0,'rgba(217,244,200,.16)');glow.addColorStop(.75,'rgba(91,165,120,.28)');glow.addColorStop(1,'rgba(223,255,196,.08)');
    ctx.fillStyle=glow;ctx.strokeStyle='rgba(224,255,207,.9)';ctx.lineWidth=7;ctx.setLineDash([20,14]);ctx.beginPath();ctx.roundRect(104,74,152,690,38);ctx.fill();ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(211,247,181,.3)';ctx.beginPath();ctx.ellipse(180,782,142,46,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(224,255,207,.78)';ctx.lineWidth=5;ctx.stroke();
    ctx.fillStyle='#f2ffe8';ctx.font='800 35px system-ui';ctx.textAlign='center';ctx.fillText('TOTEM',180,825);ctx.font='600 22px system-ui';ctx.fillText('will stand here',180,866);
    return canvasTexture(label,texture);
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
        arWelcomeClock.tick(Date.now(),session?.visibilityState==='visible');
        const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const rootRefreshState={milestone:arWelcomeRootMilestone,elapsed:arWelcomeClock.elapsed,milestoneStartedAt:arWelcomeRootMilestoneStartedAt,reducedMotion};
        const rootsNeedRefresh=welcomeRootsNeedRefresh(rootRefreshState) && arWelcomeClock.elapsed-arWelcomeRootsLastRefreshAt>=WELCOME_ROOT_REFRESH_MS;
        if(limRevealIsAnimating() || rootsNeedRefresh || (!reducedMotion && arWelcomeClock.elapsed<AR_WELCOME_SETTLED_MS)){
            introBoardTextureDirty=true;
            if(rootsNeedRefresh)arWelcomeRootsLastRefreshAt=arWelcomeClock.elapsed;
        }
    }
    const textIsTyping=Boolean(introBoardBody && introBoardVisibleBody.length<introBoardBody.length);
    const textureInterval=limActivation?.active || textIsTyping ? DEMO_TEXT_TEXTURE_INTERVAL_MS : DEMO_LIM_TEXTURE_INTERVAL_MS;
    if ((introBoardVisible || arWelcomeShowcaseActive) && (!introNoteTexture || (introBoardTextureDirty && now - introTextureUploadedAt >= textureInterval && introTextureFrameToken !== introFrameToken))) {
        introNoteTexture = createIntroNoteTexture(introNoteTexture);
        introBoardTextureDirty = false;
        introTextureUploadedAt = now;
        introTextureFrameToken = introFrameToken;
        arWelcomeRootsLastRefreshAt=arWelcomeClock.elapsed;
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
    const controlLabel = session && !domOverlayEnabled && continueButton && sessionMode !== 'immersive-vr' && !continueButton.hidden
        ? (continueButton.textContent || 'Continue').trim()
        : '';
    if (controlLabel) {
        if (!introControlTexture || introControlTextureLabel !== controlLabel) {
            introControlTexture = createIntroControlTexture(controlLabel, introControlTexture);
            introControlTextureLabel = controlLabel;
        }
        drawTexture(
            introControlTexture,
            introLocalPosition(introWorldAnchor, INTRO_CONTROL_POSITION),
            INTRO_CONTROL_SCALE[0],
            INTRO_CONTROL_SCALE[1],
            1
        );
    } else if (introControlTexture) {
        gl.deleteTexture(introControlTexture);
        introControlTexture = null;
        introControlTextureLabel = '';
    }
    if (placementReady) {
        const pointerKind=demoStage==='totem'?'totem':demoStage==='note'?'note':'aim';
        if(introPointerTextureKind!==pointerKind){if(introPointerTexture)gl.deleteTexture(introPointerTexture);introPointerTexture=pointerKind==='totem'?createTotemPlacementTexture():pointerKind==='note'?createNotePlacementTexture():createIntroPointerTexture();introPointerTextureKind=pointerKind;}
        const pointerPosition = demoStage==='totem'?totemPlacementPosition():placementPosition();
        if (pointerPosition) drawTexture(introPointerTexture, pointerPosition, demoStage==='totem'?.72:demoStage==='note'?.72:.32, demoStage==='totem'?3.2:demoStage==='note'?1.4:.8, 1);
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
    const content = demoContentFor(record) || NOTE_TEMPLATES.observation;
    const label = document.createElement('canvas');
    label.width = 1024;
    label.height = 384;
    const ctx = label.getContext('2d');
    const noteColor = record?.appearance?.color || '#506d68';
    ctx.clearRect(0, 0, label.width, label.height);
    const gradient=ctx.createLinearGradient(12,12,1012,372);
    gradient.addColorStop(0,`${noteColor}c2`);gradient.addColorStop(1,'rgba(7,28,17,.38)');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = Math.min(.78,Number(record?.appearance?.opacity ?? .64));
    ctx.beginPath();
    ctx.roundRect(12, 12, 1000, 360, 58);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(239,255,235,.68)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    ctx.font = '800 50px system-ui, sans-serif';
    drawWrappedTextureText(ctx, content.title || record.name || 'Note', 62, 56, 900, 58, 2);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '650 27px system-ui, sans-serif';
    const lines=[...(content.lines || [])];
    if(record?.appearance?.note_template==='pollinators' && lines.length){const offset=Number(record.noteScrollIndex)||0;lines.push(...lines.splice(0,offset%lines.length));}
    lines.slice(0, 3).forEach((line, index) => {
        drawWrappedTextureText(ctx, line, 62, 184 + index * 54, 900, 34, 1);
    });
    return canvasTexture(label);
}

function createMarkerTexture(record) {
    if (!gl) return null;
    if (record.demoExpanded) {
        return createSpatialKnowledgeTexture(record);
    }
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

function drawDemoAmbientLines(view,vertices,color){
    if(!vertices.length || !tetherRenderer)return;
    gl.useProgram(tetherRenderer.program);
    gl.bindBuffer(gl.ARRAY_BUFFER,tetherRenderer.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(tetherRenderer.positionLocation);
    gl.vertexAttribPointer(tetherRenderer.positionLocation,3,gl.FLOAT,false,12,0);
    gl.uniformMatrix4fv(tetherRenderer.projectionLocation,false,view.projectionMatrix);
    gl.uniformMatrix4fv(tetherRenderer.viewLocation,false,view.transform.inverse.matrix);
    gl.uniform4fv(tetherRenderer.colorLocation,color);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);gl.drawArrays(gl.LINES,0,vertices.length/3);gl.depthMask(true);
}

function drawSpatialAmbientLife(view){
    if(!sphereRenderer || !viewerMatrix || !Number.isFinite(ambientBeesStartedAt))return;
    if(!ambientWorldAnchor){
        introWorldAnchor ||= introWorldAnchorFromViewer(viewerMatrix);
        ambientWorldAnchor=introWorldAnchor
            ? introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition)
            : {x:viewerMatrix[12]-viewerMatrix[8]*2.4,y:viewerMatrix[13],z:viewerMatrix[14]-viewerMatrix[10]*2.4};
    }
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const sprite=ambientBeeModel?.renderSprite?.(arWelcomeClock.elapsed,ambientBeesStartedAt);
    if(sprite && program && buffer){
        if(!ambientBeeSpriteTexture){ambientBeeSpriteTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,ambientBeeSpriteTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
        if(arWelcomeClock.elapsed-ambientBeeSpriteUploadedAt>=70){gl.bindTexture(gl.TEXTURE_2D,ambientBeeSpriteTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sprite);ambientBeeSpriteUploadedAt=arWelcomeClock.elapsed;}
        gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        const vertex=gl.getAttribLocation(program,'p'),uv=gl.getAttribLocation(program,'uv');
        gl.enableVertexAttribArray(vertex);gl.vertexAttribPointer(vertex,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
        gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.disable(gl.CULL_FACE);
        for(let index=0;index<2;index++){
            const bee=demoBeePose(arWelcomeClock.elapsed,ambientBeesStartedAt,index);if(!bee)continue;
            const position=ambientBeeWorldPosition(bee);
            const model=billboardMatrix(position,.28,.28,viewerMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(program,'mvp'),false,multiply(view.projectionMatrix,multiply(view.transform.inverse.matrix,model)));
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,ambientBeeSpriteTexture);gl.uniform1i(gl.getUniformLocation(program,'t'),0);gl.uniform1f(gl.getUniformLocation(program,'opacity'),bee.opacity);
            gl.drawArrays(gl.TRIANGLES,0,6);
        }
        gl.depthMask(true);
        return;
    }
    const wings=[];
    for(let index=0;index<2;index++){
        const bee=demoBeePose(arWelcomeClock.elapsed,ambientBeesStartedAt,index);
        if(!bee)continue;
        // The ambient anchor is established from the current viewer pose above.
        // Referencing the old `base` name here threw on every immersive frame as
        // soon as the Meet a Plant Orb step enabled the bees. Because the frame
        // had already been cleared, that made the whole AR scene disappear.
        const position=ambientBeeWorldPosition(bee);
        drawSpatialSphere(gl,sphereRenderer,view.projectionMatrix,view.transform.inverse.matrix,position,.018,{scale:{x:1.35,y:.7,z:.75},color:[.86,.66,.27],alpha:bee.opacity,emissive:.16});
        const flap=.025+Math.abs(bee.wing)*.013;
        wings.push(position.x-.008,position.y,position.z,position.x-.025,position.y+flap,position.z,
            position.x+.008,position.y,position.z,position.x+.025,position.y+flap,position.z);
    }
    drawDemoAmbientLines(view,wings,[.9,.97,.93,.53]);
}

function ambientBeeWorldPosition(bee){
    const rightLength=Math.hypot(viewerMatrix[0],viewerMatrix[2])||1;
    const forwardLength=Math.hypot(viewerMatrix[8],viewerMatrix[10])||1;
    const rightX=viewerMatrix[0]/rightLength,rightZ=viewerMatrix[2]/rightLength;
    const forwardX=-viewerMatrix[8]/forwardLength,forwardZ=-viewerMatrix[10]/forwardLength;
    const across=(bee.x-.5)*AR_PHONE_COMFORT.boardScale[0];
    const vertical=(bee.y-.5)*AR_PHONE_COMFORT.boardScale[1];
    const behindScreen=.18+((bee.depth+1)*.5)*.42;
    return {
        x:ambientWorldAnchor.x+rightX*across+forwardX*behindScreen,
        y:ambientWorldAnchor.y+vertical,
        z:ambientWorldAnchor.z+rightZ*across+forwardZ*behindScreen
    };
}

function drawSpatialRain(view, time) {
    if (!tetherRenderer || !viewerMatrix || !view?.projectionMatrix || !view?.transform?.inverse?.matrix
        || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const rainProgress=demoRainProgress(arWelcomeClock.elapsed)*demoRainIntensity;
    if(rainProgress<=0)return;
    // A world-up field surrounds the viewer in every direction, rather than
    // occupying a small forward-facing patch that disappears at the FOV edge.
    const dropCount=rainProgress<=0?0:Math.round(8+220*rainProgress);
    const vertices = new Float32Array(dropCount * 6);
    for (let index = 0; index < dropCount; index += 1) {
        const angle=index*2.399963229728653;
        const radius=.85+(((index*67)%229)/229)*7.15;
        const x=viewerMatrix[12]+Math.cos(angle)*radius;
        const z=viewerMatrix[14]+Math.sin(angle)*radius;
        const fall = ((time * .00065 + index * .173) % 1) * 2.5;
        const y = viewerMatrix[13] + .95 - fall;
        vertices.set([x, y, z, x + .012, y - .09, z], index * 6);
    }
    gl.useProgram(tetherRenderer.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, tetherRenderer.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(tetherRenderer.positionLocation);
    gl.vertexAttribPointer(tetherRenderer.positionLocation, 3, gl.FLOAT, false, 12, 0);
    gl.uniformMatrix4fv(tetherRenderer.projectionLocation, false, view.projectionMatrix);
    gl.uniformMatrix4fv(tetherRenderer.viewLocation, false, view.transform.inverse.matrix);
    gl.uniform4fv(tetherRenderer.colorLocation, [.81, .92, .90, .12+.17*rainProgress]);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.drawArrays(gl.LINES, 0, vertices.length / 3);
    gl.depthMask(true);
}

function drawMarker(view) {
    if (!program || !buffer || !sphereRenderer || !tetherRenderer || !prismRenderer || !triangleRenderer) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const hoveredPlant=latestControllerRay ? demoRecordAtPointer()?.record : null;
    markers.forEach(record => {
        const orbType = record.demoType === 'plant' ? 'plant' : record.demoType === 'marker' ? 'marker' : '';
        if (!orbType) return;
        const material = DEMO_ORB_MATERIALS[record.demoOrbColor];
        if (record.demoOrbShape === 'triangle') {
            const questScale=sessionMode==='immersive-vr'?DEMO_QUEST_ORB_SCALE:1;
            drawSpatialTriangle(gl, triangleRenderer, view, record.position, {
                halfWidth: .075*questScale,
                halfHeight: .075*questScale,
                halfDepth: .046*questScale,
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
            (material?.radius || (orbType === 'plant' ? .068 : .05)) * (sessionMode==='immersive-vr'?DEMO_QUEST_ORB_SCALE:1) * (record.demoAmbientNeighbour && record.demoInteractive===false ? .78 : 1),
            { type: orbType, color: material?.shell, ringColor: material?.ring, knowledge:orbType==='plant' ? demoOrbKnowledge(record) : null, highlighted:orbType==='plant' && hoveredPlant===record, time:performance.now()/1000 }
        );
    });
    markers.forEach(record => {
        if (record.demoType !== 'zone') return;
        const totemColour=demoHexColour(record.demoTotemColor || record.demoContent?.accent);
        const totemHighlight=totemColour.map(channel=>Math.min(.96,channel*.48+.48));
        const arrival=Math.max(0,Math.min(1,(performance.now()-(record.demoArriveAt || 0))/900));
        const groundBaseY = Number.isFinite(Number(record.groundBaseY))
            ? Number(record.groundBaseY)
            : Number(record.position?.y || 0) - DEMO_TOTEM_HALF_HEIGHT_METRES;
        const bodyHalfWidth=.20,bodyHalfDepth=.14,bodyHalfHeight=DEMO_TOTEM_HALF_HEIGHT_METRES,rotationY=demoTotemRotationY(record);
        drawSpatialPrism(gl, prismRenderer, view, { ...record.position, y:groundBaseY }, {
            halfWidth: bodyHalfWidth,
            halfHeight: bodyHalfHeight,
            halfDepth: bodyHalfDepth,
            color: totemColour,
            topColor: totemHighlight,
            topTaper: .96,
            alpha: arrival*(record.demoTotemFaded ? .18 : .98),
            rotationY
        });
        if(record.demoTotemSignsVisible && !record.demoTotemFaded){
            const right={x:Math.cos(rotationY),y:0,z:-Math.sin(rotationY)},front={x:-right.z,y:0,z:right.x};
            for(const card of (record.liveTotemCards || demoTotemCards(record)).slice(1,5)){
                const direction=card.boardSide==='left'?-1:1,y=Number(card.signHeight) || .76;
                const start={x:record.position.x+right.x*direction*bodyHalfWidth*.88+front.x*(bodyHalfDepth+.012),y:groundBaseY+y,z:record.position.z+right.z*direction*bodyHalfWidth*.88+front.z*(bodyHalfDepth+.012)};
                const end={x:record.position.x+right.x*direction*.56+front.x*(bodyHalfDepth+.018),y:groundBaseY+y,z:record.position.z+right.z*direction*.56+front.z*(bodyHalfDepth+.018)};
                drawSpatialTether(gl,tetherRenderer,view,start,end,{segments:2,width:.012,curve:0,lift:0,color:[.66,.70,.69,.9]});
            }
        }
        drawSpatialTotemButtons(gl,sphereRenderer,view.projectionMatrix,view.transform.inverse.matrix,{...record.position,y:groundBaseY},rotationY,{
            bodyHalfWidth:bodyHalfWidth,bodyHalfDepth,bodyHalfHeight,
            signsVisible:Boolean(record.demoTotemSignsVisible),faded:Boolean(record.demoTotemFaded),arrivalOpacity:arrival
        });
    });
    const linkedTotems = markers.filter(record => record.demoType === 'zone' && record.demoLinkVisible);
    if (linkedTotems.length >= 2) {
        const [first, second] = linkedTotems;
        const firstGround = Number(first.groundBaseY ?? (first.position?.y || 0) - DEMO_TOTEM_HALF_HEIGHT_METRES);
        const secondGround = Number(second.groundBaseY ?? (second.position?.y || 0) - DEMO_TOTEM_HALF_HEIGHT_METRES);
        const linkFaded=first.demoTotemFaded && second.demoTotemFaded;
        drawSpatialTether(
            gl,
            tetherRenderer,
            view,
            { ...first.position, y: firstGround + .52 },
            { ...second.position, y: secondGround + .52 },
            { width: .012, color: [.4, .9, .72, linkFaded ? .1 : .82], curve: .02, lift: .04 }
        );
    }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const p = gl.getAttribLocation(program, 'p'); const uv = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
    drawIntroSpatial(view);
    markers.forEach(record => {
        if(record.demoType==='note' && record.appearance?.note_template==='pollinators' && performance.now()-(record.noteScrolledAt||0)>2600){
            record.noteScrolledAt=performance.now();record.noteScrollIndex=(Number(record.noteScrollIndex)||0)+1;
            replaceDemoTexture(record);
        }
        if (record.demoType === 'plant' && record.demoExpanded && record.pimBloomStarted) {
            const elapsed = performance.now() - record.pimBloomStarted;
            if (elapsed <= PIM_BLOOM_DURATION_MS) {
                queueDemoPimTextureRefresh(record);
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
        const noteScale = noteSign ? record.demoAmbientNeighbour ? {x:DEMO_NOTE_IMMERSIVE_SCALE.x*.62,y:DEMO_NOTE_IMMERSIVE_SCALE.y*.62} : DEMO_NOTE_IMMERSIVE_SCALE : null;
        const defaultPimModel = fixedPimPanelMatrix(record.informationPose);
        const model = plantProfile
            ? (() => {
                const size = record.pimTextureSize || demoPimSurfaceSize(record);
                if (size.width === PIM_TEXTURE_SIZE.width && size.height === PIM_TEXTURE_SIZE.height) return defaultPimModel;
                return fixedPimPanelMatrix(
                    record.informationPose,
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
        const sceneOpacity=noteSign && record.demoNarrativeFaded ? .14 : record.demoAmbientNeighbour ? .72 : profileOpacity;
        gl.uniform1f(gl.getUniformLocation(program, 'opacity'), sceneOpacity);
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
        markers.filter(record=>record.demoType==='zone' && record.demoExpanded && !record.demoNarrativeFaded).forEach(record=>{
            if(!record.totemCardsRefreshed || performance.now()-record.totemCardsRefreshed>500) {
                record.liveTotemCards=demoTotemCards(record);record.totemCardsRefreshed=performance.now();
            }
            totemCardsRenderer.draw(view,record,{...record.position,y:record.groundBaseY ?? record.position.y-DEMO_TOTEM_HALF_HEIGHT_METRES},record.liveTotemCards,record.totemSelectedCard);
        });
        totemCardsRenderer.end();
    }
    drawDemoControllerPointer(view);
}

function drawDemoControllerPointer(view) {
    if (!tetherRenderer) return;
    if (latestTrackedHandStates.length && demoHandMode==='outline') {
        for (const { state } of latestTrackedHandStates) {
            if (!state?.joints) continue;
            const engaged=Boolean(state.pinch || demoHeldIndex>=0 || handPinchActive);
            for (const [fromName,toName] of XR_HAND_JOINT_CONNECTIONS) {
                const from=state.joints.get(fromName),to=state.joints.get(toName);
                if(from && to)drawSpatialTether(gl,tetherRenderer,view,from,to,{segments:2,width:engaged ? .0038 : .0025,curve:0,lift:0,color:[.82,.89,.92,engaged ? .40 : .24]});
            }
        }
        return;
    }
    const pointerSource = demoControllerInputSource();
    // Android exposes taps as a WebXR `screen` ray. It remains available for
    // hit testing, but the Quest laser/contact sphere must only be rendered
    // for tracked spatial input.
    if (!latestControllerRay || pointerSource?.targetRayMode === 'screen') return;
    const { origin, direction } = latestControllerRay;
    const start = {
        x: origin.x + direction.x * XR_LASER_POINTER_CONFIG.startOffset,
        y: origin.y + direction.y * XR_LASER_POINTER_CONFIG.startOffset,
        z: origin.z + direction.z * XR_LASER_POINTER_CONFIG.startOffset
    };
    const limSurface=(arWelcomeShowcaseActive && introWorldAnchor && currentLimPointerCell()) || (arWelcomeShowcaseActive && introWorldAnchor && knowledgeCombinationState)
        ? welcomeSurfaceHit(introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition),AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080)
        : null;
    const continueButton=appRoot?.querySelector('[data-tryit-intro-continue]');
    const controlSurface=session && !domOverlayEnabled && continueButton && sessionMode!=='immersive-vr' && !continueButton.hidden && introWorldAnchor
        ? welcomeSurfaceHit(introLocalPosition(introWorldAnchor,INTRO_CONTROL_POSITION),INTRO_CONTROL_SCALE[0],INTRO_CONTROL_SCALE[1],900,360)
        : null;
    const placementPoint=placementReady ? placementPosition() : null;
    const placementDepth=placementPoint ? (placementPoint.x-origin.x)*direction.x+(placementPoint.y-origin.y)*direction.y+(placementPoint.z-origin.z)*direction.z : NaN;
    const placementSurface=Number.isFinite(placementDepth) && placementDepth>0 ? {distance:placementDepth,point:placementPoint} : null;
    const pimTarget=demoInfoTarget()?.target;
    const hoveredRecordTarget=demoRecordAtPointer();
    const hoveredRecordHit=hoveredRecordTarget?.hit || null;
    const pimSurface=pimTarget?.point ? {point:pimTarget.point,distance:pimTarget.distance} : null;
    const surface = [limSurface,controlSurface,placementSurface,pimSurface,hoveredRecordHit,infoPanel?.hit(latestControllerRay),totemCardsRenderer?.hit(latestControllerRay)].filter(Boolean).sort((a,b)=>a.distance-b.distance)[0];
    // Dashboard-style surfaces expose `position`; Totem/PIM surfaces expose
    // `point`. Treat both as the same exact visual contact so the laser does
    // not fall through to its five-metre fallback after a valid cell hit.
    const contactPoint=surface?.point || surface?.position;
    const surfacePoint=contactPoint ? {
        x:contactPoint.x-direction.x*.004,
        y:contactPoint.y-direction.y*.004,
        z:contactPoint.z-direction.z*.004
    } : null;
    const end = surfacePoint || controllerRayEnd(latestControllerRay, [], XR_LASER_POINTER_CONFIG.length);
    if (!end) return;
    drawSpatialTether(gl, tetherRenderer, view, start, end, {
        segments: XR_LASER_POINTER_CONFIG.segments,
        width:latestTrackedHandStates.length ? .0032 : XR_LASER_POINTER_CONFIG.width,
        curve: .001,
        lift: .001,
        color:latestTrackedHandStates.length ? [.78,.91,.96,handPinchActive ? .76 : .54] : [...XR_LASER_POINTER_CONFIG.color, XR_LASER_POINTER_CONFIG.alpha]
    });
    if(surface)drawSpatialSphere(gl,sphereRenderer,view.projectionMatrix,view.transform.inverse.matrix,end,.013,{color:latestTrackedHandStates.length?[.82,.94,.98]:[.82,1,.56],alpha:1,emissive:.65});
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
            setGuide(`${sessionMode === 'immersive-vr' ? 'Spatial device immersive mode' : 'Passthrough AR'} is active. Surface detection unavailable; placement uses your view direction. (${error.message})`);
        }
        setupRenderer();
        session.addEventListener('select', event => {
            if(event.inputSource?.hand)return;
            captureDemoInputEventRay(event);
            if(knowledgeCombinationState){selectImmersiveKnowledgeCombination();return;}
            if(demoKnowledgeWorkspace) {const hit=spatialDashboardRayHit(latestControllerRay,demoKnowledgePanel,demoKnowledgeMirror || {});if(hit) demoKnowledgeMirror?.activateAt(hit.pixelX,hit.pixelY);return;}
            if (demoWebModeOpen || performance.now() < suppressSessionSelectUntil) return;
            if (demoHeldIndex >= 0) return;
            if(arWelcomeIntroPending){activateImmersiveDemoControl();return;}
            if (placementReady) return pressPlacementPointer();
            if (activateDemoTotemCard(totemCardsRenderer?.hit(latestControllerRay))) return;
            if (selectDemoProfileCell()) return;
            if (selectDemoNoteTemplateAtPointer()) return;
            if (selectDemoPlantAtPointer()) return;
            // Quest controllers do not reliably generate DOM click events for
            // the optional overlay. Only after spatial targets decline the
            // select do we activate an exposed tutorial action.
            if (activateImmersiveDemoControl()) return;
            selectGuidedDemoOrb();
        });
        pimHold=bindSpatialPimHold({session,enabled:()=>!demoKnowledgeWorkspace && !demoWebModeOpen && !arWelcomeIntroPending && !placementReady && !infoPanel?.hit(latestControllerRay),
            getTarget:demoInfoTarget,activate:()=>selectDemoProfileCell(),
            progress:({record,target},amount)=>{record.pimPressPath=(target.node || target).path;record.pimPressProgress=amount;queueDemoPimTextureRefresh(record);}
        });
        session.addEventListener('selectstart', event => {
            if(event.inputSource?.hand)return;
            captureDemoInputEventRay(event);
            if(demoKnowledgeWorkspace) return;
            if(totemCardsRenderer?.hit(latestControllerRay)) return;
            if (demoWebModeOpen || performance.now() < suppressSessionSelectUntil) return;
            if (arWelcomeIntroPending || placementReady) return;
            if (beginImmersiveKnowledgeCombination()) return;
            if (demoInfoTarget()?.target) return;
            const actionTarget = demoRecordAtPointer()?.record;
            if (actionTarget?.demoType === 'note') return;
            beginControllerDemoHold();
        });
        session.addEventListener('selectend', event => {
            if(event.inputSource?.hand)return;
            captureDemoInputEventRay(event);syncImmersiveKnowledgeCombination();
            if(endImmersiveKnowledgeCombination())return;
            if (demoHeldIndex < 0) {
                clearTimeout(demoHoldTimer);
                demoHoldTimer = null;
                return;
            }
            releaseHeldDemoRecord();
            suppressSessionSelectUntil = performance.now() + 280;
        });
        session.addEventListener('selectcancel',()=>endImmersiveKnowledgeCombination(true));
        session.addEventListener('end', () => { const shouldReturn = !ending; session = null; clearSessionState(); if (shouldReturn) window.renderLaunchScreen(); ending = false; });
        const draw = (_time, frame) => {
            if (!session || frame.session !== session || !gl) return;
            session.requestAnimationFrame(draw);
            introFrameToken = _time;
            const pose = frame.getViewerPose(referenceSpace);
            if (pose) {
                viewerMatrix = Float32Array.from(pose.transform.matrix);
                latestDemoView = pose.views?.[0] || null;
                lastViewerPoseAt = _time;
            }
            const hit = hitTestSource && frame.getHitTestResults(hitTestSource)[0];
            const hitPose = hit?.getPose(referenceSpace);
            hitMatrix = hitPose ? Float32Array.from(hitPose.transform.matrix) : null;
            groundYEstimate = demoGroundBaseY(hitMatrix, viewerMatrix, groundYEstimate);
            updateDemoControllerRay(frame);
            syncDemoPimHover();
            syncImmersiveKnowledgeCombination(_time);
            pollDemoControllerDepth(_time);
            pollDemoHandPinch();
            syncImmersiveLimHover();
            tickLimActivation(_time);
            infoPanel?.update(viewerMatrix, _time, latestControllerRay, frame);
            if(!limPanelDiagnosticRecorded && infoPanel?.getPosition?.()){
                limDiagnostic('companion-panel-position',infoPanel.getPosition());
                limPanelDiagnosticRecorded=true;
            }
            pimHold?.tick(_time);
            if(!demoKnowledgeWorkspace) updateHeldDemoRecordPosition();
            const layer = frame.session.renderState.baseLayer;
            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.clearColor(0, 0, 0, transparentSession ? 0 : 1);
            if(!pose){gl.disable(gl.SCISSOR_TEST);gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);return;}
            gl.enable(gl.SCISSOR_TEST);
            for (const view of pose?.views || []) {
                const viewport = layer.getViewport(view);
                if (!viewport) continue;
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                drawSpatialRain(view, _time);
                drawSpatialAmbientLife(view);
                try { drawMarker(view); }
                catch (error) { reportDemoRenderFailure(error, 'marker render'); }
                try { drawDemoKnowledge(view); }
                catch (error) { reportDemoRenderFailure(error, 'PIM render'); }
                try { infoPanel?.draw(view); }
                catch (error) { reportDemoRenderFailure(error, 'Control panel render'); }
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
    if (isDesktopLearningBookTarget()) return renderDesktopLearningBook(app,{moringaDocument:MORINGA_PIM,onExit:()=>window.renderLaunchScreen?.()});
    if (shouldSkipArIntroductionPreparation()) return startTemporaryArDemo(app);
    renderArIntroductionPreparation(app, {
        onContinue: () => startTemporaryArDemo(app),
        onCancel: () => window.renderLaunchScreen?.()
    });
}

export async function startTemporaryArDemo(app) {
    if (isDesktopLearningBookTarget()) return renderDesktopLearningBook(app,{moringaDocument:MORINGA_PIM,onExit:()=>window.renderLaunchScreen?.()});
    appRoot = app;
    limDiagnostic('device-context',limDeviceContext(navigator.maxTouchPoints ? 'touch-capable' : 'mouse'));
    clearSessionState();
    const immersive = await startImmersive();
    renderInterface(!immersive);
    if (!immersive) viewerMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
