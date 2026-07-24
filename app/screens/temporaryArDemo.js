/**
 * TRY IT NOW — a deliberately small, self-contained AR placement demo.
 * It never opens a dashboard or a draggable window before placement.
 */

let appRoot = null;
let session = null;
let canvas = null;
let gl = null;
let referenceSpace = null;
let hitTestSource = null;
let viewerMatrix = null;
let hitMatrix = null;
let marker = null;
let markerType = 'marker';
let markers = [];
let simulatedMode = false;
let program = null;
let buffer = null;
let ending = false;

function clearSessionState() {
    hitTestSource?.cancel?.();
    hitTestSource = null;
    referenceSpace = null;
    viewerMatrix = null;
    hitMatrix = null;
    marker = null;
    markerType = 'marker';
    markers.forEach(record => record.texture && gl?.deleteTexture(record.texture));
    markers = [];
    program = null;
    buffer = null;
    canvas?.remove();
    canvas = null;
    gl = null;
}

function returnToWelcome() {
    const active = session;
    ending = true;
    session = null;
    clearSessionState();
    active?.end().catch(() => {});
    window.renderLaunchScreen();
}

function setGuide(message) {
    const guide = appRoot?.querySelector('[data-tryit-guide]');
    if (guide) guide.textContent = message;
}

function clearPanel() {
    appRoot?.querySelector('[data-tryit-marker-controls]')?.setAttribute('hidden', '');
}

