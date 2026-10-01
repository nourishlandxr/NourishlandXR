import { AR_EXPERIENCE_CONFIG } from '../../services/arExperienceConfig.js';
import { spatialPosition } from '../../services/spatialPlacement.js';
import { DEMO_SHARED_QUAD_SIZE, DEMO_STABLE_EYE_HEIGHT_METRES } from './demoConfig.js';

export function demoBillboardSurfaceSize(scaleX = 1, scaleY = 1) {
    return {
        width: Math.abs(Number(scaleX) || 0) * DEMO_SHARED_QUAD_SIZE.width,
        height: Math.abs(Number(scaleY) || 0) * DEMO_SHARED_QUAD_SIZE.height
    };
}

export function demoBillboardTextureLocalPoint(pixelX, pixelY, textureWidth, textureHeight) {
    const width = Number(textureWidth);
    const height = Number(textureHeight);
    if (!(width > 0) || !(height > 0)) return null;
    return {
        x: (Number(pixelX) / width - .5) * DEMO_SHARED_QUAD_SIZE.width,
        y: (.5 - Number(pixelY) / height) * DEMO_SHARED_QUAD_SIZE.height
    };
}

export function demoPointerScreenPoint(rect, viewportWidth = globalThis.innerWidth, viewportHeight = globalThis.innerHeight) {
    const width = Number(rect?.width);
    const height = Number(rect?.height);
    const hasVisibleRect = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
    return hasVisibleRect
        ? { x: Number(rect.left) + width / 2, y: Number(rect.top) + height / 2 }
        : { x: Number(viewportWidth) / 2, y: Number(viewportHeight) / 2 };
}

export function demoViewerPointerFallbackAllowed({ simulated = false, hasScreenInput = false, spatialInputSeen = false, headsetBrowser = false, mode = 'immersive-ar' } = {}) {
    if (simulated || hasScreenInput) return true;
    return !spatialInputSeen && !headsetBrowser && mode !== 'immersive-vr';
}

export function demoPlacementPosition(matrix, ray, origin = null, distanceMetres = AR_EXPERIENCE_CONFIG.placementDistanceMetres) {
    const base = origin || (matrix ? { x: matrix[12], y: matrix[13], z: matrix[14] } : null);
    if (!base) return null;
    if (!ray) return spatialPosition(null, matrix, 0);
    const distance = Math.max(.55, Math.min(4, Number(distanceMetres) || AR_EXPERIENCE_CONFIG.placementDistanceMetres));
    return {
        x: base.x + ray.x * distance,
        y: base.y + ray.y * distance,
        z: base.z + ray.z * distance
    };
}

export function isDemoFloorHit(hitPoseMatrix, cameraMatrix) {
    const hitY = Number(hitPoseMatrix?.[13]);
    const hitNormalY = Math.abs(Number(hitPoseMatrix?.[5]));
    const cameraY = Number(cameraMatrix?.[13]);
    const hasCameraY = Number.isFinite(cameraY);
    return Number.isFinite(hitY)
        && Number.isFinite(hitNormalY)
        && hitNormalY >= .65
        && (!hasCameraY || cameraY - hitY >= .7);
}

export function demoGroundBaseY(hitPoseMatrix, cameraMatrix, previousGroundY = null) {
    const hitY = Number(hitPoseMatrix?.[13]);
    const cameraY = Number(cameraMatrix?.[13]);
    const hasCameraY = Number.isFinite(cameraY);
    if (isDemoFloorHit(hitPoseMatrix, cameraMatrix)) return hitY;
    if (previousGroundY !== null && previousGroundY !== undefined && Number.isFinite(Number(previousGroundY))) return Number(previousGroundY);
    if (hasCameraY) return cameraY - DEMO_STABLE_EYE_HEIGHT_METRES;
    return 0;
}
