import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createChecklist, validateChecklist, parseChecklist } from '../app/services/checklistContract.js';
import { CHECKLIST_LIBRARY_KEY, CHECKLIST_PROGRESS_KEY, saveChecklist, readChecklists, importChecklist, exportChecklist, checklistProgress, setChecklistStep } from '../app/services/checklistStore.js';
import { renderWebxrDemoEntry } from '../app/screens/webxrDemoEntry.js';

const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const example=()=>createChecklist({projectId:'test-garden',title:'Observe the garden',description:'Personal practice',activities:['Look for regeneration','Observe light reaching the ground']});

test('portable checklist round-trips desktop to Field with the same project, experience and steps',()=>{
    const desktop=storage(),field=storage(),experience=example();saveChecklist(experience,desktop);
    const imported=importChecklist(exportChecklist(readChecklists(desktop)[0]),field);
    assert.deepEqual(imported,experience);
    assert.equal(imported.publication,'personal-draft');
    assert.ok(imported.steps.every(step=>step.requiredCapabilities.length===0&&step.completion.type==='self-report'));
    assert.deepEqual(importChecklist(exportChecklist(experience),field),experience);
    assert.equal(readChecklists(field).length,1);
});

test('checklist completion is persistent, reversible, idempotent and can occur in any order',()=>{
    const local=storage(),experience=example(),[first,second]=experience.steps;
    setChecklistStep(experience,second.id,true,local);
    assert.deepEqual(checklistProgress(experience,local),[second.id]);
    setChecklistStep(experience,second.id,true,local);
    assert.equal(checklistProgress(experience,local).length,1);
    setChecklistStep(experience,first.id,true,local);
    assert.equal(checklistProgress(experience,local).length,2);
    setChecklistStep(experience,second.id,false,local);
    assert.deepEqual(checklistProgress(experience,local),[first.id]);
    assert.throws(()=>setChecklistStep(experience,'unknown',true,local),/Unknown/);
});

test('project and revision boundaries prevent progress leaking to another experience',()=>{
    const local=storage(),experience=example();setChecklistStep(experience,experience.steps[0].id,true,local);
    assert.deepEqual(checklistProgress({...experience,projectId:'other-project'},local),[]);
    assert.deepEqual(checklistProgress({...experience,revision:2},local),[]);
    assert.deepEqual(checklistProgress({...experience,id:'other-experience'},local),[]);
});

test('newer revisions cannot be overwritten by stale or conflicting imported data',()=>{
    const local=storage(),experience=example();saveChecklist(experience,local);
    assert.throws(()=>saveChecklist({...experience,title:'Conflicting title'},local),/conflicts/);
    saveChecklist({...experience,revision:2,title:'Updated title'},local);
    assert.throws(()=>saveChecklist(experience,local),/older/);
    assert.equal(readChecklists(local)[0].title,'Updated title');
    const reordered=Object.fromEntries(Object.entries(readChecklists(local)[0]).reverse());
    saveChecklist(reordered,local);assert.equal(readChecklists(local).length,1);
});

test('contracts reject malformed IDs, references, unsupported capabilities/publication and empty activities',()=>{
    const valid=example();
    const invalid=[
        {...valid,schemaVersion:2}, {...valid,publication:'public'}, {...valid,projectId:'../other'},
        {...valid,title:' '}, {...valid,steps:[]}, {...valid,steps:[valid.steps[0],valid.steps[0]]},
        {...valid,scope:{siteId:'',areaId:'area'}}, {...valid,extra:'unknown'},
        {...valid,steps:[{...valid.steps[0],instructions:' '}]},
        {...valid,steps:[{...valid.steps[0],requiredCapabilities:['webxr']}]},
        {...valid,steps:[{...valid.steps[0],completion:{type:'gps'}}]},
        {...valid,steps:[{...valid.steps[0],contentRefs:[{type:'knowledge',id:'javascript:alert(1)'}]}]}
    ];
    for(const value of invalid)assert.throws(()=>validateChecklist(value));
    assert.throws(()=>parseChecklist('invalid JSON'),/valid JSON/);
    assert.throws(()=>parseChecklist('x'.repeat(256*1024+1)),/256 KB/);
    assert.throws(()=>createChecklist({projectId:'p',title:'t',activities:Array(41).fill('Activity')}),/1 and 40/);
});

test('corrupt stores and quota failures preserve earlier library and progress data',()=>{
    const local=storage(),experience=example();saveChecklist(experience,local);setChecklistStep(experience,experience.steps[0].id,true,local);
    const library=local.getItem(CHECKLIST_LIBRARY_KEY),progress=local.getItem(CHECKLIST_PROGRESS_KEY);
    const full={...local,setItem(){throw Error('Quota exceeded');}};
    assert.throws(()=>saveChecklist(example(),full),/Quota/);
    assert.throws(()=>setChecklistStep(experience,experience.steps[1].id,true,full),/Quota/);
    assert.equal(local.getItem(CHECKLIST_LIBRARY_KEY),library);assert.equal(local.getItem(CHECKLIST_PROGRESS_KEY),progress);
    local.setItem(CHECKLIST_LIBRARY_KEY,'broken');
    assert.throws(()=>saveChecklist(example(),local),/preserved/);assert.equal(local.getItem(CHECKLIST_LIBRARY_KEY),'broken');
    local.setItem(CHECKLIST_PROGRESS_KEY,'{"schemaVersion":1,"progress":[{}]}');
    assert.throws(()=>setChecklistStep(experience,experience.steps[1].id,true,local),/preserved/);
    assert.equal(local.getItem(CHECKLIST_PROGRESS_KEY),'{"schemaVersion":1,"progress":[{}]}');
});

test('direct demo entry waits for a browser action, starts once and allows retry on failure',async()=>{
    const handlers={},button={disabled:false,isConnected:true,addEventListener:(event,handler)=>{handlers.start=handler;}},status={textContent:''};
    const app={innerHTML:'',querySelector:selector=>selector==='[data-webxr-start]'?button:selector==='[data-webxr-status]'?status:{addEventListener:(event,handler)=>{handlers.home=handler;}}};
    const previous=globalThis.document;globalThis.document={body:{dataset:{}}};let started=0,home=0;
    try {
        renderWebxrDemoEntry(app,{onStart:()=>{started++;return Promise.reject(Error('XR unavailable'));},onHome:()=>home++});
        assert.equal(started,0);assert.match(app.innerHTML,/Start the introduction/);
        handlers.start();handlers.start();assert.equal(started,1);assert.equal(button.disabled,true);
        await Promise.resolve();await Promise.resolve();assert.equal(button.disabled,false);assert.match(status.textContent,/XR unavailable/);
        handlers.start();assert.equal(started,2);await Promise.resolve();handlers.home();assert.equal(home,1);
    }finally{globalThis.document=previous;}
    const main=fs.readFileSync(new URL('../app/main.js',import.meta.url),'utf8');
    assert.ok(main.indexOf("params.get('experience') === 'webxr-demo'")<main.indexOf("const rememberedView ="));
});
