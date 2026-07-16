const PLANTS = [
    { commonName: 'Banana Cavendish', scientificName: 'Musa acuminata', summary: 'A productive tropical banana grown for its familiar sweet fruit and broad sheltering leaves.', family: 'Musaceae', origin: 'Southeast Asia' },
    { commonName: 'Lemon Drop Garcinia', scientificName: 'Garcinia intermedia', summary: 'A compact tropical fruit tree with bright yellow fruit and a pleasantly sharp, citrus-like flavour.', family: 'Clusiaceae', origin: 'Central America' },
    { commonName: 'Myoga Ginger', scientificName: 'Zingiber mioga', summary: 'A shade-loving perennial ginger valued for its aromatic flower buds and young shoots.', family: 'Zingiberaceae', origin: 'East Asia' },
    { commonName: 'Jackfruit', scientificName: 'Artocarpus heterophyllus', summary: 'A vigorous tropical tree producing exceptionally large fruit with sweet edible bulbs.', family: 'Moraceae', origin: 'South and Southeast Asia' }
];
let SAMPLE = PLANTS[1];
let markerName = 'My Plant';

let demoSession = null;
let demoApp = null;
let demoCanvas = null;
let demoGl = null;
let finishingDemo = false;
let demoRefSpace = null;
let demoHitSource = null;
let latestHitMatrix = null;
let placedMarker = null;
let demoProgram = null;
let demoBuffer = null;
let demoTexture = null;
let profileLinked = false;

function multiplyMat4(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column += 1) for (let row = 0; row < 4; row += 1) {
        out[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
    }
    return out;
}

function compileShader(type, source) {
    const shader = demoGl.createShader(type);
    demoGl.shaderSource(shader, source);
    demoGl.compileShader(shader);
    if (!demoGl.getShaderParameter(shader, demoGl.COMPILE_STATUS)) throw new Error(demoGl.getShaderInfoLog(shader) || 'AR shader compilation failed.');
    return shader;
}

function setupMarkerRenderer() {
    const vertex = compileShader(demoGl.VERTEX_SHADER, 'attribute vec3 position; attribute vec2 texCoord; uniform mat4 mvp; varying vec2 uv; void main(){ gl_Position=mvp*vec4(position,1.0); uv=texCoord; }');
    const fragment = compileShader(demoGl.FRAGMENT_SHADER, 'precision mediump float; varying vec2 uv; uniform sampler2D texture; void main(){ gl_FragColor=texture2D(texture,uv); }');
    demoProgram = demoGl.createProgram();
    demoGl.attachShader(demoProgram, vertex); demoGl.attachShader(demoProgram, fragment); demoGl.linkProgram(demoProgram);
    if (!demoGl.getProgramParameter(demoProgram, demoGl.LINK_STATUS)) throw new Error('AR marker renderer could not be linked.');
    demoBuffer = demoGl.createBuffer();
    demoGl.bindBuffer(demoGl.ARRAY_BUFFER, demoBuffer);
    demoGl.bufferData(demoGl.ARRAY_BUFFER, new Float32Array([-.34,-.12,0,0,1, .34,-.12,0,1,1, .34,.12,0,1,0, -.34,-.12,0,0,1, .34,.12,0,1,0, -.34,.12,0,0,0]), demoGl.STATIC_DRAW);
    const canvas = document.createElement('canvas'); canvas.width = 680; canvas.height = 240;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(20,55,34,.88)'; context.beginPath(); context.roundRect(10, 10, 660, 185, 28); context.fill();
    context.fillStyle = '#dcef95'; context.beginPath(); context.arc(75, 102, 38, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#173522'; context.font = '700 34px sans-serif'; context.textAlign = 'center'; context.fillText('✿', 75, 114);
    context.textAlign = 'left'; context.fillStyle = '#fff'; context.font = '700 38px sans-serif'; context.fillText(profileLinked ? SAMPLE.commonName : markerName, 132, 92);
    context.fillStyle = 'rgba(255,255,255,.78)'; context.font = 'italic 27px sans-serif'; context.fillText(profileLinked ? SAMPLE.scientificName : 'Unidentified plant marker', 132, 139);
    context.fillStyle = 'rgba(20,55,34,.88)'; context.beginPath(); context.moveTo(315,195); context.lineTo(365,195); context.lineTo(340,235); context.closePath(); context.fill();
    if (demoTexture) demoGl.deleteTexture(demoTexture);
    demoTexture = demoGl.createTexture(); demoGl.bindTexture(demoGl.TEXTURE_2D, demoTexture);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_MIN_FILTER, demoGl.LINEAR); demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_MAG_FILTER, demoGl.LINEAR);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_WRAP_S, demoGl.CLAMP_TO_EDGE); demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_WRAP_T, demoGl.CLAMP_TO_EDGE);
    demoGl.texImage2D(demoGl.TEXTURE_2D, 0, demoGl.RGBA, demoGl.RGBA, demoGl.UNSIGNED_BYTE, canvas);
}

