/**
 * Creator AR Mode
 *
 * The project dashboard is rendered as a world-space panel. The DOM overlay is
 * deliberately limited to an Exit button so the regular web dashboard never
 * covers the camera view.
 */

let session = null;
let gl = null;
let refSpace = null;
let canvas = null;
let overlayRoot = null;
let program = null;
let buffer = null;
let texture = null;
let activeProjectName = 'Project';

const PANEL_WIDTH = 0.84;
const PANEL_HEIGHT = 0.62;
const PANEL_DISTANCE = 1.2;

function multiplyMat4(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column++) {
        for (let row = 0; row < 4; row++) {
            out[column * 4 + row] = a[row] * b[column * 4]
                + a[4 + row] * b[column * 4 + 1]
                + a[8 + row] * b[column * 4 + 2]
                + a[12 + row] * b[column * 4 + 3];
        }
    }
    return out;
}

function makeShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed.');
    }
    return shader;
}

function makeViewerFacingMatrix(position, viewerMatrix) {
    const cameraX = viewerMatrix[12];
    const cameraZ = viewerMatrix[14];
    let forwardX = cameraX - position[0];
    let forwardZ = cameraZ - position[2];
    const length = Math.hypot(forwardX, forwardZ);

    if (length < 0.001) {
        forwardX = viewerMatrix[8];
        forwardZ = viewerMatrix[10];
    } else {
        forwardX /= length;
        forwardZ /= length;
    }

    // Local +Z faces the viewer; local +Y stays aligned with the world.
    return new Float32Array([
        forwardZ, 0, -forwardX, 0,
        0, 1, 0, 0,
        forwardX, 0, forwardZ, 0,
        position[0], position[1], position[2], 1
    ]);
}

function drawDashboard(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(15, 49, 31, .94)';
    ctx.beginPath();
    ctx.roundRect(10, 10, width - 20, height - 20, 30);
    ctx.fill();

    ctx.fillStyle = '#dcef95';
    ctx.font = '700 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PROJECT DASHBOARD', width / 2, 48);
    ctx.fillStyle = '#fff';
    ctx.font = '700 30px sans-serif';
    ctx.fillText(activeProjectName, width / 2, 86);
    ctx.fillStyle = 'rgba(255,255,255,.74)';
    ctx.font = '16px sans-serif';
    ctx.fillText('Your project is floating in the landscape.', width / 2, 116);

    const rows = [
        ['CREATE', 'Add markers and notes in the real place'],
        ['ORGANISE', 'Manage Areas and saved content on the dashboard'],
        ['EXPLORE', 'Look around to connect content with this place']
    ];
    rows.forEach(([label, detail], index) => {
        const y = 145 + index * 64;
        ctx.fillStyle = index === 0 ? 'rgba(220,239,149,.96)' : 'rgba(255,255,255,.12)';
        ctx.beginPath();
        ctx.roundRect(34, y, width - 68, 52, 12);
        ctx.fill();
        ctx.fillStyle = index === 0 ? '#173522' : '#fff';
        ctx.font = '700 17px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, 52, y + 23);
        ctx.fillStyle = index === 0 ? 'rgba(23,53,34,.78)' : 'rgba(255,255,255,.72)';
        ctx.font = '13px sans-serif';
        ctx.fillText(detail, 52, y + 42);
    });

    ctx.fillStyle = 'rgba(255,255,255,.68)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Use Exit AR to return to the full project dashboard.', width / 2, height - 34);
}

