/**
 * AR Mode — Creator Dashboard AR via WebXR DOM overlay.
 * Preserves the complete interactive project dashboard over the camera.
 * No WebGL panel rendering — uses dom-overlay to show existing #app content.
 */

let session = null;
let gl = null;
let refSpace = null;
let canvas = null;
let finishingDemo = false;

function cleanup() {
    canvas?.remove(); canvas = null;
    gl = null; refSpace = null;
}

export function exitArMode() {
    finishingDemo = true;
    const s = session; session = null; cleanup();
    if (s) s.end().catch(() => {});
}

export function isArModeActive() { return Boolean(session); }

export async function startArMode(projectId = '') {
    if (projectId) window._arProjectId = projectId;
    if (!navigator.xr || !window.isSecureContext) return false;

    const appEl = document.getElementById('app');
    if (!appEl) return false;

    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) return false;

        // Save current app HTML so we can restore it on exit
        const savedHTML = appEl.innerHTML;

        // Request session with DOM overlay — the #app content stays visible
        session = await navigator.xr.requestSession('immersive-ar', {
            optionalFeatures: ['local-floor'],
            domOverlay: { root: document.body }
        });

        // Add transparent WebGL canvas for camera pass-through (required by spec)
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:11999';
        document.body.append(canvas);

        gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL unavailable');
        await gl.makeXRCompatible();

        session.updateRenderState({
            baseLayer: new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true }),
            depthNear: 0.01, depthFar: 50
        });

        try { refSpace = await session.requestReferenceSpace('local-floor'); }
        catch { refSpace = await session.requestReferenceSpace('local'); }

        finishingDemo = false;

        // Minimal draw loop — just clears framebuffer to transparent
        // The DOM overlay (#app) stays visible on top
        session.requestAnimationFrame(function draw(time, frame) {
            if (frame.session !== session || !gl) return;
            session.requestAnimationFrame(draw);
            const layer = session.renderState.baseLayer;
            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        });

        session.addEventListener('end', () => {
            if (!finishingDemo) {
                // Restore project dashboard
                if (window._arProjectId) {
                    window.renderProjectDashboard(window._arProjectId);
                }
            }
            finishingDemo = false; session = null; cleanup();
        });

        return true;

    } catch (error) {
        console.error('[AR Mode]', error);
        try { session?.end(); } catch {}
        session = null; cleanup();
        return false;
    }
}