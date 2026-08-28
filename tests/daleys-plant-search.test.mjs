import assert from 'node:assert/strict';
import test from 'node:test';
import {
    daleysPlantMatchesQuery,
    normalizeDaleysPlantResult
} from '../app/services/daleysPlant.js';
import {
    buildDaleysSearchUrl,
    clearDaleysPlantSearchCache,
    searchDaleysPlants
} from '../app/services/daleysPlantSearch.js';

const daleysRecord = {
    '@type': 'Product',
    sku: '463',
    name: 'Golden Shower',
    botanicalName: 'Cassia fistula',
    description: 'Yellow flowers and fern-like leaves.',
    category: 'Home & Garden > Plants > Trees',
    image: ['https://plant.daleysfruit.com.au/trees/m/Golden-Shower-5552.jpeg'],
    offers: [
        { availability: 'https://schema.org/PreSale', price: '19.00', priceCurrency: 'AUD', url: 'https://www.daleysfruit.com.au/sku463-buy/golden-shower-tree.htm' },
        { availability: 'https://schema.org/OutOfStock', price: '29.00', priceCurrency: 'AUD' }
    ],
    itemOffered: { lowPrice: '19.00', highPrice: '29.00', priceCurrency: 'AUD' },
    url: 'https://www.daleysfruit.com.au/buy/golden-shower-tree.htm'
};

const responseFor = payload => ({ ok: true, async json() { return payload; } });

test('Daleys products normalize into searchable plant records with retail fields', () => {
    const result = normalizeDaleysPlantResult(daleysRecord);
    assert.equal(result.externalId, 'daleys:463');
    assert.equal(result.source, 'daleys');
    assert.equal(result.commonName, 'Golden Shower');
    assert.equal(result.scientificName, 'Cassia fistula');
    assert.equal(result.price, '19.00–29.00 AUD');
    assert.equal(result.availability, 'Pre-sale');
    assert.equal(result.thumbnailUrl, daleysRecord.image[0]);
    assert.equal(result.sourceUrl, daleysRecord.url);
    assert.equal(daleysPlantMatchesQuery(result, 'cassia shower'), true);
    assert.equal(daleysPlantMatchesQuery(result, 'mango'), false);
});

test('Daleys global search uses the NLXR server proxy', async () => {
    clearDaleysPlantSearchCache();
    assert.match(buildDaleysSearchUrl('golden shower'), /plant-search\/daleys\?q=golden%20shower/);
    const results = await searchDaleysPlants('golden shower', {
        fetchImpl: async url => {
            assert.match(url, /plant-search\/daleys/);
            return responseFor({ results: [normalizeDaleysPlantResult(daleysRecord)] });
        }
    });
    assert.equal(results[0].sourceLabel, 'Daleys Fruit Tree Nursery');
    assert.equal(results[0].availability, 'Pre-sale');
});
