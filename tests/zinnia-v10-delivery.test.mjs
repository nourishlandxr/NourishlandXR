import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WELCOME_NARRATION_BANK as tutorial} from '../app/services/welcomeNarrationBank.js';
import {DEMO_NARRATION_BANK as demo} from '../app/services/demoNarrationBank.js';
import {ZINNIA_VOICE_DELIVERY,ZINNIA_VOICE_PROFILE} from '../tools/zinniaVoiceServer.mjs';
import {spokenFrameLead} from '../app/services/demoVoiceTextFlow.js';

test('tutorial, demo and live speech use the same refined OpenAI delivery',()=>{
 for(const bank of [tutorial,demo]){
  assert.equal(bank.delivery,ZINNIA_VOICE_DELIVERY);
  assert.equal(bank.instructions,ZINNIA_VOICE_PROFILE.instructions);
  assert.equal(bank.voice,'coral');
  for(const id of bank.clips)assert.ok(fs.statSync(new URL('../app/'+bank.base+id+'.mp3',import.meta.url)).size>1000,id);
 }
 assert.match(ZINNIA_VOICE_PROFILE.instructions,/word endings release naturally/);
 assert.match(ZINNIA_VOICE_PROFILE.instructions,/normal speed/);
});
test('demo paragraphs preserve complete saved recordings rather than shortened live fragments',()=>{
 for(const clip of Object.values(demo.catalog))assert.equal(spokenFrameLead(clip.text),clip.text);
});

test('demo presentation retains recording boundaries and independent animation ownership',()=>{
 const source=fs.readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
 const board=source.slice(source.indexOf('function showIntroBoard('),source.indexOf('function syncDemoStageControls('));
 assert.doesNotMatch(board,/length>180/);
 assert.match(board,/quickAccessCopy\?guidedDemoStep\(options.stepLabel\)\?\.main/);
 assert.doesNotMatch(source,/createZinniaFramePerch\(\{character:welcomePractice/);
 assert.match(source,/zinniaFramePerch\.attach\(gl\);zinniaFramePerch\.show\(\)/);
});
