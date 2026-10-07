import assert from 'node:assert/strict';
import test from 'node:test';
import {DEMO_NATIVE_PLANTS,nativePlantProfile,chooseDemoNativePlant,DEMO_NATIVE_PLANT_TRANSLATIONS} from '../app/services/demoNativePlants.js';
import {resolvePlantPim} from '../app/services/pimLegacyAdapter.js';
import {pimNodeById,pimToArKnowledge,validatePimDocument} from '../app/services/pimModel.js';

test('native demo PIMs unfold native food-forest planting into rainforest ecology',()=>{
    assert.deepEqual(DEMO_NATIVE_PLANTS.map(plant=>plant.name),['Blue Quandong','Finger Lime','Lemon Myrtle']);
    for(const plant of DEMO_NATIVE_PLANTS){
        const profile=nativePlantProfile(plant.id),document=resolvePlantPim(profile),projection=pimToArKnowledge(document);
        assert.ok(validatePimDocument(document).valid,plant.id);
        const forest=pimNodeById(document,'native-forest-within-food-forest');
        assert.equal(forest.parentId,'food-forest');
        assert.ok(document.nodes.some(node=>node.id==='from-food-forest-to-rainforest'||node.id==='from-understorey-to-rainforest'));
        assert.ok(projection.categories[0].children.some(node=>node.id===forest.id));
        for(const node of document.nodes){
            assert.ok((node.sourceIds||[]).every(id=>document.sources.some(item=>item.id===id)),`${plant.id}/${node.id} has a valid source`);
            assert.ok(!node.parentId||pimNodeById(document,node.parentId),`${plant.id}/${node.id} has a parent`);
        }
        assert.equal(document.nodes.filter(node=>(node.media||[]).some(media=>media.image)).length,2);
    }
    assert.ok(pimNodeById(resolvePlantPim(nativePlantProfile('blue-quandong')),'cassowary-seed-journey'));
    assert.ok(pimNodeById(resolvePlantPim(nativePlantProfile('finger-lime')),'dainty-swallowtail-link'));
    assert.ok(pimNodeById(resolvePlantPim(nativePlantProfile('lemon-myrtle')),'flower-visitor-watch'));
});

test('native sample selection updates only the placed second Orb and keeps its anchor',()=>{
    const record={tutorialStage:'plant2',position:{x:1,y:2,z:3},areaId:'area-2'};
    assert.equal(chooseDemoNativePlant(record,'finger-lime'),true);
    assert.equal(record.demoNativeChoice,'finger-lime');
    assert.deepEqual(record.position,{x:1,y:2,z:3});
    assert.equal(record.areaId,'area-2');
    assert.equal(chooseDemoNativePlant(record,'missing'),false);
});

test('native PIMO strings have explicit Portuguese and Dutch translations',()=>{
    const translations=new Map(DEMO_NATIVE_PLANT_TRANSLATIONS.map(([en,pt,nl])=>[en,[pt,nl]]));
    for(const plant of DEMO_NATIVE_PLANTS){
        const document=resolvePlantPim(nativePlantProfile(plant.id));
        assert.ok(translations.has(plant.statement),`${plant.id} identity statement`);
        for(const node of document.nodes.filter(item=>item.parentId)){
            assert.ok(translations.has(node.title),`${plant.id}/${node.id} title`);
            assert.ok(translations.has(node.body),`${plant.id}/${node.id} body`);
        }
    }
});
