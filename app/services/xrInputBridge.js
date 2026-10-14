// The standalone SDK input manager shares NLXR's native XRSession and tracking
// space. It does not request a session or replace NLXR's WebGL render surface.
import { createSdkHandVisuals } from './iwsdkHandVisuals.js';
export function createNlxrInputBridge(session, sdk, { assetUrls = {
    left: new URL('../assets/meta-hand-left.glb', import.meta.url).href,
    right: new URL('../assets/meta-hand-right.glb', import.meta.url).href
} } = {}) {
    const { XRInputManager, Scene, PerspectiveCamera, Matrix4, Quaternion } = sdk;
    const visuals = createSdkHandVisuals(sdk, assetUrls);

    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const input = new XRInputManager({ scene, camera, assetLoader: visuals.assetLoader });
    for (const side of ['left', 'right']) {
        input.visualAdapters.hand[side].updateVisualImplementation(visuals.TrackedHand);
        input.visualAdapters.controller[side].updateVisualImplementation(visuals.ControllerHand);
        for (const kind of ['ray', 'grab', 'touch']) input.multiPointers[side].toggleSubPointer(kind, false);
    }
    scene.add(input.xrOrigin);
    let currentFrame, space, activeSession = session, lastTime = 0, lastSequence, disposed = false;
    const manager = { getSession: () => activeSession,
        getFrame: () => currentFrame, getReferenceSpace: () => space };
    const selections = new Map();
    let samples = new WeakMap();
    const blockedSources = new WeakSet();
    const transform = new Matrix4(), rotation = new Quaternion();
    let visualPoses = new WeakMap();
    const visualPose = source => visualPoses.get(source) || null;
    const select = event => {
        if (!event.inputSource?.hand) return;
        if (event.type === 'selectend') blockedSources.delete(event.inputSource);
        if (blockedSources.has(event.inputSource)) return;
        let state = selections.get(event.inputSource);
        if (!state) selections.set(event.inputSource, state = { active: false, sequence: 0 });
        const next = event.type === 'selectstart';
        if (next && !state.active) state.sequence++;
        state.active = next;
        samples.delete(event.inputSource);
        lastSequence = undefined;
    };
    session.addEventListener('selectstart', select, true);
    session.addEventListener('selectend', select, true);
    const resetInteractions = () => {
        if (session.visibilityState !== 'hidden' && session.visibilityState !== 'visible-blurred') return;
        for (const source of session.inputSources) blockedSources.add(source);
        selections.clear(); samples = new WeakMap(); lastSequence = undefined;
    };
    session.addEventListener('visibilitychange', resetInteractions);
    const sourcePresent = source => Array.from(activeSession?.inputSources || []).includes(source);
    const update = (frame, referenceSpace, time, sequence = time) => {
        if (disposed || !frame || !referenceSpace) return;
        if (lastSequence !== undefined && currentFrame === frame && space === referenceSpace &&
            (lastSequence === sequence || lastTime === time)) return;
        currentFrame = frame; space = referenceSpace; lastSequence = sequence;
        const delta = lastTime ? Math.min(.1, Math.max(0, (time - lastTime) / 1000)) : 1 / 90;
        lastTime = time;
        input.update(manager, delta, time / 1000);
        visualPoses = new WeakMap();
        // SDK has flushed world matrices now. Publish one immutable-by-convention
        // world-joint snapshot for both eyes, skinning and visible-hand pointing.
        for (const side of ['left', 'right']) {
            const source = input.getPrimaryInputSource(side);
            if (!source) continue;
            const visual = input.visualAdapters[source.hand ? 'hand' : 'controller'][side].visual;
            const bones = visual?.model.getObjectByProperty('type', 'SkinnedMesh')?.skeleton.bones;
            if (!bones || bones.length !== 25) continue;
            const joints = new Map(bones.map(bone => [bone.name, {
                matrix: Float32Array.from(bone.matrixWorld.elements)
            }]));
            if ([...joints.values()].every(joint => joint.matrix.every(Number.isFinite))) visualPoses.set(source, joints);
        }
        for (const source of selections.keys()) if (!sourcePresent(source)) selections.delete(source);
        if (session.visibilityState === 'hidden' || session.visibilityState === 'visible-blurred') {
            resetInteractions();
        }
    };
    const ray = source => {
        if (!sourcePresent(source) || !currentFrame || !space ||
            session.visibilityState === 'hidden' || session.visibilityState === 'visible-blurred') return null;
        const handedness = source.handedness;
        if (!['left', 'right'].includes(handedness) || input.getPrimaryInputSource(handedness) !== source) return null;
        // A missing pose must never expose last frame's origin as a hit target.
        if (!currentFrame.getPose(source.targetRaySpace || source.gripSpace, space)) return null;
        const matrix = input.xrOrigin.raySpaces[handedness].matrixWorld.elements;
        const length = Math.hypot(matrix[8], matrix[9], matrix[10]) || 1;
        return { origin: { x: matrix[12], y: matrix[13], z: matrix[14] },
            direction: { x: -matrix[8] / length, y: -matrix[9] / length, z: -matrix[10] / length }, handedness };
    };
    return {
        backend: 'iwsdk', input, update, ray,
        controllerState(source) {
            if (disposed || source.hand || !sourcePresent(source) || !currentFrame || !space ||
                session.visibilityState === 'hidden' || session.visibilityState === 'visible-blurred') return null;
            const side = source.handedness;
            if (!['left', 'right'].includes(side) || input.getPrimaryInputSource(side) !== source) return null;
            if (!currentFrame.getPose(source.gripSpace || source.targetRaySpace, space)) return null;
            const pad = input.gamepads[side];
            return { matrix: input.xrOrigin.gripSpaces[side].matrixWorld.elements,
                handPose: visualPose(source), backend: 'iwsdk',
                ray: ray(source), down: Boolean(pad?.getButtonPressed('xr-standard-squeeze')),
                trigger: Boolean(pad?.getButtonPressed('xr-standard-trigger')),
                grip: pad?.getButtonValue('xr-standard-squeeze') || 0 };
        },
        handState(source, connections) {
            if (disposed || !source.hand || !sourcePresent(source) || !space || !currentFrame) return null;
            const previous = samples.get(source);
            if (previous && previous.sequence === lastSequence) return previous.state;
            const joints = new Map(), rawJoints = new Map();
            const side = source.handedness;
            const primary = input.getPrimaryInputSource(side) === source;
            const visible = session.visibilityState !== 'hidden' && session.visibilityState !== 'visible-blurred';
            // Keep NLXR's joint contract for pokes and its existing hand renderer;
            // use raw tracked poses, with no second filter or stale-joint grace.
            if (primary && visible) for (const [name, jointSpace] of source.hand) {
                const pose = currentFrame.getJointPose(jointSpace, space);
                const matrix = pose?.transform?.matrix;
                if (!matrix || pose.emulatedPosition || !Array.from(matrix).every(Number.isFinite)) continue;
                transform.fromArray(matrix); rotation.setFromRotationMatrix(transform);
                const joint = { x: matrix[12], y: matrix[13], z: matrix[14], radius: pose.radius || .008,
                    matrix: Float32Array.from(matrix), rotation: rotation.clone(), lastSeenAt: lastTime };
                joints.set(name, joint); rawJoints.set(name, joint);
            }
            const tracked = joints.has('wrist') && joints.has('index-finger-tip') && joints.has('thumb-tip');
            const selection = selections.get(source);
            const pad = input.gamepads[side];
            const selecting = Boolean(selection?.active || pad?.getButtonPressed('xr-standard-trigger'));
            if (!selecting) blockedSources.delete(source);
            const pinch = tracked && !blockedSources.has(source) && selecting;
            const oldPinch = previous?.state.pinch || false;
            const state = { joints, rawJoints, visualJoints: tracked ? visualPose(source) : null, time: lastTime, tracked,
                visualConfidence: tracked && joints.size === source.hand.size ? 1 : 0,
                connections, pinch, pinchSequence: Math.max(selection?.sequence || 0,
                    (previous?.state.pinchSequence || 0) + (pinch && !oldPinch ? 1 : 0)),
                pointer: tracked ? ray(source) : null, backend: 'iwsdk' };
            samples.set(source, { sequence: lastSequence, state });
            return state;
        },
        dispose() {
            if (disposed) return;
            disposed = true; activeSession = undefined;
            session.removeEventListener('selectstart', select, true);
            session.removeEventListener('selectend', select, true);
            session.removeEventListener('visibilitychange', resetInteractions);
            input.update(manager, 0, lastTime / 1000);
            input.multiPointers.left.dispose(); input.multiPointers.right.dispose();
            selections.clear();
            currentFrame = undefined; space = undefined;
            scene.clear();
            visualPoses = new WeakMap(); visuals.dispose();
        }
    };
}
