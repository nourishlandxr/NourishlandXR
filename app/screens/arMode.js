/*
 * Creator AR placement mode
 *
 * The dashboard remains the full web workspace. AR is for fast capture:
 * place a draft, then select it to refine its details or move it without
 * leaving the camera session. Physical checkpoints improve repeat visits but
 * are not required for a test session.
 */

import { createPlaceMarker, createProjectSite, createSitePlace, deletePlaceMarker, loadMarkerAnchor, loadPlaceMarkers, loadPlantProfile, loadProject, loadProjectSites, loadSitePlaces, saveMarkerAnchor, updatePlaceMarker, updateSitePlace } from '../services/persistence.js';
import { AR_EXPERIENCE_CONFIG, DEFAULT_HOME_AREA_NAME, isDefaultHomeArea } from '../services/arExperienceConfig.js';
import { createAreaRecord } from '../services/areaWorkflow.js';
import { matrixFromPose, spatialPosition } from '../services/spatialPlacement.js';
import { spatialMoveControlMarkup } from '../services/spatialMoveControl.js';
import { createMinimalMarkerDraft, scopedMarkerStorageId } from '../services/markerWorkflow.js';
import { alignAreaToCheckpoint } from '../services/areaSpatialAlignment.js';
import { normalizeAreaLink, normalizeAreaLinks } from '../services/areaLinks.js';
import { plantInformationMeshSurfaceLayout } from '../services/plantInformationMeshSurfaceLayout.js';
import { placementPointerMarkup } from '../services/placementPointer.js';
import { createSpatialSphereRenderer, destroySpatialSphereRenderer, drawSpatialOrb, drawSpatialSphere } from '../services/spatialSphereRenderer.js';
import { createSpatialPrismRenderer, destroySpatialPrismRenderer, drawSpatialPrism } from '../services/spatialPrismRenderer.js';
import { createSpatialTriangleRenderer, destroySpatialTriangleRenderer, drawSpatialTriangle } from '../services/spatialTriangleRenderer.js';
import { createSpatialTetherRenderer, destroySpatialTetherRenderer, drawSpatialGroundArrowPath, drawSpatialTether } from '../services/spatialTetherRenderer.js';
import { isTrackedHeadsetInputSource, QUEST_SPATIAL_BELT_ACTIONS, QUEST_SPECIAL_PALETTE_ACTIONS, questSpatialBeltLayout, questSpatialBeltRayTarget, questSpatialPaletteLayout } from '../services/questSpatialBelt.js';
import { isQuestHeadsetBrowser, requestImmersiveArSession } from '../services/webxrSession.js';
import { allowArScreenRotation, releaseArScreenRotation } from '../services/arScreenOrientation.js';
import { dismissArFullscreenGuidance, showArFullscreenGuidance, showArSafetyDialog } from '../services/arOnboarding.js';
import { controllerRayEnd, controllerRayFromPose, handTrackingState, XR_HAND_JOINT_CONNECTIONS, XR_LASER_POINTER_CONFIG } from '../services/xrPointer.js';
import { createSpatialDashboardMirror, spatialDashboardPanelFromViewer, spatialDashboardPanelMatrix, spatialDashboardRayHit } from '../services/spatialDashboardMirror.js';
import { PIM_SPATIAL_CONFIG, PIM_SPATIAL_LAYOUT_OPTIONS, pimCreateInteractionState, pimExpandedNodeIds, pimNodeAtPath, pimNodeChildren, pimResetInteractionState, pimSpatialPanel, pimSpatialPoseAboveAnchor, pimSpatialPoseFromStored, pimSpatialPoseFromViewer, pimToggleNodeState, pimViewportSafeArea } from '../services/plantInformationMesh.js';
import { PIM_BLOOM_DURATION_MS, PIM_TEXTURE_CELL_WIDTH, PIM_TEXTURE_SIZE, createPlantInformationHoneycombTexture, pimHoneycombTargetAtPercent, pimHoneycombTextureSize } from '../services/plantInformationMeshCanvas.js?v=0.8963';
import { resolvePlantPim } from '../services/pimLegacyAdapter.js';
import { pimToArKnowledge } from '../services/pimModel.js';
import { renderProjectDashboard, renderProjectAreaDashboard, renderProjectHome, renderAreaCheckpointForm, openProjectEntry } from './projectDashboard.js';
import { renderFieldGuide } from './fieldGuide.js';
import { DEFAULT_TOTEM_COLOR, normalizeTotemStyle, totemHeightPreset } from '../services/totemAppearance.js';
import { applyTotemLinkCalibration, createTotemLinkCalibration, reverseTotemLinkCalibration } from '../services/totemLinkCalibration.js';
import { bindPlantInformationMeshPress, plantInformationMeshMarkup, reconcilePlantInformationMesh } from '../services/plantInformationMeshView.js';

let session = null;
let sessionMode = 'immersive-ar';
let questHeadsetSession = false;
let creatorInputMode = 'touch';
let controllerActionIndex = 0;
let controllerMenuActive = true;
let controllerAxisCooldownUntil = 0;
let latestControllerRay = null;
let latestHandState = null;
let hoveredMarkerId = '';
let handPinchActive = false;
const CREATOR_SPATIAL_PIM_LAYOUT_OPTIONS = PIM_SPATIAL_LAYOUT_OPTIONS;
let controllerPressState = null;
let spatialWebWindow = null;
let gl = null;
let refSpace = null;
let canvas = null;
let overlayRoot = null;
let activeProjectId = '';
let activeProjectName = '';
let activeSiteId = '';
let activeAreaId = '';
let activeAreaName = '';
let activeAreaDescription = '';
let activeCheckpointId = '';
let areaLensOpen = false;
let startPromise = null;
let latestViewerMatrix = null;
let latestView = null;
let checkpointSessionOrigin = null;
let interactionMode = 'neutral';
let suspendedInteractionMode = '';
let sessionMarkers = [];
let dragState = null;
let markerHoldGesture = null;
let readyPlacementType = '';
let readySpecialMarker = null;
let pendingPlacementAppearance = null;
let pendingPlacementDetails = null;
let contextToolbarRecord = null;
let pendingPlacedRecord = null;
let hitTestSource = null;
let latestHitMatrix = null;
let markerProgram = null;
let markerBuffer = null;
let homeSignProgram = null;
let homeSignBuffer = null;
let homeSignTexture = null;
let homeSignTextureTitle = '';
let homeSignAnchor = null;
let questBeltTextures = [];
let questBeltTextureKey = '';
let questBeltLayout = [];
let questBeltViewerMatrix = null;
let questBeltHoverIndex = -1;
let questSpecialPaletteTextures = [];
let questSpecialPaletteTextureKey = '';
let questSpecialPaletteLayout = [];
let questSpecialPaletteVisible = false;
let questSpecialPaletteHoverIndex = -1;
let questSpatialWebVisible = false;
let questSpatialDashboardMirror = null;
let questSpatialDashboardPanel = null;
let questSpatialDashboardHit = null;
let questSpatialDashboardScrollCooldownUntil = 0;
let questNoteTextures = new Map();
let spatialPimTextures = new Map();
let spatialPimHover = { recordId: '', path: '' };
let sphereRenderer = null;
let prismRenderer = null;
let triangleRenderer = null;
let controllerPointerRenderer = null;
let placementArmedAt = 0;
let arHistoryArmed = false;
let handlingArHistory = false;
let placementInProgress = false;
let pendingBagRecord = null;
let locatedTotemRecord = null;
let specialPickerRequest = 0;
let placementArmGeneration = 0;
let activePlacementOperation = null;
let pendingPlacementPromise = null;
let totemGuideVisible = false;
let totemLinkGuideVisible = true;
let totemLinkCalibration = null;
let runtimeTotemLinkCalibrations = new Map();
let pendingExistingMarkerId = '';
let arReturnContext = '';
let locationNoteAnchor = null;
let referenceSpaceHasFloor = false;
let sessionGroundY = null;
let locationNoteConfig = null;
let locationNoteVisible = false;
let latestNotePlacementPoint = null;
let creatorViewportCleanup = null;
const hiddenStructuralMarkerIds = new Set();

const markerLabel = type => ({ plant: 'plant live tag', sub_checkpoint: 'marker', note: 'note', intro_checkpoint: 'trail entrance gateway', area_checkpoint: 'totem marker' })[type] || 'item';
const markerIcon = type => ({ plant: '&#x1F331;', sub_checkpoint: '&#x2691;', note: '&#x270E;', intro_checkpoint: '&#x2316;', area_checkpoint: '&#x2316;' })[type] || '&#x25C6;';
const readyPlacementLabel = type => ({ plant: 'Plant Live Tag', sub_checkpoint: 'Marker', note: 'Note', intro_checkpoint: 'Trail Entrance', area_checkpoint: 'Totem Marker' })[type] || 'Draft';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const markerDefaultColor = type => ({ plant: '#5e7956', note: '#9a6b50', sub_checkpoint: '#647a3b', intro_checkpoint: '#59766a', area_checkpoint: DEFAULT_TOTEM_COLOR })[type] || '#647a3b';
const markerAppearanceColor = marker => /^#[0-9a-f]{6}$/i.test(marker?.appearance?.color || '') ? marker.appearance.color : markerDefaultColor(marker?.type);
const markerAppearanceSize = marker => ['tiny', 'small', 'medium', 'large', 'huge'].includes(marker?.appearance?.size) ? marker.appearance.size : 'medium';
const markerAppearanceOpacity = marker => [1, .8, .6, .4].includes(Number(marker?.appearance?.opacity)) ? Number(marker.appearance.opacity) : 1;
const markerNoteSurface = marker => marker?.appearance?.surface === 'outline' ? 'outline' : 'filled';
const MARKER_APPEARANCE_SHAPES = Object.freeze(['orb', 'plate', 'triangle']);
const markerAppearanceShape = marker => MARKER_APPEARANCE_SHAPES.includes(marker?.appearance?.shape) ? marker.appearance.shape : 'orb';
const TASKBAR_V2_COLORS = Object.freeze({
    plant: Object.freeze([
        { name: 'Fern', value: '#5e7956' },
        { name: 'Moss', value: '#74805d' },
        { name: 'Sage', value: '#89977c' },
        { name: 'Bark', value: '#6f5b47' },
        { name: 'Clay', value: '#9a6b50' },
        { name: 'Stone', value: '#74786f' }
    ]),
    note: Object.freeze([
        { name: 'Clay', value: '#9a6b50' },
        { name: 'Ochre', value: '#967f50' },
        { name: 'Olive', value: '#747650' },
        { name: 'Bark', value: '#6d5949' },
        { name: 'Slate', value: '#68736f' },
        { name: 'Heather', value: '#78656b' }
    ])
});
const TASKBAR_V2_SIZES = Object.freeze(['tiny', 'small', 'medium', 'large', 'huge']);
const TASKBAR_V2_OPACITIES = Object.freeze([1, .8, .6, .4]);
const visibleQuestSpecialPaletteActions = () => {
    const totem = activeTotemRecord();
    const totemPlaced = hasSavedSpatialPosition(totem);
    return QUEST_SPECIAL_PALETTE_ACTIONS.filter(action => {
        if (action.hidden) return false;
        if (action.id === 'totem') return !totemPlaced;
        if (['point-totem', 'link-totem', 'recenter-totem', 'calibrate-link'].includes(action.id)) return Boolean(totem);
        return true;
    });
};
// Keep the same deliberate hold gesture in every AR mode. This makes an orb
// movable without first switching to the HAND/Grab control, while preserving
// a short tap for opening information or edit tools.
const CREATOR_AR_HOLD_DELAY_MS = 800;
const CREATOR_AR_HOLD_MOVE_TOLERANCE_PX = 14;
const DEFAULT_LOCATION_NOTE = Object.freeze({
    enabled: true,
    prompt: 'WHERE AM I NOW?'
});
const isAreaCheckpointMarker = marker => {
    const type = String(marker?.type || '').trim().toLocaleLowerCase();
    const semanticType = String(marker?.semantic_type || '').trim().toLocaleLowerCase();
    const storageType = String(marker?.storage_type || '').trim().toLocaleLowerCase();
    const markerKind = String(marker?.marker_kind || '').trim().toLocaleLowerCase();
    const experienceRole = String(marker?.experience_role || '').trim().toLocaleLowerCase();
    const markerId = String(marker?.id || '').trim().toLocaleLowerCase();
    return type === 'area_checkpoint'
        || semanticType === 'area_checkpoint'
        || storageType === 'area_checkpoint'
        || markerKind === 'area_checkpoint'
        || markerKind === 'area_totem'
        || experienceRole === 'area-totem'
        || /(?:^|_)area_totem(?:_|$)/.test(markerId);
};
const normalizeAreaCheckpointMarker = marker => isAreaCheckpointMarker(marker)
    ? { ...marker, type: 'area_checkpoint', storage_type: marker.storage_type || (marker.type === 'sub_checkpoint' ? 'sub_checkpoint' : undefined) }
    : marker;
const normalizeSpecialMarker = marker => {
    if (!marker || marker.type !== 'sub_checkpoint' || marker.special_symbol) return marker;
    const inferred = {
        'arrow up': '↑', 'arrow right': '→', 'arrow down': '↓', 'arrow left': '←',
        important: '!', question: '?'
    }[String(marker.name || '').trim().toLocaleLowerCase()];
    return inferred ? { ...marker, special_symbol: inferred } : marker;
};
const normalizeSpatialMarker = marker => normalizeSpecialMarker(normalizeAreaCheckpointMarker(marker));
const areaBoard = marker => ({
    title: marker?.area_information_board?.title || String(marker?.name || 'Area').replace(/\s+checkpoint$/i, ''),
    introduction: marker?.area_information_board?.introduction || marker?.description || 'Welcome to this Area.',
    informationBubbles: Array.isArray(marker?.area_information_board?.information_bubbles)
        ? marker.area_information_board.information_bubbles.filter(Boolean).slice(0, 6)
        : []
});

function markerRgb(marker, fallback) {
    if (!/^#[0-9a-f]{6}$/i.test(marker?.appearance?.color || '')) return fallback;
    const color = markerAppearanceColor(marker);
    const value = Number.parseInt(color.slice(1), 16);
    return Number.isFinite(value) ? [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255] : fallback;
}

function markerScale(marker) {
    return ({ tiny: .026, small: .034, medium: .045, large: .06, huge: .082 })[markerAppearanceSize(marker)] || .045;
}

function markerSizeFactor(marker) {
    return ({ tiny: .58, small: .76, medium: 1, large: 1.34, huge: 1.82 })[markerAppearanceSize(marker)] || 1;
}

function markerShape(type) {
    return ({ sub_checkpoint: 0, area_checkpoint: 1, intro_checkpoint: 2, note: 3, plant: 4 })[type] ?? 0;
}

function markerDimensions(marker) {
    const factor = markerSizeFactor(marker);
    return ({
        // WebXR model scales are half-extents. The Totem body is a slender
        // 0.22m post; its separate base completes the grounded silhouette.
        area_checkpoint: [.11 * factor, totemHeightPreset(marker).halfHeightMetres * factor],
        intro_checkpoint: [.42 * factor, .805 * factor],
        // Notes are readable spatial signs rather than tiny object labels.
        note: [.94 * factor, .345 * factor],
        plant: [.062 * factor, .062 * factor],
        sub_checkpoint: [markerScale(marker), markerScale(marker)]
    })[marker.type] || [markerScale(marker), markerScale(marker)];
}

function plantTagDimensions(marker) {
    const factor = markerSizeFactor(marker);
    const stemHeight = ({ tiny: .07, small: .11, medium: .17, large: .25, huge: .34 })[markerAppearanceSize(marker)] || .17;
    return {
        halfWidth: .064 * factor,
        halfHeight: .046 * factor,
        stemHeight
    };
}

function plantTagGeometry(position, marker, groundY = currentGroundY()) {
    const dimensions = plantTagDimensions(marker);
    const floorY = Number.isFinite(Number(groundY)) ? Number(groundY) : 0;
    const requestedY = Number.isFinite(Number(position?.y)) ? Number(position.y) : floorY;
    const plateBaseY = Math.max(floorY + dimensions.stemHeight, requestedY);
    return {
        groundY: floorY,
        plateBaseY,
        stemHeight: Math.max(dimensions.stemHeight, plateBaseY - floorY),
        platePosition: {
            x: Number(position?.x) || 0,
            y: plateBaseY + dimensions.halfHeight,
            z: Number(position?.z) || 0
        }
    };
}

function plantTagPlatePosition(position, marker) {
    return plantTagGeometry(position, marker).platePosition;
}

function drawPlantTagStem(view, position, marker, opacity = 1) {
    const geometry = plantTagGeometry(position, marker);
    const scale = markerSizeFactor(marker);
    drawSpatialPrism(gl, prismRenderer, view, { ...position, y: geometry.groundY }, {
        halfWidth: .009 * scale,
        halfHeight: geometry.stemHeight * .5,
        halfDepth: .009 * scale,
        color: markerRgb(marker, [.32, .48, .27]),
        topColor: markerRgb(marker, [.64, .8, .52]),
        alpha: opacity,
        rotationY: 0
    });
}

function currentGroundY() {
    if (referenceSpaceHasFloor) return .02;
    if (Number.isFinite(sessionGroundY)) return sessionGroundY;
    if (!latestViewerMatrix) return 0;
    sessionGroundY = latestViewerMatrix[13] - 1.55;
    return sessionGroundY;
}

function groundedTotemPosition(position) {
    return {
        x: Number(position?.x) || 0,
        y: currentGroundY(),
        z: Number(position?.z) || 0
    };
}

function isGardenStakePlacement(type = readyPlacementType) {
    return type === 'plant' && markerAppearanceShape(placementPreviewMarker('plant')) === 'plate';
}

function gardenStakePlacementPoint(rayTarget) {
    const hitTarget = spatialPosition(latestHitMatrix, latestViewerMatrix);
    if (hitTarget) return hitTarget;
    return {
        x: Number(rayTarget?.x) || 0,
        y: currentGroundY(),
        z: Number(rayTarget?.z) || 0
    };
}

function appearancePayload(appearance = {}) {
    return {
        color: appearance.color,
        size: appearance.size,
        opacity: appearance.opacity,
        ...(appearance.surface === 'outline' ? { surface: 'outline' } : appearance.surface === 'filled' ? { surface: 'filled' } : {}),
        ...(MARKER_APPEARANCE_SHAPES.includes(appearance.shape) ? { shape: appearance.shape } : {})
    };
}

function preparePlacementAppearance(type, marker = null) {
    if (!['plant', 'note'].includes(type)) {
        pendingPlacementAppearance = null;
        pendingPlacementDetails = null;
        return null;
    }
    const defaultName = type === 'plant' ? 'New plant' : 'New note';
    pendingPlacementAppearance = {
        type,
        color: markerAppearanceColor(marker || { type }),
        size: TASKBAR_V2_SIZES.includes(markerAppearanceSize(marker)) ? markerAppearanceSize(marker) : 'medium',
        opacity: markerAppearanceOpacity(marker),
        ...(type === 'note' ? { surface: markerNoteSurface(marker || { type }) } : {}),
        ...(type === 'plant' ? { shape: markerAppearanceShape(marker) } : {})
    };
    pendingPlacementDetails = {
        type,
        name: String(marker?.name || defaultName).trim() || defaultName,
        description: String(marker?.description || marker?.notes || '').trim(),
        surface: type === 'note' ? markerNoteSurface(marker || { type }) : undefined
    };
    return pendingPlacementAppearance;
}

function currentPlacementAppearance(type = readyPlacementType) {
    if (!['plant', 'note'].includes(type)) return null;
    if (pendingPlacementAppearance?.type !== type) {
        preparePlacementAppearance(type, pendingBagRecord?.marker || null);
    }
    return pendingPlacementAppearance;
}

function placementPreviewMarker(type = readyPlacementType) {
    const appearance = currentPlacementAppearance(type);
    const details = pendingPlacementDetails?.type === type ? pendingPlacementDetails : null;
    return {
        ...(pendingBagRecord?.marker || {}),
        type,
        name: details?.name || pendingBagRecord?.marker?.name || (type === 'plant' ? 'New plant' : 'New note'),
        description: details ? details.description : (pendingBagRecord?.marker?.description || pendingBagRecord?.marker?.notes || ''),
        appearance: appearance ? appearancePayload(appearance) : pendingBagRecord?.marker?.appearance
    };
}

function placementEditorRecord(type = readyPlacementType) {
    if (!['plant', 'note'].includes(type)) return null;
    const marker = placementPreviewMarker(type);
    return {
        marker,
        siteId: pendingBagRecord?.siteId || activeSiteId,
        areaId: pendingBagRecord?.areaId || activeAreaId,
        areaName: pendingBagRecord?.areaName || activeAreaName,
        pendingPlacement: true
    };
}

function nextCycleValue(current, values) {
    const index = values.indexOf(current);
    return values[(index + 1 + values.length) % values.length];
}

function colorOption(type, value) {
    const options = TASKBAR_V2_COLORS[type] || TASKBAR_V2_COLORS.plant;
    return options.find(option => option.value.toLocaleLowerCase() === String(value || '').toLocaleLowerCase()) || options[0];
}

function markerDomAppearanceStyle(marker) {
    const factor = markerSizeFactor(marker);
    const opacity = markerAppearanceOpacity(marker);
    const noteWidth = Math.round(280 * factor);
    const noteHeight = Math.round(116 * factor);
    const color = markerAppearanceColor(marker);
    return `--marker-accent:${color};--spatial-note-color:${color};--marker-rotation:0deg;--marker-hit-size:${Math.round(64 * factor)}px;--marker-note-width:min(86vw,${noteWidth}px);--marker-note-height:${noteHeight}px;--marker-opacity:${opacity}`;
}

function normalizedLocationNote(project = null, site = null) {
    const saved = project?.arLocationNote || {};
    return {
        enabled: saved.enabled !== false,
        prompt: String(saved.prompt || DEFAULT_LOCATION_NOTE.prompt).trim() || DEFAULT_LOCATION_NOTE.prompt,
        title: String(saved.title || project?.name || site?.name || activeProjectName || activeProjectId || 'This location').trim()
    };
}

function updateLocationNote() {
    const note = overlayRoot?.querySelector('[data-ar-location-note]');
    if (!note) return;
    const config = locationNoteConfig || normalizedLocationNote();
    const areaName = activeAreaName || DEFAULT_HOME_AREA_NAME;
    note.dataset.locationNoteEnabled = String(config.enabled);
    note.dataset.locationNoteVisible = String(locationNoteVisible);
    note.hidden = !config.enabled || !locationNoteVisible;
    note.setAttribute('aria-label', `${config.prompt} ${config.title}. Area: ${areaName}.`);
    const prompt = note.querySelector('[data-ar-location-prompt]');
    const title = note.querySelector('[data-ar-location-title]');
    const area = note.querySelector('[data-ar-location-area]');
    if (prompt) prompt.textContent = config.prompt;
    if (title) title.textContent = config.title;
    if (area) area.textContent = `AREA · ${areaName}`;
}

function updateAreaLens() {
    const lens = overlayRoot?.querySelector('[data-ar-area-lens]');
    if (!lens) return;
    const current = lens.querySelector('[data-ar-current-area]');
    if (current) current.textContent = activeAreaName || DEFAULT_HOME_AREA_NAME;
    lens.setAttribute('aria-label', `Current Area: ${activeAreaName || DEFAULT_HOME_AREA_NAME}`);
}

function closeAreaLens() {
    const panel = overlayRoot?.querySelector('[data-ar-area-lens-panel]');
    if (panel) {
        panel.hidden = true;
        panel.innerHTML = '';
    }
    areaLensOpen = false;
}

async function openAreaLens() {
    const panel = overlayRoot?.querySelector('[data-ar-area-lens-panel]');
    if (!panel) return;
    if (areaLensOpen) {
        closeAreaLens();
        return;
    }
    areaLensOpen = true;
    panel.hidden = false;
    panel.innerHTML = '<p>Loading Areasâ€¦</p>';
    const operation = captureArOperationContext();
    try {
        const areas = await loadPlacementAreas(operation);
        if (!isArOperationCurrent(operation)) return;
        const choices = areas.map(area => ({
            area,
            current: area.id === activeAreaId,
            label: isDefaultHomeArea(area) ? DEFAULT_HOME_AREA_NAME : area.name,
            description: area.description || area.type || 'Area'
        }));
        panel.innerHTML = `<div class="creator-ar-area-lens-heading"><strong>AREAS IN THIS PROJECT</strong><button type="button" data-ar-close-lens aria-label="Close Area lens">&times;</button></div>
            <p class="creator-ar-area-lens-help">Stay in the current Area, or choose another Area to load its saved Totem, Plants and Notes.</p>
            <div class="creator-ar-area-lens-options">${choices.map(({ area, current, label, description }) => `<button type="button" data-ar-lens-area="${escapeHtml(area.id)}"${current ? ' disabled aria-current="true"' : ''}><span class="creator-ar-area-lens-totem" aria-hidden="true">⌖</span><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}${current ? ' Â· CURRENT' : ''}</small></span></button>`).join('')}</div>`;
        panel.querySelector('[data-ar-close-lens]')?.addEventListener('click', closeAreaLens);
        panel.querySelectorAll('[data-ar-lens-area]').forEach(button => button.addEventListener('click', async () => {
            const area = areas.find(candidate => candidate.id === button.dataset.arLensArea);
            if (!area || button.disabled) return;
            button.disabled = true;
            activateArea(area);
            await restoreRecordedMarkers({ ...captureArOperationContext(), areaId: area.id });
            closeAreaLens();
            setPlacementStatus(`${activeAreaName || DEFAULT_HOME_AREA_NAME} loaded. Its saved content is now active.`);
        }));
    } catch (error) {
        panel.innerHTML = `<div class="creator-ar-area-lens-heading"><strong>AREAS UNAVAILABLE</strong><button type="button" data-ar-close-lens aria-label="Close Area lens">&times;</button></div><p>${escapeHtml(error.message)}</p>`;
        panel.querySelector('[data-ar-close-lens]')?.addEventListener('click', closeAreaLens);
    }
}

function activeAreaMarkers() {
    return sessionMarkers.filter(record => record.areaId === activeAreaId);
}

function linkedTotemAreas(record) {
    return (Array.isArray(record?.areaLinks) ? record.areaLinks : [])
        .map((rawLink, index) => {
            const link = normalizeAreaLink(rawLink, { sourceAreaId: record?.areaId });
            return {
            ...link,
            targetAreaId: link.toAreaId,
            targetAreaName: String(rawLink?.target_area_name || rawLink?.targetAreaName || link.toAreaId || 'Linked Area').trim(),
            steps: Number.isFinite(Number(link?.steps)) && Number(link.steps) > 0 ? Number(link.steps) : null,
            distanceM: Number.isFinite(Number(link?.distanceMetres)) && Number(link.distanceMetres) > 0
                ? Number(link.distanceMetres)
                : null,
            direction: index % 2 === 0 ? 'right' : 'left'
            };
        })
        .filter(link => link.targetAreaId && link.enabled);
}

function totemLinkMeasure(link) {
    return [
        link?.steps ? `${link.steps} steps` : '',
        link?.distanceM ? `${Number(link.distanceM).toFixed(1)} m` : ''
    ].filter(Boolean).join(' · ');
}

function totemLinkRuntimeKey(sourceAreaId, targetAreaId) {
    return `${String(sourceAreaId || '').trim()}::${String(targetAreaId || '').trim()}`;
}

function runtimeCalibrationForLink(record, link) {
    if (!record || !link?.targetAreaId) return null;
    return runtimeTotemLinkCalibrations.get(totemLinkRuntimeKey(record.areaId, link.targetAreaId)) || null;
}

function calibratedTargetPosition(record, link) {
    return runtimeCalibrationForLink(record, link)
        ? applyTotemLinkCalibration(record.position, runtimeCalibrationForLink(record, link))
        : null;
}

async function transitionToLinkedArea(areaId) {
    const targetId = String(areaId || '').trim();
    if (!targetId || !activeProjectId || !activeSiteId) return false;
    const operation = captureArOperationContext();
    const sourceTotem = activeTotemRecord();
    const sourceLink = linkedTotemAreas(sourceTotem).find(link => link.targetAreaId === targetId);
    const expectedTargetPosition = sourceTotem && sourceLink
        ? calibratedTargetPosition(sourceTotem, sourceLink)
        : null;
    const areas = await loadSitePlaces(activeProjectId, activeSiteId).catch(() => []);
    if (!isArOperationCurrent(operation, { matchLocation: false })) return false;
    const area = areas.find(candidate => candidate.id === targetId);
    if (!area) {
        setPlacementStatus('The linked Area is no longer available in this project.');
        return false;
    }
    activateArea(area);
    const restoreOperation = captureArOperationContext();
    await restoreRecordedMarkers({ ...restoreOperation, areaId: area.id });
    if (!isArOperationCurrent(restoreOperation, { matchLocation: false })) return false;
    if (expectedTargetPosition) alignActiveAreaToCalibrationTarget(expectedTargetPosition);
    closeAreaLens();
    setPlacementStatus(totemLinkCalibration?.targetAreaId === area.id
        ? `Calibration target ${activeAreaName || DEFAULT_HOME_AREA_NAME} loaded. Place or recenter its Totem, then capture the link.`
        : expectedTargetPosition
        ? `${activeAreaName || DEFAULT_HOME_AREA_NAME} loaded at its calibrated Totem position.`
        : `${activeAreaName || DEFAULT_HOME_AREA_NAME} loaded from its linked Totem. Its saved content is now active.`);
    return true;
}

function alignActiveAreaToCalibrationTarget(targetPosition) {
    const targetTotem = activeTotemRecord();
    if (!targetTotem || !hasSavedSpatialPosition(targetTotem)) return false;
    const alignment = alignAreaToCheckpoint(activeAreaMarkers(), targetTotem.marker.id, groundedTotemPosition(targetPosition));
    if (!alignment.checkpoint) return false;
    activeCheckpointId = alignment.checkpoint.marker.id;
    checkpointSessionOrigin = checkpointOriginMatrix(alignment.origin);
    const alignedById = new Map(alignment.records.map(record => [record.marker.id, record]));
    sessionMarkers = sessionMarkers.map(record => record.areaId === activeAreaId
        ? alignedById.get(record.marker.id) || record
        : record);
    renderSessionMarkers();
    return true;
}

function hasRenderableSpatialPosition(record) {
    return record?.position
        && ['x', 'y', 'z'].every(axis => Number.isFinite(Number(record.position[axis])));
}

function renderableAreaMarkers() {
    return activeAreaMarkers().filter(hasRenderableSpatialPosition);
}

function setMarkerAncillaryVisibility(record, hidden) {
    if (!overlayRoot || !record?.marker?.id) return;
    const selector = CSS.escape(record.marker.id);
    [
        overlayRoot.querySelector(`[data-ar-plant-profile="${selector}"]`),
        overlayRoot.querySelector(`[data-ar-totem-information="${selector}"]`)
    ].filter(Boolean).forEach(element => { element.hidden = hidden; });
}

function activateArea(area) {
    const nextAreaId = area?.id || '';
    if (activeAreaId !== nextAreaId) {
        sessionMarkers = [];
        locatedTotemRecord = null;
        activeCheckpointId = '';
        checkpointSessionOrigin = null;
        totemGuideVisible = false;
        totemLinkGuideVisible = true;
        locationNoteVisible = false;
        locationNoteAnchor = null;
        homeSignAnchor = null;
        renderSessionMarkers();
    }
    activeAreaId = nextAreaId;
    activeAreaName = isDefaultHomeArea(area) ? DEFAULT_HOME_AREA_NAME : area?.name || '';
    activeAreaDescription = String(area?.description || '').trim();
    updateLocationNote();
    updateAreaLens();
}

function hasPlantProfile(record) {
    const profile = record?.plantProfile || record?.marker?.plant_profile || {};
    return record?.marker?.type === 'plant' && (profile.spm_enabled === true || profile.profile_enabled === true);
}

function creatorPlantKnowledge(record) {
    const marker = record?.marker || {};
    const profile = record?.plantProfile || marker.plant_profile || {};
    const commonName = profile.common_name || marker.name || 'Plant Profile';
    const plantId = marker.plantId || marker.id || profile.plant_id || commonName;
    const document = resolvePlantPim(profile, {
        id: plantId,
        plantId,
        name: commonName,
        commonName,
        title: commonName,
        scientificName: profile.scientific_name || '',
        image: profile.photo || profile.image || ''
    });
    return pimToArKnowledge(document);
}

function creatorPimState(record) {
    return pimCreateInteractionState(
        record?.pimExpandedNodeIds || record?.pimExpandedPaths || [],
        record?.pimSelectedNodeId || '',
        record?.pimFocusedPlantId || record?.marker?.plantId || record?.marker?.id || ''
    );
}

function setCreatorPimState(record, state) {
    if (!record) return state;
    record.pimSelectedNodeId = state.selectedNodeId;
    record.pimExpandedNodeIds = pimExpandedNodeIds(state);
    record.pimFocusedPlantId = state.focusedPlantId || record.marker?.plantId || record.marker?.id || '';
    // Keep the existing field for saved/session compatibility while the
    // interaction model uses explicit selectedNodeId/expandedNodeIds state.
    record.pimExpandedPaths = [...record.pimExpandedNodeIds];
    return state;
}

