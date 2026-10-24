import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDaleysPlanningRecord, planningRecordMatches, suggestDaleysFunctions } from '../app/services/daleysPlanningTraits.js';
import { buildFoodForestDataQuality, parseDaleysSpecifications } from '../tools/build-food-forest-catalog.mjs';

test('description function candidates retain evidence and distinguish polarity', () => {
    const functions = suggestDaleysFunctions('It provides nitrogen and mulch. It does not attract bees. May be used as a windbreak when established.');
    assert.deepEqual(functions.map(item => [item.id, item.polarity]).sort(([a], [b]) => a.localeCompare(b)), [
        ['mulch', 'positive'],
        ['nitrogen-support', 'positive'],
        ['pollinator-habitat', 'negative'],
        ['windbreak', 'conditional']
    ]);
    assert.ok(functions.every(item => item.evidence && item.status === 'needs-review'));
});

test('supplier specification traits keep exact wording and source-backed ranges', () => {
    const record = buildDaleysPlanningRecord({ sku: '123', name: 'Sample tree', botanicalName: 'Example species', description: '', filter: [] }, {
        page: { url: 'https://example.test/plant', retrievedAt: '2026-10-24T00:00:00Z', specifications: {
            'Water Requirements': 'Drought Hardy (Little Watering)',
            'Max Height (when in the ground with good conditions)': '2-3m',
            'Plant Width': '1-2m',
            'Sun or Shade': 'Full (Sun:80%-100%), Part (Sun:50-80%)'
        } }
    });
    assert.equal(record.traitCandidates.find(item => item.id === 'water').normalized, 'drought-tolerant-supplier-claim');
    assert.deepEqual(record.traitCandidates.find(item => item.id === 'mature-height').rangeM, { min: 2, max: 3 });
    assert.deepEqual(record.traitCandidates.find(item => item.id === 'plant-width').rangeM, { min: 1, max: 2 });
    assert.equal(record.traitCandidates[0].status, 'source-stated');
    assert.equal(record.canopySpreadM, null, 'supplier plant width is not silently promoted to canopy spread');
});

test('unverified harvest filter codes stay opaque and are not advertised as months', () => {
    const record = buildDaleysPlanningRecord({ sku: '456', name: 'Sample berry', botanicalName: 'Example berry', description: '', filter: [{ db: 'Harvest', value: [0, 9, 10, 11] }] });
    assert.deepEqual(record.fields.harvestSourceCodes.values, [0, 9, 10, 11]);
    assert.equal(record.fields.harvestMonths, undefined);
});

test('negative and conditional function mentions do not match positive planning filters', () => {
    const record = buildDaleysPlanningRecord({ sku: '789', name: 'Sample', botanicalName: 'Example plant', description: 'Does not attract bees. May provide habitat for birds.', filter: [] });
    assert.equal(planningRecordMatches(record, { functionId: 'pollinator-habitat' }), false);
    assert.equal(planningRecordMatches(record, { functionId: 'wildlife-habitat' }), false);
});

test('product specification parser decodes decimal and hexadecimal entities', () => {
    const html = '<p class="daley-product-specification"><b>Plant Width</b><span class="daley-product-specifications-values">2&#x2013;3m &amp; healthy</span></p>';
    assert.deepEqual(parseDaleysSpecifications(html), { 'Plant Width': '2–3m & healthy' });
});

test('quality report shows catalogue review and evidence coverage without claiming certification', () => {
    const records = [buildDaleysPlanningRecord({ sku: '1', name: 'Pigeon Pea', botanicalName: 'Cajanus cajan', description: 'Provides nitrogen.', filter: [] })];
    const report = buildFoodForestDataQuality(records, { rawProducts: [{ filter: [{ db: 'Harvest', value: [0, 11] }] }], codebook: { fields: {} }, pageCount: 0, sourceSnapshotAt: 'snapshot' });
    assert.equal(report.counts.plantCandidates, 1);
    assert.equal(report.functionEvidence.byPolarity.positive, 1);
    assert.deepEqual(report.unlabelledOrUnmappedApiCodes.Harvest, { 0: 1, 11: 1 });
    assert.match(report.scope, /does not certify/);
});
