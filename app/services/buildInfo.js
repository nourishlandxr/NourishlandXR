// Build info — auto-generated.
// Every page load produces a unique version based on build timestamp.
// In production (dist/) this file is overwritten by the build script
// with a proper git+timestamp version.

const now = new Date();
const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '-' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

// Base version — bump this number for significant releases.
// The timestamp suffix ensures every load produces a unique version.
const BASE = '0.8127';

export const BUILD_INFO = Object.freeze({
    version: `${BASE}@${ts}`,
    commit: 'dev',
    builtAt: now.toISOString(),
    target: 'development'
});

console.log(`[Build] v${BUILD_INFO.version} — ${BUILD_INFO.builtAt}`);