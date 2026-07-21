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
let markerName = 'Marker';
let program = null;
let buffer = null;
let texture = null;
let ending = false;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function clearSessionState() {
    hitTestSource?.cancel?.();
    hitTestSource = null;
    referenceSpace = null;
    viewerMatrix = null;
    hitMatrix = null;
    marker = null;
    markerType = 'marker';
    markerName = 'Marker';
    program = null;
    buffer = null;
    texture && gl?.deleteTexture(texture);
    texture = null;
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
    appRoot?.querySelector('[data-tryit-panel]')?.replaceChildren();
}

function showTypePanel() {
    const panel = appRoot?.querySelector('[data-tryit-panel]');
    if (!panel) return;
    panel.innerHTML = `<section class="tryit-panel" aria-live="polite"><p class="welcome-label">MARKER PLACED</p><h2>What is this marker?</h2><div class="tryit-type-grid"><button type="button" data-tryit-type="plant">Plant</button><button type="button" data-tryit-type="note">Note</button><button type="button" data-tryit-type="poi">Point of Interest</button></div></section>`;
    panel.querySelectorAll('[data-tryit-type]').forEach(button => button.addEventListener('click', () => showNamePanel(button.dataset.tryitType)));
}

function showNamePanel(type) {
    markerType = type;
    const typeName = { plant: 'Plant', note: 'Note', poi: 'Point of Interest' }[type];
    const defaultName = type === 'plant' ? 'New plant' : type === 'note' ? 'New note' : 'Point of interest';
    const panel = appRoot?.querySelector('[data-tryit-panel]');
    if (!panel) return;
    panel.innerHTML = `<section class="tryit-panel"><p class="welcome-label">${typeName}</p><h2>Name this marker</h2><label class="tryit-name-field"><span>Name</span><input data-tryit-name value="${escapeHtml(defaultName)}" maxlength="60" /></label><button class="primary" type="button" data-tryit-save>Save marker</button></section>`;
    const input = panel.querySelector('[data-tryit-name]');
    panel.querySelector('[data-tryit-save]').addEventListener('click', () => {
        markerName = input.value.trim() || typeName;
        updateMarkerTexture();
        appRoot.querySelector('[data-tryit-sim-marker]')?.replaceChildren(document.createTextNode(markerName));
        clearPanel();
        setGuide(`${markerName} saved in space.`);
    });
    input.focus();
}

function placementPosition() {
    if (hitMatrix) return { x: hitMatrix[12], y: hitMatrix[13] + .14, z: hitMatrix[14] };
    if (!viewerMatrix) return null;
    return { x: viewerMatrix[12] - viewerMatrix[8] * 1.2, y: viewerMatrix[13] - viewerMatrix[9] * 1.2, z: viewerMatrix[14] - viewerMatrix[10] * 1.2 };
}

function placeMarker() {
    if (marker) return;
    const position = placementPosition();
    if (!position) {
        setGuide('Move your phone briefly, then tap the circle again.');
        return;
    }
    marker = position;
    appRoot?.querySelector('[data-tryit-place]')?.setAttribute('hidden', '');
    appRoot?.querySelector('[data-tryit-sim-marker]')?.removeAttribute('hidden');
    setGuide('Marker placed in space.');
    showTypePanel();
}

function renderInterface(simulated) {
    appRoot.innerHTML = `<div class="tryit-demo ${simulated ? 'is-simulated' : 'is-immersive'}"><div class="tryit-stage"><button class="tryit-exit" type="button" data-tryit-exit>Exit AR</button><button class="tryit-place" type="button" data-tryit-place aria-label="Place marker"><span aria-hidden="true"></span><strong>Tap to place marker</strong></button><p class="tryit-guide" data-tryit-guide>Aim at a place, then tap the breathing circle.</p><div class="tryit-sim-marker" data-tryit-sim-marker hidden>Marker</div></div><div data-tryit-panel></div></div>`;
    appRoot.querySelector('[data-tryit-exit]').addEventListener('click', returnToWelcome);
    appRoot.querySelector('[data-tryit-place]').addEventListener('click', placeMarker);
}

function multiply(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
        out[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
    }
    return out;
}

function billboardMatrix(position) {
    const camera = viewerMatrix || new Float32Array(16);
    let x = camera[12] - position.x;
    let z = camera[14] - position.z;
    const length = Math.hypot(x, z) || 1;
    x /= length; z /= length;
    return new Float32Array([z, 0, -x, 0, 0, 1, 0, 0, x, 0, z, 0, position.x, position.y, position.z, 1]);
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
    updateMarkerTexture();
}

function updateMarkerTexture() {
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
}

function drawMarker(view) {
    if (!marker || !texture) return;
    const model = billboardMatrix(marker);
    const mvp = multiply(view.projectionMatrix, multiply(view.transform.inverse.matrix, model));
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const p = gl.getAttribLocation(program, 'p'); const uv = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mvp'), false, mvp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, 't'), 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
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
