import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createUvSphereGeometry, sphereModelMatrix } from '../app/services/spatialSphereRenderer.js';
import { createGroundArrowPathGeometry, createTetherRibbonGeometry } from '../app/services/spatialTetherRenderer.js';
import { createPrismGeometry, prismModelMatrix } from '../app/services/spatialPrismRenderer.js';
import { createTrianglePrismGeometry } from '../app/services/spatialTriangleRenderer.js';
import {
    demoGroundBaseY,
    demoPlacementPosition,
    demoPointerScreenPoint,
    preservePlacedDemoPlants,
    selectDemoPlantRecord,
    selectGuidedDemoOrb
} from '../app/screens/temporaryArDemo.js';
import { plantInformationMeshSurfaceLayout } from '../app/services/plantInformationMeshSurfaceLayout.js';
import { alignAreaToCheckpoint } from '../app/services/areaSpatialAlignment.js';
import { normalizeTotemHeightPreset, normalizeTotemStyle, totemHeightPreset, totemHeightScale, totemStylePreset } from '../app/services/totemAppearance.js';
import { applyTotemLinkCalibration, createTotemLinkCalibration, reverseTotemLinkCalibration } from '../app/services/totemLinkCalibration.js';
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

test('demo ground placement prefers a floor hit and otherwise keeps a stable floor estimate', () => {
    const viewer = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.65, 0, 1]);
    const floorHit = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, .02, -1, 1]);
    const wallHit = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1.1, -1, 1]);
    assert.equal(demoGroundBaseY(floorHit, viewer), .019999999552965164);
    assert.ok(Math.abs(demoGroundBaseY(wallHit, viewer) - (viewer[13] - 1.55)) < 1e-6);
    assert.equal(demoGroundBaseY(wallHit, viewer, .04), .04);
});

test('immersive demo pointer falls back to the viewport when the placement cursor is hidden', () => {
    assert.deepEqual(
        demoPointerScreenPoint({ left: 40, top: 80, width: 200, height: 100 }, 1280, 720),
        { x: 140, y: 130 }
    );
    assert.deepEqual(
        demoPointerScreenPoint({ left: 0, top: 0, width: 0, height: 0 }, 1280, 720),
        { x: 640, y: 360 }
    );
    assert.deepEqual(demoPointerScreenPoint(null, 390, 844), { x: 195, y: 422 });
});

test('both demo Plants remain alive, interactive and independently selectable after later stages', () => {
    const pigeon = { tutorialStage: 'plant', demoType: 'plant', demoAlive: false, demoInteractive: false };
    const moringa = { tutorialStage: 'plant2', demoType: 'plant', demoAlive: false, demoInteractive: false };
    const note = { tutorialStage: 'note', demoType: 'note', demoInteractive: true };
    preservePlacedDemoPlants([pigeon, moringa, note]);
    assert.deepEqual([pigeon.demoAlive, pigeon.demoInteractive, moringa.demoAlive, moringa.demoInteractive], [true, true, true, true]);
    const opened = [];
    assert.equal(selectDemoPlantRecord({ record: pigeon }, record => opened.push(record)), true);
    assert.equal(selectDemoPlantRecord({ record: moringa }, record => opened.push(record)), true);
    assert.deepEqual(opened, [pigeon, moringa]);
    assert.equal(selectDemoPlantRecord({ record: note }, () => {}), false);
});

