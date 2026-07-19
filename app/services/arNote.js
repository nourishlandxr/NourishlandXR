let session;
let gl;
let refSpace;
let hitSource;
let placedMatrix;
let latestHitTransform;
let latestViewerPosition;
let surfaceAvailable = false;
let placementState = 'idle';
let pointerFallbackTimer;
let placementMessageTimer;
let ignoreNextSelectAfterFallback = false;
let rootMenuMatrix;
let temporaryMarkerMatrix;
let mockFlow;
let mockOverlay;
let reticleLabel;
let targetedOption;
let texture;
let panelCanvas;
let panelContext;
let program;
let buffer;
let canvas;
let overlay;
let placementReticle;
let plantProfile;
let panelView = 'root';

const PANEL_WIDTH = 0.92;
const PANEL_HEIGHT = 1.06;

// ─── Compatibility stubs required by current explorer.js ───
const arDiagnosticLines = [];
function reportArDiagnostic(stage, error = null) {
    const detail = error ? `${error.name || 'Error'}: ${error.message || String(error)}` : stage;
    arDiagnosticLines.push(error ? `${stage}: ${detail}` : stage);
}
export function getArDiagnostics() { return [...arDiagnosticLines]; }
export function recordArFailure(error, stage = 'AR start failed') { reportArDiagnostic(stage, error); }
export async function copyArDiagnostics() {
    const text = getArDiagnostics().join('\n') || 'No AR diagnostics recorded.';
    await navigator.clipboard.writeText(text);
}
export function isArActive() { return Boolean(session); }
// ─── End compatibility stubs ───

// ─── On-screen diagnostic overlay (visible on phone, no USB debugging needed) ───
let diagnosticEl = null;
function dlog(msg) {
    console.log('[AR]', msg);
    const status = document.getElementById('arOverlayStatus');
    if (status) {
        const existing = status.textContent || '';
        status.textContent = msg.length > 60 ? msg.slice(0, 60) + '…' : msg;
    }
}
// ─── End diagnostic ───

const ROOT_OPTIONS = [
    { key: 'intro_checkpoint', label: 'Add Intro Checkpoint', range: [180, 350] },
    { key: 'sub_checkpoint', label: 'Add Sub Checkpoint', range: [370, 540] },
    { key: 'plant', label: 'Add Plant Marker', range: [560, 730] },
    { key: 'note', label: 'Add Custom Note', range: [750, 920] },
    { key: 'lemon_drop', label: 'Lemon Drop Garcinia', range: [970, 1150] },
    { key: 'welcome', label: 'Welcome to Hillyards XR', range: [1170, 1350] }
];

function message(text) {
    const overlayStatus = document.getElementById('arOverlayStatus');
    const pageStatus = document.getElementById('arStatus');
    if (overlayStatus) overlayStatus.textContent = text;
    if (pageStatus) pageStatus.textContent = text;
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

function drawPanelBackground(title) {
    const context = panelContext;
    context.clearRect(0, 0, 1200, 800);
    context.fillStyle = 'rgba(16, 30, 22, 0.68)';
    context.fillRect(0, 0, 1200, 1400);
    context.fillStyle = 'rgba(23, 61, 40, 0.82)';
    context.fillRect(0, 0, 1200, 150);
    context.fillStyle = '#ffffff';
    context.font = '700 60px sans-serif';
    context.fillText(title, 62, 96);
}

function uploadPanelTexture() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, panelCanvas);
}

function drawMenu() {
    panelView = 'root';
    drawPanelBackground('Hillyards XR');
    const context = panelContext;
    ROOT_OPTIONS.forEach((option, index) => {
        context.fillStyle = index < 4 ? 'rgba(220, 235, 220, 0.82)' : 'rgba(242, 220, 141, 0.82)';
        context.fillRect(45, option.range[0], 1110, option.range[1] - option.range[0]);
        context.fillStyle = '#173126';
        context.font = `700 ${index < 4 ? 45 : 48}px sans-serif`;
        context.fillText(option.label, 85, option.range[0] + 70);
        if (option.key === 'lemon_drop') { context.font = 'italic 34px sans-serif'; context.fillText('Garcinia intermedia', 85, option.range[0] + 125); }
        if (option.key === 'welcome') { context.font = '31px sans-serif'; context.fillText('Spatial Text Marker', 85, option.range[0] + 125); }
    });
    uploadPanelTexture();
}

