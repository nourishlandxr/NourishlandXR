import test from 'node:test';
import assert from 'node:assert/strict';
import {identityGlyphBounds,identityTextLayout,NOTE_WIDGET_FOOTPRINT_SCALE,NOTE_WIDGET_LAYOUT,wrapMeasuredText} from '../app/services/demoTextWidgetLayout.js';

const measure=text=>text.length*10;

test('PIMO identity text wraps by measured width inside four separate vertical bands',()=>{
    const layout=identityTextLayout({
        title:'Pigeon Pea Botanical Identity and Garden Uses',
        scientific:'Cajanus cajan (L.) Millsp.',
        roles:'Food crop · Nitrogen fixer · Living mulch',
        body:'A perennial legume that enriches soil and supports food gardens.'
    },{title:measure,scientific:measure,roles:measure,body:measure});
    const ordered=['title','scientific','roles','body'].map(key=>layout[key]);
    assert.ok(ordered[0].lines.length>1,'long titles wrap into the reserved title band');
    const glyphs=[];
    for(const region of ordered){
        assert.ok(region.lines.length<=region.maxLines);
        for(const [index,line] of region.lines.entries()){
            assert.ok(measure(line)<=region.width,`${line} fits its measured width`);
            const bounds=identityGlyphBounds(region,index);
            assert.equal(bounds.baseline,region.baselines[index],'baseline-local scaling keeps the baseline fixed');
            assert.ok(bounds.top>=region.top && bounds.bottom<=region.bottom,`${line} transformed glyph extent remains within its ${region.top}-${region.bottom} region`);
            assert.ok(bounds.top>=62 && bounds.bottom<=450,`${line} transformed glyph extent stays inside the actual rounded card`);
            glyphs.push({...bounds,line});
        }
    }
    glyphs.sort((a,b)=>a.top-b.top);
    for(let i=1;i<glyphs.length;i++)assert.ok(glyphs[i-1].bottom<glyphs[i].top,`${glyphs[i-1].line} and ${glyphs[i].line} transformed glyphs do not overlap`);
});

test('overlong text truncates only after measured wrapping reaches its row limit',()=>{
    assert.deepEqual(wrapMeasuredText('one two three four five six',70,measure,2),['one two','three…']);
});

test('Note widgets use half the former area while the main Note stays unchanged',()=>{
    assert.equal(NOTE_WIDGET_FOOTPRINT_SCALE,Math.sqrt(.5));
    assert.deepEqual(NOTE_WIDGET_LAYOUT.main,{width:.86,height:.336});
    assert.ok(Math.abs(NOTE_WIDGET_LAYOUT.compact.width-.70*Math.sqrt(.5))<1e-12);
    assert.ok(Math.abs(NOTE_WIDGET_LAYOUT.compact.height-.264*Math.sqrt(.5))<1e-12);
    assert.ok(Math.abs((NOTE_WIDGET_LAYOUT.compact.width*NOTE_WIDGET_LAYOUT.compact.height)/(.70*.264)-.5)<1e-12);
});
