import { AR_EXPERIENCE_CONFIG } from './arExperienceConfig.js';

export function spatialPosition(hitMatrix, viewerMatrix, verticalOffset = 0) {
    if (hitMatrix) return {
        x: hitMatrix[12],
        y: hitMatrix[13] + verticalOffset,
        z: hitMatrix[14]
    };
    if (!viewerMatrix) return null;
    const distance = AR_EXPERIENCE_CONFIG.placementDistanceMetres;
    return {
        x: viewerMatrix[12] - viewerMatrix[8] * distance,
        y: viewerMatrix[13] - viewerMatrix[9] * distance + verticalOffset,
        z: viewerMatrix[14] - viewerMatrix[10] * distance
    };
}

export function matrixFromPose(pose) {
    return pose?.transform?.matrix ? Float32Array.from(pose.transform.matrix) : null;
}
