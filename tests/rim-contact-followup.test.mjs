import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFrameRimHit,avoidLivingFrameDisk,LIVING_FRAME_CONTACT} from '../app/services/livingFramePlacement.js';
import {BUTTERFLY_VARIANTS,butterflyPanelPerch} from '../app/services/demoButterflyFlock.js';
import {panelOpenerControls} from '../app/services/pimInfoPanel.js';
const pose={center:{x:0,y:0,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1},radius:.832};
test('contact covers native outer leaves and front flowers, including side approaches',()=>{
 const hit=livingFrameRimHit({origin:{x:1.058,y:0,z:2},direction:{x:0,y:0,z:-1}},pose);
 assert.ok(hit);assert.ok(hit.point.z>.19039477+.012);
 const side=livingFrameRimHit({origin:{x:1.3,y:0,z:.18},direction:{x:-1,y:0,z:0}},pose);
 assert.ok(side);assert.ok(Math.abs(side.point.x-LIVING_FRAME_CONTACT.outer)<1e-9);
 const bee=avoidLivingFrameDisk({x:1.055,y:0,z:.20},pose,0,{x:1.15,y:0,z:.20});
 assert.ok(bee.z>=.28);assert.ok(Math.hypot(bee.x,bee.y)>1.09);
});
test('every butterfly colour perches above the PIMO cell edge, never across its centre',()=>{
 const surface={...pose,width:.32,height:.36,cellEdge:true};
 for(const insect of BUTTERFLY_VARIANTS){const point=butterflyPanelPerch(surface,insect).center;assert.ok(point.y>surface.height/2);assert.ok(Math.abs(point.x)<surface.width/4);assert.equal(point.z,.03);}
 const rotated={...surface,right:{x:0,y:0,z:-1},normal:{x:1,y:0,z:0}};
 const point=butterflyPanelPerch(rotated,BUTTERFLY_VARIANTS.find(v=>v.id==='purple')).center;assert.equal(point.x,.03);assert.ok(point.y>.18);
});
test('VIEW is always offered immediately below Controls on the main left rail',()=>{
 const buttons=panelOpenerControls();const controls=buttons.findIndex(b=>b.action==='Explorer');assert.equal(buttons[controls+1].action,'View');assert.equal(buttons[controls+1].x,18);assert.equal(buttons[controls+1].y,buttons[controls].y+62);
});

test('curious visits resume during learning with slow approach, soft exit and strong contact feedback',async()=>{
 const {demoBeeEncounter,BEE_FIRST_ENCOUNTER_MS,BEE_ENCOUNTER_DURATION_MS}=await import('../app/services/demoAmbientLife.js');
 const {DEMO_FEEDBACK}=await import('../app/services/demoFeedback.js');
 const {readFileSync}=await import('node:fs');
 assert.equal(BEE_ENCOUNTER_DURATION_MS,22000);
 const envelope=t=>demoBeeEncounter(BEE_FIRST_ENCOUNTER_MS+t*BEE_ENCOUNTER_DURATION_MS).envelope;
 assert.ok(envelope(.1)<envelope(.2));assert.ok(envelope(.2)<envelope(.35));
 assert.ok(envelope(.75)>envelope(.9));assert.ok(envelope(.9)>envelope(.99));
 assert.ok(DEMO_FEEDBACK.beeApproachStrength>=.8);assert.ok(DEMO_FEEDBACK.beeApproachDuration>=250);
 const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/ambientCloseVisitsSuppressed|enteringInteraction/);
 assert.match(source,/Math.min\(1,\.60\*dt\/distance\)/);
});
