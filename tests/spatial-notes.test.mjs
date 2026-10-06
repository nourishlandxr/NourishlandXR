import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialNote,spatialNoteEnabled,noteStarter,noteWidgetPlacement} from '../app/services/spatialNotes.js';
import {noteWidgetLibrary,createNoteWidget,interactNoteWidget,renderNoteWidget,saveNoteWidgetState,loadNoteWidgetState,timerRemaining,registerNoteWidget} from '../app/services/noteWidgets.js';
import {focusSpatialObjectControls} from '../app/services/spatialObjectControls.js';
import {captureDemoScene,restoreDemoScene} from '../app/services/demoSceneHistory.js';
import {createKnowledgeArchitectureGeometry} from '../app/services/knowledgeArchitectureGeometry.js';
import {knowledgeFacetRegions} from '../app/services/knowledgeObjectRenderer.js';

test('legacy Notes remain Plain and Dynamic Notes have eight initial reusable widget types',()=>{
 const marker={id:'old',type:'note',name:'Keep this',notes:'Original information',appearance:{surface:'outline'}};
 assert.equal(spatialNote(marker).type,'plain');assert.equal(spatialNoteEnabled(marker),false);assert.equal(marker.notes,'Original information');
 assert.deepEqual(noteWidgetLibrary().map(item=>item.type),['thick-box','image','checklist','timer','plant-list','task','tip','clue']);
 const starter=noteStarter('timed');assert.equal(starter.note.widgets.length,5);assert.equal(starter.note.widgets.find(item=>item.type==='timer').configuration.seconds,345600);
 assert.equal(new Set(noteStarter('timed').note.widgets.map(item=>item.id)).size,5);
});
test('visitor checklist, task, hints and plant list have independent persisted state',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)},marker={id:'note-1'};
 const checklist=createNoteWidget('checklist',{content:'Gloves\nWater'}),task=createNoteWidget('task');
 let state=interactNoteWidget(checklist,{},'check:1');saveNoteWidgetState(marker,checklist,state,storage);
 assert.deepEqual(loadNoteWidgetState(marker,checklist,storage),{checked:[1]});assert.deepEqual(loadNoteWidgetState(marker,task,storage),{});
 state=interactNoteWidget(checklist,state,'check:1');assert.deepEqual(state.checked,[]);
 assert.equal(interactNoteWidget(task,{},'complete').complete,true);
 assert.equal(interactNoteWidget(createNoteWidget('clue'),{},'reveal').revealed,true);
 const list=createNoteWidget('plant-list');assert.deepEqual(interactNoteWidget(list,{},'add',0,'  <plant>  ').items,['<plant>']);
 assert.match(renderNoteWidget(list,{items:['<plant>']}),/&lt;plant&gt;/);
 storage.setItem('nlxr.note-state.v1:note-1:'+task.id,'null');assert.deepEqual(loadNoteWidgetState(marker,task,storage),{});
});
test('timer uses a saved deadline across reloads and can reset',()=>{
 const timer=createNoteWidget('timer',{configuration:{seconds:240}}),state=interactNoteWidget(timer,{},'start',1000);
 assert.equal(state.endsAt,241000);assert.equal(timerRemaining(timer,JSON.parse(JSON.stringify(state)),61000),180);
 assert.equal(timerRemaining(timer,state,242000),0);assert.match(renderNoteWidget(timer,state,242000),/Timer complete/);
 assert.equal(interactNoteWidget(timer,state,'reset').endsAt,null);
});
test('spatial placement keeps five widgets separate from the anchor and each other',()=>{
 const bays=noteWidgetPlacement(10);assert.equal(bays.length,5);
 const withPicker=noteWidgetPlacement(6,true);assert.equal(withPicker.length,6);assert.equal(withPicker[5].width,.86);
 const boxes=[{x:0,y:0,width:.6,height:.38},...bays];
 for(const [i,a] of boxes.entries())for(const b of boxes.slice(i+1))assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2 || Math.abs(a.y-b.y)>=(a.height+b.height)/2);
});
test('creator Controls open the connected Add Widget clone instead of creating an editor screen',async()=>{
 let context,edited,opened,saves=0;const panel={showLearning(){},setObjectContext:value=>context=value},record={marker:{id:'n',type:'note',name:'Observation',notes:'Keep this',appearance:{}}};
 focusSpatialObjectControls(panel,record,{save:async value=>{saves++;value.marker=structuredClone(value.marker);},edit:(_record,id)=>edited=id,open:(_record,options)=>opened=options});
 await context.onAction('type:dynamic');assert.equal(spatialNote(record.marker).type,'dynamic');assert.equal(record.marker.notes,'Keep this');
 await context.onAction('library');assert.equal(spatialNote(record.marker).widgets.length,0);assert.equal(edited,undefined);assert.equal(saves,1);assert.deepEqual(opened,{expandWidgets:true,showAddPanel:true});
 assert.ok(context.actions.find(item=>item.id==='library'));
});
test('Totem Controls own style, light and explicit signage labels, with failed-save rollback',async()=>{
 let context,hint;const panel={showLearning(){},setObjectContext:value=>context=value,setContextualHint:value=>hint=value},record={marker:{type:'area_checkpoint',name:'Area 2',appearance:{signsVisible:true}},totemSignsVisible:true,infoVisible:true};
 focusSpatialObjectControls(panel,record);assert.equal(context.actions.find(item=>item.id==='signs').label,'Hide signage');
 await context.onAction('signs');assert.equal(record.totemSignsVisible,false);assert.equal(context.actions.find(item=>item.id==='signs').label,'Show signage');
 await context.onAction('style:basic');assert.equal(record.marker.appearance.totemStyle,'basic');assert.equal(record.marker.appearance.totemStyleExplicit,true);
 await context.onAction('light:#eaa8b9');assert.equal(record.marker.appearance.notificationColor,'#eaa8b9');
 focusSpatialObjectControls(panel,record,{save:async()=>{throw Error('offline');}});await context.onAction('signs');assert.equal(record.totemSignsVisible,false);assert.match(hint,/offline/);
 assert.ok(!context.actions.some(item=>item.id==='library'));
});
test('Back restores Orbs, opened cells, Notes and positions while retaining GPU resources and record identity',()=>{
 const gpu={},orb={id:'orb',type:'plant',name:'Plant',position:{x:1,y:1,z:-2},demoExpanded:true,demoExpandedNodeIds:['uses'],demoSelectedNodeId:'culinary',texture:gpu},note={id:'note',type:'note',appearance:{spatial_note:{type:'dynamic',widgets:[]}}};
 const snapshot=captureDemoScene([orb,note]);orb.position.x=99;orb.demoExpanded=false;orb.demoExpandedNodeIds=[];note.appearance.spatial_note.type='plain';
 const restored=restoreDemoScene(snapshot);assert.equal(restored[0],orb);assert.equal(orb.position.x,1);assert.equal(orb.demoExpanded,true);assert.deepEqual(orb.demoExpandedNodeIds,['uses']);assert.equal(orb.texture,gpu);assert.equal(note.appearance.spatial_note.type,'dynamic');
});
test('architecture ray facets are read from the actual mesh and cached rather than rebuilt per pointer test',()=>{
 const geometry=createKnowledgeArchitectureGeometry(.16);const first=knowledgeFacetRegions(geometry);assert.equal(knowledgeFacetRegions(geometry),first);
 for(let i=0;i<first.length;i++)assert.equal(first[i],geometry.attributes.region.getX(i*3));geometry.dispose();
});

test('demo slide navigation retains authored Note widgets and glass colour',()=>{
 const note={id:'note',demoType:'note',name:'Original',appearance:{color:'#29493c',spatial_note:{type:'plain',widgets:[]}},position:{x:0,y:1,z:-1}};
 const snapshot=captureDemoScene([note]);note.appearance={color:'#53405e',spatial_note:{type:'dynamic',widgets:[{id:'timer',type:'timer'}]}};
 restoreDemoScene(snapshot,{preserveNotes:true});assert.equal(note.appearance.color,'#53405e');assert.equal(note.appearance.spatial_note.widgets.length,1);
});
test('new reusable widget types register without changing Dynamic Note placement',()=>{
 registerNoteWidget({type:'test-observation',label:'Test observation',category:'Information',render:()=>'<p>Registered</p>'});
 assert.match(renderNoteWidget(createNoteWidget('test-observation')),/Registered/);assert.equal(noteWidgetPlacement(1).length,1);
});
