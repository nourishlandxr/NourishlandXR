/*
 * Creator AR placement mode
 *
 * The dashboard remains the full web workspace. AR is for fast capture:
 * place a draft, then select it to refine its details or move it without
 * leaving the camera session. Physical checkpoints improve repeat visits but
 * are not required for a test session.
 */

import { createPlaceMarker, createProjectSite, createSitePlace, loadMarkerAnchor, loadPlaceMarkers, loadProjectSites, loadSitePlaces, saveMarkerAnchor, updatePlaceMarker } from '../services/persistence.js';
import { AR_EXPERIENCE_CONFIG } from '../services/arExperienceConfig.js';
import { matrixFromPose, spatialPosition } from '../services/spatialPlacement.js';
import { createMinimalMarkerDraft } from '../services/markerWorkflow.js';

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
let pendingPlacedRecord = null;
let hitTestSource = null;
let latestHitMatrix = null;
let markerProgram = null;
let markerBuffer = null;

const markerLabel = type => ({ plant: 'plant', sub_checkpoint: 'marker', note: 'note', intro_checkpoint: 'starting point' })[type] || 'item';
const markerIcon = type => ({ plant: '&#x1F331;', sub_checkpoint: '&#x2691;', note: '&#x270E;', intro_checkpoint: '&#x2316;' })[type] || '&#x25C6;';
const readyPlacementLabel = type => ({ plant: 'Tree', sub_checkpoint: 'Marker', note: 'Note', intro_checkpoint: 'Starting Point' })[type] || 'Draft';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function setPlacementStatus(message) {
    const status = overlayRoot?.querySelector('[data-ar-placement-status]');
    if (status) status.textContent = message;
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
    return spatialPosition(latestHitMatrix, latestViewerMatrix, 0.06);
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
    if (picker) {
        picker.hidden = true;
        picker.innerHTML = '';
    }
    pendingPlacedRecord = null;
    overlayRoot?.querySelector('[data-ar-window="tools"]')?.setAttribute('aria-expanded', 'false');
}

function showPlacedMarkerActions(record) {
    const picker = overlayRoot?.querySelector('[data-ar-place-picker]');
    if (!picker) return;
    pendingPlacedRecord = record;
    picker.hidden = false;
    const fixedType = record.marker.type === 'intro_checkpoint';
    picker.innerHTML = `${fixedType ? `<p>${readyPlacementLabel(record.marker.type)} placed</p>` : `<p>What type of marker is this?</p><div class="creator-ar-type-options"><button type="button" data-ar-placed-type="plant">${markerIcon('plant')} Plant</button><button type="button" data-ar-placed-type="sub_checkpoint">${markerIcon('sub_checkpoint')} Marker</button><button type="button" data-ar-placed-type="note">${markerIcon('note')} Note</button></div>`}<div class="creator-ar-after-place-actions"><button type="button" data-ar-edit-placed>Edit details</button><button type="button" data-ar-finish-placed>Done</button></div>`;
    picker.querySelectorAll('[data-ar-placed-type]').forEach(button => button.addEventListener('click', () => {
        void setPlacedMarkerType(record, button.dataset.arPlacedType);
    }));
    picker.querySelector('[data-ar-edit-placed]').addEventListener('click', () => {
        closePlacePicker();
        openInlineEditor(record, true);
    });
    picker.querySelector('[data-ar-finish-placed]').addEventListener('click', closePlacePicker);
    overlayRoot?.querySelector('[data-ar-window="tools"]')?.setAttribute('aria-expanded', 'true');
}

function resetArControls() {
    cleanupDrag();
    interactionMode = '';
    closeInlineEditor();
    closeAreaChooser();
    closePlacePicker();
    readyPlacementType = '';
    updateReadyPlacementControl();
    updateInteractionControls();
    setPlacementStatus('AR controls reset. Press plus when you are ready to place a marker.');
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

function markerBillboardMatrix(position, scale = .045) {
    const camera = latestViewerMatrix || new Float32Array(16);
    let x = camera[12] - position.x;
    let z = camera[14] - position.z;
    const length = Math.hypot(x, z) || 1;
    x /= length; z /= length;
    return new Float32Array([z * scale, 0, -x * scale, 0, 0, scale, 0, 0, x, 0, z, 0, position.x, position.y, position.z, 1]);
}

function setupSpatialMarkerRenderer() {
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex, 'attribute vec2 p;uniform mat4 mvp;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=mvp*vec4(p,0.,1.);}');
    gl.compileShader(vertex);
    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment, 'precision mediump float;varying vec2 uv;uniform vec3 color;void main(){float d=distance(uv,vec2(.5));float body=1.-smoothstep(.30,.49,d);float glow=(1.-smoothstep(.18,.5,d))*.28;float highlight=1.-smoothstep(0.,.16,distance(uv,vec2(.39,.36)));vec3 c=mix(color,vec3(1.),highlight*.58);gl_FragColor=vec4(c,body*.58+glow);}');
    gl.compileShader(fragment);
    markerProgram = gl.createProgram();
    gl.attachShader(markerProgram, vertex);
    gl.attachShader(markerProgram, fragment);
    gl.linkProgram(markerProgram);
    markerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, markerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, 1,1, -1,-1, 1,1, -1,1]), gl.STATIC_DRAW);
}

