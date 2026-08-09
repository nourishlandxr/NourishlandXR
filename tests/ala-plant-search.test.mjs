import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
    ALA_MIN_QUERY_LENGTH,
    buildAlaSearchUrl,
    clearAlaPlantSearchCache,
    createAlaProvenance,
    normalizeAlaPlantResult,
    searchAlaPlants
} from '../app/services/alaPlantSearch.js';

const plantRecord = (overrides = {}) => ({
    commonName: 'Pigeon Pea',
    guid: 'https://id.biodiversity.org.au/node/apni/2889232',
    matchedNames: ['Pigeon Pea'],
    name: 'Cajanus cajan',
    rankString: 'species',
    ...overrides
});

const responseFor = payload => ({ ok: true, async json() { return payload; } });

test('ALA URL construction encodes common and scientific queries', () => {
    assert.equal(ALA_MIN_QUERY_LENGTH, 2);
    const url = buildAlaSearchUrl('Cajanus cajan');
    assert.match(url, /q=Cajanus%20cajan/);
    assert.match(url, /idxType=TAXON/);
    assert.match(url, /limit=10/);
});

test('ALA search handles common names, scientific names, caching and short queries', async () => {
    clearAlaPlantSearchCache();
    let calls = 0;
    const fetchImpl = async url => {
        calls += 1;
        assert.match(url, /species\/search\/auto/);
        return responseFor({ autoCompleteList: [plantRecord()] });
    };
    assert.deepEqual(await searchAlaPlants(''), []);
    assert.deepEqual(await searchAlaPlants('x'), []);
    assert.equal(calls, 0);
    const commonResults = await searchAlaPlants('pigeon pea', { fetchImpl });
    const scientificResults = await searchAlaPlants('pigeon pea', { fetchImpl });
    assert.equal(commonResults[0].commonName, 'Pigeon Pea');
    assert.equal(commonResults[0].scientificName, 'Cajanus cajan');
    assert.equal(calls, 1, 'recent searches are cached for the session');
    assert.equal(scientificResults[0].source, 'ala');
});

test('ALA search cancels the previous in-flight request and debounced UI waits 350ms', async () => {
    clearAlaPlantSearchCache();
    let firstSignal;
    let releaseSecond;
    const fetchImpl = (url, { signal }) => {
        if (url.includes('first')) {
            firstSignal = signal;
            return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('cancelled'), { name: 'AbortError' }))));
        }
        return new Promise(resolve => { releaseSecond = () => resolve(responseFor({ autoCompleteList: [plantRecord({ name: 'Backhousia citriodora', commonName: 'Lemon Myrtle' })] })); });
    };
    const first = searchAlaPlants('first', { fetchImpl });
    await new Promise(resolve => setImmediate(resolve));
    const second = searchAlaPlants('second', { fetchImpl });
    assert.equal(firstSignal.aborted, true);
    releaseSecond();
    await assert.rejects(first, { name: 'AbortError' });
    assert.equal((await second)[0].commonName, 'Lemon Myrtle');
    const fieldMarker = fs.readFileSync(new URL('../app/screens/fieldMarker.js', import.meta.url), 'utf8');
    assert.match(fieldMarker, /\}, 350\);/);
});

test('ALA search reports empty results and hides network details', async () => {
    clearAlaPlantSearchCache();
    await assert.deepEqual(await searchAlaPlants('nothing', { fetchImpl: async () => responseFor({ autoCompleteList: [] }) }), []);
    clearAlaPlantSearchCache();
    await assert.rejects(searchAlaPlants('offline', { fetchImpl: async () => { throw new Error('socket details'); } }), /temporarily unavailable/);
});

test('ALA normalisation keeps optional fields graceful and rejects non-plants', () => {
    const result = normalizeAlaPlantResult(plantRecord({ commonName: null, matchedNames: [], rankString: undefined }));
    assert.equal(result.commonName, '');
    assert.equal(result.rank, '');
    assert.equal(result.family, '');
    assert.equal(result.kingdom, 'Plantae');
    assert.equal(normalizeAlaPlantResult({ name: 'Foxia', guid: 'https://biodiversity.org.au/afd/taxa/example' }), null);
    assert.equal(normalizeAlaPlantResult({ name: 'Agaricus campestris', guid: 'https://id.biodiversity.org.au/name/fungi/60022134' }), null);
});

test('ALA import creates separate provenance metadata', () => {
    const result = normalizeAlaPlantResult(plantRecord());
    assert.deepEqual(createAlaProvenance(result, '2026-08-09T00:00:00.000Z'), {
        provider: 'Atlas of Living Australia',
        providerId: 'https://id.biodiversity.org.au/node/apni/2889232',
        url: 'https://id.biodiversity.org.au/node/apni/2889232',
        retrievedAt: '2026-08-09T00:00:00.000Z',
        scientificName: 'Cajanus cajan'
    });
});
