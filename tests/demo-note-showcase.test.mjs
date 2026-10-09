import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {mountDemoNoteShowcase} from '../app/services/demoNoteShowcase.js';
import {resolveNoteCardButton,noteAnchorPose} from '../app/services/noteSpatialRenderer.js';
import {noteSurfaceOwnsRay} from '../app/services/demoNoteRouting.js';
import {beeWingsAtRest} from '../app/services/demoAmbientLife.js';
import {applyBeeWingPose} from '../app/services/demoBeeXR.js';
import {createDemoFeedback,DEMO_FEEDBACK} from '../app/services/demoFeedback.js';
import {createHeroDicePhysics} from '../app/services/heroDiceToy.js';
import {initializeExplorerPreview,explorerMoleculeView,selectExplorerNode,explorerNodePosition,explorerChildFrame,chooseExplorerWing,prepareExplorerConnection,alignExplorerPuzzle,commitExplorerPuzzle,explorerMoleculeIndex} from '../app/services/explorerMoleculeModel.js';
import {bindExplorerMoleculeInteraction} from '../app/services/explorerMoleculeInteraction.js';
import {PIGEON_PEA_AR_KNOWLEDGE as knowledge} from '../app/services/pigeonPeaExample.js';
class Root extends EventTarget {innerHTML='';replaceChildren(){this.innerHTML='';}}
test('Note chooser offers four choices and transforms its connected card with a stable identity',()=>{
 const root=new Root(),note={id:'sample',name:'Note',description:'Original',appearance:{}},changed=[];
 const ui=mountDemoNoteShowcase(root,note,{onChange:item=>changed.push(item.description)});
 assert.doesNotMatch(root.innerHTML,/data-note-close|data-demo-note="edit"|<form|<input|<textarea/);
 ui.action('widget:timer');assert.equal(note.appearance.spatial_note,undefined);
 ui.action('add');const id=root.innerHTML.match(/data-note-widget="([^"]+)"/)[1];
 assert.match(root.innerHTML,/Timer/);assert.match(root.innerHTML,/Checkbox/);assert.match(root.innerHTML,/Extra panel/);assert.match(root.innerHTML,/Photo/);assert.doesNotMatch(root.innerHTML,/cancel-arm|data-note-close/);
 ui.action('widget:timer');assert.equal(note.appearance.spatial_note.widgets.length,1);assert.equal(note.appearance.spatial_note.widgets[0].id,id);assert.equal(note.appearance.spatial_note.widgets[0].configuration.seconds,864000);
 assert.equal(note.description,'Original');assert.doesNotMatch(root.innerHTML,/note-widget-picker/);ui.destroy();assert.equal(root.innerHTML,'');
});
test('Note surfaces do not steal Continue or Control panel rays, including misses',()=>{
 assert.equal(noteSurfaceOwnsRay(null,[]),false);assert.equal(noteSurfaceOwnsRay({distance:1.5},[{distance:1}]),false);
 assert.equal(noteSurfaceOwnsRay({distance:.8},[{distance:1.1},null]),true);assert.equal(noteSurfaceOwnsRay({distance:1},[{distance:1}]),false);
});

test('adding widgets keeps the original Note plane despite headset pitch and roll',()=>{
 const record={position:{x:.5,y:1,z:-1}},viewer=new THREE.Matrix4().makeRotationZ(.7).elements;viewer[12]=0;viewer[14]=0;
 const before=noteAnchorPose(record,viewer);assert.deepEqual(before.up,{x:0,y:1,z:0});assert.equal(before.right.y,0);
 viewer[12]=2;viewer[14]=3;const after=noteAnchorPose(record,viewer);assert.deepEqual(after,before);
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
test('bees give a soft ambient buzz and a distinct short encounter pulse',()=>{
 const pulses=[],source={gamepad:{hapticActuators:[{pulse:(...args)=>{pulses.push(args);return Promise.resolve();}}]}},fx=createDemoFeedback();
 for(const time of [120,240,360])fx.tick(time,{sources:[source],beeAround:true});
 assert.equal(pulses.length,3);assert.ok(pulses.every(([strength,duration])=>strength>0 && strength<.1 && duration>=120));
 const beforeEncounter=pulses.length;
 fx.tick(480,{sources:[source],beeEncounters:['bee-1']});
 const encounterPulse=[DEMO_FEEDBACK.beeApproachStrength,DEMO_FEEDBACK.beeApproachDuration];
 assert.deepEqual(pulses.slice(beforeEncounter),[encounterPulse]);
 fx.tick(600,{sources:[source],beeEncounters:['bee-1']});
 assert.equal(pulses.slice(beforeEncounter).filter(([strength])=>strength>0).length,1,'the same encounter must not fire again');
 assert.equal(pulses.filter(([strength,duration])=>strength===encounterPulse[0]&&duration===encounterPulse[1]).length,1);
 fx.tick(720,{sources:[source],beeEncounters:['bee-2']});assert.deepEqual(pulses.at(-1),encounterPulse);
 assert.equal(pulses.filter(([strength,duration])=>strength===encounterPulse[0]&&duration===encounterPulse[1]).length,2,'a different bee still triggers its own encounter');
 fx.setHaptics(false);const before=pulses.length;fx.tick(840,{sources:[source],beeEncounters:['bee-3']});assert.equal(pulses.length,before);fx.destroy();
});
test('dice landing emits impact feedback, resting micro-collisions do not',()=>{
 const impacts=[],physics=createHeroDicePhysics({x:0,y:0,z:0},{onImpact:value=>impacts.push(value)});physics.state.position.y=1;
 for(let i=0;i<180;i++)physics.step(1/120);assert.ok(impacts.length>0);assert.ok(impacts.every(impact=>impact.speed>.65));
 const count=impacts.length;for(let i=0;i<180;i++)physics.step(1/120);assert.equal(impacts.length,count);
});
test('Explorer branches share colour, child cells have multiple outputs and independent grip ownership',()=>{
 const record={knowledgeExplorer:{mode:'explore',revision:0}},state=initializeExplorerPreview(record,knowledge,0);
 const assemble=()=>{alignExplorerPuzzle(record,knowledge);commitExplorerPuzzle(record,knowledge,0);alignExplorerPuzzle(record,knowledge);commitExplorerPuzzle(record,knowledge,0);};
 for(const id of knowledge.categories.slice(0,3).map(node=>node.id)){chooseExplorerWing(record,knowledge,id,0);assemble();selectExplorerNode(record,knowledge,{explorerNodeId:id},0);if(state.puzzle)assemble();for(const child of explorerMoleculeIndex(knowledge,record).nodes.get(id).children.slice(0,3)){if(!state.assembled.includes(id+'>'+child)){prepareExplorerConnection(record,knowledge,id,child,0);assemble();}}state.selectedId=id;}
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