function drawPlantProfile() {
    panelView = 'plant';
    drawPanelBackground('Plant Profile');
    const context = panelContext;
    context.fillStyle = 'rgba(248, 250, 244, 0.84)';
    context.fillRect(45, 180, 1110, 1130);
    context.fillStyle = '#173126';
    context.font = '700 55px sans-serif';
    context.fillText(plantProfile?.common_name || 'Lemon Drop Garcinia', 62, 245);
    context.font = 'italic 40px sans-serif';
    context.fillText(plantProfile?.scientific_name || 'Garcinia intermedia', 62, 310);
    context.font = '34px sans-serif';
    wrapText(context, plantProfile?.overview || 'A tropical fruit species in the Hillyards collection.', 62, 410, 1070, 50, 5);
    context.fillStyle = 'rgba(220, 235, 220, 0.84)';
    context.fillRect(62, 1190, 1076, 90);
    context.fillStyle = '#173126';
    context.font = '700 28px sans-serif';
    context.fillText('Back to Hillyards Menu', 92, 1248);
    uploadPanelTexture();
}

function drawWelcomeNote() {
    panelView = 'note';
    drawPanelBackground('Spatial Text Marker');
    const context = panelContext;
    context.fillStyle = 'rgba(248, 250, 244, 0.84)';
    context.fillRect(45, 180, 1110, 1130);
    context.fillStyle = '#173126';
    context.font = '700 66px sans-serif';
    wrapText(context, 'Welcome to Hillyards XR', 62, 290, 1070, 80, 3);
    context.fillStyle = 'rgba(220, 235, 220, 0.84)';
    context.fillRect(62, 1190, 1076, 90);
    context.fillStyle = '#173126';
    context.font = '700 28px sans-serif';
    context.fillText('Back to Hillyards Menu', 92, 1248);
    uploadPanelTexture();
}

function setPanelGeometry(width, height) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -halfWidth, -halfHeight, 0, 0, 0, halfWidth, -halfHeight, 0, 1, 0, halfWidth, halfHeight, 0, 1, 1,
        -halfWidth, -halfHeight, 0, 0, 0, halfWidth, halfHeight, 0, 1, 1, -halfWidth, halfHeight, 0, 0, 1
    ]), gl.STATIC_DRAW);
}

function drawMarkerFlag(label) {
    panelView = 'marker_flag';
    panelContext.clearRect(0, 0, 1200, 1400);
    panelContext.fillStyle = 'rgba(23, 61, 40, 0.86)';
    panelContext.fillRect(0, 0, 1200, 1400);
    panelContext.fillStyle = '#ffffff';
    panelContext.textAlign = 'center';
    panelContext.font = '700 80px sans-serif';
    wrapText(panelContext, label, 600, 620, 1050, 100, 3);
    panelContext.textAlign = 'left';
    uploadPanelTexture();
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
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    setPanelGeometry(PANEL_WIDTH, PANEL_HEIGHT);
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    panelCanvas = document.createElement('canvas');
    panelCanvas.width = 1200;
    panelCanvas.height = 1400;
    panelContext = panelCanvas.getContext('2d');
    drawMenu();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
}

function makeVerticalPlacement(hitTransform, viewerPosition) {
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
        centreX, hitY + 0.48, centreZ, 1
    ]);
}

function makeMarkerPlacement(hitTransform, viewerPosition) {
    const matrix = makeVerticalPlacement(hitTransform, viewerPosition);
    matrix[13] -= 0.3;
    return matrix;
}

function removeMockOverlay() {
    mockOverlay?.remove();
    mockOverlay = null;
}

function showMockOverlay(html) {
    removeMockOverlay();
    mockOverlay = document.createElement('div');
    mockOverlay.id = 'arMockOverlay';
    mockOverlay.innerHTML = html;
    mockOverlay.addEventListener('beforexrselect', event => event.preventDefault());
    document.body.append(mockOverlay);
}

function beginMarkerScanning() {
    removeMockOverlay();
    placedMatrix = null;
    temporaryMarkerMatrix = null;
    latestHitTransform = null;
    surfaceAvailable = false;
    placementState = 'marker-scanning';
    placementReticle?.classList.remove('placed', 'surface-found', 'item-targeted');
    message('Move to the desired location. Press and hold the green dot to place the marker.');
}

