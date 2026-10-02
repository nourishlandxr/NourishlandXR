import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEMO_NEIGHBOUR_PLANT_IDS, demoNeighbourPim } from '../app/services/demoNeighbourPim.js';
import { PIM_COMPASS } from '../app/services/pimCompass.js';
import { pimToArKnowledge, validatePimDocument } from '../app/services/pimModel.js';
import { plantInformationMeshMarkup } from '../app/services/plantInformationMeshView.js';
import { createPlantKnowledgeResolver, totemKnowledgeCards } from '../app/services/spatialKnowledgePresentation.js';

test('all four second-Totem plants have populated, sourced PIMO branches', () => {
    assert.deepEqual(DEMO_NEIGHBOUR_PLANT_IDS, ['vetiver', 'acacia', 'jackfruit', 'lychee']);
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

test('Vetiver keeps site effects observational and cultivar claims bounded', () => {
    const vetiver = demoNeighbourPim('vetiver');
    assert.equal(vetiver.identity.commonName, 'Vetiver grass');
    assert.equal(vetiver.identity.scientificName, 'Chrysopogon zizanioides');
    assert.deepEqual(vetiver.sources.map(source => source.id), ['vetiver-kew', 'vetiver-usda', 'vetiver-victoria']);
    assert.match(vetiver.nodes.find(node => node.id === 'vetiver-edge-function').body, /observe/i);
    assert.match(vetiver.nodes.find(node => node.id === 'vetiver-fertility-check').body, /should not be applied to an unnamed plant/i);
    assert.match(vetiver.nodes.find(node => node.id === 'vetiver-root-observation').body, /varies with site and age/i);
});

test('Banana remains reusable without belonging to the authored second-Totem set', () => {
    const banana = demoNeighbourPim('banana');
    assert.equal(banana.identity.scientificName, 'Musa spp.');
    assert.ok(banana.nodes.length >= 12);
    assert.equal(DEMO_NEIGHBOUR_PLANT_IDS.includes('banana'), false);
});

test('Acacia remains identified only to genus and makes no generic edible claim', () => {
    const acacia = demoNeighbourPim('acacia');
    assert.equal(acacia.identity.scientificName, 'Acacia sp.');
    assert.match(acacia.nodes.find(node => node.id === 'acacia-nitrogen-question').body, /Confirm the species/);
    assert.match(acacia.nodes.find(node => node.id === 'acacia-safe-use-boundary').body, /Do not infer/);
});

test('the second Totem reads its Orb documents as live knowledge', () => {
    const source = readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    assert.match(source, /pim:demoNeighbourPim\(neighbour\.plantId\)/);
    assert.match(source, /knowledge:demoOrbKnowledge\(item\)/);
    const resolve = createPlantKnowledgeResolver();
    const plants = DEMO_NEIGHBOUR_PLANT_IDS.map(id => ({ id, name: id, knowledge: resolve({ pim: demoNeighbourPim(id) }) }));
    const [area] = totemKnowledgeCards({ title: 'Rainforest Walk', plants, compact: true });
    assert.deepEqual(area.stats.find(stat => stat.label === 'LIVE'), { label: 'LIVE', value: 4 });
});

test('botanical media preserves identification boundaries',()=>{
    const acacia=demoNeighbourPim('acacia'),jackfruit=demoNeighbourPim('jackfruit'),lychee=demoNeighbourPim('lychee'),vetiver=demoNeighbourPim('vetiver');
    for(const document of [acacia,jackfruit,lychee,vetiver])assert.equal(existsSync(fileURLToPath(document.identity.image)),true);
    assert.match(acacia.identity.imageCaption,/Illustrative only.*Acacia fimbriata.*Acacia sp\./);
    assert.match(lychee.identity.imageCaption,/Red Ball.*cultivar is not identified/);
    assert.match(jackfruit.identity.imageCaption,/Artocarpus heterophyllus/);
    assert.match(vetiver.identity.imageCaption,/Wikimedia Commons CC0 reference photo/);
});
