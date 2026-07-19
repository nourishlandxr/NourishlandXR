/**
 * AR Mode - Lightweight WebXR AR panel for the creator dashboard.
 * Renders a floating dashboard panel entirely through WebGL.
 * No dom-overlay dependency — everything visible in-headset from frame 1.
 */

let session = null;
let gl = null;
let refSpace = null;
let hitSource = null;
let canvas = null;
let finishingDemo = false;
let latestHitMatrix = null;
let spatialMatrix = null;
let panelLocked = false;
let program = null;
let buffer = null;
let texture = null;
let statusEl = null;  // on-screen status element
const PW = 0.72;
const PH = 0.52;

function mult4(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
}

function makeShader(t, s) {
    const sh = gl.createShader(t);
    gl.shaderSource(sh, s);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
}

function showStatus(msg) {
    if (statusEl) { statusEl.textContent = msg; statusEl.hidden = false; }
}

function hideStatus() {
    if (statusEl) statusEl.hidden = true;
}

function renderPanel(ctx, w, h) {
    ctx.fillStyle = 'rgba(20,55,34,.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = '700 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('My Project', w / 2, 42);
    ctx.fillStyle = '#dcef95';
    ctx.font = '13px sans-serif';
    ctx.fillText('DASHBOARD', w / 2, 62);

    if (!panelLocked) {
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.font = '16px sans-serif';
        ctx.fillText('Tap a surface to place this panel.', w / 2, 96);
    } else {
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.font = '16px sans-serif';
        ctx.fillText('Panel placed at selected position.', w / 2, 96);
    }

    ctx.fillStyle = '#dcef95';
    ctx.fillRect(20, 120, w - 40, 44);
    ctx.fillStyle = '#173522';
    ctx.font = '700 18px sans-serif';
    ctx.fillText('Add Marker', w / 2, 148);
    ctx.fillStyle = '#28c840';
    ctx.fillRect(20, 178, w - 40, 44);
    ctx.fillStyle = '#fff';
    ctx.font = '700 18px sans-serif';
    ctx.fillText('Add Note', w / 2, 206);
    ctx.fillStyle = '#c43636';
    ctx.fillRect(20, h - 56, w - 40, 40);
    ctx.fillStyle = '#fff';
    ctx.font = '700 16px sans-serif';
    ctx.fillText('Web Mode', w / 2, h - 32);
}

function bakeTexture() {
    if (!texture || !gl) return;
    const c = document.createElement('canvas');
    c.width = 400; c.height = 300;
    renderPanel(c.getContext('2d'), 400, 300);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
}

function drawQuad(view, m) {
    if (!texture || !m) return;
    const vp = mult4(view.transform.inverse.matrix, m);
    const mvp = mult4(view.projectionMatrix, vp);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mvp'), false, mvp);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(gl.getAttribLocation(program, 'p'));
    gl.vertexAttribPointer(gl.getAttribLocation(program, 'p'), 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(gl.getAttribLocation(program, 't'));
    gl.vertexAttribPointer(gl.getAttribLocation(program, 't'), 2, gl.FLOAT, false, 20, 12);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, 'tex'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function initGL() {
    const vs = 'attribute vec3 p;attribute vec2 t;uniform mat4 mvp;varying vec2 uv;void main(){gl_Position=mvp*vec4(p,1.0);uv=t;}';
    const fs = 'precision mediump float;varying vec2 uv;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,uv);}';
    program = gl.createProgram();
    gl.attachShader(program, makeShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, makeShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -PW / 2, -PH / 2, 0, 0, 1, PW / 2, -PH / 2, 0, 1, 1,
        PW / 2, PH / 2, 0, 1, 0, -PW / 2, -PH / 2, 0, 0, 1,
        PW / 2, PH / 2, 0, 1, 0, -PW / 2, PH / 2, 0, 0, 0
    ]), gl.STATIC_DRAW);
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    bakeTexture();
}

function cleanup() {
    if (texture) gl?.deleteTexture(texture);
    texture = null; program = null; buffer = null;
    hitSource?.cancel(); hitSource = null; refSpace = null;
    latestHitMatrix = null; spatialMatrix = null;
    canvas?.remove(); canvas = null; gl = null;
    if (statusEl) { statusEl.remove(); statusEl = null; }
}

export function exitArMode() {
    finishingDemo = true;
    const s = session; session = null; cleanup();
    if (s) s.end().catch(() => {});
}

export function isArModeActive() { return Boolean(session); }