function drawSpatialMarkers(view) {
    if (!markerProgram || !markerBuffer || !sessionMarkers.length) return;
    gl.useProgram(markerProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, markerBuffer);
    const positionLocation = gl.getAttribLocation(markerProgram, 'p');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const colors = { plant: [.42, .72, .34], note: [.88, .66, .16], sub_checkpoint: [.31, .62, .82], intro_checkpoint: [.31, .62, .82] };
    sessionMarkers.forEach(record => {
        const model = markerBillboardMatrix(record.position, record.marker.type === 'intro_checkpoint' ? .06 : .045);
        const mvp = multiplyMatrices(view.projectionMatrix, multiplyMatrices(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(markerProgram, 'mvp'), false, mvp);
        gl.uniform3fv(gl.getUniformLocation(markerProgram, 'color'), colors[record.marker.type] || colors.sub_checkpoint);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
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
    layer.innerHTML = sessionMarkers.map(record => `<span class="creator-ar-marker-hit-target" role="button" tabindex="${interactionMode ? '0' : '-1'}" data-ar-marker-id="${escapeHtml(record.marker.id)}" aria-label="${escapeHtml(record.marker.name)} ${markerLabel(record.marker.type)}"><span>${escapeHtml(record.marker.name)}</span></span>`).join('');
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
    const site = sites.find(item => item.id === activeSiteId) || sites.find(item => item.id === 'main_food_forest') || sites[0]
        || await createProjectSite(activeProjectId, { ...AR_EXPERIENCE_CONFIG.defaultSite });
    activeSiteId = site.id;
    const areas = await loadSitePlaces(activeProjectId, site.id);
    const selected = areas.find(area => area.id === activeAreaId);
    if (selected) activeAreaName = selected.name;
    else {
        const automaticArea = areas.find(area => area.name === AR_EXPERIENCE_CONFIG.fallbackArea.name) || areas[0]
            || await createSitePlace(activeProjectId, site.id, { ...AR_EXPERIENCE_CONFIG.fallbackArea });
        activeAreaId = automaticArea.id;
        activeAreaName = automaticArea.name;
    }
    return areas;
}

async function restoreRecordedMarkers() {
    if (!activeProjectId || !activeSiteId || !activeAreaId) return;
    const savedMarkers = await loadPlaceMarkers(activeProjectId, activeSiteId, activeAreaId).catch(() => []);
    const restored = await Promise.all(savedMarkers.map(async marker => {
        const anchor = await loadMarkerAnchor(activeProjectId, activeSiteId, activeAreaId, marker.id).catch(() => null);
        const position = anchor?.position;
        if (anchor?.type !== 'spatial' || !position || !['x', 'y', 'z'].every(axis => Number.isFinite(Number(position[axis])))) return null;
        return {
            marker,
            position: { x: Number(position.x), y: Number(position.y), z: Number(position.z) },
            siteId: activeSiteId,
            areaId: activeAreaId,
            areaName: activeAreaName,
            coordinateSpace: anchor.coordinate_space || 'session-local'
        };
    }));
    const existingIds = new Set(sessionMarkers.map(record => record.marker.id));
    sessionMarkers.push(...restored.filter(record => record && !existingIds.has(record.marker.id)));
    renderSessionMarkers();
}

async function ensurePlacementArea() {
    try {
        const areas = await loadPlacementAreas();
        if (areas.some(area => area.id === activeAreaId)) return true;
    } catch (error) {
        setPlacementStatus(`Marker storage is unavailable: ${error.message}`);
    }
    return false;
}

async function armPlacement(type) {
    closeInlineEditor();
    closePlacePicker();
    readyPlacementType = type;
    updateReadyPlacementControl();
    if (await ensurePlacementArea()) {
        setPlacementStatus(`${readyPlacementLabel(type)} ready. Tap the centre circle to place it.`);
    }
}

async function setPlacedMarkerType(record, type) {
    if (!record || pendingPlacedRecord !== record) return;
    const defaults = { plant: 'New plant', sub_checkpoint: 'New marker', note: 'New note', intro_checkpoint: 'Starting Point' };
    try {
        const updated = await updatePlaceMarker(activeProjectId, record.siteId, record.areaId, record.marker.id, {
            ...record.marker,
            type,
            name: record.marker.name === 'New marker' ? defaults[type] : record.marker.name,
            plant_profile: type === 'plant' ? { common_name: defaults[type] } : undefined
        });
        record.marker = updated;
        renderSessionMarkers();
        showPlacedMarkerActions(record);
        pickerSelectedType(type);
        setPlacementStatus(`${readyPlacementLabel(type)} selected. Edit details now or finish.`);
    } catch (error) {
        setPlacementStatus(`Could not change marker type: ${error.message}`);
    }
}

function pickerSelectedType(type) {
    overlayRoot?.querySelectorAll('[data-ar-placed-type]').forEach(button => {
        const selected = button.dataset.arPlacedType === type;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
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
    readyPlacementType = '';
    updateReadyPlacementControl();
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
        const response = await createPlaceMarker(activeProjectId, activeSiteId, activeAreaId, createMinimalMarkerDraft(type, { name: draftName }));
        const marker = response.marker || response;
        await saveMarkerAnchor(activeProjectId, activeSiteId, activeAreaId, marker.id, spatialAnchor(position));
        const record = { marker, position, siteId: activeSiteId, areaId: activeAreaId, areaName: activeAreaName };
        sessionMarkers.push(record);
        renderSessionMarkers();
        setPlacementStatus(`${marker.name} placed. Choose its type, then edit only if you want to.`);
        showPlacedMarkerActions(record);
    } catch (error) {
        readyPlacementType = type;
        updateReadyPlacementControl();
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
        <p class="sr-only" data-ar-placement-status role="status" aria-live="polite">${initialStatus}</p>
        <div class="creator-ar-marker-layer" data-ar-marker-layer aria-label="Placed markers"></div>
        <span class="creator-ar-ready-placement" role="button" tabindex="0" data-ar-ready-place hidden><span class="creator-ar-ready-ring" aria-hidden="true"></span><span data-ar-ready-place-label></span></span>
        <section class="creator-ar-inline-editor" data-ar-inline-editor hidden></section>
        <section class="creator-ar-place-picker" data-ar-place-picker aria-label="Marker type" hidden></section>
        <nav class="creator-ar-taskbar" aria-label="AR placement controls">
            <button class="creator-ar-icon-control" type="button" data-ar-window="tools" aria-label="Place marker"><b aria-hidden="true">&#xFF0B;</b><span class="sr-only">Place marker</span></button>
            <button class="creator-ar-mode-control" type="button" data-ar-select-mode aria-label="Pointer mode: select markers" aria-pressed="false"><b aria-hidden="true">&#x27A4;</b><span class="sr-only">Pointer mode</span></button>
            <button type="button" data-ar-exit><b aria-hidden="true">&times;</b><span>EXIT AR</span></button>
        </nav>`;

    overlayRoot.querySelector('[data-ar-window="tools"]').addEventListener('click', () => {
        if (readyPlacementType) {
            readyPlacementType = '';
            updateReadyPlacementControl();
            setPlacementStatus('Placement cancelled.');
            return;
        }
        closeInlineEditor();
        closePlacePicker();
        void armPlacement('sub_checkpoint');
    });
    overlayRoot.querySelector('[data-ar-select-mode]').addEventListener('click', () => setInteractionMode('select'));
    const readyPlacementControl = overlayRoot.querySelector('[data-ar-ready-place]');
    readyPlacementControl.addEventListener('click', () => {
        if (readyPlacementType) void quickPlace(readyPlacementType);
    });
    readyPlacementControl.addEventListener('keydown', event => {
        if ((event.key === 'Enter' || event.key === ' ') && readyPlacementType) {
            event.preventDefault();
            void quickPlace(readyPlacementType);
        }
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
    hitTestSource?.cancel?.();
    hitTestSource = null;
    latestHitMatrix = null;
    checkpointSessionOrigin = null;
    interactionMode = '';
    sessionMarkers = [];
    readyPlacementType = '';
    pendingPlacedRecord = null;
    markerProgram = null;
    markerBuffer = null;
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
    readyPlacementType = AR_EXPERIENCE_CONFIG.markerTypes.includes(initialPlacementType) ? initialPlacementType : '';
    createOverlay();

    try {
        session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['dom-overlay', 'hit-test'],
            optionalFeatures: ['local-floor'],
            domOverlay: { root: overlayRoot }
        });
        document.body.classList.add('creator-ar-session-active');
        void loadPlacementAreas().then(restoreRecordedMarkers).catch(() => {});

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
