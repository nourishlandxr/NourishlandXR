import {selectTotemSign,selectedTotemDestinationIds,drawSignDestinationHighlight} from '../services/totemSignSelection.js';
import {LIM_ALL_CELLS,LIM_CELL_BY_ID,LIM_INTRO_CELL_BY_ID,LIM_PATHWAYS,limLearningContent} from '../services/limLearning.js';
import { createPimInfoPanel } from '../services/pimInfoPanel.js';
import { avoidDemoPanelOverlap } from '../services/demoPanelGeometry.js';
import { createLimActivationController } from '../services/limActivation.js';
import { advanceLimPathway, backLimPathway, completeLimPathway, idleLimPathwayState, loadLimPathwayState, pauseLimPathway, resumeLimPathway, saveLimPathwayState, startLimPathway, visitLimPathwayCell } from '../services/limPathwayState.js';
import { bindSpatialPimHold } from '../services/pimActivationHold.js';
import { createPlantKnowledgeResolver, totemKnowledgeCards, liveOrbCrownMarkup } from '../services/spatialKnowledgePresentation.js';
import { createSpatialTotemCards, drawSpatialTotemButtons, drawSpatialTotemPlaques, resolveTotemNavigation, totemLayoutForRecord } from '../services/spatialTotemCards.js';
const resolveOrbKnowledge = createPlantKnowledgeResolver();
import {drawArWelcomePanel,WELCOME_RIM_MOTION} from '../services/arWelcomePanel.js';
import { WELCOME_ROOT_MILESTONES, WELCOME_ROOT_REFRESH_MS, advanceWelcomeRootProgress, welcomeRootsNeedRefresh } from '../services/arWelcomeRoots.js';
import {createWelcomePresentationClock,AR_WELCOME_SHOWCASE_DURATION,AR_WELCOME_OPENING_MS,AR_WELCOME_REDUCED_OPENING_MS,drawArWelcomeShowcase,createArWelcomeClusters,welcomeExperienceFrames,welcomeCellAtPoint,welcomeRelationshipFor,welcomeRevealIsAnimating} from '../services/arWelcomeShowcase.js';
/**
 * TRY IT NOW — a deliberately small, self-contained AR placement demo.
 * It never opens a dashboard or a draggable window before placement.
 */
import { createMinimalMarkerDraft, relateMinimalMarkers } from '../services/markerWorkflow.js';
import { placementPointerMarkup } from '../services/placementPointer.js';
import { spatialDepthDelta, spatialMoveControlMarkup } from '../services/spatialMoveControl.js';
import { beePointerAvoidance, demoBeePose, drawDemoAmbientLife } from '../services/demoAmbientLife.js';
import { createSpatialSphereRenderer, destroySpatialSphereRenderer, drawSpatialOrb, drawSpatialSphere } from '../services/spatialSphereRenderer.js';
import { SPATIAL_OBJECT_VISUALS, spatialTransitionProgress } from '../services/spatialObjectVisuals.js';
import { createSpatialTetherRenderer, destroySpatialTetherRenderer, drawSpatialPointerContact, drawSpatialTether } from '../services/spatialTetherRenderer.js';
import { createSpatialPrismRenderer, destroySpatialPrismRenderer, drawSpatialPrism } from '../services/spatialPrismRenderer.js';
import { createSpatialTriangleRenderer, destroySpatialTriangleRenderer, drawSpatialTriangle } from '../services/spatialTriangleRenderer.js';
import { AR_EXPERIENCE_CONFIG } from '../services/arExperienceConfig.js';
import { PIGEON_PEA_AR_KNOWLEDGE, PIGEON_PEA_EXAMPLE } from '../services/pigeonPeaExample.js';
import { currentNxrLanguage, translateNxrText } from '../services/i18n.js';
import { configureXRFrameRate, isQuestHeadsetBrowser, requestImmersiveArSession } from '../services/webxrSession.js';
import { mountDesktopSpatialPreview } from '../services/desktopSpatialPreview.js';
import { isDesktopLearningBookTarget } from '../services/desktopLearningBookTarget.js';
import { renderDesktopLearningBook } from './desktopLearningBook.js';
import { BIOMAP_CATEGORIES, DEMO_CONTENT, DEMO_JOURNEY_STAGES, DEMO_NOTE_TEMPLATE_KEYS, DEMO_ORB_MATERIALS, DEMO_PANEL_HINTS, DEMO_TUTORIAL_ART, INTRO_KNOWLEDGE_KEYWORDS, NOTE_TEMPLATES, WELCOME_BOARD_PARAGRAPHS, WELCOME_BOARD_PARAGRAPHS_PT } from '../features/ar-demo/demoContent.js';
import { AR_PHONE_COMFORT, AR_WELCOME_SETTLED_MS, DEMO_ARCHETYPE_INTERVAL_MS, DEMO_ARCHETYPE_REVEAL_MS, DEMO_ARCHETYPE_START_MS, DEMO_BOARD_TYPING_SAFETY_MS, DEMO_LIM_SURFACE_CANVAS, DEMO_LIM_TEXTURE_INTERVAL_MS, DEMO_NOTE_IMMERSIVE_SCALE, DEMO_PIM_IMMERSIVE_SCALE, DEMO_PLANT_ORB_HOLD_DELAY_MS, DEMO_PRESENTATION_FONT, DEMO_QUEST_ORB_SCALE, DEMO_SEQUENCE, DEMO_TEXT_TEXTURE_INTERVAL_MS, DEMO_TOTEM_HALF_HEIGHT_METRES, DEMO_WELCOME_CONTINUE_MS, DEMO_WELCOME_DESCRIPTION_HOLD_MS, DEMO_WELCOME_OPENING_MS, DEMO_WELCOME_TITLE_HOLD_MS, INTRO_CONTROL_POSITION, INTRO_CONTROL_SCALE, demoRainProgress, welcomeAutoAdvanceReady } from '../features/ar-demo/demoConfig.js';
import { MORINGA_KNOWLEDGE, MORINGA_PIM, MORINGA_PROFILE } from '../features/ar-demo/demoPlantContent.js';
import { demoBillboardSurfaceSize, demoBillboardTextureLocalPoint, demoGroundBaseY, demoPlacementPosition, demoPointerScreenPoint, demoViewerPointerFallbackAllowed, isDemoFloorHit } from '../features/ar-demo/demoGeometry.js';
import { preservePlacedDemoPlants, selectDemoPlantRecord, selectGuidedDemoOrb as selectGuidedDemoOrbRecord } from '../features/ar-demo/demoSelection.js';
import { demoPimExpandedNodeIds, demoPimState, setDemoPimState } from '../features/ar-demo/demoState.js';
import { simulatedAnchorFromPointer } from '../features/ar-demo/demoSimulation.js';
import { demoContentFor, demoPlantMedia, simulatedAreaLinkMarkup, simulatedPlantMarkup, simulatedRecordMarkup, simulatedTotemMarkup, virtualTagProfileMarkup } from '../features/ar-demo/demoPreviewMarkup.js';
import { allowArScreenRotation, releaseArScreenRotation } from '../services/arScreenOrientation.js';
import { renderArIntroductionPreparation, shouldSkipArIntroductionPreparation, showArSafetyDialog } from '../services/arOnboarding.js';
import { recordArDiagnostic, recordArFailure } from '../services/arNote.js';
import { controllerRayEnd, controllerRayFromPose, createControllerYSkipTracker, handTrackingState, XR_HAND_JOINT_CONNECTIONS, XR_LASER_POINTER_CONFIG } from '../services/xrPointer.js';
import { spatialNoteTemplate } from '../services/spatialNoteTemplates.js';
import { PIM_SPATIAL_CONFIG, PIM_SPATIAL_LAYOUT_OPTIONS, pimCreateInteractionState, pimNodeAtPath, pimNodeChildren, pimResetInteractionState, pimSpatialPanel, pimSpatialPoseAboveAnchor, pimToggleNodeState, pimViewportSafeArea, pimVisibleNodes } from '../services/plantInformationMesh.js';
import { PIM_BLOOM_DURATION_MS, PIM_TEXTURE_SIZE, createPlantInformationHoneycombTexture, pimHoneycombTargetAtPercent, pimHoneycombTextureSize } from '../services/plantInformationMeshCanvas.js?v=0.9001';
import { resolvePlantPim } from '../services/pimLegacyAdapter.js';
import { pimToArKnowledge } from '../services/pimModel.js';
import { mountCreatorArKnowledge } from '../services/creatorArKnowledge.js';
import { createSpatialDashboardMirror, spatialDashboardPanelFromViewer, spatialDashboardPanelMatrix, spatialDashboardRayHit } from '../services/spatialDashboardMirror.js';
import { mountPlantInformationWeb } from '../components/plantInformationWeb.js';
import { PIGEON_PEA_PIM } from '../services/pigeonPeaPim.js';
import { DEMO_NEIGHBOUR_PLANT_IDS, demoNeighbourPim } from '../services/demoNeighbourPim.js';
import { DEMO_RECORD_IDS, demoAreaRecordVisible, demoGroundLinkRoute } from '../services/demoAreaOwnership.js';
import { createDemoExitLifecycle, DEMO_EXIT_STATES } from '../services/demoExitLifecycle.js';
import { nearestDemoXrTarget } from '../services/demoXrInteraction.js';
import { demoRainV2Field, paintDemoRainV2Preview } from '../services/demoRainV2.js';
import { demoWelcomeSurfaceHit } from '../services/demoWelcomeHit.js';
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
import { DEMO_NATIVE_CONNECTION_EXAMPLES, demoNativeConnectionSpec, demoNativeTargetLineage, createDemoNativeConnection, acceptDemoNativeSource, beginDemoNativeTarget, finishDemoNativeConnection, retryDemoNativeTarget } from '../services/demoNativeConnection.js';

export { demoRainProgress, welcomeAutoAdvanceReady, MORINGA_PIM };

let demoKnowledgeWorkspace=null, demoKnowledgeRoot=null, demoKnowledgeMirror=null, demoKnowledgePanel=null;
let demoKnowledgeScrollAt=0;
let appRoot = null;
let session = null;
let demoRefreshRate=90, demoShowFps=false, demoRatePending=false;
let observedRefreshRate=null;
let fpsSession=null, fpsStarted=0, fpsFrames=0, measuredFps=null;
function publishDemoPerformance(){
    infoPanel?.setXRPerformance({rate:demoRefreshRate,showFps:demoShowFps,pending:demoRatePending,
        supported:typeof session?.updateTargetFrameRate==='function'?Array.from(session.supportedFrameRates || []):[],
        actual:session?.frameRate || null,label:`${measuredFps === null?'Measuring...':measuredFps+' FPS'} / ${session?.frameRate || '?'} Hz`});
}
async function handleDemoPerformanceAction(action){
    if(action==='ShowFps'){demoShowFps=!demoShowFps;fpsStarted=0;fpsFrames=0;measuredFps=null;publishDemoPerformance();return;}
    const activeSession=session;
    if(!activeSession || demoRatePending)return;
    const choices=['auto',...Array.from(activeSession.supportedFrameRates || []).filter(rate=>[72,90,120].includes(rate)).sort((a,b)=>a-b)];
    const next=choices[(choices.indexOf(demoRefreshRate)+1)%choices.length];
    demoRatePending=true;publishDemoPerformance();
    try{const result=await configureXRFrameRate(activeSession,next);if(session===activeSession && result.requested!==null)demoRefreshRate=next==='auto'?next:result.requested;}
    finally{demoRatePending=false;publishDemoPerformance();}
}
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
let lastSpatialPimActivationAt = -Infinity;
let demoPimHover={record:null,path:''};
let activePimLimBridge = null;
let demoRenderFailureReported = false;
const XR_FIRST_CONTENT_TIMEOUT_MS=2500;
const XR_RECOVERY_CODE='NLXR-XR-01';
let xrRecoveryTexture=null,xrRecoveryCanvas=null,xrRecoveryStatus='starting',xrRecoveryDetail='';
let xrFirstContentRendered=false,xrFirstContentWatchdog=null,xrDisabledFrameSteps=new Set(),xrReportedFailurePhases=new Set();
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
    if(!xrReportedFailurePhases.has(phase)){
        xrReportedFailurePhases.add(phase);
        recordArFailure(error, phase);
    }
    xrRecoveryStatus='failed';
    xrRecoveryDetail=phase;
    if(xrRecoveryTexture && gl){gl.deleteTexture(xrRecoveryTexture);xrRecoveryTexture=null;}
    if (demoRenderFailureReported) return;
    demoRenderFailureReported = true;
    setGuide('The scene is recovering. Your information is still available.');
}

function runXrFrameStep(phase, operation) {
    if(xrDisabledFrameSteps.has(phase))return false;
    try { operation();return true; }
    catch(error){
        xrDisabledFrameSteps.add(phase);
        reportDemoRenderFailure(error,phase);
        return false;
    }
}

function beginXrFirstContentWatchdog(){
    clearTimeout(xrFirstContentWatchdog);
    xrFirstContentRendered=false;
    xrRecoveryStatus='starting';
    xrRecoveryDetail='';
    xrDisabledFrameSteps=new Set();
    xrReportedFailurePhases=new Set();
    xrFirstContentWatchdog=setTimeout(()=>{
        if(xrFirstContentRendered || !session)return;
        reportDemoRenderFailure(new Error('No spatial content rendered before the startup deadline.'),'first-frame watchdog');
    },XR_FIRST_CONTENT_TIMEOUT_MS);
}

function markXrFirstContentRendered(){
    if(xrFirstContentRendered)return;
    xrFirstContentRendered=true;
    if(xrRecoveryStatus!=='failed')xrRecoveryStatus='ready';
    clearTimeout(xrFirstContentWatchdog);xrFirstContentWatchdog=null;
    recordArDiagnostic('Temporary demo first spatial frame',{mode:sessionMode});
}
function demoInfoTarget() {
    return nearestDemoXrTarget(markers.filter(r=>r.demoType==='plant' && r.demoExpanded && demoAreaVisible(r)).map(record=>{
        const target=demoPimPointerTarget(record),node=target?.node || (target?.pimBack ? target : null);
        return node ? {kind:'pim-cell',id:`${record.id}:${node.path || node.id || 'back'}`,distance:target.distance,record,target} : null;
    }));
}
function syncDemoPimHover(){
    const candidate=demoInfoTarget(),nextRecord=candidate?.record || null,nextPath=candidate?.target?.node?.path || candidate?.target?.path || '';
    if(nextRecord===demoPimHover.record && nextPath===demoPimHover.path)return;
    const previous=demoPimHover.record;demoPimHover={record:nextRecord,path:nextPath};
    for(const record of new Set([previous,nextRecord].filter(Boolean))) queueDemoPimTextureRefresh(record);
}
let tetherRenderer = null;
let prismRenderer = null;
let triangleRenderer = null;
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
let nativeConnectionState=null,nativeLimHoldPointer=null,nativeConnectionEffect=null,nativeConnectionEffectLastAt=0;
let ambientCanvas=null,ambientBeeModel=null,ambientBeeSpriteTexture=null,ambientBeeSpriteUploadedAt=-Infinity,ambientBeesStartedAt=NaN,ambientWorldAnchor=null,ambientWorldFrame=null,ambientEncounterOrigin=null,ambientBeeAvoidance=[],ambientLastPaint=0;
let rainV2Canvas=null,rainV2LastPaint=0;
let demoRainIntensity=1;
let demoRainStyle='v2';
let demoCloseStageWasInert=false;
let demoCellOpacity=1;
let limHiddenCells=new Set();
// Deeper LIM branches open only after their parent cell is explored. Keeping
// these IDs separate from selection lets the visitor wander without a full
// catalogue dumping onto the spatial board.
let limExpandedCells=new Set(),limExpandedAt=new Map();
let limMeshVisible=true;
let limActivation=null, limActivationFrame=0, limInteractionCleanup=()=>{}, limSessionCleanup=()=>{}, limPointerKey='', limPointerId=null, limInputSource=null, limInputSuppressSource=null, limActivationSessionSuppressUntil=0;
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
let demoGrabPreparingIndex = -1;
let demoGrabInputSource = null;
let suppressDemoMarkerClick = false;
let suppressSessionSelectUntil = 0;
let demoWebModeOpen = false;
let demoPimWebController = null;
let demoHoldButtonCleanup = null;
let demoViewportCleanup = null;
let groundYEstimate = null;
let demoTutorialStep = DEMO_TUTORIAL_STEPS.WELCOME;
let demoOrientationStep=-1,demoPanelControlsCleanup=()=>{},demoPanelActionSignature='',elementPanelActionSignature='',demoControllerYSkipTracker=null;
let demoSlideHistory=[],demoSlideHistoryIndex=-1,demoSlideHistoryReplay=false;
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
const demoLocalizedText = value => translateNxrText(value);
const welcomeBoardParagraphs = () => currentNxrLanguage() === 'pt-PT'
    ? WELCOME_BOARD_PARAGRAPHS_PT
    : currentNxrLanguage() === 'nl-NL'
        ? WELCOME_BOARD_PARAGRAPHS.map(demoLocalizedText)
        : WELCOME_BOARD_PARAGRAPHS;
