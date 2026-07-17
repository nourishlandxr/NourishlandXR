// AR Note / Hillyards Main AR Menu
//
// This module renders the Hillyards XR main AR menu on a world-anchored
// panel, plus a marker-first mock creation workflow (Add Intro Checkpoint,
// Add Sub Checkpoint, Add Plant Marker, Add Custom Note). Created markers in
// this flow are persisted through the local workspace API. Naming and confirmation are handled through the WebXR
// DOM Overlay, since text entry inside a WebGL canvas is not practical.

import { createDemoMarker, createPlaceMarker, loadDemoMarkers, saveMarkerAnchor, updateDemoMarker, updatePlaceMarker } from './persistence.js';

const TYPES = {
    plant: { title: 'Add Plant Marker', nameLabel: 'Marker Name', typeLabel: 'Plant Marker', addLabel: 'Add Information' },
    note: { title: 'Add Custom Note', nameLabel: 'Marker Name', typeLabel: 'Custom Note', addLabel: 'Add Information' },
    intro_checkpoint: { title: 'Add Intro Checkpoint', nameLabel: 'Marker Name', typeLabel: 'Intro Checkpoint', addLabel: 'Add Information' },
    sub_checkpoint: { title: 'Add Sub Checkpoint', nameLabel: 'Marker Name', typeLabel: 'Sub Checkpoint', addLabel: 'Add Information' }
};

const ADD_INFO_FIELDS = {
    plant: ['Common Name', 'Scientific Name', 'Description', 'Plant Profile', 'Anchor'],
    note: ['Title', 'Text', 'Directions', 'Anchor'],
    intro_checkpoint: ['Introduction text', 'Written directions', 'Anchor'],
    sub_checkpoint: ['Introduction text', 'Written directions', 'Anchor']
};

function typeConfig(type) { return TYPES[type] || TYPES.note; }

function recordLatestEntry(entry) {
    const completeEntry = {
        id: entry.id,
        name: entry.name,
        type: entry.type,
        persisted: true,
        created: entry.created || new Date().toISOString(),
        modified: new Date().toISOString()
    };
    window.dispatchEvent(new CustomEvent('nxr:latest-entry-added', { detail: completeEntry }));
}

function markerColour(type, placeholder = false) {
    const colours = {
        plant: placeholder ? 'rgba(47,109,66,.62)' : '#2f6d42',
        intro_checkpoint: placeholder ? 'rgba(196,54,54,.62)' : '#c43636',
        sub_checkpoint: placeholder ? 'rgba(232,190,35,.68)' : '#e8be23',
        note: placeholder ? 'rgba(55,105,180,.62)' : '#3769b4'
    };
    return colours[type] || colours.note;
}

// ---- WebXR / WebGL session state ----
let session;
let gl;
let refSpace;
let hitSource;
let latestHitTransform;
let latestViewerPosition;
let surfaceAvailable = false;
let pointerFallbackTimer;
let placementMessageTimer;
let ignoreNextSelectAfterFallback = false;
let program;
let positionLocation, texCoordLocation, mvpLocation, textureUniformLocation;
let panelBuffer;
let toolboxBuffer;
let flagBuffer;
let texture;
let toolboxTexture;
let pendingPinTexture;
let panelCanvas;
let panelContext;
let toolboxCanvas;
let toolboxContext;
let flagCanvas;
let flagContext;
let canvas;
let overlay;
let modal;
let modalCard;
let placementReticle;
let reticleLabel;
let plantProfile;
let arDiagnosticLines = [];

// ---- Demo / menu state machine ----
// mode: 'scanning-menu' | 'menu-placed' | 'parent-prompt' | 'scanning-marker' | 'naming-marker' | 'marker-confirmed' | 'add-information'
let mode = 'idle';
let panelView = 'projects'; // 'projects' | 'toolbox' | 'plant' | 'note'
let menuMatrix = null;
let toolboxMatrix = null;
let menuVisible = false;
let persistedMarkers = [];
let activeLocationName = 'Hillyards Food Forest';
let activeLocationStatus = { startingPoint: 'Not configured', accuracy: 'Not available', entries: '0 published · 0 drafts', label: 'Setup incomplete' };
let suppliedLocationMarkers = null;
let activePersistenceContext = null;
let pendingType = null;
let pendingParentName = '';
let pendingMarkerMatrix = null;
let lastConfirmedMarker = null;
let tempMarkers = []; // in-memory only, cleared on Reset / Exit AR / session end
let tempMarkerCounter = 0;
let spatialMarkers = [];
let reconstructedMarkers = [];
let spatialMarkersInitialized = false;
let spatialCreator = false;

function updateGlobalArToggle(active) {
    const button = document.getElementById('globalArToggle');
    if (!button) return;
    button.textContent = active ? 'Close AR' : 'Explore with AR';
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
}

async function createActiveMarker(data) {
    if (activePersistenceContext?.projectId) {
        if (!activePersistenceContext.siteId || !activePersistenceContext.placeId) throw new Error('Add a place to this location before creating AR entries.');
        const marker = await createPlaceMarker(activePersistenceContext.projectId, activePersistenceContext.siteId, activePersistenceContext.placeId, { ...data, visibility: 'draft' });
        return { ...marker, _siteId: activePersistenceContext.siteId, _placeId: activePersistenceContext.placeId };
    }
    return createDemoMarker(data);
}

async function updateActiveMarker(marker, changes) {
    if (!activePersistenceContext?.projectId || !marker._siteId || !marker._placeId) return updateDemoMarker(marker.id, changes);
    const updated = await updatePlaceMarker(activePersistenceContext.projectId, marker._siteId, marker._placeId, marker.id, changes);
    return { ...updated, _siteId: marker._siteId, _placeId: marker._placeId };
}

export function isArActive() {
    return Boolean(session);
}

const PANEL_WIDTH = 0.92;
const PANEL_HEIGHT = 0.62;
const TOOLBOX_WIDTH = 0.42;
const TOOLBOX_HEIGHT = 0.50;
const FLAG_WIDTH = 0.30;
const FLAG_HEIGHT = 0.14;
const CANVAS_W = 1200;
const CANVAS_H = 800;

// Hit regions for the permanent Demo V1 project selector and the
// Hillyards Food Forest Tool Box, in panel-canvas pixel space.
const PROJECT_REGIONS = [
    { id: 'Hillyards', label: 'Hillyards', x: 40, y: 180, w: 1120, h: 105 },
    { id: 'Frankendael', label: 'Frankendael', x: 40, y: 305, w: 1120, h: 105 },
    { id: 'Daleys', label: 'Daleys', x: 40, y: 430, w: 1120, h: 105 }
];

const TOOLBOX_REGIONS = [
    { id: 'intro_checkpoint', label: 'Add Intro Checkpoint', x: 40, y: 165, w: 535, h: 125 },
    { id: 'plant', label: 'Add Plant Marker', x: 605, y: 165, w: 535, h: 125 },
    { id: 'sub_checkpoint', label: 'Add Sub Checkpoint', x: 40, y: 315, w: 535, h: 125 },
    { id: 'note', label: 'Add Custom Note', x: 605, y: 315, w: 535, h: 125 },
    { id: 'back_projects', label: 'Back to Demo V1', x: 40, y: 640, w: 1120, h: 90 }
];

const BACK_REGION = { id: 'back_toolbox', label: 'Back to Hillyards Tool Box', x: 62, y: 650, w: 1076, h: 76 };

