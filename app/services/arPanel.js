/**
 * arPanel.js — Consolidated AR panel renderer.
 * Shared by arNote.js (explorer AR) and arMode.js (creator AR).
 * 
 * Renders a textured quad as a billboard that always faces the viewer.
 * Uses proper UV orientation: V=0 = panel bottom, V=1 = panel top
 * with UNPACK_FLIP_Y_WEBGL=true (canvas Y=0 → texture top).
 * Backface culling enabled — only front face renders.
 */

let panelSession = null;
let panelGl = null;
let panelRefSpace = null;
let panelProgram = null;
let panelBuffer = null;
let panelTexture = null;
let panelCanvas = null;
let panelCtx = null;
let panelWidth = 0;
let panelHeight = 0;

// Cached GL locations
let pLoc, tLoc, mvpLoc;

const CANVAS_W = 1200;
const CANVAS_H = 800;

/** Create a textured quad program + buffer. */
export function initPanelRenderer(gl) {
    const vs = 'attribute vec3 position;attribute vec2 texCoord;uniform mat4 mvp;varying vec2 uv;void main(){gl_Position=mvp*vec4(position,1.0);uv=texCoord;}';
    const fs = 'precision mediump float;varying vec2 uv;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,uv);}';
    const mk = (t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh;};
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // With UNPACK_FLIP_Y_WEBGL=true: canvas Y=0 (title top) → texture V=0
    // Quad top (y=+1) must use V=0 to show title at top of panel
    // Quad bottom (y=-1) must use V=1 to show canvas bottom
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 0, 0, 1,
         1, -1, 0, 1, 1,
         1,  1, 0, 1, 0,
        -1, -1, 0, 0, 1,
         1,  1, 0, 1, 0,
        -1,  1, 0, 0, 0
    ]), gl.STATIC_DRAW);
    
    return { program: p, buffer: buf, pLoc: gl.getAttribLocation(p, 'position'), tLoc: gl.getAttribLocation(p, 'texCoord'), mvpLoc: gl.getUniformLocation(p, 'mvp') };
}

/** Create a texture from an offscreen canvas. */
export function createPanelTexture(gl, drawFn) {
    if (!panelCanvas) {
        panelCanvas = document.createElement('canvas');
        panelCanvas.width = CANVAS_W;
        panelCanvas.height = CANVAS_H;
        panelCtx = panelCanvas.getContext('2d');
    }
    drawFn(panelCtx, CANVAS_W, CANVAS_H);
    
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, panelCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
}

/** Compute a billboard matrix that faces the viewer.
 *  The quad is placed at `worldPos` and rotated to face `cameraPos`.
 */
export function billboardMatrix(worldPos, cameraPos) {
    const cx = worldPos[0], cy = worldPos[1], cz = worldPos[2];
    const ex = cameraPos[0], ey = cameraPos[1], ez = cameraPos[2];
    
    // Forward = normalize(worldPos → cameraPos)
    let fx = ex - cx, fy = ey - cy, fz = ez - cz;
    const flen = Math.hypot(fx, fy, fz);
    if (flen < 0.001) { fx = 0; fy = 0; fz = -1; }
    else { fx /= flen; fy /= flen; fz /= flen; }
    
    // World up = (0, 1, 0)
    // Right = cross(forward, up) — but forward may be near up at extreme angles
    let rx, ry, rz;
    const upY = 1;
    // Cross(forward, up)
    rx = fy * upY - fz * 0;
    ry = fz * 0 - fx * upY;
    rz = fx * 0 - fy * 0;
    // Normalize right
    const rlen = Math.hypot(rx, ry, rz);
    if (rlen < 0.001) { rx = 1; ry = 0; rz = 0; }
    else { rx /= rlen; ry /= rlen; rz /= rlen; }
    
    // New up = cross(right, forward)
    let ux = ry * fz - rz * fy;
    let uy = rz * fx - rx * fz;
    let uz = rx * fy - ry * fx;
    
    // The quad's front face (local +Z) must point TOWARD the camera.
    // f = direction from quad TO camera, so use +f as the Z column.
    return new Float32Array([
        rx, ux, fx, 0,
        ry, uy, fy, 0,
        rz, uz, fz, 0,
        cx, cy, cz, 1
    ]);
}

