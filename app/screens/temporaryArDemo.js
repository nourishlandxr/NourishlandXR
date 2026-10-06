import {selectKnowledgeObjectFace} from '../services/knowledgeObjectModel.js';
import {selectExplorerNode,explorerDetailDocument,explorerSelectedPath} from '../services/explorerMoleculeModel.js';
import {DEMO_GUIDED_COPY,guidedDemoStep} from '../features/ar-demo/demoJourneyContent.js';
import {createDemoLivingMapConcept,createDemoLivingMapPlayback,createDemoLivingMapPlacement,livingMapDropAccepted,demoLivingMapProgress,LIVING_MAP_ORB_SETTLE_MS} from '../services/demoLivingMapModel.js';
import {createDemoLivingMapScene} from '../services/demoLivingMapScene.js';
import {livingMapReveal,drawLivingMapPreview,livingMapWorldPoint,livingMapRayPoint,livingMapWorldDropAccepted,livingMapRotation} from '../services/demoLivingMapReveal.js';
import {createDemoLivingMapXR} from '../services/demoLivingMapXR.js';
import {livingMapPlacementCopy,resetDemoPlantForMap} from '../services/demoLivingMapPresentation.js';
import {createLivingMapGripInput,limitLivingMapTilt} from '../services/demoLivingMapGrip.js';
import {drawLivingFrameButton,applyLivingFrameButtonSampling} from '../services/livingFrameButton.js';
let demoLivingMapScene=null,demoLivingMapStartedAt=0,demoLivingMapPreviewClock=null;
let demoLivingMapPlacement=null;
let demoLivingMapXR=null,demoLivingMapOrigin=null,demoLivingMapOrientation={x:0,y:0,z:0,w:1},demoLivingMapGrip=null,demoMapNarrationCount=-1;
function disposeSpatialLivingMap(){demoLivingMapGrip?.reset();demoLivingMapXR?.destroy();demoLivingMapXR=null;demoLivingMapOrigin=null;demoLivingMapOrientation={x:0,y:0,z:0,w:1};appRoot?.querySelector('[data-spatial-living-map]')?.remove();}
function demoLivingMapReady(){return livingMapReveal(demoLivingMapElapsed()).ready;}
function setDemoLivingMapRotation(value){const q=limitLivingMapTilt(value);demoLivingMapOrientation={x:q.x,y:q.y,z:q.z,w:q.w};demoLivingMapScene?.setRotation(q);introBoardTextureDirty=true;}
function rotateDemoLivingMap(delta,tilt=0){if(!simulatedMode || !demoLivingMapReady())return;const q=livingMapRotation(delta).multiply(livingMapRotation(demoLivingMapOrientation));if(tilt)q.multiply({x:Math.sin(tilt/2),y:0,z:0,w:Math.cos(tilt/2)});setDemoLivingMapRotation(q);paintWelcomeLayer(performance.now());}
function updateSpatialLivingMap(now){
    if(introBoardStep!=='UTILITY 1.1' || !demoLivingMapScene)return null;
    const elapsed=demoLivingMapElapsed(now),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,reveal=livingMapReveal(elapsed,reduced);
    if(reveal.appear>0 && !demoLivingMapOrigin && viewerMatrix){
        const m=viewerMatrix,length=Math.hypot(m[8],m[10]) || 1;
        demoLivingMapOrigin={x:m[12]-m[8]/length*1.15,y:m[13]-.55,z:m[14]-m[10]/length*1.15};
    }
    if(reveal.ready && !markers.some(record=>record.demoMapPiece) && demoLivingMapPlacement?.current(elapsed))spawnDemoMapTotem();
    const placedCount=demoLivingMapPlacement?.snapshot().length || 0;
    if(reveal.ready && demoMapNarrationCount!==placedCount){
        clearDemoNarration();demoMapNarrationCount=placedCount;
        introBoardBody=introBoardVisibleBody=demoLocalizedText(livingMapPlacementCopy(placedCount));
        introBoardParagraphFadeStartedAt=now;introBoardParagraphFadeTimes=[now];introBoardTextureDirty=true;
        const text=appRoot?.querySelector('[data-tryit-guided-choice] .tryit-board-text-window');
        if(text){text.innerHTML='<p class="is-revealed"></p>';text.querySelector('p').textContent=introBoardVisibleBody;}
    }
    const surface=appRoot?.querySelector('[data-spatial-living-map]');
    appRoot?.querySelector('.tryit-demo')?.setAttribute('data-landscape-revealed',String(reveal.appear>.1));
    const instructions=appRoot?.querySelector('[data-living-map-instructions]');
    if(instructions){const text=demoLocalizedText(demoLivingMapScene.guidance(elapsed))+' · '+demoLocalizedText('Grip both opposite edges to carry, turn and gently tilt. Release either grip to leave it in place.');if(instructions.textContent!==text)instructions.textContent=text;}
    if(surface){surface.style.opacity=String(reveal.appear);surface.style.pointerEvents=reveal.ready?'auto':'none';surface.setAttribute('aria-hidden',String(!reveal.ready));const place=surface.querySelector('[data-spatial-place]');if(place)place.disabled=!reveal.ready || !demoLivingMapPlacement?.current(elapsed);}
    return {elapsed,reduced,reveal};
}
const DEMO_MAP_RECT=Object.freeze({x:420,y:300,width:560,height:400});
const demoLivingMapPlayback=createDemoLivingMapPlayback();
let demoLivingMapWasPlaying=false;
function demoLivingMapElapsed(now=performance.now()){
    if(demoLivingMapPlacement)return Math.max(0,now-demoLivingMapStartedAt);
    return demoLivingMapPreviewClock ? demoLivingMapPreviewClock(now,demoLivingMapStartedAt) : demoLivingMapPlayback.elapsed(now);
}
function demoLivingMapIsPlaying(now){
    if(demoLivingMapPlacement){const placed=demoLivingMapPlacement.snapshot();return Boolean(demoLivingMapPlacement.current(now-demoLivingMapStartedAt) || now-demoLivingMapStartedAt<(placed.at(-1)?.at || 0)+2800);}
    const playing=demoLivingMapPlayback.playing(now);
    if(playing!==demoLivingMapWasPlaying){demoLivingMapWasPlaying=playing;introBoardTextureDirty=true;syncDemoPanelActions();}
    return playing;
}
import {supportsSpatialPIMO} from '../services/pimoSpatialCapabilities.js';
import {knowledgeExplorer,knowledgeExplorerOptions,knowledgeExplorerAction,preserveKnowledgeContext} from '../services/knowledgeExplorer.js';
import {createKnowledgeSpatialRenderer} from '../services/knowledgeSpatialRenderer.js';
import {mountKnowledgeDesktopView,disposeKnowledgeDesktopViews} from '../services/knowledgeDesktopView.js';
import {createHeroDiceToy} from '../services/heroDiceToy.js';
let knowledgeRenderer=null,heroDiceToy=null;
import {INSECT_VISUALS,beeFlowerVisit,beeCuriosity,keepInsectAboveFloor} from '../services/demoInsectFlight.js';
import {demoTotemHeightForScreen,shiftDemoAreaToFloor} from '../services/demoFloorPlacement.js';
import {createDemoFeedback,DEMO_FEEDBACK} from '../services/demoFeedback.js';
let demoFeedback=null,demoFeedbackInputSource=null;
import {BEE_COUNT} from '../services/demoAmbientLife.js';
import {demoButterflyPose,butterflyDropSurface} from '../services/demoButterflyPose.js';
import {arAssetsReady,prepareArAssets} from '../services/arAssetPreparation.js';
import {createSpatialRainRenderer,drawSpatialRainField,destroySpatialRainRenderer} from '../services/spatialRainRenderer.js';
import {selectTotemSign,selectedTotemDestinationIds,drawSignDestinationHighlight,totemNotificationLight} from '../services/totemSignSelection.js';
import {LIM_ALL_CELLS,LIM_CELL_BY_ID,LIM_INTRO_CELL_BY_ID,LIM_PATHWAYS,limLearningContent} from '../services/limLearning.js';
import { createPimInfoPanel } from '../services/pimInfoPanel.js';
import { avoidDemoPanelOverlap } from '../services/demoPanelGeometry.js';
import { createLimActivationController } from '../services/limActivation.js';
import { advanceLimPathway, backLimPathway, completeLimPathway, idleLimPathwayState, loadLimPathwayState, pauseLimPathway, resumeLimPathway, saveLimPathwayState, startLimPathway, visitLimPathwayCell } from '../services/limPathwayState.js';
import { bindSpatialPimHold } from '../services/pimActivationHold.js';
import { createPlantKnowledgeResolver, totemKnowledgeCards, liveOrbCrownMarkup } from '../services/spatialKnowledgePresentation.js';
import { createSpatialTotemCards, drawSpatialTotemButtons, drawSpatialTotemPlaques, resolveTotemNavigation, totemLayoutForRecord } from '../services/spatialTotemCards.js';
const resolveOrbKnowledge = createPlantKnowledgeResolver();
import {drawArWelcomePanel,WELCOME_RIM_MOTION,WELCOME_SHAPE} from '../services/arWelcomePanel.js';
import { livingFrameFlowerSites, WELCOME_ROOT_MILESTONES, WELCOME_ROOT_REFRESH_MS, advanceWelcomeRootProgress, welcomeRootsNeedRefresh } from '../services/arWelcomeRoots.js';
import {createWelcomePresentationClock,AR_WELCOME_SHOWCASE_DURATION,AR_WELCOME_OPENING_MS,AR_WELCOME_REDUCED_OPENING_MS,drawArWelcomeShowcase,createArWelcomeClusters,welcomeExperienceFrames,welcomeCellAtPoint,welcomeRelationshipFor,welcomeRevealIsAnimating} from '../services/arWelcomeShowcase.js';
/**
 * TRY IT NOW — a deliberately small, self-contained AR placement demo.
 * It never opens a dashboard or a draggable window before placement.
 */