function startMockFlow(type) {
    rootMenuMatrix = new Float32Array(placedMatrix);
    mockFlow = { type, parent: '', name: '', id: '' };
    targetedOption = null;
    reticleLabel.textContent = '';
    if (type === 'sub_checkpoint') {
        placementState = 'marker-parent';
        placedMatrix = null;
        showMockOverlay(`<label for="arMockParent">Parent Checkpoint</label><input id="arMockParent" placeholder="Parent checkpoint" /><div><button id="arMockContinue">Continue</button><button id="arMockCancel">Cancel</button></div>`);
        document.getElementById('arMockContinue').onclick = () => { const value = document.getElementById('arMockParent').value.trim(); if (!value) return; mockFlow.parent = value; beginMarkerScanning(); };
        document.getElementById('arMockCancel').onclick = returnToRoot;
        message('Select a parent checkpoint.');
        return;
    }
    beginMarkerScanning();
}

function showMarkerNameForm() {
    placementState = 'marker-name';
    message('Enter marker name.');
    showMockOverlay(`<label for="arMockName">Marker Name</label><input id="arMockName" placeholder="Marker name" /><div><button id="arMockConfirm">Confirm</button><button id="arMockCancel">Cancel</button></div>`);
    document.getElementById('arMockConfirm').onclick = () => {
        const name = document.getElementById('arMockName').value.trim();
        if (!name) return;
        mockFlow.name = name;
        mockFlow.id = `mock_${Date.now().toString(36)}`;
        drawMarkerFlag(name);
        placementState = 'marker-confirmed';
        message('Marker placed.');
        showMockOverlay(`<strong>Marker placed</strong><div><button id="arMockInfo">Add Information</button><button id="arMockDone">Done</button></div>`);
        document.getElementById('arMockInfo').onclick = showMockInformation;
        document.getElementById('arMockDone').onclick = returnToRoot;
    };
    document.getElementById('arMockCancel').onclick = () => { temporaryMarkerMatrix = null; returnToRoot(); };
}

function showMockInformation() {
    const fields = {
        plant: ['Common Name', 'Scientific Name', 'Description', 'Plant Profile', 'Anchor'],
        note: ['Title', 'Text', 'Directions', 'Anchor'],
        intro_checkpoint: ['Introduction text', 'Written directions', 'Anchor'],
        sub_checkpoint: ['Text', 'Written directions', 'Anchor']
    }[mockFlow.type] || [];
    message('Optional information can be added later.');
    showMockOverlay(`<strong>Add Information</strong><p>${fields.join(' · ')}</p><div><button id="arMockInfoBack">Back</button><button id="arMockDone">Done</button></div>`);
    document.getElementById('arMockInfoBack').onclick = () => {
        showMockOverlay(`<strong>Marker placed</strong><div><button id="arMockInfo">Add Information</button><button id="arMockDone">Done</button></div>`);
        document.getElementById('arMockInfo').onclick = showMockInformation;
        document.getElementById('arMockDone').onclick = returnToRoot;
    };
    document.getElementById('arMockDone').onclick = returnToRoot;
}

function returnToRoot() {
    removeMockOverlay();
    mockFlow = null;
    temporaryMarkerMatrix = null;
    placedMatrix = rootMenuMatrix ? new Float32Array(rootMenuMatrix) : null;
    placementState = placedMatrix ? 'placed' : 'scanning';
    setPanelGeometry(PANEL_WIDTH, PANEL_HEIGHT);
    drawMenu();
    placementReticle?.classList.remove('surface-found', 'item-targeted');
    placementReticle?.classList.toggle('placed', Boolean(placedMatrix));
    reticleLabel.textContent = '';
    targetedOption = null;
    message(placedMatrix ? 'Select an option.' : 'Move slowly to detect a surface.');
}

function createArOverlay() {
    document.body.classList.add('ar-session-active');
    overlay = document.createElement('div');
    overlay.id = 'arOverlayControls';
    overlay.innerHTML = `<div class="ar-overlay-copy"><div id="arOverlayStatus">Move slowly to detect a surface.</div></div><div class="ar-overlay-buttons"><button type="button" onclick="window.resetArPlacement()">Reset</button><button type="button" onclick="window.exitAr()">Exit AR</button></div>`;
    overlay.addEventListener('beforexrselect', event => event.preventDefault());
    document.body.append(overlay);
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
    placementReticle?.remove();
    reticleLabel?.remove();
    removeMockOverlay();
    overlay = null;
    placementReticle = null;
    reticleLabel = null;
}