export function openTemporaryArDemoWindow(app) {
    document.getElementById('temporaryDemoLauncher')?.remove();
    const launcher = document.createElement('div');
    launcher.id = 'temporaryDemoLauncher';
    launcher.className = 'temporary-demo-launcher';
    launcher.innerHTML = `<section class="temporary-launcher-window tutorial-fade-in" role="dialog" aria-modal="true" aria-labelledby="temporaryLauncherTitle"><header><span class="launcher-dots" aria-hidden="true"><i></i><i></i><i></i></span><strong>NourishlandXR · AR Tutorial</strong><button type="button" id="temporaryLauncherClose" aria-label="Close demo window">×</button></header><div class="temporary-launcher-body"><p class="welcome-label">AUGMENTED REALITY</p><h2 id="temporaryLauncherTitle">This is AR.</h2><p>Augmented reality adds useful digital information to the real world around you, creating an immersive way to explore and interact.</p><p>Press the button below to load your temporary dashboard. Nothing in this tutorial will be saved.</p><div class="button-row"><button type="button" id="temporaryLauncherCancel">Not now</button><button class="primary" type="button" id="temporaryLauncherStart">Open My Location Dashboard</button></div></div></section>`;
    document.body.append(launcher);
    const close = () => launcher.remove();
    document.getElementById('temporaryLauncherClose').addEventListener('click', close);
    document.getElementById('temporaryLauncherCancel').addEventListener('click', close);
    document.getElementById('temporaryLauncherStart').addEventListener('click', () => { close(); startTemporaryArDemo(app); });
}

function removeDemoCanvas() {
    demoHitSource?.cancel?.();
    demoHitSource = null;
    demoRefSpace = null;
    latestHitMatrix = null;
    placedMarker = null;
    demoProgram = null;
    demoBuffer = null;
    demoTexture = null;
    demoCanvas?.remove();
    demoCanvas = null;
    demoGl = null;
}

