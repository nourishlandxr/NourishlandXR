const PLANTS = [
    { commonName: 'Banana Cavendish', scientificName: 'Musa acuminata', summary: 'A productive tropical banana grown for its familiar sweet fruit and broad sheltering leaves.', family: 'Musaceae', origin: 'Southeast Asia', uses: ['Food', 'Cooking', 'Dessert'], image: '' },
    { commonName: 'Lemon Drop Garcinia', scientificName: 'Garcinia intermedia', summary: 'A compact tropical fruit tree with bright yellow fruit and a pleasantly sharp, citrus-like flavour.', family: 'Clusiaceae', origin: 'Central America', uses: ['Food', 'Flavour'], image: '' },
    { commonName: 'Myoga Ginger', scientificName: 'Zingiber mioga', summary: 'A shade-loving perennial ginger valued for its aromatic flower buds and young shoots.', family: 'Zingiberaceae', origin: 'East Asia', uses: ['Culinary', 'Medicinal'], image: '' },
    { commonName: 'Jackfruit', scientificName: 'Artocarpus heterophyllus', summary: 'A vigorous tropical tree producing exceptionally large fruit with sweet edible bulbs.', family: 'Moraceae', origin: 'South and Southeast Asia', uses: ['Food', 'Cooking'], image: '' }
];
let SAMPLE = PLANTS[1];
let markerName = 'My Plant';
let windowZIndex = 100;

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
let demoTextures = {};
let profileLinked = false;
let spatialDashboardMatrix = null;
let dashboardPanelBuffer = null;
let currentPanelCallback = null;
let tagInputBuffer = null;
let latestViewerMatrix = null;
let demoPlacementReady = false;
let demoPlacementInFlight = false;
let demoMarkerType = 'marker';

const DASHBOARD_W = 0.72;
const DASHBOARD_H = 0.52;
const TAG_W = 0.64;
const TAG_H = 0.36;
const PROFILE_W = 0.78;
const PROFILE_H = 0.66;
const LIST_W = 0.64;
const LIST_H = 0.48;

function createPanelTexture(width, height, drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = width || 600;
    canvas.height = height || 400;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, canvas.width, canvas.height);
    const tex = demoGl.createTexture();
    demoGl.bindTexture(demoGl.TEXTURE_2D, tex);
    // The quad uses V=0 at its top edge. Canvas pixels are already uploaded
    // top-first, so flipping here turns every dashboard upside down.
    demoGl.pixelStorei(demoGl.UNPACK_FLIP_Y_WEBGL, false);
    demoGl.texImage2D(demoGl.TEXTURE_2D, 0, demoGl.RGBA, demoGl.RGBA, demoGl.UNSIGNED_BYTE, canvas);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_MIN_FILTER, demoGl.LINEAR);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_MAG_FILTER, demoGl.LINEAR);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_WRAP_S, demoGl.CLAMP_TO_EDGE);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_WRAP_T, demoGl.CLAMP_TO_EDGE);
    return tex;
}

function renderDashboardPanel(ctx, w, h) {
    ctx.fillStyle = 'rgba(20,55,34,.92)'; ctx.beginPath(); ctx.roundRect(8, 8, w - 16, h - 16, 24); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✿ My Project', w / 2, 48);
    ctx.fillStyle = 'rgba(220,239,149,.9)'; ctx.font = '14px sans-serif'; ctx.fillText('DASHBOARD', w / 2, 72);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '18px sans-serif'; ctx.fillText('Is there a plant near you? Tap below to place a marker.', w / 2, 112);
    ctx.fillStyle = '#dcef95'; ctx.beginPath(); ctx.roundRect(40, 140, w - 80, 52, 12); ctx.fill();
    ctx.fillStyle = '#173522'; ctx.font = '700 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Tag a Plant', w / 2, 170);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '12px sans-serif'; ctx.fillText('Place a marker at a real-world position', w / 2, 195);
    ctx.fillStyle = '#28c840'; ctx.beginPath(); ctx.roundRect(40, 210, w - 80, 52, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 20px sans-serif'; ctx.fillText('Create Plant Marker', w / 2, 240);
}

