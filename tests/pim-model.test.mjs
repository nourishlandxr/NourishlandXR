import assert from 'node:assert/strict';
import test from 'node:test';

import { PIM_COMPASS, PIM_COMPASS_BY_ID } from '../app/services/pimCompass.js';
import {
    PIM_SCHEMA_VERSION,
    createPimDocument,
    normalizePimDocument,
    validatePimDocument,
    pimAddNode,
    pimAncestors,
    pimChildren,
    pimNodeById,
    pimOpenAncestors,
    pimPublishedDocument,
    pimSearch,
    pimToArKnowledge,
    pimToggleOpenNodes,
    pimUpdateNode
} from '../app/services/pimModel.js';
import { adaptLegacyPlantProfile, resolvePlantPim } from '../app/services/pimLegacyAdapter.js';
import { PIM_EXTERNAL_FIELD_MAP, reviewPimImport, stagePimImport } from '../app/services/pimImportReview.js';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';
import { createPigeonPeaTemplateProfile, PIGEON_PEA_TEMPLATE_ID } from '../app/services/pigeonPeaTemplate.js';

const NOW = '2026-08-03T00:00:00.000Z';

test('the frozen Global Knowledge Compass fixes all six category contracts', () => {
    assert.equal(PIM_COMPASS.length, 6);
    assert.deepEqual(PIM_COMPASS.map(({ id, direction, knowledgeMode, question, color }) => ({ id, direction, knowledgeMode, question, color })), [
        { id: 'food-forest', direction: 'top', knowledgeMode: 'relationship', question: 'Where does this plant fit into the broader living system?', color: '#2f7d4a' },
        { id: 'uses', direction: 'upper-left', knowledgeMode: 'agency', question: 'What can people do, make or participate in with this plant?', color: '#a96400' },
        { id: 'propagation', direction: 'lower-left', knowledgeMode: 'agency', question: 'How can people create new plants?', color: '#087f8c' },
        { id: 'scientific-information', direction: 'upper-right', knowledgeMode: 'certainty', question: 'What is scientifically established about this plant?', color: '#2563a6' },
        { id: 'historical-data', direction: 'lower-right', knowledgeMode: 'certainty', question: 'What has been documented about this plant through time?', color: '#7048a8' },
        { id: 'cultivation', direction: 'bottom', knowledgeMode: 'process', question: 'How does this plant grow, and how can people responsibly support it?', color: '#b85c18' }
    ]);
    assert.deepEqual(PIM_COMPASS_BY_ID.propagation.knowledgeModes, ['agency', 'process']);
    assert.equal(PIM_COMPASS_BY_ID['historical-data'].depthMode, 'historical');
    assert.ok(Object.isFrozen(PIM_COMPASS));
    assert.ok(Object.isFrozen(PIM_COMPASS[0]));
    assert.ok(Object.isFrozen(PIM_COMPASS[0].knowledgeModes));
});

test('a PIM document always has valid structural roots and stable ID paths', () => {
    let document = createPimDocument({
        plantId: 'test-plant',
        identity: { commonName: 'Test plant', scientificName: 'Planta probanda' },
        now: NOW
    });
    assert.equal(document.schemaVersion, PIM_SCHEMA_VERSION);
    assert.deepEqual(pimChildren(document, null).map(node => node.id), PIM_COMPASS.map(entry => entry.id));

    document = pimAddNode(document, {
        id: 'ecological-functions',
        parentId: 'food-forest',
        title: 'Ecological functions',
        preview: 'Living-system roles',
        informationType: 'category',
        evidenceStatus: 'draft',
        status: 'published'
    }, { now: NOW });
    document = pimAddNode(document, {
        id: 'nitrogen-fixer',
        parentId: 'ecological-functions',
        title: 'Nitrogen fixer',
        preview: 'Root-nodule relationship',
        body: 'A sourced explanation.',
        informationType: 'fact',
        evidenceStatus: 'sourced',
        status: 'published',
        tags: ['soil'],
        provenance: [{ sourceDatabase: 'Example', sourceRecordId: '1', reviewStatus: 'approved' }]
    }, { now: NOW });

    const target = pimNodeById(document, 'nitrogen-fixer');
    assert.equal(target.path, 'food-forest/ecological-functions/nitrogen-fixer');
    assert.equal(target.level, 3);
    assert.equal(target.primaryCategory, 'food-forest');
    assert.equal(target.direction, 'top');
    assert.deepEqual(pimAncestors(document, target.id).map(node => node.id), ['food-forest', 'ecological-functions']);
    assert.deepEqual(pimChildren(document, 'ecological-functions').map(node => node.id), ['nitrogen-fixer']);
    assert.deepEqual(validatePimDocument(document), { valid: true, errors: [], warnings: [] });
});

