import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEMO_NEIGHBOUR_PLANT_IDS, demoNeighbourPim } from '../app/services/demoNeighbourPim.js';
import { PIM_COMPASS } from '../app/services/pimCompass.js';
import { pimToArKnowledge, validatePimDocument } from '../app/services/pimModel.js';
import { plantInformationMeshMarkup } from '../app/services/plantInformationMeshView.js';
import { createPlantKnowledgeResolver, totemKnowledgeCards } from '../app/services/spatialKnowledgePresentation.js';

test('all four second-Totem plants have populated, sourced PIMO branches', () => {
    assert.deepEqual(DEMO_NEIGHBOUR_PLANT_IDS, ['banana', 'acacia', 'jackfruit', 'lychee']);
    const resolve = createPlantKnowledgeResolver();
    const summaries = new Set();
    for (const plantId of DEMO_NEIGHBOUR_PLANT_IDS) {
        const document = demoNeighbourPim(plantId);
        const check = validatePimDocument(document);
        assert.equal(check.valid, true, `${plantId}: ${check.errors.join('; ')}`);
        assert.ok(document.nodes.length >= 12, plantId);
        assert.ok(document.identity.identityStatement);
        assert.ok(document.sources.length);
        const sourceIds = new Set(document.sources.map(source => source.id));
        for (const node of document.nodes) {
            assert.ok(node.body && node.preview, `${plantId}: ${node.id} needs content`);
            assert.equal(node.status, 'published');
            assert.ok(node.sourceIds.length && node.sourceIds.every(id => sourceIds.has(id)), `${plantId}: ${node.id} needs a valid source`);
        }
        for (const root of PIM_COMPASS) {
            assert.ok(document.nodes.some(node => node.id === root.id && !node.parentId), `${plantId}: ${root.id} root missing`);
            assert.ok(document.nodes.some(node => node.parentId === root.id), `${plantId}: ${root.id} branch missing`);
        }
        const knowledge = pimToArKnowledge(document);
        const root = knowledge.categories.find(category => category.id === 'food-forest');
        const markup = plantInformationMeshMarkup(knowledge, [root.path], { layoutWidth: 900, layoutHeight: 640, viewportWidth: 900, viewportHeight: 640 });
        assert.match(markup, new RegExp(`data-pim-node-id="${root.children[0].id}"`), `${plantId}: child must open in AR mesh`);
        const resolved = resolve({ pim: document });
        assert.equal(resolved.live, true, `${plantId}: Orb should report live knowledge`);
        summaries.add(document.nodes.find(node => node.id === 'food-forest').body);
    }
    assert.equal(summaries.size, DEMO_NEIGHBOUR_PLANT_IDS.length, 'profiles should tell distinct plant stories');
});

test('Acacia remains identified only to genus and makes no generic edible claim', () => {
    const acacia = demoNeighbourPim('acacia');
    assert.equal(acacia.identity.scientificName, 'Acacia sp.');
    assert.match(acacia.nodes.find(node => node.id === 'acacia-nitrogen-question').body, /Confirm the species/);
    assert.match(acacia.nodes.find(node => node.id === 'acacia-safe-use-boundary').body, /Do not infer/);
});

test('the second Totem reads its Orb documents as live knowledge', () => {
    const source = readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    assert.match(source, /pim:demoNeighbourPim\(plantId\)/);
    assert.match(source, /knowledge:demoOrbKnowledge\(item\)/);
    const resolve = createPlantKnowledgeResolver();
    const plants = DEMO_NEIGHBOUR_PLANT_IDS.map(id => ({ id, name: id, knowledge: resolve({ pim: demoNeighbourPim(id) }) }));
    const [area] = totemKnowledgeCards({ title: 'Rainforest Walk', plants, compact: true });
    assert.deepEqual(area.stats.find(stat => stat.label === 'LIVE'), { label: 'LIVE', value: 4 });
});