const demoIsPortuguese = () => currentNxrLanguage() === 'pt-PT';
const demoIsDutch = () => currentNxrLanguage() === 'nl-NL';
const demoIntroLabel = () => introBoardStep || 'INTRO 1.1';
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
function pulseDemoHaptics(inputSource=null){
    try{
        const actuator=inputSource?.gamepad?.vibrationActuator;
        if(actuator?.playEffect)void actuator.playEffect('dual-rumble',{duration:45,strongMagnitude:.18,weakMagnitude:.12}).catch(()=>{});
        else if(inputSource?.gamepad?.hapticActuators?.[0]?.pulse)void inputSource.gamepad.hapticActuators[0].pulse(.18,45);
    }catch{}
}
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
function clearSessionState() {
    appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-lim-opening');
    appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-lim-surface');
    closeDemoKnowledge(true);
    demoPanelControlsCleanup();demoPanelControlsCleanup=()=>{};demoPanelActionSignature='';elementPanelActionSignature='';contextCellKey='';demoPimHover={record:null,path:''};demoOrientationStep=-1;demoControllerYSkipTracker?.reset();demoControllerYSkipTracker=null;limMeshVisible=true;demoCellOpacity=1;learningModule=null;learningModuleStep=0;activePimLimBridge=null;demoJourneyStage='why';demoRenderFailureReported=false;
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
    demoGrabPreparingIndex = -1;
    demoGrabInputSource = null;
    handPinchActive = false;
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
    clearTimeout(xrFirstContentWatchdog);xrFirstContentWatchdog=null;xrFirstContentRendered=false;xrDisabledFrameSteps=new Set();xrReportedFailurePhases=new Set();xrRecoveryStatus='starting';xrRecoveryDetail='';
    cancelAnimationFrame(arWelcomeShowcaseFrame);arWelcomeShowcaseFrame=0;arWelcomeShowcaseActive=false;
    clearTimeout(arWelcomeUnlockTimer);arWelcomeUnlockTimer=null;arWelcomeStartedAt=0;arWelcomeIntroPending=false;arWelcomeSharedBoard=false;limMeshActivatedAt=NaN;arWelcomeOpeningActive=false;arWelcomeOpeningDuration=AR_WELCOME_OPENING_MS;arWelcomeOpeningSeed=0;arWelcomeRenderedFrames=[];
    clearNativeConnectionHold();nativeConnectionState=null;removeNativeConnectionEffect();
    arWelcomeLayer?.remove();arWelcomeLayer=null;arWelcomeCanvas=null;limHiddenCells=new Set();limExpandedCells=new Set();limExpandedAt=new Map();limPointerKey='';limPointerId=null;limInputSource=null;limInputSuppressSource=null;
    ambientBeeModel?.destroy();ambientBeeModel=null;if(ambientBeeSpriteTexture)gl?.deleteTexture(ambientBeeSpriteTexture);ambientBeeSpriteTexture=null;ambientBeeSpriteUploadedAt=-Infinity;ambientCanvas=null;ambientBeesStartedAt=NaN;ambientWorldAnchor=null;ambientWorldFrame=null;ambientEncounterOrigin=null;ambientBeeAvoidance=[];ambientLastPaint=0;rainV2Canvas=null;rainV2LastPaint=0;
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
    if (xrRecoveryTexture) gl?.deleteTexture(xrRecoveryTexture);
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
    xrRecoveryTexture = null;
    xrRecoveryCanvas = null;
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

const demoExitLifecycle=createDemoExitLifecycle({
    getSession:()=>session,
    detachSession:owned=>{if(session===owned)session=null;},
    cleanup:()=>clearSessionState(),
    navigate:()=>window.renderLaunchScreen(),
    onStateChange:next=>{
        if(next===DEMO_EXIT_STATES.CONFIRMING){
            cancelDemoInteractionState('close-confirmation');
            const stage=appRoot?.querySelector('.tryit-stage');demoCloseStageWasInert=Boolean(stage?.inert);if(stage)stage.inert=true;
            infoPanel?.showConfirmation({title:'Close demo?',body:'Keep the demo open to return to the exact place you were exploring, or close it and return to the welcome screen.'});
        }else if(next===DEMO_EXIT_STATES.IDLE){const stage=appRoot?.querySelector('.tryit-stage');if(stage)stage.inert=demoCloseStageWasInert;infoPanel?.hideConfirmation();}
        syncDemoPanelActions();
    },
    onError:(error,phase)=>recordArFailure(error,`Demo exit · ${phase}`)
});

function cancelDemoInteractionState(reason='cancelled'){
    limActivation?.cancel(reason);limInputSource=null;limInputSuppressSource=null;limPointerKey='';limPointerId=null;
    pimHold?.cancel?.();
    clearTimeout(demoHoldTimer);demoHoldTimer=null;demoGrabPreparingIndex=-1;demoGrabInputSource=null;
    if(demoHeldIndex>=0)releaseHeldDemoRecord();
    handPinchActive=false;suppressSessionSelectUntil=0;limActivationSessionSuppressUntil=0;
}
function requestDemoClose(){return demoExitLifecycle.request();}
function cancelDemoClose(){return demoExitLifecycle.cancel();}
function confirmDemoClose(){return demoExitLifecycle.confirm();}
function returnToWelcome(){if(demoExitLifecycle.state===DEMO_EXIT_STATES.IDLE)demoExitLifecycle.request();return demoExitLifecycle.confirm();}

function setGuide(message) {
    const guide = appRoot?.querySelector('[data-tryit-guide]');
    if (guide) { guide.textContent = questControlGuide(message); guide.hidden = !message; }
}

function questControlGuide(message){
    const copy=String(message||'');
    return sessionMode==='immersive-vr'
        ? copy.replace(/(?:the )?round (Continue|Place a plant orb) trigger(?: at the bottom centre)?/gi,(_match,label)=>`${label} in the Control panel`)
        : copy;
}

function setIntroBoardNextGuide(message) {
    introBoardNextGuide=questControlGuide(message).trim();
    introBoardNextGuideVisible=false;
    infoPanel?.setContextualHint(introBoardNextGuide ? `HINT: ${introBoardNextGuide}` : '');
    introBoardTextureDirty=true;
    const textWindow=appRoot?.querySelector('[data-tryit-guided-choice] .tryit-board-text-window');
    if(!textWindow)return;
    textWindow.querySelector('.tryit-board-next')?.remove();
}
function revealIntroBoardNextGuide(){
    if(!introBoardNextGuide)return;
    introBoardNextGuideVisible=false;introBoardTextureDirty=true;
    infoPanel?.setContextualHint(`HINT: ${introBoardNextGuide}`);
}

function demoControlIsVisible(selector) {
    const element=appRoot?.querySelector(selector);
    return Boolean(element && !element.hidden && !element.disabled);
}

function demoPanelActions() {
    if(demoExitLifecycle.state===DEMO_EXIT_STATES.ENDING)return [
        {id:'close-confirm',label:'Closing…',primary:true,disabled:true}
    ];
    if(demoExitLifecycle.state===DEMO_EXIT_STATES.CONFIRMING)return [
        {id:'close-cancel',label:'Keep demo open'},
        {id:'close-confirm',label:'Close demo',primary:true}
    ];
    const actions=[];
    const desktopDemo=Boolean(appRoot?.querySelector('.tryit-demo.is-desktop-spatial-preview'));
    if(simulatedMode && demoControlIsVisible('[data-tryit-open-live-tag]'))actions.push({id:'live-tag',label:'Open Plant Live Tag'});
    actions.push({id:'back',label:'‹',ariaLabel:'Previous',description:'Previous',disabled:!(demoSlideHistoryIndex>0 || demoOrientationStep>0 && demoTutorialStep===DEMO_TUTORIAL_STEPS.WELCOME)});
    actions.push({id:'forward',label:'›',ariaLabel:'Next slide',description:'Next',disabled:!(demoSlideHistoryIndex>=0 && demoSlideHistoryIndex<demoSlideHistory.length-1)});
    if(activePimLimBridge && demoTutorialStep===DEMO_TUTORIAL_STEPS.PIM)actions.push({id:'pim-lim',label:'Why does this matter?'});
    if(arWelcomeShowcaseActive && ['apply','connect','impact'].includes(demoJourneyStage))actions.push({id:'lim-visibility',label:limMeshVisible?'Hide learning cells':'Show learning cells'});
    if(!desktopDemo)actions.push({id:'safety',label:'Safety guidance'});
    if(simulatedMode && isQuestHeadsetBrowser())actions.push({id:'quest',label:questLaunchPending?'Opening Spatial device…':'Enter Spatial device',disabled:questLaunchPending});
    actions.push({id:'close',label:'Close demo'});
    const continueButton=appRoot?.querySelector('[data-tryit-intro-continue]');
    if(continueButton && !continueButton.hidden)actions.push({id:'continue',label:continueButton.textContent.trim() || 'Continue',primary:true,disabled:continueButton.disabled});
    const navigation=actions.filter(item=>item.id==='back' || item.id==='forward');
    const priorities=actions.filter(item=>item.id==='close' || item.id==='continue');
    const ordinary=actions.filter(item=>!navigation.includes(item) && !priorities.includes(item));
    const slots=Math.max(0,8-navigation.length-priorities.length);
    return [...navigation,...(slots?ordinary.slice(-slots):[]),...priorities];
}

function syncDemoPanelActions() {
    if(!infoPanel)return;
    const actions=demoPanelActions(),signature=JSON.stringify(actions);
    // Exit confirmation stays in the panel beside Keep demo open; the stage
    // is inert while confirming, so an external action can become unreachable.
    const primary=demoExitLifecycle.state===DEMO_EXIT_STATES.IDLE?actions.find(item=>item.id==='continue'):null;
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
        if(placementReady && simulatedMode)refreshSimulatedPlacementAim();
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
    if(action==='close-cancel'){cancelDemoClose();return;}
    if(action==='close-confirm'){void confirmDemoClose();return;}
    if(action==='close'){requestDemoClose();return;}
    if(demoExitLifecycle.state!==DEMO_EXIT_STATES.IDLE)return;
    if(action==='continue'){appRoot?.querySelector('[data-tryit-intro-continue]:not([hidden])')?.click();return;}
    if(action==='live-tag'){appRoot?.querySelector('[data-tryit-open-live-tag]:not([hidden])')?.click();return;}
    if(action==='pim-lim'){openPimLimBridge(activePimLimBridge);return;}
    if(action==='safety'){showArSafetyDialog(appRoot?.querySelector('.tryit-demo'));return;}
    if(action==='back'){showDemoSlideFromHistory(demoSlideHistoryIndex-1);return;}
    if(action==='forward'){showDemoSlideFromHistory(demoSlideHistoryIndex+1);return;}
    if(action==='skip'){skipDemoNarration?.();return;}
    if(action==='lim-visibility'){setLimMeshVisible(!limMeshVisible);return;}
    if(action==='quest'){void retryQuestImmersive();return;}
    if(action==='recenter'){infoPanel?.recenter();return;}
}

function currentDemoStepSignature() {
    return [demoOrientationStep,demoTutorialStep,introBoardStep,introBoardTitle,demoStage,placementReady,demoWebModeOpen,nativeConnectionState?.phase || ''].join('|');
}

function skipCurrentDemoStep() {
    // Y is a tutorial testing shortcut. It never substitutes for placing or
    // moving an object, working in Web Mode, or completing a live connection.
    if (placementReady || demoHeldIndex >= 0 || demoWebModeOpen || nativeConnectionState && nativeConnectionState.phase!=='connected') return false;
    const before = currentDemoStepSignature();
    const skipNarration = skipDemoNarration;
    skipNarration?.();
    if (currentDemoStepSignature() !== before) return true;
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    if (!continueButton || continueButton.hidden || continueButton.disabled) return Boolean(skipNarration);
    continueButton.click();
    return true;
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
    if (/\n/.test(lastVisibleCharacter)) return 420;
    if (/[.!?]/.test(lastVisibleCharacter)) return 360;
    if (/[,;]/.test(lastVisibleCharacter)) return 200;
    if (/\s/.test(lastVisibleCharacter)) return 48;
    return 62;
}

function showDemoAction(nextStage) {
    if(nextStage==='note' && markers.some(record=>record.demoType==='note')){showSpatialGardenSummary();return;}
    const messages = {
        plant2: ['Apply the thinking in the place', 'A plant profile can hold far more than harvest or soil needs: identity, relationships, seasonal change, care, uses, local knowledge and questions still being explored. Add Moringa to see how two distinct living profiles can connect within one place.'],
        note: ['Turn attention into a record', 'The plants provide reference knowledge. A Note adds what someone actually sees, remembers or needs to do in this place.']
    };
    const [title, text] = messages[nextStage] || ['Continue the journey', 'Move to the next tutorial step.'];
    showGuidedChoice(`<h2>${title}</h2><p>${text}</p><button type="button" data-demo-choice="continue">Continue</button>`, choice => {
        if (choice === 'continue') armDemoPlacement(nextStage,{explained:nextStage==='note'});
    },{stepLabel:nextStage==='note'?'ELEMENTS 1.14':'ELEMENTS 1.9',nextGuide:nextStage==='note'?'':undefined});
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
            tutorialStep: DEMO_TUTORIAL_STEPS.PLACEMENT,
            stepLabel:'ELEMENTS 1.8'
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
        tutorialStep: DEMO_TUTORIAL_STEPS.LIVE_TAG,
        stepLabel:'ELEMENTS 1.8'
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
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:`LEARNING 1.${index+2}`,nextGuide:final?'Add a second plant to apply the reasoning in the mapped place.':'Continue through the next way of thinking.'}
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
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'LEARNING 1.1',nextGuide:'Follow the connection through observation, understanding, purpose and action.'}
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
    const right={x:Math.cos(demoTotemRotationY(record)),z:-Math.sin(demoTotemRotationY(record))};
    const directionFor=item=>{
        const dx=Number(item?.position?.x)-Number(record.position?.x);
        const dz=Number(item?.position?.z)-Number(record.position?.z);
        if(Number.isFinite(dx) && Number.isFinite(dz) && Math.hypot(dx,dz)>.05)return dx*right.x+dz*right.z<0?'left':'right';
        return '';
    };
    const pointedTitle=(title,side)=>side==='left'?`← ${title}`:side==='right'?`${title} →`:title;
    const shortPlantName=item=>String(item?.name || 'Plant').replace(/\s+(Grass|Tree)$/i,'');
    const zoneName=record.demoZoneName || record.demoContent?.title || record.name || 'This zone';
    const header={...totemKnowledgeCards({title:zoneName,introduction:`Welcome to ${zoneName}.`,
        plants:plants.map(item=>({id:item.id,name:item.name,knowledge:demoOrbKnowledge(item)})),
        notes:notes.map(item=>({id:item.id,title:item.name,body:(demoContentFor(item)?.lines || []).join(' · ')})),compact:true})[0],eyebrow:'ZONE'};
    const plantSigns=second
        ? ['left','right'].map(side=>({side,pair:plants.filter(item=>directionFor(item)===side)})).filter(group=>group.pair.length).map(({side,pair})=>({id:`plants-${side}`,eyebrow:'',title:pointedTitle(pair.map(shortPlantName).join(' · '),side),summary:`Plant Orbs · ${pair.map(item=>item.name).join(', ')}`,plaque:true,boardSide:side,references:pair.map(item=>item.id)}))
        : plants.map(item=>({id:`plant-${item.id}`,eyebrow:'',title:pointedTitle(`Plant Orb · ${item.name}`,directionFor(item)),summary:'',plaque:true,boardSide:directionFor(item),references:[item.id]}));
    const note=notes[0];
    const partner=markers.find(item=>item.demoType==='zone' && (item.id===record.demoLinkPartner || item!==record && item.demoZoneName===record.demoNeighbourZoneName));
    const destination=partner?.demoZoneName || '';
    const navigation=resolveTotemNavigation(record,partner);
    const neighbour=destination ? {id:'neighbour',eyebrow:'NEIGHBOUR TOTEM',title:navigation.reliable?pointedTitle(destination,navigation.side):`Explore ${destination}`,summary:'',body:navigation.reliable?'Follow this sign to the neighbouring Totem.':'Explore the neighbouring Area.',boardSide:navigation.side,plaque:true,navigation:{...navigation,destinationId:partner.id}} : null;
    return [header,...(neighbour ? [neighbour] : []),...plantSigns,
        ...(note ? [{id:`note-${note.id}`,eyebrow:'NOTE',title:pointedTitle(note.name,directionFor(note)),summary:'',body:(demoContentFor(note)?.lines || []).join(' · '),plaque:true,boardSide:directionFor(note),references:[note.id]}] : []),
    ].slice(0,5);
}
function demoAreaVisible(record) { return !record?.demoHiddenForLimo && demoAreaRecordVisible(record,markers); }

function clearHiddenDemoAreaState(area) {
    const owned=markers.filter(record=>record.demoAreaId===area?.id);
    const ownedSet=new Set(owned);
    const ownedIds=new Set(owned.map(record=>record.id));
    for(const record of owned){
        if(record.demoType==='plant'){
            record.demoExpanded=false;
            record.demoActiveBranch='';
            record.demoExpandedNodeIds=[];
            record.demoExpandedBranches=[];
            record.pimBloomPath='';record.pimBloomStarted=0;record.pimPressPath='';record.pimPressProgress=0;
            record.informationPose=null;record.informationPosition=null;
            infoPanel?.clearPlant?.(record);
        }
    }
    if(ownedSet.has(demoPimHover.record))demoPimHover={record:null,path:''};
    if(demoHeldIndex>=0 && ownedSet.has(markers[demoHeldIndex]))demoHeldIndex=-1;
    if(demoGrabPreparingIndex>=0 && ownedSet.has(markers[demoGrabPreparingIndex]))demoGrabPreparingIndex=-1;
    clearTimeout(demoHoldTimer);demoHoldTimer=null;demoGrabInputSource=null;
    for(const zone of markers.filter(record=>record.demoType==='zone')){
        const selected=demoTotemCards(zone).find(card=>card.id===zone.totemSelectedCard);
        if((selected?.references || []).some(id=>ownedIds.has(id)))zone.totemSelectedCard='';
    }
}