function selectMarkerType(type) {
    markerType = type;
    appRoot?.querySelectorAll('[data-tryit-type]').forEach(button => {
        const selected = button.dataset.tryitType === type;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
    appRoot?.querySelector('[data-tryit-apply]')?.removeAttribute('disabled');
}

function bindMarkerControls() {
    appRoot?.querySelectorAll('[data-tryit-type]').forEach(button => button.addEventListener('click', () => selectMarkerType(button.dataset.tryitType)));
    appRoot?.querySelector('[data-tryit-apply]')?.addEventListener('click', () => {
        if (!marker || markerType === 'marker') return;
        if (marker.texture) gl?.deleteTexture(marker.texture);
        marker.type = markerType;
        marker.texture = createMarkerTexture(marker);
        updateSimulatedMarkers();
        clearPanel();
        const placedCount = markers.length;
        marker = null;
        markerType = 'marker';
        if (placedCount < 3) {
            appRoot?.querySelector('[data-tryit-place]')?.removeAttribute('hidden');
            const placementLabel = appRoot?.querySelector('[data-tryit-place] strong');
            if (placementLabel) placementLabel.textContent = `Place marker ${placedCount + 1} of 3`;
            setGuide(`Marker ${placedCount} applied. Place marker ${placedCount + 1} of 3.`);
        } else {
            setGuide('Three markers placed. Move around to view their different shapes.');
        }
    });
}

function updateSimulatedMarkers() {
    const layer = appRoot?.querySelector('[data-tryit-sim-markers]');
    if (!layer || !simulatedMode) return;
    layer.innerHTML = markers.map((record, index) => `<span class="tryit-sim-marker tryit-sim-marker-${record.type}" style="--marker-index:${index}">${record.type === 'plant' ? '&#x1F331;' : record.type === 'note' ? '&#x270E; Note' : record.type === 'area' ? '&#x25C6; Area' : 'Marker'}</span>`).join('');
}

function placementPosition() {
    if (hitMatrix) return { x: hitMatrix[12], y: hitMatrix[13] + .14, z: hitMatrix[14] };
    if (!viewerMatrix) return null;
    return { x: viewerMatrix[12] - viewerMatrix[8] * 1.2, y: viewerMatrix[13] - viewerMatrix[9] * 1.2, z: viewerMatrix[14] - viewerMatrix[10] * 1.2 };
}

function placeMarker() {
    if (marker || markers.length >= 3) return;
    const position = placementPosition();
    if (!position) {
        setGuide('Move your phone briefly, then tap the circle again.');
        return;
    }
    marker = { position, type: 'marker', texture: null };
    marker.texture = createMarkerTexture(marker);
    markers.push(marker);
    appRoot?.querySelector('[data-tryit-place]')?.setAttribute('hidden', '');
    appRoot?.querySelector('[data-tryit-marker-controls]')?.removeAttribute('hidden');
    appRoot?.querySelector('[data-tryit-apply]')?.setAttribute('disabled', '');
    appRoot?.querySelectorAll('[data-tryit-type]').forEach(button => {
        button.classList.remove('is-selected');
        button.setAttribute('aria-pressed', 'false');
    });
    updateSimulatedMarkers();
    setGuide('Your marker has been placed. What type of marker is this?');
}

function renderInterface(simulated) {
    simulatedMode = simulated;
    appRoot.innerHTML = `<div class="tryit-demo ${simulated ? 'is-simulated' : 'is-immersive'}"><div class="tryit-stage"><button class="tryit-exit" type="button" data-tryit-exit>Exit AR</button><div class="tryit-marker-controls" data-tryit-marker-controls aria-label="What is this marker?" hidden><span>Your marker has been placed. What type of marker is this?</span><div class="tryit-type-grid"><button type="button" data-tryit-type="plant" aria-pressed="false">&#x1F331; Plant</button><button type="button" data-tryit-type="note" aria-pressed="false">&#x270E; Note</button><button type="button" data-tryit-type="area" aria-pressed="false">&#x25C6; Area</button></div><button class="tryit-apply" type="button" data-tryit-apply disabled>Apply</button></div><button class="tryit-place" type="button" data-tryit-place aria-label="Place marker"><span aria-hidden="true"></span><strong>Place marker 1 of 3</strong></button><p class="tryit-guide" data-tryit-guide>Aim at a place, then tap the breathing circle.</p><div data-tryit-sim-markers></div></div></div>`;
    appRoot.querySelector('[data-tryit-exit]').addEventListener('click', returnToWelcome);
    appRoot.querySelector('[data-tryit-place]').addEventListener('click', placeMarker);
    bindMarkerControls();
}

function multiply(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
        out[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
    }
    return out;
}

function billboardMatrix(position, scaleX = 1, scaleY = 1) {
    const camera = viewerMatrix || new Float32Array(16);
    let x = camera[12] - position.x;
    let z = camera[14] - position.z;
    const length = Math.hypot(x, z) || 1;
    x /= length; z /= length;
    return new Float32Array([z * scaleX, 0, -x * scaleX, 0, 0, scaleY, 0, 0, x, 0, z, 0, position.x, position.y, position.z, 1]);
}

function setupRenderer() {
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex, 'attribute vec3 p;attribute vec2 uv;uniform mat4 mvp;varying vec2 v;void main(){gl_Position=mvp*vec4(p,1.);v=uv;}');
    gl.compileShader(vertex);
    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment, 'precision mediump float;varying vec2 v;uniform sampler2D t;void main(){gl_FragColor=texture2D(t,v);}');
    gl.compileShader(fragment);
    program = gl.createProgram();
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.20,-.08,0,0,1, .20,-.08,0,1,1, .20,.08,0,1,0, -.20,-.08,0,0,1, .20,.08,0,1,0, -.20,.08,0,0,0]), gl.STATIC_DRAW);
}

