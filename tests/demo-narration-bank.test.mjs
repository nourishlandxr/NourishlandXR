import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DEMO_NARRATION_BANK as bank} from '../app/services/demoNarrationBank.js';
import {DEMO_GUIDED_STEPS} from '../app/features/ar-demo/demoJourneyContent.js';
import {normalizeNarrationText,projectNarrationSegments} from '../app/services/projectNarration.js';
import {demoNarrationContent} from '../tools/demo-narration-content.mjs';

test('every authored main-demo paragraph has a complete saved friendly Marin recording',()=>{
    assert.equal(bank?.voice,'marin');
    assert.equal(bank.provider,'OpenAI');
    const expected=new Set(DEMO_GUIDED_STEPS.flatMap(step=>step.main.split(/\n\n+/).map(normalizeNarrationText)));
    const source=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const start=source.indexOf('function showDemoFruitDiscovery('),end=source.indexOf('function showDemoPanelIntroduction(',start);
    const bodies=[...source.slice(start,end).matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(match=>match[1].replaceAll('\\n','\n'));
    for(const prefix of ['Look closely at the plant','PIMO is now closed']){const text=bodies.find(body=>body.startsWith(prefix));assert.ok(text);for(const paragraph of text.split(/\n\n+/))expected.add(normalizeNarrationText(paragraph));}
    for(const text of demoNarrationContent())expected.add(text);
    assert.ok(Object.keys(bank.catalog).length>=expected.size);
    for(const text of expected){
        const segments=projectNarrationSegments(text,{demo:true});
        assert.equal(segments.length,1,text);
        assert.equal(segments[0].recorded,true,text);
        const id=segments[0].id;
        assert.equal(bank.catalog[id].spoken,text,'Recording input must exactly match the displayed paragraph');
        assert.ok(bank.clips.includes(id));
        const bytes=fs.readFileSync(new URL('../app/'+bank.base+bank.catalog[id].file,import.meta.url));
        assert.ok(bytes.length>1000,id);
        assert.ok(bytes.subarray(0,3).toString()==='ID3' || bytes[0]===0xff,id+' MP3 header');
    }
});

test('extra demo guidance uses live speech instead of old Ava recordings',()=>{
    const extra='This unique demo guidance has no saved recording yet.';
    assert.deepEqual(projectNarrationSegments(extra,{demo:true}),[{id:'project-guidance',spoken:extra,spokenOverride:true}]);
    const source=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    assert.match(source,/demoProjectVoice=createProjectNarration\(\{demo:true/);
});

test('every demo paragraph flow speaks its visible copy without an alternate authored summary',()=>{
 const source=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
 const calls=[...source.matchAll(/createDemoVoiceTextFlow\(\{([^\n]+)/g)];assert.ok(calls.length>=5);
 for(const call of calls)assert.match(call[1],/^completeNarration:true,/);
 assert.doesNotMatch(source,/spokenSummary:/);
});
