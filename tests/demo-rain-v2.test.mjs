import assert from 'node:assert/strict';
import test from 'node:test';
import { demoRainV2Field } from '../app/services/demoRainV2.js';

test('Rain V2 is deterministic, layered and Quest-budgeted',()=>{
    const first=demoRainV2Field(12345,1),second=demoRainV2Field(12345,1);
    assert.deepEqual(first,second);
    assert.deepEqual(first.layers.map(layer=>layer.id),['near','middle','distant']);
    assert.ok(first.layers[0].count<first.layers[2].count,'foreground drops remain sparse');
    assert.ok(first.dropCount<=112);
    assert.ok(first.splashes.length>0 && first.mistOpacity>0);
});

test('Rain Off suppresses every V2 effect and mobile degrades gracefully',()=>{
    assert.deepEqual(demoRainV2Field(1000,0),{layers:[],splashes:new Float32Array(),mistOpacity:0,dropCount:0});
    assert.ok(demoRainV2Field(1000,1,{mobile:true}).dropCount<demoRainV2Field(1000,1).dropCount);
});
