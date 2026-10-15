import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeControlOrb} from '../app/services/welcomeControlOrb.js';
import {createSpatialPaintV2} from '../app/services/spatialPaintV2.js';
import {createWelcomeComfortOptions} from '../app/services/welcomeComfortOptions.js';
import {wristButtonAt} from '../app/services/welcomeWristMenu.js';

test('Orb has gravity throughout and stick-click teaching requires right then left',()=>{
 const root=new THREE.Group(),orb=createWelcomeControlOrb(root),inputs=['right','left'].map(handedness=>({source:{handedness,gamepad:{buttons:Array.from({length:6},()=>({pressed:false})),axes:[0,0,0,0]}},matrix:new THREE.Matrix4().makeTranslation(...orb.group.position.toArray()).elements,down:false,trigger:false}));
 try{root.updateMatrixWorld(true);const step=()=>orb.update(.05,'controls-stick-click',inputs);step();inputs[1].source.gamepad.buttons[3].pressed=true;step();assert.equal(orb.snapshot().physical,true);assert.equal(orb.complete('controls-stick-click'),false,'left click cannot skip the right click');inputs[1].source.gamepad.buttons[3].pressed=false;step();inputs[0].source.gamepad.buttons[3].pressed=true;step();assert.equal(orb.snapshot().light,false);assert.equal(orb.complete('controls-stick-click'),false);inputs[0].source.gamepad.buttons[3].pressed=false;step();inputs[1].source.gamepad.buttons[3].pressed=true;step();assert.equal(orb.complete('controls-stick-click'),true);for(let i=0;i<60;i++)step();assert.ok(Math.abs(orb.group.position.y-orb.snapshot().radius)<.002);inputs[1].source.gamepad.axes=[0,0,.8,0];const before=orb.group.position.x;for(let i=0;i<8;i++)step();assert.ok(orb.group.position.x>before+.01);assert.ok(orb.group.position.x<.95);}
 finally{orb.destroy();}
});

test('drawings support grip movement, undo and rectangular contact erasing',()=>{
 const paint=createSpatialPaintV2();try{paint.add('right',{x:0,y:0,z:0});paint.add('right',{x:.04,y:0,z:0});paint.end('right');const stroke=paint.pickStroke(new THREE.Ray(new THREE.Vector3(.02,0,.3),new THREE.Vector3(0,0,-1)));assert.ok(stroke);assert.equal(paint.moveStroke(stroke,new THREE.Matrix4().makeTranslation(.2,0,0)),true);assert.ok(paint.serialize().strokes[0].points.every(p=>p.x>=.2));assert.equal(paint.eraseBox(new THREE.Box3(new THREE.Vector3(.18,-.02,-.02),new THREE.Vector3(.3,.02,.02))),1);assert.equal(paint.snapshot().strokes,0);paint.redo();assert.equal(paint.snapshot().strokes,1);paint.undo();assert.equal(paint.snapshot().strokes,0);}
 finally{paint.destroy();}
});

test('brush colours occupy a wheel with matching hit regions; general games sit last',()=>{
 const drawing=createSpatialPaintV2(),state={phase:'brush',controllerTool:'paint',settingsAvailable:true,inputMode:'gloves',voice:{},trials:{}};
 const stage={snapshot:()=>state,paint:drawing,trials:{active:null},button(){},setTableHeightOffset(){}};
 const menu=createWelcomeComfortOptions({stage});try{menu.act('colour-open');const colours=menu.context().items.filter(i=>i.color);assert.equal(colours.length,8);for(const colour of colours){assert.ok(colour.radial);const r=colour.radial,a=(r.start+r.end)/2,d=(r.inner+r.outer)/2;assert.equal(wristButtonAt(colours,r.x+Math.cos(a)*d,r.y+Math.sin(a)*d),colour);}menu.act('colour-close');menu.act('toggle');const dock=menu.context().items.filter(i=>i.dock);assert.equal(dock.at(-1).action,'Comfort:games');}
 finally{drawing.destroy();}
});

test('tabletop Orb rebounds against the supplied pot boundary and reports a contact',()=>{
 const root=new THREE.Group(),contacts=[],pot={x:.1,z:.14,radius:.12,top:.2,bottom:0},orb=createWelcomeControlOrb(root,{getPotBounds:()=>pot,onFeedback:(kind,source)=>contacts.push({kind,source})});
 const source={handedness:'right',gamepad:{axes:[0,0,1,0],buttons:[]}},input={source,matrix:new THREE.Matrix4().makeTranslation(-.3,.072,.14).elements,down:false,trigger:false};root.updateMatrixWorld(true);
 try{for(let i=0;i<100;i++){orb.update(.05,'controls-stick',[input]);const [x,y,z]=orb.snapshot().position;if(y<.2)assert.ok(Math.hypot(x-pot.x,z-pot.z)>=pot.radius+orb.snapshot().radius-.0001);}assert.ok(contacts.some(c=>c.kind==='impact' && c.source===source));}finally{orb.destroy();}
});
