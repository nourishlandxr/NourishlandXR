/**
 * TRY IT NOW — V1 Final Flow
 * Simple AR placement demo. No WebGL menu panels. No plant library.
 * Tap → place marker → name it → done.
 */

const PLANTS = [
    { commonName: 'Banana Cavendish', scientificName: 'Musa acuminata', summary: 'A productive tropical banana grown for its familiar sweet fruit and broad sheltering leaves.', family: 'Musaceae', origin: 'Southeast Asia', uses: ['Food', 'Cooking', 'Dessert'] },
    { commonName: 'Lemon Drop Garcinia', scientificName: 'Garcinia intermedia', summary: 'A compact tropical fruit tree with bright yellow fruit and a pleasantly sharp, citrus-like flavour.', family: 'Clusiaceae', origin: 'Central America', uses: ['Food', 'Flavour'] },
    { commonName: 'Myoga Ginger', scientificName: 'Zingiber mioga', summary: 'A shade-loving perennial ginger valued for its aromatic flower buds and young shoots.', family: 'Zingiberaceae', origin: 'East Asia', uses: ['Culinary', 'Medicinal'] },
    { commonName: 'Jackfruit', scientificName: 'Artocarpus heterophyllus', summary: 'A vigorous tropical tree producing exceptionally large fruit with sweet edible bulbs.', family: 'Moraceae', origin: 'South and Southeast Asia', uses: ['Food', 'Cooking'] }
];
let SAMPLE = PLANTS[1];

let demoSession = null;
let demoApp = null;
let demoCanvas = null;
let demoGl = null;
let demoRefSpace = null;
let demoHitSource = null;
let latestHitMatrix = null;
let placedMarkers = [];
let finishingDemo = false;
let lastViewerPoseForSelect = null;

// Shared GL
let quadProgram = null;
let quadBuffer = null;
let quadTextures = {};

// Breathing circle
let breathingEl = null;

const MARKER_SIZE = 0.18;

// ─── Helper: inject keyframes once ───
if (!document.getElementById('tryItNowStyle')) {
    const s = document.createElement('style');
    s.id = 'tryItNowStyle';
    s.textContent = `
        @keyframes tryit-breathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.08);opacity:1}}
        @keyframes tryit-fade-in{from{opacity:0}to{opacity:1}}
        @keyframes tryit-slide-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .tryit-breathing-circle{width:80px;height:80px;border:3px solid rgba(220,239,149,.9);border-radius:50%;box-shadow:0 0 40px rgba(220,239,149,.3);animation:tryit-breathe 2s ease-in-out infinite;cursor:pointer;transition:transform .15s}
        .tryit-breathing-circle:active{transform:scale(.9)}
        .tryit-overlay{position:fixed;z-index:2147483646;display:grid;place-items:center;pointer-events:none;animation:tryit-fade-in .3s ease-out}
        .tryit-overlay>*{pointer-events:auto}
        .tryit-card{position:fixed;z-index:2147483647;width:90vw;max-width:380px;background:rgba(248,250,244,.97);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden;animation:tryit-slide-up .25s ease-out}
        .tryit-card-header{background:rgba(20,55,34,.9);color:#fff;padding:12px 16px;font-weight:600;font-size:.85rem}
        .tryit-card-body{padding:18px 20px;display:grid;gap:12px}
        .tryit-card-body h2{margin:0;font-size:1.1rem}
        .tryit-card-body p{margin:0;color:#4a5550;font-size:.88rem;line-height:1.5}
        .tryit-choice{display:grid;gap:6px}
        .tryit-choice button{width:100%;min-height:48px;text-align:left;padding:10px 14px;border:1px solid #d4d8d4;border-radius:10px;background:#f6f7f4;cursor:pointer;font-size:.9rem}
        .tryit-choice button:hover{border-color:#2f6d42;background:#edf4e9}
        .tryit-card-body .field{display:grid;gap:4px}
        .tryit-card-body .field input{padding:10px 12px;border:1px solid #cdd2cd;border-radius:8px;font-size:.9rem}
        .tryit-card-body .button-row{display:flex;gap:8px;margin-top:4px}
        .tryit-card-body .button-row button{min-height:38px;padding:6px 12px;border-radius:8px;border:1px solid #cdd2cd;background:transparent;cursor:pointer;font-size:.82rem}
        .tryit-card-body .button-row button.primary{border-color:#2f6d42;background:#2f6d42;color:#fff}
        .tryit-exit{position:fixed;top:max(12px,env(safe-area-inset-top));right:12px;z-index:2147483646;padding:6px 12px;border:1px solid rgba(255,255,255,.6);border-radius:8px;background:rgba(0,0,0,.6);color:#fff;font-size:.78rem;cursor:pointer;pointer-events:auto}
        .tryit-guide{position:fixed;left:50%;top:calc(50% + 52px);transform:translateX(-50%);z-index:2147483646;color:rgba(255,255,255,.92);font-size:.9rem;font-weight:600;text-shadow:0 2px 8px rgba(0,0,0,.5);text-align:center;pointer-events:none}
    `;
    document.documentElement.append(s);
}

