import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDemoBorderRangesMap,createDemoLivingMapPlacement} from '../app/services/demoLivingMapModel.js';
import {DEMO_GUIDED_STEPS} from '../app/features/ar-demo/demoJourneyContent.js';
import {DEMO_CHAPTERS} from '../app/services/demoChapters.js';

test('Demo uses the saved Border Ranges authoring model and all four crafted Totems',()=>{
    const source=JSON.parse(readFileSync(new URL('../app/assets/imap-v2/border-ranges-mock.json',import.meta.url)));
    const map=createDemoBorderRangesMap();assert.deepEqual(map.mapSeed,source);
    assert.equal(map.items.length,4);assert.ok(map.items.every(item=>item.totemStyle==='basic'));
    const placement=createDemoLivingMapPlacement(map);assert.equal(placement.current(0),null);
    assert.equal(placement.snapshot().length,4);placement.reset();assert.equal(placement.snapshot().length,4);
});
test('Demo finishes at IMAP without exposing unfinished LIMO chapters',()=>{
    assert.ok(!DEMO_CHAPTERS.some(chapter=>chapter.id==='learning'));
    assert.ok(!DEMO_GUIDED_STEPS.some(step=>step.id.startsWith('LEARNING')));
    const screen=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const activity=screen.slice(screen.indexOf('function startDemoLivingMapActivity()'),screen.indexOf('function clearDemoMapPiece()'));
    assert.match(activity,/onContinue:showDemoClosingMessage/);
    assert.doesNotMatch(activity,/showLimo|showDemoBeforePlanting/);
});
