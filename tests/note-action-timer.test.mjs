import test from 'node:test';
import assert from 'node:assert/strict';
import {createNoteWidget,interactNoteWidget,renderNoteWidget,timerActionDate,saveNoteWidgetState,loadNoteWidgetState} from '../app/services/noteWidgets.js';
import {DEMO_NOTE_WIDGETS} from '../app/services/demoNoteShowcase.js';
const now=new Date(2026,9,7,10).getTime(),shift=(at,days)=>{const date=new Date(at);date.setDate(date.getDate()+days);return date.getTime();};
test('action timer plans harvest ten days out or scion readiness in two weeks',()=>{
    const widget=createNoteWidget('timer');assert.equal(timerActionDate(widget,{},now),shift(now,10));
    let state=interactNoteWidget(widget,{},'plan:scion',now);assert.equal(state.targetAt,shift(now,14));assert.equal(state.actionLabel,'Scion ready');
    assert.match(renderNoteWidget(widget,state,now),/Return in 14 days/);
    state=interactNoteWidget(widget,state,'plan:harvest',now);assert.equal(state.targetAt,shift(now,10));assert.match(renderNoteWidget(widget,state,now),/Fruit harvest/);
});
test('date spinner crosses month boundaries and updates an existing saved action date',()=>{
    const widget=createNoteWidget('timer'),monthEnd=new Date(2026,9,28,10).getTime();
    let state=interactNoteWidget(widget,{},'start',monthEnd);const original=state.endsAt;
    state=interactNoteWidget(widget,state,'date:7',monthEnd);assert.equal(state.endsAt,shift(original,7));
    state=interactNoteWidget(widget,state,'date:-1',monthEnd);assert.equal(state.endsAt,shift(original,6));
    const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)},marker={id:'return-note'};
    saveNoteWidgetState(marker,widget,state,storage);assert.equal(loadNoteWidgetState(marker,widget,storage).endsAt,state.endsAt);
    assert.equal(interactNoteWidget(widget,state,'reset',monthEnd).endsAt,null);
});
test('date spinner stays at today when stepping backwards; custom defaults support weeks and months',()=>{
    const widget=createNoteWidget('timer',{configuration:{actionTag:true,action:'Check graft',seconds:0}});
    assert.equal(timerActionDate(widget,{},now),now);assert.equal(interactNoteWidget(widget,{},'date:-7',now).targetAt,now);
    assert.match(renderNoteWidget(widget,{},now),/Ready to check today/);
    const month=createNoteWidget('timer',{configuration:{actionTag:true,action:'Graft & <check>',seconds:30*86400}});
    assert.equal(timerActionDate(month,{},now),shift(now,30));assert.match(renderNoteWidget(month,{},now),/Graft &amp; &lt;check&gt;/);
});
test('demo keeps compact widget types and provides observation examples plus an actual reference photo',()=>{
    assert.deepEqual(DEMO_NOTE_WIDGETS.map(w=>w.type),['timer','checklist','thick-box','image']);
    assert.equal(DEMO_NOTE_WIDGETS[1].content,'Flowering\nChecked for pests\nFruit collected');
    const sample=DEMO_NOTE_WIDGETS[3];assert.match(sample.configuration.url,/pigeon-pea-cajanus-cajan\.png$/);
    const photo=createNoteWidget('image',{...sample,configuration:{...sample.configuration,url:'assets/pigeon-pea-cajanus-cajan.png'}});assert.match(renderNoteWidget(photo),/<img /);assert.match(renderNoteWidget(photo),/example reference photo/);
    const html=renderNoteWidget(createNoteWidget('timer',DEMO_NOTE_WIDGETS[0]),{},now);
    assert.equal((html.match(/data-widget-action/g)||[]).length,7); // Fits existing eight-action card.
});
