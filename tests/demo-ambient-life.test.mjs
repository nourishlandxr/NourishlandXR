import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BEE_ENCOUNTER_DURATION_MS, BEE_FIRST_ENCOUNTER_MS, demoBeeEncounter, demoBeePose, drawDemoAmbientLife } from '../app/services/demoAmbientLife.js';

test('bees arrive after their introduction and orbit around the welcome screen', () => {
    assert.equal(demoBeePose(1200,2000,0),null);
    assert.equal(demoBeePose(2500,2000,1),null);
    const depths=[];
    const flyby=demoBeePose(2000+BEE_FIRST_ENCOUNTER_MS+BEE_ENCOUNTER_DURATION_MS*.45,2000,0);
    assert.equal(flyby.encounterPhase,'inspect');
    assert.ok(flyby.flyby>.95,'the first bee gradually reaches its viewer-facing inspection');
    assert.ok(flyby.x>.35 && flyby.x<.7);
    assert.ok(flyby.y>.35 && flyby.y<.6);
    for(const elapsed of [2000,6000,10000,31000,39000]){
        const bee=demoBeePose(elapsed,2000,0);
        assert.ok(bee.x>.15 && bee.x<.85);
        assert.ok(bee.y>.17 && bee.y<.83);
        assert.ok(Math.abs(Math.hypot(bee.x-.5,bee.y-.5)-.3)<.04);
        assert.ok(bee.opacity>=0 && bee.opacity<=.92);
        depths.push(bee.depth);
    }
    assert.ok(depths.some(depth=>depth<0));
    assert.ok(depths.some(depth=>depth>0));
});

test('reduced motion keeps subtle ambient bees but disables face approaches', () => {
    const calls=[];
    const context={
        clearRect(){},save(){},restore(){},translate(){},fill(){},stroke(){},
        beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},quadraticCurveTo(){},arc(){},
        ellipse(...args){calls.push(args);}
    };
    drawDemoAmbientLife(context,1200,800,{growth:1,elapsed:BEE_FIRST_ENCOUNTER_MS+3000,beesStartedAt:0,reducedMotion:true});
    assert.ok(calls.length>=6);
    assert.equal(demoBeePose(BEE_FIRST_ENCOUNTER_MS+3000,0,0,{encounters:false}).encounterPhase,'ambient');
    calls.length=0;
    drawDemoAmbientLife(context,1200,800,{growth:1,elapsed:6000,beesStartedAt:0});
    assert.ok(calls.length>=6);
});

test('bee encounters are deterministic, comfortably timed and continuous at every phase boundary',()=>{
    assert.equal(demoBeeEncounter(BEE_FIRST_ENCOUNTER_MS-1),null);
    const phases=[[.2,'approach'],[.45,'inspect'],[.65,'pass'],[.9,'exit']];
    for(const [progress,phase] of phases)assert.equal(demoBeeEncounter(BEE_FIRST_ENCOUNTER_MS+BEE_ENCOUNTER_DURATION_MS*progress).phase,phase);
    for(const boundary of [.38,.52,.8]){
        const before=demoBeePose(BEE_FIRST_ENCOUNTER_MS+BEE_ENCOUNTER_DURATION_MS*boundary-1,0,0);
        const after=demoBeePose(BEE_FIRST_ENCOUNTER_MS+BEE_ENCOUNTER_DURATION_MS*boundary+1,0,0);
        assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.01);
        assert.ok(Math.abs(after.depth-before.depth)<.01);
    }
    const firstEnd=BEE_FIRST_ENCOUNTER_MS+BEE_ENCOUNTER_DURATION_MS;
    let nextStart=firstEnd+1;
    while(!demoBeeEncounter(nextStart) && nextStart<firstEnd+76000)nextStart+=100;
    assert.ok(nextStart-firstEnd>=35000 && nextStart-firstEnd<=75100);
    assert.deepEqual(demoBeeEncounter(nextStart),demoBeeEncounter(nextStart));
});

test('ambient life is wired into simulated and immersive demo rendering', () => {
    const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const style=readFileSync(new URL('../app/style.css',import.meta.url),'utf8');
    const spatialDraw=source.slice(source.indexOf('function drawSpatialAmbientLife'),source.indexOf('function drawSpatialRain'));
    assert.match(source,/data-demo-ambient/);
    assert.match(source,/mountDemoBeeModel/);
    assert.match(source,/mountDemoBeeModel\(modelCanvas,\{gl:simulated\?null:gl\}\)/);
    assert.match(source,/paintDemoAmbientLife\(now\)/);
    assert.match(source,/drawSpatialAmbientLife\(view\)/);
    assert.match(spatialDraw,/ambientBeeModel\?\.drawXR\?\.\(view,position,arWelcomeClock\.elapsed,\{\.\.\.bee,viewer:viewerMatrix\}\)/);
    assert.doesNotMatch(spatialDraw,/tex(?:Sub)?Image2D|renderSprite/);
    assert.match(spatialDraw,/ambientWorldAnchor\.x[\s\S]*ambientWorldAnchor\.y[\s\S]*ambientWorldAnchor\.z/);
    assert.match(spatialDraw,/bee\.flyby\*\.3/);
    assert.match(spatialDraw,/encounters:!reducedMotion/);
    assert.doesNotMatch(spatialDraw,/\bbase\.(?:x|y|z)\b/);
    assert.doesNotMatch(source,/seedlingGrowthStage|ambientGrowth|tickDemoAmbientLife/);
    assert.doesNotMatch(source,/drawAmbientTreeSprites|AMBIENT_TREE_ASSETS|lychee-tree-/);
    assert.match(style,/\.tryit-ambient-life[^}]*z-index:12000[^}]*pointer-events:none/);
    assert.match(style,/@media \(hover:hover\) and \(pointer:fine\) \{ \.tryit-demo\.is-simulated \.tryit-stage \{ background:#050606; \} \}/);
    assert.doesNotMatch(source,/darkBackdrop:/);
    assert.doesNotMatch(source,/tryit-bee-credit|Bee model ·/);
    assert.doesNotMatch(style,/tryit-bee-credit/);
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