function rayPanelHit(rayPose) {
    if (!rayPose || !placedMatrix) return null;
    const matrix = rayPose.transform.matrix;
    const origin = [matrix[12], matrix[13], matrix[14]];
    const direction = [-matrix[8], -matrix[9], -matrix[10]];
    const centre = [placedMatrix[12], placedMatrix[13], placedMatrix[14]];
    const xAxis = [placedMatrix[0], placedMatrix[1], placedMatrix[2]];
    const normal = [placedMatrix[8], placedMatrix[9], placedMatrix[10]];
    const denominator = direction[0] * normal[0] + direction[1] * normal[1] + direction[2] * normal[2];
    if (Math.abs(denominator) < 0.0001) return null;
    const t = ((centre[0] - origin[0]) * normal[0] + (centre[1] - origin[1]) * normal[1] + (centre[2] - origin[2]) * normal[2]) / denominator;
    if (t <= 0) return null;
    const point = [origin[0] + direction[0] * t, origin[1] + direction[1] * t, origin[2] + direction[2] * t];
    const relative = [point[0] - centre[0], point[1] - centre[1], point[2] - centre[2]];
    const localX = relative[0] * xAxis[0] + relative[1] * xAxis[1] + relative[2] * xAxis[2];
    const localY = relative[1];
    if (Math.abs(localX) > PANEL_WIDTH / 2 || Math.abs(localY) > PANEL_HEIGHT / 2) return null;
    return { x: localX, y: localY };
}

function selectPanel(event) {
    const rayPose = event.frame.getPose(event.inputSource.targetRaySpace, refSpace);
    const hit = rayPanelHit(rayPose);
    if (panelView !== 'root') { if (hit) returnToRoot(); return; }
    const option = targetedOption || optionFromHit(hit);
    if (!option) return;
    if (['intro_checkpoint', 'sub_checkpoint', 'plant', 'note'].includes(option.key)) startMockFlow(option.key);
    else if (option.key === 'lemon_drop') drawPlantProfile();
    else if (option.key === 'welcome') drawWelcomeNote();
}

function optionFromHit(hit) {
    if (!hit) return null;
    const canvasY = (0.5 - hit.y / PANEL_HEIGHT) * 1400;
    return ROOT_OPTIONS.find(option => canvasY >= option.range[0] && canvasY <= option.range[1]) || null;
}

function updateMenuTarget(viewerPose) {
    if (!placedMatrix || !['root', 'plant', 'note'].includes(panelView)) { targetedOption = null; reticleLabel.textContent = ''; placementReticle?.classList.remove('item-targeted'); return; }
    const hit = rayPanelHit({ transform: viewerPose.transform });
    targetedOption = panelView === 'root' ? optionFromHit(hit) : hit ? { key: 'back', label: 'Back to Hillyards Menu' } : null;
    placementReticle?.classList.toggle('item-targeted', Boolean(targetedOption));
    reticleLabel.textContent = targetedOption?.label || '';
}

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

function placeFromLatest(source = 'xr') {
    if (!['scanning', 'marker-scanning'].includes(placementState)) return false;
    if (!surfaceAvailable || !latestHitTransform || !latestViewerPosition) {
        message('No surface detected. Move slowly until the centre dot turns bright green.');
        return false;
    }
    const placingMarker = placementState === 'marker-scanning';
    placedMatrix = placingMarker ? makeMarkerPlacement(new Float32Array(latestHitTransform), { ...latestViewerPosition }) : makeVerticalPlacement(new Float32Array(latestHitTransform), { ...latestViewerPosition });
    placementState = placingMarker ? 'marker-name' : 'placed';
    surfaceAvailable = false;
    if (placingMarker) {
        temporaryMarkerMatrix = new Float32Array(placedMatrix);
        setPanelGeometry(0.38, 0.2);
        drawMarkerFlag('New Marker');
    } else {
        rootMenuMatrix = new Float32Array(placedMatrix);
        setPanelGeometry(PANEL_WIDTH, PANEL_HEIGHT);
        drawMenu();
    }
    ignoreNextSelectAfterFallback = source === 'pointer';
    placementReticle?.classList.add('placed');
    message(placingMarker ? 'Marker placed.' : 'Menu placed.');
    window.clearTimeout(placementMessageTimer);
    placementMessageTimer = window.setTimeout(() => {
        if (placementState === 'placed') message('Select an option.');
    }, 1400);
    if (placingMarker) showMarkerNameForm();
    return true;
}

