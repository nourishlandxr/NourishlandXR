const CAMERA_SAFETY_ACK_KEY = 'nourishlandxr.camera-safety-ack.v1';
const AR_INTRO_PREPARATION_SKIP_KEY = 'nourishlandxr.ar-introduction-preparation-skip.v1';

function storageOrDefault(storage) {
    return storage || globalThis.localStorage;
}

function readFlag(key, storage) {
    try { return storageOrDefault(storage)?.getItem(key) === 'true'; }
    catch { return false; }
}

function writeFlag(key, storage) {
    try { storageOrDefault(storage)?.setItem(key, 'true'); }
    catch {}
}

export function hasArCameraSafetyAcknowledgement(storage) {
    return readFlag(CAMERA_SAFETY_ACK_KEY, storage);
}

export function acknowledgeArCameraSafety(storage) {
    writeFlag(CAMERA_SAFETY_ACK_KEY, storage);
}

export function shouldSkipArIntroductionPreparation(storage) {
    return readFlag(AR_INTRO_PREPARATION_SKIP_KEY, storage);
}

export function skipArIntroductionPreparation(storage) {
    writeFlag(AR_INTRO_PREPARATION_SKIP_KEY, storage);
}

export const AR_CAMERA_SAFETY_COPY = Object.freeze({
    title: 'Step into AR',
    body: 'NourishlandXR uses your camera to connect digital plants and information with the space around you. Before continuing, move to a calm, clear area and stay aware of obstacles and other people. Never use AR while driving, cycling or operating equipment.'
});

export function renderArSafetyScreen(app, { onContinue, onCancel } = {}) {
    if (!app) return;
    app.innerHTML = `<div class="screen ar-safety-screen" data-ar-safety-screen>
        <div class="page-header"><p class="welcome-label">AR safety</p><h1>${AR_CAMERA_SAFETY_COPY.title}</h1><p class="subtitle">A calm start helps AR work well.</p></div>
        <section class="panel ar-safety-card">
            <div class="ar-safety-icon-row" aria-hidden="true"><span class="ar-safety-icon ar-safety-camera-icon">⌾</span><span class="ar-safety-icon ar-safety-awareness-icon">✦</span></div>
            <p>${AR_CAMERA_SAFETY_COPY.body}</p>
            <p class="meta">Your browser will ask for camera access after you choose to continue. NourishlandXR cannot bypass that permission.</p>
        </section>
        <div class="button-row ar-safety-actions"><button class="primary" type="button" data-ar-safety-continue>Continue and allow camera</button><button type="button" data-ar-safety-cancel>Not now</button></div>
    </div>`;
    app.querySelector('[data-ar-safety-continue]')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        acknowledgeArCameraSafety();
        try { await onContinue?.(); }
        finally { button.disabled = false; }
    });
    app.querySelector('[data-ar-safety-cancel]')?.addEventListener('click', () => onCancel?.());
}

export function renderArIntroductionPreparation(app, { onContinue, onCancel } = {}) {
    if (!app) return;
    app.innerHTML = `<div class="screen ar-safety-screen ar-introduction-preparation" data-ar-introduction-preparation>
        <div class="page-header"><p class="welcome-label">Before you begin</p><h1>Ready to explore?</h1><p class="subtitle">NourishlandXR is designed for spatial devices and mobile phones. A limited desktop preview is available, but the full experience is best tried on a compatible device.</p></div>
        <section class="panel ar-safety-card ar-introduction-preparation-card">
            <p class="ar-introduction-lead">On a supported device, this introduction places NourishlandXR’s learning cells in the space around you. Desktop preview presents a limited on-screen version.</p>
            <div class="ar-preparation-points">
                <div><span aria-hidden="true">◎</span><p><strong>Make a little room</strong><small>Use a clear, calm space and stay aware of people and obstacles.</small></p></div>
                <div><span aria-hidden="true">⌾</span><p><strong>Camera and tracking</strong><small>A spatial device or phone may request access after you continue. Desktop preview does not need a camera.</small></p></div>
                <div><span aria-hidden="true">✦</span><p><strong>Move at your pace</strong><small>On a Spatial device, stay within your safety boundary. On a phone, hold the device securely.</small></p></div>
            </div>
            <p class="meta">You can leave at any time. Camera access, when available, begins only after you continue and grant permission.</p>
        </section>
        <label class="ar-preparation-skip-toggle ar-introduction-remember"><input type="checkbox" data-ar-introduction-remember /> <span>Don’t show this preparation next time on this device</span></label>
        <div class="button-row ar-safety-actions"><button type="button" data-ar-introduction-cancel>Not now</button><button class="primary global-ar-action" type="button" data-ar-introduction-continue>Begin introduction</button></div>
    </div>`;
    app.querySelector('[data-ar-introduction-continue]')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        const remember = Boolean(app.querySelector('[data-ar-introduction-remember]')?.checked);
        if (remember) skipArIntroductionPreparation();
        try { await onContinue?.({ remember }); }
        finally { button.disabled = false; }
    });
    app.querySelector('[data-ar-introduction-cancel]')?.addEventListener('click', () => onCancel?.());
}

export function showArSafetyDialog(root) {
    if (!root) return null;
    root.querySelector('[data-ar-safety-dialog]')?.remove();
    const dialog = document.createElement('section');
    dialog.className = 'nxr-ar-safety-dialog';
    dialog.dataset.arSafetyDialog = 'true';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'nxrArSafetyDialogTitle');
    dialog.innerHTML = `<div class="nxr-ar-safety-dialog-card"><div class="ar-safety-icon-row" aria-hidden="true"><span class="ar-safety-icon ar-safety-camera-icon">⌾</span><span class="ar-safety-icon ar-safety-awareness-icon">✦</span></div><h2 id="nxrArSafetyDialogTitle">AR safety</h2><p>${AR_CAMERA_SAFETY_COPY.body}</p><button type="button" data-ar-safety-dialog-close>Close</button></div>`;
    root.append(dialog);
    dialog.querySelector('[data-ar-safety-dialog-close]')?.addEventListener('click', () => dialog.remove());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.remove(); });
    dialog.querySelector('[data-ar-safety-dialog-close]')?.focus();
    return dialog;
}