test('PIM hierarchy has no artificial child cap and immutable updates preserve IDs and metadata', () => {
    let document = createPimDocument({ plantId: 'many-children', now: NOW });
    for (let index = 0; index < 14; index += 1) {
        document = pimAddNode(document, {
            id: `use-${index + 1}`,
            parentId: 'uses',
            title: `Use ${index + 1}`,
            preview: `Preview ${index + 1}`,
            body: `Body ${index + 1}`,
            informationType: 'practice',
            evidenceStatus: 'local_observation',
            status: index === 13 ? 'draft' : 'published',
            provenance: [{ sourceDatabase: 'Local', originalValue: index }]
        }, { now: NOW });
    }
    assert.equal(pimChildren(document, 'uses').length, 14);
    assert.equal(pimToArKnowledge(document).categories.find(item => item.id === 'uses').children.length, 14);

    const before = pimNodeById(document, 'use-1');
    const updated = pimUpdateNode(document, 'use-1', { preview: 'Changed preview', evidenceStatus: 'verified' }, { now: '2026-08-04T00:00:00.000Z' });
    assert.equal(pimNodeById(document, 'use-1').preview, 'Preview 1');
    assert.equal(pimNodeById(updated, 'use-1').id, before.id);
    assert.equal(pimNodeById(updated, 'use-1').createdAt, before.createdAt);
    assert.equal(pimNodeById(updated, 'use-1').evidenceStatus, 'verified');
    assert.throws(() => pimUpdateNode(updated, 'use-1', { id: 'renamed' }), /stable/);
    assert.equal(pimPublishedDocument(updated).nodes.some(node => node.id === 'use-14'), false);
});

test('Web open state keeps siblings open and closes only the selected branch', () => {
    const document = PIGEON_PEA_PIM;
    let open = pimToggleOpenNodes(document, [], 'food-forest');
    open = pimToggleOpenNodes(document, open, 'uses');
    open = pimToggleOpenNodes(document, open, 'ecological-functions');
    open = pimToggleOpenNodes(document, open, 'nitrogen-fixation');
    assert.deepEqual(open, ['food-forest', 'uses', 'ecological-functions', 'nitrogen-fixation']);

    open = pimToggleOpenNodes(document, open, 'food-forest');
    assert.deepEqual(open, ['uses']);
    assert.deepEqual(pimOpenAncestors(document, [], 'root-nodule-symbiosis'), [
        'food-forest', 'ecological-functions', 'nitrogen-fixation', 'root-nodule-symbiosis'
    ]);

    let state = { centerOpen: true, openNodeIds: ['uses'] };
    state = pimToggleOpenNodes(document, state, 'centre');
    assert.deepEqual(state, { centerOpen: false, openNodeIds: [] });
    state = pimToggleOpenNodes(document, state, 'centre');
    assert.deepEqual(state, { centerOpen: true, openNodeIds: [] });
});

