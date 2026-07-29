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
import { matrixFromPose } from '../services/spatialPlacement.js';
import { spatialMoveControlMarkup } from '../services/spatialMoveControl.js';
import { createMinimalMarkerDraft, scopedMarkerStorageId } from '../services/markerWorkflow.js';
import { creatorPlantProfileLayout } from '../services/creatorPlantProfileLayout.js';
import { placementPointerMarkup } from '../services/placementPointer.js';
import { createSpatialSphereRenderer, destroySpatialSphereRenderer, drawSpatialOrb } from '../services/spatialSphereRenderer.js';
import { createSpatialPrismRenderer, destroySpatialPrismRenderer, drawSpatialPrism } from '../services/spatialPrismRenderer.js';

let session = null;
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
let readyPlacementType = '';
let readySpecialMarker = null;
let pendingPlacementAppearance = null;
let contextToolbarRecord = null;
let pendingPlacedRecord = null;
let hitTestSource = null;
let latestHitMatrix = null;
let markerProgram = null;
let markerBuffer = null;
let sphereRenderer = null;
let prismRenderer = null;
let placementArmedAt = 0;
let arHistoryArmed = false;
let handlingArHistory = false;
let placementInProgress = false;
let pendingBagRecord = null;
let locatedTotemRecord = null;
let specialPickerRequest = 0;
let placementArmGeneration = 0;
let activePlacementOperation = null;
let pendingExistingMarkerId = '';
let arReturnContext = '';
let locationNoteAnchor = null;
let referenceSpaceHasFloor = false;
let sessionGroundY = null;
let locationNoteConfig = null;
let locationNoteVisible = false;
const hiddenStructuralMarkerIds = new Set();

const markerLabel = type => ({ plant: 'plant', sub_checkpoint: 'marker', note: 'note', intro_checkpoint: 'trail entrance gateway', area_checkpoint: 'area totem' })[type] || 'item';
const markerIcon = type => ({ plant: '&#x1F331;', sub_checkpoint: '&#x2691;', note: '&#x270E;', intro_checkpoint: '&#x2316;', area_checkpoint: '&#x2316;' })[type] || '&#x25C6;';
const readyPlacementLabel = type => ({ plant: 'Plant', sub_checkpoint: 'Marker', note: 'Note', intro_checkpoint: 'Trail Entrance', area_checkpoint: 'Area Totem' })[type] || 'Draft';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const markerDefaultColor = type => ({ plant: '#6fb85a', note: '#d7834f', sub_checkpoint: '#647a3b', intro_checkpoint: '#43c99b', area_checkpoint: '#68c7b8' })[type] || '#647a3b';
const markerAppearanceColor = marker => /^#[0-9a-f]{6}$/i.test(marker?.appearance?.color || '') ? marker.appearance.color : markerDefaultColor(marker?.type);
const markerAppearanceSize = marker => ['tiny', 'small', 'medium', 'large', 'huge'].includes(marker?.appearance?.size) ? marker.appearance.size : 'medium';
const markerAppearanceOpacity = marker => [1, .8, .6, .4].includes(Number(marker?.appearance?.opacity)) ? Number(marker.appearance.opacity) : 1;
const markerNoteSurface = marker => marker?.appearance?.surface === 'outline' ? 'outline' : 'filled';
const TASKBAR_V2_COLORS = Object.freeze({
    plant: Object.freeze([
        { name: 'Forest', value: '#6fb85a' },
        { name: 'Lime', value: '#b7e895' },
        { name: 'Coral', value: '#dd6b55' },
        { name: 'Sky', value: '#5fa8d3' }
    ]),
    note: Object.freeze([
        { name: 'Amber', value: '#d7834f' },
        { name: 'Leaf', value: '#78a96b' },
        { name: 'Sky', value: '#5fa8d3' },
        { name: 'Violet', value: '#8d74b8' }
    ])
});
const TASKBAR_V2_SIZES = Object.freeze(['small', 'medium', 'large', 'huge']);
const TASKBAR_V2_OPACITIES = Object.freeze([1, .8, .6, .4]);
const DEFAULT_LOCATION_NOTE = Object.freeze({
    enabled: true,
    prompt: 'WHERE AM I NOW?'
});
const normalizeAreaCheckpointMarker = marker => marker?.semantic_type === 'area_checkpoint'
    ? { ...marker, type: 'area_checkpoint', storage_type: marker.storage_type || 'sub_checkpoint' }
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
        area_checkpoint: [.11 * factor, .68 * factor],
        intro_checkpoint: [.42 * factor, .805 * factor],
        // Notes are readable spatial signs rather than tiny object labels.
        note: [.94 * factor, .345 * factor],
        plant: [.062 * factor, .062 * factor],
        sub_checkpoint: [markerScale(marker), markerScale(marker)]
    })[marker.type] || [markerScale(marker), markerScale(marker)];
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
        opacity: appearance.opacity
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
        opacity: type === 'plant' ? markerAppearanceOpacity(marker) : 1
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
    return `--marker-accent:${markerAppearanceColor(marker)};--marker-rotation:0deg;--marker-hit-size:${Math.round(64 * factor)}px;--marker-note-width:min(86vw,${noteWidth}px);--marker-note-height:${noteHeight}px;--marker-opacity:${opacity}`;
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

function activateArea(area) {
    const nextAreaId = area?.id || '';
    if (activeAreaId !== nextAreaId) {
        sessionMarkers = [];
        locatedTotemRecord = null;
        locationNoteVisible = false;
        locationNoteAnchor = null;
        renderSessionMarkers();
    }
    activeAreaId = nextAreaId;
    activeAreaName = isDefaultHomeArea(area) ? DEFAULT_HOME_AREA_NAME : area?.name || '';
    updateLocationNote();
}

