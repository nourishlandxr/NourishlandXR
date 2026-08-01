export async function requestImmersiveArSession(domOverlayRoot) {
    if (!navigator.xr) throw new Error('WebXR is unavailable in this browser.');
    if (!window.isSecureContext) throw new Error('WebXR requires a secure HTTPS connection.');
    if (!await navigator.xr.isSessionSupported('immersive-ar')) {
        throw new Error('This browser does not report immersive AR support.');
    }

    const attempts = [
        { requiredFeatures: ['dom-overlay', 'hit-test'], optionalFeatures: ['local-floor'] },
        { requiredFeatures: ['dom-overlay'], optionalFeatures: ['hit-test', 'local-floor'] }
    ];
    let lastError = null;
    for (const options of attempts) {
        try {
            const session = await navigator.xr.requestSession('immersive-ar', {
                ...options,
                domOverlay: { root: domOverlayRoot }
            });
            return { session };
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('The immersive AR session could not be started.');
}