function handlePointerFallback(event) {
    if (!session || !['scanning', 'marker-scanning'].includes(placementState) || event.target.closest?.('#arOverlayControls') || event.target.closest?.('#arMockOverlay')) return;
    window.clearTimeout(pointerFallbackTimer);
    pointerFallbackTimer = window.setTimeout(() => {
        placeFromLatest('pointer');
    }, 450);
}

function draw(_time, frame) {
    const activeSession = frame.session;
    activeSession.requestAnimationFrame(draw);
    const viewerPose = frame.getViewerPose(refSpace);
    if (!viewerPose) return;
    if (['scanning', 'marker-scanning'].includes(placementState)) {
        captureTrackingState(frame, viewerPose);
        placementReticle?.classList.toggle('surface-found', surfaceAvailable);
        if (placementState === 'scanning') message(surfaceAvailable ? 'Press and hold to place menu.' : 'Move slowly to detect a surface.');
        else message(surfaceAvailable ? 'Press and hold the green dot to place the marker.' : 'Move to the desired location.');
    } else {
        updateMenuTarget(viewerPose);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, activeSession.renderState.baseLayer.framebuffer);
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!placedMatrix) return;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const positionLocation = gl.getAttribLocation(program, 'position');
    const texCoordLocation = gl.getAttribLocation(program, 'texCoord');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 20, 12);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, 'panelTexture'), 0);
    for (const view of viewerPose.views) {
        const viewport = activeSession.renderState.baseLayer.getViewport(view);
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
        const modelViewMatrix = multiplyMat4(view.transform.inverse.matrix, placedMatrix);
        const mvp = multiplyMat4(view.projectionMatrix, modelViewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'modelViewProjection'), false, mvp);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

