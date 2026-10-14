import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../app/vendor/three.module.min.js';
import {createVoiceEndpoint} from '../app/services/voiceEndpoint.js';
import {createPracticeBody,stepPracticeBodies,PRACTICE_TABLE_HALF_WIDTH} from '../app/services/welcomePracticePhysics.js';
import {createWelcomeVisitorIntroduction} from '../app/services/welcomeVisitorIntroduction.js';
import {createDemoLivingMapXR} from '../app/services/demoLivingMapXR.js';
import {createWelcomePracticeScene} from '../app/services/welcomePracticeScene.js';

test('steady room noise does not extend an already spoken reply to the recording limit',()=>{
 const endpoint=createVoiceEndpoint();for(let t=0;t<400;t+=50)assert.equal(endpoint.sample(.003,t),false);
 for(let t=400;t<1000;t+=50)assert.equal(endpoint.sample(.08,t),false);
 for(let t=1000;t<1500;t+=50)assert.equal(endpoint.sample(.01,t),false);
 assert.equal(endpoint.sample(.01,1500),true);assert.equal(endpoint.heard,true);
});
test('natural pauses keep the same sentence open and silence alone cannot create a reply',()=>{
 const quiet=createVoiceEndpoint();for(let t=0;t<9000;t+=50)assert.equal(quiet.sample(.002,t),false);assert.equal(quiet.heard,false);
 const endpoint=createVoiceEndpoint();for(let t=0;t<800;t+=50)endpoint.sample(.04,t);
 for(let t=800;t<1200;t+=50)assert.equal(endpoint.sample(.002,t),false);
 for(let t=1200;t<1800;t+=50)assert.equal(endpoint.sample(.04,t),false);
 assert.equal(endpoint.sample(.002,2250),false);assert.equal(endpoint.sample(.002,2300),true);
});
test('Orb rebounds from the table edge while retaining tangential motion',()=>{
 const ball=createPracticeBody('ball',{x:PRACTICE_TABLE_HALF_WIDTH-.07,radius:.055});ball.position.y=.055;ball.velocity.x=1;ball.velocity.z=.4;
 stepPracticeBodies([ball],.04);assert.ok(ball.velocity.x<-.7);assert.ok(ball.velocity.z>.39);assert.ok(ball.position.x<=PRACTICE_TABLE_HALF_WIDTH-.07);
});
test('native shader receives changing emissive values and unaffected materials stay dark',()=>{
 const document=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({})})};const values=[],shaders=[];
 const attributes=['p','n','uv','c','i0','i1','i2','i3','ic'];
 const gl=new Proxy({getExtension:name=>name==='OES_standard_derivatives'?{}:null,getShaderParameter:()=>true,getProgramParameter:()=>true,getParameter:()=>16,getAttribLocation:(_p,key)=>attributes.indexOf(key),getUniformLocation:(_p,key)=>key,uniform3f:(key,...value)=>{if(key==='emissive')values.push(value);},shaderSource:(_s,text)=>shaders.push(text)},{get:(target,key)=>key in target?target[key]:key===key.toUpperCase()?key:key.startsWith('create')?()=>({}):()=>{}});
 const scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);scene.add(mesh);scene.updateMatrixWorld(true);let renderer;
 try{renderer=createDemoLivingMapXR(gl,scene,{surfaceDetail:true});const identity=new THREE.Matrix4().elements,view={projectionMatrix:identity,transform:{inverse:{matrix:identity}}};renderer.draw(view,{x:0,y:0,z:0},{x:0,y:0,z:0,w:1},1);assert.deepEqual(values.at(-1),[0,0,0]);material.emissive.setRGB(.2,.4,.6);material.emissiveIntensity=.5;renderer.draw(view,{x:0,y:0,z:0},{x:0,y:0,z:0,w:1},1);assert.deepEqual(values.at(-1),[.1,.2,.3]);assert.ok(shaders.some(source=>source.includes('lit+=emissive')));}
 finally{renderer?.destroy();mesh.geometry.dispose();material.dispose();globalThis.document=document;}
});
test('fruit conversation waits for asynchronous presentation and ignores it after cancellation',async()=>{
 let callbacks,resolve;const responses=[];
 const dialog=createWelcomeVisitorIntroduction({onSay:text=>responses.push(text),onCelebrate:()=>new Promise(done=>resolve=done),createVoice:options=>(callbacks=options,{cancel(){},listen(){},finish(){},destroy(){}})});
 try{dialog.begin();callbacks.onText('You can call me Andre');dialog.activate('confirm');callbacks.onText('My favourite fruit is apple');assert.equal(dialog.state().processing,true);assert.equal(dialog.state().phase,'fruit');resolve(true);await Promise.resolve();assert.equal(dialog.state().phase,'complete');assert.match(responses.at(-1),/favorite fruit too/);
 dialog.begin();callbacks.onText('Andre');dialog.activate('confirm');callbacks.onText('apple');dialog.cancel();const count=responses.length;resolve(true);await Promise.resolve();assert.equal(responses.length,count);}
 finally{dialog.destroy();}
});