function setDemoAreaFaded(area,faded) {
    if(!area || area.demoType!=='zone')return;
    if(area.demoTotemFaded!==Boolean(faded)){
        const now=performance.now();
        area.demoTotemFadeFrom=demoTotemVisualOpacity(area,now);
        area.demoTotemFadeStartedAt=now;
    }
    area.demoTotemFaded=Boolean(faded);
    area.totemSelectedCard='';
    if(area.demoTotemFaded)clearHiddenDemoAreaState(area);
    updateSimulatedMarkers();
}
function demoTotemVisualOpacity(record,now=performance.now()) {
    const target=record.demoTotemFaded ? .18 : .98;
    if(!Number.isFinite(record.demoTotemFadeStartedAt))return target;
    const progress=spatialTransitionProgress(now,record.demoTotemFadeStartedAt,SPATIAL_OBJECT_VISUALS.totem.fadeTransitionMs,globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    return (record.demoTotemFadeFrom ?? target)*(1-progress)+target*progress;
}
function selectDemoTotemSign(record,cardId) {
    selectTotemSign(record,cardId,markers);
    const card=demoTotemCards(record).find(item=>item.id===record.totemSelectedCard);
    const target=markers.find(item=>item.id===(card?.navigation?.destinationId || card?.references?.[0]));
    if(target)setGuide(`Follow the ${card.boardSide || 'nearby'} sign to ${target.demoZoneName || target.name}. The destination is highlighted.`);
    updateSimulatedMarkers();
}
function selectedDemoTotemTargets() {
    return selectedTotemDestinationIds(markers.filter(item=>item.demoType==='zone'),demoTotemCards,
        record=>demoAreaVisible(record) && !record.demoTotemFaded && record.demoTotemSignsVisible!==false);
}

function activateDemoTotemCard(hit) {
    if(!hit)return false;
    infoPanel?.setMediaCollapsed(true);
    if(hit.card?.id==='__signs'){
        hit.record.demoTotemSignsVisible=!hit.record.demoTotemSignsVisible;
        hit.record.demoSignsChangedAt=performance.now();
        setDemoAreaFaded(hit.record,false);
        hit.record.totemSelectedCard='';
        hit.record.totemCardsRefreshed=0;
        infoPanel?.setContextualHint(hit.record.demoTotemSignsVisible?'Signs are visible. Each directional plaque points toward nearby Orbs, Notes or Totems.':'Signs are hidden. Turn them on to follow directional plaques to nearby Orbs, Notes or Totems.');
        updateSimulatedMarkers();return true;
    }
    if(hit.card?.id==='__fade'){
        setDemoAreaFaded(hit.record,!hit.record.demoTotemFaded);
        infoPanel?.setContextualHint(hit.record.demoTotemFaded?'Totem faded. Use Fade again to restore its full visibility.':'Totem restored. Fade dims it temporarily while you explore nearby information.');
        return true;
    }
    selectDemoTotemSign(hit.record,hit.detail ? '' : hit.card.id);return true;
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
    useSharedWelcomeBoard(true);
    introBoardStep=options.stepLabel || '';
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
    let typing = Boolean(paragraph && fullText && !options.persistent);
    // Persistent boards sit alongside the live PIM. Their action must be
    // available immediately so a long narration cannot make the demo appear
    // stalled after the mesh opens.
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
    const revealParagraph = () => {
        if (!typing || !paragraph) return;
        paragraph.textContent = fullText;
        paragraph.classList.add('is-revealed');
        panel.classList.add('is-copy-ready');
        introBoardVisibleBody = fullText;
        introBoardTextureDirty = true;
        boardTypingTimer = setTimeout(finishTyping, 800);
    };
    skipDemoNarration = finishTyping;
    if (typing) {
        paragraph.textContent = '';
        panel.classList.add('is-typing');
        boardTypingTimer = setTimeout(revealParagraph, 320);
    } else {
        finishTyping();
    }
    if (typing) {
        boardTypingWatchdogTimer = setTimeout(
            finishTyping,
            Math.max(DEMO_BOARD_TYPING_SAFETY_MS, 1200 + fullText.length * 90)
        );
    }
    // The board is display-only while it types. Clicking it must not snap the
    // remaining copy into place or consume a marker gesture.
    panel.onclick = null;
    setGuide('');
}

// Visitor wording from the Quick Access / Edit table in data1/demo.docx.
const DEMO_QUICK_ACCESS_COPY=Object.freeze({
    'INTRO 1.1':'Welcome to NourishlandXR — where extended reality brings plant stories and knowledge into living landscapes.',
    'INTRO 1.2':'Extended reality connects digital information with the world around you. Here, plants and places become starting points for discovery and learning.',
    'SPACE 1.1':'This is your Control Panel. It shows the actions and help available at each step.',
    'SPACE 1.2':'You arrive in a garden. A plant catches your attention — what is it, and what role does it play here?',
    'SPACE 1.3':'A Project brings together the plants, observations and guidance for a real place. Areas organise different parts of that place.',
    'SPACE 1.4':'In this demo, you’ll explore two plants, add an observation and see how Areas connect.',
    'SPACE 1.5':'The same place can support a visitor’s curiosity, a school activity or a land steward’s work.',
    'ELEMENTS 1.1':'A plant profile brings together its identity, ecology, care and uses, alongside local knowledge and sources.',
    'ELEMENTS 1.2':'Totem signs help you find your way through an Area, pointing towards plants, Notes and other Areas.',
    'ELEMENTS 1.3':'Start with Pigeon Pea. Aim at the plant, or choose a location for its digital tag.',
    'ELEMENTS 1.4':'The tag connects this plant profile to a location in the landscape.',
    'ELEMENTS 1.5':'Adjust the tag’s distance, then confirm its position.',
    'ELEMENTS 1.6':'This digital tag is a Plant Orb. Select it to open the plant profile, or hold it to move it.',
    'ELEMENTS 1.7':'Explore Pigeon Pea’s information cells to discover its characteristics and roles.',
    'ELEMENTS 1.8':'The same plant profile is also available in Web Mode, as a standard browser page.',
    'ELEMENTS 1.9':'Which of these characteristics could matter in this garden? Keep one in mind as you explore.',
    'ELEMENTS 1.10':'Now meet Moringa. Compare its characteristics with Pigeon Pea and consider the different roles they might play here.',
    'ELEMENTS 1.12':'Both plant profiles are now linked to this place, ready to explore and compare.',
    'ELEMENTS 1.14':'What do you notice in the actual landscape?',
    'ELEMENTS 1.15':'Create a Note to record an observation.',
    'ELEMENTS 1.17':'Your Note now belongs to this location. It can hold an observation, image, memory or task.',
    'ELEMENTS 1.18':'This Totem introduces the Area and points to nearby content. Use Show Signs to reveal its directions, or Fade to reduce its visibility.',
    'ELEMENTS 1.21':'A route connects the two Areas. Each keeps its own plants and Notes.',
    'ELEMENTS 1.22':'Linked Areas can form a garden tour, a learning trail or a route through a working landscape.',
    'LEARNING 1.7':'Choose a learning pathway and explore the questions within it.',
    'LEARNING 1.8':'Connect a plant characteristic to a learning question to explore it further.',
    'LEARNING 1.10':'Your connection opens a new question. Follow it further, or try another connection.',
    'LEARNING 1.12':'Take this question back to the landscape. What could you observe here to investigate it?',
    'CLOSURE 1.1':'Thank you for exploring NourishlandXR. You’ve connected two plants, an observation and two Areas — the beginnings of a living map that can grow with the place.'
});

function showIntroBoard(title, body, buttonLabel, onContinue, options = {}) {
    useSharedWelcomeBoard(true);
    setDemoTutorialStep(options.tutorialStep || DEMO_TUTORIAL_STEPS.GUIDED);
    const localizedTitle = demoLocalizedText(title);
    const quickAccessCopy=DEMO_QUICK_ACCESS_COPY[options.stepLabel];
    const paragraphs = (quickAccessCopy ? [quickAccessCopy] : Array.isArray(body) ? body : [body])
        .map(value => demoLocalizedText(String(value || '').trim()))
        .filter(Boolean);
    const bodyText = paragraphs.join('\n\n');
    introSceneActive = true;
    introBoardStep = options.stepLabel || nextDemoSlideCode();
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
    rememberDemoSlide({stepLabel:introBoardStep,title:localizedTitle,body:bodyText,buttonLabel,onContinue,options:{...options},kind:'intro'});
    let typingStartDelay = 220;
    let paragraphIndex = 0;
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
                paragraphElements[index].classList.toggle('is-revealed', visibleText.length >= end);
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
    const revealNextParagraph = () => {
        if (!typing) return;
        board?.classList.add('is-copy-ready');
        paragraphIndex++;
        introBoardVisibleBody = paragraphs.slice(0, paragraphIndex).join('\n\n');
        introBoardTextureDirty = true;
        paintBoardParagraphs(introBoardVisibleBody);
        if (paragraphIndex >= paragraphs.length) {
            boardTypingTimer = setTimeout(finishTyping, 800);
            return;
        }
        boardTypingTimer = setTimeout(revealNextParagraph, 1350);
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
    boardTypingTimer = setTimeout(revealNextParagraph, typingStartDelay);
    boardTypingWatchdogTimer = setTimeout(
        finishTyping,
        Math.max(DEMO_BOARD_TYPING_SAFETY_MS, typingStartDelay + paragraphs.length * 2200)
    );
    setGuide('');
}

function rememberDemoSlide(slide){
    if(demoSlideHistoryReplay)return;
    const code=String(slide?.stepLabel || '').trim();
    if(!code)return;
    const previous=demoSlideHistory[demoSlideHistoryIndex];
    if(previous?.stepLabel===code){demoSlideHistory[demoSlideHistoryIndex]={...slide};syncDemoPanelActions();return;}
    demoSlideHistory=demoSlideHistory.slice(0,demoSlideHistoryIndex+1);
    demoSlideHistory.push({...slide});
    demoSlideHistoryIndex=demoSlideHistory.length-1;
    syncDemoPanelActions();
}

function nextDemoSlideCode(){
    const family=['connect','impact','know'].includes(demoJourneyStage)?'LEARNING':['why'].includes(demoJourneyStage)?'INTRO':'ELEMENTS';
    const prefix=`${family} 1.`;
    const highest=demoSlideHistory.reduce((max,item)=>{
        if(!item.stepLabel?.startsWith(prefix))return max;
        const number=Number(item.stepLabel.slice(prefix.length));
        return Number.isFinite(number)?Math.max(max,number):max;
    },0);
    return `${prefix}${highest+1}`;
}

function showDemoSlideFromHistory(index){
    const slide=demoSlideHistory[index];
    if(!slide || index<0 || index>=demoSlideHistory.length)return;
    demoSlideHistoryIndex=index;
    demoSlideHistoryReplay=true;
    if(slide.kind==='intro'){
        showIntroBoard(slide.title,slide.body,slide.buttonLabel,()=>{
            const next=demoSlideHistoryIndex+1;
            if(next<demoSlideHistory.length)showDemoSlideFromHistory(next);
            else slide.onContinue?.();
        },{...slide.options,stepLabel:slide.stepLabel,historyReplay:true});
    }else if(slide.kind==='welcome' || slide.kind==='placement'){
        introSceneActive=true;introBoardVisible=true;introBoardTitle=slide.title;introBoardBody=slide.body;introBoardVisibleBody=slide.body;introBoardStep=slide.stepLabel;introBoardTextureDirty=true;useSharedWelcomeBoard(true);
        const board=appRoot?.querySelector('[data-tryit-guided-choice]');
        if(board){board.innerHTML=`<small>${demoIntroLabel()}</small><h2>${slide.title}</h2><div class="tryit-board-text-window"><p>${slide.body}</p></div>`;board.hidden=false;board.classList.add('is-copy-ready','is-persistent-demo-board');}
        const button=appRoot?.querySelector('[data-tryit-intro-continue]');
        if(button && slide.kind==='placement'){button.hidden=true;button.onclick=null;setIntroBoardNextGuide(slide.options?.nextGuide || 'Aim at the highlighted position and confirm placement.');}
        else if(button){button.hidden=false;button.disabled=false;button.textContent='Continue';button.onclick=()=>{const next=demoSlideHistoryIndex+1;if(next<demoSlideHistory.length)showDemoSlideFromHistory(next);else slide.onContinue?.();};}
    }
    demoSlideHistoryReplay=false;
    syncDemoPanelActions();
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
    useSharedWelcomeBoard(true);
    setDemoTutorialStep(DEMO_TUTORIAL_STEPS.PIM);
    const panel = appRoot?.querySelector('[data-tryit-guided-choice]');
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    if (!panel || !continueButton) return;
    if (record?.demoProfileInteracted) {setGuide(`${record.name || 'Plant'} information remains open for exploration.`);return;}
    introBoardStep=record?.tutorialStage==='plant2'?'ELEMENTS 1.13':'ELEMENTS 1.7';
    const plantName = record?.name || 'Plant';
    const title = demoLocalizedText('Explore this plant');
    const body = record?.tutorialStage==='plant'
        ? demoLocalizedText(`Open plant information cells to see how knowledge branches from the plant. When you find Pruning, it can connect with an idea about the wider landscape. Continue whenever you are ready.`)
        : demoLocalizedText(`This connected view brings together what is known about ${plantName}. Open any cell to follow a topic such as food, growing, uses or ecological roles.`);
    panel.innerHTML = `<small>${demoIntroLabel()}</small><h2>${title}</h2><div class="tryit-board-text-window"><p>${body}</p></div>`;
    setIntroBoardNextGuide('Press and hold the Orb to move it. While holding it, move the right joystick to bring it closer or further away. Press a cell once to expand plant information.');
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
    rememberDemoSlide({stepLabel:introBoardStep,title,body,buttonLabel:'Continue',onContinue:()=>continueAfterDemoPim(record),options:{tutorialStep:DEMO_TUTORIAL_STEPS.PIM,nextGuide:'Press and hold the Orb to move it. While holding it, move the right joystick to bring it closer or further away. Press a cell once to expand plant information.'},kind:'welcome'});
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
    if(action==='PathClose'){infoPanel?.setPathwayContext(null);clearLimSelection();return;}
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
    introBoardStep=`LEARNING 2.${learningModuleStep+1}`;
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
    if(action.startsWith('Connection:')){startNativeConnectionExperience(action.slice('Connection:'.length));return;}
    if(action==='end'){endLearningModule();return;}
    if(arWelcomeIntroPending)return;
    const module=LEARNING_MODULES[action];if(!module)return;
    infoPanel?.setPathwayContext(null);learningModule=module;learningModuleStep=0;paintLearningModuleBoard();
}
function activateLimCell(key) {
    const node=limNodeByKey(key);if(!node)return false;
    if(nativeConnectionState && (node.limId || node.label)===nativeConnectionState.targetId && nativeConnectionState.phase==='target'){
        acceptNativeLimCell(key);return true;
    }
    appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-intro-pending');
    selectedLimCell=key;
    const content=limLearningContent(node.limId || node.label);
    try{meshComposition.setActiveRef(limMeshRef(content.id));}catch{meshComposition.setActiveRef(null);}
    // A selected cell becomes a doorway to its own descendants. Other
    // archetypes remain quiet until the visitor chooses to open them.
    if(!limExpandedCells.has(content.id))limExpandedAt.set(content.id,arWelcomeClock.elapsed);
    limExpandedCells.add(content.id);
    infoPanel?.showLearning({...content,mesh:'lim'});
    if(nativeConnectionState && nativeConnectionState.phase!=='connected')nativeConnectionPanelGuide();
    infoPanel?.suspend(false);
    infoPanel?.setCompact(false);
    if(content.sketchImage || content.image)infoPanel?.setMediaCollapsed(false);
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
function currentLimPointerTarget() {
    if(!arWelcomeShowcaseActive || !limMeshVisible || !introWorldAnchor)return null;
    const hit=welcomeSurfaceHit(introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition),AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080);
    const node=hit && welcomeCellAtPoint(welcomeFrames(),hit.pixelX,hit.pixelY);
    return node ? {kind:'lim-cell',id:node.key,distance:hit.distance,node,target:hit} : null;
}
function currentLimPointerCell(){return currentLimPointerTarget()?.node || null;}
function resolveDemoCellTarget(){
    const panel=infoPanel?.hit(latestControllerRay);
    return nearestDemoXrTarget([
        panel ? {kind:'panel',id:panel.card?.id || 'control-panel',distance:panel.distance,target:panel} : null,
        demoInfoTarget(),
        currentLimPointerTarget()
    ]);
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
            if(limActivation.consumeSyntheticClick(key,performance.now()))return;
            // Pointer clicks are generated even after an early release; only
            // a completed hold selects a cell. Assistive clicks stay usable.
            if(event.detail===0)limActivation.activateNow(key,performance.now(),'assistive-click');
        };
        const holdStart=event=>{
            event.preventDefault();event.stopPropagation();limPointerKey=key;nativeLimHoldPointer=event.pointerId;
            button.setPointerCapture?.(event.pointerId);limActivation.start(key,performance.now(),'pointer-hold');startLimActivationFrame();
        };
        const holdEnd=event=>{
            if(nativeLimHoldPointer!==event.pointerId)return;
            event.preventDefault();event.stopPropagation();limActivation.end(key,performance.now());nativeLimHoldPointer=null;limPointerKey='';
        };
        const holdCancel=event=>{if(nativeLimHoldPointer!==event.pointerId)return;limActivation.cancel('pointer-cancel');nativeLimHoldPointer=null;limPointerKey='';};
        for(const [type,handler] of [['pointerenter',point],['focus',point],['pointerleave',unpoint],['blur',unpoint],['pointerdown',holdStart],['pointerup',holdEnd],['pointercancel',holdCancel],['keydown',keyDown],['keyup',keyUp],['click',click]]){button.addEventListener(type,handler);cleanups.push(()=>button.removeEventListener(type,handler));}
    });
    limInteractionCleanup=()=>{cleanups.splice(0).forEach(remove=>remove());limActivation?.cancel('unmount');limCancelFrame(limActivationFrame);limActivationFrame=0;limPointerKey='';limPointerId=null;};
}

function bindLimSessionInteractions(arSession) {
    if(!arSession || !limActivation)return;
    const selectStart=event=>{
        if(demoExitLifecycle.state!==DEMO_EXIT_STATES.IDLE){event.stopImmediatePropagation?.();return;}
        if(!['screen','tracked-pointer'].includes(event.inputSource?.targetRayMode))return;
        captureDemoInputEventRay(event);
        const resolved=resolveDemoCellTarget();if(resolved?.kind!=='lim-cell')return;const node=resolved.node;
        limInputSuppressSource=null;limInputSource=event.inputSource;limActivation.start(node.key,performance.now(),'xr-hold');startLimActivationFrame();
        event.preventDefault?.();event.stopImmediatePropagation?.();
    };
    const selectEnd=event=>{
        if(demoExitLifecycle.state!==DEMO_EXIT_STATES.IDLE){event.stopImmediatePropagation?.();return;}
        if(event.inputSource!==limInputSource)return;
        captureDemoInputEventRay(event);
        const heldKey=limActivation.activeKey;
        if(heldKey && currentLimPointerCell()?.key===heldKey)limActivation.end(heldKey,performance.now());
        else limActivation.cancel('pointer-left');
        limInputSuppressSource=limInputSource;limInputSource=null;limActivationSessionSuppressUntil=performance.now()+450;
        event.preventDefault?.();event.stopImmediatePropagation?.();
    };
    const select=event=>{
        if(demoExitLifecycle.state!==DEMO_EXIT_STATES.IDLE){event.stopImmediatePropagation?.();return;}
        if(!arWelcomeShowcaseActive || !['screen','tracked-pointer'].includes(event.inputSource?.targetRayMode))return;
        captureDemoInputEventRay(event);
        const resolved=resolveDemoCellTarget(),node=resolved?.kind==='lim-cell'?resolved.node:null;
        if(node || event.inputSource===limInputSource || event.inputSource===limInputSuppressSource && performance.now()<limActivationSessionSuppressUntil){event.preventDefault?.();event.stopImmediatePropagation?.();if(node)limActivation.consumeSyntheticClick(node.key,performance.now());return;}
    };
    const visibility=()=>{if(arSession.visibilityState==='hidden'){limActivation.cancel('session-hidden');limInputSource=null;cancelDemoInteractionState('session-hidden');}};
    arSession.addEventListener('selectstart',selectStart,true);arSession.addEventListener('selectend',selectEnd,true);arSession.addEventListener('select',select,true);arSession.addEventListener('visibilitychange',visibility);
    limSessionCleanup=()=>{arSession.removeEventListener('selectstart',selectStart,true);arSession.removeEventListener('selectend',selectEnd,true);arSession.removeEventListener('select',select,true);arSession.removeEventListener('visibilitychange',visibility);limInputSource=null;limInputSuppressSource=null;};
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
            drawRoots:arWelcomeSharedBoard && introBoardVisible,
            rootMilestone:arWelcomeRootMilestone,rootMilestoneStartedAt:arWelcomeRootMilestoneStartedAt,
            drawContent:drawIntroNoteContent,progression:{cellsActivatedAt:limMeshActivatedAt,expandedLimIds:[...limExpandedCells],expandedAt:Object.fromEntries(limExpandedAt)},
            drawCellLabels:true,cellOpacity:demoCellOpacity,selectedKey:selectedLimCell,hoverKey:contextCellKey,pathwayKey:limPathwayState.status==='active'?(currentPathwayNode()?.key || ''):'',holdKey:limActivation?.activeKey,holdProgress:limActivation?.progress || 0,connectedKey:nativeConnectionState?.phase==='connected'?nativeConnectionTargetKey():''
        });
    arWelcomeRenderedFrames=frames;
    context.restore();
    const selectedNode=frames.flatMap(frame=>frame.nodes).find(node=>node.key===selectedLimCell);
    const relationship=welcomeRelationshipFor(selectedNode?.limId);
    const linkedIds=new Set(relationship?.ids || []);
    for(const frame of frames)for(const node of frame.nodes){
        const button=arWelcomeLayer.querySelector(`[data-welcome-cell="${node.key}"]`);
        if(button){
            const pathwayCurrent=(node.limId || node.label)===currentPathwayCellId() && ['active','paused'].includes(limPathwayState.status);
            button.hidden=!limMeshVisible || node.opacity<=.01;
            button.style.opacity=String(node.opacity*demoCellOpacity);
            button.style.pointerEvents=demoCellOpacity>0 && node.opacity>=.85?'':'none';
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
    ambientBeeModel?.draw(arWelcomeClock.elapsed,ambientBeesStartedAt,reducedMotion,{attention:'control'});
    ambientCanvas.style.visibility=ambientBeeModel?.ready?'hidden':'visible';
    if(ambientBeeModel?.ready)return;
    const width=window.innerWidth,height=window.innerHeight,ratio=Math.min(window.devicePixelRatio||1,1.5);
    if(ambientCanvas.width!==Math.round(width*ratio))ambientCanvas.width=Math.round(width*ratio);
    if(ambientCanvas.height!==Math.round(height*ratio))ambientCanvas.height=Math.round(height*ratio);
    const context=ambientCanvas.getContext('2d');
    context.setTransform(ratio,0,0,ratio,0,0);
    drawDemoAmbientLife(context,width,height,{elapsed:arWelcomeClock.elapsed,beesStartedAt:ambientBeesStartedAt,reducedMotion,attention:'control'});
}

function paintSimulatedRainV2(now){
    if(!rainV2Canvas || now-rainV2LastPaint<33)return;
    rainV2LastPaint=now;
    const width=window.innerWidth,height=window.innerHeight,ratio=Math.min(window.devicePixelRatio||1,1.5);
    if(rainV2Canvas.width!==Math.round(width*ratio))rainV2Canvas.width=Math.round(width*ratio);
    if(rainV2Canvas.height!==Math.round(height*ratio))rainV2Canvas.height=Math.round(height*ratio);
    const context=rainV2Canvas.getContext('2d');
    if(!context)return;
    context.setTransform(ratio,0,0,ratio,0,0);
    context.clearRect(0,0,width,height);
    if(demoRainStyle!=='v2' || demoRainIntensity<=0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const progress=demoRainProgress(arWelcomeClock.elapsed)*demoRainIntensity;
    if(progress<=0)return;
    paintDemoRainV2Preview(context,width,height,demoRainV2Field(now,progress,{mobile:navigator.maxTouchPoints>0}));
}

function showArWelcomeShowcase() {
    demoSlideHistory=[];demoSlideHistoryIndex=-1;demoSlideHistoryReplay=false;
    infoPanel?.setHeaderProgress(null);
    selectedLimCell='';
    introBoardStep='INTRO 1.1';
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
        onStart:(_key,source)=>{if(source?.startsWith('xr'))pulseDemoHaptics(limInputSource);introBoardTextureDirty=true;},
        onCancel:()=>{introBoardTextureDirty=true;},
        onComplete:key=>{if(limInputSource)pulseDemoHaptics(limInputSource);activateLimCell(key);introBoardTextureDirty=true;}
    });
    // The XR session is created before the showcase controller. Bind the
    // session interactions here, once the controller exists, so tracked
    // pointer holds can reach the companion panel.
    bindLimSessionInteractions(session);
    arWelcomeShowcaseActive=true;arWelcomeIntroPending=true;arWelcomeSettleStage=false;arWelcomeSettleStartedAt=NaN;arWelcomeSharedBoard=true;
    syncDemoPanelActions();
    introSceneActive=true;introBoardVisible=true;introKnowledgeVisible=false;introBoardHasEntered=true;
    arWelcomeStartedAt=performance.now();introSceneStartedAt=arWelcomeStartedAt;introBoardTextureDirty=true;
    introBoardStep='INTRO 1.1';
    introBoardTitle=demoLocalizedText('Welcome to the NourishlandXR demo');
    introBoardBody=demoLocalizedText(DEMO_QUICK_ACCESS_COPY['INTRO 1.1']);
    introBoardVisibleBody='';
    limMeshVisible=false;
    infoPanel?.setLearningModules(null);
    infoPanel?.setCompact(true);
    infoPanel?.setIntroduction(false);
    infoPanel?.suspend(true);
    let openingParagraphs=introBoardBody.split('\n\n');
    panel.innerHTML=`<small>${demoIntroLabel()}</small><h2>${introBoardTitle}</h2><div class="tryit-board-text-window">${openingParagraphs.map(()=>'<p></p>').join('')}</div>`;
    prepareTutorialBoard(panel);
    setIntroBoardNextGuide('');
    panel.classList.add('is-copy-ready','is-persistent-demo-board','is-lim-shared-surface','is-opening-welcome','is-typing');
    panel.classList.remove('is-live-welcome-copy');
    panel.hidden=true;
    appRoot?.querySelector('.tryit-demo')?.setAttribute('data-lim-opening','true');
    appRoot?.querySelector('.tryit-demo')?.setAttribute('data-lim-surface','true');
    appRoot?.querySelector('.tryit-demo')?.setAttribute('data-intro-pending','true');
    clearTimeout(boardTypingTimer);clearTimeout(boardTypingWatchdogTimer);
    let openingParagraphIndex=0,openingTyping=false;
    const openingTextWindow=panel.querySelector('.tryit-board-text-window');
    const paintOpeningCopy=visibleText=>{
        const paragraphs=[...panel.querySelectorAll('.tryit-board-text-window p:not(.tryit-board-next)')];
        let start=0;
        openingParagraphs.forEach((paragraph,index)=>{
            const end=start+paragraph.length;
            if(paragraphs[index]){
                paragraphs[index].textContent=visibleText.slice(start,end);
                paragraphs[index].classList.toggle('is-current',visibleText.length>=start && visibleText.length<=end);
                paragraphs[index].classList.toggle('is-revealed',visibleText.length>=end);
            }
            start=end+2;
        });
    };
    const finishOpeningCopy=()=>{
        if(!openingTyping)return;
        openingTyping=false;clearTimeout(boardTypingTimer);clearTimeout(boardTypingWatchdogTimer);
        introBoardVisibleBody=introBoardBody;paintOpeningCopy(introBoardBody);introBoardTextureDirty=true;
        panel.classList.remove('is-typing');
    };
    const revealOpeningParagraph=()=>{
        if(!openingTyping || !arWelcomeShowcaseActive)return;
        openingParagraphIndex++;
        introBoardVisibleBody=openingParagraphs.slice(0,openingParagraphIndex).join('\n\n');paintOpeningCopy(introBoardVisibleBody);introBoardTextureDirty=true;
        if(openingParagraphIndex>=openingParagraphs.length){boardTypingTimer=setTimeout(finishOpeningCopy,800);return;}
        boardTypingTimer=setTimeout(revealOpeningParagraph,1350);
    };
    const beginOpeningCopy=()=>{
        if(!arWelcomeShowcaseActive)return;
        arWelcomeOpeningActive=false;arWelcomeSettleStage=true;arWelcomeSettleStartedAt=arWelcomeClock.elapsed;limMeshVisible=false;
        introBoardStep='INTRO 1.2';
        introBoardTitle=demoLocalizedText('EXTENDED REALITY, ROOTED IN PLACE');
        introBoardBody=demoLocalizedText(DEMO_QUICK_ACCESS_COPY['INTRO 1.2']);
        rememberDemoSlide({stepLabel:'INTRO 1.2',title:introBoardTitle,body:introBoardBody,buttonLabel:'Continue',onContinue:()=>runArWelcomeTutorial(0),kind:'welcome'});
        introBoardVisibleBody='';openingParagraphs=introBoardBody.split('\n\n');openingParagraphIndex=0;openingTyping=true;
        panel.querySelector('h2').textContent=introBoardTitle;
        panel.querySelector('small').textContent=demoIntroLabel();
        panel.querySelector('.tryit-board-text-window').innerHTML=openingParagraphs.map(()=>'<p></p>').join('');
        panel.hidden=false;introBoardVisible=true;introBoardTextureDirty=true;
        appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-lim-opening');
        syncDemoPanelActions();
        panel.classList.add('is-typing');paintOpeningCopy('');
        boardTypingTimer=setTimeout(revealOpeningParagraph,320);
    };
    rememberDemoSlide({stepLabel:'INTRO 1.1',title:introBoardTitle,body:introBoardBody,buttonLabel:'Continue',onContinue:beginOpeningCopy,kind:'welcome'});
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
    layer.innerHTML='<canvas width="2500" height="2100" role="img" aria-label="NourishlandXR introduction. Discover how plant knowledge becomes a mapped, understandable and connected place."></canvas><button type="button" class="tryit-welcome-more" data-welcome-more>Click for more</button>';
    arWelcomeCanvas=layer.querySelector('canvas');
    const welcomeMore=layer.querySelector('[data-welcome-more]');
    welcomeMore.hidden=!simulatedMode;
    welcomeMore.title='Click to open more about NourishlandXR.';
    welcomeMore.addEventListener('click',()=>{
        infoPanel?.setCompact(false);
        infoPanel?.restore();
        infoPanel?.showLearning({id:'ar-welcome-more',title:'Welcome to NourishlandXR',body:'Selected details and images open here. Use Settings to adjust the experience, Help for guidance, Back to revisit a page, or Hide for an unobstructed view.',image:new URL('../assets/living-knowledge-seed-atlas.png',import.meta.url).href,imageAlt:'Nourishland website hero knowledge wheel',accent:'#b7cbd0',mesh:'lim',editable:false});
        infoPanel?.setIntroduction(true);
        infoPanel?.setContextualHint('HINT · The image panel opens above this panel.');
        if(!Number.isFinite(ambientBeesStartedAt))ambientBeesStartedAt=arWelcomeClock.elapsed;
    });
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
        if(simulatedMode){paintDemoAmbientLife(now);paintSimulatedRainV2(now);}
        if(simulatedMode)syncNativeConnectionEffect(now);
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
        if(welcomeMore)welcomeMore.hidden=true;
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
    setGuide(DEMO_QUICK_ACCESS_COPY['INTRO 1.1']);
}

