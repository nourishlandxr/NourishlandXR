import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
    DEMO_RECORD_IDS,
    demoAreaLinkVisible,
    demoAreaRecordVisible,
    demoGroundLinkRoute
} from '../app/services/demoAreaOwnership.js';

test('authored demo records have stable, unique IDs', () => {
    const ids = Object.values(DEMO_RECORD_IDS);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every(id => /^demo-[a-z0-9-]+$/.test(id)));
});

test('Totem 2 authors exactly Vetiver, Acacia, Jackfruit and Lychee with real ownership keys',()=>{
    const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    for(const id of ['DEMO_RECORD_IDS.vetiver','DEMO_RECORD_IDS.acacia','DEMO_RECORD_IDS.jackfruit','DEMO_RECORD_IDS.lychee'])assert.match(source,new RegExp(id.replace('.','\\.')));
    assert.doesNotMatch(source,/\{name:'Banana',dx:/);
    assert.match(source,/demoAreaId:totem\.id/);
    assert.match(source,/if\(area\.demoTotemFaded\)clearHiddenDemoAreaState\(area\)/);
});

test('ambient records follow their exact Area owner while guided plants remain available', () => {
    const first = { id: DEMO_RECORD_IDS.botanicalGarden, demoType: 'zone' };
    const second = { id: DEMO_RECORD_IDS.rainforestWalk, demoType: 'zone' };
    const vetiver = { demoType: 'plant', demoAmbientNeighbour: true, demoAreaId: second.id };
    const orphan = { demoType: 'plant', demoAmbientNeighbour: true };
    const guided = { demoType: 'plant', demoAmbientNeighbour: false, demoAreaId: first.id };
    const records = [first, second, vetiver, orphan, guided];

    assert.equal(demoAreaRecordVisible(vetiver, records), true);
    second.demoTotemFaded = true;
    assert.equal(demoAreaRecordVisible(vetiver, records), false);
    assert.equal(demoAreaRecordVisible(guided, records), true);
    assert.equal(demoAreaRecordVisible(orphan, records), false);
    second.demoTotemFaded = false;
    second.demoNarrativeFaded = true;
    assert.equal(demoAreaRecordVisible(vetiver, records), false);
});

test('ground route is trimmed, stays two centimetres above ground and hides with either Totem', () => {
    const first = { id: 'first', demoType: 'zone', demoLinkVisible: true, groundBaseY: .1, position: { x: 0, y: .5, z: 0 } };
    const second = { id: 'second', demoType: 'zone', demoLinkVisible: true, groundBaseY: .2, position: { x: 2, y: .6, z: 0 } };
    assert.equal(demoAreaLinkVisible(first, second), true);
    const route = demoGroundLinkRoute(first, second);
    assert.ok(Math.abs(route.start.x - .14) < 1e-9);
    assert.ok(Math.abs(route.end.x - 1.86) < 1e-9);
    assert.ok(Math.abs(route.start.y - .12) < 1e-9);
    assert.ok(Math.abs(route.end.y - .22) < 1e-9);
    assert.equal(route.start.z, 0);
    assert.equal(route.end.z, 0);
    assert.equal(route.clearance, .02);
    assert.equal(route.endpointTrim, .14);
    second.demoTotemFaded = true;
    assert.equal(demoAreaLinkVisible(first, second), false);
    assert.equal(demoGroundLinkRoute(first, second), null);
});
