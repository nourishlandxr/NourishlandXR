import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createDemoVoiceTextFlow} from '../app/services/demoVoiceTextFlow.js';

const source=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
test('a rendered demo board releases narration and Continue after reading and audio',()=>{
 const body=source.slice(source.indexOf('function demoNarrationPresentationReady('),source.indexOf('function narrateDemoFrame('));
 const context={gl:{},simulatedMode:false,session:{visibilityState:'visible'},introBoardVisible:true,demoPresentationPaintedAt:-Infinity,zinniaFramePerch:{presentationReady:true},getSpatialVisualSettings:()=>({livingFrame:true}),livingFrameModel:{entranceReady:true},introBoardStep:'WELCOME 0.1'};
 vm.createContext(context);vm.runInContext(body,context);
 let time=0,id=0,spoken=0,continued=0,finishAudio;const timers=new Map();
 const tick=ms=>{time+=ms;for(const [key,t]of [...timers])if(t.at<=time){timers.delete(key);t.f();}};
 const flow=createDemoVoiceTextFlow({paragraphs:['Welcome to the demo.'],isReady:context.demoNarrationPresentationReady,voice:{speak(_text,options){spoken++;finishAudio=options.onComplete;}},readingTime:()=>500,now:()=>time,setTimer:(f,delay)=>{timers.set(++id,{f,at:time+delay});return id;},clearTimer:key=>timers.delete(key),onComplete:()=>continued++});
 try{flow.start();tick(1000);assert.equal(spoken,0);context.demoPresentationPaintedAt=time;tick(100);assert.equal(spoken,1);tick(500);assert.equal(continued,0);finishAudio();assert.equal(continued,1);}finally{flow.cancel();}
 assert.match(source,/demoPresentationPaintedAt=performance\.now\(\);/);
 context.livingFrameModel={error:new Error('Model unavailable')};assert.equal(context.demoNarrationPresentationReady('Welcome',0),true);
});

test('chapter 4 establishes its spatial anchor before positioning a plant',()=>{
 const body=source.slice(source.indexOf('function activateDemoChapter('));
 const plant={demoType:'plant'},context={DEMO_CHAPTERS:[{id:'plants'}],introWorldAnchor:null,viewerMatrix:[1],introWorldAnchorFromViewer:()=>[2],demoPeekPortal:null,closeLivingPeek(){},clearDemoNarration(){},clearTimeout(){},arWelcomeUnlockTimer:null,infoPanel:null,syncDemoPanelActions(){},markers:[],knowledgeRenderer:null,gl:null,developerLabRecords:()=>[plant],createMarkerTexture:()=>null,updateSimulatedMarkers(){},introLocalPosition(anchor){assert.deepEqual(anchor,[2]);return {x:0,y:0,z:-1.6};},toggleDemoPlantProfile(){},showDemoInfo(){}};
 vm.createContext(context);vm.runInContext(body,context);context.activateDemoChapter('plants');assert.equal(plant.position.z,-1.6);
 assert.match(source,/if\(viewerMatrix\)\{const chapter=demoStartChapter/);
 const chapters=fs.readFileSync(new URL('../app/screens/demoChapters.js',import.meta.url),'utf8');assert.match(chapters,/import \{startTemporaryArDemo\}/);assert.doesNotMatch(chapters,/await import/);
});