export async function startArMode(projectId = '') {
    if (projectId) window._arProjectId = projectId;
    if (!navigator.xr || !window.isSecureContext) return false;

    // Create visible status element for Android users (no console access)
    statusEl = document.createElement('div');
    statusEl.id = 'arModeStatus';
    statusEl.style.cssText = 'position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:13000;color:#fff;font-size:14px;font-weight:600;text-shadow:0 2px 6px rgba(0,0,0,.9);text-align:center;background:rgba(0,0,0,.7);padding:8px 16px;border-radius:8px;max-width:90%;pointer-events:none;';
    statusEl.textContent = 'Initializing AR...';
    document.body.append(statusEl);

    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) {
            showStatus('AR not supported on this device/browser');
            return false;
        }
        showStatus('Requesting camera...');
        // DISABLED: hit-test removed for basic AR mode
        session = await navigator.xr.requestSession('immersive-ar', {
            // requiredFeatures: ['hit-test'],
            optionalFeatures: ['local-floor']
        });
        showStatus('Camera active, setting up...');
        canvas = document.createElement('canvas');
        canvas.id = 'arCanvas';
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:11999';
        document.body.append(canvas);
        gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL unavailable');
        await gl.makeXRCompatible();
        session.updateRenderState({
            baseLayer: new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true }),
            depthNear: 0.01, depthFar: 50
        });
        try { refSpace = await session.requestReferenceSpace('local-floor'); }
        catch { refSpace = await session.requestReferenceSpace('local'); }
        initGL();
        finishingDemo = false;
        panelLocked = true; // DISABLED: Always locked - no hit testing needed
        spatialMatrix = null;

        // DISABLED: hit test removed for basic AR mode
        // hitSource = null;

        showStatus('AR ready');

        // ---- IMMEDIATE PLACEMENT: position panel 1.5 metres in front of viewer ----
        // Use a sensible default. The first draw frame will refine this using actual viewer pose.
        spatialMatrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 1.5, -1.5, 1
        ]);
        // Track whether we've refined the position from a real viewer pose
        // Store flag for one-time repositioning on first frame
        window.__nxrArModePanelNeedsReposition = true;
        hideStatus();

        const draw = (t, frame) => {
            try {
                if (frame.session !== session || !gl) return;
                frame.session.requestAnimationFrame(draw);
                const layer = frame.session.renderState.baseLayer;
                const pose = frame.getViewerPose(refSpace);
                if (!pose && !spatialMatrix) return;

                // On very first frame, refine panel position using actual viewer pose
                if (pose && window.__nxrArModePanelNeedsReposition) {
                    window.__nxrArModePanelNeedsReposition = false;
                    const m = pose.transform.matrix;
                    spatialMatrix = new Float32Array([
                        m[0], m[1], m[2], 0,
                        m[4], m[5], m[6], 0,
                        m[8], m[9], m[10], 0,
                        m[12] - m[8] * 1.5,
                        m[13] - m[9] * 1.5 + 0.0,
                        m[14] - m[10] * 1.5,
                        1
                    ]);
                    console.log('[AR] Panel positioned 1.5m in front of viewer');
                }

                gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
                gl.useProgram(program);
                gl.depthMask(true);
                gl.clearColor(0, 0, 0, 0);
                gl.clearDepth(1);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                if (pose && spatialMatrix) for (const view of pose.views) {
                    const vp = layer.getViewport(view);
                    gl.viewport(vp.x, vp.y, vp.width, vp.height);
                    drawQuad(view, spatialMatrix);
                }
            } catch (error) {
                console.error('[AR] Render error:', error);
            }
        };
        session.requestAnimationFrame(draw);

        // DISABLED: select event for hit testing not needed in basic AR mode
        // session.addEventListener('select', event => {
        //     if (!panelLocked) {
        //         const pose = event.frame.getViewerPose(refSpace);
        //         if (pose && latestHitMatrix) {
        //             const p = [latestHitMatrix[12], latestHitMatrix[13] + 0.15, latestHitMatrix[14]];
        //             spatialMatrix = new Float32Array(pose.transform.matrix);
        //             spatialMatrix[12] = p[0]; spatialMatrix[13] = p[1]; spatialMatrix[14] = p[2];
        //         }
        //         panelLocked = true;
        //         bakeTexture();
        //         showStatus('Panel placed!');
        //         setTimeout(() => { if (panelLocked) hideStatus(); }, 2000);
        //     }
        // });

        session.addEventListener('end', () => {
            if (!finishingDemo) window.renderProjectDashboard(encodeURIComponent(window._arProjectId || ''));
            finishingDemo = false; session = null; cleanup();
        });

        hideStatus();
        return true;
    } catch (error) {
        showStatus(`AR error: ${error?.message || 'unknown'}`);
        window._lastArModeError = error;
        try { session?.end(); } catch {}
        session = null; cleanup();
        return false;
    }
}