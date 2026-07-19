let session;
let gl;
let refSpace;
let canvas;
let overlay;
let program;
let buffer;
let texture;
let panelCanvas;
let panelContext;
let plantProfile;
let panelView = 'root';

const PANEL_WIDTH = 0.92;
const PANEL_HEIGHT = 1.06;

// ─── Compatibility stubs required by current explorer.js ───
const arDiagnosticLines = [];
function reportArDiagnostic(stage, error) {
    const detail = error ? `${error.name || 'Error'}: ${error.message || String(error)}` : stage;
    arDiagnosticLines.push(error ? `${stage}: ${detail}` : stage);
}
export function getArDiagnostics() { return [...arDiagnosticLines]; }
export function recordArFailure(error, stage) { reportArDiagnostic(stage, error); }
export async function copyArDiagnostics() {
    const text = getArDiagnostics().join('\n') || 'No AR diagnostics recorded.';
    await navigator.clipboard.writeText(text);
}
export function isArActive() { return Boolean(session); }
// ─── End compat stubs ───

// ─── Hard diagnostic logger ───
// Uses a standalone element outside #app with max z-index to survive CSS hiding
let diagnosticEl = null;
function dlog(msg) {
    console.log('[AR]', msg);
    // Always create/use our own diagnostic element — never rely on #arOverlayStatus
    if (!diagnosticEl) {
        diagnosticEl = document.createElement('div');
        diagnosticEl.id = 'nxrArDiag';
        // Inline styles only, no CSS class — cannot be hidden by style.css
        diagnosticEl.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;color:#0f0;font:14px/1.4 monospace;background:rgba(0,0,0,.92);padding:8px 12px;max-width:100vw;max-height:100vh;overflow-y:auto;pointer-events:none;white-space:pre-wrap;word-break:break-word;border:2px solid #0f0;display:block;visibility:visible;opacity:1;';
        document.body.append(diagnosticEl);
    }
    diagnosticEl.textContent = msg;
}
// ─── End diag ───

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

function createProgram(vs, fs) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
}

function wrapText(ctx, text, x, y, maxW, lh, maxL) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    let line = '', n = 0;
    for (const w of words) {
        const c = line ? line + ' ' + w : w;
        if (ctx.measureText(c).width > maxW && line) { ctx.fillText(line, x, y + n * lh); n++; line = w; if (n >= maxL) return; }
        else line = c;
    }
    if (line && n < maxL) ctx.fillText(line, x, y + n * lh);
}

function drawPanelBg(title) {
    const ctx = panelContext;
    ctx.clearRect(0, 0, 1200, 800);
    ctx.fillStyle = 'rgba(16,30,22,.68)';
    ctx.fillRect(0, 0, 1200, 1400);
    ctx.fillStyle = 'rgba(23,61,40,.82)';
    ctx.fillRect(0, 0, 1200, 150);
    ctx.fillStyle = '#fff';
    ctx.font = '700 60px sans-serif';
    ctx.fillText(title, 62, 96);
}

function uploadPanelTexture() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, panelCanvas);
    dlog('TEX uploaded: ' + panelCanvas.width + 'x' + panelCanvas.height);
}

function drawMenu() {
    panelView = 'root';
    drawPanelBg('Hillyards XR');
    const ctx = panelContext;
    ROOT_OPTIONS.forEach((o, i) => {
        ctx.fillStyle = i < 4 ? 'rgba(220,235,220,.82)' : 'rgba(242,220,141,.82)';
        ctx.fillRect(45, o.range[0], 1110, o.range[1] - o.range[0]);
        ctx.fillStyle = '#173126';
        ctx.font = '700 ' + (i < 4 ? 45 : 48) + 'px sans-serif';
        ctx.fillText(o.label, 85, o.range[0] + 70);
        if (o.key === 'lemon_drop') { ctx.font = 'italic 34px sans-serif'; ctx.fillText('Garcinia intermedia', 85, o.range[0] + 125); }
        if (o.key === 'welcome') { ctx.font = '31px sans-serif'; ctx.fillText('Spatial Text Marker', 85, o.range[0] + 125); }
    });
    uploadPanelTexture();
}

