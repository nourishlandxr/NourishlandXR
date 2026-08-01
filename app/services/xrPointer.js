// Shared controller laser settings for every immersive NourishlandXR mode.
// Keep this in one place so Quest input feels identical in the demo and
// Creator AR, while phone touch placement continues to use its own aim dot.
export const XR_LASER_POINTER_CONFIG = Object.freeze({
    startOffset: 0.04,
    length: 5,
    width: 0.014,
    dotRadius: 0.07,
    segments: 8,
    color: Object.freeze([0.82, 1, 0.26]),
    alpha: 0.96
});

export function controllerRayFromPose(pose, handedness = 'right') {
    const matrix = pose?.transform?.matrix;
    if (!matrix) return null;
    const x = -matrix[8];
    const y = -matrix[9];
    const z = -matrix[10];
    const length = Math.hypot(x, y, z) || 1;
    return {
        origin: { x: matrix[12], y: matrix[13], z: matrix[14] },
        direction: { x: x / length, y: y / length, z: z / length },
        handedness
    };
}