import { createMinimalMarkerDraft, relateMinimalMarkers } from '../services/markerWorkflow.js';
import { placementPointerMarkup } from '../services/placementPointer.js';
import { spatialDepthDelta, spatialMoveControlMarkup } from '../services/spatialMoveControl.js';
import { beePointerAvoidance, beePointerContact, beeWingsAtRest, demoBeePose, demoBeeEncounter } from '../services/demoAmbientLife.js';
import { createSpatialSphereRenderer, destroySpatialSphereRenderer, drawSpatialOrb, drawSpatialSphere } from '../services/spatialSphereRenderer.js';
import { SPATIAL_OBJECT_VISUALS, spatialTransitionProgress } from '../services/spatialObjectVisuals.js';
import { createSpatialTetherRenderer, destroySpatialTetherRenderer, drawSpatialPointerContact, drawSpatialGroundArrowPath, drawSpatialTether } from '../services/spatialTetherRenderer.js';
import { createSpatialPrismRenderer, destroySpatialPrismRenderer, drawSpatialPrism } from '../services/spatialPrismRenderer.js';
import { createSpatialTotemSculpture, destroySpatialTotemSculpture, drawTotemSculpture } from '../services/spatialTotemSculpture.js';
import { createSpatialTriangleRenderer, destroySpatialTriangleRenderer, drawSpatialTriangle } from '../services/spatialTriangleRenderer.js';
import { AR_EXPERIENCE_CONFIG } from '../services/arExperienceConfig.js';
import { PIGEON_PEA_AR_KNOWLEDGE, PIGEON_PEA_EXAMPLE } from '../services/pigeonPeaExample.js';
import { currentNxrLanguage, translateNxrText, translateApp, localizedCanvasContext } from '../services/i18n.js';
import { getSpatialVisualSettings, currentTotemModel, currentCellOpacity, currentRainQuality, RAIN_QUALITIES } from '../services/spatialVisualSettings.js';
import { createXRPerformanceSettings } from '../services/xrPerformanceSettings.js';
import { isQuestHeadsetBrowser, requestImmersiveArSession } from '../services/webxrSession.js';
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
import { controllerRayEnd, controllerRayFromPose, createControllerYSkipTracker, handTrackingState, beginHandTrackingFrame, XR_LASER_POINTER_CONFIG } from '../services/xrPointer.js';
import { createXRHandOutline } from '../services/xrHandOutline.js';
import { createHandSurfaceInteraction } from '../services/handSurfaceInteraction.js';
import { hitTotemPoint } from '../services/spatialTotemCards.js';
import { spatialNoteTemplate } from '../services/spatialNoteTemplates.js';
import {spatialNoteEnabled,noteStarter} from '../services/spatialNotes.js';
import {mountSpatialNoteEditor} from '../services/noteEditorDialog.js';
import {focusSpatialObjectControls} from '../services/spatialObjectControls.js';
import {renderedTotemStyle} from '../services/totemAppearance.js';
import {createNoteSpatialRenderer} from '../services/noteSpatialRenderer.js';
import {captureDemoScene,restoreDemoScene} from '../services/demoSceneHistory.js';
let demoNoteRenderer=null;
const demoPlacedNoteViews=new Map();
function disposeDemoPlacedNotes(){for(const view of demoPlacedNoteViews.values()){view.renderer.destroy();view.workspace.destroy();view.root.remove();}demoPlacedNoteViews.clear();}
function demoNoteHit(ray){return [...demoPlacedNoteViews.values()].filter(view=>markers.includes(view.record) && demoAreaVisible(view.record) && !view.record.demoHiddenForLimo).map(view=>{const hit=view.renderer.hit(ray);return hit?{...hit,noteRenderer:view.renderer}:null;}).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0] || null;}
import { PIM_SPATIAL_CONFIG, PIM_SPATIAL_LAYOUT_OPTIONS, pimCreateInteractionState, pimNodeAtPath, pimNodeChildren, pimResetInteractionState, pimSpatialPanel, pimSpatialPoseAboveAnchor, pimToggleNodeState, pimViewportSafeArea, pimVisibleNodes, pimNodeVisualPosition } from '../services/plantInformationMesh.js';
import { PIM_BLOOM_DURATION_MS, PIM_TEXTURE_SIZE, createPlantInformationHoneycombTexture, pimHoneycombTargetAtPercent, pimHoneycombTextureSize } from '../services/plantInformationMeshCanvas.js?v=0.9001';
import { resolvePlantPim } from '../services/pimLegacyAdapter.js';
import { pimToArKnowledge } from '../services/pimModel.js';
import { mountCreatorArKnowledge } from '../services/creatorArKnowledge.js';
import { createSpatialDashboardMirror, spatialDashboardPanelFromViewer, spatialDashboardPanelMatrix, spatialDashboardRayHit } from '../services/spatialDashboardMirror.js';
import {mountDemoNoteShowcase,demoNoteWidgetPlacement} from '../services/demoNoteShowcase.js';
import {noteSurfaceOwnsRay} from '../services/demoNoteRouting.js';
import {rebaseDemoRecords,rebaseXrPoint,rebaseXrPose,rebaseXrMatrix} from '../services/xrWorldRebase.js';
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
const demoPerformance=createXRPerformanceSettings({getSession:()=>session,publish:value=>infoPanel?.setXRPerformance(value)});
let measureXrFrame=false;
function publishDemoPerformance(){demoPerformance.publish();}
function handleDemoPerformanceAction(action){return demoPerformance.action(action);}
let sessionMode = 'immersive-ar';
let domOverlayEnabled = false;
let canvas = null;
let gl = null;
let referenceSpace = null;
let referenceSpaceHasFloor=false;
let hitTestSource = null;
let viewerMatrix = null;
let lastViewerPoseAt = 0;
let latestDemoView = null;
let hitMatrix = null;
let latestControllerRay = null;
let demoPointerRays = [];
let latestHandState = null;
let latestTrackedHandStates = [];
let demoHandMode = getSpatialVisualSettings().handMode;
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
let rainRenderer=null;
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
let demoInteractionTasks=new Set();
const DEMO_INTERACTION_TASKS=[{id:'place',label:'Place Orb'},{id:'open',label:'Open Orb'},{id:'expand',label:'Expand a cell'}];
function syncDemoInteractionTasks(successAt=0){infoPanel?.setTaskProgress({steps:DEMO_INTERACTION_TASKS.map(task=>({...task,complete:demoInteractionTasks.has(task.id)})),successAt});}
function completeDemoInteractionTask(id){if(demoInteractionTasks.has(id))return;demoInteractionTasks.add(id);syncDemoInteractionTasks(performance.now());demoFeedback?.sound('placement');}
function showDemoInfo(record,path) {
    clearLimSelection();
    const document=demoOrbKnowledge(record).document;
    infoPanel?.select(record,document,path);
    const ownerId=demoMeshOwnerId(record,document);
    meshSourceResolver.registerPimDocument(document,{ownerId});
    const selectedNode=document.nodes?.find(node=>node.id===path || node.path===path);
    if(record.tutorialStage==='plant' && !record.demoProfileInteracted && document.nodes?.some(node=>node.parentId===selectedNode?.id))completeDemoInteractionTask('expand');
    try{meshComposition.setActiveRef(pimMeshRef(document,selectedNode?.id,{ownerId,specimenId:String(record?.id || ownerId)}));}catch{meshComposition.setActiveRef(null);}
    const bridge=pimLimBridgeFor(document,path);
    activePimLimBridge=bridge?{bridge,record}:null;
    if(record.tutorialStage==='plant' && !record.demoProfileInteracted && record.knowledgeExplorer?.mode==='curiosity' && ['uses','culinary','fresh-peas'].includes(selectedNode?.id)){
        record.demoGuidedNodeId=selectedNode.id;
        showPersistentPimPrompt(record);
    }
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
    const started=measureXrFrame?performance.now():0;
    try { operation();return true; }
    catch(error){
        xrDisabledFrameSteps.add(phase);
        reportDemoRenderFailure(error,phase);
        return false;
    }
    finally{if(measureXrFrame)demoPerformance.recordCpuCost(phase,performance.now()-started);}
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
let handOutlineRenderer = null;
let nearHandInteraction=null,handHoverRecord=null;
let prismRenderer = null;
let totemSculptureRenderer = null;
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
let arWelcomeClockFrame=-Infinity;
let arWelcomeRootMilestone=WELCOME_ROOT_MILESTONES.arrival, arWelcomeRootMilestoneStartedAt=0, arWelcomeRootsLastRefreshAt=-Infinity;
let arWelcomeStartedAt=0, arWelcomeIntroPending=false, arWelcomeSharedBoard=false;
let limMeshActivatedAt=NaN,arWelcomeOpeningActive=false,arWelcomeOpeningDuration=AR_WELCOME_OPENING_MS,arWelcomeOpeningSeed=0;
let arWelcomeRenderedFrames=[];
let arWelcomeUnlockTimer=null, arWelcomeLayer=null, arWelcomeCanvas=null;
let nativeConnectionState=null,nativeLimHoldPointer=null,nativeConnectionEffect=null,nativeConnectionEffectLastAt=0;
let butterflyCompanions=[];
let ambientBeeAvoidanceTime=[];
let ambientEncounterSeed=Math.floor(Math.random()*10000);
let ambientCanvas=null,ambientBeeModel=null,ambientBeeSpriteTexture=null,ambientBeeSpriteUploadedAt=-Infinity,ambientBeesStartedAt=NaN,ambientWorldAnchor=null,ambientWorldFrame=null,ambientEncounterOrigin=null,ambientBeeAvoidance=[],ambientBeeReturn=[],ambientBeeFlowerVisits=[],ambientLastPaint=0;
let rainV2Canvas=null,rainV2LastPaint=0;
let demoRainIntensity=RAIN_QUALITIES[currentRainQuality()].intensity;
let demoRainStyle=RAIN_QUALITIES[currentRainQuality()].style;
let demoCloseStageWasInert=false;
let demoCellOpacity=getSpatialVisualSettings().cellOpacity;
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
let introBoardParagraphFadeStartedAt=-Infinity;
let introBoardParagraphFadeTimes=[];
let introOpeningCopySkipped=false;
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
const welcomeBoardParagraphs = () => WELCOME_BOARD_PARAGRAPHS.map(demoLocalizedText);
const demoIsPortuguese = () => currentNxrLanguage() === 'pt-PT';
const demoIsDutch = () => currentNxrLanguage() === 'nl-NL';
const demoIntroLabel = () => arWelcomeOpeningActive?'NourishlandXR':introBoardStep || 'Sample demo';
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
function pulseDemoHaptics(inputSource=null,held=false){
    demoFeedback?.pulse(inputSource || demoFeedbackInputSource,held?DEMO_FEEDBACK.holdStrength:DEMO_FEEDBACK.selectionStrength,held?100:35);
}
const knowledgeFor = record => record.demoKnowledgeProjection || (record.demoPlantPreset === 'moringa' ? MORINGA_KNOWLEDGE : PIGEON_PEA_AR_KNOWLEDGE);
const demoSpatialPimLayoutOptions = record => ({ ...PIM_SPATIAL_LAYOUT_OPTIONS,...(record?knowledgeExplorerOptions(record):{}) });
function demoPimSurfaceSize(record) {
    const knowledge=knowledgeFor(record), expanded=demoPimExpandedNodeIds(record), key=JSON.stringify([expanded,record.knowledgeExplorer?.revision,record.demoSelectedNodeId]);
    if(record.pimSurfaceCache?.knowledge===knowledge && record.pimSurfaceCache.key===key) return record.pimSurfaceCache.size;
    const size=pimHoneycombTextureSize(knowledge, expanded, {
        ...demoSpatialPimLayoutOptions(record),
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
    // Placed Notes survive slide changes, never a new demo visit.
    if(demoNoteRenderer){demoNoteRenderer=null;demoKnowledgeWorkspace=null;demoKnowledgeRoot=null;}
    disposeDemoPlacedNotes();
    disposeSpatialLivingMap();demoLivingMapGrip?.destroy();demoLivingMapGrip=null;demoLivingMapScene?.dispose();demoLivingMapScene=null;demoLivingMapStartedAt=0;demoLivingMapPreviewClock=null;
    demoLivingMapPlayback.reset(performance.now());demoLivingMapWasPlaying=false;demoLivingMapPlacement=null;
    markers.forEach(preserveKnowledgeContext);
    disposeKnowledgeDesktopViews(appRoot);
    demoFeedback?.destroy();demoFeedback=null;demoFeedbackInputSource=null;
    appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-lim-opening');
    appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-lim-surface');
    closeDemoKnowledge(true);
    demoPanelControlsCleanup();demoPanelControlsCleanup=()=>{};demoPanelActionSignature='';elementPanelActionSignature='';contextCellKey='';demoPimHover={record:null,path:''};demoOrientationStep=-1;demoControllerYSkipTracker?.reset();demoControllerYSkipTracker=null;limMeshVisible=true;demoCellOpacity=getSpatialVisualSettings().cellOpacity;learningModule=null;learningModuleStep=0;activePimLimBridge=null;demoJourneyStage='why';demoRenderFailureReported=false;
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
    demoHandMode = getSpatialVisualSettings().handMode;
    spatialPointerInputSeen = false;
    groundYEstimate = null;referenceSpaceHasFloor=false;
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
    for(const insect of butterflyCompanions){insect.model?.destroy();insect.canvas?.remove();}butterflyCompanions=[];
    ambientBeeModel?.destroy();ambientBeeModel=null;if(ambientBeeSpriteTexture)gl?.deleteTexture(ambientBeeSpriteTexture);ambientBeeSpriteTexture=null;ambientBeeSpriteUploadedAt=-Infinity;ambientCanvas=null;ambientBeesStartedAt=NaN;ambientWorldAnchor=null;ambientWorldFrame=null;ambientEncounterOrigin=null;ambientBeeAvoidance=[];ambientBeeReturn=[];ambientBeeFlowerVisits=[];ambientBeeAvoidanceTime=[];ambientLastPaint=0;rainV2Canvas=null;rainV2LastPaint=0;
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
    destroySpatialRainRenderer(gl,rainRenderer);rainRenderer=null;
    totemCardsRenderer?.destroy(); totemCardsRenderer = null;knowledgeRenderer?.destroy();knowledgeRenderer=null;heroDiceToy?.destroy();heroDiceToy=null;
    pimHold?.destroy(); pimHold = null; infoPanel?.destroy(); infoPanel = null;
    destroySpatialTetherRenderer(gl, tetherRenderer);
    handOutlineRenderer?.destroy();handOutlineRenderer=null;
    nearHandInteraction?.destroy();nearHandInteraction=null;
    destroySpatialPrismRenderer(gl, prismRenderer);
    destroySpatialTotemSculpture(gl, totemSculptureRenderer);
    destroySpatialTriangleRenderer(gl, triangleRenderer);
    sphereRenderer = null;
    tetherRenderer = null;
    prismRenderer = null;
    totemSculptureRenderer = null;
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
    if(introBoardStep==='UTILITY 1.1')actions.push(
        ...(demoLivingMapReady() && demoLivingMapPlacement?.current(demoLivingMapElapsed())?[{id:'place-map',label:'Place Totem'}]:[]),
        {id:'replay-map',label:'Replay living map'}
    );
    if(introBoardStep==='LEARNING 1.6')actions.push({id:'finish-core',label:'Finish without learning example'});
    const desktopDemo=Boolean(appRoot?.querySelector('.tryit-demo.is-desktop-spatial-preview'));
    if(simulatedMode && demoControlIsVisible('[data-tryit-open-live-tag]'))actions.push({id:'live-tag',label:'Open Plant Live Tag'});
    actions.push({id:'back',label:'‹',ariaLabel:'Previous',description:'Previous',disabled:!(demoSlideHistoryIndex>0 || demoOrientationStep>0 && demoTutorialStep===DEMO_TUTORIAL_STEPS.WELCOME)});
    actions.push({id:'forward',label:'›',ariaLabel:'Next slide',description:'Next',disabled:!(demoSlideHistoryIndex>=0 && demoSlideHistoryIndex<demoSlideHistory.length-1)});
    if(activePimLimBridge && demoTutorialStep===DEMO_TUTORIAL_STEPS.PIM)actions.push({id:'pim-lim',label:'Why does this matter?'});
    if(arWelcomeShowcaseActive && demoJourneyStage==='apply')actions.push({id:'lim-visibility',label:limMeshVisible?'Hide learning cells':'Show learning cells'});
    if(!desktopDemo)actions.push({id:'safety',label:'Safety guidance'});
    if(simulatedMode && isQuestHeadsetBrowser())actions.push({id:'quest',label:questLaunchPending?'Opening Spatial device…':'Enter Spatial device',disabled:questLaunchPending});
    actions.push({id:'close',label:'Close demo'});
    const continueButton=appRoot?.querySelector('[data-tryit-intro-continue]');
    const firstProfile=demoTutorialStep===DEMO_TUTORIAL_STEPS.PIM && markers.some(record=>record.tutorialStage==='plant' && record.demoExpanded && !record.demoProfileInteracted);
    if(continueButton && !continueButton.hidden)actions.push({id:'continue',label:continueButton.textContent.trim() || 'Continue',primary:true,disabled:continueButton.disabled});
    const navigation=actions.filter(item=>item.id==='back' || item.id==='forward');
    const priorities=actions.filter(item=>item.id==='close' || item.id==='continue');
    const ordinary=actions.filter(item=>!navigation.includes(item) && !priorities.includes(item));
    const slots=Math.max(0,8-navigation.length-priorities.length);
    return [...navigation,...(slots?ordinary.slice(-slots):[]),...priorities];
}

function syncDemoPanelActions() {
    const mapPlay=appRoot?.querySelector('[data-demo-map-play]');
    if(mapPlay){const label=demoLivingMapPlayback.playing(performance.now())?'Pause living map':'Play living map';if(mapPlay.textContent!==label)mapPlay.textContent=label;}
    if(!infoPanel)return;
    const actions=demoPanelActions(),signature=JSON.stringify(actions);
    // Exit confirmation stays in the panel beside Keep demo open; the stage
    // is inert while confirming, so an external action can become unreachable.
    const primary=demoExitLifecycle.state===DEMO_EXIT_STATES.IDLE?actions.find(item=>item.id==='continue'):null;
    const externalTrigger=simulatedMode || domOverlayEnabled;
    const trigger=appRoot?.querySelector('[data-tryit-context-trigger]');
    if(trigger){trigger.hidden=!(externalTrigger && primary);trigger.disabled=Boolean(primary?.disabled);trigger.dataset.contextMode=primary?.id || '';trigger.textContent=primary?.label || '';trigger.setAttribute('aria-label',primary?.label || 'Context action');
        const board=appRoot?.querySelector('[data-tryit-guided-choice]');
        const mainScreen=introBoardStep.startsWith('UTILITY ') && simulatedMode ? board : arWelcomeLayer || board;
        // Desktop preview keeps the action on its rendered surface. Phone AR
        // uses the safe-area footer so the action never obscures the scene.
        const desktopPreview=Boolean(appRoot?.querySelector('.tryit-demo.is-desktop-spatial-preview'));
        const utilityCard=introBoardStep.startsWith('UTILITY ');
        const phoneFooterAction=simulatedMode && !desktopPreview && !utilityCard;
        trigger.classList.toggle('is-phone-footer-action',phoneFooterAction);
        if(simulatedMode && primary?.id==='continue' && mainScreen && (desktopPreview || utilityCard))mainScreen.append(trigger);
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
    demoFeedback?.sound('menu');
    if(action==='close-cancel'){cancelDemoClose();return;}
    if(action==='close-confirm'){void confirmDemoClose();return;}
    if(action==='close'){requestDemoClose();return;}
    if(action==='finish-core'){showDemoClosingMessage();return;}
    if(demoExitLifecycle.state!==DEMO_EXIT_STATES.IDLE)return;
    if(action==='place-map'){placeDemoMapTotem(true);return;}
    if(action==='rotate-map-left' || action==='rotate-map-right'){rotateDemoLivingMap(action==='rotate-map-left'?-.35:.35);return;}
    if(action==='replay-map' && demoLivingMapPlacement){
        demoLivingMapPlacement.reset();demoLivingMapGrip?.reset();setDemoLivingMapRotation({x:0,y:0,z:0,w:1});demoLivingMapOrigin=null;demoLivingMapStartedAt=performance.now();spawnDemoMapTotem();setGuide(guidedDemoStep('UTILITY 1.1').hint);syncDemoPanelActions();return;
    }
    if(action==='replay-map' || action==='play-map'){
        const now=performance.now();
        if(action==='replay-map'){demoLivingMapStartedAt=now;demoLivingMapPlayback.reset(now,true);}
        else if(demoLivingMapPlayback.playing(now))demoLivingMapPlayback.pause(now);
        else demoLivingMapPlayback.play(now);
        introBoardTextureDirty=true;paintWelcomeLayer(now);syncDemoPanelActions();return;
    }
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
    armDemoPlacement(nextStage,{explained:true});
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
    infoPanel?.setTaskProgress(null);
    record.demoPimoLesson='done';
    knowledgeExplorerAction(record,'KnowledgeMode:curiosity');
    refreshDemoPimProfile(record);infoPanel?.refreshExplorer({mode:'curiosity'});knowledgeRenderer?.clear(record);
    record.demoProfileInteracted = true;
    record.demoProfileReady = false;
    clearLimSelection();limMeshVisible=false;activePimLimBridge=null;
    finishIntroBoard();
    if(record.tutorialStage==='plant')showDemoPanelIntroduction(record);
    else showDemoAction('note');
    return true;
}

function showDemoPanelIntroduction(record,index=0){
    const id=index===0?'PANEL 1.1':'PANEL 1.2',step=guidedDemoStep(id);
    infoPanel?.setMediaCollapsed(index!==0);
    infoPanel?.setExplorerOpen(index!==0);
    infoPanel?.setSettingsOpen(false);
    showIntroBoard(step.title,step.main,index===0?'View choices':'Continue',()=>{
        if(index===0){showDemoPanelIntroduction(record,1);return;}
        knowledgeExplorerAction(record,'KnowledgeMode:curiosity');infoPanel?.refreshExplorer({mode:'curiosity'});knowledgeRenderer?.clear(record);
        infoPanel?.setExplorerOpen(false);infoPanel?.setSettingsOpen(false);
        showIntroBoard('Play with the environment',['Take a moment to settle into this place. Natural spaces and extended reality can invite observation, discovery and play.','Try holding the Hero Dice. A butterfly can be caught with Trigger when it crosses your laser. Release it in the air to keep flying, or near a panel or cell to let it rest briefly.'],'Continue',()=>showDemoAction('plant2'),{stepLabel:'PLAY 1.1',nextGuide:'Grip moves objects. Trigger catches butterflies. Joystick up moves farther; down moves nearer.'});
    },{stepLabel:id,nextGuide:step.hint,keepPanel:true});
    infoPanel?.guideTool(index===0?'ToggleMedia':'Explorer');
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
    if(record.demoMapPiece)return [];
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
    const pendingNeighbour=!partner && record.tutorialStage==='totem';
    const destination=partner?.demoZoneName || (pendingNeighbour?'Second Area':'');
    const navigation=resolveTotemNavigation(record,partner,demoTotemRotationY(record));
    const neighbour=destination ? {id:'neighbour',eyebrow:'NEIGHBOUR TOTEM',title:pendingNeighbour?pointedTitle(destination,'left'):navigation.reliable?pointedTitle(destination,navigation.side):`Explore ${destination}`,summary:'',body:'Follow this sign to the neighbouring Totem.',boardSide:pendingNeighbour?'left':navigation.side,plaque:true,navigation:{...navigation,destinationId:partner?.id,pending:pendingNeighbour}} : null;
    return [header,...(neighbour ? [neighbour] : []),...plantSigns,
        ...(note ? [{id:`note-${note.id}`,eyebrow:'NOTE',title:pointedTitle(note.name,directionFor(note)),summary:'',body:(demoContentFor(note)?.lines || []).join(' · '),plaque:true,boardSide:directionFor(note),references:[note.id]}] : []),
    ].slice(0,5);
}
function demoAreaVisible(record) { return (introBoardStep!=='UTILITY 1.1' || Boolean(record.demoMapPiece)) && !record?.demoHiddenForLimo && demoAreaRecordVisible(record,markers); }

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
    if(cardId==='neighbour' && record.tutorialStage==='totem' && !markers.some(item=>item.tutorialStage==='totem2')){createDemoSecondTotem();record.totemSelectedCard='neighbour';updateSimulatedMarkers();return;}
    focusDemoObjectControls(record);
    selectTotemSign(record,cardId,markers);
    const card=demoTotemCards(record).find(item=>item.id===record.totemSelectedCard);
    const target=markers.find(item=>item.id===(card?.navigation?.destinationId || card?.references?.[0]));
    if(target){if(target.demoType==='zone')target.demoSignBeaconStartedAt=performance.now();setGuide(`Follow the ${card.boardSide || 'nearby'} sign to ${target.demoZoneName || target.name}. The destination is highlighted.`);}
    updateSimulatedMarkers();
}
function selectedDemoTotemTargets() {
    return selectedTotemDestinationIds(markers.filter(item=>item.demoType==='zone'),demoTotemCards,
        record=>demoAreaVisible(record) && !record.demoTotemFaded && record.demoTotemSignsVisible!==false);
}

function activateDemoTotemCard(hit) {
    if(!hit)return false;
    focusDemoObjectControls(hit.record);
    demoFeedback?.sound('totem');pulseDemoHaptics(demoGrabInputSource || limInputSource);
    infoPanel?.setMediaCollapsed(true);
    if(hit.card?.id==='__signs'){
        hit.record.demoTotemSignsVisible=!hit.record.demoTotemSignsVisible;
        hit.record.demoSignsChangedAt=performance.now();
        setDemoAreaFaded(hit.record,false);
        hit.record.totemSelectedCard='';
        hit.record.totemCardsRefreshed=0;
        focusDemoObjectControls(hit.record);
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
        boardTypingTimer = setTimeout(revealParagraph, 700);
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
    'SPACE 1.3':'A Project holds information for a real place. This demonstration uses prepared samples in the room around you.',
    'ELEMENTS 1.8':'This plant profile also has a standard web view. Keep exploring here, or open that view when you choose.',
    ...DEMO_GUIDED_COPY
});

function clearDemoNarration() {
    clearTimeout(boardTypingTimer);
    clearTimeout(boardTypingWatchdogTimer);
    skipDemoNarration=null;
    introBoardVisibleBody='';
    introBoardParagraphFadeTimes=[];
    introBoardTextureDirty=true;
    appRoot?.querySelectorAll('[data-tryit-guided-choice] .tryit-board-text-window p').forEach(paragraph=>{paragraph.textContent='';});
}

function showIntroBoard(title, body, buttonLabel, onContinue, options = {}) {
    if(!options.historyReplay && !options.keepPanel && options.stepLabel && !options.stepLabel.startsWith('PIMO') && options.tutorialStep!==DEMO_TUTORIAL_STEPS.PIM)infoPanel?.showLearning({title:'',hideTitle:true,body:'',discardPreviousImage:true});
    if(guidedDemoStep(options.stepLabel)?.act==='Meet the panel tools'){infoPanel?.guideTool('Explorer');infoPanel?.setContextualHint('Grip moves panels and objects. Trigger interacts with buttons and cells.');}
    appRoot?.querySelector('.tryit-demo')?.setAttribute('data-living-map',String(options.stepLabel==='UTILITY 1.1'));
    appRoot?.querySelector('.tryit-demo')?.setAttribute('data-demo-utility',String(Boolean(options.stepLabel?.startsWith('UTILITY '))));
    if(options.stepLabel==='UTILITY 1.1'){
        appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-lim-opening');
        if(!demoLivingMapPlacement){demoLivingMapPlacement=createDemoLivingMapPlacement();demoLivingMapStartedAt=performance.now();}
        demoLivingMapPlayback.reset(demoLivingMapStartedAt);
        if(!demoLivingMapScene)try{demoLivingMapScene=createDemoLivingMapScene(createDemoLivingMapConcept({interactive:true}),{placement:demoLivingMapPlacement});}catch(error){console.warn('Living map preview unavailable:',error);}
    }else if(demoLivingMapScene){clearDemoMapPiece();disposeSpatialLivingMap();demoLivingMapScene.dispose();demoLivingMapScene=null;demoLivingMapPlacement=null;}
    useSharedWelcomeBoard(true);
    setDemoTutorialStep(options.tutorialStep || DEMO_TUTORIAL_STEPS.GUIDED);
    const localizedTitle = demoLocalizedText(title);
    const quickAccessCopy=options.dynamicCopy?null:DEMO_QUICK_ACCESS_COPY[options.stepLabel];
    const paragraphs = (quickAccessCopy ? [quickAccessCopy] : Array.isArray(body) ? body : [body])
        .flatMap(value=>String(value || '').split(/\n\n+/))
        .map(value => demoLocalizedText(String(value || '').trim()))
        .flatMap(value=>{const parts=[];let part='';for(const word of value.split(/\s+/)){if(part && (part+' '+word).length>180){parts.push(part);part=word;}else part+=(part?' ':'')+word;}if(part)parts.push(part);return parts;})
        .filter(Boolean);
    const bodyText = paragraphs.join('\n\n');
    introSceneActive = true;
    introBoardStep = options.stepLabel || nextDemoSlideCode();
    introBoardTitle = localizedTitle;
    introBoardBody = bodyText;
    introBoardVisibleBody = '';
    introBoardParagraphFadeTimes=[];
    introBoardTextureDirty = true;
    clearTimeout(boardTypingTimer);
    clearTimeout(boardTypingWatchdogTimer);
    const board = appRoot?.querySelector('[data-tryit-guided-choice]');
    const continueButton = appRoot?.querySelector('[data-tryit-intro-continue]');
    const finalActions = appRoot?.querySelector('[data-tryit-final-actions]');
    board?.classList.toggle('is-living-map-board',options.stepLabel==='UTILITY 1.1');
    board?.classList.toggle('is-utility-board',Boolean(options.stepLabel?.startsWith('UTILITY ')));
    const deferContinueUntilCopyReady = Boolean(options.deferContinueUntilCopyReady);
    rememberDemoSlide({stepLabel:introBoardStep,title:localizedTitle,body:bodyText,buttonLabel,onContinue,options:{...options},kind:'intro'});
    let typingStartDelay = 900;
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
        introBoardParagraphFadeTimes=paragraphs.map(()=>-Infinity);
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
        introBoardParagraphFadeStartedAt=performance.now();introBoardParagraphFadeTimes[paragraphIndex-1]=introBoardParagraphFadeStartedAt;
        introBoardVisibleBody = paragraphs.slice(0, paragraphIndex).join('\n\n');
        introBoardTextureDirty = true;
        paintBoardParagraphs(introBoardVisibleBody);
        if (paragraphIndex >= paragraphs.length) {
            boardTypingTimer = setTimeout(finishTyping, demoParagraphReadingTime(paragraphs[paragraphIndex-1]));
            return;
        }
        boardTypingTimer = setTimeout(revealNextParagraph, demoParagraphReadingTime(paragraphs[paragraphIndex-1]));
    };
    skipDemoNarration = finishTyping;
    if (board) {
        // Tutorial updates may move the shared action onto this surface.
        // Preserve it immediately before replacing the card's content.
        const contextTrigger=board.querySelector('[data-tryit-context-trigger]');
        if(contextTrigger)appRoot.append(contextTrigger);
        board.classList.add('is-typing');
        board.classList.remove('is-copy-ready');
        board.innerHTML = `<small>${options.stepLabel?.startsWith('UTILITY ')?options.stepLabel:demoIntroLabel()}</small><h2>${localizedTitle}</h2><div class="tryit-board-text-window">${paragraphs.map(() => '<p></p>').join('')}</div>`;
        if(options.stepLabel?.startsWith('UTILITY ') && simulatedMode)board.classList.remove('is-lim-shared-surface');
        if(options.stepLabel==='UTILITY 1.1' && simulatedMode && demoLivingMapScene){
            board.classList.remove('is-lim-shared-surface');
            const instructions=document.createElement('p');instructions.dataset.livingMapInstructions='';instructions.className='tryit-map-caption';board.append(instructions);
            const map=document.createElement('canvas');map.dataset.demoLivingMap='';map.setAttribute('role','img');map.setAttribute('aria-label','3D garden. Place three Totems: entrance, open forest, then swales.');board.append(map);
            const replay=document.createElement('button');replay.type='button';replay.className='tryit-map-replay';replay.textContent='Replay living map';replay.onclick=()=>handleDemoPanelAction('replay-map');board.append(replay);
            const play=document.createElement('button');play.type='button';play.className='tryit-map-replay';play.dataset.demoMapPlace='';play.textContent='Place Totem';play.onclick=()=>placeDemoMapTotem(true);replay.before(play);
            map.addEventListener('pointerup',event=>{
                const target=demoLivingMapPlacement?.current(demoLivingMapElapsed());if(!target)return;
                const bounds=map.getBoundingClientRect(),rect={x:0,y:0,width:map.width,height:map.height};
                if(livingMapDropAccepted({x:(event.clientX-bounds.left)*map.width/bounds.width,y:(event.clientY-bounds.top)*map.height/bounds.height},demoLivingMapScene.project(target,rect),map.width*.075))placeDemoMapTotem(true);
            });
            appRoot.querySelector('[data-spatial-living-map]')?.remove();
            const spatial=document.createElement('section');spatial.dataset.spatialLivingMap='';spatial.className='tryit-spatial-living-map';spatial.setAttribute('aria-label','Rotatable miniature landscape');
            const landscape=document.createElement('canvas');landscape.dataset.spatialLandscape='';landscape.setAttribute('aria-label','Desktop preview: drag horizontally to turn, vertically to tilt. In XR, grip both opposite edges.');spatial.append(landscape);
            const controls=document.createElement('div');for(const [label,action] of [['↶ Rotate','rotate-map-left'],['Rotate ↷','rotate-map-right'],['Place Totem','place-map'],['Replay','replay-map']]){const button=document.createElement('button');button.type='button';button.textContent=label;if(action==='place-map')button.dataset.spatialPlace='';button.onclick=()=>handleDemoPanelAction(action);controls.append(button);}spatial.append(controls);appRoot.querySelector('.tryit-demo').append(spatial);
            let down=null,moved=false;
            landscape.style.touchAction='none';
            landscape.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY};moved=false;landscape.setPointerCapture(event.pointerId);});
            landscape.addEventListener('pointermove',event=>{if(down===null)return;const dx=event.clientX-down.x,dy=event.clientY-down.y;if(Math.hypot(dx,dy)>2){moved=true;rotateDemoLivingMap(dx*.009,dy*.006);down={x:event.clientX,y:event.clientY};}});
            landscape.addEventListener('pointercancel',()=>{down=null;});
            landscape.addEventListener('pointerup',event=>{if(down===null)return;down=null;if(moved || !demoLivingMapReady())return;const target=demoLivingMapPlacement.current(demoLivingMapElapsed());if(!target)return;const b=landscape.getBoundingClientRect();if(livingMapDropAccepted({x:(event.clientX-b.left)*landscape.width/b.width,y:(event.clientY-b.top)*landscape.height/b.height},demoLivingMapScene.project(target,{x:0,y:0,width:landscape.width,height:landscape.height}),landscape.width*.075))placeDemoMapTotem(true);});
        }
        const firstArrival = prepareTutorialBoard(board);
        setIntroBoardNextGuide(options.nextGuide!==undefined?options.nextGuide:(buttonLabel?`Use ${demoLocalizedText(buttonLabel)} below.`:'Explore the visible cells for more detail.'),{reveal:false});
        // Keep the large instruction surface visible without blocking the orb
        // underneath. The fixed Continue button remains interactive.
        board.classList.add('is-persistent-demo-board');
        if (firstArrival) {
            introSceneStartedAt = performance.now();
            typingStartDelay = 900;
        }
    }
    finalActions?.setAttribute('hidden', '');
    if (continueButton && buttonLabel) {
        continueButton.textContent = demoLocalizedText(buttonLabel);
        // Keep the Plant Orb introduction on screen until its explanation has
        // appeared; a second press must not jump straight from pathways to Areas.
        continueButton.hidden = false;
        continueButton.disabled = false;
        continueButton.onclick = () => {
            suppressSessionSelectUntil = performance.now() + 700;
            typing=false;
            clearDemoNarration();
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
        Math.max(DEMO_BOARD_TYPING_SAFETY_MS, typingStartDelay + paragraphs.reduce((total,text)=>total+demoParagraphReadingTime(text),0)+2000)
    );
    setGuide('');
    if(options.stepLabel==='UTILITY 1.1')spawnDemoMapTotem();
}

