import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createUvSphereGeometry, sphereModelMatrix } from '../app/services/spatialSphereRenderer.js';
import { createTetherRibbonGeometry } from '../app/services/spatialTetherRenderer.js';
import { createPrismGeometry, prismModelMatrix } from '../app/services/spatialPrismRenderer.js';
import { createTrianglePrismGeometry } from '../app/services/spatialTriangleRenderer.js';
import { demoPlacementPosition, selectGuidedDemoOrb } from '../app/screens/temporaryArDemo.js';
import { creatorPlantProfileLayout } from '../app/services/creatorPlantProfileLayout.js';
import { alignAreaToCheckpoint } from '../app/services/areaSpatialAlignment.js';
import { normalizeTotemHeightPreset, totemHeightPreset, totemHeightScale } from '../app/services/totemAppearance.js';
import {
    arucoMarkerMatrix,
    createPhysicalAnchorTrackingState,
    normalizePhysicalAnchor,
    physicalAnchorPointToDetectorCamera,
    physicalMarkerLabel,
    resolvePhysicalAnchorTotem
} from '../app/services/physicalAnchor.js';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Try It Now immersive placement resolves the shared AR distance without stalling', () => {
    const viewer = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 1.5, 4, 1]);
    const position = demoPlacementPosition(viewer, { x: 0, y: -0.25, z: -1 });
    assert.deepEqual(position, { x: 2, y: 1.25, z: 3 });
});

test('immersive demo selection opens the guided Plant Profile', () => {
    const waiting = { demoType: 'plant', demoInteractive: true, awaitingProfileReveal: true, demoExpanded: false };
    const unrelated = { demoType: 'note', demoInteractive: true };
    let selected = null;
    assert.equal(selectGuidedDemoOrb([waiting, unrelated], record => { selected = record; }), true);
    assert.equal(selected, waiting);
    waiting.awaitingProfileReveal = false;
    assert.equal(selectGuidedDemoOrb([waiting, unrelated], () => {}), false);
});

test('Creator AR keeps the Plant orb directly above its profile diagram', () => {
    const phone = creatorPlantProfileLayout(390, 844, 195, 300);
    assert.equal(phone.panelX, 195);
    assert.ok(phone.panelTop > 300);
    assert.equal(phone.panelY, phone.panelTop + phone.panelHeight / 2);
    assert.ok(phone.panelTop + phone.panelHeight <= 844 - 108);

    const edge = creatorPlantProfileLayout(390, 844, 12, 300);
    assert.ok(edge.panelX - edge.panelWidth / 2 >= 8);
});

test('Creator AR recenters a saved Area around its Totem without losing relative positions', () => {
    const records = [
        {
            marker: { id: 'kitchen-totem', type: 'area_checkpoint' },
            position: { x: 2, y: 0, z: -3 },
            coordinateSpace: 'session-local'
        },
        {
            marker: { id: 'kitchen-plant', type: 'plant' },
            position: { x: 2.6, y: 0.8, z: -4.2 },
            coordinateSpace: 'session-local'
        }
    ];
    const aligned = alignAreaToCheckpoint(records, 'kitchen-totem', { x: 8, y: 0, z: 5 });
    assert.deepEqual(aligned.checkpoint.position, { x: 8, y: 0, z: 5 });
    assert.deepEqual(aligned.records[1].position, { x: 8.6, y: 0.8, z: 3.8 });
    assert.deepEqual(aligned.records[1].anchorPosition, { x: .6000000000000001, y: .8, z: -1.2000000000000002 });
    assert.equal(aligned.records[1].coordinateSpace, 'checkpoint-local');
    assert.equal(aligned.records[1].checkpointId, 'kitchen-totem');

    const restoredAgain = alignAreaToCheckpoint(aligned.records, 'kitchen-totem', { x: -1, y: 0, z: -1 });
    assert.deepEqual(restoredAgain.records[1].position, { x: -.3999999999999999, y: .8, z: -2.2 });

    const mixedMigration = alignAreaToCheckpoint([
        records[0],
        aligned.records[1],
        {
            marker: { id: 'kitchen-note', type: 'note' },
            position: { x: 1.5, y: 1, z: -2.5 },
            coordinateSpace: 'session-local'
        }
    ], 'kitchen-totem', { x: 4, y: 0, z: 4 });
    assert.deepEqual(mixedMigration.records[1].position, { x: 4.6, y: .8, z: 2.8 });
    assert.deepEqual(mixedMigration.records[2].position, { x: 3.5, y: 1, z: 4.5 });
});

test('Physical Marker IDs use the exact original ArUco 5x5 encoding and NL labels', () => {
    assert.equal(physicalMarkerLabel(1), 'NL-001');
    assert.equal(physicalMarkerLabel(10), 'NL-010');
    assert.deepEqual(arucoMarkerMatrix(1), [
        [1, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 0, 1, 1, 1]
    ]);
});

test('Physical Marker settings validate and keep numeric ID separate from its label', () => {
    const anchor = normalizePhysicalAnchor({
        enabled: true,
        markerId: '3',
        markerSizeMm: '140',
        offsetMeters: { x: '.1', y: '0', z: '-.2' },
        rotationDegrees: { yaw: '45', pitch: '0', roll: '-2' },
        scale: '1.25'
    });
    assert.equal(anchor.markerId, 3);
    assert.equal(anchor.markerLabel, 'NL-003');
    assert.equal(anchor.markerFamily, 'aruco-original-5x5');
    assert.equal(anchor.markerSizeMm, 140);
    assert.equal(anchor.scale, 1.25);
    assert.throws(() => normalizePhysicalAnchor({ ...anchor, markerSizeMm: 0 }), /greater than zero/);
    assert.throws(() => normalizePhysicalAnchor({ ...anchor, scale: Number.NaN }), /finite number/);
});

test('Physical Marker transform applies scale, rotations, offsets and detector pose in one order', () => {
    const cameraPoint = physicalAnchorPointToDetectorCamera(
        { x: 1, y: 0, z: 0 },
        {
            bestRotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
            bestTranslation: [0, 0, 0]
        },
        {
            enabled: true,
            markerId: 1,
            markerSizeMm: 140,
            offsetMeters: { x: 1, y: 2, z: 3 },
            rotationDegrees: { yaw: 0, pitch: 0, roll: 90 },
            scale: 2
        }
    );
    assert.ok(Math.abs(cameraPoint.x - 1000) < 1e-9);
    assert.ok(Math.abs(cameraPoint.y - 3000) < 1e-9);
    assert.ok(Math.abs(cameraPoint.z - 4000) < 1e-9);
});

test('Physical Marker tracking loads one Totem, holds briefly and clears after marker loss', () => {
    const association = {
        marker: {
            id: 'kitchen-totem',
            name: 'Kitchen Totem',
            physicalAnchor: { enabled: true, markerFamily: 'aruco-original-5x5', markerId: 1 }
        }
    };
    assert.equal(resolvePhysicalAnchorTotem([association], 1), association);
    const tracking = createPhysicalAnchorTrackingState(300);
    const resolve = id => resolvePhysicalAnchorTotem([association], id);
    const first = tracking.update([{ id: 1 }], 1000, resolve);
    assert.equal(first.state, 'tracked');
    assert.equal(first.loadModel, true);
    assert.equal(tracking.update([{ id: 1 }], 1100, resolve).loadModel, false);
    assert.equal(tracking.update([], 1399, resolve).state, 'holding');
    assert.equal(tracking.update([], 1401, resolve).state, 'lost');
    assert.equal(tracking.update([], 1402, resolve).state, 'searching');
    assert.equal(tracking.update([{ id: 99 }], 1403, resolve).state, 'searching');
    const reacquired = tracking.update([{ id: 1 }], 1500, resolve);
    assert.equal(reacquired.state, 'tracked');
    assert.equal(reacquired.loadModel, false);
});

