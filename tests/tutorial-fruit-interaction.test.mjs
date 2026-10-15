import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from '../app/assets/fruit-window/vendor/three.module.js';import {createWelcomePracticeScene} from '../app/services/welcomePracticeScene.js';import {welcomePracticeVisualGuide} from '../app/services/welcomeComfortOptions.js';
function withoutTextures(bytes){const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString().trim());delete json.images;delete json.textures;for(const m of json.materials||[]){delete m.extensions;delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;if(m.pbrMetallicRoughness){delete m.pbrMetallicRoughness.baseColorTexture;delete m.pbrMetallicRoughness.metallicRoughnessTexture;}}const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);const tail=bytes.subarray(20+length),header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+tail.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);return Buffer.concat([header,padded,tail]);}
import * as GrabSDK from '../iwsdk/grabSdk.js';
import {createTutorialInteractionOwner} from '../app/services/iwsdkTutorialInteraction.js';

test('existing tutorial fruit uses SDK capture through basket, two-hand ownership, plate, UI blocking and tracking loss',async()=>{
 const saved=Object.fromEntries(['document','fetch','Image','ProgressEvent'].map(key=>[key,globalThis[key]]));let stage,owner;
 const warnings=console.warn;console.warn=()=>{};
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({measureText:text=>({width:String(text).length*12}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]||(()=>{})})})};
 globalThis.Image=class{set src(value){this.onerror?.();}};globalThis.ProgressEvent=class{constructor(type,props){Object.assign(this,props);}};
 globalThis.fetch=async request=>new Response(withoutTextures(fs.readFileSync(new URL(request.url||request))),{status:200,headers:{'Content-Length':'1'}});
 const runtime={backend:'iwsdk',input:{gazePointer:{pointer:{id:-1},getHeldByHand:()=>null}}};
 try{
  owner=createTutorialInteractionOwner(runtime,GrabSDK);
  const feedback=[];
  stage=createWelcomePracticeScene({embedded:true,getFruitInteractionOwner:()=>owner,
   voice:{status:()=>({playing:false,paused:false,muted:true}),speak(){},stop(){},unlock(){}},
   loadZinnia:async()=>({scene:new THREE.Group()}),onFeedback:kind=>feedback.push(kind)});
  await stage.loading;await stage.loadPracticeAssets();
  const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements;
  const right={handedness:'right'},left={handedness:'left'};
  stage.start(viewer,0);stage.previewLesson('fruit');
  const tick=(...inputs)=>stage.update(.02,{viewer,floor:0,inputs});tick();tick();
  const body=stage.bodies.find(value=>value.id==='peach');assert.ok(body.visible && body.basketed);
  const pose=position=>new THREE.Matrix4().makeTranslation(position.x,position.y,position.z).premultiply(stage.root.matrixWorld).elements;
  const input=(source,position,down=false,extra={})=>({source,matrix:pose(position),down,trigger:false,...extra});
  tick(input(right,body.position));tick(input(right,body.position,true));
  assert.equal(owner.held(right)?.id,body.id);assert.ok(stage.snapshot().held.includes(body.id));assert.equal(body.basketed,false);
  tick(input(right,{...body.position,y:.65},true));
  const heldPosition={...body.position};tick(input(right,heldPosition,true),input(left,heldPosition,true));
  assert.equal(owner.held(right)?.id,body.id,'second hand cannot steal the SDK handle');
  assert.notEqual(owner.held(left)?.id,body.id);assert.ok(stage.isHolding(right));
  tick(input(right,{x:-.23,y:.65,z:.10},true));tick(input(right,{x:-.23,y:.18,z:.10},true));
  tick(input(right,{x:-.23,y:.18,z:.10}));
  assert.equal(owner.held(right),null);assert.equal(body.held,false);assert.ok(stage.snapshot().basket.plated.includes(body.id));assert.ok(body.anchored);
  assert.equal(feedback.filter(value=>value==='grab').length,1,'one feedback event per capture');
  // A hand source uses the same SDK handle, then tracking loss drops safely.
  stage.resetObjects();stage.setInputMode('hands');tick();tick();
  const hand={handedness:'right',hand:{}};
  tick(input(hand,body.position));tick(input(hand,body.position,true));assert.equal(owner.held(hand)?.id,body.id);
  tick(input(hand,{...body.position,y:.65},true));tick({source:hand,matrix:null,down:true});
  assert.equal(owner.held(hand),null);assert.equal(body.held,false);
  tick(input(hand,body.position,true));assert.equal(owner.held(hand),null,'still-held gesture after loss cannot recapture');
  tick(input(hand,body.position));tick(input(hand,body.position,true));assert.equal(owner.held(hand)?.id,body.id);
  tick(input(hand,body.position,true,{uiBlocked:true}));assert.equal(owner.held(hand),null);assert.equal(body.held,false);
  tick(input(hand,body.position,true));assert.equal(owner.held(hand),null,'panel release cannot leak a held gesture into fruit');
  tick(input(hand,body.position));tick(input(hand,body.position,true));assert.equal(owner.held(hand)?.id,body.id);
  stage.releaseAll(false);assert.deepEqual(owner.snapshot().held,[]);assert.equal(body.held,false);
  tick(input(hand,body.position,true));assert.equal(owner.held(hand),null,'cancel requires a fresh open/close');
  stage.releaseAll(false);stage.setInputMode('controllers');
  for(const [lesson,id] of [['packet','seed-packet'],['water','watering-can'],['harvest','strawberry-pot']]){
   stage.previewLesson(lesson);tick();tick();
   const tool=stage.bodies.find(value=>value.id===id);assert.ok(tool?.visible,`${id} is authored and visible`);
   // Contact the pot's exposed lower side, not fruit attached above its rim.
   const contact=id==='strawberry-pot'?{...tool.position,x:tool.position.x+.06,y:tool.position.y-.025}:tool.position;
   tick(input(right,contact));tick(input(right,contact,true));
   assert.equal(owner.held(right)?.id,id,`${id} uses actual SDK ownership`);
   assert.ok(stage.snapshot().held.includes(id));
   const destination={x:tool.position.x+.12,y:tool.position.y+.25,z:tool.position.z};
   tick(input(right,destination,true));assert.ok(tool.position.y>.15,`${id} follows its SDK handle`);
   tick(input(right,destination));assert.equal(owner.held(right),null);assert.equal(tool.held,false);
   stage.releaseAll(false);
  }
  stage.destroy();stage=null;owner.dispose();owner.dispose();
 }finally{stage?.destroy();owner?.dispose();await new Promise(resolve=>setTimeout(resolve,30));console.warn=warnings;for(const [key,value]of Object.entries(saved))globalThis[key]=value;}
});
test('real whole/cut meshes open once, plate independently, and reset through XR input',async()=>{
 const saved=Object.fromEntries(['document','fetch','Image','ProgressEvent'].map(k=>[k,globalThis[k]]));let stage;const warnings=console.warn;
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({measureText:text=>({width:String(text).length*12}),createLinearGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]||(()=>{})})})};globalThis.Image=class{set src(v){this.onerror?.();}};globalThis.ProgressEvent=class{constructor(type,props){Object.assign(this,props);}};
 globalThis.fetch=async request=>{const url=new URL(request.url||request);return new Response(withoutTextures(fs.readFileSync(url)),{status:200,headers:{'Content-Length':'1'}});};
 try{let visitorEvents;const spoken=[],feedback=[];stage=createWelcomePracticeScene({embedded:true,createVisitorVoice:handlers=>(visitorEvents=handlers,{listen(){},finish(){},cancel(){},destroy(){}}),voice:{status:()=>({playing:false,paused:false,muted:true}),speak:v=>spoken.push(v),stop(){},unlock(){}},onFeedback:kind=>feedback.push(kind),loadZinnia:async()=>({scene:new THREE.Group()})});await stage.loading;await stage.loadPracticeAssets();
 const brushSource={handedness:'right'};const viewer=new THREE.Matrix4().makeTranslation(0,1.6,0).elements,source={handedness:'left'};stage.start(viewer,0);stage.previewLesson('fruit');const tick=(input)=>stage.update(.05,{viewer,floor:0,inputs:input?[input]:[]});tick();
 assert.ok(stage.bodies.filter(b=>['peach','fig','mango','pomegranate','apple','carambola','banana'].includes(b.id)).every(b=>b.basketed));assert.equal(stage.root.getObjectByName('WelcomeFruitPlate').visible,true);
 function pose(p){return stage.root.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(p.x,p.y,p.z)).elements;}
 const peachTest=stage.bodies.find(b=>b.id==='peach'),far=pose({...peachTest.position,y:peachTest.position.y+1}),near=pose(peachTest.position);tick({source,matrix:far,down:false});tick({source,matrix:far,down:true});assert.equal(stage.isHolding(source),false,'no pickup outside palm');tick({source,matrix:near,down:true});assert.equal(stage.isHolding(source),true,'held grip can pick up fruit on contact');tick({source,matrix:near,down:false});
 for(const id of ['peach','fig']){const b=stage.bodies.find(b=>b.id===id);const matrix=pose(b.position);tick({source,matrix,down:false,trigger:false});tick({source,matrix,down:true,trigger:false});assert.equal(stage.isHolding(source),true);tick({source,matrix,down:true,trigger:true});assert.equal(stage.snapshot().openedFruits.includes(id),false,'trigger alone does not cut');
 const other={...b.position};const own={source,matrix:pose({...b.position,y:.5}),down:true};stage.update(.05,{viewer,floor:0,inputs:[own]});const p={...b.position};const approach={source:brushSource,matrix:pose({x:p.x+.03,y:p.y,z:p.z}),down:true};stage.update(.05,{viewer,floor:0,inputs:[own,approach]});stage.update(.05,{viewer,floor:0,inputs:[own,{...approach,matrix:pose({x:p.x+.3,y:p.y,z:p.z})}]});assert.ok(stage.snapshot().openedFruits.includes(id));const sweep=()=>{};const brushMatrix=pose({x:0,y:.4,z:0});assert.ok(stage.objects.get(id+':half'));const opens=feedback.filter(k=>k==='open').length;sweep(.04,false);assert.equal(feedback.filter(k=>k==='open').length,opens);stage.update(.05,{viewer,floor:0,inputs:[{source,matrix,down:true,trigger:false},{source:brushSource,matrix:brushMatrix,down:false,trigger:false}]});tick({source,matrix:pose({...b.position,y:.65}),down:true,trigger:false});tick({source,matrix:pose({x:-.23,y:.65,z:.10}),down:true,trigger:false});const destination=pose({x:-.23,y:.18,z:.10});tick({source,matrix:destination,down:true,trigger:false});tick({source,matrix:destination,down:false,trigger:false});assert.ok(stage.snapshot().basket.plated.includes(id));assert.equal(b.anchored,true);}
 assert.equal(stage.snapshot().completed,true);assert.equal(new Set(stage.snapshot().basket.plated.map(id=>id.split(':')[0])).size,2);assert.equal(stage.bodies.filter(b=>b.id.endsWith(':half')).length,2);
 stage.resetObjects();tick();assert.deepEqual(stage.snapshot().openedFruits,[]);assert.deepEqual(stage.snapshot().basket.plated,[]);assert.ok(stage.bodies.filter(b=>b.id.endsWith(':half')).every(b=>!b.visible));

 // Supplied animated peel follows a lengthwise two-hand pull and keeps progress.
 const banana=stage.bodies.find(b=>b.id==='banana');let pick=pose(banana.position);tick({source,matrix:pick,down:false});tick({source,matrix:pick,down:true});
 let owner={source,matrix:pose({...banana.position,y:.55}),down:true};stage.update(.05,{viewer,floor:0,inputs:[owner]});
 const second=()=>new THREE.Vector3(.025,0,0).applyQuaternion(new THREE.Quaternion().copy(banana.rotation)).add(new THREE.Vector3().copy(banana.position));
 const tip=second(),other={source:brushSource,matrix:pose(tip),down:true};stage.update(.05,{viewer,floor:0,inputs:[owner,other]});
 const pull=amount=>{const target=tip.clone().add(new THREE.Vector3(0,-amount,0).applyQuaternion(new THREE.Quaternion().copy(banana.rotation)));stage.update(.05,{viewer,floor:0,inputs:[owner,{...other,matrix:pose(target)}]});};
 pull(.08);assert.ok(stage.snapshot().fruitInteractions.banana.peeled>.3);assert.ok(stage.snapshot().fruitInteractions.banana.peeled<.7);
 const progress=stage.snapshot().fruitInteractions.banana.peeled;stage.update(.05,{viewer,floor:0,inputs:[owner]});assert.equal(stage.snapshot().fruitInteractions.banana.peeled,progress,'released peel retains progress');
 stage.update(.05,{viewer,floor:0,inputs:[owner,other]});pull(.20);assert.ok(stage.snapshot().openedFruits.includes('banana'));assert.equal(stage.objects.has('banana:half'),false,'peeling keeps one coherent banana');
 assert.ok(banana.halfSize.y>0 && banana.radius<.35);stage.resetObjects();assert.equal(stage.snapshot().fruitInteractions.banana.peeled,0);
 // A held apple approaches the headset mouth; one bite gives one crunch/tap.
 const apple=stage.bodies.find(b=>b.id==='apple');pick=pose(apple.position);tick({source,matrix:pick,down:false});tick({source,matrix:pick,down:true});assert.equal(stage.isHolding(source),true);
 const mouthWorld=new THREE.Vector3(0,-.10,-.08).applyMatrix4(new THREE.Matrix4().fromArray(viewer));const mouthLocal=mouthWorld.applyMatrix4(stage.root.matrixWorld.clone().invert());
 tick({source,matrix:pose({...apple.position,y:.6}),down:true});tick({source,matrix:pose(mouthLocal),down:true});assert.equal(stage.snapshot().fruitInteractions.apple.bitten,true);assert.equal(feedback.filter(k=>k==='bite').length,1);
 tick({source,matrix:pose(mouthLocal),down:true});assert.equal(feedback.filter(k=>k==='bite').length,1);const appleState=stage.objects.get('apple');assert.equal(appleState.children[0].visible,false);assert.equal(appleState.children[2].visible,true);
 for(let bite=2;bite<=3;bite++){const away=mouthLocal.clone().add(new THREE.Vector3(0,-.30,0));tick({source,matrix:pose(away),down:true});tick({source,matrix:pose(mouthLocal),down:true});assert.equal(stage.snapshot().fruitInteractions.apple.bites,bite);assert.equal(feedback.filter(k=>k==='bite').length,bite);}stage.resetObjects();assert.equal(stage.snapshot().fruitInteractions.apple.bites,0);assert.ok(appleState.children.slice(2).every(node=>!node.visible));assert.equal(stage.snapshot().fruitInteractions.apple.bitten,false);assert.equal(appleState.children[0].visible,true);assert.equal(appleState.children[2].visible,false);
 const hand={handedness:'right',hand:{}};stage.setInputMode('hands');stage.previewLesson('harvest');stage.update(.05,{viewer,floor:0,inputs:[]});const pot=stage.bodies.find(b=>b.id==='strawberry-pot'),potPick=pose(pot.position);assert.ok(pot.visible);
 stage.update(.05,{viewer,floor:0,inputs:[{source:hand,matrix:potPick,down:false}]});stage.update(.05,{viewer,floor:0,inputs:[{source:hand,matrix:potPick,down:true}]});assert.equal(stage.isHolding(hand),true,'strawberry pot can be picked');assert.ok(stage.snapshot().held.includes('strawberry-pot'));
 const potMoved=pose({x:.3,y:.32,z:.12});stage.update(.05,{viewer,floor:0,inputs:[{source:hand,matrix:potMoved,down:true}]});stage.update(.05,{viewer,floor:0,inputs:[{source:hand,matrix:potMoved,down:true}]});
 assert.ok(Math.abs(pot.position.x-.3)<1e-6);const attached=stage.bodies.filter(b=>b.id.startsWith('strawberry-') && b.plantAttached);assert.ok(attached.length>0);assert.ok(attached.every(b=>Math.abs(b.position.x-pot.position.x)<.22 && b.position.y>pot.position.y));
 stage.update(.05,{viewer,floor:0,inputs:[{source:hand,matrix:potMoved,down:false}]});assert.equal(stage.isHolding(hand),false);assert.equal(pot.held,false);
 stage.setInputMode('controllers');const controllerPot=pose({...pot.position,y:pot.position.y-.06});tick({source,matrix:controllerPot,down:false});tick({source,matrix:pose(pot.position),down:true});assert.ok(stage.snapshot().held.includes('strawberry-pot'),'controller mode can also pick the pot: '+JSON.stringify(stage.snapshot().held));tick({source,matrix:controllerPot,down:false});stage.previewLesson('fruit');assert.equal(stage.controllerLasersVisible,false);stage.setInputMode('gloves');assert.equal(stage.controllerLasersVisible,false);stage.setInputMode('hands');assert.equal(stage.controllerLasersVisible,false);
 stage.previewLesson('visitor-intro');assert.ok(stage.conversation);visitorEvents.onText('My name is Sam');assert.equal(stage.snapshot().visitor.name,'Sam');stage.conversation.activate('confirm');assert.equal(stage.snapshot().visitor.name,'Sam');visitorEvents.onText('a pineapple');assert.match(stage.snapshot().caption,/Prickly.*crown/);assert.equal(stage.snapshot().visitor.favouriteFruit,'pineapple');stage.start(viewer,0);assert.deepEqual(stage.snapshot().visitor,{name:'',favouriteFruit:''});
 assert.deepEqual(welcomePracticeVisualGuide({phase:'fruit',lastPickedFruit:'carambola'}),{image:'',caption:''});
 }finally{stage?.destroy();await new Promise(resolve=>setTimeout(resolve,30));console.warn=warnings;for(const [k,v]of Object.entries(saved))globalThis[k]=v;}
});
