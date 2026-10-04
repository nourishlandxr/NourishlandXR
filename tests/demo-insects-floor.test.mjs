import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INSECT_VISUALS,keepInsectAboveFloor,beeCuriosity,insectFlowerVisit,butterflyFlightPoint,butterflyFlightHeading} from '../app/services/demoInsectFlight.js';
import {demoTotemHeightForScreen,shiftDemoAreaToFloor} from '../app/services/demoFloorPlacement.js';
import {demoButterflyPose} from '../app/services/demoButterflyPose.js';
import {demoBeePose} from '../app/services/demoAmbientLife.js';
import {getSpatialVisualSettings,setSpatialVisualSettings} from '../app/services/spatialVisualSettings.js';
import {panelSettingsControls} from '../app/services/pimInfoPanel.js';
import {livingFrameFlowerSites} from '../app/services/arWelcomeRoots.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Insects is a saved independent on/off setting directly below Rain',()=>{
 const saved=getSpatialVisualSettings();try{
  setSpatialVisualSettings({insects:false});assert.equal(getSpatialVisualSettings().insects,false);
  const rows=panelSettingsControls({graphicsOpen:true}),rain=rows.find(r=>r.action==='RainQuality'),insects=rows.find(r=>r.action==='Insects');
  assert.equal(insects.label,'Off');assert.equal(rows.indexOf(insects),rows.indexOf(rain)+1);assert.ok(insects.y>rain.y);
  setSpatialVisualSettings({graphicsQuality:'high'});assert.equal(getSpatialVisualSettings().insects,false);
 }finally{setSpatialVisualSettings(saved);}
});
test('floor clearance covers bee bodies and survives adjustment and close-up positions',()=>{
 for(const floor of [-1.65,0,.8])for(const y of [-3,0,2]){const point=keepInsectAboveFloor({x:1,y,z:2},floor);assert.ok(point.y>=floor+INSECT_VISUALS.beeFloorClearance);assert.equal(point.x,1);}
 const screen=read('app/screens/temporaryArDemo.js');assert.match(screen,/keepInsectAboveFloor\([\s\S]*calibratedDemoGroundY\(\)/);
 assert.match(screen,/boardScale\[0\]\*\.4/);assert.match(screen,/boardScale\[1\]\*\.16/);
});
test('bee close inspection keeps moving in three dimensions, sizes vary and face correction uses the centre viewer',()=>{
 const a=beeCuriosity(.40),b=beeCuriosity(.50);for(const axis of ['x','y','z'])assert.notEqual(a[axis],b[axis]);
 const sizes=new Set(Array.from({length:4},(_,i)=>demoBeePose(30000,0,i).bodyScale));assert.equal(sizes.size,4);
 const shader=read('app/services/demoBeeXR.js');assert.match(shader,/camera=pose.viewer \|\| view.transform.matrix/);assert.match(shader,/\+Math.PI\+\(pose.headTurn/);
 assert.ok(INSECT_VISUALS.beeSize<.2);
});
test('red perches 30 seconds, blue 60 seconds, and flight direction agrees with velocity',()=>{
 assert.equal(demoButterflyPose(29999,0,{perchMs:30000,seed:1}).state,'landed');
 assert.equal(demoButterflyPose(35000,0,{perchMs:30000,seed:1}).state,'flying');assert.equal(demoButterflyPose(35000,0).state,'landed');
 assert.notDeepEqual(demoButterflyPose(90000,0),demoButterflyPose(90000,0,{perchMs:30000,seed:1}));
 for(let time=0;time<240;time+=.5){const a=butterflyFlightPoint(time),b=butterflyFlightPoint(time+.03),heading=butterflyFlightHeading(time);assert.ok((b.x-a.x)*Math.sin(heading.yaw)+(b.z-a.z)*Math.cos(heading.yaw)>0);}
 const model=read('app/services/demoButterflyModel.js');assert.match(model,/red>.5 && mapped>.5/);assert.match(model,/foldedPoseCache/);assert.match(model,/pose.wingPhase/);
});
test('flower visits begin only once flowers exist and transition continuously',()=>{
 assert.equal(livingFrameFlowerSites(0).length,0);assert.ok(livingFrameFlowerSites(140000).length>0);
 for(let time=0;time<180000;time+=100){const a=insectFlowerVisit(time),b=insectFlowerVisit(time+1);assert.ok(a.amount>=0 && a.amount<=1);assert.ok(Math.abs(a.amount-b.amount)<.001);}
 assert.equal(insectFlowerVisit(25000,0,{enabled:false}).amount,0);
});
test('Totem tip starts at main-screen midpoint and floor adjustment moves Area content and open panels once',()=>{
 assert.equal(demoTotemHeightForScreen(0,2.47)*2,2.47);assert.equal(.4+demoTotemHeightForScreen(.4,2.47)*2,2.47);
 const position={x:0,y:.8,z:0},panel={x:0,y:1.5,z:0};
 const records=[{id:'area',demoType:'zone',groundBaseY:0,demoHalfHeight:1,position:{x:0,y:1,z:0}},
 {demoType:'plant',demoAreaId:'area',position,informationPosition:panel,informationPose:{position:panel}},
 {demoType:'note',demoAreaId:'area',position:{x:0,y:.4,z:0}},
 {demoType:'plant',demoAreaId:'elsewhere',position:{x:0,y:.7,z:0}}];
 shiftDemoAreaToFloor(records,.5);assert.equal(records[0].position.y,1.5);assert.equal(position.y,1.3);assert.equal(panel.y,2);assert.equal(records[2].position.y,.9);assert.equal(records[3].position.y,.7);
 shiftDemoAreaToFloor(records,.5);assert.equal(panel.y,2,'identical floor updates do not accumulate');
});
test('round learning cells preserve peripheral planting rather than erasing full foliage discs',()=>{
 const frame=read('app/services/arWelcomeShowcase.js'),roots=read('app/services/arWelcomeRoots.js');
 assert.match(frame,/context.arc\(0,0,radius,0,Math.PI\*2\)/);assert.match(roots,/const radius=\(cell.radius-LIVING_RIM.cellGap\)\*\.52/);
 assert.match(roots,/start=polarPoint\(angle,535\)/);
});