// Use the same billboard geometry for ray hits and texture drawing.
function welcomeSurfaceHit(position,scaleX,scaleY,width=2500,height=2100,panelOnly=false) {
    if(!introWorldAnchor)return null;
    const matrix=billboardMatrix(position,scaleX,scaleY,introWorldAnchor);
    const surface=demoBillboardSurfaceSize(scaleX,scaleY);
    const origin=demoPointerWorldOrigin(),direction=demoPointerWorldRay();
    if(!origin || !direction)return null;
    return demoWelcomeSurfaceHit({origin,direction},{center:position,
        right:{x:matrix[0]/scaleX,y:0,z:matrix[2]/scaleX},up:{x:0,y:1,z:0},
        normal:{x:matrix[8],y:0,z:matrix[10]},width:surface.width,height:surface.height},{width,height,panelOnly});
}

function selectWelcomeCell() {
    if(!arWelcomeShowcaseActive || !introWorldAnchor)return false;
    const hit=welcomeSurfaceHit(introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition),AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080);
    const cell=hit && welcomeCellAtPoint(welcomeFrames(),hit.pixelX,hit.pixelY);
    if(!cell)return false;
    limDiagnostic('hit-target',{cellId:cell.limId || cell.key,pixelX:hit?.pixelX ?? null,pixelY:hit?.pixelY ?? null});
    toggleLimCell(cell.key);return true;
}

function showDemoTutorialMedia(key,content={}) {
    const art=DEMO_TUTORIAL_ART[key];
    if(!art)return;
    const delayedIllustration=key==='totem' || key==='connectedAreas';
    infoPanel?.showLearning({id:`demo-tutorial-${key}`,title:'',hideTitle:true,imageFit:'contain',imageFadeMs:key==='references'?1400:850,imageTransitionDelayMs:delayedIllustration?220:0,discardPreviousImage:true,body:'',image:art.image,imageAlt:art.alt,accent:'#b7cbd0',mesh:'lim',editable:false,...content});
    infoPanel?.suspend(false);
}

const DEMO_ORIENTATION_STEPS = [
    {code:'SPACE 1.1',title:'Meet your Control panel',art:'wheel',button:'Continue',nextGuide:'',paragraphs:[
        'Take a moment to settle in. This place is ready to explore.'
    ]},
    {code:'ELEMENTS 1.1',title:'Every plant holds information',art:null,panelTitle:'Using the Control panel',button:'Continue',nextGuide:'',paragraphs:[
        'Finding a plant in the field can be confusing when you are carrying books, checking a phone and comparing guides. It can be hard to connect what you read to the plant in front of you.',
        'A plant can connect identity, ecology, care, seasonal change, uses, local knowledge and trusted sources.'
    ]},
    {code:'SPACE 1.2',title:'Imagine arriving in a garden',art:'curiosity',panelTitle:'Using the Control panel',button:'Continue',nextGuide:'',paragraphs:[
        'Imagine arriving in a garden and noticing a plant you do not recognise.',
        'You pause, look closely and wonder what it is, how it belongs here and what it might teach you.'
    ]},
    {code:'SPACE 1.3',title:'A Project holds information',art:'area',panelTitle:'Using the Control panel',button:'Continue',nextGuide:'',paragraphs:[
        'Create a Project anchored to a real place: tag an orchard, build an educational module, or make an immersive tour. Its Areas, plants, observations and guidance stay connected to that landscape.'
    ]},
    {code:'ELEMENTS 1.2',title:'Areas and Totems guide you',art:'structure',panelTitle:'Using the Control panel',button:'Continue',nextGuide:'',paragraphs:[
        'Areas organise one part of a place. Directional Totem signs point visitors toward nearby Plant Orbs, Notes and other Totems, while keeping each Area’s information together.'
    ]},
    {code:'ELEMENTS 1.3',title:'Begin with one plant',panelTitle:'Placement controls',button:'Place Pigeon Pea',nextGuide:'Aim toward the plant or tag location. Hint: use the right joystick up or down to adjust distance.',paragraphs:[
        'A Plant Orb attaches information to a real-world location. Pigeon Pea is our example: aim toward the plant or the exact place where you want its tag to appear.'
    ]}
];

const POST_PLACEMENT_AREA_STEP = {
    title:'This is the Plant Orb',button:'Continue',
    nextGuide:'Press the Plant Orb to open its information. Press and hold it to move it.',
    paragraphs:[
        'Pigeon Pea now has a location in this scene. This Plant Orb connects information to this plant in the real place.',
        'The Orb is interactive. Press it to explore its information, beginning with simple facts and deeper connected branches.'
    ]
};

function runArWelcomeTutorial(index=0) {
    demoOrientationStep=index;
    if(index<=2)setDemoJourneyStage('why');
    else setDemoJourneyStage('map');
    limMeshVisible=false;
    introBoardTextureDirty=true;
    syncDemoPanelActions();
    infoPanel?.setGuided(index>=1);
    const step=DEMO_ORIENTATION_STEPS[index];
    if(index===0){
        if(!Number.isFinite(ambientBeesStartedAt))ambientBeesStartedAt=arWelcomeClock.elapsed;
        infoPanel?.setCompact(true);
        infoPanel?.setMediaCollapsed(true);
        infoPanel?.setIntroduction(true);
        infoPanel?.suspend(false);
        infoPanel?.setContextualHint('HINT · Adjust panel to your liking.');
    }
    if(step?.art){
        infoPanel?.setCompact(false);
        if(index!==1)showDemoTutorialMedia(step.art,index===0?{title:'Your Control panel',hideTitle:false,body:'Selected information appears here. Use Settings to adjust the view, Help for guidance, Back to revisit a page, and Hide when you want to focus on the landscape.'}:index===3?{title:'Build a Project',hideTitle:false,body:'Start with an Area, add a Totem for orientation, then place Plant Orbs and Notes. In a full Project, you can publish a guide and keep its information current.'}:{});
    }else if(step.code==='ELEMENTS 1.1'){
        infoPanel?.setMediaCollapsed(true);
    }else if(index===DEMO_ORIENTATION_STEPS.length-1){
        infoPanel?.setMediaCollapsed(true);
        infoPanel?.setContextualHint('HINT · Move the right joystick up or down to adjust distance.');
    }
    showIntroBoard(step.title,step.paragraphs,step.button,()=>{
        if(demoOrientationStep!==index)return;
        suppressSessionSelectUntil=performance.now()+700;
        if(index===0)infoPanel?.setIntroduction(false);
        if(index<DEMO_ORIENTATION_STEPS.length-1){runArWelcomeTutorial(index+1);return;}
        appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-intro-pending');
        demoOrientationStep=-1;syncDemoPanelActions();finishIntroBoard();clearTimeout(aimRevealTimer);armDemoPlacement('plant',{explained:true});
    },{tutorialStep:DEMO_TUTORIAL_STEPS.WELCOME,stepLabel:step.code,nextGuide:step.nextGuide,deferContinueUntilCopyReady:index===0,onTextComplete:index===1 && step.art?()=>setTimeout(()=>{if(demoOrientationStep===1)showDemoTutorialMedia(step.art);},900):undefined});
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
        infoPanel?.setContextualHint(`Select the ${plantName} Plant Orb to open its Plant Profile. Press and hold it to move it.`);
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
        {stepLabel:moringa?'ELEMENTS 1.12':'ELEMENTS 1.6',nextGuide:afterPlacement.nextGuide,deferContinueUntilCopyReady:!moringa}
    );
    // The sample plant is interactive while the large instruction board is
    // still visible, so the suggested grab can be tried immediately.
    completeConversion();
}

function showSceneContinue(label, onContinue, stepLabel) {
    const sceneCopy={
        'ELEMENTS 1.19':['Area 1 is ready','Its Totem holds the welcome for this Area. Select a sign to find a nearby plant or Note.'],
        'ELEMENTS 1.20':['Meet the neighbouring Area','Totem 2 shows a sample layout with its own Plant Orbs and Note. Each belongs to this Area.'],
        'ELEMENTS 1.21':['The Areas are connected','Each Totem still holds its own local information. The link provides a route between them.']
    }[stepLabel];
    if(!sceneCopy)return;
    showIntroBoard(sceneCopy[0],sceneCopy[1],label,onContinue,{stepLabel});
}

function cycleDemoNoteTemplate(record) {
    if (!record || record.demoType !== 'note') return false;
    infoPanel?.showLearning({id:'demo-note-guidance',title:'Location Note',body:'In a full Project, you can edit this Note or create your own. Notes can hold observations, instructions and other place-based knowledge.',accent:'#dcef95',mesh:'lim',editable:false});
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
        'Thank you for exploring NourishlandXR',
        [
            'You mapped two plants, opened their information, connected a fact with purpose, recorded an observation and linked two Areas.',
            'The result is more than a digital plant label. It is a living information map that can be entered simply and explored in depth.',
            'NourishlandXR can support school grounds, botanical gardens, parks, community gardens, farms, forests and small home projects through the same connected system.'
        ],
        'Finish demo',
        returnToWelcome,
        {stepLabel:'CLOSURE 1.1'}
    );
}

function pairedDemoTotemPosition(side, groundBaseY) {
    const anchor=introWorldAnchor || introWorldAnchorFromViewer(viewerMatrix);
    const center=anchor ? introLocalPosition(anchor,AR_PHONE_COMFORT.boardPosition) : {x:0,z:-1.9};
    const right={x:Number(anchor?.[0]) || 1,z:Number(anchor?.[2]) || 0};
    return {
        x:center.x+right.x*side,
        y:groundBaseY+DEMO_TOTEM_HALF_HEIGHT_METRES,
        z:center.z+right.z*side
    };
}
function pairedDemoTotemGroundY() {
    if(isDemoFloorHit(hitMatrix,viewerMatrix))return Number(hitMatrix[13]);
    const cameraY=Number(viewerMatrix?.[13]);
    if(Number.isFinite(cameraY) && cameraY>=1.3)return demoGroundBaseY(null,viewerMatrix,groundYEstimate);
    const anchor=introWorldAnchor || introWorldAnchorFromViewer(viewerMatrix);
    const center=anchor ? introLocalPosition(anchor,AR_PHONE_COMFORT.boardPosition) : null;
    return center ? center.y-AR_PHONE_COMFORT.boardScale[1]*.16*2100/1080/2 : demoGroundBaseY(null,viewerMatrix,groundYEstimate);
}

function createDemoTotemExample() {
    const groundBaseY = pairedDemoTotemGroundY();
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
        id:DEMO_RECORD_IDS.botanicalGarden,
        position,
        rotationY: demoTotemRotationForPosition(position),
        groundBaseY,
        type: 'area_checkpoint',
        demoType: 'zone',
        tutorialStage: 'totem',
        demoTotemExampleId:'botanical-garden',
        demoZoneName:'Botanical Garden',
        demoNeighbourZoneName:'Rainforest Walk',
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
    markers.filter(record=>['plant','note'].includes(record.demoType) && !record.demoAmbientNeighbour).forEach(record=>{record.demoAreaId=totem.id;});
    advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.firstAreaShown);
    updateSimulatedMarkers();
    showDemoTutorialMedia('totem');
    setGuide('The Totem welcomes you to this area. Open its short signs to find Notes, Plant Orbs and the neighbouring Totem.');
    showSceneContinue('Show neighbouring Totem', createDemoSecondTotem, 'ELEMENTS 1.19');
}

function createDemoSecondTotem() {
    const first = [...markers].reverse().find(record => record.demoType === 'zone');
    const groundBaseY = first?.groundBaseY ?? demoGroundBaseY(hitMatrix, viewerMatrix, groundYEstimate);
    groundYEstimate = groundBaseY;
    const position = first?.demoPairRight
        ? {x:first.position.x-first.demoPairRight.x*2,y:groundBaseY+DEMO_TOTEM_HALF_HEIGHT_METRES,z:first.position.z-first.demoPairRight.z*2}
        : pairedDemoTotemPosition(-1,groundBaseY);
    const totem = {
        ...createMinimalMarkerDraft('area_checkpoint', {
            name: 'Totem',
            description: 'Welcome to this area.'
        }),
        id:DEMO_RECORD_IDS.rainforestWalk,
        position,
        rotationY: demoTotemRotationForPosition(position),
        groundBaseY,
        type: 'area_checkpoint',
        demoType: 'zone',
        tutorialStage: 'totem2',
        demoTotemExampleId:'rainforest-walk',
        demoZoneName:'Rainforest Walk',
        demoNeighbourZoneName:'Botanical Garden',
        demoTotemColor:'#526d7a',
        demoTotemSignsVisible:false,
        demoTotemFaded:false,
        demoArriveAt:performance.now(),
        demoLinkVisible: false,
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
    setGuide('Totem 2 shows a sample PIMO layout: local Plant Orbs and a Note placed around one Area. Connect the two Totems when ready.');
    showSceneContinue('Connect the Totems', connectDemoTotems, 'ELEMENTS 1.20');
}

function connectDemoTotems() {
    const [first,second]=markers.filter(record=>record.demoType==='zone');
    if(!first || !second)return;
    first.demoLinkVisible=second.demoLinkVisible=true;
    first.demoLinkPartner=second.id;
    second.demoLinkPartner=first.id;
    first.totemCardsRefreshed=second.totemCardsRefreshed=0;
    updateSimulatedMarkers();
    advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.areasConnected);
    setGuide('The Areas are linked. Each Totem still keeps its own local plants and Notes.');
    showSceneContinue('Why link Areas?',showLinkedTotemsIntroduction, 'ELEMENTS 1.21');
}

function createDemoNeighbourhood(totem) {
    const right={x:Number(viewerMatrix?.[0]) || 1,z:Number(viewerMatrix?.[2]) || 0};
    const neighbours=[
        {plantId:'vetiver',id:DEMO_RECORD_IDS.vetiver,name:'Vetiver grass',dx:-.48,dy:.72,anchor:{x:8,y:48},color:'vetiver'},
        {plantId:'acacia',id:DEMO_RECORD_IDS.acacia,name:'Acacia sp.',dx:.30,dy:1.17,anchor:{x:39,y:46},color:'acacia'},
        {plantId:'jackfruit',id:DEMO_RECORD_IDS.jackfruit,name:'Jackfruit',dx:-.61,dy:.55,anchor:{x:9,y:68},color:'jackfruit'},
        {plantId:'lychee',id:DEMO_RECORD_IDS.lychee,name:'Lychee',dx:.49,dy:.71,anchor:{x:40,y:67},color:'lychee'}
    ];
    if(neighbours.map(item=>item.plantId).join('|')!==DEMO_NEIGHBOUR_PLANT_IDS.join('|'))throw new Error('Totem 2 plant set is out of sync.');
    for(const neighbour of neighbours){
        const profile={common_name:neighbour.name,pim:demoNeighbourPim(neighbour.plantId)};
        markers.push({
            ...createMinimalMarkerDraft('plant',{name:neighbour.name}),
            id:neighbour.id,name:neighbour.name,demoType:'plant',demoAreaId:totem.id,demoAmbientNeighbour:true,demoAlive:true,demoInteractive:true,
            demoKnowledgeProfile:profile,demoKnowledgeProjection:pimToArKnowledge(profile.pim),
            demoOrbColor:neighbour.color,demoOrbShape:'orb',demoExpanded:false,demoArriveAt:performance.now(),
            position:{x:totem.position.x+right.x*neighbour.dx,y:totem.groundBaseY+neighbour.dy,z:totem.position.z+right.z*neighbour.dx},
            simulatedAnchor:neighbour.anchor
        });
    }
    const note={...createMinimalMarkerDraft('note',{name:'Vetiver row'}),id:DEMO_RECORD_IDS.rainforestNote,name:'Vetiver row',demoType:'note',demoAreaId:totem.id,demoAmbientNeighbour:true,
        demoInteractive:false,demoExpanded:true,demoArriveAt:performance.now(),simulatedAnchor:{x:16,y:83},
        position:{x:totem.position.x-right.x*.45,y:totem.groundBaseY+.42,z:totem.position.z-right.z*.45},
        demoContent:{title:'NOTE · Vetiver row',accent:'#d4bd83',lines:['OBSERVATION  Vetiver marks a living edge.']},revealLines:1};
    note.texture=createMarkerTexture(note);
    markers.push(note);
}

