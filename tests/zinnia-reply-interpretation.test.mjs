import test from 'node:test';import assert from 'node:assert/strict';
import {interpretZinniaReply} from '../tools/zinniaInterpretation.mjs';
import {createWelcomeVisitorIntroduction} from '../app/services/welcomeVisitorIntroduction.js';
import {getZinniaVisitor,resetZinniaVisitor} from '../app/services/zinniaVisitorSession.js';
test('free reply extraction uses a strict schema and rejects invented values',async()=>{
 let request;const result=await interpretZinniaReply('Everyone at home has always known me as Sunny. Mango is my favourite.','name',{apiKey:'test',fetchImpl:async(_url,init)=>{request=JSON.parse(init.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({name:'Sunny',fruit:'pineapple'})}}]})};}});
 assert.equal(request.response_format.json_schema.strict,true);assert.equal(request.messages[1].content,'Everyone at home has always known me as Sunny. Mango is my favourite.');assert.deepEqual(result,{name:'Sunny',fruit:null});
});
test('free introduction, correction and favourite fruit complete without discarding full sentences',async()=>{
 resetZinniaVisitor();let events,calls=0;const spoken=[];
 const dialog=createWelcomeVisitorIntroduction({createVoice:handlers=>(events=handlers,{listen(){},cancel(){},destroy(){}}),onSay:text=>spoken.push(text),interpretReply:async()=>{calls++;return {name:'David',fruit:'mango'};}});
 try{dialog.begin();events.onText('The person you are talking with was given the name David after his grandfather.');assert.equal(dialog.state().processing,true);await Promise.resolve();assert.equal(dialog.state().candidate,'David');events.onText('Actually, you can call me Andre');assert.equal(dialog.state().candidate,'Andre');events.onText('Yes, that is me');events.onText('Well I would have to choose mangoes because I grew up with them.');assert.equal(getZinniaVisitor().name,'Andre');assert.equal(getZinniaVisitor().favouriteFruit,'mango');assert.equal(dialog.state().phase,'complete');assert.equal(calls,1);}
 finally{dialog.destroy();resetZinniaVisitor();}
});
test('retry, skip and restart invalidate delayed interpretations',async()=>{
 let events,resolve;const dialog=createWelcomeVisitorIntroduction({createVoice:handlers=>(events=handlers,{listen(){},cancel(){},destroy(){}}),interpretReply:()=>new Promise(done=>resolve=done)});
 try{dialog.begin();events.onText('There is quite a story behind what everyone calls me');dialog.activate('cancel');resolve({name:'Stale'});await Promise.resolve();assert.equal(dialog.state().phase,'complete');dialog.begin();assert.equal(dialog.state().candidate,'');events.onText('My name is Sam');assert.equal(dialog.state().candidate,'Sam');dialog.activate('retry');assert.equal(dialog.state().phase,'name');events.onText('My friends call me Andy though Andrew is on my passport');assert.equal(dialog.state().candidate,'Andy');}
 finally{dialog.destroy();}
});