function creatorPimExpandedNodeIds(record) {
    return record?.pimExpandedNodeIds || record?.pimExpandedPaths || [];
}

function toggleCreatorPimNode(record, nodePath) {
    const next = pimToggleNodeState(creatorPlantKnowledge(record), creatorPimState(record), nodePath);
    setCreatorPimState(record, next);
    return next;
}

function creatorPlantKnowledgeMarkup(record) {
    if (usesSpatialPimRenderer()) {
        const size = spatialPimSurfaceSize(record);
        return plantInformationMeshMarkup(creatorPlantKnowledge(record), creatorPimExpandedNodeIds(record), {
            ...CREATOR_SPATIAL_PIM_LAYOUT_OPTIONS,
            selectedNodeId: record.pimSelectedNodeId,
            viewportWidth: size.layoutWidth,
            viewportHeight: size.layoutHeight,
            layoutWidth: size.layoutWidth,
            layoutHeight: size.layoutHeight,
            cellWidthPixels: PIM_TEXTURE_CELL_WIDTH,
            cellHeightPixels: PIM_TEXTURE_CELL_WIDTH * .8660254,
            safeArea: CREATOR_SPATIAL_PIM_LAYOUT_OPTIONS.safeArea
        });
    }
    const visualViewport = window.visualViewport;
    const viewportWidth = Number(visualViewport?.width) || window.innerWidth;
    const viewportHeight = Number(visualViewport?.height) || window.innerHeight;
    const dock = overlayRoot?.querySelector('.creator-ar-control-dock');
    const dockRect = dock?.getBoundingClientRect();
    const topInset = Math.max(24, Number(visualViewport?.offsetTop) || 0);
    const bottomInset = Math.max(80, (dockRect?.height || 0) + 16);
    const surface = plantInformationMeshSurfaceLayout(
        viewportWidth,
        viewportHeight,
        viewportWidth / 2,
        viewportHeight / 2,
        { topInset, bottomInset }
    );
    return plantInformationMeshMarkup(creatorPlantKnowledge(record), creatorPimExpandedNodeIds(record), {
        selectedNodeId: record.pimSelectedNodeId,
        viewportWidth,
        viewportHeight,
        layoutWidth: surface.panelWidth,
        layoutHeight: surface.panelHeight,
        safeArea: pimViewportSafeArea(surface.panelWidth, surface.panelHeight, {
            horizontalInset: 8,
            topInset: 8,
            bottomInset: 8
        })
    });
}

function refreshCreatorPimProfile(record, profile = null) {
    if (!record) return null;
    invalidateSpatialPimTexture(record);
    const liveProfile = profile
        || overlayRoot?.querySelector(`[data-ar-plant-profile="${CSS.escape(record.marker.id)}"]`);
    if (!liveProfile) return null;
    const mesh = reconcilePlantInformationMesh(liveProfile, creatorPlantKnowledgeMarkup(record));
    positionSessionMarkers();
    return mesh;
}

function creatorTotemInformationMarkup(record) {
    const board = areaBoard(record.marker);
    const introduction = String(board.introduction || '').trim();
    const isGeneratedWelcome = /^welcome to\s+[^.!?]+[.!?]?$/i.test(introduction);
    const areaContext = String(record.areaDescription || '').trim();
    const text = [isGeneratedWelcome ? '' : introduction, areaContext ? `Area context: ${areaContext}` : '', ...board.informationBubbles].filter(Boolean).slice(0, 6);
    const linkedAreas = totemLinkGuideVisible ? linkedTotemAreas(record) : [];
    if (!text.length && !linkedAreas.length) return '';
    const signs = linkedAreas.map(link => `<span class="creator-ar-totem-link-branch is-${escapeHtml(link.direction)}" data-ar-totem-link-branch="${escapeHtml(link.targetAreaId)}" aria-hidden="true"></span><button type="button" class="creator-ar-totem-link-sign is-${escapeHtml(link.direction)}" data-ar-totem-link-area="${escapeHtml(link.targetAreaId)}" aria-label="Follow path to linked Area ${escapeHtml(link.targetAreaName)}"><span class="creator-ar-totem-link-arrow" aria-hidden="true">${link.direction === 'left' ? '←' : '→'}</span><span><strong>${escapeHtml(link.targetAreaName)}</strong><small>${escapeHtml(totemLinkMeasure(link) || 'FOLLOW PATH')}</small></span></button>`).join('');
    const balloon = record.infoVisible && text.length
        ? `<section class="creator-ar-location-note-board creator-ar-totem-balloon nourishland-spatial-note-surface">
          <span class="creator-ar-totem-balloon-text">${text.map(line => `<span>${escapeHtml(line)}</span>`).join('')}</span>
        </section>`
        : '';
    return `<aside class="creator-ar-totem-information" data-ar-totem-information="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(board.title)} information">
        <span class="creator-ar-location-stick creator-ar-totem-stick" aria-hidden="true"></span>
        <span class="creator-ar-location-ground creator-ar-totem-attachment" aria-hidden="true"></span>
        ${balloon}
        <div class="creator-ar-totem-link-signs" aria-label="Linked Area transitions">
          <span class="creator-ar-totem-link-mast" aria-hidden="true"></span>
          <span class="creator-ar-totem-link-hub" aria-hidden="true"></span>
          ${signs}
        </div>
      </aside>`;
}

function setPlacementStatus(message) {
    const status = overlayRoot?.querySelector('[data-ar-placement-status]');
    if (status) status.textContent = message;
}

function contextAppearanceButtons(type, appearance) {
    if (!['plant', 'note'].includes(type)) {
        return '<button type="button" data-ar-context-edit aria-label="Open quick edit"><b aria-hidden="true">&#9998;</b><span>EDIT</span><small>QUICK EDIT</small></button>';
    }
    const color = colorOption(type, appearance.color);
    const shape = markerAppearanceShape({ appearance }).toUpperCase();
    const size = String(appearance.size || 'medium').toUpperCase();
    const opacity = Math.round(Number(appearance.opacity ?? 1) * 100);
    return `${type === 'plant' ? `<button type="button" data-ar-cycle-shape aria-label="Cycle Plant Live Tag shape. Current ${escapeHtml(shape)}"><b aria-hidden="true">△</b><span>SHAPE</span><small>${escapeHtml(shape)}</small></button>` : ''}
        <button type="button" data-ar-cycle-color aria-label="Cycle ${readyPlacementLabel(type)} color. Current ${escapeHtml(color.name)}"><b class="creator-ar-color-cycle" style="--cycle-color:${escapeHtml(color.value)}" aria-hidden="true"></b><span>COLOR</span><small>${escapeHtml(color.name)}</small></button>
        <button type="button" data-ar-cycle-size aria-label="Cycle ${readyPlacementLabel(type)} size. Current ${escapeHtml(size)}"><b aria-hidden="true">&#9670;</b><span>SIZE</span><small>${escapeHtml(size)}</small></button>
        <button type="button" data-ar-cycle-opacity aria-label="Cycle ${readyPlacementLabel(type)} opacity. Current ${opacity} percent"><b aria-hidden="true">&#9680;</b><span>OPACITY</span><small>${opacity}%</small></button>
        <button type="button" data-ar-context-edit aria-label="Open quick edit"><b aria-hidden="true">&#9998;</b><span>EDIT</span><small>QUICK EDIT</small></button>`;
}

function bindContextToolbarAction(toolbar, selector, action) {
    toolbar.querySelector(selector)?.addEventListener('pointerup', event => {
        if (event.button != null && event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        action();
    });
}

function updateContextToolbar() {
    overlayRoot?.querySelectorAll('[data-ar-marker-id]').forEach(element => {
        element.classList.toggle('is-selected', Boolean(contextToolbarRecord?.marker?.id) && element.dataset.arMarkerId === contextToolbarRecord.marker.id);
    });
    const toolbar = overlayRoot?.querySelector('[data-ar-context-toolbar]');
    if (!toolbar) return;
    const placementType = ['plant', 'note'].includes(readyPlacementType) ? readyPlacementType : '';
    const selectedRecord = !placementType && contextToolbarRecord && sessionMarkers.includes(contextToolbarRecord)
        ? contextToolbarRecord
        : null;
    const type = placementType || selectedRecord?.marker?.type || '';
    if (!type) {
        toolbar.hidden = true;
        toolbar.innerHTML = '';
        toolbar.removeAttribute('aria-label');
        return;
    }
    const appearance = placementType
        ? currentPlacementAppearance(placementType)
        : {
            color: markerAppearanceColor(selectedRecord.marker),
            size: markerAppearanceSize(selectedRecord.marker),
            opacity: markerAppearanceOpacity(selectedRecord.marker),
            shape: selectedRecord.marker.type === 'plant' ? markerAppearanceShape(selectedRecord.marker) : undefined
        };
    const stateLabel = placementType ? `Create ${readyPlacementLabel(type)}` : `Edit ${selectedRecord.marker.name}`;
    const locationNoteControl = !placementType && type === 'area_checkpoint'
        ? `<button type="button" data-ar-context-location-note aria-pressed="${locationNoteVisible}"><b aria-hidden="true">${locationNoteVisible ? '&#9681;' : '&#9673;'}</b><span>${locationNoteVisible ? 'HIDE NOTE' : 'VIEW NOTE'}</span></button>`
        : '';
    toolbar.hidden = false;
    toolbar.setAttribute('aria-label', `${stateLabel} tools`);
    toolbar.innerHTML = `<span class="creator-ar-context-label">${placementType ? 'CREATE' : 'EDIT'}</span>
        ${contextAppearanceButtons(type, appearance)}
        ${locationNoteControl}`;
    bindContextToolbarAction(toolbar, '[data-ar-cycle-color]', () => cycleContextAppearance('color'));
    bindContextToolbarAction(toolbar, '[data-ar-cycle-shape]', () => cycleContextAppearance('shape'));
    bindContextToolbarAction(toolbar, '[data-ar-cycle-size]', () => cycleContextAppearance('size'));
    bindContextToolbarAction(toolbar, '[data-ar-cycle-opacity]', () => cycleContextAppearance('opacity'));
    bindContextToolbarAction(toolbar, '[data-ar-context-edit]', () => selectedRecord
        ? openInlineEditor(selectedRecord, true)
        : placementType
        ? openInlineEditor(placementEditorRecord(placementType), true)
        : null);
    bindContextToolbarAction(toolbar, '[data-ar-context-location-note]', () => toggleLocationNoteVisibility(selectedRecord));
}

function cycleContextAppearance(property) {
    const type = ['plant', 'note'].includes(readyPlacementType)
        ? readyPlacementType
        : contextToolbarRecord?.marker?.type;
    if (!['plant', 'note'].includes(type)) return;
    const appearance = readyPlacementType
        ? currentPlacementAppearance(type)
        : {
            color: markerAppearanceColor(contextToolbarRecord.marker),
            size: markerAppearanceSize(contextToolbarRecord.marker),
            opacity: markerAppearanceOpacity(contextToolbarRecord.marker)
        };
    if (property === 'color') {
        const values = TASKBAR_V2_COLORS[type].map(option => option.value);
        appearance.color = nextCycleValue(colorOption(type, appearance.color).value, values);
    } else if (property === 'shape' && type === 'plant') {
        appearance.shape = nextCycleValue(markerAppearanceShape({ appearance }), MARKER_APPEARANCE_SHAPES);
    } else if (property === 'size') {
        appearance.size = nextCycleValue(appearance.size, TASKBAR_V2_SIZES);
    } else if (property === 'opacity') {
        appearance.opacity = nextCycleValue(Number(appearance.opacity), TASKBAR_V2_OPACITIES);
    } else {
        return;
    }
    if (readyPlacementType) {
        pendingPlacementAppearance = { type, ...appearance };
        updateNotePlacementPreview();
        updateContextToolbar();
        setPlacementStatus(`${readyPlacementLabel(type)} ${property} updated. Tap the centre circle when it looks right.`);
        return;
    }
    const record = contextToolbarRecord;
    const previousAppearance = record.marker.appearance || {};
    const nextAppearance = {
        ...previousAppearance,
        ...appearancePayload(appearance)
    };
    record.marker = { ...record.marker, appearance: nextAppearance };
    renderSessionMarkers();
    updateContextToolbar();
    queueContextAppearanceSave(record, nextAppearance, property);
}

function queueContextAppearanceSave(record, appearance, property) {
    const revision = (record.appearanceRevision || 0) + 1;
    record.appearanceRevision = revision;
    const markerSnapshot = { ...record.marker, appearance: { ...appearance } };
    record.appearanceSaveChain = (record.appearanceSaveChain || Promise.resolve())
        .catch(() => {})
        .then(async () => {
            const updated = await updatePlaceMarker(activeProjectId, record.siteId, record.areaId, record.marker.id, markerSnapshot);
            if (record.appearanceRevision !== revision) return;
            record.marker = { ...updated, appearance: { ...appearance } };
            renderSessionMarkers();
            updateContextToolbar();
            setPlacementStatus(`${record.marker.name} ${property} saved. EDIT mode remains on.`);
        })
        .catch(error => {
            if (record.appearanceRevision === revision) {
                setPlacementStatus(`Could not save ${property}: ${error.message}`);
            }
        });
}

function openMarkerContextToolbar(record, force = false) {
    if (!record || (!force && interactionMode !== 'select')) return;
    contextToolbarRecord = record;
    closeAreaChooser();
    closePlacePicker();
    closeUnplacedBag();
    updateContextToolbar();
    setPlacementStatus(`${record.marker.name} selected. Use the compact tools or continue in Web Mode.`);
}

function closeMarkerContextToolbar() {
    contextToolbarRecord = null;
    updateContextToolbar();
}

async function openContextInWebMode() {
    if (contextToolbarRecord) {
        const record = contextToolbarRecord;
        arReturnContext = record.marker.type === 'area_checkpoint'
            ? `web-totem:${record.areaId}`
            : `web-marker:${record.marker.id}`;
        setPlacementStatus(`Opening ${record.marker.name} in Web Mode.`);
        exitArMode();
        return;
    }
    const type = readyPlacementType;
    if (!['plant', 'note'].includes(type)) return;
    const loadingOperation = captureArOperationContext();
    setPlacementStatus(`Preparing ${readyPlacementLabel(type)} for Web Mode...`);
    try {
        if (!await ensurePlacementArea(loadingOperation)) return;
        if (!isArOperationCurrent(loadingOperation, { matchLocation: false })) return;
        const operation = captureArOperationContext();
        if (!isArOperationCurrent(operation)) return;
        const appearance = appearancePayload(currentPlacementAppearance(type));
        const details = pendingPlacementDetails?.type === type ? pendingPlacementDetails : null;
        let marker;
        if (pendingBagRecord) {
            const bagRecord = pendingBagRecord;
            marker = await updatePlaceMarker(operation.projectId, bagRecord.siteId, bagRecord.areaId, bagRecord.marker.id, {
                ...bagRecord.marker,
                ...(details ? { name: details.name, description: details.description, notes: type === 'note' ? details.description : bagRecord.marker.notes || '' } : {}),
                appearance: { ...(bagRecord.marker.appearance || {}), ...appearance }
            });
        } else {
            const draft = createMinimalMarkerDraft(type, {
                name: details?.name || (type === 'plant' ? 'New plant' : 'New note'),
                description: details?.description || ''
            });
            draft.appearance = appearance;
            const response = await createPlaceMarker(operation.projectId, operation.siteId, operation.areaId, draft);
            marker = response.marker || response;
        }
        if (!isArOperationCurrent(operation, { matchLocation: false }) || !marker?.id) return;
        arReturnContext = `web-marker:${marker.id}`;
        exitArMode();
    } catch (error) {
        if (isArOperationCurrent(loadingOperation, { matchLocation: false })) {
            setPlacementStatus(`Could not open Web Mode: ${error.message}`);
        }
    }
}

function updateReadyPlacementControl() {
    overlayRoot?.classList.toggle('is-placement-armed', Boolean(readyPlacementType));
    overlayRoot?.querySelector('[data-ar-add-plant]')?.classList.toggle('is-active', readyPlacementType === 'plant');
    overlayRoot?.querySelector('[data-ar-add-note]')?.classList.toggle('is-active', readyPlacementType === 'note');
    if (!readyPlacementType && !interactionMode) {
        interactionMode = suspendedInteractionMode || 'neutral';
        suspendedInteractionMode = '';
        updateInteractionControls();
    }
    const guideLabel = overlayRoot?.querySelector('[data-ar-placement-guide-label]');
    if (guideLabel && readyPlacementType) guideLabel.textContent = `Place ${readyPlacementLabel(readyPlacementType)}`;
    updateNotePlacementPreview();
    updateContextToolbar();
}

function updateNotePlacementPreview() {
    const preview = overlayRoot?.querySelector('[data-ar-note-placement-preview]');
    const surface = preview?.querySelector('[data-ar-note-placement-surface]');
    if (!preview || !surface) return;
    const armed = readyPlacementType === 'note';
    if (!armed) {
        preview.hidden = true;
        return;
    }
    const marker = placementPreviewMarker('note');
    const label = preview.querySelector('[data-ar-note-placement-label]');
    preview.hidden = true;
    preview.classList.toggle('is-note-outline', markerNoteSurface(marker) === 'outline');
    for (const declaration of markerDomAppearanceStyle(marker).split(';').filter(Boolean)) {
        const separator = declaration.indexOf(':');
        preview.style.setProperty(declaration.slice(0, separator), declaration.slice(separator + 1));
    }
    if (label) label.textContent = marker.name || 'New note';
}

function positionNotePlacementPreview(view = latestView) {
    const preview = overlayRoot?.querySelector('[data-ar-note-placement-preview]');
    if (!preview || readyPlacementType !== 'note') return;
    const target = placementPoint('note');
    latestNotePlacementPoint = target;
    if (questBeltUsesSpatialRenderer()) {
        preview.hidden = true;
        return;
    }
    const pointer = overlayRoot?.querySelector('.creator-ar-placement-guide');
    const pointerRect = pointer?.getBoundingClientRect();
    const point = target && pointerRect
        ? { x: pointerRect.left + pointerRect.width / 2, y: pointerRect.top + pointerRect.height / 2 }
        : target ? projectWorldPoint(view, target) : null;
    preview.hidden = !point;
    if (!point) return;
    preview.style.transform = `translate(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px) translate(-50%, -50%)`;
}

function placementPoint(type = readyPlacementType) {
    if (!latestViewerMatrix) return null;
    const distance = type === 'note'
        ? AR_EXPERIENCE_CONFIG.notePlacementDistanceMetres
        : AR_EXPERIENCE_CONFIG.placementDistanceMetres;
    const ray = pointerWorldRay() || {
        x: -latestViewerMatrix[8],
        y: -latestViewerMatrix[9],
        z: -latestViewerMatrix[10]
    };
    const origin = pointerWorldOrigin() || { x: latestViewerMatrix[12], y: latestViewerMatrix[13], z: latestViewerMatrix[14] };
    const target = {
        x: origin.x + ray.x * distance,
        y: origin.y + ray.y * distance,
        z: origin.z + ray.z * distance
    };
    return isGardenStakePlacement(type) ? gardenStakePlacementPoint(target) : target;
}

function notePlacementTarget() {
    // Notes must remain placeable while the DOM overlay is still waiting for
    // its first projected frame. The viewer-forward target is stable enough
    // for the saved anchor and is refined on subsequent frames.
    return latestNotePlacementPoint || placementPoint('note');
}

function roundCoordinate(value) {
    return Math.round(Number(value) * 1000) / 1000;
}

function captureArOperationContext() {
    return {
        launchedSession: session,
        overlay: overlayRoot,
        projectId: activeProjectId,
        siteId: activeSiteId,
        areaId: activeAreaId,
        areaName: activeAreaName,
        checkpointId: activeCheckpointId,
        checkpointOrigin: checkpointSessionOrigin,
        generation: placementArmGeneration
    };
}

function isArOperationCurrent(context, { matchLocation = true, matchGeneration = true } = {}) {
    return Boolean(context?.launchedSession)
        && session === context.launchedSession
        && overlayRoot === context.overlay
        && activeProjectId === context.projectId
        && (!matchGeneration || placementArmGeneration === context.generation)
        && (!matchLocation || (activeSiteId === context.siteId && activeAreaId === context.areaId));
}

function spatialAnchor(position, context = null, rotationDegrees = 0) {
    const origin = context ? context.checkpointOrigin : checkpointSessionOrigin;
    const checkpointId = context ? context.checkpointId : activeCheckpointId;
    const checkpointPosition = origin
        ? {
            x: roundCoordinate(position.x - origin[12]),
            y: roundCoordinate(position.y - origin[13]),
            z: roundCoordinate(position.z - origin[14])
        }
        : null;
    return {
        type: 'spatial',
        coordinate_space: checkpointId && checkpointPosition ? 'checkpoint-local' : 'session-local',
        checkpoint_id: checkpointId || '',
        position: checkpointPosition || {
            x: roundCoordinate(position.x),
            y: roundCoordinate(position.y),
            z: roundCoordinate(position.z)
        },
        rotation_degrees: roundCoordinate(rotationDegrees),
        captured_at: new Date().toISOString()
    };
}

function checkpointOriginMatrix(position) {
    const matrix = new Float32Array(16);
    matrix[0] = 1;
    matrix[5] = 1;
    matrix[10] = 1;
    matrix[15] = 1;
    matrix[12] = Number(position.x);
    matrix[13] = Number(position.y);
    matrix[14] = Number(position.z);
    return matrix;
}

function updateAreaRecenterPrompt({ ready = false, hidden = false, busy = false } = {}) {
    const prompt = overlayRoot?.querySelector('[data-ar-recenter-prompt]');
    const button = prompt?.querySelector('[data-ar-recenter-area]');
    if (!prompt || !button) return;
    prompt.hidden = hidden;
    button.disabled = !ready || busy;
    button.textContent = busy ? 'RECENTERING…' : 'RECENTER AREA';
}

async function recenterActiveArea() {
    const totem = activeTotemRecord();
    if (!totem || !hasSavedSpatialPosition(totem)) {
        setPlacementStatus(`${activeAreaName || 'This Area'} has no saved Totem to recenter around.`);
        updateAreaRecenterPrompt({ hidden: true });
        return false;
    }
    const target = spatialPosition(latestHitMatrix, latestViewerMatrix);
    if (!target) {
        setPlacementStatus('Move your phone briefly, aim at the Totem position, then tap Recenter Area.');
        return false;
    }
    const origin = groundedTotemPosition(target);
    const areaRecords = activeAreaMarkers();
    const alignment = alignAreaToCheckpoint(areaRecords, totem.marker.id, origin);
    if (!alignment.checkpoint) {
        setPlacementStatus('The saved Totem position could not be used to restore this Area.');
        return false;
    }

    updateAreaRecenterPrompt({ ready: true, busy: true });
    activeCheckpointId = alignment.checkpoint.marker.id;
    checkpointSessionOrigin = checkpointOriginMatrix(alignment.origin);
    const alignedById = new Map(alignment.records.map(record => [record.marker.id, record]));
    sessionMarkers = sessionMarkers.map(record => record.areaId === activeAreaId
        ? alignedById.get(record.marker.id) || record
        : record);
    locatedTotemRecord = null;
    totemGuideVisible = false;
    renderSessionMarkers();

    const operation = captureArOperationContext();
    try {
        const checkpointRecord = alignment.records.find(record => record.marker.id === activeCheckpointId);
        const relatedRecords = alignment.records.filter(record => record.marker.id !== activeCheckpointId);
        await Promise.all(relatedRecords.map(record => saveMarkerAnchor(
            operation.projectId,
            record.siteId,
            record.areaId,
            record.marker.id,
            spatialAnchorForRecord(record, operation)
        )));
        if (checkpointRecord) {
            await saveMarkerAnchor(
                operation.projectId,
                checkpointRecord.siteId,
                checkpointRecord.areaId,
                checkpointRecord.marker.id,
                spatialAnchorForRecord(checkpointRecord, operation)
            );
        }
        if (!isArOperationCurrent(operation)) return false;
        updateAreaRecenterPrompt({ hidden: true });
        setPlacementStatus(`${activeAreaName || 'Area'} restored around its Totem. Saved Plants, Notes and Markers keep their positions relative to it.`);
        return true;
    } catch (error) {
        if (!isArOperationCurrent(operation)) return false;
        updateAreaRecenterPrompt({ hidden: true });
        setPlacementStatus(`Area recentered for this visit, but the alignment could not be saved: ${error.message}`);
        return false;
    }
}

function clearMarkerHoldGesture() {
    if (!markerHoldGesture) return;
    clearTimeout(markerHoldGesture.timer);
    markerHoldGesture.element?.classList.remove('is-hold-armed');
    markerHoldGesture = null;
}

function beginMarkerHoldGesture(record, event) {
    if (!['neutral', 'view', 'grab', 'select'].includes(interactionMode) || readyPlacementType || dragState || markerHoldGesture) return false;
    if (hasPlantProfile(record) && record.profileExpanded) return false;
    if (event.button != null && event.button !== 0) return false;
    const element = event.currentTarget;
    if (!element) return false;
    const gesture = {
        record,
        element,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        timer: null
    };
    markerHoldGesture = gesture;
    event.preventDefault();
    event.stopPropagation();
    element.setPointerCapture?.(event.pointerId);
    element.classList.add('is-hold-armed');
    gesture.timer = setTimeout(() => {
        if (markerHoldGesture !== gesture) return;
        gesture.timer = null;
        element.classList.remove('is-hold-armed');
        beginMarkerInteraction(record, event, { directHold: true, element });
    }, CREATOR_AR_HOLD_DELAY_MS);
    return true;
}

function moveMarkerHoldGesture(event) {
    const gesture = markerHoldGesture;
    if (!gesture || gesture.pointerId !== event.pointerId || dragState) return;
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) <= CREATOR_AR_HOLD_MOVE_TOLERANCE_PX) return;
    clearMarkerHoldGesture();
}

function finishMarkerHoldGesture(record, event) {
    const gesture = markerHoldGesture;
    if (!gesture || gesture.record !== record || gesture.pointerId !== event.pointerId) return false;
    if (dragState?.record === record) {
        event.preventDefault();
        event.stopPropagation();
        void finishMarkerDrag(event);
        return true;
    }
    clearMarkerHoldGesture();
    event.preventDefault();
    event.stopPropagation();
    // In explicit Grab mode a short tap should not turn into a one-frame drag.
    // The delayed hold above is the only gesture that starts movement.
    if (interactionMode === 'grab') return true;
    beginMarkerInteraction(record, event);
    return true;
}

function cancelMarkerHoldGesture(event) {
    const gesture = markerHoldGesture;
    if (!gesture || (event?.pointerId != null && event.pointerId !== gesture.pointerId)) return;
    if (dragState?.record === gesture.record) {
        cancelMarkerDrag(event);
        return;
    }
    clearMarkerHoldGesture();
}

function handleMarkerPointerDown(record, event) {
    if (hasPlantProfile(record) && record.profileExpanded) {
        event.preventDefault();
        event.stopPropagation();
        beginMarkerInteraction(record, event);
        return;
    }
    beginMarkerHoldGesture(record, event);
}

function cleanupDrag() {
    window.removeEventListener('pointermove', moveMarkerDrag);
    window.removeEventListener('pointercancel', cancelMarkerDrag);
    dragState?.element?.classList.remove('is-adjusting');
    dragState = null;
    clearMarkerHoldGesture();
    overlayRoot?.classList.remove('is-holding-item');
    const joystick = overlayRoot?.querySelector('[data-ar-depth-joystick]');
    if (joystick) {
        joystick.hidden = true;
        joystick.classList.remove('can-rotate-arrow');
        joystick.style.setProperty('--depth-shift', '0px');
    }
}

function updateInteractionControls() {
    const eye = overlayRoot?.querySelector('[data-ar-view-mode]');
    const edit = overlayRoot?.querySelector('[data-ar-select-mode]');
    eye?.classList.toggle('is-active', interactionMode === 'view');
    edit?.classList.toggle('is-active', interactionMode === 'select');
    eye?.setAttribute('aria-pressed', String(interactionMode === 'view'));
    edit?.setAttribute('aria-pressed', String(interactionMode === 'select'));
    const markerLayer = overlayRoot?.querySelector('[data-ar-marker-layer]');
    markerLayer?.classList.toggle('is-interactive', Boolean(interactionMode));
    markerLayer?.classList.toggle('is-view-mode', interactionMode === 'view');
    markerLayer?.classList.toggle('is-neutral-mode', interactionMode === 'neutral');
    markerLayer?.classList.toggle('is-grab-mode', interactionMode === 'grab');
    markerLayer?.classList.toggle('is-select-mode', interactionMode === 'select');
    overlayRoot?.classList.toggle('is-view-mode', interactionMode === 'view');
    overlayRoot?.classList.toggle('is-neutral-mode', interactionMode === 'neutral');
    overlayRoot?.classList.toggle('is-hold-mode', interactionMode === 'grab');
    overlayRoot?.classList.toggle('is-select-mode', interactionMode === 'select');
    updateControllerHud();
}

function activateQuestHeadsetFromInput(source) {
    if (!isTrackedHeadsetInputSource(source)) return false;
    questHeadsetSession = true;
    document.body.classList.add('creator-ar-quest-headset');
    document.body.dataset.arDevice = 'quest';
    return true;
}

function controllerInputSource() {
    const sources = [...(session?.inputSources || [])];
    const trackedControllers = sources.filter(source => source.targetRayMode === 'tracked-pointer');
    const selectedSource = trackedControllers.find(source => source.handedness === 'right' && source.gamepad)
        || trackedControllers.find(source => source.handedness === 'right')
        || trackedControllers.find(source => source.gamepad)
        || trackedControllers[0]
        || sources.find(source => source.hand)
        || sources.find(source => source.targetRayMode === 'gaze')
        || null;
    activateQuestHeadsetFromInput(selectedSource);
    return selectedSource;
}

function isPrimaryControllerSource(source) {
    if (!source) return creatorInputMode === 'controller';
    const active = controllerInputSource();
    if (!active) return false;
    return source === active || (active.handedness === 'right' && source.handedness === 'right');
}

function controllerActionElements() {
    const panels = [
        overlayRoot?.querySelector('[data-ar-spatial-web-window]'),
        overlayRoot?.querySelector('[data-ar-place-picker]'),
        overlayRoot?.querySelector('[data-ar-area-chooser]'),
        overlayRoot?.querySelector('[data-ar-context-toolbar]'),
        overlayRoot?.querySelector('.creator-ar-taskbar')
    ];
    const panel = panels.find(candidate => candidate && !candidate.hidden && candidate.querySelector('button:not([disabled])'));
    if (panel?.classList.contains('creator-ar-taskbar') && questBeltUsesSpatialRenderer()) return questBeltActionElements();
    return [...(panel?.querySelectorAll('button:not([disabled])') || [])].filter(button => !button.hidden);
}

function spatialWebPlantId() {
    const hovered = activeAreaMarkers().find(record => record.marker.id === hoveredMarkerId && record.marker.type === 'plant');
    return hovered?.marker.id || activeAreaMarkers().find(record => record.marker.type === 'plant')?.marker.id || '';
}

function spatialWebAreaId() {
    const candidate = activeAreaId || activeAreaMarkers().find(record => record.areaId && !isDefaultHomeArea(record.areaName || record.areaId))?.areaId || '';
    return candidate && !isDefaultHomeArea(activeAreaName || candidate) ? candidate : '';
}

function closeSpatialWebWindow() {
    spatialWebWindow?.remove();
    spatialWebWindow = null;
    delete window.__nourishlandSpatialWindow;
    overlayRoot?.classList.remove('has-spatial-web-window');
    controllerMenuActive = true;
    updateControllerHud();
}

async function openQuestSpatialWebPanel() {
    if (questSpatialWebVisible) {
        closeQuestSpatialWebPanel();
        setPlacementStatus('Project Dashboard closed. AR remains active.');
        updateControllerHud();
        return;
    }
    closeQuestSpecialPalette();
    questSpatialWebVisible = true;
    // Summon the dashboard in front of the user's current view, then keep
    // that transform unchanged so the surface remains world locked.
    questSpatialDashboardPanel = spatialDashboardPanelFromViewer(latestViewerMatrix || questBeltViewerMatrix);
    controllerMenuActive = true;
    setPlacementStatus('Loading the full Project Dashboard into the spatial panel…');
    updateControllerHud();
    try {
        const dashboardRoot = document.getElementById('app');
        if (!dashboardRoot || !gl || !questSpatialDashboardPanel) throw new Error('The dashboard surface is not ready.');
        await renderProjectDashboard(dashboardRoot, encodeURIComponent(activeProjectId));
        if (!questSpatialWebVisible || !gl) return;
        questSpatialDashboardMirror?.destroy();
        questSpatialDashboardMirror = createSpatialDashboardMirror({
            gl,
            root: dashboardRoot,
            onStatus: setPlacementStatus,
            onError: error => setPlacementStatus(`Spatial Dashboard refresh failed: ${error.message}`)
        });
        document.body.classList.add('creator-ar-spatial-web-ready');
        setPlacementStatus('Project Dashboard ready. Aim and trigger to use it; move the thumbstick vertically to scroll. Press HUB again to close.');
    } catch (error) {
        closeQuestSpatialWebPanel();
        setPlacementStatus(`Project Dashboard could not open: ${error.message}`);
    }
}

// Keep the existing return context names for overlay-capable Quest sessions:
// `web-area:${activeAreaId}` : 'webhub'

