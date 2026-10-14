// Pose provider only: NLXR retains its WebGL renderer, colours and reveal shader.
// The supplied SDK animations own articulation; no custom curl angles are used.
let nextOwner = 0;
export function createSdkHandVisuals({ AnimatedControllerHand, AnimatedHand, XRInputVisualAdapter, loadHandGLTF, freeHandPose }, assetUrls) {
    const prefix = `nlxr-hand-${++nextOwner}-`;
    let disposed = false;
    const geometries = new Set(), materials = new Set();
    function forget(visual) {
        for (const [key, value] of XRInputVisualAdapter.visualCache) {
            if (key.startsWith(prefix) && (!visual || value === visual)) XRInputVisualAdapter.visualCache.delete(key);
        }
    }
    class ControllerHand extends AnimatedControllerHand {
        static assetKeyPrefix = prefix + 'controller';
        // xr-input 1.0.1's controller-hand constructor uses model-first, while
        // its adapter calls scene-first. Adapt that boundary without forking SDK.
        constructor(scene, camera, model, layout) { super(model, scene, camera, layout); }
        connect(source, enabled) {
            if (disposed) { forget(this); return; }
            super.connect(source, enabled);
            // Free-hand mode can supply an authored pose without replacing the
            // SDK's per-finger blending or the actual tracked-hand adapter.
            if(freeHandPose){
                this.applyFreeHandPose(freeHandPose,source.handedness);
                // SDK still performs its own interpolation. Supply visual-only
                // button values so squeeze curls the thumb and three fingers,
                // while trigger independently curls the index. Grip alone points;
                // grip plus trigger makes a fist. Native actions stay untouched.
                const value=index=>Math.max(0,Math.min(1,Number(source.gamepad?.buttons[index]?.value)||0));
                this.gamepad={buttons:[
                    {get value(){return value(0);}},
                    {get value(){return value(1);}},
                    {value:0},
                    {get value(){return Math.max(value(1),value(3));}}
                ]};
            }
            // Cached visuals reconnect with fresh interpolation state.
            for (const bone of this.bones) bone.userData.alpha = 0;
            super.update(0);
        }
        applyFreeHandPose(pose,side){
            for(const bone of this.bones){
                const values=pose[bone.userData.jointName];if(!values)continue;
                const target=bone.userData.pressedTransform;
                this.mat4.fromArray(values).decompose(target.position,target.quaternion,this.vec3);
                if(side==='left'){
                    target.position.x*=-1;target.quaternion.x*=-1;target.quaternion.w*=-1;
                }
            }
        }
        update(delta) { super.update(Math.min(.05, Math.max(0, delta))); }
    }
    class TrackedHand extends AnimatedHand {
        static assetKeyPrefix = prefix + 'tracked';
        connect(source, enabled) {
            if (disposed) { forget(this); return; }
            super.connect(source, enabled);
        }
    }
    return {
        ControllerHand, TrackedHand,
        assetLoader: { async loadGLTF(requested) {
            const side = /(?:^|\/)left\.glb(?:[?#]|$)/u.test(requested) ? 'left'
                : /(?:^|\/)right\.glb(?:[?#]|$)/u.test(requested) ? 'right' : null;
            if (!side || disposed) return null;
            // Both kinds load project-owned Meta generic-hand assets, never a
            // controller-profile mesh or a transient remote CDN hand.
            const gltf = await loadHandGLTF(assetUrls[side]);
            if (disposed) {
                gltf.scene.traverse(node => { node.geometry?.dispose();
                    for (const material of [].concat(node.material || [])) material.dispose(); });
                return null;
            }
            gltf.scene.traverse(node => {
                if (node.geometry) geometries.add(node.geometry);
                for (const material of [].concat(node.material || [])) materials.add(material);
            });
            return gltf;
        } },
        dispose() {
            if (disposed) return;
            disposed = true; forget();
            for (const geometry of geometries) geometry.dispose();
            for (const material of materials) material.dispose();
            geometries.clear(); materials.clear();
        }
    };
}
