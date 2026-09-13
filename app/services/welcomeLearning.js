// Backward-compatible import path for the introductory learning content.
// New code should import the explicitly named LIM service.
export {
    LIM_CELLS,
    LIM_CELL_BY_ID,
    LIM_GROUPS,
    LIM_GRAPHS,
    limCellById,
    limLearningContent,
    limLearningContent as welcomeLearningContent
} from './limLearning.js';