test('PIM search indexes identity, content, tags and provenance and opens the exact path', () => {
    const nitrogen = pimSearch(PIGEON_PEA_PIM, 'nitrogen')[0];
    assert.equal(nitrogen.nodeId, 'nitrogen-fixation');
    assert.equal(nitrogen.path, 'food-forest/ecological-functions/nitrogen-fixation');
    assert.equal(nitrogen.pathLabel, 'Pigeon Pea → Food Forest → Ecological functions → Nitrogen fixation');
    assert.deepEqual(nitrogen.openNodeIds, ['food-forest', 'ecological-functions', 'nitrogen-fixation']);

    const identity = pimSearch(PIGEON_PEA_PIM, 'Cajanus cajan')[0];
    assert.equal(identity.kind, 'plant');
    assert.equal(identity.plantId, 'cajanus-cajan');

    let document = createPimDocument({ plantId: 'regional-plant', identity: { commonName: 'Primary name', regionalNames: ['Village bean'] }, now: NOW });
    document = pimAddNode(document, {
        id: 'regional-record', parentId: 'historical-data', title: 'Regional record', preview: 'Local name', body: 'Context',
        regionalNames: ['Old garden pea'], tags: ['community archive'], informationType: 'historical_record', evidenceStatus: 'sourced', status: 'published',
        provenance: [{ sourceDatabase: 'Regional Herbarium', sourceRecordId: 'R-7' }]
    }, { now: NOW });
    assert.equal(pimSearch(document, 'Village bean')[0].kind, 'plant');
    assert.equal(pimSearch(document, 'Herbarium')[0].nodeId, 'regional-record');
    assert.equal(pimSearch(document, 'community archive')[0].nodeId, 'regional-record');
});

test('legacy adaptation is reversible, deduplicated and honest about unmapped fields', () => {
    const legacy = {
        common_name: 'Legacy pea',
        scientific_name: 'Legumen antiquum',
        overview: 'A preserved identity statement.',
        edible_uses: 'Cooked peas',
        uses: 'Cooked peas',
        medicinal: 'A locally reported preparation',
        craft: 'Dry stems for stakes',
        propagation: 'Direct sow',
        care: 'Prune after harvest',
        notes: 'Needs an editorial parent decision',
        references: 'Unstructured reference text',
        mystery_field: { original: true },
        modified: NOW
    };
    const untouched = structuredClone(legacy);
    const adapted = adaptLegacyPlantProfile(legacy, { plantId: 'legacy-pea' }, { now: NOW });
    assert.deepEqual(legacy, untouched);
    assert.deepEqual(adapted.document.legacy.sourceProfile, legacy);
    assert.equal(adapted.document.identity.commonName, 'Legacy pea');
    assert.equal(adapted.document.identity.identityStatement, 'A preserved identity statement.');
    assert.equal(adapted.report.duplicates.find(item => item.field === 'uses').duplicateOf, 'edible_uses');
    assert.deepEqual(adapted.report.unmapped.map(item => item.field).sort(), ['mystery_field', 'notes', 'references']);
    assert.equal(pimChildren(adapted.document, 'uses').filter(node => node.body === 'Cooked peas').length, 1);
    assert.equal(pimNodeById(adapted.document, 'legacy-medicinal-uses').informationType, 'traditional_knowledge');
    assert.equal(pimNodeById(adapted.document, 'legacy-craft-uses').parentId, 'uses');
    assert.equal(pimNodeById(adapted.document, 'legacy-care').parentId, 'cultivation');
    const mapped = pimNodeById(adapted.document, 'legacy-propagation-guidance');
    assert.equal(mapped.status, 'published');
    assert.equal(mapped.evidenceStatus, 'needs_review');
    assert.equal(mapped.provenance[0].sourceField, 'propagation');
    assert.equal(mapped.provenance[0].originalValue, 'Direct sow');
});

test('resolvePlantPim prefers saved PIM data and can filter drafts for visitors', () => {
    let document = createPimDocument({ plantId: 'saved-pim', identity: { commonName: 'Saved plant' }, now: NOW });
    document = pimAddNode(document, {
        id: 'creator-draft', parentId: 'uses', title: 'Draft use', preview: 'Not public', body: 'Work in progress',
        informationType: 'practice', evidenceStatus: 'draft', status: 'draft'
    }, { now: NOW });
    const creator = resolvePlantPim({ pim: document, common_name: 'Ignored legacy name' }, {}, { includeDraft: true, now: NOW });
    const visitor = resolvePlantPim({ pim: document }, {}, { includeDraft: false, now: NOW });
    assert.equal(creator.identity.commonName, 'Saved plant');
    assert.ok(pimNodeById(creator, 'creator-draft'));
    assert.equal(pimNodeById(visitor, 'creator-draft'), null);

    const legacyVisitor = resolvePlantPim({ common_name: 'Public legacy', edible_uses: 'Cooked fruit' }, {}, { includeDraft: false, now: NOW });
    assert.equal(pimNodeById(legacyVisitor, 'legacy-culinary-uses').status, 'published');
});

