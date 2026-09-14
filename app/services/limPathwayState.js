export const LIM_PATHWAY_STORAGE_KEY = 'nlxr.lim-pathway.v1';
export const LIM_PATHWAY_STATUSES = Object.freeze(['idle', 'active', 'paused', 'completed']);

export function idleLimPathwayState() {
    return {
        status: 'idle', pathwayId: '', pathwayVersion: 0, currentStepIndex: 0,
        completedStepIds: [], startTime: null, lastActivityTime: null,
        completionTime: null, observationNoteStatus: 'not-requested'
    };
}

const pathwayById = (pathways, id) => (Array.isArray(pathways) ? pathways : []).find(pathway => pathway.id === id);
const nowValue = now => Number(typeof now === 'function' ? now() : now) || Date.now();

export function normalizeLimPathwayState(saved, pathways, cells, now = Date.now) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return idleLimPathwayState();
    const pathway = pathwayById(pathways, saved.pathwayId);
    if (!pathway || Number(saved.pathwayVersion) !== pathway.version) return idleLimPathwayState();
    if (!pathway.orderedCellIds.every(id => cells?.[id])) return idleLimPathwayState();
    const status = LIM_PATHWAY_STATUSES.includes(saved.status) ? saved.status : 'idle';
    if (status === 'idle') return idleLimPathwayState();
    const validIds = new Set(pathway.orderedCellIds);
    const completedStepIds = [...new Set(Array.isArray(saved.completedStepIds) ? saved.completedStepIds.filter(id => validIds.has(id)) : [])];
    const currentStepIndex = Math.max(0, Math.min(pathway.orderedCellIds.length - 1, Number(saved.currentStepIndex) || 0));
    const fallbackTime = nowValue(now);
    return {
        status,
        pathwayId: pathway.id,
        pathwayVersion: pathway.version,
        currentStepIndex,
        completedStepIds,
        startTime: Number(saved.startTime) || fallbackTime,
        lastActivityTime: Number(saved.lastActivityTime) || fallbackTime,
        completionTime: status === 'completed' ? Number(saved.completionTime) || fallbackTime : null,
        observationNoteStatus: ['not-requested', 'placed', 'skipped'].includes(saved.observationNoteStatus) ? saved.observationNoteStatus : 'not-requested'
    };
}

export function startLimPathway(pathway, now = Date.now) {
    const time = nowValue(now);
    return {
        status: 'active', pathwayId: pathway.id, pathwayVersion: pathway.version,
        currentStepIndex: 0, completedStepIds: [], startTime: time,
        lastActivityTime: time, completionTime: null, observationNoteStatus: 'not-requested'
    };
}

export function pauseLimPathway(state, now = Date.now) {
    return state?.status === 'active' ? { ...state, status: 'paused', lastActivityTime: nowValue(now) } : state;
}

export function resumeLimPathway(state, now = Date.now) {
    return state?.status === 'paused' ? { ...state, status: 'active', lastActivityTime: nowValue(now) } : state;
}

export function visitLimPathwayCell(state, pathway, cellId, now = Date.now) {
    if (state?.status !== 'active' || pathway?.id !== state.pathwayId) return state;
    const intended = pathway.orderedCellIds[state.currentStepIndex];
    if (cellId !== intended || state.completedStepIds.includes(cellId)) return state;
    return { ...state, completedStepIds: [...state.completedStepIds, cellId], lastActivityTime: nowValue(now) };
}

export function advanceLimPathway(state, pathway, now = Date.now) {
    if (state?.status !== 'active' || !pathway || !state.completedStepIds.includes(pathway.orderedCellIds[state.currentStepIndex])) return state;
    if (state.currentStepIndex >= pathway.orderedCellIds.length - 1) return state;
    return { ...state, currentStepIndex: state.currentStepIndex + 1, lastActivityTime: nowValue(now) };
}

export function backLimPathway(state, now = Date.now) {
    if (state?.status !== 'active' || state.currentStepIndex <= 0) return state;
    return { ...state, currentStepIndex: state.currentStepIndex - 1, lastActivityTime: nowValue(now) };
}

export function completeLimPathway(state, observationNoteStatus = 'skipped', now = Date.now) {
    if (!state || !['active', 'paused'].includes(state.status)) return state;
    const time = nowValue(now);
    return { ...state, status: 'completed', observationNoteStatus, completionTime: time, lastActivityTime: time };
}

export function loadLimPathwayState(storage, pathways, cells, now = Date.now) {
    try {
        const value = storage?.getItem?.(LIM_PATHWAY_STORAGE_KEY);
        return normalizeLimPathwayState(value ? JSON.parse(value) : null, pathways, cells, now);
    } catch {
        return idleLimPathwayState();
    }
}

export function saveLimPathwayState(storage, state) {
    try {
        if (state?.status === 'idle') storage?.removeItem?.(LIM_PATHWAY_STORAGE_KEY);
        else storage?.setItem?.(LIM_PATHWAY_STORAGE_KEY, JSON.stringify(state));
    } catch {}
    return state;
}