function openSpatialWebWindow() {
    const selectedRecord = contextToolbarRecord && sessionMarkers.includes(contextToolbarRecord)
        ? contextToolbarRecord
        : null;
    const selectedReturnContext = selectedRecord?.marker?.type === 'area_checkpoint'
        ? `web-totem:${selectedRecord.areaId}`
        : selectedRecord
            ? `web-marker:${selectedRecord.marker.id}`
            : '';
    // WEB is the full creator workspace, not an AR exit or an icon-only menu.
    if (!questHeadsetSession) {
        if (selectedReturnContext) arReturnContext = selectedReturnContext;
        exitArMode();
        return;
    }
    // Quest always receives the dashboard as a world-locked WebGL texture. DOM Overlay
    // panels are head-locked by the compositor and become uncomfortable as
    // soon as the user switches from controllers to hand tracking.
    void openQuestSpatialWebPanel();
    return;
    if (!overlayRoot || spatialWebWindow) return;
    const content = document.createElement('div');
    content.className = 'creator-ar-spatial-web-content';
    const encodedProjectId = encodeURIComponent(activeProjectId);
    const renderIntoWindow = (renderer, ...args) => {
        content.innerHTML = '<p class="creator-ar-spatial-web-loading">Opening spatial workspace…</p>';
        return Promise.resolve(renderer(content, ...args)).catch(error => {
            content.innerHTML = `<div class="screen"><div class="panel"><h2>Spatial workspace unavailable</h2><p>${escapeHtml(error.message)}</p></div></div>`;
        });
    };
    spatialWebWindow = document.createElement('section');
    spatialWebWindow.className = 'creator-ar-spatial-web-window';
    spatialWebWindow.dataset.arSpatialWebWindow = '';
    spatialWebWindow.dataset.arSpatialWebMode = 'quest';
    spatialWebWindow.setAttribute('aria-label', 'Spatial Web workspace');
    spatialWebWindow.innerHTML = `<header class="creator-ar-spatial-web-header"><div><span>PROJECT DASHBOARD</span><strong>${escapeHtml(activeProjectName || activeProjectId)}</strong></div><button type="button" data-spatial-web-close aria-label="Close project dashboard">×</button></header>`;
    spatialWebWindow.append(content);
    overlayRoot.append(spatialWebWindow);
    overlayRoot.classList.add('has-spatial-web-window');
    const route = name => {
        if (name === 'dashboard') return renderIntoWindow(renderProjectDashboard, encodedProjectId);
        if (name === 'webhub') return renderIntoWindow(renderFieldGuide, encodedProjectId, true);
        if (name === 'area') {
            const areaId = spatialWebAreaId();
            return areaId
                ? renderIntoWindow(renderProjectAreaDashboard, encodedProjectId, encodeURIComponent(areaId))
                : renderIntoWindow(() => { content.innerHTML = '<div class="screen"><div class="panel"><h2>No named Area selected</h2><p>Select an Area in the Web Hub first, then reopen this spatial window.</p></div></div>'; });
        }
        if (name === 'selected') {
            if (selectedRecord?.marker?.type === 'area_checkpoint') {
                return renderIntoWindow(renderAreaCheckpointForm, encodedProjectId, encodeURIComponent(selectedRecord.areaId));
            }
            if (selectedRecord?.marker?.id) {
                return renderIntoWindow(openProjectEntry, encodedProjectId, encodeURIComponent(selectedRecord.marker.id), false, 'field-guide');
            }
            return route('area');
        }
        const markerId = spatialWebPlantId();
        return markerId
            ? renderIntoWindow(openProjectEntry, encodedProjectId, encodeURIComponent(markerId), false, 'field-guide')
            : renderIntoWindow(() => { content.innerHTML = '<div class="screen"><div class="panel"><h2>No Plant selected</h2><p>A Plant Dashboard will appear here when this project has a Plant.</p></div></div>'; });
    };
    window.__nourishlandSpatialWindow = {
        renderProjectDashboard: projectId => renderIntoWindow(renderProjectDashboard, projectId),
        renderProjectHome: projectId => renderIntoWindow(renderProjectHome, projectId),
        renderFieldGuide: (projectId, creator) => renderIntoWindow(renderFieldGuide, projectId, creator),
        renderProjectAreaDashboard: (projectId, areaId, options) => renderIntoWindow(renderProjectAreaDashboard, projectId, areaId, options),
        openProjectEntry: (projectId, markerId, returnToAr, returnContext) => renderIntoWindow(openProjectEntry, projectId, markerId, returnToAr, returnContext)
    };
    spatialWebWindow.querySelector('[data-spatial-web-close]').addEventListener('click', closeSpatialWebWindow);
    controllerMenuActive = true;
    updateControllerHud();
    // HUB always mirrors the main Web Mode dashboard.
    // Legacy route shape retained for older integrations: void route(selectedRecord ? 'selected' : 'area')
    void route('dashboard');
}

