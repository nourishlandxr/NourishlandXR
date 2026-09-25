import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { demoBeePose, drawDemoAmbientLife } from '../app/services/demoAmbientLife.js';

test('bees arrive only after their introduction and stay near the edge', () => {
    assert.equal(demoBeePose(1200,2000,0),null);
    assert.equal(demoBeePose(2500,2000,1),null);
    for(const elapsed of [2000,4000,8000,16000]){
        const bee=demoBeePose(elapsed,2000,0);
        assert.ok(bee.x>.69 && bee.x<.89);
        assert.ok(bee.y>.55 && bee.y<.69);
        assert.ok(bee.opacity>=0 && bee.opacity<=.83);
    }
});

test('reduced motion omits animated bees', () => {
    const calls=[];
    const context={
        clearRect(){},save(){},restore(){},translate(){},fill(){},stroke(){},
        beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},quadraticCurveTo(){},arc(){},
        ellipse(...args){calls.push(args);}
    };
    drawDemoAmbientLife(context,1200,800,{growth:1,elapsed:6000,beesStartedAt:0,reducedMotion:true});
    assert.equal(calls.length,0);
    calls.length=0;
    drawDemoAmbientLife(context,1200,800,{growth:1,elapsed:6000,beesStartedAt:0});
    assert.ok(calls.length>=6);
});

test('ambient life is wired into simulated and immersive demo rendering', () => {
    const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const style=readFileSync(new URL('../app/style.css',import.meta.url),'utf8');
    const spatialDraw=source.slice(source.indexOf('function drawSpatialAmbientLife'),source.indexOf('function drawSpatialRain'));
    assert.match(source,/data-demo-ambient/);
    assert.match(source,/paintDemoAmbientLife\(now\)/);
    assert.match(source,/drawSpatialAmbientLife\(view\)/);
    assert.match(spatialDraw,/ambientWorldAnchor\.x[\s\S]*ambientWorldAnchor\.y[\s\S]*ambientWorldAnchor\.z/);
    assert.doesNotMatch(spatialDraw,/\bbase\.(?:x|y|z)\b/);
    assert.doesNotMatch(source,/seedlingGrowthStage|ambientGrowth|tickDemoAmbientLife/);
    assert.doesNotMatch(source,/drawAmbientTreeSprites|AMBIENT_TREE_ASSETS|lychee-tree-/);
    assert.match(style,/\.tryit-ambient-life[^}]*z-index:12000[^}]*pointer-events:none/);
    assert.match(style,/@media \(hover:hover\) and \(pointer:fine\) \{ \.tryit-demo\.is-simulated \.tryit-stage \{ background:#050606; \} \}/);
    assert.doesNotMatch(source,/darkBackdrop:/);
});
