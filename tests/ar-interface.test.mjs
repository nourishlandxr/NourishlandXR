import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createUvSphereGeometry, sphereModelMatrix } from '../app/services/spatialSphereRenderer.js';
import { createTetherRibbonGeometry } from '../app/services/spatialTetherRenderer.js';

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

test('shared spatial orbs use indexed three-dimensional sphere geometry', () => {
    const geometry = createUvSphereGeometry(12, 16);
    const vertexCount = geometry.vertices.length / geometry.stride;
    assert.ok(vertexCount > 6);
    assert.ok(geometry.indices.length > 6);
    const bounds = {
        x: [Infinity, -Infinity],
        y: [Infinity, -Infinity],
        z: [Infinity, -Infinity]
    };
    for (let offset = 0; offset < geometry.vertices.length; offset += geometry.stride) {
        const position = geometry.vertices.slice(offset, offset + 3);
        const normal = geometry.vertices.slice(offset + 3, offset + 6);
        ['x', 'y', 'z'].forEach((axis, index) => {
            bounds[axis][0] = Math.min(bounds[axis][0], position[index]);
            bounds[axis][1] = Math.max(bounds[axis][1], position[index]);
        });
        assert.ok(Math.abs(Math.hypot(...normal) - 1) < 1e-5);
    }
    assert.ok(bounds.x[0] <= -0.99 && bounds.x[1] >= 0.99);
    assert.ok(bounds.y[0] <= -0.99 && bounds.y[1] >= 0.99);
    assert.ok(bounds.z[0] <= -0.99 && bounds.z[1] >= 0.99);
    assert.ok(geometry.indices.every(index => index < vertexCount));

    const model = sphereModelMatrix({ x: 1, y: 2, z: -3 }, 0.25);
    assert.deepEqual([model[0], model[5], model[10]], [0.25, 0.25, 0.25]);
    assert.deepEqual([model[12], model[13], model[14]], [1, 2, -3]);
});

test('Plant profile tethers use a curved camera-facing triangle ribbon', () => {
    const vertices = createTetherRibbonGeometry(
        { x: 0, y: 0.1, z: -1.2 },
        { x: 0.14, y: 0.9, z: -1.05 },
        { x: 0, y: 1.55, z: 0 },
        { segments: 10, width: 0.0045 }
    );
    assert.equal(vertices.length, 10 * 6 * 3);
    assert.ok(vertices.every(Number.isFinite));
    const xValues = [];
    const yValues = [];
    const zValues = [];
    for (let index = 0; index < vertices.length; index += 3) {
        xValues.push(vertices[index]);
        yValues.push(vertices[index + 1]);
        zValues.push(vertices[index + 2]);
    }
    assert.ok(Math.max(...yValues) - Math.min(...yValues) > 0.7);
    assert.ok(Math.max(...xValues) - Math.min(...xValues) > 0.1);
    assert.ok(Math.max(...zValues) - Math.min(...zValues) > 0.1);
});

