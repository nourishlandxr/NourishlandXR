// Offline retarget of Meta IWER's recorded closed fingers to the SDK hand rig.
// Prints a reviewable pose; never writes assets or runs in a render frame.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(new URL('../iwsdk/package.json', import.meta.url));
const { AnimatedControllerHand } = await import(pathToFileURL(require.resolve('@iwsdk/xr-input')));
const { pointHandPose } = await import(pathToFileURL(require.resolve('iwer/lib/device/configs/hand/point.js')));
const { pinchHandPose } = await import(pathToFileURL(require.resolve('iwer/lib/device/configs/hand/pinch.js')));
const { Matrix4, Vector3, Quaternion } = await import(new URL('../iwsdk/node_modules/three/build/three.module.js', import.meta.url));
const matrix = values => new Matrix4().fromArray(values);
const position = m => new Vector3().setFromMatrixPosition(m);
const open = AnimatedControllerHand.defaultPose;
const result = { wrist: open.wrist };
const fingers = [ ['thumb', ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip']],
    ...['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'].map(finger => [finger, ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip']]) ];
for (const [finger, chain] of fingers) {
    const recorded = (finger === 'thumb' ? pinchHandPose : pointHandPose).jointTransforms;
    // The pointing capture already contains three fully folded fingers. Give
    // the index that recorded middle-finger articulation, retargeted to its
    // own metacarpal and segment lengths; no invented curl-angle multipliers.
    const recordedFinger = finger === 'index-finger' ? 'middle-finger' : finger;
    let targetParent = matrix(open.wrist);
    for (let i = 0; i < chain.length; i++) {
        const name = `${finger}-${chain[i]}`, parentName = i ? `${finger}-${chain[i - 1]}` : 'wrist';
        const capturedName = `${recordedFinger}-${chain[i]}`, capturedParent = i ? `${recordedFinger}-${chain[i - 1]}` : 'wrist';
        const restLocal = matrix(open[parentName]).invert().multiply(matrix(open[name]));
        const capturedLocal = matrix(recorded[capturedParent].offsetMatrix).invert().multiply(matrix(recorded[capturedName].offsetMatrix));
        const quaternion = new Quaternion().setFromRotationMatrix(capturedLocal).normalize();
        // Preserve the SDK palm/knuckle origins. Beyond the knuckle, follow
        // recorded segment directions with the template's physical bone lengths.
        const localPosition = i <= 1 ? position(restLocal)
            : position(capturedLocal).normalize().multiplyScalar(position(restLocal).length());
        const local = i === 0 && finger !== 'thumb' ? restLocal
            : new Matrix4().compose(localPosition, quaternion, new Vector3(1, 1, 1));
        const posed = targetParent.clone().multiply(local);
        result[name] = posed.elements.map(value => Math.round(value * 1e7) / 1e7);
        targetParent = posed;
    }
}
console.log(Object.entries(result).map(([name, values]) => `    '${name}': [${values.join(',')}],`).join('\n'));
