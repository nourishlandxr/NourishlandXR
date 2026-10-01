import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { demoRainV2Field, paintDemoRainV2Preview } from '../app/services/demoRainV2.js';

test('Rain V2 is deterministic, layered and Quest-budgeted',()=>{
    const first=demoRainV2Field(12345,1),second=demoRainV2Field(12345,1);
    assert.deepEqual(first,second);
    assert.deepEqual(first.layers.map(layer=>layer.id),['near','middle','distant']);
    assert.ok(first.layers[0].count<first.layers[2].count,'foreground drops remain sparse');
    assert.ok(first.dropCount>112 && first.dropCount<=224,'V2 is visible while retaining a fixed Quest budget');
    assert.ok(first.splashes.length>0 && first.mistOpacity>0);
});

test('Rain Off suppresses every V2 effect and mobile degrades gracefully',()=>{
    assert.deepEqual(demoRainV2Field(1000,0),{layers:[],splashes:new Float32Array(),mistOpacity:0,dropCount:0});
    assert.ok(demoRainV2Field(1000,1,{mobile:true}).dropCount<demoRainV2Field(1000,1).dropCount);
});

test('Rain V2 preview paints layered drops, while Off and style switch leave V1 separate',()=>{
    const calls=[];
    const context={
        beginPath(){calls.push('begin');},moveTo(){calls.push('move');},lineTo(){calls.push('line');},
        stroke(){calls.push('stroke');},ellipse(){calls.push('ellipse');},fillRect(){calls.push('mist');},
        createLinearGradient(){return {addColorStop(){}};}
    };
    assert.ok(paintDemoRainV2Preview(context,1200,800,demoRainV2Field(12345,1))>0);
    assert.ok(calls.includes('mist'));
    assert.equal(paintDemoRainV2Preview(context,1200,800,demoRainV2Field(12345,0)),0);
    const demo=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const styles=fs.readFileSync(new URL('../app/style.css',import.meta.url),'utf8');
    assert.match(demo,/if\(demoRainStyle!=='v2' \|\| demoRainIntensity<=0/);
    assert.match(demo,/paintDemoRainV2Preview\(context,width,height,demoRainV2Field/);
    assert.match(demo,/function drawSpatialRain\(view,time\)\{if\(demoRainStyle==='v1'\)drawSpatialRainV1\(view,time\);else drawSpatialRainV2\(view,time\);\}/);
    assert.match(styles,/data-rain-style="v2"\] \.tryit-stage::before,[^\n]*opacity:0 !important/);
});