function finishDemo() {
    const session = demoSession;
    finishingDemo = true;
    demoSession = null;
    removeDemoCanvas();
    if (session) session.end().catch(() => {});
    window.renderLaunchScreen();
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function renderDashboard(markerPlaced = Boolean(placedMarker || document.getElementById('temporaryPlantMarker'))) {
    const card = document.getElementById('temporaryDemoCard');
    if (!card) return;
    card.innerHTML = `<p class="welcome-label">TUTORIAL · MY LOCATION</p><h1>My Location</h1><p>This is your dashboard. Here you can create markers, add information, build plant profiles and create relationships between things in your landscape.</p>${markerPlaced ? `<p class="tutorial-success">✓ “${escapeHtml(markerName)}” is tagged. Now open Plant List and identify it.</p>` : '<p>Is there a plant near you? Tag it with a temporary marker.</p>'}<div class="temporary-dashboard-menu"><button type="button" id="temporaryTagPlant"><strong>${markerPlaced ? 'Update Plant Marker' : 'Tag a Nearby Plant'}</strong><span>Place a marker in the real world</span></button><button type="button" id="temporaryPlantList" ${markerPlaced ? '' : 'disabled'}><strong>Plant List</strong><span>${markerPlaced ? 'Choose a plant profile' : 'Available after tagging a plant'}</span></button></div><div class="button-row"><button type="button" id="temporaryDemoExit">Return to Welcome</button></div>`;
    document.getElementById('temporaryTagPlant').addEventListener('click', renderTagPrompt);
    document.getElementById('temporaryPlantList').addEventListener('click', renderPlantList);
    document.getElementById('temporaryDemoExit').addEventListener('click', finishDemo);
}

function renderTagPrompt() {
    const card = document.getElementById('temporaryDemoCard');
    card.innerHTML = `<p class="welcome-label">STEP 1 · TAG A PLANT</p><h2>Is there a plant near you?</h2><p>Point at the ground beside it, give the marker a short name, then press Tag This Plant.</p><label class="field"><span>Marker name</span><input id="temporaryMarkerName" value="${escapeHtml(markerName)}" maxlength="40" /></label><p id="temporaryTagStatus" class="meta">${demoSession ? 'Move slowly until a surface is detected.' : 'Simulation will place the marker in the scene.'}</p><div class="button-row"><button type="button" id="temporaryTagBack">Back</button><button class="primary" type="button" id="temporaryTagConfirm">Tag This Plant</button></div>`;
    document.getElementById('temporaryTagBack').addEventListener('click', () => renderDashboard());
    document.getElementById('temporaryTagConfirm').addEventListener('click', tagPlant);
}

function tagPlant() {
    const input = document.getElementById('temporaryMarkerName');
    markerName = input?.value.trim() || 'My Plant';
    if (demoSession && !latestHitMatrix) { document.getElementById('temporaryTagStatus').textContent = 'No surface yet. Point at a floor or table and move slowly, then try again.'; return; }
    profileLinked = false;
    const stage = document.getElementById('temporaryDemoStage');
    if (demoSession) {
        placedMarker = { x: latestHitMatrix[12], y: latestHitMatrix[13] + .42, z: latestHitMatrix[14] };
        stage.innerHTML = '';
        setupMarkerRenderer();
    } else {
        stage.classList.add('has-marker');
        stage.innerHTML = `<button type="button" class="temporary-plant-marker" id="temporaryPlantMarker"><span aria-hidden="true">✿</span><strong>${escapeHtml(markerName)}</strong><small>Unidentified plant marker</small><i aria-hidden="true"></i></button>`;
    }
    renderDashboard(true);
}

function renderPlantList() {
    const card = document.getElementById('temporaryDemoCard');
    if (!placedMarker && !document.getElementById('temporaryPlantMarker')) return renderDashboard(false);
    card.innerHTML = `<p class="welcome-label">STEP 2 · PLANT LIST</p><h2>Choose the matching plant</h2><p>Select a shared plant profile. Watch your simple marker become useful plant knowledge.</p><div class="temporary-plant-choices">${PLANTS.map((plant, index) => `<button type="button" data-demo-plant="${index}"><strong>${plant.commonName}</strong><span><em>${plant.scientificName}</em></span></button>`).join('')}</div><div class="button-row"><button type="button" id="temporaryPlantListBack">Back to dashboard</button></div>`;
    card.querySelectorAll('[data-demo-plant]').forEach(button => button.addEventListener('click', () => selectPlantProfile(Number(button.dataset.demoPlant))));
    document.getElementById('temporaryPlantListBack').addEventListener('click', () => renderDashboard(true));
}

function selectPlantProfile(index) {
    SAMPLE = PLANTS[index] || PLANTS[1];
    profileLinked = true;
    if (demoSession) setupMarkerRenderer();
    else {
        const stage = document.getElementById('temporaryDemoStage');
        stage.innerHTML = `<button type="button" class="temporary-plant-marker" id="temporaryPlantMarker"><span aria-hidden="true">✿</span><strong>${SAMPLE.commonName}</strong><small>${SAMPLE.scientificName}</small><i aria-hidden="true"></i></button>`;
        document.getElementById('temporaryPlantMarker').addEventListener('click', showProfile);
    }
    showProfile();
}

function showProfile() {
    const card = document.getElementById('temporaryDemoCard');
    if (!card) return;
    card.innerHTML = `<p class="welcome-label">PROFILE CREATED · DEMO COMPLETE</p><h2>${SAMPLE.commonName}</h2><p><em>${SAMPLE.scientificName}</em></p><p>${SAMPLE.summary}</p><dl class="temporary-demo-profile"><div><dt>Family</dt><dd>${SAMPLE.family}</dd></div><div><dt>Origin</dt><dd>${SAMPLE.origin}</dd></div></dl><p class="tutorial-success">Your spatial marker is now connected to a reusable plant profile. This is the end of the demo.</p><div class="button-row"><button type="button" id="temporaryDemoDashboard">View Dashboard</button><button class="primary" type="button" id="temporaryDemoFinish">Finish Demo</button></div>`;
    document.getElementById('temporaryDemoDashboard').addEventListener('click', () => renderDashboard(true));
    document.getElementById('temporaryDemoFinish').addEventListener('click', finishDemo);
}

function showPlacedMarker() {
    const stage = document.getElementById('temporaryDemoStage');
    const card = document.getElementById('temporaryDemoCard');
    if (!stage || !card) return;
    if (demoSession) {
        if (!latestHitMatrix) { card.querySelector('p:last-of-type').textContent = 'Move slowly and point at a floor or table until a surface is found.'; return; }
        placedMarker = { x: latestHitMatrix[12], y: latestHitMatrix[13] + .42, z: latestHitMatrix[14] };
        stage.innerHTML = '';
        card.innerHTML = `<p class="welcome-label">Spatial marker placed</p><h2>${SAMPLE.commonName}</h2><p>The plant is fixed to the detected surface. Aim at the marker and tap it, or open the profile below.</p><div class="button-row"><button type="button" id="temporaryDemoProfile">View Plant Profile</button><button class="primary" type="button" id="temporaryDemoFinish">Finish Demo</button></div>`;
        document.getElementById('temporaryDemoProfile').addEventListener('click', showProfile);
        document.getElementById('temporaryDemoFinish').addEventListener('click', finishDemo);
        return;
    }
    stage.classList.add('has-marker');
    stage.innerHTML = `<button type="button" class="temporary-plant-marker" id="temporaryPlantMarker" aria-label="Open Lemon Drop Garcinia"><span aria-hidden="true">✿</span><strong>${SAMPLE.commonName}</strong><small>Tap to explore</small><i aria-hidden="true"></i></button>`;
    card.innerHTML = `<p class="welcome-label">Marker placed</p><h2>${SAMPLE.commonName}</h2><p>Tap the plant marker to discover more.</p><div class="button-row"><button type="button" id="temporaryDemoProfile">View Plant Profile</button><button class="primary" type="button" id="temporaryDemoFinish">Finish Demo</button></div>`;
    document.getElementById('temporaryPlantMarker').addEventListener('click', showProfile);
    document.getElementById('temporaryDemoProfile').addEventListener('click', showProfile);
    document.getElementById('temporaryDemoFinish').addEventListener('click', finishDemo);
}

function renderDemo(simulated) {
    profileLinked = false;
    markerName = 'My Plant';
    demoApp.innerHTML = `<div class="temporary-ar-demo ${simulated ? 'is-simulated' : 'is-immersive'}"><div id="temporaryDemoStage" class="temporary-demo-stage"><div class="temporary-demo-reticle" aria-hidden="true"></div></div><section id="temporaryDemoCard" class="temporary-demo-card tutorial-fade-in"></section></div>`;
    renderDashboard(false);
}

function drawSpatialMarker(view) {
    if (!placedMarker || !demoProgram || !demoTexture) return;
    const model = new Float32Array(view.transform.matrix);
    model[12] = placedMarker.x; model[13] = placedMarker.y; model[14] = placedMarker.z;
    const mvp = multiplyMat4(view.projectionMatrix, multiplyMat4(view.transform.inverse.matrix, model));
    demoGl.useProgram(demoProgram);
    demoGl.bindBuffer(demoGl.ARRAY_BUFFER, demoBuffer);
    const position = demoGl.getAttribLocation(demoProgram, 'position');
    const texCoord = demoGl.getAttribLocation(demoProgram, 'texCoord');
    demoGl.enableVertexAttribArray(position); demoGl.vertexAttribPointer(position, 3, demoGl.FLOAT, false, 20, 0);
    demoGl.enableVertexAttribArray(texCoord); demoGl.vertexAttribPointer(texCoord, 2, demoGl.FLOAT, false, 20, 12);
    demoGl.uniformMatrix4fv(demoGl.getUniformLocation(demoProgram, 'mvp'), false, mvp);
    demoGl.activeTexture(demoGl.TEXTURE0); demoGl.bindTexture(demoGl.TEXTURE_2D, demoTexture);
    demoGl.uniform1i(demoGl.getUniformLocation(demoProgram, 'texture'), 0);
    demoGl.enable(demoGl.BLEND); demoGl.blendFunc(demoGl.SRC_ALPHA, demoGl.ONE_MINUS_SRC_ALPHA);
    demoGl.drawArrays(demoGl.TRIANGLES, 0, 6);
}

function selectedSpatialMarker(rayMatrix) {
    if (!placedMarker || !rayMatrix) return false;
    const dx = placedMarker.x - rayMatrix[12], dy = placedMarker.y - rayMatrix[13], dz = placedMarker.z - rayMatrix[14];
    const direction = { x: -rayMatrix[8], y: -rayMatrix[9], z: -rayMatrix[10] };
    const along = dx * direction.x + dy * direction.y + dz * direction.z;
    const miss = Math.hypot(dx - direction.x * along, dy - direction.y * along, dz - direction.z * along);
    return along > 0 && miss < Math.max(.35, along * .04);
}

async function tryImmersiveDemo() {
    if (!navigator.xr || !window.isSecureContext) return false;
    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) return false;
        const session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['dom-overlay', 'hit-test'], optionalFeatures: ['local-floor'], domOverlay: { root: document.body } });
        demoSession = session;
        demoCanvas = document.createElement('canvas');
        demoCanvas.className = 'temporary-demo-xr-canvas';
        document.body.append(demoCanvas);
        const gl = demoCanvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL is unavailable.');
        await gl.makeXRCompatible();
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true }), depthNear: 0.01, depthFar: 50 });
        try { demoRefSpace = await session.requestReferenceSpace('local-floor'); } catch { demoRefSpace = await session.requestReferenceSpace('local'); }
        const viewerSpace = await session.requestReferenceSpace('viewer');
        demoHitSource = await session.requestHitTestSource({ space: viewerSpace });
        demoGl = gl;
        setupMarkerRenderer();
        finishingDemo = false;
        const draw = (_time, frame) => {
            if (frame.session !== demoSession || !demoGl) return;
            frame.session.requestAnimationFrame(draw);
            const layer = frame.session.renderState.baseLayer;
            const pose = frame.getViewerPose(demoRefSpace);
            const hit = demoHitSource ? frame.getHitTestResults(demoHitSource)[0] : null;
            const hitPose = hit?.getPose(demoRefSpace);
            latestHitMatrix = hitPose ? new Float32Array(hitPose.transform.matrix) : null;
            demoGl.bindFramebuffer(demoGl.FRAMEBUFFER, layer.framebuffer);
            demoGl.clearColor(0, 0, 0, 0);
            demoGl.clearDepth(1);
            demoGl.clear(demoGl.COLOR_BUFFER_BIT | demoGl.DEPTH_BUFFER_BIT);
            if (pose) for (const view of pose.views) {
                const viewport = layer.getViewport(view);
                demoGl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                drawSpatialMarker(view);
            }
        };
        session.requestAnimationFrame(draw);
        session.addEventListener('select', event => {
            if (!placedMarker || !demoRefSpace) return;
            const rayPose = event.frame.getPose(event.inputSource.targetRaySpace, demoRefSpace);
            if (selectedSpatialMarker(rayPose?.transform.matrix)) profileLinked ? showProfile() : renderDashboard(true);
        });
        session.addEventListener('end', () => {
            demoSession = null;
            removeDemoCanvas();
            if (!finishingDemo) window.renderLaunchScreen();
            finishingDemo = false;
        });
        return true;
    } catch {
        const session = demoSession;
        demoSession = null;
        removeDemoCanvas();
        if (session) session.end().catch(() => {});
        return false;
    }
}

export async function startTemporaryArDemo(app) {
    demoApp = app;
    const immersive = await tryImmersiveDemo();
    renderDemo(!immersive);
}
