import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {PIGEON_PEA_PIM} from '../app/services/pigeonPeaPim.js';
import {pimToArKnowledge} from '../app/services/pimModel.js';
import {pimVisibleNodes} from '../app/services/plantInformationMesh.js';
import {knowledgeExplorer,knowledgeExplorerAction,preserveKnowledgeContext} from '../app/services/knowledgeExplorer.js';
import {ensureKnowledgeObjects,spawnKnowledgeObject,selectKnowledgeObjectFace,knowledgeObjectAction,knowledgeConnectorAnchors,visibleKnowledgeObjects,rotateKnowledgeObject} from '../app/services/knowledgeObjectModel.js';
import {availablePimoModes,bindPimoSpatialCapabilities,setPimoDeveloperOverride,supportsSpatialPIMO} from '../app/services/pimoSpatialCapabilities.js';
import {createHeroDicePhysics,HERO_TOY_REACH} from '../app/services/heroDiceToy.js';
import {bindKnowledgeObjectInteraction} from '../app/services/knowledgeObjectInteraction.js';
import {createHandSurfaceInteraction} from '../app/services/handSurfaceInteraction.js';
import {beginHandTrackingFrame,handTrackingState,XR_HAND_JOINT_CONNECTIONS} from '../app/services/xrPointer.js';
import {totemNotificationLight,TOTEM_NOTIFICATION_COLOUR} from '../app/services/totemSignSelection.js';

let fixtureId=0;
const knowledge=pimToArKnowledge(PIGEON_PEA_PIM),record=()=>({id:'test',name:'Pigeon Pea '+(++fixtureId),demoType:'plant',demoExpandedNodeIds:[],demoSelectedNodeId:''});
class Session extends EventTarget{inputSources=[];visibilityState='visible';}
const matrix=new THREE.Matrix4().elements,pose={emulatedPosition:false,transform:{matrix}},basis={position:{x:0,y:1,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}};
function enableHarness(){globalThis.location={hostname:'127.0.0.1',pathname:'/tools/pimo-prototype.html'};setPimoDeveloperOverride(true);}