test('the shared PIM surface stays inside mobile viewport controls without an orb tether', () => {
    const phone = plantInformationMeshSurfaceLayout(390, 844, 195, 300);
    assert.equal(phone.panelX, 195);
    assert.ok(phone.panelTop < 300);
    assert.ok(phone.panelWidth > 340);
    assert.ok(phone.panelHeight > 500);
    assert.equal(phone.panelY, phone.panelTop + phone.panelHeight / 2);
    assert.equal(phone.profileAbove, true);
    assert.equal('tetherEndY' in phone, false);

    const edge = plantInformationMeshSurfaceLayout(390, 844, 12, 300);
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

test('Totem link calibration stores a reversible same-session transform', () => {
    const calibration = createTotemLinkCalibration(
        { id: 'living-totem', position: { x: 1, y: 0, z: -2 } },
        { id: 'kitchen-totem', position: { x: 3, y: 0, z: -5 } },
        { capturedAt: '2026-08-10T00:00:00.000Z' }
    );
    assert.deepEqual(calibration.relative_position, { x: 2, y: 0, z: -3 });
    assert.equal(calibration.distance_m, 3.606);
    assert.equal(calibration.source_totem_id, 'living-totem');
    assert.equal(calibration.target_totem_id, 'kitchen-totem');
    assert.deepEqual(applyTotemLinkCalibration({ x: 8, y: 0, z: 4 }, calibration), { x: 10, y: 0, z: 1 });
    const reverse = reverseTotemLinkCalibration(calibration);
    assert.deepEqual(reverse.relative_position, { x: -2, y: 0, z: 3 });
    assert.deepEqual(applyTotemLinkCalibration({ x: 10, y: 0, z: 1 }, reverse), { x: 8, y: 0, z: 4 });
});

test('calibrated Totem routes render as a segmented ground path with arrows', () => {
    const vertices = createGroundArrowPathGeometry(
        { x: 0, y: .05, z: 0 },
        { x: 2, y: .05, z: -1 },
        { dashLength: .2, gapLength: .1, arrowLength: .16, arrowWidth: .1, arrowSpacing: .6 }
    );
    assert.ok(vertices.length > 18);
    assert.equal(vertices.length % 9, 0);
    const values = Array.from(vertices);
    assert.ok(values.some(value => Math.abs(value - .05) < .01));
});

test('the demo keeps the original three simple Totem forms', () => {
    const appearance = read('app/services/totemAppearance.js');
    const arSource = read('app/screens/arMode.js');
    const demoSource = read('app/screens/temporaryArDemo.js');
    assert.match(appearance, /id: 'basic', label: 'Simple Totem'/);
    assert.match(appearance, /id: 'organic', label: 'Light Bulb'/);
    assert.match(appearance, /id: 'flat-disc', label: 'Disk Totem'/);
    assert.match(arSource, /totemStyle === 'organic'/);
    assert.match(arSource, /totemStyle === 'flat-disc'/);
    assert.match(arSource, /drawSpatialPrism\(gl, prismRenderer/);
    assert.match(demoSource, /drawSpatialPrism\(gl, prismRenderer/);
    assert.doesNotMatch(arSource, /drawSpatialTotem/);
    assert.doesNotMatch(demoSource, /drawSpatialTotem/);
});

test('Creator PIM preserves Android touch clicks while isolating pointer events', () => {
    const source = read('app/screens/arMode.js');
    const handler = source.match(/profilePanel\?\.addEventListener\('pointerdown',[\s\S]*?profilePanel\?\.addEventListener\('click'/)?.[0] || '';
    assert.match(handler, /event\.stopPropagation\(\);/);
    assert.doesNotMatch(handler, /event\.preventDefault\(\);/);
    assert.match(source, /profilePanel\?\.addEventListener\('pointerup'/);
    assert.match(source, /profilePanel\?\.addEventListener\('pointercancel'/);
});

test('Creator PIM touch geometry follows the same world panel and clears focus glow', () => {
    const creatorSource = read('app/screens/arMode.js');
    const styles = read('app/style.css');
    assert.match(creatorSource, /cellWidthPixels: PIM_TEXTURE_CELL_WIDTH/);
    assert.match(creatorSource, /width: size\.panelWidth, height: size\.panelHeight/);
    assert.match(creatorSource, /projected\.length === 4/);
    assert.match(creatorSource, /clearPimFocus\(cell\)/);
    assert.match(styles, /is-spatial-pim-hit-layer \.plant-knowledge-cell[\s\S]*outline: 0 !important/);
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
    assert.match(dashboard, /Physical marker link/);
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
    assert.doesNotMatch(arSource, /data-ar-context-web/);
    assert.doesNotMatch(arSource, /data-ar-context-close/);
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
    assert.match(arSource, /function openSpatialWebWindow\(\)[\s\S]*if \(!questHeadsetSession\)[\s\S]*exitArMode\(\)/);
    assert.match(arSource, /world-locked WebGL texture/);
    assert.match(arSource, /createSpatialDashboardMirror/);
    assert.match(arSource, /arReturnContext = selectedReturnContext/);
    assert.match(arSource, /`web-area:\$\{activeAreaId\}` : 'webhub'/);
    assert.match(arSource, /returnContext === 'webhub'/);
    assert.match(arSource, /String\(returnContext \|\| ''\)\.startsWith\('web-area:'\)/);
    assert.match(styles, /body\.creator-ar-quest-headset \.creator-ar-spatial-web-window[\s\S]*left: 7vw/);
    assert.match(arSource, /spatialWebWindow\.dataset\.arSpatialWebMode = 'quest'/);
    assert.doesNotMatch(arSource, /Choose its purpose/);
    assert.doesNotMatch(arSource, /data-ar-placed-type=/);
    assert.match(arSource, /\['plant', 'sub_checkpoint'\]\.includes\(readyPlacementType\)/);
    assert.doesNotMatch(arSource, /data-ar-web-mode/);
    assert.doesNotMatch(arSource, /data-ar-select-area/);
    assert.match(taskbar, /data-ar-view-mode/);
    assert.match(taskbar, /data-ar-select-mode/);
    assert.match(taskbar, />PLAY<|>PLAY<\/span>/);
    assert.match(taskbar, />EDIT<|>EDIT<\/span>/);
    assert.doesNotMatch(taskbar, /data-ar-hold-mode|&#x270B;/);
    assert.doesNotMatch(taskbar, /data-ar-reset|data-ar-recenter/);
    assert.doesNotMatch(taskbar, /data-ar-open-bag|Organizer Folder/);
    assert.equal((taskbar.match(/<button/g) || []).length, 6);
    assert.doesNotMatch(styles, /creator-ar-quest-link-bar \.creator-ar-taskbar > button:nth-child/);
    assert.match(styles, /body\.creator-ar-quest-headset[\s\S]*\.creator-ar-taskbar > \[data-ar-view-mode\][\s\S]*display: none !important/);
    assert.doesNotMatch(styles, /data-ar-hold-mode/);
    assert.doesNotMatch(styles, /\.creator-ar-marker-layer\.is-grab-mode \.creator-ar-marker-hit-target::after/);
    assert.match(styles, /\.creator-ar-marker-layer\.is-grab-mode \.creator-ar-marker-hit-target:is\(:hover,:focus-visible\)::after/);
    assert.match(styles, /\.creator-ar-marker-hit-target\.is-adjusting::after/);
    assert.match(styles, /\.creator-ar-marker-hit-target-note \{ width:var\(--marker-note-width,min\(72vw,280px\)\); height:var\(--marker-note-height,116px\)/);
    assert.match(styles, /\.creator-ar-taskbar \.creator-ar-add-note[\s\S]*background:#a95d32 !important/);
    assert.match(arSource, /note: \[\.94 \* factor, \.345 \* factor\]/);
    assert.match(styles, /\.creator-ar-marker-hit-target-area_checkpoint \{ width: 116px; height: 184px/);
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
    assert.match(arSource, /function controllerLaserSubjects\(\)/);
    assert.match(arSource, /function controllerMarkerRadius\(record\)/);
    assert.match(arSource, /function activateControllerSelection\(\)/);
    assert.match(arSource, /activateControllerTarget\(true\)/);
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
    assert.match(arSource, /if \(readyPlacementType\) \{[\s\S]*void quickPlace\(readyPlacementType\);[\s\S]*handPinchActive = pinching/);
    assert.match(styles, /\.creator-ar-overlay\.is-placement-armed \.creator-ar-placement-capture \{ pointer-events: auto; \}/);
    assert.match(styles, /\.creator-ar-status/);
    assert.match(arSource, /performance\.now\(\) - placementArmedAt > 250/);
    assert.match(arSource, /\['plant', 'sub_checkpoint'\]\.includes\(readyPlacementType\) && latestViewerMatrix/);
    assert.match(arSource, /function pointerWorldRay\(\)/);
    assert.match(arSource, /readyPlacementType \? '\.creator-ar-placement-guide' : '\.creator-ar-mode-pointer'/);
    assert.match(arSource, /spawnedAt: performance\.now\(\)/);
    assert.match(arSource, /opacity: arrivalEase \* markerAppearanceOpacity\(record\.marker\)/);
});

test('Creator and Demo AR taskbars reflow into a touch-safe landscape bottom dock', () => {
    const arSource = read('app/screens/arMode.js');
    const demoSource = read('app/screens/temporaryArDemo.js');
    const orientationSource = read('app/services/arScreenOrientation.js');
    const onboardingSource = read('app/services/arOnboarding.js');
    const styles = read('app/style.css');
    assert.match(arSource, /window\.addEventListener\('orientationchange', scheduleReflow, \{ passive: true \}\)/);
    assert.match(arSource, /window\.screen\?\.orientation\?\.addEventListener\('change', scheduleReflow, \{ passive: true \}\)/);
    assert.match(arSource, /setTimeout\(\(\) => \{[\s\S]*reflow\(\);[\s\S]*\}, 140\)/);
    assert.match(styles, /@media screen and \(orientation: landscape\) and \(max-height: 720px\)/);
    assert.match(styles, /\.creator-ar-control-dock,[\s\S]*width: min\(calc\(100dvw - env\(safe-area-inset-left/);
    assert.match(styles, /\.creator-ar-taskbar > button,[\s\S]*min-width: 44px;[\s\S]*min-height: 44px;/);
    assert.match(styles, /\.tryit-demo-footer[\s\S]*width: min\(calc\(100dvw - env\(safe-area-inset-left/);
    assert.match(styles, /\.tryit-demo-taskbar \{[\s\S]*display: flex;[\s\S]*overflow-x: auto;/);
    assert.doesNotMatch(styles, /ar-browser-overlay-clearance|ar-bottom-clearance|nxr-ar-fullscreen-guidance/);
    assert.match(orientationSource, /orientation\.lock\('any'\)/);
    assert.match(orientationSource, /orientation\.unlock/);
    assert.match(arSource, /allowArScreenRotation\(\);/);
    assert.match(arSource, /releaseArScreenRotation\(\);/);
    assert.match(demoSource, /allowArScreenRotation\(\);/);
    assert.match(demoSource, /releaseArScreenRotation\(\);/);
    assert.match(onboardingSource, /CAMERA_SAFETY_ACK_KEY/);
    assert.doesNotMatch(onboardingSource, /FULLSCREEN_GUIDANCE|Swipe the browser message right|showArFullscreenGuidance/);
    assert.doesNotMatch(arSource, /data-ar-fullscreen-help|showArFullscreenGuidance/);
    assert.doesNotMatch(demoSource, /data-tryit-fullscreen-help|showArFullscreenGuidance/);
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
    assert.doesNotMatch(demoSource, /tryit-spatial-welcome-note nourishland-spatial-note-surface/);
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

test('Note placement preview uses one DOM surface on phones and one spatial texture on Quest', () => {
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
    assert.match(arSource, /const visible = noteFactor\s+\? x >= 0 && x <= window\.innerWidth && y >= 0 && y <= window\.innerHeight/);
    assert.match(arSource, /element\.style\.removeProperty\('transform'\)/);
    assert.match(arSource, /const boardHalfWidth = Math\.min\(window\.innerWidth \* \.31, 260\)/);
    assert.match(arSource, /const visible = boardPoint\.x >= boardHalfWidth/);
    assert.match(arSource, /if \(!point \|\| !Number\.isFinite\(point\.x\) \|\| !Number\.isFinite\(point\.y\)\)/);
    assert.match(styles, /\.creator-ar-marker-hit-target\[hidden\][\s\S]*display: none !important/);
    assert.match(drawSource, /readyPlacementType\?\.toLocaleLowerCase\(\) === 'note'/);
    assert.match(drawSource, /drawQuestSpatialNote\(view, \{ marker: previewMarker, position: noteTarget \}\)/);
    assert.match(arSource, /if \(questBeltUsesSpatialRenderer\(\)\) \{\s*preview\.hidden = true/);
    assert.doesNotMatch(drawSource, /markerShape\('note'\)/);
    assert.match(styles, /\.creator-ar-note-placement-preview/);
    assert.match(styles, /\.creator-ar-note-placement-surface/);
    assert.match(styles, /\.creator-ar-marker-hit-target-note \.creator-ar-spatial-name \{ --spatial-note-color:var\(--marker-accent\); position:absolute; left:0; top:0/);
    assert.match(styles, /\.creator-ar-note-placement-preview\.creator-ar-marker-hit-target-note \.creator-ar-note-placement-surface \{ position:absolute; left:0; top:0/);
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
    assert.match(specialChoices, /data-ar-start-link-calibration/);
    assert.match(specialChoices, /data-ar-capture-link-target/);
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
    assert.match(arSource, /function startTotemLinkCalibration\(\)/);
    assert.match(arSource, /function captureTotemLinkCalibration\(\)/);
    assert.match(arSource, /alignActiveAreaToCalibrationTarget\(expectedTargetPosition\)/);
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
    assert.match(arSource, /function uniqueMarkerName\(requestedName, existingMarkers = \[\], excludedId = ''\)/);
    assert.match(arSource, /name: uniqueMarkerName\(requestedName, existingMarkers\)/);
    assert.match(arSource, /saveMarkerAnchor/);
    assert.match(arSource, /type: 'spatial'/);
    assert.match(arSource, /let interactionMode = 'neutral'/);
    assert.match(arSource, /interactionMode = interactionMode === mode && \['grab', 'select'\]\.includes\(mode\) \? 'neutral' : mode/);
    assert.match(arSource, /PLAY mode is on\. Tap a Marker to reveal or hide information; hold it for 0\.8 seconds to move it/);
    assert.match(arSource, /EDIT mode is on\. Hold a glowing element for 0\.8 seconds to move it/);
    assert.match(arSource, /dragState\.distance \+ dragState\.depthOffset/);
    assert.match(arSource, /const verticalTravel = dragState\.gestureStartY - event\.clientY/);
    assert.match(arSource, /setHeldMarkerDepthOffset\(verticalTravel \/ 120\)/);
    assert.match(arSource, /function heldPointerRay\(\)/);
    assert.match(arSource, /const CREATOR_AR_HOLD_DELAY_MS = 800/);
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
    assert.match(arSource, /EDIT mode is on\. Tap a placed object to open its edit tools/);
    assert.match(arSource, /if \(!directHold && interactionMode === 'view'\) \{[\s\S]*record\.infoVisible = !record\.infoVisible/);
    assert.match(arSource, /if \(!directHold && interactionMode === 'neutral'\) \{[\s\S]*openMarkerContextToolbar\(record\)/);
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
    assert.match(arSource, /Move cancelled\. EDIT mode remains on/);
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

test('Creator dashboard has one DOM source shared by Web Mode and the Quest spatial mirror', () => {
    const arSource = read('app/screens/arMode.js');
    const mirrorSource = read('app/services/spatialDashboardMirror.js');
    const html2canvasSource = read('app/vendor/html2canvas.esm.js');
    const html2canvasLicense = read('app/vendor/html2canvas.LICENSE.txt');
    const hostedBuildSource = read('tools/build-hosted.mjs');
    assert.match(arSource, /renderProjectDashboard\(dashboardRoot, encodeURIComponent\(activeProjectId\)\)/);
    assert.match(mirrorSource, /import\('\.\.\/vendor\/html2canvas\.esm\.js'\)/);
    assert.match(mirrorSource, /foreignObjectRendering: false/);
    assert.match(mirrorSource, /function waitForSpatialDashboardLayout\(\)/);
    assert.match(mirrorSource, /window\.setTimeout\(resolve, 32\)/);
    assert.doesNotMatch(mirrorSource, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
    assert.match(mirrorSource, /target\.click\(\)/);
    assert.match(mirrorSource, /scrollBy/);
    assert.match(mirrorSource, /data-spatial-key/);
    assert.match(html2canvasSource, /html2canvas 1\.4\.1/);
    assert.match(html2canvasSource, /var cssColor = function/);
    assert.match(html2canvasSource, /colorSpace\.value === 'display-p3'/);
    assert.match(html2canvasSource, /color: cssColor/);
    assert.match(html2canvasLicense, /Permission is hereby granted, free of charge/);
    assert.match(hostedBuildSource, /'vendor'/);
    assert.match(hostedBuildSource, /style\\\.css\(\?:\\\?v=\[\^"\]\*\)\?/);
    assert.match(hostedBuildSource, /main\\\.js\(\?:\\\?v=\[\^"\]\*\)\?/);
    assert.doesNotMatch(mirrorSource, /XMLSerializer|<foreignObject/);
    assert.doesNotMatch(arSource, /QUEST_SPATIAL_DASHBOARD_CONTROLS|dashboard-home|dashboard-area/);
    assert.doesNotMatch(arSource, /data-ar-web-mode/);
});

test('Creator AR keeps mobile controls intact and adds Q3-only spatial dashboard input', () => {
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
    assert.match(arSource, /dashboard as a world-locked WebGL texture[\s\S]*openQuestSpatialWebPanel/);
    assert.match(arSource, /function questBeltUsesSpatialRenderer\(\)[\s\S]*return questHeadsetSession;/);
    assert.match(arSource, /drawQuestSpatialNote\(view, record\)/);
    assert.match(arSource, /questNoteTextures/);
    assert.match(arSource, /controllerSpatialDashboardAtAim/);
    assert.match(arSource, /questSpatialDashboardMirror\.activateAt/);
    assert.match(arSource, /questSpatialDashboardMirror\.scrollBy/);
    assert.match(arSource, /function controllerSpatialSurfaceAtAim\(\)/);
    assert.match(arSource, /if \(surfaceHit\?\.position\) return surfaceHit\.position/);
    assert.match(arSource, /color: surfaceHit[\s\S]*\[0\.65, 1, 0\.24, 1\]/);
    assert.match(arSource, /surfaceHit \? \.019 : \.012/);
    assert.match(arSource, /if \(!questHeadsetSession\)[\s\S]*exitArMode\(\)/);
    assert.doesNotMatch(taskbar, /data-ar-hold-mode/);
    assert.doesNotMatch(taskbar, /data-ar-open-bag/);
    assert.doesNotMatch(taskbar, /data-ar-reset|data-ar-recenter/);
    assert.match(arSource, /function drawControllerPointerContact\(view\)/);
    assert.match(arSource, /short press selects a placed object/);
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

test('project settings can rename a project while the dashboard stays overview-only', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    const entrySource = read('app/components/projectEntry.js');
    const mainSource = read('app/main.js');
    assert.match(dashboardSource, /Project Details/);
    assert.match(dashboardSource, /projectSettingsName/);
    assert.match(dashboardSource, /saveProjectName/);
    assert.match(dashboardSource, /renameProjectOnDisk\(projectId, \{ \.\.\.project, preserveId: true, name, description, coverImage \}\)/);
    assert.match(dashboardSource, /const button = trigger\?\.currentTarget \|\| trigger/);
    assert.match(entrySource, /project-area-overview-card/);
    assert.match(entrySource, /PROJECT OVERVIEW/);
    assert.match(mainSource, /window\.toggleAreas = toggleAreas/);
});

test('opening a project uses one canonical project dashboard route', () => {
    const mainSource = read('app/main.js');
    const dashboardSource = read('app/screens/projectDashboardV2.js');
    assert.match(mainSource, /renderProjectDashboardV2Screen/);
    assert.match(mainSource, /window\.renderProjectDashboard = async/);
    assert.doesNotMatch(mainSource, /renderProjectDashboardV09|renderClassicDashboard|renderLivingDashboard/);
    assert.doesNotMatch(mainSource, /dashboardMode|dashboardVersion|readDashboardVersion|rememberDashboardVersion/);
    assert.match(dashboardSource, /PROJECT/);
    assert.doesNotMatch(dashboardSource, /Choose project/);
    assert.match(dashboardSource, /Project Status/);
    assert.match(dashboardSource, /data-v2-status-action/);
    assert.match(dashboardSource, /Project Map/);
    assert.doesNotMatch(dashboardSource, /Living Dashboard|Classic Dashboard|NourishlandXR V1/);
    assert.match(mainSource, /nourishlandView: 'dashboard'/);
    assert.match(mainSource, /window\.addEventListener\('popstate'/);
    assert.match(mainSource, /nourishland-xr-current-view-v1/);
    assert.match(mainSource, /function pushViewHistory/);
    assert.match(mainSource, /function replaceViewHistory/);
    assert.match(mainSource, /\['dashboard', 'dashboard-v2', 'living-dashboard', 'dashboard-classic'\]/);
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
    assert.match(dashboardSource, /data-map-fit/);
    assert.match(dashboardSource, /data-map-edit/);
    assert.match(dashboardSource, /data-map-layer-toggle/);
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
    assert.doesNotMatch(source, /data-field-guide-scope-button="global"/);
    assert.doesNotMatch(source, /data-field-guide-scope-button="local"/);
    assert.match(source, /const searchInput = app\.querySelector\('#fieldGuideSearch'\)/);
    assert.match(source, /field-guide-global-legend-local/);
    assert.match(source, /searchGlobal\(event\.target\.value\)/);
    assert.match(source, /Opening import page…/);
    assert.match(source, /The import page took too long to open/);
    assert.doesNotMatch(source, /id="fieldGuideGlobalSearch"/);
    const fieldGuideStyles = read('app/style.css');
    assert.match(fieldGuideStyles, /\.field-guide-global-search\[hidden\]\s*\{\s*display:none;/);
    assert.match(fieldGuideStyles, /\.field-guide-global-profile-extract input\[type="checkbox"\][^{]*\{[^}]*width:18px !important/);
    assert.match(fieldGuideStyles, /\.field-guide-extract-fact span\s*\{[^}]*flex:1 1 auto/);
});

test('Creator AR opens a passthrough or native immersive WebXR session and cleans up on exit', () => {
    const arSource = read('app/screens/arMode.js');
    const webxrSource = read('app/services/webxrSession.js');
    assert.match(arSource, /requestImmersiveArSession\(overlayRoot, \{ requireDomOverlay: false, preferDomOverlay: questBrowser \}\)/);
    assert.match(arSource, /document\.body\.dataset\.arDomOverlay = arSession\.domOverlay \? 'true' : 'false'/);
    assert.match(arSource, /questHeadsetSession = questBrowser \|\| sessionMode === 'immersive-vr' \|\| session\.interactionMode === 'world-space'/);
    assert.match(arSource, /classList\.toggle\('creator-ar-quest-headset', questHeadsetSession\)/);
    assert.match(arSource, /classList\.remove\('creator-ar-quest-headset'\)/);
    assert.match(arSource, /isQuestHeadsetBrowser/);
    assert.match(arSource, /isTrackedHeadsetInputSource/);
    assert.match(arSource, /activateQuestHeadsetFromInput\(selectedSource\)/);
    assert.match(arSource, /function questBeltUsesSpatialRenderer\(\)[\s\S]*return questHeadsetSession/);
    assert.match(arSource, /questSpatialBeltRayTarget\(latestControllerRay, currentQuestBeltLayout\(\)\)/);
    assert.match(arSource, /drawQuestSpatialBelt\(view\)/);
    assert.match(arSource, /classList\.add\('creator-ar-quest-headset', 'creator-ar-quest-pending'\)/);
    assert.match(arSource, /classList\.remove\('creator-ar-quest-pending'\)/);
    assert.match(arSource, /createQuestBeltPanelTexture/);
    assert.match(arSource, /let questBeltLayout = \[\]/);
    assert.match(arSource, /questBeltViewerMatrix = new Float32Array\(latestViewerMatrix\)/);
    assert.match(arSource, /function questBeltPanelMatrix/);
    assert.match(arSource, /const faceUp = Math\.max/);
    assert.match(arSource, /Cross\(normal, right\)/);
    assert.match(arSource, /function connectedCanvasRectangle/);
    assert.match(arSource, /joined: true/);
    assert.match(arSource, /questBeltPanelMatrix\(button, \.082, \.058\)/);
    assert.match(arSource, /function controllerQuestBeltSurfaceHit\(\)/);
    assert.match(arSource, /const beltHit = controllerQuestBeltSurfaceHit\(\)/);
    assert.match(arSource, /classList\.add\('creator-ar-spatial-belt-ready'\)/);
    assert.match(arSource, /classList\.remove\('creator-ar-spatial-belt-ready'\)/);
    assert.match(read('app/style.css'), /body\.creator-ar-quest-headset\.creator-ar-spatial-belt-ready \.creator-ar-quest-link-bar > \.creator-ar-taskbar[\s\S]*opacity: 0 !important/);
    assert.match(read('app/style.css'), /body\.creator-ar-quest-pending \.creator-ar-quest-link-bar[\s\S]*visibility: hidden !important/);
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
    assert.match(arSource, /: activeAreaId[\s\S]*\? 'Aim dot ready\. Hold any placed item to move it, or choose EDIT for edit tools\.'[\s\S]*: '';/);
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
    const pimCanvasSource = read('app/services/plantInformationMeshCanvas.js');
    const pimViewSource = read('app/services/plantInformationMeshView.js');
    const webxrSource = read('app/services/webxrSession.js');
    const styles = read('app/style.css');
    assert.match(source, /function demoPointerWorldRay\(\)/);
    assert.match(source, /demoPlacementPosition\(viewerMatrix, demoPointerWorldRay\(\), demoPointerWorldOrigin\(\)\)/);
    assert.match(source, /if \(latestControllerRay\) return latestControllerRay\.direction/);
    assert.match(source, /function demoPointerWorldOrigin\(\)/);
    assert.match(source, /function drawDemoControllerPointer\(view\)/);
    assert.match(source, /function demoLaserSubjects\(\)/);
    assert.match(source, /function beginControllerDemoHold\(\)/);
    assert.match(source, /controllerRayEnd\(latestControllerRay/);
    assert.doesNotMatch(source.slice(source.indexOf('function drawDemoControllerPointer'), source.indexOf('async function startImmersive')), /drawSpatialOrb/);
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
    assert.match(source, /label\.width = record\.demoType === 'zone' \? 720 : PIM_TEXTURE_SIZE\.width/);
    assert.match(source, /label\.height = record\.demoType === 'zone' \? 1120 : PIM_TEXTURE_SIZE\.height/);
    assert.match(source, /drawWrappedTextureText/);
    assert.match(styles, /width: min\(88vw, 560px\)/);
    assert.match(styles, /overflow-wrap: anywhere/);
    assert.doesNotMatch(source, /tryit-spatial-pim-web/);
    assert.match(source, /Nourishland XR/);
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
    assert.doesNotMatch(source, /tryit-spatial-welcome-note/);
    assert.doesNotMatch(styles, /\.tryit-spatial-welcome-note \{/);
    assert.doesNotMatch(source, /data-tryit-persistent-welcome/);
    assert.doesNotMatch(source, /function createPersistentWelcomeTexture\(\)/);
    assert.match(source, /finishIntroBoard\(\)[\s\S]*querySelector\('\[data-tryit-guided-choice\]'\)/);
    assert.match(source, /is-persistent-demo-board/);
    assert.match(styles, /\.biomap-branch:nth-child\(1\) \{ left:29%; top:22%; \}/);
    assert.doesNotMatch(styles, /\.tryit-intro-knowledge::before/);
    assert.match(styles, /color:#fff/);
    assert.match(styles, /font-weight:650/);
    assert.match(source, /drawWrappedTextureText\(ctx, keyword/);
    assert.match(styles, /tryit-intro-knowledge-arrive/);
    assert.match(source, /showIntroBoard\(\s*'Nourishland XR'/);
    assert.match(source, /WELCOME_BOARD_PARAGRAPHS/);
    assert.match(source, /Welcome to the NourishlandXR demo interface/);
    assert.match(source, /Augmented reality\(AR\) & Mixed reality\(XR\) are technologies that can help us better understand and interact with the world around us/);
    assert.match(source, /NourishLandXR is a portal for plant-related information, a plant mapping tool and a experience editor/);
    assert.match(source, /few examples of how information can be mapped real places/);
    assert.match(source, /plant: \['Virtual markers for Plants', \[/);
    assert.match(source, /To do so ,use the round pointer that will appear on your screen/);
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
    assert.match(source, /panel\?\.removeAttribute\('hidden'\)/);
    assert.match(source, /function pressPlacementPointer\(event\)/);
    assert.doesNotMatch(source, /function guideFirstOrbAdjustment\(record\)|is-movement-tip|awaitingPositionAdjustment/);
    assert.match(source, /You can grab and hold the Pigeon Pea orb or any Plant marker to position it/);
    assert.match(source, /Press Continue after positioning/);
    assert.doesNotMatch(source, /EDIT mode: press and hold the Pigeon Pea orb/);
    assert.doesNotMatch(source, /PLAY mode will open/);
    assert.doesNotMatch(source, /Adjust its position if needed/);
    assert.match(source, /function beginPointerDemoHold\(event\)/);
    assert.match(source, /function updateHeldDemoRecordPosition\(\)/);
    assert.match(source, /function releaseHeldDemoRecord\(\)/);
    assert.match(source, /const DEMO_PLANT_ORB_HOLD_DELAY_MS = 800/);
    assert.match(source, /function simulatedAnchorFromPointer\(startAnchor, startX, startY, event\)/);
    assert.match(source, /record\.simulatedAnchor = simulatedAnchorFromPointer\(/);
    assert.match(source, /function applySimulatedMarkerAnchor\(layer, index, anchor\)/);
    assert.match(source, /compactMarker\.addEventListener\('pointercancel', \(\) => \{[\s\S]*releaseHeldDemoRecord\(\)/);
    assert.match(source, /event\.currentTarget\?\.setPointerCapture\?\.\(event\.pointerId\)/);
    assert.match(source, /placementPointer\.addEventListener\('pointercancel'/);
    assert.match(source, /if \(type === 'plant'\) guidePlantConversion\(placedRecord\)/);
    assert.match(source, /pointer\?\.removeAttribute\('hidden'\);[\s\S]*pointer\?\.classList\.add\('is-revealing', 'is-ready'\)/);
    assert.match(source, /function hideGuidedChoice\(\{ hideBoard = false \} = \{\}\)/);
    assert.match(source, /addEventListener\('beforexrselect', event => event\.preventDefault\(\)\)/);
    assert.match(source, /demoInteractive: !\['plant', 'plant2'\]\.includes\(type\)/);
    assert.match(source, /record\.demoInteractive = true/);
    assert.match(styles, /\.tryit-sim-marker\.is-arriving \{ pointer-events:none; \}/);
    assert.match(source, /place\?\.classList\.add\('is-pressed'\)/);
    assert.match(source, /\}, 360\)/);
    assert.match(styles, /tryit-pointer-press \.36s/);
    assert.match(source, /const position = placementPosition\(\);\s*if \(!position\) \{[\s\S]*?return;\s*\}\s*placementReady = false;/);
    assert.doesNotMatch(source, /direct = false|if \(direct\)/);
    assert.match(source, /showIntroBoard\(\s*moringa \? 'A SECOND PLANT ORB' : 'What is A plant Orb \?'/);
    assert.match(source, /A simple Plant orb can become a extended hub of information/);
    assert.match(source, /A plant Orb is  knowledge stays connected to where a plant grows/);
    assert.doesNotMatch(source, /profile provides in-depth information about \$\{plantName\}/);
    assert.match(source, /Press the Moringa orb to explore its information tree/);
    assert.doesNotMatch(source, /Create Plant Profile|Create Moringa profile/);
    assert.match(source, /record\.awaitingProfileReveal = true/);
    assert.doesNotMatch(source, /keeps its colour as it becomes a Plant marker/);
    assert.match(source, /demoOrbColor: type === 'plant' \? 'pigeonPea' : type === 'plant2' \? 'green'/);
    assert.match(source, /demoOrbShape: type === 'plant' \? 'orb' : type === 'plant2' \? 'orb'/);
    assert.match(source, /class="tryit-sim-orb is-plant" style="\$\{orbAppearance\}"/);
    assert.match(source, /pigeonPea:[\s\S]*radius: 0\.09/);
    assert.match(source, /green:[\s\S]*radius: 0\.074/);
    assert.match(source, /drawSpatialTriangle\(gl, triangleRenderer/);
    assert.match(source, /coreColor: material\?\.core/);
    assert.match(styles, /\.tryit-place\.creator-ar-placement-guide\.is-ready \{ z-index:12010;/);
    assert.doesNotMatch(styles, /\.tryit-guided-choice\.is-movement-tip/);
    assert.match(styles, /\.tryit-sim-marker\.is-demo-orb \{ z-index:12007; \}/);
    assert.match(styles, /body\[data-project-theme\] \.tryit-demo \.tryit-place\.creator-ar-placement-guide \{[^}]*outline:0 !important;[^}]*border-radius:50% !important;[^}]*background:transparent !important;[^}]*backdrop-filter:none !important;/);
    assert.match(source, /placementPointer\.addEventListener\('pointerup', event => \{[\s\S]*releaseHeldDemoRecord\(\)[\s\S]*pressPlacementPointer\(event\)/);
    assert.match(source, /placementPointer\.addEventListener\('mousedown'[\s\S]*beginPointerDemoHold\(event\)/);
    assert.match(source, /session\.addEventListener\('selectend', \(\) => \{[\s\S]*clearTimeout\(demoHoldTimer\)/);
    assert.doesNotMatch(source, /awaitingPositionAdjustment/);
    assert.match(source, /placementPointer\.addEventListener\('click', pressPlacementPointer\)/);
    const immersiveSelectHandler = source.slice(
        source.indexOf("session.addEventListener('select'"),
        source.indexOf("session.addEventListener('end'")
    );
    assert.match(source, /function activateImmersiveDemoControl\(\)/);
    assert.match(source, /domOverlayEnabled = Boolean\(arSession\.domOverlay\)/);
    assert.match(source, /uses-webgl-controls/);
    assert.match(source, /is-quest-vr/);
    assert.match(source, /session\.addEventListener\('selectstart'/);
    assert.match(source, /session\.addEventListener\('selectend'/);
    assert.match(source, /session && !domOverlayEnabled && continueButton/);
    assert.match(source, /introTextureFrameToken !== introFrameToken/);
    assert.match(source, /introFrameToken = _time/);
    assert.match(styles, /\.tryit-demo\.uses-webgl-controls \.tryit-demo-footer \{ display:none !important; \}/);
    assert.match(immersiveSelectHandler, /if \(placementReady\) return pressPlacementPointer\(\);/);
    assert.match(immersiveSelectHandler, /selectDemoPlantAtPointer\(\)\) return;[\s\S]*activateImmersiveDemoControl\(\)/);
    const immersiveSelectStartHandler = source.slice(
        source.indexOf("session.addEventListener('selectstart'"),
        source.indexOf("session.addEventListener('selectend'")
    );
    assert.doesNotMatch(immersiveSelectStartHandler, /activateImmersiveDemoControl/);
    assert.match(immersiveSelectHandler, /selectGuidedDemoOrb\(\);/);
    assert.match(source, /Press Continue to load the aim\.[\s\S]*press the aim yourself to place the Moringa orb/);
    assert.match(source, /function inviteVirtualTag\(record\)/);
    assert.match(source, /data-tryit-open-live-tag hidden/);
    assert.match(source, /data-tryit-skip/);
    assert.match(source, /bindHoldToConfirmButton/);
    assert.match(source, /WEB MODE · PLANT LIVE TAG/);
    assert.match(source, /FULL PLANT PROFILE/);
    assert.match(source, /data-demo-close-web-mode>CLOSE WEB MODE · RETURN TO AR/);
    assert.match(source, /A Plant Live Tag can open this full, view-only plant file/);
    assert.match(source, /function advanceAfterDemoProfileInteraction\(record\)/);
    assert.match(source, /record\.tutorialStage === 'plant2'\) showDemoAction\('note'\)/);
    assert.match(source, /record\.tutorialStage === 'plant'\) inviteVirtualTag\(record\)/);
    assert.match(source, /demoWebModeOpen = true;[\s\S]*suppressSessionSelectUntil = Number\.POSITIVE_INFINITY/);
    assert.match(source, /stage\.inert = true;[\s\S]*stage\.setAttribute\('aria-hidden', 'true'\)/);
    assert.match(source, /stage\.inert = false;[\s\S]*stage\.removeAttribute\('aria-hidden'\)/);
    assert.match(source, /demoWebModeOpen = false;[\s\S]*record\.demoExpanded = false;[\s\S]*armDemoPlacement\('plant2'\)/);
    assert.match(styles, /\.tryit-virtual-tag-mode \{[^}]*position:fixed;[^}]*z-index:12100;[^}]*background:#f2f4ec;/);
    assert.match(styles, /\.tryit-virtual-tag-close,body\[data-project-theme\] \.tryit-virtual-tag-close/);
    assert.match(source, /data-tryit-intro-continue/);
    assert.match(styles, /\.tryit-demo-taskbar \.tryit-intro-continue \{[^}]*border-color:rgba\(220,239,149,\.62\)/);
    assert.doesNotMatch(styles, /\.tryit-demo\.is-quest-vr > \.tryit-intro-continue/);
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
    assert.doesNotMatch(source, /runKnowledgeTour/);
    assert.match(source, /record\.demoActiveBranch = ''/);
    assert.match(source, /record\.texture = createMarkerTexture\(record\)/);
    assert.match(source, /function drawIntroSpatial\(view\)/);
    assert.match(source, /function createIntroControlTexture\(labelText/);
    assert.match(source, /function createIntroPointerTexture\(/);
    assert.match(source, /const introContinue = appRoot\.querySelector\('\[data-tryit-intro-continue\]'\)/);
    assert.doesNotMatch(source, /createElement\('button'\)[\s\S]{0,180}tryit-intro-continue/);
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
    assert.match(source, /const DEMO_TEXT_TEXTURE_INTERVAL_MS = 0/);
    assert.match(source, /label\.width = 900/);
    assert.match(source, /label\.height = 220/);
    assert.doesNotMatch(source, /PRESS CONTROLLER TRIGGER/);
    assert.match(source, /radius: \.96/);
    assert.match(source, /introTextureUploadedAt >= DEMO_TEXT_TEXTURE_INTERVAL_MS/);
    assert.match(source, /function shiftSimulatedSceneForStage\(type\)/);
    assert.match(source, /plant: \{ x: 34,[\s\S]*plant2: \{ x: 66,[\s\S]*note: \{ x: 50,/);
    assert.match(source, /place\.dataset\.aimX = String\(stageAim\.x\)/);
    assert.doesNotMatch(source, /simulatedSceneShifts/);
    assert.match(source, /50 \+ comfortOffsetPercent/);
    assert.doesNotMatch(source, /createIntroTickerTexture|introTickerTexture/);
    assert.match(source, /introBoardVisibleBody = bodyText\.slice\(0, typedLength\)/);
    assert.match(source, /typedLength = nextDemoTextLength\(bodyText, typedLength\)/);
    assert.match(source, /const typingDelay = demoTextTypingDelay\(bodyText, typedLength\)/);
    assert.match(source, /return 34;/);
    assert.match(source, /boardTypingTimer = setTimeout\(typeNextCharacter, typingDelay\)/);
    assert.doesNotMatch(source, /boardControlTimer/);
    assert.match(styles, /tryit-cursor-blink 1\.4s ease-in-out infinite/);
    assert.match(styles, /content:"…";/);
    assert.match(styles, /width:min\(94vw,820px\)/);
    assert.match(styles, /top:max\(4px,env\(safe-area-inset-top\)\)/);
    assert.match(styles, /height:calc\(100dvh - max\(8px,env\(safe-area-inset-top\)\)\)/);
    assert.match(styles, /max-height:none/);
    assert.match(styles, /\.tryit-demo-taskbar \{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(source, /pointerOffsetCss: '3\.5cm'/);
    assert.match(source, /pointerOffsetPixels: 132\.3/);
    assert.match(styles, /top:calc\(50% \+ 3\.5cm\)/);
    assert.match(styles, /\.creator-ar-mode-pointer \{[\s\S]*top:\s*calc\(50% \+ 3\.5cm\)/);
    assert.doesNotMatch(styles, /\.tryit-intro-continue \{[^}]*border-radius:999px/);
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
    assert.match(source, /const MORINGA_KNOWLEDGE = Object\.freeze\(pimToArKnowledge\(resolvePlantPim\(MORINGA_PROFILE,/);
    assert.match(source, /\{ id: 'medicinal', parentId: 'uses'/);
    assert.match(source, /\{ id: 'craft', parentId: 'uses'/);
    assert.match(source, /parentId: 'propagation'/);
    assert.match(source, /parentId: 'cultivation'/);
    assert.match(source, /plantInformationMeshMarkup/);
    assert.match(source, /createPlantInformationHoneycombTexture/);
    assert.doesNotMatch(source, /function plantKnowledgeMarkup/);
    assert.doesNotMatch(source, /function drawPlantKnowledgeTexture/);
    assert.doesNotMatch(source, /data-demo-plant-tether/);
    assert.match(source, /PIM_BLOOM_DURATION_MS/);
    assert.match(source, /bindSimulatedInformationPanels/);
    const cellBindings = source.slice(source.indexOf('const pimTarget = event =>'), source.indexOf('let start = null;', source.indexOf('const pimTarget = event =>')));
    assert.match(cellBindings, /profile.addEventListener\('pointerup', event => \{[\s\S]*if \(pimTarget\(event\)\) event.stopPropagation\(\)/);
    assert.doesNotMatch(cellBindings, /profile.addEventListener\('pointerdown', event => \{[\s\S]*event.preventDefault\(\)/);
    assert.match(cellBindings, /refreshDemoPimProfile\(record, profile\)/);
    assert.match(source, /demoPanelOffset/);
    assert.match(source, /record\.informationPosition = plantInformationPosition\(record\)/);
    assert.match(source, /const eyeLevelY = Number\.isFinite\(cameraY\) \? cameraY - \.12 : position\.y \+ \.45/);
    assert.match(source, /drawSpatialTether/);
    assert.match(source, /simulatedAnchor/);
    assert.doesNotMatch(source, /Math\.max\(record\.position\.y \+ 1\.35, 1\.35\)/);
    assert.doesNotMatch(styles, /--marker-index/);
    assert.doesNotMatch(styles, /\+ 230px/);
    assert.doesNotMatch(styles, /\.tryit-sim-plant-tether/);
    assert.match(styles, /\.tryit-sim-plant-profile/);
    assert.match(styles, /\.tryit-sim-plant-profile \{[\s\S]*pointer-events: auto;/);
    assert.match(source, /record\.demoExpanded = false/);
    assert.match(source, /function toggleDemoPlantProfile/);
    assert.match(source, /function showPersistentPimPrompt\(record\)/);
    assert.match(source, /persistent: true/);
    assert.match(source, /if \(options\.persistent\) panel\.classList\.add\('is-persistent-demo-board'\)/);
    const persistentPimPrompt = source.slice(source.indexOf('function showPersistentPimPrompt'), source.indexOf('function runArWelcomeTutorial'));
    assert.match(persistentPimPrompt, /continueAfterDemoPim\(record\)/);
    assert.match(persistentPimPrompt, /continueButton\.click\(\)/);
    assert.match(source, /function continueAfterDemoPim\(record\)/);
    assert.ok(source.includes('record.demoProfileInteracted = true;'));
    assert.match(source, /inviteVirtualTag\(record\)/);
    assert.match(source, /function orientDemoPimPoseToViewer\(pose\)/);
    assert.match(source, /fixedPimPanelMatrix\(orientDemoPimPoseToViewer\(record\.informationPose\)\)/);
    assert.match(source, /pimSpatialPanel\(orientDemoPimPoseToViewer\(record\.informationPose\)\)/);
    assert.match(source, /targetRayMode === 'screen' && source\.targetRaySpace/);
    assert.doesNotMatch(source, /board\?\.classList\.contains\('is-typing'\)/);
    assert.doesNotMatch(source, /board\.click\(\);/);
    assert.match(source, /export function demoPointerScreenPoint\(rect/);
    assert.match(source, /const hasVisibleRect = Number\.isFinite\(width\) && width > 0/);
    assert.match(source, /profileRevealStarted = performance\.now\(\)/);
    assert.match(source, /uniform float opacity/);
    assert.match(source, /record\.demoDistance = Math\.max\(\.4, Math\.min\(4, 1 \+ verticalTravel \/ 120\)\)/);
    assert.match(source, /function captureDemoGrabPose\(record, origin, ray\)/);
    assert.match(source, /record\.demoGrabLateral/);
    assert.match(source, /panelHit: true/);
    assert.match(source, /spatialMoveControlMarkup\('demo'\)/);
    assert.match(styles, /\.spatial-move-control/);
    assert.match(styles, /\.spatial-move-release/);
    assert.match(styles, /\.spatial-move-control \{[\s\S]*left: var\(--move-control-x, 50%\); top: var\(--move-control-y, 50%\)/);
    assert.match(styles, /\.spatial-move-instruction/);
    assert.match(styles, /\.spatial-move-instruction \{ display: none; \}/);
    assert.match(styles, /\.spatial-move-release span::before \{ content: "\+"/);
    assert.match(styles, /\.spatial-grab-handle/);
    assert.doesNotMatch(source, /data-demo-move-mode|demoMoveMode|✋/);
    assert.match(source, /querySelector\('\.tryit-drag-hint'\)\?\.remove\(\)/);
    assert.match(source, /compactMarker\.classList\.add\('is-drag-ready'\)/);
    assert.match(styles, /\.tryit-demo \.tryit-sim-marker:is\(:hover, :focus-visible, \.is-drag-ready\)/);
    assert.doesNotMatch(source, /data-demo-depth-joystick\] input/);
    assert.match(styles, /\.tryit-sim-marker-plant\.has-plant-profile:is\(:hover, :focus-visible\)/);
    assert.match(styles, /\.plant-knowledge-map/);
    assert.match(pimViewSource, /plant-knowledge-connections/);
    assert.match(styles, /\.plant-knowledge-map\[data-pim-layout="honeycomb"\] \.plant-knowledge-connection/);
    assert.match(styles, /pim-connection-open/);
    assert.match(styles, /--pim-cell-size: clamp\(76px, 14vw, 132px\)/);
    assert.match(styles, /height: min\(62dvh, 620px\)/);
    assert.match(styles, /data-pim-layout="honeycomb"/);
    assert.match(pimViewSource, /pimConnectionCurve/);
    assert.match(pimViewSource, /pimConnectionPairs/);
    assert.doesNotMatch(source, /pimFocusedView\(/);
    assert.doesNotMatch(source, /visibleNodes\.find\(/);
    assert.match(source, /if \(!node\) \{[\s\S]*Aim at a visible Plant Information Mesh cell[\s\S]*return false;/);
    assert.match(source, /function canvasTexture\(label, texture = null, flipY = false\)[\s\S]*UNPACK_FLIP_Y_WEBGL, Boolean\(flipY\)/);
    assert.match(source, /return canvasTexture\(label\);/);
    assert.match(source, /const separator = focusPath\.includes\('\/'\) \? '\/' : '\.'/);
    assert.match(source, /data-pim-back/);
    assert.match(pimViewSource, /data-pim-parent-id/);
    assert.match(styles, /@keyframes pim-cell-fade-in/);
    assert.doesNotMatch(styles, /@keyframes pim-demo-attached-grow/);
    assert.doesNotMatch(styles, /--pim-parent-grid-x/);
    assert.doesNotMatch(source, /globalCompositeOperation = 'destination-over'/);
    assert.match(source, /explorationGoal = record\.tutorialStage === 'plant' \? 3 : 2/);
    assert.match(source, /PIM_SPATIAL_CONFIG\.expandedSurfaceWidthMetres \/ \.4/);
    assert.match(styles, /left: var\(--pim-node-x, 50%\)/);
    assert.doesNotMatch(source, /items\.map\(\(\[label, value\]/);
    assert.match(pimCanvasSource, /pimVisibleNodes/);
    assert.match(source, /pimCreateInteractionState/);
    assert.match(source, /pimToggleNodeState/);
    assert.match(source, /pimExpandedNodeIds/);
    assert.match(read('app/screens/arMode.js'), /pimToggleNodeState/);
    assert.match(pimViewSource, /data-pim-node/);
    assert.match(source, /pimHoneycombTargetAtPercent/);
    assert.match(source, /fixedPimPanelMatrix/);
    assert.match(source, /pimSpatialPoseAboveAnchor/);
    assert.match(source, /function plantInformationPose/);
    assert.match(source, /advanceAfterDemoProfileInteraction\(record\)/);
    assert.match(immersiveSelectHandler, /selectDemoPlantAtPointer\(\)/);
    assert.match(immersiveSelectHandler, /selectDemoProfileCell\(\)[\s\S]*selectDemoPlantAtPointer\(\)/);
    assert.match(source, /if \(actionTarget\?\.demoType === 'note'\) return;[\s\S]*beginControllerDemoHold\(\)/);
    assert.doesNotMatch(source, /const currentIndex = keys\.indexOf\(record\.demoActiveBranch\)/);
    const sessionSelectStart = source.indexOf("session.addEventListener('select'");
    const sessionSelect = source.slice(sessionSelectStart, source.indexOf('const draw =', sessionSelectStart));
    assert.doesNotMatch(sessionSelect, /toggleDemoPlantProfile/);
    assert.match(styles, /\.plant-knowledge-core/);
    assert.match(styles, /\.plant-knowledge-cell/);
    assert.doesNotMatch(styles, /\.plant-knowledge-cell:is\(:hover, :focus-visible, \.is-open\)/);
    assert.match(pimViewSource, /source\.title/);
    assert.match(source, /PIGEON_PEA_AR_KNOWLEDGE/);
    assert.match(styles, /\.plant-knowledge-map\[data-pim-layout="honeycomb"\] \.plant-knowledge-cell b/);
    assert.match(source, /function renderSimulatedTotem/);
    assert.match(source, /tryit-sim-totem-branches/);
    assert.match(source, /function drawTotemKnowledgeTexture/);
    assert.match(styles, /\.tryit-sim-totem-pillar/);
    assert.match(styles, /\.tryit-sim-totem-pillar::before[\s\S]*clip-path:polygon/);
    assert.match(styles, /\.tryit-sim-totem-pillar::after[\s\S]*clip-path:polygon/);
    assert.match(source, /drawSpatialPrism\(gl, prismRenderer, view/);
    assert.match(source, /const bubbles = \(content\?\.bubbles \|\| content\?\.lines \|\| \[\]\)\.filter\(Boolean\)\.slice\(0, 5\)/);
    assert.doesNotMatch(source, /CITRUS · HERBS · POLLINATORS/);
    assert.match(styles, /\.tryit-sim-totem-card-5/);
    assert.match(styles, /border-radius: 32% 23% 35% 25% \/ 25% 34% 24% 37%/);
    assert.match(styles, /\.tryit-sim-totem-card::after/);
    assert.match(source, /ctx\.arc\(attachmentX, attachmentY, 6/);
    assert.match(pimCanvasSource, /context\.strokeText\(line, x, y\)/);
    assert.match(pimCanvasSource, /drawOutlinedLines\(context, coreLines, center\.x/);
    assert.match(styles, /\.tryit-sim-marker-note:not\(\.is-expanded\)/);
    assert.match(source, /Point of Interest/);
    assert.match(source, /Garden plaque/);
    assert.doesNotMatch(source, /Give the Area a Totem/);
    assert.match(source, /function createDemoTotemExample\(\)/);
    assert.match(source, /Each Totem represents an Area/);
    assert.match(source, /tutorialStage: 'totem'/);
    assert.match(source, /const DEMO_NOTE_IMMERSIVE_SCALE = Object\.freeze\(\{ x: 4\.14, y: 3\.8 \}\)/);
    assert.match(source, /const noteScale = noteSign \? DEMO_NOTE_IMMERSIVE_SCALE : null/);
    assert.match(styles, /\.tryit-sim-marker-note:not\(\.is-expanded\) \{ width:min\(78vw,248px\); height:102px;/);
    assert.match(source, /groundBaseY = demoGroundBaseY\(hitMatrix, viewerMatrix, groundYEstimate\)/);
    assert.match(source, /y: groundBaseY \+ DEMO_TOTEM_HALF_HEIGHT_METRES/);
    assert.match(source, /type: type === 'note' \? 'note' : 'plant'/);
    assert.match(source, /demoOrbColor: type === 'plant' \? 'pigeonPea'/);
    assert.match(source, /demoOrbShape: type === 'plant' \? 'orb'/);
    assert.doesNotMatch(source, /compact \? record\.position : \{ \.\.\.record\.position, y: record\.position\.y \+ 0\.72 \}/);
    assert.match(source, /function guideNoteConversion\(record\) \{[\s\S]*pointer\?\.setAttribute\('hidden', ''\);[\s\S]*pointer\?\.classList\.remove\('is-revealing', 'is-ready', 'is-pressed'\)/);
    assert.match(styles, /\.tryit-guided-choice/);
});

test('Creator project AR is a no-code placement session without a dashboard overlay', () => {
    const source = read('app/screens/arMode.js');
    const webxrSource = read('app/services/webxrSession.js');
    const styles = read('app/style.css');
    assert.doesNotMatch(source, /drawDashboard|captureDashboardSnapshot|dashboardVisible|Grab dashboard/);
    assert.match(source, /if \(!navigator\.xr \|\| !window\.isSecureContext\) \{/);
    assert.match(source, /__nxrArStartError/);
    assert.match(source, /requestImmersiveArSession\(overlayRoot, \{ requireDomOverlay: false, preferDomOverlay: questBrowser \}\)/);
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
    assert.match(source, /openArAreaChooser/);
    assert.match(source, /Choose an Area for this Totem/);
    assert.match(styles, /body\.creator-ar-session-active #app/);
    assert.match(styles, /\.creator-ar-taskbar/);
    assert.match(styles, /body\.creator-ar-quest-headset \.creator-ar-quest-link-bar/);
    assert.doesNotMatch(styles, /body\.creator-ar-immersive-vr \.creator-ar-quest-link-bar/);
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
    assert.match(arSource, /requestImmersiveArSession\(overlayRoot, \{ requireDomOverlay: false, preferDomOverlay: questBrowser \}\)/);
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
    assert.match(dashboardSource, /projectBreadcrumbMarkup\(context\.project, context\.area, totemName\)/);
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
    assert.match(dashboardSource, /openArAction: `window\.openProjectArMode\('\$\{encoded\(project\.id\)\}','\$\{encoded\(activeAreaId\)\}'\)`/);
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
    assert.match(arSource, /readyPlacementType = '';\s*pendingPlacementAppearance = null;\s*pendingPlacementDetails = null;\s*updateReadyPlacementControl\(\);\s*setPlacementStatus\(`Placing/);
    assert.match(mainSource, /window\.startArMode = \(projectId, areaId, checkpointId, initialPlacementType = '', existingMarkerId = '', returnContext = '', preferredSiteId = ''\)/);
    assert.match(mainSource, /const decodeArArgument = value =>/);
    assert.match(mainSource, /window\.openProjectArMode = async \(projectId, areaId = ''\)/);
    const projectArEntry = mainSource.slice(mainSource.indexOf('window.openProjectArMode'), mainSource.indexOf('window.openCreatorArCheckpointSetup'));
    assert.doesNotMatch(projectArEntry, /renderArAreaPicker/);
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
    const providerService = read('app/services/plantSearchProviders.js');
    const fieldGuide = read('app/screens/fieldGuide.js');
    const alaSearch = read('app/services/alaPlantSearch.js');
    assert.match(fieldMarker, />Saved records<\/button>/);
    assert.match(fieldMarker, /Search plant database/);
    assert.match(fieldMarker, /Search plant database/);
    assert.match(fieldMarker, /searchGlobalPlants\(query\)/);
    assert.match(fieldMarker, /externalSources: selectedGlobalPlant/);
    assert.match(plantService, /searchPlantSources/);
    assert.match(providerService, /searchAlaPlants/);
    assert.match(providerService, /searchGbifPlants/);
    assert.match(providerService, /searchINaturalistPlants/);
    assert.match(fieldGuide, /Open profile/);
    assert.match(fieldGuide, /data-global-extract-field/);
    assert.match(fieldGuide, /Review allocation/);
    assert.match(fieldGuide, /PIM_ALLOCATION_CATEGORIES/);
    assert.match(fieldGuide, /Smart suggestion/);
    assert.match(fieldGuide, /data-global-allocation/);
    assert.match(fieldGuide, /Convert selected content/);
    assert.match(fieldGuide, /openGlobalPlantProfile/);
    assert.match(fieldGuide, /openGlobalPlantProfile\(renderTarget \|\| app/);
    assert.match(fieldGuide, /field-guide-import-progress/);
    assert.match(fieldGuide, /Select recommended/);
    assert.match(fieldGuide, /Technical source data/);
    assert.match(fieldGuide, /data-global-group-category/);
    assert.match(fieldGuide, /Individual override/);
    assert.match(fieldGuide, /data-global-remove-fact/);
    assert.match(fieldMarker, /Step 2 of 2/);
    assert.match(fieldMarker, /reviewGlobalPlantImport/);
    assert.match(fieldMarker, /data-global-setup-category/);
    assert.match(fieldMarker, /data-global-setup-group-category/);
    assert.match(fieldMarker, /field-guide-import-advanced/);
    assert.match(fieldMarker, /field-guide-import-confirmation/);
    assert.doesNotMatch(fieldMarker, /data-global-setup-category=\"\$\{escapeHtml\(fact\.key\)\}\"/);
    assert.match(fieldMarker, /stagePimImport/);
    assert.match(fieldMarker, /Content selected for NLXR/);
    assert.match(alaSearch, /api\.ala\.org\.au\/species\/search\/auto/);
    assert.match(alaSearch, /encodeURIComponent/);
    assert.match(alaSearch, /AbortController/);
    assert.match(alaSearch, /autoCompleteList/);
    assert.match(alaSearch, /sourceLabel: ALA_SOURCE_LABEL/);
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
    assert.match(arSource, /totemStyle === 'organic'/);
    assert.match(arSource, /totemStyle === 'flat-disc'/);
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
    assert.match(arSource, /function plantTagGeometry\(position, marker, groundY = currentGroundY\(\)\)/);
    assert.match(arSource, /plateBaseY = Math\.max\(floorY \+ dimensions\.stemHeight, requestedY\)/);
    assert.match(arSource, /halfHeight: geometry\.stemHeight \* \.5/);
    assert.match(arSource, /\{ \.\.\.position, y: geometry\.groundY \}/);
    assert.match(arSource, /drawPlantTagStem\(view, record\.position, record\.marker/);
    assert.match(arSource, /plantTagPlatePosition\(record\.position, record\.marker\)/);
    assert.match(arSource, /Totem Marker/);
    assert.match(arSource, /trail entrance gateway/);
    assert.match(read('app/services/spatialTriangleRenderer.js'), /correctly wound rectangular sides/);
    assert.equal(createTrianglePrismGeometry().length, 144);
});

test('Creator Plants use a compact encyclopedia file and collapsible AR information', () => {
    const arSource = read('app/screens/arMode.js');
    const pigeonSource = read('app/services/pigeonPeaExample.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const styles = read('app/style.css');
    assert.match(arSource, /function hasPlantProfile\(record\)/);
    assert.match(arSource, /resolvePlantPim\(profile,/);
    assert.match(arSource, /pimToArKnowledge\(document\)/);
    assert.doesNotMatch(arSource, /profile\.pim_categories/);
    assert.match(pigeonSource, /pimToArKnowledge\(PIGEON_PEA_PIM\)/);
    assert.match(arSource, /const opening = !record\.profileExpanded/);
    assert.match(arSource, /sessionMarkers\.forEach\(candidate => \{[\s\S]*candidate\.profileExpanded = false/);
    assert.match(arSource, /setPlacementStatus\(''\)/);
    assert.match(arSource, /creator-ar-plant-profile/);
    assert.match(arSource, /function positionCreatorPlantProfile\(record, markerX, markerY\)/);
    assert.match(arSource, /const panel = pimSpatialPanel\(pose/);
    assert.match(arSource, /projectWorldPoint\(latestView, panel\.center\)/);
    assert.match(arSource, /plantInformationMeshSurfaceLayout\(viewportWidth, viewportHeight, anchorX, anchorY, \{/);
    assert.match(arSource, /visualViewport/);
    assert.match(arSource, /bottomInset/);
    assert.match(arSource, /plantInformationMeshSurfaceLayout/);
    assert.doesNotMatch(arSource, /tetherEndY|data-ar-plant-tether/);
    assert.match(arSource, /creator-ar-plant-profile is-anchored-profile/);
    assert.match(arSource, /return `\$\{markerLayer\}\$\{profileLayer\}`/);
    assert.match(arSource, /scientificName: profile\.scientific_name \|\| ''/);
    assert.doesNotMatch(arSource, /--profile-accent:\$\{markerAppearanceColor\(record\.marker\)\}/);
    assert.doesNotMatch(arSource, /creator-ar-plant-tether[\s\S]*<path/);
    assert.match(arSource, /const wasOpen = creatorPimState\(record\)\.expandedNodeIds\.has\(nodePath\)/);
    assert.match(arSource, /record\.pimSelectedNodeId = state\.selectedNodeId/);
    assert.match(arSource, /record\.pimExpandedNodeIds = pimExpandedNodeIds\(state\)/);
    assert.match(arSource, /drawSpatialPlantProfiles\(view\)/);
    assert.match(arSource, /spatialPimTargetAtAim/);
    assert.match(arSource, /createPlantInformationHoneycombTexture/);
    assert.match(arSource, /pim_pose/);
    assert.match(arSource, /pimSpatialPoseFromViewer/);
    assert.match(arSource, /pimSpatialPoseAboveAnchor/);
    assert.match(arSource, /pimSpatialPoseFromStored/);
    assert.match(arSource, /coordinate_space: 'marker-local'/);
    assert.match(arSource, /spatialAnchorForRecord/);
    assert.doesNotMatch(arSource, /data-ar-pim-recenter/);
    assert.match(arSource, /loadPlantProfile\(operation\.projectId/);
    assert.match(styles, /@keyframes creator-ar-profile-arrive/);
    assert.match(styles, /\.creator-ar-marker-hit-target\.has-plant-profile/);
    assert.match(styles, /\.plant-virtual-tag-card/);
    assert.doesNotMatch(styles, /\.creator-ar-plant-tether path/);
    assert.match(styles, /\.plant-knowledge-map\[data-pim-layout="honeycomb"\]/);
    assert.match(styles, /--pim-cell-size: clamp\(76px, 14vw, 132px\)/);
    assert.match(styles, /overflow-wrap: normal;\s*word-break: normal/);
    assert.doesNotMatch(styles, /\.creator-ar-plant-profile \.plant-knowledge-map\s*\{/);
    assert.doesNotMatch(styles, /body\[data-project-theme\] \.creator-ar-plant-profile :is\(\.plant-knowledge-core,\.plant-knowledge-cell\)[\s\S]*background:transparent !important/);
    assert.match(styles, /\.creator-ar-quest-headset \.creator-ar-plant-profile/);
    assert.match(styles, /\.plant-knowledge-map\[data-pim-layout="honeycomb"\]/);
    assert.match(styles, /\.creator-ar-marker-hit-target-plant\.is-info-open \.creator-ar-spatial-name \{[^}]*display:none/);
    assert.doesNotMatch(styles, /\.creator-ar-open-web-profile/);
    assert.doesNotMatch(styles, /body\[data-project-theme\] \.creator-ar-plant-profile[\s\S]{0,180}background:rgba\(15,48,32,.94\)/);
    assert.match(dashboardSource, /plant-encyclopedia-card/);
    assert.match(dashboardSource, /data-spm-info/);
    assert.match(dashboardSource, /ACTIVATE INFO MESH/);
    assert.match(dashboardSource, /plant-spm-toggle-line/);
    assert.match(dashboardSource, /mountPlantInformationWeb/);
    assert.match(dashboardSource, /data-plant-pim-web-mount/);
    assert.match(dashboardSource, /pim_document: activePimDocument/);
    assert.match(dashboardSource, /projectEntrySpmEnabled/);
    assert.match(dashboardSource, /projectEntryClimate/);
    assert.match(dashboardSource, /spm_enabled: spmEnabled/);
    assert.ok(dashboardSource.indexOf('projectEntryOrbSize') < dashboardSource.indexOf('projectEntrySpmEnabled'));
    assert.match(arSource, /profile\.spm_enabled === true \|\| profile\.profile_enabled === true/);
    assert.doesNotMatch(dashboardSource, /Info Mesh overview|Advanced identity|Growing knowledge|Origin &amp; story|projectEntryRelationships/);
    assert.match(dashboardSource, /Plant Information Mesh/);
    assert.match(dashboardSource, /Info Mesh opens an expandable information diagram/);
    assert.match(dashboardSource, /showSearch: false/);
    assert.match(dashboardSource, /if \(plantProfileFormPresent\)/);
    assert.match(arSource, /focusedRecord\.profileExpanded = focusedProfileView/);
    assert.match(arSource, /sessionMarkers = \[focusedRecord\]/);
    assert.match(dashboardSource, /projectEntryVirtualTag/);
    assert.match(dashboardSource, /Make this Plant a Plant Live Tag/);
    assert.match(dashboardSource, /virtual_tag_enabled/);
    assert.match(dashboardSource, /plant-card-hero/);
    assert.doesNotMatch(dashboardSource, /PLANT PROFILE MODE/);
    assert.match(dashboardSource, /function plantProfileStatsMarkup\(project, entry, profile, editableColor = false\)/);
    assert.match(dashboardSource, /id="projectEntryOrbColor" type="color"/);
    assert.match(dashboardSource, /Requires Plant Live Tag to be enabled/);
    assert.match(dashboardSource, /plant-profile-header/);
    assert.match(dashboardSource, /plant-profile-ar-button/);
    assert.doesNotMatch(dashboardSource, /plantProfileReady && !returnToAr \? `<section class="spatial-focus-panel"/);
});

test('an open AR Plant profile has no attached Web Mode card', () => {
    const arSource = read('app/screens/arMode.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const styles = read('app/style.css');
    assert.doesNotMatch(arSource, /data-ar-open-web-profile/);
    assert.doesNotMatch(arSource, /OPEN IN WEB MODE/);
    assert.doesNotMatch(arSource, /data-ar-context-web/);
    assert.match(arSource, /: `web-marker:\$\{record\.marker\.id\}`/);
    assert.match(dashboardSource, /const returnArLabel = 'AR'/);
    assert.match(dashboardSource, /const returnArAction = returnToAr/);
    assert.match(dashboardSource, /const arHandoff = returnToAr/);
    assert.match(dashboardSource, /const entryHeader = plant/);
    assert.doesNotMatch(dashboardSource, /plantProfileReady && !returnToAr \?/);
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
    assert.match(styles, /\.creator-ar-location-note-board\.creator-ar-totem-balloon \{[\s\S]*width:min\(58vw,320px\)[\s\S]*border-radius:28px 28px 28px 12px !important/);
    assert.match(styles, /\.creator-ar-totem-stick \{ width:2px/);
    assert.match(styles, /\.creator-ar-totem-attachment \{ width:10px; height:10px/);
    assert.doesNotMatch(arSource, /<small>TOTEM MARKER<\/small>/);
    assert.doesNotMatch(arSource, /<strong>\$\{escapeHtml\(board\.title\)\}<\/strong>/);
    assert.match(arSource, /const isGeneratedWelcome = \/\^welcome to/);
    assert.match(arSource, /positionCreatorTotemInformation\(record, x, y, view\)/);
    assert.match(arSource, /const topWorld = \{ \.\.\.ground, y: ground\.y \+ \.08 \* markerSizeFactor\(record\.marker\) \+ halfHeight \* 2 \}/);
    assert.match(arSource, /const markerCaption = record\.marker\.type === 'area_checkpoint'/);
    assert.match(dashboardSource, /description: ''/);
    assert.match(dashboardSource, /ANCHOR TOTEM/);
    assert.match(dashboardSource, />Link Totem Marker<\/label>/);
    assert.match(dashboardSource, /physical marker installed at its real-world position/);
    assert.doesNotMatch(dashboardSource, /Totem QR code|QR label installed at its real-world position|QR or physical link/);
    assert.match(dashboardSource, /target_area_id/);
    assert.match(dashboardSource, /site-map-totem-links/);
    assert.match(dashboardSource, /Main welcome text/);
    assert.match(dashboardSource, /areaCheckpointColor/);
    assert.doesNotMatch(dashboardSource, /aria-label="\$\{isPlaced \? 'Open Totem in AR' : 'Place Totem in AR'\}"/);
    assert.doesNotMatch(dashboardSource, /encoded\(isPlaced \? existing\?\.marker\.id \|\| '' : ''\)/);
    assert.match(arSource, /data-ar-recenter-prompt/);
    assert.match(arSource, /RECENTER AREA/);
    assert.match(arSource, /data-ar-totem-information/);
    assert.match(arSource, /creator-ar-location-stick creator-ar-totem-stick/);
    assert.match(arSource, /creator-ar-location-note-board creator-ar-totem-balloon/);
    assert.match(arSource, /function positionCreatorTotemInformation\(record, markerX, markerY, view = latestView\)/);
    assert.match(arSource, /const attachmentPoint = view \? projectWorldPoint\(view, topWorld\) : null/);
    assert.match(arSource, /const boardFitsViewport = boardX >= boardWidth \/ 2 \+ 12/);
    assert.match(arSource, /const signX = attachmentPoint\.x \+ direction \* \(signWidth \/ 2 \+ signGap \+ row \* 8\)/);
    assert.doesNotMatch(arSource, /Math\.max\(signWidth \/ 2 \+ 10, Math\.min\(window\.innerWidth - signWidth \/ 2 - 10/);
    assert.match(arSource, /alignAreaToCheckpoint\(areaRecords, totem\.marker\.id, origin\)/);
    assert.doesNotMatch(arSource, /Checkpoint linked/);
    assert.match(dashboardSource, /Back to Area/);
    assert.match(dashboardSource, /Back to Dashboard/);
    assert.match(dashboardSource, /Area dashboard/);
    assert.match(dashboardSource, /data-edit-area-type/);
    assert.match(dashboardSource, /id="areaType"/);
    assert.match(dashboardSource, /context\.project\.name/);
    assert.match(dashboardSource, /<details class="latest-entries-section area-content-section" open>/);
    assert.doesNotMatch(dashboardSource, /Precise location/);
    assert.doesNotMatch(dashboardSource, />Open profile</);
    assert.doesNotMatch(fieldGuideSource, /Open &amp; manage/);
    assert.match(fieldGuideSource, /field-guide-fireplace-symbol/);
    assert.match(arSource, /web-totem:/);
    assert.match(arSource, /window\.renderAreaCheckpointForm/);
    assert.match(arSource, /const selectedRecord = contextToolbarRecord && sessionMarkers\.includes\(contextToolbarRecord\)/);
    assert.match(arSource, /selectedReturnContext = selectedRecord\?\.marker\?\.type === 'area_checkpoint'/);
    assert.match(arSource, /return renderIntoWindow\(renderAreaCheckpointForm/);
    assert.match(arSource, /void route\(selectedRecord \? 'selected' : 'area'\)/);
    assert.match(arSource, /is-selected/);
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
    assert.match(fieldGuideSource, /field-guide-management-row/);
    assert.match(fieldGuideSource, /Coming later/);
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
    assert.match(dashboardSource, /const returnArLabel = 'AR'/);
    assert.match(dashboardSource, /note-record-editor/);
    assert.match(dashboardSource, /id="projectEntryNoteSurface"/);
    assert.match(dashboardSource, /entry\.marker\.type === 'note' \? 'Title' : 'Rename'/);
    assert.match(dashboardSource, /entry\.marker\.type === 'note' \? 'Information' : 'Description'/);
    assert.match(dashboardSource, /Transparent with color outline/);
    assert.match(dashboardSource, /surface: noteSurface === 'outline' \? 'outline' : 'filled'/);
    assert.match(dashboardSource, /projectEntryNoteOpacity/);
    assert.match(arSource, /is-note-outline/);
    assert.match(arSource, /placementEditorRecord\(placementType\)/);
    assert.match(arSource, /pendingPlacementDetails/);
    assert.match(arSource, /name="markerOpacity"/);
    assert.match(arSource, /opacity: Number\(form\.elements\.markerOpacity/);
    assert.match(arSource, /Cycle \$\{readyPlacementLabel\(type\)\} opacity/);
    assert.match(demoSource, /function createDemoNoteTexture\(record\)/);
    assert.match(demoSource, /label\.width = 1024;[\s\S]*label\.height = 384/);
    assert.match(demoSource, /record\.demoExpanded = false/);
    assert.match(demoSource, /cycleDemoNoteTemplate\(record\)/);
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

test('Totem profiles expose three visual styles and keep the selected style in AR', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    const arSource = read('app/screens/arMode.js');
    const styles = read('app/style.css');
    assert.equal(normalizeTotemStyle(), 'basic');
    assert.equal(normalizeTotemStyle({ appearance: { totemStyle: 'organic' } }), 'organic');
    assert.equal(totemStylePreset('flat-disc').label, 'Disk Totem');
    assert.match(dashboardSource, /data-totem-style/);
    assert.match(dashboardSource, /totemStyle/);
    assert.match(arSource, /normalizeTotemStyle\(record\.marker\)/);
    assert.match(arSource, /drawSpatialPrism\(gl, prismRenderer/);
    assert.match(arSource, /const totemStyle = normalizeTotemStyle\(record\.marker\)/);
    assert.match(styles, /\.totem-style-presets/);
    assert.match(styles, /\.totem-profile-visual\.is-style-organic/);
    assert.match(styles, /\.totem-profile-visual\.is-style-flat-disc/);
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

test('editing a Plant from AR keeps the compact identity controls and shared Info Mesh path', () => {
    const arSource = read('app/screens/arMode.js');
    const dashboardSource = read('app/screens/projectDashboard.js');
    const styles = read('app/style.css');
    assert.doesNotMatch(arSource, /data-ar-context-web/);
    assert.doesNotMatch(arSource, /data-ar-context-close/);
    assert.match(dashboardSource, /const quickArPlantEdit = returnToAr && plant/);
    assert.match(dashboardSource, /class="plant-ar-quick-editor"/);
    assert.doesNotMatch(dashboardSource, /The full Plant Profile remains in the Web Hub/);
    assert.match(dashboardSource, /data-plant-quick-tone/);
    assert.match(dashboardSource, /family: existingPlantProfile\.family/);
    assert.match(dashboardSource, /orb_size: fieldValue\('projectEntryOrbSize'/);
    assert.match(dashboardSource, /manageQrAnchor/);
    assert.match(dashboardSource, /const webReturnAction = plant/);
    assert.match(dashboardSource, /window\.renderProjectHome\('\$\{encoded\(project\.id\)\}'\)/);
    assert.match(dashboardSource, /entryIsHome\s*\n\s*\? `window\.renderProjectDashboard/);
    assert.match(dashboardSource, /project-entry-back-button/);
    assert.match(dashboardSource, /plant-profile-action-row/);
    assert.match(styles, /\.plant-profile-action-row \{ position: sticky; bottom: 10px; z-index: 18; display: grid; grid-template-columns: repeat\(3/);
    assert.match(dashboardSource, /textContent = returnToAr \? 'BACK TO AR' : 'BACK'/);
    assert.match(styles, /\.plant-ar-quick-fields/);
    assert.match(styles, /\.plant-ar-quick-tones/);
});

test('Plant navigation stays on one profile and receives a project-linked ID', () => {
    const dashboardSource = read('app/screens/projectDashboard.js');
    const fieldGuideSource = read('app/screens/fieldGuide.js');
    const serverSource = read('tools/persistence-server.mjs');
    const styles = read('app/style.css');
    assert.match(fieldGuideSource, /currentGuide\.creator && plant\.markerId/);
    assert.match(fieldGuideSource, /window\.openProjectEntry\([\s\S]*'webhub'/);
    assert.match(dashboardSource, /window\.openProjectEntry\('\$\{encoded\(context\.project\.id\)\}', '\$\{encoded\(marker\.id\)\}', false, 'area-dashboard'\)/);
    assert.match(dashboardSource, /const entryHeader = plant/);
    assert.match(dashboardSource, /plant-profile-location/);
    assert.match(dashboardSource, /plantProfileId\(project, entry\.marker\)/);
    assert.match(styles, /\.plant-profile-ar-button/);
    assert.match(serverSource, /function nextProjectPlantCode\(projectId\)/);
    assert.match(serverSource, /const plantCode = type === 'plant' \? nextProjectPlantCode/);
    assert.match(serverSource, /plant_code: plantCode/);
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

test('Creator phone AR uses the Demo transparent PIM surface and short demo holds', () => {
    const creatorSource = read('app/screens/arMode.js');
    const demoSource = read('app/screens/temporaryArDemo.js');
    const canvasSource = read('app/services/plantInformationMeshCanvas.js');
    const styles = read('app/style.css');
    assert.match(creatorSource, /function usesSpatialPimRenderer\(\)/);
    assert.match(creatorSource, /if \(!usesSpatialPimRenderer\(\) \|\| !homeSignProgram/);
    assert.match(creatorSource, /is-spatial-pim-hit-layer/);
    assert.match(creatorSource, /pimHoneycombTextureSize/);
    assert.match(demoSource, /function introWorldAnchorFromViewer\(matrix\)/);
    assert.match(demoSource, /introWorldAnchor \|\|= introWorldAnchorFromViewer\(viewerMatrix\)/);
    assert.match(demoSource, /duration: DEMO_PLANT_ORB_HOLD_DELAY_MS/);
    assert.match(styles, /\.creator-ar-overlay \{[^}]*overflow: visible;[^}]*contain: none/);
    assert.match(styles, /\.creator-ar-plant-profile\.is-spatial-pim-hit-layer \{[\s\S]*pointer-events: auto/);
    assert.match(canvasSource, /export function pimHoneycombTextureSize/);
    assert.match(canvasSource, /PIM_TEXTURE_RENDER_PADDING/);
});
