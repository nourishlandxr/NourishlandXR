import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('legacy AR diagnostics stay out of the camera interface', () => {
    const html = read('app/index.html');
    const arSource = read('app/services/arNote.js');
    assert.doesNotMatch(html, /arLaunchDiagnostics|ar-launch-diagnostics/);
    assert.doesNotMatch(arSource, /diagnostics\.hidden\s*=\s*false/);
    assert.doesNotMatch(arSource, /overlayStatus\.textContent\s*=\s*error\s*\?/);
    assert.match(arSource, /getArDiagnostics/);
    assert.match(arSource, /copyArDiagnostics/);
});

test('Creator AR exposes the compact placement toolbar', () => {
    const arSource = read('app/screens/arMode.js');
    const taskbar = arSource.slice(
        arSource.indexOf('<nav class="creator-ar-taskbar"'),
        arSource.indexOf('</nav>', arSource.indexOf('<nav class="creator-ar-taskbar"'))
    );
    assert.match(arSource, /data-ar-window="tools"/);
    assert.match(arSource, /data-ar-place-picker/);
    assert.doesNotMatch(arSource, /creator-ar-toolbox/);
    assert.match(arSource, /function armPlacement\(type\)/);
    assert.match(arSource, /Tap the centre circle to place it/);
    assert.match(arSource, /EXIT AR/);
    assert.match(arSource, /What type of marker is this\?/);
    assert.match(arSource, /data-ar-placed-type="plant"/);
    assert.match(arSource, /data-ar-placed-type="sub_checkpoint"/);
    assert.match(arSource, /data-ar-placed-type="note"/);
    assert.doesNotMatch(arSource, /data-ar-web-mode/);
    assert.doesNotMatch(arSource, /data-ar-select-area/);
    assert.match(arSource, /data-ar-select-mode/);
    assert.doesNotMatch(taskbar, /data-ar-grab-mode|data-ar-reset|data-ar-recenter/);
    assert.equal((taskbar.match(/<button/g) || []).length, 3);
    assert.match(arSource, /data-ar-ready-place/);
    assert.match(arSource, /creator-ar-ready-ring/);
    assert.match(arSource, /<span class="creator-ar-ready-placement" role="button"/);
    assert.doesNotMatch(arSource, /<button class="creator-ar-ready-placement"/);
    assert.match(arSource, /readyPlacementControl\.addEventListener\('keydown'/);
});

test('Creator AR places lightweight drafts and keeps move and select modes exclusive', () => {
    const arSource = read('app/screens/arMode.js');
    const configSource = read('app/services/arExperienceConfig.js');
    const serverSource = read('tools/persistence-server.mjs');
    assert.match(arSource, /createPlaceMarker/);
    assert.match(arSource, /createProjectSite/);
    assert.match(arSource, /loadPlaceMarkers/);
    assert.match(arSource, /draftName = `\$\{baseName\} \(\$\{suffix\+\+\}\)`/);
    assert.match(arSource, /saveMarkerAnchor/);
    assert.match(arSource, /type: 'spatial'/);
    assert.match(arSource, /interactionMode = interactionMode === mode \? '' : mode/);
    assert.match(arSource, /Hand mode is on/);
    assert.match(arSource, /Pointer mode is on/);
    assert.match(arSource, /Interaction is off/);
    assert.match(arSource, /openInlineEditor/);
    assert.match(arSource, /openInlineEditor\(record, true\)/);
    assert.match(arSource, /requestAnimationFrame\(\(\) => editor\.querySelector\('textarea'\)\?\.focus\(\)\)/);
    assert.match(arSource, /finishMarkerDrag/);
    assert.match(arSource, /pointercancel/);
    assert.match(arSource, /setPointerCapture/);
    assert.match(arSource, /Hand mode is now off/);
    assert.match(arSource, /Move cancelled\. Hand mode is now off/);
    assert.match(arSource, /function resetArControls\(\)/);
    assert.match(arSource, /readyPlacementType = '';/);
    assert.match(arSource, /showPlacedMarkerActions\(record\)/);
    assert.match(arSource, /AR controls reset\. Press plus when you are ready to place a marker/);
    assert.match(configSource, /name: 'Unassigned'/);
    assert.match(arSource, /createSitePlace/);
    assert.match(serverSource, /'gps', 'qr', 'spatial'/);
    assert.match(serverSource, /Spatial anchors require finite x, y and z coordinates/);
    assert.match(serverSource, /markerName = `\$\{requestedName\} \(\$\{suffix\}\)`/);
});

test('Creator dashboard stays in web mode instead of being duplicated in AR', () => {
    const arSource = read('app/screens/arMode.js');
    assert.doesNotMatch(arSource, /drawDashboard|captureDashboardSnapshot|Grab dashboard|summonArDashboard/);
    assert.doesNotMatch(arSource, /returnToWeb|data-ar-web-mode/);
});

test('Creator AR has no dashboard grab or controller-ray controls', () => {
    const arSource = read('app/screens/arMode.js');
    const taskbar = arSource.slice(
        arSource.indexOf('<nav class="creator-ar-taskbar"'),
        arSource.indexOf('</nav>', arSource.indexOf('<nav class="creator-ar-taskbar"'))
    );
    assert.doesNotMatch(arSource, /targetRaySpace|selectstart|selectend|squeezestart|squeezeend/);
    assert.doesNotMatch(arSource, /move_dashboard|dashboardHoverRegionId|rayPositionedPanelMatrix/);
    assert.doesNotMatch(taskbar, /data-ar-grab-mode|data-ar-reset|data-ar-recenter/);
    assert.match(arSource, /checkpointSessionOrigin/);
});

test('Creator AR setup guide covers welcome, checkpoint and placement', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    assert.match(dashboardSource, /Welcome marker/);
    assert.match(dashboardSource, /Area Marker/);
    assert.match(dashboardSource, /Plants, markers and notes/);
    assert.match(dashboardSource, /Set Welcome Marker/);
    assert.match(dashboardSource, /Open Test AR/);
    assert.match(dashboardSource, /label: 'Starting Point'/);
    assert.match(dashboardSource, /openCheckpointQuickSetup/);
    assert.match(dashboardSource, /Create New Area/);
    assert.match(dashboardSource, /Add in AR now/);
    assert.match(dashboardSource, /Add location later/);
    assert.match(dashboardSource, /Area Marker label/);
});

