import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spatialDepthDelta } from '../app/services/spatialMoveControl.js';
import { applySpatialNoteTemplate, SPATIAL_NOTE_TEMPLATES } from '../app/services/spatialNoteTemplates.js';

const read = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('right-stick depth movement has a quiet centre, acceleration and bounds-ready direction',()=>{
    assert.equal(spatialDepthDelta(.2,16),0);
    assert.ok(spatialDepthDelta(-.5,16)>0,'stick up moves farther');
    assert.ok(spatialDepthDelta(.5,16)<0,'stick down moves nearer');
    assert.ok(Math.abs(spatialDepthDelta(-1,16))>Math.abs(spatialDepthDelta(-.5,16)));
    assert.ok(Math.abs(spatialDepthDelta(-1,500))<=.0451,'a delayed frame cannot jump the object');
});

test('shared Note templates change type without changing spatial identity',()=>{
    assert.deepEqual(SPATIAL_NOTE_TEMPLATES.map(item=>item.id),['welcome','pollinators','snake-warning','observation']);
    const marker={id:'note-1',type:'note',position:{x:1,y:2,z:3},appearance:{opacity:1}};
    const changed=applySpatialNoteTemplate(marker,'snake-warning');
    assert.equal(changed.id,marker.id);
    assert.deepEqual(changed.position,marker.position);
    assert.equal(changed.appearance.note_template,'snake-warning');
    assert.equal(changed.appearance.surface,'outline');
    assert.ok(changed.appearance.opacity<=.78);
    assert.ok(changed.appearance.live_note.topics.length>0);
});

test('immersive Plant Live Tag stays spatial in Demo and Creator Mode',()=>{
    const demo=read('app/screens/temporaryArDemo.js');
    const creator=read('app/screens/arMode.js');
    assert.match(demo,/function openDemoVirtualTag\(record\)[\s\S]*if \(!simulatedMode \|\| session\)[\s\S]*advancePastVirtualTag\(record\)/);
    assert.match(demo,/liveTagButton\.hidden = !simulatedMode \|\| !controls\.showOpenPlantLiveTag/);
    assert.match(creator,/if \(questHeadsetSession && gl\)[\s\S]*questSpatialDashboardMirror = createSpatialDashboardMirror/);
    assert.match(creator,/launchedSession\.addEventListener\('selectstart', event => \{\s*if\(event\.inputSource\.hand\) return/);
});
