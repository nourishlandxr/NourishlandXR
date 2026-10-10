import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialStick,turnSpatialAxes} from '../app/services/spatialStick.js';
import {butterflyElementVisit} from '../app/services/butterflyElementVisit.js';
import {fruitWindowMotionActive} from '../app/services/fruitWindowExperience.js';
import {FRUIT_WINDOW_LIBRARY} from '../app/services/fruitWindowInteraction.js';
import {publicKnowledgeText} from '../app/services/i18n.js';
import {createXRPerformanceSettings} from '../app/services/xrPerformanceSettings.js';
import {currentGraphicsQuality,getSpatialVisualSettings,setSpatialVisualSettings,setAdaptiveGraphicsQuality} from '../app/services/spatialVisualSettings.js';
import {readFileSync} from 'node:fs';
import {controlPanelControls} from '../app/services/pimInfoPanel.js';
import vm from 'node:vm';

test('held surfaces use the same joystick direction and a bounded time step',()=>{
 const source={gamepad:{axes:[0,0,1,-1]}};
 assert.ok(spatialStick(source).yaw>0);assert.ok(spatialStick(source).depth>0);
 assert.deepEqual(spatialStick({gamepad:{axes:[.1,-.1]}}),{yaw:0,depth:0});
 assert.deepEqual(spatialStick(source,5000),spatialStick(source,50));
 const pose={center:{x:0,y:1,z:-1},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}};
 assert.ok(turnSpatialAxes(pose,.2).normal.x>0);assert.deepEqual(turnSpatialAxes(pose,.2).center,pose.center);
});

test('a butterfly begins on its home perch, visits an element continuously and lands',()=>{
 const insect={seed:1,size:.04},home={id:'control',center:{x:0,y:1,z:-1},right:{x:1,y:0,z:0},normal:{x:0,y:0,z:1}},target={...home,id:'fruit',center:{x:.8,y:1,z:-1}};
 assert.deepEqual(butterflyElementVisit(insect,home,target,0).position,home.center);
 assert.deepEqual(butterflyElementVisit(insect,home,target,2800).position,home.center);
 assert.deepEqual(butterflyElementVisit(insect,home,target,3000).position,home.center);
 const midway=butterflyElementVisit(insect,home,target,6000);assert.ok(midway.position.x>0 && midway.position.x<.8);assert.equal(midway.pose.state,'flying');
 const landed=butterflyElementVisit(insect,home,target,10000);assert.deepEqual(landed.position,target.center);assert.equal(landed.pose.state,'landed');
});

test('idle fruit meshes need no animation update; growth, grips, rip and foliage remain live',()=>{
 const idle={playing:false,motion:null,opening:0,targetOpening:0};
 assert.equal(fruitWindowMotionActive(idle),false);
 for(const value of [{...idle,playing:true},{...idle,motion:{}},{...idle,targetOpening:.5}])assert.equal(fruitWindowMotionActive(value),true);
 for(const options of [{held:1},{hover:true},{hoverAmount:.1},{hoverOffsets:1}])assert.equal(fruitWindowMotionActive(idle,options),true);
 for(const item of FRUIT_WINDOW_LIBRARY){assert.ok(item.scientific,item.id);assert.ok(item.image,item.id);}
 assert.equal(publicKnowledgeText('Connect LIMO cells. Open PIMO. Live PIM.'),'Connect Learning cells. Open Plant cells. Live Plant cells.');
});

test('fruit choices remain in the main panel after full and incremental renders',()=>{
 const buttons=controlPanelControls({utilityActions:['carambola','mamey_sapote','african_peach','chinese_bayberry'].map(id=>({id:'fruit-example:'+id,label:id}))});
 assert.equal(buttons.filter(button=>button.kind==='fruit-choice').length,4);
 const panel=readFileSync(new URL('../app/services/pimInfoPanel.js',import.meta.url),'utf8');
 assert.match(panel,/utilities\.replaceChildren\(\.\.\.controls\(\)\.filter\(item=>\['utility','fruit-choice'\]\.includes\(item.kind\)/);
 assert.match(panel,/controls\(\)\.filter\(item=>\['utility','fruit-choice'\]\.includes\(item.kind\)\)\.forEach\(item=>utilities\.append/);
 const css=readFileSync(new URL('../app/living-objects.css',import.meta.url),'utf8');assert.match(css,/has-fruit-observation .*?context-trigger.*?right:18px!important/);
});

test('Return to demo closes the Learning surface and offers a fresh Continue action',()=>{
 const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8'),start=source.indexOf('onClose:()=>{'),end=source.indexOf('}});',start);
 let board=null,restored=false;
 const context=vm.createContext({selectedLimCell:'selected',limMeshVisible:true,contextCellKey:'hover',limPointerKey:'pointer',limActivation:{cancel(){}},introBoardTextureDirty:false,demoLimoReturn:null,infoPanel:{setExplorerOpen(){},showLearning(){},restoreSnapshot(){}},restoreMappedSceneAfterLimo(){restored=true;},showIntroBoard(...args){board=args;},showAudienceValue(){},setGuide(){},syncDemoPanelActions(){}});
 vm.runInContext('('+source.slice(start+8,end+1)+')()',context);
 assert.equal(context.limMeshVisible,false);assert.equal(context.contextCellKey,'');assert.equal(context.limPointerKey,'');assert.equal(restored,true);
 assert.equal(board[2],'Continue');assert.equal(board[3],context.showAudienceValue);assert.match(board[1],/discoveries remain saved/);
});

test('sustained slow automatic quality reduces only the session budget and clears on exit',()=>{
 const prefs=getSpatialVisualSettings(),listeners=new Map(),session={frameRate:90,visibilityState:'visible',addEventListener(type,fn){listeners.set(type,fn);}},snapshots=[];
 try{
  setSpatialVisualSettings({graphicsQuality:'auto'});const controller=createXRPerformanceSettings({getSession:()=>session,publish:s=>snapshots.push(s)});
  for(let time=0;time<=6500;time+=50)controller.tick(time);
  assert.equal(currentGraphicsQuality(),'low');assert.equal(getSpatialVisualSettings().graphicsQuality,'auto');assert.match(snapshots.at(-1).message,/Automatic graphics/);
  listeners.get('end')();assert.equal(currentGraphicsQuality(),'medium');
  setSpatialVisualSettings({graphicsQuality:'high'});for(let time=7000;time<=14000;time+=50)controller.tick(time);assert.equal(currentGraphicsQuality(),'high');
 }finally{setAdaptiveGraphicsQuality(null);setSpatialVisualSettings(prefs);}
});