const DASHBOARD_REGIONS = [
    { id: 'add', label: 'Quick Access', x: 40, y: 225, w: 1120, h: 78 },
    { id: 'global_plants', label: 'Field Guide', x: 40, y: 320, w: 350, h: 80 },
    { id: 'map', label: 'Map', x: 425, y: 320, w: 350, h: 80 },
    { id: 'starting_points', label: 'Starting Points', x: 810, y: 320, w: 350, h: 80 }
];

const SMALL_TOOLBOX_REGIONS = [
    { id: 'intro_checkpoint', label: 'Add Intro Checkpoint', x: 45, y: 135, w: 1110, h: 105 },
    { id: 'plant', label: 'Add Plant Marker', x: 45, y: 255, w: 1110, h: 105 },
    { id: 'sub_checkpoint', label: 'Add Sub Checkpoint', x: 45, y: 375, w: 1110, h: 105 },
    { id: 'note', label: 'Add Custom Note', x: 45, y: 495, w: 1110, h: 105 },
    { id: 'edit_latest', label: 'Edit Latest Entry', x: 45, y: 615, w: 1110, h: 105 }
];

let latestEntryRegions = [];

function message(text) {
    const overlayStatus = document.getElementById('arOverlayStatus');
    const pageStatus = document.getElementById('arStatus');
    if (overlayStatus) overlayStatus.textContent = text;
    if (pageStatus) pageStatus.textContent = text;
}

function resetArDiagnostics() {
    arDiagnosticLines = [];
    const diagnostics = document.getElementById('arLaunchDiagnostics');
    if (!diagnostics) return;
    diagnostics.replaceChildren();
    diagnostics.hidden = false;
}

function reportArDiagnostic(stage, error = null) {
    const detail = error ? `${error.name || 'Error'}: ${error.message || String(error)}` : stage;
    arDiagnosticLines.push(error ? `${stage}: ${detail}` : stage);
    const diagnostics = document.getElementById('arLaunchDiagnostics');
    if (diagnostics) {
        diagnostics.hidden = false;
        diagnostics.replaceChildren(...arDiagnosticLines.map(line => {
            const item = document.createElement('div');
            item.textContent = line;
            return item;
        }));
    }
    const overlayStatus = document.getElementById('arOverlayStatus');
    if (overlayStatus) overlayStatus.textContent = error ? `${stage}: ${detail}` : stage;
}

function multiplyMat4(left, right) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column += 1) {
        for (let row = 0; row < 4; row += 1) {
            result[column * 4 + row] = left[row] * right[column * 4] + left[4 + row] * right[column * 4 + 1] + left[8 + row] * right[column * 4 + 2] + left[12 + row] * right[column * 4 + 3];
        }
    }
    return result;
}

function createProgram(vertexSource, fragmentSource) {
    const compileShader = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'WebGL shader compilation failed.');
        return shader;
    };
    const nextProgram = gl.createProgram();
    gl.attachShader(nextProgram, compileShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(nextProgram, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(nextProgram);
    if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(nextProgram) || 'WebGL program linking failed.');
    return nextProgram;
}

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    let line = '';
    let lineNumber = 0;
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width > maxWidth && line) {
            context.fillText(line, x, y + lineNumber * lineHeight);
            lineNumber += 1;
            line = word;
            if (lineNumber >= maxLines) return;
        } else {
            line = candidate;
        }
    }
    if (line && lineNumber < maxLines) context.fillText(line, x, y + lineNumber * lineHeight);
}

// ---- Main panel (menu / plant profile / note) rendering ----

function drawPanelBackground(title) {
    const context = panelContext;
    context.clearRect(0, 0, CANVAS_W, CANVAS_H);
    context.fillStyle = 'rgba(16, 30, 22, 0.68)';
    context.fillRect(0, 0, CANVAS_W, CANVAS_H);
    context.fillStyle = 'rgba(23, 61, 40, 0.82)';
    context.fillRect(0, 0, CANVAS_W, 130);
    context.fillStyle = '#ffffff';
    context.font = '700 56px sans-serif';
    context.fillText(title, 62, 84);
}

function drawMenuButton(region, title, subtitle) {
    const context = panelContext;
    context.fillStyle = 'rgba(220, 235, 220, 0.9)';
    context.fillRect(region.x, region.y, region.w, region.h);
    context.strokeStyle = 'rgba(23, 61, 40, 0.35)';
    context.lineWidth = 2;
    context.strokeRect(region.x, region.y, region.w, region.h);
    context.fillStyle = '#173126';
    context.font = '700 34px sans-serif';
    wrapText(context, title, region.x + 24, region.y + 48, region.w - 48, 40, 2);
    if (subtitle) {
        context.font = '24px sans-serif';
        context.fillStyle = 'rgba(23, 61, 40, 0.72)';
        context.fillText(subtitle, region.x + 24, region.y + region.h - 20);
    }
}

function drawHillyardsDashboard() {
    panelView = 'dashboard';
    const publicCount = persistedMarkers.filter(marker => marker.visibility === 'public').length;
    const draftCount = persistedMarkers.filter(marker => marker.visibility !== 'public' && marker.visibility !== 'hidden').length;
    const startingPoint = persistedMarkers.find(marker => marker.type === 'intro_checkpoint');
    activeLocationStatus.entries = `${publicCount} published · ${draftCount} drafts`;
    if (startingPoint) activeLocationStatus.startingPoint = startingPoint.name;
    drawPanelBackground(`${activeLocationName} Dashboard`);
    panelContext.fillStyle = 'rgba(248, 250, 244, 0.9)';
    panelContext.fillRect(40, 145, 1120, 62);
    panelContext.fillStyle = '#173126';
    panelContext.font = '700 23px sans-serif';
    panelContext.fillText(activeLocationStatus.label, 60, 183);
    panelContext.font = '21px sans-serif';
    panelContext.fillText(`Starting Point: ${activeLocationStatus.startingPoint}`, 330, 183);
    panelContext.fillText(`Accuracy: ${activeLocationStatus.accuracy}`, 715, 183);
    panelContext.fillText(activeLocationStatus.entries, 930, 183);
    drawMenuButton(DASHBOARD_REGIONS[0], 'Quick Access');
    drawMenuButton(DASHBOARD_REGIONS[1], 'Field Guide');
    drawMenuButton(DASHBOARD_REGIONS[2], 'Map');
    drawMenuButton(DASHBOARD_REGIONS[3], 'Starting Points');

    panelContext.fillStyle = '#ffffff';
    panelContext.font = '700 27px sans-serif';
    panelContext.fillText('LATEST ENTRIES', 45, 438);
    latestEntryRegions = persistedMarkers.slice(0, 4).map((marker, index) => ({
        id: `entry:${marker.id}`,
        label: marker.name,
        x: 40,
        y: 454 + index * 72,
        w: 1120,
        h: 62,
        marker
    }));
    if (latestEntryRegions.length) {
        latestEntryRegions.forEach(region => {
            panelContext.fillStyle = 'rgba(220, 235, 220, 0.92)';
            panelContext.fillRect(region.x, region.y, region.w, region.h);
            panelContext.fillStyle = '#173126';
            panelContext.font = '700 26px sans-serif';
            panelContext.fillText(region.marker.name, region.x + 22, region.y + 27);
            panelContext.font = '21px sans-serif';
            panelContext.fillText(`${typeConfig(region.marker.type).typeLabel} · ${region.marker.visibility || region.marker.status || 'draft'}`, region.x + 22, region.y + 52);
        });
    } else {
        panelContext.fillStyle = 'rgba(255,255,255,.82)';
        panelContext.font = '28px sans-serif';
        panelContext.fillText('No entries yet. Add something to this location.', 45, 500);
    }
    uploadTexture(texture, panelCanvas);
}

