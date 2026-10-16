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
        xrDisabledFrameSteps:new Set(),xrReportedFailurePhases:new Set(),xrFrameRetryAt:new Map(),xrPanelFrameFailures:new Map(),xrPanelRenderFailures:0,measureXrFrame:false,
        performance:{now:()=>now},recordArFailure:(error,phase)=>errors.push({error,phase}),
        reportDemoRenderFailure:()=>assert.fail('Transient error must not disable the XR panel')
    });
    vm.runInContext(source.slice(start,end),context);
    const draw=()=>{if(++attempts===1)throw Error('temporary UIKit draw failure');};
    assert.equal(context.runXrFrameStep('Control panel render',draw),false);
    assert.equal(errors.length,1);assert.equal(errors[0].phase,'Control panel render');
    now=499;assert.equal(context.runXrFrameStep('Control panel render',draw),false);assert.equal(attempts,1);
    now=500;assert.equal(context.runXrFrameStep('Control panel render',draw),true);
    assert.equal(context.xrDisabledFrameSteps.size,0);assert.equal(context.xrFrameRetryAt.size,0);assert.equal(context.xrPanelFrameFailures.size,0);
});

test('a repeat Control panel draw error backs off without blocking demo rendering',()=>{
    let now=0,reported=0;const context=vm.createContext({
        xrDisabledFrameSteps:new Set(),xrReportedFailurePhases:new Set(),xrFrameRetryAt:new Map(),xrPanelFrameFailures:new Map(),xrPanelRenderFailures:0,measureXrFrame:false,
        performance:{now:()=>now},recordArFailure:()=>{},reportDemoRenderFailure:()=>reported++
    });
    vm.runInContext(source.slice(start,end),context);
    const draw=()=>{throw Error('persistent draw failure');};
    context.runXrFrameStep('Control panel render',draw);
    now=501;context.runXrFrameStep('Control panel render',draw);
    assert.equal(reported,0);assert.equal(context.xrDisabledFrameSteps.has('Control panel render'),false);
    assert.equal(context.xrFrameRetryAt.get('Control panel render'),1501);
});

for(const phase of ['comfort options render','comfort options update'])test(`a transient ${phase} error retries without aborting tutorial presentation`,()=>{
    let now=0,attempts=0,fatal=0;const errors=[];const context=vm.createContext({
        xrDisabledFrameSteps:new Set(),xrReportedFailurePhases:new Set(),xrFrameRetryAt:new Map(),xrPanelFrameFailures:new Map(),xrPanelRenderFailures:0,measureXrFrame:false,xrRecoveryStatus:'ready',
        performance:{now:()=>now},recordArFailure:(error,name)=>errors.push({error,name}),reportDemoRenderFailure:()=>fatal++
    });
    vm.runInContext(source.slice(start,end),context);
    const operation=()=>{if(++attempts===1)throw Error('temporary comfort panel failure');};
    assert.equal(context.runXrFrameStep(phase,operation),false);assert.equal(errors.length,1);assert.equal(errors[0].name,phase);
    assert.equal(context.xrRecoveryStatus,'ready');assert.equal(context.xrDisabledFrameSteps.has(phase),false);
    now=500;assert.equal(context.runXrFrameStep(phase,operation),true);assert.equal(attempts,2);assert.equal(fatal,0);
});

test('a persistent comfort panel error stays isolated from the tutorial scene',()=>{
    let now=0,fatal=0;const context=vm.createContext({
        xrDisabledFrameSteps:new Set(),xrReportedFailurePhases:new Set(),xrFrameRetryAt:new Map(),xrPanelFrameFailures:new Map(),xrPanelRenderFailures:0,measureXrFrame:false,xrRecoveryStatus:'ready',
        performance:{now:()=>now},recordArFailure:()=>{},reportDemoRenderFailure:()=>fatal++
    });
    vm.runInContext(source.slice(start,end),context);
    const draw=()=>{throw Error('persistent comfort panel failure');};context.runXrFrameStep('comfort options render',draw);
    now=501;context.runXrFrameStep('comfort options render',draw);
    assert.equal(context.xrDisabledFrameSteps.has('comfort options render'),false);assert.equal(context.xrRecoveryStatus,'ready');assert.equal(fatal,0);
    assert.equal(context.xrFrameRetryAt.get('comfort options render'),1501);
});
