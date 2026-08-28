const MIN_QUERY_LENGTH = 2;
const searchCache = new Map();
let activeController = null;

const apiBase = () => {
    const hostedPath = typeof window !== 'undefined' && (window.location.pathname === '/xr' || window.location.pathname.startsWith('/xr/'));
    return typeof window !== 'undefined' ? (window.NOURISHLAND_CONFIG?.apiBase || (hostedPath ? '/xr-api' : '/api')) : '/api';
};

export function buildDaleysSearchUrl(query) {
    return `${apiBase()}/plant-search/daleys?q=${encodeURIComponent(String(query || '').trim())}`;
}

export function clearDaleysPlantSearchCache() {
    searchCache.clear();
}

export async function searchDaleysPlants(query, options = {}) {
    const value = String(query || '').trim();
    if (value.length < MIN_QUERY_LENGTH) return [];
    const cacheKey = value.toLocaleLowerCase();
    if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);
    if (activeController) activeController.abort();
    const controller = new AbortController();
    activeController = controller;
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== 'function') throw new Error('Daleys plant search is unavailable in this browser.');
    try {
        const response = await fetchImpl(buildDaleysSearchUrl(value), {
            signal: options.signal || controller.signal,
            headers: { Accept: 'application/json' }
        });
        if (!response?.ok) throw new Error('Daleys plant search is temporarily unavailable.');
        const payload = await response.json();
        const results = Array.isArray(payload?.results) ? payload.results : [];
        searchCache.set(cacheKey, results);
        return results;
    } catch (error) {
        if (error?.name === 'AbortError') throw error;
        throw new Error('Daleys plant search is temporarily unavailable.');
    } finally {
        if (activeController === controller) activeController = null;
    }
}

export const DALEYS_SOURCE = 'Daleys Fruit Tree Nursery';
export const DALEYS_MIN_QUERY_LENGTH = MIN_QUERY_LENGTH;
