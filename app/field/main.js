import { BUILD_INFO } from '../services/buildInfo.js';
import { renderPlatformApplication } from '../services/platformApplication.js';

// The Field entry always owns field behavior, even on desktop or a misleading query.
const rendering = renderPlatformApplication({ mode: 'field' });
const output = document.querySelector('[data-field-shell-status]');
if ('serviceWorker' in navigator && globalThis.isSecureContext) {
    try {
        const registration = await navigator.serviceWorker.register(`./worker.js?v=${encodeURIComponent(BUILD_INFO.version)}`, { scope: './' });
        const ready = () => { output.textContent = 'Field app ready for offline journal and checklist access. Project downloads are coming later.'; };
        const failed = () => { output.textContent = 'Offline app preparation did not finish. Your saved journal drafts remain on this device.'; };
        if (registration.waiting) output.textContent = 'Field app update downloaded. Close existing Field tabs and reopen to use it offline.';
        else if (registration.active) ready();
        const installing = registration.installing;
        if (installing) {
            output.textContent = 'Preparing the field app for offline journal access…';
            const observe = () => {
                if (installing.state === 'activated') ready();
                else if (installing.state === 'installed') output.textContent = 'Field app downloaded. Reopen after closing existing Field tabs to use the update.';
                else if (installing.state === 'redundant') failed();
            };
            installing.addEventListener('statechange', observe); observe();
        }
        // No automatic reload: an app update must never discard an unsaved observation.
    } catch {
        output.textContent = 'Offline app preparation is unavailable. The online field tools and local journal remain available.';
    }
} else output.textContent = 'Offline app preparation needs a supported browser and a secure connection.';
await rendering;
