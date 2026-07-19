let session;
let gl;
let refSpace;
let canvas;
let overlay;
let plantProfile;
let panelView = 'root';

// ─── Compatibility stubs ───
const arDiagnosticLines = [];
function reportArDiagnostic(stage, error) {
    const detail = error ? `${error.name || 'Error'}: ${error.message || String(error)}` : stage;
    arDiagnosticLines.push(error ? `${stage}: ${detail}` : stage);
}
export function getArDiagnostics() { return [...arDiagnosticLines]; }
export function recordArFailure(error, stage) { reportArDiagnostic(stage, error); }
export async function copyArDiagnostics() {
    const text = getArDiagnostics().join('\n') || 'No AR diagnostics recorded.';
    await navigator.clipboard.writeText(text);
}
export function isArActive() { return Boolean(session); }

function message(text) {
    const s = document.getElementById('arOverlayStatus');
    if (s) s.textContent = text;
}

function removeArOverlay() {
    document.body.classList.remove('ar-session-active');
    overlay?.remove();
    overlay = null;
}

function createArOverlay() {
    document.body.classList.add('ar-session-active');
    overlay = document.createElement('div');
    overlay.id = 'arOverlayControls';
    overlay.innerHTML = '<div class="ar-overlay-copy"><div id="arOverlayStatus">AR active</div></div><div class="ar-overlay-buttons"><button type="button" onclick="window.exitAr()">Exit AR</button></div>';
    overlay.addEventListener('beforexrselect', e => e.preventDefault());
    document.body.append(overlay);
}

// ─── Show breathing circle loading animation ───
function showBreathingOverlay() {
    let el = document.getElementById('arBreathingOverlay');
    if (!el) {
        el = document.createElement('div');
        el.id = 'arBreathingOverlay';
        el.style.cssText = 'position:fixed;inset:0;z-index:12000;display:grid;place-items:center;background:rgba(0,0,0,.5);pointer-events:none;animation:fade-in .3s ease-out;';
        el.innerHTML = '<div style="display:grid;place-items:center;gap:16px;text-align:center"><div class="breathing-circle" style="width:80px;height:80px;border:3px solid rgba(220,239,149,.9);border-radius:50%;box-shadow:0 0 40px rgba(220,239,149,.3);animation:breathe 2s ease-in-out infinite;"></div><p class="breathing-label" style="color:rgba(255,255,255,.9);font-size:1rem;font-weight:600;letter-spacing:.08em;">Loading Dashboard</p></div>';
        document.documentElement.append(el);
    }
    return el;
}

function hideBreathingOverlay() {
    const el = document.getElementById('arBreathingOverlay');
    if (el) el.remove();
}

// ─── Show guide text below reticle ───
function showGuideText(text) {
    let el = document.getElementById('arGuideText');
    if (!el) {
        el = document.createElement('div');
        el.id = 'arGuideText';
        el.style.cssText = 'position:fixed;left:50%;top:calc(50% + 36px);transform:translateX(-50%);z-index:12001;color:rgba(255,255,255,.92);font-size:.9rem;font-weight:600;text-shadow:0 2px 8px rgba(0,0,0,.5);text-align:center;white-space:nowrap;pointer-events:none;';
        document.documentElement.append(el);
    }
    el.textContent = text;
}

function hideGuideText() {
    const el = document.getElementById('arGuideText');
    if (el) el.remove();
}

// ─── Render full project entry dashboard into AR view ───
function renderDashboard(projectId) {
    // Call the global render function that renders the full project entry/dashboard
    if (window.renderProjectDashboard) {
        // Create a container inside the AR overlay for the dashboard content
        let dashContainer = document.getElementById('arDashboardContainer');
        if (!dashContainer) {
            dashContainer = document.createElement('div');
            dashContainer.id = 'arDashboardContainer';
            dashContainer.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:11000;width:95vw;max-width:860px;max-height:85vh;overflow-y:auto;background:rgba(23,53,34,.95);border-radius:16px;padding:16px;color:#fff;';
            document.documentElement.append(dashContainer);
        }
        dashContainer.innerHTML = '<div style="text-align:center;padding:40px"><div class="breathing-circle" style="width:40px;height:40px;border:2px solid rgba(220,239,149,.9);border-radius:50%;margin:0 auto 12px;animation:breathe 1.5s ease-in-out infinite;"></div><p>Loading dashboard…</p></div>';
        // Fetch dashboard HTML via the existing render function
        if (window.renderProjectDashboard) {
            window.renderProjectDashboard(projectId);
        }
    }
}