function showLinkedTotemsIntroduction() {
    showDemoTutorialMedia('connectedAreas');
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
        showLimoLearningModes,
        {stepLabel:'ELEMENTS 1.22'}
    );
}

function fadeMappedSceneForLimo() {
    markers.forEach(record=>{
        record.demoHiddenForLimo=true;
        if(record.demoType==='plant')record.demoExpanded=false;
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

function restoreMappedSceneAfterLimo(){
    markers.forEach(record=>{record.demoHiddenForLimo=false;if(record.demoType==='zone' || record.demoType==='note'){record.demoNarrativeFaded=false;record.demoInteractive=true;}if(record.demoType==='zone')record.demoTotemFaded=false;});
    updateSimulatedMarkers();
}

function prepareStableLimoSurface() {
    activePimLimBridge=null;
    for(const record of markers){
        if(record.demoType!=='plant' || record.demoAmbientNeighbour)continue;
        record.demoInteractive=true;
        record.demoAlive=true;
    }
    clearLimSelection();
}

function nativeConnectionPlant() {
    return markers.find(record=>record.demoType==='plant' && record.demoPlantPreset==='pigeon-pea' && !record.demoAmbientNeighbour)
        || markers.find(record=>record.demoType==='plant' && /pigeon pea/i.test(record.name || '') && !record.demoAmbientNeighbour);
}

function nativeConnectionTargetKey() {
    if(!nativeConnectionState)return '';
    nativeConnectionState.targetKey ||= welcomeFrames().flatMap(frame=>frame.nodes).find(node=>node.limId===nativeConnectionState.targetId)?.key || '';
    return nativeConnectionState.targetKey;
}

function clearNativeConnectionHold() {
    nativeLimHoldPointer=null;
    limActivation?.cancel('connection-reset');
}

function removeNativeConnectionEffect() {
    nativeConnectionEffect?.remove();nativeConnectionEffect=null;nativeConnectionEffectLastAt=0;
}

function syncNativeConnectionEffect(now=performance.now()) {
    const state=nativeConnectionState,stage=appRoot?.querySelector('.tryit-stage');
    if(!simulatedMode || !state || state.phase==='source' || !stage)return;
    if(now-nativeConnectionEffectLastAt<45)return;
    nativeConnectionEffectLastAt=now;
    if(!nativeConnectionEffect){
        nativeConnectionEffect=document.createElementNS('http://www.w3.org/2000/svg','svg');
        nativeConnectionEffect.classList.add('native-mesh-connection');
        nativeConnectionEffect.innerHTML='<path></path><circle r="5"></circle>';
        stage.append(nativeConnectionEffect);
    }
    const plant=nativeConnectionPlant(),index=markers.indexOf(plant),source=stage.querySelector(`[data-demo-plant-profile="${index}"] [data-pim-node="${state.sourcePath}"]`);
    const target=arWelcomeLayer?.querySelector(`[data-welcome-cell="${nativeConnectionTargetKey()}"]`);
    if(!source || !target || target.hidden){nativeConnectionEffect.hidden=true;return;}
    const box=stage.getBoundingClientRect(),a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
    if(!box.width || !box.height){nativeConnectionEffect.hidden=true;return;}
    const x1=a.left+a.width/2-box.left,y1=a.top+a.height/2-box.top,x2=b.left+b.width/2-box.left,y2=b.top+b.height/2-box.top;
    nativeConnectionEffect.hidden=false;
    nativeConnectionEffect.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    nativeConnectionEffect.querySelector('path').setAttribute('d',`M ${x1} ${y1} L ${x2} ${y2}`);
    const t=window.matchMedia('(prefers-reduced-motion: reduce)').matches ? .5 : (now/1550)%1;
    const pulse=nativeConnectionEffect.querySelector('circle');pulse.setAttribute('cx',String(x1+(x2-x1)*t));pulse.setAttribute('cy',String(y1+(y2-y1)*t));
    nativeConnectionEffect.classList.toggle('is-connected',state.phase==='connected');
}

function nativeConnectionPanelGuide() {
    const state=nativeConnectionState;if(!state)return;
    const body=state.phase==='source'
        ? `1. Select Pigeon Pea’s ${state.sourceTitle} cell. 2. Direct the connection toward LIMO’s ${state.targetTitle} cell. 3. Hold ${state.targetTitle} to connect them.`
        : state.phase==='target'
        ? `The ${state.sourceTitle} cell is selected. Aim at LIMO’s ${state.targetTitle} cell and hold until its progress ring completes. Release early to cancel and try again.`
        : state.phase==='resolving'
        ? `Connecting ${state.sourceTitle} with ${state.targetTitle}…`
        : `${state.sourceTitle} is connected with ${state.targetTitle}. The highlighted cells share one relationship.`;
    const connectionText=`${state.explanation}\n\nIn this place: ${state.fieldQuestion}`;
    const targetMedia=limLearningContent(state.targetId);
    infoPanel?.showLearning({id:'native-mesh-connection',title:`${state.sourceTitle} ↔ ${state.targetTitle}`,body:state.error?`${state.error} ${body}\n\n${connectionText}`:`${body}\n\n${connectionText}`,image:targetMedia.image,imageAlt:targetMedia.imageAlt,accent:'#dfff9b',mesh:'lim',editable:false});
    infoPanel?.suspend(false);
}

function showNativeConnectionIntroduction() {
    const plant=nativeConnectionPlant();
    if(plant){
        plant.demoHiddenForLimo=false;
        plant.demoExpanded=false;
        setDemoPimState(plant,pimCreateInteractionState([], '', plant.id || plant.name || ''));
        plant.demoActiveBranch='';
        toggleDemoPlantProfile(plant);
        updateSimulatedMarkers();
    }
    showIntroBoard('Connect plant knowledge to learning',
        ['Pigeon Pea and the learning mesh are available together. Their existing cells can form one connection.'],
        'Connect real cells',startNativeConnectionExperience,
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'LEARNING 1.8',nextGuide:'Continue to use the live Plant and Learning cells.'});
    infoPanel?.setLearningModules({title:'Choose a cell connection',
        body:'Three authored Pigeon Pea examples connect an existing Plant cell with an existing Learning cell. Choose one to try. The Control panel will explain that relationship and offer a question to check against the real place.',
        actions:DEMO_NATIVE_CONNECTION_EXAMPLES.map(example=>({id:`Connection:${example.id}`,label:example.label}))},{open:true});
}

function startNativeConnectionExperience(exampleId=DEMO_NATIVE_CONNECTION_EXAMPLES[0].id) {
    const plant=nativeConnectionPlant();
    if(!plant){setGuide('Pigeon Pea is unavailable. Return to its Plant Orb and try again.');return;}
    let spec;
    try{spec=demoNativeConnectionSpec(demoOrbKnowledge(plant).document,LIM_CELL_BY_ID,exampleId);}catch(error){setGuide(error.message);return;}
    const targetLineage=demoNativeTargetLineage(welcomeFrames(),spec.targetId);
    if(!targetLineage){setGuide('The learning target is unavailable. Return to the pathway and try again.');return;}
    clearNativeConnectionHold();
    nativeConnectionState=createDemoNativeConnection(spec);
    infoPanel?.setLearningModules(null);
    nativeConnectionState.targetKey=targetLineage.key;
    removeNativeConnectionEffect();
    meshComposition.clear();
    prepareStableLimoSurface();
    if(!plant.demoExpanded)toggleDemoPlantProfile(plant);
    limMeshVisible=true;
    limMeshActivatedAt=arWelcomeClock.elapsed-AR_WELCOME_SETTLED_MS;
    for(const id of targetLineage.ancestors){limExpandedCells.add(id);limExpandedAt.set(id,arWelcomeClock.elapsed-8000);}
    limHiddenCells.delete(targetLineage.key);
    useSharedWelcomeBoard(true);
    showIntroBoard('Connect a plant cell to a learning cell.',
        [`Select Pigeon Pea’s ${nativeConnectionState.sourceTitle} cell in the open Plant Profile. A click or trigger press selects it.`],
        '',()=>{},
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'LEARNING 1.9',nextGuide:`Select ${nativeConnectionState.sourceTitle} in Pigeon Pea to continue.`});
    nativeConnectionPanelGuide();
    introBoardTextureDirty=true;
}

function acceptNativePimCell(record,path) {
    const state=nativeConnectionState;
    if(record!==nativeConnectionPlant() || !acceptDemoNativeSource(state,path))return false;
    record.demoSelectedNodeId=state.sourcePath;
    refreshDemoPimProfile(record);
    showIntroBoard('Connect a plant cell to a learning cell.',
        [`Now select LIMO’s ${state.targetTitle} cell. A trigger press or short hold completes the connection.`],
        '',()=>{},
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'LEARNING 1.10',nextGuide:`Select ${state.targetTitle} in LIMO to continue.`});
    nativeConnectionPanelGuide();
    navigator.vibrate?.(12);
    return true;
}

async function acceptNativeLimCell(key) {
    const state=nativeConnectionState,node=limNodeByKey(key),content=node && limLearningContent(node.limId || node.label);
    if(!beginDemoNativeTarget(state,content?.id))return false;
    selectedLimCell=key;
    nativeConnectionPanelGuide();
    introBoardTextureDirty=true;
    const plant=nativeConnectionPlant(),document=plant && demoOrbKnowledge(plant).document;
    try{
        if(!document)throw new Error('Pigeon Pea information is unavailable.');
        const ownerId=demoMeshOwnerId(plant,document);
        meshSourceResolver.registerPimDocument(document,{ownerId});
        const source=pimMeshRef(document,state.sourceId,{ownerId,specimenId:String(plant.id || ownerId)});
        const target=limMeshRef(state.targetId);
        meshComposition.clear();meshComposition.add(source);meshComposition.add(target);meshComposition.resolving();
        const result=await meshRelationships.resolve([source,target]);
        if(nativeConnectionState!==state)return false;
        if(!finishDemoNativeConnection(state,result))return false;
        meshComposition.display(result);
        refreshDemoPimProfile(plant);
        showIntroBoard('Plant information connects with learning',
            [`You connected Pigeon Pea’s ${state.sourceTitle} cell with the ${state.targetTitle} learning cell. Their information now has a relationship you can follow in this place.`],
            'Continue',showAudienceValue,
            {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'LEARNING 1.11',nextGuide:'The two highlighted cells remain connected while you continue.'});
        nativeConnectionPanelGuide();
        introBoardTextureDirty=true;
        navigator.vibrate?.([18,35,24]);
        return true;
    }catch(error){
        if(nativeConnectionState!==state)return false;
        meshComposition.fail(error);
        retryDemoNativeTarget(state,'The cells did not connect.');
        nativeConnectionPanelGuide();
        setGuide('Hold the learning cell again to retry.');
        return false;
    }
}

function showLimoLearningModes() {
    setDemoJourneyStage('apply');
    prepareStableLimoSurface();
    fadeMappedSceneForLimo();
    showDemoTutorialMedia('connection');
    showIntroBoard(
        'Learn here or as a standalone experience',
        [
            'A learning pathway can guide someone on the spot in AR, where questions and actions stay connected to the living place in front of them.',
            'The same pathway can also work as a standalone learning experience before a visit, in a classroom or when reflecting afterwards.',
            'A Plant Profile explains the plant. Connecting that knowledge to learning turns facts into pathways: what to notice, how the plant relates to its place, why it matters and what someone could try next.'
        ],
        'Show pathway archetypes',
        showLimoArchetypes,
        {stepLabel:'LEARNING 1.6',nextGuide:'Open the pathway archetypes, then select one to explore its questions.'}
    );
}

function showLimoArchetypes() {
    prepareStableLimoSurface();
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
        showNativeConnectionIntroduction,
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'LEARNING 1.7',nextGuide:'Select an archetype to explore its connected learning cells.'}
    );
    setGuide('Select a pathway archetype to explore its connected learning cells.');
    syncDemoPanelActions();
}

function showAudienceValue() {
    clearNativeConnectionHold();nativeConnectionState=null;removeNativeConnectionEffect();
    restoreMappedSceneAfterLimo();
    setDemoJourneyStage('impact');
    showIntroBoard(
        'One place, different reasons to care',
        [
            'On a first visit, the map answers immediate questions: What is this? Why is it here? What can I notice or do next?',
            'For a school, the same place becomes a learning environment where students can observe, compare, record and return over time.',
            'For a garden, park or land steward, published knowledge, visitor guidance and local observations remain organised around the real landscape.'
        ],
        'See the connected result',
        showDemoClosingMessage,
        {stepLabel:'SPACE 1.5'}
    );
}

function showTotemIntroduction() {
    setDemoJourneyStage('connect');
    showDemoTutorialMedia('totem');
    showIntroBoard(
        'Meet the Totem',
        [
            'A Totem welcomes you to an Area and keeps its local information together.',
            'Its directional signs point toward Notes, Plant Orbs and neighbouring Totems. Show Signs toggles the plaques; Fade softens the Totem while you explore nearby information.',
            'Open a Totem card to see what is nearby, then choose the information you want to explore.'
        ],
        'Show Totem',
        () => {
            finishIntroBoard();
            createDemoTotemExample();
        },
        {stepLabel:'ELEMENTS 1.18'}
    );
}

function showSpatialGardenSummary() {
    setDemoJourneyStage('connect');
    showIntroBoard(
        'The information now belongs to a place',
        'This scene now holds two plant profiles and one local observation. NourishlandXR organises them into Areas, so visitors can understand where they are and how each part connects to the wider project.',
        'See Area Totems',
        showTotemIntroduction,
        {stepLabel:'SPACE 1.4'}
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
        },
        {stepLabel:'ELEMENTS 1.17'}
    );
}

function shiftSimulatedSceneForStage(type) {
    // Stage changes must not rewrite placed spatial anchors. Each new simulated
    // aim gets its own position instead, so Plants and Notes remain where the
    // user placed them and stay available for interaction.
    preservePlacedDemoPlants(markers);
    if (simulatedMode) updateSimulatedMarkers();
}

function demoControlPanelRect() {
    const panel = infoPanel?.element;
    if (!simulatedMode || !panel || !panel.getClientRects().length) return null;
    return panel.getBoundingClientRect();
}

function keepDemoAnchorClear(anchor, radius) {
    const { width, height } = demoViewportDimensions();
    const panel=demoControlPanelRect();
    const clear=avoidDemoPanelOverlap(anchor, radius, panel, width, height);
    const footer=appRoot?.querySelector('.tryit-context-trigger.is-phone-footer-action');
    // Reserve the future Continue action while aiming, even before that
    // action is shown. The chosen position is the placed Orb's stable anchor.
    const footerTop=footer && !footer.hidden ? footer.getBoundingClientRect().top
        : footer && width<=620 ? height*.74 : NaN;
    if(Number.isFinite(footerTop)){
        clear.y=Math.min(clear.y,Math.max(8,(footerTop-radius-12)/height*100));
        const x=clear.x*width/100,y=clear.y*height/100,inset=radius+12;
        if(panel && x>panel.left-inset && x<panel.right+inset && y>panel.top-inset && y<panel.bottom+inset){
            const right=panel.right+inset,left=panel.left-inset;
            if(right<=width-radius)clear.x=right/width*100;
            else if(left>=radius)clear.x=left/width*100;
        }
    }
    return clear;
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
    if(type==='plant' || type==='plant2')infoPanel?.setMediaCollapsed(true);
    else showDemoTutorialMedia(mediaKey);
    if(type==='note')infoPanel?.setContextualHint('Press Note for more examples and observation templates.');
    const startPlacement = () => {
        suppressSessionSelectUntil = performance.now() + 700;
        finishIntroBoard();
        const questTriggerPlacement=Boolean(session && demoControllerInputSource()?.targetRayMode!=='screen');
        const placementCopy = type === 'plant'
            ? {title:'Place Pigeon Pea',body:'A Plant Orb attaches this plant’s information to a real place. Pigeon Pea is our first example.',next:`Aim at the real plant or desired tag location, then ${questTriggerPlacement?'press the controller trigger':'press the aiming circle'} to place it. Use the right joystick to adjust distance.`}
            : type === 'plant2'
                ? {title:'Place Moringa',body:'Moringa is the second Plant Orb in this map. Its own Plant Profile lets you compare two living roles in the same place.',next:`Aim beside Pigeon Pea, then ${questTriggerPlacement?'press the controller trigger':'press the aiming circle'} to place the Moringa Orb.`}
                : type==='totem'
                    ? {title:'Place Botanical Garden Totem',body:'A Totem gives an Area a clear welcome point for its signs and local information.',next:'Aim the upright preview where the Totem should stand. Adjust depth with the joystick, then press the trigger.'}
                    : {title:'Place an observation',body:'A Note keeps something noticed in this part of the landscape beside the plants it relates to.',next:'Aim at the place you observed, then press the aiming circle to place the Note.'};
        introBoardStep=type==='plant'?'ELEMENTS 1.5':type==='plant2'?'ELEMENTS 1.11':type==='note'?'ELEMENTS 1.16':'ELEMENTS 1.24';
        introBoardTitle=placementCopy.title;
        introBoardBody=placementCopy.body;
        introBoardVisibleBody=placementCopy.body;
        rememberDemoSlide({stepLabel:introBoardStep,title:placementCopy.title,body:placementCopy.body,buttonLabel:'',onContinue:null,options:{nextGuide:placementCopy.next},kind:'placement'});
        introBoardTextureDirty=true;
        const board=appRoot?.querySelector('[data-tryit-guided-choice]');
        if(board){board.innerHTML=`<small>${demoIntroLabel()}</small><h2>${placementCopy.title}</h2><div class="tryit-board-text-window"><p>${placementCopy.body}</p></div>`;board.classList.add('is-copy-ready');board.classList.remove('is-typing');}
        setIntroBoardNextGuide(placementCopy.next);
        setGuide(type === 'plant'
            ? `Aim toward the real plant or desired information-tag position, then ${questTriggerPlacement?'pull the Quest controller trigger':'tap the aiming circle'} to confirm.`
            : type === 'plant2'
                ? 'Press the aiming circle to place the Moringa orb.'
                : type==='totem'?'Position the upright Totem preview, then confirm placement.':'Tap the circle to place a Note.');
        placementReady = true;
        place?.removeAttribute('hidden');
        refreshSimulatedPlacementAim();
        requestAnimationFrame(() => place?.classList.add('is-revealing', 'is-ready'));
    };
    if(explained){startPlacement();return;}
    const stepLabel=type==='plant'?'ELEMENTS 1.4':type==='plant2'?'ELEMENTS 1.10':type==='note'?'ELEMENTS 1.15':'ELEMENTS 1.23';
    showIntroBoard(title, introduction, 'Continue', startPlacement,{stepLabel});
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
    return keepDemoAnchorClear({
        x: Number.isFinite(x) ? x : 50,
        y: Number.isFinite(y) ? y : 50
    },34);
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
        cellOpacity: demoCellOpacity,
        selectedNodeId: record.demoSelectedNodeId,
        connectedPath:nativeConnectionState?.phase==='connected' && record===nativeConnectionPlant()?nativeConnectionState.sourcePath:'',
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
    if (!record.demoExpanded) {
        return simulatedPlantMarkup(record, index, anchor, offset, {
            held: demoHeldIndex === index
        });
    }
    return simulatedPlantMarkup(record, index, anchor, offset, {
        held: demoHeldIndex === index,
        surface: demoPimSurfaceLayout(anchor),
        knowledgeMarkup: demoPlantKnowledgeMarkup(record, anchor)
    });
}

function renderSimulatedTotem(record, index, anchor) {
    return simulatedTotemMarkup(record, index, anchor, {
        cards: demoTotemCards(record),
        held: demoHeldIndex === index
    });
}

function showDemoPlantPhoto(record) {
    if(!record || record.demoType!=='plant')return false;
    const media=demoPlantMedia(record);
    const document=demoOrbKnowledge(record).document;
    if(!media && !document?.identity?.image){setGuide(`${record.name || 'This plant'} has no sample photo yet.`);return false;}
    infoPanel?.suspend(false);
    infoPanel?.focusPlant(record,document,media);
    infoPanel?.setMediaCollapsed(false);
    setGuide(`${record.name || 'Plant'} photo opened in the media panel.`);
    return true;
}

