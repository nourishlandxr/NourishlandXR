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

export const XR_HAND_JOINT_CONNECTIONS = Object.freeze([
    ['wrist', 'thumb-metacarpal'], ['thumb-metacarpal', 'thumb-phalanx proximal'], ['thumb-phalanx proximal', 'thumb-phalanx distal'], ['thumb-phalanx distal', 'thumb-tip'],
    ['wrist', 'index-finger-metacarpal'], ['index-finger-metacarpal', 'index-finger-phalanx proximal'], ['index-finger-phalanx proximal', 'index-finger-phalanx intermediate'], ['index-finger-phalanx intermediate', 'index-finger-phalanx distal'], ['index-finger-phalanx distal', 'index-finger-tip'],
    ['wrist', 'middle-finger-metacarpal'], ['middle-finger-metacarpal', 'middle-finger-phalanx proximal'], ['middle-finger-phalanx proximal', 'middle-finger-phalanx intermediate'], ['middle-finger-phalanx intermediate', 'middle-finger-phalanx distal'], ['middle-finger-phalanx distal', 'middle-finger-tip'],
    ['wrist', 'ring-finger-metacarpal'], ['ring-finger-metacarpal', 'ring-finger-phalanx proximal'], ['ring-finger-phalanx proximal', 'ring-finger-phalanx intermediate'], ['ring-finger-phalanx intermediate', 'ring-finger-phalanx distal'], ['ring-finger-phalanx distal', 'ring-finger-tip'],
    ['wrist', 'pinky-finger-metacarpal'], ['pinky-finger-metacarpal', 'pinky-finger-phalanx proximal'], ['pinky-finger-phalanx proximal', 'pinky-finger-phalanx intermediate'], ['pinky-finger-phalanx intermediate', 'pinky-finger-phalanx distal'], ['pinky-finger-phalanx distal', 'pinky-finger-tip']
]);

export function handTrackingState(frame, source, referenceSpace) {
    const hand = source?.hand;
    if (!hand || !frame || !referenceSpace) return null;
    const joints = new Map();
    for (const name of new Set(XR_HAND_JOINT_CONNECTIONS.flat())) {
        const space = hand.get?.(name);
        const pose = space ? frame.getJointPose?.(space, referenceSpace) : null;
        const matrix = pose?.transform?.matrix;
        if (!matrix) continue;
        joints.set(name, { x: matrix[12], y: matrix[13], z: matrix[14], radius: Number(pose.radius) || .012 });
    }
    const thumb = joints.get('thumb-tip');
    const index = joints.get('index-finger-tip');
    const wrist = joints.get('wrist');
    if (!index || !wrist) return { joints, connections: XR_HAND_JOINT_CONNECTIONS, pinch: false, pointer: null };
    const pinchDistance = thumb && Math.hypot(thumb.x - index.x, thumb.y - index.y, thumb.z - index.z);
    const dx = index.x - wrist.x;
    const dy = index.y - wrist.y;
    const dz = index.z - wrist.z;
    const length = Math.hypot(dx, dy, dz) || 1;
    return {
        joints,
        connections: XR_HAND_JOINT_CONNECTIONS,
        pinch: Number.isFinite(pinchDistance) && pinchDistance < .035,
        pointer: { origin: index, direction: { x: dx / length, y: dy / length, z: dz / length }, handedness: source.handedness || 'right' }
    };
}

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
