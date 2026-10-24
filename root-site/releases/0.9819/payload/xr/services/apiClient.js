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
    if (session.authenticated) {
        if(session.identity?.status==='pending')throw Error('Your Creator account is awaiting approval. Open Account to check its status.');
        return true;
    }
    const {requestCreatorSignIn}=await import("./creatorSignIn.js?v=0.9819");
    const authenticated=await requestCreatorSignIn();
    creatorAuthDisabled=false;
    return authenticated;
}

export async function accountRequest(route,{method='GET',body}={}){
    const response=await apiFetch(`${API_BASE}${route}`,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    const value=await response.json().catch(()=>({}));
    if(!response.ok){const error=Error(value.error || `Account service unavailable (${response.status}).`);error.status=response.status;throw error;}
    return value;
}

export async function logoutCreatorAuthentication() {
    const response = await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Creator logout failed (${response.status})`);
    return true;
}
