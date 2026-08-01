// Shared controller laser settings for every immersive NourishlandXR mode.
// Keep this in one place so Quest input feels identical in the demo and
// Creator AR, while phone touch placement continues to use its own aim dot.
export const XR_LASER_POINTER_CONFIG = Object.freeze({
    startOffset: 0.04,
    length: 5,
    width: 0.014,
    segments: 8,
    color: Object.freeze([0.82, 1, 0.26]),
    alpha: 0.96
});

export function controllerRayEnd(ray, subjects = [], maxLength = XR_LASER_POINTER_CONFIG.length) {
    if (!ray?.origin || !ray?.direction) return null;
    const startDistance = XR_LASER_POINTER_CONFIG.startOffset;
    let distance = Math.max(startDistance, Number(maxLength) || XR_LASER_POINTER_CONFIG.length);
    for (const subject of subjects) {
        const position = subject?.position || subject;
        if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y) || !Number.isFinite(position?.z)) continue;
        const radius = Math.max(.04, Number(subject?.radius) || .2);
        const offset = {
            x: position.x - ray.origin.x,
            y: position.y - ray.origin.y,
            z: position.z - ray.origin.z
        };
        const along = offset.x * ray.direction.x + offset.y * ray.direction.y + offset.z * ray.direction.z;
        if (along <= startDistance) continue;
        const perpendicularSquared = Math.max(0, offset.x ** 2 + offset.y ** 2 + offset.z ** 2 - along ** 2);
        if (perpendicularSquared > radius ** 2) continue;
        const halfChord = Math.sqrt(Math.max(0, radius ** 2 - perpendicularSquared));
        const hitDistance = along - halfChord;
        if (hitDistance >= startDistance && hitDistance < distance) distance = hitDistance;
    }
    return {
        x: ray.origin.x + ray.direction.x * distance,
        y: ray.origin.y + ray.direction.y * distance,
        z: ray.origin.z + ray.direction.z * distance,
        distance
    };
}

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
