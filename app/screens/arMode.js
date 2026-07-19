/**
 * AR Mode — BASIC — Fixed-position WebXR panel.
 * Renders a solid panel 1.5m in front of the viewer.
 * No hit testing. No anchors. No interaction.
 */

let session = null;
let gl = null;
let refSpace = null;
let canvas = null;
let debugEl = null;
let program = null;
let buffer = null;
let texture = null;
let dashboardOverlayMode = false;
const PW = 0.72;
const PH = 0.52;

// Debug logger visible on screen
function dlog(msg) {
    console.log('[AR]', msg);
    if (debugEl) {
        debugEl.textContent = (debugEl.textContent || '') + msg + '\n';
        debugEl.scrollTop = debugEl.scrollHeight;
    }
}

function mult4(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++)
            o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
}

function makeShader(type, source) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(sh));
    return sh;
}

function renderPanel(ctx, w, h) {
    // Bright background so it's impossible to miss in AR
    ctx.fillStyle = 'rgba(20,55,34,.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = '700 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('My Project', w / 2, 42);
    ctx.fillStyle = '#dcef95';
    ctx.font = '13px sans-serif';
    ctx.fillText('DASHBOARD', w / 2, 62);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.font = '16px sans-serif';
    ctx.fillText('Panel placed at selected position.', w / 2, 96);
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
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    dlog('Texture baked: ' + c.width + 'x' + c.height);
}

function initGL() {
    const vs = 'attribute vec3 p;attribute vec2 t;varying vec2 uv;uniform mat4 mvp;void main(){gl_Position=mvp*vec4(p,1.0);uv=t;}';
    const fs = 'precision mediump float;varying vec2 uv;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,uv);}';
    program = gl.createProgram();
    gl.attachShader(program, makeShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, makeShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
    }
    dlog('Program linked OK');
    dlog('  p attrib: ' + gl.getAttribLocation(program, 'p'));
    dlog('  t attrib: ' + gl.getAttribLocation(program, 't'));
    dlog('  mvp uniform: ' + gl.getUniformLocation(program, 'mvp'));
    dlog('  tex uniform: ' + gl.getUniformLocation(program, 'tex'));

    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -PW/2, -PH/2, 0, 0, 1,   PW/2, -PH/2, 0, 1, 1,   PW/2, PH/2, 0, 1, 0,
        -PW/2, -PH/2, 0, 0, 1,   PW/2, PH/2, 0, 1, 0,   -PW/2, PH/2, 0, 0, 0
    ]), gl.STATIC_DRAW);
    dlog('Buffer created');

    texture = gl.createTexture();
    bakeTexture();
}

function cleanup() {
    if (texture) gl?.deleteTexture(texture);
    texture = null;
    program = null;
    buffer = null;
    refSpace = null;
    dashboardOverlayMode = false;
    canvas?.remove();
    canvas = null;
    gl = null;
    debugEl?.remove();
    debugEl = null;
}

export function exitArMode() {
    const s = session;
    session = null;
    cleanup();
    if (s) s.end().catch(() => {});
}

export function isArModeActive() {
    return Boolean(session);
}

