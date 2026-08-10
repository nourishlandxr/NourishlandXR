const INAT_SEARCH_BASE = 'https://api.inaturalist.org/v1/taxa';
const INAT_SOURCE_LABEL = 'iNaturalist';
const MIN_QUERY_LENGTH = 2;
const searchCache = new Map();
let activeController = null;

const text = value => String(value ?? '').trim();

export function buildINaturalistSearchUrl(query, limit = 10) {
    const params = new URLSearchParams({ q: text(query), per_page: String(Math.max(1, Math.min(20, Number(limit) || 10))), is_active: 'true' });
    return `${INAT_SEARCH_BASE}?${params.toString()}`;
}

function isPlantRecord(item = {}) {
    if (text(item.iconic_taxon_name).toLocaleLowerCase() === 'plantae') return true;
    return Array.isArray(item.ancestors) && item.ancestors.some(ancestor => text(ancestor?.name).toLocaleLowerCase() === 'plantae');
}

function familyName(item = {}) {
    if (typeof item.family === 'string') return text(item.family);
    if (item.family && typeof item.family === 'object') return text(item.family.name);
    return text(item.ancestors?.find(ancestor => text(ancestor?.rank).toLocaleLowerCase() === 'family')?.name);
}

export function normalizeINaturalistPlantResult(item = {}) {
    if (!item || typeof item !== 'object' || !isPlantRecord(item)) return null;
    const scientificName = text(item.name || item.scientific_name);
    if (!scientificName) return null;
    const key = text(item.id);
    const photo = item.default_photo || {};
    const sourceUrl = key ? `https://www.inaturalist.org/taxa/${encodeURIComponent(key)}` : '';
    return {
        externalId: key ? `inat:${key}` : sourceUrl || scientificName,
        source: 'inaturalist',
        sourceLabel: INAT_SOURCE_LABEL,
        commonName: text(item.preferred_common_name || item.common_name),
        scientificName,
        canonicalName: scientificName,
        rank: text(item.rank),
        family: familyName(item),
        kingdom: 'Plantae',
        thumbnailUrl: text(photo.medium_url || photo.square_url || photo.url),
        imageAttribution: text(photo.attribution),
        imageLicense: text(photo.license_code),
        sourceUrl,
        rawSourceData: item
    };
}

export function clearINaturalistPlantSearchCache() {
    searchCache.clear();
}

export async function searchINaturalistPlants(query, options = {}) {
    const value = text(query);
    if (value.length < MIN_QUERY_LENGTH) return [];
    const cacheKey = value.toLocaleLowerCase();
    if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);
    if (activeController) activeController.abort();
    const controller = new AbortController();
    activeController = controller;
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== 'function') throw new Error('iNaturalist plant search is unavailable in this browser.');
    try {
        const response = await fetchImpl(buildINaturalistSearchUrl(value), {
            signal: options.signal || controller.signal,
            headers: { Accept: 'application/json' }
        });
        if (!response?.ok) throw new Error('iNaturalist search is temporarily unavailable.');
        const payload = await response.json();
        const records = Array.isArray(payload?.results) ? payload.results : [];
        const results = records.map(normalizeINaturalistPlantResult).filter(Boolean);
        searchCache.set(cacheKey, results);
        return results;
    } catch (error) {
        if (error?.name === 'AbortError') throw error;
        throw new Error('iNaturalist plant search is temporarily unavailable.');
    } finally {
        if (activeController === controller) activeController = null;
    }
}

export const INAT_SOURCE = INAT_SOURCE_LABEL;
export const INAT_MIN_QUERY_LENGTH = MIN_QUERY_LENGTH;