function controllerActionLabel(button) {
    return String(button?.getAttribute('aria-label') || button?.textContent || 'Action')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function updateControllerHud() {
    const hud = overlayRoot?.querySelector('[data-ar-controller-hud]');
    if (!hud) return;
    hud.hidden = creatorInputMode !== 'controller';
    if (hud.hidden) return;
    const actions = controllerActionElements();
    controllerActionIndex = actions.length ? Math.min(controllerActionIndex, actions.length - 1) : 0;
    const action = hud.querySelector('[data-ar-controller-action]');
    const instruction = hud.querySelector('[data-ar-controller-instruction]');
    action.textContent = controllerMenuActive
        ? actions.length ? controllerActionLabel(actions[controllerActionIndex]) : 'WAITING FOR CONTROLS'
        : interactionMode === 'neutral' ? 'AIM DOT READY' : `AIM AT A MARKER / ${interactionMode.toUpperCase()} MODE`;
    instruction.textContent = controllerMenuActive
        ? 'Thumbstick choose / Trigger confirm'
        : 'Thumbstick opens controls · Trigger selects the aimed element';
}

function setCreatorInputMode(mode) {
    const nextMode = mode === 'controller' ? 'controller' : 'touch';
    if (creatorInputMode === nextMode) {
        updateControllerHud();
        return;
    }
    creatorInputMode = nextMode;
    controllerActionIndex = 0;
    controllerMenuActive = true;
    overlayRoot?.classList.toggle('is-controller-mode', creatorInputMode === 'controller');
    updateControllerHud();
    if (creatorInputMode === 'controller') {
        setPlacementStatus('Right Quest controller active. Aim with the controller, move the thumbstick to choose an AR action, then press the trigger.');
    } else if (!readyPlacementType) {
        setPlacementStatus('Touch controls active. Aim dot ready.');
    }
}

function cycleControllerAction(direction) {
    const actions = controllerActionElements();
    if (!actions.length) return;
    controllerActionIndex = (controllerActionIndex + direction + actions.length) % actions.length;
    controllerMenuActive = true;
    updateControllerHud();
}

function dispatchControllerAction(button) {
    if (!button) return;
    button.click();
    const event = new Event('pointerup', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'button', { value: 0 });
    button.dispatchEvent(event);
    controllerActionIndex = 0;
    controllerMenuActive = questSpecialPaletteVisible
        || questSpatialWebVisible
        || Boolean(spatialWebWindow)
        || Boolean(overlayRoot?.querySelector('[data-ar-place-picker]:not([hidden]), [data-ar-area-chooser]:not([hidden]), [data-ar-context-toolbar]:not([hidden])'));
    updateControllerHud();
}

function pointerWorldOrigin() {
    return creatorInputMode === 'controller' && latestControllerRay?.origin
        ? latestControllerRay.origin
        : latestViewerMatrix
            ? { x: latestViewerMatrix[12], y: latestViewerMatrix[13], z: latestViewerMatrix[14] }
            : null;
}

function controllerMarkerRadius(record) {
    const marker = record?.marker || {};
    if (marker.type === 'note') return .62;
    if (marker.type === 'area_checkpoint') return .7;
    if (marker.special_symbol) return .5;
    if (marker.type === 'plant') return markerAppearanceShape(marker) === 'plate' ? .12 : .064;
    return .12;
}

function questBeltUsesSpatialRenderer() {
    // Quest controls must stay in room space for both controllers and hands.
    // The mobile interface continues to use its existing DOM controls.
    return questHeadsetSession;
}

function usesSpatialPimRenderer() {
    // Demo and Creator must use the same transparent, world-locked PIM on
    // phones as well as headsets. The DOM profile remains only as an invisible
    // touch/accessibility hit layer for phone input.
    return Boolean(session && (sessionMode === 'immersive-ar' || questBeltUsesSpatialRenderer()));
}

function questBeltActionElements() {
    const buttons = new Map(
        [...(overlayRoot?.querySelectorAll('.creator-ar-taskbar > button:not([disabled])') || [])]
            .filter(button => !button.hidden)
            .map(button => [button.dataset.questArAction, button])
    );
    return QUEST_SPATIAL_BELT_ACTIONS.map(action => buttons.get(action.id)).filter(Boolean);
}

function currentQuestBeltLayout() {
    if (!questBeltUsesSpatialRenderer()) return [];
    // Capture the belt in the first stable viewer pose. Subsequent head
    // movement must not drag the belt with the user: it is a world-locked
    // workspace surface, like a physical belt placed in the room.
    if (!questBeltLayout.length && latestViewerMatrix) {
        questBeltViewerMatrix = new Float32Array(latestViewerMatrix);
        questBeltLayout = questSpatialBeltLayout(latestViewerMatrix, {
            distance: .72,
            drop: .54,
            spacing: .16,
            curve: 0,
            yawStep: 0,
            faceUp: .72,
            radius: .1
        });
    }
    return questBeltLayout;
}

function currentQuestSpecialPaletteLayout() {
    if (!questBeltUsesSpatialRenderer() || !questSpecialPaletteVisible) return [];
    if (!questSpecialPaletteLayout.length) {
        questSpecialPaletteLayout = questSpatialPaletteLayout(questBeltViewerMatrix || latestViewerMatrix, visibleQuestSpecialPaletteActions(), {
            distance: .82,
            side: 1,
            sideOffset: .43,
            columnSpacing: .13,
            rowSpacing: .115,
            topOffset: .06,
            radius: .064
        });
    }
    return questSpecialPaletteLayout;
}

function closeQuestSpecialPalette() {
    questSpecialPaletteVisible = false;
    questSpecialPaletteLayout = [];
    questSpecialPaletteHoverIndex = -1;
    document.body.classList.remove('creator-ar-spatial-special-palette');
}

function closeQuestSpatialWebPanel() {
    questSpatialWebVisible = false;
    questSpatialDashboardMirror?.destroy();
    questSpatialDashboardMirror = null;
    questSpatialDashboardPanel = null;
    questSpatialDashboardHit = null;
    document.body.classList.remove('creator-ar-spatial-web-ready');
}

function clearMarkerHover() {
    hoveredMarkerId = '';
    overlayRoot?.querySelectorAll('[data-ar-marker-id]').forEach(element => element.classList.remove('is-xr-hover'));
}

function controllerSpecialPaletteActionAtAim() {
    const target = questSpatialBeltRayTarget(latestControllerRay, currentQuestSpecialPaletteLayout());
    questSpecialPaletteHoverIndex = target?.index ?? -1;
    if (target) {
        clearMarkerHover();
        controllerMenuActive = true;
        updateControllerHud();
    }
    return target;
}

function controllerSpatialDashboardAtAim() {
    let target = questSpatialWebVisible && questSpatialDashboardMirror
        ? spatialDashboardRayHit(latestControllerRay, questSpatialDashboardPanel, questSpatialDashboardMirror)
        : null;
    if (target) {
        const foregroundEnd = controllerRayEnd(latestControllerRay, controllerLaserSubjects(), XR_LASER_POINTER_CONFIG.length);
        const subjectDistance = foregroundEnd ? Math.hypot(
            foregroundEnd.x - latestControllerRay.origin.x,
            foregroundEnd.y - latestControllerRay.origin.y,
            foregroundEnd.z - latestControllerRay.origin.z
        ) : Infinity;
        const beltDistance = controllerQuestBeltSurfaceHit()?.distance ?? Infinity;
        const foregroundDistance = Math.min(subjectDistance, beltDistance);
        if (foregroundDistance + .01 < target.distance) target = null;
    }
    questSpatialDashboardHit = target;
    if (target) {
        clearMarkerHover();
        controllerMenuActive = true;
        updateControllerHud();
    }
    return target;
}

function controllerBeltActionAtAim() {
    const target = questSpatialBeltRayTarget(latestControllerRay, currentQuestBeltLayout());
    questBeltHoverIndex = target?.index ?? -1;
    if (target) {
        clearMarkerHover();
        controllerMenuActive = true;
        controllerActionIndex = target.index;
        updateControllerHud();
    }
    return target;
}

function controllerLaserSubjects() {
    const subjects = renderableAreaMarkers()
        .filter(record => !hiddenStructuralMarkerIds.has(record.marker.id))
        .map(record => ({
            position: record.position,
            // Keep selection forgiving, but stop the visible laser on the orb surface.
            radius: record.marker.type === 'plant' && markerAppearanceShape(record.marker) !== 'plate' ? .04 : controllerMarkerRadius(record)
        }));
    if (readyPlacementType) {
        const point = placementPoint();
        if (point) subjects.push({ position: point, radius: .38 });
    }
    currentQuestSpecialPaletteLayout().forEach(button => subjects.push({ position: button.position, radius: button.radius }));
    return subjects;
}

function controllerPointerEnd() {
    const spatialEnd = controllerRayEnd(latestControllerRay, controllerLaserSubjects(), XR_LASER_POINTER_CONFIG.length);
    const beltHit = controllerQuestBeltSurfaceHit();
    const pimHit = spatialPimTargetAtAim({ updateHover: false })?.hit || null;
    const dashboardHit = questSpatialWebVisible && questSpatialDashboardPanel
        ? spatialDashboardRayHit(latestControllerRay, questSpatialDashboardPanel, questSpatialDashboardMirror || {})
        : null;
    const candidates = [
        spatialEnd && {
            position: spatialEnd,
            distance: Math.hypot(
                spatialEnd.x - latestControllerRay.origin.x,
                spatialEnd.y - latestControllerRay.origin.y,
                spatialEnd.z - latestControllerRay.origin.z
            )
        },
        pimHit,
        beltHit,
        dashboardHit
    ].filter(candidate => candidate && candidate.distance <= XR_LASER_POINTER_CONFIG.length)
        .sort((left, right) => left.distance - right.distance);
    return candidates[0]?.position || null;
}

function controllerMarkerAtAim() {
    const ray = pointerWorldRay();
    const origin = pointerWorldOrigin();
    if (!ray || !origin) return null;
    const record = renderableAreaMarkers()
        .filter(record => !hiddenStructuralMarkerIds.has(record.marker.id))
        .map(record => {
            const offset = {
                x: record.position.x - origin.x,
                y: record.position.y - origin.y,
                z: record.position.z - origin.z
            };
            const along = offset.x * ray.x + offset.y * ray.y + offset.z * ray.z;
            if (along <= 0) return { record, along: Infinity, distance: Infinity };
            const closest = {
                x: origin.x + ray.x * along,
                y: origin.y + ray.y * along,
                z: origin.z + ray.z * along
            };
            return {
                record,
                along,
                distance: Math.hypot(record.position.x - closest.x, record.position.y - closest.y, record.position.z - closest.z)
            };
        })
        .filter(item => item.distance <= controllerMarkerRadius(item.record))
        .sort((left, right) => left.along - right.along)[0]?.record || null;
    hoveredMarkerId = record?.marker?.id || '';
    overlayRoot?.querySelectorAll('[data-ar-marker-id]').forEach(element => {
        element.classList.toggle('is-xr-hover', element.dataset.arMarkerId === hoveredMarkerId);
    });
    return record;
}

function clearControllerMarkerPress() {
    if (controllerPressState?.timer) clearTimeout(controllerPressState.timer);
    controllerPressState = null;
}

function armControllerMarkerPress(record) {
    clearControllerMarkerPress();
    if (!record) return;
    const press = { record, timer: null };
    controllerPressState = press;
    press.timer = setTimeout(() => {
        if (controllerPressState !== press) return;
        controllerPressState = null;
        const target = controllerMarkerAtAim();
        if (target?.marker?.id === record.marker.id) activateControllerTarget(true);
    }, CREATOR_AR_HOLD_DELAY_MS);
}

function finishControllerMarkerPress() {
    const press = controllerPressState;
    clearControllerMarkerPress();
    if (dragState?.pointerId === 'xr-controller') {
        void finishMarkerDrag();
        return true;
    }
    if (!press?.record) return false;
    const target = controllerMarkerAtAim() || press.record;
    if (hasPlantProfile(target)) {
        const element = overlayRoot?.querySelector(`[data-ar-marker-id="${CSS.escape(target.marker.id)}"]`);
        if (element) {
            beginMarkerInteraction(target, {
                preventDefault() {},
                stopPropagation() {},
                currentTarget: element
            }, { element });
            return true;
        }
    }
    openMarkerContextToolbar(target);
    return true;
}

function activateControllerTarget(directHold = interactionMode === 'grab') {
    const record = controllerMarkerAtAim();
    const element = record && overlayRoot?.querySelector(`[data-ar-marker-id="${CSS.escape(record.marker.id)}"]`);
    if (!record || !element) {
        setPlacementStatus('Aim at a placed element, then press and hold the controller trigger.');
        return false;
    }
    if (directHold && hasPlantProfile(record) && record.profileExpanded) {
        beginMarkerInteraction(record, {
            preventDefault() {},
            stopPropagation() {},
            pointerId: 'xr-controller',
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
            currentTarget: element
        }, { element });
        return true;
    }
    beginMarkerInteraction(record, {
        preventDefault() {},
        stopPropagation() {},
        pointerId: 'xr-controller',
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2,
        currentTarget: element
    }, { directHold, element });
    return true;
}

function selectQuestSpecialPaletteAction(action) {
    if (!action) return false;
    if (action.id === 'totem') {
        closeQuestSpecialPalette();
        createTotemFromSpecial();
        return true;
    }
    if (action.id === 'point-totem') {
        closeQuestSpecialPalette();
        toggleActiveTotemGuide();
        return true;
    }
    if (action.id === 'link-totem') {
        closeQuestSpecialPalette();
        toggleActiveTotemLinkGuide();
        return true;
    }
    if (action.id === 'recenter-totem') {
        closeQuestSpecialPalette();
        void recenterActiveArea();
        return true;
    }
    if (action.id === 'calibrate-link') {
        closeQuestSpecialPalette();
        void (totemLinkCalibration?.targetAreaId === activeAreaId
            ? captureTotemLinkCalibration()
            : startTotemLinkCalibration());
        return true;
    }
    return false;
}

function activateQuestSpatialDashboard(hit = controllerSpatialDashboardAtAim()) {
    if (!hit || !questSpatialDashboardMirror) return false;
    const activated = questSpatialDashboardMirror.activateAt(hit.pixelX, hit.pixelY);
    if (!activated) setPlacementStatus('Project Dashboard ready. Use the vertical thumbstick to scroll to more controls.');
    controllerMenuActive = true;
    updateControllerHud();
    return true;
}

function activateControllerSelection() {
    if (readyPlacementType) {
        void quickPlace(readyPlacementType);
        return true;
    }
    const pimTarget = spatialPimTargetAtAim({ updateHover: false });
    if (pimTarget) return activateSpatialPimTarget(pimTarget);
    const dashboardTarget = controllerSpatialDashboardAtAim();
    if (dashboardTarget) return activateQuestSpatialDashboard(dashboardTarget);
    const specialTarget = controllerSpecialPaletteActionAtAim();
    if (specialTarget) return selectQuestSpecialPaletteAction(specialTarget);
    const beltTarget = controllerBeltActionAtAim();
    if (beltTarget) {
        const action = questBeltActionElements()[beltTarget.index];
        if (!action) return false;
        dispatchControllerAction(action);
        return true;
    }
    const markerTarget = controllerMarkerAtAim();
    if (markerTarget) {
        if (hasPlantProfile(markerTarget)) {
            const element = overlayRoot?.querySelector(`[data-ar-marker-id="${CSS.escape(markerTarget.marker.id)}"]`);
            if (element) {
                beginMarkerInteraction(markerTarget, {
                    preventDefault() {},
                    stopPropagation() {},
                    currentTarget: element
                }, { element });
                return true;
            }
        }
        if (interactionMode === 'view') {
            const element = overlayRoot?.querySelector(`[data-ar-marker-id="${CSS.escape(markerTarget.marker.id)}"]`);
            if (element) {
                beginMarkerInteraction(markerTarget, {
                    preventDefault() {},
                    stopPropagation() {},
                    currentTarget: element
                }, { element });
                return true;
            }
        }
        openMarkerContextToolbar(markerTarget, true);
        return true;
    }
    if (!controllerMenuActive && interactionMode !== 'neutral') return activateControllerTarget();
    const action = controllerActionElements()[controllerActionIndex];
    if (!action) return false;
    dispatchControllerAction(action);
    return true;
}

function pollControllerInput() {
    const source = controllerInputSource();
    setCreatorInputMode(source ? 'controller' : 'touch');
    if (!source?.gamepad || creatorInputMode !== 'controller') return;
    const verticalCandidates = [Number(source.gamepad.axes?.[3]) || 0, Number(source.gamepad.axes?.[1]) || 0];
    const vertical = verticalCandidates.sort((left, right) => Math.abs(right) - Math.abs(left))[0];
    if (questSpatialWebVisible && questSpatialDashboardMirror && Math.abs(vertical) >= .28) {
        if (performance.now() >= questSpatialDashboardScrollCooldownUntil) {
            questSpatialDashboardScrollCooldownUntil = performance.now() + 72;
            questSpatialDashboardMirror.scrollBy(vertical * 105);
        }
        return;
    }
    const horizontal = Number(source.gamepad.axes?.[0]) || 0;
    if (Math.abs(horizontal) < .55 || performance.now() < controllerAxisCooldownUntil) return;
    controllerAxisCooldownUntil = performance.now() + 260;
    cycleControllerAction(horizontal > 0 ? 1 : -1);
}

function updateControllerRay(frame) {
    latestControllerRay = null;
    const source = controllerInputSource();
    if (!source || !refSpace) return;
    if (source.hand) {
        latestHandState = handTrackingState(frame, source, refSpace);
        latestControllerRay = latestHandState?.pointer || null;
        return;
    }
    latestHandState = null;
    const controllerSpaces = [source.targetRaySpace, source.gripSpace].filter(Boolean);
    const pose = controllerSpaces.map(space => frame.getPose(space, refSpace)).find(candidate => candidate?.transform?.matrix);
    latestControllerRay = controllerRayFromPose(pose, source.handedness || 'right');
}

function drawHandTrackingLines(view) {
    if (!latestHandState?.joints || !controllerPointerRenderer) return;
    for (const [fromName, toName] of XR_HAND_JOINT_CONNECTIONS) {
        const from = latestHandState.joints.get(fromName);
        const to = latestHandState.joints.get(toName);
        if (!from || !to) continue;
        drawSpatialTether(gl, controllerPointerRenderer, view, from, to, {
            segments: 3, width: .012, curve: 0, lift: 0, color: [0.72, 1, 0.34, .88]
        });
    }
}

function pollHandPinch() {
    if (!latestHandState?.pointer) return;
    const pinching = Boolean(latestHandState.pinch);
    if (pinching && !handPinchActive) {
        // Hand tracking has no controller select event. Once Note (or Plant)
        // is armed, a pinch is the placement press at the current aim point.
        if (readyPlacementType) {
            void quickPlace(readyPlacementType);
            handPinchActive = pinching;
            return;
        }
        const pimTarget = spatialPimTargetAtAim({ updateHover: false });
        if (pimTarget) {
            activateSpatialPimTarget(pimTarget);
            handPinchActive = pinching;
            return;
        }
        const dashboardTarget = controllerSpatialDashboardAtAim();
        if (dashboardTarget) {
            activateQuestSpatialDashboard(dashboardTarget);
            handPinchActive = pinching;
            return;
        }
        const specialTarget = controllerSpecialPaletteActionAtAim();
        if (specialTarget) {
            selectQuestSpecialPaletteAction(specialTarget);
            handPinchActive = pinching;
            return;
        }
        const beltTarget = controllerBeltActionAtAim();
        const beltAction = beltTarget && questBeltActionElements()[beltTarget.index];
        if (beltAction) dispatchControllerAction(beltAction);
        else if (interactionMode === 'view') {
            const target = controllerMarkerAtAim();
            const element = target && overlayRoot?.querySelector(`[data-ar-marker-id="${CSS.escape(target.marker.id)}"]`);
            if (target && element) {
                beginMarkerInteraction(target, {
                    preventDefault() {},
                    stopPropagation() {},
                    currentTarget: element
                }, { element });
            }
        }
        else if (interactionMode !== 'view') {
            const target = controllerMarkerAtAim();
            if (target) {
                activateControllerTarget(true);
                if (dragState) dragState.pointerId = 'xr-hand';
            }
        }
    }
    if (!pinching && handPinchActive && dragState?.pointerId === 'xr-hand') void finishMarkerDrag();
    handPinchActive = pinching;
}

function drawControllerPointer(view) {
    const viewingPim = interactionMode === 'view' && sessionMarkers.some(record => record.profileExpanded);
    if (creatorInputMode !== 'controller' || (interactionMode === 'view' && !viewingPim) || !latestControllerRay || !controllerPointerRenderer) return;
    const { origin, direction } = latestControllerRay;
    const start = {
        x: origin.x + direction.x * XR_LASER_POINTER_CONFIG.startOffset,
        y: origin.y + direction.y * XR_LASER_POINTER_CONFIG.startOffset,
        z: origin.z + direction.z * XR_LASER_POINTER_CONFIG.startOffset
    };
    const end = controllerPointerEnd();
    if (!end) return;
    drawSpatialTether(gl, controllerPointerRenderer, view, start, end, {
        segments: XR_LASER_POINTER_CONFIG.segments,
        width: XR_LASER_POINTER_CONFIG.width,
        curve: .001,
        lift: .001,
        color: [...XR_LASER_POINTER_CONFIG.color, XR_LASER_POINTER_CONFIG.alpha]
    });
}

function drawControllerPointerContact(view) {
    if (creatorInputMode !== 'controller' || interactionMode === 'view' || !latestControllerRay || !sphereRenderer) return;
    const point = controllerPointerEnd();
    if (!point || !view?.projectionMatrix || !view?.transform?.inverse?.matrix) return;
    // DOM overlay is optional on Quest. Keep the contact point in the XR
    // layer so a shortened laser always ends in a visible, actionable hit.
    drawSpatialSphere(gl, sphereRenderer, view.projectionMatrix, view.transform.inverse.matrix, point, .012, {
        color: [0.35, 1, 0.2],
        alpha: .95,
        emissive: .75
    });
}

function positionControllerPointer(view = latestView) {
    const pointer = overlayRoot?.querySelector('[data-ar-controller-pointer]');
    if (!pointer) return;
    if (creatorInputMode !== 'controller' || interactionMode === 'view' || !latestControllerRay) {
        pointer.hidden = true;
        pointer.classList.remove('is-edge');
        return;
    }
    const point = controllerPointerEnd();
    if (!point) {
        pointer.hidden = true;
        return;
    }
    const projected = projectWorldPoint(view, point);
    const margin = 24;
    const x = projected?.x ?? window.innerWidth / 2;
    const y = projected?.y ?? window.innerHeight / 2;
    const offscreen = !projected
        || x < margin
        || x > window.innerWidth - margin
        || y < margin
        || y > window.innerHeight - margin;
    const clampedX = Math.max(margin, Math.min(window.innerWidth - margin, x));
    const clampedY = Math.max(margin, Math.min(window.innerHeight - margin, y));
    pointer.hidden = false;
    pointer.classList.toggle('is-edge', offscreen);
    pointer.style.transform = `translate(${Math.round(clampedX)}px, ${Math.round(clampedY)}px) translate(-50%, -50%)`;
}

function setInteractionMode(mode) {
    if (dragState) {
        dragState.record.position = dragState.position;
        cleanupDrag();
        positionSessionMarkers();
    }
    clearMarkerHoldGesture();
    if (readyPlacementType) {
        placementArmGeneration += 1;
        readyPlacementType = '';
        readySpecialMarker = null;
        pendingBagRecord = null;
        pendingPlacementAppearance = null;
        pendingPlacementDetails = null;
        updateReadyPlacementControl();
    }
    interactionMode = interactionMode === mode && ['grab', 'select'].includes(mode) ? 'neutral' : mode;
    closeAreaChooser();
    closePlacePicker();
    closeUnplacedBag();
    if (interactionMode !== 'select') closeMarkerContextToolbar();
    updateInteractionControls();
    if (interactionMode === 'view') setPlacementStatus('PLAY mode is on. Tap a Marker to reveal or hide information; hold it for 0.8 seconds to move it.');
    else if (interactionMode === 'grab') setPlacementStatus('EDIT mode is on. Hold a glowing element for 0.8 seconds to move it, then release it.');
    else if (interactionMode === 'select') setPlacementStatus('EDIT mode is on. Tap a placed object to open its edit tools.');
    else setPlacementStatus('Aim dot ready. Hold any placed item to move it, or choose EDIT to edit it.');
}

function closeAreaChooser() {
    const chooser = overlayRoot?.querySelector('[data-ar-area-chooser]');
    if (chooser) {
        chooser.hidden = true;
        chooser.innerHTML = '';
    }
}

async function openArAreaChooser() {
    const chooser = overlayRoot?.querySelector('[data-ar-area-chooser]');
    if (!chooser) return;
    closePlacePicker();
    const operation = captureArOperationContext();
    chooser.hidden = false;
    chooser.innerHTML = '<p>Loading Areas…</p>';
    try {
        const areas = await loadPlacementAreas(operation);
        const namedAreas = areas.filter(area => !isDefaultHomeArea(area));
        chooser.innerHTML = `<div><strong>Choose an Area for this Totem</strong><button type="button" data-ar-close-area aria-label="Close Area chooser">&times;</button></div>
            <p>Totem Markers belong to named Areas. Home remains available for ordinary Plants, Notes and Markers.</p>
            <div class="creator-ar-area-options">${namedAreas.map(area => `<button type="button" data-ar-choose-area="${escapeHtml(area.id)}"><strong>${escapeHtml(area.name)}</strong><small>${escapeHtml(area.type || 'Area')}</small></button>`).join('') || '<p>No named Areas yet.</p>'}</div>
            <button type="button" data-ar-create-area>+ Create Area</button>`;
        chooser.querySelector('[data-ar-close-area]')?.addEventListener('click', closeAreaChooser);
        chooser.querySelector('[data-ar-create-area]')?.addEventListener('click', () => {
            closeAreaChooser();
            void openArAreaCreationForm();
        });
        chooser.querySelectorAll('[data-ar-choose-area]').forEach(button => button.addEventListener('click', async () => {
            const area = namedAreas.find(candidate => candidate.id === button.dataset.arChooseArea);
            if (!area) return;
            button.disabled = true;
            activateArea(area);
            await restoreRecordedMarkers({ ...captureArOperationContext(), areaId: area.id });
            closeAreaChooser();
            await armPlacement('area_checkpoint');
        }));
    } catch (error) {
        chooser.innerHTML = `<div><strong>Areas unavailable</strong><button type="button" data-ar-close-area aria-label="Close Area chooser">&times;</button></div><p>${escapeHtml(error.message)}</p>`;
        chooser.querySelector('[data-ar-close-area]')?.addEventListener('click', closeAreaChooser);
    }
}

function closePlacePicker() {
    specialPickerRequest += 1;
    const picker = overlayRoot?.querySelector('[data-ar-place-picker]');
    if (picker) {
        picker.hidden = true;
        picker.innerHTML = '';
        delete picker.dataset.panel;
    }
    pendingPlacedRecord = null;
}

function closeUnplacedBag() {
    const bag = overlayRoot?.querySelector('[data-ar-unplaced-bag]');
    if (bag) {
        bag.hidden = true;
        bag.innerHTML = '';
    }
}

async function openUnplacedBag() {
    const bag = overlayRoot?.querySelector('[data-ar-unplaced-bag]');
    if (!bag) return;
    closeMarkerContextToolbar();
    closePlacePicker();
    readyPlacementType = '';
    pendingBagRecord = null;
    updateReadyPlacementControl();
    bag.hidden = false;
    bag.innerHTML = '<p>Loading Areas…</p>';
    try {
        await loadPlacementAreas();
        const areas = await loadSitePlaces(activeProjectId, activeSiteId);
        const homeAreas = areas.filter(isDefaultHomeArea);
        // The Web Hub can save an unplaced plant in any Area, not only Home.
        // Previously this was Promise.all(homeAreas.map(async area => { ... }); retain Home as
        // the named compatibility concept while scanning the full Area list.
        // Load every Area here so content created by global search remains
        // placeable after leaving and re-entering AR.
        const groups = await Promise.all(areas.map(async area => {
            const markers = await loadPlaceMarkers(activeProjectId, activeSiteId, area.id).catch(() => []);
            const entries = await Promise.all(markers.map(normalizeSpatialMarker).filter(marker => ['plant', 'note', 'sub_checkpoint'].includes(marker.type)).map(async marker => {
                const anchor = await loadMarkerAnchor(activeProjectId, activeSiteId, area.id, marker.id).catch(() => null);
                return anchor?.type === 'spatial' ? null : { marker, areaId: area.id, areaName: area.name, isHome: isDefaultHomeArea(area) };
            }));
            return entries.filter(Boolean);
        }));
        const items = groups.flat();
        bag.innerHTML = `<div><strong>Unplaced content</strong><button type="button" data-ar-close-bag aria-label="Close unplaced content">&times;</button></div>${items.length ? `<div class="creator-ar-bag-list">${items.map((item, index) => `<button type="button" data-ar-bag-item="${index}">${markerIcon(item.marker.type)} <span><strong>${escapeHtml(item.marker.name)}</strong><small>${readyPlacementLabel(item.marker.type)} · ${escapeHtml(item.isHome ? DEFAULT_HOME_AREA_NAME : item.areaName || 'Area')}</small></span></button>`).join('')}</div>` : '<p>No unplaced content. Save a Plant or Note in Web Hub, then return here to position it.</p>'}`;
        bag.querySelector('[data-ar-close-bag]')?.addEventListener('click', closeUnplacedBag);
        bag.querySelectorAll('[data-ar-bag-item]').forEach(button => button.addEventListener('click', () => {
            const item = items[Number(button.dataset.arBagItem)];
            if (!item) return;
            pendingBagRecord = { ...item, siteId: activeSiteId };
            readyPlacementType = item.marker.type;
            preparePlacementAppearance(item.marker.type, item.marker);
            placementArmedAt = performance.now();
            closeUnplacedBag();
            updateReadyPlacementControl();
            setPlacementStatus(`${item.marker.name} selected from your Bag. Aim the breathing circle, then tap to place it.`);
        }));
    } catch (error) {
        bag.innerHTML = `<div><strong>Unplaced content</strong><button type="button" data-ar-close-bag aria-label="Close unplaced content">&times;</button></div><p>Could not load unplaced content: ${escapeHtml(error.message)}</p>`;
        bag.querySelector('[data-ar-close-bag]')?.addEventListener('click', closeUnplacedBag);
    }
}

function activeTotemRecord() {
    return activeAreaMarkers().find(record => record.marker.type === 'area_checkpoint') || null;
}

function hasSavedSpatialPosition(record) {
    return record?.unplaced !== true
        && record?.position
        && ['x', 'y', 'z'].every(axis => Number.isFinite(Number(record.position[axis])));
}

function pointToActiveTotem() {
    const totem = activeTotemRecord();
    if (!totem) {
        setPlacementStatus(`${activeAreaName || 'This Area'} has no Totem yet. Choose Add Totem.`);
        return;
    }
    locatedTotemRecord = totem;
    totemGuideVisible = true;
    renderSessionMarkers();
    closePlacePicker();
    setPlacementStatus(`A ground pointer now leads to the ${totem.marker.name} Totem.`);
}

function toggleActiveTotemGuide() {
    const totem = activeTotemRecord();
    if (!totem) {
        setPlacementStatus(`${activeAreaName || 'This Area'} has no Totem yet. Choose Add Totem.`);
        return;
    }
    if (totemGuideVisible) {
        totemGuideVisible = false;
        locatedTotemRecord = null;
        setPlacementStatus(`${totem.marker.name} Totem guide hidden.`);
    } else {
        locatedTotemRecord = totem;
        totemGuideVisible = true;
        setPlacementStatus(`A ground guide now leads to the ${totem.marker.name} Totem.`);
    }
    renderSessionMarkers();
    closePlacePicker();
}

function toggleActiveTotemLinkGuide() {
    const totem = activeTotemRecord();
    const links = linkedTotemAreas(totem);
    if (!totem) {
        setPlacementStatus(`${activeAreaName || 'This Area'} has no Totem yet. Choose Place Totem.`);
        return;
    }
    if (!links.length) {
        setPlacementStatus('No linked Area route is saved yet. Open this Totem in Web Mode and enable a link first.');
        return;
    }
    totemLinkGuideVisible = !totemLinkGuideVisible;
    renderSessionMarkers();
    closePlacePicker();
    setPlacementStatus(totemLinkGuideVisible
        ? `Totem link path enabled. Follow the sign to ${links[0].targetAreaName}.`
        : 'Totem link path disabled.');
}

async function startTotemLinkCalibration() {
    const sourceTotem = activeTotemRecord();
    const sourceLink = linkedTotemAreas(sourceTotem)[0];
    if (!sourceTotem || !hasSavedSpatialPosition(sourceTotem)) {
        setPlacementStatus('Place or recenter this Totem before calibrating a link.');
        return false;
    }
    if (!sourceLink) {
        setPlacementStatus('Save a Web Mode link to another Area before calibrating it.');
        return false;
    }
    totemLinkCalibration = {
        sourceAreaId: activeAreaId,
        sourceAreaName: activeAreaName,
        sourceTotemId: sourceTotem.marker.id,
        sourcePosition: { ...sourceTotem.position },
        targetAreaId: sourceLink.targetAreaId,
        targetAreaName: sourceLink.targetAreaName,
        startedAt: new Date().toISOString()
    };
    closePlacePicker();
    setPlacementStatus(`Calibration started from ${activeAreaName || 'this Area'}. Walk to ${sourceLink.targetAreaName}, then capture its Totem.`);
    await transitionToLinkedArea(sourceLink.targetAreaId);
    return true;
}

async function persistTotemLinkCalibration(state, targetTotem, calibration) {
    const areas = await loadSitePlaces(activeProjectId, activeSiteId).catch(() => []);
    const sourceArea = areas.find(area => area.id === state.sourceAreaId);
    const targetArea = areas.find(area => area.id === state.targetAreaId);
    if (!sourceArea || !targetArea) throw new Error('The calibrated Areas could not be loaded.');
    const sourceLinks = Array.isArray(sourceArea.totem_links) ? sourceArea.totem_links : [];
    const targetLinks = Array.isArray(targetArea.totem_links) ? targetArea.totem_links : [];
    const sourceRoute = sourceLinks.find(link => link.target_area_id === state.targetAreaId) || { target_area_id: state.targetAreaId };
    const targetRoute = targetLinks.find(link => link.target_area_id === state.sourceAreaId) || { target_area_id: state.sourceAreaId };
    const reverseCalibration = reverseTotemLinkCalibration(calibration);
    const savedSourceRoute = {
        ...sourceRoute,
        target_area_id: state.targetAreaId,
        distance_m: calibration.distance_m,
        calibration
    };
    const savedTargetRoute = {
        ...targetRoute,
        target_area_id: state.sourceAreaId,
        distance_m: calibration.distance_m,
        calibration: reverseCalibration
    };
    await Promise.all([
        updateSitePlace(activeProjectId, activeSiteId, sourceArea.id, {
            totem_links: [...sourceLinks.filter(link => link.target_area_id !== state.targetAreaId), savedSourceRoute]
        }),
        updateSitePlace(activeProjectId, activeSiteId, targetArea.id, {
            totem_links: [...targetLinks.filter(link => link.target_area_id !== state.sourceAreaId), savedTargetRoute]
        })
    ]);
    runtimeTotemLinkCalibrations.set(totemLinkRuntimeKey(state.sourceAreaId, state.targetAreaId), calibration);
    if (reverseCalibration) runtimeTotemLinkCalibrations.set(totemLinkRuntimeKey(state.targetAreaId, state.sourceAreaId), reverseCalibration);
    const targetAreaLinks = [...targetLinks.filter(link => link.target_area_id !== state.sourceAreaId), savedTargetRoute]
        .map(link => ({
            ...link,
            target_area_name: areas.find(area => area.id === link.target_area_id)?.name || link.target_area_id || 'Linked Area'
        }));
    const currentAreaRecords = activeAreaMarkers();
    currentAreaRecords.forEach(record => { record.areaLinks = targetAreaLinks; });
    return { sourceArea, targetArea, targetTotem };
}

async function captureTotemLinkCalibration() {
    const state = totemLinkCalibration;
    const targetTotem = activeTotemRecord();
    if (!state) {
        setPlacementStatus('Start calibration from a linked Totem first.');
        return false;
    }
    if (activeAreaId !== state.targetAreaId) {
        setPlacementStatus(`Open ${state.targetAreaName} before capturing its Totem.`);
        return false;
    }
    if (!targetTotem || !hasSavedSpatialPosition(targetTotem)) {
        setPlacementStatus(`Place or recenter the ${state.targetAreaName} Totem, then capture it.`);
        return false;
    }
    const calibration = createTotemLinkCalibration(
        { id: state.sourceTotemId, position: state.sourcePosition },
        targetTotem,
        { capturedAt: new Date().toISOString() }
    );
    if (!calibration) {
        setPlacementStatus('The two Totems are too close to create a reliable Area link.');
        return false;
    }
    try {
        setPlacementStatus('Saving calibrated Area link…');
        await persistTotemLinkCalibration(state, targetTotem, calibration);
        totemLinkCalibration = null;
        totemLinkGuideVisible = true;
        renderSessionMarkers();
        setPlacementStatus(`Area link calibrated: ${calibration.distance_m.toFixed(1)} m to ${state.sourceAreaName || 'the linked Area'}.`);
        return true;
    } catch (error) {
        setPlacementStatus(`Calibration measured, but could not be saved: ${error.message}`);
        return false;
    }
}

function cancelTotemLinkCalibration() {
    totemLinkCalibration = null;
    setPlacementStatus('Totem link calibration cancelled.');
    closePlacePicker();
}

function toggleLocationNoteVisibility(record = activeTotemRecord()) {
    const config = locationNoteConfig || normalizedLocationNote();
    if (!config.enabled) {
        setPlacementStatus('The Location Note is unavailable. Enable it in Project Settings first.');
        return;
    }
    const totem = record?.marker?.type === 'area_checkpoint' ? record : activeTotemRecord();
    if (!totem) {
        setPlacementStatus(`${activeAreaName || 'This Area'} has no Totem for the Location Note yet.`);
        return;
    }
    locationNoteVisible = !locationNoteVisible;
    locationNoteAnchor = null;
    if (locationNoteVisible) hiddenStructuralMarkerIds.delete(totem.marker.id);
    updateLocationNote();
    positionLocationNote();
    renderSessionMarkers();
    updateContextToolbar();
    setPlacementStatus(locationNoteVisible
        ? `Location Note shown above the ${totem.marker.name} Totem.`
        : 'Location Note hidden.');
}

async function createTotemFromSpecial() {
    // The first Test AR launch may still be restoring its site and creating
    // the protected Home Area when the user opens Special. Finish that work
    // before deciding where the Totem belongs.
    const operation = captureArOperationContext();
    await loadPlacementAreas(operation);
    if (!isArOperationCurrent(operation, { matchLocation: false })) return;
    const totem = activeTotemRecord();
    if (activeAreaId && totem && !hasSavedSpatialPosition(totem)) {
        void prepareExistingMarkerPlacement(totem.marker.id);
        closePlacePicker();
        return;
    }
    if (activeAreaId && totem) {
        closePlacePicker();
        setPlacementStatus(`${totem.marker.name} is already placed in ${activeAreaName || 'this Area'}. Use Recenter Totem or Point to Totem.`);
        return;
    }
    if (activeAreaId && !totem) {
        // Home is the initial working Area. A Totem can be placed there just
        // like Plants, Notes and ordinary Markers; named Areas are optional.
        closePlacePicker();
        void armPlacement('area_checkpoint');
        return;
    }
    if (!activeAreaId) {
        closePlacePicker();
        setPlacementStatus('Home is not ready yet. Move briefly, then try Add Totem again.');
    }
}

function returnToWebMode() {
    if (contextToolbarRecord) {
        void openContextInWebMode();
        return;
    }
    exitArMode();
}

function renderSpecialMarkerChoices(picker) {
    // Legacy selectors remain documented for stored sessions: data-ar-toggle-location-note.
    // Legacy heading marker: >SYMBOLS<. No symbol controls are rendered now.
    // Legacy description: ARROWS, EXCLAMATION AND QUESTION MARKS.
    // Legacy action wording: Add Totem.
    // Legacy guide wording: 'Hide Totem Guide'.
    // Legacy guide wording: 'Show Totem Guide'.
    // Legacy guide wording: 'View Location Note'.
    const totem = activeTotemRecord();
    const arrows = [
        ['⬇', 'Block arrow down'], ['⬆', 'Block arrow up'], ['↪', 'Curved arrow right'],
        ['➜', 'Rounded arrow right'], ['❯', 'Chevron arrow right'], ['➡', 'Block arrow right'],
        ['⇧', 'Rounded arrow up'], ['⇩', 'Rounded arrow down'], ['〉', 'Outline arrow right']
    ].map(([symbol, label], index) => `<button class="creator-ar-special-totem creator-ar-symbol-marker" type="button" aria-label="${escapeHtml(label)}" data-ar-special-symbol="${escapeHtml(symbol)}" data-ar-special-label="${escapeHtml(label)}" data-ar-arrow-style="${index + 1}"><b aria-hidden="true">${escapeHtml(symbol)}</b><span class="sr-only">${escapeHtml(label)}</span></button>`).join('');
    const alerts = [
        ['!', 'Important'], ['?', 'Question']
    ].map(([symbol, label]) => `<button class="creator-ar-special-totem creator-ar-symbol-marker" type="button" data-ar-special-symbol="${escapeHtml(symbol)}" data-ar-special-label="${escapeHtml(label)}"><b aria-hidden="true">${escapeHtml(symbol)}</b><span><strong>${escapeHtml(label)}</strong></span></button>`).join('');
    const totemPlaced = hasSavedSpatialPosition(totem);
    const hasLinks = linkedTotemAreas(totem).length > 0;
    const calibrationTarget = linkedTotemAreas(totem)[0];
    const calibrationAction = totemLinkCalibration?.targetAreaId === activeAreaId
        ? '<button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-capture-link-target><b aria-hidden="true">&#9673;</b><span><strong>CAPTURE LINK TARGET</strong><small>Save this Area in the calibrated mesh</small></span></button>'
        : totemLinkCalibration
            ? '<button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-cancel-link-calibration><b aria-hidden="true">&#10005;</b><span><strong>CANCEL CALIBRATION</strong><small>Return to normal Totem tools</small></span></button>'
            : `<button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-start-link-calibration ${totemPlaced && hasLinks ? '' : 'disabled'}><b aria-hidden="true">&#8644;</b><span><strong>CALIBRATE LINK</strong><small>${totemPlaced && calibrationTarget ? `Join ${escapeHtml(calibrationTarget.targetAreaName)}` : 'Create a Web Mode link first'}</small></span></button>`;
    const placeTotemAction = !totemPlaced
        ? '<button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-add-totem><b aria-hidden="true">+</b><span><strong>PLACE TOTEM</strong><small>To this Area</small></span></button>'
        : '';
    picker.innerHTML = `<div class="creator-ar-picker-heading"><p>Special</p><button type="button" data-ar-close-special aria-label="Close">&times;</button></div>
        <section class="creator-ar-special-section creator-ar-totem-section"><strong>TOTEM</strong><div class="creator-ar-special-grid">
            <button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-toggle-totem aria-pressed="${totemGuideVisible}" ${totem ? '' : 'disabled'}><b aria-hidden="true">${totemGuideVisible ? '&#9673;' : '&#9675;'}</b><span><strong>POINT TO TOTEM</strong><small>${totem ? (totemGuideVisible ? 'Disable ground pointer' : 'Enable ground pointer') : 'Place a Totem first'}</small></span></button>
            <button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-toggle-totem-links aria-pressed="${totemLinkGuideVisible}" ${hasLinks ? '' : 'disabled'}><b aria-hidden="true">&#8596;</b><span><strong>LINK PATH</strong><small>${hasLinks ? (totemLinkGuideVisible ? 'Disable Area route' : 'Enable Area route') : 'Link Areas in Web Mode'}</small></span></button>
            <button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-recenter-totem ${totemPlaced ? '' : 'disabled'}><b aria-hidden="true">&#8635;</b><span><strong>RECENTER TOTEM</strong><small>${totemPlaced ? 'Aim at its real position' : 'Place the Totem first'}</small></span></button>
            ${calibrationAction}
            ${placeTotemAction}
        </div></section>`;
    picker.querySelector('[data-ar-close-special]').addEventListener('click', closePlacePicker);
    picker.querySelector('[data-ar-toggle-totem]')?.addEventListener('click', () => {
        toggleActiveTotemGuide();
        closePlacePicker();
    });
    picker.querySelector('[data-ar-toggle-totem-links]')?.addEventListener('click', () => {
        toggleActiveTotemLinkGuide();
        closePlacePicker();
    });
    picker.querySelector('[data-ar-recenter-totem]')?.addEventListener('click', () => {
        closePlacePicker();
        void recenterActiveArea();
    });
    picker.querySelector('[data-ar-start-link-calibration]')?.addEventListener('click', () => void startTotemLinkCalibration());
    picker.querySelector('[data-ar-capture-link-target]')?.addEventListener('click', () => void captureTotemLinkCalibration());
    picker.querySelector('[data-ar-cancel-link-calibration]')?.addEventListener('click', cancelTotemLinkCalibration);
    picker.querySelector('[data-ar-add-totem]')?.addEventListener('click', createTotemFromSpecial);
    picker.querySelectorAll('[data-ar-special-symbol]').forEach(button => button.addEventListener('click', () => {
        const specialMarker = {
            name: button.dataset.arSpecialLabel,
            special_symbol: button.dataset.arSpecialSymbol,
            arrow_style: button.dataset.arArrowStyle ? Number(button.dataset.arArrowStyle) : undefined,
            appearance: { color: ['!', '?'].includes(button.dataset.arSpecialSymbol) ? '#eaa45d' : '#75a9cc', size: 'large' }
        };
        readySpecialMarker = specialMarker;
        void armPlacement('sub_checkpoint', specialMarker);
    }));
}

async function openArAreaCreationForm() {
    const picker = overlayRoot?.querySelector('[data-ar-place-picker]');
    if (!picker) return;
    const loadingOperation = captureArOperationContext();
    const areas = await loadPlacementAreas(loadingOperation).catch(() => []);
    if (!isArOperationCurrent(loadingOperation, { matchLocation: false })) return;
    const nextNumber = areas.filter(area => !isDefaultHomeArea(area)).length + 1;
    picker.hidden = false;
    picker.innerHTML = `<div class="creator-ar-picker-heading"><p>Create New Area</p><button type="button" data-ar-close-area-create aria-label="Close">&times;</button></div><form data-ar-create-area-form><label>Area name<input name="areaName" value="Area ${nextNumber}" required /></label><p class="creator-ar-picker-status">Examples: Orchard, Vegetable Garden, Creek Bank.</p><button class="creator-ar-special-totem" type="submit"><b aria-hidden="true">${markerIcon('area_checkpoint')}</b><span><strong>Create &amp; Place Totem</strong><small>The new Area is saved before placement begins.</small></span></button><p data-ar-create-area-status class="creator-ar-picker-status"></p></form>`;
    picker.querySelector('[data-ar-close-area-create]').addEventListener('click', closePlacePicker);
    picker.querySelector('[data-ar-create-area-form]').addEventListener('submit', async event => {
        event.preventDefault();
        const status = picker.querySelector('[data-ar-create-area-status]');
        const name = event.currentTarget.elements.areaName.value.trim();
        if (!name) return;
        const projectId = activeProjectId;
        const siteId = activeSiteId;
        const activeSession = session;
        const activeOverlay = overlayRoot;
        try {
            status.textContent = 'Creating Area…';
            const area = await createAreaRecord(projectId, siteId, { name });
            if (session !== activeSession || overlayRoot !== activeOverlay || !activeOverlay?.isConnected || activeProjectId !== projectId) return;
            activateArea(area);
            closePlacePicker();
            await armPlacement('area_checkpoint');
        } catch (error) {
            status.textContent = `Area could not be created: ${error.message}`;
        }
    });
}

async function openSpecialMarkerPicker() {
    // Legacy terminology retained for migrations: + SPECIAL, data-ar-toggle-location-note,
    // ARROWS, EXCLAMATION AND QUESTION MARKS. The active picker now exposes only
    // PLACE TOTEM, POINT TO TOTEM and CALIBRATE LINK.
    if (questHeadsetSession) {
        if (questSpecialPaletteVisible) {
            closeQuestSpecialPalette();
            setPlacementStatus('Special palette closed.');
            updateControllerHud();
            return;
        }
        placementArmGeneration += 1;
        closeMarkerContextToolbar();
        closePlacePicker();
        closeUnplacedBag();
        readyPlacementType = '';
        readySpecialMarker = null;
        pendingPlacementAppearance = null;
        pendingPlacementDetails = null;
        questSpecialPaletteVisible = true;
        questSpecialPaletteLayout = questSpatialPaletteLayout(questBeltViewerMatrix || latestViewerMatrix, visibleQuestSpecialPaletteActions(), {
            distance: .82,
            side: 1,
            sideOffset: .43,
            columnSpacing: .13,
            rowSpacing: .115,
            topOffset: .06,
            radius: .064
        });
        questSpecialPaletteHoverIndex = -1;
        updateReadyPlacementControl();
        controllerMenuActive = true;
        setPlacementStatus('Totem tools open on your right. Choose Place Totem or Point to Totem.');
        updateControllerHud();
        return;
    }
    const picker = overlayRoot?.querySelector('[data-ar-place-picker]');
    if (!picker) return;
    if (!picker.hidden && picker.dataset.panel?.startsWith('special:')) {
        closePlacePicker();
        return;
    }
    const requestId = ++specialPickerRequest;
    const panelId = `special:${requestId}`;
    placementArmGeneration += 1;
    closeMarkerContextToolbar();
    closeUnplacedBag();
    readyPlacementType = '';
    pendingPlacementAppearance = null;
    pendingPlacementDetails = null;
    updateReadyPlacementControl();
    picker.hidden = false;
    picker.dataset.panel = panelId;
    renderSpecialMarkerChoices(picker);
}

function resetArControls() {
    placementArmGeneration += 1;
    cleanupDrag();
    interactionMode = 'neutral';
    suspendedInteractionMode = '';
    closeMarkerContextToolbar();
    closeAreaChooser();
    closePlacePicker();
    closeQuestSpecialPalette();
    closeQuestSpatialWebPanel();
    closeUnplacedBag();
    readyPlacementType = '';
    pendingBagRecord = null;
    pendingPlacementAppearance = null;
    pendingPlacementDetails = null;
    updateReadyPlacementControl();
    updateInteractionControls();
    setPlacementStatus('AR controls reset. The aim dot is ready; press plus when you want to place a Marker.');
}

function multiplyMatrixVector(matrix, vector) {
    return [0, 1, 2, 3].map(row => matrix[row] * vector[0] + matrix[row + 4] * vector[1] + matrix[row + 8] * vector[2] + matrix[row + 12] * vector[3]);
}

function projectWorldPoint(view, point) {
    const inverse = view?.transform?.inverse?.matrix;
    if (!inverse || !view.projectionMatrix) return null;
    const eye = multiplyMatrixVector(inverse, [point.x, point.y, point.z, 1]);
    const clip = multiplyMatrixVector(view.projectionMatrix, eye);
    if (!Number.isFinite(clip[3]) || clip[3] <= 0) return null;
    return {
        x: (clip[0] / clip[3] * .5 + .5) * window.innerWidth,
        y: (-clip[1] / clip[3] * .5 + .5) * window.innerHeight
    };
}

function ensureLocationNoteAnchor() {
    if (!locationNoteVisible) return null;
    const totem = activeTotemRecord();
    if (!totem) {
        locationNoteAnchor = null;
        return null;
    }
    const grounded = groundedTotemPosition(totem.position);
    const [, halfHeight] = markerDimensions(totem.marker);
    const attachmentY = grounded.y + halfHeight * 2;
    locationNoteAnchor = {
        x: grounded.x,
        y: attachmentY + 1.15,
        z: grounded.z,
        attachmentY
    };
    return locationNoteAnchor;
}

function positionLocationNote(view = latestView) {
    const note = overlayRoot?.querySelector('[data-ar-location-note]');
    if (!note || note.dataset.locationNoteEnabled === 'false' || !locationNoteVisible) {
        if (note) note.hidden = true;
        return;
    }
    const anchor = ensureLocationNoteAnchor();
    if (!anchor) {
        note.hidden = true;
        return;
    }
    const boardPoint = projectWorldPoint(view, anchor);
    const attachmentPoint = projectWorldPoint(view, { x: anchor.x, y: anchor.attachmentY, z: anchor.z });
    if (!boardPoint || !attachmentPoint) {
        note.hidden = true;
        return;
    }
    const marginX = Math.min(window.innerWidth * .45, 390);
    const marginY = Math.min(window.innerHeight * .25, 180);
    const visible = boardPoint.x > -marginX
        && boardPoint.x < window.innerWidth + marginX
        && boardPoint.y > -marginY
        && boardPoint.y < window.innerHeight + marginY;
    note.hidden = !visible;
    if (!visible) return;
    const boardHalfHeight = Math.min(78, Math.max(58, window.innerHeight * .075));
    const stickStart = { x: boardPoint.x, y: boardPoint.y + boardHalfHeight };
    const dx = attachmentPoint.x - stickStart.x;
    const dy = attachmentPoint.y - stickStart.y;
    note.style.setProperty('--location-note-x', `${boardPoint.x.toFixed(1)}px`);
    note.style.setProperty('--location-note-y', `${boardPoint.y.toFixed(1)}px`);
    note.style.setProperty('--location-stick-x', `${stickStart.x.toFixed(1)}px`);
    note.style.setProperty('--location-stick-y', `${stickStart.y.toFixed(1)}px`);
    note.style.setProperty('--location-stick-length', `${Math.max(24, Math.hypot(dx, dy)).toFixed(1)}px`);
    note.style.setProperty('--location-stick-angle', `${(Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2)}deg`);
    note.style.setProperty('--location-ground-x', `${attachmentPoint.x.toFixed(1)}px`);
    note.style.setProperty('--location-ground-y', `${attachmentPoint.y.toFixed(1)}px`);
}

function multiplyMatrices(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
        out[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
    }
    return out;
}

function markerBillboardMatrix(position, scaleX = .045, scaleY = scaleX) {
    const camera = latestViewerMatrix || new Float32Array(16);
    let x = camera[12] - position.x;
    let z = camera[14] - position.z;
    const length = Math.hypot(x, z) || 1;
    x /= length; z /= length;
    return new Float32Array([z * scaleX, 0, -x * scaleX, 0, 0, scaleY, 0, 0, x, 0, z, 0, position.x, position.y, position.z, 1]);
}

function questBeltPanelMatrix(button, scaleX = .078, scaleY = .068) {
    const camera = questBeltViewerMatrix || latestViewerMatrix || new Float32Array(16);
    let x = camera[12] - button.position.x;
    let z = camera[14] - button.position.z;
    const length = Math.hypot(x, z) || 1;
    x /= length;
    z /= length;
    const right = { x: z, z: -x };
    const towardCamera = { x, z };
    const yaw = Number(button.yaw) || 0;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const panelRight = {
        x: right.x * cos + towardCamera.x * sin,
        z: right.z * cos + towardCamera.z * sin
    };
    const panelFront = {
        x: -right.x * sin + towardCamera.x * cos,
        z: -right.z * sin + towardCamera.z * cos
    };
    const faceUp = Math.max(0, Math.min(.94, Number(button.faceUp) || 0));
    if (faceUp > 0) {
        const towardWeight = Math.sqrt(1 - faceUp * faceUp);
        const normal = {
            x: panelFront.x * towardWeight,
            y: faceUp,
            z: panelFront.z * towardWeight
        };
        // Cross(normal, right) gives the plane's texture-up direction. Its
        // top edge rises and moves away from the user like the Quest Link tray.
        const panelUp = {
            x: normal.y * panelRight.z,
            y: normal.z * panelRight.x - normal.x * panelRight.z,
            z: -normal.y * panelRight.x
        };
        return new Float32Array([
            panelRight.x * scaleX, 0, panelRight.z * scaleX, 0,
            panelUp.x * scaleY, panelUp.y * scaleY, panelUp.z * scaleY, 0,
            normal.x, normal.y, normal.z, 0,
            button.position.x, button.position.y, button.position.z, 1
        ]);
    }
    return new Float32Array([
        panelRight.x * scaleX, 0, panelRight.z * scaleX, 0,
        0, scaleY, 0, 0,
        panelFront.x, 0, panelFront.z, 0,
        button.position.x, button.position.y, button.position.z, 1
    ]);
}

function controllerQuestBeltSurfaceHit() {
    if (!latestControllerRay) return null;
    return currentQuestBeltLayout().map(button => {
        const matrix = questBeltPanelMatrix(button, .082, .058);
        const rightLength = Math.hypot(matrix[0], matrix[1], matrix[2]) || 1;
        const upLength = Math.hypot(matrix[4], matrix[5], matrix[6]) || 1;
        const right = { x: matrix[0] / rightLength, y: matrix[1] / rightLength, z: matrix[2] / rightLength };
        const up = { x: matrix[4] / upLength, y: matrix[5] / upLength, z: matrix[6] / upLength };
        const normal = { x: matrix[8], y: matrix[9], z: matrix[10] };
        const centerOffset = {
            x: matrix[12] - latestControllerRay.origin.x,
            y: matrix[13] - latestControllerRay.origin.y,
            z: matrix[14] - latestControllerRay.origin.z
        };
        const denominator = latestControllerRay.direction.x * normal.x
            + latestControllerRay.direction.y * normal.y
            + latestControllerRay.direction.z * normal.z;
        if (Math.abs(denominator) < .0001) return null;
        const distance = (centerOffset.x * normal.x + centerOffset.y * normal.y + centerOffset.z * normal.z) / denominator;
        if (distance <= 0) return null;
        const position = {
            x: latestControllerRay.origin.x + latestControllerRay.direction.x * distance,
            y: latestControllerRay.origin.y + latestControllerRay.direction.y * distance,
            z: latestControllerRay.origin.z + latestControllerRay.direction.z * distance
        };
        const local = {
            x: position.x - matrix[12],
            y: position.y - matrix[13],
            z: position.z - matrix[14]
        };
        const horizontal = local.x * right.x + local.y * right.y + local.z * right.z;
        const vertical = local.x * up.x + local.y * up.y + local.z * up.z;
        if (Math.abs(horizontal) > rightLength || Math.abs(vertical) > upLength) return null;
        return { button, position, distance };
    }).filter(Boolean).sort((left, right) => left.distance - right.distance)[0] || null;
}

function createHomeSignTexture(title, word) {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 1024;
    textureCanvas.height = 384;
    const context = textureCanvas.getContext('2d');
    if (!context) return null;
    const projectTitle = String(title || 'NourishlandXR').trim().toLocaleUpperCase();
    const areaWord = String(word || 'HOME').trim().toLocaleUpperCase();
    context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.strokeStyle = 'rgba(3, 13, 8, .86)';
    context.fillStyle = 'rgba(237, 249, 235, .96)';
    context.font = '700 42px system-ui, sans-serif';
    context.lineWidth = 12;
    context.strokeText(projectTitle, 512, 96, 850);
    context.fillText(projectTitle, 512, 96, 850);
    // Giant area word, sized to fit long Area names.
    let wordSize = 164;
    context.font = `850 ${wordSize}px system-ui, sans-serif`;
    while (context.measureText(areaWord).width > 940 && wordSize > 60) {
        wordSize -= 8;
        context.font = `850 ${wordSize}px system-ui, sans-serif`;
    }
    context.lineWidth = Math.max(10, Math.round(wordSize * 0.12));
    context.strokeText(areaWord, 512, 242, 950);
    context.fillText(areaWord, 512, 242, 950);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
    return texture;
}

function ensureHomeSignTexture() {
    const title = String(activeProjectName || activeProjectId || 'NourishlandXR').trim();
    const word = String(activeAreaName || DEFAULT_HOME_AREA_NAME).trim();
    const cacheKey = word + '\u0000' + title;
    if (homeSignTexture && homeSignTextureTitle === cacheKey) return homeSignTexture;
    if (homeSignTexture) gl.deleteTexture(homeSignTexture);
    homeSignTexture = createHomeSignTexture(title, word);
    homeSignTextureTitle = cacheKey;
    // Re-anchor the sign when switching area/home.
    homeSignAnchor = null;
    return homeSignTexture;
}

function homeSignAnchorFromViewer() {
    if (!latestViewerMatrix) return null;
    const forwardX = -latestViewerMatrix[8];
    const forwardZ = -latestViewerMatrix[10];
    const horizontalLength = Math.hypot(forwardX, forwardZ) || 1;
    const distance = 2.8;
    return {
        x: latestViewerMatrix[12] + forwardX / horizontalLength * distance,
        y: currentGroundY() + 2.45,
        z: latestViewerMatrix[14] + forwardZ / horizontalLength * distance
    };
}

function setupHomeSignRenderer() {
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex, 'attribute vec2 p;uniform mat4 mvp;uniform float pimTexture;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,pimTexture>.5?.5-p.y*.5:p.y*.5+.5);gl_Position=mvp*vec4(p,0.,1.);}');
    gl.compileShader(vertex);
    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment, 'precision mediump float;varying vec2 uv;uniform sampler2D artwork;void main(){vec4 pixel=texture2D(artwork,uv);if(pixel.a<.04)discard;gl_FragColor=pixel;}');
    gl.compileShader(fragment);
    homeSignProgram = gl.createProgram();
    gl.attachShader(homeSignProgram, vertex);
    gl.attachShader(homeSignProgram, fragment);
    gl.linkProgram(homeSignProgram);
    homeSignBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, homeSignBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, 1,1, -1,-1, 1,1, -1,1]), gl.STATIC_DRAW);
}

