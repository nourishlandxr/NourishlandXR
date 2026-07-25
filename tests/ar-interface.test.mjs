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
    const styles = read('app/style.css');
    const pointerSource = read('app/services/placementPointer.js');
    const taskbar = arSource.slice(
        arSource.indexOf('<nav class="creator-ar-taskbar"'),
        arSource.indexOf('</nav>', arSource.indexOf('<nav class="creator-ar-taskbar"'))
    );
    assert.match(arSource, /data-ar-window="tools"/);
    assert.match(arSource, /ADD MARKER/);
    assert.match(styles, /\.creator-ar-taskbar \.creator-ar-add-marker/);
    assert.match(arSource, /data-ar-place-picker/);
    assert.doesNotMatch(arSource, /creator-ar-toolbox/);
    assert.match(arSource, /function armPlacement\(type\)/);
    assert.match(arSource, /Tap the centre circle to place it/);
    assert.match(arSource, /EXIT AR/);
    assert.match(arSource, /What kind of Marker is this\?/);
    assert.match(arSource, /data-ar-placed-type="plant"/);
    assert.match(arSource, /data-ar-placed-type="sub_checkpoint"/);
    assert.match(arSource, /data-ar-placed-type="note"/);
    assert.match(arSource, /data-ar-placed-type="area_checkpoint"/);
    assert.doesNotMatch(arSource, /data-ar-web-mode/);
    assert.doesNotMatch(arSource, /data-ar-select-area/);
    assert.match(arSource, /data-ar-view-mode/);
    assert.match(arSource, /data-ar-grab-mode/);
    assert.match(arSource, /data-ar-select-mode/);
    assert.match(styles, /\.creator-ar-eye-icon/);
    assert.doesNotMatch(taskbar, /data-ar-reset|data-ar-recenter/);
    assert.match(taskbar, /data-ar-open-bag/);
    assert.equal((taskbar.match(/<button/g) || []).length, 6);
    assert.match(styles, /\.creator-ar-marker-layer\.is-grab-mode \.creator-ar-marker-hit-target:hover::after/);
    assert.match(styles, /\.creator-ar-marker-hit-target\.is-adjusting::after/);
    assert.match(arSource, /creator-ar-hand-pointer/);
    assert.match(arSource, /is-hand-mode/);
    assert.match(styles, /\.creator-ar-overlay\.is-hand-mode \.creator-ar-hand-pointer/);
    assert.doesNotMatch(arSource, /data-ar-ready-place|creator-ar-ready-placement|creator-ar-ready-ring/);
    assert.match(arSource, /session\.addEventListener\('select'/);
    assert.match(arSource, /data-ar-placement-capture/);
    assert.match(arSource, /placementPointerMarkup/);
    assert.match(pointerSource, /creator-ar-breathing-target/);
    assert.match(pointerSource, /creator-ar-placement-pointer/);
    assert.match(pointerSource, /creator-ar-placement-guide-label/);
    assert.match(arSource, /data-ar-placement-guide-label/);
    assert.match(arSource, /creator-ar-spatial-name/);
    assert.match(styles, /\.creator-ar-overlay\.is-placement-armed \.creator-ar-placement-guide/);
    assert.match(styles, /@keyframes creator-ar-breathe/);
    assert.match(arSource, /addEventListener\('pointerup'/);
    assert.match(arSource, /performance\.now\(\) - placementArmedAt > 180/);
    assert.match(styles, /\.creator-ar-overlay\.is-placement-armed \.creator-ar-placement-capture \{ pointer-events: auto; \}/);
    assert.match(styles, /\.creator-ar-status/);
    assert.match(arSource, /performance\.now\(\) - placementArmedAt > 250/);
    assert.match(arSource, /readyPlacementType && latestHitMatrix/);
});