function showBreathingCircle() {
    hideBreathingCircle();
    breathingEl = document.createElement('div');
    breathingEl.className = 'tryit-overlay';
    breathingEl.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%);width:80px;height:80px;';
    breathingEl.innerHTML = '<div class="tryit-breathing-circle" id="tryitTapTarget"></div>';
    document.documentElement.append(breathingEl);
}

function hideBreathingCircle() {
    if (breathingEl) { breathingEl.remove(); breathingEl = null; }
}

function showGuideText(text) {
    let el = document.getElementById('tryitGuide');
    if (!el) {
        el = document.createElement('div');
        el.id = 'tryitGuide';
        el.className = 'tryit-guide';
        document.documentElement.append(el);
    }
    el.textContent = text;
}

function hideGuideText() {
    document.getElementById('tryitGuide')?.remove();
}

function showExitButton() {
    let el = document.getElementById('tryitExit');
    if (!el) {
        el = document.createElement('button');
        el.id = 'tryitExit';
        el.className = 'tryit-exit';
        el.textContent = 'Exit AR';
        el.addEventListener('click', finishDemo);
        document.documentElement.append(el);
    }
}

function showCard(html) {
    const existing = document.getElementById('tryitCard');
    if (existing) existing.remove();
    const card = document.createElement('div');
    card.id = 'tryitCard';
    card.className = 'tryit-card';
    card.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%);';
    card.innerHTML = html;
    document.documentElement.append(card);
    return card;
}

function hideCard() {
    document.getElementById('tryitCard')?.remove();
}

// ─── Show type selection after placement ───
function showTypeSelector(markerIndex) {
    showCard(`
        <div class="tryit-card-header">Marker placed</div>
        <div class="tryit-card-body">
            <h2>What is this marker?</h2>
            <div class="tryit-choice">
                <button data-type="plant">🌱 Plant</button>
                <button data-type="note">✎ Note</button>
                <button data-type="poi">◆ Point of Interest</button>
            </div>
        </div>
    `);
    document.querySelectorAll('.tryit-choice button').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            hideCard();
            showNameInput(markerIndex, type);
        });
    });
}

// ─── Show name input after type selection ───
function showNameInput(markerIndex, type) {
    const typeLabels = { plant: 'Plant', note: 'Note', poi: 'Point of Interest' };
    const defaultNames = { plant: 'New Plant', note: 'New Note', poi: 'New Point' };
    const label = typeLabels[type] || 'Marker';
    const defName = defaultNames[type] || 'New Marker';
    showCard(`
        <div class="tryit-card-header">Name this ${label}</div>
        <div class="tryit-card-body">
            <div class="field">
                <label style="font-size:.8rem;font-weight:600;color:#394039">Marker name</label>
                <input id="tryitNameInput" value="${defName}" autocomplete="off" />
            </div>
            <p id="tryitNameError" style="color:#c43;font-size:.78rem;min-height:1em"></p>
            <div class="button-row">
                <button id="tryitNameCancel">Cancel</button>
                <button class="primary" id="tryitNameSave">Save</button>
            </div>
        </div>
    `);
    document.getElementById('tryitNameInput')?.focus();
    document.getElementById('tryitNameInput')?.select();
    document.getElementById('tryitNameSave').addEventListener('click', () => saveName(markerIndex, type));
    document.getElementById('tryitNameCancel').addEventListener('click', () => {
        hideCard();
        showBreathingCircle();
        showGuideText('Tap to place a marker');
    });
}