function drawPlantProfile() {
    panelView = 'plant';
    drawPanelBg('Plant Profile');
    const ctx = panelContext;
    ctx.fillStyle = 'rgba(248,250,244,.84)';
    ctx.fillRect(45, 180, 1110, 1130);
    ctx.fillStyle = '#173126';
    ctx.font = '700 55px sans-serif';
    ctx.fillText(plantProfile?.common_name || 'Lemon Drop Garcinia', 62, 245);
    ctx.font = 'italic 40px sans-serif';
    ctx.fillText(plantProfile?.scientific_name || 'Garcinia intermedia', 62, 310);
    ctx.font = '34px sans-serif';
    wrapText(ctx, plantProfile?.overview || 'A tropical fruit species in the Hillyards collection.', 62, 410, 1070, 50, 5);
    ctx.fillStyle = 'rgba(220,235,220,.84)';
    ctx.fillRect(62, 1190, 1076, 90);
    ctx.fillStyle = '#173126';
    ctx.font = '700 28px sans-serif';
    ctx.fillText('Back to Hillyards Menu', 92, 1248);
    uploadPanelTexture();
}

function drawWelcomeNote() {
    panelView = 'note';
    drawPanelBg('Spatial Text Marker');
    const ctx = panelContext;
    ctx.fillStyle = 'rgba(248,250,244,.84)';
    ctx.fillRect(45, 180, 1110, 1130);
    ctx.fillStyle = '#173126';
    ctx.font = '700 66px sans-serif';
    wrapText(ctx, 'Welcome to Hillyards XR', 62, 290, 1070, 80, 3);
    ctx.fillStyle = 'rgba(220,235,220,.84)';
    ctx.fillRect(62, 1190, 1076, 90);
    ctx.fillStyle = '#173126';
    ctx.font = '700 28px sans-serif';
    ctx.fillText('Back to Hillyards Menu', 92, 1248);
    uploadPanelTexture();
}

function setPanelGeometry(w, h) {
    const hw = w / 2, hh = h / 2;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // U=0 left, U=1 right; V=0 bottom, V=1 top (UNPACK_FLIP_Y_WEBGL flips V during upload)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -hw, -hh, 0, 0, 0, hw, -hh, 0, 1, 0, hw, hh, 0, 1, 1,
        -hw, -hh, 0, 0, 0, hw, hh, 0, 1, 1, -hw, hh, 0, 0, 1
    ]), gl.STATIC_DRAW);
    dlog('Buffer set: ' + w + 'x' + h);
}

function setupGl(nextCanvas, profile) {
    canvas = nextCanvas;
    plantProfile = profile;
    gl = canvas.getContext('webgl', { alpha: true, antialias: true, xrCompatible: true });
    dlog('WebGL ctx: ' + !!gl);
    if (!gl) throw new Error('WebGL is unavailable.');

    program = createProgram(
        'attribute vec3 position;attribute vec2 texCoord;uniform mat4 mvp;varying vec2 uv;void main(){gl_Position=mvp*vec4(position,1.0);uv=texCoord;}',
        'precision mediump float;varying vec2 uv;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,uv);}'
    );
    dlog('Program: ' + (
        gl.getAttribLocation(program, 'position') + '|' +
        gl.getAttribLocation(program, 'texCoord') + '|' +
        gl.getUniformLocation(program, 'mvp') + '|' +
        gl.getUniformLocation(program, 'tex')
    ));

    buffer = gl.createBuffer();
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
    dlog('GL setup complete');
}

function removeMockOverlay() {}
function removeArOverlay() {
    document.body.classList.remove('ar-session-active');
    overlay?.remove();
    overlay = null;
    diagnosticEl?.remove();
    diagnosticEl = null;
}

function createArOverlay() {
    document.body.classList.add('ar-session-active');
    overlay = document.createElement('div');
    overlay.id = 'arOverlayControls';
    overlay.innerHTML = '<div class="ar-overlay-copy"><div id="arOverlayStatus">Starting diagnostic AR…</div></div><div class="ar-overlay-buttons"><button type="button" onclick="window.exitAr()">Exit AR</button></div>';
    overlay.addEventListener('beforexrselect', e => e.preventDefault());
    document.body.append(overlay);
    dlog('Overlay created');
}

// ─── FIXED MATRIX: panel at (0, 0, -2) in reference space, NO viewer-pose math ───
// Model matrix: identity with translation to 0, 0, -2
// This places the panel exactly 2 metres in front of the XR origin, no matter
// where the viewer actually is. The viewer must walk to see it.
const FIXED_MODEL_MATRIX = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 1.5, -2, 1  // x=0, y=1.5 (eye height), z=-2
]);

