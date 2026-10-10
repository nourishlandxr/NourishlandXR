import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DEMO_HEADING_FONT,DEMO_HEADING_SIZE} from '../app/features/ar-demo/demoConfig.js';
import {drawLivingMapPreview} from '../app/services/demoLivingMapReveal.js';
const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');

test('Continue stays hidden through narration and the final reading time, then appears enabled',()=>{
 const show=source.slice(source.indexOf('function showIntroBoard('),source.indexOf('function syncDemoStageControls('));
 const button={hidden:false,disabled:true},timers=[];let advanced=0;
 const noop=()=>{},scope=vm.createContext({
  appRoot:{querySelector:selector=>selector==='[data-tryit-intro-continue]'?button:null},
  demoSlideHistoryReplay:true,clearDemoNarration:noop,demoNarrationRevision:1,infoPanel:null,
  guidedDemoStep:()=>null,DEMO_TUTORIAL_STEPS:{GUIDED:'guided',PIM:'pim'},demoLivingMapScene:null,
  useSharedWelcomeBoard:noop,setDemoTutorialStep:noop,demoLocalizedText:value=>value,DEMO_QUICK_ACCESS_COPY:{},
  nextDemoSlideCode:()=> 'SPACE 1.1',rememberDemoSlide:noop,clearTimeout:noop,
  setTimeout:callback=>{timers.push(callback);return timers.length;},revealIntroBoardNextGuide:noop,
  syncDemoPanelActions:noop,demoFastSkipActive:false,DEMO_BOARD_TYPING_SAFETY_MS:30000,
  demoParagraphReadingTime:()=>1000,setGuide:noop,syncDemoStageControls:noop,performance:{now:()=>100},
  advance:()=>advanced++
 });
 vm.runInContext(show+";showIntroBoard('Title','One paragraph','Continue',advance)",scope);
 assert.equal(button.hidden,true);assert.equal(button.disabled,false);button.onclick();assert.equal(advanced,0);
 timers[0]();assert.equal(scope.introBoardVisibleBody,'One paragraph');assert.equal(button.hidden,true);
 timers.at(-1)();assert.equal(button.hidden,false);assert.equal(button.disabled,false);
 button.onclick();assert.equal(button.hidden,true);assert.equal(advanced,1);button.onclick();assert.equal(advanced,1);
});

test('opening narration hides its Continue and Let’s start controls instead of disabling them',()=>{
 assert.match(source,/waitingButton\.hidden=true;waitingButton\.disabled=false/);
 assert.match(source,/openingButton\.hidden=true;openingButton\.textContent='Let’s start';openingButton\.disabled=false/);
 assert.doesNotMatch(source,/continueButton\.disabled\s*=\s*true|openingButton\.disabled=true|waitingButton\.disabled=true/);
});
test('Y exposes the opening Continue without replacing INTRO 1.1 with INTRO 1.2',()=>{
 const welcome=source.slice(source.indexOf('function showArWelcomeShowcase()'),source.indexOf('// Use the same billboard geometry'));
 const handler=welcome.slice(welcome.indexOf('skipDemoNarration=()=>{'),welcome.indexOf("    const layer=document.createElement('div')"));
 const button={hidden:true,disabled:true},ctx=vm.createContext({arWelcomeOpeningActive:true,introOpeningCopySkipped:false,introBoardVisibleBody:'',introBoardBody:'All first-slide text',introBoardTextureDirty:false,introBoardStep:'INTRO 1.1',paintOpeningCopy(){},clearTimeout(){},boardTypingTimer:1,arWelcomeUnlockTimer:2,appRoot:{querySelector:()=>button},beginOpeningCopy(){throw Error('Must not change slides');},finishOpeningCopy(){},syncDemoPanelActions(){}});
 vm.runInContext(handler+';skipDemoNarration();',ctx);
 assert.equal(ctx.introBoardStep,'INTRO 1.1');assert.equal(ctx.introBoardVisibleBody,ctx.introBoardBody);assert.equal(button.hidden,false);assert.equal(button.disabled,false);
});
test('long headings wrap using the same display size and never compress their glyphs',()=>{
 const helper=source.slice(source.indexOf('function drawDemoHeading('),source.indexOf('function drawIntroNoteContent(')),drawn=[];
 const ctx={font:'',fillText(...args){drawn.push({font:this.font,args});}},scope=vm.createContext({DEMO_HEADING_FONT,DEMO_HEADING_SIZE,wrappedTextureLines:()=>['Long heading','second line'],ctx});
 vm.runInContext(helper+';drawDemoHeading(ctx,"Long heading second line");',scope);
 assert.equal(drawn.length,2);assert.ok(drawn.every(row=>row.font.startsWith('500 72px') && row.args.length===3));assert.equal(drawn[1].args[2]-drawn[0].args[2],80);
});
test('paused sample contains greenery and later spatial frames retain their growth clock',()=>{
 const painted=[],ctx={save(){},restore(){},globalAlpha:1},scene={draw:(_ctx,elapsed,reduced)=>painted.push({elapsed,reduced})},rect={x:0,y:0,width:100,height:100};
 drawLivingMapPreview(ctx,scene,0,false,rect);assert.deepEqual(painted,[{elapsed:0,reduced:true}]);
});
test('dissolve repaints reuse the flat snapshot without rewinding the live scene',()=>{
 const original=globalThis.document,painted=[],images=[];
 globalThis.document={createElement:()=>({getContext:()=>({})})};
 try{
  const ctx={save(){},restore(){},drawImage:canvas=>images.push(canvas)},scene={draw:(_ctx,elapsed,reduced)=>painted.push({elapsed,reduced})},rect={x:0,y:0,width:100,height:100};
  drawLivingMapPreview(ctx,scene,0,false,rect);
  drawLivingMapPreview(ctx,scene,4800,true,rect);
  assert.equal(painted.length,1);assert.equal(images[0],images[1]);
  drawLivingMapPreview(ctx,scene,0,false,{...rect,width:120});assert.equal(painted.length,2);
 }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
test('filled narration pages do not carry the plant story onto the next page',()=>{
 const helper=source.slice(source.indexOf('function introReadingWindow('),source.indexOf('function createSpatialKnowledgeTexture('));
 const ctx=vm.createContext({layout:{paragraphLines:[['a','b'],['A plant can share its story.'],['c','d','e']],lineHeight:100,paragraphGap:10}});
 vm.runInContext(helper,ctx);
 assert.equal(vm.runInContext('introReadingWindow(layout,2,330).first',ctx),0);
 assert.equal(vm.runInContext('introReadingWindow(layout,3,330).first',ctx),2);
});
test('INTRO 1.2 declines stale first-slide copy and accepts its own narration',()=>{
 const helper=source.slice(source.indexOf('function introVisibleCopy('),source.indexOf('function drawIntroNoteContent('));
 const ctx=vm.createContext({introBoardStep:'INTRO 1.2',introBoardVisibleBody:'A plant can share its story.',DEMO_QUICK_ACCESS_COPY:{'INTRO 1.2':'For this demo, we prepared samples.'},demoLocalizedText:value=>value});
 vm.runInContext(helper,ctx);assert.equal(vm.runInContext('introVisibleCopy()',ctx),'');
 ctx.introBoardVisibleBody='For this demo';assert.equal(vm.runInContext('introVisibleCopy()',ctx),'For this demo');
});
