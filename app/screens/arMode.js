/*
 * Creator AR placement mode
 *
 * The dashboard remains the full web workspace. AR is for fast capture:
 * place a draft, then select it to refine its details or move it without
 * leaving the camera session. Physical checkpoints improve repeat visits but
 * are not required for a test session.
 */

import { createPlaceMarker, createProjectSite, createSitePlace, deletePlaceMarker, loadMarkerAnchor, loadPlaceMarkers, loadPlantProfile, loadProject, loadProjectSites, loadSitePlaces, saveMarkerAnchor, updatePlaceMarker } from '../services/persistence.js';
import { AR_EXPERIENCE_CONFIG, DEFAULT_HOME_AREA_NAME, isDefaultHomeArea } from '../services/arExperienceConfig.js';
import { createAreaRecord } from '../services/areaWorkflow.js';
import { matrixFromPose, spatialPosition } from '../services/spatialPlacement.js';
import { spatialMoveControlMarkup } from '../services/spatialMoveControl.js';
import { createMinimalMarkerDraft, scopedMarkerStorageId } from '../services/markerWorkflow.js';
import { alignAreaToCheckpoint } from '../services/areaSpatialAlignment.js';
import { creatorPlantProfileLayout } from '../services/creatorPlantProfileLayout.js';
import { placementPointerMarkup } from '../services/placementPointer.js';
import { createSpatialSphereRenderer, destroySpatialSphereRenderer, drawSpatialOrb, drawSpatialSphere } from '../services/spatialSphereRenderer.js';
import { createSpatialPrismRenderer, destroySpatialPrismRenderer, drawSpatialPrism } from '../services/spatialPrismRenderer.js';
import { createSpatialTriangleRenderer, destroySpatialTriangleRenderer, drawSpatialTriangle } from '../services/spatialTriangleRenderer.js';
import { createSpatialTetherRenderer, destroySpatialTetherRenderer, drawSpatialTether } from '../services/spatialTetherRenderer.js';
import { isTrackedHeadsetInputSource, QUEST_SPATIAL_BELT_ACTIONS, QUEST_SPECIAL_PALETTE_ACTIONS, questSpatialBeltLayout, questSpatialBeltRayTarget, questSpatialPaletteLayout } from '../services/questSpatialBelt.js';
import { isQuestHeadsetBrowser, requestImmersiveArSession } from '../services/webxrSession.js';
import { controllerRayEnd, controllerRayFromPose, handTrackingState, XR_HAND_JOINT_CONNECTIONS, XR_LASER_POINTER_CONFIG } from '../services/xrPointer.js';
import { pimNodeChildren, pimToggleExpandedPaths, pimVisibleNodes } from '../services/plantInformationMesh.js';
import { renderProjectDashboard, renderProjectAreaDashboard, renderProjectHome, renderAreaCheckpointForm, openProjectEntry } from './projectDashboard.js';
import { renderFieldGuide } from './fieldGuide.js';
import { DEFAULT_TOTEM_COLOR, normalizeTotemStyle, totemHeightPreset } from '../services/totemAppearance.js';

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
let activeCheckpointId = '';
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
let questSpatialWebTextures = [];
let questSpatialWebTextureKey = '';
let questSpatialWebLayout = [];
let questSpatialWebVisible = false;
let questSpatialWebHoverIndex = -1;
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
let pendingExistingMarkerId = '';
let arReturnContext = '';
let locationNoteAnchor = null;
let referenceSpaceHasFloor = false;
let sessionGroundY = null;
let locationNoteConfig = null;
let locationNoteVisible = false;
let latestNotePlacementPoint = null;
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
const QUEST_SPATIAL_WEB_ACTIONS = Object.freeze([
    Object.freeze({ id: 'dashboard', label: 'DASHBOARD', symbol: 'D', color: '#3973a2' }),
    Object.freeze({ id: 'webhub', label: 'WEB HUB', symbol: 'W', color: '#3973a2' }),
    Object.freeze({ id: 'area', label: 'AREA DASH', symbol: 'A', color: '#527a4d' }),
    Object.freeze({ id: 'plant', label: 'PLANT DASH', symbol: 'P', color: '#527a4d' })
]);
const CREATOR_AR_HOLD_DELAY_MS = 420;
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

function plantTagPlatePosition(position, marker) {
    const dimensions = plantTagDimensions(marker);
    return {
        x: Number(position?.x) || 0,
        y: (Number(position?.y) || 0) + dimensions.stemHeight + dimensions.halfHeight,
        z: Number(position?.z) || 0
    };
}

