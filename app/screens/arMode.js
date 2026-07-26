/*
 * Creator AR placement mode
 *
 * The dashboard remains the full web workspace. AR is for fast capture:
 * place a draft, then select it to refine its details or move it without
 * leaving the camera session. Physical checkpoints improve repeat visits but
 * are not required for a test session.
 */

import { createPlaceMarker, createProjectSite, createSitePlace, deletePlaceMarker, loadMarkerAnchor, loadPlaceMarkers, loadProjectSites, loadSitePlaces, saveMarkerAnchor, updatePlaceMarker } from '../services/persistence.js';
import { AR_EXPERIENCE_CONFIG } from '../services/arExperienceConfig.js';
import { createAreaRecord } from '../services/areaWorkflow.js';
import { matrixFromPose, spatialPosition } from '../services/spatialPlacement.js';
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
let interactionMode = 'view';
let sessionMarkers = [];
let dragState = null;
let readyPlacementType = '';
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
const markerDefaultColor = type => ({ plant: '#6fb85a', note: '#d6a928', sub_checkpoint: '#91a29a', intro_checkpoint: '#43c99b', area_checkpoint: '#68c7b8' })[type] || '#91a29a';
const markerAppearanceColor = marker => /^#[0-9a-f]{6}$/i.test(marker?.appearance?.color || '') ? marker.appearance.color : markerDefaultColor(marker?.type);
const markerAppearanceSize = marker => ['small', 'medium', 'large'].includes(marker?.appearance?.size) ? marker.appearance.size : 'medium';
const normalizeAreaCheckpointMarker = marker => marker?.semantic_type === 'area_checkpoint'
    ? { ...marker, type: 'area_checkpoint', storage_type: marker.storage_type || 'sub_checkpoint' }
    : marker;
const areaBoard = marker => ({
    title: marker?.area_information_board?.title || String(marker?.name || 'Area').replace(/\s+checkpoint$/i, ''),
    introduction: marker?.area_information_board?.introduction || marker?.description || 'Welcome to this Area.'
});

