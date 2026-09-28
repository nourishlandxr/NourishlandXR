import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEMO_CONNECTION_CHOICES,DEMO_CONNECTION_HOLD_MS,DEMO_CONNECTION_PHASES,DEMO_DEEPER_CONNECTION,createDemoConnectionState,demoConnectionCurve,demoConnectionTargetAt,selectDemoConnectionChoice} from '../app/services/demoKnowledgeConnections.js';
import {PIGEON_PEA_PIM} from '../app/services/pigeonPeaPim.js';
import {createMeshRepository} from '../app/services/meshRepository.js';
import {createMeshSourceResolver,pimMeshRef,limMeshRef} from '../app/services/meshReferences.js';
import {createPlaceholderKnowledgeGenerator} from '../app/services/meshGenerator.js';
import {createMeshRelationshipService} from '../app/services/meshRelationships.js';

test('guided connection state offers two curated plant and learning pairs',()=>{
    const state=createDemoConnectionState();
    assert.equal(state.phase,DEMO_CONNECTION_PHASES.CHOOSING);
    assert.equal(DEMO_CONNECTION_CHOICES.length,2);
    selectDemoConnectionChoice(state,'pruning');
    assert.equal(state.phase,DEMO_CONNECTION_PHASES.READY);
    assert.equal(demoConnectionTargetAt(state,81,39),true);
    assert.equal(demoConnectionTargetAt(state,81,68),false);
    selectDemoConnectionChoice(state,'nitrogen-fixation');
    assert.equal(demoConnectionTargetAt(state,81,68),true);
    assert.equal(DEMO_CONNECTION_HOLD_MS,500);
});

test('connection curve is a stable curved path with no layout mutation',()=>{
    assert.equal(demoConnectionCurve({x:10,y:20},{x:80,y:70}),'M 10.00 20.00 C 29.60 20.00, 60.40 70.00, 80.00 70.00');
});

test('both demo cell pairs connect and support the deeper learning cell',async()=>{
    const repository=createMeshRepository();
    const resolver=createMeshSourceResolver({repository});
    resolver.registerPimDocument(PIGEON_PEA_PIM,{ownerId:'pigeon-pea-demo'});
    const service=createMeshRelationshipService({repository,resolver,generator:createPlaceholderKnowledgeGenerator()});
    for(const choice of DEMO_CONNECTION_CHOICES){
        const source=pimMeshRef(PIGEON_PEA_PIM,choice.sourceId,{ownerId:'pigeon-pea-demo',specimenId:'pigeon-pea-demo'});
        const result=await service.resolve([source,limMeshRef(choice.targetId)]);
        assert.equal(result.derivedNode.title,choice.resultTitle);
        const deeper=await service.resolve([result.derivedRef,limMeshRef(DEMO_DEEPER_CONNECTION.targetId)]);
        assert.equal(deeper.derivedNode.title,choice.deeperTitle);
    }
});

test('visitor-facing guided connection copy keeps implementation acronyms invisible',async()=>{
    const source=await readFile(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const content=await readFile(new URL('../app/services/demoKnowledgeConnections.js',import.meta.url),'utf8');
    const visible=[...DEMO_CONNECTION_CHOICES.flatMap(choice=>[choice.sourceTitle,choice.targetTitle,choice.resultTitle,choice.deeperTitle]),DEMO_DEEPER_CONNECTION.targetTitle];
    visible.forEach(label=>assert.match(content,new RegExp(label.replace(/[&]/g,'&'))));
    assert.match(source,/DEMO_CONNECTION_HOLD_MS/);
    assert.match(source,/Hold the glowing node/);
    assert.match(source,/selectcancel/);
    assert.match(source,/lostpointercapture/);
    assert.match(source,/setPointerCapture/);
    assert.match(source,/meshRelationships\.resolve\(refs/);
    assert.match(source,/state\.primaryResult\.derivedRef/);
    assert.match(source,/showKnowledgeCombinationIntroduction/);
    assert.doesNotMatch(source,/startDemoKnowledgeConnections/);
});
