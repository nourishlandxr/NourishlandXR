import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
test('returning from Games restores the board and resumes its paragraph flow after voice handover',()=>{
 let paused=0,resumed=0,parked=0,opened=null;
 const context=vm.createContext({welcomePractice:{stage:{resumeGame:id=>{opened=id;},abort(){}},park:()=>parked++},viewerMatrix:{},welcomeExperienceReturn:null,introBoardTitle:'Original',introBoardBody:'Full text',introBoardVisibleBody:'Current paragraph',introBoardVisible:true,introBoardStep:'PIMO 1.2',arWelcomeIntroPending:false,arWelcomeOpeningActive:false,arWelcomeSharedBoard:true,limMeshVisible:true,demoProjectVoice:{status:()=>({paused:false}),pause(){throw Error('Use flow pause');},resume(){throw Error('Use flow resume');}},demoParagraphSequence:{pause:()=>paused++,resume:()=>resumed++},zinniaFramePerch:{hide(){},show(){}},createWelcomeComfortOptions:()=>({}),welcomeComfort:null,introBoardTextureDirty:false,syncWelcomeComfortOptions(){},infoPanel:{setComfortContext(){},suspend(){}},welcomePracticeVoice:{stop(){}},syncDemoPanelActions(){},welcomeInputMethod:()=> 'hands',demoInputMethod:'controllers'});
 vm.runInContext(source.slice(source.indexOf('function resumeWelcomeGame('),source.indexOf('function syncWelcomeComfortOptions(')),context);
 assert.equal(context.resumeWelcomeGame('hand-play'),true);assert.equal(opened,'hand-play');assert.equal(paused,1);context.introBoardTitle='Game title';context.introBoardVisibleBody='Game hint';context.restoreWelcomeExperience();assert.equal(context.introBoardTitle,'Original');assert.equal(context.introBoardVisibleBody,'Current paragraph');assert.equal(resumed,1);assert.equal(parked,1);assert.equal(context.demoInputMethod,'hands');
});
