const SAMPLE = {
    commonName: 'Lemon Drop Garcinia',
    scientificName: 'Garcinia intermedia',
    summary: 'A compact tropical fruit tree with bright yellow fruit and a pleasantly sharp, citrus-like flavour.',
    family: 'Clusiaceae',
    origin: 'Central America'
};

let demoSession = null;
let demoApp = null;
let demoCanvas = null;
let demoGl = null;
let finishingDemo = false;

function removeDemoCanvas() {
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

function showProfile() {
    const card = document.getElementById('temporaryDemoCard');
    if (!card) return;
    card.innerHTML = `<p class="welcome-label">Sample plant</p><h2>${SAMPLE.commonName}</h2><p><em>${SAMPLE.scientificName}</em></p><p>${SAMPLE.summary}</p><dl class="temporary-demo-profile"><div><dt>Family</dt><dd>${SAMPLE.family}</dd></div><div><dt>Origin</dt><dd>${SAMPLE.origin}</dd></div></dl><div class="button-row"><button type="button" id="temporaryDemoBack">Back to marker</button><button class="primary" type="button" id="temporaryDemoFinish">Finish Demo</button></div>`;
    document.getElementById('temporaryDemoBack').addEventListener('click', showPlacedMarker);
    document.getElementById('temporaryDemoFinish').addEventListener('click', finishDemo);
}

function showPlacedMarker() {
    const stage = document.getElementById('temporaryDemoStage');
    const card = document.getElementById('temporaryDemoCard');
    if (!stage || !card) return;
    stage.classList.add('has-marker');
    stage.innerHTML = `<button type="button" class="temporary-plant-marker" id="temporaryPlantMarker" aria-label="Open Lemon Drop Garcinia"><span aria-hidden="true">✿</span><strong>${SAMPLE.commonName}</strong><small>Tap to explore</small><i aria-hidden="true"></i></button>`;
    card.innerHTML = `<p class="welcome-label">Marker placed</p><h2>${SAMPLE.commonName}</h2><p>Tap the plant marker to discover more.</p><div class="button-row"><button type="button" id="temporaryDemoProfile">View Plant Profile</button><button class="primary" type="button" id="temporaryDemoFinish">Finish Demo</button></div>`;
    document.getElementById('temporaryPlantMarker').addEventListener('click', showProfile);
    document.getElementById('temporaryDemoProfile').addEventListener('click', showProfile);
    document.getElementById('temporaryDemoFinish').addEventListener('click', finishDemo);
}

function renderDemo(simulated) {
    demoApp.innerHTML = `<div class="temporary-ar-demo ${simulated ? 'is-simulated' : 'is-immersive'}"><div id="temporaryDemoStage" class="temporary-demo-stage"><div class="temporary-demo-reticle" aria-hidden="true"></div></div><section id="temporaryDemoCard" class="temporary-demo-card"><p class="welcome-label">${simulated ? 'AR simulation' : 'Guided AR demo'}</p><h1>Bring a plant to life</h1><p>${simulated ? 'Immersive AR is not available on this device, so you can try the same interaction in simulation.' : 'Move your device to view your surroundings, then place the sample plant.'}</p><div class="button-row"><button type="button" id="temporaryDemoExit">Return to Welcome</button><button class="primary" type="button" id="temporaryDemoPlace">Place Sample Plant</button></div></section></div>`;
    document.getElementById('temporaryDemoExit').addEventListener('click', finishDemo);
    document.getElementById('temporaryDemoPlace').addEventListener('click', showPlacedMarker);
}

async function tryImmersiveDemo() {
    if (!navigator.xr || !window.isSecureContext) return false;
    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) return false;
        const session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['dom-overlay'], optionalFeatures: ['local-floor'], domOverlay: { root: document.body } });
        demoSession = session;
        demoCanvas = document.createElement('canvas');
        demoCanvas.className = 'temporary-demo-xr-canvas';
        document.body.append(demoCanvas);
        const gl = demoCanvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL is unavailable.');
        await gl.makeXRCompatible();
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true }), depthNear: 0.01, depthFar: 50 });
        try { await session.requestReferenceSpace('local-floor'); } catch { await session.requestReferenceSpace('local'); }
        demoGl = gl;
        finishingDemo = false;
        const draw = (_time, frame) => {
            if (frame.session !== demoSession || !demoGl) return;
            frame.session.requestAnimationFrame(draw);
            const layer = frame.session.renderState.baseLayer;
            demoGl.bindFramebuffer(demoGl.FRAMEBUFFER, layer.framebuffer);
            demoGl.clearColor(0, 0, 0, 0);
            demoGl.clearDepth(1);
            demoGl.clear(demoGl.COLOR_BUFFER_BIT | demoGl.DEPTH_BUFFER_BIT);
        };
        session.requestAnimationFrame(draw);
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
