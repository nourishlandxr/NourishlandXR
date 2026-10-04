import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoButterflyPose,BUTTERFLY_PERCH_MS} from '../app/services/demoButterflyPose.js';
import {BEE_COUNT,demoBeePose,demoBeeEncounter} from '../app/services/demoAmbientLife.js';
import {panelSettingsControls,panelSliderValue} from '../app/services/pimInfoPanel.js';
import {demoGroundBaseY} from '../app/features/ar-demo/demoGeometry.js';
import {DEMO_TOTEM_HALF_HEIGHT_METRES} from '../app/features/ar-demo/demoConfig.js';
import {getSpatialVisualSettings,setSpatialVisualSettings} from '../app/services/spatialVisualSettings.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('butterfly perches for a minute and takeoff and repeated approaches are continuous',()=>{
 assert.equal(demoButterflyPose(0,1),null);
 assert.equal(demoButterflyPose(59999,0).state,'landed');assert.equal(demoButterflyPose(60000,0).flight,0);
 assert.equal(demoButterflyPose(64500,0).flight,1);
 assert.equal(demoButterflyPose(180000,0,{reducedMotion:true}).state,'landed');
 for(let time=BUTTERFLY_PERCH_MS;time<240000;time+=100){const a=demoButterflyPose(time,0),b=demoButterflyPose(time+1,0);for(const key of ['x','y','z','close','flight'])assert.ok(Number.isFinite(a[key]) && Math.abs(b[key]-a[key])<.002);}
 assert.ok(demoButterflyPose(132000,0).close>.8);
});
test('four bees share one staggered visitor encounter and each can visit',()=>{
 assert.equal(BEE_COUNT,4);const visitors=new Set();
 for(let age=0;age<260000;age+=250){const poses=Array.from({length:BEE_COUNT},(_,i)=>demoBeePose(age,0,i));const visitorsNow=poses.map((pose,i)=>pose?.flyby>0?i:-1).filter(i=>i>=0);assert.ok(visitorsNow.length<=1);visitorsNow.forEach(i=>visitors.add(i));}
 assert.equal(visitors.size,4);assert.ok(demoBeeEncounter(12000));
});
test('numeric settings have clampable stepped sliders and no percentage cycle buttons',()=>{
 const rows=panelSettingsControls({headset:true}),sliders=rows.filter(item=>item.kind==='slider');
 assert.deepEqual(sliders.map(item=>item.action),['InfoOpacity','TextSize','SpatialScale','FloorOffset']);
 for(const slider of sliders){assert.equal(panelSliderValue(slider,-10000),slider.min);assert.equal(panelSliderValue(slider,10000),slider.max);assert.ok(!slider.label?.includes('%'));}
 const opacity=sliders.find(item=>item.action==='InfoOpacity');assert.equal(panelSliderValue(opacity,opacity.x+18+(opacity.width-36)*.8),.8);
 const source=read('app/services/pimInfoPanel.js');assert.match(source,/sliderGrab.surface/);assert.match(source,/finishingSliderSource===event.inputSource/);assert.doesNotMatch(source,/if\(settingsOpen\)\{mediaCollapsed/);assert.doesNotMatch(source,/mediaDetached \|\| !settingsOpen/);
});
test('eye height fallback is configurable and demo body is exactly two metres',()=>{
 const saved=getSpatialVisualSettings();try{const viewer=new Float32Array(16);viewer[13]=1;setSpatialVisualSettings({eyeHeight:1,floorOffset:-.2});assert.equal(demoGroundBaseY(null,viewer),0);assert.equal(demoGroundBaseY(null,viewer,.1),.1);assert.equal(DEMO_TOTEM_HALF_HEIGHT_METRES*2,2);setSpatialVisualSettings({eyeHeight:20,floorOffset:-10});assert.equal(getSpatialVisualSettings().eyeHeight,2.2);assert.equal(getSpatialVisualSettings().floorOffset,-1.5);}finally{setSpatialVisualSettings(saved);}
 const demo=read('app/screens/temporaryArDemo.js');assert.match(demo,/referenceSpaceHasFloor \? 0/);assert.match(demo,/Check the Totem base against the real floor/);assert.doesNotMatch(demo,/center\.y-AR_PHONE_COMFORT\.boardScale\[1\]/);
});
test('butterfly preserves original mesh and attribution, with three skinned meshes and two clips',()=>{
 const bytes=readFileSync(new URL('../app/assets/animated_butterfly.glb',import.meta.url));const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
 assert.equal(bytes.length,494064);assert.equal(gltf.meshes.length,3);assert.deepEqual(gltf.animations.map(clip=>clip.name),['Flying','Idle']);assert.match(gltf.asset.extras.license,/CC-BY-4.0/);assert.match(read('app/assets/butterfly-CREDITS.txt'),/Artistic_side/);
 const model=read('app/services/demoButterflyModel.js');assert.match(model,/low:\{pixels:192/);assert.match(model,/high:\{pixels:384/);assert.match(model,/setEffectiveWeight\(pose.flight\)/);
 const demo=read('app/screens/temporaryArDemo.js');assert.match(demo,/getPerchPose/);assert.match(demo,/insect\.flightAnchor \|\|=/);assert.match(demo,/butterfly render/);
});