async function withAssets(run){
 const saved={document:globalThis.document,Image:globalThis.Image,fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap,self:globalThis.self};
 const ctx=new Proxy({measureText:text=>({width:text.length*18}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key] || (()=>{})});
 globalThis.document={createElement:()=>({getContext:()=>ctx})};globalThis.Image=class {set src(value){}};globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:64,height:64,close(){}});
 globalThis.fetch=async request=>{const url=request.url || String(request);if(url.startsWith('blob:'))return saved.fetch(request);const bytes=fs.readFileSync(new URL(url));return {ok:true,status:200,url,headers:new Headers(),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json:async()=>JSON.parse(bytes.toString())};};
 try{await run();}finally{await new Promise(resolve=>setTimeout(resolve,30));Object.assign(globalThis,saved);}
}
test('real Zinnia leaf holds keep the ray contact away from the stem pivot',()=>withAssets(async()=>{
 const voice={status:()=>({playing:false,paused:false,available:true}),speak(){},stop(){},unlock(){}};
 const stage=createWelcomePracticeScene({voice,embedded:true});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('laser-dance');stage.update(.05,{viewer,floor:0});stage.root.updateMatrixWorld(true);
 const leaf=stage.zinniaMount.getObjectByName('Leaf_arm_L'),centre=new THREE.Box3().setFromObject(leaf).getCenter(new THREE.Vector3()),origin=centre.clone().add(new THREE.Vector3(0,0,.5)),direction=new THREE.Vector3(0,0,-1),source={handedness:'left'},input={source,matrix:new THREE.Matrix4().makeTranslation(origin.x,origin.y,origin.z).elements,ray:{origin,direction},down:true};
 stage.update(.05,{viewer,floor:0,inputs:[input]});const contact=stage.snapshot().leafContacts[0];assert.ok(contact);assert.ok(new THREE.Vector3(...contact.point).distanceTo(leaf.getWorldPosition(new THREE.Vector3()))>.015);const first=new THREE.Vector3(...contact.point);origin.x+=.05;stage.update(.05,{viewer,floor:0,inputs:[input]});assert.ok(Math.abs(stage.snapshot().leafContacts[0].point[0]-first.x-.05)<.0001);
 }finally{stage.destroy();}
}));
test('table centre grip adjusts height and releases cleanly without acquiring an object',()=>withAssets(async()=>{
 const stage=createWelcomePracticeScene({embedded:true});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('controls-orb-grab');stage.update(.05,{viewer,floor:0});const handle=stage.scene.getObjectByName('Table height grip'),p=handle.getWorldPosition(new THREE.Vector3()),source={handedness:'right'},input={source,matrix:new THREE.Matrix4().makeTranslation(p.x,p.y,p.z).elements,down:true};stage.update(.05,{viewer,floor:0,inputs:[input]});assert.equal(stage.isHolding(source),true);const height=stage.tableHeight;input.matrix[13]+=.1;stage.update(.05,{viewer,floor:0,inputs:[input]});assert.ok(Math.abs(stage.tableHeight-height-.1)<.0001);input.down=false;stage.update(.05,{viewer,floor:0,inputs:[input]});assert.equal(stage.isHolding(source),false);assert.equal(stage.snapshot().held.length,0);
 }finally{stage.destroy();}
}));
test('cold favourite fruit loads into Zinnia hand and survives until actual reply playback ends',()=>withAssets(async()=>{
 let handlers,playing=false;const spoken=[];
 const voice={status:()=>({playing,paused:false,available:true}),speak(value){if(value){playing=true;spoken.push(value);}},stop(){playing=false;},unlock(){},prepare(){}};
 const stage=createWelcomePracticeScene({voice,embedded:true,createVisitorVoice:options=>(handlers=options,{listen(){},cancel(){},finish(){},destroy(){}})});
 try{await stage.loading;const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;stage.start(viewer,0);stage.previewLesson('visitor-intro');stage.update(.05,{viewer,floor:0});handlers.onText('My name is Andre');stage.conversation.activate('confirm');handlers.onText('My favourite fruit is apple');
 for(let i=0;i<200 && !stage.scene.getObjectByName('Zinnia favourite micro-fruit: apple');i++)await new Promise(resolve=>setTimeout(resolve,5));
 const fruit=stage.scene.getObjectByName('Zinnia favourite micro-fruit: apple');assert.ok(fruit,'cold asset must be awaited instead of skipped');assert.ok(stage.conversation.state().processing);
 playing=false;for(let i=0;i<10;i++)stage.update(.05,{viewer,floor:0,presentationReady:false});await Promise.resolve();assert.equal(stage.conversation.state().phase,'fruit','narration waits for the rendered reveal');
 stage.update(.05,{viewer,floor:0,presentationReady:true});await Promise.resolve();await Promise.resolve();assert.equal(stage.conversation.state().phase,'complete');assert.equal(fruit.parent.name,'Zinnia micro-fruit hand socket L');assert.equal(playing,true);assert.ok(stage.scene.getObjectByName(fruit.name),'speaking must not hide the fruit at audio start');
 }finally{playing=false;stage.destroy();}
}));
