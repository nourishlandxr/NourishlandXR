import { BUILD_INFO } from './buildInfo.js';

// One SDK input owner per native session. Presentation stays in the existing
// NLXR renderers; no additional canvas, XR session, or animation loop is created.
const runtimes = new WeakMap();
let modulePromise;

export async function prepareXRInputRuntime(load = () => import(`../vendor/iwsdk-input/index.js?v=${encodeURIComponent(BUILD_INFO.version)}`)) {
    const module = await (modulePromise ||= load().catch(error => {
        modulePromise = undefined;
        throw error;
    }));
    if (typeof module.createNlxrInput !== 'function') throw new Error('IWSDK input bundle is invalid.');
    return module.createNlxrInput;
}

export async function attachXRInputRuntime(session, {
    factory,
    load = () => import(`../vendor/iwsdk-input/index.js?v=${encodeURIComponent(BUILD_INFO.version)}`)
} = {}) {
    if (runtimes.has(session)) return runtimes.get(session);
    const create = factory || await prepareXRInputRuntime(load);
    if (runtimes.has(session)) return runtimes.get(session);
    const runtime = create(session, { assetUrls: {
        left: new URL('../assets/meta-hand-left.glb', import.meta.url).href,
        right: new URL('../assets/meta-hand-right.glb', import.meta.url).href
    } });
    runtimes.set(session, runtime);
    const end = () => {
        session.removeEventListener('end', end);
        runtimes.delete(session);
        runtime.dispose();
    };
    session.addEventListener('end', end, { once: true });
    return runtime;
}

export function xrInputRuntime(session) {
    return session ? runtimes.get(session) : undefined;
}

export function updateXRInputRuntime(frame, referenceSpace, time, sequence) {
    const runtime = xrInputRuntime(frame?.session);
    runtime?.update(frame, referenceSpace, time, sequence);
    return runtime;
}
