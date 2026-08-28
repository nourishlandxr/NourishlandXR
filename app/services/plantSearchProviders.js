import { searchAlaPlants } from './alaPlantSearch.js';
import { searchDaleysPlants } from './daleysPlantSearch.js';
import { searchGbifPlants } from './gbifPlantSearch.js';
import { searchINaturalistPlants } from './inaturalistPlantSearch.js';

const MIN_QUERY_LENGTH = 2;
const GLOBAL_SOURCE_LABEL = 'Global plant databases';

const providers = Object.freeze([
    Object.freeze({ id: 'ala', label: 'Atlas of Living Australia', search: searchAlaPlants }),
    Object.freeze({ id: 'daleys', label: 'Daleys Fruit Tree Nursery', search: searchDaleysPlants }),
    Object.freeze({ id: 'gbif', label: 'GBIF Backbone Taxonomy', search: searchGbifPlants }),
    Object.freeze({ id: 'inaturalist', label: 'iNaturalist', search: searchINaturalistPlants })
]);

const text = value => String(value ?? '').trim();
const searchKey = result => {
    const provider = text(result?.source || result?.sourceLabel).toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const taxon = text(result?.scientificName || result?.canonicalName).toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const externalId = text(result?.externalId).toLocaleLowerCase();
    // Keep source-specific records separate. ALA, Daleys, GBIF and iNaturalist
    // often describe the same taxon, but each record carries different facts,
    // links and extraction opportunities for the user.
    return [provider, taxon || externalId].filter(Boolean).join(':');
};

export function createPlantProvenance(result, retrievedAt = new Date().toISOString()) {
    return {
        provider: text(result?.sourceLabel || result?.source || GLOBAL_SOURCE_LABEL),
        providerId: text(result?.externalId || result?.sourceId),
        url: text(result?.sourceUrl),
        retrievedAt,
        scientificName: text(result?.scientificName)
    };
}

export function plantSearchProviders() {
    return providers.map(provider => ({ id: provider.id, label: provider.label }));
}

export async function searchPlantSources(query, options = {}) {
    const value = text(query);
    if (value.length < MIN_QUERY_LENGTH) return [];
    const settled = await Promise.allSettled(providers.map(provider => provider.search(value, options)));
    const successfulResults = settled.flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []);
    if (!successfulResults.length && settled.every(result => result.status === 'rejected')) {
        const firstError = settled.find(result => result.status === 'rejected')?.reason;
        throw firstError instanceof Error ? firstError : new Error('Global plant databases are temporarily unavailable.');
    }
    const unique = new Map();
    successfulResults.forEach(result => {
        const key = searchKey(result) || text(result?.externalId).toLocaleLowerCase();
        if (key && !unique.has(key)) unique.set(key, result);
    });
    return [...unique.values()];
}

export const PLANT_SEARCH_SOURCE_LABEL = GLOBAL_SOURCE_LABEL;
export const PLANT_SEARCH_MIN_QUERY_LENGTH = MIN_QUERY_LENGTH;
