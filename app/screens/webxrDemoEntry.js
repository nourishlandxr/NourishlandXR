import { BUILD_INFO } from '../services/buildInfo.js';
import { dashboardIcon } from '../services/workspaceIcons.js';

// Native launch links land here without restoring a creator view or welcome menu.
// Starting remains an explicit browser action; no automatic permissions/XR request.
export function renderWebxrDemoEntry(app, { onStart, onHome } = {}) {
    document.body.dataset.experienceRole = 'visitor';
    app.innerHTML = `<section class="screen webxr-direct-entry"><header class="page-header"><p>Nourishland WebXR · V${BUILD_INFO.version}</p><h1>WebXR introduction</h1><p>The existing introduction runs here in your browser. Start it on a compatible phone or headset.</p></header><div class="panel"><button type="button" class="primary" data-webxr-start>Start the introduction</button><p role="status" data-webxr-status></p></div><button type="button" class="icon-control" data-webxr-home aria-label="Nourishland welcome" title="Nourishland welcome">${dashboardIcon('home')}</button></section>`;
    const button = app.querySelector('[data-webxr-start]');
    let starting = false;
    button.addEventListener('click', () => {
        if (starting) return;
        starting = true; button.disabled = true;
        // Invoke inside this click, preserving the existing browser activation path.
        try {
            Promise.resolve(onStart?.()).catch(error => {
                if (!button.isConnected) return;
                starting = false; button.disabled = false;
                app.querySelector('[data-webxr-status]').textContent = `The introduction could not start: ${error.message}`;
            });
        } catch (error) {
            starting = false; button.disabled = false;
            app.querySelector('[data-webxr-status]').textContent = `The introduction could not start: ${error.message}`;
        }
    });
    app.querySelector('[data-webxr-home]').addEventListener('click', () => onHome?.());
}
