let session;
let gl;
let refSpace;
let canvas;
let overlay;
let savedAppHtml = '';

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

function removeArOverlay() {
    document.body.classList.remove('ar-session-active');
    overlay?.remove(); overlay = null;
}

function createArOverlay() {
    document.body.classList.add('ar-session-active');
    overlay = document.createElement('div');
    overlay.id = 'arOverlayControls';
    overlay.innerHTML = '<div class="ar-overlay-copy"><div id="arOverlayStatus">AR active</div></div><div class="ar-overlay-buttons"><button type="button" onclick="window.exitAr()">Exit AR</button></div>';
    overlay.addEventListener('beforexrselect', e => e.preventDefault());
    document.body.append(overlay);
}

// ─── Inject keyframes ───
if (!document.getElementById('arBreathingStyle')) {
    const s = document.createElement('style');
    s.id = 'arBreathingStyle';
    s.textContent = '@keyframes breathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.08);opacity:1}}@keyframes fade-in{from{opacity:0}to{opacity:1}}';
    document.documentElement.append(s);
}

export async function startArNote(_marker, profile) {
    console.log('[AR] startArNote');
    if (!window.isSecureContext) { alert('AR requires HTTPS.'); return; }
    if (!navigator.xr) { alert('WebXR unavailable.'); return; }
    
    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) { alert('AR not supported.'); return; }
        
        // Save current app state so we can restore it
        savedAppHtml = document.getElementById('app')?.innerHTML || '';
        
        session = await navigator.xr.requestSession('immersive-ar', {
            optionalFeatures: ['local-floor'],
            domOverlay: { root: document.body }
        });

        const nextCanvas = document.createElement('canvas');
        nextCanvas.id = 'arCanvas';
        nextCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9000;';
        document.body.append(nextCanvas);
        createArOverlay();
        
        // Simple WebGL for camera pass-through
        gl = nextCanvas.getContext('webgl', { alpha: true, antialias: true, xrCompatible: true });
        if (!gl) throw new Error('WebGL unavailable');
        await gl.makeXRCompatible();
        
        session.updateRenderState({
            baseLayer: new XRWebGLLayer(session, gl, { alpha: true, depth: true, antialias: true }),
            depthNear: 0.01, depthFar: 100
        });
        
        try { refSpace = await session.requestReferenceSpace('local-floor'); }
        catch { refSpace = await session.requestReferenceSpace('local'); }
        
        // Show dashboard overlay
        const dashContainer = document.createElement('div');
        dashContainer.id = 'arDashboardContainer';
        dashContainer.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:11000;width:92vw;max-width:800px;max-height:80vh;overflow-y:auto;background:#f7f7f4;border-radius:16px;padding:20px;color:#1f241f;box-shadow:0 8px 32px rgba(0,0,0,.5);display:block;';
        document.documentElement.append(dashContainer);
        
        // Capture dashboard HTML by rendering into a temp container
        const dashId = window._arProjectId || '';
        dashContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#555"><div class="breathing-circle" style="width:40px;height:40px;border:2px solid #2f6d42;border-radius:50%;margin:0 auto 16px;animation:breathe 1.5s ease-in-out infinite;"></div><p>Loading dashboard…</p></div>';
        
        // Render the full project dashboard into the floating container
        // We render to the #app element temporarily, capture HTML, then restore
        const appEl = document.getElementById('app');
        const savedDashHtml = appEl?.innerHTML || '';
        
        // Load the project dashboard - this sets app.innerHTML via window.renderProjectDashboard
        if (dashId && window.renderProjectDashboard) {
            try {
                await window.renderProjectDashboard(dashId);
                // Now app.innerHTML has the dashboard. Copy it to our container.
                dashContainer.innerHTML = appEl.innerHTML;
                // Restore app to original state (hidden behind AR anyway)
                appEl.innerHTML = savedDashHtml;
            } catch(e) {
                console.error('[AR] Dashboard render error:', e);
                dashContainer.innerHTML = '<h2 style="text-align:center;padding:30px">Nourishland XR</h2><p style="text-align:center;color:#666">Dashboard unavailable.</p>';
                appEl.innerHTML = savedDashHtml;
            }
        } else {
            dashContainer.innerHTML = '<h2 style="text-align:center;padding:30px">Nourishland XR</h2><p style="text-align:center;color:#666">Tap to interact. Exit AR to return.</p>';
        }
        
        session.addEventListener('select', () => {
            const dc = document.getElementById('arDashboardContainer');
            if (dc) dc.style.display = dc.style.display === 'none' ? 'block' : 'none';
        });
        
        session.addEventListener('end', () => {
            document.getElementById('arCanvas')?.remove();
            document.getElementById('arDashboardContainer')?.remove();
            removeArOverlay();
            session = null; gl = null;
            // Restore app
            if (savedAppHtml && appEl) appEl.innerHTML = savedAppHtml;
        });
        
        // Simple draw loop - pass camera through
        session.requestAnimationFrame(function draw(time, frame) {
            if (!session || !gl) return;
            session.requestAnimationFrame(draw);
            gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        });
        
    } catch (error) {
        console.error('[AR] error:', error);
        document.getElementById('arCanvas')?.remove();
        document.getElementById('arDashboardContainer')?.remove();
        removeArOverlay();
        session = null;
        alert('AR error: ' + (error?.message || 'unknown'));
    }
}

export function resetArPlacement() {}
export function exitAr() { if (session) session.end(); }