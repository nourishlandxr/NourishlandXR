// Shared controller laser settings for every immersive NourishlandXR mode.
// Keep this in one place so Quest input feels identical in the demo and
// Creator AR, while phone touch placement continues to use its own aim dot.
export const XR_LASER_POINTER_CONFIG = Object.freeze({
    startOffset: 0.04,
    // Keep the idle ray visible across large real spaces. Actual surfaces
    // still terminate it at the exact hit point in the renderer.
    length: 1000,
    width: 0.003,
    segments: 8,
    color: Object.freeze([0.72, 0.78, 0.77]),
    alpha: 0.5
});

// Quest Touch controllers expose X/A at button 4 and Y/B at button 5 after the
// four reserved xr-standard controls. The demo binds only the left Y button.
export const XR_CONTROLLER_Y_BUTTON_INDEX = 5;

export function controllerYButtonPressed(inputSources = []) {
    return [...inputSources].some(source =>
        source?.handedness === 'left'
        && !source.hand
        && Boolean(source.gamepad?.buttons?.[XR_CONTROLLER_Y_BUTTON_INDEX]?.pressed)
    );
}

export function createControllerYSkipTracker(onSkip = () => {}) {
    let wasPressed = false;
    return {
        poll(inputSources = []) {
            const pressed = controllerYButtonPressed(inputSources);
            const justPressed = pressed && !wasPressed;
            wasPressed = pressed;
            if (justPressed) onSkip();
            return justPressed;
        },
        reset() {
            wasPressed = false;
        }
    };
}

export const XR_HAND_JOINT_CONNECTIONS = Object.freeze([
    ['wrist', 'thumb-metacarpal'], ['thumb-metacarpal', 'thumb-phalanx-proximal'], ['thumb-phalanx-proximal', 'thumb-phalanx-distal'], ['thumb-phalanx-distal', 'thumb-tip'],
    ['wrist', 'index-finger-metacarpal'], ['index-finger-metacarpal', 'index-finger-phalanx-proximal'], ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate'], ['index-finger-phalanx-intermediate', 'index-finger-phalanx-distal'], ['index-finger-phalanx-distal', 'index-finger-tip'],
    ['wrist', 'middle-finger-metacarpal'], ['middle-finger-metacarpal', 'middle-finger-phalanx-proximal'], ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate'], ['middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal'], ['middle-finger-phalanx-distal', 'middle-finger-tip'],
    ['wrist', 'ring-finger-metacarpal'], ['ring-finger-metacarpal', 'ring-finger-phalanx-proximal'], ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate'], ['ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal'], ['ring-finger-phalanx-distal', 'ring-finger-tip'],
    ['wrist', 'pinky-finger-metacarpal'], ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal'], ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate'], ['pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal'], ['pinky-finger-phalanx-distal', 'pinky-finger-tip']
]);

import * as THREE from '../vendor/three.module.min.js';

const handSamples = new WeakMap();
const handJointNames = [...new Set(XR_HAND_JOINT_CONNECTIONS.flat())];
// One sample per XR frame, shared by visuals, pokes and pinch routing. Missing
// poses are never extrapolated into interaction with a surface.
export function handTrackingState(frame, source, referenceSpace) {
    const hand = source?.hand;
    if (!hand || !frame || !referenceSpace) return null;
    const lastSample=handSamples.get(source);let previous = lastSample;
    if(previous?.frame===frame && previous.space===referenceSpace)return previous.state;
    const time=globalThis.performance?.now?.() || Date.now();
    if(previous?.space!==referenceSpace || time-previous.time>100)previous=null;
    const joints = new Map(),rawJoints=new Map();
    for (const name of handJointNames) {
        const space = hand.get?.(name);
        const pose = space ? frame.getJointPose?.(space, referenceSpace) : null;
        const matrix = pose?.transform?.matrix;
        if (!matrix || ![matrix[12],matrix[13],matrix[14]].every(Number.isFinite)) {
            const last=previous?.state.joints.get(name);
            if(last && time-last.lastSeenAt<70)joints.set(name,last);
            continue;
        }
        const raw={x:matrix[12],y:matrix[13],z:matrix[14],radius:Number(pose.radius) || .008,matrix:Float32Array.from(matrix)};
        rawJoints.set(name,raw);
        const old=previous?.state.joints.get(name),dt=Math.max(.001,(time-(previous?.time || time-16))/1000);
        const speed=old?Math.hypot(raw.x-old.x,raw.y-old.y,raw.z-old.z)/dt:0;
        // Stronger filtering at rest, less delay when reaching for a button.
        const alpha=old?1-Math.exp(-dt*(35+Math.min(100,speed*65))):1;
        const rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(matrix));
        if(old?.rotation)rotation.copy(old.rotation).slerp(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(matrix)),alpha);
        const joint={...raw,lastSeenAt:time,x:old?old.x+(raw.x-old.x)*alpha:raw.x,y:old?old.y+(raw.y-old.y)*alpha:raw.y,z:old?old.z+(raw.z-old.z)*alpha:raw.z,rotation};
        joint.matrix=new THREE.Matrix4().compose(new THREE.Vector3(joint.x,joint.y,joint.z),rotation,new THREE.Vector3(1,1,1)).elements;
        joints.set(name,joint);
    }
    const thumb = rawJoints.get('thumb-tip');
    const index = rawJoints.get('index-finger-tip');
    const wrist = rawJoints.get('wrist');
    const pinchDistance = thumb && index && Math.hypot(thumb.x - index.x, thumb.y - index.y, thumb.z - index.z);
    const tracked=Boolean(index && wrist && thumb);
    const pinch=tracked && (source.gamepad?.buttons?.[0] ? Boolean(source.gamepad.buttons[0].pressed) : Number.isFinite(pinchDistance) && pinchDistance<(previous?.state.pinch?.038:.025));
    const indexBase=joints.get('index-finger-metacarpal') || joints.get('wrist'),filteredIndex=joints.get('index-finger-tip');
    const dx = filteredIndex && indexBase ? filteredIndex.x - indexBase.x : 0;
    const dy = filteredIndex && indexBase ? filteredIndex.y - indexBase.y : 0;
    const dz = filteredIndex && indexBase ? filteredIndex.z - indexBase.z : 0;
    const length = Math.hypot(dx, dy, dz) || 1;
    const pose=tracked && source.targetRaySpace?frame.getPose?.(source.targetRaySpace,referenceSpace):null;
    const pointer=tracked?(controllerRayFromPose(pose,source.handedness) || {origin:filteredIndex,direction:{x:dx/length,y:dy/length,z:dz/length},handedness:source.handedness || 'right'}):null;
    const state={
        joints,rawJoints,time,tracked,visualConfidence:Math.min(1,...handJointNames.map(name=>rawJoints.has(name)?1:joints.has(name)?Math.max(0,1-(time-joints.get(name).lastSeenAt)/70):0)),
        connections: XR_HAND_JOINT_CONNECTIONS,
        pinch,pinchSequence:(lastSample?.state.pinchSequence || 0)+(pinch && !lastSample?.state.pinch?1:0),
        pointer
    };
    handSamples.set(source,{frame,space:referenceSpace,time,state});return state;
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
