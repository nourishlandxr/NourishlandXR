import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('let demoFastSkipActive=false;'),source.indexOf('async function retryQuestImmersive'));
function setup(extra={}){
 let advances=0,finished=0;const button={hidden:false,disabled:true,click(){assert.equal(vm.runInContext('demoFastSkipActive',context),true);advances++;}};
 const context=vm.createContext({demoHeldIndex:-1,demoWebModeOpen:false,demoExitLifecycle:{state:'idle'},DEMO_EXIT_STATES:{IDLE:'idle'},introBoardStep:'SPACE 1.4',demoMapIntroPaused:false,demoLivingMapPlacement:null,currentDemoStepSignature:()=>context.introBoardStep,skipDemoNarration:()=>{finished++;button.disabled=false;},placementReady:false,markers:[],nativeConnectionState:null,appRoot:{querySelector:()=>button},introBoardParagraphFadeTimes:[100],introBoardParagraphFadeStartedAt:100,introTextureUploadedAt:100,introBoardTextureDirty:false,syncDemoPanelActions(){},paintWelcomeLayer(){},performance:{now:()=>10000},...extra});
 vm.runInContext(handler,context);return {context,button,skip:()=>vm.runInContext('skipCurrentDemoStep()',context),advances:()=>advances,finished:()=>finished};
}
test('Y clears text/button waits and leaves Continue ready on this slide',()=>{
 const h=setup();assert.equal(h.skip(),true);assert.equal(h.finished(),1);assert.equal(h.advances(),0);assert.equal(h.button.hidden,false);assert.equal(h.button.disabled,false);
 assert.equal(vm.runInContext('demoFastSkipActive',h.context),false);assert.equal(h.context.introTextureUploadedAt,-Infinity);assert.equal(h.context.introBoardParagraphFadeTimes[0],-Infinity);
});
test('Y does not double-advance if finishing narration changed the stage',()=>{
 const h=setup();h.context.skipDemoNarration=()=>{h.context.introBoardStep='ELEMENTS 1.5';};assert.equal(h.skip(),true);assert.equal(h.advances(),0);
});
test('Y skips reading during placement/plant choice without completing the interaction',()=>{
 for(const extra of [{placementReady:true},{markers:[{demoNativeChoicePending:true}]},{nativeConnectionState:{phase:'choosing'}}]){const h=setup(extra);assert.equal(h.skip(),true);assert.equal(h.finished(),1);assert.equal(h.advances(),0);}
});
test('Y fast-forwards map reveal and Orb settle delays without placing or leaving the map',()=>{
 for(const placed of [[],[{id:'map-entry',at:8000},{id:'map-forest',at:9000}]]){
  let updated=0;const h=setup({introBoardStep:'UTILITY 1.1',demoLivingMapPlacement:{snapshot:()=>placed},demoLivingMapElapsed:()=>1000,demoLivingMapStartedAt:9000,LIVING_MAP_REVEAL_READY_MS:7600,LIVING_MAP_ORB_SETTLE_MS:2100,updateSpatialLivingMap:()=>updated++});
  assert.equal(h.skip(),true);assert.equal(updated,1);assert.equal(h.advances(),0);assert.equal(h.context.demoLivingMapStartedAt,10000-(placed.length?11100:7600));
 }
});
test('held objects and Web Mode remain protected from Y',()=>{
 for(const extra of [{demoHeldIndex:0},{demoWebModeOpen:true}]){const h=setup(extra);assert.equal(h.skip(),false);assert.equal(h.finished(),0);assert.equal(h.advances(),0);}
});
