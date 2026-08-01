// Future-ready spatial records for NourishlandXR.
//
// These factories deliberately do not assume a particular AR SDK. Existing
// marker IDs and legacy fields remain untouched; raw and corrected spatial
// values are kept as separate fields so later adapters can improve a capture
// without destroying the original observation.

export const SPATIAL_DATA_VERSION = 1;

export const LOCAL_METRIC_COORDINATE_SYSTEM = Object.freeze({
    type: 'local-metric',
    units: 'metres',
    axisOrder: 'x,y,z',
    originTotemMarkerId: '',
    geographicReferenceSystem: '',
    georeferencingTransformation: null
});

export const SPATIAL_DEVICE_TYPES = Object.freeze([
    'phone-webxr',
    'phone-native-ar',
    'quest-6dof',
    'android-xr',
    'xreal-aura',
    'gis-export'
]);

export const SPATIAL_CAPTURE_METHODS = Object.freeze([
    'webxr',
    'native-ar',
    '6dof',
    'future-adapter'
]);

export const SPATIAL_TRACKING_CONFIDENCE = Object.freeze(['low', 'medium', 'high']);
export const SPATIAL_FEATURE_TYPES = Object.freeze(['Point', 'LineString', 'Polygon']);

const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();

export function createCoordinateSystem(overrides = {}) {
    return {
        ...clone(LOCAL_METRIC_COORDINATE_SYSTEM),
        ...clone(overrides),
        units: 'metres',
        type: 'local-metric'
    };
}

export function createTotemMarker(overrides = {}) {
    return {
        spatialDataVersion: SPATIAL_DATA_VERSION,
        id: '',
        projectId: '',
        areaId: '',
        markerType: 'totem-marker',
        markerCode: '',
        physicalPrintedSizeMm: null,
        localPosition: null,
        orientation: null,
        connectedTotemMarkerIds: [],
        knownDistancesMetres: [],
        alignmentStatus: 'unverified',
        ...clone(overrides),
        markerType: 'totem-marker',
        connectedTotemMarkerIds: Array.isArray(overrides.connectedTotemMarkerIds) ? [...overrides.connectedTotemMarkerIds] : [],
        knownDistancesMetres: Array.isArray(overrides.knownDistancesMetres) ? [...overrides.knownDistancesMetres] : []
    };
}

export function createPlantLiveTag(overrides = {}) {
    return {
        spatialDataVersion: SPATIAL_DATA_VERSION,
        id: '',
        projectId: '',
        plantId: '',
        plantInstanceId: '',
        tagType: 'plant-live-tag',
        tagCode: '',
        destination: '',
        areaId: '',
        totemMarkerId: '',
        localPosition: null,
        ...clone(overrides),
        tagType: 'plant-live-tag'
    };
}

export function createSpatialCaptureSession(overrides = {}) {
    return {
        spatialDataVersion: SPATIAL_DATA_VERSION,
        id: '',
        projectId: '',
        deviceType: 'phone-webxr',
        captureMethod: 'webxr',
        startingTotemMarkerId: '',
        endingTotemMarkerId: '',
        startedAt: '',
        endedAt: '',
        trackingConfidence: 'low',
        rawRecordedPath: [],
        correctedPath: [],
        knownPhysicalDistanceMetres: null,
        alignmentCorrections: [],
        warnings: [],
        notes: '',
        ...clone(overrides),
        trackingConfidence: SPATIAL_TRACKING_CONFIDENCE.includes(overrides.trackingConfidence) ? overrides.trackingConfidence : 'low',
        rawRecordedPath: Array.isArray(overrides.rawRecordedPath) ? clone(overrides.rawRecordedPath) : [],
        correctedPath: Array.isArray(overrides.correctedPath) ? clone(overrides.correctedPath) : []
    };
}

export function createSpatialFeature(overrides = {}) {
    const geometryType = SPATIAL_FEATURE_TYPES.includes(overrides.geometry?.type) ? overrides.geometry.type : 'Point';
    const geometry = clone(overrides.geometry) || { type: geometryType, coordinates: [] };
    geometry.type = geometryType;
    return {
        spatialDataVersion: SPATIAL_DATA_VERSION,
        id: '',
        projectId: '',
        areaId: '',
        featureType: 'feature',
        geometry,
        rawGeometry: clone(overrides.rawGeometry) || clone(geometry),
        correctedGeometry: clone(overrides.correctedGeometry) || null,
        properties: {},
        ...clone(overrides),
        geometry,
        rawGeometry: clone(overrides.rawGeometry) || clone(geometry),
        correctedGeometry: clone(overrides.correctedGeometry) || null
    };
}

export function createProjectSpatialData(overrides = {}) {
    return {
        spatialDataVersion: SPATIAL_DATA_VERSION,
        coordinateSystem: createCoordinateSystem(overrides.coordinateSystem),
        totemMarkers: Array.isArray(overrides.totemMarkers) ? clone(overrides.totemMarkers) : [],
        plantLiveTags: Array.isArray(overrides.plantLiveTags) ? clone(overrides.plantLiveTags) : [],
        captureSessions: Array.isArray(overrides.captureSessions) ? clone(overrides.captureSessions) : [],
        features: Array.isArray(overrides.features) ? clone(overrides.features) : []
    };
}

export function normalizeSpatialRecord(record = {}) {
    const normalized = clone(record) || {};
    normalized.spatialDataVersion = Number(normalized.spatialDataVersion) || SPATIAL_DATA_VERSION;
    // Never collapse raw and corrected values: both are useful when checking
    // drift and applying a future Totem alignment correction.
    if (normalized.rawGeometry && !normalized.correctedGeometry) normalized.correctedGeometry = null;
    if (normalized.rawRecordedPath && !normalized.correctedPath) normalized.correctedPath = [];
    return normalized;
}

export function createSpatialCaptureSessionNow(overrides = {}) {
    return createSpatialCaptureSession({ startedAt: nowIso(), ...overrides });
}
