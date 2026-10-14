import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
function harness(){
 let now=0,next,id=0;const failures=[];
 const scope={session:{visibilityState:'visible-blurred'},performance:{now:()=>now},setTimeout(fn){next=fn;return ++id;},clearTimeout(){next=null;},XR_FIRST_CONTENT_TIMEOUT_MS:2500,xrFirstContentWatchdog:null,reportDemoRenderFailure(_error,phase){failures.push(phase);scope.xrReportedFailurePhases.add(phase);scope.xrRecoveryStatus='failed';},recordArDiagnostic(){},sessionMode:'immersive-ar',xrRecoveryTexture:null,gl:null,demoRenderFailureReported:true};
 vm.createContext(scope);vm.runInContext(source.slice(source.indexOf('function beginXrFirstContentWatchdog('),source.indexOf('function demoInfoTarget(')),scope);
 return {scope,failures,tick(ms){now+=ms;const fn=next;next=null;fn?.();},get timer(){return next;}};
}
test('Quest permission overlays do not consume the demo startup deadline',()=>{
 const h=harness();h.scope.beginXrFirstContentWatchdog();h.tick(10000);assert.equal(h.failures.length,0);
 h.scope.session.visibilityState='hidden';h.tick(10000);assert.equal(h.failures.length,0);
 h.scope.session.visibilityState='visible';h.tick(100);h.tick(2400);assert.equal(h.failures.length,0);h.tick(100);assert.deepEqual(h.failures,['first-frame watchdog']);
});
test('first rendered frame cancels the watch and clears only a watchdog failure',()=>{
 for(const additionalFailure of [false,true]){const h=harness();h.scope.session.visibilityState='visible';h.scope.beginXrFirstContentWatchdog();h.tick(2500);if(additionalFailure)h.scope.xrReportedFailurePhases.add('marker render');h.scope.markXrFirstContentRendered();assert.equal(h.scope.xrRecoveryStatus,additionalFailure?'failed':'ready');assert.equal(h.timer,null);}
});
test('a previous session watchdog cannot report a failure in a replacement session',()=>{
 const h=harness();h.scope.beginXrFirstContentWatchdog();h.scope.session={visibilityState:'visible'};h.tick(10000);assert.equal(h.failures.length,0);assert.equal(h.timer,null);
 const loop=source.slice(source.indexOf('const draw = (_time, frame)'),source.indexOf('measureXrFrame=getSpatialVisualSettings()',source.indexOf('const draw = (_time, frame)')));
 assert.doesNotMatch(loop,/visibilityState==='visible-blurred'/);assert.match(loop,/visibilityState==='hidden'/);
});