function drawSmallToolbox() {
    const context = toolboxContext;
    context.clearRect(0, 0, CANVAS_W, CANVAS_H);
    context.fillStyle = 'rgba(16, 30, 22, 0.68)';
    context.fillRect(0, 0, CANVAS_W, CANVAS_H);
    context.fillStyle = 'rgba(23, 61, 40, 0.86)';
    context.fillRect(0, 0, CANVAS_W, 120);
    context.fillStyle = '#ffffff';
    context.font = '700 54px sans-serif';
    context.fillText('Tool Box', 45, 78);
    for (const region of SMALL_TOOLBOX_REGIONS) {
        context.fillStyle = 'rgba(220, 235, 220, 0.92)';
        context.fillRect(region.x, region.y, region.w, region.h);
        context.fillStyle = '#173126';
        context.font = '700 38px sans-serif';
        context.fillText(region.label, region.x + 28, region.y + 66);
    }
    uploadTexture(toolboxTexture, toolboxCanvas);
}

function uploadTexture(tex, sourceCanvas) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function drawProjectMenu() {
    panelView = 'projects';
    drawPanelBackground('Demo V1');
    const context = panelContext;
    context.fillStyle = 'rgba(255,255,255,.9)';
    context.font = '32px sans-serif';
    context.fillText('Select Location', 62, 150);

    for (const region of PROJECT_REGIONS) {
        const active = region.id === 'Hillyards';
        context.fillStyle = active ? 'rgba(220, 235, 220, 0.94)' : 'rgba(230, 232, 226, 0.82)';
        context.fillRect(region.x, region.y, region.w, region.h);
        context.strokeStyle = active ? 'rgba(23, 61, 40, 0.55)' : 'rgba(23, 61, 40, 0.22)';
        context.lineWidth = 2;
        context.strokeRect(region.x, region.y, region.w, region.h);
        context.fillStyle = active ? '#173126' : '#5f675f';
        context.font = '700 40px sans-serif';
        context.fillText(region.label, region.x + 24, region.y + 62);
        if (!active) {
            context.font = '26px sans-serif';
            context.fillText('Coming Soon', region.x + region.w - 190, region.y + 62);
        }
    }
    uploadTexture(texture, panelCanvas);
}

function drawToolbox() {
    panelView = 'toolbox';
    drawPanelBackground(activeLocationName);
    const context = panelContext;
    context.fillStyle = 'rgba(255,255,255,.9)';
    context.font = '30px sans-serif';
    context.fillText('Tool Box', 62, 145);
    drawMenuButton(TOOLBOX_REGIONS[0], 'Add Starting Point');
    drawMenuButton(TOOLBOX_REGIONS[1], 'Add Plant Marker');
    drawMenuButton(TOOLBOX_REGIONS[2], 'Add Sub Checkpoint');
    drawMenuButton(TOOLBOX_REGIONS[3], 'Add Custom Note');

    const back = TOOLBOX_REGIONS[4];
    context.fillStyle = 'rgba(242, 244, 238, 0.88)';
    context.fillRect(back.x, back.y, back.w, back.h);
    context.strokeStyle = 'rgba(23, 61, 40, 0.35)';
    context.strokeRect(back.x, back.y, back.w, back.h);
    context.fillStyle = '#173126';
    context.font = '700 30px sans-serif';
    context.fillText('Back to Location Dashboard', back.x + 24, back.y + 56);
    uploadTexture(texture, panelCanvas);
}

// Compatibility alias used by marker creation flows: return to the Hillyards Tool Box.
function drawMenu() {
    drawHillyardsDashboard();
}

function drawPlantProfile() {
    panelView = 'plant';
    drawPanelBackground('Plant Profile');
    const context = panelContext;
    context.fillStyle = 'rgba(248, 250, 244, 0.84)';
    context.fillRect(45, 180, 1110, 560);
    context.fillStyle = '#173126';
    context.font = '700 55px sans-serif';
    context.fillText(plantProfile?.common_name || 'Plant Profile', 62, 245);
    context.font = 'italic 40px sans-serif';
    context.fillText(plantProfile?.scientific_name || 'Scientific name not entered', 62, 310);
    context.font = '34px sans-serif';
    wrapText(context, plantProfile?.overview || 'A tropical fruit species in the Hillyards collection.', 62, 410, 1070, 50, 5);
    context.fillStyle = 'rgba(220, 235, 220, 0.84)';
    context.fillRect(BACK_REGION.x, BACK_REGION.y, BACK_REGION.w, BACK_REGION.h);
    context.fillStyle = '#173126';
    context.font = '700 28px sans-serif';
    context.fillText('Back to Hillyards Menu', BACK_REGION.x + 30, BACK_REGION.y + 50);
    uploadTexture(texture, panelCanvas);
}

function drawWelcomeNote() {
    panelView = 'note';
    drawPanelBackground('Spatial Text Marker');
    const context = panelContext;
    context.fillStyle = 'rgba(248, 250, 244, 0.84)';
    context.fillRect(45, 180, 1110, 560);
    context.fillStyle = '#173126';
    context.font = '700 66px sans-serif';
    wrapText(context, 'Welcome to Hillyards XR', 62, 290, 1070, 80, 3);
    context.fillStyle = 'rgba(220, 235, 220, 0.84)';
    context.fillRect(BACK_REGION.x, BACK_REGION.y, BACK_REGION.w, BACK_REGION.h);
    context.fillStyle = '#173126';
    context.font = '700 28px sans-serif';
    context.fillText('Back to Hillyards Menu', BACK_REGION.x + 30, BACK_REGION.y + 50);
    uploadTexture(texture, panelCanvas);
}

// ---- Flag / pin rendering for freshly placed (mock) markers ----

function drawPinCanvas(context, label, placeholder, type = 'note') {
    context.clearRect(0, 0, 480, 220);
    const colour = markerColour(type, placeholder);
    context.fillStyle = 'rgba(16,30,22,.78)';
    context.beginPath();
    context.roundRect(35, 54, 410, 108, 24);
    context.fill();
    context.fillStyle = colour;
    context.beginPath();
    context.arc(82, 108, 25, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = '700 25px sans-serif';
    context.textAlign = 'center';
    context.fillText(type === 'plant' ? '✿' : '•', 82, 117);
    context.font = placeholder ? 'italic 27px sans-serif' : '700 28px sans-serif';
    wrapText2(context, label, 270, 116, 315, 31, 1);
    context.fillStyle = 'rgba(16,30,22,.78)';
    context.beginPath();
    context.moveTo(222, 162); context.lineTo(258, 162); context.lineTo(240, 205); context.closePath(); context.fill();
    context.textAlign = 'left';
}

function wrapText2(context, text, cx, y, maxWidth, lineHeight, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    let line = '';
    const lines = [];
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width > maxWidth && line) {
            lines.push(line);
            line = word;
            if (lines.length >= maxLines) break;
        } else line = candidate;
    }
    if (line && lines.length < maxLines) lines.push(line);
    lines.forEach((value, index) => context.fillText(value, cx, y + index * lineHeight));
}

function makeFlagTexture(label, type) {
    drawPinCanvas(flagContext, label, false, type);
    const tex = gl.createTexture();
    uploadTexture(tex, flagCanvas);
    return tex;
}

function translationMatrix(x, y, z) {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}

