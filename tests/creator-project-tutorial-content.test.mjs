import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { CREATOR_PROJECT_TUTORIAL, CREATOR_PROJECT_TUTORIAL_STEP_IDS } from '../app/services/creatorProjectTutorialContent.js';

const root = path.resolve(import.meta.dirname, '..');
const spec = fs.readFileSync(path.join(root, 'docs/creator-project-tutorial-acceptance.md'), 'utf8');

test('Creator setup keeps the shared beginner sequence and stable stage IDs', () => {
    assert.deepEqual(CREATOR_PROJECT_TUTORIAL_STEP_IDS, [
        'project-identity',
        'geographic-origin',
        'load-map-information',
        'first-area',
        'first-record',
        'save-reopen-and-switch-views'
    ]);
    for (const item of CREATOR_PROJECT_TUTORIAL.steps) {
        assert.ok(item.heading.trim(), `${item.id} needs a heading`);
        assert.ok(item.body.trim(), `${item.id} needs body copy`);
        assert.ok(item.actions.length, `${item.id} needs an actionable next step`);
        assert.equal(new Set(item.actions.map(action => action.id)).size, item.actions.length, `${item.id} has duplicate action IDs`);
    }
});

test('geographic origin copy covers one project location and does not conflate physical anchors', () => {
    const origin = CREATOR_PROJECT_TUTORIAL.steps.find(item => item.id === 'geographic-origin');
    assert.match(origin.heading, /one geographic origin/i);
    assert.ok(origin.actions.some(item => item.id === 'use-device-location'));
    assert.ok(origin.actions.some(item => item.id === 'save-origin'));
    assert.ok(!origin.actions.some(item => item.id === 'choose-origin-on-map'), 'Do not advertise a map picker before it is implemented');
    assert.ok(origin.actions.some(item => item.id === 'enter-origin-coordinates'));
    assert.match(origin.note, /only after you choose/i);
    assert.match(origin.permissionDenied, /without enabling location access/i);
    assert.match(origin.distinction, /XR spatial anchor/i);
    assert.match(origin.distinction, /ArUco/i);
});

test('map and project failures retain progress and retry the same draft', () => {
    const map = CREATOR_PROJECT_TUTORIAL.steps.find(item => item.id === 'load-map-information');
    assert.match(map.unavailable, /Retry the map/i);
    assert.match(map.unavailable, /origin and finished steps stay/i);
    assert.match(CREATOR_PROJECT_TUTORIAL.navigation.back, /Completed details remain/i);
    assert.match(CREATOR_PROJECT_TUTORIAL.navigation.resume, /last completed step/i);
    assert.match(CREATOR_PROJECT_TUTORIAL.navigation.retry, /same project draft/i);
    assert.match(CREATOR_PROJECT_TUTORIAL.navigation.retry, /second project/i);
    assert.match(CREATOR_PROJECT_TUTORIAL.navigation.savePending, /not confirmed/i);
    assert.match(CREATOR_PROJECT_TUTORIAL.navigation.projectUnavailable, /same draft/i);
});

test('first Area and record copy handles both empty projects and current seeded defaults', () => {
    const area = CREATOR_PROJECT_TUTORIAL.steps.find(item => item.id === 'first-area');
    const record = CREATOR_PROJECT_TUTORIAL.steps.find(item => item.id === 'first-record');
    assert.match(area.existingArea, /not your first working Area/i);
    assert.match(area.existingArea, /choose an existing working Area or create one/i);
    assert.match(record.emptyProject, /no records yet/i);
    assert.match(record.existingExample, /Pigeon Pea/i);
    assert.match(record.existingExample, /does not complete your first-record step/i);
    assert.match(record.existingExample, /add your own record/i);
    assert.match(record.existingExample, /do not duplicate/i);
});

test('completion teaches save, reopen, same identities, and draft-only publication state', () => {
    const finish = CREATOR_PROJECT_TUTORIAL.steps.find(item => item.id === 'save-reopen-and-switch-views');
    assert.deepEqual(finish.checkpoints.map(item => item.id), ['draft-saved', 'project-reopened', 'flat-view-opened', 'imap-view-opened']);
    assert.match(finish.identityRule, /same project and record identities/i);
    assert.match(finish.note, /does not mean published|not published/i);
    assert.match(finish.completion, /stable identities/i);
});

test('cross-platform acceptance spec covers recovery, API gaps, IDs, and device gates', () => {
    for (const caseId of Array.from({ length: 14 }, (_, index) => `CP-${String(index + 1).padStart(2, '0')}`)) {
        assert.ok(spec.includes(caseId), `acceptance specification is missing ${caseId}`);
    }
    for (const platform of ['Website/desktop', 'Android Field/mobile browser', 'Unity/Quest']) assert.ok(spec.includes(platform));
    assert.match(spec, /creatorProjectGeography\.js/);
    assert.match(spec, /does not include geographic-origin or `mapData` fields/i);
    assert.match(spec, /current public shared-project projection is read-only/i);
    assert.match(spec, /ambiguous create timeout/i);
    assert.match(spec, /saved work remains unpublished/i);
});
