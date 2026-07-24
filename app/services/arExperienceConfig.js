/*
 * Global AR experience policy used by every creator project.
 * Projects store content and anchors; they do not redefine this interface.
 */
export const AR_EXPERIENCE_CONFIG = Object.freeze({
    placementDistanceMetres: 1.2,
    defaultSite: Object.freeze({
        name: 'Main Location',
        description: 'Primary Location for this project.',
        visibility: 'draft'
    }),
    fallbackArea: Object.freeze({
        name: 'Unassigned',
        type: 'Unassigned',
        description: 'Content captured quickly in AR and ready to organise later.',
        visibility: 'draft'
    }),
    markerTypes: Object.freeze(['plant', 'sub_checkpoint', 'note', 'intro_checkpoint', 'area_checkpoint'])
});