export async function startArNote(_marker, profile) {
    dlog('CHECK 1: startArNote');
    if (!window.isSecureContext) { dlog('FAIL: not secure'); message('AR requires HTTPS or localhost.'); return; }
    if (!navigator.xr) { dlog('FAIL: no navigator.xr'); message('WebXR is unavailable.'); return; }
    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) { dlog('FAIL: immersive-ar unsupported'); message('AR not supported.'); return; }
        dlog('CHECK 2: immersive-ar OK');
        
        session = await navigator.xr.requestSession('immersive-ar', { optionalFeatures: ['hit-test', 'dom-overlay', 'local-floor'], domOverlay: { root: document.body } });
        dlog('CHECK 3: session=' + session.mode);
        
        const nextCanvas = document.createElement('canvas');
        nextCanvas.id = 'arCanvas';
        nextCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9000;';
        document.body.append(nextCanvas);
        createArOverlay();
        setupGl(nextCanvas, profile);
        
        await gl.makeXRCompatible();
        dlog('CHECK 4: makeXRCompatible');
        
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl, { alpha: true, depth: true, antialias: true }), depthNear: 0.01, depthFar: 100 });
        try { refSpace = await session.requestReferenceSpace('local-floor'); } catch { refSpace = await session.requestReferenceSpace('local'); }
        dlog('CHECK 5: refSpace OK');
        
        let fallbackTimer = null;
        
        try {
            const viewerSpace = await session.requestReferenceSpace('viewer');
            hitSource = await session.requestHitTestSource({ space: viewerSpace });
            dlog('CHECK 6a: hitSource OK');
        } catch (e) {
            dlog('WARN: hitSource failed - ' + e.message.slice(0, 40));
            hitSource = null;
        }
        
        placementState = 'scanning';
        panelView = 'root';
        ignoreNextSelectAfterFallback = false;
        rootMenuMatrix = null;
        temporaryMarkerMatrix = null;
        mockFlow = null;
        targetedOption = null;
        latestHitTransform = null;
        latestViewerPosition = null;
        surfaceAvailable = false;
        document.addEventListener('pointerdown', handlePointerFallback, true);
        
        session.addEventListener('select', event => {
            window.clearTimeout(pointerFallbackTimer);
            window.clearTimeout(fallbackTimer);
            if (placedMatrix) {
                if (ignoreNextSelectAfterFallback) { ignoreNextSelectAfterFallback = false; return; }
                window.clearTimeout(placementMessageTimer);
                selectPanel(event);
                return;
            }
            const viewerPose = event.frame.getViewerPose(refSpace);
            if (viewerPose) {
                latestViewerPosition = {
                    x: viewerPose.transform.position.x,
                    y: viewerPose.transform.position.y,
                    z: viewerPose.transform.position.z
                };
            }
            placeFromLatest('xr');
        });
        session.addEventListener('end', () => {
            window.clearTimeout(pointerFallbackTimer);
            window.clearTimeout(fallbackTimer);
            document.removeEventListener('pointerdown', handlePointerFallback, true);
            hitSource?.cancel?.();
            hitSource = null;
            latestHitTransform = null;
            latestViewerPosition = null;
            surfaceAvailable = false;
            placementState = 'idle';
            panelView = 'root';
            ignoreNextSelectAfterFallback = false;
            rootMenuMatrix = null;
            temporaryMarkerMatrix = null;
            mockFlow = null;
            targetedOption = null;
            placedMatrix = null;
            document.getElementById('arCanvas')?.remove();
            removeArOverlay();
            session = null;
            gl = null;
            canvas = null;
            window.renderLaunchScreen?.();
        });
        
        message('Move slowly to detect a surface.');
        session.requestAnimationFrame(draw);
        dlog('CHECK 7: draw loop started');
        
        // ─── 2-second fallback: auto-place if no hit test result ───
        fallbackTimer = window.setTimeout(() => {
            dlog('TIMEOUT: 2s no hit-test result');
            if (placedMatrix) { dlog('skipped: already placed'); return; }
            if (!latestViewerPosition) {
                dlog('placing at default (0,1.5,-1.5)');
                placedMatrix = new Float32Array([
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 1.5, -1.5, 1
                ]);
            } else {
                dlog('placing at viewer-relative');
                const m = latestViewerPosition;
                placedMatrix = new Float32Array([
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    m.x, m.y + 0.48, m.z - 2.0, 1
                ]);
            }
            rootMenuMatrix = new Float32Array(placedMatrix);
            placementState = 'placed';
            surfaceAvailable = false;
            setPanelGeometry(PANEL_WIDTH, PANEL_HEIGHT);
            drawMenu();
            placementReticle?.classList.add('placed');
            message('Menu placed. Select an option.');
            dlog('PLACED: x=' + placedMatrix[12].toFixed(1) + ' y=' + placedMatrix[13].toFixed(1) + ' z=' + placedMatrix[14].toFixed(1));
        }, 2000);
        dlog('CHECK 6b: fallback timer set');
        
    } catch (error) {
        dlog('FATAL: ' + (error?.message || String(error)).slice(0, 60));
        window.clearTimeout(pointerFallbackTimer);
        window.clearTimeout(placementMessageTimer);
        document.removeEventListener('pointerdown', handlePointerFallback, true);
        document.getElementById('arCanvas')?.remove();
        removeArOverlay();
        session = null;
        message(`AR error: ${error.message}`);
    }
}

export function resetArPlacement() {
    window.clearTimeout(placementMessageTimer);
    placedMatrix = null;
    latestHitTransform = null;
    latestViewerPosition = null;
    surfaceAvailable = false;
    placementState = session ? 'scanning' : 'idle';
    panelView = 'root';
    ignoreNextSelectAfterFallback = false;
    rootMenuMatrix = null;
    temporaryMarkerMatrix = null;
    mockFlow = null;
    targetedOption = null;
    removeMockOverlay();
    if (reticleLabel) reticleLabel.textContent = '';
    if (gl && buffer) setPanelGeometry(PANEL_WIDTH, PANEL_HEIGHT);
    if (gl && texture) drawMenu();
    placementReticle?.classList.remove('placed', 'surface-found', 'item-targeted');
    message('Move slowly to detect a surface.');
}

export function exitAr() { panelView = 'root'; ignoreNextSelectAfterFallback = false; rootMenuMatrix = null; temporaryMarkerMatrix = null; mockFlow = null; targetedOption = null; removeMockOverlay(); if (session) session.end(); }