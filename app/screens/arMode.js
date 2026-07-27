/*
 * Creator AR placement mode
 *
 * The dashboard remains the full web workspace. AR is for fast capture:
 * place a draft, then select it to refine its details or move it without
 * leaving the camera session. Physical checkpoints improve repeat visits but
 * are not required for a test session.
 */

import { createPlaceMarker, createProjectSite, createSitePlace, deletePlaceMarker, loadMarkerAnchor, loadPlaceMarkers, loadPlantProfile, loadProjectSites, loadSitePlaces, saveMarkerAnchor, updatePlaceMarker } from '../services/persistence.js';
import { AR_EXPERIENCE_CONFIG } from '../services/arExperienceConfig.js';
import { createAreaRecord } from '../services/areaWorkflow.js';
import { matrixFromPose, spatialPosition } from '../services/spatialPlacement.js';
import { spatialMoveControlMarkup } from '../services/spatialMoveControl.js';
import { createMinimalMarkerDraft } from '../services/markerWorkflow.js';
import { placementPointerMarkup } from '../services/placementPointer.js';
import { createSpatialSphereRenderer, destroySpatialSphereRenderer, drawSpatialOrb } from '../services/spatialSphereRenderer.js';

let session = null;
let gl = null;
let refSpace = null;
let canvas = null;
let overlayRoot = null;
let activeProjectId = '';
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
let pendingPlacedRecord = null;
let hitTestSource = null;
let latestHitMatrix = null;
let markerProgram = null;
let markerBuffer = null;
let sphereRenderer = null;
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
const hiddenStructuralMarkerIds = new Set();

const markerLabel = type => ({ plant: 'plant', sub_checkpoint: 'marker', note: 'note', intro_checkpoint: 'trail entrance gateway', area_checkpoint: 'area totem' })[type] || 'item';
const markerIcon = type => ({ plant: '&#x1F331;', sub_checkpoint: '&#x2691;', note: '&#x270E;', intro_checkpoint: '&#x2316;', area_checkpoint: '&#x2316;' })[type] || '&#x25C6;';
const readyPlacementLabel = type => ({ plant: 'Plant', sub_checkpoint: 'Marker', note: 'Note', intro_checkpoint: 'Trail Entrance', area_checkpoint: 'Area Totem' })[type] || 'Draft';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const markerDefaultColor = type => ({ plant: '#6fb85a', note: '#a9aea4', sub_checkpoint: '#91a29a', intro_checkpoint: '#43c99b', area_checkpoint: '#68c7b8' })[type] || '#91a29a';
const markerAppearanceColor = marker => /^#[0-9a-f]{6}$/i.test(marker?.appearance?.color || '') ? marker.appearance.color : markerDefaultColor(marker?.type);
const markerAppearanceSize = marker => ['tiny', 'small', 'medium', 'large', 'huge'].includes(marker?.appearance?.size) ? marker.appearance.size : 'medium';
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
        // WebXR model scales are half-extents: Totems render as slender
        // 0.28m x 1.44m crafted posts at the default size.
        area_checkpoint: [.14 * factor, .72 * factor],
        intro_checkpoint: [.42 * factor, .805 * factor],
        // Notes are readable spatial signs rather than tiny object labels.
        note: [.44 * factor, .28 * factor],
        plant: [.062 * factor, .062 * factor],
        sub_checkpoint: [markerScale(marker), markerScale(marker)]
    })[marker.type] || [markerScale(marker), markerScale(marker)];
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
    const branch = (side, items) => `<span class="plant-knowledge-branch plant-knowledge-${side}">${items.map(([label, value], index) => `<button type="button" class="plant-knowledge-cell" data-ar-plant-branch="${side}-${index}" aria-expanded="false"><b>${escapeHtml(label)}</b><small aria-hidden="true">${escapeHtml(value)}</small></button>`).join('')}</span>`;
    return `<span class="plant-knowledge-map">${branch('left', knowledge.left)}<span class="plant-knowledge-core"><small>PLANT PROFILE</small><strong>${escapeHtml(knowledge.title)}</strong></span>${branch('right', knowledge.right)}</span>`;
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

function updateReadyPlacementControl() {
    overlayRoot?.classList.toggle('is-placement-armed', Boolean(readyPlacementType));
    if (!readyPlacementType && !interactionMode) {
        interactionMode = suspendedInteractionMode || 'neutral';
        suspendedInteractionMode = '';
        updateInteractionControls();
    }
    const guideLabel = overlayRoot?.querySelector('[data-ar-placement-guide-label]');
    if (guideLabel && readyPlacementType) guideLabel.textContent = `Place ${readyPlacementLabel(readyPlacementType)}`;
}

