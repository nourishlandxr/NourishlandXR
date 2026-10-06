import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Execute the actual button handlers: a click during narration must advance
// once, clear the previous copy and cancel its pending reveal callbacks.
const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
const clear=source.slice(source.indexOf('function clearDemoNarration()'),source.indexOf('function showIntroBoard('));
function context(){
    const paragraphs=[{textContent:'Old paragraph'}],cancelled=[],button={};let advances=0;
    const ctx=vm.createContext({boardTypingTimer:11,boardTypingWatchdogTimer:12,arWelcomeUnlockTimer:13,demoNarrationRevision:0,narrationRevision:0,skipDemoNarration:()=>{},introBoardVisibleBody:'Old paragraph',introBoardParagraphFadeTimes:[1],introBoardTextureDirty:false,appRoot:{querySelectorAll:()=>paragraphs,querySelector:()=>button},continueButton:button,clearTimeout:id=>cancelled.push(id),performance:{now:()=>100},onContinue:()=>{assert.equal(ctx.introBoardVisibleBody,'');advances++;},beginOpeningCopy:()=>{assert.equal(ctx.introBoardVisibleBody,'');advances++;},runArWelcomeTutorial:()=>{assert.equal(ctx.introBoardVisibleBody,'');advances++;},suppressSessionSelectUntil:0,typing:true,openingTyping:true,introBoardStep:'INTRO 1.2',arWelcomeIntroPending:true,arWelcomeSettleStage:true});
    vm.runInContext(clear,ctx);return {ctx,paragraphs,cancelled,button,advances:()=>advances};
}
function cleared(h){assert.equal(h.advances(),1);assert.equal(h.paragraphs[0].textContent,'');assert.equal(h.ctx.skipDemoNarration,null);assert.ok(h.cancelled.includes(11));assert.ok(h.cancelled.includes(12));}
test('ordinary Continue advances on its first press during paragraph playback',()=>{
    const h=context(),body=source.slice(source.indexOf('function showIntroBoard('),source.indexOf('function rememberDemoSlide('));
    const handler=body.match(/continueButton\.onclick = (\(\) => \{[\s\S]*?\n        \});/)[1];
    vm.runInContext(`(${handler})()`,h.ctx);cleared(h);assert.equal(h.ctx.typing,false);
});
test('opening Continue advances immediately instead of repainting INTRO 1.1',()=>{
    const h=context(),handler=source.match(/waitingButton\.onclick=(\(\)=>\{[^\n]*?\});\}syncDemoPanelActions/)[1];
    vm.runInContext(`(${handler})()`,h.ctx);cleared(h);
});
test('Start the demo advances during INTRO 1.2 and discards old callbacks',()=>{
    const h=context(),handler=source.match(/const continueOpeningCopy=(event=>\{[^\n]*\});/)[1];
    vm.runInContext(`(${handler})()`,h.ctx);cleared(h);assert.equal(h.ctx.openingTyping,false);assert.ok(h.cancelled.includes(13));assert.equal(h.button.disabled,true);
});
