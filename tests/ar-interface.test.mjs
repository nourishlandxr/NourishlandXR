import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('production AR diagnostics stay out of the camera interface', () => {
    const html = read('app/index.html');
    const arSource = read('app/services/arNote.js');
    assert.doesNotMatch(html, /arLaunchDiagnostics|ar-launch-diagnostics/);
    assert.doesNotMatch(arSource, /diagnostics\.hidden\s*=\s*false/);
    assert.doesNotMatch(arSource, /overlayStatus\.textContent\s*=\s*error\s*\?/);
    assert.match(arSource, /Developer Diagnostics|developerDiagnostics|Copy Diagnostics/i);
});

test('Creator AR exposes the persistent toolbar and compact quick-entry workflow', () => {
    const arSource = read('app/services/arNote.js');
    assert.match(arSource, /id="arDashboardButton"/);
    assert.match(arSource, /id="arAddButton"/);
    assert.match(arSource, /id="arSettingsButton"/);
    assert.match(arSource, /data-ar-add-type="plant"/);
    assert.match(arSource, /data-ar-add-type="sub_checkpoint"/);
    assert.match(arSource, /data-ar-add-type="note"/);
    assert.match(arSource, /Create New Area/);
    assert.match(arSource, /Leave Unassigned/);
    assert.match(arSource, /Placement preview/);
    assert.match(arSource, />Confirm</);
    assert.match(arSource, />Move</);
    assert.match(arSource, /saved and positioned/);
});

test('Creator AR tutorial has eight persisted contextual steps and replay controls', () => {
    const arSource = read('app/services/arNote.js');
    const progressSource = read('app/services/tutorialProgress.js');
    const tutorialBlock = arSource.slice(
        arSource.indexOf('const AR_TUTORIAL_STEPS'),
        arSource.indexOf('function escapeOverlayHtml')
    );
    const stepTitles = tutorialBlock.match(/title:\s*'/g) || [];
    assert.equal(stepTitles.length, 8);
    assert.match(progressSource, /not_started/);
    assert.match(progressSource, /in_progress/);
    assert.match(progressSource, /completed/);
    assert.match(progressSource, /skipped/);
    assert.match(arSource, /Skip Tutorial/);
    assert.match(arSource, /Replay AR Tutorial/);
    assert.match(arSource, /Restart Tutorial/);
});

test('WebXR hit testing and same-project session recovery remain wired', () => {
    const arSource = read('app/services/arNote.js');
    assert.match(arSource, /requiredFeatures:\s*\['hit-test'\]/);
    assert.match(arSource, /requestHitTestSource/);
    assert.match(arSource, /session\.addEventListener\('end'/);
    assert.match(arSource, /window\.renderProjectDashboard\(encodeURIComponent\(restoreProjectId\)\)/);
    assert.match(arSource, /nourishland-xr-active-creator-ar/);
    assert.match(read('app/main.js'), /recovery\?\.projectId/);
    assert.match(arSource, /Save and Exit/);
    assert.match(arSource, /Discard and Exit/);
    assert.match(arSource, /Continue Editing/);
});

test('AR launch failures use concise recovery controls with hidden technical details', () => {
    const explorerSource = read('app/screens/explorer.js');
    assert.match(explorerSource, /Check that camera access is allowed and try again/);
    assert.match(explorerSource, />Go Back</);
    assert.match(explorerSource, />Try Again</);
    assert.match(explorerSource, /View Technical Details/);
    assert.match(explorerSource, /id="arTechnicalDetails"[^>]*hidden/);
});
