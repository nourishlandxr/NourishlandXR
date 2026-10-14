import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fieldShellMarkup, fieldLauncherMarkup } from '../app/services/fieldShell.js';

test('Field chrome has a tool dock and accessible icon settings rather than the Desktop navigation',()=>{
    const markup=fieldShellMarkup({version:'test',target:'development'});
    assert.match(markup,/aria-label="Field dock"/);
    assert.match(markup,/aria-label="App settings"/);
    assert.match(markup,/aria-label="Close settings"/);
    assert.match(markup,/<dialog/);
    assert.doesNotMatch(markup,/class="platform-nav"|Create &amp; manage|WebXR introduction/);
    for(const view of ['home','discover','checklists','journal'])assert.match(markup,new RegExp(`data-view="${view}"`));
    assert.match(markup,/Vtest · Local preview/);
});

test('launcher exposes working local tools and marks cross-application links separately',()=>{
    const markup=fieldLauncherMarkup({studioUrl:'https://test/index.html?creator=1',contentUrl:'https://test/platform.html',xrUrl:'https://test/index.html?experience=webxr-demo'});
    for(const tool of ['Discover','Checklists','Journal'])assert.match(markup,new RegExp(`aria-label="Open ${tool}"`));
    for(const tool of ['Studio','Content','WebXR'])assert.match(markup,new RegExp(`aria-label="Open ${tool} separately"`));
    assert.match(markup,/experience=webxr-demo/);
    assert.doesNotMatch(markup,/disabled|Coming soon|Camera|GPS|Survey/);
});

test('Field starts offline on its launcher without requesting the API and Home protects unsaved observations',async()=>{
    const nodes=new Map();
    const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:'',setAttribute(){},querySelector:node,append(){},showModal(){},close(){}});return nodes.get(selector);};
    const handlers={};let calls=0;
    const app={innerHTML:'',querySelector:node,querySelectorAll:()=>[],contains:()=>true,addEventListener:(type,handler)=>{handlers[type]=handler;}};
    const source=fs.readFileSync(new URL('../app/services/platformApplication.js',import.meta.url),'utf8')
        .replace(/^import .*;\r?\n/gm,'').replace('export async function','async function').replaceAll('import.meta.url',"'https://test/app/services/platformApplication.js'");
    const context={API_BASE:'/api',BUILD_INFO:{version:'test',target:'development'},fieldShellMarkup,fieldLauncherMarkup,
        dashboardIcon:()=>'<svg/>',createPublicContentClient:()=>({projects:async()=>{calls++;return[];}}),
        readJournal:()=>[],saveJournalDraft(){},journalExport(){},renderChecklistWorkspace(){},
        location:{search:'',href:'https://test/app/field/index.html'},navigator:{onLine:false},
        document:{getElementById:()=>app,body:{dataset:{}},querySelector:()=>null},
        window:{addEventListener(){},scrollTo(){}},history:{replaceState(){}},URL,URLSearchParams,AbortController};
    await vm.runInNewContext(`${source}\nrenderPlatformApplication({mode:'field'});`,context);
    assert.equal(calls,0);assert.match(node('[data-content]').innerHTML,/field-launcher/);
    const click=view=>handlers.click({target:{closest:()=>({dataset:{view}})}});
    click('journal');assert.match(node('[data-content]').innerHTML,/data-journal/);
    const form=node('[data-content]').innerHTML;node('textarea').value='Unsaved field observation';click('home');
    assert.equal(node('[data-content]').innerHTML,form);assert.match(node('[data-status]').textContent,/Save your observation/);
    node('textarea').value='';click('home');assert.match(node('[data-content]').innerHTML,/field-launcher/);assert.equal(calls,0);
});