test('Creator AR places lightweight drafts and keeps move and select modes exclusive', () => {
    const arSource = read('app/screens/arMode.js');
    const styles = read('app/style.css');
    const configSource = read('app/services/arExperienceConfig.js');
    const serverSource = read('tools/persistence-server.mjs');
    const persistenceSource = read('app/services/persistence.js');
    assert.match(arSource, /createPlaceMarker/);
    assert.match(arSource, /createProjectSite/);
    assert.match(arSource, /loadPlaceMarkers/);
    assert.match(arSource, /draftName = `\$\{baseName\} \(\$\{suffix\+\+\}\)`/);
    assert.match(arSource, /saveMarkerAnchor/);
    assert.match(arSource, /type: 'spatial'/);
    assert.match(arSource, /let interactionMode = 'view'/);
    assert.match(arSource, /interactionMode = mode/);
    assert.match(arSource, /Eye mode is on\. Hover over a Marker to reveal its name/);
    assert.match(arSource, /Hand mode is on/);
    assert.match(arSource, /updateGrabbedMarkerFromCamera/);
    assert.match(arSource, /latestViewerMatrix\[14\] - origin\.z/);
    assert.match(arSource, /Pointer mode is on/);
    assert.match(arSource, /interactionMode === 'view'\) return/);
    assert.match(arSource, /openInlineEditor/);
    assert.match(arSource, /openInlineEditor\(record, true\)/);
    assert.match(arSource, /deletePlaceMarker/);
    assert.match(arSource, /name="markerColor" type="color"/);
    assert.match(arSource, /name="markerSize"/);
    assert.match(arSource, /name="markerType"/);
    assert.match(arSource, /<p class="welcome-label">Marker details<\/p>/);
    assert.match(arSource, /plant_profile: type === 'plant'/);
    assert.match(arSource, /Confirm delete/);
    assert.match(arSource, /appearance: \{/);
    assert.match(arSource, /markerRgb\(record\.marker/);
    assert.match(arSource, /requestAnimationFrame\(\(\) => editor\.querySelector\('textarea'\)\?\.focus\(\)\)/);
    assert.match(arSource, /finishMarkerDrag/);
    assert.match(arSource, /pointercancel/);
    assert.match(arSource, /setPointerCapture/);
    assert.match(arSource, /moved\. Eye mode is now on/);
    assert.match(arSource, /Move cancelled\. Eye mode is now on/);
    assert.match(styles, /\.creator-ar-marker-layer\.is-view-mode \.creator-ar-marker-hit-target:hover \.creator-ar-spatial-name/);
    assert.match(arSource, /function resetArControls\(\)/);
    assert.match(arSource, /readyPlacementType = '';/);
    assert.match(arSource, /showPlacedMarkerActions\(record\)/);
    assert.match(arSource, /AR controls reset\. Eye mode is on; press plus when you are ready to place a marker/);
    assert.match(configSource, /name: 'Unassigned'/);
    assert.match(configSource, /name: 'Unassigned',[\s\S]*type: 'Other'/);
    assert.match(arSource, /intro_checkpoint: 'Starting Point'/);
    assert.match(arSource, /createSitePlace/);
    assert.match(serverSource, /'gps', 'qr', 'spatial'/);
    assert.match(serverSource, /Spatial anchors require finite x, y and z coordinates/);
    assert.match(serverSource, /markerName = `\$\{requestedName\} \(\$\{suffix\}\)`/);
    assert.match(persistenceSource, /legacySpatialRejection/);
    assert.match(persistenceSource, /nxr-spatial:/);
    assert.match(persistenceSource, /compatibility_format: 'nxr-spatial-v1'/);
    assert.match(persistenceSource, /spatial_position/);
    assert.match(persistenceSource, /marker\?\.spatial_anchor/);
    assert.match(persistenceSource, /nxr-marker-spatial-v1/);
    assert.match(persistenceSource, /body: JSON\.stringify\(\{ spatial_anchor:/);
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
    assert.match(taskbar, /data-ar-grab-mode/);
    assert.doesNotMatch(taskbar, /data-ar-reset|data-ar-recenter/);
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

test('opening a project paints a dashboard loading state before data work begins', () => {
    const mainSource = read('app/main.js');
    const styles = read('app/style.css');
    assert.match(mainSource, /class="project-loading-screen"/);
    assert.match(mainSource, /resolvedName/);
    assert.match(mainSource, /Returning to dashboard/);
    assert.match(mainSource, /loadingContext === 'returning'/);
    assert.match(mainSource, /Adding the trellis/);
    assert.match(mainSource, /Soaking the seeds/);
    assert.match(mainSource, /Digging a few holes/);
    assert.match(mainSource, /Waking up the worms/);
    assert.match(mainSource, /Mapping the mycelium/);
    assert.match(mainSource, /\}, 2200\)/);
    assert.match(mainSource, /clearInterval\(loadingCommentTimer\)/);
    assert.match(mainSource, /nourishlandView: 'dashboard'/);
    assert.match(mainSource, /window\.addEventListener\('popstate'/);
    assert.match(mainSource, /requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)/);
    assert.match(styles, /\.project-loading-track span/);
    assert.match(styles, /@keyframes project-loading-progress/);
});

test('Field Guide correlates Area membership for both plant instances and AR plant markers', () => {
    const source = read('app/screens/fieldGuide.js');
    assert.match(source, /async function loadAreaPlants/);
    assert.match(source, /loadResolvedPlantsForPlace/);
    assert.match(source, /loadPlaceMarkers/);
    assert.match(source, /marker\.type === 'plant'/);
    assert.match(source, /placeId,/);
    assert.match(source, /return \[\.\.\.resolved, \.\.\.markerPlants\]/);
});

test('Creator AR opens a transparent WebXR session and cleans up on exit', () => {
    const arSource = read('app/screens/arMode.js');
    assert.match(arSource, /navigator\.xr\.requestSession\('immersive-ar'/);
    assert.match(arSource, /domOverlay: \{ root: overlayRoot \}/);
    assert.match(arSource, /session\.addEventListener\('end'/);
    assert.match(arSource, /creator-ar-session-active/);
    assert.match(arSource, /activeSession\?\.end/);
    assert.match(arSource, /history\.pushState\(\{ \.\.\.\(history\.state \|\| \{\}\), nourishlandCreatorAr: true \}/);
    assert.match(arSource, /window\.addEventListener\('popstate', handleArHistoryBack\)/);
    assert.match(arSource, /window\.renderProjectDashboard\?\.\(encodeURIComponent\(projectId\), '', false, 'returning'\)/);
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
    assert.match(source, /onTextComplete/);
    assert.match(source, /aimRevealTimer = setTimeout/);
    assert.match(source, /placementPointerMarkup/);
    assert.match(source, /When the aiming circle rests on the right place/);
    assert.match(styles, /\.tryit-place\.is-revealing/);
    assert.match(styles, /\.tryit-place\.is-ready \{ pointer-events: auto;/);
    assert.doesNotMatch(source, /Dashboard|draggable-window/);
    assert.match(styles, /\.tryit-demo\.is-immersive \.tryit-stage \{ pointer-events: none;/);
    assert.match(styles, /\.tryit-exit[\s\S]*pointer-events: auto;/);
    assert.match(source, /label\.width = 1120/);
    assert.match(source, /drawWrappedTextureText/);
    assert.match(styles, /width: min\(94vw, 620px\)/);
    assert.match(styles, /overflow-wrap: anywhere/);
    assert.match(source, /Welcome to our quick demo/);
    assert.match(source, /Imagine your space coming alive with rich information/);
    assert.match(source, /Let’s test some NourishlandXR features/);
    assert.match(source, /Start the demo/);
    assert.match(styles, /\.tryit-guided-choice h2 \{ color: #fff !important;/);
    assert.match(source, /typeNextCharacter/);
    assert.match(source, /boardTypingTimer = setTimeout\(typeNextCharacter, 22\)/);
    assert.match(styles, /\.tryit-guided-choice\.is-typing p::after/);
    assert.match(source, /record\.tutorialStage === demoStage/);
    assert.match(source, /data-tryit-guided-choice/);
    assert.match(source, /Use Lemon Myrtle preset/);
    assert.match(source, /Point of Interest/);
    assert.match(source, /DON’T GO HERE/);
    assert.match(source, /Create Area Totem/);
    assert.match(styles, /\.tryit-guided-choice/);
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
    assert.doesNotMatch(source, /Test session - no physical code/);
    assert.match(styles, /\.creator-ar-status:empty \{ display: none; \}/);
    assert.match(source, /What kind of Marker is this\?/);
    assert.doesNotMatch(source, /Choose an Area/);
    assert.match(styles, /body\.creator-ar-session-active #app/);
    assert.match(styles, /\.creator-ar-taskbar/);
    assert.match(styles, /\.creator-ar-marker \{[\s\S]*width: 13px;[\s\S]*height: 13px;/);
    assert.match(source, /<span class="creator-ar-marker-hit-target/);
    assert.doesNotMatch(source, /<button class="creator-ar-marker/);
    assert.match(source, /function setupSpatialMarkerRenderer/);
    assert.match(source, /function drawSpatialMarkers/);
    assert.match(source, /drawSpatialMarkers\(view\)/);
    assert.match(styles, /\.creator-ar-marker-hit-target \{/);
    assert.match(styles, /\.creator-ar-spatial-name \{/);
    assert.match(source, /async function restoreRecordedMarkers/);
    assert.match(source, /loadMarkerAnchor/);
    assert.match(source, /loadPlacementAreas\(\)\.then\(restoreRecordedMarkers\)/);
    assert.match(styles, /\.creator-ar-place-picker\[hidden\]/);
    assert.doesNotMatch(styles, /\.creator-ar-placement-status/);
    assert.match(styles, /\.creator-ar-type-options \{ display: grid; grid-template-columns: repeat\(2/);
});

test('Creator AR supports temporary checkpoints and direct test sessions', () => {
    const arSource = read('app/screens/arMode.js');
    const persistenceSource = read('app/services/persistence.js');
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
    assert.match(persistenceSource, /unsupported\|placement\|spatial\|anchor type\|gps\|qr/);
});

test('dashboard focuses on Open AR and the Unplaced Bag', () => {
    const arSource = read('app/screens/arMode.js');
    const configSource = read('app/services/arExperienceConfig.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const mainSource = read('app/main.js');
    const styles = read('app/style.css');
    assert.match(dashboardSource, /openArAction: `window\.startArMode\('\$\{encoded\(project\.id\)\}'\)`/);
    assert.match(dashboardSource, /addUnplacedAction: `window\.renderAddToLocation/);
    assert.doesNotMatch(dashboardSource, /quickActions:/);
    assert.match(arSource, /openUnplacedBag/);
    assert.match(arSource, /pendingBagRecord/);
    assert.match(arSource, /selected from your Bag/);
    assert.match(arSource, /convertRecordToAreaCheckpoint/);
    assert.match(arSource, /type: 'Outdoor Area'/);
    assert.match(arSource, /semantic_type: 'area_checkpoint'/);
    assert.match(arSource, /if \(!\/unsupported\/i\.test/);
    assert.match(arSource, /areas\.find\(item => item\.id === record\.areaId\)/);
    assert.match(arSource, /Area welcome board/);
    assert.doesNotMatch(arSource, /const boardHtml/);
    assert.match(styles, /\.creator-ar-marker-layer\.is-select-mode \.creator-ar-marker-hit-target:hover \.creator-ar-spatial-name/);
    assert.match(arSource, /readyPlacementType = AR_EXPERIENCE_CONFIG\.markerTypes\.includes\(initialPlacementType\)/);
    assert.match(configSource, /placementDistanceMetres: 1\.2/);
    assert.match(configSource, /name: 'Unassigned'/);
    assert.match(dashboardSource, /'intro_checkpoint'/);
    assert.match(arSource, /Aim the centre circle, then tap it to place/);
    assert.match(arSource, /readyPlacementType = '';\s*updateReadyPlacementControl\(\);\s*setPlacementStatus\(`Placing/);
    assert.match(mainSource, /window\.startArMode = \(projectId, areaId, checkpointId, initialPlacementType = ''\)/);
    assert.doesNotMatch(styles, /\.creator-ar-ready-placement|creator-ar-ready-pulse/);
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

test('plant creation separates Local records from read-only Global discovery', () => {
    const fieldMarker = read('app/screens/fieldMarker.js');
    const plantService = read('app/services/plantDataService.js');
    const server = read('tools/persistence-server.mjs');
    assert.match(fieldMarker, />Local<\/button>/);
    assert.match(fieldMarker, />Global<\/button>/);
    assert.match(fieldMarker, /Read-only results from GBIF/);
    assert.match(fieldMarker, /searchGlobalPlants\(query\)/);
    assert.match(fieldMarker, /sourceId: selectedGlobalPlant\?\.sourceId/);
    assert.match(plantService, /plant-search\/global/);
    assert.match(server, /api\.gbif\.org\/v1\/species\/suggest/);
    assert.match(server, /source: 'GBIF'/);
});

test('spatial roles use distinct Marker, Totem and gateway shapes', () => {
    const arSource = read('app/screens/arMode.js');
    assert.match(arSource, /area_checkpoint' \? 1/);
    assert.match(arSource, /intro_checkpoint' \? 2/);
    assert.match(arSource, /shape<\.5\?circle:\(shape<1\.5\?totem:gateway\)/);
    assert.match(arSource, /Area Totem/);
    assert.match(arSource, /starting point gateway/);
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
