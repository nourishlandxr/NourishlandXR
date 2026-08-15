/* Keep handheld AR orientation-permissive without branching on user agent. */
export function allowArScreenRotation() {
    const orientation = globalThis.screen?.orientation;
    if (typeof orientation?.lock === 'function') {
        try {
            const request = orientation.lock('any');
            request?.catch?.(() => {
                try { orientation.unlock?.(); } catch { /* browser rejected the optional lock */ }
            });
            return;
        } catch {
            // Fall through to the legacy Android unlock below.
        }
    }
    try { globalThis.screen?.unlockOrientation?.(); } catch { /* optional legacy API */ }
}

export function releaseArScreenRotation() {
    try { globalThis.screen?.orientation?.unlock?.(); } catch { /* optional API */ }
    try { globalThis.screen?.unlockOrientation?.(); } catch { /* optional legacy API */ }
}