function initializeReconstructedMarkers(viewerPose) {
    if (spatialMarkersInitialized) return;
    spatialMarkersInitialized = true;
    const base = viewerPose.transform.position;
    const viewerMatrix = viewerPose.transform.matrix;
    reconstructedMarkers = spatialMarkers.filter(item => Number(item.placement?.distance) <= 150).sort((a, b) => a.placement.distance - b.placement.distance).slice(0, 24).map(item => {
        const placement = item.placement;
        const distance = Math.round(Number(placement.distance));
        const uncertainty = Math.round(Number(placement.uncertainty));
        const label = `${item.marker.name} · ${distance} m`;
        reportArDiagnostic(`reconstructed ${item.marker.name}: ${distance} m at ${Math.round(placement.bearing)}°, uncertainty ±${uncertainty} m`);
        const worldX = base.x + viewerMatrix[0] * placement.x + viewerMatrix[8] * placement.z;
        const worldZ = base.z + viewerMatrix[2] * placement.x + viewerMatrix[10] * placement.z;
        return {
            id: item.marker.id,
            marker: item.marker,
            source: item,
            position: { x: worldX, y: base.y - 0.25, z: worldZ },
            matrix: translationMatrix(worldX, base.y - 0.25, worldZ),
            texture: makeFlagTexture(label, item.marker.type)
        };
    });
}

function reconstructedMarkerAt(rayMatrix) {
    if (!rayMatrix) return null;
    const origin = { x: rayMatrix[12], y: rayMatrix[13], z: rayMatrix[14] };
    const direction = { x: -rayMatrix[8], y: -rayMatrix[9], z: -rayMatrix[10] };
    return reconstructedMarkers.map(marker => {
        const dx = marker.position.x - origin.x, dy = marker.position.y - origin.y, dz = marker.position.z - origin.z;
        const along = dx * direction.x + dy * direction.y + dz * direction.z;
        const perpendicular = Math.hypot(dx - direction.x * along, dy - direction.y * along, dz - direction.z * along);
        return { marker, along, perpendicular };
    }).filter(hit => hit.along > 0 && hit.perpendicular < Math.max(.45, hit.along * .035)).sort((a, b) => a.along - b.along)[0]?.marker || null;
}

function showSpatialMarkerActions(item) {
    const marker = item.marker;
    mode = 'spatial-marker';
    modalCard.innerHTML = `<h2>${marker.name}</h2><p class="ar-modal-hint">${typeConfig(marker.type).typeLabel}</p><p>${marker.description || 'No description yet.'}</p><div class="ar-modal-actions ar-modal-actions-stack"><button type="button" class="primary" id="arSpatialView">${spatialCreator ? 'View' : 'Explore Plant'}</button>${spatialCreator ? '<button type="button" id="arSpatialEdit">Edit</button><button type="button" id="arSpatialPosition">Update Position</button>' : ''}<button type="button" id="arSpatialClose">Close</button></div><p id="arSpatialError" class="ar-modal-error"></p>`;
    showModal();
    const open = () => { exitAr(); window.renderExplorerMarker(item.source.project || {}, item.source.site, item.source.place, marker); };
    document.getElementById('arSpatialView').addEventListener('click', open);
    document.getElementById('arSpatialEdit')?.addEventListener('click', () => { exitAr(); window.renderFieldGuide(encodeURIComponent(activePersistenceContext.projectId), true).then(() => window.openFieldGuidePlant(encodeURIComponent(marker.plantInstanceId))); });
    document.getElementById('arSpatialPosition')?.addEventListener('click', () => navigator.geolocation.getCurrentPosition(async position => {
        try {
            await saveMarkerAnchor(activePersistenceContext.projectId, item.source.site.id, item.source.place.id, marker.id, { type: 'gps', latitude: position.coords.latitude, longitude: position.coords.longitude, altitude: position.coords.altitude ?? '', accuracy: position.coords.accuracy, captured_at: new Date(position.timestamp).toISOString() });
            document.getElementById('arSpatialError').textContent = 'Position updated.';
        } catch (error) { document.getElementById('arSpatialError').textContent = error.message; }
    }, error => { document.getElementById('arSpatialError').textContent = error.code === 1 ? 'Location permission was denied.' : 'Position is unavailable.'; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }));
    document.getElementById('arSpatialClose').addEventListener('click', () => { hideModal(); mode = 'menu-placed'; });
}

function updateReconstructedBillboards(viewerPose) {
    const viewerMatrix = viewerPose.transform.matrix;
    for (const marker of reconstructedMarkers) {
        const matrix = new Float32Array(viewerMatrix);
        matrix[12] = marker.position.x;
        matrix[13] = marker.position.y;
        matrix[14] = marker.position.z;
        marker.matrix = matrix;
    }
}

function refreshPendingPinTexture() {
    drawPinCanvas(flagContext, typeConfig(pendingType).typeLabel, true, pendingType);
    uploadTexture(pendingPinTexture, flagCanvas);
}

// ---- GL setup ----

function createQuadBuffer(width, height) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -halfWidth, -halfHeight, 0, 0, 0, halfWidth, -halfHeight, 0, 1, 0, halfWidth, halfHeight, 0, 1, 1,
        -halfWidth, -halfHeight, 0, 0, 0, halfWidth, halfHeight, 0, 1, 1, -halfWidth, halfHeight, 0, 0, 1
    ]), gl.STATIC_DRAW);
    return buf;
}

function setupGl(nextCanvas, profile) {
    canvas = nextCanvas;
    plantProfile = profile;
    gl = canvas.getContext('webgl', { alpha: true, antialias: true, xrCompatible: true });
    if (!gl) throw new Error('WebGL is unavailable.');
    program = createProgram(`
        attribute vec3 position;
        attribute vec2 texCoord;
        uniform mat4 modelViewProjection;
        varying vec2 uv;
        void main() { gl_Position = modelViewProjection * vec4(position, 1.0); uv = texCoord; }
    `, `
        precision mediump float;
        varying vec2 uv;
        uniform sampler2D panelTexture;
        void main() { gl_FragColor = texture2D(panelTexture, uv); }
    `);
    gl.useProgram(program);
    positionLocation = gl.getAttribLocation(program, 'position');
    texCoordLocation = gl.getAttribLocation(program, 'texCoord');
    mvpLocation = gl.getUniformLocation(program, 'modelViewProjection');
    textureUniformLocation = gl.getUniformLocation(program, 'panelTexture');

    panelBuffer = createQuadBuffer(PANEL_WIDTH, PANEL_HEIGHT);
    toolboxBuffer = createQuadBuffer(TOOLBOX_WIDTH, TOOLBOX_HEIGHT);
    flagBuffer = createQuadBuffer(FLAG_WIDTH, FLAG_HEIGHT);

    texture = gl.createTexture();
    toolboxTexture = gl.createTexture();
    panelCanvas = document.createElement('canvas');
    panelCanvas.width = CANVAS_W;
    panelCanvas.height = CANVAS_H;
    panelContext = panelCanvas.getContext('2d');

    toolboxCanvas = document.createElement('canvas');
    toolboxCanvas.width = CANVAS_W;
    toolboxCanvas.height = CANVAS_H;
    toolboxContext = toolboxCanvas.getContext('2d');

    flagCanvas = document.createElement('canvas');
    flagCanvas.width = 480;
    flagCanvas.height = 220;
    flagContext = flagCanvas.getContext('2d');
    pendingPinTexture = gl.createTexture();

    drawHillyardsDashboard();
    drawSmallToolbox();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
}

