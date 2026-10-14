import test from 'node:test';import assert from 'node:assert/strict';import {createWelcomeControlWarmup} from '../app/services/welcomeControlWarmup.js';
test('warm-up requires fresh clicks from both controllers and full thumbstick circles',()=>{const w=createWelcomeControlWarmup();const left={handedness:'left',gamepad:{axes:[0,0,0,0]}},right={handedness:'right',gamepad:{axes:[0,0,0,0]}};const inputs=(trigger=false,down=false)=>[left,right].map(source=>({source,trigger,down}));assert.equal(w.update('controls-trigger',inputs(true)),false,'held trigger on entry is not a new click');w.update('controls-trigger',inputs());assert.equal(w.update('controls-trigger',[{source:left,trigger:true},{source:right,trigger:false}]),false);assert.equal(w.update('controls-trigger',inputs(true)),true);assert.equal(w.update('controls-grip',inputs(false,true)),false);w.update('controls-grip',inputs());assert.equal(w.update('controls-grip',inputs(false,true)),true);for(const [x,y]of [[.8,.8],[-.8,.8],[-.8,-.8]]){left.gamepad.axes=[0,0,x,y];right.gamepad.axes=[0,0,x,y];assert.equal(w.update('controls-stick',inputs()),false);}left.gamepad.axes=[0,0,.8,-.8];assert.equal(w.update('controls-stick',inputs()),false,'one controller circle is not enough');right.gamepad.axes=[0,0,.8,-.8];assert.equal(w.update('controls-stick',inputs()),false);for(const [x,y]of [[.8,.8],[-.8,.8],[-.8,-.8],[.8,-.8]]){left.gamepad.axes=[0,0,x,y];w.update('controls-stick',inputs());}assert.equal(w.update('controls-stick',inputs()),true);w.reset();assert.equal(w.update('controls-trigger',[{source:{handedness:'left',hand:{}},trigger:true}]),false);});

test('stick clicks and both face-button sequences require fresh presses on both hands and emit haptics once per accepted press',()=>{
 const hits=[],w=createWelcomeControlWarmup({onPress:source=>hits.push(source.handedness)}),left={handedness:'left',gamepad:{buttons:Array.from({length:6},()=>({pressed:false}))}},right={handedness:'right',gamepad:{buttons:Array.from({length:6},()=>({pressed:false}))}},inputs=[left,right].map(source=>({source}));
 for(const [phase,index] of [['controls-stick-click',3],['controls-face-first',4],['controls-face-second',5]]){
  for(const source of [left,right])for(const button of source.gamepad.buttons)button.pressed=false;
  left.gamepad.buttons[index].pressed=right.gamepad.buttons[index].pressed=true;assert.equal(w.update(phase,inputs),false);
  left.gamepad.buttons[index].pressed=right.gamepad.buttons[index].pressed=false;w.update(phase,inputs);
  left.gamepad.buttons[index].pressed=true;assert.equal(w.update(phase,inputs),false);
  right.gamepad.buttons[index].pressed=true;assert.equal(w.update(phase,inputs),true);w.update(phase,inputs);
 }
 assert.deepEqual(hits,['left','right','left','right','left','right']);
});

test('pressing all face buttons cannot complete or carry a chord into the next lesson',()=>{
 const w=createWelcomeControlWarmup(),inputs=['left','right'].map(handedness=>({source:{handedness,gamepad:{buttons:Array.from({length:6},()=>({pressed:false}))}}}));
 w.update('controls-face-first',inputs);for(const i of inputs)i.source.gamepad.buttons[4].pressed=i.source.gamepad.buttons[5].pressed=true;
 assert.equal(w.update('controls-face-first',inputs),false);assert.deepEqual(w.snapshot().completed,[]);
 for(const i of inputs)i.source.gamepad.buttons[5].pressed=false;assert.equal(w.update('controls-face-first',inputs),false,'must release and press the requested button');
 for(const i of inputs)i.source.gamepad.buttons[4].pressed=false;w.update('controls-face-first',inputs);
 for(const i of inputs)i.source.gamepad.buttons[4].pressed=true;assert.equal(w.update('controls-face-first',inputs),true);
});
