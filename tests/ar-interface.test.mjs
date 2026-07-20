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
    assert.match(arSource, /WEB MODE/);
    assert.match(arSource, /data-ar-window="tools"/);
    assert.match(arSource, /Recenter/);
    assert.match(arSource, /EXIT AR/);
    assert.match(arSource, /Add Area Marker/);
    assert.match(arSource, /Place tree/);
    assert.match(arSource, /Place marker/);
    assert.match(arSource, /Place note/);
    assert.match(arSource, /data-ar-grab-mode/);
    assert.match(arSource, /data-ar-select-mode/);
    assert.match(arSource, /Add Area Marker/);
});

test('Creator AR places lightweight drafts and keeps move and select modes exclusive', () => {
    const arSource = read('app/screens/arMode.js');
    const serverSource = read('tools/persistence-server.mjs');
    assert.match(arSource, /createSpatialPlant/);
    assert.match(arSource, /createPlaceMarker/);
    assert.match(arSource, /saveMarkerAnchor/);
    assert.match(arSource, /type: 'spatial'/);
    assert.match(arSource, /interactionMode = interactionMode === mode \? '' : mode/);
    assert.match(arSource, /Hand mode is on/);
    assert.match(arSource, /Pointer mode is on/);
    assert.match(arSource, /Interaction is off/);
    assert.match(arSource, /openInlineEditor/);
    assert.match(arSource, /finishMarkerDrag/);
    assert.match(arSource, /pointercancel/);
    assert.match(arSource, /setPointerCapture/);
    assert.match(arSource, /Hand mode is now off/);
    assert.match(arSource, /Move cancelled\. Hand mode is now off/);
    assert.match(serverSource, /'gps', 'qr', 'spatial'/);
    assert.match(serverSource, /Spatial anchors require finite x, y and z coordinates/);
});

test('Creator dashboard stays in web mode instead of being duplicated in AR', () => {
    const arSource = read('app/screens/arMode.js');
    assert.doesNotMatch(arSource, /drawDashboard|captureDashboardSnapshot|Grab dashboard|summonArDashboard/);
    assert.match(arSource, /returnToWeb/);
    assert.match(arSource, /window\.renderProjectDashboard/);
});

test('Creator AR has no dashboard grab or controller-ray controls', () => {
    const arSource = read('app/screens/arMode.js');
    assert.doesNotMatch(arSource, /targetRaySpace|selectstart|selectend|squeezestart|squeezeend/);
    assert.doesNotMatch(arSource, /move_dashboard|dashboardHoverRegionId|rayPositionedPanelMatrix/);
    assert.match(arSource, /checkpointSessionOrigin/);
});

test('Creator AR setup guide covers welcome, checkpoint and placement', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    assert.match(dashboardSource, /Welcome marker/);
    assert.match(dashboardSource, /Area Marker/);
    assert.match(dashboardSource, /Plants, markers and notes/);
    assert.match(dashboardSource, /Set Welcome Marker/);
    assert.match(dashboardSource, /Open Test AR/);
    assert.match(dashboardSource, /label: 'Area Marker'/);
    assert.match(dashboardSource, /openCreatorArCheckpointSetup/);
    assert.match(dashboardSource, /Area Marker label/);
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

test('Creator project AR is a no-code placement session without a dashboard overlay', () => {
    const source = read('app/screens/arMode.js');
    const styles = read('app/style.css');
    assert.doesNotMatch(source, /drawDashboard|captureDashboardSnapshot|dashboardVisible|Grab dashboard/);
    assert.match(source, /if \(!projectId \|\| !navigator\.xr \|\| !window\.isSecureContext\) return false/);
    assert.match(source, /domOverlay: \{ root: overlayRoot \}/);
    assert.match(source, /id = 'creatorArOverlay'/);
    assert.match(source, /creator-ar-session-active/);
    assert.match(source, /data-ar-web-mode/);
    assert.match(source, /Test session/);
    assert.match(source, /Add Area Marker/);
    assert.match(source, /checkpointSessionOrigin = Float32Array\.from\(latestViewerMatrix\)/);
    assert.match(styles, /body\.creator-ar-session-active #app/);
    assert.match(styles, /\.creator-ar-taskbar/);
    assert.match(styles, /\.creator-ar-toolbox\.is-open/);
});

test('Creator AR supports temporary checkpoints and direct test sessions', () => {
    const arSource = read('app/screens/arMode.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const serverSource = read('tools/persistence-server.mjs');
    assert.match(arSource, /let startPromise = null/);
    assert.match(arSource, /startPromise = launchArMode\(projectId, areaId, checkpointId\)/);
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