function toggleDemoPlantProfile(record) {
    if(demoKnowledgeWorkspace) return;
    if (!record || record.demoType !== 'plant') return;
    const now=performance.now();
    if(now-(record.demoLastProfileToggleAt ?? -Infinity)<280)return;
    record.demoLastProfileToggleAt=now;
    const recordIndex = markers.indexOf(record);
    if (demoHeldIndex === recordIndex) releaseHeldDemoRecord();
    const opening=!record.demoExpanded;
    record.demoExpanded = opening;
    if (record.demoExpanded) {
        infoPanel?.setContextualHint('');
        activePimLimBridge=null;
        if(record.tutorialStage==='plant'){setDemoJourneyStage('know');advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.plantProfileOpened);}
        clearLimSelection();
        const ambientNeighbour=Boolean(record.demoAmbientNeighbour);
        const plantMedia=demoPlantMedia(record);
        infoPanel?.focusPlant(record,demoOrbKnowledge(record).document,plantMedia);
        if(!ambientNeighbour)setDemoTutorialStep(DEMO_TUTORIAL_STEPS.PIM);
        setDemoPimState(record, pimCreateInteractionState(demoPimExpandedNodeIds(record), record.demoSelectedNodeId || '', record.id || record.name || ''));
        record.profileRevealStarted = now;
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
        if(ambientNeighbour)setGuide(`${record.name} information opened. Select a cell to explore its story.`);
        else showPersistentPimPrompt(record);
    }
    refreshDemoRecord(record);
    if (record.demoExpanded && record.awaitingProfileReveal) {
        record.awaitingProfileReveal = false;
        navigator.vibrate?.([45, 40, 75]);
    }
    if (!record.demoExpanded) {
        infoPanel?.setMediaCollapsed(true);
        if(!record.demoAmbientNeighbour)setDemoTutorialStep(DEMO_TUTORIAL_STEPS.GUIDED);
        setGuide(`${record.name || 'Plant'} profile hidden. The living orb remains anchored in place.`);
    }
}

function selectDemoPlantAtPointer() {
    return selectDemoPlantRecord(demoRecordAtPointer(), toggleDemoPlantProfile);
}

function selectGuidedDemoOrb() {
    return selectGuidedDemoOrbRecord(markers, toggleDemoPlantProfile);
}

