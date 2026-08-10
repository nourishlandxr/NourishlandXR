import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGbifSearchUrl, clearGbifPlantSearchCache, normalizeGbifPlantResult, searchGbifPlants } from '../app/services/gbifPlantSearch.js';
import { buildINaturalistSearchUrl, clearINaturalistPlantSearchCache, normalizeINaturalistPlantResult, searchINaturalistPlants } from '../app/services/inaturalistPlantSearch.js';
import { createPlantProvenance, searchPlantSources } from '../app/services/plantSearchProviders.js';

const responseFor = payload => ({ ok: true, async json() { return payload; } });

test('GBIF plant search builds a public URL and keeps Plantae records', async () => {
    clearGbifPlantSearchCache();
    assert.match(buildGbifSearchUrl('pigeon pea'), /species\/suggest\?q=pigeon%20pea/);
    assert.match(buildGbifSearchUrl('pigeon pea'), /limit=10/);
    const result = normalizeGbifPlantResult({ key: 123, scientificName: 'Cajanus cajan', canonicalName: 'Cajanus cajan', kingdom: 'Plantae', rank: 'SPECIES', family: 'Fabaceae' });
    assert.equal(result.source, 'gbif');
    assert.equal(result.externalId, 'gbif:123');
    assert.equal(normalizeGbifPlantResult({ key: 7, scientificName: 'Agaricus campestris', kingdom: 'Fungi' }), null);
    const results = await searchGbifPlants('pigeon pea', { fetchImpl: async url => { assert.match(url, /api\.gbif\.org/); return responseFor([{ key: 123, scientificName: 'Cajanus cajan', kingdom: 'Plantae' }]); } });
    assert.equal(results[0].scientificName, 'Cajanus cajan');
});

test('iNaturalist plant search keeps plant taxa and photo provenance', async () => {
    clearINaturalistPlantSearchCache();
    assert.match(buildINaturalistSearchUrl('moringa'), /api\.inaturalist\.org\/v1\/taxa/);
    assert.match(buildINaturalistSearchUrl('moringa'), /q=moringa/);
    const result = normalizeINaturalistPlantResult({ id: 456, name: 'Moringa oleifera', rank: 'species', iconic_taxon_name: 'Plantae', preferred_common_name: 'Moringa', family: { name: 'Moringaceae' }, default_photo: { medium_url: 'https://example.test/moringa.jpg', attribution: 'CC BY' } });
    assert.equal(result.source, 'inaturalist');
    assert.equal(result.family, 'Moringaceae');
    assert.equal(result.thumbnailUrl, 'https://example.test/moringa.jpg');
    assert.equal(normalizeINaturalistPlantResult({ id: 9, name: 'Danaus plexippus', iconic_taxon_name: 'Animalia' }), null);
    const results = await searchINaturalistPlants('moringa', { fetchImpl: async url => { assert.match(url, /api\.inaturalist\.org/); return responseFor({ results: [{ id: 456, name: 'Moringa oleifera', iconic_taxon_name: 'Plantae' }] }); } });
    assert.equal(results[0].scientificName, 'Moringa oleifera');
});

test('global plant search combines APIs, de-duplicates taxa and keeps provenance', async () => {
    clearGbifPlantSearchCache();
    clearINaturalistPlantSearchCache();
    const results = await searchPlantSources('pea', { fetchImpl: async url => {
        if (url.includes('api.ala.org.au')) return responseFor({ autoCompleteList: [{ name: 'Cajanus cajan', commonName: 'Pigeon Pea', guid: 'https://id.biodiversity.org.au/node/apni/1', kingdom: 'Plantae' }] });
        if (url.includes('api.gbif.org')) return responseFor([{ key: 123, scientificName: 'Cajanus cajan', kingdom: 'Plantae' }, { key: 124, scientificName: 'Pisum sativum', kingdom: 'Plantae' }]);
        return responseFor({ results: [{ id: 456, name: 'Moringa oleifera', iconic_taxon_name: 'Plantae' }] });
    } });
    assert.deepEqual(results.map(result => result.scientificName), ['Cajanus cajan', 'Pisum sativum', 'Moringa oleifera']);
    assert.deepEqual(createPlantProvenance(results[0], '2026-08-10T00:00:00.000Z'), {
        provider: 'Atlas of Living Australia',
        providerId: 'https://id.biodiversity.org.au/node/apni/1',
        url: 'https://id.biodiversity.org.au/node/apni/1',
        retrievedAt: '2026-08-10T00:00:00.000Z',
        scientificName: 'Cajanus cajan'
    });
});
