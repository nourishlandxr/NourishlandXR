export const WEBXR_SESSION_MODES = Object.freeze(['immersive-ar', 'immersive-vr']);

export function isQuestHeadsetBrowser(userAgent = globalThis.navigator?.userAgent || '', userAgentData = globalThis.navigator?.userAgentData) {
    const brands = Array.isArray(userAgentData?.brands) ? userAgentData.brands.map(brand => brand?.brand).join(' ') : '';
    const deviceHints = [userAgentData?.model, userAgentData?.platform, brands].filter(Boolean).join(' ');
    return /(?:OculusBrowser|Meta Quest|Quest(?:\s+(?:2|3|Pro))?)/i.test(`${String(userAgent)} ${deviceHints}`);
}

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
        // Match the WebXR AR sample pattern: hit-test is useful for placing
        // content, while DOM overlay is optional and must not block camera
        // passthrough on runtimes that omit that feature.
        { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'local-floor'] },
        // Passthrough is more important than optional controls. Some Quest
        // runtimes expose immersive-ar but reject DOM overlay or hit-test;
        // allow the session to start and let placement use view direction.
        { requiredFeatures: [], optionalFeatures: ['dom-overlay', 'hit-test', 'local-floor'] },
        { requiredFeatures: [], optionalFeatures: [] }
    ],
    // Quest Browser can expose native 6DoF WebXR without advertising
    // immersive-ar. DOM overlay keeps Nourishland's controls available in
    // that mode; the scene is intentionally opaque when passthrough is not
    // available, so the UI does not pretend it is seeing the real garden.
    'immersive-vr': [
        { requiredFeatures: ['dom-overlay'], optionalFeatures: ['local-floor', 'bounded-floor', 'hit-test'] },
        { requiredFeatures: [], optionalFeatures: ['dom-overlay', 'local-floor', 'bounded-floor', 'hit-test'] },
        // A valid native Quest session must still be usable when this
        // browser does not expose DOM overlay at all.
        { requiredFeatures: [], optionalFeatures: [] }
    ]
});

function requestSessionForMode(mode, options, domOverlayRoot) {
    const requestOptions = { ...options, optionalFeatures: [...new Set([...options.optionalFeatures, 'hand-tracking'])] };
    if (options.requiredFeatures.includes('dom-overlay') || options.optionalFeatures.includes('dom-overlay')) {
        requestOptions.domOverlay = { root: domOverlayRoot };
    }
    return mode === 'immersive-ar'
        ? navigator.xr.requestSession('immersive-ar', requestOptions)
        : navigator.xr.requestSession('immersive-vr', requestOptions);
}

function requiredDomOverlayAttempts(mode) {
    return SESSION_ATTEMPTS[mode].map(options => ({
        ...options,
        requiredFeatures: [...new Set([...options.requiredFeatures, 'dom-overlay'])],
        optionalFeatures: options.optionalFeatures.filter(feature => feature !== 'dom-overlay')
    }));
}

function sessionAttemptsForMode(mode, requireDomOverlay, preferDomOverlay) {
    if (requireDomOverlay) return requiredDomOverlayAttempts(mode);
    if (preferDomOverlay) return [...requiredDomOverlayAttempts(mode), ...SESSION_ATTEMPTS[mode]];
    return SESSION_ATTEMPTS[mode];
}

// Kept under the historical export name so existing creator, demo, and
// explorer callers all gain Quest support without changing their APIs.
export async function requestImmersiveArSession(domOverlayRoot, { requireDomOverlay = false, preferDomOverlay = false } = {}) {
    if (!navigator.xr) throw new Error('WebXR is unavailable in this browser.');
    if (!window.isSecureContext) throw new Error('WebXR requires a secure HTTPS connection.');
    if (requireDomOverlay && !domOverlayRoot) throw new Error('Creator AR requires a DOM overlay root.');

    const support = await detectWebXRSessionSupport();
    const modes = WEBXR_SESSION_MODES.filter(mode => support[mode]);
    if (!modes.length) {
        throw new Error('This browser does not report immersive AR or immersive VR support.');
    }
    modes.sort((left, right) => Number(right === support.preferredMode) - Number(left === support.preferredMode));

    let lastError = null;
    for (const mode of modes) {
        for (const options of sessionAttemptsForMode(mode, requireDomOverlay, preferDomOverlay)) {
            try {
                const session = await requestSessionForMode(mode, options, domOverlayRoot);
                if (requireDomOverlay && !session.domOverlayState) {
                    await session.end().catch(() => {});
                    throw new Error('This WebXR session did not enable the Creator AR control overlay.');
                }
                const blendMode = session.environmentBlendMode || '';
                return {
                    session,
                    mode,
                    blendMode,
                    domOverlay: Boolean(session.domOverlayState),
                    passthrough: mode === 'immersive-ar' && blendMode !== 'opaque'
                };
            } catch (error) {
                lastError = error;
            }
        }
    }
    throw lastError || new Error('The immersive WebXR session could not be started.');
}