function makePlacement(hitTransform, viewerPosition, heightOffset) {
    const hitX = hitTransform[12];
    const hitY = hitTransform[13];
    const hitZ = hitTransform[14];
    let towardViewerX = viewerPosition.x - hitX;
    let towardViewerZ = viewerPosition.z - hitZ;
    const length = Math.hypot(towardViewerX, towardViewerZ) || 1;
    towardViewerX /= length;
    towardViewerZ /= length;
    const centreX = hitX + towardViewerX * 0.08;
    const centreZ = hitZ + towardViewerZ * 0.08;
    return new Float32Array([
        towardViewerZ, 0, -towardViewerX, 0,
        0, 1, 0, 0,
        towardViewerX, 0, towardViewerZ, 0,
        centreX, hitY + heightOffset, centreZ, 1
    ]);
}

function offsetPlacement(matrix, localX, localY) {
    const shifted = new Float32Array(matrix);
    shifted[12] += matrix[0] * localX;
    shifted[13] += localY;
    shifted[14] += matrix[2] * localX;
    return shifted;
}

// ---- Overlay (DOM) ----

function createArOverlay() {
    document.body.classList.add('ar-session-active');
    overlay = document.createElement('div');
    overlay.id = 'arOverlayControls';
    overlay.innerHTML = `<div class="ar-overlay-copy"><div id="arOverlayStatus">Move slowly to detect a surface.</div></div><div class="ar-overlay-buttons"><button type="button" id="arResetButton">Reset</button></div>`;
    overlay.addEventListener('beforexrselect', event => event.preventDefault());
    document.body.append(overlay);
    document.getElementById('globalArToggle')?.addEventListener('beforexrselect', event => event.preventDefault());
    document.getElementById('arResetButton').addEventListener('click', resetArPlacement);

    const radialToolbox = document.createElement('div');
    radialToolbox.id = 'arRadialToolbox';
    radialToolbox.className = 'hidden';
    radialToolbox.setAttribute('aria-label', 'Marker Tool Box');
    radialToolbox.innerHTML = `
        <div class="ar-radial-title">TOOL BOX</div>
        <button type="button" data-tool="intro_checkpoint" aria-label="Add starting point marker">START</button>
        <button type="button" data-tool="plant" aria-label="Add plant marker">PLANT</button>
        <button type="button" data-tool="note" aria-label="Add custom note">NOTE</button>
        <button type="button" data-tool="edit_latest" aria-label="Edit latest entry">EDIT</button>
        <span class="ar-radial-centre" aria-hidden="true"></span>`;
    radialToolbox.addEventListener('beforexrselect', event => event.preventDefault());
    radialToolbox.addEventListener('click', event => {
        const tool = event.target.closest('button')?.dataset.tool;
        if (tool) handleCreateSelection(tool);
    });
    document.body.append(radialToolbox);

    modal = document.createElement('div');
    modal.id = 'arModal';
    modal.className = 'ar-modal hidden';
    modalCard = document.createElement('div');
    modalCard.id = 'arModalCard';
    modalCard.className = 'ar-modal-card';
    modal.append(modalCard);
    modal.addEventListener('beforexrselect', event => event.preventDefault());
    document.body.append(modal);

    placementReticle = document.createElement('div');
    placementReticle.id = 'arPlacementReticle';
    document.body.append(placementReticle);
    reticleLabel = document.createElement('div');
    reticleLabel.id = 'arReticleLabel';
    document.body.append(reticleLabel);
}

function removeArOverlay() {
    document.body.classList.remove('ar-session-active');
    overlay?.remove();
    modal?.remove();
    placementReticle?.remove();
    reticleLabel?.remove();
    document.getElementById('arRadialToolbox')?.remove();
    document.getElementById('arDashboardRail')?.remove();
    overlay = null;
    modal = null;
    modalCard = null;
    placementReticle = null;
    reticleLabel = null;
}

function showModal() { modal?.classList.remove('hidden'); }
function hideModal() { modal?.classList.add('hidden'); if (modalCard) modalCard.innerHTML = ''; }

function showParentPrompt() {
    mode = 'parent-prompt';
    modalCard.innerHTML = `
        <h2>Parent Checkpoint</h2>
        <p class="ar-modal-hint">Which checkpoint does this sub checkpoint belong to?</p>
        <input id="arParentInput" type="text" placeholder="Parent Checkpoint" autocomplete="off" />
        <p id="arParentError" class="ar-modal-error"></p>
        <div class="ar-modal-actions">
            <button type="button" id="arParentCancel">Cancel</button>
            <button type="button" class="primary" id="arParentContinue">Continue</button>
        </div>`;
    showModal();
    document.getElementById('arParentContinue').addEventListener('click', () => {
        const value = document.getElementById('arParentInput').value.trim();
        if (!value) { document.getElementById('arParentError').textContent = 'Parent Checkpoint is required.'; return; }
        pendingParentName = value;
        beginPlacement('sub_checkpoint');
    });
    document.getElementById('arParentCancel').addEventListener('click', cancelToMenu);
    document.getElementById('arParentInput')?.focus();
}

function showNamePrompt(type) {
    mode = 'naming-marker';
    const config = typeConfig(type);
    modalCard.innerHTML = `
        <h2>${config.nameLabel}</h2>
        <p class="ar-modal-hint">Enter marker name</p>
        <input id="arMarkerNameInput" type="text" placeholder="${config.nameLabel}" autocomplete="off" />
        <p id="arMarkerNameError" class="ar-modal-error"></p>
        <div class="ar-modal-actions">
            <button type="button" id="arNameCancel">Cancel</button>
            <button type="button" class="primary" id="arNameConfirm">Confirm</button>
        </div>`;
    showModal();
    message('Enter marker name.');
    document.getElementById('arNameConfirm').addEventListener('click', confirmMarkerName);
    document.getElementById('arNameCancel').addEventListener('click', cancelMarkerCreation);
    document.getElementById('arMarkerNameInput')?.focus();
}

function showConfirmedPanel(marker) {
    mode = 'marker-confirmed';
    const config = typeConfig(marker.type);
    modalCard.innerHTML = `
        <h2>${marker.name}</h2>
        <p class="ar-modal-hint">${config.typeLabel} &middot; Marker placed</p>
        <div class="ar-modal-actions ar-modal-actions-stack">
            <button type="button" class="primary" id="arAddInfoButton">${config.addLabel}</button>
            <button type="button" id="arDoneButton">Done</button>
        </div>`;
    showModal();
    message('Marker placed.');
    document.getElementById('arAddInfoButton').addEventListener('click', () => showAddInformation(marker));
    document.getElementById('arDoneButton').addEventListener('click', finishMarkerFlow);
}

function showAddInformation(marker) {
    mode = 'add-information';
    const fields = ADD_INFO_FIELDS[marker.type] || ADD_INFO_FIELDS.note;
    modalCard.innerHTML = `
        <h2>${marker.name}</h2>
        <p class="ar-modal-hint">What can be added later. Nothing here is required now.</p>
        <div class="ar-modal-field-list">${fields.map(field => `<div class="ar-modal-field-row"><span>${field}</span><span class="ar-modal-field-tag">Optional</span></div>`).join('')}</div>
        <div class="ar-modal-actions">
            <button type="button" id="arAddInfoBack">Back</button>
        </div>`;
    showModal();
    document.getElementById('arAddInfoBack').addEventListener('click', () => showConfirmedPanel(marker));
}