function renderTagPanel(ctx, w, h) {
    ctx.fillStyle = 'rgba(20,55,34,.92)'; ctx.beginPath(); ctx.roundRect(8, 8, w - 16, h - 16, 24); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Tag a Plant', w / 2, 48);
    ctx.fillStyle = 'rgba(220,239,149,.9)'; ctx.font = '14px sans-serif'; ctx.fillText('STEP 1', w / 2, 72);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '16px sans-serif'; ctx.fillText('Point at the ground beside a real plant.', w / 2, 105);
    ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.fillText(`Marker: ${markerName}`, w / 2, 140);
    ctx.fillStyle = '#dcef95'; ctx.beginPath(); ctx.roundRect(40, h - 62, w - 80, 44, 12); ctx.fill();
    ctx.fillStyle = '#173522'; ctx.font = '700 18px sans-serif'; ctx.fillText('Tag This Plant', w / 2, h - 38);
}

function renderPlantListPanel(ctx, w, h) {
    ctx.fillStyle = 'rgba(20,55,34,.92)'; ctx.beginPath(); ctx.roundRect(8, 8, w - 16, h - 16, 24); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Choose Plant Profile', w / 2, 48);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '16px sans-serif'; ctx.fillText('Select a matching plant profile:', w / 2, 80);
    const items = ['Banana Cavendish - Musa acuminata', 'Lemon Drop Garcinia - Garcinia intermedia', 'Myoga Ginger - Zingiber mioga', 'Jackfruit - Artocarpus heterophyllus'];
    items.forEach((name, i) => {
        const y = 100 + i * 55;
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.roundRect(30, y, w - 60, 44, 10); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(name, 48, y + 28);
    });
}

