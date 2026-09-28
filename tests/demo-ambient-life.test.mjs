import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { demoBeePose, drawDemoAmbientLife } from '../app/services/demoAmbientLife.js';

test('bees arrive after their introduction and orbit around the welcome screen', () => {
    assert.equal(demoBeePose(1200,2000,0),null);
    assert.equal(demoBeePose(2500,2000,1),null);
    const depths=[];
    for(const elapsed of [2000,4000,8000,16000,24000]){
        const bee=demoBeePose(elapsed,2000,0);
        assert.ok(bee.x>.15 && bee.x<.85);
        assert.ok(bee.y>.19 && bee.y<.81);
        assert.ok(Math.abs(Math.hypot(bee.x-.5,bee.y-.5)-.3)<1e-9);
        assert.ok(bee.opacity>=0 && bee.opacity<=.92);
        depths.push(bee.depth);
    }
    assert.ok(depths.some(depth=>depth<0));
    assert.ok(depths.some(depth=>depth>0));
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
    assert.match(source,/mountDemoBeeModel/);
    assert.match(source,/mountDemoBeeModel\(modelCanvas,\{sprite:!simulated\}\)/);
    assert.match(source,/paintDemoAmbientLife\(now\)/);
    assert.match(source,/drawSpatialAmbientLife\(view\)/);
    assert.match(spatialDraw,/ambientBeeModel\?\.renderSprite\?\.\(arWelcomeClock\.elapsed,ambientBeesStartedAt\)/);
    assert.match(spatialDraw,/gl\.texImage2D\(gl\.TEXTURE_2D,0,gl\.RGBA,gl\.RGBA,gl\.UNSIGNED_BYTE,sprite\)/);
    assert.match(spatialDraw,/ambientWorldAnchor\.x[\s\S]*ambientWorldAnchor\.y[\s\S]*ambientWorldAnchor\.z/);
    assert.doesNotMatch(spatialDraw,/\bbase\.(?:x|y|z)\b/);
    assert.doesNotMatch(source,/seedlingGrowthStage|ambientGrowth|tickDemoAmbientLife/);
    assert.doesNotMatch(source,/drawAmbientTreeSprites|AMBIENT_TREE_ASSETS|lychee-tree-/);
    assert.match(style,/\.tryit-ambient-life[^}]*z-index:12000[^}]*pointer-events:none/);
    assert.match(style,/@media \(hover:hover\) and \(pointer:fine\) \{ \.tryit-demo\.is-simulated \.tryit-stage \{ background:#050606; \} \}/);
    assert.doesNotMatch(source,/darkBackdrop:/);
});

test('the supplied animated bee asset is bundled with its attribution', () => {
    const data=readFileSync(new URL('../app/assets/bee.glb',import.meta.url));
    assert.equal(data.toString('ascii',0,4),'glTF');
    assert.equal(data.readUInt32LE(4),2);
    assert.equal(data.readUInt32LE(8),data.length);
    const json=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));
    assert.ok(json.animations.some(animation=>animation.name==='hover'));
    assert.ok(json.meshes.length>0 && json.skins.length>0);
    assert.match(readFileSync(new URL('../app/assets/bee-CREDITS.txt',import.meta.url),'utf8'),/etro313[\s\S]*CC BY 4\.0/);
});
