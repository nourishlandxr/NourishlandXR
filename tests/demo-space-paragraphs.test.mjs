import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoParagraphSequence} from '../app/services/demoParagraphSequence.js';
import {DEMO_NARRATION_TRANSLATIONS} from '../app/services/demoNarrationTranslations.js';
import {guidedDemoStep} from '../app/features/ar-demo/demoJourneyContent.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function fakeClock(){
    let time=0,nextId=0;
    const timers=new Map();
    return {
        now:()=>time,
        setTimer:(callback,delay)=>{const id=++nextId;timers.set(id,{at:time+delay,callback});return id;},
        clearTimer:id=>timers.delete(id),
        advance:duration=>{
            const target=time+duration;
            while(true){
                const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];
                if(!next || next[1].at>target)break;
                time=next[1].at;timers.delete(next[0]);next[1].callback();
            }
            time=target;
        },
        pending:()=>timers.size
    };
}

const paragraphs=['So far, we have explored plants, knowledge and a local message.','In a real place, these pieces can grow together.','An Area keeps them organised, with a Totem as its welcome point.'];

test('SPACE 1.4 sequence fades each paragraph, reads it, then retains the last paragraph',()=>{
    const clock=fakeClock(),changes=[];let completed=0;
    const sequence=createDemoParagraphSequence({paragraphs,readingTime:()=>2000,now:clock.now,setTimer:clock.setTimer,clearTimer:clock.clearTimer,onChange:event=>changes.push(event),onComplete:()=>completed++});
    sequence.start();
    assert.deepEqual(sequence.snapshot(),{index:0,paragraph:paragraphs[0],phase:'fade-in',startedAt:0,opacity:0,active:true,completed:false,cancelled:false});
    clock.advance(1100);assert.equal(sequence.snapshot().phase,'reading');assert.equal(sequence.snapshot().opacity,1);
    clock.advance(2000);assert.equal(sequence.snapshot().phase,'fade-out');assert.equal(sequence.snapshot().opacity,1);
    clock.advance(350);assert.equal(sequence.snapshot().opacity,.5);
    clock.advance(350);assert.equal(sequence.snapshot().index,1);assert.equal(sequence.snapshot().paragraph,paragraphs[1]);
    clock.advance(1100+2000+700);
    assert.equal(sequence.snapshot().index,2);assert.equal(sequence.snapshot().paragraph,paragraphs[2]);
    assert.equal(sequence.snapshot().phase,'fade-in');
    clock.advance(1100);assert.equal(sequence.snapshot().phase,'reading');
    clock.advance(2000);
    assert.equal(completed,1);assert.equal(sequence.snapshot().paragraph,paragraphs[2]);assert.equal(sequence.snapshot().completed,true);assert.equal(sequence.snapshot().opacity,1);
    assert.equal(changes.filter(event=>event.phase==='fade-out').length,2);
});

test('reduced motion removes fades but retains the full reading interval',()=>{
    const clock=fakeClock();
    const sequence=createDemoParagraphSequence({paragraphs,readingTime:()=>500, reducedMotion:true,now:clock.now,setTimer:clock.setTimer,clearTimer:clock.clearTimer});
    sequence.start();
    assert.equal(sequence.snapshot().phase,'reading');
    assert.equal(sequence.snapshot().opacity,1);
    clock.advance(499);assert.equal(sequence.snapshot().index,0);
    clock.advance(1);assert.equal(sequence.snapshot().index,1);assert.equal(sequence.snapshot().phase,'reading');
});

test('cancel prevents pending paragraph changes and completion',()=>{
    const clock=fakeClock();let completed=0,changes=0;
    const sequence=createDemoParagraphSequence({paragraphs,readingTime:()=>100,now:clock.now,setTimer:clock.setTimer,clearTimer:clock.clearTimer,onChange:()=>changes++,onComplete:()=>completed++});
    sequence.start();sequence.cancel();clock.advance(10000);
    assert.equal(changes,1);assert.equal(completed,0);assert.equal(clock.pending(),0);assert.equal(sequence.snapshot().cancelled,true);
});

test('clearDemoNarration cancels the live sequence and removes its scoped board mode',()=>{
    const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const clear=source.slice(source.indexOf('function clearDemoNarration('),source.indexOf('function showIntroBoard('));
    let cancelled=0,removed='';
    const context=vm.createContext({
        demoNarrationRevision:4,demoParagraphSequence:{cancel:()=>cancelled++},
        boardTypingTimer:1,boardTypingWatchdogTimer:2,clearTimeout:()=>{},skipDemoNarration:()=>{},
        introBoardVisibleBody:'current',introBoardParagraphFadeTimes:[1],introBoardTextureDirty:false,
        appRoot:{querySelector:()=>({classList:{remove:value=>removed=value}}),querySelectorAll:()=>[]}
    });
    vm.runInContext(clear+';clearDemoNarration()',context);
    assert.equal(cancelled,1);assert.equal(context.demoParagraphSequence,null);assert.equal(removed,'is-space-paragraph-sequence');
    assert.equal(context.demoNarrationRevision,5);assert.equal(context.introBoardVisibleBody,'');
});

test('SPACE 1.4 is the only intro board opting into single paragraph sequencing',()=>{
    const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    assert.deepEqual(guidedDemoStep('SPACE 1.4').main.split('\n\n'),paragraphs);
    for(const paragraph of paragraphs)assert.ok(DEMO_NARRATION_TRANSLATIONS.some(([english,portuguese,dutch])=>english===paragraph && portuguese && dutch));
    assert.match(source,/guidedDemoStep\('SPACE 1\.4'\)[\s\S]*?paragraphSequence:'single-centered'/);
    assert.match(source,/introBoardStep==='SPACE 1\.4'\?demoParagraphSequence\?\.snapshot/);
    assert.match(source,/if\(sequenceFadeActive\)introBoardTextureDirty=true/);
    assert.match(source,/paragraphFadeActive \|\| sequenceFadeActive \|\| openingCopyRevealActive \? Math\.max\(DEMO_TEXT_TEXTURE_INTERVAL_MS/);
    assert.match(source,/if\(useParagraphSequence\)[\s\S]*?demoParagraphSequence=createDemoParagraphSequence/);
});
