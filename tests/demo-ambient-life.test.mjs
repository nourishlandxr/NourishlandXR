import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { advanceAmbientGrowth, demoBeePose, drawDemoAmbientLife } from '../app/services/demoAmbientLife.js';

test('the seedling grows steadily toward a tree without jumping at a demo step', () => {
    let state={progress:0,lastElapsed:12000};
    for(let elapsed=12050;elapsed<=22000;elapsed+=50){
        const next=advanceAmbientGrowth(state,elapsed,.7,12000);
        assert.ok(next.progress>=state.progress);
        assert.ok(next.progress-state.progress<.01);
        state=next;
    }
    assert.ok(state.progress>.4 && state.progress<.7);
    const next=advanceAmbientGrowth(state,22050,1,12000);
    assert.ok(next.progress-state.progress<.01);
    assert.equal(advanceAmbientGrowth(state,23000,1,NaN).progress,0);
});

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

test('reduced motion keeps the tree but omits animated bees', () => {
    const calls=[];
    const context={
        clearRect(){},save(){},restore(){},translate(){},fill(){},stroke(){},
        beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},quadraticCurveTo(){},arc(){},
        ellipse(...args){calls.push(args);}
    };
    drawDemoAmbientLife(context,1200,800,{growth:1,elapsed:6000,beesStartedAt:0,reducedMotion:true});
    assert.equal(calls.length,5);
    calls.length=0;
    drawDemoAmbientLife(context,1200,800,{growth:1,elapsed:6000,beesStartedAt:0});
    assert.ok(calls.length>5);
});

test('lightweight lychee cutouts replace primitive tree shapes and fruit appears only at maturity', () => {
    const calls={images:0,fruit:0,ellipses:0};
    const context={
        globalAlpha:1,clearRect(){},save(){},restore(){},translate(){},fill(){},stroke(){},
        beginPath(){},moveTo(){},lineTo(){},drawImage(){calls.images++;},
        arc(){calls.fruit++;},ellipse(){calls.ellipses++;}
    };
    const treeImages={bare:{naturalWidth:512},leafy:{naturalWidth:512}};
    drawDemoAmbientLife(context,1200,800,{growth:.7,treeImages,reducedMotion:true});
    assert.equal(calls.images,2);
    assert.equal(calls.fruit,0);
    assert.equal(calls.ellipses,0);
    drawDemoAmbientLife(context,1200,800,{growth:1,treeImages,reducedMotion:true});
    assert.ok(calls.fruit>0);
    for(const name of ['lychee-tree-bare.png','lychee-tree-leafy.png']){
        assert.ok(statSync(new URL(`../app/assets/${name}`,import.meta.url)).size<600_000);
    }
});

test('ambient life is wired into simulated and immersive demo rendering', () => {
    const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const style=readFileSync(new URL('../app/style.css',import.meta.url),'utf8');
    assert.match(source,/data-demo-ambient/);
    assert.match(source,/paintDemoAmbientLife\(now\)/);
    assert.match(source,/drawSpatialAmbientLife\(view\)/);
    assert.match(source,/drawAmbientTreeSprites\(view,base,growth\)/);
    assert.match(style,/\.tryit-ambient-life[^}]*pointer-events:none/);
    assert.match(style,/@media \(hover:hover\) and \(pointer:fine\) \{ \.tryit-demo\.is-simulated \.tryit-stage \{ background:#050606; \} \}/);
    assert.match(source,/darkBackdrop:window\.matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)\.matches/);
});