function hasPlantProfile(record) {
    const profile = record?.plantProfile || record?.marker?.plant_profile || {};
    return record?.marker?.type === 'plant' && Boolean(
        profile.profile_enabled === true
        || profile.scientific_name
        || profile.overview
        || profile.family
        || profile.origin
        || profile.plant_type
        || profile.layer
        || profile.uses
        || profile.propagation
        || profile.relationships
    );
}

function creatorPlantKnowledge(record) {
    const profile = record.plantProfile || record.marker.plant_profile || {};
    const summary = (...values) => values.find(value => String(value || '').trim()) || 'Add in Web Mode';
    return {
        title: profile.common_name || record.marker.name || 'Plant Profile',
        left: [
            ['USES', summary(profile.uses, profile.overview)],
            ['RELATIONSHIPS', summary(profile.relationships, profile.companions)],
            ['FOREST LAYER', summary(profile.layer, profile.plant_type)]
        ],
        right: [
            ['SCIENTIFIC', summary(profile.scientific_name)],
            ['BIOLOGY', summary(profile.family, profile.plant_type)],
            ['ORIGIN', summary(profile.origin, profile.propagation)]
        ]
    };
}

function creatorPlantKnowledgeMarkup(record) {
    const knowledge = creatorPlantKnowledge(record);
    const compactLabel = label => ({
        RELATIONSHIPS: 'LINKS',
        SCIENTIFIC: 'BOTANY',
        'FOREST LAYER': 'LAYER'
    })[String(label).toUpperCase()] || label;
    const branch = (side, items) => `<span class="plant-knowledge-branch plant-knowledge-${side}">${items.map(([label, value], index) => `<button type="button" class="plant-knowledge-cell" data-ar-plant-branch="${side}-${index}" aria-label="${escapeHtml(label)}" aria-expanded="false"><b>${escapeHtml(compactLabel(label))}</b><small aria-hidden="true">${escapeHtml(value)}</small></button>`).join('')}</span>`;
    return `<span class="plant-knowledge-map"><svg class="plant-knowledge-connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="plant-knowledge-lattice" d="M50 50 L38 28 L27 50 L38 72 L50 50 L62 28 L73 50 L62 72 Z"/><path class="plant-knowledge-terminals" d="M34 20 L28 9 M66 20 L72 9 M34 80 L28 91 M66 80 L72 91"/><circle cx="28" cy="9" r="1.7"/><circle cx="72" cy="9" r="1.7"/><circle cx="28" cy="91" r="1.7"/><circle cx="72" cy="91" r="1.7"/></svg>${branch('left', knowledge.left)}<span class="plant-knowledge-core"><small>PLANT PROFILE</small><strong>${escapeHtml(knowledge.title)}</strong></span>${branch('right', knowledge.right)}</span>`;
}

function creatorTotemInformationMarkup(record) {
    const board = areaBoard(record.marker);
    const bubbles = board.informationBubbles.length ? board.informationBubbles : [board.introduction];
    const cards = [board.title, ...bubbles].filter(Boolean).slice(0, 5);
    return `<aside class="creator-ar-totem-information" aria-label="${escapeHtml(board.title)} information"><svg class="creator-ar-totem-branches" viewBox="0 0 360 430" preserveAspectRatio="none" aria-hidden="true"><path d="M180 215 C130 180 110 100 64 72"/><path d="M180 205 C205 150 224 90 274 72"/><path d="M190 228 C245 220 264 178 310 170"/><path d="M170 248 C118 256 92 300 48 304"/><path d="M190 262 C236 278 248 330 286 338"/></svg>${cards.map((text, index) => `<span class="creator-ar-totem-bubble creator-ar-totem-bubble-${index + 1}">${escapeHtml(text)}</span>`).join('')}</aside>`;
}

function setPlacementStatus(message) {
    const status = overlayRoot?.querySelector('[data-ar-placement-status]');
    if (status) status.textContent = message;
}

