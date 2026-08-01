// Hardware adapter boundary. Implementations can be added later without
// changing the project-level spatial record format.

import { SPATIAL_CAPTURE_METHODS, SPATIAL_DEVICE_TYPES } from './spatialDataModel.js';

export const SPATIAL_DEVICE_ADAPTERS = Object.freeze([
    { id: 'phone-webxr', label: 'Phone WebXR', deviceType: 'phone-webxr', captureMethod: 'webxr', status: 'operational' },
    { id: 'phone-native-ar', label: 'Native phone AR', deviceType: 'phone-native-ar', captureMethod: 'native-ar', status: 'adapter-boundary' },
    { id: 'quest-6dof', label: 'Quest 3 / 6DoF WebXR', deviceType: 'quest-6dof', captureMethod: '6dof', status: 'operational' },
    { id: 'android-xr', label: 'Android XR glasses', deviceType: 'android-xr', captureMethod: 'future-adapter', status: 'adapter-boundary' },
    { id: 'xreal-aura', label: 'XREAL AURA example', deviceType: 'xreal-aura', captureMethod: 'future-adapter', status: 'example-only' },
    { id: 'gis-export', label: 'GIS Export', deviceType: 'gis-export', captureMethod: 'future-adapter', status: 'preview-only' }
]);

export function spatialDeviceAdapter(id) {
    return SPATIAL_DEVICE_ADAPTERS.find(adapter => adapter.id === id) || null;
}

export function isSupportedSpatialAdapter(adapter) {
    return Boolean(adapter)
        && SPATIAL_DEVICE_TYPES.includes(adapter.deviceType)
        && SPATIAL_CAPTURE_METHODS.includes(adapter.captureMethod);
}

export const SPATIAL_CAPTURE_FLOW = Object.freeze([
    'scan-starting-totem-marker',
    'set-local-origin-and-orientation',
    'record-approximate-path',
    'mark-spatial-features',
    'scan-next-totem-marker',
    'compare-endpoint',
    'correct-drift-when-supported',
    'save-raw-and-corrected-records',
    'prepare-gis-export'
]);