function renderPlantProfilePanel(ctx, w, h) {
    ctx.fillStyle = 'rgba(20,55,34,.92)'; ctx.beginPath(); ctx.roundRect(8, 8, w - 16, h - 16, 24); ctx.fill();
    ctx.fillStyle = '#dcef95'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PLANT PROFILE', w / 2, 38);
    ctx.fillStyle = '#fff'; ctx.font = '700 30px sans-serif'; ctx.fillText(SAMPLE.commonName, w / 2, 72);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = 'italic 18px sans-serif'; ctx.fillText(SAMPLE.scientificName, w / 2, 98);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '14px sans-serif'; ctx.fillText(SAMPLE.summary.substring(0, 90) + '...', w / 2, 132);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '14px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`Family: ${SAMPLE.family}`, 40, 170);
    ctx.fillText(`Origin: ${SAMPLE.origin}`, 40, 194);
    ctx.fillText(`Uses: ${(SAMPLE.uses || []).join(', ')}`, 40, 218);
    ctx.fillStyle = '#28c840'; ctx.beginPath(); ctx.roundRect(w / 2 - 80, h - 54, 160, 36, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✓ Linked to marker', w / 2, h - 32);
}

function renderPlacementPrompt(ctx, w, h) {
    ctx.fillStyle = 'rgba(20,55,34,.92)'; ctx.beginPath(); ctx.roundRect(8, 8, w - 16, h - 16, 24); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Place Your Dashboard', w / 2, 50);
    ctx.fillStyle = 'rgba(220,239,149,.9)'; ctx.font = '14px sans-serif'; ctx.fillText('STEP 1', w / 2, 76);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '18px sans-serif'; ctx.fillText('Point at a flat surface and tap', w / 2, 115);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '14px sans-serif'; ctx.fillText('Aim at a table, counter or the ground', w / 2, 145);
    ctx.fillStyle = '#dcef95'; ctx.beginPath(); ctx.roundRect(w / 2 - 80, h - 56, 160, 38, 10); ctx.fill();
    ctx.fillStyle = '#173522'; ctx.font = '700 16px sans-serif'; ctx.fillText('Place Dashboard', w / 2, h - 32);
}

function makeQuadBuffer(width, height) {
    const buf = demoGl.createBuffer();
    demoGl.bindBuffer(demoGl.ARRAY_BUFFER, buf);
    demoGl.bufferData(demoGl.ARRAY_BUFFER, new Float32Array([
        -width / 2, -height / 2, 0, 0, 1,
        width / 2, -height / 2, 0, 1, 1,
        width / 2, height / 2, 0, 1, 0,
        -width / 2, -height / 2, 0, 0, 1,
        width / 2, height / 2, 0, 1, 0,
        -width / 2, height / 2, 0, 0, 0
    ]), demoGl.STATIC_DRAW);
    return buf;
}

function setupMarkerRenderer() {
    const vShader = demoGl.createShader(demoGl.VERTEX_SHADER);
    demoGl.shaderSource(vShader, 'attribute vec3 p;attribute vec2 t;uniform mat4 mvp;varying vec2 uv;void main(){gl_Position=mvp*vec4(p,1.0);uv=t;}');
    demoGl.compileShader(vShader);
    const fShader = demoGl.createShader(demoGl.FRAGMENT_SHADER);
    demoGl.shaderSource(fShader, 'precision mediump float;varying vec2 uv;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,uv);}');
    demoGl.compileShader(fShader);
    demoProgram = demoGl.createProgram();
    demoGl.attachShader(demoProgram, vShader);
    demoGl.attachShader(demoProgram, fShader);
    demoGl.linkProgram(demoProgram);
    demoGl.useProgram(demoProgram);
    dashboardPanelBuffer = makeQuadBuffer(DASHBOARD_W, DASHBOARD_H);
    tagInputBuffer = makeQuadBuffer(TAG_W, TAG_H);
    const listBuf = makeQuadBuffer(LIST_W, LIST_H);
    const profileBuf = makeQuadBuffer(PROFILE_W, PROFILE_H);
    const placeBuf = makeQuadBuffer(DASHBOARD_W, DASHBOARD_H);
}

function buildSpatialPanel(panelName) {
    if (!demoGl) return null;
    if (panelName === 'dashboard') {
        demoTextures['dashboard'] = createPanelTexture(600, 400, renderDashboardPanel);
        return { tex: demoTextures['dashboard'], buf: dashboardPanelBuffer, w: DASHBOARD_W, h: DASHBOARD_H };
    }
    if (panelName === 'tag') {
        demoTextures['tag'] = createPanelTexture(520, 280, renderTagPanel);
        return { tex: demoTextures['tag'], buf: tagInputBuffer, w: TAG_W, h: TAG_H };
    }
    if (panelName === 'plantList') {
        demoTextures['plantList'] = createPanelTexture(520, 360, renderPlantListPanel);
        const buf = makeQuadBuffer(LIST_W, LIST_H);
        return { tex: demoTextures['plantList'], buf, w: LIST_W, h: LIST_H };
    }
    if (panelName === 'plantProfile') {
        demoTextures['plantProfile'] = createPanelTexture(640, 460, renderPlantProfilePanel);
        const buf = makeQuadBuffer(PROFILE_W, PROFILE_H);
        return { tex: demoTextures['plantProfile'], buf, w: PROFILE_W, h: PROFILE_H };
    }
    if (panelName === 'placement') {
        demoTextures['placement'] = createPanelTexture(480, 280, renderPlacementPrompt);
        return { tex: demoTextures['placement'], buf: dashboardPanelBuffer, w: DASHBOARD_W, h: DASHBOARD_H };
    }
    return null;
}

function drawSpatialPanel(view, panel, matrix, buf, width, height) {
    if (!panel || !matrix) return;
    const mvp = multiplyMat4(view.projectionMatrix, multiplyMat4(view.transform.inverse.matrix, matrix));
    demoGl.useProgram(demoProgram);
    demoGl.bindBuffer(demoGl.ARRAY_BUFFER, buf);
    const pLoc = demoGl.getAttribLocation(demoProgram, 'p');
    const tLoc = demoGl.getAttribLocation(demoProgram, 't');
    demoGl.enableVertexAttribArray(pLoc);
    demoGl.vertexAttribPointer(pLoc, 3, demoGl.FLOAT, false, 20, 0);
    demoGl.enableVertexAttribArray(tLoc);
    demoGl.vertexAttribPointer(tLoc, 2, demoGl.FLOAT, false, 20, 12);
    demoGl.uniformMatrix4fv(demoGl.getUniformLocation(demoProgram, 'mvp'), false, mvp);
    demoGl.activeTexture(demoGl.TEXTURE0);
    demoGl.bindTexture(demoGl.TEXTURE_2D, panel);
    demoGl.uniform1i(demoGl.getUniformLocation(demoProgram, 'tex'), 0);
    demoGl.enable(demoGl.BLEND);
    demoGl.blendFunc(demoGl.SRC_ALPHA, demoGl.ONE_MINUS_SRC_ALPHA);
    demoGl.drawArrays(demoGl.TRIANGLES, 0, 6);
}

function multiplyMat4(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return out;
}

function makeUprightPanelMatrix(position, viewerMatrix) {
    const camera = [viewerMatrix[12], viewerMatrix[13], viewerMatrix[14]];
    let forwardX = camera[0] - position[0];
    let forwardZ = camera[2] - position[2];
    const forwardLength = Math.hypot(forwardX, forwardZ);
    if (forwardLength < 0.001) {
        forwardX = viewerMatrix[8];
        forwardZ = viewerMatrix[10];
    } else {
        forwardX /= forwardLength;
        forwardZ /= forwardLength;
    }

    // Keep the panel level with the real world instead of copying the phone's
    // portrait/landscape roll. Local +Z faces the viewer and local +Y stays up.
    return new Float32Array([
        forwardZ, 0, -forwardX, 0,
        0, 1, 0, 0,
        forwardX, 0, forwardZ, 0,
        position[0], position[1], position[2], 1
    ]);
}

function makeDraggable(element, handle) {
    let isDragging = false;
    let startX, startY, origX, origY;
    const header = handle || element;

    function onStart(e) {
        const ev = e.touches ? e.touches[0] : e;
        isDragging = true;
        startX = ev.clientX;
        startY = ev.clientY;
        origX = element.offsetLeft || 0;
        origY = element.offsetTop || 0;
        element.style.zIndex = ++windowZIndex;
        element.classList.add('is-dragging');
        if (e.touches) document.addEventListener('touchmove', onMove, { passive: true });
        else document.addEventListener('mousemove', onMove);
        document.addEventListener('touchend', onEnd, { passive: true });
        document.addEventListener('mouseup', onEnd);
        e.preventDefault();
    }

    function onMove(e) {
        if (!isDragging) return;
        const ev = e.touches ? e.touches[0] : e;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        element.style.left = (origX + dx) + 'px';
        element.style.top = (origY + dy) + 'px';
    }

    function onEnd() {
        isDragging = false;
        element.classList.remove('is-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchend', onEnd);
    }

    header.addEventListener('mousedown', onStart);
    header.addEventListener('touchstart', onStart, { passive: true });
}

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

function removeDemoCanvas() {
    for (const key in demoTextures) {
        if (demoTextures[key]) demoGl?.deleteTexture(demoTextures[key]);
    }
    demoTextures = {};
    demoHitSource?.cancel?.();
    demoHitSource = null;
    demoRefSpace = null;
    latestHitMatrix = null;
    latestViewerMatrix = null;
    placedMarker = null;
    demoPlacementReady = false;
    demoPlacementInFlight = false;
    spatialDashboardMatrix = null;
    demoProgram = null;
    demoBuffer = null;
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

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' })[character]);

function showDashboard() {
    const panel = buildSpatialPanel('dashboard');
    if (!panel) return;
    spatialDashboardMatrix = null;
    currentPanelCallback = () => showTagPrompt();
}

function showTagPrompt() {
    currentPanelCallback = null;
}

function tagPlant() {
    const input = document.getElementById('temporaryMarkerName');
    markerName = input?.value.trim() || 'My Plant';
    profileLinked = false;
    if (demoSession && latestHitMatrix) {
        placedMarker = { x: latestHitMatrix[12], y: latestHitMatrix[13] + .42, z: latestHitMatrix[14] };
    }
    showDashboard();
}

function selectPlantProfile(index) {
    SAMPLE = PLANTS[index] || PLANTS[1];
    profileLinked = true;
}

function renderDemo(simulated) {
    profileLinked = false;
    markerName = 'My Plant';
    demoPlacementReady = true;
    demoPlacementInFlight = false;
    demoMarkerType = 'marker';
    const reticle = demoSession ? '<div class="temporary-demo-reticle" aria-hidden="true"></div>' : '';
    demoApp.innerHTML = `<div class="temporary-ar-demo ${simulated ? 'is-simulated' : 'is-immersive'}"><div id="temporaryDemoStage" class="temporary-demo-stage">${reticle}<button class="temporary-demo-place-control" type="button" data-demo-place><span class="breathing-circle" aria-hidden="true"></span><strong>Tap to place marker</strong></button><p class="temporary-demo-guide" role="status">Aim at a place, then tap the breathing circle.</p><button class="temporary-demo-exit" type="button">Exit AR</button></div><section id="temporaryDemoCard" class="temporary-demo-card"></section></div>`;
    document.querySelector('.temporary-demo-exit')?.addEventListener('click', finishDemo);
    document.querySelector('[data-demo-place]')?.addEventListener('click', placeDemoMarker);
}

function setDemoGuide(message) {
    const guide = document.querySelector('.temporary-demo-guide');
    if (guide) guide.textContent = message;
}

function markerPosition() {
    if (latestHitMatrix) return { x: latestHitMatrix[12], y: latestHitMatrix[13] + .16, z: latestHitMatrix[14] };
    if (!latestViewerMatrix) return demoSession ? null : { x: 0, y: 0, z: -1.2 };
    return {
        x: latestViewerMatrix[12] - latestViewerMatrix[8] * 1.2,
        y: latestViewerMatrix[13] - latestViewerMatrix[9] * 1.2,
        z: latestViewerMatrix[14] - latestViewerMatrix[10] * 1.2
    };
}

function placeDemoMarker() {
    if (!demoPlacementReady || demoPlacementInFlight || placedMarker) return;
    const position = markerPosition();
    if (!position) {
        setDemoGuide('Move your phone briefly, then tap the breathing circle again.');
        return;
    }
    demoPlacementInFlight = true;
    placedMarker = position;
    demoPlacementReady = false;
    document.querySelector('[data-demo-place]')?.setAttribute('hidden', '');
    setDemoGuide('Marker placed in space.');
    showMarkerTypePicker();
    demoPlacementInFlight = false;
}

function showMarkerTypePicker() {
    const container = document.getElementById('temporaryDemoCard');
    if (!container) return;
    container.innerHTML = `<section class="temporary-demo-choice" aria-live="polite"><p class="welcome-label">MARKER PLACED</p><h2>What is this marker?</h2><div class="temporary-demo-choice-grid"><button type="button" data-demo-marker-type="plant">Plant</button><button type="button" data-demo-marker-type="note">Note</button><button type="button" data-demo-marker-type="poi">Point of Interest</button></div></section>`;
    container.querySelectorAll('[data-demo-marker-type]').forEach(button => button.addEventListener('click', () => showMarkerNameEntry(button.dataset.demoMarkerType)));
}

function showMarkerNameEntry(type) {
    demoMarkerType = type;
    const labels = { plant: 'Plant', note: 'Note', poi: 'Point of Interest' };
    const container = document.getElementById('temporaryDemoCard');
    if (!container) return;
    container.innerHTML = `<section class="temporary-demo-choice"><p class="welcome-label">${labels[type]}</p><h2>Name this marker</h2><label><span>Name</span><input data-demo-marker-name value="${escapeHtml(type === 'plant' ? 'New plant' : type === 'note' ? 'New note' : 'Point of interest')}" maxlength="60" /></label><button class="primary" type="button" data-demo-save-marker>Save marker</button></section>`;
    const input = container.querySelector('[data-demo-marker-name]');
    container.querySelector('[data-demo-save-marker]').addEventListener('click', () => {
        markerName = input.value.trim() || labels[type];
        profileLinked = type === 'plant';
        updateDemoMarkerTexture();
        container.innerHTML = '';
        setDemoGuide(`${markerName} saved in space. Select it later to edit.`);
    });
    input.focus();
}

function setupImmersiveDashboard() {
    buildSpatialPanel('dashboard');
    currentPanelCallback = () => showImmersiveTagPrompt();
}

function showSimulatedDashboard() {
    const container = document.getElementById('temporaryDemoCard');
    container.innerHTML = '';
    const win = document.createElement('div');
    win.className = 'ar-window draggable-window';
    win.style.left = 'calc(50% - 200px)';
    win.style.top = '30px';
    win.style.zIndex = ++windowZIndex;
    win.innerHTML = `<div class="window-header"><span class="window-dots"><i></i><i></i><i></i></span><strong>My Project</strong></div><div class="window-body"><p class="welcome-label">DASHBOARD</p><h2>My Project</h2><p>Create a plant marker to tag something nearby.</p><div class="dashboard-menu"><button type="button" class="dashboard-action" id="demoTagPlant"><strong>Tag a Plant</strong><span>Place a marker at a real-world position</span></button></div><div class="button-row"><button type="button" class="window-close-btn" id="demoExitAr">Exit AR</button></div></div>`;
    container.appendChild(win);
    makeDraggable(win, win.querySelector('.window-header'));
    document.getElementById('demoTagPlant').addEventListener('click', showSimulatedTag);
    document.getElementById('demoExitAr').addEventListener('click', finishDemo);
}

function showSimulatedTag() {
    const container = document.getElementById('temporaryDemoCard');
    const win = document.createElement('div');
    win.className = 'ar-window draggable-window';
    win.style.left = 'calc(50% - 200px)';
    win.style.top = '40px';
    win.style.zIndex = ++windowZIndex;
    win.innerHTML = `<div class="window-header"><span class="window-dots"><i></i><i></i><i></i></span><strong>Tag a Plant</strong></div><div class="window-body"><p class="welcome-label">STEP 1</p><h2>Tag a Plant</h2><p>Give it a name, then press Tag.</p><label class="field"><span>Marker name</span><input id="temporaryMarkerName" value="${escapeHtml(markerName)}" maxlength="40" /></label><div class="button-row"><button type="button" class="window-close-btn" onclick="showSimulatedDashboard()">Cancel</button><button class="primary" type="button" id="demoTagConfirm">Tag This Plant</button></div></div>`;
    container.appendChild(win);
    makeDraggable(win, win.querySelector('.window-header'));
    document.getElementById('demoTagConfirm').addEventListener('click', () => {
        const name = document.getElementById('temporaryMarkerName')?.value.trim() || 'My Plant';
        markerName = name;
        profileLinked = false;
        showSimulatedPlantList();
    });
}

function showSimulatedPlantList() {
    const container = document.getElementById('temporaryDemoCard');
    const win = document.createElement('div');
    win.className = 'ar-window draggable-window';
    win.style.left = 'calc(50% - 220px)';
    win.style.top = '50px';
    win.style.zIndex = ++windowZIndex;
    win.innerHTML = `<div class="window-header"><span class="window-dots"><i></i><i></i><i></i></span><strong>Select Plant Profile</strong></div><div class="window-body"><p class="welcome-label">STEP 2</p><h2>Choose the matching plant</h2><div class="plant-choices">${PLANTS.map((plant, index) => `<button type="button" class="plant-choice" data-plant-index="${index}"><strong>${plant.commonName}</strong><span><em>${plant.scientificName}</em></span></button>`).join('')}</div><div class="button-row"><button type="button" class="window-close-btn" onclick="showSimulatedDashboard()">Back</button></div></div>`;
    container.appendChild(win);
    makeDraggable(win, win.querySelector('.window-header'));
    win.querySelectorAll('[data-plant-index]').forEach(btn => btn.addEventListener('click', () => {
        selectPlantProfile(Number(btn.dataset.plantIndex));
        showSimulatedProfile();
    }));
}

function showSimulatedProfile() {
    const container = document.getElementById('temporaryDemoCard');
    const win = document.createElement('div');
    win.className = 'ar-window ar-window-wide draggable-window';
    win.style.left = 'calc(50% - 260px)';
    win.style.top = '20px';
    win.style.zIndex = ++windowZIndex;
    const uses = SAMPLE.uses?.length ? SAMPLE.uses.join(', ') : 'Not recorded';
    win.innerHTML = `<div class="window-header"><span class="window-dots"><i></i><i></i><i></i></span><strong>Plant Profile</strong></div><div class="window-body"><p class="welcome-label">PLANT PROFILE</p><h2>${SAMPLE.commonName}</h2><p><em>${SAMPLE.scientificName}</em></p><hr class="profile-divider" /><p>${SAMPLE.summary}</p><dl class="profile-grid"><div><dt>Family</dt><dd>${SAMPLE.family}</dd></div><div><dt>Origin</dt><dd>${SAMPLE.origin}</dd></div><div><dt>Uses</dt><dd>${uses}</dd></div></dl><p class="tutorial-success">✓ Plant profile linked to spatial marker</p><div class="button-row"><button type="button" class="window-close-btn" onclick="showSimulatedDashboard()">Dashboard</button><button class="primary" type="button" id="demoFinishAr">Finish</button></div></div>`;
    container.appendChild(win);
    makeDraggable(win, win.querySelector('.window-header'));
    document.getElementById('demoFinishAr').addEventListener('click', finishDemo);
}

function showImmersiveTagPrompt() {
    buildSpatialPanel('tag');
}

function showImmersivePlantList() {
    buildSpatialPanel('plantList');
}

function showImmersiveProfile() {
    buildSpatialPanel('plantProfile');
}

function drawSpatialMarker(view) {
    if (!placedMarker || !demoGl || !demoTextures['marker']) return;
    const model = new Float32Array(view.transform.matrix);
    model[12] = placedMarker.x; model[13] = placedMarker.y; model[14] = placedMarker.z;
    const mvp = multiplyMat4(view.projectionMatrix, multiplyMat4(view.transform.inverse.matrix, model));
    demoGl.useProgram(demoProgram);
    demoGl.bindBuffer(demoGl.ARRAY_BUFFER, demoBuffer);
    const pLoc = demoGl.getAttribLocation(demoProgram, 'p');
    const tLoc = demoGl.getAttribLocation(demoProgram, 't');
    demoGl.enableVertexAttribArray(pLoc);
    demoGl.vertexAttribPointer(pLoc, 3, demoGl.FLOAT, false, 20, 0);
    demoGl.enableVertexAttribArray(tLoc);
    demoGl.vertexAttribPointer(tLoc, 2, demoGl.FLOAT, false, 20, 12);
    demoGl.uniformMatrix4fv(demoGl.getUniformLocation(demoProgram, 'mvp'), false, mvp);
    demoGl.activeTexture(demoGl.TEXTURE0);
    demoGl.bindTexture(demoGl.TEXTURE_2D, demoTextures['marker']);
    demoGl.uniform1i(demoGl.getUniformLocation(demoProgram, 'tex'), 0);
    demoGl.enable(demoGl.BLEND);
    demoGl.blendFunc(demoGl.SRC_ALPHA, demoGl.ONE_MINUS_SRC_ALPHA);
    demoGl.drawArrays(demoGl.TRIANGLES, 0, 6);
}

function updateDemoMarkerTexture() {
    if (!demoGl) return;
    const markerCanvas = document.createElement('canvas');
    markerCanvas.width = 300;
    markerCanvas.height = 120;
    const ctx = markerCanvas.getContext('2d');
    const typeLabel = { plant: 'Plant', note: 'Note', poi: 'Point of interest', marker: 'Marker' }[demoMarkerType] || 'Marker';
    ctx.fillStyle = 'rgba(20,55,34,.88)'; ctx.beginPath(); ctx.roundRect(0, 0, 300, 120, 16); ctx.fill();
    ctx.fillStyle = '#dcef95'; ctx.beginPath(); ctx.arc(40, 60, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#173522'; ctx.font = '700 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('•', 40, 66);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = '700 18px sans-serif'; ctx.fillText(markerName, 70, 52);
    ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.font = '14px sans-serif'; ctx.fillText(typeLabel, 70, 78);
    if (!demoTextures.marker) demoTextures.marker = demoGl.createTexture();
    demoGl.bindTexture(demoGl.TEXTURE_2D, demoTextures.marker);
    demoGl.pixelStorei(demoGl.UNPACK_FLIP_Y_WEBGL, false);
    demoGl.texImage2D(demoGl.TEXTURE_2D, 0, demoGl.RGBA, demoGl.RGBA, demoGl.UNSIGNED_BYTE, markerCanvas);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_MIN_FILTER, demoGl.LINEAR);
    demoGl.texParameteri(demoGl.TEXTURE_2D, demoGl.TEXTURE_MAG_FILTER, demoGl.LINEAR);
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
        const session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['dom-overlay', 'hit-test'],
            optionalFeatures: ['local-floor'],
            domOverlay: { root: demoApp }
        });
        demoSession = session;
        demoCanvas = document.createElement('canvas');
        demoCanvas.className = 'temporary-demo-xr-canvas';
        document.body.append(demoCanvas);
        const gl = demoCanvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL unavailable');
        await gl.makeXRCompatible();
        session.updateRenderState({
            baseLayer: new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true }),
            depthNear: 0.01,
            depthFar: 50
        });
        try { demoRefSpace = await session.requestReferenceSpace('local-floor'); }
        catch { demoRefSpace = await session.requestReferenceSpace('local'); }
        const viewerSpace = await session.requestReferenceSpace('viewer');
        demoHitSource = await session.requestHitTestSource({ space: viewerSpace });
        demoGl = gl;
        setupMarkerRenderer();
        finishingDemo = false;

        updateDemoMarkerTexture();

        demoBuffer = demoGl.createBuffer();
        demoGl.bindBuffer(demoGl.ARRAY_BUFFER, demoBuffer);
        demoGl.bufferData(demoGl.ARRAY_BUFFER, new Float32Array([
            -.18, -.08, 0, 0, 1,
            .18, -.08, 0, 1, 1,
            .18, .08, 0, 1, 0,
            -.18, -.08, 0, 0, 1,
            .18, .08, 0, 1, 0,
            -.18, .08, 0, 0, 0
        ]), demoGl.STATIC_DRAW);

        const draw = (_time, frame) => {
            if (frame.session !== demoSession || !demoGl) return;
            frame.session.requestAnimationFrame(draw);
            const layer = frame.session.renderState.baseLayer;
            const pose = frame.getViewerPose(demoRefSpace);
            latestViewerMatrix = pose ? new Float32Array(pose.transform.matrix) : null;
            const hit = demoHitSource ? frame.getHitTestResults(demoHitSource)[0] : null;
            const hitPose = hit?.getPose(demoRefSpace);
            latestHitMatrix = hitPose ? new Float32Array(hitPose.transform.matrix) : null;
            document.querySelector('.temporary-demo-reticle')?.classList.toggle('has-surface', Boolean(latestHitMatrix));

            demoGl.bindFramebuffer(demoGl.FRAMEBUFFER, layer.framebuffer);
            demoGl.clearColor(0, 0, 0, 0);
            demoGl.clearDepth(1);
            demoGl.clear(demoGl.COLOR_BUFFER_BIT | demoGl.DEPTH_BUFFER_BIT);

            if (pose) {
                for (const view of pose.views) {
                    const viewport = layer.getViewport(view);
                    demoGl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

                    // Draw spatial marker if placed
                    drawSpatialMarker(view);

                    // Draw dashboard panel if placed
                    if (spatialDashboardMatrix && demoTextures['dashboard']) {
                        drawSpatialPanel(view, demoTextures['dashboard'], spatialDashboardMatrix, dashboardPanelBuffer, DASHBOARD_W, DASHBOARD_H);
                    }
                }
            }
        };

        session.requestAnimationFrame(draw);

        session.addEventListener('select', () => {
            // Fallback for controller input when the DOM-overlay button does
            // not receive the select event.
            if (demoPlacementReady) placeDemoMarker();
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
