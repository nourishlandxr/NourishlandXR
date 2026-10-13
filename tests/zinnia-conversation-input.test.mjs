import test from 'node:test';
import assert from 'node:assert/strict';
import {spokenVisitorName,spokenFavouriteFruit,spokenPlantQuery,spokenNoteDraft,conversationConfirmation} from '../app/services/zinniaConversationInput.js';
import {createWelcomeVisitorIntroduction} from '../app/services/welcomeVisitorIntroduction.js';
import {getZinniaVisitor,resetZinniaVisitor} from '../app/services/zinniaVisitorSession.js';
import {createZinniaPlantDiscovery} from '../app/services/zinniaPlantDiscovery.js';

test('conversational replies preserve names, preferences, plants and dictated words',()=>{
 for(const text of ['My name is Andre.','You can call me Andre','Hi Zinnia, I’m Andre, nice to meet you'])assert.equal(spokenVisitorName(text),'Andre');
 assert.equal(spokenFavouriteFruit('Well, I really like mangoes because they are sweet.'),'mango');
 assert.equal(spokenFavouriteFruit('My favourite fruit would have to be strawberries.'),'strawberry');
 assert.equal(spokenPlantQuery('Zinnia, could you please make an orb for finger lime, thanks'),'finger lime');
 assert.equal(spokenNoteDraft('Could you write a note saying Water the strawberries on Friday.'),'Water the strawberries on Friday.');
 assert.equal(conversationConfirmation('Yes, you got it!'),true);
 assert.equal(conversationConfirmation("I don't think that's right"),false);
});

test('visitor confirms a full introduction with a fruit already supplied',()=>{
 resetZinniaVisitor();let events;
 const dialog=createWelcomeVisitorIntroduction({createVoice:handlers=>(events=handlers,{listen(){},cancel(){},destroy(){}})});
 try{dialog.begin();events.onText('You can call me Andre and I really like mangoes.');assert.equal(dialog.state().candidate,'Andre');events.onText('Yes, that’s right');assert.deepEqual(getZinniaVisitor(),{name:'Andre',favouriteFruit:'mango'});assert.equal(dialog.state().phase,'complete');}
 finally{dialog.destroy();resetZinniaVisitor();}
});

test('Note accepts sentence corrections and a colour phrase before saving',()=>{
 let events,ready;
 const dialog=createZinniaPlantDiscovery({mode:'note',onReady:draft=>{ready=draft;return true;},createVoice:handlers=>(events=handlers,{speak:async()=>false,listen(){},cancel(){},destroy(){}})});
 try{dialog.begin();events.onText('Please write a note saying Water on Friday.');assert.equal(dialog.state().query,'Water on Friday.');events.onText('No, write a note saying Water on Saturday.');assert.equal(dialog.state().query,'Water on Saturday.');events.onText('That sounds good');assert.equal(dialog.state().phase,'color');events.onText('I would like blue please');events.onText('Actually, I prefer rose');assert.equal(dialog.state().color,'rose');events.onText('Yes, save it');assert.deepEqual(ready,{text:'Water on Saturday.',color:'rose'});}
 finally{dialog.destroy();}
});
