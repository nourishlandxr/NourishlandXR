import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';
import {createWelcomeComfortOptions} from '../app/services/welcomeComfortOptions.js';
import {wristButtonAt,welcomeWristPose} from '../app/services/welcomeWristMenu.js';
import {createSpatialPaintV2} from '../app/services/spatialPaintV2.js';

function setup(){
    const paint=createSpatialPaintV2({markings:true}),trials={active:null,mode:'controllers',paint,open(id){this.active=id;},close(){this.active=null;},command(){}};
    const stage={trials,paint,snapshot:()=>({phase:'brush',voice:{},trials:{active:trials.active},inputMode:'controllers'}),setInputMode(mode){trials.mode=mode;},button(){}};
    return {menu:createWelcomeComfortOptions({stage}),paint};
}
test('six 34mm icon targets make a compact forearm dock; tools open beside its fixed position',()=>{
    const {menu,paint}=setup(),home=menu.context();assert.equal(home.items.length,6);assert.equal(home.width,.12);
    for(const item of home.items){assert.ok(item.ariaLabel);assert.equal(item.text,undefined);assert.ok(Math.abs(item.width*home.width/1000-.034)<1e-9);}
    const matrix=new THREE.Matrix4().makeRotationY(.65).setPosition(.2,1,-.4).elements,closed=welcomeWristPose(matrix,home);menu.act('games');const opened=welcomeWristPose(matrix,menu.context());
    const expandedDock=opened.center.clone().addScaledVector(opened.right,-.08);assert.ok(expandedDock.distanceTo(closed.center)<1e-9);
    assert.ok(Math.abs(opened.right.dot(opened.up))<1e-9);assert.ok(Math.abs(opened.normal.length()-1)<1e-9);
    const degenerate=welcomeWristPose(matrix,home,closed.normal);assert.ok(degenerate.right.length()>.99);paint.destroy();
});
test('radial brush hit testing selects all five brushes and ignores the empty hub and corners',()=>{
    const {menu,paint}=setup();menu.act('paint-tools');const context=menu.context(),wedges=context.items.filter(item=>item.radial);assert.equal(wedges.length,8);
    for(const item of wedges){const r=item.radial,a=(r.start+r.end)/2,x=r.x+175*Math.cos(a),y=r.y+175*Math.sin(a);assert.equal(wristButtonAt(context.items,x,y),item);if(item.action.startsWith('Comfort:brush:')){menu.act(item.action.slice(8));assert.equal(paint.snapshot().brush,item.action.slice(14));}}
    assert.equal(wristButtonAt(context.items,735,355),null);assert.equal(wristButtonAt(context.items,985,605),null);
    menu.act('paint-page:options');assert.ok(menu.context().items.some(item=>item.kind==='slider'));menu.setValue('paint-width',.016);assert.equal(paint.snapshot().width,.016);paint.destroy();
});
test('every expanded control stays within its surface and has an accessible name',()=>{
    const {menu,paint}=setup();for(const action of ['games','input','audio','adjust','tutorial','paint-tools','paint-page:colour','paint-page:options']){
        menu.act('home');menu.act(action);const context=menu.context();for(const item of context.items){assert.ok(item.ariaLabel);assert.ok(item.x>=0 && item.y>=0);assert.ok(item.x+item.width<=1000);assert.ok(item.y+item.height<=context.height);}
    }paint.destroy();
});