function markerRgb(marker, fallback) {
    if (!/^#[0-9a-f]{6}$/i.test(marker?.appearance?.color || '')) return fallback;
    const color = markerAppearanceColor(marker);
    const value = Number.parseInt(color.slice(1), 16);
    return Number.isFinite(value) ? [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255] : fallback;
}

function markerScale(marker) {
    return ({ small: .034, medium: .045, large: .06 })[markerAppearanceSize(marker)] || .045;
}

function markerSizeFactor(marker) {
    return ({ small: .76, medium: 1, large: 1.34 })[markerAppearanceSize(marker)] || 1;
}

function markerShape(type) {
    return ({ sub_checkpoint: 0, area_checkpoint: 1, intro_checkpoint: 2, note: 3, plant: 4 })[type] ?? 0;
}

function markerDimensions(marker) {
    const factor = markerSizeFactor(marker);
    return ({
        // WebXR model scales are half-extents: these render at 0.5m x 2.1m
        // and 1.2m x 2.3m respectively at the default size.
        area_checkpoint: [.225 * factor, 1 * factor],
        intro_checkpoint: [.42 * factor, .805 * factor],
        note: [.11 * factor, .07 * factor],
        plant: [.062 * factor, .062 * factor],
        sub_checkpoint: [markerScale(marker), markerScale(marker)]
    })[marker.type] || [markerScale(marker), markerScale(marker)];
}

function setPlacementStatus(message) {
    const status = overlayRoot?.querySelector('[data-ar-placement-status]');
    if (status) status.textContent = message;
}

function updateReadyPlacementControl() {
    overlayRoot?.classList.toggle('is-placement-armed', Boolean(readyPlacementType));
    if (!readyPlacementType && !interactionMode) {
        interactionMode = 'view';
        updateInteractionControls();
    }
    const guideLabel = overlayRoot?.querySelector('[data-ar-placement-guide-label]');
    if (guideLabel && readyPlacementType) guideLabel.textContent = `Place ${readyPlacementLabel(readyPlacementType)}`;
}

function placementPoint() {
    return spatialPosition(latestHitMatrix, latestViewerMatrix, 0.06);
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
    window.removeEventListener('pointerup', finishMarkerDrag);
    window.removeEventListener('pointercancel', cancelMarkerDrag);
    dragState?.element?.classList.remove('is-adjusting');
    dragState = null;
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
    markerLayer?.classList.toggle('is-grab-mode', interactionMode === 'grab');
    markerLayer?.classList.toggle('is-select-mode', interactionMode === 'select');
    overlayRoot?.classList.toggle('is-view-mode', interactionMode === 'view');
    overlayRoot?.classList.toggle('is-hold-mode', interactionMode === 'grab');
    overlayRoot?.classList.toggle('is-select-mode', interactionMode === 'select');
}

function setInteractionMode(mode) {
    interactionMode = mode;
    cleanupDrag();
    closeAreaChooser();
    closePlacePicker();
    closeUnplacedBag();
    if (interactionMode !== 'select') closeInlineEditor();
    updateInteractionControls();
    if (interactionMode === 'view') setPlacementStatus('View mode is on. Hover over a Marker to reveal its name.');
    else if (interactionMode === 'grab') setPlacementStatus('Hold mode is on. Touch one Marker to carry it to the pointer; release and View mode returns.');
    else if (interactionMode === 'select') setPlacementStatus('Pointer mode is on. Tap a placed marker to edit it here.');
    else setPlacementStatus('Interaction is off. Markers cannot be selected or moved.');
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
            const entries = await Promise.all(markers.filter(marker => ['plant', 'note', 'sub_checkpoint'].includes(marker.type)).map(async marker => {
                const anchor = await loadMarkerAnchor(activeProjectId, activeSiteId, area.id, marker.id).catch(() => null);
                return anchor?.type === 'spatial' ? null : { marker, areaId: area.id, areaName: area.name };
            }));
            return entries.filter(Boolean);
        }));
        const items = groups.flat();
        bag.innerHTML = `<div><strong>Organizer Folder</strong><button type="button" data-ar-close-bag aria-label="Close Folder">&times;</button></div>${items.length ? `<div class="creator-ar-bag-list">${items.map((item, index) => `<button type="button" data-ar-bag-item="${index}">${markerIcon(item.marker.type)} <span><strong>${escapeHtml(item.marker.name)}</strong><small>${readyPlacementLabel(item.marker.type)} · ${escapeHtml(item.areaName || 'Unassigned')}</small></span></button>`).join('')}</div>` : '<p>This folder is empty. Save information here only when you want to organise or place it later.</p>'}`;
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
        bag.innerHTML = `<div><strong>Organizer Folder</strong><button type="button" data-ar-close-bag aria-label="Close Folder">&times;</button></div><p>Could not load the folder: ${escapeHtml(error.message)}</p>`;
        bag.querySelector('[data-ar-close-bag]')?.addEventListener('click', closeUnplacedBag);
    }
}

function showPlacedMarkerActions(record) {
    const picker = overlayRoot?.querySelector('[data-ar-place-picker]');
    if (!picker) return;
    pendingPlacedRecord = record;
    picker.hidden = false;
    const fixedType = ['intro_checkpoint', 'area_checkpoint'].includes(record.marker.type);
    picker.innerHTML = `<div class="creator-ar-picker-heading"><p>${fixedType ? `${readyPlacementLabel(record.marker.type)} placed` : 'Choose its purpose'}</p><button type="button" data-ar-close-placed aria-label="Close">&times;</button></div>${fixedType ? `<p class="creator-ar-picker-status">Its details and size can be changed later in Pointer mode.</p><div class="creator-ar-after-place-actions"><button type="button" data-ar-edit-placed>Edit details</button><button type="button" data-ar-finish-placed>Done</button></div>` : `<div class="creator-ar-type-options creator-ar-common-types"><button type="button" data-ar-placed-type="plant">${markerIcon('plant')} Plant</button><button type="button" data-ar-placed-type="note">${markerIcon('note')} Note</button><button type="button" data-ar-placed-type="sub_checkpoint">${markerIcon('sub_checkpoint')} Marker</button></div>`}`;
    picker.querySelectorAll('[data-ar-placed-type]').forEach(button => button.addEventListener('click', () => {
        const type = button.dataset.arPlacedType;
        closePlacePicker();
        void setPlacedMarkerType(record, type);
    }));
    picker.querySelector('[data-ar-edit-placed]')?.addEventListener('click', () => {
        closePlacePicker();
        openInlineEditor(record, true);
    });
    picker.querySelector('[data-ar-finish-placed]')?.addEventListener('click', closePlacePicker);
    picker.querySelector('[data-ar-close-placed]').addEventListener('click', closePlacePicker);
}