function rememberDemoSlide(slide){
    if(demoSlideHistoryReplay)return;
    const code=String(slide?.stepLabel || '').trim();
    if(!code)return;
    const previous=demoSlideHistory[demoSlideHistoryIndex];
    const remember=entry=>queueMicrotask(()=>{if(demoSlideHistory[demoSlideHistoryIndex]!==entry)return;entry.scene=captureDemoScene(markers);entry.panel=infoPanel?.snapshot();entry.state={demoStage,placementReady,demoJourneyStage,demoOrientationStep,demoTutorialStep,limMeshVisible,arWelcomeIntroPending,arWelcomeSettleStage,arWelcomeSettleStartedAt,arWelcomeOpeningActive,arWelcomeRootMilestone,arWelcomeRootMilestoneStartedAt,selectedLimCell,limExpandedCells:[...limExpandedCells],limHiddenCells:[...limHiddenCells],limExpandedAt:[...limExpandedAt],nativeConnectionState:nativeConnectionState?structuredClone(nativeConnectionState):null};});
    if(previous?.stepLabel===code){const entry={...slide};demoSlideHistory[demoSlideHistoryIndex]=entry;remember(entry);syncDemoPanelActions();return;}
    demoSlideHistory=demoSlideHistory.slice(0,demoSlideHistoryIndex+1);
    demoSlideHistory.push({...slide});
    demoSlideHistoryIndex=demoSlideHistory.length-1;
    remember(demoSlideHistory[demoSlideHistoryIndex]);
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
    clearTimeout(boardTypingTimer);clearTimeout(boardTypingWatchdogTimer);clearTimeout(aimRevealTimer);clearTimeout(pointerPressTimer);clearTimeout(demoHoldTimer);
    closeDemoKnowledge(true);releaseHeldDemoRecord();limActivation?.reset();
    const currentRecords=markers;if(slide.scene)markers=restoreDemoScene(slide.scene,{preserveNotes:true});
    for(const record of currentRecords)if(!markers.includes(record))knowledgeRenderer?.clear(record);
    if(slide.state){const state=slide.state;({demoStage,placementReady,demoJourneyStage,demoOrientationStep,demoTutorialStep,limMeshVisible,arWelcomeIntroPending,arWelcomeSettleStage,arWelcomeSettleStartedAt,arWelcomeOpeningActive,arWelcomeRootMilestone,arWelcomeRootMilestoneStartedAt,selectedLimCell,nativeConnectionState}=state);limExpandedCells=new Set(state.limExpandedCells);limHiddenCells=new Set(state.limHiddenCells);limExpandedAt=new Map(state.limExpandedAt);}
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
        if(board){board.innerHTML=`<small>${demoIntroLabel()}</small><h2>${slide.title}</h2><div class="tryit-board-text-window"><p class="is-revealed">${slide.body}</p></div>`;board.hidden=false;board.classList.add('is-copy-ready','is-persistent-demo-board');}
        const button=appRoot?.querySelector('[data-tryit-intro-continue]');
        if(button && slide.kind==='placement'){button.hidden=true;button.onclick=null;setIntroBoardNextGuide(slide.options?.nextGuide || 'Aim at the highlighted position and confirm placement.');}
        else if(button){button.hidden=false;button.disabled=false;button.textContent='Continue';button.onclick=()=>{const next=demoSlideHistoryIndex+1;if(next<demoSlideHistory.length)showDemoSlideFromHistory(next);else slide.onContinue?.();};}
    }
    demoSlideHistoryReplay=false;
    if(slide.panel)infoPanel?.restoreSnapshot(slide.panel);
    for(const record of markers){knowledgeRenderer?.clear(record);refreshDemoRecord(record);}
    updateSimulatedMarkers();introBoardTextureDirty=true;
    const pointer=appRoot?.querySelector('[data-tryit-place]');if(pointer)pointer.hidden=!placementReady;
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
    if(record?.demoProfileInteracted){setGuide(`${record.name || 'Plant'} information remains available.`);return;}
    const first=record?.tutorialStage==='plant';
    const firstStep={uses:'PIMO 1.2a',culinary:'PIMO 1.2b','fresh-peas':'PIMO 1.2c'}[record.demoGuidedNodeId] || 'PIMO 1.2';
    const id=first?(record.knowledgeExplorer?.mode==='tag'?'ELEMENTS 1.7':firstStep):'ELEMENTS 1.12';
    const step=guidedDemoStep(id);
    const button=first?'Continue to panel tools':'Leave something behind';
    showIntroBoard(step.title,step.main,button,()=>continueAfterDemoPim(record),{
        tutorialStep:DEMO_TUTORIAL_STEPS.PIM,stepLabel:id,nextGuide:step.hint,deferContinueUntilCopyReady:true
    });
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
    demoFeedback?.sound('cell');
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
    const note=demoNoteHit(latestControllerRay);
    return nearestDemoXrTarget([
        note?{kind:'note',id:note.card?.id,distance:note.distance,target:note}:null,
        panel ? {kind:'panel',id:panel.card?.id || 'control-panel',distance:panel.distance,target:panel} : null,
        butterflyRayTarget(),
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
        if(!arWelcomeShowcaseActive || butterflyTriggerSources.has(event.inputSource) || !['screen','tracked-pointer'].includes(event.inputSource?.targetRayMode))return;
        captureDemoInputEventRay(event);
        const resolved=resolveDemoCellTarget(),node=resolved?.kind==='lim-cell'?resolved.node:null;
        if(node || event.inputSource===limInputSource || event.inputSource===limInputSuppressSource && performance.now()<limActivationSessionSuppressUntil){event.preventDefault?.();event.stopImmediatePropagation?.();if(node)limActivation.consumeSyntheticClick(node.key,performance.now());return;}
    };
    const visibility=()=>{if(arSession.visibilityState==='hidden'){limActivation.cancel('session-hidden');limInputSource=null;cancelDemoInteractionState('session-hidden');}else if(arSession.visibilityState==='visible'){preservePlacedDemoPlants(markers);introBoardTextureDirty=true;}};
    const reset=event=>{
        const matrix=event.transform?.inverse?.matrix;if(!matrix)return;
        cancelDemoInteractionState('reference-space-reset');rebaseDemoRecords(markers,matrix);
        // Anchors are matrices; points and reading poses use separate helpers.
        if(ambientWorldFrame!==introWorldAnchor)rebaseXrMatrix(ambientWorldFrame,matrix);rebaseXrMatrix(introWorldAnchor,matrix);rebaseXrPoint(ambientWorldAnchor,matrix);rebaseXrPose(demoKnowledgePanel,matrix);
        demoLivingMapGrip?.reset();if(demoLivingMapOrigin){rebaseXrPoint(demoLivingMapOrigin,matrix);setDemoLivingMapRotation(livingMapRotation(Math.atan2(matrix[8],matrix[10])).multiply(livingMapRotation(demoLivingMapOrientation)));}
        for(const record of markers)if(record.demoMapHome)rebaseXrPoint(record.demoMapHome,matrix);
        for(const insect of butterflyCompanions){rebaseXrPoint(insect.position,matrix);rebaseXrPoint(insect.handPosition,matrix);rebaseXrPose(insect.flightAnchor,matrix);}
        if(Number.isFinite(groundYEstimate))groundYEstimate+=matrix[13];infoPanel?.rebase(matrix);heroDiceToy?.rebase(matrix);hitMatrix=null;introBoardTextureDirty=true;
    };
    referenceSpace?.addEventListener('reset',reset);
    arSession.addEventListener('selectstart',selectStart,true);arSession.addEventListener('selectend',selectEnd,true);arSession.addEventListener('select',select,true);arSession.addEventListener('visibilitychange',visibility);
    const boundSpace=referenceSpace;
    limSessionCleanup=()=>{boundSpace?.removeEventListener('reset',reset);arSession.removeEventListener('selectstart',selectStart,true);arSession.removeEventListener('selectend',selectEnd,true);arSession.removeEventListener('select',select,true);arSession.removeEventListener('visibilitychange',visibility);limInputSource=null;limInputSuppressSource=null;};
}

function paintWelcomeLayer(now) {
    // XR paints its native texture; the hidden desktop canvas must not duplicate it.
    if(!arWelcomeCanvas || !simulatedMode)return;
    const spatialState=updateSpatialLivingMap(now);
    const mapCanvas=appRoot?.querySelector('[data-demo-living-map]');
    if(introBoardStep==='UTILITY 1.1' && mapCanvas && demoLivingMapScene){
        const width=Math.max(280,Math.round(mapCanvas.clientWidth)),height=Math.round(width*(window.matchMedia('(max-width:620px)').matches?.9:.62));
        if(mapCanvas.width!==width || mapCanvas.height!==height){mapCanvas.width=width;mapCanvas.height=height;}
        const ctx=localizedCanvasContext(mapCanvas.getContext('2d'));ctx.clearRect(0,0,width,height);
        drawLivingMapPreview(ctx,demoLivingMapScene,demoLivingMapElapsed(now),window.matchMedia('(prefers-reduced-motion: reduce)').matches,{x:0,y:0,width,height});
    }
    const spatialCanvas=appRoot?.querySelector('[data-spatial-landscape]');
    if(spatialCanvas && spatialState?.reveal.appear>0){
        const width=Math.max(280,Math.round(spatialCanvas.clientWidth)),height=Math.round(window.innerWidth<=620?Math.max(130,Math.min(width*.64,window.innerHeight-370)):width*.64);if(spatialCanvas.width!==width || spatialCanvas.height!==height){spatialCanvas.width=width;spatialCanvas.height=height;}
        const ctx=localizedCanvasContext(spatialCanvas.getContext('2d'));ctx.clearRect(0,0,width,height);demoLivingMapScene.draw(ctx,spatialState.elapsed,spatialState.reduced,{x:0,y:0,width,height});
    }
    arWelcomeClock.tick(Date.now(),!document.hidden);
    const rainStage=simulatedMode || demoRainIntensity<=0?'':demoRainProgress(arWelcomeClock.elapsed)>=1?'mist':arWelcomeClock.elapsed>=12000?'first-drops':'';
    const demoRoot=appRoot?.querySelector('.tryit-demo');
    if(demoRoot && demoRoot.dataset.rainStage!==rainStage)demoRoot.dataset.rainStage=rainStage;
    const context=localizedCanvasContext(arWelcomeCanvas.getContext('2d'));
    context.save();
    context.scale(arWelcomeCanvas.width/2500,arWelcomeCanvas.height/2100);
    const frames=drawArWelcomeShowcase(context,arWelcomeClock.elapsed,
        simulatedMode || window.matchMedia('(prefers-reduced-motion: reduce)').matches,arWelcomeClusters,{
            simpleDesktop:simulatedMode,opening:arWelcomeOpeningActive,minimalIntro:arWelcomeIntroPending,openingSeed:arWelcomeOpeningSeed,openingDuration:arWelcomeOpeningDuration,minimalStartAt:DEMO_ARCHETYPE_START_MS,minimalInterval:DEMO_ARCHETYPE_INTERVAL_MS,minimalRevealDuration:DEMO_ARCHETYPE_REVEAL_MS,hidden:limHiddenCells,drawCells:limMeshVisible,drawPanel:arWelcomeSharedBoard && introBoardVisible,
            drawRoots:!simulatedMode && arWelcomeSharedBoard && introBoardVisible,
            rootMilestone:arWelcomeRootMilestone,rootMilestoneStartedAt:arWelcomeRootMilestoneStartedAt,
            drawContent:drawIntroNoteContent,progression:{cellsActivatedAt:limMeshActivatedAt,expandedLimIds:[...limExpandedCells],expandedAt:Object.fromEntries(limExpandedAt)},
            drawCellLabels:true,cellOpacity:currentCellOpacity(),selectedKey:selectedLimCell,hoverKey:contextCellKey,pathwayKey:limPathwayState.status==='active'?(currentPathwayNode()?.key || ''):'',holdKey:limActivation?.activeKey,holdProgress:limActivation?.progress || 0,connectedKey:nativeConnectionState?.phase==='connected'?nativeConnectionTargetKey():''
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
    paintDemoButterfly(now);
    if(now-ambientLastPaint<33)return;
    ambientLastPaint=now;
    if(ambientCanvas)ambientCanvas.style.visibility='hidden';
    if(!getSpatialVisualSettings().insects || !ambientBeeModel?.ready || !Number.isFinite(ambientBeesStartedAt)){ambientBeeModel?.hide?.();return;}
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ambientBeeModel?.draw(arWelcomeClock.elapsed,ambientBeesStartedAt,reducedMotion,{attention:'control',encounterSeed:ambientEncounterSeed});
}

function paintSimulatedRainV2(now){
    if(!rainV2Canvas || now-rainV2LastPaint<33)return;
    rainV2LastPaint=now;
    const width=window.innerWidth,height=window.innerHeight,ratio=Math.min(window.devicePixelRatio||1,1.5);
    if(rainV2Canvas.width!==Math.round(width*ratio))rainV2Canvas.width=Math.round(width*ratio);
    if(rainV2Canvas.height!==Math.round(height*ratio))rainV2Canvas.height=Math.round(height*ratio);
    const context=localizedCanvasContext(rainV2Canvas.getContext('2d'));
    if(!context)return;
    context.setTransform(ratio,0,0,ratio,0,0);
    context.clearRect(0,0,width,height);
    if(demoRainStyle!=='v2' || demoRainIntensity<=0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const progress=demoRainProgress(arWelcomeClock.elapsed)*demoRainIntensity;
    if(progress<=0)return;
    paintDemoRainV2Preview(context,width,height,demoRainV2Field(now,progress,{mobile:navigator.maxTouchPoints>0}));
}

function showArWelcomeShowcase() {
    introOpeningCopySkipped=false;
    demoSlideHistory=[];demoSlideHistoryIndex=-1;demoSlideHistoryReplay=false;
    demoInteractionTasks=new Set();infoPanel?.setTaskProgress(null);
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
    ambientBeesStartedAt=NaN;
    arWelcomeRootMilestone=WELCOME_ROOT_MILESTONES.arrival;arWelcomeRootMilestoneStartedAt=0;arWelcomeRootsLastRefreshAt=-Infinity;
    // Reset transient learning state for every demo visit.
    limPathwayState=idleLimPathwayState();
    contextCellKey='';limPointerKey='';nativeConnectionState=null;clearNativeConnectionHold();
    limMeshActivatedAt=NaN;arWelcomeRenderedFrames=[];
    infoPanel?.setPathwayContext(null);infoPanel?.setLearningModules(null);
    const reservedCells=welcomeExperienceFrames(64000,false,arWelcomeClusters).flatMap(frame=>frame.nodes);
    limDiagnostic('rendered-cells',{count:reservedCells.length,uniqueIds:new Set(reservedCells.map(node=>node.limId || node.key)).size,reservedCount:LIM_ALL_CELLS.length});
    limInteractionCleanup();limSessionCleanup();limActivationSessionSuppressUntil=0;
    limActivation=createLimActivationController({
        duration:0,
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
    introBoardTitle=demoLocalizedText(guidedDemoStep('INTRO 1.1').title);
    introBoardBody=demoLocalizedText(DEMO_QUICK_ACCESS_COPY['INTRO 1.1']);
    arWelcomeOpeningDuration=Math.max(arWelcomeOpeningDuration,DEMO_WELCOME_TITLE_HOLD_MS+introBoardBody.split(/\n\n/).reduce((total,text)=>total+demoParagraphReadingTime(text),0)+1100);
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
        introBoardParagraphFadeTimes=openingParagraphs.map(()=>-Infinity);
        introBoardVisibleBody=introBoardBody;paintOpeningCopy(introBoardBody);introBoardTextureDirty=true;
        panel.classList.remove('is-typing');
        const readyButton=appRoot?.querySelector('[data-tryit-intro-continue]');if(readyButton)readyButton.disabled=false;
        syncDemoPanelActions();
    };
    const revealOpeningParagraph=()=>{
        if(!openingTyping || !arWelcomeShowcaseActive)return;
        openingParagraphIndex++;
        introBoardParagraphFadeStartedAt=performance.now();introBoardParagraphFadeTimes[openingParagraphIndex-1]=introBoardParagraphFadeStartedAt;
        introBoardVisibleBody=openingParagraphs.slice(0,openingParagraphIndex).join('\n\n');paintOpeningCopy(introBoardVisibleBody);introBoardTextureDirty=true;
        if(openingParagraphIndex>=openingParagraphs.length){boardTypingTimer=setTimeout(finishOpeningCopy,demoParagraphReadingTime(openingParagraphs[openingParagraphIndex-1]));return;}
        boardTypingTimer=setTimeout(revealOpeningParagraph,demoParagraphReadingTime(openingParagraphs[openingParagraphIndex-1]));
    };
    const beginOpeningCopy=()=>{
        if(!arWelcomeShowcaseActive)return;
        if(introBoardStep==='INTRO 1.2'){finishOpeningCopy();return;}
        clearTimeout(boardTypingTimer);clearTimeout(boardTypingWatchdogTimer);
        ambientBeesStartedAt=arWelcomeClock.elapsed;
        arWelcomeOpeningActive=false;arWelcomeSettleStage=true;arWelcomeSettleStartedAt=arWelcomeClock.elapsed;limMeshVisible=false;
        introBoardStep='INTRO 1.2';
        introBoardTitle=demoLocalizedText(guidedDemoStep('INTRO 1.2').title);
        introBoardBody=demoLocalizedText(DEMO_QUICK_ACCESS_COPY['INTRO 1.2']);
        const continueOpeningCopy=event=>{event?.stopImmediatePropagation?.();suppressSessionSelectUntil=performance.now()+700;if(introBoardStep!=='INTRO 1.2')return;openingTyping=false;clearDemoNarration();const button=appRoot?.querySelector('[data-tryit-intro-continue]');if(button){button.disabled=true;button.onclick=null;}clearTimeout(arWelcomeUnlockTimer);arWelcomeIntroPending=false;arWelcomeSettleStage=false;runArWelcomeTutorial(0);};
        rememberDemoSlide({stepLabel:'INTRO 1.2',title:introBoardTitle,body:introBoardBody,buttonLabel:'Start the demo',onContinue:continueOpeningCopy,kind:'welcome'});
        const openingButton=appRoot?.querySelector('[data-tryit-intro-continue]');
        if(openingButton){openingButton.textContent='Start the demo';openingButton.disabled=false;openingButton.onclick=continueOpeningCopy;}
        introBoardVisibleBody='';introBoardParagraphFadeTimes=[];openingParagraphs=introBoardBody.split('\n\n');openingParagraphIndex=0;openingTyping=true;
        panel.querySelector('h2').textContent=introBoardTitle;
        panel.querySelector('small').textContent=demoIntroLabel();
        panel.querySelector('.tryit-board-text-window').innerHTML=openingParagraphs.map(()=>'<p></p>').join('');
        panel.hidden=false;introBoardVisible=true;introBoardTextureDirty=true;
        appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-lim-opening');
        syncDemoPanelActions();
        panel.classList.add('is-typing');paintOpeningCopy('');
        boardTypingTimer=setTimeout(revealOpeningParagraph,700);
    };
    rememberDemoSlide({stepLabel:'INTRO 1.1',title:introBoardTitle,body:introBoardBody,buttonLabel:'Continue',onContinue:beginOpeningCopy,kind:'welcome'});
    const waitingButton=appRoot?.querySelector('[data-tryit-intro-continue]');if(waitingButton){waitingButton.hidden=false;waitingButton.disabled=false;waitingButton.textContent='Continue';waitingButton.onclick=()=>{suppressSessionSelectUntil=performance.now()+700;clearDemoNarration();beginOpeningCopy();};}syncDemoPanelActions();
    const waitForOpeningCopy=()=>{
        if(!arWelcomeShowcaseActive || !arWelcomeOpeningActive)return;
        if(arWelcomeClock.elapsed>=arWelcomeOpeningDuration){
            introBoardVisibleBody=introBoardBody;introBoardTextureDirty=true;
            const button=appRoot?.querySelector('[data-tryit-intro-continue]');if(button){button.hidden=false;button.disabled=false;button.textContent='Continue';button.onclick=beginOpeningCopy;}syncDemoPanelActions();return;
        }
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
        const mapPlaying=introBoardStep==='UTILITY 1.1' && demoLivingMapIsPlaying(now);
        const state=[introBoardTitle,introBoardVisibleBody,introBoardVisible,arWelcomeSharedBoard,arWelcomeIntroPending,limMeshVisible,limMeshActivatedAt,limExpandedAt.size,limHiddenCells.size,welcomeSequenceCanContinue(),mapPlaying].join('|');
        const mapAnimating=introBoardStep==='UTILITY 1.1' && (demoLivingMapPlacement?mapPlaying:(demoLivingMapPreviewClock || mapPlaying) && !demoLivingMapProgress(demoLivingMapElapsed(now),reduced,demoLivingMapScene?.schedule).settled);
        if(simulatedMode && now-last>=50 && (!reduced || mapAnimating || arWelcomeOpeningActive || arWelcomeClock.elapsed<AR_WELCOME_SHOWCASE_DURATION || limRevealIsAnimating() || state!==lastState)){
            paintWelcomeLayer(now);introBoardTextureDirty=true;last=now;lastState=state;
        }

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
            continueButton.textContent=demoLocalizedText('Start the demo');
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
        if(introBoardStep==='INTRO 1.2')return; // Only its current action may advance this slide.
        if(!arWelcomeOpeningActive && !openingTyping && welcomeAutoAdvanceReady(arWelcomeClock.elapsed,window.matchMedia('(prefers-reduced-motion: reduce)').matches)){
            advanceWelcome();return;
        }
        arWelcomeUnlockTimer=setTimeout(unlockWelcome,180);
    };
    arWelcomeUnlockTimer=setTimeout(unlockWelcome,180);
    setGuide(DEMO_QUICK_ACCESS_COPY['INTRO 1.1']);
}

// Use the same billboard geometry for ray hits and texture drawing.
function welcomeHandTarget(point){
    if(!arWelcomeShowcaseActive || !limMeshVisible || !introWorldAnchor)return null;
    const scaleX=AR_PHONE_COMFORT.boardScale[0]*2500/1400,scaleY=AR_PHONE_COMFORT.boardScale[1]*2100/1080;
    const position=introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition),matrix=billboardMatrix(position,scaleX,scaleY,introWorldAnchor),size=demoBillboardSurfaceSize(scaleX,scaleY);
    const surface={center:position,right:{x:matrix[0]/scaleX,y:0,z:matrix[2]/scaleX},up:{x:0,y:1,z:0},normal:{x:matrix[8],y:0,z:matrix[10]},width:size.width,height:size.height,card:{id:'welcome'}};
    const target=hitTotemPoint(point,[surface],{front:.045,back:.025});if(!target)return null;
    const node=welcomeCellAtPoint(welcomeFrames(),(target.localX/size.width+.5)*2500,(.5-target.localY/size.height)*2100);
    return node?{...target,node,kind:'lim-cell'}:null;
}

function welcomeSurfaceHit(position,scaleX,scaleY,width=2500,height=2100,panelOnly=false,inputRay=null) {
    if(!introWorldAnchor)return null;
    const matrix=billboardMatrix(position,scaleX,scaleY,introWorldAnchor);
    const surface=demoBillboardSurfaceSize(scaleX,scaleY);
    const origin=inputRay?.origin || demoPointerWorldOrigin(),direction=inputRay?.direction || demoPointerWorldRay();
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
    {code:'SPACE 1.1',title:guidedDemoStep('SPACE 1.1').title,art:null,button:'Continue',nextGuide:'',paragraphs:[DEMO_GUIDED_COPY['SPACE 1.1']]},
    {code:'SPACE 1.2',title:guidedDemoStep('SPACE 1.2').title,art:'curiosity',button:'See how it works',nextGuide:'',paragraphs:[DEMO_GUIDED_COPY['SPACE 1.2']]},
    {code:'SPACE 1.3',title:'Settle into this space',art:null,button:'Place the first sample',nextGuide:'Take your time. Place the sample when you are ready.',paragraphs:['A Project connects information to a real place. We will begin with one plant and its information.','There is no rush. Explore the first sample and get comfortable with the panels before trying playful interactions.']}
];

const POST_PLACEMENT_AREA_STEP = {
    title:'This is the Plant Orb',button:'Continue',
    nextGuide:'Select the Plant Orb to open its information. Hold controller grip to move it; release grip to place it. With hands, pinch to hold and release the pinch to place it.',
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
        infoPanel?.setContextualHint('Continue when you are ready.');
    }
    showIntroBoard(step.title,step.paragraphs,step.button,()=>{
        if(demoOrientationStep!==index)return;
        suppressSessionSelectUntil=performance.now()+700;
        if(index===0)infoPanel?.setIntroduction(false);
        if(index<DEMO_ORIENTATION_STEPS.length-1){runArWelcomeTutorial(index+1);return;}
        appRoot?.querySelector('.tryit-demo')?.removeAttribute('data-intro-pending');
        demoOrientationStep=-1;syncDemoPanelActions();finishIntroBoard();clearTimeout(aimRevealTimer);armDemoPlacement('plant',{explained:true});
    },{tutorialStep:DEMO_TUTORIAL_STEPS.WELCOME,stepLabel:step.code,nextGuide:step.nextGuide,dynamicCopy:index===2,keepPanel:index===2,deferContinueUntilCopyReady:index===0});
    if(index===0){showDemoTutorialMedia('companion');infoPanel?.setContextualHint('Grip moves panels and objects. Trigger interacts with buttons and cells.');}
    else if(step?.art)showDemoTutorialMedia(step.art);
    else if(index!==2)infoPanel?.setMediaCollapsed(true);
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
        infoPanel?.setContextualHint(`Select the ${plantName} Plant Orb.`);
        infoPanel?.suspend(false);
        setGuide(`Press the ${plantName} orb to reveal its connected Plant Profile.`);
    };
    const id=moringa?'ELEMENTS 1.12':'ELEMENTS 1.6',step=guidedDemoStep(id);
    showIntroBoard(step.title,step.main,moringa?'Add a sample Note':'',()=>{
        finishIntroBoard();if(moringa)showDemoAction('note');
    },{stepLabel:id,nextGuide:step.hint,deferContinueUntilCopyReady:true});
    // The sample plant is interactive while the large instruction board is
    // still visible, so the suggested grab can be tried immediately.
    completeConversion();
}

function showSceneContinue(label, onContinue, stepLabel) {
    const step=guidedDemoStep(stepLabel);
    if(!step)return;
    showIntroBoard(step.title,step.main,label,onContinue,{stepLabel,nextGuide:step.hint});
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
    clearNativeConnectionHold();nativeConnectionState=null;removeNativeConnectionEffect();
    restoreMappedSceneAfterLimo();
    setDemoJourneyStage('impact');
    advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.demoClosing);
    showIntroBoard(
        guidedDemoStep('CLOSURE 1.1').title,
        DEMO_GUIDED_COPY['CLOSURE 1.1'],
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
        x:center.x+right.x*side*1.65,
        y:groundBaseY+initialDemoTotemHalfHeight(groundBaseY),
        z:center.z+right.z*side*1.65
    };
}
function initialDemoTotemHalfHeight(ground){
    const anchor=introWorldAnchor || introWorldAnchorFromViewer(viewerMatrix);
    const mainCenter=anchor?introLocalPosition(anchor,AR_PHONE_COMFORT.boardPosition):null;
    return demoTotemHeightForScreen(ground,mainCenter?.y ?? ground+2);
}
function demoTotemHalfHeight(record){return Number(record?.demoHalfHeight) || DEMO_TOTEM_HALF_HEIGHT_METRES;}
function calibratedDemoGroundY(){
    const base=referenceSpaceHasFloor ? 0 : demoGroundBaseY(hitMatrix,viewerMatrix,groundYEstimate);
    return base+getSpatialVisualSettings().floorOffset;
}
function pairedDemoTotemGroundY(){return calibratedDemoGroundY();}
function updateDemoFloor(){
    const base=calibratedDemoGroundY();
    shiftDemoAreaToFloor(markers,base);
    updateSimulatedMarkers();
}

function createDemoTotemExample() {
    const groundBaseY = pairedDemoTotemGroundY();
    groundYEstimate = groundBaseY-getSpatialVisualSettings().floorOffset;
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
        demoHalfHeight:position.y-groundBaseY,
        type: 'area_checkpoint',
        demoType: 'zone',
        tutorialStage: 'totem',
        demoTotemExampleId:'botanical-garden',
        demoZoneName:'My area',
        demoNeighbourZoneName:'Second Area',
        demoTotemColor:'#785a43',
        demoTotemSignsVisible:true,
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
    setGuide('Select a sign to find one of the sample plants or Note.');
    infoPanel?.setContextualHint('Select a sign to see where it points.');
    focusDemoObjectControls(totem);
    showSceneContinue('Continue', showSecondAreaIntroduction, 'ELEMENTS 1.19');
}

