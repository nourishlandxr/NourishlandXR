// The guided link uses authored cells in the two live meshes. No substitute
// source or target cards are created for this exercise.
export const DEMO_NATIVE_SOURCE_ID = 'food-forest';
export const DEMO_NATIVE_TARGET_ID = 'lim-food-forest';

export function demoNativeConnectionSpec(pimDocument, limCells) {
    const source = pimDocument?.nodes?.find(node => node.id === DEMO_NATIVE_SOURCE_ID);
    const target = limCells?.[DEMO_NATIVE_TARGET_ID];
    if (!source?.title || !target?.title) throw new Error('The guided connection cells are unavailable.');
    return Object.freeze({
        sourceId: source.id,
        sourcePath: source.path || source.id,
        sourceTitle: source.title,
        targetId: target.id,
        targetTitle: target.title
    });
}

export function createDemoNativeConnection(spec) {
    return { ...spec, phase: 'source', result: null, error: '' };
}

export function acceptDemoNativeSource(state, path) {
    if (!state || state.phase !== 'source' || path !== state.sourcePath) return false;
    state.phase = 'target';
    state.error = '';
    return true;
}

export function beginDemoNativeTarget(state, id) {
    if (!state || state.phase !== 'target' || id !== state.targetId) return false;
    state.phase = 'resolving';
    state.error = '';
    return true;
}

export function finishDemoNativeConnection(state, result) {
    if (!state || state.phase !== 'resolving' || !result?.relationship) return false;
    state.phase = 'connected';
    state.result = result;
    return true;
}

export function retryDemoNativeTarget(state, message = '') {
    if (!state || state.phase !== 'resolving') return false;
    state.phase = 'target';
    state.error = message;
    return true;
}