test('Pigeon Pea is a complete four-level reference with Medicinal and Craft below Uses', () => {
    const validation = validatePimDocument(PIGEON_PEA_PIM);
    assert.equal(validation.valid, true, validation.errors.join('\n'));
    assert.equal(PIGEON_PEA_PIM.identity.commonName, 'Pigeon Pea');
    assert.equal(PIGEON_PEA_PIM.identity.scientificName, 'Cajanus cajan');
    assert.ok(PIGEON_PEA_PIM.nodes.length >= 50);
    assert.equal(pimNodeById(PIGEON_PEA_PIM, 'root-nodule-symbiosis').level, 4);
    assert.equal(pimNodeById(PIGEON_PEA_PIM, 'medicinal').parentId, 'uses');
    assert.equal(pimNodeById(PIGEON_PEA_PIM, 'craft').parentId, 'uses');
    assert.equal(PIM_COMPASS_BY_ID.medicinal, undefined);
    assert.equal(PIM_COMPASS_BY_ID.craft, undefined);

    const ar = pimToArKnowledge(PIGEON_PEA_PIM);
    const foodForest = ar.categories.find(category => category.id === 'food-forest');
    const ecological = foodForest.children.find(child => child.id === 'ecological-functions');
    const nitrogen = ecological.children.find(child => child.id === 'nitrogen-fixation');
    assert.equal(nitrogen.path, 'food-forest/ecological-functions/nitrogen-fixation');
    assert.equal(nitrogen.parentPath, 'food-forest/ecological-functions');
    assert.equal(nitrogen.children[0].parentPath, nitrogen.path);
});

test('new project Pigeon Pea template carries the complete shared PIM into Home', () => {
    const profile = createPigeonPeaTemplateProfile('cajanus-cajan-template');
    assert.equal(profile.template_id, PIGEON_PEA_TEMPLATE_ID);
    assert.equal(profile.common_name, 'Pigeon Pea');
    assert.equal(profile.scientific_name, 'Cajanus cajan');
    assert.equal(profile.spm_enabled, true);
    assert.equal(profile.profile_enabled, true);
    assert.equal(profile.pim_document.plantId, 'cajanus-cajan-template');
    assert.equal(profile.pim_document.nodes.length, PIGEON_PEA_PIM.nodes.length);
    assert.deepEqual(profile.pim_document.nodes.filter(node => !node.parentId).map(node => node.id), [
        'food-forest', 'uses', 'propagation', 'scientific-information', 'historical-data', 'cultivation'
    ]);
});