function drawSpatialHomeSign(view) {
    if (!homeSignProgram || !homeSignBuffer || !ensureHomeSignTexture()) return;
    homeSignAnchor ||= homeSignAnchorFromViewer();
    if (!homeSignAnchor) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(homeSignProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, homeSignBuffer);
    const positionLocation = gl.getAttribLocation(homeSignProgram, 'p');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    const model = markerBillboardMatrix(homeSignAnchor, 1.15, .43);
    const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
    gl.uniformMatrix4fv(gl.getUniformLocation(homeSignProgram, 'mvp'), false, mvp);
    gl.uniform1f(gl.getUniformLocation(homeSignProgram, 'pimTexture'), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, homeSignTexture);
    gl.uniform1i(gl.getUniformLocation(homeSignProgram, 'artwork'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawWrappedCanvasText(context, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach(word => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    });
    if (line) lines.push(line);
    const visibleLines = lines.slice(0, maxLines);
    if (lines.length > maxLines && visibleLines.length) {
        let last = visibleLines.at(-1);
        while (last && context.measureText(`${last}...`).width > maxWidth) last = last.slice(0, -1).trimEnd();
        visibleLines[visibleLines.length - 1] = `${last}...`;
    }
    visibleLines.forEach((value, index) => context.fillText(value, x, y + index * lineHeight, maxWidth));
}

function createQuestNoteTexture(marker) {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 1024;
    textureCanvas.height = 384;
    const context = textureCanvas.getContext('2d');
    if (!context) return null;
    const opacity = markerAppearanceOpacity(marker);
    context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
    roundedCanvasRectangle(context, 12, 12, 1000, 360, 58);
    context.fillStyle = markerAppearanceColor(marker);
    context.globalAlpha = opacity;
    context.fill();
    context.lineWidth = markerNoteSurface(marker) === 'outline' ? 9 : 3;
    context.strokeStyle = 'rgba(239, 255, 235, .88)';
    context.stroke();
    const title = String(marker?.name || 'Note').trim();
    const information = String(marker?.description || marker?.notes || '').trim();
    context.fillStyle = '#ffffff';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.font = '800 54px system-ui, sans-serif';
    drawWrappedCanvasText(context, title, 68, 58, 888, 62, 2);
    context.fillStyle = 'rgba(255, 255, 255, .92)';
    context.font = '500 34px system-ui, sans-serif';
    drawWrappedCanvasText(context, information, 68, 192, 888, 43, 3);
    context.globalAlpha = 1;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
    return texture;
}

function ensureQuestNoteTexture(marker) {
    const key = JSON.stringify([
        marker?.name || '',
        marker?.description || '',
        marker?.notes || '',
        markerAppearanceColor(marker),
        markerAppearanceOpacity(marker),
        markerNoteSurface(marker)
    ]);
    const cached = questNoteTextures.get(marker.id);
    if (cached?.key === key) return cached.texture;
    if (cached?.texture) gl.deleteTexture(cached.texture);
    const texture = createQuestNoteTexture(marker);
    if (texture) questNoteTextures.set(marker.id, { key, texture });
    return texture;
}

function drawQuestSpatialNote(view, record) {
    if (!questBeltUsesSpatialRenderer() || !homeSignProgram || !homeSignBuffer) return;
    const texture = ensureQuestNoteTexture(record.marker);
    if (!texture) return;
    const [halfWidth, halfHeight] = markerDimensions(record.marker);
    gl.useProgram(homeSignProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, homeSignBuffer);
    const positionLocation = gl.getAttribLocation(homeSignProgram, 'p');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(gl.getUniformLocation(homeSignProgram, 'pimTexture'), 0);
    const model = markerBillboardMatrix(record.position, halfWidth, halfHeight);
    const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
    gl.uniformMatrix4fv(gl.getUniformLocation(homeSignProgram, 'mvp'), false, mvp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(homeSignProgram, 'artwork'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function invalidateSpatialPimTexture(record) {
    if (!record?.marker?.id) return;
    const cached = spatialPimTextures.get(record.marker.id);
    if (cached?.texture) gl?.deleteTexture(cached.texture);
    spatialPimTextures.delete(record.marker.id);
}

function ensureSpatialPimPose(record, force = false) {
    if (!record || !latestViewerMatrix) return null;
    if (!record.pimSpatialPose && !force && record.pimStoredPose) {
        record.pimSpatialPose = pimSpatialPoseFromStored(record.pimStoredPose, record.position);
    }
    if (!record.pimSpatialPose || force) {
        record.pimSpatialPose = pimSpatialPoseAboveAnchor(latestViewerMatrix, record.position, {
            plantId: record.marker.plantId || record.marker.id,
            anchorId: record.marker.id,
            coordinateSpace: 'session-local'
        });
    }
    return record.pimSpatialPose;
}

function spatialPimSurfaceSize(record) {
    const size = pimHoneycombTextureSize(creatorPlantKnowledge(record), creatorPimExpandedNodeIds(record), {
        ...CREATOR_SPATIAL_PIM_LAYOUT_OPTIONS,
        width: PIM_TEXTURE_SIZE.width,
        height: PIM_TEXTURE_SIZE.height
    });
    return {
        ...size,
        panelWidth: PIM_SPATIAL_CONFIG.expandedSurfaceWidthMetres * size.width / PIM_TEXTURE_SIZE.width,
        panelHeight: PIM_SPATIAL_CONFIG.expandedSurfaceHeightMetres * size.height / PIM_TEXTURE_SIZE.height
    };
}

function pimPoseAnchorPayload(record) {
    if (!record?.pimSpatialPose) return record?.pimStoredPose || null;
    const markerPosition = record.position || { x: 0, y: 0, z: 0 };
    return {
        position: {
            x: roundCoordinate(record.pimSpatialPose.position.x - markerPosition.x),
            y: roundCoordinate(record.pimSpatialPose.position.y - markerPosition.y),
            z: roundCoordinate(record.pimSpatialPose.position.z - markerPosition.z)
        },
        rotation: record.pimSpatialPose.rotation,
        scale: record.pimSpatialPose.scale,
        plant_id: record.pimSpatialPose.plantId,
        anchor_id: record.marker.id,
        coordinate_space: 'marker-local'
    };
}

function spatialAnchorForRecord(record, context = null) {
    const anchor = spatialAnchor(record.position, context, record.rotationDegrees);
    const pimPose = pimPoseAnchorPayload(record);
    return pimPose ? { ...anchor, pim_pose: pimPose } : anchor;
}

function ensureSpatialPimTexture(record) {
    if (!gl || !record?.profileExpanded) return null;
    const knowledge = creatorPlantKnowledge(record);
    const elapsed = record.pimBloomStarted ? performance.now() - record.pimBloomStarted : PIM_BLOOM_DURATION_MS;
    const bloomProgress = Math.max(0, Math.min(1, elapsed / PIM_BLOOM_DURATION_MS));
    if (bloomProgress >= 1) record.pimBloomStarted = 0;
    const hoverPath = spatialPimHover.recordId === record.marker.id ? spatialPimHover.path : '';
    const animationFrame = bloomProgress < 1 ? Math.round(bloomProgress * 12) : 12;
    const key = JSON.stringify([creatorPimExpandedNodeIds(record), record.pimSelectedNodeId || '', hoverPath, animationFrame, knowledge.categories]);
    const cached = spatialPimTextures.get(record.marker.id);
    if (cached?.key === key) return cached.texture;
    if (cached?.texture) gl.deleteTexture(cached.texture);
    const size = spatialPimSurfaceSize(record);
    const texture = createPlantInformationHoneycombTexture(gl, knowledge, creatorPimExpandedNodeIds(record), {
        ...CREATOR_SPATIAL_PIM_LAYOUT_OPTIONS,
        width: size.width,
        height: size.height,
        layoutWidth: size.layoutWidth,
        layoutHeight: size.layoutHeight,
        hoverPath,
        selectedNodeId: record.pimSelectedNodeId,
        bloomProgress
    });
    if (texture) spatialPimTextures.set(record.marker.id, { key, texture });
    return texture;
}

function spatialPimTargetAtAim({ updateHover = true } = {}) {
    if (!questBeltUsesSpatialRenderer() || !latestControllerRay) return null;
    const candidate = renderableAreaMarkers()
        .filter(record => record.marker.type === 'plant' && record.profileExpanded)
        .map(record => {
            const pose = ensureSpatialPimPose(record);
            const size = spatialPimSurfaceSize(record);
            const panel = pimSpatialPanel(pose, {
                width: size.panelWidth,
                height: size.panelHeight,
                viewerPosition: latestViewerMatrix && { x: latestViewerMatrix[12], y: latestViewerMatrix[13], z: latestViewerMatrix[14] }
            });
            const hit = spatialDashboardRayHit(latestControllerRay, panel, size);
            if (!hit) return null;
            const bloomProgress = record.pimBloomStarted
                ? Math.max(0, Math.min(1, (performance.now() - record.pimBloomStarted) / PIM_BLOOM_DURATION_MS))
                : 1;
            const target = pimHoneycombTargetAtPercent(
                creatorPlantKnowledge(record),
                creatorPimExpandedNodeIds(record),
                hit.u * 100,
                hit.v * 100,
                {
                    ...CREATOR_SPATIAL_PIM_LAYOUT_OPTIONS,
                    layoutWidth: size.layoutWidth,
                    layoutHeight: size.layoutHeight,
                    bloomProgress,
                    selectedNodeId: record.pimSelectedNodeId
                }
            );
            return target ? { record, target, hit, panel } : null;
        })
        .filter(Boolean)
        .sort((left, right) => left.hit.distance - right.hit.distance)[0] || null;
    if (updateHover) {
        const next = {
            recordId: candidate?.record?.marker?.id || '',
            path: candidate?.target?.path || ''
        };
        if (next.recordId !== spatialPimHover.recordId || next.path !== spatialPimHover.path) {
            const previous = sessionMarkers.find(record => record.marker.id === spatialPimHover.recordId);
            if (previous) invalidateSpatialPimTexture(previous);
            spatialPimHover = next;
            if (candidate?.record) invalidateSpatialPimTexture(candidate.record);
        }
    }
    return candidate;
}

function activateSpatialPimTarget(candidate = spatialPimTargetAtAim({ updateHover: false })) {
    if (!candidate) return false;
    const { record, target } = candidate;
    if (target.pimCore) {
        setCreatorPimState(record, pimResetInteractionState(creatorPimState(record)));
        record.pimBloomStarted = 0;
        invalidateSpatialPimTexture(record);
        renderSessionMarkers();
        setPlacementStatus('Plant flower reset.');
        return true;
    }
    if (target.pimBack) {
        toggleCreatorPimNode(record, target.path);
        record.pimBloomStarted = performance.now();
        invalidateSpatialPimTexture(record);
        renderSessionMarkers();
        setPlacementStatus('Returned to the previous PIM honeycomb.');
        return true;
    }
    const children = pimNodeChildren(target);
    if (!children.length) {
        setCreatorPimState(record, pimToggleNodeState(creatorPlantKnowledge(record), creatorPimState(record), target.path));
        invalidateSpatialPimTexture(record);
        renderSessionMarkers();
        setPlacementStatus(`${target.label}: ${target.value || 'Information cell'}`);
        return true;
    }
    const wasOpen = creatorPimState(record).expandedNodeIds.has(target.path);
    toggleCreatorPimNode(record, target.path);
    record.pimBloomStarted = performance.now();
    invalidateSpatialPimTexture(record);
    renderSessionMarkers();
    setPlacementStatus(wasOpen ? `${target.label} remains open.` : `${target.label} opened outward.`);
    return true;
}

function drawSpatialPlantProfiles(view) {
    if (!usesSpatialPimRenderer() || !homeSignProgram || !homeSignBuffer) return;
    const records = renderableAreaMarkers().filter(record => record.marker.type === 'plant' && record.profileExpanded);
    if (!records.length) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.useProgram(homeSignProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, homeSignBuffer);
    const positionLocation = gl.getAttribLocation(homeSignProgram, 'p');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(homeSignProgram, 'artwork'), 0);
    gl.uniform1f(gl.getUniformLocation(homeSignProgram, 'pimTexture'), 1);
    records.forEach(record => {
        const size = spatialPimSurfaceSize(record);
        const panel = pimSpatialPanel(ensureSpatialPimPose(record), {
            width: size.panelWidth,
            height: size.panelHeight,
            viewerPosition: latestViewerMatrix && { x: latestViewerMatrix[12], y: latestViewerMatrix[13], z: latestViewerMatrix[14] }
        });
        const texture = ensureSpatialPimTexture(record);
        const model = spatialDashboardPanelMatrix(panel);
        if (!texture || !model) return;
        const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(homeSignProgram, 'mvp'), false, mvp);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    gl.depthMask(true);
}

function questBeltActiveIndex() {
    if (questBeltHoverIndex >= 0) return questBeltHoverIndex;
    if (controllerMenuActive) return Math.max(0, Math.min(QUEST_SPATIAL_BELT_ACTIONS.length - 1, controllerActionIndex));
    return -1;
}

function roundedCanvasRectangle(context, x, y, width, height, radius) {
    const corner = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + corner, y);
    context.lineTo(x + width - corner, y);
    context.quadraticCurveTo(x + width, y, x + width, y + corner);
    context.lineTo(x + width, y + height - corner);
    context.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
    context.lineTo(x + corner, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - corner);
    context.lineTo(x, y + corner);
    context.quadraticCurveTo(x, y, x + corner, y);
    context.closePath();
}

function connectedCanvasRectangle(context, x, y, width, height, index, total) {
    const first = index === 0;
    const last = index === total - 1;
    const topLeft = first ? 20 : 2;
    const bottomLeft = first ? 20 : 2;
    const topRight = last ? 20 : 2;
    const bottomRight = last ? 20 : 2;
    context.beginPath();
    context.moveTo(x + topLeft, y);
    context.lineTo(x + width - topRight, y);
    context.quadraticCurveTo(x + width, y, x + width, y + topRight);
    context.lineTo(x + width, y + height - bottomRight);
    context.quadraticCurveTo(x + width, y + height, x + width - bottomRight, y + height);
    context.lineTo(x + bottomLeft, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - bottomLeft);
    context.lineTo(x, y + topLeft);
    context.quadraticCurveTo(x, y, x + topLeft, y);
    context.closePath();
}

function createQuestBeltPanelTexture(action, selected, options = {}) {
    const joined = options.joined === true;
    const index = Number(options.index) || 0;
    const total = Number(options.total) || 1;
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 256;
    textureCanvas.height = joined ? 184 : 220;
    const context = textureCanvas.getContext('2d');
    if (!context) return null;
    context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
    if (joined) {
        connectedCanvasRectangle(context, 0, 2, 256, 180, index, total);
        const trayGradient = context.createLinearGradient(0, 2, 0, 182);
        trayGradient.addColorStop(0, selected ? action.color : '#484d4d');
        trayGradient.addColorStop(1, selected ? '#263c2f' : '#262b2c');
        context.fillStyle = trayGradient;
        context.fill();
        context.lineWidth = selected ? 5 : 2;
        context.strokeStyle = selected ? 'rgba(229, 255, 191, .96)' : 'rgba(255, 255, 255, .22)';
        context.stroke();
        if (index > 0) {
            context.beginPath();
            context.moveTo(1, 18);
            context.lineTo(1, 166);
            context.strokeStyle = 'rgba(255, 255, 255, .18)';
            context.lineWidth = 3;
            context.stroke();
        }
        context.beginPath();
        context.moveTo(index === 0 ? 22 : 10, 13);
        context.lineTo(index === total - 1 ? 234 : 246, 13);
        context.strokeStyle = 'rgba(255, 255, 255, .13)';
        context.lineWidth = 2;
        context.stroke();
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = selected ? '#f1ffd0' : 'rgba(250, 252, 250, .92)';
        context.font = '800 58px system-ui, sans-serif';
        context.fillText(action.symbol, 128, 70);
        context.font = '800 19px system-ui, sans-serif';
        context.letterSpacing = '1.2px';
        context.fillText(action.label, 128, 137);
    } else {
        context.save();
        context.shadowColor = 'rgba(0, 0, 0, .58)';
        context.shadowBlur = 12;
        roundedCanvasRectangle(context, 14, 20, 228, 186, 12);
        context.fillStyle = 'rgba(8, 13, 15, .98)';
        context.fill();
        context.shadowBlur = 0;
        roundedCanvasRectangle(context, 12, 12, 228, 186, 12);
        const frontGradient = context.createLinearGradient(12, 12, 12, 198);
        frontGradient.addColorStop(0, selected ? action.color : 'rgba(68, 76, 78, .98)');
        frontGradient.addColorStop(1, selected ? 'rgba(33, 55, 40, .98)' : 'rgba(31, 38, 40, .98)');
        context.fillStyle = frontGradient;
        context.fill();
        context.lineWidth = selected ? 5 : 3;
        context.strokeStyle = selected ? 'rgba(232, 249, 190, .96)' : 'rgba(232, 240, 236, .42)';
        context.stroke();
        context.restore();
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = selected ? '#f4ffd4' : 'rgba(245, 250, 245, .9)';
        context.font = '800 62px system-ui, sans-serif';
        context.fillText(action.symbol, 128, 82);
        context.font = '800 21px system-ui, sans-serif';
        context.letterSpacing = '1.5px';
        context.fillText(action.label, 128, 164);
    }
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
    return texture;
}

function ensureQuestBeltTextures() {
    const key = `${questBeltActiveIndex()}:${interactionMode}`;
    if (questBeltTextures.length === QUEST_SPATIAL_BELT_ACTIONS.length && questBeltTextureKey === key) return questBeltTextures;
    questBeltTextures.forEach(texture => texture && gl.deleteTexture(texture));
    const activeIndex = questBeltActiveIndex();
    questBeltTextures = QUEST_SPATIAL_BELT_ACTIONS.map((action, index) => createQuestBeltPanelTexture(action, index === activeIndex, {
        joined: true,
        index,
        total: QUEST_SPATIAL_BELT_ACTIONS.length
    }));
    questBeltTextureKey = key;
    return questBeltTextures;
}

function ensureQuestSpecialPaletteTextures() {
    const key = String(questSpecialPaletteHoverIndex);
    const actions = visibleQuestSpecialPaletteActions();
    if (questSpecialPaletteTextures.length === actions.length && questSpecialPaletteTextureKey === key) return questSpecialPaletteTextures;
    questSpecialPaletteTextures.forEach(texture => texture && gl.deleteTexture(texture));
    questSpecialPaletteTextures = actions.map((action, index) => createQuestBeltPanelTexture(action, index === questSpecialPaletteHoverIndex));
    questSpecialPaletteTextureKey = key;
    return questSpecialPaletteTextures;
}

function drawQuestSpatialBelt(view) {
    if (!questBeltUsesSpatialRenderer() || !homeSignProgram || !homeSignBuffer) {
        document.body.classList.remove('creator-ar-spatial-belt-ready');
        return;
    }
    const layout = currentQuestBeltLayout();
    const textures = layout.length === QUEST_SPATIAL_BELT_ACTIONS.length && ensureQuestBeltTextures();
    if (!textures?.length || textures.some(texture => !texture)) {
        document.body.classList.remove('creator-ar-spatial-belt-ready');
        return;
    }
    document.body.classList.add('creator-ar-spatial-belt-ready');
    document.body.classList.remove('creator-ar-quest-pending');
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.useProgram(homeSignProgram);
    gl.uniform1f(gl.getUniformLocation(homeSignProgram, 'pimTexture'), 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, homeSignBuffer);
    const positionLocation = gl.getAttribLocation(homeSignProgram, 'p');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(homeSignProgram, 'artwork'), 0);
    layout.forEach((button, index) => {
        const model = questBeltPanelMatrix(button, .082, .058);
        const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(homeSignProgram, 'mvp'), false, mvp);
        gl.bindTexture(gl.TEXTURE_2D, textures[index]);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    gl.depthMask(true);
}

function drawQuestSpatialSpecialPalette(view) {
    if (!questBeltUsesSpatialRenderer() || !questSpecialPaletteVisible || !homeSignProgram || !homeSignBuffer) return;
    const layout = currentQuestSpecialPaletteLayout();
    const textures = layout.length === visibleQuestSpecialPaletteActions().length && ensureQuestSpecialPaletteTextures();
    if (!textures?.length || textures.some(texture => !texture)) return;
    document.body.classList.add('creator-ar-spatial-special-palette');
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.useProgram(homeSignProgram);
    gl.uniform1f(gl.getUniformLocation(homeSignProgram, 'pimTexture'), 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, homeSignBuffer);
    const positionLocation = gl.getAttribLocation(homeSignProgram, 'p');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(homeSignProgram, 'artwork'), 0);
    layout.forEach((button, index) => {
        const model = questBeltPanelMatrix(button, .064, .056);
        const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(homeSignProgram, 'mvp'), false, mvp);
        gl.bindTexture(gl.TEXTURE_2D, textures[index]);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    gl.depthMask(true);
}

function drawQuestSpatialWebPanel(view) {
    if (!questBeltUsesSpatialRenderer() || !questSpatialWebVisible || !questSpatialDashboardMirror?.texture || !questSpatialDashboardPanel || !homeSignProgram || !homeSignBuffer) return;
    document.body.classList.add('creator-ar-spatial-web-ready');
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);
    gl.useProgram(homeSignProgram);
    gl.uniform1f(gl.getUniformLocation(homeSignProgram, 'pimTexture'), 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, homeSignBuffer);
    const positionLocation = gl.getAttribLocation(homeSignProgram, 'p');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(homeSignProgram, 'artwork'), 0);
    const model = spatialDashboardPanelMatrix(questSpatialDashboardPanel);
    const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
    gl.uniformMatrix4fv(gl.getUniformLocation(homeSignProgram, 'mvp'), false, mvp);
    gl.bindTexture(gl.TEXTURE_2D, questSpatialDashboardMirror.texture);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.depthMask(true);
}

function groundGuideMatrix(target) {
    if (!latestViewerMatrix || !target) return null;
    const start = { x: latestViewerMatrix[12], y: target.y + .006, z: latestViewerMatrix[14] };
    const dx = target.x - start.x;
    const dz = target.z - start.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .08) return null;
    const ux = dx / distance;
    const uz = dz / distance;
    const width = .018;
    return new Float32Array([
        uz * width, 0, -ux * width, 0,
        ux * distance * .5, 0, uz * distance * .5, 0,
        0, 1, 0, 0,
        (start.x + target.x) * .5, start.y, (start.z + target.z) * .5, 1
    ]);
}

function drawCalibratedTotemPath(view) {
    if (!totemLinkGuideVisible || !controllerPointerRenderer) return;
    const totem = activeTotemRecord();
    const link = linkedTotemAreas(totem).find(candidate => runtimeCalibrationForLink(totem, candidate));
    const target = link ? calibratedTargetPosition(totem, link) : null;
    if (!totem || !target) return;
    const startGround = groundedTotemPosition(totem.position);
    const endGround = groundedTotemPosition(target);
    if (Math.hypot(endGround.x - startGround.x, endGround.z - startGround.z) < .1) return;
    drawSpatialGroundArrowPath(gl, controllerPointerRenderer, view,
        { ...startGround, y: startGround.y + .05 },
        { ...endGround, y: endGround.y + .05 },
        { width: .024, dashLength: .13, gapLength: .11, arrowLength: .14, arrowWidth: .105, arrowSpacing: .72, color: [0.55, 1, 0.42, .92] });
    drawSpatialSphere(gl, sphereRenderer, view.projectionMatrix, view.transform.inverse.matrix,
        { ...endGround, y: endGround.y + .045 }, .065,
        { color: [.55, 1, .42], alpha: .7, emissive: 1 });
}

function setupSpatialMarkerRenderer() {
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex, 'attribute vec2 p;uniform mat4 mvp;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=mvp*vec4(p,0.,1.);}');
    gl.compileShader(vertex);
    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment, `
        precision mediump float;
        varying vec2 uv;
        uniform vec3 color;
        uniform float shape;
        uniform float opacity;
        float box(vec2 p,vec2 s){return 1.-smoothstep(.0,.018,max(abs(p.x)-s.x,abs(p.y)-s.y));}
        float roundBox(vec2 p,vec2 s,float r){vec2 d=abs(p)-s+r;return 1.-smoothstep(.0,.018,length(max(d,0.))+min(max(d.x,d.y),0.)-r);}
        void main(){
            vec2 q=uv-vec2(.5);
            float d=length(q);
            float sphere=1.-smoothstep(.42,.5,d);
            float sphereDepth=sqrt(max(0.,1.-pow(d/.5,2.)));
            float core=1.-smoothstep(.08,.22,d);
            float rect=box(q,vec2(.40,.28));
            float jade=1.-smoothstep(.0,.025,max(abs(q.x)*.78+abs(q.y)*.28-.38,abs(q.y)-.46));
            vec2 backQ=q+vec2(.055,-.035);
            float backRect=box(backQ,vec2(.40,.28));
            float backJade=1.-smoothstep(.0,.035,max(abs(backQ.x)*.78+abs(backQ.y)*.28-.38,abs(backQ.y)-.46));

            float totemFront=roundBox(q+vec2(-.012,.012),vec2(.245,.46),.035);
            float totemBack=roundBox(q+vec2(.045,-.018),vec2(.245,.46),.035);
            float totemSide=max(0.,totemBack-totemFront);
            float totemTop=max(0.,roundBox(q-vec2(.016,.425),vec2(.225,.055),.03)-roundBox(q-vec2(.016,.395),vec2(.225,.035),.025));
            float edgeLight=max(0.,totemFront-roundBox(q+vec2(.002,.012),vec2(.228,.445),.025));
            float tagFront=roundBox(q,vec2(.41,.46),.045);
            float tagInner=roundBox(q,vec2(.375,.425),.032);
            float tagBorder=max(0.,tagFront-tagInner);

            float front=shape<.5?sphere:(shape<1.5?totemFront:(shape<2.5?jade:(shape<3.5?rect:sphere)));
            float back=shape<.5?sphere:(shape<1.5?totemBack:(shape<2.5?backJade:(shape<3.5?backRect:sphere)));
            float side=shape<1.5?totemSide:max(0.,back-front);
            float body=max(front,back);
            float light=clamp(.28+.68*sphereDepth+.24*(-q.x+q.y),0.,1.);
            vec3 shaded=mix(color*.42,mix(color,vec3(1.),.38),light);
            if(shape>.5&&shape<1.5){
                float verticalLight=clamp(.42+q.y*.62,0.,1.);
                vec3 face=mix(color*.52,mix(color,vec3(1.),.28),verticalLight);
                shaded=mix(color*.38,face,front);
                shaded=mix(shaded,color*.25,side*.94);
                shaded=mix(shaded,mix(color,vec3(1.),.48),totemTop*.9);
                shaded=mix(shaded,vec3(1.),edgeLight*.18);
            } else if(shape>.5&&shape<3.5){
                shaded=mix(color*.28,shaded,front);
                shaded=mix(shaded,color*.22,side*.88);
            }
            if(shape>3.5)shaded=mix(shaded,vec3(.92,1.,.78),core*.62);
            if(shape>4.5){body=tagFront;shaded=mix(color*.45,color,.65);shaded=mix(shaded,vec3(1.),tagBorder*.2);front=body;}
            float glow=(1.-smoothstep(.30,.55,d))*(shape<.5||shape>3.5&&shape<4.5?.16:.04);
            float alpha=body*(shape<.5?.58:(shape<1.5?.9:(shape<2.5?.56:(shape>4.5?.42:.82))))+glow;
            if(body<.01&&glow<.01)discard;
            gl_FragColor=vec4(shaded,alpha*opacity);
        }
    `);
    gl.compileShader(fragment);
    markerProgram = gl.createProgram();
    gl.attachShader(markerProgram, vertex);
    gl.attachShader(markerProgram, fragment);
    gl.linkProgram(markerProgram);
    markerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, markerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, 1,1, -1,-1, 1,1, -1,1]), gl.STATIC_DRAW);
    setupHomeSignRenderer();
    sphereRenderer = createSpatialSphereRenderer(gl);
    prismRenderer = createSpatialPrismRenderer(gl);
    triangleRenderer = createSpatialTriangleRenderer(gl);
    controllerPointerRenderer = createSpatialTetherRenderer(gl);
}