/** Render the panel for one view. */
export function drawPanel(gl, viewMatrix, projMatrix, modelMatrix, tex, buf, pLoc, tLoc, mvpLoc, quadW, quadH) {
    if (!tex || !modelMatrix) return;
    
    // Scale quad from unit to actual dimensions
    const scale = new Float32Array([
        quadW, 0, 0, 0,
        0, quadH, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    
    // Combined: model = scale * billboard
    const sm = new Float32Array(16);
    for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++)
            sm[c * 4 + r] = scale[r] * modelMatrix[c * 4] + scale[4 + r] * modelMatrix[c * 4 + 1] + scale[8 + r] * modelMatrix[c * 4 + 2] + scale[12 + r] * modelMatrix[c * 4 + 3];
    
    // Model-view: viewMatrix * model
    const mv = new Float32Array(16);
    for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++)
            mv[c * 4 + r] = viewMatrix[r] * sm[c * 4] + viewMatrix[4 + r] * sm[c * 4 + 1] + viewMatrix[8 + r] * sm[c * 4 + 2] + viewMatrix[12 + r] * sm[c * 4 + 3];
    
    // MVP: projection * model-view
    const mvp = new Float32Array(16);
    for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++)
            mvp[c * 4 + r] = projMatrix[r] * mv[c * 4] + projMatrix[4 + r] * mv[c * 4 + 1] + projMatrix[8 + r] * mv[c * 4 + 2] + projMatrix[12 + r] * mv[c * 4 + 3];
    
    gl.uniformMatrix4fv(mvpLoc, false, mvp);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(pLoc);
    gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(tLoc);
    gl.vertexAttribPointer(tLoc, 2, gl.FLOAT, false, 20, 12);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'tex'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/** Full-frame AR panel render setup + billboard call.
 *  Call this from your XR frame callback.
 */
export function renderARPanel(gl, frame, refSpace, tex, opts = {}) {
    const viewerPose = frame.getViewerPose(refSpace);
    if (!viewerPose) return;
    
    const session = frame.session;
    const layer = session.renderState.baseLayer;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    const pLoc = gl.getAttribLocation(opts.program, 'position');
    const tLoc = gl.getAttribLocation(opts.program, 'texCoord');
    const mvpLoc = gl.getUniformLocation(opts.program, 'mvp');
    
    gl.useProgram(opts.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, opts.buffer);
    gl.enableVertexAttribArray(pLoc);
    gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(tLoc);
    gl.vertexAttribPointer(tLoc, 2, gl.FLOAT, false, 20, 12);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(opts.program, 'tex'), 0);
    
    // Camera position from first view
    const camPos = viewerPose.transform.position;
    const camera = [camPos.x, camPos.y, camPos.z];
    
    const worldPos = opts.position || [0, 1.5, -2];
    const quadW = opts.width || 0.92;
    const quadH = opts.height || 0.65;
    
    const model = billboardMatrix(worldPos, camera);
    
    // Scale quad
    const sm = new Float32Array([
        quadW, 0, 0, 0,
        0, quadH, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    
    for (const view of viewerPose.views) {
        const vp = layer.getViewport(view);
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        
        const viewMatrix = view.transform.inverse.matrix;
        const projMatrix = view.projectionMatrix;
        
        // mv = viewMatrix * scale * billboard
        const scaled = new Float32Array(16);
        for (let c = 0; c < 4; c++)
            for (let r = 0; r < 4; r++)
                scaled[c * 4 + r] = sm[r] * model[c * 4] + sm[4 + r] * model[c * 4 + 1] + sm[8 + r] * model[c * 4 + 2] + sm[12 + r] * model[c * 4 + 3];
        
        const mv = new Float32Array(16);
        for (let c = 0; c < 4; c++)
            for (let r = 0; r < 4; r++)
                mv[c * 4 + r] = viewMatrix[r] * scaled[c * 4] + viewMatrix[4 + r] * scaled[c * 4 + 1] + viewMatrix[8 + r] * scaled[c * 4 + 2] + viewMatrix[12 + r] * scaled[c * 4 + 3];
        
        const mvp = new Float32Array(16);
        for (let c = 0; c < 4; c++)
            for (let r = 0; r < 4; r++)
                mvp[c * 4 + r] = projMatrix[r] * mv[c * 4] + projMatrix[4 + r] * mv[c * 4 + 1] + projMatrix[8 + r] * mv[c * 4 + 2] + projMatrix[12 + r] * mv[c * 4 + 3];
        
        gl.uniformMatrix4fv(mvpLoc, false, mvp);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}