function saveName(markerIndex, type) {
    const input = document.getElementById('tryitNameInput');
    const error = document.getElementById('tryitNameError');
    let name = (input?.value || '').trim();
    if (!name) { if (error) error.textContent = 'Name is required.'; return; }

    // Auto-suffix if name already used
    const usedNames = placedMarkers.map(m => m.name);
    if (usedNames.includes(name)) {
        let suffix = 1;
        while (usedNames.includes(`${name} (${suffix})`)) suffix++;
        name = `${name} (${suffix})`;
    }

    placedMarkers[markerIndex].name = name;
    placedMarkers[markerIndex].type = type;

    hideCard();
    // Redraw marker with new name
    rebuildMarkerTexture(markerIndex);

    if (placedMarkers.length === 1) {
        // V1 completion message after first marker
        setTimeout(() => showCompletionMessage(), 400);
    } else {
        showBreathingCircle();
        showGuideText('Tap to place another marker');
    }
}

function rebuildMarkerTexture(index) {
    const marker = placedMarkers[index];
    if (!marker) return;
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(20,55,34,.88)';
    ctx.beginPath(); ctx.roundRect(0, 0, 300, 120, 16); ctx.fill();
    ctx.fillStyle = '#dcef95';
    ctx.beginPath(); ctx.arc(40, 60, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#173522';
    ctx.font = '700 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(marker.type === 'plant' ? '🌱' : marker.type === 'note' ? '✎' : '◆', 40, 66);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = '700 18px sans-serif';
    ctx.fillText(marker.name, 70, 52);
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.font = 'italic 14px sans-serif';
    ctx.fillText({ plant: 'Plant Marker', note: 'Note', poi: 'Point of Interest' }[marker.type] || 'Marker', 70, 78);

    if (demoGl && quadTextures['marker_' + index]) {
        demoGl.deleteTexture(quadTextures['marker_' + index]);
    }
    const tex = demoGl.createTexture();
    demoGl.bindTexture(demoGl.TEXTURE_2D, tex);
    demoGl.pixelStorei(demoGl.UNPACK_FLIP_Y_WEBGL, false);
    demoGl.texImage2D(demoGl.TEXTURE_2D, 0, demoGl.RGBA, demoGl.RGBA, demoGl.UNSIGNED_BYTE, canvas);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_MIN_FILTER, demoGl.LINEAR);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_MAG_FILTER, demoGl.LINEAR);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_WRAP_S, demoGl.CLAMP_TO_EDGE);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_WRAP_T, demoGl.CLAMP_TO_EDGE);
    quadTextures['marker_' + index] = tex;
}

// ─── V1 completion message ───
function showCompletionMessage() {
    showCard(`
        <div class="tryit-card-header" style="background:#1a5c2e">Try It Now — Complete</div>
        <div class="tryit-card-body" style="text-align:center">
            <p style="font-size:1rem;line-height:1.6;color:#2a4a34">This is a placement app based on location, space and GPS information. It helps you rediscover this marker when needed.</p>
            <p style="font-size:.9rem;color:#5a6f62;margin-top:6px"><strong>Version 1.0</strong> — thank you for trying.</p>
            <div class="button-row" style="justify-content:center;margin-top:8px">
                <button class="primary" id="tryitReturnToWelcome" style="padding:10px 24px;font-size:.95rem">Return to Welcome</button>
            </div>
        </div>
    `);
    document.getElementById('tryitReturnToWelcome').addEventListener('click', finishDemo);
}