test('project settings can rename a project and Areas toggle from the dashboard', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    const entrySource = read('app/components/projectEntry.js');
    const mainSource = read('app/main.js');
    assert.match(dashboardSource, /Project Details/);
    assert.match(dashboardSource, /projectSettingsName/);
    assert.match(dashboardSource, /saveProjectName/);
    assert.match(dashboardSource, /renameProjectOnDisk\(projectId, \{ \.\.\.project, preserveId: true, name, description, coverImage \}\)/);
    assert.match(dashboardSource, /const button = trigger\?\.currentTarget \|\| trigger/);
    assert.match(entrySource, /onclick="window\.toggleAreas\(this\)"/);
    assert.match(entrySource, /aria-expanded="false"/);
    assert.match(mainSource, /window\.toggleAreas = toggleAreas/);
});

test('Creator AR opens a transparent WebXR session and cleans up on exit', () => {
    const arSource = read('app/screens/arMode.js');
    assert.match(arSource, /navigator\.xr\.requestSession\('immersive-ar'/);
    assert.match(arSource, /domOverlay: \{ root: overlayRoot \}/);
    assert.match(arSource, /session\.addEventListener\('end'/);
    assert.match(arSource, /creator-ar-session-active/);
    assert.match(arSource, /activeSession\?\.end/);
});

test('Creator AR falls back to setup when WebXR cannot start', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    assert.match(dashboardSource, /const started = await window\.startArMode/);
    assert.match(dashboardSource, /if \(!started\) await renderArAreaPicker/);
    assert.match(dashboardSource, /AR setup unavailable/);
});

test('welcome Try It Now AR keeps one live placement control and no dashboard panel', () => {
    const source = read('app/screens/temporaryArDemo.js');
    const styles = read('app/style.css');
    assert.match(source, /requiredFeatures: \['dom-overlay', 'hit-test'\]/);
    assert.match(source, /domOverlay: \{ root: appRoot \}/);
    assert.match(source, /UNPACK_FLIP_Y_WEBGL, false/);
    assert.match(source, /Look around and find a clear surface/);
    assert.match(source, /Choose a place for your story/);
    assert.doesNotMatch(source, /Dashboard|draggable-window/);
    assert.match(styles, /\.tryit-demo\.is-immersive \.tryit-stage \{ pointer-events: none;/);
    assert.match(styles, /\.tryit-exit[\s\S]*pointer-events: auto;/);
});

test('Creator project AR is a no-code placement session without a dashboard overlay', () => {
    const source = read('app/screens/arMode.js');
    const styles = read('app/style.css');
    assert.doesNotMatch(source, /drawDashboard|captureDashboardSnapshot|dashboardVisible|Grab dashboard/);
    assert.match(source, /if \(!projectId \|\| !navigator\.xr \|\| !window\.isSecureContext\) return false/);
    assert.match(source, /domOverlay: \{ root: overlayRoot \}/);
    assert.match(source, /requiredFeatures: \['dom-overlay', 'hit-test'\]/);
    assert.match(source, /requestHitTestSource/);
    assert.match(source, /spatialPosition\(latestHitMatrix, latestViewerMatrix/);
    assert.match(source, /id = 'creatorArOverlay'/);
    assert.match(source, /creator-ar-session-active/);
    assert.match(source, /Test session/);
    assert.match(source, /What type of marker is this\?/);
    assert.doesNotMatch(source, /Choose an Area/);
    assert.match(styles, /body\.creator-ar-session-active #app/);
    assert.match(styles, /\.creator-ar-taskbar/);
    assert.match(styles, /\.creator-ar-marker \{[\s\S]*width: 13px;[\s\S]*height: 13px;/);
    assert.match(source, /<span class="creator-ar-marker-hit-target/);
    assert.doesNotMatch(source, /<button class="creator-ar-marker/);
    assert.match(source, /function setupSpatialMarkerRenderer/);
    assert.match(source, /function drawSpatialMarkers/);
    assert.match(source, /drawSpatialMarkers\(view\)/);
    assert.match(styles, /\.creator-ar-marker-hit-target \{[\s\S]*opacity: 0;/);
    assert.match(source, /async function restoreRecordedMarkers/);
    assert.match(source, /loadMarkerAnchor/);
    assert.match(source, /loadPlacementAreas\(\)\.then\(restoreRecordedMarkers\)/);
    assert.match(styles, /\.creator-ar-place-picker\[hidden\]/);
    assert.doesNotMatch(styles, /\.creator-ar-placement-status/);
    assert.match(styles, /\.creator-ar-type-options \{ display: grid; grid-template-columns: repeat\(3/);
});

test('Creator AR supports temporary checkpoints and direct test sessions', () => {
    const arSource = read('app/screens/arMode.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const serverSource = read('tools/persistence-server.mjs');
    assert.match(arSource, /let startPromise = null/);
    assert.match(arSource, /startPromise = launchArMode\(projectId, areaId, checkpointId, initialPlacementType\)/);
    assert.doesNotMatch(arSource, /isSessionSupported\('immersive-ar'\)/);
    assert.match(arSource, /session = await navigator\.xr\.requestSession\('immersive-ar'/);
    assert.match(dashboardSource, /const started = await window\.startArMode/);
    assert.match(dashboardSource, /Open Test AR/);
    assert.match(dashboardSource, /renderAreaCheckpointForm/);
    assert.match(dashboardSource, /saveAreaCheckpoint/);
    assert.match(dashboardSource, /type: 'area_checkpoint'/);
    assert.match(dashboardSource, /optional for testing/);
    assert.match(dashboardSource, /Edit Area Marker/);
    assert.match(serverSource, /'area_checkpoint'/);
});

test('dashboard quick marker and note actions open AR with a ready centre placement control', () => {
    const arSource = read('app/screens/arMode.js');
    const configSource = read('app/services/arExperienceConfig.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const mainSource = read('app/main.js');
    const styles = read('app/style.css');
    assert.match(dashboardSource, /label: 'Add Marker', action: `window\.startArMode\('\$\{encoded\(project\.id\)\}', '', '', 'sub_checkpoint'\)`/);
    assert.match(dashboardSource, /label: 'Add Note', action: `window\.startArMode\('\$\{encoded\(project\.id\)\}', '', '', 'note'\)`/);
    assert.match(arSource, /readyPlacementType = AR_EXPERIENCE_CONFIG\.markerTypes\.includes\(initialPlacementType\)/);
    assert.match(configSource, /placementDistanceMetres: 1\.2/);
    assert.match(configSource, /name: 'Unassigned'/);
    assert.match(dashboardSource, /'intro_checkpoint'/);
    assert.match(arSource, /Aim the centre circle, then tap it to place/);
    assert.match(arSource, /readyPlacementType = '';\s*updateReadyPlacementControl\(\);\s*setPlacementStatus\(`Placing/);
    assert.match(mainSource, /window\.startArMode = \(projectId, areaId, checkpointId, initialPlacementType = ''\)/);
    assert.match(styles, /\.creator-ar-ready-placement/);
    assert.match(styles, /creator-ar-ready-pulse/);
});

test('dashboard search indexes readable content and ranks name matches', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    const entrySource = read('app/components/projectEntry.js');
    assert.match(dashboardSource, /searchableText\('Area', area\.name, area\.type, area\.description\)/);
    assert.match(dashboardSource, /primarySearchText: searchableText\(marker\.name/);
    assert.doesNotMatch(dashboardSource, /searchableText\(markerTypeLabel\(marker\.type\), place, marker, plant, instance, legacyProfile\)/);
    assert.match(dashboardSource, /const matchingItems = \[\]/);
    assert.match(dashboardSource, /score\(right\) - score\(left\)/);
    assert.match(entrySource, /data-search-primary/);
    assert.match(entrySource, /'&': '&amp;'/);
});

test('web quick entry can save an untitled draft for later editing', () => {
    const source = read('app/screens/fieldMarker.js');
    assert.match(source, /Optional - an untitled draft will be created/);
    assert.match(source, /Save draft/);
    assert.match(source, /Untitled plant/);
    assert.match(source, /Untitled note/);
    assert.match(source, /Untitled marker/);
    assert.doesNotMatch(source, /id="fieldName" required/);
});