test('external imports stage provenance and surface duplicates and conflicts without publishing', () => {
    assert.equal(PIM_EXTERNAL_FIELD_MAP.nitrogen_fixation.primaryCategory, 'food-forest');
    assert.equal(PIM_EXTERNAL_FIELD_MAP.traditional_medicinal_use.informationType, 'traditional_knowledge');
    assert.ok(Object.isFrozen(PIM_EXTERNAL_FIELD_MAP));

    let base = createPimDocument({ plantId: 'import-plant', now: NOW });
    base = pimAddNode(base, {
        id: 'existing-family', parentId: 'scientific-information', semanticKey: 'family', title: 'Family', preview: 'Fabaceae', body: 'Fabaceae',
        informationType: 'fact', evidenceStatus: 'verified', status: 'published'
    }, { now: NOW });
    base = pimAddNode(base, {
        id: 'existing-native-range', parentId: 'historical-data', semanticKey: 'native-range', title: 'Native range', preview: 'Region A', body: 'Region A',
        informationType: 'historical_record', evidenceStatus: 'sourced', status: 'published'
    }, { now: NOW });
    const before = structuredClone(base);
    const staged = stagePimImport(base, {
        sourceDatabase: 'Trusted Plants',
        sourceRecordId: 'TP-9',
        sourceUrl: 'https://example.test/plants/TP-9',
        licence: 'CC BY 4.0',
        retrievalDate: '2026-08-03',
        fields: {
            family: 'Fabaceae',
            native_range: 'Region B',
            sun_requirement: 'fullsun',
            unknown_measure: '17 units'
        }
    }, { now: NOW });
    assert.deepEqual(base, before);
    assert.deepEqual(staged.document, before);
    assert.equal(staged.status, 'pending_review');
    assert.ok(staged.items.every(item => item.reviewStatus === 'pending' && item.proposedNode.status === 'draft'));
    const family = staged.items.find(item => item.field === 'family');
    const range = staged.items.find(item => item.field === 'native_range');
    const sun = staged.items.find(item => item.field === 'sun_requirement');
    assert.equal(family.duplicateOf, 'existing-family');
    assert.deepEqual(range.conflictsWith, ['existing-native-range']);
    assert.equal(sun.normalizedValue, 'Full sun');
    assert.equal(sun.proposedNode.provenance[0].licence, 'CC BY 4.0');
    assert.equal(sun.proposedNode.provenance[0].originalValue, 'fullsun');
    assert.equal(staged.unmapped[0].field, 'unknown_measure');
});

test('import review can acknowledge duplicates, reject conflicts, or modify an approved block', () => {
    let base = createPimDocument({ plantId: 'review-plant', now: NOW });
    base = pimAddNode(base, {
        id: 'existing-family', parentId: 'scientific-information', semanticKey: 'family', title: 'Family', preview: 'Fabaceae', body: 'Fabaceae',
        informationType: 'fact', evidenceStatus: 'verified', status: 'published'
    }, { now: NOW });
    let staged = stagePimImport(base, {
        sourceDatabase: 'Review Source', sourceRecordId: 'R-1', licence: 'CC0', retrievalDate: '2026-08-03',
        fields: { family: 'Fabaceae', native_range: 'Region B', sun_requirement: 'fullsun' }
    }, { now: NOW });
    const family = staged.items.find(item => item.field === 'family');
    const range = staged.items.find(item => item.field === 'native_range');
    const sun = staged.items.find(item => item.field === 'sun_requirement');

    staged = reviewPimImport(staged, family.id, { decision: 'approve', reviewedAt: '2026-08-04' });
    assert.equal(staged.items.find(item => item.id === family.id).reviewStatus, 'approved_duplicate');
    assert.equal(staged.document.nodes.filter(node => node.body === 'Fabaceae').length, 1);

    staged = reviewPimImport(staged, range.id, { decision: 'reject', reason: 'Source conflict needs investigation', reviewedAt: '2026-08-04' });
    assert.equal(staged.items.find(item => item.id === range.id).reviewStatus, 'rejected');

    staged = reviewPimImport(staged, sun.id, {
        decision: 'modify',
        changes: { preview: 'Sun to light shade', body: 'Full sun to light shade', evidenceStatus: 'sourced' },
        publish: true,
        reviewedAt: '2026-08-04'
    });
    const reviewedSun = staged.items.find(item => item.id === sun.id);
    const saved = pimNodeById(staged.document, reviewedSun.proposedNode.id);
    assert.equal(reviewedSun.reviewStatus, 'modified');
    assert.equal(saved.path, `cultivation/light/${saved.id}`);
    assert.equal(saved.status, 'published');
    assert.equal(saved.body, 'Full sun to light shade');
    assert.equal(saved.provenance[0].originalValue, 'fullsun');
    assert.equal(saved.provenance[0].normalizedValue, 'Full sun to light shade');
    assert.equal(saved.provenance[0].reviewStatus, 'modified');
    assert.equal(staged.status, 'reviewed');
    assert.equal(validatePimDocument(normalizePimDocument(staged.document)).valid, true);
});
