const hostedPath = window.location.pathname === '/xr' || window.location.pathname.startsWith('/xr/');

export const HOSTED_MODE = Boolean(window.NOURISHLAND_CONFIG?.hosted ?? hostedPath);
export const API_BASE = window.NOURISHLAND_CONFIG?.apiBase || (HOSTED_MODE ? '/xr-api' : '/api');
let creatorAuthDisabled = false;

export function isCreatorAuthDisabled() {
    return HOSTED_MODE && creatorAuthDisabled;
}

export async function apiFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    const method = String(options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD'].includes(method)) headers['X-Nourishland-Creator'] = '1';
    return fetch(url, {
        cache: 'no-store',
        credentials: 'same-origin',
        ...options,
        headers
    });
}

export async function ensureCreatorAuthentication() {
    const status = await apiFetch(`${API_BASE}/auth/session`);
    if (!status.ok) throw new Error(`Authentication check failed (${status.status})`);
    const session = await status.json();
    creatorAuthDisabled = session.authDisabled === true;
    if (session.authenticated) return true;

    const username = window.prompt('Creator account name (leave blank for the existing administrator login)');
    if (username === null) return false;
    const password = window.prompt('Creator password');
    if (password === null) return false;
    const response = await apiFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Creator login failed (${response.status})`);
    creatorAuthDisabled = false;
    return true;
}

export async function logoutCreatorAuthentication() {
    const response = await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Creator logout failed (${response.status})`);
    return true;
}