function cancelToMenu() {
    pendingType = null;
    pendingParentName = '';
    mode = 'menu-placed';
    menuVisible = true;
    drawHillyardsDashboard();
    hideModal();
    message('Select an option.');
}

function beginPlacement(type) {
    pendingType = type;
    menuVisible = true;
    mode = 'scanning-marker';
    surfaceAvailable = false;
    latestHitTransform = null;
    pendingMarkerMatrix = null;
    placementReticle?.classList.remove('surface-found');
    hideModal();
    message('Move to the desired location. Press and hold the green dot to place the marker.');
}

function handleCreateSelection(type) {
    if (type === 'edit_latest') { showEditLatestEntry(); return; }
    if (type === 'sub_checkpoint') { showParentPrompt(); return; }
    beginPlacement(type);
}

function showEditLatestEntry() {
    const marker = persistedMarkers[0];
    if (!marker) {
        message('There are no saved entries to edit.');
        return;
    }
    mode = 'editing-marker';
    modalCard.innerHTML = `
        <h2>Edit Latest Entry</h2>
        <p class="ar-modal-hint">${typeConfig(marker.type).typeLabel}</p>
        <input id="arEditMarkerName" type="text" value="${String(marker.name).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" autocomplete="off" />
        <p id="arEditMarkerError" class="ar-modal-error"></p>
        <div class="ar-modal-actions">
            <button type="button" id="arEditCancel">Cancel</button>
            <button type="button" class="primary" id="arEditSave">Save</button>
        </div>`;
    showModal();
    document.getElementById('arEditCancel').addEventListener('click', finishMarkerFlow);
    document.getElementById('arEditSave').addEventListener('click', async () => {
        const name = document.getElementById('arEditMarkerName').value.trim();
        if (!name) { document.getElementById('arEditMarkerError').textContent = 'Marker Name is required.'; return; }
        try {
            const updated = await updateActiveMarker(marker, { name });
            persistedMarkers = [updated, ...persistedMarkers.filter(item => item.id !== marker.id)];
            drawHillyardsDashboard();
            finishMarkerFlow();
            window.dispatchEvent(new CustomEvent('nxr:latest-entry-added', { detail: updated }));
        } catch (error) {
            document.getElementById('arEditMarkerError').textContent = `Save failed: ${error.message}`;
        }
    });
}

async function confirmMarkerName() {
    const input = document.getElementById('arMarkerNameInput');
    const error = document.getElementById('arMarkerNameError');
    const name = (input?.value || '').trim();
    if (!name) { if (error) error.textContent = 'Marker Name is required.'; return; }
    const confirm = document.getElementById('arNameConfirm');
    confirm.disabled = true;
    try { await finalizeMarker(name); }
    catch (failure) { if (error) error.textContent = `Save failed: ${failure.message}`; confirm.disabled = false; }
}

async function finalizeMarker(name) {
    tempMarkerCounter += 1;
    const marker = await createActiveMarker({ name, type: pendingType });
    const flagTexture = makeFlagTexture(name, pendingType);
    tempMarkers.push({ id: marker.id, matrix: pendingMarkerMatrix, texture: flagTexture, type: marker.type, name: marker.name });
    persistedMarkers = [marker, ...persistedMarkers.filter(item => item.id !== marker.id)];
    drawHillyardsDashboard();
    recordLatestEntry(marker);
    pendingMarkerMatrix = null;
    pendingType = null;
    pendingParentName = '';
    lastConfirmedMarker = marker;
    showConfirmedPanel(marker);
}

function cancelMarkerCreation() {
    pendingMarkerMatrix = null;
    pendingType = null;
    pendingParentName = '';
    mode = 'menu-placed';
    menuVisible = true;
    drawHillyardsDashboard();
    hideModal();
    message('Select an option.');
}

function finishMarkerFlow() {
    lastConfirmedMarker = null;
    mode = 'menu-placed';
    menuVisible = true;
    drawHillyardsDashboard();
    hideModal();
    message('Select an option.');
}

// ---- Ray / hit-region helpers ----

function rayPanelHit(matrix, panelMatrix = menuMatrix, width = PANEL_WIDTH, height = PANEL_HEIGHT) {
    if (!matrix || !panelMatrix) return null;
    const origin = [matrix[12], matrix[13], matrix[14]];
    const direction = [-matrix[8], -matrix[9], -matrix[10]];
    const centre = [panelMatrix[12], panelMatrix[13], panelMatrix[14]];
    const xAxis = [panelMatrix[0], panelMatrix[1], panelMatrix[2]];
    const normal = [panelMatrix[8], panelMatrix[9], panelMatrix[10]];
    const denominator = direction[0] * normal[0] + direction[1] * normal[1] + direction[2] * normal[2];
    if (Math.abs(denominator) < 0.0001) return null;
    const t = ((centre[0] - origin[0]) * normal[0] + (centre[1] - origin[1]) * normal[1] + (centre[2] - origin[2]) * normal[2]) / denominator;
    if (t <= 0) return null;
    const point = [origin[0] + direction[0] * t, origin[1] + direction[1] * t, origin[2] + direction[2] * t];
    const relative = [point[0] - centre[0], point[1] - centre[1], point[2] - centre[2]];
    const localX = relative[0] * xAxis[0] + relative[1] * xAxis[1] + relative[2] * xAxis[2];
    const localY = relative[1];
    if (Math.abs(localX) > width / 2 || Math.abs(localY) > height / 2) return null;
    return { x: localX, y: localY };
}

function localToCanvas(local, width = PANEL_WIDTH, height = PANEL_HEIGHT) {
    return {
        px: (local.x / width + 0.5) * CANVAS_W,
        py: (0.5 - local.y / height) * CANVAS_H
    };
}

function regionAt(local, view) {
    if (!local) return null;
    const { px, py } = localToCanvas(local);
    let regions = [];
    if (view === 'dashboard') regions = [...DASHBOARD_REGIONS, ...latestEntryRegions];
    else if (view === 'projects') regions = PROJECT_REGIONS;
    else if (view === 'toolbox') regions = TOOLBOX_REGIONS;
    else regions = [BACK_REGION];
    return regions.find(region => px >= region.x && px <= region.x + region.w && py >= region.y && py <= region.y + region.h) || null;
}

function toolboxRegionAt(local) {
    if (!local) return null;
    const { px, py } = localToCanvas(local, TOOLBOX_WIDTH, TOOLBOX_HEIGHT);
    return SMALL_TOOLBOX_REGIONS.find(region => px >= region.x && px <= region.x + region.w && py >= region.y && py <= region.y + region.h) || null;
}

function drawMarkerEntry(marker) {
    panelView = 'entry';
    drawPanelBackground(marker.name);
    panelContext.fillStyle = 'rgba(248, 250, 244, 0.88)';
    panelContext.fillRect(45, 175, 1110, 450);
    panelContext.fillStyle = '#173126';
    panelContext.font = '700 46px sans-serif';
    panelContext.fillText(typeConfig(marker.type).typeLabel, 70, 255);
    panelContext.font = '32px sans-serif';
    panelContext.fillText(`Status: ${marker.status || 'draft'}`, 70, 325);
    panelContext.fillText(`Saved to ${activeLocationName} Latest Entries`, 70, 390);
    panelContext.fillStyle = 'rgba(220, 235, 220, 0.9)';
    panelContext.fillRect(BACK_REGION.x, BACK_REGION.y, BACK_REGION.w, BACK_REGION.h);
    panelContext.fillStyle = '#173126';
    panelContext.font = '700 28px sans-serif';
    panelContext.fillText(`Back to ${activeLocationName} Dashboard`, BACK_REGION.x + 30, BACK_REGION.y + 50);
    uploadTexture(texture, panelCanvas);
}