function drawSpatialMarkers(view) {
    if (!markerProgram || !markerBuffer || !sphereRenderer || !prismRenderer || !triangleRenderer) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const colors = { plant: [.42, .72, .34], note: [.66, .69, .64], sub_checkpoint: [.39, .48, .23], intro_checkpoint: [.26, .82, .62], area_checkpoint: [.34, .78, .7] };

    activeAreaMarkers().forEach(record => {
        if (!hasRenderableSpatialPosition(record)) return;
        if (hiddenStructuralMarkerIds.has(record.marker.id)) return;
        const shape = markerShape(record.marker.type);
        const isNoteMarker = record.marker.type === 'note';
        const markerForm = record.marker.type === 'plant' ? markerAppearanceShape(record.marker) : 'orb';
        const highlighted = record.marker.id === hoveredMarkerId || contextToolbarRecord?.marker?.id === record.marker.id;
        const needsShapeHalo = !isNoteMarker && record.marker.type !== 'area_checkpoint'
            && (shape === 1 || shape === 3 || Boolean(record.marker.special_symbol) || markerForm !== 'orb');
        if (highlighted && needsShapeHalo) {
            const [scaleX, scaleY] = markerDimensions(record.marker);
            const haloPosition = shape === 1
                ? { ...groundedTotemPosition(record.position), y: groundedTotemPosition(record.position).y + scaleY }
                : shape === 3
                    ? { ...record.position, y: record.position.y + scaleY }
                    : record.position;
            const haloRadius = shape === 1
                ? Math.max(.16, Math.min(.3, scaleY * .42))
                : shape === 3
                    ? .2
                    : Math.max(.09, Math.max(scaleX, scaleY) * 1.48);
            gl.depthMask(false);
            drawSpatialSphere(gl, sphereRenderer, view.projectionMatrix, view.transform.inverse.matrix, haloPosition, haloRadius, {
                color: [.82, 1, .28],
                alpha: .28,
                emissive: 1
            });
            gl.depthMask(true);
        }
        if (shape === 1) {
            const [halfWidth, halfHeight] = markerDimensions(record.marker);
            const groundPosition = groundedTotemPosition(record.position);
            const totemStyle = normalizeTotemStyle(record.marker);
            const totemColor = markerRgb(record.marker, colors.area_checkpoint);
            if (totemStyle === 'organic') {
                const radius = Math.max(.12, Math.min(.36, halfHeight * .56));
                drawSpatialSphere(gl, sphereRenderer, view.projectionMatrix, view.transform.inverse.matrix, { ...groundPosition, y: groundPosition.y + radius }, radius, {
                    color: totemColor,
                    alpha: .94,
                    emissive: .14
                });
                return;
            }
            if (totemStyle === 'flat-disc') {
                const radius = Math.max(.14, Math.min(.38, halfHeight * .56));
                drawSpatialSphere(gl, sphereRenderer, view.projectionMatrix, view.transform.inverse.matrix, { ...groundPosition, y: groundPosition.y + .035 }, radius, {
                    color: totemColor,
                    alpha: .98,
                    emissive: .18,
                    scale: { x: 1, y: .16, z: 1 }
                });
                return;
            }
            const baseHalfHeight = .04 * markerSizeFactor(record.marker);
            drawSpatialPrism(gl, prismRenderer, view, groundPosition, {
                halfWidth: halfWidth * 1.62,
                halfHeight: baseHalfHeight,
                halfDepth: halfWidth * 1.62,
                color: [.16, .38, .31],
                topColor: [.48, .78, .64],
                rotationY: (Number(record.rotationDegrees) || 24) * Math.PI / 180
            });
            drawSpatialPrism(gl, prismRenderer, view, { ...groundPosition, y: groundPosition.y + baseHalfHeight * 2 }, {
                halfWidth,
                halfHeight,
                halfDepth: halfWidth * .92,
                color: totemColor,
                topColor: [.68, .95, .87],
                rotationY: (Number(record.rotationDegrees) || 24) * Math.PI / 180
            });
            return;
        }
        if (isNoteMarker) {
            // Phones keep the single DOM note surface. Quest needs a textured
            // WebGL board because DOM Overlay is head-locked or unavailable.
            drawQuestSpatialNote(view, record);
            return;
        }
        if ((shape !== 0 && shape !== 4) || record.marker.special_symbol) return;
        const [scaleX, scaleY] = markerDimensions(record.marker);
        const baseColor = colors[record.marker.type] || colors.sub_checkpoint;
        const arrivalProgress = Number.isFinite(record.spawnedAt)
            ? Math.min(1, Math.max(0, (performance.now() - record.spawnedAt) / 850))
            : 1;
        const arrivalEase = 1 - Math.pow(1 - arrivalProgress, 3);
        if (markerForm === 'triangle') {
            drawSpatialTriangle(gl, triangleRenderer, view, record.position, {
                halfWidth: scaleX * 1.18,
                halfHeight: scaleY * 1.18,
                halfDepth: scaleX * .72,
                color: markerRgb(record.marker, baseColor),
                topColor: [.72, .95, .62],
                alpha: arrivalEase * markerAppearanceOpacity(record.marker),
                rotationY: (Number(record.rotationDegrees) || 24) * Math.PI / 180
            });
            return;
        }
        if (markerForm === 'plate') {
            drawPlantTagStem(view, record.position, record.marker, arrivalEase * markerAppearanceOpacity(record.marker));
            return;
        }
        drawSpatialOrb(gl, sphereRenderer, view, record.position, Math.max(scaleX, scaleY) * (.72 + arrivalEase * .28), {
            type: shape === 4 ? 'plant' : 'marker',
            color: markerRgb(record.marker, baseColor),
            opacity: arrivalEase * markerAppearanceOpacity(record.marker),
            highlighted: record.marker.id === hoveredMarkerId || contextToolbarRecord?.marker?.id === record.marker.id
        });
    });

    if (readyPlacementType?.toLocaleLowerCase() === 'note' && latestViewerMatrix) {
        const noteTarget = placementPoint('note');
        if (noteTarget && questBeltUsesSpatialRenderer()) {
            const previewMarker = {
                ...placementPreviewMarker('note'),
                id: '__quest-note-preview__',
                name: pendingBagRecord?.marker?.name || 'New note'
            };
            drawQuestSpatialNote(view, { marker: previewMarker, position: noteTarget });
        }
    }

    let platePreview = null;
    if (['plant', 'sub_checkpoint'].includes(readyPlacementType) && latestViewerMatrix && !readySpecialMarker) {
        const target = placementPoint();
        if (!target) return;
        const previewMarker = placementPreviewMarker(readyPlacementType);
        const [previewWidth, previewHeight] = markerDimensions(previewMarker);
        const previewForm = readyPlacementType === 'plant' ? markerAppearanceShape(previewMarker) : 'orb';
        if (previewForm === 'triangle') {
            drawSpatialTriangle(gl, triangleRenderer, view, target, {
                halfWidth: previewWidth * 1.18,
                halfHeight: previewHeight * 1.18,
                halfDepth: previewWidth * .72,
                color: markerRgb(previewMarker, colors.plant),
                topColor: [.72, .95, .62],
                alpha: markerAppearanceOpacity(previewMarker)
            });
        } else if (previewForm === 'plate') {
            platePreview = { target, previewMarker, previewWidth, previewHeight };
        } else {
            drawSpatialOrb(gl, sphereRenderer, view, target, Math.max(previewWidth, previewHeight), {
                type: readyPlacementType === 'plant' ? 'plant' : 'marker',
                color: markerRgb(previewMarker, readyPlacementType === 'plant' ? colors.plant : [.72, .9, .58]),
                opacity: markerAppearanceOpacity(previewMarker)
            });
        }
    }
    if (platePreview) drawPlantTagStem(view, platePreview.target, platePreview.previewMarker, markerAppearanceOpacity(platePreview.previewMarker));

    gl.useProgram(markerProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, markerBuffer);
    const positionLocation = gl.getAttribLocation(markerProgram, 'p');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    activeAreaMarkers().forEach(record => {
        if (!hasRenderableSpatialPosition(record)) return;
        if (hiddenStructuralMarkerIds.has(record.marker.id)) return;
        const shape = markerShape(record.marker.type);
        const isPlantPlate = record.marker.type === 'plant' && markerAppearanceShape(record.marker) === 'plate';
        const isNoteMarker = record.marker.type === 'note';
        const isSpecialMarker = Boolean(record.marker.special_symbol);
        if (!isPlantPlate && !isSpecialMarker && (shape === 0 || shape === 1 || shape === 3 || shape === 4)) return;
        const tagDimensions = isPlantPlate ? plantTagDimensions(record.marker) : null;
        const [scaleX, scaleY] = tagDimensions ? [tagDimensions.halfWidth, tagDimensions.halfHeight] : markerDimensions(record.marker);
        const groundedPosition = isPlantPlate
            ? plantTagPlatePosition(record.position, record.marker)
            : shape === 1 || shape === 2 ? { ...record.position, y: record.position.y + scaleY } : record.position;
        const model = markerBillboardMatrix(groundedPosition, scaleX, scaleY);
        const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(markerProgram, 'mvp'), false, mvp);
        gl.uniform1f(gl.getUniformLocation(markerProgram, 'shape'), isPlantPlate ? 6 : isSpecialMarker ? (['!', '?'].includes(record.marker.special_symbol) ? 3 : 2) : shape);
        gl.uniform1f(gl.getUniformLocation(markerProgram, 'opacity'), markerAppearanceOpacity(record.marker));
        const baseColor = colors[record.marker.type] || colors.sub_checkpoint;
        gl.uniform3fv(gl.getUniformLocation(markerProgram, 'color'), markerRgb(record.marker, baseColor));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    if (platePreview) {
        const tagDimensions = plantTagDimensions(platePreview.previewMarker);
        const model = markerBillboardMatrix(plantTagPlatePosition(platePreview.target, platePreview.previewMarker), tagDimensions.halfWidth, tagDimensions.halfHeight);
        const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(markerProgram, 'mvp'), false, mvp);
        gl.uniform1f(gl.getUniformLocation(markerProgram, 'shape'), 6);
        gl.uniform1f(gl.getUniformLocation(markerProgram, 'opacity'), markerAppearanceOpacity(platePreview.previewMarker));
        gl.uniform3fv(gl.getUniformLocation(markerProgram, 'color'), markerRgb(platePreview.previewMarker, colors.plant));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    if (totemGuideVisible && locatedTotemRecord?.areaId === activeAreaId) {
        const guideModel = groundGuideMatrix(locatedTotemRecord.position);
        if (guideModel) {
            const guideMvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, guideModel));
            gl.uniformMatrix4fv(gl.getUniformLocation(markerProgram, 'mvp'), false, guideMvp);
            gl.uniform1f(gl.getUniformLocation(markerProgram, 'shape'), 5);
            gl.uniform1f(gl.getUniformLocation(markerProgram, 'opacity'), 1);
            gl.uniform3fv(gl.getUniformLocation(markerProgram, 'color'), [.55, .92, .78]);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    }
}

function bindCreatorViewportReflow() {
    creatorViewportCleanup?.();
    let frameId = 0;
    let settleTimer = 0;
    const reflow = () => {
        if (!overlayRoot) return;
        if (activeAreaMarkers().some(record => record.profileExpanded)) renderSessionMarkers();
        positionSessionMarkers();
    };
    const scheduleReflow = () => {
        cancelAnimationFrame(frameId);
        clearTimeout(settleTimer);
        frameId = requestAnimationFrame(reflow);
        // Android can emit several resize events while the browser chrome and
        // visual viewport settle after a rotation or fullscreen transition.
        settleTimer = setTimeout(() => {
            cancelAnimationFrame(frameId);
            reflow();
        }, 140);
    };
    window.addEventListener('resize', scheduleReflow, { passive: true });
    window.visualViewport?.addEventListener('resize', scheduleReflow, { passive: true });
    window.visualViewport?.addEventListener('scroll', scheduleReflow, { passive: true });
    window.addEventListener('orientationchange', scheduleReflow, { passive: true });
    window.screen?.orientation?.addEventListener('change', scheduleReflow, { passive: true });
    creatorViewportCleanup = () => {
        cancelAnimationFrame(frameId);
        clearTimeout(settleTimer);
        window.removeEventListener('resize', scheduleReflow);
        window.visualViewport?.removeEventListener('resize', scheduleReflow);
        window.visualViewport?.removeEventListener('scroll', scheduleReflow);
        window.removeEventListener('orientationchange', scheduleReflow);
        window.screen?.orientation?.removeEventListener('change', scheduleReflow);
        creatorViewportCleanup = null;
    };
}

