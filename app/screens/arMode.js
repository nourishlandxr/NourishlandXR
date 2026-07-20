/*
 * Creator AR placement mode
 *
 * The dashboard remains the full web workspace. AR is for fast capture:
 * place a draft, then select it to refine its details or move it without
 * leaving the camera session. Physical checkpoints improve repeat visits but
 * are not required for a test session.
 */

import { createPlaceMarker, loadPlaceMarkers, loadProjectSites, loadSitePlaces, saveMarkerAnchor, updatePlaceMarker } from '../services/persistence.js';

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
let interactionMode = '';
let sessionMarkers = [];
let dragState = null;
let readyPlacementType = '';

const markerLabel = type => ({ plant: 'plant', sub_checkpoint: 'marker', note: 'note' })[type] || 'item';
const markerIcon = type => ({ plant: '&#x1F331;', sub_checkpoint: '&#x2691;', note: '&#x270E;' })[type] || '&#x25C6;';
const readyPlacementLabel = type => ({ plant: 'Tree', sub_checkpoint: 'Marker', note: 'Note' })[type] || 'Draft';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function returnToWeb() {
    const projectId = activeProjectId;
    exitArMode();
    window.setTimeout(() => window.renderProjectDashboard?.(encodeURIComponent(projectId)), 0);
}

function openCheckpointSetup() {
    const projectId = activeProjectId;
    exitArMode();
    window.setTimeout(() => window.openCreatorArCheckpointSetup?.(encodeURIComponent(projectId)), 0);
}

function setPlacementStatus(message) {
    const status = overlayRoot?.querySelector('[data-ar-placement-status]');
    if (status) status.textContent = message;
}

function setAreaButtonLabel() {
    const button = overlayRoot?.querySelector('[data-ar-select-area]');
    if (button) button.textContent = activeAreaName ? `Area: ${activeAreaName}` : 'Choose Area';
}

function updateReadyPlacementControl() {
    const control = overlayRoot?.querySelector('[data-ar-ready-place]');
    if (!control) return;
    const ready = Boolean(readyPlacementType);
    control.hidden = !ready;
    if (!ready) return;
    const label = readyPlacementLabel(readyPlacementType);
    control.setAttribute('aria-label', `Place ${label}`);
    const text = control.querySelector('[data-ar-ready-place-label]');
    if (text) text.textContent = `Place ${label}`;
}

function placementPoint() {
    if (!latestViewerMatrix) return null;
    const distance = 1.2;
    return {
        x: latestViewerMatrix[12] - latestViewerMatrix[8] * distance,
        y: latestViewerMatrix[13] - latestViewerMatrix[9] * distance,
        z: latestViewerMatrix[14] - latestViewerMatrix[10] * distance
    };
}

function roundCoordinate(value) {
    return Math.round(Number(value) * 1000) / 1000;
}

