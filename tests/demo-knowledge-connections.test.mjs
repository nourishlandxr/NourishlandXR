import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEMO_CONNECTIONS,DEMO_CONNECTION_PHASES,createDemoConnectionState,demoConnectionCurve,demoConnectionStep,demoConnectionTargetAt} from '../app/services/demoKnowledgeConnections.js';

test('guided connection state exposes only the two curated learning targets',()=>{
    const state=createDemoConnectionState();
    assert.equal(demoConnectionStep(state),DEMO_CONNECTIONS.first);
    assert.equal(demoConnectionTargetAt(state,82,27),true);
    assert.equal(demoConnectionTargetAt(state,82,76),false);
    state.phase=DEMO_CONNECTION_PHASES.SECOND;
    assert.equal(demoConnectionStep(state),DEMO_CONNECTIONS.second);
    assert.equal(demoConnectionTargetAt(state,82,76),true);
});

test('connection curve is a stable curved path with no layout mutation',()=>{
    assert.equal(demoConnectionCurve({x:10,y:20},{x:80,y:70}),'M 10.00 20.00 C 29.60 20.00, 60.40 70.00, 80.00 70.00');
});

test('visitor-facing guided connection copy keeps implementation acronyms invisible',async()=>{
    const source=await readFile(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const visible=[DEMO_CONNECTIONS.first.targetTitle,DEMO_CONNECTIONS.first.resultTitle,DEMO_CONNECTIONS.second.targetTitle,DEMO_CONNECTIONS.second.resultTitle];
    visible.forEach(label=>assert.match(source,new RegExp(label.replace(/[&]/g,'&'))));
    assert.match(source,/Drag the small connection point to Living Landscapes/);
    assert.match(source,/selectcancel/);
    assert.match(source,/lostpointercapture/);
    assert.match(source,/setPointerCapture/);
    assert.match(source,/meshRelationships\.resolve\(refs/);
    assert.match(source,/state\.firstResult\.derivedRef/);
});