function placementPoint() {
    // Phone-first global rule: new spatial content arrives at a predictable,
    // relaxed one-metre working distance before the creator refines it.
    return spatialPosition(null, latestViewerMatrix, 0);
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

function spatialAnchor(position, context = null) {
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
    interactionMode = interactionMode === mode && ['grab', 'select'].includes(mode) ? 'neutral' : mode;
    sessionMarkers.forEach(record => { record.profileHovered = false; });
    closeAreaChooser();
    closePlacePicker();
    closeUnplacedBag();
    if (interactionMode !== 'select') closeInlineEditor();
    updateInteractionControls();
    if (interactionMode === 'view') setPlacementStatus('View only mode. The pointer is hidden; tap a Marker to reveal or hide its information.');
    else if (interactionMode === 'grab') setPlacementStatus('Move mode is on. Select a glowing element, adjust it with the plus control, then press Release.');
    else if (interactionMode === 'select') setPlacementStatus('Pointer mode is on. Tap a placed marker to edit it here.');
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
    closeInlineEditor();
    closePlacePicker();
    readyPlacementType = '';
    pendingBagRecord = null;
    updateReadyPlacementControl();
    bag.hidden = false;
    bag.innerHTML = '<p>Loading your Organizer Folder…</p>';
    try {
        await loadPlacementAreas();
        const areas = await loadSitePlaces(activeProjectId, activeSiteId);
        const groups = await Promise.all(areas.map(async area => {
            const markers = await loadPlaceMarkers(activeProjectId, activeSiteId, area.id).catch(() => []);
            const entries = await Promise.all(markers.map(normalizeSpatialMarker).filter(marker => ['plant', 'note', 'sub_checkpoint'].includes(marker.type)).map(async marker => {
                const anchor = await loadMarkerAnchor(activeProjectId, activeSiteId, area.id, marker.id).catch(() => null);
                return anchor?.type === 'spatial' ? null : { marker, areaId: area.id, areaName: area.name };
            }));
            return entries.filter(Boolean);
        }));
        const items = groups.flat();
        bag.innerHTML = `<div><strong>Unassigned Folder</strong><button type="button" data-ar-close-bag aria-label="Close Folder">&times;</button></div>${items.length ? `<div class="creator-ar-bag-list">${items.map((item, index) => `<button type="button" data-ar-bag-item="${index}">${markerIcon(item.marker.type)} <span><strong>${escapeHtml(item.marker.name)}</strong><small>${readyPlacementLabel(item.marker.type)} · ${escapeHtml(item.areaName || 'Unassigned')}</small></span></button>`).join('')}</div>` : '<p>This folder is empty. Save information here only when you want to organise or place it later.</p>'}`;
        bag.querySelector('[data-ar-close-bag]')?.addEventListener('click', closeUnplacedBag);
        bag.querySelectorAll('[data-ar-bag-item]').forEach(button => button.addEventListener('click', () => {
            const item = items[Number(button.dataset.arBagItem)];
            if (!item) return;
            pendingBagRecord = { ...item, siteId: activeSiteId };
            readyPlacementType = item.marker.type;
            placementArmedAt = performance.now();
            closeUnplacedBag();
            updateReadyPlacementControl();
            setPlacementStatus(`${item.marker.name} selected from your Bag. Aim the breathing circle, then tap to place it.`);
        }));
    } catch (error) {
        bag.innerHTML = `<div><strong>Unassigned Folder</strong><button type="button" data-ar-close-bag aria-label="Close Folder">&times;</button></div><p>Could not load the folder: ${escapeHtml(error.message)}</p>`;
        bag.querySelector('[data-ar-close-bag]')?.addEventListener('click', closeUnplacedBag);
    }
}

function showPlacedMarkerActions(record) {
    const picker = overlayRoot?.querySelector('[data-ar-place-picker]');
    if (!picker) return;
    pendingPlacedRecord = record;
    picker.hidden = false;
    picker.innerHTML = `<div class="creator-ar-picker-heading"><p>${readyPlacementLabel(record.marker.type)} placed</p><button type="button" data-ar-close-placed aria-label="Close">&times;</button></div><p class="creator-ar-picker-status">Edit this ${markerLabel(record.marker.type)} now, or continue placing content.</p><div class="creator-ar-after-place-actions"><button type="button" data-ar-edit-placed>Edit details</button><button type="button" data-ar-finish-placed>Done</button></div>`;
    picker.querySelector('[data-ar-edit-placed]')?.addEventListener('click', () => {
        closePlacePicker();
        openInlineEditor(record, true);
    });
    picker.querySelector('[data-ar-finish-placed]')?.addEventListener('click', closePlacePicker);
    picker.querySelector('[data-ar-close-placed]').addEventListener('click', closePlacePicker);
}

function renderSpecialMarkerChoices(picker) {
    const existingTotem = sessionMarkers.find(record => record.areaId === activeAreaId && record.marker.type === 'area_checkpoint');
    const totemAction = existingTotem
        ? `<button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-toggle-structural="${escapeHtml(existingTotem.marker.id)}"><b aria-hidden="true">${hiddenStructuralMarkerIds.has(existingTotem.marker.id) ? '&#x25C9;' : '&#x25CE;'}</b><span><strong>${hiddenStructuralMarkerIds.has(existingTotem.marker.id) ? 'Show' : 'Hide'} Totem</strong></span></button>`
        : activeAreaId
            ? `<button class="creator-ar-special-totem creator-ar-totem-action" type="button" data-ar-place-area-totem><b aria-hidden="true">${markerIcon('area_checkpoint')}</b><span><strong>Add Totem</strong></span></button>`
            : '';
    const areaAction = activeAreaId ? '' : `<button class="creator-ar-special-totem creator-ar-create-area" type="button" data-ar-create-area><b aria-hidden="true">+</b><span><strong>Create Area</strong></span></button>`;
    const wayfinding = [
        ['↑', 'Arrow up'], ['→', 'Arrow right'], ['↓', 'Arrow down'], ['←', 'Arrow left'],
        ['!', 'Important'], ['?', 'Question']
    ].map(([symbol, label]) => `<button class="creator-ar-special-totem creator-ar-symbol-marker" type="button" data-ar-special-symbol="${escapeHtml(symbol)}" data-ar-special-label="${escapeHtml(label)}"><b aria-hidden="true">${escapeHtml(symbol)}</b><span><strong>${escapeHtml(label)}</strong></span></button>`).join('');
    picker.innerHTML = `<div class="creator-ar-picker-heading"><p>Spatial tools</p><button type="button" data-ar-close-special aria-label="Close">&times;</button></div><section class="creator-ar-special-section creator-ar-totem-section"><strong>AREA TOTEM</strong><div class="creator-ar-special-grid">${totemAction}${areaAction}</div></section><section class="creator-ar-special-section creator-ar-indicator-section"><strong>INDICATOR MARKERS</strong><div class="creator-ar-special-grid">${wayfinding}</div></section><section class="creator-ar-special-section"><strong>EXISTING RECORDS</strong><div class="creator-ar-special-grid"><button class="creator-ar-special-totem" type="button" data-ar-import-marker><b aria-hidden="true">↥</b><span><strong>Import Marker / Plant</strong></span></button></div></section>`;
    picker.querySelector('[data-ar-close-special]').addEventListener('click', closePlacePicker);
    picker.querySelector('[data-ar-place-area-totem]')?.addEventListener('click', () => {
        closePlacePicker();
        void armPlacement('area_checkpoint');
    });
    picker.querySelector('[data-ar-create-area]')?.addEventListener('click', () => void openArAreaCreationForm());
    picker.querySelector('[data-ar-import-marker]').addEventListener('click', () => {
        closePlacePicker();
        void openUnplacedBag();
    });
    picker.querySelectorAll('[data-ar-special-symbol]').forEach(button => button.addEventListener('click', () => {
        readySpecialMarker = {
            name: button.dataset.arSpecialLabel,
            special_symbol: button.dataset.arSpecialSymbol,
            appearance: { color: ['!', '?'].includes(button.dataset.arSpecialSymbol) ? '#eaa45d' : '#75a9cc', size: 'large' }
        };
        void armPlacement('sub_checkpoint');
    }));
    picker.querySelectorAll('[data-ar-toggle-structural]').forEach(button => button.addEventListener('click', () => {
        const markerId = button.dataset.arToggleStructural;
        const record = sessionMarkers.find(item => item.marker.id === markerId);
        if (!record) return;
        if (hiddenStructuralMarkerIds.has(markerId)) hiddenStructuralMarkerIds.delete(markerId);
        else hiddenStructuralMarkerIds.add(markerId);
        if (locatedTotemRecord?.marker.id === markerId && hiddenStructuralMarkerIds.has(markerId)) locatedTotemRecord = null;
        renderSessionMarkers();
        setPlacementStatus(`${readyPlacementLabel(record.marker.type)} ${hiddenStructuralMarkerIds.has(markerId) ? 'hidden' : 'visible'} for this AR session.`);
        renderSpecialMarkerChoices(picker);
    }));
}

async function openArAreaCreationForm() {
    const picker = overlayRoot?.querySelector('[data-ar-place-picker]');
    if (!picker) return;
    const loadingOperation = captureArOperationContext();
    const areas = await loadPlacementAreas(loadingOperation).catch(() => []);
    if (!isArOperationCurrent(loadingOperation, { matchLocation: false })) return;
    const nextNumber = areas.filter(area => area.name !== 'Unassigned').length + 1;
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
    closeInlineEditor();
    closeUnplacedBag();
    readyPlacementType = '';
    updateReadyPlacementControl();
    picker.hidden = false;
    picker.dataset.panel = panelId;
    picker.innerHTML = `<div class="creator-ar-picker-heading"><p>Special Markers</p><button type="button" data-ar-close-special aria-label="Close">&times;</button></div><p class="creator-ar-picker-status">Loading Area tools…</p>`;
    picker.querySelector('[data-ar-close-special]').addEventListener('click', closePlacePicker);
    const loadingOperation = captureArOperationContext();
    await loadPlacementAreas(loadingOperation).catch(error => {
        if (isArOperationCurrent(loadingOperation, { matchLocation: false })) {
            setPlacementStatus(`Area tools could not refresh: ${error.message}`);
        }
    });
    if (!isArOperationCurrent(loadingOperation, { matchLocation: false }) || picker.hidden || picker.dataset.panel !== panelId || requestId !== specialPickerRequest) return;
    const restoringOperation = captureArOperationContext();
    await restoreRecordedMarkers(restoringOperation).catch(() => {});
    if (!isArOperationCurrent(restoringOperation)) return;
    if (picker.hidden || picker.dataset.panel !== panelId || requestId !== specialPickerRequest) return;
    renderSpecialMarkerChoices(picker);
}

function resetArControls() {
    placementArmGeneration += 1;
    cleanupDrag();
    interactionMode = 'neutral';
    suspendedInteractionMode = '';
    closeInlineEditor();
    closeAreaChooser();
    closePlacePicker();
    closeUnplacedBag();
    readyPlacementType = '';
    pendingBagRecord = null;
    updateReadyPlacementControl();
    updateInteractionControls();
    setPlacementStatus('AR controls reset. The aim dot is ready; press plus when you want to place a Marker.');
}

function multiplyMatrixVector(matrix, vector) {
    return [0, 1, 2, 3].map(row => matrix[row] * vector[0] + matrix[row + 4] * vector[1] + matrix[row + 8] * vector[2] + matrix[row + 12] * vector[3]);
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
            gl_FragColor=vec4(shaded,alpha);
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
}

function drawSpatialMarkers(view) {
    if (!markerProgram || !markerBuffer || !sphereRenderer) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const colors = { plant: [.42, .72, .34], note: [.66, .69, .64], sub_checkpoint: [.57, .64, .6], intro_checkpoint: [.26, .82, .62], area_checkpoint: [.34, .78, .7] };

    sessionMarkers.forEach(record => {
        if (hiddenStructuralMarkerIds.has(record.marker.id)) return;
        const shape = markerShape(record.marker.type);
        if ((shape !== 0 && shape !== 4) || record.marker.special_symbol) return;
        const [scaleX, scaleY] = markerDimensions(record.marker);
        const baseColor = colors[record.marker.type] || colors.sub_checkpoint;
        const hoverVibration = record.profileHovered && hasPlantProfile(record)
            ? {
                x: Math.sin(performance.now() / 42) * .0035,
                y: Math.sin(performance.now() / 58) * .0025
            }
            : { x: 0, y: 0 };
        const livingRadius = Math.max(scaleX, scaleY) * (1 + Math.sin(performance.now() / 1450 + record.position.x * 4) * .014);
        drawSpatialOrb(gl, sphereRenderer, view, {
            ...record.position,
            x: record.position.x + hoverVibration.x,
            y: record.position.y + hoverVibration.y
        }, livingRadius, {
            type: shape === 4 ? 'plant' : 'marker',
            color: markerRgb(record.marker, baseColor)
        });
    });

    if (['plant', 'sub_checkpoint'].includes(readyPlacementType) && latestHitMatrix && !readySpecialMarker) {
        const target = { x: latestHitMatrix[12], y: latestHitMatrix[13] + .07, z: latestHitMatrix[14] };
        drawSpatialOrb(gl, sphereRenderer, view, target, .07, {
            type: readyPlacementType === 'plant' ? 'plant' : 'marker',
            color: readyPlacementType === 'plant' ? colors.plant : [.72, .9, .58]
        });
    }

    gl.useProgram(markerProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, markerBuffer);
    const positionLocation = gl.getAttribLocation(markerProgram, 'p');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    sessionMarkers.forEach(record => {
        if (hiddenStructuralMarkerIds.has(record.marker.id)) return;
        const shape = markerShape(record.marker.type);
        if (shape === 0 || shape === 3 || shape === 4) return;
        const [scaleX, scaleY] = markerDimensions(record.marker);
        const groundedPosition = shape === 1 || shape === 2 ? { ...record.position, y: record.position.y + scaleY } : record.position;
        const model = markerBillboardMatrix(groundedPosition, scaleX, scaleY);
        const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(markerProgram, 'mvp'), false, mvp);
        gl.uniform1f(gl.getUniformLocation(markerProgram, 'shape'), shape);
        const baseColor = colors[record.marker.type] || colors.sub_checkpoint;
        gl.uniform3fv(gl.getUniformLocation(markerProgram, 'color'), markerRgb(record.marker, baseColor));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    if (locatedTotemRecord) {
        const guideModel = groundGuideMatrix(locatedTotemRecord.position);
        if (guideModel) {
            const guideMvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, guideModel));
            gl.uniformMatrix4fv(gl.getUniformLocation(markerProgram, 'mvp'), false, guideMvp);
            gl.uniform1f(gl.getUniformLocation(markerProgram, 'shape'), 5);
            gl.uniform3fv(gl.getUniformLocation(markerProgram, 'color'), [.55, .92, .78]);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    }
}

function positionSessionMarkers(view = latestView) {
    if (!view || !overlayRoot) return;
    const inverse = view.transform?.inverse?.matrix;
    if (!inverse || !view.projectionMatrix) return;
    sessionMarkers.forEach(record => {
        const element = overlayRoot.querySelector(`[data-ar-marker-id="${CSS.escape(record.marker.id)}"]`);
        if (!element) return;
        if (hiddenStructuralMarkerIds.has(record.marker.id)) {
            element.hidden = true;
            return;
        }
        const eye = multiplyMatrixVector(inverse, [record.position.x, record.position.y, record.position.z, 1]);
        const clip = multiplyMatrixVector(view.projectionMatrix, eye);
        if (!Number.isFinite(clip[3]) || clip[3] <= 0) {
            element.hidden = true;
            return;
        }
        const x = (clip[0] / clip[3] * 0.5 + 0.5) * window.innerWidth;
        const y = (-clip[1] / clip[3] * 0.5 + 0.5) * window.innerHeight;
        const visible = x > -40 && x < window.innerWidth + 40 && y > -40 && y < window.innerHeight + 40;
        element.hidden = !visible;
        if (visible) {
            element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -50%)`;
            positionCreatorPlantProfile(record, x, y);
        }
    });
}

function positionCreatorPlantProfile(record, markerX, markerY) {
    if (!record.profileExpanded || !overlayRoot) return;
    const profile = overlayRoot.querySelector(`[data-ar-plant-profile="${CSS.escape(record.marker.id)}"]`);
    const tether = overlayRoot.querySelector(`[data-ar-plant-tether="${CSS.escape(record.marker.id)}"]`);
    if (!profile || !tether) return;
    const panelWidth = Math.min(window.innerWidth * .9, 520);
    const panelHeight = Math.min(310, Math.max(240, window.innerWidth * .5));
    const horizontalDirection = markerX < window.innerWidth / 2 ? 1 : -1;
    const panelX = Math.max(panelWidth / 2 + 12, Math.min(window.innerWidth - panelWidth / 2 - 12, markerX + horizontalDirection * Math.min(210, window.innerWidth * .32)));
    const panelY = Math.max(panelHeight / 2 + 12, Math.min(window.innerHeight - panelHeight / 2 - 84, markerY - Math.min(150, window.innerHeight * .2)));
    profile.style.left = `${panelX}px`;
    profile.style.top = `${panelY}px`;
    const dx = panelX - markerX;
    const dy = panelY - markerY;
    tether.style.left = `${markerX}px`;
    tether.style.top = `${markerY}px`;
    tether.style.width = `${Math.max(8, Math.hypot(dx, dy))}px`;
    tether.style.transform = `translateY(-50%) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
}

function renderSessionMarkers() {
    const layer = overlayRoot?.querySelector('[data-ar-marker-layer]');
    if (!layer) return;
    layer.innerHTML = sessionMarkers.map(record => {
        const profileAvailable = hasPlantProfile(record);
        const profileLabel = profileAvailable ? (record.profileExpanded ? ' Hide Plant Profile' : ' Open Plant Profile') : '';
        const informationSummary = record.marker.description
            || record.marker.notes
            || (record.marker.type === 'area_checkpoint' ? areaBoard(record.marker).introduction : '')
            || `${readyPlacementLabel(record.marker.type)} information`;
        const profileLayer = profileAvailable && record.profileExpanded
            ? `<span class="creator-ar-plant-tether" data-ar-plant-tether="${escapeHtml(record.marker.id)}" aria-hidden="true"></span><aside class="creator-ar-plant-profile" data-ar-plant-profile="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(record.marker.name)} Plant Profile">${creatorPlantKnowledgeMarkup(record)}</aside>`
            : record.marker.type === 'area_checkpoint' && record.infoVisible
                ? creatorTotemInformationMarkup(record)
                : '';
        return `<span class="creator-ar-marker-hit-target creator-ar-marker-hit-target-${escapeHtml(record.marker.type)}${record.marker.special_symbol ? ' is-symbol-marker' : ''}${profileAvailable ? ' has-plant-profile' : ''}${record.infoVisible ? ' is-info-open' : ''}" role="button" tabindex="${interactionMode ? '0' : '-1'}" data-ar-marker-id="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(record.marker.name)} ${markerLabel(record.marker.type)}${profileLabel}" style="--marker-accent:${markerAppearanceColor(record.marker)}">${record.marker.special_symbol ? `<span class="creator-ar-special-symbol" aria-hidden="true">${escapeHtml(record.marker.special_symbol)}</span>` : ''}<span class="creator-ar-spatial-name">${escapeHtml(record.marker.name)}${profileAvailable ? '<small>Plant Profile</small>' : `<small>${escapeHtml(informationSummary)}</small>`}</span>${profileLayer}</span>`;
    }).join('');
    sessionMarkers.forEach(record => {
        const element = layer.querySelector(`[data-ar-marker-id="${CSS.escape(record.marker.id)}"]`);
        element?.addEventListener('pointerdown', event => beginMarkerInteraction(record, event));
        element?.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            beginMarkerInteraction(record, event);
        });
        if (hasPlantProfile(record)) {
            const setHovered = value => { record.profileHovered = value && ['neutral', 'view'].includes(interactionMode); };
            element?.addEventListener('mouseenter', () => setHovered(true));
            element?.addEventListener('mouseleave', () => setHovered(false));
            element?.addEventListener('focus', () => setHovered(true));
            element?.addEventListener('blur', () => setHovered(false));
        }
        layer.querySelectorAll(`[data-ar-plant-profile="${CSS.escape(record.marker.id)}"] [data-ar-plant-branch]`).forEach(cell => {
            const activate = () => {
                const open = !cell.classList.contains('is-open');
                layer.querySelectorAll(`[data-ar-plant-profile="${CSS.escape(record.marker.id)}"] [data-ar-plant-branch]`).forEach(candidate => {
                    candidate.classList.toggle('is-open', candidate === cell && open);
                    candidate.setAttribute('aria-expanded', String(candidate === cell && open));
                    candidate.querySelector('small')?.setAttribute('aria-hidden', String(!(candidate === cell && open)));
                });
            };
            cell.addEventListener('click', event => {
                event.stopPropagation();
                activate();
            });
            cell.addEventListener('mouseenter', () => {
                if (!cell.classList.contains('is-open')) activate();
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
    const markerControls = `<fieldset class="creator-ar-appearance"><legend>Quick appearance</legend>${typeControl}<label>Color<input name="markerColor" type="color" value="${markerAppearanceColor(record.marker)}" /></label><label>Size<select name="markerSize"><option value="tiny" ${markerAppearanceSize(record.marker) === 'tiny' ? 'selected' : ''}>Tiny</option><option value="small" ${markerAppearanceSize(record.marker) === 'small' ? 'selected' : ''}>Small</option><option value="medium" ${markerAppearanceSize(record.marker) === 'medium' ? 'selected' : ''}>Medium</option><option value="large" ${markerAppearanceSize(record.marker) === 'large' ? 'selected' : ''}>Large</option><option value="huge" ${markerAppearanceSize(record.marker) === 'huge' ? 'selected' : ''}>Huge</option></select></label></fieldset>`;
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
                    size: form.elements.markerSize.value
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
            record.profileExpanded = !record.profileExpanded;
            record.infoVisible = record.profileExpanded;
        } else {
            record.infoVisible = !record.infoVisible;
        }
        record.profileHovered = false;
        renderSessionMarkers();
        const visible = hasPlantProfile(record) ? record.profileExpanded : record.infoVisible;
        setPlacementStatus(visible
            ? `${record.marker.name} information opened. Tap the Marker again to hide it.`
            : `${record.marker.name} information hidden.`);
        return;
    }
    if (interactionMode === 'neutral') return;
    event.preventDefault();
    event.stopPropagation();
    if (interactionMode === 'select') {
        openInlineEditor(record);
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

function heldPointerRay() {
    if (!latestViewerMatrix || !latestView?.projectionMatrix) return null;
    const pointer = overlayRoot?.querySelector('.creator-ar-mode-pointer');
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
    cleanupDrag();
    updateInteractionControls();
    setPlacementStatus(`Saving ${state.record.marker.name}… Move mode remains on.`);
    try {
        await saveMarkerAnchor(operation.projectId, state.record.siteId, state.record.areaId, state.record.marker.id, spatialAnchor(state.record.position, operation));
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

function cancelMarkerDrag(event) {
    const state = dragState;
    if (!state || event?.pointerId !== state.pointerId) return;
    state.record.position = state.position;
    cleanupDrag();
    updateInteractionControls();
    positionSessionMarkers();
    setPlacementStatus('Move cancelled. Move mode remains on.');
}

async function loadPlacementAreas(operation = captureArOperationContext(), guardOptions = {}) {
    if (!isArOperationCurrent(operation, guardOptions)) return [];
    const sites = await loadProjectSites(operation.projectId);
    if (!isArOperationCurrent(operation, guardOptions)) return [];
    let site = sites.find(item => item.id === operation.siteId) || sites.find(item => item.id === 'main_food_forest') || sites[0];
    if (!site) {
        site = await createProjectSite(operation.projectId, { ...AR_EXPERIENCE_CONFIG.defaultSite });
        if (!isArOperationCurrent(operation, guardOptions)) return [];
    }
    const areas = await loadSitePlaces(operation.projectId, site.id);
    if (!isArOperationCurrent(operation, guardOptions)) return [];
    activeSiteId = site.id;
    const selected = areas.find(area => area.id === operation.areaId);
    if (selected) activeAreaName = selected.name;
    else if (areas.length) {
        const firstArea = areas[0];
        activeAreaId = firstArea.id;
        activeAreaName = firstArea.name;
    } else {
        activeAreaId = '';
        activeAreaName = '';
    }
    return areas;
}

async function restoreRecordedMarkers(operation = captureArOperationContext(), guardOptions = {}) {
    if (!operation.projectId || !operation.siteId || !operation.areaId || !isArOperationCurrent(operation, guardOptions)) return;
    const areas = await loadSitePlaces(operation.projectId, operation.siteId).catch(() => []);
    if (!isArOperationCurrent(operation, guardOptions)) return;
    const restoredGroups = await Promise.all(areas.map(async area => {
        const savedMarkers = await loadPlaceMarkers(operation.projectId, operation.siteId, area.id).catch(() => []);
        return Promise.all(savedMarkers.map(async savedMarker => {
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
                coordinateSpace: anchor.coordinate_space || 'session-local'
            };
        }));
    }));
    if (!isArOperationCurrent(operation, guardOptions)) return;
    const restored = restoredGroups.flat();
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
        setPlacementStatus(`${marker.name} Plant Profile is open. Use the honeycomb to explore it, or choose Move to adjust its position.`);
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
    } catch (error) {
        if (isArOperationCurrent(operation, { matchLocation: false })) {
            setPlacementStatus(`Marker storage is unavailable: ${error.message}`);
        }
    }
    if (!activeAreaId) setPlacementStatus('Create your first Area from Special Markers before placing ordinary Markers.');
    return false;
}

async function armPlacement(type) {
    const generation = ++placementArmGeneration;
    closeInlineEditor();
    closePlacePicker();
    closeUnplacedBag();
    readyPlacementType = type;
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
    updateReadyPlacementControl();
    updateInteractionControls();
    if (!activeAreaId) void openSpecialMarkerPicker();
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
        id: undefined,
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
    try {
        const created = await createPlaceMarker(operation.projectId, operation.siteId, operation.areaId, draft);
        return normalizeAreaCheckpointMarker(created.marker || created);
    } catch (error) {
        if (!/unsupported|marker type|place type/i.test(String(error?.message || ''))) throw error;
        if (!isArOperationCurrent(operation)) return null;
        const created = await createPlaceMarker(operation.projectId, operation.siteId, operation.areaId, {
            ...draft,
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
    const releasePlacement = () => {
        if (activePlacementOperation !== placementToken) return;
        activePlacementOperation = null;
        placementInProgress = false;
    };
    try {
        closeInlineEditor();
        if (!await ensurePlacementArea(loadingOperation)) return;
        if (!isArOperationCurrent(loadingOperation, { matchLocation: false })) return;

        const operation = captureArOperationContext();
        const operationIsCurrent = () => activePlacementOperation === placementToken && isArOperationCurrent(operation);
        if (!operationIsCurrent()) return;
        const position = placementPoint();
        if (!position) {
            setPlacementStatus('Move your phone briefly, then use Place again.');
            return;
        }
        if (pendingBagRecord) {
            const bagRecord = pendingBagRecord;
            readyPlacementType = '';
            pendingBagRecord = null;
            updateReadyPlacementControl();
            setPlacementStatus(`Updating ${bagRecord.marker.name}…`);
            try {
                const bagAnchor = spatialAnchor(position, operation);
                if (bagRecord.areaId !== operation.areaId) {
                    bagAnchor.coordinate_space = 'session-local';
                    bagAnchor.checkpoint_id = '';
                }
                await saveMarkerAnchor(operation.projectId, bagRecord.siteId, bagRecord.areaId, bagRecord.marker.id, bagAnchor);
                if (!operationIsCurrent()) return;
                const record = { ...bagRecord, position };
                sessionMarkers.push(record);
                renderSessionMarkers();
                setPlacementStatus(`${record.marker.name} placed. Your previous interaction mode is still active.`);
                showPlacedMarkerActions(record);
            } catch (error) {
                if (!operationIsCurrent()) return;
                pendingBagRecord = bagRecord;
                readyPlacementType = bagRecord.marker.type;
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
        await saveMarkerAnchor(operation.projectId, operation.siteId, operation.areaId, marker.id, spatialAnchor(position, operation));
        if (!operationIsCurrent()) return;
        const record = { marker, position, siteId: operation.siteId, areaId: operation.areaId, areaName: operation.areaName };
        sessionMarkers.push(record);
        renderSessionMarkers();
        if (type === 'area_checkpoint') {
            setPlacementStatus(`${operation.areaName || 'Area'} Totem placed. Your previous interaction mode is still active.`);
        } else {
            setPlacementStatus(`${marker.name} placed. Select it whenever you want to edit or move it.`);
            if (!['plant', 'note'].includes(type) && !marker.special_symbol) showPlacedMarkerActions(record);
        }
    } catch (error) {
        if (activePlacementOperation !== placementToken || !isArOperationCurrent(loadingOperation, { matchLocation: false })) return;
        readyPlacementType = type;
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
        : 'Aim dot ready. Hover over Markers to reveal their names.';
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'creatorArOverlay';
    overlayRoot.className = 'creator-ar-overlay';
    overlayRoot.innerHTML = `
        <p class="creator-ar-status" data-ar-placement-status role="status" aria-live="polite">${initialStatus}</p>
        <span class="creator-ar-placement-capture" data-ar-placement-capture aria-hidden="true"></span>
        <div class="creator-ar-placement-guide" aria-hidden="true">
            ${placementPointerMarkup('Place Marker', true)}
        </div>
        <div class="creator-ar-mode-pointer" aria-hidden="true"><span></span></div>
        ${spatialMoveControlMarkup('ar')}
        <div class="creator-ar-marker-layer" data-ar-marker-layer aria-label="Placed markers"></div>
        <div class="creator-ar-control-dock">
          <section class="creator-ar-inline-editor" data-ar-inline-editor hidden></section>
          <section class="creator-ar-area-chooser" data-ar-area-chooser hidden></section>
          <section class="creator-ar-place-picker" data-ar-place-picker aria-label="Marker type" hidden></section>
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
        if (readyPlacementType) {
            placementArmGeneration += 1;
            readyPlacementType = '';
            readySpecialMarker = null;
            updateReadyPlacementControl();
            setPlacementStatus('Placement cancelled.');
            return;
        }
        closeInlineEditor();
        closePlacePicker();
        void armPlacement(type);
    };
    overlayRoot.querySelector('[data-ar-add-plant]').addEventListener('click', () => armDirectPlacement('plant'));
    overlayRoot.querySelector('[data-ar-add-note]').addEventListener('click', () => armDirectPlacement('note'));
    overlayRoot.querySelector('[data-ar-add-special]').addEventListener('click', () => void openSpecialMarkerPicker());
    overlayRoot.querySelector('[data-ar-view-mode]').addEventListener('click', () => setInteractionMode('view'));
    overlayRoot.querySelector('[data-ar-hold-mode]').addEventListener('click', () => setInteractionMode('grab'));
    overlayRoot.querySelector('[data-ar-move-release]').addEventListener('click', () => { if (dragState) void finishMarkerDrag(); });
    overlayRoot.querySelector('[data-ar-select-mode]').addEventListener('click', () => setInteractionMode('select'));
    overlayRoot.querySelector('[data-ar-placement-capture]').addEventListener('pointerup', event => {
        event.preventDefault();
        event.stopPropagation();
        if (readyPlacementType && performance.now() - placementArmedAt > 180) void quickPlace(readyPlacementType);
    });
    overlayRoot.querySelector('[data-ar-exit]').addEventListener('click', exitArMode);
    overlayRoot.querySelector('.creator-ar-control-dock').addEventListener('beforexrselect', event => event.preventDefault());
    updateReadyPlacementControl();
    updateInteractionControls();
    document.body.append(overlayRoot);
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
    pendingPlacedRecord = null;
    destroySpatialSphereRenderer(gl, sphereRenderer);
    sphereRenderer = null;
    markerProgram = null;
    markerBuffer = null;
    placementArmedAt = 0;
    placementInProgress = false;
    activePlacementOperation = null;
    pendingBagRecord = null;
    locatedTotemRecord = null;
    pendingExistingMarkerId = '';
    arReturnContext = '';
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
    activeSiteId = preferredSiteId || '';
    activeAreaId = areaId;
    activeCheckpointId = checkpointId;
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
        } catch {
            refSpace = await session.requestReferenceSpace('local');
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
