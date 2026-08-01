export const WEBXR_SESSION_MODES = Object.freeze(['immersive-ar', 'immersive-vr']);

export function selectWebXRSessionMode(support = {}) {
    if (support['immersive-ar'] === true) return 'immersive-ar';
    if (support['immersive-vr'] === true) return 'immersive-vr';
    return '';
}

export async function detectWebXRSessionSupport() {
    const support = { 'immersive-ar': false, 'immersive-vr': false };
    if (!navigator.xr) return { ...support, preferredMode: '' };

    // Keep these explicit because some browsers expose one mode but reject
    // probing the other. AR remains the preferred path on phones and on
    // Quest browsers that expose passthrough WebXR.
    try { support['immersive-ar'] = await navigator.xr.isSessionSupported('immersive-ar'); } catch { /* unsupported */ }
    try { support['immersive-vr'] = await navigator.xr.isSessionSupported('immersive-vr'); } catch { /* unsupported */ }
    return { ...support, preferredMode: selectWebXRSessionMode(support) };
}

const SESSION_ATTEMPTS = Object.freeze({
    'immersive-ar': [
        { requiredFeatures: ['dom-overlay', 'hit-test'], optionalFeatures: ['local-floor'] },
        { requiredFeatures: ['dom-overlay'], optionalFeatures: ['hit-test', 'local-floor'] }
    ],
    // Quest Browser can expose native 6DoF WebXR without advertising
    // immersive-ar. DOM overlay keeps Nourishland's controls available in
    // that mode; the scene is intentionally opaque when passthrough is not
    // available, so the UI does not pretend it is seeing the real garden.
    'immersive-vr': [
        { requiredFeatures: ['dom-overlay'], optionalFeatures: ['local-floor', 'bounded-floor', 'hit-test'] },
        { requiredFeatures: [], optionalFeatures: ['dom-overlay', 'local-floor', 'bounded-floor', 'hit-test'] }
    ]
});

function requestSessionForMode(mode, options, domOverlayRoot) {
    const requestOptions = { ...options };
    if (options.requiredFeatures.includes('dom-overlay') || options.optionalFeatures.includes('dom-overlay')) {
        requestOptions.domOverlay = { root: domOverlayRoot };
    }
    return mode === 'immersive-ar'
        ? navigator.xr.requestSession('immersive-ar', requestOptions)
        : navigator.xr.requestSession('immersive-vr', requestOptions);
}

// Kept under the historical export name so existing creator, demo, and
// explorer callers all gain Quest support without changing their APIs.
export async function requestImmersiveArSession(domOverlayRoot) {
    if (!navigator.xr) throw new Error('WebXR is unavailable in this browser.');
    if (!window.isSecureContext) throw new Error('WebXR requires a secure HTTPS connection.');

    const support = await detectWebXRSessionSupport();
    const modes = WEBXR_SESSION_MODES.filter(mode => support[mode]);
    if (!modes.length) {
        throw new Error('This browser does not report immersive AR or immersive VR support.');
    }
    modes.sort((left, right) => Number(right === support.preferredMode) - Number(left === support.preferredMode));

    let lastError = null;
    for (const mode of modes) {
        for (const options of SESSION_ATTEMPTS[mode]) {
            try {
                const session = await requestSessionForMode(mode, options, domOverlayRoot);
                return { session, mode, passthrough: mode === 'immersive-ar' };
            } catch (error) {
                lastError = error;
            }
        }
    }
    throw lastError || new Error('The immersive WebXR session could not be started.');
}
