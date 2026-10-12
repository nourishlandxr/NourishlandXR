import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createZinniaPlantDiscovery,applyDiscoveredPlant} from '../app/services/zinniaPlantDiscovery.js';
import {clearDaleysPlantSearchCache} from '../app/services/daleysPlantSearch.js';
import {resolvePlantPim} from '../app/services/pimLegacyAdapter.js';
import {createDemoVoiceTextFlow} from '../app/services/demoVoiceTextFlow.js';

test('confirming the second Orb preserves Frame narration and Continue reaches the Note',async()=>{
    const saved=Object.fromEntries(['document','fetch','Image','AudioContext','webkitAudioContext'].map(key=>[key,globalThis[key]]));
    globalThis.document=new EventTarget();globalThis.AudioContext=globalThis.webkitAudioContext=undefined;
    globalThis.Image=class {set src(value){if(value)queueMicrotask(()=>this.onload?.());}};
    globalThis.fetch=async url=>{assert.match(String(url),/plant-search\/daleys/);return {ok:true,json:async()=>({results:[{source:'daleys',externalId:'daleys-lime',commonName:'Finger Lime',scientificName:'Citrus australasica',thumbnailUrl:'https://example.test/lime.jpg',sourceUrl:'https://example.test/lime',description:'A citrus plant.'}]})};};
    clearDaleysPlantSearchCache();
    const orb={id:'second',demoType:'plant',tutorialStage:'plant2',demoNativeChoicePending:true,anchor:{x:1,y:2,z:3}};
    let narration,timer,flow,discovery,cleaned=false,continued=false,nextStage;
    const voice={speak(text,callbacks){narration=callbacks;},stop(){narration=null;}};
    const source=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const scope=vm.createContext({markers:[orb],applyDiscoveredPlant,resolvePlantPim,
        clearDemoZinniaDiscovery(){discovery.destroy();cleaned=true;},arWelcomeLayer:null,appRoot:null,
        knowledgeRenderer:{clear(){}},refreshDemoRecord(){},updateSimulatedMarkers(){},syncDemoVoiceBar(){},
        toggleDemoPlantProfile(){flow=createDemoVoiceTextFlow({paragraphs:['Explore your chosen plant, or continue to add a Note.'],voice,readingTime:()=>1000,setTimer:callback=>{timer=callback;return 1;},clearTimer(){},onComplete:()=>continued=true});flow.start();},
        infoPanel:{focusPlant(){},setMediaCollapsed(){},hideFruitWindow(){},clearPlant(){},setTaskProgress(){},refreshExplorer(){}},
        demoHiddenElements:new Set(),knowledgeExplorerAction(){},refreshDemoPimProfile(){},clearLimSelection(){},finishIntroBoard(){},showDemoAction:stage=>nextStage=stage});
    vm.runInContext(source.slice(source.indexOf('function selectDemoNativePlant('),source.indexOf('function demoFramePlantChoiceHit('))+source.slice(source.indexOf('function continueAfterDemoPim('),source.indexOf('const DEMO_FRUIT_EXAMPLES=')),scope);
    discovery=createZinniaPlantDiscovery({onSpeak:()=>voice.stop(),onReady:profile=>scope.selectDemoNativePlant({demoNativeChooserFor:'second'},profile)});
    try{
        await discovery.search('finger lime');discovery.select(0);await discovery.confirm();
        assert.equal(orb.demoNativeChoicePending,false);assert.equal(orb.demoNativeChoice,'daleys-lime');
        assert.deepEqual(orb.anchor,{x:1,y:2,z:3});assert.equal(cleaned,true);
        assert.ok(narration,'confirmation must not cancel the new Frame speech');assert.equal(flow.snapshot().paused,false);
        narration.onComplete();timer();assert.equal(continued,true);
        assert.equal(scope.continueAfterDemoPim(orb),true);assert.equal(nextStage,'note');assert.equal(orb.demoProfileInteracted,true);
    }finally{flow?.cancel();discovery.destroy();clearDaleysPlantSearchCache();for(const [key,value]of Object.entries(saved))globalThis[key]=value;}
});

test('saving a hosted Note leaves the next placement narration in control',async()=>{
    const savedDocument=globalThis.document,savedContext=globalThis.AudioContext;
    globalThis.document=new EventTarget();globalThis.AudioContext=undefined;
    let placementActive=false,cancelledPlacement=false,savedDraft;
    const discovery=createZinniaPlantDiscovery({mode:'note',onSpeak:()=>{if(placementActive)cancelledPlacement=true;},onReady:draft=>{savedDraft=draft;placementActive=true;return true;}});
    try{
        await discovery.receive('Observe the new lime leaves.');await discovery.confirm();
        discovery.activate('color:green');await discovery.confirm();
        assert.deepEqual(savedDraft,{text:'Observe the new lime leaves.',color:'green'});
        assert.equal(placementActive,true);assert.equal(cancelledPlacement,false);
    }finally{discovery.destroy();globalThis.document=savedDocument;globalThis.AudioContext=savedContext;}
});