// ─── WebGL program + buffer setup ───
function setupQuadRenderer(gl) {
    const vs = 'attribute vec3 p;attribute vec2 t;uniform mat4 mvp;varying vec2 uv;void main(){gl_Position=mvp*vec4(p,1.0);uv=t;}';
    const fs = 'precision mediump float;varying vec2 uv;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,uv);}';
    const mk = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 0, 0, 1,   1, -1, 0, 1, 1,   1,  1, 0, 1, 0,
        -1, -1, 0, 0, 1,   1,  1, 0, 1, 0,  -1,  1, 0, 0, 0
    ]), gl.STATIC_DRAW);
    return { program: p, buffer: buf };
}

// ─── Compute upright billboard matrix that faces camera ───
function billboardMatrix(pos, camPos) {
    const cx = pos[0], cy = pos[1], cz = pos[2];
    let fx = camPos[0] - cx, fy = camPos[1] - cy, fz = camPos[2] - cz;
    const fl = Math.hypot(fx, fy, fz) || 1;
    fx /= fl; fy /= fl; fz /= fl;
    const upY = 1;
    let rx = fy * upY, ry = -fx * upY, rz = 0;
    const rl = Math.hypot(rx, ry, rz) || 1;
    rx /= rl; ry /= rl;
    let ux = ry * fz, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
    return new Float32Array([rx, ux, fx, 0, ry, uy, fy, 0, rz, uz, fz, 0, cx, cy, cz, 1]);
}