function positionSessionMarkers(view = latestView) {
    if (!view || !overlayRoot) return;
    positionLocationNote(view);
    positionNotePlacementPreview(view);
    positionControllerPointer(view);
    const inverse = view.transform?.inverse?.matrix;
    if (!inverse || !view.projectionMatrix) {
        // A Web -> AR handoff can render the DOM marker layer before the first
        // valid XR view arrives. Keep profiles and Totem boards
        // hidden instead of letting fixed-position elements fall back to
        // (0, 0) in the top-left corner.
        const currentRecords = activeAreaMarkers();
        currentRecords.forEach(record => setMarkerAncillaryVisibility(record, true));
        return;
    }
    activeAreaMarkers().forEach(record => {
        const element = overlayRoot.querySelector(`[data-ar-marker-id="${CSS.escape(record.marker.id)}"]`);
        if (!element) {
            setMarkerAncillaryVisibility(record, true);
            return;
        }
        if (!hasRenderableSpatialPosition(record) || hiddenStructuralMarkerIds.has(record.marker.id)) {
            element.hidden = true;
            setMarkerAncillaryVisibility(record, true);
            return;
        }
        if (questBeltUsesSpatialRenderer() && record.marker.type === 'note') {
            element.hidden = true;
            setMarkerAncillaryVisibility(record, true);
            return;
        }
        const projectedPosition = record.marker.type === 'area_checkpoint'
            ? (() => {
                const ground = groundedTotemPosition(record.position);
                const [, halfHeight] = markerDimensions(record.marker);
                return { ...ground, y: ground.y + .08 * markerSizeFactor(record.marker) + halfHeight };
            })()
            : record.marker.type === 'plant' && markerAppearanceShape(record.marker) === 'plate'
                ? plantTagPlatePosition(record.position, record.marker)
            : record.position;
        const eye = multiplyMatrixVector(inverse, [projectedPosition.x, projectedPosition.y, projectedPosition.z, 1]);
        const clip = multiplyMatrixVector(view.projectionMatrix, eye);
        if (!Number.isFinite(clip[3]) || clip[3] <= 0) {
            element.hidden = true;
            setMarkerAncillaryVisibility(record, true);
            return;
        }
        const x = (clip[0] / clip[3] * 0.5 + 0.5) * window.innerWidth;
        const y = (-clip[1] / clip[3] * 0.5 + 0.5) * window.innerHeight;
        const noteFactor = record.marker.type === 'note' ? markerSizeFactor(record.marker) : 0;
        const marginX = noteFactor ? Math.min(window.innerWidth * .48, 140 * noteFactor + 48) : 40;
        const marginY = noteFactor ? 58 * noteFactor + 56 : 40;
        const visible = x > -marginX
            && x < window.innerWidth + marginX
            && y > -marginY
            && y < window.innerHeight + marginY;
        element.hidden = !visible;
        setMarkerAncillaryVisibility(record, !visible);
        if (visible) {
            element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -50%)`;
            element.style.setProperty('--marker-rotation', `${Number(record.rotationDegrees) || 0}deg`);
            positionCreatorPlantProfile(record, x, y);
            if (record.marker.type === 'area_checkpoint') positionCreatorTotemInformation(record, x, y, view);
        }
    });
}

function positionCreatorPlantProfile(record, markerX, markerY) {
    if (!record.profileExpanded || !overlayRoot) return;
    const profile = overlayRoot.querySelector(`[data-ar-plant-profile="${CSS.escape(record.marker.id)}"]`);
    if (!profile) return;
    const visualViewport = window.visualViewport;
    const viewportWidth = Number(visualViewport?.width) || window.innerWidth;
    const viewportHeight = Number(visualViewport?.height) || window.innerHeight;
    const offsetX = Number(visualViewport?.offsetLeft) || 0;
    const offsetY = Number(visualViewport?.offsetTop) || 0;
    const dock = overlayRoot.querySelector('.creator-ar-control-dock');
    const dockRect = dock?.getBoundingClientRect();
    const toolbarInset = dockRect && dockRect.bottom >= viewportHeight - 96
        ? dockRect.height + 10
        : 0;
    const spatialHitLayer = usesSpatialPimRenderer();
    profile.classList.toggle('is-spatial-pim-hit-layer', spatialHitLayer);
    // The profile is a spatial surface, not a HUD card. Project the fixed PIM
    // pose captured when the Plant was opened; using the marker's current
    // screen point made Creator appear glued to the centre/marker overlay and
    // drifted from Demo's world-locked panel.
    const pose = ensureSpatialPimPose(record);
    const panel = pimSpatialPanel(pose, {
        ...(spatialHitLayer ? (() => {
            const size = spatialPimSurfaceSize(record);
            return { width: size.panelWidth, height: size.panelHeight };
        })() : {}),
        viewerPosition: latestViewerMatrix && {
            x: latestViewerMatrix[12],
            y: latestViewerMatrix[13],
            z: latestViewerMatrix[14]
        }
    });
    if (spatialHitLayer && panel && latestView) {
        const size = spatialPimSurfaceSize(record);
        const halfWidth = panel.width * .5;
        const halfHeight = panel.height * .5;
        const projected = [
            { x: panel.center.x - panel.right.x * halfWidth - panel.up.x * halfHeight, y: panel.center.y - panel.right.y * halfWidth - panel.up.y * halfHeight, z: panel.center.z - panel.right.z * halfWidth - panel.up.z * halfHeight },
            { x: panel.center.x + panel.right.x * halfWidth - panel.up.x * halfHeight, y: panel.center.y + panel.right.y * halfWidth - panel.up.y * halfHeight, z: panel.center.z + panel.right.z * halfWidth - panel.up.z * halfHeight },
            { x: panel.center.x + panel.right.x * halfWidth + panel.up.x * halfHeight, y: panel.center.y + panel.right.y * halfWidth + panel.up.y * halfHeight, z: panel.center.z + panel.right.z * halfWidth + panel.up.z * halfHeight },
            { x: panel.center.x - panel.right.x * halfWidth + panel.up.x * halfHeight, y: panel.center.y - panel.right.y * halfWidth + panel.up.y * halfHeight, z: panel.center.z - panel.right.z * halfWidth + panel.up.z * halfHeight }
        ].map(point => projectWorldPoint(latestView, point)).filter(Boolean);
        if (projected.length === 4) {
            const left = Math.min(...projected.map(point => point.x)) - offsetX;
            const right = Math.max(...projected.map(point => point.x)) - offsetX;
            const top = Math.min(...projected.map(point => point.y)) - offsetY;
            const bottom = Math.max(...projected.map(point => point.y)) - offsetY;
            const panelWidth = Math.max(1, right - left);
            const panelHeight = Math.max(1, bottom - top);
            profile.style.left = `${left + panelWidth / 2}px`;
            profile.style.top = `${top + panelHeight / 2}px`;
            profile.style.width = `${panelWidth}px`;
            profile.style.height = `${panelHeight}px`;
            const map = profile.querySelector('[data-pim-renderer="canonical"]');
            map?.style.setProperty('--pim-cell-size', `${panelWidth * PIM_TEXTURE_CELL_WIDTH / size.width}px`);
            map?.style.setProperty('--pim-cell-height', `${panelHeight * PIM_TEXTURE_CELL_WIDTH * .8660254 / size.height}px`);
            return;
        }
    }
    const panelPoint = panel && projectWorldPoint(latestView, panel.center);
    const anchorX = (panelPoint?.x ?? markerX) - offsetX;
    const anchorY = (panelPoint?.y ?? markerY) - offsetY;
    const layout = plantInformationMeshSurfaceLayout(viewportWidth, viewportHeight, anchorX, anchorY, {
        topInset: Math.max(12, offsetY + 8),
        bottomInset: toolbarInset + 12
    });
    const { panelWidth, panelHeight, panelX, panelY } = layout;
    profile.style.left = `${panelX}px`;
    profile.style.top = `${panelY}px`;
    profile.style.width = `${panelWidth}px`;
    profile.style.height = `${panelHeight}px`;
}

function positionCreatorTotemInformation(record, markerX, markerY, view = latestView) {
    if ((!record.infoVisible && !(totemLinkGuideVisible && linkedTotemAreas(record).length)) || !overlayRoot) return;
    const information = overlayRoot.querySelector(`[data-ar-totem-information="${CSS.escape(record.marker.id)}"]`);
    if (!information) return;
    const balloon = information.querySelector('.creator-ar-totem-balloon');
    const balloonRect = balloon?.getBoundingClientRect();
    const boardWidth = Math.min(window.innerWidth * .58, 320);
    const boardHalfHeight = balloonRect?.height ? balloonRect.height / 2 : Math.min(86, Math.max(48, window.innerHeight * .09));
    const ground = groundedTotemPosition(record.position);
    const [, halfHeight] = markerDimensions(record.marker);
    const topWorld = { ...ground, y: ground.y + .08 * markerSizeFactor(record.marker) + halfHeight * 2 };
    const projectedTop = view ? projectWorldPoint(view, topWorld) : null;
    const attachmentPoint = projectedTop || { x: markerX, y: markerY - Math.max(48, window.innerHeight * .08) };
    const boardX = Math.max(boardWidth / 2 + 12, Math.min(window.innerWidth - boardWidth / 2 - 12, attachmentPoint.x));
    const boardY = Math.max(72, attachmentPoint.y - boardHalfHeight - 28);
    const stickStart = { x: boardX, y: boardY + boardHalfHeight };
    const dx = attachmentPoint.x - stickStart.x;
    const dy = attachmentPoint.y - stickStart.y;
    information.style.setProperty('--location-note-x', `${boardX.toFixed(1)}px`);
    information.style.setProperty('--location-note-y', `${boardY.toFixed(1)}px`);
    information.style.setProperty('--location-stick-x', `${stickStart.x.toFixed(1)}px`);
    information.style.setProperty('--location-stick-y', `${stickStart.y.toFixed(1)}px`);
    information.style.setProperty('--location-stick-length', `${Math.max(24, Math.hypot(dx, dy)).toFixed(1)}px`);
    information.style.setProperty('--location-stick-angle', `${(Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2)}deg`);
    information.style.setProperty('--location-ground-x', `${attachmentPoint.x.toFixed(1)}px`);
    information.style.setProperty('--location-ground-y', `${attachmentPoint.y.toFixed(1)}px`);
    const projectedGround = view ? projectWorldPoint(view, ground) : null;
    const mastTop = attachmentPoint.y - 30;
    const mastBottom = projectedGround?.y || markerY;
    information.style.setProperty('--totem-link-hub-x', `${attachmentPoint.x.toFixed(1)}px`);
    information.style.setProperty('--totem-link-hub-y', `${attachmentPoint.y.toFixed(1)}px`);
    information.style.setProperty('--totem-link-mast-x', `${attachmentPoint.x.toFixed(1)}px`);
    information.style.setProperty('--totem-link-mast-y', `${mastTop.toFixed(1)}px`);
    information.style.setProperty('--totem-link-mast-height', `${Math.max(40, mastBottom - mastTop).toFixed(1)}px`);
    const signWidth = Math.min(184, Math.max(132, window.innerWidth * .34));
    const signGap = Math.max(14, Math.min(28, window.innerWidth * .035));
    information.querySelectorAll('[data-ar-totem-link-area]').forEach((sign, index) => {
        const direction = sign.classList.contains('is-left') ? -1 : 1;
        const row = Math.floor(index / 2);
        const signX = Math.max(signWidth / 2 + 10, Math.min(window.innerWidth - signWidth / 2 - 10, attachmentPoint.x + direction * (signWidth / 2 + signGap + row * 8)));
        const signY = Math.max(64, Math.min(window.innerHeight - 58, attachmentPoint.y - 18 - row * 54));
        const armLength = Math.max(14, Math.abs(signX - attachmentPoint.x) - signWidth / 2 + 4);
        sign.style.left = `${signX.toFixed(1)}px`;
        sign.style.top = `${signY.toFixed(1)}px`;
        sign.style.width = `${signWidth.toFixed(1)}px`;
        sign.style.setProperty('--sign-arm-length', `${armLength.toFixed(1)}px`);
    });
    information.querySelectorAll('[data-ar-totem-link-branch]').forEach((branch, index) => {
        const direction = branch.classList.contains('is-left') ? -1 : 1;
        const row = Math.floor(index / 2);
        const signX = Math.max(signWidth / 2 + 10, Math.min(window.innerWidth - signWidth / 2 - 10, attachmentPoint.x + direction * (signWidth / 2 + signGap + row * 8)));
        const signY = Math.max(64, Math.min(window.innerHeight - 58, attachmentPoint.y - 18 - row * 54));
        const armLength = Math.max(14, Math.abs(signX - attachmentPoint.x) - signWidth / 2 + 4);
        branch.style.left = `${(direction > 0 ? attachmentPoint.x : attachmentPoint.x - armLength).toFixed(1)}px`;
        branch.style.top = `${signY.toFixed(1)}px`;
        branch.style.width = `${armLength.toFixed(1)}px`;
    });
}

function renderSessionMarkers() {
    const layer = overlayRoot?.querySelector('[data-ar-marker-layer]');
    if (!layer) return;
    const visibleMarkers = activeAreaMarkers();
    const renderableMarkers = visibleMarkers.filter(hasRenderableSpatialPosition);
    layer.innerHTML = visibleMarkers.map(record => {
        if (!hasRenderableSpatialPosition(record)) return '';
        const profileAvailable = hasPlantProfile(record);
        const profileLabel = profileAvailable ? (record.profileExpanded ? ' Hide Plant Profile' : ' Open Plant Profile') : '';
        const informationSummary = record.marker.description
            || record.marker.notes
            || (record.marker.type === 'area_checkpoint' ? areaBoard(record.marker).introduction : '')
            || `${readyPlacementLabel(record.marker.type)} information`;
        const markerCaption = record.marker.type === 'area_checkpoint'
            ? ''
            : `<span class="creator-ar-spatial-name${record.marker.type === 'note' ? ' nourishland-spatial-note-surface' : ''}${record.marker.type === 'note' ? ' creator-ar-demo-note' : ''}">${escapeHtml(record.marker.name)}${profileAvailable ? '<small>Plant Profile</small>' : `<small>${escapeHtml(informationSummary)}</small>`}</span>`;
        const profileLayer = profileAvailable && record.profileExpanded
            ? `<aside class="creator-ar-plant-profile is-anchored-profile${usesSpatialPimRenderer() ? ' is-spatial-pim-hit-layer' : ''}" data-ar-plant-profile="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(record.marker.name)} Plant Profile">${creatorPlantKnowledgeMarkup(record)}</aside>`
             : record.marker.type === 'area_checkpoint' && (record.infoVisible || (totemLinkGuideVisible && linkedTotemAreas(record).length))
                 ? creatorTotemInformationMarkup(record)
                : '';
        // Keep every marker hidden until the first valid XR projection positions it.
        // This prevents notes from appearing at the browser's default fixed origin during Web -> AR handoff.
        // Legacy source shape retained for compatibility: <span class="creator-ar-marker-hit-target...
        const markerLayer = `<span hidden class="creator-ar-marker-hit-target creator-ar-marker-hit-target-${escapeHtml(record.marker.type)}${contextToolbarRecord?.marker?.id === record.marker.id ? ' is-selected' : ''}${record.marker.type === 'note' && markerNoteSurface(record.marker) === 'outline' ? ' is-note-outline' : ''}${record.marker.special_symbol ? ' is-symbol-marker' : ''}${record.marker.arrow_style ? ` is-arrow-marker is-arrow-style-${record.marker.arrow_style}` : ''}${profileAvailable ? ' has-plant-profile' : ''}${record.infoVisible ? ' is-info-open' : ''}" role="button" tabindex="${interactionMode ? '0' : '-1'}" data-ar-marker-id="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(record.marker.name)} ${markerLabel(record.marker.type)}${profileLabel}" style="${markerDomAppearanceStyle(record.marker)};--marker-rotation:${Number(record.rotationDegrees) || 0}deg">${record.marker.special_symbol ? `<span class="creator-ar-special-symbol" aria-hidden="true">${escapeHtml(record.marker.special_symbol)}</span>` : ''}${markerCaption}</span>`;
        return `${markerLayer}${profileLayer}`;
    }).join('');
    // renderSessionMarkers can run before the first XR projection (notably
    // when returning from Web Mode). Ancillary panels have no safe CSS origin,
    // so they remain hidden until positionSessionMarkers has a valid view.
    renderableMarkers.forEach(record => setMarkerAncillaryVisibility(record, true));
    renderableMarkers.forEach(record => {
        const element = layer.querySelector(`[data-ar-marker-id="${CSS.escape(record.marker.id)}"]`);
        element?.addEventListener('pointerdown', event => handleMarkerPointerDown(record, event));
        element?.addEventListener('pointermove', moveMarkerHoldGesture);
        element?.addEventListener('pointerup', event => finishMarkerHoldGesture(record, event));
        element?.addEventListener('pointercancel', cancelMarkerHoldGesture);
        element?.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            beginMarkerInteraction(record, event);
        });
        const profilePanel = layer.querySelector(`[data-ar-plant-profile="${CSS.escape(record.marker.id)}"]`);
        // Keep the PIM tap inside the profile without cancelling the browser's
        // native click synthesis. Android Chrome/PWA can drop that click when
        // preventDefault() is called during pointerdown, leaving Creator's
        // otherwise-correct PIM looking inert while Demo still works.
        profilePanel?.addEventListener('pointerdown', event => {
            event.stopPropagation();
        });
        profilePanel?.addEventListener('pointerup', event => {
            if (event.target.closest?.('[data-pim-node],[data-pim-back]')) event.stopPropagation();
        });
        profilePanel?.addEventListener('pointercancel', event => {
            if (event.target.closest?.('[data-pim-node],[data-pim-back]')) event.stopPropagation();
        });
        profilePanel?.addEventListener('click', event => {
            const clearPimFocus = target => {
                if (target && profilePanel.contains(target)) target.blur?.();
            };
            const core = event.target.closest?.('[data-pim-role="center"]');
            if (core && profilePanel.contains(core)) {
                event.stopPropagation();
                clearPimFocus(core);
                setCreatorPimState(record, pimResetInteractionState(creatorPimState(record)));
                record.pimBloomStarted = 0;
                refreshCreatorPimProfile(record, profilePanel);
                setPlacementStatus('Plant flower reset.');
                return;
            }
            const back = event.target.closest?.('[data-pim-back]');
            if (back) {
                event.stopPropagation();
                clearPimFocus(back);
                toggleCreatorPimNode(record, back.dataset.pimBack);
                record.pimBloomStarted = performance.now();
                refreshCreatorPimProfile(record, profilePanel);
                setPlacementStatus('Returned to the previous PIM bloom.');
                return;
            }
            const cell = event.target.closest?.('[data-pim-node]');
            if (!cell || !profilePanel.contains(cell)) return;
            event.stopPropagation();
            const nodePath = cell.dataset.pimNode;
            clearPimFocus(cell);
            const node = pimNodeAtPath(creatorPlantKnowledge(record), nodePath);
            if (!node) return;
            const label = cell.querySelector('b')?.textContent || 'Cell';
            if (!pimNodeChildren(node).length) {
                setCreatorPimState(record, pimToggleNodeState(creatorPlantKnowledge(record), creatorPimState(record), nodePath));
                refreshCreatorPimProfile(record, profilePanel);
                setPlacementStatus(`${node.label}: ${node.value || 'Information cell'}`);
                return;
            }
            const wasOpen = creatorPimState(record).expandedNodeIds.has(nodePath);
            toggleCreatorPimNode(record, nodePath);
            record.pimBloomStarted = performance.now();
            refreshCreatorPimProfile(record, profilePanel);
            setPlacementStatus(wasOpen ? `${label} remains open.` : `${label} opened into its information petals.`);
        });
        bindPlantInformationMeshPress(profilePanel);
        const totemInformation = layer.querySelector(`[data-ar-totem-information="${CSS.escape(record.marker.id)}"]`);
        totemInformation?.querySelectorAll('[data-ar-totem-link-area]').forEach(sign => {
            sign.addEventListener('pointerdown', event => {
                event.preventDefault();
                event.stopPropagation();
            });
            sign.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                void transitionToLinkedArea(sign.dataset.arTotemLinkArea);
            });
        });
    });
    updateInteractionControls();
    positionSessionMarkers();
}

function closeInlineEditor() {
    const editor = overlayRoot?.querySelector('[data-ar-inline-editor]');
    if (editor) {
        editor.hidden = true;
        editor.innerHTML = '';
    }
}

function openInlineEditor(record, force = false) {
    if (!force && interactionMode !== 'select') return;
    const editor = overlayRoot?.querySelector('[data-ar-inline-editor]');
    if (!editor) return;
    const isPendingPlacement = record.pendingPlacement === true;
    const plant = record.marker.type === 'plant';
    const fixedType = true;
    const startingPoint = record.marker.type === 'intro_checkpoint';
    const areaCheckpoint = record.marker.type === 'area_checkpoint';
    editor.hidden = false;
    const appearance = record.marker.appearance || {};
    const typeControl = `<p class="creator-ar-fixed-type">Type · ${readyPlacementLabel(record.marker.type)}</p>`;
    const noteSurfaceControl = record.marker.type === 'note' ? `<label>Board style<select name="noteSurface"><option value="filled" ${markerNoteSurface(record.marker) === 'filled' ? 'selected' : ''}>Filled color</option><option value="outline" ${markerNoteSurface(record.marker) === 'outline' ? 'selected' : ''}>Transparent · color outline</option></select></label>` : '';
    const markerControls = `<fieldset class="creator-ar-appearance"><legend>Quick appearance</legend>${typeControl}<label>Color<input name="markerColor" type="color" value="${markerAppearanceColor(record.marker)}" /></label><label>Size<select name="markerSize"><option value="tiny" ${markerAppearanceSize(record.marker) === 'tiny' ? 'selected' : ''}>Tiny</option><option value="small" ${markerAppearanceSize(record.marker) === 'small' ? 'selected' : ''}>Small</option><option value="medium" ${markerAppearanceSize(record.marker) === 'medium' ? 'selected' : ''}>Medium</option><option value="large" ${markerAppearanceSize(record.marker) === 'large' ? 'selected' : ''}>Large</option><option value="huge" ${markerAppearanceSize(record.marker) === 'huge' ? 'selected' : ''}>Huge</option></select></label>${noteSurfaceControl}</fieldset>`;
    const board = areaBoard(record.marker);
    const areaBoardControls = areaCheckpoint ? `<fieldset class="creator-ar-area-board-editor"><legend>Area welcome board</legend><label>Board title<input name="areaBoardTitle" value="${escapeHtml(board.title)}" required /></label><label>Welcome message<textarea name="areaBoardIntroduction" rows="3" placeholder="Explain what this Area is for and welcome people into it.">${escapeHtml(board.introduction)}</textarea></label><p>This spatial board gathers around the Totem Marker and can be refined later.</p></fieldset>` : '';
    const noticeBoard = record.marker.notice_board || {};
    const startingBoardControls = startingPoint ? `<fieldset class="creator-ar-area-board-editor"><legend>Trail Entrance notice board</legend><label>Board title<input name="noticeBoardTitle" value="${escapeHtml(noticeBoard.title || record.marker.name)}" /></label><label>Welcome notice<textarea name="noticeBoardMessage" rows="3" placeholder="Add a welcome, orientation or important notice.">${escapeHtml(noticeBoard.message || '')}</textarea></label><p>Leave the notice blank when this entrance needs no spatial text.</p></fieldset>` : '';
    const profileNote = plant
        ? `<p class="creator-ar-profile-note">${hasPlantProfile(record) ? 'Plant Profile enabled. Use View mode to reveal it, or Web Mode to extend its knowledge.' : 'Upgrade this Plant in Web Mode to unlock its interactive AR information tree.'}</p>`
        : '';
    editor.innerHTML = `<form class="creator-ar-editor-form" data-ar-editor-form><div class="creator-ar-editor-heading"><p class="welcome-label">Quick edit · ${escapeHtml(record.areaName)}</p><button type="button" data-ar-edit-in-web>Edit in Web Mode</button></div><label class="creator-ar-rename">Rename<input name="name" value="${escapeHtml(record.marker.name)}" required /></label>${markerControls}${areaBoardControls}${startingBoardControls}${profileNote}<div class="creator-ar-editor-actions"><button class="creator-ar-delete" type="button" data-ar-delete-marker>Delete</button><span></span><button type="button" data-ar-editor-cancel>Cancel</button><button class="primary" type="submit">Save</button></div><p class="meta" data-ar-editor-status></p></form>`;
    const editorForm = editor.querySelector('[data-ar-editor-form]');
    const appearanceFieldset = editor.querySelector('.creator-ar-appearance');
    if (appearanceFieldset) {
        const opacityField = document.createElement('label');
        opacityField.textContent = 'Opacity';
        opacityField.innerHTML += `<select name="markerOpacity"><option value="1">100% · Solid</option><option value="0.8">80%</option><option value="0.6">60%</option><option value="0.4">40%</option></select>`;
        opacityField.querySelector('select').value = String(markerAppearanceOpacity(record.marker));
        appearanceFieldset.append(opacityField);
    }
    if (record.marker.type === 'note' && editorForm) {
        const informationField = document.createElement('label');
        informationField.textContent = 'Information';
        const information = document.createElement('textarea');
        information.name = 'description';
        information.rows = 4;
        information.placeholder = 'Write what this Note should say.';
        information.value = record.marker.description || record.marker.notes || '';
        informationField.append(information);
        editorForm.insertBefore(informationField, appearanceFieldset);
    }
    if (plant) {
        const shapeField = document.createElement('label');
        shapeField.innerHTML = `Marker form<select name="markerShape"><option value="orb" ${markerAppearanceShape(record.marker) === 'orb' ? 'selected' : ''}>Orb</option><option value="plate" ${markerAppearanceShape(record.marker) === 'plate' ? 'selected' : ''}>Square number plate</option><option value="triangle" ${markerAppearanceShape(record.marker) === 'triangle' ? 'selected' : ''}>3D triangle</option></select>`;
        editor.querySelector('.creator-ar-appearance')?.append(shapeField);
    }
    editor.querySelector('[data-ar-editor-cancel]').addEventListener('click', closeInlineEditor);
    editor.querySelector('[data-ar-edit-in-web]').addEventListener('click', () => {
        if (isPendingPlacement) {
            void openContextInWebMode();
            return;
        }
        arReturnContext = areaCheckpoint ? `web-totem:${record.areaId}` : `web-marker:${record.marker.id}`;
        exitArMode();
    });
    editor.querySelector('[data-ar-delete-marker]').addEventListener('click', async event => {
        const button = event.currentTarget;
        const status = editor.querySelector('[data-ar-editor-status]');
        if (isPendingPlacement) {
            readyPlacementType = '';
            pendingBagRecord = null;
            pendingPlacementAppearance = null;
            pendingPlacementDetails = null;
            updateReadyPlacementControl();
            closeInlineEditor();
            setPlacementStatus('Note placement draft discarded.');
            return;
        }
        if (button.dataset.confirmDelete !== 'true') {
            button.dataset.confirmDelete = 'true';
            button.textContent = 'Confirm delete';
            status.textContent = `Tap Confirm delete to permanently remove ${record.marker.name}.`;
            return;
        }
        button.disabled = true;
        status.textContent = 'Deleting...';
        try {
            await deletePlaceMarker(activeProjectId, record.siteId, record.areaId, record.marker.id);
            sessionMarkers = sessionMarkers.filter(item => item !== record);
            renderSessionMarkers();
            closeInlineEditor();
            setPlacementStatus(`${record.marker.name} deleted.`);
        } catch (error) {
            button.disabled = false;
            status.textContent = `Could not delete: ${error.message}`;
        }
    });
    editor.querySelector('[data-ar-editor-form]').addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const status = form.querySelector('[data-ar-editor-status]');
        const name = form.elements.name.value.trim();
        const description = form.elements.description
            ? form.elements.description.value.trim()
            : (record.marker.description || record.marker.notes || '');
        const type = record.marker.type;
        if (!name) {
            status.textContent = 'A name is required.';
            return;
        }
        try {
            status.textContent = 'Saving...';
            const update = {
                ...record.marker,
                type,
                name,
                description,
                appearance: {
                    ...appearance,
                    color: form.elements.markerColor.value,
                    size: form.elements.markerSize.value,
                    opacity: Number(form.elements.markerOpacity?.value ?? markerAppearanceOpacity(record.marker)),
                    ...(type === 'note' ? { surface: form.elements.noteSurface?.value === 'outline' ? 'outline' : 'filled' } : {})
                },
                plant_profile: type === 'plant' ? {
                    ...(record.marker.plant_profile || {}),
                    common_name: name
                } : record.marker.plant_profile,
                notes: type === 'note' ? description : record.marker.notes || ''
            };
            if (type === 'plant' && form.elements.markerShape) update.appearance.shape = form.elements.markerShape.value;
            if (type === 'area_checkpoint') {
                update.area_information_board = {
                    title: form.elements.areaBoardTitle?.value.trim() || name.replace(/\s+checkpoint$/i, ''),
                    introduction: form.elements.areaBoardIntroduction?.value.trim() || description || `Welcome to ${name}.`,
                    information_bubbles: board.informationBubbles
                };
            }
            if (type === 'intro_checkpoint') {
                const message = form.elements.noticeBoardMessage?.value.trim() || '';
                update.notice_board = message ? {
                    title: form.elements.noticeBoardTitle?.value.trim() || name,
                    message
                } : undefined;
            }
            if (isPendingPlacement) {
                pendingPlacementAppearance = { type, ...update.appearance };
                pendingPlacementDetails = {
                    type,
                    name,
                    description,
                    surface: type === 'note' ? update.appearance.surface : undefined
                };
                if (pendingBagRecord) {
                    pendingBagRecord.marker = {
                        ...pendingBagRecord.marker,
                        name,
                        description,
                        notes: type === 'note' ? description : pendingBagRecord.marker.notes || '',
                        appearance: { ...(pendingBagRecord.marker.appearance || {}), ...update.appearance }
                    };
                }
                updateNotePlacementPreview();
                updateContextToolbar();
                closeInlineEditor();
                setPlacementStatus(`${name} draft updated. Tap the centre circle to place it.`);
                return;
            }
            const updated = type === 'area_checkpoint' && record.marker.type !== 'area_checkpoint'
                ? await convertRecordToAreaCheckpoint(record, update)
                : await updateAreaCompatibleMarker(record, update);
            record.marker = updated;
            renderSessionMarkers();
            closeInlineEditor();
            setPlacementStatus(`${updated.name} updated. Continue in EDIT mode or turn interaction off.`);
        } catch (error) {
            status.textContent = `Could not save: ${error.message}`;
        }
    });
}

function beginMarkerInteraction(record, event, { directHold = false, element = event.currentTarget } = {}) {
    if (hasPlantProfile(record) && !directHold) {
        event.preventDefault();
        event.stopPropagation();
        const opening = !record.profileExpanded;
        sessionMarkers.forEach(candidate => {
            if (candidate !== record && candidate.marker.type === 'plant') {
                candidate.profileExpanded = false;
                candidate.infoVisible = false;
            }
        });
        record.profileExpanded = opening;
        record.infoVisible = record.profileExpanded;
        if (opening) {
            ensureSpatialPimPose(record, true);
            record.pimExpandedNodeIds ||= [...(record.pimExpandedPaths || [])];
            record.pimExpandedPaths ||= [...record.pimExpandedNodeIds];
            record.pimBloomStarted = performance.now();
        } else {
            invalidateSpatialPimTexture(record);
        }
        renderSessionMarkers();
        setPlacementStatus('');
        return;
    }
    if (!interactionMode) return;
    if (directHold && hasPlantProfile(record) && record.profileExpanded) return;
    if (!directHold && interactionMode === 'view') {
        event.preventDefault();
        event.stopPropagation();
        record.infoVisible = !record.infoVisible;
        renderSessionMarkers();
        setPlacementStatus('');
        return;
    }
    if (!directHold && interactionMode === 'neutral') {
        event.preventDefault();
        event.stopPropagation();
        openMarkerContextToolbar(record);
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!directHold && interactionMode === 'select') {
        openMarkerContextToolbar(record);
        return;
    }
    if (dragState) {
        if (dragState.record === record) void finishMarkerDrag();
        return;
    }
    const camera = latestViewerMatrix
        ? { x: latestViewerMatrix[12], y: latestViewerMatrix[13], z: latestViewerMatrix[14] }
        : null;
    const distance = camera
        ? Math.max(.35, Math.hypot(record.position.x - camera.x, record.position.y - camera.y, record.position.z - camera.z))
        : 1;
    dragState = {
        record,
        element,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        gestureStartY: Number.isFinite(event.clientY) ? event.clientY : window.innerHeight / 2,
        position: { ...record.position },
        cameraPosition: camera,
        distance,
        depthOffset: 0,
        rotationDegrees: Number(record.rotationDegrees) || 0,
        pointerOffset: { x: 0, y: 0 }
    };
    element?.classList.add('is-adjusting');
    overlayRoot?.classList.add('is-holding-item');
    element?.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', moveMarkerDrag);
    window.addEventListener('pointercancel', cancelMarkerDrag);
    const joystick = overlayRoot?.querySelector('[data-ar-depth-joystick]');
    if (joystick) {
        joystick.hidden = false;
        joystick.classList.toggle('can-rotate-arrow', Boolean(record.marker.arrow_style));
        const pointer = overlayRoot?.querySelector('.creator-ar-mode-pointer');
        const pointerRect = pointer?.getBoundingClientRect();
        const controlX = pointerRect ? pointerRect.left + pointerRect.width / 2 : event.clientX;
        const controlY = pointerRect ? pointerRect.top + pointerRect.height / 2 : event.clientY;
        joystick.style.setProperty('--move-control-x', `${controlX}px`);
        joystick.style.setProperty('--move-control-y', `${controlY}px`);
        const readout = joystick.querySelector('[data-ar-depth-readout]');
        if (readout) readout.textContent = `${distance.toFixed(1)} m`;
        joystick.style.setProperty('--depth-shift', '0px');
    }
    updateGrabbedMarkerFromCamera();
    positionSessionMarkers();
    setPlacementStatus(`${directHold ? 'Holding' : 'Moving'} ${record.marker.name}. Look around to guide it, slide up to push or down to pull, then press Release.`);
}

function moveMarkerDrag(event) {
    if (!dragState) return;
    if (event.pointerId !== dragState.pointerId) return;
    const verticalTravel = dragState.gestureStartY - event.clientY;
    setHeldMarkerDepthOffset(verticalTravel / 120);
    updateGrabbedMarkerFromCamera();
    positionSessionMarkers();
}

function pointerWorldRay() {
    if (!latestViewerMatrix) return null;
    if (creatorInputMode === 'controller' && latestControllerRay) return latestControllerRay.direction;
    if (!latestView?.projectionMatrix) return null;
    const pointer = overlayRoot?.querySelector(readyPlacementType ? '.creator-ar-placement-guide' : '.creator-ar-mode-pointer');
    const rect = pointer?.getBoundingClientRect();
    const screenX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const screenY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const ndcX = screenX / window.innerWidth * 2 - 1;
    const ndcY = 1 - screenY / window.innerHeight * 2;
    const projection = latestView.projectionMatrix;
    let x = (ndcX + projection[8]) / projection[0];
    let y = (ndcY + projection[9]) / projection[5];
    let z = -1;
    const viewLength = Math.hypot(x, y, z) || 1;
    x /= viewLength;
    y /= viewLength;
    z /= viewLength;
    const worldX = latestViewerMatrix[0] * x + latestViewerMatrix[4] * y + latestViewerMatrix[8] * z;
    const worldY = latestViewerMatrix[1] * x + latestViewerMatrix[5] * y + latestViewerMatrix[9] * z;
    const worldZ = latestViewerMatrix[2] * x + latestViewerMatrix[6] * y + latestViewerMatrix[10] * z;
    const worldLength = Math.hypot(worldX, worldY, worldZ) || 1;
    return { x: worldX / worldLength, y: worldY / worldLength, z: worldZ / worldLength };
}

function heldPointerRay() {
    return pointerWorldRay();
}

function updateGrabbedMarkerFromCamera() {
    if (!dragState) return;
    if (!latestViewerMatrix) return;
    const distance = Math.max(.3, Math.min(8, dragState.distance + dragState.depthOffset));
    const ray = heldPointerRay() || { x: -latestViewerMatrix[8], y: -latestViewerMatrix[9], z: -latestViewerMatrix[10] };
    const origin = pointerWorldOrigin() || { x: latestViewerMatrix[12], y: latestViewerMatrix[13], z: latestViewerMatrix[14] };
    dragState.record.position.x = origin.x + ray.x * distance;
    dragState.record.position.y = origin.y + ray.y * distance;
    dragState.record.position.z = origin.z + ray.z * distance;
}

async function finishMarkerDrag(event) {
    const state = dragState;
    if (!state || (event?.pointerId != null && event.pointerId !== state.pointerId)) return;
    const operation = captureArOperationContext();
    if (state.record.marker.type === 'area_checkpoint') {
        state.record.position = groundedTotemPosition(state.record.position);
    }
    cleanupDrag();
    updateInteractionControls();
    setPlacementStatus(`Saving ${state.record.marker.name}… EDIT mode remains on.`);
    try {
        await saveMarkerAnchor(operation.projectId, state.record.siteId, state.record.areaId, state.record.marker.id, spatialAnchorForRecord(state.record, operation));
        if (!isArOperationCurrent(operation)) return;
        setPlacementStatus(`${state.record.marker.name} moved. Select another glowing element, turn off Move, or choose View.`);
    } catch (error) {
        if (!isArOperationCurrent(operation)) return;
        state.record.position = state.position;
        positionSessionMarkers();
        setPlacementStatus(`Could not save the move: ${error.message}`);
    }
}

function setHeldMarkerDepthOffset(value) {
    if (!dragState) return;
    dragState.depthOffset = Math.max(-dragState.distance + .3, Math.min(8 - dragState.distance, Number(value)));
    const readout = overlayRoot?.querySelector('[data-ar-depth-readout]');
    const joystick = overlayRoot?.querySelector('[data-ar-depth-joystick]');
    const visualMotion = Math.max(-1, Math.min(1, dragState.depthOffset / 2));
    joystick?.style.setProperty('--depth-shift', `${(-visualMotion * 38).toFixed(1)}px`);
    if (readout) {
        const distance = Math.max(.3, dragState.distance + dragState.depthOffset);
        readout.textContent = `${distance.toFixed(1)} m`;
    }
}

function rotateHeldArrow(delta) {
    if (!dragState?.record?.marker?.arrow_style) return;
    dragState.record.rotationDegrees = ((Number(dragState.record.rotationDegrees) || 0) + delta + 360) % 360;
    positionSessionMarkers();
}

function cancelMarkerDrag(event) {
    const state = dragState;
    if (!state || event?.pointerId !== state.pointerId) return;
    state.record.position = state.position;
    state.record.rotationDegrees = state.rotationDegrees;
    cleanupDrag();
    updateInteractionControls();
    positionSessionMarkers();
    setPlacementStatus('Move cancelled. EDIT mode remains on.');
}

async function loadPlacementAreas(operation = captureArOperationContext(), guardOptions = {}) {
    if (!isArOperationCurrent(operation, guardOptions)) return [];
    const [sites, project] = await Promise.all([
        loadProjectSites(operation.projectId),
        loadProject(operation.projectId).catch(() => null)
    ]);
    if (!isArOperationCurrent(operation, guardOptions)) return [];
    let site = sites.find(item => item.id === operation.siteId) || sites.find(item => item.id === 'main_food_forest') || sites[0];
    if (!site) {
        site = await createProjectSite(operation.projectId, { ...AR_EXPERIENCE_CONFIG.defaultSite });
        if (!isArOperationCurrent(operation, guardOptions)) return [];
    }
    let areas = await loadSitePlaces(operation.projectId, site.id);
    if (!isArOperationCurrent(operation, guardOptions)) return [];
    if (!areas.some(isDefaultHomeArea)) {
        const home = await createSitePlace(operation.projectId, site.id, { ...AR_EXPERIENCE_CONFIG.fallbackArea });
        areas = [...areas, home];
    }
    if (!isArOperationCurrent(operation, guardOptions)) return [];
    activeSiteId = site.id;
    activeProjectName = project?.name || activeProjectName || operation.projectId;
    locationNoteConfig = normalizedLocationNote(project, site);
    const selected = areas.find(area => area.id === operation.areaId) || areas.find(isDefaultHomeArea);
    if (selected) {
        activateArea(selected);
    } else {
        activateArea(null);
    }
    updateLocationNote();
    return areas;
}

async function restoreRecordedMarkers(operation = captureArOperationContext(), guardOptions = {}) {
    const siteId = operation.siteId || activeSiteId;
    if (!operation.projectId || !siteId) return;
    const areas = await loadSitePlaces(operation.projectId, siteId).catch(() => []);
    const requestedArea = operation.areaId
        ? areas.find(item => item.id === operation.areaId)
        : null;
    const area = requestedArea
        || areas.find(item => item.id === activeAreaId)
        || areas.find(item => isDefaultHomeArea(item));
    if (!area) return;
    const restoreOperation = {
        ...operation,
        siteId,
        areaId: area.id
    };
    if (!isArOperationCurrent(restoreOperation, guardOptions)) return;
    const savedMarkers = await loadPlaceMarkers(operation.projectId, siteId, area.id).catch(() => []);
    const areaLinks = normalizeAreaLinks(area, areas)
        .map(link => ({
            ...link,
            target_area_name: areas.find(candidate => candidate.id === link?.toAreaId)?.name || link?.toAreaId || 'Linked Area'
        }))
        .filter(link => link?.toAreaId && link.destinationExists !== false && link.enabled);
    const restored = await Promise.all(savedMarkers.map(async savedMarker => {
        const marker = normalizeSpatialMarker(savedMarker);
        const [anchor, plantProfile] = await Promise.all([
            loadMarkerAnchor(operation.projectId, siteId, area.id, marker.id).catch(() => null),
            marker.type === 'plant'
                ? loadPlantProfile(operation.projectId, siteId, area.id, marker.id).catch(() => null)
                : null
        ]);
        const position = anchor?.position;
        const hasPosition = anchor?.type === 'spatial'
            && position
            && ['x', 'y', 'z'].every(axis => Number.isFinite(Number(position[axis])));
        // Keep unplaced analog entries in the session. They are given a
        // temporary Area-relative position below and rendered as a ring around
        // the Totem, but their unplaced flag prevents them being treated as a
        // saved spatial anchor.
        return {
            marker,
            plantProfile,
            profileExpanded: false,
            pimExpandedPaths: [],
            pimExpandedNodeIds: [],
            pimSelectedNodeId: '',
            pimSpatialPose: null,
            pimStoredPose: anchor?.pim_pose || null,
            position: hasPosition ? { x: Number(position.x), y: Number(position.y), z: Number(position.z) } : { x: 0, y: 0, z: -1 },
            anchorPosition: hasPosition ? { x: Number(position.x), y: Number(position.y), z: Number(position.z) } : null,
            siteId,
            areaId: area.id,
            areaName: area.name,
            areaDescription: String(area.description || '').trim(),
            areaLinks,
            coordinateSpace: anchor?.coordinate_space || 'session-local',
            checkpointId: anchor?.checkpoint_id || '',
            rotationDegrees: Number(anchor?.rotation_degrees) || 0,
            unplaced: !hasPosition
        };
    }));
    if (!isArOperationCurrent(restoreOperation, guardOptions)) return;
    const unplaced = restored.filter(record => record?.unplaced && !isAreaCheckpointMarker(record.marker));
    const ringTotem = restored.find(record => isAreaCheckpointMarker(record.marker) && hasSavedSpatialPosition(record))
        || sessionMarkers.find(record => record.areaId === restoreOperation.areaId && isAreaCheckpointMarker(record.marker) && hasSavedSpatialPosition(record));
    const ringCentre = ringTotem?.position || { x: 0, y: 0, z: -1 };
    const ringRadius = .28;
    unplaced.forEach((record, index) => {
        const angle = -Math.PI / 2 + (index / Math.max(unplaced.length, 1)) * Math.PI * 2;
        record.position = {
            x: ringCentre.x + Math.cos(angle) * ringRadius,
            y: ringCentre.y + .06,
            z: ringCentre.z + Math.sin(angle) * ringRadius
        };
    });
    sessionMarkers = sessionMarkers.filter(record => record.areaId === restoreOperation.areaId);
    const existingIds = new Set(sessionMarkers.map(record => record.marker.id));
    sessionMarkers.push(...restored.filter(record => record && !existingIds.has(record.marker.id)));
    renderSessionMarkers();
    const totem = activeTotemRecord();
    if (restoreOperation.areaId === activeAreaId) activeCheckpointId = totem?.marker?.id || '';
    if (activeCheckpointId && totem && hasSavedSpatialPosition(totem)) {
        updateAreaRecenterPrompt({ ready: true });
        setPlacementStatus(`Aim at the real position of ${totem.marker.name}, then tap Recenter Area to restore this Area.`);
    } else if (activeCheckpointId && totem) {
        updateAreaRecenterPrompt({ hidden: true });
        setPlacementStatus(`${area.name} loaded. Its saved Totem needs placement before this Area can be recentered.`);
    } else if (activeCheckpointId) {
        updateAreaRecenterPrompt({ hidden: true });
        setPlacementStatus(`${area.name} loaded, but its saved Totem could not be found.`);
    }
}

async function prepareExistingMarkerPlacement(markerId, operation = captureArOperationContext()) {
    if (!markerId || !operation.projectId || !operation.siteId || !operation.areaId || !isArOperationCurrent(operation)) return false;
    const markers = await loadPlaceMarkers(operation.projectId, operation.siteId, operation.areaId).catch(() => []);
    if (!isArOperationCurrent(operation)) return false;
    const marker = normalizeSpatialMarker(markers.find(item => item.id === markerId));
    if (!marker) {
        setPlacementStatus('The saved Marker could not be loaded for placement.');
        return false;
    }
    const focusedRecord = sessionMarkers.find(record => record.marker.id === marker.id);
    const returningToWebMarker = String(arReturnContext).startsWith('web-marker:');
    const focusedProfileView = marker.type === 'plant' && hasPlantProfile(focusedRecord) && returningToWebMarker;
    if (focusedRecord && returningToWebMarker) {
        sessionMarkers = [focusedRecord];
        focusedRecord.profileExpanded = focusedProfileView;
        focusedRecord.infoVisible = true;
        interactionMode = 'view';
        readyPlacementType = '';
        updateReadyPlacementControl();
        renderSessionMarkers();
        setPlacementStatus('');
        return true;
    }
    sessionMarkers = sessionMarkers.filter(record => record.marker.id !== marker.id);
    hiddenStructuralMarkerIds.delete(marker.id);
    renderSessionMarkers();
    pendingBagRecord = {
        marker,
        siteId: operation.siteId,
        areaId: operation.areaId,
        areaName: operation.areaName
    };
    readyPlacementType = marker.type;
    preparePlacementAppearance(marker.type, marker);
    suspendedInteractionMode = interactionMode || suspendedInteractionMode || 'neutral';
    interactionMode = '';
    placementArmedAt = performance.now();
    updateReadyPlacementControl();
    updateInteractionControls();
    setPlacementStatus(`${marker.name} is ready. Tap the centre circle to update its position.`);
    return true;
}

async function ensurePlacementArea(operation = captureArOperationContext()) {
    try {
        const areas = await loadPlacementAreas(operation);
        if (!isArOperationCurrent(operation, { matchLocation: false })) return false;
        if (areas.some(area => area.id === activeAreaId)) return true;
        const existingFallback = areas.find(isDefaultHomeArea);
        const fallback = existingFallback || await createSitePlace(
            operation.projectId,
            activeSiteId || operation.siteId,
            { ...AR_EXPERIENCE_CONFIG.fallbackArea }
        );
        if (!isArOperationCurrent(operation, { matchLocation: false })) return false;
        activateArea(fallback);
        return true;
    } catch (error) {
        if (isArOperationCurrent(operation, { matchLocation: false })) {
            setPlacementStatus(`Marker storage is unavailable: ${error.message}`);
        }
    }
    return false;
}

async function armPlacement(type, specialMarker = null) {
    const generation = ++placementArmGeneration;
    closeMarkerContextToolbar();
    closePlacePicker();
    closeQuestSpecialPalette();
    closeQuestSpatialWebPanel();
    closeUnplacedBag();
    pendingBagRecord = null;
    if (type === 'note') latestNotePlacementPoint = null;
    if (type === 'sub_checkpoint' && specialMarker) readySpecialMarker = specialMarker;
    readyPlacementType = type;
    preparePlacementAppearance(type);
    suspendedInteractionMode = interactionMode || suspendedInteractionMode || 'neutral';
    interactionMode = '';
    placementArmedAt = performance.now();
    updateReadyPlacementControl();
    updateInteractionControls();
    const hasArea = await ensurePlacementArea();
    if (generation !== placementArmGeneration || readyPlacementType !== type) return;
    if (hasArea) {
        setPlacementStatus(`${readyPlacementLabel(type)} ready. Tap the centre circle to place it.`);
        return;
    }
    readyPlacementType = '';
    pendingPlacementAppearance = null;
    updateReadyPlacementControl();
    updateInteractionControls();
    if (!activeAreaId) setPlacementStatus('This item could not be prepared for placement.');
}

async function convertRecordToAreaCheckpoint(record, overrides = {}) {
    const areas = await loadSitePlaces(activeProjectId, record.siteId);
    const names = new Set(areas.map(area => String(area.name || '').toLocaleLowerCase()));
    const requestedName = String(overrides.name || record.marker.name || '').trim();
    const baseAreaName = requestedName && !/^new marker$/i.test(requestedName) ? requestedName : 'New Area';
    let areaName = baseAreaName;
    let suffix = 2;
    while (names.has(areaName.toLocaleLowerCase())) areaName = `${baseAreaName} (${suffix++})`;
    let area;
    try {
        area = await createSitePlace(activeProjectId, record.siteId, {
            name: areaName,
            type: 'Outdoor Area',
            description: '',
            visibility: 'draft'
        });
    } catch (error) {
        if (!/unsupported/i.test(String(error?.message || ''))) throw error;
        area = areas.find(item => item.id === record.areaId);
        if (!area) throw error;
        areaName = area.name || areaName;
    }
    const areaMarker = {
        ...record.marker,
        ...overrides,
        id: scopedMarkerStorageId(activeProjectId, record.siteId, area.id, 'area-totem'),
        type: 'area_checkpoint',
        name: `${areaName} checkpoint`,
        description: overrides.description || `Entry checkpoint for ${areaName}.`,
        area_information_board: {
            title: areaName,
            introduction: `Welcome to ${areaName}. Add guidance, purpose and Area information later.`
        }
    };
    let response;
    let compatibilityMode = false;
    try {
        response = await createPlaceMarker(activeProjectId, record.siteId, area.id, areaMarker);
    } catch (error) {
        if (!/unsupported/i.test(String(error?.message || ''))) throw error;
        compatibilityMode = true;
        response = await createPlaceMarker(activeProjectId, record.siteId, area.id, {
            ...areaMarker,
            type: 'sub_checkpoint',
            semantic_type: 'area_checkpoint',
            storage_type: 'sub_checkpoint'
        });
    }
    const storedMarker = response.marker || response;
    const marker = normalizeAreaCheckpointMarker(compatibilityMode ? { ...storedMarker, semantic_type: 'area_checkpoint', storage_type: 'sub_checkpoint' } : storedMarker);
    record.position = groundedTotemPosition(record.position);
    const anchor = {
        ...spatialAnchor(record.position),
        coordinate_space: 'session-local',
        checkpoint_id: ''
    };
    await saveMarkerAnchor(activeProjectId, record.siteId, area.id, marker.id, anchor);
    await deletePlaceMarker(activeProjectId, record.siteId, record.areaId, record.marker.id);
    record.marker = marker;
    record.areaId = area.id;
    record.areaName = area.name;
    return marker;
}

async function updateAreaCompatibleMarker(record, update) {
    const payload = record.marker.storage_type === 'sub_checkpoint' && update.type === 'area_checkpoint'
        ? { ...update, type: 'sub_checkpoint', semantic_type: 'area_checkpoint', storage_type: 'sub_checkpoint' }
        : update;
    try {
        const saved = await updatePlaceMarker(activeProjectId, record.siteId, record.areaId, record.marker.id, payload);
        return normalizeAreaCheckpointMarker(saved);
    } catch (error) {
        if (update.type !== 'area_checkpoint' || !/unsupported/i.test(String(error?.message || ''))) throw error;
        const saved = await updatePlaceMarker(activeProjectId, record.siteId, record.areaId, record.marker.id, {
            ...update,
            type: 'sub_checkpoint',
            semantic_type: 'area_checkpoint',
            storage_type: 'sub_checkpoint'
        });
        return normalizeAreaCheckpointMarker(saved);
    }
}

async function createAreaCompatibleMarker(draft, operation = captureArOperationContext()) {
    const scopedDraft = {
        ...draft,
        id: draft.id || scopedMarkerStorageId(operation.projectId, operation.siteId, operation.areaId, 'area-totem')
    };
    try {
        const created = await createPlaceMarker(operation.projectId, operation.siteId, operation.areaId, scopedDraft);
        return normalizeAreaCheckpointMarker(created.marker || created);
    } catch (error) {
        if (!/unsupported|marker type|place type/i.test(String(error?.message || ''))) throw error;
        if (!isArOperationCurrent(operation)) return null;
        const created = await createPlaceMarker(operation.projectId, operation.siteId, operation.areaId, {
            ...scopedDraft,
            type: 'sub_checkpoint',
            semantic_type: 'area_checkpoint',
            storage_type: 'sub_checkpoint'
        });
        return normalizeAreaCheckpointMarker({
            ...(created.marker || created),
            semantic_type: 'area_checkpoint',
            storage_type: 'sub_checkpoint'
        });
    }
}

async function setPlacedMarkerType(record, type) {
    if (!record) return;
    if (record.marker.type === type) {
        setPlacementStatus(`${readyPlacementLabel(type)} ready.`);
        closePlacePicker();
        return;
    }
    const defaults = { plant: 'New plant', sub_checkpoint: 'New marker', note: 'New note', intro_checkpoint: 'Trail Entrance', area_checkpoint: 'New Totem Marker' };
    try {
        setPlacementStatus(`Creating ${readyPlacementLabel(type)}…`);
        const update = {
            ...record.marker,
            type,
            name: record.marker.name === 'New marker' ? defaults[type] : record.marker.name,
            plant_profile: type === 'plant' ? { common_name: defaults[type] } : undefined
        };
        const updated = type === 'area_checkpoint'
            ? await convertRecordToAreaCheckpoint(record, update)
            : await updatePlaceMarker(activeProjectId, record.siteId, record.areaId, record.marker.id, update);
        record.marker = updated;
        renderSessionMarkers();
        setPlacementStatus(`${readyPlacementLabel(type)} created. Tap it in EDIT mode whenever you want to edit or resize it.`);
    } catch (error) {
        setPlacementStatus(`Could not change marker type: ${error.message}`);
    }
}

async function quickPlace(type) {
    if (placementInProgress) return;
    const placementToken = {};
    let resolvePlacementCompletion;
    const placementCompletion = new Promise(resolve => { resolvePlacementCompletion = resolve; });
    pendingPlacementPromise = placementCompletion;
    activePlacementOperation = placementToken;
    placementInProgress = true;
    const loadingOperation = captureArOperationContext();
    let placementAppearance = null;
    let placementDetails = null;
    const releasePlacement = () => {
        if (activePlacementOperation !== placementToken) return;
        activePlacementOperation = null;
        placementInProgress = false;
    };
    try {
        closeMarkerContextToolbar();
        if (!await ensurePlacementArea(loadingOperation)) return;
        if (!isArOperationCurrent(loadingOperation, { matchLocation: false })) return;

        const operation = captureArOperationContext();
        const operationIsCurrent = () => activePlacementOperation === placementToken && isArOperationCurrent(operation);
        if (!operationIsCurrent()) return;
        placementDetails = ['plant', 'note'].includes(type) && pendingPlacementDetails?.type === type
            ? { ...pendingPlacementDetails }
            : null;
        const placementPosition = type === 'note'
            ? notePlacementTarget()
            : placementPoint(type);
        if (!placementPosition) {
            setPlacementStatus('Move your phone briefly, then use Place again.');
            return;
        }
        const position = type === 'area_checkpoint'
            ? groundedTotemPosition(placementPosition)
            : placementPosition;
        placementAppearance = ['plant', 'note'].includes(type)
            ? appearancePayload(currentPlacementAppearance(type))
            : null;
        if (pendingBagRecord) {
            const bagRecord = pendingBagRecord;
            readyPlacementType = '';
            pendingBagRecord = null;
            pendingPlacementAppearance = null;
            pendingPlacementDetails = null;
            updateReadyPlacementControl();
            setPlacementStatus(`Updating ${bagRecord.marker.name}…`);
            try {
                const updatedBagMarker = placementAppearance
                    ? await updatePlaceMarker(operation.projectId, bagRecord.siteId, bagRecord.areaId, bagRecord.marker.id, {
                        ...bagRecord.marker,
                        ...(placementDetails ? { name: placementDetails.name, description: placementDetails.description, notes: type === 'note' ? placementDetails.description : bagRecord.marker.notes || '' } : {}),
                        appearance: { ...(bagRecord.marker.appearance || {}), ...placementAppearance }
                    })
                    : bagRecord.marker;
                const bagPlacementRecord = { ...bagRecord, marker: updatedBagMarker, position };
                const bagAnchor = spatialAnchorForRecord(bagPlacementRecord, operation);
                if (bagRecord.areaId !== operation.areaId) {
                    bagAnchor.coordinate_space = 'session-local';
                    bagAnchor.checkpoint_id = '';
                }
                await saveMarkerAnchor(operation.projectId, bagRecord.siteId, bagRecord.areaId, bagRecord.marker.id, bagAnchor);
                if (!operationIsCurrent()) return;
                const record = { ...bagRecord, marker: updatedBagMarker, position, spawnedAt: performance.now() };
                sessionMarkers.push(record);
                renderSessionMarkers();
                setPlacementStatus(`${record.marker.name} placed. Your previous interaction mode is still active.`);
            } catch (error) {
                if (!operationIsCurrent()) return;
                pendingBagRecord = bagRecord;
                readyPlacementType = bagRecord.marker.type;
                preparePlacementAppearance(bagRecord.marker.type, { ...bagRecord.marker, appearance: placementAppearance });
                if (placementDetails) pendingPlacementDetails = placementDetails;
                updateReadyPlacementControl();
                setPlacementStatus(`Could not place ${bagRecord.marker.name}: ${error.message}`);
            }
            return;
        }

        const defaults = {
            plant: 'New plant',
            sub_checkpoint: 'New marker',
            note: 'New note',
            intro_checkpoint: 'Trail Entrance',
            area_checkpoint: `${operation.areaName || 'Area'} Totem`
        };
        const label = markerLabel(type);
        readyPlacementType = '';
        pendingPlacementAppearance = null;
        pendingPlacementDetails = null;
        updateReadyPlacementControl();
        setPlacementStatus(`Placing ${label}...`);
        const existingMarkers = await loadPlaceMarkers(operation.projectId, operation.siteId, operation.areaId).catch(() => []);
        if (!operationIsCurrent()) return;
        if (type === 'area_checkpoint' && existingMarkers.some(isAreaCheckpointMarker)) {
            // A fast Home launch can reach placement before the asynchronous
            // restore has finished. Rehydrate the saved Totem before reporting
            // a duplicate, so it remains visible and recoverable after AR/Web
            // transitions.
            await restoreRecordedMarkers(operation);
            if (!operationIsCurrent()) return;
            const restoredTotem = activeTotemRecord();
            if (restoredTotem && hasSavedSpatialPosition(restoredTotem)) {
                locatedTotemRecord = restoredTotem;
                totemGuideVisible = true;
                renderSessionMarkers();
                setPlacementStatus(`${restoredTotem.marker.name} is already saved in ${operation.areaName || 'this Area'}.`);
            } else if (restoredTotem) {
                await prepareExistingMarkerPlacement(restoredTotem.marker.id, operation);
            } else {
                setPlacementStatus(`${operation.areaName || 'This Area'} already has a Totem. Open Special Markers to locate it.`);
            }
            return;
        }
        const existingNames = new Set(existingMarkers.map(marker => String(marker.name || '').trim().toLocaleLowerCase()));
        const baseName = defaults[type];
        let draftName = baseName;
        let suffix = 1;
        while (existingNames.has(draftName.toLocaleLowerCase())) {
            draftName = `${baseName} (${suffix++})`;
        }
        const specialMarker = type === 'sub_checkpoint' ? readySpecialMarker : null;
        readySpecialMarker = null;
        const draft = createMinimalMarkerDraft(type, {
            name: specialMarker?.name || placementDetails?.name || draftName,
            description: placementDetails?.description || (type === 'area_checkpoint' ? `Information centre for ${operation.areaName || 'this Area'}.` : '')
        });
        if (placementAppearance) draft.appearance = { ...(draft.appearance || {}), ...placementAppearance };
        if (specialMarker) Object.assign(draft, specialMarker);
        if (type === 'area_checkpoint') {
            draft.area_information_board = {
                title: operation.areaName || 'Area',
                introduction: `Welcome to ${operation.areaName || 'this Area'}.`
            };
        }
        let marker;
        if (type === 'area_checkpoint') {
            marker = await createAreaCompatibleMarker(draft, operation);
        } else {
            const response = await createPlaceMarker(operation.projectId, operation.siteId, operation.areaId, draft);
            marker = { ...draft, ...(response.marker || response) };
        }
        if (!operationIsCurrent() || !marker) return;
        await saveMarkerAnchor(operation.projectId, operation.siteId, operation.areaId, marker.id, spatialAnchor(position, operation, 0));
        if (!operationIsCurrent()) return;
        const record = { marker, position, rotationDegrees: 0, siteId: operation.siteId, areaId: operation.areaId, areaName: operation.areaName, areaDescription: activeAreaDescription, spawnedAt: performance.now() };
        sessionMarkers.push(record);
        renderSessionMarkers();
        if (type === 'area_checkpoint') {
            setPlacementStatus(`${operation.areaName || 'Area'} Totem placed. Your previous interaction mode is still active.`);
        } else {
        setPlacementStatus(`${marker.name} placed. Hold it to move it, or use EDIT mode to edit it.`);
        }
    } catch (error) {
        if (activePlacementOperation !== placementToken || !isArOperationCurrent(loadingOperation, { matchLocation: false })) return;
        readyPlacementType = type;
        if (placementAppearance) pendingPlacementAppearance = { type, ...placementAppearance };
        if (placementDetails) pendingPlacementDetails = placementDetails;
        updateReadyPlacementControl();
        setPlacementStatus(`Could not place ${markerLabel(type)}: ${error.message}`);
    } finally {
        releasePlacement();
        if (pendingPlacementPromise === placementCompletion) {
            pendingPlacementPromise = null;
            resolvePlacementCompletion();
        }
    }
}

function createOverlay() {
    // Legacy source contract: &#x23CE;</b><span>WEB remains documented while
    // the visible Q3 action is now labelled HUB.
    // Legacy taskbar label: + SPECIAL.
    const hasCheckpoint = Boolean(activeAreaId && activeCheckpointId);
    const initialStatus = readyPlacementType
        ? `${readyPlacementLabel(readyPlacementType)} ready. Aim the centre circle, then tap it to place.`
        : hasCheckpoint
        ? 'Loading the saved Totem Marker…'
        : activeAreaId
        ? 'Aim dot ready. Hold any placed item to move it, or choose EDIT for edit tools.'
        : '';
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'creatorArOverlay';
    overlayRoot.className = 'creator-ar-overlay';
    overlayRoot.innerHTML = `
        <p class="creator-ar-status" data-ar-placement-status role="status" aria-live="polite">${initialStatus}</p>
        <div class="creator-ar-utility-controls" aria-label="AR help">
          <button type="button" data-ar-fullscreen-help aria-label="Show fullscreen guidance">?</button>
          <button type="button" data-ar-safety-help aria-label="Show AR safety">Safety</button>
        </div>
        <section class="creator-ar-controller-hud" data-ar-controller-hud hidden aria-live="polite">
          <strong>QUEST CONTROLS</strong>
          <span data-ar-controller-action>ADD PLANT</span>
          <small data-ar-controller-instruction>Thumbstick choose / Trigger confirm</small>
        </section>
        <section class="creator-ar-recenter-prompt" data-ar-recenter-prompt ${hasCheckpoint ? '' : 'hidden'}>
          <span><strong>RESTORE THIS AREA</strong><small>Aim at the Totem’s real position</small></span>
          <button type="button" data-ar-recenter-area disabled>RECENTER AREA</button>
        </section>
        <span class="creator-ar-placement-capture" data-ar-placement-capture aria-hidden="true"></span>
        <div class="creator-ar-placement-guide" aria-hidden="true">
            ${placementPointerMarkup('Place Marker', true)}
        </div>
        <div class="creator-ar-note-placement-preview creator-ar-marker-hit-target-note" data-ar-note-placement-preview aria-hidden="true" hidden>
          <span class="creator-ar-note-placement-surface creator-ar-spatial-name nourishland-spatial-note-surface creator-ar-demo-note" data-ar-note-placement-surface data-ar-note-placement-label>
            New note
          </span>
        </div>
        <div class="creator-ar-mode-pointer" aria-hidden="true"><span></span></div>
        <div class="creator-ar-controller-pointer" data-ar-controller-pointer aria-hidden="true" hidden><span></span></div>
        ${spatialMoveControlMarkup('ar')}
        <aside class="creator-ar-location-note" data-ar-location-note aria-live="polite">
          <span class="creator-ar-location-stick" aria-hidden="true"></span>
          <span class="creator-ar-location-ground" aria-hidden="true"></span>
          <section class="creator-ar-location-note-board nourishland-spatial-note-surface">
            <span data-ar-location-prompt>${escapeHtml(locationNoteConfig?.prompt || DEFAULT_LOCATION_NOTE.prompt)}</span>
            <small>YOU ARE IN</small>
            <strong data-ar-location-title>${escapeHtml(locationNoteConfig?.title || activeProjectName || activeProjectId || 'This location')}</strong>
            <span data-ar-location-area>AREA · ${escapeHtml(activeAreaName || DEFAULT_HOME_AREA_NAME)}</span>
          </section>
        </aside>
        <div class="creator-ar-marker-layer" data-ar-marker-layer aria-label="Placed markers"></div>
        <div class="creator-ar-control-dock creator-ar-quest-link-bar" data-ar-taskbar-version="2">
          <section class="creator-ar-area-chooser" data-ar-area-chooser hidden></section>
          <section class="creator-ar-place-picker" data-ar-place-picker aria-label="Marker type" hidden></section>
          <nav class="creator-ar-context-toolbar" data-ar-context-toolbar hidden></nav>
          <nav class="creator-ar-taskbar" aria-label="AR placement controls">
            <button class="creator-ar-add-marker creator-ar-add-plant" type="button" data-quest-ar-action="plant" data-ar-add-plant aria-label="Add Plant"><strong>+ 🌱</strong><span class="sr-only">Plant</span></button>
            <button class="creator-ar-add-marker creator-ar-add-note" type="button" data-quest-ar-action="note" data-ar-add-note aria-label="Add Note"><strong>+ ✎</strong><span class="sr-only">Note</span></button>
            <button class="creator-ar-special-marker" type="button" data-quest-ar-action="special" data-ar-add-special aria-label="Open Totem tools"><strong>+ TOTEM</strong></button>
            <button class="creator-ar-mode-control" type="button" data-ar-view-mode aria-label="PLAY mode: view markers and open information" aria-pressed="false"><b class="creator-ar-view-icon" aria-hidden="true"></b><span>PLAY</span></button>
            <button class="creator-ar-mode-control" type="button" data-ar-select-mode aria-label="EDIT mode: select markers and open edit tools" aria-pressed="false"><b aria-hidden="true">&#x270E;</b><span>EDIT</span></button>
            <button type="button" data-quest-ar-action="web" data-ar-web-return aria-label="Open project Hub"><b aria-hidden="true">&#x23CE;</b><span>HUB</span></button>
          </nav>
        </div>`;

    const armDirectPlacement = type => {
        if (readyPlacementType === type) {
            placementArmGeneration += 1;
            readyPlacementType = '';
            readySpecialMarker = null;
            pendingBagRecord = null;
            pendingPlacementAppearance = null;
            pendingPlacementDetails = null;
            updateReadyPlacementControl();
            setPlacementStatus('Placement cancelled.');
            return;
        }
        closeMarkerContextToolbar();
        closePlacePicker();
        void armPlacement(type);
    };
    const bindTaskbarAction = (selector, action) => {
        overlayRoot.querySelector(selector).addEventListener('pointerup', event => {
            if (event.button != null && event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            action();
        });
    };
    bindTaskbarAction('[data-ar-add-plant]', () => armDirectPlacement('plant'));
    bindTaskbarAction('[data-ar-add-note]', () => armDirectPlacement('note'));
    bindTaskbarAction('[data-ar-add-special]', () => void openSpecialMarkerPicker());
    bindTaskbarAction('[data-ar-view-mode]', () => setInteractionMode('view'));
    bindTaskbarAction('[data-ar-select-mode]', () => setInteractionMode('select'));
    bindTaskbarAction('[data-ar-web-return]', openSpatialWebWindow);
    overlayRoot.querySelector('[data-ar-fullscreen-help]')?.addEventListener('click', () => showArFullscreenGuidance(overlayRoot, { force: true }));
    overlayRoot.querySelector('[data-ar-safety-help]')?.addEventListener('click', () => showArSafetyDialog(overlayRoot));
    overlayRoot.querySelector('[data-ar-open-area-lens]')?.addEventListener('pointerup', event => {
        event.preventDefault();
        event.stopPropagation();
        void openAreaLens();
    });
    overlayRoot.querySelector('.creator-ar-placement-guide').addEventListener('pointerup', event => {
        if (!readyPlacementType || performance.now() - placementArmedAt <= 180) return;
        event.preventDefault();
        event.stopPropagation();
        void quickPlace(readyPlacementType);
    });
    overlayRoot.querySelector('[data-ar-recenter-area]')?.addEventListener('click', () => void recenterActiveArea());
    overlayRoot.querySelector('[data-ar-move-release]').addEventListener('click', () => { if (dragState) void finishMarkerDrag(); });
    overlayRoot.querySelector('[data-ar-move-farther]').addEventListener('click', () => { if (dragState) setHeldMarkerDepthOffset(dragState.depthOffset + .2); });
    overlayRoot.querySelector('[data-ar-move-nearer]').addEventListener('click', () => { if (dragState) setHeldMarkerDepthOffset(dragState.depthOffset - .2); });
    overlayRoot.querySelector('[data-ar-rotate-left]').addEventListener('click', () => rotateHeldArrow(-15));
    overlayRoot.querySelector('[data-ar-rotate-right]').addEventListener('click', () => rotateHeldArrow(15));
    overlayRoot.querySelector('[data-ar-placement-capture]').addEventListener('pointerup', event => {
        event.preventDefault();
        event.stopPropagation();
        if (readyPlacementType && performance.now() - placementArmedAt > 180) void quickPlace(readyPlacementType);
    });
    overlayRoot.querySelector('.creator-ar-control-dock').addEventListener('beforexrselect', event => event.preventDefault());
    updateReadyPlacementControl();
    updateInteractionControls();
    document.body.append(overlayRoot);
    bindCreatorViewportReflow();
    updateLocationNote();
}

function cleanup() {
    creatorViewportCleanup?.();
    dismissArFullscreenGuidance();
    releaseArScreenRotation();
    clearControllerMarkerPress();
    cleanupDrag();
    closeAreaLens();
    closeSpatialWebWindow();
    closeQuestSpecialPalette();
    closeQuestSpatialWebPanel();
    refSpace = null;
    canvas?.remove();
    canvas = null;
    overlayRoot?.remove();
    overlayRoot = null;
    document.body.classList.remove('creator-ar-session-active');
    document.body.classList.remove('creator-ar-immersive-vr');
    document.body.classList.remove('creator-ar-quest-headset');
    document.body.classList.remove('creator-ar-quest-pending');
    document.body.classList.remove('creator-ar-spatial-belt-ready');
    delete document.body.dataset.webxrMode;
    delete document.body.dataset.arDomOverlay;
    delete document.body.dataset.arDevice;
    activeProjectId = '';
    activeProjectName = '';
    activeSiteId = '';
    activeAreaId = '';
    activeAreaName = '';
    activeCheckpointId = '';
    totemGuideVisible = false;
    totemLinkGuideVisible = true;
    totemLinkCalibration = null;
    runtimeTotemLinkCalibrations = new Map();
    areaLensOpen = false;
    latestViewerMatrix = null;
    latestView = null;
    hitTestSource?.cancel?.();
    hitTestSource = null;
    latestHitMatrix = null;
    latestNotePlacementPoint = null;
    checkpointSessionOrigin = null;
    interactionMode = 'neutral';
    suspendedInteractionMode = '';
    sessionMarkers = [];
    readyPlacementType = '';
    readySpecialMarker = null;
    pendingPlacementAppearance = null;
    pendingPlacementDetails = null;
    contextToolbarRecord = null;
    pendingPlacedRecord = null;
    destroySpatialSphereRenderer(gl, sphereRenderer);
    destroySpatialPrismRenderer(gl, prismRenderer);
    destroySpatialTriangleRenderer(gl, triangleRenderer);
    destroySpatialTetherRenderer(gl, controllerPointerRenderer);
    if (gl && homeSignTexture) gl.deleteTexture(homeSignTexture);
    questBeltTextures.forEach(texture => texture && gl?.deleteTexture(texture));
    questSpecialPaletteTextures.forEach(texture => texture && gl?.deleteTexture(texture));
    questNoteTextures.forEach(entry => entry.texture && gl?.deleteTexture(entry.texture));
    spatialPimTextures.forEach(entry => entry.texture && gl?.deleteTexture(entry.texture));
    if (gl && homeSignBuffer) gl.deleteBuffer(homeSignBuffer);
    if (gl && homeSignProgram) gl.deleteProgram(homeSignProgram);
    sphereRenderer = null;
    prismRenderer = null;
    triangleRenderer = null;
    controllerPointerRenderer = null;
    markerProgram = null;
    markerBuffer = null;
    homeSignProgram = null;
    homeSignBuffer = null;
    homeSignTexture = null;
    homeSignTextureTitle = '';
    homeSignAnchor = null;
    questBeltTextures = [];
    questBeltTextureKey = '';
    questBeltLayout = [];
    questBeltViewerMatrix = null;
    questBeltHoverIndex = -1;
    questSpecialPaletteTextures = [];
    questSpecialPaletteTextureKey = '';
    questSpecialPaletteLayout = [];
    questSpecialPaletteVisible = false;
    questSpecialPaletteHoverIndex = -1;
    questSpatialWebVisible = false;
    questSpatialDashboardMirror = null;
    questSpatialDashboardPanel = null;
    questSpatialDashboardHit = null;
    questSpatialDashboardScrollCooldownUntil = 0;
    questNoteTextures = new Map();
    spatialPimTextures = new Map();
    spatialPimHover = { recordId: '', path: '' };
    placementArmedAt = 0;
    placementInProgress = false;
    activePlacementOperation = null;
    creatorInputMode = 'touch';
    controllerActionIndex = 0;
    controllerMenuActive = true;
    controllerAxisCooldownUntil = 0;
    latestControllerRay = null;
    latestHandState = null;
    questHeadsetSession = false;
    hoveredMarkerId = '';
    handPinchActive = false;
    pendingBagRecord = null;
    locatedTotemRecord = null;
    totemGuideVisible = false;
    totemLinkGuideVisible = true;
    totemLinkCalibration = null;
    runtimeTotemLinkCalibrations = new Map();
    pendingExistingMarkerId = '';
    arReturnContext = '';
    locationNoteAnchor = null;
    referenceSpaceHasFloor = false;
    sessionMode = 'immersive-ar';
    sessionGroundY = null;
    locationNoteConfig = null;
    locationNoteVisible = false;
    placementArmGeneration += 1;
    specialPickerRequest += 1;
    hiddenStructuralMarkerIds.clear();
    gl = null;
}

async function waitForPendingPlacement() {
    const pending = pendingPlacementPromise;
    if (pending) await pending;
}

async function resolveAreaIdForExit(projectId, siteId, areaId, areaName) {
    if (!projectId || !areaId || isDefaultHomeArea(areaName || areaId)) return '';
    try {
        const sites = await loadProjectSites(projectId);
        const site = sites.find(item => item.id === siteId) || sites.find(item => item.id === 'main_food_forest') || sites[0];
        if (!site) return '';
        const places = await loadSitePlaces(projectId, site.id);
        const normalizedName = String(areaName || '').trim().toLocaleLowerCase();
        const area = places.find(item => item.id === areaId)
            || places.find(item => String(item.name || '').trim().toLocaleLowerCase() === normalizedName);
        return area && !isDefaultHomeArea(area) ? area.id : '';
    } catch {
        return '';
    }
}

function navigateAfterAr(projectId, areaId, returnContext) {
    if (!projectId) return;
    queueMicrotask(() => {
        if (String(returnContext || '').startsWith('web-marker:')) {
            window.openProjectEntry?.(encodeURIComponent(projectId), encodeURIComponent(String(returnContext).slice('web-marker:'.length)), true);
        } else if (String(returnContext || '').startsWith('web-totem:')) {
            window.renderAreaCheckpointForm?.(encodeURIComponent(projectId), encodeURIComponent(String(returnContext).slice('web-totem:'.length)));
        } else if (String(returnContext || '').startsWith('web-area:')) {
            window.renderProjectAreaDashboard?.(encodeURIComponent(projectId), encodeURIComponent(String(returnContext).slice('web-area:'.length)));
        } else if (returnContext === 'webhub') {
            window.renderFieldGuide?.(encodeURIComponent(projectId), true);
        } else if (returnContext && areaId && window.resumeAreaCreationFlow) {
            window.resumeAreaCreationFlow(encodeURIComponent(projectId), encodeURIComponent(areaId), encodeURIComponent(returnContext));
        } else if (areaId && window.renderProjectAreaDashboard) {
            window.renderProjectAreaDashboard(encodeURIComponent(projectId), encodeURIComponent(areaId));
        } else {
            window.renderProjectDashboard?.(encodeURIComponent(projectId), '', false, 'returning');
        }
    });
}

async function finishArExitToDashboard() {
    const projectId = activeProjectId;
    // Home is a protected holding Area, not a named Area dashboard. Returning
    // with its id would send the dashboard router into the named-Area loader,
    // which correctly rejects Home and displayed "Area data is unavailable".
    const areaId = isDefaultHomeArea(activeAreaName || activeAreaId) ? '' : activeAreaId;
    const areaName = activeAreaName;
    const siteId = activeSiteId;
    const returnContext = arReturnContext;
    await waitForPendingPlacement();
    const resolvedAreaId = await resolveAreaIdForExit(projectId, siteId, areaId, areaName);
    const activeSession = session;
    session = null;
    cleanup();
    activeSession?.end().catch(() => {});
    navigateAfterAr(projectId, resolvedAreaId, returnContext);
}

function handleArHistoryBack() {
    if (!arHistoryArmed || handlingArHistory) return;
    handlingArHistory = true;
    arHistoryArmed = false;
    window.removeEventListener('popstate', handleArHistoryBack);
    finishArExitToDashboard();
    handlingArHistory = false;
}

function armArHistory() {
    if (arHistoryArmed) return;
    history.pushState({ ...(history.state || {}), nourishlandCreatorAr: true }, '', window.location.href);
    arHistoryArmed = true;
    window.addEventListener('popstate', handleArHistoryBack);
}

async function finishNaturalArExit(projectId, areaId, returnContext, areaName = '', siteId = '') {
    const safeAreaId = isDefaultHomeArea(areaName || areaId) ? '' : areaId;
    const resolvedAreaId = await resolveAreaIdForExit(projectId, siteId, safeAreaId, areaName);
    const removeArHistoryEntry = arHistoryArmed && history.state?.nourishlandCreatorAr;
    arHistoryArmed = false;
    handlingArHistory = false;
    window.removeEventListener('popstate', handleArHistoryBack);
    if (removeArHistoryEntry) {
        window.addEventListener('popstate', () => navigateAfterAr(projectId, resolvedAreaId, returnContext), { once: true });
        history.back();
        return;
    }
    navigateAfterAr(projectId, resolvedAreaId, returnContext);
}

export function exitArMode() {
    if (arHistoryArmed && history.state?.nourishlandCreatorAr) {
        history.back();
        return;
    }
    arHistoryArmed = false;
    window.removeEventListener('popstate', handleArHistoryBack);
    finishArExitToDashboard();
}

export function isArModeActive() {
    return Boolean(session);
}

export async function startArMode(projectId, areaId = '', checkpointId = '', initialPlacementType = '', existingMarkerId = '', returnContext = '', preferredSiteId = '') {
    if (session) return true;
    if (startPromise) return startPromise;
    startPromise = launchArMode(projectId, areaId, checkpointId, initialPlacementType, existingMarkerId, returnContext, preferredSiteId);
    try {
        return await startPromise;
    } finally {
        startPromise = null;
    }
}

async function launchArMode(projectId, areaId, checkpointId, initialPlacementType, existingMarkerId, returnContext, preferredSiteId) {
    window.__nxrArStartError = null;
    if (!projectId) {
        window.__nxrArStartError = new Error('A project is required before opening AR.');
        return false;
    }
    if (!navigator.xr || !window.isSecureContext) {
        window.__nxrArStartError = new Error('WebXR or a secure camera context is unavailable.');
        return false;
    }
    activeProjectId = projectId;
    activeProjectName = String(projectId).replace(/[-_]+/g, ' ').trim();
    activeSiteId = preferredSiteId || '';
    activeAreaId = areaId;
    activeAreaName = '';
    activeCheckpointId = checkpointId;
    areaLensOpen = false;
    sessionMarkers = [];
    locatedTotemRecord = null;
    totemGuideVisible = false;
    locationNoteAnchor = null;
    referenceSpaceHasFloor = false;
    sessionGroundY = null;
    locationNoteConfig = normalizedLocationNote();
    locationNoteVisible = false;
    pendingExistingMarkerId = existingMarkerId || '';
    arReturnContext = returnContext || '';
    const questBrowser = isQuestHeadsetBrowser();
    questHeadsetSession = questBrowser;
    if (questBrowser) {
        // Set the device class before the async WebXR request so the phone
        // taskbar stylesheet never paints during Quest session startup.
        document.body.classList.add('creator-ar-quest-headset', 'creator-ar-quest-pending');
        document.body.dataset.arDevice = 'quest';
    }
    readyPlacementType = pendingExistingMarkerId ? '' : AR_EXPERIENCE_CONFIG.markerTypes.includes(initialPlacementType) ? initialPlacementType : '';
    allowArScreenRotation();
    createOverlay();

    try {
        // Q3 HUB is an HTML mirror, so DOM overlay is required for Quest.
        // Legacy optional-overlay signature retained for older integrations:
        // requestImmersiveArSession(overlayRoot, { requireDomOverlay: false, preferDomOverlay: questBrowser })
        // DOM overlay remains preferred when supported, but cannot be a hard
        // startup requirement across Quest Browser and future glasses runtimes.
        const arSession = await requestImmersiveArSession(overlayRoot, { requireDomOverlay: false, preferDomOverlay: questBrowser });
        session = arSession.session;
        // WebXR may enter its immersive display after the initial request. Ask
        // again once that display exists so Android can honour a later rotate.
        allowArScreenRotation();
        sessionMode = arSession.mode || 'immersive-ar';
        questHeadsetSession = questBrowser || sessionMode === 'immersive-vr' || session.interactionMode === 'world-space';
        const launchedSession = session;
        document.body.classList.add('creator-ar-session-active');
        document.body.dataset.webxrMode = sessionMode;
        document.body.dataset.arDomOverlay = arSession.domOverlay ? 'true' : 'false';
        document.body.classList.toggle('creator-ar-immersive-vr', sessionMode === 'immersive-vr');
        document.body.classList.toggle('creator-ar-quest-headset', questHeadsetSession);
        if (questHeadsetSession) document.body.dataset.arDevice = 'quest';
        if (questHeadsetSession && !arSession.domOverlay) {
            setPlacementStatus('Quest 3 AR is active. The spatial belt uses the controller pointer, thumbstick and trigger.');
        } else if (sessionMode === 'immersive-vr') {
            setPlacementStatus('Quest 3 immersive mode is active. Passthrough AR is unavailable in this browser; placement uses the headset\'s 6DoF space.');
        } else if (!arSession.passthrough) {
            setPlacementStatus(`WebXR opened AR mode but reports an opaque blend (${arSession.blendMode || 'unknown'}). Camera passthrough is unavailable in this runtime.`);
        }
        showArFullscreenGuidance(overlayRoot);
        const restoringOverlay = overlayRoot;
        const requestedExistingMarkerId = pendingExistingMarkerId;
        const loadingOperation = captureArOperationContext();
        const restorationGuard = { matchGeneration: false };
        void loadPlacementAreas(loadingOperation, restorationGuard)
            .then(() => {
                if (!isArOperationCurrent(loadingOperation, { matchLocation: false, ...restorationGuard })) return false;
                const restoringOperation = captureArOperationContext();
                return restoreRecordedMarkers(restoringOperation, restorationGuard).then(() => {
                    if (!isArOperationCurrent(restoringOperation, restorationGuard) || overlayRoot !== restoringOverlay) return false;
                    return requestedExistingMarkerId && placementArmGeneration === loadingOperation.generation
                        ? prepareExistingMarkerPlacement(requestedExistingMarkerId, restoringOperation)
                        : true;
                });
            })
            .catch(error => {
                if (isArOperationCurrent(loadingOperation, { matchLocation: false, ...restorationGuard }) && overlayRoot === restoringOverlay) {
                    setPlacementStatus(`Saved Markers could not be restored: ${error.message}`);
                }
            });

        canvas = document.createElement('canvas');
        canvas.className = 'creator-ar-canvas';
        document.body.append(canvas);
        const transparentSession = sessionMode === 'immersive-ar';
        gl = canvas.getContext('webgl', { alpha: transparentSession, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL unavailable.');
        await gl.makeXRCompatible();
        setupSpatialMarkerRenderer();

        const layer = new XRWebGLLayer(session, gl, { alpha: transparentSession, antialias: true, depth: true });
        session.updateRenderState({ baseLayer: layer, depthNear: 0.01, depthFar: 50 });
        try {
            refSpace = await session.requestReferenceSpace('local-floor');
            referenceSpaceHasFloor = true;
        } catch {
            refSpace = await session.requestReferenceSpace('local');
            referenceSpaceHasFloor = false;
        }
        try {
            const viewerSpace = await session.requestReferenceSpace('viewer');
            hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
        } catch (error) {
            hitTestSource = null;
            setPlacementStatus(`AR is active. Surface detection is unavailable, so placement will use your view direction. (${error.message})`);
        }

        const draw = (_time, frame) => {
            if (frame.session !== session || !gl) return;
            frame.session.requestAnimationFrame(draw);
            const pose = frame.getViewerPose(refSpace);
            if (!pose) return;
            latestViewerMatrix = Float32Array.from(pose.transform.matrix);
            latestView = pose.views[0] || null;
            // The DOM taskbar is the safe fallback until the world-locked
            // WebGL belt has completed its first draw.
            if (questHeadsetSession) document.body.classList.remove('creator-ar-quest-pending');
            pollControllerInput();
            updateControllerRay(frame);
            const dashboardTarget = creatorInputMode === 'controller' && latestControllerRay ? controllerSpatialDashboardAtAim() : null;
            const pimTarget = !dashboardTarget && creatorInputMode === 'controller' && latestControllerRay ? spatialPimTargetAtAim() : null;
            const specialPaletteTarget = !dashboardTarget && !pimTarget && creatorInputMode === 'controller' && latestControllerRay ? controllerSpecialPaletteActionAtAim() : null;
            const beltTarget = !dashboardTarget && !pimTarget && !specialPaletteTarget && creatorInputMode === 'controller' && latestControllerRay ? controllerBeltActionAtAim() : null;
            if (!dashboardTarget && !pimTarget && !specialPaletteTarget && !beltTarget && creatorInputMode === 'controller' && latestControllerRay) controllerMarkerAtAim();
            pollHandPinch();
            updateGrabbedMarkerFromCamera();
            const hit = hitTestSource && frame.getHitTestResults(hitTestSource)[0];
            latestHitMatrix = matrixFromPose(hit?.getPose(refSpace));
            positionSessionMarkers(latestView);

            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.clearColor(0, 0, 0, transparentSession ? 0 : 1);
            gl.clearDepth(1);
            gl.enable(gl.SCISSOR_TEST);
            for (const view of pose.views) {
                const viewport = layer.getViewport(view);
                if (!viewport) continue;
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                // XRWebGLLayer packs both eyes into one framebuffer. Clearing
                // without a matching scissor clears the eye rendered just
                // before this one, leaving only the last eye visible.
                gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                drawSpatialHomeSign(view);
                drawQuestSpatialBelt(view);
                drawQuestSpatialSpecialPalette(view);
                drawQuestSpatialWebPanel(view);
                drawHandTrackingLines(view);
                drawControllerPointer(view);
                drawCalibratedTotemPath(view);
                drawSpatialMarkers(view);
                drawSpatialPlantProfiles(view);
                drawControllerPointerContact(view);
            }
            gl.disable(gl.SCISSOR_TEST);
        };

        launchedSession.addEventListener('end', async () => {
            if (session !== launchedSession) return;
            const projectId = activeProjectId;
            const areaId = activeAreaId;
            const areaName = activeAreaName;
            const siteId = activeSiteId;
            const returnContext = arReturnContext;
            await waitForPendingPlacement();
            if (session !== launchedSession) return;
            session = null;
            cleanup();
            await finishNaturalArExit(projectId, areaId, returnContext, areaName, siteId);
        });
        launchedSession.addEventListener('inputsourceschange', () => {
            setCreatorInputMode(controllerInputSource() ? 'controller' : 'touch');
        });
        launchedSession.addEventListener('selectstart', event => {
            if (session !== launchedSession || !isPrimaryControllerSource(event.inputSource) || readyPlacementType) return;
            if (interactionMode === 'view') return;
            if (controllerSpatialDashboardAtAim()) return;
            if (controllerSpecialPaletteActionAtAim()) return;
            if (controllerBeltActionAtAim()) return;
            const target = controllerMarkerAtAim();
            // A short press selects a placed object; the delayed arm keeps
            // the same trigger useful for press-and-hold movement in neutral
            // Quest mode without making every tap start a drag.
            if (target) armControllerMarkerPress(target);
        });
        launchedSession.addEventListener('selectend', event => {
            if (session !== launchedSession || !isPrimaryControllerSource(event.inputSource)) return;
            if (dragState?.pointerId === 'xr-controller') {
                clearControllerMarkerPress();
                void finishMarkerDrag();
                return;
            }
            if (controllerPressState) finishControllerMarkerPress();
        });
        launchedSession.addEventListener('select', event => {
            if (session !== launchedSession) return;
            const controllerSelect = isPrimaryControllerSource(event.inputSource);
            if (controllerSelect) {
                if (dragState?.pointerId === 'xr-controller') return;
                if (controllerPressState) {
                    finishControllerMarkerPress();
                    return;
                }
                if (activateControllerSelection()) return;
            }
            if (readyPlacementType && performance.now() - placementArmedAt > 250) void quickPlace(readyPlacementType);
        });
        setCreatorInputMode(controllerInputSource() ? 'controller' : 'touch');
        armArHistory();
        launchedSession.requestAnimationFrame(draw);
        return true;
    } catch (error) {
        window.__nxrArStartError = error;
        console.error('[Creator AR]', error);
        const activeSession = session;
        session = null;
        cleanup();
        activeSession?.end().catch(() => {});
        return false;
    }
}