function contextAppearanceButtons(type, appearance) {
    if (!['plant', 'note'].includes(type)) return '';
    const color = colorOption(type, appearance.color);
    const size = String(appearance.size || 'medium').toUpperCase();
    const opacity = Math.round(Number(appearance.opacity ?? 1) * 100);
    return `<button type="button" data-ar-cycle-color aria-label="Cycle ${readyPlacementLabel(type)} color. Current ${escapeHtml(color.name)}"><b class="creator-ar-color-cycle" style="--cycle-color:${escapeHtml(color.value)}" aria-hidden="true"></b><span>COLOR</span><small>${escapeHtml(color.name)}</small></button>
        <button type="button" data-ar-cycle-size aria-label="Cycle ${readyPlacementLabel(type)} size. Current ${escapeHtml(size)}"><b aria-hidden="true">&#9670;</b><span>SIZE</span><small>${escapeHtml(size)}</small></button>
        ${type === 'plant' ? `<button type="button" data-ar-cycle-opacity aria-label="Cycle Plant opacity. Current ${opacity} percent"><b aria-hidden="true">&#9680;</b><span>OPACITY</span><small>${opacity}%</small></button>` : ''}`;
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
            opacity: markerAppearanceOpacity(selectedRecord.marker)
        };
    const stateLabel = placementType ? `Create ${readyPlacementLabel(type)}` : `Edit ${selectedRecord.marker.name}`;
    const locationNoteControl = !placementType && type === 'area_checkpoint'
        ? `<button type="button" data-ar-context-location-note aria-pressed="${locationNoteVisible}"><b aria-hidden="true">${locationNoteVisible ? '&#9681;' : '&#9673;'}</b><span>${locationNoteVisible ? 'HIDE NOTE' : 'VIEW NOTE'}</span></button>`
        : '';
    toolbar.hidden = false;
    toolbar.setAttribute('aria-label', `${stateLabel} tools`);
    toolbar.innerHTML = `<span class="creator-ar-context-label">${placementType ? 'CREATE' : 'EDIT'}</span>
        ${contextAppearanceButtons(type, appearance)}
        ${locationNoteControl}
        <button type="button" data-ar-context-web><b aria-hidden="true">&#8599;</b><span>WEB MODE</span></button>
        <button type="button" data-ar-context-close aria-label="${placementType ? 'Cancel placement' : 'Close edit tools'}"><b aria-hidden="true">&times;</b><span class="sr-only">Close</span></button>`;
    bindContextToolbarAction(toolbar, '[data-ar-cycle-color]', () => cycleContextAppearance('color'));
    bindContextToolbarAction(toolbar, '[data-ar-cycle-size]', () => cycleContextAppearance('size'));
    bindContextToolbarAction(toolbar, '[data-ar-cycle-opacity]', () => cycleContextAppearance('opacity'));
    bindContextToolbarAction(toolbar, '[data-ar-context-location-note]', () => toggleLocationNoteVisibility(selectedRecord));
    bindContextToolbarAction(toolbar, '[data-ar-context-web]', () => void openContextInWebMode());
    bindContextToolbarAction(toolbar, '[data-ar-context-close]', () => {
        if (placementType) {
            placementArmGeneration += 1;
            readyPlacementType = '';
            readySpecialMarker = null;
            pendingBagRecord = null;
            pendingPlacementAppearance = null;
            updateReadyPlacementControl();
            setPlacementStatus('Placement cancelled.');
            return;
        }
        contextToolbarRecord = null;
        updateContextToolbar();
        setPlacementStatus('Pointer mode remains on. Select another object to edit it.');
    });
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
    preview.hidden = !armed;
    if (!armed) return;
    const marker = placementPreviewMarker('note');
    const factor = markerSizeFactor(marker);
    const label = preview.querySelector('[data-ar-note-placement-label]');
    preview.style.setProperty('--note-preview-width', `${Math.round(280 * factor)}px`);
    preview.style.setProperty('--note-preview-height', `${Math.round(116 * factor)}px`);
    surface.style.setProperty('--spatial-note-color', markerAppearanceColor(marker));
    surface.style.setProperty('--note-preview-opacity', markerAppearanceOpacity(marker));
    if (label) label.textContent = marker.name || 'New note';
}

function positionNotePlacementPreview(view = latestView) {
    const preview = overlayRoot?.querySelector('[data-ar-note-placement-preview]');
    if (!preview || readyPlacementType !== 'note') return;
    const target = placementPoint();
    const point = target ? projectWorldPoint(view, target) : null;
    preview.hidden = !point;
    if (!point) return;
    preview.style.transform = `translate(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px) translate(-50%, -50%)`;
}