// ─── Fixed model matrix for AR panel ───
const FIXED_MODEL_MATRIX = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 1.5, -2, 1
]);

export async function startArNote(_marker, profile) {
    console.log('[AR] startArNote');
    if (!window.isSecureContext) { message('AR requires HTTPS.'); return; }
    if (!navigator.xr) { message('WebXR unavailable.'); return; }
    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) { message('AR not supported.'); return; }
        
        // Show breathing circle immediately
        // Inject CSS keyframes for breathing animation if not already present
        if (!document.getElementById('arBreathingStyle')) {
            const style = document.createElement('style');
            style.id = 'arBreathingStyle';
            style.textContent = '@keyframes breathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.08);opacity:1}}@keyframes fade-in{from{opacity:0}to{opacity:1}}';
            document.documentElement.append(style);
        }
        
        showBreathingOverlay();
        showGuideText('Preparing AR…');
        
        session = await navigator.xr.requestSession('immersive-ar', {
            optionalFeatures: ['local-floor'],
            domOverlay: { root: document.body }
        });

        const nextCanvas = document.createElement('canvas');
        nextCanvas.id = 'arCanvas';
        nextCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9000;';
        document.body.append(nextCanvas);
        createArOverlay();
        
        // Simple WebGL setup for the fixed panel
        gl = nextCanvas.getContext('webgl', { alpha: true, antialias: true, xrCompatible: true });
        if (!gl) throw new Error('WebGL unavailable');
        await gl.makeXRCompatible();
        
        session.updateRenderState({
            baseLayer: new XRWebGLLayer(session, gl, { alpha: true, depth: true, antialias: true }),
            depthNear: 0.01, depthFar: 100
        });
        
        try { refSpace = await session.requestReferenceSpace('local-floor'); }
        catch { refSpace = await session.requestReferenceSpace('local'); }
        
        // Load dashboard into DOM overlay
        hideBreathingOverlay();
        showGuideText('Tap to place dashboard');
        
        // ─── Render the full project dashboard into the DOM overlay ───
        // We create a scrollable container that shows the full project entry UI
        const dashId = window._arProjectId || '';
        let dashContainer = document.createElement('div');
        dashContainer.id = 'arDashboardContainer';
        dashContainer.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:11000;width:92vw;max-width:800px;max-height:80vh;overflow-y:auto;background:rgba(23,53,34,.96);border-radius:16px;padding:20px;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,.5);';
        document.documentElement.append(dashContainer);
        
        // Render the project dashboard content
        if (dashId && window.renderProjectDashboard) {
            // Make a temporary app container to render into, then copy
            const tempContainer = document.createElement('div');
            tempContainer.style.display = 'none';
            document.body.append(tempContainer);
            try {
                await window.renderProjectDashboard(dashId, tempContainer);
                dashContainer.innerHTML = tempContainer.innerHTML;
                // Re-bind all onclick handlers by re-evaluating script-like attributes
                // Since we can't execute scripts, we use the existing global window functions
            } catch(e) {
                console.error('[AR] Dashboard render error:', e);
                dashContainer.innerHTML = '<h2 style="text-align:center;padding:40px">Dashboard</h2><p style="text-align:center">Content could not be loaded. Exit AR and try again.</p>';
            }
            tempContainer.remove();
        } else {
            dashContainer.innerHTML = '<h2 style="text-align:center;padding:20px">Nourishland XR</h2><p style="text-align:center">Tap the panel to interact. Press Exit AR to return.</p>';
        }

        hideGuideText();
        
        session.addEventListener('select', () => {
            // Toggle dashboard visibility on tap
            const dc = document.getElementById('arDashboardContainer');
            if (dc) dc.style.display = dc.style.display === 'none' ? 'block' : 'none';
        });
        
        session.addEventListener('end', () => {
            document.getElementById('arCanvas')?.remove();
            document.getElementById('arDashboardContainer')?.remove();
            hideBreathingOverlay();
            hideGuideText();
            removeArOverlay();
            session = null;
            window.renderLaunchScreen?.();
        });
        
        session.requestAnimationFrame(function draw(time, frame) {
            if (!session || !gl) return;
            session.requestAnimationFrame(draw);
            // Simple clear to pass camera through
            gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        });
        
    } catch (error) {
        console.error('[AR] error:', error);
        hideBreathingOverlay();
        hideGuideText();
        document.getElementById('arCanvas')?.remove();
        document.getElementById('arDashboardContainer')?.remove();
        removeArOverlay();
        session = null;
        message('AR error: ' + (error?.message || 'unknown'));
    }
}

export function resetArPlacement() {}
export function exitAr() { if (session) session.end(); }