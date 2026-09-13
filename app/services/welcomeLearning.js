// Backward-compatible import path for the introductory learning content.
// New code should import the explicitly named LIM service.
export {
    LIM_ALL_CELLS,
    LIM_CELLS,
    LIM_CELL_BY_ID,
    LIM_FACES,
    LIM_FACE_CELLS,
    LIM_FACE_MEMBERS,
    LIM_GROUPS,
    LIM_GRAPHS,
    LIM_MAPPING_REVIEW,
    LIM_PATHWAYS,
    LIM_PATHWAY_SCHEMA,
    limCellById,
    limLearningContent,
    limLearningContent as welcomeLearningContent,
    migrateLegacyLimState,
    normalizeLimFaceId
} from './limLearning.js';