function bakeTexture() {
    const panelCanvas = document.createElement('canvas');
    panelCanvas.width = 720;
    panelCanvas.height = 540;
    drawDashboard(panelCanvas.getContext('2d'), panelCanvas.width, panelCanvas.height);

    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, panelCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function initGl() {
    const vertexSource = 'attribute vec3 position;attribute vec2 texCoord;uniform mat4 mvp;varying vec2 uv;void main(){gl_Position=mvp*vec4(position,1.0);uv=texCoord;}';
    const fragmentSource = 'precision mediump float;varying vec2 uv;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,uv);}';
    program = gl.createProgram();
    gl.attachShader(program, makeShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, makeShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Shader program could not be linked.');
    }

    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, 0, 0, 1,
         PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, 0, 1, 1,
         PANEL_WIDTH / 2,  PANEL_HEIGHT / 2, 0, 1, 0,
        -PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, 0, 0, 1,
         PANEL_WIDTH / 2,  PANEL_HEIGHT / 2, 0, 1, 0,
        -PANEL_WIDTH / 2,  PANEL_HEIGHT / 2, 0, 0, 0
    ]), gl.STATIC_DRAW);
    bakeTexture();
}

function createOverlay() {
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'creatorArOverlay';
    overlayRoot.className = 'creator-ar-overlay';
    overlayRoot.innerHTML = '<button type="button" class="creator-ar-exit">Exit AR</button>';
    overlayRoot.querySelector('.creator-ar-exit').addEventListener('click', exitArMode);
    document.body.append(overlayRoot);
}

function cleanup() {
    if (texture) gl?.deleteTexture(texture);
    texture = null;
    program = null;
    buffer = null;
    refSpace = null;
    canvas?.remove();
    canvas = null;
    overlayRoot?.remove();
    overlayRoot = null;
    document.body.classList.remove('creator-ar-session-active');
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

export async function startArMode(projectId) {
    if (projectId) window._arProjectId = projectId;
    if (!navigator.xr || !window.isSecureContext) return false;

    const dashboardRoot = document.getElementById('app');
    if (!dashboardRoot) return false;
    activeProjectName = dashboardRoot.querySelector('h1')?.textContent.trim() || 'Project';
    createOverlay();

    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) {
            cleanup();
            return false;
        }

        session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['dom-overlay'],
            optionalFeatures: ['local-floor'],
            domOverlay: { root: overlayRoot }
        });
        document.body.classList.add('creator-ar-session-active');

        canvas = document.createElement('canvas');
        canvas.className = 'creator-ar-canvas';
        document.body.append(canvas);
        gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL unavailable.');
        await gl.makeXRCompatible();

        const layer = new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true });
        session.updateRenderState({ baseLayer: layer, depthNear: 0.01, depthFar: 50 });
        try {
            refSpace = await session.requestReferenceSpace('local-floor');
        } catch {
            refSpace = await session.requestReferenceSpace('local');
        }
        initGl();

        const position = [0, 1.5, -PANEL_DISTANCE];
        let placed = false;
        const positionAttribute = gl.getAttribLocation(program, 'position');
        const textureAttribute = gl.getAttribLocation(program, 'texCoord');
        const mvpUniform = gl.getUniformLocation(program, 'mvp');
        const textureUniform = gl.getUniformLocation(program, 'tex');

        const draw = (_time, frame) => {
            if (frame.session !== session || !gl) return;
            frame.session.requestAnimationFrame(draw);
            const pose = frame.getViewerPose(refSpace);
            if (!pose) return;

            const viewer = pose.transform.matrix;
            if (!placed) {
                position[0] = viewer[12] - viewer[8] * PANEL_DISTANCE;
                position[1] = viewer[13] - viewer[9] * PANEL_DISTANCE;
                position[2] = viewer[14] - viewer[10] * PANEL_DISTANCE;
                placed = true;
            }
            const modelMatrix = makeViewerFacingMatrix(position, viewer);

            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clearDepth(1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.useProgram(program);
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(positionAttribute);
            gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, 20, 0);
            gl.enableVertexAttribArray(textureAttribute);
            gl.vertexAttribPointer(textureAttribute, 2, gl.FLOAT, false, 20, 12);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(textureUniform, 0);

            for (const view of pose.views) {
                const viewport = layer.getViewport(view);
                if (!viewport) continue;
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                const modelView = multiplyMat4(view.transform.inverse.matrix, modelMatrix);
                gl.uniformMatrix4fv(mvpUniform, false, multiplyMat4(view.projectionMatrix, modelView));
                gl.drawArrays(gl.TRIANGLES, 0, 6);
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
