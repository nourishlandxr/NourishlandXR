import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createCoordinateSystem,
    createPlantLiveTag,
    createProjectSpatialData,
    createSpatialCaptureSession,
    createSpatialFeature,
    createTotemMarker,
    normalizeSpatialRecord
} from '../app/services/spatialDataModel.js';
import { isSupportedSpatialAdapter, SPATIAL_CAPTURE_FLOW, SPATIAL_DEVICE_ADAPTERS } from '../app/services/spatialDeviceAdapters.js';
import { migrateLegacyTagRecord, NXR_TERMINOLOGY } from '../app/services/terminology.js';

test('spatial project records use a local metric coordinate system and preserve collections', () => {
    const project = createProjectSpatialData({ coordinateSystem: { originTotemMarkerId: 'home-totem' } });
    assert.equal(project.spatialDataVersion, 1);
    assert.equal(project.coordinateSystem.type, 'local-metric');
    assert.equal(project.coordinateSystem.units, 'metres');
    assert.equal(project.coordinateSystem.originTotemMarkerId, 'home-totem');
    assert.deepEqual(project.totemMarkers, []);
    assert.deepEqual(project.plantLiveTags, []);
});

test('Totem Markers and Plant Live Tags have distinct roles without changing IDs', () => {
    const totem = createTotemMarker({ id: 'area-1-totem', areaId: 'area-1', markerCode: 'NL-001' });
    const tag = createPlantLiveTag({ id: 'plant-1-tag', plantId: 'plant-1', totemMarkerId: totem.id });
    assert.equal(totem.markerType, 'totem-marker');
    assert.equal(tag.tagType, 'plant-live-tag');
    assert.equal(tag.totemMarkerId, 'area-1-totem');
});

test('capture sessions and features keep raw and corrected spatial values separate', () => {
    const session = createSpatialCaptureSession({ rawRecordedPath: [{ x: 1, y: 0, z: 2 }], correctedPath: [{ x: 1.2, y: 0, z: 2.1 }], trackingConfidence: 'medium' });
    const feature = createSpatialFeature({ geometry: { type: 'LineString', coordinates: [[0, 0, 0], [1, 0, 1]] }, correctedGeometry: { type: 'LineString', coordinates: [[0, 0, 0], [1.1, 0, 1.1]] } });
    assert.equal(session.trackingConfidence, 'medium');
    assert.notDeepEqual(session.rawRecordedPath, session.correctedPath);
    assert.equal(feature.geometry.type, 'LineString');
    assert.notDeepEqual(feature.rawGeometry, feature.correctedGeometry);
    assert.deepEqual(normalizeSpatialRecord({ rawGeometry: feature.rawGeometry }).correctedGeometry, null);
});

test('device adapters expose an operational boundary and a future capture flow', () => {
    assert.ok(SPATIAL_DEVICE_ADAPTERS.some(adapter => adapter.id === 'phone-webxr' && adapter.status === 'operational'));
    assert.ok(SPATIAL_DEVICE_ADAPTERS.some(adapter => adapter.id === 'quest-6dof' && adapter.status === 'adapter-boundary'));
    assert.ok(SPATIAL_DEVICE_ADAPTERS.some(adapter => adapter.id === 'gis-export' && adapter.status === 'preview-only'));
    assert.equal(isSupportedSpatialAdapter(SPATIAL_DEVICE_ADAPTERS[0]), true);
    assert.deepEqual(SPATIAL_CAPTURE_FLOW.slice(0, 3), ['scan-starting-totem-marker', 'set-local-origin-and-orientation', 'record-approximate-path']);
});

test('legacy tag mapping preserves IDs and relationships while updating public terminology', () => {
    const legacy = { id: 'plant-1', type: 'plant', virtual_tag_enabled: true, relationships: ['plant-2'] };
    const migrated = migrateLegacyTagRecord(legacy);
    assert.equal(migrated.id, legacy.id);
    assert.deepEqual(migrated.relationships, legacy.relationships);
    assert.equal(migrated.virtual_tag_enabled, true);
    assert.equal(migrated.tagRole, 'plant-live-tag');
    assert.equal(NXR_TERMINOLOGY.totemMarker, 'Totem Marker');
    assert.equal(NXR_TERMINOLOGY.plantLiveTag, 'Plant Live Tag');
});