function spatialAnchor(position) {
    const origin = checkpointSessionOrigin;
    const checkpointPosition = origin
        ? {
            x: roundCoordinate(position.x - origin[12]),
            y: roundCoordinate(position.y - origin[13]),
            z: roundCoordinate(position.z - origin[14])
        }
        : null;
    return {
        type: 'spatial',
        coordinate_space: activeCheckpointId && checkpointPosition ? 'checkpoint-local' : 'session-local',
        checkpoint_id: activeCheckpointId || '',
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
    dragState = null;
}

function updateInteractionControls() {
    const hand = overlayRoot?.querySelector('[data-ar-grab-mode]');
    const pointer = overlayRoot?.querySelector('[data-ar-select-mode]');
    hand?.classList.toggle('is-active', interactionMode === 'grab');
    pointer?.classList.toggle('is-active', interactionMode === 'select');
    hand?.setAttribute('aria-pressed', String(interactionMode === 'grab'));
    pointer?.setAttribute('aria-pressed', String(interactionMode === 'select'));
    overlayRoot?.querySelector('[data-ar-marker-layer]')?.classList.toggle('is-interactive', Boolean(interactionMode));
}

function setInteractionMode(mode) {
    interactionMode = interactionMode === mode ? '' : mode;
    cleanupDrag();
    closeAreaChooser();
    closePlacePicker();
    if (interactionMode !== 'select') closeInlineEditor();
    updateInteractionControls();
    if (interactionMode === 'grab') setPlacementStatus('Hand mode is on. Drag a placed marker to move it.');
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
    const picker = overlayRoot?.querySelector('[data-ar-place-picker]');
    if (picker) picker.hidden = true;
    overlayRoot?.querySelector('[data-ar-window="tools"]')?.setAttribute('aria-expanded', 'false');
}

function resetArControls() {
    cleanupDrag();
    interactionMode = '';
    closeInlineEditor();
    closeAreaChooser();
    closePlacePicker();
    updateInteractionControls();
    setPlacementStatus('AR controls reset. Choose an Area or Place when you are ready.');
}

function multiplyMatrixVector(matrix, vector) {
    return [0, 1, 2, 3].map(row => matrix[row] * vector[0] + matrix[row + 4] * vector[1] + matrix[row + 8] * vector[2] + matrix[row + 12] * vector[3]);
}

function positionSessionMarkers(view = latestView) {
    if (!view || !overlayRoot) return;
    const inverse = view.transform?.inverse?.matrix;
    if (!inverse || !view.projectionMatrix) return;
    sessionMarkers.forEach(record => {
        const element = overlayRoot.querySelector(`[data-ar-marker-id="${CSS.escape(record.marker.id)}"]`);
        if (!element) return;
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
    layer.innerHTML = sessionMarkers.map(record => `<button class="creator-ar-marker creator-ar-marker-${escapeHtml(record.marker.type)}" type="button" data-ar-marker-id="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(record.marker.name)} ${markerLabel(record.marker.type)}">${markerIcon(record.marker.type)}<span>${escapeHtml(record.marker.name)}</span></button>`).join('');
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
    editor.hidden = false;
    editor.innerHTML = `<form class="creator-ar-editor-form" data-ar-editor-form><div><p class="welcome-label">${plant ? 'Plant profile' : 'Marker details'}</p><h2>${escapeHtml(record.marker.name)}</h2><p>Saved as a draft in ${escapeHtml(record.areaName)}.</p></div><label>Name<input name="name" value="${escapeHtml(record.marker.name)}" required /></label><label>${plant ? 'Quick description' : 'Note'}<textarea name="description" rows="2" placeholder="Add details now or finish later in Web Mode.">${escapeHtml(record.marker.description || record.marker.notes || '')}</textarea></label><div class="button-row"><button type="button" data-ar-editor-cancel>Cancel</button><button class="primary" type="submit">Save</button></div><p class="meta" data-ar-editor-status></p></form>`;
    if (force) requestAnimationFrame(() => editor.querySelector('textarea')?.focus());
    editor.querySelector('[data-ar-editor-cancel]').addEventListener('click', closeInlineEditor);
    editor.querySelector('[data-ar-editor-form]').addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const status = form.querySelector('[data-ar-editor-status]');
        const name = form.elements.name.value.trim();
        const description = form.elements.description.value.trim();
        if (!name) {
            status.textContent = 'A name is required.';
            return;
        }
        try {
            status.textContent = 'Saving...';
            const updated = await updatePlaceMarker(activeProjectId, record.siteId, record.areaId, record.marker.id, {
                ...record.marker,
                name,
                description,
                notes: record.marker.type === 'note' ? description : record.marker.notes || ''
            });
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
    event.preventDefault();
    event.stopPropagation();
    if (interactionMode === 'select') {
        openInlineEditor(record);
        return;
    }
    dragState = {
        record,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        position: { ...record.position }
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', moveMarkerDrag);
    window.addEventListener('pointerup', finishMarkerDrag);
    window.addEventListener('pointercancel', cancelMarkerDrag);
    setPlacementStatus(`Moving ${record.marker.name}. Release to save its new position.`);
}

function moveMarkerDrag(event) {
    if (!dragState) return;
    if (event.pointerId !== dragState.pointerId) return;
    const scale = 2.2 / Math.max(window.innerWidth, 320);
    dragState.record.position.x = dragState.position.x + (event.clientX - dragState.startX) * scale;
    dragState.record.position.y = dragState.position.y - (event.clientY - dragState.startY) * scale;
    positionSessionMarkers();
}

async function finishMarkerDrag(event) {
    const state = dragState;
    if (!state || event?.pointerId !== state.pointerId) return;
    cleanupDrag();
    try {
        await saveMarkerAnchor(activeProjectId, state.record.siteId, state.record.areaId, state.record.marker.id, spatialAnchor(state.record.position));
        interactionMode = '';
        updateInteractionControls();
        setPlacementStatus(`${state.record.marker.name} moved. Hand mode is now off.`);
    } catch (error) {
        interactionMode = '';
        updateInteractionControls();
        setPlacementStatus(`Could not save the move: ${error.message}`);
    }
}

function cancelMarkerDrag(event) {
    const state = dragState;
    if (!state || event?.pointerId !== state.pointerId) return;
    state.record.position = state.position;
    cleanupDrag();
    interactionMode = '';
    updateInteractionControls();
    positionSessionMarkers();
    setPlacementStatus('Move cancelled. Hand mode is now off.');
}

async function loadPlacementAreas() {
    const sites = await loadProjectSites(activeProjectId);
    const site = sites.find(item => item.id === activeSiteId) || sites.find(item => item.id === 'main_food_forest') || sites[0];
    if (!site) return [];
    activeSiteId = site.id;
    const areas = (await loadSitePlaces(activeProjectId, site.id)).filter(area => area.name !== 'Unassigned');
    const selected = areas.find(area => area.id === activeAreaId);
    if (selected) activeAreaName = selected.name;
    else if (areas.length === 1) {
        activeAreaId = areas[0].id;
        activeAreaName = areas[0].name;
    }
    setAreaButtonLabel();
    return areas;
}

function showAreaChooser(areas) {
    const chooser = overlayRoot?.querySelector('[data-ar-area-chooser]');
    if (!chooser) return;
    chooser.hidden = false;
    chooser.innerHTML = `<div><strong>Choose an Area</strong><button type="button" aria-label="Close Area chooser" data-ar-close-area>&times;</button></div><p>New drafts will be saved to this Area.</p><div class="creator-ar-area-options">${areas.map(area => `<button type="button" data-ar-area-id="${escapeHtml(area.id)}">${escapeHtml(area.name)}</button>`).join('')}</div>`;
    chooser.querySelector('[data-ar-close-area]').addEventListener('click', closeAreaChooser);
    chooser.querySelectorAll('[data-ar-area-id]').forEach((button, index) => button.addEventListener('click', () => {
        const area = areas[index];
        if (!area) return;
        const changedArea = Boolean(activeAreaId && activeAreaId !== area.id);
        activeAreaId = area.id;
        activeAreaName = area.name;
        if (changedArea) {
            activeCheckpointId = '';
            checkpointSessionOrigin = null;
        }
        closeAreaChooser();
        setAreaButtonLabel();
        setPlacementStatus(`${area.name} selected.${changedArea ? ' Checkpoint origin reset for this Area.' : ''} Choose Place to add a draft.`);
    }));
}

async function ensurePlacementArea() {
    try {
        const areas = await loadPlacementAreas();
        if (areas.some(area => area.id === activeAreaId)) return true;
        if (!areas.length) {
            setPlacementStatus('Create an Area in Web Mode before placing content.');
            return false;
        }
        showAreaChooser(areas);
        setPlacementStatus('Choose an Area, then place the draft.');
    } catch (error) {
        setPlacementStatus(`Area selection is unavailable: ${error.message}`);
    }
    return false;
}

async function choosePlacementArea() {
    try {
        cleanupDrag();
        interactionMode = '';
        closeInlineEditor();
        updateInteractionControls();
        const areas = await loadPlacementAreas();
        if (!areas.length) {
            setPlacementStatus('Create an Area in Web Mode before placing content.');
            return;
        }
        showAreaChooser(areas);
        setPlacementStatus('Choose an Area. Reset closes this panel if you need to start again.');
    } catch (error) {
        setPlacementStatus(`Area selection is unavailable: ${error.message}`);
    }
}

async function quickPlace(type) {
    closeInlineEditor();
    if (!await ensurePlacementArea()) return;
    const position = placementPoint();
    if (!position) {
        setPlacementStatus('Move your phone briefly, then use Place again.');
        return;
    }
    const defaults = { plant: 'New plant', sub_checkpoint: 'New marker', note: 'New note' };
    const label = markerLabel(type);
    setPlacementStatus(`Placing ${label}...`);
    try {
        const existingMarkers = await loadPlaceMarkers(activeProjectId, activeSiteId, activeAreaId).catch(() => []);
        const existingNames = new Set(existingMarkers.map(marker => String(marker.name || '').trim().toLocaleLowerCase()));
        const baseName = defaults[type];
        let draftName = baseName;
        let suffix = 1;
        while (existingNames.has(draftName.toLocaleLowerCase())) {
            draftName = `${baseName} (${suffix++})`;
        }
        // AR drafts intentionally use the stable marker route. Plant markers
        // include a profile file and can be completed later from Pointer/Web.
        const response = await createPlaceMarker(activeProjectId, activeSiteId, activeAreaId, {
            name: draftName,
            type,
            description: '',
            plant_profile: type === 'plant' ? { common_name: draftName } : undefined,
            visibility: 'draft',
            status: 'draft'
        });
        const marker = response.marker || response;
        await saveMarkerAnchor(activeProjectId, activeSiteId, activeAreaId, marker.id, spatialAnchor(position));
        const record = { marker, position, siteId: activeSiteId, areaId: activeAreaId, areaName: activeAreaName };
        sessionMarkers.push(record);
        renderSessionMarkers();
        if (readyPlacementType === type) {
            readyPlacementType = '';
            updateReadyPlacementControl();
        }
        if (type === 'note') {
            setPlacementStatus(`${marker.name} placed. Add your note now, or save it as a draft for later.`);
            openInlineEditor(record, true);
        } else {
            setPlacementStatus(`${marker.name} placed as a draft. Enable Pointer to edit or Hand to move it.`);
        }
    } catch (error) {
        setPlacementStatus(`Could not place ${label}: ${error.message}`);
    }
}

function createOverlay() {
    const hasCheckpoint = Boolean(activeAreaId && activeCheckpointId);
    const initialStatus = readyPlacementType
        ? `${readyPlacementLabel(readyPlacementType)} ready. Aim the centre circle, then tap it to place.`
        : hasCheckpoint
        ? 'Checkpoint linked. Stand at the marker, then recenter before placing.'
        : 'Test session - no physical code is needed. Place drafts now, then edit them in AR or Web Mode.';
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'creatorArOverlay';
    overlayRoot.className = 'creator-ar-overlay';
    overlayRoot.innerHTML = `
        <p class="creator-ar-placement-status" data-ar-placement-status>${initialStatus}</p>
        <div class="creator-ar-marker-layer" data-ar-marker-layer aria-label="Placed markers"></div>
        <button class="creator-ar-ready-placement" type="button" data-ar-ready-place hidden><span class="creator-ar-ready-ring" aria-hidden="true"></span><span data-ar-ready-place-label></span></button>
        <section class="creator-ar-inline-editor" data-ar-inline-editor hidden></section>
        <section class="creator-ar-area-chooser" data-ar-area-chooser hidden></section>
        <section class="creator-ar-place-picker" data-ar-place-picker aria-label="Place content" hidden>
            <button type="button" data-ar-select-area>Choose Area</button>
            <button type="button" data-ar-add-checkpoint>Add Area Marker</button>
            <button type="button" data-ar-place-tree>Place tree</button>
            <button type="button" data-ar-place-marker>Place marker</button>
            <button type="button" data-ar-place-note>Place note</button>
        </section>
        <nav class="creator-ar-taskbar" aria-label="AR placement controls">
            <button type="button" data-ar-web-mode><b aria-hidden="true">&#x21B7;</b><span>WEB</span></button>
            <button class="creator-ar-icon-control" type="button" data-ar-window="tools" aria-label="Place content" aria-expanded="false"><b aria-hidden="true">&#xFF0B;</b><span class="sr-only">Place content</span></button>
            <button class="creator-ar-mode-control" type="button" data-ar-grab-mode aria-label="Hand mode: move markers" aria-pressed="false"><b aria-hidden="true">&#x270B;</b><span class="sr-only">Hand mode</span></button>
            <button class="creator-ar-mode-control" type="button" data-ar-select-mode aria-label="Pointer mode: select markers" aria-pressed="false"><b aria-hidden="true">&#x27A4;</b><span class="sr-only">Pointer mode</span></button>
            <button class="creator-ar-icon-control" type="button" data-ar-reset aria-label="Reset AR controls"><b aria-hidden="true">&#x21BA;</b><span class="sr-only">Reset AR controls</span></button>
            <button class="creator-ar-icon-control" type="button" data-ar-recenter aria-label="Recenter checkpoint"><b aria-hidden="true">&#x25CE;</b><span class="sr-only">Recenter checkpoint</span></button>
            <button type="button" data-ar-exit><b aria-hidden="true">&times;</b><span>EXIT AR</span></button>
        </nav>`;

    overlayRoot.querySelector('[data-ar-web-mode]').addEventListener('click', returnToWeb);
    overlayRoot.querySelector('[data-ar-window="tools"]').addEventListener('click', event => {
        const picker = overlayRoot.querySelector('[data-ar-place-picker]');
        const open = picker.hidden;
        picker.hidden = !open;
        event.currentTarget.setAttribute('aria-expanded', String(open));
    });
    overlayRoot.querySelector('[data-ar-grab-mode]').addEventListener('click', () => setInteractionMode('grab'));
    overlayRoot.querySelector('[data-ar-select-mode]').addEventListener('click', () => setInteractionMode('select'));
    overlayRoot.querySelector('[data-ar-reset]').addEventListener('click', resetArControls);
    overlayRoot.querySelector('[data-ar-recenter]').addEventListener('click', () => {
        if (!latestViewerMatrix) {
            setPlacementStatus('Move your phone briefly, then recenter the checkpoint.');
            return;
        }
        checkpointSessionOrigin = Float32Array.from(latestViewerMatrix);
        setPlacementStatus(activeCheckpointId
            ? 'Checkpoint origin set for this placement session.'
            : 'Temporary test origin set for this session. Add an Area Marker when you install one.');
    });
    overlayRoot.querySelector('[data-ar-select-area]').addEventListener('click', () => { closePlacePicker(); void choosePlacementArea(); });
    overlayRoot.querySelector('[data-ar-add-checkpoint]').addEventListener('click', () => { closePlacePicker(); openCheckpointSetup(); });
    overlayRoot.querySelector('[data-ar-place-tree]').addEventListener('click', () => { closePlacePicker(); void quickPlace('plant'); });
    overlayRoot.querySelector('[data-ar-place-marker]').addEventListener('click', () => { closePlacePicker(); void quickPlace('sub_checkpoint'); });
    overlayRoot.querySelector('[data-ar-place-note]').addEventListener('click', () => { closePlacePicker(); void quickPlace('note'); });
    overlayRoot.querySelector('[data-ar-ready-place]').addEventListener('click', () => {
        if (readyPlacementType) void quickPlace(readyPlacementType);
    });
    overlayRoot.querySelector('[data-ar-exit]').addEventListener('click', exitArMode);
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
    checkpointSessionOrigin = null;
    interactionMode = '';
    sessionMarkers = [];
    readyPlacementType = '';
    gl = null;
}

export function exitArMode() {
    const activeSession = session;
    session = null;
    cleanup();
    activeSession?.end().catch(() => {});
}

export function isArModeActive() {
    return Boolean(session);
}

export async function startArMode(projectId, areaId = '', checkpointId = '', initialPlacementType = '') {
    if (session) return true;
    if (startPromise) return startPromise;
    startPromise = launchArMode(projectId, areaId, checkpointId, initialPlacementType);
    try {
        return await startPromise;
    } finally {
        startPromise = null;
    }
}

async function launchArMode(projectId, areaId, checkpointId, initialPlacementType) {
    if (!projectId || !navigator.xr || !window.isSecureContext) return false;
    activeProjectId = projectId;
    activeAreaId = areaId;
    activeCheckpointId = checkpointId;
    readyPlacementType = ['plant', 'sub_checkpoint', 'note'].includes(initialPlacementType) ? initialPlacementType : '';
    createOverlay();

    try {
        session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['dom-overlay'],
            optionalFeatures: ['local-floor'],
            domOverlay: { root: overlayRoot }
        });
        document.body.classList.add('creator-ar-session-active');
        void loadPlacementAreas().catch(() => {});

        canvas = document.createElement('canvas');
        canvas.className = 'creator-ar-canvas';
        document.body.append(canvas);
        gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL unavailable.');
        await gl.makeXRCompatible();

        const layer = new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true });
        session.updateRenderState({ baseLayer: layer, depthNear: 0.01, depthFar: 50 });
        try {
            refSpace = await session.requestReferenceSpace('local-floor');
        } catch {
            refSpace = await session.requestReferenceSpace('local');
        }

        const draw = (_time, frame) => {
            if (frame.session !== session || !gl) return;
            frame.session.requestAnimationFrame(draw);
            const pose = frame.getViewerPose(refSpace);
            if (!pose) return;
            latestViewerMatrix = Float32Array.from(pose.transform.matrix);
            latestView = pose.views[0] || null;
            positionSessionMarkers(latestView);

            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clearDepth(1);
            for (const view of pose.views) {
                const viewport = layer.getViewport(view);
                if (!viewport) continue;
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            }
        };

        session.addEventListener('end', () => {
            session = null;
            cleanup();
        });
        session.requestAnimationFrame(draw);
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