function draw(time, frame) {
    try {
        const activeSession = frame.session;
        activeSession.requestAnimationFrame(draw);

        const viewerPose = frame.getViewerPose(refSpace);
        if (!viewerPose) return;

        // Re-bind layer framebuffer each frame (XR may swap)
        const layer = activeSession.renderState.baseLayer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);

        // Reset GL state each frame (XR compositor may change it)
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(true);
        gl.colorMask(true, true, true, true);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        const pLoc = gl.getAttribLocation(program, 'position');
        const tLoc = gl.getAttribLocation(program, 'texCoord');
        const mvpLoc = gl.getUniformLocation(program, 'mvp');
        const texLoc = gl.getUniformLocation(program, 'tex');

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(pLoc);
        gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(tLoc);
        gl.vertexAttribPointer(tLoc, 2, gl.FLOAT, false, 20, 12);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(texLoc, 0);

        for (const view of viewerPose.views) {
            const vp = layer.getViewport(view);
            gl.viewport(vp.x, vp.y, vp.width, vp.height);

            const vm = view.transform.inverse.matrix;
            const mv = multiplyMat4(vm, FIXED_MODEL_MATRIX);
            const mvp = multiplyMat4(view.projectionMatrix, mv);

            gl.uniformMatrix4fv(mvpLoc, false, mvp);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

    } catch (error) {
        console.error('[AR] draw error:', error);
    }
}

export async function startArNote(_marker, profile) {
    // ─── Create diagnostic element on <html> (NOT body — body is domOverlay root!) ───
    if (!document.getElementById('nxrArDiag')) {
        const diag = document.createElement('div');
        diag.id = 'nxrArDiag';
        diag.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;color:#0f0;font:14px/1.4 monospace;background:rgba(0,0,0,.92);padding:8px 12px;max-width:100vw;pointer-events:none;white-space:pre-wrap;border:3px solid #f00;display:block;visibility:visible;opacity:1;';
        // Append to <html> to stay outside domOverlay root
        document.documentElement.append(diag);
    }
    function prelog(msg) {
        console.log('[AR]', msg);
        const e = document.getElementById('nxrArDiag');
        if (e) e.textContent += '\n' + msg;
    }
    prelog('=== AR DIAGNOSTIC START ===');
    prelog('1. SecureContext: ' + window.isSecureContext);
    prelog('2. navigator.xr: ' + Boolean(navigator.xr));

    if (!window.isSecureContext) { prelog('FAIL: not HTTPS'); message('AR requires HTTPS.'); return; }
    if (!navigator.xr) { prelog('FAIL: no navigator.xr'); message('WebXR unavailable.'); return; }

    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) { prelog('FAIL: immersive-ar unsupported'); message('AR not supported.'); return; }
        prelog('3. immersive-ar supported');

        session = await navigator.xr.requestSession('immersive-ar', {
            optionalFeatures: ['local-floor'],
            domOverlay: { root: document.body }
        });
        prelog('4. Session: ' + session.mode);
        dlog('Session: ' + session.mode + ' hit-test NOT requested');

        const nextCanvas = document.createElement('canvas');
        nextCanvas.id = 'arCanvas';
        nextCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9000;';
        document.body.append(nextCanvas);
        createArOverlay();
        setupGl(nextCanvas, profile);

        await gl.makeXRCompatible();
        dlog('makeXRCompatible done');

        session.updateRenderState({
            baseLayer: new XRWebGLLayer(session, gl, { alpha: true, depth: true, antialias: true }),
            depthNear: 0.01, depthFar: 100
        });

        try { refSpace = await session.requestReferenceSpace('local-floor'); dlog('Ref: local-floor'); }
        catch { refSpace = await session.requestReferenceSpace('local'); dlog('Ref: local (fallback)'); }

        // DIAGNOSTIC: Report the fixed matrix
        dlog('FIXED panel: x=' + FIXED_MODEL_MATRIX[12].toFixed(1) +
            ' y=' + FIXED_MODEL_MATRIX[13].toFixed(1) +
            ' z=' + FIXED_MODEL_MATRIX[14].toFixed(1));

        // No hit testing, no placement, no anchors — just draw
        session.addEventListener('end', () => {
            dlog('Session ended');
            document.getElementById('arCanvas')?.remove();
            removeArOverlay();
            session = null; gl = null; canvas = null;
            window.renderLaunchScreen?.();
        });

        session.requestAnimationFrame(draw);
        dlog('Draw loop started — panel at fixed (0, 1.5, -2)');

    } catch (error) {
        dlog('FATAL: ' + (error?.message || String(error)).slice(0, 60));
        document.getElementById('arCanvas')?.remove();
        removeArOverlay();
        session = null;
        message('AR error: ' + (error?.message || 'unknown'));
    }
}

export function resetArPlacement() {}
export function exitAr() { if (session) session.end(); }