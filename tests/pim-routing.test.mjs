import assert from 'node:assert/strict';
import test from 'node:test';
import { clearPimRouteUrl, hasCompletePimRoute, pimRouteFromUrl, pimRouteUrl } from '../app/services/pimRouting.js';

test('PIM routes round-trip a shareable exact knowledge path', () => {
    const url = pimRouteUrl({
        projectId: 'garden',
        siteId: 'main',
        placeId: 'orchard',
        markerId: 'pigeon-pea-1',
        slug: 'pigeon-pea',
        path: 'food-forest/ecological-functions/nitrogen-fixer'
    }, 'https://example.test/app/?language=en');
    assert.equal(url.pathname, '/app/');
    assert.equal(url.searchParams.get('language'), 'en');
    assert.equal(url.hash, '#/plants/pigeon-pea/food-forest/ecological-functions/nitrogen-fixer');
    assert.deepEqual(pimRouteFromUrl(url), {
        projectId: 'garden',
        siteId: 'main',
        placeId: 'orchard',
        markerId: 'pigeon-pea-1',
        slug: 'pigeon-pea',
        path: 'food-forest/ecological-functions/nitrogen-fixer'
    });
    assert.equal(hasCompletePimRoute(pimRouteFromUrl(url)), true);
});

test('clearing a PIM route preserves unrelated application parameters', () => {
    const cleared = clearPimRouteUrl('https://example.test/app/?language=en&pimProject=garden#/plants/pigeon-pea/uses');
    assert.equal(cleared.searchParams.get('language'), 'en');
    assert.equal(cleared.searchParams.has('pimProject'), false);
    assert.equal(cleared.hash, '');
});