test('Curiosity defaults to exactly the canonical initial six-petal layout',()=>{
 const r=record();assert.equal(knowledgeExplorer(r).mode,'curiosity');
 const baseline=pimVisibleNodes(knowledge,[],{includeAllChildren:true}),curiosity=pimVisibleNodes(knowledge,[],{includeAllChildren:true,explorer:knowledgeExplorer(r)});
 assert.equal(curiosity.length,6);assert.deepEqual(curiosity.map(n=>[n.path,n.layoutGrid,n.fixedPosition]),baseline.map(n=>[n.path,n.layoutGrid,n.fixedPosition]));
});
test('Explore is absent until an active immersive session has real 6DoF and manipulation input',()=>{
 setPimoDeveloperOverride(false);const s=new Session(),space={},source={targetRayMode:'tracked-pointer',targetRaySpace:{},gripSpace:{}};s.inputSources=[source];const capability=bindPimoSpatialCapabilities(s,space,{mode:'immersive-vr',rendererReady:true});
 assert.deepEqual(availablePimoModes(),['tag','curiosity']);capability.update({session:s,getViewerPose:()=>({...pose,emulatedPosition:true}),getPose:()=>pose});assert.equal(supportsSpatialPIMO(),false);
 capability.update({session:s,getViewerPose:()=>pose,getPose:()=>pose});assert.equal(supportsSpatialPIMO(),true);s.dispatchEvent(new Event('end'));assert.deepEqual(availablePimoModes(),['tag','curiosity']);capability.destroy();
});
test('local override cannot enable Explorer on a consumer URL',()=>{
 globalThis.location={hostname:'nourishland.org',pathname:'/xr/'};assert.equal(setPimoDeveloperOverride(true),false);assert.equal(supportsSpatialPIMO(),false);
});
test('one hand-sized die; face-normal spawn and collapse retain every arranged descendant',()=>{
 enableHarness();const r=record();knowledgeExplorerAction(r,'KnowledgeMode:explore');const w=ensureKnowledgeObjects(r,knowledge);assert.equal(w.items.length,1);assert.equal(w.items[0].radius,.12);
 const face=w.items[0].faces.find(f=>f.conceptId==='cultivation') || w.items[0].faces[0],source=w.items[0];selectKnowledgeObjectFace(r,knowledge,{id:face.conceptId,knowledgeObjectId:source.id});w.selectedObjectId=source.id;w.selectedFaceId=face.faceId;const child=spawnKnowledgeObject(r,knowledge,face.conceptId);assert.ok(child);assert.equal(w.items.length,2);
 const displacement=new THREE.Vector3(child.position.x,child.position.y,child.position.z);assert.ok(displacement.dot(new THREE.Vector3(face.localNormal.x,face.localNormal.y,face.localNormal.z))>.32);
 child.position.x+=.7;rotateKnowledgeObject(child,.4,.2);const before=JSON.stringify(child);w.selectedObjectId=source.id;knowledgeObjectAction(r,'KnowledgeObjectCollapse');assert.deepEqual(visibleKnowledgeObjects(w).map(o=>o.id),[source.id]);knowledgeObjectAction(r,'KnowledgeObjectCollapse');assert.equal(visibleKnowledgeObjects(w).length,2);assert.equal(JSON.stringify(child),before);
 const link=w.connectors[0],a=knowledgeConnectorAnchors(w,link);knowledgeObjectAction(r,'KnowledgeObjectSize:1.3');ensureKnowledgeObjects(r,knowledge);const b=knowledgeConnectorAnchors(w,link);assert.notDeepEqual(a.start,b.start);assert.equal(w.items.every(o=>o.scale===1.3),true);setPimoDeveloperOverride(false);
});
test('full authored overflow is accessible through face pages',()=>{
 const r=record();knowledgeExplorer(r);const custom={title:'Many',categories:Array.from({length:15},(_,i)=>({id:'n'+i,path:'n'+i,label:'Topic '+i,children:[]}))},w=ensureKnowledgeObjects(r,custom),ids=new Set();
 for(let i=0;i<3;i++){w.items[0].faces.forEach(f=>ids.add(f.conceptId));knowledgeObjectAction(r,'KnowledgeObjectFaces');ensureKnowledgeObjects(r,custom);}assert.equal(ids.size,15);
});
test('session re-entry keeps selected topic, open branches, reading page and object arrangement',()=>{
 const r=record();const state=knowledgeExplorer(r);r.demoSelectedNodeId='food-forest';r.demoExpandedNodeIds=['food-forest'];state.readingPage=3;state.selectedConceptId='food-forest';state.objects={version:1,items:[{id:'object:core',position:{x:.6,y:.3,z:.2}}],connectors:[]};preserveKnowledgeContext(r);
 const next={...record(),name:r.name},resumed=knowledgeExplorer(next);assert.equal(next.demoSelectedNodeId,'food-forest');assert.equal(resumed.readingPage,3);assert.deepEqual(resumed.objects,state.objects);
});
test('floor toy bounces, settles and stays within reach at each Quest refresh rate',()=>{
 for(const hz of [60,72,90,120]){const p=createHeroDicePhysics({x:0,y:0,z:0});p.state.position.y=1;p.state.velocity={x:4.5,y:3,z:1.4};let bounced=false,lastV=p.state.velocity.y;
  for(let i=0;i<hz*12;i++){p.step(1/hz);if(lastV<-.5 && p.state.velocity.y>0)bounced=true;lastV=p.state.velocity.y;assert.ok(p.state.position.y>=.13-1e-8);assert.ok(Math.hypot(p.state.position.x,p.state.position.z)<=HERO_TOY_REACH+1e-8);assert.ok(Object.values(p.state.position).every(Number.isFinite));}
  assert.ok(bounced);assert.equal(p.state.velocity.y,0);assert.ok(Math.abs(p.state.position.y-.13)<1e-8);
 }
});
test('the actual Totem collar uses configurable cyan and expires without an extra mesh',()=>{
 assert.equal(totemNotificationLight({},100).strength,0);const r={signBeaconStartedAt:0};assert.equal(totemNotificationLight(r,300).colour,TOTEM_NOTIFICATION_COLOUR);assert.ok(totemNotificationLight(r,300).strength>0);assert.equal(totemNotificationLight(r,13000).strength,0);
});
test('reused XRFrame wrappers refresh hands, share one frame sample and clear missing poses',()=>{
 const names=[...new Set(XR_HAND_JOINT_CONNECTIONS.flat())],source={hand:new Map(names.map(n=>[n,n])),handedness:'right'},space={};let x=0,lost=false;
 const frame={getJointPose:()=>lost?null:{transform:{matrix:new THREE.Matrix4().makeTranslation(x,0,-.5).elements},radius:.008},getPose:()=>null};
 beginHandTrackingFrame(frame,100);const first=handTrackingState(frame,source,space);assert.equal(handTrackingState(frame,source,space),first);assert.equal(first.visualConfidence,1);
 x=.2;beginHandTrackingFrame(frame,116);const next=handTrackingState(frame,source,space);assert.notEqual(next,first);assert.ok(next.joints.get('wrist').x>0);lost=true;beginHandTrackingFrame(frame,132);const missing=handTrackingState(frame,source,space);assert.equal(missing.tracked,false);assert.equal(missing.visualConfidence,0);assert.equal(missing.pointer,null);
});
test('controller face requires 500 ms and consumes short release and trailing select',()=>{
 enableHarness();const original=globalThis.performance;let time=0;globalThis.performance={now:()=>time};try{
 const r=record();knowledgeExplorer(r).mode='explore';const w=ensureKnowledgeObjects(r,knowledge),s=new Session(),source={targetRayMode:'tracked-pointer',targetRaySpace:{},gripSpace:{}};s.inputSources=[source];let activations=0;
 const target={record:r,object:w.items[0],pose:basis,face:w.items[0].faces[0],node:{pimKnowledgeFace:true}},input=bindKnowledgeObjectInteraction(s,{}, {hit:()=>target,near:()=>null,onActivate:()=>activations++}),frame={getPose:()=>pose};
 const event=type=>{const e=new Event(type,{cancelable:true});Object.defineProperty(e,'inputSource',{value:source});s.dispatchEvent(e);};input.update(frame);event('selectstart');time=200;input.update(frame);event('selectend');event('select');assert.equal(activations,0);
 time=700;event('selectstart');time=1199;input.update(frame);assert.equal(activations,0);time=1200;input.update(frame);assert.equal(activations,1);time=1400;input.update(frame);event('selectend');event('select');assert.equal(activations,1);input.destroy();
 }finally{globalThis.performance=original;setPimoDeveloperOverride(false);}
});
test('index contact must be deliberate and held; whole-hand brushing only highlights',()=>{
 const source={},r=record();let presses=0,hovered=false;const interaction=createHandSurfaceInteraction({hitPoint:p=>p?{record:r,card:{id:'face'},button:{action:'face'},distance:Math.abs(p.z),signedDistance:p.z}:null,holdDuration:()=>500,onPress:()=>presses++,onHover:t=>hovered=Boolean(t)});
 const state=z=>({tracked:true,pinch:false,rawJoints:new Map([['wrist',{x:0,y:-.2,z}],['index-finger-phalanx-proximal',{x:0,y:-.14,z}],['index-finger-phalanx-intermediate',{x:0,y:-.07,z}],['index-finger-tip',{x:0,y:0,z,radius:.008}]])});
 interaction.update([{source,state:state(.025)}],0);assert.ok(hovered);interaction.update([{source,state:state(.02)}],16);interaction.update([{source,state:state(.009)}],32);assert.equal(presses,0);for(let t=48;t<=528;t+=16)interaction.update([{source,state:state(.009)}],t);interaction.update([{source,state:state(.009)}],531);assert.equal(presses,0);interaction.update([{source,state:state(.009)}],532);assert.equal(presses,1);interaction.update([{source,state:state(.009)}],548);assert.equal(presses,1);interaction.destroy();
});