// ─── Draw one marker quad for a given view ───
function drawMarkerQuad(gl, view, projMatrix, worldPos, tex, size) {
    const model = billboardMatrix(worldPos, [view.transform.position.x, view.transform.position.y, view.transform.position.z]);
    const vm = view.transform.inverse.matrix;
    const sm = new Float32Array([size, 0, 0, 0, 0, size * 0.4, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const scaled = new Float32Array(16);
    for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++)
            scaled[c * 4 + r] = sm[r] * model[c * 4] + sm[4 + r] * model[c * 4 + 1] + sm[8 + r] * model[c * 4 + 2] + sm[12 + r] * model[c * 4 + 3];
    const mv = new Float32Array(16);
    for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++)
            mv[c * 4 + r] = vm[r] * scaled[c * 4] + vm[4 + r] * scaled[c * 4 + 1] + vm[8 + r] * scaled[c * 4 + 2] + vm[12 + r] * scaled[c * 4 + 3];
    const mvp = new Float32Array(16);
    for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++)
            mvp[c * 4 + r] = projMatrix[r] * mv[c * 4] + projMatrix[4 + r] * mv[c * 4 + 1] + projMatrix[8 + r] * mv[c * 4 + 2] + projMatrix[12 + r] * mv[c * 4 + 3];

    gl.useProgram(quadProgram.program);
    gl.uniformMatrix4fv(gl.getUniformLocation(quadProgram.program, 'mvp'), false, mvp);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(gl.getAttribLocation(quadProgram.program, 'p'));
    gl.vertexAttribPointer(gl.getAttribLocation(quadProgram.program, 'p'), 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(gl.getAttribLocation(quadProgram.program, 't'));
    gl.vertexAttribPointer(gl.getAttribLocation(quadProgram.program, 't'), 2, gl.FLOAT, false, 20, 12);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(quadProgram.program, 'tex'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// ─── Open launcher dialog ───
export function openTemporaryArDemoWindow(app) {
    document.getElementById('temporaryDemoLauncher')?.remove();
    const launcher = document.createElement('div');
    launcher.id = 'temporaryDemoLauncher';
    launcher.className = 'temporary-demo-launcher';
    launcher.innerHTML = `<section class="temporary-launcher-window tutorial-fade-in" role="dialog" aria-modal="true" aria-labelledby="temporaryLauncherTitle"><header><span class="launcher-dots" aria-hidden="true"><i></i><i></i><i></i></span><strong>NourishlandXR · AR Tutorial</strong><button type="button" id="temporaryLauncherClose" aria-label="Close demo window">×</button></header><div class="temporary-launcher-body"><p class="welcome-label">AUGMENTED REALITY</p><h2 id="temporaryLauncherTitle">This is AR.</h2><p>Augmented reality adds useful digital information to the real world around you, creating an immersive way to explore and interact.</p><p>Press the button below to see how spatial content works in the real world.</p><div class="button-row"><button type="button" id="temporaryLauncherCancel">Go back</button><button class="primary" type="button" id="temporaryLauncherStart">Proceed</button></div></div></section>`;
    document.body.append(launcher);
    const close = () => launcher.remove();
    document.getElementById('temporaryLauncherClose').addEventListener('click', close);
    document.getElementById('temporaryLauncherCancel').addEventListener('click', close);
    document.getElementById('temporaryLauncherStart').addEventListener('click', () => { close(); startTemporaryArDemo(app); });
}

export async function startTemporaryArDemo(app) {
    demoApp = app;
    const immersive = await tryImmersiveDemo();
    if (!immersive) {
        // Fallback to simulated on-screen demo
        renderSimulated();
    }
}

function renderSimulated() {
    // Simple non-AR card-based demo
    hideBreathingCircle();
    hideGuideText();
    showCard(`
        <div class="tryit-card-header">Try It Now</div>
        <div class="tryit-card-body">
            <p>AR is not available on this device. In AR mode, you would see a breathing circle — tapping it places a marker in real space.</p>
            <p style="color:#5a6f62;font-size:.82rem">The full experience requires a device with WebXR immersive-ar support over HTTPS.</p>
            <div class="button-row" style="justify-content:center">
                <button class="primary" onclick="window.renderLaunchScreen()">Return to Welcome</button>
            </div>
        </div>
    `);
}

// ─── Try immersive AR ───
async function tryImmersiveDemo() {
    if (!navigator.xr || !window.isSecureContext) return false;
    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) return false;

        demoSession = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['local-floor']
        });

        demoCanvas = document.createElement('canvas');
        demoCanvas.className = 'temporary-demo-xr-canvas';
        document.body.append(demoCanvas);

        const gl = demoCanvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL unavailable');
        await gl.makeXRCompatible();
        demoGl = gl;

        demoSession.updateRenderState({
            baseLayer: new XRWebGLLayer(demoSession, gl, { alpha: true, antialias: true, depth: true }),
            depthNear: 0.01, depthFar: 50
        });

        try { demoRefSpace = await demoSession.requestReferenceSpace('local-floor'); }
        catch { demoRefSpace = await demoSession.requestReferenceSpace('local'); }

        const viewerSpace = await demoSession.requestReferenceSpace('viewer');
        demoHitSource = await demoSession.requestHitTestSource({ space: viewerSpace });

        quadProgram = setupQuadRenderer(gl);
        quadBuffer = quadProgram.buffer;

        finishingDemo = false;

        // Show breathing circle and guide text
        showBreathingCircle();
        showGuideText('Tap the circle to place a marker');
        showExitButton();

        // Draw loop
        demoSession.requestAnimationFrame(function draw(time, frame) {
            if (frame.session !== demoSession || !demoGl) return;
            demoSession.requestAnimationFrame(draw);

            // Get viewer pose for select event cache
            const pose = frame.getViewerPose(demoRefSpace);
            if (pose) lastViewerPoseForSelect = pose;

            // Get hit test results
            const hit = demoHitSource ? frame.getHitTestResults(demoHitSource)[0] : null;
            const hitPose = hit?.getPose(demoRefSpace);
            latestHitMatrix = hitPose ? new Float32Array(hitPose.transform.matrix) : null;

            // Update breathing circle appearance based on surface availability
            if (breathingEl) {
                const target = breathingEl.querySelector('.tryit-breathing-circle');
                if (target) {
                    if (latestHitMatrix) {
                        target.style.borderColor = '#8befa2';
                        target.style.boxShadow = '0 0 40px rgba(220,239,149,.3), 0 0 60px rgba(139,239,162,.2)';
                    } else {
                        target.style.borderColor = 'rgba(220,239,149,.9)';
                        target.style.boxShadow = '0 0 40px rgba(220,239,149,.3)';
                    }
                }
            }

            // Render
            const layer = demoSession.renderState.baseLayer;
            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clearDepth(1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            if (pose) {
                for (const view of pose.views) {
                    const vp = layer.getViewport(view);
                    gl.viewport(vp.x, vp.y, vp.width, vp.height);
                    // Draw all placed markers
                    for (const marker of placedMarkers) {
                        const tex = quadTextures['marker_' + marker.index];
                        if (tex) drawMarkerQuad(gl, view, view.projectionMatrix, marker.worldPos, tex, MARKER_SIZE);
                    }
                }
            }
        });

        // Handle tapping the breathing circle
        document.addEventListener('click', function tryitTapHandler(e) {
            const target = e.target.closest('.tryit-breathing-circle, #tryitTapTarget');
            if (!target) return;
            if (!latestHitMatrix) {
                showGuideText('Keep moving to find a surface');
                return;
            }
            // Place marker at hit position
            const pos = [latestHitMatrix[12], latestHitMatrix[13], latestHitMatrix[14]];
            const index = placedMarkers.length;
            placedMarkers.push({ index, worldPos: pos, name: 'New Marker', type: 'poi' });

            // Create initial marker texture
            const canvas = document.createElement('canvas');
            canvas.width = 300; canvas.height = 120;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(20,55,34,.88)';
            ctx.beginPath(); ctx.roundRect(0, 0, 300, 120, 16); ctx.fill();
            ctx.fillStyle = '#dcef95';
            ctx.beginPath(); ctx.arc(40, 60, 20, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#173522';
            ctx.font = '700 16px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('◆', 40, 66);
            ctx.textAlign = 'left';
            ctx.fillStyle = '#fff';
            ctx.font = '700 18px sans-serif';
            ctx.fillText('New Marker', 70, 52);
            ctx.fillStyle = 'rgba(255,255,255,.78)';
            ctx.font = 'italic 14px sans-serif';
            ctx.fillText('Placed', 70, 78);

            const tex = demoGl.createTexture();
            demoGl.bindTexture(demoGl.TEXTURE_2D, tex);
            demoGl.pixelStorei(demoGl.UNPACK_FLIP_Y_WEBGL, false);
            demoGl.texImage2D(demoGl.TEXTURE_2D, 0, demoGl.RGBA, demoGl.RGBA, demoGl.UNSIGNED_BYTE, canvas);
            demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_MIN_FILTER, demoGl.LINEAR);
            demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_MAG_FILTER, demoGl.LINEAR);
            demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_WRAP_S, demoGl.CLAMP_TO_EDGE);
            demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_WRAP_T, demoGl.CLAMP_TO_EDGE);
            quadTextures['marker_' + index] = tex;

            // Hide breathing circle, show type selector
            hideBreathingCircle();
            hideGuideText();
            showTypeSelector(index);
        });

        demoSession.addEventListener('end', () => {
            cleanupDemo();
            if (!finishingDemo) window.renderLaunchScreen();
            finishingDemo = false;
        });

        return true;
    } catch (e) {
        console.error('[TryItNow]', e);
        cleanupDemo();
        return false;
    }
}

function cleanupDemo() {
    hideBreathingCircle();
    hideGuideText();
    hideCard();
    document.getElementById('tryitExit')?.remove();
    document.getElementById('tryitCard')?.remove();
    // Delete all textures
    if (demoGl) {
        for (const key in quadTextures) {
            if (quadTextures[key]) demoGl.deleteTexture(quadTextures[key]);
        }
    }
    quadTextures = {};
    placedMarkers = [];
    demoHitSource?.cancel?.();
    demoHitSource = null;
    demoRefSpace = null;
    latestHitMatrix = null;
    demoCanvas?.remove();
    demoCanvas = null;
    demoGl = null;
    lastViewerPoseForSelect = null;
}

function finishDemo() {
    finishingDemo = true;
    const session = demoSession;
    demoSession = null;
    cleanupDemo();
    if (session) session.end().catch(() => {});
    document.getElementById('tryitCard')?.remove();
    window.renderLaunchScreen();
}

// ─── Legacy exports required by main.js ───
// (renderLaunchScreen accessed via window.renderLaunchScreen)