function showSecondAreaIntroduction(){
    const step=guidedDemoStep('AREA 1.2');
    showIntroBoard(step.title,'Point at the Second Area signage on your first Totem, then press the trigger.\n\nThe neighbouring Totem will appear. Its sign gives you a direction through the space.','Continue',createDemoSecondTotem,{stepLabel:step.id,dynamicCopy:true,nextGuide:'Select the Second Area sign. Continue is an alternative.',deferContinueUntilCopyReady:true});
}

function createDemoSecondTotem() {
    if(markers.some(record=>record.tutorialStage==='totem2'))return;
    const first = [...markers].reverse().find(record => record.demoType === 'zone');
    const groundBaseY = first?.groundBaseY ?? demoGroundBaseY(hitMatrix, viewerMatrix, groundYEstimate);
    groundYEstimate = groundBaseY-getSpatialVisualSettings().floorOffset;
    const position = pairedDemoTotemPosition(-1,groundBaseY);
    const totem = {
        ...createMinimalMarkerDraft('area_checkpoint', {
            name: 'Totem',
            description: 'Welcome to this area.'
        }),
        id:DEMO_RECORD_IDS.rainforestWalk,
        position,
        rotationY: demoTotemRotationForPosition(position),
        groundBaseY,
        demoHalfHeight:position.y-groundBaseY,
        type: 'area_checkpoint',
        demoType: 'zone',
        tutorialStage: 'totem2',
        demoTotemExampleId:'rainforest-walk',
        demoZoneName:'Second Area',
        demoNeighbourZoneName:'My area',
        demoTotemColor:'#526d7a',
        demoTotemSignsVisible:true,
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
    connectDemoTotems();
    showIntroBoard('Follow the direction','The neighbouring Totem is now visible.\n\nFollow its sign to move through the real space. Each Totem welcomes you to its own Area, plants and Notes.','Explore, learn and plan',showDemoLivingMap,{stepLabel:'ELEMENTS 1.21',dynamicCopy:true,nextGuide:'Point at a sign to highlight its destination.'});
}

function connectDemoTotems() {
    const [first,second]=markers.filter(record=>record.demoType==='zone');
    if(!first || !second)return;
    first.demoLinkVisible=second.demoLinkVisible=true;
    first.demoTotemSignsVisible=second.demoTotemSignsVisible=true;
    first.demoTotemFaded=second.demoTotemFaded=false;
    first.demoLinkPartner=second.id;
    second.demoLinkPartner=first.id;
    first.totemCardsRefreshed=second.totemCardsRefreshed=0;
    updateSimulatedMarkers();
    advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.areasConnected);
    setGuide('The Areas are linked. Each Totem still keeps its own local plants and Notes.');
    showSceneContinue('Explore, learn and plan',showDemoLivingMap, 'ELEMENTS 1.21');
}

function showDemoLivingMap(){
    limMeshVisible=false;
    demoMapNarrationCount=-1;closeDemoKnowledge(true);releaseHeldDemoRecord();
    for(const record of markers){if(resetDemoPlantForMap(record)){knowledgeRenderer?.clear(record);infoPanel?.clearPlant?.(record);}if(record.demoType==='zone'){record.demoExpanded=false;record.totemSelectedCard='';record.totemCardsRefreshed=0;}}
    const step=guidedDemoStep('UTILITY 1.1');
    showIntroBoard(step.title,step.main,
        'Learn before planting',showDemoBeforePlanting,
        {stepLabel:step.id,dynamicCopy:true,nextGuide:step.hint});
    infoPanel?.showLearning({id:'demo-living-map',title:step.title,body:step.panel,accent:'#b9d59c',mesh:'lim',editable:false});
    infoPanel?.setCompact(true);infoPanel?.setMediaCollapsed(true);infoPanel?.minimize();
    infoPanel?.setContextualHint('Grip both opposite edges to carry, turn and gently tilt the landscape. With tracked hands, pinch both edges. Release either grip to leave it in place. Place the Totem beside the frame on the pulsing circle.');
    paintWelcomeLayer(performance.now());
}

function clearDemoMapPiece(){
    const index=markers.findIndex(record=>record.demoMapPiece);if(index<0)return;
    if(demoHeldIndex===index)demoHeldIndex=-1;else if(demoHeldIndex>index)demoHeldIndex--;
    const [piece]=markers.splice(index,1);if(piece.texture && gl)gl.deleteTexture(piece.texture);
}
function demoMapWorldPoint(px,py,depth=.1){
    if(!introWorldAnchor)return {x:0,y:1,z:-2.7};
    const center=introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition);
    const board=billboardMatrix(center,AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080,introWorldAnchor);
    const local=demoBillboardTextureLocalPoint(px+550,py+510,2500,2100);
    return introLocalPosition(board,[local.x,local.y,depth]);
}
function spawnDemoMapTotem(){
    clearDemoMapPiece();const target=demoLivingMapReady()?demoLivingMapPlacement?.current(demoLivingMapElapsed()):null;
    if(target && introBoardStep==='UTILITY 1.1'){
        const m=viewerMatrix,right=m?{x:m[0],z:m[2]}:{x:1,z:0},base=demoLivingMapOrigin || demoMapWorldPoint(1100,650);
        const position={x:base.x+right.x*.67,y:base.y+.14,z:base.z+right.z*.67+.12},halfHeight=.095;
        const piece={...createMinimalMarkerDraft('area_checkpoint',{name:target.name}),id:'demo-map-piece',name:target.name,
            demoType:'zone',demoMapPiece:true,demoInteractive:true,demoHalfHeight:halfHeight,position,groundBaseY:position.y-halfHeight,
            demoMapHome:{...position},demoTotemColor:'#795f41',demoTotemSignsVisible:false,rotationY:demoTotemRotationForPosition(position),
            appearance:{totemStyle:'carved',totemStyleExplicit:true,notificationColor:'#a5db8d'},demoArriveAt:performance.now(),simulatedAnchor:{x:88,y:45}};
        markers.push(piece);
    }
    const place=appRoot?.querySelector('[data-demo-map-place]');if(place)place.hidden=!target;
    const map=appRoot?.querySelector('[data-demo-living-map]');if(map)map.dataset.placements=String(demoLivingMapPlacement?.snapshot().length || 0);
    introBoardTextureDirty=true;updateSimulatedMarkers();syncDemoPanelActions();
}
function placeDemoMapTotem(alternative=false){
    const elapsed=demoLivingMapElapsed(),target=demoLivingMapPlacement?.current(elapsed);if(!demoLivingMapReady() || !target || !demoLivingMapScene || introBoardStep!=='UTILITY 1.1')return false;
    const piece=markers.find(record=>record.demoMapPiece);
    if(!alternative){
        const destination=demoLivingMapOrigin?livingMapWorldPoint(target,demoLivingMapOrigin,demoLivingMapOrientation):null;
        if(!livingMapWorldDropAccepted(piece?.position,destination)) {
            if(piece){piece.position={...piece.demoMapHome};piece.groundBaseY=piece.position.y-demoTotemHalfHeight(piece);}
            setGuide('Move the Totem to the pulsing circle and release.');return false;
        }
    }
    if(!demoLivingMapPlacement.place(target.id,elapsed))return false;
    demoFeedback?.sound('totem');pulseDemoHaptics(demoGrabInputSource || limInputSource);
    spawnDemoMapTotem();paintWelcomeLayer(performance.now());
    if(demoLivingMapPlacement.snapshot().length===2)setTimeout(()=>{
        if(introBoardStep==='UTILITY 1.1' && demoLivingMapPlacement?.current(demoLivingMapElapsed())){
            spawnDemoMapTotem();paintWelcomeLayer(performance.now());setGuide('The Orbs are in place. Now set Totem 3 at the swale entrance.');
        }
    },LIVING_MAP_ORB_SETTLE_MS);
    setGuide(demoLivingMapPlacement.current(demoLivingMapElapsed())?'The next Totem is ready beside the Living Frame.':demoLivingMapPlacement.snapshot().length===2?'Watch the three Orbs appear before placing the swale Totem.':'Your three Totems connect one living place. Continue when ready.');return true;
}

function showDemoBeforePlanting(){
    const step=guidedDemoStep('UTILITY 1.2');
    showIntroBoard(step.title,step.main,'Continue to Learning Pathways',showLimoLearningModes,
        {stepLabel:step.id,dynamicCopy:true,nextGuide:step.hint});
    infoPanel?.showLearning({id:'demo-before-planting',title:step.title,body:step.panel,accent:'#b9d59c',mesh:'lim',editable:false});
}

