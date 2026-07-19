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

const ROOT_OPTIONS = [
    { key: 'intro_checkpoint', label: 'Add Intro Checkpoint', range: [180, 350] },
    { key: 'sub_checkpoint', label: 'Add Sub Checkpoint', range: [370, 540] },
    { key: 'plant', label: 'Add Plant Marker', range: [560, 730] },
    { key: 'note', label: 'Add Custom Note', range: [750, 920] },
    { key: 'lemon_drop', label: 'Lemon Drop Garcinia', range: [970, 1150] },
    { key: 'welcome', label: 'Welcome to Hillyards XR', range: [1170, 1350] }
];

function message(text) {
    const s = document.getElementById('arOverlayStatus') || document.getElementById('arStatus');
    if (s) s.textContent = text;
}

function multiplyMat4(left, right) {
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let rw = 0; rw < 4; rw++)
        r[c * 4 + rw] = left[rw] * right[c * 4] + left[4 + rw] * right[c * 4 + 1] + left[8 + rw] * right[c * 4 + 2] + left[12 + rw] * right[c * 4 + 3];
    return r;
}

function createProgram(vs, fs) {
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
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

function uploadTex() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, panelCanvas);
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
    uploadTex();
}

function drawPlantProfile() {
    panelView = 'plant';
    drawPanelBg('Plant Profile');
    const ctx = panelContext;
    ctx.fillStyle = 'rgba(248,250,244,.84)'; ctx.fillRect(45, 180, 1110, 1130);
    ctx.fillStyle = '#173126';
    ctx.font = '700 55px sans-serif'; ctx.fillText(plantProfile?.common_name || 'Lemon Drop Garcinia', 62, 245);
    ctx.font = 'italic 40px sans-serif'; ctx.fillText(plantProfile?.scientific_name || 'Garcinia intermedia', 62, 310);
    ctx.font = '34px sans-serif';
    wrapText(ctx, plantProfile?.overview || 'A tropical fruit species in the Hillyards collection.', 62, 410, 1070, 50, 5);
    ctx.fillStyle = 'rgba(220,235,220,.84)'; ctx.fillRect(62, 1190, 1076, 90);
    ctx.fillStyle = '#173126'; ctx.font = '700 28px sans-serif'; ctx.fillText('Back to Hillyards Menu', 92, 1248);
    uploadTex();
}

function drawWelcomeNote() {
    panelView = 'note';
    drawPanelBg('Spatial Text Marker');
    const ctx = panelContext;
    ctx.fillStyle = 'rgba(248,250,244,.84)'; ctx.fillRect(45, 180, 1110, 1130);
    ctx.fillStyle = '#173126'; ctx.font = '700 66px sans-serif';
    wrapText(ctx, 'Welcome to Hillyards XR', 62, 290, 1070, 80, 3);
    ctx.fillStyle = 'rgba(220,235,220,.84)'; ctx.fillRect(62, 1190, 1076, 90);
    ctx.fillStyle = '#173126'; ctx.font = '700 28px sans-serif'; ctx.fillText('Back to Hillyards Menu', 92, 1248);
    uploadTex();
}

function setPanelGeometry(w, h) {
    const hw = w / 2, hh = h / 2;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -hw, -hh, 0, 0, 0,  hw, -hh, 0, 1, 0,  hw, hh, 0, 1, 1,
        -hw, -hh, 0, 0, 0,  hw, hh, 0, 1, 1,  -hw, hh, 0, 0, 1
    ]), gl.STATIC_DRAW);
}

function setupGl(nextCanvas, profile) {
    canvas = nextCanvas;
    plantProfile = profile;
    gl = canvas.getContext('webgl', { alpha: true, antialias: true, xrCompatible: true });
    if (!gl) throw new Error('WebGL is unavailable.');
    program = createProgram(
        'attribute vec3 position;attribute vec2 texCoord;uniform mat4 mvp;varying vec2 uv;void main(){gl_Position=mvp*vec4(position,1.0);uv=texCoord;}',
        'precision mediump float;varying vec2 uv;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,uv);}'
    );
    buffer = gl.createBuffer();
    setPanelGeometry(PANEL_WIDTH, PANEL_HEIGHT);
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    panelCanvas = document.createElement('canvas');
    panelCanvas.width = 1200; panelCanvas.height = 1400;
    panelContext = panelCanvas.getContext('2d');
    drawMenu();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
}

function removeArOverlay() {
    document.body.classList.remove('ar-session-active');
    overlay?.remove(); overlay = null;
}

function createArOverlay() {
    document.body.classList.add('ar-session-active');
    overlay = document.createElement('div');
    overlay.id = 'arOverlayControls';
    overlay.innerHTML = '<div class="ar-overlay-copy"><div id="arOverlayStatus">AR active</div></div><div class="ar-overlay-buttons"><button type="button" onclick="window.exitAr()">Exit AR</button></div>';
    overlay.addEventListener('beforexrselect', e => e.preventDefault());
    document.body.append(overlay);
}

const FIXED_MODEL_MATRIX = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 1.5, -2, 1
]);

function draw(time, frame) {
    try {
        const activeSession = frame.session;
        activeSession.requestAnimationFrame(draw);
        const viewerPose = frame.getViewerPose(refSpace);
        if (!viewerPose) return;

        const layer = activeSession.renderState.baseLayer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(true);
        gl.colorMask(true, true, true, true);
        gl.clearColor(0, 0, 0, 0);
        gl.clearDepth(1);
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
            const mv = multiplyMat4(view.transform.inverse.matrix, FIXED_MODEL_MATRIX);
            const mvp = multiplyMat4(view.projectionMatrix, mv);
            gl.uniformMatrix4fv(mvpLoc, false, mvp);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    } catch (error) {
        console.error('[AR] draw error:', error);
    }
}

export async function startArNote(_marker, profile) {
    console.log('[AR] startArNote');
    if (!window.isSecureContext) { message('AR requires HTTPS.'); return; }
    if (!navigator.xr) { message('WebXR unavailable.'); return; }
    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) { message('AR not supported.'); return; }
        session = await navigator.xr.requestSession('immersive-ar', {
            optionalFeatures: ['local-floor'],
            domOverlay: { root: document.body }
        });
        const nextCanvas = document.createElement('canvas');
        nextCanvas.id = 'arCanvas';
        nextCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9000;';
        document.body.append(nextCanvas);
        createArOverlay();
        setupGl(nextCanvas, profile);
        await gl.makeXRCompatible();
        session.updateRenderState({
            baseLayer: new XRWebGLLayer(session, gl, { alpha: true, depth: true, antialias: true }),
            depthNear: 0.01, depthFar: 100
        });
        try { refSpace = await session.requestReferenceSpace('local-floor'); }
        catch { refSpace = await session.requestReferenceSpace('local'); }
        session.addEventListener('end', () => {
            document.getElementById('arCanvas')?.remove();
            removeArOverlay();
            session = null; gl = null; canvas = null;
            window.renderLaunchScreen?.();
        });
        session.requestAnimationFrame(draw);
    } catch (error) {
        console.error('[AR] error:', error);
        document.getElementById('arCanvas')?.remove();
        removeArOverlay();
        session = null;
        message('AR error: ' + (error?.message || 'unknown'));
    }
}

export function resetArPlacement() {}
export function exitAr() { if (session) session.end(); }