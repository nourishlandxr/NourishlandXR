import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoLivingMapConcept,createDemoLivingMapPlacement,livingMapDropAccepted} from '../app/services/demoLivingMapModel.js';
import {beeWingsAtRest} from '../app/services/demoAmbientLife.js';
import {focusSpatialObjectControls} from '../app/services/spatialObjectControls.js';
import {spatialControlLayout} from '../app/services/spatialControlLayout.js';
import {demoNoteWidgetPlacement} from '../app/services/demoNoteShowcase.js';
import {NOTE_CARD_LAYOUT,noteCardActionOffset} from '../app/services/noteSpatialRenderer.js';
import {setNxrLanguage,hasNxrTranslation,translateNxrText} from '../app/services/i18n.js';
import {DEMO_GUIDED_STEPS} from '../app/features/ar-demo/demoJourneyContent.js';

test('interactive map has entrance, forest and swale Totems; only forest gets three Orbs',()=>{
 const model=createDemoLivingMapConcept({interactive:true});
 assert.equal(model.areas.length,3);assert.equal(model.links.length,2);
 assert.deepEqual(model.areas.map(a=>a.members.filter(i=>i.type==='plant').length),[0,3,0]);
 assert.ok(model.areas[0].totem.z>2.4);assert.ok(model.areas[1].totem.x>0);assert.ok(model.areas[2].totem.x<0);
 const state=createDemoLivingMapPlacement(model);assert.equal(state.current().id,'map-entry');assert.deepEqual(state.snapshot(),[]);
 assert.equal(state.place('map-swales',0),false);assert.equal(state.place('map-entry',NaN),false);
 for(const [index,id] of ['map-entry','map-forest','map-swales'].entries()){
  assert.equal(state.place(id,1000+index*3000),true);assert.equal(state.place(id,99999),false);
 }
 assert.equal(state.current(),null);const snapshot=state.snapshot();snapshot[0].at=-999;
 assert.equal(state.snapshot()[0].at,1000);state.reset();assert.deepEqual(state.snapshot(),[]);assert.equal(state.current().id,'map-entry');
});
test('map drop accepts forgiving nearby releases, not empty air, distant or invalid rays',()=>{
 assert.equal(livingMapDropAccepted({x:51,y:40},{x:0,y:0}),true);
 assert.equal(livingMapDropAccepted({x:80,y:0},{x:0,y:0}),false);
 assert.equal(livingMapDropAccepted(null,{x:0,y:0}),false);
 assert.equal(livingMapDropAccepted({x:NaN,y:0},{x:0,y:0}),false);
});
test('bees must actually settle on a flower before their wings rest',()=>{
 assert.equal(beeWingsAtRest({nectar:true,speed:.005,flowerDistance:.002}),true);
 assert.equal(beeWingsAtRest({nectar:true,speed:.03,flowerDistance:.002}),false);
 assert.equal(beeWingsAtRest({nectar:true,speed:0,flowerDistance:.04}),false);
 assert.equal(beeWingsAtRest({nectar:true,pointerContact:true,speed:0,flowerDistance:0}),false);
});
test('Totem showcase groups four model buttons and real light swatches, opens Controls',async()=>{
 let context,opened=false;const record={demoType:'zone',appearance:{},demoTotemSignsVisible:true};
 focusSpatialObjectControls({showLearning(){},setObjectContext:value=>context=value,setExplorerOpen:value=>opened=value},record,{demo:true});
 assert.equal(opened,true);assert.deepEqual(context.actions.filter(a=>a.group==='Totem model').map(a=>a.label),['1','2','3','4']);
 assert.equal(context.actions.filter(a=>a.kind==='swatch' && /^#[\da-f]{6}$/i.test(a.color)).length,4);
 const controls=spatialControlLayout(context.actions);assert.equal(controls.filter(a=>a.kind==='heading').length,3);
 for(const item of controls)assert.ok(item.x>=0 && item.x+item.width<=1000 && item.y+item.height<450);
 await context.onAction('style:organic');assert.equal(record.appearance.totemStyle,'organic');
 await context.onAction('light:#ecc276');assert.equal(record.appearance.notificationColor,'#ecc276');
});
test('Note main and extensions share wide compact geometry with room for strings and buttons',()=>{
 const bays=demoNoteWidgetPlacement(5),l=NOTE_CARD_LAYOUT;
 for(const bay of bays){assert.equal(bay.width,l.width);assert.equal(bay.height,l.height);assert.ok(Math.abs(bay.x)>l.width || Math.abs(bay.y)>l.height);}
 for(let i=0;i<8;i++){const p=noteCardActionOffset(i);assert.ok(Math.abs(p.x)<l.width/2 && Math.abs(p.y)<l.height/2);}
});
test('new intro paragraph boundaries and map guidance remain translated in both languages',()=>{
 const rows=['Place Totem','Totem model','Lights','Signage','Welcome at the entrance','Three Totems · one connected place',...DEMO_GUIDED_STEPS.filter(s=>s.id.startsWith('INTRO ')).map(s=>s.main)];
 for(const language of ['pt-PT','nl-NL']){setNxrLanguage(language);for(const text of rows){assert.equal(hasNxrTranslation(text),true,text);assert.notEqual(translateNxrText(text),text);}}
 setNxrLanguage('en');
});