function showProjectComingSoon(name) {
    modalCard.innerHTML = `
        <h2>${name}</h2>
        <p class="ar-modal-hint">Coming Soon. Hillyards is the active V1 Lite demonstration.</p>
        <div class="ar-modal-actions"><button type="button" id="arProjectBack">Back</button></div>`;
    showModal();
    document.getElementById('arProjectBack').addEventListener('click', () => {
        hideModal();
        message('Select a location.');
    });
}

function handleMenuSelect(rayPose) {
    const rayMatrix = rayPose?.transform.matrix;
    const local = rayMatrix ? rayPanelHit(rayMatrix) : null;
    const region = regionAt(local, panelView);
    if (!region) return;

    if (panelView === 'dashboard') {
        if (region.id === 'add') drawToolbox();
        else if (region.id.startsWith('entry:')) drawMarkerEntry(region.marker);
        else showProjectComingSoon(region.label);
        return;
    }

    if (panelView === 'projects') {
        if (region.id === 'Hillyards') {
            drawToolbox();
            message('Hillyards Food Forest Tool Box.');
        } else {
            showProjectComingSoon(region.label);
        }
        return;
    }

    if (panelView === 'toolbox') {
        if (region.id === 'back_projects') {
            drawProjectMenu();
            message('Select a location.');
            return;
        }
        handleCreateSelection(region.id);
        return;
    }

    drawHillyardsDashboard();
    message('Hillyards Dashboard.');
}

// ---- Placement handlers (shared by scanning-menu and scanning-marker) ----

function captureTrackingState(frame, viewerPose) {
    latestViewerPosition = {
        x: viewerPose.transform.position.x,
        y: viewerPose.transform.position.y,
        z: viewerPose.transform.position.z
    };
    const hit = hitSource ? frame.getHitTestResults(hitSource)[0] : null;
    const hitPose = hit?.getPose(refSpace);
    surfaceAvailable = Boolean(hitPose);
    if (hitPose) latestHitTransform = new Float32Array(hitPose.transform.matrix);
}

function placeMenu(source = 'xr') {
    if (mode !== 'scanning-menu') return false;
    if (!surfaceAvailable || !latestHitTransform || !latestViewerPosition) {
        message('No surface detected. Move slowly until the centre dot turns bright green.');
        return false;
    }
    menuMatrix = makePlacement(new Float32Array(latestHitTransform), { ...latestViewerPosition }, 0.48);
    toolboxMatrix = null;
    mode = 'menu-placed';
    menuVisible = true;
    panelView = 'dashboard';
    surfaceAvailable = false;
    drawHillyardsDashboard();
    document.getElementById('arRadialToolbox')?.classList.remove('hidden');
    ignoreNextSelectAfterFallback = source === 'pointer';
    message('Menu placed.');
    window.clearTimeout(placementMessageTimer);
    placementMessageTimer = window.setTimeout(() => { if (mode === 'menu-placed') message('Select an option.'); }, 1400);
    return true;
}

function placeMarkerFlag(source = 'xr') {
    if (mode !== 'scanning-marker') return false;
    if (!surfaceAvailable || !latestHitTransform || !latestViewerPosition) {
        message('No surface detected. Move slowly until the centre dot turns bright green.');
        return false;
    }
    pendingMarkerMatrix = makePlacement(new Float32Array(latestHitTransform), { ...latestViewerPosition }, 0.06);
    refreshPendingPinTexture();
    surfaceAvailable = false;
    ignoreNextSelectAfterFallback = source === 'pointer';
    message('Marker placed.');
    showNamePrompt(pendingType);
    return true;
}

function handlePointerFallback(event) {
    if (!session || event.target.closest?.('#arOverlayControls') || event.target.closest?.('#arModal') || event.target.closest?.('#globalArToggle')) return;
    if (mode !== 'scanning-menu' && mode !== 'scanning-marker') return;
    window.clearTimeout(pointerFallbackTimer);
    pointerFallbackTimer = window.setTimeout(() => {
        if (mode === 'scanning-menu') placeMenu('pointer');
        else if (mode === 'scanning-marker') placeMarkerFlag('pointer');
    }, 450);
}

// ---- Render loop ----