export async function startArMode(projectId) {
    if (projectId) window._arProjectId = projectId;
    if (!navigator.xr || !window.isSecureContext) {
        console.error('[AR] WebXR not available');
        return false;
    }
    const dashboardRoot = document.getElementById('app');
    if (!dashboardRoot) {
        console.error('[AR] Dashboard root is unavailable');
        return false;
    }

    // Visible debug log on screen
    debugEl = document.createElement('div');
    debugEl.id = 'arDebugLog';
    debugEl.style.cssText = 'position:fixed;left:12px;top:12px;z-index:15000;color:#0f0;font-size:12px;font-family:monospace;background:rgba(0,0,0,.85);padding:8px 12px;border-radius:6px;max-width:95vw;max-height:50vh;overflow-y:auto;pointer-events:none;white-space:pre-wrap;line-height:1.4;';
    dashboardRoot.append(debugEl);

    try {
        dlog('=== AR Mode Start ===');

        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        dlog('immersive-ar supported: ' + supported);
        if (!supported) {
            dlog('ERROR: AR not supported');
            return false;
        }

        dlog('Requesting session...');
        session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['dom-overlay'],
            optionalFeatures: ['local-floor'],
            domOverlay: { root: dashboardRoot }
        });
        dlog('Session acquired: ' + session.mode);
        dashboardOverlayMode = true;
        dlog('Project dashboard retained as DOM overlay');

        canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:11999;';
        document.body.append(canvas);

        gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        dlog('WebGL context: ' + !!gl);
        if (!gl) throw new Error('WebGL unavailable');

        await gl.makeXRCompatible();
        dlog('makeXRCompatible done');

        const layer = new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true });
        dlog('Layer: ' + layer.framebufferWidth + 'x' + layer.framebufferHeight);
        session.updateRenderState({ baseLayer: layer, depthNear: 0.01, depthFar: 50 });

        try {
            refSpace = await session.requestReferenceSpace('local-floor');
            dlog('Ref space: local-floor');
        } catch {
            refSpace = await session.requestReferenceSpace('local');
            dlog('Ref space: local (fallback)');
        }

        initGL();

        // Fixed position: 1.5m forward from origin, at eye height
        let spatialMatrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 1.5, -1.5, 1
        ]);
        dlog('Default spatialMatrix set');

        let firstPoseAcquired = false;
        let frameCount = 0;
        let renderCount = 0;

        const pLoc = gl.getAttribLocation(program, 'p');
        const tLoc = gl.getAttribLocation(program, 't');
        const mvpLoc = gl.getUniformLocation(program, 'mvp');
        const texLoc = gl.getUniformLocation(program, 'tex');

        function draw(timestamp, frame) {
            if (!session || !gl) {
                dlog('Draw: session or gl gone, stopping');
                return;
            }
            session.requestAnimationFrame(draw);
            frameCount++;

            const pose = frame.getViewerPose(refSpace);

            if (!pose) {
                if (frameCount <= 10 || frameCount % 60 === 0) {
                    dlog('Frame ' + frameCount + ': no viewer pose');
                }
                return;
            }

            if (!firstPoseAcquired) {
                firstPoseAcquired = true;
                dlog('Frame ' + frameCount + ': FIRST POSE ACQUIRED');

                // Position 1.5m in front of current viewer location
                const m = pose.transform.matrix;
                spatialMatrix = new Float32Array([
                    m[0], m[1], m[2], 0,
                    m[4], m[5], m[6], 0,
                    m[8], m[9], m[10], 0,
                    m[12] - m[8] * 1.5,
                    m[13] - m[9] * 1.5,
                    m[14] - m[10] * 1.5,
                    1
                ]);
                dlog('  Viewer pos: (' +
                    m[12].toFixed(2) + ', ' +
                    m[13].toFixed(2) + ', ' +
                    m[14].toFixed(2) + ')');
                dlog('  Panel pos:  (' +
                    spatialMatrix[12].toFixed(2) + ', ' +
                    spatialMatrix[13].toFixed(2) + ', ' +
                    spatialMatrix[14].toFixed(2) + ')');
            }

            renderCount++;

            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.useProgram(program);
            gl.depthMask(true);
            gl.clearColor(0, 0, 0, 0);
            gl.clearDepth(1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            if (!dashboardOverlayMode) {
                for (const view of pose.views) {
                    const vp = layer.getViewport(view);
                    if (!vp) continue;
                    gl.viewport(vp.x, vp.y, vp.width, vp.height);

                    // Model-view-projection matrix
                    const vm = view.transform.inverse.matrix;
                    const mv = mult4(vm, spatialMatrix);
                    const mvp = mult4(view.projectionMatrix, mv);

                    gl.uniformMatrix4fv(mvpLoc, false, mvp);
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                    gl.enableVertexAttribArray(pLoc);
                    gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 20, 0);
                    gl.enableVertexAttribArray(tLoc);
                    gl.vertexAttribPointer(tLoc, 2, gl.FLOAT, false, 20, 12);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.uniform1i(texLoc, 0);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                }
            }

            if (renderCount === 1) {
                dlog('RENDER COMPLETE — ' + pose.views.length + ' view(s)');
                dlog('Viewport: ' + layer.getViewport(pose.views[0]).width + 'x' + layer.getViewport(pose.views[0]).height);
            }
        }

        session.addEventListener('end', () => {
            dlog('Session ended');
            session = null;
            cleanup();
        });

        session.requestAnimationFrame(draw);
        dlog('Draw loop requested');
        return true;

    } catch (error) {
        dlog('ERROR: ' + (error?.message || String(error)));
        console.error('[AR]', error);
        try { session?.end(); } catch {}
        session = null;
        cleanup();
        return false;
    }
}
