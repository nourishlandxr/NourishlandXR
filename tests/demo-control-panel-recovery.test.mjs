import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
const start=source.indexOf('function runXrFrameStep(');
const end=source.indexOf('function beginXrFirstContentWatchdog(',start);

test('a transient Control panel draw error records its stack and retries without disabling the panel',()=>{
    let now=0,attempts=0;const errors=[];
    const context=vm.createContext({
        xrDisabledFrameSteps:new Set(),xrFrameRetryAt:new Map(),measureXrFrame:false,
        performance:{now:()=>now},recordArFailure:(error,phase)=>errors.push({error,phase}),
        reportDemoRenderFailure:()=>assert.fail('Transient error must not disable the XR panel')
    });
    vm.runInContext(source.slice(start,end),context);
    const draw=()=>{if(++attempts===1)throw Error('temporary UIKit draw failure');};
    assert.equal(context.runXrFrameStep('Control panel render',draw),false);
    assert.equal(errors.length,1);assert.equal(errors[0].phase,'Control panel render');
    now=999;assert.equal(context.runXrFrameStep('Control panel render',draw),false);assert.equal(attempts,1);
    now=1000;assert.equal(context.runXrFrameStep('Control panel render',draw),true);
    assert.equal(context.xrDisabledFrameSteps.size,0);assert.equal(context.xrFrameRetryAt.size,0);
});

test('a repeat Control panel draw error still enters the existing recovery path',()=>{
    let now=0,reported=0;const context=vm.createContext({
        xrDisabledFrameSteps:new Set(),xrFrameRetryAt:new Map(),measureXrFrame:false,
        performance:{now:()=>now},recordArFailure:()=>{},reportDemoRenderFailure:()=>reported++
    });
    vm.runInContext(source.slice(start,end),context);
    const draw=()=>{throw Error('persistent draw failure');};
    context.runXrFrameStep('Control panel render',draw);
    now=1001;context.runXrFrameStep('Control panel render',draw);
    assert.equal(reported,1);assert.equal(context.xrDisabledFrameSteps.has('Control panel render'),true);
});