test('Physical Marker prototype is feature-flagged and exposes saved and unsaved scan paths', () => {
    const dashboard = read('app/screens/projectDashboard.js');
    const scanner = read('app/screens/physicalAnchorScanner.js');
    const server = read('tools/persistence-server.mjs');
    const printCenter = read('app/screens/printCenter.js');
    assert.match(dashboard, /physicalAnchors: false/);
    assert.match(dashboard, /Physical Marker prototype/);
    assert.match(dashboard, /Test in AR/);
    assert.match(dashboard, /Scan Physical Marker/);
    assert.match(dashboard, /Remove association/);
    assert.match(scanner, /dictionaryName: 'ARUCO'/);
    assert.match(scanner, /TRACKING_GRACE_MS = 300/);
    assert.match(scanner, /getTracks\(\)\.forEach\(track => track\.stop\(\)\)/);
    assert.match(scanner, /js-aruco2@2\.0\.0/);
    assert.ok(scanner.indexOf('getUserMedia') < scanner.indexOf('new window.AR.Detector'));
    assert.match(dashboard, /physicalAnchorControlPresent \? physicalAnchor : existing\?\.marker\.physicalAnchor/);
    assert.match(dashboard, /ArUco Plant Live Tag/);
    assert.match(dashboard, /physicalAnchorFromPlantProfileForm/);
    assert.match(scanner, /resolvePhysicalAnchorEntry/);
    assert.match(server, /type !== 'area_checkpoint' && type !== 'plant'/);
    assert.match(printCenter, /print-plant-tag-anchor/);
    assert.match(printCenter, /printPlantVirtualTag/);
});

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
    assert.doesNotMatch(creatorSource, /hoverVibration|livingRadius|profileHovered/);
    assert.match(creatorSource, /drawSpatialOrb\(gl, sphereRenderer, view, record\.position/);
    assert.match(creatorSource, /readyPlacementType === 'plant' \? 'plant' : 'marker'/);
    assert.match(demoSource, /record\.demoType === 'plant' \? 'plant' : record\.demoType === 'marker' \? 'marker'/);
    assert.match(demoSource, /const orbOnly = \['marker', 'plant'\]\.includes\(record\.demoType\) && !record\.demoExpanded/);
    assert.match(demoSource, /class="tryit-sim-orb/);
    assert.match(styles, /\.tryit-sim-orb\.is-plant::after/);
    assert.match(sphereSource, /createUvSphereGeometry\(latitudeBands = 12, longitudeBands = 16\)/);
    assert.doesNotMatch(sphereSource, /uniform float time|uniform float motion|ribbonA|ribbonB/);
    assert.match(sphereSource, /alpha: plant \? 0\.84 : 0\.92/);
    assert.match(styles, /\.creator-ar-marker-hit-target\.is-arrow-marker \.creator-ar-special-symbol \{[\s\S]*background:transparent;[\s\S]*box-shadow:none;/);
    assert.match(styles, /\.creator-ar-arrow-grid \.creator-ar-symbol-marker \{[\s\S]*background:transparent !important;/);
    assert.match(explorerSource, /drawSpatialContent:[\s\S]*drawSpatialOrb/);
    assert.match(panelSource, /opts\.drawSpatialContent\(view\)/);
});

test('Creator AR Taskbar V2 keeps the main bar permanent and adds compact context tools', () => {
    const arSource = read('app/screens/arMode.js');
    const styles = read('app/style.css');
    const pointerSource = read('app/services/placementPointer.js');
    const taskbar = arSource.slice(
        arSource.indexOf('<nav class="creator-ar-taskbar"'),
        arSource.indexOf('</nav>', arSource.indexOf('<nav class="creator-ar-taskbar"'))
    );
    assert.match(arSource, /data-ar-add-plant/);
    assert.match(arSource, /data-ar-add-note/);
    assert.doesNotMatch(arSource, /data-ar-add-marker/);
    assert.doesNotMatch(arSource, /\+ MARKER/);
    assert.match(arSource, /data-ar-add-special/);
    assert.match(arSource, /\+ SPECIAL/);
    assert.match(styles, /\.creator-ar-taskbar \.creator-ar-add-marker/);
    assert.match(arSource, /data-ar-place-picker/);
    assert.match(arSource, /data-ar-taskbar-version="2"/);
    assert.match(arSource, /data-ar-context-toolbar/);
    assert.match(arSource, /data-ar-cycle-color/);
    assert.match(arSource, /data-ar-cycle-shape/);
    assert.match(arSource, /data-ar-cycle-size/);
    assert.match(arSource, /data-ar-cycle-opacity/);
    assert.match(arSource, /data-ar-context-web/);
    assert.match(arSource, /data-ar-context-location-note/);
    assert.match(arSource, /const TASKBAR_V2_SIZES = Object\.freeze\(\['tiny', 'small', 'medium', 'large', 'huge'\]\)/);
    assert.match(arSource, /const TASKBAR_V2_OPACITIES = Object\.freeze\(\[1, \.8, \.6, \.4\]\)/);
    assert.match(arSource, /MARKER_APPEARANCE_SHAPES = Object\.freeze\(\['orb', 'plate', 'triangle'\]\)/);
    assert.match(arSource, /drawSpatialTriangle\(gl, triangleRenderer/);
    assert.match(arSource, /spatialTriangleRenderer\.js/);
    assert.match(styles, /\.creator-ar-context-toolbar\[hidden\] \{ display:none; \}/);
    assert.doesNotMatch(styles, /\.creator-ar-overlay\.is-placement-armed \.creator-ar-taskbar \[data-ar-view-mode\]/);
    assert.doesNotMatch(arSource, /creator-ar-toolbox/);
    assert.match(arSource, /async function armPlacement\(type, specialMarker = null\)/);
    assert.match(arSource, /Tap the centre circle to place it/);
    assert.match(arSource, /data-ar-web-return/);
    assert.match(arSource, /&#x23CE;<\/b><span>WEB/);
    assert.doesNotMatch(arSource, /Choose its purpose/);
    assert.doesNotMatch(arSource, /data-ar-placed-type=/);
    assert.match(arSource, /\['plant', 'sub_checkpoint'\]\.includes\(readyPlacementType\)/);
    assert.doesNotMatch(arSource, /data-ar-web-mode/);
    assert.doesNotMatch(arSource, /data-ar-select-area/);
    assert.match(arSource, /data-ar-view-mode/);
    assert.match(arSource, /data-ar-hold-mode/);
    assert.match(arSource, /data-ar-select-mode/);
    assert.match(styles, /\.creator-ar-view-icon/);
    assert.doesNotMatch(taskbar, /data-ar-reset|data-ar-recenter/);
    assert.doesNotMatch(taskbar, /data-ar-open-bag|Organizer Folder/);
    assert.equal((taskbar.match(/<button/g) || []).length, 7);
    assert.doesNotMatch(styles, /\.creator-ar-marker-layer\.is-grab-mode \.creator-ar-marker-hit-target::after/);
    assert.match(styles, /\.creator-ar-marker-layer\.is-grab-mode \.creator-ar-marker-hit-target:is\(:hover,:focus-visible\)::after/);
    assert.match(styles, /\.creator-ar-marker-hit-target\.is-adjusting::after/);
    assert.match(styles, /\.creator-ar-marker-hit-target-note \{ width:var\(--marker-note-width,min\(72vw,280px\)\); height:var\(--marker-note-height,116px\)/);
    assert.match(styles, /\.creator-ar-taskbar \.creator-ar-add-note[\s\S]*background:#a95d32 !important/);
    assert.match(styles, /\.creator-ar-taskbar \[data-ar-view-mode\][\s\S]*background:#246ea6 !important/);
    assert.match(arSource, /note: \[\.94 \* factor, \.345 \* factor\]/);
    assert.match(styles, /\.creator-ar-marker-hit-target-area_checkpoint \{ width: 72px; height: 132px/);
    assert.doesNotMatch(styles, /\.is-grab-mode \.creator-ar-marker-hit-target::before/);
    assert.match(arSource, /creator-ar-mode-pointer/);
    assert.match(arSource, /is-hold-mode/);
    assert.match(styles, /\.creator-ar-overlay\.is-view-mode \.creator-ar-mode-pointer/);
    assert.match(styles, /\.creator-ar-overlay\.is-view-mode \.creator-ar-mode-pointer \{ opacity: 0; visibility: hidden; \}/);
    assert.match(styles, /\.creator-ar-overlay\.is-neutral-mode/);
    assert.match(styles, /\.creator-ar-overlay\.is-hold-mode \.creator-ar-mode-pointer/);
    assert.match(styles, /\.creator-ar-overlay\.is-select-mode \.creator-ar-mode-pointer/);
    assert.match(styles, /\.creator-ar-mode-pointer \{[^}]*top:\s*calc\(50% \+ 3\.5cm\)/);
    assert.doesNotMatch(arSource, /data-ar-mode-pointer-label/);
    assert.doesNotMatch(arSource, /data-ar-ready-place|creator-ar-ready-placement|creator-ar-ready-ring/);
    assert.match(arSource, /launchedSession\.addEventListener\('select'/);
    assert.match(arSource, /data-ar-placement-capture/);
    assert.match(arSource, /const bindTaskbarAction = \(selector, action\) =>/);
    assert.match(arSource, /bindTaskbarAction\('\[data-ar-add-plant\]'/);
    assert.match(arSource, /bindTaskbarAction\('\[data-ar-add-note\]'/);
    assert.match(arSource, /bindTaskbarAction\('\[data-ar-add-special\]'/);
    assert.match(arSource, /addEventListener\('pointerup'/);
    assert.match(arSource, /event\.stopImmediatePropagation\(\)/);
    assert.doesNotMatch(arSource, /querySelector\('\.creator-ar-taskbar'\)\.addEventListener\('click'/);
    assert.match(arSource, /event\.stopPropagation\(\)/);
    assert.match(arSource, /function controllerInputSource\(\)/);
    assert.match(arSource, /function activateControllerSelection\(\)/);
    assert.match(arSource, /function updateControllerRay\(frame\)/);
    assert.match(arSource, /function positionControllerPointer\(view = latestView\)/);
    assert.match(arSource, /data-ar-controller-pointer/);
    assert.match(arSource, /projectWorldPoint\(view, point\)/);
    assert.match(arSource, /targetRaySpace/);
    assert.match(arSource, /selectstart/);
    assert.match(arSource, /selectend/);
    assert.match(styles, /creator-ar-controller-hud/);
    assert.match(styles, /creator-ar-controller-pointer/);
    assert.match(arSource, /placementPointerMarkup/);
    assert.match(pointerSource, /creator-ar-breathing-target/);
    assert.match(pointerSource, /creator-ar-placement-pointer/);
    assert.match(pointerSource, /creator-ar-placement-guide-label/);
    assert.match(styles, /\.tryit-place\.creator-ar-placement-guide \.creator-ar-placement-pointer \{[^}]*border-radius:999px !important/);
    assert.match(arSource, /data-ar-placement-guide-label/);
    assert.match(arSource, /creator-ar-spatial-name/);
    assert.match(styles, /\.creator-ar-overlay\.is-placement-armed \.creator-ar-placement-guide/);
    assert.match(styles, /@keyframes creator-ar-breathe/);
    assert.match(arSource, /addEventListener\('pointerup'/);
    assert.match(arSource, /performance\.now\(\) - placementArmedAt > 180/);
    assert.match(styles, /\.creator-ar-overlay\.is-placement-armed \.creator-ar-placement-capture \{ pointer-events: auto; \}/);
    assert.match(styles, /\.creator-ar-status/);
    assert.match(arSource, /performance\.now\(\) - placementArmedAt > 250/);
    assert.match(arSource, /\['plant', 'sub_checkpoint'\]\.includes\(readyPlacementType\) && latestViewerMatrix/);
    assert.match(arSource, /function pointerWorldRay\(\)/);
    assert.match(arSource, /readyPlacementType \? '\.creator-ar-placement-guide' : '\.creator-ar-mode-pointer'/);
    assert.match(arSource, /spawnedAt: performance\.now\(\)/);
    assert.match(arSource, /opacity: arrivalEase \* markerAppearanceOpacity\(record\.marker\)/);
});

test('Creator AR keeps the editable Location Note hidden until it is opened from its Totem', () => {
    const arSource = read('app/screens/arMode.js');
    const demoSource = read('app/screens/temporaryArDemo.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const mainSource = read('app/main.js');
    const styles = read('app/style.css');
    assert.match(arSource, /const DEFAULT_LOCATION_NOTE = Object\.freeze\(\{[\s\S]*prompt: 'WHERE AM I NOW\?'/);
    assert.match(arSource, /data-ar-location-note/);
    assert.match(arSource, /data-ar-location-title/);
    assert.match(arSource, /data-ar-location-area>AREA · \$\{escapeHtml\(activeAreaName \|\| DEFAULT_HOME_AREA_NAME\)\}/);
    assert.match(arSource, /let locationNoteVisible = false/);
    assert.match(arSource, /note\.hidden = !config\.enabled \|\| !locationNoteVisible/);
    assert.match(arSource, /function ensureLocationNoteAnchor\(\)/);
    assert.match(arSource, /const totem = activeTotemRecord\(\)/);
    assert.match(arSource, /const grounded = groundedTotemPosition\(totem\.position\)/);
    assert.match(arSource, /y: attachmentY \+ 1\.15/);
    assert.match(arSource, /function positionLocationNote\(view = latestView\)/);
    assert.match(arSource, /data-ar-context-location-note/);
    assert.match(arSource, /locationNoteVisible \? 'HIDE NOTE' : 'VIEW NOTE'/);
    assert.match(arSource, /function toggleLocationNoteVisibility\(record = activeTotemRecord\(\)\)/);
    assert.match(arSource, /data-ar-toggle-location-note/);
    assert.match(arSource, /locationNoteConfig = null;\s*locationNoteVisible = false/);
    assert.match(arSource, /locationNoteConfig = normalizedLocationNote\(\);\s*locationNoteVisible = false/);
    assert.match(arSource, /location-stick-length/);
    assert.match(arSource, /loadProject\(operation\.projectId\)\.catch/);
    assert.match(arSource, /project\?\.arLocationNote/);
    assert.match(styles, /\.creator-ar-location-note-board/);
    assert.match(styles, /\.creator-ar-location-stick/);
    assert.match(styles, /\.creator-ar-location-ground/);
    assert.match(styles, /\.creator-ar-location-note-board \{[^}]*width:min\(62vw,520px\)/);
    assert.match(styles, /\.creator-ar-location-stick \{[^}]*height:1px;[^}]*repeating-linear-gradient/);
    assert.match(styles, /100% \{ opacity:\.7;[^}]*translate\(-50%,-50%\)/);
    assert.match(styles, /\.nourishland-spatial-note-surface/);
    assert.match(demoSource, /tryit-spatial-welcome-note nourishland-spatial-note-surface/);
    assert.match(demoSource, /record\.demoType === 'note' \? ' nourishland-spatial-note-surface'/);
    assert.match(arSource, /record\.marker\.type === 'note' \? ' nourishland-spatial-note-surface'/);
    assert.match(dashboardSource, /<h2 id="projectLocationNoteTitle">AR Location Note<\/h2>/);
    assert.match(dashboardSource, /It stays hidden when AR opens/);
    assert.match(dashboardSource, /Available from Totem Marker/);
    assert.doesNotMatch(dashboardSource, /Show on AR entry/);
    assert.match(dashboardSource, /export async function saveArLocationNoteSettings/);
    assert.match(dashboardSource, /arLocationNote: \{ enabled, prompt, title \}/);
    assert.match(mainSource, /window\.saveArLocationNoteSettings/);
});

test('Note placement preview uses the shared Note surface instead of the shader rectangle', () => {
    const arSource = read('app/screens/arMode.js');
    const styles = read('app/style.css');
    const drawStart = arSource.indexOf('function drawSpatialMarkers(view)');
    const drawEnd = arSource.indexOf('function positionSessionMarkers', drawStart);
    const drawSource = arSource.slice(drawStart, drawEnd);
    assert.match(arSource, /data-ar-note-placement-preview/);
    assert.match(arSource, /creator-ar-note-placement-surface[^"]*nourishland-spatial-note-surface/);
    assert.match(arSource, /function updateNotePlacementPreview\(\)/);
    assert.match(arSource, /function positionNotePlacementPreview\(view = latestView\)/);
    assert.match(arSource, /markerDomAppearanceStyle\(marker\)\.split\(';'\)/);
    assert.match(arSource, /--marker-note-width/);
    assert.match(arSource, /const marginX = noteFactor \? Math\.min\(window\.innerWidth \* \.48, 140 \* noteFactor \+ 48\) : 40/);
    assert.match(arSource, /const marginY = noteFactor \? 58 \* noteFactor \+ 56 : 40/);
    assert.doesNotMatch(drawSource, /readyPlacementType === 'note'/);
    assert.doesNotMatch(drawSource, /markerShape\('note'\)/);
    assert.match(styles, /\.creator-ar-note-placement-preview/);
    assert.match(styles, /\.creator-ar-note-placement-surface/);
    assert.match(styles, /\.creator-ar-note-placement-preview\.creator-ar-marker-hit-target-note \.creator-ar-note-placement-surface \{ transform:none; \}/);
});

test('Special opens immediately with Totem tools above symbols', () => {
    const arSource = read('app/screens/arMode.js');
    const start = arSource.indexOf('async function openSpecialMarkerPicker()');
    const end = arSource.indexOf('function resetArControls()', start);
    const specialPicker = arSource.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.match(specialPicker, /picker\.hidden = false/);
    assert.doesNotMatch(specialPicker, /restoreRecordedMarkers|loadPlacementAreas|Loading Area tools/);
    assert.match(specialPicker, /renderSpecialMarkerChoices\(picker\)/);
    const renderStart = arSource.indexOf('function renderSpecialMarkerChoices(picker)');
    const renderEnd = arSource.indexOf('async function openArAreaCreationForm()', renderStart);
    const specialChoices = arSource.slice(renderStart, renderEnd);
    assert.match(specialChoices, /<p>Special<\/p>/);
    assert.match(specialChoices, />TOTEM</);
    assert.match(specialChoices, /data-ar-toggle-totem/);
    assert.match(specialChoices, /data-ar-toggle-location-note/);
    assert.match(specialChoices, /data-ar-add-totem/);
    assert.match(specialChoices, /Add Totem/);
    assert.match(specialChoices, /'Hide Totem Guide'/);
    assert.match(specialChoices, /'Show Totem Guide'/);
    assert.match(specialChoices, /'View Location Note'/);
    assert.doesNotMatch(specialChoices, /Totem \/ Area|data-ar-create-area/);
    assert.match(specialChoices, /ARROWS, EXCLAMATION AND QUESTION MARKS/);
    assert.match(specialChoices, />SYMBOLS</);
    assert.match(specialChoices, /\['!', 'Important'\]/);
    assert.match(specialChoices, /\['\?', 'Question'\]/);
    assert.doesNotMatch(specialChoices, /EXISTING RECORDS|data-ar-import-marker/);
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
    assert.match(arSource, /let interactionMode = 'neutral'/);
    assert.match(arSource, /interactionMode = interactionMode === mode && \['grab', 'select'\]\.includes\(mode\) \? 'neutral' : mode/);
    assert.match(arSource, /View only mode\. The pointer is hidden; tap a Marker to reveal or hide its information/);
    assert.match(arSource, /Move mode is on\. Select a glowing element/);
    assert.match(arSource, /dragState\.distance \+ dragState\.depthOffset/);
    assert.match(arSource, /const verticalTravel = dragState\.gestureStartY - event\.clientY/);
    assert.match(arSource, /setHeldMarkerDepthOffset\(verticalTravel \/ 120\)/);
    assert.match(arSource, /function heldPointerRay\(\)/);
    assert.match(arSource, /const CREATOR_AR_HOLD_DELAY_MS = 420/);
    assert.match(arSource, /const CREATOR_AR_HOLD_MOVE_TOLERANCE_PX = 14/);
    assert.match(arSource, /function beginMarkerHoldGesture\(record, event\)/);
    assert.match(arSource, /function moveMarkerHoldGesture\(event\)/);
    assert.match(arSource, /function finishMarkerHoldGesture\(record, event\)/);
    assert.match(arSource, /beginMarkerInteraction\(record, event, \{ directHold: true, element \}\)/);
    assert.match(arSource, /element\?\.setPointerCapture\?\.\(event\.pointerId\)/);
    assert.match(arSource, /element\?\.addEventListener\('pointermove', moveMarkerHoldGesture\)/);
    assert.match(arSource, /element\?\.addEventListener\('pointerup', event => finishMarkerHoldGesture\(record, event\)\)/);
    assert.match(arSource, /Hold any placed item to move it/);
    assert.match(arSource, /const origin = pointerWorldOrigin\(\) \|\|/);
    assert.match(arSource, /data-ar-depth-joystick/);
    assert.doesNotMatch(arSource, /window\.innerHeight - 104/);
    assert.match(arSource, /updateGrabbedMarkerFromCamera/);
    assert.match(arSource, /origin\.z \+ ray\.z \* distance/);
    assert.doesNotMatch(arSource, /data-ar-depth-joystick\] input/);
    assert.match(arSource, /Pointer mode is on/);
    assert.match(arSource, /if \(!directHold && interactionMode === 'view'\) \{[\s\S]*record\.infoVisible = !record\.infoVisible/);
    assert.match(arSource, /if \(!directHold && interactionMode === 'neutral'\) return/);
    assert.match(arSource, /openMarkerContextToolbar\(record\)/);
    assert.match(arSource, /function updateContextToolbar\(\)/);
    assert.match(arSource, /function cycleContextAppearance\(property\)/);
    assert.match(arSource, /function queueContextAppearanceSave\(record, appearance, property\)/);
    assert.match(arSource, /--spatial-note-color/);
    assert.match(arSource, /appearancePayload\(currentPlacementAppearance\(type\)\)/);
    assert.doesNotMatch(arSource.slice(arSource.indexOf('function createOverlay()'), arSource.indexOf('function cleanup()')), /data-ar-inline-editor/);
    assert.doesNotMatch(arSource, /showPlacedMarkerActions/);
    assert.match(arSource, /markerRgb\(record\.marker/);
    assert.match(arSource, /openContextInWebMode/);
    assert.match(arSource, /finishMarkerDrag/);
    assert.match(arSource, /pointercancel/);
    assert.match(arSource, /setPointerCapture/);
    assert.match(arSource, /moved\. Select another glowing element, turn off Move, or choose View/);
    assert.match(arSource, /Move cancelled\. Move mode remains on/);
    const finishHold = arSource.slice(arSource.indexOf('async function finishMarkerDrag'), arSource.indexOf('function cancelMarkerDrag'));
    assert.doesNotMatch(finishHold, /interactionMode\s*=/);
    assert.match(finishHold, /state\.record\.position = state\.position/);
    assert.match(arSource, /placementArmGeneration/);
    assert.match(arSource, /async function prepareExistingMarkerPlacement/);
    assert.match(arSource, /const returningToWebMarker = String\(arReturnContext\)\.startsWith\('web-marker:'\)/);
    assert.match(arSource, /pendingExistingMarkerId/);
    assert.match(arSource, /navigateAfterAr/);
    assert.match(arSource, /window\.resumeAreaCreationFlow/);
    assert.match(styles, /\.creator-ar-marker-layer\.is-view-mode \.creator-ar-marker-hit-target:hover \.creator-ar-spatial-name/);
    assert.match(styles, /\.creator-ar-marker-layer\.is-neutral-mode \.creator-ar-marker-hit-target:hover \.creator-ar-spatial-name/);
    assert.match(styles, /\.creator-ar-marker-hit-target\.is-info-open \.creator-ar-spatial-name/);
    assert.match(arSource, /function resetArControls\(\)/);
    assert.match(arSource, /readyPlacementType = '';/);
    assert.match(arSource, /AR controls reset\. The aim dot is ready; press plus when you want to place a Marker/);
    assert.doesNotMatch(arSource, /Choose its purpose/);
    assert.doesNotMatch(arSource, /data-ar-close-placed/);
    assert.match(arSource, /markerDimensions/);
    assert.match(arSource, /note: 3, plant: 4/);
    assert.match(arSource, /notice_board/);
    assert.match(arSource, /data-ar-create-area-form/);
    assert.match(arSource, /Create &amp; Place Totem/);
    assert.match(arSource, /async function createAreaCompatibleMarker/);
    assert.match(arSource, /convertRecordToAreaCheckpoint/);
    assert.doesNotMatch(arSource, /button\.dataset\.arPlacedType/);
    assert.doesNotMatch(arSource, /One tap completes this Marker/);
    assert.match(arSource, /creator-ar-control-dock/);
    assert.doesNotMatch(arSource, /data-ar-import-marker/);
    assert.doesNotMatch(arSource, /Import Marker \/ Plant/);
    assert.doesNotMatch(arSource, /data-ar-toggle-structural/);
    assert.match(styles, /\.creator-ar-special-grid/);
    assert.match(arSource, /groundGuideMatrix/);
    assert.match(arSource, /locatedTotemRecord/);
    assert.match(arSource, /const requestedArea = operation\.areaId/);
    assert.match(arSource, /createSpatialPrismRenderer/);
    assert.match(arSource, /drawSpatialPrism\(gl, prismRenderer, view, groundPosition/);
    assert.match(styles, /\.creator-ar-status \{[^}]*color: #fff !important/);
    assert.doesNotMatch(arSource, /What kind of Marker is this\?/);
    assert.match(configSource, /DEFAULT_HOME_AREA_NAME = 'Home'/);
    assert.match(configSource, /name: DEFAULT_HOME_AREA_NAME,[\s\S]*type: 'Other'/);
    assert.match(configSource, /\['home', 'unassigned'\]/);
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
    assert.doesNotMatch(arSource, /data-ar-web-mode/);
});

test('Creator AR keeps dashboard web-only while supporting controller controls', () => {
    const arSource = read('app/screens/arMode.js');
    const styles = read('app/style.css');
    const taskbar = arSource.slice(
        arSource.indexOf('<nav class="creator-ar-taskbar"'),
        arSource.indexOf('</nav>', arSource.indexOf('<nav class="creator-ar-taskbar"'))
    );
    assert.match(arSource, /targetRayMode|selectstart|selectend/);
    assert.match(arSource, /handedness === 'right'/);
    assert.match(arSource, /source\.targetRaySpace, source\.gripSpace/);
    assert.match(arSource, /function pointerWorldOrigin\(\)/);
    assert.match(arSource, /const origin = pointerWorldOrigin\(\)/);
    assert.match(arSource, /origin\.x \+ ray\.x \* distance/);
    assert.match(styles, /creator-ar-controller-pointer[^}]*z-index:12005/);
    assert.doesNotMatch(arSource, /move_dashboard|dashboardHoverRegionId|rayPositionedPanelMatrix/);
    assert.match(taskbar, /data-ar-hold-mode/);
    assert.doesNotMatch(taskbar, /data-ar-open-bag/);
    assert.doesNotMatch(taskbar, /data-ar-reset|data-ar-recenter/);
    assert.match(arSource, /checkpointSessionOrigin/);
});

test('Creator AR setup guide starts with Areas and keeps visitor entrances optional', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    assert.match(dashboardSource, /Totem Marker/);
    assert.match(dashboardSource, /Plants, Markers and Notes/);
    assert.match(dashboardSource, /Optional Trail Entrance/);
    assert.match(dashboardSource, /Visitor Entrances/);
    assert.match(dashboardSource, /Open Test AR/);
    assert.match(dashboardSource, /Stories &amp; Checkpoints/);
    assert.match(dashboardSource, /window\.renderStartingPoints/);
    assert.match(dashboardSource, /openCheckpointQuickSetup/);
    assert.match(dashboardSource, /Create New Area/);
    assert.match(dashboardSource, /Save the Area first\. You can add and place its Totem from the Area afterwards\./);
    assert.match(dashboardSource, /Place in AR/);
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
    assert.match(entrySource, /aria-expanded="true"/);
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
    assert.match(mainSource, /nourishland-xr-current-view-v1/);
    assert.match(mainSource, /function pushViewHistory/);
    assert.match(mainSource, /function replaceViewHistory/);
    assert.match(mainSource, /rememberedView\?\.view === 'dashboard'/);
    assert.match(mainSource, /rememberedView\?\.view === 'area'/);
    assert.match(mainSource, /rememberedView\?\.view === 'totem'/);
    assert.match(mainSource, /rememberedView\?\.view === 'entry'/);
    assert.match(mainSource, /rememberedView\?\.view === 'field-guide'/);
    assert.match(mainSource, /event\.state\?\.nourishlandView === 'area'/);
    assert.match(mainSource, /event\.state\?\.nourishlandView === 'totem'/);
    assert.match(mainSource, /event\.state\?\.nourishlandView === 'entry'/);
    assert.match(mainSource, /event\.state\?\.nourishlandView === 'field-guide'/);
    assert.match(mainSource, /pushViewHistory\('area', args\)/);
    assert.match(mainSource, /pushViewHistory\('totem', args\)/);
    assert.match(mainSource, /pushViewHistory\('entry', args\)/);
    assert.match(mainSource, /pushViewHistory\('field-guide', args\)/);
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
    assert.match(source, /return \[\.\.\.resolvedPlants, \.\.\.markerPlants\]/);
    assert.match(source, /virtualTagEnabled/);
    assert.match(source, /Plant Live Tags/);
    assert.match(source, /hasTotem/);
    assert.match(source, /hasStartingPoint/);
    assert.match(source, /field-guide-totem-symbol/);
    assert.match(source, /field-guide-starting-symbol/);
    assert.match(source, /totems: markers\.filter/);
    assert.match(source, /Totem Markers/);
    assert.match(source, /Area markers and their information boards/);
    assert.match(source, /data-field-guide-totem/);
    assert.match(source, /field-guide-advanced-search/);
    assert.match(source, /Advanced search options/);
    assert.match(source, /searchLabel\.textContent = 'Search'/);
});

test('Creator AR opens a passthrough or native immersive WebXR session and cleans up on exit', () => {
    const arSource = read('app/screens/arMode.js');
    const webxrSource = read('app/services/webxrSession.js');
    assert.match(arSource, /requestImmersiveArSession\(overlayRoot, \{ requireDomOverlay: true \}\)/);
    assert.match(webxrSource, /navigator\.xr\.requestSession\('immersive-ar'/);
    assert.match(webxrSource, /requestOptions\.domOverlay = \{ root: domOverlayRoot \}/);
    assert.match(webxrSource, /navigator\.xr\.requestSession\('immersive-vr'/);
    assert.match(webxrSource, /requiredFeatures: \['hit-test'\], optionalFeatures: \['dom-overlay', 'local-floor'\]/);
    assert.match(arSource, /launchedSession\.addEventListener\('end'/);
    assert.match(arSource, /creator-ar-session-active/);
    assert.match(arSource, /activeSession\?\.end/);
    assert.match(arSource, /history\.pushState\(\{ \.\.\.\(history\.state \|\| \{\}\), nourishlandCreatorAr: true \}/);
    assert.match(arSource, /window\.addEventListener\('popstate', handleArHistoryBack\)/);
    assert.match(arSource, /window\.renderProjectDashboard\?\.\(encodeURIComponent\(projectId\), '', false, 'returning'\)/);
    assert.match(arSource, /gl\.enable\(gl\.SCISSOR_TEST\)/);
    assert.match(arSource, /gl\.scissor\(viewport\.x, viewport\.y, viewport\.width, viewport\.height\)/);
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
    assert.match(restoration, /loadPlaceMarkers\(operation\.projectId, siteId, area\.id\)/);
    assert.match(restoration, /isArOperationCurrent\(operation, guardOptions\)/);
    assert.match(restoration, /const selected = areas\.find\(area => area\.id === operation\.areaId\) \|\| areas\.find\(isDefaultHomeArea\)/);
    assert.match(arSource, /const siteId = operation\.siteId \|\| activeSiteId/);
    assert.match(arSource, /areas\.find\(item => item\.id === activeAreaId\)[\s\S]*areas\.find\(item => isDefaultHomeArea\(item\)\)/);
    assert.match(restoration, /if \(!areas\.some\(isDefaultHomeArea\)\)[\s\S]*createSitePlace\(operation\.projectId, site\.id,[\s\S]*AR_EXPERIENCE_CONFIG\.fallbackArea/);
    assert.doesNotMatch(restoration, /const firstArea = areas\[0\]/);
    const areaFallback = arSource.slice(arSource.indexOf('async function ensurePlacementArea('), arSource.indexOf('async function armPlacement('));
    assert.match(areaFallback, /areas\.find\(isDefaultHomeArea\)/);
    assert.match(areaFallback, /createSitePlace\([\s\S]*AR_EXPERIENCE_CONFIG\.fallbackArea/);
    assert.match(areaFallback, /activateArea\(fallback\)/);
    assert.doesNotMatch(areaFallback, /Create your first Area|Create or open an Area/);
    assert.match(arSource, /function activeAreaMarkers\(\) \{[\s\S]*record\.areaId === activeAreaId/);
    assert.match(arSource, /function activateArea\(area\) \{[\s\S]*activeAreaId !== nextAreaId[\s\S]*sessionMarkers = \[\];[\s\S]*locatedTotemRecord = null/);
    assert.equal((arSource.match(/activeAreaMarkers\(\)\.forEach/g) || []).length, 3);
    assert.match(arSource, /const visibleMarkers = activeAreaMarkers\(\);[\s\S]*layer\.innerHTML = visibleMarkers\.map/);
    assert.match(arSource, /locatedTotemRecord\?\.areaId === activeAreaId/);
    assert.match(quickPlace, /const loadingOperation = captureArOperationContext\(\)/);
    assert.match(quickPlace, /const operation = captureArOperationContext\(\)/);
    assert.match(quickPlace, /operationIsCurrent/);
    assert.match(quickPlace, /createPlaceMarker\(operation\.projectId, operation\.siteId, operation\.areaId/);
    assert.match(quickPlace, /existingMarkers\.some\(isAreaCheckpointMarker\)/);
    assert.match(quickPlace, /await restoreRecordedMarkers\(operation\)/);
    assert.match(quickPlace, /saveMarkerAnchor\(operation\.projectId, operation\.siteId, operation\.areaId/);
    assert.match(quickPlace, /if \(!operationIsCurrent\(\)\) return;[\s\S]*sessionMarkers\.push\(record\)/);
    assert.match(quickPlace, /const placementCompletion = new Promise/);
    assert.match(quickPlace, /pendingPlacementPromise = placementCompletion/);
    assert.match(quickPlace, /resolvePlacementCompletion\(\)/);
    assert.match(launch, /const launchedSession = session/);
    assert.match(launch, /activeAreaId = areaId;[\s\S]*sessionMarkers = \[\];[\s\S]*locatedTotemRecord = null;/);
    assert.doesNotMatch(arSource, /selectedMarker/);
    assert.match(arSource, /: activeAreaId[\s\S]*\? 'Aim dot ready\. Hold any placed item to move it, or use Pointer mode for edit tools\.'[\s\S]*: '';/);
    assert.match(launch, /if \(session !== launchedSession\) return/);
    assert.match(launch, /const restorationGuard = \{ matchGeneration: false \}/);
    assert.match(launch, /loadPlacementAreas\(loadingOperation, restorationGuard\)/);
    assert.match(arSource, /saveMarkerAnchor\(operation\.projectId, state\.record\.siteId, state\.record\.areaId/);
    assert.match(arSource, /await saveMarkerAnchor\(operation\.projectId[\s\S]*if \(!isArOperationCurrent\(operation\)\) return;[\s\S]*moved\. Select another glowing element/);
    assert.match(arSource, /async function waitForPendingPlacement\(\)/);
    assert.match(arSource, /async function finishArExitToDashboard\(\)[\s\S]*await waitForPendingPlacement\(\)/);
    assert.match(arSource, /function finishNaturalArExit/);
    assert.match(arSource, /window\.removeEventListener\('popstate', handleArHistoryBack\)/);
    assert.match(arSource, /const safeAreaId = isDefaultHomeArea\(areaName \|\| areaId\) \? '' : areaId/);
    assert.match(arSource, /launchedSession\.addEventListener\('end', async \(\) => \{[\s\S]*const siteId = activeSiteId[\s\S]*await waitForPendingPlacement\(\)/);
    assert.match(arSource, /window\.addEventListener\('popstate', \(\) => navigateAfterAr\(projectId, resolvedAreaId, returnContext\), \{ once: true \}\)/);
    assert.match(arSource, /history\.back\(\)/);
    assert.match(arSource, /function returnToWebMode\(\)/);
    assert.match(arSource, /contextToolbarRecord\)[\s\S]*openContextInWebMode\(\)/);
});

test('Creator AR falls back to setup when WebXR cannot start', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    assert.match(dashboardSource, /const started = await window\.startArMode/);
    assert.match(dashboardSource, /if \(!started\) await renderArAreaPicker/);
    assert.match(dashboardSource, /AR setup unavailable/);
});

test('welcome Try It Now AR keeps one live placement control and no dashboard panel', () => {
    const source = read('app/screens/temporaryArDemo.js');
    const webxrSource = read('app/services/webxrSession.js');
    const styles = read('app/style.css');
    assert.match(source, /function demoPointerWorldRay\(\)/);
    assert.match(source, /demoPlacementPosition\(viewerMatrix, demoPointerWorldRay\(\)\)/);
    assert.match(source, /import \{ AR_EXPERIENCE_CONFIG \} from '\.\.\/services\/arExperienceConfig\.js'/);
    assert.match(webxrSource, /requiredFeatures: \['hit-test'\], optionalFeatures: \['dom-overlay', 'local-floor'\]/);
    assert.match(webxrSource, /requestOptions\.domOverlay = \{ root: domOverlayRoot \}/);
    assert.match(webxrSource, /immersive-vr/);
    assert.match(source, /UNPACK_FLIP_Y_WEBGL, false/);
    assert.match(source, /placementReady/);
    assert.match(source, /placementPointerMarkup/);
    assert.match(styles, /\.creator-ar-overlay \.creator-ar-placement-guide/);
    assert.match(styles, /\.tryit-place\.creator-ar-placement-guide\.is-revealing/);
    assert.match(source, /Press the aiming circle to place the example Plant orb\./);
    assert.match(source, /placementReady = true;\s*place\?\.removeAttribute\('hidden'\)/);
    assert.doesNotMatch(source, /Use the Move tool in the bottom bar/);
    assert.match(styles, /\.tryit-place\.is-revealing/);
    assert.match(styles, /\.tryit-place\.creator-ar-placement-guide\.is-ready \{ z-index:12010; pointer-events:auto;/);
    assert.doesNotMatch(source, /Dashboard|draggable-window/);
    assert.match(styles, /\.tryit-demo\.is-immersive \.tryit-stage \{ pointer-events: none;/);
    assert.match(styles, /\.tryit-exit[\s\S]*pointer-events: auto;/);
    assert.match(source, /label\.width = record\.demoType === 'zone' \? 720 : 1120/);
    assert.match(source, /drawWrappedTextureText/);
    assert.match(styles, /width: min\(88vw, 560px\)/);
    assert.match(styles, /overflow-wrap: anywhere/);
    assert.doesNotMatch(source, /tryit-spatial-honeycombs/);
    assert.match(source, /NOURISHLANDXR/);
    assert.match(source, /A web of living knowledge…/);
    assert.match(source, /INTRO_KNOWLEDGE_KEYWORDS/);
    for (const keyword of ['FOOD', 'FOREST', 'PLANT LITERACY', 'RELATIONSHIPS', 'FRUIT', 'FLOWER', 'SEED', 'GUILD', 'MICRO CLIMATE', 'USES', 'PROPAGATION', 'LAYERS']) {
        assert.match(source, new RegExp(keyword));
    }
    assert.doesNotMatch(source, /['"]MICRO['"]/);
    assert.doesNotMatch(source, /['"]MACRO['"]/);
    for (const child of ['CULINARY', 'MEDICINAL', 'INDUSTRIAL', 'GRAFTING', 'GERMINATION', 'MARCOTTS', 'CUTTINGS', 'CLONING', 'DWARF', 'DECIDUOUS', 'EVERGREEN', 'ANNUAL', 'PERENNIAL', 'CANOPY', 'LOW TREE', 'SHRUB', 'HERBACEOUS', 'GROUNDCOVER', 'RHIZOSPHERE', 'VERTICAL']) {
        assert.match(source, new RegExp(child));
    }
    assert.match(source, /createIntroKnowledgeTexture/);
    assert.match(source, /data-biomap-category/);
    assert.match(source, /classList\.add\('is-expanded'\)/);
    assert.match(source, /button\.addEventListener\('mouseenter', expand\)/);
    assert.match(styles, /\.biomap-branch > button/);
    assert.match(styles, /\.biomap-branch\.is-expanded \.biomap-children/);
    assert.doesNotMatch(source, /tryit-welcome-core-cell/);
    assert.match(source, /tryit-spatial-welcome-note/);
    assert.match(styles, /\.tryit-spatial-welcome-note \{[^}]*height:clamp\(380px,76vh,760px\);[^}]*max-height:calc\(100vh - 32px\)/);
    assert.match(styles, /\.biomap-branch:nth-child\(1\) \{ left:29%; top:22%; \}/);
    assert.doesNotMatch(styles, /\.tryit-intro-knowledge::before/);
    assert.match(styles, /color:#fff/);
    assert.match(styles, /font-weight:650/);
    assert.match(source, /drawWrappedTextureText\(ctx, keyword/);
    assert.match(styles, /tryit-intro-knowledge-arrive/);
    assert.match(source, /showIntroBoard\(\s*'Nourishland XR'/);
    assert.match(source, /WELCOME_BOARD_PARAGRAPHS/);
    assert.match(source, /Welcome to the NourishlandXR demo interface/);
    assert.match(source, /Augmented reality \(AR\) and mixed reality \(XR\) are technologies that can help us better understand and interact with the world around us/);
    assert.match(source, /Nourishland XR is a portal for plant-related information, a plant mapping tool and a experience editor/);
    assert.match(source, /few examples of how plant information can be mapped to real places/);
    assert.match(source, /plant: \['Placing markers', 'Let’s first start with your first marker\. Once you press Continue, a round pointer will appear on your screen\. Position it where you’d like your plant to appear, then tap it to create a Plant Orb\.'/);
    assert.match(source, /Once you press Continue, a round pointer will appear on your screen/);
    assert.doesNotMatch(source, /Press it to create a Plant orb\. Press Continue to load your pointer/);
    assert.doesNotMatch(source, /gentle introduction/);
    assert.doesNotMatch(source, /In Mobile Mode, the aim helps you interact with the space/);
    assert.doesNotMatch(source, /nothing to memorise/i);
    assert.match(source, /paragraphs\.join\('\\n\\n'\)/);
    assert.match(source, /A LIVING INTRODUCTION/);
    assert.doesNotMatch(source, /130-inch|130 inch/);
    assert.doesNotMatch(source, /LOOK UP/);
    assert.doesNotMatch(source, /INTRODUCING AIM/);
    assert.doesNotMatch(source, /CREATE A PLANT ORB|Show aim/);
    assert.match(source, /finishIntroBoard\(\);[\s\S]*suppressSessionSelectUntil = performance\.now\(\) \+ 700;[\s\S]*armDemoPlacement\('plant'\)/);
    assert.match(source, /typingStartDelay = 1800/);
    assert.match(source, /function demoTextTypingDelay\(text, visibleLength\)/);
    assert.match(styles, /tryit-board-arrive 1\.4s/);
    assert.match(styles, /tryit-board-identity 1\.15s \.25s/);
    assert.doesNotMatch(styles, /tryit-board-leave/);
    assert.match(source, /function prepareTutorialBoard\(panel\)/);
    assert.match(source, /const firstArrival = !introBoardHasEntered/);
    assert.doesNotMatch(source, /introSceneActive = false/);
    assert.match(source, /querySelector\('\[data-tryit-intro\]'\)\?\.setAttribute\('hidden', ''\)/);
    assert.match(source, /querySelector\('\[data-tryit-guided-choice\]'\)\?\.setAttribute\('hidden', ''\)/);
    assert.match(source, /function pressPlacementPointer\(event\)/);
    assert.doesNotMatch(source, /function guideFirstOrbAdjustment\(record\)|is-movement-tip|awaitingPositionAdjustment/);
    assert.match(source, /you can hold the orb and move it whenever you want—adjusting it is optional/);
    assert.match(source, /function beginPointerDemoHold\(event\)/);
    assert.match(source, /function updateHeldDemoRecordPosition\(\)/);
    assert.match(source, /function releaseHeldDemoRecord\(\)/);
    assert.match(source, /event\.currentTarget\?\.setPointerCapture\?\.\(event\.pointerId\)/);
    assert.match(source, /placementPointer\.addEventListener\('pointercancel'/);
    assert.match(source, /if \(type === 'plant'\) guidePlantConversion\(placedRecord\)/);
    assert.match(source, /pointer\?\.removeAttribute\('hidden'\);[\s\S]*pointer\?\.classList\.add\('is-revealing', 'is-ready'\)/);
    assert.match(source, /function hideGuidedChoice\(\) \{[\s\S]*querySelector\('\[data-tryit-guided-choice\]'\)\?\.setAttribute\('hidden', ''\)/);
    assert.match(source, /addEventListener\('beforexrselect', event => event\.preventDefault\(\)\)/);
    assert.match(source, /demoInteractive: !\['plant', 'plant2'\]\.includes\(type\)/);
    assert.match(source, /record\.demoInteractive = true/);
    assert.match(styles, /\.tryit-sim-marker\.is-arriving \{ pointer-events:none; \}/);
    assert.match(source, /place\?\.classList\.add\('is-pressed'\)/);
    assert.match(source, /\}, 360\)/);
    assert.match(styles, /tryit-pointer-press \.36s/);
    assert.match(source, /const position = placementPosition\(\);\s*if \(!position\) \{[\s\S]*?return;\s*\}\s*placementReady = false;/);
    assert.doesNotMatch(source, /direct = false|if \(direct\)/);
    assert.match(source, /showIntroBoard\(\s*moringa \? 'A SECOND PLANT ORB' : 'A SIMPLE PLANT ORB'/);
    assert.match(source, /A simple Plant orb can become a hub of information, which we call a Plant Profile/);
    assert.match(source, /Place it at a real plant or tree so its knowledge stays connected to where it grows/);
    assert.doesNotMatch(source, /profile provides in-depth information about \$\{plantName\}/);
    assert.match(source, /press the orb to explore its information tree/);
    assert.doesNotMatch(source, /Create Plant Profile|Create Moringa profile/);
    assert.match(source, /record\.awaitingProfileReveal = true/);
    assert.doesNotMatch(source, /keeps its colour as it becomes a Plant marker/);
    assert.match(source, /demoOrbColor: type === 'plant' \? 'red' : type === 'plant2' \? 'green'/);
    assert.match(source, /red:[\s\S]*radius: 0\.07/);
    assert.match(source, /green:[\s\S]*radius: 0\.074/);
    assert.match(source, /coreColor: material\?\.core/);
    assert.match(styles, /\.tryit-place\.creator-ar-placement-guide\.is-ready \{ z-index:12010;/);
    assert.doesNotMatch(styles, /\.tryit-guided-choice\.is-movement-tip/);
    assert.match(styles, /\.tryit-sim-marker\.is-demo-orb \{ z-index:12007; \}/);
    assert.match(styles, /body\[data-project-theme\] \.tryit-demo \.tryit-place\.creator-ar-placement-guide \{[^}]*outline:0 !important;[^}]*border-radius:50% !important;[^}]*background:transparent !important;[^}]*backdrop-filter:none !important;/);
    assert.match(source, /placementPointer\.addEventListener\('pointerup', event => \{[\s\S]*releaseHeldDemoRecord\(\)[\s\S]*pressPlacementPointer\(event\)/);
    assert.match(source, /placementPointer\.addEventListener\('mousedown'[\s\S]*beginPointerDemoHold\(event\)/);
    assert.doesNotMatch(source, /awaitingPositionAdjustment/);
    assert.match(source, /placementPointer\.addEventListener\('click', pressPlacementPointer\)/);
    const immersiveSelectHandler = source.slice(
        source.indexOf("session.addEventListener('select'"),
        source.indexOf("session.addEventListener('end'")
    );
    assert.match(source, /function activateImmersiveDemoControl\(\)/);
    assert.match(source, /domOverlayEnabled = Boolean\(arSession\.domOverlay\)/);
    assert.match(source, /uses-webgl-controls/);
    assert.match(source, /session && !domOverlayEnabled && continueButton/);
    assert.match(source, /introTextureFrameToken !== introFrameToken/);
    assert.match(source, /introFrameToken = _time/);
    assert.match(styles, /\.tryit-demo\.uses-webgl-controls > \.tryit-intro-continue \{ display:none !important; \}/);
    assert.match(immersiveSelectHandler, /if \(activateImmersiveDemoControl\(\)\) return;/);
    assert.match(immersiveSelectHandler, /if \(placementReady\) return pressPlacementPointer\(\);/);
    assert.match(immersiveSelectHandler, /selectGuidedDemoOrb\(\);/);
    assert.match(source, /Press Continue to load the aim\.[\s\S]*press the aim yourself to place the Moringa orb/);
    assert.match(source, /function inviteVirtualTag\(record\)/);
    assert.match(source, /data-demo-choice="virtual-tag">OPEN PLANT LIVE TAG/);
    assert.match(source, /WEB MODE · PLANT LIVE TAG/);
    assert.match(source, /FULL PLANT PROFILE/);
    assert.match(source, /data-demo-close-web-mode>CLOSE WEB MODE · RETURN TO AR/);
    assert.match(source, /A Plant Live Tag can open this full, view-only plant file/);
    assert.match(source, /record\.tutorialStage === 'plant2' \? showDemoAction\('note'\) : inviteVirtualTag\(record\)/);
    assert.match(source, /demoWebModeOpen = true;[\s\S]*suppressSessionSelectUntil = Number\.POSITIVE_INFINITY/);
    assert.match(source, /stage\.inert = true;[\s\S]*stage\.setAttribute\('aria-hidden', 'true'\)/);
    assert.match(source, /stage\.inert = false;[\s\S]*stage\.removeAttribute\('aria-hidden'\)/);
    assert.match(source, /demoWebModeOpen = false;[\s\S]*record\.demoExpanded = false;[\s\S]*armDemoPlacement\('plant2'\)/);
    assert.match(styles, /\.tryit-virtual-tag-mode \{[^}]*position:fixed;[^}]*z-index:12100;[^}]*background:#f2f4ec;/);
    assert.match(styles, /\.tryit-virtual-tag-close,body\[data-project-theme\] \.tryit-virtual-tag-close/);
    assert.match(source, /data-tryit-intro-continue/);
    assert.match(styles, /\.tryit-intro-continue/);
    assert.match(source, /Press the aiming circle to place the example Plant orb/);
    assert.doesNotMatch(source, /Nothing from Try It Now is saved/);
    assert.doesNotMatch(source, /Start the demo|Show the centre aim|Name your Plant/);
    assert.match(styles, /\.tryit-guided-choice h2 \{ color: #fff !important;/);
    assert.match(source, /typeNextCharacter/);
    assert.match(source, /boardTypingTimer = setTimeout\(typeNextCharacter, 180\)/);
    assert.match(styles, /\.tryit-guided-choice\.is-typing p\.is-current::after/);
    assert.match(source, /record\.tutorialStage === demoStage/);
    assert.match(source, /record\.awaitingProfileReveal = true;[\s\S]*pointer\?\.setAttribute\('hidden', ''\);[\s\S]*pointer\?\.classList\.remove\('is-revealing', 'is-ready'\)/);
    assert.match(source, /data-tryit-guided-choice/);
    assert.match(source, /const plantName = moringa \? 'Moringa Tree' : PIGEON_PEA_EXAMPLE\.commonName/);
    assert.match(source, /runKnowledgeTour/);
    assert.match(source, /record\.texture = createMarkerTexture\(record\)/);
    assert.match(styles, /\.plant-knowledge-cell\.is-guided-highlight/);
    assert.match(source, /function drawIntroSpatial\(view\)/);
    assert.match(source, /function createIntroControlTexture\(labelText/);
    assert.match(source, /function createIntroPointerTexture\(/);
    assert.match(source, /appRoot\.querySelector\('\.tryit-demo'\)\?\.append\(introContinue\)/);
    assert.match(source, /appRoot\.querySelector\('\.tryit-demo'\)\?\.append\(placementPointer\)/);
    assert.match(source, /introLocalPosition\(introWorldAnchor/);
    assert.match(source, /boardPosition: \[0, 0\.82, -2\.8\]/);
    assert.match(source, /boardScale: \[5\.6, 10\.8\]/);
    assert.match(source, /label\.height = 1080/);
    assert.match(source, /fitIntroBodyLayout\(ctx, introBoardBody, 1100, 530\)/);
    assert.match(source, /wrappedTextureLines\(ctx, visibleParagraphs\[paragraphIndex\] \|\| '', 1100\)/);
    assert.match(source, /visibleLines\.forEach/);
    assert.doesNotMatch(source, /bodyParagraphs\.slice\(0, 3\)/);
    assert.match(styles, /\.tryit-board-text-window \{[^}]*min-height:0;[^}]*overflow:hidden;/);
    assert.match(source, /introLocalPosition\(introWorldAnchor, AR_PHONE_COMFORT\.boardPosition\)/);
    assert.match(source, /billboardMatrix\(position, scaleX, scaleY, introWorldAnchor\)/);
    assert.match(source, /introTextureUploadedAt >= 180/);
    assert.match(source, /function shiftSimulatedSceneForStage\(type\)/);
    assert.match(source, /place\.dataset\.aimX = '50'/);
    assert.match(source, /50 \+ comfortOffsetPercent/);
    assert.doesNotMatch(source, /createIntroTickerTexture|introTickerTexture/);
    assert.match(source, /introBoardVisibleBody = bodyText\.slice\(0, typedLength\)/);
    assert.match(source, /typedLength = nextDemoTextLength\(bodyText, typedLength\)/);
    assert.match(source, /const typingDelay = demoTextTypingDelay\(bodyText, typedLength\)/);
    assert.match(source, /return 115;/);
    assert.match(source, /boardTypingTimer = setTimeout\(typeNextCharacter, typingDelay\)/);
    assert.doesNotMatch(source, /boardControlTimer/);
    assert.match(styles, /tryit-cursor-blink 1\.4s ease-in-out infinite/);
    assert.match(styles, /content:"…";/);
    assert.match(styles, /width:min\(94vw,820px\)/);
    assert.match(styles, /top:max\(4px,env\(safe-area-inset-top\)\)/);
    assert.match(styles, /height:calc\(100dvh - max\(8px,env\(safe-area-inset-top\)\)\)/);
    assert.match(styles, /max-height:none/);
    assert.match(styles, /\.tryit-intro-continue \{[\s\S]*\+ 44px\)/);
    assert.match(source, /pointerOffsetCss: '3\.5cm'/);
    assert.match(source, /pointerOffsetPixels: 132\.3/);
    assert.match(styles, /top:calc\(50% \+ 3\.5cm\)/);
    assert.match(styles, /\.creator-ar-mode-pointer \{[\s\S]*top:\s*calc\(50% \+ 3\.5cm\)/);
    assert.match(styles, /\.tryit-intro-continue \{[\s\S]*border-radius:999px/);
    assert.match(source, /exitButton\.textContent = 'Close'/);
    assert.doesNotMatch(styles, /tryit-board-text-scroll/);
    assert.match(styles, /\.tryit-board-text-window \{ display:grid; align-content:start;/);
    assert.match(styles, /\.tryit-guided-choice\.is-welcome-board \{[^}]*bottom:auto !important;[^}]*grid-template-rows:auto auto minmax\(0,1fr\);[^}]*height:calc\(100dvh - max\(8px,env\(safe-area-inset-top\)\)\);[^}]*min-height:calc\(100svh - max\(8px,env\(safe-area-inset-top\)\)\);[^}]*overflow:hidden;/);
    assert.match(styles, /@media \(max-width:620px\) \{[\s\S]*\.tryit-guided-choice\.is-welcome-board \{[^}]*width:100vw;[^}]*height:100dvh;[^}]*min-height:100svh;[^}]*border-radius:0;/);
    assert.match(styles, /\.tryit-guided-choice\.is-copy-ready \.tryit-board-text-window \{ opacity:1; \}/);
    assert.match(styles, /font-size:clamp\(1\.08rem,min\(3\.2vw,2\.55vh\),1\.55rem\)/);
    assert.match(source, /for \(let fontSize = 52; fontSize >= 26; fontSize -= 2\)/);
    assert.match(source, /introNarrationTimer = setTimeout/);
    assert.match(source, /setTimeout\(runArWelcomeTutorial, 700\)/);
    assert.match(styles, /\.tryit-demo\.is-immersive \.tryit-spatial-intro \{ display: none !important;/);
    assert.doesNotMatch(source, /createIntroHexTexture|introHexTextures/);
    assert.match(source, /PIGEON_PEA_AR_KNOWLEDGE/);
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
    assert.match(source, /function toggleDemoPlantProfile/);
    assert.match(source, /profileRevealStarted = performance\.now\(\)/);
    assert.match(source, /uniform float opacity/);
    assert.match(source, /record\.demoDistance = Math\.max\(\.4, Math\.min\(4, 1 \+ verticalTravel \/ 120\)\)/);
    assert.match(source, /spatialMoveControlMarkup\('demo'\)/);
    assert.match(styles, /\.spatial-move-control/);
    assert.match(styles, /\.spatial-move-release/);
    assert.match(styles, /\.spatial-move-control \{[\s\S]*left: var\(--move-control-x, 50%\); top: var\(--move-control-y, 68%\)/);
    assert.match(styles, /\.spatial-move-instruction/);
    assert.match(styles, /\.spatial-grab-handle/);
    assert.doesNotMatch(source, /data-demo-move-mode|demoMoveMode|✋/);
    assert.match(source, /querySelector\('\.tryit-drag-hint'\)\?\.remove\(\)/);
    assert.match(source, /compactMarker\.classList\.add\('is-drag-ready'\)/);
    assert.match(styles, /\.tryit-demo \.tryit-sim-marker:is\(:hover, :focus-visible, \.is-drag-ready\)/);
    assert.doesNotMatch(source, /data-demo-depth-joystick\] input/);
    assert.match(styles, /\.tryit-sim-marker-plant\.has-plant-profile:is\(:hover, :focus-visible\)/);
    assert.match(styles, /\.plant-knowledge-map/);
    assert.match(source, /plant-knowledge-connectors/);
    assert.match(styles, /\.plant-knowledge-connectors path/);
    assert.match(styles, /--honey-cell-size:clamp\(84px,23vw,112px\)/);
    assert.match(styles, /--honey-cell-height:clamp\(73px,19\.92vw,97px\)/);
    assert.match(styles, /\.plant-knowledge-connectors circle/);
    assert.match(styles, /\.plant-knowledge-left \.plant-knowledge-cell:nth-child\(1\) \{ left:calc\(50% - var\(--honey-x-half\)\); top:calc\(50% - var\(--honey-y-step\)\); \}/);
    assert.match(styles, /\.plant-knowledge-right \.plant-knowledge-cell:nth-child\(6\)/);
    assert.match(source, /activateBranch\(branchKey\)/);
    assert.doesNotMatch(source, /activateBranch\(record\.demoActiveBranch === branchKey \? '' : branchKey\)/);
    const sessionSelectStart = source.indexOf("session.addEventListener('select'");
    const sessionSelect = source.slice(sessionSelectStart, source.indexOf('const draw =', sessionSelectStart));
    assert.doesNotMatch(sessionSelect, /toggleDemoPlantProfile/);
    assert.match(styles, /\.plant-knowledge-core/);
    assert.match(styles, /\.plant-knowledge-cell/);
    assert.match(styles, /\.plant-knowledge-cell:is\(:hover, :focus-visible, \.is-open\)/);
    assert.match(styles, /body\[data-project-theme\] \.tryit-demo \.plant-knowledge-cell/);
    assert.match(styles, /\.plant-knowledge-core strong \{ color: #fff;[\s\S]*font-weight: 850;/);
    assert.match(styles, /\.plant-knowledge-cell b \{ color: #fff;[\s\S]*font-weight: 850;/);
    assert.match(styles, /\.creator-ar-location-note-board\.creator-ar-totem-balloon \{[\s\S]*width:min\(72vw,460px\)/);
    assert.match(source, /function renderSimulatedTotem/);
    assert.match(source, /tryit-sim-totem-branches/);
    assert.match(source, /function drawTotemKnowledgeTexture/);
    assert.match(styles, /\.tryit-sim-totem-pillar/);
    assert.match(styles, /\.tryit-sim-totem-pillar::before[\s\S]*clip-path:polygon/);
    assert.match(styles, /\.tryit-sim-totem-pillar::after[\s\S]*clip-path:polygon/);
    assert.match(source, /drawSpatialPrism\(gl, prismRenderer, view, record\.position/);
    assert.match(source, /const bubbles = \(content\?\.bubbles \|\| content\?\.lines \|\| \[\]\)\.filter\(Boolean\)\.slice\(0, 5\)/);
    assert.doesNotMatch(source, /CITRUS · HERBS · POLLINATORS/);
    assert.match(styles, /\.tryit-sim-totem-card-5/);
    assert.match(styles, /border-radius: 32% 23% 35% 25% \/ 25% 34% 24% 37%/);
    assert.match(styles, /\.tryit-sim-totem-card::after/);
    assert.match(source, /ctx\.arc\(attachmentX, attachmentY, 6/);
    assert.match(source, /ctx\.strokeText\(cell\.item\[0\], cell\.x/);
    assert.match(source, /ctx\.strokeText\('PLANT PROFILE', center\.x/);
    assert.match(styles, /\.tryit-sim-marker-note:not\(\.is-expanded\)/);
    assert.match(source, /Point of Interest/);
    assert.match(source, /Garden plaque/);
    assert.doesNotMatch(source, /Give the Area a Totem/);
    assert.match(source, /Totem Markers belong to Areas and are created separately in Creator Mode/);
    assert.match(styles, /\.tryit-guided-choice/);
});

test('Creator project AR is a no-code placement session without a dashboard overlay', () => {
    const source = read('app/screens/arMode.js');
    const webxrSource = read('app/services/webxrSession.js');
    const styles = read('app/style.css');
    assert.doesNotMatch(source, /drawDashboard|captureDashboardSnapshot|dashboardVisible|Grab dashboard/);
    assert.match(source, /if \(!projectId \|\| !navigator\.xr \|\| !window\.isSecureContext\) return false/);
    assert.match(source, /requestImmersiveArSession\(overlayRoot, \{ requireDomOverlay: true \}\)/);
    assert.match(webxrSource, /requestOptions\.domOverlay = \{ root: domOverlayRoot \}/);
    assert.match(webxrSource, /requiredFeatures: \['hit-test'\], optionalFeatures: \['dom-overlay', 'local-floor'\]/);
    assert.match(source, /requestHitTestSource/);
    assert.match(source, /const ray = pointerWorldRay\(\)/);
    assert.match(source, /id = 'creatorArOverlay'/);
    assert.match(source, /creator-ar-session-active/);
    assert.doesNotMatch(source, /Test session - no physical code/);
    assert.match(styles, /\.creator-ar-status:empty \{ display: none; \}/);
    assert.doesNotMatch(source, /Choose its purpose/);
    assert.match(styles, /\.creator-ar-marker-hit-target-note \.creator-ar-spatial-name \{ opacity:var\(--marker-opacity,1\); visibility:visible/);
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
    assert.match(source, /const requestedArea = operation\.areaId/);
    assert.match(source, /sessionMarkers = sessionMarkers\.filter\(record => record\.areaId === restoreOperation\.areaId\)/);
    assert.doesNotMatch(source.slice(source.indexOf('async function restoreRecordedMarkers'), source.indexOf('async function prepareExistingMarkerPlacement')), /areas\.map\(async area/);
    assert.match(source, /loadMarkerAnchor/);
    assert.match(source, /loadPlacementAreas\(loadingOperation, restorationGuard\)[\s\S]*restoreRecordedMarkers\(restoringOperation, restorationGuard\)/);
    assert.match(styles, /\.creator-ar-place-picker\[hidden\]/);
    assert.doesNotMatch(styles, /\.creator-ar-placement-status/);
    assert.match(styles, /\.creator-ar-type-options \{ display: grid; grid-template-columns: repeat\(2/);
});

test('Creator AR supports temporary checkpoints and direct test sessions', () => {
    const arSource = read('app/screens/arMode.js');
    const webxrSource = read('app/services/webxrSession.js');
    const persistenceSource = read('app/services/persistence.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const serverSource = read('tools/persistence-server.mjs');
    assert.match(arSource, /let startPromise = null/);
    assert.match(arSource, /startPromise = launchArMode\(projectId, areaId, checkpointId, initialPlacementType, existingMarkerId, returnContext, preferredSiteId\)/);
    assert.doesNotMatch(arSource, /isSessionSupported\('immersive-ar'\)/);
    assert.match(arSource, /requestImmersiveArSession\(overlayRoot, \{ requireDomOverlay: true \}\)/);
    assert.match(webxrSource, /isSessionSupported\('immersive-ar'\)/);
    assert.match(webxrSource, /navigator\.xr\.requestSession\('immersive-ar'/);
    assert.match(dashboardSource, /const started = await window\.startArMode/);
    assert.match(dashboardSource, /Open Test AR/);
    assert.match(dashboardSource, /renderAreaCheckpointForm/);
    assert.match(dashboardSource, /saveAreaCheckpoint/);
    assert.match(dashboardSource, /async function projectCheckpointContext\(projectId, areaId\)/);
    assert.match(dashboardSource, /renderAreaCheckpointForm[\s\S]*projectCheckpointContext\(projectId, areaId\)/);
    assert.match(dashboardSource, /saveAreaCheckpoint[\s\S]*projectCheckpointContext\(projectId, areaId\)/);
    assert.match(dashboardSource, /type: 'area_checkpoint'/);
    assert.match(dashboardSource, /Physical QR or location code/);
    assert.match(dashboardSource, /Additional information balloons/);
    assert.match(dashboardSource, /OPEN AREA IN AR/);
    assert.match(dashboardSource, /data-add-totem-text-box/);
    assert.match(serverSource, /'area_checkpoint'/);
    assert.match(persistenceSource, /unsupported\|placement\|spatial\|anchor type\|gps\|qr/);
});

test('dashboard focuses on Open AR while the Organizer Folder stays secondary', () => {
    const arSource = read('app/screens/arMode.js');
    const configSource = read('app/services/arExperienceConfig.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const mainSource = read('app/main.js');
    const styles = read('app/style.css');
    assert.match(dashboardSource, /openArAction: `window\.startArMode\('\$\{encoded\(project\.id\)\}','\$\{encoded\(activeAreaId\)\}'\)`/);
    assert.match(dashboardSource, /addUnplacedAction: `window\.renderAddToLocation/);
    assert.doesNotMatch(dashboardSource, /quickActions:/);
    assert.match(arSource, /openUnplacedBag/);
    assert.match(arSource, /const homeAreas = areas\.filter\(isDefaultHomeArea\)/);
    assert.match(configSource, /area\?\.systemKey === 'home'/);
    assert.match(configSource, /systemKey: 'home'/);
    assert.match(arSource, /Promise\.all\(homeAreas\.map/);
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
    assert.match(configSource, /placementDistanceMetres: 1,/);
    assert.match(configSource, /name: DEFAULT_HOME_AREA_NAME/);
    assert.match(dashboardSource, /'intro_checkpoint'/);
    assert.match(arSource, /Aim the centre circle, then tap it to place/);
    assert.match(arSource, /readyPlacementType = '';\s*pendingPlacementAppearance = null;\s*updateReadyPlacementControl\(\);\s*setPlacementStatus\(`Placing/);
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
    assert.match(fieldMarker, />Saved<\/button>/);
    assert.match(fieldMarker, />Global<\/button>/);
    assert.match(fieldMarker, /Advanced plant search/);
    assert.match(fieldMarker, /searchGlobalPlants\(query\)/);
    assert.match(fieldMarker, /sourceId: selectedGlobalPlant\?\.sourceId/);
    assert.match(plantService, /plant-search\/global/);
    assert.match(server, /api\.gbif\.org\/v1\/species\/suggest/);
    assert.match(server, /api\.inaturalist\.org\/v2\/taxa\/autocomplete/);
    assert.match(plantService, /throwOnError/);
    assert.match(server, /source: 'GBIF'/);
});

test('spatial roles use distinct Marker, Totem and gateway shapes', () => {
    const arSource = read('app/screens/arMode.js');
    const prismSource = read('app/services/spatialPrismRenderer.js');
    assert.match(arSource, /area_checkpoint: 1, intro_checkpoint: 2, note: 3, plant: 4/);
    assert.match(arSource, /area_checkpoint: \[\.11 \* factor, totemHeightPreset\(marker\)\.halfHeightMetres \* factor\]/);
    assert.match(arSource, /intro_checkpoint: \[\.42 \* factor, \.805 \* factor\]/);
    assert.match(arSource, /float jade/);
    assert.match(arSource, /createSpatialPrismRenderer/);
    assert.match(arSource, /shape === 1[\s\S]*drawSpatialPrism/);
    assert.match(arSource, /function groundedTotemPosition\(position\)/);
    assert.match(arSource, /sessionGroundY = latestViewerMatrix\[13\] - 1\.55/);
    assert.match(arSource, /const baseHalfHeight = \.04 \* markerSizeFactor\(record\.marker\)/);
    assert.match(arSource, /halfWidth: halfWidth \* 1\.62/);
    assert.match(arSource, /groundPosition\.y \+ baseHalfHeight \* 2/);
    assert.match(arSource, /type === 'area_checkpoint'[\s\S]*groundedTotemPosition\(placementPosition\)/);
    assert.match(arSource, /shape === 0 \|\| shape === 1 \|\| shape === 3 \|\| shape === 4/);
    assert.match(prismSource, /attribute vec3 position/);
    assert.match(prismSource, /attribute vec3 normal/);
    assert.match(prismSource, /float topFace = smoothstep/);
    assert.equal(createPrismGeometry().length, 216);
    const prismMatrix = prismModelMatrix({ x: 1, y: 2, z: 3 }, { halfWidth: .14, halfHeight: .72, halfDepth: .14 }, 0);
    assert.equal(prismMatrix[12], 1);
    assert.ok(Math.abs(prismMatrix[13] - 2.72) < 1e-6);
    assert.equal(prismMatrix[14], 3);
    assert.match(arSource, /float rect/);
    assert.match(arSource, /float core/);
    assert.match(arSource, /function plantTagDimensions\(marker\)/);
    assert.match(arSource, /drawPlantTagStem\(view, record\.position, record\.marker/);
    assert.match(arSource, /plantTagPlatePosition\(record\.position, record\.marker\)/);
    assert.match(arSource, /Totem Marker/);
    assert.match(arSource, /trail entrance gateway/);
    assert.match(read('app/services/spatialTriangleRenderer.js'), /correctly wound rectangular sides/);
    assert.equal(createTrianglePrismGeometry().length, 144);
});

test('Creator Plants use a compact encyclopedia file and collapsible AR information', () => {
    const arSource = read('app/screens/arMode.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const styles = read('app/style.css');
    assert.match(arSource, /function hasPlantProfile\(record\)/);
    assert.match(arSource, /const opening = !record\.profileExpanded/);
    assert.match(arSource, /sessionMarkers\.forEach\(candidate => \{[\s\S]*candidate\.profileExpanded = false/);
    assert.match(arSource, /setPlacementStatus\(''\)/);
    assert.match(arSource, /creator-ar-plant-profile/);
    assert.match(arSource, /function positionCreatorPlantProfile\(record, markerX, markerY\)/);
    assert.match(arSource, /creatorPlantProfileLayout\(window\.innerWidth, window\.innerHeight, markerX, markerY\)/);
    assert.match(arSource, /creatorPlantProfileLayout/);
    assert.match(arSource, /const diagramAnchorY = panelTop \+ 4/);
    assert.match(arSource, /creator-ar-plant-profile is-below-orb/);
    assert.match(arSource, /return `\$\{markerLayer\}\$\{profileLayer\}`/);
    assert.match(arSource, /RELATIONSHIPS: 'LINKS'/);
    assert.match(arSource, /SCIENTIFIC: 'BOTANY'/);
    assert.match(arSource, /--profile-accent:\$\{markerAppearanceColor\(record\.marker\)\}/);
    assert.match(arSource, /creator-ar-plant-tether[\s\S]*<path d="M0 9 C28 2 70 16 100 9"/);
    assert.match(arSource, /const open = candidate === cell/);
    assert.doesNotMatch(arSource, /const open = !cell\.classList\.contains\('is-open'\)/);
    assert.match(arSource, /loadPlantProfile\(operation\.projectId/);
    assert.match(styles, /@keyframes creator-ar-profile-arrive/);
    assert.match(styles, /\.creator-ar-marker-hit-target\.has-plant-profile/);
    assert.match(styles, /\.plant-virtual-tag-card/);
    assert.match(styles, /\.creator-ar-plant-tether path/);
    assert.match(styles, /\.creator-ar-plant-profile :is\(\.plant-knowledge-core,\.plant-knowledge-cell\)::before/);
    assert.match(styles, /\.creator-ar-plant-profile :is\(\.plant-knowledge-core,\.plant-knowledge-cell\)::after/);
    assert.match(styles, /-webkit-mask-composite:xor; mask-composite:exclude/);
    assert.match(styles, /background:rgba\(7,28,18,.18\)/);
    assert.match(styles, /body\[data-project-theme\] \.creator-ar-plant-profile :is\(\.plant-knowledge-core,\.plant-knowledge-cell\)[\s\S]*background:transparent !important/);
    assert.match(styles, /--honey-x-half:var\(--honey-x-step\)/);
    assert.match(styles, /\.creator-ar-marker-hit-target-plant\.is-info-open \.creator-ar-spatial-name \{[^}]*max-width:min\(36vw,132px\)/);
    assert.doesNotMatch(styles, /\.creator-ar-open-web-profile/);
    assert.doesNotMatch(styles, /body\[data-project-theme\] \.creator-ar-plant-profile[\s\S]{0,180}background:rgba\(15,48,32,.94\)/);
    assert.match(dashboardSource, /plant-encyclopedia-card/);
    assert.match(dashboardSource, /plant-info-drawer/);
    assert.match(dashboardSource, /projectEntryRelationships/);
    assert.match(dashboardSource, /if \(profileEnabled\)/);
    assert.match(arSource, /focusedRecord\.profileExpanded = focusedProfileView/);
    assert.match(arSource, /sessionMarkers = \[focusedRecord\]/);
    assert.match(dashboardSource, /Growing knowledge/);
    assert.match(dashboardSource, /Origin &amp; story/);
    assert.match(dashboardSource, /projectEntryVirtualTag/);
    assert.match(dashboardSource, /Make this Plant a Plant Live Tag/);
    assert.match(dashboardSource, /virtual_tag_enabled/);
    assert.match(dashboardSource, /plant-card-hero/);
    assert.match(dashboardSource, /plantProfileReady && !returnToAr \? `<section class="spatial-focus-panel"/);
});

test('an open AR Plant profile has no attached Web Mode card', () => {
    const arSource = read('app/screens/arMode.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const styles = read('app/style.css');
    assert.doesNotMatch(arSource, /data-ar-open-web-profile/);
    assert.doesNotMatch(arSource, /OPEN IN WEB MODE/);
    assert.match(arSource, /data-ar-context-web/);
    assert.match(arSource, /: `web-marker:\$\{record\.marker\.id\}`/);
    assert.match(dashboardSource, /const returnArLabel = '&#x23CE; AR'/);
    assert.match(dashboardSource, /Back to AR returns directly to the same Area with this orb open/);
    assert.match(dashboardSource, /is-ar-web-handoff/);
    assert.match(dashboardSource, /\$\{arHandoff\}\$\{plantProfileReady && !returnToAr \?/);
    assert.doesNotMatch(dashboardSource, /\$\{arHandoff\}\$\{plantProfileReady \?/);
    assert.match(dashboardSource, /projectEntryQrCode/);
    assert.match(dashboardSource, /Plant QR code/);
    assert.match(dashboardSource, /syncMarkerQrAnchor/);
    assert.match(styles, /\.plant-qr-anchor-card/);
    assert.doesNotMatch(styles, /\.creator-ar-open-web-profile/);
    assert.match(styles, /\.ar-web-handoff/);
});

test('Area and Totem records use compact profile cards with Totem-owned text boxes', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    const fieldGuideSource = read('app/screens/fieldGuide.js');
    const arSource = read('app/screens/arMode.js');
    const styles = read('app/style.css');
    assert.match(dashboardSource, /area-encyclopedia-card/);
    assert.match(dashboardSource, /area-content-grid/);
    assert.match(dashboardSource, /totem-profile-page/);
    assert.match(dashboardSource, /data-add-totem-text-box/);
    assert.match(dashboardSource, /data-totem-information-box/);
    assert.match(dashboardSource, /querySelectorAll\('\[data-totem-information-box\]'\)/);
    assert.doesNotMatch(dashboardSource, /id="areaInformationBoxNew"/);
    assert.match(styles, /\.area-content-grid/);
    assert.match(styles, /\.totem-text-box-grid/);
    assert.match(dashboardSource, /ANCHOR TOTEM/);
    assert.match(dashboardSource, />Link Totem Marker<\/label>/);
    assert.match(dashboardSource, /physical marker installed at its real-world position/);
    assert.doesNotMatch(dashboardSource, /Totem QR code|QR label installed at its real-world position|QR or physical link/);
    assert.match(dashboardSource, /target_area_id/);
    assert.match(dashboardSource, /site-map-totem-links/);
    assert.match(dashboardSource, /Main welcome text/);
    assert.match(dashboardSource, /areaCheckpointColor/);
    assert.match(dashboardSource, /isPlaced \? 'OPEN IN AR' : 'PLACE IN AR'/);
    assert.match(dashboardSource, /encoded\(isPlaced \? existing\?\.marker\.id \|\| '' : ''\)/);
    assert.match(dashboardSource, /encoded\(existing && !isPlaced \? existing\.marker\.id : ''\)/);
    assert.match(dashboardSource, /encoded\(isPlaced \? marker\.id : ''\)/);
    assert.match(arSource, /data-ar-recenter-prompt/);
    assert.match(arSource, /RECENTER AREA/);
    assert.match(arSource, /data-ar-totem-information/);
    assert.match(arSource, /creator-ar-location-stick creator-ar-totem-stick/);
    assert.match(arSource, /creator-ar-location-note-board creator-ar-totem-balloon/);
    assert.match(arSource, /function positionCreatorTotemInformation\(record, markerX, markerY\)/);
    assert.match(arSource, /alignAreaToCheckpoint\(areaRecords, totem\.marker\.id, origin\)/);
    assert.doesNotMatch(arSource, /Checkpoint linked/);
    assert.match(dashboardSource, /Back to Area/);
    assert.match(dashboardSource, /Back to Dashboard/);
    assert.match(dashboardSource, /Area dashboard/);
    assert.match(dashboardSource, /data-edit-area-type/);
    assert.match(dashboardSource, /id="areaType"/);
    assert.match(dashboardSource, /context\.project\.name/);
    assert.match(dashboardSource, /<details class="latest-entries-section area-content-section">/);
    assert.doesNotMatch(dashboardSource, /Precise location/);
    assert.doesNotMatch(dashboardSource, />Open profile</);
    assert.doesNotMatch(fieldGuideSource, /Open &amp; manage/);
    assert.match(fieldGuideSource, /field-guide-fireplace-symbol/);
    assert.match(arSource, /web-totem:/);
    assert.match(arSource, /window\.renderAreaCheckpointForm/);
    assert.match(arSource, /else if \(areaId && window\.renderProjectAreaDashboard\)/);
    assert.doesNotMatch(arSource, /data-ar-home-sign|creator-ar-home-sign/);
    assert.match(arSource, /function createHomeSignTexture\(title, word\)/);
    assert.match(arSource, /context\.fillText\(areaWord, 512, 242, 950\)/);
    assert.match(arSource, /y: currentGroundY\(\) \+ 2\.45/);
    assert.match(arSource, /if \(!homeSignProgram/);
    assert.match(arSource, /homeSignAnchor \|\|= homeSignAnchorFromViewer\(\)/);
    assert.match(arSource, /drawSpatialHomeSign\(view\);/);
    assert.match(dashboardSource, /optionalWarnings/);
    assert.match(dashboardSource, /Totem saved in this Area/);
    assert.match(styles, /\.web-context-beacon/);
    assert.match(styles, /button\.global-ar-action/);
    assert.doesNotMatch(styles, /\.creator-ar-home-sign/);
    assert.match(styles, /\.totem-bottom-navigation/);
});

test('Field Guide separates visual guidance, optional creative tools and physical anchors', () => {
    const fieldGuideSource = read('app/screens/fieldGuide.js');
    const projectEntrySource = read('app/components/projectEntry.js');
    const arSource = read('app/screens/arMode.js');
    const serverSource = read('tools/persistence-server.mjs');
    assert.match(fieldGuideSource, /Visual Guide/);
    assert.match(fieldGuideSource, /Creative Features/);
    assert.doesNotMatch(fieldGuideSource, /Optional Creative Features/);
    assert.match(fieldGuideSource, /field-guide-special-elements/);
    assert.match(fieldGuideSource, /3D models and spatial objects/);
    assert.match(fieldGuideSource, /Anchored Elements/);
    assert.match(fieldGuideSource, /Global summary of placed items/);
    assert.match(fieldGuideSource, /<strong>Map<\/strong>/);
    assert.match(fieldGuideSource, /DEFAULT_HOME_AREA_NAME/);
    assert.match(fieldGuideSource, /Visitor Entrances/);
    assert.match(fieldGuideSource, /anchored element/);
    assert.doesNotMatch(fieldGuideSource, /of \$\{markerCount\} records anchored/);
    assert.match(fieldGuideSource, /renderProjectAreaForm/);
    assert.doesNotMatch(projectEntrySource, />\+ CREATE AREA</);
    assert.match(arSource, /data-ar-special-symbol/);
    assert.match(arSource, /\['⬇', 'Block arrow down'\]/);
    assert.match(arSource, /\['〉', 'Outline arrow right'\]/);
    assert.match(arSource, /\['!', 'Important'\]/);
    assert.match(arSource, /special_symbol/);
    assert.match(arSource, /data-ar-arrow-style="\$\{index \+ 1\}"/);
    assert.match(arSource, /ARROWS, EXCLAMATION AND QUESTION MARKS/);
    assert.match(arSource, />SYMBOLS</);
    assert.match(serverSource, /special_symbol: data\.special_symbol/);
    assert.match(serverSource, /arrow_style: Number\.isFinite/);
    assert.match(arSource, /function rotateHeldArrow/);
    assert.match(arSource, /rotation_degrees: roundCoordinate\(rotationDegrees\)/);
    assert.match(arSource, /data-ar-rotate-left/);
    assert.match(arSource, /data-ar-rotate-right/);
});

test('Notes stay simple and return to AR after contextual web editing', () => {
    const arSource = read('app/screens/arMode.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const demoSource = read('app/screens/temporaryArDemo.js');
    const styles = read('app/style.css');
    assert.match(arSource, /String\(returnContext\)\.slice\('web-marker:'\.length\)\), true\)/);
    assert.match(dashboardSource, /returnToAr = false/);
    assert.match(dashboardSource, /const returnArLabel = '&#x23CE; AR'/);
    assert.match(dashboardSource, /note-record-editor/);
    assert.match(dashboardSource, /id="projectEntryNoteSurface"/);
    assert.match(dashboardSource, /Transparent with color outline/);
    assert.match(dashboardSource, /surface: noteSurface === 'outline' \? 'outline' : 'filled'/);
    assert.match(arSource, /is-note-outline/);
    assert.match(demoSource, /rgba\(245,248,243,.78\)/);
    assert.match(styles, /\.tryit-sim-marker-note::after/);
    assert.match(styles, /\.creator-ar-marker-hit-target-note\.is-note-outline \.creator-ar-spatial-name/);
    assert.match(styles, /\.note-record-editor #projectEntryDescription/);
});

test('Totem height presets and earth tones remain simple and spatially consistent', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    const arSource = read('app/screens/arMode.js');
    const scannerSource = read('app/screens/physicalAnchorScanner.js');
    const styles = read('app/style.css');
    assert.equal(normalizeTotemHeightPreset('low'), 'low');
    assert.equal(normalizeTotemHeightPreset('unknown'), 'standard');
    assert.equal(totemHeightPreset('tall').metres, 1.72);
    assert.ok(totemHeightScale('low') < 1);
    assert.ok(totemHeightScale('tall') > 1);
    assert.match(dashboardSource, /data-totem-height/);
    assert.match(dashboardSource, /heightPreset/);
    assert.match(dashboardSource, /TOTEM_TONES/);
    assert.match(arSource, /totemHeightPreset\(marker\)/);
    assert.match(scannerSource, /totemHeightScale\(association\.marker\)/);
    assert.match(styles, /\.totem-height-presets/);
    assert.match(styles, /\.totem-tone-presets/);
    assert.match(styles, /\.totem-essential-controls \{ display:grid; grid-template-columns:minmax\(0,1fr\)/);
    assert.match(styles, /\.tutorial-step-confirmation/);
});

test('Note placement waits for a valid one-metre projection and previews the saved board template', () => {
    const arSource = read('app/screens/arMode.js');
    const configSource = read('app/services/arExperienceConfig.js');
    const styles = read('app/style.css');
    assert.match(configSource, /notePlacementDistanceMetres: 1/);
    assert.match(arSource, /placementPoint\('note'\)/);
    assert.match(arSource, /const placementPosition = type === 'note'/);
    assert.match(arSource, /preview\.hidden = true/);
    assert.match(arSource, /creator-ar-note-placement-preview creator-ar-marker-hit-target-note/);
    assert.match(arSource, /creator-ar-spatial-name nourishland-spatial-note-surface/);
    assert.match(styles, /\.creator-ar-note-placement-preview \.creator-ar-note-placement-surface/);
});

test('editing a Plant from AR opens only the basic identity and earth-tone controls', () => {
    const arSource = read('app/screens/arMode.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const styles = read('app/style.css');
    assert.match(arSource, /EDIT BASICS/);
    assert.match(dashboardSource, /const quickArPlantEdit = returnToAr && plant/);
    assert.match(dashboardSource, /PLANT · AR QUICK EDIT/);
    assert.match(dashboardSource, /The full Plant Profile remains in the Web Hub/);
    assert.match(dashboardSource, /data-plant-quick-tone/);
    assert.match(dashboardSource, /fieldValue\('projectEntryFamily', existingPlantProfile\.family/);
    assert.match(dashboardSource, /manageQrAnchor/);
    assert.match(styles, /\.plant-ar-quick-fields/);
    assert.match(styles, /\.plant-ar-quick-tones/);
});

test('web quick entry can save an untitled draft for later editing', () => {
    const source = read('app/screens/fieldMarker.js');
    assert.match(source, /Name \(optional\)/);
    assert.match(source, /value="later">Add/);
    assert.match(source, /Untitled plant/);
    assert.match(source, /Untitled note/);
    assert.match(source, /Untitled marker/);
    assert.doesNotMatch(source, /id="fieldName" required/);
});
