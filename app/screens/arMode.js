let session = null;
let gl = null;
let refSpace = null;
let hitSource = null;
let canvas = null;
let finishingDemo = false;
let latestHitMatrix = null;
let spatialDashboardMatrix = null;
let program = null;
let dashboardBuffer = null;
let dashboardTexture = null;
let panelContext = null;
let panelCanvas = null;
const PANEL_W = 0.72;
const PANEL_H = 0.52;

function multiplyMat4(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
        out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return out;
}

function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
}

function renderDashboardToCanvas(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(20,55,34,.92)';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('My Project', w / 2, 42);
    ctx.fillStyle = '#dcef95';
    ctx.font = '13px sans-serif';
    ctx.fillText('DASHBOARD', w / 2, 62);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.font = '16px sans-serif';
    ctx.fillText('Create a marker or note to get started.', w / 2, 96);
    ctx.fillStyle = '#dcef95';
    ctx.beginPath();
    ctx.roundRect(20, 120, w - 40, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#173522';
    ctx.font = '700 18px sans-serif';
    ctx.fillText('Add Marker', w / 2, 148);
    ctx.fillStyle = '#28c840';
    ctx.beginPath();
    ctx.roundRect(20, 178, w - 40, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 18px sans-serif';
    ctx.fillText('Add Note', w / 2, 206);
    // Web Mode button at bottom
    ctx.fillStyle = '#c43636';
    ctx.beginPath();
    ctx.roundRect(20, h - 56, w - 40, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 16px sans-serif';
    ctx.fillText('Web Mode', w / 2, h - 32);
}

function buildDashboardTexture() {
    if (panelCanvas) {
        renderDashboardToCanvas(panelContext, panelCanvas.width, panelCanvas.height);
        if (dashboardTexture) gl.deleteTexture(dashboardTexture);
        dashboardTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, dashboardTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, panelCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
}

function drawSpatialPanel(view, matrix) {
    if (!dashboardTexture || !matrix) return;
    const mvp = multiplyMat4(view.projectionMatrix, multiplyMat4(view.transform.inverse.matrix, matrix));
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, dashboardBuffer);
    const pLoc = gl.getAttribLocation(program, 'p');
    const tLoc = gl.getAttribLocation(program, 't');
    gl.enableVertexAttribArray(pLoc);
    gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(tLoc);
    gl.vertexAttribPointer(tLoc, 2, gl.FLOAT, false, 20, 12);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mvp'), false, mvp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dashboardTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'tex'), 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function setupRenderer() {
    const vSrc = 'attribute vec3 p;attribute vec2 t;uniform mat4 mvp;varying vec2 uv;void main(){gl_Position=mvp*vec4(p,1.0);uv=t;}';
    const fSrc = 'precision mediump float;varying vec2 uv;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,uv);}';
    program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vSrc));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fSrc));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader link failed');

    dashboardBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dashboardBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -PANEL_W / 2, -PANEL_H / 2, 0, 0, 1,
        PANEL_W / 2, -PANEL_H / 2, 0, 1, 1,
        PANEL_W / 2, PANEL_H / 2, 0, 1, 0,
        -PANEL_W / 2, -PANEL_H / 2, 0, 0, 1,
        PANEL_W / 2, PANEL_H / 2, 0, 1, 0,
        -PANEL_W / 2, PANEL_H / 2, 0, 0, 0
    ]), gl.STATIC_DRAW);

    panelCanvas = document.createElement('canvas');
    panelCanvas.width = 400;
    panelCanvas.height = 300;
    panelContext = panelCanvas.getContext('2d');
    buildDashboardTexture();
}

function removeCanvas() {
    if (dashboardTexture) gl?.deleteTexture(dashboardTexture);
    dashboardTexture = null;
    program = null;
    dashboardBuffer = null;
    panelCanvas = null;
    panelContext = null;
    hitSource?.cancel();
    hitSource = null;
    refSpace = null;
    latestHitMatrix = null;
    spatialDashboardMatrix = null;
    canvas?.remove();
    canvas = null;
    gl = null;
}

export function exitArMode() {
    finishingDemo = true;
    const s = session;
    session = null;
    removeCanvas();
    if (s) s.end().catch(() => {});
    document.querySelector('.temporary-demo-reticle')?.remove();
    document.querySelector('.temporary-demo-guide')?.remove();
}

export function isArModeActive() {
    return Boolean(session);
}

export async function startArMode() {
    if (!navigator.xr || !window.isSecureContext) return false;
    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) return false;
        session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['local-floor'],
            domOverlay: { root: document.body }
        });
        canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '11999';
        document.body.append(canvas);
        gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL unavailable');
        await gl.makeXRCompatible();
        session.updateRenderState({
            baseLayer: new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true }),
            depthNear: 0.01,
            depthFar: 50
        });
        try { refSpace = await session.requestReferenceSpace('local-floor'); }
        catch { refSpace = await session.requestReferenceSpace('local'); }
        const viewerSpace = await session.requestReferenceSpace('viewer');
        hitSource = await session.requestHitTestSource({ space: viewerSpace });
        setupRenderer();
        finishingDemo = false;

        // Add reticle and guide text
        const reticle = document.createElement('div');
        reticle.className = 'temporary-demo-reticle';
        document.body.append(reticle);
        const guide = document.createElement('div');
        guide.className = 'temporary-demo-guide fade-in';
        guide.textContent = 'Tap a surface to place your dashboard';
        document.body.append(guide);

        const draw = (_time, frame) => {
            if (frame.session !== session || !gl) return;
            frame.session.requestAnimationFrame(draw);
            const layer = frame.session.renderState.baseLayer;
            const pose = frame.getViewerPose(refSpace);
            const hit = hitSource ? frame.getHitTestResults(hitSource)[0] : null;
            const hitPose = hit?.getPose(refSpace);
            latestHitMatrix = hitPose ? new Float32Array(hitPose.transform.matrix) : null;
            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clearDepth(1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            if (pose) {
                for (const view of pose.views) {
                    const viewport = layer.getViewport(view);
                    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                    drawSpatialPanel(view, spatialDashboardMatrix);
                }
            }
        };
        session.requestAnimationFrame(draw);

        session.addEventListener('select', event => {
            if (!spatialDashboardMatrix) {
                const viewerPose = event.frame.getViewerPose(refSpace);
                if (!viewerPose) return;
                let pos;
                if (latestHitMatrix) {
                    pos = [latestHitMatrix[12], latestHitMatrix[13] + 0.15, latestHitMatrix[14]];
                } else {
                    const m = viewerPose.transform.matrix;
                    pos = [m[12] - m[8] * 1.2, m[13] - m[9] * 1.2 + 0.1, m[14] - m[10] * 1.2];
                }
                spatialDashboardMatrix = new Float32Array(viewerPose.transform.matrix);
                spatialDashboardMatrix[12] = pos[0];
                spatialDashboardMatrix[13] = pos[1];
                spatialDashboardMatrix[14] = pos[2];
                buildDashboardTexture();
                reticle.remove();
                guide.textContent = 'Dashboard placed! Tap Web Mode to exit.';
                setTimeout(() => guide.remove(), 3000);
            }
        });

        session.addEventListener('end', () => {
            if (!finishingDemo) {
                window.renderProjectDashboard(encodeURIComponent(window._arProjectId || ''));
            }
            finishingDemo = false;
            session = null;
            removeCanvas();
            document.querySelector('.temporary-demo-reticle')?.remove();
            document.querySelector('.temporary-demo-guide')?.remove();
        });
        return true;
    } catch {
        try { session?.end(); } catch {}
        session = null;
        removeCanvas();
        return false;
    }
}