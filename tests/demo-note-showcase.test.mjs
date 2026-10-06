import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {mountDemoNoteShowcase} from '../app/services/demoNoteShowcase.js';
import {resolveNoteCardButton} from '../app/services/noteSpatialRenderer.js';
import {noteSurfaceOwnsRay} from '../app/services/demoNoteRouting.js';
import {beeWingsAtRest} from '../app/services/demoAmbientLife.js';
import {applyBeeWingPose} from '../app/services/demoBeeXR.js';
import {createDemoFeedback,DEMO_FEEDBACK} from '../app/services/demoFeedback.js';
import {createHeroDicePhysics} from '../app/services/heroDiceToy.js';
import {initializeExplorerPreview,explorerMoleculeView,selectExplorerNode,explorerNodePosition,explorerChildFrame} from '../app/services/explorerMoleculeModel.js';
import {bindExplorerMoleculeInteraction} from '../app/services/explorerMoleculeInteraction.js';
import {PIGEON_PEA_AR_KNOWLEDGE as knowledge} from '../app/services/pigeonPeaExample.js';
class Root extends EventTarget {innerHTML='';replaceChildren(){this.innerHTML='';}}
test('Note pencil previews a sample on the Note, resets, and adds a widget only after the arm chooser',()=>{
 const root=new Root(),note={id:'sample',name:'Note',description:'Original',appearance:{}},changed=[];
 const ui=mountDemoNoteShowcase(root,note,{onChange:item=>changed.push(item.description)});
 ui.action('edit');assert.match(root.innerHTML,/Try sample edit/);assert.doesNotMatch(root.innerHTML,/<form|<input|<textarea/);
 ui.action('sample');assert.notEqual(note.description,'Original');ui.action('reset');assert.equal(note.description,'Original');
 ui.action('widget:timer');assert.equal(note.appearance.spatial_note,undefined);
 ui.action('add');assert.match(root.innerHTML,/data-note-widget="demo-add-arm"/);assert.match(root.innerHTML,/Choose what belongs/);
 ui.action('widget:timer');assert.equal(note.appearance.spatial_note.widgets.length,1);assert.equal(note.appearance.spatial_note.widgets[0].configuration.seconds,120);assert.doesNotMatch(root.innerHTML,/demo-add-arm/);
 ui.action('add');ui.action('cancel-arm');assert.equal(note.appearance.spatial_note.widgets.length,1);ui.destroy();assert.equal(root.innerHTML,'');
});
test('Note surfaces do not steal Continue or Control panel rays, including misses',()=>{
 assert.equal(noteSurfaceOwnsRay(null,[]),false);assert.equal(noteSurfaceOwnsRay({distance:1.5},[{distance:1}]),false);
 assert.equal(noteSurfaceOwnsRay({distance:.8},[{distance:1.1},null]),true);assert.equal(noteSurfaceOwnsRay({distance:1},[{distance:1}]),false);
});
test('native Note presses resolve live buttons after a timer replaces unchanged card markup',()=>{
 const stale={id:'old'},live={id:'new'},close={id:'close'};let buttons=[stale];
 const root={querySelector:selector=>selector==='[data-note-close]'?close:{querySelectorAll:()=>buttons}};
 assert.equal(resolveNoteCardButton(root,'main',0,stale),stale);buttons=[live];
 assert.equal(resolveNoteCardButton(root,'main',0,stale),live);assert.equal(resolveNoteCardButton(root,'main',1),close);
 assert.equal(resolveNoteCardButton(root,'main',-1,stale),stale);
});
test('pointer contact or avoidance cannot leave nectar wings at rest in flight',()=>{
 assert.equal(beeWingsAtRest({nectar:true}),true);assert.equal(beeWingsAtRest({nectar:true,pointerContact:true}),false);
 assert.equal(beeWingsAtRest({nectar:true,displacement:.03}),false);assert.equal(beeWingsAtRest({nectar:true,flyby:.3}),false);
});
test('a shared bee rig resumes original wing motion even on a same-time rest-to-flight transition',()=>{
 const bone=new THREE.Object3D(),rotation=bone.quaternion.clone(),position=bone.position.clone(),scale=bone.scale.clone();
 const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),.8),track=new THREE.QuaternionKeyframeTrack('wing.quaternion',[0,1],[0,0,0,1,q.x,q.y,q.z,q.w]);
 const model={wingRest:[{bone,rotation,position,scale}],hoverAction:{time:.5},wingAnimation:[{bone,property:'quaternion',interpolant:track.createInterpolant()}]};
 applyBeeWingPose(model,false);const flying=bone.quaternion.clone();assert.ok(flying.angleTo(rotation)>.3);
 applyBeeWingPose(model,true);assert.ok(bone.quaternion.equals(rotation));applyBeeWingPose(model,false);assert.ok(bone.quaternion.angleTo(flying)<1e-6);
 model.hoverAction.time=.7;applyBeeWingPose(model,false);assert.ok(bone.quaternion.angleTo(flying)>.1);
});
test('soft ambient buzz is continuous, muted by Haptics, and stops when bees leave',()=>{
 const pulses=[],source={gamepad:{hapticActuators:[{pulse:(...args)=>{pulses.push(args);return Promise.resolve();}}]}},fx=createDemoFeedback();
 for(const time of [120,240,360])fx.tick(time,{sources:[source],beeAround:true});
 assert.equal(pulses.length,3);assert.ok(pulses.every(([strength,duration])=>strength>0 && strength<=DEMO_FEEDBACK.beeBuzzStrength && duration===145));
 fx.tick(480,{sources:[source]});assert.deepEqual(pulses.at(-1),[0,1]);fx.setHaptics(false);const before=pulses.length;fx.tick(600,{sources:[source],beeAround:true});assert.equal(pulses.length,before);fx.destroy();
});
test('dice landing emits impact feedback, resting micro-collisions do not',()=>{
 const impacts=[],physics=createHeroDicePhysics({x:0,y:0,z:0},{onImpact:value=>impacts.push(value)});physics.state.position.y=1;
 for(let i=0;i<180;i++)physics.step(1/120);assert.ok(impacts.length>0);assert.ok(impacts.every(impact=>impact.speed>.65));
 const count=impacts.length;for(let i=0;i<180;i++)physics.step(1/120);assert.equal(impacts.length,count);
});
test('Explorer branches share colour, child cells have multiple outputs and independent grip ownership',()=>{
 const record={knowledgeExplorer:{mode:'explore',revision:0}},state=initializeExplorerPreview(record,knowledge,0);
 for(const id of state.wings)selectExplorerNode(record,knowledge,{explorerNodeId:id},0);
 const field=explorerMoleculeView(record,knowledge,1,2000,true),child=field.nodes.find(node=>node.depth===2),other=field.nodes.find(node=>node.depth===2 && node.id!==child.id),object=state.nodeObjects[child.id];
 assert.ok(object);assert.ok(child.outputs.length>=2);
 for(const node of field.nodes.filter(node=>node.depth>1)){
  const parent=field.nodes.find(item=>item.id===node.domainId),tone=new THREE.Color(node.colour).getHSL({h:0,s:0,l:0}),base=new THREE.Color(parent.colour).getHSL({h:0,s:0,l:0});
  assert.ok(Math.abs(tone.h-base.h)<.005);assert.ok(Math.abs(tone.l-base.l)>.1);
 }
 assert.equal(new Set(field.nodes.filter(node=>node.depth===1).map(node=>node.colour)).size,3);
 class Session extends EventTarget {inputSources=[];visibilityState='visible';}
 const session=new Session(),source={targetRaySpace:{},gripSpace:{}};session.inputSources=[source];
 const frameMatrix=explorerChildFrame(state,field.index,child.id),pose={position:new THREE.Vector3().setFromMatrixPosition(frameMatrix),right:new THREE.Vector3().setFromMatrixColumn(frameMatrix,0),up:new THREE.Vector3().setFromMatrixColumn(frameMatrix,1),normal:new THREE.Vector3().setFromMatrixColumn(frameMatrix,2)};
 let matrix=new THREE.Matrix4();const input=bindExplorerMoleculeInteraction(session,{}, {hit:()=>({record,knowledge,object,pose,node:child,face:{faceId:child.id}}),near:()=>null});
 const frame={getPose:()=>({transform:{matrix:matrix.elements}})},event=type=>{const e=new Event(type);Object.defineProperty(e,'inputSource',{value:source});session.dispatchEvent(e);};
 input.update(frame);event('squeezestart');assert.equal(input.active.target.object,object);
 const before=explorerNodePosition(state,field.index,child.id),unchanged=explorerNodePosition(state,field.index,other.id);matrix.makeTranslation(.12,.05,-.03);input.update(frame);
 const after=explorerNodePosition(state,field.index,child.id);assert.ok(Math.abs(after.x-before.x-.12)<1e-6);assert.deepEqual(explorerNodePosition(state,field.index,other.id),unchanged);
 event('squeezeend');assert.equal(input.active,null);input.destroy();
});
