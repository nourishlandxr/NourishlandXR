import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestTutorialCapture,questTutorialCaptureEnabled,renderQuestTutorialReport,savedQuestTutorialReport,setQuestTutorialCaptureEnabled} from '../app/services/questTutorialCapture.js';

test('Quest capture keeps tutorial lessons separate and saves the report',()=>{
    const original={location:Object.getOwnPropertyDescriptor(globalThis,'location'),navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator'),localStorage:Object.getOwnPropertyDescriptor(globalThis,'localStorage')};
    const saved=new Map();
    Object.defineProperty(globalThis,'location',{configurable:true,value:{search:'?questPerf=1'}});
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Quest test'}});
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>saved.get(key) || null,setItem:(key,value)=>saved.set(key,value)}});
    try{
        const capture=createQuestTutorialCapture({frameRate:72});
        capture.step('welcome practice render',3);
        capture.frame(1000,'controls-orb-grab',8,{rendererRebuilds:1,renderer:{sourceMeshes:10,instanceBatches:2}});
        capture.step('welcome practice render',4);
        capture.frame(1014,'controls-orb-grab',9,{rendererRebuilds:2,renderer:{sourceMeshes:15,instanceBatches:3}});
        capture.step('welcome practice render',7);
        capture.frame(1028,'fruit',12,{rendererRebuilds:3,renderer:{sourceMeshes:20,instanceBatches:4}});
        capture.frame(11100,'fruit',12,{rendererRebuilds:3,renderer:{sourceMeshes:20,instanceBatches:4}});
        const report=JSON.parse(capture.report());
        assert.equal(report.lessons.length,2);
        assert.equal(report.lessons[0].lesson,'controls-orb-grab');
        assert.equal(report.lessons[0].rendererRebuilds,1);
        assert.equal(report.lessons[0].topCpuSteps[0][0],'welcome practice render');
        assert.equal(report.lessons[1].lesson,'fruit');
        assert.equal(report.lessons[1].sourceMeshes,20);
        assert.equal(JSON.parse(savedQuestTutorialReport()).lessons[0].lesson,'controls-orb-grab');
    }finally{
        for(const [key,descriptor] of Object.entries(original)){
            if(descriptor)Object.defineProperty(globalThis,key,descriptor);
            else delete globalThis[key];
        }
    }
});

test('saved Quest report can be reopened after the XR session has ended',()=>{
    const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
    const saved='{"kind":"Quest tutorial performance","visibleFrames":300}';
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>key==='nourishland-xr-quest-tutorial-capture'?saved:null}});
    try{
        const nodes={
            '[data-report-status]':{textContent:''},
            '[data-report-copy]':{addEventListener(){}},
            textarea:{value:'',hidden:false},
            '[data-report-back]':{addEventListener(){}}
        };
        const root={innerHTML:'',querySelector:selector=>nodes[selector]};
        renderQuestTutorialReport(root);
        assert.equal(nodes.textarea.value,saved);
        assert.match(nodes['[data-report-status]'].textContent,/ready/);
        assert.match(root.innerHTML,/Quest performance report/);
    }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});

test('persistent performance switch arms capture without a query or headset detection',()=>{
    const original={location:Object.getOwnPropertyDescriptor(globalThis,'location'),navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator'),localStorage:Object.getOwnPropertyDescriptor(globalThis,'localStorage')};
    const values=new Map();
    Object.defineProperty(globalThis,'location',{configurable:true,value:{search:''}});
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Generic XR browser'}});
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>values.get(key) || null,setItem:(key,value)=>values.set(key,value)}});
    try{
        assert.equal(questTutorialCaptureEnabled(),false);
        assert.equal(setQuestTutorialCaptureEnabled(true),true);
        assert.equal(questTutorialCaptureEnabled(),true);
        assert.ok(createQuestTutorialCapture({frameRate:72}));
        assert.equal(setQuestTutorialCaptureEnabled(false),false);
        assert.equal(createQuestTutorialCapture({frameRate:72}),null);
    }finally{for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