function renderSpecialMarkerChoices(picker) {
    const existingTotem = sessionMarkers.find(record => record.areaId === activeAreaId && record.marker.type === 'area_checkpoint');
    const existingEntrance = sessionMarkers.find(record => record.marker.type === 'intro_checkpoint' && (!activeAreaId || record.areaId === activeAreaId));
    const visibilityControls = [
        existingTotem ? `<button class="creator-ar-special-totem" type="button" data-ar-toggle-structural="${escapeHtml(existingTotem.marker.id)}"><b aria-hidden="true">${hiddenStructuralMarkerIds.has(existingTotem.marker.id) ? '&#x25C9;' : '&#x25CE;'}</b><span><strong>${hiddenStructuralMarkerIds.has(existingTotem.marker.id) ? 'Show' : 'Hide'} Totem</strong><small>Change visibility for this AR session.</small></span></button>` : '',
        existingEntrance ? `<button class="creator-ar-special-totem" type="button" data-ar-toggle-structural="${escapeHtml(existingEntrance.marker.id)}"><b aria-hidden="true">${hiddenStructuralMarkerIds.has(existingEntrance.marker.id) ? '&#x25C9;' : '&#x25CE;'}</b><span><strong>${hiddenStructuralMarkerIds.has(existingEntrance.marker.id) ? 'Show' : 'Hide'} Trail Entrance</strong><small>Change visibility for this AR session.</small></span></button>` : ''
    ].join('');
    const totemAction = existingTotem
        ? `<button class="creator-ar-special-totem creator-ar-locate-totem" type="button" data-ar-locate-totem><b aria-hidden="true">➜</b><span><strong>Go to Totem</strong><small>${escapeHtml(existingTotem.areaName || activeAreaName || 'Area Totem')}</small></span></button>`
        : activeAreaId
            ? `<button class="creator-ar-special-totem" type="button" data-ar-place-area-totem><b aria-hidden="true">${markerIcon('area_checkpoint')}</b><span><strong>Place ${escapeHtml(activeAreaName || 'this Area')} Totem</strong><small>Raise the Totem for this existing Area.</small></span></button>`
            : '';
    picker.innerHTML = `<div class="creator-ar-picker-heading"><p>Special Markers</p><button type="button" data-ar-close-special aria-label="Close">&times;</button></div>${totemAction}<button class="creator-ar-special-totem creator-ar-create-area" type="button" data-ar-create-area><b aria-hidden="true">+</b><span><strong>Create New Area</strong><small>Name an Area, then place its Totem.</small></span></button>${visibilityControls}`;
    picker.querySelector('[data-ar-close-special]').addEventListener('click', closePlacePicker);
    picker.querySelector('[data-ar-place-area-totem]')?.addEventListener('click', () => {
        closePlacePicker();
        void armPlacement('area_checkpoint');
    });
    picker.querySelector('[data-ar-create-area]').addEventListener('click', () => void openArAreaCreationForm());
    picker.querySelector('[data-ar-locate-totem]')?.addEventListener('click', () => {
        locatedTotemRecord = existingTotem;
        closePlacePicker();
        setPlacementStatus(`Ground guide active. Follow it to ${existingTotem.areaName || 'the Area Totem'}.`);
    });
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
    interactionMode = 'view';
    closeInlineEditor();
    closeAreaChooser();
    closePlacePicker();
    closeUnplacedBag();
    readyPlacementType = '';
    pendingBagRecord = null;
    updateReadyPlacementControl();
    updateInteractionControls();
    setPlacementStatus('AR controls reset. View mode is on; press plus when you are ready to place a Marker.');
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
    gl.shaderSource(fragment, 'precision mediump float;varying vec2 uv;uniform vec3 color;uniform float shape;float box(vec2 p,vec2 s){return 1.-smoothstep(.0,.025,max(abs(p.x)-s.x,abs(p.y)-s.y));}void main(){vec2 q=uv-vec2(.5);float d=length(q);float sphere=1.-smoothstep(.42,.5,d);float sphereDepth=sqrt(max(0.,1.-pow(d/.5,2.)));float core=1.-smoothstep(.08,.22,d);float rect=box(q,vec2(.40,.28));float totem=box(q,vec2(.20,.45));float jade=1.-smoothstep(.0,.025,max(abs(q.x)*.78+abs(q.y)*.28-.38,abs(q.y)-.46));vec2 backQ=q+vec2(.065,-.055);float backRect=box(backQ,vec2(.40,.28));float backTotem=box(backQ,vec2(.20,.45));float backJade=1.-smoothstep(.0,.035,max(abs(backQ.x)*.78+abs(backQ.y)*.28-.38,abs(backQ.y)-.46));float front=shape<.5?sphere:(shape<1.5?totem:(shape<2.5?jade:(shape<3.5?rect:sphere)));float back=shape<.5?sphere:(shape<1.5?backTotem:(shape<2.5?backJade:(shape<3.5?backRect:sphere)));float side=max(0.,back-front);float body=max(front,back);float light=clamp(.28+.68*sphereDepth+.24*(-q.x+q.y),0.,1.);vec3 shaded=mix(color*.42,mix(color,vec3(1.),.38),light);if(shape>.5&&shape<3.5){shaded=mix(color*.28,shaded,front);shaded=mix(shaded,color*.22,side*.88);}if(shape>3.5)shaded=mix(shaded,vec3(.92,1.,.78),core*.62);if(shape>4.5){body=box(q,vec2(.46,.42));shaded=mix(color*.45,color,.65);front=body;}float glow=(1.-smoothstep(.30,.55,d))*(shape<.5||shape>3.5&&shape<4.5?.16:.06);float structuralAlpha=shape<1.5?.82:.50;float alpha=body*(shape<.5?.58:(shape<2.5?structuralAlpha:(shape>4.5?.42:.82)))+glow;if(body<.01&&glow<.01)discard;gl_FragColor=vec4(shaded,alpha);}');
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
    const colors = { plant: [.42, .72, .34], note: [.88, .66, .16], sub_checkpoint: [.57, .64, .6], intro_checkpoint: [.26, .82, .62], area_checkpoint: [.34, .78, .7] };

    sessionMarkers.forEach(record => {
        if (hiddenStructuralMarkerIds.has(record.marker.id)) return;
        const shape = markerShape(record.marker.type);
        if (shape !== 0 && shape !== 4) return;
        const [scaleX, scaleY] = markerDimensions(record.marker);
        const baseColor = colors[record.marker.type] || colors.sub_checkpoint;
        drawSpatialOrb(gl, sphereRenderer, view, record.position, Math.max(scaleX, scaleY), {
            type: shape === 4 ? 'plant' : 'marker',
            color: markerRgb(record.marker, baseColor)
        });
    });

    if (readyPlacementType && latestHitMatrix) {
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
        if (shape === 0 || shape === 4) return;
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
        if (visible) element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -50%)`;
    });
}

function renderSessionMarkers() {
    const layer = overlayRoot?.querySelector('[data-ar-marker-layer]');
    if (!layer) return;
    layer.innerHTML = sessionMarkers.map(record => `<span class="creator-ar-marker-hit-target creator-ar-marker-hit-target-${escapeHtml(record.marker.type)}" role="button" tabindex="${interactionMode ? '0' : '-1'}" data-ar-marker-id="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(record.marker.name)} ${markerLabel(record.marker.type)}" style="--marker-accent:${markerAppearanceColor(record.marker)}"><span class="creator-ar-spatial-name">${escapeHtml(record.marker.name)}</span></span>`).join('');
    sessionMarkers.forEach(record => {
        layer.querySelector(`[data-ar-marker-id="${CSS.escape(record.marker.id)}"]`)?.addEventListener('pointerdown', event => beginMarkerInteraction(record, event));
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
    const fixedType = ['intro_checkpoint', 'area_checkpoint'].includes(record.marker.type);
    const startingPoint = record.marker.type === 'intro_checkpoint';
    const areaCheckpoint = record.marker.type === 'area_checkpoint';
    editor.hidden = false;
    const appearance = record.marker.appearance || {};
    const typeControl = fixedType ? `<p class="creator-ar-fixed-type">Type · ${record.marker.type === 'area_checkpoint' ? 'Area Totem' : 'Trail Entrance'}</p>` : `<label>Type<select name="markerType"><option value="sub_checkpoint" ${record.marker.type === 'sub_checkpoint' ? 'selected' : ''}>Marker</option><option value="plant" ${record.marker.type === 'plant' ? 'selected' : ''}>Plant</option><option value="note" ${record.marker.type === 'note' ? 'selected' : ''}>Note</option></select></label>`;
    const markerControls = `<fieldset class="creator-ar-appearance"><legend>Marker appearance</legend>${typeControl}<label>Color<input name="markerColor" type="color" value="${markerAppearanceColor(record.marker)}" /></label><label>Size<select name="markerSize"><option value="small" ${markerAppearanceSize(record.marker) === 'small' ? 'selected' : ''}>Small</option><option value="medium" ${markerAppearanceSize(record.marker) === 'medium' ? 'selected' : ''}>Medium</option><option value="large" ${markerAppearanceSize(record.marker) === 'large' ? 'selected' : ''}>Large</option></select></label></fieldset>`;
    const board = areaBoard(record.marker);
    const areaBoardControls = areaCheckpoint ? `<fieldset class="creator-ar-area-board-editor"><legend>Area welcome board</legend><label>Board title<input name="areaBoardTitle" value="${escapeHtml(board.title)}" required /></label><label>Welcome message<textarea name="areaBoardIntroduction" rows="3" placeholder="Explain what this Area is for and welcome people into it.">${escapeHtml(board.introduction)}</textarea></label><p>This spatial board gathers around the Area Totem and can be refined later.</p></fieldset>` : '';
    const noticeBoard = record.marker.notice_board || {};
    const startingBoardControls = startingPoint ? `<fieldset class="creator-ar-area-board-editor"><legend>Trail Entrance notice board</legend><label>Board title<input name="noticeBoardTitle" value="${escapeHtml(noticeBoard.title || record.marker.name)}" /></label><label>Welcome notice<textarea name="noticeBoardMessage" rows="3" placeholder="Add a welcome, orientation or important notice.">${escapeHtml(noticeBoard.message || '')}</textarea></label><p>Leave the notice blank when this entrance needs no spatial text.</p></fieldset>` : '';
    editor.innerHTML = `<form class="creator-ar-editor-form" data-ar-editor-form><div><p class="welcome-label">Marker details</p><h2>${escapeHtml(record.marker.name)}</h2><p>Saved as a draft in ${escapeHtml(record.areaName)}.</p></div><label>Name<input name="name" value="${escapeHtml(record.marker.name)}" required /></label><label>Description<textarea name="description" rows="2" placeholder="Add details now or finish later in Web Mode.">${escapeHtml(record.marker.description || record.marker.notes || '')}</textarea></label>${markerControls}${areaBoardControls}${startingBoardControls}${plant ? '<p class="creator-ar-profile-note">Plant knowledge such as climate, uses and relationships belongs in Plant Profile.</p>' : ''}<div class="creator-ar-editor-actions"><button class="creator-ar-delete" type="button" data-ar-delete-marker>Delete</button><span></span><button type="button" data-ar-editor-cancel>Cancel</button><button class="primary" type="submit">Save</button></div><p class="meta" data-ar-editor-status></p></form>`;
    if (force) requestAnimationFrame(() => editor.querySelector('textarea')?.focus());
    editor.querySelector('[data-ar-editor-cancel]').addEventListener('click', closeInlineEditor);
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
        const description = form.elements.description.value.trim();
        const type = form.elements.markerType?.value || record.marker.type;
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
                    introduction: form.elements.areaBoardIntroduction?.value.trim() || description || `Welcome to ${name}.`
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
    if (interactionMode === 'view') return;
    event.preventDefault();
    event.stopPropagation();
    if (interactionMode === 'select') {
        openInlineEditor(record);
        return;
    }
    const grabScale = 2.2 / Math.max(window.innerWidth, 320);
    const pointerBounds = overlayRoot?.querySelector('.creator-ar-mode-pointer span')?.getBoundingClientRect();
    const pointerTarget = pointerBounds
        ? { x: pointerBounds.left + pointerBounds.width / 2, y: pointerBounds.top + pointerBounds.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const snapOffset = {
        x: (pointerTarget.x - event.clientX) * grabScale,
        y: -(pointerTarget.y - event.clientY) * grabScale
    };
    dragState = {
        record,
        element: event.currentTarget,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        position: { ...record.position },
        cameraPosition: latestViewerMatrix ? { x: latestViewerMatrix[12], y: latestViewerMatrix[13], z: latestViewerMatrix[14] } : null,
        snapOffset,
        pointerOffset: { ...snapOffset }
    };
    event.currentTarget.classList.add('is-adjusting');
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', moveMarkerDrag);
    window.addEventListener('pointerup', finishMarkerDrag);
    window.addEventListener('pointercancel', cancelMarkerDrag);
    updateGrabbedMarkerFromCamera();
    positionSessionMarkers();
    setPlacementStatus(`Holding ${record.marker.name}. Drag or move your phone; release to save its new position.`);
}

function moveMarkerDrag(event) {
    if (!dragState) return;
    if (event.pointerId !== dragState.pointerId) return;
    const scale = 2.2 / Math.max(window.innerWidth, 320);
    dragState.pointerOffset.x = dragState.snapOffset.x + (event.clientX - dragState.startX) * scale;
    dragState.pointerOffset.y = dragState.snapOffset.y - (event.clientY - dragState.startY) * scale;
    updateGrabbedMarkerFromCamera();
    positionSessionMarkers();
}

function updateGrabbedMarkerFromCamera() {
    if (!dragState || !latestViewerMatrix) return;
    const origin = dragState.cameraPosition || { x: latestViewerMatrix[12], y: latestViewerMatrix[13], z: latestViewerMatrix[14] };
    dragState.record.position.x = dragState.position.x + (latestViewerMatrix[12] - origin.x) + dragState.pointerOffset.x;
    dragState.record.position.y = dragState.position.y + (latestViewerMatrix[13] - origin.y) + dragState.pointerOffset.y;
    dragState.record.position.z = dragState.position.z + (latestViewerMatrix[14] - origin.z);
}

async function finishMarkerDrag(event) {
    const state = dragState;
    if (!state || event?.pointerId !== state.pointerId) return;
    const operation = captureArOperationContext();
    cleanupDrag();
    interactionMode = 'view';
    updateInteractionControls();
    setPlacementStatus(`Saving ${state.record.marker.name}… View mode is now on.`);
    try {
        await saveMarkerAnchor(operation.projectId, state.record.siteId, state.record.areaId, state.record.marker.id, spatialAnchor(state.record.position, operation));
        if (!isArOperationCurrent(operation)) return;
        setPlacementStatus(`${state.record.marker.name} moved. View mode is now on.`);
    } catch (error) {
        if (!isArOperationCurrent(operation)) return;
        state.record.position = state.position;
        positionSessionMarkers();
        setPlacementStatus(`Could not save the move: ${error.message}`);
    }
}

function cancelMarkerDrag(event) {
    const state = dragState;
    if (!state || event?.pointerId !== state.pointerId) return;
    state.record.position = state.position;
    cleanupDrag();
    interactionMode = 'view';
    updateInteractionControls();
    positionSessionMarkers();
    setPlacementStatus('Move cancelled. View mode is now on.');
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
            const marker = normalizeAreaCheckpointMarker(savedMarker);
            const anchor = await loadMarkerAnchor(operation.projectId, operation.siteId, area.id, marker.id).catch(() => null);
            const position = anchor?.position;
            if (anchor?.type !== 'spatial' || !position || !['x', 'y', 'z'].every(axis => Number.isFinite(Number(position[axis])))) return null;
            return {
                marker,
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
    const marker = normalizeAreaCheckpointMarker(markers.find(item => item.id === markerId));
    if (!marker) {
        setPlacementStatus('The saved Marker could not be loaded for placement.');
        return false;
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
    interactionMode = 'view';
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
                setPlacementStatus(`${record.marker.name} placed. View mode is on.`);
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
        const draft = createMinimalMarkerDraft(type, {
            name: draftName,
            description: type === 'area_checkpoint' ? `Information centre for ${operation.areaName || 'this Area'}.` : ''
        });
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
            marker = response.marker || response;
        }
        if (!operationIsCurrent() || !marker) return;
        await saveMarkerAnchor(operation.projectId, operation.siteId, operation.areaId, marker.id, spatialAnchor(position, operation));
        if (!operationIsCurrent()) return;
        const record = { marker, position, siteId: operation.siteId, areaId: operation.areaId, areaName: operation.areaName };
        sessionMarkers.push(record);
        renderSessionMarkers();
        if (type === 'area_checkpoint') {
            setPlacementStatus(`${operation.areaName || 'Area'} Totem placed. View mode is on.`);
        } else {
            setPlacementStatus(`${marker.name} placed. Choose its purpose.`);
            showPlacedMarkerActions(record);
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
        <div class="creator-ar-mode-pointer" aria-hidden="true"><span></span></div>
        <div class="creator-ar-marker-layer" data-ar-marker-layer aria-label="Placed markers"></div>
        <div class="creator-ar-control-dock">
          <section class="creator-ar-inline-editor" data-ar-inline-editor hidden></section>
          <section class="creator-ar-area-chooser" data-ar-area-chooser hidden></section>
          <section class="creator-ar-place-picker" data-ar-place-picker aria-label="Marker type" hidden></section>
          <nav class="creator-ar-taskbar" aria-label="AR placement controls">
            <button class="creator-ar-add-marker" type="button" data-ar-add-marker aria-label="Add Marker"><strong>+ MARKER</strong></button>
            <button class="creator-ar-special-marker" type="button" data-ar-add-special aria-label="Add Special Marker"><strong>+ SPECIAL</strong></button>
            <button class="creator-ar-mode-control is-active" type="button" data-ar-view-mode aria-label="View mode: reveal Marker names" aria-pressed="true"><b class="creator-ar-view-icon" aria-hidden="true"></b><span class="sr-only">View mode</span></button>
            <button class="creator-ar-mode-control" type="button" data-ar-hold-mode aria-label="Hold mode: move one Marker" aria-pressed="false"><b aria-hidden="true">&#x270B;</b><span class="sr-only">Hold mode</span></button>
            <button class="creator-ar-mode-control" type="button" data-ar-select-mode aria-label="Pointer mode: select markers" aria-pressed="false"><b aria-hidden="true">&#x27A4;</b><span class="sr-only">Pointer mode</span></button>
            <button type="button" data-ar-exit><b aria-hidden="true">&times;</b><span>EXIT AR</span></button>
          </nav>
        </div>`;

    overlayRoot.querySelector('[data-ar-add-marker]').addEventListener('click', () => {
        if (readyPlacementType) {
            placementArmGeneration += 1;
            readyPlacementType = '';
            updateReadyPlacementControl();
            setPlacementStatus('Placement cancelled.');
            return;
        }
        closeInlineEditor();
        closePlacePicker();
        void armPlacement('sub_checkpoint');
    });
    overlayRoot.querySelector('[data-ar-add-special]').addEventListener('click', () => void openSpecialMarkerPicker());
    overlayRoot.querySelector('[data-ar-view-mode]').addEventListener('click', () => setInteractionMode('view'));
    overlayRoot.querySelector('[data-ar-hold-mode]').addEventListener('click', () => setInteractionMode('grab'));
    overlayRoot.querySelector('[data-ar-select-mode]').addEventListener('click', () => setInteractionMode('select'));
    overlayRoot.querySelector('[data-ar-placement-capture]').addEventListener('pointerup', event => {
        event.preventDefault();
        event.stopPropagation();
        if (readyPlacementType && performance.now() - placementArmedAt > 180) void quickPlace(readyPlacementType);
    });
    overlayRoot.querySelector('[data-ar-exit]').addEventListener('click', exitArMode);
    overlayRoot.querySelector('.creator-ar-control-dock').addEventListener('beforexrselect', event => event.preventDefault());
    updateReadyPlacementControl();
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
    interactionMode = 'view';
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
        if (returnContext && areaId && window.resumeAreaCreationFlow) {
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
