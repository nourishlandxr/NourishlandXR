const CAMERA_SAFETY_ACK_KEY = 'nourishlandxr.camera-safety-ack.v1';

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
