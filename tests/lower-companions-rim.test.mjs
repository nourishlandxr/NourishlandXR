import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lowerCompanionLayout} from '../app/services/lowerCompanionLayout.js';
import {livingFrameRimHit} from '../app/services/livingFramePlacement.js';
import {panelOpenerControls,panelViewControls} from '../app/services/pimInfoPanel.js';

const pose={center:{x:0,y:1,z:-2},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}};
test('Controls, VIEW and Guides stay open together and occupy separate aligned lower surfaces',()=>{
 const openers=panelOpenerControls({explorerClosed:false,settingsOpen:true,viewOpen:true,guidesOpen:true,hasView:true,hasGuides:true});
 for(const action of ['Explorer','View','Guides','Settings'])assert.equal(openers.find(item=>item.action===action).expanded,true);
 const surfaces=lowerCompanionLayout(pose,{mainWidth:.84,mainHeight:.588,panels:[{id:'explorer',height:700},{id:'view',height:512},{id:'guides',height:700}]});
 assert.equal(surfaces.length,3);
 for(const surface of surfaces)assert.ok(Math.abs(surface.center.y+surface.height/2-(pose.center.y-.588/2-.035))<1e-10);
 for(let index=1;index<surfaces.length;index++)assert.ok(surfaces[index].center.x-surfaces[index-1].center.x>(surfaces[index].width+surfaces[index-1].width)/2);
 assert.equal(panelViewControls().at(-1).action,'CloseView');
 const panel=readFileSync(new URL('../app/services/pimInfoPanel.js',import.meta.url),'utf8');
 assert.match(panel,/if\(action==='View'\)\{viewOpen=!viewOpen/);
 assert.match(panel,/if\(action==='Guides'\)\{guidesOpen=!guidesOpen/);
 assert.match(panel,/cardId:id/);
});
test('lower companions follow the reader axes after rotation and a closed panel consumes no slot',()=>{
 const turned={...pose,right:{x:0,y:0,z:-1},normal:{x:1,y:0,z:0}};
 const surfaces=lowerCompanionLayout(turned,{mainWidth:.84,mainHeight:.588,panels:[{id:'view',height:512},{id:'guides',height:700}]});
 assert.equal(surfaces[0].center.x,pose.center.x);assert.notEqual(surfaces[0].center.z,surfaces[1].center.z);
 const [alone]=lowerCompanionLayout(turned,{mainWidth:.84,mainHeight:.588,panels:[{id:'view',height:512}]});assert.equal(alone.center.z,pose.center.z);
});
test('laser meets the Living Frame rim from either side while its central aperture stays clear',()=>{
 const frame={...pose,radius:.832};
 const front=livingFrameRimHit({origin:{x:.9,y:1,z:0},direction:{x:0,y:0,z:-1}},frame);assert.ok(front);assert.equal(front.kind,'living-frame-rim');assert.ok(Math.abs(front.point.z+1.785)<1e-9);
 assert.ok(livingFrameRimHit({origin:{x:.9,y:1,z:-3},direction:{x:0,y:0,z:1}},frame));
 assert.equal(livingFrameRimHit({origin:{x:0,y:1,z:0},direction:{x:0,y:0,z:-1}},frame),null);
 assert.equal(livingFrameRimHit({origin:{x:1.2,y:1,z:0},direction:{x:0,y:0,z:-1}},frame),null);
 const turned={...frame,right:{x:0,y:0,z:-1},normal:{x:1,y:0,z:0}};
 assert.ok(livingFrameRimHit({origin:{x:2,y:1,z:-2.9},direction:{x:-1,y:0,z:0}},turned));
 const demo=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
 assert.match(demo,/\[demoLivingFrameRimHit\(\),limSurface/);assert.match(demo,/pressedCell\?\.kind==='living-frame-rim'/);
});