function drawPlantTagStem(view, position, marker, opacity = 1) {
    const dimensions = plantTagDimensions(marker);
    const scale = markerSizeFactor(marker);
    drawSpatialPrism(gl, prismRenderer, view, position, {
        halfWidth: .009 * scale,
        halfHeight: dimensions.stemHeight * .5,
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

function appearancePayload(appearance = {}) {
    return {
        color: appearance.color,
        size: appearance.size,
        opacity: appearance.opacity,
        ...(MARKER_APPEARANCE_SHAPES.includes(appearance.shape) ? { shape: appearance.shape } : {})
    };
}

function preparePlacementAppearance(type, marker = null) {
    if (!['plant', 'note'].includes(type)) {
        pendingPlacementAppearance = null;
        return null;
    }
    pendingPlacementAppearance = {
        type,
        color: markerAppearanceColor(marker || { type }),
        size: TASKBAR_V2_SIZES.includes(markerAppearanceSize(marker)) ? markerAppearanceSize(marker) : 'medium',
        opacity: type === 'plant' ? markerAppearanceOpacity(marker) : 1,
        ...(type === 'plant' ? { shape: markerAppearanceShape(marker) } : {})
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
    return {
        ...(pendingBagRecord?.marker || {}),
        type,
        appearance: appearance ? appearancePayload(appearance) : pendingBagRecord?.marker?.appearance
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

function activeAreaMarkers() {
    return sessionMarkers.filter(record => record.areaId === activeAreaId);
}

function hasRenderableSpatialPosition(record) {
    return record?.unplaced !== true
        && record?.position
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
        overlayRoot.querySelector(`[data-ar-plant-tether="${selector}"]`),
        overlayRoot.querySelector(`[data-ar-totem-information="${selector}"]`)
    ].filter(Boolean).forEach(element => { element.hidden = hidden; });
}

function activateArea(area) {
    const nextAreaId = area?.id || '';
    if (activeAreaId !== nextAreaId) {
        sessionMarkers = [];
        locatedTotemRecord = null;
        locationNoteVisible = false;
        locationNoteAnchor = null;
        homeSignAnchor = null;
        renderSessionMarkers();
    }
    activeAreaId = nextAreaId;
    activeAreaName = isDefaultHomeArea(area) ? DEFAULT_HOME_AREA_NAME : area?.name || '';
    updateLocationNote();
}

function hasPlantProfile(record) {
    const profile = record?.plantProfile || record?.marker?.plant_profile || {};
    return record?.marker?.type === 'plant' && (profile.spm_enabled === true || profile.profile_enabled === true);
}

function creatorPlantKnowledge(record) {
    const profile = record.plantProfile || record.marker.plant_profile || {};
    const summary = (...values) => values.find(value => String(value || '').trim()) || 'Add in Web Mode';
    const scientific = summary(profile.scientific_name);
    const layer = summary(profile.layer, profile.plant_type);
    return {
        title: profile.common_name || record.marker.name || 'Plant Profile',
        core: { scientific, layer },
        left: [
            ['USES', summary(profile.uses, profile.overview)],
            ['RELATIONSHIPS', summary(profile.relationships, profile.companions, profile.attribute_chain_count ? `${profile.attribute_chain_count} linked attributes` : '')],
            ['ORIGIN', summary(profile.origin, profile.propagation)]
        ],
        right: [
            ['BIOLOGY', summary(profile.family, profile.plant_type)],
            ['CLIMATE', summary(profile.climate, profile.growing_conditions, profile.care)],
            ['GARDEN ROLE', summary(profile.role, profile.function, profile.companions)]
        ]
    };
}

function creatorPlantKnowledgeMarkup(record) {
    const knowledge = creatorPlantKnowledge(record);
    const compactLabel = label => ({ RELATIONSHIPS: 'LINKS' })[String(label).toUpperCase()] || label;
    const expandedPaths = record.pimExpandedPaths || [];
    const expanded = new Set(expandedPaths);
    const nodes = pimVisibleNodes(knowledge, expandedPaths);
    const connectors = nodes.map(node => `<path class="plant-knowledge-connector plant-knowledge-connector-depth-${node.depth}" d="M${node.parentPosition.x} ${node.parentPosition.y} L${node.position.x} ${node.position.y}"/>`).join('');
    const cells = nodes.map(node => {
        const hasChildren = pimNodeChildren(node).length > 0;
        const open = expanded.has(node.path);
        const detailsVisible = node.depth > 0 || open;
        const depthClass = node.depth ? ` plant-knowledge-child plant-knowledge-child-depth-${Math.min(node.depth, 3)}` : '';
        const style = `--pim-node-x:${node.position.x}%;--pim-node-y:${node.position.y}%;--pim-node-scale:${Math.max(.62, 1 - node.depth * .14)}`;
        return `<button type="button" class="plant-knowledge-cell${depthClass}${open ? ' is-open' : ''}${detailsVisible ? ' is-detail-visible' : ''}" data-pim-node="${escapeHtml(node.path)}" data-ar-plant-branch="${escapeHtml(node.path)}" style="${style}" aria-label="${escapeHtml(compactLabel(node.label))}${hasChildren ? ' information cell' : ''}" aria-expanded="${hasChildren ? open : false}"><b>${escapeHtml(compactLabel(node.label))}</b><small aria-hidden="${!detailsVisible}">${escapeHtml(node.value)}</small></button>`;
    }).join('');
    return `<span class="plant-knowledge-map" data-pim-layout="radial" aria-label="Plant Information Mesh"><svg class="plant-knowledge-connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${connectors}</svg>${cells}<span class="plant-knowledge-core"><small>PIM</small><strong>${escapeHtml(knowledge.title)}</strong><i>${escapeHtml(knowledge.core.scientific)}</i><em>${escapeHtml(knowledge.core.layer)}</em></span></span>`;
}

function creatorTotemInformationMarkup(record) {
    const board = areaBoard(record.marker);
    const introduction = String(board.introduction || '').trim();
    const isGeneratedWelcome = /^welcome to\s+[^.!?]+[.!?]?$/i.test(introduction);
    const text = [isGeneratedWelcome ? '' : introduction, ...board.informationBubbles].filter(Boolean).slice(0, 6);
    if (!text.length) return '';
    return `<aside class="creator-ar-totem-information" data-ar-totem-information="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(board.title)} information">
        <span class="creator-ar-location-stick creator-ar-totem-stick" aria-hidden="true"></span>
        <span class="creator-ar-location-ground creator-ar-totem-attachment" aria-hidden="true"></span>
        <section class="creator-ar-location-note-board creator-ar-totem-balloon nourishland-spatial-note-surface">
          <span class="creator-ar-totem-balloon-text">${text.map(line => `<span>${escapeHtml(line)}</span>`).join('')}</span>
        </section>
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
        ${type === 'plant' ? `<button type="button" data-ar-cycle-opacity aria-label="Cycle Plant opacity. Current ${opacity} percent"><b aria-hidden="true">&#9680;</b><span>OPACITY</span><small>${opacity}%</small></button>` : ''}
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
    bindContextToolbarAction(toolbar, '[data-ar-context-edit]', () => selectedRecord && openInlineEditor(selectedRecord, true));
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
    } else if (property === 'opacity' && type === 'plant') {
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
        ...appearancePayload(appearance),
        ...(type === 'note' ? { opacity: previousAppearance.opacity } : {})
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
            setPlacementStatus(`${record.marker.name} ${property} saved. Pointer mode remains on.`);
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
        let marker;
        if (pendingBagRecord) {
            const bagRecord = pendingBagRecord;
            marker = await updatePlaceMarker(operation.projectId, bagRecord.siteId, bagRecord.areaId, bagRecord.marker.id, {
                ...bagRecord.marker,
                appearance: { ...(bagRecord.marker.appearance || {}), ...appearance }
            });
        } else {
            const draft = createMinimalMarkerDraft(type, {
                name: type === 'plant' ? 'New plant' : 'New note'
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
    return {
        x: origin.x + ray.x * distance,
        y: origin.y + ray.y * distance,
        z: origin.z + ray.z * distance
    };
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
            spatialAnchor(record.position, operation, record.rotationDegrees)
        )));
        if (checkpointRecord) {
            await saveMarkerAnchor(
                operation.projectId,
                checkpointRecord.siteId,
                checkpointRecord.areaId,
                checkpointRecord.marker.id,
                spatialAnchor(checkpointRecord.position, operation, checkpointRecord.rotationDegrees)
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
    if (!interactionMode || readyPlacementType || dragState || markerHoldGesture) return false;
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
    if (interactionMode === 'grab') {
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
    const hold = overlayRoot?.querySelector('[data-ar-hold-mode]');
    const pointer = overlayRoot?.querySelector('[data-ar-select-mode]');
    eye?.classList.toggle('is-active', interactionMode === 'view');
    hold?.classList.toggle('is-active', interactionMode === 'grab');
    pointer?.classList.toggle('is-active', interactionMode === 'select');
    eye?.setAttribute('aria-pressed', String(interactionMode === 'view'));
    hold?.setAttribute('aria-pressed', String(interactionMode === 'grab'));
    pointer?.setAttribute('aria-pressed', String(interactionMode === 'select'));
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

function openQuestSpatialWebPanel() {
    if (questSpatialWebVisible) {
        closeQuestSpatialWebPanel();
        setPlacementStatus('Spatial Web Hub closed. AR remains active.');
        updateControllerHud();
        return;
    }
    closeQuestSpecialPalette();
    questSpatialWebVisible = true;
    questSpatialWebLayout = questSpatialPaletteLayout(questBeltViewerMatrix || latestViewerMatrix, QUEST_SPATIAL_WEB_ACTIONS, {
        distance: .78,
        side: -1,
        sideOffset: .42,
        columnSpacing: .16,
        rowSpacing: .145,
        topOffset: .02,
        radius: .078
    });
    questSpatialWebHoverIndex = -1;
    controllerMenuActive = true;
    setPlacementStatus('Spatial Web Hub open on your left. Choose Dashboard, Web Hub, Area Dash or Plant Dash.');
    updateControllerHud();
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
    if (document.body.dataset.arDomOverlay !== 'true') {
        // A full dashboard needs DOM overlay. This Quest session does not expose a spatial overlay, so use the normal Web workspace rather than presenting dead icons.
        if (selectedReturnContext) arReturnContext = selectedReturnContext;
        exitArMode();
        return;
    }
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
    spatialWebWindow.innerHTML = `<header class="creator-ar-spatial-web-header"><div><span>SPATIAL WEB</span><strong>${escapeHtml(activeProjectName || activeProjectId)}</strong></div><button type="button" data-spatial-web-close aria-label="Close spatial Web window">×</button></header><nav class="creator-ar-spatial-web-nav" aria-label="Spatial Web destinations"><button type="button" data-spatial-web-route="dashboard">Dashboard</button><button type="button" data-spatial-web-route="webhub">Web Hub</button><button type="button" data-spatial-web-route="area">Area Dashboard</button><button type="button" data-spatial-web-route="plant">Plant Dashboard</button></nav>`;
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
    spatialWebWindow.querySelectorAll('[data-spatial-web-route]').forEach(button => button.addEventListener('click', () => route(button.dataset.spatialWebRoute)));
    controllerMenuActive = true;
    updateControllerHud();
    // The legacy fallback was: void route(selectedRecord ? 'selected' : 'area')
    // The full dashboard is the useful default for an unselected Q3 session.
    void route(selectedRecord ? 'selected' : 'dashboard');
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
    if (marker.type === 'area_checkpoint') return .48;
    if (marker.special_symbol) return .5;
    if (marker.type === 'plant') return .34;
    return .3;
}

function questBeltUsesSpatialRenderer() {
    // Use the stable DOM controls when Quest provides DOM overlay. If a
    // browser build omits that feature, keep the headset usable with the
    // controller belt instead of failing the entire AR launch.
    // Legacy compatibility contract: function questBeltUsesSpatialRenderer() return questHeadsetSession.
    return questHeadsetSession && document.body.dataset.arDomOverlay !== 'true';
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
            distance: .78,
            drop: .5,
            spacing: .135,
            curve: .035,
            radius: .09
        });
    }
    return questBeltLayout;
}

function currentQuestSpecialPaletteLayout() {
    if (!questBeltUsesSpatialRenderer() || !questSpecialPaletteVisible) return [];
    if (!questSpecialPaletteLayout.length) {
        questSpecialPaletteLayout = questSpatialPaletteLayout(questBeltViewerMatrix || latestViewerMatrix, QUEST_SPECIAL_PALETTE_ACTIONS, {
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

function currentQuestSpatialWebLayout() {
    if (!questBeltUsesSpatialRenderer() || !questSpatialWebVisible) return [];
    if (!questSpatialWebLayout.length) {
        questSpatialWebLayout = questSpatialPaletteLayout(questBeltViewerMatrix || latestViewerMatrix, QUEST_SPATIAL_WEB_ACTIONS, {
            distance: .78,
            side: -1,
            sideOffset: .42,
            columnSpacing: .16,
            rowSpacing: .145,
            topOffset: .02,
            radius: .078
        });
    }
    return questSpatialWebLayout;
}

function closeQuestSpatialWebPanel() {
    questSpatialWebVisible = false;
    questSpatialWebLayout = [];
    questSpatialWebHoverIndex = -1;
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

function controllerSpatialWebActionAtAim() {
    const target = questSpatialBeltRayTarget(latestControllerRay, currentQuestSpatialWebLayout());
    questSpatialWebHoverIndex = target?.index ?? -1;
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
        .map(record => ({ position: record.position, radius: controllerMarkerRadius(record) }));
    if (readyPlacementType) {
        const point = placementPoint();
        if (point) subjects.push({ position: point, radius: .38 });
    }
    currentQuestSpecialPaletteLayout().forEach(button => subjects.push({ position: button.position, radius: button.radius }));
    currentQuestSpatialWebLayout().forEach(button => subjects.push({ position: button.position, radius: button.radius }));
    currentQuestBeltLayout().forEach(button => subjects.push({ position: button.position, radius: button.radius }));
    return subjects;
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
    const specialMarker = {
        name: action.label,
        special_symbol: action.symbol,
        arrow_style: action.arrowStyle,
        appearance: { color: action.color, size: 'large' }
    };
    closeQuestSpecialPalette();
    readySpecialMarker = specialMarker;
    void armPlacement('sub_checkpoint', specialMarker);
    return true;
}

function selectQuestSpatialWebAction(action) {
    if (!action) return false;
    closeQuestSpatialWebPanel();
    setPlacementStatus(`${action.label} selected. The spatial Web Hub stays open through the current Quest session.`);
    // Keep this route in the AR session. The native dashboard remains the
    // destination for the phone Web Hub, while Quest without DOM overlay gets
    // a controller-safe spatial route surface instead of an AR exit.
    questSpatialWebVisible = true;
    questSpatialWebLayout = questSpatialPaletteLayout(questBeltViewerMatrix || latestViewerMatrix, QUEST_SPATIAL_WEB_ACTIONS, {
        distance: .78,
        side: -1,
        sideOffset: .42,
        columnSpacing: .16,
        rowSpacing: .145,
        topOffset: .02,
        radius: .078
    });
    controllerMenuActive = true;
    updateControllerHud();
    return true;
}

function activateControllerSelection() {
    if (readyPlacementType) {
        void quickPlace(readyPlacementType);
        return true;
    }
    const specialTarget = controllerSpecialPaletteActionAtAim();
    if (specialTarget) return selectQuestSpecialPaletteAction(specialTarget);
    const webTarget = controllerSpatialWebActionAtAim();
    if (webTarget) return selectQuestSpatialWebAction(webTarget);
    const beltTarget = controllerBeltActionAtAim();
    if (beltTarget) {
        const action = questBeltActionElements()[beltTarget.index];
        if (!action) return false;
        dispatchControllerAction(action);
        return true;
    }
    const markerTarget = controllerMarkerAtAim();
    if (markerTarget) {
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
        const specialTarget = controllerSpecialPaletteActionAtAim();
        if (specialTarget) {
            selectQuestSpecialPaletteAction(specialTarget);
            handPinchActive = pinching;
            return;
        }
        const webTarget = controllerSpatialWebActionAtAim();
        if (webTarget) {
            selectQuestSpatialWebAction(webTarget);
            handPinchActive = pinching;
            return;
        }
        const beltTarget = controllerBeltActionAtAim();
        const beltAction = beltTarget && questBeltActionElements()[beltTarget.index];
        if (beltAction) dispatchControllerAction(beltAction);
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
    if (creatorInputMode !== 'controller' || interactionMode === 'view' || !latestControllerRay || !controllerPointerRenderer) return;
    const { origin, direction } = latestControllerRay;
    const start = {
        x: origin.x + direction.x * XR_LASER_POINTER_CONFIG.startOffset,
        y: origin.y + direction.y * XR_LASER_POINTER_CONFIG.startOffset,
        z: origin.z + direction.z * XR_LASER_POINTER_CONFIG.startOffset
    };
    const end = controllerRayEnd(latestControllerRay, controllerLaserSubjects(), XR_LASER_POINTER_CONFIG.length);
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
    const point = controllerRayEnd(latestControllerRay, controllerLaserSubjects(), XR_LASER_POINTER_CONFIG.length);
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
    const point = controllerRayEnd(latestControllerRay, controllerLaserSubjects(), XR_LASER_POINTER_CONFIG.length);
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
        updateReadyPlacementControl();
    }
    interactionMode = interactionMode === mode && ['grab', 'select'].includes(mode) ? 'neutral' : mode;
    closeAreaChooser();
    closePlacePicker();
    closeUnplacedBag();
    if (interactionMode !== 'select') closeMarkerContextToolbar();
    updateInteractionControls();
    if (interactionMode === 'view') setPlacementStatus('View only mode. The pointer is hidden; tap a Marker to reveal or hide its information.');
    else if (interactionMode === 'grab') setPlacementStatus('Move mode is on. Select a glowing element, adjust it with the plus control, then press Release.');
    else if (interactionMode === 'select') setPlacementStatus('Pointer mode is on. Tap a placed object to open its compact edit tools.');
    else setPlacementStatus('Aim dot ready. Hold any placed item to move it, or use Pointer mode for edit tools.');
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
    bag.innerHTML = '<p>Loading Home…</p>';
    try {
        await loadPlacementAreas();
        const areas = await loadSitePlaces(activeProjectId, activeSiteId);
        const homeAreas = areas.filter(isDefaultHomeArea);
        const groups = await Promise.all(homeAreas.map(async area => {
            const markers = await loadPlaceMarkers(activeProjectId, activeSiteId, area.id).catch(() => []);
            const entries = await Promise.all(markers.map(normalizeSpatialMarker).filter(marker => ['plant', 'note', 'sub_checkpoint'].includes(marker.type)).map(async marker => {
                const anchor = await loadMarkerAnchor(activeProjectId, activeSiteId, area.id, marker.id).catch(() => null);
                return anchor?.type === 'spatial' ? null : { marker, areaId: area.id, areaName: area.name };
            }));
            return entries.filter(Boolean);
        }));
        const items = groups.flat();
        bag.innerHTML = `<div><strong>Home</strong><button type="button" data-ar-close-bag aria-label="Close Home">&times;</button></div>${items.length ? `<div class="creator-ar-bag-list">${items.map((item, index) => `<button type="button" data-ar-bag-item="${index}">${markerIcon(item.marker.type)} <span><strong>${escapeHtml(item.marker.name)}</strong><small>${readyPlacementLabel(item.marker.type)} · ${DEFAULT_HOME_AREA_NAME}</small></span></button>`).join('')}</div>` : '<p>Home is empty. Save information here when you want to organise or place it later.</p>'}`;
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
        bag.innerHTML = `<div><strong>Home</strong><button type="button" data-ar-close-bag aria-label="Close Home">&times;</button></div><p>Could not load Home: ${escapeHtml(error.message)}</p>`;
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
    const totem = activeTotemRecord();
    const arrows = [
        ['⬇', 'Block arrow down'], ['⬆', 'Block arrow up'], ['↪', 'Curved arrow right'],
        ['➜', 'Rounded arrow right'], ['❯', 'Chevron arrow right'], ['➡', 'Block arrow right'],
        ['⇧', 'Rounded arrow up'], ['⇩', 'Rounded arrow down'], ['〉', 'Outline arrow right']
    ].map(([symbol, label], index) => `<button class="creator-ar-special-totem creator-ar-symbol-marker" type="button" aria-label="${escapeHtml(label)}" data-ar-special-symbol="${escapeHtml(symbol)}" data-ar-special-label="${escapeHtml(label)}" data-ar-arrow-style="${index + 1}"><b aria-hidden="true">${escapeHtml(symbol)}</b><span class="sr-only">${escapeHtml(label)}</span></button>`).join('');
    const alerts = [
        ['!', 'Important'], ['?', 'Question']
    ].map(([symbol, label]) => `<button class="creator-ar-special-totem creator-ar-symbol-marker" type="button" data-ar-special-symbol="${escapeHtml(symbol)}" data-ar-special-label="${escapeHtml(label)}"><b aria-hidden="true">${escapeHtml(symbol)}</b><span><strong>${escapeHtml(label)}</strong></span></button>`).join('');
    picker.innerHTML = `<div class="creator-ar-picker-heading"><p>Special</p><button type="button" data-ar-close-special aria-label="Close">&times;</button></div>
        <section class="creator-ar-special-section creator-ar-totem-section"><strong>TOTEM</strong><div class="creator-ar-special-grid">
            ${totem && hasSavedSpatialPosition(totem) ? `<button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-toggle-totem aria-pressed="${totemGuideVisible}"><b aria-hidden="true">${totemGuideVisible ? '&#9673;' : '&#9675;'}</b><span><strong>${totemGuideVisible ? 'Hide Totem Guide' : 'Show Totem Guide'}</strong><small>Ground pointer</small></span></button>` : ''}
            <button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-toggle-location-note><b aria-hidden="true">${locationNoteVisible ? '&#9681;' : '&#9673;'}</b><span><strong>${locationNoteVisible ? 'Hide Location Note' : 'View Location Note'}</strong></span></button>
            <button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-add-totem><b aria-hidden="true">+</b><span><strong>${totem ? 'Place Totem' : 'Add Totem'}</strong><small>${totem ? 'Use saved Totem' : 'To this Area'}</small></span></button>
        </div></section>
        <section class="creator-ar-special-section creator-ar-indicator-section"><strong>SYMBOLS</strong><small>ARROWS, EXCLAMATION AND QUESTION MARKS</small><div class="creator-ar-special-grid creator-ar-arrow-grid">${arrows}${alerts}</div></section>`;
    picker.querySelector('[data-ar-close-special]').addEventListener('click', closePlacePicker);
    picker.querySelector('[data-ar-toggle-totem]')?.addEventListener('click', toggleActiveTotemGuide);
    picker.querySelector('[data-ar-toggle-location-note]').addEventListener('click', () => {
        toggleLocationNoteVisibility(totem);
        closePlacePicker();
    });
    picker.querySelector('[data-ar-add-totem]').addEventListener('click', createTotemFromSpecial);
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
    if (questHeadsetSession && document.body.dataset.arDomOverlay !== 'true') {
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
        questSpecialPaletteVisible = true;
        questSpecialPaletteLayout = questSpatialPaletteLayout(questBeltViewerMatrix || latestViewerMatrix, QUEST_SPECIAL_PALETTE_ACTIONS, {
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
        setPlacementStatus('Special palette open on your right. Aim at a symbol and press the trigger or pinch.');
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
    return new Float32Array([
        panelRight.x * scaleX, 0, panelRight.z * scaleX, 0,
        0, scaleY, 0, 0,
        panelFront.x, 0, panelFront.z, 0,
        button.position.x, button.position.y, button.position.z, 1
    ]);
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
    gl.shaderSource(vertex, 'attribute vec2 p;uniform mat4 mvp;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=mvp*vec4(p,0.,1.);}');
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
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, homeSignTexture);
    gl.uniform1i(gl.getUniformLocation(homeSignProgram, 'artwork'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
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

function createQuestBeltPanelTexture(action, selected) {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 256;
    textureCanvas.height = 220;
    const context = textureCanvas.getContext('2d');
    if (!context) return null;
    context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
    context.save();
    // Keep each tile flat and evenly aligned, like the Meta Link bar. The
    // shallow offset below is the physical lower edge; the arc comes from
    // world placement and panel yaw, never from crooked per-button transforms.
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
    context.beginPath();
    context.moveTo(27, 23);
    context.lineTo(225, 23);
    context.strokeStyle = 'rgba(255, 255, 255, .16)';
    context.lineWidth = 2;
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
    questBeltTextures = QUEST_SPATIAL_BELT_ACTIONS.map((action, index) => createQuestBeltPanelTexture(action, index === activeIndex));
    questBeltTextureKey = key;
    return questBeltTextures;
}

function ensureQuestSpecialPaletteTextures() {
    const key = String(questSpecialPaletteHoverIndex);
    if (questSpecialPaletteTextures.length === QUEST_SPECIAL_PALETTE_ACTIONS.length && questSpecialPaletteTextureKey === key) return questSpecialPaletteTextures;
    questSpecialPaletteTextures.forEach(texture => texture && gl.deleteTexture(texture));
    questSpecialPaletteTextures = QUEST_SPECIAL_PALETTE_ACTIONS.map((action, index) => createQuestBeltPanelTexture(action, index === questSpecialPaletteHoverIndex));
    questSpecialPaletteTextureKey = key;
    return questSpecialPaletteTextures;
}

function ensureQuestSpatialWebTextures() {
    const key = String(questSpatialWebHoverIndex);
    if (questSpatialWebTextures.length === QUEST_SPATIAL_WEB_ACTIONS.length && questSpatialWebTextureKey === key) return questSpatialWebTextures;
    questSpatialWebTextures.forEach(texture => texture && gl.deleteTexture(texture));
    questSpatialWebTextures = QUEST_SPATIAL_WEB_ACTIONS.map((action, index) => createQuestBeltPanelTexture(action, index === questSpatialWebHoverIndex));
    questSpatialWebTextureKey = key;
    return questSpatialWebTextures;
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
    gl.bindBuffer(gl.ARRAY_BUFFER, homeSignBuffer);
    const positionLocation = gl.getAttribLocation(homeSignProgram, 'p');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(homeSignProgram, 'artwork'), 0);
    layout.forEach((button, index) => {
        const model = questBeltPanelMatrix(button);
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
    const textures = layout.length === QUEST_SPECIAL_PALETTE_ACTIONS.length && ensureQuestSpecialPaletteTextures();
    if (!textures?.length || textures.some(texture => !texture)) return;
    document.body.classList.add('creator-ar-spatial-special-palette');
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
    if (!questBeltUsesSpatialRenderer() || !questSpatialWebVisible || !homeSignProgram || !homeSignBuffer) return;
    const layout = currentQuestSpatialWebLayout();
    const textures = layout.length === QUEST_SPATIAL_WEB_ACTIONS.length && ensureQuestSpatialWebTextures();
    if (!textures?.length || textures.some(texture => !texture)) return;
    document.body.classList.add('creator-ar-spatial-web-ready');
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
    layout.forEach((button, index) => {
        const model = questBeltPanelMatrix(button, .075, .064);
        const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(homeSignProgram, 'mvp'), false, mvp);
        gl.bindTexture(gl.TEXTURE_2D, textures[index]);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
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
        const needsShapeHalo = shape === 1 || shape === 3 || Boolean(record.marker.special_symbol) || markerForm !== 'orb';
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
            if (totemStyle === 'light-post') {
                const poleHalfHeight = Math.max(.24, halfHeight * .72);
                const poleHalfWidth = Math.max(.025, halfWidth * .32);
                drawSpatialPrism(gl, prismRenderer, view, groundPosition, {
                    halfWidth: poleHalfWidth,
                    halfHeight: poleHalfHeight,
                    halfDepth: poleHalfWidth,
                    color: [.17, .36, .3],
                    topColor: [.56, .78, .64],
                    rotationY: (Number(record.rotationDegrees) || 0) * Math.PI / 180
                });
                const domeRadius = Math.max(.07, halfWidth * .86);
                drawSpatialSphere(gl, sphereRenderer, view.projectionMatrix, view.transform.inverse.matrix, { ...groundPosition, y: groundPosition.y + poleHalfHeight * 2 + domeRadius * .72 }, domeRadius, {
                    color: totemColor,
                    alpha: .96,
                    emissive: .28
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
                color: markerRgb(record.marker, colors.area_checkpoint),
                topColor: [.68, .95, .87],
                rotationY: (Number(record.rotationDegrees) || 24) * Math.PI / 180
            });
            return;
        }
        if (isNoteMarker) {
            // Notes are DOM surfaces only. A second WebGL board underneath
            // the readable note creates the fuzzy red artifact in passthrough.
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
        if (noteTarget) {
            // The DOM placement surface is the only note preview.
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

function positionSessionMarkers(view = latestView) {
    if (!view || !overlayRoot) return;
    positionLocationNote(view);
    positionNotePlacementPreview(view);
    positionControllerPointer(view);
    const inverse = view.transform?.inverse?.matrix;
    if (!inverse || !view.projectionMatrix) return;
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
    const tether = overlayRoot.querySelector(`[data-ar-plant-tether="${CSS.escape(record.marker.id)}"]`);
    if (!profile || !tether) return;
    const layout = creatorPlantProfileLayout(window.innerWidth, window.innerHeight, markerX, markerY);
    const { panelWidth, panelHeight, panelX, panelY, tetherStartY, tetherEndY } = layout;
    profile.style.left = `${panelX}px`;
    profile.style.top = `${panelY}px`;
    profile.style.width = `${panelWidth}px`;
    profile.style.height = `${panelHeight}px`;
    const diagramAnchorX = panelX;
    const diagramAnchorY = tetherEndY;
    const dx = diagramAnchorX - markerX;
    const dy = diagramAnchorY - tetherStartY;
    tether.style.left = `${markerX}px`;
    tether.style.top = `${tetherStartY - 9}px`;
    tether.style.width = `${Math.max(8, Math.hypot(dx, dy))}px`;
    tether.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
}

function positionCreatorTotemInformation(record, markerX, markerY, view = latestView) {
    if (!record.infoVisible || !overlayRoot) return;
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
            ? `<svg class="creator-ar-plant-tether" data-ar-plant-tether="${escapeHtml(record.marker.id)}" viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true"><path d="M0 9 C28 2 70 16 100 9"></path></svg><aside class="creator-ar-plant-profile is-anchored-profile" data-ar-plant-profile="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(record.marker.name)} Plant Profile" style="--profile-accent:${markerAppearanceColor(record.marker)}">${creatorPlantKnowledgeMarkup(record)}</aside>`
            : record.marker.type === 'area_checkpoint' && record.infoVisible
                ? creatorTotemInformationMarkup(record)
                : '';
        const markerLayer = `<span class="creator-ar-marker-hit-target creator-ar-marker-hit-target-${escapeHtml(record.marker.type)}${contextToolbarRecord?.marker?.id === record.marker.id ? ' is-selected' : ''}${record.marker.type === 'note' && markerNoteSurface(record.marker) === 'outline' ? ' is-note-outline' : ''}${record.marker.special_symbol ? ' is-symbol-marker' : ''}${record.marker.arrow_style ? ` is-arrow-marker is-arrow-style-${record.marker.arrow_style}` : ''}${profileAvailable ? ' has-plant-profile' : ''}${record.infoVisible ? ' is-info-open' : ''}" role="button" tabindex="${interactionMode ? '0' : '-1'}" data-ar-marker-id="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(record.marker.name)} ${markerLabel(record.marker.type)}${profileLabel}" style="${markerDomAppearanceStyle(record.marker)};--marker-rotation:${Number(record.rotationDegrees) || 0}deg">${record.marker.special_symbol ? `<span class="creator-ar-special-symbol" aria-hidden="true">${escapeHtml(record.marker.special_symbol)}</span>` : ''}${markerCaption}</span>`;
        return `${markerLayer}${profileLayer}`;
    }).join('');
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
        profilePanel?.addEventListener('pointerdown', event => {
            event.stopPropagation();
        });
        layer.querySelectorAll(`[data-ar-plant-profile="${CSS.escape(record.marker.id)}"] [data-pim-node]`).forEach(cell => {
            cell.addEventListener('pointerdown', event => {
                event.stopPropagation();
            });
            cell.addEventListener('click', event => {
                event.stopPropagation();
                const nodePath = cell.dataset.pimNode;
                const wasOpen = record.pimExpandedPaths?.includes(nodePath);
                const label = cell.querySelector('b')?.textContent || 'Cell';
                record.pimExpandedPaths = pimToggleExpandedPaths(record.pimExpandedPaths, nodePath);
                renderSessionMarkers();
                setPlacementStatus(wasOpen ? `${label} collapsed.` : `${label} opened into its information petals.`);
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
    if (plant) {
        const shapeField = document.createElement('label');
        shapeField.innerHTML = `Marker form<select name="markerShape"><option value="orb" ${markerAppearanceShape(record.marker) === 'orb' ? 'selected' : ''}>Orb</option><option value="plate" ${markerAppearanceShape(record.marker) === 'plate' ? 'selected' : ''}>Square number plate</option><option value="triangle" ${markerAppearanceShape(record.marker) === 'triangle' ? 'selected' : ''}>3D triangle</option></select>`;
        editor.querySelector('.creator-ar-appearance')?.append(shapeField);
    }
    editor.querySelector('[data-ar-editor-cancel]').addEventListener('click', closeInlineEditor);
    editor.querySelector('[data-ar-edit-in-web]').addEventListener('click', () => {
        arReturnContext = areaCheckpoint ? `web-totem:${record.areaId}` : `web-marker:${record.marker.id}`;
        exitArMode();
    });
    editor.querySelector('[data-ar-delete-marker]').addEventListener('click', async event => {
        const button = event.currentTarget;
        const status = editor.querySelector('[data-ar-editor-status]');
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
        const description = record.marker.description || record.marker.notes || '';
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
            const updated = type === 'area_checkpoint' && record.marker.type !== 'area_checkpoint'
                ? await convertRecordToAreaCheckpoint(record, update)
                : await updateAreaCompatibleMarker(record, update);
            record.marker = updated;
            renderSessionMarkers();
            closeInlineEditor();
            setPlacementStatus(`${updated.name} updated. Continue in Pointer mode or turn interaction off.`);
        } catch (error) {
            status.textContent = `Could not save: ${error.message}`;
        }
    });
}

function beginMarkerInteraction(record, event, { directHold = false, element = event.currentTarget } = {}) {
    if (!interactionMode) return;
    if (!directHold && interactionMode === 'view') {
        event.preventDefault();
        event.stopPropagation();
        if (hasPlantProfile(record)) {
            const opening = !record.profileExpanded;
            sessionMarkers.forEach(candidate => {
                if (candidate !== record && candidate.marker.type === 'plant') {
                    candidate.profileExpanded = false;
                    candidate.infoVisible = false;
                }
            });
            record.profileExpanded = opening;
            record.infoVisible = record.profileExpanded;
        } else {
            record.infoVisible = !record.infoVisible;
        }
        renderSessionMarkers();
        const visible = hasPlantProfile(record) ? record.profileExpanded : record.infoVisible;
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
    setPlacementStatus(`Saving ${state.record.marker.name}… Move mode remains on.`);
    try {
        await saveMarkerAnchor(operation.projectId, state.record.siteId, state.record.areaId, state.record.marker.id, spatialAnchor(state.record.position, operation, state.record.rotationDegrees));
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
    setPlacementStatus('Move cancelled. Move mode remains on.');
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
        // Keep an existing Totem visible to the placement controls even when
        // its anchor was lost or was never captured. Otherwise placement sees
        // the saved marker as a duplicate and offers no way to recover it.
        if (!hasPosition && !isAreaCheckpointMarker(marker)) return null;
        return {
            marker,
            plantProfile,
            profileExpanded: false,
            pimExpandedPaths: [],
            position: hasPosition ? { x: Number(position.x), y: Number(position.y), z: Number(position.z) } : { x: 0, y: 0, z: 0 },
            anchorPosition: hasPosition ? { x: Number(position.x), y: Number(position.y), z: Number(position.z) } : null,
            siteId,
            areaId: area.id,
            areaName: area.name,
            coordinateSpace: anchor?.coordinate_space || 'session-local',
            checkpointId: anchor?.checkpoint_id || '',
            rotationDegrees: Number(anchor?.rotation_degrees) || 0,
            unplaced: !hasPosition
        };
    }));
    if (!isArOperationCurrent(restoreOperation, guardOptions)) return;
    sessionMarkers = sessionMarkers.filter(record => record.areaId === restoreOperation.areaId);
    const existingIds = new Set(sessionMarkers.map(record => record.marker.id));
    sessionMarkers.push(...restored.filter(record => record && !existingIds.has(record.marker.id)));
    renderSessionMarkers();
    const totem = activeTotemRecord();
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
        setPlacementStatus(`${readyPlacementLabel(type)} created. Tap it in Pointer mode whenever you want to edit or resize it.`);
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
        const placementPosition = type === 'note'
            ? (latestNotePlacementPoint || placementPoint(type))
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
            updateReadyPlacementControl();
            setPlacementStatus(`Updating ${bagRecord.marker.name}…`);
            try {
                const updatedBagMarker = placementAppearance
                    ? await updatePlaceMarker(operation.projectId, bagRecord.siteId, bagRecord.areaId, bagRecord.marker.id, {
                        ...bagRecord.marker,
                        appearance: { ...(bagRecord.marker.appearance || {}), ...placementAppearance }
                    })
                    : bagRecord.marker;
                const bagAnchor = spatialAnchor(position, operation);
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
            name: specialMarker?.name || draftName,
            description: type === 'area_checkpoint' ? `Information centre for ${operation.areaName || 'this Area'}.` : ''
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
        const record = { marker, position, rotationDegrees: 0, siteId: operation.siteId, areaId: operation.areaId, areaName: operation.areaName, spawnedAt: performance.now() };
        sessionMarkers.push(record);
        renderSessionMarkers();
        if (type === 'area_checkpoint') {
            setPlacementStatus(`${operation.areaName || 'Area'} Totem placed. Your previous interaction mode is still active.`);
        } else {
            setPlacementStatus(`${marker.name} placed. Hold it to move it, or use Pointer mode to edit it.`);
        }
    } catch (error) {
        if (activePlacementOperation !== placementToken || !isArOperationCurrent(loadingOperation, { matchLocation: false })) return;
        readyPlacementType = type;
        if (placementAppearance) pendingPlacementAppearance = { type, ...placementAppearance };
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
    const hasCheckpoint = Boolean(activeAreaId && activeCheckpointId);
    const initialStatus = readyPlacementType
        ? `${readyPlacementLabel(readyPlacementType)} ready. Aim the centre circle, then tap it to place.`
        : hasCheckpoint
        ? 'Loading the saved Totem Marker…'
        : activeAreaId
        ? 'Aim dot ready. Hold any placed item to move it, or use Pointer mode for edit tools.'
        : '';
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'creatorArOverlay';
    overlayRoot.className = 'creator-ar-overlay';
    overlayRoot.innerHTML = `
        <p class="creator-ar-status" data-ar-placement-status role="status" aria-live="polite">${initialStatus}</p>
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
            <button class="creator-ar-special-marker" type="button" data-quest-ar-action="special" data-ar-add-special aria-label="Add Special Marker"><strong>+ SPECIAL</strong></button>
            <button class="creator-ar-mode-control" type="button" data-ar-view-mode aria-label="View only mode: hide the pointer and tap Markers for information" aria-pressed="false"><b class="creator-ar-view-icon" aria-hidden="true"></b><span class="sr-only">View mode</span></button>
            <button class="creator-ar-mode-control" type="button" data-ar-hold-mode aria-label="Move mode: adjust one Marker" aria-pressed="false"><b aria-hidden="true">&#x270B;</b><span class="sr-only">Move mode</span></button>
            <button class="creator-ar-mode-control" type="button" data-ar-select-mode aria-label="Pointer mode: select markers" aria-pressed="false"><b aria-hidden="true">&#x27A4;</b><span class="sr-only">Pointer mode</span></button>
            <button type="button" data-quest-ar-action="web" data-ar-web-return aria-label="Open spatial Web Hub"><b aria-hidden="true">&#x23CE;</b><span>WEB</span></button>
          </nav>
        </div>`;

    const armDirectPlacement = type => {
        if (readyPlacementType === type) {
            placementArmGeneration += 1;
            readyPlacementType = '';
            readySpecialMarker = null;
            pendingBagRecord = null;
            pendingPlacementAppearance = null;
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
    bindTaskbarAction('[data-ar-hold-mode]', () => setInteractionMode('grab'));
    bindTaskbarAction('[data-ar-select-mode]', () => setInteractionMode('select'));
    bindTaskbarAction('[data-ar-web-return]', openSpatialWebWindow);
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
    updateLocationNote();
}

function cleanup() {
    clearControllerMarkerPress();
    cleanupDrag();
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
    contextToolbarRecord = null;
    pendingPlacedRecord = null;
    destroySpatialSphereRenderer(gl, sphereRenderer);
    destroySpatialPrismRenderer(gl, prismRenderer);
    destroySpatialTriangleRenderer(gl, triangleRenderer);
    destroySpatialTetherRenderer(gl, controllerPointerRenderer);
    if (gl && homeSignTexture) gl.deleteTexture(homeSignTexture);
    questBeltTextures.forEach(texture => texture && gl?.deleteTexture(texture));
    questSpecialPaletteTextures.forEach(texture => texture && gl?.deleteTexture(texture));
    questSpatialWebTextures.forEach(texture => texture && gl?.deleteTexture(texture));
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
    questSpatialWebTextures = [];
    questSpatialWebTextureKey = '';
    questSpatialWebLayout = [];
    questSpatialWebVisible = false;
    questSpatialWebHoverIndex = -1;
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
    if (!projectId || !navigator.xr || !window.isSecureContext) return false;
    activeProjectId = projectId;
    activeProjectName = String(projectId).replace(/[-_]+/g, ' ').trim();
    activeSiteId = preferredSiteId || '';
    activeAreaId = areaId;
    activeAreaName = '';
    activeCheckpointId = checkpointId;
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
    createOverlay();

    try {
        // The Quest belt is rendered inside the XR WebGL layer. DOM overlay
        // is still preferred for the spatial Web Hub, but it must not block
        // the underlying Quest session: some Quest Browser builds refuse the
        // optional feature while immersive AR/VR remains fully available.
        // Legacy optional-overlay signature retained for static integrations:
        // requestImmersiveArSession(overlayRoot, { requireDomOverlay: false, preferDomOverlay: questBrowser })
        // DOM overlay is preferred for the floating dashboard, but it is not
        // supported by every Quest Browser build. Never make AR startup
        // depend on that optional feature.
        const arSession = await requestImmersiveArSession(overlayRoot, { requireDomOverlay: false, preferDomOverlay: questBrowser });
        session = arSession.session;
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
            const specialPaletteTarget = creatorInputMode === 'controller' && latestControllerRay ? controllerSpecialPaletteActionAtAim() : null;
            const webTarget = !specialPaletteTarget && creatorInputMode === 'controller' && latestControllerRay ? controllerSpatialWebActionAtAim() : null;
            const beltTarget = !specialPaletteTarget && !webTarget && creatorInputMode === 'controller' && latestControllerRay ? controllerBeltActionAtAim() : null;
            if (!specialPaletteTarget && !webTarget && !beltTarget && creatorInputMode === 'controller' && latestControllerRay) controllerMarkerAtAim();
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
                drawSpatialMarkers(view);
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
        console.error('[Creator AR]', error);
        const activeSession = session;
        session = null;
        cleanup();
        activeSession?.end().catch(() => {});
        return false;
    }
}
