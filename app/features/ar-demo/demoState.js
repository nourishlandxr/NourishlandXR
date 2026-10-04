import {
    pimClosingNodePaths,
    pimCreateInteractionState,
    pimExpandedNodeIds
} from '../../services/plantInformationMesh.js';
import {rememberKnowledgeSelection} from '../../services/knowledgeExplorer.js';

export function demoPimState(record) {
    return pimCreateInteractionState(
        record?.demoExpandedNodeIds || record?.demoExpandedBranches || [],
        record?.demoSelectedNodeId || '',
        record?.demoFocusedPlantId || record?.id || record?.name || '',
        record?.pimClosingNodePaths || []
    );
}

export function demoPimExpandedNodeIds(record) {
    return record?.demoExpandedNodeIds || record?.demoExpandedBranches || [];
}

export function setDemoPimState(record, state) {
    if (!record) return state;
    record.demoSelectedNodeId = state.selectedNodeId;
    rememberKnowledgeSelection(record,state.selectedNodeId);
    record.demoExpandedNodeIds = pimExpandedNodeIds(state);
    record.pimClosingNodePaths = pimClosingNodePaths(state);
    record.demoExpandedBranches = [...record.demoExpandedNodeIds];
    record.demoFocusedPlantId = state.focusedPlantId || record.id || record.name || '';
    return state;
}
