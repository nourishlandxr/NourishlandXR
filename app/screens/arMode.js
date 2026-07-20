/*
 * Creator AR placement mode
 *
 * Creator workflows stay in the web dashboard. AR is deliberately limited to
 * a focused placement session, so there is no second dashboard to maintain or
 * manipulate in the camera view. A physical checkpoint improves repeat visits,
 * but is not required to start a test session.
 */

let session = null;
let gl = null;
let refSpace = null;
let canvas = null;
let overlayRoot = null;
let activeProjectId = '';
let activeAreaId = '';
let activeCheckpointId = '';
let startPromise = null;
let latestViewerMatrix = null;
let checkpointSessionOrigin = null;

function returnToWeb() {
    const projectId = activeProjectId;
    exitArMode();
    window.setTimeout(() => window.renderProjectDashboard?.(encodeURIComponent(projectId)), 0);
}

function openFieldTool(type) {
    const projectId = activeProjectId;
    const areaId = activeAreaId;
    exitArMode();
    window.setTimeout(() => window.renderLocationFieldMarker?.(
        encodeURIComponent(projectId),
        type,
        'ar',
        false,
        encodeURIComponent(areaId)
    ), 0);
}

function openCheckpointSetup() {
    const projectId = activeProjectId;
    exitArMode();
    window.setTimeout(() => window.openCreatorArCheckpointSetup?.(encodeURIComponent(projectId)), 0);
}

function setPlacementStatus(message) {
    const status = overlayRoot?.querySelector('[data-ar-placement-status]');
    if (status) status.textContent = message;
}

function createOverlay() {
    const hasCheckpoint = Boolean(activeAreaId && activeCheckpointId);
    const initialStatus = hasCheckpoint
        ? 'Checkpoint linked. Stand at the marker, then recenter before placing.'
        : 'Test session — no physical code is needed. Use Place to add content or set an Area checkpoint.';
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'creatorArOverlay';
    overlayRoot.className = 'creator-ar-overlay';
    overlayRoot.innerHTML = `
        <p class="creator-ar-placement-status" data-ar-placement-status>${initialStatus}</p>
        <section class="creator-ar-toolbox" aria-label="Place content" aria-hidden="true">
            <button type="button" data-ar-add-checkpoint>Add Area checkpoint</button>
            <button type="button" data-ar-place-tree>Place tree</button>
            <button type="button" data-ar-place-marker>Place marker</button>
            <button type="button" data-ar-place-note>Place note</button>
        </section>
        <nav class="creator-ar-taskbar" aria-label="AR placement controls">
            <button type="button" data-ar-web-mode><b aria-hidden="true">↗</b><span>WEB MODE</span></button>
            <button type="button" data-ar-window="tools" aria-expanded="false"><b aria-hidden="true">＋</b><span>Place</span></button>
            <button type="button" data-ar-recenter><b aria-hidden="true">◎</b><span>Recenter checkpoint</span></button>
            <button type="button" data-ar-exit><b aria-hidden="true">×</b><span>EXIT AR</span></button>
        </nav>`;

    overlayRoot.querySelector('[data-ar-web-mode]').addEventListener('click', returnToWeb);
    overlayRoot.querySelector('[data-ar-window="tools"]').addEventListener('click', event => {
        const toolbox = overlayRoot.querySelector('.creator-ar-toolbox');
        const open = !toolbox.classList.contains('is-open');
        toolbox.classList.toggle('is-open', open);
        toolbox.setAttribute('aria-hidden', String(!open));
        event.currentTarget.setAttribute('aria-expanded', String(open));
    });
    overlayRoot.querySelector('[data-ar-recenter]').addEventListener('click', () => {
        if (!latestViewerMatrix) {
            setPlacementStatus('Move your phone briefly, then recenter the checkpoint.');
            return;
        }
        checkpointSessionOrigin = Float32Array.from(latestViewerMatrix);
        setPlacementStatus(activeCheckpointId
            ? 'Checkpoint origin set for this placement session.'
            : 'Temporary test origin set for this session. Add an Area checkpoint when you install one.');
    });
    overlayRoot.querySelector('[data-ar-add-checkpoint]').addEventListener('click', openCheckpointSetup);
    overlayRoot.querySelector('[data-ar-place-tree]').addEventListener('click', () => openFieldTool('plant'));
    overlayRoot.querySelector('[data-ar-place-marker]').addEventListener('click', () => openFieldTool('sub_checkpoint'));
    overlayRoot.querySelector('[data-ar-place-note]').addEventListener('click', () => openFieldTool('note'));
    overlayRoot.querySelector('[data-ar-exit]').addEventListener('click', exitArMode);
    document.body.append(overlayRoot);
}

function cleanup() {
    refSpace = null;
    canvas?.remove();
    canvas = null;
    overlayRoot?.remove();
    overlayRoot = null;
    document.body.classList.remove('creator-ar-session-active');
    activeProjectId = '';
    activeAreaId = '';
    activeCheckpointId = '';
    latestViewerMatrix = null;
    checkpointSessionOrigin = null;
    gl = null;
}

export function exitArMode() {
    const activeSession = session;
    session = null;
    cleanup();
    activeSession?.end().catch(() => {});
}

export function isArModeActive() {
    return Boolean(session);
}

export async function startArMode(projectId, areaId = '', checkpointId = '') {
    if (session) return true;
    if (startPromise) return startPromise;

    // Request the session directly from the tap that launched AR. Awaiting a
    // capability preflight first can lose that user activation on phones.
    startPromise = launchArMode(projectId, areaId, checkpointId);
    try {
        return await startPromise;
    } finally {
        startPromise = null;
    }
}

async function launchArMode(projectId, areaId, checkpointId) {
    if (!projectId || !navigator.xr || !window.isSecureContext) return false;
    activeProjectId = projectId;
    activeAreaId = areaId;
    activeCheckpointId = checkpointId;
    createOverlay();

    try {
        session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['dom-overlay'],
            optionalFeatures: ['local-floor'],
            domOverlay: { root: overlayRoot }
        });
        document.body.classList.add('creator-ar-session-active');

        canvas = document.createElement('canvas');
        canvas.className = 'creator-ar-canvas';
        document.body.append(canvas);
        gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
        if (!gl) throw new Error('WebGL unavailable.');
        await gl.makeXRCompatible();

        const layer = new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true });
        session.updateRenderState({ baseLayer: layer, depthNear: 0.01, depthFar: 50 });
        try {
            refSpace = await session.requestReferenceSpace('local-floor');
        } catch {
            refSpace = await session.requestReferenceSpace('local');
        }

        const draw = (_time, frame) => {
            if (frame.session !== session || !gl) return;
            frame.session.requestAnimationFrame(draw);
            const pose = frame.getViewerPose(refSpace);
            if (!pose) return;
            latestViewerMatrix = Float32Array.from(pose.transform.matrix);

            gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clearDepth(1);
            for (const view of pose.views) {
                const viewport = layer.getViewport(view);
                if (!viewport) continue;
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            }
        };

        session.addEventListener('end', () => {
            session = null;
            cleanup();
        });
        session.requestAnimationFrame(draw);
        return true;
    } catch (error) {
        console.error('[Creator AR]', error);
        const activeSession = session;
        session = null;
        cleanup();
        activeSession?.end().catch(() => {});
        return false;
    }
}
