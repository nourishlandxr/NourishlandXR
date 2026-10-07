import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spatialCardTextureContent} from '../app/services/spatialTotemCards.js';
import {butterflyDropSurface,demoButterflyPose} from '../app/services/demoButterflyPose.js';

test('native widget texture keys never serialize live DOM or action graphs',()=>{
    const element={};element.self=element;
    const card={id:'task',element,title:'Task',revision:'completed',buttons:[{button:element}]};
    assert.doesNotThrow(()=>spatialCardTextureContent(card));
    assert.equal(spatialCardTextureContent(card),spatialCardTextureContent({...card,buttons:[]}));
    assert.notEqual(spatialCardTextureContent(card),spatialCardTextureContent({...card,revision:'new'}));
});

test('air release ignores distant panels and surface release requires actual proximity',()=>{
    const position={x:0,y:1,z:-1};
    assert.equal(butterflyDropSurface(position,[{point:{x:0,y:1,z:-2}}]),null);
    const close={x:0,y:1,z:-1.05};
    assert.deepEqual(butterflyDropSurface(position,[{point:{x:0,y:1,z:-2}},{position:close}]),close);
    assert.equal(demoButterflyPose(10000,5500,{perchMs:0}).state,'flying');
    assert.equal(demoButterflyPose(10001,10000,{perchMs:4500}).state,'landed');
});

test('butterflies periodically settle into a natural pause during flight',()=>{
    const start=0,first=demoButterflyPose(10000,start,{perchMs:0,seed:0});
    const later=demoButterflyPose(35000,start,{perchMs:0,seed:0});
    assert.equal(first.state,'flying');
    assert.equal(later.state,'landed');
    assert.equal(later.close,0);
});

test('butterfly catch target does not shorten the visible laser',()=>{
    const source=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
    const pointer=source.slice(source.indexOf('function drawDemoControllerPointer'),source.indexOf('async function startImmersive'));
    assert.doesNotMatch(pointer,/butterflySurface/);
    assert.match(source,/catch\(error\)\{console\.warn\('Note widgets closed safely:',error\);note\.renderer\.destroy\(\);note\.workspace\.destroy\(\);note\.root\.remove\(\);demoPlacedNoteViews\.delete\(id\)/);
    assert.doesNotMatch(source,/catch\(error\)\{[^}]*markers\.(splice|filter)/);
});
