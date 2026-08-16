const DASHBOARD_VERSION_KEY = 'nourishland-dashboard-mode-v1';

export const DASHBOARD_VERSIONS = Object.freeze({
    living: 'living',
    classic: 'classic',
    // Backward-compatible internal aliases for links and sessions created
    // before Living Dashboard became the primary experience.
    v2: 'living',
    v09: 'classic'
});

export function readDashboardVersion() {
    try {
        const saved = localStorage.getItem(DASHBOARD_VERSION_KEY);
        if (saved === 'classic' || saved === 'v09') return DASHBOARD_VERSIONS.classic;
        if (saved === 'living' || saved === 'v2') return DASHBOARD_VERSIONS.living;
        // The old key is intentionally read once so existing users who chose
        // the preview keep their selection during the naming transition.
        const legacy = localStorage.getItem('nourishland-dashboard-version-v2');
        return legacy === 'v09' ? DASHBOARD_VERSIONS.classic : DASHBOARD_VERSIONS.living;
    } catch {
        return DASHBOARD_VERSIONS.living;
    }
}

export function rememberDashboardVersion(version) {
    const nextVersion = version === DASHBOARD_VERSIONS.classic || version === DASHBOARD_VERSIONS.v09
        ? DASHBOARD_VERSIONS.classic
        : DASHBOARD_VERSIONS.living;
    try { localStorage.setItem(DASHBOARD_VERSION_KEY, nextVersion); } catch {}
    return nextVersion;
}