function selectDemoProfileCell(selection=demoInfoTarget()) {
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
    // Some Quest runtimes deliver the same trigger through both the capture
    // listener and the general select fallback. Do not toggle the branch shut
    // on that duplicate event, even if the first activation revealed children.
    if(session && performance.now()-lastSpatialPimActivationAt<350)return true;
    if(session)lastSpatialPimActivationAt=performance.now();
    if(nativeConnectionState?.phase==='source' && record===nativeConnectionPlant() && node.path===nativeConnectionState.sourcePath)return acceptNativePimCell(record,node.path);
    if (node.pimRead) {openDemoKnowledge(record);return true;}
    if (node.pimCore) {
        return showDemoPlantPhoto(record);
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
    if (record?.demoAmbientNeighbour) return 0;
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

function updateSimulatedMarkers() {
    appRoot?.querySelectorAll(':scope > .nlxr-totem-detail').forEach(note=>note.remove());
    const layer = appRoot?.querySelector('[data-tryit-sim-markers]');
    if (!layer || !simulatedMode) return;
    const highlighted=selectedDemoTotemTargets();
    layer.innerHTML = `${simulatedAreaLinkMarkup(markers.filter(demoAreaVisible))}${markers.map((record, index) => {
        if(!demoAreaVisible(record))return '';
        const content = demoContentFor(record);
        const lines = content?.lines?.slice(0, record.revealLines ?? content.lines.length) || [];
        const anchor = record.simulatedAnchor || { x: 50, y: 50 };
        if (record.demoType === 'plant') {
            const offset = record.demoPanelOffset || (record.demoPanelOffset = defaultPlantPanelOffset(anchor));
            return renderSimulatedPlant(record, index, anchor, offset).replace('tryit-sim-marker tryit-sim-marker-plant',`tryit-sim-marker tryit-sim-marker-plant${highlighted.has(record.id)?' is-sign-target':''}`);
        }
        if (record.demoType === 'zone' && record.demoExpanded) return renderSimulatedTotem(record, index, anchor).replace('tryit-sim-totem-system',`tryit-sim-totem-system${highlighted.has(record.id)?' is-sign-target':''}`);
        const defaultOffsets = { note: { x: 0, y: 0 }, zone: { x: 0, y: 0 } };
        const offset = record.demoPanelOffset || (record.demoPanelOffset = defaultOffsets[record.demoType] || { x: 0, y: 0 });
        return simulatedRecordMarkup({
            record,
            index,
            anchor,
            offset,
            content,
            lines,
            highlighted: highlighted.has(record.id),
            held: demoHeldIndex === index
        });
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
                record.simulatedAnchor = simulatedAnchorFromPointer(
                    holdGesture.startAnchor,
                    holdGesture.startX,
                    holdGesture.startY,
                    event,
                    demoViewportDimensions(),
                    keepDemoAnchorClear,
                    orbRadius
                );
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
            compactMarker.querySelector('[data-totem-signs]')?.addEventListener('click',event=>{event.stopPropagation();infoPanel?.setMediaCollapsed(true);record.demoTotemSignsVisible=!record.demoTotemSignsVisible;record.demoSignsChangedAt=performance.now();setDemoAreaFaded(record,false);record.totemSelectedCard='';record.totemCardsRefreshed=0;updateSimulatedMarkers();});
            compactMarker.querySelector('[data-totem-fade]')?.addEventListener('pointerdown',event=>event.stopPropagation());
            compactMarker.querySelector('[data-totem-fade]')?.addEventListener('click',event=>{event.stopPropagation();infoPanel?.setMediaCollapsed(true);setDemoAreaFaded(record,!record.demoTotemFaded);});
            compactMarker.querySelectorAll('[data-totem-card]').forEach(button=>{
                button.addEventListener('pointerdown',event=>event.stopPropagation());
                button.addEventListener('click',event=>{
                    event.stopPropagation();infoPanel?.setMediaCollapsed(true);selectDemoTotemSign(record,button.dataset.totemCard);
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
        let draggedCenter=false;
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
                if(draggedCenter){draggedCenter=false;return;}
                showDemoPlantPhoto(record);
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
            if(nativeConnectionState?.phase==='source' && record===nativeConnectionPlant() && nodePath===nativeConnectionState.sourcePath){
                acceptNativePimCell(record,nodePath);
                return;
            }
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
        // Desktop AR already owns the cell click action above. Keep the shared
        // PIMO layout observer, but do not let the hold binder swallow clicks.
        bindPlantInformationMeshPress(profile,{activateOnClick:true});
        handles.forEach(handle => {
            let start = null;
            handle.addEventListener('pointerdown', event => {
                event.preventDefault();
                event.stopPropagation();
                start = { x: event.clientX, y: event.clientY, offset: record.demoPanelOffset || { x: 0, y: 0 } };
                if(handle.matches('[data-pim-role="center"]'))draggedCenter=false;
                handle.setPointerCapture?.(event.pointerId);
                profile.classList.add('is-dragging');
            });
            handle.addEventListener('pointermove', event => {
                if (!start) return;
                event.preventDefault();
                event.stopPropagation();
                if(handle.matches('[data-pim-role="center"]') && Math.hypot(event.clientX-start.x,event.clientY-start.y)>6)draggedCenter=true;
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
                if(handle.matches('[data-pim-role="center"]') && (event.key==='Enter' || event.key===' ')){
                    event.preventDefault();event.stopPropagation();showDemoPlantPhoto(record);return;
                }
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
        .filter(item => item.record.demoInteractive !== false && demoAreaVisible(item.record) && item.hit)
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
            pulseDemoHaptics();
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
    demoGrabPreparingIndex=target.index;
    demoHoldTimer = setTimeout(() => {
        demoHoldTimer = null;
        demoGrabPreparingIndex=-1;
        demoHeldIndex = target.index;
        pulseDemoHaptics();
        setGuide(`Holding ${target.record.name || 'the orb'}. Move your phone, then release.`);
    }, DEMO_PLANT_ORB_HOLD_DELAY_MS);
    return true;
}

function beginControllerDemoHold() {
    if (placementReady || demoHeldIndex >= 0 || demoHoldTimer) return false;
    const profile=demoInfoTarget();
    const target = demoRecordAtPointer() || (profile?.target ? {record:profile.record,index:markers.indexOf(profile.record),hit:profile.target} : null);
    if (!target || target.record.demoInteractive === false) return false;
    // Quick presses still select PIMO cells. Holding on an open PIMO surface
    // moves its anchored Orb after the hold delay.
    const origin = demoPointerWorldOrigin();
    if (!origin) return false;
    captureDemoGrabPose(target.record, origin, demoPointerWorldRay());
    demoGrabPreparingIndex=target.index;
    demoHoldTimer = setTimeout(() => {
        demoHoldTimer = null;
        demoGrabPreparingIndex=-1;
        demoHeldIndex = target.index;
        pulseDemoHaptics(demoGrabInputSource);
        suppressSessionSelectUntil = performance.now() + 420;
        setGuide(`Holding ${target.record.name || 'the orb'}. Move the controller, then release.`);
    }, DEMO_PLANT_ORB_HOLD_DELAY_MS);
    return true;
}

function beginHandDemoGrab(inputSource=null) {
    if (placementReady || demoHeldIndex >= 0) return false;
    const profile=demoInfoTarget();
    const target = demoRecordAtPointer() || (profile?.target ? {record:profile.record,index:markers.indexOf(profile.record),hit:profile.target} : null);
    const origin = demoPointerWorldOrigin();
    if (!target || !origin || target.record.demoInteractive === false) return false;
    if (!captureDemoGrabPose(target.record, origin, demoPointerWorldRay())) return false;
    demoHeldIndex = target.index;
    pulseDemoHaptics(inputSource);
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
    demoGrabPreparingIndex=-1;
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
        id:type==='plant'?DEMO_RECORD_IDS.pigeonPea:type==='plant2'?DEMO_RECORD_IDS.moringa:DEMO_RECORD_IDS.seasonalNote,
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
    rainV2Canvas=null;rainV2LastPaint=0;
    if(simulated){
        rainV2Canvas=document.createElement('canvas');
        rainV2Canvas.className='tryit-rain-v2';
        rainV2Canvas.setAttribute('aria-hidden','true');
        appRoot.querySelector('.tryit-stage')?.prepend(rainV2Canvas);
    }
    if(simulated || session){
        const modelCanvas=document.createElement('canvas');modelCanvas.className='tryit-ambient-model';modelCanvas.setAttribute('aria-hidden','true');modelCanvas.dataset.demoBeeModel='';
        appRoot.querySelector('.tryit-stage')?.prepend(modelCanvas);
        import('../services/demoBeeModel.js').then(({mountDemoBeeModel})=>{if(modelCanvas.isConnected)ambientBeeModel=mountDemoBeeModel(modelCanvas,{sprite:!simulated});}).catch(error=>console.warn('Bee model fallback:',error));
    }
    const hasPhoneScreenInput=Array.from(session?.inputSources || []).some(input=>input.targetRayMode==='screen');
    const phoneArPanel=Boolean(!simulated && sessionMode==='immersive-ar' && (hasPhoneScreenInput || (navigator.maxTouchPoints>0 && window.matchMedia('(pointer: coarse)').matches)));
    const demoRoot=appRoot.querySelector('.tryit-demo');if(demoRoot){demoRoot.dataset.rainStyle=demoRainStyle;demoRoot.dataset.rainIntensity=demoRainIntensity<=0?'off':demoRainIntensity<1?'light':demoRainIntensity>1?'heavy':'normal';}
    infoPanel?.destroy(); demoPanelActionSignature='';elementPanelActionSignature=''; infoPanel = createPimInfoPanel({root:appRoot,headset:!simulated,phoneAR:phoneArPanel,rainIntensity:demoRainIntensity,rainStyle:demoRainStyle,cellOpacity:demoCellOpacity,handMode:demoHandMode,panelHints:DEMO_PANEL_HINTS,onPerformanceAction:handleDemoPerformanceAction,onInfoOpacity:()=>{introBoardTextureDirty=true;paintWelcomeLayer(performance.now());},onGrab:pulseDemoHaptics,onHandMode:value=>{demoHandMode=value;},onRainIntensity:value=>{demoRainIntensity=value;const demo=appRoot?.querySelector('.tryit-demo');if(demo)demo.dataset.rainIntensity=value<=0?'off':value<1?'light':value>1?'heavy':'normal';},onRainStyle:value=>{demoRainStyle=value;const demo=appRoot?.querySelector('.tryit-demo');if(demo)demo.dataset.rainStyle=value;},onCellOpacity:value=>{demoCellOpacity=value;for(const record of markers.filter(item=>item.demoType==='plant'))refreshDemoRecord(record);introBoardTextureDirty=true;paintWelcomeLayer(performance.now());},onMove:refreshSimulatedPlacementAim,onEdit:(record,path)=>openDemoKnowledge(record,path,true),onPathwayAction:handlePathwayAction,onModuleAction:handleLearningModuleAction,onUtilityAction:handleDemoPanelAction});
    if(!simulated)publishDemoPerformance();
    infoPanel.setPanelHints(DEMO_PANEL_HINTS);
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
    skipButton.setAttribute('aria-label', 'Skip the current demo step');
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
        bindHoldToConfirmButton(skipButton, { duration: DEMO_PLANT_ORB_HOLD_DELAY_MS, onComplete: () => skipCurrentDemoStep() }),
        bindHoldToConfirmButton(exitButton, { duration: DEMO_PLANT_ORB_HOLD_DELAY_MS, onComplete: requestDemoClose })
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
    // An immersive session can present its first headset frame before normal
    // window timers receive another turn. Build the spatial welcome now so
    // Quest never starts with a cleared framebuffer and no scene. The short
    // delay remains useful only for the desktop transition animation.
    if (simulated) introNarrationTimer = setTimeout(showArWelcomeShowcase, 120);
    else showArWelcomeShowcase();
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

function compileDemoShader(type,source,label){
    const shader=gl.createShader(type);
    if(!shader)throw new Error(`${label} shader could not be created.`);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
        const detail=gl.getShaderInfoLog(shader) || 'No WebGL compiler details.';
        gl.deleteShader(shader);
        throw new Error(`${label} shader failed: ${detail}`);
    }
    return shader;
}

function setupRenderer() {
    const vertex = compileDemoShader(gl.VERTEX_SHADER,'attribute vec3 p;attribute vec2 uv;uniform mat4 mvp;varying vec2 v;void main(){gl_Position=mvp*vec4(p,1.);v=uv;}','Vertex');
    const fragment = compileDemoShader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 v;uniform sampler2D t;uniform float opacity;void main(){vec4 sampleColor=texture2D(t,v);if(sampleColor.a<.02)discard;gl_FragColor=vec4(sampleColor.rgb,sampleColor.a*opacity);}','Fragment');
    program = gl.createProgram();
    if(!program)throw new Error('Demo WebGL program could not be created.');
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
        const detail=gl.getProgramInfoLog(program) || 'No WebGL linker details.';
        gl.deleteProgram(program);program=null;
        gl.deleteShader(vertex);gl.deleteShader(fragment);
        throw new Error(`Demo WebGL program failed: ${detail}`);
    }
    gl.deleteShader(vertex);gl.deleteShader(fragment);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.20,-.08,0,0,1, .20,-.08,0,1,1, .20,.08,0,1,0, -.20,-.08,0,0,1, .20,.08,0,1,0, -.20,.08,0,0,0]), gl.STATIC_DRAW);
    sphereRenderer = createSpatialSphereRenderer(gl);
    // Totem cards share the Totem's placement heading. They must not turn with
    // the viewer after the buttons have been aimed during placement.
    totemCardsRenderer = createSpatialTotemCards(gl,{faceTotemToViewer:false,ray:()=>latestControllerRay});
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

function pollDemoControllerSkip() {
    demoControllerYSkipTracker?.poll(session?.inputSources);
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
        if(!handled)handled=Boolean(beginHandDemoGrab(latestTrackedHandStates.find(entry=>entry.state===latestHandState)?.source));
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
    const storage=demoTextureStorage.get(texture);
    if(storage?.width===label.width && storage?.height===label.height){
        gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,label);
    }else{
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,label);
        demoTextureStorage.set(texture,{width:label.width,height:label.height});
    }
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
    for (let fontSize = 60; fontSize >= 22; fontSize -= 2) {
        const lineHeight = Math.round(fontSize * 1.22);
        const paragraphGap = Math.round(fontSize * .5);
        ctx.font = `600 ${fontSize}px "Manrope", "Segoe UI Variable", Inter, system-ui, sans-serif`;
        const paragraphLines = paragraphs.map(paragraph => wrappedTextureLines(ctx, paragraph, maxWidth));
        const totalHeight = paragraphLines.reduce((height, lines) => height + lines.length * lineHeight, 0)
            + Math.max(0, paragraphLines.length - 1) * paragraphGap;
        if (totalHeight <= maxHeight || fontSize === 22) {
            return { fontSize, lineHeight, paragraphGap, paragraphLines };
        }
    }
    return { fontSize: 22, lineHeight: 27, paragraphGap: 11, paragraphLines: [] };
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
            connectedPath:nativeConnectionState?.phase==='connected' && record===nativeConnectionPlant()?nativeConnectionState.sourcePath:'',
            hoverPath:demoPimHover.record===record?demoPimHover.path:'',
            cellOpacity:demoCellOpacity,
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

const demoTextureStorage=new WeakMap();
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

function createXrRecoveryTexture(){
    const label=xrRecoveryCanvas ||= document.createElement('canvas');
    label.width=1200;label.height=560;
    const ctx=label.getContext('2d');
    ctx.clearRect(0,0,label.width,label.height);
    const failed=xrRecoveryStatus==='failed';
    ctx.fillStyle=failed?'rgba(54,22,18,.96)':'rgba(9,37,29,.94)';
    ctx.beginPath();ctx.roundRect(18,18,label.width-36,label.height-36,56);ctx.fill();
    ctx.strokeStyle=failed?'rgba(255,176,128,.9)':'rgba(197,239,176,.9)';ctx.lineWidth=8;ctx.stroke();
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#f5ffe9';ctx.font='700 62px system-ui, sans-serif';
    ctx.fillText(failed?'Scene recovery active':'NourishlandXR is starting',label.width/2,170);
    ctx.fillStyle='rgba(244,255,238,.9)';ctx.font='500 34px system-ui, sans-serif';
    ctx.fillText(failed?`Press the trigger to return · ${XR_RECOVERY_CODE}`:'Preparing the spatial welcome…',label.width/2,278);
    ctx.fillStyle=failed?'rgba(255,203,167,.88)':'rgba(214,239,199,.8)';ctx.font='500 25px system-ui, sans-serif';
    ctx.fillText(failed?String(xrRecoveryDetail || 'XR runtime').slice(0,70):'If this remains visible, exit AR and reopen the demo.',label.width/2,382);
    return canvasTexture(label,xrRecoveryTexture);
}

function drawXrRecoverySurface(view){
    if(xrRecoveryStatus==='ready' || !viewerMatrix || !program || !buffer)return;
    xrRecoveryTexture ||= createXrRecoveryTexture();
    const anchor=introWorldAnchorFromViewer(viewerMatrix);
    if(!anchor)return;
    const center=introLocalPosition(anchor,[0,.04,-1.35]);
    const model=billboardMatrix(center,2.85,2.75,anchor);
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    const p=gl.getAttribLocation(program,'p'),uv=gl.getAttribLocation(program,'uv');
    gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,20,0);
    gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,'mvp'),false,multiply(view.projectionMatrix,multiply(view.transform.inverse.matrix,model)));
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,xrRecoveryTexture);
    gl.uniform1i(gl.getUniformLocation(program,'t'),0);gl.uniform1f(gl.getUniformLocation(program,'opacity'),1);
    gl.disable(gl.CULL_FACE);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,6);gl.depthMask(true);
}

function createIntroNoteTexture(texture = null) {
    const label = introNoteCanvas ||= document.createElement('canvas');
    const width=arWelcomeShowcaseActive?2500:1400,height=arWelcomeShowcaseActive?2100:1080;
    if(label.width!==width)label.width=width;
    if(label.height!==height)label.height=height;
    const ctx = label.getContext('2d');
    ctx.clearRect(0, 0, label.width, label.height);
    if(arWelcomeShowcaseActive){
        arWelcomeRenderedFrames=drawArWelcomeShowcase(ctx,arWelcomeClock.elapsed,window.matchMedia('(prefers-reduced-motion: reduce)').matches,arWelcomeClusters,{opening:arWelcomeOpeningActive,minimalIntro:arWelcomeIntroPending,openingSeed:arWelcomeOpeningSeed,openingDuration:arWelcomeOpeningDuration,minimalStartAt:DEMO_ARCHETYPE_START_MS,minimalInterval:DEMO_ARCHETYPE_INTERVAL_MS,minimalRevealDuration:DEMO_ARCHETYPE_REVEAL_MS,hidden:limHiddenCells,drawCells:limMeshVisible,drawPanel:arWelcomeSharedBoard && introBoardVisible,drawRoots:arWelcomeSharedBoard && introBoardVisible,rootMilestone:arWelcomeRootMilestone,rootMilestoneStartedAt:arWelcomeRootMilestoneStartedAt,drawContent:drawIntroNoteContent,progression:{cellsActivatedAt:limMeshActivatedAt,expandedLimIds:[...limExpandedCells],expandedAt:Object.fromEntries(limExpandedAt)},cellOpacity:demoCellOpacity,selectedKey:selectedLimCell,hoverKey:contextCellKey,pathwayKey:limPathwayState.status==='active'?(currentPathwayNode()?.key || ''):'',holdKey:limActivation?.activeKey,holdProgress:limActivation?.progress || 0,connectedKey:nativeConnectionState?.phase==='connected'?nativeConnectionTargetKey():''});
        return canvasTexture(label,texture);
    }
    drawArWelcomePanel(ctx,{elapsed:arWelcomeClock.elapsed,reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches});
    drawIntroNoteContent(ctx);
    return canvasTexture(label, texture);
}

function drawIntroNoteContent(ctx) {
    // Give the copy the full readable centre of the glass screen without
    // reaching its sloped sides. The extra width keeps long slides legible.
    const contentLeft = 260;
    const contentWidth = 880;
    const contentCenter = contentLeft + contentWidth / 2;
    const titleWidth = 960;
    ctx.save();
    const gentleIntroFade=arWelcomeIntroPending && !arWelcomeSettleStage;
    if(gentleIntroFade){
        const elapsed=arWelcomeClock?.elapsed || 0;
        ctx.globalAlpha*=.72+.28*(.5+.5*Math.sin(elapsed/2400));
    }
    ctx.shadowColor = 'rgba(0,20,18,.38)';
    ctx.shadowBlur = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if(arWelcomeSettleStage)ctx.globalAlpha*=Math.max(0,Math.min(1,(arWelcomeClock.elapsed-arWelcomeSettleStartedAt)/850));
    ctx.fillStyle = 'rgba(232,246,225,.7)';
    ctx.font = `600 29px ${DEMO_PRESENTATION_FONT}`;
    ctx.fillText(demoIntroLabel(), contentCenter, 345, contentWidth);
    const openingElapsed=arWelcomeIntroPending && !arWelcomeSettleStage ? (arWelcomeClock?.elapsed || 0) : null;
    if(openingElapsed!==null){
        if(openingElapsed<DEMO_WELCOME_OPENING_MS){
            const fade=openingElapsed<DEMO_WELCOME_DESCRIPTION_HOLD_MS?1:Math.max(0,1-(openingElapsed-DEMO_WELCOME_DESCRIPTION_HOLD_MS)/(DEMO_WELCOME_OPENING_MS-DEMO_WELCOME_DESCRIPTION_HOLD_MS));
            const openingTitle=demoLocalizedText('Welcome to the NourishlandXR demo');
            let openingTitleSize=96;
            ctx.globalAlpha*=fade;ctx.fillStyle='#f7fbf4';
            do {ctx.font=`700 ${openingTitleSize}px ${DEMO_PRESENTATION_FONT}`;if(ctx.measureText(openingTitle).width<=titleWidth)break;openingTitleSize-=2;} while(openingTitleSize>36);
            ctx.fillText(openingTitle,contentCenter,420);
            if(openingElapsed>=DEMO_WELCOME_TITLE_HOLD_MS){ctx.fillStyle='#fff';ctx.font=`600 42px ${DEMO_PRESENTATION_FONT}`;drawWrappedTextureText(ctx,demoLocalizedText(DEMO_QUICK_ACCESS_COPY['INTRO 1.1']),contentCenter,570,780,54,3);}
        }
        ctx.restore();return;
    }
    ctx.fillStyle = '#f7fbf4';
    // Keep headings on one line so a wrapped second line cannot collide with
    // the divider/body copy on the compact spatial note (notably Pigeon Pea).
    let titleSize = 96;
    const titleFont = DEMO_PRESENTATION_FONT;
    ctx.font = `700 ${titleSize}px ${titleFont}`;
    while (titleSize > 36 && ctx.measureText(introBoardTitle).width > titleWidth) {
        titleSize -= 2;
        ctx.font = `700 ${titleSize}px ${titleFont}`;
    }
    ctx.fillText(introBoardTitle, contentCenter, 420);
    if (introBoardVisibleBody) {
    ctx.strokeStyle = 'rgba(241,249,237,.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(contentLeft, 478);
    ctx.lineTo(contentLeft + contentWidth, 478);
    ctx.stroke();
    const narrative = null;
    ctx.textAlign = 'center';
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
    const typedBody = narrative?.text || introBoardVisibleBody;
    const visibleParagraphs = typedBody.split(/\n\n/);
    // Keep the first body line clear of the divider and the clipping edge;
    // its ascenders were previously being cut because the baseline sat too
    // close to the clip rectangle.
    const bodyTop = 498;
    const bodyBottom = introBoardNextGuideVisible && introBoardNextGuide ? 705 : 775;
    const bodyLayout = fitIntroBodyLayout(ctx, narrative?.text || introBoardBody, contentWidth, bodyBottom - bodyTop);
    ctx.font = `600 ${bodyLayout.fontSize}px ${DEMO_PRESENTATION_FONT}`;
    const bodyX = contentCenter;
    const bodyHeight=bodyLayout.paragraphLines.reduce((height,lines)=>height+lines.length*bodyLayout.lineHeight,0)+Math.max(0,bodyLayout.paragraphLines.length-1)*bodyLayout.paragraphGap;
    let paragraphY = bodyTop+Math.max(0,(bodyBottom-bodyTop-bodyHeight)/2);
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
        ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#e7f5bb';
        ctx.font=`500 30px ${DEMO_PRESENTATION_FONT}`;
        const guideLines=wrappedTextureLines(ctx,`Next · ${introBoardNextGuide}`,contentWidth);
        guideLines.slice(0,2).forEach((line,index)=>ctx.fillText(line,contentCenter,736+index*29,contentWidth));
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.restore();
}

function createIntroControlTexture(labelText, texture = null, aimed=false) {
    const label = document.createElement('canvas');
    label.width = 900;
    label.height = 360;
    const ctx = label.getContext('2d');
    const panel = ctx.createLinearGradient(50, 24, 850, 336);
    panel.addColorStop(0, aimed?'rgba(210,230,210,.25)':'rgba(28,37,39,.05)');
    panel.addColorStop(1, 'rgba(28,37,39,.10)');
    ctx.fillStyle = panel;
    ctx.strokeStyle = aimed?'rgba(245,247,222,.96)':'rgba(220,218,202,.72)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.roundRect(12, 12, 876, 336, 64);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e1dfd2';
    ctx.shadowColor = 'rgba(0,0,0,.38)';
    ctx.shadowBlur = 4;
    const controlText=String(labelText || 'Continue').toUpperCase();
    let controlFontSize=84;ctx.font=`600 ${controlFontSize}px system-ui, sans-serif`;
    while(controlFontSize>54 && ctx.measureText(controlText).width>800){controlFontSize-=2;ctx.font=`600 ${controlFontSize}px system-ui, sans-serif`;}
    ctx.fillText(controlText, 450, 180,820);
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
        // XR sessions may report visible-blurred (or omit visibilityState).
        // Only a truly hidden session should pause the opening clock.
        arWelcomeClock.tick(Date.now(),session?.visibilityState!=='hidden');
        const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const rootRefreshState={milestone:arWelcomeRootMilestone,elapsed:arWelcomeClock.elapsed,milestoneStartedAt:arWelcomeRootMilestoneStartedAt,reducedMotion};
        const rootsNeedRefresh=arWelcomeSharedBoard && introBoardVisible && welcomeRootsNeedRefresh(rootRefreshState) && arWelcomeClock.elapsed-arWelcomeRootsLastRefreshAt>=WELCOME_ROOT_REFRESH_MS;
        if((limMeshVisible && limRevealIsAnimating()) || (!reducedMotion && introBoardVisible && now-introTextureUploadedAt>=WELCOME_RIM_MOTION.refreshMs) || rootsNeedRefresh || (!reducedMotion && (arWelcomeClock.elapsed<AR_WELCOME_SETTLED_MS || nativeConnectionState?.phase==='connected'))){
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
        const aimed=Boolean(latestControllerRay && welcomeSurfaceHit(introLocalPosition(introWorldAnchor,INTRO_CONTROL_POSITION),INTRO_CONTROL_SCALE[0],INTRO_CONTROL_SCALE[1],900,360));
        const textureKey=controlLabel+'|'+aimed;
        if (!introControlTexture || introControlTextureLabel !== textureKey) {
            introControlTexture = createIntroControlTexture(controlLabel, introControlTexture,aimed);
            introControlTextureLabel = textureKey;
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
        ambientWorldFrame=introWorldAnchor || new Float32Array(viewerMatrix);
        ambientWorldAnchor=introWorldAnchor
            ? introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition)
            : {x:viewerMatrix[12]-viewerMatrix[8]*2.4,y:viewerMatrix[13],z:viewerMatrix[14]-viewerMatrix[10]*2.4};
    }
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sprite=ambientBeeModel?.renderSprite?.(arWelcomeClock.elapsed,ambientBeesStartedAt);
    if(sprite && program && buffer){
        if(!ambientBeeSpriteTexture){ambientBeeSpriteTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,ambientBeeSpriteTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
        if(arWelcomeClock.elapsed-ambientBeeSpriteUploadedAt>=70){gl.bindTexture(gl.TEXTURE_2D,ambientBeeSpriteTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sprite);ambientBeeSpriteUploadedAt=arWelcomeClock.elapsed;}
        gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        const vertex=gl.getAttribLocation(program,'p'),uv=gl.getAttribLocation(program,'uv');
        gl.enableVertexAttribArray(vertex);gl.vertexAttribPointer(vertex,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
        gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.disable(gl.CULL_FACE);
        for(let index=0;index<2;index++){
            const bee=demoBeePose(arWelcomeClock.elapsed,ambientBeesStartedAt,index,{attention:'control',encounters:!reducedMotion});if(!bee)continue;
            const position=ambientBeeWorldPosition(bee,index);
            const spriteScale=.42*(1+bee.flyby*.3);
            const model=billboardMatrix(position,spriteScale,spriteScale,viewerMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(program,'mvp'),false,multiply(view.projectionMatrix,multiply(view.transform.inverse.matrix,model)));
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,ambientBeeSpriteTexture);gl.uniform1i(gl.getUniformLocation(program,'t'),0);gl.uniform1f(gl.getUniformLocation(program,'opacity'),bee.opacity);
            gl.drawArrays(gl.TRIANGLES,0,6);
        }
        gl.depthMask(true);
        return;
    }
    const wings=[];
    for(let index=0;index<2;index++){
        const bee=demoBeePose(arWelcomeClock.elapsed,ambientBeesStartedAt,index,{attention:'control',encounters:!reducedMotion});
        if(!bee)continue;
        // The ambient anchor is established from the current viewer pose above.
        // Referencing the old `base` name here threw on every immersive frame as
        // soon as the Meet a Plant Orb step enabled the bees. Because the frame
        // had already been cleared, that made the whole AR scene disappear.
        const position=ambientBeeWorldPosition(bee,index);
        const flybyScale=1+bee.flyby*.3;
        drawSpatialSphere(gl,sphereRenderer,view.projectionMatrix,view.transform.inverse.matrix,position,.018*flybyScale,{scale:{x:1.35,y:.7,z:.75},color:[.86,.66,.27],alpha:bee.opacity,emissive:.16});
        const flap=(.025+Math.abs(bee.wing)*.013)*flybyScale;
        wings.push(position.x-.008,position.y,position.z,position.x-.025,position.y+flap,position.z,
            position.x+.008,position.y,position.z,position.x+.025,position.y+flap,position.z);
    }
    drawDemoAmbientLines(view,wings,[.9,.97,.93,.53]);
}

function ambientBeeWorldPosition(bee,index=0){
    const frame=ambientWorldFrame || viewerMatrix;
    const rightLength=Math.hypot(frame[0],frame[2])||1;
    const forwardLength=Math.hypot(frame[8],frame[10])||1;
    const rightX=frame[0]/rightLength,rightZ=frame[2]/rightLength;
    const forwardX=-frame[8]/forwardLength,forwardZ=-frame[10]/forwardLength;
    const across=(bee.x-.5)*AR_PHONE_COMFORT.boardScale[0];
    const vertical=(bee.y-.5)*AR_PHONE_COMFORT.boardScale[1];
    const behindScreen=.18+((bee.depth+1)*.5)*.42;
    const ambientPosition={
        x:ambientWorldAnchor.x+rightX*across+forwardX*behindScreen,
        y:ambientWorldAnchor.y+vertical,
        z:ambientWorldAnchor.z+rightZ*across+forwardZ*behindScreen
    };
    const flyby=Math.max(0,Math.min(1,Number(bee.flyby)||0));
    if(!flyby)return beeWorldAvoidance(ambientPosition,index);
    const progress=Math.max(0,Math.min(1,Number(bee.flybyProgress)||0));
    if(!ambientEncounterOrigin || ambientEncounterOrigin.index!==bee.encounterIndex){
        ambientEncounterOrigin={index:bee.encounterIndex,x:viewerMatrix[12],y:viewerMatrix[13],z:viewerMatrix[14]};
    }
    const faceDistance=.72+Math.abs(progress-.5)*.34;
    const faceAcross=(.5-progress)*.24;
    const facePosition={
        x:ambientEncounterOrigin.x+rightX*faceAcross+forwardX*faceDistance,
        y:ambientEncounterOrigin.y-.035-Math.sin(Math.PI*progress)*.025,
        z:ambientEncounterOrigin.z+rightZ*faceAcross+forwardZ*faceDistance
    };
    const blended={
        x:ambientPosition.x+(facePosition.x-ambientPosition.x)*flyby,
        y:ambientPosition.y+(facePosition.y-ambientPosition.y)*flyby,
        z:ambientPosition.z+(facePosition.z-ambientPosition.z)*flyby
    };
    return beeWorldAvoidance(blended,index);
}

function beeWorldAvoidance(position,index){
    const target=beePointerAvoidance(position,latestControllerRay);
    const offset=ambientBeeAvoidance[index] || {x:0,y:0,z:0};
    const eased={x:offset.x+(target.x-offset.x)*.14,y:offset.y+(target.y-offset.y)*.14,z:offset.z+(target.z-offset.z)*.14};
    ambientBeeAvoidance[index]=eased;
    return {x:position.x+eased.x,y:position.y+eased.y,z:position.z+eased.z};
}

function drawNativeConnectionSpatial(view){
    const state=nativeConnectionState,record=nativeConnectionPlant();
    if(!state || !record?.demoExpanded || !introWorldAnchor || !tetherRenderer || !sphereRenderer || !viewerMatrix || state.phase==='source')return;
    const panel=demoPimPanel(record,ensureDemoPimPose(record));
    const size=record.pimTextureSize || demoPimSurfaceSize(record);
    const layoutKey=`${size.layoutWidth}:${size.layoutHeight}:${demoPimExpandedNodeIds(record).join('|')}`;
    if(state.sourceLayoutKey!==layoutKey){
        state.sourceLayoutKey=layoutKey;
        state.sourceNodePosition=pimVisibleNodes(knowledgeFor(record),demoPimExpandedNodeIds(record),{...demoSpatialPimLayoutOptions(),layoutWidth:size.layoutWidth,layoutHeight:size.layoutHeight}).find(node=>node.nodeId===state.sourceId || node.path===state.sourcePath)?.position || null;
    }
    const sourceNode=state.sourceNodePosition;
    const targetNode=arWelcomeRenderedFrames.flatMap(frame=>frame.nodes).find(node=>node.limId===state.targetId && node.opacity>.5);
    if(!panel || !sourceNode || !targetNode)return;
    const sx=(sourceNode.x/100-.5)*panel.width,sy=(.5-sourceNode.y/100)*panel.height;
    const source={x:panel.center.x+panel.right.x*sx+panel.up.x*sy,y:panel.center.y+panel.right.y*sx+panel.up.y*sy,z:panel.center.z+panel.right.z*sx+panel.up.z*sy};
    const center=introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition);
    const board=billboardMatrix(center,AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080,introWorldAnchor);
    const targetLocal=demoBillboardTextureLocalPoint(targetNode.x,targetNode.y,2500,2100);
    const target={x:board[12]+board[0]*targetLocal.x+board[4]*targetLocal.y,y:board[13]+board[1]*targetLocal.x+board[5]*targetLocal.y,z:board[14]+board[2]*targetLocal.x+board[6]*targetLocal.y};
    const linked=state.phase==='connected',time=performance.now();
    gl.depthMask(false);
    drawSpatialTether(gl,tetherRenderer,view,source,target,{segments:12,width:linked ? .0035 : .002,curve:.025,lift:.04,color:[.81,1,.64,linked ? .62 : .25]});
    const travel=window.matchMedia('(prefers-reduced-motion: reduce)').matches ? .5 : (time/1800)%1;
    const pulse={x:source.x+(target.x-source.x)*travel,y:source.y+(target.y-source.y)*travel+.04*Math.sin(Math.PI*travel),z:source.z+(target.z-source.z)*travel};
    drawSpatialSphere(gl,sphereRenderer,view.projectionMatrix,view.transform.inverse.matrix,pulse,.011,{color:[.91,1,.74],alpha:linked ? .8 : .38,emissive:.8});
    gl.depthMask(true);
}

function drawSpatialRainV1(view, time) {
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

function drawRainV2Vertices(view,source,base,color){
    if(!source?.length)return;
    const vertices=new Float32Array(source.length);
    for(let index=0;index<source.length;index+=3){vertices[index]=source[index]+base.x;vertices[index+1]=source[index+1]+base.y;vertices[index+2]=source[index+2]+base.z;}
    gl.useProgram(tetherRenderer.program);gl.bindBuffer(gl.ARRAY_BUFFER,tetherRenderer.buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(tetherRenderer.positionLocation);gl.vertexAttribPointer(tetherRenderer.positionLocation,3,gl.FLOAT,false,12,0);
    gl.uniformMatrix4fv(tetherRenderer.projectionLocation,false,view.projectionMatrix);gl.uniformMatrix4fv(tetherRenderer.viewLocation,false,view.transform.inverse.matrix);gl.uniform4fv(tetherRenderer.colorLocation,color);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.drawArrays(gl.LINES,0,vertices.length/3);gl.depthMask(true);
}

function drawSpatialRainV2(view,time){
    if(!tetherRenderer || !viewerMatrix || !view?.projectionMatrix || !view?.transform?.inverse?.matrix || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const progress=demoRainProgress(arWelcomeClock.elapsed)*demoRainIntensity;if(progress<=0)return;
    const mobile=sessionMode!=='immersive-vr' && navigator.maxTouchPoints>0;
    const field=demoRainV2Field(time,progress,{mobile});
    const eye={x:viewerMatrix[12],y:viewerMatrix[13],z:viewerMatrix[14]};
    for(const layer of field.layers)drawRainV2Vertices(view,layer.vertices,eye,[.78,.9,.9,layer.alpha]);
    const ground={x:eye.x,y:Number.isFinite(groundYEstimate)?groundYEstimate:eye.y-1.6,z:eye.z};
    drawRainV2Vertices(view,field.splashes,ground,[.68,.85,.83,.13]);
    const mist=new Float32Array(12*6);
    for(let index=0;index<12;index++){const angle=index*Math.PI*2/12,radius=2.1+(index%3)*.7,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,tangent=.22;mist.set([x-Math.sin(angle)*tangent,.07,z+Math.cos(angle)*tangent,x+Math.sin(angle)*tangent,.07,z-Math.cos(angle)*tangent],index*6);}
    drawRainV2Vertices(view,mist,ground,[.72,.86,.82,field.mistOpacity]);
}

function drawSpatialRain(view,time){if(demoRainStyle==='v1')drawSpatialRainV1(view,time);else drawSpatialRainV2(view,time);}

function drawMarker(view) {
    if (!program || !buffer || !sphereRenderer || !tetherRenderer || !prismRenderer || !triangleRenderer) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const hoveredPlant=latestControllerRay ? demoRecordAtPointer()?.record : null;
    const signTargets=selectedDemoTotemTargets();
    markers.forEach((record,index) => {
        const orbType = record.demoType === 'plant' ? 'plant' : record.demoType === 'marker' ? 'marker' : '';
        if (!orbType || !demoAreaVisible(record)) return;
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
            { type: orbType, color: material?.shell, ringColor: material?.ring, knowledge:orbType==='plant' ? demoOrbKnowledge(record) : null, held:demoHeldIndex===index, grabReady:demoGrabPreparingIndex===index, highlighted:signTargets.has(record.id) || orbType==='plant' && hoveredPlant===record || demoHeldIndex===index || demoGrabPreparingIndex===index, time:performance.now()/1000 }
        );
    });
    markers.forEach(record => {
        if (record.demoType !== 'zone' || !demoAreaVisible(record)) return;
        const totemColour=demoHexColour(record.demoTotemColor || record.demoContent?.accent)
            .map(channel=>Math.min(.95,channel*SPATIAL_OBJECT_VISUALS.totem.postContrast+SPATIAL_OBJECT_VISUALS.totem.postLift));
        const totemHighlight=totemColour.map(channel=>Math.min(.96,channel*.62+.28));
        const arrival=Math.max(0,Math.min(1,(performance.now()-(record.demoArriveAt || 0))/900));
        const groundBaseY = Number.isFinite(Number(record.groundBaseY))
            ? Number(record.groundBaseY)
            : Number(record.position?.y || 0) - DEMO_TOTEM_HALF_HEIGHT_METRES;
        const bodyHalfWidth=.095,bodyHalfDepth=.075,bodyHalfHeight=DEMO_TOTEM_HALF_HEIGHT_METRES,rotationY=demoTotemRotationY(record);
        drawSpatialPrism(gl, prismRenderer, view, { ...record.position, y:groundBaseY }, {
            halfWidth: bodyHalfWidth,
            halfHeight: bodyHalfHeight,
            halfDepth: bodyHalfDepth,
            color: totemColour,
            topColor: totemHighlight,
            woodGrain:SPATIAL_OBJECT_VISUALS.totem.woodGrain,
            topTaper: .96,
            alpha: arrival*demoTotemVisualOpacity(record),
            rotationY
        });

        const right={x:Math.cos(rotationY),y:0,z:-Math.sin(rotationY)},front={x:-right.z,y:0,z:right.x};
        for(const [offset,shade] of [[-.048,[.17,.12,.09,.25]],[-.016,[.16,.11,.08,.18]],[.037,[.82,.69,.52,.16]]]){
            const x=record.position.x+right.x*offset+front.x*(bodyHalfDepth+.002);
            const z=record.position.z+right.z*offset+front.z*(bodyHalfDepth+.002);
            drawSpatialTether(gl,tetherRenderer,view,{x,y:groundBaseY+.035,z},{x,y:groundBaseY+bodyHalfHeight*2-.035,z},{segments:2,width:.004,curve:0,lift:0,color:shade});
        }
        drawSpatialTotemButtons(gl,sphereRenderer,view.projectionMatrix,view.transform.inverse.matrix,{...record.position,y:groundBaseY},rotationY,{
            bodyHalfWidth:bodyHalfWidth,bodyHalfDepth,bodyHalfHeight,
            signsVisible:Boolean(record.demoTotemSignsVisible),faded:Boolean(record.demoTotemFaded),arrivalOpacity:arrival,
            fadeOpacity:record.demoTotemFaded ? Math.max(.78,demoTotemVisualOpacity(record)) : 1
        });
    });
    const linkedTotems = markers.filter(record => record.demoType === 'zone' && record.demoLinkVisible && demoAreaVisible(record));
    if (linkedTotems.length >= 2) {
        const [first, second] = linkedTotems;
        const route=demoGroundLinkRoute(first,second);
        if(route)drawSpatialTether(gl,tetherRenderer,view,route.start,route.end,{width:.008,color:[.4,.9,.72,.72],curve:0,lift:0});
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
        if(!demoAreaVisible(record) || demoKnowledgeWorkspace && record.demoType === 'plant' && record.demoExpanded) return;
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
        const profileOpacity = plantProfile ? Math.min(1, Math.max(0, (performance.now() - (record.profileRevealStarted || 0)) / 320)) : 1;
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
        markers.filter(record=>record.demoType==='zone' && record.demoExpanded && !record.demoNarrativeFaded && demoAreaVisible(record)).forEach(record=>{
            if(!record.totemCardsRefreshed || performance.now()-record.totemCardsRefreshed>500) {
                record.liveTotemCards=demoTotemCards(record);record.totemCardsRefreshed=performance.now();
            }
            const base={...record.position,y:record.groundBaseY ?? record.position.y-DEMO_TOTEM_HALF_HEIGHT_METRES};
            const rotationY=demoTotemRotationY(record);
            const surfaces=totemLayoutForRecord(record,base,record.liveTotemCards,record.totemSelectedCard,rotationY);
            const arrival=Math.max(0,Math.min(1,(performance.now()-(record.demoArriveAt || 0))/900));
            for(const surface of surfaces){
                if(surface.card?.boardStyle!=='attached-sign' || !surface.boardSide)continue;
                const side=surface.boardSide==='left'?-1:1;
                const right={x:Math.cos(rotationY),z:-Math.sin(rotationY)},front={x:-right.z,z:right.x};
                const start={x:base.x+right.x*side*.08+front.x*.08,y:surface.center.y,z:base.z+right.z*side*.08+front.z*.08};
                const end={x:surface.center.x-right.x*side*(surface.width*.44),y:surface.center.y,z:surface.center.z-right.z*side*(surface.width*.44)};
                drawSpatialTether(gl,tetherRenderer,view,start,end,{segments:2,width:.012,curve:0,lift:0,color:[.45,.43,.39,.9]});
            }
            drawSpatialTotemPlaques(gl,prismRenderer,sphereRenderer,view,surfaces,arrival);
            totemCardsRenderer.draw(view,record,base,record.liveTotemCards,record.totemSelectedCard);
        });
        totemCardsRenderer.end();
    }
    drawNativeConnectionSpatial(view);
    drawDemoControllerPointer(view);
    for(const record of markers){
        if(!signTargets.has(record.id) || !demoAreaVisible(record))continue;
        if(record.demoType==='plant'){
            const material=DEMO_ORB_MATERIALS[record.demoOrbColor],radius=(material?.radius || .068)*(sessionMode==='immersive-vr'?DEMO_QUEST_ORB_SCALE:1)*(record.demoAmbientNeighbour && record.demoInteractive===false ? .78 : 1);
            drawSignDestinationHighlight(gl,tetherRenderer,view,record.position,{width:radius*2.36,height:radius*2.36});
        }else if(record.demoType==='note'){
            const scale=record.demoAmbientNeighbour ? .62 : 1;
            drawSignDestinationHighlight(gl,tetherRenderer,view,record.position,{width:.4*DEMO_NOTE_IMMERSIVE_SCALE.x*scale,height:.16*DEMO_NOTE_IMMERSIVE_SCALE.y*scale,shape:'box'});
        }else if(record.demoType==='zone'){
            const ground=record.groundBaseY ?? record.position.y-DEMO_TOTEM_HALF_HEIGHT_METRES;
            drawSignDestinationHighlight(gl,tetherRenderer,view,{...record.position,y:ground+DEMO_TOTEM_HALF_HEIGHT_METRES},{width:.26,height:DEMO_TOTEM_HALF_HEIGHT_METRES*2,shape:'box'});
        }
    }

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
    const limSurface=(arWelcomeShowcaseActive && introWorldAnchor && currentLimPointerCell())
        ? welcomeSurfaceHit(introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition),AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080)
        : null;
    const greenSurface=arWelcomeShowcaseActive && introWorldAnchor && introBoardVisible
        ? welcomeSurfaceHit(introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition),AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080,2500,2100,true)
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
    const surface = [limSurface,controlSurface,greenSurface,placementSurface,pimSurface,hoveredRecordHit,infoPanel?.hit(latestControllerRay),totemCardsRenderer?.hit(latestControllerRay)].filter(Boolean).sort((a,b)=>a.distance-b.distance)[0];
    // Dashboard-style surfaces expose `position`; Totem/PIM surfaces expose
    // `point`. Treat both as the same exact visual contact so the laser does
    // not fall through to its five-metre fallback after a valid cell hit.
    const contactPoint=surface?.point || surface?.position;
    const surfacePoint=contactPoint ? {
        x:contactPoint.x-direction.x*.004,
        y:contactPoint.y-direction.y*.004,
        z:contactPoint.z-direction.z*.004
    } : null;
    const end = surfacePoint || controllerRayEnd(latestControllerRay, [], Math.min(XR_LASER_POINTER_CONFIG.length,2.5));
    if (!end) return;
    drawSpatialTether(gl, tetherRenderer, view, start, end, {
        segments: XR_LASER_POINTER_CONFIG.segments,
        width:latestTrackedHandStates.length ? .003 : XR_LASER_POINTER_CONFIG.width,
        curve: .001,
        lift: .001,
        color:latestTrackedHandStates.length ? [.78,.85,.84,handPinchActive ? .58 : .4] : [...XR_LASER_POINTER_CONFIG.color, XR_LASER_POINTER_CONFIG.alpha]
    });
    // An open contact ring replaces the hard-to-aim vertical tip.
    if(surfacePoint)drawSpatialPointerContact(gl,tetherRenderer,view,end,Math.max(.009,Math.min(.018,(surface.distance || 1)*.007)));

}

async function startImmersive() {
    if (!navigator.xr || !window.isSecureContext) return false;
    try {
        allowArScreenRotation();
        const arSession = await requestImmersiveArSession(appRoot,{targetFrameRate:demoRefreshRate});
        session = arSession.session;
        demoControllerYSkipTracker = createControllerYSkipTracker(() => {
            if (skipCurrentDemoStep()) suppressSessionSelectUntil = performance.now() + 450;
        });
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
        // Finish constructing the immersive UI and its welcome texture before
        // the first XR frame is requested. Desktop fallback is rendered by the
        // caller only when session setup fails.
        renderInterface(false);
        beginXrFirstContentWatchdog();
        session.addEventListener('select', event => {
            if(event.inputSource?.hand)return;
            if(demoExitLifecycle.state!==DEMO_EXIT_STATES.IDLE)return;
            if(xrRecoveryStatus==='failed'){returnToWelcome();return;}
            captureDemoInputEventRay(event);
            // The dedicated LIM listener normally consumes this event first.
            // Keep an independent route here because some Quest runtimes do
            // not deliver capture-phase XRInputSourceEvents consistently.
            // Resolve the same nearest surface used by the visible laser so a
            // PIMO in front of LIMO receives the trigger the visitor sees.
            if(event.inputSource===limInputSource || event.inputSource===limInputSuppressSource && performance.now()<limActivationSessionSuppressUntil)return;
            if(demoKnowledgeWorkspace) {const hit=spatialDashboardRayHit(latestControllerRay,demoKnowledgePanel,demoKnowledgeMirror || {});if(hit) demoKnowledgeMirror?.activateAt(hit.pixelX,hit.pixelY);return;}
            if (demoWebModeOpen) return;
            if(arWelcomeIntroPending){activateImmersiveDemoControl();return;}
            if (placementReady) return pressPlacementPointer();
            const cellTarget=resolveDemoCellTarget();
            // Tutorial-button suppression prevents duplicate scene actions,
            // but it must not make a newly opened Pigeon Pea cell unresponsive
            // to a separate controller press during that broad timer window.
            if(performance.now()<suppressSessionSelectUntil && cellTarget?.kind!=='pim-cell')return;
            if(cellTarget?.kind==='panel')return;
            if(cellTarget?.kind==='pim-cell' && selectDemoProfileCell(cellTarget))return;
            if(cellTarget?.kind==='lim-cell')return;
            if (demoHeldIndex >= 0) return;
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
        pimHold=bindSpatialPimHold({session,enabled:()=>demoExitLifecycle.state===DEMO_EXIT_STATES.IDLE && nativeConnectionState?.phase!=='source' && !demoKnowledgeWorkspace && !demoWebModeOpen && !arWelcomeIntroPending && !placementReady,
            // Use the same nearest visible surface as the laser and main XR
            // select route. A Control panel hit behind a nearer PIMO cell must
            // not disable the cell's hold/short-release interaction.
            getTarget:()=>{const target=resolveDemoCellTarget();return target?.kind==='pim-cell'?target:null;},activate:selectDemoProfileCell,captureEvent:captureDemoInputEventRay,
            progress:({record,target},amount)=>{record.pimPressPath=(target.node || target).path;record.pimPressProgress=amount;queueDemoPimTextureRefresh(record);}
        });
        session.addEventListener('selectstart', event => {
            if(event.inputSource?.hand)return;
            if(demoExitLifecycle.state!==DEMO_EXIT_STATES.IDLE)return;
            captureDemoInputEventRay(event);
            // If the capture-phase LIM listener is unavailable, still keep a
            // trigger aimed at the mesh out of the plant grab state machine.
            const pressedCell=resolveDemoCellTarget();
            if(pressedCell?.kind==='lim-cell'){
                if(limInputSource!==event.inputSource){limInputSuppressSource=null;limInputSource=event.inputSource;limActivation.start(pressedCell.node.key,performance.now(),'xr-hold-fallback');startLimActivationFrame();}
                return;
            }
            if(['pim-cell','panel'].includes(pressedCell?.kind))return;
            if(demoKnowledgeWorkspace) return;
            if(totemCardsRenderer?.hit(latestControllerRay)) return;
            if (demoWebModeOpen || performance.now() < suppressSessionSelectUntil) return;
            if (arWelcomeIntroPending || placementReady) return;
            demoGrabInputSource=event.inputSource;
            beginControllerDemoHold();
        });
        session.addEventListener('selectend', event => {
            if(event.inputSource?.hand)return;
            captureDemoInputEventRay(event);
            if(event.inputSource===limInputSource){
                const heldKey=limActivation.activeKey;
                if(heldKey && currentLimPointerCell()?.key===heldKey)limActivation.end(heldKey,performance.now());
                else limActivation.cancel('pointer-left');
                limInputSuppressSource=limInputSource;limInputSource=null;limActivationSessionSuppressUntil=performance.now()+450;
                return;
            }
            if (demoHeldIndex < 0) {
                clearTimeout(demoHoldTimer);
                demoHoldTimer = null;
                demoGrabPreparingIndex=-1;
                return;
            }
            releaseHeldDemoRecord();
            suppressSessionSelectUntil = performance.now() + 280;
        });
        const launchedSession=session;
        session.addEventListener('end', () => { void demoExitLifecycle.handleSessionEnd(launchedSession); },{once:true});
        const draw = (_time, frame) => {
            if (!session || frame.session !== session || !gl) return;
            session.requestAnimationFrame(draw);
            if(fpsSession!==session){fpsSession=session;fpsStarted=0;fpsFrames=0;measuredFps=null;}
            if(observedRefreshRate!==session.frameRate){observedRefreshRate=session.frameRate;publishDemoPerformance();}
            if(demoShowFps){
                if(!fpsStarted)fpsStarted=_time;
                else fpsFrames++;
                if(_time-fpsStarted>=1000){measuredFps=Math.round(fpsFrames*1000/(_time-fpsStarted));fpsStarted=_time;fpsFrames=0;publishDemoPerformance();}
            }
            introFrameToken = _time;
            let pose=null;
            try { pose=frame.getViewerPose(referenceSpace); }
            catch(error){reportDemoRenderFailure(error,'viewer pose');return;}
            if (pose) runXrFrameStep('viewer transform',()=>{
                viewerMatrix = Float32Array.from(pose.transform.matrix);
                latestDemoView = pose.views?.[0] || null;
                lastViewerPoseAt = _time;
            });
            runXrFrameStep('hit-test update',()=>{
                const hit = hitTestSource && frame.getHitTestResults(hitTestSource)[0];
                const hitPose = hit?.getPose(referenceSpace);
                hitMatrix = hitPose ? Float32Array.from(hitPose.transform.matrix) : null;
                groundYEstimate = demoGroundBaseY(hitMatrix, viewerMatrix, groundYEstimate);
            });
            runXrFrameStep('controller update',()=>updateDemoControllerRay(frame));
            runXrFrameStep('controller skip',pollDemoControllerSkip);
            runXrFrameStep('PIM hover',syncDemoPimHover);
            runXrFrameStep('controller depth',()=>pollDemoControllerDepth(_time));
            runXrFrameStep('hand pinch',pollDemoHandPinch);
            runXrFrameStep('LIM hover',syncImmersiveLimHover);
            runXrFrameStep('LIM activation',()=>tickLimActivation(_time));
            runXrFrameStep('Control panel update',()=>infoPanel?.update(viewerMatrix, _time, latestControllerRay, frame));
            runXrFrameStep('panel diagnostic',()=>{
                if(!limPanelDiagnosticRecorded && infoPanel?.getPosition?.()){
                    limDiagnostic('companion-panel-position',infoPanel.getPosition());
                    limPanelDiagnosticRecorded=true;
                }
            });
            runXrFrameStep('PIM hold',()=>pimHold?.tick(_time));
            runXrFrameStep('held element update',()=>{if(!demoKnowledgeWorkspace)updateHeldDemoRecordPosition();});
            let layer=null;
            try { layer=frame.session.renderState.baseLayer; }
            catch(error){reportDemoRenderFailure(error,'XR framebuffer');return;}
            if(!layer){reportDemoRenderFailure(new Error('XR base layer unavailable.'),'XR framebuffer');return;}
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
                runXrFrameStep('startup surface',()=>drawXrRecoverySurface(view));
                runXrFrameStep('rain render',()=>drawSpatialRain(view, _time));
                runXrFrameStep('ambient render',()=>drawSpatialAmbientLife(view));
                if(runXrFrameStep('marker render',()=>drawMarker(view)))markXrFirstContentRendered();
                runXrFrameStep('PIM render',()=>drawDemoKnowledge(view));
                runXrFrameStep('Control panel render',()=>infoPanel?.draw(view));
                if(xrRecoveryStatus==='failed')runXrFrameStep('recovery surface',()=>drawXrRecoverySurface(view));
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
    if (isDesktopLearningBookTarget()) {
        app.innerHTML = `<div class="screen ar-safety-screen nxr-desktop-ar-choice" data-desktop-ar-choice>
            <div class="page-header"><p class="welcome-label">NourishlandXR · desktop introduction</p><h1>See how NLXR works</h1><p class="subtitle">Start with a place, follow its plant information, then see how learning can guide practical action. On desktop, we recommend this plain, interactive introduction.</p></div>
            <div class="nxr-desktop-ar-options">
                <section class="panel nxr-desktop-ar-option is-recommended"><span class="nxr-desktop-ar-tag">RECOMMENDED ON DESKTOP</span><h2>NLXR introduction</h2><p>A short, practical tour of Projects, Areas, directional Totems, plant information, learning, connected databases and field guides. PIMO and LIMO open on a flat canvas with explanations beside them.</p><button class="primary" type="button" data-desktop-learning-book>Start the introduction</button></section>
                <section class="panel nxr-desktop-ar-option"><span class="nxr-desktop-ar-tag">OPTIONAL · WEBXR OR EMULATOR</span><h2>AR introduction</h2><p>Open the plain browser version, or use a WebXR-capable browser or emulator. The immersive experience is designed for compatible phones and headsets; we do not recommend this route for ordinary desktop use.</p><button type="button" data-desktop-plain-ar>Open AR introduction</button></section>
            </div><button class="nxr-desktop-ar-back" type="button" data-desktop-ar-back>← Back to welcome</button>
        </div>`;
        app.querySelector('[data-desktop-learning-book]')?.addEventListener('click', () => renderDesktopLearningBook(app, { moringaDocument: MORINGA_PIM, onExit: () => window.renderLaunchScreen?.() }), { once: true });
        app.querySelector('[data-desktop-plain-ar]')?.addEventListener('click', () => {
            if (shouldSkipArIntroductionPreparation()) startTemporaryArDemo(app);
            else renderArIntroductionPreparation(app, { onContinue: () => startTemporaryArDemo(app), onCancel: () => openTemporaryArDemoWindow(app) });
        }, { once: true });
        app.querySelector('[data-desktop-ar-back]')?.addEventListener('click', () => window.renderLaunchScreen?.(), { once: true });
        return;
    }
    if (shouldSkipArIntroductionPreparation()) return startTemporaryArDemo(app);
    renderArIntroductionPreparation(app, {
        onContinue: () => startTemporaryArDemo(app),
        onCancel: () => window.renderLaunchScreen?.()
    });
}

export async function startTemporaryArDemo(app) {
    appRoot = app;
    limDiagnostic('device-context',limDeviceContext(navigator.maxTouchPoints ? 'touch-capable' : 'mouse'));
    clearSessionState();
    demoExitLifecycle.reset();
    const immersive = await startImmersive();
    if (!immersive) {
        renderInterface(true);
        viewerMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    }
}