test('Marker and Plant spheres are shared across Creator, demo and Explorer AR', () => {
    const sphereSource = read('app/services/spatialSphereRenderer.js');
    const creatorSource = read('app/screens/arMode.js');
    const demoSource = read('app/screens/temporaryArDemo.js');
    const explorerSource = read('app/services/arNote.js');
    const panelSource = read('app/services/arPanel.js');
    const styles = read('app/style.css');
    assert.match(sphereSource, /gl\.drawElements\(gl\.TRIANGLES/);
    assert.match(sphereSource, /radius \* 0\.38/);
    assert.match(sphereSource, /gl\.enable\(gl\.DEPTH_TEST\)/);
    assert.match(creatorSource, /shape !== 0 && shape !== 4/);
    assert.match(creatorSource, /drawSpatialOrb\(gl, sphereRenderer, view, record\.position/);
    assert.match(creatorSource, /readyPlacementType === 'plant' \? 'plant' : 'marker'/);
    assert.match(demoSource, /record\.demoType === 'plant' \? 'plant' : record\.demoType === 'marker' \? 'marker'/);
    assert.match(demoSource, /const orbOnly = \['marker', 'plant'\]\.includes\(record\.demoType\) && !record\.demoExpanded/);
    assert.match(demoSource, /class="tryit-sim-orb/);
    assert.match(styles, /\.tryit-sim-orb\.is-plant::after/);
    assert.match(explorerSource, /drawSpatialContent:[\s\S]*drawSpatialOrb/);
    assert.match(panelSource, /opts\.drawSpatialContent\(view\)/);
});

test('Creator AR exposes the compact placement toolbar', () => {
    const arSource = read('app/screens/arMode.js');
    const styles = read('app/style.css');
    const pointerSource = read('app/services/placementPointer.js');
    const taskbar = arSource.slice(
        arSource.indexOf('<nav class="creator-ar-taskbar"'),
        arSource.indexOf('</nav>', arSource.indexOf('<nav class="creator-ar-taskbar"'))
    );
    assert.match(arSource, /data-ar-add-marker/);
    assert.match(arSource, /\+ MARKER/);
    assert.match(arSource, /data-ar-add-special/);
    assert.match(arSource, /\+ SPECIAL/);
    assert.match(styles, /\.creator-ar-taskbar \.creator-ar-add-marker/);
    assert.match(arSource, /data-ar-place-picker/);
    assert.doesNotMatch(arSource, /creator-ar-toolbox/);
    assert.match(arSource, /function armPlacement\(type\)/);
    assert.match(arSource, /Tap the centre circle to place it/);
    assert.match(arSource, /EXIT AR/);
    assert.match(arSource, /Choose its purpose/);
    assert.match(arSource, /data-ar-placed-type="plant"/);
    assert.match(arSource, /data-ar-placed-type="sub_checkpoint"/);
    assert.match(arSource, /data-ar-placed-type="note"/);
    assert.doesNotMatch(arSource.slice(arSource.indexOf('function showPlacedMarkerActions'), arSource.indexOf('function openSpecialMarkerPicker')), /data-ar-placed-type="area_checkpoint"/);
    assert.match(arSource, /data-ar-create-area/);
    assert.match(arSource, /data-ar-place-area-totem/);
    assert.doesNotMatch(arSource, /data-ar-web-mode/);
    assert.doesNotMatch(arSource, /data-ar-select-area/);
    assert.match(arSource, /data-ar-view-mode/);
    assert.match(arSource, /data-ar-hold-mode/);
    assert.match(arSource, /data-ar-select-mode/);
    assert.match(styles, /\.creator-ar-view-icon/);
    assert.doesNotMatch(taskbar, /data-ar-reset|data-ar-recenter/);
    assert.doesNotMatch(taskbar, /data-ar-open-bag|Organizer Folder/);
    assert.equal((taskbar.match(/<button/g) || []).length, 6);
    assert.match(styles, /\.creator-ar-marker-layer\.is-grab-mode \.creator-ar-marker-hit-target:hover::after/);
    assert.match(styles, /\.creator-ar-marker-hit-target\.is-adjusting::after/);
    assert.match(arSource, /creator-ar-mode-pointer/);
    assert.match(arSource, /is-hold-mode/);
    assert.match(styles, /\.creator-ar-overlay\.is-view-mode \.creator-ar-mode-pointer/);
    assert.match(styles, /\.creator-ar-overlay\.is-hold-mode \.creator-ar-mode-pointer/);
    assert.match(styles, /\.creator-ar-overlay\.is-select-mode \.creator-ar-mode-pointer/);
    assert.match(styles, /\.creator-ar-mode-pointer \{[^}]*bottom: max\(calc\(82px \+ 3cm\), calc\(env\(safe-area-inset-bottom\) \+ 68px \+ 3cm\)\)/);
    assert.doesNotMatch(arSource, /data-ar-mode-pointer-label/);
    assert.doesNotMatch(arSource, /data-ar-ready-place|creator-ar-ready-placement|creator-ar-ready-ring/);
    assert.match(arSource, /launchedSession\.addEventListener\('select'/);
    assert.match(arSource, /data-ar-placement-capture/);
    assert.match(arSource, /querySelector\('\[data-ar-add-marker\]'\)\.addEventListener\('click'/);
    assert.match(arSource, /querySelector\('\[data-ar-add-special\]'\)\.addEventListener\('click'/);
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

test('Special Marker tools open immediately while recorded Markers restore', () => {
    const arSource = read('app/screens/arMode.js');
    const start = arSource.indexOf('async function openSpecialMarkerPicker()');
    const end = arSource.indexOf('function resetArControls()', start);
    const specialPicker = arSource.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.ok(specialPicker.indexOf('picker.hidden = false') < specialPicker.indexOf('await restoreRecordedMarkers(restoringOperation)'));
    assert.ok(specialPicker.indexOf('await loadPlacementAreas(loadingOperation)') < specialPicker.indexOf('await restoreRecordedMarkers(restoringOperation)'));
    assert.match(specialPicker, /Loading Area tools/);
    assert.match(specialPicker, /picker\.dataset\.panel !== panelId/);
    assert.match(specialPicker, /requestId !== specialPickerRequest/);
    assert.match(arSource, /createAreaRecord\(projectId, siteId/);
    assert.match(specialPicker, /renderSpecialMarkerChoices\(picker\)/);
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
    assert.match(arSource, /View mode is on\. Hover over a Marker to reveal its name/);
    assert.match(arSource, /Hold mode is on\. Press an element to carry it at the aim; press it again to release/);
    assert.match(arSource, /dragState\.distance \+ dragState\.depthOffset/);
    assert.match(arSource, /latestViewerMatrix\[12\] - latestViewerMatrix\[8\] \* distance/);
    assert.match(arSource, /data-ar-depth-joystick/);
    assert.doesNotMatch(arSource, /window\.innerHeight - 104/);
    assert.match(arSource, /updateGrabbedMarkerFromCamera/);
    assert.match(arSource, /latestViewerMatrix\[14\] - latestViewerMatrix\[10\] \* distance/);
    assert.match(arSource, /Pointer mode is on/);
    assert.match(arSource, /interactionMode === 'view'\) return/);
    assert.match(arSource, /openInlineEditor/);
    assert.match(arSource, /openInlineEditor\(record, true\)/);
    assert.match(arSource, /deletePlaceMarker/);
    assert.match(arSource, /name="markerColor" type="color"/);
    assert.match(arSource, /name="markerSize"/);
    assert.match(arSource, /name="markerType"/);
    assert.match(arSource, /Quick edit ·/);
    assert.match(arSource, /plant_profile: type === 'plant'/);
    assert.match(arSource, /Confirm delete/);
    assert.match(arSource, /appearance: \{/);
    assert.match(arSource, /markerRgb\(record\.marker/);
    assert.match(arSource, /Edit in Web Mode/);
    assert.match(arSource, /finishMarkerDrag/);
    assert.match(arSource, /pointercancel/);
    assert.match(arSource, /setPointerCapture/);
    assert.match(arSource, /moved\. View mode is now on/);
    assert.match(arSource, /Move cancelled\. View mode is now on/);
    const finishHold = arSource.slice(arSource.indexOf('async function finishMarkerDrag'), arSource.indexOf('function cancelMarkerDrag'));
    assert.ok(finishHold.indexOf("interactionMode = 'view'") < finishHold.indexOf('await saveMarkerAnchor'));
    assert.match(finishHold, /state\.record\.position = state\.position/);
    assert.match(arSource, /placementArmGeneration/);
    assert.match(arSource, /async function prepareExistingMarkerPlacement/);
    assert.match(arSource, /pendingExistingMarkerId/);
    assert.match(arSource, /navigateAfterAr/);
    assert.match(arSource, /window\.resumeAreaCreationFlow/);
    assert.match(styles, /\.creator-ar-marker-layer\.is-view-mode \.creator-ar-marker-hit-target:hover \.creator-ar-spatial-name/);
    assert.match(arSource, /function resetArControls\(\)/);
    assert.match(arSource, /readyPlacementType = '';/);
    assert.match(arSource, /showPlacedMarkerActions\(record\)/);
    assert.match(arSource, /AR controls reset\. View mode is on; press plus when you are ready to place a Marker/);
    assert.match(arSource, /Choose its purpose/);
    assert.match(arSource, /data-ar-close-placed/);
    assert.doesNotMatch(arSource, /data-ar-size-step|resizePlacedMarker/);
    assert.match(arSource, /markerDimensions/);
    assert.match(arSource, /note: 3, plant: 4/);
    assert.match(arSource, /notice_board/);
    assert.match(arSource, /data-ar-create-area-form/);
    assert.match(arSource, /Create &amp; Place Totem/);
    assert.match(arSource, /async function createAreaCompatibleMarker/);
    assert.match(arSource, /convertRecordToAreaCheckpoint/);
    assert.match(arSource, /const type = button\.dataset\.arPlacedType;[\s\S]*closePlacePicker\(\);[\s\S]*setPlacedMarkerType\(record, type\)/);
    assert.doesNotMatch(arSource, /One tap completes this Marker/);
    assert.match(arSource, /creator-ar-control-dock/);
    assert.match(arSource, /data-ar-import-marker/);
    assert.match(arSource, /Import Marker \/ Plant/);
    assert.match(arSource, /data-ar-toggle-structural/);
    assert.match(arSource, /Hide.*Totem/);
    assert.match(styles, /\.creator-ar-special-grid/);
    assert.match(arSource, /groundGuideMatrix/);
    assert.match(arSource, /locatedTotemRecord/);
    assert.match(arSource, /const restoredGroups = await Promise\.all\(areas\.map/);
    assert.match(arSource, /float backTotem/);
    assert.match(arSource, /float side=max\(0\.,back-front\)/);
    assert.match(styles, /\.creator-ar-status \{[^}]*color: #fff !important/);
    assert.doesNotMatch(arSource, /What kind of Marker is this\?/);
    assert.match(configSource, /name: 'Unassigned'/);
    assert.match(configSource, /name: 'Unassigned',[\s\S]*type: 'Other'/);
    assert.match(arSource, /intro_checkpoint: 'Trail Entrance'/);
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
    assert.match(taskbar, /data-ar-hold-mode/);
    assert.doesNotMatch(taskbar, /data-ar-open-bag/);
    assert.doesNotMatch(taskbar, /data-ar-reset|data-ar-recenter/);
    assert.match(arSource, /checkpointSessionOrigin/);
});

test('Creator AR setup guide starts with Areas and keeps visitor entrances optional', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    assert.match(dashboardSource, /Area Totem/);
    assert.match(dashboardSource, /Plants, Markers and Notes/);
    assert.match(dashboardSource, /Optional Trail Entrance/);
    assert.match(dashboardSource, /Home &amp; Entrances/);
    assert.match(dashboardSource, /Open Test AR/);
    assert.match(dashboardSource, /Stories &amp; Checkpoints/);
    assert.match(dashboardSource, /window\.renderStartingPoints/);
    assert.match(dashboardSource, /openCheckpointQuickSetup/);
    assert.match(dashboardSource, /Create New Area/);
    assert.match(dashboardSource, /Place its Totem in AR/);
    assert.match(dashboardSource, /Create now, place later/);
    assert.doesNotMatch(dashboardSource, /Set Welcome Marker/);
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
    assert.match(source, /hasTotem/);
    assert.match(source, /hasStartingPoint/);
    assert.match(source, /field-guide-totem-symbol/);
    assert.match(source, /field-guide-starting-symbol/);
});

test('Creator AR opens a transparent WebXR session and cleans up on exit', () => {
    const arSource = read('app/screens/arMode.js');
    assert.match(arSource, /navigator\.xr\.requestSession\('immersive-ar'/);
    assert.match(arSource, /domOverlay: \{ root: overlayRoot \}/);
    assert.match(arSource, /launchedSession\.addEventListener\('end'/);
    assert.match(arSource, /creator-ar-session-active/);
    assert.match(arSource, /activeSession\?\.end/);
    assert.match(arSource, /history\.pushState\(\{ \.\.\.\(history\.state \|\| \{\}\), nourishlandCreatorAr: true \}/);
    assert.match(arSource, /window\.addEventListener\('popstate', handleArHistoryBack\)/);
    assert.match(arSource, /window\.renderProjectDashboard\?\.\(encodeURIComponent\(projectId\), '', false, 'returning'\)/);
});

test('Creator AR fences stale session, restore and placement work', () => {
    const arSource = read('app/screens/arMode.js');
    const quickPlace = arSource.slice(arSource.indexOf('async function quickPlace(type)'), arSource.indexOf('function createOverlay()', arSource.indexOf('async function quickPlace(type)')));
    const restoration = arSource.slice(arSource.indexOf('async function loadPlacementAreas('), arSource.indexOf('async function ensurePlacementArea('));
    const launch = arSource.slice(arSource.indexOf('async function launchArMode('));
    assert.match(arSource, /function captureArOperationContext\(\)/);
    assert.match(arSource, /session === context\.launchedSession/);
    assert.match(arSource, /placementArmGeneration === context\.generation/);
    assert.match(restoration, /loadProjectSites\(operation\.projectId\)/);
    assert.match(restoration, /loadPlaceMarkers\(operation\.projectId, operation\.siteId, area\.id\)/);
    assert.match(restoration, /isArOperationCurrent\(operation, guardOptions\)/);
    assert.match(quickPlace, /const loadingOperation = captureArOperationContext\(\)/);
    assert.match(quickPlace, /const operation = captureArOperationContext\(\)/);
    assert.match(quickPlace, /operationIsCurrent/);
    assert.match(quickPlace, /createPlaceMarker\(operation\.projectId, operation\.siteId, operation\.areaId/);
    assert.match(quickPlace, /saveMarkerAnchor\(operation\.projectId, operation\.siteId, operation\.areaId/);
    assert.match(quickPlace, /if \(!operationIsCurrent\(\)\) return;[\s\S]*sessionMarkers\.push\(record\)/);
    assert.match(launch, /const launchedSession = session/);
    assert.match(launch, /if \(session !== launchedSession\) return/);
    assert.match(launch, /const restorationGuard = \{ matchGeneration: false \}/);
    assert.match(launch, /loadPlacementAreas\(loadingOperation, restorationGuard\)/);
    assert.match(arSource, /saveMarkerAnchor\(operation\.projectId, state\.record\.siteId, state\.record\.areaId/);
    assert.match(arSource, /await saveMarkerAnchor\(operation\.projectId[\s\S]*if \(!isArOperationCurrent\(operation\)\) return;[\s\S]*moved\. View mode is now on/);
    assert.match(arSource, /function finishNaturalArExit/);
    assert.match(arSource, /window\.removeEventListener\('popstate', handleArHistoryBack\)/);
    assert.match(arSource, /window\.addEventListener\('popstate', \(\) => navigateAfterAr\(projectId, areaId, returnContext\), \{ once: true \}\)/);
    assert.match(arSource, /history\.back\(\)/);
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
    assert.match(source, /placementReady/);
    assert.match(source, /aimRevealTimer = setTimeout/);
    assert.match(source, /placementPointerMarkup/);
    assert.match(source, /Let’s place it around you using our centre aim/);
    assert.match(styles, /\.tryit-place\.is-revealing/);
    assert.match(styles, /\.tryit-place\.is-ready \{ pointer-events: auto;/);
    assert.doesNotMatch(source, /Dashboard|draggable-window/);
    assert.match(styles, /\.tryit-demo\.is-immersive \.tryit-stage \{ pointer-events: none;/);
    assert.match(styles, /\.tryit-exit[\s\S]*pointer-events: auto;/);
    assert.match(source, /label\.width = 1120/);
    assert.match(source, /drawWrappedTextureText/);
    assert.match(styles, /width: min\(88vw, 560px\)/);
    assert.match(styles, /overflow-wrap: anywhere/);
    assert.match(source, /Welcome to our quick demo/);
    assert.match(source, /Imagine your space coming alive with rich information/);
    assert.match(source, /Let’s test some NourishlandXR features/);
    assert.match(source, /Start the demo/);
    assert.match(styles, /\.tryit-guided-choice h2 \{ color: #fff !important;/);
    assert.match(source, /typeNextCharacter/);
    assert.match(source, /boardTypingTimer = setTimeout\(typeNextCharacter, 46\)/);
    assert.match(styles, /\.tryit-guided-choice\.is-typing p::after/);
    assert.match(source, /record\.tutorialStage === demoStage/);
    assert.match(source, /data-tryit-guided-choice/);
    assert.match(source, /Choose Lemon Myrtle/);
    assert.match(source, /LEMON_MYRTLE_KNOWLEDGE/);
    assert.match(source, /plantKnowledgeMarkup/);
    assert.match(source, /drawPlantKnowledgeTexture/);
    assert.match(source, /const open = cell\.key === activeBranch/);
    assert.match(source, /bindSimulatedInformationPanels/);
    assert.match(source, /demoPanelOffset/);
    assert.match(source, /record\.informationPosition = plantInformationPosition\(record\)/);
    assert.match(source, /viewerMatrix\?\.\[13\]/);
    assert.match(source, /drawSpatialTether/);
    assert.match(source, /simulatedAnchor/);
    assert.doesNotMatch(source, /Math\.max\(record\.position\.y \+ 1\.35, 1\.35\)/);
    assert.doesNotMatch(styles, /--marker-index/);
    assert.doesNotMatch(styles, /\+ 230px/);
    assert.match(styles, /\.tryit-sim-plant-tether/);
    assert.match(styles, /\.tryit-sim-plant-tether path \{ fill: none;/);
    assert.match(styles, /\.tryit-sim-plant-profile/);
    assert.match(styles, /\.tryit-sim-plant-profile \{[\s\S]*pointer-events: none;/);
    assert.match(source, /record\.demoExpanded = false/);
    assert.match(styles, /\.plant-knowledge-map/);
    assert.match(styles, /\.plant-knowledge-core/);
    assert.match(styles, /\.plant-knowledge-cell/);
    assert.match(styles, /\.plant-knowledge-cell:is\(:hover, :focus-visible, \.is-open\)/);
    assert.match(styles, /body\[data-project-theme\] \.tryit-demo \.plant-knowledge-cell/);
    assert.match(styles, /\.tryit-sim-marker-note:not\(\.is-expanded\)/);
    assert.match(source, /Point of Interest/);
    assert.match(source, /DON’T GO HERE/);
    assert.match(source, /Raise the Area Totem/);
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
    assert.match(source, /Choose its purpose/);
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
    assert.match(source, /loadPlacementAreas\(loadingOperation, restorationGuard\)[\s\S]*restoreRecordedMarkers\(restoringOperation, restorationGuard\)/);
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
    assert.match(arSource, /startPromise = launchArMode\(projectId, areaId, checkpointId, initialPlacementType, existingMarkerId, returnContext, preferredSiteId\)/);
    assert.doesNotMatch(arSource, /isSessionSupported\('immersive-ar'\)/);
    assert.match(arSource, /session = await navigator\.xr\.requestSession\('immersive-ar'/);
    assert.match(dashboardSource, /const started = await window\.startArMode/);
    assert.match(dashboardSource, /Open Test AR/);
    assert.match(dashboardSource, /renderAreaCheckpointForm/);
    assert.match(dashboardSource, /saveAreaCheckpoint/);
    assert.match(dashboardSource, /type: 'area_checkpoint'/);
    assert.match(dashboardSource, /Physical QR or location code/);
    assert.match(dashboardSource, /Edit Totem information/);
    assert.match(serverSource, /'area_checkpoint'/);
    assert.match(persistenceSource, /unsupported\|placement\|spatial\|anchor type\|gps\|qr/);
});

test('dashboard focuses on Open AR while the Organizer Folder stays secondary', () => {
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
    assert.match(arSource, /readyPlacementType = pendingExistingMarkerId \? '' : AR_EXPERIENCE_CONFIG\.markerTypes\.includes\(initialPlacementType\)/);
    assert.match(configSource, /placementDistanceMetres: 1\.2/);
    assert.match(configSource, /name: 'Unassigned'/);
    assert.match(dashboardSource, /'intro_checkpoint'/);
    assert.match(arSource, /Aim the centre circle, then tap it to place/);
    assert.match(arSource, /readyPlacementType = '';\s*updateReadyPlacementControl\(\);\s*setPlacementStatus\(`Placing/);
    assert.match(mainSource, /window\.startArMode = \(projectId, areaId, checkpointId, initialPlacementType = '', existingMarkerId = '', returnContext = '', preferredSiteId = ''\)/);
    assert.match(mainSource, /window\.startExistingMarkerPlacement/);
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
    assert.match(arSource, /area_checkpoint: 1, intro_checkpoint: 2, note: 3, plant: 4/);
    assert.match(arSource, /area_checkpoint: \[\.225 \* factor, 1 \* factor\]/);
    assert.match(arSource, /intro_checkpoint: \[\.42 \* factor, \.805 \* factor\]/);
    assert.match(arSource, /float jade/);
    assert.match(arSource, /shape<1\.5\?\.82:\.50/);
    assert.match(arSource, /float rect/);
    assert.match(arSource, /float core/);
    assert.match(arSource, /Area Totem/);
    assert.match(arSource, /trail entrance gateway/);
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