function placementPoint() {
    if (!latestViewerMatrix) return null;
    const distance = AR_EXPERIENCE_CONFIG.placementDistanceMetres;
    const ray = pointerWorldRay() || {
        x: -latestViewerMatrix[8],
        y: -latestViewerMatrix[9],
        z: -latestViewerMatrix[10]
    };
    return {
        x: latestViewerMatrix[12] + ray.x * distance,
        y: latestViewerMatrix[13] + ray.y * distance,
        z: latestViewerMatrix[14] + ray.z * distance
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

function cleanupDrag() {
    window.removeEventListener('pointermove', moveMarkerDrag);
    window.removeEventListener('pointercancel', cancelMarkerDrag);
    dragState?.element?.classList.remove('is-adjusting');
    dragState = null;
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
}

function setInteractionMode(mode) {
    if (dragState) {
        dragState.record.position = dragState.position;
        cleanupDrag();
        positionSessionMarkers();
    }
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
    else setPlacementStatus('Aim dot ready. Hover over Markers to reveal their names.');
}

function closeAreaChooser() {
    const chooser = overlayRoot?.querySelector('[data-ar-area-chooser]');
    if (chooser) {
        chooser.hidden = true;
        chooser.innerHTML = '';
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

function pointToActiveTotem() {
    const totem = activeTotemRecord();
    if (!totem) {
        setPlacementStatus(`${activeAreaName || 'This Area'} has no Totem yet. Choose Create to add one.`);
        return;
    }
    hiddenStructuralMarkerIds.delete(totem.marker.id);
    locatedTotemRecord = totem;
    renderSessionMarkers();
    closePlacePicker();
    setPlacementStatus(`A ground pointer now leads to the ${totem.marker.name} Totem.`);
}

function toggleActiveTotemVisibility() {
    const totem = activeTotemRecord();
    if (!totem) {
        setPlacementStatus(`${activeAreaName || 'This Area'} has no Totem yet. Choose Create to add one.`);
        return;
    }
    if (hiddenStructuralMarkerIds.has(totem.marker.id)) {
        hiddenStructuralMarkerIds.delete(totem.marker.id);
        setPlacementStatus(`${totem.marker.name} Totem shown.`);
    } else {
        hiddenStructuralMarkerIds.add(totem.marker.id);
        locatedTotemRecord = null;
        locationNoteVisible = false;
        locationNoteAnchor = null;
        updateLocationNote();
        setPlacementStatus(`${totem.marker.name} Totem hidden for this AR session.`);
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

function createTotemFromSpecial() {
    if (activeAreaId && !activeTotemRecord()) {
        closePlacePicker();
        void armPlacement('area_checkpoint');
        return;
    }
    void openArAreaCreationForm();
}

function renderSpecialMarkerChoices(picker) {
    const totem = activeTotemRecord();
    const totemHidden = Boolean(totem && hiddenStructuralMarkerIds.has(totem.marker.id));
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
            <button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-point-to-totem><b aria-hidden="true">&#8982;</b><span><strong>Point to Totem</strong></span></button>
            <button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-toggle-totem><b aria-hidden="true">${totemHidden ? '&#9673;' : '&#9675;'}</b><span><strong>${totemHidden ? 'Show Totem' : 'Hide Totem'}</strong></span></button>
            <button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-toggle-location-note><b aria-hidden="true">${locationNoteVisible ? '&#9681;' : '&#9673;'}</b><span><strong>${locationNoteVisible ? 'Hide Location Note' : 'View Location Note'}</strong></span></button>
            <button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-create-area><b aria-hidden="true">+</b><span><strong>Create</strong><small>Totem / Area</small></span></button>
        </div></section>
        <section class="creator-ar-special-section creator-ar-indicator-section"><strong>SYMBOLS</strong><small>ARROWS</small><div class="creator-ar-special-grid creator-ar-arrow-grid">${arrows}</div><small>MARKS</small><div class="creator-ar-special-grid">${alerts}</div></section>`;
    picker.querySelector('[data-ar-close-special]').addEventListener('click', closePlacePicker);
    picker.querySelector('[data-ar-point-to-totem]').addEventListener('click', pointToActiveTotem);
    picker.querySelector('[data-ar-toggle-totem]').addEventListener('click', toggleActiveTotemVisibility);
    picker.querySelector('[data-ar-toggle-location-note]').addEventListener('click', () => {
        toggleLocationNoteVisibility(totem);
        closePlacePicker();
    });
    picker.querySelector('[data-ar-create-area]').addEventListener('click', createTotemFromSpecial);
    picker.querySelectorAll('[data-ar-special-symbol]').forEach(button => button.addEventListener('click', () => {
        readySpecialMarker = {
            name: button.dataset.arSpecialLabel,
            special_symbol: button.dataset.arSpecialSymbol,
            arrow_style: button.dataset.arArrowStyle ? Number(button.dataset.arArrowStyle) : undefined,
            appearance: { color: ['!', '?'].includes(button.dataset.arSpecialSymbol) ? '#eaa45d' : '#75a9cc', size: 'large' }
        };
        void armPlacement('sub_checkpoint');
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
            activeAreaId = area.id;
            activeAreaName = area.name;
            sessionMarkers = [];
            locatedTotemRecord = null;
            renderSessionMarkers();
            closePlacePicker();
            await armPlacement('area_checkpoint');
        } catch (error) {
            status.textContent = `Area could not be created: ${error.message}`;
        }
    });
}

async function openSpecialMarkerPicker() {
    const picker = overlayRoot?.querySelector('[data-ar-place-picker]');
    if (!picker) return;
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
            if(shape>4.5){body=box(q,vec2(.46,.42));shaded=mix(color*.45,color,.65);front=body;}
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
    sphereRenderer = createSpatialSphereRenderer(gl);
    prismRenderer = createSpatialPrismRenderer(gl);
}

function drawSpatialMarkers(view) {
    if (!markerProgram || !markerBuffer || !sphereRenderer || !prismRenderer) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const colors = { plant: [.42, .72, .34], note: [.66, .69, .64], sub_checkpoint: [.39, .48, .23], intro_checkpoint: [.26, .82, .62], area_checkpoint: [.34, .78, .7] };

    activeAreaMarkers().forEach(record => {
        if (hiddenStructuralMarkerIds.has(record.marker.id)) return;
        const shape = markerShape(record.marker.type);
        if (shape === 1) {
            const [halfWidth, halfHeight] = markerDimensions(record.marker);
            const groundPosition = groundedTotemPosition(record.position);
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
        if ((shape !== 0 && shape !== 4) || record.marker.special_symbol) return;
        const [scaleX, scaleY] = markerDimensions(record.marker);
        const baseColor = colors[record.marker.type] || colors.sub_checkpoint;
        const arrivalProgress = Number.isFinite(record.spawnedAt)
            ? Math.min(1, Math.max(0, (performance.now() - record.spawnedAt) / 850))
            : 1;
        const arrivalEase = 1 - Math.pow(1 - arrivalProgress, 3);
        drawSpatialOrb(gl, sphereRenderer, view, record.position, Math.max(scaleX, scaleY) * (.72 + arrivalEase * .28), {
            type: shape === 4 ? 'plant' : 'marker',
            color: markerRgb(record.marker, baseColor),
            opacity: arrivalEase * markerAppearanceOpacity(record.marker)
        });
    });

    if (['plant', 'sub_checkpoint'].includes(readyPlacementType) && latestViewerMatrix && !readySpecialMarker) {
        const target = placementPoint();
        if (!target) return;
        const previewMarker = placementPreviewMarker(readyPlacementType);
        const [previewWidth, previewHeight] = markerDimensions(previewMarker);
        drawSpatialOrb(gl, sphereRenderer, view, target, Math.max(previewWidth, previewHeight), {
            type: readyPlacementType === 'plant' ? 'plant' : 'marker',
            color: markerRgb(previewMarker, readyPlacementType === 'plant' ? colors.plant : [.72, .9, .58]),
            opacity: markerAppearanceOpacity(previewMarker)
        });
    }

    gl.useProgram(markerProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, markerBuffer);
    const positionLocation = gl.getAttribLocation(markerProgram, 'p');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    activeAreaMarkers().forEach(record => {
        if (hiddenStructuralMarkerIds.has(record.marker.id)) return;
        const shape = markerShape(record.marker.type);
        if (shape === 0 || shape === 1 || shape === 3 || shape === 4) return;
        const [scaleX, scaleY] = markerDimensions(record.marker);
        const groundedPosition = shape === 1 || shape === 2 ? { ...record.position, y: record.position.y + scaleY } : record.position;
        const model = markerBillboardMatrix(groundedPosition, scaleX, scaleY);
        const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(markerProgram, 'mvp'), false, mvp);
        gl.uniform1f(gl.getUniformLocation(markerProgram, 'shape'), shape);
        gl.uniform1f(gl.getUniformLocation(markerProgram, 'opacity'), markerAppearanceOpacity(record.marker));
        const baseColor = colors[record.marker.type] || colors.sub_checkpoint;
        gl.uniform3fv(gl.getUniformLocation(markerProgram, 'color'), markerRgb(record.marker, baseColor));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    if (locatedTotemRecord?.areaId === activeAreaId) {
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
    const inverse = view.transform?.inverse?.matrix;
    if (!inverse || !view.projectionMatrix) return;
    activeAreaMarkers().forEach(record => {
        const element = overlayRoot.querySelector(`[data-ar-marker-id="${CSS.escape(record.marker.id)}"]`);
        if (!element) return;
        if (hiddenStructuralMarkerIds.has(record.marker.id)) {
            element.hidden = true;
            return;
        }
        const projectedPosition = record.marker.type === 'area_checkpoint'
            ? (() => {
                const ground = groundedTotemPosition(record.position);
                const [, halfHeight] = markerDimensions(record.marker);
                return { ...ground, y: ground.y + .08 * markerSizeFactor(record.marker) + halfHeight };
            })()
            : record.position;
        const eye = multiplyMatrixVector(inverse, [projectedPosition.x, projectedPosition.y, projectedPosition.z, 1]);
        const clip = multiplyMatrixVector(view.projectionMatrix, eye);
        if (!Number.isFinite(clip[3]) || clip[3] <= 0) {
            element.hidden = true;
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
        if (visible) {
            element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -50%)`;
            element.style.setProperty('--marker-rotation', `${Number(record.rotationDegrees) || 0}deg`);
            positionCreatorPlantProfile(record, x, y);
        }
    });
}

function positionCreatorPlantProfile(record, markerX, markerY) {
    if (!record.profileExpanded || !overlayRoot) return;
    const profile = overlayRoot.querySelector(`[data-ar-plant-profile="${CSS.escape(record.marker.id)}"]`);
    const tether = overlayRoot.querySelector(`[data-ar-plant-tether="${CSS.escape(record.marker.id)}"]`);
    if (!profile || !tether) return;
    const layout = creatorPlantProfileLayout(window.innerWidth, window.innerHeight, markerX, markerY);
    const { panelWidth, panelHeight, panelX, panelY, panelTop, tetherStartY } = layout;
    profile.style.left = `${panelX}px`;
    profile.style.top = `${panelY}px`;
    profile.style.width = `${panelWidth}px`;
    profile.style.height = `${panelHeight}px`;
    const diagramAnchorX = panelX;
    const diagramAnchorY = panelTop + 4;
    const dx = diagramAnchorX - markerX;
    const dy = diagramAnchorY - tetherStartY;
    tether.style.left = `${markerX}px`;
    tether.style.top = `${tetherStartY - 9}px`;
    tether.style.width = `${Math.max(8, Math.hypot(dx, dy))}px`;
    tether.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
}

function renderSessionMarkers() {
    const layer = overlayRoot?.querySelector('[data-ar-marker-layer]');
    if (!layer) return;
    const visibleMarkers = activeAreaMarkers();
    layer.innerHTML = visibleMarkers.map(record => {
        const profileAvailable = hasPlantProfile(record);
        const profileLabel = profileAvailable ? (record.profileExpanded ? ' Hide Plant Profile' : ' Open Plant Profile') : '';
        const informationSummary = record.marker.description
            || record.marker.notes
            || (record.marker.type === 'area_checkpoint' ? areaBoard(record.marker).introduction : '')
            || `${readyPlacementLabel(record.marker.type)} information`;
        const profileLayer = profileAvailable && record.profileExpanded
            ? `<svg class="creator-ar-plant-tether" data-ar-plant-tether="${escapeHtml(record.marker.id)}" viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true"><path d="M0 9 C28 2 70 16 100 9"></path></svg><aside class="creator-ar-plant-profile is-below-orb" data-ar-plant-profile="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(record.marker.name)} Plant Profile" style="--profile-accent:${markerAppearanceColor(record.marker)}">${creatorPlantKnowledgeMarkup(record)}</aside>`
            : record.marker.type === 'area_checkpoint' && record.infoVisible
                ? creatorTotemInformationMarkup(record)
                : '';
        const markerLayer = `<span class="creator-ar-marker-hit-target creator-ar-marker-hit-target-${escapeHtml(record.marker.type)}${record.marker.type === 'note' && markerNoteSurface(record.marker) === 'outline' ? ' is-note-outline' : ''}${record.marker.special_symbol ? ' is-symbol-marker' : ''}${record.marker.arrow_style ? ` is-arrow-marker is-arrow-style-${record.marker.arrow_style}` : ''}${profileAvailable ? ' has-plant-profile' : ''}${record.infoVisible ? ' is-info-open' : ''}" role="button" tabindex="${interactionMode ? '0' : '-1'}" data-ar-marker-id="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(record.marker.name)} ${markerLabel(record.marker.type)}${profileLabel}" style="${markerDomAppearanceStyle(record.marker)};--marker-rotation:${Number(record.rotationDegrees) || 0}deg">${record.marker.special_symbol ? `<span class="creator-ar-special-symbol" aria-hidden="true">${escapeHtml(record.marker.special_symbol)}</span>` : ''}<span class="creator-ar-spatial-name${record.marker.type === 'note' ? ' nourishland-spatial-note-surface' : ''}">${escapeHtml(record.marker.name)}${profileAvailable ? '<small>Plant Profile</small>' : `<small>${escapeHtml(informationSummary)}</small>`}</span></span>`;
        return `${markerLayer}${profileLayer}`;
    }).join('');
    visibleMarkers.forEach(record => {
        const element = layer.querySelector(`[data-ar-marker-id="${CSS.escape(record.marker.id)}"]`);
        element?.addEventListener('pointerdown', event => beginMarkerInteraction(record, event));
        element?.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            beginMarkerInteraction(record, event);
        });
        const profilePanel = layer.querySelector(`[data-ar-plant-profile="${CSS.escape(record.marker.id)}"]`);
        profilePanel?.addEventListener('pointerdown', event => {
            event.stopPropagation();
        });
        layer.querySelectorAll(`[data-ar-plant-profile="${CSS.escape(record.marker.id)}"] [data-ar-plant-branch]`).forEach(cell => {
            const activate = () => {
                layer.querySelectorAll(`[data-ar-plant-profile="${CSS.escape(record.marker.id)}"] [data-ar-plant-branch]`).forEach(candidate => {
                    const open = candidate === cell;
                    candidate.classList.toggle('is-open', open);
                    candidate.setAttribute('aria-expanded', String(open));
                    candidate.querySelector('small')?.setAttribute('aria-hidden', String(!open));
                });
            };
            cell.addEventListener('pointerdown', event => {
                event.stopPropagation();
            });
            cell.addEventListener('click', event => {
                event.stopPropagation();
                activate();
            });
            cell.addEventListener('mouseenter', () => {
                activate();
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
    const areaBoardControls = areaCheckpoint ? `<fieldset class="creator-ar-area-board-editor"><legend>Area welcome board</legend><label>Board title<input name="areaBoardTitle" value="${escapeHtml(board.title)}" required /></label><label>Welcome message<textarea name="areaBoardIntroduction" rows="3" placeholder="Explain what this Area is for and welcome people into it.">${escapeHtml(board.introduction)}</textarea></label><p>This spatial board gathers around the Area Totem and can be refined later.</p></fieldset>` : '';
    const noticeBoard = record.marker.notice_board || {};
    const startingBoardControls = startingPoint ? `<fieldset class="creator-ar-area-board-editor"><legend>Trail Entrance notice board</legend><label>Board title<input name="noticeBoardTitle" value="${escapeHtml(noticeBoard.title || record.marker.name)}" /></label><label>Welcome notice<textarea name="noticeBoardMessage" rows="3" placeholder="Add a welcome, orientation or important notice.">${escapeHtml(noticeBoard.message || '')}</textarea></label><p>Leave the notice blank when this entrance needs no spatial text.</p></fieldset>` : '';
    const profileNote = plant
        ? `<p class="creator-ar-profile-note">${hasPlantProfile(record) ? 'Plant Profile enabled. Use View mode to reveal it, or Web Mode to extend its knowledge.' : 'Upgrade this Plant in Web Mode to unlock its interactive AR information tree.'}</p>`
        : '';
    editor.innerHTML = `<form class="creator-ar-editor-form" data-ar-editor-form><div class="creator-ar-editor-heading"><p class="welcome-label">Quick edit · ${escapeHtml(record.areaName)}</p><button type="button" data-ar-edit-in-web>Edit in Web Mode</button></div><label class="creator-ar-rename">Rename<input name="name" value="${escapeHtml(record.marker.name)}" required /></label>${markerControls}${areaBoardControls}${startingBoardControls}${profileNote}<div class="creator-ar-editor-actions"><button class="creator-ar-delete" type="button" data-ar-delete-marker>Delete</button><span></span><button type="button" data-ar-editor-cancel>Cancel</button><button class="primary" type="submit">Save</button></div><p class="meta" data-ar-editor-status></p></form>`;
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

function beginMarkerInteraction(record, event) {
    if (!interactionMode) return;
    if (interactionMode === 'view') {
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
    if (interactionMode === 'neutral') return;
    event.preventDefault();
    event.stopPropagation();
    if (interactionMode === 'select') {
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
        element: event.currentTarget,
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
    event.currentTarget.classList.add('is-adjusting');
    overlayRoot?.classList.add('is-holding-item');
    event.currentTarget.setPointerCapture?.(event.pointerId);
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
    setPlacementStatus(`Moving ${record.marker.name}. Look around to guide it, slide up to push or down to pull, then press Release.`);
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
    if (!latestViewerMatrix || !latestView?.projectionMatrix) return null;
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
    dragState.record.position.x = latestViewerMatrix[12] + ray.x * distance;
    dragState.record.position.y = latestViewerMatrix[13] + ray.y * distance;
    dragState.record.position.z = latestViewerMatrix[14] + ray.z * distance;
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
    const areas = await loadSitePlaces(operation.projectId, site.id);
    if (!isArOperationCurrent(operation, guardOptions)) return [];
    activeSiteId = site.id;
    activeProjectName = project?.name || activeProjectName || operation.projectId;
    locationNoteConfig = normalizedLocationNote(project, site);
    const selected = areas.find(area => area.id === operation.areaId);
    if (selected) {
        activateArea(selected);
    } else {
        activateArea(null);
    }
    updateLocationNote();
    return areas;
}

async function restoreRecordedMarkers(operation = captureArOperationContext(), guardOptions = {}) {
    if (!operation.projectId || !operation.siteId || !operation.areaId || !isArOperationCurrent(operation, guardOptions)) return;
    const areas = await loadSitePlaces(operation.projectId, operation.siteId).catch(() => []);
    if (!isArOperationCurrent(operation, guardOptions)) return;
    const area = areas.find(item => item.id === operation.areaId);
    if (!area) return;
    const savedMarkers = await loadPlaceMarkers(operation.projectId, operation.siteId, area.id).catch(() => []);
    const restored = await Promise.all(savedMarkers.map(async savedMarker => {
        const marker = normalizeSpatialMarker(savedMarker);
        const [anchor, plantProfile] = await Promise.all([
            loadMarkerAnchor(operation.projectId, operation.siteId, area.id, marker.id).catch(() => null),
            marker.type === 'plant'
                ? loadPlantProfile(operation.projectId, operation.siteId, area.id, marker.id).catch(() => null)
                : null
        ]);
        const position = anchor?.position;
        if (anchor?.type !== 'spatial' || !position || !['x', 'y', 'z'].every(axis => Number.isFinite(Number(position[axis])))) return null;
        return {
            marker,
            plantProfile,
            profileExpanded: false,
            position: { x: Number(position.x), y: Number(position.y), z: Number(position.z) },
                siteId: operation.siteId,
                areaId: area.id,
                areaName: area.name,
                coordinateSpace: anchor.coordinate_space || 'session-local',
                rotationDegrees: Number(anchor.rotation_degrees) || 0
        };
    }));
    if (!isArOperationCurrent(operation, guardOptions)) return;
    sessionMarkers = sessionMarkers.filter(record => record.areaId === operation.areaId);
    const existingIds = new Set(sessionMarkers.map(record => record.marker.id));
    sessionMarkers.push(...restored.filter(record => record && !existingIds.has(record.marker.id)));
    renderSessionMarkers();
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
    const focusedProfileView = marker.type === 'plant'
        && hasPlantProfile(focusedRecord)
        && String(arReturnContext).startsWith('web-marker:');
    if (focusedRecord && focusedProfileView) {
        sessionMarkers = [focusedRecord];
        focusedRecord.profileExpanded = true;
        focusedRecord.infoVisible = true;
        interactionMode = 'view';
        readyPlacementType = '';
        updateReadyPlacementControl();
        renderSessionMarkers();
        setPlacementStatus('');
        return true;
    }
    sessionMarkers = sessionMarkers.filter(record => record.marker.id !== marker.id);
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

async function armPlacement(type) {
    const generation = ++placementArmGeneration;
    closeMarkerContextToolbar();
    closePlacePicker();
    closeUnplacedBag();
    pendingBagRecord = null;
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
    const defaults = { plant: 'New plant', sub_checkpoint: 'New marker', note: 'New note', intro_checkpoint: 'Trail Entrance', area_checkpoint: 'New Area Totem' };
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
        const placementPosition = placementPoint();
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
        if (type === 'area_checkpoint' && existingMarkers.some(item => normalizeAreaCheckpointMarker(item).type === 'area_checkpoint')) {
            setPlacementStatus(`${operation.areaName || 'This Area'} already has a Totem. Open Special Markers to locate it.`);
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
            setPlacementStatus(`${marker.name} placed. Select it whenever you want to edit or move it.`);
        }
    } catch (error) {
        if (activePlacementOperation !== placementToken || !isArOperationCurrent(loadingOperation, { matchLocation: false })) return;
        readyPlacementType = type;
        if (placementAppearance) pendingPlacementAppearance = { type, ...placementAppearance };
        updateReadyPlacementControl();
        setPlacementStatus(`Could not place ${markerLabel(type)}: ${error.message}`);
    } finally {
        releasePlacement();
    }
}

function createOverlay() {
    const hasCheckpoint = Boolean(activeAreaId && activeCheckpointId);
    const initialStatus = readyPlacementType
        ? `${readyPlacementLabel(readyPlacementType)} ready. Aim the centre circle, then tap it to place.`
        : hasCheckpoint
        ? 'Checkpoint linked. Stand at the marker, then recenter before placing.'
        : activeAreaId
        ? 'Aim dot ready. Hover over Markers to reveal their names.'
        : '';
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'creatorArOverlay';
    overlayRoot.className = 'creator-ar-overlay';
    overlayRoot.innerHTML = `
        <p class="creator-ar-status" data-ar-placement-status role="status" aria-live="polite">${initialStatus}</p>
        <span class="creator-ar-placement-capture" data-ar-placement-capture aria-hidden="true"></span>
        <div class="creator-ar-placement-guide" aria-hidden="true">
            ${placementPointerMarkup('Place Marker', true)}
        </div>
        <div class="creator-ar-note-placement-preview" data-ar-note-placement-preview aria-hidden="true" hidden>
          <span class="creator-ar-note-placement-surface nourishland-spatial-note-surface" data-ar-note-placement-surface>
            <strong data-ar-note-placement-label>New note</strong>
          </span>
        </div>
        <div class="creator-ar-mode-pointer" aria-hidden="true"><span></span></div>
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
        <div class="creator-ar-control-dock" data-ar-taskbar-version="2">
          <section class="creator-ar-area-chooser" data-ar-area-chooser hidden></section>
          <section class="creator-ar-place-picker" data-ar-place-picker aria-label="Marker type" hidden></section>
          <nav class="creator-ar-context-toolbar" data-ar-context-toolbar hidden></nav>
          <nav class="creator-ar-taskbar" aria-label="AR placement controls">
            <button class="creator-ar-add-marker creator-ar-add-plant" type="button" data-ar-add-plant aria-label="Add Plant"><strong>+ 🌱</strong><span class="sr-only">Plant</span></button>
            <button class="creator-ar-add-marker creator-ar-add-note" type="button" data-ar-add-note aria-label="Add Note"><strong>+ ✎</strong><span class="sr-only">Note</span></button>
            <button class="creator-ar-special-marker" type="button" data-ar-add-special aria-label="Add Special Marker"><strong>+ SPECIAL</strong></button>
            <button class="creator-ar-mode-control" type="button" data-ar-view-mode aria-label="View only mode: hide the pointer and tap Markers for information" aria-pressed="false"><b class="creator-ar-view-icon" aria-hidden="true"></b><span class="sr-only">View mode</span></button>
            <button class="creator-ar-mode-control" type="button" data-ar-hold-mode aria-label="Move mode: adjust one Marker" aria-pressed="false"><b aria-hidden="true">&#x270B;</b><span class="sr-only">Move mode</span></button>
            <button class="creator-ar-mode-control" type="button" data-ar-select-mode aria-label="Pointer mode: select markers" aria-pressed="false"><b aria-hidden="true">&#x27A4;</b><span class="sr-only">Pointer mode</span></button>
            <button type="button" data-ar-exit><b aria-hidden="true">&times;</b><span>EXIT AR</span></button>
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
    bindTaskbarAction('[data-ar-exit]', exitArMode);
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
    cleanupDrag();
    refSpace = null;
    canvas?.remove();
    canvas = null;
    overlayRoot?.remove();
    overlayRoot = null;
    document.body.classList.remove('creator-ar-session-active');
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
    sphereRenderer = null;
    prismRenderer = null;
    markerProgram = null;
    markerBuffer = null;
    placementArmedAt = 0;
    placementInProgress = false;
    activePlacementOperation = null;
    pendingBagRecord = null;
    locatedTotemRecord = null;
    pendingExistingMarkerId = '';
    arReturnContext = '';
    locationNoteAnchor = null;
    referenceSpaceHasFloor = false;
    sessionGroundY = null;
    locationNoteConfig = null;
    locationNoteVisible = false;
    placementArmGeneration += 1;
    specialPickerRequest += 1;
    hiddenStructuralMarkerIds.clear();
    gl = null;
}

function navigateAfterAr(projectId, areaId, returnContext) {
    if (!projectId) return;
    queueMicrotask(() => {
        if (String(returnContext || '').startsWith('web-marker:')) {
            window.openProjectEntry?.(encodeURIComponent(projectId), encodeURIComponent(String(returnContext).slice('web-marker:'.length)), true);
        } else if (String(returnContext || '').startsWith('web-totem:')) {
            window.renderAreaCheckpointForm?.(encodeURIComponent(projectId), encodeURIComponent(String(returnContext).slice('web-totem:'.length)));
        } else if (returnContext && areaId && window.resumeAreaCreationFlow) {
            window.resumeAreaCreationFlow(encodeURIComponent(projectId), encodeURIComponent(areaId), encodeURIComponent(returnContext));
        } else {
            window.renderProjectDashboard?.(encodeURIComponent(projectId), '', false, 'returning');
        }
    });
}

function finishArExitToDashboard() {
    const projectId = activeProjectId;
    const areaId = activeAreaId;
    const returnContext = arReturnContext;
    const activeSession = session;
    session = null;
    cleanup();
    activeSession?.end().catch(() => {});
    navigateAfterAr(projectId, areaId, returnContext);
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

function finishNaturalArExit(projectId, areaId, returnContext) {
    const removeArHistoryEntry = arHistoryArmed && history.state?.nourishlandCreatorAr;
    arHistoryArmed = false;
    handlingArHistory = false;
    window.removeEventListener('popstate', handleArHistoryBack);
    if (removeArHistoryEntry) {
        window.addEventListener('popstate', () => navigateAfterAr(projectId, areaId, returnContext), { once: true });
        history.back();
        return;
    }
    navigateAfterAr(projectId, areaId, returnContext);
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
    locationNoteAnchor = null;
    referenceSpaceHasFloor = false;
    sessionGroundY = null;
    locationNoteConfig = normalizedLocationNote();
    locationNoteVisible = false;
    pendingExistingMarkerId = existingMarkerId || '';
    arReturnContext = returnContext || '';
    readyPlacementType = pendingExistingMarkerId ? '' : AR_EXPERIENCE_CONFIG.markerTypes.includes(initialPlacementType) ? initialPlacementType : '';
    createOverlay();

    try {
        session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['dom-overlay', 'hit-test'],
            optionalFeatures: ['local-floor'],
            domOverlay: { root: overlayRoot }
        });
        const launchedSession = session;
        document.body.classList.add('creator-ar-session-active');
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
        gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL unavailable.');
        await gl.makeXRCompatible();
        setupSpatialMarkerRenderer();

        const layer = new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true });
        session.updateRenderState({ baseLayer: layer, depthNear: 0.01, depthFar: 50 });
        try {
            refSpace = await session.requestReferenceSpace('local-floor');
            referenceSpaceHasFloor = true;
        } catch {
            refSpace = await session.requestReferenceSpace('local');
            referenceSpaceHasFloor = false;
        }
        const viewerSpace = await session.requestReferenceSpace('viewer');
        hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

        const draw = (_time, frame) => {
            if (frame.session !== session || !gl) return;
            frame.session.requestAnimationFrame(draw);
            const pose = frame.getViewerPose(refSpace);
            if (!pose) return;
            latestViewerMatrix = Float32Array.from(pose.transform.matrix);
            latestView = pose.views[0] || null;
            updateGrabbedMarkerFromCamera();
            const hit = hitTestSource && frame.getHitTestResults(hitTestSource)[0];
            latestHitMatrix = matrixFromPose(hit?.getPose(refSpace));
            positionSessionMarkers(latestView);

            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clearDepth(1);
            for (const view of pose.views) {
                const viewport = layer.getViewport(view);
                if (!viewport) continue;
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                drawSpatialMarkers(view);
            }
        };

        launchedSession.addEventListener('end', () => {
            if (session !== launchedSession) return;
            const projectId = activeProjectId;
            const areaId = activeAreaId;
            const returnContext = arReturnContext;
            session = null;
            cleanup();
            finishNaturalArExit(projectId, areaId, returnContext);
        });
        launchedSession.addEventListener('select', () => {
            if (session !== launchedSession) return;
            if (readyPlacementType && performance.now() - placementArmedAt > 250) void quickPlace(readyPlacementType);
        });
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