function drawOne(view, matrix, tex, buf) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 20, 12);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(textureUniformLocation, 0);
    const modelViewMatrix = multiplyMat4(view.transform.inverse.matrix, matrix);
    const mvp = multiplyMat4(view.projectionMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(mvpLocation, false, mvp);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function updateReticleAndStatus(frame, viewerPose) {
    if (mode === 'scanning-menu' || mode === 'scanning-marker') {
        captureTrackingState(frame, viewerPose);
        placementReticle?.classList.toggle('surface-found', surfaceAvailable);
        if (reticleLabel) reticleLabel.textContent = '';
        if (mode === 'scanning-menu') message(surfaceAvailable ? 'Press and hold to place menu.' : 'Move slowly to detect a surface.');
        return;
    }
    if (mode === 'menu-placed') {
        const local = rayPanelHit(viewerPose.transform.matrix);
        const region = regionAt(local, panelView);
        placementReticle?.classList.toggle('surface-found', Boolean(region));
        if (reticleLabel) reticleLabel.textContent = region ? region.label : '';
        return;
    }
    placementReticle?.classList.remove('surface-found');
    if (reticleLabel) reticleLabel.textContent = '';
}

function draw(_time, frame) {
    const activeSession = frame.session;
    activeSession.requestAnimationFrame(draw);
    const viewerPose = frame.getViewerPose(refSpace);
    if (!viewerPose) return;
    initializeReconstructedMarkers(viewerPose);
    updateReconstructedBillboards(viewerPose);
    updateReticleAndStatus(frame, viewerPose);
    gl.bindFramebuffer(gl.FRAMEBUFFER, activeSession.renderState.baseLayer.framebuffer);
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    for (const view of viewerPose.views) {
        const viewport = activeSession.renderState.baseLayer.getViewport(view);
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
        if (menuVisible && menuMatrix) drawOne(view, menuMatrix, texture, panelBuffer);
        if (pendingMarkerMatrix) drawOne(view, pendingMarkerMatrix, pendingPinTexture, flagBuffer);
        for (const marker of reconstructedMarkers) drawOne(view, marker.matrix, marker.texture, flagBuffer);
        for (const marker of tempMarkers) drawOne(view, marker.matrix, marker.texture, flagBuffer);
    }
}

// ---- Session lifecycle ----

export async function startArNote(_marker, profile, locationContext = null) {
    activeLocationName = locationContext?.locationName || 'Hillyards Food Forest';
    activeLocationStatus = locationContext?.status || { startingPoint: 'Not configured', accuracy: 'Not available', entries: '0 published · 0 drafts', label: 'Setup incomplete' };
    suppliedLocationMarkers = Array.isArray(locationContext?.markers) ? locationContext.markers : null;
    spatialMarkers = Array.isArray(locationContext?.spatialMarkers) ? locationContext.spatialMarkers : [];
    spatialCreator = Boolean(locationContext?.creator);
    reconstructedMarkers = [];
    spatialMarkersInitialized = false;
    activePersistenceContext = locationContext?.projectId ? {
        projectId: locationContext.projectId,
        siteId: locationContext.siteId || '',
        placeId: locationContext.placeId || ''
    } : null;
    resetArDiagnostics();
    reportArDiagnostic('START AR clicked');
    reportArDiagnostic(`secure context status: ${window.isSecureContext ? 'secure' : 'not secure'}`);
    if (!window.isSecureContext) {
        reportArDiagnostic('AR unavailable: use HTTPS or localhost. You can continue without AR.');
        message('AR is unavailable because this page is not in a secure context. You can continue without AR.');
        return;
    }
    reportArDiagnostic(`navigator.xr availability: ${navigator.xr ? 'available' : 'unavailable'}`);
    if (!navigator.xr) {
        reportArDiagnostic('AR unavailable: this browser does not expose WebXR. You can continue without AR.');
        message('AR is unavailable on this device or browser. You can continue without AR.');
        return;
    }
    let supported;
    try {
        supported = await navigator.xr.isSessionSupported('immersive-ar');
    } catch (error) {
        reportArDiagnostic('immersive-ar support check failed', error);
        message(`AR support could not be checked: ${error.name || 'Error'}: ${error.message}`);
        return;
    }
    reportArDiagnostic(`immersive-ar support: ${supported ? 'supported' : 'not supported'}`);
    if (!supported) {
        reportArDiagnostic('AR unavailable: immersive WebXR is not supported on this device or browser. You can continue without AR.');
        message('AR is unavailable on this device or browser. You can continue without AR.');
        return;
    }
    try {
        persistedMarkers = suppliedLocationMarkers || await loadDemoMarkers(document.body.dataset.experienceRole === 'visitor');
        reportArDiagnostic(`marker preload result: loaded ${persistedMarkers.length} marker${persistedMarkers.length === 1 ? '' : 's'}`);
        reportArDiagnostic(`GPS reconstruction input: ${spatialMarkers.length} saved spatial marker${spatialMarkers.length === 1 ? '' : 's'}`);
    } catch (error) {
        persistedMarkers = [];
        reportArDiagnostic('marker preload result: failed; continuing without persisted markers', error);
    }
    reportArDiagnostic('requestSession started');
    try {
        session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'local-floor'], domOverlay: { root: document.body } });
    } catch (error) {
        reportArDiagnostic('requestSession failed', error);
        message(`AR session could not start: ${error.name || 'Error'}: ${error.message}`);
        return;
    }
    reportArDiagnostic('session created');
    try {
        updateGlobalArToggle(true);
        const nextCanvas = document.createElement('canvas');
        nextCanvas.id = 'arCanvas';
        nextCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9000;';
        document.body.append(nextCanvas);
        createArOverlay();
        setupGl(nextCanvas, profile);
        await gl.makeXRCompatible();
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl, { alpha: true, depth: true, antialias: true }), depthNear: 0.01, depthFar: 100 });
        try { refSpace = await session.requestReferenceSpace('local-floor'); } catch { refSpace = await session.requestReferenceSpace('local'); }
        const viewerSpace = await session.requestReferenceSpace('viewer');
        hitSource = await session.requestHitTestSource({ space: viewerSpace });

        mode = 'scanning-menu';
        panelView = 'dashboard';
        menuMatrix = null;
        toolboxMatrix = null;
        menuVisible = false;
        pendingType = null;
        pendingParentName = '';
        pendingMarkerMatrix = null;
        tempMarkers = [];
        ignoreNextSelectAfterFallback = false;
        latestHitTransform = null;
        latestViewerPosition = null;
        surfaceAvailable = false;

        document.addEventListener('pointerdown', handlePointerFallback, true);
        session.addEventListener('select', event => {
            window.clearTimeout(pointerFallbackTimer);
            if (ignoreNextSelectAfterFallback) { ignoreNextSelectAfterFallback = false; return; }
            if (mode === 'scanning-menu') { placeMenu('xr'); return; }
            if (mode === 'scanning-marker') { placeMarkerFlag('xr'); return; }
            if (mode === 'menu-placed') {
                window.clearTimeout(placementMessageTimer);
                const rayPose = event.frame.getPose(event.inputSource.targetRaySpace, refSpace);
                const spatial = reconstructedMarkerAt(rayPose?.transform.matrix);
                if (spatial) showSpatialMarkerActions(spatial);
                else handleMenuSelect(rayPose);
            }
        });
        session.addEventListener('end', () => {
            window.clearTimeout(pointerFallbackTimer);
            window.clearTimeout(placementMessageTimer);
            document.removeEventListener('pointerdown', handlePointerFallback, true);
            hitSource?.cancel?.();
            hitSource = null;
            latestHitTransform = null;
            latestViewerPosition = null;
            surfaceAvailable = false;
            mode = 'idle';
            panelView = 'dashboard';
            menuMatrix = null;
            toolboxMatrix = null;
            menuVisible = false;
            pendingType = null;
            pendingParentName = '';
            pendingMarkerMatrix = null;
            lastConfirmedMarker = null;
            if (gl) tempMarkers.forEach(marker => gl.deleteTexture(marker.texture));
            if (gl) reconstructedMarkers.forEach(marker => gl.deleteTexture(marker.texture));
            tempMarkers = [];
            reconstructedMarkers = [];
            spatialMarkers = [];
            spatialMarkersInitialized = false;
            ignoreNextSelectAfterFallback = false;
            document.getElementById('arCanvas')?.remove();
            removeArOverlay();
            session = null;
            updateGlobalArToggle(false);
            gl = null;
            canvas = null;
            // The normal interface remained in the DOM while AR was active.
            // Removing the AR overlay restores the exact page and unsaved form state.
        });
        message('Move slowly to detect a surface.');
        session.requestAnimationFrame(draw);
    } catch (error) {
        window.clearTimeout(pointerFallbackTimer);
        window.clearTimeout(placementMessageTimer);
        document.removeEventListener('pointerdown', handlePointerFallback, true);
        document.getElementById('arCanvas')?.remove();
        removeArOverlay();
        const failedSession = session;
        session = null;
        try { await failedSession?.end(); } catch { /* Session cleanup is best effort. */ }
        updateGlobalArToggle(false);
        reportArDiagnostic('AR session setup failed', error);
        message(`AR session setup failed: ${error.name || 'Error'}: ${error.message}`);
    }
}

export function resetArPlacement() {
    window.clearTimeout(placementMessageTimer);
    if (gl) tempMarkers.forEach(marker => gl.deleteTexture(marker.texture));
    if (gl) reconstructedMarkers.forEach(marker => gl.deleteTexture(marker.texture));
    tempMarkers = [];
    reconstructedMarkers = [];
    spatialMarkersInitialized = false;
    menuMatrix = null;
    toolboxMatrix = null;
    menuVisible = false;
    pendingType = null;
    pendingParentName = '';
    pendingMarkerMatrix = null;
    lastConfirmedMarker = null;
    latestHitTransform = null;
    latestViewerPosition = null;
    surfaceAvailable = false;
    mode = session ? 'scanning-menu' : 'idle';
    panelView = 'dashboard';
    ignoreNextSelectAfterFallback = false;
    if (gl && texture) {
        drawHillyardsDashboard();
        drawSmallToolbox();
    }
    document.getElementById('arRadialToolbox')?.classList.add('hidden');
    hideModal();
    placementReticle?.classList.remove('surface-found');
    if (reticleLabel) reticleLabel.textContent = '';
    message('Move slowly to detect a surface.');
}

export function exitAr() {
    mode = 'idle';
    panelView = 'projects';
    ignoreNextSelectAfterFallback = false;
    hideModal();
    if (session) session.end();
}
