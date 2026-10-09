import {LIMO_CELL_BY_ID,limoRouteId} from './limoProjectLearning.js';
import {LIM_INTRO_CELL_BY_ID} from './limLearning.js';
// The guided link uses authored cells in the two live meshes. No substitute
// source or target cards are created for this exercise.
export const DEMO_NATIVE_SOURCE_ID = 'food-forest';
export const DEMO_NATIVE_TARGET_ID = 'lim-food-forest';
export const DEMO_NATIVE_CONNECTION_EXAMPLES=Object.freeze([
    Object.freeze({id:'food-forest',label:'Food forest → Guilds & neighbours',sourceId:'food-forest',targetId:'lim-food-forest',
        explanation:'Pigeon Pea can be a fast-growing pioneer in a young living landscape. It fixes nitrogen, adds leaf litter and pruning material to the soil, and can shelter young trees while they establish. Its flowers provide forage for bees, and its growth creates habitat that birds and other wildlife can use. These roles help turn an exposed planting into a more sheltered, connected place.',
        fieldQuestion:'What role does this Pigeon Pea actually play beside the plants around it?'}),
    Object.freeze({id:'propagation',label:'Propagation → A small first planting',sourceId:'propagation',targetId:'lim-plant-propagation',
        explanation:'Seed and establishment information becomes a learning path for observing how a new plant could grow here.',
        fieldQuestion:'Which local conditions would help or limit a new Pigeon Pea seedling?'}),
    Object.freeze({id:'uses',label:'Uses → People, purpose & care',sourceId:'uses',targetId:'lim-intro-vision',
        explanation:'Connect documented plant uses with the future you want for this place. A harvest can support food, shared meals or soil care. Choose the uses that belong in your project vision, then check their suitability and evidence.',
        fieldQuestion:'What will we use our harvests for, and how should those uses shape our vision for this place?'})
]);

export function demoNativeTargetLineage(frames,targetId=DEMO_NATIVE_TARGET_ID){
    for(const frame of frames || []){
        const byId=new Map(frame.nodes.map(node=>[node.id,node]));
        const target=frame.nodes.find(node=>node.limId===limoRouteId(targetId));
        if(!target)continue;
        const ancestors=[],seen=new Set();
        let cursor=target;
        while(cursor?.parent){
            const parent=byId.get(cursor.parent);
            if(!parent || seen.has(parent.id))break;
            seen.add(parent.id);
            ancestors.unshift(parent.limId || parent.id);
            cursor=parent;
        }
        return {key:`${frame.corner}:${target.id}`,ancestors};
    }
    return null;
}

export function demoNativeConnectionSpec(pimDocument, limCells,exampleId=DEMO_NATIVE_CONNECTION_EXAMPLES[0].id) {
    const example=DEMO_NATIVE_CONNECTION_EXAMPLES.find(item=>item.id===exampleId);
    if(!example)throw new Error('That cell connection example is unavailable.');
    const source = pimDocument?.nodes?.find(node => node.id === example.sourceId);
    const target = LIMO_CELL_BY_ID[limoRouteId(example.targetId)] || limCells?.[example.targetId] || LIM_INTRO_CELL_BY_ID[example.targetId];
    if (!source?.title || !target?.title) throw new Error('The guided connection cells are unavailable.');
    return Object.freeze({
        sourceId: source.id,
        sourcePath: source.path || source.id,
        sourceTitle: source.title,
        targetId: target.id,
        targetTitle: target.title,
        exampleId:example.id,
        explanation:example.explanation,
        fieldQuestion:example.fieldQuestion
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