function unusedLegacyMarkerTexture() {
    if (!gl) return;
    const label = document.createElement('canvas');
    label.width = 360; label.height = 112;
    const ctx = label.getContext('2d');
    const type = { plant: 'Plant', note: 'Note', poi: 'Point of interest', marker: 'Marker' }[markerType];
    ctx.fillStyle = 'rgba(17,58,32,.92)'; ctx.beginPath(); ctx.roundRect(0, 0, 360, 112, 18); ctx.fill();
    ctx.fillStyle = '#dcef95'; ctx.beginPath(); ctx.arc(36, 56, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#173522'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('•', 36, 64);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(markerName, 68, 48);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '14px sans-serif'; ctx.fillText(type, 68, 75);
    texture ||= gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function createMarkerTexture(record) {
    if (!gl) return null;
    const label = document.createElement('canvas');
    label.width = 512;
    label.height = 128;
    const ctx = label.getContext('2d');
    if (record.type === 'plant') {
        ctx.fillStyle = '#4f8d3f';
        ctx.beginPath();
        ctx.arc(256, 64, 58, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '54px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌱', 256, 84);
    } else if (record.type === 'marker') {
        ctx.fillStyle = '#365342';
        ctx.beginPath();
        ctx.arc(256, 64, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 42px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('◆', 256, 80);
    } else {
        ctx.fillStyle = record.type === 'note' ? '#d6a928' : '#357fc4';
        ctx.beginPath();
        ctx.roundRect(8, 10, 496, 108, 28);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 35px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(record.type === 'note' ? '✎  Note' : '◆  Area', 256, 77);
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

function drawMarker(view) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const p = gl.getAttribLocation(program, 'p'); const uv = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    markers.forEach(record => {
        if (!record.texture) return;
        const compact = ['plant', 'marker'].includes(record.type);
        const model = billboardMatrix(record.position, compact ? .38 : 1, compact ? .95 : 1);
        const mvp = multiply(view.projectionMatrix, multiply(view.transform.inverse.matrix, model));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mvp'), false, mvp);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, record.texture);
        gl.uniform1i(gl.getUniformLocation(program, 't'), 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
}

async function startImmersive() {
    if (!navigator.xr || !window.isSecureContext || !await navigator.xr.isSessionSupported('immersive-ar')) return false;
    try {
        session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['dom-overlay', 'hit-test'], optionalFeatures: ['local-floor'], domOverlay: { root: appRoot } });
        canvas = document.createElement('canvas'); canvas.className = 'tryit-xr-canvas'; document.body.append(canvas);
        gl = canvas.getContext('webgl', { alpha: true, antialias: true });
        if (!gl) throw new Error('WebGL unavailable');
        await gl.makeXRCompatible();
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl, { alpha: true, antialias: true }) });
        try { referenceSpace = await session.requestReferenceSpace('local-floor'); } catch { referenceSpace = await session.requestReferenceSpace('local'); }
        const viewerSpace = await session.requestReferenceSpace('viewer');
        hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
        setupRenderer();
        session.addEventListener('select', () => { if (!marker) placeMarker(); });
        session.addEventListener('end', () => { const shouldReturn = !ending; session = null; clearSessionState(); if (shouldReturn) window.renderLaunchScreen(); ending = false; });
        const draw = (_time, frame) => {
            if (!session || frame.session !== session || !gl) return;
            session.requestAnimationFrame(draw);
            const pose = frame.getViewerPose(referenceSpace);
            viewerMatrix = pose ? Float32Array.from(pose.transform.matrix) : null;
            const hit = hitTestSource && frame.getHitTestResults(hitTestSource)[0];
            const hitPose = hit?.getPose(referenceSpace);
            hitMatrix = hitPose ? Float32Array.from(hitPose.transform.matrix) : null;
            const layer = frame.session.renderState.baseLayer;
            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            for (const view of pose?.views || []) { const viewport = layer.getViewport(view); gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height); drawMarker(view); }
        };
        session.requestAnimationFrame(draw);
        return true;
    } catch {
        const active = session; session = null; clearSessionState(); active?.end().catch(() => {});
        return false;
    }
}

export function openTemporaryArDemoWindow(app) {
    return startTemporaryArDemo(app);
}

export async function startTemporaryArDemo(app) {
    appRoot = app;
    clearSessionState();
    const immersive = await startImmersive();
    renderInterface(!immersive);
    if (!immersive) viewerMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
