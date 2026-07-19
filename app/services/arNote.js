import { initPanelRenderer, createPanelTexture, renderARPanel } from './arPanel.js';

let session;
let gl;
let refSpace;
let renderer = null;
let panelTex = null;

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

function drawMenuPanel(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(20,55,34,.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = '700 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nourishland XR', w / 2, 42);
    ctx.fillStyle = '#dcef95';
    ctx.font = '13px sans-serif';
    ctx.fillText('EXPLORER', w / 2, 62);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.font = '16px sans-serif';
    ctx.fillText('Explore in augmented reality', w / 2, 100);
    ctx.fillStyle = '#dcef95';
    ctx.fillRect(20, 130, w - 40, 44);
    ctx.fillStyle = '#173522';
    ctx.font = '700 18px sans-serif';
    ctx.fillText('Browse Plants', w / 2, 158);
    ctx.fillStyle = '#28c840';
    ctx.fillRect(20, 188, w - 40, 44);
    ctx.fillStyle = '#fff';
    ctx.font = '700 18px sans-serif';
    ctx.fillText('View Markers', w / 2, 216);
    ctx.fillStyle = '#c43636';
    ctx.fillRect(20, h - 56, w - 40, 40);
    ctx.fillStyle = '#fff';
    ctx.font = '700 16px sans-serif';
    ctx.fillText('Exit', w / 2, h - 32);
}

export async function startArNote(_marker, profile) {
    if (!window.isSecureContext) { alert('AR requires HTTPS.'); return; }
    if (!navigator.xr) { alert('WebXR unavailable.'); return; }
    try {
        if (!await navigator.xr.isSessionSupported('immersive-ar')) { alert('AR not supported.'); return; }

        session = await navigator.xr.requestSession('immersive-ar', {
            optionalFeatures: ['local-floor'],
            domOverlay: { root: document.body }
        });

        const canvas = document.createElement('canvas');
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

        // Initialize shared billboard renderer
        renderer = initPanelRenderer(gl);
        panelTex = createPanelTexture(gl, drawMenuPanel);

        session.addEventListener('end', () => {
            document.getElementById('arCanvas')?.remove();
            session = null; gl = null; renderer = null; panelTex = null;
        });

        // Draw loop with billboard panel
        session.requestAnimationFrame(function draw(time, frame) {
            if (!session || !gl) return;
            session.requestAnimationFrame(draw);
            try {
                renderARPanel(gl, frame, refSpace, panelTex, {
                    program: renderer.program,
                    buffer: renderer.buffer,
                    position: [0, 1.5, -2],
                    width: 0.92,
                    height: 0.65
                });
            } catch(e) { console.error('[AR] render error:', e); }
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