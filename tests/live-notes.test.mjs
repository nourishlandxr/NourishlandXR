import test from 'node:test';
import assert from 'node:assert/strict';
import {liveNoteTopics,liveNoteEnabled,liveNoteTree,INTRO_GROVES} from '../app/services/liveNotes.js';
test('Live Notes are opt-in and preserve note identity and original content',()=>{
 const note={id:'original',type:'note',name:'Guild',description:'Original',appearance:{color:'#ffffff'}};
 assert.equal(liveNoteEnabled(note),false);
 const changed={...note,appearance:{...note.appearance,live_note:{enabled:true,topics:liveNoteTopics('Area | Local information')}}};
 const reload=JSON.parse(JSON.stringify(changed));
 assert.equal(liveNoteEnabled(reload),true);assert.equal(reload.id,'original');assert.equal(liveNoteTree(reload).body,'Original');assert.equal(reload.appearance.color,'#ffffff');
 assert.equal(liveNoteTree(reload).children[0].body,'Local information');assert.equal(note.appearance.live_note,undefined);
});
test('Topic parsing preserves stable IDs, separator text and bounds',()=>{
 const topics=liveNoteTopics('Guild | A | B\nTechnique | Observe', [{id:'saved-id'}]);
 assert.equal(topics[0].id,'saved-id');assert.equal(topics[0].body,'A | B');assert.equal(topics[1].title,'Technique');
 assert.equal(liveNoteTopics(Array(30).fill('A | B').join('\n')).length,12);
});
test('Intro examples are separate from stored plant knowledge and have bounded branches',()=>{
 assert.deepEqual(INTRO_GROVES.map(n=>n.title),['Climate','Food forest','Landscape']);
 const inspect=n=>{assert.ok(n.title);assert.ok(n.body);assert.ok((n.children||[]).length<=6);(n.children||[]).forEach(inspect);};INTRO_GROVES.forEach(inspect);
});
