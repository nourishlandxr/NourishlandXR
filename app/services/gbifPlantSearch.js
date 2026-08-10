const GBIF_SEARCH_BASE = 'https://api.gbif.org/v1/species/suggest';
const GBIF_SOURCE_LABEL = 'GBIF Backbone Taxonomy';
const MIN_QUERY_LENGTH = 2;
const searchCache = new Map();
let activeController = null;

const text = value => String(value ?? '').trim();

export function buildGbifSearchUrl(query, limit = 10) {
    const value = text(query);
    return `${GBIF_SEARCH_BASE}?q=${encodeURIComponent(value)}&limit=${Math.max(1, Math.min(20, Number(limit) || 10))}`;
}

function isPlantRecord(item = {}) {
    const kingdom = text(item.kingdom || item.classification?.kingdom).toLocaleLowerCase();
    return kingdom === 'plantae' || kingdom === 'viridiplantae';
}

export function normalizeGbifPlantResult(item = {}) {
    if (!item || typeof item !== 'object' || !isPlantRecord(item)) return null;
    const scientificName = text(item.scientificName || item.canonicalName || item.name);
    if (!scientificName) return null;
    const key = text(item.key);
    const sourceUrl = key ? `https://www.gbif.org/species/${encodeURIComponent(key)}` : '';
    return {
        externalId: key ? `gbif:${key}` : sourceUrl || scientificName,
        source: 'gbif',
        sourceLabel: GBIF_SOURCE_LABEL,
        commonName: text(item.vernacularName || item.commonName),
        scientificName,
        canonicalName: text(item.canonicalName || scientificName),
        rank: text(item.rank),
        family: text(item.family),
        kingdom: text(item.kingdom || item.classification?.kingdom),
        thumbnailUrl: '',
        imageAttribution: '',
        imageLicense: '',
        sourceUrl,
        rawSourceData: item
    };
}

export function clearGbifPlantSearchCache() {
    searchCache.clear();
}

export async function searchGbifPlants(query, options = {}) {
    const value = text(query);
    if (value.length < MIN_QUERY_LENGTH) return [];
    const cacheKey = value.toLocaleLowerCase();
    if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);
    if (activeController) activeController.abort();
    const controller = new AbortController();
    activeController = controller;
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== 'function') throw new Error('GBIF plant search is unavailable in this browser.');
    try {
        const response = await fetchImpl(buildGbifSearchUrl(value), {
            signal: options.signal || controller.signal,
            headers: { Accept: 'application/json' }
        });
        if (!response?.ok) throw new Error('GBIF search is temporarily unavailable.');
        const payload = await response.json();
        const records = Array.isArray(payload) ? payload : [];
        const results = records.map(normalizeGbifPlantResult).filter(Boolean);
        searchCache.set(cacheKey, results);
        return results;
    } catch (error) {
        if (error?.name === 'AbortError') throw error;
        throw new Error('GBIF plant search is temporarily unavailable.');
    } finally {
        if (activeController === controller) activeController = null;
    }
}

export const GBIF_SOURCE = GBIF_SOURCE_LABEL;
export const GBIF_MIN_QUERY_LENGTH = MIN_QUERY_LENGTH;
