/**
 * arNote.js — Visitor/Explorer AR via WebXR DOM overlay.
 * Keeps existing #app content visible over camera feed.
 * No WebGL panel — just transparent clear + DOM overlay.
 */

let session;
let gl;
let refSpace;
let canvas;

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

export async function startArNote(_marker, profile) {
    if (!window.isSecureContext) { alert('AR requires HTTPS.'); return; }
    if (!navigator.xr) { alert('WebXR unavailable.'); return; }
    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) { alert('AR not supported.'); return; }

        session = await navigator.xr.requestSession('immersive-ar', {
            optionalFeatures: ['local-floor'],
            domOverlay: { root: document.body }
        });

        canvas = document.createElement('canvas');
        canvas.id = 'arCanvas';
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9000;';
        document.body.append(canvas);

        gl = canvas.getContext('webgl', { alpha: true, antialias: true, xrCompatible: true });
        if (!gl) throw new Error('WebGL unavailable');
        await gl.makeXRCompatible();

        session.updateRenderState({
            baseLayer: new XRWebGLLayer(session, gl, { alpha: true, depth: true, antialias: true }),
            depthNear: 0.01, depthFar: 100
        });

        try { refSpace = await session.requestReferenceSpace('local-floor'); }
        catch { refSpace = await session.requestReferenceSpace('local'); }

        session.addEventListener('end', () => {
            document.getElementById('arCanvas')?.remove();
            session = null; gl = null;
        });

        // Minimal draw - transparent pass-through
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
        session = null;
        alert('AR error: ' + (error?.message || 'unknown'));
    }
}

export function resetArPlacement() {}
export function exitAr() { if (session) session.end(); }