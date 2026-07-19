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

test('Creator Dashboard summons a spatial field panel without ending AR', () => {
    const arSource = read('app/services/arNote.js');
    assert.match(arSource, /function summonArDashboard/);
    assert.match(arSource, /arDashboardButton'\)\.addEventListener\('click', summonArDashboard\)/);
    assert.match(arSource, /viewerFacingPanelMatrix/);
    assert.match(arSource, /dashboardDistance = 1\.2/);
    assert.match(arSource, /Recenter/);
    assert.match(arSource, /Bring Closer/);
    assert.match(arSource, /Move Further Away/);
    assert.match(arSource, /Pin Here/);
    assert.match(arSource, /Exit AR and Open Full Dashboard/);
    assert.match(arSource, /Project: \$\{activeLocationName\}/);
    assert.match(arSource, /Location: \$\{activeSiteName\}/);
    assert.match(arSource, /Area: \$\{currentArea\}/);
    assert.match(arSource, /NEARBY/);
    assert.match(arSource, /UNPLACED/);
    assert.match(arSource, /TRACKING/);
});

test('AR Dashboard supports controller rays, grab events and phone positioning controls', () => {
    const arSource = read('app/services/arNote.js');
    assert.match(arSource, /targetRaySpace/);
    assert.match(arSource, /selectstart/);
    assert.match(arSource, /selectend/);
    assert.match(arSource, /squeezestart/);
    assert.match(arSource, /squeezeend/);
    assert.match(arSource, /move_dashboard/);
    assert.match(arSource, /dashboardHoverRegionId/);
    assert.match(arSource, /rayPositionedPanelMatrix/);
    assert.match(arSource, /AR Dashboard ·/);
    assert.match(arSource, /Your AR Dashboard/);
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

test('welcome Try It Now AR keeps its guidance visible and places an upright dashboard', () => {
    const source = read('app/screens/temporaryArDemo.js');
    const styles = read('app/style.css');
    assert.match(source, /requiredFeatures: \['dom-overlay', 'hit-test'\]/);
    assert.match(source, /domOverlay: \{ root: demoApp \}/);
    assert.match(source, /makeUprightPanelMatrix\(pos, latestViewerMatrix\)/);
    assert.match(source, /UNPACK_FLIP_Y_WEBGL, false/);
    assert.match(source, /Move your phone slowly to find a flat surface/);
    assert.match(styles, /\.temporary-ar-demo\.is-immersive \.temporary-demo-stage,[\s\S]*pointer-events: none;/);
    assert.match(styles, /\.temporary-demo-exit[\s\S]*pointer-events: auto;/);
});

test('Creator project AR uses an upright spatial dashboard without a debug overlay', () => {
    const source = read('app/screens/arMode.js');
    const styles = read('app/style.css');
    assert.doesNotMatch(source, /arDebugLog|dashboardOverlayMode|function dlog/);
    assert.match(source, /makeViewerFacingMatrix/);
    assert.match(source, /UNPACK_FLIP_Y_WEBGL, false/);
    assert.match(source, /domOverlay: \{ root: overlayRoot \}/);
    assert.match(source, /id = 'creatorArOverlay'/);
    assert.match(source, /creator-ar-session-active/);
    assert.match(source, /captureDashboardSnapshot\(dashboardRoot\)/);
    assert.match(source, /export function prepareArDashboardSnapshot/);
    assert.match(source, /preparedSnapshotFor\(dashboardRoot\)/);
    assert.match(source, /source\.cloneNode\(true\)/);
    assert.match(source, /dashboardStylesForSnapshot/);
    assert.match(source, /data-ar-window="dashboard"/);
    assert.match(source, /dashboardVisible = !dashboardVisible/);
    assert.match(source, /data-ar-recenter/);
    assert.match(source, /recenterDashboard = \(\) => \{ placed = false; \}/);
    assert.match(styles, /body\.creator-ar-session-active #app/);
    assert.match(styles, /\.creator-ar-taskbar/);
    assert.match(styles, /\.creator-ar-toolbox\.is-open/);
});
