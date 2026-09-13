import test from 'node:test';
import assert from 'node:assert/strict';
import {createLimActivationController,LIM_ACTIVATION_MS} from '../app/services/limActivation.js';

test('LIM short press cancels without activation', () => {
    const completed=[];let progress=[];
    const hold=createLimActivationController({onComplete:key=>completed.push(key),onProgress:(key,value)=>progress.push([key,value])});
    assert.equal(hold.start('lim-climate',1000),true);
    hold.tick('lim-climate',1200);
    assert.equal(hold.end('lim-climate',1300),false);
    assert.equal(completed.length,0);
    assert.equal(hold.active,false);
    assert.equal(hold.progress,0);
    assert.deepEqual(progress.at(-1),['lim-climate',0]);
});

test('LIM continuous hold completes once at 500 ms and suppresses its synthetic click', () => {
    const completed=[];const hold=createLimActivationController({onComplete:key=>completed.push(key)});
    assert.equal(hold.start('lim-food-forest',0),true);
    assert.equal(hold.tick('lim-food-forest',LIM_ACTIVATION_MS-1),false);
    assert.equal(hold.tick('lim-food-forest',LIM_ACTIVATION_MS),true);
    assert.deepEqual(completed,['lim-food-forest']);
    assert.equal(hold.tick('lim-food-forest',LIM_ACTIVATION_MS+20),false);
    assert.equal(hold.consumeSyntheticClick('lim-food-forest',LIM_ACTIVATION_MS+20),true);
    assert.equal(hold.consumeSyntheticClick('lim-food-forest',LIM_ACTIVATION_MS+600),false);
});

test('starting another LIM cell cancels the first and transfers activation', () => {
    const cancelled=[];const completed=[];
    const hold=createLimActivationController({onCancel:(key,reason)=>cancelled.push([key,reason]),onComplete:key=>completed.push(key)});
    hold.start('lim-plant',0);hold.tick('lim-plant',180);
    hold.start('lim-pin',200);hold.tick('lim-pin',699);
    assert.equal(completed.length,0);
    assert.deepEqual(cancelled,[['lim-plant','replaced']]);
    assert.equal(hold.tick('lim-pin',700),true);
    assert.deepEqual(completed,['lim-pin']);
});

test('keyboard-style activation completes immediately without a timed hold', () => {
    const completed=[];const hold=createLimActivationController({onComplete:key=>completed.push(key)});
    assert.equal(hold.activateNow('lim-climate',42,'keyboard'),true);
    assert.deepEqual(completed,['lim-climate']);
    assert.equal(hold.progress,1);
});
