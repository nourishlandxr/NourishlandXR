// Build info â€” manual version bump.
// Increment VERSION for every edit/commit so the welcome screen always
// shows the latest deployed version.

const VERSION = '0.9794';

export const BUILD_INFO = Object.freeze({
    version: VERSION,
    commit: 'dev',
    builtAt: new Date().toISOString(),
    target: 'development'
});

console.log(`[Build] ${BUILD_INFO.version} â€” ${BUILD_INFO.builtAt}`);