function createDemoNeighbourhood(totem) {
    const right={x:Number(viewerMatrix?.[0]) || 1,z:Number(viewerMatrix?.[2]) || 0};
    const forward={x:-right.z,z:right.x};
    const neighbours=[
        {plantId:'vetiver',id:DEMO_RECORD_IDS.vetiver,name:'Vetiver grass',dx:-.48,dz:-.65,dy:.72,anchor:{x:8,y:48},color:'vetiver'},
        {plantId:'acacia',id:DEMO_RECORD_IDS.acacia,name:'Acacia sp.',dx:.30,dz:-.85,dy:1.17,anchor:{x:39,y:46},color:'acacia'},
        {plantId:'jackfruit',id:DEMO_RECORD_IDS.jackfruit,name:'Jackfruit',dx:-.61,dz:.35,dy:.55,anchor:{x:9,y:68},color:'jackfruit'},
        {plantId:'lychee',id:DEMO_RECORD_IDS.lychee,name:'Lychee',dx:.49,dz:.45,dy:.71,anchor:{x:40,y:67},color:'lychee'}
    ];
    if(neighbours.map(item=>item.plantId).join('|')!==DEMO_NEIGHBOUR_PLANT_IDS.join('|'))throw new Error('Totem 2 plant set is out of sync.');
    for(const neighbour of neighbours){
        const profile={common_name:neighbour.name,pim:demoNeighbourPim(neighbour.plantId)};
        markers.push({
            ...createMinimalMarkerDraft('plant',{name:neighbour.name}),
            id:neighbour.id,name:neighbour.name,demoType:'plant',demoAreaId:totem.id,demoAmbientNeighbour:true,demoAlive:true,demoInteractive:true,
            demoKnowledgeProfile:profile,demoKnowledgeProjection:pimToArKnowledge(profile.pim),
            demoOrbColor:neighbour.color,demoOrbShape:'orb',demoExpanded:false,demoArriveAt:performance.now(),
            position:{x:totem.position.x+right.x*neighbour.dx+forward.x*neighbour.dz,y:totem.groundBaseY+neighbour.dy,z:totem.position.z+right.z*neighbour.dx+forward.z*neighbour.dz},
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
    const step=guidedDemoStep('ELEMENTS 1.22');
    showIntroBoard(
        step.title,
        step.main.split('\n\n'),
        'Explore, learn and plan',
        showDemoLivingMap,
        {stepLabel:'ELEMENTS 1.22'}
    );
}

function fadeMappedSceneForLimo() {
    markers.forEach(record=>{
        // Keep every placed Plant Orb visible as context for the final feature.
        record.demoHiddenForLimo=record.demoType!=='plant';
        if(record.demoType==='plant')record.demoExpanded=false;
        if(record.demoType==='zone'){
            record.demoTotemFaded=true;
            record.demoNarrativeFaded=true;
            record.demoInteractive=false;
            record.demoSignsBeforeLimo ??= record.demoTotemSignsVisible!==false;
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
    markers.forEach(record=>{record.demoHiddenForLimo=false;if(record.demoType==='zone' || record.demoType==='note'){record.demoNarrativeFaded=false;record.demoInteractive=true;}if(record.demoType==='zone'){record.demoTotemFaded=false;if(record.demoSignsBeforeLimo!==undefined){record.demoTotemSignsVisible=record.demoSignsBeforeLimo;delete record.demoSignsBeforeLimo;record.totemCardsRefreshed=0;}}});
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
        ? `Select ${state.sourceTitle} in Pigeon Pea’s profile. The learning target is already visible beside it.`
        : state.phase==='target'
        ? `The ${state.sourceTitle} cell is selected. Aim at the ${state.targetTitle} learning cell and hold until its progress ring completes. Release early to cancel and try again.`
        : state.phase==='resolving'
        ? `Connecting ${state.sourceTitle} with ${state.targetTitle}…`
        : `${state.sourceTitle} is connected with ${state.targetTitle}. The highlighted cells share one relationship.`;
    const connectionText=`${state.explanation}\n\nIn a real project: ${state.fieldQuestion}`;
    const targetMedia=limLearningContent(state.targetId);
    infoPanel?.showLearning({id:'native-mesh-connection',keepExplorerContext:true,title:`${state.sourceTitle} ↔ ${state.targetTitle}`,body:state.error?`${state.error} ${body}`:state.phase==='connected'?`${connectionText}\n\n${body}`:body,image:targetMedia.image,imageAlt:targetMedia.imageAlt,accent:'#dfff9b',mesh:'lim',editable:false});
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
    showIntroBoard('Use what you already opened',
        ['Pigeon Pea and the learning mesh are available together. Their existing cells can form one connection.'],
        'Connect the Uses example',()=>startNativeConnectionExperience('uses'),
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'LEARNING 1.8',nextGuide:'Continue to show the plant source and learning target together.'});
    infoPanel?.setLearningModules({title:'Other connection examples',
        body:'The main action uses Uses. You can choose another prepared example here instead.',
        actions:[...DEMO_NATIVE_CONNECTION_EXAMPLES].sort((a,b)=>(a.id==='uses'?-1:0)-(b.id==='uses'?-1:0)).map(example=>({id:`Connection:${example.id}`,label:example.label}))},{open:true});
}

function startNativeConnectionExperience(exampleId='uses') {
    const plant=nativeConnectionPlant();
    if(!plant){setGuide('Pigeon Pea is unavailable. Return to its Plant Orb and try again.');return;}
    let spec;
    try{spec=demoNativeConnectionSpec(demoOrbKnowledge(plant).document,LIM_CELL_BY_ID,exampleId);}catch(error){setGuide(error.message);return;}
    const targetLineage=demoNativeTargetLineage(welcomeFrames(),spec.targetId);
    if(!targetLineage){setGuide('The learning target is unavailable. Return to the pathway and try again.');return;}
    clearNativeConnectionHold();
    nativeConnectionState=createDemoNativeConnection(spec);
    plant.knowledgeConnectedPath=spec.sourcePath;
    infoPanel?.setLearningModules(null);
    nativeConnectionState.targetKey=targetLineage.key;
    removeNativeConnectionEffect();
    meshComposition.clear();
    prepareStableLimoSurface();
    if(!plant.demoExpanded)toggleDemoPlantProfile(plant);knowledgeExplorerAction(plant,'KnowledgeMode:curiosity');infoPanel?.refreshExplorer({mode:'curiosity'});knowledgeRenderer?.clear(plant);
    limMeshVisible=true;
    limMeshActivatedAt=arWelcomeClock.elapsed-AR_WELCOME_SETTLED_MS;
    for(const id of targetLineage.ancestors){limExpandedCells.add(id);limExpandedAt.set(id,arWelcomeClock.elapsed-8000);}
    limHiddenCells.delete(targetLineage.key);
    useSharedWelcomeBoard(true);
    showIntroBoard(guidedDemoStep('LEARNING 1.9').title,
        [guidedDemoStep('LEARNING 1.9').main.replace('Uses',nativeConnectionState.sourceTitle)],
        '',()=>{},
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'LEARNING 1.9',dynamicCopy:true,nextGuide:`Select ${nativeConnectionState.sourceTitle} in Pigeon Pea to continue.`});
    nativeConnectionPanelGuide();
    introBoardTextureDirty=true;
}

function acceptNativePimCell(record,path) {
    const state=nativeConnectionState;
    if(record!==nativeConnectionPlant() || !acceptDemoNativeSource(state,path))return false;
    record.demoSelectedNodeId=state.sourcePath;
    refreshDemoPimProfile(record);
    collapseDemoPimForLimo(record);
    showIntroBoard(guidedDemoStep('LEARNING 1.10').title,
        [guidedDemoStep('LEARNING 1.10').main.replace('Uses and Making',state.targetTitle)],
        '',()=>{},
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'LEARNING 1.10',dynamicCopy:true,nextGuide:`Select the ${state.targetTitle} learning cell to continue.`});
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
        collapseDemoPimForLimo(plant);
        showIntroBoard(guidedDemoStep('LEARNING 1.11').title,
            [state.exampleId==='uses'?guidedDemoStep('LEARNING 1.11').main:`You connected ${state.sourceTitle} with ${state.targetTitle}. A learning activity can now refer back to this specific plant information.`],
            'Finish the sample',showDemoClosingMessage,
            {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'LEARNING 1.11',dynamicCopy:true,nextGuide:'The two highlighted cells remain connected while you continue.'});
        nativeConnectionPanelGuide();
        introBoardTextureDirty=true;
        navigator.vibrate?.([18,35,24]);
        return true;
    }catch(error){
        if(nativeConnectionState!==state)return false;
        meshComposition.fail(error);
        retryDemoNativeTarget(state,'The cells did not connect.');
        nativeConnectionPanelGuide();
        setGuide('Select the learning cell again to retry.');
        return false;
    }
}

function showLimoLearningModes() {
    setDemoJourneyStage('apply');
    prepareStableLimoSurface();
    fadeMappedSceneForLimo();
    showDemoTutorialMedia('connection');
    showIntroBoard(
        guidedDemoStep('LEARNING 1.6').title,
        DEMO_GUIDED_COPY['LEARNING 1.6'],
        'Explore Learning Pathways',
        showLimoArchetypes,
        {stepLabel:'LEARNING 1.6',nextGuide:'Open the final feature.'}
    );
}

function showLimoArchetypes() {
    prepareStableLimoSurface();
    fadeMappedSceneForLimo();
    clearLimSelection();
    limHiddenCells=new Set();arWelcomeRenderedFrames=[];contextCellKey='';limPointerKey='';limActivation?.reset();
    limExpandedCells=new Set();
    limExpandedAt=new Map();
    limMeshVisible=true;
    limMeshActivatedAt=arWelcomeClock.elapsed;
    introBoardTextureDirty=true;
    paintWelcomeLayer(performance.now());
    infoPanel?.showLearning({
        id:'limo-pathway-archetypes',
        title:'Learning Pathways',
        body:'Four starting topics open connected cells. Select one to explore, or use the main action for our prepared Uses connection.',
        image:DEMO_TUTORIAL_ART.pathways.image,
        imageAlt:DEMO_TUTORIAL_ART.pathways.alt,
        accent:'#9fdcff',
        mesh:'lim',
        editable:false
    });
    showIntroBoard(
        guidedDemoStep('LEARNING 1.7').title,
        DEMO_GUIDED_COPY['LEARNING 1.7'],
        'Connect the Uses example',
        ()=>startNativeConnectionExperience('uses'),
        {tutorialStep:DEMO_TUTORIAL_STEPS.GUIDED,stepLabel:'LEARNING 1.7',nextGuide:'Try a starting topic, or connect the sample plant.'}
    );
    infoPanel?.setLearningModules({title:'Other connection examples',
        body:'The guided action uses Uses. These other prepared links are optional.',
        actions:DEMO_NATIVE_CONNECTION_EXAMPLES.map(example=>({id:`Connection:${example.id}`,label:example.label}))},{open:false});
    setGuide('Hold a starting cell to open its topic, or continue to the prepared connection.');
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
        guidedDemoStep('ELEMENTS 1.18').title,
        DEMO_GUIDED_COPY['ELEMENTS 1.18'],
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
    showDemoTutorialMedia('totem');
    showIntroBoard(
        guidedDemoStep('SPACE 1.4').title,
        DEMO_GUIDED_COPY['SPACE 1.4'],
        'Show the first Totem',
        () => {finishIntroBoard();createDemoTotemExample();},
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
    infoPanel?.setContextualHint('Select the Note to read the prepared message.');
    if(pathwayNotePlacementPending){
        pathwayNotePlacementPending=false;placementReady=false;
        setGuide('Your observation Note is anchored to this place.');
        completeLearningPath('placed');
        focusDemoNoteControls(record);
        return;
    }
    setGuide('The sample message is placed beside the two plant profiles.');
    showIntroBoard(
        guidedDemoStep('ELEMENTS 1.17').title,
        DEMO_GUIDED_COPY['ELEMENTS 1.17'],
        'Organise this area',
        () => {
            finishIntroBoard();
            showSpatialGardenSummary();
        },
        {stepLabel:'ELEMENTS 1.17'}
    );
    focusDemoNoteControls(record);
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
        : type === 'plant2' ? 'Place the Moringa Plant Orb' : type === 'totem' ? 'Place the My area Totem' : 'Place a Note');
    setGuide(['plant', 'plant2'].includes(type)
        ? 'Look around slowly. The centre aim will appear when you are ready.'
        : type==='totem'?'Aim the upright preview where the Totem should stand. Use the thumbstick to adjust depth.':'Take in the space before choosing the next position.');
    const introductions = {
        plant: ['A prepared plant sample', [
            'A Plant Orb gives a plant’s information a location in the scene.',
            'Pigeon Pea will be our first example. No previous plant knowledge is needed.'
        ]],
        plant2: [guidedDemoStep('ELEMENTS 1.9').title, DEMO_GUIDED_COPY['ELEMENTS 1.9']],
        note: [guidedDemoStep('ELEMENTS 1.14').title, DEMO_GUIDED_COPY['ELEMENTS 1.14']],
        totem: ['Place My area Totem', 'Aim the upright ghost where the Totem should stand. Adjust its distance with the controller thumbstick, then confirm placement.']
    };
    const [title, introduction] = introductions[type];
    const mediaKey=type==='totem'?'totem':type==='note'?'note':'orb';
    showDemoTutorialMedia(mediaKey);
    if(type==='note')infoPanel?.setContextualHint('The prepared message describes the two sample profiles.');
    const startPlacement = () => {
        suppressSessionSelectUntil = performance.now() + 700;
        finishIntroBoard();
        const questTriggerPlacement=Boolean(session && demoControllerInputSource()?.targetRayMode!=='screen');
        if(type==='plant')showDemoTutorialMedia('curiosity',{id:'demo-plant-context',title:'',hideTitle:true,body:'This prepared profile demonstrates plant information. A real project can use its own plant profiles.'});
        const placementCopy = type === 'plant'
            ? {title:guidedDemoStep('ELEMENTS 1.5').title,body:DEMO_GUIDED_COPY['ELEMENTS 1.5'],next:`Aim at a clear spot in front of you, then ${questTriggerPlacement?'press the controller trigger':'press the aiming circle'} to place the sample Orb. Use the right joystick to adjust distance.`}
            : type === 'plant2'
                ? {title:'Place Moringa',body:DEMO_GUIDED_COPY['ELEMENTS 1.11'],next:'Place Moringa beside Pigeon Pea.'}
                : type==='totem'
                    ? {title:'Place My area Totem',body:'A Totem gives an Area a clear welcome point for its signs and local information.',next:'Aim the upright preview where the Totem should stand. Adjust depth with the joystick, then press the trigger.'}
                    : {title:'Leave a Note',body:DEMO_GUIDED_COPY['ELEMENTS 1.16'],next:questTriggerPlacement?'Choose a location and press the trigger to place the Note.':'Choose a location and tap the aiming circle to place the Note.'};
        introBoardStep=type==='plant'?'ELEMENTS 1.5':type==='plant2'?'ELEMENTS 1.11':type==='note'?'ELEMENTS 1.16':'ELEMENTS 1.24';
        introBoardTitle=placementCopy.title;
        introBoardBody=placementCopy.body;
        introBoardVisibleBody=placementCopy.body;
        rememberDemoSlide({stepLabel:introBoardStep,title:placementCopy.title,body:placementCopy.body,buttonLabel:'',onContinue:null,options:{nextGuide:placementCopy.next},kind:'placement'});
        introBoardTextureDirty=true;
        const board=appRoot?.querySelector('[data-tryit-guided-choice]');
        if(board){board.innerHTML=`<small>${demoIntroLabel()}</small><h2>${placementCopy.title}</h2><div class="tryit-board-text-window"><p>${placementCopy.body}</p></div>`;board.classList.add('is-copy-ready');board.classList.remove('is-typing');}
        setIntroBoardNextGuide(placementCopy.next);
        setGuide(placementCopy.next);
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
        closeDemoKnowledge(true);disposeDemoPlacedNotes();limActivation?.cancel();clearLimSelection();
        limHiddenCells=new Set();limExpandedCells=new Set();limExpandedAt=new Map();
        limPathwayState=idleLimPathwayState();nativeConnectionState=null;clearNativeConnectionHold();
        contextCellKey='';limMeshActivatedAt=NaN;arWelcomeRenderedFrames=[];
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
        ...demoSpatialPimLayoutOptions(record),
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

// Once the source cell is chosen for the native Pigeon Pea → LIMO lesson,
// collapse the PIMO surface so the target learning cell has a clear reading
// area. Keep the connection state and selected source intact; this is a view
// change, not a reset of the lesson.
function collapseDemoPimForLimo(record) {
    if(!record || record.demoType!=='plant' || !record.demoExpanded)return false;
    record.demoExpanded=false;
    record.demoActiveBranch='';
    record.pimBloomPath='';
    record.pimBloomStarted=0;
    infoPanel?.setMediaCollapsed(true);
    refreshDemoRecord(record);
    return true;
}

function toggleDemoPlantProfile(record) {
    if(demoKnowledgeIsModal()) return;
    if(demoNoteRenderer || demoKnowledgeRoot?.classList.contains('demo-note-showcase'))closeDemoKnowledge(true);
    if (!record || record.demoType !== 'plant') return;
    const now=performance.now();
    if(now-(record.demoLastProfileToggleAt ?? -Infinity)<280)return;
    record.demoLastProfileToggleAt=now;
    const recordIndex = markers.indexOf(record);
    if (demoHeldIndex === recordIndex) releaseHeldDemoRecord();
    const opening=!record.demoExpanded;knowledgeExplorer(record);
    record.demoPlacementHighlight=false;
    if(opening && record.tutorialStage==='plant' && !record.demoPimoLesson){record.demoPimoLesson='curiosity';knowledgeExplorerAction(record,'KnowledgeMode:curiosity');infoPanel?.refreshExplorer({mode:'curiosity'});}
    record.demoExpanded = opening;
    if (record.demoExpanded) {
        infoPanel?.setContextualHint('');
        activePimLimBridge=null;
        if(record.tutorialStage==='plant'){setDemoJourneyStage('know');if(!record.demoProfileInteracted)completeDemoInteractionTask('open');advanceWelcomeRootMilestone(WELCOME_ROOT_MILESTONES.plantProfileOpened);}
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
    if(knowledgeRenderer?.grabbing && (!selection.inputSource || selection.inputSource===knowledgeRenderer.grabbedSource))return true;
    if(record.knowledgeExplorer?.mode==='explore' && (node.pimKnowledgeFace || node.pimKnowledgeContext)){
        if(!selection.intentionalHold)return true;
        selectExplorerNode(record,knowledgeFor(record),node);
        const explorerDocument=explorerDetailDocument(demoOrbKnowledge(record).document,record),explorerPath=explorerSelectedPath(record,knowledgeFor(record));
        if(explorerPath)infoPanel?.select(record,explorerDocument,explorerPath);else infoPanel?.focusPlant(record,explorerDocument);
        refreshDemoPimProfile(record);infoPanel?.refreshExplorer();return true;
    }
    // Some Quest runtimes deliver the same trigger through both the capture
    // listener and the general select fallback. Do not toggle the branch shut
    // on that duplicate event, even if the first activation revealed children.
    if(session && performance.now()-lastSpatialPimActivationAt<350)return true;
    if(session)lastSpatialPimActivationAt=performance.now();
    demoFeedback?.sound('cell');pulseDemoHaptics();
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
        ? `${node.label} ${wasOpen ? 'remains open.' : 'opened into its connected information cells.'} Explore further or continue when you are ready.`
        : `${node.label} remains closed.`);
    return true;
}

function advanceAfterDemoProfileInteraction(record) {
    if (record?.demoAmbientNeighbour) return 0;
    if (!record || record.demoProfileInteracted) return 0;
    if (record.demoProfileReady) return 0;
    const opened = demoPimState(record).expandedNodeIds.has(record.demoActiveBranch);
    const explorationGoal = record.tutorialStage === 'plant' ? 2 : 0;
    if (opened) record.demoProfileInteractionCount = (Number(record.demoProfileInteractionCount) || 0) + 1;
    const remaining = Math.max(0, explorationGoal - (Number(record.demoProfileInteractionCount) || 0));
    if (remaining) return remaining;
    // Exploring information unlocks progression; it never performs it.
    record.demoProfileReady = true;
    const continueButton=appRoot?.querySelector('[data-tryit-intro-continue]');
    if(continueButton){continueButton.disabled=false;}
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
    if(record?.knowledgeExplorer && knowledgeRenderer){const target=knowledgeRenderer.hit(latestControllerRay || {origin:demoPointerWorldOrigin(),direction:demoPointerWorldRay()},record);return target?{...target,panelHit:true,node:target.node}:null;}
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
            ...demoSpatialPimLayoutOptions(record),
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
    disposeKnowledgeDesktopViews(layer);
    layer.innerHTML = `${simulatedAreaLinkMarkup(markers.filter(demoAreaVisible))}${markers.map((record, index) => {
        if(!demoAreaVisible(record))return '';
        const content = demoContentFor(record);
        const lines = content?.lines?.slice(0, record.revealLines ?? content.lines.length) || [];
        const anchor = record.simulatedAnchor || { x: 50, y: 50 };
        if (record.demoType === 'plant') {
            const offset = record.demoPanelOffset || (record.demoPanelOffset = defaultPlantPanelOffset(anchor));
            return renderSimulatedPlant(record, index, anchor, offset).replace('tryit-sim-marker tryit-sim-marker-plant',`tryit-sim-marker tryit-sim-marker-plant${highlighted.has(record.id)?' is-sign-target':''}${record.demoPlacementHighlight?' is-placement-highlight':''}`);
        }
        if (record.demoType === 'zone' && record.demoExpanded) return renderSimulatedTotem(record, index, anchor).replace('nlxr-totem-system',`nlxr-totem-system is-totem-${renderedTotemStyle(record)}`).replace('tryit-sim-totem-system',`tryit-sim-totem-system${highlighted.has(record.id)?' is-sign-target':''}`);
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
        compactMarker.addEventListener('click', () => selectDemoNote(record));
        compactMarker.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            selectDemoNote(record);
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
        if(record && simulatedMode)mountKnowledgeDesktopView(profile,{record,knowledge:knowledgeFor(record),expanded:demoPimExpandedNodeIds(record),onSelect:node=>{selectDemoProfileCell({record,target:{node}});refreshDemoPimProfile(record,profile);}});
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
    const mesh=reconcilePlantInformationMesh(liveProfile, demoPlantKnowledgeMarkup(record));
    if(simulatedMode)mountKnowledgeDesktopView(liveProfile,{record,knowledge:knowledgeFor(record),expanded:demoPimExpandedNodeIds(record),onSelect:node=>{selectDemoProfileCell({record,target:{node}});refreshDemoPimProfile(record,liveProfile);}});
    infoPanel?.refreshExplorer();return mesh;
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
    const floorY=calibratedDemoGroundY();
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
        const halfHeight=demoTotemHalfHeight(record),ground=Number(record.groundBaseY ?? record.position.y-halfHeight),centerY=ground+halfHeight;
        const denominator=ray.x*front.x+ray.y*front.y+ray.z*front.z;
        if(Math.abs(denominator)<1e-6)return null;
        const distance=((record.position.x-origin.x)*front.x+(centerY-origin.y)*front.y+(record.position.z-origin.z)*front.z)/denominator;
        if(distance<=0)return null;
        const point={x:origin.x+ray.x*distance,y:origin.y+ray.y*distance,z:origin.z+ray.z*distance};
        const offset={x:point.x-record.position.x,y:point.y-centerY,z:point.z-record.position.z};
        const localX=offset.x*right.x+offset.z*right.z;
        if(Math.abs(localX)>(record.demoMapPiece?.12:.28) || point.y<ground-.04 || point.y>ground+halfHeight*2+.04)return null;
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
        y: record.demoType === 'zone' && !record.demoMapPiece
            ? calibratedDemoGroundY() + demoTotemHalfHeight(record)
            : origin.y + ray.y * distance + lateral.y,
        z: origin.z + ray.z * distance + lateral.z
    };
    if(record.demoMapPiece && demoLivingMapOrigin){
        const hit=livingMapRayPoint({origin,direction:ray},demoLivingMapOrigin,demoLivingMapOrientation);
        if(hit)record.position=hit;
    }
    if (record.demoType === 'zone') record.groundBaseY = record.position.y - demoTotemHalfHeight(record);
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
    const origin=demoPointerWorldOrigin();if(!origin || !captureDemoGrabPose(target.record,origin,demoPointerWorldRay()))return false;
    demoGrabPreparingIndex=-1;demoHeldIndex=target.index;pulseDemoHaptics(demoGrabInputSource,true);
    setGuide(`Holding ${target.record.name || 'the object'}. Move with the grip held; release grip to place it.`);
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
    pulseDemoHaptics(inputSource,true);
    setGuide(`Holding ${target.record.name || 'the orb'}. Move your hand, then release.`);
    return true;
}

function selectDemoNoteTemplateAtPointer() {
    const target = demoRecordAtPointer();
    if (!target || target.record?.demoType !== 'note') return false;
    return selectDemoNote(target.record);
}

function focusDemoObjectControls(record){
    if(!record)return false;
    if(record.demoType==='note')return focusDemoNoteControls(record);
    if(record.demoMapPiece)return false;
    return focusSpatialObjectControls(infoPanel,record,{demo:true,edit:openDemoNoteEditor,open:openDemoNoteExperience,refresh:item=>{refreshDemoRecord(item);item.totemCardsRefreshed=0;updateSimulatedMarkers();}});
}
function focusDemoNoteControls(record){
    infoPanel?.restore();infoPanel?.showLearning({title:record.name,body:record.description || record.notes,mesh:'note'});
    infoPanel?.setObjectContext({title:'Controls · Note',hint:'Add a connected widget. Grip any Note card to move it.',actions:[{id:'add',label:'+ Add widget'},{id:'new-note',label:'+ Note'},{id:'glass-colour',label:'Glass colour'}],onAction:id=>{
        if(id==='new-note'){
            const count=markers.filter(item=>item.demoType==='note').length+1,p=record.position || {x:0,y:1,z:-1};
            const note={...createMinimalMarkerDraft('note',{name:'Garden Note '+count}),id:'demo-extra-note-'+count,name:'Garden Note '+count,description:record.description || record.notes || 'Notice one change in this place.',demoType:'note',demoInteractive:true,demoAreaId:record.demoAreaId,position:{x:p.x+.6,y:p.y,z:p.z},simulatedAnchor:{x:Math.min(85,(record.simulatedAnchor?.x || 50)+12),y:record.simulatedAnchor?.y || 50},appearance:{...record.appearance,spatial_note:{type:'plain',widgets:[]}}};
            note.demoContent={title:note.name,description:note.description,lines:[note.description]};markers.push(note);refreshDemoRecord(note);updateSimulatedMarkers();openDemoNoteExperience(note);return;
        }
        if(id==='glass-colour'){
            const colours=['#29493c','#284b60','#53405e','#695336'],index=colours.indexOf(record.appearance?.color);
            record.appearance={...record.appearance,color:colours[(index+1)%colours.length]};refreshDemoRecord(record);updateSimulatedMarkers();
            closeDemoKnowledge(true);openDemoNoteExperience(record);return;
        }
        openDemoNoteExperience(record);demoKnowledgeWorkspace?.action?.(id);
    }});
    infoPanel?.setExplorerOpen(true);return true;
}
function selectDemoNote(record){openDemoNoteExperience(record);return true;}
function demoKnowledgeIsModal(){return Boolean(demoKnowledgeWorkspace && !demoNoteRenderer && !demoKnowledgeRoot?.classList.contains('demo-note-showcase'));}
function demoNoteOwnsPointer(ray=latestControllerRay){
    const next=appRoot?.querySelector('[data-tryit-intro-continue]');
    const nextHit=next && !next.hidden && introWorldAnchor?welcomeSurfaceHit(introLocalPosition(introWorldAnchor,INTRO_CONTROL_POSITION),INTRO_CONTROL_SCALE[0],INTRO_CONTROL_SCALE[1],900,360,false,ray):null;
    return noteSurfaceOwnsRay(demoNoteHit(ray),[infoPanel?.hit(ray),nextHit]);
}
function openDemoNoteExperience(record){
    if(demoKnowledgeRoot?.dataset.noteRecord===String(record.id) && demoKnowledgeWorkspace?.action){focusDemoNoteControls(record);return;}
    closeDemoKnowledge(true);
    const placed=demoPlacedNoteViews.get(String(record.id));if(placed){demoKnowledgeRoot=placed.root;demoKnowledgeWorkspace=placed.workspace;demoNoteRenderer=placed.renderer;focusDemoNoteControls(record);return;}
    const root=document.createElement('section');root.dataset.noteRecord=String(record.id);demoKnowledgeRoot=root;appRoot.append(root);
    demoKnowledgeWorkspace=mountDemoNoteShowcase(root,record,{onChange:item=>{item.demoContent={...item.demoContent,title:item.name,description:item.description,lines:[item.description]};refreshDemoRecord(item);updateSimulatedMarkers();focusDemoNoteControls(item);},onClose:()=>closeDemoKnowledge(true)});
    root.classList.add('demo-knowledge-workspace','is-ar-pim-side-note');
    if(session && gl){root.style.cssText='position:fixed;left:-20000px;pointer-events:none';demoNoteRenderer=createNoteSpatialRenderer(gl,root,record,viewerMatrix,{widgetPlacement:demoNoteWidgetPlacement});demoPlacedNoteViews.set(String(record.id),{record,root,workspace:demoKnowledgeWorkspace,renderer:demoNoteRenderer});}
    focusDemoNoteControls(record);
}
function openDemoNoteEditor(record,widgetId=''){
    if(record.demoType==='note'){openDemoNoteExperience(record);demoKnowledgeWorkspace?.action?.('edit');return;}
    closeDemoKnowledge(true);
    const root=document.createElement('section');demoKnowledgeRoot=root;appRoot.append(root);
    demoKnowledgeWorkspace=mountSpatialNoteEditor(root,record,{widgetId,objectLabel:record.demoType==='zone'?'Totem':'Note',onSave:async update=>{Object.assign(record,update);record.demoContent={...record.demoContent,title:update.name,description:update.description,lines:[update.description]};refreshDemoRecord(record);updateSimulatedMarkers();},onClose:()=>{closeDemoKnowledge(true);focusDemoObjectControls(record);if(widgetId){openDemoNoteExperience(record);root.remove();demoKnowledgeRoot?.querySelector('[data-note-expand]')?.click();}}});
    root.classList.add('demo-knowledge-workspace','is-ar-pim-side-note');infoPanel?.suspend(true);
    if(session && !domOverlayEnabled && gl){closeDemoKnowledge(true);setGuide('Totem text editing is available in the creator tools. Use Controls to try its light and signage.');}
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
    if(record?.demoMapPiece){placeDemoMapTotem();updateSimulatedMarkers();return true;}
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
        demoPlacementHighlight:['plant','plant2'].includes(type),
        demoPlacementHighlightAt:performance.now(),
        demoExpanded: false,
        demoInteractive: !['plant', 'plant2'].includes(type),
        demoPanelOffset: panelOffsets[type],
        simulatedAnchor,
        informationPosition: null,
        revealTitle: true,
        revealLines: 3,
        texture: null,
        ...(type === 'note' ? {
            name: pathwayNotePlacementPending?NOTE_TEMPLATES.observation.title:DEMO_CONTENT.note.title,
            description: pathwayNotePlacementPending?spatialNoteTemplate('observation').description:'A prepared message about the two sample plant profiles.',
            demoContent: pathwayNotePlacementPending?NOTE_TEMPLATES.observation:DEMO_CONTENT.note,
            demoNoteTemplateIndex: Math.max(0,DEMO_NOTE_TEMPLATE_KEYS.indexOf('observation')),
            appearance: { note_template:'observation', color: spatialNoteTemplate('observation').color, size: 'small', opacity: .64, surface: 'outline' }
        } : {})
    };
    if (markers.length) marker = relateMinimalMarkers(marker, markers[0]?.id || 'demo-plant', 'part-of-story');
    marker.texture = createMarkerTexture(marker);
    markers.push(marker);
    if(type==='plant')completeDemoInteractionTask('place');
    demoFeedback?.sound('placement');pulseDemoHaptics(demoGrabInputSource || limInputSource);
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
    if(demoNoteRenderer && demoPlacedNoteViews.has(demoKnowledgeRoot?.dataset.noteRecord)){demoNoteRenderer=null;demoKnowledgeWorkspace=null;demoKnowledgeRoot=null;infoPanel?.suspend(false);return;}
    demoNoteRenderer?.destroy();demoNoteRenderer=null;
    demoKnowledgeMirror?.destroy();demoKnowledgeMirror=null;demoKnowledgePanel=null;
    demoKnowledgeWorkspace.destroy();demoKnowledgeWorkspace=null;demoKnowledgeRoot?.remove();demoKnowledgeRoot=null;
    const stage=appRoot?.querySelector('.tryit-stage'); if(stage) stage.inert=false;
    infoPanel?.suspend(false);
    suppressSessionSelectUntil=performance.now()+350;
}

function openDemoKnowledge(record,path='',edit=false) {
    demoFeedback?.sound('cell');pulseDemoHaptics(demoGrabInputSource || limInputSource);
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
    const map=updateSpatialLivingMap(introFrameToken || performance.now());
    if(map?.reveal.appear>0 && demoLivingMapOrigin){
        demoLivingMapXR ??= createDemoLivingMapXR(gl,demoLivingMapScene.scene);
        if(demoLivingMapScene.xrFrame!==introFrameToken){demoLivingMapScene.update(map.elapsed,map.reduced);demoLivingMapScene.xrFrame=introFrameToken;}
        demoLivingMapXR.draw(view,demoLivingMapOrigin,demoLivingMapOrientation,map.reveal.appear,demoLivingMapScene.totemLabel(map.elapsed));
    }
    for(const [id,note] of demoPlacedNoteViews){if(!markers.includes(note.record) || !demoAreaVisible(note.record) || note.record.demoHiddenForLimo)continue;try{note.renderer.draw(view,viewerMatrix);}catch(error){console.warn('Note widgets closed safely:',error);note.renderer.destroy();note.workspace.destroy();note.root.remove();demoPlacedNoteViews.delete(id);if(note.renderer===demoNoteRenderer){demoNoteRenderer=null;demoKnowledgeWorkspace=null;demoKnowledgeRoot=null;}}}
    if(demoNoteRenderer)return;
    if(!demoKnowledgeMirror || !demoKnowledgePanel) return;
    const model=spatialDashboardPanelMatrix(demoKnowledgePanel);
    // Existing demo quad spans ±.20 by ±.08 and has top-down texture UVs.
    for(let i=0;i<4;i++){model[i]*=5;model[4+i]*=-12.5;}
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    const p=gl.getAttribLocation(program,'p'),uv=gl.getAttribLocation(program,'uv');
    gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,'mvp'),false,multiply(view.projectionMatrix,multiply(view.transform.inverse.matrix,model)));
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,demoKnowledgeMirror.texture);gl.uniform1i(gl.getUniformLocation(program,'t'),0);gl.uniform1f(gl.getUniformLocation(program,'opacity'),1);
    gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,6);gl.depthMask(true);
    const axes=demoControllerInputSource()?.gamepad?.axes || [];const vertical=axes[3] ?? axes[1] ?? 0;
    if(Math.abs(vertical)>.4 && performance.now()-demoKnowledgeScrollAt>150){demoKnowledgeMirror.scrollBy(vertical*120);demoKnowledgeScrollAt=performance.now();}
}

function renderInterface(simulated) {
    for(const insect of butterflyCompanions){insect.model?.destroy();insect.canvas?.remove();}butterflyCompanions=[];
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
    appRoot.querySelector('.tryit-demo')?.addEventListener('click',event=>{if(event.target.closest('button')){demoFeedback?.start();demoFeedback?.sound('menu');}}, {capture:true});
    desktopSpatialPreviewCleanup=mountDesktopSpatialPreview(appRoot,{simulated,quest:isQuestHeadsetBrowser(),flat:true});
    appRoot.querySelector('[data-tryit-safety-help]')?.remove();
    appRoot.querySelector('[data-demo-ambient]')?.remove();ambientCanvas=null;
    rainV2Canvas=null;rainV2LastPaint=0;
    if(!simulated && session){
        const modelCanvas=document.createElement('canvas');modelCanvas.className='tryit-ambient-model';modelCanvas.style.visibility='hidden';modelCanvas.setAttribute('aria-hidden','true');modelCanvas.dataset.demoBeeModel='';
        appRoot.querySelector('.tryit-stage')?.prepend(modelCanvas);
        import('../services/demoBeeModel.js').then(({mountDemoBeeModel})=>{if(modelCanvas.isConnected)ambientBeeModel=mountDemoBeeModel(modelCanvas,{gl:simulated?null:gl});}).catch(error=>console.warn('Bee model unavailable:',error));
    }
    const hasPhoneScreenInput=Array.from(session?.inputSources || []).some(input=>input.targetRayMode==='screen');
    const phoneArPanel=Boolean(!simulated && sessionMode==='immersive-ar' && (hasPhoneScreenInput || (navigator.maxTouchPoints>0 && window.matchMedia('(pointer: coarse)').matches)));
    const demoRoot=appRoot.querySelector('.tryit-demo');if(demoRoot){demoRoot.dataset.rainStyle=demoRainStyle;demoRoot.dataset.rainIntensity=demoRainIntensity<=0?'off':demoRainIntensity<1?'light':demoRainIntensity>1?'heavy':'normal';}
    infoPanel?.destroy(); demoPanelActionSignature='';elementPanelActionSignature=''; infoPanel = createPimInfoPanel({root:appRoot,headset:!simulated,phoneAR:phoneArPanel,simpleDesktop:simulated,rainIntensity:demoRainIntensity,rainStyle:demoRainStyle,cellOpacity:demoCellOpacity,handMode:demoHandMode,panelHints:DEMO_PANEL_HINTS,onGraphicsQuality:()=>{introBoardTextureDirty=true;paintWelcomeLayer(performance.now());updateSimulatedMarkers();},onPerformanceAction:handleDemoPerformanceAction,onFloorOffset:updateDemoFloor,onTotemModel:()=>{for(const record of markers)record.totemCardsRefreshed=0;updateSimulatedMarkers();},onInfoOpacity:()=>{introBoardTextureDirty=true;},onExplorerAction:(record,action)=>{if(action.startsWith('KnowledgeMode:') && action!=='KnowledgeMode:explore' && record.tutorialStage==='plant' && !record.demoProfileInteracted){record.demoPimoLesson=knowledgeExplorer(record).mode==='tag'?'tag':'curiosity';showPersistentPimPrompt(record);}knowledgeRenderer?.clear(record);if((action==='KnowledgeResume' && record.knowledgeExplorer?.mode!=='explore' || action==='KnowledgeMode:curiosity') && record.demoSelectedNodeId)showDemoInfo(record,record.demoSelectedNodeId);refreshDemoPimProfile(record);},demoSound:demoFeedback,inputOccupied:source=>demoLivingMapGrip?.owns(source) || butterflyHeldBy(source) || heroDiceToy?.heldSource===source || knowledgeRenderer?.grabbedSource===source || (demoHeldIndex>=0 && demoGrabInputSource===source),onGripEvent:event=>{captureDemoInputEventRay(event);if(event.type==='squeezestart')return butterflyGripStart(event.inputSource);const held=butterflyCompanions.find(insect=>insect.heldSource===event.inputSource);if(held){releaseDemoButterfly(held);return true;}return false;},onGrab:source=>pulseDemoHaptics(source,true),onInteract:()=>{demoFeedback?.sound('menu');pulseDemoHaptics(demoGrabInputSource || limInputSource);},onHandMode:value=>{demoHandMode=value;},onRainIntensity:value=>{demoRainIntensity=value;const demo=appRoot?.querySelector('.tryit-demo');if(demo)demo.dataset.rainIntensity=value<=0?'off':value<1?'light':value>1?'heavy':'normal';},onRainStyle:value=>{demoRainStyle=value;const demo=appRoot?.querySelector('.tryit-demo');if(demo)demo.dataset.rainStyle=value;},onCellOpacity:value=>{demoCellOpacity=value;appRoot?.querySelectorAll('.plant-knowledge-map').forEach(map=>map.style.setProperty('--pim-cell-opacity',String(value)));if(arWelcomeShowcaseActive)introBoardTextureDirty=true;if(!knowledgeRenderer)for(const record of markers.filter(item=>item.demoType==='plant'))refreshDemoRecord(record);},onMove:refreshSimulatedPlacementAim,onEdit:(record,path)=>openDemoKnowledge(record,path,true),onPathwayAction:handlePathwayAction,onModuleAction:handleLearningModuleAction,onUtilityAction:handleDemoPanelAction});
    if(!simulated)publishDemoPerformance();
    infoPanel.setPanelHints(DEMO_PANEL_HINTS);
    if(!simulated)for(const variant of [{red:false,side:'right',seed:0,perchMs:INSECT_VISUALS.bluePerchMs,size:INSECT_VISUALS.blueSize},{red:true,side:'left',seed:1,perchMs:INSECT_VISUALS.redPerchMs,size:INSECT_VISUALS.redSize}]){
        const insect={...variant,model:null,startedAt:NaN,flightAnchor:null,encounter:null,lastElapsed:NaN,position:null,pose:null,canvas:document.createElement('canvas')};
        insect.canvas.className='tryit-butterfly-model';insect.canvas.dataset.butterflyVariant=variant.red?'red':'blue';insect.canvas.setAttribute('aria-hidden','true');insect.canvas.style.visibility='hidden';appRoot.querySelector('.tryit-stage')?.append(insect.canvas);butterflyCompanions.push(insect);
        import('../services/demoButterflyModel.js').then(({mountDemoButterflyModel})=>{if(insect.canvas.isConnected)insect.model=mountDemoButterflyModel(insect.canvas,{gl:simulated?null:gl,red:insect.red});}).catch(error=>console.warn('Butterfly unavailable:',error));
    }
    infoPanel.element?.classList.toggle('is-demo-panel',simulated);
    if(simulated)infoPanel.setCompact(true);
    infoPanel.setLearningModules(null);
    infoPanel.setRayFilter(ray=>!demoNoteOwnsPointer(ray));
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
    // Note widgets are placed objects, not a transient slide overlay.
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
    rainRenderer=createSpatialRainRenderer(gl);
    // Totem cards share the Totem's placement heading. They must not turn with
    // the viewer after the buttons have been aimed during placement.
    totemCardsRenderer = createSpatialTotemCards(gl,{faceTotemToViewer:false,ray:()=>latestControllerRay});
    tetherRenderer = createSpatialTetherRenderer(gl);
    try{handOutlineRenderer=createXRHandOutline(gl);}catch(error){console.warn('Hand outline unavailable:',error.message);}
    nearHandInteraction=createHandSurfaceInteraction({
        holdDuration:target=>target?.record?.knowledgeExplorer?.mode==='explore' && (target.node?.pimKnowledgeFace || target.node?.pimKnowledgeContext)?500:0,
        onHoldProgress:(target,amount)=>{if(target.record){target.record.pimObjectPressId=target.object.id+'|'+(target.face?.faceId || 'context');target.record.pimObjectPressProgress=amount;}},
        hitPoint:(point,source)=>{
            if(infoPanel?.isHandInteracting(source))return null;
            const hits=[knowledgeRenderer?.hitPoint(point),totemCardsRenderer?.hitPoint(point,{front:.045,back:.025}),welcomeHandTarget(point)].filter(Boolean).sort((a,b)=>a.distance-b.distance);
            const target=hits[0];return target?{...target,button:{action:target.kind==='lim-cell'?target.node.key:String(target.record?.id || target.record?.marker?.id)+'|'+(target.node?.knowledgeObjectId?target.node.knowledgeObjectId+'|'+(target.node.knowledgeFaceId || 'context'):target.node?.path || target.card?.id),disabled:target.button?.disabled}}:null;
        },
        onHover:target=>{
            if(handHoverRecord){delete handHoverRecord.handHoverPath;delete handHoverRecord.handHoverCardId;delete handHoverRecord.handHoverObjectFaceId;}handHoverRecord=target?.record || null;
            if(target?.node && target.record){target.record.handHoverPath=target.node.path;if(target.object)target.record.handHoverObjectFaceId=target.card.id;}
            else if(target?.record)target.record.handHoverCardId=target.card.id;
            if(target?.kind==='lim-cell' && contextCellKey!==target.node.key){contextCellKey=target.node.key;introBoardTextureDirty=true;}
        },
        onPress:(target,source)=>{
            if(target.kind==='lim-cell'){limActivation?.cancel();toggleLimCell(target.node.key);}
            else if(target.node)selectDemoProfileCell({record:target.record,target:{node:target.node},inputSource:source,intentionalHold:Boolean(target.holdCompleted)});
            else activateDemoTotemCard(target);
        }
    });
    prismRenderer = createSpatialPrismRenderer(gl);
    totemSculptureRenderer = createSpatialTotemSculpture(gl);
    triangleRenderer = createSpatialTriangleRenderer(gl);knowledgeRenderer=createKnowledgeSpatialRenderer(gl,{ray:()=>latestControllerRay,tether:tetherRenderer});
    heroDiceToy=createHeroDiceToy(gl,{home:()=>{const p=introWorldAnchor?introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition):null;return p?{x:p.x,y:calibratedDemoGroundY(),z:p.z}:null;},visible:()=> (arWelcomeSettleStage || !arWelcomeIntroPending) && getSpatialVisualSettings().heroDice!==false,onFeedback:(kind,source)=>{demoFeedback?.start();demoFeedback?.sound('dice');if(source)demoFeedback?.pulse(source,kind==='grab'?.22:.12,45);},canGrab:target=>{if(demoLivingMapGrip?.owns(target.source) || placementReady || demoKnowledgeIsModal() || demoWebModeOpen || infoPanel?.isHandInteracting(target.source))return false;const hits=[infoPanel?.hit(target.inputRay),knowledgeRenderer?.hit(target.inputRay),totemCardsRenderer?.hit(target.inputRay),demoNoteRenderer?.hit(target.inputRay)].filter(Boolean);return hits.every(hit=>hit.distance>=target.distance);}});
}

function demoControllerInputSource() {
    const sources = [...(session?.inputSources || [])];
    if(demoHeldIndex>=0 && sources.includes(demoGrabInputSource))return demoGrabInputSource;
    const trackedControllers = sources.filter(source => source.targetRayMode === 'tracked-pointer' && !source.hand);
    return trackedControllers.find(source => source.handedness === 'right' && source.gamepad)
        || trackedControllers.find(source => source.handedness === 'right')
        || trackedControllers.find(source => source.gamepad)
        || trackedControllers[0]
        || sources.find(source => source.targetRayMode === 'screen' && source.targetRaySpace)
        || null;
}

function updateDemoControllerRay(frame,time=performance.now()) {
    beginHandTrackingFrame(frame,time);
    latestControllerRay = null;
    latestHandState = null;
    latestTrackedHandStates = [];
    demoPointerRays = [];
    const sources = [...(session?.inputSources || [])];
    if (sources.some(source => source.hand || source.targetRayMode === 'tracked-pointer')) spatialPointerInputSeen = true;
    if (!referenceSpace) return;
    latestTrackedHandStates = sources.filter(source => source.hand)
        .map(source => ({ source, state: handTrackingState(frame, source, referenceSpace) }))
        .filter(entry => entry.state?.tracked);
    demoPointerRays=latestTrackedHandStates.filter(entry=>entry.state.pointer).map(entry=>({source:entry.source,ray:entry.state.pointer}));
    for(const source of sources.filter(source=>!source.hand && source.targetRayMode==='tracked-pointer')){
        const space=source.targetRaySpace || source.gripSpace;
        const ray=space?controllerRayFromPose(frame.getPose(space,referenceSpace),source.handedness || 'right'):null;
        if(ray)demoPointerRays.push({source,ray});
    }
    const activeHand = latestTrackedHandStates.find(entry => entry.state.pinch && entry.state.pointer)
        || latestTrackedHandStates.find(entry => entry.source.handedness === 'right' && entry.state.pointer)
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
    demoFeedbackInputSource=event?.inputSource || demoFeedbackInputSource;
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

const butterflyPinchStates=new WeakMap(),butterflyGestureSources=new WeakSet();
const butterflyTriggerSources=new WeakSet();
function butterflyHeldBy(source){return Boolean(source && (butterflyGestureSources.has(source) || butterflyCompanions.some(insect=>insect.heldSource===source)));}
function releaseDemoButterfly(insect){
    const perch=infoPanel?.getPerchPose(insect.side),position=insect.handPosition || insect.position;
    const hits=latestControllerRay?[infoPanel?.hit(latestControllerRay),knowledgeRenderer?.hit(latestControllerRay),totemCardsRenderer?.hit(latestControllerRay),demoNoteHit(latestControllerRay)].filter(Boolean):[];
    const surface=butterflyDropSurface(position,hits);
    const landed=Boolean(surface);
    const rest=landed?surface:position;
    const anchor=perch || insect.flightAnchor || {right:{x:1,y:0,z:0},normal:{x:0,y:0,z:1}};
    insect.heldSource=null;insect.perchMs=landed?4500:0;
    insect.startedAt=arWelcomeClock.elapsed-(landed?0:4500);insect.releasedPerch=landed;
    const resumed=landed?null:demoButterflyPose(arWelcomeClock.elapsed,insect.startedAt,{perchMs:0,seed:insect.seed});
    insect.flightAnchor=rest?{...anchor,center:{x:rest.x-(anchor.right.x*(resumed?.x || 0)+anchor.normal.x*(resumed?.z || 0)),y:rest.y+(landed ? .025 : 0)-(resumed?.y || 0),z:rest.z-(anchor.right.z*(resumed?.x || 0)+anchor.normal.z*(resumed?.z || 0))}}:null;insect.lastElapsed=NaN;insect.encounter=null;
}
function butterflyRayTarget(){
 const ray=latestControllerRay;if(!ray)return null;let nearest=null;
 for(const insect of butterflyCompanions){if(insect.heldSource || !insect.position)continue;const p=insect.position,dx=p.x-ray.origin.x,dy=p.y-ray.origin.y,dz=p.z-ray.origin.z,t=dx*ray.direction.x+dy*ray.direction.y+dz*ray.direction.z;if(t<0 || t>2.5 || nearest && t>=nearest.distance)continue;const error=Math.hypot(dx-ray.direction.x*t,dy-ray.direction.y*t,dz-ray.direction.z*t);if(error<.08)nearest={kind:'butterfly',id:'butterfly-'+insect.seed,distance:t,insect,point:p};}return nearest;
}
function butterflyGripStart(source){
 const target=resolveDemoCellTarget();if(target?.kind!=='butterfly')return false;
 const nearest=target.insect;nearest.heldSource=source;nearest.controllerDistance=target.distance;nearest.handPosition={...nearest.position};nearest.releasedPerch=false;return true;
}
function pollButterflyPinches(){
    for(const insect of butterflyCompanions)if(insect.heldSource?.hand && !latestTrackedHandStates.some(entry=>entry.source===insect.heldSource)){releaseDemoButterfly(insect);}
    for(const {source,state} of latestTrackedHandStates){
        if(demoLivingMapGrip?.owns(source))continue;
        const thumb=state.rawJoints.get('thumb-tip'),index=state.rawJoints.get('index-finger-tip');if(!thumb || !index)continue;
        const point={x:(thumb.x+index.x)/2,y:(thumb.y+index.y)/2,z:(thumb.z+index.z)/2};
        if(!state.pinch)butterflyGestureSources.delete(source);
        const held=butterflyCompanions.find(insect=>insect.heldSource===source),previous=butterflyPinchStates.get(source);butterflyPinchStates.set(source,state.pinch);
        if(held && !state.pinch){releaseDemoButterfly(held);}
        else if(state.pinch && previous===false && !held){const insect=butterflyCompanions.find(item=>!item.heldSource && item.position && Math.hypot(item.position.x-point.x,item.position.y-point.y,item.position.z-point.z)<.12);if(insect){butterflyGestureSources.add(source);insect.heldSource=source;insect.handOffset={x:insect.position.x-point.x,y:insect.position.y-point.y,z:insect.position.z-point.z};}}
        const attached=butterflyCompanions.find(insect=>insect.heldSource===source);if(attached)attached.handPosition={x:point.x+attached.handOffset.x,y:point.y+attached.handOffset.y,z:point.z+attached.handOffset.z};
    }
}

function pollDemoHandPinch() {
    if (!latestHandState?.pointer) {
        if (handPinchActive && demoHeldIndex >= 0) releaseHeldDemoRecord();
        handPinchActive = false;
        return;
    }
    const pinching = Boolean(latestHandState.pinch);
    const source=latestTrackedHandStates.find(entry=>entry.state===latestHandState)?.source;
    if(demoLivingMapGrip?.owns(source) || butterflyHeldBy(source) || infoPanel?.getHeldInputSource()===source || infoPanel?.isHandInteracting(source) || nearHandInteraction?.isNear(source)){handPinchActive=pinching;return;}
    if (pinching && !handPinchActive) {
        let handled=Boolean(demoNoteOwnsPointer() && demoNoteHit(latestControllerRay)?.noteRenderer.activate(latestControllerRay));
        if(!handled && demoNoteRenderer && activateImmersiveDemoControl()){closeDemoKnowledge(true);handled=true;}
        if(!handled)handled=Boolean(infoPanel?.activateHand(latestControllerRay,source,latestHandState));
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
    const ctx = localizedCanvasContext(label.getContext('2d'));
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
    text=demoLocalizedText(text);
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

function demoParagraphReadingTime(text){return Math.max(6000,String(text || '').trim().split(/\s+/).length*350+1800);}
function fitIntroBodyLayout(ctx, text, maxWidth, maxHeight) {
    text=demoLocalizedText(text);
    const paragraphs = String(text || '').split(/\n\n/);
    // All slides use the accepted Intro 1.2 type size. Longer copy reveals in
    // a reading window, rather than shrinking the type or clipping a paragraph.
    const reference=demoLocalizedText(DEMO_QUICK_ACCESS_COPY['INTRO 1.2']).split(/\n\n/);
    for (let fontSize = 68; fontSize >= 24; fontSize -= 1) {
        const lineHeight = Math.round(fontSize * 1.22);
        const paragraphGap = Math.round(fontSize * .5);
        ctx.font = `600 ${fontSize}px "Manrope", "Segoe UI Variable", Inter, system-ui, sans-serif`;
        const paragraphLines = paragraphs.map(paragraph => wrappedTextureLines(ctx, paragraph, maxWidth));
        const referenceLines=reference.map(paragraph=>wrappedTextureLines(ctx,paragraph,maxWidth));
        const totalHeight = referenceLines.reduce((height, lines) => height + lines.length * lineHeight, 0)
            + Math.max(0, referenceLines.length - 1) * paragraphGap;
        if (totalHeight <= 352 || fontSize === 24) {
            return { fontSize, lineHeight, paragraphGap, paragraphLines };
        }
    }
    return { fontSize: 23, lineHeight: 28, paragraphGap: 12, paragraphLines: [] };
}

function introReadingWindow(layout,count,height){
    let first=0;const end=Math.min(count,layout.paragraphLines.length);
    const size=()=>layout.paragraphLines.slice(first,end).reduce((sum,lines)=>sum+lines.length*layout.lineHeight,0)+Math.max(0,end-first-1)*layout.paragraphGap;
    while(first<end-1 && size()>height)first++;
    return {first,end,height:size()};
}

function createSpatialKnowledgeTexture(record) {
    const content = demoContentFor(record);
    if (!gl || !content) return null;
    const label = document.createElement('canvas');
    label.width = record.demoType === 'zone' ? 720 : PIM_TEXTURE_SIZE.width;
    label.height = record.demoType === 'zone' ? 1120 : PIM_TEXTURE_SIZE.height;
    const ctx = localizedCanvasContext(label.getContext('2d'));
    if (record.demoType === 'plant') {
        if(record.knowledgeExplorer && !simulatedMode)return null;
        const bloomProgress = record.pimBloomStarted
            ? (performance.now() - record.pimBloomStarted) / PIM_BLOOM_DURATION_MS
            : 1;
        if (bloomProgress >= 1) record.pimClosingNodePaths = [];
        const closingPaths = record.pimClosingNodePaths || [];
        const size = demoPimSurfaceSize(record);
        record.pimTextureSize = size;
        return createPlantInformationHoneycombTexture(gl, knowledgeFor(record), demoPimExpandedNodeIds(record), {
            ...demoSpatialPimLayoutOptions(record),
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
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D, texture);
    // The PIM and other demo boards use explicit top-left UVs in the quad.
    // Callers opt into upload flipping only when a texture needs it.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, Boolean(flipY));
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    const storage=demoTextureStorage.get(texture);
    if(storage?.width===label.width && storage?.height===label.height)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,label);
    else {gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,label);demoTextureStorage.set(texture,{width:label.width,height:label.height});}
    const mipmapped=[label.width,label.height].every(value=>value>0 && (value & (value-1))===0);
    if(mipmapped)gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmapped?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function createXrRecoveryTexture(){
    const label=xrRecoveryCanvas ||= document.createElement('canvas');
    label.width=1200;label.height=560;
    const ctx=localizedCanvasContext(label.getContext('2d'));
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
    const ctx = localizedCanvasContext(label.getContext('2d'));
    ctx.clearRect(0, 0, label.width, label.height);
    if(arWelcomeShowcaseActive){
        arWelcomeRenderedFrames=drawArWelcomeShowcase(ctx,arWelcomeClock.elapsed,window.matchMedia('(prefers-reduced-motion: reduce)').matches,arWelcomeClusters,{opening:arWelcomeOpeningActive,minimalIntro:arWelcomeIntroPending,openingSeed:arWelcomeOpeningSeed,openingDuration:arWelcomeOpeningDuration,minimalStartAt:DEMO_ARCHETYPE_START_MS,minimalInterval:DEMO_ARCHETYPE_INTERVAL_MS,minimalRevealDuration:DEMO_ARCHETYPE_REVEAL_MS,hidden:limHiddenCells,drawCells:limMeshVisible,drawPanel:arWelcomeSharedBoard && introBoardVisible,drawRoots:arWelcomeSharedBoard && introBoardVisible,rootMilestone:arWelcomeRootMilestone,rootMilestoneStartedAt:arWelcomeRootMilestoneStartedAt,drawContent:drawIntroNoteContent,progression:{cellsActivatedAt:limMeshActivatedAt,expandedLimIds:[...limExpandedCells],expandedAt:Object.fromEntries(limExpandedAt)},cellOpacity:currentCellOpacity(),selectedKey:selectedLimCell,hoverKey:contextCellKey,pathwayKey:limPathwayState.status==='active'?(currentPathwayNode()?.key || ''):'',holdKey:limActivation?.activeKey,holdProgress:limActivation?.progress || 0,connectedKey:nativeConnectionState?.phase==='connected'?nativeConnectionTargetKey():''});
        return canvasTexture(label,texture);
    }
    drawArWelcomePanel(ctx,{elapsed:arWelcomeClock.elapsed,reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,backgroundOpacity:.38});
    drawIntroNoteContent(ctx);
    return canvasTexture(label, texture);
}

function drawIntroNoteContent(ctx) {
    // The glass/rim fades in first. Text appears once at its final white value.
    if(arWelcomeOpeningActive && arWelcomeClock.elapsed<900)return;
    ctx.globalAlpha=1;
    if(introBoardStep==='UTILITY 1.1' && demoLivingMapScene){
        ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillStyle='#dfecc8';ctx.font=`600 25px ${DEMO_PRESENTATION_FONT}`;
        ctx.fillText('UTILITY 1.1',700,130,920);
        ctx.fillStyle='#f4f5e7';ctx.font=`700 48px ${DEMO_PRESENTATION_FONT}`;
        ctx.fillText(guidedDemoStep('UTILITY 1.1').title,700,175,920);
        ctx.font=`500 28px ${DEMO_PRESENTATION_FONT}`;
        ctx.fillText('Explore how plants, Totems and Areas connect a living place.',700,225,850);
        ctx.font=`500 25px ${DEMO_PRESENTATION_FONT}`;
        const elapsed=demoLivingMapElapsed(),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        drawLivingMapPreview(ctx,demoLivingMapScene,elapsed,reduced,DEMO_MAP_RECT);
        if(livingMapReveal(elapsed,reduced).preview<.05){
            ctx.font=`500 34px ${DEMO_PRESENTATION_FONT}`;
            const copy=demoLocalizedText(livingMapPlacementCopy(demoLivingMapPlacement?.snapshot().length || 0));
            wrappedTextureLines(ctx,copy,850).forEach((line,index)=>ctx.fillText(line,700,370+index*44));
            ctx.font=`500 28px ${DEMO_PRESENTATION_FONT}`;
            ctx.fillText('Grip a Totem beside the frame. Release it on the pulsing circle.',700,710,850);
            ctx.fillText('Grip both plate edges to carry, turn and tilt. Release to leave it in place.',700,770,850);
        }
        ctx.restore();return;
    }
    // Give the copy the full readable centre of the glass screen without
    // reaching its sloped sides. The extra width keeps long slides legible.
    const contentLeft = 260;
    const contentWidth = 880;
    const contentCenter = contentLeft + contentWidth / 2;
    const titleWidth = 960;
    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 29px ${DEMO_PRESENTATION_FONT}`;
    ctx.fillText(introBoardStep.startsWith('UTILITY ')?introBoardStep:demoIntroLabel(), contentCenter, 345, contentWidth);
    const openingElapsed=arWelcomeIntroPending && !arWelcomeSettleStage ? (arWelcomeClock?.elapsed || 0) : null;
    if(openingElapsed!==null){
        if(arWelcomeOpeningActive || openingElapsed<DEMO_WELCOME_OPENING_MS){
            const openingTitle=demoLocalizedText('Welcome to the NourishlandXR demo');
            let openingTitleSize=96;
            ctx.fillStyle='#ffffff';
            do {ctx.font=`700 ${openingTitleSize}px ${DEMO_PRESENTATION_FONT}`;if(ctx.measureText(openingTitle).width<=titleWidth)break;openingTitleSize-=2;} while(openingTitleSize>36);
            ctx.fillText(openingTitle,contentCenter,420);
            if(openingElapsed>=DEMO_WELCOME_TITLE_HOLD_MS){
                ctx.fillStyle='#fff';ctx.textBaseline='top';
                const layout=fitIntroBodyLayout(ctx,demoLocalizedText(DEMO_QUICK_ACCESS_COPY['INTRO 1.1']),contentWidth,360);
                ctx.font=`600 ${layout.fontSize}px ${DEMO_PRESENTATION_FONT}`;
                const count=introOpeningCopySkipped || window.matchMedia('(prefers-reduced-motion: reduce)').matches?layout.paragraphLines.length:layout.paragraphLines.filter((lines,index)=>openingElapsed>=DEMO_WELCOME_TITLE_HOLD_MS+layout.paragraphLines.slice(0,index).reduce((total,prior)=>total+demoParagraphReadingTime(prior.join(' ')),0)).length;
                const windowLayout=introReadingWindow(layout,count,360);let y=515;
                for(const [index,lines] of layout.paragraphLines.entries()){
                    if(index<windowLayout.first || index>=windowLayout.end)continue;
                    const previous=layout.paragraphLines.slice(0,index).map(lines=>lines.join(' '));
                    const age=introOpeningCopySkipped?Infinity:openingElapsed-DEMO_WELCOME_TITLE_HOLD_MS-previous.reduce((total,text)=>total+demoParagraphReadingTime(text),0);
                    ctx.save();ctx.globalAlpha=1;ctx.beginPath();ctx.rect(contentLeft,y-2,contentWidth,(window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.max(0,Math.min(1,age/1100)))*(lines.length*layout.lineHeight+4));ctx.clip();
                    for(const line of lines){ctx.fillText(line,contentCenter,y);y+=layout.lineHeight;}ctx.restore();y+=layout.paragraphGap;
                }
            }
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
    // The surface owns its transition; avoid tinting freshly revealed copy twice.
    ctx.globalAlpha=1;
    // Accent colours illuminate the surface, while the copy stays bright and
    // neutral so blue and orange narrative stages remain equally readable.
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    const typedBody = narrative?.text || introBoardVisibleBody;
    const visibleParagraphs = typedBody.split(/\n\n/);
    // Keep the first body line clear of the divider and the clipping edge;
    // its ascenders were previously being cut because the baseline sat too
    // close to the clip rectangle.
    const bodyTop = 498;
    const bodyBottom = introBoardNextGuideVisible && introBoardNextGuide ? 850 : 900;
    const bodyLayout = fitIntroBodyLayout(ctx, narrative?.text || introBoardBody, contentWidth, bodyBottom - bodyTop);
    ctx.font = `600 ${bodyLayout.fontSize}px ${DEMO_PRESENTATION_FONT}`;
    const bodyX = contentCenter;
    const windowLayout=introReadingWindow(bodyLayout,visibleParagraphs.filter(Boolean).length,bodyBottom-bodyTop);
    const bodyHeight=windowLayout.height;
    let paragraphY = bodyTop+Math.max(0,(bodyBottom-bodyTop-bodyHeight)/2);
    let clipped = false;
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentLeft, bodyTop - 8, contentWidth, bodyBottom - bodyTop + 12);
    ctx.clip();
    ctx.textBaseline = 'top';
    outer: for (const [paragraphIndex, completeLines] of bodyLayout.paragraphLines.entries()) {
        if(paragraphIndex<windowLayout.first || paragraphIndex>=windowLayout.end)continue;
        const visibleLines = wrappedTextureLines(ctx, visibleParagraphs[paragraphIndex] || '', contentWidth);
        ctx.save();
        const reveal=window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,Math.max(0,(performance.now()-(introBoardParagraphFadeTimes[paragraphIndex] ?? -Infinity))/1100));ctx.globalAlpha=1;ctx.beginPath();ctx.rect(contentLeft,paragraphY-2,contentWidth,reveal*(completeLines.length*bodyLayout.lineHeight+4));ctx.clip();
        for (const [lineIndex, line] of visibleLines.entries()) {
            const lineY = paragraphY + lineIndex * bodyLayout.lineHeight;
            if (lineY > bodyBottom) { clipped = true;ctx.restore();break outer; }
            ctx.fillText(line, bodyX, lineY);
        }
        ctx.restore();
        paragraphY += completeLines.length * bodyLayout.lineHeight + bodyLayout.paragraphGap;
    }
    if (clipped) ctx.fillText('…', bodyX, bodyBottom);
    ctx.restore();
    ctx.restore();
    }
    if(introBoardNextGuideVisible && introBoardNextGuide){
        ctx.strokeStyle='rgba(241,249,237,.23)';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(contentLeft,865);ctx.lineTo(contentLeft+contentWidth,865);ctx.stroke();
        ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#e7f5bb';
        ctx.font=`500 30px ${DEMO_PRESENTATION_FONT}`;
        const guideLines=wrappedTextureLines(ctx,`Next · ${introBoardNextGuide}`,contentWidth);
        guideLines.slice(0,2).forEach((line,index)=>ctx.fillText(line,contentCenter,875+index*29,contentWidth));
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.restore();
}

function createIntroControlTexture(labelText, texture = null, aimed=false,disabled=false) {
    const label = document.createElement('canvas');
    label.width = 2048;
    label.height = 1024;
    const ctx = localizedCanvasContext(label.getContext('2d'));
    drawLivingFrameButton(ctx,labelText,aimed,disabled);
    const result=canvasTexture(label, texture);
    applyLivingFrameButtonSampling(gl);
    return result;
}

function createIntroPointerTexture(texture = null) {
    const label = document.createElement('canvas');
    label.width = 256;
    label.height = 256;
    const ctx = localizedCanvasContext(label.getContext('2d'));
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
    const label=document.createElement('canvas');label.width=480;label.height=320;const ctx=localizedCanvasContext(label.getContext('2d'));
    const face=ctx.createLinearGradient(50,35,430,285);face.addColorStop(0,'rgba(117,151,139,.3)');face.addColorStop(1,'rgba(48,86,73,.18)');
    ctx.fillStyle=face;ctx.strokeStyle='rgba(235,250,224,.92)';ctx.lineWidth=7;ctx.setLineDash([18,12]);ctx.beginPath();ctx.roundRect(42,42,396,236,34);ctx.fill();ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(235,250,224,.9)';ctx.font='750 28px system-ui';ctx.textAlign='center';ctx.fillText('NOTE',240,176);
    return canvasTexture(label,texture);
}

function createTotemPlacementTexture(texture = null) {
    const label=document.createElement('canvas');label.width=360;label.height=900;const ctx=localizedCanvasContext(label.getContext('2d'));
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
    const ctx = localizedCanvasContext(label.getContext('2d'));
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
    let openingCopyRevealActive=false;
    if(arWelcomeShowcaseActive){
        // XR sessions may report visible-blurred (or omit visibilityState).
        // Only a truly hidden session should pause the opening clock.
        if(arWelcomeClockFrame!==introFrameToken){arWelcomeClock.tick(Date.now(),session?.visibilityState!=='hidden');arWelcomeClockFrame=introFrameToken;}
        const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(arWelcomeOpeningActive && !reducedMotion){let start=DEMO_WELCOME_TITLE_HOLD_MS;for(const paragraph of introBoardBody.split(/\n\n/)){const age=arWelcomeClock.elapsed-start;if(age>=0 && age<1100)openingCopyRevealActive=true;start+=demoParagraphReadingTime(paragraph);}}
        const rootRefreshState={milestone:arWelcomeRootMilestone,elapsed:arWelcomeClock.elapsed,milestoneStartedAt:arWelcomeRootMilestoneStartedAt,reducedMotion};
        const rootsNeedRefresh=arWelcomeSharedBoard && introBoardVisible && welcomeRootsNeedRefresh(rootRefreshState) && arWelcomeClock.elapsed-arWelcomeRootsLastRefreshAt>=WELCOME_ROOT_REFRESH_MS;
        const mapAnimating=introBoardStep==='UTILITY 1.1' && livingMapReveal(demoLivingMapElapsed(now),reducedMotion).preview>0;
        const paragraphFadeActive=!reducedMotion && now-introBoardParagraphFadeStartedAt<1100;
        if(openingCopyRevealActive || mapAnimating || paragraphFadeActive || (limMeshVisible && limRevealIsAnimating()) || (!reducedMotion && introBoardVisible && now-introTextureUploadedAt>=WELCOME_RIM_MOTION.refreshMs) || rootsNeedRefresh){
            introBoardTextureDirty=true;
            if(rootsNeedRefresh)arWelcomeRootsLastRefreshAt=arWelcomeClock.elapsed;
        }
    }
    const textIsTyping=Boolean(introBoardBody && introBoardVisibleBody.length<introBoardBody.length);
    const paragraphFadeActive=!window.matchMedia('(prefers-reduced-motion: reduce)').matches && now-introBoardParagraphFadeStartedAt<1100;
    const textureInterval=limActivation?.active || textIsTyping || paragraphFadeActive || openingCopyRevealActive ? DEMO_TEXT_TEXTURE_INTERVAL_MS : DEMO_LIM_TEXTURE_INTERVAL_MS;
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
        const textureKey=controlLabel+'|'+aimed+'|'+continueButton.disabled;
        if (!introControlTexture || introControlTextureLabel !== textureKey) {
            introControlTexture = createIntroControlTexture(controlLabel, introControlTexture,aimed,continueButton.disabled);
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
    const ctx = localizedCanvasContext(label.getContext('2d'));
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
    const ctx = localizedCanvasContext(label.getContext('2d'));
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
    const ctx = localizedCanvasContext(label.getContext('2d'));
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

function paintDemoButterfly(now){
    if(!simulatedMode)return;
    const panel=infoPanel?.element,bounds=panel?.getBoundingClientRect();
    for(const insect of butterflyCompanions){
        if(!getSpatialVisualSettings().insects || !insect.model?.ready || !panel || panel.hidden || panel.style.visibility==='hidden' || !bounds?.width){insect.canvas.style.visibility='hidden';continue;}
        if(!Number.isFinite(insect.startedAt))insect.startedAt=arWelcomeClock.elapsed;
        const pose=demoButterflyPose(arWelcomeClock.elapsed,insect.startedAt,{reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,perchMs:insect.perchMs,seed:insect.seed});
        pose.wingPhase=insect.seed*1.9;pose.size=insect.size;
        const perch={x:insect.side==='left'?bounds.left:bounds.right,y:bounds.top};
        if(pose.flight>0)insect.flightAnchor ||= perch;else insect.flightAnchor=null;
        const anchor=insect.flightAnchor || perch;insect.model.renderSprite(arWelcomeClock.elapsed,pose);
        let x=anchor.x+pose.x*220+(window.innerWidth*.53-anchor.x)*pose.close,y=anchor.y-pose.y*200+(window.innerHeight*.45-anchor.y)*pose.close;
        // Stay on the outer side of the panel rather than visiting the reading frame.
        if(pose.flight>0){const side=insect.side==='left'?-1:1;x=anchor.x+side*Math.abs(pose.x)*220;y=anchor.y-pose.y*200;}
        insect.canvas.style.visibility='visible';insect.canvas.style.opacity=String(pose.opacity);insect.canvas.style.left=x+'px';insect.canvas.style.top=y+'px';insect.canvas.style.transform=`translate(-50%,${pose.flight>0?'-50%':'-78%'}) scale(${(insect.red?.84:1)*(1+pose.close*.25)})`;
    }
}
function keepButterflyOutsideFrame(position,side){
    if(!introWorldAnchor || !introBoardVisible || !arWelcomeSharedBoard)return position;
    const center=introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition);
    const matrix=billboardMatrix(center,AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080,introWorldAnchor);
    const width=Math.hypot(matrix[0],matrix[1],matrix[2]),height=Math.hypot(matrix[4],matrix[5],matrix[6]);
    const right={x:matrix[0]/width,y:matrix[1]/width,z:matrix[2]/width};
    const up={x:matrix[4]/height,y:matrix[5]/height,z:matrix[6]/height};
    const dx=position.x-center.x,dy=position.y-center.y,dz=position.z-center.z;
    const x=dx*right.x+dy*right.y+dz*right.z,y=dx*up.x+dy*up.y+dz*up.z;
    // The existing board quad spans .4 by .16 before its matrix scale.
    const halfWidth=width*.4/2+.16,halfHeight=height*.16/2+.16;
    if(Math.abs(y)>halfHeight || Math.abs(x)>halfWidth)return position;
    const offset=(side==='left'?-halfWidth:halfWidth)-x;
    return {x:position.x+right.x*offset,y:position.y+right.y*offset,z:position.z+right.z*offset};
}
function drawSpatialButterfly(view){
    if(!getSpatialVisualSettings().insects || !program || !buffer || !viewerMatrix)return;
    for(const insect of butterflyCompanions){
        if(!insect.model?.ready)continue;const perch=infoPanel?.getPerchPose(insect.side);if(!perch && !insect.flightAnchor)continue;
        const elapsed=arWelcomeClock.elapsed;
        if(!Number.isFinite(insect.startedAt))insect.startedAt=elapsed;
        if(insect.lastElapsed!==elapsed){
            const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const pose=demoButterflyPose(elapsed,insect.startedAt,{reducedMotion,perchMs:insect.perchMs,seed:insect.seed});if(!pose)continue;
            if(insect.releasedPerch)pose.opacity=1;
            pose.wingPhase=insect.seed*1.9;pose.size=insect.size;
            if(pose.flight>0 && perch)insect.flightAnchor ||= {...perch,center:{...perch.center}};
            const anchor=insect.flightAnchor || perch;if(!anchor)continue;
            let position={x:anchor.center.x+anchor.right.x*pose.x+anchor.normal.x*pose.z,y:anchor.center.y+pose.y,z:anchor.center.z+anchor.right.z*pose.x+anchor.normal.z*pose.z};
            if(pose.close>0){
                if(insect.encounter?.index!==pose.encounterIndex)insect.encounter={index:pose.encounterIndex,x:viewerMatrix[12]-viewerMatrix[8]*.85+viewerMatrix[0]*(insect.red?-.18:.18),y:viewerMatrix[13]-.10,z:viewerMatrix[14]-viewerMatrix[10]*.85+viewerMatrix[2]*(insect.red?-.18:.18)};
                position={x:position.x+(insect.encounter.x-position.x)*pose.close,y:position.y+(insect.encounter.y-position.y)*pose.close,z:position.z+(insect.encounter.z-position.z)*pose.close};
            }
            if(pose.flight>0 && !insect.releasedPerch)position=keepButterflyOutsideFrame(position,insect.side);
            position=keepInsectAboveFloor(position,calibratedDemoGroundY());
            if(pose.state!=='landed' && insect.position){const dx=position.x-insect.position.x,dy=position.y-insect.position.y,dz=position.z-insect.position.z,horizontal=Math.hypot(dx,dz);if(horizontal>.0001){pose.yaw=Math.atan2(dx,dz);pose.pitch=-Math.atan2(dy,horizontal)*.4;}}
            if(pose.state==='landed')pose.yaw=insect.red?-.85:.85;
            insect.position=position;insect.pose=pose;insect.lastElapsed=elapsed;
        }
        insect.model.drawXR(view,insect.heldSource && insect.handPosition?insect.handPosition:insect.position,elapsed,insect.heldSource?{...insect.pose,state:'landed',flight:0}:insect.pose);
    }
}
function blendInsectWithFlower(position,visit,visitor){
    const elapsed=arWelcomeClock.elapsed;
    let offset={x:0,y:0,z:0};
    if(visit.amount && introWorldAnchor && introBoardVisible && arWelcomeSharedBoard){
        const flowers=livingFrameFlowerSites(elapsed);
        if(flowers.length){
            // Pin the destination while new flower sites appear around it.
            if(visitor && visitor.flowerVisit?.index!==visit.index)visitor.flowerVisit={index:visit.index,previous:visitor.flowerVisit?.flower?{...visitor.flowerVisit.flower}:null,flower:{...flowers[((visit.index%flowers.length)+flowers.length)%flowers.length]},startedAt:elapsed};
            const selected=visitor?.flowerVisit?.flower || flowers[visit.index%flowers.length],previous=visitor?.flowerVisit?.previous,travel=visit.transfer ?? 1,flower=previous?{x:previous.x+(selected.x-previous.x)*travel,y:previous.y+(selected.y-previous.y)*travel}:selected,center=introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition);
            const board=billboardMatrix(center,AR_PHONE_COMFORT.boardScale[0]*2500/1400,AR_PHONE_COMFORT.boardScale[1]*2100/1080,introWorldAnchor);
            const local=demoBillboardTextureLocalPoint(flower.x+550,flower.y+510,2500,2100),target=introLocalPosition(board,[local.x,local.y,.09]);
            if(visitor)visitor.nectarTarget=target;
            const arrival=visitor && !visitor.flowerVisit.previous?Math.max(0,Math.min(1,(elapsed-visitor.flowerVisit.startedAt)/1200)):1;
            const amount=visit.amount*arrival*arrival*(3-2*arrival);
            offset={x:(target.x-position.x)*amount,y:(target.y-position.y)*amount,z:(target.z-position.z)*amount};
        }
    }else if(visitor){visitor.flowerVisit=null;visitor.nectarTarget=null;}
    if(visitor){
        // Ease the handoff between a curious return and the next flower visit,
        // including release to the flight ring. Both eyes share one update.
        const previous=visitor.flowerOffset || {x:0,y:0,z:0};
        const delta=Math.max(0,Math.min(100,elapsed-(visitor.flowerOffsetAt ?? elapsed-16))),blend=1-Math.exp(-delta/350);
        offset={x:previous.x+(offset.x-previous.x)*blend,y:previous.y+(offset.y-previous.y)*blend,z:previous.z+(offset.z-previous.z)*blend};
        visitor.flowerOffset=offset;visitor.flowerOffsetAt=elapsed;
    }
    return {x:position.x+offset.x,y:position.y+offset.y,z:position.z+offset.z};
}

function drawSpatialAmbientLife(view){
    // Never display a different bee while the animated model is loading.
    if(!getSpatialVisualSettings().insects || !ambientBeeModel?.ready || !viewerMatrix || !Number.isFinite(ambientBeesStartedAt))return;
    if(!ambientWorldAnchor){
        introWorldAnchor ||= introWorldAnchorFromViewer(viewerMatrix);
        ambientWorldFrame=introWorldAnchor || new Float32Array(viewerMatrix);
        ambientWorldAnchor=introWorldAnchor
            ? introLocalPosition(introWorldAnchor,AR_PHONE_COMFORT.boardPosition)
            : {x:viewerMatrix[12]-viewerMatrix[8]*2.4,y:viewerMatrix[13],z:viewerMatrix[14]-viewerMatrix[10]*2.4};
    }
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for(let index=0;index<BEE_COUNT;index++){
        const bee=demoBeePose(arWelcomeClock.elapsed,ambientBeesStartedAt,index,{attention:'control',encounters:!reducedMotion,encounterSeed:ambientEncounterSeed});
        if(!bee)continue;
        // The ambient anchor is established from the current viewer pose above.
        // Referencing the old `base` name here threw on every immersive frame as
        // soon as the Meet a Plant Orb step enabled the bees. Because the frame
        // had already been cleared, that made the whole AR scene disappear.
        const position=ambientBeeWorldPosition(bee,index);
        const visitor=ambientBeeFlowerVisits[index] ||= {},last=visitor.flightPosition;
        if(last && visitor.flightAt!==arWelcomeClock.elapsed){const dx=position.x-last.x,dy=position.y-last.y,dz=position.z-last.z;if(Math.hypot(dx,dz)>.00001)visitor.flightYaw=Math.atan2(dx,dz);visitor.flightSpeed=Math.hypot(dx,dy,dz)/Math.max(.001,(arWelcomeClock.elapsed-visitor.flightAt)/1000);}
        visitor.flightPosition={...position};visitor.flightAt=arWelcomeClock.elapsed;
        visitor.encounterId=bee.flyby>.2?index+':'+bee.encounterIndex:'';
        bee.worldYaw=(visitor.flightYaw ?? bee.heading)+Math.sin(arWelcomeClock.elapsed*.0017+index)*.16;
        const displacement=Math.hypot(ambientBeeAvoidance[index]?.x || 0,ambientBeeAvoidance[index]?.y || 0,ambientBeeAvoidance[index]?.z || 0);
        const flowerDistance=visitor.nectarTarget?Math.hypot(position.x-visitor.nectarTarget.x,position.y-visitor.nectarTarget.y,position.z-visitor.nectarTarget.z):Infinity;
        bee.nectar=beeWingsAtRest({nectar:visitor.nectar,flyby:bee.flyby,displacement,speed:visitor.flightSpeed ?? Infinity,flowerDistance,pointerContact:beePointerContact(position,latestControllerRay)});
        ambientBeeModel?.drawXR?.(view,position,arWelcomeClock.elapsed,{...bee,viewer:viewerMatrix});
    }
}

function ambientBeeWorldPosition(bee,index=0){
    const frame=ambientWorldFrame || viewerMatrix;
    const rightLength=Math.hypot(frame[0],frame[2])||1;
    const rightX=frame[0]/rightLength,rightZ=frame[2]/rightLength;
    const frontLength=Math.hypot(frame[8],frame[10])||1;
    const frontX=frame[8]/frontLength,frontZ=frame[10]/frontLength;
    // Map the flight ring to the Living Frame's roughly 540 px flower rim,
    // using the same original 1400 x 1080 board coordinates as its artwork.
    const orbitAngle=Math.atan2(.5-bee.y,bee.x-.5);
    const orbitRadius=WELCOME_SHAPE.radius+45+Math.sin(index+arWelcomeClock.elapsed/2700)*24;
    const across=Math.cos(orbitAngle)*orbitRadius/1400*AR_PHONE_COMFORT.boardScale[0]*.4;
    const vertical=(Math.sin(orbitAngle)*orbitRadius-10)/1080*AR_PHONE_COMFORT.boardScale[1]*.16;
    // Enter from behind the rim, then stay just in front of its flowers;
    // the reading surface in the centre is not the ambient flight path.
    const hoverDepth=(-.18)*(1-(bee.entry ?? 1))+(.085+((bee.depth+1)*.5)*.05)*(bee.entry ?? 1);
    let ambientPosition={
        x:ambientWorldAnchor.x+rightX*across+frontX*hoverDepth,
        y:ambientWorldAnchor.y+vertical,
        z:ambientWorldAnchor.z+rightZ*across+frontZ*hoverDepth
    };
    const age=arWelcomeClock.elapsed-ambientBeesStartedAt;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visit=beeFlowerVisit(age,index,{enabled:true});
    if(reducedMotion)ambientBeeReturn[index]=null;
    else if(bee.flyby>.02 && bee.flybyProgress>=.72 && Number.isFinite(bee.encounterEndAt)){
        ambientBeeReturn[index]={endAt:ambientBeesStartedAt+bee.encounterEndAt,flowerIndex:bee.encounterIndex*BEE_COUNT+index};
    }
    const returning=ambientBeeReturn[index];
    if(returning){
        const returnProgress=Math.max(0,Math.min(1,(arWelcomeClock.elapsed-returning.endAt)/4600));
        const returnAmount=1-returnProgress*returnProgress*(3-2*returnProgress);
        if(arWelcomeClock.elapsed>returning.endAt+4600)ambientBeeReturn[index]=null;
        else if(returnAmount>visit.amount)visit={amount:returnAmount,index:returning.flowerIndex};
    }
    const flowerVisitor=ambientBeeFlowerVisits[index] ||= {};
    ambientPosition=blendInsectWithFlower(ambientPosition,visit,flowerVisitor);
    flowerVisitor.nectar=Boolean(visit.nectar && flowerVisitor.flowerVisit && arWelcomeClock.elapsed-flowerVisitor.flowerVisit.startedAt>7500);
    const flyby=Math.max(0,Math.min(1,Number(bee.flyby)||0));
    if(!flyby)return beeWorldAvoidance(ambientPosition,index);
    const progress=Math.max(0,Math.min(1,Number(bee.flybyProgress)||0));
    if(!ambientEncounterOrigin || ambientEncounterOrigin.index!==bee.encounterIndex){
        ambientEncounterOrigin={index:bee.encounterIndex,x:viewerMatrix[12],y:viewerMatrix[13],z:viewerMatrix[14]};
    }
    const curious=beeCuriosity(progress);
    const encounter=bee.encounterIndex+ambientEncounterSeed+index,faceDistance=.66+(encounter%3)*.10+Math.abs(progress-.5)*.34;
    const approach=Math.abs(encounter)%4,faceAcross=(bee.waistVisit?(index%2?.20:-.20):[.38,-.34,.10,.28][approach])+(progress-.5)*.20,faceHeight=bee.waistVisit?-.65:[.10,.08,.42,.28][approach];
    const facePosition={
        x:ambientEncounterOrigin.x+rightX*faceAcross-frontX*faceDistance,
        y:ambientEncounterOrigin.y+faceHeight-Math.sin(Math.PI*progress)*.025,
        z:ambientEncounterOrigin.z+rightZ*faceAcross-frontZ*faceDistance
    };
    const dx=facePosition.x-viewerMatrix[12],dy=facePosition.y-viewerMatrix[13],dz=facePosition.z-viewerMatrix[14],distance=Math.hypot(dx,dy,dz)||1;
    // Only curious body vibration responds to gaze; wingbeats stay active.
    const attention=Math.max(0,Math.min(1,((-viewerMatrix[8]*dx-viewerMatrix[9]*dy-viewerMatrix[10]*dz)/distance-.90)/.07));
    bee.headTurn*=attention;bee.bank*=1-flyby+flyby*attention;
    facePosition.x+=curious.x*attention;facePosition.y+=curious.y*attention;facePosition.z+=curious.z*attention;
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
    const time=arWelcomeClock.elapsed,delta=Math.max(0,Math.min(100,time-(ambientBeeAvoidanceTime[index] ?? time-16))),blend=1-Math.exp(-delta/600);ambientBeeAvoidanceTime[index]=time;
    const eased={x:offset.x+(target.x-offset.x)*blend,y:offset.y+(target.y-offset.y)*blend,z:offset.z+(target.z-offset.z)*blend};
    ambientBeeAvoidance[index]=eased;
    return keepInsectAboveFloor({x:position.x+eased.x,y:position.y+eased.y,z:position.z+eased.z},calibratedDemoGroundY());
}

function drawNativeConnectionSpatial(view){
    const state=nativeConnectionState,record=nativeConnectionPlant();
    if(!state || !record?.demoExpanded || !introWorldAnchor || !tetherRenderer || !sphereRenderer || !viewerMatrix || state.phase==='source')return;
    const panel=demoPimPanel(record,ensureDemoPimPose(record));
    const size=record.pimTextureSize || demoPimSurfaceSize(record);
    const layoutKey=`${size.layoutWidth}:${size.layoutHeight}:${demoPimExpandedNodeIds(record).join('|')}:${record.demoSelectedNodeId || ''}`;
    if(state.sourceLayoutKey!==layoutKey){
        state.sourceLayoutKey=layoutKey;
        state.sourceVisualNode=pimVisibleNodes(knowledgeFor(record),demoPimExpandedNodeIds(record),{...demoSpatialPimLayoutOptions(record),selectedNodeId:record.demoSelectedNodeId,layoutWidth:size.layoutWidth,layoutHeight:size.layoutHeight}).find(node=>node.nodeId===state.sourceId || node.path===state.sourcePath) || null;
    }
    const sourceNode=state.sourceVisualNode?pimNodeVisualPosition(state.sourceVisualNode):null;
    const targetNode=arWelcomeRenderedFrames.flatMap(frame=>frame.nodes).find(node=>node.limId===state.targetId && node.opacity>.5);
    const sourceSurface=knowledgeRenderer?.surface(record,state.sourcePath);
    if(!panel || (!sourceNode && !sourceSurface) || !targetNode)return;
    const sx=((sourceNode?.x || 50)/100-.5)*panel.width,sy=(.5-(sourceNode?.y || 50)/100)*panel.height;
    const source=sourceSurface?.center || {x:panel.center.x+panel.right.x*sx+panel.up.x*sy,y:panel.center.y+panel.right.y*sx+panel.up.y*sy,z:panel.center.z+panel.right.z*sx+panel.up.z*sy};
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

function drawSpatialRain(view,time){
    if(!viewerMatrix || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    drawSpatialRainField(gl,rainRenderer,view,time,{quality:currentRainQuality(),progress:demoRainProgress(arWelcomeClock.elapsed),origin:viewerMatrix,groundY:Number.isFinite(groundYEstimate)?groundYEstimate:viewerMatrix[13]-1.6});
}

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
            { type: orbType, color: material?.shell, ringColor: material?.ring, knowledge:orbType==='plant' ? demoOrbKnowledge(record) : null, placementHighlight:record.demoPlacementHighlight,placementAge:performance.now()-(record.demoPlacementHighlightAt || 0), held:demoHeldIndex===index, grabReady:demoGrabPreparingIndex===index, highlighted:signTargets.has(record.id) || orbType==='plant' && hoveredPlant===record || demoHeldIndex===index || demoGrabPreparingIndex===index, time:performance.now()/1000 }
        );
    });
    markers.forEach(record => {
        if (record.demoType !== 'zone' || !demoAreaVisible(record)) return;
        const totemColour=demoHexColour(record.demoTotemColor || record.demoContent?.accent)
            .map(channel=>Math.min(.95,channel*SPATIAL_OBJECT_VISUALS.totem.postContrast+SPATIAL_OBJECT_VISUALS.totem.postLift));
        const arrival=Math.max(0,Math.min(1,(performance.now()-(record.demoArriveAt || 0))/900));
        const groundBaseY = Number.isFinite(Number(record.groundBaseY))
            ? Number(record.groundBaseY)
            : Number(record.position?.y || 0) - demoTotemHalfHeight(record);
        const bodyHalfWidth=record.demoMapPiece?.04:.095,bodyHalfDepth=record.demoMapPiece?.036:.075,bodyHalfHeight=demoTotemHalfHeight(record),rotationY=demoTotemRotationY(record);
        const style=renderedTotemStyle(record);
        if(style==='organic' || style==='flat-disc'){
            const radius=style==='organic'?.28:.32,light=totemNotificationLight(record),base={...record.position,y:groundBaseY+(style==='organic'?radius:.045)};
            drawSpatialSphere(gl,sphereRenderer,view.projectionMatrix,view.transform.inverse.matrix,base,radius,{color:totemColour,alpha:arrival*.92,emissive:.12,...(style==='flat-disc'?{scale:{x:1,y:.16,z:1}}:{})});
            drawSpatialSphere(gl,sphereRenderer,view.projectionMatrix,view.transform.inverse.matrix,{...base,y:base.y+(style==='organic'?radius:.07)},.045,{color:light.colour,alpha:arrival*.86,emissive:light.strength+.22});return;
        }
        const postOptions={halfWidth:bodyHalfWidth,halfHeight:bodyHalfHeight,halfDepth:bodyHalfDepth,
            notification:totemNotificationLight(record),
            color:totemColour,alpha:arrival*demoTotemVisualOpacity(record),rotationY,style,
            signsVisible:record.demoTotemSignsVisible,faded:record.demoTotemFaded,controlOpacity:arrival,
            highlighted:Boolean(record.totemSelectedCard || record.demoMapPiece)};
        if(style==='basic')drawSpatialPrism(gl,prismRenderer,view,{...record.position,y:groundBaseY},{...postOptions,topColor:totemColour,woodGrain:.8,topTaper:.96});
        else drawTotemSculpture(gl, totemSculptureRenderer, view, { ...record.position, y:groundBaseY },postOptions);
        if(record.demoMapPiece)return;
        if(record.demoMapPiece)return;
        drawSpatialTotemButtons(gl,sphereRenderer,view.projectionMatrix,view.transform.inverse.matrix,{...record.position,y:groundBaseY},rotationY,{
            bodyHalfWidth:bodyHalfWidth,bodyHalfDepth,bodyHalfHeight,style,
            signsVisible:Boolean(record.demoTotemSignsVisible),faded:Boolean(record.demoTotemFaded),arrivalOpacity:arrival,
            fadeOpacity:record.demoTotemFaded ? Math.max(.78,demoTotemVisualOpacity(record)) : 1
        });
    });
    const linkedTotems = markers.filter(record => record.demoType === 'zone' && record.demoLinkVisible && demoAreaVisible(record));
    if (linkedTotems.length >= 2) {
        const [first, second] = linkedTotems;
        const route=demoGroundLinkRoute(first,second);
        if(route){const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const alpha=reduced?.76:.72+Math.sin(performance.now()/1800)*.07;drawSpatialGroundArrowPath(gl,tetherRenderer,view,route.start,route.end,{width:.026,dashLength:.25,gapLength:.12,arrowSpacing:.65,arrowLength:.16,arrowWidth:.10,color:[.70,.84,.67,alpha]});}
    }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const p = gl.getAttribLocation(program, 'p'); const uv = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
    drawIntroSpatial(view);
    markers.forEach(record => {
        if(demoPlacedNoteViews.has(String(record.id)))return;
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
        if(record.demoType==='plant' && record.demoExpanded && record.knowledgeExplorer)return;
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
        if(noteSign && !record.demoNotePose){const basis=billboardMatrix(displayPosition,1,1);record.demoNotePose={right:{x:basis[0],y:basis[1],z:basis[2]},up:{x:0,y:1,z:0},normal:{x:basis[8],y:basis[9],z:basis[10]}};}
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
            : noteSign ? fixedPimPanelMatrix({...record.demoNotePose,position:displayPosition},noteScale.x,noteScale.y) : billboardMatrix(
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
            const base={...record.position,y:record.groundBaseY ?? record.position.y-demoTotemHalfHeight(record)};
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
    if(knowledgeRenderer){
        knowledgeRenderer.begin();
        for(const plant of markers){
            if(plant.demoType!=='plant' || !plant.demoExpanded || !plant.knowledgeExplorer || !demoAreaVisible(plant) || demoKnowledgeWorkspace)continue;
            plant.knowledgeFloor=calibratedDemoGroundY();
            knowledgeRenderer.draw(view,plant,knowledgeFor(plant),demoPimExpandedNodeIds(plant),ensureDemoPimPose(plant),introFrameToken || performance.now());
        }
        knowledgeRenderer.end();
    }
    drawNativeConnectionSpatial(view);
    for(const record of markers){
        if(!signTargets.has(record.id) || !demoAreaVisible(record))continue;
        if(record.demoType==='plant'){
            const material=DEMO_ORB_MATERIALS[record.demoOrbColor],radius=(material?.radius || .068)*(sessionMode==='immersive-vr'?DEMO_QUEST_ORB_SCALE:1)*(record.demoAmbientNeighbour && record.demoInteractive===false ? .78 : 1);
            drawSignDestinationHighlight(gl,tetherRenderer,view,record.position,{width:radius*2.36,height:radius*2.36});
        }else if(record.demoType==='note'){
            const scale=record.demoAmbientNeighbour ? .62 : 1;
            drawSignDestinationHighlight(gl,tetherRenderer,view,record.position,{width:.4*DEMO_NOTE_IMMERSIVE_SCALE.x*scale,height:.16*DEMO_NOTE_IMMERSIVE_SCALE.y*scale,shape:'box'});
        }
    }

}

function drawDemoControllerPointer(view) {
    if(latestTrackedHandStates.length && demoHandMode==='outline')handOutlineRenderer?.draw(view,latestTrackedHandStates);
    const original=latestControllerRay;
    try{
        for(const entry of demoPointerRays.length?demoPointerRays:[{source:demoControllerInputSource(),ray:original}]){
            latestControllerRay=entry.ray;drawDemoInputPointer(view,entry.source);
        }
    }finally{latestControllerRay=original;}
}
function drawDemoInputPointer(view,pointerSource) {
    if (!tetherRenderer) return;
    // Android exposes taps as a WebXR `screen` ray. It remains available for
    // hit testing, but the Quest laser/contact sphere must only be rendered
    // for tracked spatial input.
    if (!latestControllerRay || pointerSource?.targetRayMode === 'screen' || (demoHandMode==='outline' && (pointerSource?.hand || latestTrackedHandStates.length>0))) return;
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
    // Butterflies can be caught along the ray, but never clamp the laser tip.
    const surface = [limSurface,controlSurface,greenSurface,placementSurface,pimSurface,hoveredRecordHit,demoNoteHit(latestControllerRay),heroDiceToy?.hit(latestControllerRay),infoPanel?.hit(latestControllerRay),totemCardsRenderer?.hit(latestControllerRay)].filter(Boolean).sort((a,b)=>a.distance-b.distance)[0];
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
        const arSession = await requestImmersiveArSession(appRoot,{targetFrameRate:getSpatialVisualSettings().refreshRate});
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
        try { referenceSpace = await session.requestReferenceSpace('local-floor');referenceSpaceHasFloor=true; } catch { referenceSpace = await session.requestReferenceSpace('local');referenceSpaceHasFloor=false; }
        try {
            const viewerSpace = await session.requestReferenceSpace('viewer');
            hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
        } catch (error) {
            hitTestSource = null;
            setGuide(`${sessionMode === 'immersive-vr' ? 'Spatial device immersive mode' : 'Passthrough AR'} is active. Surface detection unavailable; placement uses your view direction. (${error.message})`);
        }
        setupRenderer();
        demoLivingMapGrip?.destroy();
        demoLivingMapGrip=createLivingMapGripInput({
            enabled:()=>introBoardStep==='UTILITY 1.1' && demoLivingMapReady() && Boolean(demoLivingMapOrigin) && demoHeldIndex<0 && !demoKnowledgeIsModal() && demoExitLifecycle.state===DEMO_EXIT_STATES.IDLE,
            origin:()=>demoLivingMapOrigin,rotation:()=>demoLivingMapOrientation,onRotate:setDemoLivingMapRotation,onMove:p=>{demoLivingMapOrigin={x:p.x,y:p.y,z:p.z};},
            canUse:(source,contact)=>{if(butterflyHeldBy(source) || heroDiceToy?.heldSource===source || knowledgeRenderer?.grabbedSource===source || infoPanel?.getHeldInputSource()===source)return false;if(!contact)return true;return [infoPanel?.hit(contact.ray),knowledgeRenderer?.hit(contact.ray),totemCardsRenderer?.hit(contact.ray),demoNoteHit(contact.ray)].filter(Boolean).every(hit=>hit.distance>=contact.distance);},
            onGrab:source=>pulseDemoHaptics(source,true)
        });
        demoLivingMapGrip.bind(session,referenceSpace);
        // Finish constructing the immersive UI and its welcome texture before
        // the first XR frame is requested. Desktop fallback is rendered by the
        // caller only when session setup fails.
        renderInterface(false);
        // Warm the welcome canvas and upload before headset frames begin.
        introNoteTexture=createIntroNoteTexture(introNoteTexture);
        introBoardTextureDirty=false;introTextureUploadedAt=performance.now();
        beginXrFirstContentWatchdog();
        session.addEventListener('select', event => {
            if(event.inputSource?.hand)return;
            if(demoExitLifecycle.state!==DEMO_EXIT_STATES.IDLE)return;
            if(xrRecoveryStatus==='failed'){returnToWelcome();return;}
            captureDemoInputEventRay(event);
            if(butterflyTriggerSources.has(event.inputSource)){butterflyTriggerSources.delete(event.inputSource);return;}
            // The dedicated LIM listener normally consumes this event first.
            // Keep an independent route here because some Quest runtimes do
            // not deliver capture-phase XRInputSourceEvents consistently.
            // Resolve the same nearest surface used by the visible laser so a
            // PIMO in front of LIMO receives the trigger the visitor sees.
            if(event.inputSource===limInputSource || event.inputSource===limInputSuppressSource && performance.now()<limActivationSessionSuppressUntil)return;
            if(demoKnowledgeIsModal()){const hit=spatialDashboardRayHit(latestControllerRay,demoKnowledgePanel,demoKnowledgeMirror || {});if(hit) demoKnowledgeMirror?.activateAt(hit.pixelX,hit.pixelY);return;}
            if(demoNoteOwnsPointer() && demoNoteHit(latestControllerRay)?.noteRenderer.activate(latestControllerRay))return;
            if(demoNoteRenderer && activateImmersiveDemoControl()){closeDemoKnowledge(true);return;}
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
        heroDiceToy?.bindSession(session,referenceSpace);nearHandInteraction?.bindSession(session);
        knowledgeRenderer?.bindSession(session,referenceSpace,{mode:sessionMode,onActivate:target=>selectDemoProfileCell({record:target.record,target:{node:target.node},inputSource:target.inputSource,intentionalHold:true}),canGrab:target=>{if(demoLivingMapGrip?.owns(target.source) || heroDiceToy?.heldSource===target.source)return false;const panel=target.contactPoint?infoPanel?.hitPoint(target.contactPoint):infoPanel?.hit(target.inputRay || latestControllerRay);return !arWelcomeIntroPending && !placementReady && !demoKnowledgeWorkspace && (!panel || panel.distance>=target.distance);}});
        pimHold=bindSpatialPimHold({session,enabled:()=>!knowledgeRenderer?.movingAtAim() && demoExitLifecycle.state===DEMO_EXIT_STATES.IDLE && nativeConnectionState?.phase!=='source' && !demoKnowledgeWorkspace && !demoWebModeOpen && !arWelcomeIntroPending && !placementReady,
            // Use the same nearest visible surface as the laser and main XR
            // select route. A Control panel hit behind a nearer PIMO cell must
            // not disable the cell's hold/short-release interaction.
            getTarget:()=>{const target=resolveDemoCellTarget();return target?.kind==='pim-cell' && target.record?.knowledgeExplorer?.mode!=='explore'?target:null;},activate:selectDemoProfileCell,captureEvent:captureDemoInputEventRay,
            progress:({record,target},amount)=>{record.pimPressPath=(target.node || target).path;record.pimPressProgress=amount;queueDemoPimTextureRefresh(record);}
        });
        session.addEventListener('selectstart', event => {
            if(event.inputSource?.hand)return;
            if(demoExitLifecycle.state!==DEMO_EXIT_STATES.IDLE)return;
            captureDemoInputEventRay(event);
            if(!demoKnowledgeWorkspace && !placementReady && butterflyGripStart(event.inputSource)){butterflyTriggerSources.add(event.inputSource);event.stopImmediatePropagation?.();return;}
            // If the capture-phase LIM listener is unavailable, still keep a
            // trigger aimed at the mesh out of the plant grab state machine.
            const pressedCell=resolveDemoCellTarget();
            if(pressedCell?.kind==='lim-cell'){
                if(limInputSource!==event.inputSource){limInputSuppressSource=null;limInputSource=event.inputSource;limActivation.start(pressedCell.node.key,performance.now(),'xr-hold-fallback');startLimActivationFrame();}
                return;
            }
            if(['pim-cell','panel','note'].includes(pressedCell?.kind))return;
            if(demoKnowledgeIsModal()) return;
            if(totemCardsRenderer?.hit(latestControllerRay)) return;
            if (demoWebModeOpen || performance.now() < suppressSessionSelectUntil) return;
            if (arWelcomeIntroPending || placementReady) return;
            // Trigger selects; object movement belongs to the grip button.
        });
        session.addEventListener('selectend', event => {
            if(event.inputSource?.hand)return;
            captureDemoInputEventRay(event);
            const butterfly=butterflyCompanions.find(insect=>insect.heldSource===event.inputSource);if(butterfly && butterflyTriggerSources.has(event.inputSource)){releaseDemoButterfly(butterfly);suppressSessionSelectUntil=performance.now()+280;return;}
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
            // A trigger release must not end a grip-owned grab.
            suppressSessionSelectUntil = performance.now() + 280;
        });
        session.addEventListener('squeezestart',event=>{
            captureDemoInputEventRay(event);
            if(demoNoteOwnsPointer() && demoNoteHit(latestControllerRay)?.noteRenderer.beginGrab(latestControllerRay,event.inputSource)){event.stopImmediatePropagation();return;}
            if(event.inputSource?.hand || arWelcomeIntroPending || placementReady || demoKnowledgeWorkspace || demoWebModeOpen)return;
            captureDemoInputEventRay(event);if(butterflyGripStart(event.inputSource))return;
            const target=demoRecordAtPointer(),panelTarget=resolveDemoCellTarget(),signHit=totemCardsRenderer?.hit(latestControllerRay);
            if(panelTarget?.kind==='panel' && (!target || panelTarget.distance<=target.hit.distance) || signHit && (!target || signHit.distance<=target.hit.distance))return;
            demoGrabInputSource=event.inputSource;beginControllerDemoHold();
        });
        session.addEventListener('squeezeend',event=>{if([...demoPlacedNoteViews.values()].some(note=>note.renderer.releaseGrab(event.inputSource))){event.stopImmediatePropagation();return;}if(event.inputSource===demoGrabInputSource){captureDemoInputEventRay(event);releaseHeldDemoRecord();suppressSessionSelectUntil=performance.now()+280;}for(const insect of butterflyCompanions)if(insect.heldSource===event.inputSource)releaseDemoButterfly(insect);});
        const launchedSession=session;
        session.addEventListener('end', () => { void demoExitLifecycle.handleSessionEnd(launchedSession); },{once:true});
        const draw = (_time, frame) => {
            if (!session || frame.session !== session || !gl) return;
            session.requestAnimationFrame(draw);
            measureXrFrame=getSpatialVisualSettings().showFps || session.frameRate>90;
            const cpuStarted=measureXrFrame?performance.now():0;
            demoPerformance.tick(_time);
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
            runXrFrameStep('controller update',()=>updateDemoControllerRay(frame,_time));
            runXrFrameStep('landscape two-hand grip',()=>demoLivingMapGrip?.update(frame));
            for(const note of demoPlacedNoteViews.values())if(note.renderer.heldSource){const ray=demoControllerRayForInputEvent({frame,inputSource:note.renderer.heldSource});note.renderer.updateGrab(ray);}
            runXrFrameStep('butterfly pinch',()=>{pollButterflyPinches();for(const insect of butterflyCompanions){if(!insect.heldSource || insect.heldSource.hand)continue;const elapsed=insect.depthUpdatedAt?Math.max(0,Math.min(60,_time-insect.depthUpdatedAt)):16;insect.depthUpdatedAt=_time;const ray=demoControllerRayForInputEvent({frame,inputSource:insect.heldSource});if(!ray){releaseDemoButterfly(insect);continue;}const axes=insect.heldSource.gamepad?.axes || [];insect.controllerDistance=Math.max(.25,Math.min(2.5,insect.controllerDistance+spatialDepthDelta(axes.length>2?axes[3]:axes[1],elapsed)));insect.handPosition={x:ray.origin.x+ray.direction.x*insect.controllerDistance,y:ray.origin.y+ray.direction.y*insect.controllerDistance,z:ray.origin.z+ray.direction.z*insect.controllerDistance};}});
            runXrFrameStep('controller skip',pollDemoControllerSkip);
            runXrFrameStep('PIM hover',syncDemoPimHover);
            runXrFrameStep('controller depth',()=>pollDemoControllerDepth(_time));
            runXrFrameStep('floor dice input',()=>heroDiceToy?.update(frame,_time));
            runXrFrameStep('knowledge object input',()=>knowledgeRenderer?.updateInput(frame));
            runXrFrameStep('Control panel update',()=>infoPanel?.update(viewerMatrix, _time, latestControllerRay, frame,source=>demoLivingMapGrip?.owns(source) || butterflyHeldBy(source) || heroDiceToy?.heldSource===source || knowledgeRenderer?.grabbedSource===source || demoHeldIndex>=0 || demoKnowledgeIsModal()));
            runXrFrameStep('LIM hover',syncImmersiveLimHover);
            runXrFrameStep('hand surface touch',()=>nearHandInteraction?.update(latestTrackedHandStates,_time,source=>demoLivingMapGrip?.owns(source) || butterflyHeldBy(source) || heroDiceToy?.heldSource===source || knowledgeRenderer?.grabbedSource===source || demoHeldIndex>=0 || Boolean(placementReady || demoKnowledgeWorkspace || demoWebModeOpen || arWelcomeIntroPending || demoExitLifecycle.state!==DEMO_EXIT_STATES.IDLE)));
            runXrFrameStep('hand pinch',()=>{if(!demoLivingMapGrip?.active && !knowledgeRenderer?.movingAtAim())pollDemoHandPinch();});
            runXrFrameStep('LIM activation',()=>tickLimActivation(_time));
            runXrFrameStep('panel diagnostic',()=>{
                if(!limPanelDiagnosticRecorded && infoPanel?.getPosition?.()){
                    limDiagnostic('companion-panel-position',infoPanel.getPosition());
                    limPanelDiagnosticRecorded=true;
                }
            });
            runXrFrameStep('PIM hold',()=>pimHold?.tick(_time));
            runXrFrameStep('held element update',()=>{if(!demoKnowledgeWorkspace)updateHeldDemoRecordPosition();});
            runXrFrameStep('demo touch feedback',()=>{
                const sources=[...session.inputSources],beeContactSources=getSpatialVisualSettings().insects?sources.filter(source=>{
                    const ray=demoControllerRayForInputEvent({frame,inputSource:source});
                    return ambientBeeFlowerVisits.some(visitor=>beePointerContact(visitor?.flightPosition,ray));
                }):[];
                const beeEncounters=getSpatialVisualSettings().insects?ambientBeeFlowerVisits.filter(visitor=>visitor?.encounterId && visitor.flightPosition && viewerMatrix && Math.hypot(visitor.flightPosition.x-viewerMatrix[12],visitor.flightPosition.y-viewerMatrix[13],visitor.flightPosition.z-viewerMatrix[14])<.95).map(visitor=>visitor.encounterId):[];
                const beesAround=session.visibilityState!=='hidden' && getSpatialVisualSettings().insects && ambientBeeFlowerVisits.some(visitor=>visitor?.flightPosition && viewerMatrix && Math.hypot(visitor.flightPosition.x-viewerMatrix[12],visitor.flightPosition.y-viewerMatrix[13],visitor.flightPosition.z-viewerMatrix[14])<3.5);
                demoFeedback?.tick(_time,{sources,heldSource:demoHeldIndex>=0?demoGrabInputSource:infoPanel?.getHeldInputSource?.(),beeContactSources,beeEncounters,beeAround:beesAround});
            });
            let layer=null;
            try { layer=frame.session.renderState.baseLayer; }
            catch(error){reportDemoRenderFailure(error,'XR framebuffer');return;}
            if(!layer){reportDemoRenderFailure(new Error('XR base layer unavailable.'),'XR framebuffer');return;}
            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.clearColor(0, 0, 0, transparentSession ? 0 : 1);
            if(!pose){gl.disable(gl.SCISSOR_TEST);gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);return;}
            gl.enable(gl.SCISSOR_TEST);
            let renderedContent=false;
            for (const view of pose?.views || []) {
                const viewport = layer.getViewport(view);
                if (!viewport) continue;
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                // The welcome is already prepared. Show recovery only after a failure.
                runXrFrameStep('rain render',()=>drawSpatialRain(view, _time));
                if(runXrFrameStep('marker render',()=>drawMarker(view)))renderedContent=true;
                runXrFrameStep('PIM render',()=>drawDemoKnowledge(view));
                runXrFrameStep('Control panel render',()=>infoPanel?.draw(view));
                runXrFrameStep('floor dice render',()=>heroDiceToy?.draw(view));
                runXrFrameStep('butterfly render',()=>drawSpatialButterfly(view));
                runXrFrameStep('ambient render',()=>drawSpatialAmbientLife(view));
                runXrFrameStep('pointer render',()=>drawDemoControllerPointer(view));
                if(xrRecoveryStatus==='failed')runXrFrameStep('recovery surface',()=>drawXrRecoverySurface(view));
            }
            gl.disable(gl.SCISSOR_TEST);
            if(renderedContent)markXrFirstContentRendered();
            if(measureXrFrame)demoPerformance.frameComplete(performance.now()-cpuStarted);
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
    if(isDesktopLearningBookTarget()){
        app.innerHTML=`<section class="screen ar-safety-screen nxr-desktop-ar-choice"><header class="page-header"><p class="welcome-label">NourishlandXR · desktop</p><h1>A spatial experience belongs in a real space.</h1><p class="subtitle">The AR demo is not designed for desktop use. It needs a compatible phone or headset for spatial tracking and interaction with the environment.</p></header><section class="panel nxr-desktop-ar-option"><h2>Explore the illustrated introduction</h2><p>On desktop, our existing book-style prototype explains how places, plant information and learning connect. There is no simulated AR mode.</p><button type="button" class="primary" data-desktop-learning-book>Open illustrated introduction</button></section><button type="button" data-desktop-ar-back>← Back to welcome</button></section>`;
        app.querySelector('[data-desktop-learning-book]')?.addEventListener('click',()=>renderDesktopLearningBook(app,{moringaDocument:MORINGA_PIM,onExit:()=>window.renderLaunchScreen?.()}),{once:true});
        app.querySelector('[data-desktop-ar-back]')?.addEventListener('click',()=>window.renderLaunchScreen?.(),{once:true});return;
    }
    prepareArAssets({experience:'demo'}).catch(error=>console.warn('AR preparation:',error));
    if (shouldSkipArIntroductionPreparation() && arAssetsReady()) return startTemporaryArDemo(app);
    renderArIntroductionPreparation(app, {
        onContinue: () => startTemporaryArDemo(app),
        onCancel: () => window.renderLaunchScreen?.()
    });
}

export async function startTemporaryArDemo(app, { livingMapPreviewRecords = null, livingMapPreviewClock = null } = {}) {
    // Development fixtures may inspect XR, but public desktop entry is a book.
    if(!livingMapPreviewRecords && isDesktopLearningBookTarget())return openTemporaryArDemoWindow(app);
    appRoot = app;
    limDiagnostic('device-context',limDeviceContext(navigator.maxTouchPoints ? 'touch-capable' : 'mouse'));
    clearSessionState();
    demoLivingMapPreviewClock=livingMapPreviewRecords && typeof livingMapPreviewClock==='function' ? livingMapPreviewClock : null;
    demoFeedback=createDemoFeedback();demoFeedback.start();
    const rain=RAIN_QUALITIES[currentRainQuality()];demoRainIntensity=rain.intensity;demoRainStyle=rain.style;
    demoExitLifecycle.reset();
    const immersive = livingMapPreviewRecords ? false : await startImmersive();
    if (!immersive) {
        renderInterface(true);
        viewerMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
        // Only the standalone development preview supplies records. Normal
        // demo visitors reach this scene through the Totem connection step.
        if(livingMapPreviewRecords){
            clearTimeout(introNarrationTimer);showArWelcomeShowcase();clearTimeout(arWelcomeUnlockTimer);
            arWelcomeIntroPending=false;arWelcomeOpeningActive=false;arWelcomeSettleStage=false;
            infoPanel?.restore();infoPanel?.setGuided(true);infoPanel?.setIntroduction(false);
            markers.push(...livingMapPreviewRecords.map(record=>({...record,texture:createMarkerTexture(record)})));
            updateSimulatedMarkers();showDemoLivingMap();
        }
    }
}
