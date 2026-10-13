import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeComfortOptions} from '../app/services/welcomeComfortOptions.js';
import {wristButtonAt,welcomeWristPose} from '../app/services/welcomeWristMenu.js';
import {createSpatialPaintV2} from '../app/services/spatialPaintV2.js';

function setup(){
    const paint=createSpatialPaintV2({markings:true}),trials={active:null,mode:'controllers',paint,open(id){this.active=id;},close(){this.active=null;},command(){}};
    let controllerTool='standard';const stage={trials,paint,setControllerTool(tool){controllerTool=tool;},snapshot:()=>({phase:'brush',controllerTool,insectControllerAvailable:false,voice:{},trials:{active:trials.active},inputMode:'controllers'}),setInputMode(mode){trials.mode=mode;},button(){}};
    return {menu:createWelcomeComfortOptions({stage}),paint};
}
test('a discreet pulse button opens six 30mm targets in two columns down the forearm, with fixed right-side tools',()=>{
    const {menu,paint}=setup(),collapsed=menu.context();assert.equal(collapsed.items.length,1);assert.equal(collapsed.items[0].action,'Comfort:toggle');assert.ok(collapsed.width<.03);
    menu.act('toggle');const home=menu.context(),dock=home.items.filter(item=>item.dock);assert.equal(dock.length,6);assert.equal(new Set(dock.map(item=>item.worldBox.x)).size,2);assert.equal(new Set(dock.map(item=>item.worldBox.y)).size,3);
    for(const item of dock){assert.ok(item.ariaLabel);assert.ok(item.accent);assert.equal(item.text,undefined);assert.ok(Math.abs(item.width*home.width/1000-.030)<1e-9);}
    const matrix=new THREE.Matrix4().makeRotationY(.65).setPosition(.2,1,-.4).elements,closed=welcomeWristPose(matrix,home);menu.act('games');const expanded=menu.context(),opened=welcomeWristPose(matrix,expanded);
    const base=(pose,context)=>pose.center.clone().addScaledVector(pose.right,-context.centerOffset.x).addScaledVector(pose.up,-context.centerOffset.y);assert.ok(base(opened,expanded).distanceTo(base(closed,home))<1e-9);
    assert.ok(expanded.items.filter(item=>item.action.startsWith('Comfort:game:')).every(item=>item.worldBox.x>.04));
    assert.ok(base(closed,home).distanceTo(new THREE.Vector3(.2,1,-.4))>.15,'dock is clear of the controller handle');
    assert.ok(Math.abs(opened.right.dot(opened.up))<1e-9);assert.ok(Math.abs(opened.normal.length()-1)<1e-9);
    const degenerate=welcomeWristPose(matrix,home,closed.normal);assert.ok(degenerate.right.length()>.99);paint.destroy();
});
test('triangular brush layout selects all five brushes without a circular hub',()=>{
    const {menu,paint}=setup();menu.act('paint-tools');assert.equal(menu.context().page,'input');assert.ok(menu.context().items.find(i=>i.action==='Comfort:tool:insect').disabled);menu.act('tool:paint');const context=menu.context(),choices=context.items.filter(item=>item.brushChoice);assert.equal(choices.length,5);assert.equal(context.items.some(item=>item.radial),false);
    for(const item of choices){assert.equal(wristButtonAt(context.items,item.x+item.width/2,item.y+item.height/2),item);menu.act(item.action.slice(8));assert.equal(paint.snapshot().brush,item.action.slice(14));}
    assert.equal(wristButtonAt(context.items,995,context.height-1),null);
    menu.act('paint-page:options');assert.ok(menu.context().items.some(item=>item.kind==='slider'));menu.setValue('paint-width',.016);assert.equal(paint.snapshot().width,.016);paint.destroy();
});
test('every expanded control stays within its surface and has an accessible name',()=>{
    const {menu,paint}=setup();for(const action of ['games','input','audio','adjust','tutorial','paint-tools','paint-page:colour','paint-page:options']){
        menu.act('home');menu.act(action);const context=menu.context();for(const item of context.items){assert.ok(item.ariaLabel);assert.ok(item.x>=0 && item.y>=0);assert.ok(item.x+item.width<=1000);assert.ok(item.y+item.height<=context.height);}
    }paint.destroy();
});
