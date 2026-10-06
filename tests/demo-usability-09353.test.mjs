import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {noteKeyboardValue} from '../app/services/spatialNoteEditor.js';
import {rebaseDemoRecords,rebaseXrMatrix} from '../app/services/xrWorldRebase.js';
import {diceShadowAppearance} from '../app/services/diceGroundShadow.js';
import {initializeExplorerPreview,explorerMoleculeView,selectExplorerNode} from '../app/services/explorerMoleculeModel.js';
import {PIGEON_PEA_AR_KNOWLEDGE as knowledge} from '../app/services/pigeonPeaExample.js';
import {createDemoFeedback,DEMO_FEEDBACK} from '../app/services/demoFeedback.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Note editing uses a bounded native keyboard, never an HTML capture',()=>{
 const code=read('app/services/spatialNoteEditor.js'),demo=read('app/screens/temporaryArDemo.js');
 assert.doesNotMatch(code,/html2canvas|requestAnimationFrame|setInterval/);
 assert.equal(noteKeyboardValue('abc','⌫'),'ab');assert.equal(noteKeyboardValue('a','b',true),'aB');assert.equal(noteKeyboardValue('https:','/'),'https:/');assert.equal(noteKeyboardValue('🐝','⌫'),'');
 const notes=demo.slice(demo.indexOf('function openDemoNoteExperience'),demo.indexOf('function placeMarker'));
 assert.match(notes,/showNativeDemoNoteEditor/);assert.doesNotMatch(notes,/createSpatialDashboardMirror/);
 assert.match(demo,/function showNativeDemoNoteEditor[\s\S]*?createSpatialNoteEditor/);
 assert.match(code,/if\(destroyed\)return/);assert.match(code,/root\.removeEventListener\('input',refresh\)/);
});
test('reference-space reset rebases placed Orbs and axes exactly once without changing knowledge',()=>{
 const position={x:2,y:1,z:-3},right={x:1,y:0,z:0},record={position,informationPose:{position,right,up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}},demoExpanded:true};
 const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,3,.2,-1,1];
 rebaseDemoRecords([record],matrix);assert.deepEqual(position,{x:5,y:1.2,z:-4});assert.deepEqual(right,{x:1,y:0,z:0});assert.equal(record.demoExpanded,true);
 const anchor=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,2,1,-3,1]);rebaseXrMatrix(anchor,matrix);assert.equal(anchor[12],5);assert.equal(anchor[14],-4);
});
test('mode-only Explorer provides three compact branches and preserves existing state',()=>{
 const record={knowledgeExplorer:{mode:'explore',revision:0}};const state=initializeExplorerPreview(record,knowledge,1000);
 assert.equal(state.wings.length,3);assert.equal(explorerMoleculeView(record,knowledge,1,2000).nodes.length,4);
 const first=state.wings[0];assert.equal(selectExplorerNode(record,knowledge,{explorerNodeId:first},2000),true);
 const before=state.revision;initializeExplorerPreview(record,knowledge,3000);assert.equal(state.revision,before);
 const renderer=read('app/services/knowledgeSpatialRenderer.js');assert.ok(renderer.indexOf("mode==='explore'")<renderer.indexOf('recordSurfaces=knowledgeSurfaces'));
 const panel=read('app/services/pimInfoPanel.js'),controls=panel.slice(panel.indexOf('function explorerControls'),panel.indexOf('const explorerHeight'));
 assert.doesNotMatch(controls,/pimToArKnowledge|CellOpacity|KnowledgeSave|KnowledgeMolecule/);assert.match(panel,/cellOpacity:meshCellOpacity/);
});
test('dice shadow softens and expands as a dice is lifted',()=>{
 const ground=diceShadowAppearance({y:.19},0),high=diceShadowAppearance({y:1.19},0);assert.ok(high.radius>ground.radius);assert.ok(high.opacity<ground.opacity);assert.ok(ground.opacity<=.3);
});
test('each close bee encounter sends one gentle haptic and contact is stronger',()=>{
 const pulses=[],source={gamepad:{hapticActuators:[{pulse:(...values)=>{pulses.push(values);return Promise.resolve();}}]}},feedback=createDemoFeedback();
 feedback.tick(100,{sources:[source],beeEncounters:['0:1']});assert.deepEqual(pulses[0],[DEMO_FEEDBACK.beeApproachStrength,40]);
 feedback.tick(1600,{sources:[source],beeEncounters:['0:1']});assert.equal(pulses.filter(p=>p[0]>0).length,1);
 feedback.tick(1800,{sources:[source],beeEncounters:['1:1']});assert.equal(pulses.filter(p=>p[0]>0).length,2);
 feedback.tick(2900,{sources:[source],beeContactSources:[source]});assert.deepEqual(pulses.at(-1),[DEMO_FEEDBACK.beeStrength,45]);feedback.destroy();
});
