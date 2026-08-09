const ALA_SEARCH_BASE = 'https://api.ala.org.au/species/search/auto';
const ALA_SOURCE_LABEL = 'Atlas of Living Australia';
const MIN_QUERY_LENGTH = 2;
const searchCache = new Map();
let activeController = null;

const text = value => String(value ?? '').trim();

export function buildAlaSearchUrl(query, limit = 10) {
    const value = text(query);
    return `${ALA_SEARCH_BASE}?q=${encodeURIComponent(value)}&idxType=TAXON&limit=${Math.max(1, Math.min(20, Number(limit) || 10))}`;
}

function inferredKingdom(item = {}) {
    const explicit = text(item.kingdom || item.classification?.kingdom || item.taxonomy?.kingdom);
    if (explicit) return explicit;
    const guid = text(item.guid).toLocaleLowerCase();
    if (/\/(?:node|taxon)\/apni\//.test(guid) || /\/name\/apni\//.test(guid)) return 'Plantae';
    if (/\/name\/fungi\//.test(guid)) return 'Fungi';
    if (/\/afd\/taxa\//.test(guid)) return 'Animalia';
    return '';
}

function isPlantRecord(item = {}) {
    const kingdom = inferredKingdom(item).toLocaleLowerCase();
    // ALA's autocomplete response does not currently include classification
    // for every record. Recognised APNI identifiers are plant records; when
    // neither classification nor a recognised plant identifier is available,
    // reject the result rather than silently presenting another kingdom.
    return kingdom === 'plantae' || kingdom === 'viridiplantae';
}

export function normalizeAlaPlantResult(item = {}) {
    if (!item || typeof item !== 'object' || !isPlantRecord(item)) return null;
    const matchedName = Array.isArray(item.matchedNames) ? item.matchedNames.find(Boolean) : '';
    const scientificName = text(item.name || item.scientificName || item.canonicalName);
    if (!scientificName) return null;
    const commonName = text(item.commonName || item.preferredCommonName || (matchedName && matchedName !== scientificName ? matchedName : ''));
    const rank = text(item.rankString || item.rank);
    const family = text(item.family || item.classification?.family || item.taxonomy?.family);
    const kingdom = inferredKingdom(item);
    const sourceUrl = text(item.guid || item.url);
    const imageAttribution = text(item.imageAttribution || item.attribution || item.image?.attribution);
    const imageLicense = text(item.imageLicense || item.license || item.image?.license);
    const imageUrl = text(item.thumbnailUrl || item.imageUrl || item.image?.thumbnailUrl);
    return {
        externalId: sourceUrl || scientificName,
        source: 'ala',
        sourceLabel: ALA_SOURCE_LABEL,
        commonName,
        scientificName,
        canonicalName: text(item.canonicalName || scientificName),
        rank,
        family,
        kingdom,
        thumbnailUrl: imageUrl && (imageAttribution || imageLicense) ? imageUrl : '',
        imageAttribution,
        imageLicense,
        sourceUrl,
        rawSourceData: item
    };
}

export function createAlaProvenance(result, retrievedAt = new Date().toISOString()) {
    return {
        provider: ALA_SOURCE_LABEL,
        providerId: text(result?.externalId || result?.sourceId),
        url: text(result?.sourceUrl),
        retrievedAt,
        scientificName: text(result?.scientificName)
    };
}

export function clearAlaPlantSearchCache() {
    searchCache.clear();
}

export async function searchAlaPlants(query, options = {}) {
    const value = text(query);
    if (value.length < MIN_QUERY_LENGTH) return [];
    const cacheKey = value.toLocaleLowerCase();
    if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);

    if (activeController) activeController.abort();
    const controller = new AbortController();
    activeController = controller;
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== 'function') throw new Error('Plant database search is unavailable in this browser.');
    try {
        const response = await fetchImpl(buildAlaSearchUrl(value), {
            signal: options.signal || controller.signal,
            headers: { Accept: 'application/json' }
        });
        if (!response?.ok) throw new Error('The Atlas of Living Australia search is temporarily unavailable.');
        const payload = await response.json();
        const records = Array.isArray(payload?.autoCompleteList) ? payload.autoCompleteList : [];
        const results = records.map(normalizeAlaPlantResult).filter(Boolean);
        searchCache.set(cacheKey, results);
        return results;
    } catch (error) {
        if (error?.name === 'AbortError') throw error;
        throw new Error('The Atlas of Living Australia search is temporarily unavailable.');
    } finally {
        if (activeController === controller) activeController = null;
    }
}

export const ALA_SOURCE = ALA_SOURCE_LABEL;
export const ALA_MIN_QUERY_LENGTH = MIN_QUERY_LENGTH;
