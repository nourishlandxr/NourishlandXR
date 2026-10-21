import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { welcomeWristPose } from '../app/services/welcomeWristMenu.js';

test('Creator reserves left wrist for general settings and right wrist for the changing task; phones create neither',()=>{
    const contexts=[],panels=[],ownership=[],handActivations=[];
    const scope={createPimInfoPanel:options=>{const index=panels.length,panel={element:{classList:{add(){},toggle(){}}},setComfortContext:value=>contexts[index]=value,update(){},draw(){},bindSession(){},destroy(){},hit(){return null;},isHandInteracting(){return false;},activateHand(){handActivations.push(index);return true;}};ownership.push(options.inputOccupied);panels.push(panel);return panel;}};
    vm.createContext(scope);const source=fs.readFileSync(new URL('../app/services/runtimeWristMenu.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('export function','function');vm.runInContext(source,scope);
    assert.equal(scope.createCreatorWristMenus({headset:false}),null);assert.equal(scope.createCreatorWristMenus({headset:true,phoneAR:true}),null);assert.equal(panels.length,0);
    let task=[{id:'place',label:'Place Orb',icon:'check'}];const menu=scope.createCreatorWristMenus({headset:true,generalActions:()=>[{id:'controllers',label:'Controller selection',icon:'controller'}],contextActions:()=>task});
    assert.equal(contexts[0].anchorHand,'left');assert.equal(contexts[1].anchorHand,'right');
    assert.equal(ownership[0]({handedness:'left'}),true);assert.equal(ownership[0]({handedness:'right'}),false);
    assert.equal(ownership[1]({handedness:'right'}),true);assert.equal(ownership[1]({handedness:'left'}),false);
    menu.panel.activateHand(null,{handedness:'left'},{});menu.panel.activateHand(null,{handedness:'right'},{});assert.deepEqual(handActivations,[1,0]);
    contexts[0].onAction('toggle');contexts[1].onAction('toggle');
    assert(contexts[0].items.some(item=>item.action==='Comfort:controllers'));assert(contexts[1].items.some(item=>item.action==='Comfort:place'));
    task=[{id:'save',label:'Save PIMO edit',icon:'check'}];menu.sync();assert(contexts[1].items.some(item=>item.action==='Comfort:save'));assert(!contexts[0].items.some(item=>item.action==='Comfort:save'));
    const left={handedness:'left',gamepad:{buttons:[{},{},{},{pressed:false}]}},right={handedness:'right',gamepad:{buttons:[{},{},{},{pressed:false}]}};menu.bindSession({inputSources:[left,right]},{});menu.update(null,0,null,null);left.gamepad.buttons[3].pressed=true;menu.update(null,1,null,null);assert.equal(contexts[0].opened,false);assert.equal(contexts[1].opened,true);menu.destroy();
});

test('controller-mounted right wrist mirrors the left mounting offset without changing hand tracking offsets',()=>{
    const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,1,0,1],base={width:.08,height:1000,controllerMounted:true};
    const left=welcomeWristPose(matrix,{...base,anchorHand:'left'}),right=welcomeWristPose(matrix,{...base,anchorHand:'right'});
    assert(Math.abs(left.center.x+right.center.x)<1e-6);assert(Math.abs(left.center.x)>.1);
    assert.equal(welcomeWristPose(matrix,{...base,controllerMounted:false,anchorHand:'left'}).center.x,welcomeWristPose(matrix,{...base,controllerMounted:false,anchorHand:'right'}).center.x);
});

test('shared wrist renders reachable dock controls and requires a fresh, unoccupied right stick click',()=>{
    let context,disposed=false,blocked=false;const actions=[];
    const panel={element:{classList:{add(){},toggle(){}}},setComfortContext:value=>{context=value;},update(){},draw(){},bindSession(){},destroy(){disposed=true;}};
    const scope={createPimInfoPanel:()=>panel};vm.createContext(scope);
    const source=fs.readFileSync(new URL('../app/services/runtimeWristMenu.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('export function','function');vm.runInContext(source,scope);
    const menu=scope.createRuntimeWristMenu({actions:()=>[{id:'map-area',label:'Map Orb area',icon:'area'}],onAction:id=>actions.push(id),blocked:()=>blocked});
    assert.equal(context.opened,false);assert.equal(context.items[0].dock,true,'collapsed DOM control must be in the visible dock');
    const sourceInput={handedness:'right',gamepad:{buttons:[{},{},{},{pressed:true}]}};menu.bindSession({inputSources:[sourceInput]},{});
    menu.update(null,0,null,null);assert.equal(context.opened,false,'already-held click on entry does not open');
    sourceInput.gamepad.buttons[3].pressed=false;menu.update(null,1,null,null);
    sourceInput.gamepad.buttons[3].pressed=true;menu.update(null,2,null,null);assert.equal(context.opened,true);
    menu.update(null,3,null,null);assert.equal(context.opened,true,'held click does not oscillate');
    for(const item of context.items){assert.ok(item.dock);assert.ok(item.ariaLabel);assert.ok(item.x>=0&&item.y>=0&&item.x+item.width<=1000&&item.y+item.height<=context.height);}
    context.onAction('map-area');assert.deepEqual(actions,['map-area']);
    sourceInput.gamepad.buttons[3].pressed=false;menu.update(null,4,null,null);blocked=true;
    sourceInput.gamepad.buttons[3].pressed=true;menu.update(null,5,null,null);assert.equal(context.opened,true,'object ownership blocks the menu shortcut');
    menu.destroy();assert.equal(disposed,true);
});
