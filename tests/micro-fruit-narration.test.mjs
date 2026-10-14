import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WELCOME_NARRATION_BANK} from '../app/services/welcomeNarrationBank.js';
import {favouriteFruitReply} from '../app/services/welcomeVisitorIntroduction.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'app/assets/welcome-practice/micro-fruits/voice-manifest.json'),'utf8'));

test('each supported hand fruit has its matching saved Zinnia voice reply',async()=>{
    assert.equal(manifest.voice,WELCOME_NARRATION_BANK.voice);
    assert.equal(manifest.base,WELCOME_NARRATION_BANK.base);
    assert.deepEqual(Object.keys(manifest.clips).sort(),['micro-fruit-favorite-prefix','micro-fruit-apple-description','micro-fruit-banana-description','micro-fruit-carambola-description','micro-fruit-fig-description','micro-fruit-mango-description','micro-fruit-peach-description','micro-fruit-pomegranate-description'].sort());
    assert.equal(manifest.clips['micro-fruit-favorite-prefix'].text,"That's my favorite fruit too!");
    assert.ok((await fs.stat(path.join(root,'app',manifest.clips['micro-fruit-favorite-prefix'].file))).size>1000);
    for(const [audioId,clip] of Object.entries(manifest.clips)){
        if(audioId==='micro-fruit-favorite-prefix')continue;
        const fruit=audioId.slice('micro-fruit-'.length,-'-description'.length),reply=favouriteFruitReply(fruit),stat=await fs.stat(path.join(root,'app',clip.file));
        assert.ok(reply.audioIds.includes(audioId));
        assert.ok(reply.text.endsWith(clip.text));
        assert.ok(stat.size>1000,`${audioId} should be a complete MP3`);
    }
    assert.equal(favouriteFruitReply('pineapple').audioId,undefined,'fruits without an approved hand model have no recorded reveal line');
});
