const SAMPLE = {
    commonName: 'Lemon Drop Garcinia',
    scientificName: 'Garcinia intermedia',
    summary: 'A compact tropical fruit tree with bright yellow fruit and a pleasantly sharp, citrus-like flavour.',
    family: 'Clusiaceae',
    origin: 'Central America'
};

let demoSession = null;
let demoApp = null;

function finishDemo() {
    const session = demoSession;
    demoSession = null;
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
        demoSession = await navigator.xr.requestSession('immersive-ar', { optionalFeatures: ['dom-overlay'], domOverlay: { root: document.body } });
        demoSession.addEventListener('end', () => { demoSession = null; });
        return true;
    } catch { return false; }
}

export async function startTemporaryArDemo(app) {
    demoApp = app;
    const immersive = await tryImmersiveDemo();
    renderDemo(!immersive);
}
